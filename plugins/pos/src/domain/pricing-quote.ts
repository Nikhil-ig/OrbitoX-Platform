/**
 * 🏷️ OrbitoX RestaurantOS - Deterministic PricingQuote Engine
 * ─────────────────────────────────────────────────────────────
 * INVARIANT: Never trust client-calculated prices.
 * Every order submission MUST reference a server-generated, hash-locked PricingQuote.
 * The quote locks:
 * 1. Exact minor-unit sums (base price + modifier deltas * quantity)
 * 2. Deterministic taxes and service fees using integer basis points
 * 3. SHA-256 inputHash (cart payload fingerprint)
 * 4. SHA-256 resultHash (financial totals fingerprint)
 * 5. Strict 120-second expiration window
 */

import * as crypto from 'crypto';
import { CurrencyCode, Money, MoneyUtil } from './money';
import { RestaurantCatalogItem } from './catalog';

export interface CartItemInput {
  readonly itemId: string;
  readonly quantity: number;
  readonly selectedModifierIds: string[];
}

export interface PricingBreakdownLine {
  readonly label: string;
  readonly amountMinor: bigint;
  readonly rateBasisPoints?: number;
}

export interface PricingQuote {
  readonly quoteId: string;
  readonly tenantId: string;
  readonly companyId: string;
  readonly locationId: string;
  readonly sessionId: string;
  readonly inputHash: string;
  readonly resultHash: string;
  readonly subtotalMinor: bigint;
  readonly taxMinor: bigint;
  readonly serviceFeeMinor: bigint;
  readonly discountMinor: bigint;
  readonly totalMinor: bigint;
  readonly currency: CurrencyCode;
  readonly breakdown: PricingBreakdownLine[];
  readonly expiresAt: string; // ISO-8601
  readonly createdAt: string;
}

export interface PricingRules {
  readonly taxRateBasisPoints: number; // e.g. 500 for 5% GST
  readonly taxLabel: string; // e.g. "GST (5%)"
  readonly serviceFeeBasisPoints?: number; // e.g. 500 for 5% Service Charge
  readonly serviceFeeLabel?: string;
  readonly quoteTtlSeconds?: number; // Default 120s
}

export class PricingEngine {
  /**
   * Computes a deterministic, tamper-proof PricingQuote for a given set of cart items.
   */
  static calculateQuote(params: {
    tenantId: string;
    companyId: string;
    locationId: string;
    sessionId: string;
    cartItems: CartItemInput[];
    catalogItems: Map<string, RestaurantCatalogItem>;
    rules: PricingRules;
    currency?: CurrencyCode;
  }): PricingQuote {
    const currency = params.currency || 'INR';
    let subtotalMinor = 0n;

    // 1. Calculate Subtotal from Authoritative Catalog Items & Modifiers
    for (const itemInput of params.cartItems) {
      if (itemInput.quantity <= 0) {
        throw new Error(`Invalid item quantity: ${itemInput.quantity}`);
      }

      const catalogItem = params.catalogItems.get(itemInput.itemId);
      if (!catalogItem) {
        throw new Error(`Catalog item ${itemInput.itemId} not found`);
      }

      let unitPriceMinor = catalogItem.basePriceMinor;

      // Add selected modifier deltas
      if (itemInput.selectedModifierIds.length > 0) {
        const modifierMap = new Map<string, bigint>();
        for (const group of catalogItem.modifierGroups) {
          for (const mod of group.modifiers) {
            modifierMap.set(mod.id, mod.priceDeltaMinor);
          }
        }

        for (const modId of itemInput.selectedModifierIds) {
          const delta = modifierMap.get(modId);
          if (delta === undefined) {
            throw new Error(`Modifier ${modId} does not belong to catalog item ${catalogItem.id}`);
          }
          unitPriceMinor += delta;
        }
      }

      subtotalMinor += unitPriceMinor * BigInt(itemInput.quantity);
    }

    const subtotal = MoneyUtil.fromMinor(subtotalMinor, currency);

    // 2. Calculate Taxes and Service Charges via Integer Basis Points
    const taxMoney = MoneyUtil.applyBasisPoints(subtotal, params.rules.taxRateBasisPoints);
    const taxMinor = taxMoney.amountMinor;

    let serviceFeeMinor = 0n;
    if (params.rules.serviceFeeBasisPoints && params.rules.serviceFeeBasisPoints > 0) {
      const feeMoney = MoneyUtil.applyBasisPoints(subtotal, params.rules.serviceFeeBasisPoints);
      serviceFeeMinor = feeMoney.amountMinor;
    }

    const discountMinor = 0n; // Extendable for voucher engine
    const totalMinor = subtotalMinor + taxMinor + serviceFeeMinor - discountMinor;

    // 3. Build Itemized Financial Breakdown
    const breakdown: PricingBreakdownLine[] = [
      { label: 'Subtotal', amountMinor: subtotalMinor },
      { label: params.rules.taxLabel, amountMinor: taxMinor, rateBasisPoints: params.rules.taxRateBasisPoints },
    ];

    if (serviceFeeMinor > 0n && params.rules.serviceFeeLabel) {
      breakdown.push({
        label: params.rules.serviceFeeLabel,
        amountMinor: serviceFeeMinor,
        rateBasisPoints: params.rules.serviceFeeBasisPoints,
      });
    }

    // 4. Compute Normalized Hashes
    const inputHash = this.computeInputHash(params.cartItems);
    const resultHash = this.computeResultHash({
      subtotalMinor,
      taxMinor,
      serviceFeeMinor,
      discountMinor,
      totalMinor,
      currency,
    });

    const ttl = params.rules.quoteTtlSeconds ?? 120;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl * 1000).toISOString();

    return {
      quoteId: `qte_${crypto.randomUUID()}`,
      tenantId: params.tenantId,
      companyId: params.companyId,
      locationId: params.locationId,
      sessionId: params.sessionId,
      inputHash,
      resultHash,
      subtotalMinor,
      taxMinor,
      serviceFeeMinor,
      discountMinor,
      totalMinor,
      currency,
      breakdown,
      expiresAt,
      createdAt: now.toISOString(),
    };
  }

  /**
   * Verifies that an order submission matches its locked PricingQuote and has not expired.
   */
  static verifyQuote(quote: PricingQuote, currentCart: CartItemInput[]): { valid: boolean; error?: string } {
    // 1. Expiration check
    if (new Date(quote.expiresAt).getTime() < Date.now()) {
      return { valid: false, error: 'Pricing quote has expired (120s TTL). Please refresh your order summary.' };
    }

    // 2. Input hash check (cart items, quantities, or modifiers altered)
    const currentInputHash = this.computeInputHash(currentCart);
    if (currentInputHash !== quote.inputHash) {
      return { valid: false, error: 'Cart contents have changed since price quote was generated.' };
    }

    // 3. Result hash check (financial totals tampered)
    const expectedResultHash = this.computeResultHash({
      subtotalMinor: quote.subtotalMinor,
      taxMinor: quote.taxMinor,
      serviceFeeMinor: quote.serviceFeeMinor,
      discountMinor: quote.discountMinor,
      totalMinor: quote.totalMinor,
      currency: quote.currency,
    });

    if (expectedResultHash !== quote.resultHash) {
      return { valid: false, error: 'Cryptographic result hash mismatch: Financial totals have been modified.' };
    }

    return { valid: true };
  }

  private static computeInputHash(cartItems: CartItemInput[]): string {
    // Normalize sorting so array order changes do not produce false hash mismatches
    const normalized = [...cartItems]
      .map(item => ({
        itemId: item.itemId,
        quantity: item.quantity,
        modifiers: [...item.selectedModifierIds].sort(),
      }))
      .sort((a, b) => a.itemId.localeCompare(b.itemId));

    return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
  }

  private static computeResultHash(totals: {
    subtotalMinor: bigint;
    taxMinor: bigint;
    serviceFeeMinor: bigint;
    discountMinor: bigint;
    totalMinor: bigint;
    currency: string;
  }): string {
    const payload = `${totals.subtotalMinor}:${totals.taxMinor}:${totals.serviceFeeMinor}:${totals.discountMinor}:${totals.totalMinor}:${totals.currency}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }
}
