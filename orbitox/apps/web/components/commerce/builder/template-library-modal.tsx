'use client';

import React, { useState } from 'react';
import {
  WebsiteTemplate,
  WebsiteTemplateCategory,
  TemplateApplyMode,
  useCommerceTemplates,
  commerceEngine,
} from '@orbitox/commerce';
import {
  IconClose,
  IconSearch,
  IconSparkles,
  IconCrown,
  IconCheck,
  IconEye,
  IconSliders,
} from './studio-icons';
import { OddaWorldGadgetsHeroSection, OddaWorldCategoriesSection } from '@/components/storefront/theme-kit-sections/oddaworld-gadgets-hero';
import { OddaWorldFeatureSpotlightSection } from '@/components/storefront/theme-kit-sections/oddaworld-feature-spotlight';
import { SneakConnectEditorialHeroSection, SneakConnectPopularModelsSection, SneakConnectFeatureGridSection } from '@/components/storefront/theme-kit-sections/sneakconnect-editorial-hero';
import { HyperFluxShowcaseSection } from '@/components/storefront/theme-kit-sections/hyperflux-showcase';
import { PegasusSplitBannerSection } from '@/components/storefront/theme-kit-sections/pegasus-split-banner';
import { AuraSandCarouselSection } from '@/components/storefront/theme-kit-sections/aura-sand-carousel';
import { LuxeCardShowcaseSection } from '@/components/storefront/theme-kit-sections/luxe-card-showcase';
import { NeumorphicGoldDashboardSection } from '@/components/storefront/theme-kit-sections/neumorphic-gold-dashboard';

export interface TemplateLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId?: string;
  onTemplateApplied?: (template: WebsiteTemplate, mode: TemplateApplyMode) => void;
}

export function TemplateLibraryModal({
  isOpen,
  onClose,
  storeId = 'store_aura_luxury',
  onTemplateApplied,
}: TemplateLibraryModalProps) {
  const {
    templates,
    categories,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    previewingTemplate,
    setPreviewingTemplate,
    applyTemplate,
    isApplying,
  } = useCommerceTemplates(storeId);

  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [selectedTemplateForApply, setSelectedTemplateForApply] = useState<WebsiteTemplate | null>(null);
  const [applyMode, setApplyMode] = useState<TemplateApplyMode>('full');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyConfirm = async (template: WebsiteTemplate, mode: TemplateApplyMode) => {
    try {
      await applyTemplate(template.id, mode);
      setToastMessage(`✓ Successfully applied "${template.name}" in ${mode === 'full' ? 'Full Website' : 'Styles Only'} mode!`);
      if (onTemplateApplied) {
        onTemplateApplied(template, mode);
      }
      setSelectedTemplateForApply(null);
      setPreviewingTemplate(null);
      setTimeout(() => {
        setToastMessage(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      alert(`Error applying template: ${err.message}`);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 7, 13, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'absolute',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: '#FFF',
            padding: '12px 24px',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '13px',
            boxShadow: '0 10px 30px rgba(16, 185, 129, 0.4)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─── MAIN MODAL CONTAINER ────────────────────────────────── */}
      <div
        style={{
          width: '100%',
          maxWidth: '1280px',
          height: '90vh',
          maxHeight: '900px',
          background: 'linear-gradient(180deg, rgba(18, 21, 33, 0.96) 0%, rgba(10, 12, 20, 0.98) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          boxShadow: '0 30px 90px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #E5A93C, #F59E0B)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000',
                boxShadow: '0 0 20px rgba(229, 169, 60, 0.35)',
              }}
            >
              <IconCrown size={22} />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#FFF', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Website Templates & Themes Library</span>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: 'rgba(229, 169, 60, 0.2)',
                    color: '#FCD34D',
                    border: '1px solid rgba(229, 169, 60, 0.4)',
                    fontWeight: 800,
                  }}
                >
                  Figma & Canva Caliber
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                Production-ready, pre-built storefront websites. Preview on any device, apply with 1 click, and easily customize copy, images & layout.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Search Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '6px 12px',
                borderRadius: '10px',
                width: '240px',
              }}
            >
              <IconSearch size={14} style={{ color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search templates, tags, niches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#FFF',
                  fontSize: '12px',
                  outline: 'none',
                  width: '100%',
                }}
              />
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <IconClose size={16} />
            </button>
          </div>
        </div>

        {/* Category Filter Pills Bar */}
        <div
          style={{
            padding: '12px 28px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            background: 'rgba(0, 0, 0, 0.2)',
            flexShrink: 0,
          }}
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id as any)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  border: isActive ? '1px solid #E5A93C' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isActive ? 'rgba(229, 169, 60, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  color: isActive ? '#FCD34D' : '#94A3B8',
                  fontSize: '11px',
                  fontWeight: isActive ? 800 : 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{cat.label}</span>
                <span
                  style={{
                    fontSize: '9px',
                    padding: '1px 6px',
                    borderRadius: '9999px',
                    background: isActive ? 'rgba(229, 169, 60, 0.4)' : 'rgba(255, 255, 255, 0.08)',
                    color: isActive ? '#FFF' : '#64748B',
                    fontWeight: 800,
                  }}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Templates Grid Content Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 28px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '24px',
            alignContent: 'flex-start',
          }}
        >
          {templates.length === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                padding: '80px 20px',
                textAlign: 'center',
                color: '#94A3B8',
              }}
            >
              <IconSparkles size={36} style={{ color: '#E5A93C', marginBottom: '12px' }} />
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFF' }}>No website templates match your search</div>
              <div style={{ fontSize: '13px', marginTop: '6px' }}>Try searching for &quot;jutti&quot;, &quot;couture&quot;, &quot;minimal&quot;, or select another category above.</div>
            </div>
          ) : (
            templates.map((template) => {
              const colors = template.themeConfig.colors;
              return (
                <div
                  key={template.id}
                  style={{
                    background: 'rgba(24, 28, 44, 0.75)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '18px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.borderColor = 'rgba(229, 169, 60, 0.4)';
                    e.currentTarget.style.boxShadow = '0 18px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(229, 169, 60, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.4)';
                  }}
                >
                  {/* Cover Image Preview */}
                  <div
                    style={{
                      height: '190px',
                      position: 'relative',
                      overflow: 'hidden',
                      backgroundImage: `url(${template.previewImage})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(10,12,20,0.9) 100%)',
                      }}
                    />

                    {/* Top Badges */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        display: 'flex',
                        gap: '6px',
                        alignItems: 'center',
                      }}
                    >
                      {template.badge && (
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            background: template.badge === 'Featured' ? 'linear-gradient(135deg, #E5A93C, #F59E0B)' : 'rgba(0,0,0,0.7)',
                            color: template.badge === 'Featured' ? '#000' : '#FFF',
                            fontSize: '10px',
                            fontWeight: 800,
                            letterSpacing: '0.02em',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                          }}
                        >
                          {template.badge}
                        </span>
                      )}
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          background: 'rgba(0,0,0,0.6)',
                          backdropFilter: 'blur(8px)',
                          color: '#CBD5E1',
                          fontSize: '10px',
                          fontWeight: 700,
                        }}
                      >
                        {template.categoryLabel}
                      </span>
                    </div>

                    {/* Color Swatches on Bottom Right of Image */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '12px',
                        right: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(0,0,0,0.65)',
                        backdropFilter: 'blur(8px)',
                        padding: '4px 8px',
                        borderRadius: '9999px',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: colors.primary, border: '1px solid rgba(255,255,255,0.3)' }} />
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: colors.secondary, border: '1px solid rgba(255,255,255,0.3)' }} />
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: colors.background, border: '1px solid rgba(255,255,255,0.3)' }} />
                    </div>

                    {/* Page Count Badge */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '12px',
                        left: '12px',
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#FCD34D',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>📄 {template.pages.length} Pages Included</span>
                      <span style={{ color: '#64748B' }}>•</span>
                      <span>{template.pages[0]?.sections.length} Sections</span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFF', letterSpacing: '-0.01em' }}>
                        {template.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px', lineHeight: 1.4 }}>
                        {template.tagline}
                      </div>
                    </div>

                    {/* Key Features List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                      {template.features.slice(0, 3).map((f, i) => (
                        <div key={i} style={{ fontSize: '11px', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#10B981', fontSize: '10px' }}>✓</span>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f}</span>
                        </div>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '8px', marginTop: 'auto', paddingTop: '12px' }}>
                      <button
                        type="button"
                        onClick={() => setPreviewingTemplate(template)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: '#FFF',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <IconEye size={13} />
                        <span>Live Preview</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedTemplateForApply(template)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #E5A93C, #F59E0B)',
                          color: '#000',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 14px rgba(229, 169, 60, 0.35)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <IconSparkles size={13} />
                        <span>Use Template</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── LIVE INTERACTIVE PREVIEW LIGHTBOX MODAL ─────────────── */}
      {previewingTemplate && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10005,
            background: 'rgba(0, 0, 0, 0.92)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {/* Preview Navigation Bar */}
          <div
            style={{
              padding: '12px 24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(15, 18, 28, 0.95)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button
                type="button"
                onClick={() => setPreviewingTemplate(null)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#94A3B8',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ← Back to Gallery
              </button>

              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFF' }}>
                  {previewingTemplate.name}
                </div>
                <div style={{ fontSize: '10px', color: '#94A3B8' }}>
                  {previewingTemplate.tagline}
                </div>
              </div>
            </div>

            {/* Device Switcher */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(0, 0, 0, 0.5)',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                gap: '2px',
              }}
            >
              {[
                { id: 'desktop', label: '🖥️ Desktop (1440px)' },
                { id: 'tablet', label: '📱 Tablet (768px)' },
                { id: 'mobile', label: '📱 Mobile (375px)' },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setPreviewDevice(d.id as any)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: previewDevice === d.id ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                    color: previewDevice === d.id ? '#FFF' : '#94A3B8',
                    fontSize: '11px',
                    fontWeight: previewDevice === d.id ? 800 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Apply Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setSelectedTemplateForApply(previewingTemplate)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #E5A93C, #F59E0B)',
                  color: '#000',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 16px rgba(229, 169, 60, 0.4)',
                }}
              >
                <IconSparkles size={14} />
                <span>Apply This Website Template</span>
              </button>
            </div>
          </div>

          {/* Preview Viewport Frame */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              justifyContent: 'center',
              padding: '24px',
              background: '#07090E',
            }}
          >
            <div
              style={{
                width: previewDevice === 'desktop' ? '100%' : previewDevice === 'tablet' ? '768px' : '375px',
                maxWidth: '1360px',
                background: previewDevice === 'desktop' ? previewingTemplate.themeConfig.colors.background : '#0E1017',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: previewDevice === 'desktop' ? '12px' : '28px',
                overflow: 'hidden',
                boxShadow: '0 20px 80px rgba(0,0,0,0.8)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'width 0.3s ease',
              }}
            >
              {/* Render Simulated Preview of the Template Sections */}
              {previewingTemplate.pages[0]?.sections.map((sec, idx) => {
                const accent = sec.settings.accentTone || previewingTemplate.themeConfig.colors.primary;
                const bg = sec.settings.backgroundColor || previewingTemplate.themeConfig.colors.surface;
                const text = sec.settings.textColor || previewingTemplate.themeConfig.colors.text;

                return (
                  <div
                    key={idx}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      position: 'relative',
                    }}
                  >
                    {/* Announcement Bar */}
                    {sec.type === 'announcement-bar' && (
                      <div
                        style={{
                          background: sec.settings.backgroundColor || accent,
                          color: '#000',
                          padding: '10px 16px',
                          textAlign: 'center',
                          fontSize: '12px',
                          fontWeight: 800,
                          letterSpacing: '0.03em',
                        }}
                      >
                        {sec.settings.text}
                      </div>
                    )}

                    {/* Header */}
                    {sec.type === 'header' && (
                      <div
                        style={{
                          background: previewingTemplate.themeConfig.colors.surface,
                          padding: '16px 28px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#FFF', letterSpacing: '0.05em' }}>
                          {sec.settings.storeName || previewingTemplate.name}
                        </div>
                        <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#CBD5E1', fontWeight: 600 }}>
                          <span>Home</span>
                          <span>Bridal Juttis</span>
                          <span>Phulkari</span>
                          <span>Artisan Story</span>
                          <span>Lookbook</span>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', fontSize: '12px' }}>
                          <span>🔍</span>
                          <span>❤️</span>
                          <span>🛒 (0)</span>
                        </div>
                      </div>
                    )}

                    {/* Hero */}
                    {sec.type === 'hero' && (
                      <div
                        style={{
                          minHeight: '480px',
                          padding: '60px 40px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          textAlign: 'center',
                          backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.75)), url(${sec.settings.bgImage || previewingTemplate.previewImage})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          color: '#FFF',
                          gap: '16px',
                        }}
                      >
                        {sec.settings.badgeText && (
                          <div
                            style={{
                              padding: '5px 14px',
                              borderRadius: '9999px',
                              background: 'rgba(229, 169, 60, 0.2)',
                              border: '1px solid #E5A93C',
                              color: '#FCD34D',
                              fontSize: '11px',
                              fontWeight: 800,
                            }}
                          >
                            {sec.settings.badgeText}
                          </div>
                        )}
                        <h1
                          style={{
                            fontSize: previewDevice === 'mobile' ? '26px' : '44px',
                            fontWeight: 800,
                            maxWidth: '820px',
                            lineHeight: 1.15,
                            margin: 0,
                            color: '#FFF',
                            fontFamily: `'${previewingTemplate.themeConfig.typography.headingFont}', serif`,
                          }}
                        >
                          {sec.settings.title}
                        </h1>
                        <p style={{ fontSize: '14px', maxWidth: '640px', color: '#E2E8F0', lineHeight: 1.6, margin: 0 }}>
                          {sec.settings.subtitle}
                        </p>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                          <button
                            type="button"
                            style={{
                              padding: '12px 28px',
                              borderRadius: previewingTemplate.themeConfig.layout.buttonBorderRadius,
                              background: accent,
                              color: '#000',
                              fontWeight: 800,
                              fontSize: '13px',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            {sec.settings.primaryCtaText || 'Explore Collection'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Trust Badges */}
                    {sec.type === 'trust-badges' && (
                      <div
                        style={{
                          background: previewingTemplate.themeConfig.colors.surface,
                          padding: '24px 32px',
                          display: 'grid',
                          gridTemplateColumns: previewDevice === 'mobile' ? '1fr' : 'repeat(4, 1fr)',
                          gap: '16px',
                          textAlign: 'center',
                        }}
                      >
                        {[
                          { t: sec.settings.badge1Title || '100% Bite-Free Leather', s: sec.settings.badge1Subtitle || 'Double-padded memory foam sole' },
                          { t: sec.settings.badge2Title || 'Handmade by Artisans', s: sec.settings.badge2Subtitle || 'Patiala heritage needlework' },
                          { t: sec.settings.badge3Title || 'Express Global Shipping', s: sec.settings.badge3Subtitle || '4-Day delivery worldwide' },
                          { t: sec.settings.badge4Title || 'Easy Doorstep Exchange', s: sec.settings.badge4Subtitle || 'Zero questions asked' },
                        ].map((b, i) => (
                          <div key={i} style={{ padding: '8px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#FFF' }}>{b.t}</div>
                            <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>{b.s}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ─── Specialized Theme Kit Components (Reference Images 1-5) ─── */}
                    {sec.type === 'oddaworld-gadgets-hero' && (
                      <OddaWorldGadgetsHeroSection section={sec} />
                    )}
                    {sec.type === 'oddaworld-categories' && (
                      <OddaWorldCategoriesSection section={sec} />
                    )}
                    {sec.type === 'oddaworld-feature-spotlight' && (
                      <OddaWorldFeatureSpotlightSection section={sec} />
                    )}
                    {sec.type === 'sneakconnect-editorial-hero' && (
                      <SneakConnectEditorialHeroSection section={sec} />
                    )}
                    {sec.type === 'sneakconnect-popular-models' && (
                      <SneakConnectPopularModelsSection section={sec} />
                    )}
                    {sec.type === 'sneakconnect-feature-grid' && (
                      <SneakConnectFeatureGridSection section={sec} />
                    )}
                    {sec.type === 'hyperflux-showcase' && (
                      <HyperFluxShowcaseSection section={sec} />
                    )}
                    {sec.type === 'pegasus-split-banner' && (
                      <PegasusSplitBannerSection section={sec} />
                    )}
                    {sec.type === 'aura-sand-carousel' && (
                      <AuraSandCarouselSection section={sec} />
                    )}
                    {sec.type === 'luxe-card-showcase' && (
                      <LuxeCardShowcaseSection section={sec} />
                    )}
                    {sec.type === 'neumorphic-gold-dashboard' && (
                      <NeumorphicGoldDashboardSection section={sec} />
                    )}

                    {/* Generic Preview Section Box */}
                    {!['announcement-bar', 'header', 'hero', 'trust-badges', 'oddaworld-gadgets-hero', 'oddaworld-categories', 'oddaworld-feature-spotlight', 'sneakconnect-editorial-hero', 'sneakconnect-popular-models', 'sneakconnect-feature-grid', 'hyperflux-showcase', 'pegasus-split-banner', 'aura-sand-carousel', 'luxe-card-showcase', 'neumorphic-gold-dashboard'].includes(sec.type) && (
                      <div
                        style={{
                          background: bg,
                          padding: '40px 24px',
                          textAlign: 'center',
                          color: text,
                        }}
                      >
                        <div style={{ fontSize: '10px', fontWeight: 800, color: accent, textTransform: 'uppercase' }}>
                          {sec.type.replace(/-/g, ' ')}
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px' }}>
                          {sec.settings.title || sec.name}
                        </div>
                        {sec.settings.subtitle && (
                          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', maxWidth: '500px', margin: '4px auto 0' }}>
                            {sec.settings.subtitle}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── INSTALLATION MODE CONFIRMATION MODAL ───────────────── */}
      {selectedTemplateForApply && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10010,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '540px',
              background: '#121522',
              border: '1px solid rgba(229, 169, 60, 0.3)',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 25px 70px rgba(0,0,0,0.85)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #E5A93C, #F59E0B)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000',
                }}
              >
                <IconSparkles size={18} />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFF' }}>
                  Apply &quot;{selectedTemplateForApply.name}&quot;
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                  Select how you would like this Theme Kit installed to your store.
                </div>
              </div>
            </div>

            {/* Mode Option 1: Full Turnkey Kit */}
            <div
              onClick={() => setApplyMode('full')}
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                background: applyMode === 'full' ? 'rgba(229, 169, 60, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                border: applyMode === 'full' ? '1.5px solid #E5A93C' : '1px solid rgba(255, 255, 255, 0.08)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: applyMode === 'full' ? '#FCD34D' : '#FFF' }}>
                  🚀 Full Turnkey Theme Kit (Recommended)
                </span>
                {applyMode === 'full' && <IconCheck size={14} style={{ color: '#E5A93C' }} />}
              </div>
              <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0, lineHeight: 1.4 }}>
                Installs complete pre-built pages, unique bespoke UI section layouts, sample products, typography pairings & color palettes. Ready to customize and launch immediately!
              </p>
            </div>

            {/* Mode Option 2: Layout & Sections Only */}
            <div
              onClick={() => setApplyMode('sections-only')}
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                background: applyMode === 'sections-only' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                border: applyMode === 'sections-only' ? '1.5px solid #10B981' : '1px solid rgba(255, 255, 255, 0.08)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: applyMode === 'sections-only' ? '#6EE7B7' : '#FFF' }}>
                  📐 Layout & UI Sections Only
                </span>
                {applyMode === 'sections-only' && <IconCheck size={14} style={{ color: '#10B981' }} />}
              </div>
              <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0, lineHeight: 1.4 }}>
                Adopts the new theme kit&apos;s UI layout structures and section components while preserving your store&apos;s existing brand color palette.
              </p>
            </div>

            {/* Mode Option 3: Styles Only */}
            <div
              onClick={() => setApplyMode('styles-only')}
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                background: applyMode === 'styles-only' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                border: applyMode === 'styles-only' ? '1.5px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.08)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: applyMode === 'styles-only' ? '#7DD3FC' : '#FFF' }}>
                  🎨 Theme Styles & Design Tokens Only
                </span>
                {applyMode === 'styles-only' && <IconCheck size={14} style={{ color: '#38BDF8' }} />}
              </div>
              <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0, lineHeight: 1.4 }}>
                Applies colors, typography pairings, and border radii while leaving your existing section hierarchy intact.
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setSelectedTemplateForApply(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#94A3B8',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleApplyConfirm(selectedTemplateForApply, applyMode)}
                disabled={isApplying}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #E5A93C, #F59E0B)',
                  color: '#000',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: isApplying ? 'not-allowed' : 'pointer',
                  opacity: isApplying ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <IconSparkles size={13} />
                <span>{isApplying ? 'Installing Template...' : 'Confirm & Apply Template'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
