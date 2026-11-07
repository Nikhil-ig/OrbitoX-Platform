/**
 * 🍽️ PosRepository Interface
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative persistence abstraction for POS and KDS operations.
 * Allows @orbitox/pos to be completely decoupled from the underlying storage mechanism
 * (Prisma, PostgreSQL RLS, JSON, in-memory mock).
 */

export interface PosMenuItem {
  id: string;
  name: string;
  description?: string;
  basePriceMinor: number;
  formattedPrice?: string;
  category?: string;
  categoryId?: string;
  station?: string;
  prepDurationMinutes?: number;
  allergens?: string[];
  dietaryFlags?: string[];
  modifierGroups?: Array<{
    id: string;
    name: string;
    minSelections?: number;
    maxSelections?: number;
    options: Array<{
      id: string;
      name: string;
      priceDeltaMinor: number;
      formattedPriceDelta?: string;
      isDefault?: boolean;
    }>;
  }>;
  imageUrl?: string;
  isArchived?: boolean;
}

export interface PosTable {
  id: string | number;
  number: string;
  capacity?: number;
  status?: string;
  locator?: string;
  branchId?: string;
  floorId?: string;
  activeSessionId?: string;
  [key: string]: any;
}

export interface PosSession {
  sessionId?: string;
  id?: string;
  tableNumber: string;
  status: string;
  hostName?: string;
  participants?: any[];
  orders?: any[];
  capabilityToken?: string;
  activeEpoch?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface PosOrderRecord {
  orderId: string;
  tableNumber: string;
  sessionId?: string;
  branchId?: string;
  guestName?: string;
  status: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPriceMinor: number;
    station: string;
    guestName?: string;
    seatLabel?: string;
    modifiers?: any[];
  }>;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  currency: string;
  customer?: {
    name?: string;
    phone?: string;
    address?: string;
  };
  orderToken?: string;
  id?: string;
  idempotencyKey?: string;
  paymentStatus?: string;
  paymentSessionId?: string;
  createdAt: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface PosKitchenTask {
  id: string;
  orderId: string;
  tableNumber: string;
  branchId?: string;
  seatNumber?: string;
  guestName?: string;
  itemName: string;
  quantity: number;
  station: string;
  status: string;
  fireAt: string;
  targetServeAt: string;
  elapsedMinutes?: number;
  slaMinutes?: number;
  modifiers?: string[];
  course?: string;
  fulfilledItemCount?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface PosIdempotencyRecord {
  key: string;
  payloadHash?: string;
  response: any;
  createdAt: string;
  expiresAt?: string;
  [key: string]: any;
}

export interface PosRepository {
  // Catalog
  getMenuItems(includeArchived?: boolean): Promise<PosMenuItem[]>;
  getMenuItem(id: string): Promise<PosMenuItem | undefined>;

  // Tables
  getTable(id: string | number): Promise<PosTable | undefined>;
  getTableByNumber(number: string, branchId?: string): Promise<PosTable | undefined>;
  getTableByLocator(locator: string): Promise<PosTable | undefined>;

  // Sessions
  getSession(sessionId: string): Promise<PosSession | undefined>;
  createOrJoinSession(
    tableNumber: string,
    hostName: string,
    branchId?: string,
    floorId?: string,
    capabilityToken?: string
  ): Promise<PosSession>;
  closeSession(tableNumber: string, settlement?: any, force?: boolean, options?: any): Promise<any>;

  // Orders
  getOrders(tableNumber?: string, sessionId?: string, branchId?: string, status?: string): Promise<any[]>;
  getOrder(orderId: string): Promise<any | undefined>;
  getOrderByOrderToken(orderToken: string): Promise<any | undefined>;
  addOrder(order: any): Promise<void>;
  updateOrderStatus(
    orderId: string,
    status: string,
    optionsOrReason?: { authorizedBy?: string; reason?: string } | string
  ): Promise<boolean>;

  // Kitchen Tasks
  getKitchenTasks(station?: string, branchId?: string): Promise<any[]>;
  addKitchenTask(task: any): Promise<void>;
  updateKitchenTaskStatus(taskId: string, status?: string, options?: any): Promise<any>;

  // Idempotency
  getIdempotencyRecord(key: string): Promise<PosIdempotencyRecord | undefined>;
  saveIdempotencyRecord(key: string, record: any, ttlSeconds?: number): Promise<void>;

  // Realtime Event broadcast
  broadcast?(event: any): void;
}

/**
 * 📦 Default In-Memory POS Repository
 * Used for zero-dependency standalone operation, quick starts, and testing.
 */
export class MemoryPosRepository implements PosRepository {
  private menuItems: PosMenuItem[] = [
    { id: 'item_cold_brew', name: 'Nitro Cold Brew', basePriceMinor: 45000, station: 'BEVERAGE' },
    { id: 'item_croissant', name: 'Almond Croissant', basePriceMinor: 35000, station: 'BAKERY' },
    { id: 'item_espresso', name: 'Espresso', basePriceMinor: 25000, station: 'BEVERAGE' },
  ];
  private tables: PosTable[] = [
    { id: 1, number: '1', capacity: 2, status: 'AVAILABLE' },
    { id: 2, number: '2', capacity: 4, status: 'AVAILABLE' },
    { id: 3, number: '3', capacity: 4, status: 'AVAILABLE' },
    { id: 4, number: '4', capacity: 6, status: 'AVAILABLE' },
    { id: 5, number: '5', capacity: 2, status: 'AVAILABLE' },
  ];
  private sessions: Map<string, PosSession> = new Map();
  private orders: Map<string, PosOrderRecord> = new Map();
  private kitchenTasks: Map<string, PosKitchenTask> = new Map();
  private idempotency: Map<string, PosIdempotencyRecord> = new Map();

  async getMenuItems(): Promise<PosMenuItem[]> { return [...this.menuItems]; }
  async getMenuItem(id: string): Promise<PosMenuItem | undefined> { return this.menuItems.find(m => m.id === id); }
  
  async getTable(id: string | number): Promise<PosTable | undefined> {
    return this.tables.find(t => String(t.id) === String(id) || String(t.number) === String(id)) 
      || { id, number: String(id), capacity: 4, status: 'AVAILABLE' };
  }
  async getTableByNumber(number: string): Promise<PosTable | undefined> {
    return this.tables.find(t => String(t.number) === String(number)) 
      || { id: number, number, capacity: 4, status: 'AVAILABLE' };
  }
  async getTableByLocator(locator: string): Promise<PosTable | undefined> { 
    return this.tables.find(t => t.locator === locator); 
  }

  async getSession(sessionId: string): Promise<PosSession | undefined> { return this.sessions.get(sessionId); }
  async createOrJoinSession(tableNumber: string, hostName: string): Promise<PosSession> {
    const session: PosSession = { sessionId: `sess_${tableNumber}`, tableNumber, status: 'ACTIVE', hostName };
    this.sessions.set(session.sessionId!, session);
    return session;
  }
  async closeSession(tableNumber: string): Promise<any> {
    const session = Array.from(this.sessions.values()).find(s => s.tableNumber === tableNumber);
    if (session) session.status = 'CLOSED';
    return session;
  }

  async getOrders(): Promise<any[]> { return Array.from(this.orders.values()); }
  async getOrder(orderId: string): Promise<any | undefined> { return this.orders.get(orderId); }
  async getOrderByOrderToken(token: string): Promise<any | undefined> { 
    return Array.from(this.orders.values()).find(o => o.orderToken === token); 
  }
  async addOrder(order: any): Promise<void> { this.orders.set(order.orderId || order.id, order); }
  async updateOrderStatus(orderId: string, status: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (order) { order.status = status; return true; }
    return false;
  }

  async getKitchenTasks(): Promise<any[]> { return Array.from(this.kitchenTasks.values()); }
  async addKitchenTask(task: any): Promise<void> { this.kitchenTasks.set(task.id, task); }
  async updateKitchenTaskStatus(taskId: string, status?: string): Promise<any> {
    const task = this.kitchenTasks.get(taskId);
    if (task && status) task.status = status;
    return task;
  }

  async getIdempotencyRecord(key: string): Promise<PosIdempotencyRecord | undefined> { 
    return this.idempotency.get(key); 
  }
  async saveIdempotencyRecord(key: string, record: any): Promise<void> { 
    this.idempotency.set(key, record); 
  }
}

