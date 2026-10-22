/**
 * 🪐 ORBITOX STUDIO 3.0 — CANONICAL PROJECT DOCUMENT (SINGLE SOURCE OF TRUTH)
 * 
 * Strict Single Source of Truth architecture:
 * All authoring surfaces (Canvas, Inspector, Layers, Navigation, CMS, Importer)
 * mutate and read from this document model exclusively.
 */

import { DeviceBreakpoint, TemplateDesignTokens } from '@/components/template-studio/types/TemplateSchema';
import { SceneGraphNode, NodeStyle, NodeGeometry } from '@/components/template-studio/engine/SceneGraphTypes';

export interface CanonicalProjectMetadata {
  id: string;
  contextId: string;
  tenantId: string;
  slug: string;
  title: string;
  description?: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  currentVersion: number;
  publishedVersion: number;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  faviconUrl?: string;
  ogImageUrl?: string;
}

export interface TypographyToken {
  fontFamily: string;
  fontSize: string;
  fontWeight: string | number;
  lineHeight?: string;
  letterSpacing?: string;
  textTransform?: string;
}

export interface CanonicalDesignSystem {
  colors: Record<string, string>;
  typography: Record<string, TypographyToken>;
  spacing: number[];
  radii: Record<string, string>;
  shadows: Record<string, string>;
  customCss?: string;
}

export interface CanonicalPageSEO {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  noIndex?: boolean;
}

export interface CanonicalSection {
  id: string;
  name: string;
  kind: 'hero' | 'features' | 'pricing' | 'bento' | 'gallery' | 'testimonials' | 'cta' | 'footer' | 'custom';
  layout: 'flow' | 'grid' | 'freeform';
  rootNodeId: string;
  nodes: Record<string, SceneGraphNode>;
  order: number;
  locked?: boolean;
  hidden?: boolean;
  responsiveVisibility?: {
    desktop?: boolean;
    tablet?: boolean;
    mobile?: boolean;
  };
  customStyles?: NodeStyle;
}

export interface CanonicalPage {
  id: string;
  name: string;
  route: string;
  order: number;
  isHome: boolean;
  seo: CanonicalPageSEO;
  sections: CanonicalSection[];
}

export interface CanonicalCMSField {
  key: string;
  label: string;
  type: 'text' | 'longtext' | 'number' | 'boolean' | 'image' | 'date' | 'url' | 'relation';
  required?: boolean;
}

export interface CanonicalCMSCollection {
  id: string;
  slug: string;
  name: string;
  description?: string;
  fields: CanonicalCMSField[];
  items: Array<Record<string, any>>;
}

export interface CanonicalAssetRecord {
  id: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  category: 'image' | 'video' | 'audio' | 'svg' | 'font' | '3d' | 'document';
  usedInNodes: string[];
  createdAt: string;
}

export interface CanonicalPublishingConfig {
  customDomain?: string;
  cnameVerified?: boolean;
  status: 'draft' | 'published';
  publishedAt?: string;
  publishedSnapshotId?: string;
  sslActive?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  schemaType?: string;
  edgeCdnUrl?: string;
}

export interface CanonicalProjectDocument {
  id: string;
  contextId: string;
  slug: string;
  metadata: CanonicalProjectMetadata;
  designSystem: CanonicalDesignSystem;
  pages: Record<string, CanonicalPage>;
  pageOrder: string[];
  activePageId: string;
  masterComponents: Record<string, SceneGraphNode>;
  cmsCollections: Record<string, CanonicalCMSCollection>;
  assets: Record<string, CanonicalAssetRecord>;
  variables: Record<string, any>;
  motionSettings?: {
    reducedMotionFallback: boolean;
    defaultEasing: string;
    defaultDuration: number;
  };
  publishing: CanonicalPublishingConfig;
}
