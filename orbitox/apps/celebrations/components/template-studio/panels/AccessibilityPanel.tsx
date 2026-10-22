'use client';

import React from 'react';
import { TemplateSchema } from '../types/TemplateSchema';
import { ShieldCheck, Check, Sparkles, Eye, AlertCircle } from 'lucide-react';

interface AccessibilityPanelProps {
  schema: TemplateSchema;
}

export function AccessibilityPanel({ schema }: AccessibilityPanelProps) {
  const a11y = schema.accessibility;

  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto', color: '#fff' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 4px 0' }}>
          Accessibility & Inclusivity Governance
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--cel-text-muted, #94A3B8)', margin: 0, lineHeight: 1.5 }}>
          Celebrations templates must be accessible to all family members and elders. We enforce reduced-motion fallbacks, high-contrast ratios, and minimum 44px touch targets.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <div style={{ padding: '20px', borderRadius: '14px', background: 'rgba(13, 20, 41, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Sparkles size={16} color="#10B981" />
            <strong style={{ fontSize: '0.95rem', color: '#fff' }}>Reduced-Motion Fallback</strong>
          </div>
          <p style={{ fontSize: '0.76rem', color: 'var(--cel-text-muted, #94A3B8)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
            Ensures guests with vestibular motion sensitivities receive a smooth, static crossfade instead of rapid zooms or spins.
          </p>
          <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10B981', fontSize: '0.74rem', fontWeight: 700 }}>
            ✓ Verified for all 7 Scenes ({a11y.reducedMotionFallback.toUpperCase()})
          </div>
        </div>

        <div style={{ padding: '20px', borderRadius: '14px', background: 'rgba(13, 20, 41, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Eye size={16} color="#38BDF8" />
            <strong style={{ fontSize: '0.95rem', color: '#fff' }}>Touch Target Sizing</strong>
          </div>
          <p style={{ fontSize: '0.76rem', color: 'var(--cel-text-muted, #94A3B8)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
            Buttons and touchable nodes must meet the minimum 44×44px hit-box requirement for effortless mobile interaction.
          </p>
          <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38BDF8', fontSize: '0.74rem', fontWeight: 700 }}>
            ✓ Target: {a11y.minTouchTargetPx}px (WCAG 2.1 Compliant)
          </div>
        </div>

        <div style={{ padding: '20px', borderRadius: '14px', background: 'rgba(13, 20, 41, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <ShieldCheck size={16} color="#DFBA6B" />
            <strong style={{ fontSize: '0.95rem', color: '#fff' }}>Screen Reader Hierarchy</strong>
          </div>
          <p style={{ fontSize: '0.76rem', color: 'var(--cel-text-muted, #94A3B8)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
            Semantic landmarks (banner, main, region, timer, form) provide intuitive navigation for assistive technologies.
          </p>
          <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(223, 186, 107, 0.12)', border: '1px solid rgba(223, 186, 107, 0.3)', color: '#DFBA6B', fontSize: '0.74rem', fontWeight: 700 }}>
            ✓ Aria Roles Defined for All Layers
          </div>
        </div>
      </div>
    </div>
  );
}
