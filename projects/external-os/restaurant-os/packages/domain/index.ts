/**
 * 🍷 RestaurantOS 2.0 Domain Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Complete restaurant hierarchical model:
 * Restaurant -> Branch -> Floor/Service Area -> Table -> Seat -> Guest -> Orders -> DAG -> Bill
 * Plus: Service Requests, Multi-layout, Merging/Splitting, and Recommendation Engine.
 */

export interface ModifierOption {
  id: string;
  name: string;
  priceDeltaMinor: number;
  formattedPriceDelta?: string;
  isDefault?: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string;
  description?: string;
  minSelections: number; // 0 = optional, 1 = mandatory single-select
  maxSelections: number; // 1 = radio button, >1 = multi-select checkboxes
  options: ModifierOption[];
}

export interface StorefrontComponentNode {
  id: string;
  type: string;
  name?: string;
  layout?: string;
  props?: Record<string, any>;
  children?: StorefrontComponentNode[];
  dataBinding?: {
    entity: string;
    filter?: Record<string, any>;
  };
}

export interface StorefrontSection {
  id: string;
  type: string;
  title?: string;
  enabled: boolean;
  order: number;
  properties?: Record<string, any>;
  children?: StorefrontComponentNode[];
}

export interface StorefrontDocument {
  version: string;
  templateId: string;
  themeTokens: Record<string, string>;
  sections: StorefrontSection[];
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  displayOrder: number;
  isArchived?: boolean;
  color?: string;
}

export const DEFAULT_CATEGORIES: MenuCategory[] = [
  { id: 'cat_starters', name: 'Starters', description: 'Tandoori skewers, spiced kebabs, and crisp starters', displayOrder: 1 },
  { id: 'cat_mains', name: 'Mains', description: 'Rich gravies, dum biryanis, and royal curries', displayOrder: 2 },
  { id: 'cat_breads', name: 'Breads', description: 'Charcoal clay oven naans, rotis, and parathas', displayOrder: 3 },
  { id: 'cat_beverages', name: 'Beverages', description: 'Artisanal cocktails, lassies, and craft drinks', displayOrder: 4 },
  { id: 'cat_desserts', name: 'Desserts', description: 'Traditional slow-cooked desserts and kulfis', displayOrder: 5 },
];

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  basePriceMinor: number;
  formattedPrice: string;
  category: string;
  categoryId?: string;
  station: 'TANDOOR' | 'CURRY_LINE' | 'BAR' | 'EXPO' | 'DESSERT';
  prepDurationMinutes: number;
  allergens: string[];
  dietaryFlags: ('VEG' | 'NON_VEG' | 'VEGAN' | 'GLUTEN_FREE')[];
  story?: string;
  pairingSuggestions?: string[];
  isPopular?: boolean;
  isSignature?: boolean;
  modifierGroups?: ModifierGroup[];
  imageUrl?: string;
  isArchived?: boolean;
}

export type TaskStatus = 'QUEUED' | 'IN_PROGRESS' | 'READY' | 'BUMPED' | 'VOIDED' | 'CANCELLED';

export interface KitchenTask {
  id: string;
  orderId: string;
  tableNumber: string;
  branchId?: string;
  seatNumber?: string;
  guestName?: string;
  itemName: string;
  quantity: number;
  station: 'TANDOOR' | 'CURRY_LINE' | 'BAR' | 'EXPO' | 'DESSERT';
  status: TaskStatus;
  fireAt: string;
  targetServeAt: string;
  elapsedMinutes: number;
  slaMinutes: number;
  modifiers: string[];
  course?: 'FIRST_COURSE' | 'MAIN_COURSE' | 'DESSERT' | 'DRINKS';
  fulfilledItemCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type TableStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'BILL_REQUESTED'
  | 'RESERVED'
  | 'ORDERING'
  | 'COOKING'
  | 'DIRTY'
  | 'DISABLED';

export interface SeatRecord {
  id: string;
  seatNumber: number;
  label: string;
  guestId?: string;
  guestName?: string;
  isOccupied: boolean;
}

export interface GuestRecord {
  id: string;
  name: string;
  tableNumber: string;
  seatId?: string;
  seatLabel?: string;
  role: 'HOST' | 'COMPANION' | 'WALK_IN';
  joinTime: string;
  preferences: {
    diet?: string;
    spice?: string;
    allergens?: string[];
    notes?: string;
  };
  orderIds: string[];
  totalSpendMinor: number;
}

export interface TableFloorRecord {
  id: number;
  number: string;
  capacity: number;
  minimumSeats?: number;
  status: TableStatus;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  shape: 'rectangle' | 'circle' | 'booth';
  section: string;
  floorId: string;
  branchId: string;
  locator: string;
  seats: SeatRecord[];
  activeSessionId?: string;
  activeBillMinor?: number;
  serverName?: string;
  turnTimeMinutes?: number;
  mergedWithTableIds?: number[];
  mergedPartyLabel?: string;
}

export interface ServiceRequest {
  id: string;
  tableNumber: string;
  branchId: string;
  floorId: string;
  type: 'WATER' | 'CUTLERY' | 'NAPKINS' | 'CALL_SERVER' | 'BILL' | 'DIETARY' | 'MORE_TIME';
  status: 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED';
  requestedAt: string;
  note?: string;
}

export interface BranchOpeningHours {
  openTime: string;
  closeTime: string;
  daysOpen: string;
  isOpenNow?: boolean;
}

export interface BranchRecord {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  timezone: string;
  currency: string;
  status: 'OPERATIONAL' | 'SETUP' | 'OFFLINE';
  serviceAreasCount: number;
  activeTablesCount: number;
  openingHours?: BranchOpeningHours;
  phone?: string;
  email?: string;
}

export interface BranchMenuOverride {
  itemId: string;
  branchId: string;
  isAvailable: boolean;          // true = available, false = 86'd / sold out at this branch
  priceOverrideMinor?: number;   // if defined, overrides MenuItem.basePriceMinor
  formattedPriceOverride?: string;
  customPrepMinutes?: number;
}

export interface ResolvedMenuItem extends MenuItem {
  isAvailableAtBranch: boolean;
  effectivePriceMinor: number;
  effectiveFormattedPrice: string;
  isPriceOverridden: boolean;
  sourceBranchId: string;
}

export interface ServiceLayoutConfig {
  id: string;
  name: string;
  description: string;
  tableCount: number;
}

export interface FloorRecord {
  id: string;
  branchId: string;
  name: string;
  type: 'Dining' | 'Bar' | 'Outdoor' | 'Private' | 'Custom';
  capacity: number;
  activeLayout: string;
  status: 'ACTIVE' | 'ARCHIVED';
  tableIds: number[];
  serviceLayouts?: ServiceLayoutConfig[];
}

export interface SmartRecommendation {
  id: string;
  type: 'MENU' | 'SERVICE' | 'KITCHEN' | 'TABLE' | 'GUEST' | 'REVENUE';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  observation: string;
  reason: string;
  confidence: number;
  impact: {
    revenue?: number;
    timeSavedMinutes?: number;
    riskReduction?: number;
  };
  action: string;
  actionUrl?: string;
}

export interface RestaurantContext {
  branchId: string;
  branchName: string;
  floorId: string;
  floorName: string;
  serviceId: 'DINNER' | 'LUNCH' | 'LATE_NIGHT';
  serviceName: string;
  layoutId: string;
  heatmapMode: 'STATUS' | 'OCCUPANCY' | 'TURNOVER' | 'REVENUE' | 'KITCHEN_DELAY';
  viewMode: 'LIVE' | 'EDIT';
  role: 'MANAGER' | 'SERVER' | 'CHEF' | 'EXPO' | 'OWNER';
}

export interface RestaurantOrder {
  orderId: string;
  tableNumber: string;
  sessionId: string;
  branchId?: string;
  guestName?: string;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PREPARATION' | 'SERVED' | 'PAID' | 'COMPED' | 'VOIDED' | 'CANCELLED' | 'UNSETTLED_OVERRIDE';
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPriceMinor: number;
    station: string;
    guestName?: string;
    seatLabel?: string;
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
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Production Branch Archetypes
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_BRANCHES: BranchRecord[] = [
  {
    id: 'branch_ldh',
    name: 'Ludhiana Main',
    code: 'LDH-HQ',
    address: '54 Model Town, Mall Road',
    city: 'Ludhiana',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    status: 'OPERATIONAL',
    serviceAreasCount: 4,
    activeTablesCount: 28,
    openingHours: {
      openTime: '12:00 PM',
      closeTime: '11:30 PM',
      daysOpen: 'Mon - Sun',
      isOpenNow: true,
    },
    phone: '+91 161 450 8890',
    email: 'ludhiana@orbitoxbistro.com',
  },
  {
    id: 'branch_chd',
    name: 'Chandigarh Sector 17',
    code: 'CHD-S17',
    address: 'SCO 88-89, Sector 17-C',
    city: 'Chandigarh',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    status: 'OPERATIONAL',
    serviceAreasCount: 3,
    activeTablesCount: 22,
    openingHours: {
      openTime: '11:30 AM',
      closeTime: '11:00 PM',
      daysOpen: 'Mon - Sun',
      isOpenNow: true,
    },
    phone: '+91 172 270 4421',
    email: 'chandigarh@orbitoxbistro.com',
  },
  {
    id: 'branch_del',
    name: 'Delhi Connaught Place',
    code: 'DEL-CP',
    address: 'Radial Road 4, Inner Circle',
    city: 'New Delhi',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    status: 'OPERATIONAL',
    serviceAreasCount: 3,
    activeTablesCount: 34,
    openingHours: {
      openTime: '12:00 PM',
      closeTime: '01:00 AM',
      daysOpen: 'Mon - Sun',
      isOpenNow: true,
    },
    phone: '+91 11 4150 9982',
    email: 'delhi@orbitoxbistro.com',
  },
];

export const DEFAULT_BRANCH_MENU_OVERRIDES: BranchMenuOverride[] = [
  // Delhi Connaught Place premium metropolitan overrides
  {
    itemId: 'item_butter_chicken',
    branchId: 'branch_del',
    isAvailable: true,
    priceOverrideMinor: 58000, // ₹580.00 in Delhi CP vs ₹540.00 base
    formattedPriceOverride: '₹580.00',
  },
  {
    itemId: 'item_dal_makhani',
    branchId: 'branch_del',
    isAvailable: false, // 86'd / sold out at Delhi CP branch today
  },
  // Chandigarh Sector 17 patio overrides
  {
    itemId: 'item_gulab_jamun',
    branchId: 'branch_chd',
    isAvailable: true,
    priceOverrideMinor: 24000, // ₹240.00 in Chandigarh vs ₹220.00 base
    formattedPriceOverride: '₹240.00',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Default Floor / Service Areas
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_FLOORS: FloorRecord[] = [
  // Ludhiana Floors
  {
    id: 'floor_courtyard',
    branchId: 'branch_ldh',
    name: 'Main Courtyard',
    type: 'Dining',
    capacity: 84,
    activeLayout: 'Dinner Layout',
    status: 'ACTIVE',
    tableIds: [1, 2, 3, 4, 5, 6, 7, 8, 14],
    serviceLayouts: [
      { id: 'lay_dinner', name: 'Dinner Layout', description: 'Standard high-cover table configuration', tableCount: 9 },
      { id: 'lay_lunch', name: 'Lunch Rush', description: 'Fast turn 2-top and 4-top layout', tableCount: 12 },
      { id: 'lay_event', name: 'Private Event / Reception', description: 'Open cocktail & dance floor arrangement', tableCount: 5 },
    ],
  },
  {
    id: 'floor_bar',
    branchId: 'branch_ldh',
    name: 'Bar Lounge',
    type: 'Bar',
    capacity: 24,
    activeLayout: 'Evening Cocktails',
    status: 'ACTIVE',
    tableIds: [10, 11],
    serviceLayouts: [
      { id: 'lay_bar_eve', name: 'Evening Cocktails', description: 'High-top seating and mixology views', tableCount: 2 },
      { id: 'lay_bar_day', name: 'Daytime Lounge', description: 'Casual cafe seating', tableCount: 3 },
    ],
  },
  {
    id: 'floor_private',
    branchId: 'branch_ldh',
    name: 'Private Dining',
    type: 'Private',
    capacity: 16,
    activeLayout: 'Gala Dinner',
    status: 'ACTIVE',
    tableIds: [9],
    serviceLayouts: [
      { id: 'lay_pdr_gala', name: 'Gala Dinner', description: 'Long royal banquet table configuration', tableCount: 1 },
      { id: 'lay_pdr_conf', name: 'Executive Meeting', description: 'Boardroom conference presentation setup', tableCount: 1 },
    ],
  },
  {
    id: 'floor_rooftop',
    branchId: 'branch_ldh',
    name: 'Rooftop Terrace',
    type: 'Outdoor',
    capacity: 36,
    activeLayout: 'Open Sky',
    status: 'ACTIVE',
    tableIds: [15, 16],
    serviceLayouts: [
      { id: 'lay_roof_sky', name: 'Open Sky', description: 'Canopy lounge and starlight seating', tableCount: 2 },
      { id: 'lay_roof_bbq', name: 'Live Grille & Barbecue', description: 'Chef station buffer and casual high tables', tableCount: 4 },
    ],
  },

  // Chandigarh Floors
  {
    id: 'floor_chd_dining',
    branchId: 'branch_chd',
    name: 'Main Dining Hall',
    type: 'Dining',
    capacity: 60,
    activeLayout: 'Standard',
    status: 'ACTIVE',
    tableIds: [21, 22, 23, 24],
    serviceLayouts: [
      { id: 'lay_chd_std', name: 'Standard Layout', description: 'Sector 17 family dining setup', tableCount: 4 },
    ],
  },
  {
    id: 'floor_chd_patio',
    branchId: 'branch_chd',
    name: 'Garden Patio',
    type: 'Outdoor',
    capacity: 30,
    activeLayout: 'Afternoon High Tea',
    status: 'ACTIVE',
    tableIds: [25, 26],
    serviceLayouts: [
      { id: 'lay_chd_tea', name: 'Afternoon High Tea', description: 'Garden parasol seating', tableCount: 2 },
    ],
  },

  // Delhi Floors
  {
    id: 'floor_del_atrium',
    branchId: 'branch_del',
    name: 'Heritage Atrium',
    type: 'Dining',
    capacity: 96,
    activeLayout: 'Heritage Seating',
    status: 'ACTIVE',
    tableIds: [31, 32, 33],
    serviceLayouts: [
      { id: 'lay_del_her', name: 'Heritage Seating', description: 'Grand colonial pillars layout', tableCount: 3 },
    ],
  },
  {
    id: 'floor_del_lounge',
    branchId: 'branch_del',
    name: 'Colonial Lounge',
    type: 'Bar',
    capacity: 40,
    activeLayout: 'Bar Service',
    status: 'ACTIVE',
    tableIds: [34, 35],
    serviceLayouts: [
      { id: 'lay_del_lounge', name: 'Bar Service', description: 'Velvet booth lounge seating', tableCount: 2 },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Default Live Service Requests (Realtime Waiter Requests)
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_SERVICE_REQUESTS: ServiceRequest[] = [
  {
    id: 'req_01',
    tableNumber: 'T-14',
    branchId: 'branch_ldh',
    floorId: 'floor_courtyard',
    type: 'WATER',
    status: 'PENDING',
    requestedAt: '19:51',
    note: 'Chilled water carafe requested',
  },
  {
    id: 'req_02',
    tableNumber: 'T-05',
    branchId: 'branch_ldh',
    floorId: 'floor_courtyard',
    type: 'BILL',
    status: 'PENDING',
    requestedAt: '19:48',
    note: 'Digital bill payment & split check',
  },
  {
    id: 'req_03',
    tableNumber: 'T-02',
    branchId: 'branch_ldh',
    floorId: 'floor_courtyard',
    type: 'CALL_SERVER',
    status: 'ACKNOWLEDGED',
    requestedAt: '19:40',
    note: 'Question regarding Amritsari Fish Tikka allergens',
  },
];

// Helper to generate seats for a given capacity
export function generateSeats(capacity: number, tableId: number): SeatRecord[] {
  const seats: SeatRecord[] = [];
  for (let i = 1; i <= capacity; i++) {
    seats.push({
      id: `seat_${tableId}_${i}`,
      seatNumber: i,
      label: `S${i}`,
      isOccupied: false,
    });
  }
  return seats;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Spatial Tables (Seed with Seats and Live State)
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_TABLES: TableFloorRecord[] = [
  {
    id: 1,
    number: 'T-01',
    capacity: 2,
    status: 'AVAILABLE',
    x: 60,
    y: 50,
    width: 80,
    height: 80,
    rotation: 0,
    shape: 'circle',
    section: 'Main Courtyard',
    floorId: 'floor_courtyard',
    branchId: 'branch_ldh',
    locator: '8Kl2aB1q9P',
    serverName: 'Aman',
    turnTimeMinutes: 0,
    seats: generateSeats(2, 1),
  },
  {
    id: 2,
    number: 'T-02',
    capacity: 2,
    status: 'OCCUPIED',
    x: 180,
    y: 50,
    width: 80,
    height: 80,
    rotation: 0,
    shape: 'circle',
    section: 'Main Courtyard',
    floorId: 'floor_courtyard',
    branchId: 'branch_ldh',
    locator: '3Mn8vC4w1R',
    activeSessionId: 'sess_02',
    activeBillMinor: 49000,
    serverName: 'Simran',
    turnTimeMinutes: 28,
    seats: [
      { id: 'seat_2_1', seatNumber: 1, label: 'S1', guestId: 'g_2_1', guestName: 'Karan', isOccupied: true },
      { id: 'seat_2_2', seatNumber: 2, label: 'S2', guestId: 'g_2_2', guestName: 'Neha', isOccupied: true },
    ],
  },
  {
    id: 3,
    number: 'T-03',
    capacity: 4,
    status: 'OCCUPIED',
    x: 300,
    y: 50,
    width: 90,
    height: 90,
    rotation: 0,
    shape: 'rectangle',
    section: 'Main Courtyard',
    floorId: 'floor_courtyard',
    branchId: 'branch_ldh',
    locator: '9Qz1xC7v2B',
    activeSessionId: 'sess_03',
    activeBillMinor: 28000,
    serverName: 'Aman',
    turnTimeMinutes: 35,
    seats: [
      { id: 'seat_3_1', seatNumber: 1, label: 'S1', guestId: 'g_3_1', guestName: 'Harpreet', isOccupied: true },
      { id: 'seat_3_2', seatNumber: 2, label: 'S2', guestId: 'g_3_2', guestName: 'Jaspreet', isOccupied: true },
      { id: 'seat_3_3', seatNumber: 3, label: 'S3', isOccupied: false },
      { id: 'seat_3_4', seatNumber: 4, label: 'S4', isOccupied: false },
    ],
  },
  {
    id: 4,
    number: 'T-04',
    capacity: 4,
    status: 'AVAILABLE',
    x: 430,
    y: 50,
    width: 90,
    height: 90,
    rotation: 0,
    shape: 'rectangle',
    section: 'Main Courtyard',
    floorId: 'floor_courtyard',
    branchId: 'branch_ldh',
    locator: '5Vb9yU3i8O',
    serverName: 'Vikram',
    turnTimeMinutes: 0,
    seats: generateSeats(4, 4),
  },
  {
    id: 5,
    number: 'T-05',
    capacity: 6,
    status: 'BILL_REQUESTED',
    x: 60,
    y: 170,
    width: 120,
    height: 80,
    rotation: 0,
    shape: 'rectangle',
    section: 'Main Courtyard',
    floorId: 'floor_courtyard',
    branchId: 'branch_ldh',
    locator: '2We4rT8y1U',
    activeSessionId: 'sess_05',
    activeBillMinor: 135000,
    serverName: 'Simran',
    turnTimeMinutes: 52,
    seats: [
      { id: 'seat_5_1', seatNumber: 1, label: 'S1', guestId: 'g_5_1', guestName: 'Rajesh', isOccupied: true },
      { id: 'seat_5_2', seatNumber: 2, label: 'S2', guestId: 'g_5_2', guestName: 'Sunita', isOccupied: true },
      { id: 'seat_5_3', seatNumber: 3, label: 'S3', guestId: 'g_5_3', guestName: 'Ananya', isOccupied: true },
      { id: 'seat_5_4', seatNumber: 4, label: 'S4', guestId: 'g_5_4', guestName: 'Rohan', isOccupied: true },
      { id: 'seat_5_5', seatNumber: 5, label: 'S5', isOccupied: false },
      { id: 'seat_5_6', seatNumber: 6, label: 'S6', isOccupied: false },
    ],
  },
  {
    id: 6,
    number: 'T-06',
    capacity: 4,
    status: 'AVAILABLE',
    x: 220,
    y: 170,
    width: 90,
    height: 90,
    rotation: 0,
    shape: 'rectangle',
    section: 'Main Courtyard',
    floorId: 'floor_courtyard',
    branchId: 'branch_ldh',
    locator: '6Yu7iO2p4A',
    serverName: 'Vikram',
    turnTimeMinutes: 0,
    seats: generateSeats(4, 6),
  },
  {
    id: 7,
    number: 'T-07',
    capacity: 4,
    status: 'OCCUPIED',
    x: 350,
    y: 170,
    width: 90,
    height: 90,
    rotation: 0,
    shape: 'rectangle',
    section: 'Main Courtyard',
    floorId: 'floor_courtyard',
    branchId: 'branch_ldh',
    locator: '1Sd3fG5h7J',
    activeSessionId: 'sess_07',
    activeBillMinor: 76000,
    serverName: 'Aman',
    turnTimeMinutes: 44,
    seats: [
      { id: 'seat_7_1', seatNumber: 1, label: 'S1', guestId: 'g_7_1', guestName: 'Priya', isOccupied: true },
      { id: 'seat_7_2', seatNumber: 2, label: 'S2', guestId: 'g_7_2', guestName: 'Amit', isOccupied: true },
      { id: 'seat_7_3', seatNumber: 3, label: 'S3', isOccupied: false },
      { id: 'seat_7_4', seatNumber: 4, label: 'S4', isOccupied: false },
    ],
  },
  {
    id: 8,
    number: 'T-08',
    capacity: 2,
    status: 'AVAILABLE',
    x: 480,
    y: 170,
    width: 80,
    height: 80,
    rotation: 0,
    shape: 'circle',
    section: 'Main Courtyard',
    floorId: 'floor_courtyard',
    branchId: 'branch_ldh',
    locator: '4Kl6zX8c0V',
    serverName: 'Aman',
    turnTimeMinutes: 0,
    seats: generateSeats(2, 8),
  },
  {
    id: 9,
    number: 'T-09',
    capacity: 8,
    status: 'RESERVED',
    x: 60,
    y: 290,
    width: 150,
    height: 90,
    rotation: 0,
    shape: 'rectangle',
    section: 'Private Dining',
    floorId: 'floor_private',
    branchId: 'branch_ldh',
    locator: '7Jk5mN3b1Q',
    serverName: 'Simran',
    turnTimeMinutes: 0,
    seats: generateSeats(8, 9),
  },
  {
    id: 10,
    number: 'B-01',
    capacity: 2,
    status: 'AVAILABLE',
    x: 250,
    y: 290,
    width: 80,
    height: 80,
    rotation: 0,
    shape: 'circle',
    section: 'Bar Lounge',
    floorId: 'floor_bar',
    branchId: 'branch_ldh',
    locator: '8Po0iU2y4T',
    serverName: 'Tanya (Bar)',
    turnTimeMinutes: 0,
    seats: generateSeats(2, 10),
  },
  {
    id: 11,
    number: 'B-02',
    capacity: 2,
    status: 'OCCUPIED',
    x: 370,
    y: 290,
    width: 80,
    height: 80,
    rotation: 0,
    shape: 'circle',
    section: 'Bar Lounge',
    floorId: 'floor_bar',
    branchId: 'branch_ldh',
    locator: '2Wq9eR7t5Y',
    activeSessionId: 'sess_11',
    activeBillMinor: 42000,
    serverName: 'Tanya (Bar)',
    turnTimeMinutes: 19,
    seats: [
      { id: 'seat_11_1', seatNumber: 1, label: 'S1', guestId: 'g_11_1', guestName: 'Dev', isOccupied: true },
      { id: 'seat_11_2', seatNumber: 2, label: 'S2', isOccupied: false },
    ],
  },
  {
    id: 14,
    number: 'T-14',
    capacity: 4,
    status: 'OCCUPIED',
    x: 490,
    y: 290,
    width: 90,
    height: 90,
    rotation: 0,
    shape: 'rectangle',
    section: 'Main Courtyard',
    floorId: 'floor_courtyard',
    branchId: 'branch_ldh',
    locator: '7Kp9xQ8m2L',
    activeSessionId: 'sess_14',
    activeBillMinor: 76650,
    serverName: 'Aman',
    turnTimeMinutes: 42,
    seats: [
      { id: 'seat_14_1', seatNumber: 1, label: 'S1', guestId: 'g_14_1', guestName: 'Nikhil (Host)', isOccupied: true },
      { id: 'seat_14_2', seatNumber: 2, label: 'S2', guestId: 'g_14_2', guestName: 'Rahul', isOccupied: true },
      { id: 'seat_14_3', seatNumber: 3, label: 'S3', isOccupied: false },
      { id: 'seat_14_4', seatNumber: 4, label: 'S4', isOccupied: false },
    ],
  },
  {
    id: 15,
    number: 'R-01',
    capacity: 4,
    status: 'AVAILABLE',
    x: 100,
    y: 100,
    width: 90,
    height: 90,
    rotation: 0,
    shape: 'circle',
    section: 'Rooftop Terrace',
    floorId: 'floor_rooftop',
    branchId: 'branch_ldh',
    locator: '4Rk8xM2q1P',
    serverName: 'Gurpreet',
    turnTimeMinutes: 0,
    seats: generateSeats(4, 15),
  },
  {
    id: 16,
    number: 'R-02',
    capacity: 6,
    status: 'AVAILABLE',
    x: 240,
    y: 100,
    width: 120,
    height: 80,
    rotation: 0,
    shape: 'rectangle',
    section: 'Rooftop Terrace',
    floorId: 'floor_rooftop',
    branchId: 'branch_ldh',
    locator: '9Lp3vN7w4K',
    serverName: 'Gurpreet',
    turnTimeMinutes: 0,
    seats: generateSeats(6, 16),
  },

  // ── Chandigarh Sector 17 Tables ──
  {
    id: 21,
    number: 'T-21',
    capacity: 4,
    status: 'OCCUPIED',
    x: 80,
    y: 80,
    width: 90,
    height: 90,
    rotation: 0,
    shape: 'rectangle',
    section: 'Main Dining Hall',
    floorId: 'floor_chd_dining',
    branchId: 'branch_chd',
    locator: '9Chd1a4K2P',
    activeSessionId: 'sess_chd_21',
    activeBillMinor: 48000,
    serverName: 'Harjit',
    turnTimeMinutes: 32,
    seats: [
      { id: 'seat_21_1', seatNumber: 1, label: 'S1', guestId: 'g_chd_1', guestName: 'Gurman (Host)', isOccupied: true },
      { id: 'seat_21_2', seatNumber: 2, label: 'S2', guestId: 'g_chd_2', guestName: 'Simrat', isOccupied: true },
      { id: 'seat_21_3', seatNumber: 3, label: 'S3', isOccupied: false },
      { id: 'seat_21_4', seatNumber: 4, label: 'S4', isOccupied: false },
    ],
  },
  {
    id: 22,
    number: 'T-22',
    capacity: 4,
    status: 'AVAILABLE',
    x: 220,
    y: 80,
    width: 90,
    height: 90,
    rotation: 0,
    shape: 'rectangle',
    section: 'Main Dining Hall',
    floorId: 'floor_chd_dining',
    branchId: 'branch_chd',
    locator: '8Chd2b5L3Q',
    serverName: 'Harjit',
    turnTimeMinutes: 0,
    seats: generateSeats(4, 22),
  },
  {
    id: 23,
    number: 'T-23',
    capacity: 6,
    status: 'BILL_REQUESTED',
    x: 360,
    y: 80,
    width: 120,
    height: 80,
    rotation: 0,
    shape: 'rectangle',
    section: 'Main Dining Hall',
    floorId: 'floor_chd_dining',
    branchId: 'branch_chd',
    locator: '7Chd3c6M4R',
    activeSessionId: 'sess_chd_23',
    activeBillMinor: 68000,
    serverName: 'Manpreet',
    turnTimeMinutes: 56,
    seats: generateSeats(6, 23),
  },
  {
    id: 24,
    number: 'T-24',
    capacity: 2,
    status: 'AVAILABLE',
    x: 520,
    y: 80,
    width: 80,
    height: 80,
    rotation: 0,
    shape: 'circle',
    section: 'Main Dining Hall',
    floorId: 'floor_chd_dining',
    branchId: 'branch_chd',
    locator: '6Chd4d7N5S',
    serverName: 'Manpreet',
    turnTimeMinutes: 0,
    seats: generateSeats(2, 24),
  },
  {
    id: 25,
    number: 'P-01',
    capacity: 4,
    status: 'OCCUPIED',
    x: 100,
    y: 120,
    width: 90,
    height: 90,
    rotation: 0,
    shape: 'circle',
    section: 'Garden Patio',
    floorId: 'floor_chd_patio',
    branchId: 'branch_chd',
    locator: '5Chd5e8O6T',
    activeSessionId: 'sess_chd_25',
    activeBillMinor: 34000,
    serverName: 'Gagan',
    turnTimeMinutes: 20,
    seats: generateSeats(4, 25),
  },
  {
    id: 26,
    number: 'P-02',
    capacity: 4,
    status: 'AVAILABLE',
    x: 260,
    y: 120,
    width: 90,
    height: 90,
    rotation: 0,
    shape: 'circle',
    section: 'Garden Patio',
    floorId: 'floor_chd_patio',
    branchId: 'branch_chd',
    locator: '4Chd6f9P7U',
    serverName: 'Gagan',
    turnTimeMinutes: 0,
    seats: generateSeats(4, 26),
  },

  // ── Delhi Connaught Place Tables ──
  {
    id: 31,
    number: 'D-01',
    capacity: 6,
    status: 'OCCUPIED',
    x: 80,
    y: 80,
    width: 120,
    height: 80,
    rotation: 0,
    shape: 'rectangle',
    section: 'Heritage Atrium',
    floorId: 'floor_del_atrium',
    branchId: 'branch_del',
    locator: '3Del1a0Q8V',
    activeSessionId: 'sess_del_31',
    activeBillMinor: 112000,
    serverName: 'Rohit',
    turnTimeMinutes: 48,
    seats: [
      { id: 'seat_31_1', seatNumber: 1, label: 'S1', guestId: 'g_del_1', guestName: 'Varun (Host)', isOccupied: true },
      { id: 'seat_31_2', seatNumber: 2, label: 'S2', guestId: 'g_del_2', guestName: 'Rhea', isOccupied: true },
      { id: 'seat_31_3', seatNumber: 3, label: 'S3', isOccupied: false },
      { id: 'seat_31_4', seatNumber: 4, label: 'S4', isOccupied: false },
      { id: 'seat_31_5', seatNumber: 5, label: 'S5', isOccupied: false },
      { id: 'seat_31_6', seatNumber: 6, label: 'S6', isOccupied: false },
    ],
  },
  {
    id: 32,
    number: 'D-02',
    capacity: 4,
    status: 'AVAILABLE',
    x: 240,
    y: 80,
    width: 90,
    height: 90,
    rotation: 0,
    shape: 'rectangle',
    section: 'Heritage Atrium',
    floorId: 'floor_del_atrium',
    branchId: 'branch_del',
    locator: '2Del2b1R9W',
    serverName: 'Rohit',
    turnTimeMinutes: 0,
    seats: generateSeats(4, 32),
  },
  {
    id: 33,
    number: 'D-03',
    capacity: 8,
    status: 'RESERVED',
    x: 400,
    y: 80,
    width: 150,
    height: 90,
    rotation: 0,
    shape: 'rectangle',
    section: 'Heritage Atrium',
    floorId: 'floor_del_atrium',
    branchId: 'branch_del',
    locator: '1Del3c2S0X',
    serverName: 'Ananya',
    turnTimeMinutes: 0,
    seats: generateSeats(8, 33),
  },
  {
    id: 34,
    number: 'L-01',
    capacity: 2,
    status: 'OCCUPIED',
    x: 120,
    y: 120,
    width: 80,
    height: 80,
    rotation: 0,
    shape: 'circle',
    section: 'Colonial Lounge',
    floorId: 'floor_del_lounge',
    branchId: 'branch_del',
    locator: '9Del4d3T1Y',
    activeSessionId: 'sess_del_34',
    activeBillMinor: 56000,
    serverName: 'Kabir (Bar)',
    turnTimeMinutes: 25,
    seats: generateSeats(2, 34),
  },
  {
    id: 35,
    number: 'L-02',
    capacity: 4,
    status: 'AVAILABLE',
    x: 280,
    y: 120,
    width: 90,
    height: 90,
    rotation: 0,
    shape: 'circle',
    section: 'Colonial Lounge',
    floorId: 'floor_del_lounge',
    branchId: 'branch_del',
    locator: '8Del5e4U2Z',
    serverName: 'Kabir (Bar)',
    turnTimeMinutes: 0,
    seats: generateSeats(4, 35),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Default Culinary Menu
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_MENU: MenuItem[] = [
  {
    id: 'item_paneer_tikka',
    name: 'Paneer Tikka Charcoal Grilled',
    description: 'Cottage cheese marinated in Kashmiri chili, hung curd, and roasted gram flour.',
    basePriceMinor: 35000,
    formattedPrice: '₹350.00',
    category: 'Starters',
    station: 'TANDOOR',
    prepDurationMinutes: 12,
    allergens: ['DAIRY'],
    dietaryFlags: ['VEG'],
    isPopular: true,
    isSignature: true,
    story: 'Skewered on seasoned iron rods, seared at 450°C over charcoal embers.',
    pairingSuggestions: ['item_garlic_naan', 'item_mango_lassi'],
    imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800&auto=format&fit=crop&q=80',
    modifierGroups: [
      {
        id: 'mod_paneer_spice',
        name: 'Spice Profile',
        description: 'Select your preferred tandoori heat level',
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: 'm_mild', name: 'Mild Herb Infusion', priceDeltaMinor: 0, isDefault: false },
          { id: 'm_medium', name: 'Classic Kashmiri Spiced (Medium)', priceDeltaMinor: 0, isDefault: true },
          { id: 'm_hot', name: 'Fiery Angara Embers (Extra Spicy)', priceDeltaMinor: 2000, formattedPriceDelta: '+₹20.00' },
        ],
      },
      {
        id: 'mod_paneer_accompaniment',
        name: 'Chutney & Accompaniments',
        description: 'House-made traditional accompaniments',
        minSelections: 0,
        maxSelections: 2,
        options: [
          { id: 'm_mint_chutney', name: 'Pudina Mint Coriander Chutney', priceDeltaMinor: 0, isDefault: true },
          { id: 'm_sirka_pyaz', name: 'Pickled Sirka Pearl Onions', priceDeltaMinor: 2000, formattedPriceDelta: '+₹20.00' },
          { id: 'm_smoked_butter', name: 'Smoked Charcoal Butter Glaze', priceDeltaMinor: 3000, formattedPriceDelta: '+₹30.00' },
        ],
      },
    ],
  },
  {
    id: 'item_fish_tikka',
    name: 'Amritsari Fish Tikka',
    description: 'River sole chunks rubbed with ajwain carom seeds, yellow chili, and mustard oil.',
    basePriceMinor: 48000,
    formattedPrice: '₹480.00',
    category: 'Starters',
    station: 'TANDOOR',
    prepDurationMinutes: 14,
    allergens: ['FISH'],
    dietaryFlags: ['NON_VEG'],
    isPopular: true,
    story: 'Fresh river sole steeped in coarse cold-pressed mustard oil.',
    pairingSuggestions: ['item_butter_naan'],
    imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&auto=format&fit=crop&q=80',
    modifierGroups: [
      {
        id: 'mod_fish_prep',
        name: 'Preparation Style',
        description: 'Choose your desired hearth crust',
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: 'm_charred_tandoor', name: 'Tandoori Charred Embers', priceDeltaMinor: 0, isDefault: true },
          { id: 'm_amritsari_crust', name: 'Crispy Amritsari Fried Crust', priceDeltaMinor: 3000, formattedPriceDelta: '+₹30.00' },
        ],
      },
      {
        id: 'mod_fish_citrus',
        name: 'Citrus & Dip Accents',
        minSelections: 0,
        maxSelections: 1,
        options: [
          { id: 'm_kaffir_lime', name: 'Kaffir Lime Tartar Dip', priceDeltaMinor: 0, isDefault: true },
          { id: 'm_mooli_laccha', name: 'Radish Mooli Laccha with Chaat Masala', priceDeltaMinor: 2000, formattedPriceDelta: '+₹20.00' },
        ],
      },
    ],
  },
  {
    id: 'item_dal_makhani',
    name: 'Dal Makhani Slow-Simmered (24 hrs)',
    description: 'Black lentils slow cooked overnight on charcoal embers with churned butter.',
    basePriceMinor: 38000,
    formattedPrice: '₹380.00',
    category: 'Mains',
    station: 'CURRY_LINE',
    prepDurationMinutes: 14,
    allergens: ['DAIRY'],
    dietaryFlags: ['VEG'],
    isPopular: true,
    isSignature: true,
    story: '24 hours in heavy brass handis over dying embers.',
    pairingSuggestions: ['item_butter_naan', 'item_jeera_rice'],
    imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&auto=format&fit=crop&q=80',
    modifierGroups: [
      {
        id: 'mod_dal_richness',
        name: 'Gravy Richness',
        description: 'Artisanal dairy finish',
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: 'm_classic_butter', name: 'Classic Velvet Butter (Traditional)', priceDeltaMinor: 0, isDefault: true },
          { id: 'm_double_makhan', name: 'Double White Farmhouse Makhan', priceDeltaMinor: 4000, formattedPriceDelta: '+₹40.00' },
        ],
      },
      {
        id: 'mod_dal_sides',
        name: 'Side Accompaniment',
        minSelections: 0,
        maxSelections: 1,
        options: [
          { id: 'm_burani_raita', name: 'Burani Garlic Raita Cup', priceDeltaMinor: 5000, formattedPriceDelta: '+₹50.00' },
          { id: 'm_kachumber', name: 'Crisp Kachumber Salad Bowl', priceDeltaMinor: 3000, formattedPriceDelta: '+₹30.00' },
        ],
      },
    ],
  },
  {
    id: 'item_butter_chicken',
    name: 'Murgh Makhani (Old Delhi Style)',
    description: 'Smoked chicken tikka simmered in velvet tomato, fenugreek, and honey sauce.',
    basePriceMinor: 49000,
    formattedPrice: '₹490.00',
    category: 'Mains',
    station: 'CURRY_LINE',
    prepDurationMinutes: 15,
    allergens: ['DAIRY'],
    dietaryFlags: ['NON_VEG'],
    isPopular: true,
    story: 'Old Delhi recipe using sun-ripened tomatoes and wild blossom honey.',
    pairingSuggestions: ['item_butter_naan'],
    imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&auto=format&fit=crop&q=80',
    modifierGroups: [
      {
        id: 'mod_chicken_finish',
        name: 'Sauce Finish',
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: 'm_delhi_velvet', name: 'Old Delhi Velvet (Traditional)', priceDeltaMinor: 0, isDefault: true },
          { id: 'm_extra_smoked_cream', name: 'Extra Smoked Honey & Clotted Cream', priceDeltaMinor: 4000, formattedPriceDelta: '+₹40.00' },
        ],
      },
      {
        id: 'mod_chicken_sides',
        name: 'Fresh Garnish',
        minSelections: 0,
        maxSelections: 1,
        options: [
          { id: 'm_laccha_pyaz', name: 'Crisp Laccha Onion & Green Chili', priceDeltaMinor: 2000, formattedPriceDelta: '+₹20.00' },
          { id: 'm_garlic_raita', name: 'Burani Roasted Garlic Raita', priceDeltaMinor: 5000, formattedPriceDelta: '+₹50.00' },
        ],
      },
    ],
  },
  {
    id: 'item_butter_naan',
    name: 'Crisp Butter Naan',
    description: 'Tandoor-baked refined flour bread brushed with salted farmhouse butter.',
    basePriceMinor: 7000,
    formattedPrice: '₹70.00',
    category: 'Breads',
    station: 'TANDOOR',
    prepDurationMinutes: 5,
    allergens: ['DAIRY', 'WHEAT'],
    dietaryFlags: ['VEG'],
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=800&auto=format&fit=crop&q=80',
    modifierGroups: [
      {
        id: 'mod_naan_finish',
        name: 'Butter Glaze',
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: 'm_farm_butter', name: 'Salted Farmhouse Butter', priceDeltaMinor: 0, isDefault: true },
          { id: 'm_desi_ghee', name: 'Pure Desi Ghee Brushed', priceDeltaMinor: 1500, formattedPriceDelta: '+₹15.00' },
          { id: 'm_olive_herb', name: 'Extra Virgin Olive Oil & Herb', priceDeltaMinor: 2000, formattedPriceDelta: '+₹20.00' },
        ],
      },
    ],
  },
  {
    id: 'item_tandoori_roti',
    name: 'Tandoori Roti (Whole Wheat)',
    description: 'Crisp whole-wheat hearth bread baked in clay tandoor. Pure, uncustomized speed staple.',
    basePriceMinor: 3500,
    formattedPrice: '₹35.00',
    category: 'Breads',
    station: 'TANDOOR',
    prepDurationMinutes: 4,
    allergens: ['WHEAT'],
    dietaryFlags: ['VEG'],
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=800&auto=format&fit=crop&q=80',
    modifierGroups: [],
  },
  {
    id: 'item_garlic_naan',
    name: 'Roasted Garlic Butter Naan',
    description: 'Topped with roasted minced garlic, fresh coriander, and nigella seeds.',
    basePriceMinor: 9000,
    formattedPrice: '₹90.00',
    category: 'Breads',
    station: 'TANDOOR',
    prepDurationMinutes: 6,
    allergens: ['DAIRY', 'WHEAT'],
    dietaryFlags: ['VEG'],
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80',
    modifierGroups: [
      {
        id: 'mod_garlic_style',
        name: 'Garlic Intensity',
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: 'm_garlic_roasted', name: 'Golden Roasted Garlic & Nigella (Standard)', priceDeltaMinor: 0, isDefault: true },
          { id: 'm_garlic_crisp', name: 'Extra Charred Garlic & Fresh Coriander', priceDeltaMinor: 1500, formattedPriceDelta: '+₹15.00' },
        ],
      },
    ],
  },
  {
    id: 'item_mango_lassi',
    name: 'Alphonso Mango Lassi',
    description: 'Chilled artisanal yogurt whipped with Ratnagiri Alphonso mango pulp.',
    basePriceMinor: 14000,
    formattedPrice: '₹140.00',
    category: 'Beverages',
    station: 'BAR',
    prepDurationMinutes: 3,
    allergens: ['DAIRY'],
    dietaryFlags: ['VEG'],
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=800&auto=format&fit=crop&q=80',
    modifierGroups: [
      {
        id: 'mod_lassi_sweetness',
        name: 'Sweetness & Base',
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: 'm_lassi_std', name: 'Artisan Raw Sugar (Standard)', priceDeltaMinor: 0, isDefault: true },
          { id: 'm_lassi_honey', name: 'Wild Blossom Honey (Low Glycemic)', priceDeltaMinor: 2000, formattedPriceDelta: '+₹20.00' },
        ],
      },
      {
        id: 'mod_lassi_toppings',
        name: 'Artisanal Garnishes',
        minSelections: 0,
        maxSelections: 2,
        options: [
          { id: 'm_saffron_pista', name: 'Kashmiri Saffron & Iranian Pistachio Slivers', priceDeltaMinor: 3000, formattedPriceDelta: '+₹30.00' },
          { id: 'm_basil_seed', name: 'Sweet Basil Seed Bloom (Sabja)', priceDeltaMinor: 1500, formattedPriceDelta: '+₹15.00' },
        ],
      },
    ],
  },
  {
    id: 'item_gulab_jamun',
    name: 'Warm Gulab Jamun with Rabri',
    description: 'Fried milk dumplings soaked in saffron-cardamom syrup with lachha rabri.',
    basePriceMinor: 19000,
    formattedPrice: '₹190.00',
    category: 'Desserts',
    station: 'DESSERT',
    prepDurationMinutes: 2,
    allergens: ['DAIRY', 'NUTS'],
    dietaryFlags: ['VEG'],
    isSignature: true,
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80',
    modifierGroups: [
      {
        id: 'mod_jamun_temp',
        name: 'Serving Temperature',
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: 'm_jamun_steaming', name: 'Steaming Hot with Chilled Rabri (Classic)', priceDeltaMinor: 0, isDefault: true },
          { id: 'm_jamun_warm_only', name: 'Warm Confection Only (No Rabri)', priceDeltaMinor: 0, isDefault: false },
        ],
      },
      {
        id: 'mod_jamun_luxury',
        name: 'Royal Accents',
        minSelections: 0,
        maxSelections: 1,
        options: [
          { id: 'm_silver_leaf', name: 'Edible Pure Silver Vark & Crushed Almonds', priceDeltaMinor: 3000, formattedPriceDelta: '+₹30.00' },
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Default Initial Kitchen Queue
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_TASKS: KitchenTask[] = [
  {
    id: 'task_101',
    orderId: 'ord_demo_1',
    tableNumber: 'T-14',
    branchId: 'branch_ldh',
    seatNumber: 'S1',
    guestName: 'Nikhil',
    itemName: 'Paneer Tikka Charcoal Grilled',
    quantity: 1,
    station: 'TANDOOR',
    status: 'QUEUED',
    fireAt: '19:48',
    targetServeAt: '20:00',
    elapsedMinutes: 4,
    slaMinutes: 12,
    modifiers: ['Medium Spice'],
    course: 'FIRST_COURSE',
  },
  {
    id: 'task_102',
    orderId: 'ord_demo_1',
    tableNumber: 'T-14',
    branchId: 'branch_ldh',
    seatNumber: 'S1',
    guestName: 'Nikhil',
    itemName: 'Dal Makhani Slow-Simmered (24 hrs)',
    quantity: 1,
    station: 'CURRY_LINE',
    status: 'IN_PROGRESS',
    fireAt: '19:46',
    targetServeAt: '20:00',
    elapsedMinutes: 6,
    slaMinutes: 14,
    modifiers: [],
    course: 'MAIN_COURSE',
  },
  {
    id: 'task_103',
    orderId: 'ord_demo_2',
    tableNumber: 'T-03',
    branchId: 'branch_ldh',
    seatNumber: 'S2',
    guestName: 'Jaspreet',
    itemName: 'Alphonso Mango Lassi',
    quantity: 2,
    station: 'BAR',
    status: 'READY',
    fireAt: '19:35',
    targetServeAt: '19:40',
    elapsedMinutes: 8,
    slaMinutes: 5,
    modifiers: [],
    course: 'DRINKS',
  },
  {
    id: 'task_104',
    orderId: 'ord_demo_3',
    tableNumber: 'T-07',
    branchId: 'branch_ldh',
    seatNumber: 'S1',
    guestName: 'Priya',
    itemName: 'Murgh Makhani (Old Delhi Style)',
    quantity: 1,
    station: 'CURRY_LINE',
    status: 'QUEUED',
    fireAt: '19:50',
    targetServeAt: '20:05',
    elapsedMinutes: 2,
    slaMinutes: 15,
    modifiers: ['Extra Butter'],
    course: 'MAIN_COURSE',
  },
];

export * from './event-bus';

export function validateAndResolveContext(
  branches: BranchRecord[],
  floors: FloorRecord[],
  requestedBranchId?: string,
  requestedFloorId?: string,
  requestedServiceShift?: string
): RestaurantContext {
  const validBranch = branches.find((b) => b.id === requestedBranchId) || branches[0] || DEFAULT_BRANCHES[0];
  const branchFloors = floors.filter((f) => f.branchId === validBranch.id);
  const validFloor = branchFloors.find((f) => f.id === requestedFloorId) || branchFloors[0] || DEFAULT_FLOORS[0];

  const validShift =
    requestedServiceShift === 'Breakfast' ||
    requestedServiceShift === 'Lunch Rush' ||
    requestedServiceShift === 'Lunch Service' ||
    requestedServiceShift === 'Late Night' ||
    requestedServiceShift === 'Private Event'
      ? requestedServiceShift
      : 'Dinner Service';

  return {
    branchId: validBranch.id,
    branchName: validBranch.name,
    floorId: validFloor.id,
    floorName: validFloor.name,
    serviceId:
      validShift === 'Lunch Rush' || validShift === 'Lunch Service'
        ? 'LUNCH'
        : validShift === 'Late Night'
        ? 'LATE_NIGHT'
        : 'DINNER',
    serviceName: validShift,
    layoutId: validFloor.activeLayout,
    heatmapMode: 'STATUS',
    viewMode: 'LIVE',
    role: 'MANAGER',
  };
}

export * from './security';

// ─────────────────────────────────────────────────────────────────────────────
// 🎨 RESTAURANTOS 3.0: MULTI-TEMPLATE & WHITE-LABEL PLATFORM DOMAIN DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface TemplateSectionConfig {
  id: string;
  type: 'hero' | 'featured_dishes' | 'story' | 'menu_grid' | 'hours_contact' | 'testimonials' | 'cta_banner';
  title: string;
  subtitle?: string;
  content?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  visible: boolean;
  order: number;
  customProps?: Record<string, any>;
}

export interface TemplateComponentNode {
  id: string;
  type: string;
  name: string;
  layout:
    | 'flex-row'
    | 'flex-col'
    | 'grid-2'
    | 'grid-3'
    | 'grid-4'
    | 'split-asymmetric'
    | 'dense-stack'
    | 'editorial-timeline'
    | 'full-width'
    | 'overflow-row'
    | 'horizontal-spread';
  props?: Record<string, any>;
  children?: TemplateComponentNode[];
}

export interface TemplateCompositionSpec {
  pageArchitecture:
    | 'editorial-tasting-split'
    | 'scandinavian-spec-sheet'
    | 'tactile-stepper-cards'
    | 'cyber-izakaya-matrix'
    | 'rustic-trattoria-story'
    | 'kanji-menu-board'
    | 'split-asymmetric'
    | 'horizontal-ledger'
    | 'tactile-vitrine-grid'
    | 'dual-lane-market'
    | 'centered-editorial'
    | 'timber-plank-board'
    | 'marketplace-portal-feed'
    | 'express-split-ordering'
    | 'quick-commerce-shelf';
  heroArchitecture:
    | 'split-asymmetric'
    | 'minimal-harvest-header'
    | 'warm-carousel-showcase'
    | 'neon-banner-dual'
    | 'woodfired-hearth-story'
    | 'vertical-scroll-manifesto'
    | 'location-discovery-banner'
    | 'compact-speed-header'
    | 'dark-store-eta-banner';
  menuLayoutPattern:
    | 'course-progression-timeline'
    | 'two-column-harvest-sheet'
    | 'tactile-card-grid'
    | 'dual-stall-bump-lanes'
    | 'family-combo-story'
    | 'vertical-broth-checklist'
    | 'multi-stall-directory-grid'
    | 'frictionless-card-stack'
    | 'high-density-sku-grid';
  cardComposition:
    | 'editorial-sommelier'
    | 'mono-clean-spec'
    | 'tactile-stepper'
    | 'cyber-neon-bump'
    | 'trattoria-story-card'
    | 'shokunin-woodcut'
    | 'marketplace-restaurant-card'
    | 'speed-add-stepper-card'
    | 'grocery-sku-card';
  navigationPattern:
    | 'floating-dock'
    | 'monochrome-top-rail'
    | 'category-pill-bar'
    | 'neon-sticky-matrix'
    | 'story-anchor-strip'
    | 'vertical-zen-tabs'
    | 'cuisine-chip-rail'
    | 'left-rail-and-subcategories';
  cartPresentation:
    | 'sommelier-drawer'
    | 'minimal-bottom-bar'
    | 'tactile-floating-capsule'
    | 'neon-slide-sheet'
    | 'rustic-table-order-sheet'
    | 'zen-order-tray'
    | 'sticky-marketplace-drawer'
    | 'floating-capsule-drawer'
    | 'grocery-basket-sidebar';
  responsiveRules: {
    desktopColumns: number;
    tabletColumns: number;
    mobileColumns: number;
    layoutBehavior: string;
  };
  componentTree: TemplateComponentNode[];
}

export type ExperienceType =
  | 'restaurant_storefront'
  | 'food_marketplace'
  | 'food_ordering'
  | 'quick_commerce';

export type DeploymentScope =
  | 'single_restaurant'
  | 'restaurant_group'
  | 'multi_merchant_marketplace'
  | 'quick_commerce_dark_store';

export interface ExperienceCapabilityModel {
  experienceType: ExperienceType;
  compatibleScope: DeploymentScope;
  requiresTableContext: boolean;
  catalogType: 'restaurant_menu' | 'multi_restaurant_menus' | 'grocery_catalog';
  supportsMultiMerchant: boolean;
  supportsInventoryQuantities: boolean;
  supportsSubstitutionWorkflow: boolean;
  supportsDeliveryPincodeCheck: boolean;
}

export interface RestaurantPartner {
  id: string;
  name: string;
  tagline: string;
  cuisine: string[];
  rating: number;
  reviewCount: number;
  deliveryTimeMin: number;
  deliveryTimeMax: number;
  priceForTwoMinor: number;
  featuredOffer?: string;
  heroImage: string;
  city: string;
  isPureVeg?: boolean;
  menuItemIds: string[];
}

export interface GrocerySkuItem {
  id: string;
  name: string;
  brand: string;
  category:
    | 'Fresh Vegetables'
    | 'Fresh Fruits'
    | 'Dairy, Bread & Eggs'
    | 'Pantry Staples'
    | 'Cold Drinks & Juices'
    | 'Instant Food & Snacks'
    | 'Personal Care';
  packSize: string;
  mrpMinor: number;
  sellingPriceMinor: number;
  unitPriceDescription: string;
  stockQuantity: number;
  imageUrl: string;
  isOrganic?: boolean;
  badge?: string;
}

export type SubstitutionPolicy =
  | 'ASK_BEFORE_SUBSTITUTE'
  | 'ALLOW_STORE_REPLACEMENT'
  | 'DO_NOT_SUBSTITUTE';

export interface GroceryOrderItem {
  skuId: string;
  name: string;
  brand: string;
  packSize: string;
  quantity: number;
  unitPriceMinor: number;
  subtotalMinor: number;
}

export interface MarketplaceTemplate {
  id: string;
  slug: string;
  name: string;
  category:
    | 'Modern Minimal'
    | 'Cafe & Artisan Coffee'
    | 'Haute Gastronomy'
    | 'Neon Street Food'
    | 'Trattoria & Italian'
    | 'Asian & Ramen'
    | 'Bakery & Dessert'
    | 'Fast Casual'
    | 'Editorial Dining'
    | 'Food Discovery Marketplace'
    | 'Speed-First Food Ordering'
    | 'Grocery & Quick Commerce';
  experienceType?: ExperienceType;
  capabilities?: ExperienceCapabilityModel;
  targetBusinessModel?: string;
  supportedScopes?: DeploymentScope[];
  description: string;
  tagline: string;
  version: string;
  author: string;
  tierRequired: 'starter' | 'growth' | 'pro' | 'enterprise';
  priceLabel: string;
  accentColor: string;
  fontHeading: string;
  fontBody: string;
  previewThumbnail: string;
  previewHero: string;
  supportedComponents: string[];
  composition: TemplateCompositionSpec;
  defaultTokens: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    surfaceColor: string;
    textColor: string;
    mutedColor: string;
    fontFamilyHeading: string;
    fontFamilyBody: string;
    borderRadius: string;
    cardStyle:
      | 'flat'
      | 'bordered'
      | 'glass'
      | 'elevated'
      | 'tactile'
      | 'asymmetric-editorial'
      | 'horizontal-ledger'
      | 'tactile-vitrine'
      | 'high-contrast-ticket'
      | 'framed-rustic'
      | 'cedar-slat';
    heroHeight: string;
  };
  defaultSections: TemplateSectionConfig[];
}

export interface TenantBrandConfig {
  restaurantName: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
  appIconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  surfaceColor: string;
  textColor: string;
  fontFamilyHeading: string;
  fontFamilyBody: string;
  activeTemplateId: string;
  subdomain: string;
  customDomain?: string;
  domainStatus: 'UNCONFIGURED' | 'PENDING_DNS' | 'VERIFIED' | 'ACTIVE' | 'FAILED';
  sslStatus: 'NOT_PROVISIONED' | 'PROVISIONING' | 'ACTIVE';
  customCss?: string;
  phone?: string;
  socialLinks: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
    mapsUrl?: string;
  };
  seo: {
    title: string;
    description: string;
    ogImage: string;
  };
  locale: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  branchOverrides: Record<string, Partial<TenantBrandConfig>>;
  updatedAt: string;
}

export interface TemplateDraftAndPublication {
  templateId: string;
  version: number;
  draftSections: TemplateSectionConfig[];
  draftTokens: Record<string, any>;
  publishedSections: TemplateSectionConfig[];
  publishedTokens: Record<string, any>;
  lastSavedAt: string;
  lastPublishedAt?: string;
  revisions: {
    revisionId: string;
    version: number;
    publishedAt: string;
    publishedBy: string;
    sections: TemplateSectionConfig[];
    tokens: Record<string, any>;
    summary: string;
  }[];
}

export interface SupportTicketMessage {
  id: string;
  sender: 'RESTAURANT_STAFF' | 'ORBITOX_SUPPORT' | 'SYSTEM_ESCALATION';
  authorName: string;
  text: string;
  timestamp: string;
  attachments?: string[];
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  branchId: string;
  branchName: string;
  staffId: string;
  staffName: string;
  category:
    | 'BILLING'
    | 'HARDWARE_KDS'
    | 'TABLE_LAYOUT'
    | 'PAYMENTS'
    | 'MENU_SYNC'
    | 'DOMAIN_SETUP'
    | 'URGENT_INCIDENT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  subject: string;
  description: string;
  status: 'OPEN' | 'INVESTIGATING' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  messages: SupportTicketMessage[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 🌟 CANONICAL 6 AUTHENTIC MARKETPLACE TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_TEMPLATES: MarketplaceTemplate[] = [
  {
    id: 'tmpl_haute_gastronomy',
    slug: 'haute-gastronomy',
    name: 'Atelier Étoile Noir',
    category: 'Haute Gastronomy',
    description: '50/50 Asymmetric editorial tasting progression with sommelier cellar folio and poetic course narratives.',
    tagline: '50/50 Asymmetric Editorial Tasting Progression & Sommelier Cellar Folio',
    version: '4.1.0',
    author: 'OrbitoX Atelier Studio',
    tierRequired: 'pro',
    priceLabel: 'Included in Pro',
    accentColor: '#C5A059',
    fontHeading: '"Cormorant Garamond", Georgia, serif',
    fontBody: '"Inter", -apple-system, sans-serif',
    previewThumbnail: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
    previewHero: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1600&auto=format&fit=crop&q=85',
    supportedComponents: ['split_editorial_canvas', 'tasting_timeline', 'circular_plate_modules', 'sommelier_cellar_folio', 'chef_manifesto'],
    composition: {
      pageArchitecture: 'split-asymmetric',
      heroArchitecture: 'split-asymmetric',
      menuLayoutPattern: 'course-progression-timeline',
      cardComposition: 'editorial-sommelier',
      navigationPattern: 'story-anchor-strip',
      cartPresentation: 'sommelier-drawer',
      responsiveRules: {
        desktopColumns: 2,
        tabletColumns: 1,
        mobileColumns: 1,
        layoutBehavior: 'asymmetric-split-with-course-timeline',
      },
      componentTree: [
        {
          id: 'haute-hero',
          type: 'HeroSplitAsymmetric',
          name: '50/50 Asymmetric Visual Canvas',
          layout: 'split-asymmetric',
          props: { showManifesto: true, elevation: 'inset' },
        },
        {
          id: 'haute-story',
          type: 'ChefManifestoSection',
          name: 'Sal Wood Coals Philosophy',
          layout: 'editorial-timeline',
          props: { quoteAuthor: 'Executive Chef', quoteRole: 'Curator' },
        },
        {
          id: 'haute-tasting',
          type: 'TastingCourseTimeline',
          name: 'Chronological Movement Progression',
          layout: 'editorial-timeline',
          props: { courses: ['Movement I: Amuse & Starters', 'Movement II: Charcoal Hearth', 'Movement III: Royal Mains', 'Movement IV: Grand Finale'] },
          children: [
            { id: 'haute-course-1', type: 'CourseGroup', name: 'Movement I: Amuse & Starters', layout: 'dense-stack', props: { winePairing: '2021 Blanc de Blancs Brut Nature' } },
            { id: 'haute-course-2', type: 'CourseGroup', name: 'Movement II: Wood-Fired Hearth', layout: 'dense-stack', props: { winePairing: '2019 Sula Dindori Reserve Viognier' } },
            { id: 'haute-course-3', type: 'CourseGroup', name: 'Movement III: Royal Curries', layout: 'dense-stack', props: { winePairing: '2018 Domaine Barolo Riserva' } },
            { id: 'haute-course-4', type: 'CourseGroup', name: 'Movement IV: Desserts & Elixirs', layout: 'dense-stack', props: { winePairing: 'Tawny Port 20-Year Aged' } },
          ],
        },
        {
          id: 'haute-cellar',
          type: 'SommelierPairingDrawer',
          name: 'Sommelier Cellar Folio',
          layout: 'flex-col',
          props: { defaultExpanded: false },
        },
      ],
    },
    defaultTokens: {
      primaryColor: '#C5A059',
      secondaryColor: '#C86B3C',
      backgroundColor: '#080A0D',
      surfaceColor: '#12161E',
      textColor: '#F5F0E6',
      mutedColor: '#8C857B',
      fontFamilyHeading: '"Cormorant Garamond", Georgia, serif',
      fontFamilyBody: '"Inter", sans-serif',
      borderRadius: '8px',
      cardStyle: 'asymmetric-editorial',
      heroHeight: '100vh',
    },
    defaultSections: [
      {
        id: 'sec_hero_noir',
        type: 'hero',
        title: 'Culinary Narrative & Charcoal Embers',
        subtitle: '50/50 Asymmetric editorial tasting progression with sommelier cellar folio.',
        imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80',
        ctaText: 'Experience Tasting Movements',
        ctaLink: '#menu',
        visible: true,
        order: 1,
      },
      {
        id: 'sec_featured_noir',
        type: 'featured_dishes',
        title: 'Chef Curated Tasting Movements',
        subtitle: 'Chronological progression across smoke, brass, and generational spice formulation.',
        visible: true,
        order: 2,
      },
      {
        id: 'sec_story_noir',
        type: 'story',
        title: 'The Sal Wood Coals Philosophy',
        subtitle: '24-hour slow simmer undisturbed over sal wood coals.',
        content: 'Founded on ancestral tandoor techniques, OrbitoX Bistro bridges centuries-old royal culinary recipes with contemporary operational mastery.',
        imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&auto=format&fit=crop&q=80',
        visible: true,
        order: 3,
      },
      {
        id: 'sec_hours_noir',
        type: 'hours_contact',
        title: 'Cellar & Evening Seating',
        subtitle: 'Dinner service 19:00 - 23:30. Sommelier pairings prepared table-side.',
        visible: true,
        order: 4,
      },
    ],
  },
  {
    id: 'tmpl_nordic_minimal',
    slug: 'nordic-minimal',
    name: 'Fjord & Form Botanical',
    category: 'Modern Minimal',
    description: 'Scandinavian architectural botanical specimen ledger. High negative space, zero traditional card boxes, precision hairline lot rows with inline unrolling spec sheets.',
    tagline: 'Scandinavian Architectural Botanical Ledger & Farm-to-Table Spec Sheet',
    version: '4.1.0',
    author: 'Copenhagen Botanical Atelier',
    tierRequired: 'starter',
    priceLabel: 'Free',
    accentColor: '#2D5A43',
    fontHeading: '"Inter", -apple-system, sans-serif',
    fontBody: '"Inter", -apple-system, sans-serif',
    previewThumbnail: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80',
    previewHero: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&auto=format&fit=crop&q=85',
    supportedComponents: ['botanical_ledger', 'hairline_lot_rows', 'inline_unrolling_specs', 'minimal_receipt_dock'],
    composition: {
      pageArchitecture: 'horizontal-ledger',
      heroArchitecture: 'minimal-harvest-header',
      menuLayoutPattern: 'two-column-harvest-sheet',
      cardComposition: 'mono-clean-spec',
      navigationPattern: 'monochrome-top-rail',
      cartPresentation: 'minimal-bottom-bar',
      responsiveRules: {
        desktopColumns: 2,
        tabletColumns: 2,
        mobileColumns: 1,
        layoutBehavior: 'two-column-tabular-spec-sheet',
      },
      componentTree: [
        {
          id: 'nord-header',
          type: 'HarvestSeasonalHeader',
          name: 'Botanical Origin Header',
          layout: 'flex-row',
          props: { showForagedDate: true, daylightIndicator: true },
        },
        {
          id: 'nord-sheet',
          type: 'TabularSpecSheet',
          name: 'Hairline Botanical Specimen Rows',
          layout: 'grid-2',
          props: { showEstateOrigin: true, showDietaryBadges: true },
          children: [
            { id: 'nord-col-botanicals', type: 'BotanicalCategory', name: '01 / Foraged Harvest Botanicals', layout: 'dense-stack' },
            { id: 'nord-col-bakery', type: 'BakeryCategory', name: '02 / Sourdough & Hearth Provisions', layout: 'dense-stack' },
          ],
        },
        {
          id: 'nord-footer',
          type: 'MinimalServiceBar',
          name: 'Monochrome Receipt Status Dock',
          layout: 'flex-row',
          props: { quietTypography: true },
        },
      ],
    },
    defaultTokens: {
      primaryColor: '#121314',
      secondaryColor: '#2D5A43',
      backgroundColor: '#F7F5F0',
      surfaceColor: '#FFFFFF',
      textColor: '#121314',
      mutedColor: '#64748B',
      fontFamilyHeading: '"Inter", sans-serif',
      fontFamilyBody: '"Inter", sans-serif',
      borderRadius: '4px',
      cardStyle: 'horizontal-ledger',
      heroHeight: '320px',
    },
    defaultSections: [
      {
        id: 'sec_hero_minimal',
        type: 'hero',
        title: 'Pure Form. Honest Botanicals.',
        subtitle: 'Scandinavian architectural simplicity with hairline provenance specimen ledger.',
        imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
        ctaText: 'View Today’s Harvest',
        ctaLink: '#menu',
        visible: true,
        order: 1,
      },
      {
        id: 'sec_featured_minimal',
        type: 'featured_dishes',
        title: 'Current Botanical Harvest Ledger',
        subtitle: 'Foraged daily by estate cultivators and hearth specialists.',
        visible: true,
        order: 2,
      },
      {
        id: 'sec_hours_minimal',
        type: 'hours_contact',
        title: 'Harvest Times & Origin Coordinates',
        subtitle: 'Origin 30°54\'N 75°51\'E · Lunch 12:00 - 15:00 · Dinner 18:30 - 22:30',
        visible: true,
        order: 3,
      },
    ],
  },
  {
    id: 'tmpl_artisan_coffee',
    slug: 'artisan-coffee',
    name: 'Roastery 1984 Vitrine',
    category: 'Cafe & Artisan Coffee',
    description: 'Specialty roastery vitrine counter with aroma tasting dials, generous product photography, and tactile [- 1 +] quantity steppers mounted directly on card faces.',
    tagline: 'Tactile Counter Ordering with Direct Card-Mounted [- 1 +] Steppers',
    version: '4.1.0',
    author: 'Roastworks Collective',
    tierRequired: 'growth',
    priceLabel: 'Included in Growth',
    accentColor: '#C86B3C',
    fontHeading: '"Space Grotesk", sans-serif',
    fontBody: '"Outfit", sans-serif',
    previewThumbnail: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&auto=format&fit=crop&q=80',
    previewHero: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1600&auto=format&fit=crop&q=85',
    supportedComponents: ['roastery_vitrine_carousel', 'aroma_spectrum_dials', 'card_face_stepper', 'tactile_capsule_pill'],
    composition: {
      pageArchitecture: 'tactile-vitrine-grid',
      heroArchitecture: 'warm-carousel-showcase',
      menuLayoutPattern: 'tactile-card-grid',
      cardComposition: 'tactile-stepper',
      navigationPattern: 'category-pill-bar',
      cartPresentation: 'tactile-floating-capsule',
      responsiveRules: {
        desktopColumns: 3,
        tabletColumns: 2,
        mobileColumns: 1,
        layoutBehavior: 'tactile-cards-with-direct-steppers',
      },
      componentTree: [
        {
          id: 'cafe-hero',
          type: 'RoasterVitrineHero',
          name: 'Micro-Lot Roastery Showcase',
          layout: 'flex-row',
          props: { showRoastProfile: true, origin: 'Ratnagiri Estate Micro-Lot' },
        },
        {
          id: 'cafe-notes',
          type: 'AromaSpectrumBar',
          name: 'Cupping Notes Spectrum',
          layout: 'flex-row',
          props: { notes: ['Jasmine Florals', 'Wild Bergamot', 'Raw Honey', 'Toasted Hazelnut'] },
        },
        {
          id: 'cafe-grid',
          type: 'TactileProductGrid',
          name: 'Tactile Vitrine Grid with Mounted [- 1 +] Steppers',
          layout: 'grid-3',
          props: { directStepper: true, customizableMilk: true, customizableShots: true },
          children: [
            { id: 'cafe-card-espresso', type: 'TactileFoodCard', name: 'Espresso Bar Card', layout: 'flex-col' },
            { id: 'cafe-card-brew', type: 'TactileFoodCard', name: 'Slow Manual Brews', layout: 'flex-col' },
            { id: 'cafe-card-bakery', type: 'TactileFoodCard', name: 'Laminated Pastries', layout: 'flex-col' },
          ],
        },
      ],
    },
    defaultTokens: {
      primaryColor: '#C86B3C',
      secondaryColor: '#8C532B',
      backgroundColor: '#FDFBF7',
      surfaceColor: '#FFFFFF',
      textColor: '#241D17',
      mutedColor: '#786C60',
      fontFamilyHeading: '"Space Grotesk", sans-serif',
      fontFamilyBody: '"Outfit", sans-serif',
      borderRadius: '16px',
      cardStyle: 'tactile-vitrine',
      heroHeight: '420px',
    },
    defaultSections: [
      {
        id: 'sec_hero_cafe',
        type: 'hero',
        title: 'Micro-Lot Roastery & Slow Vitrine Counter',
        subtitle: 'Roasted in-house daily. Paired with laminated sourdough pastries and tactile card steppers.',
        imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200&auto=format&fit=crop&q=80',
        ctaText: 'Browse Morning Brews',
        ctaLink: '#menu',
        visible: true,
        order: 1,
      },
      {
        id: 'sec_featured_cafe',
        type: 'featured_dishes',
        title: 'Fresh From the Hearth & Barista Bar',
        subtitle: 'Small-batch creations made before dawn with mounted [- 1 +] quantity controls.',
        visible: true,
        order: 2,
      },
      {
        id: 'sec_hours_cafe',
        type: 'hours_contact',
        title: 'Roastery Extraction Hours',
        subtitle: 'Daily 07:00 - 20:00 · Wifi & specialty coffee flights available',
        visible: true,
        order: 3,
      },
    ],
  },
  {
    id: 'tmpl_neon_street',
    slug: 'neon-street',
    name: 'Neon Yokocho Night Alley',
    category: 'Neon Street Food',
    description: 'High-energy Tokyo night market alley. Parallel dual-stall market lanes (Skewers vs Wok & Bao), live night market heat BPM ticker, flame meters, and instant + BUMP triggers.',
    tagline: 'High-BPM Parallel Dual-Stall Market Lanes & Rapid-Tap BUMP Triggers',
    version: '4.1.0',
    author: 'Shibuya Underground Labs',
    tierRequired: 'pro',
    priceLabel: 'Included in Pro',
    accentColor: '#00F2FE',
    fontHeading: '"Syne", "Cabinet Grotesk", sans-serif',
    fontBody: '"Space Grotesk", sans-serif',
    previewThumbnail: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
    previewHero: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1600&auto=format&fit=crop&q=85',
    supportedComponents: ['bpm_heat_ticker', 'dual_stall_matrix', 'flame_spice_meters', 'rapid_bump_triggers', 'street_order_bag'],
    composition: {
      pageArchitecture: 'dual-lane-market',
      heroArchitecture: 'neon-banner-dual',
      menuLayoutPattern: 'dual-stall-bump-lanes',
      cardComposition: 'cyber-neon-bump',
      navigationPattern: 'neon-sticky-matrix',
      cartPresentation: 'neon-slide-sheet',
      responsiveRules: {
        desktopColumns: 2,
        tabletColumns: 2,
        mobileColumns: 1,
        layoutBehavior: 'dense-dual-stall-bump-matrix',
      },
      componentTree: [
        {
          id: 'neon-banner',
          type: 'CyberStreetBanner',
          name: 'Night Market Marquee & 128 BPM Ticker',
          layout: 'flex-row',
          props: { strobeAccents: true, bpmTicker: 128 },
        },
        {
          id: 'neon-matrix',
          type: 'DualStallMatrix',
          name: 'Dual Stall Matrix (Skewers vs Smashed Bao)',
          layout: 'grid-2',
          props: { rapidAddBump: true, spiceLevelIndicator: true },
          children: [
            { id: 'stall-yakitori', type: 'StreetStallLane', name: 'Stall 01: Bincho-tan Charcoal Skewers', layout: 'dense-stack' },
            { id: 'stall-bao', type: 'StreetStallLane', name: 'Stall 02: Wok Fire & Smashed Bao', layout: 'dense-stack' },
          ],
        },
        {
          id: 'neon-dj',
          type: 'LateNightSessionBanner',
          name: 'Live DJ Resident Schedule & Late Pour Bar',
          layout: 'flex-col',
          props: { barOpenUntil: '02:00 AM' },
        },
      ],
    },
    defaultTokens: {
      primaryColor: '#00F2FE',
      secondaryColor: '#FE0979',
      backgroundColor: '#07090E',
      surfaceColor: '#0F131D',
      textColor: '#FFFFFF',
      mutedColor: '#7E8B9B',
      fontFamilyHeading: '"Syne", sans-serif',
      fontFamilyBody: '"Space Grotesk", sans-serif',
      borderRadius: '10px',
      cardStyle: 'high-contrast-ticket',
      heroHeight: '360px',
    },
    defaultSections: [
      {
        id: 'sec_hero_neon',
        type: 'hero',
        title: 'Tokyo Night Market // 東京夜市',
        subtitle: 'Crispy charcoal yakitori, smashed bao burgers, and late-night izakaya bites served at 128 BPM.',
        imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80',
        ctaText: 'Order Street Bites',
        ctaLink: '#menu',
        visible: true,
        order: 1,
      },
      {
        id: 'sec_featured_neon',
        type: 'featured_dishes',
        title: 'Dual Stall Rush Menu (Skewers & Bao)',
        subtitle: 'Direct from the open fire pit to your table with instant + BUMP triggers.',
        visible: true,
        order: 2,
      },
      {
        id: 'sec_hours_neon',
        type: 'hours_contact',
        title: 'Late Night Nightclub Shift',
        subtitle: 'Open till 02:00 AM Thursday to Sunday with resident DJ set',
        visible: true,
        order: 3,
      },
    ],
  },
  {
    id: 'tmpl_trattoria_bella',
    slug: 'trattoria-bella',
    name: 'Osteria Rustica Convivial',
    category: 'Trattoria & Italian',
    description: 'Convivial Tuscan family feasting. Centered editorial column, classic Italian course progression, Tavola Grande family sharing combo builder (-15% bundle savings), and DOP seals.',
    tagline: 'Centered Tuscan Hearth Narrative & Tavola Grande Family Feasting Combos',
    version: '4.1.0',
    author: 'Firenze Heritage Guild',
    tierRequired: 'growth',
    priceLabel: 'Included in Growth',
    accentColor: '#8C3820',
    fontHeading: '"Playfair Display", Georgia, serif',
    fontBody: '"Alegreya", serif',
    previewThumbnail: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
    previewHero: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1600&auto=format&fit=crop&q=85',
    supportedComponents: ['woodfired_hearth_story', 'tavola_grande_combo_builder', 'framed_dop_cards', 'leather_folio_presenter'],
    composition: {
      pageArchitecture: 'centered-editorial',
      heroArchitecture: 'woodfired-hearth-story',
      menuLayoutPattern: 'family-combo-story',
      cardComposition: 'trattoria-story-card',
      navigationPattern: 'floating-dock',
      cartPresentation: 'rustic-table-order-sheet',
      responsiveRules: {
        desktopColumns: 2,
        tabletColumns: 1,
        mobileColumns: 1,
        layoutBehavior: 'story-first-family-sharing-builder',
      },
      componentTree: [
        {
          id: 'trattoria-story',
          type: 'HearthStorytellingSection',
          name: '72-Hour Fermented Dough & Volcanic Oven',
          layout: 'split-asymmetric',
          props: { ovenTempCelsius: 480, flourType: 'Caputo 00' },
        },
        {
          id: 'trattoria-feast',
          type: 'FamilyFeastBuilder',
          name: 'Tavola Grande: Family Sharing Feast Combo (-15%)',
          layout: 'flex-col',
          props: { discountPercent: 15 },
        },
        {
          id: 'trattoria-menu',
          type: 'RusticDishListing',
          name: 'Pizzeria & Pasta Fresca Showcase',
          layout: 'grid-2',
          children: [
            { id: 'trattoria-pizza', type: 'PizzaCategoryWithCrustSelector', name: 'Le Pizze al Forno', layout: 'dense-stack' },
            { id: 'trattoria-pasta', type: 'PastaCategoryWithShapeSelector', name: 'La Pasta Fatta a Mano', layout: 'dense-stack' },
          ],
        },
      ],
    },
    defaultTokens: {
      primaryColor: '#8C3820',
      secondaryColor: '#3D4A39',
      backgroundColor: '#FBF8F2',
      surfaceColor: '#FFFFFF',
      textColor: '#241D17',
      mutedColor: '#7C6F62',
      fontFamilyHeading: '"Playfair Display", Georgia, serif',
      fontFamilyBody: '"Alegreya", Georgia, serif',
      borderRadius: '12px',
      cardStyle: 'framed-rustic',
      heroHeight: '460px',
    },
    defaultSections: [
      {
        id: 'sec_hero_trattoria',
        type: 'hero',
        title: 'Forno a Legna & Pasta Fresca dal 1974',
        subtitle: 'Fermented 72-hour dough baked at 480°C in volcanic stone ovens with San Marzano tomatoes.',
        imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&auto=format&fit=crop&q=80',
        ctaText: 'Explore Pizzas & Pastas',
        ctaLink: '#menu',
        visible: true,
        order: 1,
      },
      {
        id: 'sec_featured_trattoria',
        type: 'featured_dishes',
        title: 'Tavola Grande & Specialità della Casa',
        subtitle: 'Imported burrata, guanciale di Amatrice, and family sharing bundles.',
        visible: true,
        order: 2,
      },
      {
        id: 'sec_hours_trattoria',
        type: 'hours_contact',
        title: 'Orari del Pranzo e della Cena',
        subtitle: 'Pranzo 12:30 - 15:30 · Cena 19:00 - 23:30 con servizio al tavolo',
        visible: true,
        order: 3,
      },
    ],
  },
  {
    id: 'tmpl_tokyo_izakaya',
    slug: 'tokyo-izakaya',
    name: 'Shokunin Ramen & Robata',
    category: 'Asian & Ramen',
    description: 'Disciplined Japanese craftsmanship (*Shokunin*). Vertical timber plank navigation rail with kanji crest, 4-step ramen customizer (Broth, Noodle, Tare, Toppings), and 18h dashi timer badges.',
    tagline: 'Hinoki Timber Plank Rhythm & Step-by-Step Ramen Customizer Flow',
    version: '4.1.0',
    author: 'Ginza Craft Collective',
    tierRequired: 'pro',
    priceLabel: 'Included in Pro',
    accentColor: '#D3381C',
    fontHeading: '"Noto Serif JP", serif',
    fontBody: '"DM Sans", sans-serif',
    previewThumbnail: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80',
    previewHero: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=1600&auto=format&fit=crop&q=85',
    supportedComponents: ['vertical_timber_rail', 'kanji_crest_banner', 'ramen_step_customizer', 'cedar_slat_cards', 'bento_tray_check'],
    composition: {
      pageArchitecture: 'timber-plank-board',
      heroArchitecture: 'vertical-scroll-manifesto',
      menuLayoutPattern: 'vertical-broth-checklist',
      cardComposition: 'shokunin-woodcut',
      navigationPattern: 'vertical-zen-tabs',
      cartPresentation: 'zen-order-tray',
      responsiveRules: {
        desktopColumns: 3,
        tabletColumns: 2,
        mobileColumns: 1,
        layoutBehavior: 'vertical-kanji-rhythm-with-broth-builder',
      },
      componentTree: [
        {
          id: 'shokunin-manifesto',
          type: 'ShokuninRamenManifesto',
          name: '18-Hour Tonkotsu & Kansui Noodle Philosophy',
          layout: 'flex-col',
          props: { brothSimmerHours: 18, noodleHydrationPercent: 32 },
        },
        {
          id: 'ramen-checklist-sheet',
          type: 'CustomBowlChecklist',
          name: 'Craft Your Ramen Bowl (Broth, Noodle, Tare, Toppings)',
          layout: 'flex-col',
          props: {
            brothOptions: ['Kotteri (Rich/Full Oil)', 'Assari (Light Dashi)'],
            noodleOptions: ['Katame (Firm)', 'Futsuu (Standard)', 'Yawarakame (Soft)'],
          },
        },
        {
          id: 'ramen-board',
          type: 'WoodenBoardMenuGrid',
          name: 'Cedar Menu Board (Signature Bowls & Robata Grill)',
          layout: 'grid-3',
          children: [
            { id: 'board-ramen', type: 'RamenItemTile', name: 'Tonkotsu, Miso & Shoyu Bowls', layout: 'dense-stack' },
            { id: 'board-robata', type: 'RobataTile', name: 'Bincho-tan Charcoal Skewers', layout: 'dense-stack' },
            { id: 'board-sake', type: 'SakeFlightTile', name: 'Junmai Daiginjo Flights', layout: 'dense-stack' },
          ],
        },
      ],
    },
    defaultTokens: {
      primaryColor: '#D3381C',
      secondaryColor: '#10B981',
      backgroundColor: '#1E1915',
      surfaceColor: '#26201B',
      textColor: '#F7F4EB',
      mutedColor: '#9E9285',
      fontFamilyHeading: '"Noto Serif JP", serif',
      fontFamilyBody: '"DM Sans", sans-serif',
      borderRadius: '6px',
      cardStyle: 'cedar-slat',
      heroHeight: '400px',
    },
    defaultSections: [
      {
        id: 'sec_hero_ramen',
        type: 'hero',
        title: '職人魂 · 極上出汁 (18-Hour Simmered Dashi)',
        subtitle: 'Simmered overnight with umami dashi, springy alkaline noodles, and flame-torched chashu.',
        imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=1200&auto=format&fit=crop&q=80',
        ctaText: 'Customize Your Bowl',
        ctaLink: '#menu',
        visible: true,
        order: 1,
      },
      {
        id: 'sec_featured_ramen',
        type: 'featured_dishes',
        title: 'Signature Bowls & Bincho-tan Robata Grill',
        subtitle: 'Crafted with precision by seasoned ramen shokunin with step-by-step customizer.',
        visible: true,
        order: 2,
      },
      {
        id: 'sec_hours_ramen',
        type: 'hours_contact',
        title: 'Izakaya Hours & Table Bell Service',
        subtitle: 'Open daily 11:30 - 23:00 without afternoon closure',
        visible: true,
        order: 3,
      },
    ],
  },
  {
    id: 'tmpl_crave_atlas',
    slug: 'crave-atlas',
    name: 'CraveAtlas Discovery Marketplace',
    category: 'Food Discovery Marketplace',
    experienceType: 'food_marketplace',
    targetBusinessModel: 'Multi-Restaurant Marketplace / Food Discovery',
    supportedScopes: ['multi_merchant_marketplace', 'restaurant_group'],
    capabilities: {
      experienceType: 'food_marketplace',
      compatibleScope: 'multi_merchant_marketplace',
      requiresTableContext: false,
      catalogType: 'multi_restaurant_menus',
      supportsMultiMerchant: true,
      supportsInventoryQuantities: false,
      supportsSubstitutionWorkflow: false,
      supportsDeliveryPincodeCheck: true,
    },
    description: 'Discovery-first multi-restaurant food marketplace with location selection, cross-entity search, cuisine carousels, and single-restaurant cart rules.',
    tagline: 'Discovery-First Multi-Restaurant Food Marketplace · Powered by OrbitoX',
    version: '5.1.0',
    author: 'OrbitoX Consumer Commerce Team',
    tierRequired: 'pro',
    priceLabel: 'Included in Pro',
    accentColor: '#E23744',
    fontHeading: '"Plus Jakarta Sans", -apple-system, sans-serif',
    fontBody: '"Inter", -apple-system, sans-serif',
    previewThumbnail: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80',
    previewHero: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&auto=format&fit=crop&q=85',
    supportedComponents: ['location_selector_bar', 'global_search_bar', 'cuisine_carousel', 'curated_collections_grid', 'restaurant_directory_card', 'single_restaurant_cart_guard'],
    composition: {
      pageArchitecture: 'marketplace-portal-feed',
      heroArchitecture: 'location-discovery-banner',
      menuLayoutPattern: 'multi-stall-directory-grid',
      cardComposition: 'marketplace-restaurant-card',
      navigationPattern: 'cuisine-chip-rail',
      cartPresentation: 'sticky-marketplace-drawer',
      responsiveRules: {
        desktopColumns: 3,
        tabletColumns: 2,
        mobileColumns: 1,
        layoutBehavior: 'discovery-first-grid-with-filter-rail',
      },
      componentTree: [
        { id: 'ca-loc-bar', type: 'LocationSelectorBar', name: 'Delivery Location Bar', layout: 'horizontal-spread' },
        { id: 'ca-search', type: 'GlobalMarketplaceSearch', name: 'Restaurants & Cuisines Search', layout: 'full-width' },
        { id: 'ca-cuisines', type: 'CuisinePillsCarousel', name: 'Top Cuisines Scroller', layout: 'overflow-row' },
        { id: 'ca-collections', type: 'CuratedCollectionsGrid', name: 'Trending & Top Rated Collections', layout: 'grid-4' },
        { id: 'ca-restaurants', type: 'RestaurantDirectoryGrid', name: 'Nearby Verified Partner Kitchens', layout: 'grid-3' },
      ],
    },
    defaultTokens: {
      primaryColor: '#E23744',
      secondaryColor: '#E5A118',
      backgroundColor: '#F8F9FA',
      surfaceColor: '#FFFFFF',
      textColor: '#1C1C27',
      mutedColor: '#6B7280',
      fontFamilyHeading: '"Plus Jakarta Sans", sans-serif',
      fontFamilyBody: '"Inter", sans-serif',
      borderRadius: '12px',
      cardStyle: 'bordered',
      heroHeight: '260px',
    },
    defaultSections: [
      {
        id: 'sec_ca_hero',
        type: 'hero',
        title: 'Discover the Finest Dining & Cravings Around You',
        subtitle: 'Explore curated chef tables, authentic dum biryanis, and artisanal kitchens.',
        imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop&q=80',
        visible: true,
        order: 1,
      },
    ],
  },
  {
    id: 'tmpl_swift_bite',
    slug: 'swift-bite',
    name: 'SwiftBite Express Food Ordering',
    category: 'Speed-First Food Ordering',
    experienceType: 'food_ordering',
    targetBusinessModel: 'Fast-Casual Food Delivery & Quick Ordering',
    supportedScopes: ['single_restaurant', 'restaurant_group'],
    capabilities: {
      experienceType: 'food_ordering',
      compatibleScope: 'single_restaurant',
      requiresTableContext: false,
      catalogType: 'restaurant_menu',
      supportsMultiMerchant: false,
      supportsInventoryQuantities: false,
      supportsSubstitutionWorkflow: false,
      supportsDeliveryPincodeCheck: true,
    },
    description: 'Speed-first consumer food ordering app with instant 1-tap fast add, targeted customization sheets only when required, repeat-order carousels, and idempotent checkout.',
    tagline: 'Speed-First Food Ordering App · Instant Cravings to Order',
    version: '5.1.0',
    author: 'OrbitoX Consumer Commerce Team',
    tierRequired: 'starter',
    priceLabel: 'Included in Starter',
    accentColor: '#FC8019',
    fontHeading: '"Plus Jakarta Sans", -apple-system, sans-serif',
    fontBody: '"Inter", -apple-system, sans-serif',
    previewThumbnail: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80',
    previewHero: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1600&auto=format&fit=crop&q=85',
    supportedComponents: ['speed_header_bar', 'cravings_search', 'instant_add_card', 'targeted_customizer_modal', 'reorder_carousel', 'idempotent_checkout_sheet'],
    composition: {
      pageArchitecture: 'express-split-ordering',
      heroArchitecture: 'compact-speed-header',
      menuLayoutPattern: 'frictionless-card-stack',
      cardComposition: 'speed-add-stepper-card',
      navigationPattern: 'category-pill-bar',
      cartPresentation: 'floating-capsule-drawer',
      responsiveRules: {
        desktopColumns: 2,
        tabletColumns: 2,
        mobileColumns: 1,
        layoutBehavior: 'split-feed-with-sticky-cart',
      },
      componentTree: [
        { id: 'sb-header', type: 'SpeedHeaderBar', name: 'Delivery ETA & Location Pill', layout: 'flex-row' },
        { id: 'sb-search', type: 'CravingsSearchBar', name: 'Instant Craving Search', layout: 'full-width' },
        { id: 'sb-chips', type: 'CategoryChipScroller', name: 'Fast Category Scroller', layout: 'overflow-row' },
        { id: 'sb-reorder', type: 'RepeatOrderCarousel', name: 'Recent Orders & Quick Picks', layout: 'overflow-row' },
        { id: 'sb-menu', type: 'HighVelocityMenuGrid', name: 'One-Tap Menu Feed', layout: 'grid-2' },
      ],
    },
    defaultTokens: {
      primaryColor: '#FC8019',
      secondaryColor: '#48C479',
      backgroundColor: '#F7F7F8',
      surfaceColor: '#FFFFFF',
      textColor: '#171A29',
      mutedColor: '#686B78',
      fontFamilyHeading: '"Plus Jakarta Sans", sans-serif',
      fontFamilyBody: '"Inter", sans-serif',
      borderRadius: '10px',
      cardStyle: 'flat',
      heroHeight: '140px',
    },
    defaultSections: [
      {
        id: 'sec_sb_hero',
        type: 'hero',
        title: 'Craving Delivered in 20 Mins',
        subtitle: 'Hot, fresh, and zero friction. One tap to add, zero wait.',
        imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&auto=format&fit=crop&q=80',
        visible: true,
        order: 1,
      },
    ],
  },
  {
    id: 'tmpl_pantry_rush',
    slug: 'pantry-rush',
    name: 'PantryRush Quick-Commerce Grocery',
    category: 'Grocery & Quick Commerce',
    experienceType: 'quick_commerce',
    targetBusinessModel: 'Dark-Store Quick Commerce / Grocery & Essentials',
    supportedScopes: ['quick_commerce_dark_store'],
    capabilities: {
      experienceType: 'quick_commerce',
      compatibleScope: 'quick_commerce_dark_store',
      requiresTableContext: false,
      catalogType: 'grocery_catalog',
      supportsMultiMerchant: false,
      supportsInventoryQuantities: true,
      supportsSubstitutionWorkflow: true,
      supportsDeliveryPincodeCheck: true,
    },
    description: 'Quick-commerce grocery application with real SKU pack sizes, live stock inventory counters, explicit substitution preferences, and dark-store fulfillment serviceability.',
    tagline: 'Quick-Commerce Grocery & Daily Essentials · 15-Minute Dark-Store Dispatch',
    version: '5.1.0',
    author: 'OrbitoX Consumer Commerce Team',
    tierRequired: 'growth',
    priceLabel: 'Included in Growth',
    accentColor: '#22C55E',
    fontHeading: '"Inter", -apple-system, sans-serif',
    fontBody: '"Inter", -apple-system, sans-serif',
    previewThumbnail: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80',
    previewHero: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1600&auto=format&fit=crop&q=85',
    supportedComponents: ['dark_store_serviceability_header', 'grocery_category_rail', 'sku_stepper_card', 'stock_limit_guard', 'substitution_preference_selector', 'quick_basket_drawer'],
    composition: {
      pageArchitecture: 'quick-commerce-shelf',
      heroArchitecture: 'dark-store-eta-banner',
      menuLayoutPattern: 'high-density-sku-grid',
      cardComposition: 'grocery-sku-card',
      navigationPattern: 'left-rail-and-subcategories',
      cartPresentation: 'grocery-basket-sidebar',
      responsiveRules: {
        desktopColumns: 4,
        tabletColumns: 3,
        mobileColumns: 2,
        layoutBehavior: 'dense-shelf-with-floating-basket',
      },
      componentTree: [
        { id: 'pr-eta', type: 'DarkStoreEtaHeader', name: 'Dark Store ETA & Pincode Pill', layout: 'flex-row' },
        { id: 'pr-search', type: 'GrocerySkuSearchBar', name: 'Search 2,000+ Groceries & Essentials', layout: 'full-width' },
        { id: 'pr-cats', type: 'GroceryCategoryPills', name: 'Pantry & Fresh Category Rail', layout: 'overflow-row' },
        { id: 'pr-shelf', type: 'HighDensitySkuGrid', name: 'SKU Inventory Shelf', layout: 'grid-4' },
      ],
    },
    defaultTokens: {
      primaryColor: '#22C55E',
      secondaryColor: '#0C2D1C',
      backgroundColor: '#F8FAF8',
      surfaceColor: '#FFFFFF',
      textColor: '#0F172A',
      mutedColor: '#64748B',
      fontFamilyHeading: '"Inter", sans-serif',
      fontFamilyBody: '"Inter", sans-serif',
      borderRadius: '8px',
      cardStyle: 'bordered',
      heroHeight: '120px',
    },
    defaultSections: [
      {
        id: 'sec_pr_hero',
        type: 'hero',
        title: 'Groceries Delivered in 15 Minutes',
        subtitle: 'Farm fresh produce, dairy, bakery, and daily staples from our hyper-local dark store.',
        imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&auto=format&fit=crop&q=80',
        visible: true,
        order: 1,
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 🏪 DEFAULT MULTI-RESTAURANT PARTNERS DIRECTORY (CRAVEATLAS)
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_RESTAURANT_PARTNERS: RestaurantPartner[] = [
  {
    id: 'rest_heritage_bistro',
    name: 'OrbitoX Heritage Charcoal & Dum',
    tagline: 'Slow-simmered 24hr dal, charcoal tandoor, and royal Mughlai recipes',
    cuisine: ['North Indian', 'Biryani', 'Mughlai', 'Tandoor'],
    rating: 4.8,
    reviewCount: 1420,
    deliveryTimeMin: 25,
    deliveryTimeMax: 35,
    priceForTwoMinor: 80000,
    featuredOffer: 'Flat ₹100 OFF on orders above ₹499',
    heroImage: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80',
    city: 'Ludhiana',
    isPureVeg: false,
    menuItemIds: ['item_dal_makhani', 'item_paneer_tikka', 'item_butter_chicken', 'item_butter_naan', 'item_garlic_naan', 'item_mango_lassi', 'item_gulab_jamun'],
  },
  {
    id: 'rest_tokyo_yokocho',
    name: 'Tokyo Yokocho Ramen & Robata',
    tagline: '18-hour tonkotsu dashi, alkaline noodles, and binchotan yakitori skewers',
    cuisine: ['Japanese', 'Ramen', 'Robata', 'Asian'],
    rating: 4.7,
    reviewCount: 980,
    deliveryTimeMin: 30,
    deliveryTimeMax: 40,
    priceForTwoMinor: 110000,
    featuredOffer: 'Complimentary Gyoza with any 2 Ramen Bowls',
    heroImage: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=80',
    city: 'Ludhiana',
    isPureVeg: false,
    menuItemIds: ['item_paneer_tikka', 'item_mango_lassi', 'item_garlic_naan'],
  },
  {
    id: 'rest_osteria_bella',
    name: 'Osteria Rustica Bella Trattoria',
    tagline: 'Handmade fresh pastas, wood-fired Neapolitan crusts, and Tuscan DOP cheeses',
    cuisine: ['Italian', 'Pasta', 'Wood-Fired Pizza', 'Mediterranean'],
    rating: 4.9,
    reviewCount: 1150,
    deliveryTimeMin: 35,
    deliveryTimeMax: 45,
    priceForTwoMinor: 140000,
    featuredOffer: '20% OFF on Tavola Grande Sharing Feasts',
    heroImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
    city: 'Chandigarh',
    isPureVeg: false,
    menuItemIds: ['item_paneer_tikka', 'item_dal_makhani', 'item_garlic_naan', 'item_gulab_jamun'],
  },
  {
    id: 'rest_roastery_1984',
    name: 'Roastery 1984 Artisan Coffee & Bakes',
    tagline: 'Single-origin micro-lot pour-overs, flaky laminated sourdough pastries',
    cuisine: ['Artisan Cafe', 'Bakery', 'Coffee', 'Desserts'],
    rating: 4.6,
    reviewCount: 740,
    deliveryTimeMin: 15,
    deliveryTimeMax: 25,
    priceForTwoMinor: 45000,
    featuredOffer: 'Free Cookie with Single-Origin Cold Brews',
    heroImage: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop&q=80',
    city: 'Chandigarh',
    isPureVeg: true,
    menuItemIds: ['item_mango_lassi', 'item_gulab_jamun', 'item_garlic_naan'],
  },
  {
    id: 'rest_punjab_sweets',
    name: 'Punjab Sweets & Chaat Chowk',
    tagline: 'Traditional pure desi ghee confections, crispy samosas, and chilled rabri',
    cuisine: ['Street Food', 'Sweets', 'Chaat', 'Beverages'],
    rating: 4.5,
    reviewCount: 2100,
    deliveryTimeMin: 20,
    deliveryTimeMax: 30,
    priceForTwoMinor: 35000,
    featuredOffer: 'Flat ₹50 OFF on Festival Sweet Boxes',
    heroImage: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80',
    city: 'New Delhi',
    isPureVeg: true,
    menuItemIds: ['item_gulab_jamun', 'item_mango_lassi', 'item_butter_naan'],
  },
  {
    id: 'rest_fjord_botanical',
    name: 'Fjord & Form Botanical Harvest',
    tagline: 'Nordic cold forage, sea buckthorn crudo, and wild herb sourdough breads',
    cuisine: ['Contemporary', 'European', 'Healthy', 'Salads'],
    rating: 4.8,
    reviewCount: 620,
    deliveryTimeMin: 40,
    deliveryTimeMax: 50,
    priceForTwoMinor: 180000,
    featuredOffer: 'Chef Table Tasting Flight Included',
    heroImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
    city: 'New Delhi',
    isPureVeg: false,
    menuItemIds: ['item_paneer_tikka', 'item_dal_makhani', 'item_mango_lassi'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 🛒 DEFAULT GROCERY SKU CATALOG (PANTRYRUSH)
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_GROCERY_SKUS: GrocerySkuItem[] = [
  {
    id: 'sku_amul_taaza',
    name: 'Amul Taaza Homogenised Toned Milk',
    brand: 'Amul',
    category: 'Dairy, Bread & Eggs',
    packSize: '1 L Tetra',
    mrpMinor: 7400,
    sellingPriceMinor: 7200,
    unitPriceDescription: '₹72.00 / L',
    stockQuantity: 18,
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80',
    badge: 'Daily Essential',
  },
  {
    id: 'sku_amul_butter',
    name: 'Amul Pasteurised Salted Butter',
    brand: 'Amul',
    category: 'Dairy, Bread & Eggs',
    packSize: '500 g',
    mrpMinor: 28500,
    sellingPriceMinor: 27500,
    unitPriceDescription: '₹55.00 / 100g',
    stockQuantity: 12,
    imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500&auto=format&fit=crop&q=80',
    badge: 'Popular',
  },
  {
    id: 'sku_english_oven_bread',
    name: 'English Oven 100% Whole Wheat Brown Bread',
    brand: 'English Oven',
    category: 'Dairy, Bread & Eggs',
    packSize: '400 g',
    mrpMinor: 5500,
    sellingPriceMinor: 5000,
    unitPriceDescription: '₹12.50 / 100g',
    stockQuantity: 8,
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80',
    badge: 'Zero Maida',
  },
  {
    id: 'sku_farm_fresh_eggs',
    name: 'Farm Fresh White Eggs (Pack of 12)',
    brand: 'Eggoz',
    category: 'Dairy, Bread & Eggs',
    packSize: 'Pack of 12',
    mrpMinor: 13000,
    sellingPriceMinor: 11500,
    unitPriceDescription: '₹9.58 / egg',
    stockQuantity: 14,
    imageUrl: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=500&auto=format&fit=crop&q=80',
    badge: 'UV Sanitized',
  },
  {
    id: 'sku_shimla_apples',
    name: 'Royal Delicious Red Apples (Shimla Fresh)',
    brand: 'Farm Fresh Direct',
    category: 'Fresh Fruits',
    packSize: '1 kg (4-5 pcs)',
    mrpMinor: 22000,
    sellingPriceMinor: 18900,
    unitPriceDescription: '₹18.90 / 100g',
    stockQuantity: 9,
    imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&auto=format&fit=crop&q=80',
    isOrganic: true,
    badge: 'Direct Farm Harvest',
  },
  {
    id: 'sku_robusta_bananas',
    name: 'Fresh Robusta Golden Bananas',
    brand: 'Farm Fresh Direct',
    category: 'Fresh Fruits',
    packSize: '1 kg (6-8 pcs)',
    mrpMinor: 6500,
    sellingPriceMinor: 5400,
    unitPriceDescription: '₹5.40 / 100g',
    stockQuantity: 15,
    imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'sku_hyderabad_onions',
    name: 'Pink Nasik Onions (Medium Grade)',
    brand: 'Farm Fresh Direct',
    category: 'Fresh Vegetables',
    packSize: '2 kg Net Bag',
    mrpMinor: 9000,
    sellingPriceMinor: 7800,
    unitPriceDescription: '₹39.00 / kg',
    stockQuantity: 22,
    imageUrl: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=500&auto=format&fit=crop&q=80',
    badge: 'Kitchen Staple',
  },
  {
    id: 'sku_hybrid_tomatoes',
    name: 'Hydroponic Vine Ripe Red Tomatoes',
    brand: 'Farm Fresh Direct',
    category: 'Fresh Vegetables',
    packSize: '1 kg',
    mrpMinor: 6000,
    sellingPriceMinor: 4800,
    unitPriceDescription: '₹48.00 / kg',
    stockQuantity: 16,
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'sku_kashmiri_potatoes',
    name: 'Pahadi White Potatoes (New Crop)',
    brand: 'Farm Fresh Direct',
    category: 'Fresh Vegetables',
    packSize: '2 kg Net Bag',
    mrpMinor: 8000,
    sellingPriceMinor: 6800,
    unitPriceDescription: '₹34.00 / kg',
    stockQuantity: 20,
    imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'sku_aashirvaad_atta',
    name: 'Aashirvaad Shudh Chakki Whole Wheat Atta',
    brand: 'Aashirvaad',
    category: 'Pantry Staples',
    packSize: '5 kg Pack',
    mrpMinor: 27500,
    sellingPriceMinor: 25500,
    unitPriceDescription: '₹51.00 / kg',
    stockQuantity: 11,
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80',
    badge: 'High Fiber',
  },
  {
    id: 'sku_daawat_basmati',
    name: 'Daawat Rozana Super Basmati Rice',
    brand: 'Daawat',
    category: 'Pantry Staples',
    packSize: '5 kg Bag',
    mrpMinor: 44000,
    sellingPriceMinor: 39500,
    unitPriceDescription: '₹79.00 / kg',
    stockQuantity: 7,
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'sku_tata_sampann_dal',
    name: 'Tata Sampann Unpolished Toor Dal',
    brand: 'Tata Sampann',
    category: 'Pantry Staples',
    packSize: '1 kg Pouch',
    mrpMinor: 19500,
    sellingPriceMinor: 17800,
    unitPriceDescription: '₹17.80 / 100g',
    stockQuantity: 14,
    imageUrl: 'https://images.unsplash.com/photo-1585994192701-f1a505c817ea?w=500&auto=format&fit=crop&q=80',
    badge: 'Unpolished',
  },
  {
    id: 'sku_coca_cola_zero',
    name: 'Coca-Cola Zero Sugar Sparkling Drink',
    brand: 'Coca-Cola',
    category: 'Cold Drinks & Juices',
    packSize: '750 ml Pet Bottle',
    mrpMinor: 4500,
    sellingPriceMinor: 4000,
    unitPriceDescription: '₹5.33 / 100ml',
    stockQuantity: 24,
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80',
    badge: 'Zero Sugar',
  },
  {
    id: 'sku_raw_coconut_water',
    name: 'Raw Pressery 100% Natural Coconut Water',
    brand: 'Raw Pressery',
    category: 'Cold Drinks & Juices',
    packSize: '200 ml Bottle',
    mrpMinor: 6500,
    sellingPriceMinor: 5900,
    unitPriceDescription: '₹29.50 / 100ml',
    stockQuantity: 16,
    imageUrl: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=500&auto=format&fit=crop&q=80',
    isOrganic: true,
  },
  {
    id: 'sku_lays_gourmet',
    name: "Lay's Gourmet Vintage Cheese & Paprika Chips",
    brand: "Lay's",
    category: 'Instant Food & Snacks',
    packSize: '55 g',
    mrpMinor: 3500,
    sellingPriceMinor: 3200,
    unitPriceDescription: '₹5.81 / 10g',
    stockQuantity: 19,
    imageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'sku_dettol_handwash',
    name: 'Dettol Skincare Germ Protection Liquid Handwash Refill',
    brand: 'Dettol',
    category: 'Personal Care',
    packSize: '675 ml Pouch',
    mrpMinor: 11900,
    sellingPriceMinor: 10500,
    unitPriceDescription: '₹15.55 / 100ml',
    stockQuantity: 0,
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
    badge: 'Out of Stock Demo',
  },
];

export const DEFAULT_BRAND_CONFIG: TenantBrandConfig = {
  restaurantName: 'OrbitoX Bistro & Bar',
  tagline: 'Modern Hospitality & Charcoal Embers',
  logoUrl: 'https://assets.orbitox.io/logos/orbitox-bistro-gold.svg',
  faviconUrl: '/favicon.ico',
  appIconUrl: 'https://assets.orbitox.io/icons/app-icon-192.png',
  primaryColor: '#C86B3C',
  secondaryColor: '#D99A45',
  accentColor: '#5D9A7A',
  surfaceColor: '#121519',
  textColor: '#F3EEE5',
  fontFamilyHeading: '"Playfair Display", Georgia, serif',
  fontFamilyBody: 'system-ui, -apple-system, sans-serif',
  activeTemplateId: 'tmpl_haute_gastronomy',
  subdomain: 'bistro.orbitox.live',
  customDomain: 'dine.orbitoxbistro.com',
  domainStatus: 'ACTIVE',
  sslStatus: 'ACTIVE',
  customCss: '/* Tenant custom overrides */\n.brand-badge { letter-spacing: 0.1em; }',
  socialLinks: {
    instagram: 'https://instagram.com/orbitoxbistro',
    twitter: 'https://twitter.com/orbitoxbistro',
    facebook: 'https://facebook.com/orbitoxbistro',
    mapsUrl: 'https://maps.google.com/?q=OrbitoX+Bistro',
  },
  seo: {
    title: 'OrbitoX Bistro & Bar — Luxury Charcoal Dining & Table Ordering',
    description: 'Experience artisan Indian tandoor, sommelier pairings, and contactless table ordering powered by RestaurantOS 3.0.',
    ogImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80',
  },
  locale: 'en-IN',
  currency: 'INR',
  currencySymbol: '₹',
  timezone: 'Asia/Kolkata',
  branchOverrides: {
    branch_chd: {
      restaurantName: 'OrbitoX Bistro · Chandigarh Sector 17',
      primaryColor: '#4A8BB2',
      tagline: 'Patio & Garden Gastronomy',
      subdomain: 'chd.orbitox.live',
    },
    branch_del: {
      restaurantName: 'OrbitoX Bistro · Connaught Place Delhi',
      primaryColor: '#D99A45',
      tagline: 'Colonial Verandah & Craft Cocktails',
      subdomain: 'delhi.orbitox.live',
    },
  },
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_TEMPLATE_DRAFT: TemplateDraftAndPublication = {
  templateId: 'tmpl_haute_gastronomy',
  version: 3,
  draftSections: DEFAULT_TEMPLATES[0].defaultSections,
  draftTokens: DEFAULT_TEMPLATES[0].defaultTokens,
  publishedSections: DEFAULT_TEMPLATES[0].defaultSections,
  publishedTokens: DEFAULT_TEMPLATES[0].defaultTokens,
  lastSavedAt: new Date().toISOString(),
  lastPublishedAt: new Date().toISOString(),
  revisions: [
    {
      revisionId: 'rev_v3_initial',
      version: 3,
      publishedAt: new Date().toISOString(),
      publishedBy: 'Sukhwinder Sandhu (Manager)',
      sections: DEFAULT_TEMPLATES[0].defaultSections,
      tokens: DEFAULT_TEMPLATES[0].defaultTokens,
      summary: 'Production publication of Haute Gastronomy Noir theme for Autumn 2026.',
    },
  ],
};

export const DEFAULT_SUPPORT_TICKETS: SupportTicket[] = [
  {
    id: 'tkt_101',
    ticketNumber: 'ORB-8492',
    branchId: 'branch_ldh',
    branchName: 'Ludhiana Main',
    staffId: 'stf_mgr_ldh_01',
    staffName: 'Sukhwinder Sandhu',
    category: 'HARDWARE_KDS',
    severity: 'MEDIUM',
    subject: 'Kitchen bump-bar Bluetooth disconnect on Curry Line terminal',
    description: 'The physical bump bar disconnected during peak rush yesterday. Requesting hardware troubleshooting steps or pairing re-initialization guide.',
    status: 'INVESTIGATING',
    assignedTo: 'OrbitoX Technical Support (Level 2)',
    createdAt: new Date(Date.now() - 3600 * 1000 * 14).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    messages: [
      {
        id: 'msg_101_1',
        sender: 'RESTAURANT_STAFF',
        authorName: 'Sukhwinder Sandhu',
        text: 'The Curry Line bump bar showed flashing amber LED around 20:30 PM. We had to use on-screen touch bump instead.',
        timestamp: new Date(Date.now() - 3600 * 1000 * 14).toISOString(),
      },
      {
        id: 'msg_101_2',
        sender: 'ORBITOX_SUPPORT',
        authorName: 'Aarav at OrbitoX Support',
        text: 'Hello Sukhwinder! We inspected the station logs. Firmware v2.1 had a power-saving timeout trigger. We pushed a diagnostic patch to your runtime.',
        timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
      },
    ],
  },
  {
    id: 'tkt_102',
    ticketNumber: 'ORB-8510',
    branchId: 'branch_chd',
    branchName: 'Chandigarh Sector 17',
    staffId: 'stf_mgr_chd_01',
    staffName: 'Karan Kapoor',
    category: 'DOMAIN_SETUP',
    severity: 'LOW',
    subject: 'Requesting assistance configuring custom CNAME for dine.sector17bistro.com',
    description: 'We pointed CNAME to ingress.orbitox.io but SSL provisioning shows PENDING_DNS in White-Label settings.',
    status: 'OPEN',
    assignedTo: 'Cloud Infrastructure Team',
    createdAt: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
    messages: [
      {
        id: 'msg_102_1',
        sender: 'RESTAURANT_STAFF',
        authorName: 'Karan Kapoor',
        text: 'DNS TTL was set to 3600s with GoDaddy. Waiting for global propagation.',
        timestamp: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
      },
    ],
  },
];

export * from './css-security';
export * from './logger';
export * from './tenancy';
export * from './invoicing';
export * from './templates';
export * from './provisioning';
