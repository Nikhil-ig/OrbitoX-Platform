'use client';

import React, { useState } from 'react';
import {
  Boxes,
  Plus,
  X,
  Component as ComponentIcon,
  Unlink,
  RotateCcw,
  ArrowUpCircle,
  Trash2,
  Layers,
  Sparkles,
  Search,
} from 'lucide-react';
import { SceneGraphNode, SceneNodeKind } from '@/components/template-studio/engine/SceneGraphTypes';

interface ComponentsPanelProps {
  selectedNodeId: string | null;
  selectedNode?: SceneGraphNode | null;
  selectedNodeKind?: SceneNodeKind;
  masterComponents?: Record<string, SceneGraphNode>;
  onCreateComponent: (nodeId: string, name?: string) => void;
  onInstantiateComponent: (masterId: string) => void;
  onResetOverrides?: (nodeId: string) => void;
  onPushToMaster?: (nodeId: string) => void;
  onDetachInstance: (nodeId: string) => void;
  onDeleteMasterComponent?: (masterComponentId: string) => void;
  onInsertNode: (kind: SceneNodeKind, name: string, defaults?: any) => void;
  onClose: () => void;
}

export function ComponentsPanel({
  selectedNodeId,
  selectedNode,
  selectedNodeKind,
  masterComponents = {},
  onCreateComponent,
  onInstantiateComponent,
  onResetOverrides,
  onPushToMaster,
  onDetachInstance,
  onDeleteMasterComponent,
  onInsertNode,
  onClose,
}: ComponentsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const isMaster = Boolean(selectedNode?.component?.isMaster);
  const isInstance = Boolean(selectedNode?.component?.masterComponentId && !selectedNode?.component?.isMaster);
  const overrideCount = selectedNode?.component?.instanceOverrides
    ? Object.keys(selectedNode.component.instanceOverrides).length
    : 0;

  const masterList = Object.entries(masterComponents).map(([id, node]) => ({
    id,
    name: node.name || 'Unnamed Component',
    kind: node.kind,
    childrenCount: node.children ? node.children.length : 0,
    node,
  }));

  const filteredMasters = masterList.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.kind.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const systemComponents = [
    {
      id: 'comp_btn_primary',
      name: 'Primary Action Button',
      desc: 'Glowing pill button with hover micro-animation',
      kind: 'button' as SceneNodeKind,
      defaults: {
        textContent: 'Explore Platform',
        layoutMode: 'flex',
        geometry: { width: 'auto', height: 'auto', position: 'flow' },
        style: {
          background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.accentPrimary' } },
          border: { radius: '9999px' },
          padding: { top: '12px', right: '28px', bottom: '12px', left: '28px' },
          typography: { fontSize: '0.9rem', fontWeight: '600', color: { type: 'solid', value: '#FFFFFF' } },
        },
      },
    },
    {
      id: 'comp_card_feature',
      name: 'Feature Spotlight Card',
      desc: 'Translucent card with icon, title, and body description',
      kind: 'frame' as SceneNodeKind,
      defaults: {
        layoutMode: 'flex',
        layoutConfig: {
          direction: 'vertical',
          gap: '12px',
          alignment: { primary: 'flex-start', cross: 'stretch' },
          padding: { top: '24px', right: '24px', bottom: '24px', left: '24px' },
        },
        geometry: { width: '100%', height: 'auto', position: 'flow' },
        style: {
          background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.surfacePrimary' } },
          border: { width: '1px', style: 'solid', color: { type: 'token', tokenPath: 'colors.borderSubtle' }, radius: '16px' },
        },
      },
    },
    {
      id: 'comp_testimonial',
      name: 'Testimonial Quote Card',
      desc: 'Quote bubble with verified avatar badge',
      kind: 'frame' as SceneNodeKind,
      defaults: {
        layoutMode: 'flex',
        layoutConfig: {
          direction: 'vertical',
          gap: '14px',
          padding: { top: '24px', right: '24px', bottom: '24px', left: '24px' },
        },
        geometry: { width: '100%', height: 'auto', position: 'flow' },
        style: {
          background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.surfaceElevated' } },
          border: { width: '1px', style: 'solid', color: { type: 'token', tokenPath: 'colors.borderSubtle' }, radius: '16px' },
        },
      },
    },
  ];

  return (
    <aside
      id="sz-components-panel"
      style={{
        width: '320px',
        background: '#16181D',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        zIndex: 35,
        userSelect: 'none',
      }}
    >
      {/* ── 1. HEADER ── */}
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#181A20',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Boxes size={15} style={{ color: '#8B5CF6' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F3F4F6' }}>Components</span>
          <span
            id="sz-components-count-badge"
            style={{
              background: 'rgba(139, 92, 246, 0.2)',
              color: '#C4B5FD',
              fontSize: '0.66rem',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '9999px',
            }}
          >
            {masterList.length}
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

      {/* ── 2. SEARCH BAR ── */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#1C1F26',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '6px',
            padding: '5px 8px',
          }}
        >
          <Search size={12} style={{ color: '#6B7280' }} />
          <input
            id="sz-components-search-input"
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '0.74rem',
              width: '100%',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* ── 3. SELECTION CONTEXT BANNER ── */}
      <div style={{ padding: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
        {selectedNodeId && selectedNode ? (
          isMaster ? (
            <div
              id="sz-panel-master-context"
              style={{
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.35)',
                borderRadius: '6px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#C4B5FD', fontSize: '0.74rem', fontWeight: 600 }}>
                <span style={{ fontSize: '0.9rem' }}>❖</span>
                <span>Master: {selectedNode.name}</span>
              </div>
              <button
                id="sz-insert-active-master-btn"
                onClick={() => onInstantiateComponent(selectedNode.component?.masterComponentId || selectedNode.id)}
                style={{
                  width: '100%',
                  background: '#8B5CF6',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '6px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Plus size={13} />
                <span>Insert Instance on Canvas</span>
              </button>
            </div>
          ) : isInstance ? (
            <div
              id="sz-panel-instance-context"
              style={{
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '6px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#93C5FD', fontSize: '0.74rem', fontWeight: 600 }}>
                  <span style={{ fontSize: '0.9rem' }}>◇</span>
                  <span>Instance of Component</span>
                </div>
                {overrideCount > 0 && (
                  <span style={{ fontSize: '0.65rem', color: '#FBBF24', background: 'rgba(245, 158, 11, 0.2)', padding: '1px 5px', borderRadius: '4px' }}>
                    {overrideCount} {overrideCount === 1 ? 'override' : 'overrides'}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {onResetOverrides && (
                  <button
                    id="sz-panel-reset-overrides-btn"
                    onClick={() => onResetOverrides(selectedNode.id)}
                    disabled={overrideCount === 0}
                    style={{
                      flex: 1,
                      background: overrideCount > 0 ? '#1F2430' : 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid ' + (overrideCount > 0 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.08)'),
                      color: overrideCount > 0 ? '#FBBF24' : '#6B7280',
                      borderRadius: '4px',
                      padding: '5px 6px',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      cursor: overrideCount > 0 ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <RotateCcw size={10} />
                    <span>Reset</span>
                  </button>
                )}
                {onPushToMaster && (
                  <button
                    id="sz-panel-push-to-master-btn"
                    onClick={() => onPushToMaster(selectedNode.id)}
                    style={{
                      flex: 1,
                      background: '#1F2430',
                      border: '1px solid rgba(139, 92, 246, 0.4)',
                      color: '#C4B5FD',
                      borderRadius: '4px',
                      padding: '5px 6px',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <ArrowUpCircle size={10} />
                    <span>Push</span>
                  </button>
                )}
                <button
                  id="sz-panel-detach-btn"
                  onClick={() => onDetachInstance(selectedNode.id)}
                  style={{
                    background: '#1F2430',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#F87171',
                    borderRadius: '4px',
                    padding: '5px 8px',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <Unlink size={10} />
                  <span>Detach</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => onCreateComponent(selectedNodeId, selectedNode.name)}
              id="sz-create-component-btn"
              style={{
                width: '100%',
                background: '#8B5CF6',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                color: '#FFFFFF',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(139, 92, 246, 0.35)',
              }}
            >
              <ComponentIcon size={13} />
              <span>Create Component from Selection (❖)</span>
            </button>
          )
        ) : (
          <div style={{ fontSize: '0.72rem', color: '#9CA3AF', textAlign: 'center', padding: '6px' }}>
            Select any element on canvas to turn it into a reusable master component.
          </div>
        )}
      </div>

      {/* ── 4. SCROLLABLE COMPONENT CATALOG ── */}
      <div
        className="sz-custom-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Document Master Components */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Document Components (❖)
            </span>
            <span style={{ fontSize: '0.65rem', color: '#6B7280' }}>{filteredMasters.length}</span>
          </div>

          {filteredMasters.length > 0 ? (
            filteredMasters.map((comp) => (
              <div
                key={comp.id}
                id={`sz-master-comp-card-${comp.id}`}
                style={{
                  background: '#1F2229',
                  border: '1px solid rgba(139, 92, 246, 0.25)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '6px',
                      background: 'rgba(139, 92, 246, 0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#C4B5FD',
                      fontSize: '0.85rem',
                      flexShrink: 0,
                    }}
                  >
                    ❖
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: '#FFFFFF',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {comp.name}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>
                      {comp.kind} • {comp.childrenCount} {comp.childrenCount === 1 ? 'child' : 'children'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    id={`sz-insert-component-${comp.id}`}
                    onClick={() => onInstantiateComponent(comp.id)}
                    title="Insert Instance on Canvas"
                    style={{
                      background: 'rgba(139, 92, 246, 0.2)',
                      border: '1px solid rgba(139, 92, 246, 0.4)',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      color: '#C4B5FD',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <Plus size={12} />
                    <span>Insert</span>
                  </button>
                  {onDeleteMasterComponent && (
                    <button
                      id={`sz-delete-component-${comp.id}`}
                      onClick={() => onDeleteMasterComponent(comp.id)}
                      title="Delete Master Component"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#6B7280',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#6B7280')}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div
              id="sz-no-components-empty-state"
              style={{
                padding: '16px 12px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ComponentIcon size={20} style={{ color: '#4B5563' }} />
              <div style={{ fontSize: '0.74rem', color: '#9CA3AF', fontWeight: 500 }}>
                No master components yet
              </div>
              <div style={{ fontSize: '0.68rem', color: '#6B7280', lineHeight: 1.4 }}>
                Select any layer on the canvas and click "Create Component" to start building your design system.
              </div>
            </div>
          )}
        </div>

        {/* Starter System Components */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Starter Library
          </div>
          {systemComponents.map((comp) => (
            <div
              key={comp.id}
              onClick={() => onInsertNode(comp.kind, comp.name, comp.defaults)}
              style={{
                background: '#1F2229',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#292D37';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#1F2229';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      background: 'rgba(59, 130, 246, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#60A5FA',
                    }}
                  >
                    <ComponentIcon size={12} />
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#FFFFFF' }}>{comp.name}</div>
                </div>
                <Plus size={13} style={{ color: '#9CA3AF' }} />
              </div>
              <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{comp.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
