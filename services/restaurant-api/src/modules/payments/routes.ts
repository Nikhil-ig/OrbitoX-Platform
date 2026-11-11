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
  getActiveTenant,
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
import { RazorpayPaymentGatewayAdapter } from '../../../packages/integrations';
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

export async function handlePaymentsRoutes(ctx: TenantRouteContext): Promise<boolean> {
  const {
    req, res, pathname, method, parsedUrl, tenantContext, repo, posService,
    branches, floors, context, currentBranch, currentFloor, serviceShift,
    requestIdentity, activeStaffToken, activeStaffRole,
  } = ctx;
    // 6d. Razorpay Payment Order Creation (Server-Recomputed Amounts)
    if (
      (pathname === '/api/restaurant/payments/create-order' ||
        pathname === '/api/commerce/payments/create-session' ||
        pathname === '/api/commerce/razorpay/create-order' ||
        pathname === '/api/restaurant/checkout/razorpay/order' ||
        pathname === '/api/restaurant/checkout/razorpay/create-order') &&
      method === 'POST'
    ) {
      const body = await parseBody(req);
      const orderId = body.orderId;
      const idempotencyKey = (req.headers['x-idempotency-key'] as string) || body.idempotencyKey;
      if (!orderId) {
        sendJson(res, 400, {
          error: 'ORDER_ID_REQUIRED',
          code: 'ORDER_ID_REQUIRED',
          message: 'A valid orderId is required to create a payment session.',
        });
        return true;
      }

      const tenant = getActiveTenant();
      const tid = tenant.tenantId;

      if (idempotencyKey && postgresStore?.prisma) {
        const existing = await repo.getIdempotencyRecord(idempotencyKey);
        if (existing) {
          sendJson(res, 200, existing.response || existing);
          return true;
        }
      }

      let order = await repo.getOrder(orderId);

      if (!order) {
        sendJson(res, 404, {
          error: 'ORDER_NOT_FOUND',
          code: 'ORDER_NOT_FOUND',
          message: `Order ${orderId} was not found.`,
        });
        return true;
      }

      // Server-recomputed amounts: Never trust client-passed amountMinor
      const amountMinor = order.totalMinor;
      const tableNumber = order.tableNumber || body.tableNumber;
      if (!tableNumber) {
        sendJson(res, 400, {
          error: 'TABLE_REQUIRED',
          code: 'TABLE_REQUIRED',
          message: 'Order has no associated table number.',
        });
        return true;
      }

      // Tenant-isolated Razorpay adapter instantiation
      let activeRazorpay = razorpayAdapter;
      try {
        const pConfig = await ownerSelfService.getPaymentConfig(tid, true);
        if (pConfig && pConfig.configured && pConfig.keyId && pConfig.keySecret) {
          activeRazorpay = new RazorpayPaymentGatewayAdapter({
            keyId: pConfig.keyId,
            keySecret: pConfig.keySecret,
            webhookSecret: pConfig.webhookSecret,
          });
        }
      } catch {
        // Fallback to default configured adapter
      }

      try {
        const result = await activeRazorpay.createOrder({
          orderId,
          amountMinor,
          currency: order.currency || 'INR',
          tableNumber,
          tenantId: tid,
          notes: {
            guestName: order.guestName || body.guestName || 'Guest',
            branchId: order.branchId || currentBranch?.id || '',
          },
        });

        checkTestKillPoint(req, 'pre-commit');

        if (postgresStore) {
          try {
            await postgresStore.savePaymentSession(
              {
                id: result.razorpayOrderId,
                orderId,
                tableNumber,
                amountMinor,
                currency: result.currency,
                status: 'created',
              },
              tid
            );
          } catch (dbErr: any) {
            console.warn('[Payments] Postgres savePaymentSession failed:', dbErr.message);
          }
        }

        await runtimeController.emitAudit('PAYMENT_ORDER_CREATED', `table:${tableNumber}`, {
          orderId,
          razorpayOrderId: result.razorpayOrderId,
          amountMinor,
          tenantId: tid,
        });

        const responseData = {
          razorpayOrderId: result.razorpayOrderId,
          amountMinor,
          currency: result.currency,
          keyId: activeRazorpay.keyId,
          orderId,
          tableNumber,
          paymentUrl: result.paymentUrl,
        };

        if (idempotencyKey && postgresStore?.prisma) {
          await repo.saveIdempotencyRecord(idempotencyKey, {
            success: true,
            data: responseData,
          }).catch(() => { });
        }

        checkTestKillPoint(req, 'post-commit');

        sendJson(res, 201, {
          success: true,
          data: responseData,
        });
      } catch (err: any) {
        sendJson(res, 500, {
          error: 'PAYMENT_CREATION_FAILED',
          code: 'PAYMENT_CREATION_FAILED',
          message: err.message,
        });
      }
      return true;
    }

    // 6e. Razorpay Webhook Receiver with HMAC-SHA256 Verification & Invoicing
    if (
      (pathname === '/api/restaurant/payments/webhook' ||
        pathname === '/api/commerce/payments/webhook' ||
        pathname === '/api/restaurant/checkout/razorpay/webhook') &&
      method === 'POST'
    ) {
      const body = await parseBody(req);
      const rawBody = (req as any).rawBody || JSON.stringify(body);
      const signature = (req.headers['x-razorpay-signature'] as string) || '';

      const tenant = getActiveTenant();
      const tid = tenant.tenantId;

      let activeRazorpay = razorpayAdapter;
      try {
        const pConfig = await ownerSelfService.getPaymentConfig(tid, true);
        if (pConfig && pConfig.configured && pConfig.keyId && pConfig.keySecret) {
          activeRazorpay = new RazorpayPaymentGatewayAdapter({
            keyId: pConfig.keyId,
            keySecret: pConfig.keySecret,
            webhookSecret: pConfig.webhookSecret,
          });
        }
      } catch {
        // Fallback
      }

      // Verify HMAC-SHA256 signature
      const isValidSignature = activeRazorpay.verifyWebhookSignature(rawBody, signature);
      if (!isValidSignature) {
        sendJson(res, 401, {
          error: 'INVALID_SIGNATURE',
          code: 'INVALID_SIGNATURE',
          message: 'Razorpay webhook signature verification failed.',
        });
        return true;
      }

      // Durable Webhook Deduplication / Idempotency
      const eventId =
        (req.headers['x-razorpay-event-id'] as string) ||
        body.event_id ||
        body.id ||
        (body.payload?.payment?.entity?.id ? `evt_${body.payload.payment.entity.id}` : null);

      if (eventId) {
        const existingEvt = await repo.getIdempotencyRecord(eventId);
        if (existingEvt) {
          sendJson(res, 200, { success: true, status: 'idempotent_duplicate', eventId });
          return true;
        }
      }

      const eventType = body.event || 'payment.captured';
      const paymentEntity = body.payload?.payment?.entity || body.payment || {};
      const razorpayPaymentId = paymentEntity.id || body.payment_id || `pay_${Date.now()}`;
      const razorpayOrderId = paymentEntity.order_id || body.order_id;
      const notes = paymentEntity.notes || body.notes || {};
      const orderId = notes.orderId || body.orderId;
      const targetTid = notes.tenantId || tid;

      if (
        eventType === 'payment.captured' ||
        eventType === 'payment.authorized' ||
        eventType === 'order.paid'
      ) {
        // Transition order and payment session state idempotently: UNPAID -> AUTHORIZED -> CAPTURED
        let existingSession = null;
        if (postgresStore && razorpayOrderId) {
          try {
            existingSession = await postgresStore.getPaymentSessionById(razorpayOrderId, tid);
          } catch { }
        }

        if (existingSession && existingSession.status === 'captured') {
          sendJson(res, 200, {
            success: true,
            status: 'idempotent_duplicate',
            orderId: existingSession.orderId,
            razorpayPaymentId: existingSession.razorpayPaymentId,
          });
          return true;
        }

        const amountMinor = paymentEntity.amount || existingSession?.amountMinor || 0;
        const tableNumber = notes.tableNumber || existingSession?.tableNumber || '';

        if (postgresStore && razorpayOrderId) {
          try {
            await postgresStore.savePaymentSession(
              {
                id: razorpayOrderId,
                orderId: orderId || existingSession?.orderId || `ord_${Date.now()}`,
                tableNumber,
                amountMinor,
                status: 'captured',
                razorpayPaymentId,
                razorpaySignature: signature,
              },
              tid
            );
          } catch (dbErr: any) {
            console.warn('[Payments] Postgres update payment session failed:', dbErr.message);
          }
        }

        // Update Order and Table via repository
        const targetOrderId = orderId || existingSession?.orderId;
        let order = targetOrderId ? await repo.getOrder(targetOrderId) : null;
        if (order) {
          order.status = 'PAID';
          (order as any).paymentMethod = 'RAZORPAY';
          (order as any).paymentStatus = 'PAID';
          await repo.updateOrderStatus(order.orderId, 'PAID', 'Order paid via Razorpay');
        }

        // Automatically generate statutory Indian GST Tax Invoice
        let invoiceRecord = null;
        if (order) {
          try {
            invoiceRecord = await repo.getInvoiceByOrderId(order.orderId);
            if (!invoiceRecord) {
              const { fiscalYear } = computeFiscalYear();
              const seq = await repo.getNextInvoiceSequence(fiscalYear);
              const tenantBrand = await repo.getTenantBrand();
              invoiceRecord = buildGSTInvoice({
                order,
                sequenceNumber: seq,
                tenantId: tid,
                tenantBrand,
                branch: currentBranch,
              });
              await repo.saveInvoice(invoiceRecord);
              eventBus.broadcast({
                id: `evt_${Date.now()}`,
                sequence: (await repo.getEvents()).length,
                type: 'invoice.generated',
                timestamp: new Date().toISOString(),
                producer: 'api:payment-service',
                branchId: order.branchId || currentBranch?.id || 'branch_main',
                tableNumber: order.tableNumber,
                tenantId: tid,
                payload: invoiceRecord,
              });
            }
          } catch (invErr: any) {
            console.warn('[Invoicing] Automatic invoice generation failed:', invErr.message);
          }
        }

        eventBus.broadcast({
          id: `evt_${Date.now()}`,
          sequence: (await repo.getEvents()).length,
          type: 'payment.captured',
          timestamp: new Date().toISOString(),
          producer: 'api:payment-service',
          branchId: order?.branchId || currentBranch?.id || 'branch_main',
          tableNumber,
          tenantId: tid,
          payload: {
            razorpayPaymentId,
            razorpayOrderId,
            orderId: targetOrderId,
            amountMinor,
            invoiceNumber: invoiceRecord?.invoiceNumber,
          },
        });

        await runtimeController.emitAudit('PAYMENT_CAPTURED', `payment:${razorpayPaymentId}`, {
          orderId: targetOrderId,
          amountMinor,
          razorpayPaymentId,
          invoiceNumber: invoiceRecord?.invoiceNumber,
        });

        if (eventId) {
          await repo.saveIdempotencyRecord(eventId, { status: 'captured', razorpayPaymentId, targetOrderId });
        }

        sendJson(res, 200, {
          success: true,
          status: 'captured',
          razorpayPaymentId,
          orderId: targetOrderId,
          invoiceNumber: invoiceRecord?.invoiceNumber,
        });
        return true;
      }

      if (eventType === 'payment.failed') {
        if (postgresStore && razorpayOrderId) {
          try {
            await postgresStore.savePaymentSession(
              {
                id: razorpayOrderId,
                orderId: orderId || `ord_${Date.now()}`,
                tableNumber: notes.tableNumber || '',
                amountMinor: paymentEntity.amount || 0,
                status: 'failed',
                razorpayPaymentId,
              },
              tid
            );
          } catch { }
        }

        await runtimeController.emitAudit('PAYMENT_FAILED', `payment:${razorpayPaymentId}`, {
          razorpayPaymentId,
          orderId,
        });

        if (eventId) {
          await repo.saveIdempotencyRecord(eventId, { status: 'failed', razorpayPaymentId });
        }

        sendJson(res, 200, { success: true, status: 'failed', razorpayPaymentId });
        return true;
      }

      if (eventId) {
        await repo.saveIdempotencyRecord(eventId, { received: true, eventType });
      }
      sendJson(res, 200, { success: true, received: true, event: eventType });
      return true;
    }

    // 6f. GST Invoicing Retrieval Endpoints
    // GET /invoices/:id, /invoices/:id/print, GET /api/restaurant/invoices/:id
    if (
      (pathname.startsWith('/api/restaurant/invoices/') || pathname.startsWith('/invoices/')) &&
      pathname !== '/api/restaurant/invoices/generate' &&
      pathname !== '/api/restaurant/invoices' &&
      method === 'GET'
    ) {
      const isApi = pathname.startsWith('/api/');
      const isPrint = pathname.endsWith('/print');
      const rawParam = pathname
        .replace('/api/restaurant/invoices/', '')
        .replace('/invoices/', '')
        .replace('/print', '');

      let invoice = await repo.getInvoiceByOrderId(rawParam);
      if (!invoice && rawParam.startsWith('INV-')) {
        invoice = await repo.getInvoiceByNumber(rawParam);
      }
      if (!invoice && postgresStore) {
        invoice = await postgresStore.getInvoiceByOrderId(rawParam, tenantContext.tenantId);
        if (!invoice && rawParam.startsWith('INV-')) {
          invoice = await postgresStore.getInvoiceByNumber(rawParam, tenantContext.tenantId);
        }
      }

      if (!invoice) {
        sendJson(res, 404, {
          error: 'INVOICE_NOT_FOUND',
          code: 'INVOICE_NOT_FOUND',
          message: `Invoice not found for identifier: ${rawParam}`,
        });
        return true;
      }

      const wantsHtml = !isApi || isPrint || parsedUrl.query.format === 'html';
      if (wantsHtml) {
        const tenantBrand = await repo.getTenantBrand();
        const html = renderPrintableInvoiceHtml(invoice, tenantBrand, currentBranch);
        sendHtml(res, html);
        return true;
      }

      sendJson(res, 200, { success: true, data: invoice });
      return true;
    }

    // GET /api/restaurant/invoices (query by ?orderId=... or ?number=...)
    if (pathname === '/api/restaurant/invoices' && method === 'GET') {
      const tid = getActiveTenant().tenantId;
      const orderIdQuery = parsedUrl.query.orderId as string;
      const numberQuery = (parsedUrl.query.number || parsedUrl.query.invoiceNumber) as string;

      if (!postgresStore) {
        sendJson(res, 503, {
          error: 'POSTGRES_STORE_UNAVAILABLE',
          message: 'PostgreSQL storage required for durable invoices.',
        });
        return true;
      }

      if (orderIdQuery) {
        const invoice = await postgresStore.getInvoiceByOrderId(orderIdQuery, tid);
        if (!invoice) {
          sendJson(res, 404, { error: 'INVOICE_NOT_FOUND', message: `No invoice for order ${orderIdQuery}` });
          return true;
        }
        sendJson(res, 200, { success: true, data: invoice });
        return true;
      }

      if (numberQuery) {
        const invoice = await postgresStore.getInvoiceByNumber(numberQuery, tid);
        if (!invoice) {
          sendJson(res, 404, { error: 'INVOICE_NOT_FOUND', message: `No invoice with number ${numberQuery}` });
          return true;
        }
        sendJson(res, 200, { success: true, data: invoice });
        return true;
      }

      const invoices = await (postgresStore as any).prisma.invoice.findMany({
        where: { tenantId: tid },
        orderBy: { sequenceNumber: 'desc' },
        take: 50,
      });
      sendJson(res, 200, { success: true, count: invoices.length, data: invoices });
      return true;
    }

    // POST /api/restaurant/invoices/generate (Manual or Staff-Initiated GST Invoice Generation)
    if (pathname === '/api/restaurant/invoices/generate' && method === 'POST') {
      const body = await parseBody(req);
      const orderId = body.orderId;
      if (!orderId) {
        sendJson(res, 400, { error: 'ORDER_ID_REQUIRED', message: 'orderId is required' });
        return true;
      }

      const tid = getActiveTenant().tenantId;

      const existing = await repo.getInvoiceByOrderId(orderId);
      if (existing) {
        sendJson(res, 200, { success: true, message: 'Invoice already exists', data: existing });
        return true;
      }

      let order = await repo.getOrder(orderId);
      if (!order) {
        sendJson(res, 404, { error: 'ORDER_NOT_FOUND', message: `Order ${orderId} not found` });
        return true;
      }

      const { fiscalYear } = computeFiscalYear();
      const seq = await repo.getNextInvoiceSequence(fiscalYear);
      const tenantBrand = await repo.getTenantBrand();
      try {
        const invoiceRecord = buildGSTInvoice({
          order,
          sequenceNumber: seq,
          tenantId: tid,
          gstin: body.gstin,
          legalEntityName: body.legalEntityName,
          restaurantName: body.restaurantName,
          address: body.address,
          tenantBrand,
          branch: currentBranch,
          unregisteredInvoiceMode: body.unregisteredInvoiceMode,
          customerPhone: body.customerPhone,
          customerEmail: body.customerEmail,
          customerGstin: body.customerGstin,
        });

        await repo.saveInvoice(invoiceRecord);
        sendJson(res, 201, { success: true, data: invoiceRecord });
        return true;
      } catch (invErr: any) {
        sendJson(res, 400, {
          error: invErr.code || 'GSTIN_REQUIRED',
          code: invErr.code || 'GSTIN_REQUIRED',
          message: invErr.message,
        });
        return true;
      }
    }

    // 6g. Level 4 Refund Governance Endpoint
    if (pathname === '/api/restaurant/payments/refund' && method === 'POST') {
      const identity = requestIdentity;
      const body = await parseBody(req);
      const staffRole = identity.role || body.staffRole;
      const isPinVerified = identity.isPrivileged || Boolean(body.staffPinVerified);

      const governance = razorpayAdapter.checkRefundGovernance(staffRole, isPinVerified);
      if (!governance.allowed) {
        sendJson(res, 403, {
          error: 'REFUND_GOVERNANCE_BLOCKED',
          code: 'REFUND_GOVERNANCE_BLOCKED',
          message: governance.reason,
        });
        return true;
      }

      await runtimeController.emitAudit('REFUND_APPROVED', identity.id || 'staff', {
        paymentId: body.paymentId,
        orderId: body.orderId,
        amountMinor: body.amountMinor,
        reason: body.reason,
      });

      sendJson(res, 200, {
        success: true,
        message: 'Refund approved via Level 4 Staff Authorization and logged to audit trail.',
        data: {
          paymentId: body.paymentId,
          orderId: body.orderId,
          status: 'REFUND_AUTHORIZED',
          authorizedBy: identity.id || 'staff',
        },
      });
      return true;
    }

  return false;
}
