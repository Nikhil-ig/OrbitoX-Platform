import { DiscountCoupon, DiscountType } from '../../types/discount.types';

export class DiscountEngine {
  private discounts: Map<string, DiscountCoupon> = new Map();

  constructor(initialDiscounts: DiscountCoupon[] = []) {
    for (const d of initialDiscounts) this.discounts.set(d.id, d);

    if (this.discounts.size === 0) {
      const now = new Date().toISOString();
      const demo: DiscountCoupon[] = [
        {
          id: 'disc_welcome25',
          storeId: 'store_aura_luxury',
          code: 'WELCOME25',
          type: 'percentage',
          value: 25,
          minOrderAmount: 100,
          usageLimit: 1000,
          timesUsed: 42,
          startsAt: now,
          active: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'disc_orbito20',
          storeId: 'store_aura_luxury',
          code: 'ORBITO20',
          type: 'fixed_amount',
          value: 20,
          minOrderAmount: 50,
          usageLimit: 500,
          timesUsed: 19,
          startsAt: now,
          active: true,
          createdAt: now,
          updatedAt: now,
        },
      ];

      for (const d of demo) this.discounts.set(d.id, d);
    }
  }

  createDiscount(
    storeId: string,
    payload: {
      code: string;
      type: DiscountType;
      value: number;
      minOrderAmount?: number;
      maxDiscountAmount?: number;
      usageLimit?: number;
      expiresAt?: string;
    }
  ): DiscountCoupon {
    const code = payload.code.toUpperCase().trim();
    const now = new Date().toISOString();

    const discount: DiscountCoupon = {
      id: `disc_${globalThis.crypto.randomUUID()}`,
      storeId,
      code,
      type: payload.type,
      value: payload.value,
      minOrderAmount: payload.minOrderAmount,
      maxDiscountAmount: payload.maxDiscountAmount,
      usageLimit: payload.usageLimit,
      timesUsed: 0,
      startsAt: now,
      expiresAt: payload.expiresAt,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    this.discounts.set(discount.id, discount);
    return discount;
  }

  validateDiscount(storeId: string, code: string, orderSubtotal: number): { valid: boolean; discount?: DiscountCoupon; message?: string } {
    const cleanCode = code.toUpperCase().trim();
    const discount = Array.from(this.discounts.values()).find(
      (d) => d.storeId === storeId && d.code === cleanCode && d.active
    );

    if (!discount) {
      return { valid: false, message: 'Invalid discount coupon code' };
    }

    if (discount.expiresAt && new Date(discount.expiresAt).getTime() < Date.now()) {
      return { valid: false, message: 'Discount coupon has expired' };
    }

    if (discount.usageLimit && discount.timesUsed >= discount.usageLimit) {
      return { valid: false, message: 'Discount coupon usage limit reached' };
    }

    if (discount.minOrderAmount && orderSubtotal < discount.minOrderAmount) {
      return { valid: false, message: `Minimum order amount of $${discount.minOrderAmount} required` };
    }

    return { valid: true, discount };
  }

  listDiscountsByStore(storeId: string): DiscountCoupon[] {
    return Array.from(this.discounts.values()).filter((d) => d.storeId === storeId);
  }
}
