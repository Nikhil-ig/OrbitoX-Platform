'use client';

import React from 'react';
import {
  TemplateSchema,
  InteractionTriggerType,
  InteractionActionType,
} from '../types/TemplateSchema';
import {
  Zap,
  Plus,
  Trash2,
  ArrowRight,
  Sparkles,
  MousePointer,
  HelpCircle,
} from 'lucide-react';

interface InteractionsPanelProps {
  schema: TemplateSchema;
}

export function InteractionsPanel({ schema }: InteractionsPanelProps) {
  // Aggregate interactions across all scenes
  const allInteractions = schema.scenes.flatMap((scene) =>
    scene.interactions.map((int) => ({ ...int, sceneName: scene.name, sceneId: scene.id }))
  );

  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto', color: '#fff' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 4px 0' }}>
          Interaction Builder & Micro-Interactions
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--cel-text-muted, #94A3B8)', margin: 0, lineHeight: 1.5 }}>
          Semantic declarative interaction architecture (WHEN → CONDITION → ACTION). Defines how guests touch, tap, and explore the celebration universe without writing raw code.
        </p>
      </div>

      {/* Interaction Presets Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        {[
          { name: 'Tap Reveal & Expand', desc: 'Opens bio modal or spoken vows on photo touch' },
          { name: 'Hover Depth Acceleration', desc: 'Gears accelerate on astrolabe pointer hover' },
          { name: 'Scroll Triggered Portal', desc: 'Threshold triggers gateway warp to next chapter' },
          { name: 'Starlight Node Blessing', desc: 'Guest click binds wish to glowing star' },
        ].map((item, idx) => (
          <div
            key={idx}
            style={{
              padding: '12px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <strong style={{ fontSize: '0.82rem', color: '#DFBA6B', display: 'block', marginBottom: '2px' }}>
              {item.name}
            </strong>
            <span style={{ fontSize: '0.72rem', color: 'var(--cel-text-dim, #64748B)' }}>
              {item.desc}
            </span>
          </div>
        ))}
      </div>

      {/* Active Rules List */}
      <div
        style={{
          borderRadius: '16px',
          background: 'rgba(13, 20, 41, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
            Configured Interaction Rules ({allInteractions.length})
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {allInteractions.map((int) => (
            <div
              key={int.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                gap: '16px',
              }}
            >
              <div>
                <strong style={{ fontSize: '0.9rem', color: '#fff', display: 'block' }}>
                  {int.name}
                </strong>
                <span style={{ fontSize: '0.72rem', color: 'var(--cel-text-dim, #64748B)' }}>
                  Scene: {int.sceneName}
                </span>
              </div>

              {/* WHEN -> ACTION pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38BDF8',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                  }}
                >
                  WHEN: {int.trigger.toUpperCase()}
                </span>

                <ArrowRight size={13} color="var(--cel-text-dim, #64748B)" />

                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'rgba(223, 186, 107, 0.15)',
                    color: '#DFBA6B',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                  }}
                >
                  THEN: {int.action.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
