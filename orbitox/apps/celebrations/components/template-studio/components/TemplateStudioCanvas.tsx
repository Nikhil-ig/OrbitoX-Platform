'use client';

import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  TemplateSchema,
  DeviceBreakpoint,
  TemplateSceneDefinition,
  SceneStructureLayer,
} from '../types/TemplateSchema';
import { CelebrationState, buildLiveExperience } from '@/components/studio/StudioData';
import { CanvasWorkspace } from './canvas/CanvasWorkspace';
import { TemplateEditorCommand } from '../engine/TemplateEditorCommands';
import { DEFAULT_THEMES, Theme } from '@orbitox-io/celebrations';
import {
  Crosshair,
  Maximize2,
  RefreshCw,
  Sparkles,
  Layers,
  Smartphone,
  Eye,
  Play,
  RotateCcw,
  Sliders,
  Lock,
} from 'lucide-react';

interface TemplateStudioCanvasProps {
  schema: TemplateSchema;
  resolvedState: CelebrationState;
  viewport: DeviceBreakpoint;
  previewMode: 'admin' | 'customer' | 'guest';
  selectedSceneId: string | null;
  selectedLayerId: string | null;
  onSelectScene: (sceneId: string) => void;
  onSelectLayer: (layerId: string, sceneId?: string, kind?: any) => void;
  onSelectField?: (fieldKey: string) => void;
  dispatch: (command: TemplateEditorCommand) => void;
}

interface SelectionBox {
  top: number;
  left: number;
  width: number;
  height: number;
  label: string;
  layerType: string;
}

export function TemplateStudioCanvas({
  schema,
  resolvedState,
  viewport,
  previewMode,
  selectedSceneId,
  selectedLayerId,
  onSelectScene,
  onSelectLayer,
  onSelectField,
  dispatch,
}: TemplateStudioCanvasProps) {
  const [inspectMode, setInspectMode] = useState<boolean>(true);
  const [motionAnimationKey, setMotionAnimationKey] = useState<number>(0);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const canvasFrameRef = useRef<HTMLDivElement | null>(null);

  // Compute live experience object for the template renderer
  const liveExperience = useMemo(() => {
    return buildLiveExperience(resolvedState);
  }, [resolvedState]);

  // Viewport dimensions
  const frameDimensions: Record<DeviceBreakpoint, { width: string; height: string; label: string }> = {
    desktop: { width: '100%', height: '100%', label: 'Desktop 1280px+' },
    tablet: { width: '768px', height: '1024px', label: 'iPad / Tablet (768 × 1024)' },
    mobile: { width: '390px', height: '844px', label: 'iPhone 15 / Mobile (390 × 844)' },
  };

  const currentDim = frameDimensions[viewport] || frameDimensions.desktop;

  const platformTheme: Theme = useMemo(() => {
    return (
      DEFAULT_THEMES.find((t) => t.slug === schema.slug) ||
      DEFAULT_THEMES.find((t) => t.slug === 'celestial-rose-gold') ||
      (DEFAULT_THEMES[0] as Theme)
    );
  }, [schema.slug]);

  // Dynamic CSS Custom Properties injected from schema.designTokens
  const tokenCssVars = useMemo(() => {
    const dt = schema.designTokens;
    if (!dt) return {};
    return {
      '--orbitox-bg-primary': dt.colors?.backgroundPrimary,
      '--orbitox-bg-secondary': dt.colors?.backgroundSecondary,
      '--orbitox-surface-primary': dt.colors?.surfacePrimary,
      '--orbitox-surface-elevated': dt.colors?.surfaceElevated,
      '--orbitox-text-primary': dt.colors?.textPrimary,
      '--orbitox-text-secondary': dt.colors?.textSecondary,
      '--orbitox-text-muted': dt.colors?.textMuted,
      '--orbitox-accent-primary': dt.colors?.accentPrimary,
      '--orbitox-accent-secondary': dt.colors?.accentSecondary,
      '--orbitox-accent-glow': dt.colors?.accentGlow,
      '--orbitox-border-subtle': dt.colors?.borderSubtle,
      '--orbitox-border-accent': dt.colors?.borderAccent,
      '--orbitox-font-display': dt.typography?.displayFont,
      '--orbitox-font-heading': dt.typography?.headingFont,
      '--orbitox-font-body': dt.typography?.bodyFont,
      '--orbitox-font-accent': dt.typography?.accentFont,
      '--orbitox-radius-sm': dt.radius?.sm,
      '--orbitox-radius-md': dt.radius?.md,
      '--orbitox-radius-lg': dt.radius?.lg,
      '--orbitox-radius-pill': dt.radius?.pill,
      '--orbitox-shadow-subtle': dt.shadows?.subtle,
      '--orbitox-shadow-elevated': dt.shadows?.elevated,
      '--orbitox-shadow-glow': dt.shadows?.glow,
      '--orbitox-shadow-cosmic': dt.shadows?.cosmic,
      // Common Aliases
      '--cel-accent': dt.colors?.accentPrimary,
      '--cel-gold': dt.colors?.accentPrimary,
      '--cel-bg': dt.colors?.backgroundPrimary,
      '--cel-text-muted': dt.colors?.textMuted,
      '--cel-text-dim': dt.colors?.textSecondary,
    } as React.CSSProperties;
  }, [schema.designTokens]);

  // Helper to find layer in tree
  const findLayerRecursive = (layers: SceneStructureLayer[], id: string): SceneStructureLayer | null => {
    for (const lay of layers) {
      if (lay.id === id) return lay;
      if (lay.children) {
        const found = findLayerRecursive(lay.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Auto-scroll canvas smoothly to selected scene or node
  useEffect(() => {
    if (!canvasFrameRef.current) return;
    const frame = canvasFrameRef.current;

    // Prioritize focusing selected node if present (Prompt #7 & #30)
    if (selectedLayerId) {
      const el =
        (frame.querySelector(`[data-editor-node-id="${selectedLayerId}"]`) as HTMLElement) ||
        (frame.querySelector(`[data-layer-id="${selectedLayerId}"]`) as HTMLElement);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    // Otherwise scroll to scene
    if (selectedSceneId) {
      const sceneEl =
        (frame.querySelector(`[data-editor-scene-id="${selectedSceneId}"]`) as HTMLElement) ||
        (frame.querySelector(`[data-scene-id="${selectedSceneId}"]`) as HTMLElement) ||
        (frame.querySelector(`#sec-${selectedSceneId}`) as HTMLElement);

      if (sceneEl) {
        sceneEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [selectedSceneId, selectedLayerId]);

  // Re-calculate selection boundary box
  useEffect(() => {
    if (!selectedLayerId || !canvasFrameRef.current || previewMode === 'guest') {
      setSelectionBox(null);
      return;
    }

    const computeBox = () => {
      if (!canvasFrameRef.current) return;
      const el =
        (canvasFrameRef.current.querySelector(`[data-editor-node-id="${selectedLayerId}"]`) as HTMLElement) ||
        (canvasFrameRef.current.querySelector(`[data-layer-id="${selectedLayerId}"]`) as HTMLElement);
      if (!el) {
        setSelectionBox(null);
        return;
      }

      const frameRect = canvasFrameRef.current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();

      let label =
        el.getAttribute('data-binding-key') ||
        el.getAttribute('data-editor-node-id') ||
        selectedLayerId;
      let layerType = el.getAttribute('data-editor-kind') || 'Element';

      for (const scn of schema.scenes) {
        const found = findLayerRecursive(scn.layers, selectedLayerId);
        if (found) {
          label = found.name;
          layerType = found.layerType;
          break;
        }
      }

      setSelectionBox({
        top: elRect.top - frameRect.top + canvasFrameRef.current.scrollTop,
        left: elRect.left - frameRect.left + canvasFrameRef.current.scrollLeft,
        width: elRect.width,
        height: elRect.height,
        label,
        layerType,
      });
    };

    computeBox();
    const interval = setInterval(computeBox, 250);
    return () => clearInterval(interval);
  }, [selectedLayerId, selectedSceneId, viewport, previewMode, schema]);

  // Render the appropriate template
  const renderTemplateContent = () => {
    const scene = schema.scenes.find(s => s.id === selectedSceneId) || schema.scenes[0];
    if (!scene || !scene.sceneGraph) return null;
    
    return (
      <CanvasWorkspace 
        sceneId={scene.id}
        sceneGraph={scene.sceneGraph}
        device={viewport}
        tokens={schema.designTokens!}
        selectedNodeIds={selectedLayerId ? [selectedLayerId] : []}
        onSelectNodes={(ids) => onSelectLayer(ids[0] || '', scene.id)}
        onUpdateGeometry={(nodeId, patch) => dispatch({ type: 'SG_UPDATE_GEOMETRY', sceneId: scene.id, nodeId, patch })}
        dispatch={dispatch}
        resolvedState={resolvedState}
        schema={schema}
      />
    );
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!inspectMode || previewMode === 'guest') return;

    // Detect target element by data-editor attributes or legacy layer attributes (Prompt #3, #6)
    const target = e.target as HTMLElement;
    const layerTarget = (target.closest('[data-editor-node-id]') ||
      target.closest('[data-layer-id]')) as HTMLElement | null;
    const sceneTarget = (target.closest('[data-editor-scene-id]') ||
      target.closest('[data-scene-id]')) as HTMLElement | null;

    if (layerTarget) {
      const lid =
        layerTarget.getAttribute('data-editor-node-id') ||
        layerTarget.getAttribute('data-layer-id');
      const sid =
        layerTarget.getAttribute('data-editor-scene-id') ||
        layerTarget.getAttribute('data-scene-id') ||
        undefined;
      const fkey = layerTarget.getAttribute('data-binding-key');
      const kind = layerTarget.getAttribute('data-editor-kind');
      if (lid) onSelectLayer(lid, sid, kind);
      if (fkey && onSelectField) onSelectField(fkey);
    } else if (sceneTarget) {
      const sid =
        sceneTarget.getAttribute('data-editor-scene-id') ||
        sceneTarget.getAttribute('data-scene-id');
      if (sid) onSelectScene(sid);
    } else {
      // Clicked on neutral background: deselect active layer
      onSelectLayer('', undefined);
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (!inspectMode || previewMode === 'guest') return;
    const target = e.target as HTMLElement;
    const layerTarget = (target.closest('[data-editor-node-id]') ||
      target.closest('[data-layer-id]')) as HTMLElement | null;
    const hoveredId = layerTarget
      ? layerTarget.getAttribute('data-editor-node-id') ||
        layerTarget.getAttribute('data-layer-id')
      : null;
    // Dispatched to store
  };

  const handleReplayMotion = () => {
    setMotionAnimationKey((k) => k + 1);
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#040711',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Canvas Utility Toolbar */}
      <div
        style={{
          height: '42px',
          background: 'rgba(7, 11, 22, 0.95)',
          borderBottom: '1px solid rgba(223, 186, 107, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          fontSize: '0.74rem',
          color: 'var(--cel-text-muted, #94A3B8)',
          zIndex: 20,
        }}
      >
        {/* Left: Inspect Mode Toggle & Resolution */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => setInspectMode(!inspectMode)}
            title="Toggle click-to-inspect elements in canvas"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              border: inspectMode
                ? '1px solid rgba(223, 186, 107, 0.5)'
                : '1px solid rgba(255, 255, 255, 0.1)',
              background: inspectMode
                ? 'rgba(223, 186, 107, 0.15)'
                : 'rgba(255, 255, 255, 0.04)',
              color: inspectMode ? '#DFBA6B' : 'var(--cel-text-muted, #94A3B8)',
              fontWeight: 700,
              fontSize: '0.72rem',
              cursor: 'pointer',
            }}
          >
            <Crosshair size={13} />
            <span>{inspectMode ? 'Live Inspector Active' : 'Inspect Mode Off'}</span>
          </button>

          {/* Re-trigger Motion Preview Button */}
          <button
            onClick={handleReplayMotion}
            title="Re-play scene entrance animations"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 9px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: '#CBD5E1',
              fontWeight: 600,
              fontSize: '0.72rem',
              cursor: 'pointer',
            }}
          >
            <Play size={11} color="#DFBA6B" />
            <span>Preview Motion ▶</span>
          </button>

          <span style={{ color: 'var(--cel-text-dim, #64748B)' }}>
            Viewport: <strong style={{ color: '#CBD5E1' }}>{currentDim.label}</strong>
          </span>

          {selectedSceneId && (() => {
            const scn = schema.scenes.find((s) => s.id === selectedSceneId);
            const authMode = scn?.sceneGraph && scn.renderMode === 'graph'
              ? 'GRAPH_NATIVE'
              : scn?.renderMode === 'hybrid'
              ? 'HYBRID'
              : 'LEGACY';
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    color: '#38BDF8',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                  }}
                >
                  <span>Selected Scene:</span>
                  <strong style={{ color: '#fff' }}>
                    {scn?.name || selectedSceneId}
                  </strong>
                </span>
                <span
                  title={authMode === 'GRAPH_NATIVE' ? 'SceneGraph is visual source of truth' : 'React JSX authoritative layout'}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.64rem',
                    fontWeight: 800,
                    background: authMode === 'GRAPH_NATIVE' ? 'rgba(16, 185, 129, 0.15)' : authMode === 'HYBRID' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(148, 163, 184, 0.12)',
                    border: authMode === 'GRAPH_NATIVE' ? '1px solid rgba(16, 185, 129, 0.4)' : authMode === 'HYBRID' ? '1px solid rgba(234, 179, 8, 0.4)' : '1px solid rgba(148, 163, 184, 0.3)',
                    color: authMode === 'GRAPH_NATIVE' ? '#10B981' : authMode === 'HYBRID' ? '#FBBF24' : '#94A3B8',
                  }}
                >
                  {authMode}
                </span>
              </div>
            );
          })()}
        </div>

        {/* Right: Quick Scene Navigation Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--cel-text-dim, #64748B)' }}>Jump to Scene:</span>
          {schema.scenes.map((scene, idx) => (
            <button
              key={scene.id}
              onClick={() => onSelectScene(scene.id)}
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                border: selectedSceneId === scene.id
                  ? '1px solid #DFBA6B'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                background: selectedSceneId === scene.id
                  ? 'rgba(223, 186, 107, 0.2)'
                  : 'rgba(255, 255, 255, 0.03)',
                color: selectedSceneId === scene.id ? '#DFBA6B' : 'var(--cel-text-muted, #94A3B8)',
                fontSize: '0.68rem',
                fontWeight: selectedSceneId === scene.id ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              {idx + 1}. {scene.navigationLabel || scene.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Canvas Viewport Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: viewport === 'desktop' ? 'stretch' : 'center',
          overflow: 'auto',
          padding: viewport === 'desktop' ? '0' : '24px',
          background: 'radial-gradient(circle at center, #0B1124 0%, #03060E 100%)',
        }}
      >
        <div
          ref={canvasFrameRef}
          onClick={handleCanvasClick}
          style={{
            width: currentDim.width,
            height: viewport === 'desktop' ? '100%' : currentDim.height,
            maxHeight: viewport === 'desktop' ? '100%' : '90vh',
            boxShadow:
              viewport === 'desktop'
                ? 'none'
                : '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 0 12px #1E293B, 0 0 0 13px rgba(223, 186, 107, 0.4)',
            borderRadius: viewport === 'desktop' ? '0' : '36px',
            overflow: 'auto',
            background: schema.designTokens?.colors?.backgroundPrimary || '#06080F',
            position: 'relative',
            border: viewport === 'desktop' ? 'none' : '4px solid #000',
            transition: 'width 0.25s ease, height 0.25s ease',
            ...tokenCssVars,
          }}
        >
          {/* Mobile Island / Camera Notch for authentic simulation */}
          {viewport === 'mobile' && (
            <div
              style={{
                position: 'sticky',
                top: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '96px',
                height: '24px',
                background: '#000',
                borderRadius: '16px',
                zIndex: 9999,
                pointerEvents: 'none',
                boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
              }}
            />
          )}

          {/* Actual Rendered Template Experience */}
          <div key={motionAnimationKey} style={{ minHeight: '100%', position: 'relative' }}>
            {renderTemplateContent()}
          </div>

          {/* ========================================================================= */}
          {/* SELECTION BOUNDARY RETICLE & CONTEXTUAL PILL (Prompt #11)                 */}
          {/* ========================================================================= */}
          {selectionBox && inspectMode && previewMode !== 'guest' && (
            <div
              style={{
                position: 'absolute',
                top: `${selectionBox.top}px`,
                left: `${selectionBox.left}px`,
                width: `${selectionBox.width}px`,
                height: `${selectionBox.height}px`,
                pointerEvents: 'none',
                border: '1.5px solid #DFBA6B',
                borderRadius: '6px',
                boxShadow: '0 0 20px rgba(223, 186, 107, 0.45), inset 0 0 10px rgba(223, 186, 107, 0.1)',
                zIndex: 1000,
                transition: 'all 0.15s ease',
              }}
            >
              {/* Reticle Corner Accents */}
              <div style={{ position: 'absolute', top: -3, left: -3, width: 8, height: 8, borderTop: '2px solid #DFBA6B', borderLeft: '2px solid #DFBA6B' }} />
              <div style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderTop: '2px solid #DFBA6B', borderRight: '2px solid #DFBA6B' }} />
              <div style={{ position: 'absolute', bottom: -3, left: -3, width: 8, height: 8, borderBottom: '2px solid #DFBA6B', borderLeft: '2px solid #DFBA6B' }} />
              <div style={{ position: 'absolute', bottom: -3, right: -3, width: 8, height: 8, borderBottom: '2px solid #DFBA6B', borderRight: '2px solid #DFBA6B' }} />

              {/* Floating Contextual Badge Pill */}
              <div
                style={{
                  position: 'absolute',
                  top: selectionBox.top > 36 ? '-32px' : '6px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(9, 13, 26, 0.95)',
                  border: '1px solid rgba(223, 186, 107, 0.5)',
                  borderRadius: '9999px',
                  padding: '3px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
                  pointerEvents: 'auto',
                  whiteSpace: 'nowrap',
                }}
              >
                <Layers size={11} color="#DFBA6B" />
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#DFBA6B', letterSpacing: '0.02em' }}>
                  {selectionBox.layerType.toUpperCase()}
                </span>
                <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '0.7rem' }}>•</span>
                <span style={{ fontSize: '0.7rem', color: '#fff', fontWeight: 600 }}>
                  {selectionBox.label}
                </span>

                {/* Quick Action Buttons */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const sid = selectedSceneId || undefined;
                    onSelectLayer(selectedLayerId!, sid);
                  }}
                  title="Configure in Inspector"
                  style={{
                    marginLeft: '4px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(223, 186, 107, 0.2)',
                    border: 'none',
                    color: '#DFBA6B',
                    fontSize: '0.64rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
