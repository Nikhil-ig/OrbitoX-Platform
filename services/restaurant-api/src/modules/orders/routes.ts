import * as http from 'http';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import {
  MenuItem,
  KitchenTask,
  TableFloorRecord,
  RestaurantOrder,
  BranchRecord,
  FloorRecord,
  ServiceRequest,
  RestaurantContext,
  issueStaffToken,
  verifyStaffToken,
  revokeStaffToken,
  authenticateStaffByPin,
  getPublicStaffList,
  getStaffMember,
  createStaffMember,
  updateStaffMember,
  resetStaffLockout,
  hashStaffSecretSync,
  verifyStaffSecret,
  resolveClientIp,
  checkStaffLockout,
  recordFailedStaffAttempt,
  recordSuccessfulStaffAttempt,
  issueDeviceToken,
  verifyDeviceToken,
  validateAndSanitizeCustomCss,
  tryGetActiveTenant,
  resolveTenantDisplayName,
  invalidateTenantResolutionCache,
  OnboardingStepKey,
  verifyPlatformAuth,
  validateTenantSlug,
  generateSeats,
} from '../../../packages/domain';
import {
  buildGSTInvoice,
  computeFiscalYear,
  SAC_RESTAURANT_SERVICES,
  renderPrintableInvoiceHtml,
} from '../../../packages/domain/invoicing';
import {
  isProductionEnvironment,
  postgresStore,
  eventBus,
  provisioningService,
  customDomainService,
  ownerSelfService,
  razorpayAdapter,
  restaurantGrantEnforcer,
  runtimeController,
  getPinnedGrantKeys,
  activeSettlementLocks,
  activeDispatchLocks,
  totalRequests,
  statusCounts,
  methodCounts,
  totalDomainEvents,
} from '../../shared/state';
import {
  parseBody,
  parseBuffer,
  extractImageBuffer,
  sendJson,
  sendHtml,
  checkTestKillPoint,
  isActiveRestaurantCataloguePlan,
} from '../../http/middleware';
import {
  assertPlatformBridgeCaller,
  exportRestaurantTenantData,
  eraseRestaurantTenantData,
  exportRestaurantPrincipalData,
  correctRestaurantPrincipalData,
  eraseRestaurantPrincipalData,
} from '../../data-rights';
import { SEED_PLANS } from '@orbitox-io/plugin-engine';
import type { PreTenantRouteContext, TenantRouteContext } from '../../http/types';

export async function handleOrdersRoutes(ctx: TenantRouteContext): Promise<boolean> {
  const {
    req, res, pathname, method, parsedUrl, tenantContext, repo, posService,
    branches, floors, context, currentBranch, currentFloor, serviceShift,
    requestIdentity, activeStaffToken, activeStaffRole,
  } = ctx;
    // --- RESTAURANT REST APIS ---

    // 1. Table QR Discovery
    if (pathname.startsWith('/api/restaurant/qr/')) {
      const locator = pathname.replace('/api/restaurant/qr/', '');
      const table = await repo.getTableByLocator(locator);
      if (!table) {
        sendJson(res, 404, {
          error: 'TABLE_NOT_FOUND',
          code: 'TABLE_NOT_FOUND',
          message: `No table found for locator: ${locator}`,
        });
        return true;
      }
      const tenantBrand = await repo.getTenantBrand();
      sendJson(res, 200, {
        success: true,
        data: {
          tableId: `tbl_${table.id}`,
          tableNumber: table.number,
          capacity: table.capacity,
          status: table.status,
          locator: table.locator,
          section: table.section,
          restaurantName: resolveTenantDisplayName(tenantBrand, tenantContext.tenantName),
          activeSession: {
            sessionId: table.activeSessionId || `sess_${locator.slice(0, 4)}`,
            hostName: 'Guest Host',
            seatingCapacity: table.capacity,
          },
        },
      });
      return true;
    }

    // 2. Public Culinary Menu Catalog
    if (pathname === '/api/restaurant/menu') {
      const items = await repo.getMenuItems();
      sendJson(res, 200, {
        success: true,
        data: items,
      });
      return true;
    }

    // 3. Seating Session Join
    if (pathname === '/api/restaurant/sessions/join' && method === 'POST') {
      const body = await parseBody(req);
      let targetTbl: TableFloorRecord | undefined;
      if (body.locator) {
        targetTbl = await repo.getTableByLocator(body.locator);
      }
      if (!targetTbl && body.tableNumber) {
        targetTbl = await repo.getTableByNumber(body.tableNumber);
      }
      if (!targetTbl && body.tableNumber) {
        targetTbl = await repo.getTableByNumber(`T-${body.tableNumber}`);
      }
      if (!targetTbl && body.tableId) {
        targetTbl = await repo.getTable(body.tableId);
      }

      if (!targetTbl) {
        sendJson(res, 404, {
          error: 'TABLE_NOT_FOUND',
          code: 'TABLE_NOT_FOUND',
          message: `Table not found for provided locator/number: ${body.locator || body.tableNumber || body.tableId}`,
        });
        return true;
      }

      const tableNum = targetTbl.number;
      const capabilityToken = `cap_${crypto.randomBytes(16).toString('hex')}`;
      const hostName = body.guestName || body.name || 'Primary Host';

      const session = await posService.createOrJoinSession({
        tableNumber: tableNum,
        hostName,
        branchId: targetTbl.branchId || currentBranch.id,
        floorId: targetTbl.floorId || currentFloor.id,
        capabilityToken,
      });

      const s1 = targetTbl.seats?.find((s) => s.seatNumber === 1);
      if (s1 && !s1.guestName) {
        await repo.assignGuestToSeat(s1.id, hostName);
      }

      sendJson(res, 200, {
        success: true,
        data: {
          sessionId: session.sessionId,
          capabilityToken,
          tableNumber: tableNum,
          seatingType: body.seatingType || 'PRIMARY_HOST',
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        },
      });
      return true;
    }

    // 4. Session Close
    if (pathname === '/api/restaurant/sessions/close' && method === 'POST') {
      const identity = requestIdentity;
      if (identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, {
          error: 'REVOKED_CAPABILITY',
          code: 'REVOKED_CAPABILITY',
          message: 'Guest capability token has expired or session is closed.',
        });
        return true;
      }

      const body = await parseBody(req);
      let targetTbl: TableFloorRecord | undefined;
      if (body.tableNumber) {
        targetTbl = await repo.getTableByNumber(body.tableNumber);
      }
      if (!targetTbl && body.tableId) {
        targetTbl = await repo.getTable(body.tableId);
      }

      if (!targetTbl) {
        sendJson(res, 404, {
          error: 'TABLE_NOT_FOUND',
          code: 'TABLE_NOT_FOUND',
          message: `Table not found for session closure: ${body.tableNumber || body.tableId || 'unspecified'}`,
        });
        return true;
      }

      const tableNum = targetTbl.number;

      if (identity.type === 'DINER' && identity.tableNumber && identity.tableNumber !== tableNum) {
        sendJson(res, 403, {
          error: 'FORBIDDEN',
          code: 'FORBIDDEN',
          message: 'Diner cannot close session for a different table.',
        });
        return true;
      }

      const settlement =
        body.settlement ||
        (body.settlementMethod
          ? {
            method: body.settlementMethod,
            status: body.settlementStatus || 'PAID',
            amountMinor: body.amountMinor,
            reference: body.settlementRef,
            authorizedBy: body.authorizedBy || identity.id,
            reason: body.reason,
          }
          : undefined);

      const force = body.force === true;

      // Emergency force close or COMP/VOID settlements require verified privileged credentials!
      if (force || (settlement && (settlement.status === 'COMPED' || settlement.status === 'VOIDED' || settlement.method === 'EMERGENCY_OVERRIDE'))) {
        if (!identity.isPrivileged) {
          sendJson(res, (identity.type === 'ANONYMOUS' || identity.type === 'INVALID_CREDENTIAL') ? 401 : 403, {
            error: 'UNAUTHORIZED_OVERRIDE',
            code: 'UNAUTHORIZED_OVERRIDE',
            message: 'Emergency force closure or complimentary/void settlements require verified manager or privileged staff credentials.',
          });
          return true;
        }
      }

      // Authorizer is strictly the authenticated identity, never an unverified string from request body!
      const authorizer = identity.isPrivileged ? identity.id : (identity.type === 'STAFF' ? identity.id : 'staff:pos');

      if (identity.branchId && identity.branchId !== '*' && targetTbl.branchId !== identity.branchId) {
        sendJson(res, 403, {
          error: `Credential for branch ${identity.branchId} cannot close session for table in branch ${targetTbl.branchId}`,
          code: 'BRANCH_MISMATCH',
        });
        return true;
      }

      const result = await repo.closeSession(tableNum, settlement, force, {
        expectedRevision: body.expectedRevision,
        authorizedBy: authorizer,
        reason: body.reason,
      });

      if (!result.success) {
        const statusCode =
          result.code === 'TABLE_NOT_FOUND' ? 404 : result.code === 'REVISION_CONFLICT' ? 409 : 422;
        sendJson(res, statusCode, {
          code: result.code,
          error: result.code,
          message: result.error,
        });
        return true;
      }

      if (result.session?.sessionId) {
        eventBus.disconnectClientsForSession(result.session.sessionId);
      }

      await runtimeController.emitAudit('SESSION_CLOSED', authorizer || 'staff:pos', {
        tableNumber: tableNum,
        settlement: result.session?.settlement,
        isEmergency: result.session?.settlement?.method === 'EMERGENCY_OVERRIDE',
      });

      sendJson(res, 200, {
        success: true,
        message: `Session closed for ${tableNum}`,
        table: result.table,
        session: result.session,
        isIdempotent: result.isIdempotent,
      });
      return true;
    }

    // 4b. Authoritative Table Bill Settlement (POST /api/restaurant/tables/:id/settle & POST /api/restaurant/tables/settle)
    const isTableSettle =
      (pathname.startsWith('/api/restaurant/tables/') && pathname.endsWith('/settle') && method === 'POST') ||
      (pathname === '/api/restaurant/tables/settle' && method === 'POST');

    if (isTableSettle) {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL') {
        sendJson(res, 401, {
          error: 'INVALID_CREDENTIAL',
          code: 'INVALID_CREDENTIAL',
          message: 'Supplied authorization token is invalid or tampered.',
        });
        return true;
      }
      if (identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, {
          error: 'REVOKED_CAPABILITY',
          code: 'REVOKED_CAPABILITY',
          message: 'Credential or token has been revoked.',
        });
        return true;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, {
          error: 'AUTHENTICATION_REQUIRED',
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Table settlement requires authenticated staff credentials.',
        });
        return true;
      }

      const hasSettlementPrivilege =
        identity.isPrivileged ||
        identity.role === 'POS' ||
        identity.role === 'MANAGER' ||
        identity.role === 'ADMIN';

      if (!hasSettlementPrivilege) {
        sendJson(res, 403, {
          error: 'FORBIDDEN',
          code: 'FORBIDDEN',
          message: 'Table settlement requires POS or Manager privileges.',
        });
        return true;
      }

      const body = await parseBody(req);
      let tableParam: string | number | undefined;
      if (pathname === '/api/restaurant/tables/settle') {
        tableParam = body.tableId !== undefined ? body.tableId : body.tableNumber;
      } else {
        const cleanPath = pathname.replace('/api/restaurant/tables/', '').replace('/settle', '');
        tableParam = /^\d+$/.test(cleanPath) ? parseInt(cleanPath, 10) : cleanPath;
      }

      const targetTable =
        typeof tableParam === 'number'
          ? await repo.getTable(tableParam)
          : await repo.getTableByNumber(String(tableParam));

      if (!targetTable) {
        sendJson(res, 404, {
          error: 'TABLE_NOT_FOUND',
          code: 'TABLE_NOT_FOUND',
          message: `Table ${tableParam} not found.`,
        });
        return true;
      }

      if (identity.branchId && identity.branchId !== '*' && targetTable.branchId !== identity.branchId) {
        sendJson(res, 403, {
          error: `Staff token for branch ${identity.branchId} cannot settle table in branch ${targetTable.branchId}`,
          code: 'BRANCH_MISMATCH',
        });
        return true;
      }

      const idempotencyKey = (req.headers['x-idempotency-key'] as string) || body.idempotencyKey;
      if (idempotencyKey) {
        const existingIdempotent = await repo.getIdempotencyRecord(idempotencyKey);
        if (existingIdempotent) {
          const isPayloadMatch =
            existingIdempotent.tableNumber === targetTable.number &&
            (body.amountMinor === undefined || body.amountMinor === existingIdempotent.settlement?.amountMinor);
          if (isPayloadMatch) {
            sendJson(res, 200, {
              success: true,
              idempotentReplay: true,
              message: `Settlement already completed for Table ${targetTable.number} (idempotent replay)`,
              ...existingIdempotent,
            });
            return true;
          } else {
            sendJson(res, 409, {
              error: 'IDEMPOTENCY_CONFLICT',
              code: 'IDEMPOTENCY_CONFLICT',
              message: `Idempotency key ${idempotencyKey} has already been used with different settlement parameters.`,
            });
            return true;
          }
        }
      }

      const lockKey = `table_settle_${tenantContext.tenantId}_${targetTable.id}`;
      const idempLockKey = idempotencyKey ? `idemp_${tenantContext.tenantId}_${idempotencyKey}` : undefined;

      if (activeSettlementLocks.has(lockKey) || (idempLockKey && activeSettlementLocks.has(idempLockKey))) {
        sendJson(res, 409, {
          error: 'SETTLEMENT_IN_PROGRESS',
          code: 'SETTLEMENT_IN_PROGRESS',
          message: `Settlement is currently in progress for Table ${targetTable.number}. Concurrent settlement requests locked.`,
        });
        return true;
      }
      activeSettlementLocks.add(lockKey);
      if (idempLockKey) {
        activeSettlementLocks.add(idempLockKey);
      }

      try {
        const authorizer = identity.id;
        await runtimeController.emitAudit('TABLE_SETTLEMENT_ATTEMPT', authorizer, {
          tableNumber: targetTable.number,
          tableId: targetTable.id,
          branchId: targetTable.branchId,
          requestedAmountMinor: body.amountMinor,
          method: body.paymentMethod || body.method || 'CASH',
        });

        const isProviderConfirmed = Boolean(body.providerConfirmed && body.gatewayTransactionId);
        const settlementPayload = {
          method: body.paymentMethod || body.method || 'CASH',
          status: body.paymentStatus || body.status || 'PAID',
          amountMinor: body.amountMinor,
          authorizedBy: authorizer,
          reason: body.reason,
          verification: isProviderConfirmed ? ('PROVIDER_CONFIRMED' as const) : ('MANUAL_STAFF_RECORDED' as const),
          providerConfirmed: isProviderConfirmed,
          gatewayTransactionId: body.gatewayTransactionId,
          settledAt: new Date().toISOString(),
        };

        const result = await repo.settleTableSession(targetTable.id, settlementPayload, {
          expectedRevision: body.expectedRevision,
          authorizedBy: authorizer,
          reason: body.reason,
          idempotencyKey,
          idempotencyRecord: idempotencyKey ? {
            tableNumber: targetTable.number,
            table: targetTable,
            settlement: settlementPayload,
          } : undefined,
        });

        if (!result.success) {
          const statusCode =
            result.code === 'TABLE_NOT_FOUND'
              ? 404
              : result.code === 'REVISION_CONFLICT'
                ? 409
                : result.code === 'PARTIAL_SETTLEMENT_UNRESOLVED'
                  ? 422
                  : result.code === 'UNPAID_BALANCE'
                    ? 422
                    : 400;
          sendJson(res, statusCode, {
            code: result.code,
            error: result.code,
            message: result.error,
          });
          return true;
        }

        if (result.session?.sessionId) {
          try {
            eventBus.disconnectClientsForSession(result.session.sessionId);
          } catch (e) {
            console.error('⚠️ [Server] Failed to disconnect session clients:', e);
          }
        }

        try {
          await runtimeController.emitAudit('TABLE_SETTLEMENT_SUCCESS', authorizer, {
            tableNumber: targetTable.number,
            tableId: targetTable.id,
            settlement: result.session?.settlement,
            closedAt: result.session?.closedAt,
          });
        } catch (e) {
          console.error('⚠️ [Server] Failed to emit settlement audit:', e);
        }

        const responsePayload = {
          table: result.table,
          session: result.session,
          settlement: result.settlement || result.session?.settlement || settlementPayload,
          tableNumber: targetTable.number,
        };

        if (idempotencyKey) {
          await repo.saveIdempotencyRecord(idempotencyKey, responsePayload);
        }

        sendJson(res, 200, {
          success: true,
          message: `Table ${targetTable.number} successfully settled and vacated.`,
          ...responsePayload,
        });
        return true;
      } finally {
        activeSettlementLocks.delete(lockKey);
        if (idempLockKey) {
          activeSettlementLocks.delete(idempLockKey);
        }
      }
    }

    // 5. Deterministic Pricing Quote (Delegated to @orbitox/pos engine)
    if (pathname === '/api/restaurant/quote' && method === 'POST') {
      const body = await parseBody(req);
      const data = await posService.calculateQuote({
        items: body.items || body.cartItems || [],
        taxBasisPoints: body.taxBasisPoints ?? 500,
        currency: body.currency,
      });
      sendJson(res, 200, { success: true, data });
      return true;
    }

    // 6. Idempotent Order Submission (Delegated to @orbitox/pos engine)
    if (pathname === '/api/restaurant/orders' && method === 'POST') {
      const identity = requestIdentity;
      const body = await parseBody(req);
      const idempotencyKey =
        (req.headers['x-idempotency-key'] as string) ||
        (req.headers['idempotency-key'] as string) ||
        body.idempotencyKey;

      checkTestKillPoint(req, 'pre-commit');

      // Multi-Server Distributed Idempotency Lock
      if (idempotencyKey) {
        const payloadHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
        const existing = await repo.getIdempotencyRecord(idempotencyKey);
        if (existing && existing.status !== 'PENDING') {
          const storedHash = (existing as any).payloadHash;
          if (storedHash && storedHash !== payloadHash) {
            sendJson(res, 409, {
              error: 'IDEMPOTENCY_CONFLICT',
              code: 'IDEMPOTENCY_CONFLICT',
              message: `Idempotency key ${idempotencyKey} has already been used with different request parameters.`,
            });
            return true;
          }
          sendJson(res, 200, existing.response || existing);
          return true;
        }

        let isLeader = false;
        const startedAt = Date.now();
        try {
          await postgresStore.prisma.idempotencyRecord.create({
            data: {
              tenantId: tenantContext.tenantId,
              key: idempotencyKey,
              result: { status: 'PENDING', startedAt },
              expiresAt: new Date(Date.now() + 86400 * 1000),
            },
          });
          isLeader = true;
        } catch {
          // If an abandoned PENDING record exists older than 1500ms, reclaim leadership
          if (existing && existing.status === 'PENDING') {
            const prevStarted = Number((existing as any).startedAt || (existing.result as any)?.startedAt || 0);
            if (Date.now() - prevStarted > 1500) {
              isLeader = true;
            }
          }
        }

        if (!isLeader) {
          const pollStart = Date.now();
          while (Date.now() - pollStart < 800) {
            await new Promise((r) => setTimeout(r, 40));
            const rec = await repo.getIdempotencyRecord(idempotencyKey);
            if (rec && rec.status !== 'PENDING') {
              sendJson(res, 200, rec.response || rec);
              return true;
            }
          }
        }
      }

      // Authoritative Plan Limits & Quota Enforcement
      try {
        const quotaCheck = await ownerSelfService.checkPlanLimits(tenantContext.tenantId, 'ORDERS');
        if (!quotaCheck.allowed) {
          sendJson(res, 403, {
            error: 'PLAN_LIMIT_EXCEEDED',
            code: 'PLAN_LIMIT_EXCEEDED',
            message: quotaCheck.error || 'Monthly order limit reached for your subscription plan.',
            quota: quotaCheck,
          });
          return true;
        }
        if (quotaCheck.warning) {
          res.setHeader('x-quota-warning', `${quotaCheck.percentage}%`);
        }
      } catch (_quotaErr: any) {
        // Allow fallback if running in-memory without database
      }

      // Strip idempotencyKey so PosService does not trip on our distributed PENDING reservation
      const posBody = { ...body };
      delete posBody.idempotencyKey;

      const orderResult = await posService.submitOrder({
        body: posBody,
        identity,
        idempotencyKey: undefined,
        branchId: body.branchId || currentBranch?.id || 'branch_main',
        branchName: currentBranch?.name || body.branchName || 'Main Branch',
      });

      if (idempotencyKey) {
        const payloadHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
        if (orderResult.status === 201 || orderResult.status === 200) {
          await repo.saveIdempotencyRecord(idempotencyKey, {
            response: orderResult.body,
            status: 'DONE',
            payloadHash,
          });
        } else if (postgresStore?.prisma) {
          await postgresStore.prisma.idempotencyRecord.deleteMany({
            where: { tenantId: tenantContext.tenantId, key: idempotencyKey },
          }).catch(() => { });
        }
      }

      checkTestKillPoint(req, 'post-commit');

      if (orderResult.status === 201) {
        const orderId = orderResult.body.orderId || orderResult.body.data?.orderId;
        const totalMinor = orderResult.body.quote?.totalMinor || 0;
        const tableNumber = orderResult.body.tableNumber || body.tableNumber || 'unknown';
        await runtimeController.emitAudit('ORDER_PLACED', `table:${tableNumber}`, { orderId, totalMinor });
        await runtimeController.reportOrderProcessed(orderId, totalMinor);
      }

      sendJson(res, orderResult.status, orderResult.body);
      return true;
    }

    // 6b. Orders Query Endpoint
    if (pathname === '/api/restaurant/orders' && method === 'GET') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL') {
        sendJson(res, 401, { error: 'INVALID_CREDENTIAL', code: 'INVALID_CREDENTIAL' });
        return true;
      }
      if (identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: 'CAPABILITY_REVOKED', code: 'CAPABILITY_REVOKED' });
        return true;
      }

      const tableFilter = parsedUrl.query.tableNumber as string;
      const sessionFilter = parsedUrl.query.sessionId as string;
      const orderIdFilter = parsedUrl.query.orderId as string;
      const branchFilter = (parsedUrl.query.branchId as string) || (identity.isPrivileged ? undefined : identity.branchId);
      const statusFilter = (parsedUrl.query.status as string) || 'ALL';
      const searchQuery = ((parsedUrl.query.search || parsedUrl.query.q || '') as string).toLowerCase().trim();

      let orders = await posService.listOrders({
        tableNumber: tableFilter,
        sessionId: sessionFilter,
        branchId: branchFilter,
        status: statusFilter,
      });

      if (identity.type === 'DINER') {
        // Diner is strictly scoped to their own session
        orders = orders.filter((o) => o.sessionId === identity.sessionId);
      }

      if (orderIdFilter) {
        orders = orders.filter((o) => o.orderId === orderIdFilter);
      }

      if (searchQuery) {
        orders = orders.filter((o) => {
          const idMatch = o.orderId.toLowerCase().includes(searchQuery);
          const tblMatch = o.tableNumber.toLowerCase().includes(searchQuery);
          const custMatch =
            o.customer?.name?.toLowerCase().includes(searchQuery) ||
            o.customer?.phone?.includes(searchQuery) ||
            o.guestName?.toLowerCase().includes(searchQuery);
          const itemMatch = (o.items || []).some((it) => it.name.toLowerCase().includes(searchQuery));
          return idMatch || tblMatch || custMatch || itemMatch;
        });
      }

      sendJson(res, 200, {
        success: true,
        count: orders.length,
        data: orders,
        orders,
      });
      return true;
    }

    // 6c. Order Single Fetch (GET /api/restaurant/orders/:id)
    if (
      pathname.startsWith('/api/restaurant/orders/') &&
      !pathname.endsWith('/status') &&
      !pathname.endsWith('/cancel') &&
      method === 'GET'
    ) {
      const identity = requestIdentity;
      const orderId = pathname.replace('/api/restaurant/orders/', '');
      const order = await posService.getOrder(orderId);
      if (!order) {
        sendJson(res, 404, { success: false, error: `Order ${orderId} not found`, code: 'ORDER_NOT_FOUND' });
        return true;
      }

      const targetTable = await repo.getTableByNumber(order.tableNumber);
      const orderBranch = order.branchId || targetTable?.branchId;
      if (
        identity.branchId &&
        identity.branchId !== '*' &&
        orderBranch &&
        identity.branchId !== orderBranch
      ) {
        sendJson(res, 403, {
          error: 'BRANCH_MISMATCH',
          code: 'BRANCH_MISMATCH',
          message: `Staff member for branch ${identity.branchId} cannot view order in branch ${orderBranch}.`,
        });
        return true;
      }

      const tasks = (await repo.getKitchenTasks()).filter((t) => t.orderId === order.orderId);
      sendJson(res, 200, { success: true, data: order, tasks });
      return true;
    }

    // 6d. Order Status Transition (PATCH /api/restaurant/orders/:id/status & PATCH /api/restaurant/orders/:id)
    if (
      pathname.startsWith('/api/restaurant/orders/') &&
      (pathname.endsWith('/status') || method === 'PATCH') &&
      !pathname.endsWith('/cancel')
    ) {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type });
        return true;
      }
      if (identity.type === 'ANONYMOUS' || identity.type === 'DINER') {
        sendJson(res, 403, {
          error: 'FORBIDDEN',
          code: 'FORBIDDEN',
          message: 'Staff credentials required to update order status.',
        });
        return true;
      }

      const orderId = pathname.replace('/api/restaurant/orders/', '').replace('/status', '');
      const order = await repo.getOrder(orderId);
      if (!order) {
        sendJson(res, 404, { success: false, error: `Order ${orderId} not found`, code: 'ORDER_NOT_FOUND' });
        return true;
      }

      const targetTable = await repo.getTableByNumber(order.tableNumber);
      const orderBranch = order.branchId || targetTable?.branchId;
      if (
        identity.branchId &&
        identity.branchId !== '*' &&
        orderBranch &&
        identity.branchId !== orderBranch
      ) {
        sendJson(res, 403, {
          error: 'BRANCH_MISMATCH',
          code: 'BRANCH_MISMATCH',
          message: `Staff credential for branch ${identity.branchId} cannot update status for order in branch ${orderBranch}.`,
        });
        return true;
      }

      const canUpdateStatus =
        identity.isPrivileged ||
        ['MANAGER', 'ADMIN', 'OPERATIONS', 'POS', 'CHEF', 'SERVER', 'EXPO'].includes(identity.role || '');
      if (!canUpdateStatus) {
        sendJson(res, 403, {
          error: 'FORBIDDEN',
          code: 'FORBIDDEN',
          message: `Role ${identity.role} is not authorized to update order status.`,
        });
        return true;
      }

      const body = await parseBody(req);
      const newStatus = body.status || body.newStatus;
      const version = typeof body.version === 'number' ? body.version : undefined;

      if (!newStatus) {
        sendJson(res, 400, { success: false, error: 'Target status required', code: 'STATUS_REQUIRED' });
        return true;
      }

      try {
        const success = await repo.updateOrderStatus(orderId, newStatus, {
          authorizedBy: identity.id,
          reason: body.reason,
          version,
        });
        if (!success) {
          sendJson(res, 400, { success: false, error: 'Failed to update order status', code: 'UPDATE_FAILED' });
          return true;
        }

        const updatedOrder = await repo.getOrder(orderId);
        sendJson(res, 200, { success: true, data: updatedOrder });
        return true;
      } catch (err: any) {
        if (err.code === 'STATE_CONFLICT' || err.statusCode === 409 || err.message?.includes('STATE_CONFLICT')) {
          sendJson(res, 409, {
            success: false,
            error: 'STATE_CONFLICT',
            code: 'STATE_CONFLICT',
            message: 'Concurrent modification conflict: order was updated by another kitchen screen.',
          });
          return true;
        }
        sendJson(res, 500, { success: false, error: 'INTERNAL_ERROR', message: err.message });
        return true;
      }
    }

    // 6e. Order Cancellation (POST /api/restaurant/orders/:id/cancel)
    if (pathname.startsWith('/api/restaurant/orders/') && pathname.endsWith('/cancel') && method === 'POST') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type });
        return true;
      }
      if (identity.type === 'ANONYMOUS' || identity.type === 'DINER') {
        sendJson(res, 403, {
          error: 'FORBIDDEN',
          code: 'FORBIDDEN',
          message: 'Staff credentials required to cancel order.',
        });
        return true;
      }

      const orderId = pathname.replace('/api/restaurant/orders/', '').replace('/cancel', '');
      const order = await repo.getOrder(orderId);
      if (!order) {
        sendJson(res, 404, { success: false, error: `Order ${orderId} not found`, code: 'ORDER_NOT_FOUND' });
        return true;
      }

      const targetTable = await repo.getTableByNumber(order.tableNumber);
      const orderBranch = order.branchId || targetTable?.branchId;
      if (
        identity.branchId &&
        identity.branchId !== '*' &&
        orderBranch &&
        identity.branchId !== orderBranch
      ) {
        sendJson(res, 403, {
          error: 'BRANCH_MISMATCH',
          code: 'BRANCH_MISMATCH',
          message: `Staff credential for branch ${identity.branchId} cannot cancel order in branch ${orderBranch}.`,
        });
        return true;
      }

      const canCancel =
        identity.isPrivileged ||
        ['MANAGER', 'ADMIN', 'OPERATIONS', 'POS'].includes(identity.role || '');
      if (!canCancel) {
        sendJson(res, 403, {
          error: 'FORBIDDEN',
          code: 'FORBIDDEN',
          message: `Role ${identity.role} is not authorized to cancel orders. Manager or Operations role required.`,
        });
        return true;
      }

      const body = await parseBody(req);
      const reason = body.reason || body.cancellationReason;

      if (!reason || reason.trim().length < 3) {
        sendJson(res, 400, {
          success: false,
          error: 'A mandatory cancellation reason with at least 3 characters is required.',
          code: 'REASON_REQUIRED',
        });
        return true;
      }

      const result = await repo.cancelOrder(orderId, reason);
      if (!result.success) {
        const statusCode = result.code === 'ORDER_NOT_FOUND' ? 404 : 400;
        sendJson(res, statusCode, { success: false, error: result.error, code: result.code });
        return true;
      }

      sendJson(res, 200, { success: true, message: `Order ${orderId} cancelled`, data: result.order });
      return true;
    }

  return false;
}
