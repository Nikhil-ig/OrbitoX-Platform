'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  CanvasContextMenu,
  ContextMenuState,
  ContextMenuType,
} from './CanvasContextMenu';
import { SceneGraph } from '../../engine/SceneGraphTypes';
import { TemplateEditorCommand } from '../../engine/TemplateEditorCommands';

export interface ContextMenuContextValue {
  state: ContextMenuState;
  openContextMenu: (newState: Partial<ContextMenuState> & { clientPosition: { x: number; y: number } }) => void;
  closeContextMenu: () => void;
  handleContextMenuEvent: (
    e: React.MouseEvent,
    options: {
      artboardEl?: HTMLElement | null;
      zoom?: number;
      activeSceneId: string;
      sceneGraph?: SceneGraph | null;
      selectedNodeIds?: string[];
      onSelectNode?: (nodeId: string, sceneId: string) => void;
      onSelectNodes?: (nodeIds: string[], sceneId: string) => void;
      onSelectScene?: (sceneId: string) => void;
    }
  ) => void;
}

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null);

export function useContextMenu(): ContextMenuContextValue {
  const ctx = useContext(ContextMenuContext);
  if (!ctx) {
    throw new Error('useContextMenu must be used within a ContextMenuProvider');
  }
  return ctx;
}

export interface ContextMenuProviderProps {
  children: ReactNode;
  dispatch: (command: TemplateEditorCommand) => void;
  sceneGraph?: SceneGraph | null;
  onZoomFit?: () => void;
  onSelectNode?: (nodeId: string) => void;
}

/**
 * ContextMenuManager / Provider
 * Global controller and renderer for Studio Zero / Visual Canvas right-click context menu.
 */
export function ContextMenuProvider({
  children,
  dispatch,
  sceneGraph,
  onZoomFit,
  onSelectNode,
}: ContextMenuProviderProps) {
  const [state, setState] = useState<ContextMenuState>({
    isOpen: false,
    type: 'canvas',
    sceneId: '',
    clientPosition: { x: 0, y: 0 },
    scenePosition: { x: 0, y: 0 },
    targetNodeId: null,
    targetNodeIds: [],
    targetSectionId: null,
  });

  const openContextMenu = useCallback(
    (newState: Partial<ContextMenuState> & { clientPosition: { x: number; y: number } }) => {
      setState((prev) => ({
        ...prev,
        ...newState,
        isOpen: true,
      }));
    },
    []
  );

  const closeContextMenu = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleContextMenuEvent = useCallback(
    (
      e: React.MouseEvent,
      options: {
        artboardEl?: HTMLElement | null;
        zoom?: number;
        activeSceneId: string;
        sceneGraph?: SceneGraph | null;
        selectedNodeIds?: string[];
        onSelectNode?: (nodeId: string, sceneId: string) => void;
        onSelectNodes?: (nodeIds: string[], sceneId: string) => void;
        onSelectScene?: (sceneId: string) => void;
      }
    ) => {
      e.preventDefault();
      e.stopPropagation();

      const {
        artboardEl,
        zoom = 1,
        activeSceneId,
        sceneGraph: graph,
        selectedNodeIds = [],
        onSelectNode: selectNode,
        onSelectNodes: selectNodes,
        onSelectScene: selectScene,
      } = options;

      let sceneX = e.clientX;
      let sceneY = e.clientY;

      if (artboardEl) {
        const rect = artboardEl.getBoundingClientRect();
        sceneX = (e.clientX - rect.left) / zoom;
        sceneY = (e.clientY - rect.top) / zoom;
      }

      const target = e.target as HTMLElement | null;
      if (!target) return;

      // 1. Check Section affordance / pill
      const sectionContainer = target.closest('[id^="sz-section-container-"]') as HTMLElement | null;
      const sectionPill = target.closest('[id^="sz-section-pill-"]') as HTMLElement | null;
      const sectionBtn = target.closest('[data-section-id]') as HTMLElement | null;
      const detectedSectionId =
        sectionBtn?.getAttribute('data-section-id') ||
        sectionPill?.id?.replace('sz-section-pill-', '') ||
        sectionContainer?.id?.replace('sz-section-container-', '');

      // 2. Check SceneGraph Node
      const nodeEl = target.closest('[data-node-id]') as HTMLElement | null;
      if (nodeEl) {
        const nodeId = nodeEl.getAttribute('data-node-id');
        if (nodeId && graph?.nodes && graph.nodes[nodeId]) {
          if (selectedNodeIds.includes(nodeId) && selectedNodeIds.length > 1) {
            setState({
              isOpen: true,
              type: 'multi_node',
              sceneId: activeSceneId,
              clientPosition: { x: e.clientX, y: e.clientY },
              scenePosition: { x: sceneX, y: sceneY },
              targetNodeId: nodeId,
              targetNodeIds: selectedNodeIds,
            });
            return;
          }

          selectNode?.(nodeId, activeSceneId);
          selectNodes?.([nodeId], activeSceneId);

          setState({
            isOpen: true,
            type: 'node',
            sceneId: activeSceneId,
            clientPosition: { x: e.clientX, y: e.clientY },
            scenePosition: { x: sceneX, y: sceneY },
            targetNodeId: nodeId,
            targetNodeIds: [nodeId],
          });
          return;
        }
      }

      // 3. Section fallback
      if (detectedSectionId) {
        selectScene?.(detectedSectionId);
        setState({
          isOpen: true,
          type: 'section',
          sceneId: detectedSectionId,
          clientPosition: { x: e.clientX, y: e.clientY },
          scenePosition: { x: sceneX, y: sceneY },
          targetSectionId: detectedSectionId,
        });
        return;
      }

      // 4. Default: Canvas Background
      setState({
        isOpen: true,
        type: 'canvas',
        sceneId: activeSceneId,
        clientPosition: { x: e.clientX, y: e.clientY },
        scenePosition: { x: sceneX, y: sceneY },
        targetNodeId: null,
      });
    },
    []
  );

  return (
    <ContextMenuContext.Provider
      value={{
        state,
        openContextMenu,
        closeContextMenu,
        handleContextMenuEvent,
      }}
    >
      {children}
      <CanvasContextMenu
        state={state}
        onClose={closeContextMenu}
        dispatch={dispatch}
        sceneGraph={sceneGraph}
        onZoomFit={onZoomFit}
        onSelectNode={onSelectNode}
      />
    </ContextMenuContext.Provider>
  );
}

export { CanvasContextMenu };
export type { ContextMenuState, ContextMenuType };
