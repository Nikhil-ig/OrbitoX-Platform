'use client';

import React, { useState } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  X,
  PlusCircle,
  FilePlus,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { StudioTemplateMeta } from './types';
import { TemplateSceneDefinition } from '../template-studio/types/TemplateSchema';

interface LiveTemplatePreviewProps {
  template: StudioTemplateMeta;
  onClose: () => void;
  onAddSectionToActivePage: (sectionType: string, template: StudioTemplateMeta) => void;
  onAddAsNewPage: (template: StudioTemplateMeta) => void;
  onUseAsProject: (template: StudioTemplateMeta) => void;
  onSafeReplaceSite: (template: StudioTemplateMeta) => void;
}

export function LiveTemplatePreview({
  template,
  onClose,
  onAddSectionToActivePage,
  onAddAsNewPage,
  onUseAsProject,
  onSafeReplaceSite,
}: LiveTemplatePreviewProps) {
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [selectedSectionType, setSelectedSectionType] = useState('hero');
  const [isConfirmingReplace, setIsConfirmingReplace] = useState(false);

  const viewportWidth =
    viewportMode === 'desktop' ? '100%' : viewportMode === 'tablet' ? '768px' : '375px';

  return (
    <div
      id="sz-live-template-preview-modal"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: '#0B0D14',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* ── TOP CONTROL BAR ── */}
      <div
        style={{
          height: '56px',
          background: '#13151D',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          zIndex: 10,
        }}
      >
        {/* Left: Template info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#F3F4F6' }}>
            {template.name}
          </span>
          <span
            style={{
              fontSize: '0.68rem',
              color: '#3B82F6',
              background: 'rgba(59, 130, 246, 0.12)',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            {template.category}
          </span>
          <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
            {template.pagesCount} Pages • {template.componentsCount} Components
          </span>
        </div>

        {/* Center: Device Viewport Switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: '#1C1F2B',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {[
            { mode: 'desktop' as const, label: 'Desktop (1440px)', icon: <Monitor size={14} /> },
            { mode: 'tablet' as const, label: 'Tablet (768px)', icon: <Tablet size={14} /> },
            { mode: 'mobile' as const, label: 'Mobile (375px)', icon: <Smartphone size={14} /> },
          ].map((d) => (
            <button
              key={d.mode}
              onClick={() => setViewportMode(d.mode)}
              title={d.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                borderRadius: '6px',
                border: 'none',
                background: viewportMode === d.mode ? '#3B82F6' : 'transparent',
                color: viewportMode === d.mode ? '#FFFFFF' : '#9CA3AF',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
            >
              {d.icon}
              <span>{d.mode === 'desktop' ? 'Desktop' : d.mode === 'tablet' ? 'Tablet' : 'Mobile'}</span>
            </button>
          ))}
        </div>

        {/* Right: Close button */}
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#9CA3AF',
            cursor: 'pointer',
            padding: '6px',
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* ── CENTER INTERACTIVE SANDBOX VIEWPORT ── */}
      <div
        style={{
          flex: 1,
          background: '#08090D',
          overflowY: 'auto',
          display: 'flex',
          justifyContent: 'center',
          padding: viewportMode === 'desktop' ? '0' : '24px 0',
        }}
      >
        <div
          id="sz-template-preview-viewport"
          style={{
            width: viewportWidth,
            minHeight: '100%',
            background: '#0B0F19',
            boxShadow: viewportMode === 'desktop' ? 'none' : '0 12px 40px rgba(0,0,0,0.8)',
            border: viewportMode === 'desktop' ? 'none' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: viewportMode === 'desktop' ? '0' : '16px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.25s ease',
          }}
        >
          {/* Mock Interactive Web Content rendered from template */}
          <section
            style={{
              padding: '60px 32px',
              background: template.previewGradient || 'linear-gradient(135deg, #090D1A 0%, #172554 100%)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '9999px',
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#60A5FA',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              <Sparkles size={12} />
              <span>NextGen Celebration Experience</span>
            </div>

            <h1
              style={{
                fontSize: viewportMode === 'mobile' ? '1.8rem' : '2.8rem',
                fontWeight: 800,
                color: '#FFFFFF',
                maxWidth: '700px',
                margin: 0,
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
              }}
            >
              {template.name}
            </h1>

            <p style={{ fontSize: '1rem', color: '#94A3B8', maxWidth: '540px', margin: 0, lineHeight: 1.6 }}>
              {template.tagline || template.description}
            </p>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  background: template.accentColor || '#3B82F6',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                }}
              >
                Explore Interactive Demo
              </button>
              <button
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#F3F4F6',
                  fontWeight: 600,
                  fontSize: '0.86rem',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  cursor: 'pointer',
                }}
              >
                View Documentation
              </button>
            </div>
          </section>

          {/* Features Section */}
          <section style={{ padding: '60px 32px', background: '#0F172A', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                Architectural Capabilities
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '6px' }}>
                Complete graph-native multi-tenant authoring platform
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: viewportMode === 'mobile' ? '1fr' : 'repeat(3, 1fr)',
                gap: '16px',
              }}
            >
              {['Zero-Trust Tenancy', 'SceneGraph Engine', 'Instant Publication'].map((title, i) => (
                <div
                  key={i}
                  style={{
                    padding: '20px',
                    borderRadius: '12px',
                    background: '#1E293B',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#E2E8F0', margin: 0 }}>{title}</h3>
                  <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
                    High-performance native vector rendering with sub-millisecond AST transactions.
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* ── BOTTOM NON-DESTRUCTIVE ACTION BAR ── */}
      <div
        style={{
          height: '68px',
          background: '#13151D',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          zIndex: 10,
        }}
      >
        {/* Left: Section Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600 }}>Insert Section:</span>
          <select
            id="sz-template-section-selector"
            value={selectedSectionType}
            onChange={(e) => setSelectedSectionType(e.target.value)}
            style={{
              background: '#1E222D',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              padding: '6px 12px',
              color: '#F3F4F6',
              fontSize: '0.78rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="hero">Hero Header Section</option>
            <option value="features">Features Bento Grid</option>
            <option value="pricing">Pricing Matrix</option>
            <option value="testimonials">Testimonials Showcase</option>
            <option value="footer">Footer Global Bar</option>
          </select>

          <button
            id="sz-template-btn-add-section"
            onClick={() => {
              onAddSectionToActivePage(selectedSectionType, template);
              onClose();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <PlusCircle size={15} />
            <span>Add Section to Page</span>
          </button>
        </div>

        {/* Right: Page, Project & Safe Replace Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            id="sz-template-btn-add-page"
            onClick={() => {
              onAddAsNewPage(template);
              onClose();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#34D399',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <FilePlus size={15} />
            <span>Add as New Page</span>
          </button>

          <button
            id="sz-template-btn-use-project"
            onClick={() => {
              onUseAsProject(template);
              onClose();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(139, 92, 246, 0.12)',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              color: '#C084FC',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Sparkles size={15} />
            <span>Use as New Project</span>
          </button>

          <button
            id="sz-template-btn-safe-replace"
            onClick={() => setIsConfirmingReplace(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#F87171',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} />
            <span>Replace Site...</span>
          </button>
        </div>
      </div>

      {/* ── REPLACE CONFIRMATION MODAL ── */}
      {isConfirmingReplace && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 20000,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '420px',
              background: '#1A1D27',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={18} color="#EF4444" />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Replace Current Site?
              </h3>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#9CA3AF', margin: 0, lineHeight: 1.5 }}>
              This will swap your active site with <strong style={{ color: '#FFFFFF' }}>{template.name}</strong>.
              OrbitoX will create an automatic undo snapshot, allowing you to revert at any time with <kbd style={{ background: '#252836', padding: '2px 6px', borderRadius: '4px' }}>⌘Z</kbd>.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setIsConfirmingReplace(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#D1D5DB',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                id="sz-template-confirm-replace-btn"
                onClick={() => {
                  setIsConfirmingReplace(false);
                  onSafeReplaceSite(template);
                  onClose();
                }}
                style={{
                  background: '#DC2626',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Confirm Replace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
