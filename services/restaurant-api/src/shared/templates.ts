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
  {
    id: 'saffron',
    name: 'Saffron Contemporary Indian',
    slug: 'saffron',
    category: 'Fine Casual Indian',
    description: 'Warm terracotta & turmeric gold, tandoor hearth skewers, rich curries, and artisanal breads.',
    accentColor: '#FB923C',
    fontHeading: '"Cormorant Garamond", Georgia, serif',
    fontBody: '"Inter", -apple-system, sans-serif',
    categories: ['Starters', 'Mains', 'Breads & Rice', 'Desserts', 'Beverages'],
    defaultTableCount: 14,
    items: [
      {
        name: 'Tandoori Murgh Half',
        categoryName: 'Starters',
        basePriceMinor: 38000,
        station: 'GRILL',
        prepDurationMinutes: 14,
        description: 'Spring chicken on bone, Kashmiri deggi mirch, hung curd marinade, smoked mustard oil.',
      },
      {
        name: 'Hara Bhara Kebab',
        categoryName: 'Starters',
        basePriceMinor: 29000,
        station: 'KITCHEN',
        prepDurationMinutes: 10,
        description: 'Spinach, green pea and roasted chana patties spiced with raw mango, mint emulsion.',
        isVegetarian: true,
      },
      {
        name: 'Old Delhi Butter Chicken',
        categoryName: 'Mains',
        basePriceMinor: 42000,
        station: 'KITCHEN',
        prepDurationMinutes: 12,
        description: 'Charcoal-grilled tandoori chicken simmered in a velvety San Marzano tomato & butter gravy.',
      },
      {
        name: 'Dal Makhani Slow-Simmered',
        categoryName: 'Mains',
        basePriceMinor: 31000,
        station: 'KITCHEN',
        prepDurationMinutes: 8,
        description: 'Whole black urad lentils stewed for 24 hours on slow charcoal, finished with white butter.',
        isVegetarian: true,
      },
      {
        name: 'Paneer Tikka Masala',
        categoryName: 'Mains',
        basePriceMinor: 36000,
        station: 'KITCHEN',
        prepDurationMinutes: 12,
        description: 'Tandoor-charred malai paneer, bell pepper confetti, spiced onion tomato masala.',
        isVegetarian: true,
      },
      {
        name: 'Butter Garlic Naan',
        categoryName: 'Breads & Rice',
        basePriceMinor: 9000,
        station: 'KITCHEN',
        prepDurationMinutes: 4,
        description: 'Tandoor-baked refined flour bread brushed with melted butter and fresh crushed garlic.',
        isVegetarian: true,
      },
      {
        name: 'Gulab Jamun with Rabri',
        categoryName: 'Desserts',
        basePriceMinor: 18000,
        station: 'DESSERT',
        prepDurationMinutes: 5,
        description: 'Warm khoya dumplings soaked in saffron syrup, served with chilled pistachio rabri.',
        isVegetarian: true,
      },
      {
        name: 'Kesar Pista Mango Lassi',
        categoryName: 'Beverages',
        basePriceMinor: 16000,
        station: 'BEVERAGE',
        prepDurationMinutes: 3,
        description: 'Churned Alphonso mango pulp, creamy whole milk curd, saffron strands, slivered pistachios.',
        isVegetarian: true,
      },
    ],
  },
  {
    id: 'ember',
    name: 'Ember Charcoal Hearth & Fire',
    slug: 'ember',
    category: 'Steakhouse & Grill',
    description: 'Charcoal hearth & dark fire, smoked cuts, wood-fired mains, and craft brew bar.',
    accentColor: '#E06D53',
    fontHeading: '"Cinzel", Georgia, serif',
    fontBody: '"Inter", -apple-system, sans-serif',
    categories: ['Smoked Starters', 'Hearth Cuts & Mains', 'Sides', 'Desserts', 'Craft Brews'],
    defaultTableCount: 12,
    items: [
      {
        name: 'Charcoal Smoked Chicken Skewers',
        categoryName: 'Smoked Starters',
        basePriceMinor: 48000,
        station: 'GRILL',
        prepDurationMinutes: 12,
        description: 'Free-range chicken thighs marinated in toasted spices, mint pomegranate emulsion.',
      },
      {
        name: 'Slow Braised Lamb Shank',
        categoryName: 'Hearth Cuts & Mains',
        basePriceMinor: 85000,
        station: 'KITCHEN',
        prepDurationMinutes: 18,
        description: 'Grass-fed lamb shank, saffron potato purée, glazed winter baby carrots, rosemary jus.',
      },
      {
        name: 'Crispy Rosemary Truffle Fries',
        categoryName: 'Sides',
        basePriceMinor: 18000,
        station: 'KITCHEN',
        prepDurationMinutes: 5,
        description: 'Hand-cut russet potatoes, fresh rosemary, white truffle oil, shaved parmesan.',
        isVegetarian: true,
      },
      {
        name: 'Valrhona Dark Chocolate Fondant',
        categoryName: 'Desserts',
        basePriceMinor: 38000,
        station: 'DESSERT',
        prepDurationMinutes: 10,
        description: '70% Valrhona lava cake, Madagascar vanilla bean gelato, candied hazelnut praline.',
        isVegetarian: true,
      },
    ],
  },
  {
    id: 'sage',
    name: 'Sage Botanical Café & Bakery',
    slug: 'sage',
    category: 'Café & Bakery',
    description: 'Fresh botanical & café bakery, specialty espresso, sourdough toasts, and light brunch.',
    accentColor: '#34D399',
    fontHeading: '"Playfair Display", Georgia, serif',
    fontBody: '"Inter", -apple-system, sans-serif',
    categories: ['Espresso & Brews', 'All Day Toast', 'Fresh Pastries', 'Botanical Teas'],
    defaultTableCount: 10,
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
      {
        name: 'Signature Hibiscus Rose Sparkler',
        categoryName: 'Botanical Teas',
        basePriceMinor: 24000,
        station: 'BEVERAGE',
        prepDurationMinutes: 4,
        description: 'Cold-steeped organic hibiscus, Kashmiri rose petal extract, sparkling mineral water.',
        isVegetarian: true,
      },
    ],
  },
  {
    id: 'ocean',
    name: 'Ocean Coastal Seafood & Brass',
    slug: 'ocean',
    category: 'Coastal Dining',
    description: 'Deep indigo & coastal brass, fresh catch, coconut curries, and craft cocktails.',
    accentColor: '#38BDF8',
    fontHeading: '"Outfit", -apple-system, sans-serif',
    fontBody: '"Inter", -apple-system, sans-serif',
    categories: ['Raw Bar & Starters', 'Coastal Mains', 'Sides & Breads', 'Cocktails'],
    defaultTableCount: 12,
    items: [
      {
        name: 'Amritsari Fish Fry',
        categoryName: 'Raw Bar & Starters',
        basePriceMinor: 44000,
        station: 'GRILL',
        prepDurationMinutes: 11,
        description: 'Crispy carom-spiced river sole fillet, mint radish salad, lemon wedge.',
      },
      {
        name: 'Goan Prawn Curry with Steamed Rice',
        categoryName: 'Coastal Mains',
        basePriceMinor: 52000,
        station: 'KITCHEN',
        prepDurationMinutes: 14,
        description: 'Jumbo coastal prawns simmered in freshly ground coconut, red chilli, and kokum gravy.',
      },
      {
        name: 'Butter Garlic Naan',
        categoryName: 'Sides & Breads',
        basePriceMinor: 9000,
        station: 'KITCHEN',
        prepDurationMinutes: 4,
        description: 'Tandoor-baked refined flour bread brushed with melted butter and fresh crushed garlic.',
        isVegetarian: true,
      },
      {
        name: 'Kaffir Lime Coconut Cooler',
        categoryName: 'Cocktails',
        basePriceMinor: 26000,
        station: 'BEVERAGE',
        prepDurationMinutes: 4,
        description: 'Tender coconut water, muddled kaffir lime leaves, lemongrass infusion, soda float.',
        isVegetarian: true,
      },
    ],
  },
];

export function getCleanStarterTemplate(templateId?: string): StarterTemplate {
  if (!templateId) return CLEAN_STARTER_TEMPLATES[0];
  const found = CLEAN_STARTER_TEMPLATES.find((t) => t.id === templateId || t.slug === templateId);
  if (!found) {
    throw new Error(`INVALID_STARTER_TEMPLATE: Template "${templateId}" is not recognized in the starter catalogue.`);
  }
  return found;
}
