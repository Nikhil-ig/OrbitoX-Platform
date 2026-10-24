/**
 * 🐘 RestaurantOS Multi-Tenant PostgreSQL Storage Engine (Prisma)
 * ─────────────────────────────────────────────────────────────────────────────
 * Zero-leakage multi-tenant data layer backed by PostgreSQL.
 * Every query and mutation is strictly partitioned by `tenantId`.
 *
 * Implements authoritative tenant isolation as required by AGENTS.md.
 */

import { PrismaClient } from '@prisma/client';
import {
  ActiveTenantContext,
  getActiveTenant,
} from '../domain/tenancy';
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
} from '../domain';
import { DiningSessionRecord, DomainEvent } from './store';

function parseSafeDate(val: any, fallback?: Date): Date {
  if (!val) return fallback || new Date();
  if (val instanceof Date) return isNaN(val.getTime()) ? (fallback || new Date()) : val;
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d;
  if (typeof val === 'string') {
    const s = val.trim();
    const ampmMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i.exec(s);
    if (ampmMatch) {
      let hh = parseInt(ampmMatch[1], 10);
      const mm = parseInt(ampmMatch[2], 10);
      const ss = ampmMatch[3] ? parseInt(ampmMatch[3], 10) : 0;
      const isPm = ampmMatch[4].toUpperCase() === 'PM';
      if (isPm && hh < 12) hh += 12;
      if (!isPm && hh === 12) hh = 0;
      const today = new Date();
      today.setHours(hh, mm, ss, 0);
      return today;
    }
    const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
    if (timeMatch) {
      const hh = parseInt(timeMatch[1], 10);
      const mm = parseInt(timeMatch[2], 10);
      const ss = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
      const today = new Date();
      today.setHours(hh, mm, ss, 0);
      return today;
    }
  }
  return fallback || new Date();
}

export class PostgresRestaurantStore {
  public readonly prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma =
      prismaClient ||
      new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      });
  }

  private resolveTenantId(explicitTenantId?: string): string {
    if (explicitTenantId) return explicitTenantId;
    return getActiveTenant().tenantId;
  }

  // ─────────────────────────────────────────────────────────────
  // 1. TENANT MANAGEMENT
  // ─────────────────────────────────────────────────────────────

  async ensureTenant(tenant: {
    id: string;
    name: string;
    slug: string;
    status?: string;
    orbitoxProjectId?: string;
    gstin?: string;
  }): Promise<any> {
    return this.prisma.tenant.upsert({
      where: { id: tenant.id },
      update: {
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status || 'active',
        orbitoxProjectId: tenant.orbitoxProjectId,
        gstin: tenant.gstin,
      },
      create: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status || 'active',
        orbitoxProjectId: tenant.orbitoxProjectId,
        gstin: tenant.gstin,
      },
    });
  }

  async getTenant(tenantId?: string): Promise<any | null> {
    const tid = this.resolveTenantId(tenantId);
    return this.prisma.tenant.findUnique({
      where: { id: tid },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 2. BRANCHES & FLOORS
  // ─────────────────────────────────────────────────────────────

  async getBranches(tenantId?: string): Promise<BranchRecord[]> {
    const tid = this.resolveTenantId(tenantId);
    const rows = await this.prisma.branch.findMany({
      where: { tenantId: tid },
      orderBy: { name: 'asc' },
    });
    return rows.map((r) => ({
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
      openingHours: (r.openingHours as any) || undefined,
      phone: r.phone || undefined,
      email: r.email || undefined,
    }));
  }

  async getBranch(id: string, tenantId?: string): Promise<BranchRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const r = await this.prisma.branch.findFirst({
      where: { id, tenantId: tid },
    });
    if (!r) return null;
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
      openingHours: (r.openingHours as any) || undefined,
      phone: r.phone || undefined,
      email: r.email || undefined,
    };
  }

  async saveBranch(branch: BranchRecord, tenantId?: string): Promise<void> {
    const tid = this.resolveTenantId(tenantId);
    await this.prisma.branch.upsert({
      where: { tenantId_code: { tenantId: tid, code: branch.code } },
      update: {
        name: branch.name,
        address: branch.address,
        city: branch.city,
        timezone: branch.timezone,
        currency: branch.currency,
        status: branch.status,
        serviceAreasCount: branch.serviceAreasCount,
        activeTablesCount: branch.activeTablesCount,
        openingHours: (branch.openingHours as any) || null,
        phone: branch.phone,
        email: branch.email,
      },
      create: {
        id: branch.id,
        tenantId: tid,
        name: branch.name,
        code: branch.code,
        address: branch.address,
        city: branch.city,
        timezone: branch.timezone,
        currency: branch.currency,
        status: branch.status,
        serviceAreasCount: branch.serviceAreasCount,
        activeTablesCount: branch.activeTablesCount,
        openingHours: (branch.openingHours as any) || null,
        phone: branch.phone,
        email: branch.email,
      },
    });
  }

  async getFloors(branchId?: string, tenantId?: string): Promise<FloorRecord[]> {
    const tid = this.resolveTenantId(tenantId);
    const rows = await this.prisma.floor.findMany({
      where: {
        tenantId: tid,
        ...(branchId ? { branchId } : {}),
      },
      orderBy: { name: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      branchId: r.branchId,
      name: r.name,
      type: r.type as any,
      capacity: r.capacity,
      activeLayout: r.activeLayout,
      status: r.status as any,
      tableIds: (r.tableIds as any) || [],
      serviceLayouts: (r.serviceLayouts as any) || undefined,
    }));
  }

  async getFloor(id: string, tenantId?: string): Promise<FloorRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const r = await this.prisma.floor.findFirst({
      where: { id, tenantId: tid },
    });
    if (!r) return null;
    return {
      id: r.id,
      branchId: r.branchId,
      name: r.name,
      type: r.type as any,
      capacity: r.capacity,
      activeLayout: r.activeLayout,
      status: r.status as any,
      tableIds: (r.tableIds as any) || [],
      serviceLayouts: (r.serviceLayouts as any) || undefined,
    };
  }

  async saveFloor(floor: FloorRecord, tenantId?: string): Promise<void> {
    const tid = this.resolveTenantId(tenantId);
    await this.prisma.floor.upsert({
      where: { id: floor.id },
      update: {
        branchId: floor.branchId,
        name: floor.name,
        type: floor.type,
        capacity: floor.capacity,
        activeLayout: floor.activeLayout,
        status: floor.status,
        tableIds: (floor.tableIds as any) || [],
        serviceLayouts: (floor.serviceLayouts as any) || null,
      },
      create: {
        id: floor.id,
        tenantId: tid,
        branchId: floor.branchId,
        name: floor.name,
        type: floor.type,
        capacity: floor.capacity,
        activeLayout: floor.activeLayout,
        status: floor.status,
        tableIds: (floor.tableIds as any) || [],
        serviceLayouts: (floor.serviceLayouts as any) || null,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 3. TABLES
  // ─────────────────────────────────────────────────────────────

  async getTables(branchId?: string, floorId?: string, tenantId?: string): Promise<TableFloorRecord[]> {
    const tid = this.resolveTenantId(tenantId);
    const rows = await this.prisma.tableFloor.findMany({
      where: {
        tenantId: tid,
        ...(branchId ? { branchId } : {}),
        ...(floorId ? { floorId } : {}),
      },
      orderBy: { number: 'asc' },
    });
    return rows.map((r) => this.mapTableFloorRecord(r));
  }

  async getTable(id: string | number, tenantId?: string): Promise<TableFloorRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const idStr = String(id);
    const r = await this.prisma.tableFloor.findFirst({
      where: {
        tenantId: tid,
        OR: [{ id: idStr }, ...(typeof id === 'number' ? [{ numericId: id }] : [])],
      },
    });
    return r ? this.mapTableFloorRecord(r) : null;
  }

  async getTableByNumber(number: string, tenantId?: string, branchId?: string): Promise<TableFloorRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const r = await this.prisma.tableFloor.findFirst({
      where: {
        tenantId: tid,
        number,
        ...(branchId ? { branchId } : {}),
      },
    });
    return r ? this.mapTableFloorRecord(r) : null;
  }

  async getTableByLocator(locator: string, tenantId?: string): Promise<TableFloorRecord | null> {
    const tid = this.resolveTenantId(tenantId);
    const r = await this.prisma.tableFloor.findFirst({
      where: {
        tenantId: tid,
        locator,
      },
    });
    return r ? this.mapTableFloorRecord(r) : null;
  }

  async saveTable(table: TableFloorRecord, tenantId?: string): Promise<void> {
    const tid = this.resolveTenantId(tenantId);
    const idStr = String(table.id);
    await this.prisma.tableFloor.upsert({
      where: { id: idStr },
      update: {
        numericId: table.id,
        number: table.number,
        capacity: table.capacity,
        minimumSeats: table.minimumSeats,
        status: table.status,
        x: table.x,
        y: table.y,
        width: table.width,
        height: table.height,
        rotation: table.rotation || 0,
        shape: table.shape,
        section: table.section,
        floorId: table.floorId,
        branchId: table.branchId,
        locator: table.locator,
        seats: (table.seats as any) || [],
        activeSessionId: table.activeSessionId,
        activeBillMinor: table.activeBillMinor,
        serverName: table.serverName,
        turnTimeMinutes: table.turnTimeMinutes,
        mergedWithTableIds: (table.mergedWithTableIds as any) || [],
        mergedPartyLabel: table.mergedPartyLabel,
      },
      create: {
        id: idStr,
        tenantId: tid,
        numericId: table.id,
        number: table.number,
        capacity: table.capacity,
        minimumSeats: table.minimumSeats,
        status: table.status,
        x: table.x,
        y: table.y,
        width: table.width,
        height: table.height,
        rotation: table.rotation || 0,
        shape: table.shape,
        section: table.section,
        floorId: table.floorId,
        branchId: table.branchId,
        locator: table.locator,
        seats: (table.seats as any) || [],
        activeSessionId: table.activeSessionId,
        activeBillMinor: table.activeBillMinor,
        serverName: table.serverName,
        turnTimeMinutes: table.turnTimeMinutes,
        mergedWithTableIds: (table.mergedWithTableIds as any) || [],
        mergedPartyLabel: table.mergedPartyLabel,
      },
    });
  }

  private mapTableFloorRecord(r: any): TableFloorRecord {
    return {
      id: r.numericId || parseInt(r.id.replace(/\D/g, ''), 10) || 1,
      number: r.number,
      capacity: r.capacity,
      minimumSeats: r.minimumSeats || undefined,
      status: r.status,
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      rotation: r.rotation || 0,
      shape: r.shape,
      section: r.section,
      floorId: r.floorId,
      branchId: r.branchId,
      locator: r.locator,
      seats: (r.seats as any) || [],
      activeSessionId: r.activeSessionId || undefined,
      activeBillMinor: r.activeBillMinor || undefined,
      serverName: r.serverName || undefined,
      turnTimeMinutes: r.turnTimeMinutes || undefined,
      mergedWithTableIds: (r.mergedWithTableIds as any) || undefined,
      mergedPartyLabel: r.mergedPartyLabel || undefined,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 4. MENU & CATALOG
  // ─────────────────────────────────────────────────────────────

  async getMenuItems(includeArchived = false, tenantId?: string): Promise<MenuItem[]> {
    const tid = this.resolveTenantId(tenantId);
    const rows = await this.prisma.menuItem.findMany({
      where: {
        tenantId: tid,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      orderBy: { name: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      basePriceMinor: r.basePriceMinor,
      formattedPrice: r.formattedPrice,
      category: r.category,
      categoryId: r.categoryId || undefined,
      station: r.station as any,
      prepDurationMinutes: r.prepDurationMinutes,
      allergens: (r.allergens as any) || [],
      dietaryFlags: (r.dietaryFlags as any) || [],
      story: r.story || undefined,
      pairingSuggestions: (r.pairingSuggestions as any) || [],
      isPopular: r.isPopular,
      isSignature: r.isSignature,
      isArchived: r.isArchived,
      modifierGroups: (r.modifierGroups as any) || undefined,
      imageUrl: r.imageUrl || undefined,
    }));
  }

  async getMenuItem(id: string, tenantId?: string): Promise<MenuItem | null> {
    const tid = this.resolveTenantId(tenantId);
    const r = await this.prisma.menuItem.findFirst({
      where: { id, tenantId: tid },
    });
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      basePriceMinor: r.basePriceMinor,
      formattedPrice: r.formattedPrice,
      category: r.category,
      categoryId: r.categoryId || undefined,
      station: r.station as any,
      prepDurationMinutes: r.prepDurationMinutes,
      allergens: (r.allergens as any) || [],
      dietaryFlags: (r.dietaryFlags as any) || [],
      story: r.story || undefined,
      pairingSuggestions: (r.pairingSuggestions as any) || [],
      isPopular: r.isPopular,
      isSignature: r.isSignature,
      isArchived: r.isArchived,
      modifierGroups: (r.modifierGroups as any) || undefined,
      imageUrl: r.imageUrl || undefined,
    };
  }

  async saveMenuItem(item: MenuItem, tenantId?: string): Promise<void> {
    const tid = this.resolveTenantId(tenantId);
    await this.prisma.menuItem.upsert({
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
        allergens: (item.allergens as any) || [],
        dietaryFlags: (item.dietaryFlags as any) || [],
        story: item.story,
        pairingSuggestions: (item.pairingSuggestions as any) || [],
        isPopular: item.isPopular || false,
        isSignature: item.isSignature || false,
        isArchived: item.isArchived || false,
        modifierGroups: (item.modifierGroups as any) || null,
        imageUrl: item.imageUrl,
      },
      create: {
        id: item.id,
        tenantId: tid,
        name: item.name,
        description: item.description,
        basePriceMinor: item.basePriceMinor,
        formattedPrice: item.formattedPrice,
        category: item.category,
        categoryId: item.categoryId,
        station: item.station,
        prepDurationMinutes: item.prepDurationMinutes,
        allergens: (item.allergens as any) || [],
        dietaryFlags: (item.dietaryFlags as any) || [],
        story: item.story,
        pairingSuggestions: (item.pairingSuggestions as any) || [],
        isPopular: item.isPopular || false,
        isSignature: item.isSignature || false,
        isArchived: item.isArchived || false,
        modifierGroups: (item.modifierGroups as any) || null,
        imageUrl: item.imageUrl,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 5. ORDERS & KITCHEN TASKS
  // ─────────────────────────────────────────────────────────────

  async getOrders(
    filter: {
      tableNumber?: string;
      sessionId?: string;
      branchId?: string;
      status?: string;
    } = {},
    tenantId?: string
  ): Promise<RestaurantOrder[]> {
    const tid = this.resolveTenantId(tenantId);
    const rows = await this.prisma.restaurantOrder.findMany({
      where: {
        tenantId: tid,
        ...(filter.tableNumber ? { tableNumber: filter.tableNumber } : {}),
        ...(filter.sessionId ? { sessionId: filter.sessionId } : {}),
        ...(filter.branchId ? { branchId: filter.branchId } : {}),
        ...(filter.status ? { status: filter.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      orderId: r.id,
      tableNumber: r.tableNumber,
      sessionId: r.sessionId,
      branchId: r.branchId || undefined,
      guestName: r.guestName || undefined,
      status: r.status as any,
      items: (r.items as any) || [],
      subtotalMinor: r.subtotalMinor,
      taxMinor: r.taxMinor,
      totalMinor: r.totalMinor,
      currency: r.currency,
      customer: (r.customer as any) || undefined,
      orderToken: r.orderToken || undefined,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async getOrder(orderId: string, tenantId?: string): Promise<RestaurantOrder | null> {
    const tid = this.resolveTenantId(tenantId);
    const r = await this.prisma.restaurantOrder.findFirst({
      where: { id: orderId, tenantId: tid },
    });
    if (!r) return null;
    return {
      orderId: r.id,
      tableNumber: r.tableNumber,
      sessionId: r.sessionId,
      branchId: r.branchId || undefined,
      guestName: r.guestName || undefined,
      status: r.status as any,
      items: (r.items as any) || [],
      subtotalMinor: r.subtotalMinor,
      taxMinor: r.taxMinor,
      totalMinor: r.totalMinor,
      currency: r.currency,
      customer: (r.customer as any) || undefined,
      orderToken: r.orderToken || undefined,
      createdAt: r.createdAt.toISOString(),
    };
  }

  async saveOrder(order: RestaurantOrder, tenantId?: string): Promise<void> {
    const tid = this.resolveTenantId(tenantId);
    await this.prisma.restaurantOrder.upsert({
      where: { id: order.orderId },
      update: {
        tableNumber: order.tableNumber,
        sessionId: order.sessionId,
        branchId: order.branchId,
        guestName: order.guestName,
        status: order.status,
        items: (order.items as any) || [],
        subtotalMinor: order.subtotalMinor,
        taxMinor: order.taxMinor,
        totalMinor: order.totalMinor,
        currency: order.currency,
        customer: (order.customer as any) || null,
        orderToken: order.orderToken,
      },
      create: {
        id: order.orderId,
        tenantId: tid,
        tableNumber: order.tableNumber,
        sessionId: order.sessionId,
        branchId: order.branchId,
        guestName: order.guestName,
        status: order.status,
        items: (order.items as any) || [],
        subtotalMinor: order.subtotalMinor,
        taxMinor: order.taxMinor,
        totalMinor: order.totalMinor,
        currency: order.currency,
        customer: (order.customer as any) || null,
        orderToken: order.orderToken,
      },
    });
  }

  async getKitchenTasks(station?: string, branchId?: string, tenantId?: string): Promise<KitchenTask[]> {
    const tid = this.resolveTenantId(tenantId);
    const rows = await this.prisma.kitchenTask.findMany({
      where: {
        tenantId: tid,
        ...(station ? { station } : {}),
        ...(branchId ? { branchId } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({
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
      fireAt: r.fireAt,
      targetServeAt: r.targetServeAt,
      elapsedMinutes: r.elapsedMinutes,
      slaMinutes: r.slaMinutes,
      modifiers: (r.modifiers as any) || [],
      course: (r.course as any) || undefined,
      fulfilledItemCount: r.fulfilledItemCount,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async saveKitchenTask(task: KitchenTask, tenantId?: string): Promise<void> {
    const tid = this.resolveTenantId(tenantId);
    await this.prisma.kitchenTask.upsert({
      where: { id: task.id },
      update: {
        orderId: task.orderId,
        tableNumber: task.tableNumber,
        branchId: task.branchId,
        seatNumber: task.seatNumber,
        guestName: task.guestName,
        itemName: task.itemName,
        quantity: task.quantity,
        station: task.station,
        status: task.status,
        fireAt: task.fireAt,
        targetServeAt: task.targetServeAt,
        elapsedMinutes: task.elapsedMinutes,
        slaMinutes: task.slaMinutes,
        modifiers: (task.modifiers as any) || [],
        course: task.course,
        fulfilledItemCount: task.fulfilledItemCount || 0,
      },
      create: {
        id: task.id,
        tenantId: tid,
        orderId: task.orderId,
        tableNumber: task.tableNumber,
        branchId: task.branchId,
        seatNumber: task.seatNumber,
        guestName: task.guestName,
        itemName: task.itemName,
        quantity: task.quantity,
        station: task.station,
        status: task.status,
        fireAt: task.fireAt,
        targetServeAt: task.targetServeAt,
        elapsedMinutes: task.elapsedMinutes,
        slaMinutes: task.slaMinutes,
        modifiers: (task.modifiers as any) || [],
        course: task.course,
        fulfilledItemCount: task.fulfilledItemCount || 0,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 6. STAFF DIRECTORY & SESSIONS
  // ─────────────────────────────────────────────────────────────

  async getStaffMembers(tenantId?: string): Promise<StaffDirectoryMember[]> {
    const tid = this.resolveTenantId(tenantId);
    const rows = await this.prisma.staffMember.findMany({
      where: { tenantId: tid },
      orderBy: { name: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role as any,
      branchId: r.branchId,
      station: r.station || undefined,
      salt: r.salt,
      pinHash: r.pinHash,
      status: r.status as any,
      permissions: (r.permissions as any) || undefined,
    }));
  }

  async saveStaffMember(member: StaffDirectoryMember, tenantId?: string): Promise<void> {
    const tid = this.resolveTenantId(tenantId);
    await this.prisma.staffMember.upsert({
      where: { id: member.id },
      update: {
        name: member.name,
        role: member.role,
        branchId: member.branchId,
        station: member.station,
        salt: member.salt,
        pinHash: member.pinHash,
        status: member.status,
        permissions: (member.permissions as any) || null,
      },
      create: {
        id: member.id,
        tenantId: tid,
        name: member.name,
        role: member.role,
        branchId: member.branchId,
        station: member.station,
        salt: member.salt,
        pinHash: member.pinHash,
        status: member.status,
        permissions: (member.permissions as any) || null,
      },
    });
  }

  async getSessions(tenantId?: string): Promise<DiningSessionRecord[]> {
    const tid = this.resolveTenantId(tenantId);
    const rows = await this.prisma.diningSession.findMany({
      where: { tenantId: tid },
      orderBy: { openedAt: 'desc' },
    });
    return rows.map((r) => ({
      sessionId: r.id,
      tableNumber: r.tableNumber,
      branchId: r.branchId,
      floorId: r.floorId,
      hostName: r.hostName,
      status: r.status as any,
      openedAt: r.openedAt.toISOString(),
      expiresAt: r.expiresAt ? r.expiresAt.toISOString() : undefined,
      closedAt: r.closedAt ? r.closedAt.toISOString() : undefined,
      guestCapabilityTokens: (r.guestCapabilityTokens as any) || [],
      settlement: (r.settlement as any) || undefined,
    }));
  }

  async saveSession(session: DiningSessionRecord, tenantId?: string): Promise<void> {
    const tid = this.resolveTenantId(tenantId);
    await this.prisma.diningSession.upsert({
      where: { id: session.sessionId },
      update: {
        tableNumber: session.tableNumber,
        branchId: session.branchId,
        floorId: session.floorId,
        hostName: session.hostName,
        status: session.status,
        openedAt: parseSafeDate(session.openedAt),
        expiresAt: session.expiresAt ? parseSafeDate(session.expiresAt) : null,
        closedAt: session.closedAt ? parseSafeDate(session.closedAt) : null,
        guestCapabilityTokens: (session.guestCapabilityTokens as any) || [],
        settlement: (session.settlement as any) || null,
      },
      create: {
        id: session.sessionId,
        tenantId: tid,
        tableNumber: session.tableNumber,
        branchId: session.branchId,
        floorId: session.floorId,
        hostName: session.hostName,
        status: session.status,
        openedAt: parseSafeDate(session.openedAt),
        expiresAt: session.expiresAt ? parseSafeDate(session.expiresAt) : null,
        closedAt: session.closedAt ? parseSafeDate(session.closedAt) : null,
        guestCapabilityTokens: (session.guestCapabilityTokens as any) || [],
        settlement: (session.settlement as any) || null,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 7. MENU CATEGORIES & OVERRIDES
  // ─────────────────────────────────────────────────────────────

  async getCategories(tenantId?: string): Promise<MenuCategory[]> {
    const tid = this.resolveTenantId(tenantId);
    const rows = await this.prisma.menuCategory.findMany({
      where: { tenantId: tid },
      orderBy: { displayOrder: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description || undefined,
      displayOrder: r.displayOrder,
      isArchived: r.isArchived,
      color: r.color || undefined,
    }));
  }

  async saveCategory(cat: MenuCategory, tenantId?: string): Promise<void> {
    const tid = this.resolveTenantId(tenantId);
    await this.prisma.menuCategory.upsert({
      where: { id: cat.id },
      update: {
        name: cat.name,
        description: cat.description,
        displayOrder: cat.displayOrder,
        isArchived: cat.isArchived || false,
        color: cat.color,
      },
      create: {
        id: cat.id,
        tenantId: tid,
        name: cat.name,
        description: cat.description,
        displayOrder: cat.displayOrder,
        isArchived: cat.isArchived || false,
        color: cat.color,
      },
    });
  }

  async getMenuOverrides(branchId?: string, tenantId?: string): Promise<BranchMenuOverride[]> {
    const tid = this.resolveTenantId(tenantId);
    const rows = await this.prisma.branchMenuOverride.findMany({
      where: {
        tenantId: tid,
        ...(branchId ? { branchId } : {}),
      },
    });
    return rows.map((r) => ({
      branchId: r.branchId,
      itemId: r.itemId,
      isAvailable: r.isAvailable,
      priceOverrideMinor: r.priceOverrideMinor || undefined,
      formattedPriceOverride: r.formattedPriceOverride || undefined,
      customPrepMinutes: r.customPrepMinutes || undefined,
    }));
  }

  async saveMenuOverride(override: BranchMenuOverride, tenantId?: string): Promise<void> {
    const tid = this.resolveTenantId(tenantId);
    const id = `ovr_${override.branchId}_${override.itemId}`;
    await this.prisma.branchMenuOverride.upsert({
      where: {
        tenantId_branchId_itemId: {
          tenantId: tid,
          branchId: override.branchId,
          itemId: override.itemId,
        },
      },
      update: {
        isAvailable: override.isAvailable ?? true,
        priceOverrideMinor: override.priceOverrideMinor,
        formattedPriceOverride: override.formattedPriceOverride,
        customPrepMinutes: override.customPrepMinutes,
      },
      create: {
        id,
        tenantId: tid,
        branchId: override.branchId,
        itemId: override.itemId,
        isAvailable: override.isAvailable ?? true,
        priceOverrideMinor: override.priceOverrideMinor,
        formattedPriceOverride: override.formattedPriceOverride,
        customPrepMinutes: override.customPrepMinutes,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 8. SERVICE REQUESTS & GUESTS
  // ─────────────────────────────────────────────────────────────

  async getServiceRequests(branchId?: string, tenantId?: string): Promise<ServiceRequest[]> {
    const tid = this.resolveTenantId(tenantId);
    const rows = await this.prisma.serviceRequest.findMany({
      where: {
        tenantId: tid,
        ...(branchId ? { branchId } : {}),
      },
      orderBy: { requestedAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      tableNumber: r.tableNumber,
      branchId: r.branchId,
      floorId: r.floorId,
      type: r.type as any,
      status: r.status as any,
      requestedAt: r.requestedAt.toISOString(),
      note: r.note || undefined,
    }));
  }

  async saveServiceRequest(req: ServiceRequest, tenantId?: string): Promise<void> {
    const tid = this.resolveTenantId(tenantId);
    await this.prisma.serviceRequest.upsert({
      where: { id: req.id },
      update: {
        tableNumber: req.tableNumber,
        branchId: req.branchId || 'branch_ldh',
        floorId: req.floorId || 'floor_courtyard',
        type: req.type,
        status: req.status,
        requestedAt: parseSafeDate(req.requestedAt),
        note: req.note,
      },
      create: {
        id: req.id,
        tenantId: tid,
        tableNumber: req.tableNumber,
        branchId: req.branchId || 'branch_ldh',
        floorId: req.floorId || 'floor_courtyard',
        type: req.type,
        status: req.status,
        requestedAt: parseSafeDate(req.requestedAt),
        note: req.note,
      },
    });
  }

  async getGuests(tableNumber?: string, tenantId?: string): Promise<GuestRecord[]> {
    const tid = this.resolveTenantId(tenantId);
    const rows = await this.prisma.guest.findMany({
      where: {
        tenantId: tid,
        ...(tableNumber ? { tableNumber } : {}),
      },
      orderBy: { joinTime: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      tableNumber: r.tableNumber,
      seatId: r.seatId || undefined,
      seatLabel: r.seatLabel || undefined,
      role: r.role as any,
      joinTime: r.joinTime.toISOString(),
      preferences: (r.preferences as any) || {},
      orderIds: (r.orderIds as any) || [],
      totalSpendMinor: r.totalSpendMinor,
    }));
  }

  async saveGuest(guest: GuestRecord, tenantId?: string): Promise<void> {
    const tid = this.resolveTenantId(tenantId);
    const id = guest.id || `g_${guest.tableNumber}_${Date.now()}`;
    await this.prisma.guest.upsert({
      where: { id },
      update: {
        name: guest.name,
        tableNumber: guest.tableNumber,
        seatId: guest.seatId,
        seatLabel: guest.seatLabel,
        role: guest.role || 'COMPANION',
        joinTime: parseSafeDate(guest.joinTime),
        preferences: (guest.preferences as any) || {},
        orderIds: (guest.orderIds as any) || [],
        totalSpendMinor: guest.totalSpendMinor || 0,
      },
      create: {
        id,
        tenantId: tid,
        name: guest.name,
        tableNumber: guest.tableNumber,
        seatId: guest.seatId,
        seatLabel: guest.seatLabel,
        role: guest.role || 'COMPANION',
        joinTime: parseSafeDate(guest.joinTime),
        preferences: (guest.preferences as any) || {},
        orderIds: (guest.orderIds as any) || [],
        totalSpendMinor: guest.totalSpendMinor || 0,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 9. BRAND, SUPPORT TICKETS, EVENTS & REVOCATIONS
  // ─────────────────────────────────────────────────────────────

  async getBrandConfig(tenantId?: string): Promise<any | null> {
    const tid = this.resolveTenantId(tenantId);
    const row = await this.prisma.tenantBrandConfig.findUnique({
      where: { tenantId: tid },
    });
    return row ? row.config : null;
  }

  async saveBrandConfig(config: any, tenantId?: string): Promise<void> {
    const tid = this.resolveTenantId(tenantId);
    await this.prisma.tenantBrandConfig.upsert({
      where: { tenantId: tid },
      update: { config },
      create: { tenantId: tid, config },
    });
  }

  async getSupportTickets(tenantId?: string): Promise<any[]> {
    const tid = this.resolveTenantId(tenantId);
    const rows = await this.prisma.supportTicket.findMany({
      where: { tenantId: tid },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      branchId: r.branchId || undefined,
      title: r.title,
      status: r.status,
      priority: r.priority,
      category: r.category,
      messages: r.messages,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async saveSupportTicket(ticket: any, tenantId?: string): Promise<void> {
    const tid = this.resolveTenantId(tenantId);
    await this.prisma.supportTicket.upsert({
      where: { id: ticket.id },
      update: {
        branchId: ticket.branchId,
        title: ticket.title || ticket.subject || 'Support Ticket',
        status: ticket.status,
        priority: ticket.priority || ticket.severity || 'MEDIUM',
        category: ticket.category || 'GENERAL',
        messages: ticket.messages || [],
      },
      create: {
        id: ticket.id,
        tenantId: tid,
        branchId: ticket.branchId,
        title: ticket.title || ticket.subject || 'Support Ticket',
        status: ticket.status,
        priority: ticket.priority || ticket.severity || 'MEDIUM',
        category: ticket.category || 'GENERAL',
        messages: ticket.messages || [],
      },
    });
  }

  async getDomainEvents(tenantId?: string, limit = 100): Promise<DomainEvent[]> {
    const tid = this.resolveTenantId(tenantId);
    const rows = await this.prisma.domainEvent.findMany({
      where: { tenantId: tid },
      orderBy: { sequence: 'desc' },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      sequence: r.sequence,
      type: r.type,
      timestamp: r.timestamp.toISOString(),
      producer: r.producer,
      branchId: r.branchId,
      floorId: r.floorId || undefined,
      tableNumber: r.tableNumber || undefined,
      payload: r.payload,
    }));
  }

  async saveDomainEvent(event: DomainEvent, tenantId?: string): Promise<void> {
    const tid = this.resolveTenantId(tenantId);
    await this.prisma.domainEvent.upsert({
      where: { id: event.id },
      update: {
        sequence: event.sequence,
        type: event.type,
        timestamp: parseSafeDate(event.timestamp),
        producer: event.producer,
        branchId: event.branchId,
        floorId: event.floorId,
        tableNumber: event.tableNumber,
        payload: event.payload as any,
      },
      create: {
        id: event.id,
        tenantId: tid,
        sequence: event.sequence,
        type: event.type,
        timestamp: parseSafeDate(event.timestamp),
        producer: event.producer,
        branchId: event.branchId,
        floorId: event.floorId,
        tableNumber: event.tableNumber,
        payload: event.payload as any,
      },
    });
  }

  async isStaffTokenRevoked(tokenOrJti: string, tenantId?: string): Promise<boolean> {
    const tid = this.resolveTenantId(tenantId);
    const found = await this.prisma.staffTokenRevocation.findFirst({
      where: {
        tenantId: tid,
        tokenJti: tokenOrJti,
      },
    });
    return !!found;
  }

  async revokeStaffToken(jti: string, reason?: string, tenantId?: string): Promise<void> {
    const tid = this.resolveTenantId(tenantId);
    await this.prisma.staffTokenRevocation.upsert({
      where: {
        tenantId_tokenJti: {
          tenantId: tid,
          tokenJti: jti,
        },
      },
      update: {
        reason,
      },
      create: {
        tenantId: tid,
        tokenJti: jti,
        reason,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 10. IDEMPOTENCY, INVOICES & PAYMENTS (PHASE 1 + PHASE 2 READY)
  // ─────────────────────────────────────────────────────────────

  async getIdempotencyRecord(key: string, tenantId?: string): Promise<any | null> {
    const tid = this.resolveTenantId(tenantId);
    const row = await this.prisma.idempotencyRecord.findUnique({
      where: {
        tenantId_key: { tenantId: tid, key },
      },
    });
    if (!row) return null;
    if (new Date() > row.expiresAt) return null;
    return row.result;
  }

  async saveIdempotencyRecord(key: string, result: any, ttlSeconds = 86400, tenantId?: string): Promise<void> {
    const tid = this.resolveTenantId(tenantId);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    await this.prisma.idempotencyRecord.upsert({
      where: {
        tenantId_key: { tenantId: tid, key },
      },
      update: {
        result,
        expiresAt,
      },
      create: {
        tenantId: tid,
        key,
        result,
        expiresAt,
      },
    });
  }

  async saveInvoice(invoice: {
    orderId: string;
    invoiceNumber: string;
    fiscalYear: string;
    sequenceNumber: number;
    gstin: string;
    subtotalMinor: number;
    taxMinor: number;
    totalMinor: number;
    currency?: string;
    itemBreakdown: any;
    taxBreakdown: any;
    customer?: any;
  }, tenantId?: string): Promise<any> {
    const tid = this.resolveTenantId(tenantId);
    return this.prisma.invoice.upsert({
      where: {
        tenantId_invoiceNumber: { tenantId: tid, invoiceNumber: invoice.invoiceNumber },
      },
      update: {
        orderId: invoice.orderId,
        fiscalYear: invoice.fiscalYear,
        sequenceNumber: invoice.sequenceNumber,
        gstin: invoice.gstin,
        subtotalMinor: invoice.subtotalMinor,
        taxMinor: invoice.taxMinor,
        totalMinor: invoice.totalMinor,
        currency: invoice.currency || 'INR',
        itemBreakdown: invoice.itemBreakdown,
        taxBreakdown: invoice.taxBreakdown,
        customer: invoice.customer,
      },
      create: {
        tenantId: tid,
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
        customer: invoice.customer,
      },
    });
  }

  async getInvoiceByOrderId(orderId: string, tenantId?: string): Promise<any | null> {
    const tid = this.resolveTenantId(tenantId);
    return this.prisma.invoice.findFirst({
      where: { tenantId: tid, orderId },
    });
  }

  async getInvoiceByNumber(invoiceNumber: string, tenantId?: string): Promise<any | null> {
    const tid = this.resolveTenantId(tenantId);
    return this.prisma.invoice.findUnique({
      where: {
        tenantId_invoiceNumber: { tenantId: tid, invoiceNumber },
      },
    });
  }

  async getNextInvoiceSequence(fiscalYear: string, tenantId?: string): Promise<number> {
    const tid = this.resolveTenantId(tenantId);
    const latest = await this.prisma.invoice.findFirst({
      where: { tenantId: tid, fiscalYear },
      orderBy: { sequenceNumber: 'desc' },
      select: { sequenceNumber: true },
    });
    return (latest?.sequenceNumber || 0) + 1;
  }

  async savePaymentSession(session: {
    id: string; // razorpay order id
    orderId: string;
    tableNumber: string;
    amountMinor: number;
    currency?: string;
    status?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
  }, tenantId?: string): Promise<any> {
    const tid = this.resolveTenantId(tenantId);
    return this.prisma.razorpayPaymentSession.upsert({
      where: { id: session.id },
      update: {
        orderId: session.orderId,
        tableNumber: session.tableNumber,
        amountMinor: session.amountMinor,
        currency: session.currency || 'INR',
        status: session.status || 'created',
        razorpayPaymentId: session.razorpayPaymentId,
        razorpaySignature: session.razorpaySignature,
      },
      create: {
        id: session.id,
        tenantId: tid,
        orderId: session.orderId,
        tableNumber: session.tableNumber,
        amountMinor: session.amountMinor,
        currency: session.currency || 'INR',
        status: session.status || 'created',
        razorpayPaymentId: session.razorpayPaymentId,
        razorpaySignature: session.razorpaySignature,
      },
    });
  }

  async getPaymentSessionById(id: string, tenantId?: string): Promise<any | null> {
    const tid = this.resolveTenantId(tenantId);
    return this.prisma.razorpayPaymentSession.findFirst({
      where: { id, tenantId: tid },
    });
  }

  async getPaymentSessionByOrderId(orderId: string, tenantId?: string): Promise<any | null> {
    const tid = this.resolveTenantId(tenantId);
    return this.prisma.razorpayPaymentSession.findFirst({
      where: { orderId, tenantId: tid },
    });
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
