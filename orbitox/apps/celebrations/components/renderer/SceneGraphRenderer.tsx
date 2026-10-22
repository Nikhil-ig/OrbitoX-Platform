'use client';

import React from 'react';
import { SceneGraph, SceneGraphNode, AutoLayoutConfig, GridLayoutConfig } from '../template-studio/engine/SceneGraphTypes';
import { StyleResolver } from '../template-studio/engine/StyleResolver';
import { LayoutResolver } from '../template-studio/engine/LayoutResolver';
import { NodeRendererRegistry } from '../template-studio/engine/NodeRendererRegistry';
import '../template-studio/engine/BasicNodeAdapters'; // Register basic adapters
import '../template-studio/engine/AdvancedNodeAdapters'; // Register advanced adapters
import '../template-studio/engine/SmartNodeAdapters'; // Register smart adapters
import { TemplateDesignTokens, DeviceBreakpoint } from '../template-studio/types/TemplateSchema';

interface SceneGraphRendererProps {
  sceneGraph: SceneGraph;
  device: DeviceBreakpoint;
  tokens: TemplateDesignTokens;
  isEditorMode: boolean;
  onNodeClick?: (nodeId: string, event?: React.MouseEvent | React.PointerEvent) => void;
  resolvedState?: any;
  schema?: any;
}

export function SceneGraphRenderer({
  sceneGraph,
  device,
  tokens,
  isEditorMode,
  onNodeClick,
  resolvedState,
  schema,
}: SceneGraphRendererProps) {
  // Direct Canvas Click Delegation with Deep Selection Support (Cmd/Ctrl + Click)
  const handleContainerClick = (e: React.MouseEvent) => {
    if (!isEditorMode || !onNodeClick) return;

    const target = e.target as HTMLElement | null;
    if (!target) return;

    const closestEl = target.closest('[data-node-id]') as HTMLElement | null;
    if (!closestEl) return;

    const clickedNodeId = closestEl.getAttribute('data-node-id');
    if (!clickedNodeId || !sceneGraph.nodes[clickedNodeId]) return;

    e.stopPropagation();

    const isDeepSelect = e.metaKey || e.ctrlKey;
    if (isDeepSelect) {
      // Cmd/Ctrl + Click: Directly select the exact leaf node under the pointer
      onNodeClick(clickedNodeId, e);
    } else {
      // Standard selection: If clicking inside a group or component instance, select enclosing group/component
      let targetNodeId = clickedNodeId;
      let curr: SceneGraphNode | undefined = sceneGraph.nodes[clickedNodeId];
      while (curr && curr.parentId && curr.parentId !== sceneGraph.rootNodeId) {
        const parent: SceneGraphNode | undefined = sceneGraph.nodes[curr.parentId];
        if (parent && (parent.kind === 'group' || parent.component?.masterComponentId)) {
          targetNodeId = parent.id;
        }
        curr = parent;
      }
      onNodeClick(targetNodeId, e);
    }
  };

  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScrollY = () => {
      const scrollY = el.scrollTop || window.scrollY || 0;
      el.style.setProperty('--scroll-y', `${scrollY}px`);
    };

    updateScrollY();
    el.addEventListener('scroll', updateScrollY, { passive: true });
    window.addEventListener('scroll', updateScrollY, { passive: true });

    return () => {
      el.removeEventListener('scroll', updateScrollY);
      window.removeEventListener('scroll', updateScrollY);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      onClick={handleContainerClick}
    >
      {sceneGraph.renderOrder.map((nodeId: string) => {
        const node = sceneGraph.nodes[nodeId];
        if (!node || node.parentId) return null; // Only render roots here, they render their children
        
        return (
          <NodeRenderer
            key={nodeId}
            node={node}
            sceneGraph={sceneGraph}
            device={device}
            tokens={tokens}
            isEditorMode={isEditorMode}
            onNodeClick={onNodeClick}
            resolvedState={resolvedState}
            schema={schema}
          />
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RUNTIME MOTION WRAPPER (WAAPI 60 FPS IN GUEST VIEW)
// ─────────────────────────────────────────────────────────────

function MotionRuntimeNode({
  motion,
  children,
}: {
  motion: any;
  children: React.ReactElement;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !motion || motion.type === 'none') return;

    const { type, duration = 600, delay = 0, easing = 'ease-out' } = motion;

    let initialTransform = 'none';
    if (type === 'slide-up') initialTransform = 'translateY(24px)';
    else if (type === 'slide-down') initialTransform = 'translateY(-24px)';
    else if (type === 'slide-left') initialTransform = 'translateX(24px)';
    else if (type === 'slide-right') initialTransform = 'translateX(-24px)';
    else if (type === 'zoom-in') initialTransform = 'scale(0.92)';
    else if (type === 'zoom-out') initialTransform = 'scale(1.08)';

    try {
      el.animate(
        [
          { opacity: 0, transform: initialTransform },
          { opacity: 1, transform: 'none' },
        ],
        {
          duration,
          delay,
          easing: easing === 'spring' ? 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' : easing,
          fill: 'both',
        }
      );
    } catch {
      // Graceful fallback for non-WAAPI environments
    }
  }, [motion]);

  return (
    <div ref={ref} style={{ display: 'contents' }}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RECURSIVE NODE RENDERER
// ─────────────────────────────────────────────────────────────

interface NodeRendererProps {
  node: SceneGraphNode;
  sceneGraph: SceneGraph;
  device: DeviceBreakpoint;
  tokens: TemplateDesignTokens;
  isEditorMode: boolean;
  onNodeClick?: (nodeId: string, event?: React.MouseEvent | React.PointerEvent) => void;
  resolvedState?: any;
  schema?: any;
}

function NodeRenderer({ node, sceneGraph, device, tokens, isEditorMode, onNodeClick, parentNode, resolvedState, schema }: NodeRendererProps & { parentNode?: SceneGraphNode }) {
  const isRespHidden = (node.responsive as any)?.[device]?.hidden;
  if ((node.hidden || isRespHidden) && !isEditorMode) return null;

  const resolved = StyleResolver.resolveForDevice(node, device, tokens);
  const { geometry, style } = resolved;
  
  // Resolve effective auto layout for this node if container has device override
  const effectiveLayoutMode = (node.responsive as any)?.[device]?.layoutMode || node.layoutMode;
  const effectiveLayoutConfig = (node.responsive as any)?.[device]?.layoutConfig || node.layoutConfig;
  const layoutStyle = LayoutResolver.resolve(effectiveLayoutMode, effectiveLayoutConfig);
  
  // Resolve child sizing and order if parent has auto layout
  const parentLayoutConfig = parentNode ? ((parentNode.responsive as any)?.[device]?.layoutConfig || parentNode.layoutConfig) : undefined;
  const parentLayoutMode = parentNode ? ((parentNode.responsive as any)?.[device]?.layoutMode || parentNode.layoutMode) : undefined;
  const childSizingStyle = parentNode 
    ? LayoutResolver.resolveChildSizing(node.id, parentLayoutConfig, parentLayoutMode) 
    : {};
  
  const responsiveOrder = (node.responsive as any)?.[device]?.order;
  const orderStyle: React.CSSProperties = responsiveOrder !== undefined ? { order: responsiveOrder } : {};

  const baseCssStyle = StyleResolver.resolveToCSSProperties(resolved, tokens, node);
  
  // Transform geometry into CSS and merge with style
  const cssStyle: React.CSSProperties = {
    ...baseCssStyle,
    ...layoutStyle,
    ...childSizingStyle,
    ...orderStyle,
  };

  let adapter = node.smartComponent 
    ? NodeRendererRegistry.getSmartAdapter(node.smartComponent) 
    : undefined;
    
  if (!adapter) {
    adapter = NodeRendererRegistry.getAdapter(node.kind);
  }

  if (adapter) {
    const renderChild = (childId: string) => {
      const childNode = sceneGraph.nodes[childId];
      if (!childNode) return null;
      return (
        <NodeRenderer
          key={childId}
          node={childNode}
          sceneGraph={sceneGraph}
          device={device}
          tokens={tokens}
          isEditorMode={isEditorMode}
          onNodeClick={onNodeClick}
          parentNode={node}
          resolvedState={resolvedState}
          schema={schema}
        />
      );
    };

    const rendered = adapter.render({
      node,
      sceneGraph,
      device,
      tokens,
      isEditorMode,
      onNodeClick,
      renderChild,
      resolvedStyle: cssStyle,
      resolvedState,
      schema,
    });

    if (React.isValidElement(rendered)) {
      const cloned = React.cloneElement(rendered as React.ReactElement<any>, {
        'data-node-id': node.id,
        'data-node-kind': node.kind,
        id: node.id,
      });

      if (!isEditorMode && node.motion?.in && node.motion.in.type !== 'none') {
        return (
          <MotionRuntimeNode key={node.id} motion={node.motion.in}>
            {cloned}
          </MotionRuntimeNode>
        );
      }

      return cloned;
    }

    return (rendered as unknown) as React.ReactElement;
  }

  // Fallback for missing adapters
  const handleClick = (e: React.MouseEvent) => {
    if (isEditorMode && onNodeClick) {
      e.stopPropagation();
      onNodeClick(node.id, e);
    }
  };

  return (
    <div 
      id={node.id}
      data-node-id={node.id}
      data-node-kind={node.kind}
      style={cssStyle} 
      onClick={handleClick}
      className={isEditorMode ? 'hover:outline hover:outline-blue-400 hover:outline-1 cursor-pointer transition-outline' : ''}
    >
      <div className="border border-dashed border-red-400 bg-red-50 text-red-500 text-xs p-1 flex items-center justify-center">
        Unsupported: {node.kind}
      </div>
    </div>
  );
}
