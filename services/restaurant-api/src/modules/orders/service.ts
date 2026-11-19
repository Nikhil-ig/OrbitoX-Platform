import * as crypto from 'crypto';
import { RequestContext } from '../../http/context';
import { RestaurantOrder } from '../../shared';

export async function processCommerceOrder(body: any, req: any, res: any, context: RequestContext): Promise<void> {
  const repo = context.repo;
  const currentBranch = context.currentBranch || { id: 'branch_ldh' };
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

    if (branchConflict || nameConflict || phoneConflict || itemConflict) {
      context.sendJson(409, {
        success: false,
        error: 'IDEMPOTENCY_CONFLICT',
        code: 'IDEMPOTENCY_CONFLICT',
        message: 'An order was already processed with this idempotency key using different order contents or customer identity.',
      });
      return;
    }
    context.sendJson(200, { ...replayData, idempotentReplay: true });
    return;
  }

  const targetBranchId = body.branchId || currentBranch.id;
  const targetBranch = await repo.getBranch(targetBranchId);
  if (!targetBranch) {
    context.sendJson(400, {
      success: false,
      error: 'INVALID_BRANCH',
      code: 'INVALID_BRANCH',
      message: `Branch ${targetBranchId} is not a valid outlet of this restaurant.`,
    });
    return;
  }

  const rawCustomerName = String(body.customerName || body.customer?.name || '').trim();
  if (!rawCustomerName || rawCustomerName.length < 2 || rawCustomerName.length > 80 || /<[^>]*>/.test(rawCustomerName)) {
    context.sendJson(400, {
      success: false,
      error: 'INVALID_CUSTOMER_NAME',
      code: 'INVALID_CUSTOMER_NAME',
      message: 'A valid customer name between 2 and 80 characters is required (no HTML tags).',
    });
    return;
  }

  const rawCustomerPhone = String(body.customerPhone || body.customer?.phone || '').trim();
  const cleanedPhone = rawCustomerPhone.replace(/[\s\-\(\)\.]/g, '');
  const phoneMatch = cleanedPhone.match(/^(?:\+?91|0)?([6-9]\d{9})$/);
  if (!phoneMatch) {
    context.sendJson(400, {
      success: false,
      error: 'INVALID_PHONE_NUMBER',
      code: 'INVALID_PHONE_NUMBER',
      message: 'A valid 10-digit Indian mobile number starting with 6-9 is required (e.g. +91 98765 43210).',
    });
    return;
  }
  const formattedPhone = `+91 ${phoneMatch[1].slice(0, 5)} ${phoneMatch[1].slice(5)}`;
  const maskedPhone = `+91 ******${phoneMatch[1].slice(6)}`;

  const fulfillmentMethod = body.fulfillmentMethod === 'pickup' ? 'pickup' : 'delivery';
  const rawAddress = String(body.deliveryAddress || body.customer?.address || '').trim();
  if (fulfillmentMethod === 'delivery' && (!rawAddress || rawAddress.length < 5 || rawAddress.length > 250)) {
    context.sendJson(400, {
      success: false,
      error: 'INVALID_DELIVERY_ADDRESS',
      code: 'INVALID_DELIVERY_ADDRESS',
      message: 'A valid delivery street address of at least 5 characters is required for delivery orders.',
    });
    return;
  }
  const deliveryAddress = fulfillmentMethod === 'pickup' ? 'Pick-up Counter' : rawAddress;
  const customerNotes = typeof body.customerNotes === 'string'
    ? body.customerNotes.trim().slice(0, 200)
    : (body.notes ? String(body.notes).trim().slice(0, 200) : '');

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    context.sendJson(400, { success: false, error: 'EMPTY_CART', code: 'EMPTY_CART', message: 'Order must contain at least one item.' });
    return;
  }

  const resolvedMenu = await repo.getResolvedMenuForBranch(targetBranchId);
  const menuMap = new Map(resolvedMenu.map((m) => [m.id, m]));

  let subtotalMinor = 0;
  const orderItems: any[] = [];

  for (const item of items) {
    const menuItem = menuMap.get(item.id || item.itemId);
    if (!menuItem) {
      context.sendJson(400, {
        success: false,
        error: 'INVALID_MENU_ITEM',
        code: 'INVALID_MENU_ITEM',
        message: `Item ${item.id || item.itemId} is not available at branch ${targetBranch.name}.`,
      });
      return;
    }
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    const itemPrice = (menuItem as any).effectivePriceMinor ?? (menuItem as any).basePriceMinor ?? 0;
    const itemSubtotal = qty * itemPrice;
    subtotalMinor += itemSubtotal;
    orderItems.push({
      id: menuItem.id,
      name: menuItem.name,
      category: menuItem.category,
      unitPriceMinor: itemPrice,
      priceMinor: itemPrice,
      quantity: qty,
      subtotalMinor: itemSubtotal,
      station: (menuItem as any).station || 'MAIN_KITCHEN',
    });
  }

  const taxMinor = Math.round(subtotalMinor * 0.05);
  const deliveryFeeMinor = fulfillmentMethod === 'delivery' ? 4000 : 0;
  const platformFeeMinor = 1000;
  const totalMinor = subtotalMinor + taxMinor + deliveryFeeMinor + platformFeeMinor;

  const orderId = `ord_com_${crypto.randomBytes(6).toString('hex')}`;
  const displayId = `#CRAVE-${orderId.slice(-4).toUpperCase()}`;
  const orderToken = `ordtok_${crypto.randomBytes(16).toString('hex')}`;

  const newOrder: RestaurantOrder = {
    orderId,
    sessionId: body.sessionId || `sess_${orderId}`,
    orderToken,
    tableNumber: 'ONLINE',
    branchId: targetBranchId,
    items: orderItems,
    subtotalMinor,
    taxMinor,
    totalMinor,
    status: 'CONFIRMED',
    createdAt: new Date().toISOString(),
    customer: {
      name: rawCustomerName,
      phone: maskedPhone,
      address: deliveryAddress,
    },
    currency: 'INR',
  };

  await repo.addOrder(newOrder);

  const responsePayload = {
    success: true,
    orderId,
    displayId,
    orderToken,
    status: 'CONFIRMED',
    branchId: targetBranchId,
    branchName: targetBranch.name,
    customer: {
      name: rawCustomerName,
      phone: maskedPhone,
      deliveryAddress,
      fulfillmentMethod,
    },
    items: orderItems,
    pricing: {
      subtotalMinor,
      taxMinor,
      deliveryFeeMinor,
      platformFeeMinor,
      totalMinor,
      formattedTotal: `₹${(totalMinor / 100).toFixed(2)}`,
    },
    trackingUrl: `/operations/orders/${orderId}?token=${orderToken}`,
  };

  if (idempotencyKey) {
    await repo.saveIdempotencyRecord(idempotencyKey, { payloadHash, response: responsePayload });
  }

  context.sendJson(201, responsePayload);
}

export async function processCommerceGroceryOrder(body: any, req: any, res: any, context: RequestContext): Promise<void> {
  const repo = context.repo;
  const idempotencyKey = (req.headers['x-idempotency-key'] as string) || body.idempotencyKey;
  const payloadHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');

  const cached = idempotencyKey ? await repo.getIdempotencyRecord(idempotencyKey) : null;
  if (cached) {
    if (cached.payloadHash && cached.payloadHash !== payloadHash) {
      context.sendJson(409, {
        success: false,
        error: 'IDEMPOTENCY_CONFLICT',
        code: 'IDEMPOTENCY_CONFLICT',
        message: 'A grocery order was already processed with this idempotency key using different contents.',
      });
      return;
    }
    const replayData = cached.response || cached;
    context.sendJson(200, { ...replayData, idempotentReplay: true });
    return;
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    context.sendJson(400, { success: false, error: 'EMPTY_BASKET', message: 'Grocery basket cannot be empty.' });
    return;
  }

  let subtotalMinor = 0;
  const orderItems: any[] = [];

  for (const item of items) {
    const sku = await repo.getGrocerySkuById(item.skuId);
    if (!sku) {
      context.sendJson(404, { success: false, error: 'SKU_NOT_FOUND', message: `Product SKU ${item.skuId} was not found in catalog.` });
      return;
    }
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    const stockAvailable = typeof (sku as any).stockQuantity === 'number' ? (sku as any).stockQuantity : ((sku as any).stockOnHand || 0);
    if (stockAvailable < qty) {
      context.sendJson(400, {
        success: false,
        error: 'INSUFFICIENT_STOCK',
        message: `${sku.name} only has ${stockAvailable} units available in local dark store inventory. Requested: ${qty}`,
        availableStock: stockAvailable,
        skuId: item.skuId,
      });
      return;
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

  const stockTx = await repo.transactGroceryStock(orderItems.map((it) => ({ skuId: it.skuId, quantity: it.quantity })));
  if (!stockTx.success) {
    context.sendJson(400, {
      success: false,
      error: 'INSUFFICIENT_STOCK',
      message: stockTx.error || 'Insufficient stock for requested grocery items.',
      availableStock: stockTx.availableStock,
      skuId: stockTx.insufficientSkuId,
    });
    return;
  }

  const deliveryFeeMinor = subtotalMinor >= 19900 ? 0 : 2500;
  const handlingFeeMinor = 500;
  const totalMinor = subtotalMinor + deliveryFeeMinor + handlingFeeMinor;

  const orderId = `ord_grc_${crypto.randomBytes(6).toString('hex')}`;
  const orderToken = `ordtok_${crypto.randomBytes(16).toString('hex')}`;

  const responsePayload = {
    success: true,
    orderId,
    orderToken,
    status: 'PACKING',
    items: orderItems,
    pricing: {
      subtotalMinor,
      deliveryFeeMinor,
      handlingFeeMinor,
      totalMinor,
      formattedTotal: `₹${(totalMinor / 100).toFixed(2)}`,
    },
    deliveryEstimate: '10-15 mins',
  };

  if (idempotencyKey) {
    await repo.saveIdempotencyRecord(idempotencyKey, { payloadHash, response: responsePayload });
  }

  context.sendJson(201, responsePayload);
}
