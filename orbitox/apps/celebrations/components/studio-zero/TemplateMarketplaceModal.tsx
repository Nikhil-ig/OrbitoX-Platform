'use client';

import React, { useState } from 'react';
import {
  Compass,
  Search,
  X,
  Sparkles,
  Layers,
  ArrowRight,
  Eye,
  PlusCircle,
  FilePlus,
  Box,
  Monitor,
  Check,
  Bookmark,
} from 'lucide-react';
import { STUDIO_TEMPLATES } from './TemplateBrowserModal';
import { StudioTemplateMeta, TemplateCategory } from './types';
import { LiveTemplatePreview } from './LiveTemplatePreview';

interface TemplateMarketplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSectionToActivePage: (sectionType: string, template: StudioTemplateMeta) => void;
  onAddAsNewPage: (template: StudioTemplateMeta) => void;
  onUseAsProject: (template: StudioTemplateMeta) => void;
  onSafeReplaceSite: (template: StudioTemplateMeta) => void;
}

export function TemplateMarketplaceModal({
  isOpen,
  onClose,
  onAddSectionToActivePage,
  onAddAsNewPage,
  onUseAsProject,
  onSafeReplaceSite,
}: TemplateMarketplaceModalProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [activePreviewTemplate, setActivePreviewTemplate] = useState<StudioTemplateMeta | null>(null);

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Templates' },
    { id: 'saas', label: 'SaaS & Tech' },
    { id: 'business', label: 'Agency & Enterprise' },
    { id: 'portfolio', label: 'Portfolio & Creative' },
    { id: 'ecommerce', label: 'E-Commerce' },
    { id: 'celebrations', label: 'Celebrations & Luxury' },
  ];

  const filtered = STUDIO_TEMPLATES.filter((t) => {
    if (activeCategory !== 'all' && t.category !== activeCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.tagline && t.tagline.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <>
      <div
        id="sz-template-marketplace-modal"
        role="dialog"
        aria-label="Template Universe Marketplace"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          background: 'rgba(9, 11, 17, 0.88)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            width: '1100px',
            maxWidth: '95vw',
            height: '88vh',
            background: '#151722',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '24px',
            boxShadow: '0 24px 80px rgba(0, 0, 0, 0.75)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* ── TOP HEADER ── */}
          <div
            style={{
              padding: '20px 28px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#12141C',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                }}
              >
                <Compass size={20} color="#FFFFFF" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#F3F4F6', margin: 0 }}>
                  Visual Template Marketplace
                </h2>
                <span style={{ fontSize: '0.74rem', color: '#9CA3AF' }}>
                  Explore interactive templates with live multi-device previews and non-destructive insertion
                </span>
              </div>
            </div>

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

          {/* ── SEARCH & CATEGORY BAR ── */}
          <div
            style={{
              padding: '14px 28px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              background: '#171924',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
              {categories.map((c) => {
                const isActive = activeCategory === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveCategory(c.id)}
                    style={{
                      background: isActive ? '#3B82F6' : 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid',
                      borderColor: isActive ? '#3B82F6' : 'rgba(255, 255, 255, 0.08)',
                      borderRadius: '9999px',
                      padding: '5px 14px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      color: isActive ? '#FFFFFF' : '#D1D5DB',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '10px', color: '#6B7280' }} />
              <input
                id="sz-template-marketplace-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..."
                style={{
                  width: '100%',
                  background: '#1E222F',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '7px 12px 7px 34px',
                  fontSize: '0.76rem',
                  color: '#FFFFFF',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* ── TEMPLATE CARDS GRID ── */}
          <div
            className="sz-custom-scrollbar"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px 28px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
              gap: '20px',
            }}
          >
            {filtered.map((t) => (
              <div
                key={t.id}
                data-testid={`template-card-${t.id}`}
                style={{
                  background: '#1B1E2B',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* 16:9 Visual Preview Banner */}
                <div
                  style={{
                    height: '160px',
                    background: t.previewGradient || 'linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        background: 'rgba(0, 0, 0, 0.4)',
                        backdropFilter: 'blur(8px)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        color: '#60A5FA',
                        textTransform: 'uppercase',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      {t.category}
                    </span>

                    <span
                      style={{
                        background: 'rgba(0, 0, 0, 0.4)',
                        backdropFilter: 'blur(8px)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.66rem',
                        color: '#D1D5DB',
                        fontWeight: 600,
                      }}
                    >
                      {t.pagesCount} Pages
                    </span>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                      {t.name}
                    </h3>
                    <p style={{ fontSize: '0.72rem', color: '#94A3B8', margin: '4px 0 0', lineHeight: 1.3 }}>
                      {t.tagline}
                    </p>
                  </div>
                </div>

                {/* Footer Controls with Non-Destructive Actions */}
                <div
                  style={{
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#181A26',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <button
                    onClick={() => setActivePreviewTemplate(t)}
                    style={{
                      background: 'rgba(59, 130, 246, 0.15)',
                      border: '1px solid rgba(59, 130, 246, 0.35)',
                      color: '#60A5FA',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Eye size={13} />
                    <span>Preview Live</span>
                  </button>

                  <button
                    onClick={() => {
                      onAddSectionToActivePage('hero', t);
                      onClose();
                    }}
                    title="Add Hero section directly to active page"
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#E5E7EB',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <PlusCircle size={13} color="#34D399" />
                    <span>Add Hero</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── LIVE INTERACTIVE PREVIEW MODAL ── */}
      {activePreviewTemplate && (
        <LiveTemplatePreview
          template={activePreviewTemplate}
          onClose={() => setActivePreviewTemplate(null)}
          onAddSectionToActivePage={(sec, tmpl) => {
            onAddSectionToActivePage(sec, tmpl);
            onClose();
          }}
          onAddAsNewPage={(tmpl) => {
            onAddAsNewPage(tmpl);
            onClose();
          }}
          onUseAsProject={(tmpl) => {
            onUseAsProject(tmpl);
            onClose();
          }}
          onSafeReplaceSite={(tmpl) => {
            onSafeReplaceSite(tmpl);
            onClose();
          }}
        />
      )}
    </>
  );
}
