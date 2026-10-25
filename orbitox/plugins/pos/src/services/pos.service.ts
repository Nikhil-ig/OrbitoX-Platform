/**
 * 🍷 Authoritative PosService - Reusable POS, KDS, Quote & Order Lifecycle Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Encapsulates:
 * - Deterministic SHA-256 hash-locked pricing quotes (GST basis-point calculation)
 * - Durable Idempotency with replay and payload conflict detection
 * - Zero-trust order lifecycle and Kitchen Preparation DAG task dispatch
 * - Dining session management and QR discovery (SCAN ≠ JOIN)
 * - Station-level KDS task bumping with expo arrival synchronization
 */

import * as crypto from 'crypto';
import {
  PosRepository,
  PosOrderRecord,
  PosKitchenTask,
  PosMenuItem,
  PosTable,
  PosSession,
} from '../domain/pos-repository';

export interface PosServiceClock {
  now(): Date;
}

export interface QuoteRequestInput {
  items: Array<{
    id?: string;
    itemId?: string;
    quantity?: number;
    selectedModifierIds?: string[];
    modifierPriceDeltaMinor?: number;
    [key: string]: any;
  }>;
  taxBasisPoints?: number;
  currency?: string;
}

export interface QuoteResponseData {
  quoteId: string;
  subtotalMinor: string;
  taxMinor: string;
  totalMinor: string;
  currency: string;
  breakdown: {
    subtotalFormatted: string;
    taxFormatted: string;
    totalFormatted: string;
  };
  inputHash: string;
  resultHash: string;
}

export interface SubmitOrderInput {
  body: {
    orderId?: string;
    tableNumber?: string;
    tableId?: string | number;
    sessionId?: string;
    guestName?: string;
    phone?: string;
    fulfillmentMethod?: string;
    restaurantId?: string;
    items?: Array<{
      id?: string;
      itemId?: string;
      quantity?: number;
      selectedModifierIds?: string[];
      modifierPriceDeltaMinor?: number;
      guestName?: string;
      seatLabel?: string;
      [key: string]: any;
    }>;
    cartItems?: any[];
    [key: string]: any;
  };
  identity?: {
    type?: string;
    tableNumber?: string;
    [key: string]: any;
  };
  idempotencyKey?: string;
  branchId?: string;
  branchName?: string;
}

export interface PosOperationResult {
  status: number;
  body: any;
}

export class PosService {
  constructor(
    public readonly repository: PosRepository,
    public readonly clock: PosServiceClock = { now: () => new Date() }
  ) {}

  /**
   * 1. Calculate Deterministic Pricing Quote
   */
  async calculateQuote(input: QuoteRequestInput): Promise<QuoteResponseData> {
    const rawItems = input.items || [];
    let subtotalMinor = 0;
    const menuItems = await this.repository.getMenuItems();

    for (const item of rawItems) {
      const found = menuItems.find((m) => m.id === (item.id || item.itemId));
      let unitPrice = found ? found.basePriceMinor : 35000;

      if (item.selectedModifierIds && Array.isArray(item.selectedModifierIds) && found?.modifierGroups) {
        for (const modId of item.selectedModifierIds) {
          for (const grp of found.modifierGroups) {
            const opt = grp.options.find((o) => o.id === modId);
            if (opt) {
              unitPrice += opt.priceDeltaMinor;
            }
          }
        }
      } else if (item.modifierPriceDeltaMinor) {
        unitPrice += Number(item.modifierPriceDeltaMinor);
      }

      const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;
      subtotalMinor += unitPrice * qty;
    }

    const taxBasisPoints = input.taxBasisPoints ?? 500; // 5% GST
    const taxMinor = Math.round((subtotalMinor * taxBasisPoints) / 10000);
    const totalMinor = subtotalMinor + taxMinor;
    const currency = input.currency || 'INR';

    const inputHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ items: rawItems, taxBasisPoints }))
      .digest('hex');

    const resultHash = crypto
      .createHash('sha256')
      .update(`${subtotalMinor}:${taxMinor}:${totalMinor}`)
      .digest('hex');

    return {
      quoteId: `quote_${this.clock.now().getTime()}`,
      subtotalMinor: subtotalMinor.toString(),
      taxMinor: taxMinor.toString(),
      totalMinor: totalMinor.toString(),
      currency,
      breakdown: {
        subtotalFormatted: `₹${(subtotalMinor / 100).toFixed(2)}`,
        taxFormatted: `₹${(taxMinor / 100).toFixed(2)}`,
        totalFormatted: `₹${(totalMinor / 100).toFixed(2)}`,
      },
      inputHash,
      resultHash,
    };
  }

  /**
   * 2. Idempotent Order Submission
   */
  async submitOrder(input: SubmitOrderInput): Promise<PosOperationResult> {
    const { body, identity } = input;

    // A. Verify Caller Identity
    if (identity) {
      if (identity.type === 'INVALID_CREDENTIAL') {
        return {
          status: 401,
          body: {
            error: 'INVALID_CREDENTIAL',
            code: 'INVALID_CREDENTIAL',
            message: 'Supplied authorization token is invalid or tampered.',
          },
        };
      }
      if (identity.type === 'REVOKED_CAPABILITY') {
        return {
          status: 401,
          body: {
            error: 'CAPABILITY_REVOKED',
            code: 'CAPABILITY_REVOKED',
            message: 'Guest capability token has expired or session is closed. Please scan QR to join a new session.',
          },
        };
      }
      if (process.env.NODE_ENV === 'production' && identity.type === 'ANONYMOUS') {
        return {
          status: 401,
          body: {
            error: 'CAPABILITY_REQUIRED',
            code: 'CAPABILITY_REQUIRED',
            message: 'A valid diner capability token or staff credential is required to place an order.',
          },
        };
      }
    }

    // B. Check Durable Idempotency
    const idempotencyKey = input.idempotencyKey || (body as any).idempotencyKey || `idem_${this.clock.now().getTime()}`;
    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');

    const cached = await this.repository.getIdempotencyRecord(idempotencyKey);
    if (cached) {
      if (cached.payloadHash && cached.payloadHash !== payloadHash) {
        return {
          status: 409,
          body: {
            error: 'IDEMPOTENCY_CONFLICT',
            code: 'IDEMPOTENCY_CONFLICT',
            message: 'An order was already processed with this idempotency key using different order contents.',
          },
        };
      }
      return {
        status: 200,
        body: cached.response || cached,
      };
    }

    // C. Validate Order Items
    const items = body.items || body.cartItems || [];
    if (!Array.isArray(items) || items.length === 0) {
      return {
        status: 400,
        body: {
          error: 'EMPTY_ORDER',
          code: 'EMPTY_ORDER',
          message: 'Order must contain at least one valid item.',
        },
      };
    }

    const menuItems = await this.repository.getMenuItems();
    for (const it of items) {
      const q = it.quantity !== undefined ? it.quantity : 1;
      if (!Number.isInteger(q) || q < 1 || q > 50) {
        return {
          status: 400,
          body: {
            error: 'INVALID_QUANTITY',
            code: 'INVALID_QUANTITY',
            message: `Item quantity must be an integer between 1 and 50. Received: ${q}`,
          },
        };
      }
      const found = menuItems.find((m) => m.id === (it.id || it.itemId));
      if (!found) {
        return {
          status: 400,
          body: {
            error: 'INVALID_MENU_ITEM',
            code: 'INVALID_MENU_ITEM',
            message: `Item ${it.id || it.itemId} is not in the menu catalog.`,
          },
        };
      }
    }

    // D. Validate Physical Table
    if (!body.tableNumber && !body.tableId) {
      return {
        status: 400,
        body: {
          error: 'TABLE_REQUIRED',
          code: 'TABLE_REQUIRED',
          message: 'tableNumber is required to place an order.',
        },
      };
    }

    const targetTableRecord = body.tableNumber
      ? await this.repository.getTableByNumber(body.tableNumber)
      : await this.repository.getTable(body.tableId!);

    if (!targetTableRecord) {
      return {
        status: 404,
        body: {
          error: 'TABLE_NOT_FOUND',
          code: 'TABLE_NOT_FOUND',
          message: `Table ${body.tableNumber || body.tableId} does not exist in this restaurant.`,
        },
      };
    }

    const tableNumber = targetTableRecord.number;

    // E. Verify Diner Capability Table Binding
    if (identity?.type === 'DINER') {
      const normIdTable = (identity.tableNumber || '').replace(/^T-/, '');
      const normOrderTable = (tableNumber || '').replace(/^T-/, '');
      if (identity.tableNumber && normIdTable !== normOrderTable) {
        return {
          status: 403,
          body: {
            error: 'TABLE_CAPABILITY_MISMATCH',
            code: 'TABLE_CAPABILITY_MISMATCH',
            message: `Your guest capability is bound to Table ${identity.tableNumber}, but order was submitted for Table ${tableNumber}.`,
          },
        };
      }
    }

    // F. Construct Order and Pricing Line Items
    const orderId = (body.orderId && typeof body.orderId === 'string') ? body.orderId : `ord_mkt_${crypto.randomBytes(4).toString('hex')}`;
    const orderToken = `ordtok_${crypto.randomBytes(24).toString('hex')}`;

    let subtotalMinor = 0;
    const orderLineItems: PosOrderRecord['items'] = [];
    const kitchenTasksToCreate: PosKitchenTask[] = [];

    const nowIso = this.clock.now().toISOString();
    const targetServeAt = new Date(this.clock.now().getTime() + 25 * 60 * 1000).toISOString();

    for (const it of items) {
      const found = menuItems.find((m) => m.id === (it.id || it.itemId))!;
      let unitPrice = found.basePriceMinor;
      const modNames: string[] = [];

      if (it.selectedModifierIds && Array.isArray(it.selectedModifierIds) && found.modifierGroups) {
        for (const modId of it.selectedModifierIds) {
          for (const grp of found.modifierGroups) {
            const opt = grp.options.find((o) => o.id === modId);
            if (opt) {
              unitPrice += opt.priceDeltaMinor;
              modNames.push(opt.name);
            }
          }
        }
      } else if (it.modifierPriceDeltaMinor) {
        unitPrice += Number(it.modifierPriceDeltaMinor);
      }

      const qty = it.quantity || 1;
      subtotalMinor += unitPrice * qty;

      const station = (found.station || 'EXPO').toUpperCase();

      orderLineItems.push({
        id: found.id,
        name: found.name,
        quantity: qty,
        unitPriceMinor: unitPrice,
        station,
        guestName: it.guestName || body.guestName,
        seatLabel: it.seatLabel,
        modifiers: modNames,
      });

      // Synchronized Kitchen Preparation DAG task
      const prepMinutes = found.prepDurationMinutes || 15;
      const fireAt = new Date(this.clock.now().getTime() + Math.max(0, 25 - prepMinutes) * 60 * 1000).toISOString();

      kitchenTasksToCreate.push({
        id: `task_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        orderId,
        tableNumber,
        branchId: targetTableRecord.branchId || input.branchId,
        guestName: it.guestName || body.guestName || 'Guest',
        itemName: found.name,
        quantity: qty,
        station,
        status: 'QUEUED',
        fireAt,
        targetServeAt,
        elapsedMinutes: 0,
        slaMinutes: prepMinutes,
        modifiers: modNames,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }

    const taxBasisPoints = 500; // 5% GST
    const taxMinor = Math.round((subtotalMinor * taxBasisPoints) / 10000);
    const totalMinor = subtotalMinor + taxMinor;

    const newOrder: PosOrderRecord = {
      orderId,
      id: orderId,
      orderToken,
      tableNumber,
      sessionId: body.sessionId || (targetTableRecord as any).activeSessionId || `sess_${tableNumber}`,
      branchId: targetTableRecord.branchId || input.branchId,
      guestName: body.guestName || 'Guest',
      status: 'CONFIRMED',
      items: orderLineItems,
      subtotalMinor,
      taxMinor,
      totalMinor,
      currency: 'INR',
      idempotencyKey,
      customer: {
        name: body.guestName || 'Patron',
        phone: body.phone || '+91 98765 43210',
        address: 'Pick-up Counter',
      },
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // G. Persist to Authoritative Repository
    await this.repository.addOrder(newOrder);
    for (const task of kitchenTasksToCreate) {
      await this.repository.addKitchenTask(task);
    }

    // H. Build Public Response Payload
    const responsePayload = {
      success: true,
      orderId: newOrder.orderId,
      orderToken: newOrder.orderToken,
      status: newOrder.status,
      statusLabel: 'Order Confirmed & Sent to Kitchen',
      branchId: newOrder.branchId || input.branchId || 'branch_main',
      branchName: input.branchName || 'Main Branch',
      fulfillmentMethod: body.fulfillmentMethod || 'pickup',
      restaurantId: body.restaurantId || 'restaurant_main',
      quote: {
        subtotalMinor: newOrder.subtotalMinor,
        taxMinor: newOrder.taxMinor,
        deliveryFeeMinor: 0,
        totalMinor: newOrder.totalMinor,
        currency: newOrder.currency,
        formattedTotal: `₹${(newOrder.totalMinor / 100).toFixed(2)}`,
      },
      items: newOrder.items.map((i) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        priceMinor: i.unitPriceMinor,
        station: i.station,
      })),
      customer: newOrder.customer,
      createdAt: newOrder.createdAt,
    };

    // I. Save Idempotency Cache Record
    await this.repository.saveIdempotencyRecord(idempotencyKey, {
      key: idempotencyKey,
      payloadHash,
      response: responsePayload,
      createdAt: nowIso,
    });

    // J. Broadcast Realtime Domain Event
    if (typeof this.repository.broadcast === 'function') {
      this.repository.broadcast({
        type: 'ORDER_PLACED',
        orderId: newOrder.orderId,
        tableNumber: newOrder.tableNumber,
        status: newOrder.status,
        totalMinor: newOrder.totalMinor,
      });
    }

    return {
      status: 201,
      body: responsePayload,
    };
  }

  /**
   * 3. Retrieve Single Order
   */
  async getOrder(orderId: string): Promise<PosOrderRecord | undefined> {
    return this.repository.getOrder(orderId);
  }

  /**
   * 4. Retrieve Order by Token
   */
  async getOrderByToken(orderToken: string): Promise<PosOrderRecord | undefined> {
    return this.repository.getOrderByOrderToken(orderToken);
  }

  /**
   * 5. List Orders
   */
  async listOrders(filters: {
    tableNumber?: string;
    sessionId?: string;
    branchId?: string;
    status?: string;
  }): Promise<PosOrderRecord[]> {
    return this.repository.getOrders(filters.tableNumber, filters.sessionId, filters.branchId, filters.status);
  }

  /**
   * 6. Cancel Order
   */
  async cancelOrder(
    orderId: string,
    reason = 'Guest request',
    authorizedBy = 'Staff'
  ): Promise<PosOperationResult> {
    const existing = await this.repository.getOrder(orderId);
    if (!existing) {
      return {
        status: 404,
        body: { error: 'NOT_FOUND', message: `Order ${orderId} does not exist.` },
      };
    }

    if (existing.status === 'PAID' || existing.status === 'CANCELLED') {
      return {
        status: 400,
        body: { error: 'INVALID_STATE', message: `Cannot cancel order in state ${existing.status}` },
      };
    }

    await this.repository.updateOrderStatus(orderId, 'CANCELLED', { reason, authorizedBy });

    if (typeof this.repository.broadcast === 'function') {
      this.repository.broadcast({
        type: 'ORDER_STATUS_CHANGED',
        orderId,
        status: 'CANCELLED',
        reason,
      });
    }

    return {
      status: 200,
      body: { success: true, orderId, status: 'CANCELLED' },
    };
  }

  /**
   * 7. Kitchen Display System - List Tasks
   */
  async listKitchenTasks(filters: {
    status?: string;
    station?: string;
    branchId?: string;
  }): Promise<PosKitchenTask[]> {
    const tasks = await this.repository.getKitchenTasks(filters.station, filters.branchId);
    if (filters.status) {
      return tasks.filter((t: any) => t.status === filters.status);
    }
    return tasks;
  }

  /**
   * 8. Kitchen Display System - Bump Task
   */
  async bumpKitchenTask(taskId: string, fulfilledCount?: number): Promise<PosOperationResult> {
    const allTasks = await this.repository.getKitchenTasks();
    const task = allTasks.find((t) => t.id === taskId);
    if (!task) {
      return {
        status: 404,
        body: { error: 'TASK_NOT_FOUND', message: `Kitchen task ${taskId} not found.` },
      };
    }

    const statusCycle: Record<string, string> = {
      QUEUED: 'IN_PROGRESS',
      IN_PROGRESS: 'READY',
      READY: 'BUMPED',
    };

    const nextStatus = statusCycle[task.status] || 'BUMPED';
    await this.repository.updateKitchenTaskStatus(taskId, nextStatus, fulfilledCount);

    if (typeof this.repository.broadcast === 'function') {
      this.repository.broadcast({
        type: 'KDS_TASK_BUMPED',
        taskId,
        orderId: task.orderId,
        station: task.station,
        status: nextStatus,
      });
    }

    return {
      status: 200,
      body: {
        success: true,
        task: {
          ...task,
          status: nextStatus,
        },
      },
    };
  }

  /**
   * 9. Dining Sessions - Create or Join Session
   */
  async createOrJoinSession(params: {
    tableNumber: string;
    hostName: string;
    branchId?: string;
    floorId?: string;
    capabilityToken?: string;
  }): Promise<PosSession> {
    return this.repository.createOrJoinSession(
      params.tableNumber,
      params.hostName,
      params.branchId,
      params.floorId,
      params.capabilityToken
    );
  }

  /**
   * 10. Dining Sessions - Close Session
   */
  async closeSession(params: {
    tableNumber: string;
    settlement?: any;
    force?: boolean;
    options?: any;
  }): Promise<any> {
    return this.repository.closeSession(params.tableNumber, params.settlement, params.force, params.options);
  }
}
