import * as http from 'http';
import { RouteDefinition } from '../../http/routes';
import {
  sendJson,
  postgresStore,
  ownerSelfService,
  razorpayAdapter,
  runtimeController,
  checkTestKillPoint,
  RequestContext,
} from '../../http/context';
import { RazorpayPaymentGatewayAdapter } from '../../shared/integrations';
import { buildGSTInvoice, computeFiscalYear } from '../../shared/invoicing';

async function handleCreateRazorpayOrder(req: http.IncomingMessage, res: http.ServerResponse, context: RequestContext): Promise<void> {
  const body = await context.parseBody();
  const orderId = body.orderId;
  const idempotencyKey = (req.headers['x-idempotency-key'] as string) || body.idempotencyKey;
  if (!orderId) {
    sendJson(res, 400, {
      error: 'ORDER_ID_REQUIRED',
      code: 'ORDER_ID_REQUIRED',
      message: 'A valid orderId is required to create a payment session.',
    });
    return;
  }

  const tid = context.tenantContext.tenantId;

  if (idempotencyKey) {
    const existing = await context.repo.getIdempotencyRecord(idempotencyKey);
    if (existing) {
      sendJson(res, 200, existing.response || existing);
      return;
    }
  }

  const order = await context.repo.getOrder(orderId);
  if (!order) {
    sendJson(res, 404, {
      error: 'ORDER_NOT_FOUND',
      code: 'ORDER_NOT_FOUND',
      message: `Order ${orderId} was not found.`,
    });
    return;
  }

  const amountMinor = order.totalMinor;
  const tableNumber = order.tableNumber || body.tableNumber;
  if (!tableNumber) {
    sendJson(res, 400, {
      error: 'TABLE_REQUIRED',
      code: 'TABLE_REQUIRED',
      message: 'Order has no associated table number.',
    });
    return;
  }

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
  } catch { }

  try {
    const result = await activeRazorpay.createOrder({
      orderId,
      amountMinor,
      currency: order.currency || 'INR',
      tableNumber,
      tenantId: tid,
      notes: {
        guestName: (order as any).guestName || body.guestName || 'Guest',
        branchId: order.branchId || context.currentBranch?.id || '',
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

    if (idempotencyKey) {
      await context.repo.saveIdempotencyRecord(idempotencyKey, {
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
}

async function handleRazorpayWebhook(req: http.IncomingMessage, res: http.ServerResponse, context: RequestContext): Promise<void> {
  const body = await context.parseBody();
  const rawBody = (req as any).rawBody || JSON.stringify(body);
  const signature = (req.headers['x-razorpay-signature'] as string) || '';
  const tid = context.tenantContext.tenantId;

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
  } catch { }

  const isValidSignature = activeRazorpay.verifyWebhookSignature(rawBody, signature);
  if (!isValidSignature) {
    sendJson(res, 401, {
      error: 'INVALID_SIGNATURE',
      code: 'INVALID_SIGNATURE',
      message: 'Razorpay webhook signature verification failed.',
    });
    return;
  }

  const paymentEntity = body.payload?.payment?.entity || body.payment || {};
  const orderEntity = body.payload?.order?.entity || body.order || {};
  const razorpayPaymentId = paymentEntity.id || body.payment_id || `pay_${Date.now()}`;
  const razorpayOrderId = paymentEntity.order_id || orderEntity.id || body.order_id;
  const notes = paymentEntity.notes || orderEntity.notes || body.notes || {};
  const orderId = notes.orderId || body.orderId;

  let invoiceRecord: any = null;
  const event = body.event || 'payment.captured';
  if (
    event === 'payment.captured' ||
    event === 'payment.authorized' ||
    event === 'order.paid'
  ) {
    const targetOrderId = orderId || razorpayOrderId;
    let order = targetOrderId ? await context.repo.getOrder(targetOrderId) : null;
    if (order) {
      order.status = 'PAID';
      (order as any).paymentMethod = 'RAZORPAY';
      (order as any).paymentStatus = 'PAID';
      await context.repo.updateOrderStatus(order.orderId, 'PAID', 'Order paid via Razorpay');

      try {
        invoiceRecord = await context.repo.getInvoiceByOrderId(order.orderId);
        if (!invoiceRecord) {
          const { fiscalYear } = computeFiscalYear();
          const seq = await context.repo.getNextInvoiceSequence(fiscalYear);
          const tenantBrand = await context.repo.getTenantBrand();
          invoiceRecord = buildGSTInvoice({
            order,
            sequenceNumber: seq,
            tenantId: tid,
            tenantBrand,
            branch: context.currentBranch,
          });
          await context.repo.saveInvoice(invoiceRecord);
        }
      } catch (invErr: any) {
        console.warn('[Invoicing] Automatic invoice generation failed:', invErr.message);
      }
    }

    sendJson(res, 200, {
      success: true,
      status: 'captured',
      razorpayPaymentId,
      orderId: targetOrderId,
      invoiceNumber: invoiceRecord?.invoiceNumber,
    });
    return;
  }

  sendJson(res, 200, { success: true, received: true });
}

export const paymentsRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/api/restaurant/payments/config',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'ANONYMOUS' || identity.type === 'DINER') {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Staff credentials required to view payment configuration.' });
        return;
      }
      const unmasked = context.parsedUrl.query.unmasked === 'true' && identity.isPrivileged;
      try {
        const paymentConfig = await ownerSelfService.getPaymentConfig(context.tenantContext.tenantId, unmasked);
        sendJson(res, 200, { success: true, paymentConfig });
      } catch (err: any) {
        sendJson(res, 500, { success: false, error: 'PAYMENT_CONFIG_FAILED', message: err.message });
      }
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/payments/config',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Manager or Admin privileges required to configure payment gateway.' });
        return;
      }
      const body = await context.parseBody();
      try {
        const result = await ownerSelfService.savePaymentConfig(context.tenantContext.tenantId, {
          keyId: body.keyId,
          keySecret: body.keySecret,
          webhookSecret: body.webhookSecret,
          gstin: body.gstin,
          legalEntityName: body.legalEntityName,
        });
        sendJson(res, 200, result);
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: 'PAYMENT_CONFIG_FAILED', message: err.message });
      }
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/payments/create-order',
    handler: handleCreateRazorpayOrder,
  },
  {
    method: 'POST',
    path: '/api/restaurant/payments/refund',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      const body = await context.parseBody();
      const staffRole = identity.role || body.staffRole;
      const isPinVerified = identity.isPrivileged || Boolean(body.staffPinVerified);

      const governance = razorpayAdapter.checkRefundGovernance(staffRole, isPinVerified);
      if (!governance.allowed) {
        sendJson(res, 403, {
          error: 'REFUND_GOVERNANCE_BLOCKED',
          code: 'REFUND_GOVERNANCE_BLOCKED',
          message: governance.reason,
        });
        return;
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
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/payments/webhook',
    handler: handleRazorpayWebhook,
  },
  {
    method: 'POST',
    path: '/api/commerce/payments/create-session',
    handler: handleCreateRazorpayOrder,
  },
  {
    method: 'POST',
    path: '/api/commerce/payments/webhook',
    handler: handleRazorpayWebhook,
  },
  {
    method: 'POST',
    path: '/api/commerce/razorpay/create-order',
    handler: handleCreateRazorpayOrder,
  },
  {
    method: 'POST',
    path: '/api/restaurant/checkout/razorpay/create-order',
    handler: handleCreateRazorpayOrder,
  },
  {
    method: 'POST',
    path: '/api/restaurant/checkout/razorpay/order',
    handler: handleCreateRazorpayOrder,
  },
  {
    method: 'POST',
    path: '/api/restaurant/checkout/razorpay/webhook',
    handler: handleRazorpayWebhook,
  },
];
