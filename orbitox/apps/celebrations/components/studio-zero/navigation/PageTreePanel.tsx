'use client';

import React, { useState } from 'react';
import {
  Layers,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  GripVertical,
  Plus,
  Search,
  Type,
  Image as ImageIcon,
  Square,
  MousePointer,
  Box,
  FileText,
  CornerDownRight,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  TemplatePageDefinition,
  TemplateSceneDefinition,
} from '@/components/template-studio/types/TemplateSchema';
import { SceneGraphNode, SceneNodeKind } from '@/components/template-studio/engine/SceneGraphTypes';

export interface PageTreePanelProps {
  pages?: TemplatePageDefinition[];
  activePageId?: string;
  onSelectPage?: (pageId: string) => void;
  onCreatePage?: (name: string, route: string) => void;
  onDeletePage?: (pageId: string) => void;
  sections: TemplateSceneDefinition[];
  activeSceneId: string;
  onSelectScene: (sceneId: string) => void;
  onReorderSections?: (sourceIndex: number, targetIndex: number) => void;
  onMoveSection?: (sectionId: string, direction: 'up' | 'down') => void;
  onAddSection?: (position?: number) => void;
  onDeleteSection?: (sectionId: string) => void;
  onDuplicateSection?: (sectionId: string) => void;
  selectedNodeId: string | null;
  selectedNodeIds?: string[];
  onSelectNode: (nodeId: string, sceneId: string) => void;
  onToggleHideNode?: (nodeId: string) => void;
  onToggleLockNode?: (nodeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  onClose?: () => void;
}

export function PageTreePanel({
  pages = [],
  activePageId = 'page_home',
  onSelectPage,
  onCreatePage,
  sections,
  activeSceneId,
  onSelectScene,
  onReorderSections,
  onMoveSection,
  onAddSection,
  onDeleteSection,
  onDuplicateSection,
  selectedNodeId,
  selectedNodeIds = [],
  onSelectNode,
  onToggleHideNode,
  onToggleLockNode,
  onDeleteNode,
  onClose,
}: PageTreePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const toggleSectionCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleNodeCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleFocusSection = (sectionId: string) => {
    onSelectScene(sectionId);
    // Smooth scroll canvas to focus section
    const el =
      document.getElementById(`orbitox-section-${sectionId}`) ||
      document.getElementById(sectionId) ||
      document.querySelector(`[data-scene-id="${sectionId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleFocusNode = (nodeId: string, sceneId: string) => {
    onSelectScene(sceneId);
    onSelectNode(nodeId, sceneId);
    const el =
      document.querySelector(`[data-node-id="${nodeId}"]`) ||
      document.getElementById(nodeId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const getNodeIcon = (kind: SceneNodeKind) => {
    switch (kind) {
      case 'text':
      case 'richtext':
        return <Type size={12} style={{ color: '#60A5FA' }} />;
      case 'image':
      case 'video':
        return <ImageIcon size={12} style={{ color: '#F472B6' }} />;
      case 'button':
        return <MousePointer size={12} style={{ color: '#34D399' }} />;
      case 'smart':
        return <Box size={12} style={{ color: '#A78BFA' }} />;
      default:
        return <Square size={12} style={{ color: '#9CA3AF' }} />;
    }
  };

  const renderNodeRow = (
    node: SceneGraphNode,
    scene: TemplateSceneDefinition,
    depth: number = 0
  ) => {
    const isSelected = selectedNodeId === node.id || selectedNodeIds.includes(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isCollapsed = Boolean(collapsedNodes[node.id]);

    if (searchQuery.trim() && !node.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      // If filtering, only show matching or if children match
      const matchingChild = node.children?.some((cid) =>
        scene.sceneGraph?.nodes[cid]?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (!matchingChild) return null;
    }

    return (
      <React.Fragment key={node.id}>
        <div
          onClick={() => handleFocusNode(node.id, scene.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 8px 4px 0',
            paddingLeft: `${depth * 14 + 18}px`,
            background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
            borderLeft: isSelected ? '2px solid #3B82F6' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '0.72rem',
            color: isSelected ? '#FFFFFF' : '#D1D5DB',
            transition: 'background 0.1s ease',
          }}
          className="hover:bg-white/5"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            {hasChildren ? (
              <span
                onClick={(e) => toggleNodeCollapse(node.id, e)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {isCollapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
              </span>
            ) : (
              <span style={{ width: '11px' }} />
            )}
            {getNodeIcon(node.kind)}
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: isSelected ? 600 : 400,
                opacity: node.hidden ? 0.4 : 1,
              }}
            >
              {node.name || node.kind}
            </span>
          </div>

          <div
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {onToggleHideNode && (
              <button
                onClick={() => onToggleHideNode(node.id)}
                title={node.hidden ? 'Show node' : 'Hide node'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: node.hidden ? '#EF4444' : '#6B7280',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {node.hidden ? <EyeOff size={11} /> : <Eye size={11} />}
              </button>
            )}
            {onToggleLockNode && (
              <button
                onClick={() => onToggleLockNode(node.id)}
                title={node.locked ? 'Unlock node' : 'Lock node'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: node.locked ? '#F59E0B' : '#6B7280',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {node.locked ? <Lock size={11} /> : <Unlock size={11} />}
              </button>
            )}
          </div>
        </div>

        {hasChildren && !isCollapsed && (
          <div>
            {node.children.map((childId) => {
              const childNode = scene.sceneGraph?.nodes[childId];
              return childNode ? renderNodeRow(childNode, scene, depth + 1) : null;
            })}
          </div>
        )}
      </React.Fragment>
    );
  };

  const handleDragStart = (index: number, e: React.DragEvent) => {
    setDraggedIndex(index);
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (targetIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex && onReorderSections) {
      onReorderSections(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div
      id="sz-page-tree-panel"
      style={{
        width: '280px',
        height: '100%',
        background: '#16181D',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
      }}
    >
      {/* ── HEADER ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={15} style={{ color: '#3B82F6' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#FFFFFF' }}>
            Document Tree
          </span>
          <span
            style={{
              fontSize: '0.62rem',
              background: '#252932',
              color: '#9CA3AF',
              padding: '1px 6px',
              borderRadius: '10px',
            }}
          >
            {sections.length} Sections
          </span>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9CA3AF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── SEARCH FILTER ── */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#1F2229',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '5px',
            padding: '4px 8px',
          }}
        >
          <Search size={12} style={{ color: '#6B7280' }} />
          <input
            type="text"
            placeholder="Filter sections & layers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '0.72rem',
              color: '#FFFFFF',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'transparent', border: 'none', color: '#6B7280', cursor: 'pointer' }}
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* ── TREE BODY ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          padding: '6px 0',
        }}
      >
        {sections.map((section, idx) => {
          const isActiveSection = section.id === activeSceneId;
          const isCollapsed = Boolean(collapsedSections[section.id]);
          const isDragOver = dragOverIndex === idx;
          const rootNodeId = section.sceneGraph?.rootNodeId;
          const rootNode = rootNodeId ? section.sceneGraph?.nodes[rootNodeId] : null;
          const nodeCount = section.sceneGraph?.nodes ? Object.keys(section.sceneGraph.nodes).length : 0;

          return (
            <div
              key={section.id}
              draggable
              onDragStart={(e) => handleDragStart(idx, e)}
              onDragOver={(e) => handleDragOver(idx, e)}
              onDrop={(e) => handleDrop(idx, e)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                borderTop: isDragOver ? '2px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.03)',
                background: isActiveSection ? 'rgba(59, 130, 246, 0.06)' : 'transparent',
              }}
            >
              {/* ── SECTION HEADER ROW ── */}
              <div
                onClick={() => handleFocusSection(section.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  borderLeft: isActiveSection ? '3px solid #3B82F6' : '3px solid transparent',
                }}
                className="hover:bg-white/5"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <GripVertical
                    size={12}
                    style={{ color: '#6B7280', cursor: 'grab', flexShrink: 0 }}
                  />
                  <button
                    onClick={(e) => toggleSectionCollapse(section.id, e)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#9CA3AF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0,
                    }}
                  >
                    {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  </button>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: isActiveSection ? 600 : 500,
                      color: isActiveSection ? '#FFFFFF' : '#E5E7EB',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {section.name || `Section ${idx + 1}`}
                  </span>
                  <span
                    style={{
                      fontSize: '0.6rem',
                      color: '#6B7280',
                      background: '#1F2229',
                      padding: '1px 4px',
                      borderRadius: '3px',
                    }}
                  >
                    {nodeCount}
                  </span>
                </div>

                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '3px' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {onDuplicateSection && (
                    <button
                      onClick={() => onDuplicateSection(section.id)}
                      title="Duplicate section"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#6B7280',
                        cursor: 'pointer',
                        padding: '2px',
                      }}
                    >
                      <Copy size={11} />
                    </button>
                  )}
                  {onDeleteSection && sections.length > 1 && (
                    <button
                      onClick={() => onDeleteSection(section.id)}
                      title="Delete section"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#EF4444',
                        cursor: 'pointer',
                        padding: '2px',
                      }}
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>

              {/* ── SECTION CHILD NODES ── */}
              {!isCollapsed && rootNode && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {rootNode.children && rootNode.children.length > 0 ? (
                    rootNode.children.map((childId) => {
                      const child = section.sceneGraph?.nodes[childId];
                      return child ? renderNodeRow(child, section, 0) : null;
                    })
                  ) : (
                    <div
                      style={{
                        padding: '4px 0 4px 34px',
                        fontSize: '0.68rem',
                        color: '#6B7280',
                        fontStyle: 'italic',
                      }}
                    >
                      Empty section
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── FOOTER: ADD SECTION ACTION ── */}
      {onAddSection && (
        <div
          style={{
            padding: '10px 14px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <button
            onClick={() => onAddSection(sections.length)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '7px 10px',
              background: '#1F2229',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '6px',
              color: '#3B82F6',
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={13} />
            <span>Add New Section</span>
          </button>
        </div>
      )}
    </div>
  );
}
