import { SceneGraphNode, SceneNodeKind } from './SceneGraphTypes';
import { TemplateSceneDefinition } from '../types/TemplateSchema';
import { NodeDefaults } from './NodeDefaults';
import { TemplateFactory } from './TemplateFactory';

export interface DomainNodeDefinition {
  kind: string;
  label: string;
  icon: string;
  category: string;
  description: string;
  defaultNode: (id: string) => Partial<SceneGraphNode>;
}

export interface DomainSectionBlock {
  id: string;
  title: string;
  category: string;
  description: string;
  previewImage?: string;
  createScene: (title?: string) => TemplateSceneDefinition;
}

export interface DomainExtension {
  id: string;
  name: string;
  icon: string;
  category: string;
  nodeDefinitions: DomainNodeDefinition[];
  sectionBlocks?: DomainSectionBlock[];
}

export class DomainExtensionRegistry {
  private static extensions: Map<string, DomainExtension> = new Map();

  static register(extension: DomainExtension) {
    this.extensions.set(extension.id, extension);
  }

  static get(id: string): DomainExtension | undefined {
    return this.extensions.get(id);
  }

  static getAll(): DomainExtension[] {
    return Array.from(this.extensions.values());
  }

  static getAllNodes(): DomainNodeDefinition[] {
    const nodes: DomainNodeDefinition[] = [];
    for (const ext of this.extensions.values()) {
      nodes.push(...ext.nodeDefinitions);
    }
    return nodes;
  }

  static getAllSections(): DomainSectionBlock[] {
    const sections: DomainSectionBlock[] = [];
    for (const ext of this.extensions.values()) {
      if (ext.sectionBlocks) {
        sections.push(...ext.sectionBlocks);
      }
    }
    return sections;
  }
}

// ─────────────────────────────────────────────────────────────
// PRE-REGISTER: @orbitox/celebrations DOMAIN EXTENSION
// ─────────────────────────────────────────────────────────────

DomainExtensionRegistry.register({
  id: 'celebrations',
  name: 'Celebrations & Weddings',
  icon: '💍',
  category: 'Weddings & Celebrations',
  nodeDefinitions: [
    {
      kind: 'portrait',
      label: 'Partner Portrait',
      icon: '👤',
      category: 'Celebration',
      description: 'Framed portrait with focal point and customer binding',
      defaultNode: (id: string) => ({
        ...NodeDefaults.create('portrait' as SceneNodeKind),
        id,
        name: 'Partner Portrait',
      }),
    },
    {
      kind: 'couple',
      label: 'Couple Cluster',
      icon: '👥',
      category: 'Celebration',
      description: 'Dual-soul biospheres with union declaration binding',
      defaultNode: (id: string) => ({
        ...NodeDefaults.create('couple' as SceneNodeKind),
        id,
        name: 'Couple Cluster',
      }),
    },
    {
      kind: 'countdown',
      label: 'Celebration Countdown',
      icon: '⏳',
      category: 'Celebration',
      description: 'Astrolabe countdown chronometer with event date sync',
      defaultNode: (id: string) => ({
        ...NodeDefaults.create('countdown' as SceneNodeKind),
        id,
        name: 'Countdown Clock',
      }),
    },
    {
      kind: 'story',
      label: 'Love Story Stream',
      icon: '📖',
      category: 'Celebration',
      description: 'Chronological milestone narrative stream with quote block',
      defaultNode: (id: string) => ({
        ...NodeDefaults.create('story' as SceneNodeKind),
        id,
        name: 'Story Timeline',
      }),
    },
    {
      kind: 'event',
      label: 'Ceremony Card',
      icon: '📅',
      category: 'Celebration',
      description: 'Itinerary card with time, title, and venue details',
      defaultNode: (id: string) => ({
        ...NodeDefaults.create('event' as SceneNodeKind),
        id,
        name: 'Event Card',
      }),
    },
    {
      kind: 'venue',
      label: 'Sanctuary & Map',
      icon: '📍',
      category: 'Celebration',
      description: 'Palace wayfinding with address and directions action',
      defaultNode: (id: string) => ({
        ...NodeDefaults.create('venue' as SceneNodeKind),
        id,
        name: 'Venue Card',
      }),
    },
    {
      kind: 'rsvp',
      label: 'RSVP Decree Form',
      icon: '💌',
      category: 'Celebration',
      description: 'Tactile attendance decree with dietary and guest count fields',
      defaultNode: (id: string) => ({
        ...NodeDefaults.create('rsvp' as SceneNodeKind),
        id,
        name: 'RSVP Form',
      }),
    },
    {
      kind: 'shagun',
      label: 'Shagun Envelope',
      icon: '🧧',
      category: 'Celebration',
      description: 'Traditional auspicious token of regard and gift gateway',
      defaultNode: (id: string) => ({
        ...NodeDefaults.create('shagun' as SceneNodeKind),
        id,
        name: 'Shagun Gateway',
      }),
    },
    {
      kind: 'guestbook',
      label: 'Blessings Wall',
      icon: '✨',
      category: 'Celebration',
      description: 'Interactive guest blessings stream and star message wall',
      defaultNode: (id: string) => ({
        ...NodeDefaults.create('guestbook' as SceneNodeKind),
        id,
        name: 'Wishes Wall',
      }),
    },
  ],
  sectionBlocks: [
    {
      id: 'sec_celestial_hero',
      title: 'Celestial Portal Arrival',
      category: 'Hero',
      description: 'Monumental portal gateway welcoming guests with cosmic monogram',
      createScene: (title: string = 'Cosmic Portal') => ({
        id: `sec_${Date.now()}_hero`,
        name: title,
        slug: 'hero',
        order: 0,
        purpose: 'Hero entrance portal',
        sceneType: 'hero',
        scrollMode: 'normal',
        isRequired: true,
        defaultVisible: true,
        customerToggleable: false,
        navigationLabel: title,
        layers: [],
        sceneGraph: TemplateFactory.buildHeroScene('cosmic'),
        renderMode: 'graph',
        layoutRules: {
          desktop: { composition: 'centered', paddingTopRem: 4, paddingBottomRem: 4, contentMaxWidthPx: 1200 },
          tablet: { composition: 'centered', paddingTopRem: 3, paddingBottomRem: 3, contentMaxWidthPx: 768, isOverridden: false },
          mobile: { composition: 'centered', paddingTopRem: 2, paddingBottomRem: 2, contentMaxWidthPx: 390, isOverridden: false },
        },
        accessibility: { screenReaderTitle: title, ariaRole: 'banner' },
        motionPreset: 'expressive',
        motionConfig: { entryDuration: 1.2, entryDelay: 0.1, parallaxDepth: 0.5, staggerDelay: 0.15, easing: 'cubic-bezier', reducedMotionFallback: 'fade' },
        interactions: [],
        transitionToNext: { type: 'fade', durationMs: 800, easing: 'ease-out' },
      }),
    },
    {
      id: 'sec_couple_portraits',
      title: 'Couple Profiles Sanctuary',
      category: 'Profiles',
      description: 'Dual portraits with union declaration and bio highlights',
      createScene: (title: string = 'The Couple') => ({
        id: `sec_${Date.now()}_couple`,
        name: title,
        slug: 'portraits',
        order: 1,
        purpose: 'Couple portraits and vows',
        sceneType: 'portraits',
        scrollMode: 'normal',
        isRequired: false,
        defaultVisible: true,
        customerToggleable: true,
        navigationLabel: title,
        layers: [],
        sceneGraph: TemplateFactory.buildPortraitsScene('cosmic'),
        renderMode: 'graph',
        layoutRules: {
          desktop: { composition: 'centered', paddingTopRem: 4, paddingBottomRem: 4, contentMaxWidthPx: 1200 },
          tablet: { composition: 'centered', paddingTopRem: 3, paddingBottomRem: 3, contentMaxWidthPx: 768, isOverridden: false },
          mobile: { composition: 'centered', paddingTopRem: 2, paddingBottomRem: 2, contentMaxWidthPx: 390, isOverridden: false },
        },
        accessibility: { screenReaderTitle: title, ariaRole: 'region' },
        motionPreset: 'expressive',
        motionConfig: { entryDuration: 1.2, entryDelay: 0.1, parallaxDepth: 0.5, staggerDelay: 0.15, easing: 'cubic-bezier', reducedMotionFallback: 'fade' },
        interactions: [],
        transitionToNext: { type: 'fade', durationMs: 800, easing: 'ease-out' },
      }),
    },
    {
      id: 'sec_banquet_itinerary',
      title: 'Ceremonial Itinerary',
      category: 'Schedule',
      description: 'Multi-event cards stack with time stamps and locations',
      createScene: (title: string = 'Ceremony Schedule') => ({
        id: `sec_${Date.now()}_itinerary`,
        name: title,
        slug: 'itinerary',
        order: 2,
        purpose: 'Ceremony itinerary schedule',
        sceneType: 'custom',
        scrollMode: 'normal',
        isRequired: false,
        defaultVisible: true,
        customerToggleable: true,
        navigationLabel: title,
        layers: [],
        sceneGraph: TemplateFactory.buildItineraryScene(),
        renderMode: 'graph',
        layoutRules: {
          desktop: { composition: 'centered', paddingTopRem: 4, paddingBottomRem: 4, contentMaxWidthPx: 1200 },
          tablet: { composition: 'centered', paddingTopRem: 3, paddingBottomRem: 3, contentMaxWidthPx: 768, isOverridden: false },
          mobile: { composition: 'centered', paddingTopRem: 2, paddingBottomRem: 2, contentMaxWidthPx: 390, isOverridden: false },
        },
        accessibility: { screenReaderTitle: title, ariaRole: 'region' },
        motionPreset: 'expressive',
        motionConfig: { entryDuration: 1.2, entryDelay: 0.1, parallaxDepth: 0.5, staggerDelay: 0.15, easing: 'cubic-bezier', reducedMotionFallback: 'fade' },
        interactions: [],
        transitionToNext: { type: 'fade', durationMs: 800, easing: 'ease-out' },
      }),
    },
  ],
});

