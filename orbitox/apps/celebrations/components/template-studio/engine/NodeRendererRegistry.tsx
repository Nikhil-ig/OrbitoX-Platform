import React from 'react';
import { SceneGraphNode, SceneGraph } from './SceneGraphTypes';
import { TemplateDesignTokens, DeviceBreakpoint } from '../types/TemplateSchema';

export interface NodeRenderContext {
  node: SceneGraphNode;
  sceneGraph: SceneGraph;
  device: DeviceBreakpoint;
  tokens: TemplateDesignTokens;
  isEditorMode: boolean;
  onNodeClick?: (nodeId: string, event?: React.MouseEvent | React.PointerEvent) => void;
  renderChild: (childId: string) => React.ReactNode;
  resolvedStyle: React.CSSProperties; // The base CSS resolved from style/geometry/layout
  resolvedState?: any; // The CelebrationState for data binding
  schema?: any; // The TemplateSchema for media slot definitions
}

export interface NodeRendererAdapter {
  kind: string | string[];
  render(context: NodeRenderContext): React.ReactNode;
}

export class NodeRendererRegistry {
  private static adapters: Map<string, NodeRendererAdapter> = new Map();
  private static smartAdapters: Map<string, NodeRendererAdapter> = new Map();

  static register(adapter: NodeRendererAdapter) {
    if (Array.isArray(adapter.kind)) {
      adapter.kind.forEach((k) => this.adapters.set(k, adapter));
    } else {
      this.adapters.set(adapter.kind, adapter);
    }
  }

  static getAdapter(kind: string): NodeRendererAdapter | undefined {
    return this.adapters.get(kind);
  }

  static registerSmart(name: string, adapter: NodeRendererAdapter) {
    this.smartAdapters.set(name, adapter);
  }

  static getSmartAdapter(name: string): NodeRendererAdapter | undefined {
    return this.smartAdapters.get(name);
  }
}
