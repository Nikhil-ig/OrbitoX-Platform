import * as crypto from 'crypto';
import { CentralPlanDefinition, PlanAddonDefinition } from '../types';
import { CentralQuoteRequest, CentralQuoteResponse } from '@orbitox/external-runtime-sdk';

export class CentralQuoteService {
  private static plans: Map<string, CentralPlanDefinition> = new Map();
  private static quotes: Map<string, CentralQuoteResponse> = new Map();
  private static initialized = false;

  constructor() {
    CentralQuoteService.initialize();
  }

  public static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Seed default central platform plans
    const defaultPlans: CentralPlanDefinition[] = [
      {
        id: 'plan_restaurant_starter',
        name: 'Bistro Starter',
        tier: 'starter',
        basePriceMinor: '490000', // ₹4,900.00 / mo
        currency: 'INR',
        billingInterval: 'monthly',
        features: ['dine_qr', 'basic_menu', 'single_kds'],
        limits: {
          tables: { key: 'tables', name: 'Max Seating Tables', limit: 15, enforced: true, unit: 'tables' },
          monthlyOrders: { key: 'monthlyOrders', name: 'Monthly Orders', limit: 3000, enforced: true, unit: 'orders' },
          kdsScreens: { key: 'kdsScreens', name: 'KDS Screens', limit: 1, enforced: true, unit: 'screens' },
        },
        addons: [
          { id: 'addon_sms_alerts', name: 'SMS Diner Notifications', priceMinor: '99000', currency: 'INR', description: '5,000 automated SMS order updates' },
          { id: 'addon_extra_kds', name: 'Additional KDS Screen', priceMinor: '149000', currency: 'INR', description: 'Deploy an extra kitchen station display' },
        ],
      },
      {
        id: 'plan_restaurant_growth',
        name: 'Multi-Station Growth',
        tier: 'growth',
        basePriceMinor: '1290000', // ₹12,900.00 / mo
        currency: 'INR',
        billingInterval: 'monthly',
        features: ['dine_qr', 'dag_prep_scheduler', 'multi_station_kds', 'companion_join', 'mcp_copilot'],
        limits: {
          tables: { key: 'tables', name: 'Max Seating Tables', limit: 50, enforced: true, unit: 'tables' },
          monthlyOrders: { key: 'monthlyOrders', name: 'Monthly Orders', limit: 15000, enforced: true, unit: 'orders' },
          kdsScreens: { key: 'kdsScreens', name: 'KDS Screens', limit: 5, enforced: true, unit: 'screens' },
        },
        addons: [
          { id: 'addon_sommelier_ai', name: 'Sommelier AI MCP Agent', priceMinor: '299000', currency: 'INR', description: 'Autonomous wine & beverage pairing suggestions' },
          { id: 'addon_offline_edge', name: 'Offline LAN Edge Server', priceMinor: '399000', currency: 'INR', description: 'Zero-downtime local POS gateway' },
        ],
      },
      {
        id: 'plan_restaurant_enterprise',
        name: 'Hyperscale Franchise Mesh',
        tier: 'enterprise',
        basePriceMinor: '3490000', // ₹34,900.00 / mo
        currency: 'INR',
        billingInterval: 'monthly',
        features: ['all_features', 'franchise_royalty_split', 'unlimited_kds', 'custom_domains', 'sla_99_99'],
        limits: {
          tables: { key: 'tables', name: 'Max Seating Tables', limit: 500, enforced: false, unit: 'tables' },
          monthlyOrders: { key: 'monthlyOrders', name: 'Monthly Orders', limit: 250000, enforced: false, unit: 'orders' },
          kdsScreens: { key: 'kdsScreens', name: 'KDS Screens', limit: 50, enforced: false, unit: 'screens' },
        },
        addons: [],
      },
    ];

    for (const p of defaultPlans) {
      this.plans.set(p.id, p);
    }
  }

  public listPlans(): CentralPlanDefinition[] {
    CentralQuoteService.initialize();
    return Array.from(CentralQuoteService.plans.values());
  }

  public getPlan(planId: string): CentralPlanDefinition | undefined {
    CentralQuoteService.initialize();
    return CentralQuoteService.plans.get(planId);
  }

  public upsertPlan(plan: CentralPlanDefinition): void {
    CentralQuoteService.initialize();
    CentralQuoteService.plans.set(plan.id, plan);
  }

  /**
   * Deterministic Central Quote Computation
   */
  public computeQuote(req: CentralQuoteRequest): CentralQuoteResponse {
    CentralQuoteService.initialize();
    const plan = CentralQuoteService.plans.get(req.planId);
    if (!plan) {
      throw new Error(`Plan not found: ${req.planId}`);
    }

    let baseMinor = BigInt(plan.basePriceMinor);
    let addonsMinor = 0n;

    // Addons calculation
    if (req.addons && req.addons.length > 0) {
      for (const addonId of req.addons) {
        const found = plan.addons.find((a) => a.id === addonId);
        if (found) {
          addonsMinor += BigInt(found.priceMinor);
        }
      }
    }

    // Custom items if passed
    if (req.items && req.items.length > 0) {
      for (const it of req.items) {
        if (it.unitPriceMinor) {
          addonsMinor += BigInt(it.unitPriceMinor) * BigInt(it.quantity);
        }
      }
    }

    const subtotal = baseMinor + addonsMinor;

    // Discounts
    let discountMinor = 0n;
    if (req.customDiscountPercent && req.customDiscountPercent > 0) {
      discountMinor = (subtotal * BigInt(req.customDiscountPercent)) / 100n;
    }

    const netSubtotal = subtotal - discountMinor;

    // 18% GST for software services / 5% for food
    const taxBasisPoints = 1800n; // 18%
    const taxMinor = (netSubtotal * taxBasisPoints) / 10000n;
    const totalMinor = netSubtotal + taxMinor;

    const quoteId = `quote_plat_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
    const validUntil = new Date(Date.now() + 120 * 1000).toISOString(); // 120s TTL

    // Compute Cryptographic Hashes
    const inputPayload = JSON.stringify({
      projectId: req.projectId,
      planId: req.planId,
      addons: (req.addons || []).sort(),
      discountPercent: req.customDiscountPercent || 0,
      currency: plan.currency,
    });
    const inputHash = crypto.createHash('sha256').update(inputPayload).digest('hex');

    const resultPayload = `${quoteId}:${totalMinor.toString()}:${inputHash}:${validUntil}`;
    const resultHash = crypto.createHash('sha256').update(resultPayload).digest('hex');

    const quote: CentralQuoteResponse = {
      quoteId,
      projectId: req.projectId,
      planId: req.planId,
      baseAmountMinor: baseMinor.toString(),
      addonsAmountMinor: addonsMinor.toString(),
      discountMinor: discountMinor.toString(),
      taxMinor: taxMinor.toString(),
      totalMinor: totalMinor.toString(),
      currency: plan.currency,
      inputHash,
      resultHash,
      validUntil,
    };

    CentralQuoteService.quotes.set(quoteId, quote);
    return quote;
  }

  public getQuote(quoteId: string): CentralQuoteResponse | undefined {
    return CentralQuoteService.quotes.get(quoteId);
  }
}
