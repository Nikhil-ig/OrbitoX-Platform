'use client';

import React, { useState, useMemo } from 'react';
import {
  TemplateSchema,
  TemplateSceneDefinition,
  SceneStructureLayer,
  ContentFieldDefinition,
  MediaSlotDefinition,
  DeviceBreakpoint,
  CustomizationLevel,
  MotionPresetType,
} from '../types/TemplateSchema';
import {
  Sliders,
  Layers,
  Sparkles,
  Smartphone,
  Eye,
  Lock,
  Unlock,
  Check,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Search,
  Maximize2,
  Crop,
  Shield,
  Palette,
  FileCode2,
  Trash2,
  Plus,
  RotateCcw,
  Zap,
  Info,
} from 'lucide-react';
import { MediaSlotEditor } from './MediaSlotEditor';
import { TemplateEditorCommand } from '../engine/TemplateEditorCommands';
import { SceneGraph, SceneGraphNode } from '../engine/SceneGraphTypes';

interface TemplateStudioInspectorProps {
  schema: TemplateSchema;
  selectedSceneId: string | null;
  selectedLayerId: string | null;
  selectedFieldKey: string | null;
  viewport: DeviceBreakpoint;
  onUpdateSchema: (patch: Partial<TemplateSchema>) => void;
  onUpdateScene: (sceneId: string, patch: Partial<TemplateSceneDefinition>) => void;
  onUpdateField: (fieldId: string, patch: Partial<ContentFieldDefinition>) => void;
  onUpdateMediaSlot: (slotId: string, patch: Partial<MediaSlotDefinition>) => void;
  onSelectScene: (sceneId: string) => void;
  onSelectLayer: (layerId: string, sceneId?: string) => void;
  onBeginTransaction?: (label: string) => void;
  onCommitTransaction?: () => void;
  onCancelTransaction?: () => void;
  dispatch?: (command: TemplateEditorCommand) => void;
}

// ─────────────────────────────────────────────────────────────
// CUSTOMIZATION BOUNDARY BADGE (Prompt #15)
// ─────────────────────────────────────────────────────────────
function CustomizationBoundaryBadge({
  level,
}: {
  level: CustomizationLevel;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const meta: Record<CustomizationLevel, { label: string; icon: string; bg: string; text: string; border: string; desc: string }> = {
    LOCKED: {
      label: 'Template Locked',
      icon: '🔒',
      bg: 'rgba(148, 163, 184, 0.12)',
      text: '#94A3B8',
      border: 'rgba(148, 163, 184, 0.3)',
      desc: 'Enforced by template design. Customer cannot alter this value in Creator Studio.',
    },
    CURATED: {
      label: 'Curated Choices',
      icon: '◈',
      bg: 'rgba(56, 189, 248, 0.12)',
      text: '#38BDF8',
      border: 'rgba(56, 189, 248, 0.3)',
      desc: 'Customers can choose from approved luxury palettes or typography defined by this template.',
    },
    FLEXIBLE: {
      label: 'Customer Editable',
      icon: '✎',
      bg: 'rgba(16, 185, 129, 0.12)',
      text: '#10B981',
      border: 'rgba(16, 185, 129, 0.3)',
      desc: 'Customer has full freedom to input text, photos, or numbers within validation safety limits.',
    },
    ADVANCED: {
      label: 'Advanced Partner',
      icon: '◆',
      bg: 'rgba(168, 85, 247, 0.12)',
      text: '#A855F7',
      border: 'rgba(168, 85, 247, 0.3)',
      desc: 'Restricted to B2B sovereign event planners and VIP white-glove customers.',
    },
  };

  const current = meta[level] || meta.FLEXIBLE;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        title="Click to inspect customization rules"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '2px 8px',
          borderRadius: '6px',
          background: current.bg,
          border: `1px solid ${current.border}`,
          color: current.text,
          fontSize: '0.68rem',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        <span>{current.icon}</span>
        <span>{current.label}</span>
      </button>

      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '6px',
            background: '#0D1429',
            border: `1px solid ${current.border}`,
            borderRadius: '8px',
            padding: '10px',
            width: '220px',
            zIndex: 100,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.6)',
            fontSize: '0.72rem',
            color: '#CBD5E1',
            lineHeight: 1.4,
          }}
        >
          <div style={{ fontWeight: 800, color: current.text, marginBottom: '4px' }}>
            {current.icon} {current.label}
          </div>
          <div>{current.desc}</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RESPONSIVE INHERITANCE BADGE (Prompt #20)
// ─────────────────────────────────────────────────────────────
function ResponsiveInheritanceBadge({
  viewport,
  isOverridden,
  baseValue,
  onResetToBase,
}: {
  viewport: DeviceBreakpoint;
  isOverridden: boolean;
  baseValue?: string | number;
  onResetToBase?: () => void;
}) {
  if (viewport === 'desktop') {
    return (
      <span
        style={{
          fontSize: '0.66rem',
          padding: '2px 6px',
          borderRadius: '4px',
          background: 'rgba(16, 185, 129, 0.12)',
          color: '#10B981',
          fontWeight: 700,
        }}
      >
        ✓ Base
      </span>
    );
  }

  if (isOverridden) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span
          style={{
            fontSize: '0.66rem',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#F59E0B',
            fontWeight: 700,
          }}
        >
          ↳ Override
        </span>
        {onResetToBase && (
          <button
            onClick={onResetToBase}
            title={`Reset override and inherit from Desktop base (${baseValue ?? ''})`}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#38BDF8',
              fontSize: '0.66rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            Reset to inherited
          </button>
        )}
      </div>
    );
  }

  return (
    <span
      style={{
        fontSize: '0.66rem',
        padding: '2px 6px',
        borderRadius: '4px',
        background: 'rgba(255, 255, 255, 0.05)',
        color: 'var(--cel-text-dim, #64748B)',
        fontWeight: 600,
      }}
    >
      ↳ Inherited
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// CUSTOMER CONTROL PREVIEW CARD (Prompt #29)
// ─────────────────────────────────────────────────────────────
function CustomerControlPreviewCard({
  elementName,
  adminControls,
  customerControls,
}: {
  elementName: string;
  adminControls: string[];
  customerControls: string[];
}) {
  return (
    <div
      style={{
        background: 'rgba(13, 20, 41, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ fontSize: '0.7rem', color: '#DFBA6B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Control Contract Preview ({elementName})
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.72rem' }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '8px', borderRadius: '6px' }}>
          <div style={{ color: '#94A3B8', fontWeight: 700, marginBottom: '4px' }}>Admin Studio:</div>
          <div style={{ color: '#E2E8F0', lineHeight: 1.4 }}>{adminControls.join(', ')}</div>
        </div>
        <div style={{ background: 'rgba(56, 189, 248, 0.04)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.15)' }}>
          <div style={{ color: '#38BDF8', fontWeight: 700, marginBottom: '4px' }}>Customer Studio:</div>
          <div style={{ color: '#E2E8F0', lineHeight: 1.4 }}>{customerControls.join(', ')}</div>
        </div>
      </div>
    </div>
  );
}

export function TemplateStudioInspector({
  schema,
  selectedSceneId,
  selectedLayerId,
  selectedFieldKey,
  viewport,
  onUpdateSchema,
  onUpdateScene,
  onUpdateField,
  onUpdateMediaSlot,
  onSelectScene,
  onSelectLayer,
  onBeginTransaction,
  onCommitTransaction,
  onCancelTransaction,
  dispatch,
}: TemplateStudioInspectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'layout' | 'motion' | 'interactions' | 'permissions' | 'sceneGraph'>('content');
  const [testedInteractionId, setTestedInteractionId] = useState<string | null>(null);

  // Find active scene if selected
  const activeScene = schema.scenes.find((s) => s.id === selectedSceneId) || null;

  // Find active layer if selected
  const findLayer = (layers: SceneStructureLayer[]): SceneStructureLayer | null => {
    for (const lay of layers) {
      if (lay.id === selectedLayerId) return lay;
      if (lay.children) {
        const found = findLayer(lay.children);
        if (found) return found;
      }
    }
    return null;
  };

  const activeLayer = activeScene ? findLayer(activeScene.layers) : null;

  // Find parent layer for breadcrumb
  const findParentLayer = (
    layers: SceneStructureLayer[],
    targetId: string,
    parent: SceneStructureLayer | null = null
  ): SceneStructureLayer | null => {
    for (const l of layers) {
      if (l.id === targetId) return parent;
      if (l.children) {
        const found = findParentLayer(l.children, targetId, l);
        if (found) return found;
      }
    }
    return null;
  };

  // Find active content field
  const activeField = schema.contentSchema.find(
    (f) =>
      (selectedFieldKey && f.key === selectedFieldKey) ||
      (activeLayer?.bindingFieldKey && f.key === activeLayer.bindingFieldKey)
  ) || null;

  // Find active media slot if field/layer is media
  const activeMediaSlot = schema.mediaSlots.find(
    (ms) => ms.slotKey === activeField?.key || ms.slotKey === activeLayer?.bindingFieldKey
  ) || null;

  // Contextual Breadcrumbs (Prompt #13)
  const breadcrumbItems = useMemo(() => {
    const items: { label: string; onClick?: () => void }[] = [];
    if (activeScene) {
      items.push({
        label: activeScene.name,
        onClick: () => {
          onSelectScene(activeScene.id);
          onSelectLayer('');
        },
      });
    }
    if (activeLayer) {
      const parent = activeScene ? findParentLayer(activeScene.layers, activeLayer.id) : null;
      if (parent) {
        items.push({
          label: parent.name,
          onClick: () => onSelectLayer(parent.id, activeScene?.id),
        });
      }
      items.push({ label: activeLayer.name });
    }
    return items;
  }, [activeScene, activeLayer]);

  return (
    <aside
      style={{
        width: '340px',
        minWidth: '340px',
        background: '#070B16',
        borderLeft: '1px solid rgba(223, 186, 107, 0.14)',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 60px)',
        overflowY: 'auto',
      }}
    >
      {/* 1. Contextual Breadcrumb Header (Prompt #13) */}
      <div
        style={{
          padding: '10px 14px',
          background: 'rgba(0, 0, 0, 0.35)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          flexWrap: 'wrap',
          fontSize: '0.7rem',
          color: 'var(--cel-text-dim, #64748B)',
        }}
      >
        <button
          onClick={() => {
            onSelectScene('');
            onSelectLayer('');
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--cel-text-muted, #94A3B8)',
            cursor: 'pointer',
            padding: 0,
            fontSize: '0.7rem',
          }}
        >
          {schema.name}
        </button>

        {breadcrumbItems.map((item, idx) => (
          <React.Fragment key={idx}>
            <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>/</span>
            {item.onClick ? (
              <button
                onClick={item.onClick}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#CBD5E1',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                }}
              >
                {item.label}
              </button>
            ) : (
              <span style={{ color: '#DFBA6B', fontWeight: 700 }}>{item.label}</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* 2. Inspector Identity Banner */}
      <div
        style={{
          padding: '12px 16px',
          background: 'rgba(223, 186, 107, 0.05)',
          borderBottom: '1px solid rgba(223, 186, 107, 0.12)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.66rem', color: 'var(--cel-text-dim, #64748B)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {activeLayer ? 'Element Inspector' : activeScene ? 'Scene Inspector' : 'Template Scope'}
            </span>
            {activeScene && (() => {
              const authMode = activeScene.sceneGraph && activeScene.renderMode === 'graph'
                ? 'GRAPH_NATIVE'
                : activeScene.renderMode === 'hybrid'
                ? 'HYBRID'
                : 'LEGACY';
              return (
                <span
                  title={authMode === 'GRAPH_NATIVE' ? 'SceneGraph is visual source of truth (Prompt #45)' : 'Static React JSX authoritative layout'}
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    padding: '1px 5px',
                    borderRadius: '4px',
                    background: authMode === 'GRAPH_NATIVE' ? 'rgba(16, 185, 129, 0.15)' : authMode === 'HYBRID' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(148, 163, 184, 0.12)',
                    border: authMode === 'GRAPH_NATIVE' ? '1px solid rgba(16, 185, 129, 0.4)' : authMode === 'HYBRID' ? '1px solid rgba(234, 179, 8, 0.4)' : '1px solid rgba(148, 163, 184, 0.3)',
                    color: authMode === 'GRAPH_NATIVE' ? '#10B981' : authMode === 'HYBRID' ? '#FBBF24' : '#94A3B8',
                  }}
                >
                  {authMode}
                </span>
              );
            })()}
          </div>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#DFBA6B' }}>
            {activeLayer ? activeLayer.name : activeScene ? activeScene.name : schema.name}
          </h4>
          {activeField && (
            <code style={{ fontSize: '0.7rem', color: '#38BDF8', display: 'block', marginTop: '3px' }}>
              field: {activeField.key}
            </code>
          )}
        </div>

        {/* Customization Boundary Badge (Prompt #15) */}
        {activeField && (
          <CustomizationBoundaryBadge level={activeField.customizationLevel} />
        )}
      </div>

      {/* 3. Contextual Sub-Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(0, 0, 0, 0.15)',
        }}
      >
        {[
          { id: 'content', label: 'Content' },
          { id: 'layout', label: 'Layout & Breakpoint' },
          ...(activeScene?.sceneGraph ? [{ id: 'sceneGraph', label: `Scene Graph (${Object.keys(activeScene.sceneGraph.nodes).length})` }] : []),
          { id: 'motion', label: 'Motion' },
          { id: 'interactions', label: `Interactions${activeScene?.interactions?.length ? ` (${activeScene.interactions.length})` : ''}` },
          { id: 'permissions', label: 'Customization' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              flex: 1,
              padding: '8px 4px',
              border: 'none',
              background: activeTab === tab.id ? 'rgba(223, 186, 107, 0.15)' : 'transparent',
              color: activeTab === tab.id ? '#DFBA6B' : 'var(--cel-text-muted, #94A3B8)',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '2px solid #DFBA6B' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. Tab Body Content */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '18px', flex: 1 }}>
        {/* ========================================================================= */}
        {/* TAB 1: CONTENT & VALUES                                                   */}
        {/* ========================================================================= */}
        {activeTab === 'content' && (
          <>
            {activeField ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.74rem', color: 'var(--cel-text-muted, #94A3B8)', fontWeight: 600 }}>
                      Field Display Label
                    </label>
                    <CustomizationBoundaryBadge level={activeField.customizationLevel} />
                  </div>
                  <input
                    type="text"
                    value={activeField.label}
                    onChange={(e) => onUpdateField(activeField.id, { label: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: '#0B1120',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.8rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--cel-text-muted, #94A3B8)', marginBottom: '4px', fontWeight: 600 }}>
                    Default Sample Value
                  </label>
                  {activeField.type === 'longtext' || activeField.type === 'richtext' ? (
                    <textarea
                      rows={4}
                      value={activeField.defaultValue}
                      onChange={(e) => onUpdateField(activeField.id, { defaultValue: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: '#0B1120',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '0.8rem',
                        lineHeight: 1.5,
                      }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={activeField.defaultValue || ''}
                      onChange={(e) => onUpdateField(activeField.id, { defaultValue: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: '#0B1120',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '0.8rem',
                      }}
                    />
                  )}
                </div>

                {/* Media Slot Details & Interactive Editor (P1 Media Authoring) */}
                {activeMediaSlot && (
                  <MediaSlotEditor
                    slot={activeMediaSlot}
                    contentField={activeField}
                    onUpdateSlot={onUpdateMediaSlot}
                    onUpdateField={onUpdateField}
                  />
                )}

                {/* Customer Control Contract Preview (Prompt #29) */}
                <CustomerControlPreviewCard
                  elementName={activeField.label}
                  adminControls={['Aspect Ratio', 'Default Sample', 'Required Constraint', 'Validation Limit']}
                  customerControls={
                    activeField.type === 'image'
                      ? ['Upload Portrait', 'Crop Frame', 'Focal Point']
                      : ['Input Text', 'Select Approved Font']
                  }
                />
              </div>
            ) : activeScene ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--cel-text-muted, #94A3B8)', marginBottom: '4px', fontWeight: 600 }}>
                    Scene Name
                  </label>
                  <input
                    type="text"
                    value={activeScene.name}
                    onChange={(e) => onUpdateScene(activeScene.id, { name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: '#0B1120',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.8rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--cel-text-muted, #94A3B8)', marginBottom: '4px', fontWeight: 600 }}>
                    Ceremonial Purpose
                  </label>
                  <textarea
                    rows={3}
                    value={activeScene.purpose}
                    onChange={(e) => onUpdateScene(activeScene.id, { purpose: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: '#0B1120',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.78rem',
                      lineHeight: 1.4,
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.76rem', color: 'var(--cel-text-muted, #94A3B8)' }}>Required Scene:</span>
                  <input
                    type="checkbox"
                    checked={activeScene.isRequired}
                    onChange={(e) => onUpdateScene(activeScene.id, { isRequired: e.target.checked })}
                    style={{ accentColor: '#DFBA6B' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.76rem', color: 'var(--cel-text-muted, #94A3B8)' }}>Customer Can Toggle:</span>
                  <input
                    type="checkbox"
                    checked={activeScene.customerToggleable}
                    onChange={(e) => onUpdateScene(activeScene.id, { customerToggleable: e.target.checked })}
                    style={{ accentColor: '#DFBA6B' }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--cel-text-muted, #94A3B8)', fontSize: '0.78rem', lineHeight: 1.6 }}>
                Select a scene from the left navigation or click directly on an element in the live canvas to configure its properties.
              </div>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: LAYOUT & RESPONSIVE INHERITANCE (Prompt #20)                       */}
        {/* ========================================================================= */}
        {activeTab === 'layout' && activeScene && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                padding: '10px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#fff' }}>
                  Current Viewport: <strong style={{ color: '#DFBA6B' }}>{viewport.toUpperCase()}</strong>
                </span>
                <ResponsiveInheritanceBadge
                  viewport={viewport}
                  isOverridden={Boolean(activeScene.layoutRules[viewport]?.isOverridden)}
                  baseValue={activeScene.layoutRules.desktop?.composition}
                  onResetToBase={() => {
                    onUpdateScene(activeScene.id, {
                      layoutRules: {
                        ...activeScene.layoutRules,
                        [viewport]: {
                          ...activeScene.layoutRules.desktop,
                          isOverridden: false,
                        },
                      },
                    });
                  }}
                />
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--cel-text-dim, #64748B)', lineHeight: 1.5 }}>
                {viewport === 'desktop'
                  ? 'Desktop serves as the canonical base configuration. Tablet and Mobile inherit these values unless explicitly overridden.'
                  : `Changes made here apply as an explicit breakpoint override for ${viewport} devices.`}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.74rem', color: 'var(--cel-text-muted, #94A3B8)', fontWeight: 600 }}>
                  Composition Geometry
                </label>
                <ResponsiveInheritanceBadge
                  viewport={viewport}
                  isOverridden={Boolean(activeScene.layoutRules[viewport]?.isOverridden)}
                />
              </div>
              <select
                value={activeScene.layoutRules[viewport]?.composition || 'centered'}
                onChange={(e) => {
                  const comp = e.target.value as any;
                  onUpdateScene(activeScene.id, {
                    layoutRules: {
                      ...activeScene.layoutRules,
                      [viewport]: {
                        ...activeScene.layoutRules[viewport],
                        composition: comp,
                        isOverridden: viewport !== 'desktop',
                      },
                    },
                  });
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#0B1120',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '6px',
                  color: '#DFBA6B',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                }}
              >
                <option value="centered">Centered Stage</option>
                <option value="editorial">Editorial Asymmetric</option>
                <option value="split">Split Dual Column</option>
                <option value="orbital">Orbital Celestial Ring</option>
              </select>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--cel-text-muted, #94A3B8)' }}>Top Padding:</span>
                <strong style={{ color: '#fff' }}>{activeScene.layoutRules[viewport]?.paddingTopRem ?? 4} rem</strong>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={activeScene.layoutRules[viewport]?.paddingTopRem ?? 4}
                onMouseDown={() => onBeginTransaction && onBeginTransaction('Adjust top padding')}
                onTouchStart={() => onBeginTransaction && onBeginTransaction('Adjust top padding')}
                onMouseUp={() => onCommitTransaction && onCommitTransaction()}
                onTouchEnd={() => onCommitTransaction && onCommitTransaction()}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateScene(activeScene.id, {
                    layoutRules: {
                      ...activeScene.layoutRules,
                      [viewport]: {
                        ...activeScene.layoutRules[viewport],
                        paddingTopRem: val,
                        isOverridden: viewport !== 'desktop',
                      },
                    },
                  });
                }}
                style={{ width: '100%', accentColor: '#DFBA6B' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--cel-text-muted, #94A3B8)' }}>Bottom Padding:</span>
                <strong style={{ color: '#fff' }}>{activeScene.layoutRules[viewport]?.paddingBottomRem ?? 4} rem</strong>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={activeScene.layoutRules[viewport]?.paddingBottomRem ?? 4}
                onMouseDown={() => onBeginTransaction && onBeginTransaction('Adjust bottom padding')}
                onTouchStart={() => onBeginTransaction && onBeginTransaction('Adjust bottom padding')}
                onMouseUp={() => onCommitTransaction && onCommitTransaction()}
                onTouchEnd={() => onCommitTransaction && onCommitTransaction()}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateScene(activeScene.id, {
                    layoutRules: {
                      ...activeScene.layoutRules,
                      [viewport]: {
                        ...activeScene.layoutRules[viewport],
                        paddingBottomRem: val,
                        isOverridden: viewport !== 'desktop',
                      },
                    },
                  });
                }}
                style={{ width: '100%', accentColor: '#DFBA6B' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--cel-text-muted, #94A3B8)' }}>Content Max Width:</span>
                <strong style={{ color: '#fff' }}>{activeScene.layoutRules[viewport]?.contentMaxWidthPx ?? 1200} px</strong>
              </div>
              <input
                type="range"
                min={320}
                max={1600}
                step={20}
                value={activeScene.layoutRules[viewport]?.contentMaxWidthPx ?? 1200}
                onMouseDown={() => onBeginTransaction && onBeginTransaction('Adjust max width')}
                onTouchStart={() => onBeginTransaction && onBeginTransaction('Adjust max width')}
                onMouseUp={() => onCommitTransaction && onCommitTransaction()}
                onTouchEnd={() => onCommitTransaction && onCommitTransaction()}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  onUpdateScene(activeScene.id, {
                    layoutRules: {
                      ...activeScene.layoutRules,
                      [viewport]: {
                        ...activeScene.layoutRules[viewport],
                        contentMaxWidthPx: val,
                        isOverridden: viewport !== 'desktop',
                      },
                    },
                  });
                }}
                style={{ width: '100%', accentColor: '#DFBA6B' }}
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: VISUAL SCENE GRAPH & PRECISION TRANSFORM (P10 Engine)                */}
        {/* ========================================================================= */}
        {activeTab === 'sceneGraph' && activeScene && activeScene.sceneGraph && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 1. Header Banner & Quick Presets */}
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(223, 186, 107, 0.08)',
                border: '1px solid rgba(223, 186, 107, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#DFBA6B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Visual Authoring Engine
                </span>
                <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(223, 186, 107, 0.2)', color: '#DFBA6B' }}>
                  {Object.keys(activeScene.sceneGraph.nodes).length} Nodes
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--cel-text-dim, #64748B)', lineHeight: 1.4 }}>
                Transform nodes directly on canvas or refine coordinates, rotation, scaling, auto-layout, and tokens with sub-pixel precision.
              </div>

              {/* Quick Visual Presets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 600 }}>Quick Visual Presets:</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                  {[
                    { label: 'Editorial', action: 'editorial' },
                    { label: 'Centered', action: 'centered' },
                    { label: 'Overlapping', action: 'overlapping' },
                    { label: 'Asymmetric', action: 'asymmetric' },
                    { label: 'Split', action: 'split' },
                    { label: 'Reset Baseline', action: 'reset' },
                  ].map((preset) => (
                    <button
                      key={preset.action}
                      onClick={() => {
                        if (!activeScene.sceneGraph || !dispatch) return;
                        if (preset.action === 'overlapping' && activeScene.sceneGraph.nodes['portrait_a'] && activeScene.sceneGraph.nodes['portrait_b']) {
                          dispatch({
                            type: 'SG_UPDATE_GEOMETRY',
                            sceneId: activeScene.id,
                            nodeId: 'portrait_a',
                            patch: { x: '15%', y: '10%', rotation: -6, zIndex: 1 },
                          });
                          dispatch({
                            type: 'SG_UPDATE_GEOMETRY',
                            sceneId: activeScene.id,
                            nodeId: 'portrait_b',
                            patch: { x: '35%', y: '15%', rotation: 4, zIndex: 2 },
                          });
                        } else if (preset.action === 'asymmetric' && activeScene.sceneGraph.nodes['portrait_a'] && activeScene.sceneGraph.nodes['portrait_b']) {
                          dispatch({
                            type: 'SG_UPDATE_GEOMETRY',
                            sceneId: activeScene.id,
                            nodeId: 'portrait_a',
                            patch: { x: '8%', y: '5%', rotation: -3, width: '280px', height: '380px' },
                          });
                          dispatch({
                            type: 'SG_UPDATE_GEOMETRY',
                            sceneId: activeScene.id,
                            nodeId: 'portrait_b',
                            patch: { x: '55%', y: '25%', rotation: 5, width: '360px', height: '460px' },
                          });
                        } else if (preset.action === 'centered' && activeScene.sceneGraph.nodes['portrait_a'] && activeScene.sceneGraph.nodes['portrait_b']) {
                          dispatch({
                            type: 'SG_UPDATE_GEOMETRY',
                            sceneId: activeScene.id,
                            nodeId: 'portrait_a',
                            patch: { position: 'flow', x: 0, y: 0, rotation: 0 },
                          });
                          dispatch({
                            type: 'SG_UPDATE_GEOMETRY',
                            sceneId: activeScene.id,
                            nodeId: 'portrait_b',
                            patch: { position: 'flow', x: 0, y: 0, rotation: 0 },
                          });
                        } else if (preset.action === 'editorial' && activeScene.sceneGraph.nodes['portrait_a'] && activeScene.sceneGraph.nodes['portrait_b']) {
                          dispatch({
                            type: 'SG_UPDATE_GEOMETRY',
                            sceneId: activeScene.id,
                            nodeId: 'portrait_a',
                            patch: { position: 'absolute', x: '10%', y: '10%', rotation: -4, width: '300px', height: '400px', zIndex: 2 },
                          });
                          dispatch({
                            type: 'SG_UPDATE_GEOMETRY',
                            sceneId: activeScene.id,
                            nodeId: 'portrait_b',
                            patch: { position: 'absolute', x: '50%', y: '20%', rotation: 3, width: '350px', height: '450px', zIndex: 1 },
                          });
                        }
                      }}
                      style={{
                        padding: '4px 6px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#FFF9F5',
                        fontSize: '0.64rem',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Node Selection & Hierarchy */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--cel-text-muted, #94A3B8)', marginBottom: '6px', fontWeight: 600 }}>
                Scene Graph Hierarchy
              </label>
              <div
                style={{
                  maxHeight: '180px',
                  overflowY: 'auto',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                {activeScene.sceneGraph.renderOrder.map((nodeId) => {
                  const node = activeScene.sceneGraph!.nodes[nodeId];
                  if (!node) return null;
                  const isSelected = selectedLayerId === nodeId;
                  return (
                    <div
                      key={nodeId}
                      onClick={() => onSelectLayer(nodeId, activeScene.id)}
                      style={{
                        padding: '5px 8px',
                        borderRadius: '4px',
                        background: isSelected ? 'rgba(223, 186, 107, 0.2)' : 'transparent',
                        border: isSelected ? '1px solid rgba(223, 186, 107, 0.4)' : '1px solid transparent',
                        color: isSelected ? '#DFBA6B' : '#CBD5E1',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '0.6rem', padding: '1px 4px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', color: '#94A3B8' }}>
                          {node.kind}
                        </span>
                        <span style={{ fontWeight: isSelected ? 700 : 400 }}>{node.name}</span>
                      </div>
                      <span style={{ fontSize: '0.6rem', color: '#64748B' }}>
                        {node.geometry.position === 'absolute' ? `(${node.geometry.x}, ${node.geometry.y})` : 'flow'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Selected Node Precision Transform Inspector */}
            {selectedLayerId && activeScene.sceneGraph.nodes[selectedLayerId] && (() => {
              const selNode = activeScene.sceneGraph!.nodes[selectedLayerId]!;
              const updateGeo = (patch: any) => {
                if (!dispatch) return;
                dispatch({
                  type: 'SG_UPDATE_GEOMETRY',
                  sceneId: activeScene.id,
                  nodeId: selNode.id,
                  patch,
                });
              };
              const updateStyle = (patch: any) => {
                if (!dispatch) return;
                dispatch({
                  type: 'SG_UPDATE_STYLE',
                  sceneId: activeScene.id,
                  nodeId: selNode.id,
                  patch,
                });
              };

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
                  {/* Selected Node Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FFF' }}>{selNode.name}</span>
                      <span style={{ fontSize: '0.66rem', color: '#DFBA6B', marginLeft: '6px' }}>({selNode.kind})</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        title="Duplicate Node"
                        onClick={() => dispatch?.({ type: 'SG_DUPLICATE_NODE', sceneId: activeScene.id, nodeId: selNode.id })}
                        style={{ padding: '3px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94A3B8', fontSize: '0.66rem', cursor: 'pointer' }}
                      >
                        Copy
                      </button>
                      <button
                        title="Delete Node"
                        onClick={() => dispatch?.({ type: 'SG_DELETE_NODE', sceneId: activeScene.id, nodeId: selNode.id })}
                        style={{ padding: '3px 6px', borderRadius: '4px', background: 'rgba(239,68,68,0.15)', border: 'none', color: '#EF4444', fontSize: '0.66rem', cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Position Mode Toggle */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--cel-text-muted, #94A3B8)', marginBottom: '4px', fontWeight: 600 }}>
                      Positioning Mode
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                      {(['absolute', 'flow'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => updateGeo({ position: mode })}
                          style={{
                            padding: '6px',
                            borderRadius: '4px',
                            border: 'none',
                            background: selNode.geometry.position === mode ? 'rgba(223, 186, 107, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                            color: selNode.geometry.position === mode ? '#DFBA6B' : '#94A3B8',
                            fontSize: '0.7rem',
                            fontWeight: selNode.geometry.position === mode ? 700 : 400,
                            cursor: 'pointer',
                          }}
                        >
                          {mode === 'absolute' ? 'Freeform (X/Y)' : 'Flow / Auto Layout'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Coordinates: X, Y, Width, Height */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', color: '#94A3B8', marginBottom: '2px' }}>Position X</label>
                      <input
                        type="text"
                        value={String(selNode.geometry.x ?? 0)}
                        onChange={(e) => updateGeo({ x: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', color: '#FFF', fontSize: '0.75rem', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', color: '#94A3B8', marginBottom: '2px' }}>Position Y</label>
                      <input
                        type="text"
                        value={String(selNode.geometry.y ?? 0)}
                        onChange={(e) => updateGeo({ y: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', color: '#FFF', fontSize: '0.75rem', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', color: '#94A3B8', marginBottom: '2px' }}>Width</label>
                      <input
                        type="text"
                        value={String(selNode.geometry.width ?? 'auto')}
                        onChange={(e) => updateGeo({ width: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', color: '#FFF', fontSize: '0.75rem', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', color: '#94A3B8', marginBottom: '2px' }}>Height</label>
                      <input
                        type="text"
                        value={String(selNode.geometry.height ?? 'auto')}
                        onChange={(e) => updateGeo({ height: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', color: '#FFF', fontSize: '0.75rem', outline: 'none' }}
                      />
                    </div>
                  </div>

                  {/* Rotation & Scale Controls */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.68rem', color: '#94A3B8' }}>Rotation</label>
                      <span style={{ fontSize: '0.7rem', color: '#DFBA6B', fontFamily: 'monospace' }}>{selNode.geometry.rotation || 0}°</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={selNode.geometry.rotation || 0}
                      onChange={(e) => updateGeo({ rotation: Number(e.target.value) })}
                      style={{ width: '100%', accentColor: '#DFBA6B' }}
                    />
                  </div>

                  {/* Z-Index & Opacity */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', color: '#94A3B8', marginBottom: '2px' }}>Z-Index</label>
                      <input
                        type="number"
                        value={selNode.geometry.zIndex || 0}
                        onChange={(e) => updateGeo({ zIndex: Number(e.target.value) })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', color: '#FFF', fontSize: '0.75rem', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', color: '#94A3B8', marginBottom: '2px' }}>Opacity ({Math.round((selNode.geometry.opacity ?? 1) * 100)}%)</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={selNode.geometry.opacity ?? 1}
                        onChange={(e) => updateGeo({ opacity: Number(e.target.value) })}
                        style={{ width: '100%', accentColor: '#DFBA6B' }}
                      />
                    </div>
                  </div>

                  {/* Auto Layout Options (for container / stack nodes) */}
                  {(selNode.kind === 'container' || selNode.kind === 'stack' || selNode.kind === 'grid') && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '0.7rem', color: '#DFBA6B', fontWeight: 600 }}>Auto Layout Configuration</span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                        {(['stack', 'grid', 'freeform'] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => dispatch?.({ type: 'SG_SET_LAYOUT_MODE', sceneId: activeScene.id, nodeId: selNode.id, layoutMode: mode })}
                            style={{
                              padding: '5px',
                              borderRadius: '4px',
                              background: selNode.layoutMode === mode ? 'rgba(223, 186, 107, 0.25)' : 'rgba(255,255,255,0.04)',
                              border: selNode.layoutMode === mode ? '1px solid #DFBA6B' : '1px solid transparent',
                              color: selNode.layoutMode === mode ? '#DFBA6B' : '#94A3B8',
                              fontSize: '0.66rem',
                              cursor: 'pointer',
                            }}
                          >
                            {mode.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Typography styling (if text / richtext) */}
                  {(selNode.kind === 'text' || selNode.kind === 'richtext') && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '0.7rem', color: '#DFBA6B', fontWeight: 600 }}>Typography Refinement</span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.66rem', color: '#94A3B8', marginBottom: '2px' }}>Font Size</label>
                          <input
                            type="text"
                            value={String(selNode.style.typography?.fontSize || '1rem')}
                            onChange={(e) => updateStyle({ typography: { ...selNode.style.typography, fontSize: e.target.value } })}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', color: '#FFF', fontSize: '0.72rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.66rem', color: '#94A3B8', marginBottom: '2px' }}>Letter Spacing</label>
                          <input
                            type="text"
                            value={String(selNode.style.typography?.letterSpacing || 'normal')}
                            onChange={(e) => updateStyle({ typography: { ...selNode.style.typography, letterSpacing: e.target.value } })}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', color: '#FFF', fontSize: '0.72rem' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Component Engine (P14-C) */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: '#DFBA6B', fontWeight: 600 }}>Component Architecture</span>
                      {selNode.component?.isMaster && <span style={{ fontSize: '0.62rem', background: '#DFBA6B', color: '#090D1A', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>MASTER</span>}
                      {selNode.component && !selNode.component.isMaster && !selNode.component.isDetached && <span style={{ fontSize: '0.62rem', background: '#38BDF8', color: '#090D1A', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>INSTANCE</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {!selNode.component?.isMaster && !selNode.component?.masterComponentId && (
                        <button
                          onClick={() => dispatch?.({ type: 'SG_CREATE_COMPONENT', sceneId: activeScene.id, nodeId: selNode.id })}
                          style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(223, 186, 107, 0.15)', border: '1px solid #DFBA6B', color: '#DFBA6B', fontSize: '0.66rem', cursor: 'pointer' }}
                        >
                          👑 Make Master Component
                        </button>
                      )}
                      {selNode.component?.isMaster && (
                        <button
                          onClick={() => dispatch?.({ type: 'SG_INSTANTIATE_COMPONENT', sceneId: activeScene.id, masterNodeId: selNode.id, targetParentId: selNode.parentId || activeScene.sceneGraph?.rootNodeId || '' })}
                          style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38BDF8', color: '#38BDF8', fontSize: '0.66rem', cursor: 'pointer' }}
                        >
                          + Create Instance
                        </button>
                      )}
                      {selNode.component && !selNode.component.isMaster && !selNode.component.isDetached && (
                        <button
                          onClick={() => dispatch?.({ type: 'SG_DETACH_INSTANCE', sceneId: activeScene.id, nodeId: selNode.id })}
                          style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid #F43F5E', color: '#F43F5E', fontSize: '0.66rem', cursor: 'pointer' }}
                        >
                          ✂ Detach Instance
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Data Engine & Repeaters (P14-D) */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#DFBA6B', fontWeight: 600 }}>Data Binding & Collections</span>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.66rem', color: '#94A3B8', marginBottom: '2px' }}>Binding Path</label>
                      <input
                        type="text"
                        placeholder="e.g. celebrants[0].name or celebration.title"
                        value={selNode.binding?.fieldKey || ''}
                        onChange={(e) => dispatch?.({ type: 'SG_SET_BINDING', sceneId: activeScene.id, nodeId: selNode.id, binding: e.target.value ? { fieldKey: e.target.value, bindingType: 'content' } : null })}
                        style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', color: '#FFF', fontSize: '0.72rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.66rem', color: '#94A3B8', marginBottom: '2px' }}>Collection Repeater ([*])</label>
                      <input
                        type="text"
                        placeholder="e.g. itinerary.events[*] or story.milestones[*]"
                        value={selNode.repeater?.arrayFieldKey || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const firstChildId = selNode.children[0] || selNode.id;
                          dispatch?.({
                            type: 'SG_SET_REPEATER',
                            sceneId: activeScene.id,
                            nodeId: selNode.id,
                            repeater: val ? { arrayFieldKey: val, itemTemplateNodeId: firstChildId } : null,
                          });
                        }}
                        style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', color: '#FFF', fontSize: '0.72rem' }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 4. Insert New Elements Palette */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.74rem', color: 'var(--cel-text-muted, #94A3B8)', fontWeight: 600 }}>
                Insert Celebration Primitives (P14-B)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {[
                  { kind: 'text', label: '+ Text' },
                  { kind: 'richtext', label: '+ RichText' },
                  { kind: 'image', label: '+ Image' },
                  { kind: 'button', label: '+ Button' },
                  { kind: 'divider', label: '+ Divider' },
                  { kind: 'icon', label: '+ Icon' },
                  { kind: 'stack', label: '+ Stack' },
                  { kind: 'grid', label: '+ Grid' },
                  { kind: 'shape', label: '+ Shape' },
                  { kind: 'portrait', label: '+ Portrait' },
                  { kind: 'couplecluster', label: '+ Couple' },
                  { kind: 'countdown', label: '+ Countdown' },
                  { kind: 'eventcard', label: '+ Event Card' },
                  { kind: 'storymilestone', label: '+ Milestone' },
                  { kind: 'rsvpform', label: '+ RSVP Form' },
                  { kind: 'gallery', label: '+ Gallery' },
                  { kind: 'atmosphere', label: '+ Atmosphere' },
                  { kind: 'orbit', label: '+ Orbit' },
                ].map((item) => (
                  <button
                    key={item.kind}
                    onClick={() => {
                      if (!activeScene.sceneGraph || !dispatch) return;
                      dispatch({
                        type: 'SG_CREATE_NODE',
                        sceneId: activeScene.id,
                        kind: item.kind as any,
                        parentId: selectedLayerId || activeScene.sceneGraph.rootNodeId,
                      });
                    }}
                    style={{
                      padding: '6px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#E2E8F0',
                      fontSize: '0.68rem',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: MOTION STUDIO (Prompt #23)                                         */}
        {/* ========================================================================= */}
        {activeTab === 'motion' && activeScene && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--cel-text-muted, #94A3B8)', marginBottom: '6px', fontWeight: 600 }}>
                Motion Intensity Preset
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                {(['none', 'soft', 'subtle', 'expressive', 'cinematic'] as MotionPresetType[]).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => onUpdateScene(activeScene.id, { motionPreset: preset })}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: activeScene.motionPreset === preset
                        ? '1px solid #DFBA6B'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      background: activeScene.motionPreset === preset
                        ? 'rgba(223, 186, 107, 0.2)'
                        : 'rgba(255, 255, 255, 0.03)',
                      color: activeScene.motionPreset === preset ? '#DFBA6B' : '#CBD5E1',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--cel-text-muted, #94A3B8)' }}>Entry Duration:</span>
                <strong style={{ color: '#fff' }}>{activeScene.motionConfig.entryDuration ?? 1.2} s</strong>
              </div>
              <input
                type="range"
                min={0.2}
                max={3}
                step={0.1}
                value={activeScene.motionConfig.entryDuration ?? 1.2}
                onMouseDown={() => onBeginTransaction && onBeginTransaction('Adjust entry duration')}
                onTouchStart={() => onBeginTransaction && onBeginTransaction('Adjust entry duration')}
                onMouseUp={() => onCommitTransaction && onCommitTransaction()}
                onTouchEnd={() => onCommitTransaction && onCommitTransaction()}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateScene(activeScene.id, {
                    motionConfig: { ...activeScene.motionConfig, entryDuration: val },
                  });
                }}
                style={{ width: '100%', accentColor: '#DFBA6B' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--cel-text-muted, #94A3B8)' }}>Stagger Delay:</span>
                <strong style={{ color: '#fff' }}>{activeScene.motionConfig.staggerDelay ?? 0.15} s</strong>
              </div>
              <input
                type="range"
                min={0.05}
                max={0.5}
                step={0.05}
                value={activeScene.motionConfig.staggerDelay ?? 0.15}
                onMouseDown={() => onBeginTransaction && onBeginTransaction('Adjust stagger delay')}
                onTouchStart={() => onBeginTransaction && onBeginTransaction('Adjust stagger delay')}
                onMouseUp={() => onCommitTransaction && onCommitTransaction()}
                onTouchEnd={() => onCommitTransaction && onCommitTransaction()}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateScene(activeScene.id, {
                    motionConfig: { ...activeScene.motionConfig, staggerDelay: val },
                  });
                }}
                style={{ width: '100%', accentColor: '#DFBA6B' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--cel-text-muted, #94A3B8)' }}>Parallax Depth Tilt:</span>
                <strong style={{ color: '#fff' }}>{activeScene.motionConfig.parallaxDepth}</strong>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={activeScene.motionConfig.parallaxDepth}
                onMouseDown={() => onBeginTransaction && onBeginTransaction('Adjust parallax depth')}
                onTouchStart={() => onBeginTransaction && onBeginTransaction('Adjust parallax depth')}
                onMouseUp={() => onCommitTransaction && onCommitTransaction()}
                onTouchEnd={() => onCommitTransaction && onCommitTransaction()}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateScene(activeScene.id, {
                    motionConfig: { ...activeScene.motionConfig, parallaxDepth: val },
                  });
                }}
                style={{ width: '100%', accentColor: '#DFBA6B' }}
              />
              <span style={{ fontSize: '0.68rem', color: 'var(--cel-text-dim, #64748B)' }}>
                Movement relative to scroll depth and ambient device gyro.
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--cel-text-muted, #94A3B8)', marginBottom: '4px', fontWeight: 600 }}>
                  Easing Curve
                </label>
                <select
                  value={activeScene.motionConfig.easing || 'ease-out'}
                  onChange={(e) => {
                    onUpdateScene(activeScene.id, {
                      motionConfig: { ...activeScene.motionConfig, easing: e.target.value as any },
                    });
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    background: '#0B1120',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#fff',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                  }}
                >
                  <option value="ease-out">Ease Out (Cinematic)</option>
                  <option value="cubic-bezier">Cubic Bezier (Snappy)</option>
                  <option value="spring">Spring Dynamic</option>
                  <option value="linear">Linear Uniform</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--cel-text-muted, #94A3B8)', marginBottom: '4px', fontWeight: 600 }}>
                  A11y Fallback
                </label>
                <select
                  value={activeScene.motionConfig.reducedMotionFallback || 'fade'}
                  onChange={(e) => {
                    onUpdateScene(activeScene.id, {
                      motionConfig: { ...activeScene.motionConfig, reducedMotionFallback: e.target.value as any },
                    });
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    background: '#0B1120',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#fff',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                  }}
                >
                  <option value="fade">Subtle Crossfade</option>
                  <option value="static">Static Instant</option>
                  <option value="instant">Instant Snap</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SCENE INTERACTIONS & GESTURE SYSTEM (P3 Interaction Authoring)     */}
        {/* ========================================================================= */}
        {activeTab === 'interactions' && activeScene && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '10px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div>
                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>
                  Interactive Gestures
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: 'var(--cel-text-muted, #94A3B8)' }}>
                  {activeScene.name} • {(activeScene.interactions || []).length} registered
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const newId = `int_${activeScene.slug || activeScene.id}_${Date.now().toString(36)}`;
                  const defaultLayer = activeScene.layers[0]?.id || 'root';
                  const newInteraction = {
                    id: newId,
                    name: `${activeScene.name} Tap Interaction`,
                    trigger: 'tap' as const,
                    targetElementId: defaultLayer,
                    action: 'trigger_transition' as const,
                    actionParam: 'next_scene',
                  };
                  const updated = [...(activeScene.interactions || []), newInteraction];
                  onUpdateScene(activeScene.id, { interactions: updated });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'rgba(223, 186, 107, 0.15)',
                  border: '1px solid #DFBA6B',
                  color: '#DFBA6B',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Plus size={13} />
                <span>Add Interaction</span>
              </button>
            </div>

            {/* List of Interactions */}
            {(activeScene.interactions || []).length === 0 ? (
              <div
                style={{
                  padding: '24px 16px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px dashed rgba(255, 255, 255, 0.1)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Zap size={24} color="#DFBA6B" style={{ opacity: 0.7 }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>
                  No Interactions Configured
                </span>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--cel-text-dim, #64748B)', maxWidth: '280px', lineHeight: 1.4 }}>
                  Connect guest gestures (tap, click, hover) to transitions, audio triggers, modal reveals, and RSVP actions.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const newId = `int_${activeScene.slug || activeScene.id}_1`;
                    const defaultLayer = activeScene.layers[0]?.id || 'root';
                    const newInteraction = {
                      id: newId,
                      name: `${activeScene.name} Portal Unlatch`,
                      trigger: 'click' as const,
                      targetElementId: defaultLayer,
                      action: 'trigger_transition' as const,
                      actionParam: 'next_scene',
                    };
                    onUpdateScene(activeScene.id, { interactions: [newInteraction] });
                  }}
                  style={{
                    marginTop: '8px',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    background: 'rgba(223, 186, 107, 0.15)',
                    border: '1px solid #DFBA6B',
                    color: '#DFBA6B',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Add Recommended Interaction
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {(activeScene.interactions || []).map((int, idx) => {
                  const isTested = testedInteractionId === int.id;

                  return (
                    <div
                      key={int.id}
                      style={{
                        padding: '14px',
                        borderRadius: '10px',
                        background: 'rgba(15, 23, 42, 0.65)',
                        border: isTested ? '1px solid #10B981' : '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: isTested ? '0 0 16px rgba(16, 185, 129, 0.25)' : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {/* Interaction Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(223, 186, 107, 0.15)',
                              color: '#DFBA6B',
                              fontSize: '0.66rem',
                              fontWeight: 800,
                              fontFamily: 'monospace',
                            }}
                          >
                            0{idx + 1}
                          </span>
                          <input
                            type="text"
                            value={int.name}
                            onChange={(e) => {
                              const updated = (activeScene.interactions || []).map((item) =>
                                item.id === int.id ? { ...item, name: e.target.value } : item
                              );
                              onUpdateScene(activeScene.id, { interactions: updated });
                            }}
                            placeholder="Interaction Name"
                            style={{
                              flex: 1,
                              background: 'transparent',
                              border: 'none',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                              color: '#fff',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              padding: '2px 4px',
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (activeScene.interactions || []).filter((item) => item.id !== int.id);
                            onUpdateScene(activeScene.id, { interactions: updated });
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--cel-text-dim, #64748B)',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Delete Interaction"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Trigger & Target Controls */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {/* Trigger */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--cel-text-muted, #94A3B8)', marginBottom: '4px', fontWeight: 600 }}>
                            Trigger Gesture
                          </label>
                          <select
                            value={int.trigger}
                            onChange={(e) => {
                              const updated = (activeScene.interactions || []).map((item) =>
                                item.id === int.id ? { ...item, trigger: e.target.value as any } : item
                              );
                              onUpdateScene(activeScene.id, { interactions: updated });
                            }}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              background: '#0B1120',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: '#fff',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                            }}
                          >
                            <option value="click">Click / Tap</option>
                            <option value="tap">Touch Tap</option>
                            <option value="double_tap">Double Tap</option>
                            <option value="hover">Pointer Hover</option>
                            <option value="scroll_reach">Scroll Reach</option>
                            <option value="drag">Drag / Pan</option>
                            <option value="swipe">Swipe</option>
                            <option value="long_press">Long Press</option>
                          </select>
                        </div>

                        {/* Target Layer / Element */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--cel-text-muted, #94A3B8)', marginBottom: '4px', fontWeight: 600 }}>
                            Target Element / Layer
                          </label>
                          <select
                            value={int.targetElementId || ''}
                            onChange={(e) => {
                              const updated = (activeScene.interactions || []).map((item) =>
                                item.id === int.id ? { ...item, targetElementId: e.target.value } : item
                              );
                              onUpdateScene(activeScene.id, { interactions: updated });
                            }}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              background: '#0B1120',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: '#fff',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                            }}
                          >
                            <option value="root">Scene Root Container</option>
                            {activeScene.layers.map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.name} ({l.semanticRole || l.layerType})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Action & Parameter Controls */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {/* Action */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--cel-text-muted, #94A3B8)', marginBottom: '4px', fontWeight: 600 }}>
                            Action Executed
                          </label>
                          <select
                            value={int.action}
                            onChange={(e) => {
                              const updated = (activeScene.interactions || []).map((item) =>
                                item.id === int.id ? { ...item, action: e.target.value as any } : item
                              );
                              onUpdateScene(activeScene.id, { interactions: updated });
                            }}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              background: '#0B1120',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: '#DFBA6B',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                            }}
                          >
                            <option value="trigger_transition">Trigger Transition</option>
                            <option value="reveal_content">Reveal Content Modal</option>
                            <option value="expand_modal">Expand Detail Modal</option>
                            <option value="play_audio">Play / Toggle Audio</option>
                            <option value="open_rsvp">Open RSVP Decree</option>
                            <option value="highlight_element">Highlight / Open Maps</option>
                            <option value="chapter_jump">Jump To Chapter</option>
                            <option value="toggle_view">Toggle View Mode</option>
                          </select>
                        </div>

                        {/* Action Param */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--cel-text-muted, #94A3B8)', marginBottom: '4px', fontWeight: 600 }}>
                            Action Parameter
                          </label>
                          <input
                            type="text"
                            value={int.actionParam || ''}
                            onChange={(e) => {
                              const updated = (activeScene.interactions || []).map((item) =>
                                item.id === int.id ? { ...item, actionParam: e.target.value } : item
                              );
                              onUpdateScene(activeScene.id, { interactions: updated });
                            }}
                            placeholder={
                              int.action === 'trigger_transition'
                                ? 'next_scene'
                                : int.action === 'reveal_content'
                                ? 'vow_bio_modal'
                                : int.action === 'expand_modal'
                                ? 'milestone_modal'
                                : int.action === 'play_audio'
                                ? 'soundscape'
                                : 'parameter'
                            }
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              background: '#0B1120',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: '#fff',
                              fontSize: '0.74rem',
                              fontWeight: 500,
                            }}
                          />
                        </div>
                      </div>

                      {/* Condition (Optional) */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--cel-text-dim, #64748B)', marginBottom: '4px', fontWeight: 600 }}>
                          Execution Condition (Optional)
                        </label>
                        <input
                          type="text"
                          value={int.condition || ''}
                          onChange={(e) => {
                            const updated = (activeScene.interactions || []).map((item) =>
                              item.id === int.id ? { ...item, condition: e.target.value } : item
                            );
                            onUpdateScene(activeScene.id, { interactions: updated });
                          }}
                          placeholder="e.g. audio_unlocked, rsvp_open"
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            background: '#0B1120',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            color: 'var(--cel-text-muted, #94A3B8)',
                            fontSize: '0.72rem',
                          }}
                        />
                      </div>

                      {/* Test Trigger Button */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <div style={{ fontSize: '0.68rem', color: isTested ? '#10B981' : 'var(--cel-text-dim, #64748B)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {isTested ? (
                            <>
                              <Check size={12} color="#10B981" />
                              <span style={{ fontWeight: 700 }}>Trigger dispatched: {int.action}({int.actionParam || 'default'})</span>
                            </>
                          ) : (
                            <span>Target: {int.targetElementId || 'root'}</span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setTestedInteractionId(int.id);
                            setTimeout(() => {
                              setTestedInteractionId(null);
                            }, 2500);
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '5px',
                            background: isTested ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                            border: isTested ? '1px solid #10B981' : '1px solid rgba(255, 255, 255, 0.15)',
                            color: isTested ? '#10B981' : '#fff',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Zap size={11} color={isTested ? '#10B981' : '#DFBA6B'} />
                          <span>{isTested ? 'Triggered!' : 'Test Gesture'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: CUSTOMIZATION PERMISSIONS & CAPABILITIES MATRIX                     */}
        {/* ========================================================================= */}
        {activeTab === 'permissions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                padding: '10px',
                borderRadius: '8px',
                background: 'rgba(223, 186, 107, 0.08)',
                border: '1px solid rgba(223, 186, 107, 0.2)',
                fontSize: '0.74rem',
                color: '#DFBA6B',
                lineHeight: 1.5,
              }}
            >
              <strong>Customization Governance:</strong> Controls which properties customers can safely personalize in Creator Studio.
            </div>

            {activeField ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--cel-text-muted, #94A3B8)', fontWeight: 600 }}>
                  Customization Level for '{activeField.label}'
                </label>

                {(['LOCKED', 'CURATED', 'FLEXIBLE', 'ADVANCED'] as CustomizationLevel[]).map((level) => {
                  const isSelected = activeField.customizationLevel === level;
                  const descriptions: Record<CustomizationLevel, string> = {
                    LOCKED: 'Customer cannot change this value. Template default is enforced.',
                    CURATED: 'Customer selects from pre-approved luxury palettes or typography.',
                    FLEXIBLE: 'Customer has full freedom to input text, photos, or numbers within validation limits.',
                    ADVANCED: 'Restricted to B2B sovereign event planners and VIP customers.',
                  };

                  return (
                    <div
                      key={level}
                      onClick={() => onUpdateField(activeField.id, { customizationLevel: level })}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: isSelected ? '1px solid #DFBA6B' : '1px solid rgba(255, 255, 255, 0.08)',
                        background: isSelected ? 'rgba(223, 186, 107, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: isSelected ? '#DFBA6B' : '#fff' }}>
                          {level}
                        </span>
                        {isSelected && <Check size={14} color="#DFBA6B" />}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--cel-text-dim, #64748B)' }}>
                        {descriptions[level]}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: 'var(--cel-text-muted, #94A3B8)', fontSize: '0.78rem' }}>
                Select a field to configure customer customization permissions.
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* BASIC VS ADVANCED MODEL TOGGLE (Prompt #14)                               */}
        {/* ========================================================================= */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '14px', marginTop: 'auto' }}>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '6px 8px',
              borderRadius: '6px',
              background: 'transparent',
              border: 'none',
              color: 'var(--cel-text-dim, #64748B)',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <span>Advanced Developer Controls</span>
            {showAdvanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {showAdvanced && (
            <div
              style={{
                marginTop: '10px',
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '0.7rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--cel-text-dim, #64748B)' }}>Schema Path: </span>
                <code style={{ color: '#38BDF8' }}>{activeField?.key || activeLayer?.bindingFieldKey || '—'}</code>
              </div>
              <div>
                <span style={{ color: 'var(--cel-text-dim, #64748B)' }}>Resolver: </span>
                <code style={{ color: '#DFBA6B' }}>
                  {activeField?.type === 'image' ? 'ImageMediaResolver' : activeField?.type === 'date' ? 'DateValueResolver' : 'StandardValueResolver'}
                </code>
              </div>
              <div>
                <span style={{ color: 'var(--cel-text-dim, #64748B)' }}>A11y Role: </span>
                <code style={{ color: '#10B981' }}>{activeScene?.accessibility?.ariaRole || 'region'}</code>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
