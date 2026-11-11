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

export async function handleTablesRoutes(ctx: TenantRouteContext): Promise<boolean> {
  const {
    req, res, pathname, method, parsedUrl, tenantContext, repo, posService,
    branches, floors, context, currentBranch, currentFloor, serviceShift,
    requestIdentity, activeStaffToken, activeStaffRole,
  } = ctx;
    // 12. Floor Tables List
    if ((pathname === '/api/restaurant/floor' || pathname === '/api/restaurant/tables') && method === 'GET') {
      const bId = (parsedUrl.query.branchId as string) || currentBranch.id;
      const fId = (parsedUrl.query.floorId as string) || undefined;
      const tables = await repo.getTables(bId, fId);
      sendJson(res, 200, {
        success: true,
        tables,
      });
      return true;
    }

    // 13. Floor Layout Persist
    // Invariant: Single table payload updates ONLY that table in place!
    // Multi-table payload updates ONLY tables for the target floor/branch!
    if (pathname === '/api/restaurant/floor/save' && method === 'POST') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: 'Invalid or revoked credential', code: identity.type });
        return true;
      }
      if (identity.type === 'DINER') {
        sendJson(res, 403, { error: 'Diner capability cannot modify floor layout', code: 'FORBIDDEN' });
        return true;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'Staff credential required', code: 'UNAUTHENTICATED' });
        return true;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'Floor layout modification requires Manager or Admin privileges', code: 'FORBIDDEN' });
        return true;
      }

      const body = await parseBody(req);
      if (Array.isArray(body.tables)) {
        const saveResult = await repo.saveFloorTables(body.tables, currentBranch.id, currentFloor.id, {
          expectedRevision: body.expectedRevision,
        });
        if (!saveResult.success) {
          sendJson(res, 409, {
            error: saveResult.error,
            code: saveResult.code || 'REVISION_CONFLICT',
          });
          return true;
        }
        eventBus.broadcast({
          id: `evt_${Date.now()}`,
          sequence: (await repo.getEvents()).length,
          type: 'table.updated',
          timestamp: new Date().toISOString(),
          producer: 'api:floor-save',
          branchId: currentBranch.id,
          tenantId: tenantContext.tenantId,
          payload: { totalTables: body.tables.length },
        });
        await runtimeController.emitAudit('FLOOR_LAYOUT_SAVED', 'admin:operations', { totalTables: body.tables.length });
        sendJson(res, 200, { success: true, message: 'Floor layout saved successfully' });
        return true;
      }
      sendJson(res, 400, { error: 'Invalid tables payload' });
      return true;
    }

    // 14a. Table Bill & Authoritative Breakdown (GET /api/restaurant/tables/:id/bill)
    if (pathname.startsWith('/api/restaurant/tables/') && pathname.endsWith('/bill') && method === 'GET') {
      const rawId = pathname.replace('/api/restaurant/tables/', '').replace('/bill', '');
      const tableId = /^\d+$/.test(rawId) ? parseInt(rawId, 10) : rawId;
      const targetTable = typeof tableId === 'number' ? await repo.getTable(tableId) : await repo.getTableByNumber(tableId);
      if (!targetTable) {
        sendJson(res, 404, { success: false, error: `Table ${tableId} not found`, code: 'TABLE_NOT_FOUND' });
        return true;
      }

      const identity = requestIdentity;
      if (
        identity.branchId &&
        identity.branchId !== '*' &&
        targetTable.branchId &&
        targetTable.branchId !== identity.branchId
      ) {
        sendJson(res, 403, {
          error: 'BRANCH_MISMATCH',
          code: 'BRANCH_MISMATCH',
          message: `Staff credential for branch ${identity.branchId} cannot access bill for table in branch ${targetTable.branchId}.`,
        });
        return true;
      }

      const billData = await repo.getTableBill(targetTable.id);
      sendJson(res, 200, { success: true, ...billData });
      return true;
    }

    // 14b. Table Single Fetch & Update (GET & PATCH /api/restaurant/tables/:id)
    if (
      pathname.startsWith('/api/restaurant/tables/') &&
      !pathname.includes('/seats') &&
      !pathname.includes('/settle') &&
      !pathname.includes('/rotate-locator') &&
      !pathname.endsWith('/bill') &&
      method === 'GET'
    ) {
      const parts = pathname.split('/');
      const rawId = parts[parts.length - 1];
      const tableId = /^\d+$/.test(rawId) ? parseInt(rawId, 10) : rawId;
      const table = typeof tableId === 'number' ? await repo.getTable(tableId) : await repo.getTableByNumber(tableId);
      if (!table) {
        sendJson(res, 404, { error: 'Table not found' });
        return true;
      }
      const bill = await repo.getTableBill(table.id);
      sendJson(res, 200, { success: true, table, bill });
      return true;
    }

    // 14c. Table Creation with Quota Enforcement (POST /api/restaurant/tables)
    if (pathname === '/api/restaurant/tables' && method === 'POST') {
      if (requestIdentity.type === 'INVALID_CREDENTIAL' || requestIdentity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: requestIdentity.type, code: requestIdentity.type, message: 'Invalid or revoked credential.' });
        return true;
      }
      if (requestIdentity.type === 'ANONYMOUS' || requestIdentity.type === 'DINER' || !requestIdentity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Table creation requires Manager or Admin privileges.' });
        return true;
      }

      try {
        const quotaCheck = await ownerSelfService.checkPlanLimits(tenantContext.tenantId, 'TABLES');
        if (!quotaCheck.allowed) {
          sendJson(res, 403, {
            error: 'PLAN_LIMIT_EXCEEDED',
            code: 'PLAN_LIMIT_EXCEEDED',
            message: quotaCheck.error || 'Table limit exceeded for current plan tier.',
            quota: quotaCheck,
          });
          return true;
        }
        if (quotaCheck.warning) {
          res.setHeader('x-quota-warning', `${quotaCheck.percentage}%`);
        }

        const body = await parseBody(req);
        const allTables = await repo.getTables();
        const nextId = body.id ? (typeof body.id === 'number' ? body.id : parseInt(body.id, 10)) : Math.max(0, ...allTables.map((t) => t.id)) + 1;
        const tableNumber = body.number || `T-${nextId < 10 ? '0' + nextId : nextId}`;
        const capacity = Number(body.capacity) || 4;

        const newTable: TableFloorRecord = {
          id: nextId,
          number: tableNumber,
          capacity,
          status: 'AVAILABLE',
          x: body.x || 100,
          y: body.y || 100,
          width: body.width || 90,
          height: body.height || 90,
          shape: body.shape || 'rectangle',
          section: body.section || 'Main',
          floorId: body.floorId || currentFloor?.id || 'fl_main',
          branchId: body.branchId || currentBranch?.id || 'branch_main',
          locator: crypto.randomBytes(6).toString('base64url'),
          seats: generateSeats(capacity, nextId),
        };

        await repo.saveFloorTables([newTable]);
        await ownerSelfService.updateOnboardingStep(tenantContext.tenantId, 'TABLES_REVIEWED', true);

        sendJson(res, 201, { success: true, table: newTable });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
      return true;
    }

    if (pathname.startsWith('/api/restaurant/tables/') && method === 'PATCH') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL') {
        sendJson(res, 401, { error: 'Invalid credential', code: 'INVALID_CREDENTIAL' });
        return true;
      }
      if (identity.type === 'DINER' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 403, { error: 'Diner capability cannot modify table properties', code: 'FORBIDDEN' });
        return true;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'Staff credential required', code: 'UNAUTHENTICATED' });
        return true;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'Table modification requires Manager or Admin privileges', code: 'FORBIDDEN' });
        return true;
      }

      const parts = pathname.split('/');
      const tableId = parseInt(parts[parts.length - 1], 10);
      const existingTable = await repo.getTable(tableId);
      if (!existingTable) {
        sendJson(res, 404, { error: 'Table not found' });
        return true;
      }
      if (identity.branchId && identity.branchId !== '*' && existingTable.branchId !== identity.branchId) {
        sendJson(res, 403, {
          error: `Credential for branch ${identity.branchId} cannot modify table in branch ${existingTable.branchId}`,
          code: 'BRANCH_MISMATCH',
        });
        return true;
      }
      const body = await parseBody(req);

      let updatedTable: TableFloorRecord | undefined;
      if (body.capacity) {
        updatedTable = await repo.updateTableCapacity(tableId, parseInt(body.capacity, 10));
      } else {
        updatedTable = await repo.getTable(tableId);
        if (updatedTable) {
          if (body.status) updatedTable.status = body.status;
          if (body.serverName) updatedTable.serverName = body.serverName;
          await repo.saveFloorTables([updatedTable]);
        }
      }

      if (!updatedTable) {
        sendJson(res, 404, { error: 'Table not found' });
        return true;
      }

      eventBus.broadcast({
        id: `evt_${Date.now()}`,
        sequence: (await repo.getEvents()).length,
        type: 'table.updated',
        timestamp: new Date().toISOString(),
        producer: 'api:table-patch',
        branchId: currentBranch.id,
        tableNumber: updatedTable.number,
        tenantId: tenantContext.tenantId,
        payload: updatedTable,
      });

      sendJson(res, 200, { success: true, table: updatedTable });
      return true;
    }

    // 15. Seat Management (POST /api/restaurant/tables/:id/seats & DELETE /api/restaurant/tables/:id/seats/:seatId)
    if (pathname.startsWith('/api/restaurant/tables/') && pathname.includes('/seats')) {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return true;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Seat management requires authenticated staff credentials.' });
        return true;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Seat management requires Manager or Admin privileges.' });
        return true;
      }

      const parts = pathname.split('/');
      const tableId = parseInt(parts[4], 10);

      if (method === 'POST') {
        const body = await parseBody(req);
        const newSeat = await repo.addSeatToTable(tableId, body.label);
        if (!newSeat) {
          sendJson(res, 404, { error: 'Table not found' });
          return true;
        }
        sendJson(res, 201, { success: true, seat: newSeat });
        return true;
      }

      if (method === 'DELETE') {
        const seatId = parts[6];
        const ok = await repo.removeSeatFromTable(tableId, seatId);
        sendJson(res, ok ? 200 : 404, { success: ok });
        return true;
      }
    }

    // Table Deletion (DELETE /api/restaurant/tables/:id)
    if (pathname.startsWith('/api/restaurant/tables/') && !pathname.includes('/seats') && method === 'DELETE') {
      const identity = requestIdentity;
      if (!identity.isPrivileged) {
        sendJson(res, (identity.type === 'ANONYMOUS' || identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') ? 401 : 403, {
          error: 'FORBIDDEN',
          code: 'FORBIDDEN',
          message: 'Deleting tables requires manager privileges.',
        });
        return true;
      }
      const parts = pathname.split('/');
      const tableId = parseInt(parts[parts.length - 1], 10);
      const table = await repo.getTable(tableId);
      if (!table) {
        sendJson(res, 404, { error: 'Table not found', deletedTableId: tableId });
        return true;
      }
      if (identity.branchId && identity.branchId !== '*' && table.branchId !== identity.branchId) {
        sendJson(res, 403, {
          error: `Credential for branch ${identity.branchId} cannot delete table in branch ${table.branchId}`,
          code: 'BRANCH_MISMATCH',
        });
        return true;
      }
      const ok = await repo.deleteTable(tableId);
      sendJson(res, ok ? 200 : 404, { success: ok, deletedTableId: tableId });
      return true;
    }

    // Table QR Locator Explicit Rotation (POST /api/restaurant/tables/:id/rotate-locator)
    if (pathname.startsWith('/api/restaurant/tables/') && pathname.endsWith('/rotate-locator') && method === 'POST') {
      const parts = pathname.split('/');
      const tableId = parseInt(parts[4], 10);
      const identity = requestIdentity;
      if (!identity.isPrivileged) {
        sendJson(res, (identity.type === 'ANONYMOUS' || identity.type === 'INVALID_CREDENTIAL') ? 401 : 403, {
          error: 'FORBIDDEN',
          code: 'FORBIDDEN',
          message: 'Rotating table QR locators requires authorized staff or manager privileges.',
        });
        return true;
      }
      const targetTable = await repo.getTable(tableId);
      if (targetTable && identity.branchId && identity.branchId !== '*' && targetTable.branchId !== identity.branchId) {
        sendJson(res, 403, {
          error: `Credential for branch ${identity.branchId} cannot rotate table in branch ${targetTable.branchId}`,
          code: 'BRANCH_MISMATCH',
        });
        return true;
      }
      const body = await parseBody(req);
      const result = await repo.rotateTableLocator(tableId, identity.id, body.reason);
      if (!result.success) {
        sendJson(res, 404, { error: result.error, code: 'TABLE_NOT_FOUND' });
        return true;
      }
      await runtimeController.emitAudit('TABLE_LOCATOR_ROTATED', identity.id, {
        tableId,
        oldLocator: result.oldLocator,
        newLocator: result.newLocator,
        reason: body.reason,
      });
      eventBus.broadcast({
        id: `evt_${Date.now()}`,
        sequence: (await repo.getEvents()).length,
        type: 'table.locator_rotated',
        timestamp: new Date().toISOString(),
        producer: 'api:table-security',
        branchId: currentBranch.id,
        tableNumber: result.table?.number,
        tenantId: tenantContext.tenantId,
        payload: result,
      });
      sendJson(res, 200, {
        success: true,
        data: result,
        message: `Table ${result.table?.number} QR locator rotated successfully.`,
      });
      return true;
    }

    // Test Reset Endpoint (POST /api/restaurant/test/reset)
    if (pathname === '/api/restaurant/test/reset' && method === 'POST') {
      if (process.env.NODE_ENV === 'production') {
        sendJson(res, 403, {
          error: 'FORBIDDEN_IN_PRODUCTION',
          code: 'FORBIDDEN_IN_PRODUCTION',
          message: 'Test destructive reset endpoint is strictly forbidden in production mode.',
        });
        return true;
      }
      await repo.resetToArchetypes();
      sendJson(res, 200, { success: true, message: 'Store reset to canonical archetypes' });
      return true;
    }

    // 16. Assign Seated Guest (POST /api/restaurant/seats/:seatId/guest)
    if (pathname.startsWith('/api/restaurant/seats/') && pathname.endsWith('/guest') && method === 'POST') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return true;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Assigning guests requires authenticated staff credentials.' });
        return true;
      }
      const parts = pathname.split('/');
      const seatId = parts[4];
      const body = await parseBody(req);

      const result = await repo.assignGuestToSeat(seatId, body.name, body.preferences);
      if (!result) {
        sendJson(res, 404, { error: 'Seat not found' });
        return true;
      }

      eventBus.broadcast({
        id: `evt_${Date.now()}`,
        sequence: (await repo.getEvents()).length,
        type: 'guest.joined',
        timestamp: new Date().toISOString(),
        producer: 'api:guest-assign',
        branchId: currentBranch.id,
        tenantId: tenantContext.tenantId,
        payload: result,
      });

      sendJson(res, 200, { success: true, data: result });
      return true;
    }

    // 17. Branches API
    if (pathname === '/api/restaurant/branches') {
      if (method === 'GET') {
        sendJson(res, 200, { success: true, data: await repo.getBranches() });
        return true;
      }
      if (method === 'POST') {
        const identity = requestIdentity;
        if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
          sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
          return true;
        }
        if (identity.type === 'ANONYMOUS') {
          sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Branch management requires manager credentials.' });
          return true;
        }
        if (!identity.isPrivileged) {
          sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Creating or updating branches requires Manager or Admin privileges.' });
          return true;
        }
        const body = await parseBody(req);
        const saved = await repo.saveBranch(body);
        eventBus.broadcast({
          id: `evt_${Date.now()}`,
          sequence: (await repo.getEvents()).length,
          type: 'branch.updated',
          timestamp: new Date().toISOString(),
          producer: 'api:branch-save',
          branchId: saved.id,
          tenantId: tenantContext.tenantId,
          payload: saved,
        });
        sendJson(res, 200, { success: true, data: saved });
        return true;
      }
    }

    if (pathname.startsWith('/api/restaurant/branches/') && method === 'DELETE') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return true;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Branch deletion requires manager credentials.' });
        return true;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Deleting branches requires Manager or Admin privileges.' });
        return true;
      }
      const branchId = pathname.replace('/api/restaurant/branches/', '');
      const ok = await repo.deleteBranch(branchId);
      sendJson(res, ok ? 200 : 404, { success: ok, deletedBranchId: branchId });
      return true;
    }

    // 18. Floors API
    if (pathname === '/api/restaurant/floors') {
      if (method === 'GET') {
        const bFilter = parsedUrl.query.branchId as string;
        const result = await repo.getFloors(bFilter);
        sendJson(res, 200, { success: true, data: result });
        return true;
      }
      if (method === 'POST') {
        const identity = requestIdentity;
        if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
          sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
          return true;
        }
        if (identity.type === 'ANONYMOUS') {
          sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Floor management requires staff credentials.' });
          return true;
        }
        if (!identity.isPrivileged) {
          sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Floor creation and layout management requires Manager or Admin privileges.' });
          return true;
        }
        const body = await parseBody(req);
        if (body.action === 'SWITCH_LAYOUT') {
          const f = await repo.getFloor(body.floorId);
          if (f) {
            f.activeLayout = body.layoutName;
            await repo.saveFloor(f);
          }
          sendJson(res, 200, { success: true, floor: f });
          return true;
        }
        if (body.action === 'RENAME') {
          const f = await repo.getFloor(body.floorId);
          if (f) {
            f.name = body.name;
            await repo.saveFloor(f);
          }
          sendJson(res, 200, { success: true, floor: f });
          return true;
        }
        const floorRecord = {
          id: body.id || `floor_${crypto.randomUUID()}`,
          name: body.name || 'New Service Area',
          branchId: body.branchId || currentBranch.id,
          section: body.section || 'MAIN',
          activeLayout: body.activeLayout || 'Default Service',
          type: body.type || 'Standard',
          availableLayouts: body.availableLayouts || ['Default Service'],
          capacity: body.capacity || 40,
          tablesCount: body.tablesCount || 0,
          status: body.status || 'ACTIVE',
          ...body,
        };
        const saved = await repo.saveFloor(floorRecord);
        sendJson(res, 200, { success: true, data: saved });
        return true;
      }
    }

    if (pathname.startsWith('/api/restaurant/floors/') && method === 'DELETE') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return true;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Floor deletion requires manager credentials.' });
        return true;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Deleting floor plans requires Manager or Admin privileges.' });
        return true;
      }
      const floorId = pathname.replace('/api/restaurant/floors/', '');
      const ok = await repo.deleteFloor(floorId);
      sendJson(res, ok ? 200 : 404, { success: ok, deletedFloorId: floorId });
      return true;
    }

    // 19. Table Merging API
    if (pathname === '/api/restaurant/tables/merge' && method === 'POST') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL') {
        sendJson(res, 401, { error: 'Invalid credential', code: 'INVALID_CREDENTIAL' });
        return true;
      }
      if (identity.type === 'DINER' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 403, { error: 'Diners cannot merge tables', code: 'FORBIDDEN' });
        return true;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'Staff credential required', code: 'UNAUTHENTICATED' });
        return true;
      }

      const body = await parseBody(req);
      const ok = await repo.mergeTables(body.tableId1, body.tableId2);
      if (!ok) {
        sendJson(res, 404, { error: 'One or both tables not found' });
        return true;
      }
      eventBus.broadcast({
        id: `evt_${Date.now()}`,
        sequence: (await repo.getEvents()).length,
        type: 'table.merged',
        timestamp: new Date().toISOString(),
        producer: 'api:table-merge',
        branchId: currentBranch.id,
        tenantId: tenantContext.tenantId,
        payload: body,
      });
      sendJson(res, 200, { success: true, message: 'Tables merged successfully' });
      return true;
    }

    // 20. Table Unmerging API
    if (pathname === '/api/restaurant/tables/unmerge' && method === 'POST') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL') {
        sendJson(res, 401, { error: 'Invalid credential', code: 'INVALID_CREDENTIAL' });
        return true;
      }
      if (identity.type === 'DINER' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 403, { error: 'Diners cannot unmerge tables', code: 'FORBIDDEN' });
        return true;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'Staff credential required', code: 'UNAUTHENTICATED' });
        return true;
      }

      const body = await parseBody(req);
      const ok = await repo.unmergeTables(body.tableId);
      if (!ok) {
        sendJson(res, 404, { error: 'Table not found' });
        return true;
      }
      eventBus.broadcast({
        id: `evt_${Date.now()}`,
        sequence: (await repo.getEvents()).length,
        type: 'table.unmerged',
        timestamp: new Date().toISOString(),
        producer: 'api:table-unmerge',
        branchId: currentBranch.id,
        tenantId: tenantContext.tenantId,
        payload: body,
      });
      sendJson(res, 200, { success: true, message: 'Table unmerged successfully' });
      return true;
    }

    // 21. Service Requests API
    if (pathname === '/api/restaurant/service-requests') {
      if (method === 'GET') {
        sendJson(res, 200, { success: true, data: await repo.getServiceRequests(currentBranch.id) });
        return true;
      }
      if (method === 'POST') {
        const identity = requestIdentity;
        if (identity.type === 'INVALID_CREDENTIAL') {
          sendJson(res, 401, { error: 'INVALID_CREDENTIAL', code: 'INVALID_CREDENTIAL' });
          return true;
        }
        if (identity.type === 'REVOKED_CAPABILITY') {
          sendJson(res, 401, { error: 'CAPABILITY_REVOKED', code: 'CAPABILITY_REVOKED' });
          return true;
        }
        if (process.env.NODE_ENV === 'production' && identity.type === 'ANONYMOUS') {
          sendJson(res, 401, { error: 'CAPABILITY_REQUIRED', code: 'CAPABILITY_REQUIRED' });
          return true;
        }

        const body = await parseBody(req);
        const tableNumber = body.tableNumber;
        if (!tableNumber) {
          sendJson(res, 400, { error: 'TABLE_REQUIRED', code: 'TABLE_REQUIRED', message: 'Table number is required.' });
          return true;
        }

        if (identity.type === 'DINER' && identity.tableNumber) {
          const normIdTable = (identity.tableNumber || '').replace(/^T-/, '');
          const normReqTable = (tableNumber || '').replace(/^T-/, '');
          if (normIdTable !== normReqTable) {
            sendJson(res, 403, {
              error: 'TABLE_MISMATCH',
              code: 'TABLE_MISMATCH',
              message: `Diner capability for ${identity.tableNumber} cannot create service requests for ${tableNumber}.`,
            });
            return true;
          }
        }

        const newReq: ServiceRequest = {
          id: body.id || `sreq_${Date.now()}`,
          tableNumber,
          branchId: body.branchId || currentBranch.id,
          floorId: body.floorId || currentFloor.id,
          type: body.type || 'WATER',
          status: 'PENDING',
          requestedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          note: body.note,
        };
        await repo.addServiceRequest(newReq);

        if (body.type === 'BILL') {
          const t = await repo.getTableByNumber(newReq.tableNumber);
          if (t) {
            t.status = 'BILL_REQUESTED';
            await repo.saveFloorTables([t]);
          }
        }

        sendJson(res, 201, { success: true, data: newReq });
        return true;
      }
    }

    // 22. Resolve Service Request
    if (pathname.startsWith('/api/restaurant/service-requests/') && pathname.endsWith('/resolve') && method === 'POST') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'ANONYMOUS') {
        sendJson(res, 401, {
          error: 'UNAUTHENTICATED',
          code: 'UNAUTHENTICATED',
          message: 'Resolving service requests requires authenticated staff or manager credentials.',
        });
        return true;
      }
      if (identity.type === 'DINER' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 403, {
          error: 'FORBIDDEN',
          code: 'FORBIDDEN',
          message: 'Diners cannot resolve service requests.',
        });
        return true;
      }
      if (!identity.isPrivileged && identity.type !== 'STAFF' && identity.type !== 'STATION') {
        sendJson(res, 403, {
          error: 'FORBIDDEN',
          code: 'FORBIDDEN',
          message: 'Resolving service requests requires operations staff or manager credentials.',
        });
        return true;
      }
      const parts = pathname.split('/');
      const reqId = parts[4];
      const sReqs = await repo.getServiceRequests();
      const sReq = sReqs.find((r) => r.id === reqId);
      if (!sReq) {
        sendJson(res, 404, { error: 'Request not found' });
        return true;
      }
      const targetTbl = await repo.getTableByNumber(sReq.tableNumber);
      if (targetTbl && identity.branchId && identity.branchId !== '*' && targetTbl.branchId !== identity.branchId) {
        sendJson(res, 403, {
          error: `Credential for branch ${identity.branchId} cannot resolve request in branch ${targetTbl.branchId}`,
          code: 'BRANCH_MISMATCH',
        });
        return true;
      }
      const resolved = await repo.resolveServiceRequest(reqId);
      eventBus.broadcast({
        id: `evt_${Date.now()}`,
        sequence: (await repo.getEvents()).length,
        type: 'service_request.resolved',
        timestamp: new Date().toISOString(),
        producer: 'api:service-resolve',
        branchId: currentBranch.id,
        tableNumber: resolved?.tableNumber || sReq.tableNumber,
        tenantId: tenantContext.tenantId,
        payload: resolved,
      });
      sendJson(res, 200, { success: true, data: resolved });
      return true;
    }

    // 23. Reseed Storage to Canonical Archetypes
    if (pathname === '/api/restaurant/reseed' && method === 'POST') {
      if (process.env.NODE_ENV === 'production') {
        sendJson(res, 403, {
          error: 'FORBIDDEN_IN_PRODUCTION',
          code: 'FORBIDDEN_IN_PRODUCTION',
          message: 'Reseed endpoint is strictly forbidden in production mode.',
        });
        return true;
      }
      await repo.reseed();
      sendJson(res, 200, { success: true, message: 'Runtime store reseeded successfully' });
      return true;
    }

    // 24. Full State Inspection Dump
    if (pathname === '/api/restaurant/state' && method === 'GET') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, {
          error: identity.type === 'REVOKED_CAPABILITY' ? 'REVOKED_CAPABILITY' : (identity.error || 'INVALID_CREDENTIAL'),
          code: identity.type,
          message: 'Invalid or revoked credential. Access denied.',
        });
        return true;
      }
      if (identity.type === 'DINER' || (process.env.NODE_ENV === 'production' && identity.type === 'ANONYMOUS')) {
        sendJson(res, (identity.type === 'ANONYMOUS') ? 401 : 403, {
          error: 'FORBIDDEN',
          code: 'FORBIDDEN',
          message: 'Full state inspection requires staff or manager credentials.',
        });
        return true;
      }
      const [tables, menu, orders, tasks, sreqs, brand] = await Promise.all([
        repo.getTables(),
        repo.getMenuItems(true),
        repo.getOrders(),
        repo.getKitchenTasks(),
        repo.getServiceRequests(),
        repo.getTenantBrand(),
      ]);
      sendJson(res, 200, { tables, menu, orders, tasks, sreqs, brand });
      return true;
    }

    // 25. Authoritative Financial Ledger Reconciliation
    if (pathname === '/api/restaurant/finance/reconciliation' && method === 'GET') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: 'INVALID_CREDENTIAL', code: identity.type });
        return true;
      }
      if (identity.type === 'DINER' || (process.env.NODE_ENV === 'production' && !identity.isPrivileged)) {
        sendJson(res, (identity.type === 'ANONYMOUS') ? 401 : 403, {
          error: 'FORBIDDEN',
          code: 'FORBIDDEN',
          message: 'Financial reconciliation requires manager privileges.',
        });
        return true;
      }
      const branchFilter = (parsedUrl.query.branchId as string) || undefined;
      const report = await repo.reconcileFinancialLedger(branchFilter);
      sendJson(res, 200, {
        success: true,
        data: report,
        branchId: branchFilter || 'ALL_BRANCHES',
        timestamp: new Date().toISOString(),
      });
      return true;
    }

  return false;
}
