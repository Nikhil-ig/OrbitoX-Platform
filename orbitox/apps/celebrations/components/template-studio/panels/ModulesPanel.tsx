'use client';

import React from 'react';
import {
  TemplateSchema,
  TemplateModuleDefinition,
  ModuleType,
} from '../types/TemplateSchema';
import {
  Puzzle,
  Check,
  X,
  Lock,
  Unlock,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface ModulesPanelProps {
  schema: TemplateSchema;
  onUpdateModule: (moduleId: string, patch: Partial<TemplateModuleDefinition>) => void;
}

export function ModulesPanel({ schema, onUpdateModule }: ModulesPanelProps) {
  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto', color: '#fff' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 4px 0' }}>
          Optional Modules Catalog
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--cel-text-muted, #94A3B8)', margin: 0, lineHeight: 1.5 }}>
          Templates do not hardcode every possible celebratory feature. Instead, define which pluggable modules this template supports, their allowed positions, and whether customers can toggle them.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {schema.modules.map((mod) => (
          <div
            key={mod.id}
            style={{
              padding: '20px',
              borderRadius: '14px',
              background: mod.isEnabled ? 'rgba(13, 20, 41, 0.6)' : 'rgba(255, 255, 255, 0.02)',
              border: mod.isEnabled ? '1px solid rgba(223, 186, 107, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontFamily: 'monospace',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38BDF8',
                    fontWeight: 700,
                  }}
                >
                  {mod.moduleType.toUpperCase()}
                </span>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={mod.isEnabled}
                    onChange={(e) => onUpdateModule(mod.id, { isEnabled: e.target.checked })}
                    style={{ accentColor: '#DFBA6B' }}
                  />
                  <span style={{ fontSize: '0.74rem', color: mod.isEnabled ? '#DFBA6B' : 'var(--cel-text-dim, #64748B)', fontWeight: 700 }}>
                    {mod.isEnabled ? 'Active' : 'Disabled'}
                  </span>
                </label>
              </div>

              <strong style={{ fontSize: '1rem', color: '#fff', display: 'block', marginBottom: '4px' }}>
                {mod.label}
              </strong>
              <p style={{ fontSize: '0.78rem', color: 'var(--cel-text-muted, #94A3B8)', lineHeight: 1.4, margin: 0 }}>
                {mod.description}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--cel-text-dim, #64748B)' }}>Design Variant:</span>
                <strong style={{ color: '#CBD5E1', textTransform: 'capitalize' }}>{mod.designVariant}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--cel-text-dim, #64748B)' }}>Default Visibility:</span>
                <strong style={{ color: mod.defaultVisibility ? '#10B981' : '#F59E0B' }}>
                  {mod.defaultVisibility ? 'Visible by Default' : 'Hidden by Default'}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--cel-text-dim, #64748B)' }}>Customer Can Toggle:</span>
                <button
                  onClick={() => onUpdateModule(mod.id, { customerEditable: !mod.customerEditable })}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: mod.customerEditable ? '#10B981' : 'var(--cel-text-dim, #64748B)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    padding: 0,
                  }}
                >
                  {mod.customerEditable ? '✓ Allowed' : '✗ Locked by Admin'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
