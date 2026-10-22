'use client';

import React from 'react';
import {
  TemplateSchema,
  CustomizationLevel,
} from '../types/TemplateSchema';
import {
  Sliders,
  Shield,
  Lock,
  Unlock,
  Check,
  X,
  Palette,
  Type,
  FileCode2,
} from 'lucide-react';

interface CustomizationPanelProps {
  schema: TemplateSchema;
  onUpdatePermissions: (fieldPermissions: Record<string, CustomizationLevel>) => void;
}

export function CustomizationPanel({ schema, onUpdatePermissions }: CustomizationPanelProps) {
  const matrix = schema.customizationMatrix;

  const updatePermission = (fieldKey: string, level: CustomizationLevel) => {
    onUpdatePermissions({
      ...matrix.fieldPermissions,
      [fieldKey]: level,
    });
  };

  const capabilities = [
    { name: 'Celebrant Names & Roles', key: 'celebrants[0].name', level: matrix.fieldPermissions['celebrants[0].name'] || 'FLEXIBLE', description: 'Names, honorifics, and party titles' },
    { name: 'Editorial Portrait Photography', key: 'celebrants[0].portrait', level: matrix.fieldPermissions['celebrants[0].portrait'] || 'FLEXIBLE', description: 'Photo uploads with focal crop' },
    { name: 'Personal Spoken Vows & Statements', key: 'celebrants[0].vow', level: matrix.fieldPermissions['celebrants[0].vow'] || 'FLEXIBLE', description: 'Spoken vows whispered across stars' },
    { name: 'Celebration Title & Proclamation', key: 'celebration.title', level: matrix.fieldPermissions['celebration.title'] || 'FLEXIBLE', description: 'Main banner announcement' },
    { name: 'Aesthetic Color Palette', key: 'theme.palette', level: matrix.fieldPermissions['theme.palette'] || 'CURATED', description: 'Restricted to approved metallic palettes' },
    { name: 'Luxury Typography Choices', key: 'theme.fontFamily', level: matrix.fieldPermissions['theme.fontFamily'] || 'CURATED', description: 'Restricted to approved high-fashion fonts' },
    { name: 'Scene Ordering & Structure', key: 'scene_order', level: matrix.fieldPermissions['scene_order'] || 'LOCKED', description: 'Prevents broken visual narratives' },
    { name: 'Motion Intensity Tier', key: 'motion_intensity', level: matrix.fieldPermissions['motion_intensity'] || 'CURATED', description: 'Customer can toggle Subtle vs Expressive' },
    { name: 'Custom CSS Overrides', key: 'custom_css', level: 'LOCKED', description: 'Strictly prohibited to ensure visual perfection' },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto', color: '#fff' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 4px 0' }}>
          Customer Customization Capability Matrix
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--cel-text-muted, #94A3B8)', margin: 0, lineHeight: 1.5 }}>
          Govern exactly what the customer-facing Creator Studio displays. Protect brand integrity by locking structural geometry while allowing curated typography and flexible personal content.
        </p>
      </div>

      {/* Capabilities Table */}
      <div
        style={{
          borderRadius: '16px',
          background: 'rgba(13, 20, 41, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr',
            padding: '12px 20px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: '0.7rem',
            color: 'var(--cel-text-dim, #64748B)',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          <div>Capability / Property</div>
          <div>Admin Authority</div>
          <div>Customer Freedom</div>
        </div>

        {capabilities.map((item, idx) => (
          <div
            key={item.key}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr',
              alignItems: 'center',
              padding: '14px 20px',
              borderBottom: idx === capabilities.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.04)',
              background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.01)',
            }}
          >
            <div>
              <strong style={{ fontSize: '0.88rem', color: '#fff', display: 'block' }}>
                {item.name}
              </strong>
              <span style={{ fontSize: '0.72rem', color: 'var(--cel-text-dim, #64748B)' }}>
                {item.description}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.76rem', color: '#10B981', fontWeight: 700 }}>
                ✓ Full Control
              </span>
            </div>

            <div>
              <select
                value={item.level}
                disabled={item.key === 'custom_css'}
                onChange={(e) => updatePermission(item.key, e.target.value as CustomizationLevel)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  background: item.level === 'LOCKED' ? 'rgba(239, 68, 68, 0.15)' : '#070B16',
                  border: item.level === 'LOCKED' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(223, 186, 107, 0.3)',
                  color: item.level === 'LOCKED' ? '#EF4444' : '#DFBA6B',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: item.key === 'custom_css' ? 'not-allowed' : 'pointer',
                }}
              >
                <option value="LOCKED">LOCKED (Static)</option>
                <option value="CURATED">CURATED (Approved Choices)</option>
                <option value="FLEXIBLE">FLEXIBLE (Unrestricted)</option>
                <option value="ADVANCED">ADVANCED (B2B Only)</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
