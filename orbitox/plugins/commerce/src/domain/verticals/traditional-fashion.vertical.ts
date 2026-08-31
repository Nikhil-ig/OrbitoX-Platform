export interface VerticalAttributeOption {
  id: string;
  name: string;
  options: string[];
}

export interface VerticalPresetConfig {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  badge: string;
  sampleStoreName: string;
  sampleTagline: string;
  heroHeadline: string;
  heroSubheadline: string;
  currency: string;
  defaultThemeId: string;
  supportedThemes: string[];
  materials: string[];
  embroideryStyles: string[];
  occasions: string[];
  defaultSizes: { label: string; uk: string; cm: string; inches: string }[];
  careInstructions: string[];
  sellingPoints: { icon: string; title: string; desc: string }[];
  whatsappTemplate: (storeName: string, productTitle: string, variant: string, price: string, url: string) => string;
  sampleProducts: Array<{
    title: string;
    category: string;
    price: number;
    comparePrice: number;
    shortDesc: string;
    description: string;
    material: string;
    embroidery: string;
    occasion: string;
    image: string;
    tags: string[];
  }>;
}

export const TRADITIONAL_FASHION_VERTICALS: Record<string, VerticalPresetConfig> = {
  'punjabi-jutti': {
    id: 'punjabi-jutti',
    name: 'Punjabi Jutti & Mojaris',
    tagline: 'Handcrafted Heritage Footwear with Bite-Free Comfort',
    description: 'Specialized for authentic Patiala & Amritsari handcrafted juttis, zardozi embroidery, bridal mojari collections, and triple-cushioned comfort sole footwear.',
    icon: '✨',
    badge: 'Flagship Vertical',
    sampleStoreName: 'Patiala Shahi Jutti House',
    sampleTagline: 'Royal Handcrafted Punjabi Juttis & Phulkari Couture',
    heroHeadline: 'Heirloom Punjabi Juttis Handcrafted for Royalty',
    heroSubheadline: 'Triple-cushioned memory foam soles and pure 24K dabka-zardozi wire embroidery for bite-free elegance.',
    currency: 'INR',
    defaultThemeId: 'punjabi-jutti-royal',
    supportedThemes: ['punjabi-jutti-royal', 'punjabi-jutti-heritage-ivory', 'punjabi-jutti-noor-emerald', 'punjabi-jutti-pastel-blossom'],
    materials: ['Pure Raw Silk', 'Royal Velvet', 'Hand-treated Genuine Suede', 'Organza Silk', 'Pure Vegetable-Tanned Leather', 'Brocade / Kimkhab'],
    embroideryStyles: ['24K Dabka & Zardozi', 'Authentic Patiala Phulkari', 'Mirror Work (Shisha)', 'Cutdana & Real Seed Pearls', 'Gota Patti & Tilla', 'Resham Threadwork'],
    occasions: ['Bridal / Shaadi Mandap', 'Mehendi & Haldi', 'Sangeet & Cocktail', 'Festive Celebrations', 'Everyday Royal Casual', "Groom's Sherwani"],
    defaultSizes: [
      { label: '36', uk: 'UK 3 / US 5.5', cm: '23.0 cm', inches: '9.06"' },
      { label: '37', uk: 'UK 4 / US 6.5', cm: '23.7 cm', inches: '9.33"' },
      { label: '38', uk: 'UK 5 / US 7.5', cm: '24.3 cm', inches: '9.57"' },
      { label: '39', uk: 'UK 6 / US 8.5', cm: '25.0 cm', inches: '9.84"' },
      { label: '40', uk: 'UK 7 / US 9.5', cm: '25.7 cm', inches: '10.12"' },
      { label: '41', uk: 'UK 8 / US 10.5', cm: '26.3 cm', inches: '10.35"' },
      { label: '42', uk: 'UK 9 / US 11.5', cm: '27.0 cm', inches: '10.63"' },
    ],
    careInstructions: [
      'Store in the provided muslin dust bag away from direct moisture.',
      'Wipe gently with a soft dry cloth after wearing.',
      'If slightly tight, apply mild mustard oil or moisturizer to the inner leather rim before first wear.',
      'Dry clean only for heavily embroidered zardozi & mirror surfaces.',
    ],
    sellingPoints: [
      { icon: '🛡️', title: '100% Bite-Free Guarantee', desc: 'Double memory foam padding to protect your heels during marathon sangeet dancing.' },
      { icon: '👑', title: 'Generational Craftsmanship', desc: 'Every pair is hand-sewn by master artisans in Punjab with centuries of lineage.' },
      { icon: '✨', title: 'Genuine Leather Soles', desc: 'Hand-cut, vegetable-tanned leather soles that mould to your feet over time.' },
      { icon: '📦', title: 'Worldwide Express Delivery', desc: 'Insured express shipping across India, USA, Canada, UK, Australia, & Gulf.' },
    ],
    whatsappTemplate: (storeName, productTitle, variant, price, url) => {
      return encodeURIComponent(
        `👋 *Namaste ${storeName}!* ✨\n\n` +
        `I would like to order this handcrafted jutti:\n\n` +
        `🛍️ *Product:* ${productTitle}\n` +
        `📏 *Size:* ${variant}\n` +
        `💰 *Price:* ${price}\n` +
        `🔗 *Product Link:* ${url}\n\n` +
        `Please confirm stock availability, size assistance, and dispatch time! 🙏`
      );
    },
    sampleProducts: [
      {
        title: 'Maharani Royal Zardozi Gold Bridal Jutti',
        category: 'Bridal & Trousseau',
        price: 3899,
        comparePrice: 4999,
        shortDesc: '24K Gold Wire Zardozi, Real Seed Pearls & Triple Padded Bite-Free Sole.',
        description: 'An iconic bridal masterpiece hand-embroidered with 24K gold wire zardozi, seed pearls, and shimmering sequins on pure raw silk. Features triple-padded memory foam cushioning and 100% genuine vegetable-tanned leather soles.',
        material: 'Pure Raw Silk & Genuine Leather',
        embroidery: '24K Dabka & Zardozi',
        occasion: 'Bridal / Shaadi Mandap',
        image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1000&auto=format&fit=crop',
        tags: ['Bridal', 'Zardozi', 'Gold', 'Wedding', 'Bestseller'],
      },
      {
        title: 'Noor Emerald Royal Velvet Jutti',
        category: 'Royal Velvet & Dabka',
        price: 3499,
        comparePrice: 4299,
        shortDesc: 'Plush Emerald Green Velvet with Antique Tilla Bullion Hand Embroidery.',
        description: 'Sumptuous deep bottle green velvet handcrafted with antique tilla bullion work and fine French wire. Engineered with extra heel arch support.',
        material: 'Plush Velvet',
        embroidery: 'Antique Tilla & French Wire',
        occasion: 'Sangeet & Cocktail',
        image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=1000&auto=format&fit=crop',
        tags: ['Velvet', 'Emerald', 'Sangeet', 'Tilla'],
      },
      {
        title: 'Patiala Virasat Heritage Phulkari Jutti',
        category: 'Heritage Phulkari',
        price: 2699,
        comparePrice: 3299,
        shortDesc: 'Vibrant Geometric Resham Threadwork Hand-Stitched on Organic Canvas.',
        description: 'Celebrates traditional Punjab folk artistry with geometric resham threadwork in marigold yellow, rani pink, and royal cobalt blue on pure silk base.',
        material: 'Organic Canvas & Silk',
        embroidery: 'Authentic Patiala Phulkari',
        occasion: 'Mehendi & Haldi',
        image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=1000&auto=format&fit=crop',
        tags: ['Phulkari', 'Mehendi', 'Resham', 'Festive'],
      },
      {
        title: 'Gulbahar Pastel Pearl Trousseau Jutti',
        category: 'Silk & Minimalist',
        price: 2999,
        comparePrice: 3799,
        shortDesc: 'Blush Pink Organza Silk with Delicate Seed Pearls & Shisha Mirror Accents.',
        description: 'Romantic blush pink jutti featuring delicate seed pearls and sparkling micro-mirrors, perfect for modern brides and bridesmaid hampers.',
        material: 'Blush Organza Silk',
        embroidery: 'Seed Pearls & Mirror Work',
        occasion: 'Festive Celebrations',
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop',
        tags: ['Pastel', 'Blush', 'Bridesmaid', 'Pearls'],
      },
    ],
  },

  'phulkari-couture': {
    id: 'phulkari-couture',
    name: 'Phulkari Dupattas & Suits',
    tagline: 'Generational Patiala Silk Thread Embroidery & Heritage Textiles',
    description: 'Designed for authentic handmade Bagh dupattas, Champa suits, Georgette sarees, and bridal trousseau handlooms.',
    icon: '🌸',
    badge: 'Artisan Heritage',
    sampleStoreName: 'Amritsar Phulkari Emporium',
    sampleTagline: 'Heirloom Hand-Embroidered Silk Bagh Dupattas & Suits',
    heroHeadline: 'Authentic Hand-Stitched Phulkari Dupattas & Heirlooms',
    heroSubheadline: 'Pure Chanderi, Georgette, and Tussar silk crafted with months of dedicated Patiala resham artisan work.',
    currency: 'INR',
    defaultThemeId: 'punjabi-jutti-heritage-ivory',
    supportedThemes: ['punjabi-jutti-heritage-ivory', 'punjabi-jutti-royal', 'punjabi-jutti-pastel-blossom'],
    materials: ['Pure Chanderi Silk', 'Tussar Georgette', 'Mulmul Cotton', 'Raw Matka Silk', 'Organza Tissue'],
    embroideryStyles: ['Heavy Bagh Work', 'Champa Border', 'Mirror & Gota Inlay', 'Sachi Phulkari Threadwork'],
    occasions: ['Shaadi Trousseau', 'Lohri & Baisakhi', 'Haldi / Mehendi', 'Temple & Pooja Ceremony'],
    defaultSizes: [
      { label: 'Standard 2.5m', uk: 'Dupatta', cm: '250 cm x 110 cm', inches: '98" x 43"' },
      { label: 'Grand Bridal 2.8m', uk: 'Bridal Chadar', cm: '280 cm x 120 cm', inches: '110" x 47"' },
    ],
    careInstructions: [
      'Strictly Dry Clean Only.',
      'Iron inside out under a light cotton cloth on low temperature.',
      'Refold every 3-4 months to preserve silk thread tension.',
    ],
    sellingPoints: [
      { icon: '🧵', title: '100% Hand-Embroidered', desc: 'Each bagh requires 45-60 days of meticulous manual artisan labor.' },
      { icon: '🌿', title: 'Pure Silk Resham', desc: 'Non-fading vibrant threads dyed with traditional botanical pigments.' },
      { icon: '🏷️', title: 'Artisan Authenticity Certificate', desc: 'Signed by the generational artisan cluster in Punjab.' },
    ],
    whatsappTemplate: (storeName, productTitle, variant, price, url) => {
      return encodeURIComponent(
        `👋 *Namaste ${storeName}!* 🌸\n\n` +
        `I am interested in ordering this Phulkari heirloom:\n\n` +
        `🛍️ *Item:* ${productTitle}\n` +
        `📏 *Dimension:* ${variant}\n` +
        `💰 *Price:* ${price}\n` +
        `🔗 *Link:* ${url}\n\n` +
        `Please share close-up fabric videos and order details! 🙏`
      );
    },
    sampleProducts: [
      {
        title: 'Shahi Patiala Bagh Heavy Resham Dupatta',
        category: 'Bridal Bagh',
        price: 8499,
        comparePrice: 11999,
        shortDesc: 'Geometric Gold & Crimson Threadwork Covering 100% Base Fabric.',
        description: 'A genuine heirloom-grade Bagh dupatta hand-embroidered by master craftswomen in Patiala over 500 hours on pure Chanderi silk base.',
        material: 'Pure Chanderi Silk',
        embroidery: 'Heavy Bagh Work',
        occasion: 'Shaadi Trousseau',
        image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=1000&auto=format&fit=crop',
        tags: ['Phulkari', 'Bagh', 'Bridal', 'Handmade'],
      },
    ],
  },

  'ethnic-bridal': {
    id: 'ethnic-bridal',
    name: 'Bridal Lehengas & Ethnic Couture',
    tagline: 'Bespoke Trousseau, Zardozi Anarkalis, and Sabyasachi-Inspired Ensembles',
    description: 'Tailored for bridal boutiques, designer couture houses, and bespoke ethnic wedding fashion.',
    icon: '👑',
    badge: 'Luxury Couture',
    sampleStoreName: 'Noor-e-Kashmir Couture',
    sampleTagline: 'Handcrafted Bridal Lehengas, Pashmina Shawls & Royal Velvet Gowns',
    heroHeadline: 'Unforgettable Bridal Masterpieces for Your Dream Wedding',
    heroSubheadline: 'Handcrafted with real silver tilla, Swarovski crystals, and luxurious silk brocades.',
    currency: 'INR',
    defaultThemeId: 'punjabi-jutti-noor-emerald',
    supportedThemes: ['punjabi-jutti-noor-emerald', 'punjabi-jutti-royal', 'punjabi-jutti-pastel-blossom'],
    materials: ['Silk Velvet', 'Banarasi Brocade', 'Pure Tissue Organza', 'Handwoven Pashmina'],
    embroideryStyles: ['Real Silver Tilla', 'Zardozi & Cutdana', 'Parsi Gara', 'Kashmiri Aari Work'],
    occasions: ['Grand Wedding', 'Reception Gala', 'Engagement', 'Cocktail Night'],
    defaultSizes: [
      { label: 'XS (Bust 32")', uk: 'UK 6', cm: '81 cm', inches: '32"' },
      { label: 'S (Bust 34")', uk: 'UK 8', cm: '86 cm', inches: '34"' },
      { label: 'M (Bust 36")', uk: 'UK 10', cm: '91 cm', inches: '36"' },
      { label: 'L (Bust 38")', uk: 'UK 12', cm: '96 cm', inches: '38"' },
      { label: 'XL (Bust 40")', uk: 'UK 14', cm: '101 cm', inches: '40"' },
      { label: 'Custom Made-to-Measure', uk: 'Bespoke', cm: 'Custom', inches: 'Custom' },
    ],
    careInstructions: [
      'Preserve in acid-free archival storage box.',
      'Professional luxury bridal dry clean only.',
    ],
    sellingPoints: [
      { icon: '📏', title: 'Video Call Fitting Assistance', desc: 'Master tailor video consultation to ensure 100% flawless fit.' },
      { icon: '💎', title: 'Museum-Quality Craftsmanship', desc: 'Detailed hand embroidery using authenticated premium metals.' },
      { icon: '✈️', title: 'White-Glove Global Shipping', desc: 'Secure DHL Express delivery with door-to-door concierge tracking.' },
    ],
    whatsappTemplate: (storeName, productTitle, variant, price, url) => {
      return encodeURIComponent(
        `👋 *Namaste ${storeName}!* 👑\n\n` +
        `I would like to book a bridal consultation for this couture piece:\n\n` +
        `🛍️ *Ensemble:* ${productTitle}\n` +
        `📏 *Size:* ${variant}\n` +
        `💰 *Price:* ${price}\n` +
        `🔗 *Link:* ${url}\n\n` +
        `Please let me know how to schedule a video measurement call! ✨`
      );
    },
    sampleProducts: [
      {
        title: 'Shahi Noor Emerald Velvet Bridal Lehenga',
        category: 'Bridal Lehengas',
        price: 48999,
        comparePrice: 59999,
        shortDesc: 'Heavy Silver Tilla & Real Zardozi Hand Embroidery on Deep Emerald Velvet.',
        description: 'An ethereal bridal ensemble crafted with 16-kali flared velvet lehenga, micro-velvet blouse, and dual organza dupattas.',
        material: 'Silk Velvet & Organza',
        embroidery: 'Real Silver Tilla & Zardozi',
        occasion: 'Grand Wedding',
        image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=1000&auto=format&fit=crop',
        tags: ['Bridal', 'Lehenga', 'Emerald', 'Velvet', 'Luxury'],
      },
    ],
  },
};

export function getVerticalConfig(verticalId: string = 'punjabi-jutti'): VerticalPresetConfig {
  const cfg = TRADITIONAL_FASHION_VERTICALS[verticalId];
  if (cfg) return cfg;
  return TRADITIONAL_FASHION_VERTICALS['punjabi-jutti']!;
}

export function getAllVerticals(): VerticalPresetConfig[] {
  return Object.values(TRADITIONAL_FASHION_VERTICALS);
}

