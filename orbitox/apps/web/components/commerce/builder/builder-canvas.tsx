'use client';

import React, { useState } from 'react';
import {
  PageSection,
  ThemeConfig,
  Product,
  CustomComponentDefinition,
  ComponentType,
  commerceEngine,
} from '@orbitox/commerce';
import { CanvasSectionWrapper } from './canvas-section-wrapper';
import { DropZoneIndicator } from './drop-zone-indicator';
import { CustomComponentRenderer } from '@/components/storefront/custom-component-renderer';
import { OddaWorldGadgetsHeroSection, OddaWorldCategoriesSection } from '@/components/storefront/theme-kit-sections/oddaworld-gadgets-hero';
import { OddaWorldFeatureSpotlightSection } from '@/components/storefront/theme-kit-sections/oddaworld-feature-spotlight';
import { SneakConnectEditorialHeroSection, SneakConnectPopularModelsSection, SneakConnectFeatureGridSection } from '@/components/storefront/theme-kit-sections/sneakconnect-editorial-hero';
import { HyperFluxShowcaseSection } from '@/components/storefront/theme-kit-sections/hyperflux-showcase';
import { PegasusSplitBannerSection } from '@/components/storefront/theme-kit-sections/pegasus-split-banner';
import { AuraSandCarouselSection } from '@/components/storefront/theme-kit-sections/aura-sand-carousel';
import { LuxeCardShowcaseSection } from '@/components/storefront/theme-kit-sections/luxe-card-showcase';
import { NeumorphicGoldDashboardSection } from '@/components/storefront/theme-kit-sections/neumorphic-gold-dashboard';
import { UniversalProductCard } from '@/components/storefront/universal-product-card';
import {
  IconPalette,
  IconShoppingBag,
  IconShieldCheck,
  IconMessageCircle,
  IconSparkles,
  IconCrown,
  IconPlus,
  IconBolt,
  IconStar,
  IconCheck,
} from './studio-icons';

export interface BuilderCanvasProps {
  sections: PageSection[];
  selectedSectionId: string | null;
  onSelectSection: (id: string) => void;
  onMoveSection: (id: string, direction: 'up' | 'down') => void;
  onDuplicateSection: (id: string) => void;
  onDeleteSection: (id: string) => void;
  onToggleSection: (id: string) => void;
  onQuickInsertSection: (type: ComponentType | string, targetIndex: number) => void;
  onUpdateSectionSettings?: (sectionId: string, settings: Record<string, any>) => void;
  currentTheme: ThemeConfig;
  previewDevice: 'desktop' | 'tablet' | 'mobile';
  storeProducts?: Product[];
  customComponents?: CustomComponentDefinition[];
  onOpenQuickProductEdit?: (product: Product) => void;
}

export function BuilderCanvas({
  sections,
  selectedSectionId,
  onSelectSection,
  onMoveSection,
  onDuplicateSection,
  onDeleteSection,
  onToggleSection,
  onQuickInsertSection,
  onUpdateSectionSettings,
  currentTheme,
  previewDevice,
  storeProducts = [],
  customComponents = [],
  onOpenQuickProductEdit,
}: BuilderCanvasProps) {
  const [editingInlineField, setEditingInlineField] = useState<{ sectionId: string; field: string } | null>(null);
  const [inlineValue, setInlineValue] = useState<string>('');

  const getContainerWidth = () => {
    switch (previewDevice) {
      case 'mobile':
        return '390px';
      case 'tablet':
        return '768px';
      case 'desktop':
      default:
        return '100%';
    }
  };

  const handleStartInlineEdit = (sectionId: string, field: string, currentValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingInlineField({ sectionId, field });
    setInlineValue(currentValue || '');
  };

  const handleSaveInlineEdit = () => {
    if (editingInlineField && onUpdateSectionSettings) {
      onUpdateSectionSettings(editingInlineField.sectionId, {
        [editingInlineField.field]: inlineValue,
      });
    }
    setEditingInlineField(null);
  };

  const sampleImages = [
    'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?q=80&w=1000&auto=format&fit=crop',
  ];

  return (
    <div
      id="builder-canvas-scroll-container"
      style={{
        flex: 1,
        minHeight: 0,
        height: '100%',
        width: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '24px 20px 140px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'radial-gradient(ellipse at top, rgba(24, 28, 44, 0.4) 0%, rgba(10, 12, 20, 0.9) 100%)',
        userSelect: 'none',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        boxSizing: 'border-box',
      }}
      onClick={() => {
        if (editingInlineField) handleSaveInlineEdit();
      }}
    >
      <div
        style={{
          width: getContainerWidth(),
          maxWidth: '100%',
          transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          background: '#0B0D14',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 0, 0, 0.6)',
          flexShrink: 0,
        }}
      >
        {/* Top Initial Drop Zone */}
        <DropZoneIndicator
          index={0}
          onQuickInsert={(type) => onQuickInsertSection(type, 0)}
        />

        {sections.length === 0 ? (
          <div
            style={{
              padding: '80px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              color: 'rgba(255, 255, 255, 0.5)',
            }}
          >
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(229, 169, 60, 0.12)', border: '1px solid rgba(229, 169, 60, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconPalette size={32} style={{ color: '#E5A93C' }} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFF', margin: 0 }}>
              Your Canvas is Ready
            </h3>
            <p style={{ fontSize: '13px', maxWidth: '420px', margin: 0 }}>
              Drag and drop components from the left palette or hover between sections to insert magic blocks.
            </p>
          </div>
        ) : (
          sections.map((sec, idx) => {
            const isSelected = selectedSectionId === sec.id;
            const customDef = sec.customComponentId
              ? customComponents.find((c) => c.id === sec.customComponentId)
              : customComponents.find((c) => c.type === sec.type);

            // Dynamic Design Tokens & Unified Theme Resolution
            const resolvedStyle = commerceEngine.themes.resolveSectionStyle(currentTheme, sec.settings);
            const accent = resolvedStyle.accentTone;
            const bg = resolvedStyle.backgroundColor;
            const textCol = resolvedStyle.textColor;
            const radius = resolvedStyle.borderRadius;
            const vPadding = resolvedStyle.verticalPadding;
            const fontFamily = resolvedStyle.fontFamily;
            const bgStyle = resolvedStyle.computedBackground;

            return (
              <React.Fragment key={sec.id}>
                <CanvasSectionWrapper
                  section={sec}
                  index={idx}
                  isSelected={isSelected}
                  onSelect={() => onSelectSection(sec.id)}
                  onMoveUp={() => onMoveSection(sec.id, 'up')}
                  onMoveDown={() => onMoveSection(sec.id, 'down')}
                  onDuplicate={() => onDuplicateSection(sec.id)}
                  onDelete={() => onDeleteSection(sec.id)}
                  onToggle={() => onToggleSection(sec.id)}
                  canMoveUp={idx > 0}
                  canMoveDown={idx < sections.length - 1}
                >
                  {/* If custom LEGO component, render with CustomComponentRenderer */}
                  {customDef ? (
                    <div style={{ padding: '24px', fontFamily, borderRadius: radius, background: bgStyle, color: textCol }}>
                      <CustomComponentRenderer definition={customDef} settings={sec.settings} />
                    </div>
                  ) : (
                    /* Built-in component rendering with dynamic styles */
                    <div style={{ fontFamily, borderRadius: radius, background: bgStyle, color: textCol, transition: 'all 0.2s ease' }}>
                      {/* 1. Announcement Bar */}
                      {sec.type === 'announcement-bar' && (
                        <div
                          style={{
                            background: sec.settings.backgroundColor || accent,
                            color: '#000',
                            padding: '10px 16px',
                            textAlign: 'center',
                            fontWeight: 800,
                            fontSize: '12px',
                            letterSpacing: '0.04em',
                            cursor: 'text',
                          }}
                        >
                          {sec.settings.text || '✨ FREE EXPRESS WORLDWIDE SHIPPING ON ALL ORDERS'}
                        </div>
                      )}

                      {/* 2. Header */}
                      {sec.type === 'header' && (
                        <div
                          style={{
                            padding: '16px 24px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: `1px solid rgba(255,255,255,0.08)`,
                            background: bg,
                          }}
                        >
                          <div style={{ fontSize: '18px', fontWeight: 900, fontFamily, color: textCol }}>
                            {sec.settings.logoText || 'AURA ATELIER'}
                          </div>
                          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                            <span>Shop</span>
                            <span>Bridal</span>
                            <span>Lookbook</span>
                            <span>About</span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '4px', background: accent, color: '#000', fontWeight: 800 }}>
                              Bag (0)
                            </span>
                          </div>
                        </div>
                      )}

                      {/* 3. Hero */}
                      {sec.type === 'hero' && (() => {
                        const rawOpacity = typeof sec.settings.overlayOpacity === 'number' ? sec.settings.overlayOpacity : 40;
                        const heroOpacity = Math.max(0, Math.min(100, rawOpacity)) / 100;
                        const align = sec.settings.textAlignment || 'center';

                        return (
                          <div
                            style={{
                              padding: vPadding,
                              textAlign: align as any,
                              background: sec.settings.imageUrl
                                ? `linear-gradient(rgba(0, 0, 0, ${heroOpacity}), rgba(0, 0, 0, ${Math.min(1, heroOpacity + 0.15)})), url(${sec.settings.imageUrl}) center/cover no-repeat`
                                : `linear-gradient(135deg, ${bg}, #000)`,
                              color: textCol,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
                              gap: '12px',
                              minHeight: '320px',
                              justifyContent: 'center',
                            }}
                          >
                            {sec.settings.badge && (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  letterSpacing: '0.12em',
                                  textTransform: 'uppercase',
                                  padding: '4px 12px',
                                  borderRadius: '999px',
                                  background: `${accent}25`,
                                  color: accent,
                                  border: `1px solid ${accent}60`,
                                }}
                              >
                                {sec.settings.badge}
                              </span>
                            )}

                            <h1
                              style={{
                                fontSize: '32px',
                                fontWeight: 900,
                                margin: 0,
                                fontFamily,
                                lineHeight: 1.15,
                                maxWidth: '640px',
                              }}
                            >
                              {sec.settings.title || 'Elegance Redefined'}
                            </h1>

                            <p
                              style={{
                                fontSize: '13px',
                                color: 'rgba(255, 255, 255, 0.8)',
                                margin: 0,
                                maxWidth: '520px',
                                lineHeight: 1.5,
                              }}
                            >
                              {sec.settings.subtitle || 'Discover handcrafted luxury pieces designed for the modern connoisseur.'}
                            </p>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                              {sec.settings.primaryButtonText && (
                                <span
                                  style={{
                                    padding: '10px 22px',
                                    borderRadius: '6px',
                                    background: accent,
                                    color: '#000',
                                    fontWeight: 800,
                                    fontSize: '12px',
                                  }}
                                >
                                  {sec.settings.primaryButtonText}
                                </span>
                              )}
                              {sec.settings.secondaryButtonText && (
                                <span
                                  style={{
                                    padding: '10px 22px',
                                    borderRadius: '6px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    color: '#FFF',
                                    fontWeight: 700,
                                    fontSize: '12px',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                  }}
                                >
                                  {sec.settings.secondaryButtonText}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* 4. Video Hero */}
                      {sec.type === 'video-hero' && (
                        <div style={{ position: 'relative', minHeight: '280px', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: vPadding, overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.85))' }} />
                          <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '10px', color: accent, fontWeight: 800, textTransform: 'uppercase' }}>👑 {sec.settings.badge || 'CINEMATIC ATELIER'}</span>
                            <h3 style={{ fontSize: '24px', fontWeight: 900, margin: 0, fontFamily }}>{sec.settings.title || 'Handcrafted Perfection in Motion'}</h3>
                            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', maxWidth: '440px', margin: 0 }}>{sec.settings.subtitle || 'Live video background enabled'}</p>
                            <span style={{ marginTop: '8px', padding: '8px 18px', borderRadius: '6px', background: accent, color: '#000', fontWeight: 800, fontSize: '11px' }}>{sec.settings.primaryButtonText || 'Explore'}</span>
                          </div>
                        </div>
                      )}

                      {/* 5. Animated Promo Ribbon */}
                      {sec.type === 'promo-ribbon' && (
                        <div style={{ background: sec.settings.backgroundColor || '#7A1113', color: sec.settings.textColor || accent, padding: '12px 20px', overflow: 'hidden', whiteSpace: 'nowrap', fontWeight: 800, fontSize: '12px', letterSpacing: '0.06em', textAlign: 'center' }}>
                          {sec.settings.text || '👑 ROYAL BRIDAL EDITION 2026 • 100% HANDMADE DABKA • FREE INSURED WORLDWIDE SHIPPING • NO BITE MEMORY FOAM'}
                        </div>
                      )}

                      {/* 6. Campaign Banner */}
                      {sec.type === 'banner' && (
                        <div style={{ padding: vPadding, background: `linear-gradient(135deg, ${accent}25, ${bg})`, border: `1px solid ${accent}40`, margin: '12px', borderRadius: radius, textAlign: 'center' }}>
                          <span style={{ fontSize: '11px', color: accent, fontWeight: 800 }}>{sec.settings.tagline || 'EXCLUSIVE FESTIVE OFFER'}</span>
                          <h3 style={{ fontSize: '22px', fontWeight: 900, margin: '8px 0', color: textCol, fontFamily }}>{sec.settings.heading || 'Get 25% Off Your First Order'}</h3>
                          <p style={{ fontSize: '12px', color: '#CBD5E1', maxWidth: '480px', margin: '0 auto 14px' }}>{sec.settings.description || 'Use code WELCOME25 at checkout.'}</p>
                          <span style={{ padding: '8px 18px', borderRadius: '6px', background: accent, color: '#000', fontWeight: 800, fontSize: '11px' }}>{sec.settings.buttonText || 'Claim Offer'}</span>
                        </div>
                      )}

                      {/* 7. Product Grid */}
                      {sec.type === 'product-grid' && (
                        <div style={{ padding: vPadding }}>
                          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            {sec.settings.subtitle && (
                              <span style={{ fontSize: '11px', color: accent, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                {sec.settings.subtitle}
                              </span>
                            )}
                            <h3 style={{ fontSize: '24px', fontWeight: 800, margin: '4px 0 0', fontFamily, color: textCol }}>
                              {sec.settings.title || 'Curated Masterpieces'}
                            </h3>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${sec.settings.columns || 3}, 1fr)`, gap: '20px' }}>
                            {(storeProducts.length > 0
                              ? storeProducts.slice(0, Number(sec.settings.columns || 3))
                              : [
                                  { id: 'sample_1', title: 'Deep Blue Nights', price: 299900, slug: 'deep-blue-nights', description: "For those who crave peace louder than the city. This view isn't just scenery, it's a whole reset.", media: [{ id: 'm1', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=800&auto=format&fit=crop' }] },
                                  { id: 'sample_2', title: 'Alpine Peak Dawn', price: 349900, slug: 'alpine-peak-dawn', description: 'Raw titanium chassis tuned for studio-grade low distortion and binaural depth.', media: [{ id: 'm2', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=800&auto=format&fit=crop' }] },
                                  { id: 'sample_3', title: 'Obsidian Velvet Crown', price: 420000, slug: 'obsidian-velvet-crown', description: 'Pure handcrafted luxury artifact with 24K gold dabka embroidery.', media: [{ id: 'm3', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800&auto=format&fit=crop' }] },
                                ]
                            ).map((p: any) => (
                              <UniversalProductCard
                                key={p.id}
                                product={p}
                                storeSlug="punjabi-jutti"
                                theme={currentTheme}
                                variant={sec.settings.cardVariant || 'auto'}
                                formatPrice={(c) => `$${(c / 100).toFixed(2)}`}
                                accentColor={accent}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 8. Product Carousel */}
                      {sec.type === 'product-carousel' && (
                        <div style={{ padding: vPadding }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
                            <div>
                              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, fontFamily, color: textCol }}>{sec.settings.title || 'New Arrivals & Trending'}</h3>
                              <p style={{ fontSize: '11px', color: '#94A3B8', margin: '2px 0 0' }}>{sec.settings.subtitle || 'Fresh off the runway this week'}</p>
                            </div>
                            <span style={{ fontSize: '11px', color: accent, fontWeight: 700 }}>Swipe →</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                            {sampleImages.slice(0, 3).map((img, i) => (
                              <div key={i} style={{ borderRadius: radius, overflow: 'hidden', background: bg, border: '1px solid rgba(255,255,255,0.08)' }}>
                                <img src={img} alt="Product" style={{ width: '100%', height: '130px', objectFit: 'cover' }} />
                                <div style={{ padding: '8px', fontSize: '11px', fontWeight: 700 }}>Bridal Heirloom #{i + 1}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 9. Category Grid */}
                      {sec.type === 'category-grid' && (
                        <div style={{ padding: vPadding }}>
                          <h3 style={{ fontSize: '18px', fontWeight: 800, textAlign: 'center', margin: '0 0 16px', fontFamily, color: textCol }}>{sec.settings.title || 'Shop by Department'}</h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                            {['Bridal Velvet', 'Daily Mojaris', 'Royal Zardozi'].map((cat, i) => (
                              <div key={cat} style={{ position: 'relative', height: '120px', borderRadius: radius, overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '12px' }}>
                                <img src={sampleImages[i % sampleImages.length]} alt={cat} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.85))' }} />
                                <span style={{ position: 'relative', zIndex: 2, color: '#FFF', fontWeight: 800, fontSize: '12px' }}>{cat}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 10. Accordion Features & 100% Bite-Free */}
                      {sec.type === 'accordion-features' && (
                        <div style={{ padding: vPadding, background: `${accent}10`, border: `1px solid ${accent}30`, margin: '12px', borderRadius: radius }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <IconShieldCheck size={20} style={{ color: accent }} />
                            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: textCol, fontFamily }}>{sec.settings.title || '100% Bite-Free Soles Guarantee'}</h3>
                          </div>
                          <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '16px' }}>{sec.settings.subtitle || 'Every single stitch is executed by hand with supreme royal grade materials.'}</p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                            <div style={{ padding: '12px', borderRadius: radius, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <div style={{ fontSize: '11px', fontWeight: 800, color: accent, marginBottom: '4px' }}>Triple Cushion Foam</div>
                              <div style={{ fontSize: '10px', color: '#CBD5E1' }}>Dance all night with zero heel bites.</div>
                            </div>
                            <div style={{ padding: '12px', borderRadius: radius, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <div style={{ fontSize: '11px', fontWeight: 800, color: accent, marginBottom: '4px' }}>24K Gold Zardozi</div>
                              <div style={{ fontSize: '10px', color: '#CBD5E1' }}>Authentic dabka needlework.</div>
                            </div>
                            <div style={{ padding: '12px', borderRadius: radius, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <div style={{ fontSize: '11px', fontWeight: 800, color: '#60A5FA', marginBottom: '4px' }}>Pure Veg-Tan Leather</div>
                              <div style={{ fontSize: '10px', color: '#CBD5E1' }}>Supple & breathable foot mold.</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 11. Heritage Timeline */}
                      {sec.type === 'brand-story-timeline' && (
                        <div style={{ padding: vPadding }}>
                          <h3 style={{ fontSize: '18px', fontWeight: 800, textAlign: 'center', margin: '0 0 16px', fontFamily, color: textCol }}>{sec.settings.title || 'A Century of Royal Heritage'}</h3>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                            {[
                              { year: sec.settings.step1Year || '1924', title: sec.settings.step1Title || 'Royal Court Shoemakers', desc: sec.settings.step1Desc || 'Crafting for Maharajas of Punjab' },
                              { year: sec.settings.step2Year || '1988', title: sec.settings.step2Title || 'Artisan Guild Revival', desc: sec.settings.step2Desc || 'Preserving dabka needlecraft' },
                              { year: sec.settings.step3Year || '2026', title: sec.settings.step3Title || 'Bite-Free Innovation', desc: sec.settings.step3Desc || 'Aerospace memory foam comfort' },
                            ].map((s) => (
                              <div key={s.year} style={{ padding: '12px', borderRadius: radius, background: 'rgba(255,255,255,0.03)', border: `1px solid ${accent}30` }}>
                                <span style={{ fontSize: '14px', fontWeight: 900, color: accent }}>{s.year}</span>
                                <div style={{ fontSize: '12px', fontWeight: 700, margin: '4px 0 2px' }}>{s.title}</div>
                                <div style={{ fontSize: '10px', color: '#94A3B8' }}>{s.desc}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 12. Testimonials */}
                      {sec.type === 'testimonials' && (
                        <div style={{ padding: vPadding, textAlign: 'center' }}>
                          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', fontFamily, color: textCol }}>{sec.settings.title || 'What Our Patrons Say'}</h3>
                          <p style={{ fontSize: '11px', color: '#94A3B8', margin: '0 0 16px' }}>{sec.settings.subtitle || 'Over 50,000+ satisfied clients worldwide'}</p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                            {['Navreet K. (London)', 'Simran S. (Vancouver)', 'Aman B. (Delhi)'].map((name) => (
                              <div key={name} style={{ padding: '14px', borderRadius: radius, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'left' }}>
                                <div style={{ color: accent, fontSize: '12px', marginBottom: '4px' }}>★★★★★</div>
                                <div style={{ fontSize: '11px', color: '#CBD5E1', marginBottom: '8px' }}>&ldquo;Wore them for 10 hours at my sister&rsquo;s wedding. Absolutely zero shoe bites!&rdquo;</div>
                                <div style={{ fontSize: '10px', fontWeight: 800, color: '#FFF' }}>{name}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 13. Trust Badges Strip */}
                      {sec.type === 'trust-badges' && (
                        <div style={{ padding: '20px 24px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', textAlign: 'center' }}>
                            <div><span style={{ fontSize: '11px', fontWeight: 800, color: accent }}>✓ 100% Bite-Free</span><div style={{ fontSize: '9px', color: '#64748B' }}>Memory foam soles</div></div>
                            <div><span style={{ fontSize: '11px', fontWeight: 800, color: accent }}>✓ 24K Gold Dabka</span><div style={{ fontSize: '9px', color: '#64748B' }}>Pure bullion wires</div></div>
                            <div><span style={{ fontSize: '11px', fontWeight: 800, color: '#60A5FA' }}>✓ Worldwide Insured</span><div style={{ fontSize: '9px', color: '#64748B' }}>Express 3-5 day air</div></div>
                            <div><span style={{ fontSize: '11px', fontWeight: 800, color: '#C084FC' }}>✓ Bespoke Fit</span><div style={{ fontSize: '9px', color: '#64748B' }}>Custom bridal sizing</div></div>
                          </div>
                        </div>
                      )}

                      {/* 14. Newsletter Signup */}
                      {sec.type === 'newsletter' && (
                        <div style={{ padding: vPadding, background: `linear-gradient(135deg, ${bg}, #090B14)`, textAlign: 'center' }}>
                          <h3 style={{ fontSize: '20px', fontWeight: 900, margin: '0 0 6px', fontFamily, color: textCol }}>{sec.settings.title || 'Join The Royal Inner Circle'}</h3>
                          <p style={{ fontSize: '12px', color: '#94A3B8', maxWidth: '440px', margin: '0 auto 16px' }}>{sec.settings.description || 'Subscribe to receive private previews and 15% off your next order.'}</p>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', maxWidth: '380px', margin: '0 auto' }}>
                            <input type="text" placeholder="Enter your email address..." style={{ flex: 1, padding: '8px 12px', borderRadius: radius, background: '#000', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', fontSize: '11px' }} />
                            <button style={{ padding: '8px 16px', borderRadius: radius, background: accent, color: '#000', fontWeight: 800, fontSize: '11px', border: 'none' }}>{sec.settings.buttonText || 'Subscribe'}</button>
                          </div>
                        </div>
                      )}

                      {/* 15. FAQ Accordion */}
                      {sec.type === 'faq' && (
                        <div style={{ padding: vPadding }}>
                          <h3 style={{ fontSize: '18px', fontWeight: 800, textAlign: 'center', margin: '0 0 16px', fontFamily, color: textCol }}>{sec.settings.title || 'Frequently Asked Questions'}</h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '600px', margin: '0 auto' }}>
                            {['How does the Bite-Free guarantee work?', 'What is the international delivery timeline to US/UK?', 'Can I request bespoke wedding matching colors?'].map((q) => (
                              <div key={q} style={{ padding: '12px 16px', borderRadius: radius, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700 }}>{q}</span>
                                <span style={{ color: accent }}>+</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 16. Footer */}
                      {sec.type === 'footer' && (
                        <div style={{ padding: '32px 24px', background: '#050507', borderTop: `1px solid rgba(255,255,255,0.08)`, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                          <span style={{ fontSize: '14px', fontWeight: 900, color: accent }}>👑 {sec.settings.copyright || 'AURA LUXURY ATELIER'}</span>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>100% Pure Handcrafted Zardozi • Worldwide Express Shipping</span>
                        </div>
                      )}

                      {/* ─── Specialized Theme Kit Components (Reference Images 1-5) ─── */}
                      {sec.type === 'oddaworld-gadgets-hero' && (
                        <OddaWorldGadgetsHeroSection section={sec} isSelected={isSelected} />
                      )}
                      {sec.type === 'oddaworld-categories' && (
                        <OddaWorldCategoriesSection section={sec} isSelected={isSelected} />
                      )}
                      {sec.type === 'oddaworld-feature-spotlight' && (
                        <OddaWorldFeatureSpotlightSection section={sec} isSelected={isSelected} />
                      )}
                      {sec.type === 'sneakconnect-editorial-hero' && (
                        <SneakConnectEditorialHeroSection section={sec} isSelected={isSelected} />
                      )}
                      {sec.type === 'sneakconnect-popular-models' && (
                        <SneakConnectPopularModelsSection section={sec} isSelected={isSelected} />
                      )}
                      {sec.type === 'sneakconnect-feature-grid' && (
                        <SneakConnectFeatureGridSection section={sec} isSelected={isSelected} />
                      )}
                      {sec.type === 'hyperflux-showcase' && (
                        <HyperFluxShowcaseSection section={sec} isSelected={isSelected} />
                      )}
                      {sec.type === 'pegasus-split-banner' && (
                        <PegasusSplitBannerSection section={sec} isSelected={isSelected} />
                      )}
                      {sec.type === 'aura-sand-carousel' && (
                        <AuraSandCarouselSection section={sec} isSelected={isSelected} />
                      )}
                      {sec.type === 'luxe-card-showcase' && (
                        <LuxeCardShowcaseSection section={sec} isSelected={isSelected} />
                      )}
                      {sec.type === 'neumorphic-gold-dashboard' && (
                        <NeumorphicGoldDashboardSection section={sec} isSelected={isSelected} />
                      )}

                      {/* Generic Fallback for other registered components */}
                      {!['announcement-bar', 'header', 'hero', 'video-hero', 'promo-ribbon', 'banner', 'product-grid', 'product-carousel', 'category-grid', 'accordion-features', 'brand-story-timeline', 'testimonials', 'trust-badges', 'newsletter', 'faq', 'footer', 'oddaworld-gadgets-hero', 'oddaworld-categories', 'oddaworld-feature-spotlight', 'sneakconnect-editorial-hero', 'sneakconnect-popular-models', 'sneakconnect-feature-grid', 'hyperflux-showcase', 'pegasus-split-banner', 'aura-sand-carousel', 'luxe-card-showcase', 'neumorphic-gold-dashboard'].includes(sec.type) && (
                        <div style={{ padding: vPadding, textAlign: 'center', background: bg, borderTop: `1px solid rgba(255,255,255,0.08)` }}>
                          <span style={{ fontSize: '11px', color: accent, fontWeight: 800, textTransform: 'uppercase' }}>
                            {sec.name || sec.type}
                          </span>
                          <h4 style={{ fontSize: '18px', fontWeight: 800, margin: '6px 0', fontFamily, color: textCol }}>
                            {sec.settings.title || sec.settings.heading || `${sec.name || sec.type} Active`}
                          </h4>
                          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                            {sec.settings.subtitle || sec.settings.description || 'Configured and fully interconnected.'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CanvasSectionWrapper>

                {/* Drop Zone between sections */}
                <DropZoneIndicator
                  index={idx + 1}
                  onQuickInsert={(type) => onQuickInsertSection(type, idx + 1)}
                />
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
}
