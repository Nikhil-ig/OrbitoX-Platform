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

export async function handleDinersRoutes(ctx: TenantRouteContext): Promise<boolean> {
  const {
    req, res, pathname, method, parsedUrl, tenantContext, repo, posService,
    branches, floors, context, currentBranch, currentFloor, serviceShift,
    requestIdentity, activeStaffToken, activeStaffRole,
  } = ctx;
    // 30c. Resolved Branch Menu Commerce Endpoint
    if (pathname === '/api/commerce/menu' && method === 'GET') {
      const branchId = (parsedUrl.query.branch as string) || currentBranch.id;
      const resolvedMenu = await repo.getResolvedMenuForBranch(branchId);
      sendJson(res, 200, { success: true, branchId, count: resolvedMenu.length, data: resolvedMenu });
      return true;
    }

    // 31. Multi-Experience Commerce Marketplace & Quick-Commerce APIs
    if (pathname === '/api/commerce/restaurants' && method === 'GET') {
      res.setHeader('X-API-Deprecation', 'single-brand-migration; use /api/commerce/menu instead');
      const partners = await repo.getRestaurantPartners();
      sendJson(res, 200, { success: true, count: partners.length, data: partners });
      return true;
    }

    if (pathname.startsWith('/api/commerce/restaurants/') && method === 'GET') {
      const partnerId = pathname.replace('/api/commerce/restaurants/', '');
      const partner = await repo.getRestaurantPartnerById(partnerId);
      if (!partner) {
        sendJson(res, 404, { success: false, error: 'NOT_FOUND', message: `Restaurant partner ${partnerId} not found.` });
        return true;
      }
      sendJson(res, 200, { success: true, data: partner });
      return true;
    }

    if ((pathname === '/api/commerce/grocery/skus' || pathname === '/api/commerce/grocery/catalog') && method === 'GET') {
      const categoryFilter = parsedUrl.query.category as string | undefined;
      const skus = await repo.getGrocerySkus(categoryFilter);
      sendJson(res, 200, { success: true, count: skus.length, data: skus });
      return true;
    }

    if (pathname.startsWith('/api/commerce/grocery/skus/') && method === 'GET') {
      const skuId = pathname.replace('/api/commerce/grocery/skus/', '');
      const sku = await repo.getGrocerySkuById(skuId);
      if (!sku) {
        sendJson(res, 404, { success: false, error: 'NOT_FOUND', message: `Grocery SKU ${skuId} not found.` });
        return true;
      }
      sendJson(res, 200, { success: true, data: sku });
      return true;
    }

    // 31b. Order Status Tracking API (High-entropy token validation & PII redaction)
    if (pathname.startsWith('/api/commerce/orders/') && method === 'GET') {
      const orderId = pathname.replace('/api/commerce/orders/', '');
      const order = await repo.getOrder(orderId);
      const cachedRecord = await repo.getIdempotencyRecord(orderId);
      const cached = cachedRecord?.response || cachedRecord;
      if (!order && !cached) {
        sendJson(res, 404, { success: false, error: 'NOT_FOUND', message: `Order ${orderId} not found.` });
        return true;
      }

      const authHeader = (req.headers['authorization'] as string) || '';
      const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
      const headerToken = (req.headers['x-order-token'] as string) || bearerToken;
      const queryToken = (parsedUrl.query.orderToken as string) || '';
      const reqToken = headerToken || queryToken;

      const identity = requestIdentity;
      const isStaff = identity.type === 'STAFF' || identity.type === 'ADMIN' || identity.type === 'STATION';
      const expectedToken = order?.orderToken || cached?.orderToken;

      // If an invalid tracking token is explicitly provided, reject with 403
      if (reqToken && expectedToken && reqToken !== expectedToken && !isStaff) {
        sendJson(res, 403, {
          success: false,
          error: 'UNAUTHORIZED_ORDER_ACCESS',
          message: 'The provided order tracking token does not match this order.',
        });
        return true;
      }

      const tasks = (await repo.getKitchenTasks()).filter((t) => t.orderId === orderId);
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
        } else {
          liveStatus = 'CONFIRMED';
          statusLabel = 'Order Confirmed & Queued in Kitchen';
        }
      }

      const targetOrder = { ...(cached || {}), ...(order || {}) };
      const rawCustomer = cached?.customer || (order as any)?.customer;
      const isAuthorized = isStaff || (expectedToken && reqToken === expectedToken);
      const safeCustomer = isAuthorized && rawCustomer
        ? rawCustomer
        : {
          name: rawCustomer?.name || targetOrder?.guestName || 'Guest Patron',
          phone: rawCustomer?.phone ? rawCustomer.phone.slice(0, 4) + '******' + rawCustomer.phone.slice(-4) : undefined,
          address: rawCustomer?.address ? '[Protected Delivery Address]' : undefined,
          notes: isAuthorized ? rawCustomer?.notes : undefined,
        };

      const orderBranchId = targetOrder.branchId || targetOrder.branch || currentBranch.id;
      const orderBranch = (await repo.getBranch(orderBranchId)) || currentBranch;
      const targetBranchMeta = {
        id: orderBranch.id,
        name: orderBranch.name,
        city: orderBranch.city,
        phone: orderBranch.phone,
      };
      const sanitizedTasks = tasks.map((t) => ({
        id: t.id,
        itemName: t.itemName,
        station: t.station,
        status: t.status,
        quantity: t.quantity,
      }));

      sendJson(res, 200, {
        success: true,
        orderId,
        status: liveStatus,
        statusLabel,
        order: {
          ...targetOrder,
          status: liveStatus,
          branchId: orderBranch.id,
          branchName: orderBranch.name,
          targetBranch: targetBranchMeta,
          customer: safeCustomer,
          customerName: safeCustomer.name,
          customerPhone: safeCustomer.phone,
          deliveryAddress: safeCustomer.address,
          customerNotes: safeCustomer.notes,
        },
        branch: targetBranchMeta,
        targetBranch: targetBranchMeta,
        tasks: sanitizedTasks,
        branchId: orderBranch.id,
        lastUpdatedAt: new Date().toISOString(),
      });
      return true;
    }

    // Commerce Order Cancellation
    if (pathname.startsWith('/api/commerce/orders/') && pathname.endsWith('/cancel') && method === 'POST') {
      const orderId = pathname.replace('/api/commerce/orders/', '').replace('/cancel', '');
      const order = await repo.getOrder(orderId);
      const cachedRecord = await repo.getIdempotencyRecord(orderId);
      const cached = cachedRecord?.response || cachedRecord;
      if (!order && !cached) {
        sendJson(res, 404, { success: false, error: 'NOT_FOUND', message: `Order ${orderId} not found.` });
        return true;
      }

      const authHeader = (req.headers['authorization'] as string) || '';
      const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
      const headerToken = (req.headers['x-order-token'] as string) || bearerToken;
      const queryToken = (parsedUrl.query.orderToken as string) || '';
      const reqToken = headerToken || queryToken;

      const identity = requestIdentity;
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
        return true;
      }

      const tasks = (await repo.getKitchenTasks()).filter((t) => t.orderId === orderId);
      const alreadyStarted = tasks.some((t) => t.status === 'IN_PROGRESS' || t.status === 'READY' || t.status === 'BUMPED');
      if (alreadyStarted && !isStaff) {
        sendJson(res, 400, {
          success: false,
          error: 'ORDER_ALREADY_IN_PREPARATION',
          code: 'ORDER_ALREADY_IN_PREPARATION',
          message: 'Order is already being prepared in the kitchen and cannot be cancelled automatically.',
        });
        return true;
      }

      const body = await parseBody(req);
      const reason = body.reason || 'Customer requested cancellation';

      if (order) {
        await repo.cancelOrder(orderId, reason, isStaff ? identity.id : 'customer');
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

      const orderBranchId = order?.branchId || cached?.branchId || currentBranch.id;
      eventBus.broadcast({
        id: `evt_${Date.now()}`,
        sequence: (await repo.getEvents()).length,
        type: 'order.cancelled',
        timestamp: new Date().toISOString(),
        producer: orderId,
        branchId: orderBranchId,
        tenantId: tenantContext.tenantId,
        payload: { orderId, reason, status: 'CANCELLED' },
      });

      sendJson(res, 200, {
        success: true,
        message: `Order ${orderId} has been cancelled successfully.`,
        orderId,
        status: 'CANCELLED',
        statusLabel: 'Order Cancelled',
      });
      return true;
    }

    if (pathname === '/api/commerce/orders' && method === 'POST') {
      const body = await parseBody(req);
      const idempotencyKey = (req.headers['x-idempotency-key'] as string) || body.idempotencyKey;
      const payloadHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');

      const cached = idempotencyKey ? await repo.getIdempotencyRecord(idempotencyKey) : null;
      if (cached) {
        const replayData = cached?.response || cached;
        const cachedItemIds = new Set((replayData?.items || []).map((i: any) => i.id));
        const incomingItems = Array.isArray(body.items) ? body.items : [];
        const incBranch = body.branchId || currentBranch.id;
        const cachedBranch = replayData?.branchId;
        const branchConflict = Boolean(incBranch && cachedBranch && incBranch !== cachedBranch);

        const incName = String(body.customerName || body.customer?.name || '').trim().toLowerCase();
        const cachedName = String(replayData?.customer?.name || '').trim().toLowerCase();
        const nameConflict = Boolean(incName && cachedName && incName !== cachedName);

        const incPhone = (body.customerPhone || body.customer?.phone || '').replace(/\D/g, '').slice(-10);
        const cachedPhone = (replayData?.customer?.phone || '').replace(/\D/g, '').slice(-10);
        const phoneConflict = Boolean(incPhone && cachedPhone && incPhone !== cachedPhone);

        const itemConflict = incomingItems.length > 0 && incomingItems.some((inItem: any) => !cachedItemIds.has(inItem.id));

        const hasConflict = branchConflict || nameConflict || phoneConflict || itemConflict;

        if (hasConflict) {
          sendJson(res, 409, {
            success: false,
            error: 'IDEMPOTENCY_CONFLICT',
            code: 'IDEMPOTENCY_CONFLICT',
            message: 'An order was already processed with this idempotency key using different order contents or customer identity.',
          });
          return true;
        }
        sendJson(res, 200, { ...replayData, idempotentReplay: true });
        return true;
      }

      // 1. Validate Target Branch
      const targetBranchId = body.branchId || currentBranch.id;
      const targetBranch = await repo.getBranch(targetBranchId);
      if (!targetBranch) {
        sendJson(res, 400, {
          success: false,
          error: 'INVALID_BRANCH',
          code: 'INVALID_BRANCH',
          message: `Branch ${targetBranchId} is not a valid outlet of this restaurant.`,
        });
        return true;
      }

      // 2. Validate Customer Identity (Name, Validated Phone, Delivery Address)
      const rawCustomerName = String(body.customerName || body.customer?.name || '').trim();
      if (!rawCustomerName || rawCustomerName.length < 2 || rawCustomerName.length > 80 || /<[^>]*>/.test(rawCustomerName)) {
        sendJson(res, 400, {
          success: false,
          error: 'INVALID_CUSTOMER_NAME',
          code: 'INVALID_CUSTOMER_NAME',
          message: 'A valid customer name between 2 and 80 characters is required (no HTML tags).',
        });
        return true;
      }

      const rawCustomerPhone = String(body.customerPhone || body.customer?.phone || '').trim();
      const cleanedPhone = rawCustomerPhone.replace(/[\s\-\(\)\.]/g, '');
      const phoneMatch = cleanedPhone.match(/^(?:\+?91|0)?([6-9]\d{9})$/);
      if (!phoneMatch) {
        sendJson(res, 400, {
          success: false,
          error: 'INVALID_PHONE_NUMBER',
          code: 'INVALID_PHONE_NUMBER',
          message: 'A valid 10-digit Indian mobile number starting with 6-9 is required (e.g. +91 98765 43210).',
        });
        return true;
      }
      const formattedPhone = `+91 ${phoneMatch[1].slice(0, 5)} ${phoneMatch[1].slice(5)}`;
      const maskedPhone = `+91 ******${phoneMatch[1].slice(6)}`;

      const fulfillmentMethod = body.fulfillmentMethod === 'pickup' ? 'pickup' : 'delivery';
      const rawAddress = String(body.deliveryAddress || body.customer?.address || '').trim();
      if (fulfillmentMethod === 'delivery' && (!rawAddress || rawAddress.length < 5 || rawAddress.length > 250)) {
        sendJson(res, 400, {
          success: false,
          error: 'INVALID_DELIVERY_ADDRESS',
          code: 'INVALID_DELIVERY_ADDRESS',
          message: 'A valid delivery street address of at least 5 characters is required for delivery orders.',
        });
        return true;
      }
      const deliveryAddress = fulfillmentMethod === 'pickup' ? 'Pick-up Counter' : rawAddress;
      const customerNotes = typeof body.customerNotes === 'string'
        ? body.customerNotes.trim().slice(0, 200)
        : (body.notes ? String(body.notes).trim().slice(0, 200) : '');

      const items = Array.isArray(body.items) ? body.items : [];
      if (items.length === 0) {
        sendJson(res, 400, { success: false, error: 'EMPTY_CART', code: 'EMPTY_CART', message: 'Order must contain at least one item.' });
        return true;
      }

      // 3. Validate Items & Availability against Branch-Resolved Menu
      const resolvedMenu = await repo.getResolvedMenuForBranch(targetBranch.id);
      let subtotalMinor = 0;
      const validatedOrderItems: Array<{
        id: string;
        name: string;
        quantity: number;
        priceMinor: number;
        station: string;
      }> = [];

      for (const item of items) {
        const resolvedItem = resolvedMenu.find((m) => m.id === item.id);
        if (!resolvedItem) {
          sendJson(res, 400, {
            success: false,
            error: 'INVALID_MENU_ITEM',
            code: 'INVALID_MENU_ITEM',
            message: `Menu item '${item.id}' was not found in catalog for branch ${targetBranch.name}.`,
            invalidItemId: item.id,
          });
          return true;
        }
        if (!resolvedItem.isAvailableAtBranch) {
          sendJson(res, 400, {
            success: false,
            error: 'ITEM_UNAVAILABLE_AT_BRANCH',
            code: 'ITEM_UNAVAILABLE_AT_BRANCH',
            message: `${resolvedItem.name} is currently 86'd / unavailable at ${targetBranch.name}.`,
            unavailableItemId: item.id,
          });
          return true;
        }

        const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
        let unitPrice = resolvedItem.effectivePriceMinor;
        if (item.selectedModifierIds && Array.isArray(item.selectedModifierIds) && resolvedItem.modifierGroups) {
          for (const modId of item.selectedModifierIds) {
            for (const grp of resolvedItem.modifierGroups) {
              const opt = grp.options.find((o) => o.id === modId);
              if (opt) {
                unitPrice += opt.priceDeltaMinor;
              }
            }
          }
        }
        subtotalMinor += qty * unitPrice;
        validatedOrderItems.push({
          id: resolvedItem.id,
          name: resolvedItem.name,
          quantity: qty,
          priceMinor: unitPrice,
          station: resolvedItem.station || 'CURRY_LINE',
        });
      }

      // 4. Authoritative Quote Calculation
      const deliveryFeeMinor = fulfillmentMethod === 'pickup' ? 0 : 4000;
      const taxMinor = Math.round(subtotalMinor * 0.05);
      const totalMinor = subtotalMinor + deliveryFeeMinor + taxMinor;
      const orderId = 'ord_mkt_' + crypto.randomUUID().slice(0, 8);
      const orderToken = 'ordtok_' + crypto.randomBytes(24).toString('hex');
      const tableNum = body.tableNumber || (fulfillmentMethod === 'pickup' ? 'Takeaway' : 'Delivery');

      const orderPayload = {
        success: true,
        orderId,
        orderToken,
        status: 'CONFIRMED',
        statusLabel: 'Order Confirmed & Sent to Kitchen',
        branchId: targetBranch.id,
        branchName: targetBranch.name,
        fulfillmentMethod,
        restaurantId: tenantContext.tenantId,
        quote: {
          subtotalMinor,
          taxMinor,
          deliveryFeeMinor,
          totalMinor,
          currency: 'INR',
          formattedTotal: `₹${(totalMinor / 100).toFixed(2)}`,
        },
        items: validatedOrderItems,
        customer: {
          name: rawCustomerName,
          phone: formattedPhone,
          address: deliveryAddress,
          notes: customerNotes || undefined,
        },
        createdAt: new Date().toISOString(),
      };

      if (idempotencyKey) {
        await repo.saveIdempotencyRecord(idempotencyKey, { payloadHash, response: orderPayload });
      }
      await repo.saveIdempotencyRecord(orderId, { payloadHash, response: orderPayload });

      // 5. Create and Persist Restaurant Order in Domain Store with Correct Branch Scoping
      const restaurantOrder: RestaurantOrder = {
        orderId,
        branchId: targetBranch.id,
        tableNumber: tableNum,
        sessionId: body.sessionId || `sess_${orderId}`,
        guestName: rawCustomerName,
        status: 'CONFIRMED',
        orderToken,
        items: validatedOrderItems.map((it) => ({
          id: it.id,
          name: it.name,
          quantity: it.quantity,
          unitPriceMinor: it.priceMinor,
          station: it.station,
        })),
        subtotalMinor,
        taxMinor,
        totalMinor,
        currency: 'INR',
        customer: orderPayload.customer,
        createdAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      };
      await repo.addOrder(restaurantOrder);

      // 6. Spawn Kitchen Tasks for each item routed to target branch KDS stations
      for (const it of restaurantOrder.items) {
        const resolvedItem = resolvedMenu.find((m) => m.id === it.id);
        const task: KitchenTask = {
          id: 'task_' + crypto.randomUUID().slice(0, 8),
          orderId,
          tableNumber: tableNum,
          branchId: targetBranch.id,
          guestName: restaurantOrder.guestName,
          itemName: it.name,
          quantity: it.quantity,
          station: (resolvedItem?.station as any) || 'CURRY_LINE',
          status: 'QUEUED',
          fireAt: new Date().toISOString(),
          targetServeAt: new Date(Date.now() + 20 * 60000).toISOString(),
          elapsedMinutes: 0,
          slaMinutes: resolvedItem?.prepDurationMinutes || 18,
          modifiers: [],
        };
        await repo.addKitchenTask(task);
        eventBus.broadcast({
          id: `evt_${Date.now()}`,
          sequence: (await repo.getEvents()).length,
          type: 'task.created',
          timestamp: new Date().toISOString(),
          producer: orderId,
          branchId: targetBranch.id,
          tableNumber: tableNum,
          tenantId: tenantContext.tenantId,
          payload: { orderId, task },
        });
      }

      await repo.appendEvent(
        'COMMERCE_ORDER_CREATED',
        orderId,
        targetBranch.id,
        orderPayload
      );
      eventBus.broadcast({
        id: `evt_${Date.now()}`,
        sequence: (await repo.getEvents()).length,
        type: 'order.created',
        timestamp: new Date().toISOString(),
        producer: orderId,
        branchId: targetBranch.id,
        tenantId: tenantContext.tenantId,
        tableNumber: tableNum,
        payload: orderPayload,
      });

      sendJson(res, 201, orderPayload);
      return true;
    }

    if (pathname === '/api/commerce/grocery/orders' && method === 'POST') {
      const body = await parseBody(req);
      const idempotencyKey = (req.headers['x-idempotency-key'] as string) || body.idempotencyKey;
      const payloadHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');

      const cached = idempotencyKey ? await repo.getIdempotencyRecord(idempotencyKey) : null;
      if (cached) {
        if (cached.payloadHash && cached.payloadHash !== payloadHash) {
          sendJson(res, 409, {
            success: false,
            error: 'IDEMPOTENCY_CONFLICT',
            code: 'IDEMPOTENCY_CONFLICT',
            message: 'A grocery order was already processed with this idempotency key using different contents.',
          });
          return true;
        }
        const replayData = cached.response || cached;
        sendJson(res, 200, { ...replayData, idempotentReplay: true });
        return true;
      }

      const items = Array.isArray(body.items) ? body.items : [];
      if (items.length === 0) {
        sendJson(res, 400, { success: false, error: 'EMPTY_BASKET', message: 'Grocery basket cannot be empty.' });
        return true;
      }

      // 1. Authoritative Inventory Stock Verification
      let subtotalMinor = 0;
      const orderItems: any[] = [];

      for (const item of items) {
        const sku = await repo.getGrocerySkuById(item.skuId);
        if (!sku) {
          sendJson(res, 404, { success: false, error: 'SKU_NOT_FOUND', message: `Product SKU ${item.skuId} was not found in catalog.` });
          return true;
        }
        const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
        const stockAvailable = typeof sku.stockQuantity === 'number' ? sku.stockQuantity : (sku.stockOnHand || 0);
        if (stockAvailable < qty) {
          sendJson(res, 400, {
            success: false,
            error: 'INSUFFICIENT_STOCK',
            message: `${sku.name} only has ${stockAvailable} units available in local dark store inventory. Requested: ${qty}`,
            availableStock: stockAvailable,
            skuId: item.skuId,
          });
          return true;
        }
        subtotalMinor += qty * sku.sellingPriceMinor;
        orderItems.push({
          skuId: sku.id,
          name: sku.name,
          brand: sku.brand,
          packSize: sku.packSize,
          quantity: qty,
          unitPriceMinor: sku.sellingPriceMinor,
          totalPriceMinor: qty * sku.sellingPriceMinor,
        });
      }

      // 2. Authoritative Atomic Stock Transaction (all-or-nothing rollback guard)
      const stockTx = await repo.transactGroceryStock(orderItems.map((it) => ({ skuId: it.skuId, quantity: it.quantity })));
      if (!stockTx.success) {
        sendJson(res, 400, {
          success: false,
          error: 'INSUFFICIENT_STOCK',
          message: stockTx.error || 'Insufficient stock for requested grocery items.',
          availableStock: stockTx.availableStock,
          skuId: stockTx.insufficientSkuId,
        });
        return true;
      }

      // 3. Server Quote Calculation
      const deliveryFeeMinor = subtotalMinor >= 29900 ? 0 : 2500;
      const packagingMinor = 1000;
      const taxMinor = Math.round(subtotalMinor * 0.05);
      const totalMinor = subtotalMinor + deliveryFeeMinor + packagingMinor + taxMinor;
      const orderId = 'ord_gro_' + crypto.randomUUID().slice(0, 8);

      const groceryOrderPayload = {
        success: true,
        orderId,
        status: 'packed',
        estimatedDeliveryMinutes: 15,
        substitutionPreference: body.substitutionPreference || 'ask_customer',
        quote: {
          subtotalMinor,
          taxMinor,
          deliveryFeeMinor,
          packagingMinor,
          totalMinor,
          currency: 'INR',
          formattedTotal: `₹${(totalMinor / 100).toFixed(2)}`,
        },
        items: orderItems,
        dispatchStation: {
          darkStoreId: 'ds_central_ludhiana',
          pincode: body.pincode || '141001',
          dispatchedAt: new Date().toISOString(),
        },
        customer: {
          phone: body.customerPhone || '+91 98765 43210',
          address: body.deliveryAddress || 'Sector 32, Urban Estate, Ludhiana',
        },
        createdAt: new Date().toISOString(),
      };

      if (idempotencyKey) {
        await repo.saveIdempotencyRecord(idempotencyKey, { payloadHash, response: groceryOrderPayload });
      }

      await repo.appendEvent(
        'GROCERY_ORDER_PLACED',
        orderId,
        currentBranch.id,
        groceryOrderPayload
      );

      sendJson(res, 201, groceryOrderPayload);
      return true;
    }

    // ==========================================
  return false;
}
