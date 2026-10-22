/**
 * 🍽️ OrbitoX RestaurantOS - Web Application Runtime & Seed Harness
 * ─────────────────────────────────────────────────────────────
 * Houses singleton service instances and seeds production demo data for:
 * - Table T-14 (Locator: 7Kp9xQ8m2L)
 * - OrbitoX Bistro, Ludhiana Main Branch
 * - Complete multi-station catalog (Tandoor, Curry Line, Bar, Dessert)
 */

import {
  QrSessionService,
  CatalogPricingService,
  OrderKitchenService,
  RealtimeEventGateway,
  RestaurantCatalogItem,
  QRIdentity,
  QRTrustEngine,
} from '@orbitox/pos';

class RestaurantRuntimeManager {
  public readonly qrService = new QrSessionService();
  public readonly catalogService = new CatalogPricingService();
  public readonly orderKitchenService = new OrderKitchenService();
  public readonly realtimeGateway = new RealtimeEventGateway();

  private initialized = false;

  constructor() {
    this.seedDefaults();
  }

  public getCatalogMap(): Map<string, RestaurantCatalogItem> {
    const map = new Map<string, RestaurantCatalogItem>();
    const items = [
      this.catalogService.getItem('item_paneer_tikka'),
      this.catalogService.getItem('item_fish_tikka'),
      this.catalogService.getItem('item_crispy_corn'),
      this.catalogService.getItem('item_dal_makhani'),
      this.catalogService.getItem('item_butter_chicken'),
      this.catalogService.getItem('item_paneer_butter_masala'),
      this.catalogService.getItem('item_tandoori_murgh'),
      this.catalogService.getItem('item_butter_naan'),
      this.catalogService.getItem('item_garlic_naan'),
      this.catalogService.getItem('item_jeera_rice'),
      this.catalogService.getItem('item_gulab_jamun'),
      this.catalogService.getItem('item_rasmalai'),
      this.catalogService.getItem('item_mango_lassi'),
      this.catalogService.getItem('item_lime_soda'),
      this.catalogService.getItem('item_whiskey_sour'),
    ];
    for (const item of items) {
      if (item) map.set(item.id, item);
    }
    return map;
  }

  private seedDefaults() {
    if (this.initialized) return;
    this.initialized = true;

    // 1. Seed Table 14
    const qr14: QRIdentity = {
      id: 'qr_t14',
      tenantId: 'tenant_orbitox',
      companyId: 'company_bistro',
      locationId: 'loc_ludhiana',
      tableId: 'tbl_14',
      locator: '7Kp9xQ8m2L',
      tokenHash: QRTrustEngine.hashToken('secret_t14_ludhiana'),
      securityVersion: 1,
      isActive: true,
    };
    this.qrService.registerTableQR(qr14, { tableNumber: 'T-14', capacity: 4 });

    // Seed additional tables for Floor View
    for (let i = 1; i <= 10; i++) {
      if (i === 14) continue;
      const locator = `T${i}-${i * 777}`;
      const qr: QRIdentity = {
        id: `qr_t${i}`,
        tenantId: 'tenant_orbitox',
        companyId: 'company_bistro',
        locationId: 'loc_ludhiana',
        tableId: `tbl_${i}`,
        locator,
        tokenHash: QRTrustEngine.hashToken(`secret_t${i}`),
        securityVersion: 1,
        isActive: true,
      };
      this.qrService.registerTableQR(qr, { tableNumber: `T-${i}`, capacity: i % 2 === 0 ? 4 : 2 });
    }

    // 2. Seed Rich Culinary Catalog
    const items: RestaurantCatalogItem[] = [
      {
        id: 'item_paneer_tikka',
        tenantId: 'tenant_orbitox',
        companyId: 'company_bistro',
        locationId: 'loc_ludhiana',
        name: 'Paneer Tikka Charcoal Grilled',
        description: 'Cottage cheese marinated in Kashmiri chili, hung curd, and roasted gram flour.',
        basePriceMinor: 35000n, // ₹350.00
        currency: 'INR',
        category: 'Starters',
        imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&auto=format&fit=crop&q=80',
        allergens: ['DAIRY'],
        dietaryFlags: ['VEG'],
        isAvailable: true,
        preparationDurationMinutes: 12,
        stationRouting: 'TANDOOR',
        version: 1,
        modifierGroups: [
          {
            id: 'mg_spice',
            tenantId: 'tenant_orbitox',
            companyId: 'company_bistro',
            itemId: 'item_paneer_tikka',
            name: 'Spice Level',
            minSelections: 1,
            maxSelections: 1,
            isRequired: true,
            modifiers: [
              { id: 'm_mild', tenantId: 'tenant_orbitox', companyId: 'company_bistro', groupId: 'mg_spice', name: 'Mild', priceDeltaMinor: 0n, isDefault: true, isAvailable: true },
              { id: 'm_medium', tenantId: 'tenant_orbitox', companyId: 'company_bistro', groupId: 'mg_spice', name: 'Medium', priceDeltaMinor: 0n, isDefault: false, isAvailable: true },
              { id: 'm_extra_spicy', tenantId: 'tenant_orbitox', companyId: 'company_bistro', groupId: 'mg_spice', name: 'Extra Spicy', priceDeltaMinor: 2000n, isDefault: false, isAvailable: true },
            ],
          },
        ],
      },
      {
        id: 'item_fish_tikka',
        tenantId: 'tenant_orbitox',
        companyId: 'company_bistro',
        locationId: 'loc_ludhiana',
        name: 'Amritsari Fish Tikka',
        description: 'River sole chunks rubbed with ajwain carom seeds, yellow chili, and mustard oil.',
        basePriceMinor: 48000n, // ₹480.00
        currency: 'INR',
        category: 'Starters',
        imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&auto=format&fit=crop&q=80',
        allergens: ['FISH'],
        dietaryFlags: ['NON_VEG'],
        isAvailable: true,
        preparationDurationMinutes: 14,
        stationRouting: 'TANDOOR',
        version: 1,
        modifierGroups: [],
      },
      {
        id: 'item_crispy_corn',
        tenantId: 'tenant_orbitox',
        companyId: 'company_bistro',
        locationId: 'loc_ludhiana',
        name: 'Golden Crispy Corn Kernels',
        description: 'Flash-fried American corn tossed with scallions, crushed pepper, and lemon zest.',
        basePriceMinor: 28000n, // ₹280.00
        currency: 'INR',
        category: 'Starters',
        allergens: [],
        dietaryFlags: ['VEG', 'GLUTEN_FREE'],
        isAvailable: true,
        preparationDurationMinutes: 8,
        stationRouting: 'COLD_LINE',
        version: 1,
        modifierGroups: [],
      },
      {
        id: 'item_dal_makhani',
        tenantId: 'tenant_orbitox',
        companyId: 'company_bistro',
        locationId: 'loc_ludhiana',
        name: 'Dal Makhani Slow-Simmered (24 hrs)',
        description: 'Black lentils slow cooked overnight on charcoal embers with fresh cream and churned butter.',
        basePriceMinor: 38000n, // ₹380.00
        currency: 'INR',
        category: 'Mains',
        imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80',
        allergens: ['DAIRY'],
        dietaryFlags: ['VEG'],
        isAvailable: true,
        preparationDurationMinutes: 14,
        stationRouting: 'CURRY_LINE',
        version: 1,
        modifierGroups: [],
      },
      {
        id: 'item_butter_chicken',
        tenantId: 'tenant_orbitox',
        companyId: 'company_bistro',
        locationId: 'loc_ludhiana',
        name: 'Murgh Makhani (Old Delhi Style)',
        description: 'Smoked chicken tikka simmered in a velvet tomato, fenugreek, and honey sauce.',
        basePriceMinor: 49000n, // ₹490.00
        currency: 'INR',
        category: 'Mains',
        imageUrl: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&auto=format&fit=crop&q=80',
        allergens: ['DAIRY'],
        dietaryFlags: ['NON_VEG'],
        isAvailable: true,
        preparationDurationMinutes: 15,
        stationRouting: 'CURRY_LINE',
        version: 1,
        modifierGroups: [],
      },
      {
        id: 'item_paneer_butter_masala',
        tenantId: 'tenant_orbitox',
        companyId: 'company_bistro',
        locationId: 'loc_ludhiana',
        name: 'Paneer Butter Masala',
        description: 'Fresh malai paneer cubes tossed in rich cashew-tomato gravy with kasoori methi.',
        basePriceMinor: 42000n, // ₹420.00
        currency: 'INR',
        category: 'Mains',
        allergens: ['DAIRY'],
        dietaryFlags: ['VEG'],
        isAvailable: true,
        preparationDurationMinutes: 13,
        stationRouting: 'CURRY_LINE',
        version: 1,
        modifierGroups: [],
      },
      {
        id: 'item_tandoori_murgh',
        tenantId: 'tenant_orbitox',
        companyId: 'company_bistro',
        locationId: 'loc_ludhiana',
        name: 'Tandoori Murgh (Charcoal Roast)',
        description: 'Half spring chicken steeped in ginger garlic emulsion, cooked in clay oven.',
        basePriceMinor: 39000n, // ₹390.00
        currency: 'INR',
        category: 'Mains',
        allergens: ['DAIRY'],
        dietaryFlags: ['NON_VEG'],
        isAvailable: true,
        preparationDurationMinutes: 18,
        stationRouting: 'TANDOOR',
        version: 1,
        modifierGroups: [],
      },
      {
        id: 'item_butter_naan',
        tenantId: 'tenant_orbitox',
        companyId: 'company_bistro',
        locationId: 'loc_ludhiana',
        name: 'Crisp Butter Naan',
        description: 'Tandoor-baked refined flour bread brushed with salted farmhouse butter.',
        basePriceMinor: 7000n, // ₹70.00
        currency: 'INR',
        category: 'Breads & Rice',
        allergens: ['DAIRY', 'WHEAT'],
        dietaryFlags: ['VEG'],
        isAvailable: true,
        preparationDurationMinutes: 5,
        stationRouting: 'TANDOOR',
        version: 1,
        modifierGroups: [],
      },
      {
        id: 'item_garlic_naan',
        tenantId: 'tenant_orbitox',
        companyId: 'company_bistro',
        locationId: 'loc_ludhiana',
        name: 'Garlic Butter Naan',
        description: 'Topped with roasted minced garlic, coriander, and nigella seeds.',
        basePriceMinor: 9000n, // ₹90.00
        currency: 'INR',
        category: 'Breads & Rice',
        allergens: ['DAIRY', 'WHEAT'],
        dietaryFlags: ['VEG'],
        isAvailable: true,
        preparationDurationMinutes: 6,
        stationRouting: 'TANDOOR',
        version: 1,
        modifierGroups: [],
      },
      {
        id: 'item_jeera_rice',
        tenantId: 'tenant_orbitox',
        companyId: 'company_bistro',
        locationId: 'loc_ludhiana',
        name: 'Fragrant Jeera Rice',
        description: 'Aged basmati rice tempered with roasted cumin seeds and fresh ghee.',
        basePriceMinor: 18000n, // ₹180.00
        currency: 'INR',
        category: 'Breads & Rice',
        allergens: ['DAIRY'],
        dietaryFlags: ['VEG', 'GLUTEN_FREE'],
        isAvailable: true,
        preparationDurationMinutes: 5,
        stationRouting: 'CURRY_LINE',
        version: 1,
        modifierGroups: [],
      },
      {
        id: 'item_gulab_jamun',
        tenantId: 'tenant_orbitox',
        companyId: 'company_bistro',
        locationId: 'loc_ludhiana',
        name: 'Pista Shahi Gulab Jamun (2 Pcs)',
        description: 'Warm khoya dumplings steeped in saffron-cardamom sugar nectar.',
        basePriceMinor: 15000n, // ₹150.00
        currency: 'INR',
        category: 'Desserts',
        allergens: ['DAIRY', 'NUTS'],
        dietaryFlags: ['VEG'],
        isAvailable: true,
        preparationDurationMinutes: 3,
        stationRouting: 'DESSERT',
        version: 1,
        modifierGroups: [],
      },
      {
        id: 'item_rasmalai',
        tenantId: 'tenant_orbitox',
        companyId: 'company_bistro',
        locationId: 'loc_ludhiana',
        name: 'Kesar Rasmalai (2 Pcs)',
        description: 'Spongy chenna discs soaked in thickened saffron-infused pistachio milk.',
        basePriceMinor: 19000n, // ₹190.00
        currency: 'INR',
        category: 'Desserts',
        allergens: ['DAIRY', 'NUTS'],
        dietaryFlags: ['VEG'],
        isAvailable: true,
        preparationDurationMinutes: 2,
        stationRouting: 'DESSERT',
        version: 1,
        modifierGroups: [],
      },
      {
        id: 'item_mango_lassi',
        tenantId: 'tenant_orbitox',
        companyId: 'company_bistro',
        locationId: 'loc_ludhiana',
        name: 'Alphonso Mango Lassi',
        description: 'Chilled artisanal yogurt whipped with Ratnagiri Alphonso mango pulp.',
        basePriceMinor: 14000n, // ₹140.00
        currency: 'INR',
        category: 'Beverages',
        allergens: ['DAIRY'],
        dietaryFlags: ['VEG'],
        isAvailable: true,
        preparationDurationMinutes: 3,
        stationRouting: 'BAR',
        version: 1,
        modifierGroups: [],
      },
      {
        id: 'item_lime_soda',
        tenantId: 'tenant_orbitox',
        companyId: 'company_bistro',
        locationId: 'loc_ludhiana',
        name: 'Fresh Mint Lime Soda',
        description: 'Crushed mint, freshly squeezed lime juice, rock salt, and effervescent soda.',
        basePriceMinor: 9000n, // ₹90.00
        currency: 'INR',
        category: 'Beverages',
        allergens: [],
        dietaryFlags: ['VEG', 'VEGAN', 'GLUTEN_FREE'],
        isAvailable: true,
        preparationDurationMinutes: 2,
        stationRouting: 'BAR',
        version: 1,
        modifierGroups: [],
      },
      {
        id: 'item_whiskey_sour',
        tenantId: 'tenant_orbitox',
        companyId: 'company_bistro',
        locationId: 'loc_ludhiana',
        name: 'Oak Smoked Whiskey Sour',
        description: 'Bourbon, fresh lemon juice, sugar syrup, aromatic bitters, smoked with applewood.',
        basePriceMinor: 55000n, // ₹550.00
        currency: 'INR',
        category: 'Beverages',
        allergens: [],
        dietaryFlags: ['VEG'],
        isAvailable: true,
        preparationDurationMinutes: 4,
        stationRouting: 'BAR',
        version: 1,
        modifierGroups: [],
      },
    ];

    for (const item of items) {
      this.catalogService.upsertItem(item);
    }
  }
}

// Global singleton instance preserved across Next.js route compilations
const globalForRestaurant = globalThis as unknown as { restaurantRuntime?: RestaurantRuntimeManager };
export const restaurantRuntime = globalForRestaurant.restaurantRuntime || new RestaurantRuntimeManager();
globalForRestaurant.restaurantRuntime = restaurantRuntime;

