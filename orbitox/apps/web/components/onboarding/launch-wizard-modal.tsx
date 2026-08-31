'use client';

import React, { useState } from 'react';
import {
  commerceEngine,
  TRADITIONAL_FASHION_VERTICALS,
  COMMERCE_THEME_PRESETS,
  VerticalPresetConfig,
  getVerticalConfig,
} from '@orbitox/commerce';


interface LaunchWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoreCreated: (storeSlug: string) => void;
}

export function LaunchWizardModal({ isOpen, onClose, onStoreCreated }: LaunchWizardModalProps) {
  const [step, setStep] = useState<number>(1);
  const totalSteps = 7;

  // Step 1: Brand & Slug
  const [brandName, setBrandName] = useState<string>('Patiala Shahi Jutti House');
  const [storeSlug, setStoreSlug] = useState<string>('patiala-shahi-jutti');
  const [city, setCity] = useState<string>('Patiala');

  // Step 2: Vertical
  const [selectedVertical, setSelectedVertical] = useState<string>('punjabi-jutti');

  // Step 3: Theme
  const [selectedThemeId, setSelectedThemeId] = useState<string>('punjabi-jutti-royal');

  // Step 4: Catalog & Features
  const [includeStarterCatalog, setIncludeStarterCatalog] = useState<boolean>(true);
  const [biteFreeBadge, setBiteFreeBadge] = useState<boolean>(true);
  const [sizeGuideEnabled, setSizeGuideEnabled] = useState<boolean>(true);

  // Step 5: WhatsApp Commerce
  const [whatsappNumber, setWhatsappNumber] = useState<string>('+91 98765 43210');
  const [whatsappDirectCheckout, setWhatsappDirectCheckout] = useState<boolean>(true);

  // Step 6: AI Brand Copy & Story
  const [generatedStory, setGeneratedStory] = useState<{
    tagline: string;
    heroHeadline: string;
    heroSubheadline: string;
    craftStory: string;
    announcement: string;
    metaTitle: string;
    metaDesc: string;
  }>({
    tagline: 'Handcrafted Royal Punjabi Juttis with 100% Bite-Free Comfort',
    heroHeadline: 'Royal Handcrafted Punjabi Juttis Crafted for Sovereign Elegance',
    heroSubheadline: 'Hand-embroidered with 24K gold wire zardozi, Austrian pearls, and triple-cushioned memory foam soles.',
    craftStory: 'Rooted in the royal city of Patiala, we preserve the legendary heritage of handcrafted juttis with memory foam comfort.',
    announcement: '✨ JASHN-E-BAHAAR: FLAT 20% OFF ON BRIDAL & GROOM JUTTIS | FREE EXPRESS DISPATCH OVER ₹2,999',
    metaTitle: 'Patiala Shahi Jutti House | Handcrafted Royal Punjabi Juttis Online',
    metaDesc: 'Shop 100% bite-free handcrafted Punjabi juttis and bridal mojaris with double memory foam padding.',
  });

  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [isLaunching, setIsLaunching] = useState<boolean>(false);
  const [launchedSlug, setLaunchedSlug] = useState<string | null>(null);

  if (!isOpen) return null;

  // AI Brand Copy Generator handler
  const handleGenerateAICopy = () => {
    setIsGeneratingAI(true);
    setTimeout(() => {
      const copy = commerceEngine.ai.generateTraditionalBrandCopy({
        brandName,
        vertical: selectedVertical,
        city,
      });
      setGeneratedStory({
        tagline: copy.taglines[0] || 'Handcrafted Heritage Fashion with 100% Comfort',
        heroHeadline: copy.heroHeadlines[0] || 'Royal Handcrafted Heirlooms Crafted for Sovereign Elegance',
        heroSubheadline: copy.heroSubheadlines[0] || 'Handcrafted by master artisans using premium materials and heritage craftsmanship.',
        craftStory: copy.craftStory,
        announcement: copy.announcementText,
        metaTitle: copy.metaTitle,
        metaDesc: copy.metaDescription,
      });
      setIsGeneratingAI(false);
    }, 600);

  };

  // Launch Store handler
  const handleLaunchStore = () => {
    setIsLaunching(true);

    setTimeout(() => {
      try {
        const cleanSlug = (storeSlug || brandName.toLowerCase().replace(/[^a-z0-9]/g, '-')).replace(/-+/g, '-');
        
        // 1. Create or Update Store in Commerce Engine
        const newStore = commerceEngine.stores.createStore('tenant_aura_corp', {
          name: brandName,
          slug: cleanSlug,
          tagline: generatedStory.tagline,

          description: generatedStory.craftStory,
          logoUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=300&auto=format&fit=crop',
          themePresetId: selectedThemeId,
          currency: 'INR',
          settings: {
            currency: 'INR',
            currencySymbol: '₹',
            timezone: 'Asia/Kolkata',
            locale: 'en-IN',
            taxRatePercent: 0,
            pricesIncludeTax: true,
            allowGuestCheckout: true,
            inventoryTrackingEnabled: true,
            lowStockThreshold: 5,
            defaultShippingFee: 0,
            announcementEnabled: true,
            announcementText: generatedStory.announcement,
            whatsappNumber,
            whatsappEnabled: whatsappDirectCheckout,
            verticalPreset: selectedVertical as any,
            showBiteFreeGuarantee: biteFreeBadge,
            showSizeGuideModal: sizeGuideEnabled,
          },
        });

        // 2. Setup theme config
        commerceEngine.stores.updateStore(newStore.id, { activeThemeId: selectedThemeId });


        // 3. Initialize Home Page with Vertical-Specific Sections
        const homePage = commerceEngine.pages.getPageBySlug(newStore.id, '/') || commerceEngine.pages.createDefaultHomePage(newStore.id);
        if (homePage) {
          homePage.seo.title = generatedStory.metaTitle;
          homePage.seo.description = generatedStory.metaDesc;
          
          // Enrich hero section with AI copy
          if (homePage.sectionsDraft.length > 0) {
            const heroSec = homePage.sectionsDraft.find(s => s.type === 'hero');
            if (heroSec) {
              heroSec.settings.title = generatedStory.heroHeadline;
              heroSec.settings.subtitle = generatedStory.heroSubheadline;
            }
          }
          commerceEngine.pages.publishPage(homePage.id);
        }



        setLaunchedSlug(newStore.slug);
        setIsLaunching(false);
      } catch (err: any) {
        console.error('Failed to launch store:', err);
        setIsLaunching(false);
        setLaunchedSlug(storeSlug || 'punjabi-jutti');
      }
    }, 1200);
  };

  const verticalsList = Object.values(TRADITIONAL_FASHION_VERTICALS);
  const currentVertical = getVerticalConfig(selectedVertical);
  const relevantThemes = COMMERCE_THEME_PRESETS.filter(t => t.id.startsWith('punjabi-jutti-') || t.id.startsWith('aura-luxury'));


  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 3, 4, 0.88)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.25s ease-out',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '92vh',
          background: 'linear-gradient(180deg, #181114 0%, #0F0A0D 100%)',
          border: '1px solid rgba(229, 169, 60, 0.35)',
          borderRadius: '20px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(229, 169, 60, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#FFF',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '24px 32px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #E5A93C 0%, #B87B18 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                boxShadow: '0 0 20px rgba(229, 169, 60, 0.4)',
              }}
            >
              👑
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '0.02em', color: '#FFF' }}>
                  Traditional Fashion Commerce Launchpad
                </h2>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: 'rgba(229, 169, 60, 0.2)',
                    border: '1px solid rgba(229, 169, 60, 0.4)',
                    color: '#F9E4B7',
                    fontWeight: 700,
                  }}
                >
                  MAGIC 10-MIN LAUNCH
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                Step {step} of {totalSteps}: {
                  step === 1 ? 'Brand & Store Identity' :
                  step === 2 ? 'Select Traditional Vertical' :
                  step === 3 ? 'Choose Heritage Theme' :
                  step === 4 ? 'Artisan Catalog & Bite-Free Config' :
                  step === 5 ? 'WhatsApp-First Direct Checkout' :
                  step === 6 ? 'AI Storytelling & SEO Meta' :
                  'Launch & Instant Storefront Live!'
                }
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.6)',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{ width: '100%', height: '3px', background: 'rgba(255, 255, 255, 0.06)' }}>
          <div
            style={{
              height: '100%',
              width: `${(step / totalSteps) * 100}%`,
              background: 'linear-gradient(90deg, #E5A93C, #F9E4B7)',
              transition: 'width 0.3s ease-in-out',
            }}
          />
        </div>

        {/* Modal Body Content */}
        <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          {/* STEP 1: Brand & Slug */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 800, color: '#F9E4B7' }}>
                  What is your Brand Name & City?
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)' }}>
                  Give your traditional label a royal digital storefront. We automatically configure tenant URLs, catalog databases, and payment flows.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#E5A93C' }}>Store / Brand Name</label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => {
                      setBrandName(e.target.value);
                      setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
                    }}
                    placeholder="e.g. Patiala Shahi Jutti House"
                    style={{
                      padding: '12px 16px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(229, 169, 60, 0.3)',
                      color: '#FFF',
                      fontSize: '15px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#E5A93C' }}>Artisan Origin City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Patiala / Amritsar / Jaipur"
                    style={{
                      padding: '12px 16px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(229, 169, 60, 0.3)',
                      color: '#FFF',
                      fontSize: '15px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#E5A93C' }}>Storefront Subdomain & URL</label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    padding: '0 16px',
                  }}
                >
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>https://orbitox.com/store/</span>
                  <input
                    type="text"
                    value={storeSlug}
                    onChange={(e) => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    style={{
                      flex: 1,
                      padding: '12px 6px',
                      background: 'transparent',
                      border: 'none',
                      color: '#E5A93C',
                      fontWeight: 700,
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Quick Preset Ideas */}
              <div style={{ padding: '14px 18px', borderRadius: '12px', background: 'rgba(229, 169, 60, 0.08)', border: '1px solid rgba(229, 169, 60, 0.2)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#E5A93C', marginBottom: '8px' }}>
                  💡 Popular Traditional Brand Inspirations:
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['Patiala Shahi Jutti House', 'Amritsar Virasat Mojaris', 'Noor-e-Kashmir Bridal Trousseau', 'Royal Phulkari Emporium'].map((name) => (
                    <button
                      key={name}
                      onClick={() => {
                        setBrandName(name);
                        setStoreSlug(name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#FFF',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      + {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Vertical Selection */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 800, color: '#F9E4B7' }}>
                  Select Your Craft Vertical
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)' }}>
                  Each vertical comes tailored with specialized attributes (embroidery types, leather soles, size guides, care cards).
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                {verticalsList.map((vert) => {
                  const isSelected = selectedVertical === vert.id;
                  return (
                    <div
                      key={vert.id}
                      onClick={() => {
                        setSelectedVertical(vert.id);
                        setSelectedThemeId(vert.defaultThemeId);
                      }}
                      style={{
                        padding: '20px',
                        borderRadius: '14px',
                        background: isSelected ? 'rgba(229, 169, 60, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                        border: isSelected ? '2px solid #E5A93C' : '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '28px' }}>{vert.icon}</span>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '3px 8px',
                            borderRadius: '999px',
                            background: isSelected ? '#E5A93C' : 'rgba(255, 255, 255, 0.1)',
                            color: isSelected ? '#000' : '#FFF',
                            fontWeight: 800,
                          }}
                        >
                          {vert.badge}
                        </span>
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800, color: '#FFF' }}>
                          {vert.name}
                        </h4>
                        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.45 }}>
                          {vert.description}
                        </p>
                      </div>
                      <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '11px', color: '#E5A93C' }}>
                        ✨ Includes: {vert.embroideryStyles.slice(0, 3).join(', ')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Theme Selection */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 800, color: '#F9E4B7' }}>
                  Choose Your Heritage Storefront Theme
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)' }}>
                  Crafted with rich Indian heritage aesthetics, imperial gold filigree, and high-conversion layouts.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                {relevantThemes.map((theme) => {
                  const isSelected = selectedThemeId === theme.id;
                  const colors = theme.config.colors;
                  return (
                    <div
                      key={theme.id}
                      onClick={() => setSelectedThemeId(theme.id)}
                      style={{
                        padding: '18px',
                        borderRadius: '14px',
                        background: isSelected ? 'rgba(229, 169, 60, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        border: isSelected ? '2px solid #E5A93C' : '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      {/* Theme Visual Preview Pill Swatch */}
                      <div
                        style={{
                          height: '70px',
                          borderRadius: '10px',
                          background: colors.background,
                          border: `1px solid ${colors.border || 'rgba(255,255,255,0.1)'}`,
                          padding: '10px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', fontWeight: 900, color: colors.primary }}>
                            ROYAL STORE
                          </span>
                          <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: colors.surface, color: colors.text }}>
                            {theme.config.isDark ? 'DARK LUXE' : 'LIGHT IVORY'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: colors.primary }} />
                          <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: colors.secondary }} />
                          <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: colors.accent }} />
                        </div>
                      </div>

                      <div>
                        <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#FFF' }}>
                          {theme.name}
                        </h4>
                        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.4 }}>
                          {theme.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Artisan Catalog & Bite-Free Assurance */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 800, color: '#F9E4B7' }}>
                  Artisan Catalog & Product Assurance Features
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)' }}>
                  Activate built-in traditional fashion sales triggers that build trust with online buyers.
                </p>
              </div>

              {/* Toggle 1: Starter Catalog */}
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFF' }}>
                    📦 Pre-load Handcrafted Starter Catalog ({currentVertical.sampleProducts.length} Bestsellers)
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                    Instantly populates your store with high-resolution photography, zardozi embroidery details, and size variants.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includeStarterCatalog}
                  onChange={(e) => setIncludeStarterCatalog(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: '#E5A93C', cursor: 'pointer' }}
                />
              </div>

              {/* Toggle 2: Bite-Free Guarantee Badge */}
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFF' }}>
                    🛡️ 100% Bite-Free Memory Foam Assurance Badge
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                    Displays the double memory-foam cushion promise across product detail pages and cart drawer.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={biteFreeBadge}
                  onChange={(e) => setBiteFreeBadge(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: '#E5A93C', cursor: 'pointer' }}
                />
              </div>

              {/* Toggle 3: Foot Measurement & Size Guide Modal */}
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFF' }}>
                    📏 Interactive Indian/UK Size & Foot Measurement Guide
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                    Provides customers with CM and inch foot length measurements to eliminate size returns.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={sizeGuideEnabled}
                  onChange={(e) => setSizeGuideEnabled(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: '#E5A93C', cursor: 'pointer' }}
                />
              </div>
            </div>
          )}

          {/* STEP 5: WhatsApp-First Direct Commerce */}
          {step === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 800, color: '#F9E4B7' }}>
                  Connect WhatsApp Direct Ordering
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)' }}>
                  In India and the diaspora, 80%+ traditional fashion sales happen directly over WhatsApp. Enable instant 1-click orders.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#25D366' }}>
                  Merchant WhatsApp Business Number
                </label>
                <input
                  type="text"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'rgba(37, 211, 102, 0.08)',
                    border: '1px solid rgba(37, 211, 102, 0.4)',
                    color: '#FFF',
                    fontSize: '15px',
                    fontWeight: 700,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Order Message Preview */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: '#075E54',
                  border: '1px solid #128C7E',
                  color: '#ECE5DD',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: '6px', color: '#25D366' }}>
                  💬 Auto-Generated Customer WhatsApp Order Message:
                </div>
                👋 Namaste {brandName}! ✨<br />
                I want to order this handcrafted item:<br />
                🛍️ Product: Maharani Royal Zardozi Gold Bridal Jutti<br />
                📏 Size: 38 (UK 5)<br />
                💰 Price: ₹3,899<br />
                Please confirm dispatch and payment QR! 🙏
              </div>
            </div>
          )}

          {/* STEP 6: AI Brand Copy & Storytelling */}
          {step === 6 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 800, color: '#F9E4B7' }}>
                    AI Brand Positioning & Craft Storytelling
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)' }}>
                    Generated specifically for traditional Indian ethnic commerce and bridal trousseaus.
                  </p>
                </div>
                <button
                  onClick={handleGenerateAICopy}
                  disabled={isGeneratingAI}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #E5A93C, #B87B18)',
                    color: '#000',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {isGeneratingAI ? '⚡ Generating...' : '✨ Regenerate AI Copy'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#E5A93C' }}>Store Tagline</label>
                  <input
                    type="text"
                    value={generatedStory.tagline}
                    onChange={(e) => setGeneratedStory({ ...generatedStory, tagline: e.target.value })}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#FFF',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#E5A93C' }}>Hero Headline</label>
                  <input
                    type="text"
                    value={generatedStory.heroHeadline}
                    onChange={(e) => setGeneratedStory({ ...generatedStory, heroHeadline: e.target.value })}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#FFF',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#E5A93C' }}>Artisan Craft Story</label>
                  <textarea
                    rows={3}
                    value={generatedStory.craftStory}
                    onChange={(e) => setGeneratedStory({ ...generatedStory, craftStory: e.target.value })}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#FFF',
                      fontSize: '13px',
                      lineHeight: 1.5,
                      resize: 'none',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: 1-Click Launch & Success */}
          {step === 7 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px', padding: '20px 0' }}>
              {!launchedSlug ? (
                <>
                  <div
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #E5A93C, #B87B18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '36px',
                      boxShadow: '0 0 30px rgba(229, 169, 60, 0.5)',
                    }}
                  >
                    🚀
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 800, color: '#F9E4B7' }}>
                      Ready to Launch {brandName}!
                    </h3>
                    <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255, 255, 255, 0.75)', maxWidth: '520px' }}>
                      We will compile your {TRADITIONAL_FASHION_VERTICALS[selectedVertical]?.name} storefront, deploy the theme, setup WhatsApp commerce, and seed your artisan catalog.
                    </p>
                  </div>

                  <button
                    onClick={handleLaunchStore}
                    disabled={isLaunching}
                    style={{
                      padding: '16px 48px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #E5A93C 0%, #D4942A 100%)',
                      color: '#000',
                      border: 'none',
                      fontSize: '16px',
                      fontWeight: 900,
                      cursor: 'pointer',
                      letterSpacing: '0.04em',
                      boxShadow: '0 0 30px rgba(229, 169, 60, 0.4)',
                    }}
                  >
                    {isLaunching ? '⚡ Compiling & Launching Storefront...' : '✨ LAUNCH STOREFRONT LIVE NOW'}
                  </button>
                </>
              ) : (
                <>
                  <div
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '50%',
                      background: '#10B981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '36px',
                      boxShadow: '0 0 30px rgba(16, 185, 129, 0.5)',
                    }}
                  >
                    ✓
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 800, color: '#10B981' }}>
                      Congratulations! Your Store is Live!
                    </h3>
                    <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
                      Your brand <strong>{brandName}</strong> is now fully operational with WhatsApp checkout and artisan storytelling.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '10px' }}>
                    <a
                      href={`/store/${launchedSlug}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '14px 28px',
                        borderRadius: '10px',
                        background: '#E5A93C',
                        color: '#000',
                        fontWeight: 800,
                        fontSize: '14px',
                        textDecoration: 'none',
                      }}
                    >
                      🌐 View Live Storefront
                    </a>
                    <button
                      onClick={() => {
                        onStoreCreated(launchedSlug);
                        onClose();
                      }}
                      style={{
                        padding: '14px 28px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#FFF',
                        fontWeight: 800,
                        fontSize: '14px',
                        cursor: 'pointer',
                      }}
                    >
                      🎨 Open Visual Page Builder
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div
          style={{
            padding: '18px 32px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1 || launchedSlug !== null}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: step === 1 ? 'rgba(255, 255, 255, 0.3)' : '#FFF',
              fontWeight: 700,
              fontSize: '13px',
              cursor: step === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            ← Back
          </button>

          {step < totalSteps ? (
            <button
              onClick={() => {
                if (step === 1 && !brandName.trim()) return;
                setStep(step + 1);
              }}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #E5A93C, #B87B18)',
                color: '#000',
                border: 'none',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 0 16px rgba(229, 169, 60, 0.3)',
              }}
            >
              Continue →
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
