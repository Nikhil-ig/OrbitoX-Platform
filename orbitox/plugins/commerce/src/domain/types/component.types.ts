export type BuiltinComponentType =
  | 'announcement-bar'
  | 'header'
  | 'footer'
  | 'hero'
  | 'video-hero'
  | 'banner'
  | 'promo-ribbon'
  | 'product-grid'
  | 'product-carousel'
  | 'featured-product'
  | 'category-grid'
  | 'collection-grid'
  | 'lookbook-mosaic'
  | 'before-after-slider'
  | 'size-guide-table'
  | 'brand-story-timeline'
  | 'masonry-gallery'
  | 'accordion-features'
  | 'text-block'
  | 'image-block'
  | 'video-block'
  | 'gallery'
  | 'testimonials'
  | 'faq'
  | 'countdown'
  | 'newsletter'
  | 'instagram-feed'
  | 'stats-counter'
  | 'trust-badges'
  | 'contact-form'
  | 'custom-html'
  | 'oddaworld-gadgets-hero'
  | 'oddaworld-categories'
  | 'oddaworld-feature-spotlight'
  | 'sneakconnect-editorial-hero'
  | 'sneakconnect-popular-models'
  | 'sneakconnect-feature-grid'
  | 'hyperflux-showcase'
  | 'pegasus-split-banner'
  | 'aura-sand-carousel'
  | 'luxe-card-showcase'
  | 'neumorphic-gold-dashboard';

export type ComponentType = BuiltinComponentType | (string & {});

export type ComponentCategory =
  | 'navigation'
  | 'hero-banners'
  | 'commerce'
  | 'content'
  | 'social-proof'
  | 'marketing'
  | 'advanced'
  | 'custom';

export type FieldControlType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'color'
  | 'media'
  | 'range'
  | 'array'
  | 'json';

export interface ComponentFieldOption {
  label: string;
  value: string | number | boolean;
}

export interface ComponentSettingField {
  key: string;
  label: string;
  type: FieldControlType;
  description?: string;
  defaultValue?: any;
  options?: ComponentFieldOption[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  itemSchema?: Record<string, ComponentSettingField>; // for 'array' type
}

export interface ComponentDefinition {
  type: ComponentType;
  name: string;
  category: ComponentCategory;
  description: string;
  icon: string;
  schema: Record<string, ComponentSettingField>;
  defaultSettings: Record<string, any>;
  previewImage?: string;
  isCustom?: boolean;
  customComponentId?: string;
}

import { SectionLogicConfig } from './logic.types';
import { FlowGraph } from './flow.types';

export interface PageSection {
  id: string; // unique section UUID e.g. "sec_hero_123"
  type: ComponentType;
  name?: string; // Custom display name in editor
  enabled: boolean;
  order: number;
  settings: Record<string, any>;
  logic?: SectionLogicConfig;
  flowGraph?: FlowGraph;
  customComponentId?: string;
}

