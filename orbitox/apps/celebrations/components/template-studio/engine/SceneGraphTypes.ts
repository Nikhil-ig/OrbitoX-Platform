import { CustomizationLevel, DeviceBreakpoint } from '../types/TemplateSchema';

// ─────────────────────────────────────────────────────────────
// 1. NODE KINDS
// ─────────────────────────────────────────────────────────────

export type PrimitiveNodeKind =
  | 'frame'
  | 'container'
  | 'stack'
  | 'grid'
  | 'text'
  | 'richtext'
  | 'image'
  | 'video'
  | 'audio'
  | 'shape'
  | 'line'
  | 'group'
  | 'spacer'
  | 'gradient'
  | 'mask'
  | 'button'
  | 'divider'
  | 'icon';

export type SemanticNodeKind =
  | 'person'
  | 'portrait'
  | 'couple'
  | 'couplecluster'
  | 'story'
  | 'milestone'
  | 'storymilestone'
  | 'event'
  | 'eventcard'
  | 'venue'
  | 'countdown'
  | 'rsvp'
  | 'rsvpform'
  | 'guestbook'
  | 'blessing'
  | 'gallery'
  | 'navigation'
  | 'transition'
  | 'shagun'
  | 'gift';

export type VisualNodeKind =
  | 'constellation'
  | 'orbit'
  | 'atmosphere'
  | 'particlefield'
  | 'starfield'
  | 'lightsource'
  | 'glow'
  | 'backdrop'
  | 'interactive_object'
  | 'noise'
  | 'imagetreatment';

export type SceneNodeKind = PrimitiveNodeKind | SemanticNodeKind | VisualNodeKind | 'smart';

// ─────────────────────────────────────────────────────────────
// 2. GEOMETRY
// ─────────────────────────────────────────────────────────────

export type CSSValue = string | number;

export interface NodeGeometry {
  position: 'flow' | 'absolute' | 'relative' | 'sticky';
  x: CSSValue;
  y: CSSValue;
  width: CSSValue;
  height: CSSValue;
  minWidth?: CSSValue;
  maxWidth?: CSSValue;
  minHeight?: CSSValue;
  maxHeight?: CSSValue;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  zIndex: number;
  anchor?: {
    horizontal?: 'left' | 'center' | 'right';
    vertical?: 'top' | 'center' | 'bottom';
  };
  transformOrigin?: string;
}

// ─────────────────────────────────────────────────────────────
// 3. LAYOUT CONFIGURATIONS
// ─────────────────────────────────────────────────────────────

export interface AutoLayoutConfig {
  direction: 'horizontal' | 'vertical' | 'wrap';
  gap: CSSValue;
  padding: {
    top: CSSValue;
    right: CSSValue;
    bottom: CSSValue;
    left: CSSValue;
  };
  alignment: {
    primary: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
    cross: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  };
  wrap: boolean;
  sizing: {
    primary: 'hug' | 'fill' | 'fixed';
    cross: 'hug' | 'fill' | 'fixed';
  };
  childOverrides?: Record<string, {
    sizing?: 'hug' | 'fill' | 'fixed';
    alignment?: 'start' | 'center' | 'end' | 'stretch';
    flexGrow?: number;
    flexShrink?: number;
    order?: number;
  }>;
}

export interface GridLayoutConfig {
  columns: number | 'auto-fill' | 'auto-fit';
  columnWidth?: CSSValue;
  rows?: number | 'auto';
  rowHeight?: CSSValue;
  gap: CSSValue;
  padding: {
    top: CSSValue;
    right: CSSValue;
    bottom: CSSValue;
    left: CSSValue;
  };
  alignment: {
    horizontal: string;
    vertical: string;
  };
}

// ─────────────────────────────────────────────────────────────
// 4. SCENE GRAPH NODE
// ─────────────────────────────────────────────────────────────

export type NodeStyle = {
  // Typography (text nodes)
  typography?: {
    fontFamily?: string;
    fontSize?: CSSValue;
    fontWeight?: number | string;
    lineHeight?: CSSValue;
    letterSpacing?: CSSValue;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    textDecoration?: string;
    color?: ColorValue;
    textShadow?: string;
    maxWidth?: CSSValue;
    textWrap?: 'balance' | 'pretty' | 'normal';
    fontStyle?: 'normal' | 'italic';
  };
  
  // Background
  background?: {
    type: 'solid' | 'gradient' | 'image' | 'none';
    color?: ColorValue;
    gradient?: GradientDef;
    image?: string;
    size?: 'cover' | 'contain' | 'auto' | CSSValue;
    position?: string;
    repeat?: string;
  };
  
  // Border
  border?: {
    width?: CSSValue;
    style?: 'solid' | 'dashed' | 'dotted' | 'none';
    color?: ColorValue;
    radius?: CSSValue | { tl: CSSValue; tr: CSSValue; br: CSSValue; bl: CSSValue };
  };
  
  // Shadow
  shadow?: {
    boxShadow?: string;
    dropShadow?: string;
  };
  
  // Effects
  effects?: {
    blur?: CSSValue;
    backdropBlur?: CSSValue;
    brightness?: number;
    contrast?: number;
    saturate?: number;
    grayscale?: number;
    hueRotate?: number;
    invert?: number;
    sepia?: number;
  };
  
  // Blend & Composite
  blendMode?: string;
  mixBlendMode?: string;
  
  // Overflow
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
  
  // Mask & Clip
  mask?: {
    type: 'none' | 'url' | 'gradient' | 'shape';
    value?: string;
  };
  clipPath?: string;
  
  // Spacing
  padding?: string;
  paddingTop?: string | number;
  paddingRight?: string | number;
  paddingBottom?: string | number;
  paddingLeft?: string | number;
  margin?: string;
  marginTop?: string | number;
  marginRight?: string | number;
  marginBottom?: string | number;
  marginLeft?: string | number;
  gap?: CSSValue;

  // Media & Image Framing
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down' | 'none';
  objectPosition?: string;
  aspectRatio?: string;
  filter?: string;
  focalPoint?: { x: number; y: number };

  // Parallax Depth Plane (-5 to +5)
  depthPlane?: number;
};

export type NodeTypography = NonNullable<NodeStyle['typography']>;

export type ColorValue =
  | { type: 'solid'; value: string }
  | { type: 'token'; tokenPath: string }
  | { type: 'gradient'; gradient: GradientDef };

export interface GradientDef {
  type: 'linear' | 'radial' | 'conic';
  angle?: number;
  stops: { color: string; position: number }[];
}
export interface NodeMotion {
  in?: {
    type: 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'zoom-in' | 'zoom-out' | 'none';
    duration: number; // in ms
    delay: number; // in ms
    easing: 'ease' | 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'spring' | string;
    // Spring physics configuration
    spring?: {
      damping: number;
      stiffness: number;
      mass: number;
    };
    // Custom cubic-bezier curve e.g. [0.25, 0.1, 0.25, 1]
    cubicBezier?: [number, number, number, number];
  };
  hover?: {
    scale?: number;
    rotation?: number;
    y?: number;
    opacity?: number;
    duration?: number;
  };
  parallax?: {
    depthPlane?: number; // -5 to +5
    direction?: 'vertical' | 'horizontal';
    factor?: number;
  };
}

export interface NodeInteraction {
  trigger?: 'onTap' | 'onHover' | 'onScrollProgress' | 'onSceneEnter' | 'onSubmit' | 'onTimer';
  scrollRange?: { startPercent: number; endPercent: number };
  condition?: {
    fieldKey: string;
    operator: 'equals' | 'not_equals' | 'exists' | 'truthy' | 'greater_than' | 'less_than';
    value?: any;
  };
  action?: 'animate' | 'reveal' | 'hide' | 'navigate' | 'playSound' | 'openModal' | 'changeState';
  payload?: Record<string, any>;
  targetNodeId?: string;
  nextState?: string;
  onClick?: {
    action: 'navigate' | 'open_modal' | 'submit' | 'none';
    url?: string;
    modalId?: string;
  };
}

export interface NodeBinding {
  fieldKey: string;
  bindingType: 'content' | 'media' | 'attribute' | 'computed';
  fallback?: string;
  formatting?: {
    type: 'date' | 'uppercase' | 'lowercase' | 'currency' | 'number';
    formatString?: string;
  };
}

export interface NodeRepeaterConfig {
  arrayFieldKey: string;
  itemTemplateNodeId: string;
  minItems?: number;
  maxItems?: number;
  emptyStateNodeId?: string;
}

export interface NodeConditionalConfig {
  fieldKey: string;
  operator: 'equals' | 'not_equals' | 'exists' | 'truthy' | 'greater_than' | 'less_than';
  operand?: any;
  action: 'show' | 'hide';
}

export interface NodeComponentConfig {
  isMaster?: boolean;
  masterComponentId?: string;
  variantId?: string;
  exposedProps?: Record<string, any>;
  instanceOverrides?: Record<string, any>;
  isDetached?: boolean;
}

export type ResponsiveBreakpointKey =
  | 'desktop'
  | 'desktopSmall'
  | 'tablet'
  | 'mobileLarge'
  | 'mobile'
  | 'mobileSmall';

export interface ResponsiveOverride {
  geometry?: Partial<NodeGeometry>;
  style?: Partial<NodeStyle>;
  layoutMode?: 'flex' | 'grid' | 'stack' | 'freeform' | 'auto';
  layoutConfig?: Partial<AutoLayoutConfig | GridLayoutConfig>;
  hidden?: boolean;
  order?: number;

  // Convenient flat property overrides (used by layout & style resolvers)
  position?: 'flow' | 'absolute' | 'relative' | 'sticky';
  x?: CSSValue;
  y?: CSSValue;
  width?: CSSValue;
  height?: CSSValue;
  rotation?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
  zIndex?: number;
  margin?: string;
  padding?: string;
  typography?: Partial<NodeTypography>;
}

export type PropertySourceType =
  | 'token'
  | 'inherited'
  | 'local'
  | 'responsive_override'
  | 'data_binding'
  | 'computed'
  | 'default';

export interface PropertySource {
  type: PropertySourceType;
  tokenPath?: string;
  inheritedFrom?: string;
  device?: DeviceBreakpoint;
  bindingKey?: string;
}

export interface SceneGraphNode {
  id: string;
  kind: SceneNodeKind;
  name: string;
  parentId: string | null;
  children: string[];

  // Geometry
  geometry: NodeGeometry;

  // Layout mode for container nodes
  layoutMode?: 'flex' | 'grid' | 'stack' | 'freeform' | 'auto';
  layoutConfig?: AutoLayoutConfig | GridLayoutConfig;

  // Style
  style: NodeStyle;

  // Responsive Art Direction (6-viewport inheritance)
  responsive: {
    desktopSmall?: Partial<ResponsiveOverride>;  // 1280px
    tablet?: Partial<ResponsiveOverride>;        // 768px
    mobileLarge?: Partial<ResponsiveOverride>;   // 430px
    mobile?: Partial<ResponsiveOverride>;        // 390px
    mobileSmall?: Partial<ResponsiveOverride>;   // 375px
  };

  // Data binding & Collections (P14-D)
  binding?: NodeBinding;
  repeater?: NodeRepeaterConfig;
  conditional?: NodeConditionalConfig;

  // Motion
  motion?: NodeMotion;

  // Interaction Graph (P14-E)
  interactions?: NodeInteraction[];

  // Component Engine (P14-C)
  component?: NodeComponentConfig;

  // Admin control & Governance
  locked: boolean;
  hidden: boolean;
  customerEditable: boolean;
  customizationLevel: CustomizationLevel;

  // Smart Component mapping (Phase 11)
  smartComponent?: string;
  smartProps?: Record<string, any>;
  dataBinding?: Record<string, string>;

  // Direct text content (Phase 12)
  textContent?: string;
  props?: Record<string, any>;

  // Expert Mode Developer Hooks
  className?: string;
  customId?: string;
  ariaAttributes?: Record<string, string>;

  // Property sources (for explainability)
  propertySources?: Record<string, PropertySource>;
}

// ─────────────────────────────────────────────────────────────
// 5. SCENE GRAPH CONTAINER
// ─────────────────────────────────────────────────────────────

export interface SceneGraph {
  schemaVersion: number;
  rootNodeId: string;
  nodes: Record<string, SceneGraphNode>;
  renderOrder: string[];
}

