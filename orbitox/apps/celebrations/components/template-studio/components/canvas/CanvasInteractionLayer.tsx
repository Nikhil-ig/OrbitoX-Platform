'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SceneGraph, SceneGraphNode, SceneNodeKind, NodeGeometry } from '../../engine/SceneGraphTypes';
import { BoundingBox, AlignmentEngine, SnapGuide, SpacingBadge } from '../../engine/AlignmentEngine';
import { TemplateEditorCommand } from '../../engine/TemplateEditorCommands';
import { InlineEditOverlay } from './InlineEditOverlay';
import { CanvasCoordinates, SceneRect, ScenePoint } from '../../engine/CanvasCoordinates';
import { DropResolver } from '../../engine/DropResolver';
import { NodeDefaults } from '../../engine/NodeDefaults';
import { CanvasFloatingContextBar } from './CanvasFloatingContextBar';
import { SmartGuidesOverlay } from '@/components/studio-zero/canvas/SmartGuidesOverlay';

type ResizeHandleDirection = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface CanvasInteractionLayerProps {
  sceneId: string;
  sceneGraph: SceneGraph;
  selectedNodeIds: string[];
  onSelectNodes: (nodeIds: string[]) => void;
  onUpdateGeometry: (nodeId: string, patch: any) => void;
  onDropInsert?: (kind: string, x: number, y: number) => void;
  dispatch: (command: TemplateEditorCommand) => void;
  zoom?: number;
  showDebug?: boolean;
  onOpenMotion?: () => void;
  onOpenAi?: (action: string) => void;
  onOpenRemix?: () => void;
}

type InteractionMode = 'idle' | 'pressed' | 'dragging' | 'resizing' | 'rotating';

interface InitialNodeState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  position: string;
  parentId?: string;
}

export function CanvasInteractionLayer({
  sceneId,
  sceneGraph,
  selectedNodeIds,
  onSelectNodes,
  onUpdateGeometry,
  onDropInsert,
  dispatch,
  zoom = 1,
  showDebug = false,
  onOpenMotion,
  onOpenAi,
  onOpenRemix,
}: CanvasInteractionLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Interaction State Machine
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('idle');
  const [activeHandle, setActiveHandle] = useState<ResizeHandleDirection | null>(null);
  const [startClientPos, setStartClientPos] = useState<ScenePoint>({ x: 0, y: 0 });
  const [transientDelta, setTransientDelta] = useState<ScenePoint>({ x: 0, y: 0 });
  const [transientRotation, setTransientRotation] = useState<number>(0);
  const [initialNodesState, setInitialNodesState] = useState<Record<string, InitialNodeState>>({});

  // Drop & Nesting Targets
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [spacingBadges, setSpacingBadges] = useState<SpacingBadge[]>([]);
  const [measuredRects, setMeasuredRects] = useState<Record<string, SceneRect>>({});
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  // Flow vs Absolute Drag Indicators (P16.1 Phase 1)
  const [isAltPressed, setIsAltPressed] = useState<boolean>(false);
  const [flowInsertionLine, setFlowInsertionLine] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    axis: 'horizontal' | 'vertical';
  } | null>(null);
  const [flowInsertTarget, setFlowInsertTarget] = useState<{
    parentId: string;
    targetIndex: number;
  } | null>(null);

  // Debug HUD instrumentation (Prompt Section 23)
  const [pointerClient, setPointerClient] = useState<ScenePoint>({ x: 0, y: 0 });
  const [pointerScene, setPointerScene] = useState<ScenePoint>({ x: 0, y: 0 });
  const [hasPointerCapture, setHasPointerCapture] = useState<boolean>(false);
  const [lastCommand, setLastCommand] = useState<string>('NONE');

  // Insert Ghost Preview
  const [ghostPreview, setGhostPreview] = useState<{ kind: string; x: number; y: number } | null>(null);

  // Global Alt key listener for Flow vs Absolute override
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) setIsAltPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.altKey) setIsAltPressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const artboardEl = useCallback(() => {
    return containerRef.current || document.getElementById('orbitox-artboard-frame');
  }, []);

  // Measure all nodes in the SceneGraph in canonical unscaled coordinates
  useEffect(() => {
    let animId: number;
    const measureAll = () => {
      const artboard = artboardEl();
      if (!artboard) return;

      const newRects: Record<string, SceneRect> = {};
      let changed = false;

      const sectionContainer = containerRef.current?.parentElement;
      for (const id of Object.keys(sceneGraph.nodes)) {
        const el = (sectionContainer ? sectionContainer.querySelector(`[data-node-id="${id}"]`) : null)
          || (sectionContainer ? sectionContainer.querySelector(`#${id}`) : null)
          || document.querySelector(`[data-node-id="${id}"]`)
          || document.getElementById(id);
        if (el) {
          const rect = CanvasCoordinates.measureNode(el as HTMLElement, artboard, zoom);
          const current = measuredRects[id];
          if (
            !current ||
            Math.abs(current.x - rect.x) > 0.5 ||
            Math.abs(current.y - rect.y) > 0.5 ||
            Math.abs(current.width - rect.width) > 0.5 ||
            Math.abs(current.height - rect.height) > 0.5
          ) {
            changed = true;
          }
          newRects[id] = rect;
        }
      }

      if (changed) {
        setMeasuredRects(newRects);
      }
      animId = requestAnimationFrame(measureAll);
    };

    measureAll();
    return () => cancelAnimationFrame(animId);
  }, [sceneGraph, zoom, artboardEl, measuredRects]);

  // Snapshot initial geometry for all active selected nodes
  const snapshotSelectedNodes = useCallback(
    (targetNodeId?: string): Record<string, InitialNodeState> => {
      const nodeIdsToSnapshot =
        targetNodeId && !selectedNodeIds.includes(targetNodeId)
          ? [targetNodeId]
          : selectedNodeIds;

      const snapshot: Record<string, InitialNodeState> = {};
      nodeIdsToSnapshot.forEach((id) => {
        const node = sceneGraph.nodes[id];
        const rect = measuredRects[id];
        if (node) {
          const isExplicitPxW =
            typeof node.geometry?.width === 'number' ||
            (typeof node.geometry?.width === 'string' && /^[0-9]+(px)?$/.test(node.geometry.width.trim()));
          const isExplicitPxH =
            typeof node.geometry?.height === 'number' ||
            (typeof node.geometry?.height === 'string' && /^[0-9]+(px)?$/.test(node.geometry.height.trim()));
          const isExplicitPxX =
            typeof node.geometry?.x === 'number' ||
            (typeof node.geometry?.x === 'string' && /^-?[0-9]+(px)?$/.test(node.geometry.x.trim()));
          const isExplicitPxY =
            typeof node.geometry?.y === 'number' ||
            (typeof node.geometry?.y === 'string' && /^-?[0-9]+(px)?$/.test(node.geometry.y.trim()));

          const rawX = isExplicitPxX ? parseFloat(String(node.geometry?.x)) : (rect?.x ?? 0);
          const rawY = isExplicitPxY ? parseFloat(String(node.geometry?.y)) : (rect?.y ?? 0);
          const rawW = isExplicitPxW ? parseFloat(String(node.geometry?.width)) : (rect?.width ?? 100);
          const rawH = isExplicitPxH ? parseFloat(String(node.geometry?.height)) : (rect?.height ?? 100);

          snapshot[id] = {
            id,
            x: isNaN(rawX) ? (rect?.x ?? 0) : rawX,
            y: isNaN(rawY) ? (rect?.y ?? 0) : rawY,
            width: isNaN(rawW) ? (rect?.width ?? 100) : rawW,
            height: isNaN(rawH) ? (rect?.height ?? 100) : rawH,
            rotation: node.geometry?.rotation || 0,
            position: node.geometry?.position || 'flow',
            parentId: node.parentId || undefined,
          };
        }
      });
      return snapshot;
    },
    [sceneGraph, selectedNodeIds, measuredRects]
  );

  // Synchronized state ref for rock-solid window gesture handling
  const stateRef = useRef({
    interactionMode,
    startClientPos,
    initialNodesState,
    activeHandle,
    transientDelta,
    transientRotation,
    selectedNodeIds,
    sceneGraph,
    measuredRects,
    zoom,
    dropTargetId,
    flowInsertTarget,
    isAltPressed,
  });

  useEffect(() => {
    stateRef.current = {
      interactionMode,
      startClientPos,
      initialNodesState,
      activeHandle,
      transientDelta,
      transientRotation,
      selectedNodeIds,
      sceneGraph,
      measuredRects,
      zoom,
      dropTargetId,
      flowInsertTarget,
      isAltPressed,
    };
  });

  // ─────────────────────────────────────────────────────────────
  // 1. POINTER DOWN (Move Node or Multi-Select)
  // ─────────────────────────────────────────────────────────────
  const handleBoxPointerDown = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation();
    e.preventDefault();

    // Use the authoritative nodeId of the selected box directly
    const targetNodeId = nodeId;

    let newSelectedIds = selectedNodeIds;
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      if (selectedNodeIds.includes(targetNodeId)) {
        newSelectedIds = selectedNodeIds.filter((id) => id !== targetNodeId);
        onSelectNodes(newSelectedIds);
        return;
      } else {
        newSelectedIds = [...selectedNodeIds, targetNodeId];
        onSelectNodes(newSelectedIds);
      }
    } else {
      if (!selectedNodeIds.includes(targetNodeId)) {
        newSelectedIds = [targetNodeId];
        onSelectNodes(newSelectedIds);
      }
    }

    const snapshots = snapshotSelectedNodes(targetNodeId);
    const startPos = { x: e.clientX, y: e.clientY };
    setInitialNodesState(snapshots);
    setStartClientPos(startPos);
    setTransientDelta({ x: 0, y: 0 });
    setInteractionMode('pressed');
    setActiveHandle(null);

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    // Synchronously prime ref so window pointermove/up immediately has accurate data
    stateRef.current.initialNodesState = snapshots;
    stateRef.current.startClientPos = startPos;
    stateRef.current.transientDelta = { x: 0, y: 0 };
    stateRef.current.interactionMode = 'pressed';
    stateRef.current.activeHandle = null;
    stateRef.current.selectedNodeIds = newSelectedIds.includes(targetNodeId) ? newSelectedIds : [targetNodeId];
  };

  // ─────────────────────────────────────────────────────────────
  // 2. POINTER DOWN (Resize or Rotate Handles)
  // ─────────────────────────────────────────────────────────────
  const handleHandlePointerDown = (
    e: React.PointerEvent,
    nodeId: string,
    handle: ResizeHandleDirection | 'rotate'
  ) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    const activeNodeIds = selectedNodeIds.includes(nodeId) ? selectedNodeIds : [nodeId];
    const snapshots = snapshotSelectedNodes(nodeId);
    const startPos = { x: e.clientX, y: e.clientY };
    setInitialNodesState(snapshots);
    setStartClientPos(startPos);
    setTransientDelta({ x: 0, y: 0 });

    if (handle === 'rotate') {
      const rot = snapshots[nodeId]?.rotation || 0;
      setInteractionMode('rotating');
      setActiveHandle(null);
      setTransientRotation(rot);
      dispatch({ type: 'BEGIN_TRANSACTION', label: 'Rotate Node' });

      // Synchronously prime ref
      stateRef.current.initialNodesState = snapshots;
      stateRef.current.startClientPos = startPos;
      stateRef.current.transientDelta = { x: 0, y: 0 };
      stateRef.current.interactionMode = 'rotating';
      stateRef.current.activeHandle = null;
      stateRef.current.transientRotation = rot;
      stateRef.current.selectedNodeIds = activeNodeIds;
    } else {
      setInteractionMode('resizing');
      setActiveHandle(handle);
      dispatch({ type: 'BEGIN_TRANSACTION', label: 'Resize Node' });

      // Synchronously prime ref
      stateRef.current.initialNodesState = snapshots;
      stateRef.current.startClientPos = startPos;
      stateRef.current.transientDelta = { x: 0, y: 0 };
      stateRef.current.interactionMode = 'resizing';
      stateRef.current.activeHandle = handle;
      stateRef.current.selectedNodeIds = activeNodeIds;
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 3. GLOBAL WINDOW GESTURE ENGINE (Pointer Events)
  // Handles continuous move & commit on window across entire screen
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (interactionMode === 'idle') return;

    const onWindowPointerMove = (e: PointerEvent) => {
      const artboard = artboardEl();
      const cur = stateRef.current;
      const curZoom = cur.zoom > 0 ? cur.zoom : 1;
      const sceneP = CanvasCoordinates.clientToScene(e.clientX, e.clientY, artboard, curZoom);
      setPointerClient({ x: e.clientX, y: e.clientY });
      setPointerScene(sceneP);

      const rawDx = e.clientX - cur.startClientPos.x;
      const rawDy = e.clientY - cur.startClientPos.y;
      const dist = Math.hypot(rawDx, rawDy);

      if (cur.interactionMode === 'pressed') {
        if (dist >= 3) {
          setInteractionMode('dragging');
          dispatch({ type: 'BEGIN_TRANSACTION', label: 'Move Node' });
        } else {
          return;
        }
      }

      const deltaSceneX = rawDx / curZoom;
      const deltaSceneY = rawDy / curZoom;

      if (cur.interactionMode === 'dragging' || cur.interactionMode === 'pressed') {
        setTransientDelta({ x: deltaSceneX, y: deltaSceneY });
        const targetId = cur.selectedNodeIds[0];
        const targetNode = targetId ? cur.sceneGraph.nodes[targetId] : null;
        const parentNode = targetNode?.parentId ? cur.sceneGraph.nodes[targetNode.parentId] : null;

        // Flow vs Absolute Drag Invariant (Task 5)
        const isFlowContainer =
          parentNode &&
          (parentNode.layoutMode === 'flex' ||
            parentNode.layoutMode === 'stack' ||
            parentNode.kind === 'stack' ||
            targetNode?.geometry?.position === 'flow');

        if (isFlowContainer && !e.altKey && parentNode && cur.selectedNodeIds.length === 1) {
          // Inside a flow container without Alt: calculate flow reorder slot
          const siblingIds = parentNode.children.filter((id) => id !== targetId);
          const parentRect = cur.measuredRects[parentNode.id];
          const isHorizontal = (parentNode.layoutConfig as any)?.direction === 'horizontal';

          let bestInsertIndex = siblingIds.length;
          let guideLine: { x: number; y: number; width: number; height: number; axis: 'horizontal' | 'vertical' } | null = null;

          if (parentRect) {
            if (isHorizontal) {
              bestInsertIndex = siblingIds.length;
              for (let i = 0; i < siblingIds.length; i++) {
                const sId = siblingIds[i];
                if (!sId) continue;
                const sRect = cur.measuredRects[sId];
                if (sRect && sceneP.x < sRect.x + sRect.width / 2) {
                  bestInsertIndex = i;
                  break;
                }
              }
              const nextSibId = siblingIds[bestInsertIndex];
              const prevSibId = siblingIds[bestInsertIndex - 1];
              const refRect = nextSibId
                ? cur.measuredRects[nextSibId]
                : (prevSibId ? cur.measuredRects[prevSibId] : parentRect);
              const lineX = nextSibId && refRect ? refRect.x : (refRect ? refRect.x + refRect.width : parentRect.x);
              guideLine = {
                x: lineX,
                y: parentRect.y,
                width: 3,
                height: parentRect.height,
                axis: 'vertical',
              };
            } else {
              bestInsertIndex = siblingIds.length;
              for (let i = 0; i < siblingIds.length; i++) {
                const sId = siblingIds[i];
                if (!sId) continue;
                const sRect = cur.measuredRects[sId];
                if (sRect && sceneP.y < sRect.y + sRect.height / 2) {
                  bestInsertIndex = i;
                  break;
                }
              }
              const nextSibId = siblingIds[bestInsertIndex];
              const prevSibId = siblingIds[bestInsertIndex - 1];
              const refRect = nextSibId
                ? cur.measuredRects[nextSibId]
                : (prevSibId ? cur.measuredRects[prevSibId] : parentRect);
              const lineY = nextSibId && refRect ? refRect.y : (refRect ? refRect.y + refRect.height : parentRect.y);
              guideLine = {
                x: parentRect.x,
                y: lineY,
                width: parentRect.width,
                height: 3,
                axis: 'horizontal',
              };
            }
          }

          setFlowInsertionLine(guideLine);
          const targetSlot = { parentId: parentNode.id, targetIndex: bestInsertIndex };
          setFlowInsertTarget(targetSlot);
          stateRef.current.flowInsertTarget = targetSlot;
          setSnapGuides([]);
          setSpacingBadges([]);
          setDropTargetId(null);
        } else {
          // Freeform absolute mode or Alt key held
          setFlowInsertionLine(null);
          setFlowInsertTarget(null);
          stateRef.current.flowInsertTarget = null;

          if (targetNode) {
            const { parentId } = DropResolver.resolveDropTarget(
              cur.sceneGraph,
              sceneP.x,
              sceneP.y,
              targetNode.kind,
              cur.measuredRects as any
            );
            if (parentId && parentId !== targetNode.parentId && parentId !== targetId) {
              setDropTargetId(parentId);
            } else {
              setDropTargetId(null);
            }

            // Compute smart snap guides & magenta axis lines with numerical distance badges
            if (targetId && cur.initialNodesState[targetId]) {
              const init = cur.initialNodesState[targetId]!;
              const movingBox: BoundingBox = {
                id: targetId,
                x: init.x + deltaSceneX,
                y: init.y + deltaSceneY,
                width: init.width,
                height: init.height,
              };
              const siblings: BoundingBox[] = Object.keys(cur.sceneGraph.nodes)
                .filter((id) => !cur.selectedNodeIds.includes(id) && cur.measuredRects[id])
                .map((id) => ({
                  id,
                  x: cur.measuredRects[id]!.x,
                  y: cur.measuredRects[id]!.y,
                  width: cur.measuredRects[id]!.width,
                  height: cur.measuredRects[id]!.height,
                }));
              const parentBox: BoundingBox = {
                id: 'canvas',
                x: 0,
                y: 0,
                width: 1440,
                height: 900,
              };
              const snap = AlignmentEngine.computeSnapGuides(movingBox, siblings, parentBox, 6);
              setSnapGuides(snap.guides);
              setSpacingBadges(snap.spacingBadges || []);
            }
          }
        }
      } else if (cur.interactionMode === 'resizing') {
        setTransientDelta({ x: deltaSceneX, y: deltaSceneY });
      } else if (cur.interactionMode === 'rotating') {
        const targetId = cur.selectedNodeIds[0];
        const initial = targetId ? cur.initialNodesState[targetId] : null;
        if (initial && targetId) {
          const centerX = initial.x + initial.width / 2;
          const centerY = initial.y + initial.height / 2;
          const angle = CanvasCoordinates.computeRotationAngle(
            sceneP.x,
            sceneP.y,
            centerX,
            centerY,
            !e.shiftKey
          );
          setTransientRotation(angle);
        }
      }
    };

    const onWindowPointerUp = (e: PointerEvent) => {
      const cur = stateRef.current;
      const curZoom = cur.zoom > 0 ? cur.zoom : 1;
      const rawDx = e.clientX - cur.startClientPos.x;
      const rawDy = e.clientY - cur.startClientPos.y;
      const finalDeltaX = rawDx / curZoom;
      const finalDeltaY = rawDy / curZoom;

      if (cur.interactionMode === 'dragging') {
        const hasMoved = Math.abs(finalDeltaX) > 0.5 || Math.abs(finalDeltaY) > 0.5;
        if (hasMoved) {
          const targetId = cur.selectedNodeIds[0];
          const targetNode = targetId ? cur.sceneGraph.nodes[targetId] : null;

          if (cur.flowInsertTarget && !e.altKey && targetId) {
            const { parentId, targetIndex } = cur.flowInsertTarget;
            const parentNode = cur.sceneGraph.nodes[parentId];
            if (parentNode) {
              const fromIndex = parentNode.children.indexOf(targetId);
              if (fromIndex !== -1 && fromIndex !== targetIndex) {
                dispatch({
                  type: 'SG_REORDER',
                  sceneId,
                  parentId,
                  fromIndex,
                  toIndex: targetIndex,
                });
                setLastCommand('REORDER_FLOW_NODE');
              }
            }
          } else if (cur.dropTargetId && targetId && targetNode && cur.dropTargetId !== targetNode.parentId) {
            dispatch({
              type: 'SG_MOVE_NODE',
              sceneId,
              nodeId: targetId,
              newParentId: cur.dropTargetId,
            });
            setLastCommand('REPARENT_NODE');
          } else {
            Object.values(cur.initialNodesState).forEach((init) => {
              const finalX = Math.round(init.x + finalDeltaX);
              const finalY = Math.round(init.y + finalDeltaY);
              onUpdateGeometry(init.id, {
                x: finalX,
                y: finalY,
                position: init.position || 'flow',
              });
            });
            setLastCommand('MOVE_NODE');
          }
        }
        dispatch({ type: 'COMMIT_TRANSACTION' });
      } else if (cur.interactionMode === 'resizing' && cur.activeHandle) {
        if (cur.selectedNodeIds.length > 1) {
          // Multi-node group resizing (Task 7)
          let gMinX = Infinity, gMinY = Infinity, gMaxX = -Infinity, gMaxY = -Infinity;
          Object.values(cur.initialNodesState).forEach((init) => {
            gMinX = Math.min(gMinX, init.x);
            gMinY = Math.min(gMinY, init.y);
            gMaxX = Math.max(gMaxX, init.x + init.width);
            gMaxY = Math.max(gMaxY, init.y + init.height);
          });
          const origW = Math.max(1, gMaxX - gMinX);
          const origH = Math.max(1, gMaxY - gMinY);

          let newGW = origW;
          let newGH = origH;
          let newGX = gMinX;
          let newGY = gMinY;

          if (cur.activeHandle.includes('e')) newGW = Math.max(16, Math.round(origW + finalDeltaX));
          if (cur.activeHandle.includes('w')) {
            const clamped = Math.max(16, Math.round(origW - finalDeltaX));
            newGX = Math.round(gMinX + (origW - clamped));
            newGW = clamped;
          }
          if (cur.activeHandle.includes('s')) newGH = Math.max(16, Math.round(origH + finalDeltaY));
          if (cur.activeHandle.includes('n')) {
            const clamped = Math.max(16, Math.round(origH - finalDeltaY));
            newGY = Math.round(gMinY + (origH - clamped));
            newGH = clamped;
          }

          const scaleX = newGW / origW;
          const scaleY = newGH / origH;

          Object.values(cur.initialNodesState).forEach((init) => {
            const newX = Math.round(newGX + (init.x - gMinX) * scaleX);
            const newY = Math.round(newGY + (init.y - gMinY) * scaleY);
            const newW = Math.max(8, Math.round(init.width * scaleX));
            const newH = Math.max(8, Math.round(init.height * scaleY));
            onUpdateGeometry(init.id, {
              x: newX,
              y: newY,
              width: newW,
              height: newH,
              position: init.position || 'flow',
            });
          });
          setLastCommand('RESIZE_GROUP');
        } else {
          // Single node resizing
          const targetId = cur.selectedNodeIds[0];
          const initial = targetId ? cur.initialNodesState[targetId] : null;

          if (initial && targetId) {
            let newW = initial.width;
            let newH = initial.height;
            let newX = initial.x;
            let newY = initial.y;

            if (cur.activeHandle.includes('e')) {
              newW = Math.max(16, Math.round(initial.width + finalDeltaX));
            }
            if (cur.activeHandle.includes('w')) {
              const clamped = Math.max(16, Math.round(initial.width - finalDeltaX));
              newX = Math.round(initial.x + (initial.width - clamped));
              newW = clamped;
            }
            if (cur.activeHandle.includes('s')) {
              newH = Math.max(16, Math.round(initial.height + finalDeltaY));
            }
            if (cur.activeHandle.includes('n')) {
              const clamped = Math.max(16, Math.round(initial.height - finalDeltaY));
              newY = Math.round(initial.y + (initial.height - clamped));
              newH = clamped;
            }

            onUpdateGeometry(targetId, {
              x: newX,
              y: newY,
              width: newW,
              height: newH,
              position: initial.position || 'flow',
            });
            setLastCommand('RESIZE_NODE');
          }
        }
        dispatch({ type: 'COMMIT_TRANSACTION' });
      } else if (cur.interactionMode === 'rotating') {
        const targetId = cur.selectedNodeIds[0];
        if (targetId) {
          onUpdateGeometry(targetId, { rotation: cur.transientRotation });
          setLastCommand('ROTATE_NODE');
        }
        dispatch({ type: 'COMMIT_TRANSACTION' });
      }

      setInteractionMode('idle');
      setActiveHandle(null);
      setTransientDelta({ x: 0, y: 0 });
      setDropTargetId(null);
      setSnapGuides([]);
      setSpacingBadges([]);
      setFlowInsertionLine(null);
      setFlowInsertTarget(null);
    };

    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', onWindowPointerUp);

    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
      window.removeEventListener('pointercancel', onWindowPointerUp);
    };
  }, [interactionMode, sceneId, onUpdateGeometry, dispatch]);

  // ─────────────────────────────────────────────────────────────
  // 5. INSERT PANEL → CANVAS DROP (Prompt Section 10 & 13)
  // ─────────────────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    const artboard = artboardEl();
    const sceneP = CanvasCoordinates.clientToScene(e.clientX, e.clientY, artboard, zoom);
    const kind = e.dataTransfer.types.includes('application/orbitox-node-kind')
      ? 'primitive'
      : 'item';
    setGhostPreview({ kind, x: sceneP.x, y: sceneP.y });
  };

  const handleDragLeave = () => {
    setGhostPreview(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setGhostPreview(null);

    const rawAsset = e.dataTransfer.getData('orbitox_asset');
    if (rawAsset) {
      try {
        const asset = JSON.parse(rawAsset);
        const artboard = artboardEl();
        const sceneP = CanvasCoordinates.clientToScene(e.clientX, e.clientY, artboard, zoom);
        
        let targetImageNodeId: string | null = null;
        for (const [id, rect] of Object.entries(measuredRects)) {
          const node = sceneGraph.nodes[id];
          if (node && (node.kind === 'image' || node.kind === 'frame')) {
            if (
              sceneP.x >= rect.x &&
              sceneP.x <= rect.x + rect.width &&
              sceneP.y >= rect.y &&
              sceneP.y <= rect.y + rect.height
            ) {
              if (node.kind === 'image') {
                targetImageNodeId = id;
                break;
              }
            }
          }
        }

        if (targetImageNodeId) {
          dispatch({
            type: 'SG_UPDATE_NODE_PROPERTY',
            sceneId,
            nodeId: targetImageNodeId,
            patch: {
              smartProps: { src: asset.url, alt: asset.name },
            },
          });
          setLastCommand(`REPLACE_IMAGE (${targetImageNodeId})`);
          return;
        } else {
          const { parentId, insertIndex, position, localX, localY } = DropResolver.resolveDropTarget(
            sceneGraph,
            sceneP.x,
            sceneP.y,
            'image',
            measuredRects as any
          );
          const def = NodeDefaults.create('image');
          def.geometry = {
            ...(def.geometry as any),
            position: position as any,
            x: position === 'absolute' ? Math.round(localX) : 0,
            y: position === 'absolute' ? Math.round(localY) : 0,
            width: 320,
            height: 220,
          };
          def.smartProps = {
            src: asset.url,
            alt: asset.name,
          };
          dispatch({
            type: 'SG_CREATE_NODE',
            sceneId,
            kind: 'image',
            parentId,
            insertIndex,
            defaults: def,
          });
          setLastCommand(`CREATE_NODE (image from asset)`);
          return;
        }
      } catch (err) {
        console.error('Failed to parse orbitox_asset', err);
      }
    }

    const kind =
      e.dataTransfer.getData('application/orbitox-node-kind') ||
      e.dataTransfer.getData('text/plain');

    if (!kind) return;

    const artboard = artboardEl();
    const sceneP = CanvasCoordinates.clientToScene(e.clientX, e.clientY, artboard, zoom);

    const { parentId, insertIndex, position, localX, localY } = DropResolver.resolveDropTarget(
      sceneGraph,
      sceneP.x,
      sceneP.y,
      kind as SceneNodeKind,
      measuredRects as any
    );

    const def = NodeDefaults.create(kind as any);
    def.geometry = {
      ...(def.geometry as any),
      position: position as any,
      x: position === 'absolute' ? Math.round(localX) : 0,
      y: position === 'absolute' ? Math.round(localY) : 0,
    };

    dispatch({
      type: 'SG_CREATE_NODE',
      sceneId,
      kind: kind as any,
      parentId,
      insertIndex,
      defaults: def,
    });
    setLastCommand(`CREATE_NODE (${kind})`);
  };

  // ─────────────────────────────────────────────────────────────
  // 5b. NATIVE ARTBOARD DRAG & DROP LISTENERS (Prompt Section 13)
  // Ensures library drops register reliably even through transparent overlays
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const artboard = artboardEl();
    if (!artboard) return;

    const onNativeDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
      const sceneP = CanvasCoordinates.clientToScene(e.clientX, e.clientY, artboard, zoom);
      const isOrbito = e.dataTransfer?.types?.some((t) => t.includes('orbitox')) ?? false;
      const kind = isOrbito ? 'primitive' : 'item';
      setGhostPreview({ kind, x: sceneP.x, y: sceneP.y });
    };

    const onNativeDragLeave = (e: DragEvent) => {
      if (e.relatedTarget && artboard.contains(e.relatedTarget as Node)) return;
      setGhostPreview(null);
    };

    const onNativeDrop = (e: DragEvent) => {
      e.preventDefault();
      setGhostPreview(null);

      const rawAsset = e.dataTransfer?.getData('orbitox_asset');
      if (rawAsset) {
        try {
          const asset = JSON.parse(rawAsset);
          const sceneP = CanvasCoordinates.clientToScene(e.clientX, e.clientY, artboard, zoom);

          let targetImageNodeId: string | null = null;
          for (const [id, rect] of Object.entries(measuredRects)) {
            const node = sceneGraph.nodes[id];
            if (node && node.kind === 'image') {
              if (
                sceneP.x >= rect.x &&
                sceneP.x <= rect.x + rect.width &&
                sceneP.y >= rect.y &&
                sceneP.y <= rect.y + rect.height
              ) {
                targetImageNodeId = id;
                break;
              }
            }
          }

          if (targetImageNodeId) {
            dispatch({
              type: 'SG_UPDATE_NODE_PROPERTY',
              sceneId,
              nodeId: targetImageNodeId,
              patch: {
                smartProps: { src: asset.url, alt: asset.name },
              },
            });
            setLastCommand(`REPLACE_IMAGE (${targetImageNodeId})`);
            return;
          } else {
            const { parentId, insertIndex, position, localX, localY } = DropResolver.resolveDropTarget(
              sceneGraph,
              sceneP.x,
              sceneP.y,
              'image',
              measuredRects as any
            );
            const def = NodeDefaults.create('image');
            def.geometry = {
              ...(def.geometry as any),
              position: position as any,
              x: position === 'absolute' ? Math.round(localX) : 0,
              y: position === 'absolute' ? Math.round(localY) : 0,
              width: 320,
              height: 220,
            };
            def.smartProps = {
              src: asset.url,
              alt: asset.name,
            };
            dispatch({
              type: 'SG_CREATE_NODE',
              sceneId,
              kind: 'image',
              parentId,
              insertIndex,
              defaults: def,
            });
            setLastCommand(`CREATE_NODE (image from asset)`);
            return;
          }
        } catch (err) {
          console.error('Failed to parse orbitox_asset in native drop', err);
        }
      }

      const kind =
        e.dataTransfer?.getData('application/orbitox-node-kind') ||
        e.dataTransfer?.getData('text/plain');

      if (!kind) return;

      const sceneP = CanvasCoordinates.clientToScene(e.clientX, e.clientY, artboard, zoom);
      const { parentId, insertIndex, position, localX, localY } = DropResolver.resolveDropTarget(
        sceneGraph,
        sceneP.x,
        sceneP.y,
        kind as SceneNodeKind,
        measuredRects as any
      );

      const def = NodeDefaults.create(kind as any);
      def.geometry = {
        ...(def.geometry as any),
        position: position as any,
        x: position === 'absolute' ? Math.round(localX) : 0,
        y: position === 'absolute' ? Math.round(localY) : 0,
      };

      dispatch({
        type: 'SG_CREATE_NODE',
        sceneId,
        kind: kind as any,
        parentId,
        insertIndex,
        defaults: def,
      });
      setLastCommand(`CREATE_NODE (${kind})`);
    };

    artboard.addEventListener('dragover', onNativeDragOver);
    artboard.addEventListener('dragleave', onNativeDragLeave);
    artboard.addEventListener('drop', onNativeDrop);

    return () => {
      artboard.removeEventListener('dragover', onNativeDragOver);
      artboard.removeEventListener('dragleave', onNativeDragLeave);
      artboard.removeEventListener('drop', onNativeDrop);
    };
  }, [sceneId, sceneGraph, zoom, measuredRects, dispatch]);

  const primarySelectedId = selectedNodeIds[0];
  const primaryNode = primarySelectedId ? sceneGraph.nodes[primarySelectedId] : null;

  // Handle common style: crisp, elegant 6px square with subtle shadow (Figma standard)
  const handleBaseStyle: React.CSSProperties = {
    position: 'absolute',
    width: '6px',
    height: '6px',
    background: '#FFFFFF',
    border: '1px solid #1E293B',
    borderRadius: '1px',
    zIndex: 45,
    boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
    touchAction: 'none',
  };

  return (
    <div
      ref={containerRef}
      id="orbitox-canvas-interaction-layer"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 50,
        overflow: 'visible',
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ── 1. DROP TARGET HIGHLIGHT INDICATOR ── */}
      {dropTargetId && measuredRects[dropTargetId] && (
        <div
          style={{
            position: 'absolute',
            left: measuredRects[dropTargetId]?.x,
            top: measuredRects[dropTargetId]?.y,
            width: measuredRects[dropTargetId]?.width,
            height: measuredRects[dropTargetId]?.height,
            border: '2px dashed #DFBA6B',
            background: 'rgba(223, 186, 107, 0.15)',
            borderRadius: '6px',
            pointerEvents: 'none',
            zIndex: 25,
            transition: 'all 0.15s ease',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-24px',
              left: '8px',
              background: '#DFBA6B',
              color: '#000000',
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '3px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
            }}
          >
            DROP INTO: {sceneGraph.nodes[dropTargetId]?.name || 'Container'}
          </div>
        </div>
      )}

      {/* ── 2. INSERT GHOST PREVIEW (Prompt Section 14) ── */}
      {ghostPreview && (
        <div
          style={{
            position: 'absolute',
            left: ghostPreview.x,
            top: ghostPreview.y,
            width: '100px',
            height: '40px',
            transform: 'translate(-50%, -50%)',
            border: '2px dashed #38BDF8',
            background: 'rgba(56, 189, 248, 0.25)',
            borderRadius: '6px',
            pointerEvents: 'none',
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#BAE6FD',
            fontSize: '12px',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          + {ghostPreview.kind}
        </div>
      )}

      {/* ── 3. SMART SNAP GUIDES & DISTANCE BADGES (Task 3.4) ── */}
      <SmartGuidesOverlay
        guides={snapGuides}
        spacingBadges={spacingBadges}
        flowInsertionLine={flowInsertionLine}
      />

      {/* ── 3.3 ALT MODE FLOATING BADGE (Task 5) ── */}
      {isAltPressed && interactionMode === 'dragging' && (
        <div
          style={{
            position: 'absolute',
            left: `${pointerScene.x + 16}px`,
            top: `${pointerScene.y + 16}px`,
            background: '#8B5CF6',
            color: '#FFFFFF',
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
            zIndex: 55,
          }}
        >
          Absolute Mode (Alt Held)
        </div>
      )}

      {/* ── 3.4 SINGLE NODE SELECTION OVERLAY & HANDLES ── */}
      {selectedNodeIds.length === 1 &&
        selectedNodeIds.map((nodeId) => {
          const node = sceneGraph.nodes[nodeId];
          const rect = measuredRects[nodeId];
          if (!node || !rect) return null;

          const isCurrentDragging = interactionMode === 'dragging';
          const isCurrentResizing = interactionMode === 'resizing' && primarySelectedId === nodeId;
          const isCurrentRotating = interactionMode === 'rotating' && primarySelectedId === nodeId;

          let activeX = rect.x;
          let activeY = rect.y;
          let activeW = rect.width;
          let activeH = rect.height;
          let activeRot = node.geometry?.rotation || 0;

          if (isCurrentDragging) {
            activeX += transientDelta.x;
            activeY += transientDelta.y;
          } else if (isCurrentResizing && activeHandle) {
            if (activeHandle.includes('e')) activeW = Math.max(16, rect.width + transientDelta.x);
            if (activeHandle.includes('w')) {
              const clamped = Math.max(16, rect.width - transientDelta.x);
              activeX = rect.x + (rect.width - clamped);
              activeW = clamped;
            }
            if (activeHandle.includes('s')) activeH = Math.max(16, rect.height + transientDelta.y);
            if (activeHandle.includes('n')) {
              const clamped = Math.max(16, rect.height - transientDelta.y);
              activeY = rect.y + (rect.height - clamped);
              activeH = clamped;
            }
          } else if (isCurrentRotating) {
            activeRot = transientRotation;
          }

          return (
            <div
              key={`selection_${nodeId}`}
              id={`canvas-selection-${nodeId}`}
              style={{
                position: 'absolute',
                left: activeX,
                top: activeY,
                width: activeW,
                height: activeH,
                border: '1.5px solid rgba(59, 130, 246, 0.95)',
                boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.5), 0 0 12px rgba(59, 130, 246, 0.25)',
                pointerEvents: 'auto',
                cursor: 'move',
                zIndex: 35,
                transform: `rotate(${activeRot}deg)`,
                transformOrigin: 'center center',
                userSelect: 'none',
              }}
              onPointerDown={(e) => handleBoxPointerDown(e, nodeId)}
              onDoubleClick={(e) => {
                if (node.kind === 'text' || node.kind === 'richtext') {
                  e.stopPropagation();
                  setEditingNodeId(nodeId);
                }
              }}
            >
              {/* ── 8 RESIZE HANDLES (Crisp 6px squares) ── */}
              <div
                data-handle="nw"
                style={{ ...handleBaseStyle, top: '-3px', left: '-3px', cursor: 'nwse-resize' }}
                onPointerDown={(e) => handleHandlePointerDown(e, nodeId, 'nw')}
              />
              <div
                data-handle="n"
                style={{ ...handleBaseStyle, top: '-3px', left: 'calc(50% - 3px)', cursor: 'ns-resize' }}
                onPointerDown={(e) => handleHandlePointerDown(e, nodeId, 'n')}
              />
              <div
                data-handle="ne"
                style={{ ...handleBaseStyle, top: '-3px', right: '-3px', cursor: 'nesw-resize' }}
                onPointerDown={(e) => handleHandlePointerDown(e, nodeId, 'ne')}
              />
              <div
                data-handle="e"
                style={{ ...handleBaseStyle, top: 'calc(50% - 3px)', right: '-3px', cursor: 'ew-resize' }}
                onPointerDown={(e) => handleHandlePointerDown(e, nodeId, 'e')}
              />
              <div
                data-handle="se"
                style={{ ...handleBaseStyle, bottom: '-3px', right: '-3px', cursor: 'nwse-resize' }}
                onPointerDown={(e) => handleHandlePointerDown(e, nodeId, 'se')}
              />
              <div
                data-handle="s"
                style={{ ...handleBaseStyle, bottom: '-3px', left: 'calc(50% - 3px)', cursor: 'ns-resize' }}
                onPointerDown={(e) => handleHandlePointerDown(e, nodeId, 's')}
              />
              <div
                data-handle="sw"
                style={{ ...handleBaseStyle, bottom: '-3px', left: '-3px', cursor: 'nesw-resize' }}
                onPointerDown={(e) => handleHandlePointerDown(e, nodeId, 'sw')}
              />
              <div
                data-handle="w"
                style={{ ...handleBaseStyle, top: 'calc(50% - 3px)', left: '-3px', cursor: 'ew-resize' }}
                onPointerDown={(e) => handleHandlePointerDown(e, nodeId, 'w')}
              />

              {/* ── ROTATION HANDLE & STEM ── */}
              <div
                style={{
                  position: 'absolute',
                  top: '-20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '1px',
                  height: '20px',
                  background: '#DFBA6B',
                  pointerEvents: 'none',
                }}
              />
              <div
                data-handle="rotate"
                style={{
                  position: 'absolute',
                  top: '-30px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: '#090D1A',
                  border: '1.5px solid #DFBA6B',
                  cursor: 'grab',
                  zIndex: 45,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  fontWeight: 700,
                  color: '#DFBA6B',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                  userSelect: 'none',
                  touchAction: 'none',
                }}
                title="Drag to rotate (Shift to snap)"
                onPointerDown={(e) => handleHandlePointerDown(e, nodeId, 'rotate')}
              >
                ↻
              </div>

              {/* ── NODE LABEL & DIMENSIONS (Crisp pill badge) ── */}
              <div
                style={{
                  position: 'absolute',
                  top: '-22px',
                  left: 0,
                  background: '#DFBA6B',
                  color: '#090D1A',
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '3px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  pointerEvents: 'auto',
                  cursor: 'move',
                  zIndex: 46,
                  letterSpacing: '0.02em',
                }}
                title="Drag to move node"
                onPointerDown={(e) => handleBoxPointerDown(e, nodeId)}
              >
                <span>{(node.name || node.kind).toUpperCase()}</span>
                <span style={{ opacity: 0.7, fontWeight: 500 }}>
                  {Math.round(activeW)} × {Math.round(activeH)}
                </span>
                {activeRot !== 0 && (
                  <span style={{ fontWeight: 800 }}>{activeRot}°</span>
                )}
              </div>
            </div>
          );
        })}

      {/* ── 3.5 MULTI-SELECT GROUP BOUNDING BOX & HANDLES (Task 7) ── */}
      {selectedNodeIds.length > 1 && (() => {
        let gMinX = Infinity, gMinY = Infinity, gMaxX = -Infinity, gMaxY = -Infinity;
        selectedNodeIds.forEach((id) => {
          const r = measuredRects[id];
          if (r) {
            gMinX = Math.min(gMinX, r.x);
            gMinY = Math.min(gMinY, r.y);
            gMaxX = Math.max(gMaxX, r.x + r.width);
            gMaxY = Math.max(gMaxY, r.y + r.height);
          }
        });

        if (gMinX === Infinity || gMinY === Infinity) return null;

        const isDragging = interactionMode === 'dragging';
        let gX = gMinX + (isDragging ? transientDelta.x : 0);
        let gY = gMinY + (isDragging ? transientDelta.y : 0);
        let gW = gMaxX - gMinX;
        let gH = gMaxY - gMinY;

        if (interactionMode === 'resizing' && activeHandle) {
          if (activeHandle.includes('e')) gW = Math.max(16, gW + transientDelta.x);
          if (activeHandle.includes('w')) {
            const clamped = Math.max(16, gW - transientDelta.x);
            gX = gMinX + (gW - clamped);
            gW = clamped;
          }
          if (activeHandle.includes('s')) gH = Math.max(16, gH + transientDelta.y);
          if (activeHandle.includes('n')) {
            const clamped = Math.max(16, gH - transientDelta.y);
            gY = gMinY + (gH - clamped);
            gH = clamped;
          }
        }

        return (
          <React.Fragment>
            {/* Subtle dashed outline on each selected node */}
            {selectedNodeIds.map((id) => {
              const r = measuredRects[id];
              if (!r) return null;
              return (
                <div
                  key={`multi_sub_${id}`}
                  style={{
                    position: 'absolute',
                    left: r.x + (isDragging ? transientDelta.x : 0),
                    top: r.y + (isDragging ? transientDelta.y : 0),
                    width: r.width,
                    height: r.height,
                    border: '1px dashed rgba(59, 130, 246, 0.8)',
                    backgroundColor: 'rgba(59, 130, 246, 0.06)',
                    pointerEvents: 'none',
                    zIndex: 34,
                  }}
                />
              );
            })}

            {/* Unified Group Bounding Box with 8 Transform Handles */}
            {(() => {
              const primaryMultiId = selectedNodeIds[0] || '';
              return (
                <div
                  id="canvas-multiselect-group"
                  style={{
                    position: 'absolute',
                    left: gX,
                    top: gY,
                    width: gW,
                    height: gH,
                    border: '1.5px solid #3B82F6',
                    boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.4), 0 0 12px rgba(59, 130, 246, 0.3)',
                    pointerEvents: 'none',
                    zIndex: 36,
                    userSelect: 'none',
                  }}
                >
                  {/* 4 Border Drag Strips for multi-select moving */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '5px', cursor: 'move', pointerEvents: 'auto' }} onPointerDown={(e) => handleBoxPointerDown(e, primaryMultiId)} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '5px', cursor: 'move', pointerEvents: 'auto' }} onPointerDown={(e) => handleBoxPointerDown(e, primaryMultiId)} />
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '5px', cursor: 'move', pointerEvents: 'auto' }} onPointerDown={(e) => handleBoxPointerDown(e, primaryMultiId)} />
                  <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '5px', cursor: 'move', pointerEvents: 'auto' }} onPointerDown={(e) => handleBoxPointerDown(e, primaryMultiId)} />
                  {/* 8 Resize Handles */}
                  <div
                    data-handle="nw"
                    style={{ ...handleBaseStyle, top: '-3px', left: '-3px', cursor: 'nwse-resize' }}
                    onPointerDown={(e) => handleHandlePointerDown(e, primaryMultiId, 'nw')}
                  />
                  <div
                    data-handle="n"
                    style={{ ...handleBaseStyle, top: '-3px', left: 'calc(50% - 3px)', cursor: 'ns-resize' }}
                    onPointerDown={(e) => handleHandlePointerDown(e, primaryMultiId, 'n')}
                  />
                  <div
                    data-handle="ne"
                    style={{ ...handleBaseStyle, top: '-3px', right: '-3px', cursor: 'nesw-resize' }}
                    onPointerDown={(e) => handleHandlePointerDown(e, primaryMultiId, 'ne')}
                  />
                  <div
                    data-handle="e"
                    style={{ ...handleBaseStyle, top: 'calc(50% - 3px)', right: '-3px', cursor: 'ew-resize' }}
                    onPointerDown={(e) => handleHandlePointerDown(e, primaryMultiId, 'e')}
                  />
                  <div
                    data-handle="se"
                    style={{ ...handleBaseStyle, bottom: '-3px', right: '-3px', cursor: 'nwse-resize' }}
                    onPointerDown={(e) => handleHandlePointerDown(e, primaryMultiId, 'se')}
                  />
                  <div
                    data-handle="s"
                    style={{ ...handleBaseStyle, bottom: '-3px', left: 'calc(50% - 3px)', cursor: 'ns-resize' }}
                    onPointerDown={(e) => handleHandlePointerDown(e, primaryMultiId, 's')}
                  />
                  <div
                    data-handle="sw"
                    style={{ ...handleBaseStyle, bottom: '-3px', left: '-3px', cursor: 'nesw-resize' }}
                    onPointerDown={(e) => handleHandlePointerDown(e, primaryMultiId, 'sw')}
                  />
                  <div
                    data-handle="w"
                    style={{ ...handleBaseStyle, top: 'calc(50% - 3px)', left: '-3px', cursor: 'ew-resize' }}
                    onPointerDown={(e) => handleHandlePointerDown(e, primaryMultiId, 'w')}
                  />

                  {/* Rotation Stem & Handle */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '-20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '1px',
                      height: '20px',
                      background: '#3B82F6',
                      pointerEvents: 'none',
                    }}
                  />
                  <div
                    data-handle="rotate"
                    style={{
                      position: 'absolute',
                      top: '-30px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: '#090D1A',
                      border: '1.5px solid #3B82F6',
                      cursor: 'grab',
                      zIndex: 45,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9px',
                      fontWeight: 700,
                      color: '#3B82F6',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                      userSelect: 'none',
                    }}
                    title="Rotate Group"
                    onPointerDown={(e) => handleHandlePointerDown(e, primaryMultiId, 'rotate')}
                  >
                    ↻
                  </div>

                  {/* Group Info Badge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '-24px',
                      left: 0,
                      background: '#2563EB',
                      color: '#FFFFFF',
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    }}
                  >
                    <span>{selectedNodeIds.length} items</span>
                    <span style={{ opacity: 0.7 }}>
                      {Math.round(gW)} × {Math.round(gH)}
                    </span>
                  </div>
                </div>
              );
            })()}
          </React.Fragment>
        );
      })()}

      {/* ── 3.5 FIGMA-STYLE FLOATING CONTEXT BAR ── */}
      {primarySelectedId && primaryNode && measuredRects[primarySelectedId] && interactionMode === 'idle' && (
        <CanvasFloatingContextBar
          node={primaryNode}
          position={{
            x: measuredRects[primarySelectedId]!.x,
            y: measuredRects[primarySelectedId]!.y,
            width: measuredRects[primarySelectedId]!.width,
            height: measuredRects[primarySelectedId]!.height,
          }}
          zoom={zoom}
          onUpdateStyle={(patch) => {
            dispatch({
              type: 'SG_UPDATE_STYLE',
              sceneId,
              nodeId: primarySelectedId,
              patch,
            });
          }}
          onOpenMotion={() => onOpenMotion?.()}
          onOpenAi={(action) => onOpenAi?.(action)}
          onOpenRemix={() => onOpenRemix?.()}
          onCreateComponent={() => {
            dispatch({
              type: 'SG_CREATE_COMPONENT',
              sceneId,
              nodeId: primarySelectedId,
            });
          }}
        />
      )}

      {/* ── 4. INLINE TEXT EDIT OVERLAY ── */}
      {editingNodeId && measuredRects[editingNodeId] && sceneGraph.nodes[editingNodeId] && (
        <InlineEditOverlay
          sceneId={sceneId}
          nodeId={editingNodeId}
          node={sceneGraph.nodes[editingNodeId]!}
          rect={
            new DOMRect(
              measuredRects[editingNodeId]!.x,
              measuredRects[editingNodeId]!.y,
              measuredRects[editingNodeId]!.width,
              measuredRects[editingNodeId]!.height
            )
          }
          dispatch={dispatch}
          onClose={() => setEditingNodeId(null)}
        />
      )}

      {/* ── 5. MULTI-SELECTION ALIGNMENT TOOLBAR ── */}
      {selectedNodeIds.length >= 2 && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#090D1A',
            border: '1px solid rgba(223, 186, 107, 0.4)',
            borderRadius: '8px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            pointerEvents: 'auto',
            zIndex: 100,
            fontSize: '12px',
            color: '#FFFFFF',
            boxShadow: '0 12px 32px rgba(0,0,0,0.7)',
          }}
        >
          <span
            style={{
              color: '#DFBA6B',
              fontWeight: 700,
              fontSize: '11px',
              paddingRight: '6px',
              borderRight: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {selectedNodeIds.length} Selected
          </span>
          <button
            title="Align Left"
            onClick={() => {
              const nodes = selectedNodeIds
                .map((id) => sceneGraph.nodes[id])
                .filter(Boolean) as SceneGraphNode[];
              const patches = AlignmentEngine.alignLeft(nodes);
              patches.forEach((p, idx) => onUpdateGeometry(selectedNodeIds[idx]!, p));
            }}
            style={{
              padding: '4px',
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            ⇤
          </button>
          <button
            title="Align Center"
            onClick={() => {
              const nodes = selectedNodeIds
                .map((id) => sceneGraph.nodes[id])
                .filter(Boolean) as SceneGraphNode[];
              const bounds: BoundingBox[] = selectedNodeIds.map((id) => ({
                id,
                x: measuredRects[id]?.x ?? 0,
                y: measuredRects[id]?.y ?? 0,
                width: measuredRects[id]?.width ?? 100,
                height: measuredRects[id]?.height ?? 100,
              }));
              const patches = AlignmentEngine.alignCenter(nodes, bounds);
              patches.forEach((p, idx) => onUpdateGeometry(selectedNodeIds[idx]!, p));
            }}
            style={{
              padding: '4px',
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            ⇥⇤
          </button>
          <button
            title="Group Nodes"
            onClick={() => dispatch({ type: 'SG_GROUP_NODES', sceneId, nodeIds: selectedNodeIds })}
            style={{
              padding: '3px 8px',
              background: '#DFBA6B',
              color: '#000000',
              fontWeight: 700,
              borderRadius: '4px',
              fontSize: '10px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Group
          </button>
        </div>
      )}

      {/* ── 6. INTERACTION DEBUG HUD (Behind Expert / Debug Mode) ── */}
      {showDebug && (
        <div
          id="orbitox-interaction-debug-hud"
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'rgba(11, 16, 33, 0.92)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '8px',
          padding: '10px 12px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          pointerEvents: 'auto',
          zIndex: 90,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: '10px',
          color: 'rgba(255, 255, 255, 0.85)',
          width: '210px',
          backdropFilter: 'blur(12px)',
          userSelect: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            paddingBottom: '4px',
            color: '#DFBA6B',
            fontWeight: 700,
          }}
        >
          <span>Interaction Debug</span>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#22C55E',
              display: 'inline-block',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Pointer:</span>
          <span>
            ({Math.round(pointerClient.x)}, {Math.round(pointerClient.y)})
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Scene:</span>
          <span>
            ({Math.round(pointerScene.x)}, {Math.round(pointerScene.y)})
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Zoom:</span>
          <span style={{ color: '#67E8F9' }}>{Math.round(zoom * 100)}%</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Selected:</span>
          <span
            style={{
              color: '#93C5FD',
              maxWidth: '120px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={primarySelectedId || 'none'}
          >
            {primarySelectedId || 'none'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Mode:</span>
          <span style={{ color: '#FDE047' }}>
            {primaryNode?.geometry?.position === 'absolute' ? 'FREEFORM' : 'AUTO LAYOUT'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>State:</span>
          <span
            style={{
              color: interactionMode !== 'idle' ? '#4ADE80' : 'rgba(255, 255, 255, 0.5)',
              fontWeight: interactionMode !== 'idle' ? 700 : 400,
              textTransform: 'uppercase',
            }}
          >
            {interactionMode}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Capture:</span>
          <span>{hasPointerCapture ? 'YES' : 'NO'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Drop Target:</span>
          <span
            style={{
              color: '#C084FC',
              maxWidth: '100px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {dropTargetId || 'NONE'}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            paddingTop: '4px',
          }}
        >
          <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Last Cmd:</span>
          <span
            style={{
              color: '#DFBA6B',
              maxWidth: '110px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {lastCommand}
          </span>
        </div>
      </div>
      )}
    </div>
  );
}
