/**
 * ORBITOX CELEBRATIONS - TEMPLATE STUDIO MASTER SCHEMA
 * 
 * Strict architectural separation of concerns:
 * 1. Template Definition (Admin Schema) -> Defines capabilities, bounds, tokens, scenes, modules & limits
 * 2. Creator Configuration (Customer) -> Customized only within approved boundaries
 * 3. Guest Renderer (Runtime) -> Resolves: Template Default + Tokens + Device Override + Customer Override
 */

export type TemplateStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'ARCHIVED';
export type DeviceBreakpoint = 'desktop' | 'tablet' | 'mobile';
export type OrientationMode = 'portrait' | 'landscape';
export type CustomizationLevel = 'LOCKED' | 'CURATED' | 'FLEXIBLE' | 'ADVANCED';

import type { SceneGraph, SceneGraphNode } from '../engine/SceneGraphTypes';

export type FieldDataType =
  | 'text'
  | 'longtext'
  | 'richtext'
  | 'number'
  | 'date'
  | 'time'
  | 'datetime'
  | 'image'
  | 'gallery'
  | 'video'
  | 'audio'
  | 'color'
  | 'font'
  | 'select'
  | 'multiselect'
  | 'toggle'
  | 'slider'
  | 'url'
  | 'location'
  | 'event'
  | 'person'
  | 'repeater'
  | 'json';

export type MotionPresetType =
  | 'none'
  | 'soft'
  | 'subtle'
  | 'expressive'
  | 'cinematic'
  | 'custom';

export type SceneTransitionType =
  | 'fade'
  | 'crossfade'
  | 'morph'
  | 'light_travel'
  | 'constellation'
  | 'image_dissolve'
  | 'depth_zoom'
  | 'mask_reveal'
  | 'horizontal_travel';

export type InteractionTriggerType =
  | 'tap'
  | 'click'
  | 'double_tap'
  | 'hover'
  | 'scroll_reach'
  | 'drag'
  | 'swipe'
  | 'long_press';

export interface TemplatePageDefinition {
  id: string;
  name: string;
  route: string;
  sectionIds: string[];
  breakpoints?: DeviceBreakpoint[];
  isHome?: boolean;
}

export type InteractionActionType =
  | 'expand_modal'
  | 'reveal_content'
  | 'trigger_transition'
  | 'play_audio'
  | 'open_rsvp'
  | 'highlight_element'
  | 'chapter_jump'
  | 'toggle_view';

export type ModuleType =
  | 'rsvp'
  | 'guestbook'
  | 'blessings'
  | 'registry'
  | 'shagun'
  | 'venue'
  | 'dress_code'
  | 'gallery'
  | 'story'
  | 'countdown'
  | 'music'
  | 'family'
  | 'travel'
  | 'faq'
  | 'contact';

/**
 * Visual layer inside a scene (Semantic, not raw DOM)
 */
export interface SceneStructureLayer {
  id: string;
  name: string;
  layerType: 'atmosphere' | 'portrait_group' | 'typography' | 'interactive' | 'continuation' | 'media' | 'custom';
  semanticRole: string; // e.g., 'primary_title', 'person_a_portrait', 'background_stars'
  isVisible: boolean;
  isCustomerEditable: boolean;
  children?: SceneStructureLayer[];
  bindingFieldKey?: string; // Links to ContentFieldDefinition key
  defaultStyle?: {
    alignment?: 'left' | 'center' | 'right';
    scale?: number;
    opacity?: number;
    zIndex?: number;
    shape?: 'circle' | 'rounded' | 'editorial' | 'arch' | 'polaroid' | 'mask';
    aspectRatio?: string;
  };
  responsiveOverrides?: {
    tablet?: Partial<SceneStructureLayer['defaultStyle']>;
    mobile?: Partial<SceneStructureLayer['defaultStyle']>;
  };
}

/**
 * Content Field Definition in the Template Schema
 */
export interface ContentFieldDefinition {
  id: string;
  key: string; // e.g. "celebrants[0].name" or "story.quote"
  label: string;
  description?: string;
  helpText?: string;
  type: FieldDataType;
  required: boolean;
  defaultValue: any;
  placeholder?: string;
  sceneId?: string; // Assigned scene context
  layerId?: string; // Assigned visual layer
  
  // Customization governance
  customizationLevel: CustomizationLevel;
  customerEditable: boolean;
  adminOnly?: boolean;
  planRestriction?: 'FREE' | 'PRO' | 'ROYAL';
  
  // Validation constraints
  validation?: {
    minChars?: number;
    maxChars?: number;
    minNumber?: number;
    maxNumber?: number;
    regexPattern?: string;
    allowedExtensions?: string[];
    maxFileSizeMb?: number;
    aspectRatio?: string;
    minItems?: number;
    maxItems?: number;
  };

  // For curated / select choices
  curatedOptions?: {
    label: string;
    value: any;
    previewColor?: string;
    fontFamily?: string;
  }[];

  // Repeatable schema if type === 'repeater'
  repeaterItemSchema?: ContentFieldDefinition[];
}

export type MediaShapeVariant = 'circle' | 'rounded' | 'editorial' | 'arch' | 'polaroid' | 'mask';

/**
 * First-class Media Slot System
 */
export interface MediaSlotDefinition {
  id: string;
  slotKey: string;
  label: string;
  sceneId: string;
  allowedTypes: ('image' | 'video' | 'audio')[];
  aspectRatio: string; // e.g. "1:1", "16:9", "4:5", "3:4"
  minResolution: { width: number; height: number };
  maxFileSizeMb: number;
  focalPointDefault: { x: number; y: number }; // 0-100%
  cropBehavior: 'fit' | 'fill' | 'editorial_zoom';
  shapeOptions: MediaShapeVariant[];
  defaultShape: MediaShapeVariant;
  overlayDefault: {
    color: string;
    opacity: number;
    blurPx: number;
  };
  responsiveCrops: {
    desktop: { aspect: string; focalPoint: { x: number; y: number } };
    tablet: { aspect: string; focalPoint: { x: number; y: number } };
    mobile: { aspect: string; focalPoint: { x: number; y: number } };
  };
  customerEditable: boolean;
}

/**
 * Scene-level configuration
 */
export interface TemplateSceneDefinition {
  id: string;
  order: number;
  name: string;
  slug: string;
  purpose: string;
  sceneType: 'hero' | 'portraits' | 'constellation' | 'countdown' | 'gathering' | 'rsvp' | 'blessings' | 'custom';
  durationSeconds?: number;
  scrollMode: 'normal' | 'pinned' | 'scroll_driven' | 'horizontal' | 'chapter';
  isRequired: boolean;
  defaultVisible: boolean;
  customerToggleable: boolean;
  navigationLabel: string;
  
  // Semantic layer structure
  layers: SceneStructureLayer[];
  sceneGraph?: SceneGraph;
  renderMode?: 'legacy' | 'graph' | 'hybrid';
  
  // Motion settings
  motionPreset: MotionPresetType;
  motionConfig: {
    entryDuration: number;
    entryDelay: number;
    parallaxDepth: number; // 0 to 1
    staggerDelay: number;
    easing: 'ease-out' | 'cubic-bezier' | 'spring' | 'linear';
    reducedMotionFallback: 'fade' | 'instant' | 'static';
  };

  // Interactions for this scene
  interactions: {
    id: string;
    name: string;
    trigger: InteractionTriggerType;
    targetElementId?: string;
    condition?: string;
    action: InteractionActionType;
    actionParam?: string;
  }[];

  // Transition to next scene
  transitionToNext: {
    type: SceneTransitionType;
    durationMs: number;
    easing: string;
  };

  // Responsive layout rules
  layoutRules: {
    desktop: {
      composition: 'editorial' | 'centered' | 'split' | 'orbital' | 'asymmetric';
      paddingTopRem: number;
      paddingBottomRem: number;
      contentMaxWidthPx: number;
      isOverridden?: boolean;
    };
    tablet: {
      composition: 'editorial' | 'centered' | 'split' | 'orbital' | 'asymmetric';
      paddingTopRem: number;
      paddingBottomRem: number;
      contentMaxWidthPx: number;
      isOverridden: boolean;
    };
    mobile: {
      composition: 'editorial' | 'centered' | 'split' | 'orbital' | 'asymmetric';
      paddingTopRem: number;
      paddingBottomRem: number;
      contentMaxWidthPx: number;
      isOverridden: boolean;
    };
  };

  // Accessibility definitions
  accessibility: {
    screenReaderTitle: string;
    ariaRole: string;
    highContrastAlternative?: string;
  };
}

/**
 * Centralized Design System Tokens
 */
export interface TemplateDesignTokens {
  colors: {
    backgroundPrimary: string;
    backgroundSecondary: string;
    surfacePrimary: string;
    surfaceElevated: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    accentPrimary: string;
    accentSecondary: string;
    accentGlow: string;
    borderSubtle: string;
    borderAccent: string;
    statusSuccess: string;
    statusWarning: string;
    statusError: string;
  };
  typography: {
    displayFont: string;
    headingFont: string;
    bodyFont: string;
    accentFont: string;
    fontScaleDesktop: number; // e.g. 1.0
    fontScaleTablet: number;  // e.g. 0.88
    fontScaleMobile: number;  // e.g. 0.75
    lineHeightBase: number;
    letterSpacingDisplay: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
    pill: string;
    editorial: string;
  };
  shadows: {
    subtle: string;
    elevated: string;
    glow: string;
    cosmic: string;
  };
  motion: {
    globalIntensity: 'subtle' | 'standard' | 'expressive';
    defaultTransitionMs: number;
    reducedMotionActive: boolean;
  };
}

/**
 * Optional Modules supported by the Template
 */
export interface TemplateModuleDefinition {
  id: string;
  moduleType: ModuleType;
  label: string;
  description: string;
  isEnabled: boolean;
  isRequired: boolean;
  defaultVisibility: boolean;
  customerEditable: boolean;
  allowedPositions: ('before_gathering' | 'after_gathering' | 'after_rsvp' | 'footer')[];
  defaultPosition: string;
  maxInstances: number;
  designVariant: 'minimal' | 'luxurious' | 'interactive' | 'monochrome';
  motionVariant: 'gentle_reveal' | 'staggered_cards' | 'floating_panel';
  supportedDevices: DeviceBreakpoint[];
}

/**
 * Customer Customization Capability Matrix
 */
export interface TemplateCustomizationMatrix {
  fieldPermissions: Record<string, CustomizationLevel>; // fieldKey -> level
  allowedFontFamilies: { name: string; category: string }[];
  allowedColorPalettes: {
    id: string;
    name: string;
    accentPrimary: string;
    accentSecondary: string;
    backgroundPrimary: string;
    surfacePrimary: string;
  }[];
  allowCustomerSectionReordering: boolean;
  allowCustomerSectionToggle: boolean;
  allowCustomerMotionTuning: boolean;
  allowCustomCss: false; // STRICTLY FALSE for consumer safety
}

/**
 * Version History Record
 */
export interface TemplateVersionRecord {
  version: string;
  status: TemplateStatus;
  createdAt: string;
  publishedAt?: string;
  author: string;
  changeLog: string;
  healthScore: number;
}

/**
 * Template Health & Validation Report
 */
export interface TemplateHealthIssue {
  id: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  code: string;
  title: string;
  message: string;
  targetTab?: string;
  sceneId?: string;
  fieldId?: string;
  canAutoFix?: boolean;
}

export interface TemplateHealthReport {
  score: number; // 0 to 100
  isPublishable: boolean;
  passedCount: number;
  errors: TemplateHealthIssue[];
  warnings: TemplateHealthIssue[];
  infos: TemplateHealthIssue[];
  lastAuditedAt: string;
}

/**
 * Master Template Schema Object
 */
export interface TemplateSchema {
  id: string;
  slug: string;
  name: string;
  badge: string;
  description: string;
  category:
    | 'wedding'
    | 'anniversary'
    | 'engagement'
    | 'birthday'
    | 'gala'
    | 'universal'
    | 'saas'
    | 'agency'
    | 'ecommerce'
    | 'portfolio'
    | 'editorial'
    | 'restaurant'
    | 'hotel';
  supportedOccasions: string[];
  visualPersonality: 'Celestial' | 'Royal' | 'Amalfi' | 'Floral' | 'Modern' | 'Minimal' | 'Nocturne' | 'Editorial';
  coverImage: string;
  previewVideoUrl?: string;
  tags: string[];
  supportedDevices: DeviceBreakpoint[];
  supportedLanguages: string[];
  audioSupport: {
    hasDefaultAudio: boolean;
    defaultTrackUrl?: string;
    defaultTrackTitle?: string;
    allowCustomerUpload: boolean;
  };
  tier: 'FREE' | 'PRO' | 'ROYAL';
  status: TemplateStatus;
  activeVersion: string;
  versionHistory: TemplateVersionRecord[];
  
  // Core Subsystems
  designTokens: TemplateDesignTokens;
  scenes: TemplateSceneDefinition[];
  pages?: TemplatePageDefinition[];
  assets?: any[];
  masterComponents?: Record<string, SceneGraphNode>;
  contentSchema: ContentFieldDefinition[];
  mediaSlots: MediaSlotDefinition[];
  modules: TemplateModuleDefinition[];
  customizationMatrix: TemplateCustomizationMatrix;
  
  // Accessibility & Performance
  accessibility: {
    reducedMotionFallback: 'fade' | 'instant' | 'static';
    minTouchTargetPx: number;
    highContrastMode: boolean;
    wcagComplianceTarget: 'AA' | 'AAA';
  };
  performanceBudget: {
    maxParticles: number;
    maxAnimatedLayers: number;
    mobileMotionTier: 'low' | 'medium' | 'high';
    maxAssetPayloadMb: number;
  };

  // Publishing & SEO
  publishingConfig?: TemplatePublishingConfig;

  // Auditing
  healthReport: TemplateHealthReport;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface TemplatePublishingConfig {
  customDomain?: string;
  dnsCname?: string;
  sslStatus?: 'active' | 'pending' | 'verifying' | 'none';
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  ogImage?: string;
  canonicalUrl?: string;
  schemaType?: 'Event' | 'WeddingEvent' | 'Celebration' | 'WebSite';
  licensedTenantId?: string;
  signature?: string;
  publishedUrl?: string;
  lastPublishedAt?: string;
}
