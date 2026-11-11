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
  id?: string;
  idempotencyKey?: string;
  paymentStatus?: string;
  paymentSessionId?: string;
  createdAt: string;
  updatedAt?: string;
}
