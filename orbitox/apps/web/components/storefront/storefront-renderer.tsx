'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { EnrichedPageSection, ThemeConfig, useCommerceCart, useCommerceCurrency, useCommerceWishlist, Product, commerceEngine } from '@orbitox/commerce';
import { StorefrontCartDrawer } from './storefront-cart-drawer';
import { StorefrontQuickViewModal } from './storefront-quick-view-modal';
import { StorefrontWishlistDrawer } from './storefront-wishlist-drawer';
import { StorefrontRecentlyViewed } from './storefront-recently-viewed';
import { CustomButtonConfig } from '../commerce/custom-buttons-manager';
import { CustomComponentRenderer } from './custom-component-renderer';
import { OddaWorldGadgetsHeroSection, OddaWorldCategoriesSection } from './theme-kit-sections/oddaworld-gadgets-hero';
import { OddaWorldFeatureSpotlightSection } from './theme-kit-sections/oddaworld-feature-spotlight';
import { SneakConnectEditorialHeroSection, SneakConnectPopularModelsSection, SneakConnectFeatureGridSection } from './theme-kit-sections/sneakconnect-editorial-hero';
import { HyperFluxShowcaseSection } from './theme-kit-sections/hyperflux-showcase';
import { PegasusSplitBannerSection } from './theme-kit-sections/pegasus-split-banner';
import { AuraSandCarouselSection } from './theme-kit-sections/aura-sand-carousel';
import { LuxeCardShowcaseSection } from './theme-kit-sections/luxe-card-showcase';
import { NeumorphicGoldDashboardSection } from './theme-kit-sections/neumorphic-gold-dashboard';
import { UniversalProductCard } from './universal-product-card';
import {
  IconSearch,
  IconHeart,
  IconShoppingBag,
  IconCrown,
  IconSparkles,
  IconZap,
  IconStar,
  IconShieldCheck,
  IconMinus,
  IconPlus,
  IconChevronDown,
  IconChevronRight,
  IconTruck,
  IconRotateCcw,
  IconCheck,
  IconArrowRight,
  IconArrowLeft,
} from './storefront-icons';


export interface StorefrontRendererProps {
  storeSlug: string;
  storeId: string;
  storeName: string;
  theme: ThemeConfig;
  sections: EnrichedPageSection[];
}

export function StorefrontRenderer({ storeSlug, storeId, storeName, theme, sections }: StorefrontRendererProps) {
  const [cartDrawerOpen, setCartDrawerOpen] = useState<boolean>(false);
  const [wishlistDrawerOpen, setWishlistDrawerOpen] = useState<boolean>(false);
  const [searchModalOpen, setSearchModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  const { cart, addItem } = useCommerceCart(storeId);
  const baseCurrency = storeSlug === 'punjabi-jutti' ? 'INR' : 'USD';
  const { currentCurrency, setCurrentCurrency, supportedCurrencies, formatPrice } = useCommerceCurrency(baseCurrency, storeSlug);
  const { count: wishlistCount, isInWishlist, toggleWishlist } = useCommerceWishlist(storeSlug);
  const [newsletterSubscribed, setNewsletterSubscribed] = useState<boolean>(false);
  const [quickAddedId, setQuickAddedId] = useState<string | null>(null);

  // Interactive component states
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [activeFeatureIdx, setActiveFeatureIdx] = useState<number>(0);
  const [contactSubmitted, setContactSubmitted] = useState<boolean>(false);

  // Runtime Logic Evaluation Context
  const runtimeContext = {
    cartSubtotal: cart?.totals.subtotal || 0,
    cartItemCount: cart?.totals.itemsCount || 0,
    currency: currentCurrency,
    deviceType: (typeof window !== 'undefined' && window.innerWidth <= 768 ? 'mobile' : 'desktop') as any,
  };

  // Filter sections by dynamic visibility rules or visual n8n flow graph
  const visibleSections = sections.filter((sec) => {
    if (!sec.enabled) return false;
    if (sec.flowGraph && sec.flowGraph.enabled) {
      const flowRes = commerceEngine.flows.executeFlow(sec.flowGraph, runtimeContext);
      return flowRes.isVisible;
    }
    return commerceEngine.logic.evaluateSectionVisibility(sec.logic, runtimeContext);
  });

  // Extract all products from visible sections for live search
  const allProducts: Product[] = visibleSections.flatMap((sec) => sec.enrichedData?.products || []);
  const searchedProducts = searchQuery.trim()
    ? allProducts.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.categoryName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleQuickAdd = (product: Product, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const variantId = product.variants[0]?.id;
    addItem({ productId: product.id, variantId, quantity: 1 });
    setQuickAddedId(product.id);
    setCartDrawerOpen(true);
    setTimeout(() => setQuickAddedId(null), 2000);
  };

  const renderCustomActionButtons = (
    customButtons?: CustomButtonConfig[],
    defaultPrimaryText?: string,
    defaultPrimaryLink?: string,
    defaultSecondaryText?: string,
    defaultSecondaryLink?: string
  ) => {
    if (customButtons && customButtons.length > 0) {
      return (
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          {customButtons.map((btn) => {
            const handleClick = (e: React.MouseEvent) => {
              if (btn.action === 'cart') {
                e.preventDefault();
                setCartDrawerOpen(true);
              } else if (btn.action === 'wishlist') {
                e.preventDefault();
                setWishlistDrawerOpen(true);
              } else if (btn.action === 'whatsapp') {
                e.preventDefault();
                const phone = btn.link?.replace(/[^0-9]/g, '') || '919876543210';
                window.open(`https://wa.me/${phone}?text=Hello%20I%20would%20like%20to%20inquire%20about%20your%20collection`, '_blank');
              }
            };

            const bg =
              btn.variant === 'solid-crimson'
                ? '#7A1113'
                : btn.variant === 'outline-gold'
                ? 'transparent'
                : btn.variant === 'glass-frost'
                ? 'rgba(255,255,255,0.1)'
                : btn.variant === 'whatsapp-green'
                ? '#25D366'
                : btn.variant === 'gradient-sunset'
                ? 'linear-gradient(135deg, #D4AF37, #E5A93C, #7A1113)'
                : 'var(--orb-primary, #D4AF37)';

            const color =
              btn.variant === 'outline-gold'
                ? '#D4AF37'
                : btn.variant === 'glass-frost' || btn.variant === 'solid-crimson' || btn.variant === 'whatsapp-green'
                ? '#FFF'
                : '#000';

            const border =
              btn.variant === 'outline-gold'
                ? '1px solid #D4AF37'
                : btn.variant === 'glass-frost'
                ? '1px solid rgba(255,255,255,0.3)'
                : 'none';

            const radius =
              btn.radius === 'sharp' ? '0px' : btn.radius === 'subtle' ? '6px' : btn.radius === 'pill' ? '999px' : '8px';

            const padding =
              btn.size === 'sm' ? '8px 16px' : btn.size === 'lg' ? '16px 36px' : '12px 26px';

            return (
              <Link
                key={btn.id}
                href={btn.link || `/store/${storeSlug}/shop`}
                onClick={handleClick}
                target={btn.newTab ? '_blank' : undefined}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding,
                  borderRadius: radius,
                  background: bg,
                  color,
                  border,
                  fontWeight: 800,
                  fontSize: btn.size === 'sm' ? '12px' : btn.size === 'lg' ? '15px' : '13px',
                  textDecoration: 'none',
                  boxShadow: btn.variant === 'solid-gold' || btn.variant === 'gradient-sunset' ? '0 0 24px rgba(229, 169, 60, 0.4)' : undefined,
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}
              >
                {btn.icon && <span>{btn.icon}</span>}
                <span>{btn.label}</span>
              </Link>
            );
          })}
        </div>
      );
    }

    if (!defaultPrimaryText && !defaultSecondaryText) return null;

    return (
      <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
        {defaultPrimaryText && (
          <Link
            href={defaultPrimaryLink || `/store/${storeSlug}/shop`}
            style={{
              display: 'inline-block',
              padding: '14px 32px',
              borderRadius: 'var(--orb-radius-btn, 8px)',
              background: 'var(--orb-primary, #D4AF37)',
              color: '#000000',
              fontWeight: 900,
              fontSize: '14px',
              textDecoration: 'none',
              boxShadow: '0 0 30px rgba(212, 175, 55, 0.4)',
            }}
          >
            {defaultPrimaryText}
          </Link>
        )}
        {defaultSecondaryText && (
          <Link
            href={defaultSecondaryLink || `/store/${storeSlug}/about`}
            style={{
              display: 'inline-block',
              padding: '14px 28px',
              borderRadius: 'var(--orb-radius-btn, 8px)',
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(8px)',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              fontWeight: 700,
              fontSize: '14px',
              textDecoration: 'none',
            }}
          >
            {defaultSecondaryText}
          </Link>
        )}
      </div>
    );
  };

  const themeCssVariables = commerceEngine.themes.compileThemeToCssVariables(theme);

  return (
    <div
      style={{
        ...themeCssVariables as any,
        minHeight: '100vh',
        background: theme.colors.background || 'var(--orb-bg, #0D0D0E)',
        color: theme.colors.text || 'var(--orb-text, #FFFFFF)',
        fontFamily: `'${theme.typography.bodyFont || "Plus Jakarta Sans"}', sans-serif`,
      }}
    >
      {/* Dynamic Sections Loop */}
      {visibleSections.map((sec) => {
        const { type, settings, enrichedData } = sec;
        const resolvedSectionStyle = commerceEngine.themes.resolveSectionStyle(theme, settings);

        switch (type) {
          // ─── 1. Announcement Bar ─────────────────────────────────
          case 'announcement-bar':
            return (
              <div
                key={sec.id}
                style={{
                  padding: '10px 16px',
                  textAlign: 'center',
                  background: settings.backgroundColor || 'var(--orb-primary, #D4AF37)',
                  color: settings.textColor || '#000000',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                }}
              >
                <Link
                  href={settings.link || `/store/${storeSlug}/shop`}
                  style={{ color: 'inherit', textDecoration: 'none' }}
                >
                  {settings.text}
                </Link>
              </div>
            );

          // ─── 2. Header / Navigation ──────────────────────────────
          case 'header':
            return (
              <header
                key={sec.id}
                style={{
                  position: settings.sticky ? 'sticky' : 'relative',
                  top: 0,
                  zIndex: 50,
                  padding: '18px 32px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--orb-surface, #161618)',
                  borderBottom: '1px solid var(--orb-border, rgba(255, 255, 255, 0.1))',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                  <Link
                    href={`/store/${storeSlug}`}
                    style={{
                      fontSize: '22px',
                      fontWeight: 900,
                      letterSpacing: '-0.02em',
                      fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)',
                      color: 'var(--orb-text, #FFFFFF)',
                      textDecoration: 'none',
                    }}
                  >
                    {storeName}
                  </Link>

                  <nav style={{ display: 'flex', gap: '24px' }}>
                    <Link
                      href={`/store/${storeSlug}`}
                      style={{ color: 'inherit', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
                    >
                      Home
                    </Link>
                    <Link
                      href={`/store/${storeSlug}/shop`}
                      style={{ color: 'inherit', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
                    >
                      Shop All
                    </Link>
                  </nav>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {/* Currency Switcher */}
                  <select
                    value={currentCurrency}
                    onChange={(e) => setCurrentCurrency(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFF',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {supportedCurrencies.map((c) => (
                      <option key={c.code} value={c.code} style={{ background: '#1A1A1D', color: '#FFF' }}>
                        {c.code} ({c.symbol})
                      </option>
                    ))}
                  </select>

                  {/* Search Trigger Button */}
                  <button
                    onClick={() => setSearchModalOpen(true)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFF',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <IconSearch size={14} />
                    <span>Search</span>
                  </button>

                  {/* Wishlist Trigger Button */}
                  <button
                    onClick={() => setWishlistDrawerOpen(true)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: wishlistCount > 0 ? '#EF4444' : '#FFF',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <IconHeart size={14} filled={wishlistCount > 0} color={wishlistCount > 0 ? '#EF4444' : '#FFF'} />
                    <span>Wishlist ({wishlistCount})</span>
                  </button>

                  <button
                    onClick={() => setCartDrawerOpen(true)}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 'var(--orb-radius-btn, 8px)',
                      background: 'var(--orb-primary, #D4AF37)',
                      color: '#000000',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '12px',
                      cursor: 'pointer',
                      letterSpacing: '0.03em',
                      boxShadow: '0 0 16px rgba(212, 175, 55, 0.3)',
                    }}
                  >
                    Bag ({cart?.totals.itemsCount || 0})
                  </button>
                </div>
              </header>
            );

          // ─── 3. Hero Banner ──────────────────────────────────────
          case 'hero':
          case 'banner': {
            const rawOpacity =
              typeof settings.overlayOpacity === 'number'
                ? settings.overlayOpacity
                : typeof settings.overlayOpacity === 'string'
                ? parseFloat(settings.overlayOpacity)
                : 40;
            const opacity = Math.max(0, Math.min(100, isNaN(rawOpacity) ? 40 : rawOpacity)) / 100;
            const align = settings.textAlignment || 'center';

            const bgStyle = settings.imageUrl
              ? `linear-gradient(rgba(0, 0, 0, ${opacity}), rgba(0, 0, 0, ${Math.min(1, opacity + 0.15)})), url(${settings.imageUrl}) center/cover no-repeat`
              : 'linear-gradient(135deg, #18181B, #09090B)';

            return (
              <section
                key={sec.id}
                style={{
                  position: 'relative',
                  minHeight: '540px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
                  textAlign: align as any,
                  padding: '80px 48px',
                  background: bgStyle,
                  transition: 'background 0.2s ease',
                }}
              >
                <div
                  style={{
                    maxWidth: '780px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
                    gap: '16px',
                  }}
                >
                  {(settings.badge || settings.tagline) && (
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--orb-primary, #D4AF37)',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                        padding: '4px 12px',
                        borderRadius: '999px',
                        background: 'rgba(212, 175, 55, 0.15)',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                      }}
                    >
                      {settings.badge || settings.tagline}
                    </span>
                  )}
                  <h1
                    style={{
                      fontSize: '48px',
                      fontWeight: 900,
                      fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)',
                      letterSpacing: '-0.02em',
                      margin: 0,
                      lineHeight: 1.15,
                    }}
                  >
                    {settings.title || settings.heading || 'Elegance Redefined'}
                  </h1>
                  {(settings.subtitle || settings.description) && (
                    <p
                      style={{
                        fontSize: '16px',
                        color: 'rgba(255, 255, 255, 0.85)',
                        margin: 0,
                        maxWidth: '620px',
                        lineHeight: 1.6,
                      }}
                    >
                      {settings.subtitle || settings.description}
                    </p>
                  )}

                  {renderCustomActionButtons(
                    settings.customButtons,
                    settings.primaryButtonText || settings.buttonText,
                    settings.primaryButtonLink || settings.buttonLink,
                    settings.secondaryButtonText,
                    settings.secondaryButtonLink
                  )}
                </div>
              </section>
            );
          }

          // ─── 4. Cinematic Video Hero ──────────────────────────────
          case 'video-hero': {
            const rawOpacity = typeof settings.overlayOpacity === 'number' ? settings.overlayOpacity : 50;
            const opacity = Math.max(0, Math.min(90, rawOpacity)) / 100;
            return (
              <section
                key={sec.id}
                style={{
                  position: 'relative',
                  minHeight: '560px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '90px 24px',
                  overflow: 'hidden',
                  background: '#000',
                }}
              >
                {settings.videoUrl && (
                  <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      opacity: 0.65,
                    }}
                    src={settings.videoUrl}
                  />
                )}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(rgba(0,0,0,${opacity}), rgba(0,0,0,${Math.min(1, opacity + 0.25)}))`,
                  }}
                />
                <div
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    maxWidth: '820px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '18px',
                  }}
                >
                  {settings.badge && (
                    <span
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--orb-primary, #D4AF37)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em',
                        padding: '4px 14px',
                        borderRadius: '999px',
                        background: 'rgba(229, 169, 60, 0.15)',
                        border: '1px solid rgba(229, 169, 60, 0.35)',
                      }}
                    >
                      <IconCrown size={14} color="var(--orb-primary, #D4AF37)" />
                      <span>{settings.badge}</span>
                    </span>
                  )}
                  <h1
                    style={{
                      fontSize: '52px',
                      fontWeight: 900,
                      fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)',
                      letterSpacing: '-0.02em',
                      margin: 0,
                      lineHeight: 1.15,
                      textShadow: '0 4px 20px rgba(0,0,0,0.8)',
                    }}
                  >
                    {settings.title}
                  </h1>
                  {settings.subtitle && (
                    <p
                      style={{
                        fontSize: '17px',
                        color: 'rgba(255, 255, 255, 0.9)',
                        margin: 0,
                        maxWidth: '680px',
                        lineHeight: 1.6,
                        textShadow: '0 2px 10px rgba(0,0,0,0.7)',
                      }}
                    >
                      {settings.subtitle}
                    </p>
                  )}
                  {renderCustomActionButtons(
                    settings.customButtons,
                    settings.primaryButtonText,
                    settings.primaryButtonLink,
                    settings.secondaryButtonText,
                    settings.secondaryButtonLink
                  )}
                </div>
              </section>
            );
          }

          // ─── 5. Promo Ribbon (Marquee Ticker) ─────────────────────
          case 'promo-ribbon':
            return (
              <div
                key={sec.id}
                style={{
                  background: settings.backgroundColor || 'var(--orb-primary, #7A1113)',
                  color: settings.textColor || '#FFF',
                  padding: '10px 0',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  fontWeight: 800,
                  fontSize: '12px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    gap: '40px',
                    animation: `marquee ${settings.speed || 20}s linear infinite`,
                  }}
                >
                  <span>{settings.text}</span>
                  <span>{settings.text}</span>
                  <span>{settings.text}</span>
                  <span>{settings.text}</span>
                </div>
              </div>
            );

          // ─── 6. Product Grid ─────────────────────────────────────
          case 'product-grid': {
            const products: Product[] = enrichedData?.products || [];
            return (
              <section
                key={sec.id}
                style={{
                  padding: '72px 24px',
                  maxWidth: 'var(--orb-container-max-width, 1280px)',
                  margin: '0 auto',
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                  {settings.subtitle && (
                    <span style={{ fontSize: '12px', color: 'var(--orb-primary, #D4AF37)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {settings.subtitle}
                    </span>
                  )}
                  <h2
                    style={{
                      fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)',
                      fontSize: '32px',
                      fontWeight: 900,
                      margin: '6px 0 0 0',
                    }}
                  >
                    {settings.title}
                  </h2>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${settings.columns || 3}, 1fr)`,
                    gap: '28px',
                  }}
                >
                  {products.map((p) => {
                    const inWish = isInWishlist(p.id);
                    return (
                      <UniversalProductCard
                        key={p.id}
                        product={p}
                        storeSlug={storeSlug}
                        theme={theme}
                        variant={settings.cardVariant || 'auto'}
                        inWishlist={inWish}
                        onToggleWishlist={toggleWishlist}
                        onQuickAdd={handleQuickAdd}
                        onQuickView={setQuickViewProduct}
                        formatPrice={formatPrice}
                        accentColor={theme.colors?.primary}
                        isQuickAdded={quickAddedId === p.id}
                      />
                    );
                  })}
                </div>
              </section>
            );
          }

          // ─── 7. Product Carousel ──────────────────────────────────
          case 'product-carousel': {
            const carouselProducts: Product[] = enrichedData?.products || [];
            return (
              <section
                key={sec.id}
                style={{
                  padding: '72px 24px',
                  maxWidth: 'var(--orb-container-max-width, 1280px)',
                  margin: '0 auto',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
                  <div>
                    {settings.subtitle && (
                      <span style={{ fontSize: '12px', color: 'var(--orb-primary, #D4AF37)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {settings.subtitle}
                      </span>
                    )}
                    <h2 style={{ fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)', fontSize: '32px', fontWeight: 900, margin: '4px 0 0 0' }}>
                      {settings.title}
                    </h2>
                  </div>
                  <Link href={`/store/${storeSlug}/shop`} style={{ fontSize: '13px', fontWeight: 700, color: 'var(--orb-primary, #D4AF37)', textDecoration: 'none' }}>
                    View All ↗
                  </Link>
                </div>

                <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '16px' }}>
                  {carouselProducts.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        minWidth: '280px',
                        maxWidth: '280px',
                        flexShrink: 0,
                        background: 'var(--orb-surface, #161618)',
                        borderRadius: 'var(--orb-radius-card, 16px)',
                        border: '1px solid var(--orb-border, rgba(255, 255, 255, 0.08))',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <Link href={`/store/${storeSlug}/product/${p.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ height: '240px', background: '#222', position: 'relative' }}>
                          {p.media[0] && <img src={p.media[0].url} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        </div>
                      </Link>
                      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                        <span style={{ fontSize: '10px', color: 'var(--orb-text-muted, #888)', textTransform: 'uppercase', fontWeight: 700 }}>
                          {p.categoryName}
                        </span>
                        <div style={{ fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.title}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '8px' }}>
                          <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--orb-primary, #D4AF37)' }}>
                            {formatPrice(p.price)}
                          </span>
                          <button
                            onClick={(e) => handleQuickAdd(p, e)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              background: 'var(--orb-primary, #D4AF37)',
                              color: '#000',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 800,
                              cursor: 'pointer',
                            }}
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          // ─── 8. Featured Single Product Spotlight ─────────────────
          case 'featured-product': {
            const feat: Product | undefined = enrichedData?.featuredProduct;
            if (!feat) return null;
            return (
              <section
                key={sec.id}
                style={{
                  padding: '80px 24px',
                  maxWidth: 'var(--orb-container-max-width, 1280px)',
                  margin: '0 auto',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.1fr 1fr',
                    gap: '48px',
                    alignItems: 'center',
                    background: 'var(--orb-surface, #161618)',
                    borderRadius: '24px',
                    border: '1px solid var(--orb-border, rgba(255, 255, 255, 0.1))',
                    padding: '40px',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  <div style={{ height: '420px', borderRadius: '16px', overflow: 'hidden', background: '#222' }}>
                    {feat.media[0] && (
                      <img src={feat.media[0].url} alt={feat.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--orb-primary, #D4AF37)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      <IconCrown size={14} color="var(--orb-primary, #D4AF37)" />
                      <span>{settings.badgeText || 'FLAGSHIP MASTERPIECE'}</span>
                    </span>
                    <h2 style={{ fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)', fontSize: '36px', fontWeight: 900, margin: 0 }}>
                      {feat.title}
                    </h2>
                    <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                      {feat.description}
                    </p>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--orb-primary, #D4AF37)' }}>
                      {formatPrice(feat.price)}
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                      <button
                        onClick={(e) => handleQuickAdd(feat, e)}
                        style={{
                          flex: 1,
                          padding: '16px 28px',
                          borderRadius: 'var(--orb-radius-btn, 8px)',
                          background: 'var(--orb-primary, #D4AF37)',
                          color: '#000',
                          fontWeight: 900,
                          fontSize: '14px',
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 0 25px rgba(229, 169, 60, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                        }}
                      >
                        {quickAddedId === feat.id ? (
                          <>
                            <IconCheck size={16} />
                            <span>Added to Bag</span>
                          </>
                        ) : (
                          <>
                            <IconShoppingBag size={16} />
                            <span>Add To Bag • 1-Click</span>
                          </>
                        )}
                      </button>
                      <Link
                        href={`/store/${storeSlug}/product/${feat.slug}`}
                        style={{
                          padding: '16px 24px',
                          borderRadius: 'var(--orb-radius-btn, 8px)',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: '#FFF',
                          fontWeight: 700,
                          fontSize: '14px',
                          textDecoration: 'none',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                        }}
                      >
                        Details ↗
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            );
          }

          // ─── 9. Category Grid ────────────────────────────────────
          case 'category-grid': {
            const cats: any[] = enrichedData?.categories || [];
            return (
              <section
                key={sec.id}
                style={{
                  padding: '72px 24px',
                  maxWidth: 'var(--orb-container-max-width, 1280px)',
                  margin: '0 auto',
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                  <h2 style={{ fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)', fontSize: '32px', fontWeight: 900, margin: 0 }}>
                    {settings.title || 'Shop by Category'}
                  </h2>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${settings.columns || 3}, 1fr)`,
                    gap: '24px',
                  }}
                >
                  {cats.map((c: any) => (
                    <Link
                      key={c.id}
                      href={`/store/${storeSlug}/shop?category=${c.id}`}
                      style={{
                        position: 'relative',
                        height: '240px',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        textDecoration: 'none',
                        color: '#FFF',
                        background: '#1A1A1D',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        padding: '24px',
                      }}
                    >
                      {c.imageUrl && (
                        <img
                          src={c.imageUrl}
                          alt={c.name}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.3s ease',
                          }}
                        />
                      )}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.2) 60%, transparent 100%)',
                        }}
                      />
                      <div style={{ position: 'relative', zIndex: 2 }}>
                        <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0' }}>{c.name}</h3>
                        <span style={{ fontSize: '12px', color: 'var(--orb-primary, #D4AF37)', fontWeight: 700 }}>
                          {c.productCount || 0} Curated Pairs ↗
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          }

          // ─── 10. Collection Grid ─────────────────────────────────
          case 'collection-grid': {
            const cols: any[] = enrichedData?.collections || [];
            return (
              <section
                key={sec.id}
                style={{
                  padding: '72px 24px',
                  maxWidth: 'var(--orb-container-max-width, 1280px)',
                  margin: '0 auto',
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                  <h2 style={{ fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)', fontSize: '32px', fontWeight: 900, margin: 0 }}>
                    {settings.title || 'Curated Collections'}
                  </h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px' }}>
                  {cols.map((col: any) => (
                    <Link
                      key={col.id}
                      href={`/store/${storeSlug}/shop?collection=${col.id}`}
                      style={{
                        position: 'relative',
                        height: '320px',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        textDecoration: 'none',
                        color: '#FFF',
                        padding: '36px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      {col.imageUrl && (
                        <img
                          src={col.imageUrl}
                          alt={col.name}
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)',
                        }}
                      />
                      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--orb-primary, #D4AF37)', fontWeight: 800, textTransform: 'uppercase' }}>
                          COLLECTION
                        </span>
                        <h3 style={{ fontSize: '28px', fontWeight: 900, fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)', margin: 0 }}>
                          {col.name}
                        </h3>
                        <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', margin: 0 }}>
                          {col.description}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          }

          // ─── 11. Editorial Lookbook Mosaic ────────────────────────
          case 'lookbook-mosaic':
            return (
              <section
                key={sec.id}
                style={{
                  padding: '80px 24px',
                  maxWidth: 'var(--orb-container-max-width, 1280px)',
                  margin: '0 auto',
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '44px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--orb-primary, #E5A93C)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Couture Lookbook
                  </span>
                  <h2 style={{ fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)', fontSize: '36px', fontWeight: 900, margin: '6px 0' }}>
                    {settings.title}
                  </h2>
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', maxWidth: '600px', margin: '0 auto' }}>
                    {settings.subtitle}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '28px' }}>
                  <div style={{ position: 'relative', height: '520px', borderRadius: '20px', overflow: 'hidden', background: '#222' }}>
                    {settings.mainImageUrl && (
                      <img src={settings.mainImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                    <div style={{ position: 'absolute', bottom: '24px', left: '24px', right: '24px', padding: '20px', borderRadius: '12px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.9)', fontStyle: 'italic' }}>
                        "{settings.tagline}"
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ position: 'relative', height: '360px', borderRadius: '20px', overflow: 'hidden', background: '#222' }}>
                      {settings.secondaryImageUrl && (
                        <img src={settings.secondaryImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                    </div>
                    <div style={{ padding: '28px', borderRadius: '16px', background: 'var(--orb-surface, #161618)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 800 }}>Explore Full Bridal Edit</div>
                        <div style={{ fontSize: '12px', color: 'var(--orb-text-muted, #888)' }}>40+ handcrafted bridal bespoke designs</div>
                      </div>
                      <Link
                        href={settings.buttonLink || `/store/${storeSlug}/lookbook`}
                        style={{
                          padding: '12px 24px',
                          borderRadius: '8px',
                          background: 'var(--orb-primary, #D4AF37)',
                          color: '#000',
                          fontWeight: 800,
                          fontSize: '13px',
                          textDecoration: 'none',
                        }}
                      >
                        {settings.buttonText || 'View Lookbook'}
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            );

          // ─── 12. Before / After Comparison Slider ─────────────────
          case 'before-after-slider':
            return (
              <section
                key={sec.id}
                style={{
                  padding: '80px 24px',
                  maxWidth: 'var(--orb-container-max-width, 1100px)',
                  margin: '0 auto',
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                  <h2 style={{ fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)', fontSize: '32px', fontWeight: 900, margin: 0 }}>
                    {settings.title}
                  </h2>
                  <p style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '14px', maxWidth: '600px', margin: '8px auto 0 auto' }}>
                    {settings.subtitle}
                  </p>
                </div>

                <div
                  style={{
                    position: 'relative',
                    height: '460px',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.15)',
                    userSelect: 'none',
                  }}
                >
                  {/* After Image (Full Background) */}
                  <img
                    src={settings.afterImage || 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1200&auto=format&fit=crop'}
                    alt="After"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />

                  {/* Before Image (Clipped) */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: `${sliderPos}%`,
                      overflow: 'hidden',
                      borderRight: '2px solid #E5A93C',
                    }}
                  >
                    <img
                      src={settings.beforeImage || 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=1200&auto=format&fit=crop'}
                      alt="Before"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '1100px',
                        height: '460px',
                        objectFit: 'cover',
                      }}
                    />
                  </div>

                  {/* Slider Control Handle */}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderPos}
                    onChange={(e) => setSliderPos(Number(e.target.value))}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'ew-resize',
                      zIndex: 10,
                      margin: 0,
                    }}
                  />

                  {/* Badges */}
                  <div style={{ position: 'absolute', bottom: '20px', left: '20px', padding: '6px 14px', borderRadius: '999px', background: 'rgba(0,0,0,0.7)', color: '#FFF', fontSize: '11px', fontWeight: 800 }}>
                    ◀ {settings.beforeLabel || 'Raw Base'}
                  </div>
                  <div style={{ position: 'absolute', bottom: '20px', right: '20px', padding: '6px 14px', borderRadius: '999px', background: 'rgba(0,0,0,0.7)', color: '#E5A93C', fontSize: '11px', fontWeight: 800 }}>
                    {settings.afterLabel || 'Finished Royal Masterpiece'} ▶
                  </div>
                </div>
              </section>
            );

          // ─── 13. Size Guide & Conversion Matrix ───────────────────
          case 'size-guide-table':
            return (
              <section
                key={sec.id}
                style={{
                  padding: '72px 24px',
                  maxWidth: 'var(--orb-container-max-width, 1100px)',
                  margin: '0 auto',
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                  <h2 style={{ fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)', fontSize: '32px', fontWeight: 900, margin: 0 }}>
                    {settings.title}
                  </h2>
                  <p style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '14px', maxWidth: '600px', margin: '8px auto 0 auto' }}>
                    {settings.subtitle}
                  </p>
                </div>

                <div
                  style={{
                    background: 'var(--orb-surface, #161618)',
                    borderRadius: '16px',
                    border: '1px solid var(--orb-border, rgba(255, 255, 255, 0.1))',
                    padding: '28px',
                    overflowX: 'auto',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.15)', color: 'var(--orb-primary, #E5A93C)' }}>
                        <th style={{ padding: '14px', fontWeight: 800 }}>IND / EU Size</th>
                        <th style={{ padding: '14px', fontWeight: 800 }}>US Women</th>
                        <th style={{ padding: '14px', fontWeight: 800 }}>UK Size</th>
                        <th style={{ padding: '14px', fontWeight: 800 }}>Foot Length (CM)</th>
                        <th style={{ padding: '14px', fontWeight: 800 }}>Foot Length (Inches)</th>
                      </tr>
                    </thead>
                    <tbody style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                      {[
                        { eu: '36', us: '5.5', uk: '3.0', cm: '22.8', in: '9.0' },
                        { eu: '37', us: '6.5', uk: '4.0', cm: '23.5', in: '9.25' },
                        { eu: '38', us: '7.5', uk: '5.0', cm: '24.2', in: '9.5' },
                        { eu: '39', us: '8.5', uk: '6.0', cm: '24.8', in: '9.75' },
                        { eu: '40', us: '9.5', uk: '7.0', cm: '25.5', in: '10.0' },
                        { eu: '41', us: '10.5', uk: '8.0', cm: '26.2', in: '10.3' },
                      ].map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                          <td style={{ padding: '14px', fontWeight: 700, color: '#FFF' }}>{row.eu}</td>
                          <td style={{ padding: '14px' }}>{row.us}</td>
                          <td style={{ padding: '14px' }}>{row.uk}</td>
                          <td style={{ padding: '14px' }}>{row.cm} cm</td>
                          <td style={{ padding: '14px' }}>{row.in}″</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ marginTop: '20px', padding: '14px 18px', borderRadius: '8px', background: 'rgba(229, 169, 60, 0.1)', border: '1px solid rgba(229, 169, 60, 0.25)', fontSize: '12px', color: '#FFF' }}>
                    💡 <strong style={{ color: '#E5A93C' }}>Fit Guarantee:</strong> {settings.fitAdvice || 'True to size. All pairs include our proprietary bite-free double cushioning.'}
                  </div>
                </div>
              </section>
            );

          // ─── 14. Brand Story Heritage Timeline ────────────────────
          case 'brand-story-timeline':
            return (
              <section
                key={sec.id}
                style={{
                  padding: '80px 24px',
                  maxWidth: 'var(--orb-container-max-width, 1100px)',
                  margin: '0 auto',
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--orb-primary, #E5A93C)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Lineage & Legacy
                  </span>
                  <h2 style={{ fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)', fontSize: '36px', fontWeight: 900, margin: '6px 0' }}>
                    {settings.title}
                  </h2>
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', maxWidth: '600px', margin: '0 auto' }}>
                    {settings.subtitle}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '28px', position: 'relative' }}>
                  {[
                    { year: settings.step1Year || '1924', title: settings.step1Title, desc: settings.step1Desc },
                    { year: settings.step2Year || '1988', title: settings.step2Title, desc: settings.step2Desc },
                    { year: settings.step3Year || '2026', title: settings.step3Title, desc: settings.step3Desc },
                  ].map((node, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '28px',
                        borderRadius: '16px',
                        background: 'var(--orb-surface, #161618)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        position: 'relative',
                      }}
                    >
                      <span style={{ fontSize: '32px', fontWeight: 900, color: 'var(--orb-primary, #E5A93C)', fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)' }}>
                        {node.year}
                      </span>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{node.title}</h3>
                      <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.75)', lineHeight: 1.6, margin: 0 }}>
                        {node.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            );

          // ─── 15. Accordion Features & Specs ───────────────────────
          case 'accordion-features':
            return (
              <section
                key={sec.id}
                style={{
                  padding: '80px 24px',
                  maxWidth: 'var(--orb-container-max-width, 1280px)',
                  margin: '0 auto',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <h2 style={{ fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)', fontSize: '36px', fontWeight: 900, margin: '0 0 8px 0' }}>
                        {settings.title}
                      </h2>
                      <p style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '14px', margin: 0 }}>
                        {settings.subtitle}
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {[
                        { title: settings.item1Title, desc: settings.item1Desc },
                        { title: settings.item2Title, desc: settings.item2Desc },
                        { title: settings.item3Title, desc: settings.item3Desc },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => setActiveFeatureIdx(idx)}
                          style={{
                            padding: '18px 20px',
                            borderRadius: '12px',
                            background: activeFeatureIdx === idx ? 'rgba(229, 169, 60, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                            border: activeFeatureIdx === idx ? '1px solid #E5A93C' : '1px solid rgba(255, 255, 255, 0.08)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '15px', fontWeight: 800, color: activeFeatureIdx === idx ? '#E5A93C' : '#FFF' }}>
                              {item.title}
                            </span>
                            <span style={{ fontSize: '14px' }}>{activeFeatureIdx === idx ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}</span>
                          </div>
                          {activeFeatureIdx === idx && (
                            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', margin: '10px 0 0 0', lineHeight: 1.5 }}>
                              {item.desc}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ height: '460px', borderRadius: '20px', overflow: 'hidden', background: '#222', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <img
                      src={settings.sideImageUrl || 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1200&auto=format&fit=crop'}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                </div>
              </section>
            );

          // ─── 16. Customer Testimonials ────────────────────────────
          case 'testimonials':
            return (
              <section
                key={sec.id}
                style={{
                  padding: '80px 24px',
                  maxWidth: 'var(--orb-container-max-width, 1280px)',
                  margin: '0 auto',
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '44px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--orb-primary, #D4AF37)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Social Proof
                  </span>
                  <h2 style={{ fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)', fontSize: '32px', fontWeight: 900, margin: '6px 0' }}>
                    {settings.title || 'What Our Patrons Say'}
                  </h2>
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', margin: 0 }}>
                    {settings.subtitle || 'Over 50,000+ satisfied clients worldwide'}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                  {[
                    { author: 'Mehernaz K.', location: 'London, UK', quote: 'Wore the Zardozi Bridal Juttis for my sangeet and wedding day. Danced for 8 straight hours without a single shoe bite!', product: 'Maharani Royal Zardozi Gold Jutti' },
                    { author: 'Simran S.', location: 'Chandigarh, IN', quote: 'The bullion embroidery and velvet feel are of museum quality. Truly Patiala royalty in a shoe.', product: 'Noor-e-Jahan Emerald Velvet Jutti' },
                    { author: 'Natasha D.', location: 'Toronto, CA', quote: 'Received in Canada within 4 days. Packaged like a royal jewelry chest. Customer support was phenomenal.', product: 'Patiala Heritage Phulkari Jutti' },
                  ].map((t, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '28px',
                        borderRadius: '16px',
                        background: 'var(--orb-surface, #161618)',
                        border: '1px solid var(--orb-border, rgba(255, 255, 255, 0.08))',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                      }}
                    >
                      <div style={{ color: '#E5A93C', fontSize: '16px' }}>★★★★★</div>
                      <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)', fontStyle: 'italic', margin: 0, lineHeight: 1.6 }}>
                        "{t.quote}"
                      </p>
                      <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontSize: '13px', fontWeight: 800 }}>{t.author}</div>
                        <div style={{ fontSize: '11px', color: 'var(--orb-text-muted, #888)' }}>{t.location} • Verified Buyer ✓</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );

          // ─── 17. FAQ Accordion ────────────────────────────────────
          case 'faq':
            return (
              <section
                key={sec.id}
                style={{
                  padding: '72px 24px',
                  maxWidth: '820px',
                  margin: '0 auto',
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                  <h2 style={{ fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)', fontSize: '32px', fontWeight: 900, margin: 0 }}>
                    {settings.title || 'Frequently Asked Questions'}
                  </h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { q: 'Are your Punjabi juttis truly bite-free?', a: 'Yes! Every pair is engineered with double-padded medical-grade memory foam and soft vegetable-tanned leather lining designed to prevent shoe bites completely.' },
                    { q: 'Do you ship internationally?', a: 'Yes, we provide insured express worldwide shipping via DHL Express (3-5 business days to US, UK, Canada, UAE, and Europe).' },
                    { q: 'How do I care for hand-embroidered zardozi juttis?', a: 'Keep your juttis wrapped in the provided muslin dust bag. In case of moisture, air dry in shade. Avoid machine washing or harsh chemical sprays.' },
                    { q: 'What is your exchange and return policy?', a: 'We offer a 30-day hassle-free exchange policy. If the size does not fit perfectly, we exchange it free of charge.' },
                  ].map((faq, idx) => (
                    <div
                      key={idx}
                      style={{
                        borderRadius: '12px',
                        background: 'var(--orb-surface, #161618)',
                        border: '1px solid var(--orb-border, rgba(255, 255, 255, 0.08))',
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                        style={{
                          width: '100%',
                          padding: '18px 24px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: 'none',
                          border: 'none',
                          color: '#FFF',
                          fontSize: '15px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span>{faq.q}</span>
                        <span style={{ fontSize: '18px', color: 'var(--orb-primary, #D4AF37)' }}>
                          {openFaqIndex === idx ? '−' : '+'}
                        </span>
                      </button>
                      {openFaqIndex === idx && (
                        <div style={{ padding: '0 24px 20px 24px', fontSize: '14px', color: 'rgba(255, 255, 255, 0.75)', lineHeight: 1.6 }}>
                          {faq.a}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );

          // ─── 18. Flash Sale Countdown ─────────────────────────────
          case 'countdown':
            return (
              <section
                key={sec.id}
                style={{
                  padding: '60px 24px',
                  background: 'linear-gradient(135deg, rgba(229, 169, 60, 0.15), rgba(122, 17, 19, 0.6))',
                  textAlign: 'center',
                  borderTop: '1px solid rgba(229, 169, 60, 0.25)',
                  borderBottom: '1px solid rgba(229, 169, 60, 0.25)',
                }}
              >
                <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '11px', color: '#E5A93C', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    ⚡ LIMITED TIME ROYAL OFFER
                  </span>
                  <h2 style={{ fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)', fontSize: '36px', fontWeight: 900, margin: 0 }}>
                    {settings.title}
                  </h2>
                  <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '14px', margin: 0 }}>
                    {settings.description}
                  </p>

                  <div style={{ display: 'flex', gap: '16px', margin: '12px 0' }}>
                    {[
                      { val: '02', label: 'Days' },
                      { val: '14', label: 'Hours' },
                      { val: '38', label: 'Mins' },
                      { val: '45', label: 'Secs' },
                    ].map((box, idx) => (
                      <div key={idx} style={{ padding: '12px 18px', borderRadius: '10px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', minWidth: '70px' }}>
                        <div style={{ fontSize: '24px', fontWeight: 900, color: '#E5A93C', fontFamily: 'monospace' }}>{box.val}</div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>{box.label}</div>
                      </div>
                    ))}
                  </div>

                  <Link
                    href={settings.buttonLink || `/store/${storeSlug}/shop`}
                    style={{
                      padding: '14px 32px',
                      borderRadius: 'var(--orb-radius-btn, 8px)',
                      background: 'var(--orb-primary, #E5A93C)',
                      color: '#000',
                      fontWeight: 900,
                      fontSize: '14px',
                      textDecoration: 'none',
                      boxShadow: '0 0 25px rgba(229, 169, 60, 0.4)',
                    }}
                  >
                    {settings.buttonText || 'Shop The Drop ↗'}
                  </Link>
                </div>
              </section>
            );

          // ─── 19. Instagram Social Feed ────────────────────────────
          case 'instagram-feed':
            return (
              <section
                key={sec.id}
                style={{
                  padding: '72px 24px',
                  maxWidth: 'var(--orb-container-max-width, 1280px)',
                  margin: '0 auto',
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--orb-primary, #D4AF37)', fontWeight: 800 }}>
                    {settings.handle || '@orbitox.store'}
                  </span>
                  <h2 style={{ fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)', fontSize: '32px', fontWeight: 900, margin: '4px 0 0 0' }}>
                    {settings.title || 'Follow Our Royal Journey'}
                  </h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  {[
                    'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=600&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=600&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?q=80&w=600&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=600&auto=format&fit=crop',
                  ].map((url, idx) => (
                    <div key={idx} style={{ position: 'relative', height: '240px', borderRadius: '12px', overflow: 'hidden', background: '#222' }}>
                      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', cursor: 'pointer' }}>
                        <span style={{ fontSize: '20px' }}>📸</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );

          // ─── 20. Stats & Metrics Counter ──────────────────────────
          case 'stats-counter':
            return (
              <section
                key={sec.id}
                style={{
                  padding: '60px 24px',
                  background: 'var(--orb-surface, #161618)',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div
                  style={{
                    maxWidth: 'var(--orb-container-max-width, 1200px)',
                    margin: '0 auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '24px',
                    textAlign: 'center',
                  }}
                >
                  {[
                    { num: '50,000+', label: 'Royal Brides Styled' },
                    { num: '100%', label: 'Handcrafted Heritage' },
                    { num: '250+', label: 'Master Artisans' },
                    { num: '4.9 ★', label: 'Global Customer Rating' },
                  ].map((stat, idx) => (
                    <div key={idx}>
                      <div style={{ fontSize: '36px', fontWeight: 900, color: 'var(--orb-primary, #E5A93C)', fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)' }}>
                        {stat.num}
                      </div>
                      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );

          // ─── 21. Trust Badges ─────────────────────────────────────
          case 'trust-badges':
            return (
              <section
                key={sec.id}
                style={{
                  padding: '40px 24px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderTop: '1px solid var(--orb-border, rgba(255, 255, 255, 0.06))',
                  borderBottom: '1px solid var(--orb-border, rgba(255, 255, 255, 0.06))',
                }}
              >
                <div
                  style={{
                    maxWidth: 'var(--orb-container-max-width, 1200px)',
                    margin: '0 auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '24px',
                  }}
                >
                  {[
                    { icon: <IconCrown size={24} color="var(--orb-primary, #D4AF37)" />, title: '100% Bite-Free Soles', desc: 'Triple memory foam cushioning' },
                    { icon: <IconTruck size={24} color="var(--orb-primary, #D4AF37)" />, title: 'Express Worldwide Shipping', desc: 'DHL Express 3-5 days delivery' },
                    { icon: <IconSparkles size={24} color="var(--orb-primary, #D4AF37)" />, title: 'Pure Zardozi Bullion', desc: '24K gold & silver wirework' },
                    { icon: <IconRotateCcw size={24} color="var(--orb-primary, #D4AF37)" />, title: '30-Day Easy Exchange', desc: 'Hassle-free size guarantee' },
                  ].map((b, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {b.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800 }}>{b.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--orb-text-muted, #888)' }}>{b.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );

          // ─── 22. Contact & Inquiry Form ───────────────────────────
          case 'contact-form':
            return (
              <section
                key={sec.id}
                style={{
                  padding: '80px 24px',
                  maxWidth: '680px',
                  margin: '0 auto',
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                  <h2 style={{ fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)', fontSize: '32px', fontWeight: 900, margin: 0 }}>
                    {settings.title || 'Get In Touch'}
                  </h2>
                  <p style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '14px', margin: '6px 0 0 0' }}>
                    {settings.subtitle || 'Our concierge team is available 24/7'}
                  </p>
                </div>

                {contactSubmitted ? (
                  <div style={{ padding: '24px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10B981', color: '#10B981', textAlign: 'center', fontWeight: 700 }}>
                    🎉 Thank you for contacting us! Our royal concierge will respond within 2 business hours.
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setContactSubmitted(true);
                    }}
                    style={{
                      background: 'var(--orb-surface, #161618)',
                      borderRadius: '16px',
                      border: '1px solid var(--orb-border, rgba(255, 255, 255, 0.1))',
                      padding: '32px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700 }}>Your Name</label>
                        <input type="text" required placeholder="Lady Eleanor" style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', fontSize: '13px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700 }}>Email Address</label>
                        <input type="email" required placeholder="eleanor@luxury.com" style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', fontSize: '13px' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700 }}>Subject / Inquiry Type</label>
                      <input type="text" placeholder="Bespoke Bridal Consultation" style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', fontSize: '13px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700 }}>Message</label>
                      <textarea rows={4} required placeholder="Tell us about your wedding date or custom design requirements..." style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', fontSize: '13px' }} />
                    </div>
                    <button type="submit" style={{ padding: '14px', borderRadius: '8px', background: 'var(--orb-primary, #E5A93C)', color: '#000', fontWeight: 800, fontSize: '13px', border: 'none', cursor: 'pointer' }}>
                      Send Message to Concierge ↗
                    </button>
                  </form>
                )}
              </section>
            );

          // ─── 23. Editorial Text Block ─────────────────────────────
          case 'text-block':
            return (
              <section
                key={sec.id}
                style={{
                  padding: '72px 24px',
                  maxWidth: '800px',
                  margin: '0 auto',
                  textAlign: 'center',
                }}
              >
                <h2 style={{ fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)', fontSize: '32px', fontWeight: 900, margin: '0 0 16px 0' }}>
                  {settings.heading}
                </h2>
                <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '16px', lineHeight: 1.8, margin: 0 }}>
                  {settings.body}
                </p>
              </section>
            );

          // ─── 24. Image & Video Blocks & Custom HTML ───────────────
          case 'image-block':
            return (
              <section key={sec.id} style={{ padding: '40px 24px', maxWidth: '1280px', margin: '0 auto' }}>
                <div style={{ height: '480px', borderRadius: '20px', overflow: 'hidden', background: '#222' }}>
                  {settings.imageUrl && <img src={settings.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                {settings.caption && (
                  <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--orb-text-muted, #888)', marginTop: '8px' }}>
                    {settings.caption}
                  </p>
                )}
              </section>
            );

          case 'video-block':
            return (
              <section key={sec.id} style={{ padding: '60px 24px', maxWidth: '1000px', margin: '0 auto' }}>
                {settings.title && (
                  <h2 style={{ textAlign: 'center', fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)', fontSize: '30px', fontWeight: 900, marginBottom: '24px' }}>
                    {settings.title}
                  </h2>
                )}
                <div style={{ borderRadius: '16px', overflow: 'hidden', background: '#000', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <video controls src={settings.videoUrl} style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
              </section>
            );

          case 'custom-html':
            return (
              <div
                key={sec.id}
                dangerouslySetInnerHTML={{ __html: settings.html || '' }}
              />
            );

          // ─── 25. Newsletter Subscription ──────────────────────────
          case 'newsletter':
            return (
              <section
                key={sec.id}
                style={{
                  padding: '80px 24px',
                  background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1), rgba(17, 24, 39, 0.6))',
                  textAlign: 'center',
                }}
              >
                <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <h2 style={{ fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)', fontSize: '32px', fontWeight: 900, margin: 0 }}>
                    {settings.title}
                  </h2>
                  <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', margin: 0 }}>
                    {settings.description}
                  </p>

                  {newsletterSubscribed ? (
                    <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', fontWeight: 700 }}>
                      🎉 Thank you for subscribing! Check your inbox for your 25% welcome voucher.
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        setNewsletterSubscribed(true);
                      }}
                      style={{ display: 'flex', gap: '8px', marginTop: '12px' }}
                    >
                      <input
                        type="email"
                        required
                        placeholder="Enter your email address..."
                        style={{
                          flex: 1,
                          padding: '14px 18px',
                          borderRadius: 'var(--orb-radius-input, 8px)',
                          background: 'rgba(0, 0, 0, 0.5)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: '#FFF',
                          fontSize: '13px',
                        }}
                      />
                      <button
                        type="submit"
                        style={{
                          padding: '14px 28px',
                          borderRadius: 'var(--orb-radius-btn, 8px)',
                          background: 'var(--orb-primary, #D4AF37)',
                          color: '#000',
                          fontWeight: 900,
                          fontSize: '13px',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {settings.buttonText || 'Subscribe'}
                      </button>
                    </form>
                  )}
                </div>
              </section>
            );

          // ─── 26. Footer ───────────────────────────────────────────
          case 'footer':
            return (
              <footer
                key={sec.id}
                style={{
                  padding: '60px 24px 30px 24px',
                  background: 'var(--orb-surface, #111113)',
                  borderTop: '1px solid var(--orb-border, rgba(255, 255, 255, 0.08))',
                  fontSize: '13px',
                }}
              >
                <div
                  style={{
                    maxWidth: 'var(--orb-container-max-width, 1200px)',
                    margin: '0 auto',
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr',
                    gap: '40px',
                    marginBottom: '40px',
                  }}
                >
                  <div>
                    <h3 style={{ fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)', fontSize: '20px', fontWeight: 900, margin: '0 0 10px 0' }}>
                      {storeName}
                    </h3>
                    <p style={{ color: 'var(--orb-text-muted, #888)', lineHeight: 1.6, maxWidth: '280px' }}>
                      Elevating luxury e-commerce with cutting-edge architecture powered by OrbitoX.
                    </p>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', margin: '0 0 12px 0' }}>Collections</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--orb-text-muted, #888)' }}>
                      <Link href={`/store/${storeSlug}/shop`} style={{ color: 'inherit', textDecoration: 'none' }}>New Arrivals</Link>
                      <Link href={`/store/${storeSlug}/shop`} style={{ color: 'inherit', textDecoration: 'none' }}>Haute Couture</Link>
                      <Link href={`/store/${storeSlug}/shop`} style={{ color: 'inherit', textDecoration: 'none' }}>Artisanal Shoes</Link>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', margin: '0 0 12px 0' }}>Patron Care</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--orb-text-muted, #888)' }}>
                      <Link href={`/store/${storeSlug}/shop`} style={{ color: 'inherit', textDecoration: 'none' }}>Shipping & Returns</Link>
                      <Link href={`/store/${storeSlug}/shop`} style={{ color: 'inherit', textDecoration: 'none' }}>Bespoke Sizing</Link>
                      <Link href={`/store/${storeSlug}/shop`} style={{ color: 'inherit', textDecoration: 'none' }}>Contact Concierge</Link>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', margin: '0 0 12px 0' }}>Powered by</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--orb-text-muted, #888)' }}>
                      <a href="/commerce" style={{ color: 'var(--orb-primary, #D4AF37)', textDecoration: 'none', fontWeight: 700 }}>
                        OrbitoX Commerce OS ↗
                      </a>
                      <span>Multi-Tenant Architecture</span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '20px', textAlign: 'center', color: 'var(--orb-text-muted, #888)', fontSize: '12px' }}>
                  {settings.copyright || `© ${new Date().getFullYear()} ${storeName}. All rights reserved.`}
                </div>
              </footer>
            );

          // ─── Specialized Theme Kit Components (Reference Images 1-5) ───
          case 'oddaworld-gadgets-hero':
            return (
              <OddaWorldGadgetsHeroSection
                key={sec.id}
                section={sec as any}
                onOpenCart={() => setCartDrawerOpen(true)}
                cartItemCount={cart?.totals.itemsCount || 0}
              />
            );

          case 'oddaworld-categories':
            return (
              <OddaWorldCategoriesSection
                key={sec.id}
                section={sec as any}
              />
            );

          case 'oddaworld-feature-spotlight':
            return (
              <OddaWorldFeatureSpotlightSection
                key={sec.id}
                section={sec as any}
              />
            );

          case 'sneakconnect-editorial-hero':
            return (
              <SneakConnectEditorialHeroSection
                key={sec.id}
                section={sec as any}
              />
            );

          case 'sneakconnect-popular-models':
            return (
              <SneakConnectPopularModelsSection
                key={sec.id}
                section={sec as any}
              />
            );

          case 'sneakconnect-feature-grid':
            return (
              <SneakConnectFeatureGridSection
                key={sec.id}
                section={sec as any}
              />
            );

          case 'hyperflux-showcase':
            return (
              <HyperFluxShowcaseSection
                key={sec.id}
                section={sec as any}
              />
            );

          case 'pegasus-split-banner':
            return (
              <PegasusSplitBannerSection
                key={sec.id}
                section={sec as any}
              />
            );

          case 'aura-sand-carousel':
            return (
              <AuraSandCarouselSection
                key={sec.id}
                section={sec as any}
              />
            );

          case 'luxe-card-showcase':
            return (
              <LuxeCardShowcaseSection
                key={sec.id}
                section={sec as any}
              />
            );

          case 'neumorphic-gold-dashboard':
            return (
              <NeumorphicGoldDashboardSection
                key={sec.id}
                section={sec as any}
              />
            );

          default: {
            const customDef = sec.customComponentId
              ? commerceEngine.customComponents.getCustomComponent(sec.customComponentId)
              : commerceEngine.customComponents.getCustomComponent(sec.type);

            if (customDef) {
              return (
                <section key={sec.id} style={{ padding: '40px 24px' }}>
                  <CustomComponentRenderer
                    definition={customDef}
                    settings={settings}
                    storeSlug={storeSlug}
                    onOpenCart={() => setCartDrawerOpen(true)}
                    onOpenWishlist={() => setWishlistDrawerOpen(true)}
                  />
                </section>
              );
            }
            return null;
          }
        }
      })}

      {/* Live Search Modal */}
      {searchModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '80px',
            zIndex: 200,
          }}
          onClick={() => setSearchModalOpen(false)}
        >
          <div
            style={{
              width: '580px',
              background: '#161618',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px' }}>
              <span style={{ fontSize: '18px' }}>🔍</span>
              <input
                type="text"
                autoFocus
                placeholder="Search products, collections, materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  color: '#FFF',
                  fontSize: '16px',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => setSearchModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.5)', fontSize: '16px', cursor: 'pointer' }}
              >
                ESC
              </button>
            </div>

            {/* Results */}
            <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {searchQuery.trim() === '' ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)', fontSize: '13px' }}>
                  Type to search across the entire catalog...
                </div>
              ) : searchedProducts.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)', fontSize: '13px' }}>
                  No products found matching "{searchQuery}"
                </div>
              ) : (
                searchedProducts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/store/${storeSlug}/product/${p.slug}`}
                    onClick={() => setSearchModalOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <div style={{ width: '48px', height: '48px', borderRadius: '6px', overflow: 'hidden', background: '#222', flexShrink: 0 }}>
                      {p.media[0] && <img src={p.media[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>{p.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--orb-text-muted, #888)' }}>{p.categoryName}</div>
                    </div>
                    <span style={{ fontWeight: 800, color: 'var(--orb-primary, #D4AF37)' }}>{formatPrice(p.price)}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick View Modal */}
      <StorefrontQuickViewModal
        product={quickViewProduct}
        storeSlug={storeSlug}
        storeId={storeId}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onAddedToCart={() => setCartDrawerOpen(true)}
      />

      {/* Wishlist Drawer */}
      <StorefrontWishlistDrawer
        storeSlug={storeSlug}
        storeId={storeId}
        isOpen={wishlistDrawerOpen}
        onClose={() => setWishlistDrawerOpen(false)}
        onOpenCart={() => setCartDrawerOpen(true)}
      />

      {/* Floating Recently Viewed Bar */}
      <StorefrontRecentlyViewed
        storeSlug={storeSlug}
        storeId={storeId}
        onOpenCart={() => setCartDrawerOpen(true)}
      />

      {/* Cart Drawer */}
      <StorefrontCartDrawer
        storeSlug={storeSlug}
        storeId={storeId}
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
      />

      {/* Floating Luxury Cart Quick-Access Button */}
      {cart && cart.totals.itemsCount > 0 && !cartDrawerOpen && (
        <button
          type="button"
          onClick={() => setCartDrawerOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'linear-gradient(135deg, rgba(22, 22, 24, 0.95) 0%, rgba(14, 14, 16, 0.98) 100%)',
            border: '2px solid var(--orb-primary, #D4AF37)',
            borderRadius: '9999px',
            padding: '10px 20px',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 12px 35px rgba(0,0,0,0.6), 0 0 25px rgba(212, 175, 55, 0.35)',
            cursor: 'pointer',
            zIndex: 990,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            fontFamily: 'var(--orb-font-body, "Plus Jakarta Sans", sans-serif)',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--orb-primary, #D4AF37)',
              color: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '14px',
            }}
          >
            <IconShoppingBag size={18} color="#000" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--orb-primary, #D4AF37)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Shopping Bag
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>
              {cart.totals.itemsCount} {cart.totals.itemsCount === 1 ? 'item' : 'items'} • {formatPrice(cart.totals.grandTotal)}
            </div>
          </div>
        </button>
      )}
    </div>
  );
}

