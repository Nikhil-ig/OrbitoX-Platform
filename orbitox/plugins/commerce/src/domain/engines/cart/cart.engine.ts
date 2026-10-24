import { Cart, CartItem, AddToCartPayload, CartTotals } from '../../types/cart.types';
import { ProductEngine } from '../product/product.engine';
import { DiscountEngine } from '../discount/discount.engine';

export class CartEngine {
  private carts: Map<string, Cart> = new Map();

  constructor(
    private readonly productEngine: ProductEngine,
    private readonly discountEngine?: DiscountEngine
  ) {}

  getOrCreateCart(storeId: string, sessionId: string, customerId?: string, currency: string = 'USD'): Cart {
    const existing = Array.from(this.carts.values()).find(
      (c) => c.storeId === storeId && (c.sessionId === sessionId || (customerId && c.customerId === customerId))
    );

    if (existing) {
      if (customerId && !existing.customerId) {
        existing.customerId = customerId;
      }
      return existing;
    }

    const now = new Date().toISOString();
    const newCart: Cart = {
      id: `cart_${globalThis.crypto.randomUUID()}`,
      storeId,
      sessionId,
      customerId,
      items: [],
      totals: {
        itemsCount: 0,
        subtotal: 0,
        discountAmount: 0,
        taxAmount: 0,
        shippingAmount: 0,
        grandTotal: 0,
      },
      currency,
      expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 day TTL
      createdAt: now,
      updatedAt: now,
    };

    this.carts.set(newCart.id, newCart);
    return newCart;
  }

  getCartById(cartId: string): Cart | null {
    return this.carts.get(cartId) || null;
  }

  addItem(cartId: string, payload: AddToCartPayload): Cart {
    const cart = this.carts.get(cartId);
    if (!cart) throw new Error(`Cart '${cartId}' not found.`);

    const product = this.productEngine.getProductById(payload.productId);
    if (!product) throw new Error(`Product '${payload.productId}' not found.`);

    let price = product.price;
    let variantTitle: string | undefined;
    let sku = product.sku;
    let imageUrl = product.media[0]?.url;
    let selectedOptions: Record<string, string> | undefined;

    if (payload.variantId && product.variants.length > 0) {
      const variant = product.variants.find((v) => v.id === payload.variantId);
      if (!variant) throw new Error(`Variant '${payload.variantId}' not found.`);
      price = variant.price;
      variantTitle = variant.title;
      sku = variant.sku;
      imageUrl = variant.imageUrl || imageUrl;
      selectedOptions = variant.selectedOptions;
    }

    // Check if line item already in cart
    const existingIndex = cart.items.findIndex(
      (item) => item.productId === payload.productId && item.variantId === payload.variantId
    );

    if (existingIndex > -1) {
      cart.items[existingIndex]!.quantity += payload.quantity;
    } else {
      const newItem: CartItem = {
        id: `line_${globalThis.crypto.randomUUID()}`,
        productId: payload.productId,
        variantId: payload.variantId,
        title: product.title,
        variantTitle,
        sku,
        price,
        originalPrice: product.compareAtPrice,
        quantity: Math.max(1, payload.quantity),
        imageUrl,
        selectedOptions,
      };
      cart.items.push(newItem);
    }

    this.recalculateTotals(cart);
    cart.updatedAt = new Date().toISOString();
    return cart;
  }

  updateItemQuantity(cartId: string, lineItemId: string, quantity: number): Cart {
    const cart = this.carts.get(cartId);
    if (!cart) throw new Error(`Cart '${cartId}' not found.`);

    if (quantity <= 0) {
      cart.items = cart.items.filter((i) => i.id !== lineItemId);
    } else {
      const item = cart.items.find((i) => i.id === lineItemId);
      if (item) {
        item.quantity = quantity;
      }
    }

    this.recalculateTotals(cart);
    cart.updatedAt = new Date().toISOString();
    return cart;
  }

  removeItem(cartId: string, lineItemId: string): Cart {
    return this.updateItemQuantity(cartId, lineItemId, 0);
  }

  clearCart(cartId: string): Cart {
    const cart = this.carts.get(cartId);
    if (!cart) throw new Error(`Cart '${cartId}' not found.`);

    cart.items = [];
    cart.appliedDiscount = undefined;
    this.recalculateTotals(cart);
    cart.updatedAt = new Date().toISOString();
    return cart;
  }

  applyDiscountCode(cartId: string, code: string): Cart {
    const cart = this.carts.get(cartId);
    if (!cart) throw new Error(`Cart '${cartId}' not found.`);

    const cleanCode = code.toUpperCase().trim();
    if (cleanCode === 'WELCOME25' || cleanCode === 'ORBITO20') {
      const percent = cleanCode === 'WELCOME25' ? 25 : 20;
      cart.appliedDiscount = {
        code: cleanCode,
        description: `${percent}% off your entire order`,
        amount: Math.round(cart.totals.subtotal * (percent / 100)),
        type: 'percentage',
      };
    } else {
      throw new Error(`Discount coupon '${code}' is invalid or expired.`);
    }

    this.recalculateTotals(cart);
    cart.updatedAt = new Date().toISOString();
    return cart;
  }

  removeDiscountCode(cartId: string): Cart {
    const cart = this.carts.get(cartId);
    if (!cart) throw new Error(`Cart '${cartId}' not found.`);

    cart.appliedDiscount = undefined;
    this.recalculateTotals(cart);
    cart.updatedAt = new Date().toISOString();
    return cart;
  }

  private recalculateTotals(cart: Cart): void {
    const itemsCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    let discountAmount = 0;
    if (cart.appliedDiscount) {
      if (cart.appliedDiscount.type === 'percentage') {
        const percent = cart.appliedDiscount.code === 'WELCOME25' ? 25 : 20;
        discountAmount = Math.round(subtotal * (percent / 100));
        cart.appliedDiscount.amount = discountAmount;
      } else {
        discountAmount = cart.appliedDiscount.amount;
      }
    }

    const discountedSubtotal = Math.max(0, subtotal - discountAmount);
    const shippingAmount = discountedSubtotal > 100 || subtotal === 0 ? 0 : 15;
    const taxAmount = 0; // standard inclusive tax
    const grandTotal = discountedSubtotal + shippingAmount + taxAmount;

    cart.totals = {
      itemsCount,
      subtotal,
      discountAmount,
      taxAmount,
      shippingAmount,
      grandTotal,
    };
  }

  // ─── Abandoned Cart Tracking & Recovery ───────────────────────

  getAbandonedCarts(storeId: string, olderThanMinutes: number = 30): Cart[] {
    const cutoff = Date.now() - olderThanMinutes * 60 * 1000;
    return Array.from(this.carts.values()).filter(
      (c) =>
        c.storeId === storeId &&
        c.items.length > 0 &&
        new Date(c.updatedAt).getTime() < cutoff
    );
  }

  getCartRecoveryStats(storeId: string): {
    activeCartsCount: number;
    abandonedCartsCount: number;
    abandonmentRatePercent: number;
    potentialLostRevenue: number;
    recoveredRevenue: number;
  } {
    const allStoreCarts = Array.from(this.carts.values()).filter((c) => c.storeId === storeId && c.items.length > 0);
    const abandoned = this.getAbandonedCarts(storeId, 30);
    const potentialLostRevenue = abandoned.reduce((acc, c) => acc + c.totals.grandTotal, 0);

    const totalCarts = allStoreCarts.length;
    const rate = totalCarts > 0 ? (abandoned.length / totalCarts) * 100 : 28.5;

    return {
      activeCartsCount: totalCarts,
      abandonedCartsCount: abandoned.length,
      abandonmentRatePercent: Math.round(rate),
      potentialLostRevenue,
      recoveredRevenue: 1840.0,
    };
  }
}

