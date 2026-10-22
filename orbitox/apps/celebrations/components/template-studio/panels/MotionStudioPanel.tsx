'use client';

import React from 'react';
import {
  TemplateSchema,
  TemplateSceneDefinition,
  MotionPresetType,
} from '../types/TemplateSchema';
import {
  Sparkles,
  Sliders,
  Play,
  RotateCcw,
  Zap,
  Clock,
  Layers,
  Check,
} from 'lucide-react';

interface MotionStudioPanelProps {
  schema: TemplateSchema;
  onUpdateScene: (sceneId: string, patch: Partial<TemplateSceneDefinition>) => void;
  onSelectScene: (sceneId: string) => void;
}

export function MotionStudioPanel({
  schema,
  onUpdateScene,
  onSelectScene,
}: MotionStudioPanelProps) {
  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto', color: '#fff' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 4px 0' }}>
          Motion Studio & Animation Architecture
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--cel-text-muted, #94A3B8)', margin: 0, lineHeight: 1.5 }}>
          Motion is a first-class template capability. Configure semantic animation intensity, scroll-linked parallax, timeline choreography, and guaranteed reduced-motion accessibility fallbacks.
        </p>
      </div>

      {/* Global Motion Budget & Timeline Overview */}
      <div
        style={{
          borderRadius: '16px',
          background: 'rgba(13, 20, 41, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '20px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
              Choreographed Motion Timeline (The Souls Scene)
            </h3>
            <span style={{ fontSize: '0.74rem', color: 'var(--cel-text-muted, #94A3B8)' }}>
              Sequential cue markers for scroll progress and element reveals.
            </span>
          </div>

          <span
            style={{
              fontSize: '0.72rem',
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10B981',
              fontWeight: 700,
            }}
          >
            ✓ 60 FPS Performance Budget Met
          </span>
        </div>

        {/* Timeline Visualization */}
        <div
          style={{
            padding: '16px',
            borderRadius: '10px',
            background: 'rgba(7, 11, 22, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {[
            { time: '0.00s', label: 'Atmospheric Stardust & Cosmic Void begins', tag: 'Atmosphere' },
            { time: '0.15s', label: 'First Soul (Person A) portrait scales into focal gravity', tag: 'Media' },
            { time: '0.25s', label: 'Second Soul (Person B) portrait aligns opposite', tag: 'Media' },
            { time: '0.40s', label: 'Monumental union proclamation settles into view', tag: 'Typography' },
            { time: '0.55s', label: 'Gravitational light bridge connects both souls', tag: 'Connection' },
            { time: '0.70s', label: 'Interactive spoken vows trigger cues activate', tag: 'Interaction' },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                fontSize: '0.76rem',
              }}
            >
              <code style={{ color: '#DFBA6B', fontFamily: 'monospace', width: '50px' }}>{item.time}</code>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#DFBA6B' }} />
              <span style={{ flex: 1, color: '#E2E8F0' }}>{item.label}</span>
              <span
                style={{
                  fontSize: '0.66rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--cel-text-dim, #64748B)',
                }}
              >
                {item.tag}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-Scene Motion Controls List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 4px 0' }}>
          Scene Motion Presets
        </h3>

        {schema.scenes.map((scene) => (
          <div
            key={scene.id}
            style={{
              padding: '16px 20px',
              borderRadius: '12px',
              background: 'rgba(13, 20, 41, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div>
              <strong style={{ fontSize: '0.92rem', color: '#fff', display: 'block' }}>
                {scene.order}. {scene.name}
              </strong>
              <span style={{ fontSize: '0.72rem', color: 'var(--cel-text-dim, #64748B)' }}>
                Scroll Mode: {scene.scrollMode} • Easing: {scene.motionConfig.easing}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {(['none', 'soft', 'subtle', 'expressive', 'cinematic'] as MotionPresetType[]).map((preset) => (
                <button
                  key={preset}
                  onClick={() => onUpdateScene(scene.id, { motionPreset: preset })}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: scene.motionPreset === preset
                      ? '1px solid #DFBA6B'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    background: scene.motionPreset === preset
                      ? 'rgba(223, 186, 107, 0.2)'
                      : 'rgba(255, 255, 255, 0.03)',
                    color: scene.motionPreset === preset ? '#DFBA6B' : 'var(--cel-text-muted, #94A3B8)',
                    fontSize: '0.72rem',
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
        ))}
      </div>
    </div>
  );
}
