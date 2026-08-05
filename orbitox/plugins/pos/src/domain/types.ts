export type OrderStatus = 'OPEN' | 'PENDING_PAYMENT' | 'PAID' | 'FULFILLED' | 'VOIDED';
export type PaymentMethod = 'CASH' | 'CARD' | 'UPI' | 'CREDIT';

export interface PosLineItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface PosOrder {
  id: string;
  orderNumber: string;
  tableNumber?: string;
  status: OrderStatus;
  items: PosLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod?: PaymentMethod;
  createdAt: string;
  updatedAt: string;
}

export interface AddToCartPayload {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}
