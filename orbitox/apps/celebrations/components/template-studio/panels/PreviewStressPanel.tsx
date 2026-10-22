'use client';

import React from 'react';
import { TemplateSchema } from '../types/TemplateSchema';
import { Flame, Check, RefreshCw, Smartphone, Monitor } from 'lucide-react';

interface PreviewStressPanelProps {
  schema: TemplateSchema;
  isStressTest: boolean;
  onToggleStressTest: () => void;
  onPreviewModeChange: (mode: 'admin' | 'customer' | 'guest') => void;
}

export function PreviewStressPanel({
  schema,
  isStressTest,
  onToggleStressTest,
  onPreviewModeChange,
}: PreviewStressPanelProps) {
  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto', color: '#fff' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 4px 0' }}>
          Real Data Simulation & Stress Testing
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--cel-text-muted, #94A3B8)', margin: 0, lineHeight: 1.5 }}>
          Test the visual robustness of the template against real-world customer edge cases before publishing.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Profile 1: Standard Couple */}
        <div
          onClick={() => isStressTest && onToggleStressTest()}
          style={{
            padding: '20px',
            borderRadius: '14px',
            background: !isStressTest ? 'rgba(223, 186, 107, 0.12)' : 'rgba(13, 20, 41, 0.5)',
            border: !isStressTest ? '1px solid #DFBA6B' : '1px solid rgba(255, 255, 255, 0.08)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <strong style={{ fontSize: '1rem', color: !isStressTest ? '#DFBA6B' : '#fff' }}>
                Standard Couple Profile
              </strong>
              {!isStressTest && <Check size={16} color="#DFBA6B" />}
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--cel-text-muted, #94A3B8)', margin: 0, lineHeight: 1.4 }}>
              Aarav Sharma & Meera Sen. Realistic average length titles, vows, 3 ceremonial events, and editorial 1:1 portrait photos.
            </p>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 700 }}>
            Ideal Baseline Composition
          </span>
        </div>

        {/* Profile 2: Stress Test Data */}
        <div
          onClick={() => !isStressTest && onToggleStressTest()}
          style={{
            padding: '20px',
            borderRadius: '14px',
            background: isStressTest ? 'rgba(244, 63, 94, 0.15)' : 'rgba(13, 20, 41, 0.5)',
            border: isStressTest ? '1px solid #F43F5E' : '1px solid rgba(255, 255, 255, 0.08)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Flame size={16} color="#F43F5E" />
                <strong style={{ fontSize: '1rem', color: isStressTest ? '#FDA4AF' : '#fff' }}>
                  Stress Test Edge Cases
                </strong>
              </div>
              {isStressTest && <Check size={16} color="#F43F5E" />}
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--cel-text-muted, #94A3B8)', margin: 0, lineHeight: 1.4 }}>
              Long royal dynastic titles (80+ chars), extensive spoken vows (300+ chars), 6 multi-day events, long palace address, and boundary testing.
            </p>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#F43F5E', fontWeight: 700 }}>
            {isStressTest ? 'Active in Live Canvas' : 'Click to Activate'}
          </span>
        </div>
      </div>
    </div>
  );
}
