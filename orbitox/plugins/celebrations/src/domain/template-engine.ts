export interface ExperienceTemplate {
  id: string;
  slug: string;
  name: string;
  badge: string;
  description: string;
  previewImage: string;
  defaultThemeSlug: string;
  supportedOccasions: string[];
  features: string[];
  animationPreset:
    | 'surreal_webgl'
    | 'cosmic_regal'
    | 'minimal_smooth'
    | 'neon_kinetic'
    | 'chateau_doors'
    | 'glasshouse_ethereal'
    | 'amalfi_coastal'
    | 'celestial_parallax'
    | 'celestial_odyssey';
  author: string;
}

export const BUILTIN_TEMPLATES: ExperienceTemplate[] = [
  {
    id: 'tmpl_surreal_organimo',
    slug: 'surreal-organimo',
    name: 'Surreal Organimo (WebGL)',
    badge: '★ Awwwards Inspired',
    description:
      'Ultra-luxury romantic editorial experience with 3D organic floating rose petals, multi-plane parallax depth, tactile envelope RSVP, and mobile-first touch physics.',
    previewImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
    defaultThemeSlug: 'blush-botanical',
    supportedOccasions: ['wedding', 'engagement', 'anniversary', 'baby-shower'],
    features: [
      'webgl_3d_petals',
      'multi_plane_parallax',
      'envelope_rsvp',
      'mobile_touch_physics',
      'dual_circular_bios',
      'itinerary_table',
    ],
    animationPreset: 'surreal_webgl',
    author: 'OrbitoX Creative Labs',
  },
  {
    id: 'tmpl_royal_regalia',
    slug: 'royal-regalia',
    name: 'Royal Regalia & Cosmic Gold',
    badge: 'Imperial Luxury',
    description:
      'Deep cosmic velvet and gold leaf radiance designed for grand palace weddings, royal galas, and heritage ceremonies.',
    previewImage: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80',
    defaultThemeSlug: 'royal-regalia',
    supportedOccasions: ['wedding', 'engagement', 'anniversary', 'cultural-festival'],
    features: [
      'gold_radiance_shimmer',
      'constellation_canvas',
      'countdown_timer',
      'heritage_timeline',
      'guestbook_wishes',
    ],
    animationPreset: 'cosmic_regal',
    author: 'OrbitoX Creative Labs',
  },
  {
    id: 'tmpl_minimal_editorial',
    slug: 'minimal-editorial',
    name: 'Minimalist Fine Art Editorial',
    badge: 'Swiss Modernist',
    description:
      'Clean high-fashion typography, generous whitespace, monochrome photography, and refined card paging for chic modern weddings and gallery milestones.',
    previewImage: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80',
    defaultThemeSlug: 'modern-minimalist',
    supportedOccasions: ['wedding', 'birthday', 'corporate-event', 'anniversary'],
    features: [
      'swiss_grid_layout',
      'fine_art_gallery',
      'minimal_rsvp',
      'high_contrast_type',
    ],
    animationPreset: 'minimal_smooth',
    author: 'OrbitoX Creative Labs',
  },
  {
    id: 'tmpl_party_nocturne',
    slug: 'party-nocturne',
    name: 'Nocturne Kinetic Neon',
    badge: 'Electric Atmosphere',
    description:
      'High-energy party atmosphere with vibrant neon glows, audio soundwave visualizer, and dynamic countdown for Sangeet, Cocktails, and milestone birthdays.',
    previewImage: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
    defaultThemeSlug: 'neon-nocturne',
    supportedOccasions: ['birthday', 'party-celebration', 'wedding', 'festival'],
    features: [
      'kinetic_neon_glow',
      'audio_visualizer',
      'live_party_polls',
      'photo_stream',
    ],
    animationPreset: 'neon_kinetic',
    author: 'OrbitoX Creative Labs',
  },
  {
    id: 'tmpl_romantic_doors',
    slug: 'romantic-doors',
    name: 'Romantic Chateau French Doors',
    badge: '★ Chateau Romance',
    description:
      'Grand French arched double doors draped in climbing English garden roses, tactile antique brass latch, warm candle lantern glow, and 3D portal transitions for magical weddings.',
    previewImage: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80',
    defaultThemeSlug: 'blush-botanical',
    supportedOccasions: ['wedding', 'engagement', 'anniversary'],
    features: [
      '3d_carved_french_doors',
      'interactive_brass_latch',
      'climbing_ivy_roses',
      'candlelight_ambience',
      'sanctuary_portals',
      'botanical_rsvp_gate',
    ],
    animationPreset: 'chateau_doors',
    author: 'OrbitoX Creative Labs',
  },
  {
    id: 'tmpl_enchanted_glasshouse',
    slug: 'enchanted-glasshouse',
    name: 'Enchanted Crystal Glasshouse',
    badge: '★ Victorian Botanical',
    description:
      'Ethereal Parisian botanical conservatory bathed in deep midnight violet, warm amber candelabras glowing through beveled crystal glass panes, hanging luminescent white wisteria, and floating starlight fireflies.',
    previewImage: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=800&q=80',
    defaultThemeSlug: 'enchanted-glasshouse',
    supportedOccasions: ['wedding', 'engagement', 'anniversary'],
    features: [
      'crystal_glass_doors',
      'starlight_wisteria',
      'candlelight_ambience',
      'conservatory_portals',
      'botanical_envelope_rsvp',
      'wishing_pool_guestbook',
    ],
    animationPreset: 'glasshouse_ethereal',
    author: 'OrbitoX Creative Labs',
  },
  {
    id: 'tmpl_amalfi_riviera',
    slug: 'amalfi-riviera',
    name: 'Amalfi Riviera Villa & Bougainvillea',
    badge: '★ Mediterranean Romance',
    description:
      'Italian coastal luxury inspired by clifftop villas of Positano and Ravello. Hand-painted ceramic Majolica patterns, double wrought-iron gates wrapped in vibrant bougainvillea, and sunlit coastal breeze.',
    previewImage: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&q=80',
    defaultThemeSlug: 'amalfi-riviera',
    supportedOccasions: ['wedding', 'anniversary', 'party-celebration'],
    features: [
      'wrought_iron_gates',
      'bougainvillea_cascades',
      'majolica_frames',
      'coastal_itinerary',
      'amalfi_paper_rsvp',
      'postcard_guestbook',
    ],
    animationPreset: 'amalfi_coastal',
    author: 'OrbitoX Creative Labs',
  },
  {
    id: 'tmpl_celestial_parallax',
    slug: 'celestial-parallax',
    name: 'Celestial Parallax & Haute Romance',
    badge: '★ Spyker Inspired Parallax',
    description:
      'Haute horlogerie precision craftsmanship and multi-speed staggered scroll-linked parallax inspired by Spyker Cars. Titanium & rose-gold guilloché gates, interactive celestial chronograph dial, and monumental romantic typography.',
    previewImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
    defaultThemeSlug: 'celestial-rose-gold',
    supportedOccasions: ['wedding', 'engagement', 'anniversary', 'party-celebration'],
    features: [
      'staggered_scroll_parallax',
      'celestial_chronograph_dial',
      'titanium_rose_gold_doors',
      'web_audio_escapement_ticks',
      'multi_plane_depth_tilt',
      'laser_cut_vip_pass',
      'coordinates_badging',
    ],
    animationPreset: 'celestial_parallax',
    author: 'OrbitoX Creative Labs',
  },
  {
    id: 'tmpl_celestial_odyssey',
    slug: 'celestial-odyssey',
    name: 'Celestial Odyssey (Interactive Digital World)',
    badge: '★ Interactive World',
    description:
      'Scene-based interactive celebration world featuring an astronomical astrolabe countdown, constellation of memories star map, dual astral souls alignment, terrestrial sanctuary wayfinding, and living starlight blessing wall.',
    previewImage: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80',
    defaultThemeSlug: 'celestial-rose-gold',
    supportedOccasions: ['wedding', 'engagement', 'anniversary', 'party-celebration'],
    features: [
      'scene_based_architecture',
      'astronomical_astrolabe_clock',
      'constellation_of_memories',
      'dual_astral_souls',
      'order_of_the_stars_timeline',
      'terrestrial_sanctuary_wayfinding',
      'attendance_decree_rsvp',
      'starlight_blessing_wall',
      'glassmorphism_nav_dock',
    ],
    animationPreset: 'celestial_odyssey',
    author: 'OrbitoX Creative Labs',
  },
];

export class TemplateEngine {
  private templates: ExperienceTemplate[] = [];

  constructor(initialTemplates: ExperienceTemplate[] = BUILTIN_TEMPLATES) {
    this.templates = [...initialTemplates];
  }

  getAllTemplates(): ExperienceTemplate[] {
    return [...this.templates];
  }

  getTemplateBySlug(slug: string): ExperienceTemplate | undefined {
    return this.templates.find((t) => t.slug === slug);
  }

  getTemplatesForOccasion(occasionSlug: string): ExperienceTemplate[] {
    return this.templates.filter((t) =>
      t.supportedOccasions.includes(occasionSlug)
    );
  }

  registerCustomTemplate(template: ExperienceTemplate): void {
    const existing = this.templates.findIndex((t) => t.slug === template.slug);
    if (existing !== -1) {
      this.templates[existing] = template;
    } else {
      this.templates.push(template);
    }
  }
}
