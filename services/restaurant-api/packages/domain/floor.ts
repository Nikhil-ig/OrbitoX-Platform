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
