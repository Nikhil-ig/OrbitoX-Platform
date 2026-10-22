import { SectionDefinition, SectionType, ExperienceSection } from './types';

export const DEFAULT_SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    type: 'hero',
    name: 'Hero Cover',
    description: 'Breathtaking main header with hosts/celebrants, date, background imagery, and headline.',
    category: 'essential',
    isPremium: false,
    defaultEnabled: true,
    fields: [
      { name: 'headline', label: 'Headline', type: 'text', required: true, defaultValue: 'We are getting married!' },
      { name: 'subheadline', label: 'Sub-headline', type: 'text', defaultValue: 'Save our date and celebrate with us' },
      { name: 'hostNames', label: 'Host / Celebrant Names', type: 'text', required: true, defaultValue: 'Aarav & Meera' },
      { name: 'eventDate', label: 'Event Date', type: 'date', required: true, defaultValue: '2026-12-18' },
      { name: 'venueCity', label: 'Venue City / State', type: 'text', defaultValue: 'Udaipur, Rajasthan' },
      { name: 'coverImageUrl', label: 'Hero Image URL', type: 'image', defaultValue: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=80' }
    ],
    defaultConfig: {
      headline: 'We are getting married!',
      subheadline: 'Together with our families, we invite you to celebrate',
      hostNames: 'Aarav & Meera',
      eventDate: '2026-12-18',
      venueCity: 'Udaipur, Rajasthan',
      coverImageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=80',
      alignment: 'center',
      overlayOpacity: 0.45
    }
  },
  {
    type: 'countdown',
    name: 'Live Countdown Clock',
    description: 'Dynamic real-time countdown timer ticking down to the big moment.',
    category: 'essential',
    isPremium: false,
    defaultEnabled: true,
    fields: [
      { name: 'targetDate', label: 'Target Date & Time', type: 'text', required: true, defaultValue: '2026-12-18T18:00:00' },
      { name: 'title', label: 'Counter Title', type: 'text', defaultValue: 'Counting down to forever' }
    ],
    defaultConfig: {
      title: 'Counting down to forever',
      targetDate: '2026-12-18T18:00:00'
    }
  },
  {
    type: 'couple_profile',
    name: 'Couple / Celebrant Bio',
    description: 'Side-by-side or highlighted portraits with personal bios and sweet words.',
    category: 'essential',
    isPremium: false,
    defaultEnabled: true,
    fields: [
      { name: 'partner1Name', label: 'Partner 1 Name', type: 'text', required: true, defaultValue: 'Aarav Sharma' },
      { name: 'partner1Bio', label: 'Partner 1 Bio', type: 'textarea', defaultValue: 'An architect with a passion for old monuments and quiet coffee shops.' },
      { name: 'partner1Image', label: 'Partner 1 Photo', type: 'image', defaultValue: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80' },
      { name: 'partner2Name', label: 'Partner 2 Name', type: 'text', required: true, defaultValue: 'Meera Patel' },
      { name: 'partner2Bio', label: 'Partner 2 Bio', type: 'textarea', defaultValue: 'A wildlife photographer captivated by mountain mornings and vintage vinyl.' },
      { name: 'partner2Image', label: 'Partner 2 Photo', type: 'image', defaultValue: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80' }
    ],
    defaultConfig: {
      partner1Name: 'Aarav Sharma',
      partner1Role: 'The Groom',
      partner1Bio: 'An architect with a passion for heritage structures and slow mornings.',
      partner1Image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
      partner2Name: 'Meera Patel',
      partner2Role: 'The Bride',
      partner2Bio: 'A wildlife photographer captivated by mountain mist and storytelling.',
      partner2Image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80'
    }
  },
  {
    type: 'story',
    name: 'Our Story Timeline',
    description: 'Chronological timeline of milestone moments (How we met, The proposal, She said yes).',
    category: 'essential',
    isPremium: false,
    defaultEnabled: true,
    fields: [
      { name: 'title', label: 'Section Title', type: 'text', defaultValue: 'How our story unfolded' }
    ],
    defaultConfig: {
      title: 'Our Journey Together',
      subtitle: 'A few chapters from our favorite story',
      milestones: [
        {
          year: '01',
          label: 'FIRST MET',
          title: 'When Paths Aligned',
          description: 'A serendipitous encounter where two independent orbits quietly aligned.',
          image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=500&q=80'
        },
        {
          year: '02',
          label: 'JOURNEY',
          title: 'Building Our Universe',
          description: 'Shared adventures, late-night conversations, and learning to speak each other’s silent languages.',
          image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&q=80'
        },
        {
          year: '03',
          label: 'PROPOSAL',
          title: 'A Whispered Yes',
          description: 'With quiet reverence beneath an open canopy of stars, she whispered forever.',
          image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=500&q=80'
        },
        {
          year: '04',
          label: 'THE BIG DAY',
          title: 'Our Forever Begins',
          description: 'Surrounded by our families and dearest friends, we step together into forever.',
          image: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=500&q=80'
        }
      ]
    }
  },
  {
    type: 'events_schedule',
    name: 'Events Itinerary & Schedule',
    description: 'Detailed cards for multiple ceremonies (Mehendi, Sangeet, Haldi, Vows, Reception).',
    category: 'logistics',
    isPremium: false,
    defaultEnabled: true,
    fields: [
      { name: 'title', label: 'Section Title', type: 'text', defaultValue: 'Ceremony Schedule' }
    ],
    defaultConfig: {
      title: 'Celebration Itinerary',
      subtitle: 'Join us across all festive celebrations',
      events: [
        {
          id: 'ev_1',
          name: 'Mehendi & High Tea',
          date: 'December 17, 2026',
          time: '03:00 PM onwards',
          venue: 'The Courtyard Lawn, Taj Fateh Prakash',
          dressCode: 'Vibrant & Bohemian',
          description: 'Henna, folk melodies, and sweet treats by the lake.'
        },
        {
          id: 'ev_2',
          name: 'Sangeet & Dance Soirée',
          date: 'December 17, 2026',
          time: '07:30 PM',
          venue: 'Royal Durbar Hall',
          dressCode: 'Indo-Western Glitz',
          description: 'Performances, cocktails, and midnight dancing.'
        },
        {
          id: 'ev_3',
          name: 'The Wedding Ceremony (Pheras)',
          date: 'December 18, 2026',
          time: '05:00 PM',
          venue: 'Jagmandir Island Palace',
          dressCode: 'Traditional Regal Indian',
          description: 'Sacred sunset vows beneath the floral mandap.'
        }
      ]
    }
  },
  {
    type: 'venue_map',
    name: 'Venue & Google Maps Direction',
    description: 'Venue address, interactive Google Maps button, transit tips, and valet info.',
    category: 'logistics',
    isPremium: false,
    defaultEnabled: true,
    fields: [
      { name: 'venueName', label: 'Venue Name', type: 'text', defaultValue: 'Jagmandir Island Palace' },
      { name: 'address', label: 'Address', type: 'textarea', defaultValue: 'Lake Pichola, Udaipur, Rajasthan 313001' },
      { name: 'mapsUrl', label: 'Google Maps Link', type: 'text', defaultValue: 'https://maps.google.com' }
    ],
    defaultConfig: {
      venueName: 'Jagmandir Island Palace',
      address: 'Lake Pichola, Udaipur, Rajasthan 313001',
      mapQuery: 'Jagmandir Island Palace, Udaipur',
      transportNote: 'Boat transfers begin 45 minutes prior to ceremony from City Palace jetty.'
    }
  },
  {
    type: 'gallery',
    name: 'Photo & Moments Gallery',
    description: 'Curated photo grid with lightbox modal, caption tags, and memories.',
    category: 'media',
    isPremium: false,
    defaultEnabled: true,
    fields: [
      { name: 'title', label: 'Title', type: 'text', defaultValue: 'Glimpses of Love' }
    ],
    defaultConfig: {
      title: 'Our Moments',
      subtitle: 'Portraits and candid memories from our adventures',
      photos: [
        { url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80', caption: 'By the coast' },
        { url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80', caption: 'Laughter shared' },
        { url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80', caption: 'Sunset silhouettes' },
        { url: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=800&q=80', caption: 'Quiet moments' }
      ]
    }
  },
  {
    type: 'rsvp',
    name: 'RSVP Form',
    description: 'Seamless digital RSVP with headcount, dietary preferences, and warm confirmation email.',
    category: 'engagement',
    isPremium: false,
    defaultEnabled: true,
    fields: [
      { name: 'deadline', label: 'RSVP Deadline', type: 'date', defaultValue: '2026-11-20' },
      { name: 'askDietary', label: 'Ask Dietary Restrictions', type: 'boolean', defaultValue: true },
      { name: 'askPlusOne', label: 'Allow +1 Guests', type: 'boolean', defaultValue: true }
    ],
    defaultConfig: {
      title: 'Will you join us?',
      subtitle: 'Kindly RSVP by November 20, 2026 so we can reserve your seat',
      askDietary: true,
      askPlusOne: true,
      allowChildren: true
    }
  },
  {
    type: 'wishes_guestbook',
    name: 'Wishes & Virtual Guestbook',
    description: 'Interactive guestbook where friends and family leave warm messages and heartfelt wishes.',
    category: 'engagement',
    isPremium: false,
    defaultEnabled: true,
    fields: [
      { name: 'title', label: 'Guestbook Title', type: 'text', defaultValue: 'Warm Wishes & Blessings' }
    ],
    defaultConfig: {
      title: 'Warm Wishes & Guestbook',
      subtitle: 'Leave your love, blessings, and memorable advice',
      requireModeration: false
    }
  },
  {
    type: 'music_player',
    name: 'Ambient Background Music',
    description: 'Floating ambient audio player that plays a curated romantic or celebratory soundtrack.',
    category: 'media',
    isPremium: true,
    defaultEnabled: false,
    fields: [
      { name: 'audioUrl', label: 'Audio MP3 URL', type: 'text', defaultValue: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3' },
      { name: 'trackTitle', label: 'Track Title', type: 'text', defaultValue: 'Acoustic Love Song' },
      { name: 'autoPlay', label: 'Autoplay (with muted fallback)', type: 'boolean', defaultValue: true }
    ],
    defaultConfig: {
      audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
      trackTitle: 'Ethereal Romance Piano',
      artistName: 'OrbitoX Music',
      autoPlay: true
    }
  },
  {
    type: 'dress_code',
    name: 'Dress Code & Palette Guide',
    description: 'Visual attire guide with color swatches and mood inspirations for guests.',
    category: 'logistics',
    isPremium: false,
    defaultEnabled: false,
    fields: [
      { name: 'title', label: 'Section Title', type: 'text', defaultValue: 'Dress Code & Colors' }
    ],
    defaultConfig: {
      title: 'Attire & Color Palette',
      subtitle: 'We invite you to complement our celebration palette',
      colors: [
        { name: 'Champagne Gold', hex: '#D4AF37' },
        { name: 'Forest Emerald', hex: '#0E3A2F' },
        { name: 'Dusty Rose', hex: '#E8A598' },
        { name: 'Warm Ivory', hex: '#FAF7F5' }
      ],
      description: 'Formal Indian or Black-Tie optional. Pastel shades and jewel tones are welcome.'
    }
  },
  {
    type: 'gift_registry',
    name: 'Digital Shagun & Gift Registry',
    description: 'Allow guests to send digital Shagun, contribute to honeymoon/milestone funds, or gift items.',
    category: 'engagement',
    isPremium: false,
    defaultEnabled: true,
    fields: [
      { name: 'title', label: 'Section Title', type: 'text', defaultValue: 'Blessings & Digital Shagun' },
      { name: 'subtitle', label: 'Subtitle', type: 'text', defaultValue: 'Your presence is our greatest present. For those asking to honor us with a gift...' }
    ],
    defaultConfig: {
      title: 'Blessings & Digital Shagun',
      subtitle: 'Your presence and love are our greatest treasure. If you wish to bestow a blessing or gift:',
      funds: [
        { id: 'honeymoon', name: 'Honeymoon in Amalfi Fund', target: 200000, current: 85000, icon: '✈️' },
        { id: 'new_home', name: 'Dream Home Sanctuary Fund', target: 500000, current: 142000, icon: '🏡' },
        { id: 'blessing', name: 'Traditional Shagun Blessing', icon: '✨' }
      ],
      suggestedAmounts: [501, 1100, 2100, 5100, 11000]
    }
  },
  {
    type: 'live_poll',
    name: 'Live Interactive Polls & Trivia',
    description: 'Engage guests with real-time celebratory trivia, voting, and friendly team competitions.',
    category: 'engagement',
    isPremium: false,
    defaultEnabled: true,
    fields: [
      { name: 'title', label: 'Section Title', type: 'text', defaultValue: 'Celebration Trivia & Live Polls' }
    ],
    defaultConfig: {
      title: 'Celebration Trivia & Live Polls',
      subtitle: 'Cast your vote and see what other guests think in real time!'
    }
  }
];

export class SectionEngine {
  private definitions: SectionDefinition[] = [];

  constructor(initialDefinitions: SectionDefinition[] = DEFAULT_SECTION_DEFINITIONS) {
    this.definitions = [...initialDefinitions];
  }

  getAllDefinitions(): SectionDefinition[] {
    return [...this.definitions];
  }

  getDefinitionByType(type: SectionType): SectionDefinition | undefined {
    return this.definitions.find((d) => d.type === type);
  }

  buildDefaultSections(sectionTypes: string[]): ExperienceSection[] {
    return sectionTypes.map((type, idx) => {
      const def = this.getDefinitionByType(type as SectionType);
      return {
        id: `sec_${type}_${Math.random().toString(36).substring(2, 7)}`,
        sectionType: type as SectionType,
        title: def ? def.name : type,
        order: idx + 1,
        isEnabled: true,
        config: def ? { ...def.defaultConfig } : {}
      };
    });
  }

  registerCustomDefinition(definition: SectionDefinition): void {
    const existingIndex = this.definitions.findIndex((d) => d.type === definition.type);
    if (existingIndex !== -1) {
      this.definitions[existingIndex] = definition;
    } else {
      this.definitions.push(definition);
    }
  }
}
