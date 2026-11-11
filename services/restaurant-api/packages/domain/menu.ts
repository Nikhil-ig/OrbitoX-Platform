export interface ModifierOption {
  id: string;
  name: string;
  priceDeltaMinor: number;
  formattedPriceDelta?: string;
  isDefault?: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string;
  description?: string;
  minSelections: number; // 0 = optional, 1 = mandatory single-select
  maxSelections: number; // 1 = radio button, >1 = multi-select checkboxes
  options: ModifierOption[];
}

export interface StorefrontComponentNode {
  id: string;
  type: string;
  name?: string;
  layout?: string;
  props?: Record<string, any>;
  children?: StorefrontComponentNode[];
  dataBinding?: {
    entity: string;
    filter?: Record<string, any>;
  };
}

export interface StorefrontSection {
  id: string;
  type: string;
  title?: string;
  enabled: boolean;
  order: number;
  properties?: Record<string, any>;
  children?: StorefrontComponentNode[];
}

export interface StorefrontDocument {
  version: string;
  templateId: string;
  themeTokens: Record<string, string>;
  sections: StorefrontSection[];
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  displayOrder: number;
  isArchived?: boolean;
  color?: string;
}

export const DEFAULT_CATEGORIES: MenuCategory[] = [
  { id: 'cat_starters', name: 'Starters', description: 'Tandoori skewers, spiced kebabs, and crisp starters', displayOrder: 1 },
  { id: 'cat_mains', name: 'Mains', description: 'Rich gravies, dum biryanis, and royal curries', displayOrder: 2 },
  { id: 'cat_breads', name: 'Breads', description: 'Charcoal clay oven naans, rotis, and parathas', displayOrder: 3 },
  { id: 'cat_beverages', name: 'Beverages', description: 'Artisanal cocktails, lassies, and craft drinks', displayOrder: 4 },
  { id: 'cat_desserts', name: 'Desserts', description: 'Traditional slow-cooked desserts and kulfis', displayOrder: 5 },
];

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  basePriceMinor: number;
  formattedPrice: string;
  category: string;
  categoryId?: string;
  station: 'TANDOOR' | 'CURRY_LINE' | 'BAR' | 'EXPO' | 'DESSERT';
  prepDurationMinutes: number;
  allergens: string[];
  dietaryFlags: ('VEG' | 'NON_VEG' | 'VEGAN' | 'GLUTEN_FREE')[];
  story?: string;
  pairingSuggestions?: string[];
  isPopular?: boolean;
  isSignature?: boolean;
  modifierGroups?: ModifierGroup[];
  imageUrl?: string;
  isArchived?: boolean;
  hsnCode?: string;
}

export interface BranchMenuOverride {
  id?: string;
  itemId: string;
  branchId: string;
  isAvailable: boolean;          // true = available, false = 86'd / sold out at this branch
  priceOverrideMinor?: number;   // if defined, overrides MenuItem.basePriceMinor
  formattedPriceOverride?: string;
  customPrepMinutes?: number;
}

export interface ResolvedMenuItem extends MenuItem {
  isAvailableAtBranch: boolean;
  effectivePriceMinor: number;
  effectiveFormattedPrice: string;
  isPriceOverridden: boolean;
  sourceBranchId: string;
}



export const DEFAULT_BRANCH_MENU_OVERRIDES: BranchMenuOverride[] = [
  // Delhi Connaught Place premium metropolitan overrides
  {
    itemId: 'item_butter_chicken',
    branchId: 'branch_del',
    isAvailable: true,
    priceOverrideMinor: 58000, // ₹580.00 in Delhi CP vs ₹540.00 base
    formattedPriceOverride: '₹580.00',
  },
  {
    itemId: 'item_dal_makhani',
    branchId: 'branch_del',
    isAvailable: false, // 86'd / sold out at Delhi CP branch today
  },
  // Chandigarh Sector 17 patio overrides
  {
    itemId: 'item_gulab_jamun',
    branchId: 'branch_chd',
    isAvailable: true,
    priceOverrideMinor: 24000, // ₹240.00 in Chandigarh vs ₹220.00 base
    formattedPriceOverride: '₹240.00',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Default Floor / Service Areas

export const DEFAULT_MENU: MenuItem[] = [
  {
    id: 'item_paneer_tikka',
    name: 'Paneer Tikka Charcoal Grilled',
    description: 'Cottage cheese marinated in Kashmiri chili, hung curd, and roasted gram flour.',
    basePriceMinor: 35000,
    formattedPrice: '₹350.00',
    category: 'Starters',
    station: 'TANDOOR',
    prepDurationMinutes: 12,
    allergens: ['DAIRY'],
    dietaryFlags: ['VEG'],
    isPopular: true,
    isSignature: true,
    story: 'Skewered on seasoned iron rods, seared at 450°C over charcoal embers.',
    pairingSuggestions: ['item_garlic_naan', 'item_mango_lassi'],
    imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800&auto=format&fit=crop&q=80',
    modifierGroups: [
      {
        id: 'mod_paneer_spice',
        name: 'Spice Profile',
        description: 'Select your preferred tandoori heat level',
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: 'm_mild', name: 'Mild Herb Infusion', priceDeltaMinor: 0, isDefault: false },
          { id: 'm_medium', name: 'Classic Kashmiri Spiced (Medium)', priceDeltaMinor: 0, isDefault: true },
          { id: 'm_hot', name: 'Fiery Angara Embers (Extra Spicy)', priceDeltaMinor: 2000, formattedPriceDelta: '+₹20.00' },
        ],
      },
      {
        id: 'mod_paneer_accompaniment',
        name: 'Chutney & Accompaniments',
        description: 'House-made traditional accompaniments',
        minSelections: 0,
        maxSelections: 2,
        options: [
          { id: 'm_mint_chutney', name: 'Pudina Mint Coriander Chutney', priceDeltaMinor: 0, isDefault: true },
          { id: 'm_sirka_pyaz', name: 'Pickled Sirka Pearl Onions', priceDeltaMinor: 2000, formattedPriceDelta: '+₹20.00' },
          { id: 'm_smoked_butter', name: 'Smoked Charcoal Butter Glaze', priceDeltaMinor: 3000, formattedPriceDelta: '+₹30.00' },
        ],
      },
    ],
  },
  {
    id: 'item_fish_tikka',
    name: 'Amritsari Fish Tikka',
    description: 'River sole chunks rubbed with ajwain carom seeds, yellow chili, and mustard oil.',
    basePriceMinor: 48000,
    formattedPrice: '₹480.00',
    category: 'Starters',
    station: 'TANDOOR',
    prepDurationMinutes: 14,
    allergens: ['FISH'],
    dietaryFlags: ['NON_VEG'],
    isPopular: true,
    story: 'Fresh river sole steeped in coarse cold-pressed mustard oil.',
    pairingSuggestions: ['item_butter_naan'],
    imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&auto=format&fit=crop&q=80',
    modifierGroups: [
      {
        id: 'mod_fish_prep',
        name: 'Preparation Style',
        description: 'Choose your desired hearth crust',
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: 'm_charred_tandoor', name: 'Tandoori Charred Embers', priceDeltaMinor: 0, isDefault: true },
          { id: 'm_amritsari_crust', name: 'Crispy Amritsari Fried Crust', priceDeltaMinor: 3000, formattedPriceDelta: '+₹30.00' },
        ],
      },
      {
        id: 'mod_fish_citrus',
        name: 'Citrus & Dip Accents',
        minSelections: 0,
        maxSelections: 1,
        options: [
          { id: 'm_kaffir_lime', name: 'Kaffir Lime Tartar Dip', priceDeltaMinor: 0, isDefault: true },
          { id: 'm_mooli_laccha', name: 'Radish Mooli Laccha with Chaat Masala', priceDeltaMinor: 2000, formattedPriceDelta: '+₹20.00' },
        ],
      },
    ],
  },
  {
    id: 'item_dal_makhani',
    name: 'Dal Makhani Slow-Simmered (24 hrs)',
    description: 'Black lentils slow cooked overnight on charcoal embers with churned butter.',
    basePriceMinor: 38000,
    formattedPrice: '₹380.00',
    category: 'Mains',
    station: 'CURRY_LINE',
    prepDurationMinutes: 14,
    allergens: ['DAIRY'],
    dietaryFlags: ['VEG'],
    isPopular: true,
    isSignature: true,
    story: '24 hours in heavy brass handis over dying embers.',
    pairingSuggestions: ['item_butter_naan', 'item_jeera_rice'],
    imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&auto=format&fit=crop&q=80',
    modifierGroups: [
      {
        id: 'mod_dal_richness',
        name: 'Gravy Richness',
        description: 'Artisanal dairy finish',
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: 'm_classic_butter', name: 'Classic Velvet Butter (Traditional)', priceDeltaMinor: 0, isDefault: true },
          { id: 'm_double_makhan', name: 'Double White Farmhouse Makhan', priceDeltaMinor: 4000, formattedPriceDelta: '+₹40.00' },
        ],
      },
      {
        id: 'mod_dal_sides',
        name: 'Side Accompaniment',
        minSelections: 0,
        maxSelections: 1,
        options: [
          { id: 'm_burani_raita', name: 'Burani Garlic Raita Cup', priceDeltaMinor: 5000, formattedPriceDelta: '+₹50.00' },
          { id: 'm_kachumber', name: 'Crisp Kachumber Salad Bowl', priceDeltaMinor: 3000, formattedPriceDelta: '+₹30.00' },
        ],
      },
    ],
  },
  {
    id: 'item_butter_chicken',
    name: 'Murgh Makhani (Old Delhi Style)',
    description: 'Smoked chicken tikka simmered in velvet tomato, fenugreek, and honey sauce.',
    basePriceMinor: 49000,
    formattedPrice: '₹490.00',
    category: 'Mains',
    station: 'CURRY_LINE',
    prepDurationMinutes: 15,
    allergens: ['DAIRY'],
    dietaryFlags: ['NON_VEG'],
    isPopular: true,
    story: 'Old Delhi recipe using sun-ripened tomatoes and wild blossom honey.',
    pairingSuggestions: ['item_butter_naan'],
    imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&auto=format&fit=crop&q=80',
    modifierGroups: [
      {
        id: 'mod_chicken_finish',
        name: 'Sauce Finish',
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: 'm_delhi_velvet', name: 'Old Delhi Velvet (Traditional)', priceDeltaMinor: 0, isDefault: true },
          { id: 'm_extra_smoked_cream', name: 'Extra Smoked Honey & Clotted Cream', priceDeltaMinor: 4000, formattedPriceDelta: '+₹40.00' },
        ],
      },
      {
        id: 'mod_chicken_sides',
        name: 'Fresh Garnish',
        minSelections: 0,
        maxSelections: 1,
        options: [
          { id: 'm_laccha_pyaz', name: 'Crisp Laccha Onion & Green Chili', priceDeltaMinor: 2000, formattedPriceDelta: '+₹20.00' },
          { id: 'm_garlic_raita', name: 'Burani Roasted Garlic Raita', priceDeltaMinor: 5000, formattedPriceDelta: '+₹50.00' },
        ],
      },
    ],
  },
  {
    id: 'item_butter_naan',
    name: 'Crisp Butter Naan',
    description: 'Tandoor-baked refined flour bread brushed with salted farmhouse butter.',
    basePriceMinor: 7000,
    formattedPrice: '₹70.00',
    category: 'Breads',
    station: 'TANDOOR',
    prepDurationMinutes: 5,
    allergens: ['DAIRY', 'WHEAT'],
    dietaryFlags: ['VEG'],
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=800&auto=format&fit=crop&q=80',
    modifierGroups: [
      {
        id: 'mod_naan_finish',
        name: 'Butter Glaze',
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: 'm_farm_butter', name: 'Salted Farmhouse Butter', priceDeltaMinor: 0, isDefault: true },
          { id: 'm_desi_ghee', name: 'Pure Desi Ghee Brushed', priceDeltaMinor: 1500, formattedPriceDelta: '+₹15.00' },
          { id: 'm_olive_herb', name: 'Extra Virgin Olive Oil & Herb', priceDeltaMinor: 2000, formattedPriceDelta: '+₹20.00' },
        ],
      },
    ],
  },
  {
    id: 'item_tandoori_roti',
    name: 'Tandoori Roti (Whole Wheat)',
    description: 'Crisp whole-wheat hearth bread baked in clay tandoor. Pure, uncustomized speed staple.',
    basePriceMinor: 3500,
    formattedPrice: '₹35.00',
    category: 'Breads',
    station: 'TANDOOR',
    prepDurationMinutes: 4,
    allergens: ['WHEAT'],
    dietaryFlags: ['VEG'],
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=800&auto=format&fit=crop&q=80',
    modifierGroups: [],
  },
  {
    id: 'item_garlic_naan',
    name: 'Roasted Garlic Butter Naan',
    description: 'Topped with roasted minced garlic, fresh coriander, and nigella seeds.',
    basePriceMinor: 9000,
    formattedPrice: '₹90.00',
    category: 'Breads',
    station: 'TANDOOR',
    prepDurationMinutes: 6,
    allergens: ['DAIRY', 'WHEAT'],
    dietaryFlags: ['VEG'],
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80',
    modifierGroups: [
      {
        id: 'mod_garlic_style',
        name: 'Garlic Intensity',
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: 'm_garlic_roasted', name: 'Golden Roasted Garlic & Nigella (Standard)', priceDeltaMinor: 0, isDefault: true },
          { id: 'm_garlic_crisp', name: 'Extra Charred Garlic & Fresh Coriander', priceDeltaMinor: 1500, formattedPriceDelta: '+₹15.00' },
        ],
      },
    ],
  },
  {
    id: 'item_mango_lassi',
    name: 'Alphonso Mango Lassi',
    description: 'Chilled artisanal yogurt whipped with Ratnagiri Alphonso mango pulp.',
    basePriceMinor: 14000,
    formattedPrice: '₹140.00',
    category: 'Beverages',
    station: 'BAR',
    prepDurationMinutes: 3,
    allergens: ['DAIRY'],
    dietaryFlags: ['VEG'],
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=800&auto=format&fit=crop&q=80',
    modifierGroups: [
      {
        id: 'mod_lassi_sweetness',
        name: 'Sweetness & Base',
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: 'm_lassi_std', name: 'Artisan Raw Sugar (Standard)', priceDeltaMinor: 0, isDefault: true },
          { id: 'm_lassi_honey', name: 'Wild Blossom Honey (Low Glycemic)', priceDeltaMinor: 2000, formattedPriceDelta: '+₹20.00' },
        ],
      },
      {
        id: 'mod_lassi_toppings',
        name: 'Artisanal Garnishes',
        minSelections: 0,
        maxSelections: 2,
        options: [
          { id: 'm_saffron_pista', name: 'Kashmiri Saffron & Iranian Pistachio Slivers', priceDeltaMinor: 3000, formattedPriceDelta: '+₹30.00' },
          { id: 'm_basil_seed', name: 'Sweet Basil Seed Bloom (Sabja)', priceDeltaMinor: 1500, formattedPriceDelta: '+₹15.00' },
        ],
      },
    ],
  },
  {
    id: 'item_gulab_jamun',
    name: 'Warm Gulab Jamun with Rabri',
    description: 'Fried milk dumplings soaked in saffron-cardamom syrup with lachha rabri.',
    basePriceMinor: 19000,
    formattedPrice: '₹190.00',
    category: 'Desserts',
    station: 'DESSERT',
    prepDurationMinutes: 2,
    allergens: ['DAIRY', 'NUTS'],
    dietaryFlags: ['VEG'],
    isSignature: true,
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80',
    modifierGroups: [
      {
        id: 'mod_jamun_temp',
        name: 'Serving Temperature',
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: 'm_jamun_steaming', name: 'Steaming Hot with Chilled Rabri (Classic)', priceDeltaMinor: 0, isDefault: true },
          { id: 'm_jamun_warm_only', name: 'Warm Confection Only (No Rabri)', priceDeltaMinor: 0, isDefault: false },
        ],
      },
      {
        id: 'mod_jamun_luxury',
        name: 'Royal Accents',
        minSelections: 0,
        maxSelections: 1,
        options: [
          { id: 'm_silver_leaf', name: 'Edible Pure Silver Vark & Crushed Almonds', priceDeltaMinor: 3000, formattedPriceDelta: '+₹30.00' },
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
