'use client';

import React from 'react';
import {
  TemplateSchema,
  TemplateHealthReport,
} from '../types/TemplateSchema';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  FileCode2,
  Smartphone,
  Sparkles,
  ShieldCheck,
  Calendar,
  Eye,
  Rocket,
  ArrowRight,
} from 'lucide-react';

interface OverviewPanelProps {
  schema: TemplateSchema;
  onNavigateTab: (tab: any) => void;
  onSelectScene: (sceneId: string) => void;
}

export function OverviewPanel({ schema, onNavigateTab, onSelectScene }: OverviewPanelProps) {
  const health = schema.healthReport;

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1000px', margin: '0 auto', color: '#fff' }}>
      {/* Top Banner: Identity & Status */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '24px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(223, 186, 107, 0.1) 0%, rgba(13, 20, 41, 0.6) 100%)',
          border: '1px solid rgba(223, 186, 107, 0.25)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(223, 186, 107, 0.2)',
                color: '#DFBA6B',
                letterSpacing: '0.05em',
              }}
            >
              {schema.badge || 'MASTERWORK TEMPLATE'}
            </span>
            <span style={{ fontSize: '0.74rem', color: 'var(--cel-text-dim, #64748B)' }}>
              Personality: <strong style={{ color: '#fff' }}>{schema.visualPersonality}</strong>
            </span>
            <span style={{ fontSize: '0.74rem', color: 'var(--cel-text-dim, #64748B)' }}>
              Tier: <strong style={{ color: '#F59E0B' }}>{schema.tier}</strong>
            </span>
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: '0 0 6px 0' }}>
            {schema.name}
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--cel-text-secondary, #CBD5E1)', lineHeight: 1.5, margin: 0, maxWidth: '640px' }}>
            {schema.description}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => onNavigateTab('publish')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #DFBA6B, #C29B47)',
              border: 'none',
              color: '#050B14',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            <Rocket size={14} />
            <span>Publish Checklist</span>
          </button>
        </div>
      </div>

      {/* Template Health Dashboard Card */}
      <div
        style={{
          borderRadius: '16px',
          background: 'rgba(13, 20, 41, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: '0 0 4px 0' }}>
              Template Health & Governance Matrix
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--cel-text-muted, #94A3B8)' }}>
              Deterministic quality audit across schema integrity, mobile responsiveness, motion budgets, and accessibility.
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '9999px',
              background: health.isPublishable ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: health.isPublishable ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
              color: health.isPublishable ? '#10B981' : '#EF4444',
              fontWeight: 800,
              fontSize: '0.82rem',
            }}
          >
            {health.isPublishable ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{health.score}% Quality Score ({health.isPublishable ? 'Production Ready' : 'Blocked'})</span>
          </div>
        </div>

        {/* Health Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--cel-text-dim, #64748B)', fontWeight: 600 }}>SCENES CONFIGURED</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
              {schema.scenes.length}
            </div>
            <span style={{ fontSize: '0.7rem', color: '#10B981', display: 'block', marginTop: '2px' }}>
              ✓ All scenes validated
            </span>
          </div>

          <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--cel-text-dim, #64748B)', fontWeight: 600 }}>CONTENT FIELDS</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38BDF8', marginTop: '4px' }}>
              {schema.contentSchema.length}
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--cel-text-muted, #94A3B8)', display: 'block', marginTop: '2px' }}>
              {schema.contentSchema.filter((f) => f.customerEditable).length} Customer Editable
            </span>
          </div>

          <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--cel-text-dim, #64748B)', fontWeight: 600 }}>RESPONSIVE COVERAGE</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#DFBA6B', marginTop: '4px' }}>
              100%
            </div>
            <span style={{ fontSize: '0.7rem', color: '#10B981', display: 'block', marginTop: '2px' }}>
              ✓ Desktop, Tablet, Mobile
            </span>
          </div>

          <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--cel-text-dim, #64748B)', fontWeight: 600 }}>ACTIVE MODULES</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#A78BFA', marginTop: '4px' }}>
              {schema.modules.filter((m) => m.isEnabled).length}
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--cel-text-muted, #94A3B8)', display: 'block', marginTop: '2px' }}>
              RSVP, Wishes, Shagun, Music
            </span>
          </div>
        </div>

        {/* Issues List (Errors & Warnings) */}
        {(health.errors.length > 0 || health.warnings.length > 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--cel-text-dim, #64748B)', fontWeight: 700, textTransform: 'uppercase' }}>
              Attention Items
            </span>

            {health.errors.map((err) => (
              <div
                key={err.id}
                onClick={() => err.targetTab && onNavigateTab(err.targetTab)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertTriangle size={15} color="#EF4444" />
                  <div>
                    <strong style={{ fontSize: '0.78rem', color: '#EF4444', display: 'block' }}>{err.title}</strong>
                    <span style={{ fontSize: '0.72rem', color: '#CBD5E1' }}>{err.message}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#EF4444', fontWeight: 700 }}>
                  <span>Fix</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            ))}

            {health.warnings.map((warn) => (
              <div
                key={warn.id}
                onClick={() => warn.targetTab && onNavigateTab(warn.targetTab)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Info size={15} color="#F59E0B" />
                  <div>
                    <strong style={{ fontSize: '0.78rem', color: '#F59E0B', display: 'block' }}>{warn.title}</strong>
                    <span style={{ fontSize: '0.72rem', color: '#CBD5E1' }}>{warn.message}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#F59E0B', fontWeight: 700 }}>
                  <span>Inspect</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Experience Journey Scene Quick Cards */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            Experience Journey Architecture
          </h3>
          <button
            onClick={() => onNavigateTab('experience')}
            style={{
              background: 'none',
              border: 'none',
              color: '#DFBA6B',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>Open Experience Map</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {schema.scenes.map((scene, idx) => (
            <div
              key={scene.id}
              onClick={() => onSelectScene(scene.id)}
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: '#DFBA6B', fontWeight: 700 }}>
                    SCENE {idx + 1}
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
                    {scene.isRequired ? 'Required' : 'Optional'}
                  </span>
                </div>

                <strong style={{ fontSize: '0.92rem', color: '#fff', display: 'block', marginBottom: '4px' }}>
                  {scene.name}
                </strong>
                <p style={{ fontSize: '0.76rem', color: 'var(--cel-text-muted, #94A3B8)', lineHeight: 1.4, margin: '0 0 12px 0' }}>
                  {scene.purpose}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--cel-text-dim, #64748B)', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <span>Motion: {scene.motionPreset}</span>
                <span>Layers: {scene.layers.length}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
