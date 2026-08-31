'use client';

import React, { useState } from 'react';
import { useCommerceStore, useCommerceTheme, commerceEngine } from '@orbitox/commerce';

export default function ThemeStudioPage() {
  const { store, updateStore } = useCommerceStore();
  const storeId = store?.id || 'store_aura_luxury';
  const { presets, currentTheme, selectPreset, updateThemeConfig } = useCommerceTheme(store?.activeThemeId);

  // Reference 2 State
  const [themeMode, setThemeMode] = useState<'auto' | 'light' | 'dark'>('dark');
  const [selectedAccent, setSelectedAccent] = useState<string>('coral');
  const [density, setDensity] = useState<number>(2); // 0: Relaxed, 1: Standard, 2: Tight
  const [fontFamily, setFontFamily] = useState<string>('SF Pro');
  const [cornerRadius, setCornerRadius] = useState<number>(12);
  const [smoothAnimations, setSmoothAnimations] = useState<boolean>(true);
  const [boldFocusRings, setBoldFocusRings] = useState<boolean>(false);
  const [showGridLines, setShowGridLines] = useState<boolean>(true);
  const [compactSidebar, setCompactSidebar] = useState<boolean>(false);
  const [activeNavTab, setActiveNavTab] = useState<string>('themes');
  const [toastMessage, setToastMessage] = useState<string | null>('Theme updated');

  const accentSwatches = [
    { id: 'blue', name: 'Royal Blue', color: '#3B82F6', glow: 'rgba(59, 130, 246, 0.5)' },
    { id: 'emerald', name: 'Emerald', color: '#10B981', glow: 'rgba(16, 185, 129, 0.5)' },
    { id: 'amber', name: 'Golden Amber', color: '#F59E0B', glow: 'rgba(245, 158, 11, 0.5)' },
    { id: 'orange', name: 'Sunset Orange', color: '#F97316', glow: 'rgba(249, 115, 22, 0.5)' },
    { id: 'ruby', name: 'Imperial Ruby', color: '#EF4444', glow: 'rgba(239, 68, 68, 0.5)' },
    { id: 'violet', name: 'Deep Violet', color: '#A855F7', glow: 'rgba(168, 85, 247, 0.5)' },
    { id: 'cyan', name: 'Electric Cyan', color: '#06B6D4', glow: 'rgba(6, 182, 212, 0.5)' },
    { id: 'coral', name: 'Coral', color: '#FF6B4A', glow: 'rgba(255, 107, 74, 0.6)' },
  ];

  const currentAccentObj = accentSwatches.find(s => s.id === selectedAccent) || accentSwatches[7]!;

  const handleSelectAccent = (swatch: typeof accentSwatches[0]) => {
    setSelectedAccent(swatch.id);
    updateThemeConfig({
      colors: {
        ...currentTheme.colors,
        primary: swatch.color,
        accent: swatch.color,
      },
    });
    setToastMessage(`Theme updated to ${swatch.name}`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const navItems = [
    { id: 'profile', label: 'Profile', badge: '1', icon: '👤' },
    { id: 'team', label: 'Team', badge: '5', icon: '👥' },
    { id: 'alerts', label: 'Alerts', badge: '3', icon: '🔔' },
    { id: 'security', label: 'Security', icon: '🛡️' },
    { id: 'themes', label: 'Themes', icon: '🎨', active: true },
    { id: 'connections', label: 'Connections', badge: '2', icon: '🔗' },
    { id: 'subscription', label: 'Subscription', icon: '💳' },
    { id: 'shortcuts', label: 'Shortcuts', icon: '⌨️' },
    { id: 'devtools', label: 'Dev Tools', icon: '🛠️' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        minHeight: '85vh',
        color: '#FFF',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
      }}
    >
      {/* Reference 2 Glass Container */}
      <div
        style={{
          width: '100%',
          maxWidth: '1200px',
          background: 'linear-gradient(180deg, rgba(20, 22, 34, 0.92) 0%, rgba(12, 14, 22, 0.96) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.8), 0 0 50px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          display: 'grid',
          gridTemplateColumns: '220px 1fr 1.15fr',
          overflow: 'hidden',
          minHeight: '720px',
        }}
      >
        {/* Column 1: Left Settings Navigation */}
        <div
          style={{
            borderRight: '1px solid rgba(255, 255, 255, 0.06)',
            padding: '24px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {navItems.map((item) => {
            const isActive = activeNavTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveNavTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: isActive ? `1px solid ${currentAccentObj.color}` : '1px solid transparent',
                  background: isActive
                    ? `linear-gradient(90deg, ${currentAccentObj.glow} 0%, rgba(255, 255, 255, 0.02) 100%)`
                    : 'transparent',
                  color: isActive ? '#FFFFFF' : '#94A3B8',
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: isActive ? `0 0 16px ${currentAccentObj.glow}` : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '14px' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '1px 6px',
                      borderRadius: '999px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#94A3B8',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Column 2: Theme Settings Controls */}
        <div
          style={{
            padding: '28px 24px',
            borderRight: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '22px',
            overflowY: 'auto',
          }}
        >
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
              Themes
            </h2>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>
              Customize the visual style of your workspace.
            </p>
          </div>

          {/* 1. Theme Mode Segmented Switch */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(0, 0, 0, 0.5)',
              padding: '4px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            {(['auto', 'light', 'dark'] as const).map((mode) => {
              const isActive = themeMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setThemeMode(mode)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: '8px',
                    border: 'none',
                    background: isActive ? currentAccentObj.color : 'transparent',
                    color: isActive ? '#FFFFFF' : '#94A3B8',
                    fontWeight: 700,
                    fontSize: '13px',
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                    boxShadow: isActive ? `0 0 18px ${currentAccentObj.glow}` : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {mode}
                </button>
              );
            })}
          </div>

          {/* 2. Accent Color Palette */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: '10px' }}>
              Accent color
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {accentSwatches.map((swatch) => {
                const isSelected = selectedAccent === swatch.id;
                return (
                  <div
                    key={swatch.id}
                    onClick={() => handleSelectAccent(swatch)}
                    style={{
                      position: 'relative',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: swatch.color,
                      cursor: 'pointer',
                      boxShadow: isSelected
                        ? `0 0 0 3px rgba(255, 255, 255, 0.2), 0 0 20px ${swatch.glow}`
                        : `0 0 10px ${swatch.glow}`,
                      transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isSelected && (
                      <span style={{ fontSize: '12px', color: '#FFF', fontWeight: 900 }}>✓</span>
                    )}
                  </div>
                );
              })}
            </div>
            <span style={{ fontSize: '11px', color: currentAccentObj.color, fontWeight: 700, marginTop: '8px', display: 'block' }}>
              {currentAccentObj.name} Selected
            </span>
          </div>

          {/* 3. Density Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8' }}>Density</span>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={1}
              value={density}
              onChange={(e) => setDensity(Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: currentAccentObj.color,
                cursor: 'pointer',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
              <span>Relaxed</span>
              <span>Standard</span>
              <span>Tight</span>
            </div>
          </div>

          {/* 4. Font Family Dropdown */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: '8px' }}>
              Font
            </label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#FFF',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="SF Pro">SF Pro (Apple Design)</option>
              <option value="Inter">Inter (Clean Neutral)</option>
              <option value="Outfit">Outfit (Modern SaaS)</option>
              <option value="Playfair Display">Playfair Display (Luxury Editorial)</option>
              <option value="DM Serif Display">DM Serif (Imperial Heritage)</option>
            </select>
          </div>

          {/* 5. Corner Radius Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8' }}>Corner radius</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFF' }}>{cornerRadius}px</span>
            </div>
            <input
              type="range"
              min={4}
              max={16}
              step={4}
              value={cornerRadius}
              onChange={(e) => setCornerRadius(Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: currentAccentObj.color,
                cursor: 'pointer',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
              <span>4</span>
              <span>8</span>
              <span>12</span>
              <span>16</span>
            </div>
          </div>

          {/* 6. Neon Glowing Switches */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              {
                id: 'smooth-anim',
                label: 'Smooth animations',
                desc: 'Enable fluid transitions for design elements.',
                checked: smoothAnimations,
                toggle: () => setSmoothAnimations(!smoothAnimations),
              },
              {
                id: 'bold-focus',
                label: 'Bold focus rings',
                desc: 'Increase visibility of selected layers and tools.',
                checked: boldFocusRings,
                toggle: () => setBoldFocusRings(!boldFocusRings),
              },
              {
                id: 'grid-lines',
                label: 'Show grid lines',
                desc: 'Display layout grids for precise alignment.',
                checked: showGridLines,
                toggle: () => setShowGridLines(!showGridLines),
              },
              {
                id: 'compact-sidebar',
                label: 'Use compact sidebar icons',
                desc: 'Maximize canvas space for your projects.',
                checked: compactSidebar,
                toggle: () => setCompactSidebar(!compactSidebar),
              },
            ].map((sw) => (
              <div
                key={sw.id}
                onClick={sw.toggle}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>{sw.label}</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>{sw.desc}</div>
                </div>
                {/* Glowing Toggle Pill */}
                <div
                  style={{
                    width: '42px',
                    height: '24px',
                    borderRadius: '999px',
                    background: sw.checked ? currentAccentObj.color : 'rgba(255, 255, 255, 0.15)',
                    boxShadow: sw.checked ? `0 0 14px ${currentAccentObj.glow}` : 'none',
                    position: 'relative',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: '#FFF',
                      position: 'absolute',
                      top: '3px',
                      left: sw.checked ? '21px' : '3px',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Live Miniature Preview Window (Reference 2) */}
        <div
          style={{
            padding: '24px',
            background: 'rgba(8, 9, 14, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'relative',
          }}
        >
          {/* Mock Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: `${cornerRadius}px`,
                padding: '6px 12px',
                fontSize: '11px',
                color: '#64748B',
              }}
            >
              🔍 Search designs, assets, team
            </div>
            <button
              type="button"
              style={{
                padding: '6px 12px',
                borderRadius: `${cornerRadius}px`,
                background: currentAccentObj.color,
                color: '#FFF',
                border: 'none',
                fontSize: '11px',
                fontWeight: 700,
                boxShadow: `0 0 14px ${currentAccentObj.glow}`,
                cursor: 'pointer',
              }}
            >
              New design
            </button>
            <button
              type="button"
              style={{
                padding: '6px 10px',
                borderRadius: `${cornerRadius}px`,
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#FFF',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Add collaborator
            </button>
          </div>

          {/* Projects Subheader */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700 }}>
              <span>Projects</span>
              <span style={{ fontSize: '10px', color: '#64748B' }}>▼</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748B' }}>Tight ▼</div>
          </div>

          {/* Live Preview Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              flex: 1,
              position: 'relative',
              backgroundImage: showGridLines
                ? 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)'
                : 'none',
              backgroundSize: '16px 16px',
              padding: '10px',
              borderRadius: `${cornerRadius}px`,
              border: showGridLines ? '1px dashed rgba(255, 255, 255, 0.06)' : 'none',
            }}
          >
            {[
              { id: '1', title: 'Homescreen', color: 'linear-gradient(135deg, #FF6B4A, #F59E0B)' },
              { id: '2', title: 'Dashboard', color: 'linear-gradient(135deg, #A855F7, #3B82F6)' },
              { id: '3', title: 'Design System', color: 'linear-gradient(135deg, #10B981, #06B6D4)' },
              { id: '4', title: 'Mobile App', color: 'linear-gradient(135deg, #EC4899, #8B5CF6)' },
              { id: '5', title: 'Storefront', color: 'linear-gradient(135deg, #E5A93C, #D4942A)' },
              { id: '6', title: 'Checkout HUD', color: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' },
            ].map((card) => (
              <div
                key={card.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: `${cornerRadius}px`,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '8px',
                  boxShadow: boldFocusRings ? `0 0 0 2px ${currentAccentObj.color}` : 'none',
                  transition: smoothAnimations ? 'all 0.25s ease' : 'none',
                }}
              >
                <div style={{ height: '48px', borderRadius: `${Math.max(4, cornerRadius - 4)}px`, background: card.color }} />
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#FFF' }}>{card.title}</span>
                <span style={{ fontSize: '8px', color: '#64748B' }}>Edited 5m ago</span>
              </div>
            ))}
          </div>

          {/* Timeline Animation Keyframes (Reference 2) */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: `${cornerRadius}px`,
              padding: '10px 14px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748B' }}>
              <span>0s</span>
              <span>0.5s</span>
              <span>1.0s</span>
              <span>1.5s</span>
              <span>2.0s</span>
            </div>
            {/* Timeline Scrub Track */}
            <div style={{ position: 'relative', height: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '20%',
                  width: '45%',
                  height: '100%',
                  background: currentAccentObj.color,
                  borderRadius: '4px',
                  boxShadow: `0 0 10px ${currentAccentObj.glow}`,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '42%',
                  top: '-4px',
                  width: '4px',
                  height: '20px',
                  background: '#FFF',
                  borderRadius: '2px',
                  boxShadow: '0 0 6px rgba(255, 255, 255, 0.8)',
                }}
              />
            </div>
          </div>

          {/* Floating Toast Notification (Reference 2) */}
          {toastMessage && (
            <div
              style={{
                position: 'absolute',
                bottom: '24px',
                right: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: `${cornerRadius}px`,
                background: 'rgba(20, 22, 34, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: `0 10px 25px rgba(0, 0, 0, 0.8), 0 0 20px ${currentAccentObj.glow}`,
                fontSize: '11px',
                fontWeight: 700,
                color: '#FFF',
                animation: 'fadeIn 0.25s ease-out',
                zIndex: 10,
              }}
            >
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: currentAccentObj.color }} />
              <span>{toastMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
