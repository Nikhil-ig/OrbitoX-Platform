'use client';

import React from 'react';
import {
  TemplateSchema,
  TemplateHealthReport,
} from '../types/TemplateSchema';
import {
  Rocket,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface PublishPanelProps {
  schema: TemplateSchema;
  onPublish: () => void;
  onNavigateTab: (tab: any) => void;
}

export function PublishPanel({ schema, onPublish, onNavigateTab }: PublishPanelProps) {
  const health = schema.healthReport;

  const checklistItems = [
    { label: 'Template Identity & Metadata', desc: 'Name, slug, occasions, and tier properly configured', passed: Boolean(schema.name && schema.slug), tab: 'overview' },
    { label: 'Content Schema Complete', desc: 'All required customer fields have definitions and validation limits', passed: schema.contentSchema.length > 0, tab: 'contentSchema' },
    { label: 'Scene Hierarchy & Semantic Layers', desc: 'Every scene defines layers (Atmosphere, Foreground, Media, Typo)', passed: schema.scenes.every(s => s.layers && s.layers.length > 0), tab: 'scenes' },
    { label: 'Desktop Layout (Canonical)', desc: 'Canonical baseline padding and composition configured', passed: schema.scenes.every(s => Boolean(s.layoutRules?.desktop)), tab: 'responsive' },
    { label: 'Tablet Layout & Breakpoints', desc: 'Tablet layout rules tested for iPad viewports', passed: schema.scenes.every(s => Boolean(s.layoutRules?.tablet)), tab: 'responsive' },
    { label: 'Mobile-First Layout & Touch Physics', desc: 'Mobile overrides configured for iPhone / Android screens', passed: schema.scenes.every(s => Boolean(s.layoutRules?.mobile)), tab: 'responsive' },
    { label: 'Motion Presets & Timeline', desc: 'All scenes define semantic motion curves and durations', passed: schema.scenes.every(s => Boolean(s.motionPreset)), tab: 'motion' },
    { label: 'Reduced-Motion Accessibility Fallback', desc: 'Safe static or subtle crossfade fallback defined for all motion', passed: schema.scenes.every(s => Boolean(s.motionConfig?.reducedMotionFallback)), tab: 'motion' },
    { label: 'Screen Reader Semantic Aria Roles', desc: 'Assistive technology descriptions and roles attached', passed: schema.scenes.every(s => Boolean(s.accessibility?.screenReaderTitle)), tab: 'accessibility' },
    { label: 'Media Slot Fallbacks & Aspect Ratios', desc: 'Image slots have explicit crop behavior and aspect limits', passed: schema.mediaSlots.every(ms => Boolean(ms.aspectRatio)), tab: 'responsive' },
    { label: 'Performance Budget Verified', desc: 'Particle counts and animated layers within 60 FPS limits', passed: schema.performanceBudget.maxParticles <= 150, tab: 'motion' },
    { label: 'Customer Capability Matrix Enforced', desc: 'Dangerous CSS and raw code locked away from customer studio', passed: schema.customizationMatrix.allowCustomCss === false, tab: 'customization' },
  ];

  const allPassed = checklistItems.every((item) => item.passed);

  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 4px 0' }}>
            Pre-Flight Audit & Publish Engine
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--cel-text-muted, #94A3B8)', margin: 0, lineHeight: 1.5 }}>
            Automated 12-point release gate. Prevents broken templates or unvalidated customer inputs from reaching production.
          </p>
        </div>

        <button
          onClick={onPublish}
          disabled={!health.isPublishable}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 24px',
            borderRadius: '10px',
            background: health.isPublishable
              ? 'linear-gradient(135deg, #DFBA6B, #C29B47)'
              : 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: health.isPublishable ? '#050B14' : 'rgba(255, 255, 255, 0.3)',
            fontSize: '0.9rem',
            fontWeight: 800,
            cursor: health.isPublishable ? 'pointer' : 'not-allowed',
            boxShadow: health.isPublishable ? '0 4px 20px rgba(223, 186, 107, 0.4)' : 'none',
          }}
        >
          <Rocket size={16} />
          <span>Publish v{schema.activeVersion} to Production</span>
        </button>
      </div>

      {/* Blocking Errors Banner if any */}
      {health.errors.length > 0 && (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <AlertTriangle size={20} color="#EF4444" />
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: '0.9rem', color: '#EF4444', display: 'block' }}>
              Publish Gate Blocked ({health.errors.length} Errors)
            </strong>
            <span style={{ fontSize: '0.76rem', color: '#CBD5E1' }}>
              Resolve all blocking errors below before releasing to the global template catalog.
            </span>
          </div>
        </div>
      )}

      {/* Pre-Flight Checklist */}
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
            padding: '16px 20px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <strong style={{ fontSize: '0.95rem', color: '#fff' }}>
            Production Release Checklist
          </strong>
          <span style={{ fontSize: '0.74rem', color: '#DFBA6B', fontWeight: 700 }}>
            {checklistItems.filter((i) => i.passed).length} of {checklistItems.length} Passed
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {checklistItems.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: idx === checklistItems.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.04)',
                background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.01)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {item.passed ? (
                  <CheckCircle2 size={16} color="#10B981" />
                ) : (
                  <AlertTriangle size={16} color="#EF4444" />
                )}
                <div>
                  <strong style={{ fontSize: '0.86rem', color: item.passed ? '#fff' : '#EF4444', display: 'block' }}>
                    {item.label}
                  </strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--cel-text-dim, #64748B)' }}>
                    {item.desc}
                  </span>
                </div>
              </div>

              {!item.passed && (
                <button
                  onClick={() => onNavigateTab(item.tab)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#EF4444',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <span>Resolve</span>
                  <ArrowRight size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
