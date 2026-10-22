import {
  TemplateSchema,
  DeviceBreakpoint,
  ContentFieldDefinition,
} from '../types/TemplateSchema';
import { CelebrationState } from '@/components/studio/StudioData';
import { TemplateSchemaService } from '../services/TemplateSchemaService';

export class TemplateEditorResolver {
  /**
   * Deterministic Template Resolution Engine (Prompt #12 & #15)
   * Converts canonical TemplateSchema draft + Device Breakpoint + Customer Overrides into
   * a single immutable CelebrationState snapshot consumed by the Canvas and Guest Renderer.
   */
  static resolveTemplateSnapshot(
    draft: TemplateSchema,
    device: DeviceBreakpoint = 'desktop',
    customerOverrides: Partial<CelebrationState> = {},
    isStressTest: boolean = false
  ): CelebrationState {
    const getFieldVal = (key: string, fallback: any) => {
      const fld = draft.contentSchema.find((f) => f.key === key);
      return fld?.defaultValue !== undefined && fld.defaultValue !== '' ? fld.defaultValue : fallback;
    };

    // Find media slot defaults
    const getMediaSlotDefault = (slotKey: string, fallback: string) => {
      const slot = draft.mediaSlots.find((s) => s.slotKey === slotKey);
      return slot ? fallback : fallback;
    };

    // 1. Base Canonical Values from Schema Content Contract
    const p1ImageDefault =
      getFieldVal('celebrants[0].portrait', '') ||
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=85';
    const p2ImageDefault =
      getFieldVal('celebrants[1].portrait', '') ||
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=85';

    // Helper to evaluate module enabled state
    const getModuleEnabled = (moduleType: string, fallback: boolean = true) => {
      const mod = draft.modules?.find(
        (m) => m.moduleType === moduleType || m.id === `mod_${moduleType}`
      );
      return mod ? Boolean(mod.isEnabled) : fallback;
    };

    // Helper to parse repeater / JSON fields
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

    // Helper to parse comma-separated numbers (e.g. shagun denominations)
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
      occasion: (draft.supportedOccasions[0] || 'wedding') as any,
      theme: (draft.slug in { 'celestial-odyssey': true, 'royal-regalia': true }
        ? draft.slug
        : 'royal-regalia') as any,
      title: getFieldVal('celebration.title', draft.name),
      tagline: getFieldVal('celebration.tagline', 'In the presence of our dearest family & companions'),
      protagonist1: getFieldVal('celebrants[0].name', 'Aarav Sharma'),
      protagonist1Role: getFieldVal('celebrants[0].role', 'The Groom'),
      protagonist1Bio: getFieldVal(
        'celebrants[0].bio',
        'An architect with a passion for heritage structures, quiet contemplation, and slow mornings.'
      ),
      protagonist1Image: p1ImageDefault,
      protagonist1Vow: getFieldVal(
        'celebrants[0].vow',
        '“In you, I discovered the steadfast constellation that guides every horizon I will ever seek.”'
      ),
      protagonist2: getFieldVal('celebrants[1].name', 'Meera Patel'),
      protagonist2Role: getFieldVal('celebrants[1].role', 'The Bride'),
      protagonist2Bio: getFieldVal(
        'celebrants[1].bio',
        'A wildlife photographer captivated by mountain mist, enduring literature, and storytelling.'
      ),
      protagonist2Image: p2ImageDefault,
      protagonist2Vow: getFieldVal(
        'celebrants[1].vow',
        '“Beside you, silence feels like music and the future feels like returning home.”'
      ),
      unionDeclaration: getFieldVal(
        'celebration.unionDeclaration',
        getFieldVal(
          'unionDeclaration',
          'Two independent trajectories drawn across infinite space by gravitational destiny — merging into one eternal, harmonic constellation.'
        )
      ),
      date: getFieldVal('event.date', '2027-02-18'),
      time: getFieldVal('event.time', '06:00 PM IST'),
      venueName: getFieldVal('event.venueName', 'The Umaid Bhawan Palace'),
      venueAddress: getFieldVal(
        'event.venueAddress',
        getFieldVal('venue.address', 'Circuit House Rd, Cantt Area, Jodhpur, Rajasthan 342006')
      ),
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
      coverImage: getFieldVal(
        'celebration.coverImage',
        draft.coverImage || 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=1200&q=80'
      ),
      isSingleCelebrant: false,
      primaryColorOverride: draft.designTokens?.colors?.accentPrimary || '#DFBA6B',
      secondaryColorOverride: draft.designTokens?.colors?.accentSecondary,
      fontDisplayOverride: draft.designTokens?.typography?.displayFont,
      // Media slot styling extraction (P1 Media Authoring)
      partner1Shape: draft.mediaSlots?.find((s) => s.slotKey === 'celebrants[0].portrait')?.defaultShape || 'editorial',
      partner1FocalPoint: draft.mediaSlots?.find((s) => s.slotKey === 'celebrants[0].portrait')?.focalPointDefault || { x: 50, y: 35 },
      partner1CropBehavior: draft.mediaSlots?.find((s) => s.slotKey === 'celebrants[0].portrait')?.cropBehavior || 'editorial_zoom',
      partner2Shape: draft.mediaSlots?.find((s) => s.slotKey === 'celebrants[1].portrait')?.defaultShape || 'editorial',
      partner2FocalPoint: draft.mediaSlots?.find((s) => s.slotKey === 'celebrants[1].portrait')?.focalPointDefault || { x: 50, y: 35 },
      partner2CropBehavior: draft.mediaSlots?.find((s) => s.slotKey === 'celebrants[1].portrait')?.cropBehavior || 'editorial_zoom',
      coverImageShape: draft.mediaSlots?.find((s) => s.slotKey === 'celebration.coverImage')?.defaultShape || 'editorial',
      coverImageFocalPoint: draft.mediaSlots?.find((s) => s.slotKey === 'celebration.coverImage')?.focalPointDefault || { x: 50, y: 50 },
      coverImageCropBehavior: draft.mediaSlots?.find((s) => s.slotKey === 'celebration.coverImage')?.cropBehavior || 'fill',
      coverImageOverlay: draft.mediaSlots?.find((s) => s.slotKey === 'celebration.coverImage')?.overlayDefault || { color: '#040714', opacity: 0.35, blurPx: 0 },
      // Scene Layout & Motion Extraction (P2 Layout & Motion)
      sceneLayouts: (draft.scenes || []).reduce((acc, scn) => {
        const desktopRule = scn.layoutRules?.desktop || {
          composition: 'centered',
          paddingTopRem: 4,
          paddingBottomRem: 4,
          contentMaxWidthPx: 1200,
        };
        const devRule = scn.layoutRules ? (scn.layoutRules as any)[device] : undefined;
        const effectiveRule =
          devRule && (devRule.isOverridden || device === 'desktop') ? devRule : desktopRule;

        acc[scn.id] = {
          composition: effectiveRule.composition || 'centered',
          paddingTopRem: effectiveRule.paddingTopRem ?? 4,
          paddingBottomRem: effectiveRule.paddingBottomRem ?? 4,
          contentMaxWidthPx: effectiveRule.contentMaxWidthPx ?? 1200,
        };
        return acc;
      }, {} as Record<string, any>),
      sceneMotions: (draft.scenes || []).reduce((acc, scn) => {
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
      // Scene Interactions Extraction (P3 Interaction Authoring)
      sceneInteractions: (draft.scenes || []).reduce((acc, scn) => {
        acc[scn.id] = (scn.interactions || []).map((int) => ({
          id: int.id,
          name: int.name,
          trigger: int.trigger,
          targetElementId: int.targetElementId,
          condition: int.condition,
          action: int.action,
          actionParam: int.actionParam,
        }));
        return acc;
      }, {} as Record<string, any>),
      // Scene Graphs Extraction (P10 Visual Authoring Engine)
      sceneGraphs: (draft.scenes || []).reduce((acc, scn) => {
        if (scn.sceneGraph) {
          acc[scn.id] = scn.sceneGraph;
        }
        return acc;
      }, {} as Record<string, any>),
    };

    // 2. Apply Stress Data if enabled
    const stressData = isStressTest ? TemplateSchemaService.getStressTestData() : {};

    // 3. Filter customer overrides by customization boundaries (Prompt #36)
    const sanitizedCustomerOverrides: Partial<CelebrationState> = {};
    for (const [key, val] of Object.entries(customerOverrides)) {
      // Find matching content field to verify permission
      const matchingField = draft.contentSchema.find(
        (f) => f.key === key || f.key.endsWith(`.${key}`) || f.key.replace(/\[\d+\]\./, '.') === key
      );

      // If field exists and is LOCKED, do not apply customer override
      if (matchingField && matchingField.customizationLevel === 'LOCKED') {
        continue;
      }
      (sanitizedCustomerOverrides as any)[key] = val;
    }

    // 4. Return resolved snapshot
    return {
      ...baseState,
      ...stressData,
      ...sanitizedCustomerOverrides,
    };
  }

  /**
   * Helper to evaluate responsive inheritance for a property
   */
  static getInheritanceState(
    baseValue: unknown,
    overrideValue: unknown,
    device: DeviceBreakpoint
  ): { status: 'base' | 'inherited' | 'override'; value: unknown } {
    if (device === 'desktop') {
      return { status: 'base', value: baseValue };
    }
    if (overrideValue !== undefined && overrideValue !== null && overrideValue !== baseValue) {
      return { status: 'override', value: overrideValue };
    }
    return { status: 'inherited', value: baseValue };
  }
}
