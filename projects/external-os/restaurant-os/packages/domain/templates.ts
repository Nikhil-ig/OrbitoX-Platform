/**
 * 🪐 RestaurantOS — Clean Starter Templates Catalog
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides clean, isolated starter templates for new tenant provisioning.
 * Guarantees zero pilot data leakage and zero default PINs.
 */

export interface StarterMenuItem {
  name: string;
  categoryName: string;
  basePriceMinor: number;
  station: 'TANDOOR' | 'CURRY' | 'BEVERAGE' | 'DESSERT' | 'GRILL' | 'KITCHEN';
  prepDurationMinutes: number;
  description: string;
  isVegetarian?: boolean;
}

export interface StarterTemplate {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  accentColor: string;
  fontHeading: string;
  fontBody: string;
  categories: string[];
  items: StarterMenuItem[];
  defaultTableCount: number;
}

export const CLEAN_STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'tmpl_starter_bistro',
    name: 'Atelier Contemporary Bistro',
    slug: 'contemporary-bistro',
    category: 'Bistro & Fine Casual',
    description: 'Modern artisanal bistro with wood-fired hearth items, craft beverages, and seasonal courses.',
    accentColor: '#C5A059',
    fontHeading: '"Cormorant Garamond", Georgia, serif',
    fontBody: '"Inter", -apple-system, sans-serif',
    categories: ['Small Plates', 'Hearth & Mains', 'Desserts', 'Beverages'],
    defaultTableCount: 6,
    items: [
      {
        name: 'Burrata with Roasted Figs',
        categoryName: 'Small Plates',
        basePriceMinor: 45000,
        station: 'KITCHEN',
        prepDurationMinutes: 8,
        description: 'Creamy artisanal burrata, caramelized Mission figs, wild rocket, 12-year balsamic glaze.',
        isVegetarian: true,
      },
      {
        name: 'Charcoal Smoked Chicken Skewers',
        categoryName: 'Small Plates',
        basePriceMinor: 48000,
        station: 'GRILL',
        prepDurationMinutes: 12,
        description: 'Free-range chicken thighs marinated in toasted spices, mint pomegranate emulsion.',
      },
      {
        name: 'Slow Braised Lamb Shank',
        categoryName: 'Hearth & Mains',
        basePriceMinor: 85000,
        station: 'KITCHEN',
        prepDurationMinutes: 18,
        description: 'Grass-fed lamb shank, saffron potato purée, glazed winter baby carrots, rosemary jus.',
      },
      {
        name: 'Wood-Fired Wild Mushroom Risotto',
        categoryName: 'Hearth & Mains',
        basePriceMinor: 62000,
        station: 'KITCHEN',
        prepDurationMinutes: 14,
        description: 'Acquerello carnaroli rice, morels, porcini dust, 24-month Parmigiano-Reggiano.',
        isVegetarian: true,
      },
      {
        name: 'Single Origin Dark Chocolate Fondant',
        categoryName: 'Desserts',
        basePriceMinor: 38000,
        station: 'DESSERT',
        prepDurationMinutes: 10,
        description: '70% Valrhona lava cake, Madagascar vanilla bean gelato, candied hazelnut praline.',
        isVegetarian: true,
      },
      {
        name: 'Signature Hibiscus Rose Sparkler',
        categoryName: 'Beverages',
        basePriceMinor: 24000,
        station: 'BEVERAGE',
        prepDurationMinutes: 5,
        description: 'Cold-steeped organic hibiscus, Kashmiri rose petal extract, sparkling mineral water.',
        isVegetarian: true,
      },
    ],
  },
  {
    id: 'tmpl_quick_service',
    name: 'Swift Gourmet QSR',
    slug: 'quick-service',
    category: 'Fast Casual',
    description: 'High-velocity smashburgers, craft bowls, fresh sides, and shake bar.',
    accentColor: '#E65100',
    fontHeading: '"Outfit", -apple-system, sans-serif',
    fontBody: '"Inter", -apple-system, sans-serif',
    categories: ['Burgers & Wraps', 'Loaded Bowls', 'Sides', 'Craft Shakes'],
    defaultTableCount: 8,
    items: [
      {
        name: 'Double Truffle Smashburger',
        categoryName: 'Burgers & Wraps',
        basePriceMinor: 38000,
        station: 'GRILL',
        prepDurationMinutes: 7,
        description: 'Two smashed patties, black truffle aioli, aged cheddar, toasted brioche bun.',
      },
      {
        name: 'Spicy Paneer Tikka Wrap',
        categoryName: 'Burgers & Wraps',
        basePriceMinor: 29000,
        station: 'KITCHEN',
        prepDurationMinutes: 6,
        description: 'Grilled spiced paneer, pickled onions, mint chutney, toasted whole wheat wrap.',
        isVegetarian: true,
      },
      {
        name: 'Crispy Rosemary Truffle Fries',
        categoryName: 'Sides',
        basePriceMinor: 18000,
        station: 'KITCHEN',
        prepDurationMinutes: 5,
        description: 'Hand-cut Idaho russets, fresh rosemary, white truffle oil, grated parmesan.',
        isVegetarian: true,
      },
      {
        name: 'Belgian Chocolate Hazelnut Shake',
        categoryName: 'Craft Shakes',
        basePriceMinor: 22000,
        station: 'BEVERAGE',
        prepDurationMinutes: 4,
        description: 'Thick churned whole-milk ice cream, Belgian cocoa, hazelnut butter.',
        isVegetarian: true,
      },
    ],
  },
  {
    id: 'tmpl_cafe_bakery',
    name: 'Artisan Roast & Bakery',
    slug: 'cafe-bakery',
    category: 'Cafe & Bakery',
    description: 'Specialty espresso bar, sourdough toasts, viennoiserie, and light brunch.',
    accentColor: '#6D4C41',
    fontHeading: '"Playfair Display", Georgia, serif',
    fontBody: '"Inter", -apple-system, sans-serif',
    categories: ['Espresso & Brews', 'All Day Toast', 'Fresh Pastries', 'Botanical Teas'],
    defaultTableCount: 6,
    items: [
      {
        name: 'Single Origin Flat White',
        categoryName: 'Espresso & Brews',
        basePriceMinor: 24000,
        station: 'BEVERAGE',
        prepDurationMinutes: 3,
        description: 'Double ristretto pull of Ethiopian Yirgacheffe, silky textured microfoam.',
        isVegetarian: true,
      },
      {
        name: 'Smashed Avocado & Poached Egg Toast',
        categoryName: 'All Day Toast',
        basePriceMinor: 36000,
        station: 'KITCHEN',
        prepDurationMinutes: 8,
        description: 'House sourdough, hass avocado, pasture-raised egg, dukkah seed crumble.',
      },
      {
        name: 'Twice-Baked Almond Croissant',
        categoryName: 'Fresh Pastries',
        basePriceMinor: 21000,
        station: 'DESSERT',
        prepDurationMinutes: 2,
        description: 'All-butter lamination, frangipane almond cream, toasted slivered almonds.',
        isVegetarian: true,
      },
    ],
  },
];

export function getCleanStarterTemplate(templateId?: string): StarterTemplate {
  if (!templateId) return CLEAN_STARTER_TEMPLATES[0];
  const found = CLEAN_STARTER_TEMPLATES.find((t) => t.id === templateId || t.slug === templateId);
  return found || CLEAN_STARTER_TEMPLATES[0];
}
