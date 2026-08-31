export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus =
  | 'pending'
  | 'authorized'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export type FulfillmentStatus =
  | 'unfulfilled'
  | 'partially_fulfilled'
  | 'fulfilled'
  | 'returned';

export interface Address {
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  email?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  variantId?: string;
  title: string;
  variantTitle?: string;
  sku: string;
  price: number;
  quantity: number;
  totalPrice: number;
  imageUrl?: string;
}

export interface OrderTimelineEvent {
  id: string;
  type: 'status_change' | 'payment' | 'fulfillment' | 'note' | 'notification';
  title: string;
  description?: string;
  actor?: string;
  timestamp: string;
}

export interface Order {
  id: string;
  storeId: string;
  tenantId: string;
  orderNumber: string; // e.g. "ORD-1004"
  customerId?: string;
  customerEmail: string;
  customerPhone?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  currency: string;
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingAmount: number;
  grandTotal: number;
  couponCode?: string;
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: string; // "razorpay" | "stripe" | "cod" | "mock"
  paymentTransactionId?: string;
  shippingMethod?: string;
  trackingNumber?: string;
  carrier?: string;
  customerNotes?: string;
  adminNotes?: string;
  timeline: OrderTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderPayload {
  cartId: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: Address;
  billingAddress?: Address;
  paymentMethod: string;
  shippingMethodId?: string;
  customerNotes?: string;
}
