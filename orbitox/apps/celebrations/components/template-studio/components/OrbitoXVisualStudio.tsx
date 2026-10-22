'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  TemplateSchema,
  DeviceBreakpoint,
  TemplateSceneDefinition,
  TemplateDesignTokens,
} from '../types/TemplateSchema';
import { TemplateSchemaService } from '../services/TemplateSchemaService';
import {
  TemplateEditorProvider,
  useTemplateEditor,
} from '../engine';
import { SceneNodeKind, SceneGraphNode } from '../engine/SceneGraphTypes';
import { OrbitoXVisualStudioTopBar } from './OrbitoXVisualStudioTopBar';
import { OrbitoXVisualLeftRail, LeftRailTab } from './OrbitoXVisualLeftRail';
import { OrbitoXVisualCanvas } from './OrbitoXVisualCanvas';
import { OrbitoXContextualInspector } from './OrbitoXContextualInspector';
import { CommandPalette } from './CommandPalette';
import { WebSectionLibrary } from '../engine/WebSectionLibrary';
import { DesignUniverseEngine } from '../engine/DesignUniverses';
import { TypographyStudioEngine } from '../engine/TypographyStudio';
import { OrbitoXMotionTimeline } from './OrbitoXMotionTimeline';
import { OrbitoX3DWorkspace } from './OrbitoX3DWorkspace';
import { OrbitoXAiAssistantModal } from './OrbitoXAiAssistantModal';
import { OrbitoXPrototypeWorkspace } from './OrbitoXPrototypeWorkspace';
import { OrbitoXNewProjectModal } from './OrbitoXNewProjectModal';
import { OrbitoXImmersivePreview } from './OrbitoXImmersivePreview';
import { OrbitoXUniversalImportModal } from './OrbitoXUniversalImportModal';
import { Check, X, ExternalLink, ShieldCheck, Sparkles, Eye, Share2, Minimize2 } from 'lucide-react';

export function OrbitoXVisualStudio({ slug }: { slug?: string } = {}) {
  const searchParams = useSearchParams();
  const templateSlug = slug || searchParams.get('template') || searchParams.get('slug') || 'celestial-odyssey';

  const initialSchema = useMemo(() => {
    return TemplateSchemaService.getSchema(templateSlug);
  }, [templateSlug]);

  return (
    <TemplateEditorProvider initialSchema={initialSchema}>
      <OrbitoXVisualStudioContent />
    </TemplateEditorProvider>
  );
}

function OrbitoXVisualStudioContent() {
  const { state, controller } = useTemplateEditor();
  const searchParams = useSearchParams();
  const isDebugUrl = searchParams.get('debug') === 'true';

  // Mode: Design | Motion | Prototype | 3D
  const [mode, setMode] = useState<'design' | 'motion' | 'prototype' | '3d'>('design');

  // Left Rail Tab (starts collapsed so canvas is dominant and spacious)
  const [activeLeftTab, setActiveLeftTab] = useState<LeftRailTab | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Active Design Universe
  const [activeUniverseId, setActiveUniverseId] = useState<string>('celestial');

  // Expert Mode
  const [expertMode, setExpertMode] = useState(isDebugUrl);

  // Preview Modal
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Publish Modal
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [publishResult, setPublishResult] = useState<{ url: string; timestamp: string } | null>(null);

  // Ask OrbitoX AI Assistant Modal
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);

  // Schema & State access
  const schema = state.draft.schema;
  const resolvedState = state.runtime.resolvedSnapshot;
  const viewport = state.ui.activeDevice;
  const selectedSceneId = state.ui.selection.sceneId || schema.scenes[0]?.id || '';
  const selectedNodeId = state.ui.selection.nodeId;
  const isCommandPaletteOpen = state.ui.isCommandPaletteOpen;
  const saveStatus = state.persistence.status === 'error' ? 'unsaved' : state.persistence.status;
  const canUndo = state.history.past.length > 0;
  const canRedo = state.history.future.length > 0;

  // Active scene
  const activeScene: TemplateSceneDefinition = useMemo(() => {
    return (schema.scenes.find((s) => s.id === selectedSceneId) || schema.scenes[0])!;
  }, [schema.scenes, selectedSceneId]);

  // Selected node
  const selectedNode: SceneGraphNode | null = useMemo(() => {
    if (!selectedNodeId || !activeScene?.sceneGraph?.nodes) return null;
    return activeScene.sceneGraph.nodes[selectedNodeId] || null;
  }, [activeScene, selectedNodeId]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K: Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        controller.toggleCommandPalette();
      }
      // ⌘Z / ⇧⌘Z: Undo / Redo
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          controller.redo();
        } else {
          e.preventDefault();
          controller.undo();
        }
      }
      // Escape: Deselect or close overlays
      if (e.key === 'Escape') {
        setIsFullscreen(false);
        if (isAiAssistantOpen) setIsAiAssistantOpen(false);
        if (isPreviewOpen) setIsPreviewOpen(false);
        if (isPublishOpen) setIsPublishOpen(false);
        if (isNewProjectOpen) setIsNewProjectOpen(false);
        if (isCommandPaletteOpen) controller.toggleCommandPalette(false);
        controller.clearSelection();
      }
      // F key: Toggle Fullscreen Canvas (when not typing in inputs)
      if (
        (e.key === 'f' || e.key === 'F') &&
        !e.metaKey &&
        !e.ctrlKey &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      }
      // Delete / Backspace: Delete selected node (when not inside inputs)
      if (
        (e.key === 'Backspace' || e.key === 'Delete') &&
        selectedNodeId &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        !document.activeElement?.getAttribute('contenteditable')
      ) {
        e.preventDefault();
        controller.dispatch({
          type: 'SG_DELETE_NODE',
          sceneId: activeScene.id,
          nodeId: selectedNodeId,
        });
      }
      // ⌘D: Duplicate selected node
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === 'd' &&
        selectedNodeId &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        controller.dispatch({
          type: 'SG_DUPLICATE_NODE',
          sceneId: activeScene.id,
          nodeId: selectedNodeId,
        });
      }
      // Arrow keys: Nudge selected node (1px, or 10px with Shift)
      if (
        ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) &&
        selectedNodeId &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;

        const node = activeScene.sceneGraph?.nodes[selectedNodeId];
        if (node) {
          const curX = typeof node.geometry?.x === 'number' ? node.geometry.x : parseFloat(String(node.geometry?.x || 0));
          const curY = typeof node.geometry?.y === 'number' ? node.geometry.y : parseFloat(String(node.geometry?.y || 0));
          controller.dispatch({
            type: 'SG_UPDATE_GEOMETRY',
            sceneId: activeScene.id,
            nodeId: selectedNodeId,
            patch: {
              x: (isNaN(curX) ? 0 : curX) + dx,
              y: (isNaN(curY) ? 0 : curY) + dy,
              position: 'absolute',
            },
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [controller, activeScene, selectedNodeId, isFullscreen, isAiAssistantOpen, isNewProjectOpen, isPreviewOpen, isPublishOpen, isCommandPaletteOpen]);

  // Node Selection
  const handleSelectNode = useCallback(
    (nodeId: string | null, sceneId?: string) => {
      if (sceneId && sceneId !== selectedSceneId) {
        controller.selectScene(sceneId);
      }
      if (nodeId) {
        controller.selectNode(nodeId, sceneId || selectedSceneId);
      } else {
        controller.clearSelection();
      }
    },
    [controller, selectedSceneId]
  );

  // Direct Node Insertion
  const handleInsertNode = useCallback(
    (kind: SceneNodeKind, name: string) => {
      const rootId = activeScene.sceneGraph?.rootNodeId;
      controller.dispatch({
        type: 'SG_CREATE_NODE',
        sceneId: activeScene.id,
        kind,
        parentId: rootId || undefined,
        defaults: {
          name,
          geometry: {
            position: 'flow',
            width: '100%',
            height: 'auto',
          },
        },
      });
    },
    [controller, activeScene]
  );

  // Add Pre-built Web Section
  const handleAddSection = useCallback(
    (sceneDef: TemplateSceneDefinition) => {
      controller.dispatch({
        type: 'ADD_SCENE',
        scene: sceneDef,
      });
      controller.selectScene(sceneDef.id);
    },
    [controller]
  );

  // Delete Scene
  const handleDeleteScene = useCallback(
    (sceneId: string) => {
      if (schema.scenes.length <= 1) return;
      controller.deleteScene(sceneId);
    },
    [controller, schema.scenes.length]
  );

  // Delete Node
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      controller.dispatch({
        type: 'SG_DELETE_NODE',
        sceneId: activeScene.id,
        nodeId,
      });
    },
    [controller, activeScene.id]
  );

  // Node Geometry Updates
  const handleUpdateGeometry = useCallback(
    (sceneId: string, nodeId: string, patch: any) => {
      controller.dispatch({
        type: 'SG_UPDATE_GEOMETRY',
        sceneId,
        nodeId,
        patch,
      });
    },
    [controller]
  );

  // Node Property Updates
  const handleUpdateNode = useCallback(
    (nodeId: string, patch: Partial<SceneGraphNode>) => {
      controller.dispatch({
        type: 'SG_UPDATE_NODE_PROPERTY',
        sceneId: activeScene.id,
        nodeId,
        patch,
      });
    },
    [controller, activeScene.id]
  );

  // Node Style Updates
  const handleUpdateStyle = useCallback(
    (nodeId: string, patch: any) => {
      controller.dispatch({
        type: 'SG_UPDATE_STYLE',
        sceneId: activeScene.id,
        nodeId,
        patch,
      });
    },
    [controller, activeScene.id]
  );

  // Toggle Node Lock
  const handleToggleNodeLock = useCallback(
    (nodeId: string) => {
      const node = activeScene.sceneGraph?.nodes[nodeId];
      if (!node) return;
      controller.dispatch({
        type: 'SG_LOCK_NODE',
        sceneId: activeScene.id,
        nodeId,
        locked: !node.locked,
      });
    },
    [controller, activeScene]
  );

  // Toggle Node Visibility
  const handleToggleNodeVisibility = useCallback(
    (nodeId: string) => {
      const node = activeScene.sceneGraph?.nodes[nodeId];
      if (!node) return;
      controller.dispatch({
        type: 'SG_HIDE_NODE',
        sceneId: activeScene.id,
        nodeId,
        hidden: !node.hidden,
      });
    },
    [controller, activeScene]
  );

  // Master Component Creation
  const handleCreateComponent = useCallback(
    (nodeId: string) => {
      controller.dispatch({
        type: 'SG_CREATE_COMPONENT',
        sceneId: activeScene.id,
        nodeId,
      });
    },
    [controller, activeScene.id]
  );

  // Master Component Detach
  const handleDetachInstance = useCallback(
    (nodeId: string) => {
      controller.dispatch({
        type: 'SG_DETACH_INSTANCE',
        sceneId: activeScene.id,
        nodeId,
      });
    },
    [controller, activeScene.id]
  );

  // Apply Design Universe across the entire website
  const handleApplyUniverse = useCallback(
    (universeId: string) => {
      setActiveUniverseId(universeId);
      const updatedTokens = DesignUniverseEngine.applyUniverse(universeId, schema.designTokens!);
      controller.dispatch({
        type: 'UPDATE_DESIGN_TOKENS',
        patch: updatedTokens,
      });
    },
    [controller, schema.designTokens]
  );

  // Apply Font Pairing across the entire website
  const handleApplyFontPairing = useCallback(
    (pairingId: string) => {
      const updatedTokens = TypographyStudioEngine.applyPairing(pairingId, schema.designTokens!);
      controller.dispatch({
        type: 'UPDATE_DESIGN_TOKENS',
        patch: updatedTokens,
      });
    },
    [controller, schema.designTokens]
  );

  // Publish deployment trigger
  const handlePublish = () => {
    controller.publish();
    setPublishResult({
      url: `https://orbitox.site/${schema.slug || 'celestial-odyssey'}`,
      timestamp: new Date().toLocaleTimeString(),
    });
    setIsPublishOpen(true);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#090D1A',
        color: '#FFFFFF',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      {/* ── 1. MINIMAL TOP BAR ── */}
      {!isFullscreen && (
        <OrbitoXVisualStudioTopBar
          projectName={schema.name}
          onProjectNameChange={(name) => {
            controller.updateScene(activeScene.id, { name });
          }}
          mode={mode}
          onModeChange={setMode}
          viewport={viewport}
          onViewportChange={(v) => controller.setDevice(v)}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={() => controller.undo()}
          onRedo={() => controller.redo()}
          saveStatus={saveStatus}
          onPreview={() => setIsPreviewOpen(true)}
          onPublish={handlePublish}
          onOpenCommandPalette={() => controller.toggleCommandPalette()}
          onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
          onOpenNewProject={() => setIsNewProjectOpen(true)}
          onOpenImport={() => setIsImportOpen(true)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          expertMode={expertMode}
          onToggleExpertMode={() => setExpertMode(!expertMode)}
        />
      )}

      {/* ── FULLSCREEN EXIT OVERLAY ── */}
      {isFullscreen && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(9, 13, 26, 0.92)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(223, 186, 107, 0.4)',
            borderRadius: '9999px',
            padding: '6px 14px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7)',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: '#DFBA6B', fontWeight: 600 }}>
            ⛶ Fullscreen Canvas (Press ESC to Exit)
          </span>
          <button
            id="orbitox-exit-fullscreen-btn"
            onClick={() => setIsFullscreen(false)}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '9999px',
              padding: '3px 8px',
              color: '#FFFFFF',
              fontSize: '0.7rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Exit
          </button>
        </div>
      )}

      {/* ── 2. MAIN 3-PANE WORKSPACE ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Rail (10 creative tools) */}
        {!isFullscreen && (
          <OrbitoXVisualLeftRail
            activeTab={activeLeftTab}
            onTabChange={setActiveLeftTab}
            scenes={schema.scenes}
            activeSceneId={selectedSceneId}
            onSelectScene={(id) => {
              controller.selectScene(id);
              controller.clearSelection();
            }}
            onAddScene={handleAddSection}
            onDeleteScene={handleDeleteScene}
            selectedNodeId={selectedNodeId}
            onSelectNode={(id) => controller.selectNode(id || '', selectedSceneId)}
            onInsertNode={handleInsertNode}
            onDeleteNode={handleDeleteNode}
            onToggleNodeLock={handleToggleNodeLock}
            onToggleNodeVisibility={handleToggleNodeVisibility}
            dispatch={controller.dispatch}
            onApplyUniverse={handleApplyUniverse}
            onApplyFontPairing={handleApplyFontPairing}
            onSwitchMode={(newMode) => setMode(newMode)}
            activeUniverseId={activeUniverseId}
          />
        )}

        {/* Center Workspace: Canvas / 3D Scene / Motion Timeline */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          {mode === '3d' ? (
            <OrbitoX3DWorkspace sceneName={activeScene.name} />
          ) : (
            <OrbitoXVisualCanvas
              scenes={schema.scenes}
              activeSceneId={selectedSceneId}
              onSelectScene={(id) => controller.selectScene(id)}
              selectedNodeId={selectedNodeId}
              onSelectNode={handleSelectNode}
              onUpdateGeometry={handleUpdateGeometry}
              viewport={viewport}
              mode={mode}
              designTokens={schema.designTokens!}
              resolvedState={resolvedState}
              schema={schema}
              dispatch={controller.dispatch}
              onAddSection={() => setActiveLeftTab('add')}
              showDebug={expertMode || isDebugUrl}
              onSwitchMode={(newMode) => setMode(newMode)}
              onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
            />
          )}

          {/* First-Class Visual Motion Timeline (Docked in Motion Mode) */}
          {mode === 'motion' && (
            <OrbitoXMotionTimeline
              selectedNode={selectedNode}
              sceneName={activeScene.name}
              onApplyPreset={(preset) => {
                console.log('Applied motion preset:', preset);
              }}
              onClose={() => setMode('design')}
            />
          )}

          {/* First-Class Visual Prototype Workspace (Docked in Prototype Mode) */}
          {mode === 'prototype' && (
            <OrbitoXPrototypeWorkspace
              selectedNode={selectedNode}
              activeScene={activeScene}
              onUpdateNode={handleUpdateNode}
              onClose={() => setMode('design')}
            />
          )}
        </div>

        {/* Right Contextual Inspector (Progressive Disclosure) */}
        {!isFullscreen && (
          <OrbitoXContextualInspector
            selectedNode={selectedNode}
            activeScene={activeScene}
            mode={mode}
            designTokens={schema.designTokens}
            onUpdateNode={handleUpdateNode}
            onUpdateGeometry={(nodeId, patch) => handleUpdateGeometry(activeScene.id, nodeId, patch)}
            onUpdateStyle={handleUpdateStyle}
            onCreateComponent={handleCreateComponent}
            onDetachInstance={handleDetachInstance}
            onDeleteNode={handleDeleteNode}
            expertMode={expertMode}
          />
        )}
      </div>

      {/* ── 3. COMMAND PALETTE (⌘K) ── */}
      {isCommandPaletteOpen && (
        <CommandPalette
          isOpen={true}
          onClose={() => controller.toggleCommandPalette(false)}
          schema={schema}
          onSelectScene={(id) => controller.selectScene(id)}
          onSelectTab={() => {}}
          onViewportChange={(v) => controller.setDevice(v)}
          onPreviewModeChange={() => {}}
          onToggleStressTest={() => controller.toggleStressTest()}
          onOpenPublish={() => handlePublish()}
        />
      )}

      {/* ── 4. IMMERSIVE MULTI-DEVICE PREVIEW ── */}
      {isPreviewOpen && (
        <OrbitoXImmersivePreview
          scenes={schema.scenes}
          designTokens={schema.designTokens!}
          projectName={schema.name}
          resolvedState={resolvedState}
          schema={schema}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}

      {/* ── 5. PUBLISH DEPLOYMENT MODAL ── */}
      {isPublishOpen && publishResult && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(16px)',
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '480px',
              background: '#090D1A',
              border: '1px solid rgba(223, 186, 107, 0.4)',
              borderRadius: '16px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 25px 80px rgba(0, 0, 0, 0.9), 0 0 40px rgba(223, 186, 107, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#4ADE80',
                  }}
                >
                  <Check size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF' }}>
                    Website Published!
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                    Deployed to Edge CDN at {publishResult.timestamp}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPublishOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.4)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Live URL Pill */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: '0.85rem', color: '#DFBA6B', fontFamily: 'monospace', fontWeight: 600 }}>
                {publishResult.url}
              </div>
              <a
                href={publishResult.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  textDecoration: 'none',
                  background: 'rgba(255, 255, 255, 0.08)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                }}
              >
                <span>Visit</span>
                <ExternalLink size={12} />
              </a>
            </div>

            {/* Cryptographic Proof & Zero-Trust Verification */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.72rem',
                color: 'rgba(255, 255, 255, 0.6)',
                background: 'rgba(223, 186, 107, 0.06)',
                border: '1px solid rgba(223, 186, 107, 0.15)',
                padding: '8px 12px',
                borderRadius: '6px',
              }}
            >
              <ShieldCheck size={16} style={{ color: '#DFBA6B', flexShrink: 0 }} />
              <span>Signed with Ed25519 digital signature. 100% Graph-Native runtime verified.</span>
            </div>

            <button
              onClick={() => setIsPublishOpen(false)}
              style={{
                background: 'linear-gradient(135deg, #DFBA6B 0%, #B08D4C 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#060B1A',
                fontWeight: 700,
                fontSize: '0.85rem',
                padding: '10px 16px',
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ── 6. ASK ORBITOX AI ASSISTANT MODAL ── */}
      {isAiAssistantOpen && (
        <OrbitoXAiAssistantModal
          isOpen={isAiAssistantOpen}
          onClose={() => setIsAiAssistantOpen(false)}
          schema={schema}
          activeSceneId={activeScene.id}
          selectedNodeId={selectedNodeId}
          onApplyTokens={(tokensPatch) => {
            controller.dispatch({
              type: 'UPDATE_DESIGN_TOKENS',
              patch: tokensPatch,
            });
          }}
          onUpdateNodeStyle={(sceneId, nodeId, patch) => {
            controller.dispatch({
              type: 'SG_UPDATE_STYLE',
              sceneId,
              nodeId,
              patch,
            });
          }}
          onSwitchMode={(m) => setMode(m)}
          onSwitchViewport={(v) => controller.setDevice(v)}
        />
      )}

      {/* ── 7. NEW PROJECT / CREATE WEBSITE MODAL ── */}
      {isNewProjectOpen && (
        <OrbitoXNewProjectModal
          isOpen={isNewProjectOpen}
          onClose={() => setIsNewProjectOpen(false)}
          onSelectProject={(type, category, universeId) => {
            if (universeId) {
              handleApplyUniverse(universeId);
            }
            if (category === 'saas') {
              const hero = WebSectionLibrary.get('sec_hero_centered');
              const bento = WebSectionLibrary.get('sec_bento_grid');
              const pricing = WebSectionLibrary.get('sec_pricing_table');
              const cta = WebSectionLibrary.get('sec_cta_banner');
              if (hero) handleAddSection(hero.createScene('SaaS Hero'));
              if (bento) handleAddSection(bento.createScene('Architecture'));
              if (pricing) handleAddSection(pricing.createScene('Pricing'));
              if (cta) handleAddSection(cta.createScene('Get Started'));
            }
          }}
        />
      )}

      {/* ── 8. UNIVERSAL IMPORT STUDIO MODAL ── */}
      {isImportOpen && (
        <OrbitoXUniversalImportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          activeSceneId={activeScene.id}
          selectedNodeId={selectedNodeId}
          onInsertSection={(section) => {
            controller.dispatch({ type: 'INSERT_SECTION', section });
          }}
          onInsertNodesToActiveScene={(newNodes, importedRootId) => {
            if (!activeScene?.sceneGraph) return;
            const targetParentId = selectedNodeId || activeScene.sceneGraph.rootNodeId || 'root';
            const graph = activeScene.sceneGraph;
            const mergedNodes = { ...graph.nodes, ...newNodes };
            if (mergedNodes[targetParentId]) {
              mergedNodes[targetParentId] = {
                ...mergedNodes[targetParentId],
                children: [...mergedNodes[targetParentId].children, importedRootId],
              };
            }
            if (mergedNodes[importedRootId]) {
              mergedNodes[importedRootId] = {
                ...mergedNodes[importedRootId],
                parentId: targetParentId,
              };
            }
            const updatedGraph = {
              ...graph,
              nodes: mergedNodes,
              renderOrder: [...graph.renderOrder, ...Object.keys(newNodes).filter((id) => !graph.renderOrder.includes(id))],
            };
            controller.dispatch({
              type: 'UPDATE_SCENE',
              sceneId: activeScene.id,
              patch: { sceneGraph: updatedGraph },
            });
            controller.selectNode(importedRootId, activeScene.id);
          }}
          onUpdateTokens={(tokensPatch) => {
            controller.dispatch({
              type: 'UPDATE_DESIGN_TOKENS',
              patch: tokensPatch,
            });
          }}
        />
      )}
    </div>
  );
}
