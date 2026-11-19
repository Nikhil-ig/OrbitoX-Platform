import { PosService } from './pos.service';
import {
  PosRepository,
  PosMenuItem,
  PosTable,
  PosSession,
  PosOrderRecord,
  PosKitchenTask,
  PosIdempotencyRecord,
} from '../domain/pos-repository';

class MockPosRepository implements PosRepository {
  public menuItems: PosMenuItem[] = [
    {
      id: 'item_butter_chicken',
      name: 'Murgh Makhani (Butter Chicken)',
      basePriceMinor: 45000,
      formattedPrice: '₹450.00',
      category: 'Mains',
      station: 'CURRY_LINE',
      prepDurationMinutes: 15,
      modifierGroups: [
        {
          id: 'grp_spice',
          name: 'Spice Level',
          options: [
            { id: 'opt_mild', name: 'Mild', priceDeltaMinor: 0 },
            { id: 'opt_spicy', name: 'Extra Spicy', priceDeltaMinor: 2000 },
          ],
        },
      ],
    },
    {
      id: 'item_garlic_naan',
      name: 'Garlic Butter Naan',
      basePriceMinor: 12000,
      formattedPrice: '₹120.00',
      category: 'Breads',
      station: 'TANDOOR',
      prepDurationMinutes: 6,
    },
  ];

  public tables: PosTable[] = [
    {
      id: 1,
      number: 'T12',
      capacity: 4,
      status: 'AVAILABLE',
      locator: 'loc_t12',
      branchId: 'branch_main',
      floorId: 'floor_1',
    },
  ];

  public orders = new Map<string, PosOrderRecord>();
  public kitchenTasks = new Map<string, PosKitchenTask>();
  public idempotencyRecords = new Map<string, PosIdempotencyRecord>();
  public sessions = new Map<string, PosSession>();
  public broadcasts: any[] = [];

  async getMenuItems(): Promise<PosMenuItem[]> {
    return this.menuItems;
  }
  async getMenuItem(id: string): Promise<PosMenuItem | undefined> {
    return this.menuItems.find((m) => m.id === id);
  }

  async getTable(id: string | number): Promise<PosTable | undefined> {
    return this.tables.find((t) => t.id === id || String(t.id) === String(id));
  }
  async getTableByNumber(number: string): Promise<PosTable | undefined> {
    return this.tables.find((t) => t.number === number);
  }
  async getTableByLocator(locator: string): Promise<PosTable | undefined> {
    return this.tables.find((t) => t.locator === locator);
  }

  async getSession(sessionId: string): Promise<PosSession | undefined> {
    return this.sessions.get(sessionId);
  }
  async createOrJoinSession(tableNumber: string, hostName: string): Promise<PosSession> {
    const session: PosSession = {
      sessionId: `sess_${tableNumber}`,
      tableNumber,
      hostName,
      status: 'ACTIVE',
    };
    this.sessions.set(session.sessionId!, session);
    return session;
  }
  async closeSession(tableNumber: string): Promise<any> {
    const sess = this.sessions.get(`sess_${tableNumber}`);
    if (sess) {
      sess.status = 'CLOSED';
    }
    return { success: true };
  }

  async getOrders(): Promise<PosOrderRecord[]> {
    return Array.from(this.orders.values());
  }
  async getOrder(orderId: string): Promise<PosOrderRecord | undefined> {
    return this.orders.get(orderId);
  }
  async getOrderByOrderToken(orderToken: string): Promise<PosOrderRecord | undefined> {
    return Array.from(this.orders.values()).find((o) => o.orderToken === orderToken);
  }
  async addOrder(order: PosOrderRecord): Promise<void> {
    this.orders.set(order.orderId, order);
  }
  async updateOrderStatus(orderId: string, status: string): Promise<boolean> {
    const ord = this.orders.get(orderId);
    if (ord) {
      ord.status = status;
      return true;
    }
    return false;
  }

  async getKitchenTasks(): Promise<PosKitchenTask[]> {
    return Array.from(this.kitchenTasks.values());
  }
  async addKitchenTask(task: PosKitchenTask): Promise<void> {
    this.kitchenTasks.set(task.id, task);
  }
  async updateKitchenTaskStatus(taskId: string, status: string): Promise<any> {
    const task = this.kitchenTasks.get(taskId);
    if (task) {
      task.status = status;
    }
    return task;
  }

  async getIdempotencyRecord(key: string): Promise<PosIdempotencyRecord | undefined> {
    return this.idempotencyRecords.get(key);
  }
  async saveIdempotencyRecord(key: string, record: any): Promise<void> {
    this.idempotencyRecords.set(key, record);
  }

  broadcast(event: any): void {
    this.broadcasts.push(event);
  }
}

describe('PosService Engine', () => {
  let repo: MockPosRepository;
  let service: PosService;

  beforeEach(() => {
    repo = new MockPosRepository();
    service = new PosService(repo, { now: () => new Date('2026-10-25T12:00:00.000Z') });
  });

  describe('Pricing Quote Calculation', () => {
    it('calculates deterministic quote with modifiers and 5% GST', async () => {
      const quote = await service.calculateQuote({
        items: [
          {
            id: 'item_butter_chicken',
            quantity: 2,
            selectedModifierIds: ['opt_spicy'],
          },
          {
            id: 'item_garlic_naan',
            quantity: 3,
          },
        ],
      });

      // Butter chicken: (45000 + 2000) * 2 = 94000
      // Garlic naan: 12000 * 3 = 36000
      // Subtotal = 130000 minor (₹1300.00)
      // Tax 5% = 6500 minor (₹65.00)
      // Total = 136500 minor (₹1365.00)
      expect(quote.subtotalMinor).toBe('130000');
      expect(quote.taxMinor).toBe('6500');
      expect(quote.totalMinor).toBe('136500');
      expect(quote.currency).toBe('INR');
      expect(quote.breakdown.subtotalFormatted).toBe('₹1300.00');
      expect(quote.breakdown.taxFormatted).toBe('₹65.00');
      expect(quote.breakdown.totalFormatted).toBe('₹1365.00');
      expect(quote.inputHash).toBeDefined();
      expect(quote.resultHash).toBeDefined();
    });
  });

  describe('Idempotent Order Submission', () => {
    it('places order, creates kitchen tasks, and stores idempotency record', async () => {
      const result = await service.submitOrder({
        body: {
          tableNumber: 'T12',
          items: [{ id: 'item_butter_chicken', quantity: 1 }],
          guestName: 'Rohan Sharma',
        },
        idempotencyKey: 'idem_test_1',
      });

      expect(result.status).toBe(201);
      expect(result.body.success).toBe(true);
      expect(result.body.orderId).toBeDefined();
      expect(result.body.orderToken).toBeDefined();
      expect(result.body.status).toBe('CONFIRMED');
      expect(result.body.quote.totalMinor).toBe(47250); // 45000 + 2250 (5% tax)

      // Verified order persisted in repo
      const savedOrder = await repo.getOrder(result.body.orderId);
      expect(savedOrder).toBeDefined();
      expect(savedOrder?.tableNumber).toBe('T12');

      // Verified kitchen tasks created
      const tasks = await repo.getKitchenTasks();
      expect(tasks.length).toBe(1);
      expect(tasks[0].station).toBe('CURRY_LINE');
      expect(tasks[0].status).toBe('QUEUED');

      // Verified broadcast event
      expect(repo.broadcasts.length).toBe(1);
      expect(repo.broadcasts[0].type).toBe('ORDER_PLACED');
    });

    it('returns cached response on idempotent retry with same key and payload', async () => {
      const orderPayload = {
        tableNumber: 'T12',
        items: [{ id: 'item_garlic_naan', quantity: 2 }],
        guestName: 'Diner Alice',
      };

      const res1 = await service.submitOrder({
        body: orderPayload,
        idempotencyKey: 'idem_replay_key',
      });
      expect(res1.status).toBe(201);

      // Replay identical request
      const res2 = await service.submitOrder({
        body: orderPayload,
        idempotencyKey: 'idem_replay_key',
      });
      expect(res2.status).toBe(200);
      expect(res2.body.orderId).toBe(res1.body.orderId);
      expect(res2.body.orderToken).toBe(res1.body.orderToken);
    });

    it('rejects with 409 IDEMPOTENCY_CONFLICT if same key used with different payload', async () => {
      const orderPayload1 = {
        tableNumber: 'T12',
        items: [{ id: 'item_garlic_naan', quantity: 2 }],
      };
      await service.submitOrder({
        body: orderPayload1,
        idempotencyKey: 'idem_conflict_key',
      });

      // Submit different payload under same key
      const resConflict = await service.submitOrder({
        body: { ...orderPayload1, guestName: 'Malicious Divergence' },
        idempotencyKey: 'idem_conflict_key',
      });
      expect(resConflict.status).toBe(409);
      expect(resConflict.body.code).toBe('IDEMPOTENCY_CONFLICT');
    });

    it('rejects invalid credential or revoked capability with 401', async () => {
      const resInvalid = await service.submitOrder({
        body: { tableNumber: 'T12', items: [{ id: 'item_garlic_naan', quantity: 1 }] },
        identity: { type: 'INVALID_CREDENTIAL' },
      });
      expect(resInvalid.status).toBe(401);
      expect(resInvalid.body.code).toBe('INVALID_CREDENTIAL');

      const resRevoked = await service.submitOrder({
        body: { tableNumber: 'T12', items: [{ id: 'item_garlic_naan', quantity: 1 }] },
        identity: { type: 'REVOKED_CAPABILITY' },
      });
      expect(resRevoked.status).toBe(401);
      expect(resRevoked.body.code).toBe('CAPABILITY_REVOKED');
    });

    it('rejects non-existent table with 404', async () => {
      const res = await service.submitOrder({
        body: { tableNumber: 'T999', items: [{ id: 'item_garlic_naan', quantity: 1 }] },
      });
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('TABLE_NOT_FOUND');
    });
  });

  describe('Kitchen Display System (KDS)', () => {
    it('bumps task status across workflow: QUEUED -> IN_PROGRESS -> READY -> BUMPED', async () => {
      const submitRes = await service.submitOrder({
        body: {
          tableNumber: 'T12',
          items: [{ id: 'item_garlic_naan', quantity: 1 }],
        },
      });

      const tasks = await service.listKitchenTasks({});
      expect(tasks.length).toBe(1);
      const taskId = tasks[0].id;
      expect(tasks[0].status).toBe('QUEUED');

      // Bump 1: QUEUED -> IN_PROGRESS
      const bump1 = await service.bumpKitchenTask(taskId);
      expect(bump1.status).toBe(200);
      expect(bump1.body.task.status).toBe('IN_PROGRESS');

      // Bump 2: IN_PROGRESS -> READY
      const bump2 = await service.bumpKitchenTask(taskId);
      expect(bump2.status).toBe(200);
      expect(bump2.body.task.status).toBe('READY');

      // Bump 3: READY -> BUMPED
      const bump3 = await service.bumpKitchenTask(taskId);
      expect(bump3.status).toBe(200);
      expect(bump3.body.task.status).toBe('BUMPED');
    });
  });

  describe('Order Cancellation', () => {
    it('cancels an active order and emits event', async () => {
      const submitRes = await service.submitOrder({
        body: { tableNumber: 'T12', items: [{ id: 'item_garlic_naan', quantity: 1 }] },
      });
      const orderId = submitRes.body.orderId;

      const cancelRes = await service.cancelOrder(orderId, 'Customer changed mind');
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.success).toBe(true);
      expect(cancelRes.body.status).toBe('CANCELLED');

      const updated = await service.getOrder(orderId);
      expect(updated?.status).toBe('CANCELLED');
    });

    it('returns 404 when cancelling unknown order', async () => {
      const cancelRes = await service.cancelOrder('unknown_order_id');
      expect(cancelRes.status).toBe(404);
    });
  });
});
