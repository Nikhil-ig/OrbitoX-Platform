import {
  TemplateSchema,
  TemplateSceneDefinition,
  TemplateDesignTokens,
} from '../types/TemplateSchema';
import { SceneGraph } from '../engine/SceneGraphTypes';

export type PartialBlueprintScene = {
  id: string;
  name: string;
  sceneType?: TemplateSceneDefinition['sceneType'];
  order?: number;
  slug?: string;
  purpose?: string;
  scrollMode?: TemplateSceneDefinition['scrollMode'];
  isRequired?: boolean;
  defaultVisible?: boolean;
  customerToggleable?: boolean;
  navigationLabel?: string;
  layers?: TemplateSceneDefinition['layers'];
  sceneGraph: SceneGraph;
  renderMode?: TemplateSceneDefinition['renderMode'];
  motionPreset?: TemplateSceneDefinition['motionPreset'];
  motionConfig?: Partial<TemplateSceneDefinition['motionConfig']>;
  interactions?: TemplateSceneDefinition['interactions'];
  transitionToNext?: Partial<TemplateSceneDefinition['transitionToNext']>;
  layoutRules?: Partial<TemplateSceneDefinition['layoutRules']>;
  accessibility?: Partial<TemplateSceneDefinition['accessibility']>;
};

export type PartialBlueprint = Omit<
  TemplateSchema,
  | 'contentSchema'
  | 'mediaSlots'
  | 'modules'
  | 'customizationMatrix'
  | 'accessibility'
  | 'performanceBudget'
  | 'healthReport'
  | 'createdAt'
  | 'updatedAt'
  | 'scenes'
  | 'designTokens'
> & {
  designTokens: Omit<TemplateDesignTokens, 'motion'> & {
    motion?: TemplateDesignTokens['motion'];
  };
  scenes: PartialBlueprintScene[];
} & Partial<
    Pick<
      TemplateSchema,
      | 'contentSchema'
      | 'mediaSlots'
      | 'modules'
      | 'customizationMatrix'
      | 'accessibility'
      | 'performanceBudget'
      | 'healthReport'
      | 'createdAt'
      | 'updatedAt'
    >
  >;

export function createBlueprintScene(
  scene: PartialBlueprintScene,
  index: number
): TemplateSceneDefinition {
  return {
    id: scene.id,
    order: scene.order ?? index,
    name: scene.name,
    slug: scene.slug ?? scene.id,
    purpose: scene.purpose ?? scene.name,
    sceneType: scene.sceneType ?? 'custom',
    scrollMode: scene.scrollMode ?? 'normal',
    isRequired: scene.isRequired ?? true,
    defaultVisible: scene.defaultVisible ?? true,
    customerToggleable: scene.customerToggleable ?? true,
    navigationLabel: scene.navigationLabel ?? scene.name,
    layers: scene.layers ?? [],
    sceneGraph: scene.sceneGraph,
    renderMode: scene.renderMode ?? 'graph',
    motionPreset: scene.motionPreset ?? 'subtle',
    motionConfig: {
      entryDuration: 600,
      entryDelay: 0,
      parallaxDepth: 0.1,
      staggerDelay: 80,
      easing: 'ease-out',
      reducedMotionFallback: 'fade',
      ...scene.motionConfig,
    },
    interactions: scene.interactions ?? [],
    transitionToNext: {
      type: 'crossfade',
      durationMs: 400,
      easing: 'ease-in-out',
      ...scene.transitionToNext,
    },
    layoutRules: {
      desktop: {
        composition: 'centered',
        paddingTopRem: 4,
        paddingBottomRem: 4,
        contentMaxWidthPx: 1200,
      },
      tablet: {
        composition: 'centered',
        paddingTopRem: 3,
        paddingBottomRem: 3,
        contentMaxWidthPx: 768,
        isOverridden: false,
      },
      mobile: {
        composition: 'centered',
        paddingTopRem: 2,
        paddingBottomRem: 2,
        contentMaxWidthPx: 390,
        isOverridden: false,
      },
      ...scene.layoutRules,
    },
    accessibility: {
      screenReaderTitle: scene.name,
      ariaRole: 'region',
      ...scene.accessibility,
    },
  };
}

/**
 * Creates a fully valid TemplateSchema by applying enterprise-grade default configurations
 * for governance, accessibility, performance budgeting, and content slotting.
 */
export function createBlueprintSchema(base: PartialBlueprint): TemplateSchema {
  return {
    ...base,
    designTokens: {
      ...base.designTokens,
      motion: base.designTokens.motion ?? {
        globalIntensity: 'standard',
        defaultTransitionMs: 300,
        reducedMotionActive: false,
      },
    },
    scenes: base.scenes.map((scene, i) => createBlueprintScene(scene, i)),
    contentSchema: base.contentSchema ?? [],
    mediaSlots: base.mediaSlots ?? [],
    modules: base.modules ?? [],
    customizationMatrix: base.customizationMatrix ?? {
      fieldPermissions: {},
      allowedFontFamilies: [
        { name: 'Inter', category: 'Modern Sans' },
        { name: 'Outfit', category: 'Clean Geometric' },
        { name: 'Cinzel', category: 'Classical Serif' },
        { name: 'Cormorant Garamond', category: 'Fine Art Editorial' },
      ],
      allowedColorPalettes: [],
      allowCustomerSectionReordering: true,
      allowCustomerSectionToggle: true,
      allowCustomerMotionTuning: true,
      allowCustomCss: false,
    },
    accessibility: base.accessibility ?? {
      reducedMotionFallback: 'fade',
      minTouchTargetPx: 44,
      highContrastMode: true,
      wcagComplianceTarget: 'AA',
    },
    performanceBudget: base.performanceBudget ?? {
      maxParticles: 80,
      maxAnimatedLayers: 12,
      mobileMotionTier: 'medium',
      maxAssetPayloadMb: 15,
    },
    healthReport: base.healthReport ?? {
      score: 99,
      isPublishable: true,
      passedCount: 12,
      errors: [],
      warnings: [],
      infos: [],
      lastAuditedAt: '2026-10-01T00:00:00Z',
    },
    createdAt: base.createdAt ?? '2026-10-01T00:00:00Z',
    updatedAt: base.updatedAt ?? '2026-10-01T00:00:00Z',
  };
}
