import { Experience, ExperienceSection, Theme, DEFAULT_THEMES } from '@orbitox-io/celebrations';
import type { SceneGraph } from '../template-studio/engine/SceneGraphTypes';

export type OccasionType =
  | 'wedding'
  | 'birthday'
  | 'anniversary'
  | 'engagement'
  | 'baby-shower'
  | 'corporate'
  | 'cultural';

export type ThemeType =
  | 'royal-regalia'
  | 'celestial-odyssey'
  | 'celestial-parallax'
  | 'minimal-editorial'
  | 'enchanted-glasshouse'
  | 'amalfi-riviera'
  | 'party-nocturne'
  | 'romantic-doors'
  | 'surreal-organimo';

export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export type WorkflowArea =
  | 'overview'
  | 'occasion'
  | 'style'
  | 'people'
  | 'event'
  | 'story'
  | 'content'
  | 'guests';

export interface ItineraryItem {
  id: string;
  time: string;
  title: string;
  desc: string;
  dressCode: string;
  venue?: string;
}

export interface EventLocationItem {
  id: string;
  name: string;
  address: string;
  note?: string;
}

export interface CelebrationState {
  occasion: OccasionType;
  theme: ThemeType;
  title: string;
  // Protagonists
  protagonist1: string;
  protagonist1Role: string;
  protagonist1Bio: string;
  protagonist1Image: string;
  protagonist1Vow?: string;
  protagonist2: string;
  protagonist2Role: string;
  protagonist2Bio: string;
  protagonist2Image: string;
  protagonist2Vow?: string;
  unionDeclaration?: string;
  tagline: string;
  // Event details & locations
  date: string;
  time: string;
  venueName: string;
  venueAddress: string;
  city: string;
  stateCountry: string;
  guestCountTarget: number;
  additionalLocations?: EventLocationItem[];
  // Narrative
  storyQuote: string;
  storyBody: string;
  milestones?: Array<{
    id?: number;
    year?: string;
    label?: string;
    chapter?: string;
    location?: string;
    coords?: string;
    title?: string;
    description?: string;
    image?: string;
  }>;
  // Schedule
  itinerary: ItineraryItem[];
  // Module toggles
  enableCountdown: boolean;
  enableCoupleProfile: boolean;
  enableItinerary: boolean;
  enableStory: boolean;
  enableVenueMap: boolean;
  enableDressCode: boolean;
  enableGallery: boolean;
  enableRsvp: boolean;
  enableShagun: boolean;
  enableGuestbook: boolean;
  enableMusic: boolean;
  // Guest Experience & RSVP
  rsvpDeadline: string;
  allowPlusOnes: 'yes' | 'no' | 'custom';
  enableDietary: boolean;
  upiId: string;
  shagunAmounts: number[];
  // Security
  hasPasscodeProtection: boolean;
  passcode: string;
  // Preview mode toggle: direct celebration vs interactive entrance door
  previewMode: 'experience' | 'door';
  // Pro Customizer overrides
  primaryColorOverride?: string;
  secondaryColorOverride?: string;
  fontDisplayOverride?: string;
  monogramStyle?: 'arch' | 'wax' | 'ring';
  monogramInitials?: string;
  partySizeAllowance?: 'single' | 'plus_one' | 'family';
  selectedDietaryOptions?: string[];
  toneOfVoice?: 'royal' | 'modern' | 'warm' | 'concise';
  monogramImage?: string;
  coverImage?: string;
  galleryImages?: string[];
  isSingleCelebrant?: boolean;
  // Editing session metadata
  editingExperienceId?: string;
  editingSlug?: string;
  speedTier?: string;
  // Media Slot Styling Overrides (P1 Media Authoring)
  partner1Shape?: 'circle' | 'rounded' | 'editorial' | 'arch' | 'polaroid' | 'mask';
  partner1FocalPoint?: { x: number; y: number };
  partner1CropBehavior?: 'fit' | 'fill' | 'editorial_zoom';
  partner2Shape?: 'circle' | 'rounded' | 'editorial' | 'arch' | 'polaroid' | 'mask';
  partner2FocalPoint?: { x: number; y: number };
  partner2CropBehavior?: 'fit' | 'fill' | 'editorial_zoom';
  coverImageShape?: 'circle' | 'rounded' | 'editorial' | 'arch' | 'polaroid' | 'mask';
  coverImageFocalPoint?: { x: number; y: number };
  coverImageCropBehavior?: 'fit' | 'fill' | 'editorial_zoom';
  coverImageOverlay?: { color: string; opacity: number; blurPx: number };
  // Layout & Motion Authoring Overrides (P2 Layout & Motion)
  sceneLayouts?: Record<string, SceneLayoutConfig>;
  sceneMotions?: Record<string, SceneMotionConfig>;
  // Interaction Authoring Overrides (P3 Interaction Authoring)
  sceneInteractions?: Record<string, SceneInteractionConfig[]>;
  // Visual Authoring Scene Graphs (P10 Engine)
  sceneGraphs?: Record<string, SceneGraph>;
}

export interface SceneInteractionConfig {
  id: string;
  name: string;
  trigger: 'tap' | 'click' | 'double_tap' | 'hover' | 'scroll_reach' | 'drag' | 'swipe' | 'long_press';
  targetElementId?: string;
  condition?: string;
  action: 'expand_modal' | 'reveal_content' | 'trigger_transition' | 'play_audio' | 'open_rsvp' | 'highlight_element' | 'chapter_jump' | 'toggle_view';
  actionParam?: string;
}

export interface SceneLayoutConfig {
  composition?: 'editorial' | 'centered' | 'split' | 'orbital' | 'asymmetric';
  paddingTopRem?: number;
  paddingBottomRem?: number;
  contentMaxWidthPx?: number;
}

export interface SceneMotionConfig {
  preset?: 'none' | 'soft' | 'subtle' | 'expressive' | 'cinematic';
  entryDuration?: number;
  entryDelay?: number;
  parallaxDepth?: number;
  staggerDelay?: number;
  easing?: string;
  reducedMotionFallback?: 'fade' | 'instant' | 'static';
}

export interface OccasionPreset {
  id: OccasionType;
  name: string;
  headline: string;
  description: string;
  badge: string;
  icon: string;
  defaultTheme: ThemeType;
  defaultProtagonist1: string;
  defaultProtagonist1Role: string;
  defaultProtagonist2: string;
  defaultProtagonist2Role: string;
  defaultTagline: string;
  defaultVenue: string;
  defaultCity: string;
  defaultQuote: string;
  defaultStory: string;
  accentColor: string;
  heroImage: string;
  itinerary: ItineraryItem[];
}

export const OCCASION_PRESETS: Record<OccasionType, OccasionPreset> = {
  wedding: {
    id: 'wedding',
    name: 'Wedding & Sangeet',
    headline: 'A royal celebration of two stories becoming one',
    description: 'Sacred nuptials, multi-day Sangeet festivities, pheras, and grand reception.',
    badge: 'Royal Nuptials',
    icon: '💍',
    defaultTheme: 'royal-regalia',
    defaultProtagonist1: 'Aarav Sharma',
    defaultProtagonist1Role: 'The Groom',
    defaultProtagonist2: 'Meera Singhania',
    defaultProtagonist2Role: 'The Bride',
    defaultTagline: 'Together with their families, request the pleasure of your company.',
    defaultVenue: 'Umaid Bhawan Palace',
    defaultCity: 'Jodhpur, Rajasthan',
    defaultQuote: 'Two souls, one destiny, beginning our timeless journey under the stars.',
    defaultStory:
      'From a chance encounter during monsoon season in Jaipur to a quiet sunset proposal along Lake Pichola. We are overjoyed to celebrate our union surrounded by our closest family and cherished friends.',
    accentColor: '#D4AF37',
    heroImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
    itinerary: [
      { id: '1', time: '11:00 AM', title: 'Haldi & Floral Phoolon Ki Holi', desc: 'Auspicious turmeric blessing ceremony with fresh marigold petals', dressCode: 'Sunshine Yellow & Ivory', venue: 'Palace Courtyard' },
      { id: '2', time: '07:30 PM', title: 'Grand Sangeet & Musical Soirée', desc: 'Evening of choreography, acoustic sitar, and banquet dining', dressCode: 'Regal Velvet & Gold', venue: 'Grand Ballroom' },
      { id: '3', time: '05:00 PM (Next Day)', title: 'Varmala & Pheras', desc: 'Sunset wedding vows by the palace stepwell followed by dinner', dressCode: 'Haute Couture Traditional', venue: 'Lakeside Stepwell' },
    ],
  },
  birthday: {
    id: 'birthday',
    name: 'Milestone Jubilee',
    headline: 'Make another extraordinary year unforgettable',
    description: 'Golden 50th jubilees, masquerade galas, and milestone celebratory evenings.',
    badge: 'Golden Jubilee',
    icon: '🎂',
    defaultTheme: 'party-nocturne',
    defaultProtagonist1: 'Vikramaditya Rao',
    defaultProtagonist1Role: 'The Birthday Host',
    defaultProtagonist2: '',
    defaultProtagonist2Role: '',
    defaultTagline: 'Invites you to raise a glass to 50 years of camaraderie and adventure.',
    defaultVenue: 'The St. Regis Grand Ballroom',
    defaultCity: 'Mumbai, Maharashtra',
    defaultQuote: 'Count your life by smiles, not tears. Count your age by friends, not years.',
    defaultStory:
      'Half a century of relentless ambition, enduring friendships, and joyous chapters. Join us for a memorable evening of jazz, fine single malts, and storytelling.',
    accentColor: '#F59E0B',
    heroImage: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=80',
    itinerary: [
      { id: '1', time: '08:00 PM', title: 'Cocktails & Caviar Welcome', desc: 'Vintage acoustic jazz quartet & signature cocktails', dressCode: 'Black Tie Elegance', venue: 'Terrace Lounge' },
      { id: '2', time: '09:30 PM', title: 'Golden Jubilee Toast', desc: 'Heartfelt speeches, memory reel, and champagne toast', dressCode: 'Formal Evening', venue: 'Main Hall' },
      { id: '3', time: '10:30 PM', title: 'Midnight Dance Floor', desc: 'Live DJ set & artisanal patisserie showcase', dressCode: 'Celebratory Chic', venue: 'Ballroom' },
    ],
  },
  anniversary: {
    id: 'anniversary',
    name: 'Silver & Golden Vows',
    headline: 'Celebrate everything you have built together',
    description: 'Silver 25th, Pearl 30th, and Golden 50th vow renewals and celebration banquets.',
    badge: 'Silver Jubilee',
    icon: '💎',
    defaultTheme: 'romantic-doors',
    defaultProtagonist1: 'Devraj',
    defaultProtagonist1Role: 'Husband',
    defaultProtagonist2: 'Rohini Singhania',
    defaultProtagonist2Role: 'Wife',
    defaultTagline: 'Celebrate 25 years of enduring devotion, shared triumphs, and graceful love.',
    defaultVenue: 'Taj Lake Palace',
    defaultCity: 'Udaipur, Rajasthan',
    defaultQuote: 'The best thing to hold onto in life is each other.',
    defaultStory:
      'Twenty-five years ago, we began a voyage together. Two careers, three children, and countless unforgettable moments later, our hearts remain anchored in the same sacred promise.',
    accentColor: '#EC4899',
    heroImage: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80',
    itinerary: [
      { id: '1', time: '06:00 PM', title: 'Vow Renewal by the Water', desc: 'Sunset lakeside reaffirmation of vows surrounded by family', dressCode: 'Pastel Chiffon & Linen', venue: 'Lake Deck' },
      { id: '2', time: '08:00 PM', title: 'Candlelit Silver Banquet', desc: 'Gourmet dinner accompanied by instrumental sitar and harp', dressCode: 'Classic Festive', venue: 'Courtyard' },
    ],
  },
  engagement: {
    id: 'engagement',
    name: 'Engagement & Roka',
    headline: 'The beginning of something truly beautiful',
    description: 'Ring exchange ceremonies, familial blessings, and evening cocktail celebrations.',
    badge: 'Ring Ceremony',
    icon: '✨',
    defaultTheme: 'celestial-parallax',
    defaultProtagonist1: 'Kabir Roy',
    defaultProtagonist1Role: 'Fiancé',
    defaultProtagonist2: 'Ananya Deshmukh',
    defaultProtagonist2Role: 'Fiancée',
    defaultTagline: 'Request the honor of your presence as they exchange rings and celebrate betrothal.',
    defaultVenue: 'The Leela Palace Glasshouse',
    defaultCity: 'Bengaluru, Karnataka',
    defaultQuote: 'Here begins the greatest adventure of our lives.',
    defaultStory:
      'Under a canopy of fairy lights, he asked, and with full hearts, she said yes. Join our families as we formalize our engagement with traditional blessings and music.',
    accentColor: '#A78BFA',
    heroImage: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80',
    itinerary: [
      { id: '1', time: '06:30 PM', title: 'Ring Exchange & Blessings', desc: 'Exchange of garlands and rings in the orchid glasshouse', dressCode: 'Indo-Western Glam', venue: 'Glasshouse Pavilion' },
      { id: '2', time: '08:30 PM', title: 'Celebratory Soirée & Feast', desc: 'Gourmet culinary stations and live unplugged acoustic band', dressCode: 'Cocktail Attire', venue: 'Grand Lawn' },
    ],
  },
  'baby-shower': {
    id: 'baby-shower',
    name: 'Baby Shower & Godh Bharai',
    headline: 'A sweet celebration of new beginnings and blessings',
    description: 'Traditional blessing rituals, pastel garden celebrations, and joyful parent tributes.',
    badge: 'New Beginnings',
    icon: '👶',
    defaultTheme: 'enchanted-glasshouse',
    defaultProtagonist1: 'Pooja',
    defaultProtagonist1Role: 'Mother-to-be',
    defaultProtagonist2: 'Rohan Mehra',
    defaultProtagonist2Role: 'Father-to-be',
    defaultTagline: 'Warmly invite you to bless our growing family with love and joy.',
    defaultVenue: 'The Glass Conservatory at Taj West End',
    defaultCity: 'Bengaluru, Karnataka',
    defaultQuote: 'A little miracle is on the way, bringing love, laughter, and light.',
    defaultStory:
      'Our hearts are overflowing as we prepare to welcome our bundle of joy. Join our families for an afternoon of traditional blessings, high tea, and baby shower games.',
    accentColor: '#10B981',
    heroImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
    itinerary: [
      { id: '1', time: '03:30 PM', title: 'Traditional Godh Bharai Blessing', desc: 'Auspicious lap-filling ceremony and floral blessings', dressCode: 'Soft Pastels & Floral', venue: 'Conservatory' },
      { id: '2', time: '05:00 PM', title: 'Garden High Tea & Dessert Bar', desc: 'Artisanal macarons, tea pairings, and celebratory games', dressCode: 'Garden Party Chic', venue: 'Sunken Lawn' },
    ],
  },
  corporate: {
    id: 'corporate',
    name: 'Corporate Summit Gala',
    headline: 'Celebrate the milestones that define your industry',
    description: 'Annual excellence awards, executive summits, and company anniversary galas.',
    badge: 'Executive Gala',
    icon: '🏛️',
    defaultTheme: 'minimal-editorial',
    defaultProtagonist1: 'Apex Horizons 2027',
    defaultProtagonist1Role: 'Organization',
    defaultProtagonist2: '',
    defaultProtagonist2Role: '',
    defaultTagline: 'Welcomes global delegates and industry visionaries to our Annual Leadership Gala.',
    defaultVenue: 'The Marina Bay Sands Expo Ballroom',
    defaultCity: 'Singapore',
    defaultQuote: 'Innovating for the next frontier of global enterprise.',
    defaultStory:
      'Celebrating twenty years of groundbreaking innovation, transformative partnerships, and international excellence across fifty countries.',
    accentColor: '#3B82F6',
    heroImage: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
    itinerary: [
      { id: '1', time: '05:30 PM', title: 'Delegate Registration & Networking', desc: 'Welcome cocktails and executive exhibition showcase', dressCode: 'Business Formal', venue: 'Foyer Hall' },
      { id: '2', time: '07:00 PM', title: 'Global Horizon Awards Ceremony', desc: 'Fireside address and presentation of annual trophies', dressCode: 'Black Tie', venue: 'Grand Auditorium' },
      { id: '3', time: '09:00 PM', title: 'Executive Gala Dinner', desc: 'Curated 5-course international culinary dinner', dressCode: 'Black Tie', venue: 'Banquet Hall' },
    ],
  },
  cultural: {
    id: 'cultural',
    name: 'Festival & Cultural Gala',
    headline: 'Honor heritage, sacred traditions, and vibrant communities',
    description: 'Diwali soirées, Eid banquets, Holi floral galas, and heritage tributes.',
    badge: 'Heritage Gala',
    icon: '🪔',
    defaultTheme: 'royal-regalia',
    defaultProtagonist1: 'The Singhania Trust',
    defaultProtagonist1Role: 'Host',
    defaultProtagonist2: '',
    defaultProtagonist2Role: '',
    defaultTagline: 'Invites you to an auspicious evening of cultural music, dance, and illumination.',
    defaultVenue: 'City Palace Courtyard',
    defaultCity: 'Jaipur, Rajasthan',
    defaultQuote: 'May light, harmony, and joy illuminate our hearts and homes.',
    defaultStory:
      'Gather with esteemed patrons and cultural custodians as we celebrate heritage music, classical dance repertoires, and traditional culinary heritage.',
    accentColor: '#F97316',
    heroImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
    itinerary: [
      { id: '1', time: '07:00 PM', title: 'Diya Lighting & Shehnai Welcome', desc: 'Ceremonial lamp lighting accompanied by live Shehnai', dressCode: 'Traditional Heritage', venue: 'Courtyard' },
      { id: '2', time: '08:30 PM', title: 'Classical Kathak & Ghazal Soirée', desc: 'Eminent artistes perform classical compositions', dressCode: 'Traditional', venue: 'Darbar Hall' },
    ],
  },
};

export interface ThemePreset {
  id: ThemeType;
  name: string;
  tagline: string;
  fontDisplay: string;
  fontSans: string;
  accentColor: string;
  secondaryColor: string;
  palette: string[];
  badge: string;
  universeDescription: string;
  audioTrackName: string;
  previewImage: string;
}

export const THEME_PRESETS: Record<ThemeType, ThemePreset> = {
  'celestial-odyssey': {
    id: 'celestial-odyssey',
    name: 'Celestial Odyssey',
    tagline: 'High-craft midnight astrolabe, gravitational souls, and interactive constellation',
    fontDisplay: 'Outfit, Cinzel, serif',
    fontSans: 'Plus Jakarta Sans, sans-serif',
    accentColor: '#E5C07B',
    secondaryColor: '#F5D089',
    palette: ['#E5C07B', '#F5D089', '#06080F', '#0E142A'],
    badge: '★ Interactive World',
    universeDescription: 'Scene-based interactive celestial world with astronomical astrolabe countdown, constellation star map, gravitational soul alignment, and living starlight blessing wall.',
    audioTrackName: 'Celestial Odyssey Orchestral Symphony',
    previewImage: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80',
  },
  'royal-regalia': {
    id: 'royal-regalia',
    name: 'Royal Regalia',
    tagline: 'Palatial luxury, 24k gold leaf filigree, and royal court archways',
    fontDisplay: 'Cinzel, Cormorant Garamond, serif',
    fontSans: 'Plus Jakarta Sans, sans-serif',
    accentColor: '#D4AF37',
    secondaryColor: '#FFDF73',
    palette: ['#D4AF37', '#FFDF73', '#0A0E27', '#1A214D'],
    badge: 'Royal Heritage',
    universeDescription: 'Versailles and Indian royal court opulence with wax seal entrance doors.',
    audioTrackName: 'Versailles Baroque Waltz',
    previewImage: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
  },
  'celestial-parallax': {
    id: 'celestial-parallax',
    name: 'Celestial Parallax',
    tagline: 'Deep starlight cosmos, celestial rings, and multidimensional stardust',
    fontDisplay: 'Playfair Display, serif',
    fontSans: 'Inter, sans-serif',
    accentColor: '#E8A598',
    secondaryColor: '#FBCFE8',
    palette: ['#E8A598', '#FBCFE8', '#070913', '#1E1B4B'],
    badge: 'Orbital Stardust',
    universeDescription: 'Cosmic orbit animation with floating starlight and champagne rose gold.',
    audioTrackName: 'Celestial Orchestral Symphony',
    previewImage: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=800&q=80',
  },
  'minimal-editorial': {
    id: 'minimal-editorial',
    name: 'Minimal Editorial',
    tagline: 'Vogue-style serif, high-fashion Swiss grid, and quiet luxury',
    fontDisplay: 'Playfair Display, Georgia, serif',
    fontSans: 'Inter, sans-serif',
    accentColor: '#F4F4F5',
    secondaryColor: '#A1A1AA',
    palette: ['#F4F4F5', '#A1A1AA', '#09090B', '#27272A'],
    badge: 'Quiet Luxury',
    universeDescription: 'Clean magazine editorial layout with generous breathing room and haute typography.',
    audioTrackName: 'Minimalist Editorial Etude',
    previewImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
  },
  'enchanted-glasshouse': {
    id: 'enchanted-glasshouse',
    name: 'Enchanted Glasshouse',
    tagline: 'Botanical conservatory canopy, emerald foliage, and sun-dappled ivory',
    fontDisplay: 'Cormorant Garamond, serif',
    fontSans: 'Inter, sans-serif',
    accentColor: '#E2C889',
    secondaryColor: '#86EFAC',
    palette: ['#E2C889', '#86EFAC', '#06190E', '#064E3B'],
    badge: 'Botanical Sanctuary',
    universeDescription: 'Verdant glasshouse with cascading botanical leaves and acoustic piano.',
    audioTrackName: 'Botanical Sanctuary Morning',
    previewImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
  },
  'amalfi-riviera': {
    id: 'amalfi-riviera',
    name: 'Amalfi Riviera',
    tagline: 'Mediterranean cliffside terrace, terracotta, lemon groves & azure breeze',
    fontDisplay: 'Cinzel Decorative, serif',
    fontSans: 'Plus Jakarta Sans, sans-serif',
    accentColor: '#E8B86D',
    secondaryColor: '#38BDF8',
    palette: ['#E8B86D', '#38BDF8', '#082F49', '#78350F'],
    badge: 'Coastal Romance',
    universeDescription: 'Italian coastal romance with tiled sun terraces and nylon guitar.',
    audioTrackName: 'Italian Riviera Acoustic',
    previewImage: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80',
  },
  'party-nocturne': {
    id: 'party-nocturne',
    name: 'Party Nocturne',
    tagline: 'Monaco midnight lounge, neon radiance, and deep club velvet',
    fontDisplay: 'Syne, sans-serif',
    fontSans: 'Inter, sans-serif',
    accentColor: '#F43F5E',
    secondaryColor: '#A855F7',
    palette: ['#F43F5E', '#A855F7', '#090514', '#3B0764'],
    badge: 'Midnight Velvet',
    universeDescription: 'High-energy nocturnal lounge with neon glow and deep bass beats.',
    audioTrackName: 'Monaco Midnight Lounge',
    previewImage: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
  },
  'romantic-doors': {
    id: 'romantic-doors',
    name: 'Romantic Doors',
    tagline: 'Château de Chantilly double doors, falling blossom petals & golden key',
    fontDisplay: 'Great Vibes, cursive',
    fontSans: 'Inter, sans-serif',
    accentColor: '#D69E2E',
    secondaryColor: '#F472B6',
    palette: ['#D69E2E', '#F472B6', '#170E14', '#831843'],
    badge: 'Château Portals',
    universeDescription: 'Ornate château gates that swing open with petal rain to reveal the celebration.',
    audioTrackName: 'Château de Chantilly Romance',
    previewImage: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=800&q=80',
  },
  'surreal-organimo': {
    id: 'surreal-organimo',
    name: 'Surreal Organimo',
    tagline: 'Bio-acoustic harp, ethereal surreal art, and floating dreamscapes',
    fontDisplay: 'Cinzel, serif',
    fontSans: 'Plus Jakarta Sans, sans-serif',
    accentColor: '#2DD4BF',
    secondaryColor: '#818CF8',
    palette: ['#2DD4BF', '#818CF8', '#041B1C', '#1E1B4B'],
    badge: 'Bio-Luminescent',
    universeDescription: 'Avant-garde surrealist landscape with meditative ambient soundscape.',
    audioTrackName: 'Surreal Eden Atmosphere',
    previewImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
  },
};

/**
 * Builds a 100% compliant, fully enriched Experience object from CelebrationState
 * which matches the platform's ExperienceView renderer requirements.
 */
export function buildLiveExperience(state: CelebrationState): Experience {
  const hostNames = state.protagonist2
    ? `${state.protagonist1} & ${state.protagonist2}`
    : state.protagonist1 || 'Celebration Host';

  const defaultTheme: Theme =
    DEFAULT_THEMES.find((t) => t.slug === state.theme) || (DEFAULT_THEMES[0] as Theme);

  const sections: ExperienceSection[] = [
    {
      id: 'sec_hero',
      sectionType: 'hero',
      title: 'Hero Invitation',
      order: 1,
      isEnabled: true,
      config: {
        hostNames: hostNames,
        coupleNames: hostNames,
        headline: state.title || `${hostNames} Celebration`,
        subheadline: state.tagline || 'Together with their families, request the pleasure of your company.',
        eventDate: state.date || '2027-02-18',
        eventTime: state.time || '06:00 PM IST',
        venueName: state.venueName || 'Umaid Bhawan Palace',
        venueCity: state.city || 'Jodhpur, Rajasthan',
        venueAddress: state.venueAddress || '',
        heroImage: state.coverImage || undefined,
        coverImage: state.coverImage || undefined,
        coverImageShape: state.coverImageShape || 'editorial',
        coverImageFocalPoint: state.coverImageFocalPoint || { x: 50, y: 50 },
        coverImageCropBehavior: state.coverImageCropBehavior || 'fill',
        coverImageOverlay: state.coverImageOverlay,
        monogramImage: state.monogramImage || undefined,
        monogramInitials: state.monogramInitials || undefined,
        monogramStyle: state.monogramStyle || 'arch',
        isSingleCelebrant: state.isSingleCelebrant || false,
        layout: state.sceneLayouts?.['scene_arrival'],
        motion: state.sceneMotions?.['scene_arrival'],
        interactions: state.sceneInteractions?.['scene_arrival'],
      },
    },
    {
      id: 'sec_countdown',
      sectionType: 'countdown',
      title: 'Celebration Countdown',
      order: 2,
      isEnabled: state.enableCountdown,
      config: {
        targetDate: state.date || '2027-02-18',
        targetTime: state.time || '18:00',
        title: 'Until We Celebrate',
        speedTier: state.speedTier || 'celestial',
        layout: state.sceneLayouts?.['scene_countdown'],
        motion: state.sceneMotions?.['scene_countdown'],
        interactions: state.sceneInteractions?.['scene_countdown'],
        sceneGraph: state.sceneGraphs?.['scene_countdown'],
      },
    },
    {
      id: 'sec_couple_profile',
      sectionType: 'couple_profile',
      title: 'Celebrants Profile',
      order: 3,
      isEnabled: state.enableCoupleProfile,
      config: {
        partner1Name: state.protagonist1 || 'Aarav',
        partner1Role: state.protagonist1Role || 'The Groom',
        partner1Bio: state.protagonist1Bio || 'Architect, dreamer, and culinary enthusiast.',
        partner1Image: state.protagonist1Image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=85',
        partner1Shape: state.partner1Shape || 'editorial',
        partner1FocalPoint: state.partner1FocalPoint || { x: 50, y: 35 },
        partner1CropBehavior: state.partner1CropBehavior || 'editorial_zoom',
        partner1Vow: state.protagonist1Vow || undefined,
        partner2Name: state.isSingleCelebrant ? '' : (state.protagonist2 || 'Meera'),
        partner2Role: state.isSingleCelebrant ? '' : (state.protagonist2Role || 'The Bride'),
        partner2Bio: state.isSingleCelebrant ? '' : (state.protagonist2Bio || 'Classical dancer, conservationist, and reader.'),
        partner2Image: state.isSingleCelebrant ? '' : (state.protagonist2Image || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=85'),
        partner2Shape: state.partner2Shape || 'editorial',
        partner2FocalPoint: state.partner2FocalPoint || { x: 50, y: 35 },
        partner2CropBehavior: state.partner2CropBehavior || 'editorial_zoom',
        partner2Vow: state.protagonist2Vow || undefined,
        unionDeclaration: state.unionDeclaration || undefined,
        isSingleCelebrant: state.isSingleCelebrant || false,
        monogramImage: state.monogramImage || undefined,
        monogramInitials: state.monogramInitials || undefined,
        monogramStyle: state.monogramStyle || 'arch',
        layout: state.sceneLayouts?.['scene_souls'],
        motion: state.sceneMotions?.['scene_souls'],
        interactions: state.sceneInteractions?.['scene_souls'],
        sceneGraph: state.sceneGraphs?.['scene_souls'],
      },
    },
    {
      id: 'sec_story',
      sectionType: 'story',
      title: 'Our Story',
      order: 4,
      isEnabled: state.enableStory,
      config: {
        quote: state.storyQuote || 'Two souls, one destiny, beginning our timeless journey.',
        storyText: state.storyBody || 'From a chance encounter during monsoon season...',
        unionDeclaration: state.unionDeclaration || undefined,
        milestones: state.milestones && state.milestones.length > 0 ? state.milestones : undefined,
        layout: state.sceneLayouts?.['scene_constellation'],
        motion: state.sceneMotions?.['scene_constellation'],
        interactions: state.sceneInteractions?.['scene_constellation'],
        sceneGraph: state.sceneGraphs?.['scene_constellation'],
      },
    },
    {
      id: 'sec_events',
      sectionType: 'events_schedule',
      title: 'Celebration Schedule',
      order: 5,
      isEnabled: state.enableItinerary,
      config: {
        events: state.itinerary.map((item) => ({
          id: item.id,
          name: item.title,
          date: state.date,
          time: item.time,
          venue: item.venue || state.venueName,
          description: item.desc,
          dressCode: item.dressCode,
        })),
        layout: state.sceneLayouts?.['scene_gathering'],
        motion: state.sceneMotions?.['scene_gathering'],
        interactions: state.sceneInteractions?.['scene_gathering'],
      },
    },
    {
      id: 'sec_venue',
      sectionType: 'venue_map',
      title: 'Palace Venue',
      order: 6,
      isEnabled: state.enableVenueMap,
      config: {
        venueName: state.venueName || 'Umaid Bhawan Palace',
        venueCity: state.city || 'Jodhpur, Rajasthan',
        address: state.venueAddress || `${state.venueName}, ${state.city}`,
        additionalLocations: state.additionalLocations || [],
        layout: state.sceneLayouts?.['scene_gathering'],
        motion: state.sceneMotions?.['scene_gathering'],
        interactions: state.sceneInteractions?.['scene_gathering'],
      },
    },
    {
      id: 'sec_rsvp',
      sectionType: 'rsvp',
      title: 'Guest RSVP',
      order: 7,
      isEnabled: state.enableRsvp,
      config: {
        deadline: state.rsvpDeadline || '10 January 2027',
        allowPlusOnes: state.allowPlusOnes,
        collectDietary: state.enableDietary,
        guestCountTarget: state.guestCountTarget,
        layout: state.sceneLayouts?.['scene_attendance'],
        motion: state.sceneMotions?.['scene_attendance'],
        interactions: state.sceneInteractions?.['scene_attendance'],
      },
    },
    {
      id: 'sec_shagun',
      sectionType: 'gift_registry',
      title: 'Digital Shagun',
      order: 8,
      isEnabled: state.enableShagun,
      config: {
        upiId: state.upiId || 'aarav.meera@okhdfcbank',
        denominations: state.shagunAmounts || [1001, 2100, 5100, 11000],
        layout: state.sceneLayouts?.['scene_blessings'],
        motion: state.sceneMotions?.['scene_blessings'],
        interactions: state.sceneInteractions?.['scene_blessings'],
      },
    },
    {
      id: 'sec_wishes',
      sectionType: 'wishes_guestbook',
      title: 'Wishes & Guestbook',
      order: 9,
      isEnabled: state.enableGuestbook,
      config: {
        hostNames: hostNames,
        subtitle: `Leave your warm blessings and memories for ${hostNames}`,
        layout: state.sceneLayouts?.['scene_blessings'],
        motion: state.sceneMotions?.['scene_blessings'],
        interactions: state.sceneInteractions?.['scene_blessings'],
      },
    },
  ];

  return {
    id: state.editingExperienceId || 'exp_live_studio',
    tenantId: 'tenant_celebrations_studio',
    title: state.title || `${hostNames} Celebration`,
    slug: state.editingSlug || 'live-studio-preview',
    occasionId: `occ_${state.occasion}`,
    occasionSlug: state.occasion,
    themeId: defaultTheme.id,
    themeSlug: defaultTheme.slug,
    templateSlug: state.theme,
    status: 'PUBLISHED',
    eventDate: state.date || '2027-02-18',
    sections: sections,
    featuresEnabled: [
      'rsvp_tracking',
      'photo_gallery',
      'wishes_wall',
      'background_music',
      'no_watermark',
    ],
    passwordProtection: state.hasPasscodeProtection,
    passwordHash: state.passcode || '2027',
    styleOverrides: {
      primaryColor: state.primaryColorOverride,
      secondaryColor: state.secondaryColorOverride,
      fontHeading: state.fontDisplayOverride,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Converts any stored or API Experience object back into full CelebrationState
 * for two-way round-trip editing in /create (admin & host studio).
 */
export function experienceToCelebrationState(exp: Experience): CelebrationState {
  const heroSection = exp.sections?.find((s) => s.sectionType === 'hero');
  const heroConfig = (heroSection?.config || {}) as Record<string, any>;
  const coupleSection = exp.sections?.find(
    (s) => s.sectionType === 'couple_profile' || s.sectionType === 'person_profile'
  );
  const coupleConfig = (coupleSection?.config || {}) as Record<string, any>;
  const storySection = exp.sections?.find((s) => s.sectionType === 'story');
  const storyConfig = (storySection?.config || {}) as Record<string, any>;
  const eventsSection = exp.sections?.find((s) => s.sectionType === 'events_schedule');
  const eventsConfig = (eventsSection?.config || {}) as Record<string, any>;
  const venueSection = exp.sections?.find((s) => s.sectionType === 'venue_map');
  const venueConfig = (venueSection?.config || {}) as Record<string, any>;
  const rsvpSection = exp.sections?.find((s) => s.sectionType === 'rsvp');
  const rsvpConfig = (rsvpSection?.config || {}) as Record<string, any>;
  const countdownSection = exp.sections?.find((s) => s.sectionType === 'countdown');
  const countdownConfig = (countdownSection?.config || {}) as Record<string, any>;
  const shagunSection = exp.sections?.find((s) => s.sectionType === 'gift_registry');
  const shagunConfig = (shagunSection?.config || {}) as Record<string, any>;
  const wishesSection = exp.sections?.find((s) => s.sectionType === 'wishes_guestbook');

  // Occasion & Theme resolution
  const occasion = (exp.occasionSlug as OccasionType) || 'wedding';
  const rawTheme = exp.templateSlug || exp.themeSlug || 'royal-regalia';
  const theme = (
    [
      'celestial-odyssey',
      'royal-regalia',
      'celestial-parallax',
      'minimal-editorial',
      'enchanted-glasshouse',
      'amalfi-riviera',
      'party-nocturne',
      'romantic-doors',
      'surreal-organimo',
    ].includes(rawTheme)
      ? rawTheme
      : 'royal-regalia'
  ) as ThemeType;

  const defaultOcc = OCCASION_PRESETS[occasion] || OCCASION_PRESETS['wedding'];

  // Host / Couple names
  const hostNames = (heroConfig.hostNames || heroConfig.coupleNames || exp.title || '') as string;
  const nameParts = hostNames.includes('&') ? hostNames.split('&').map((s) => s.trim()) : [hostNames, ''];

  const p1 = (coupleConfig.partner1Name || nameParts[0] || defaultOcc.defaultProtagonist1) as string;
  const p2 = (coupleConfig.partner2Name || nameParts[1] || (coupleConfig.isSingleCelebrant ? '' : defaultOcc.defaultProtagonist2)) as string;

  // Itinerary items
  const rawEvents = (eventsConfig.events || []) as Array<any>;
  const itinerary: ItineraryItem[] =
    rawEvents.length > 0
      ? rawEvents.map((ev, idx) => ({
          id: String(ev.id || idx + 1),
          time: ev.time || '18:00',
          title: ev.name || ev.title || `Event 0${idx + 1}`,
          desc: ev.description || '',
          dressCode: ev.dressCode || 'Formal / Festive',
          venue: ev.venue || venueConfig.venueName || heroConfig.venueName || '',
        }))
      : defaultOcc.itinerary;

  return {
    occasion,
    theme,
    title: exp.title || `${p1} ${p2 ? `& ${p2}` : ''} Celebration`,
    protagonist1: p1,
    protagonist1Role: coupleConfig.partner1Role || defaultOcc.defaultProtagonist1Role,
    protagonist1Bio: coupleConfig.partner1Bio || '',
    protagonist1Image: coupleConfig.partner1Image || '',
    protagonist1Vow: coupleConfig.partner1Vow || '',
    protagonist2: p2,
    protagonist2Role: coupleConfig.partner2Role || defaultOcc.defaultProtagonist2Role,
    protagonist2Bio: coupleConfig.partner2Bio || '',
    protagonist2Image: coupleConfig.partner2Image || '',
    protagonist2Vow: coupleConfig.partner2Vow || '',
    unionDeclaration: coupleConfig.unionDeclaration || storyConfig.unionDeclaration || '',
    tagline: heroConfig.subheadline || heroConfig.headline || defaultOcc.defaultTagline,
    date: heroConfig.eventDate || exp.eventDate || '2027-02-18',
    time: heroConfig.eventTime || countdownConfig.targetTime || '06:00 PM IST',
    venueName: heroConfig.venueName || venueConfig.venueName || defaultOcc.defaultVenue,
    venueAddress: heroConfig.venueAddress || venueConfig.address || '',
    city: heroConfig.venueCity || venueConfig.venueCity || defaultOcc.defaultCity,
    stateCountry: venueConfig.stateCountry || '',
    guestCountTarget: rsvpConfig.guestCountTarget || 150,
    additionalLocations: venueConfig.additionalLocations || [],
    storyQuote: storyConfig.quote || defaultOcc.defaultQuote,
    storyBody: storyConfig.storyText || storyConfig.body || defaultOcc.defaultStory,
    milestones: storyConfig.milestones || undefined,
    itinerary,
    enableCountdown: countdownSection ? !!countdownSection.isEnabled : true,
    enableCoupleProfile: coupleSection ? !!coupleSection.isEnabled : true,
    enableItinerary: eventsSection ? !!eventsSection.isEnabled : true,
    enableStory: storySection ? !!storySection.isEnabled : true,
    enableVenueMap: venueSection ? !!venueSection.isEnabled : true,
    enableDressCode: true,
    enableGallery: true,
    enableRsvp: rsvpSection ? !!rsvpSection.isEnabled : true,
    enableShagun: shagunSection ? !!shagunSection.isEnabled : true,
    enableGuestbook: wishesSection ? !!wishesSection.isEnabled : true,
    enableMusic: true,
    rsvpDeadline: rsvpConfig.deadline || '10 January 2027',
    allowPlusOnes: rsvpConfig.allowPlusOnes || 'yes',
    enableDietary: rsvpConfig.collectDietary ?? true,
    upiId: shagunConfig.upiId || 'aarav.meera@okhdfcbank',
    shagunAmounts: shagunConfig.denominations || [1001, 2100, 5100, 11000],
    hasPasscodeProtection: !!exp.passwordProtection,
    passcode: exp.passwordHash || '2027',
    previewMode: 'experience',
    primaryColorOverride: exp.styleOverrides?.primaryColor,
    secondaryColorOverride: exp.styleOverrides?.secondaryColor,
    fontDisplayOverride: exp.styleOverrides?.fontHeading,
    monogramStyle: heroConfig.monogramStyle || 'arch',
    monogramInitials: heroConfig.monogramInitials || undefined,
    monogramImage: heroConfig.monogramImage || undefined,
    coverImage: heroConfig.heroImage || undefined,
    isSingleCelebrant: !!coupleConfig.isSingleCelebrant,
    editingExperienceId: exp.id,
    editingSlug: exp.slug,
  };
}
