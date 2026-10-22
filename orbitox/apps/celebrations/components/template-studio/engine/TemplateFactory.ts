import { SceneGraph, SceneGraphNode, SceneNodeKind } from './SceneGraphTypes';
import { NodeDefaults } from './NodeDefaults';
import { TemplateCompiler, SemanticSceneBlueprint } from './TemplateCompiler';
import type { TemplateSchema } from '../types/TemplateSchema';

/**
 * P13: Template Factory
 * 
 * Creates complete multi-scene templates entirely from SceneGraph definitions
 * and semantic blueprints. No React components required.
 * 
 * This is the core deliverable for "CREATE A COMPLETELY NEW TEMPLATE WITHOUT REACT".
 */

// ─────────────────────────────────────────────────────────────
// TEMPLATE MANIFEST (returned by factory)
// ─────────────────────────────────────────────────────────────

export interface TemplateManifest {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: 'cosmic' | 'editorial' | 'floral' | 'minimal' | 'luxury' | 'playful';
  scenes: FactoryScene[];
  contentSchema: FactoryContentField[];
  mediaSlots: FactoryMediaSlot[];
  designTokens: FactoryDesignTokens;
  modules: FactoryModule[];
}

export interface FactoryScene {
  id: string;
  name: string;
  order: number;
  sceneGraph: SceneGraph;
  defaultVisible: boolean;
  renderMode: 'graph';
}

export interface FactoryContentField {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'longtext' | 'date' | 'time' | 'number' | 'boolean' | 'select' | 'repeater' | 'json';
  defaultValue: any;
  required: boolean;
}

export interface FactoryMediaSlot {
  id: string;
  slotKey: string;
  label: string;
  mediaType: 'image' | 'video';
  required: boolean;
}

export interface FactoryDesignTokens {
  colors: Record<string, string>;
  typography: Record<string, any>;
  spacing: Record<string, string>;
  radius: Record<string, string>;
  shadows: Record<string, string>;
  motion: Record<string, any>;
}

export interface FactoryModule {
  id: string;
  moduleType: string;
  label: string;
  isEnabled: boolean;
}

// ─────────────────────────────────────────────────────────────
// SCENE BUILDER HELPERS
// ─────────────────────────────────────────────────────────────

export class SceneBuilder {
  private nodes: Record<string, SceneGraphNode> = {};
  private rootId: string;
  private nodeCounter: number = 0;

  constructor(rootName: string) {
    const slug = rootName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    this.rootId = `root_${slug}`;
    this.nodes[this.rootId] = {
      ...(NodeDefaults.create('frame') as any),
      id: this.rootId,
      parentId: null,
      name: rootName,
      children: [],
      layoutMode: 'freeform',
      geometry: {
        position: 'flow', x: 0, y: 0,
        width: '100%', height: '100vh',
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0,
      },
    };
  }

  addNode(
    parentId: string | null,
    kind: SceneNodeKind,
    overrides: Partial<SceneGraphNode> & { name: string }
  ): string {
    this.nodeCounter++;
    const slug = (overrides.name || kind).toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const id = overrides.id || `node_${slug}_${this.nodeCounter}`;
    const base = NodeDefaults.create(kind) as any;
    const node: SceneGraphNode = {
      ...base,
      ...overrides,
      id,
      kind,
      parentId: parentId || this.rootId,
      children: overrides.children || [],
      geometry: { ...base.geometry, ...(overrides.geometry || {}) },
      style: { ...base.style, ...(overrides.style || {}) },
      responsive: overrides.responsive || {},
    };

    this.nodes[id] = node;

    // Attach to parent
    const pid = parentId || this.rootId;
    if (this.nodes[pid]) {
      this.nodes[pid].children.push(id);
    }

    return id;
  }

  build(): SceneGraph {
    const order: string[] = [];
    const traverse = (id: string) => {
      order.push(id);
      const n = this.nodes[id];
      if (n?.children) n.children.forEach(c => traverse(c));
    };
    traverse(this.rootId);

    return {
      schemaVersion: 1,
      rootNodeId: this.rootId,
      nodes: this.nodes,
      renderOrder: order,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// TEMPLATE FACTORY
// ─────────────────────────────────────────────────────────────

export class TemplateFactory {

  // ─── COMPLETE TEMPLATE GENERATORS ──────────────────────────

  /**
   * Generate a complete Celestial template (cosmic/wedding theme)
   */
  static createCelestialTemplate(name: string = 'Celestial Odyssey'): TemplateManifest {
    return {
      id: `tmpl_${this.slugify(name)}`,
      name,
      slug: this.slugify(name),
      description: 'A celestial-themed celebration with cosmic visuals, orbital animations, and constellation maps.',
      category: 'cosmic',
      scenes: [
        { id: 'scene_hero', name: 'Hero / Welcome', order: 0, sceneGraph: this.buildHeroScene('cosmic'), defaultVisible: true, renderMode: 'graph' },
        { id: 'scene_portraits', name: 'Astral Portraits', order: 1, sceneGraph: this.buildPortraitsScene('cosmic'), defaultVisible: true, renderMode: 'graph' },
        { id: 'scene_story', name: 'Our Story', order: 2, sceneGraph: this.buildStoryScene('cosmic'), defaultVisible: true, renderMode: 'graph' },
        { id: 'scene_countdown', name: 'Countdown Chronograph', order: 3, sceneGraph: this.buildCountdownScene('cosmic'), defaultVisible: true, renderMode: 'graph' },
        { id: 'scene_itinerary', name: 'Event Itinerary', order: 4, sceneGraph: this.buildItineraryScene(), defaultVisible: true, renderMode: 'graph' },
        { id: 'scene_rsvp', name: 'RSVP', order: 5, sceneGraph: this.buildRSVPScene(), defaultVisible: true, renderMode: 'graph' },
        { id: 'scene_gallery', name: 'Memory Gallery', order: 6, sceneGraph: this.buildGalleryScene(), defaultVisible: true, renderMode: 'graph' },
        { id: 'scene_wishes', name: 'Blessings & Wishes', order: 7, sceneGraph: this.buildWishesScene(), defaultVisible: true, renderMode: 'graph' },
      ],
      contentSchema: this.buildDefaultContentSchema(),
      mediaSlots: this.buildDefaultMediaSlots(),
      designTokens: this.buildCosmicTokens(),
      modules: this.buildDefaultModules(),
    };
  }

  /**
   * Generate a minimal editorial template
   */
  static createEditorialTemplate(name: string = 'Minimal Editorial'): TemplateManifest {
    return {
      id: `tmpl_${this.slugify(name)}`,
      name,
      slug: this.slugify(name),
      description: 'Clean, typography-driven layout with editorial compositions and generous whitespace.',
      category: 'editorial',
      scenes: [
        { id: 'scene_hero', name: 'Opening Statement', order: 0, sceneGraph: this.buildHeroScene('editorial'), defaultVisible: true, renderMode: 'graph' },
        { id: 'scene_portraits', name: 'Couple Feature', order: 1, sceneGraph: this.buildPortraitsScene('editorial'), defaultVisible: true, renderMode: 'graph' },
        { id: 'scene_story', name: 'Our Journey', order: 2, sceneGraph: this.buildStoryScene('editorial'), defaultVisible: true, renderMode: 'graph' },
        { id: 'scene_countdown', name: 'Save the Date', order: 3, sceneGraph: this.buildCountdownScene('editorial'), defaultVisible: true, renderMode: 'graph' },
        { id: 'scene_itinerary', name: 'Schedule', order: 4, sceneGraph: this.buildItineraryScene(), defaultVisible: true, renderMode: 'graph' },
        { id: 'scene_rsvp', name: 'Respond', order: 5, sceneGraph: this.buildRSVPScene(), defaultVisible: true, renderMode: 'graph' },
      ],
      contentSchema: this.buildDefaultContentSchema(),
      mediaSlots: this.buildDefaultMediaSlots(),
      designTokens: this.buildEditorialTokens(),
      modules: this.buildDefaultModules(),
    };
  }

  /**
   * Generate a floral / botanical template
   */
  static createFloralTemplate(name: string = 'Garden Romance'): TemplateManifest {
    return {
      id: `tmpl_${this.slugify(name)}`,
      name,
      slug: this.slugify(name),
      description: 'Romantic botanical theme with watercolor florals, organic shapes, and warm earthy tones.',
      category: 'floral',
      scenes: [
        { id: 'scene_hero', name: 'Garden Gate', order: 0, sceneGraph: this.buildHeroScene('floral'), defaultVisible: true, renderMode: 'graph' },
        { id: 'scene_portraits', name: 'The Couple', order: 1, sceneGraph: this.buildPortraitsScene('floral'), defaultVisible: true, renderMode: 'graph' },
        { id: 'scene_story', name: 'Our Love Story', order: 2, sceneGraph: this.buildStoryScene('floral'), defaultVisible: true, renderMode: 'graph' },
        { id: 'scene_countdown', name: 'Days Until', order: 3, sceneGraph: this.buildCountdownScene('floral'), defaultVisible: true, renderMode: 'graph' },
        { id: 'scene_itinerary', name: 'Celebration Day', order: 4, sceneGraph: this.buildItineraryScene(), defaultVisible: true, renderMode: 'graph' },
        { id: 'scene_rsvp', name: 'Will You Attend?', order: 5, sceneGraph: this.buildRSVPScene(), defaultVisible: true, renderMode: 'graph' },
        { id: 'scene_wishes', name: 'Well Wishes', order: 6, sceneGraph: this.buildWishesScene(), defaultVisible: true, renderMode: 'graph' },
      ],
      contentSchema: this.buildDefaultContentSchema(),
      mediaSlots: this.buildDefaultMediaSlots(),
      designTokens: this.buildFloralTokens(),
      modules: this.buildDefaultModules(),
    };
  }

  /**
   * Generate a sleek modern / architectural template
   */
  static createModernTemplate(name: string = 'Modern Harmony'): TemplateManifest {
    return {
      id: `tmpl_${this.slugify(name)}`,
      name,
      slug: this.slugify(name),
      description: 'Sleek, architectural luxury with neon accents, dynamic grids, and bold contemporary typography.',
      category: 'minimal',
      scenes: [
        { id: 'scene_hero', name: 'Grand Entrance', order: 0, sceneGraph: this.buildHeroScene('modern'), defaultVisible: true, renderMode: 'graph' },
        { id: 'scene_portraits', name: 'The Protagonists', order: 1, sceneGraph: this.buildPortraitsScene('modern'), defaultVisible: true, renderMode: 'graph' },
        { id: 'scene_story', name: 'Chronicle', order: 2, sceneGraph: this.buildStoryScene('modern'), defaultVisible: true, renderMode: 'graph' },
        { id: 'scene_countdown', name: 'The Clock', order: 3, sceneGraph: this.buildCountdownScene('modern'), defaultVisible: true, renderMode: 'graph' },
        { id: 'scene_itinerary', name: 'Program', order: 4, sceneGraph: this.buildItineraryScene(), defaultVisible: true, renderMode: 'graph' },
        { id: 'scene_rsvp', name: 'RSVP Gateway', order: 5, sceneGraph: this.buildRSVPScene(), defaultVisible: true, renderMode: 'graph' },
        { id: 'scene_gallery', name: 'Visual Anthology', order: 6, sceneGraph: this.buildGalleryScene(), defaultVisible: true, renderMode: 'graph' },
        { id: 'scene_wishes', name: 'Guest Expressions', order: 7, sceneGraph: this.buildWishesScene(), defaultVisible: true, renderMode: 'graph' },
      ],
      contentSchema: this.buildDefaultContentSchema(),
      mediaSlots: this.buildDefaultMediaSlots(),
      designTokens: this.buildModernTokens(),
      modules: this.buildDefaultModules(),
    };
  }

  /**
   * Generate Amalfi Riviera template (7 scenes, Mediterranean terracotta)
   */
  static createAmalfiTemplate(name: string = 'Amalfi Riviera'): TemplateManifest {
    return {
      id: `tmpl_amalfi_${Date.now()}`,
      name,
      slug: 'amalfi-riviera',
      description: 'Sun-drenched coastal elegance with terracotta arches, majolica patterns, and lemon grove romanticism.',
      category: 'floral',
      scenes: [
        { id: 'amalfi-hero', name: 'Coastal Welcome Arch', order: 0, sceneGraph: this.buildHeroScene('floral'), defaultVisible: true, renderMode: 'graph' },
        { id: 'amalfi-couple', name: 'Lo Sposo & La Sposa Profiles', order: 1, sceneGraph: this.buildPortraitsScene('floral'), defaultVisible: true, renderMode: 'graph' },
        { id: 'amalfi-story', name: 'Love Chronicles', order: 2, sceneGraph: this.buildStoryScene('floral'), defaultVisible: true, renderMode: 'graph' },
        { id: 'amalfi-events', name: 'Festa Program', order: 3, sceneGraph: this.buildItineraryScene(), defaultVisible: true, renderMode: 'graph' },
        { id: 'amalfi-venue', name: 'Villa & Coast Map', order: 4, sceneGraph: this.buildVenueScene('floral'), defaultVisible: true, renderMode: 'graph' },
        { id: 'amalfi-rsvp', name: 'RSVP', order: 5, sceneGraph: this.buildRSVPScene(), defaultVisible: true, renderMode: 'graph' },
        { id: 'amalfi-wishes', name: 'Guest Wishes', order: 6, sceneGraph: this.buildWishesScene(), defaultVisible: true, renderMode: 'graph' },
      ],
      contentSchema: this.buildDefaultContentSchema(),
      mediaSlots: this.buildDefaultMediaSlots(),
      designTokens: this.buildAmalfiTokens(),
      modules: this.buildDefaultModules(),
    };
  }

  /**
   * Generate Enchanted Glasshouse template (5 scenes, Victorian botanical conservatory)
   */
  static createGlasshouseTemplate(name: string = 'Enchanted Glasshouse'): TemplateManifest {
    return {
      id: `tmpl_glasshouse_${Date.now()}`,
      name,
      slug: 'enchanted-glasshouse',
      description: 'Lush Victorian glasshouse with emerald botanical canopies and luminous arch reflections.',
      category: 'floral',
      scenes: [
        { id: 'glasshouse-hero', name: 'Conservatory Welcome', order: 0, sceneGraph: this.buildHeroScene('floral'), defaultVisible: true, renderMode: 'graph' },
        { id: 'glasshouse-conservatory', name: 'Couple Profiles', order: 1, sceneGraph: this.buildPortraitsScene('floral'), defaultVisible: true, renderMode: 'graph' },
        { id: 'glasshouse-timeline', name: 'Botanical Timeline', order: 2, sceneGraph: this.buildItineraryScene(), defaultVisible: true, renderMode: 'graph' },
        { id: 'glasshouse-rsvp', name: 'RSVP Response', order: 3, sceneGraph: this.buildRSVPScene(), defaultVisible: true, renderMode: 'graph' },
        { id: 'glasshouse-guestbook', name: 'Visitor Log', order: 4, sceneGraph: this.buildWishesScene(), defaultVisible: true, renderMode: 'graph' },
      ],
      contentSchema: this.buildDefaultContentSchema(),
      mediaSlots: this.buildDefaultMediaSlots(),
      designTokens: this.buildGlasshouseTokens(),
      modules: this.buildDefaultModules(),
    };
  }

  /**
   * Generate Party Nocturne template (5 scenes, Cyber neon noir)
   */
  static createNocturneTemplate(name: string = 'Party Nocturne'): TemplateManifest {
    return {
      id: `tmpl_nocturne_${Date.now()}`,
      name,
      slug: 'party-nocturne',
      description: 'High-energy cyber noir celebration with glowing neon accents and dynamic setlists.',
      category: 'minimal',
      scenes: [
        { id: 'nocturne-hero', name: 'Nightclub Entrance', order: 0, sceneGraph: this.buildHeroScene('modern'), defaultVisible: true, renderMode: 'graph' },
        { id: 'nocturne-lineup', name: 'VIP Hosts', order: 1, sceneGraph: this.buildPortraitsScene('modern'), defaultVisible: true, renderMode: 'graph' },
        { id: 'nocturne-vip', name: 'Event Lineup', order: 2, sceneGraph: this.buildItineraryScene(), defaultVisible: true, renderMode: 'graph' },
        { id: 'nocturne-rsvp', name: 'Guestlist RSVP', order: 3, sceneGraph: this.buildRSVPScene(), defaultVisible: true, renderMode: 'graph' },
        { id: 'nocturne-tracks', name: 'Music Requests', order: 4, sceneGraph: this.buildWishesScene(), defaultVisible: true, renderMode: 'graph' },
      ],
      contentSchema: this.buildDefaultContentSchema(),
      mediaSlots: this.buildDefaultMediaSlots(),
      designTokens: this.buildNocturneTokens(),
      modules: this.buildDefaultModules(),
    };
  }

  /**
   * Generate Romantic Doors template (5 scenes, Classical royal palace portal)
   */
  static createRomanticDoorsTemplate(name: string = 'Romantic Doors'): TemplateManifest {
    return {
      id: `tmpl_doors_${Date.now()}`,
      name,
      slug: 'romantic-doors',
      description: 'Grand architectural palace doors with deep rose velvet and sacred parchment vows.',
      category: 'editorial',
      scenes: [
        { id: 'doors-portal', name: '3D Palace Doors Portal', order: 0, sceneGraph: this.buildHeroScene('editorial'), defaultVisible: true, renderMode: 'graph' },
        { id: 'doors-chamber', name: 'Couple Chamber', order: 1, sceneGraph: this.buildPortraitsScene('editorial'), defaultVisible: true, renderMode: 'graph' },
        { id: 'doors-vows', name: 'Sacred Vows', order: 2, sceneGraph: this.buildVowsScene('editorial'), defaultVisible: true, renderMode: 'graph' },
        { id: 'doors-reception', name: 'Gala Reception', order: 3, sceneGraph: this.buildItineraryScene(), defaultVisible: true, renderMode: 'graph' },
        { id: 'doors-rsvp', name: 'Royal Response', order: 4, sceneGraph: this.buildRSVPScene(), defaultVisible: true, renderMode: 'graph' },
      ],
      contentSchema: this.buildDefaultContentSchema(),
      mediaSlots: this.buildDefaultMediaSlots(),
      designTokens: this.buildRomanticDoorsTokens(),
      modules: this.buildDefaultModules(),
    };
  }

  /**
   * Generate Royal Regalia template (5 scenes, Imperial Gold & Crimson)
   */
  static createRoyalRegaliaTemplate(name: string = 'Royal Regalia'): TemplateManifest {
    return {
      id: `tmpl_regalia_${Date.now()}`,
      name,
      slug: 'royal-regalia',
      description: 'Imperial majesty with gold filigree heraldry, royal lineage profiles, and ceremonial shagun gateways.',
      category: 'luxury',
      scenes: [
        { id: 'regalia-proclamation', name: 'Imperial Proclamation', order: 0, sceneGraph: this.buildHeroScene('cosmic'), defaultVisible: true, renderMode: 'graph' },
        { id: 'regalia-lineage', name: 'Royal Lineage (Couple)', order: 1, sceneGraph: this.buildPortraitsScene('cosmic'), defaultVisible: true, renderMode: 'graph' },
        { id: 'regalia-banquet', name: 'Banquet Schedule', order: 2, sceneGraph: this.buildItineraryScene(), defaultVisible: true, renderMode: 'graph' },
        { id: 'regalia-rsvp', name: 'Royal Attendance', order: 3, sceneGraph: this.buildRSVPScene(), defaultVisible: true, renderMode: 'graph' },
        { id: 'regalia-shagun', name: 'Shagun Envelope Gateway', order: 4, sceneGraph: this.buildShagunScene(), defaultVisible: true, renderMode: 'graph' },
      ],
      contentSchema: this.buildDefaultContentSchema(),
      mediaSlots: this.buildDefaultMediaSlots(),
      designTokens: this.buildRoyalRegaliaTokens(),
      modules: this.buildDefaultModules(),
    };
  }

  /**
   * Generate Surreal Organimo template (6 scenes, Avant-garde Botanical)
   */
  static createSurrealOrganimoTemplate(name: string = 'Surreal Organimo'): TemplateManifest {
    return {
      id: `tmpl_organimo_${Date.now()}`,
      name,
      slug: 'surreal-organimo',
      description: 'Avant-garde living botanical sanctuary with organic circular couple biospheres and moss accents.',
      category: 'floral',
      scenes: [
        { id: 'organimo-hero', name: 'Botanical Sanctuary Hero', order: 0, sceneGraph: this.buildHeroScene('floral'), defaultVisible: true, renderMode: 'graph' },
        { id: 'organimo-couple-bio', name: 'Couple Profiles', order: 1, sceneGraph: this.buildPortraitsScene('floral'), defaultVisible: true, renderMode: 'graph' },
        { id: 'organimo-story', name: 'Living Story Stream', order: 2, sceneGraph: this.buildStoryScene('floral'), defaultVisible: true, renderMode: 'graph' },
        { id: 'organimo-timeline', name: 'Sanctuary Itinerary', order: 3, sceneGraph: this.buildItineraryScene(), defaultVisible: true, renderMode: 'graph' },
        { id: 'organimo-rsvp', name: 'RSVP Gateway', order: 4, sceneGraph: this.buildRSVPScene(), defaultVisible: true, renderMode: 'graph' },
        { id: 'organimo-guestbook', name: 'Blessings Wall', order: 5, sceneGraph: this.buildWishesScene(), defaultVisible: true, renderMode: 'graph' },
      ],
      contentSchema: this.buildDefaultContentSchema(),
      mediaSlots: this.buildDefaultMediaSlots(),
      designTokens: this.buildSurrealOrganimoTokens(),
      modules: this.buildDefaultModules(),
    };
  }

  // ─── SCENE GRAPH BUILDERS ─────────────────────────────────

  static buildHeroScene(mood: 'cosmic' | 'editorial' | 'floral' | 'modern' = 'cosmic'): SceneGraph {
    const sb = new SceneBuilder('Hero Root');

    const fonts = {
      cosmic: { display: "'Cinzel', serif", body: "'Outfit', sans-serif" },
      editorial: { display: "'Playfair Display', serif", body: "'Source Sans Pro', sans-serif" },
      floral: { display: "'Cormorant Garamond', serif", body: "'Lato', sans-serif" },
      modern: { display: "'Outfit', sans-serif", body: "'Inter', sans-serif" },
    }[mood];

    // Background atmosphere
    sb.addNode(null, 'gradient', {
      name: 'Hero Background Gradient',
      geometry: { position: 'absolute', x: 0, y: 0, width: '100%', height: '100%', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
      style: {
        background: {
          type: 'gradient',
          gradient: {
            type: 'radial',
            stops: mood === 'cosmic'
              ? [{ color: 'rgba(15, 25, 50, 1)', position: 0 }, { color: 'rgba(5, 10, 25, 1)', position: 1 }]
              : mood === 'editorial'
              ? [{ color: '#FAFAF8', position: 0 }, { color: '#F0EDE8', position: 1 }]
              : mood === 'floral'
              ? [{ color: '#FFF8F0', position: 0 }, { color: '#F5E6D8', position: 1 }]
              : [{ color: '#0F172A', position: 0 }, { color: '#020617', position: 1 }],
          },
        },
      },
    });

    // Title
    sb.addNode(null, 'text', {
      name: 'Celebration Title',
      textContent: 'Celestial Odyssey',
      binding: { fieldKey: 'celebration.title', bindingType: 'content' },
      geometry: { position: 'absolute', x: 0, y: '32vh', width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
      style: {
        typography: {
          fontFamily: fonts.display,
          fontSize: '3.5rem',
          fontWeight: 800,
          textAlign: 'center',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: mood === 'cosmic'
            ? { type: 'token', tokenPath: 'colors.accentPrimary' }
            : { type: 'token', tokenPath: 'colors.textPrimary' },
        },
      },
      responsive: {
        tablet: { style: { typography: { fontSize: '2.5rem' } } },
        mobile: { style: { typography: { fontSize: '1.75rem', letterSpacing: '0.12em' } } },
      },
      motion: { in: { type: 'fade', duration: 1200, delay: 300, easing: 'ease-out' } },
    });

    // Tagline
    sb.addNode(null, 'text', {
      name: 'Tagline',
      textContent: 'In the presence of our dearest family & companions',
      binding: { fieldKey: 'celebration.tagline', bindingType: 'content' },
      geometry: { position: 'absolute', x: 0, y: '45vh', width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.8, zIndex: 10 },
      style: {
        typography: {
          fontFamily: fonts.body,
          fontSize: '1.15rem',
          textAlign: 'center',
          letterSpacing: '0.06em',
          color: { type: 'token', tokenPath: 'colors.textSecondary' },
        },
      },
      motion: { in: { type: 'fade', duration: 1000, delay: 600, easing: 'ease-out' } },
    });

    // Partner names
    sb.addNode(null, 'text', {
      name: 'Partner Names',
      textContent: 'Aarav & Meera',
      binding: { fieldKey: 'celebrants[0].name', bindingType: 'content' },
      geometry: { position: 'absolute', x: 0, y: '55vh', width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
      style: {
        typography: {
          fontFamily: fonts.display,
          fontSize: '2rem',
          fontWeight: 600,
          textAlign: 'center',
          letterSpacing: '0.1em',
          color: { type: 'token', tokenPath: 'colors.textPrimary' },
        },
      },
      motion: { in: { type: 'slide-up', duration: 1000, delay: 900, easing: 'ease-out' } },
    });

    return sb.build();
  }

  static buildPortraitsScene(mood: 'cosmic' | 'editorial' | 'floral' | 'modern' = 'cosmic'): SceneGraph {
    return TemplateCompiler.compileBlueprint({
      sceneId: 'portraits',
      name: 'Portraits',
      sceneType: 'portraits',
      partner1Name: 'Aarav',
      partner2Name: 'Meera',
      unionDeclaration: 'Two Souls Aligned in Infinite Orbit',
    });
  }

  static buildStoryScene(mood: 'cosmic' | 'editorial' | 'floral' | 'modern' = 'cosmic'): SceneGraph {
    const sb = new SceneBuilder('Story Root');

    // Section Title
    sb.addNode(null, 'text', {
      name: 'Story Eyebrow',
      textContent: 'Our Story',
      geometry: { position: 'absolute', x: 0, y: '8vh', width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.7, zIndex: 10 },
      style: {
        typography: {
          fontSize: '0.85rem',
          textAlign: 'center',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: { type: 'token', tokenPath: 'colors.accentPrimary' },
        },
      },
    });

    // Story Quote
    sb.addNode(null, 'text', {
      name: 'Story Quote',
      textContent: '"In every chapter of our lives, we found each other written between the lines."',
      binding: { fieldKey: 'story.quote', bindingType: 'content' },
      geometry: { position: 'absolute', x: '10%', y: '15vh', width: '80%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
      style: {
        typography: {
          fontFamily: "'Cinzel', serif",
          fontSize: '1.5rem',
          fontStyle: 'italic',
          textAlign: 'center',
          lineHeight: 1.8,
          color: { type: 'token', tokenPath: 'colors.textPrimary' },
        },
      },
      motion: { in: { type: 'fade', duration: 1200, delay: 300, easing: 'ease-out' } },
    });

    // Story Body
    sb.addNode(null, 'richtext', {
      name: 'Story Body',
      textContent: 'Their paths first crossed at a mountain photography workshop, where a quiet architect met a wildlife storyteller. What began as a shared love for sunrise hikes became something far more luminous.',
      binding: { fieldKey: 'story.body', bindingType: 'content' },
      geometry: { position: 'absolute', x: '15%', y: '40vh', width: '70%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.85, zIndex: 10 },
      style: {
        typography: {
          fontFamily: "'Outfit', sans-serif",
          fontSize: '1rem',
          lineHeight: 1.8,
          textAlign: 'center',
          color: { type: 'token', tokenPath: 'colors.textSecondary' },
        },
      },
    });

    return sb.build();
  }

  static buildCountdownScene(mood: 'cosmic' | 'editorial' | 'floral' | 'modern' = 'cosmic'): SceneGraph {
    const sb = new SceneBuilder('Countdown Root');

    sb.addNode(null, 'text', {
      name: 'Countdown Eyebrow',
      textContent: 'The Celestial Moment Arrives In',
      geometry: { position: 'absolute', x: 0, y: '20vh', width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.7, zIndex: 10 },
      style: {
        typography: {
          fontSize: '0.85rem', textAlign: 'center', letterSpacing: '0.2em', textTransform: 'uppercase',
          color: { type: 'token', tokenPath: 'colors.accentPrimary' },
        },
      },
    });

    sb.addNode(null, 'countdown', {
      name: 'Countdown Timer',
      binding: { fieldKey: 'celebration.date', bindingType: 'content' },
      geometry: { position: 'absolute', x: '10%', y: '30vh', width: '80%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
      smartComponent: 'CountdownChronograph',
      smartProps: { targetDate: '2026-12-18T00:00:00', showLabels: true },
    });

    sb.addNode(null, 'text', {
      name: 'Event Date',
      textContent: 'December 18, 2026',
      binding: { fieldKey: 'event.date', bindingType: 'content' },
      geometry: { position: 'absolute', x: 0, y: '60vh', width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
      style: {
        typography: {
          fontFamily: "'Cinzel', serif",
          fontSize: '1.5rem', textAlign: 'center', letterSpacing: '0.12em',
          color: { type: 'token', tokenPath: 'colors.textPrimary' },
        },
      },
    });

    sb.addNode(null, 'text', {
      name: 'Venue Name',
      textContent: 'The Grand Pavilion',
      binding: { fieldKey: 'event.venueName', bindingType: 'content' },
      geometry: { position: 'absolute', x: 0, y: '68vh', width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.7, zIndex: 10 },
      style: {
        typography: {
          fontSize: '1rem', textAlign: 'center', letterSpacing: '0.08em',
          color: { type: 'token', tokenPath: 'colors.textSecondary' },
        },
      },
    });

    return sb.build();
  }

  static buildItineraryScene(): SceneGraph {
    const sb = new SceneBuilder('Itinerary Root');

    sb.addNode(null, 'text', {
      name: 'Itinerary Title',
      textContent: 'Celebration Itinerary',
      geometry: { position: 'absolute', x: 0, y: '8vh', width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
      style: {
        typography: {
          fontFamily: "'Cinzel', serif",
          fontSize: '2rem', fontWeight: 700, textAlign: 'center', letterSpacing: '0.15em',
          color: { type: 'token', tokenPath: 'colors.textPrimary' },
        },
      },
    });

    // Event cards container
    const cardsId = sb.addNode(null, 'stack', {
      name: 'Event Cards Stack',
      layoutMode: 'flex',
      layoutConfig: {
        direction: 'vertical',
        gap: '1.5rem',
        padding: { top: '2rem', right: '2rem', bottom: '2rem', left: '2rem' },
        alignment: { primary: 'start', cross: 'stretch' },
        wrap: false,
        sizing: { primary: 'hug', cross: 'fill' },
      },
      geometry: { position: 'absolute', x: '10%', y: '18vh', width: '80%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
    });

    // Sample event cards
    const events = [
      { name: 'Haldi Ceremony', time: '10:00 AM', venue: 'Garden Terrace' },
      { name: 'Wedding Ceremony', time: '4:00 PM', venue: 'Main Pavilion' },
      { name: 'Reception & Dinner', time: '7:00 PM', venue: 'Grand Ballroom' },
    ];

    for (const evt of events) {
      sb.addNode(cardsId, 'event', {
        name: evt.name,
        textContent: `${evt.time} — ${evt.name}\n${evt.venue}`,
        style: {
          background: { type: 'solid', color: { type: 'solid', value: 'rgba(255, 255, 255, 0.03)' } },
          border: { radius: '12px', width: '1px', color: { type: 'token', tokenPath: 'colors.borderSubtle' } },
          padding: '20px',
        },
      });
    }

    return sb.build();
  }

  static buildRSVPScene(): SceneGraph {
    const sb = new SceneBuilder('RSVP Root');

    sb.addNode(null, 'text', {
      name: 'RSVP Title',
      textContent: 'We Would Be Honored By Your Presence',
      geometry: { position: 'absolute', x: 0, y: '15vh', width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
      style: {
        typography: {
          fontFamily: "'Cinzel', serif",
          fontSize: '1.75rem', fontWeight: 600, textAlign: 'center', letterSpacing: '0.12em',
          color: { type: 'token', tokenPath: 'colors.textPrimary' },
        },
      },
    });

    sb.addNode(null, 'rsvp', {
      name: 'RSVP Form',
      smartComponent: 'RSVPForm',
      geometry: { position: 'absolute', x: '15%', y: '28vh', width: '70%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
    });

    return sb.build();
  }

  static buildGalleryScene(): SceneGraph {
    const sb = new SceneBuilder('Gallery Root');

    sb.addNode(null, 'text', {
      name: 'Gallery Title',
      textContent: 'Captured Moments',
      geometry: { position: 'absolute', x: 0, y: '6vh', width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
      style: {
        typography: {
          fontFamily: "'Cinzel', serif",
          fontSize: '2rem', fontWeight: 700, textAlign: 'center', letterSpacing: '0.15em',
          color: { type: 'token', tokenPath: 'colors.textPrimary' },
        },
      },
    });

    sb.addNode(null, 'gallery', {
      name: 'Photo Gallery Grid',
      smartComponent: 'MasonryGallery',
      geometry: { position: 'absolute', x: '5%', y: '15vh', width: '90%', height: '70vh', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
    });

    return sb.build();
  }

  static buildWishesScene(): SceneGraph {
    const sb = new SceneBuilder('Wishes Root');

    sb.addNode(null, 'text', {
      name: 'Wishes Title',
      textContent: 'Blessings & Wishes',
      geometry: { position: 'absolute', x: 0, y: '8vh', width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
      style: {
        typography: {
          fontFamily: "'Cinzel', serif",
          fontSize: '2rem', fontWeight: 700, textAlign: 'center', letterSpacing: '0.15em',
          color: { type: 'token', tokenPath: 'colors.textPrimary' },
        },
      },
    });

    sb.addNode(null, 'guestbook', {
      name: 'Wishes Wall',
      smartComponent: 'WishesWall',
      geometry: { position: 'absolute', x: '5%', y: '18vh', width: '90%', height: '70vh', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
    });

    return sb.build();
  }

  static buildVenueScene(mood: 'cosmic' | 'editorial' | 'floral' | 'modern' = 'floral'): SceneGraph {
    const sb = new SceneBuilder('Venue Root');

    sb.addNode(null, 'text', {
      name: 'Venue Eyebrow',
      textContent: 'The Destination',
      geometry: { position: 'absolute', x: 0, y: '8vh', width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.7, zIndex: 10 },
      style: {
        typography: {
          fontFamily: mood === 'editorial' ? "'Playfair Display', serif" : "'Cinzel', serif",
          fontSize: '0.875rem', fontWeight: 600, textAlign: 'center', letterSpacing: '0.3em', textTransform: 'uppercase',
          color: { type: 'token', tokenPath: 'colors.accentPrimary' },
        },
      },
    });

    sb.addNode(null, 'text', {
      name: 'Venue Title',
      textContent: 'Villa Cimbrone, Ravello',
      binding: { fieldKey: 'event.venueName', bindingType: 'content' },
      geometry: { position: 'absolute', x: 0, y: '14vh', width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
      style: {
        typography: {
          fontFamily: mood === 'editorial' ? "'Playfair Display', serif" : "'Cinzel', serif",
          fontSize: '2.5rem', fontWeight: 700, textAlign: 'center', letterSpacing: '0.12em',
          color: { type: 'token', tokenPath: 'colors.textPrimary' },
        },
      },
    });

    sb.addNode(null, 'text', {
      name: 'Venue Address',
      textContent: 'Via Santa Chiara 26, Amalfi Coast, Italy',
      binding: { fieldKey: 'event.venueAddress', bindingType: 'content' },
      geometry: { position: 'absolute', x: '15%', y: '23vh', width: '70%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.85, zIndex: 10 },
      style: {
        typography: {
          fontFamily: "'Outfit', sans-serif",
          fontSize: '1.1rem', fontWeight: 400, textAlign: 'center', lineHeight: 1.6,
          color: { type: 'token', tokenPath: 'colors.textSecondary' },
        },
      },
    });

    // Venue Card & Actions
    const cardId = sb.addNode(null, 'frame', {
      name: 'Venue Details Card',
      layoutMode: 'flex',
      layoutConfig: {
        direction: 'vertical',
        gap: '1.25rem',
        padding: { top: '2rem', right: '2.5rem', bottom: '2rem', left: '2.5rem' },
        alignment: { primary: 'center', cross: 'center' },
        wrap: false,
        sizing: { primary: 'hug', cross: 'hug' },
      },
      geometry: { position: 'absolute', x: '20%', y: '33vh', width: '60%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
      style: {
        background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.surfacePrimary' } },
        border: { radius: '16px', width: '1px', color: { type: 'token', tokenPath: 'colors.borderSubtle' } },
        effects: { backdropBlur: '16px' },
      },
    });

    sb.addNode(cardId, 'button', {
      name: 'Directions Button',
      textContent: 'Explore Interactive Map & Directions',
      geometry: { position: 'relative', x: 0, y: 0, width: 'auto', height: '48px', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 1 },
      style: {
        background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.accentPrimary' } },
        border: { radius: '999px', width: '0px' },
        padding: '12px 28px',
        typography: {
          fontFamily: "'Outfit', sans-serif",
          fontSize: '0.95rem', fontWeight: 600, letterSpacing: '0.08em',
          color: { type: 'solid', value: '#060B1A' },
        },
      },
      interactions: [
        { trigger: 'onTap', action: 'navigate', payload: { url: 'https://maps.google.com' } },
      ],
    });

    return sb.build();
  }

  static buildVowsScene(mood: 'cosmic' | 'editorial' | 'floral' | 'modern' = 'editorial'): SceneGraph {
    const sb = new SceneBuilder('Vows Root');

    sb.addNode(null, 'text', {
      name: 'Vows Eyebrow',
      textContent: 'Sacred Promises',
      geometry: { position: 'absolute', x: 0, y: '10vh', width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.7, zIndex: 10 },
      style: {
        typography: {
          fontFamily: "'Playfair Display', serif",
          fontSize: '0.875rem', fontWeight: 600, textAlign: 'center', letterSpacing: '0.3em', textTransform: 'uppercase',
          color: { type: 'token', tokenPath: 'colors.accentPrimary' },
        },
      },
    });

    sb.addNode(null, 'text', {
      name: 'Vows Title',
      textContent: 'Written In The Stars',
      geometry: { position: 'absolute', x: 0, y: '16vh', width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
      style: {
        typography: {
          fontFamily: "'Playfair Display', serif",
          fontSize: '2.5rem', fontWeight: 700, textAlign: 'center', letterSpacing: '0.12em',
          color: { type: 'token', tokenPath: 'colors.textPrimary' },
        },
      },
    });

    sb.addNode(null, 'text', {
      name: 'Vows Quote Block',
      textContent: '"In every chapter of our lives, we found each other written between the lines."',
      binding: { fieldKey: 'story.quote', bindingType: 'content' },
      geometry: { position: 'absolute', x: '18%', y: '28vh', width: '64%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.95, zIndex: 10 },
      style: {
        typography: {
          fontFamily: "'Playfair Display', serif",
          fontSize: '1.5rem', fontWeight: 400, fontStyle: 'italic', textAlign: 'center', lineHeight: 1.8,
          color: { type: 'token', tokenPath: 'colors.textPrimary' },
        },
      },
    });

    sb.addNode(null, 'text', {
      name: 'Union Declaration',
      textContent: 'Two Souls Aligned in Infinite Orbit',
      binding: { fieldKey: 'unionDeclaration', bindingType: 'content' },
      geometry: { position: 'absolute', x: '20%', y: '44vh', width: '60%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.8, zIndex: 10 },
      style: {
        typography: {
          fontFamily: "'Source Sans Pro', sans-serif",
          fontSize: '1.1rem', fontWeight: 500, textAlign: 'center', letterSpacing: '0.15em', textTransform: 'uppercase',
          color: { type: 'token', tokenPath: 'colors.accentPrimary' },
        },
      },
    });

    return sb.build();
  }

  static buildShagunScene(): SceneGraph {
    const sb = new SceneBuilder('Shagun Root');

    sb.addNode(null, 'text', {
      name: 'Shagun Eyebrow',
      textContent: 'Tradition & Blessings',
      geometry: { position: 'absolute', x: 0, y: '10vh', width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.75, zIndex: 10 },
      style: {
        typography: {
          fontFamily: "'Cinzel', serif",
          fontSize: '0.875rem', fontWeight: 600, textAlign: 'center', letterSpacing: '0.25em', textTransform: 'uppercase',
          color: { type: 'token', tokenPath: 'colors.accentPrimary' },
        },
      },
    });

    sb.addNode(null, 'text', {
      name: 'Shagun Title',
      textContent: 'Digital Shagun Envelope',
      geometry: { position: 'absolute', x: 0, y: '16vh', width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
      style: {
        typography: {
          fontFamily: "'Cinzel', serif",
          fontSize: '2.25rem', fontWeight: 700, textAlign: 'center', letterSpacing: '0.12em',
          color: { type: 'token', tokenPath: 'colors.textPrimary' },
        },
      },
    });

    sb.addNode(null, 'shagun', {
      name: 'Shagun Envelope Gateway',
      smartComponent: 'ShagunGateway',
      geometry: { position: 'absolute', x: '15%', y: '26vh', width: '70%', height: '56vh', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
    });

    return sb.build();
  }

  // ─── CONTENT & MEDIA SCHEMAS ──────────────────────────────

  static buildDefaultContentSchema(): FactoryContentField[] {
    return [
      { id: 'cf_title', key: 'celebration.title', label: 'Celebration Title', type: 'text', defaultValue: 'Celestial Odyssey', required: true },
      { id: 'cf_tagline', key: 'celebration.tagline', label: 'Tagline', type: 'text', defaultValue: 'In the presence of our dearest family & companions', required: false },
      { id: 'cf_p1_name', key: 'celebrants[0].name', label: 'Partner 1 Name', type: 'text', defaultValue: 'Aarav Sharma', required: true },
      { id: 'cf_p1_role', key: 'celebrants[0].role', label: 'Partner 1 Role', type: 'text', defaultValue: 'The Groom', required: false },
      { id: 'cf_p1_bio', key: 'celebrants[0].bio', label: 'Partner 1 Bio', type: 'longtext', defaultValue: 'An architect with a passion for heritage structures, quiet contemplation, and slow mornings.', required: false },
      { id: 'cf_p2_name', key: 'celebrants[1].name', label: 'Partner 2 Name', type: 'text', defaultValue: 'Meera Patel', required: true },
      { id: 'cf_p2_role', key: 'celebrants[1].role', label: 'Partner 2 Role', type: 'text', defaultValue: 'The Bride', required: false },
      { id: 'cf_p2_bio', key: 'celebrants[1].bio', label: 'Partner 2 Bio', type: 'longtext', defaultValue: 'A wildlife photographer captivated by mountain mist, enduring literature, and storytelling.', required: false },
      { id: 'cf_union', key: 'unionDeclaration', label: 'Union Declaration', type: 'text', defaultValue: 'Two Souls Aligned in Infinite Orbit', required: false },
      { id: 'cf_story_quote', key: 'story.quote', label: 'Story Quote', type: 'longtext', defaultValue: '"In every chapter of our lives, we found each other written between the lines."', required: false },
      { id: 'cf_story_body', key: 'story.body', label: 'Story Body', type: 'longtext', defaultValue: 'Their paths first crossed at a mountain photography workshop...', required: false },
      { id: 'cf_date', key: 'event.date', label: 'Event Date', type: 'date', defaultValue: '2026-12-18', required: true },
      { id: 'cf_time', key: 'event.time', label: 'Event Time', type: 'time', defaultValue: '16:00', required: false },
      { id: 'cf_venue', key: 'event.venueName', label: 'Venue Name', type: 'text', defaultValue: 'The Grand Pavilion', required: true },
      { id: 'cf_venue_addr', key: 'event.venueAddress', label: 'Venue Address', type: 'text', defaultValue: 'Jaipur, Rajasthan', required: false },
    ];
  }

  static buildDefaultMediaSlots(): FactoryMediaSlot[] {
    return [
      { id: 'ms_p1_portrait', slotKey: 'celebrants[0].portrait', label: 'Partner 1 Portrait', mediaType: 'image', required: true },
      { id: 'ms_p2_portrait', slotKey: 'celebrants[1].portrait', label: 'Partner 2 Portrait', mediaType: 'image', required: true },
      { id: 'ms_hero_bg', slotKey: 'hero.background', label: 'Hero Background Image', mediaType: 'image', required: false },
      { id: 'ms_gallery_1', slotKey: 'gallery.image1', label: 'Gallery Image 1', mediaType: 'image', required: false },
      { id: 'ms_gallery_2', slotKey: 'gallery.image2', label: 'Gallery Image 2', mediaType: 'image', required: false },
      { id: 'ms_gallery_3', slotKey: 'gallery.image3', label: 'Gallery Image 3', mediaType: 'image', required: false },
    ];
  }

  static buildDefaultModules(): FactoryModule[] {
    return [
      { id: 'mod_countdown', moduleType: 'countdown', label: 'Countdown Timer', isEnabled: true },
      { id: 'mod_rsvp', moduleType: 'rsvp', label: 'RSVP Module', isEnabled: true },
      { id: 'mod_guestbook', moduleType: 'guestbook', label: 'Guestbook / Wishes', isEnabled: true },
      { id: 'mod_gallery', moduleType: 'gallery', label: 'Photo Gallery', isEnabled: true },
      { id: 'mod_shagun', moduleType: 'shagun', label: 'Digital Gift (Shagun)', isEnabled: false },
      { id: 'mod_music', moduleType: 'music', label: 'Background Music', isEnabled: false },
    ];
  }

  // ─── DESIGN TOKEN PRESETS ─────────────────────────────────

  static buildCosmicTokens(): FactoryDesignTokens {
    return {
      colors: {
        background: '#060B1A',
        surfacePrimary: 'rgba(13, 20, 41, 0.85)',
        surfaceSecondary: 'rgba(255, 255, 255, 0.03)',
        textPrimary: '#E8E2D6',
        textSecondary: 'rgba(232, 226, 214, 0.65)',
        accentPrimary: '#DFBA6B',
        accentSecondary: '#B08D4C',
        borderSubtle: 'rgba(223, 186, 107, 0.15)',
        borderAccent: 'rgba(223, 186, 107, 0.35)',
      },
      typography: {
        displayFamily: "'Cinzel', serif",
        bodyFamily: "'Outfit', sans-serif",
        baseSize: '16px',
      },
      spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '2rem', xl: '4rem' },
      radius: { sm: '6px', md: '12px', lg: '16px', xl: '24px', full: '999px' },
      shadows: { subtle: '0 4px 16px rgba(0,0,0,0.3)', elevated: '0 12px 32px rgba(0,0,0,0.5)' },
      motion: { stagger: 100, entrance: { duration: 800, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' } },
    };
  }

  static buildEditorialTokens(): FactoryDesignTokens {
    return {
      colors: {
        background: '#FAFAF8',
        surfacePrimary: '#FFFFFF',
        surfaceSecondary: '#F5F3EF',
        textPrimary: '#1A1A1A',
        textSecondary: 'rgba(26, 26, 26, 0.55)',
        accentPrimary: '#2C2C2C',
        accentSecondary: '#8B7355',
        borderSubtle: 'rgba(0, 0, 0, 0.08)',
        borderAccent: 'rgba(0, 0, 0, 0.2)',
      },
      typography: {
        displayFamily: "'Playfair Display', serif",
        bodyFamily: "'Source Sans Pro', sans-serif",
        baseSize: '16px',
      },
      spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '2rem', xl: '4rem' },
      radius: { sm: '4px', md: '8px', lg: '12px', xl: '16px', full: '999px' },
      shadows: { subtle: '0 2px 8px rgba(0,0,0,0.06)', elevated: '0 8px 24px rgba(0,0,0,0.1)' },
      motion: { stagger: 80, entrance: { duration: 600, easing: 'ease-out' } },
    };
  }

  static buildFloralTokens(): FactoryDesignTokens {
    return {
      colors: {
        background: '#FFF8F0',
        surfacePrimary: '#FFFFFF',
        surfaceSecondary: '#FEF3E8',
        textPrimary: '#3D2B1F',
        textSecondary: 'rgba(61, 43, 31, 0.6)',
        accentPrimary: '#C77D5A',
        accentSecondary: '#D4956B',
        borderSubtle: 'rgba(199, 125, 90, 0.15)',
        borderAccent: 'rgba(199, 125, 90, 0.35)',
      },
      typography: {
        displayFamily: "'Cormorant Garamond', serif",
        bodyFamily: "'Lato', sans-serif",
        baseSize: '16px',
      },
      spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '2rem', xl: '4rem' },
      radius: { sm: '8px', md: '16px', lg: '24px', xl: '32px', full: '999px' },
      shadows: { subtle: '0 4px 12px rgba(61, 43, 31, 0.08)', elevated: '0 12px 32px rgba(61, 43, 31, 0.12)' },
      motion: { stagger: 120, entrance: { duration: 900, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' } },
    };
  }

  static buildModernTokens(): FactoryDesignTokens {
    return {
      colors: {
        background: '#0F172A',
        surfacePrimary: 'rgba(30, 41, 59, 0.8)',
        surfaceSecondary: 'rgba(255, 255, 255, 0.04)',
        textPrimary: '#F8FAFC',
        textSecondary: '#94A3B8',
        accentPrimary: '#38BDF8',
        accentSecondary: '#818CF8',
        borderSubtle: 'rgba(56, 189, 248, 0.15)',
        borderAccent: 'rgba(56, 189, 248, 0.4)',
      },
      typography: {
        displayFamily: "'Outfit', sans-serif",
        bodyFamily: "'Inter', sans-serif",
        baseSize: '16px',
      },
      spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '2rem', xl: '4rem' },
      radius: { sm: '6px', md: '12px', lg: '18px', xl: '24px', full: '999px' },
      shadows: { subtle: '0 4px 16px rgba(0,0,0,0.3)', elevated: '0 12px 32px rgba(56, 189, 248, 0.15)' },
      motion: { stagger: 90, entrance: { duration: 700, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' } },
    };
  }

  static buildAmalfiTokens(): FactoryDesignTokens {
    return {
      colors: {
        background: '#0D2137',
        surfacePrimary: 'rgba(15, 33, 55, 0.88)',
        surfaceSecondary: 'rgba(255, 255, 255, 0.04)',
        textPrimary: '#F4F9FD',
        textSecondary: '#9BB8D0',
        accentPrimary: '#D4AF37',
        accentSecondary: '#2B7A78',
        borderSubtle: 'rgba(43, 122, 120, 0.2)',
        borderAccent: 'rgba(212, 175, 55, 0.45)',
      },
      typography: {
        displayFamily: "'Cinzel', serif",
        bodyFamily: "'Outfit', sans-serif",
        baseSize: '16px',
      },
      spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '2rem', xl: '4rem' },
      radius: { sm: '6px', md: '14px', lg: '20px', xl: '28px', full: '999px' },
      shadows: { subtle: '0 4px 16px rgba(0,0,0,0.35)', elevated: '0 12px 36px rgba(13, 33, 55, 0.5)' },
      motion: { stagger: 90, entrance: { duration: 750, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' } },
    };
  }

  static buildGlasshouseTokens(): FactoryDesignTokens {
    return {
      colors: {
        background: '#051811',
        surfacePrimary: 'rgba(10, 36, 26, 0.88)',
        surfaceSecondary: 'rgba(255, 255, 255, 0.04)',
        textPrimary: '#E8F5E9',
        textSecondary: '#A5D6A7',
        accentPrimary: '#4EBA7C',
        accentSecondary: '#A3E4D7',
        borderSubtle: 'rgba(78, 186, 124, 0.2)',
        borderAccent: 'rgba(78, 186, 124, 0.5)',
      },
      typography: {
        displayFamily: "'Cormorant Garamond', serif",
        bodyFamily: "'Inter', sans-serif",
        baseSize: '16px',
      },
      spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '2rem', xl: '4rem' },
      radius: { sm: '8px', md: '16px', lg: '24px', xl: '32px', full: '999px' },
      shadows: { subtle: '0 4px 16px rgba(5, 24, 17, 0.4)', elevated: '0 12px 36px rgba(5, 24, 17, 0.6)' },
      motion: { stagger: 100, entrance: { duration: 800, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' } },
    };
  }

  static buildNocturneTokens(): FactoryDesignTokens {
    return {
      colors: {
        background: '#090514',
        surfacePrimary: 'rgba(26, 15, 46, 0.88)',
        surfaceSecondary: 'rgba(255, 255, 255, 0.05)',
        textPrimary: '#FAF5FF',
        textSecondary: '#D8B4FE',
        accentPrimary: '#D946EF',
        accentSecondary: '#8B5CF6',
        borderSubtle: 'rgba(217, 70, 239, 0.2)',
        borderAccent: 'rgba(217, 70, 239, 0.5)',
      },
      typography: {
        displayFamily: "'Outfit', sans-serif",
        bodyFamily: "'Inter', sans-serif",
        baseSize: '16px',
      },
      spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '2rem', xl: '4rem' },
      radius: { sm: '6px', md: '12px', lg: '18px', xl: '24px', full: '999px' },
      shadows: { subtle: '0 4px 16px rgba(0,0,0,0.5)', elevated: '0 12px 40px rgba(217, 70, 239, 0.2)' },
      motion: { stagger: 70, entrance: { duration: 600, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' } },
    };
  }

  static buildRomanticDoorsTokens(): FactoryDesignTokens {
    return {
      colors: {
        background: '#FFF9F5',
        surfacePrimary: '#FFFFFF',
        surfaceSecondary: '#F9EFE9',
        textPrimary: '#2D1B22',
        textSecondary: 'rgba(45, 27, 34, 0.65)',
        accentPrimary: '#C2737E',
        accentSecondary: '#9A5B64',
        borderSubtle: 'rgba(194, 115, 126, 0.18)',
        borderAccent: 'rgba(194, 115, 126, 0.4)',
      },
      typography: {
        displayFamily: "'Playfair Display', serif",
        bodyFamily: "'Source Sans Pro', sans-serif",
        baseSize: '16px',
      },
      spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '2rem', xl: '4rem' },
      radius: { sm: '6px', md: '12px', lg: '18px', xl: '24px', full: '999px' },
      shadows: { subtle: '0 3px 12px rgba(45, 27, 34, 0.06)', elevated: '0 10px 30px rgba(45, 27, 34, 0.12)' },
      motion: { stagger: 85, entrance: { duration: 700, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' } },
    };
  }

  static buildRoyalRegaliaTokens(): FactoryDesignTokens {
    return {
      colors: {
        background: '#120407',
        surfacePrimary: 'rgba(41, 10, 18, 0.9)',
        surfaceSecondary: 'rgba(255, 255, 255, 0.04)',
        textPrimary: '#FFF5EA',
        textSecondary: '#FCD34D',
        accentPrimary: '#F59E0B',
        accentSecondary: '#DC2626',
        borderSubtle: 'rgba(245, 158, 11, 0.25)',
        borderAccent: 'rgba(245, 158, 11, 0.55)',
      },
      typography: {
        displayFamily: "'Cinzel', serif",
        bodyFamily: "'Outfit', sans-serif",
        baseSize: '16px',
      },
      spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '2rem', xl: '4rem' },
      radius: { sm: '6px', md: '12px', lg: '18px', xl: '24px', full: '999px' },
      shadows: { subtle: '0 4px 20px rgba(0,0,0,0.6)', elevated: '0 14px 44px rgba(245, 158, 11, 0.25)' },
      motion: { stagger: 110, entrance: { duration: 900, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' } },
    };
  }

  static buildSurrealOrganimoTokens(): FactoryDesignTokens {
    return {
      colors: {
        background: '#111814',
        surfacePrimary: 'rgba(27, 38, 32, 0.88)',
        surfaceSecondary: 'rgba(255, 255, 255, 0.03)',
        textPrimary: '#F0FDF4',
        textSecondary: '#86EFAC',
        accentPrimary: '#86EFAC',
        accentSecondary: '#FB923C',
        borderSubtle: 'rgba(134, 239, 172, 0.2)',
        borderAccent: 'rgba(134, 239, 172, 0.45)',
      },
      typography: {
        displayFamily: "'Cormorant Garamond', serif",
        bodyFamily: "'Inter', sans-serif",
        baseSize: '16px',
      },
      spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '2rem', xl: '4rem' },
      radius: { sm: '8px', md: '16px', lg: '24px', xl: '32px', full: '999px' },
      shadows: { subtle: '0 4px 16px rgba(0,0,0,0.4)', elevated: '0 12px 36px rgba(134, 239, 172, 0.15)' },
      motion: { stagger: 95, entrance: { duration: 800, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' } },
    };
  }

  /**
   * Convert a TemplateManifest into a full runtime TemplateSchema
   */
  static manifestToTemplateSchema(manifest: TemplateManifest): TemplateSchema {
    return {
      id: manifest.id,
      slug: manifest.slug,
      name: manifest.name,
      badge: '★ Graph Native Masterwork',
      description: manifest.description,
      category: 'wedding',
      supportedOccasions: ['wedding', 'engagement', 'anniversary', 'party-celebration'],
      visualPersonality: (manifest.category === 'cosmic' ? 'Celestial' : manifest.category === 'floral' ? 'Floral' : manifest.category === 'editorial' ? 'Minimal' : 'Modern') as any,
      coverImage: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&q=80',
      tags: [manifest.category, 'Graph-Native', 'P13 Masterwork'],
      supportedDevices: ['desktop', 'tablet', 'mobile'],
      supportedLanguages: ['en', 'hi', 'fr', 'es'],
      audioSupport: {
        hasDefaultAudio: false,
        allowCustomerUpload: true,
      },
      tier: 'ROYAL',
      status: 'PUBLISHED',
      activeVersion: '1.0.0',
      versionHistory: [
        {
          version: '1.0.0',
          status: 'PUBLISHED',
          createdAt: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
          author: 'OrbitoX Template Studio',
          changeLog: 'Pure Graph-Native Template authored visually without React.',
          healthScore: 100,
        },
      ],
      designTokens: {
        colors: {
          backgroundPrimary: manifest.designTokens.colors.background || '#060B1A',
          backgroundSecondary: manifest.designTokens.colors.background || '#080D21',
          surfacePrimary: manifest.designTokens.colors.surfacePrimary || 'rgba(13, 20, 41, 0.85)',
          surfaceElevated: manifest.designTokens.colors.surfaceSecondary || 'rgba(21, 31, 64, 0.85)',
          textPrimary: manifest.designTokens.colors.textPrimary || '#F8FAFC',
          textSecondary: manifest.designTokens.colors.textSecondary || '#94A3B8',
          textMuted: manifest.designTokens.colors.textSecondary || '#64748B',
          accentPrimary: manifest.designTokens.colors.accentPrimary || '#DFBA6B',
          accentSecondary: manifest.designTokens.colors.accentSecondary || '#B08D4C',
          accentGlow: manifest.designTokens.colors.borderAccent || 'rgba(223, 186, 107, 0.35)',
          borderSubtle: manifest.designTokens.colors.borderSubtle || 'rgba(223, 186, 107, 0.15)',
          borderAccent: manifest.designTokens.colors.borderAccent || 'rgba(223, 186, 107, 0.35)',
          statusSuccess: '#10B981',
          statusWarning: '#F59E0B',
          statusError: '#EF4444',
        },
        typography: {
          displayFont: manifest.designTokens.typography.displayFamily?.replace(/['"]/g, '').split(',')[0] || 'Cinzel',
          headingFont: manifest.designTokens.typography.displayFamily?.replace(/['"]/g, '').split(',')[0] || 'Cinzel',
          bodyFont: manifest.designTokens.typography.bodyFamily?.replace(/['"]/g, '').split(',')[0] || 'Outfit',
          accentFont: manifest.designTokens.typography.displayFamily?.replace(/['"]/g, '').split(',')[0] || 'Cinzel',
          fontScaleDesktop: 1.0,
          fontScaleTablet: 0.88,
          fontScaleMobile: 0.78,
          lineHeightBase: 1.6,
          letterSpacingDisplay: '0.12em',
        },
        spacing: {
          xs: '0.25rem',
          sm: '0.5rem',
          md: '1rem',
          lg: '1.5rem',
          xl: '2.5rem',
          xxl: '4rem',
        },
        radius: {
          sm: '6px',
          md: '12px',
          lg: '20px',
          pill: '9999px',
          editorial: '4px',
        },
        shadows: {
          subtle: manifest.designTokens.shadows?.subtle || '0 4px 20px rgba(0, 0, 0, 0.4)',
          elevated: manifest.designTokens.shadows?.elevated || '0 12px 40px rgba(0, 0, 0, 0.6)',
          glow: '0 0 30px rgba(223, 186, 107, 0.35)',
          cosmic: '0 0 60px rgba(224, 169, 109, 0.25)',
        },
        motion: {
          globalIntensity: 'expressive',
          defaultTransitionMs: 800,
          reducedMotionActive: false,
        },
      },
      scenes: manifest.scenes.map((s, idx) => ({
        id: s.id,
        order: s.order ?? idx,
        name: s.name,
        slug: s.id.replace('scene_', ''),
        purpose: `Semantic visual scene: ${s.name}`,
        sceneType: (s.id.includes('hero') ? 'hero' : s.id.includes('portrait') ? 'portraits' : s.id.includes('countdown') ? 'countdown' : s.id.includes('rsvp') ? 'rsvp' : 'custom') as any,
        scrollMode: 'normal',
        isRequired: idx === 0,
        defaultVisible: s.defaultVisible ?? true,
        customerToggleable: idx !== 0,
        navigationLabel: s.name,
        layers: [],
        sceneGraph: s.sceneGraph,
        renderMode: 'graph',
        layoutRules: {
          desktop: { composition: 'centered', paddingTopRem: 4, paddingBottomRem: 4, contentMaxWidthPx: 1200 },
          tablet: { composition: 'centered', paddingTopRem: 3, paddingBottomRem: 3, contentMaxWidthPx: 768, isOverridden: false },
          mobile: { composition: 'centered', paddingTopRem: 2, paddingBottomRem: 2, contentMaxWidthPx: 390, isOverridden: false },
        },
        accessibility: {
          screenReaderTitle: s.name,
          ariaRole: 'region',
        },
        motionPreset: 'expressive',
        motionConfig: {
          entryDuration: 1.2,
          entryDelay: 0.1,
          parallaxDepth: 0.5,
          staggerDelay: 0.15,
          easing: 'cubic-bezier',
          reducedMotionFallback: 'fade',
        },
        interactions: [],
        transitionToNext: {
          type: 'fade',
          durationMs: 800,
          easing: 'ease-out',
        },
      })),
      contentSchema: manifest.contentSchema.map((f) => ({
        id: f.id,
        key: f.key,
        label: f.label,
        type: (f.type === 'longtext' ? 'longtext' : f.type === 'date' ? 'date' : f.type === 'time' ? 'time' : 'text') as any,
        defaultValue: f.defaultValue,
        required: f.required,
        category: 'core_story',
        customerCustomizable: 'FLEXIBLE',
        customizationLevel: 'FLEXIBLE',
        customerEditable: true,
      })),
      mediaSlots: manifest.mediaSlots.map((m) => ({
        id: m.id,
        slotKey: m.slotKey,
        label: m.label,
        sceneId: 'scene_hero',
        allowedTypes: ['image'],
        aspectRatio: '1:1',
        minResolution: { width: 800, height: 800 },
        maxFileSizeMb: 10,
        focalPointDefault: { x: 50, y: 50 },
        cropBehavior: 'fill',
        shapeOptions: ['circle', 'rounded', 'arch', 'editorial'],
        defaultShape: 'circle',
        overlayDefault: { color: '#000000', opacity: 0.3, blurPx: 0 },
        responsiveCrops: {
          desktop: { aspect: '1:1', focalPoint: { x: 50, y: 50 } },
          tablet: { aspect: '1:1', focalPoint: { x: 50, y: 50 } },
          mobile: { aspect: '1:1', focalPoint: { x: 50, y: 50 } },
        },
        customerEditable: true,
      })),
      modules: manifest.modules.map((m) => ({
        id: m.id,
        moduleType: m.moduleType as any,
        label: m.label,
        description: `${m.label} module`,
        isRequired: false,
        defaultVisibility: m.isEnabled,
        customerEditable: true,
        customizationLevel: 'FLEXIBLE' as const,
        adminNotes: '',
        supportedScenes: ['scene_hero', 'scene_rsvp'],
        isEnabled: m.isEnabled,
        requiredTier: 'ESSENTIAL',
        configSchema: [],
        defaultConfig: {},
      })) as any,
      customizationMatrix: {
        fieldPermissions: {
          'celebration.title': 'FLEXIBLE',
          'celebration.tagline': 'FLEXIBLE',
          'celebrants[0].name': 'FLEXIBLE',
          'celebrants[0].portrait': 'FLEXIBLE',
          'celebrants[1].name': 'FLEXIBLE',
          'celebrants[1].portrait': 'FLEXIBLE',
          'unionDeclaration': 'FLEXIBLE',
          'theme.palette': 'CURATED',
        },
        allowedFontFamilies: [
          { name: 'Cinzel', category: 'Classical Serif' },
          { name: 'Cormorant Garamond', category: 'Fine Art Editorial' },
          { name: 'Playfair Display', category: 'Modern Romance' },
          { name: 'Outfit', category: 'Clean Geometric' },
        ],
        allowedColorPalettes: [
          {
            id: 'default_palette',
            name: 'Template Signature',
            accentPrimary: manifest.designTokens.colors.accentPrimary || '#DFBA6B',
            accentSecondary: manifest.designTokens.colors.accentSecondary || '#B08D4C',
            backgroundPrimary: manifest.designTokens.colors.background || '#060B1A',
            surfacePrimary: manifest.designTokens.colors.surfacePrimary || 'rgba(13, 20, 41, 0.85)',
          },
        ],
        allowCustomerSectionReordering: true,
        allowCustomerSectionToggle: true,
        allowCustomerMotionTuning: true,
        allowCustomCss: false,
      },
      accessibility: {
        reducedMotionFallback: 'fade',
        minTouchTargetPx: 44,
        highContrastMode: true,
        wcagComplianceTarget: 'AA',
      },
      performanceBudget: {
        maxParticles: 50,
        maxAnimatedLayers: 8,
        mobileMotionTier: 'medium',
        maxAssetPayloadMb: 15,
      },
      healthReport: {
        score: 100,
        isPublishable: true,
        passedCount: 24,
        errors: [],
        warnings: [],
        infos: [],
        lastAuditedAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
    };
  }

  // ─── UTILITIES ────────────────────────────────────────────

  private static slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
}
