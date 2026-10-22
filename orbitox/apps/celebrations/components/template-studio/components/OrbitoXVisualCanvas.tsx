'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { TemplateSceneDefinition, TemplateDesignTokens, DeviceBreakpoint } from '../types/TemplateSchema';
import { SceneGraphRenderer } from '../../renderer/SceneGraphRenderer';
import { CanvasInteractionLayer } from './canvas/CanvasInteractionLayer';
import { OrbitoXSectionRemixModal, RemixStyle } from './OrbitoXSectionRemixModal';
import { Plus, ZoomIn, ZoomOut, Maximize2, Move, Smartphone, Tablet, Monitor, Eye, Film } from 'lucide-react';
import { TemplateEditorCommand } from '../engine/TemplateEditorCommands';
import { TemplateFactory } from '../engine/TemplateFactory';
import { ScenePresets } from '../engine/ScenePresets';
import { CanvasContextMenu, ContextMenuState } from './context-menu/CanvasContextMenu';
import { CanvasCoordinates } from '../engine/CanvasCoordinates';
import { SceneGraphClipboard } from '../engine/SceneGraphClipboard';

interface Props {
  scenes: TemplateSceneDefinition[];
  activeSceneId: string;
  onSelectScene: (sceneId: string) => void;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null, sceneId?: string) => void;
  onUpdateGeometry: (sceneId: string, nodeId: string, patch: any) => void;
  viewport: DeviceBreakpoint;
  mode: 'design' | 'motion' | 'prototype' | '3d';
  designTokens: TemplateDesignTokens;
  resolvedState?: any;
  schema?: any;
  dispatch: (command: TemplateEditorCommand) => void;
  onAddSection?: () => void;
  showDebug?: boolean;
  onSwitchMode?: (mode: 'design' | 'motion' | 'prototype' | '3d') => void;
  onOpenAiAssistant?: () => void;
}

export function OrbitoXVisualCanvas({
  scenes,
  activeSceneId,
  onSelectScene,
  selectedNodeId,
  onSelectNode,
  onUpdateGeometry,
  viewport,
  mode,
  designTokens,
  resolvedState,
  schema,
  dispatch,
  onAddSection,
  showDebug = false,
  onSwitchMode,
  onOpenAiAssistant,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const artboardRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isRemixOpen, setIsRemixOpen] = useState(false);
  const [contextMenuState, setContextMenuState] = useState<ContextMenuState>({
    isOpen: false,
    type: 'canvas',
    sceneId: activeSceneId,
    clientPosition: { x: 0, y: 0 },
    scenePosition: { x: 0, y: 0 },
    targetNodeId: null,
  });

  // Active scene
  const activeScene = useMemo(() => {
    return scenes.find((s) => s.id === activeSceneId) || scenes[0];
  }, [scenes, activeSceneId]);

  // Viewport dimensions
  const viewportConfig: Record<DeviceBreakpoint, { width: number; label: string; deviceName: string }> = {
    desktop: { width: 1440, label: 'Desktop', deviceName: '1440 × 900' },
    tablet: { width: 768, label: 'iPad Pro', deviceName: '768 × 1024' },
    mobile: { width: 390, label: 'iPhone 15', deviceName: '390 × 844' },
  };

  const currentConfig = viewportConfig[viewport] || viewportConfig.desktop;

  // Intelligent container-based auto-fit (Canva/Figma standard)
  const calculateAutoFit = useCallback(() => {
    if (!containerRef.current) return 0.88;
    const containerWidth = containerRef.current.clientWidth;
    const targetWidth = currentConfig.width;
    // Comfortable safe padding of 48px
    const availableWidth = Math.max(300, containerWidth - 48);
    const fitScale = availableWidth / targetWidth;
    // Scale up to 1.0 or fit perfectly so canvas feels large and dominant
    return Math.min(1.0, Math.max(0.35, Math.round(fitScale * 100) / 100));
  }, [currentConfig.width]);

  // Auto-fit zoom on device viewport change or panel resize
  useEffect(() => {
    const scale = calculateAutoFit();
    setZoom(scale);
    setPan({ x: 0, y: 0 });
  }, [viewport, calculateAutoFit]);

  // ResizeObserver to adapt canvas when sidebars expand/collapse
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      // Recalculate auto-fit when sidebars collapse or expand
      setZoom((prevZoom) => {
        const newFit = calculateAutoFit();
        // If user was roughly at fit scale, adapt automatically
        return Math.abs(prevZoom - newFit) < 0.25 ? newFit : prevZoom;
      });
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [calculateAutoFit]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
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

  // Wheel zoom / pan
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      setZoom((z) => Math.min(Math.max(0.25, z - e.deltaY * 0.005), 3));
    } else {
      setPan((p) => ({ x: p.x - e.deltaX * 0.8, y: p.y - e.deltaY * 0.8 }));
    }
  }, []);

  // Pointer panning
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isSpacePressed || e.button === 1 /* Middle click */) {
      setIsPanning(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    } else if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('canvas-artboard-backdrop')) {
      onSelectNode(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setPan((p) => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsPanning(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Reset viewport to fit
  const handleResetFit = () => {
    const scale = calculateAutoFit();
    setZoom(scale);
    setPan({ x: 0, y: 0 });
  };

  // Dynamic CSS variables from design tokens
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
      '--orbitox-accent-primary': designTokens.colors?.accentPrimary || '#DFBA6B',
      '--orbitox-accent-secondary': designTokens.colors?.accentSecondary || '#B08D4C',
      '--orbitox-accent-glow': designTokens.colors?.accentGlow || 'rgba(223, 186, 107, 0.4)',
      '--orbitox-border-subtle': designTokens.colors?.borderSubtle || 'rgba(255, 255, 255, 0.08)',
      '--orbitox-border-accent': designTokens.colors?.borderAccent || '#DFBA6B',
      '--orbitox-font-display': designTokens.typography?.displayFont || 'sans-serif',
      '--orbitox-font-heading': designTokens.typography?.headingFont || 'sans-serif',
      '--orbitox-font-body': designTokens.typography?.bodyFont || 'sans-serif',
      '--orbitox-font-accent': designTokens.typography?.accentFont || 'serif',
      '--cel-accent': designTokens.colors?.accentPrimary || '#DFBA6B',
      '--cel-gold': designTokens.colors?.accentPrimary || '#DFBA6B',
      '--cel-bg': designTokens.colors?.backgroundPrimary || '#0B0F19',
      '--cel-text-muted': designTokens.colors?.textMuted || '#64748B',
      '--cel-text-dim': designTokens.colors?.textSecondary || '#94A3B8',
    } as React.CSSProperties;
  }, [designTokens]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !activeScene?.sceneGraph?.nodes) return null;
    return activeScene.sceneGraph.nodes[selectedNodeId] || null;
  }, [activeScene, selectedNodeId]);

  // AI Mock Orchestrator Handlers
  const handleAIGenerateSection = useCallback(() => {
    // If scene has no sceneGraph or nodes, initialize with high-fidelity cosmic hero
    if (!activeScene?.sceneGraph || Object.keys(activeScene.sceneGraph.nodes || {}).length === 0) {
      dispatch({
        type: 'UPDATE_SCENE',
        sceneId: activeSceneId,
        patch: {
          sceneGraph: TemplateFactory.buildHeroScene('cosmic'),
          renderMode: 'graph',
        },
      });
      return;
    }

    // Generate a rich SceneGraph section container
    const currentRoot = activeScene.sceneGraph.rootNodeId;
    dispatch({
      type: 'SG_CREATE_NODE',
      sceneId: activeSceneId,
      kind: 'stack',
      parentId: currentRoot || undefined,
      defaults: {
        name: 'AI Generated Story Section',
        layoutMode: 'flex',
        layoutConfig: {
          direction: 'vertical',
          gap: '16px',
          alignment: { primary: 'center', cross: 'center' },
          padding: { top: '32px', right: '32px', bottom: '32px', left: '32px' },
        },
        geometry: {
          position: 'flow',
          width: '100%',
          height: 'auto',
        },
        style: {
          background: {
            type: 'solid',
            color: { type: 'solid', value: 'rgba(255, 255, 255, 0.03)' },
          },
          border: {
            width: '1px',
            style: 'solid',
            color: { type: 'token', tokenPath: 'colors.borderSubtle' },
            radius: '16px',
          },
        },
      },
    });
  }, [dispatch, activeSceneId, activeScene]);

  const handleAIRedesign = useCallback(() => {
    if (!selectedNodeId) return;
    // Mock redesign by changing font and alignment
    onUpdateGeometry(activeSceneId, selectedNodeId, {
      padding: '24px',
      borderRadius: '16px',
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(223, 186, 107, 0.2)',
    });
  }, [selectedNodeId, activeSceneId, onUpdateGeometry]);

  const handleAIWriteCopy = useCallback(() => {
    if (!selectedNodeId) return;
    dispatch({
      type: 'SG_UPDATE_NODE_PROPERTY',
      sceneId: activeSceneId,
      nodeId: selectedNodeId,
      patch: {
        textContent: 'An enchanting evening filled with love and laughter under the stars.',
      },
    });
  }, [selectedNodeId, activeSceneId, dispatch]);

  const handleApplyRemix = useCallback(
    (remixStyle: RemixStyle) => {
      if (!selectedNodeId || !activeSceneId) return;
      dispatch({
        type: 'SG_UPDATE_STYLE',
        sceneId: activeSceneId,
        nodeId: selectedNodeId,
        patch: remixStyle.stylePatch as any,
      });
      setIsRemixOpen(false);
    },
    [selectedNodeId, activeSceneId, dispatch]
  );

  // Right-Click Context Menu Handler
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const scenePos = CanvasCoordinates.clientToScene(
        e.clientX,
        e.clientY,
        artboardRef.current,
        zoom
      );

      const currentSceneId = activeScene?.id || activeSceneId;

      // Check if clicked a section pill button
      const sectionBtn = target.closest('[data-section-id]') as HTMLElement | null;
      if (sectionBtn) {
        const secId = sectionBtn.getAttribute('data-section-id');
        setContextMenuState({
          isOpen: true,
          type: 'section',
          sceneId: secId || currentSceneId,
          clientPosition: { x: e.clientX, y: e.clientY },
          scenePosition: scenePos,
          targetSectionId: secId,
        });
        return;
      }

      // Check if clicked a SceneGraph node
      const nodeEl = target.closest('[data-node-id]') as HTMLElement | null;
      if (nodeEl) {
        const nodeId = nodeEl.getAttribute('data-node-id');
        if (nodeId && activeScene?.sceneGraph?.nodes[nodeId]) {
          onSelectNode(nodeId, currentSceneId);
          setContextMenuState({
            isOpen: true,
            type: 'node',
            sceneId: currentSceneId,
            clientPosition: { x: e.clientX, y: e.clientY },
            scenePosition: scenePos,
            targetNodeId: nodeId,
            targetNodeIds: [nodeId],
          });
          return;
        }
      }

      // Fallback: Canvas Background
      setContextMenuState({
        isOpen: true,
        type: 'canvas',
        sceneId: currentSceneId,
        clientPosition: { x: e.clientX, y: e.clientY },
        scenePosition: scenePos,
        targetNodeId: null,
      });
    },
    [activeScene, activeSceneId, zoom, onSelectNode]
  );

  // P26: Global Creative Shortcuts (⌘C, ⌘X, ⌘V, ⌘D, ⌫, ⌘A)
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

      const currentSceneId = activeScene?.id || activeSceneId;
      if (!currentSceneId) return;

      if (isMeta && e.key === 'c' && selectedNodeId) {
        if (activeScene?.sceneGraph) {
          SceneGraphClipboard.copy(activeScene.sceneGraph, [selectedNodeId], currentSceneId);
        }
      } else if (isMeta && e.key === 'x' && selectedNodeId) {
        dispatch({ type: 'SG_CUT_NODES', sceneId: currentSceneId, nodeIds: [selectedNodeId] });
      } else if (isMeta && e.key === 'v') {
        if (e.altKey && e.shiftKey) {
          dispatch({
            type: 'SG_PASTE_AT_COORDINATES',
            sceneId: currentSceneId,
            x: currentConfig.width / 2 - 100,
            y: 200,
          });
        } else if (e.altKey && selectedNodeId) {
          dispatch({ type: 'SG_PASTE_REPLACE', sceneId: currentSceneId, targetNodeId: selectedNodeId });
        } else {
          const targetParent = selectedNodeId
            ? activeScene?.sceneGraph?.nodes[selectedNodeId]?.parentId || activeScene?.sceneGraph?.rootNodeId || 'root'
            : activeScene?.sceneGraph?.rootNodeId || 'root';
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
  }, [selectedNodeId, activeScene, activeSceneId, dispatch, currentConfig.width]);

  return (
    <div
      ref={containerRef}
      onContextMenu={handleContextMenu}
      className={`relative overflow-hidden select-none outline-none canvas-artboard-backdrop ${
        isSpacePressed ? 'cursor-grab' : ''
      } ${isPanning ? 'cursor-grabbing' : ''}`}
      style={{
        flex: 1,
        minWidth: 0,
        height: 'calc(100vh - 52px)',
        background: '#060B1A',
        backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      tabIndex={0}
    >
      {/* ── SECTION NAVIGATION PILLS (Top of Canvas) ── */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(9, 13, 26, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '9999px',
          padding: '4px 6px',
          zIndex: 30,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#DFBA6B', textTransform: 'uppercase', padding: '0 6px', letterSpacing: '0.08em' }}>
          Sections
        </span>
        <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.1)' }} />
        {scenes.map((scene) => {
          const isActive = scene.id === activeSceneId;
          return (
            <button
              key={scene.id}
              data-section-id={scene.id}
              onClick={() => {
                onSelectScene(scene.id);
                onSelectNode(null);
              }}
              style={{
                background: isActive ? 'linear-gradient(135deg, rgba(223, 186, 107, 0.25) 0%, rgba(176, 141, 76, 0.15) 100%)' : 'transparent',
                border: isActive ? '1px solid #DFBA6B' : '1px solid transparent',
                borderRadius: '9999px',
                padding: '4px 10px',
                fontSize: '0.72rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#DFBA6B' : 'rgba(255, 255, 255, 0.65)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {scene.name}
            </button>
          );
        })}
        {onAddSection && (
          <button
            onClick={onAddSection}
            title="Add Section Block"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px dashed rgba(255, 255, 255, 0.2)',
              borderRadius: '9999px',
              padding: '4px 8px',
              fontSize: '0.72rem',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Plus size={12} />
            <span>Add Block</span>
          </button>
        )}
      </div>

      {/* ── ARTBOARD WORKSPACE CONTAINER (Zoomed & Panned) ── */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '72px',
          transform: `translate(calc(-50% + ${pan.x}px), ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'top center',
          transition: isPanning ? 'none' : 'transform 0.1s ease-out',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          paddingBottom: '120px',
        }}
      >
        {/* Device Viewport Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: `${currentConfig.width}px`,
            padding: '0 8px',
            color: 'rgba(255, 255, 255, 0.4)',
            fontSize: '0.72rem',
            fontWeight: 500,
            letterSpacing: '0.04em',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#DFBA6B', fontWeight: 600 }}>{activeScene?.name}</span>
            <span>•</span>
            <span>{currentConfig.label} ({currentConfig.deviceName})</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>
            100% Graph-Native Scene
          </div>
        </div>

        {/* ── THE ARTBOARD FRAME ── */}
        <div
          ref={artboardRef}
          id="orbitox-artboard-frame"
          style={{
            width: `${currentConfig.width}px`,
            minHeight: viewport === 'mobile' ? '844px' : viewport === 'tablet' ? '1024px' : '900px',
            background: designTokens?.colors?.backgroundPrimary || '#0B0F19',
            borderRadius: viewport === 'mobile' ? '40px' : viewport === 'tablet' ? '24px' : '8px',
            border: viewport === 'mobile' ? '8px solid #1E293B' : viewport === 'tablet' ? '6px solid #1E293B' : '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-radius 0.25s ease',
            ...tokenCssVars,
          }}
        >
          {/* Mobile Island / Speaker Indicator */}
          {viewport === 'mobile' && (
            <div
              style={{
                position: 'absolute',
                top: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '90px',
                height: '24px',
                background: '#090D1A',
                borderRadius: '12px',
                zIndex: 60,
                pointerEvents: 'none',
              }}
            />
          )}

          {activeScene?.sceneGraph ? (
            <div className="relative w-full h-full min-h-[inherit]" data-editor-scene-id={activeScene.id}>
              {/* Scene Renderer */}
              <SceneGraphRenderer
                sceneGraph={activeScene.sceneGraph}
                device={viewport}
                tokens={designTokens}
                isEditorMode={mode === 'design'}
                onNodeClick={(id: string) => onSelectNode(id, activeScene.id)}
                resolvedState={resolvedState}
                schema={schema}
              />

              {/* Direct Manipulation Interaction Layer (Handles, Inline Edit, Drag Resize) */}
              {mode === 'design' && (
                <CanvasInteractionLayer
                  sceneId={activeScene.id}
                  sceneGraph={activeScene.sceneGraph}
                  selectedNodeIds={selectedNodeId ? [selectedNodeId] : []}
                  onSelectNodes={(ids) => onSelectNode(ids[0] || null, activeScene.id)}
                  onUpdateGeometry={(nodeId, patch) => onUpdateGeometry(activeScene.id, nodeId, patch)}
                  dispatch={dispatch}
                  zoom={zoom}
                  showDebug={showDebug}
                  onOpenMotion={() => onSwitchMode?.('motion')}
                  onOpenAi={(action) => onOpenAiAssistant?.()}
                  onOpenRemix={() => setIsRemixOpen(true)}
                />
              )}
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '420px',
                color: 'rgba(255, 255, 255, 0.7)',
                gap: '16px',
                padding: '40px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '2.5rem' }}>✨</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#FFFFFF' }}>Empty Section</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', maxWidth: '340px', lineHeight: 1.5 }}>
                Initialize this section with a graph-native template, or use the AI generator below to create rich layouts.
              </div>
              <button
                onClick={handleAIGenerateSection}
                style={{
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                  border: 'none',
                  borderRadius: '9999px',
                  color: '#FFFFFF',
                  padding: '9px 20px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 24px rgba(109, 40, 217, 0.4)',
                  marginTop: '6px',
                }}
              >
                <span>🪄</span>
                <span>Generate Section with AI</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── UNIFIED FIGMA/FRAMER-STYLE BOTTOM CONTEXTUAL BAR ── */}
      {mode === 'design' && (
      <div
        id="orbitox-unified-bottom-bar"
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(9, 13, 26, 0.94)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(223, 186, 107, 0.3)',
          borderRadius: '9999px',
          padding: '6px 14px',
          zIndex: 35,
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.65), 0 0 16px rgba(223, 186, 107, 0.15)',
          userSelect: 'none',
          color: '#FFFFFF',
          fontSize: '0.74rem',
        }}
      >
        {/* Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => setZoom((z) => Math.max(0.25, z - 0.1))}
            title="Zoom Out"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.7)',
              padding: '3px 6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '4px',
            }}
          >
            <ZoomOut size={13} />
          </button>

          <button
            onClick={handleResetFit}
            title="Intelligently Fit Artboard to Workspace"
            style={{
              background: 'rgba(223, 186, 107, 0.12)',
              border: '1px solid rgba(223, 186, 107, 0.3)',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#DFBA6B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            <span>Fit</span>
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}>({Math.round(zoom * 100)}%)</span>
          </button>

          <button
            onClick={() => {
              const presets = [0.25, 0.5, 0.75, 1.0, 2.0];
              const next = presets.find((p) => p > zoom + 0.05) ?? presets[0] ?? 1.0;
              setZoom(next);
              setPan({ x: 0, y: 0 });
            }}
            title="Cycle Zoom: 25% → 50% → 75% → 100% → 200%"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.8)',
              padding: '2px 4px',
              cursor: 'pointer',
            }}
          >
            ▾
          </button>

          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
            title="Zoom In"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.7)',
              padding: '3px 6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '4px',
            }}
          >
            <ZoomIn size={13} />
          </button>
        </div>

        <div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.12)' }} />

        {/* Selected Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '0.7rem' }}>Selected:</span>
          <span
            style={{
              color: selectedNode ? '#DFBA6B' : 'rgba(255, 255, 255, 0.65)',
              fontWeight: 600,
              maxWidth: '180px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {selectedNode ? `${selectedNode.name || selectedNode.kind}` : 'None (Canvas)'}
          </span>
        </div>

        <div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.12)' }} />

        {/* Performance & Runtime Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.5)' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ADE80' }} />
          <span>60 FPS</span>
          <span>•</span>
          <span>Edge CDN</span>
        </div>

        <div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.12)' }} />

        {/* Motion Timeline Expansion Trigger */}
        <button
          onClick={() => onSwitchMode?.('motion')}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '9999px',
            color: '#FFFFFF',
            padding: '3px 10px',
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            transition: 'all 0.15s ease',
          }}
        >
          <Film size={12} color="#DFBA6B" />
          <span>Motion ▾</span>
        </button>
      </div>
      )}

      {/* ── SECTION REMIX MODAL ── */}
      <OrbitoXSectionRemixModal
        isOpen={isRemixOpen}
        onClose={() => setIsRemixOpen(false)}
        selectedNode={selectedNode}
        onApplyRemix={handleApplyRemix}
      />

      {/* ── P26: RIGHT-CLICK CONTEXT MENU ── */}
      <CanvasContextMenu
        state={contextMenuState}
        onClose={() => setContextMenuState((prev) => ({ ...prev, isOpen: false }))}
        dispatch={dispatch}
        sceneGraph={activeScene?.sceneGraph}
        onZoomFit={() => {
          const fit = calculateAutoFit();
          setZoom(fit);
          setPan({ x: 0, y: 0 });
        }}
        onSelectNode={(nodeId) => onSelectNode(nodeId, activeScene?.id || activeSceneId)}
      />
    </div>
  );
}
