'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  TemplateSceneDefinition,
  TemplateDesignTokens,
  DeviceBreakpoint,
} from '@/components/template-studio/types/TemplateSchema';
import { SceneGraphRenderer } from '@/components/renderer/SceneGraphRenderer';
import { bindDataToGraph } from '@/components/template-studio/engine/GraphDataBinder';
import { CanvasInteractionLayer } from '@/components/template-studio/components/canvas/CanvasInteractionLayer';
import { SelectionToolbar } from './SelectionToolbar';
import { SceneGraphHitTester } from './canvas/SceneGraphHitTester';
import { TemplateEditorCommand } from '@/components/template-studio/engine/TemplateEditorCommands';
import { SceneGraphNode, SceneNodeKind } from '@/components/template-studio/engine/SceneGraphTypes';
import { WebSectionLibrary } from '@/components/template-studio/engine/WebSectionLibrary';
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  GripVertical,
  Layers,
  Sparkles,
  Layout,
} from 'lucide-react';
import {
  CanvasContextMenu,
  ContextMenuState,
} from '@/components/template-studio/components/context-menu/CanvasContextMenu';
import { SceneGraphClipboard } from '@/components/template-studio/engine/SceneGraphClipboard';

interface CanvasWorkspaceProps {
  scenes: TemplateSceneDefinition[];
  activeSceneId: string;
  onSelectScene: (sceneId: string) => void;
  selectedNodeId: string | null;
  selectedNodeIds?: string[];
  onSelectNode: (nodeId: string | null, sceneId?: string) => void;
  onSelectNodes?: (nodeIds: string[], sceneId?: string) => void;
  onUpdateGeometry: (sceneId: string, nodeId: string, patch: any) => void;
  onUpdateStyle: (nodeId: string, patch: any) => void;
  onDuplicateNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  viewport: DeviceBreakpoint;
  designTokens: TemplateDesignTokens;
  resolvedState?: any;
  schema?: any;
  dispatch: (command: TemplateEditorCommand) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onAddSection?: (position?: number) => void;
  onMoveSection?: (sectionId: string, direction: 'up' | 'down') => void;
  onDuplicateSection?: (sectionId: string) => void;
  onDeleteSection?: (sectionId: string) => void;
  onSwapSectionVariant?: (sectionId: string, variantBlockId: string) => void;
  onInsertNode?: (kind: SceneNodeKind, name: string, defaults?: any, sceneId?: string) => void;
  onOpenRemix?: () => void;
  onOpenAi?: () => void;
}

export function CanvasWorkspace({
  scenes,
  activeSceneId,
  onSelectScene,
  selectedNodeId,
  selectedNodeIds,
  onSelectNode,
  onSelectNodes,
  onUpdateGeometry,
  onUpdateStyle,
  onDuplicateNode,
  onDeleteNode,
  viewport,
  designTokens,
  resolvedState,
  schema,
  dispatch,
  zoom,
  onZoomChange,
  onAddSection,
  onMoveSection,
  onDuplicateSection,
  onDeleteSection,
  onSwapSectionVariant,
  onInsertNode,
  onOpenRemix,
  onOpenAi,
}: CanvasWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [dragOverAffordanceIndex, setDragOverAffordanceIndex] = useState<number | null>(null);
  const [variantPickerSceneId, setVariantPickerSceneId] = useState<string | null>(null);

  // Marquee Selection State (Task 3)
  const [marqueeState, setMarqueeState] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isActive: boolean;
  } | null>(null);
  const [marqueeIntersectedIds, setMarqueeIntersectedIds] = useState<string[]>([]);

  // Effective selected node IDs
  const effectiveSelectedNodeIds = useMemo(() => {
    if (selectedNodeIds && selectedNodeIds.length > 0) return selectedNodeIds;
    return selectedNodeId ? [selectedNodeId] : [];
  }, [selectedNodeIds, selectedNodeId]);

  // Active scene
  const activeScene = useMemo(() => {
    return scenes.find((s) => s.id === activeSceneId) || scenes[0];
  }, [scenes, activeSceneId]);

  // Selected node (searched across all scenes)
  const selectedNodeInfo = useMemo(() => {
    const primaryId = effectiveSelectedNodeIds[0];
    if (!primaryId) return null;
    for (const sc of scenes) {
      if (sc.sceneGraph?.nodes && sc.sceneGraph.nodes[primaryId]) {
        return { node: sc.sceneGraph.nodes[primaryId], sceneId: sc.id };
      }
    }
    return null;
  }, [scenes, effectiveSelectedNodeIds]);

  const selectedNode = selectedNodeInfo?.node || null;
  const selectedNodeSceneId = selectedNodeInfo?.sceneId || activeScene?.id;

  // Viewport sizes
  const viewportWidths: Record<DeviceBreakpoint, { width: number; name: string }> = {
    desktop: { width: 1440, name: 'Desktop (1440 × 900)' },
    tablet: { width: 768, name: 'Tablet (768 × 1024)' },
    mobile: { width: 390, name: 'Mobile (390 × 844)' },
  };

  const currentViewport =
    viewport && viewportWidths[viewport] ? viewportWidths[viewport] : viewportWidths.desktop;

  // Center artboard initially on mount or on viewport switch
  useEffect(() => {
    if (containerRef.current && pan.x === 0 && pan.y === 0) {
      const containerW = containerRef.current.clientWidth;
      const initialX = Math.max(20, Math.round((containerW - currentViewport.width * zoom) / 2));
      setPan({ x: initialX, y: 56 });
    }
  }, [currentViewport.width]);

  // Spacebar pan listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !e.repeat &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Wheel zoom / pan (Mathematically exact Zoom-to-Cursor math - Task 6)
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        const newZoom = Math.min(Math.max(0.25, zoom - e.deltaY * 0.005), 2.5);
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          const zoomRatio = newZoom / zoom;
          setPan((p) => ({
            x: Math.round(mouseX - (mouseX - p.x) * zoomRatio),
            y: Math.round(mouseY - (mouseY - p.y) * zoomRatio),
          }));
        }
        onZoomChange(newZoom);
      } else {
        setPan((p) => ({ x: p.x - e.deltaX * 0.8, y: p.y - e.deltaY * 0.8 }));
      }
    },
    [zoom, onZoomChange]
  );

  // Pointer down: Spacebar pan or Marquee drag-selection initiation (Task 3)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isSpacePressed || e.button === 1 /* Middle click */) {
      setIsPanning(true);
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    const targetEl = e.target as HTMLElement;
    const isBackdrop =
      targetEl === containerRef.current ||
      targetEl.classList.contains('sz-canvas-backdrop') ||
      targetEl.id === 'orbitox-artboard-frame';

    const isControlOrHandle = Boolean(
      targetEl.closest('[data-handle]') ||
      targetEl.closest('#canvas-multiselect-group') ||
      targetEl.closest('[id^="canvas-selection-"]') ||
      targetEl.closest('button') ||
      targetEl.closest('input') ||
      targetEl.closest('#sz-canvas-section-pills') ||
      targetEl.closest('[id^="sz-section-toolbar-"]')
    );

    if (!isControlOrHandle && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      setMarqueeState({
        startX: clickX,
        startY: clickY,
        currentX: clickX,
        currentY: clickY,
        isActive: false,
      });
      setMarqueeIntersectedIds([]);
      if (isBackdrop) {
        if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
          onSelectNode(null);
          onSelectNodes?.([]);
        }
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setPan((p) => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
    } else if (marqueeState && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const currX = e.clientX - rect.left;
      const currY = e.clientY - rect.top;
      const dist = Math.hypot(currX - marqueeState.startX, currY - marqueeState.startY);
      const isActive = dist >= 5 || marqueeState.isActive;

      if (isActive && !marqueeState.isActive) {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}
      }

      setMarqueeState({
        ...marqueeState,
        currentX: currX,
        currentY: currY,
        isActive,
      });

      if (isActive) {
        const mLeft = Math.min(marqueeState.startX, currX);
        const mTop = Math.min(marqueeState.startY, currY);
        const mRight = Math.max(marqueeState.startX, currX);
        const mBottom = Math.max(marqueeState.startY, currY);

        const activeScene = scenes.find((s) => s.id === activeSceneId);
        if (activeScene?.sceneGraph) {
          const intersected = SceneGraphHitTester.getMarqueeIntersectedNodes(
            {
              x1: mLeft - pan.x,
              y1: mTop - pan.y,
              x2: mRight - pan.x,
              y2: mBottom - pan.y,
            },
            activeScene.sceneGraph
          );
          setMarqueeIntersectedIds(intersected);
        } else {
          setMarqueeIntersectedIds([]);
        }
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsPanning(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (marqueeState?.isActive && marqueeIntersectedIds.length > 0) {
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        const combined = Array.from(new Set([...effectiveSelectedNodeIds, ...marqueeIntersectedIds]));
        if (onSelectNodes) onSelectNodes(combined, activeSceneId);
        else onSelectNode(combined[0] || null, activeSceneId);
      } else {
        if (onSelectNodes) onSelectNodes(marqueeIntersectedIds, activeSceneId);
        else onSelectNode(marqueeIntersectedIds[0] || null, activeSceneId);
      }
    }
    setMarqueeState(null);
    setMarqueeIntersectedIds([]);
  };

  // Center artboard to fit 100% zoom
  const centerArtboard = useCallback(() => {
    if (containerRef.current) {
      const containerW = containerRef.current.clientWidth;
      const initialX = Math.max(20, Math.round((containerW - currentViewport.width * 1.0) / 2));
      setPan({ x: initialX, y: 56 });
      onZoomChange(1.0);
    }
  }, [currentViewport.width, onZoomChange]);

  // Right-Click Context Menu State
  const [contextMenuState, setContextMenuState] = useState<ContextMenuState>({
    isOpen: false,
    type: 'canvas',
    sceneId: activeSceneId,
    clientPosition: { x: 0, y: 0 },
    scenePosition: { x: 0, y: 0 },
  });

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const artboardEl = document.getElementById('orbitox-artboard-frame');
      let sceneX = e.clientX;
      let sceneY = e.clientY;
      if (artboardEl) {
        const rect = artboardEl.getBoundingClientRect();
        sceneX = (e.clientX - rect.left) / zoom;
        sceneY = (e.clientY - rect.top) / zoom;
      }

      // Check if right-clicked a section container or header or pill
      const sectionContainer = target.closest('[id^="sz-section-container-"]') as HTMLElement | null;
      const sectionPill = target.closest('[id^="sz-section-pill-"]') as HTMLElement | null;
      const sectionIdFromPill = sectionPill?.id?.replace('sz-section-pill-', '');
      const sectionIdFromContainer = sectionContainer?.id?.replace('sz-section-container-', '');
      const detectedSectionId = sectionIdFromPill || sectionIdFromContainer;

      // Check if right-clicked a SceneGraph node
      const nodeEl = target.closest('[data-node-id]') as HTMLElement | null;
      if (nodeEl) {
        const nodeId = nodeEl.getAttribute('data-node-id');
        let targetScene = scenes.find((s) => s.sceneGraph?.nodes && s.sceneGraph.nodes[nodeId || '']);
        if (!targetScene) targetScene = activeScene;

        if (nodeId && targetScene?.sceneGraph?.nodes[nodeId]) {
          const sId = targetScene.id;
          if (effectiveSelectedNodeIds.includes(nodeId) && effectiveSelectedNodeIds.length > 1) {
            setContextMenuState({
              isOpen: true,
              type: 'multi_node',
              sceneId: sId,
              clientPosition: { x: e.clientX, y: e.clientY },
              scenePosition: { x: sceneX, y: sceneY },
              targetNodeId: nodeId,
              targetNodeIds: effectiveSelectedNodeIds,
            });
            return;
          }

          onSelectNode(nodeId, sId);
          if (onSelectNodes) onSelectNodes([nodeId], sId);

          setContextMenuState({
            isOpen: true,
            type: 'node',
            sceneId: sId,
            clientPosition: { x: e.clientX, y: e.clientY },
            scenePosition: { x: sceneX, y: sceneY },
            targetNodeId: nodeId,
            targetNodeIds: [nodeId],
          });
          return;
        }
      }

      if (detectedSectionId) {
        onSelectScene(detectedSectionId);
        setContextMenuState({
          isOpen: true,
          type: 'section',
          sceneId: detectedSectionId,
          clientPosition: { x: e.clientX, y: e.clientY },
          scenePosition: { x: sceneX, y: sceneY },
          targetSectionId: detectedSectionId,
        });
        return;
      }

      // Canvas background
      setContextMenuState({
        isOpen: true,
        type: 'canvas',
        sceneId: activeSceneId,
        clientPosition: { x: e.clientX, y: e.clientY },
        scenePosition: { x: sceneX, y: sceneY },
        targetNodeId: null,
      });
    },
    [activeScene, activeSceneId, scenes, zoom, onSelectNode, onSelectNodes, onSelectScene, effectiveSelectedNodeIds]
  );

  // Global Creative Shortcuts (⌘C, ⌘X, ⌘V, ⌘D, ⌫, ⌘A)
  useEffect(() => {
    const handleGlobalClipboard = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      const isMeta = e.metaKey || e.ctrlKey;
      if (!isMeta && e.key !== 'Delete' && e.key !== 'Backspace') return;

      const currentSceneId = selectedNodeSceneId || activeScene?.id || activeSceneId;
      if (!currentSceneId) return;

      const targetScene = scenes.find((s) => s.id === currentSceneId) || activeScene;

      if (isMeta && e.key === 'c' && effectiveSelectedNodeIds.length > 0) {
        if (targetScene?.sceneGraph) {
          SceneGraphClipboard.copy(targetScene.sceneGraph, effectiveSelectedNodeIds, currentSceneId);
        }
      } else if (isMeta && e.key === 'x' && effectiveSelectedNodeIds.length > 0) {
        dispatch({ type: 'SG_CUT_NODES', sceneId: currentSceneId, nodeIds: effectiveSelectedNodeIds });
      } else if (isMeta && e.key === 'v') {
        if (e.altKey && e.shiftKey) {
          dispatch({
            type: 'SG_PASTE_AT_COORDINATES',
            sceneId: currentSceneId,
            x: currentViewport.width / 2 - 100,
            y: 200,
          });
        } else if (e.altKey && selectedNodeId) {
          dispatch({ type: 'SG_PASTE_REPLACE', sceneId: currentSceneId, targetNodeId: selectedNodeId });
        } else {
          const targetParent = selectedNodeId
            ? targetScene?.sceneGraph?.nodes[selectedNodeId]?.parentId || targetScene?.sceneGraph?.rootNodeId || 'root'
            : targetScene?.sceneGraph?.rootNodeId || 'root';
          dispatch({ type: 'SG_PASTE_NODES', sceneId: currentSceneId, targetParentId: targetParent });
        }
      } else if (isMeta && e.key === 'd' && selectedNodeId) {
        e.preventDefault();
        dispatch({ type: 'SG_DUPLICATE_NODE', sceneId: currentSceneId, nodeId: selectedNodeId });
      } else if ((e.key === 'Backspace' || e.key === 'Delete') && selectedNodeId) {
        e.preventDefault();
        dispatch({ type: 'SG_DELETE_NODE', sceneId: currentSceneId, nodeId: selectedNodeId });
      } else if (isMeta && e.key === 'a' && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'SELECT_ALL_NODES', sceneId: currentSceneId });
      }
    };

    window.addEventListener('keydown', handleGlobalClipboard);
    return () => window.removeEventListener('keydown', handleGlobalClipboard);
  }, [
    selectedNodeId,
    effectiveSelectedNodeIds,
    selectedNodeSceneId,
    activeScene,
    activeSceneId,
    scenes,
    dispatch,
    currentViewport.width,
  ]);

  // Dynamic CSS variables from design tokens strictly scoped to the artboard
  const tokenCssVars = useMemo(() => {
    if (!designTokens) return {};
    return {
      '--orbitox-bg-primary': designTokens.colors?.backgroundPrimary || '#0B0F19',
      '--orbitox-bg-secondary': designTokens.colors?.backgroundSecondary || '#111827',
      '--orbitox-surface-primary': designTokens.colors?.surfacePrimary || '#1E293B',
      '--orbitox-surface-elevated': designTokens.colors?.surfaceElevated || '#334155',
      '--orbitox-text-primary': designTokens.colors?.textPrimary || '#F8FAFC',
      '--orbitox-text-secondary': designTokens.colors?.textSecondary || '#94A3B8',
      '--orbitox-text-muted': designTokens.colors?.textMuted || '#64748B',
      '--orbitox-accent-primary': designTokens.colors?.accentPrimary || '#3B82F6',
      '--orbitox-accent-secondary': designTokens.colors?.accentSecondary || '#1D4ED8',
      '--orbitox-accent-glow': designTokens.colors?.accentGlow || 'rgba(59, 130, 246, 0.4)',
      '--orbitox-border-subtle': designTokens.colors?.borderSubtle || 'rgba(255, 255, 255, 0.08)',
      '--orbitox-border-accent': designTokens.colors?.borderAccent || '#3B82F6',
      '--orbitox-font-display': designTokens.typography?.displayFont || 'sans-serif',
      '--orbitox-font-heading': designTokens.typography?.headingFont || 'sans-serif',
      '--orbitox-font-body': designTokens.typography?.bodyFont || 'sans-serif',
      '--orbitox-font-accent': designTokens.typography?.accentFont || 'serif',
      // Legacy backwards-compatibility bindings
      '--cel-accent': designTokens.colors?.accentPrimary || '#DFBA6B',
      '--cel-gold': designTokens.colors?.accentPrimary || '#DFBA6B',
      '--cel-bg': designTokens.colors?.backgroundPrimary || '#0B0F19',
      '--cel-text-muted': designTokens.colors?.textMuted || '#64748B',
      '--cel-text-dim': designTokens.colors?.textSecondary || '#94A3B8',
    } as React.CSSProperties;
  }, [designTokens]);

  // Handle Drag & Drop insertion into canvas / section
  const handleDropOnSection = (e: React.DragEvent, targetSceneId: string) => {
    e.preventDefault();
    e.stopPropagation();

    // 0. Section Reorder Drop
    const draggedSectionId = e.dataTransfer.getData('orbitox_section_id');
    if (draggedSectionId && draggedSectionId !== targetSceneId) {
      const targetIndex = scenes.findIndex((s) => s.id === targetSceneId);
      if (targetIndex !== -1) {
        dispatch({
          type: 'MOVE_SECTION',
          sectionId: draggedSectionId,
          targetIndex,
        });
        return;
      }
    }

    // 1. Asset Drop
    const assetData = e.dataTransfer.getData('orbitox_asset');
    if (assetData) {
      try {
        const asset = JSON.parse(assetData);
        dispatch({
          type: 'SG_CREATE_NODE',
          sceneId: targetSceneId,
          kind: 'image',
          defaults: {
            name: asset.name || 'Dropped Image',
            imageUrl: asset.url,
            geometry: { width: '100%', height: '380px', position: 'flow' },
            style: { border: { radius: '12px' } },
          },
        });
        return;
      } catch (err) {
        console.error('Failed to parse dropped asset', err);
      }
    }

    // 2. Element Drop
    const elementData = e.dataTransfer.getData('orbitox_element');
    if (elementData) {
      try {
        const elem = JSON.parse(elementData);
        dispatch({
          type: 'SG_CREATE_NODE',
          sceneId: targetSceneId,
          kind: elem.kind || 'frame',
          defaults: {
            name: elem.name || 'New Element',
            ...(elem.defaults || {}),
          },
        });
        return;
      } catch (err) {
        console.error('Failed to parse dropped element', err);
      }
    }
  };

  // Handle Drop on Section Insertion Affordance
  const handleDropOnAffordance = (e: React.DragEvent, insertPosition: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverAffordanceIndex(null);

    // 0. Section Reorder Drop
    const draggedSectionId = e.dataTransfer.getData('orbitox_section_id');
    if (draggedSectionId) {
      dispatch({
        type: 'MOVE_SECTION',
        sectionId: draggedSectionId,
        targetIndex: insertPosition,
      });
      return;
    }

    const sectionData = e.dataTransfer.getData('orbitox_section');
    if (sectionData) {
      try {
        const sectionDef = JSON.parse(sectionData);
        dispatch({
          type: 'INSERT_SECTION',
          section: sectionDef,
          position: insertPosition,
        });
        return;
      } catch (err) {
        console.error('Failed to parse dropped section', err);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      id="sz-canvas-workspace"
      onContextMenu={handleContextMenu}
      className={`sz-canvas-backdrop relative overflow-hidden select-none outline-none ${
        isSpacePressed ? 'cursor-grab' : ''
      } ${isPanning ? 'cursor-grabbing' : ''}`}
      style={{
        flex: 1,
        minWidth: 0,
        height: '100%',
        background: '#0E0F13',
        backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        position: 'relative',
      }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      tabIndex={0}
    >
      {/* ── TOP SECTION SWITCHER PILLS (Floating inside Canvas) ── */}
      <div
        id="sz-canvas-section-pills"
        style={{
          position: 'absolute',
          top: '14px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(22, 24, 29, 0.92)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '9999px',
          padding: '4px 6px',
          zIndex: 30,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}
      >
        <span
          style={{
            fontSize: '0.66rem',
            fontWeight: 700,
            color: '#9CA3AF',
            textTransform: 'uppercase',
            padding: '0 6px',
            letterSpacing: '0.06em',
          }}
        >
          Page Flow
        </span>
        <div style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.1)' }} />
        {scenes.map((scene, idx) => {
          const isActive = scene.id === activeSceneId;
          return (
            <button
              key={scene.id}
              id={`sz-section-pill-${scene.id}`}
              onClick={() => {
                onSelectScene(scene.id);
                // Scroll section into view if available
                const el = document.getElementById(`sz-section-container-${scene.id}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }}
              style={{
                background: isActive ? '#2563EB' : 'transparent',
                border: 'none',
                borderRadius: '9999px',
                padding: '4px 10px',
                fontSize: '0.72rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#FFFFFF' : '#9CA3AF',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {idx + 1}. {scene.name}
            </button>
          );
        })}
        {onAddSection && (
          <button
            id="sz-add-section-top-btn"
            onClick={() => onAddSection(scenes.length)}
            title="Add Section Block"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: '9999px',
              padding: '4px 8px',
              fontSize: '0.72rem',
              color: '#9CA3AF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            <Plus size={12} />
            <span>Add Section</span>
          </button>
        )}
      </div>

      {/* ── ARTBOARD WORKSPACE CONTAINER (Zoomed & Panned) ── */}
      <div
        id="sz-artboard-wrapper"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          transition: isPanning ? 'none' : 'transform 0.08s ease-out',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          paddingBottom: '200px',
        }}
      >
        {/* Artboard Frame Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: `${currentViewport.width}px`,
            padding: '0 4px',
            color: '#9CA3AF',
            fontSize: '0.72rem',
            fontWeight: 500,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#F3F4F6', fontWeight: 600 }}>{schema?.name || 'Website Project'}</span>
            <span>•</span>
            <span>{currentViewport.name}</span>
            <span>•</span>
            <span>{scenes.length} Sections Active</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#6B7280' }}>OrbitoX Continuous Page Composer</div>
        </div>

        {/* ── ARTBOARD SURFACE (Continuous Vertical Page Flow) ── */}
        <div
          id="orbitox-artboard-frame"
          className="relative transition-all duration-300"
          style={{
            width: `${currentViewport.width}px`,
            minHeight: '800px',
            background: designTokens.colors?.backgroundPrimary || '#0B0F19',
            boxShadow: '0 25px 80px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08)',
            borderRadius: viewport === 'mobile' ? '40px' : viewport === 'tablet' ? '24px' : '8px',
            overflow: 'visible',
            position: 'relative',
            ...tokenCssVars,
          }}
        >
          {/* Top Add Section Affordance (Position 0) */}
          <SectionAddAffordance
            position={0}
            isDragOver={dragOverAffordanceIndex === 0}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverAffordanceIndex(0);
            }}
            onDragLeave={() => setDragOverAffordanceIndex(null)}
            onDrop={(e) => handleDropOnAffordance(e, 0)}
            onClick={() => onAddSection?.(0)}
          />

          {/* Continuous Vertical Render of All Sections in Flow */}
          {scenes.map((scene, index) => {
            const isSceneActive = scene.id === activeSceneId;

            return (
              <React.Fragment key={scene.id}>
                {/* ── SECTION CONTAINER ── */}
                <div
                  id={`sz-section-container-${scene.id}`}
                  data-section-id={scene.id}
                  data-section-index={index}
                  className={`relative group/section transition-all duration-200 ${
                    isSceneActive ? 'ring-1 ring-blue-500/60' : 'hover:ring-1 hover:ring-white/10'
                  }`}
                  style={{
                    position: 'relative',
                    width: '100%',
                    minHeight: '120px',
                  }}
                  onClick={(e) => {
                    // Clicking on section background makes it active
                    if (e.target === e.currentTarget) {
                      onSelectScene(scene.id);
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDropOnSection(e, scene.id)}
                >
                  {/* Floating Section Toolbar / Action Bar */}
                  <div
                    id={`sz-section-toolbar-${scene.id}`}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '12px',
                      zIndex: 30,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(18, 20, 24, 0.92)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '6px',
                      padding: '3px 6px',
                      opacity: isSceneActive ? 1 : 0,
                      pointerEvents: isSceneActive ? 'auto' : 'none',
                      transition: 'opacity 0.15s ease',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                    }}
                    className="group-hover/section:!opacity-100 group-hover/section:!pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      id={`sz-section-drag-handle-${scene.id}`}
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation();
                        e.dataTransfer.setData('orbitox_section_id', scene.id);
                        e.dataTransfer.setData('orbitox_section_index', String(index));
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      style={{
                        cursor: 'grab',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '2px',
                      }}
                      title="Drag to reorder section"
                    >
                      <GripVertical size={12} color="#6B7280" />
                    </div>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        color: isSceneActive ? '#60A5FA' : '#E5E7EB',
                        paddingRight: '4px',
                      }}
                    >
                      {index + 1}. {scene.name}
                    </span>

                    <div style={{ width: '1px', height: '10px', background: 'rgba(255,255,255,0.1)' }} />

                    {/* Move Up Button */}
                    <button
                      id={`sz-section-move-up-${scene.id}`}
                      title="Move Section Up"
                      disabled={index === 0}
                      onClick={() => onMoveSection?.(scene.id, 'up')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: index === 0 ? '#4B5563' : '#D1D5DB',
                        cursor: index === 0 ? 'default' : 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '3px',
                      }}
                    >
                      <ArrowUp size={12} />
                    </button>

                    {/* Move Down Button */}
                    <button
                      id={`sz-section-move-down-${scene.id}`}
                      title="Move Section Down"
                      disabled={index === scenes.length - 1}
                      onClick={() => onMoveSection?.(scene.id, 'down')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: index === scenes.length - 1 ? '#4B5563' : '#D1D5DB',
                        cursor: index === scenes.length - 1 ? 'default' : 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '3px',
                      }}
                    >
                      <ArrowDown size={12} />
                    </button>

                    {/* Duplicate Section Button */}
                    <button
                      id={`sz-section-duplicate-${scene.id}`}
                      title="Duplicate Section"
                      onClick={() => onDuplicateSection?.(scene.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#D1D5DB',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '3px',
                      }}
                    >
                      <Copy size={12} />
                    </button>

                    {/* Section Variant Switcher (Phase 2) */}
                    {onSwapSectionVariant && (
                      <div style={{ position: 'relative' }}>
                        <button
                          id={`sz-section-variant-btn-${scene.id}`}
                          title="Switch Layout Variant"
                          onClick={() => setVariantPickerSceneId(variantPickerSceneId === scene.id ? null : scene.id)}
                          style={{
                            background: variantPickerSceneId === scene.id ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                            border: 'none',
                            color: variantPickerSceneId === scene.id ? '#60A5FA' : '#D1D5DB',
                            cursor: 'pointer',
                            padding: '2px 4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            borderRadius: '3px',
                            fontSize: '0.65rem',
                            fontWeight: 500,
                          }}
                        >
                          <Layout size={12} />
                          <span>Variant</span>
                        </button>

                        {/* Floating Variant Dropdown Menu */}
                        {variantPickerSceneId === scene.id && (
                          <div
                            id={`sz-section-variant-menu-${scene.id}`}
                            style={{
                              position: 'absolute',
                              top: '26px',
                              left: '0',
                              zIndex: 50,
                              background: 'rgba(20, 22, 28, 0.96)',
                              backdropFilter: 'blur(16px)',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              borderRadius: '6px',
                              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
                              padding: '6px',
                              width: '210px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '3px',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div style={{ fontSize: '0.65rem', color: '#9CA3AF', padding: '2px 6px', fontWeight: 600 }}>
                              Layout Variants
                            </div>
                            {WebSectionLibrary.getAll().slice(0, 8).map((block) => (
                              <button
                                key={block.id}
                                id={`sz-variant-option-${block.id}`}
                                onClick={() => {
                                  onSwapSectionVariant(scene.id, block.id);
                                  setVariantPickerSceneId(null);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '5px 8px',
                                  borderRadius: '4px',
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#E5E7EB',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  width: '100%',
                                  transition: 'background 0.1s ease',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.18)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                <span>{block.icon}</span>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 500 }}>{block.title}</span>
                                  <span style={{ fontSize: '0.60rem', color: '#9CA3AF' }}>{block.category}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Delete Section Button */}
                    <button
                      id={`sz-section-delete-${scene.id}`}
                      title="Delete Section"
                      disabled={scenes.length <= 1}
                      onClick={() => onDeleteSection?.(scene.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: scenes.length <= 1 ? '#4B5563' : '#EF4444',
                        cursor: scenes.length <= 1 ? 'default' : 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '3px',
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {/* Real Scene Graph Virtual DOM Renderer for this Section */}
                  {scene.sceneGraph && (
                    <div style={{ width: '100%', position: 'relative' }}>
                      <SceneGraphRenderer
                        sceneGraph={resolvedState ? bindDataToGraph(scene.sceneGraph, resolvedState) : scene.sceneGraph}
                        device={viewport}
                        tokens={designTokens}
                        isEditorMode={true}
                        resolvedState={resolvedState}
                        schema={schema}
                        onNodeClick={(nodeId, event) => {
                          if (event?.shiftKey) {
                            const cur = effectiveSelectedNodeIds;
                            const next = cur.includes(nodeId)
                              ? cur.filter((id) => id !== nodeId)
                              : [...cur, nodeId];
                            if (onSelectNodes) onSelectNodes(next, scene.id);
                            else onSelectNode(next[0] || null, scene.id);
                          } else {
                            if (onSelectNodes) onSelectNodes([nodeId], scene.id);
                            onSelectNode(nodeId, scene.id);
                          }
                        }}
                      />

                      {/* Direct Pointer Interaction Engine Layer for this Section */}
                      <CanvasInteractionLayer
                        sceneId={scene.id}
                        sceneGraph={scene.sceneGraph}
                        selectedNodeIds={
                          selectedNodeSceneId === scene.id ? effectiveSelectedNodeIds : []
                        }
                        onSelectNodes={(ids) => {
                          onSelectScene(scene.id);
                          if (onSelectNodes) onSelectNodes(ids, scene.id);
                          else onSelectNode(ids[0] || null, scene.id);
                        }}
                        onUpdateGeometry={(nodeId, patch) => onUpdateGeometry(scene.id, nodeId, patch)}
                        onDropInsert={() => {}}
                        dispatch={dispatch}
                        zoom={zoom}
                        showDebug={false}
                        onOpenMotion={() => {}}
                        onOpenAi={() => onOpenAi?.()}
                        onOpenRemix={() => onOpenRemix?.()}
                      />
                    </div>
                  )}
                </div>

                {/* Section Add Affordance Between Every Section */}
                <SectionAddAffordance
                  position={index + 1}
                  isDragOver={dragOverAffordanceIndex === index + 1}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverAffordanceIndex(index + 1);
                  }}
                  onDragLeave={() => setDragOverAffordanceIndex(null)}
                  onDrop={(e) => handleDropOnAffordance(e, index + 1)}
                  onClick={() => onAddSection?.(index + 1)}
                />
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── MARQUEE DRAG-SELECTION BOX (Task 3) ── */}
      {marqueeState?.isActive && (
        <div
          id="sz-canvas-marquee-box"
          style={{
            position: 'absolute',
            left: `${Math.min(marqueeState.startX, marqueeState.currentX)}px`,
            top: `${Math.min(marqueeState.startY, marqueeState.currentY)}px`,
            width: `${Math.abs(marqueeState.currentX - marqueeState.startX)}px`,
            height: `${Math.abs(marqueeState.currentY - marqueeState.startY)}px`,
            border: '1.5px solid #3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            boxShadow: '0 0 12px rgba(59, 130, 246, 0.25)',
            borderRadius: '2px',
            pointerEvents: 'none',
            zIndex: 60,
          }}
        >
          {marqueeIntersectedIds.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '-20px',
                left: 0,
                background: '#2563EB',
                color: '#FFFFFF',
                fontSize: '9px',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '3px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                whiteSpace: 'nowrap',
              }}
            >
              {marqueeIntersectedIds.length} Selected
            </div>
          )}
        </div>
      )}

      {/* ── FLOATING SELECTION TOOLBAR ── */}
      {selectedNode && (
        <SelectionToolbar
          selectedNode={selectedNode}
          onUpdateStyle={(patch) => onUpdateStyle(selectedNode.id, patch)}
          onUpdateGeometry={(patch) => onUpdateGeometry(selectedNodeSceneId || activeScene?.id || '', selectedNode.id, patch)}
          onDuplicate={() => onDuplicateNode(selectedNode.id)}
          onDelete={() => onDeleteNode(selectedNode.id)}
          onOpenRemix={onOpenRemix}
          onOpenAi={onOpenAi}
        />
      )}

      {/* ── P26: RIGHT-CLICK CONTEXT MENU ── */}
      <CanvasContextMenu
        state={contextMenuState}
        onClose={() => setContextMenuState((prev) => ({ ...prev, isOpen: false }))}
        dispatch={dispatch}
        sceneGraph={scenes.find((s) => s.id === contextMenuState.sceneId)?.sceneGraph || activeScene?.sceneGraph}
        onZoomFit={centerArtboard}
        onSelectNode={(nodeId) => {
          onSelectNode(nodeId, contextMenuState.sceneId);
          if (onSelectNodes) onSelectNodes([nodeId], contextMenuState.sceneId);
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SECTION ADD AFFORDANCE (+) BETWEEN SECTIONS
// ─────────────────────────────────────────────────────────────

interface SectionAddAffordanceProps {
  position: number;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onClick: () => void;
}

function SectionAddAffordance({
  position,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
}: SectionAddAffordanceProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      id={`sz-add-section-affordance-${position}`}
      data-position={position}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        position: 'relative',
        height: isDragOver ? '32px' : isHovered ? '24px' : '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s ease',
        zIndex: 20,
        margin: '-4px 0',
      }}
    >
      {/* Subtle guide line */}
      <div
        style={{
          position: 'absolute',
          left: '20px',
          right: '20px',
          height: '1px',
          background: isDragOver
            ? '#3B82F6'
            : isHovered
            ? 'rgba(59, 130, 246, 0.5)'
            : 'transparent',
          boxShadow: isDragOver ? '0 0 8px rgba(59, 130, 246, 0.8)' : 'none',
          transition: 'all 0.15s ease',
        }}
      />

      {/* Pill Button */}
      {(isHovered || isDragOver) && (
        <button
          id={`sz-add-section-btn-${position}`}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          style={{
            position: 'relative',
            zIndex: 2,
            background: isDragOver ? '#2563EB' : '#1E293B',
            border: `1px solid ${isDragOver ? '#60A5FA' : 'rgba(255, 255, 255, 0.15)'}`,
            borderRadius: '9999px',
            padding: '3px 10px',
            fontSize: '0.68rem',
            fontWeight: 600,
            color: '#FFFFFF',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            transform: 'scale(1)',
            transition: 'transform 0.1s ease',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Plus size={11} />
          <span>{isDragOver ? 'Drop Section Here' : 'Add Section'}</span>
        </button>
      )}
    </div>
  );
}
