'use client';

import React from 'react';
import {
  TemplateSchema,
  DeviceBreakpoint,
  TemplateSceneDefinition,
} from '../types/TemplateSchema';
import {
  Monitor,
  Tablet,
  Smartphone,
  Check,
  RotateCcw,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface ResponsivePanelProps {
  schema: TemplateSchema;
  viewport: DeviceBreakpoint;
  onViewportChange: (viewport: DeviceBreakpoint) => void;
  onUpdateScene: (sceneId: string, patch: Partial<TemplateSceneDefinition>) => void;
  onSelectScene: (sceneId: string) => void;
}

export function ResponsivePanel({
  schema,
  viewport,
  onViewportChange,
  onUpdateScene,
  onSelectScene,
}: ResponsivePanelProps) {
  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto', color: '#fff' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 4px 0' }}>
          Responsive Design & Breakpoint Overrides
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--cel-text-muted, #94A3B8)', margin: 0, lineHeight: 1.5 }}>
          Manage device-specific layouts without code duplication. Desktop acts as the canonical base; Tablet and Mobile inherit properties unless an explicit override is declared.
        </p>
      </div>

      {/* Breakpoint Matrix Switcher Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          {
            id: 'desktop' as DeviceBreakpoint,
            label: 'Desktop Base',
            sub: 'Canonical Master (1280px+)',
            icon: Monitor,
            badge: 'Source of Truth',
          },
          {
            id: 'tablet' as DeviceBreakpoint,
            label: 'Tablet Breakpoint',
            sub: 'iPad & Foldables (768px)',
            icon: Tablet,
            badge: 'Inherited / Overrides',
          },
          {
            id: 'mobile' as DeviceBreakpoint,
            label: 'Mobile Breakpoint',
            sub: 'Smartphones (390-420px)',
            icon: Smartphone,
            badge: 'Mobile-First Overrides',
          },
        ].map((item) => {
          const isSelected = viewport === item.id;
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              onClick={() => onViewportChange(item.id)}
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: isSelected ? 'rgba(223, 186, 107, 0.12)' : 'rgba(13, 20, 41, 0.5)',
                border: isSelected ? '1px solid #DFBA6B' : '1px solid rgba(255, 255, 255, 0.08)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Icon size={18} color={isSelected ? '#DFBA6B' : 'var(--cel-text-dim, #64748B)'} />
                <span
                  style={{
                    fontSize: '0.66rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: isSelected ? 'rgba(223, 186, 107, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                    color: isSelected ? '#DFBA6B' : 'var(--cel-text-dim, #64748B)',
                    fontWeight: 700,
                  }}
                >
                  {item.badge}
                </span>
              </div>

              <div>
                <strong style={{ fontSize: '0.92rem', color: isSelected ? '#fff' : '#CBD5E1', display: 'block' }}>
                  {item.label}
                </strong>
                <span style={{ fontSize: '0.72rem', color: 'var(--cel-text-dim, #64748B)' }}>
                  {item.sub}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Breakpoint Scene Override Table */}
      <div
        style={{
          borderRadius: '16px',
          background: 'rgba(13, 20, 41, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '20px',
        }}
      >
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px 0' }}>
          Scene Breakpoint Inheritance Matrix
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {schema.scenes.map((scene) => {
            const rules = scene.layoutRules;
            const mobileRule = rules.mobile;
            const tabletRule = rules.tablet;

            return (
              <div
                key={scene.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  gap: '16px',
                }}
              >
                <div style={{ flex: 1.5 }}>
                  <strong style={{ fontSize: '0.88rem', color: '#fff', display: 'block' }}>
                    {scene.order}. {scene.name}
                  </strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--cel-text-dim, #64748B)' }}>
                    Type: {scene.sceneType}
                  </span>
                </div>

                {/* Desktop Setting */}
                <div style={{ flex: 1, fontSize: '0.74rem' }}>
                  <span style={{ color: 'var(--cel-text-dim, #64748B)', display: 'block' }}>Desktop:</span>
                  <strong style={{ color: '#fff' }}>{rules.desktop.composition} ({rules.desktop.paddingTopRem}rem)</strong>
                </div>

                {/* Tablet Status */}
                <div style={{ flex: 1, fontSize: '0.74rem' }}>
                  <span style={{ color: 'var(--cel-text-dim, #64748B)', display: 'block' }}>Tablet:</span>
                  <span
                    style={{
                      color: tabletRule.isOverridden ? '#38BDF8' : 'var(--cel-text-muted, #94A3B8)',
                      fontWeight: 600,
                    }}
                  >
                    {tabletRule.isOverridden ? `Override (${tabletRule.composition})` : 'Inherited'}
                  </span>
                </div>

                {/* Mobile Status */}
                <div style={{ flex: 1, fontSize: '0.74rem' }}>
                  <span style={{ color: 'var(--cel-text-dim, #64748B)', display: 'block' }}>Mobile:</span>
                  <span
                    style={{
                      color: mobileRule.isOverridden ? '#DFBA6B' : 'var(--cel-text-muted, #94A3B8)',
                      fontWeight: 600,
                    }}
                  >
                    {mobileRule.isOverridden ? `Override (${mobileRule.composition})` : 'Inherited'}
                  </span>
                </div>

                {/* Configure Button */}
                <button
                  onClick={() => onSelectScene(scene.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(223, 186, 107, 0.3)',
                    background: 'rgba(223, 186, 107, 0.1)',
                    color: '#DFBA6B',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Tune
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
