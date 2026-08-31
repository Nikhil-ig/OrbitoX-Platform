export type DiscountType = 'percentage' | 'fixed_amount' | 'free_shipping';

export interface DiscountCoupon {
  id: string;
  storeId: string;
  code: string; // e.g. "SUMMER20"
  type: DiscountType;
  value: number; // e.g. 20 (percent) or 500 (fixed amount)
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  timesUsed: number;
  startsAt: string;
  expiresAt?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
