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
