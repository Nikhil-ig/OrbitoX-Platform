'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  DEFAULT_OCCASIONS,
  DEFAULT_THEMES,
  DEFAULT_SECTION_DEFINITIONS,
  DEFAULT_FEATURE_DEFINITIONS,
  Occasion,
  Theme,
} from '@orbitox-io/celebrations';
import { useEcosystem, UserRole, TemplatePricingType } from '../../lib/ecosystem-context';
import {
  BarChart3,
  Heart,
  Palette,
  Layers,
  Zap,
  ShieldAlert,
  Eye,
  EyeOff,
  DollarSign,
  Clock,
  Building2,
  Users,
  Check,
  ExternalLink,
  Sliders,
  Sparkles,
  QrCode,
  Award,
  ArrowRight,
  TrendingUp,
  X,
} from 'lucide-react';
import { useResponsiveDevice } from '../../hooks/useResponsiveDevice';

export default function SuperAdminPage() {
  const { isMobile, isTablet } = useResponsiveDevice();
  const {
    currentRole,
    setRole,
    templates,
    visibleTemplates,
    toggleTemplateVisibility,
    updateTemplatePricing,
    subscriptionPlans,
    c2cPlans,
    agencyPlans,
    updateSubscriptionPlan,
    agencyProjects,
    hostCelebration,
    resetEcosystemDefaults,
  } = useEcosystem();

  const [activeTab, setActiveTab] = useState<
    'templates' | 'subscriptions' | 'agency_network' | 'c2c_hosts' | 'occasions' | 'sections' | 'overview'
  >('templates');

  // Dynamic state for adding occasions and themes
  const [occasions, setOccasions] = useState<Occasion[]>(DEFAULT_OCCASIONS);
  const [themes, setThemes] = useState<Theme[]>(DEFAULT_THEMES);

  // New Occasion Modal/Form State
  const [newOccName, setNewOccName] = useState('');
  const [newOccSlug, setNewOccSlug] = useState('');
  const [newOccCategory, setNewOccCategory] = useState('personal');
  const [newOccDesc, setNewOccDesc] = useState('');
  const [showOccModal, setShowOccModal] = useState(false);

  // New Theme Modal/Form State
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeSlug, setNewThemeSlug] = useState('');
  const [newThemeOccasion, setNewThemeOccasion] = useState('wedding');
  const [newThemePrimaryColor, setNewThemePrimaryColor] = useState('#D4AF37');
  const [newThemeBgColor, setNewThemeBgColor] = useState('#071510');
  const [newThemeTier, setNewThemeTier] = useState<'FREE' | 'PRO' | 'PREMIUM'>('PRO');
  const [showThemeModal, setShowThemeModal] = useState(false);

  // Success toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAddOccasion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOccName.trim() || !newOccSlug.trim()) return;

    const created: Occasion = {
      id: `occ_custom_${Date.now()}`,
      slug: newOccSlug.toLowerCase().trim(),
      name: newOccName.trim(),
      category: newOccCategory,
      icon: 'Sparkles',
      description: newOccDesc.trim() || 'Custom celebration occasion',
      defaultSections: ['hero', 'countdown', 'events_schedule', 'venue_map', 'rsvp'],
      allowedFeatures: ['rsvp_tracking', 'photo_gallery', 'custom_domain'],
      status: 'PUBLISHED',
      sortOrder: occasions.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setOccasions([...occasions, created]);
    setNewOccName('');
    setNewOccSlug('');
    setNewOccDesc('');
    setShowOccModal(false);
    showToast(`Occasion "${created.name}" registered to platform schema.`);
  };

  const handleAddTheme = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThemeName.trim() || !newThemeSlug.trim()) return;

    const createdTheme: Theme = {
      id: `theme_custom_${Date.now()}`,
      slug: newThemeSlug.toLowerCase().trim(),
      name: newThemeName.trim(),
      description: `Bespoke luxury styling for ${newThemeOccasion}`,
      occasionId: `occ_${newThemeOccasion}`,
      occasionSlug: newThemeOccasion,
      previewImages: ['https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80',
      styleConfig: {
        fontHeading: 'Cinzel, serif',
        fontBody: 'Plus Jakarta Sans, sans-serif',
        primaryColor: newThemePrimaryColor,
        secondaryColor: '#1E293B',
        accentColor: newThemePrimaryColor,
        backgroundColor: newThemeBgColor,
        cardBackgroundColor: 'rgba(255,255,255,0.05)',
        textColor: '#FFFFFF',
        mutedTextColor: '#94A3B8',
        borderRadius: 'lg',
        animationPreset: 'luxury',
      },
      supportedSections: ['hero', 'countdown', 'events_schedule', 'venue_map', 'gallery', 'rsvp'],
      tier: newThemeTier,
      isFeatured: false,
      isPopular: false,
      author: 'Custom Creator Studio',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setThemes([...themes, createdTheme]);
    setNewThemeName('');
    setNewThemeSlug('');
    setShowThemeModal(false);
    showToast(`Theme "${createdTheme.name}" registered to theme catalog.`);
  };

  const hiddenCount = templates.length - visibleTemplates.length;

  return (
    <div style={{ padding: isMobile ? '20px 16px 90px 16px' : isTablet ? '32px 24px 100px 24px' : '40px 32px 120px 32px' }}>
      <div className="container">
        {/* Toast Notification */}
        {toastMessage && (
          <div
            style={{
              position: 'fixed',
              top: '24px',
              right: '24px',
              zIndex: 99999,
              background: 'rgba(9, 13, 23, 0.95)',
              border: '1px solid var(--cel-gold)',
              borderRadius: '12px',
              padding: '12px 20px',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(223, 186, 107, 0.2)',
              color: '#FFFFFF',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <Sparkles size={16} color="var(--cel-gold)" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Master Admin Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: '20px',
            marginBottom: '32px',
          }}
        >
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge-purple">Platform Super Admin</span>
              <span className="badge-gold">OrbitoX Governance Studio</span>
              {currentRole !== 'PLATFORM_ADMIN' && (
                <span style={{ fontSize: '0.72rem', background: '#EF4444', color: '#fff', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                  Impersonating: {currentRole}
                </span>
              )}
            </div>
            <h1 style={{ fontSize: isMobile ? '1.75rem' : '2.4rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
              Platform Catalog & Ecosystem Governance
            </h1>
            <p style={{ color: 'var(--cel-text-secondary)', fontSize: '0.92rem', maxWidth: '780px' }}>
              Full dynamic control over the multi-tier <strong>O2O2B</strong> (Agencies & Planners) and <strong>C2C</strong> (Direct Hosts) ecosystem. Show/hide templates globally, configure pricing models & free trials, and tune subscription entitlements in real time.
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
            <button
              onClick={() => {
                setRole('PLATFORM_ADMIN');
                showToast('Switched persona to Platform Admin.');
              }}
              className="btn-outline-gold"
              style={{ fontSize: '0.84rem', padding: '8px 16px', minHeight: '44px', flex: isMobile ? 1 : 'initial' }}
            >
              <ShieldAlert size={14} />
              <span>Ensure Admin Role</span>
            </button>
            <button
              onClick={() => {
                resetEcosystemDefaults();
                showToast('Ecosystem templates and subscriptions reset to factory defaults.');
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.7)',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                cursor: 'pointer',
                minHeight: '44px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Reset Defaults
            </button>
          </div>
        </div>

        {/* System Telemetry KPI Matrix */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: isMobile ? '10px' : '16px',
            marginBottom: '32px',
          }}
        >
          <div className="glass-panel" style={{ padding: isMobile ? '14px 12px' : '20px' }}>
            <span style={{ fontSize: isMobile ? '0.68rem' : '0.74rem', color: 'var(--cel-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              3D Universes
            </span>
            <div style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 800, color: 'var(--cel-gold)', marginTop: '4px' }}>
              {templates.length}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--cel-text-dim)', marginTop: '4px' }}>
              <span style={{ color: '#10B981', fontWeight: 700 }}>{visibleTemplates.length} Live</span>
              {hiddenCount > 0 && <span style={{ color: '#EF4444', marginLeft: '4px' }}>• {hiddenCount} Hidden</span>}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: isMobile ? '14px 12px' : '20px' }}>
            <span style={{ fontSize: isMobile ? '0.68rem' : '0.74rem', color: 'var(--cel-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              O2O2B Agencies
            </span>
            <div style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 800, color: '#60A5FA', marginTop: '4px' }}>
              {agencyProjects.length + 5}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--cel-text-dim)', marginTop: '4px' }}>
              <span>{agencyProjects.length} Active Galas</span>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: isMobile ? '14px 12px' : '20px' }}>
            <span style={{ fontSize: isMobile ? '0.68rem' : '0.74rem', color: 'var(--cel-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              C2C Hosts
            </span>
            <div style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 800, color: '#F472B6', marginTop: '4px' }}>
              1,248
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--cel-text-dim)', marginTop: '4px' }}>
              <span style={{ color: '#10B981' }}>74% Pass Conv.</span>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: isMobile ? '14px 12px' : '20px' }}>
            <span style={{ fontSize: isMobile ? '0.68rem' : '0.74rem', color: 'var(--cel-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Sub Tiers
            </span>
            <div style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 800, color: '#A855F7', marginTop: '4px' }}>
              {subscriptionPlans.length}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--cel-text-dim)', marginTop: '4px' }}>
              <span>{c2cPlans.length} C2C • {agencyPlans.length} O2O2B</span>
            </div>
          </div>
        </div>

        {/* Governance Navigation Tabs */}
        <div
          className="horizontal-scroll-rail"
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid var(--cel-border-subtle)',
            marginBottom: '32px',
            paddingBottom: '2px',
          }}
        >
          {[
            { id: 'templates', label: `Template Catalog Governance (${templates.length})`, shortLabel: `Templates (${templates.length})`, Icon: Palette },
            { id: 'subscriptions', label: `Subscription & Pricing Plans (${subscriptionPlans.length})`, shortLabel: `Plans (${subscriptionPlans.length})`, Icon: DollarSign },
            { id: 'agency_network', label: `O2O2B Agency Network (${agencyProjects.length})`, shortLabel: `Agencies (${agencyProjects.length})`, Icon: Building2 },
            { id: 'c2c_hosts', label: 'C2C Direct Host Funnel', shortLabel: 'C2C Hosts', Icon: Heart },
            { id: 'occasions', label: `Occasions Schema (${occasions.length})`, shortLabel: `Occasions (${occasions.length})`, Icon: Sparkles },
            { id: 'sections', label: `Section Definitions (${DEFAULT_SECTION_DEFINITIONS.length})`, shortLabel: `Sections (${DEFAULT_SECTION_DEFINITIONS.length})`, Icon: Layers },
            { id: 'overview', label: 'System Architecture', shortLabel: 'Architecture', Icon: BarChart3 },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: isMobile ? '10px 14px' : '12px 18px',
                  borderBottom: isActive ? '2px solid var(--cel-gold)' : '2px solid transparent',
                  color: isActive ? 'var(--cel-gold)' : 'var(--cel-text-muted)',
                  fontWeight: isActive ? 800 : 500,
                  fontSize: isMobile ? '0.84rem' : '0.9rem',
                  cursor: 'pointer',
                  background: 'transparent',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  minHeight: '44px',
                  flexShrink: 0,
                }}
              >
                <tab.Icon size={16} />
                <span>{isMobile ? tab.shortLabel : tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: TEMPLATE CATALOG & MONETIZATION GOVERNANCE                         */}
        {/* ========================================================================= */}
        {activeTab === 'templates' && (
          <div className="glass-panel" style={{ padding: '32px' }}>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                marginBottom: '28px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
                  Live 3D Template Catalog & Monetization Matrix
                </h3>
                <p style={{ color: 'var(--cel-text-secondary)', fontSize: '0.88rem' }}>
                  Toggle template visibility globally (hide/show immediately from Landing, Explore & Studio), customize individual template price, and control free trial durations.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <Link
                  href="/create"
                  className="btn-outline-gold"
                  style={{ padding: '8px 16px', fontSize: '0.82rem', textDecoration: 'none' }}
                >
                  <Eye size={14} />
                  <span>Verify in Studio</span>
                </Link>
                <button onClick={() => setShowThemeModal(true)} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
                  + Add Theme Schema
                </button>
              </div>
            </div>

            {/* Template Governance Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
              {templates.map((tmpl) => {
                const isHidden = tmpl.status === 'HIDDEN';

                return (
                  <div
                    key={tmpl.id}
                    style={{
                      borderRadius: '16px',
                      background: isHidden ? 'rgba(239, 68, 68, 0.03)' : 'rgba(255, 255, 255, 0.02)',
                      border: isHidden
                        ? '1px solid rgba(239, 68, 68, 0.4)'
                        : '1px solid var(--cel-border-subtle)',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      boxShadow: isHidden ? '0 8px 30px rgba(239, 68, 68, 0.08)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div>
                      {/* Top Bar: Name & Visibility Switch */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '12px',
                          marginBottom: '12px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <strong style={{ fontSize: '1.15rem', color: '#fff' }}>{tmpl.name}</strong>
                          </div>
                          <code style={{ fontSize: '0.74rem', color: 'var(--cel-gold)' }}>slug: {tmpl.slug}</code>
                        </div>

                        {/* Visibility Toggle Switch */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          <button
                            onClick={() => {
                              toggleTemplateVisibility(tmpl.slug, !isHidden);
                              showToast(
                                isHidden
                                  ? `"${tmpl.name}" is now VISIBLE on all public platforms.`
                                  : `"${tmpl.name}" is now HIDDEN from public catalog & studio.`
                              );
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '9999px',
                              background: isHidden ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                              border: isHidden ? '1px solid #EF4444' : '1px solid #10B981',
                              color: isHidden ? '#F87171' : '#34D399',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
                            <span>{isHidden ? 'HIDDEN' : 'SHOWING'}</span>
                          </button>
                        </div>
                      </div>

                      <p
                        style={{
                          fontSize: '0.84rem',
                          color: 'var(--cel-text-secondary)',
                          lineHeight: 1.5,
                          marginBottom: '18px',
                        }}
                      >
                        {tmpl.description}
                      </p>

                      {/* Pricing Model & Monetization Settings */}
                      <div
                        style={{
                          background: 'rgba(0, 0, 0, 0.35)',
                          borderRadius: '12px',
                          padding: '16px',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          marginBottom: '18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                          <label style={{ fontSize: '0.78rem', color: 'var(--cel-text-muted)', fontWeight: 600 }}>
                            Pricing Model:
                          </label>
                          <select
                            value={tmpl.pricingType}
                            onChange={(e) => {
                              const newType = e.target.value as TemplatePricingType;
                              let newPrice = tmpl.priceInr;
                              if (newType === 'FREE') newPrice = 0;
                              else if (newType === 'PAID' && newPrice === 0) newPrice = 1499;
                              updateTemplatePricing(tmpl.slug, {
                                pricingType: newType,
                                priceInr: newPrice,
                                priceUsd: Math.round(newPrice / 80),
                              });
                              showToast(`Updated pricing model for ${tmpl.name} to ${newType}.`);
                            }}
                            style={{
                              background: '#0B0F1A',
                              color: 'var(--cel-gold)',
                              border: '1px solid rgba(223, 186, 107, 0.3)',
                              borderRadius: '8px',
                              padding: '5px 10px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                            }}
                          >
                            <option value="FREE">Free Template (₹0)</option>
                            <option value="FREE_TRIAL">Free Trial Enabled</option>
                            <option value="PAID">Paid / Fixed Price</option>
                            <option value="TIER_EXCLUSIVE">Royal Tier Exclusive</option>
                          </select>
                        </div>

                        {/* Price Input if PAID or FREE_TRIAL */}
                        {(tmpl.pricingType === 'PAID' || tmpl.pricingType === 'FREE_TRIAL' || tmpl.pricingType === 'TIER_EXCLUSIVE') && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--cel-text-muted)' }}>Template Retail Price:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: 'var(--cel-gold)', fontSize: '0.82rem', fontWeight: 700 }}>₹</span>
                              <input
                                type="number"
                                min={0}
                                step={100}
                                value={tmpl.priceInr}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  updateTemplatePricing(tmpl.slug, {
                                    priceInr: val,
                                    priceUsd: Math.round(val / 80),
                                  });
                                }}
                                style={{
                                  width: '84px',
                                  padding: '4px 8px',
                                  background: '#0B0F1A',
                                  border: '1px solid rgba(255, 255, 255, 0.15)',
                                  borderRadius: '6px',
                                  color: '#fff',
                                  fontSize: '0.82rem',
                                  fontWeight: 700,
                                }}
                              />
                              <span style={{ fontSize: '0.72rem', color: 'var(--cel-text-dim)' }}>
                                (${tmpl.priceUsd})
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Free Trial Days Slider if FREE_TRIAL */}
                        {tmpl.pricingType === 'FREE_TRIAL' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                              <span style={{ color: 'var(--cel-text-muted)' }}>Free Trial Duration:</span>
                              <strong style={{ color: '#38BDF8' }}>{tmpl.freeTrialDays} Days</strong>
                            </div>
                            <input
                              type="range"
                              min={3}
                              max={30}
                              step={1}
                              value={tmpl.freeTrialDays}
                              onChange={(e) => {
                                const days = parseInt(e.target.value);
                                updateTemplatePricing(tmpl.slug, { freeTrialDays: days });
                              }}
                              style={{ width: '100%', accentColor: 'var(--cel-gold)' }}
                            />
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--cel-text-dim)', cursor: 'pointer', marginTop: '4px' }}>
                              <input
                                type="checkbox"
                                checked={tmpl.watermarkDuringTrial}
                                onChange={(e) => {
                                  updateTemplatePricing(tmpl.slug, { watermarkDuringTrial: e.target.checked });
                                }}
                              />
                              <span>Include OrbitoX Watermark during trial</span>
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Editorial Flags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                        <button
                          onClick={() => {
                            updateTemplatePricing(tmpl.slug, { isFeatured: !tmpl.isFeatured });
                          }}
                          style={{
                            fontSize: '0.7rem',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: tmpl.isFeatured ? 'rgba(223, 186, 107, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            border: tmpl.isFeatured ? '1px solid var(--cel-gold)' : '1px solid rgba(255, 255, 255, 0.1)',
                            color: tmpl.isFeatured ? 'var(--cel-gold)' : 'var(--cel-text-dim)',
                            cursor: 'pointer',
                            fontWeight: 700,
                          }}
                        >
                          ★ Featured: {tmpl.isFeatured ? 'YES' : 'NO'}
                        </button>
                        <button
                          onClick={() => {
                            updateTemplatePricing(tmpl.slug, { isPopular: !tmpl.isPopular });
                          }}
                          style={{
                            fontSize: '0.7rem',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: tmpl.isPopular ? 'rgba(244, 114, 182, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            border: tmpl.isPopular ? '1px solid #F472B6' : '1px solid rgba(255, 255, 255, 0.1)',
                            color: tmpl.isPopular ? '#F472B6' : 'var(--cel-text-dim)',
                            cursor: 'pointer',
                            fontWeight: 700,
                          }}
                        >
                          🔥 Trending: {tmpl.isPopular ? 'YES' : 'NO'}
                        </button>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div
                      style={{
                        paddingTop: '14px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: '0.74rem', color: 'var(--cel-text-dim)' }}>
                        Preset: {tmpl.animationPreset}
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Link
                          href={`/admin/template-studio?template=${tmpl.slug}`}
                          className="btn-primary"
                          style={{
                            padding: '5px 10px',
                            fontSize: '0.75rem',
                            textDecoration: 'none',
                            background: 'linear-gradient(135deg, #DFBA6B, #C29B47)',
                            color: '#050B14',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Sparkles size={12} />
                          <span>Template Studio</span>
                        </Link>
                        <Link
                          href={`/create?theme=${tmpl.slug}`}
                          className="btn-outline-gold"
                          style={{ padding: '5px 10px', fontSize: '0.75rem', textDecoration: 'none' }}
                        >
                          Creator Studio
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SUBSCRIPTION & PRICING PLANS                                       */}
        {/* ========================================================================= */}
        {activeTab === 'subscriptions' && (
          <div className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
                Subscription Tier Governance & Entitlements
              </h3>
              <p style={{ color: 'var(--cel-text-secondary)', fontSize: '0.88rem' }}>
                Configure pricing, guest quotas, photo capacities, custom domains, and white-label portals for both <strong>C2C Host Passes</strong> and <strong>O2O2B Agency Subscriptions</strong>.
              </p>
            </div>

            {/* SECTION A: C2C CONSUMER HOST PLANS */}
            <div style={{ marginBottom: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Heart size={18} color="#F472B6" />
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  C2C Consumer Host Celebration Passes
                </h4>
                <span className="badge-purple" style={{ fontSize: '0.66rem' }}>Direct Couple / Family</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {c2cPlans.map((plan) => (
                  <div
                    key={plan.id}
                    style={{
                      borderRadius: '16px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: plan.isPopular ? '1px solid var(--cel-gold)' : '1px solid var(--cel-border-subtle)',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '1.15rem', color: '#fff' }}>{plan.name}</strong>
                        {plan.isPopular && <span className="badge-gold" style={{ fontSize: '0.64rem' }}>POPULAR</span>}
                      </div>

                      {/* Price Editor */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--cel-gold)' }}>
                          ₹
                        </span>
                        <input
                          type="number"
                          step={100}
                          value={plan.priceInr}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            updateSubscriptionPlan(plan.id, {
                              priceInr: val,
                              priceUsd: Math.round(val / 80),
                            });
                          }}
                          style={{
                            width: '110px',
                            padding: '6px 10px',
                            background: '#0B0F1A',
                            border: '1px solid rgba(223, 186, 107, 0.3)',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '1.2rem',
                            fontWeight: 800,
                          }}
                        />
                        <span style={{ color: 'var(--cel-text-muted)', fontSize: '0.84rem' }}>
                          / {plan.billingPeriod.toLowerCase().replace('_', ' ')}
                        </span>
                      </div>

                      {/* Quotas */}
                      <div
                        style={{
                          background: 'rgba(0, 0, 0, 0.3)',
                          padding: '12px',
                          borderRadius: '10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          fontSize: '0.78rem',
                          marginBottom: '16px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--cel-text-muted)' }}>Max Guest RSVPs:</span>
                          <input
                            type="number"
                            value={plan.maxGuests}
                            onChange={(e) => {
                              updateSubscriptionPlan(plan.id, { maxGuests: parseInt(e.target.value) || 0 });
                            }}
                            style={{
                              width: '70px',
                              background: '#080C16',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#fff',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              textAlign: 'right',
                              fontSize: '0.76rem',
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--cel-text-muted)' }}>Max Photos:</span>
                          <input
                            type="number"
                            value={plan.maxPhotos}
                            onChange={(e) => {
                              updateSubscriptionPlan(plan.id, { maxPhotos: parseInt(e.target.value) || 0 });
                            }}
                            style={{
                              width: '70px',
                              background: '#080C16',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#fff',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              textAlign: 'right',
                              fontSize: '0.76rem',
                            }}
                          />
                        </div>
                        {plan.trialDays > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--cel-text-muted)' }}>Trial Days:</span>
                            <input
                              type="number"
                              value={plan.trialDays}
                              onChange={(e) => {
                                updateSubscriptionPlan(plan.id, { trialDays: parseInt(e.target.value) || 0 });
                              }}
                              style={{
                                width: '70px',
                                background: '#080C16',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#fff',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                textAlign: 'right',
                                fontSize: '0.76rem',
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Feature Entitlements */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cel-text-secondary)', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={plan.customDomainAllowed}
                            onChange={(e) => updateSubscriptionPlan(plan.id, { customDomainAllowed: e.target.checked })}
                          />
                          <span>Custom Domain Allowed (.com / .in)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cel-text-secondary)', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={plan.watermarkRemoved}
                            onChange={(e) => updateSubscriptionPlan(plan.id, { watermarkRemoved: e.target.checked })}
                          />
                          <span>OrbitoX Watermark Removed</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION B: O2O2B AGENCY & PLANNER SUBSCRIPTIONS */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Building2 size={18} color="#60A5FA" />
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  O2O2B Agency Atelier & Event Planner Subscriptions
                </h4>
                <span className="badge-gold" style={{ fontSize: '0.66rem' }}>B2B Wholesale & Multi-Client</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
                {agencyPlans.map((plan) => (
                  <div
                    key={plan.id}
                    style={{
                      borderRadius: '16px',
                      background: 'rgba(96, 165, 250, 0.03)',
                      border: '1px solid rgba(96, 165, 250, 0.3)',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '1.15rem', color: '#fff' }}>{plan.name}</strong>
                        <span className="badge-purple" style={{ fontSize: '0.64rem' }}>AGENCY PASS</span>
                      </div>

                      {/* Price Editor */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#60A5FA' }}>
                          ₹
                        </span>
                        <input
                          type="number"
                          step={1000}
                          value={plan.priceInr}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            updateSubscriptionPlan(plan.id, {
                              priceInr: val,
                              priceUsd: Math.round(val / 80),
                            });
                          }}
                          style={{
                            width: '120px',
                            padding: '6px 10px',
                            background: '#0B0F1A',
                            border: '1px solid rgba(96, 165, 250, 0.4)',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '1.2rem',
                            fontWeight: 800,
                          }}
                        />
                        <span style={{ color: 'var(--cel-text-muted)', fontSize: '0.84rem' }}>
                          / month
                        </span>
                      </div>

                      {/* Quotas & Features */}
                      <div
                        style={{
                          background: 'rgba(0, 0, 0, 0.3)',
                          padding: '12px',
                          borderRadius: '10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          fontSize: '0.78rem',
                          marginBottom: '16px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--cel-text-muted)' }}>Client Event Slots / Mo:</span>
                          <input
                            type="number"
                            value={plan.maxEvents}
                            onChange={(e) => {
                              updateSubscriptionPlan(plan.id, { maxEvents: parseInt(e.target.value) || 0 });
                            }}
                            style={{
                              width: '70px',
                              background: '#080C16',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#fff',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              textAlign: 'right',
                              fontSize: '0.76rem',
                            }}
                          />
                        </div>
                      </div>

                      {/* Feature Entitlements */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cel-text-secondary)', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={plan.whiteLabelClientPortal}
                            onChange={(e) => updateSubscriptionPlan(plan.id, { whiteLabelClientPortal: e.target.checked })}
                          />
                          <span>White-Label Client Preview Links</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cel-text-secondary)', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={plan.offlineDoorCheckIn}
                            onChange={(e) => updateSubscriptionPlan(plan.id, { offlineDoorCheckIn: e.target.checked })}
                          />
                          <span>Offline Door Staff QR Check-in Terminal</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: O2O2B AGENCY NETWORK & LOGISTICS                                    */}
        {/* ========================================================================= */}
        {activeTab === 'agency_network' && (
          <div className="glass-panel" style={{ padding: '32px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
                  O2O2B Event Agency Portfolio & Offline Logistics
                </h3>
                <p style={{ color: 'var(--cel-text-secondary)', fontSize: '0.88rem' }}>
                  Live overview of client celebration projects managed by verified planning ateliers, banquets, and hospitality concierges.
                </p>
              </div>

              <Link
                href="/dashboard?view=agency"
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.84rem', textDecoration: 'none' }}
              >
                <span>Launch Agency Cockpit →</span>
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {agencyProjects.map((proj) => {
                const margin = Math.round(
                  ((proj.clientRetailPriceInr - proj.wholesaleCostInr) / proj.clientRetailPriceInr) * 100
                );

                return (
                  <div
                    key={proj.id}
                    style={{
                      padding: '20px 24px',
                      borderRadius: '14px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--cel-border-subtle)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '1.1rem', color: '#fff' }}>{proj.eventTitle}</strong>
                        <span className="badge-purple" style={{ fontSize: '0.65rem' }}>{proj.clientName}</span>
                        <span style={{ fontSize: '0.74rem', color: '#10B981', fontWeight: 700 }}>
                          ● {proj.status}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.84rem', color: 'var(--cel-text-muted)', margin: 0 }}>
                        {proj.venueName} • {proj.venueCity} • Event Date: {proj.eventDate}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '0.78rem', color: 'var(--cel-text-dim)' }}>
                        <span>Passcode: <code style={{ color: 'var(--cel-gold)' }}>{proj.doorStaffPasscode}</code></span>
                        <span>•</span>
                        <span>Wholesale: ₹{proj.wholesaleCostInr.toLocaleString()}</span>
                        <span>•</span>
                        <span>Client Billed: ₹{proj.clientRetailPriceInr.toLocaleString()}</span>
                        <span>•</span>
                        <span style={{ color: '#10B981', fontWeight: 700 }}>Agency Margin: {margin}%</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38BDF8' }}>
                          {proj.checkedInGuests} / {proj.totalGuests}
                        </span>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--cel-text-dim)' }}>
                          Door Check-Ins
                        </span>
                      </div>

                      <Link
                        href={`/create?edit=${proj.id || proj.eventTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}&theme=${proj.templateSlug}`}
                        className="btn-outline-gold"
                        style={{ padding: '6px 12px', fontSize: '0.78rem', textDecoration: 'none' }}
                      >
                        Edit in Studio
                      </Link>

                      <Link
                        href={proj.clientReviewUrl}
                        className="btn-outline-gold"
                        style={{ padding: '6px 12px', fontSize: '0.78rem', textDecoration: 'none' }}
                      >
                        Client Portal
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: C2C DIRECT HOSTS                                                   */}
        {/* ========================================================================= */}
        {activeTab === 'c2c_hosts' && (
          <div className="glass-panel" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
              Direct Consumer Couple & Family Funnel
            </h3>
            <p style={{ color: 'var(--cel-text-secondary)', fontSize: '0.88rem', marginBottom: '24px' }}>
              Analytics on self-serve celebrations, free trial duration utilization, and Shagun gift remittances.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(3, 1fr)' : 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px',
                marginBottom: '32px',
              }}
            >
              <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--cel-border-subtle)' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--cel-text-muted)', textTransform: 'uppercase' }}>Active Free Trials</span>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38BDF8', marginTop: '4px' }}>412</div>
                <span style={{ fontSize: '0.75rem', color: 'var(--cel-text-dim)' }}>7-day preview active</span>
              </div>
              <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--cel-border-subtle)' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--cel-text-muted)', textTransform: 'uppercase' }}>Milestone Passes Sold</span>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--cel-gold)', marginTop: '4px' }}>836</div>
                <span style={{ fontSize: '0.75rem', color: '#10B981' }}>+24% this month</span>
              </div>
              <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--cel-border-subtle)' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--cel-text-muted)', textTransform: 'uppercase' }}>Digital Shagun Processed</span>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#F472B6', marginTop: '4px' }}>₹1.48 Cr</div>
                <span style={{ fontSize: '0.75rem', color: 'var(--cel-text-dim)' }}>Zero-fee peer remittance</span>
              </div>
            </div>

            <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(223, 186, 107, 0.05)', border: '1px solid rgba(223, 186, 107, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: '#fff', fontSize: '1.05rem', display: 'block', marginBottom: '4px' }}>
                    Active Host Demo Session: {hostCelebration.coupleTitle}
                  </strong>
                  <span style={{ fontSize: '0.82rem', color: 'var(--cel-text-secondary)' }}>
                    Plan: <code style={{ color: 'var(--cel-gold)' }}>{hostCelebration.activePlanId}</code> • {hostCelebration.trialDaysRemaining} Days Remaining in Free Trial
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link
                    href="/create?edit=aarav-meera-wedding"
                    className="btn-primary"
                    style={{ fontSize: '0.8rem', padding: '6px 14px', textDecoration: 'none' }}
                  >
                    Edit Celebration →
                  </Link>
                  <button
                    onClick={() => {
                      setRole('HOST_CONSUMER');
                      showToast('Switched persona to C2C Host / Couple.');
                    }}
                    className="btn-outline-gold"
                    style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                  >
                    Impersonate Host View
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: OCCASIONS SCHEMA                                                   */}
        {/* ========================================================================= */}
        {activeTab === 'occasions' && (
          <div className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff' }}>
                Configured Occasions Directory
              </h3>
              <button onClick={() => setShowOccModal(true)} className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
                + Add New Occasion
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {occasions.map((occ) => (
                <div
                  key={occ.id}
                  style={{
                    padding: '18px 22px',
                    borderRadius: '14px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--cel-border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <strong style={{ fontSize: '1.1rem', color: '#fff' }}>{occ.name}</strong>
                      <span className="badge-gold" style={{ fontSize: '0.7rem' }}>{occ.slug}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--cel-text-dim)' }}>• Category: {occ.category}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--cel-text-muted)', marginTop: '4px' }}>
                      {occ.description}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.82rem', color: '#10B981', fontWeight: 600 }}>● {occ.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: SECTIONS DEFINITIONS                                               */}
        {/* ========================================================================= */}
        {activeTab === 'sections' && (
          <div className="glass-panel" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', marginBottom: '24px' }}>
              Reusable Section Definitions Registry
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {DEFAULT_SECTION_DEFINITIONS.map((def) => (
                <div
                  key={def.type}
                  style={{
                    padding: '20px',
                    borderRadius: '14px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--cel-border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <strong style={{ fontSize: '1.05rem', color: '#fff' }}>{def.name}</strong>
                      <code style={{ fontSize: '0.75rem', color: 'var(--cel-gold)' }}>type: {def.type}</code>
                      <span className="badge-purple" style={{ fontSize: '0.65rem' }}>{def.category}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--cel-text-muted)', marginTop: '4px' }}>
                      {def.description}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--cel-text-dim)' }}>
                      {def.fields.length} Config Fields
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: ARCHITECTURE OVERVIEW                                              */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="glass-panel" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', color: '#fff' }}>
              🪐 Architecture Decoupling & Multi-Tenant Engine
            </h3>
            <p style={{ color: 'var(--cel-text-secondary)', fontSize: '0.92rem', lineHeight: 1.7, marginBottom: '20px' }}>
              OrbitoX Celebrations is structured on pure metadata separation. Templates, Occasions, and Sections can be modified, priced, or hidden without rebuilding code or touching the React tree.
            </p>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', flex: 1 }}>
                <strong style={{ color: 'var(--cel-gold)', display: 'block', marginBottom: '6px' }}>
                  1. Zero-Trust Multi-Tenancy
                </strong>
                <span style={{ fontSize: '0.85rem', color: 'var(--cel-text-muted)' }}>
                  Active AsyncLocalStorage tenant isolation via <code>@orbitox-io/plugin-engine</code>.
                </span>
              </div>
              <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', flex: 1 }}>
                <strong style={{ color: '#A855F7', display: 'block', marginBottom: '6px' }}>
                  2. Role-Based Ecosystem (RBAC)
                </strong>
                <span style={{ fontSize: '0.85rem', color: 'var(--cel-text-muted)' }}>
                  Platform Admin, O2O2B Agency Planner, C2C Host, and Guest viewpoints unified in a single dynamic engine.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ADD OCCASION */}
        {showOccModal && (
          <div
            className={isMobile ? "mobile-bottom-sheet-backdrop" : undefined}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowOccModal(false);
            }}
            style={isMobile ? undefined : {
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(10px)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
            }}
          >
            <div
              className={isMobile ? "mobile-bottom-sheet-content" : "glass-panel-gold"}
              style={isMobile ? { maxHeight: '85vh', overflowY: 'auto' } : { maxWidth: '520px', width: '100%', padding: '36px' }}
            >
              {isMobile && <div className="bottom-sheet-drag-handle" />}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: isMobile ? '1.3rem' : '1.5rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                  Add New Occasion
                </h3>
                {isMobile && (
                  <button
                    onClick={() => setShowOccModal(false)}
                    style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--cel-text-muted)', marginBottom: '24px' }}>
                Instant configuration without touching code or redeploying.
              </p>

              <form onSubmit={handleAddOccasion} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Occasion Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Retirement Celebration"
                    value={newOccName}
                    onChange={(e) => {
                      setNewOccName(e.target.value);
                      if (!newOccSlug) {
                        setNewOccSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      minHeight: '44px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Occasion Slug *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. retirement"
                    value={newOccSlug}
                    onChange={(e) => setNewOccSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      minHeight: '44px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Category
                  </label>
                  <select
                    value={newOccCategory}
                    onChange={(e) => setNewOccCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#0B0F1A',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      minHeight: '44px',
                    }}
                  >
                    <option value="personal">Personal Milestone</option>
                    <option value="cultural">Cultural & Festival</option>
                    <option value="corporate">Corporate & Gala</option>
                    <option value="milestone">Family & Life Events</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Description for occasion landing and theme builder..."
                    value={newOccDesc}
                    onChange={(e) => setNewOccDesc(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowOccModal(false)}
                    style={{
                      padding: '10px 18px',
                      background: 'transparent',
                      border: '1px solid var(--cel-border-subtle)',
                      borderRadius: '8px',
                      color: 'var(--cel-text-muted)',
                      cursor: 'pointer',
                      minHeight: '44px',
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" style={{ padding: '10px 22px', minHeight: '44px' }}>
                    Register Occasion
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADD THEME */}
        {showThemeModal && (
          <div
            className={isMobile ? "mobile-bottom-sheet-backdrop" : undefined}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowThemeModal(false);
            }}
            style={isMobile ? undefined : {
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(10px)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
            }}
          >
            <div
              className={isMobile ? "mobile-bottom-sheet-content" : "glass-panel-gold"}
              style={isMobile ? { maxHeight: '85vh', overflowY: 'auto' } : { maxWidth: '520px', width: '100%', padding: '36px' }}
            >
              {isMobile && <div className="bottom-sheet-drag-handle" />}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: isMobile ? '1.3rem' : '1.5rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                  Add New Design Theme
                </h3>
                {isMobile && (
                  <button
                    onClick={() => setShowThemeModal(false)}
                    style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--cel-text-muted)', marginBottom: '24px' }}>
                Define design tokens, colors, and tier without redeployment.
              </p>

              <form onSubmit={handleAddTheme} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Theme Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Velvet Noir Romance"
                    value={newThemeName}
                    onChange={(e) => {
                      setNewThemeName(e.target.value);
                      if (!newThemeSlug) {
                        setNewThemeSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      minHeight: '44px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Associated Occasion
                  </label>
                  <select
                    value={newThemeOccasion}
                    onChange={(e) => setNewThemeOccasion(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#0B0F1A',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      minHeight: '44px',
                    }}
                  >
                    {occasions.map((occ) => (
                      <option key={occ.id} value={occ.slug}>
                        {occ.name} ({occ.slug})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      Primary Accent Color
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="color"
                        value={newThemePrimaryColor}
                        onChange={(e) => setNewThemePrimaryColor(e.target.value)}
                        style={{ width: '40px', height: '40px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'transparent' }}
                      />
                      <input
                        type="text"
                        value={newThemePrimaryColor}
                        onChange={(e) => setNewThemePrimaryColor(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.85rem', minHeight: '44px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      Tier Level
                    </label>
                    <select
                      value={newThemeTier}
                      onChange={(e) => setNewThemeTier(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: '#0B0F1A',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        minHeight: '44px',
                      }}
                    >
                      <option value="FREE">FREE</option>
                      <option value="PRO">PRO</option>
                      <option value="PREMIUM">PREMIUM</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowThemeModal(false)}
                    style={{
                      padding: '10px 18px',
                      background: 'transparent',
                      border: '1px solid var(--cel-border-subtle)',
                      borderRadius: '8px',
                      color: 'var(--cel-text-muted)',
                      cursor: 'pointer',
                      minHeight: '44px',
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" style={{ padding: '10px 22px', minHeight: '44px' }}>
                    Register Theme
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
