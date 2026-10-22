'use client';

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Copy,
  Trash2,
  ChevronRight,
  ChevronDown,
  Type,
  Square,
  Image as ImageIcon,
  Play,
  Columns,
  Grid,
  Box,
  Component as ComponentIcon,
  X,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { SceneGraph, SceneGraphNode, SceneNodeKind } from '@/components/template-studio/engine/SceneGraphTypes';
import { TemplateSceneDefinition } from '@/components/template-studio/types/TemplateSchema';

interface LayersPanelProps {
  sceneGraph?: SceneGraph;
  scenes?: TemplateSceneDefinition[];
  activeSceneId?: string;
  onSelectScene?: (sceneId: string) => void;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onToggleLock: (nodeId: string) => void;
  onToggleHide: (nodeId: string) => void;
  onDuplicateNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onRenameNode: (nodeId: string, newName: string) => void;
  onReorderNode: (nodeId: string, direction: 'up' | 'down') => void;
  onClose: () => void;
}

export function LayersPanel({
  sceneGraph,
  scenes,
  activeSceneId,
  onSelectScene,
  selectedNodeId,
  onSelectNode,
  onToggleLock,
  onToggleHide,
  onDuplicateNode,
  onDeleteNode,
  onRenameNode,
  onReorderNode,
  onClose,
}: LayersPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  const nodes = sceneGraph?.nodes || {};
  const rootNodeId = sceneGraph?.rootNodeId;

  // Toggle collapse state
  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStartRename = (node: SceneGraphNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNodeId(node.id);
    setEditName(node.name || node.kind);
  };

  const handleSaveRename = (nodeId: string) => {
    if (editName.trim()) {
      onRenameNode(nodeId, editName.trim());
    }
    setEditingNodeId(null);
  };

  // Node Kind Icon Helper
  const getNodeIcon = (node: SceneGraphNode) => {
    if (node.component?.isMaster) {
      return <span style={{ color: '#A78BFA', fontWeight: 700, fontSize: '0.82rem', lineHeight: 1 }}>❖</span>;
    }
    if (node.component?.masterComponentId && !node.component?.isMaster) {
      return <span style={{ color: '#60A5FA', fontWeight: 700, fontSize: '0.82rem', lineHeight: 1 }}>◇</span>;
    }
    switch (node.kind) {
      case 'text':
        return <Type size={13} style={{ color: '#60A5FA' }} />;
      case 'frame':
        return <Square size={13} style={{ color: '#A78BFA' }} />;
      case 'image':
        return <ImageIcon size={13} style={{ color: '#F472B6' }} />;
      case 'video':
        return <Play size={13} style={{ color: '#34D399' }} />;
      case 'stack':
        return <Columns size={13} style={{ color: '#FBBF24' }} />;
      case 'grid':
        return <Grid size={13} style={{ color: '#38BDF8' }} />;
      case 'smart':
        return <ComponentIcon size={13} style={{ color: '#F87171' }} />;
      default:
        return <Box size={13} style={{ color: '#9CA3AF' }} />;
    }
  };

  // Recursive tree renderer
  const renderNodeTree = (nodeId: string, nodeMap: Record<string, SceneGraphNode> = nodes, depth = 0): React.ReactNode => {
    const node = nodeMap[nodeId];
    if (!node) return null;

    // Search filter: hide if query is set and node/children don't match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesSelf = (node.name || '').toLowerCase().includes(q) || node.kind.toLowerCase().includes(q);
      const childMatches = (node.children || []).some((cId: string) => {
        const c = nodeMap[cId];
        return c && ((c.name || '').toLowerCase().includes(q) || c.kind.toLowerCase().includes(q));
      });
      if (!matchesSelf && !childMatches) return null;
    }

    const isSelected = selectedNodeId === nodeId;
    const hasChildren = node.children && node.children.length > 0;
    const isCollapsed = collapsedNodes.has(nodeId);

    return (
      <div key={nodeId} style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Layer Item Row */}
        <div
          id={`sz-layer-item-${nodeId}`}
          data-layer-id={nodeId}
          className="sz-layer-item-row"
          onClick={() => onSelectNode(nodeId)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '5px 8px',
            paddingLeft: `${depth * 14 + 8}px`,
            background: isSelected ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
            borderLeft: isSelected ? '2px solid #3B82F6' : '2px solid transparent',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.1s ease',
            opacity: node.hidden ? 0.4 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
          }}
          onMouseLeave={(e) => {
            if (!isSelected) e.currentTarget.style.background = 'transparent';
          }}
        >
          {/* Left: Collapse toggle + Kind Icon + Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
            {hasChildren ? (
              <button
                onClick={(e) => toggleCollapse(nodeId, e)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9CA3AF',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              </button>
            ) : (
              <div style={{ width: '12px' }} />
            )}

            <div style={{ display: 'flex', alignItems: 'center' }}>{getNodeIcon(node)}</div>

            {/* Inline renaming or display */}
            {editingNodeId === nodeId ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => handleSaveRename(nodeId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename(nodeId);
                  if (e.key === 'Escape') setEditingNodeId(null);
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: '#1F2229',
                  border: '1px solid #3B82F6',
                  borderRadius: '3px',
                  color: '#FFFFFF',
                  fontSize: '0.74rem',
                  padding: '1px 4px',
                  outline: 'none',
                  width: '120px',
                }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                <span
                  onDoubleClick={(e) => handleStartRename(node, e)}
                  title="Double click to rename"
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? '#FFFFFF' : '#D1D5DB',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {node.name || node.kind}
                </span>
                {node.component?.masterComponentId && !node.component?.isMaster && node.component.instanceOverrides && Object.keys(node.component.instanceOverrides).length > 0 && (
                  <span
                    id={`sz-layer-override-${nodeId}`}
                    title={`${Object.keys(node.component.instanceOverrides).length} overrides`}
                    style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: '#FBBF24',
                      flexShrink: 0,
                    }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Right: Quick Actions (Hide, Lock, Duplicate, Delete) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              opacity: isSelected ? 1 : 0.6,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Reorder Up / Down */}
            {isSelected && (
              <>
                <button
                  onClick={() => onReorderNode(nodeId, 'up')}
                  title="Move Up"
                  style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '2px' }}
                >
                  <ArrowUp size={11} />
                </button>
                <button
                  onClick={() => onReorderNode(nodeId, 'down')}
                  title="Move Down"
                  style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '2px' }}
                >
                  <ArrowDown size={11} />
                </button>
              </>
            )}

            {/* Toggle Hide */}
            <button
              onClick={() => onToggleHide(nodeId)}
              title={node.hidden ? 'Show Layer' : 'Hide Layer'}
              style={{
                background: 'transparent',
                border: 'none',
                color: node.hidden ? '#EF4444' : '#9CA3AF',
                cursor: 'pointer',
                padding: '2px',
              }}
            >
              {node.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>

            {/* Toggle Lock */}
            <button
              onClick={() => onToggleLock(nodeId)}
              title={node.locked ? 'Unlock Layer' : 'Lock Layer'}
              style={{
                background: 'transparent',
                border: 'none',
                color: node.locked ? '#F59E0B' : '#9CA3AF',
                cursor: 'pointer',
                padding: '2px',
              }}
            >
              {node.locked ? <Lock size={12} /> : <Unlock size={12} />}
            </button>

            {/* Duplicate */}
            {isSelected && (
              <button
                onClick={() => onDuplicateNode(nodeId)}
                title="Duplicate Layer (⌘D)"
                style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '2px' }}
              >
                <Copy size={11} />
              </button>
            )}

            {/* Delete */}
            {isSelected && (
              <button
                onClick={() => onDeleteNode(nodeId)}
                title="Delete Layer (Del)"
                style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '2px' }}
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Children Sub-tree */}
        {hasChildren && !isCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {node.children.map((childId: string) => renderNodeTree(childId, nodeMap, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const totalNodeCount = useMemo(() => {
    if (scenes && scenes.length > 0) {
      return scenes.reduce((acc, s) => acc + Object.keys(s.sceneGraph?.nodes || {}).length, 0);
    }
    return Object.keys(nodes).length;
  }, [scenes, nodes]);

  return (
    <aside
      id="sz-layers-panel"
      style={{
        width: '300px',
        background: '#16181D',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        zIndex: 35,
        userSelect: 'none',
      }}
    >
      {/* ── HEADER & SEARCH ── */}
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={15} style={{ color: '#3B82F6' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F3F4F6' }}>Layers</span>
            <span style={{ fontSize: '0.7rem', color: '#6B7280', background: 'rgba(255, 255, 255, 0.06)', padding: '1px 6px', borderRadius: '4px' }}>
              {totalNodeCount}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#6B7280',
              cursor: 'pointer',
              padding: '2px',
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#1F2229',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '6px',
            padding: '5px 8px',
          }}
        >
          <Search size={13} style={{ color: '#6B7280' }} />
          <input
            type="text"
            placeholder="Filter layers by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '0.76rem',
              outline: 'none',
              width: '100%',
            }}
          />
        </div>
      </div>

      {/* ── TREE VIEW ── */}
      <div
        className="sz-custom-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        {scenes && scenes.length > 0 ? (
          scenes.map((scene) => {
            const sceneNodes = scene.sceneGraph?.nodes || {};
            const sceneRootId = scene.sceneGraph?.rootNodeId;
            const isSceneActive = activeSceneId === scene.id;
            const isSceneCollapsed = collapsedNodes.has(`scene_${scene.id}`);
            const sceneCount = Object.keys(sceneNodes).length;

            return (
              <div key={scene.id} style={{ marginBottom: '6px' }}>
                {/* Scene Header Row */}
                <div
                  onClick={() => onSelectScene?.(scene.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    background: isSceneActive ? 'rgba(59, 130, 246, 0.14)' : 'rgba(255, 255, 255, 0.03)',
                    borderLeft: isSceneActive ? '2px solid #3B82F6' : '2px solid transparent',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginBottom: '2px',
                    transition: 'all 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSceneActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSceneActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                    <button
                      onClick={(e) => toggleCollapse(`scene_${scene.id}`, e)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#9CA3AF',
                        padding: 0,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {isSceneCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                    </button>
                    <Square size={12} style={{ color: isSceneActive ? '#60A5FA' : '#9CA3AF' }} />
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: isSceneActive ? '#93C5FD' : '#E5E7EB',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {scene.name || scene.id}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      color: '#9CA3AF',
                      background: 'rgba(255, 255, 255, 0.06)',
                      padding: '1px 5px',
                      borderRadius: '3px',
                    }}
                  >
                    {sceneCount}
                  </span>
                </div>

                {/* Section Child Nodes */}
                {!isSceneCollapsed && sceneRootId && (
                  <div style={{ paddingLeft: '6px' }}>
                    {renderNodeTree(sceneRootId, sceneNodes, 0)}
                  </div>
                )}
              </div>
            );
          })
        ) : rootNodeId ? (
          renderNodeTree(rootNodeId, nodes, 0)
        ) : (
          <div style={{ color: '#6B7280', fontSize: '0.75rem', textAlign: 'center', padding: '24px' }}>
            No layers found in current scene
          </div>
        )}
      </div>
    </aside>
  );
}
