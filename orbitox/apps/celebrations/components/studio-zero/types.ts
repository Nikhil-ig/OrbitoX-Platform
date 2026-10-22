'use client';

import { DeviceBreakpoint, TemplateDesignTokens, TemplateSceneDefinition } from '@/components/template-studio/types/TemplateSchema';
import { SceneGraphNode } from '@/components/template-studio/engine/SceneGraphTypes';

// ─── STUDIO 2.0 TOP-LEVEL MODES ─────────────────────────────
export type StudioMode = 'build' | 'style' | 'motion' | 'prototype' | '3d';

// ─── RIGHT INSPECTOR TABS ───────────────────────────────────
export type InspectorTab = 'essentials' | 'design' | 'behavior' | 'advanced';

// ─── DEPTH PLANES FOR PARALLAX & SCROLL ─────────────────────
export type DepthPlane = 'background' | 'atmosphere' | 'midground' | 'subject' | 'foreground' | 'ui';

// ─── MOTION PRESET TYPES ────────────────────────────────────
export type MotionPresetType =
  | 'elegant-reveal'
  | 'cinematic-reveal'
  | 'depth-zoom'
  | 'text-stagger'
  | 'floating'
  | 'magnetic'
  | 'spring'
  | 'parallax'
  | 'image-reveal'
  | 'particle-drift';

export interface MotionPresetItem {
  id: MotionPresetType;
  name: string;
  category: 'Entrance' | 'Continuous' | 'Scroll' | 'Physics';
  description: string;
  duration: number; // in seconds
  easing: string;
  properties: Record<string, any>;
}

// ─── TEMPLATE DEFINITIONS (13 CATEGORIES) ───────────────────
export type TemplateCategory =
  | 'saas'
  | 'business'
  | 'portfolio'
  | 'agency'
  | 'ecommerce'
  | 'restaurant'
  | 'hotel'
  | 'wedding'
  | 'celebration'
  | 'event'
  | 'editorial'
  | 'experimental'
  | '3d';

export interface StudioTemplateMeta {
  id: string;
  name: string;
  category: TemplateCategory;
  tagline: string;
  description: string;
  previewGradient: string;
  accentColor: string;
  pagesCount: number;
  componentsCount: number;
  hasResponsive: boolean;
  hasCMS: boolean;
  hasMotion: boolean;
  has3D: boolean;
  hasParallax: boolean;
  factoryKey?: string;
  initialTokens: TemplateDesignTokens;
}

// ─── PERFORMANCE METRICS ────────────────────────────────────
export interface ProjectPerformanceStats {
  score: number; // 0 - 100
  rating: 'Optimal' | 'Good' | 'Moderate' | 'Heavy';
  totalNodes: number;
  imageWeightKb: number;
  videoWeightKb: number;
  meshWeightKb: number;
  animationTracksCount: number;
  estimatedMobileFps: number;
  recommendations: string[];
}
