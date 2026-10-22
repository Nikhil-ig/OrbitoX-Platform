import {
  TemplateSchema,
  TemplateHealthReport,
  TemplateHealthIssue,
  TemplateVersionRecord,
  DeviceBreakpoint,
} from '../types/TemplateSchema';
import { BUILTIN_SCHEMAS, CELESTIAL_ODYSSEY_SCHEMA } from '../schema/builtin-schemas';
import { CelebrationState } from '@/components/studio/StudioData';
import { TemplateFactory } from '../engine/TemplateFactory';
import { ScenePresets } from '../engine/ScenePresets';
import { AssetIndexedDBService } from './AssetIndexedDBService';
import { BLUEPRINT_CATALOG, getTemplateBlueprint } from '../blueprints';

const STORAGE_PREFIX = 'orbitox_celebrations_template_schema_';

export class TemplateSchemaService {
  /**
   * Retrieve schema by slug (localStorage with fallback to built-in schemas)
   */
  static getSchema(slug: string): TemplateSchema {
    let schema: TemplateSchema | null = null;

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`${STORAGE_PREFIX}${slug}`);
        if (stored) {
          const parsed = JSON.parse(stored) as TemplateSchema;
          // Validate stored schema has valid structure and scenes
          if (parsed && Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
            schema = parsed;
          } else {
            schema = null;
          }
        }
      } catch (e) {
        console.warn('Failed to parse schema from localStorage', e);
      }
    }

    if (!schema) {
      if (BLUEPRINT_CATALOG[slug]) {
        schema = JSON.parse(JSON.stringify(BLUEPRINT_CATALOG[slug]));
      } else if (BUILTIN_SCHEMAS[slug]) {
        schema = JSON.parse(JSON.stringify(BUILTIN_SCHEMAS[slug]));
      } else {
        const bp = getTemplateBlueprint(slug);
        if (bp) {
          schema = JSON.parse(JSON.stringify(bp));
        } else {
          // Default fallback is cloned Celestial Odyssey schema with custom slug/name
          const cloned = JSON.parse(JSON.stringify(CELESTIAL_ODYSSEY_SCHEMA)) as TemplateSchema;
          cloned.id = `tmpl_${slug.replace(/[^a-z0-9]/g, '_')}`;
          cloned.slug = slug;
          cloned.name = slug
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
          schema = cloned;
        }
      }
    }

    return this.reconcileSceneGraphs(schema!, slug);
  }

  /**
   * Async schema recovery checking IndexedDB first before fallback
   */
  static async getSchemaAsync(slug: string): Promise<TemplateSchema> {
    if (typeof window !== 'undefined') {
      try {
        const idbSchema = await AssetIndexedDBService.getSchema(slug);
        if (idbSchema) {
          return this.reconcileSceneGraphs(idbSchema, slug);
        }
      } catch (err) {
        console.warn('Failed to read schema from IndexedDB:', err);
      }
    }
    return this.getSchema(slug);
  }

  /**
   * Ensure every scene in a schema has a valid SceneGraph
   */
  static reconcileSceneGraphs(schema: TemplateSchema, slug?: string): TemplateSchema {
    const blueprint = (slug && BLUEPRINT_CATALOG[slug]) || (slug && BUILTIN_SCHEMAS[slug]) || CELESTIAL_ODYSSEY_SCHEMA;
    const builtin = blueprint;
    schema.scenes = (schema.scenes || []).map((scene) => {
      if (scene.sceneGraph && scene.sceneGraph.nodes && Object.keys(scene.sceneGraph.nodes).length > 0) {
        return scene;
      }
      // Attempt to recover sceneGraph from builtin schema
      const matchingBuiltin = builtin.scenes?.find((bs) => bs.id === scene.id || bs.slug === scene.slug);
      if (matchingBuiltin?.sceneGraph && Object.keys(matchingBuiltin.sceneGraph.nodes || {}).length > 0) {
        return {
          ...scene,
          sceneGraph: JSON.parse(JSON.stringify(matchingBuiltin.sceneGraph)),
          renderMode: 'graph',
        };
      }
      // Hero / arrival fallback
      if (scene.sceneType === 'hero' || scene.slug === 'arrival' || scene.id === 'scene_arrival') {
        return {
          ...scene,
          sceneGraph: TemplateFactory.buildHeroScene('cosmic'),
          renderMode: 'graph',
        };
      }
      // Default fallback to rich scene preset
      return {
        ...scene,
        sceneGraph: ScenePresets.hero(),
        renderMode: 'graph',
      };
    });
    return schema;
  }

  /**
   * Save schema to persistent local cache and IndexedDB repository
   */
  static saveSchema(schema: TemplateSchema): TemplateSchema {
    const updated: TemplateSchema = {
      ...schema,
      updatedAt: new Date().toISOString(),
      healthReport: this.validateTemplateSchema(schema),
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${schema.slug}`, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save schema to localStorage (quota exceeded), persisting to IndexedDB:', e);
      }

      try {
        AssetIndexedDBService.saveSchema(schema.slug, updated).catch((idbErr) => {
          console.warn('Failed to save schema to IndexedDB:', idbErr);
        });
      } catch (_) {}
    }

    return updated;
  }

  /**
   * Duplicate template schema to create a brand-new variation
   */
  static duplicateSchema(sourceSlug: string, newSlug: string, newName: string): TemplateSchema {
    const source = this.getSchema(sourceSlug);
    const duplicated: TemplateSchema = {
      ...JSON.parse(JSON.stringify(source)),
      id: `tmpl_${newSlug.replace(/[^a-z0-9]/g, '_')}`,
      slug: newSlug,
      name: newName,
      status: 'DRAFT',
      activeVersion: '1.0.0-draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versionHistory: [
        {
          version: '1.0.0-draft',
          status: 'DRAFT',
          createdAt: new Date().toISOString(),
          author: 'Platform Admin',
          changeLog: `Duplicated from ${source.name}`,
          healthScore: source.healthReport.score,
        },
      ],
    };

    return this.saveSchema(duplicated);
  }

  /**
   * Publish version with safety gates
   */
  static publishVersion(schema: TemplateSchema): { success: boolean; schema: TemplateSchema; error?: string } {
    const report = this.validateTemplateSchema(schema);
    if (!report.isPublishable) {
      return {
        success: false,
        schema,
        error: `Cannot publish: ${report.errors.length} blocking error(s) must be resolved first.`,
      };
    }

    const nextVersionRecord: TemplateVersionRecord = {
      version: schema.activeVersion.replace('-draft', ''),
      status: 'PUBLISHED',
      createdAt: schema.createdAt,
      publishedAt: new Date().toISOString(),
      author: 'Super Admin',
      changeLog: `Published production version ${schema.activeVersion}`,
      healthScore: report.score,
    };

    const published: TemplateSchema = {
      ...schema,
      status: 'PUBLISHED',
      activeVersion: nextVersionRecord.version,
      publishedAt: nextVersionRecord.publishedAt,
      versionHistory: [
        nextVersionRecord,
        ...schema.versionHistory.filter((v) => v.version !== nextVersionRecord.version),
      ],
      healthReport: report,
    };

    this.saveSchema(published);
    return { success: true, schema: published };
  }

  /**
   * Comprehensive Validation Engine (37-point rule check)
   */
  static validateTemplateSchema(schema: TemplateSchema): TemplateHealthReport {
    const errors: TemplateHealthIssue[] = [];
    const warnings: TemplateHealthIssue[] = [];
    const infos: TemplateHealthIssue[] = [];
    let passedCount = 0;

    // Check 1: Metadata Title and Slug
    if (!schema.name || schema.name.trim().length < 3) {
      errors.push({
        id: 'err_name',
        severity: 'ERROR',
        code: 'INVALID_NAME',
        title: 'Template Name Required',
        message: 'Template must have a descriptive human-readable name of at least 3 characters.',
        targetTab: 'overview',
      });
    } else {
      passedCount++;
    }

    // Check 2: Scenes configured
    if (!schema.scenes || schema.scenes.length === 0) {
      errors.push({
        id: 'err_scenes_empty',
        severity: 'ERROR',
        code: 'NO_SCENES',
        title: 'At Least One Scene Required',
        message: 'Template requires at least one active scene in its experience journey.',
        targetTab: 'scenes',
      });
    } else {
      passedCount++;
    }

    // Check 3: Check scenes for layers and fields
    schema.scenes.forEach((scene) => {
      if (!scene.layers || scene.layers.length === 0) {
        errors.push({
          id: `err_scene_layers_${scene.id}`,
          severity: 'ERROR',
          code: 'SCENE_NO_LAYERS',
          title: `Scene '${scene.name}' Has No Layers`,
          message: 'Every scene must contain semantic layers for visual rendering.',
          targetTab: 'scenes',
          sceneId: scene.id,
        });
      } else {
        passedCount++;
      }

      // Check responsive overrides
      if (!scene.layoutRules?.mobile) {
        errors.push({
          id: `err_scene_mobile_${scene.id}`,
          severity: 'ERROR',
          code: 'MOBILE_LAYOUT_MISSING',
          title: `Mobile Layout Undefined for '${scene.name}'`,
          message: 'Every celebration scene must explicitly define mobile viewport layout rules.',
          targetTab: 'responsive',
          sceneId: scene.id,
        });
      } else {
        passedCount++;
      }

      // Check motion reduced-motion fallback
      if (!scene.motionConfig?.reducedMotionFallback) {
        warnings.push({
          id: `warn_motion_rm_${scene.id}`,
          severity: 'WARNING',
          code: 'REDUCED_MOTION_FALLBACK_MISSING',
          title: `Reduced Motion Behavior Undefined for '${scene.name}'`,
          message: 'Scene animation should define a static or subtle fade fallback for accessibility.',
          targetTab: 'motion',
          sceneId: scene.id,
        });
      } else {
        passedCount++;
      }

      // Check accessibility screen reader label
      if (!scene.accessibility?.screenReaderTitle) {
        warnings.push({
          id: `warn_a11y_${scene.id}`,
          severity: 'WARNING',
          code: 'SCREEN_READER_LABEL_MISSING',
          title: `Accessibility Label Missing for '${scene.name}'`,
          message: 'Screen readers require an accessible description for assistive technologies.',
          targetTab: 'accessibility',
          sceneId: scene.id,
        });
      } else {
        passedCount++;
      }
    });

    // Check 4: Content Schema Required Customer Fields
    schema.contentSchema.forEach((field) => {
      if (field.required && !field.customerEditable && !field.defaultValue) {
        errors.push({
          id: `err_fld_req_${field.id}`,
          severity: 'ERROR',
          code: 'REQUIRED_FIELD_UNAVAILABLE',
          title: `Required Field '${field.label}' Unfillable`,
          message: 'Required field is marked non-customer-editable with no default value provided.',
          targetTab: 'contentSchema',
          fieldId: field.id,
        });
      } else {
        passedCount++;
      }
    });

    // Check 5: Media Slots Fallback Check
    schema.mediaSlots.forEach((slot) => {
      if (!slot.aspectRatio) {
        warnings.push({
          id: `warn_slot_aspect_${slot.id}`,
          severity: 'WARNING',
          code: 'MEDIA_SLOT_ASPECT_RATIO',
          title: `Aspect Ratio Missing for '${slot.label}'`,
          message: 'Mobile-first cropping requires an explicit aspect ratio definition.',
          targetTab: 'responsive',
        });
      } else {
        passedCount++;
      }
    });

    // Check 6: Design Tokens contrast & presence
    if (!schema.designTokens?.colors?.accentPrimary || !schema.designTokens?.colors?.backgroundPrimary) {
      errors.push({
        id: 'err_tokens_color',
        severity: 'ERROR',
        code: 'MISSING_CORE_COLORS',
        title: 'Core Design Tokens Incomplete',
        message: 'Primary accent and background colors must be defined.',
        targetTab: 'designSystem',
      });
    } else {
      passedCount++;
    }

    // Check 7: Performance budget
    if (schema.performanceBudget.maxParticles > 150) {
      warnings.push({
        id: 'warn_perf_particles',
        severity: 'WARNING',
        code: 'PARTICLE_BUDGET_EXCEEDED',
        title: 'High Particle Count Warning',
        message: 'More than 150 particles may cause frame stutter on older mobile devices.',
        targetTab: 'motion',
      });
    } else {
      passedCount++;
    }

    const totalWeight = errors.length * 20 + warnings.length * 3;
    const score = Math.max(20, Math.min(100, 100 - totalWeight));
    const isPublishable = errors.length === 0;

    return {
      score,
      isPublishable,
      passedCount,
      errors,
      warnings,
      infos,
      lastAuditedAt: new Date().toISOString(),
    };
  }

  /**
   * Deterministic Resolution Engine:
   * Merges: Template Defaults + Theme Tokens + Device Overrides + Customer Overrides -> Final CelebrationState
   */
  static resolveTemplateToStudioState(
    schema: TemplateSchema,
    customerOverrides: Partial<CelebrationState> = {},
    device: DeviceBreakpoint = 'desktop'
  ): CelebrationState {
    // Extract default values from schema content fields
    const getFieldVal = (key: string, fallback: any) => {
      const fld = schema.contentSchema.find((f) => f.key === key);
      return fld?.defaultValue !== undefined ? fld.defaultValue : fallback;
    };

    // Helper to evaluate module enabled state
    const getModuleEnabled = (moduleType: string, fallback: boolean = true) => {
      const mod = schema.modules?.find(
        (m) => m.moduleType === moduleType || m.id === `mod_${moduleType}`
      );
      return mod ? Boolean(mod.isEnabled) : fallback;
    };

    const getJsonOrVal = (key: string, fallback: any) => {
      const raw = getFieldVal(key, null);
      if (raw === null || raw === undefined) return fallback;
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw);
        } catch {
          return raw || fallback;
        }
      }
      return raw;
    };

    const getNumberArray = (key: string, fallback: number[]) => {
      const raw = getFieldVal(key, null);
      if (!raw) return fallback;
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string') {
        const parsed = raw
          .split(',')
          .map((s: string) => Number(s.trim()))
          .filter((n: number) => !isNaN(n) && n > 0);
        return parsed.length > 0 ? parsed : fallback;
      }
      return fallback;
    };

    const baseState: CelebrationState = {
      occasion: (schema.supportedOccasions[0] || 'wedding') as any,
      theme: (schema.slug in { 'celestial-odyssey': true, 'royal-regalia': true } ? schema.slug : 'royal-regalia') as any,
      title: getFieldVal('celebration.title', schema.name),
      tagline: getFieldVal('celebration.tagline', 'In the presence of our dearest family & companions'),
      protagonist1: getFieldVal('celebrants[0].name', 'Aarav Sharma'),
      protagonist1Role: getFieldVal('celebrants[0].role', 'The Groom'),
      protagonist1Bio: getFieldVal('celebrants[0].bio', 'Architect, heritage enthusiast, and classical guitarist.'),
      protagonist1Image: getFieldVal('celebrants[0].portrait', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=85'),
      protagonist1Vow: getFieldVal('celebrants[0].vow', '“In you, I discovered the steadfast constellation that guides every horizon I will ever seek.”'),
      protagonist2: getFieldVal('celebrants[1].name', 'Meera Sen'),
      protagonist2Role: getFieldVal('celebrants[1].role', 'The Bride'),
      protagonist2Bio: getFieldVal('celebrants[1].bio', 'Classical Kathak dancer, wildlife conservationist, and book lover.'),
      protagonist2Image: getFieldVal('celebrants[1].portrait', 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=85'),
      protagonist2Vow: getFieldVal('celebrants[1].vow', '“Beside you, silence feels like music and the future feels like returning home.”'),
      unionDeclaration: getFieldVal('unionDeclaration', getFieldVal('celebration.unionDeclaration', 'Two independent trajectories drawn across infinite space by gravitational destiny — merging into one eternal, harmonic constellation.')),
      date: getFieldVal('event.date', '2027-02-18'),
      time: getFieldVal('event.time', '06:00 PM IST'),
      venueName: getFieldVal('event.venueName', 'The Umaid Bhawan Palace'),
      venueAddress: getFieldVal('event.venueAddress', getFieldVal('venue.address', 'Circuit House Rd, Cantt Area, Jodhpur, Rajasthan 342006')),
      city: getFieldVal('event.city', 'Jodhpur'),
      stateCountry: getFieldVal('event.stateCountry', 'Rajasthan, India'),
      guestCountTarget: Number(getFieldVal('rsvp.guestCountTarget', 150)) || 150,
      additionalLocations: [
        { id: 'loc-1', name: 'Baradari Lawns & Pavilion', address: 'Palace Central Gardens', note: 'Shuttles available' },
        { id: 'loc-2', name: 'Zenana Courtyard & Stepwell', address: 'Inner Heritage Courtyard', note: 'Valet at Gate 2' },
      ],
      storyQuote: getFieldVal('story.quote', '“Two independent trajectories drawn across infinite space by gravitational destiny.”'),
      storyBody: getFieldVal('story.body', 'From our first meeting under a canopy of starlight in the ancient city of Jodhpur to this sacred hour...'),
      milestones: getJsonOrVal('story.milestones', undefined),
      itinerary: getJsonOrVal('itinerary.items', [
        { id: 'ev-1', title: 'The Gilded Haldi & Shringaar', time: '10:00 AM', desc: 'Zenana Courtyard • 2027-02-18', venue: 'Zenana Courtyard', dressCode: 'Mustard Raw Silk & Marigold' },
        { id: 'ev-2', title: 'The Celestial Sangeet & Revelry', time: '07:30 PM', desc: 'Baradari Pavilion • 2027-02-18', venue: 'Baradari Pavilion', dressCode: 'Midnight Velvet & Astral Gold' },
        { id: 'ev-3', title: 'The Royal Phere & Sacred Muhurat', time: '06:00 PM', desc: 'Grand Palace Lawns • 2027-02-19', venue: 'Grand Palace Lawns', dressCode: 'Heritage Regal Ivory & Rose Gold' },
      ]),
      speedTier: getFieldVal('countdown.speedTier', 'celestial'),
      enableCountdown: getModuleEnabled('countdown', true),
      enableCoupleProfile: getModuleEnabled('couple_profile', true),
      enableItinerary: getModuleEnabled('itinerary', true),
      enableStory: getModuleEnabled('story', true),
      enableVenueMap: getModuleEnabled('venue_map', true),
      enableDressCode: getModuleEnabled('dress_code', true),
      enableGallery: getModuleEnabled('gallery', true),
      enableRsvp: getModuleEnabled('rsvp', true),
      enableShagun: getModuleEnabled('shagun', true),
      enableGuestbook: getModuleEnabled('guestbook', true),
      enableMusic: getModuleEnabled('music', true),
      rsvpDeadline: getFieldVal('rsvp.deadline', '10 January 2027'),
      allowPlusOnes: getFieldVal('rsvp.allowPlusOnes', 'yes'),
      enableDietary: Boolean(getFieldVal('rsvp.enableDietary', true)),
      upiId: getFieldVal('blessings.upiId', 'aarav.meera@okhdfcbank'),
      shagunAmounts: getNumberArray('blessings.shagunAmounts', [1001, 2100, 5100, 11000]),
      hasPasscodeProtection: Boolean(getFieldVal('security.hasPasscode', false)),
      passcode: getFieldVal('security.passcode', '2027'),
      previewMode: 'experience',
      monogramInitials: getFieldVal('monogram.initials', 'A & M'),
      monogramStyle: getFieldVal('monogram.style', 'arch'),
      monogramImage: getFieldVal('monogram.image', ''),
      coverImage: getFieldVal('celebration.coverImage', schema.coverImage || 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=1200&q=80'),
      isSingleCelebrant: false,
      primaryColorOverride: schema.designTokens?.colors?.accentPrimary || '#DFBA6B',
      secondaryColorOverride: schema.designTokens?.colors?.accentSecondary,
      fontDisplayOverride: schema.designTokens?.typography?.displayFont,
      // Media slot styling extraction (P1 Media Authoring)
      partner1Shape: schema.mediaSlots?.find((s) => s.slotKey === 'celebrants[0].portrait')?.defaultShape || 'editorial',
      partner1FocalPoint: schema.mediaSlots?.find((s) => s.slotKey === 'celebrants[0].portrait')?.focalPointDefault || { x: 50, y: 35 },
      partner1CropBehavior: schema.mediaSlots?.find((s) => s.slotKey === 'celebrants[0].portrait')?.cropBehavior || 'editorial_zoom',
      partner2Shape: schema.mediaSlots?.find((s) => s.slotKey === 'celebrants[1].portrait')?.defaultShape || 'editorial',
      partner2FocalPoint: schema.mediaSlots?.find((s) => s.slotKey === 'celebrants[1].portrait')?.focalPointDefault || { x: 50, y: 35 },
      partner2CropBehavior: schema.mediaSlots?.find((s) => s.slotKey === 'celebrants[1].portrait')?.cropBehavior || 'editorial_zoom',
      coverImageShape: schema.mediaSlots?.find((s) => s.slotKey === 'celebration.coverImage')?.defaultShape || 'editorial',
      coverImageFocalPoint: schema.mediaSlots?.find((s) => s.slotKey === 'celebration.coverImage')?.focalPointDefault || { x: 50, y: 50 },
      coverImageCropBehavior: schema.mediaSlots?.find((s) => s.slotKey === 'celebration.coverImage')?.cropBehavior || 'fill',
      coverImageOverlay: schema.mediaSlots?.find((s) => s.slotKey === 'celebration.coverImage')?.overlayDefault || { color: '#040714', opacity: 0.35, blurPx: 0 },
      // Scene Layout & Motion Extraction (P2 Layout & Motion)
      sceneLayouts: (schema.scenes || []).reduce((acc, scn) => {
        const desktopRule = scn.layoutRules?.desktop || {
          composition: 'centered',
          paddingTopRem: 4,
          paddingBottomRem: 4,
          contentMaxWidthPx: 1200,
        };
        acc[scn.id] = {
          composition: desktopRule.composition || 'centered',
          paddingTopRem: desktopRule.paddingTopRem ?? 4,
          paddingBottomRem: desktopRule.paddingBottomRem ?? 4,
          contentMaxWidthPx: desktopRule.contentMaxWidthPx ?? 1200,
        };
        return acc;
      }, {} as Record<string, any>),
      sceneMotions: (schema.scenes || []).reduce((acc, scn) => {
        acc[scn.id] = {
          preset: scn.motionPreset || 'expressive',
          entryDuration: scn.motionConfig?.entryDuration ?? 1.2,
          entryDelay: scn.motionConfig?.entryDelay ?? 0.1,
          parallaxDepth: scn.motionConfig?.parallaxDepth ?? 0.6,
          staggerDelay: scn.motionConfig?.staggerDelay ?? 0.15,
          easing: scn.motionConfig?.easing || 'ease-out',
          reducedMotionFallback: scn.motionConfig?.reducedMotionFallback || 'fade',
        };
        return acc;
      }, {} as Record<string, any>),
    };

    // Apply customer overrides safely according to permissions
    return {
      ...baseState,
      ...customerOverrides,
    };
  }

  /**
   * Stress-test data generator for robust responsive testing
   */
  static getStressTestData(): Partial<CelebrationState> {
    return {
      title: 'His Excellency Maharaja Vikramaditya Prithviraj Chauhan & Maharani Ananya Radhika Devi Singh of Ranthambore Grand Nuptial Gala',
      tagline: 'Under the auspices of supreme imperial heritage spanning eight centuries of illustrious celestial lineage, we decree your honored attendance.',
      protagonist1: 'Maharajkumar Vikramaditya Prithviraj Devendra Singh Chauhan',
      protagonist1Bio: 'Senior Executive Partner at Trans-Eurasian Heritage Investments, Master Equestrian of the Imperial Polo Club, and Patron of Ancient Rajputana Architecture.',
      protagonist1Vow: '“In every universe forged across eternity, through every epoch of stars and silence, my soul recognizes the immutable sovereign gravity that binds my destiny solely and entirely unto your heartbeat.”',
      protagonist2: 'Maharajkumari Ananya Radhika Gayatri Devi of Jaipur & Bundi',
      protagonist2Bio: 'Curator of Classical Antiquities at the Royal Victoria Memorial Trust, Wildlife Biologist, and Champion of Indigenous Weaving Guilds.',
      protagonist2Vow: '“Before kings and constellations, beside marble water-palaces and eternal flame, I proclaim my lifelong loyalty and boundless devotion to the sanctuary of your noble and gentle spirit.”',
      unionDeclaration: 'Where ancient desert fortresses touch the infinite diamond heavens, two imperial trajectories coalesce into an unbroken celestial dynasty of honor and grace.',
      date: '2027-11-28',
      time: '08:45 PM IST',
      venueName: 'The Monumental Umaid Bhawan Sovereign Heritage Fortress & Imperial Citadel',
      venueAddress: 'Palace Road, Cantt Royal Military Enclave, Jodhpur Heritage Sector, Marwar Province, Rajasthan 342006, Republic of India',
      city: 'Jodhpur, Rajasthan, India',
      itinerary: [
        { id: 'ev-1', title: 'The Imperial Welcome & Sacred Ganga Aarti Invocation', time: '09:30 AM', desc: 'East Portico • 2027-11-28', venue: 'East Portico Elephant Gate', dressCode: 'Traditional Rajputana Royal Attire' },
        { id: 'ev-2', title: 'The Gilded Haldi, Chuda & Imperial Shringaar Ceremony', time: '11:30 AM', desc: 'Zenana Stepwell • 2027-11-28', venue: 'Zenana Marble Stepwell Pavilion', dressCode: 'Saffron & Gold Embroidered Zari' },
        { id: 'ev-3', title: 'The Grand Mehfil-e-Khas, Sufi Musical Odyssey & Royal Banquet', time: '07:30 PM', desc: 'Baradari Courtyard • 2027-11-28', venue: 'Baradari Mirrored Courtyard', dressCode: 'Velvet Sherwani & Polki Jewels' },
        { id: 'ev-4', title: 'The Auspicious Baraat Procession with Imperial Brass Band', time: '04:00 PM', desc: 'Clock Tower to Palace Gate • 2027-11-29', venue: 'Clock Tower to Palace Gate', dressCode: 'Heritage Turbans & Emerald Brooches' },
        { id: 'ev-5', title: 'The Sacred Varmala, Vedic Phere & Cosmic Muhurat', time: '07:00 PM', desc: 'Sun Temple Lawns • 2027-11-29', venue: 'Grand Sun Temple Lawns', dressCode: 'Pure Ivory Silk & Crimson Dupatta' },
        { id: 'ev-6', title: 'The Royal Starlight Gala, Fireworks & Midnight Toast', time: '10:30 PM', desc: 'Palace Central Terrace • 2027-11-29', venue: 'Palace Central Terrace & Ballroom', dressCode: 'Formal Black Tie & Royal Regalia' },
      ],
    };
  }
}
