'use client';

import React, { useState } from 'react';
import { useTheme, PLATFORM_THEMES, GlassCard, NeonBadge, StudioButton, StatMetricWidget } from '@orbitox/ui';

export interface PlatformThemeCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PlatformThemeCustomizerModal({
  isOpen,
  onClose,
}: PlatformThemeCustomizerModalProps) {
  const { currentTheme, allThemes, setThemeById, setCustomAccent } = useTheme();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const accentSwatches = [
    { id: 'gold', name: 'Imperial Gold', color: '#E5A93C', glow: 'rgba(229, 169, 60, 0.45)' },
    { id: 'purple', name: 'Electric Violet', color: '#A855F7', glow: 'rgba(168, 85, 247, 0.45)' },
    { id: 'volt', name: 'Volt Lime', color: '#CCFF00', glow: 'rgba(204, 255, 0, 0.45)' },
    { id: 'blue', name: 'Royal Sapphire', color: '#2563EB', glow: 'rgba(37, 99, 235, 0.45)' },
    { id: 'emerald', name: 'Imperial Emerald', color: '#10B981', glow: 'rgba(16, 185, 129, 0.45)' },
    { id: 'rose', name: 'Rose Gold', color: '#F43F5E', glow: 'rgba(244, 63, 94, 0.45)' },
    { id: 'coral', name: 'Sunset Coral', color: '#FF6B4A', glow: 'rgba(255, 107, 74, 0.45)' },
    { id: 'cyan', name: 'Electric Cyan', color: '#06B6D4', glow: 'rgba(6, 182, 212, 0.45)' },
  ];

  const handleSelectTheme = (themeId: string, name: string) => {
    setThemeById(themeId);
    setToastMessage(`✓ Platform UI switched to "${name}"`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleSelectAccent = (swatch: typeof accentSwatches[0]) => {
    setCustomAccent(swatch.color);
    setToastMessage(`✓ Accent color set to "${swatch.name}"`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 7, 13, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'absolute',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: '#FFF',
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 800,
            fontSize: '12px',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
            zIndex: 10001,
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Main Modal Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '88vh',
          background: 'var(--ui-bg-dock, #0D0F18)',
          border: '1px solid var(--ui-border-default, rgba(255, 255, 255, 0.12))',
          borderRadius: '24px',
          boxShadow: '0 30px 90px rgba(0, 0, 0, 0.85), 0 0 40px var(--ui-accent-glow, rgba(168, 85, 247, 0.15))',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid var(--ui-border-subtle, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'var(--ui-accent-gradient, linear-gradient(135deg, #A855F7, #6366F1))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                fontSize: '18px',
                boxShadow: '0 0 16px var(--ui-accent-glow, rgba(168, 85, 247, 0.4))',
              }}
            >
              🎨
            </div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--ui-text-primary, #FFF)' }}>
                Platform Workspace Theme & Style Studio
              </div>
              <div style={{ fontSize: '11px', color: 'var(--ui-text-secondary, #94A3B8)', marginTop: '2px' }}>
                Unified styling engine for the entire OrbitoX Platform (Dock, Sidebar, Builder, Tables, Cards, and Badges).
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid var(--ui-border-default, rgba(255, 255, 255, 0.1))',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--ui-text-secondary, #94A3B8)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Section 1: 6 Theme Presets Grid */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ui-text-primary, #FFF)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
              1. Select Platform Theme Preset
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
              {allThemes.map((theme) => {
                const isActive = currentTheme.id === theme.id;
                return (
                  <div
                    key={theme.id}
                    onClick={() => handleSelectTheme(theme.id, theme.name)}
                    style={{
                      background: theme.colors.bgCard,
                      border: isActive
                        ? `2px solid ${theme.colors.accentPrimary}`
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '16px',
                      padding: '16px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      position: 'relative',
                      boxShadow: isActive ? `0 0 20px ${theme.colors.accentGlow}` : 'none',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>{theme.icon}</span>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: theme.colors.textPrimary }}>
                          {theme.name}
                        </span>
                      </div>
                      {isActive && (
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            background: theme.colors.accentPrimary,
                            color: '#000',
                            fontWeight: 800,
                          }}
                        >
                          ACTIVE
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '11px', color: theme.colors.textSecondary, lineHeight: 1.3 }}>
                      {theme.tagline}
                    </div>

                    {/* Color Swatch Dots */}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px', alignItems: 'center' }}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: theme.colors.bgRoot, border: '1px solid rgba(255,255,255,0.2)' }} title="Root Background" />
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: theme.colors.bgCard, border: '1px solid rgba(255,255,255,0.2)' }} title="Card Surface" />
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: theme.colors.accentPrimary, boxShadow: `0 0 8px ${theme.colors.accentGlow}` }} title="Primary Accent" />
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: theme.colors.accentSecondary }} title="Secondary Accent" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Custom Accent Swatches */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ui-text-primary, #FFF)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
              2. Granular Accent Color Override
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {accentSwatches.map((swatch) => (
                <button
                  key={swatch.id}
                  type="button"
                  onClick={() => handleSelectAccent(swatch)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFF',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: swatch.color,
                      boxShadow: `0 0 10px ${swatch.glow}`,
                    }}
                  />
                  <span>{swatch.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Live Component Preview */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ui-text-primary, #FFF)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
              3. Next-Gen Component Real-Time Preview
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Card 1: Metric Widget */}
              <StatMetricWidget
                label="Store GMV Revenue"
                value="₹24,85,900"
                delta="+28.4%"
                deltaType="positive"
                icon={<span>👑</span>}
                subtext="Live reactive metrics powered by Platform Theme"
              />

              {/* Card 2: Interactive UI Controls */}
              <GlassCard padding="md" variant="glow" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ui-text-primary, #FFF)' }}>
                    Interactive Controls
                  </span>
                  <NeonBadge variant="gold" pulse>
                    LIVE PREVIEW
                  </NeonBadge>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <StudioButton variant="primary" size="sm">
                    Primary Action
                  </StudioButton>
                  <StudioButton variant="luxury-gold" size="sm">
                    👑 Royal Action
                  </StudioButton>
                  <StudioButton variant="secondary" size="sm">
                    Glass Secondary
                  </StudioButton>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 28px',
            borderTop: '1px solid var(--ui-border-subtle, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.25)',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--ui-text-secondary, #94A3B8)' }}>
            Active Theme: <strong style={{ color: 'var(--ui-text-accent, #C084FC)' }}>{currentTheme.name}</strong>
          </div>

          <StudioButton variant="primary" size="md" onClick={onClose}>
            ✓ Done & Apply to Platform
          </StudioButton>
        </div>
      </div>
    </div>
  );
}
