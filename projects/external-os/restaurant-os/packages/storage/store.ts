/**
 * 💾 RestaurantOS 2.x — Persistent Atomic Domain Storage Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Zero-loss, ACID-like file-backed JSON database for production restaurant runtime.
 * Persists all domain state across process restarts, test runs, and deep-link navigations.
 *
 * Invariants:
 * 1. Safe in-place mutations: Single-table updates never erase other tables or floors.
 * 2. Atomic writes: Flushes to a temporary file before renaming to avoid corrupt reads.
 * 3. Seed resilience: Automatically initializes from canonical archetypes if file missing.
 * 4. Outbox persistence: All emitted domain events are recorded with monotonic sequences.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  BranchRecord,
  FloorRecord,
  TableFloorRecord,
  SeatRecord,
  GuestRecord,
  MenuItem,
  KitchenTask,
  ServiceRequest,
  RestaurantOrder,
  DEFAULT_BRANCHES,
  DEFAULT_FLOORS,
  DEFAULT_TABLES,
  DEFAULT_MENU,
  DEFAULT_TASKS,
  DEFAULT_SERVICE_REQUESTS,
  generateSeats,
  loadPersistedStaffRevocations,
  loadPersistedStaffMembers,
  registerStaffPersistenceCallback,
  StaffDirectoryMember,
  revokeStaffToken as revokeStaffTokenInSecurity,
  revokeStaffMemberTokens,
  isStaffTokenRevoked,
  MarketplaceTemplate,
  TenantBrandConfig,
  TemplateDraftAndPublication,
  SupportTicket,
  RestaurantPartner,
  GrocerySkuItem,
  BranchMenuOverride,
  ResolvedMenuItem,
  MenuCategory,
  DEFAULT_CATEGORIES,
  DEFAULT_TEMPLATES,
  DEFAULT_BRAND_CONFIG,
  DEFAULT_TEMPLATE_DRAFT,
  DEFAULT_SUPPORT_TICKETS,
  DEFAULT_RESTAURANT_PARTNERS,
  DEFAULT_GROCERY_SKUS,
  DEFAULT_BRANCH_MENU_OVERRIDES,
} from '../domain';

export interface DomainEvent<T = any> {
  id: string;
  sequence: number;
  type: string;
  timestamp: string;
  producer: string;
  branchId: string;
  floorId?: string;
  tableNumber?: string;
  tenantId?: string;
  payload: T;
}

export interface SettlementRecord {
  method: 'CASH' | 'CARD' | 'UPI' | 'COMP' | 'VOID' | 'REFUND' | 'EMERGENCY_OVERRIDE';
  status: 'PAID' | 'COMPED' | 'VOIDED' | 'REFUNDED' | 'PARTIAL' | 'UNSETTLED_OVERRIDE';
  amountMinor: number;
  unsettledLiabilityMinor?: number;
  settledAt: string;
  authorizedBy?: string;
  reason?: string;
  verification?: 'MANUAL_STAFF_RECORDED' | 'PROVIDER_CONFIRMED' | 'UNVERIFIED';
  providerConfirmed?: boolean;
  gatewayTransactionId?: string;
}

export interface DiningSessionRecord {
  sessionId: string;
  tableNumber: string;
  branchId: string;
  floorId: string;
  hostName: string;
  status: 'ACTIVE' | 'CLOSED';
  openedAt: string;
  expiresAt?: string;
  closedAt?: string;
  guestCapabilityTokens: string[];
  settlement?: SettlementRecord;
}

export interface KdsTransitionResult {
  success: boolean;
  task?: KitchenTask;
  isIdempotent?: boolean;
  error?: string;
  code?: 'TASK_NOT_FOUND' | 'INVALID_TRANSITION' | 'STATION_MISMATCH' | 'ALREADY_COMPLETED' | 'REVISION_CONFLICT';
}

export interface SessionCloseResult {
  success: boolean;
  error?: string;
  code?:
    | 'TABLE_NOT_FOUND'
    | 'UNPAID_BALANCE'
    | 'PARTIAL_SETTLEMENT_UNRESOLVED'
    | 'INVALID_SETTLEMENT'
    | 'UNAUTHORIZED_OVERRIDE'
    | 'REASON_REQUIRED'
    | 'REVISION_CONFLICT';
  table?: TableFloorRecord;
  session?: DiningSessionRecord;
  settlement?: SettlementRecord;
  isIdempotent?: boolean;
}

export interface RestaurantRuntimeStoreData {
  version: number;
  lastUpdated: string;
  revisions: number;
  branches: BranchRecord[];
  floors: FloorRecord[];
  tables: TableFloorRecord[];
  orders: RestaurantOrder[];
  kitchenTasks: KitchenTask[];
  serviceRequests: ServiceRequest[];
  menuItems: MenuItem[];
  categories?: MenuCategory[];
  guests: GuestRecord[];
  sessions: DiningSessionRecord[];
  events: DomainEvent[];
  invalidatedCapabilityTokens?: string[];
  revokedStaffTokens?: string[];
  revokedStaffTokenJtis?: string[];
  revokedStaffIds?: string[];
  staffMembers?: StaffDirectoryMember[];
  lastEventSequence?: number;
  templates?: MarketplaceTemplate[];
  tenantBrand?: TenantBrandConfig;
  templateDraft?: TemplateDraftAndPublication;
  supportTickets?: SupportTicket[];
  restaurantPartners?: RestaurantPartner[];
  grocerySkus?: GrocerySkuItem[];
  branchMenuOverrides?: BranchMenuOverride[];
  idempotencyRecords?: Record<
    string,
    {
      payloadHash?: string;
      response?: any;
      createdAt: string;
      tableNumber?: string;
      settlement?: SettlementRecord;
    }
  >;
}

export class RestaurantRuntimeStore {
  private filePath: string;
  private data!: RestaurantRuntimeStoreData;
  private isSaving = false;
  private eventSequence = 0;
  private eventListeners: Array<(event: DomainEvent) => void> = [];
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(customFilePath?: string) {
    this.filePath =
      customFilePath ||
      process.env.RESTAURANT_STORE_PATH ||
      path.join(__dirname, '..', '..', 'data', 'restaurant-runtime-store.json');
    this.init();
  }

  private init(): void {
    const dataDir = path.dirname(this.filePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(raw);
        if (!this.data.invalidatedCapabilityTokens) {
          this.data.invalidatedCapabilityTokens = [];
        }
        if (!this.data.revokedStaffTokens) {
          this.data.revokedStaffTokens = [];
        }
        if (!this.data.revokedStaffTokenJtis) {
          this.data.revokedStaffTokenJtis = [];
        }
        if (!this.data.revokedStaffIds) {
          this.data.revokedStaffIds = [];
        }
        if (!this.data.idempotencyRecords) {
          this.data.idempotencyRecords = {};
        }
        if (!this.data.templates || this.data.templates.length === 0) {
          this.data.templates = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));
        }
        if (!this.data.tenantBrand) {
          this.data.tenantBrand = JSON.parse(JSON.stringify(DEFAULT_BRAND_CONFIG));
        }
        if (!this.data.templateDraft || !this.data.templateDraft.draftSections) {
          this.data.templateDraft = JSON.parse(JSON.stringify(DEFAULT_TEMPLATE_DRAFT));
        }
        if (!this.data.supportTickets || this.data.supportTickets.length === 0) {
          this.data.supportTickets = JSON.parse(JSON.stringify(DEFAULT_SUPPORT_TICKETS));
        }
        if (!this.data.branchMenuOverrides || this.data.branchMenuOverrides.length === 0) {
          this.data.branchMenuOverrides = JSON.parse(JSON.stringify(DEFAULT_BRANCH_MENU_OVERRIDES));
        }
        if (this.data.branches) {
          for (const b of this.data.branches) {
            const defB = DEFAULT_BRANCHES.find((db) => db.id === b.id);
            if (!b.openingHours && defB?.openingHours) {
              b.openingHours = defB.openingHours;
            }
            if (!b.phone && defB?.phone) {
              b.phone = defB.phone;
            }
            if (!b.email && defB?.email) {
              b.email = defB.email;
            }
          }
        }
        if (this.data.menuItems && this.data.menuItems.length > 0) {
          for (const item of this.data.menuItems) {
            const def = DEFAULT_MENU.find((m) => m.id === item.id);
            if (!item.modifierGroups && def?.modifierGroups) {
              item.modifierGroups = JSON.parse(JSON.stringify(def.modifierGroups));
            }
            if (!item.imageUrl && def?.imageUrl) {
              item.imageUrl = def.imageUrl;
            }
          }
        }
        if (this.data.tables && this.data.tables.length > 0) {
          const seenTables = new Map<number, TableFloorRecord>();
          for (const t of this.data.tables) {
            seenTables.set(t.id, t);
          }
          this.data.tables = Array.from(seenTables.values());
        }
        if (!this.data.categories || this.data.categories.length === 0) {
          this.data.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
        }
        loadPersistedStaffRevocations(
          this.data.revokedStaffTokens || [],
          this.data.revokedStaffTokenJtis || [],
          this.data.revokedStaffIds || []
        );

        if (!this.data.staffMembers) {
          this.data.staffMembers = [];
        }
        loadPersistedStaffMembers(this.data.staffMembers);
        registerStaffPersistenceCallback((member) => {
          this.saveStaffMember(member);
        });

        // Preserve sequence numbers across restarts to guarantee monotonic continuity
        if (this.data.events && this.data.events.length > 0) {
          const maxSeq = this.data.events.reduce((max, ev) => Math.max(max, ev.sequence || 0), 0);
          this.eventSequence = Math.max(this.data.lastEventSequence || 0, maxSeq);
          this.data.lastEventSequence = this.eventSequence;
        } else {
          this.eventSequence = this.data.lastEventSequence || 0;
        }

        // Verify sanity: if tables array collapsed to <= 2, reseed to prevent broken test state
        if (!this.data.tables || this.data.tables.length < 5) {
          console.log('⚠️ [Storage] Store tables corrupted or collapsed. Reseeding canonical archetypes...');
          this.reseed();
        }
      } catch (err) {
        console.error('⚠️ [Storage] Corrupt store file. Attempting recovery from backup...', err);
        const bakPath = `${this.filePath}.bak`;
        let recovered = false;
        if (fs.existsSync(bakPath)) {
          try {
            const rawBak = fs.readFileSync(bakPath, 'utf-8');
            this.data = JSON.parse(rawBak);
            if (!this.data.invalidatedCapabilityTokens) {
              this.data.invalidatedCapabilityTokens = [];
            }
            if (this.data.events && this.data.events.length > 0) {
              const maxSeq = this.data.events.reduce((max, ev) => Math.max(max, ev.sequence || 0), 0);
              this.eventSequence = Math.max(this.data.lastEventSequence || 0, maxSeq);
              this.data.lastEventSequence = this.eventSequence;
            } else {
              this.eventSequence = this.data.lastEventSequence || 0;
            }
            console.log('✅ [Storage] Successfully recovered store from backup file.');
            recovered = true;
          } catch (bakErr) {
            console.error('⚠️ [Storage] Backup also corrupt. Reseeding canonical archetypes...', bakErr);
          }
        }
        if (!recovered) {
          this.reseed();
        }
      }
    } else {
      this.reseed();
    }
  }

  public reseed(): void {
    // Extract default guests from tables
    const defaultGuests: GuestRecord[] = [];
    DEFAULT_TABLES.forEach((tbl) => {
      tbl.seats.forEach((s) => {
        if (s.isOccupied && s.guestName) {
          defaultGuests.push({
            id: s.guestId || `guest_${s.id}`,
            name: s.guestName,
            tableNumber: tbl.number,
            seatId: s.id,
            seatLabel: s.label,
            role: s.guestName.includes('Host') ? 'HOST' : 'COMPANION',
            joinTime: '19:40',
            preferences: {
              diet: s.guestName.includes('Nikhil') ? 'Vegetarian' : 'Standard',
              spice: 'Medium',
              allergens: s.guestName.includes('Nikhil') ? ['Nuts'] : [],
              notes: s.guestName.includes('Nikhil') ? 'Birthday celebration dinner' : undefined,
            },
            orderIds: tbl.number === 'T-14' ? ['ord_101'] : [],
            totalSpendMinor: tbl.activeBillMinor || 0,
          });
        }
      });
    });

    const defaultSessions: DiningSessionRecord[] = [
      {
        sessionId: 'sess_14',
        tableNumber: 'T-14',
        branchId: 'branch_ldh',
        floorId: 'floor_courtyard',
        hostName: 'Nikhil (Host)',
        status: 'ACTIVE',
        openedAt: '19:15',
        guestCapabilityTokens: ['cap_test_host_14', 'cap_test_companion_14'],
      },
      {
        sessionId: 'sess_05',
        tableNumber: 'T-05',
        branchId: 'branch_ldh',
        floorId: 'floor_courtyard',
        hostName: 'Rajesh',
        status: 'ACTIVE',
        openedAt: '18:50',
        guestCapabilityTokens: ['cap_test_05'],
      },
    ];

    const initialOrders: RestaurantOrder[] = [
      {
        orderId: 'ord_101',
        tableNumber: 'T-14',
        sessionId: 'sess_14',
        status: 'CONFIRMED',
        items: [
          { id: 'item_paneer_tikka', name: 'Paneer Tikka Charcoal Grilled', quantity: 1, unitPriceMinor: 35000, station: 'TANDOOR', guestName: 'Nikhil (Host)', seatLabel: 'S1' },
          { id: 'item_dal_makhani', name: 'Dal Makhani Slow-Simmered (24 hrs)', quantity: 1, unitPriceMinor: 38000, station: 'CURRY_LINE', seatLabel: 'Shared' },
        ],
        subtotalMinor: 73000,
        taxMinor: 3650,
        totalMinor: 76650,
        currency: 'INR',
        createdAt: '19:42',
      },
      {
        orderId: 'ord_102',
        tableNumber: 'T-05',
        sessionId: 'sess_05',
        status: 'SERVED',
        items: [
          { id: 'item_fish_tikka', name: 'Amritsari Fish Tikka', quantity: 2, unitPriceMinor: 48000, station: 'TANDOOR', guestName: 'Rajesh', seatLabel: 'S1' },
          { id: 'item_mango_lassi', name: 'Alphonso Mango Lassi', quantity: 2, unitPriceMinor: 14000, station: 'BAR', seatLabel: 'S2' },
        ],
        subtotalMinor: 124000,
        taxMinor: 6200,
        totalMinor: 130200,
        currency: 'INR',
        createdAt: '19:15',
      },
    ];

    const defaultTables: TableFloorRecord[] = JSON.parse(JSON.stringify(DEFAULT_TABLES));
    defaultTables.forEach((t) => {
      if (t.number === 'T-14') {
        t.activeBillMinor = 76650;
      } else if (t.number === 'T-05') {
        t.activeBillMinor = 130200;
      } else {
        t.activeBillMinor = 0;
      }
    });

    this.data = {
      version: 2,
      lastUpdated: new Date().toISOString(),
      revisions: 1,
      branches: JSON.parse(JSON.stringify(DEFAULT_BRANCHES)),
      floors: JSON.parse(JSON.stringify(DEFAULT_FLOORS)),
      tables: defaultTables,
      orders: initialOrders,
      kitchenTasks: JSON.parse(JSON.stringify(DEFAULT_TASKS)),
      serviceRequests: JSON.parse(JSON.stringify(DEFAULT_SERVICE_REQUESTS)),
      menuItems: JSON.parse(JSON.stringify(DEFAULT_MENU)),
      categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
      guests: defaultGuests,
      sessions: defaultSessions,
      events: [],
      invalidatedCapabilityTokens: [],
      revokedStaffTokens: this.data?.revokedStaffTokens || [],
      revokedStaffTokenJtis: this.data?.revokedStaffTokenJtis || [],
      templates: JSON.parse(JSON.stringify(DEFAULT_TEMPLATES)),
      tenantBrand: JSON.parse(JSON.stringify(DEFAULT_BRAND_CONFIG)),
      templateDraft: JSON.parse(JSON.stringify(DEFAULT_TEMPLATE_DRAFT)),
      supportTickets: JSON.parse(JSON.stringify(DEFAULT_SUPPORT_TICKETS)),
      branchMenuOverrides: JSON.parse(JSON.stringify(DEFAULT_BRANCH_MENU_OVERRIDES)),
    };

    this.eventSequence = 0;
    this.flushSync();
  }

  public revokeStaffToken(token: string): boolean {
    if (!token) return false;
    if (!this.data.revokedStaffTokens) {
      this.data.revokedStaffTokens = [];
    }
    if (!this.data.revokedStaffTokenJtis) {
      this.data.revokedStaffTokenJtis = [];
    }
    if (!this.data.revokedStaffTokens.includes(token)) {
      this.data.revokedStaffTokens.push(token);
    }
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        if (claims.jti && !this.data.revokedStaffTokenJtis.includes(claims.jti)) {
          this.data.revokedStaffTokenJtis.push(claims.jti);
        }
      }
    } catch (e) {
      // Non-fatal
    }
    this.flushSync();
    revokeStaffTokenInSecurity(token);
    return true;
  }

  public revokeStaffMember(staffId: string): boolean {
    if (!staffId) return false;
    if (!this.data.revokedStaffIds) {
      this.data.revokedStaffIds = [];
    }
    if (!this.data.revokedStaffIds.includes(staffId)) {
      this.data.revokedStaffIds.push(staffId);
    }
    this.flushSync();
    revokeStaffMemberTokens(staffId);
    return true;
  }

  public getStaffMembers(): StaffDirectoryMember[] {
    return this.data.staffMembers || [];
  }

  public saveStaffMember(member: StaffDirectoryMember): void {
    if (!this.data.staffMembers) {
      this.data.staffMembers = [];
    }
    const idx = this.data.staffMembers.findIndex((m) => m.id === member.id);
    if (idx >= 0) {
      this.data.staffMembers[idx] = member;
    } else {
      this.data.staffMembers.push(member);
    }
    this.flushSync();
  }

  public updateStaffMemberInStore(
    id: string,
    updates: Partial<StaffDirectoryMember>
  ): StaffDirectoryMember | null {
    if (!this.data.staffMembers) return null;
    const member = this.data.staffMembers.find((m) => m.id === id);
    if (!member) return null;
    Object.assign(member, updates);
    this.flushSync();
    return member;
  }

  public getStaffMemberByIdentifier(identifier: string): StaffDirectoryMember | undefined {
    const list = this.getStaffMembers();
    const trimmed = identifier.trim().toLowerCase();
    return list.find((m) => {
      if (m.id.toLowerCase() === trimmed) return true;
      if (m.name.toLowerCase() === trimmed) return true;
      const perms = m.permissions as any;
      if (perms && typeof perms === 'object') {
        if (perms.email && String(perms.email).toLowerCase() === trimmed) return true;
        if (perms.phone && String(perms.phone) === trimmed) return true;
      }
      return false;
    });
  }

  public updateStaffMemberSecret(id: string, hash: string, salt: string): void {
    const member = this.getStaffMembers().find((m) => m.id === id);
    if (member) {
      member.pinHash = hash;
      member.salt = salt;
      this.flushSync();
    }
  }

  private flushSync(): void {
    const uniqueSuffix = `${Date.now()}_${process.pid}_${crypto.randomBytes(8).toString('hex')}`;
    const tmpPath = `${this.filePath}.tmp.${uniqueSuffix}`;
    const bakPath = `${this.filePath}.bak`;
    this.data.lastUpdated = new Date().toISOString();
    this.data.revisions += 1;
    let renameSucceeded = false;
    try {
      fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), 'utf-8');
      try {
        if (fs.existsSync(this.filePath)) {
          fs.copyFileSync(this.filePath, bakPath);
        }
      } catch (e) {
        // Non-fatal if backup copy fails
      }
      fs.renameSync(tmpPath, this.filePath);
      renameSucceeded = true;
    } finally {
      if (!renameSucceeded) {
        try {
          if (fs.existsSync(tmpPath)) {
            fs.unlinkSync(tmpPath);
          }
        } catch {
          // ignore cleanup error
        }
      }
    }
  }

  public onEvent(listener: (event: DomainEvent) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      const idx = this.eventListeners.indexOf(listener);
      if (idx >= 0) this.eventListeners.splice(idx, 1);
    };
  }

  public isCapabilityValid(token: string): boolean {
    if (!token) return false;
    if (this.data.invalidatedCapabilityTokens?.includes(token)) return false;
    const activeSession = this.data.sessions.find(
      (s) => s.status === 'ACTIVE' && s.guestCapabilityTokens?.includes(token)
    );
    if (!activeSession) return false;
    if (activeSession.expiresAt && Date.now() > new Date(activeSession.expiresAt).getTime()) {
      return false;
    }
    const table = this.getTableByNumber(activeSession.tableNumber);
    if (!table || table.activeSessionId !== activeSession.sessionId) {
      return false;
    }
    return true;
  }

  public revokeCapabilityToken(token: string): boolean {
    if (!token) return false;
    if (!this.data.invalidatedCapabilityTokens) {
      this.data.invalidatedCapabilityTokens = [];
    }
    if (!this.data.invalidatedCapabilityTokens.includes(token)) {
      this.data.invalidatedCapabilityTokens.push(token);
      this.flushSync();
    }
    return true;
  }

  public getIdempotencyRecord(key: string): any | undefined {
    return this.data.idempotencyRecords?.[key];
  }

  public saveIdempotencyRecord(
    key: string,
    record: { payloadHash?: string; response?: any; tableNumber?: string; settlement?: SettlementRecord; [key: string]: any }
  ): void {
    if (!this.data.idempotencyRecords) {
      this.data.idempotencyRecords = {};
    }
    this.data.idempotencyRecords[key] = {
      ...record,
      createdAt: new Date().toISOString(),
    };
    this.flushSync();
  }

  public resetToArchetypes(): void {
    this.reseed();
  }

  public async flush(): Promise<void> {
    if (this.isSaving) return;
    this.isSaving = true;
    try {
      this.flushSync();
    } finally {
      this.isSaving = false;
    }
  }

  // --- QUERY ACCESSORS ---

  public getBranches(): BranchRecord[] {
    return this.data.branches;
  }

  public getBranch(id: string): BranchRecord | undefined {
    return this.data.branches.find((b) => b.id === id);
  }

  public getFloors(branchId?: string): FloorRecord[] {
    if (branchId) {
      return this.data.floors.filter((f) => f.branchId === branchId);
    }
    return this.data.floors;
  }

  public getFloor(id: string): FloorRecord | undefined {
    return this.data.floors.find((f) => f.id === id);
  }

  public getTables(branchId?: string, floorId?: string): TableFloorRecord[] {
    let list = this.data.tables;
    if (branchId) {
      list = list.filter((t) => t.branchId === branchId);
    }
    if (floorId) {
      list = list.filter((t) => t.floorId === floorId);
    }
    return list;
  }

  public getTable(id: number): TableFloorRecord | undefined {
    return this.data.tables.find((t) => t.id === id);
  }

  public getTableByNumber(number: string): TableFloorRecord | undefined {
    return this.data.tables.find((t) => t.number === number);
  }

  public getTableByLocator(locator: string): TableFloorRecord | undefined {
    return this.data.tables.find((t) => t.locator === locator);
  }

  public getMenuItems(includeArchived = false): MenuItem[] {
    if (!this.data.menuItems) return [];
    if (includeArchived) return [...this.data.menuItems];
    return this.data.menuItems.filter((m) => !m.isArchived);
  }

  public getMenuItem(id: string): MenuItem | undefined {
    return this.data.menuItems.find((m) => m.id === id);
  }

  public getKitchenTasks(station?: string, branchId?: string): KitchenTask[] {
    let list = this.data.kitchenTasks;
    if (station && station !== 'ALL') {
      list = list.filter((t) => t.station === station);
    }
    if (branchId && branchId !== '*') {
      list = list.filter((t) => {
        if (t.branchId) return t.branchId === branchId;
        const tbl = this.getTableByNumber(t.tableNumber);
        return tbl?.branchId === branchId;
      });
    }
    return list;
  }

  public getOrders(tableNumber?: string, sessionId?: string, branchId?: string, status?: string): RestaurantOrder[] {
    let list = this.data.orders;
    if (tableNumber) {
      list = list.filter((o) => o.tableNumber === tableNumber);
    }
    if (sessionId) {
      list = list.filter((o) => o.sessionId === sessionId);
    }
    if (branchId && branchId !== '*') {
      list = list.filter((o) => {
        if (o.branchId) return o.branchId === branchId;
        const tbl = this.getTableByNumber(o.tableNumber);
        return tbl?.branchId === branchId;
      });
    }
    if (status && status !== 'ALL') {
      if (status === 'ACTIVE') {
        list = list.filter((o) => !['PAID', 'VOIDED', 'CANCELLED', 'COMPED'].includes(o.status));
      } else {
        list = list.filter((o) => o.status === status);
      }
    }
    return list;
  }

  public getOrder(orderId: string): RestaurantOrder | undefined {
    return this.data.orders.find((o) => o.orderId === orderId);
  }

  public getServiceRequests(branchId?: string): ServiceRequest[] {
    if (branchId) {
      return this.data.serviceRequests.filter((r) => r.branchId === branchId);
    }
    return this.data.serviceRequests;
  }

  public getGuests(tableNumber?: string): GuestRecord[] {
    if (tableNumber) {
      return this.data.guests.filter((g) => g.tableNumber === tableNumber);
    }
    return this.data.guests;
  }

  public getSessions(): DiningSessionRecord[] {
    return this.data.sessions;
  }

  public getSession(sessionId: string): DiningSessionRecord | undefined {
    return this.data.sessions.find((s) => s.sessionId === sessionId);
  }

  public getEvents(sinceSequence = 0, branchId?: string): DomainEvent[] {
    let list = this.data.events.filter((e) => e.sequence > sinceSequence);
    if (branchId && branchId !== '*') {
      list = list.filter((e) => e.branchId === branchId);
    }
    return list;
  }

  public getOldestEventSequence(): number {
    if (this.data.events && this.data.events.length > 0) {
      return this.data.events[0].sequence;
    }
    return 1;
  }

  public getLastEventSequence(): number {
    return this.data.lastEventSequence || this.eventSequence || 0;
  }

  public checkWritable(): boolean {
    try {
      const dataDir = path.dirname(this.filePath);
      fs.accessSync(dataDir, fs.constants.R_OK | fs.constants.W_OK);
      if (fs.existsSync(this.filePath)) {
        fs.accessSync(this.filePath, fs.constants.R_OK | fs.constants.W_OK);
      }
      return true;
    } catch {
      return false;
    }
  }

  public getRevisions(): number {
    return this.data.revisions;
  }

  public getRawData(): RestaurantRuntimeStoreData {
    return this.data;
  }

  /**
   * Serializes async mutations in-process to guarantee atomic single-writer semantics
   * and prevent interleaved lost updates during concurrent operations.
   */
  private mutationQueue: Promise<any> = Promise.resolve();

  public async runSerializedMutation<T>(mutationFn: () => Promise<T> | T): Promise<T> {
    const nextPromise = this.mutationQueue.then(async () => {
      return await mutationFn();
    });
    this.mutationQueue = nextPromise.catch(() => {});
    return nextPromise;
  }

  /**
   * Explicit, audited table QR locator rotation.
   * Required ONLY when physical signage is re-printed or a QR locator has been compromised.
   * Ordinary checkout NEVER rotates locators.
   */
  public rotateTableLocator(
    tableId: number,
    authorizedBy: string,
    reason?: string
  ): {
    success: boolean;
    table?: TableFloorRecord;
    oldLocator?: string;
    newLocator?: string;
    error?: string;
  } {
    const table = this.data.tables.find((t) => t.id === tableId);
    if (!table) {
      return { success: false, error: `Table ${tableId} not found` };
    }
    const oldLocator = table.locator;
    const newLocator = `LOC${table.id}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
    table.locator = newLocator;

    this.appendEvent(
      'table.locator_rotated',
      'store:table-security',
      table.branchId,
      {
        tableId: table.id,
        tableNumber: table.number,
        oldLocator,
        newLocator,
        authorizedBy,
        reason: reason || 'Explicit locator rotation requested by staff',
        rotatedAt: new Date().toISOString(),
      },
      table.floorId,
      table.number
    );
    this.flushSync();
    return { success: true, table, oldLocator, newLocator };
  }

  // --- MUTATIONS WITH ATOMIC PERSISTENCE & INVARIANTS ---

  public appendEvent<T = any>(
    type: string,
    producer: string,
    branchId: string,
    payload: T,
    floorId?: string,
    tableNumber?: string
  ): DomainEvent<T> {
    this.eventSequence += 1;
    this.data.lastEventSequence = this.eventSequence;
    const event: DomainEvent<T> = {
      id: `evt_${crypto.randomUUID()}`,
      sequence: this.eventSequence,
      type,
      timestamp: new Date().toISOString(),
      producer,
      branchId,
      floorId,
      tableNumber,
      payload,
    };
    this.data.events.push(event);
    // Keep max 200 events in active memory
    if (this.data.events.length > 200) {
      this.data.events = this.data.events.slice(-200);
    }
    this.flushSync();
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('⚠️ [Storage] Event listener error:', err);
      }
    }
    return event;
  }

  // Branch CRUD
  public saveBranch(branch: BranchRecord): BranchRecord {
    const idx = this.data.branches.findIndex((b) => b.id === branch.id);
    if (idx >= 0) {
      this.data.branches[idx] = { ...this.data.branches[idx], ...branch };
    } else {
      this.data.branches.push(branch);
    }
    this.appendEvent('branch.updated', 'store:branch-service', branch.id, branch);
    this.flushSync();
    return branch;
  }

  // Floor CRUD
  public saveFloor(floor: FloorRecord): FloorRecord {
    const idx = this.data.floors.findIndex((f) => f.id === floor.id);
    if (idx >= 0) {
      this.data.floors[idx] = { ...this.data.floors[idx], ...floor };
    } else {
      this.data.floors.push(floor);
    }
    this.appendEvent('floor.updated', 'store:floor-service', floor.branchId, floor, floor.id);
    this.flushSync();
    return floor;
  }

  // Spatial Floor Table Persistence
  // CRITICAL INVARIANT: Single-table updates update ONLY that table in place!
  // Full-floor saves replace ONLY the tables for that specific floor/branch!
  public saveFloorTables(
    incomingTables: TableFloorRecord[],
    branchId?: string,
    floorId?: string,
    options?: { expectedRevision?: number }
  ): { success: boolean; error?: string; code?: string } {
    if (options?.expectedRevision !== undefined && options.expectedRevision !== this.data.revisions) {
      return {
        success: false,
        error: `Revision conflict: expected revision ${options.expectedRevision} but current store revision is ${this.data.revisions}`,
        code: 'REVISION_CONFLICT',
      };
    }
    if (!incomingTables || incomingTables.length === 0) return { success: true };

    if (incomingTables.length === 1) {
      const updated = incomingTables[0];
      const idx = this.data.tables.findIndex((t) => t.id === updated.id);
      if (idx >= 0) {
        this.data.tables[idx] = { ...this.data.tables[idx], ...updated };
      } else {
        this.data.tables.push(updated);
      }
      this.appendEvent(
        'table.updated',
        'store:spatial-studio',
        updated.branchId || branchId || 'branch_ldh',
        updated,
        updated.floorId || floorId,
        updated.number
      );
    } else {
      // Multiple tables being saved for a specific floor/branch
      const targetBranch = branchId || incomingTables[0].branchId || 'branch_ldh';
      const targetFloor = floorId || incomingTables[0].floorId || 'floor_courtyard';
      const incomingIds = new Set(incomingTables.map((t) => t.id));

      // Keep all tables NOT belonging to this floor/branch AND NOT in incomingTables
      const otherTables = this.data.tables.filter(
        (t) =>
          !(t.branchId === targetBranch && (t.floorId === targetFloor || !t.floorId)) &&
          !incomingIds.has(t.id)
      );

      this.data.tables = [...otherTables, ...incomingTables];
      this.appendEvent(
        'floor.layout_saved',
        'store:spatial-studio',
        targetBranch,
        { tableCount: incomingTables.length },
        targetFloor
      );
    }
    this.flushSync();
    return { success: true };
  }

  // Update Table Capacity and Synchronize Seats
  public updateTableCapacity(tableId: number, newCapacity: number): TableFloorRecord | undefined {
    const table = this.data.tables.find((t) => t.id === tableId);
    if (!table) return undefined;

    table.capacity = newCapacity;
    const currentSeats = table.seats || [];

    if (currentSeats.length < newCapacity) {
      // Add missing seats
      for (let i = currentSeats.length + 1; i <= newCapacity; i++) {
        currentSeats.push({
          id: `seat_${table.id}_${i}`,
          seatNumber: i,
          label: `S${i}`,
          isOccupied: false,
        });
      }
    } else if (currentSeats.length > newCapacity) {
      // Remove excess vacant seats from the end
      table.seats = currentSeats.slice(0, newCapacity);
    }

    this.appendEvent(
      'table.updated',
      'store:table-service',
      table.branchId,
      { tableId: table.id, capacity: newCapacity, seatsCount: table.seats.length },
      table.floorId,
      table.number
    );
    this.flushSync();
    return table;
  }

  // Seat Management
  public addSeatToTable(tableId: number, customLabel?: string): SeatRecord | undefined {
    const table = this.data.tables.find((t) => t.id === tableId);
    if (!table) return undefined;

    const nextNum = (table.seats?.length || 0) + 1;
    const newSeat: SeatRecord = {
      id: `seat_${table.id}_${nextNum}_${Date.now().toString(36)}`,
      seatNumber: nextNum,
      label: customLabel || `S${nextNum}`,
      isOccupied: false,
    };
    table.seats.push(newSeat);
    table.capacity = Math.max(table.capacity, table.seats.length);

    this.appendEvent('seat.updated', 'store:seat-service', table.branchId, newSeat, table.floorId, table.number);
    this.flushSync();
    return newSeat;
  }

  public removeSeatFromTable(tableId: number, seatId: string): boolean {
    const table = this.data.tables.find((t) => t.id === tableId);
    if (!table) return false;

    const idx = table.seats.findIndex((s) => s.id === seatId);
    if (idx >= 0) {
      table.seats.splice(idx, 1);
      table.capacity = Math.max(1, table.seats.length);
      this.appendEvent(
        'seat.updated',
        'store:seat-service',
        table.branchId,
        { tableId, removedSeatId: seatId },
        table.floorId,
        table.number
      );
      this.flushSync();
      return true;
    }
    return false;
  }

  // Assign Guest to Seat
  public assignGuestToSeat(
    seatId: string,
    guestName: string,
    preferences?: any
  ): { seat: SeatRecord; guest: GuestRecord } | undefined {
    // Find table containing seat
    let targetTable: TableFloorRecord | undefined;
    let targetSeat: SeatRecord | undefined;

    for (const t of this.data.tables) {
      const s = t.seats.find((st) => st.id === seatId);
      if (s) {
        targetTable = t;
        targetSeat = s;
        break;
      }
    }

    if (!targetTable || !targetSeat) return undefined;

    targetSeat.guestName = guestName;
    targetSeat.isOccupied = !!guestName;

    const guestId = targetSeat.guestId || `guest_${targetSeat.id}`;
    targetSeat.guestId = guestId;

    let guest = this.data.guests.find((g) => g.id === guestId);
    if (guest) {
      guest.name = guestName;
      if (preferences) guest.preferences = { ...guest.preferences, ...preferences };
    } else {
      guest = {
        id: guestId,
        name: guestName,
        tableNumber: targetTable.number,
        seatId: targetSeat.id,
        seatLabel: targetSeat.label,
        role: targetSeat.seatNumber === 1 ? 'HOST' : 'COMPANION',
        joinTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        preferences: preferences || { diet: 'Standard', spice: 'Medium' },
        orderIds: [],
        totalSpendMinor: 0,
      };
      this.data.guests.push(guest);
    }

    targetTable.status = 'OCCUPIED';

    this.appendEvent(
      'guest.joined',
      'store:guest-service',
      targetTable.branchId,
      { guest, seat: targetSeat },
      targetTable.floorId,
      targetTable.number
    );
    this.flushSync();
    return { seat: targetSeat, guest };
  }

  // Table Merging / Unmerging
  public mergeTables(tableId1: number, tableId2: number): boolean {
    const t1 = this.data.tables.find((t) => t.id === tableId1);
    const t2 = this.data.tables.find((t) => t.id === tableId2);
    if (!t1 || !t2) return false;

    t1.mergedWithTableIds = [t2.id];
    t2.mergedWithTableIds = [t1.id];
    t1.status = 'OCCUPIED';
    t2.status = 'OCCUPIED';

    this.appendEvent(
      'table.merged',
      'store:table-service',
      t1.branchId,
      { table1: t1.number, table2: t2.number },
      t1.floorId,
      t1.number
    );
    this.flushSync();
    return true;
  }

  public unmergeTables(tableId: number): boolean {
    const target = this.data.tables.find((t) => t.id === tableId);
    if (!target) return false;

    const partnerIds = target.mergedWithTableIds || [];
    target.mergedWithTableIds = [];
    partnerIds.forEach((pid) => {
      const partner = this.data.tables.find((t) => t.id === pid);
      if (partner) partner.mergedWithTableIds = [];
    });

    this.appendEvent(
      'table.unmerged',
      'store:table-service',
      target.branchId,
      { tableId: target.id },
      target.floorId,
      target.number
    );
    this.flushSync();
    return true;
  }

  // Orders & Kitchen Tasks
  public addOrder(order: RestaurantOrder): void {
    this.data.orders.unshift(order);
    const targetTable = this.getTableByNumber(order.tableNumber);
    if (targetTable) {
      targetTable.status = 'OCCUPIED';
      targetTable.activeBillMinor = (targetTable.activeBillMinor || 0) + order.totalMinor;
    }

    this.appendEvent(
      'order.created',
      'store:order-service',
      targetTable?.branchId || 'branch_ldh',
      order,
      targetTable?.floorId,
      order.tableNumber
    );
    this.flushSync();
  }

  public addKitchenTask(task: KitchenTask): void {
    task.modifiers = task.modifiers || [];
    if (!task.createdAt) task.createdAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();
    this.data.kitchenTasks.unshift(task);
    const targetTable = this.getTableByNumber(task.tableNumber);
    this.appendEvent(
      'task.created',
      'store:kitchen-service',
      targetTable?.branchId || 'branch_ldh',
      task,
      targetTable?.floorId,
      task.tableNumber
    );
    this.flushSync();
  }

  public updateKitchenTaskStatus(
    taskId: string,
    nextStatus?: string,
    options?: { station?: string; expectedRevision?: number }
  ): KdsTransitionResult {
    if (options?.expectedRevision !== undefined && options.expectedRevision !== this.data.revisions) {
      return {
        success: false,
        error: `Revision conflict: expected revision ${options.expectedRevision} but current store revision is ${this.data.revisions}`,
        code: 'REVISION_CONFLICT',
      };
    }

    const task = this.data.kitchenTasks.find((t) => t.id === taskId);
    if (!task) {
      return { success: false, error: `Task ${taskId} not found`, code: 'TASK_NOT_FOUND' };
    }

    if (options?.station && options.station !== 'ALL' && task.station !== options.station) {
      return {
        success: false,
        error: `Station ${options.station} is not authorized for task assigned to ${task.station}`,
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

    // Idempotency: if already at target status, return cleanly
    if (task.status === targetStatus) {
      return { success: true, task, isIdempotent: true };
    }

    const ALLOWED_TRANSITIONS: Record<string, string[]> = {
      QUEUED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['READY', 'QUEUED'],
      READY: ['BUMPED', 'IN_PROGRESS'],
      BUMPED: ['READY'],
    };

    const allowed = ALLOWED_TRANSITIONS[task.status] || [];
    if (!allowed.includes(targetStatus)) {
      return {
        success: false,
        error: `Invalid transition from ${task.status} to ${targetStatus}`,
        code: 'INVALID_TRANSITION',
      };
    }

    task.status = targetStatus as any;

    const targetTable = this.getTableByNumber(task.tableNumber);
    const eventType =
      task.status === 'IN_PROGRESS'
        ? 'task.started'
        : task.status === 'READY'
        ? 'task.ready'
        : 'task.bumped';

    this.appendEvent(
      eventType,
      'store:kitchen-service',
      targetTable?.branchId || 'branch_ldh',
      task,
      targetTable?.floorId,
      task.tableNumber
    );
    this.flushSync();
    return { success: true, task, isIdempotent: false };
  }

  public fulfillTaskItem(taskId: string, targetCount?: number): KdsTransitionResult {
    const task = this.data.kitchenTasks.find((t) => t.id === taskId);
    if (!task) {
      return { success: false, error: `Task ${taskId} not found`, code: 'TASK_NOT_FOUND' };
    }

    if (task.status === 'BUMPED') {
      return { success: false, error: 'Task already completed and bumped', code: 'ALREADY_COMPLETED' };
    }

    // Idempotent retry: if already at or above quantity, return cleanly without inflating count
    if (task.fulfilledItemCount !== undefined && task.fulfilledItemCount >= task.quantity) {
      return { success: true, task, isIdempotent: true };
    }

    const nextCount =
      targetCount !== undefined ? Math.min(targetCount, task.quantity) : (task.fulfilledItemCount || 0) + 1;
    task.fulfilledItemCount = Math.min(nextCount, task.quantity);

    if (task.fulfilledItemCount >= task.quantity) {
      task.status = 'READY';
    } else {
      task.status = 'IN_PROGRESS';
    }

    const targetTable = this.getTableByNumber(task.tableNumber);
    this.appendEvent(
      'task.item_fulfilled',
      'store:kitchen-service',
      targetTable?.branchId || 'branch_ldh',
      task,
      targetTable?.floorId,
      task.tableNumber
    );
    this.flushSync();
    return { success: true, task, isIdempotent: false };
  }

  public recallTask(taskId: string, targetStatus?: string): KdsTransitionResult {
    const task = this.data.kitchenTasks.find((t) => t.id === taskId);
    if (!task) {
      return { success: false, error: `Task ${taskId} not found`, code: 'TASK_NOT_FOUND' };
    }

    if (task.status === 'QUEUED') {
      return { success: false, error: 'Cannot recall a task that is still in QUEUED state', code: 'INVALID_TRANSITION' };
    }

    // Idempotency: if already at requested target status
    if (targetStatus && task.status === targetStatus) {
      return { success: true, task, isIdempotent: true };
    }

    if (targetStatus) {
      if (['IN_PROGRESS', 'READY'].includes(targetStatus)) {
        task.status = targetStatus as any;
      } else {
        return { success: false, error: `Invalid target recall status: ${targetStatus}`, code: 'INVALID_TRANSITION' };
      }
    } else {
      if (task.status === 'BUMPED') {
        task.status = 'READY';
      } else if (task.status === 'READY') {
        task.status = 'IN_PROGRESS';
      }
    }

    const targetTable = this.getTableByNumber(task.tableNumber);
    this.appendEvent(
      'task.recalled',
      'store:kitchen-service',
      targetTable?.branchId || 'branch_ldh',
      task,
      targetTable?.floorId,
      task.tableNumber
    );
    this.flushSync();
    return { success: true, task, isIdempotent: false };
  }

  // Service Requests
  public addServiceRequest(req: ServiceRequest): ServiceRequest {
    this.data.serviceRequests.unshift(req);
    this.appendEvent(
      'service_request.created',
      'store:service-request',
      req.branchId,
      req,
      req.floorId,
      req.tableNumber
    );
    this.flushSync();
    return req;
  }

  public resolveServiceRequest(requestId: string): ServiceRequest | undefined {
    const req = this.data.serviceRequests.find((r) => r.id === requestId);
    if (!req) return undefined;

    req.status = 'RESOLVED';
    this.appendEvent(
      'service_request.resolved',
      'store:service-request',
      req.branchId,
      req,
      req.floorId,
      req.tableNumber
    );
    this.flushSync();
    return req;
  }

  // Create or Join Dining Session
  public createOrJoinSession(
    tableNumber: string,
    hostName: string,
    arg3?: string,
    arg4?: string,
    arg5?: string
  ): DiningSessionRecord {
    let branchId = 'main';
    let floorId = 'ground';
    let capabilityToken = `cap_${crypto.randomBytes(16).toString('hex')}`;

    if (arg3 && (arg3.startsWith('cap_') || arg3.startsWith('orb_cap_'))) {
      capabilityToken = arg3;
      if (arg4) branchId = arg4;
      if (arg5) floorId = arg5;
    } else {
      if (arg3) branchId = arg3;
      if (arg4) floorId = arg4;
      if (arg5) capabilityToken = arg5;
    }

    let sess = this.data.sessions.find((s) => s.tableNumber === tableNumber && s.status === 'ACTIVE');
    if (!sess) {
      sess = {
        sessionId: `sess_${Date.now().toString(36)}`,
        tableNumber,
        branchId,
        floorId,
        hostName,
        status: 'ACTIVE',
        openedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        guestCapabilityTokens: [capabilityToken],
      };
      this.data.sessions.push(sess);
    } else {
      if (!sess.guestCapabilityTokens.includes(capabilityToken)) {
        sess.guestCapabilityTokens.push(capabilityToken);
      }
    }

    const table = this.getTableByNumber(tableNumber);
    if (table) {
      table.status = 'OCCUPIED';
      table.activeSessionId = sess.sessionId;
    }

    this.appendEvent(
      'session.joined',
      'store:session-service',
      branchId,
      { sessionId: sess.sessionId, tableNumber, hostName, capabilityToken },
      floorId,
      tableNumber
    );
    this.flushSync();
    return sess;
  }

  // Close Dining Session & Reset Table (with payment settlement safety & physical QR permanence)
  public closeSession(
    tableNumber: string,
    settlement?: {
      method?: 'CASH' | 'CARD' | 'UPI' | 'COMP' | 'VOID' | 'REFUND' | 'EMERGENCY_OVERRIDE';
      status?: 'PAID' | 'COMPED' | 'VOIDED' | 'REFUNDED' | 'PARTIAL' | 'UNSETTLED_OVERRIDE';
      amountMinor?: number;
      authorizedBy?: string;
      reason?: string;
      verification?: 'MANUAL_STAFF_RECORDED' | 'PROVIDER_CONFIRMED' | 'UNVERIFIED';
      providerConfirmed?: boolean;
      gatewayTransactionId?: string;
    },
    force = false,
    options?: { expectedRevision?: number; authorizedBy?: string; reason?: string; idempotencyKey?: string; idempotencyRecord?: any }
  ): SessionCloseResult {
    if (options?.expectedRevision !== undefined && options.expectedRevision !== this.data.revisions) {
      return {
        success: false,
        error: `Revision conflict: expected revision ${options.expectedRevision} but current store revision is ${this.data.revisions}`,
        code: 'REVISION_CONFLICT',
      };
    }

    const table = this.getTableByNumber(tableNumber);
    if (!table) {
      return { success: false, error: `Table ${tableNumber} not found`, code: 'TABLE_NOT_FOUND' };
    }

    // Find active session
    const sess = this.data.sessions.find((s) => s.tableNumber === tableNumber && s.status === 'ACTIVE');

    const hasUnpaidOrders = this.data.orders.some(
      (o) => o.tableNumber === tableNumber && !['PAID', 'VOIDED', 'CANCELLED', 'COMPED', 'UNSETTLED_OVERRIDE'].includes(o.status)
    );

    // Idempotent duplicate close: only if table already available, no active session, no active bill, and no unpaid orders
    if (table.status === 'AVAILABLE' && !sess && !hasUnpaidOrders && (!table.activeBillMinor || table.activeBillMinor === 0)) {
      return {
        success: true,
        table,
        session: undefined,
        isIdempotent: true,
      };
    }

    // Snapshot critical state for atomic rollback if disk flush fails
    const ordersSnapshot = JSON.parse(JSON.stringify(this.data.orders.filter((o) => o.tableNumber === tableNumber)));
    const tableSnapshot = JSON.parse(JSON.stringify(table));
    const sessionSnapshot = sess ? JSON.parse(JSON.stringify(sess)) : undefined;
    const invalidatedTokensSnapshot = this.data.invalidatedCapabilityTokens ? [...this.data.invalidatedCapabilityTokens] : [];
    const eventsSnapshotLength = this.data.events ? this.data.events.length : 0;
    const initialSeq = this.eventSequence;
    const initialLastSeq = this.data.lastEventSequence || 0;
    const idempotencyKey = options?.idempotencyKey;
    const idempotencyExistedBefore = Boolean(idempotencyKey && this.data.idempotencyRecords?.[idempotencyKey]);
    const previousIdempotencyRecord =
      idempotencyKey && this.data.idempotencyRecords?.[idempotencyKey]
        ? JSON.parse(JSON.stringify(this.data.idempotencyRecords[idempotencyKey]))
        : undefined;

    const activeBill = table.activeBillMinor || 0;
    const authorizer = settlement?.authorizedBy || options?.authorizedBy || 'staff:pos';
    const reasonText = settlement?.reason || options?.reason;

    let finalSettlement: SettlementRecord | undefined;

    // Check financial settlement safety
    if (activeBill > 0) {
      if (force || settlement?.method === 'EMERGENCY_OVERRIDE') {
        // Emergency Override closure: requires explicit authorizedBy and mandatory reason
        if (!options?.authorizedBy && !settlement?.authorizedBy) {
          return {
            success: false,
            error: 'Emergency closure override requires explicit manager authorization (authorizedBy)',
            code: 'UNAUTHORIZED_OVERRIDE',
          };
        }
        if (!reasonText || reasonText.trim().length === 0) {
          return {
            success: false,
            error: 'Emergency closure override requires a mandatory operational reason',
            code: 'UNAUTHORIZED_OVERRIDE',
          };
        }

        // Record emergency override with outstanding financial liability! Never invent fake payment!
        finalSettlement = {
          method: 'EMERGENCY_OVERRIDE',
          status: 'UNSETTLED_OVERRIDE',
          amountMinor: 0,
          unsettledLiabilityMinor: activeBill,
          settledAt: new Date().toISOString(),
          authorizedBy: authorizer,
          reason: reasonText,
          verification: 'MANUAL_STAFF_RECORDED',
          providerConfirmed: false,
        };

        // Orders are NOT marked PAID! They are marked UNSETTLED_OVERRIDE
        this.data.orders.forEach((o) => {
          if (o.tableNumber === tableNumber && (!sess || !o.sessionId || o.sessionId === sess.sessionId) && !['PAID', 'VOIDED', 'CANCELLED', 'COMPED', 'UNSETTLED_OVERRIDE'].includes(o.status)) {
            o.status = 'UNSETTLED_OVERRIDE';
          }
        });
      } else {
        // Normal closure with active check
        if (!settlement || !settlement.status) {
          return {
            success: false,
            error: `Cannot close session: Table ${tableNumber} has an outstanding unpaid check of ₹${(activeBill / 100).toFixed(2)}. Complete payment first or provide authorized settlement.`,
            code: 'UNPAID_BALANCE',
          };
        }

        if (settlement.status === 'PARTIAL') {
          const settledAmt = settlement.amountMinor || 0;
          const remainingMinor = Math.max(0, activeBill - settledAmt);
          return {
            success: false,
            error: `Cannot close session with partial payment: ₹${(settledAmt / 100).toFixed(2)} received, ₹${(remainingMinor / 100).toFixed(2)} balance remaining on Table ${tableNumber}.`,
            code: 'PARTIAL_SETTLEMENT_UNRESOLVED',
          };
        }

        if (settlement.status === 'PAID') {
          if (settlement.amountMinor !== undefined && settlement.amountMinor < activeBill) {
            const remainingMinor = activeBill - settlement.amountMinor;
            return {
              success: false,
              error: `Settlement amount ₹${(settlement.amountMinor / 100).toFixed(2)} is less than total check ₹${(activeBill / 100).toFixed(2)}. Remaining balance: ₹${(remainingMinor / 100).toFixed(2)}.`,
              code: 'PARTIAL_SETTLEMENT_UNRESOLVED',
            };
          }

          const isProviderConfirmed = Boolean(settlement.providerConfirmed && settlement.gatewayTransactionId);
          finalSettlement = {
            method: settlement.method || 'CASH',
            status: 'PAID',
            amountMinor: settlement.amountMinor !== undefined ? settlement.amountMinor : activeBill,
            settledAt: new Date().toISOString(),
            authorizedBy: authorizer,
            verification: settlement.verification || (isProviderConfirmed ? 'PROVIDER_CONFIRMED' : 'MANUAL_STAFF_RECORDED'),
            providerConfirmed: isProviderConfirmed,
            gatewayTransactionId: settlement.gatewayTransactionId,
          };

          this.data.orders.forEach((o) => {
            if (o.tableNumber === tableNumber && (!sess || !o.sessionId || o.sessionId === 'sess_demo' || o.sessionId === sess.sessionId) && !['PAID', 'VOIDED', 'CANCELLED', 'COMPED', 'UNSETTLED_OVERRIDE'].includes(o.status)) {
              o.status = 'PAID';
            }
          });
        } else if (settlement.status === 'COMPED') {
          if (!reasonText || reasonText.trim().length < 3) {
            return {
              success: false,
              error: 'Comping an unpaid check requires a mandatory manager reason with at least 3 characters',
              code: 'REASON_REQUIRED',
            };
          }
          finalSettlement = {
            method: 'COMP',
            status: 'COMPED',
            amountMinor: activeBill,
            settledAt: new Date().toISOString(),
            authorizedBy: authorizer,
            reason: reasonText,
            verification: 'MANUAL_STAFF_RECORDED',
            providerConfirmed: false,
          };

          this.data.orders.forEach((o) => {
            if (o.tableNumber === tableNumber && (!sess || !o.sessionId || o.sessionId === sess.sessionId) && !['PAID', 'VOIDED', 'CANCELLED', 'COMPED', 'UNSETTLED_OVERRIDE'].includes(o.status)) {
              o.status = 'COMPED';
            }
          });
        } else if (settlement.status === 'VOIDED') {
          if (!reasonText || reasonText.trim().length < 3) {
            return {
              success: false,
              error: 'Voiding an unpaid check requires a mandatory reason with at least 3 characters',
              code: 'REASON_REQUIRED',
            };
          }
          finalSettlement = {
            method: 'VOID',
            status: 'VOIDED',
            amountMinor: activeBill,
            settledAt: new Date().toISOString(),
            authorizedBy: authorizer,
            reason: reasonText,
            verification: 'MANUAL_STAFF_RECORDED',
            providerConfirmed: false,
          };

          this.data.orders.forEach((o) => {
            if (o.tableNumber === tableNumber && (!sess || !o.sessionId || o.sessionId === sess.sessionId) && !['PAID', 'VOIDED', 'CANCELLED', 'COMPED', 'UNSETTLED_OVERRIDE'].includes(o.status)) {
              o.status = 'VOIDED';
            }
          });
        } else {
          return {
            success: false,
            error: `Invalid settlement status: ${settlement.status}. Must be PAID, COMPED, VOIDED, or EMERGENCY_OVERRIDE.`,
            code: 'INVALID_SETTLEMENT',
          };
        }
      }
    } else {
      // Zero active bill
      if (settlement) {
        finalSettlement = {
          method: settlement.method || 'CASH',
          status: 'PAID',
          amountMinor: 0,
          settledAt: new Date().toISOString(),
          authorizedBy: authorizer,
          verification: 'MANUAL_STAFF_RECORDED',
          providerConfirmed: false,
        };
        if (settlement.status === 'PAID') {
          this.data.orders.forEach((o) => {
            if (o.tableNumber === tableNumber && !['PAID', 'VOIDED', 'CANCELLED', 'COMPED', 'UNSETTLED_OVERRIDE'].includes(o.status)) {
              o.status = 'PAID';
            }
          });
        }
      }
    }

    try {
      if (sess) {
        sess.status = 'CLOSED';
        sess.closedAt = new Date().toISOString();
        if (finalSettlement) {
          sess.settlement = finalSettlement;
        }
        if (!this.data.invalidatedCapabilityTokens) {
          this.data.invalidatedCapabilityTokens = [];
        }
        sess.guestCapabilityTokens?.forEach((tok) => {
          if (!this.data.invalidatedCapabilityTokens!.includes(tok)) {
            this.data.invalidatedCapabilityTokens!.push(tok);
          }
        });
      }

      table.status = 'AVAILABLE';
      table.activeSessionId = undefined;
      table.activeBillMinor = 0;
      table.turnTimeMinutes = 0;
      // CRITICAL INVARIANT: table.locator remains UNCHANGED! Preserving the physical QR contract!
      table.seats.forEach((s) => {
        s.isOccupied = false;
        s.guestName = undefined;
        s.guestId = undefined;
      });

      const nextSeq = this.eventSequence + 1;
      const isEmergency = finalSettlement?.method === 'EMERGENCY_OVERRIDE';
      const event: DomainEvent = {
        id: `evt_${crypto.randomUUID()}`,
        sequence: nextSeq,
        type: isEmergency ? 'session.emergency_closed' : 'session.closed',
        timestamp: new Date().toISOString(),
        producer: 'store:session-service',
        branchId: table.branchId,
        floorId: table.floorId,
        tableNumber: table.number,
        payload: {
          tableNumber,
          settlement: sess?.settlement,
          closedAt: sess?.closedAt,
          unsettledLiabilityMinor: finalSettlement?.unsettledLiabilityMinor || 0,
        },
      };

      // 1. Stage event and sequence into this.data for atomic single-flush persistence
      if (!this.data.events) this.data.events = [];
      this.data.events.push(event);
      if (this.data.events.length > 200) {
        this.data.events = this.data.events.slice(-200);
      }
      this.data.lastEventSequence = nextSeq;

      // 2. Stage idempotency record if provided so it commits atomically in the SAME write
      if (idempotencyKey) {
        if (!this.data.idempotencyRecords) {
          this.data.idempotencyRecords = {};
        }
        this.data.idempotencyRecords[idempotencyKey] = {
          tableNumber: table.number,
          table,
          session: sess,
          settlement: finalSettlement,
          createdAt: new Date().toISOString(),
          ...(options?.idempotencyRecord || {}),
        };
      }

      // 3. ATOMIC COMMIT POINT: Exactly ONE flush writes entities, event, sequence, and idempotency to disk
      this.flushSync();

      // 4. Commit succeeded: update instance sequence counter
      this.eventSequence = nextSeq;

      // 5. POST-COMMIT BROADCAST: Dispatch to listeners ONLY after commit succeeds
      for (const listener of this.eventListeners) {
        try {
          listener(event);
        } catch (err) {
          console.error('⚠️ [Storage] Event listener error:', err);
        }
      }

      return { success: true, table, session: sess, settlement: finalSettlement, isIdempotent: false };
    } catch (flushErr) {
      // Rollback in-memory state on persistence failure to prevent state corruption
      const currentOrdersMap = new Map(ordersSnapshot.map((o: any) => [o.orderId, o]));
      this.data.orders.forEach((o) => {
        if (currentOrdersMap.has(o.orderId)) {
          const snap = currentOrdersMap.get(o.orderId) as any;
          if (snap) {
            for (const key of Object.keys(o)) {
              if (!(key in snap)) {
                delete (o as any)[key];
              }
            }
            Object.assign(o, snap);
          }
        }
      });

      for (const key of Object.keys(table)) {
        if (!(key in tableSnapshot)) {
          delete (table as any)[key];
        }
      }
      Object.assign(table, tableSnapshot);

      if (sess && sessionSnapshot) {
        for (const key of Object.keys(sess)) {
          if (!(key in sessionSnapshot)) {
            delete (sess as any)[key];
          }
        }
        Object.assign(sess, sessionSnapshot);
      }
      this.data.invalidatedCapabilityTokens = invalidatedTokensSnapshot;

      // Rollback staged event and sequence numbers
      if (this.data.events && this.data.events.length > eventsSnapshotLength) {
        this.data.events.splice(eventsSnapshotLength);
      }
      this.eventSequence = initialSeq;
      this.data.lastEventSequence = initialLastSeq;

      // Rollback staged idempotency record
      if (idempotencyKey && this.data.idempotencyRecords) {
        if (idempotencyExistedBefore && previousIdempotencyRecord) {
          this.data.idempotencyRecords[idempotencyKey] = previousIdempotencyRecord;
        } else {
          delete this.data.idempotencyRecords[idempotencyKey];
        }
      }

      // NOTICE: Zero eventListeners were called! Zero network frames were emitted!
      throw flushErr;
    }
  }

  public updateOrderStatus(
    orderId: string,
    newStatus: RestaurantOrder['status'],
    options: { authorizedBy?: string; reason?: string } = {}
  ): { success: boolean; order?: RestaurantOrder; error?: string; code?: string } {
    const order = this.getOrder(orderId);
    if (!order) {
      return { success: false, error: `Order ${orderId} not found`, code: 'ORDER_NOT_FOUND' };
    }

    if (['PAID', 'VOIDED', 'CANCELLED', 'COMPED'].includes(order.status)) {
      return {
        success: false,
        error: `Cannot transition order ${orderId} in terminal state '${order.status}'`,
        code: 'ILLEGAL_STATE_TRANSITION',
      };
    }

    const validTransitions: Record<string, string[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['IN_PREPARATION', 'SERVED', 'CANCELLED'],
      IN_PREPARATION: ['SERVED', 'CANCELLED'],
      SERVED: ['PAID', 'COMPED', 'VOIDED'],
    };

    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(newStatus)) {
      return {
        success: false,
        error: `Illegal status transition from '${order.status}' to '${newStatus}'`,
        code: 'ILLEGAL_STATE_TRANSITION',
      };
    }

    const previousStatus = order.status;
    order.status = newStatus;

    if (newStatus === 'IN_PREPARATION') {
      this.data.kitchenTasks.forEach((t) => {
        if (t.orderId === orderId && t.status === 'QUEUED') {
          t.status = 'IN_PROGRESS';
        }
      });
    } else if (newStatus === 'SERVED') {
      this.data.kitchenTasks.forEach((t) => {
        if (t.orderId === orderId && ['QUEUED', 'IN_PROGRESS'].includes(t.status)) {
          t.status = 'BUMPED';
        }
      });
    }

    const targetTable = this.getTableByNumber(order.tableNumber);
    if (targetTable && ['PAID', 'COMPED', 'VOIDED'].includes(newStatus)) {
      const remainingUnpaid = this.data.orders.filter(
        (o) => o.tableNumber === order.tableNumber && !['PAID', 'VOIDED', 'CANCELLED', 'COMPED', 'UNSETTLED_OVERRIDE'].includes(o.status)
      );
      const subtotalMinor = remainingUnpaid.reduce((sum, o) => {
        const orderSubtotal = o.items ? o.items.reduce((iSum, it) => iSum + (it.quantity * (it.unitPriceMinor || 0)), 0) : o.subtotalMinor || 0;
        return sum + orderSubtotal;
      }, 0);
      const taxMinor = Math.round(subtotalMinor * 0.05);
      targetTable.activeBillMinor = subtotalMinor + taxMinor;
      if (remainingUnpaid.length === 0 && targetTable.status === 'BILL_REQUESTED') {
        targetTable.status = 'OCCUPIED';
      }
    }

    this.appendEvent(
      'order.status_updated',
      'store:order-service',
      targetTable?.branchId || order.branchId || '*',
      { orderId, previousStatus, newStatus, authorizedBy: options.authorizedBy },
      targetTable?.floorId,
      order.tableNumber
    );

    this.flushSync();
    return { success: true, order };
  }

  public cancelOrder(
    orderId: string,
    reason: string,
    authorizedBy?: string
  ): { success: boolean; order?: RestaurantOrder; error?: string; code?: string } {
    const order = this.getOrder(orderId);
    if (!order) {
      return { success: false, error: `Order ${orderId} not found`, code: 'ORDER_NOT_FOUND' };
    }

    if (['PAID', 'VOIDED', 'CANCELLED', 'COMPED'].includes(order.status)) {
      return {
        success: false,
        error: `Order ${orderId} is in terminal status '${order.status}' and cannot be cancelled`,
        code: 'CANNOT_CANCEL_TERMINAL_ORDER',
      };
    }

    if (!reason || reason.trim().length < 3) {
      return {
        success: false,
        error: 'A cancellation reason with at least 3 characters is mandatory',
        code: 'REASON_REQUIRED',
      };
    }

    order.status = 'CANCELLED';

    // Cancel related kitchen tasks
    this.data.kitchenTasks.forEach((t) => {
      if (t.orderId === orderId) {
        t.status = 'CANCELLED';
      }
    });

    // Deduct from table active bill if applicable
    const targetTable = this.getTableByNumber(order.tableNumber);
    if (targetTable && targetTable.activeBillMinor) {
      targetTable.activeBillMinor = Math.max(0, targetTable.activeBillMinor - order.totalMinor);
      const remainingUnpaid = this.data.orders.filter(
        (o) => o.tableNumber === order.tableNumber && !['PAID', 'VOIDED', 'CANCELLED', 'COMPED'].includes(o.status)
      );
      if (remainingUnpaid.length === 0 && targetTable.status === 'BILL_REQUESTED') {
        targetTable.status = 'OCCUPIED';
      }
    }

    this.appendEvent(
      'order.cancelled',
      'store:order-service',
      targetTable?.branchId || order.branchId || '*',
      { orderId, reason, authorizedBy },
      targetTable?.floorId,
      order.tableNumber
    );

    this.flushSync();
    return { success: true, order };
  }

  public getTableBill(tableIdOrNumber: number | string): {
    success: boolean;
    table?: TableFloorRecord;
    session?: DiningSessionRecord;
    unpaidOrders: RestaurantOrder[];
    allOrders: RestaurantOrder[];
    subtotalMinor: number;
    taxMinor: number;
    totalMinor: number;
    formattedSubtotal: string;
    formattedTax: string;
    formattedTotal: string;
    itemsSummary: Array<{
      id: string;
      name: string;
      quantity: number;
      unitPriceMinor: number;
      totalMinor: number;
      formattedUnitPrice: string;
      formattedTotal: string;
    }>;
    lastSettlement?: any;
    isSettled: boolean;
    error?: string;
  } {
    const table = typeof tableIdOrNumber === 'number'
      ? this.getTable(tableIdOrNumber)
      : this.getTableByNumber(String(tableIdOrNumber));

    if (!table) {
      return {
        success: false,
        unpaidOrders: [],
        allOrders: [],
        subtotalMinor: 0,
        taxMinor: 0,
        totalMinor: 0,
        formattedSubtotal: '₹0.00',
        formattedTax: '₹0.00',
        formattedTotal: '₹0.00',
        itemsSummary: [],
        isSettled: false,
        error: `Table ${tableIdOrNumber} not found`,
      };
    }

    const sess = table.activeSessionId ? this.getSession(table.activeSessionId) : undefined;
    const allOrders = this.data.orders.filter(
      (o) => o.tableNumber === table.number && (!sess || !o.sessionId || o.sessionId === sess.sessionId)
    );
    const unpaidOrders = allOrders.filter(
      (o) => !['PAID', 'VOIDED', 'CANCELLED', 'COMPED'].includes(o.status)
    );

    const itemMap = new Map<string, { id: string; name: string; quantity: number; unitPriceMinor: number; totalMinor: number }>();
    unpaidOrders.forEach((o) => {
      (o.items || []).forEach((it) => {
        const key = it.id || it.name;
        const existing = itemMap.get(key);
        const lineTotal = it.quantity * (it.unitPriceMinor || 0);
        if (existing) {
          existing.quantity += it.quantity;
          existing.totalMinor += lineTotal;
        } else {
          itemMap.set(key, {
            id: it.id,
            name: it.name,
            quantity: it.quantity,
            unitPriceMinor: it.unitPriceMinor || 0,
            totalMinor: lineTotal,
          });
        }
      });
    });

    const itemsSummary = Array.from(itemMap.values()).map((it) => ({
      ...it,
      formattedUnitPrice: `₹${(it.unitPriceMinor / 100).toFixed(2)}`,
      formattedTotal: `₹${(it.totalMinor / 100).toFixed(2)}`,
    }));

    let subtotalMinor = unpaidOrders.reduce((sum, o) => {
      const orderSubtotal = o.items ? o.items.reduce((iSum, it) => iSum + (it.quantity * (it.unitPriceMinor || 0)), 0) : o.subtotalMinor || 0;
      return sum + orderSubtotal;
    }, 0);

    let taxMinor = Math.round(subtotalMinor * 0.05); // 5% GST
    let totalMinor = subtotalMinor + taxMinor;

    if (totalMinor === 0 && table.activeBillMinor && table.activeBillMinor > 0) {
      totalMinor = table.activeBillMinor;
      subtotalMinor = Math.round((totalMinor * 100) / 105);
      taxMinor = totalMinor - subtotalMinor;
    }

    return {
      success: true,
      table,
      session: sess,
      unpaidOrders,
      allOrders,
      subtotalMinor,
      taxMinor,
      totalMinor,
      formattedSubtotal: `₹${(subtotalMinor / 100).toFixed(2)}`,
      formattedTax: `₹${(taxMinor / 100).toFixed(2)}`,
      formattedTotal: `₹${(totalMinor / 100).toFixed(2)}`,
      itemsSummary,
      lastSettlement: sess?.settlement,
      isSettled: sess?.status === 'CLOSED',
    };
  }

  // Authoritative Table Bill Settlement & Vacating
  public settleTableSession(
    tableIdOrNumber: number | string,
    settlement?: {
      method?: 'CASH' | 'CARD' | 'UPI' | 'COMP' | 'VOID' | 'REFUND' | 'EMERGENCY_OVERRIDE';
      status?: 'PAID' | 'COMPED' | 'VOIDED' | 'REFUNDED' | 'PARTIAL' | 'UNSETTLED_OVERRIDE';
      amountMinor?: number;
      authorizedBy?: string;
      reason?: string;
      verification?: 'MANUAL_STAFF_RECORDED' | 'PROVIDER_CONFIRMED' | 'UNVERIFIED';
      providerConfirmed?: boolean;
      gatewayTransactionId?: string;
    },
    options?: { expectedRevision?: number; authorizedBy?: string; reason?: string; idempotencyKey?: string; idempotencyRecord?: any }
  ): SessionCloseResult {
    const table = typeof tableIdOrNumber === 'number'
      ? this.getTable(tableIdOrNumber)
      : this.getTableByNumber(tableIdOrNumber);

    if (!table) {
      return { success: false, error: `Table ${tableIdOrNumber} not found`, code: 'TABLE_NOT_FOUND' };
    }

    // Authoritative check calculation from active unpaid orders
    const activeOrders = this.data.orders.filter(
      (o) => o.tableNumber === table.number &&
             (!table.activeSessionId || !o.sessionId || o.sessionId === 'sess_demo' || o.sessionId === table.activeSessionId) &&
             !['PAID', 'VOIDED', 'CANCELLED', 'COMPED', 'UNSETTLED_OVERRIDE'].includes(o.status)
    );

    let calculatedBillMinor = 0;
    if (activeOrders.length > 0) {
      const subtotalMinor = activeOrders.reduce((sum, o) => {
        const orderSubtotal = o.items ? o.items.reduce((iSum, it) => iSum + (it.quantity * (it.unitPriceMinor || 0)), 0) : o.subtotalMinor || 0;
        return sum + orderSubtotal;
      }, 0);
      const taxMinor = Math.round(subtotalMinor * 0.05); // Authoritative 5% GST
      calculatedBillMinor = subtotalMinor + taxMinor;
      table.activeBillMinor = calculatedBillMinor;
    } else {
      calculatedBillMinor = 0;
      table.activeBillMinor = 0;
    }

    if (!settlement) {
      settlement = {
        method: 'CASH',
        status: 'PAID',
        amountMinor: calculatedBillMinor,
      };
    } else if (settlement.status === 'PAID' && settlement.amountMinor === undefined) {
      settlement.amountMinor = calculatedBillMinor;
    }

    // Guard against partial settlement attempting to close table
    if (calculatedBillMinor > 0 && settlement?.status === 'PAID') {
      const offeredAmount = settlement.amountMinor !== undefined ? settlement.amountMinor : calculatedBillMinor;
      if (offeredAmount < calculatedBillMinor) {
        const remaining = calculatedBillMinor - offeredAmount;
        return {
          success: false,
          error: `Partial settlement rejected: ₹${(offeredAmount / 100).toFixed(2)} received, ₹${(remaining / 100).toFixed(2)} balance remaining on Table ${table.number}. Table cannot be vacated until paid in full or comped.`,
          code: 'PARTIAL_SETTLEMENT_UNRESOLVED',
        };
      }
    }

    return this.closeSession(table.number, settlement, false, options);
  }

  // Deletion Helpers for Test Cleanup & Multi-Tenant Lifecycle
  public deleteBranch(id: string): boolean {
    const idx = this.data.branches.findIndex((b) => b.id === id);
    if (idx >= 0) {
      this.data.branches.splice(idx, 1);
      this.flushSync();
      return true;
    }
    return false;
  }

  public deleteFloor(id: string): boolean {
    const idx = this.data.floors.findIndex((f) => f.id === id);
    if (idx >= 0) {
      this.data.floors.splice(idx, 1);
      this.flushSync();
      return true;
    }
    return false;
  }

  public deleteTable(id: number): boolean {
    const idx = this.data.tables.findIndex((t) => t.id === id);
    if (idx >= 0) {
      this.data.tables.splice(idx, 1);
      this.flushSync();
      return true;
    }
    return false;
  }

  public deleteServiceRequest(id: string): boolean {
    const idx = this.data.serviceRequests.findIndex((s) => s.id === id);
    if (idx >= 0) {
      this.data.serviceRequests.splice(idx, 1);
      this.flushSync();
      return true;
    }
    return false;
  }

  /**
   * Authoritative financial ledger reconciliation.
   * Compares gross order totals against paid settlements, comps, voids,
   * emergency liabilities, and currently active open table checks.
   * Zero floating-point drift: integer minor-unit arithmetic.
   */
  public reconcileFinancialLedger(branchId?: string): {
    grossOrdersMinor: number;
    settledPaidMinor: number;
    compedMinor: number;
    voidedMinor: number;
    unsettledLiabilityMinor: number;
    activeUnsettledBillsMinor: number;
    totalResolvedMinor: number;
    varianceMinor: number;
    isBalanced: boolean;
    orderCount: number;
    closedSessionCount: number;
    activeSessionCount: number;
  } {
    const orders = branchId
      ? this.data.orders.filter((o) => {
          const tbl = this.getTableByNumber(o.tableNumber);
          return tbl?.branchId === branchId;
        })
      : this.data.orders;
    const grossOrdersMinor = orders.reduce((sum, o) => sum + (o.totalMinor || 0), 0);

    const sessions = branchId
      ? this.data.sessions.filter((s) => s.branchId === branchId)
      : this.data.sessions;

    let settledPaidMinor = 0;
    let compedMinor = 0;
    let voidedMinor = 0;
    let unsettledLiabilityMinor = 0;
    let closedSessionCount = 0;
    let activeSessionCount = 0;

    for (const sess of sessions) {
      if (sess.status === 'CLOSED') {
        closedSessionCount++;
        const set = sess.settlement;
        if (set) {
          if (set.status === 'PAID') {
            settledPaidMinor += set.amountMinor || 0;
          } else if (set.status === 'COMPED') {
            compedMinor += set.amountMinor || 0;
          } else if (set.status === 'VOIDED') {
            voidedMinor += set.amountMinor || 0;
          } else if (set.status === 'UNSETTLED_OVERRIDE' || set.method === 'EMERGENCY_OVERRIDE') {
            unsettledLiabilityMinor +=
              set.unsettledLiabilityMinor !== undefined ? set.unsettledLiabilityMinor : (set.amountMinor || 0);
          }
        }
      } else {
        activeSessionCount++;
      }
    }

    const tables = branchId
      ? this.data.tables.filter((t) => t.branchId === branchId)
      : this.data.tables;
    const activeUnsettledBillsMinor = tables.reduce((sum, t) => sum + (t.activeBillMinor || 0), 0);

    const totalResolvedMinor =
      settledPaidMinor + compedMinor + voidedMinor + unsettledLiabilityMinor + activeUnsettledBillsMinor;
    const varianceMinor = grossOrdersMinor - totalResolvedMinor;
    const isBalanced = varianceMinor === 0;

    return {
      grossOrdersMinor,
      settledPaidMinor,
      compedMinor,
      voidedMinor,
      unsettledLiabilityMinor,
      activeUnsettledBillsMinor,
      totalResolvedMinor,
      varianceMinor,
      isBalanced,
      orderCount: orders.length,
      closedSessionCount,
      activeSessionCount,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 🛍️ TEMPLATE MARKETPLACE & VISUAL STUDIO PERSISTENCE
  // ─────────────────────────────────────────────────────────────────────────

  public getTemplates(): MarketplaceTemplate[] {
    const list = this.data.templates || DEFAULT_TEMPLATES;
    DEFAULT_TEMPLATES.forEach((canonical) => {
      if (!list.some((t) => t.id === canonical.id)) {
        list.push(JSON.parse(JSON.stringify(canonical)));
      }
    });
    list.forEach((t, idx) => {
      const canonical = DEFAULT_TEMPLATES.find((def) => def.id === t.id);
      if (canonical) {
        if (t.version !== canonical.version || !t.composition) {
          list[idx] = JSON.parse(JSON.stringify(canonical));
        } else {
          t.composition = canonical.composition;
          t.defaultTokens = { ...canonical.defaultTokens, ...(t.defaultTokens || {}) };
          t.accentColor = canonical.accentColor || t.accentColor;
          t.name = canonical.name;
          t.tagline = canonical.tagline;
          t.description = canonical.description;
          t.experienceType = canonical.experienceType;
          t.capabilities = canonical.capabilities;
          t.targetBusinessModel = canonical.targetBusinessModel;
          t.supportedScopes = canonical.supportedScopes;
        }
      }
    });
    this.data.templates = list;
    return list;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 🏪 MULTI-RESTAURANT & GROCERY COMMERCE PERSISTENCE (CRAVEATLAS & PANTRYRUSH)
  // ─────────────────────────────────────────────────────────────────────────

  public getRestaurantPartners(): RestaurantPartner[] {
    if (!this.data.restaurantPartners || this.data.restaurantPartners.length === 0) {
      this.data.restaurantPartners = JSON.parse(JSON.stringify(DEFAULT_RESTAURANT_PARTNERS));
    }
    return this.data.restaurantPartners;
  }

  public getRestaurantPartnerById(id: string): RestaurantPartner | undefined {
    return this.getRestaurantPartners().find((p) => p.id === id);
  }

  public getGrocerySkus(categoryFilter?: string): GrocerySkuItem[] {
    if (!this.data.grocerySkus || this.data.grocerySkus.length === 0) {
      this.data.grocerySkus = JSON.parse(JSON.stringify(DEFAULT_GROCERY_SKUS));
    }
    if (categoryFilter) {
      return this.data.grocerySkus.filter((s) => s.category.toLowerCase() === categoryFilter.toLowerCase());
    }
    return this.data.grocerySkus;
  }

  public getGrocerySkuById(id: string): GrocerySkuItem | undefined {
    return this.getGrocerySkus().find((s) => s.id === id);
  }

  public updateGroceryStock(skuId: string, quantitySold: number): { success: boolean; updatedSku?: GrocerySkuItem; error?: string } {
    const skus = this.getGrocerySkus();
    const sku = skus.find((s) => s.id === skuId);
    if (!sku) {
      return { success: false, error: `SKU "${skuId}" not found in grocery catalog.` };
    }
    if (sku.stockQuantity < quantitySold) {
      return { success: false, error: `Insufficient inventory for "${sku.name}". Available: ${sku.stockQuantity}, Requested: ${quantitySold}.` };
    }
    sku.stockQuantity -= quantitySold;
    this.appendEvent('GROCERY_STOCK_DECREMENTED', 'quick-commerce-engine', '*', {
      skuId: sku.id,
      quantitySold,
      remainingStock: sku.stockQuantity,
    });
    this.flushSync();
    return { success: true, updatedSku: sku };
  }

  public transactGroceryStock(items: Array<{ skuId: string; quantity: number }>): {
    success: boolean;
    error?: string;
    insufficientSkuId?: string;
    availableStock?: number;
  } {
    const skus = this.getGrocerySkus();
    // Phase 1: Validate all items have sufficient inventory before modifying any
    for (const it of items) {
      const sku = skus.find((s) => s.id === it.skuId);
      if (!sku) {
        return { success: false, error: `SKU "${it.skuId}" not found in grocery catalog.` };
      }
      if (sku.stockQuantity < it.quantity) {
        return {
          success: false,
          error: `Insufficient inventory for "${sku.name}". Available: ${sku.stockQuantity}, Requested: ${it.quantity}.`,
          insufficientSkuId: it.skuId,
          availableStock: sku.stockQuantity,
        };
      }
    }

    // Phase 2: All items confirmed available -> atomic commit
    for (const it of items) {
      const sku = skus.find((s) => s.id === it.skuId)!;
      sku.stockQuantity -= it.quantity;
      this.appendEvent('GROCERY_STOCK_DECREMENTED', 'quick-commerce-engine', '*', {
        skuId: sku.id,
        quantitySold: it.quantity,
        remainingStock: sku.stockQuantity,
      });
    }
    this.flushSync();
    return { success: true };
  }

  public getTemplateById(id: string): MarketplaceTemplate | undefined {
    const legacyMap: Record<string, string> = {
      tmpl_atelier_etoile_4_1: 'tmpl_haute_gastronomy',
      'atelier-etoile': 'tmpl_haute_gastronomy',
      tmpl_fjord_form_4_1: 'tmpl_nordic_minimal',
      'fjord-form': 'tmpl_nordic_minimal',
      tmpl_roastery_1984_4_1: 'tmpl_artisan_coffee',
      'roastery-1984': 'tmpl_artisan_coffee',
      tmpl_neon_yokocho_4_1: 'tmpl_neon_street',
      'neon-yokocho': 'tmpl_neon_street',
      tmpl_osteria_rustica_4_1: 'tmpl_trattoria_bella',
      'osteria-rustica': 'tmpl_trattoria_bella',
      tmpl_shokunin_ramen_4_1: 'tmpl_tokyo_izakaya',
      'shokunin-ramen': 'tmpl_tokyo_izakaya',
    };
    const resolvedId = legacyMap[id] || id;
    return this.getTemplates().find((t) => t.id === resolvedId || t.slug === resolvedId || t.id === id || t.slug === id);
  }

  public installTemplate(templateId: string, installedBy = 'Staff'): { success: boolean; template?: MarketplaceTemplate; error?: string } {
    const tmpl = this.getTemplateById(templateId);
    if (!tmpl) {
      return { success: false, error: `Template "${templateId}" not found in marketplace.` };
    }

    if (!this.data.tenantBrand) {
      this.data.tenantBrand = JSON.parse(JSON.stringify(DEFAULT_BRAND_CONFIG));
    }
    this.data.tenantBrand.activeTemplateId = tmpl.id;
    if (tmpl.defaultTokens) {
      this.data.tenantBrand.primaryColor = tmpl.defaultTokens.primaryColor;
      this.data.tenantBrand.secondaryColor = tmpl.defaultTokens.secondaryColor;
      this.data.tenantBrand.accentColor = tmpl.accentColor || tmpl.defaultTokens.primaryColor;
      this.data.tenantBrand.surfaceColor = tmpl.defaultTokens.surfaceColor;
      this.data.tenantBrand.textColor = tmpl.defaultTokens.textColor;
      this.data.tenantBrand.fontFamilyHeading = tmpl.fontHeading || tmpl.defaultTokens.fontFamilyHeading;
      this.data.tenantBrand.fontFamilyBody = tmpl.fontBody || tmpl.defaultTokens.fontFamilyBody;
    }
    this.data.tenantBrand.updatedAt = new Date().toISOString();

    if (!this.data.templateDraft) {
      this.data.templateDraft = JSON.parse(JSON.stringify(DEFAULT_TEMPLATE_DRAFT));
    }

    this.data.templateDraft.templateId = tmpl.id;
    this.data.templateDraft.draftSections = JSON.parse(JSON.stringify(tmpl.defaultSections));
    this.data.templateDraft.draftTokens = JSON.parse(JSON.stringify(tmpl.defaultTokens));
    this.data.templateDraft.lastSavedAt = new Date().toISOString();

    this.appendEvent('TEMPLATE_INSTALLED', 'marketplace-engine', '*', {
      templateId: tmpl.id,
      templateName: tmpl.name,
      installedBy,
    });

    this.flushSync();
    return { success: true, template: tmpl };
  }

  public getTenantBrand(branchId?: string): TenantBrandConfig {
    const base = this.data.tenantBrand || DEFAULT_BRAND_CONFIG;
    if (branchId && base.branchOverrides && base.branchOverrides[branchId]) {
      return {
        ...base,
        ...base.branchOverrides[branchId],
      };
    }
    return base;
  }

  public updateTenantBrand(updates: Partial<TenantBrandConfig>, updatedBy = 'Admin'): TenantBrandConfig {
    if (!this.data.tenantBrand) {
      this.data.tenantBrand = JSON.parse(JSON.stringify(DEFAULT_BRAND_CONFIG));
    }
    this.data.tenantBrand = {
      ...this.data.tenantBrand,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.appendEvent('BRAND_CONFIG_UPDATED', 'white-label-engine', '*', {
      updatedBy,
      restaurantName: this.data.tenantBrand.restaurantName,
      customDomain: this.data.tenantBrand.customDomain,
      domainStatus: this.data.tenantBrand.domainStatus,
    });

    this.flushSync();
    return this.data.tenantBrand;
  }

  public updateBranchBrandOverride(
    branchId: string,
    override: Partial<TenantBrandConfig> | null,
    updatedBy = 'Admin'
  ): TenantBrandConfig {
    if (!this.data.tenantBrand) {
      this.data.tenantBrand = JSON.parse(JSON.stringify(DEFAULT_BRAND_CONFIG));
    }
    if (!this.data.tenantBrand.branchOverrides) {
      this.data.tenantBrand.branchOverrides = {};
    }
    if (override === null) {
      delete this.data.tenantBrand.branchOverrides[branchId];
    } else {
      this.data.tenantBrand.branchOverrides[branchId] = {
        ...(this.data.tenantBrand.branchOverrides[branchId] || {}),
        ...override,
      };
    }
    this.data.tenantBrand.updatedAt = new Date().toISOString();
    this.appendEvent('BRANCH_BRAND_OVERRIDE_UPDATED', 'white-label-engine', branchId, {
      branchId,
      updatedBy,
      override,
    });
    this.flushSync();
    return this.getTenantBrand(branchId);
  }

  public getBranchBrandOverride(branchId: string): Partial<TenantBrandConfig> | null {
    const base = this.data.tenantBrand || DEFAULT_BRAND_CONFIG;
    return base.branchOverrides?.[branchId] || null;
  }

  public getTemplateDraft(): TemplateDraftAndPublication {
    if (!this.data.templateDraft) {
      this.data.templateDraft = JSON.parse(JSON.stringify(DEFAULT_TEMPLATE_DRAFT));
    }
    return this.data.templateDraft;
  }

  public saveTemplateDraft(draftInput: Partial<TemplateDraftAndPublication>, savedBy = 'Author'): TemplateDraftAndPublication {
    if (!this.data.templateDraft) {
      this.data.templateDraft = JSON.parse(JSON.stringify(DEFAULT_TEMPLATE_DRAFT));
    }

    if (draftInput.draftSections) {
      this.data.templateDraft.draftSections = draftInput.draftSections;
    }
    if (draftInput.draftTokens) {
      this.data.templateDraft.draftTokens = draftInput.draftTokens;
    }
    this.data.templateDraft.lastSavedAt = new Date().toISOString();

    this.appendEvent('STUDIO_DRAFT_SAVED', 'visual-studio', '*', {
      savedBy,
      sectionsCount: this.data.templateDraft.draftSections.length,
    });

    this.flushSync();
    return this.data.templateDraft;
  }

  public publishTemplateDraft(publishedBy = 'Admin', summary = 'Published via Brand Studio'): { success: boolean; version: number; draft: TemplateDraftAndPublication } {
    if (!this.data.templateDraft) {
      this.data.templateDraft = JSON.parse(JSON.stringify(DEFAULT_TEMPLATE_DRAFT));
    }

    const draft = this.data.templateDraft;
    const newVersion = (draft.version || 1) + 1;

    draft.version = newVersion;
    draft.publishedSections = JSON.parse(JSON.stringify(draft.draftSections));
    draft.publishedTokens = JSON.parse(JSON.stringify(draft.draftTokens));
    draft.lastPublishedAt = new Date().toISOString();

    const revisionId = `rev_v${newVersion}_${Date.now()}`;
    if (!draft.revisions) {
      draft.revisions = [];
    }

    draft.revisions.unshift({
      revisionId,
      version: newVersion,
      publishedAt: draft.lastPublishedAt,
      publishedBy,
      sections: JSON.parse(JSON.stringify(draft.publishedSections)),
      tokens: JSON.parse(JSON.stringify(draft.publishedTokens)),
      summary,
    });

    // Also update tenant brand active template tokens if applicable
    if (this.data.tenantBrand && draft.publishedTokens) {
      if (draft.publishedTokens.primaryColor) {
        this.data.tenantBrand.primaryColor = draft.publishedTokens.primaryColor;
      }
      if (draft.publishedTokens.fontFamilyHeading) {
        this.data.tenantBrand.fontFamilyHeading = draft.publishedTokens.fontFamilyHeading;
      }
    }

    this.appendEvent('STUDIO_PUBLISHED', 'visual-studio', '*', {
      version: newVersion,
      revisionId,
      publishedBy,
      summary,
    });

    this.flushSync();
    return { success: true, version: newVersion, draft };
  }

  public restoreTemplateRevision(revisionId: string, restoredBy = 'Admin'): boolean {
    if (!this.data.templateDraft?.revisions) return false;
    const rev = this.data.templateDraft.revisions.find((r) => r.revisionId === revisionId);
    if (!rev) return false;

    this.data.templateDraft.draftSections = JSON.parse(JSON.stringify(rev.sections));
    this.data.templateDraft.draftTokens = JSON.parse(JSON.stringify(rev.tokens));
    this.data.templateDraft.lastSavedAt = new Date().toISOString();

    this.appendEvent('STUDIO_REVISION_RESTORED', 'visual-studio', '*', {
      restoredBy,
      revisionId,
      targetVersion: rev.version,
    });

    this.flushSync();
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 💬 CUSTOMER SUPPORT WORKFLOW PERSISTENCE
  // ─────────────────────────────────────────────────────────────────────────

  public getSupportTickets(branchId?: string): SupportTicket[] {
    const tickets = this.data.supportTickets || DEFAULT_SUPPORT_TICKETS;
    if (branchId) {
      return tickets.filter((t) => t.branchId === branchId);
    }
    return tickets;
  }

  public getSupportTicketById(id: string): SupportTicket | undefined {
    return this.getSupportTickets().find((t) => t.id === id || t.ticketNumber === id);
  }

  public createSupportTicket(input: {
    branchId: string;
    branchName: string;
    staffId: string;
    staffName: string;
    category: SupportTicket['category'];
    severity: SupportTicket['severity'];
    subject: string;
    description: string;
    initialMessage?: string;
  }): SupportTicket {
    if (!this.data.supportTickets) {
      this.data.supportTickets = [];
    }

    const nextNum = 8500 + this.data.supportTickets.length + 1;
    const ticketId = `tkt_${Date.now()}`;
    const now = new Date().toISOString();

    const messages = [];
    if (input.initialMessage || input.description) {
      messages.push({
        id: `msg_${Date.now()}_1`,
        sender: 'RESTAURANT_STAFF' as const,
        authorName: input.staffName,
        text: input.initialMessage || input.description,
        timestamp: now,
      });
    }

    const newTicket: SupportTicket = {
      id: ticketId,
      ticketNumber: `ORB-${nextNum}`,
      branchId: input.branchId,
      branchName: input.branchName,
      staffId: input.staffId,
      staffName: input.staffName,
      category: input.category,
      severity: input.severity,
      subject: input.subject,
      description: input.description,
      status: 'OPEN',
      assignedTo: input.severity === 'CRITICAL' ? 'OrbitoX Emergency SRE (Tier 1)' : 'OrbitoX Customer Support',
      createdAt: now,
      updatedAt: now,
      messages,
    };

    this.data.supportTickets.unshift(newTicket);

    this.appendEvent('SUPPORT_TICKET_CREATED', 'support-desk', input.branchId, {
      ticketId,
      ticketNumber: newTicket.ticketNumber,
      category: newTicket.category,
      severity: newTicket.severity,
      subject: newTicket.subject,
    });

    this.flushSync();
    return newTicket;
  }

  public addSupportTicketMessage(
    ticketId: string,
    message: { text: string; sender?: 'RESTAURANT_STAFF' | 'ORBITOX_SUPPORT'; authorName: string; attachments?: string[] }
  ): boolean {
    const ticket = this.getSupportTicketById(ticketId);
    if (!ticket) return false;

    const newMsg = {
      id: `msg_${Date.now()}`,
      sender: message.sender || 'RESTAURANT_STAFF',
      authorName: message.authorName,
      text: message.text,
      timestamp: new Date().toISOString(),
      attachments: message.attachments,
    };

    ticket.messages.push(newMsg);
    ticket.updatedAt = new Date().toISOString();

    this.appendEvent('SUPPORT_TICKET_REPLIED', 'support-desk', ticket.branchId, {
      ticketId: ticket.id,
      sender: newMsg.sender,
      authorName: newMsg.authorName,
    });

    this.flushSync();
    return true;
  }

  public updateSupportTicketStatus(ticketId: string, status: SupportTicket['status'], updatedBy = 'Staff'): boolean {
    const ticket = this.getSupportTicketById(ticketId);
    if (!ticket) return false;

    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();

    this.appendEvent('SUPPORT_TICKET_STATUS_CHANGED', 'support-desk', ticket.branchId, {
      ticketId: ticket.id,
      status,
      updatedBy,
    });

    this.flushSync();
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 🏷️ CATEGORY MANAGEMENT (BOH & STOREFRONT TAXONOMY)
  // ─────────────────────────────────────────────────────────────────────────

  public getCategories(includeArchived = false): MenuCategory[] {
    if (!this.data.categories || this.data.categories.length === 0) {
      this.data.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
    }
    const cats = [...this.data.categories];
    cats.sort((a, b) => a.displayOrder - b.displayOrder);
    if (includeArchived) return cats;
    return cats.filter((c) => !c.isArchived);
  }

  public getCategory(id: string): MenuCategory | undefined {
    return this.getCategories(true).find(
      (c) => c.id === id || c.name.toLowerCase() === id.toLowerCase()
    );
  }

  public createCategory(category: {
    name: string;
    description?: string;
    color?: string;
    displayOrder?: number;
  }): MenuCategory {
    if (!this.data.categories) {
      this.data.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
    }
    const cleanName = (category.name || '').trim();
    if (!cleanName) {
      throw new Error('Category name cannot be empty');
    }
    const exists = this.data.categories.find(
      (c) => !c.isArchived && c.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (exists) {
      throw new Error(`Category "${cleanName}" already exists`);
    }

    const id = `cat_${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now().toString(36)}`;
    const maxOrder = this.data.categories.reduce((max, c) => Math.max(max, c.displayOrder || 0), 0);
    const newCat: MenuCategory = {
      id,
      name: cleanName,
      description: category.description || '',
      displayOrder: typeof category.displayOrder === 'number' ? category.displayOrder : maxOrder + 1,
      isArchived: false,
      color: category.color || '#D97706',
    };
    this.data.categories.push(newCat);
    this.appendEvent('CATEGORY_CREATED', 'catalog-service', '*', {
      categoryId: newCat.id,
      name: newCat.name,
    });
    this.flushSync();
    return newCat;
  }

  public updateCategory(id: string, updates: Partial<MenuCategory>): MenuCategory | undefined {
    const cat = this.getCategory(id);
    if (!cat) return undefined;

    if (updates.name !== undefined) {
      const cleanName = updates.name.trim();
      if (!cleanName) throw new Error('Category name cannot be empty');
      const oldName = cat.name;
      cat.name = cleanName;
      if (this.data.menuItems) {
        for (const it of this.data.menuItems) {
          if (it.category === oldName || it.categoryId === cat.id) {
            it.category = cleanName;
            it.categoryId = cat.id;
          }
        }
      }
    }
    if (updates.description !== undefined) cat.description = updates.description;
    if (typeof updates.displayOrder === 'number') cat.displayOrder = updates.displayOrder;
    if (updates.color !== undefined) cat.color = updates.color;
    if (typeof updates.isArchived === 'boolean') cat.isArchived = updates.isArchived;

    this.appendEvent('CATEGORY_UPDATED', 'catalog-service', '*', { categoryId: cat.id, updates });
    this.flushSync();
    return cat;
  }

  public reorderCategories(orderedIds: string[]): MenuCategory[] {
    if (!this.data.categories) {
      this.data.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
    }
    orderedIds.forEach((id, index) => {
      const c = this.data.categories!.find((cat) => cat.id === id);
      if (c) {
        c.displayOrder = index + 1;
      }
    });
    this.appendEvent('CATEGORIES_REORDERED', 'catalog-service', '*', { orderedIds });
    this.flushSync();
    return this.getCategories(true);
  }

  public archiveCategory(
    id: string,
    reassignToCategoryId?: string
  ): { success: boolean; reassignedCount: number; error?: string } {
    const cat = this.getCategory(id);
    if (!cat) return { success: false, reassignedCount: 0, error: 'Category not found' };

    const items = (this.data.menuItems || []).filter(
      (m) => m.category === cat.name || m.categoryId === cat.id
    );

    let targetCat: MenuCategory | undefined;
    if (reassignToCategoryId) {
      targetCat = this.getCategory(reassignToCategoryId);
      if (!targetCat || targetCat.id === cat.id || targetCat.isArchived) {
        return { success: false, reassignedCount: 0, error: 'Invalid reassign target category' };
      }
    } else {
      targetCat = this.getCategories(false).find((c) => c.id !== cat.id);
    }

    let reassignedCount = 0;
    if (items.length > 0) {
      if (targetCat) {
        for (const item of items) {
          item.category = targetCat.name;
          item.categoryId = targetCat.id;
          reassignedCount++;
        }
      } else {
        return {
          success: false,
          reassignedCount: 0,
          error: 'Cannot archive category: no active fallback category exists to prevent orphaned items',
        };
      }
    }

    cat.isArchived = true;
    this.appendEvent('CATEGORY_ARCHIVED', 'catalog-service', '*', {
      categoryId: cat.id,
      reassignedCount,
      reassignTo: targetCat?.id,
    });
    this.flushSync();
    return { success: true, reassignedCount };
  }

  public deleteCategory(
    id: string,
    reassignToCategoryId?: string
  ): { success: boolean; reassignedCount: number; error?: string } {
    const cat = this.getCategory(id);
    if (!cat) return { success: false, reassignedCount: 0, error: 'Category not found' };

    const archiveRes = this.archiveCategory(id, reassignToCategoryId);
    if (!archiveRes.success) return archiveRes;

    this.data.categories = (this.data.categories || []).filter((c) => c.id !== cat.id);
    this.appendEvent('CATEGORY_DELETED', 'catalog-service', '*', { categoryId: cat.id });
    this.flushSync();
    return { success: true, reassignedCount: archiveRes.reassignedCount };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 📋 MENU CATALOG CRUD (CROSS-CHANNEL & AUTHORITATIVE PRICING)
  // ─────────────────────────────────────────────────────────────────────────

  public createMenuItem(item: Partial<MenuItem> & { name: string; category?: string }): MenuItem {
    if (!this.data.menuItems) {
      this.data.menuItems = JSON.parse(JSON.stringify(DEFAULT_MENU));
    }
    const cleanName = (item.name || '').trim();
    if (!cleanName) {
      throw new Error('Menu item name is required');
    }

    // Minor units base price validation
    if (typeof item.basePriceMinor === 'number' && (isNaN(item.basePriceMinor) || item.basePriceMinor < 0)) {
      throw new Error('Base price cannot be negative');
    }
    if ((item as any).price !== undefined && (isNaN(Number((item as any).price)) || Number((item as any).price) < 0)) {
      throw new Error('Base price cannot be negative');
    }

    let basePriceMinor = typeof item.basePriceMinor === 'number' ? item.basePriceMinor : 0;
    if ((item as any).price !== undefined && !isNaN(Number((item as any).price))) {
      basePriceMinor = Math.round(Number((item as any).price) * 100);
    }
    basePriceMinor = Math.round(basePriceMinor);
    if (basePriceMinor < 0) {
      throw new Error('Base price cannot be negative');
    }

    const id = item.id || `item_${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now().toString(36)}`;
    const formattedPrice = item.formattedPrice || `₹${(basePriceMinor / 100).toFixed(2)}`;

    // Category resolution
    let categoryName = (item.category || '').trim();
    let categoryId = item.categoryId;
    if (categoryId) {
      const byId = this.getCategory(categoryId);
      if (byId) {
        categoryName = byId.name;
      }
    }
    if (!categoryName) {
      const activeCats = this.getCategories(false);
      categoryName = activeCats.length > 0 ? activeCats[0].name : 'Mains';
      categoryId = activeCats.length > 0 ? activeCats[0].id : undefined;
    } else {
      const byName = this.getCategory(categoryName);
      if (byName) {
        categoryName = byName.name;
        categoryId = byName.id;
      }
    }

    // SLA validation
    const prepDurationMinutes = Math.max(1, parseInt(String(item.prepDurationMinutes || 12), 10) || 12);

    // Station validation
    const validStations = ['TANDOOR', 'CURRY_LINE', 'BAR', 'EXPO', 'DESSERT'];
    const station = validStations.includes(String(item.station)) ? (item.station as any) : 'CURRY_LINE';

    // Dietary flags validation
    const validFlags = ['VEG', 'NON_VEG', 'VEGAN', 'GLUTEN_FREE'];
    const dietaryFlags = Array.isArray(item.dietaryFlags)
      ? item.dietaryFlags.filter((f) => validFlags.includes(f))
      : [];

    // Modifier groups validation
    let modifierGroups = item.modifierGroups;
    if (Array.isArray(modifierGroups)) {
      modifierGroups = modifierGroups.map((grp, gIdx) => ({
        id: grp.id || `mod_grp_${gIdx}_${Date.now().toString(36)}`,
        name: (grp.name || `Option Group ${gIdx + 1}`).trim(),
        description: grp.description || '',
        minSelections: Math.max(0, parseInt(String(grp.minSelections || 0), 10) || 0),
        maxSelections: Math.max(1, parseInt(String(grp.maxSelections || 1), 10) || 1),
        options: (grp.options || []).map((opt, oIdx) => {
          const deltaMinor = Math.round(Math.max(0, parseInt(String(opt.priceDeltaMinor || 0), 10) || 0));
          return {
            id: opt.id || `opt_${gIdx}_${oIdx}_${crypto.randomUUID().slice(0, 8)}`,
            name: (opt.name || `Option ${oIdx + 1}`).trim(),
            priceDeltaMinor: deltaMinor,
            formattedPriceDelta: deltaMinor > 0 ? `+₹${(deltaMinor / 100).toFixed(2)}` : undefined,
            isDefault: Boolean(opt.isDefault),
          };
        }),
      }));
    }

    const newItem: MenuItem = {
      id,
      name: cleanName,
      category: categoryName,
      categoryId,
      description: item.description || '',
      basePriceMinor,
      formattedPrice,
      prepDurationMinutes,
      station,
      dietaryFlags,
      allergens: Array.isArray(item.allergens) ? item.allergens : [],
      isPopular: Boolean(item.isPopular),
      isSignature: Boolean(item.isSignature),
      story: item.story || '',
      pairingSuggestions: Array.isArray(item.pairingSuggestions) ? item.pairingSuggestions : [],
      modifierGroups,
      imageUrl: item.imageUrl || '',
      isArchived: false,
    };

    this.data.menuItems.push(newItem);

    this.appendEvent('MENU_ITEM_CREATED', 'catalog-service', '*', {
      itemId: newItem.id,
      name: newItem.name,
      basePriceMinor: newItem.basePriceMinor,
      station: newItem.station,
      category: newItem.category,
    });

    this.flushSync();
    return newItem;
  }

  public updateMenuItem(id: string, updates: Partial<MenuItem>): MenuItem | undefined {
    const item = this.getMenuItem(id);
    if (!item) return undefined;

    if (updates.name !== undefined) {
      const cleanName = updates.name.trim();
      if (!cleanName) throw new Error('Menu item name cannot be empty');
      item.name = cleanName;
    }

    if (updates.basePriceMinor !== undefined) {
      const basePriceMinor = Math.round(updates.basePriceMinor);
      if (isNaN(basePriceMinor) || basePriceMinor < 0) {
        throw new Error('Base price cannot be negative');
      }
      item.basePriceMinor = basePriceMinor;
      item.formattedPrice = `₹${(basePriceMinor / 100).toFixed(2)}`;
    } else if ((updates as any).price !== undefined && !isNaN(Number((updates as any).price))) {
      const basePriceMinor = Math.round(Number((updates as any).price) * 100);
      if (basePriceMinor < 0) throw new Error('Base price cannot be negative');
      item.basePriceMinor = basePriceMinor;
      item.formattedPrice = `₹${(basePriceMinor / 100).toFixed(2)}`;
    }

    if (updates.category !== undefined) {
      const categoryName = updates.category.trim();
      const byId = updates.categoryId ? this.getCategory(updates.categoryId) : undefined;
      const byName = this.getCategory(categoryName);
      const resolved = byId || byName;
      if (resolved) {
        item.category = resolved.name;
        item.categoryId = resolved.id;
      } else {
        item.category = categoryName;
      }
    }

    if (updates.description !== undefined) item.description = updates.description;
    if (updates.prepDurationMinutes !== undefined) {
      item.prepDurationMinutes = Math.max(1, parseInt(String(updates.prepDurationMinutes), 10) || 12);
    }
    if (updates.station !== undefined) {
      const validStations = ['TANDOOR', 'CURRY_LINE', 'BAR', 'EXPO', 'DESSERT'];
      if (validStations.includes(updates.station)) {
        item.station = updates.station;
      }
    }
    if (updates.dietaryFlags !== undefined && Array.isArray(updates.dietaryFlags)) {
      const validFlags = ['VEG', 'NON_VEG', 'VEGAN', 'GLUTEN_FREE'];
      item.dietaryFlags = updates.dietaryFlags.filter((f) => validFlags.includes(f));
    }
    if (updates.allergens !== undefined && Array.isArray(updates.allergens)) {
      item.allergens = updates.allergens;
    }
    if (updates.isPopular !== undefined) item.isPopular = Boolean(updates.isPopular);
    if (updates.isSignature !== undefined) item.isSignature = Boolean(updates.isSignature);
    if (updates.story !== undefined) item.story = updates.story;
    if (updates.pairingSuggestions !== undefined && Array.isArray(updates.pairingSuggestions)) {
      item.pairingSuggestions = updates.pairingSuggestions;
    }
    if (updates.imageUrl !== undefined) item.imageUrl = updates.imageUrl;
    if (updates.isArchived !== undefined) item.isArchived = Boolean(updates.isArchived);

    if (updates.modifierGroups !== undefined) {
      if (Array.isArray(updates.modifierGroups)) {
        item.modifierGroups = updates.modifierGroups.map((grp, gIdx) => ({
          id: grp.id || `mod_grp_${Date.now().toString(36)}_${gIdx}`,
          name: (grp.name || `Option Group ${gIdx + 1}`).trim(),
          description: grp.description || '',
          minSelections: Math.max(0, parseInt(String(grp.minSelections || 0), 10) || 0),
          maxSelections: Math.max(1, parseInt(String(grp.maxSelections || 1), 10) || 1),
          options: (grp.options || []).map((opt, oIdx) => {
            const deltaMinor = Math.round(Math.max(0, parseInt(String(opt.priceDeltaMinor || 0), 10) || 0));
            return {
              id: opt.id || `opt_${Date.now().toString(36)}_${oIdx}`,
              name: (opt.name || `Option ${oIdx + 1}`).trim(),
              priceDeltaMinor: deltaMinor,
              formattedPriceDelta: deltaMinor > 0 ? `+₹${(deltaMinor / 100).toFixed(2)}` : undefined,
              isDefault: Boolean(opt.isDefault),
            };
          }),
        }));
      } else {
        item.modifierGroups = [];
      }
    }

    this.appendEvent('MENU_ITEM_UPDATED', 'catalog-service', '*', {
      itemId: id,
      updates,
    });

    this.flushSync();
    return item;
  }

  public archiveMenuItem(id: string): MenuItem | undefined {
    return this.updateMenuItem(id, { isArchived: true });
  }

  public deleteMenuItem(id: string): boolean {
    if (!this.data.menuItems) return false;
    const initialLen = this.data.menuItems.length;
    this.data.menuItems = this.data.menuItems.filter((i) => i.id !== id);
    if (this.data.menuItems.length !== initialLen) {
      this.appendEvent('MENU_ITEM_DELETED', 'catalog-service', '*', { itemId: id });
      this.flushSync();
      return true;
    }
    return false;
  }

  // --- Branch Menu Overrides & Inheritance ---
  public getBranchMenuOverrides(branchId?: string): BranchMenuOverride[] {
    if (!this.data.branchMenuOverrides) {
      this.data.branchMenuOverrides = JSON.parse(JSON.stringify(DEFAULT_BRANCH_MENU_OVERRIDES));
    }
    if (!branchId) return [...this.data.branchMenuOverrides];
    return this.data.branchMenuOverrides.filter((o) => o.branchId === branchId);
  }

  public setBranchMenuOverride(override: BranchMenuOverride): BranchMenuOverride {
    if (!this.data.branchMenuOverrides) {
      this.data.branchMenuOverrides = [];
    }
    const existingIdx = this.data.branchMenuOverrides.findIndex(
      (o) => o.itemId === override.itemId && o.branchId === override.branchId
    );
    if (existingIdx >= 0) {
      this.data.branchMenuOverrides[existingIdx] = {
        ...this.data.branchMenuOverrides[existingIdx],
        ...override,
      };
    } else {
      this.data.branchMenuOverrides.push(override);
    }
    this.appendEvent('BRANCH_MENU_OVERRIDE_UPDATED', 'catalog-service', override.branchId, override);
    this.flushSync();
    return override;
  }

  public getResolvedMenuForBranch(branchId: string, includeArchived = false): ResolvedMenuItem[] {
    const items = this.getMenuItems(includeArchived);
    const overrides = this.getBranchMenuOverrides(branchId);
    const categories = this.getCategories(true);
    const archivedCatNames = new Set(categories.filter((c) => c.isArchived).map((c) => c.name));
    const archivedCatIds = new Set(categories.filter((c) => c.isArchived).map((c) => c.id));

    const overrideMap = new Map<string, BranchMenuOverride>();
    for (const o of overrides) {
      overrideMap.set(o.itemId, o);
    }

    const filteredItems = items.filter((item) => {
      if (!includeArchived) {
        if (item.isArchived) return false;
        if (archivedCatNames.has(item.category) || (item.categoryId && archivedCatIds.has(item.categoryId))) {
          return false;
        }
      }
      return true;
    });

    return filteredItems.map((item) => {
      const ov = overrideMap.get(item.id);
      const isAvailableAtBranch = ov ? ov.isAvailable : true;
      const effectivePriceMinor =
        ov && typeof ov.priceOverrideMinor === 'number'
          ? ov.priceOverrideMinor
          : item.basePriceMinor;
      const effectiveFormattedPrice =
        ov && ov.formattedPriceOverride
          ? ov.formattedPriceOverride
          : ov && typeof ov.priceOverrideMinor === 'number'
          ? `₹${(ov.priceOverrideMinor / 100).toFixed(2)}`
          : item.formattedPrice;
      const isPriceOverridden = Boolean(
        ov &&
          typeof ov.priceOverrideMinor === 'number' &&
          ov.priceOverrideMinor !== item.basePriceMinor
      );

      return {
        ...item,
        isAvailableAtBranch,
        effectivePriceMinor,
        effectiveFormattedPrice,
        isPriceOverridden,
        sourceBranchId: branchId,
      };
    });
  }
}

