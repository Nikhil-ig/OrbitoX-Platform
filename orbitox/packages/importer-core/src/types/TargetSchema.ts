/**
 * Target Schema Definitions
 * Output contract emitted by the SceneGraphCompiler, 100% aligned with OrbitoX Studio Zero.
 */

export interface TargetDesignTokens {
  colors: {
    backgroundPrimary: string;
    backgroundSecondary?: string;
    surfacePrimary?: string;
    surfaceSecondary?: string;
    textPrimary: string;
    textSecondary?: string;
    textMuted?: string;
    accentPrimary: string;
    accentSecondary?: string;
    borderSubtle?: string;
    borderStrong?: string;
    gold?: string;
    [key: string]: string | undefined;
  };
  typography: {
    fontDisplay: string;
    fontBody: string;
    fontScript?: string;
    [key: string]: string | undefined;
  };
  spacing?: Record<string, string>;
  radii?: Record<string, string>;
  shadows?: Record<string, string>;
}

export interface TargetNodeGeometry {
  position: 'flow' | 'absolute' | 'relative' | 'sticky';
  x: string | number;
  y: string | number;
  width: string | number;
  height: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  minHeight?: string | number;
  maxHeight?: string | number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  zIndex: number;
  anchor?: {
    horizontal?: 'left' | 'center' | 'right';
    vertical?: 'top' | 'center' | 'bottom';
  };
}

export interface TargetNodeStyle {
  background?: {
    type: 'solid' | 'gradient' | 'image' | 'video';
    color?: { type: 'solid' | 'token'; value?: string; tokenPath?: string };
    gradient?: any;
    image?: any;
  };
  typography?: {
    fontFamily?: { type: 'literal' | 'token'; value?: string; tokenPath?: string };
    fontSize?: string;
    fontWeight?: string | number;
    lineHeight?: string | number;
    letterSpacing?: string;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    color?: { type: 'solid' | 'token'; value?: string; tokenPath?: string };
    textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  };
  border?: {
    width?: string;
    style?: string;
    color?: { type: 'solid' | 'token'; value?: string; tokenPath?: string };
    radius?: string;
  };
  effects?: {
    shadow?: Array<{
      x: number;
      y: number;
      blur: number;
      spread?: number;
      color: string;
      inset?: boolean;
    }>;
    backdropBlur?: string;
  };
  opacity?: number;
  overflow?: 'visible' | 'hidden' | 'scroll';
}

export interface TargetSceneGraphNode {
  id: string;
  kind: string;
  name: string;
  parentId: string | null;
  children: string[];
  geometry: TargetNodeGeometry;
  layoutMode?: 'flex' | 'grid' | 'stack' | 'freeform' | 'auto';
  layoutConfig?: {
    direction?: 'horizontal' | 'vertical' | 'wrap';
    gap?: string | number;
    padding?: { top: string | number; right: string | number; bottom: string | number; left: string | number };
    alignment?: {
      primary?: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
      cross?: 'start' | 'center' | 'end' | 'stretch';
    };
    wrap?: boolean;
    gridTemplateColumns?: string;
    gridTemplateRows?: string;
  };
  style: TargetNodeStyle;
  responsive?: {
    tablet?: any;
    mobile?: any;
    [breakpoint: string]: any;
  };
  binding?: {
    model: string;
    field: string;
    expression?: string;
  };
  repeater?: {
    collection: string;
    itemAlias: string;
  };
  textContent?: string;
  props?: Record<string, any>;
  locked: boolean;
  hidden: boolean;
  customerEditable: boolean;
  customizationLevel: 'LOCKED' | 'CURATED' | 'FLEXIBLE' | 'ADVANCED';
}

export interface TargetSceneGraph {
  schemaVersion: number;
  rootNodeId: string;
  nodes: Record<string, TargetSceneGraphNode>;
  renderOrder: string[];
}

export interface TargetSceneDefinition {
  id: string;
  slug: string;
  name: string;
  archetype?: string;
  renderMode: 'graph' | 'module';
  sceneGraph: TargetSceneGraph;
  customizationLevel: 'LOCKED' | 'CURATED' | 'FLEXIBLE' | 'ADVANCED';
}

export interface TargetPageDefinition {
  id: string;
  name: string;
  route: string;
  sectionIds: string[];
  isHome?: boolean;
}

export interface TargetTemplateSchema {
  id: string;
  slug: string;
  name: string;
  category: string;
  status: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  version: string;
  designTokens: TargetDesignTokens;
  pages: TargetPageDefinition[];
  scenes: TargetSceneDefinition[];
  updatedAt: string;
}
