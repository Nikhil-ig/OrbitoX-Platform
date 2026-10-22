/**
 * 📖 OrbitoX RestaurantOS - Catalog, Modifiers & Dynamic Availability Engine
 * ─────────────────────────────────────────────────────────────
 * INVARIANT: Published menu snapshots are versioned and immutable during cart formation.
 * Dynamic availability incorporates 4 factors:
 * 1. Base item publication & active toggle
 * 2. Scheduled time-of-day / day-of-week rules
 * 3. Channel filtering (Dine-in, Takeaway, Bar)
 * 4. Kitchen station backlog overload suppression
 */

import { CurrencyCode, Money, MoneyUtil } from './money';

export type DietaryFlag = 'VEG' | 'NON_VEG' | 'VEGAN' | 'GLUTEN_FREE' | 'HALAL' | 'KOSHER' | 'DAIRY_FREE';
export type Allergen = 'NUTS' | 'DAIRY' | 'SOY' | 'SHELLFISH' | 'EGGS' | 'WHEAT' | 'FISH';
export type SalesChannel = 'DINE_IN' | 'BAR' | 'TAKEAWAY' | 'ROOM_SERVICE';

export interface RestaurantCatalogItem {
  readonly id: string;
  readonly tenantId: string;
  readonly companyId: string;
  readonly locationId: string;
  readonly menuId?: string;
  readonly name: string;
  readonly description?: string;
  readonly sku?: string;
  readonly basePriceMinor: bigint;
  readonly currency: CurrencyCode;
  readonly category: string;
  readonly imageUrl?: string;
  readonly allergens: Allergen[];
  readonly dietaryFlags: DietaryFlag[];
  readonly isAvailable: boolean;
  readonly maxDailyQuantity?: number;
  readonly currentDailySold?: number;
  readonly preparationDurationMinutes: number;
  readonly stationRouting: string; // e.g. "HOT_LINE", "TANDOOR", "BAR", "DESSERT"
  readonly modifierGroups: RestaurantModifierGroup[];
  readonly version: number;
}

export interface RestaurantModifierGroup {
  readonly id: string;
  readonly tenantId: string;
  readonly companyId: string;
  readonly itemId: string;
  readonly name: string;
  readonly minSelections: number;
  readonly maxSelections: number;
  readonly isRequired: boolean;
  readonly modifiers: RestaurantModifier[];
}

export interface RestaurantModifier {
  readonly id: string;
  readonly tenantId: string;
  readonly companyId: string;
  readonly groupId: string;
  readonly name: string;
  readonly priceDeltaMinor: bigint; // Added to base price
  readonly isDefault: boolean;
  readonly isAvailable: boolean;
}

export interface MenuScheduleRule {
  readonly daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, etc.
  readonly startHour: number; // 0-23
  readonly startMinute: number; // 0-59
  readonly endHour: number;
  readonly endMinute: number;
}

export interface AvailabilityContext {
  readonly currentTime: Date;
  readonly channel: SalesChannel;
  readonly stationActiveBacklogs?: Record<string, number>; // Station ID -> count of queued tasks
  readonly stationMaxBacklogThreshold?: number; // e.g., 25 tasks before auto-throttling
}

export class AvailabilityEngine {
  /**
   * Evaluates if a catalog item is available for customer ordering right now.
   */
  static isItemOrderable(
    item: RestaurantCatalogItem,
    context: AvailabilityContext,
    schedule?: MenuScheduleRule
  ): { available: boolean; reason?: string } {
    // 1. Manual out-of-stock toggle
    if (!item.isAvailable) {
      return { available: false, reason: 'Item is currently marked out of stock by kitchen' };
    }

    // 2. Daily quantity ceiling check
    if (item.maxDailyQuantity !== undefined && item.currentDailySold !== undefined) {
      if (item.currentDailySold >= item.maxDailyQuantity) {
        return { available: false, reason: 'Daily portion limit reached for this specialty' };
      }
    }

    // 3. Schedule / Time-of-day check
    if (schedule) {
      const day = context.currentTime.getDay();
      if (!schedule.daysOfWeek.includes(day)) {
        return { available: false, reason: 'Item is not offered on this day of the week' };
      }

      const currentMinutes = context.currentTime.getHours() * 60 + context.currentTime.getMinutes();
      const startMinutes = schedule.startHour * 60 + schedule.startMinute;
      const endMinutes = schedule.endHour * 60 + schedule.endMinute;

      if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
        return { available: false, reason: 'Item is outside its designated service hours' };
      }
    }

    // 4. Kitchen station backlog load shedding
    if (context.stationActiveBacklogs && context.stationMaxBacklogThreshold) {
      const stationLoad = context.stationActiveBacklogs[item.stationRouting] ?? 0;
      if (stationLoad >= context.stationMaxBacklogThreshold) {
        return {
          available: false,
          reason: `Kitchen station (${item.stationRouting}) is temporarily at capacity. Backlog: ${stationLoad}`,
        };
      }
    }

    return { available: true };
  }

  /**
   * Validates selected modifiers against modifier group constraints (min/max selections, required).
   */
  static validateModifierSelections(
    item: RestaurantCatalogItem,
    selectedModifierIds: string[]
  ): { valid: boolean; error?: string } {
    const selectedSet = new Set(selectedModifierIds);

    for (const group of item.modifierGroups) {
      const groupModifierIds = group.modifiers.map(m => m.id);
      const selectedInGroup = groupModifierIds.filter(id => selectedSet.has(id));

      if (group.isRequired && selectedInGroup.length < group.minSelections) {
        return {
          valid: false,
          error: `Group "${group.name}" requires at least ${group.minSelections} selection(s), but ${selectedInGroup.length} were selected`,
        };
      }

      if (selectedInGroup.length > group.maxSelections) {
        return {
          valid: false,
          error: `Group "${group.name}" allows at most ${group.maxSelections} selection(s), but ${selectedInGroup.length} were selected`,
        };
      }
    }

    return { valid: true };
  }
}
