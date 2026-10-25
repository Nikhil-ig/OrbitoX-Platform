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
