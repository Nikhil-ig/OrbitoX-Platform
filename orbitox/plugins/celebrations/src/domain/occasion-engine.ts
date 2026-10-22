import { Occasion, OccasionCategory, OccasionStatus } from './types';

export const DEFAULT_OCCASION_CATEGORIES: OccasionCategory[] = [
  { id: 'cat_personal', slug: 'personal', name: 'Personal Milestones', icon: 'Heart', sortOrder: 1 },
  { id: 'cat_cultural', slug: 'cultural', name: 'Festivals & Traditions', icon: 'Sparkles', sortOrder: 2 },
  { id: 'cat_corporate', slug: 'corporate', name: 'Corporate & Formal', icon: 'Briefcase', sortOrder: 3 },
  { id: 'cat_parties', slug: 'parties', name: 'Parties & Gatherings', icon: 'PartyPopper', sortOrder: 4 }
];

export const DEFAULT_OCCASIONS: Occasion[] = [
  {
    id: 'occ_wedding',
    slug: 'wedding',
    name: 'Wedding',
    category: 'personal',
    icon: 'Heart',
    description: 'Celebrate your union with elegant invitations, RSVP tracking, love story timelines, and registry.',
    defaultSections: [
      'hero',
      'countdown',
      'couple_profile',
      'story',
      'events_schedule',
      'venue_map',
      'gallery',
      'gift_registry',
      'live_poll',
      'rsvp',
      'wishes_guestbook'
    ],
    allowedFeatures: [
      'custom_domain',
      'background_music',
      'password_protection',
      'rsvp_tracking',
      'guest_management',
      'photo_gallery',
      'travel_stay'
    ],
    status: 'PUBLISHED',
    sortOrder: 1,
    metadata: {
      tagline: 'Forever begins here',
      accentColor: '#D4AF37'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'occ_engagement',
    slug: 'engagement',
    name: 'Engagement Ceremony',
    category: 'personal',
    icon: 'Gem',
    description: 'Announce your commitment and invite loved ones to celebrate your engagement.',
    defaultSections: ['hero', 'countdown', 'couple_profile', 'events_schedule', 'venue_map', 'rsvp'],
    allowedFeatures: ['custom_domain', 'rsvp_tracking', 'photo_gallery', 'background_music'],
    status: 'PUBLISHED',
    sortOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'occ_birthday',
    slug: 'birthday',
    name: 'Birthday Party',
    category: 'parties',
    icon: 'Cake',
    description: 'Throw an unforgettable birthday bash with dynamic RSVP, gift wishlists, and dress codes.',
    defaultSections: ['hero', 'countdown', 'person_profile', 'events_schedule', 'venue_map', 'rsvp', 'wishes_guestbook'],
    allowedFeatures: ['rsvp_tracking', 'wishes_wall', 'photo_gallery', 'background_music'],
    status: 'PUBLISHED',
    sortOrder: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'occ_anniversary',
    slug: 'anniversary',
    name: 'Wedding Anniversary',
    category: 'personal',
    icon: 'CalendarHeart',
    description: 'Commemorate years of love, memories, and togetherness with family and friends.',
    defaultSections: ['hero', 'countdown', 'couple_profile', 'story', 'gallery', 'venue_map', 'rsvp'],
    allowedFeatures: ['photo_gallery', 'rsvp_tracking', 'background_music'],
    status: 'PUBLISHED',
    sortOrder: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'occ_baby_shower',
    slug: 'baby-shower',
    name: 'Baby Shower',
    category: 'personal',
    icon: 'Baby',
    description: 'Welcome your little bundle of joy with pastel themes, diaper raffles, and baby registry.',
    defaultSections: ['hero', 'countdown', 'person_profile', 'events_schedule', 'venue_map', 'rsvp', 'gift_registry'],
    allowedFeatures: ['rsvp_tracking', 'gift_registry', 'photo_gallery'],
    status: 'PUBLISHED',
    sortOrder: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'occ_housewarming',
    slug: 'housewarming',
    name: 'Housewarming / Griha Pravesh',
    category: 'personal',
    icon: 'Home',
    description: 'Welcome loved ones to your new abode with route directions, schedule, and blessing book.',
    defaultSections: ['hero', 'events_schedule', 'venue_map', 'rsvp', 'wishes_guestbook'],
    allowedFeatures: ['venue_map', 'rsvp_tracking', 'wishes_wall'],
    status: 'PUBLISHED',
    sortOrder: 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'occ_festival',
    slug: 'festival',
    name: 'Festival & Cultural Celebration',
    category: 'cultural',
    icon: 'Flame',
    description: 'Celebrate Diwali, Eid, Christmas, Holi, or regional festivals with communal invites and event agendas.',
    defaultSections: ['hero', 'events_schedule', 'venue_map', 'dress_code', 'rsvp'],
    allowedFeatures: ['events_agenda', 'rsvp_tracking', 'photo_gallery'],
    status: 'PUBLISHED',
    sortOrder: 7,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'occ_corporate',
    slug: 'corporate',
    name: 'Corporate Gala & Summit',
    category: 'corporate',
    icon: 'Building2',
    description: 'Professional conferences, award nights, annual galas, and product launches.',
    defaultSections: ['hero', 'events_schedule', 'person_profile', 'venue_map', 'qna', 'rsvp'],
    allowedFeatures: ['custom_domain', 'rsvp_tracking', 'agenda_builder', 'analytics'],
    status: 'PUBLISHED',
    sortOrder: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export class OccasionEngine {
  private occasions: Occasion[] = [];
  private categories: OccasionCategory[] = [];

  constructor(
    initialOccasions: Occasion[] = DEFAULT_OCCASIONS,
    initialCategories: OccasionCategory[] = DEFAULT_OCCASION_CATEGORIES
  ) {
    this.occasions = [...initialOccasions];
    this.categories = [...initialCategories];
  }

  getAllOccasions(status?: OccasionStatus): Occasion[] {
    if (!status) return [...this.occasions];
    return this.occasions.filter((occ) => occ.status === status);
  }

  getActiveOccasions(): Occasion[] {
    return this.occasions
      .filter((occ) => occ.status === 'PUBLISHED')
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  getOccasionBySlug(slug: string): Occasion | undefined {
    return this.occasions.find((occ) => occ.slug.toLowerCase() === slug.toLowerCase());
  }

  getOccasionById(id: string): Occasion | undefined {
    return this.occasions.find((occ) => occ.id === id);
  }

  getCategories(): OccasionCategory[] {
    return [...this.categories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  createOccasion(data: Omit<Occasion, 'id' | 'createdAt' | 'updatedAt'>): Occasion {
    const existing = this.getOccasionBySlug(data.slug);
    if (existing) {
      throw new Error(`Occasion with slug '${data.slug}' already exists.`);
    }

    const newOccasion: Occasion = {
      ...data,
      id: `occ_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.occasions.push(newOccasion);
    return newOccasion;
  }

  updateOccasion(id: string, updates: Partial<Omit<Occasion, 'id' | 'createdAt' | 'updatedAt'>>): Occasion {
    const current = this.occasions.find((o) => o.id === id);
    if (!current) {
      throw new Error(`Occasion not found: ${id}`);
    }

    const updated: Occasion = Object.assign({}, current, updates, {
      id: current.id,
      slug: updates.slug ?? current.slug,
      name: updates.name ?? current.name,
      category: updates.category ?? current.category,
      icon: updates.icon ?? current.icon,
      description: updates.description ?? current.description,
      defaultSections: updates.defaultSections ?? current.defaultSections,
      allowedFeatures: updates.allowedFeatures ?? current.allowedFeatures,
      status: updates.status ?? current.status,
      sortOrder: updates.sortOrder ?? current.sortOrder,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString()
    });

    const index = this.occasions.findIndex((o) => o.id === id);
    if (index !== -1) {
      this.occasions[index] = updated;
    }
    return updated;
  }

  updateOccasionStatus(id: string, status: OccasionStatus): Occasion {
    return this.updateOccasion(id, { status });
  }

  deleteOccasion(id: string): boolean {
    const index = this.occasions.findIndex((o) => o.id === id);
    if (index === -1) return false;
    this.occasions.splice(index, 1);
    return true;
  }
}
