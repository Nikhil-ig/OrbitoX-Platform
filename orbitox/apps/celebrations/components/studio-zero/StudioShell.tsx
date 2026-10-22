'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import './tokens.css';
import './studio.css';
import {
  TemplateSchema,
  DeviceBreakpoint,
  TemplateSceneDefinition,
  TemplatePageDefinition,
  TemplateDesignTokens,
} from '@/components/template-studio/types/TemplateSchema';
import { TemplateSchemaService } from '@/components/template-studio/services/TemplateSchemaService';
import {
  TemplateEditorProvider,
  useTemplateEditor,
} from '@/components/template-studio/engine';
import { SceneNodeKind, SceneGraphNode } from '@/components/template-studio/engine/SceneGraphTypes';
import { DesignUniverseEngine } from '@/components/template-studio/engine/DesignUniverses';
import { TypographyStudioEngine } from '@/components/template-studio/engine/TypographyStudio';
import { WebSectionLibrary } from '@/components/template-studio/engine/WebSectionLibrary';
import { CommandPalette } from '@/components/template-studio/components/CommandPalette';
import { TemplateFactory } from '@/components/template-studio/engine/TemplateFactory';
import { getTemplateBlueprint } from '@/components/template-studio/blueprints';
import { TemplateContentMigrator } from '@/components/template-studio/engine/TemplateContentMigrator';
import { AIDesignEngine } from '@/components/template-studio/engine/AIDesignEngine';
import { ProductionEdgeExporter } from '@/components/template-studio/services/ProductionEdgeExporter';
import { FileUploadService } from '@/components/template-studio/services/FileUploadService';
import { StyleResolver } from '@/components/template-studio/engine/StyleResolver';

// Studio 2.0 Types
import { StudioMode, StudioTemplateMeta, ProjectPerformanceStats } from './types';

// Studio 2.0 Components
import { StudioTopBar } from './StudioTopBar';
import { StudioRail, StudioRailTab } from './StudioRail';
import { CanvasWorkspace } from './CanvasWorkspace';
import { InspectorHost } from './inspectors';
import { LibraryDrawer } from './LibraryDrawer';
import { LayersPanel } from './LayersPanel';
import { PageTreePanel } from './navigation/PageTreePanel';
import { PagesPanel } from './PagesPanel';
import { AssetsPanel } from './AssetsPanel';
import { ComponentsPanel } from './ComponentsPanel';
import { StylesPanel } from './StylesPanel';
import { DataPanel } from './DataPanel';
import { TemplatePanel } from './TemplatePanel';
import { MotionWorkspace } from './MotionWorkspace';
import { PrototypeWorkspace } from './PrototypeWorkspace';
import { ThreeDWorkspace } from './ThreeDWorkspace';
import { BottomContextBar } from './BottomContextBar';

// Studio 2.0 Modals
import { StudioPublishModal } from './StudioPublishModal';
import { StudioPreviewModal } from './StudioPreviewModal';
import { StudioAiModal } from './StudioAiModal';
import { StudioRemixModal } from './StudioRemixModal';
import { StudioShortcutsModal } from './StudioShortcutsModal';
import { TemplateBrowserModal } from './TemplateBrowserModal';
import { PerformanceModal } from './PerformanceModal';
import { OrbitoXUniversalImportModal } from '@/components/template-studio/components/OrbitoXUniversalImportModal';
import { GlobalDropzoneOverlay } from './GlobalDropzoneOverlay';
import { UniversalAddCommandCenter } from './UniversalAddCommandCenter';
import { TemplateMarketplaceModal } from './TemplateMarketplaceModal';
import { AssetIngestionService } from '../template-studio/services/AssetIngestionService';

export function StudioShell({ slug }: { slug?: string } = {}) {
  const searchParams = useSearchParams();
  const templateSlug = useMemo(() => {
    if (slug) return slug;
    const urlSlug = searchParams.get('template') || searchParams.get('slug');
    if (urlSlug) return urlSlug;
    if (typeof window !== 'undefined') {
      const lastActive = localStorage.getItem('orbitox_last_active_slug');
      if (lastActive) return lastActive;
    }
    return 'celestial-odyssey';
  }, [slug, searchParams]);

  const initialSchema = useMemo(() => {
    return TemplateSchemaService.getSchema(templateSlug);
  }, [templateSlug]);

  return (
    <TemplateEditorProvider key={templateSlug} initialSchema={initialSchema}>
      <StudioShellContent templateSlug={templateSlug} />
    </TemplateEditorProvider>
  );
}

function StudioShellContent({ templateSlug }: { templateSlug: string }) {
  const { state, controller, store } = useTemplateEditor();

  // Mode: Build | Style | Motion | Prototype | 3D
  const [mode, setMode] = useState<StudioMode>('build');

  // Sync active slug to localStorage & URL
  useEffect(() => {
    if (typeof window !== 'undefined' && state.draft.schema?.slug) {
      localStorage.setItem('orbitox_last_active_slug', state.draft.schema.slug);
      const url = new URL(window.location.href);
      if (url.searchParams.get('template') !== state.draft.schema.slug) {
        url.searchParams.set('template', state.draft.schema.slug);
        window.history.replaceState(null, '', url.toString());
      }
    }
  }, [state.draft.schema?.slug]);

  // Keep local mode & viewport in sync with store if dispatched via controller
  useEffect(() => {
    const validModes: StudioMode[] = ['build', 'style', 'motion', 'prototype', '3d'];
    if (state.ui.mode && validModes.includes(state.ui.mode as any) && state.ui.mode !== (mode as any)) {
      setMode(state.ui.mode as StudioMode);
    }
  }, [state.ui.mode, mode]);

  // Expose studio controller and store for programmatic test suites & Playwright
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__studioController = controller;
      (window as any).__studioStore = store;
      (window as any).__studioMigrator = TemplateContentMigrator;
      (window as any).__studioFileUploadService = FileUploadService;
      (window as any).__studioStyleResolver = StyleResolver;
      (window as any).__studioProductionEdgeExporter = ProductionEdgeExporter;
      (window as any).__studioAIDesignEngine = AIDesignEngine;
      (window as any).__studioSetMode = setMode;
      (window as any).__studioSetViewport = (dev: any) => controller.setDevice(dev);
    }
  }, [controller, store, setMode]);

  // Left Rail Tab (starts collapsed so canvas is spacious and dominant)
  const [activeRailTab, setActiveRailTab] = useState<StudioRailTab | null>(null);

  // Fullscreen Canvas mode
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Active Design Universe
  const [activeUniverseId, setActiveUniverseId] = useState<string>('celestial');

  // Modals state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isRemixOpen, setIsRemixOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isTemplateBrowserOpen, setIsTemplateBrowserOpen] = useState(false);
  const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCommandCenterOpen, setIsCommandCenterOpen] = useState(false);
  const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false);

  // P18: Section Insertion & Undo Toast State
  const [targetInsertPosition, setTargetInsertPosition] = useState<number | undefined>(undefined);
  const [undoToast, setUndoToast] = useState<{ message: string; timestamp: number } | null>(null);

  // Zoom level
  const [zoom, setZoom] = useState<number>(0.88);

  // Schema & Editor State
  const schema = state.draft.schema;
  const resolvedState = state.runtime.resolvedSnapshot;
  const viewport = state.ui.activeDevice;
  const selectedSceneId = state.ui.selection.sceneId || schema.scenes[0]?.id || '';
  const selectedNodeId = state.ui.selection.nodeId;
  const selectedNodeIds = state.ui.selection.nodeIds || (selectedNodeId ? [selectedNodeId] : []);
  const isCommandPaletteOpen = state.ui.isCommandPaletteOpen;
  const saveStatus = state.persistence.status === 'error' ? 'unsaved' : state.persistence.status;
  const canUndo = state.history.past.length > 0;
  const canRedo = state.history.future.length > 0;

  // P18: First-Class Website Project Pages & Active Page
  const pages: TemplatePageDefinition[] = useMemo(() => {
    if (schema.pages && schema.pages.length > 0) return schema.pages;
    return [
      {
        id: 'page_home',
        name: 'Home',
        route: '/',
        sectionIds: (schema.scenes || []).map((s: TemplateSceneDefinition) => s.id),
        isHome: true,
      },
    ];
  }, [schema.pages, schema.scenes]);

  const activePageId = state.ui.activePageId || pages[0]?.id || 'page_home';
  const activePage = useMemo(() => {
    return pages.find((p) => p.id === activePageId) || pages[0];
  }, [pages, activePageId]);

  // Active page's ordered sections rendered in continuous canvas
  const activePageSections: TemplateSceneDefinition[] = useMemo(() => {
    // If schema explicitly defines pages, strictly obey the active page's sectionIds
    if (schema.pages && schema.pages.length > 0) {
      if (!activePage || !activePage.sectionIds) return [];
      const map = new Map((schema.scenes || []).map((s: TemplateSceneDefinition) => [s.id, s]));
      return activePage.sectionIds.map((id) => map.get(id)).filter(Boolean) as TemplateSceneDefinition[];
    }
    // Fallback for single-page templates without pages definition
    return schema.scenes || [];
  }, [schema.pages, schema.scenes, activePage]);

  // Active scene
  const activeScene: TemplateSceneDefinition = useMemo(() => {
    return (
      schema.scenes.find((s: TemplateSceneDefinition) => s.id === selectedSceneId) ||
      activePageSections[0] ||
      schema.scenes[0]
    )!;
  }, [schema.scenes, selectedSceneId, activePageSections]);

  // Selected node
  const selectedNode: SceneGraphNode | null = useMemo(() => {
    if (!selectedNodeId) return null;
    if (activeScene?.sceneGraph?.nodes?.[selectedNodeId]) {
      return activeScene.sceneGraph.nodes[selectedNodeId];
    }
    for (const s of schema.scenes) {
      if (s.sceneGraph?.nodes?.[selectedNodeId]) {
        return s.sceneGraph.nodes[selectedNodeId];
      }
    }
    return null;
  }, [schema.scenes, activeScene, selectedNodeId]);

  // Ensure Google Fonts are loaded immediately on mount (Zero-FOUT)
  useEffect(() => {
    TypographyStudioEngine.ensureGoogleFontsLoaded();
  }, []);

  // Keyboard Shortcuts (⌘Z, ⇧⌘Z, ⌘K, ⌘D, Delete, F, Arrow keys, Esc)
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
      // Escape: Deselect or exit fullscreen/modals
      if (e.key === 'Escape') {
        setIsFullscreen(false);
        setIsAiModalOpen(false);
        setIsPreviewOpen(false);
        setIsPublishOpen(false);
        setIsRemixOpen(false);
        setIsShortcutsOpen(false);
        setIsPerformanceModalOpen(false);
        setIsCommandCenterOpen(false);
        setIsMarketplaceOpen(false);
        if (isCommandPaletteOpen) controller.toggleCommandPalette(false);
        controller.clearSelection();
      }
      // ⌘K or 'A': Toggle Universal Add Command Center
      if (
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') ||
        ((e.key === 'a' || e.key === 'A') &&
          !e.metaKey &&
          !e.ctrlKey &&
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA' &&
          !document.activeElement?.getAttribute('contenteditable'))
      ) {
        e.preventDefault();
        setIsCommandCenterOpen((prev) => !prev);
      }
      // F key: Toggle Fullscreen Canvas (when not typing)
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
      // Delete / Backspace: Delete selected node
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
      // Arrow keys: Nudge selected node
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
          const curX =
            typeof node.geometry?.x === 'number'
              ? node.geometry.x
              : parseFloat(String(node.geometry?.x || 0));
          const curY =
            typeof node.geometry?.y === 'number'
              ? node.geometry.y
              : parseFloat(String(node.geometry?.y || 0));
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
  }, [
    controller,
    activeScene,
    selectedNodeId,
    isFullscreen,
    isAiModalOpen,
    isPreviewOpen,
    isPublishOpen,
    isRemixOpen,
    isShortcutsOpen,
    isPerformanceModalOpen,
    isCommandPaletteOpen,
  ]);

  // Node Selection Handlers
  const handleSelectNode = useCallback(
    (nodeId: string | null, sceneId?: string) => {
      if (nodeId) {
        controller.selectNode(nodeId, sceneId || selectedSceneId);
      } else {
        controller.clearSelection();
      }
    },
    [controller, selectedSceneId]
  );

  const handleSelectNodes = useCallback(
    (nodeIds: string[], sceneId?: string) => {
      if (nodeIds.length > 0) {
        controller.selectNodes(nodeIds, sceneId || selectedSceneId);
      } else {
        controller.clearSelection();
      }
    },
    [controller, selectedSceneId]
  );

  // Direct Node Insertion
  const handleInsertNode = useCallback(
    (kind: SceneNodeKind, name: string, defaults?: any) => {
      const currentState = store?.getState ? store.getState() : state;
      const currentSelectedSceneId = currentState.ui?.selection?.sceneId || selectedSceneId;
      const targetScene =
        (currentSelectedSceneId && schema.scenes.find((s) => s.id === currentSelectedSceneId)) ||
        activePageSections[0] ||
        schema.scenes[0];

      if (!targetScene) {
        console.warn('[handleInsertNode] No target scene available for node insertion.');
        return;
      }

      const rootId = targetScene.sceneGraph?.rootNodeId;
      controller.dispatch({
        type: 'SG_CREATE_NODE',
        sceneId: targetScene.id,
        kind,
        parentId: rootId || undefined,
        defaults: defaults || {
          name,
          geometry: {
            position: 'flow',
            width: '100%',
            height: 'auto',
          },
        },
      });
    },
    [controller, store, state, selectedSceneId, schema.scenes, activePageSections]
  );

  // Add Section (Supports targeted position insertion without destroying page)
  const handleAddSection = useCallback(
    (sceneDef: TemplateSceneDefinition, position?: number) => {
      const pos = position !== undefined ? position : targetInsertPosition;
      controller.insertSection(sceneDef, pos);
      setTargetInsertPosition(undefined);
    },
    [controller, targetInsertPosition]
  );

  // Delete Section with Undo Toast (Prompt #9)
  const handleDeleteScene = useCallback(
    (sceneId: string) => {
      if (schema.scenes.length <= 1) return;
      controller.deleteSection(sceneId);
      setUndoToast({ message: 'Section deleted', timestamp: Date.now() });
    },
    [controller, schema.scenes.length]
  );

  // Duplicate Section (Prompt #8)
  const handleDuplicateScene = useCallback(
    (sceneId: string) => {
      controller.duplicateSection(sceneId);
    },
    [controller]
  );

  // Move Section Up / Down / Reorder
  const handleMoveSection = useCallback(
    (sceneId: string, direction?: 'up' | 'down', targetIndex?: number) => {
      controller.moveSection(sceneId, direction, targetIndex);
    },
    [controller]
  );

  // Swap Section Variant (P16.1 Phase 2)
  const handleSwapSectionVariant = useCallback(
    (sectionId: string, variantBlockId: string) => {
      controller.swapSectionVariant(sectionId, variantBlockId);
    },
    [controller]
  );

  // Reorder Sections
  const handleReorderScenes = useCallback(
    (fromIndex: number, toIndex: number) => {
      controller.dispatch({
        type: 'REORDER_SCENES',
        sourceIndex: fromIndex,
        targetIndex: toIndex,
      });
    },
    [controller]
  );

  // Rename Section
  const handleRenameScene = useCallback(
    (sceneId: string, newName: string) => {
      controller.updateScene(sceneId, { name: newName });
    },
    [controller]
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

  // Duplicate Node
  const handleDuplicateNode = useCallback(
    (nodeId: string) => {
      controller.dispatch({
        type: 'SG_DUPLICATE_NODE',
        sceneId: activeScene.id,
        nodeId,
      });
    },
    [controller, activeScene.id]
  );

  // Reorder Node Up / Down
  const handleReorderNode = useCallback(
    (nodeId: string, direction: 'up' | 'down') => {
      controller.dispatch({
        type: 'SG_REORDER_NODE',
        sceneId: activeScene.id,
        nodeId,
        direction,
      });
    },
    [controller, activeScene.id]
  );

  // Rename Node
  const handleRenameNode = useCallback(
    (nodeId: string, newName: string) => {
      controller.dispatch({
        type: 'SG_UPDATE_NODE_PROPERTY',
        sceneId: activeScene.id,
        nodeId,
        patch: { name: newName },
      });
    },
    [controller, activeScene.id]
  );

  // Geometry Updates
  const handleUpdateGeometry = useCallback(
    (sceneId: string, nodeId: string, patch: any) => {
      if (viewport === 'desktop') {
        controller.dispatch({
          type: 'SG_UPDATE_GEOMETRY',
          sceneId,
          nodeId,
          patch,
        });
      } else {
        controller.dispatch({
          type: 'SG_SET_RESPONSIVE_OVERRIDE',
          sceneId,
          nodeId,
          device: viewport,
          patch: { geometry: patch, ...patch },
        });
      }
    },
    [controller, viewport]
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
      if (viewport === 'desktop') {
        controller.dispatch({
          type: 'SG_UPDATE_STYLE',
          sceneId: activeScene.id,
          nodeId,
          patch,
        });
      } else {
        controller.dispatch({
          type: 'SG_SET_RESPONSIVE_OVERRIDE',
          sceneId: activeScene.id,
          nodeId,
          device: viewport,
          patch: { style: patch, ...patch },
        });
      }
    },
    [controller, activeScene.id, viewport]
  );

  // Reset Node Responsive Override
  const handleResetResponsiveOverride = useCallback(
    (nodeId: string, device: DeviceBreakpoint, propertyKey?: string) => {
      controller.dispatch({
        type: 'SG_RESET_RESPONSIVE_OVERRIDE',
        sceneId: activeScene.id,
        nodeId,
        device,
        propertyKey,
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

  // Master Components & Instance Overrides (P16.1 Phase 4)
  const handleCreateComponent = useCallback(
    (nodeId: string, name?: string) => {
      controller.createComponent(nodeId, name);
    },
    [controller]
  );

  const handleInstantiateComponent = useCallback(
    (masterId: string, targetParentId?: string) => {
      controller.instantiateComponent(masterId, targetParentId);
    },
    [controller]
  );

  const handleResetOverrides = useCallback(
    (instanceNodeId: string, propertyKey?: string) => {
      controller.resetInstanceOverrides(instanceNodeId, propertyKey);
    },
    [controller]
  );

  const handlePushToMaster = useCallback(
    (instanceNodeId: string) => {
      controller.pushInstanceToMaster(instanceNodeId);
    },
    [controller]
  );

  const handleDetachInstance = useCallback(
    (nodeId: string) => {
      controller.detachInstance(nodeId);
    },
    [controller]
  );

  const handleDeleteMasterComponent = useCallback(
    (masterComponentId: string) => {
      controller.deleteMasterComponent(masterComponentId);
    },
    [controller]
  );

  // Apply Design Universe across the document
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

  // Apply Font Pairing across the document
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

  // Update Design Tokens Directly
  const handleUpdateDesignTokens = useCallback(
    (patch: Partial<TemplateDesignTokens>) => {
      controller.dispatch({
        type: 'UPDATE_DESIGN_TOKENS',
        patch,
      });
    },
    [controller]
  );

  // Execute Quick AI Commands
  const handleExecuteAiCommand = useCallback(
    (cmd: string, targetId?: string) => {
      const targetNodeId = targetId || selectedNodeId;
      
      // Generate deterministic execution plan from AIDesignEngine
      const plan = AIDesignEngine.planPrompt(cmd, schema, targetNodeId, activeScene.id);

      controller.dispatch({ type: 'BEGIN_TRANSACTION', label: `AI: ${cmd.substring(0, 30)}` });

      if (plan.themeUniverse) {
        handleApplyUniverse(plan.themeUniverse);
      }

      if (cmd.includes('3D') || cmd.includes('3d')) {
        setMode('3d');
      }

      if (plan.tokensPatch) {
        controller.dispatch({
          type: 'UPDATE_DESIGN_TOKENS',
          patch: plan.tokensPatch,
        });
      }

      // Apply node patches
      plan.nodePatches.forEach(({ nodeId, sceneId, patch }) => {
        if (patch.style) {
          controller.dispatch({
            type: 'SG_UPDATE_STYLE',
            sceneId,
            nodeId,
            patch: patch.style,
          });
        }
        if (patch.geometry) {
          controller.dispatch({
            type: 'SG_UPDATE_GEOMETRY',
            sceneId,
            nodeId,
            patch: patch.geometry,
          });
        }
        const nodePropPatch: any = {};
        if (patch.props) nodePropPatch.props = patch.props;
        if (patch.name) nodePropPatch.name = patch.name;
        if (patch.motion) nodePropPatch.motion = patch.motion;
        if (patch.layoutConfig) nodePropPatch.layoutConfig = patch.layoutConfig;
        if (patch.responsive) nodePropPatch.responsive = patch.responsive;

        if (Object.keys(nodePropPatch).length > 0) {
          controller.dispatch({
            type: 'SG_UPDATE_NODE_PROPERTY',
            sceneId,
            nodeId,
            patch: nodePropPatch,
          });
        }
      });

      controller.dispatch({ type: 'COMMIT_TRANSACTION' });
    },
    [selectedNodeId, schema, activeScene.id, controller, handleApplyUniverse]
  );

  // Apply Section Remix Art Direction
  const handleApplyRemix = useCallback(
    (remixId: string) => {
      handleApplyUniverse(remixId);
    },
    [handleApplyUniverse]
  );

  // Mode Change Handler
  const handleModeChange = useCallback(
    (newMode: StudioMode) => {
      setMode(newMode);
    },
    []
  );

  // Performance Stats Calculation
  const performanceStats: ProjectPerformanceStats = useMemo(() => {
    let nodesCount = 0;
    let imageCount = 0;
    let videoCount = 0;
    let meshCount = 0;
    let animationCount = 0;
    schema.scenes.forEach((sc: TemplateSceneDefinition) => {
      const nodes = Object.values(sc.sceneGraph?.nodes || {});
      nodesCount += nodes.length;
      nodes.forEach((n: SceneGraphNode) => {
        if (n.kind === 'image') imageCount++;
        if (n.kind === 'video') videoCount++;
        if (n.kind === 'interactive_object' || (n.kind as string) === 'threed') meshCount++;
        if (n.motion || (n.style as any)?.animation) animationCount++;
      });
    });
    let schemaAssetBytes = 0;
    if (schema.assets && Array.isArray(schema.assets)) {
      schema.assets.forEach((a: any) => {
        if (a.sizeBytes) schemaAssetBytes += a.sizeBytes;
      });
    }
    const imgKb = schemaAssetBytes > 0 ? Math.round(schemaAssetBytes / 1024) : (imageCount > 0 ? imageCount * 180 : 0);
    const vidKb = videoCount * 1200;
    const meshKb = (mode === '3d' || meshCount > 0) ? 450 : 0;
    let score = 100;
    if (nodesCount > 250) score -= 10;
    else if (nodesCount > 150) score -= 5;
    if (imgKb > 5000) score -= 12;
    else if (imgKb > 2500) score -= 6;
    if (vidKb > 10000) score -= 10;
    return {
      score: Math.max(20, score),
      rating: score >= 90 ? 'Optimal' : score >= 75 ? 'Good' : 'Moderate',
      totalNodes: nodesCount,
      imageWeightKb: imgKb,
      videoWeightKb: vidKb,
      meshWeightKb: meshKb,
      animationTracksCount: animationCount,
      estimatedMobileFps: score >= 90 ? 60 : score >= 75 ? 55 : 45,
      recommendations: [
        'All scenes compiled to clean static virtual DOM',
        mode === '3d' ? '3D spatial runtime loaded on demand' : '3D runtime lazy-loaded (zero mobile cost)',
        'Cryptographic Ed25519 signatures ready for Edge CDN distribution',
      ],
    };
  }, [schema, mode]);

  // P18: Template Operations (Prompts #17, #18, #19, #20, #21)
  const instantiateTemplateSchema = useCallback((tmpl: StudioTemplateMeta): TemplateSchema => {
    const fullSchema = getTemplateBlueprint(tmpl.id || tmpl.factoryKey || tmpl.category || tmpl.name);
    fullSchema.name = tmpl.name || fullSchema.name;
    if (tmpl.initialTokens) {
      fullSchema.designTokens = {
        ...fullSchema.designTokens,
        ...tmpl.initialTokens,
        colors: {
          ...(fullSchema.designTokens?.colors || {}),
          ...(tmpl.initialTokens.colors || {}),
        },
      } as any;
    }
    return fullSchema;
  }, []);

  // Replace Entire Site atomically with chosen template (Non-Destructive Content Migration or Fresh Template)
  const handleReplaceSite = useCallback(
    (tmpl: StudioTemplateMeta, preserveContent = false) => {
      // 1. Save an immediate backup snapshot of current draft
      controller.saveImmediate();

      const rawSchema = instantiateTemplateSchema(tmpl);
      rawSchema.slug = templateSlug;

      let fullSchema = rawSchema;
      if (preserveContent) {
        // Extract existing content from current project and inject into new template slots
        const existingContent = TemplateContentMigrator.extractContent(schema);
        fullSchema = TemplateContentMigrator.migrateInto(rawSchema, existingContent);
      }

      controller.replaceProject(fullSchema);
      controller.saveImmediate();
      setIsTemplateBrowserOpen(false);
      setActiveRailTab(null);
    },
    [controller, instantiateTemplateSchema, templateSlug, schema]
  );

  // Navigate to or bootstrap a new project cleanly from chosen template
  const handleNewFromTemplate = useCallback((tmpl: StudioTemplateMeta) => {
    window.location.href = `/admin/template-studio?template=${tmpl.id}`;
  }, []);

  // Add a Section from template without replacing page or theme (Prompt #20)
  const handleAddTemplateSection = useCallback(
    (tmpl: StudioTemplateMeta) => {
      const fullSchema = instantiateTemplateSchema(tmpl);
      const sectionToAdd = fullSchema.scenes[0];
      if (sectionToAdd) {
        controller.addTemplateSection(sectionToAdd);
      }
      setIsTemplateBrowserOpen(false);
      setActiveRailTab(null);
    },
    [controller, instantiateTemplateSchema]
  );

  // Apply Theme Only without modifying content (Prompt #21)
  const handleApplyTemplateTheme = useCallback(
    (tmpl: StudioTemplateMeta) => {
      if (tmpl.initialTokens) {
        controller.applyTheme(undefined, tmpl.initialTokens);
      }
      setIsTemplateBrowserOpen(false);
    },
    [controller]
  );

  // Publish
  const handlePublish = () => {
    controller.publish();
    setIsPublishOpen(true);
  };

  return (
    <div
      className="orbitox-studio-zero"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#0C0D10',
        color: '#F3F4F6',
        position: 'fixed',
        inset: 0,
      }}
    >
      {/* ── 1. MINIMAL TOP TOOLBAR ── */}
      {!isFullscreen && (
        <StudioTopBar
          projectName={schema.name}
          onProjectNameChange={(name) => controller.updateScene(activeScene.id, { name })}
          mode={mode}
          onModeChange={handleModeChange}
          viewport={viewport}
          onViewportChange={(v) => controller.setDevice(v)}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={() => controller.undo()}
          onRedo={() => controller.redo()}
          saveStatus={saveStatus}
          onPreview={() => setIsPreviewOpen(true)}
          onShare={() => {}}
          onPublish={handlePublish}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          onOpenCommandPalette={() => controller.toggleCommandPalette()}
          onOpenAi={() => setIsAiModalOpen(true)}
          onOpenImport={() => setIsImportOpen(true)}
          onOpenTemplates={() => setIsMarketplaceOpen(true)}
          onOpenPerformance={() => setIsPerformanceModalOpen(true)}
          performanceScore={performanceStats.score}
          zoom={zoom}
          onZoomChange={setZoom}
          onResetFit={() => setZoom(0.88)}
        />
      )}

      {/* ── 2. MAIN 3-PANE WORKSPACE ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Left Tool Rail (50px icon rail) */}
        {!isFullscreen && (
          <StudioRail
            activeTab={activeRailTab}
            onTabChange={setActiveRailTab}
            onOpenAi={() => setIsAiModalOpen(true)}
            onOpenShortcuts={() => setIsShortcutsOpen(true)}
            onOpenMarketplace={() => setIsMarketplaceOpen(true)}
            onOpenCommandCenter={() => setIsCommandCenterOpen(true)}
          />
        )}

        {/* Contextual Left Drawer (Opens when activeRailTab is selected, collapses when clicked again) */}
        {!isFullscreen && activeRailTab === 'templates' && (
          <TemplatePanel
            onClose={() => setActiveRailTab(null)}
            onSelectTemplate={handleReplaceSite}
            onOpenFullBrowser={() => setIsTemplateBrowserOpen(true)}
          />
        )}
        {!isFullscreen && activeRailTab === 'add' && (
          <LibraryDrawer
            onInsertNode={handleInsertNode}
            onAddSection={handleAddSection}
            targetInsertPosition={targetInsertPosition}
            onClose={() => {
              setActiveRailTab(null);
              setTargetInsertPosition(undefined);
            }}
          />
        )}
        {!isFullscreen && activeRailTab === 'layers' && (
          <LayersPanel
            scenes={schema.scenes || []}
            sceneGraph={activeScene?.sceneGraph}
            activeSceneId={selectedSceneId}
            onSelectScene={(id) => controller.selectScene(id)}
            selectedNodeId={selectedNodeId}
            onSelectNode={(nodeId) => {
              if (nodeId) handleSelectNode(nodeId);
              else controller.clearSelection();
            }}
            onToggleLock={(nodeId) => handleToggleNodeLock(nodeId)}
            onToggleHide={(nodeId) => handleToggleNodeVisibility(nodeId)}
            onDuplicateNode={(nodeId) => handleDuplicateNode(nodeId)}
            onDeleteNode={(nodeId) => handleDeleteNode(nodeId)}
            onRenameNode={(nodeId, name) => controller.updateNode(nodeId, { name })}
            onReorderNode={(nodeId, dir) => {
              if (activeScene?.sceneGraph) {
                const node = activeScene.sceneGraph.nodes[nodeId];
                if (node?.parentId) {
                  const parent = activeScene.sceneGraph.nodes[node.parentId];
                  if (parent) {
                    const idx = parent.children.indexOf(nodeId);
                    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
                    if (targetIdx >= 0 && targetIdx < parent.children.length) {
                      controller.dispatch({
                        type: 'SG_REORDER',
                        sceneId: activeScene.id,
                        parentId: parent.id,
                        fromIndex: idx,
                        toIndex: targetIdx,
                      });
                    }
                  }
                }
              }
            }}
            onClose={() => setActiveRailTab(null)}
          />
        )}
        {!isFullscreen && activeRailTab === 'pages' && (
          <PagesPanel
            pages={pages}
            activePageId={activePageId}
            onSelectPage={(id) => controller.switchPage(id)}
            onCreatePage={(name, route) => controller.createPage(name, route)}
            onDeletePage={(id) => controller.deletePage(id)}
            onRenamePage={(id, name, route) => controller.renamePage(id, name, route)}
            onDuplicatePage={(id) => controller.duplicatePage(id)}
            sections={activePageSections}
            activeSceneId={selectedSceneId}
            onSelectScene={(id) => {
              controller.selectScene(id);
              controller.clearSelection();
            }}
            onAddSection={(pos) => {
              setTargetInsertPosition(pos);
              setActiveRailTab('add');
            }}
            onMoveSection={handleMoveSection}
            onReorderSections={handleReorderScenes}
            onDeleteSection={handleDeleteScene}
            onDuplicateSection={handleDuplicateScene}
            onClose={() => setActiveRailTab(null)}
          />
        )}
        {!isFullscreen && activeRailTab === 'assets' && (
          <AssetsPanel
            assets={schema.assets || []}
            onCreateAsset={(asset) => controller.createAsset(asset)}
            onDeleteAsset={(assetId) => controller.deleteAsset(assetId)}
            onInsertNode={handleInsertNode}
            onReplaceImage={(url, assetId) => {
              if (selectedNodeId) {
                handleUpdateNode(selectedNodeId, {
                  src: url,
                  imageUrl: url,
                  smartProps: { ...(selectedNode?.smartProps || {}), url, src: url, assetId },
                } as any);
              }
            }}
            selectedNodeKind={selectedNode?.kind}
            onClose={() => setActiveRailTab(null)}
          />
        )}
        {!isFullscreen && activeRailTab === 'components' && (
          <ComponentsPanel
            selectedNodeId={selectedNodeId}
            selectedNode={selectedNode}
            selectedNodeKind={selectedNode?.kind}
            masterComponents={schema.masterComponents || {}}
            onCreateComponent={handleCreateComponent}
            onInstantiateComponent={handleInstantiateComponent}
            onResetOverrides={handleResetOverrides}
            onPushToMaster={handlePushToMaster}
            onDetachInstance={handleDetachInstance}
            onDeleteMasterComponent={handleDeleteMasterComponent}
            onInsertNode={handleInsertNode}
            onClose={() => setActiveRailTab(null)}
          />
        )}
        {!isFullscreen && activeRailTab === 'styles' && (
          <StylesPanel
            designTokens={schema.designTokens!}
            activeUniverseId={activeUniverseId}
            onApplyUniverse={handleApplyUniverse}
            onApplyFontPairing={handleApplyFontPairing}
            onUpdateTokens={handleUpdateDesignTokens}
            onClose={() => setActiveRailTab(null)}
          />
        )}
        {!isFullscreen && activeRailTab === 'data' && (
          <DataPanel
            selectedNodeId={selectedNodeId}
            selectedNodeName={selectedNode?.name}
            onBindVariable={(v) => {
              if (selectedNodeId) {
                controller.dispatch({
                  type: 'SG_SET_BINDING',
                  sceneId: activeScene.id,
                  nodeId: selectedNodeId,
                  binding: { property: 'textContent', path: v, type: 'variable' },
                });
              }
            }}
            onBindCollection={(colSlug) => {
              if (selectedNodeId) {
                controller.updateNode(
                  selectedNodeId,
                  {
                    repeater: {
                      arrayFieldKey: colSlug,
                      itemTemplateNodeId: selectedNode?.children?.[0] || selectedNodeId,
                    },
                  },
                  activeScene.id
                );
              }
            }}
            onClose={() => setActiveRailTab(null)}
          />
        )}

        {/* Center Canvas / 3D Scene / Docked Workspaces */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          {mode === '3d' ? (
            <ThreeDWorkspace
              sceneName={activeScene.name}
              onInsertToCanvas={() => {
                handleInsertNode('frame', '3D Spatial Section', {
                  geometry: { width: '100%', height: '500px', position: 'flow' },
                  style: { background: { type: 'solid', color: { type: 'solid', value: '#060B1A' } }, border: { radius: '16px' } },
                });
                setMode('build');
              }}
            />
          ) : (
            <CanvasWorkspace
              scenes={activePageSections}
              activeSceneId={selectedSceneId}
              onSelectScene={(id) => {
                controller.selectScene(id);
                controller.clearSelection();
              }}
              selectedNodeId={selectedNodeId}
              selectedNodeIds={selectedNodeIds}
              onSelectNode={handleSelectNode}
              onSelectNodes={handleSelectNodes}
              onUpdateGeometry={handleUpdateGeometry}
              onUpdateStyle={handleUpdateStyle}
              onDuplicateNode={handleDuplicateNode}
              onDeleteNode={handleDeleteNode}
              viewport={viewport}
              designTokens={schema.designTokens!}
              resolvedState={resolvedState}
              schema={schema}
              dispatch={controller.dispatch}
              zoom={zoom}
              onZoomChange={setZoom}
              onAddSection={(pos) => {
                setTargetInsertPosition(pos);
                setActiveRailTab('add');
              }}
              onMoveSection={handleMoveSection}
              onDuplicateSection={handleDuplicateScene}
              onDeleteSection={handleDeleteScene}
              onSwapSectionVariant={handleSwapSectionVariant}
              onInsertNode={handleInsertNode}
              onOpenRemix={() => setIsRemixOpen(true)}
              onOpenAi={() => setIsAiModalOpen(true)}
            />
          )}

          {/* Docked Motion Timeline (When in Motion Mode) */}
          {mode === 'motion' && (
            <MotionWorkspace
              selectedNode={selectedNode}
              sceneName={activeScene.name}
              onUpdateNode={handleUpdateNode}
              onClose={() => setMode('build')}
            />
          )}

          {/* Docked Prototype Graph (When in Prototype Mode) */}
          {mode === 'prototype' && (
            <PrototypeWorkspace
              selectedNode={selectedNode}
              activeScene={activeScene}
              onUpdateNode={handleUpdateNode}
              onClose={() => setMode('build')}
            />
          )}
        </div>

        {/* Contextual Right Inspector (Collapsible, Progressive Disclosure) */}
        {!isFullscreen && (
          <InspectorHost
            selectedNode={selectedNode}
            activeScene={activeScene}
            designTokens={schema.designTokens}
            activeViewport={viewport}
            onUpdateNode={handleUpdateNode}
            onUpdateGeometry={(nodeId, patch) => handleUpdateGeometry(activeScene.id, nodeId, patch)}
            onUpdateStyle={handleUpdateStyle}
            onDuplicateNode={handleDuplicateNode}
            onDeleteNode={handleDeleteNode}
            onToggleLock={handleToggleNodeLock}
            onToggleHide={handleToggleNodeVisibility}
            onUpdateScene={(id, patch) => controller.updateScene(id, patch)}
            onCreateComponent={handleCreateComponent}
            onInstantiateComponent={handleInstantiateComponent}
            onResetOverrides={handleResetOverrides}
            onPushToMaster={handlePushToMaster}
            onDetachInstance={handleDetachInstance}
            onResetResponsiveOverride={handleResetResponsiveOverride}
            onOpenRemix={() => setIsRemixOpen(true)}
            onOpenAi={() => setIsAiModalOpen(true)}
            onOpenAssetPicker={() => setActiveRailTab('assets')}
          />
        )}
      </div>

      {/* ── 3. BOTTOM CONTEXT BAR ── */}
      {!isFullscreen && (
        <BottomContextBar
          sceneName={activeScene.name}
          selectedNodeName={selectedNode?.name}
          viewport={viewport}
          zoom={zoom}
          onZoomChange={setZoom}
          onResetFit={() => setZoom(0.88)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
          onOpenPerformance={() => setIsPerformanceModalOpen(true)}
          performanceScore={performanceStats.score}
        />
      )}

      {/* ── 4. FULLSCREEN EXIT BUTTON ── */}
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
            background: 'rgba(22, 24, 29, 0.92)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '9999px',
            padding: '6px 14px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7)',
          }}
        >
          <span style={{ fontSize: '0.74rem', color: '#F3F4F6', fontWeight: 600 }}>
            Fullscreen Canvas (Press ESC to Exit)
          </span>
          <button
            onClick={() => setIsFullscreen(false)}
            style={{
              background: '#2563EB',
              border: 'none',
              borderRadius: '9999px',
              padding: '3px 10px',
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

      {/* ── 5. MODALS & DIALOGS ── */}
      {/* Command Palette (⌘K) */}
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
          onOpenPublish={handlePublish}
        />
      )}

      {/* Live Preview Modal */}
      <StudioPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        scenes={schema.scenes}
        designTokens={schema.designTokens!}
        projectName={schema.name}
        resolvedState={resolvedState}
        schema={schema}
      />

      {/* Edge CDN Publish Modal */}
      <StudioPublishModal
        isOpen={isPublishOpen}
        onClose={() => setIsPublishOpen(false)}
        projectName={schema.name}
        templateSlug={templateSlug}
        schema={schema}
        onUpdatePublishingConfig={(patch) => controller.updatePublishingConfig(patch)}
      />

      {/* Ask OrbitoX AI Modal */}
      <StudioAiModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        selectedNode={selectedNode}
        activeScene={activeScene}
        schema={schema}
        onExecuteAiCommand={handleExecuteAiCommand}
        onUndo={() => controller.undo()}
      />

      {/* Section Remix Modal */}
      <StudioRemixModal
        isOpen={isRemixOpen}
        onClose={() => setIsRemixOpen(false)}
        sceneName={activeScene.name}
        onApplyRemix={handleApplyRemix}
      />

      {/* Shortcuts Sheet Modal */}
      <StudioShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Template Universe Browser Modal (13 Industries) */}
      <TemplateBrowserModal
        isOpen={isTemplateBrowserOpen}
        onClose={() => setIsTemplateBrowserOpen(false)}
        onSelectTemplate={handleReplaceSite}
        onReplaceSite={handleReplaceSite}
        onAddTemplateSection={handleAddTemplateSection}
        onApplyTemplateTheme={handleApplyTemplateTheme}
        onNewFromTemplate={handleNewFromTemplate}
      />

      {/* Project Health & Performance Audit Modal */}
      <PerformanceModal
        isOpen={isPerformanceModalOpen}
        onClose={() => setIsPerformanceModalOpen(false)}
        stats={performanceStats}
      />

      {/* Lightweight Undo Toast (Prompt #9) */}
      {undoToast && (
        <div
          id="sz-undo-toast"
          style={{
            position: 'fixed',
            bottom: '48px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: 'rgba(22, 24, 29, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '8px',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
          }}
        >
          <span style={{ fontSize: '0.78rem', color: '#F3F4F6' }}>{undoToast.message}</span>
          <button
            id="sz-undo-toast-btn"
            onClick={() => {
              controller.undo();
              setUndoToast(null);
            }}
            style={{
              background: '#2563EB',
              border: 'none',
              borderRadius: '4px',
              padding: '3px 10px',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            Undo
          </button>
        </div>
      )}

      {/* ── P26.1 GLOBAL DRAG-AND-DROP OVERLAY ── */}
      <GlobalDropzoneOverlay
        onDropFiles={(files: File[], targetNodeId?: string | null) => {
          const file = files[0];
          if (!file) return;
          if (
            file.name.endsWith('.html') ||
            file.name.endsWith('.zip') ||
            file.name.endsWith('.json') ||
            file.name.endsWith('.xd')
          ) {
            setIsImportOpen(true);
          } else {
            AssetIngestionService.ingestFile(file).then((asset) => {
              if (targetNodeId && activeScene?.sceneGraph?.nodes[targetNodeId]) {
                controller.dispatch({
                  type: 'SG_UPDATE_NODE_PROPERTY',
                  sceneId: activeScene.id,
                  nodeId: targetNodeId,
                  patch: {
                    smartProps: { ...(activeScene.sceneGraph.nodes[targetNodeId]?.smartProps || {}), url: asset.objectUrl },
                    props: { ...(activeScene.sceneGraph.nodes[targetNodeId]?.props || {}), src: asset.objectUrl },
                  },
                });
              } else if (activeScene?.sceneGraph) {
                controller.dispatch({
                  type: 'SG_CREATE_NODE',
                  sceneId: activeScene.id,
                  kind: asset.mimeType.startsWith('video/') ? 'video' : 'image',
                  parentId: selectedNodeId || activeScene.sceneGraph.rootNodeId,
                  defaults: {
                    name: asset.name,
                    props: { src: asset.objectUrl, alt: asset.name },
                    style: { objectFit: 'contain' },
                  },
                });
              }
            });
          }
        }}
      />

      {/* ── P26.1 UNIVERSAL ADD COMMAND CENTER (⌘K / A) ── */}
      <UniversalAddCommandCenter
        isOpen={isCommandCenterOpen}
        onClose={() => setIsCommandCenterOpen(false)}
        onInsertNode={(kind: SceneNodeKind, name: string, defaults?: any) => {
          if (activeScene?.sceneGraph) {
            controller.dispatch({
              type: 'SG_CREATE_NODE',
              sceneId: activeScene.id,
              kind,
              parentId: selectedNodeId || activeScene.sceneGraph.rootNodeId,
              defaults: { name, ...defaults },
            });
          }
        }}
        onAddSection={(sceneDef: TemplateSceneDefinition) => {
          controller.addTemplateSection(sceneDef);
        }}
        onOpenTemplateMarketplace={() => {
          setIsCommandCenterOpen(false);
          setIsMarketplaceOpen(true);
        }}
        onOpenCreativeIntake={() => {
          setIsCommandCenterOpen(false);
          setIsImportOpen(true);
        }}
        onOpenAiGenerator={() => {
          setIsCommandCenterOpen(false);
          setIsAiModalOpen(true);
        }}
      />

      {/* ── P26.1 TEMPLATE MARKETPLACE MODAL ── */}
      <TemplateMarketplaceModal
        isOpen={isMarketplaceOpen}
        onClose={() => setIsMarketplaceOpen(false)}
        onSafeReplaceSite={(template: StudioTemplateMeta) => {
          handleReplaceSite(template);
        }}
        onUseAsProject={(template: StudioTemplateMeta) => {
          handleReplaceSite(template);
        }}
        onAddSectionToActivePage={(_secType: string, template: StudioTemplateMeta) => {
          handleAddTemplateSection(template);
        }}
        onAddAsNewPage={(template: StudioTemplateMeta) => {
          handleAddTemplateSection(template);
        }}
      />

      {/* ── UNIVERSAL IMPORT STUDIO MODAL ── */}
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
                children: [...(mergedNodes[targetParentId].children || []), importedRootId],
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
          onCreateNewPage={(pageName, path, initialScene) => {
            controller.createPage(pageName, path, [initialScene]);
          }}
          onCreateNewProject={(projectName, initialScene, initialTokens) => {
            controller.replaceProject({
              id: `project-${Date.now()}`,
              name: projectName,
              slug: projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              category: 'general',
              scenes: [initialScene],
              designTokens: initialTokens || schema.designTokens,
              metadata: {
                version: '1.0.0',
                author: 'OrbitoX Creative Intake',
              },
            } as any);
          }}
        />
      )}
    </div>
  );
}
