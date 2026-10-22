'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Copy,
  Scissors,
  Clipboard,
  Layers,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  Plus,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  Check,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { TemplateEditorCommand } from '../../engine/TemplateEditorCommands';
import { SceneGraph, SceneGraphNode } from '../../engine/SceneGraphTypes';
import { SceneGraphClipboard } from '../../engine/SceneGraphClipboard';

export type ContextMenuType =
  | 'canvas'
  | 'node'
  | 'image'
  | 'frame'
  | 'section'
  | 'component'
  | 'multi_node'
  | 'layer_tree';

export interface ContextMenuState {
  isOpen: boolean;
  type: ContextMenuType;
  sceneId: string;
  clientPosition: { x: number; y: number };
  scenePosition: { x: number; y: number };
  targetNodeId?: string | null;
  targetNodeIds?: string[];
  targetSectionId?: string | null;
}

interface CanvasContextMenuProps {
  state: ContextMenuState;
  onClose: () => void;
  dispatch: (command: TemplateEditorCommand) => void;
  sceneGraph?: SceneGraph | null;
  onZoomFit?: () => void;
  onSelectNode?: (nodeId: string) => void;
}

export function CanvasContextMenu({
  state,
  onClose,
  dispatch,
  sceneGraph,
  onZoomFit,
  onSelectNode,
}: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [codeCopiedToast, setCodeCopiedToast] = useState<string | null>(null);

  // Close on Escape or click outside
  useEffect(() => {
    if (!state.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!menuRef.current) return;
        const items = Array.from(
          menuRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]:not([data-disabled="true"])')
        );
        if (items.length === 0) return;
        const currentIndex = items.indexOf(document.activeElement as HTMLElement);
        let nextIndex = 0;
        if (e.key === 'ArrowDown') {
          nextIndex = currentIndex >= 0 && currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        }
        items[nextIndex]?.focus();
        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        if (document.activeElement && menuRef.current?.contains(document.activeElement)) {
          e.preventDefault();
          (document.activeElement as HTMLElement).click();
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [state.isOpen, onClose]);

  // Adjust positioning to stay within viewport bounds
  const [menuPos, setMenuPos] = useState({ top: state.clientPosition.y, left: state.clientPosition.x });

  useEffect(() => {
    if (!state.isOpen || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    let left = state.clientPosition.x;
    let top = state.clientPosition.y;

    if (left + rect.width > window.innerWidth - 12) {
      left = Math.max(12, left - rect.width);
    }
    if (top + rect.height > window.innerHeight - 12) {
      top = Math.max(12, top - rect.height);
    }

    setMenuPos({ top, left });
  }, [state.isOpen, state.clientPosition]);

  const targetNode = state.targetNodeId && sceneGraph ? sceneGraph.nodes[state.targetNodeId] : null;

  // Build ancestral layer list for "Select Layer" submenu
  const buildLayerHierarchy = useCallback((): SceneGraphNode[] => {
    if (!sceneGraph || !targetNode) return [];
    const list: SceneGraphNode[] = [];
    let curr: SceneGraphNode | undefined = targetNode;
    while (curr) {
      list.push(curr);
      if (curr.parentId && sceneGraph.nodes[curr.parentId]) {
        curr = sceneGraph.nodes[curr.parentId];
      } else {
        break;
      }
    }
    return list.reverse(); // From top container down to selected child
  }, [sceneGraph, targetNode]);

  if (!state.isOpen) return null;

  const executeAction = (fn: () => void) => {
    fn();
    onClose();
  };

  const handleCopyCode = (format: 'jsx' | 'html' | 'svg' | 'json') => {
    if (!sceneGraph || !state.targetNodeId) return;
    SceneGraphClipboard.copyAsCode(sceneGraph, state.targetNodeId, format);
    setCodeCopiedToast(`Copied as ${format.toUpperCase()}`);
    setTimeout(() => {
      setCodeCopiedToast(null);
      onClose();
    }, 600);
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Context Menu"
      style={{
        position: 'fixed',
        top: `${menuPos.top}px`,
        left: `${menuPos.left}px`,
        zIndex: 999999,
        minWidth: '220px',
        maxWidth: '260px',
        background: 'rgba(11, 15, 25, 0.94)',
        backdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '10px',
        boxShadow: '0 20px 48px -8px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        padding: '5px',
        color: '#E2E8F0',
        fontSize: '0.78rem',
        fontWeight: 450,
        letterSpacing: '0.01em',
        userSelect: 'none',
        animation: 'orbitoxMenuFadeIn 0.12s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Toast Notification */}
      {codeCopiedToast && (
        <div
          style={{
            position: 'absolute',
            top: '-32px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#10B981',
            color: '#FFFFFF',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Check size={12} />
          <span>{codeCopiedToast}</span>
        </div>
      )}

      {/* ── CONTEXT: SINGLE NODE / IMAGE / FRAME / COMPONENT / LAYER TREE ── */}
      {(state.type === 'node' || state.type === 'image' || state.type === 'frame' || state.type === 'component' || state.type === 'layer_tree') && targetNode && (
        <>
          {/* Header indicator */}
          <div
            style={{
              padding: '4px 8px 6px 8px',
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.45)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
              {targetNode.name}
            </span>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#DFBA6B' }}>
              {targetNode.kind}
            </span>
          </div>

          {/* Specialized Image & Media Actions */}
          {(targetNode.kind === 'image' || targetNode.kind === 'video' || state.type === 'image') && (
            <>
              <MenuItem
                icon={<RefreshCw size={13} />}
                label="Replace Asset..."
                shortcut="⌥⌘R"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = targetNode.kind === 'video' ? 'video/*' : 'image/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const url = URL.createObjectURL(file);
                      dispatch({
                        type: 'SG_UPDATE_NODE_PROPERTY',
                        sceneId: state.sceneId,
                        nodeId: targetNode.id,
                        patch: { props: { ...(targetNode.props || {}), src: url } },
                      });
                    }
                  };
                  input.click();
                  onClose();
                }}
              />
              <MenuItem
                icon={<Maximize2 size={13} />}
                label="Fill Mode: Cover"
                onClick={() => executeAction(() => dispatch({
                  type: 'SG_UPDATE_NODE_PROPERTY',
                  sceneId: state.sceneId,
                  nodeId: targetNode.id,
                  patch: { style: { ...targetNode.style, objectFit: 'cover' } },
                }))}
              />
              <MenuDivider />
            </>
          )}

          <MenuItem
            icon={<Scissors size={13} />}
            label="Cut"
            shortcut="⌘X"
            onClick={() => executeAction(() => dispatch({ type: 'SG_CUT_NODES', sceneId: state.sceneId, nodeIds: [targetNode.id] }))}
          />
          <MenuItem
            icon={<Copy size={13} />}
            label="Copy"
            shortcut="⌘C"
            onClick={() => executeAction(() => dispatch({ type: 'SG_COPY_NODES', sceneId: state.sceneId, nodeIds: [targetNode.id] }))}
          />

          {/* Copy As Code Submenu */}
          <div
            onMouseEnter={() => setActiveSubmenu('copy_code')}
            onMouseLeave={() => setActiveSubmenu(null)}
            style={{ position: 'relative' }}
          >
            <MenuItem
              icon={<Code size={13} />}
              label="Copy as Code"
              hasSubmenu
              dataId="menu-item-copy-as-code"
              active={activeSubmenu === 'copy_code'}
              onClick={() => setActiveSubmenu((prev) => (prev === 'copy_code' ? null : 'copy_code'))}
            />
            {activeSubmenu === 'copy_code' && (
              <SubmenuContainer alignLeft={menuPos.left > window.innerWidth - 480}>
                <MenuItem dataId="menu-item-copy-jsx" label="React / JSX Component" onClick={() => handleCopyCode('jsx')} />
                <MenuItem dataId="menu-item-copy-html" label="HTML5 & Scoped CSS" onClick={() => handleCopyCode('html')} />
                <MenuItem dataId="menu-item-copy-svg" label="SVG Vector Markup" onClick={() => handleCopyCode('svg')} />
                <MenuItem dataId="menu-item-copy-json" label="JSON SceneGraph AST" onClick={() => handleCopyCode('json')} />
              </SubmenuContainer>
            )}
          </div>

          <MenuItem
            icon={<Clipboard size={13} />}
            label="Paste"
            shortcut="⌘V"
            disabled={!SceneGraphClipboard.hasClipboard()}
            onClick={() => executeAction(() => {
              const isContainer = ['frame', 'stack', 'section', 'grid', 'group', 'container'].includes(targetNode.kind);
              const targetParentId = isContainer ? targetNode.id : (targetNode.parentId || sceneGraph?.rootNodeId || 'root');
              dispatch({ type: 'SG_PASTE_NODES', sceneId: state.sceneId, targetParentId });
            })}
          />
          <MenuItem
            icon={<Clipboard size={13} />}
            label="Paste to Replace"
            shortcut="⌥⌘V"
            disabled={!SceneGraphClipboard.hasClipboard()}
            onClick={() => executeAction(() => dispatch({ type: 'SG_PASTE_REPLACE', sceneId: state.sceneId, targetNodeId: targetNode.id }))}
          />
          <MenuItem
            icon={<Copy size={13} />}
            label="Copy Styles"
            shortcut="⌥⌘C"
            onClick={() => executeAction(() => {
              if (sceneGraph) {
                SceneGraphClipboard.copy(sceneGraph, [targetNode.id], state.sceneId);
                setCodeCopiedToast('Styles Copied');
                setTimeout(() => setCodeCopiedToast(null), 800);
              }
            })}
          />
          <MenuItem
            icon={<Zap size={13} />}
            label="Paste Styles Only"
            shortcut="⌥⇧⌘V"
            disabled={!SceneGraphClipboard.hasClipboard()}
            onClick={() => executeAction(() => dispatch({ type: 'SG_PASTE_STYLES', sceneId: state.sceneId, targetNodeId: targetNode.id }))}
          />

          <MenuDivider />

          <MenuItem
            icon={<Layers size={13} />}
            label="Wrap in Frame / Stack"
            shortcut="⌥⌘G"
            onClick={() => executeAction(() => dispatch({ type: 'SG_WRAP_NODES', sceneId: state.sceneId, nodeIds: [targetNode.id], wrapperKind: 'frame' }))}
          />
          <MenuItem
            icon={<Layers size={13} />}
            label="Group Selection"
            shortcut="⌘G"
            onClick={() => executeAction(() => dispatch({ type: 'SG_GROUP_NODES', sceneId: state.sceneId, nodeIds: [targetNode.id] }))}
          />
          <MenuItem
            icon={<Zap size={13} />}
            label="Create Component"
            shortcut="⌥⌘K"
            onClick={() => executeAction(() => dispatch({ type: 'SG_CREATE_COMPONENT', sceneId: state.sceneId, nodeId: targetNode.id }))}
          />

          {Boolean(targetNode.component?.masterComponentId) && (
            <>
              <MenuDivider />
              <MenuItem
                icon={<Zap size={13} />}
                label="Push Overrides to Master"
                onClick={() => executeAction(() => dispatch({ type: 'SG_PUSH_INSTANCE_TO_MASTER', sceneId: state.sceneId, instanceNodeId: targetNode.id }))}
              />
              <MenuItem
                icon={<Zap size={13} />}
                label="Reset All Overrides"
                onClick={() => executeAction(() => dispatch({ type: 'SG_RESET_INSTANCE_OVERRIDES', sceneId: state.sceneId, instanceNodeId: targetNode.id }))}
              />
              <MenuItem
                icon={<Scissors size={13} />}
                label="Detach Instance"
                shortcut="⌥⌘B"
                onClick={() => executeAction(() => dispatch({ type: 'SG_DETACH_INSTANCE', sceneId: state.sceneId, nodeId: targetNode.id }))}
              />
            </>
          )}

          <MenuDivider />

          <MenuItem
            icon={<Copy size={13} />}
            label="Duplicate"
            shortcut="⌘D"
            onClick={() => executeAction(() => dispatch({ type: 'SG_DUPLICATE_NODE', sceneId: state.sceneId, nodeId: targetNode.id }))}
          />
          <MenuItem
            icon={<Trash2 size={13} />}
            label="Delete"
            shortcut="⌫"
            danger
            onClick={() => executeAction(() => dispatch({ type: 'SG_DELETE_NODE', sceneId: state.sceneId, nodeId: targetNode.id }))}
          />

          <MenuDivider />

          {/* Select Layer Drill-down */}
          <div
            onMouseEnter={() => setActiveSubmenu('select_layer')}
            onMouseLeave={() => setActiveSubmenu(null)}
            style={{ position: 'relative' }}
          >
            <MenuItem
              icon={<Layers size={13} />}
              label="Select Layer"
              hasSubmenu
              dataId="menu-item-select-layer"
              active={activeSubmenu === 'select_layer'}
              onClick={() => setActiveSubmenu((prev) => (prev === 'select_layer' ? null : 'select_layer'))}
            />
            {activeSubmenu === 'select_layer' && (
              <SubmenuContainer minWidth="240px" alignLeft={menuPos.left > window.innerWidth - 480}>
                <div style={{ padding: '4px 8px', fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600 }}>
                  LAYER STACK UNDER CURSOR
                </div>
                {buildLayerHierarchy().map((node, i) => (
                  <MenuItem
                    key={node.id}
                    dataId={`menu-item-layer-${node.id}`}
                    label={`${'  '.repeat(i)}${i > 0 ? '↳ ' : ''}${node.name}`}
                    active={node.id === targetNode.id}
                    onClick={() => {
                      onSelectNode?.(node.id);
                      onClose();
                    }}
                  />
                ))}
              </SubmenuContainer>
            )}
          </div>

          <MenuDivider />

          {/* Layer Arrangement */}
          <MenuItem
            icon={<ArrowUp size={13} />}
            label="Bring to Front"
            shortcut="]"
            onClick={() => executeAction(() => dispatch({ type: 'SG_REORDER_NODE_FRONT', sceneId: state.sceneId, nodeId: targetNode.id }))}
          />
          <MenuItem
            icon={<ArrowUp size={13} />}
            label="Bring Forward"
            shortcut="⌘]"
            onClick={() => executeAction(() => dispatch({ type: 'SG_REORDER_NODE', sceneId: state.sceneId, nodeId: targetNode.id, direction: 'up' }))}
          />
          <MenuItem
            icon={<ArrowDown size={13} />}
            label="Send Backward"
            shortcut="⌘["
            onClick={() => executeAction(() => dispatch({ type: 'SG_REORDER_NODE', sceneId: state.sceneId, nodeId: targetNode.id, direction: 'down' }))}
          />
          <MenuItem
            icon={<ArrowDown size={13} />}
            label="Send to Back"
            shortcut="["
            onClick={() => executeAction(() => dispatch({ type: 'SG_REORDER_NODE_BACK', sceneId: state.sceneId, nodeId: targetNode.id }))}
          />

          <MenuDivider />

          <MenuItem
            icon={targetNode.locked ? <Unlock size={13} /> : <Lock size={13} />}
            label={targetNode.locked ? 'Unlock Layer' : 'Lock Layer'}
            shortcut="⌘L"
            onClick={() => executeAction(() => dispatch({ type: 'SG_LOCK_NODE', sceneId: state.sceneId, nodeId: targetNode.id, locked: !targetNode.locked }))}
          />
          <MenuItem
            icon={targetNode.hidden ? <Eye size={13} /> : <EyeOff size={13} />}
            label={targetNode.hidden ? 'Show Layer' : 'Hide Layer'}
            shortcut="⌘⇧H"
            onClick={() => executeAction(() => dispatch({ type: 'SG_HIDE_NODE', sceneId: state.sceneId, nodeId: targetNode.id, hidden: !targetNode.hidden }))}
          />
        </>
      )}

      {/* ── CONTEXT: MULTI SELECTION ── */}
      {state.type === 'multi_node' && state.targetNodeIds && state.targetNodeIds.length > 1 && (
        <>
          <div
            style={{
              padding: '4px 8px 6px 8px',
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.45)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
              marginBottom: '4px',
            }}
          >
            {state.targetNodeIds.length} Layers Selected
          </div>

          <MenuItem
            icon={<Layers size={13} />}
            label="Group Selection"
            shortcut="⌘G"
            onClick={() => executeAction(() => dispatch({ type: 'SG_GROUP_NODES', sceneId: state.sceneId, nodeIds: state.targetNodeIds! }))}
          />
          <MenuItem
            icon={<Layers size={13} />}
            label="Wrap in Frame / Stack"
            shortcut="⌥⌘G"
            onClick={() => executeAction(() => dispatch({ type: 'SG_WRAP_NODES', sceneId: state.sceneId, nodeIds: state.targetNodeIds!, wrapperKind: 'frame' }))}
          />

          <MenuDivider />

          {/* Alignment Submenu */}
          <div
            onMouseEnter={() => setActiveSubmenu('align')}
            onMouseLeave={() => setActiveSubmenu(null)}
            style={{ position: 'relative' }}
          >
            <MenuItem icon={<AlignCenter size={13} />} label="Align" hasSubmenu active={activeSubmenu === 'align'} />
            {activeSubmenu === 'align' && (
              <SubmenuContainer>
                <MenuItem label="Align Left" shortcut="⌥A" onClick={() => executeAction(() => dispatch({ type: 'SG_ALIGN_NODES', sceneId: state.sceneId, nodeIds: state.targetNodeIds!, alignment: 'left' }))} />
                <MenuItem label="Align Center" shortcut="⌥H" onClick={() => executeAction(() => dispatch({ type: 'SG_ALIGN_NODES', sceneId: state.sceneId, nodeIds: state.targetNodeIds!, alignment: 'center' }))} />
                <MenuItem label="Align Right" shortcut="⌥D" onClick={() => executeAction(() => dispatch({ type: 'SG_ALIGN_NODES', sceneId: state.sceneId, nodeIds: state.targetNodeIds!, alignment: 'right' }))} />
                <MenuDivider />
                <MenuItem label="Align Top" shortcut="⌥W" onClick={() => executeAction(() => dispatch({ type: 'SG_ALIGN_NODES', sceneId: state.sceneId, nodeIds: state.targetNodeIds!, alignment: 'top' }))} />
                <MenuItem label="Align Middle" shortcut="⌥V" onClick={() => executeAction(() => dispatch({ type: 'SG_ALIGN_NODES', sceneId: state.sceneId, nodeIds: state.targetNodeIds!, alignment: 'middle' }))} />
                <MenuItem label="Align Bottom" shortcut="⌥S" onClick={() => executeAction(() => dispatch({ type: 'SG_ALIGN_NODES', sceneId: state.sceneId, nodeIds: state.targetNodeIds!, alignment: 'bottom' }))} />
              </SubmenuContainer>
            )}
          </div>

          {/* Distribute Submenu */}
          <div
            onMouseEnter={() => setActiveSubmenu('distribute')}
            onMouseLeave={() => setActiveSubmenu(null)}
            style={{ position: 'relative' }}
          >
            <MenuItem icon={<AlignLeft size={13} />} label="Distribute" hasSubmenu active={activeSubmenu === 'distribute'} />
            {activeSubmenu === 'distribute' && (
              <SubmenuContainer>
                <MenuItem label="Distribute Horizontally" shortcut="⌃⌥H" onClick={() => executeAction(() => dispatch({ type: 'SG_DISTRIBUTE_NODES', sceneId: state.sceneId, nodeIds: state.targetNodeIds!, axis: 'horizontal' }))} />
                <MenuItem label="Distribute Vertically" shortcut="⌃⌥V" onClick={() => executeAction(() => dispatch({ type: 'SG_DISTRIBUTE_NODES', sceneId: state.sceneId, nodeIds: state.targetNodeIds!, axis: 'vertical' }))} />
              </SubmenuContainer>
            )}
          </div>

          <MenuDivider />

          <MenuItem
            icon={<Copy size={13} />}
            label="Copy Selection"
            shortcut="⌘C"
            onClick={() => executeAction(() => dispatch({ type: 'SG_COPY_NODES', sceneId: state.sceneId, nodeIds: state.targetNodeIds! }))}
          />
          <MenuItem
            icon={<Trash2 size={13} />}
            label="Delete Selection"
            shortcut="⌫"
            danger
            onClick={() => executeAction(() => dispatch({ type: 'SG_MULTI_DELETE', sceneId: state.sceneId, nodeIds: state.targetNodeIds! }))}
          />
        </>
      )}

      {/* ── CONTEXT: CANVAS BACKGROUND ── */}
      {state.type === 'canvas' && (
        <>
          <MenuItem
            icon={<Clipboard size={13} />}
            label="Paste"
            shortcut="⌘V"
            disabled={!SceneGraphClipboard.hasClipboard()}
            onClick={() => executeAction(() => dispatch({ type: 'SG_PASTE_NODES', sceneId: state.sceneId, targetParentId: sceneGraph?.rootNodeId || 'root' }))}
          />
          <MenuItem
            icon={<Clipboard size={13} />}
            label="Paste Here"
            shortcut="⌥⇧⌘V"
            disabled={!SceneGraphClipboard.hasClipboard()}
            onClick={() => executeAction(() => dispatch({
              type: 'SG_PASTE_AT_COORDINATES',
              sceneId: state.sceneId,
              x: state.scenePosition.x,
              y: state.scenePosition.y,
            }))}
          />

          <MenuDivider />

          <MenuItem
            icon={<Maximize2 size={13} />}
            label="Select All"
            shortcut="⌘A"
            onClick={() => executeAction(() => dispatch({ type: 'SELECT_ALL_NODES', sceneId: state.sceneId }))}
          />
          <MenuItem
            icon={<Plus size={13} />}
            label="Add Section Block"
            shortcut="A"
            onClick={() => executeAction(() => dispatch({ type: 'CREATE_SCENE', name: 'New Section', preset: 'blank' }))}
          />

          <MenuDivider />

          <MenuItem
            icon={<Maximize2 size={13} />}
            label="Zoom to Fit"
            shortcut="⌘0"
            onClick={() => executeAction(() => onZoomFit?.())}
          />
        </>
      )}

      {/* ── CONTEXT: SECTION ── */}
      {state.type === 'section' && state.targetSectionId && (
        <>
          <MenuItem
            icon={<Copy size={13} />}
            label="Duplicate Section"
            shortcut="⌘D"
            onClick={() => executeAction(() => dispatch({ type: 'DUPLICATE_SECTION', sectionId: state.targetSectionId! }))}
          />
          <MenuItem
            icon={<ArrowUp size={13} />}
            label="Move Section Up"
            shortcut="⌥↑"
            onClick={() => executeAction(() => dispatch({ type: 'MOVE_SECTION', sectionId: state.targetSectionId!, direction: 'up' }))}
          />
          <MenuItem
            icon={<ArrowDown size={13} />}
            label="Move Section Down"
            shortcut="⌥↓"
            onClick={() => executeAction(() => dispatch({ type: 'MOVE_SECTION', sectionId: state.targetSectionId!, direction: 'down' }))}
          />
          <MenuDivider />
          <MenuItem
            icon={<Plus size={13} />}
            label="Insert Section Above"
            onClick={() => executeAction(() => dispatch({ type: 'CREATE_SCENE', name: 'New Section Above', preset: 'blank' }))}
          />
          <MenuItem
            icon={<Plus size={13} />}
            label="Insert Section Below"
            onClick={() => executeAction(() => dispatch({ type: 'CREATE_SCENE', name: 'New Section Below', preset: 'blank' }))}
          />
          <MenuItem
            icon={<Zap size={13} />}
            label="Save Section to Library"
            onClick={() => executeAction(() => {
              setCodeCopiedToast('Section Saved to Reusable Library');
              setTimeout(() => setCodeCopiedToast(null), 1000);
            })}
          />
          <MenuDivider />
          <MenuItem
            icon={<Trash2 size={13} />}
            label="Delete Section"
            danger
            onClick={() => executeAction(() => dispatch({ type: 'DELETE_SECTION', sectionId: state.targetSectionId! }))}
          />
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Subcomponents & Helpers
// ─────────────────────────────────────────────────────────────

interface MenuItemProps {
  icon?: React.ReactNode;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  hasSubmenu?: boolean;
  active?: boolean;
  onClick?: () => void;
  dataId?: string;
}

function MenuItem({
  icon,
  label,
  shortcut,
  disabled = false,
  danger = false,
  hasSubmenu = false,
  active = false,
  onClick,
  dataId,
}: MenuItemProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      role="menuitem"
      tabIndex={disabled ? -1 : 0}
      id={dataId}
      data-menu-item={dataId}
      data-disabled={disabled ? 'true' : 'false'}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 8px',
        borderRadius: '6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        background: active || hovered ? (danger ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.25)') : 'transparent',
        color: danger ? '#F87171' : active || hovered ? '#FFFFFF' : '#E2E8F0',
        transition: 'background 0.1s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {icon && <span style={{ opacity: 0.85, display: 'flex', alignItems: 'center' }}>{icon}</span>}
        <span>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {shortcut && (
          <span style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.4)', fontFamily: 'monospace' }}>
            {shortcut}
          </span>
        )}
        {hasSubmenu && <ChevronRight size={12} style={{ opacity: 0.5 }} />}
      </div>
    </div>
  );
}

function MenuDivider() {
  return <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '4px 0' }} />;
}

function SubmenuContainer({
  children,
  minWidth = '180px',
  alignLeft = false,
}: {
  children: React.ReactNode;
  minWidth?: string;
  alignLeft?: boolean;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: alignLeft ? 'auto' : '100%',
        right: alignLeft ? '100%' : 'auto',
        marginLeft: alignLeft ? 0 : '4px',
        marginRight: alignLeft ? '4px' : 0,
        minWidth,
        background: 'rgba(11, 15, 25, 0.95)',
        backdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '10px',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8)',
        padding: '5px',
        zIndex: 1000000,
        animation: 'orbitoxMenuFadeIn 0.1s ease-out',
      }}
    >
      {children}
    </div>
  );
}
