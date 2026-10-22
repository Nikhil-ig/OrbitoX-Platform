/**
 * ORBITOX P18 — WEBSITE PROJECT ARCHITECTURE & COMPOSER MODEL
 * 
 * Single source of truth data hierarchy:
 * WebsiteProject
 * ├── metadata
 * ├── theme (DesignTokens)
 * ├── fonts
 * ├── assets[]
 * ├── components[]
 * ├── variables
 * ├── pages[]
 * │   └── sections[]
 * │       └── SceneGraph (Elements & Layouts)
 * └── publish
 */

import { DeviceBreakpoint, TemplateDesignTokens, TemplateSceneDefinition, ContentFieldDefinition } from '../template-studio/types/TemplateSchema';
import { SceneGraph, SceneNodeKind } from '../template-studio/engine/SceneGraphTypes';

export type AssetCategory = 'image' | 'video' | 'audio' | 'svg' | 'font' | 'lottie' | '3d' | 'other';

export interface ProjectAsset {
  id: string;
  name: string;
  category: AssetCategory;
  url: string;
  thumbnailUrl?: string;
  sizeBytes?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  folder?: string;
  createdAt: string;
}

export interface ProjectPage {
  id: string;
  name: string;
  route: string;
  sectionIds: string[];
  breakpoints?: DeviceBreakpoint[];
  isHome?: boolean;
}

export type SectionType =
  | 'navbar'
  | 'hero'
  | 'features'
  | 'bento'
  | 'pricing'
  | 'testimonials'
  | 'gallery'
  | 'timeline'
  | 'faq'
  | 'cta'
  | 'footer'
  | 'celebration'
  | 'commerce'
  | 'restaurant'
  | 'hotel'
  | 'custom';

export interface SectionBlueprint {
  id: string;
  name: string;
  category: SectionType;
  description: string;
  previewUrl?: string;
  createSection: (nameOverride?: string) => TemplateSceneDefinition;
}

export interface WebsiteProjectMetadata {
  id: string;
  title: string;
  slug: string;
  description: string;
  author: string;
  version: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Drag and Drop Transfer Payloads
 */
export interface DragSectionPayload {
  type: 'orbitox_section';
  blueprintId?: string;
  section?: TemplateSceneDefinition;
}

export interface DragElementPayload {
  type: 'orbitox_element';
  kind: SceneNodeKind;
  name: string;
  defaults?: any;
}

export interface DragAssetPayload {
  type: 'orbitox_asset';
  asset: ProjectAsset;
}
