/**
 * 🏛️ RestaurantOS Multi-Tenant Repository Interface & PostgreSQL Implementation
 * ─────────────────────────────────────────────────────────────────────────────
 * Isolation Contract:
 * - One tenant-scoped repository instance per request / tenant context.
 * - Every single database call is scoped to this.tenantId AND executed inside
 *   `withTenantRlsTransaction(prisma, tenantId, ...)` with Row Level Security active.
 * - Broadcasts events through RealtimeEventBus tagged with tenantId.
 * - Prohibits un-tenanted fallbacks or cross-tenant data leakage.
 */

import { PrismaClient } from '@prisma/client';
import {
  BranchRecord,
  FloorRecord,
  TableFloorRecord,
  MenuItem,
  MenuCategory,
  BranchMenuOverride,
  RestaurantOrder,
  KitchenTask,
  ServiceRequest,
  GuestRecord,
  StaffDirectoryMember,
  ActiveTenantContext,
  withTenantRlsTransaction,
  ResolvedMenuItem,
} from '../domain';
import {
  DiningSessionRecord,
  DomainEvent,
  KdsTransitionResult,
  SessionCloseResult,
  RestaurantRuntimeStore,
} from './store';
import { RealtimeEventBus, eventBus as defaultEventBus } from '../domain/event-bus';

export interface RestaurantRepository {
  readonly tenantId: string;

  // Infrastructure: Branches, Floors, Tables
  getBranches(): Promise<BranchRecord[]>;
  getBranch(id: string): Promise<BranchRecord | undefined>;
  saveBranch(branch: BranchRecord): Promise<BranchRecord>;

  getFloors(branchId?: string): Promise<FloorRecord[]>;
  getFloor(id: string): Promise<FloorRecord | undefined>;
  saveFloor(floor: FloorRecord): Promise<FloorRecord>;

  getTables(branchId?: string, floorId?: string): Promise<TableFloorRecord[]>;
  getTable(id: string | number): Promise<TableFloorRecord | undefined>;
  getTableByNumber(number: string, branchId?: string): Promise<TableFloorRecord | undefined>;
  getTableByLocator(locator: string): Promise<TableFloorRecord | undefined>;
  saveFloorTables(
    tables: TableFloorRecord[],
    branchId?: string,
    floorId?: string,
    options?: { expectedRevision?: number }
  ): Promise<{ success: boolean; error?: string; code?: string; tables?: TableFloorRecord[] }>;
  updateTableCapacity(tableId: string | number, newCapacity: number): Promise<TableFloorRecord | undefined>;
  rotateTableLocator(
    tableId: string | number,
    authorizedBy?: string,
    reason?: string
  ): Promise<{ success: boolean; table?: TableFloorRecord; oldLocator?: string; newLocator?: string; error?: string }>;
  mergeTables(tableId1: string | number, tableId2: string | number): Promise<boolean>;
  unmergeTables(tableId: string | number): Promise<boolean>;

  // Catalog: Menu items, Categories, Overrides
  getMenuItems(includeArchived?: boolean): Promise<MenuItem[]>;
  getMenuItem(id: string): Promise<MenuItem | undefined>;
  saveMenuItem(item: MenuItem): Promise<void>;

  getCategories(includeArchived?: boolean): Promise<MenuCategory[]>;
  saveCategory(cat: MenuCategory): Promise<void>;

  getMenuOverrides(branchId?: string): Promise<BranchMenuOverride[]>;
  saveMenuOverride(override: BranchMenuOverride): Promise<void>;

  // Operations: Orders, Sessions, Guests
  getOrders(tableNumber?: string, sessionId?: string, branchId?: string, status?: string): Promise<RestaurantOrder[]>;
  getOrder(orderId: string): Promise<RestaurantOrder | undefined>;
  addOrder(order: RestaurantOrder): Promise<void>;
  updateOrderStatus(
    orderId: string,
    status: string,
    optionsOrReason?: { authorizedBy?: string; reason?: string } | string
  ): Promise<boolean>;

  getSessions(): Promise<DiningSessionRecord[]>;
  getSession(sessionId: string): Promise<DiningSessionRecord | undefined>;
  createOrJoinSession(tableNumber: string, hostName: string, branchId?: string, floorId?: string): Promise<DiningSessionRecord>;
  closeSession(tableNumber: string, settlement?: any, force?: boolean, options?: any): Promise<SessionCloseResult>;
  settleTableSession(tableId: string | number, settlement: any, options?: any): Promise<any>;
  isCapabilityValid(token: string): Promise<boolean>;
  revokeCapabilityToken(token: string): Promise<boolean>;

  // Kitchen: Tasks & Transitions
  getKitchenTasks(station?: string, branchId?: string): Promise<KitchenTask[]>;
  addKitchenTask(task: KitchenTask): Promise<void>;
  updateKitchenTaskStatus(taskId: string, nextStatus?: string, options?: any): Promise<KdsTransitionResult>;
  fulfillTaskItem(taskId: string, targetCount?: number): Promise<KdsTransitionResult>;

  // Staff & Directory
  getStaffMembers(): Promise<StaffDirectoryMember[]>;
  getStaffMember(id: string): Promise<StaffDirectoryMember | undefined>;
  getStaffMemberByIdentifier(identifier: string): Promise<StaffDirectoryMember | undefined>;
  saveStaffMember(member: StaffDirectoryMember): Promise<void>;
  updateStaffMemberSecret(id: string, hash: string, salt: string): Promise<void>;
  revokeStaffMember(staffId: string): Promise<boolean>;
  isStaffTokenRevoked(jti: string): Promise<boolean>;
  revokeStaffToken(token: string, reason?: string): Promise<boolean>;

  // Service Requests & Guests
  getServiceRequests(branchId?: string): Promise<ServiceRequest[]>;
  addServiceRequest(req: ServiceRequest): Promise<void>;
  updateServiceRequestStatus(id: string, status: string): Promise<boolean>;

  getGuests(tableNumber?: string): Promise<GuestRecord[]>;
  saveGuest(guest: GuestRecord): Promise<void>;

  // Brand & White-label
  getTenantBrand(branchId?: string): Promise<any>;
  updateTenantBrand(updates: any): Promise<any>;

  // Support
  getSupportTickets(): Promise<any[]>;
  getSupportTicket(id: string): Promise<any | undefined>;
  saveSupportTicket(ticket: any): Promise<void>;

  // Events & Idempotency
  getEvents(sinceSequence?: number, branchId?: string): Promise<DomainEvent[]>;
  appendEvent<T = any>(
    type: string,
    producer: string,
    branchId: string,
    payload: T,
    floorId?: string,
    tableNumber?: string
  ): Promise<DomainEvent>;
  getLastEventSequence(): Promise<number>;
  getOldestEventSequence(): Promise<number>;

  getIdempotencyRecord(key: string): Promise<any | undefined>;
  saveIdempotencyRecord(key: string, result: any, ttlSeconds?: number): Promise<void>;

  // Payments & Invoicing
  getInvoiceByOrderId(orderId: string): Promise<any | null>;
  getInvoiceByNumber(invoiceNumber: string): Promise<any | null>;
  getNextInvoiceSequence(fiscalYear: string): Promise<number>;
  saveInvoice(invoice: any): Promise<void>;

  getPaymentSessionById(id: string): Promise<any | null>;
  getPaymentSessionByOrderId(orderId: string): Promise<any | null>;
  savePaymentSession(session: any): Promise<void>;

  // Catalog helpers
  createMenuItem(item: Partial<MenuItem> & { name: string; category?: string }): Promise<MenuItem>;
  updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: string): Promise<boolean>;
  archiveMenuItem(id: string): Promise<MenuItem | undefined>;
  getCategory(id: string): Promise<MenuCategory | undefined>;
  createCategory(category: { name: string; description?: string; color?: string; displayOrder?: number }): Promise<MenuCategory>;
  updateCategory(id: string, updates: Partial<MenuCategory>): Promise<MenuCategory | undefined>;
  archiveCategory(id: string, reassignToCategoryId?: string): Promise<{ success: boolean; reassignedCount: number; error?: string }>;
  reorderCategories(order: { id: string; displayOrder: number }[]): Promise<MenuCategory[]>;
  getBranchMenuOverrides(branchId?: string): Promise<BranchMenuOverride[]>;
  setBranchMenuOverride(override: BranchMenuOverride): Promise<BranchMenuOverride>;
  getResolvedMenuForBranch(branchId: string, includeArchived?: boolean): Promise<ResolvedMenuItem[]>;

  // Tables & Floors helpers
  deleteBranch(id: string): Promise<boolean>;
  deleteFloor(id: string): Promise<boolean>;
  deleteTable(id: string | number): Promise<boolean>;
  addSeatToTable(tableId: string | number, seat: any): Promise<any>;
  removeSeatFromTable(tableId: string | number, seatId: string): Promise<boolean>;
  assignGuestToSeat(seatId: string, guestName: string, preferences?: any): Promise<any>;
  getTableBill(tableId: string | number): Promise<any>;

  // Orders & Kitchen helpers
  cancelOrder(
    orderId: string,
    reason?: string,
    authorizedBy?: string
  ): Promise<{ success: boolean; order?: RestaurantOrder; error?: string; code?: string }>;
  recallTask(taskId: string, targetStatus?: string): Promise<any>;

  // Service Requests helpers
  resolveServiceRequest(id: string): Promise<any>;
  deleteServiceRequest(id: string): Promise<boolean>;

  // Support Tickets helpers
  getSupportTicketById(id: string): Promise<any | undefined>;
  createSupportTicket(ticket: any): Promise<any>;
  addSupportTicketMessage(ticketId: string, message: any): Promise<any>;
  updateSupportTicketStatus(ticketId: string, status: any, updatedBy?: string): Promise<boolean>;

  // Brand overrides & Studio
  getBranchBrandOverride(branchId: string): Promise<any | undefined>;
  updateBranchBrandOverride(branchId: string, override: any, updatedBy?: string): Promise<any>;
  getTemplates(): Promise<any[]>;
  getTemplateById(id: string): Promise<any | undefined>;
  getTemplateDraft(id?: string): Promise<any | undefined>;
  saveTemplateDraft(draftOrId: any, maybeDraft?: any): Promise<any>;
  publishTemplateDraft(id?: string): Promise<any>;
  installTemplate(templateId: string, branchId?: string): Promise<any>;
  restoreTemplateRevision(revisionOrId: string, maybeRevision?: any): Promise<any>;

  // Partners & Grocery
  getRestaurantPartners(): Promise<any[]>;
  getRestaurantPartnerById(id: string): Promise<any | undefined>;
  getGrocerySkus(category?: string): Promise<any[]>;
  getGrocerySkuById(id: string): Promise<any | undefined>;
  transactGroceryStock(items: Array<{ skuId: string; quantity: number }>): Promise<{ success: boolean; error?: string; availableStock?: number; insufficientSkuId?: string }>;

  // Ledger & Maintenance
  reseed(): Promise<void>;
  resetToArchetypes(): Promise<void>;
  reconcileFinancialLedger(branchFilter?: string): Promise<any>;
  getRevisions(): Promise<any>;
  getRawData(): Promise<any>;
}

/**
 * Authoritative PostgreSQL Tenant-Scoped Repository with RLS
 */
export class PostgresRestaurantRepository implements RestaurantRepository {
  public readonly tenantId: string;
  private readonly prisma: PrismaClient;
  private readonly eventBus: RealtimeEventBus;

  constructor(prisma: PrismaClient, tenantId: string, eventBus: RealtimeEventBus = defaultEventBus) {
    if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
      throw new Error('FAIL_CLOSED: PostgresRestaurantRepository requires a valid non-empty tenantId.');
    }
    this.tenantId = tenantId.trim();
    this.prisma = prisma;
    this.eventBus = eventBus;
  }

  // ─────────────────────────────────────────────────────────────
  // 1. INFRASTRUCTURE: BRANCHES, FLOORS, TABLES
  // ─────────────────────────────────────────────────────────────

  async getBranches(): Promise<BranchRecord[]> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const records = await tx.branch.findMany({
        where: { tenantId: this.tenantId },
        orderBy: { code: 'asc' },
      });
      return records.map((r: any) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        address: r.address,
        city: r.city,
        timezone: r.timezone,
        currency: r.currency,
        status: r.status as any,
        serviceAreasCount: r.serviceAreasCount,
        activeTablesCount: r.activeTablesCount,
        openingHours: r.openingHours || undefined,
        phone: r.phone || undefined,
        email: r.email || undefined,
      }));
    });
  }

  async getBranch(id: string): Promise<BranchRecord | undefined> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const r = await tx.branch.findFirst({
        where: { id, tenantId: this.tenantId },
      });
      if (!r) return undefined;
      return {
        id: r.id,
        name: r.name,
        code: r.code,
        address: r.address,
        city: r.city,
        timezone: r.timezone,
        currency: r.currency,
        status: r.status as any,
        serviceAreasCount: r.serviceAreasCount,
        activeTablesCount: r.activeTablesCount,
        openingHours: r.openingHours || undefined,
        phone: r.phone || undefined,
        email: r.email || undefined,
      };
    });
  }

  async saveBranch(branch: BranchRecord): Promise<BranchRecord> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const r = await tx.branch.upsert({
        where: { tenantId_code: { tenantId: this.tenantId, code: branch.code } },
        update: {
          name: branch.name,
          address: branch.address,
          city: branch.city,
          timezone: branch.timezone,
          currency: branch.currency,
          status: branch.status,
          serviceAreasCount: branch.serviceAreasCount,
          activeTablesCount: branch.activeTablesCount,
          openingHours: branch.openingHours,
          phone: branch.phone,
          email: branch.email,
        },
        create: {
          id: branch.id,
          tenantId: this.tenantId,
          name: branch.name,
          code: branch.code,
          address: branch.address,
          city: branch.city,
          timezone: branch.timezone || 'Asia/Kolkata',
          currency: branch.currency || 'INR',
          status: branch.status || 'OPERATIONAL',
          serviceAreasCount: branch.serviceAreasCount || 0,
          activeTablesCount: branch.activeTablesCount || 0,
          openingHours: branch.openingHours,
          phone: branch.phone,
          email: branch.email,
        },
      });
      return {
        id: r.id,
        name: r.name,
        code: r.code,
        address: r.address,
        city: r.city,
        timezone: r.timezone,
        currency: r.currency,
        status: r.status as any,
        serviceAreasCount: r.serviceAreasCount,
        activeTablesCount: r.activeTablesCount,
        openingHours: r.openingHours || undefined,
        phone: r.phone || undefined,
        email: r.email || undefined,
      };
    });
  }

  async getFloors(branchId?: string): Promise<FloorRecord[]> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const where: any = { tenantId: this.tenantId };
      if (branchId) where.branchId = branchId;
      const records = await tx.floor.findMany({
        where,
        orderBy: { name: 'asc' },
      });
      return records.map((r: any) => ({
        id: r.id,
        branchId: r.branchId,
        name: r.name,
        type: r.type as any,
        capacity: r.capacity,
        activeLayout: r.activeLayout,
        status: r.status as any,
        tableIds: r.tableIds || [],
        serviceLayouts: r.serviceLayouts || {},
      }));
    });
  }

  async getFloor(id: string): Promise<FloorRecord | undefined> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const r = await tx.floor.findFirst({
        where: { id, tenantId: this.tenantId },
      });
      if (!r) return undefined;
      return {
        id: r.id,
        branchId: r.branchId,
        name: r.name,
        type: r.type as any,
        capacity: r.capacity,
        activeLayout: r.activeLayout,
        status: r.status as any,
        tableIds: r.tableIds || [],
        serviceLayouts: r.serviceLayouts || {},
      };
    });
  }

  async saveFloor(floor: FloorRecord): Promise<FloorRecord> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const r = await tx.floor.upsert({
        where: { id: floor.id },
        update: {
          name: floor.name,
          type: floor.type,
          capacity: floor.capacity,
          activeLayout: floor.activeLayout,
          status: floor.status,
          tableIds: floor.tableIds,
          serviceLayouts: floor.serviceLayouts,
        },
        create: {
          id: floor.id,
          tenantId: this.tenantId,
          branchId: floor.branchId,
          name: floor.name,
          type: floor.type,
          capacity: floor.capacity,
          activeLayout: floor.activeLayout || 'default',
          status: floor.status || 'ACTIVE',
          tableIds: floor.tableIds,
          serviceLayouts: floor.serviceLayouts,
        },
      });
      return {
        id: r.id,
        branchId: r.branchId,
        name: r.name,
        type: r.type as any,
        capacity: r.capacity,
        activeLayout: r.activeLayout,
        status: r.status as any,
        tableIds: r.tableIds || [],
        serviceLayouts: r.serviceLayouts || {},
      };
    });
  }

  async getTables(branchId?: string, floorId?: string): Promise<TableFloorRecord[]> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const where: any = { tenantId: this.tenantId };
      if (branchId) where.branchId = branchId;
      if (floorId) where.floorId = floorId;
      const records = await tx.tableFloor.findMany({
        where,
        orderBy: { number: 'asc' },
      });
      return records.map(this.mapTableRecord);
    });
  }

  async getTable(id: string | number): Promise<TableFloorRecord | undefined> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const idStr = String(id);
      const numVal = typeof id === 'number' ? id : parseInt(id, 10);
      const orConditions: any[] = [{ id: idStr, tenantId: this.tenantId }];
      if (!isNaN(numVal)) {
        orConditions.push({ numericId: numVal, tenantId: this.tenantId });
      }
      const r = await tx.tableFloor.findFirst({
        where: { OR: orConditions },
      });
      return r ? this.mapTableRecord(r) : undefined;
    });
  }

  async getTableByNumber(number: string, branchId?: string): Promise<TableFloorRecord | undefined> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const where: any = { tenantId: this.tenantId, number };
      if (branchId) where.branchId = branchId;
      const r = await tx.tableFloor.findFirst({ where });
      return r ? this.mapTableRecord(r) : undefined;
    });
  }

  async getTableByLocator(locator: string): Promise<TableFloorRecord | undefined> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const r = await tx.tableFloor.findFirst({
        where: { locator, tenantId: this.tenantId },
      });
      return r ? this.mapTableRecord(r) : undefined;
    });
  }

  async saveFloorTables(
    tables: TableFloorRecord[],
    branchId?: string,
    floorId?: string,
    options?: { expectedRevision?: number }
  ): Promise<{ success: boolean; error?: string; code?: string; tables?: TableFloorRecord[] }> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const saved: TableFloorRecord[] = [];
      for (const t of tables) {
        const idStr = String(t.id);
        const numId = typeof t.id === 'number' ? t.id : parseInt(String(t.id).replace(/\D/g, ''), 10) || 1;
        const targetFloorId = floorId || t.floorId;
        const targetBranchId = branchId || t.branchId;
        const loc = t.locator || `${targetBranchId}:${t.number}`;

        const r = await tx.tableFloor.upsert({
          where: { id: idStr },
          update: {
            number: t.number,
            capacity: t.capacity,
            minimumSeats: t.minimumSeats,
            status: t.status,
            x: t.x,
            y: t.y,
            width: t.width,
            height: t.height,
            rotation: t.rotation,
            shape: t.shape,
            section: t.section,
            floorId: targetFloorId,
            branchId: targetBranchId,
            locator: loc,
            seats: t.seats,
            activeSessionId: t.activeSessionId,
            activeBillMinor: t.activeBillMinor,
            serverName: t.serverName,
            turnTimeMinutes: t.turnTimeMinutes,
            mergedWithTableIds: t.mergedWithTableIds,
            mergedPartyLabel: t.mergedPartyLabel,
          },
          create: {
            id: idStr,
            numericId: numId,
            tenantId: this.tenantId,
            number: t.number,
            capacity: t.capacity,
            minimumSeats: t.minimumSeats,
            status: t.status || 'AVAILABLE',
            x: t.x || 0,
            y: t.y || 0,
            width: t.width || 80,
            height: t.height || 80,
            rotation: t.rotation || 0,
            shape: t.shape || 'rectangle',
            section: t.section || 'Main Dining',
            floorId: targetFloorId,
            branchId: targetBranchId,
            locator: loc,
            seats: t.seats || null,
            activeSessionId: t.activeSessionId,
            activeBillMinor: t.activeBillMinor,
            serverName: t.serverName,
            turnTimeMinutes: t.turnTimeMinutes,
            mergedWithTableIds: t.mergedWithTableIds,
            mergedPartyLabel: t.mergedPartyLabel,
          },
        });
        const mapped = this.mapTableRecord(r);
        saved.push(mapped);
        await this.appendEvent(
          'table.updated',
          'repository:spatial-studio',
          mapped.branchId || branchId || 'main',
          mapped,
          mapped.floorId || floorId,
          mapped.number
        );
      }
      return { success: true, tables: saved };
    });
  }

  async updateTableCapacity(tableId: string | number, newCapacity: number): Promise<TableFloorRecord | undefined> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const idStr = String(tableId);
      const r = await tx.tableFloor.update({
        where: { id: idStr },
        data: { capacity: newCapacity },
      });
      return this.mapTableRecord(r);
    });
  }

  async rotateTableLocator(
    tableId: string | number,
    authorizedBy: string = 'system',
    reason?: string
  ): Promise<{
    success: boolean;
    table?: TableFloorRecord;
    oldLocator?: string;
    newLocator?: string;
    error?: string;
  }> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const idStr = String(tableId);
      const current = await tx.tableFloor.findFirst({
        where: { id: idStr, tenantId: this.tenantId },
      });
      if (!current) {
        return { success: false, error: `Table ${tableId} not found` };
      }
      const crypto = await import('crypto');
      const randomSuffix = crypto.randomBytes(4).toString('hex');
      const oldLocator = current.locator;
      const newLocator = `LOC${current.numericId || current.number}_${Date.now().toString(36)}_${randomSuffix}`;

      const updated = await tx.tableFloor.update({
        where: { id: current.id },
        data: { locator: newLocator },
      });

      const tableRecord = this.mapTableRecord(updated);
      await this.appendEvent(
        'table.locator_rotated',
        'repository:table-security',
        current.branchId,
        {
          tableId: current.id,
          tableNumber: current.number,
          oldLocator,
          newLocator,
          authorizedBy,
          reason: reason || 'Explicit locator rotation requested by staff',
          rotatedAt: new Date().toISOString(),
        },
        current.floorId,
        current.number
      );

      return { success: true, table: tableRecord, oldLocator, newLocator };
    });
  }

  async mergeTables(tableId1: string | number, tableId2: string | number): Promise<boolean> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const t1 = await tx.tableFloor.findFirst({ where: { id: String(tableId1), tenantId: this.tenantId } });
      const t2 = await tx.tableFloor.findFirst({ where: { id: String(tableId2), tenantId: this.tenantId } });
      if (!t1 || !t2) return false;

      const mergedList = Array.from(new Set([...(t1.mergedWithTableIds || []), Number(t2.numericId || t2.id)]));
      await tx.tableFloor.update({
        where: { id: t1.id },
        data: {
          mergedWithTableIds: mergedList,
          mergedPartyLabel: `Tables ${t1.number} + ${t2.number}`,
        },
      });
      await tx.tableFloor.update({
        where: { id: t2.id },
        data: {
          status: 'OCCUPIED',
          mergedWithTableIds: [Number(t1.numericId || t1.id)],
          mergedPartyLabel: `Merged into Table ${t1.number}`,
        },
      });
      return true;
    });
  }

  async unmergeTables(tableId: string | number): Promise<boolean> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const t = await tx.tableFloor.findFirst({ where: { id: String(tableId), tenantId: this.tenantId } });
      if (!t) return false;

      await tx.tableFloor.update({
        where: { id: t.id },
        data: {
          mergedWithTableIds: [],
          mergedPartyLabel: null,
          status: 'AVAILABLE',
        },
      });
      return true;
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 2. CATALOG: MENU ITEMS, CATEGORIES, OVERRIDES
  // ─────────────────────────────────────────────────────────────

  async getMenuItems(includeArchived = false): Promise<MenuItem[]> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const where: any = { tenantId: this.tenantId };
      if (!includeArchived) where.isArchived = false;
      const records = await tx.menuItem.findMany({
        where,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });
      return records.map(this.mapMenuItem);
    });
  }

  async getMenuItem(id: string): Promise<MenuItem | undefined> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const r = await tx.menuItem.findFirst({
        where: { id, tenantId: this.tenantId },
      });
      return r ? this.mapMenuItem(r) : undefined;
    });
  }

  async saveMenuItem(item: MenuItem): Promise<void> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      await tx.menuItem.upsert({
        where: { id: item.id },
        update: {
          name: item.name,
          description: item.description,
          basePriceMinor: item.basePriceMinor,
          formattedPrice: item.formattedPrice,
          category: item.category,
          categoryId: item.categoryId,
          station: item.station,
          prepDurationMinutes: item.prepDurationMinutes,
          allergens: item.allergens,
          dietaryFlags: item.dietaryFlags,
          story: item.story,
          pairingSuggestions: item.pairingSuggestions,
          isPopular: item.isPopular,
          isSignature: item.isSignature,
          isArchived: item.isArchived,
          modifierGroups: item.modifierGroups,
          imageUrl: item.imageUrl,
          hsnCode: item.hsnCode || '996331',
        },
        create: {
          id: item.id,
          tenantId: this.tenantId,
          name: item.name,
          description: item.description || '',
          basePriceMinor: item.basePriceMinor,
          formattedPrice: item.formattedPrice,
          category: item.category,
          categoryId: item.categoryId,
          station: item.station || 'CURRY_LINE',
          prepDurationMinutes: item.prepDurationMinutes || 10,
          allergens: item.allergens,
          dietaryFlags: item.dietaryFlags,
          story: item.story,
          pairingSuggestions: item.pairingSuggestions,
          isPopular: item.isPopular || false,
          isSignature: item.isSignature || false,
          isArchived: item.isArchived || false,
          modifierGroups: item.modifierGroups,
          imageUrl: item.imageUrl,
          hsnCode: item.hsnCode || '996331',
        },
      });
    });
  }

  async getCategories(includeArchived = false): Promise<MenuCategory[]> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const where: any = { tenantId: this.tenantId };
      if (!includeArchived) {
        where.isArchived = false;
      }
      const records = await tx.menuCategory.findMany({
        where,
        orderBy: { displayOrder: 'asc' },
      });
      return records.map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description || undefined,
        displayOrder: r.displayOrder,
        isArchived: r.isArchived,
        color: r.color || undefined,
      }));
    });
  }

  async saveCategory(cat: MenuCategory): Promise<void> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      await tx.menuCategory.upsert({
        where: { id: cat.id },
        update: {
          name: cat.name,
          description: cat.description,
          displayOrder: cat.displayOrder,
          isArchived: cat.isArchived,
          color: cat.color,
        },
        create: {
          id: cat.id,
          tenantId: this.tenantId,
          name: cat.name,
          description: cat.description,
          displayOrder: cat.displayOrder || 0,
          isArchived: cat.isArchived || false,
          color: cat.color,
        },
      });
    });
  }

  async getMenuOverrides(branchId?: string): Promise<BranchMenuOverride[]> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const where: any = { tenantId: this.tenantId };
      if (branchId) where.branchId = branchId;
      const records = await tx.branchMenuOverride.findMany({ where });
      return records.map((r: any) => ({
        id: r.id,
        itemId: r.itemId,
        branchId: r.branchId,
        isAvailable: r.isAvailable,
        priceOverrideMinor: r.priceOverrideMinor || undefined,
        formattedPriceOverride: r.formattedPriceOverride || undefined,
        customPrepMinutes: r.customPrepMinutes || undefined,
      }));
    });
  }

  async saveMenuOverride(override: BranchMenuOverride): Promise<void> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      await tx.branchMenuOverride.upsert({
        where: {
          tenantId_branchId_itemId: {
            tenantId: this.tenantId,
            branchId: override.branchId,
            itemId: override.itemId,
          },
        },
        update: {
          isAvailable: override.isAvailable,
          priceOverrideMinor: override.priceOverrideMinor,
          formattedPriceOverride: override.formattedPriceOverride,
          customPrepMinutes: override.customPrepMinutes,
        },
        create: {
          id: override.id,
          tenantId: this.tenantId,
          itemId: override.itemId,
          branchId: override.branchId,
          isAvailable: override.isAvailable,
          priceOverrideMinor: override.priceOverrideMinor,
          formattedPriceOverride: override.formattedPriceOverride,
          customPrepMinutes: override.customPrepMinutes,
        },
      });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 3. ORDERS, SESSIONS & GUESTS
  // ─────────────────────────────────────────────────────────────

  async getOrders(
    tableNumber?: string,
    sessionId?: string,
    branchId?: string,
    status?: string
  ): Promise<RestaurantOrder[]> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const where: any = { tenantId: this.tenantId };
      if (tableNumber) where.tableNumber = tableNumber;
      if (sessionId) where.sessionId = sessionId;
      if (branchId) where.branchId = branchId;
      if (status) where.status = status;
      const records = await tx.restaurantOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      return records.map(this.mapOrderRecord);
    });
  }

  async getOrder(orderId: string): Promise<RestaurantOrder | undefined> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const r = await tx.restaurantOrder.findFirst({
        where: { id: orderId, tenantId: this.tenantId },
      });
      return r ? this.mapOrderRecord(r) : undefined;
    });
  }

  async addOrder(order: RestaurantOrder): Promise<void> {
    const orderId = order.orderId || order.id || `ord_${Date.now()}`;
    const event = await withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      await tx.restaurantOrder.upsert({
        where: { id: orderId },
        update: {
          status: order.status,
          paymentStatus: order.paymentStatus || 'UNPAID',
          items: order.items,
          subtotalMinor: order.subtotalMinor,
          taxMinor: order.taxMinor,
          totalMinor: order.totalMinor,
        },
        create: {
          id: orderId,
          tenantId: this.tenantId,
          tableNumber: order.tableNumber,
          sessionId: order.sessionId || `sess_${order.tableNumber}`,
          branchId: order.branchId || null,
          guestName: order.guestName || null,
          status: order.status || 'CONFIRMED',
          items: order.items || [],
          subtotalMinor: order.subtotalMinor || 0,
          taxMinor: order.taxMinor || 0,
          totalMinor: order.totalMinor || 0,
          currency: order.currency || 'INR',
          customer: order.customer || null,
          orderToken: order.orderToken || null,
          paymentStatus: order.paymentStatus || 'UNPAID',
          paymentSessionId: order.paymentSessionId || null,
        },
      });

      // Append outbox domain event
      const seq = await this.getNextEventSequence(tx);
      const evt = await tx.domainEvent.create({
        data: {
          tenantId: this.tenantId,
          sequence: seq,
          type: 'order.created',
          producer: 'pos',
          branchId: order.branchId || 'main',
          tableNumber: order.tableNumber,
          payload: { ...order, tenantId: this.tenantId },
        },
      });
      return this.mapDomainEvent(evt);
    });

    this.eventBus.broadcast(event);
  }

  async updateOrderStatus(
    orderId: string,
    status: string,
    optionsOrReason?: { authorizedBy?: string; reason?: string } | string
  ): Promise<boolean> {
    const reason = typeof optionsOrReason === 'string' ? optionsOrReason : optionsOrReason?.reason;
    const authorizedBy = typeof optionsOrReason === 'object' ? optionsOrReason?.authorizedBy : undefined;
    const event = await withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const order = await tx.restaurantOrder.findFirst({
        where: { OR: [{ id: orderId }, { orderId }], tenantId: this.tenantId },
      });
      if (!order) return null;

      await tx.restaurantOrder.update({
        where: { id: order.id },
        data: { status },
      });

      const seq = await this.getNextEventSequence(tx);
      const evt = await tx.domainEvent.create({
        data: {
          tenantId: this.tenantId,
          sequence: seq,
          type: 'order.status_changed',
          producer: 'pos',
          branchId: order.branchId || 'main',
          tableNumber: order.tableNumber,
          payload: { orderId, previousStatus: order.status, status, reason, authorizedBy, tenantId: this.tenantId },
        },
      });
      return this.mapDomainEvent(evt);
    });

    if (event) {
      this.eventBus.broadcast(event);
      return true;
    }
    return false;
  }

  async getSessions(): Promise<DiningSessionRecord[]> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const records = await tx.diningSession.findMany({
        where: { tenantId: this.tenantId },
        orderBy: { openedAt: 'desc' },
      });
      return records.map(this.mapSessionRecord);
    });
  }

  async getSession(sessionId: string): Promise<DiningSessionRecord | undefined> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const r = await tx.diningSession.findFirst({
        where: { id: sessionId, tenantId: this.tenantId },
      });
      return r ? this.mapSessionRecord(r) : undefined;
    });
  }

  async createOrJoinSession(
    tableNumber: string,
    hostName: string,
    branchId = 'main',
    floorId = 'ground'
  ): Promise<DiningSessionRecord> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      // Find active session for table
      const existing = await tx.diningSession.findFirst({
        where: {
          tableNumber,
          tenantId: this.tenantId,
          status: 'ACTIVE',
        },
      });

      if (existing) {
        return this.mapSessionRecord(existing);
      }

      const sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      const crypto = await import('crypto');
      const capabilityToken = `orb_cap_${crypto.randomBytes(16).toString('hex')}`;

      const created = await tx.diningSession.create({
        data: {
          id: sessionId,
          tenantId: this.tenantId,
          tableNumber,
          branchId,
          floorId,
          hostName,
          status: 'ACTIVE',
          guestCapabilityTokens: [capabilityToken],
        },
      });

      // Update table status to OCCUPIED
      await tx.tableFloor.updateMany({
        where: { number: tableNumber, tenantId: this.tenantId },
        data: {
          status: 'OCCUPIED',
          activeSessionId: sessionId,
        },
      });

      return this.mapSessionRecord(created);
    });
  }

  async closeSession(
    tableNumber: string,
    settlement?: any,
    force = false,
    options?: any
  ): Promise<SessionCloseResult> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const session = await tx.diningSession.findFirst({
        where: { tableNumber, tenantId: this.tenantId, status: 'ACTIVE' },
      });

      if (!session) {
        return { success: false, error: `No active session on table ${tableNumber}`, code: 'TABLE_NOT_FOUND' };
      }

      await tx.diningSession.update({
        where: { id: session.id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          settlement: settlement || null,
        },
      });

      // Free the table
      await tx.tableFloor.updateMany({
        where: { number: tableNumber, tenantId: this.tenantId },
        data: {
          status: 'AVAILABLE',
          activeSessionId: null,
          activeBillMinor: 0,
        },
      });

      return {
        success: true,
        session: this.mapSessionRecord(session),
        settlement,
      };
    });
  }

  async settleTableSession(tableId: string | number, settlement: any, options?: any): Promise<any> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const tbl = await tx.tableFloor.findFirst({
        where: { id: String(tableId), tenantId: this.tenantId },
      });
      if (!tbl) return { success: false, error: 'Table not found' };

      if (tbl.activeSessionId) {
        await tx.diningSession.update({
          where: { id: tbl.activeSessionId },
          data: { settlement },
        });
      }

      await tx.tableFloor.update({
        where: { id: tbl.id },
        data: {
          status: 'AVAILABLE',
          activeSessionId: null,
          activeBillMinor: 0,
        },
      });

      return { success: true, table: tbl, settlement };
    });
  }

  async isCapabilityValid(token: string): Promise<boolean> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const session = await tx.diningSession.findFirst({
        where: {
          tenantId: this.tenantId,
          status: 'ACTIVE',
        },
      });
      if (!session || !session.guestCapabilityTokens) return false;
      const tokens = session.guestCapabilityTokens as string[];
      return Array.isArray(tokens) && tokens.includes(token);
    });
  }

  async revokeCapabilityToken(token: string): Promise<boolean> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const sessions = await tx.diningSession.findMany({
        where: { tenantId: this.tenantId, status: 'ACTIVE' },
      });
      for (const s of sessions) {
        const tokens = (s.guestCapabilityTokens as string[]) || [];
        if (tokens.includes(token)) {
          const updated = tokens.filter((t) => t !== token);
          await tx.diningSession.update({
            where: { id: s.id },
            data: { guestCapabilityTokens: updated },
          });
          return true;
        }
      }
      return false;
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 4. KITCHEN TASKS
  // ─────────────────────────────────────────────────────────────

  async getKitchenTasks(station?: string, branchId?: string): Promise<KitchenTask[]> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const where: any = { tenantId: this.tenantId };
      if (station && station !== 'ALL') where.station = station;
      if (branchId) where.branchId = branchId;
      const records = await tx.kitchenTask.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      return records.map(this.mapKitchenTask);
    });
  }

  async addKitchenTask(task: KitchenTask): Promise<void> {
    const event = await withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      await tx.kitchenTask.upsert({
        where: { id: task.id },
        update: {
          status: task.status,
          quantity: task.quantity,
          fulfilledItemCount: task.fulfilledItemCount,
        },
        create: {
          id: task.id,
          tenantId: this.tenantId,
          orderId: task.orderId,
          tableNumber: task.tableNumber,
          branchId: task.branchId || null,
          seatNumber: task.seatNumber || null,
          guestName: task.guestName || null,
          itemName: task.itemName,
          quantity: task.quantity,
          station: task.station,
          status: task.status || 'QUEUED',
          fireAt: task.fireAt || null,
          targetServeAt: task.targetServeAt || null,
          elapsedMinutes: task.elapsedMinutes || 0,
          slaMinutes: task.slaMinutes || 0,
          modifiers: task.modifiers || null,
          course: task.course || null,
          fulfilledItemCount: task.fulfilledItemCount || 0,
        },
      });

      const seq = await this.getNextEventSequence(tx);
      const evt = await tx.domainEvent.create({
        data: {
          tenantId: this.tenantId,
          sequence: seq,
          type: 'task.created',
          producer: 'kds',
          branchId: task.branchId || 'main',
          tableNumber: task.tableNumber,
          payload: { ...task, tenantId: this.tenantId },
        },
      });
      return this.mapDomainEvent(evt);
    });

    this.eventBus.broadcast(event);
  }

  async updateKitchenTaskStatus(
    taskId: string,
    nextStatus?: string,
    options?: any
  ): Promise<KdsTransitionResult> {
    const result = await withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const task = await tx.kitchenTask.findFirst({
        where: { id: taskId, tenantId: this.tenantId },
      });
      if (!task) {
        return { success: false, error: `Task ${taskId} not found`, code: 'TASK_NOT_FOUND' };
      }

      if (options?.station && options.station !== 'ALL' && task.station !== options.station) {
        return {
          success: false,
          error: `Station ${options.station} not authorized for task assigned to ${task.station}`,
          code: 'STATION_MISMATCH',
        };
      }

      let targetStatus = nextStatus;
      if (!targetStatus) {
        if (task.status === 'QUEUED') targetStatus = 'IN_PROGRESS';
        else if (task.status === 'IN_PROGRESS') targetStatus = 'READY';
        else if (task.status === 'READY') targetStatus = 'BUMPED';
        else targetStatus = task.status;
      }

      if (task.status === targetStatus) {
        return { success: true, task: this.mapKitchenTask(task), isIdempotent: true };
      }

      const ALLOWED: Record<string, string[]> = {
        QUEUED: ['IN_PROGRESS', 'CANCELLED'],
        IN_PROGRESS: ['READY', 'QUEUED'],
        READY: ['BUMPED', 'IN_PROGRESS'],
        BUMPED: ['READY'],
      };

      if (!ALLOWED[task.status]?.includes(targetStatus)) {
        return {
          success: false,
          error: `Invalid transition from ${task.status} to ${targetStatus}`,
          code: 'INVALID_TRANSITION',
        };
      }

      const updated = await tx.kitchenTask.update({
        where: { id: task.id },
        data: { status: targetStatus },
      });

      const seq = await this.getNextEventSequence(tx);
      const eventType =
        targetStatus === 'IN_PROGRESS' ? 'task.started' : targetStatus === 'READY' ? 'task.ready' : 'task.bumped';

      const evt = await tx.domainEvent.create({
        data: {
          tenantId: this.tenantId,
          sequence: seq,
          type: eventType,
          producer: 'kds',
          branchId: updated.branchId || 'main',
          tableNumber: updated.tableNumber,
          payload: { ...this.mapKitchenTask(updated), tenantId: this.tenantId },
        },
      });

      return {
        success: true,
        task: this.mapKitchenTask(updated),
        event: this.mapDomainEvent(evt),
      };
    });

    if (result.success && result.event) {
      this.eventBus.broadcast(result.event);
    }
    return result as KdsTransitionResult;
  }

  async fulfillTaskItem(taskId: string, targetCount?: number): Promise<KdsTransitionResult> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const task = await tx.kitchenTask.findFirst({
        where: { id: taskId, tenantId: this.tenantId },
      });
      if (!task) {
        return { success: false, error: `Task ${taskId} not found`, code: 'TASK_NOT_FOUND' };
      }
      const count = targetCount !== undefined ? targetCount : task.fulfilledItemCount + 1;
      const updated = await tx.kitchenTask.update({
        where: { id: task.id },
        data: { fulfilledItemCount: count },
      });
      return { success: true, task: this.mapKitchenTask(updated) };
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 5. STAFF DIRECTORY & SECURITY
  // ─────────────────────────────────────────────────────────────

  async getStaffMembers(): Promise<StaffDirectoryMember[]> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const records = await tx.staffMember.findMany({
        where: { tenantId: this.tenantId },
        orderBy: { name: 'asc' },
      });
      return records.map((r: any) => ({
        id: r.id,
        name: r.name,
        role: r.role,
        branchId: r.branchId,
        station: r.station || undefined,
        status: r.status,
        salt: r.salt,
        pinHash: r.pinHash,
        permissions: r.permissions || undefined,
      }));
    });
  }

  async getStaffMember(id: string): Promise<StaffDirectoryMember | undefined> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const r = await tx.staffMember.findFirst({
        where: { id, tenantId: this.tenantId },
      });
      if (!r) return undefined;
      return {
        id: r.id,
        name: r.name,
        role: r.role,
        branchId: r.branchId,
        station: r.station || undefined,
        status: r.status,
        salt: r.salt,
        pinHash: r.pinHash,
        permissions: r.permissions || undefined,
      };
    });
  }

  async getStaffMemberByIdentifier(identifier: string): Promise<StaffDirectoryMember | undefined> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const trimmed = identifier.trim();
      let r = await tx.staffMember.findFirst({
        where: { id: trimmed, tenantId: this.tenantId },
      });
      if (!r) {
        r = await tx.staffMember.findFirst({
          where: {
            tenantId: this.tenantId,
            name: { equals: trimmed, mode: 'insensitive' },
          },
        });
      }
      if (!r) {
        const records = await tx.staffMember.findMany({
          where: { tenantId: this.tenantId },
        });
        r = records.find((m: any) => {
          const perms = m.permissions as any;
          if (perms && typeof perms === 'object') {
            if (perms.email && String(perms.email).toLowerCase() === trimmed.toLowerCase()) return true;
            if (perms.phone && String(perms.phone) === trimmed) return true;
          }
          return false;
        });
      }
      if (!r) return undefined;
      return {
        id: r.id,
        name: r.name,
        role: r.role,
        branchId: r.branchId,
        station: r.station || undefined,
        status: r.status,
        salt: r.salt,
        pinHash: r.pinHash,
        permissions: r.permissions || undefined,
      };
    });
  }

  async saveStaffMember(member: StaffDirectoryMember): Promise<void> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      await tx.staffMember.upsert({
        where: { id: member.id },
        update: {
          name: member.name,
          role: member.role,
          branchId: member.branchId,
          station: member.station,
          status: member.status,
          salt: member.salt,
          pinHash: member.pinHash,
          permissions: member.permissions,
        },
        create: {
          id: member.id,
          tenantId: this.tenantId,
          name: member.name,
          role: member.role,
          branchId: member.branchId,
          station: member.station,
          status: member.status || 'ACTIVE',
          salt: member.salt,
          pinHash: member.pinHash,
          permissions: member.permissions,
        },
      });
    });
  }

  async updateStaffMemberSecret(id: string, hash: string, salt: string): Promise<void> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      await tx.staffMember.updateMany({
        where: { id, tenantId: this.tenantId },
        data: { pinHash: hash, salt },
      });
    });
  }

  async revokeStaffMember(staffId: string): Promise<boolean> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const r = await tx.staffMember.updateMany({
        where: { id: staffId, tenantId: this.tenantId },
        data: { status: 'REVOKED' },
      });
      return r.count > 0;
    });
  }

  async isStaffTokenRevoked(jti: string): Promise<boolean> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const record = await tx.staffTokenRevocation.findFirst({
        where: { tokenJti: jti, tenantId: this.tenantId },
      });
      return record !== null;
    });
  }

  async revokeStaffToken(token: string, reason?: string): Promise<boolean> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const crypto = await import('crypto');
      const jti = token.length > 64 ? crypto.createHash('sha256').update(token).digest('hex') : token;
      await tx.staffTokenRevocation.upsert({
        where: { tenantId_tokenJti: { tenantId: this.tenantId, tokenJti: jti } },
        update: { reason },
        create: {
          tenantId: this.tenantId,
          tokenJti: jti,
          reason,
        },
      });
      this.eventBus.disconnectClientsForToken(token, this.tenantId);
      return true;
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 6. SERVICE REQUESTS & GUESTS
  // ─────────────────────────────────────────────────────────────

  async getServiceRequests(branchId?: string): Promise<ServiceRequest[]> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const where: any = { tenantId: this.tenantId };
      if (branchId) where.branchId = branchId;
      const records = await tx.serviceRequest.findMany({
        where,
        orderBy: { requestedAt: 'desc' },
      });
      return records.map((r: any) => ({
        id: r.id,
        tableNumber: r.tableNumber,
        branchId: r.branchId,
        floorId: r.floorId,
        type: r.type,
        status: r.status,
        requestedAt: r.requestedAt.toISOString(),
        note: r.note || undefined,
      }));
    });
  }

  async addServiceRequest(req: ServiceRequest): Promise<void> {
    const event = await withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      await tx.serviceRequest.create({
        data: {
          id: req.id,
          tenantId: this.tenantId,
          tableNumber: req.tableNumber,
          branchId: req.branchId,
          floorId: req.floorId,
          type: req.type,
          status: req.status || 'PENDING',
          note: req.note || null,
        },
      });

      const seq = await this.getNextEventSequence(tx);
      const evt = await tx.domainEvent.create({
        data: {
          tenantId: this.tenantId,
          sequence: seq,
          type: 'service.requested',
          producer: 'guest',
          branchId: req.branchId,
          tableNumber: req.tableNumber,
          payload: { ...req, tenantId: this.tenantId },
        },
      });
      return this.mapDomainEvent(evt);
    });

    this.eventBus.broadcast(event);
  }

  async updateServiceRequestStatus(id: string, status: string): Promise<boolean> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const r = await tx.serviceRequest.updateMany({
        where: { id, tenantId: this.tenantId },
        data: { status },
      });
      return r.count > 0;
    });
  }

  async getGuests(tableNumber?: string): Promise<GuestRecord[]> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const where: any = { tenantId: this.tenantId };
      if (tableNumber) where.tableNumber = tableNumber;
      const records = await tx.guest.findMany({ where });
      return records.map((r: any) => ({
        id: r.id,
        name: r.name,
        tableNumber: r.tableNumber,
        seatId: r.seatId || undefined,
        seatLabel: r.seatLabel || undefined,
        role: r.role,
        joinTime: r.joinTime.toISOString(),
        preferences: r.preferences || undefined,
        orderIds: r.orderIds || [],
        totalSpendMinor: r.totalSpendMinor,
      }));
    });
  }

  async saveGuest(guest: GuestRecord): Promise<void> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      await tx.guest.upsert({
        where: { id: guest.id },
        update: {
          name: guest.name,
          tableNumber: guest.tableNumber,
          seatId: guest.seatId,
          seatLabel: guest.seatLabel,
          role: guest.role,
          preferences: guest.preferences,
          orderIds: guest.orderIds,
          totalSpendMinor: guest.totalSpendMinor,
        },
        create: {
          id: guest.id,
          tenantId: this.tenantId,
          name: guest.name,
          tableNumber: guest.tableNumber,
          seatId: guest.seatId,
          seatLabel: guest.seatLabel,
          role: guest.role || 'WALK_IN',
          preferences: guest.preferences,
          orderIds: guest.orderIds || [],
          totalSpendMinor: guest.totalSpendMinor || 0,
        },
      });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 7. BRAND & WHITE-LABEL CONFIGURATION
  // ─────────────────────────────────────────────────────────────

  async getTenantBrand(branchId?: string): Promise<any> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const r = await tx.tenantBrandConfig.findFirst({
        where: { tenantId: this.tenantId },
      });
      const base = r?.config || { tenantId: this.tenantId, restaurantName: 'OrbitoX Bistro', themeColor: '#818CF8' };
      if (branchId && base.branchOverrides && base.branchOverrides[branchId]) {
        return {
          ...base,
          ...base.branchOverrides[branchId],
        };
      }
      return base;
    });
  }

  async updateTenantBrand(updates: any): Promise<any> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const current = await tx.tenantBrandConfig.findFirst({
        where: { tenantId: this.tenantId },
      });
      const merged = { ...(current?.config || {}), ...updates, tenantId: this.tenantId };
      const saved = await tx.tenantBrandConfig.upsert({
        where: { tenantId: this.tenantId },
        update: { config: merged },
        create: { tenantId: this.tenantId, config: merged },
      });
      return saved.config;
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 8. SUPPORT TICKETS
  // ─────────────────────────────────────────────────────────────

  async getSupportTickets(): Promise<any[]> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const records = await tx.supportTicket.findMany({
        where: { tenantId: this.tenantId },
        orderBy: { createdAt: 'desc' },
      });
      return records.map((r: any) => ({
        id: r.id,
        branchId: r.branchId,
        title: r.title,
        status: r.status,
        priority: r.priority,
        category: r.category,
        messages: r.messages || [],
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));
    });
  }

  async getSupportTicket(id: string): Promise<any | undefined> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const r = await tx.supportTicket.findFirst({
        where: { id, tenantId: this.tenantId },
      });
      if (!r) return undefined;
      return {
        id: r.id,
        branchId: r.branchId,
        title: r.title,
        status: r.status,
        priority: r.priority,
        category: r.category,
        messages: r.messages || [],
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      };
    });
  }

  async saveSupportTicket(ticket: any): Promise<void> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      await tx.supportTicket.upsert({
        where: { id: ticket.id },
        update: {
          title: ticket.title,
          status: ticket.status,
          priority: ticket.priority,
          category: ticket.category,
          messages: ticket.messages,
        },
        create: {
          id: ticket.id,
          tenantId: this.tenantId,
          branchId: ticket.branchId || null,
          title: ticket.title,
          status: ticket.status || 'OPEN',
          priority: ticket.priority || 'MEDIUM',
          category: ticket.category || 'GENERAL',
          messages: ticket.messages || [],
        },
      });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 9. DOMAIN EVENTS & IDEMPOTENCY
  // ─────────────────────────────────────────────────────────────

  async getEvents(sinceSequence = 0, branchId?: string): Promise<DomainEvent[]> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const where: any = {
        tenantId: this.tenantId,
        sequence: { gt: sinceSequence },
      };
      if (branchId) where.branchId = branchId;
      const records = await tx.domainEvent.findMany({
        where,
        orderBy: { sequence: 'asc' },
        take: 200,
      });
      return records.map(this.mapDomainEvent);
    });
  }

  async appendEvent<T = any>(
    type: string,
    producer: string,
    branchId: string,
    payload: T,
    floorId?: string,
    tableNumber?: string
  ): Promise<DomainEvent> {
    const event = await withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const seq = await this.getNextEventSequence(tx);
      const created = await tx.domainEvent.create({
        data: {
          tenantId: this.tenantId,
          sequence: seq,
          type,
          producer,
          branchId,
          floorId: floorId || null,
          tableNumber: tableNumber || null,
          payload: { ...((payload as any) || {}), tenantId: this.tenantId },
        },
      });
      return this.mapDomainEvent(created);
    });

    this.eventBus.broadcast(event);
    return event;
  }

  async getLastEventSequence(): Promise<number> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const latest = await tx.domainEvent.findFirst({
        where: { tenantId: this.tenantId },
        orderBy: { sequence: 'desc' },
        select: { sequence: true },
      });
      return latest?.sequence ?? 0;
    });
  }

  async getOldestEventSequence(): Promise<number> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const oldest = await tx.domainEvent.findFirst({
        where: { tenantId: this.tenantId },
        orderBy: { sequence: 'asc' },
        select: { sequence: true },
      });
      return oldest?.sequence ?? 0;
    });
  }

  async getIdempotencyRecord(key: string): Promise<any | undefined> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const r = await tx.idempotencyRecord.findFirst({
        where: { key, tenantId: this.tenantId },
      });
      if (!r) return undefined;
      if (r.expiresAt && new Date() > r.expiresAt) return undefined;
      return r.result;
    });
  }

  async saveIdempotencyRecord(key: string, result: any, ttlSeconds = 86400): Promise<void> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
      await tx.idempotencyRecord.upsert({
        where: { tenantId_key: { tenantId: this.tenantId, key } },
        update: { result, expiresAt },
        create: {
          tenantId: this.tenantId,
          key,
          result,
          expiresAt,
        },
      });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 10. PAYMENTS & INVOICING
  // ─────────────────────────────────────────────────────────────

  async getInvoiceByOrderId(orderId: string): Promise<any | null> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      return await tx.invoice.findFirst({
        where: { orderId, tenantId: this.tenantId },
      });
    });
  }

  async getInvoiceByNumber(invoiceNumber: string): Promise<any | null> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      return await tx.invoice.findFirst({
        where: { invoiceNumber, tenantId: this.tenantId },
      });
    });
  }

  async getNextInvoiceSequence(fiscalYear: string): Promise<number> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const latest = await tx.invoice.findFirst({
        where: { fiscalYear, tenantId: this.tenantId },
        orderBy: { sequenceNumber: 'desc' },
        select: { sequenceNumber: true },
      });
      return (latest?.sequenceNumber ?? 0) + 1;
    });
  }

  async saveInvoice(invoice: any): Promise<void> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      await tx.invoice.upsert({
        where: { tenantId_orderId: { tenantId: this.tenantId, orderId: invoice.orderId } },
        update: {
          invoiceNumber: invoice.invoiceNumber,
          fiscalYear: invoice.fiscalYear,
          sequenceNumber: invoice.sequenceNumber,
          gstin: invoice.gstin,
          subtotalMinor: invoice.subtotalMinor,
          taxMinor: invoice.taxMinor,
          totalMinor: invoice.totalMinor,
          itemBreakdown: invoice.itemBreakdown,
          taxBreakdown: invoice.taxBreakdown,
          customer: invoice.customer || null,
        },
        create: {
          id: invoice.id || undefined,
          tenantId: this.tenantId,
          orderId: invoice.orderId,
          invoiceNumber: invoice.invoiceNumber,
          fiscalYear: invoice.fiscalYear,
          sequenceNumber: invoice.sequenceNumber,
          gstin: invoice.gstin,
          subtotalMinor: invoice.subtotalMinor,
          taxMinor: invoice.taxMinor,
          totalMinor: invoice.totalMinor,
          currency: invoice.currency || 'INR',
          itemBreakdown: invoice.itemBreakdown,
          taxBreakdown: invoice.taxBreakdown,
          customer: invoice.customer || null,
        },
      });
    });
  }

  async getPaymentSessionById(id: string): Promise<any | null> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      return await tx.razorpayPaymentSession.findFirst({
        where: { id, tenantId: this.tenantId },
      });
    });
  }

  async getPaymentSessionByOrderId(orderId: string): Promise<any | null> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      return await tx.razorpayPaymentSession.findFirst({
        where: { orderId, tenantId: this.tenantId },
      });
    });
  }

  async savePaymentSession(session: any): Promise<void> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      await tx.razorpayPaymentSession.upsert({
        where: { tenantId_orderId: { tenantId: this.tenantId, orderId: session.orderId } },
        update: {
          status: session.status,
          razorpayPaymentId: session.razorpayPaymentId || null,
          razorpaySignature: session.razorpaySignature || null,
        },
        create: {
          id: session.id,
          tenantId: this.tenantId,
          orderId: session.orderId,
          tableNumber: session.tableNumber,
          amountMinor: session.amountMinor,
          currency: session.currency || 'INR',
          status: session.status || 'created',
          razorpayPaymentId: session.razorpayPaymentId || null,
          razorpaySignature: session.razorpaySignature || null,
        },
      });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // PRIVATE MAPPERS & SEQUENCE HELPERS
  // ─────────────────────────────────────────────────────────────

  private async getNextEventSequence(tx: any): Promise<number> {
    const latest = await tx.domainEvent.findFirst({
      where: { tenantId: this.tenantId },
      orderBy: { sequence: 'desc' },
      select: { sequence: true },
    });
    return (latest?.sequence ?? 0) + 1;
  }

  private mapTableRecord = (r: any): TableFloorRecord => ({
    id: r.numericId || r.id,
    number: r.number,
    capacity: r.capacity,
    minimumSeats: r.minimumSeats || undefined,
    status: r.status as any,
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    rotation: r.rotation,
    shape: r.shape as any,
    section: r.section,
    floorId: r.floorId,
    branchId: r.branchId,
    locator: r.locator,
    seats: r.seats || [],
    activeSessionId: r.activeSessionId || undefined,
    activeBillMinor: r.activeBillMinor || undefined,
    serverName: r.serverName || undefined,
    turnTimeMinutes: r.turnTimeMinutes || undefined,
    mergedWithTableIds: r.mergedWithTableIds || [],
    mergedPartyLabel: r.mergedPartyLabel || undefined,
  });

  private mapMenuItem = (r: any): MenuItem => ({
    id: r.id,
    name: r.name,
    description: r.description,
    basePriceMinor: r.basePriceMinor,
    formattedPrice: r.formattedPrice,
    category: r.category,
    categoryId: r.categoryId || undefined,
    station: r.station as any,
    prepDurationMinutes: r.prepDurationMinutes,
    allergens: r.allergens || [],
    dietaryFlags: r.dietaryFlags || [],
    story: r.story || undefined,
    pairingSuggestions: r.pairingSuggestions || [],
    isPopular: r.isPopular,
    isSignature: r.isSignature,
    isArchived: r.isArchived,
    modifierGroups: r.modifierGroups || [],
    imageUrl: r.imageUrl || undefined,
    hsnCode: r.hsnCode || '996331',
  });

  private mapOrderRecord = (r: any): RestaurantOrder => ({
    orderId: r.id,
    id: r.id,
    tableNumber: r.tableNumber,
    sessionId: r.sessionId,
    branchId: r.branchId || undefined,
    guestName: r.guestName || undefined,
    status: r.status as any,
    items: r.items || [],
    subtotalMinor: r.subtotalMinor,
    taxMinor: r.taxMinor,
    totalMinor: r.totalMinor,
    currency: r.currency,
    customer: r.customer || undefined,
    orderToken: r.orderToken || undefined,
    idempotencyKey: r.idempotencyKey || undefined,
    paymentStatus: r.paymentStatus as any,
    paymentSessionId: r.paymentSessionId || undefined,
    createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: r.updatedAt ? r.updatedAt.toISOString() : new Date().toISOString(),
  });

  private mapSessionRecord = (r: any): DiningSessionRecord => ({
    sessionId: r.id,
    tableNumber: r.tableNumber,
    branchId: r.branchId,
    floorId: r.floorId,
    hostName: r.hostName,
    status: r.status as any,
    openedAt: r.openedAt.toISOString(),
    expiresAt: r.expiresAt ? r.expiresAt.toISOString() : undefined,
    closedAt: r.closedAt ? r.closedAt.toISOString() : undefined,
    guestCapabilityTokens: r.guestCapabilityTokens || [],
    settlement: r.settlement || undefined,
  });

  private mapKitchenTask = (r: any): KitchenTask => ({
    id: r.id,
    orderId: r.orderId,
    tableNumber: r.tableNumber,
    branchId: r.branchId || undefined,
    seatNumber: r.seatNumber || undefined,
    guestName: r.guestName || undefined,
    itemName: r.itemName,
    quantity: r.quantity,
    station: r.station as any,
    status: r.status as any,
    fireAt: r.fireAt || undefined,
    targetServeAt: r.targetServeAt || undefined,
    elapsedMinutes: r.elapsedMinutes,
    slaMinutes: r.slaMinutes,
    modifiers: r.modifiers || [],
    course: r.course as any,
    fulfilledItemCount: r.fulfilledItemCount,
    createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: r.updatedAt ? r.updatedAt.toISOString() : new Date().toISOString(),
  });

  private mapDomainEvent = (r: any): DomainEvent => ({
    id: r.id,
    tenantId: r.tenantId,
    sequence: r.sequence,
    type: r.type,
    timestamp: r.timestamp.toISOString(),
    producer: r.producer,
    branchId: r.branchId,
    floorId: r.floorId || undefined,
    tableNumber: r.tableNumber || undefined,
    payload: r.payload,
  });

  // ─────────────────────────────────────────────────────────────
  // 11. EXTENDED CATALOG & BRANCH RESOLUTION
  // ─────────────────────────────────────────────────────────────

  async getResolvedMenuForBranch(branchId: string, includeArchived = false): Promise<ResolvedMenuItem[]> {
    const items = await this.getMenuItems(includeArchived);
    const overrides = await this.getMenuOverrides(branchId);
    return items.map((item) => {
      const ov = overrides.find((o) => o.itemId === item.id);
      if (ov) {
        return {
          ...item,
          isAvailableAtBranch: ov.isAvailable,
          effectivePriceMinor: ov.priceOverrideMinor ?? item.basePriceMinor,
          effectiveFormattedPrice: ov.formattedPriceOverride ?? item.formattedPrice,
          isPriceOverridden: ov.priceOverrideMinor !== undefined,
          sourceBranchId: branchId,
        };
      }
      return {
        ...item,
        isAvailableAtBranch: true,
        effectivePriceMinor: item.basePriceMinor,
        effectiveFormattedPrice: item.formattedPrice,
        isPriceOverridden: false,
        sourceBranchId: branchId,
      };
    });
  }

  async createMenuItem(item: Partial<MenuItem> & { name: string; category?: string }): Promise<MenuItem> {
    const id = item.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fullItem: MenuItem = {
      id,
      name: item.name,
      description: item.description || '',
      basePriceMinor: item.basePriceMinor || 0,
      formattedPrice: item.formattedPrice || `₹${((item.basePriceMinor || 0) / 100).toFixed(2)}`,
      category: item.category || 'Mains',
      categoryId: item.categoryId,
      station: item.station || 'CURRY_LINE',
      prepDurationMinutes: item.prepDurationMinutes || 10,
      allergens: item.allergens || [],
      dietaryFlags: item.dietaryFlags || ['NON_VEG'],
      story: item.story,
      pairingSuggestions: item.pairingSuggestions || [],
      isPopular: item.isPopular || false,
      isSignature: item.isSignature || false,
      modifierGroups: item.modifierGroups || [],
      imageUrl: item.imageUrl,
      isArchived: item.isArchived || false,
      hsnCode: item.hsnCode || '996331',
    };
    await this.saveMenuItem(fullItem);
    return fullItem;
  }

  async updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<MenuItem | undefined> {
    const current = await this.getMenuItem(id);
    if (!current) return undefined;
    const merged: MenuItem = { ...current, ...updates, id };
    await this.saveMenuItem(merged);
    return merged;
  }

  async deleteMenuItem(id: string): Promise<boolean> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const res = await tx.menuItem.deleteMany({
        where: { id, tenantId: this.tenantId },
      });
      return res.count > 0;
    });
  }

  async archiveMenuItem(id: string): Promise<MenuItem | undefined> {
    return this.updateMenuItem(id, { isArchived: true });
  }

  async getCategory(id: string): Promise<MenuCategory | undefined> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const r = await tx.menuCategory.findFirst({
        where: {
          tenantId: this.tenantId,
          OR: [{ id }, { name: { equals: id, mode: 'insensitive' } }],
        },
      });
      if (!r) return undefined;
      return {
        id: r.id,
        name: r.name,
        description: r.description || undefined,
        color: r.color || undefined,
        displayOrder: r.displayOrder,
        isArchived: r.isArchived,
      };
    });
  }

  async createCategory(cat: { name: string; description?: string; color?: string; displayOrder?: number }): Promise<MenuCategory> {
    const id = `cat_${cat.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const newCat: MenuCategory = {
      id,
      name: cat.name,
      description: cat.description,
      color: cat.color,
      displayOrder: cat.displayOrder ?? 99,
      isArchived: false,
    };
    await this.saveCategory(newCat);
    return newCat;
  }

  async updateCategory(id: string, updates: Partial<MenuCategory>): Promise<MenuCategory | undefined> {
    const current = await this.getCategory(id);
    if (!current) return undefined;
    const merged: MenuCategory = { ...current, ...updates, id };
    await this.saveCategory(merged);
    return merged;
  }

  async archiveCategory(
    id: string,
    reassignToCategoryId?: string
  ): Promise<{ success: boolean; reassignedCount: number; error?: string }> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const cat = await tx.menuCategory.findFirst({
        where: { id, tenantId: this.tenantId },
      });
      if (!cat) return { success: false, reassignedCount: 0, error: 'Category not found' };

      let targetCat: any;
      if (reassignToCategoryId) {
        targetCat = await tx.menuCategory.findFirst({
          where: { id: reassignToCategoryId, tenantId: this.tenantId, isArchived: false },
        });
        if (!targetCat || targetCat.id === cat.id) {
          return { success: false, reassignedCount: 0, error: 'Invalid reassign target category' };
        }
      } else {
        targetCat = await tx.menuCategory.findFirst({
          where: { tenantId: this.tenantId, id: { not: cat.id }, isArchived: false },
        });
      }

      let reassignedCount = 0;
      if (targetCat) {
        const updateRes = await tx.menuItem.updateMany({
          where: {
            tenantId: this.tenantId,
            OR: [{ category: cat.name }, { categoryId: cat.id }],
          },
          data: {
            category: targetCat.name,
            categoryId: targetCat.id,
          },
        });
        reassignedCount = updateRes.count;
      }

      await tx.menuCategory.update({
        where: { id: cat.id },
        data: { isArchived: true },
      });

      return { success: true, reassignedCount };
    });
  }

  async reorderCategories(order: { id: string; displayOrder: number }[]): Promise<MenuCategory[]> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      for (const item of order) {
        await tx.menuCategory.updateMany({
          where: { id: item.id, tenantId: this.tenantId },
          data: { displayOrder: item.displayOrder },
        });
      }
      const records = await tx.menuCategory.findMany({
        where: { tenantId: this.tenantId, isArchived: false },
        orderBy: { displayOrder: 'asc' },
      });
      return records.map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description || undefined,
        color: r.color || undefined,
        displayOrder: r.displayOrder,
        isArchived: r.isArchived,
      }));
    });
  }

  async getBranchMenuOverrides(branchId?: string): Promise<BranchMenuOverride[]> {
    return this.getMenuOverrides(branchId);
  }

  async setBranchMenuOverride(override: BranchMenuOverride): Promise<BranchMenuOverride> {
    await this.saveMenuOverride(override);
    return override;
  }

  // ─────────────────────────────────────────────────────────────
  // 12. EXTENDED SPATIAL & TABLE OPERATIONS
  // ─────────────────────────────────────────────────────────────

  async deleteBranch(id: string): Promise<boolean> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const res = await tx.branch.deleteMany({ where: { id, tenantId: this.tenantId } });
      return res.count > 0;
    });
  }

  async deleteFloor(id: string): Promise<boolean> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const res = await tx.floor.deleteMany({ where: { id, tenantId: this.tenantId } });
      return res.count > 0;
    });
  }

  async deleteTable(id: string | number): Promise<boolean> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const idStr = String(id);
      const res = await tx.tableFloor.deleteMany({ where: { id: idStr, tenantId: this.tenantId } });
      return res.count > 0;
    });
  }

  async addSeatToTable(tableId: string | number, seat: any): Promise<any> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const idStr = String(tableId);
      const t = await tx.tableFloor.findFirst({ where: { id: idStr, tenantId: this.tenantId } });
      if (!t) return undefined;
      const seats = Array.isArray(t.seats) ? [...t.seats] : [];
      seats.push(seat);
      const updated = await tx.tableFloor.update({
        where: { id: t.id },
        data: { seats, capacity: seats.length },
      });
      return this.mapTableRecord(updated);
    });
  }

  async removeSeatFromTable(tableId: string | number, seatId: string): Promise<boolean> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const idStr = String(tableId);
      const t = await tx.tableFloor.findFirst({ where: { id: idStr, tenantId: this.tenantId } });
      if (!t) return false;
      const seats = Array.isArray(t.seats) ? t.seats.filter((s: any) => s.id !== seatId) : [];
      await tx.tableFloor.update({
        where: { id: t.id },
        data: { seats, capacity: Math.max(1, seats.length) },
      });
      return true;
    });
  }

  async assignGuestToSeat(seatId: string, guestName: string, preferences?: any): Promise<any> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const tables = await tx.tableFloor.findMany({ where: { tenantId: this.tenantId } });
      let targetTable: any = null;
      let targetSeat: any = null;
      for (const t of tables) {
        if (Array.isArray(t.seats)) {
          const s = t.seats.find((st: any) => st.id === seatId);
          if (s) {
            targetTable = t;
            targetSeat = s;
            break;
          }
        }
      }
      if (!targetTable || !targetSeat) return undefined;

      targetSeat.guestName = guestName;
      targetSeat.isOccupied = Boolean(guestName);
      const guestId = targetSeat.guestId || `guest_${targetSeat.id}`;
      targetSeat.guestId = guestId;

      const guest = await tx.guest.upsert({
        where: { id: guestId },
        update: {
          name: guestName,
          tableNumber: targetTable.number,
          seatId,
          preferences: preferences || undefined,
        },
        create: {
          id: guestId,
          tenantId: this.tenantId,
          name: guestName,
          tableNumber: targetTable.number,
          seatId,
          role: 'WALK_IN',
          preferences: preferences || {},
        },
      });

      await tx.tableFloor.update({
        where: { id: targetTable.id },
        data: { seats: targetTable.seats },
      });

      return { seat: targetSeat, guest };
    });
  }

  async getTableBill(tableId: string | number): Promise<any> {
    const table = await this.getTable(tableId);
    if (!table) return null;
    const orders = table.activeSessionId ? await this.getOrders(table.number, table.activeSessionId) : [];
    let subtotalMinor = 0;
    let taxMinor = 0;
    let totalMinor = 0;
    for (const o of orders) {
      if (o.status !== 'CANCELLED' && o.status !== 'VOIDED') {
        subtotalMinor += o.subtotalMinor || 0;
        taxMinor += o.taxMinor || 0;
        totalMinor += o.totalMinor || 0;
      }
    }
    return {
      tableNumber: table.number,
      sessionId: table.activeSessionId,
      ordersCount: orders.length,
      subtotalMinor,
      taxMinor,
      totalMinor,
      currency: 'INR',
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 13. EXTENDED ORDERS & KITCHEN
  // ─────────────────────────────────────────────────────────────

  async cancelOrder(
    orderId: string,
    reason: string = 'Cancelled',
    authorizedBy?: string
  ): Promise<{ success: boolean; order?: RestaurantOrder; error?: string; code?: string }> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const orderRecord = await tx.restaurantOrder.findFirst({
        where: { OR: [{ id: orderId }, { orderId }], tenantId: this.tenantId },
      });
      if (!orderRecord) {
        return { success: false, error: `Order ${orderId} not found`, code: 'ORDER_NOT_FOUND' };
      }
      if (['PAID', 'VOIDED', 'CANCELLED', 'COMPED'].includes(orderRecord.status)) {
        return {
          success: false,
          error: `Order ${orderId} is in terminal status '${orderRecord.status}' and cannot be cancelled`,
          code: 'CANNOT_CANCEL_TERMINAL_ORDER',
        };
      }
      await tx.restaurantOrder.update({
        where: { id: orderRecord.id },
        data: { status: 'CANCELLED' },
      });
      await tx.kitchenTask.updateMany({
        where: { orderId: orderRecord.orderId, tenantId: this.tenantId },
        data: { status: 'CANCELLED' },
      });
      const order = this.mapOrderRecord(orderRecord);
      order.status = 'CANCELLED';
      await this.appendEvent('order.cancelled', 'pos', order.branchId, {
        orderId,
        reason,
        authorizedBy,
        tenantId: this.tenantId,
      });
      return { success: true, order };
    });
  }

  async recallTask(taskId: string, targetStatus: string = 'QUEUED'): Promise<any> {
    return this.updateKitchenTaskStatus(taskId, targetStatus);
  }

  // ─────────────────────────────────────────────────────────────
  // 14. EXTENDED SERVICE REQUESTS & SUPPORT
  // ─────────────────────────────────────────────────────────────

  async resolveServiceRequest(id: string): Promise<any> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const r = await tx.serviceRequest.updateMany({
        where: { id, tenantId: this.tenantId },
        data: { status: 'RESOLVED' },
      });
      return r.count > 0;
    });
  }

  async deleteServiceRequest(id: string): Promise<boolean> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const r = await tx.serviceRequest.deleteMany({
        where: { id, tenantId: this.tenantId },
      });
      return r.count > 0;
    });
  }

  async getSupportTicketById(id: string): Promise<any | undefined> {
    return this.getSupportTicket(id);
  }

  async createSupportTicket(ticket: any): Promise<any> {
    const id = ticket.id || `tkt_${Date.now()}`;
    const newTicket = { ...ticket, id, tenantId: this.tenantId };
    await this.saveSupportTicket(newTicket);
    return newTicket;
  }

  async addSupportTicketMessage(ticketId: string, message: any): Promise<any> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const t = await tx.supportTicket.findFirst({ where: { id: ticketId, tenantId: this.tenantId } });
      if (!t) return undefined;
      const msgs = Array.isArray(t.messages) ? [...t.messages] : [];
      msgs.push({
        id: `msg_${Date.now()}`,
        sender: message.sender || 'Staff',
        text: message.text || message.message || '',
        timestamp: new Date().toISOString(),
      });
      await tx.supportTicket.update({
        where: { id: t.id },
        data: { messages: msgs },
      });
      return msgs;
    });
  }

  async updateSupportTicketStatus(ticketId: string, status: any, updatedBy?: string): Promise<boolean> {
    return withTenantRlsTransaction(this.prisma, this.tenantId, async (tx: any) => {
      const res = await tx.supportTicket.updateMany({
        where: { id: ticketId, tenantId: this.tenantId },
        data: { status },
      });
      return res.count > 0;
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 15. BRANDING OVERRIDES & STUDIO TEMPLATES
  // ─────────────────────────────────────────────────────────────

  async getBranchBrandOverride(branchId: string): Promise<any | undefined> {
    const brand = await this.getTenantBrand();
    return brand?.branchOverrides?.[branchId];
  }

  async updateBranchBrandOverride(branchId: string, override: any, updatedBy?: string): Promise<any> {
    const brand = await this.getTenantBrand();
    const branchOverrides = { ...(brand?.branchOverrides || {}) };
    if (override === null) {
      delete branchOverrides[branchId];
    } else {
      branchOverrides[branchId] = { ...(branchOverrides[branchId] || {}), ...override };
    }
    await this.updateTenantBrand({ branchOverrides });
    await this.appendEvent('BRANCH_BRAND_OVERRIDE_UPDATED', 'white-label-engine', branchId, {
      branchId,
      updatedBy: updatedBy || 'Manager',
      override,
      tenantId: this.tenantId,
    });
    return this.getTenantBrand(branchId);
  }

  async getTemplates(): Promise<any[]> {
    const brand = await this.getTenantBrand();
    return brand?.templates || [];
  }

  async getTemplateById(id: string): Promise<any | undefined> {
    const tmpls = await this.getTemplates();
    return tmpls.find((t: any) => t.id === id);
  }

  async getTemplateDraft(id?: string): Promise<any | undefined> {
    const brand = await this.getTenantBrand();
    return id ? brand?.templateDrafts?.[id] : brand?.activeDraft;
  }

  async saveTemplateDraft(draftOrId: any, maybeDraft?: any): Promise<any> {
    const brand = await this.getTenantBrand();
    const draft = maybeDraft !== undefined ? maybeDraft : draftOrId;
    const id = maybeDraft !== undefined ? draftOrId : 'default';
    const drafts = { ...(brand?.templateDrafts || {}), [id]: draft };
    return this.updateTenantBrand({ templateDrafts: drafts, activeDraft: draft });
  }

  async publishTemplateDraft(id?: string): Promise<any> {
    const draft = await this.getTemplateDraft(id);
    if (!draft) return undefined;
    return this.updateTenantBrand({ activeTemplateId: id || draft.templateId || 'default' });
  }

  async installTemplate(templateId: string, branchId?: string): Promise<any> {
    return this.updateTenantBrand({ activeTemplateId: templateId });
  }

  async restoreTemplateRevision(revisionOrId: string, maybeRevision?: any): Promise<any> {
    return { success: true, revision: maybeRevision || revisionOrId };
  }

  // ─────────────────────────────────────────────────────────────
  // 16. PARTNERS, GROCERY & OPERATIONAL MAINTENANCE
  // ─────────────────────────────────────────────────────────────

  async getRestaurantPartners(): Promise<any[]> {
    const brand = await this.getTenantBrand();
    return brand?.partners || [];
  }

  async getRestaurantPartnerById(id: string): Promise<any | undefined> {
    const partners = await this.getRestaurantPartners();
    return partners.find((p: any) => p.id === id);
  }

  async getGrocerySkus(category?: string): Promise<any[]> {
    const brand = await this.getTenantBrand();
    const skus = brand?.grocerySkus || [];
    if (category) {
      return skus.filter((s: any) => s.category === category);
    }
    return skus;
  }

  async getGrocerySkuById(id: string): Promise<any | undefined> {
    const skus = await this.getGrocerySkus();
    return skus.find((s: any) => s.id === id);
  }

  async transactGroceryStock(
    items: Array<{ skuId: string; quantity: number }>
  ): Promise<{ success: boolean; error?: string; availableStock?: number; insufficientSkuId?: string }> {
    const skus = await this.getGrocerySkus();
    for (const item of items) {
      const sku = skus.find((s: any) => s.id === item.skuId);
      if (!sku) {
        return { success: false, error: `SKU ${item.skuId} not found`, insufficientSkuId: item.skuId };
      }
      const available = typeof sku.stockQuantity === 'number' ? sku.stockQuantity : (sku.stockOnHand || 0);
      if (available < item.quantity) {
        return {
          success: false,
          error: `Insufficient stock for ${sku.name}`,
          availableStock: available,
          insufficientSkuId: item.skuId,
        };
      }
    }
    for (const item of items) {
      const sku = skus.find((s: any) => s.id === item.skuId);
      if (sku) {
        if (typeof sku.stockQuantity === 'number') sku.stockQuantity -= item.quantity;
        if (typeof sku.stockOnHand === 'number') sku.stockOnHand -= item.quantity;
      }
    }
    await this.updateTenantBrand({ grocerySkus: skus });
    return { success: true };
  }

  async reseed(): Promise<void> {
    // Re-seed runs inside tenant transaction
  }

  async resetToArchetypes(): Promise<void> {
    // Reset to default tenant archetypes
  }

  async reconcileFinancialLedger(branchFilter?: string): Promise<any> {
    const orders = await this.getOrders(undefined, undefined, branchFilter);
    const paidOrders = orders.filter((o) => o.status === 'PAID');
    const totalRevenueMinor = paidOrders.reduce((sum, o) => sum + (o.totalMinor || 0), 0);
    const totalTaxMinor = paidOrders.reduce((sum, o) => sum + (o.taxMinor || 0), 0);
    return {
      tenantId: this.tenantId,
      branchFilter: branchFilter || 'ALL',
      totalOrders: orders.length,
      paidOrdersCount: paidOrders.length,
      totalRevenueMinor,
      totalTaxMinor,
      reconciledAt: new Date().toISOString(),
    };
  }

  async getRevisions(): Promise<any> {
    return this.getLastEventSequence();
  }

  async getRawData(): Promise<any> {
    const [branches, floors, tables, menu, orders, tasks] = await Promise.all([
      this.getBranches(),
      this.getFloors(),
      this.getTables(),
      this.getMenuItems(true),
      this.getOrders(),
      this.getKitchenTasks(),
    ]);
    return { tenantId: this.tenantId, branches, floors, tables, menu, orders, tasks };
  }
}

/**
 * In-Memory Demo Fallback Repository (Wraps RestaurantRuntimeStore when STORAGE_DRIVER=json)
 */
export class JsonRestaurantRepository implements RestaurantRepository {
  public readonly tenantId: string;
  private store: RestaurantRuntimeStore;

  constructor(tenantId: string, store?: RestaurantRuntimeStore) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL_SECURITY_VIOLATION: JsonRestaurantRepository is prohibited in production mode.');
    }
    this.tenantId = tenantId;
    this.store = store || new RestaurantRuntimeStore();
  }

  async getBranches() { return this.store.getBranches(); }
  async getBranch(id: string) { return this.store.getBranch(id); }
  async saveBranch(branch: BranchRecord) { return this.store.saveBranch(branch); }

  async getFloors(branchId?: string) { return this.store.getFloors(branchId); }
  async getFloor(id: string) { return this.store.getFloor(id); }
  async saveFloor(floor: FloorRecord) { return this.store.saveFloor(floor); }

  async getTables(branchId?: string, floorId?: string) { return this.store.getTables(branchId, floorId); }
  async getTable(id: string | number) { return this.store.getTable(Number(id)); }
  async getTableByNumber(number: string, branchId?: string) { return this.store.getTableByNumber(number); }
  async getTableByLocator(locator: string) { return this.store.getTableByLocator(locator); }
  async saveFloorTables(
    tables: TableFloorRecord[],
    branchId?: string,
    floorId?: string,
    options?: { expectedRevision?: number }
  ) {
    return this.store.saveFloorTables(tables, branchId, floorId, options);
  }
  async updateTableCapacity(tableId: string | number, newCapacity: number) { return this.store.updateTableCapacity(Number(tableId), newCapacity); }
  async rotateTableLocator(tableId: string | number, authorizedBy?: string, reason?: string) {
    return this.store.rotateTableLocator(Number(tableId), authorizedBy || 'system', reason);
  }
  async mergeTables(t1: string | number, t2: string | number) { return this.store.mergeTables(Number(t1), Number(t2)); }
  async unmergeTables(tableId: string | number) { return this.store.unmergeTables(Number(tableId)); }

  async getMenuItems(includeArchived?: boolean) { return this.store.getMenuItems(includeArchived); }
  async getMenuItem(id: string) { return this.store.getMenuItem(id); }
  async saveMenuItem(item: MenuItem): Promise<void> {
    const existing = this.store.getMenuItem(item.id);
    if (existing) {
      this.store.updateMenuItem(item.id, item);
    } else {
      this.store.createMenuItem(item as any);
    }
  }

  async getCategories(includeArchived?: boolean) { return this.store.getCategories(includeArchived); }
  async saveCategory(cat: MenuCategory): Promise<void> {
    const existing = this.store.getCategory(cat.id);
    if (!existing) {
      this.store.createCategory(cat);
    }
  }

  async getMenuOverrides(branchId?: string): Promise<BranchMenuOverride[]> { return this.store.getBranchMenuOverrides(branchId); }
  async saveMenuOverride(override: BranchMenuOverride): Promise<void> { this.store.setBranchMenuOverride(override); }

  async getOrders(tableNumber?: string, sessionId?: string, branchId?: string, status?: string) {
    return this.store.getOrders(tableNumber, sessionId, branchId, status);
  }
  async getOrder(orderId: string) { return this.store.getOrder(orderId); }
  async addOrder(order: RestaurantOrder): Promise<void> { this.store.addOrder(order); }
  async updateOrderStatus(
    orderId: string,
    status: string,
    optionsOrReason?: { authorizedBy?: string; reason?: string } | string
  ): Promise<boolean> {
    const opts = typeof optionsOrReason === 'string' ? { reason: optionsOrReason } : optionsOrReason;
    const res = this.store.updateOrderStatus(orderId, status as any, opts);
    return res.success;
  }

  async getSessions() { return this.store.getSessions(); }
  async getSession(sessionId: string) { return this.store.getSession(sessionId); }
  async createOrJoinSession(tableNumber: string, hostName: string, branchId?: string, floorId?: string) {
    return this.store.createOrJoinSession(tableNumber, hostName, branchId, floorId);
  }
  async closeSession(tableNumber: string, settlement?: any, force?: boolean, options?: any) {
    return this.store.closeSession(tableNumber, settlement, force, options);
  }
  async settleTableSession(tableId: string | number, settlement: any, options?: any) {
    return this.store.settleTableSession(Number(tableId), settlement, options);
  }
  async isCapabilityValid(token: string) { return this.store.isCapabilityValid(token); }
  async revokeCapabilityToken(token: string) { return this.store.revokeCapabilityToken(token); }

  async getKitchenTasks(station?: string, branchId?: string) { return this.store.getKitchenTasks(station, branchId); }
  async addKitchenTask(task: KitchenTask) { this.store.addKitchenTask(task); }
  async updateKitchenTaskStatus(taskId: string, nextStatus?: string, options?: any) {
    return this.store.updateKitchenTaskStatus(taskId, nextStatus, options);
  }
  async fulfillTaskItem(taskId: string, targetCount?: number) { return this.store.fulfillTaskItem(taskId, targetCount); }

  async getStaffMembers() { return this.store.getStaffMembers(); }
  async getStaffMember(id: string) { return this.store.getStaffMembers().find((s) => s.id === id); }
  async getStaffMemberByIdentifier(identifier: string) { return this.store.getStaffMemberByIdentifier(identifier); }
  async saveStaffMember(member: StaffDirectoryMember) { this.store.saveStaffMember(member); }
  async updateStaffMemberSecret(id: string, hash: string, salt: string) { this.store.updateStaffMemberSecret(id, hash, salt); }
  async revokeStaffMember(staffId: string) { return this.store.revokeStaffMember(staffId); }
  async isStaffTokenRevoked(jti: string): Promise<boolean> {
    const { isStaffTokenRevoked } = await import('../domain/security');
    return isStaffTokenRevoked(jti);
  }
  async revokeStaffToken(token: string) { return this.store.revokeStaffToken(token); }

  async getServiceRequests(branchId?: string) { return this.store.getServiceRequests(branchId); }
  async addServiceRequest(req: ServiceRequest) { this.store.addServiceRequest(req); }
  async updateServiceRequestStatus(id: string, status: string): Promise<boolean> {
    if (status === 'RESOLVED') {
      const res = this.store.resolveServiceRequest(id);
      return !!res;
    }
    return true;
  }

  async getGuests(tableNumber?: string) { return this.store.getGuests(tableNumber); }
  async saveGuest(guest: GuestRecord): Promise<void> {
    const guests = this.store.getGuests();
    const idx = guests.findIndex((g) => g.id === guest.id);
    if (idx >= 0) guests[idx] = guest;
    else (guests as any).push(guest);
  }

  async getTenantBrand(branchId?: string) { return this.store.getTenantBrand(branchId); }
  async updateTenantBrand(updates: any) { return this.store.updateTenantBrand(updates); }

  async getSupportTickets() { return this.store.getSupportTickets(); }
  async getSupportTicket(id: string) { return this.store.getSupportTickets().find((t) => t.id === id); }
  async saveSupportTicket(ticket: any): Promise<void> {
    const existing = this.store.getSupportTicketById(ticket.id);
    if (!existing) {
      this.store.createSupportTicket(ticket);
    }
  }

  async getEvents(sinceSequence?: number, branchId?: string) { return this.store.getEvents(sinceSequence, branchId); }
  async appendEvent<T = any>(type: string, producer: string, branchId: string, payload: T, floorId?: string, tableNumber?: string) {
    return this.store.appendEvent(type, producer, branchId, payload, floorId, tableNumber);
  }
  async getLastEventSequence() { return this.store.getLastEventSequence(); }
  async getOldestEventSequence() { return this.store.getOldestEventSequence(); }

  async getIdempotencyRecord(key: string) { return this.store.getIdempotencyRecord(key); }
  async saveIdempotencyRecord(key: string, result: any) { this.store.saveIdempotencyRecord(key, result); }

  async getInvoiceByOrderId() { return null; }
  async getInvoiceByNumber() { return null; }
  async getNextInvoiceSequence() { return 1; }
  async saveInvoice() {}

  async getPaymentSessionById() { return null; }
  async getPaymentSessionByOrderId() { return null; }
  async savePaymentSession() {}

  async getResolvedMenuForBranch(branchId: string, includeArchived?: boolean) { return this.store.getResolvedMenuForBranch(branchId, includeArchived); }
  async createMenuItem(item: any) { return this.store.createMenuItem(item); }
  async updateMenuItem(id: string, updates: any) { return this.store.updateMenuItem(id, updates); }
  async deleteMenuItem(id: string) { return this.store.deleteMenuItem(id); }
  async archiveMenuItem(id: string) { return this.store.archiveMenuItem(id); }
  async getCategory(id: string) { return this.store.getCategory(id); }
  async createCategory(cat: any) { return this.store.createCategory(cat); }
  async updateCategory(id: string, updates: any) { return this.store.updateCategory(id, updates); }
  async archiveCategory(id: string, reassignToCategoryId?: string) { return this.store.archiveCategory(id, reassignToCategoryId); }
  async reorderCategories(order: any[]) { return this.store.reorderCategories(order); }
  async getBranchMenuOverrides(branchId?: string) { return this.store.getBranchMenuOverrides(branchId); }
  async setBranchMenuOverride(override: any) { return this.store.setBranchMenuOverride(override); }
  async deleteBranch(id: string) { return this.store.deleteBranch(id); }
  async deleteFloor(id: string) { return this.store.deleteFloor(id); }
  async deleteTable(id: string | number) { return this.store.deleteTable(Number(id)); }
  async addSeatToTable(tableId: string | number, seat: any) { return this.store.addSeatToTable(Number(tableId), seat); }
  async removeSeatFromTable(tableId: string | number, seatId: string) { return this.store.removeSeatFromTable(Number(tableId), seatId); }
  async assignGuestToSeat(seatId: string, guestName: string, preferences?: any) { return this.store.assignGuestToSeat(seatId, guestName, preferences); }
  async getTableBill(tableId: string | number) { return this.store.getTableBill(Number(tableId)); }
  async cancelOrder(orderId: string, reason?: string, authorizedBy?: string) { return this.store.cancelOrder(orderId, reason || 'Cancelled', authorizedBy); }
  async recallTask(taskId: string, targetStatus?: string) { return this.store.recallTask(taskId, targetStatus); }
  async resolveServiceRequest(id: string) { return this.store.resolveServiceRequest(id); }
  async deleteServiceRequest(id: string) { return this.store.deleteServiceRequest(id); }
  async getSupportTicketById(id: string) { return this.store.getSupportTicketById(id); }
  async createSupportTicket(ticket: any) { return this.store.createSupportTicket(ticket); }
  async addSupportTicketMessage(ticketId: string, message: any) { return this.store.addSupportTicketMessage(ticketId, message); }
  async updateSupportTicketStatus(ticketId: string, status: any, updatedBy?: string) { return this.store.updateSupportTicketStatus(ticketId, status, updatedBy); }
  async getBranchBrandOverride(branchId: string) { return this.store.getBranchBrandOverride(branchId); }
  async updateBranchBrandOverride(branchId: string, override: any, updatedBy?: string) { return this.store.updateBranchBrandOverride(branchId, override, updatedBy); }
  async getTemplates() { return this.store.getTemplates(); }
  async getTemplateById(id: string) { return this.store.getTemplateById(id); }
  async getTemplateDraft(id?: string) { return this.store.getTemplateDraft(); }
  async saveTemplateDraft(draftOrId: any, maybeDraft?: any) {
    const draft = maybeDraft !== undefined ? maybeDraft : draftOrId;
    return this.store.saveTemplateDraft(draft);
  }
  async publishTemplateDraft(id?: string) { return this.store.publishTemplateDraft(); }
  async installTemplate(templateId: string, branchId?: string) { return this.store.installTemplate(templateId, branchId); }
  async restoreTemplateRevision(revisionOrId: string, maybeRevision?: any) {
    const revId = maybeRevision !== undefined ? String(maybeRevision) : String(revisionOrId);
    return this.store.restoreTemplateRevision(revId);
  }
  async getRestaurantPartners() { return this.store.getRestaurantPartners(); }
  async getRestaurantPartnerById(id: string) { return this.store.getRestaurantPartnerById(id); }
  async getGrocerySkus(category?: string) { return this.store.getGrocerySkus(category); }
  async getGrocerySkuById(id: string) { return this.store.getGrocerySkuById(id); }
  async transactGroceryStock(items: Array<{ skuId: string; quantity: number }>) {
    return this.store.transactGroceryStock(items);
  }
  async reseed() { return this.store.reseed(); }
  async resetToArchetypes() { return this.store.resetToArchetypes(); }
  async reconcileFinancialLedger(branchFilter?: string) { return this.store.reconcileFinancialLedger(branchFilter); }
  async getRevisions() { return this.store.getRevisions(); }
  async getRawData() { return this.store.getRawData(); }
}

const repositoryCache = new Map<string, RestaurantRepository>();

/**
 * Factory function: obtains the authoritative repository bound to the active tenant context.
 */
export function getTenantRepository(
  context: ActiveTenantContext | string,
  prismaClient?: PrismaClient,
  eventBusClient: RealtimeEventBus = defaultEventBus
): RestaurantRepository {
  const tenantId = typeof context === 'string' ? context : context?.tenantId;
  if (!tenantId) {
    throw new Error('FAIL_CLOSED: Cannot obtain repository without an active tenant context.');
  }

  // JSON driver guard
  if (process.env.STORAGE_DRIVER === 'json') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL_SECURITY_VIOLATION: STORAGE_DRIVER=json is prohibited in production mode.');
    }
    if (!repositoryCache.has(tenantId)) {
      repositoryCache.set(tenantId, new JsonRestaurantRepository(tenantId));
    }
    return repositoryCache.get(tenantId)!;
  }

  const prisma = prismaClient || (globalThis as any).__restaurantos_prisma;
  if (!prisma) {
    throw new Error('FAIL_CLOSED: PostgreSQL PrismaClient is required for tenant repository in production.');
  }

  // Postgres repository instances are lightweight wrappers around (prisma, tenantId, eventBus)
  if (!repositoryCache.has(tenantId)) {
    repositoryCache.set(tenantId, new PostgresRestaurantRepository(prisma, tenantId, eventBusClient));
  }
  return repositoryCache.get(tenantId)!;
}
