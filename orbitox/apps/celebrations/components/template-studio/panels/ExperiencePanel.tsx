'use client';

import React from 'react';
import {
  TemplateSchema,
  TemplateSceneDefinition,
  SceneTransitionType,
} from '../types/TemplateSchema';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  MoveDown,
  Sparkles,
  Layers,
  Settings2,
  Check,
  Zap,
  Smartphone,
  Tablet,
  Monitor,
  ShieldCheck,
  AlertTriangle,
  Play,
} from 'lucide-react';

import { TemplateEditorCommand } from '../engine/TemplateEditorCommands';
import { CreateSceneWizard } from '../components/CreateSceneWizard';

interface ExperiencePanelProps {
  schema: TemplateSchema;
  onUpdateScenes: (scenes: TemplateSceneDefinition[]) => void;
  onSelectScene: (sceneId: string) => void;
  onNavigateTab: (tab: any) => void;
  dispatch?: (command: TemplateEditorCommand) => void;
}

export function ExperiencePanel({
  schema,
  onUpdateScenes,
  onSelectScene,
  onNavigateTab,
  dispatch,
}: ExperiencePanelProps) {
  const moveScene = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= schema.scenes.length) return;

    const newScenes = [...schema.scenes];
    const temp = newScenes[index]!;
    newScenes[index] = newScenes[targetIndex]!;
    newScenes[targetIndex] = temp;

    // Recalculate order numbers
    newScenes.forEach((s, idx) => {
      s.order = idx + 1;
    });

    onUpdateScenes(newScenes);
  };

  const toggleSceneVisibility = (sceneId: string) => {
    const updated = schema.scenes.map((s) => {
      if (s.id === sceneId) {
        return { ...s, defaultVisible: !s.defaultVisible };
      }
      return s;
    });
    onUpdateScenes(updated);
  };

  const duplicateScene = (scene: TemplateSceneDefinition) => {
    const cloned: TemplateSceneDefinition = {
      ...JSON.parse(JSON.stringify(scene)),
      id: `scene_${Date.now()}`,
      name: `${scene.name} (Copy)`,
      slug: `${scene.slug}-copy`,
      order: schema.scenes.length + 1,
    };
    onUpdateScenes([...schema.scenes, cloned]);
  };

  const updateSceneTransition = (sceneId: string, transition: SceneTransitionType) => {
    const updated = schema.scenes.map((s) => {
      if (s.id === sceneId) {
        return {
          ...s,
          transitionToNext: {
            ...s.transitionToNext,
            type: transition,
          },
        };
      }
      return s;
    });
    onUpdateScenes(updated);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '880px', margin: '0 auto', color: '#fff' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 6px 0' }}>
            Visual Experience Map
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--cel-text-muted, #94A3B8)', margin: 0, lineHeight: 1.5 }}>
            The sequential journey through the celebration world. Reorder scenes, inspect device coverage, configure cinematic transitions, and verify customer customization boundaries.
          </p>
        </div>
        {dispatch && <CreateSceneWizard dispatch={dispatch} />}
      </div>

      {/* Vertical Journey Nodes */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
        {schema.scenes.map((scene, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === schema.scenes.length - 1;
          const editableLayersCount = scene.layers.filter((l) => l.isCustomerEditable).length;
          const hasMobileOverride = Boolean(scene.layoutRules?.mobile?.isOverridden);

          return (
            <React.Fragment key={scene.id}>
              {/* Scene Card Node */}
              <div
                style={{
                  width: '100%',
                  borderRadius: '16px',
                  background: scene.defaultVisible ? 'rgba(13, 20, 41, 0.75)' : 'rgba(255, 255, 255, 0.02)',
                  border: scene.defaultVisible
                    ? '1px solid rgba(223, 186, 107, 0.25)'
                    : '1px solid rgba(255, 255, 255, 0.06)',
                  boxShadow: scene.defaultVisible ? '0 8px 32px rgba(0, 0, 0, 0.4)' : 'none',
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Left: Reorder & Number */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button
                      onClick={() => moveScene(idx, 'up')}
                      disabled={isFirst}
                      title="Move Up"
                      style={{
                        padding: '4px',
                        borderRadius: '4px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        background: 'rgba(255, 255, 255, 0.04)',
                        color: isFirst ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
                        cursor: isFirst ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      onClick={() => moveScene(idx, 'down')}
                      disabled={isLast}
                      title="Move Down"
                      style={{
                        padding: '4px',
                        borderRadius: '4px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        background: 'rgba(255, 255, 255, 0.04)',
                        color: isLast ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
                        cursor: isLast ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <ArrowDown size={12} />
                    </button>
                  </div>

                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: 'rgba(223, 186, 107, 0.15)',
                      border: '1px solid rgba(223, 186, 107, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      color: '#DFBA6B',
                      fontSize: '0.95rem',
                    }}
                  >
                    {idx + 1}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '1.05rem', color: '#fff' }}>{scene.name}</strong>
                      <span
                        style={{
                          fontSize: '0.66rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(56, 189, 248, 0.12)',
                          color: '#38BDF8',
                          fontWeight: 700,
                          textTransform: 'capitalize',
                        }}
                      >
                        {scene.sceneType.replace('_', ' ')}
                      </span>
                      <span
                        style={{
                          fontSize: '0.66rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: scene.isRequired ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                          color: scene.isRequired ? '#10B981' : 'var(--cel-text-dim, #64748B)',
                          fontWeight: 700,
                        }}
                      >
                        {scene.isRequired ? 'REQUIRED' : 'OPTIONAL'}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.78rem', color: 'var(--cel-text-muted, #94A3B8)', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                      {scene.purpose}
                    </p>

                    {/* Operational Coverage Pills (Device, Motion, Customization, Validation) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {/* Desktop */}
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '0.68rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: '#10B981',
                        }}
                      >
                        <Check size={11} />
                        <span>Desktop</span>
                      </span>

                      {/* Tablet */}
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '0.68rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: '#10B981',
                        }}
                      >
                        <Check size={11} />
                        <span>Tablet</span>
                      </span>

                      {/* Mobile */}
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '0.68rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: hasMobileOverride ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: hasMobileOverride ? '#10B981' : '#F59E0B',
                        }}
                      >
                        {hasMobileOverride ? <Check size={11} /> : <AlertTriangle size={11} />}
                        <span>{hasMobileOverride ? 'Mobile Override' : 'Mobile Inherited'}</span>
                      </span>

                      {/* Motion */}
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '0.68rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(223, 186, 107, 0.12)',
                          color: '#DFBA6B',
                        }}
                      >
                        <Sparkles size={11} />
                        <span>Motion ({scene.motionPreset})</span>
                      </span>

                      {/* Customization */}
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '0.68rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(56, 189, 248, 0.1)',
                          color: '#38BDF8',
                        }}
                      >
                        <span>✎ {editableLayersCount} Customer Fields</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => toggleSceneVisibility(scene.id)}
                    title={scene.defaultVisible ? 'Disable Scene' : 'Enable Scene'}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      background: 'rgba(255, 255, 255, 0.04)',
                      color: scene.defaultVisible ? '#10B981' : 'var(--cel-text-dim, #64748B)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.74rem',
                    }}
                  >
                    {scene.defaultVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                    <span>{scene.defaultVisible ? 'Visible' : 'Hidden'}</span>
                  </button>

                  <button
                    onClick={() => duplicateScene(scene)}
                    title="Duplicate Scene"
                    style={{
                      padding: '6px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      background: 'rgba(255, 255, 255, 0.04)',
                      color: '#CBD5E1',
                      cursor: 'pointer',
                    }}
                  >
                    <Copy size={13} />
                  </button>

                  <button
                    onClick={() => {
                      onSelectScene(scene.id);
                      onNavigateTab('scenes');
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(223, 186, 107, 0.3)',
                      background: 'rgba(223, 186, 107, 0.12)',
                      color: '#DFBA6B',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Settings2 size={13} />
                    <span>Configure</span>
                  </button>
                </div>
              </div>

              {/* Connecting Transition Vector Node */}
              {!isLast && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '8px 0',
                  }}
                >
                  <div style={{ width: '2px', height: '14px', background: 'rgba(223, 186, 107, 0.3)' }} />
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      background: 'rgba(13, 20, 41, 0.95)',
                      border: '1px solid rgba(223, 186, 107, 0.3)',
                      fontSize: '0.7rem',
                      color: '#DFBA6B',
                    }}
                  >
                    <Zap size={11} />
                    <span>Transition:</span>
                    <select
                      value={scene.transitionToNext?.type || 'fade'}
                      onChange={(e) => updateSceneTransition(scene.id, e.target.value as SceneTransitionType)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#fff',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      <option value="fade" style={{ background: '#0D1429', color: '#fff' }}>Fade (600ms)</option>
                      <option value="crossfade" style={{ background: '#0D1429', color: '#fff' }}>Crossfade (800ms)</option>
                      <option value="light_travel" style={{ background: '#0D1429', color: '#fff' }}>Light Travel (900ms)</option>
                      <option value="constellation" style={{ background: '#0D1429', color: '#fff' }}>Constellation Light (1000ms)</option>
                      <option value="depth_zoom" style={{ background: '#0D1429', color: '#fff' }}>Depth Zoom (850ms)</option>
                      <option value="morph" style={{ background: '#0D1429', color: '#fff' }}>Morph Shape (1200ms)</option>
                    </select>
                  </div>
                  <div style={{ width: '2px', height: '14px', background: 'rgba(223, 186, 107, 0.3)' }} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
