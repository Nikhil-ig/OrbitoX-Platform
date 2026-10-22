/**
 * 🏷️ OrbitoX RestaurantOS - Catalog & Deterministic Pricing Service
 * ─────────────────────────────────────────────────────────────
 * Implements:
 * - Versioned menu publications
 * - Dynamic availability resolution (Schedule, Daily Caps, Kitchen Load)
 * - Deterministic PricingQuote calculation with SHA-256 tamper-proof hashes
 * - Minor currency unit accounting (zero floating point drift)
 */

import {
  RestaurantCatalogItem,
  RestaurantModifierGroup,
  RestaurantModifier,
  AvailabilityEngine,
  AvailabilityContext,
  MenuScheduleRule,
  SalesChannel,
} from '../domain/catalog';
import { PricingEngine, PricingQuote, CartItemInput, PricingRules } from '../domain/pricing-quote';
import { CurrencyCode, MoneyUtil } from '../domain/money';

export interface PublicMenuResponse {
  readonly menuVersion: number;
  readonly categories: Array<{
    readonly name: string;
    readonly items: Array<{
      readonly id: string;
      readonly name: string;
      readonly description?: string;
      readonly basePriceMinor: string; // Serialized string for bigints
      readonly formattedPrice: string;
      readonly category: string;
      readonly imageUrl?: string;
      readonly allergens: string[];
      readonly dietaryFlags: string[];
      readonly preparationDurationMinutes: number;
      readonly modifierGroups: Array<{
        readonly id: string;
        readonly name: string;
        readonly minSelections: number;
        readonly maxSelections: number;
        readonly isRequired: boolean;
        readonly modifiers: Array<{
          readonly id: string;
          readonly name: string;
          readonly priceDeltaMinor: string;
          readonly formattedDelta: string;
          readonly isDefault: boolean;
        }>;
      }>;
    }>;
  }>;
}

export class CatalogPricingService {
  private readonly items = new Map<string, RestaurantCatalogItem>();
  private readonly quotes = new Map<string, PricingQuote>(); // quoteId -> PricingQuote
  private menuVersion = 1;

  /**
   * Registers or updates a catalog item in the store.
   */
  upsertItem(item: RestaurantCatalogItem): void {
    this.items.set(item.id, item);
  }

  /**
   * Retrieves an item by ID.
   */
  getItem(id: string): RestaurantCatalogItem | undefined {
    return this.items.get(id);
  }

  /**
   * Generates public menu for guest browsing.
   * Dynamically filters out items that are out of stock, outside service hours,
   * or assigned to overloaded kitchen stations.
   */
  getPublicMenu(params: {
    locationId: string;
    currentTime?: Date;
    channel?: SalesChannel;
    stationBacklogs?: Record<string, number>;
    schedules?: Map<string, MenuScheduleRule>;
  }): PublicMenuResponse {
    const context: AvailabilityContext = {
      currentTime: params.currentTime ?? new Date(),
      channel: params.channel ?? 'DINE_IN',
      stationActiveBacklogs: params.stationBacklogs,
      stationMaxBacklogThreshold: 25,
    };

    const categoriesMap = new Map<string, any[]>();

    for (const item of this.items.values()) {
      if (item.locationId !== params.locationId) continue;

      const schedule = params.schedules?.get(item.id);
      const { available } = AvailabilityEngine.isItemOrderable(item, context, schedule);
      if (!available) continue; // Exclude unavailable items from public view

      const categoryItems = categoriesMap.get(item.category) || [];
      categoryItems.push({
        id: item.id,
        name: item.name,
        description: item.description,
        basePriceMinor: item.basePriceMinor.toString(),
        formattedPrice: MoneyUtil.format(MoneyUtil.fromMinor(item.basePriceMinor, item.currency)),
        category: item.category,
        imageUrl: item.imageUrl,
        allergens: item.allergens,
        dietaryFlags: item.dietaryFlags,
        preparationDurationMinutes: item.preparationDurationMinutes,
        modifierGroups: item.modifierGroups.map(g => ({
          id: g.id,
          name: g.name,
          minSelections: g.minSelections,
          maxSelections: g.maxSelections,
          isRequired: g.isRequired,
          modifiers: g.modifiers
            .filter(m => m.isAvailable)
            .map(m => ({
              id: m.id,
              name: m.name,
              priceDeltaMinor: m.priceDeltaMinor.toString(),
              formattedDelta:
                m.priceDeltaMinor > 0n
                  ? `+${MoneyUtil.format(MoneyUtil.fromMinor(m.priceDeltaMinor, item.currency))}`
                  : 'Free',
              isDefault: m.isDefault,
            })),
        })),
      });
      categoriesMap.set(item.category, categoryItems);
    }

    const categories = Array.from(categoriesMap.entries()).map(([name, catItems]) => ({
      name,
      items: catItems,
    }));

    return {
      menuVersion: this.menuVersion,
      categories,
    };
  }

  /**
   * Generates a tamper-proof, server-validated PricingQuote.
   */
  requestQuote(params: {
    tenantId: string;
    companyId: string;
    locationId: string;
    sessionId: string;
    cartItems: CartItemInput[];
    currency?: CurrencyCode;
    taxRateBasisPoints?: number;
    serviceFeeBasisPoints?: number;
  }): PricingQuote {
    // 1. Validate modifier constraints for each item
    for (const cartItem of params.cartItems) {
      const item = this.items.get(cartItem.itemId);
      if (!item) throw new Error(`Catalog item ${cartItem.itemId} not found`);

      const modValidation = AvailabilityEngine.validateModifierSelections(item, cartItem.selectedModifierIds);
      if (!modValidation.valid) {
        throw new Error(modValidation.error);
      }
    }

    // 2. Compute quote
    const rules: PricingRules = {
      taxRateBasisPoints: params.taxRateBasisPoints ?? 500, // 5% GST
      taxLabel: 'GST (5%)',
      serviceFeeBasisPoints: params.serviceFeeBasisPoints ?? 0,
      serviceFeeLabel: 'Service Fee',
      quoteTtlSeconds: 120,
    };

    const quote = PricingEngine.calculateQuote({
      tenantId: params.tenantId,
      companyId: params.companyId,
      locationId: params.locationId,
      sessionId: params.sessionId,
      cartItems: params.cartItems,
      catalogItems: this.items,
      rules,
      currency: params.currency,
    });

    this.quotes.set(quote.quoteId, quote);
    return quote;
  }

  /**
   * Verifies and redeems a quote during order submission.
   */
  redeemQuote(quoteId: string, currentCart: CartItemInput[]): PricingQuote {
    const quote = this.quotes.get(quoteId);
    if (!quote) throw new Error('Pricing quote not found');

    const check = PricingEngine.verifyQuote(quote, currentCart);
    if (!check.valid) {
      throw new Error(`Quote verification failed: ${check.error}`);
    }

    return quote;
  }
}
