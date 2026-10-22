'use client';

import { DeviceBreakpoint, TemplateDesignTokens, TemplateSceneDefinition } from '@/components/template-studio/types/TemplateSchema';
import { SceneGraphNode, NodeGeometry, NodeStyle } from '@/components/template-studio/engine/SceneGraphTypes';

export interface CanonicalNodeStyle {
  background?: {
    type?: 'solid' | 'gradient' | 'image' | 'video';
    color?: string;
    gradient?: string;
    image?: string;
    video?: string;
    size?: string;
    position?: string;
    repeat?: string;
    opacity?: number;
  };
  border?: {
    width?: string;
    style?: 'solid' | 'dashed' | 'dotted' | 'none';
    color?: string;
    radius?: {
      tl?: string | number;
      tr?: string | number;
      br?: string | number;
      bl?: string | number;
      all?: string | number;
    } | string | number;
  };
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
  typography?: {
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: number | string;
    lineHeight?: number | string;
    letterSpacing?: string;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    color?: string;
  };
  shadow?: {
    boxShadow?: string;
    dropShadow?: string;
  };
  effects?: {
    blur?: string;
    brightness?: number;
    contrast?: number;
    saturate?: number;
    grayscale?: number;
    hueRotate?: number;
    invert?: number;
    sepia?: number;
    backdropBlur?: string;
  };
  opacity?: number;
}

export interface InspectorSharedProps {
  activeScene: TemplateSceneDefinition;
  designTokens: TemplateDesignTokens;
  activeViewport: DeviceBreakpoint;
  onUpdateNode: (nodeId: string, patch: Partial<SceneGraphNode>) => void;
  onUpdateGeometry: (nodeId: string, patch: Partial<NodeGeometry>) => void;
  onUpdateStyle: (nodeId: string, patch: Partial<NodeStyle>) => void;
  onDuplicateNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onToggleLock: (nodeId: string) => void;
  onToggleHide: (nodeId: string) => void;
  onUpdateScene: (sceneId: string, patch: Partial<TemplateSceneDefinition>) => void;
  onCreateComponent?: (nodeId: string) => void;
  onInstantiateComponent?: (masterId: string) => void;
  onResetOverrides?: (nodeId: string) => void;
  onPushToMaster?: (nodeId: string) => void;
  onDetachInstance?: (nodeId: string) => void;
  onResetResponsiveOverride?: (nodeId: string, device: DeviceBreakpoint, propertyKey?: string) => void;
  onOpenRemix?: () => void;
  onOpenAi?: () => void;
  onOpenAssetPicker?: () => void;
}

export interface NodeInspectorProps extends InspectorSharedProps {
  selectedNode: SceneGraphNode;
}
