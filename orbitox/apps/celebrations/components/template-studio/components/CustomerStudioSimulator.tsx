'use client';

import React from 'react';
import {
  TemplateSchema,
  ContentFieldDefinition,
} from '../types/TemplateSchema';
import { CelebrationState } from '@/components/studio/StudioData';
import {
  Sparkles,
  Lock,
  Heart,
  Palette,
  Type,
  Image as ImageIcon,
  Check,
  Calendar,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';

interface CustomerStudioSimulatorProps {
  schema: TemplateSchema;
  state: CelebrationState;
  onChange: (patch: Partial<CelebrationState>) => void;
}

export function CustomerStudioSimulator({
  schema,
  state,
  onChange,
}: CustomerStudioSimulatorProps) {
  const customerFields = schema.contentSchema.filter((f) => f.customerEditable);
  const matrix = schema.customizationMatrix;

  return (
    <aside
      style={{
        width: '380px',
        minWidth: '380px',
        background: '#090D1A',
        borderLeft: '1px solid rgba(56, 189, 248, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 60px)',
        overflowY: 'auto',
      }}
    >
      {/* Simulation Banner */}
      <div
        style={{
          padding: '16px',
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(13, 20, 41, 0.4) 100%)',
          borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <UserCheck size={16} color="#38BDF8" />
          <span style={{ fontSize: '0.72rem', color: '#38BDF8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Customer Creator Studio Simulation
          </span>
        </div>
        <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#fff' }}>
          What Your Customer Sees & Edits
        </h4>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: 'var(--cel-text-secondary, #CBD5E1)', lineHeight: 1.4 }}>
          Generated strictly from this template’s schema. Notice developer options and raw CSS are absent.
        </p>
      </div>

      {/* Simulated Customer Controls */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', color: '#fff' }}>
        {/* Curated Color Moods */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, marginBottom: '8px' }}>
            <Palette size={14} color="#DFBA6B" />
            <span>Celebration Color Palette</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {matrix.allowedColorPalettes.map((palette) => (
              <button
                key={palette.id}
                onClick={() => {
                  onChange({
                    primaryColorOverride: palette.accentPrimary,
                    secondaryColorOverride: palette.accentSecondary,
                  });
                }}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border:
                    state.primaryColorOverride === palette.accentPrimary
                      ? `1.5px solid ${palette.accentPrimary}`
                      : '1px solid rgba(223, 186, 107, 0.3)',
                  background:
                    state.primaryColorOverride === palette.accentPrimary
                      ? `${palette.accentPrimary}1A`
                      : 'rgba(255, 255, 255, 0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: palette.accentPrimary,
                    boxShadow: `0 0 8px ${palette.accentPrimary}60`,
                  }}
                />
                <span style={{ fontSize: '0.74rem', color: '#fff', fontWeight: 600 }}>
                  {palette.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Curated Font Selection */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, marginBottom: '8px' }}>
            <Type size={14} color="#38BDF8" />
            <span>Monogram & Headline Font</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {matrix.allowedFontFamilies.map((font) => (
              <div
                key={font.name}
                onClick={() => {
                  onChange({
                    fontDisplayOverride: font.name,
                  });
                }}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border:
                    state.fontDisplayOverride === font.name
                      ? '1.5px solid #DFBA6B'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                  background:
                    state.fontDisplayOverride === font.name
                      ? 'rgba(223, 186, 107, 0.12)'
                      : 'rgba(255, 255, 255, 0.03)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontFamily: font.name, fontSize: '0.88rem', color: '#DFBA6B', display: 'block' }}>
                  {font.name}
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--cel-text-dim, #64748B)' }}>
                  {font.category}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Fields rendered from Content Schema */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--cel-text-dim, #64748B)', fontWeight: 800, textTransform: 'uppercase' }}>
            Personal Content & Details
          </span>

          {customerFields.map((field) => {
            if (field.type === 'text' || field.type === 'longtext' || field.type === 'date') {
              return (
                <div key={field.id}>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--cel-text-secondary, #CBD5E1)', marginBottom: '4px', fontWeight: 600 }}>
                    {field.label}
                  </label>
                  {field.type === 'longtext' ? (
                    <textarea
                      value={(state as any)[field.key] || ''}
                      onChange={(e) => onChange({ [field.key]: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: '#0B1120',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#fff',
                        fontSize: '0.82rem',
                        minHeight: '80px',
                        resize: 'vertical'
                      }}
                    />
                  ) : (
                    <input
                      type={field.type === 'date' ? 'date' : 'text'}
                      value={(state as any)[field.key] || ''}
                      onChange={(e) => onChange({ [field.key]: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: '#0B1120',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#fff',
                        fontSize: '0.82rem',
                      }}
                    />
                  )}
                </div>
              );
            } else if (field.type === 'image' || field.type === 'url') {
              return (
                <div key={field.id}>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--cel-text-secondary, #CBD5E1)', marginBottom: '4px', fontWeight: 600 }}>
                    {field.label}
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <img
                      src={(state as any)[field.key] || 'https://via.placeholder.com/150'}
                      alt={field.label}
                      style={{ width: '34px', height: '34px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #DFBA6B' }}
                    />
                    <input
                      type="text"
                      placeholder="Image URL"
                      value={(state as any)[field.key] || ''}
                      onChange={(e) => onChange({ [field.key]: e.target.value })}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: '6px',
                        background: '#0B1120',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#fff',
                        fontSize: '0.76rem',
                      }}
                    />
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>

        {/* Locked Property Demonstration */}
        <div
          style={{
            padding: '12px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Lock size={15} color="var(--cel-text-dim, #64748B)" />
          <div style={{ fontSize: '0.72rem', color: 'var(--cel-text-dim, #64748B)', lineHeight: 1.4 }}>
            <strong>Scene Architecture Locked:</strong> Scene ordering is preserved by template designers to safeguard astronomical pacing.
          </div>
        </div>
      </div>
    </aside>
  );
}
