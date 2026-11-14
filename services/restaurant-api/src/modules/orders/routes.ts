import * as crypto from 'crypto';
import { RouteDefinition } from '../../http/routes';
import {
  sendJson,
  postgresStore,
  ownerSelfService,
  runtimeController,
  checkTestKillPoint,
  eventBus,
} from '../../http/context';
import { processCommerceOrder, processCommerceGroceryOrder } from './service';

export const ordersRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/api/restaurant/orders',
    handler: async (_req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL') {
        sendJson(res, 401, { error: 'INVALID_CREDENTIAL', code: 'INVALID_CREDENTIAL' });
        return;
      }
      if (identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: 'CAPABILITY_REVOKED', code: 'CAPABILITY_REVOKED' });
        return;
      }

      const tableFilter = context.parsedUrl.query.tableNumber as string;
      const sessionFilter = context.parsedUrl.query.sessionId as string;
      const orderIdFilter = context.parsedUrl.query.orderId as string;
      const branchFilter = (context.parsedUrl.query.branchId as string) || (identity.isPrivileged ? undefined : identity.branchId);
      const statusFilter = (context.parsedUrl.query.status as string) || 'ALL';
      const searchQuery = ((context.parsedUrl.query.search || context.parsedUrl.query.q || '') as string).toLowerCase().trim();

      let orders = await context.posService.listOrders({
        tableNumber: tableFilter,
        sessionId: sessionFilter,
        branchId: branchFilter,
        status: statusFilter,
      });

      if (identity.type === 'DINER') {
        orders = orders.filter((o) => o.sessionId === identity.sessionId);
      }

      if (orderIdFilter) {
        orders = orders.filter((o) => o.orderId === orderIdFilter);
      }

      if (searchQuery) {
        orders = orders.filter((o) => {
          return (
            o.orderId.toLowerCase().includes(searchQuery) ||
            o.displayId.toLowerCase().includes(searchQuery) ||
            o.tableNumber.toLowerCase().includes(searchQuery) ||
            (o.customer?.name && o.customer.name.toLowerCase().includes(searchQuery))
          );
        });
      }

      sendJson(res, 200, { success: true, count: orders.length, data: orders, orders });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/orders',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      const body = await context.parseBody();
      const idempotencyKey =
        (req.headers['x-idempotency-key'] as string) ||
        (req.headers['idempotency-key'] as string) ||
        body.idempotencyKey;

      checkTestKillPoint(req, 'pre-commit');

      if (idempotencyKey) {
        const payloadHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
        const existing = await context.repo.getIdempotencyRecord(idempotencyKey);
        if (existing && existing.status !== 'PENDING') {
          const storedHash = (existing as any).payloadHash;
          if (storedHash && storedHash !== payloadHash) {
            sendJson(res, 409, {
              error: 'IDEMPOTENCY_CONFLICT',
              code: 'IDEMPOTENCY_CONFLICT',
              message: `Idempotency key ${idempotencyKey} has already been used with different request parameters.`,
            });
            return;
          }
          sendJson(res, 200, existing.response || existing);
          return;
        }

        let isLeader = false;
        const startedAt = Date.now();
        try {
          if (postgresStore?.prisma) {
            await postgresStore.prisma.idempotencyRecord.create({
              data: {
                tenantId: context.tenantContext.tenantId,
                key: idempotencyKey,
                result: { status: 'PENDING', startedAt },
                expiresAt: new Date(Date.now() + 86400 * 1000),
              },
            });
            isLeader = true;
          }
        } catch {
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
            const rec = await context.repo.getIdempotencyRecord(idempotencyKey);
            if (rec && rec.status !== 'PENDING') {
              sendJson(res, 200, rec.response || rec);
              return;
            }
          }
        }
      }

      try {
        const quotaCheck = await ownerSelfService.checkPlanLimits(context.tenantContext.tenantId, 'ORDERS');
        if (!quotaCheck.allowed) {
          sendJson(res, 403, {
            error: 'PLAN_LIMIT_EXCEEDED',
            code: 'PLAN_LIMIT_EXCEEDED',
            message: quotaCheck.error || 'Monthly order limit reached for your subscription plan.',
            quota: quotaCheck,
          });
          return;
        }
        if (quotaCheck.warning) {
          res.setHeader('x-quota-warning', `${quotaCheck.percentage}%`);
        }
      } catch { }

      const posBody = { ...body };
      delete posBody.idempotencyKey;

      const orderResult = await context.posService.submitOrder({
        body: posBody,
        identity,
        idempotencyKey: undefined,
        branchId: body.branchId || context.currentBranch?.id || 'branch_main',
        branchName: context.currentBranch?.name || body.branchName || 'Main Branch',
      });

      if (idempotencyKey) {
        const payloadHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
        if (orderResult.status === 201 || orderResult.status === 200) {
          await context.repo.saveIdempotencyRecord(idempotencyKey, {
            response: orderResult.body,
            status: 'DONE',
            payloadHash,
          });
        } else if (postgresStore?.prisma) {
          await postgresStore.prisma.idempotencyRecord.deleteMany({
            where: { tenantId: context.tenantContext.tenantId, key: idempotencyKey },
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
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/orders/:id',
    handler: async (_req, res, context) => {
      const identity = context.requestIdentity;
      const orderId = context.params.id;
      const order = await context.repo.getOrder(orderId);
      if (!order) {
        sendJson(res, 404, { success: false, error: `Order ${orderId} not found`, code: 'ORDER_NOT_FOUND' });
        return;
      }

      const targetTable = await context.repo.getTableByNumber(order.tableNumber);
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
        return;
      }

      const tasks = (await context.repo.getKitchenTasks()).filter((t: any) => t.orderId === order.orderId);
      sendJson(res, 200, { success: true, data: order, tasks });
    },
  },
  {
    method: 'PATCH',
    path: '/api/restaurant/orders/:id/status',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type });
        return;
      }
      if (identity.type === 'ANONYMOUS' || identity.type === 'DINER') {
        sendJson(res, 403, {
          error: 'FORBIDDEN',
          code: 'FORBIDDEN',
          message: 'Staff credentials required to update order status.',
        });
        return;
      }

      const orderId = context.params.id;
      const order = await context.repo.getOrder(orderId);
      if (!order) {
        sendJson(res, 404, { success: false, error: `Order ${orderId} not found`, code: 'ORDER_NOT_FOUND' });
        return;
      }

      const targetTable = await context.repo.getTableByNumber(order.tableNumber);
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
        return;
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
        return;
      }

      const body = await context.parseBody();
      const newStatus = body.status || body.newStatus;
      const version = typeof body.version === 'number' ? body.version : undefined;

      if (!newStatus) {
        sendJson(res, 400, { success: false, error: 'Target status required', code: 'STATUS_REQUIRED' });
        return;
      }

      try {
        const success = await context.repo.updateOrderStatus(orderId, newStatus, {
          authorizedBy: identity.id,
          reason: body.reason,
          version,
        });
        if (!success) {
          sendJson(res, 400, { success: false, error: 'Failed to update order status', code: 'UPDATE_FAILED' });
          return;
        }

        const updatedOrder = await context.repo.getOrder(orderId);
        eventBus.broadcast({
          id: `evt_${Date.now()}`,
          sequence: (await context.repo.getEvents()).length,
          type: 'order.status_updated',
          timestamp: new Date().toISOString(),
          producer: 'api:order-status',
          branchId: updatedOrder?.branchId || context.currentBranch?.id,
          tenantId: context.tenantContext?.tenantId,
          payload: { orderId, status: newStatus, version: (updatedOrder as any)?.version },
        });

        sendJson(res, 200, { success: true, data: updatedOrder });
      } catch (err: any) {
        if (err.code === 'STATE_CONFLICT' || err.statusCode === 409 || err.message?.includes('STATE_CONFLICT')) {
          sendJson(res, 409, {
            success: false,
            error: 'STATE_CONFLICT',
            code: 'STATE_CONFLICT',
            message: 'Concurrent modification conflict: order was updated by another kitchen screen.',
          });
          return;
        }
        sendJson(res, 500, { success: false, error: 'INTERNAL_ERROR', message: err.message });
      }
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/orders/:id/cancel',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type });
        return;
      }
      if (identity.type === 'ANONYMOUS' || identity.type === 'DINER') {
        sendJson(res, 403, {
          error: 'FORBIDDEN',
          code: 'FORBIDDEN',
          message: 'Staff credentials required to cancel orders. Diner capability tokens cannot cancel placed orders directly.',
        });
        return;
      }

      const orderId = context.params.id;
      const order = await context.repo.getOrder(orderId);
      if (!order) {
        sendJson(res, 404, { success: false, error: `Order ${orderId} not found`, code: 'ORDER_NOT_FOUND' });
        return;
      }

      const targetTable = await context.repo.getTableByNumber(order.tableNumber);
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
        return;
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
        return;
      }

      const body = await context.parseBody();
      const reason = body.reason || body.cancellationReason;

      if (!reason || reason.trim().length < 3) {
        sendJson(res, 400, {
          success: false,
          error: 'A mandatory cancellation reason with at least 3 characters is required.',
          code: 'REASON_REQUIRED',
        });
        return;
      }

      const result = await context.repo.cancelOrder(orderId, reason);
      if (!result.success) {
        const statusCode = result.code === 'ORDER_NOT_FOUND' ? 404 : 400;
        sendJson(res, statusCode, { success: false, error: result.error, code: result.code });
        return;
      }

      sendJson(res, 200, { success: true, message: `Order ${orderId} cancelled`, data: result.order });
      return;

      eventBus.broadcast({
        id: `evt_${Date.now()}`,
        sequence: (await context.repo.getEvents()).length,
        type: 'order.cancelled',
        timestamp: new Date().toISOString(),
        producer: 'api:order-cancel',
        branchId: order.branchId || context.currentBranch?.id,
        tenantId: context.tenantContext?.tenantId,
        payload: { orderId, reason, cancelledBy: identity.id },
      });

      await runtimeController.emitAudit('ORDER_CANCELLED', identity.id, {
        orderId,
        tableNumber: order.tableNumber,
        reason,
        itemCount: order.items?.length,
      });

      sendJson(res, 200, {
        success: true,
        message: `Order ${orderId} cancelled successfully.`,
        data: result.order,
      });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/quote',
    handler: async (req, res, context) => {
      const body = await context.parseBody();
      const data = await context.posService.calculateQuote({
        items: body.items || body.cartItems || [],
        taxBasisPoints: body.taxBasisPoints ?? 500,
        currency: body.currency,
      });
      sendJson(res, 200, { success: true, data });
    },
  },
  {
    method: 'GET',
    path: '/api/commerce/orders/:id',
    handler: async (req, res, context) => {
      const orderId = context.params.id;
      const order = await context.repo.getOrder(orderId);
      const cachedRecord = await context.repo.getIdempotencyRecord(orderId);
      const cached = cachedRecord?.response || cachedRecord;
      if (!order && !cached) {
        sendJson(res, 404, { success: false, error: 'NOT_FOUND', message: `Order ${orderId} not found.` });
        return;
      }

      const authHeader = (req.headers['authorization'] as string) || '';
      const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
      const headerToken = (req.headers['x-order-token'] as string) || bearerToken;
      const queryToken = (context.parsedUrl.query.orderToken as string) || '';
      const reqToken = headerToken || queryToken;

      const identity = context.requestIdentity;
      const isStaff = identity.type === 'STAFF' || identity.type === 'ADMIN' || identity.type === 'STATION';
      const expectedToken = order?.orderToken || cached?.orderToken;

      if (reqToken && expectedToken && reqToken !== expectedToken && !isStaff) {
        sendJson(res, 403, {
          success: false,
          error: 'UNAUTHORIZED_ORDER_ACCESS',
          message: 'The provided order tracking token does not match this order.',
        });
        return;
      }

      const tasks = (await context.repo.getKitchenTasks()).filter((t) => t.orderId === orderId);
      let liveStatus = 'CONFIRMED';
      let statusLabel = 'Order Confirmed & Sent to Kitchen';

      if (order?.status === 'CANCELLED' || cached?.status === 'CANCELLED') {
        liveStatus = 'CANCELLED';
        statusLabel = 'Order Cancelled';
      } else if (order?.status === 'SERVED' || order?.status === 'PAID') {
        liveStatus = 'SERVED';
        statusLabel = 'Completed & Dispatched';
      } else if (tasks.length > 0) {
        if (tasks.every((t) => t.status === 'BUMPED')) {
          liveStatus = 'SERVED';
          statusLabel = 'Completed & Dispatched';
        } else if (tasks.every((t) => t.status === 'READY' || t.status === 'BUMPED')) {
          liveStatus = 'READY';
          statusLabel = 'Ready for Pickup / Out for Delivery';
        } else if (tasks.some((t) => t.status === 'IN_PROGRESS' || t.status === 'READY')) {
          liveStatus = 'IN_PREPARATION';
          statusLabel = 'Preparing Fresh in Kitchen';
        }
      }

      sendJson(res, 200, {
        success: true,
        orderId,
        status: liveStatus,
        statusLabel,
        items: order?.items || cached?.items || [],
        totalMinor: order?.totalMinor || cached?.pricing?.totalMinor || 0,
      });
    },
  },
  {
    method: 'POST',
    path: '/api/commerce/orders/:id/cancel',
    handler: async (req, res, context) => {
      const orderId = context.params.id;
      const order = await context.repo.getOrder(orderId);
      const cachedRecord = await context.repo.getIdempotencyRecord(orderId);
      const cached = cachedRecord?.response || cachedRecord;
      if (!order && !cached) {
        sendJson(res, 404, { success: false, error: 'NOT_FOUND', message: `Order ${orderId} not found.` });
        return;
      }

      const authHeader = (req.headers['authorization'] as string) || '';
      const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
      const headerToken = (req.headers['x-order-token'] as string) || bearerToken;
      const queryToken = (context.parsedUrl.query.orderToken as string) || '';
      const reqToken = headerToken || queryToken;

      const identity = context.requestIdentity;
      const isStaff = identity.type === 'STAFF' || identity.type === 'ADMIN' || identity.type === 'STATION';
      const expectedToken = order?.orderToken || cached?.orderToken;

      const isAuthorized = isStaff || (expectedToken && reqToken === expectedToken);
      if (!isAuthorized) {
        sendJson(res, 403, {
          success: false,
          error: 'FORBIDDEN',
          code: 'FORBIDDEN',
          message: 'Valid order token or staff credentials required to cancel order.',
        });
        return;
      }

      const tasks = (await context.repo.getKitchenTasks()).filter((t: any) => t.orderId === orderId);
      const alreadyStarted = tasks.some((t: any) => t.status === 'IN_PROGRESS' || t.status === 'READY' || t.status === 'BUMPED');
      if (alreadyStarted && !isStaff) {
        sendJson(res, 400, {
          success: false,
          error: 'ORDER_ALREADY_IN_PREPARATION',
          code: 'ORDER_ALREADY_IN_PREPARATION',
          message: 'Order is already being prepared in the kitchen and cannot be cancelled automatically.',
        });
        return;
      }

      const body = await context.parseBody().catch(() => ({}));
      const reason = body.reason || 'Customer requested cancellation';

      if (order) {
        await context.repo.cancelOrder(orderId, reason, isStaff ? identity.id : 'customer');
      }
      if (cached) {
        cached.status = 'CANCELLED';
        cached.statusLabel = 'Order Cancelled';
      }
      for (const t of tasks) {
        if (t.status === 'QUEUED') {
          t.status = 'CANCELLED' as any;
        }
      }

      const orderBranchId = order?.branchId || cached?.branchId || context.currentBranch?.id || 'branch_ldh';
      eventBus.broadcast({
        id: `evt_${Date.now()}`,
        sequence: (await context.repo.getEvents()).length,
        type: 'order.cancelled',
        timestamp: new Date().toISOString(),
        producer: orderId,
        branchId: orderBranchId,
        tenantId: context.tenantContext.tenantId,
        payload: { orderId, reason, status: 'CANCELLED' },
      });

      sendJson(res, 200, {
        success: true,
        message: `Order ${orderId} has been cancelled successfully.`,
        orderId,
        status: 'CANCELLED',
        statusLabel: 'Order Cancelled',
      });
    },
  },
  {
    method: 'POST',
    path: '/api/commerce/orders',
    handler: async (req, res, context) => {
      const body = await context.parseBody();
      await processCommerceOrder(body, req, res, context);
    },
  },
  {
    method: 'POST',
    path: '/api/commerce/grocery/orders',
    handler: async (req, res, context) => {
      const body = await context.parseBody();
      await processCommerceGroceryOrder(body, req, res, context);
    },
  },
];
