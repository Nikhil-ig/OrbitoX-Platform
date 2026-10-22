import { TemplateSceneDefinition, TemplateDesignTokens } from './TemplateSchema';
import { SceneGraphNode } from '../engine/SceneGraphTypes';

export interface WebsitePage {
  id: string;
  slug: string;
  name: string;
  title: string;
  description: string;
  scenes: TemplateSceneDefinition[];
  isHomePage?: boolean;
}

export interface MediaAsset {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'icon';
  sizeBytes?: number;
  width?: number;
  height?: number;
  createdAt: string;
}

export interface WebsiteSettings {
  faviconUrl?: string;
  customDomain?: string;
  socialPreviewUrl?: string;
  analyticsId?: string;
  enableSmoothScroll?: boolean;
  status: 'DRAFT' | 'PUBLISHED';
}

export interface WebsiteProject {
  id: string;
  name: string;
  slug: string;
  activePageId: string;
  pages: WebsitePage[];
  sharedComponents: Record<string, SceneGraphNode>;
  designTokens: TemplateDesignTokens;
  assets: MediaAsset[];
  settings: WebsiteSettings;
  createdAt: string;
  updatedAt: string;
}
