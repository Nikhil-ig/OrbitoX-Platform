export interface CartItem {
  id: string; // unique line-item ID
  productId: string;
  variantId?: string;
  title: string;
  variantTitle?: string;
  sku: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  imageUrl?: string;
  selectedOptions?: Record<string, string>;
}

export interface CartTotals {
  itemsCount: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingAmount: number;
  grandTotal: number;
}

export interface CartDiscount {
  code: string;
  description: string;
  amount: number;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
}

export interface Cart {
  id: string;
  storeId: string;
  sessionId: string; // guest visitor session
  customerId?: string;
  items: CartItem[];
  appliedDiscount?: CartDiscount;
  totals: CartTotals;
  currency: string;
  notes?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddToCartPayload {
  productId: string;
  variantId?: string;
  quantity: number;
}
