import { Theme, ThemeFilter, TierLevel } from './types';

export const DEFAULT_THEMES: Theme[] = [
  {
    id: 'theme_royal_regalia',
    slug: 'royal-regalia',
    name: 'Royal Regalia',
    description: 'Opulent palace aesthetic with gold filigree, emerald accents, and majestic regal typography.',
    occasionId: 'occ_wedding',
    occasionSlug: 'wedding',
    previewImages: [
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&q=80'
    ],
    thumbnailUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80',
    styleConfig: {
      fontHeading: 'Cinzel, Cormorant Garamond, serif',
      fontBody: 'Plus Jakarta Sans, sans-serif',
      primaryColor: '#D4AF37', // Gold
      secondaryColor: '#0E3A2F', // Deep Emerald
      accentColor: '#B8860B',
      backgroundColor: '#071510',
      cardBackgroundColor: 'rgba(14, 58, 47, 0.45)',
      textColor: '#FAF8F5',
      mutedTextColor: '#C5D1CB',
      borderRadius: 'lg',
      animationPreset: 'luxury',
      customCss: ''
    },
    supportedSections: [
      'hero',
      'countdown',
      'couple_profile',
      'story',
      'events_schedule',
      'venue_map',
      'gallery',
      'rsvp',
      'wishes_guestbook',
      'music_player'
    ],
    tier: 'PRO',
    isFeatured: true,
    isPopular: true,
    author: 'OrbitoX Studio',
    status: 'ACTIVE',
    tags: ['luxury', 'royal', 'traditional', 'indian', 'gold', 'palace'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'theme_celestial_gold',
    slug: 'celestial-gold',
    name: 'Celestial Gold',
    description: 'Deep midnight navy with starlight shimmer and champagne gold gradients. Epitome of timeless elegance.',
    occasionId: 'occ_wedding',
    occasionSlug: 'wedding',
    previewImages: [
      'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1200&q=80'
    ],
    thumbnailUrl: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80',
    styleConfig: {
      fontHeading: 'Playfair Display, serif',
      fontBody: 'Inter, sans-serif',
      primaryColor: '#F5D061',
      secondaryColor: '#1E293B',
      accentColor: '#E2B842',
      backgroundColor: '#0B1120',
      cardBackgroundColor: 'rgba(30, 41, 59, 0.6)',
      textColor: '#F8FAFC',
      mutedTextColor: '#94A3B8',
      borderRadius: 'md',
      animationPreset: 'romantic',
      customCss: ''
    },
    supportedSections: [
      'hero',
      'countdown',
      'couple_profile',
      'story',
      'events_schedule',
      'venue_map',
      'gallery',
      'rsvp',
      'wishes_guestbook',
      'music_player',
      'dress_code'
    ],
    tier: 'PREMIUM',
    isFeatured: true,
    isPopular: true,
    author: 'OrbitoX Studio',
    status: 'ACTIVE',
    tags: ['modern', 'starlight', 'celestial', 'navy', 'chic'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'theme_blush_botanical',
    slug: 'blush-botanical',
    name: 'Blush Botanical',
    description: 'Ethereal garden theme with soft rose petals, sage foliage, and romantic handwritten script accents.',
    occasionId: 'occ_wedding',
    occasionSlug: 'wedding',
    previewImages: [
      'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=1200&q=80'
    ],
    thumbnailUrl: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=600&q=80',
    styleConfig: {
      fontHeading: 'Cormorant Garamond, serif',
      fontBody: 'Outfit, sans-serif',
      primaryColor: '#E8A598', // Dusty Rose
      secondaryColor: '#52796F', // Sage green
      accentColor: '#DDA15E',
      backgroundColor: '#FAF7F5',
      cardBackgroundColor: '#FFFFFF',
      textColor: '#2D312E',
      mutedTextColor: '#6C757D',
      borderRadius: 'lg',
      animationPreset: 'subtle',
      customCss: ''
    },
    supportedSections: [
      'hero',
      'countdown',
      'couple_profile',
      'story',
      'events_schedule',
      'venue_map',
      'gallery',
      'rsvp',
      'wishes_guestbook'
    ],
    tier: 'FREE',
    isFeatured: true,
    isPopular: true,
    author: 'OrbitoX Studio',
    status: 'ACTIVE',
    tags: ['botanical', 'garden', 'blush', 'floral', 'romantic', 'light'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'theme_modern_minimalist',
    slug: 'modern-minimalist',
    name: 'Modern Minimalist',
    description: 'Architectural monochrome styling with bold typography, ample whitespace, and editorial poise.',
    occasionId: 'occ_wedding',
    occasionSlug: 'wedding',
    previewImages: [
      'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&q=80'
    ],
    thumbnailUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&q=80',
    styleConfig: {
      fontHeading: 'Syne, sans-serif',
      fontBody: 'Inter, sans-serif',
      primaryColor: '#18181B',
      secondaryColor: '#71717A',
      accentColor: '#09090B',
      backgroundColor: '#FAFAFA',
      cardBackgroundColor: '#FFFFFF',
      textColor: '#18181B',
      mutedTextColor: '#71717A',
      borderRadius: 'none',
      animationPreset: 'minimal',
      customCss: ''
    },
    supportedSections: [
      'hero',
      'countdown',
      'couple_profile',
      'story',
      'events_schedule',
      'venue_map',
      'gallery',
      'rsvp'
    ],
    tier: 'FREE',
    isFeatured: false,
    isPopular: true,
    author: 'OrbitoX Studio',
    status: 'ACTIVE',
    tags: ['minimalist', 'clean', 'editorial', 'contemporary'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'theme_neon_nocturne',
    slug: 'neon-nocturne',
    name: 'Neon Nocturne',
    description: 'Electric cyber glow, luminous gradients, and pumping party energy for birthdays and celebrations.',
    occasionId: 'occ_birthday',
    occasionSlug: 'birthday',
    previewImages: [
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80'
    ],
    thumbnailUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80',
    styleConfig: {
      fontHeading: 'Space Grotesk, sans-serif',
      fontBody: 'Outfit, sans-serif',
      primaryColor: '#A855F7', // Neon Purple
      secondaryColor: '#06B6D4', // Electric Cyan
      accentColor: '#EC4899', // Hot Pink
      backgroundColor: '#090514',
      cardBackgroundColor: 'rgba(23, 15, 38, 0.7)',
      textColor: '#F8FAFC',
      mutedTextColor: '#A1A1AA',
      borderRadius: 'lg',
      animationPreset: 'festive',
      customCss: ''
    },
    supportedSections: [
      'hero',
      'countdown',
      'person_profile',
      'events_schedule',
      'venue_map',
      'gallery',
      'rsvp',
      'wishes_guestbook',
      'music_player'
    ],
    tier: 'PRO',
    isFeatured: true,
    isPopular: true,
    author: 'OrbitoX Studio',
    status: 'ACTIVE',
    tags: ['neon', 'birthday', 'party', 'dark', 'vibrant'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'theme_vintage_parchment',
    slug: 'vintage-parchment',
    name: 'Vintage Parchment',
    description: 'Warm antique parchment texture, handcrafted wax seal aesthetics, and classical serif charm.',
    occasionId: 'occ_anniversary',
    occasionSlug: 'anniversary',
    previewImages: [
      'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=1200&q=80'
    ],
    thumbnailUrl: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=600&q=80',
    styleConfig: {
      fontHeading: 'Cinzel, serif',
      fontBody: 'Crimson Pro, serif',
      primaryColor: '#8C5E3A',
      secondaryColor: '#5C4033',
      accentColor: '#C49758',
      backgroundColor: '#F7F3E9',
      cardBackgroundColor: '#EFE9DC',
      textColor: '#2C1D11',
      mutedTextColor: '#6B5848',
      borderRadius: 'sm',
      animationPreset: 'romantic',
      customCss: ''
    },
    supportedSections: [
      'hero',
      'countdown',
      'couple_profile',
      'story',
      'gallery',
      'venue_map',
      'rsvp',
      'wishes_guestbook'
    ],
    tier: 'PRO',
    isFeatured: false,
    isPopular: false,
    author: 'OrbitoX Studio',
    status: 'ACTIVE',
    tags: ['vintage', 'parchment', 'heritage', 'classic'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'theme_pastel_wonderland',
    slug: 'pastel-wonderland',
    name: 'Pastel Wonderland',
    description: 'Delicate pastel clouds, soft confetti, and gentle animations ideal for baby showers and early birthdays.',
    occasionId: 'occ_baby_shower',
    occasionSlug: 'baby-shower',
    previewImages: [
      'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=1200&q=80'
    ],
    thumbnailUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&q=80',
    styleConfig: {
      fontHeading: 'Quicksand, sans-serif',
      fontBody: 'Plus Jakarta Sans, sans-serif',
      primaryColor: '#70B2FF',
      secondaryColor: '#FFAAA6',
      accentColor: '#FFD3B6',
      backgroundColor: '#F8FBFF',
      cardBackgroundColor: '#FFFFFF',
      textColor: '#1E293B',
      mutedTextColor: '#64748B',
      borderRadius: 'full',
      animationPreset: 'subtle',
      customCss: ''
    },
    supportedSections: [
      'hero',
      'countdown',
      'person_profile',
      'events_schedule',
      'venue_map',
      'rsvp',
      'gift_registry'
    ],
    tier: 'FREE',
    isFeatured: true,
    isPopular: false,
    author: 'OrbitoX Studio',
    status: 'ACTIVE',
    tags: ['baby', 'pastel', 'gentle', 'cute', 'kids'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'theme_executive_summit',
    slug: 'executive-summit',
    name: 'Executive Summit',
    description: 'Sleek dark obsidian with high-tech electric sapphire accents for summits, galas, and corporate events.',
    occasionId: 'occ_corporate',
    occasionSlug: 'corporate',
    previewImages: [
      'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200&q=80'
    ],
    thumbnailUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=600&q=80',
    styleConfig: {
      fontHeading: 'Plus Jakarta Sans, sans-serif',
      fontBody: 'Inter, sans-serif',
      primaryColor: '#2563EB',
      secondaryColor: '#0EA5E9',
      accentColor: '#38BDF8',
      backgroundColor: '#030712',
      cardBackgroundColor: '#111827',
      textColor: '#F9FAFB',
      mutedTextColor: '#9CA3AF',
      borderRadius: 'md',
      animationPreset: 'modern',
      customCss: ''
    },
    supportedSections: [
      'hero',
      'countdown',
      'person_profile',
      'events_schedule',
      'venue_map',
      'qna',
      'rsvp'
    ],
    tier: 'PREMIUM',
    isFeatured: true,
    isPopular: true,
    author: 'OrbitoX Studio',
    status: 'ACTIVE',
    tags: ['corporate', 'tech', 'summit', 'gala', 'blue'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'theme_enchanted_glasshouse',
    slug: 'enchanted-glasshouse',
    name: 'Enchanted Glasshouse',
    description: 'Deep midnight indigo velvet with glowing crystal glass panes, white wisteria blossoms, and warm candelabra amber.',
    occasionId: 'occ_wedding',
    occasionSlug: 'wedding',
    previewImages: [
      'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=1200&q=80'
    ],
    thumbnailUrl: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=600&q=80',
    styleConfig: {
      fontHeading: 'Cinzel, Cormorant Garamond, serif',
      fontBody: 'Outfit, sans-serif',
      primaryColor: '#E2C889',
      secondaryColor: '#2D1B4E',
      accentColor: '#D4B8E8',
      backgroundColor: '#090511',
      cardBackgroundColor: 'rgba(28, 16, 45, 0.65)',
      textColor: '#FAF7F5',
      mutedTextColor: '#C5B5D6',
      borderRadius: 'lg',
      animationPreset: 'luxury',
      customCss: ''
    },
    supportedSections: [
      'hero',
      'countdown',
      'couple_profile',
      'story',
      'events_schedule',
      'venue_map',
      'gallery',
      'rsvp',
      'wishes_guestbook'
    ],
    tier: 'PRO',
    isFeatured: true,
    isPopular: true,
    author: 'OrbitoX Studio',
    status: 'ACTIVE',
    tags: ['glasshouse', 'botanical', 'wisteria', 'crystal', 'starlight', 'ethereal'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'theme_amalfi_riviera',
    slug: 'amalfi-riviera',
    name: 'Amalfi Riviera',
    description: 'Sun-drenched Mediterranean villa romance with vibrant bougainvillea, hand-painted Majolica tiles, and coastal azure.',
    occasionId: 'occ_wedding',
    occasionSlug: 'wedding',
    previewImages: [
      'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1200&q=80'
    ],
    thumbnailUrl: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=600&q=80',
    styleConfig: {
      fontHeading: 'Playfair Display, serif',
      fontBody: 'Plus Jakarta Sans, sans-serif',
      primaryColor: '#E8B86D',
      secondaryColor: '#1A3038',
      accentColor: '#D84A75',
      backgroundColor: '#120A08',
      cardBackgroundColor: 'rgba(32, 18, 14, 0.75)',
      textColor: '#FFF9F5',
      mutedTextColor: '#D9C8BE',
      borderRadius: 'lg',
      animationPreset: 'romantic',
      customCss: ''
    },
    supportedSections: [
      'hero',
      'countdown',
      'couple_profile',
      'story',
      'events_schedule',
      'venue_map',
      'gallery',
      'rsvp',
      'wishes_guestbook'
    ],
    tier: 'PRO',
    isFeatured: true,
    isPopular: true,
    author: 'OrbitoX Studio',
    status: 'ACTIVE',
    tags: ['amalfi', 'mediterranean', 'bougainvillea', 'coastal', 'italian', 'sunlit'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'theme_celestial_rose_gold',
    slug: 'celestial-rose-gold',
    name: 'Celestial Rose Gold & Titanium',
    description: 'Haute horlogerie dark obsidian aesthetic with rose-gold metallic luster, brushed titanium accents, and celestial starlight typography.',
    occasionId: 'occ_wedding',
    occasionSlug: 'wedding',
    previewImages: [
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80'
    ],
    thumbnailUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80',
    styleConfig: {
      fontHeading: 'Playfair Display, Cormorant Garamond, serif',
      fontBody: 'Outfit, sans-serif',
      primaryColor: '#E8A598', // Rose Gold
      secondaryColor: '#E8B86D', // Champagne Gold
      accentColor: '#F472B6', // Luminous Petal
      backgroundColor: '#07080D', // Obsidian
      cardBackgroundColor: 'rgba(18, 20, 30, 0.85)',
      textColor: '#FFF9F5',
      mutedTextColor: '#A1A1AA',
      borderRadius: 'xl',
      animationPreset: 'luxury',
      customCss: ''
    },
    supportedSections: [
      'hero',
      'countdown',
      'couple_profile',
      'story',
      'events_schedule',
      'venue_map',
      'gallery',
      'rsvp',
      'wishes_guestbook'
    ],
    tier: 'PRO',
    isFeatured: true,
    isPopular: true,
    author: 'OrbitoX Studio',
    status: 'ACTIVE',
    tags: ['celestial', 'spyker', 'parallax', 'rose-gold', 'horlogerie', 'luxury', 'dark'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'theme_celestial_odyssey',
    slug: 'celestial-odyssey',
    name: 'Celestial Odyssey',
    description: 'Astronomical astrolabe clock, constellation star map, gravitational dual astral souls alignment, and living starlight blessing wall.',
    occasionId: 'occ_wedding',
    occasionSlug: 'wedding',
    previewImages: [
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&q=80'
    ],
    thumbnailUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80',
    styleConfig: {
      fontHeading: 'Outfit, Cinzel, serif',
      fontBody: 'Plus Jakarta Sans, sans-serif',
      primaryColor: '#E5C07B',
      secondaryColor: '#0E142A',
      accentColor: '#E5C07B',
      backgroundColor: '#06080F',
      cardBackgroundColor: 'rgba(14, 20, 42, 0.75)',
      textColor: '#FFF9F5',
      mutedTextColor: '#94A3B8',
      borderRadius: '2xl',
      animationPreset: 'luxury',
      customCss: ''
    },
    supportedSections: [
      'hero',
      'countdown',
      'couple_profile',
      'story',
      'events_schedule',
      'venue_map',
      'rsvp',
      'wishes_guestbook'
    ],
    tier: 'PREMIUM',
    isFeatured: true,
    isPopular: true,
    author: 'OrbitoX Studio',
    status: 'ACTIVE',
    tags: ['celestial', 'odyssey', 'astrolabe', 'constellation', 'interactive', 'luxury', 'gold'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export class ThemeEngine {
  private themes: Theme[] = [];

  constructor(initialThemes: Theme[] = DEFAULT_THEMES) {
    this.themes = [...initialThemes];
  }

  getAllThemes(): Theme[] {
    return [...this.themes];
  }

  filterThemes(filter: ThemeFilter = {}): Theme[] {
    return this.themes.filter((theme) => {
      if (theme.status !== 'ACTIVE') return false;
      if (filter.occasionSlug && theme.occasionSlug !== filter.occasionSlug) {
        return false;
      }
      if (filter.tier && theme.tier !== filter.tier) {
        return false;
      }
      if (filter.isFeatured !== undefined && theme.isFeatured !== filter.isFeatured) {
        return false;
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        const matchName = theme.name.toLowerCase().includes(q);
        const matchDesc = theme.description.toLowerCase().includes(q);
        const matchTags = theme.tags?.some((t) => t.toLowerCase().includes(q)) ?? false;
        if (!matchName && !matchDesc && !matchTags) return false;
      }
      return true;
    });
  }

  getThemeBySlug(slug: string): Theme | undefined {
    return this.themes.find((t) => t.slug.toLowerCase() === slug.toLowerCase());
  }

  getThemeById(id: string): Theme | undefined {
    return this.themes.find((t) => t.id === id);
  }

  getThemesForOccasion(occasionSlug: string): Theme[] {
    const directMatches = this.themes.filter(
      (t) => t.occasionSlug.toLowerCase() === occasionSlug.toLowerCase() && t.status === 'ACTIVE'
    );
    // If no direct matches, provide versatile themes as fallback
    if (directMatches.length === 0) {
      return this.themes.filter((t) => ['royal-regalia', 'celestial-gold', 'modern-minimalist'].includes(t.slug));
    }
    return directMatches;
  }

  createTheme(data: Omit<Theme, 'id' | 'createdAt' | 'updatedAt'>): Theme {
    const existing = this.getThemeBySlug(data.slug);
    if (existing) {
      throw new Error(`Theme with slug '${data.slug}' already exists.`);
    }

    const newTheme: Theme = {
      ...data,
      id: `theme_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.themes.push(newTheme);
    return newTheme;
  }

  updateTheme(id: string, updates: Partial<Omit<Theme, 'id' | 'createdAt' | 'updatedAt'>>): Theme {
    const current = this.themes.find((t) => t.id === id);
    if (!current) {
      throw new Error(`Theme not found: ${id}`);
    }

    const updated: Theme = Object.assign({}, current, updates, {
      id: current.id,
      slug: updates.slug ?? current.slug,
      name: updates.name ?? current.name,
      description: updates.description ?? current.description,
      occasionId: updates.occasionId ?? current.occasionId,
      occasionSlug: updates.occasionSlug ?? current.occasionSlug,
      previewImages: updates.previewImages ?? current.previewImages,
      thumbnailUrl: updates.thumbnailUrl ?? current.thumbnailUrl,
      styleConfig: updates.styleConfig ?? current.styleConfig,
      supportedSections: updates.supportedSections ?? current.supportedSections,
      tier: updates.tier ?? current.tier,
      isFeatured: updates.isFeatured ?? current.isFeatured,
      isPopular: updates.isPopular ?? current.isPopular,
      status: updates.status ?? current.status,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString()
    });

    const index = this.themes.findIndex((t) => t.id === id);
    if (index !== -1) {
      this.themes[index] = updated;
    }
    return updated;
  }
}
