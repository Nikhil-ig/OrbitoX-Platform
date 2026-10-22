'use client';

import React, { useState } from 'react';
import {
  Sliders,
  Sparkles,
  Layers,
  Layout,
  Maximize2,
  MoveVertical,
  Eye,
  EyeOff,
  Palette,
  Monitor,
  Tablet,
  Smartphone,
  ChevronDown,
  ChevronRight,
  Activity,
  Wind,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { InspectorSharedProps } from './types';

export function SectionInspector({
  activeScene,
  onUpdateScene,
  onUpdateStyle,
  onUpdateGeometry,
  onOpenRemix,
  activeViewport = 'desktop',
}: InspectorSharedProps) {
  // Collapsible section accordion states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    general: true,
    background: true,
    layout: true,
    spacing: true,
    motion: false,
    visibility: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const currentLayout = activeScene.layoutRules?.[activeViewport] || {
    composition: 'centered',
    paddingTopRem: 4,
    paddingBottomRem: 4,
    contentMaxWidthPx: 1440,
    isOverridden: false,
  };

  // Section background color resolution
  const currentBgColor =
    (activeScene as any).backgroundColor ||
    (activeScene.sceneGraph?.nodes[activeScene.sceneGraph?.rootNodeId || '']?.style?.background as any)?.color?.value ||
    '#0B0F19';

  const handleUpdateBgColor = (colorHex: string) => {
    onUpdateScene(activeScene.id, {
      ...activeScene,
      backgroundColor: colorHex,
    } as any);

    // Also sync to root container node if it exists
    if (activeScene.sceneGraph?.rootNodeId && onUpdateStyle) {
      onUpdateStyle(activeScene.sceneGraph.rootNodeId, {
        background: { type: 'solid', color: { type: 'solid', value: colorHex } },
      });
    }
  };

  const handleUpdateHeight = (val: string) => {
    onUpdateScene(activeScene.id, {
      ...activeScene,
      minHeight: val,
    } as any);

    if (activeScene.sceneGraph?.rootNodeId && onUpdateGeometry) {
      onUpdateGeometry(activeScene.sceneGraph.rootNodeId, {
        minHeight: val,
      });
    }
  };

  const handleUpdatePadding = (side: 'top' | 'bottom', remVal: number) => {
    const updated = {
      ...(activeScene.layoutRules || {
        desktop: { composition: 'centered', paddingTopRem: 4, paddingBottomRem: 4, contentMaxWidthPx: 1440 },
        tablet: { composition: 'centered', paddingTopRem: 4, paddingBottomRem: 4, contentMaxWidthPx: 1200, isOverridden: false },
        mobile: { composition: 'centered', paddingTopRem: 3, paddingBottomRem: 3, contentMaxWidthPx: 1000, isOverridden: false },
      }),
    };

    const currentVpRule = updated[activeViewport] || {
      composition: 'centered',
      paddingTopRem: 4,
      paddingBottomRem: 4,
      contentMaxWidthPx: 1440,
    };

    updated[activeViewport] = {
      ...currentVpRule,
      [side === 'top' ? 'paddingTopRem' : 'paddingBottomRem']: remVal,
      isOverridden: true,
    };

    onUpdateScene(activeScene.id, { layoutRules: updated });

    if (activeScene.sceneGraph?.rootNodeId && onUpdateStyle) {
      const prop = side === 'top' ? 'paddingTop' : 'paddingBottom';
      onUpdateStyle(activeScene.sceneGraph.rootNodeId, {
        [prop]: `${remVal}rem`,
      });
    }
  };

  const handleToggleVisibility = (breakpoint: 'desktop' | 'tablet' | 'mobile') => {
    const currentVis = (activeScene as any).responsiveVisibility || {
      desktop: true,
      tablet: true,
      mobile: true,
    };

    const updatedVis = {
      ...currentVis,
      [breakpoint]: !currentVis[breakpoint],
    };

    onUpdateScene(activeScene.id, {
      ...activeScene,
      responsiveVisibility: updatedVis,
    } as any);
  };

  const currentVisibility = (activeScene as any).responsiveVisibility || {
    desktop: true,
    tablet: true,
    mobile: true,
  };

  return (
    <aside
      id="sz-section-inspector"
      style={{
        width: '320px',
        background: '#121418',
        borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        zIndex: 35,
        userSelect: 'none',
      }}
    >
      {/* ── HEADER ── */}
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#16181F',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={14} style={{ color: '#3B82F6' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F3F4F6' }}>Section Inspector</span>
        </div>
        <span
          style={{
            fontSize: '0.68rem',
            color: '#60A5FA',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            padding: '2px 8px',
            borderRadius: '4px',
            maxWidth: '130px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {activeScene.name || 'Section'}
        </span>
      </div>

      {/* ── SCROLLABLE ACCORDION BODY ── */}
      <div
        className="sz-custom-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* ── 1. GENERAL IDENTITY & ANCHOR ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#9CA3AF' }}>Section Name</label>
            <input
              type="text"
              id="sz-section-name-input"
              value={activeScene.name}
              onChange={(e) => onUpdateScene(activeScene.id, { name: e.target.value })}
              style={{
                background: '#1A1D24',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                padding: '6px 10px',
                color: '#FFFFFF',
                fontSize: '0.76rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#9CA3AF' }}>Navigation Anchor / Title</label>
            <input
              type="text"
              id="sz-section-anchor-input"
              value={activeScene.navigationLabel || activeScene.name}
              onChange={(e) => onUpdateScene(activeScene.id, { navigationLabel: e.target.value })}
              placeholder="#section-id"
              style={{
                background: '#1A1D24',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                padding: '6px 10px',
                color: '#FFFFFF',
                fontSize: '0.76rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Remix Section CTA */}
          {onOpenRemix && (
            <button
              onClick={onOpenRemix}
              id="sz-section-remix-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '7px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15))',
                border: '1px solid rgba(147, 51, 234, 0.35)',
                borderRadius: '6px',
                color: '#C084FC',
                fontSize: '0.74rem',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: '4px',
                transition: 'all 0.15s ease',
              }}
            >
              <Sparkles size={13} />
              <span>Remix Section Art Direction</span>
            </button>
          )}
        </div>

        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.07)' }} />

        {/* ── 2. BACKGROUND & APPEARANCE ── */}
        <div>
          <button
            onClick={() => toggleSection('background')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'transparent',
              border: 'none',
              padding: '4px 0',
              color: '#D1D5DB',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Palette size={13} style={{ color: '#60A5FA' }} />
              <span>Background & Surface</span>
            </div>
            {openSections.background ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>

          {openSections.background && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              {/* Preset Color Swatches */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.66rem', color: '#9CA3AF' }}>Color Themes</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {[
                    { name: 'Dark Void', bg: '#0B0F19' },
                    { name: 'Deep Slate', bg: '#111827' },
                    { name: 'Midnight Blue', bg: '#0F172A' },
                    { name: 'Cosmic Indigo', bg: '#1E1B4B' },
                    { name: 'Emerald Night', bg: '#064E3B' },
                    { name: 'Charcoal', bg: '#18181B' },
                  ].map((swatch) => (
                    <button
                      key={swatch.name}
                      title={swatch.name}
                      onClick={() => handleUpdateBgColor(swatch.bg)}
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: swatch.bg,
                        border: currentBgColor === swatch.bg ? '2px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.2)',
                        cursor: 'pointer',
                        transition: 'transform 0.1s ease',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Custom Color Input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="color"
                  value={currentBgColor.startsWith('#') ? currentBgColor : '#0B0F19'}
                  onChange={(e) => handleUpdateBgColor(e.target.value)}
                  style={{ width: '28px', height: '28px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: 'transparent' }}
                />
                <input
                  type="text"
                  value={currentBgColor}
                  onChange={(e) => handleUpdateBgColor(e.target.value)}
                  placeholder="#0B0F19"
                  style={{
                    flex: 1,
                    background: '#1A1D24',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '5px',
                    padding: '5px 8px',
                    color: '#FFFFFF',
                    fontSize: '0.72rem',
                    outline: 'none',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              {/* Min Height Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>Section Height Mode</label>
                <select
                  value={(activeScene as any).minHeight || 'auto'}
                  onChange={(e) => handleUpdateHeight(e.target.value)}
                  style={{
                    background: '#1A1D24',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    color: '#FFFFFF',
                    fontSize: '0.74rem',
                    outline: 'none',
                  }}
                >
                  <option value="auto">Auto (Fits Content)</option>
                  <option value="100vh">Full Viewport (100vh)</option>
                  <option value="800px">Hero Standard (800px)</option>
                  <option value="600px">Compact Section (600px)</option>
                  <option value="400px">Banner / Ribbon (400px)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.07)' }} />

        {/* ── 3. LAYOUT & SPACING ── */}
        <div>
          <button
            onClick={() => toggleSection('layout')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'transparent',
              border: 'none',
              padding: '4px 0',
              color: '#D1D5DB',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layout size={13} style={{ color: '#10B981' }} />
              <span>Layout & Container</span>
            </div>
            {openSections.layout ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>

          {openSections.layout && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              {/* Composition Mode */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>Composition Grid</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                  {(['centered', 'split', 'editorial'] as const).map((comp) => {
                    const isSelected = currentLayout.composition === comp;
                    return (
                      <button
                        key={comp}
                        onClick={() => {
                          const updated = {
                            ...(activeScene.layoutRules || {
                              desktop: { composition: 'centered', paddingTopRem: 4, paddingBottomRem: 4, contentMaxWidthPx: 1440 },
                              tablet: { composition: 'centered', paddingTopRem: 4, paddingBottomRem: 4, contentMaxWidthPx: 1200, isOverridden: false },
                              mobile: { composition: 'centered', paddingTopRem: 3, paddingBottomRem: 3, contentMaxWidthPx: 1000, isOverridden: false },
                            }),
                          };
                          const currentRule = updated[activeViewport] || {
                            composition: 'centered',
                            paddingTopRem: 4,
                            paddingBottomRem: 4,
                            contentMaxWidthPx: 1440,
                          };
                          updated[activeViewport] = {
                            ...currentRule,
                            composition: comp,
                            isOverridden: true,
                          };
                          onUpdateScene(activeScene.id, { layoutRules: updated });
                        }}
                        style={{
                          padding: '5px 4px',
                          background: isSelected ? 'rgba(59, 130, 246, 0.2)' : '#1A1D24',
                          border: `1px solid ${isSelected ? '#3B82F6' : 'rgba(255,255,255,0.08)'}`,
                          borderRadius: '5px',
                          color: isSelected ? '#60A5FA' : '#9CA3AF',
                          fontSize: '0.7rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          textTransform: 'capitalize',
                        }}
                      >
                        {comp}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Max Width Container */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>Content Max Width</label>
                <select
                  value={currentLayout.contentMaxWidthPx || 1440}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    const updated = {
                      ...(activeScene.layoutRules || {
                        desktop: { composition: 'centered', paddingTopRem: 4, paddingBottomRem: 4, contentMaxWidthPx: 1440 },
                        tablet: { composition: 'centered', paddingTopRem: 4, paddingBottomRem: 4, contentMaxWidthPx: 1200, isOverridden: false },
                        mobile: { composition: 'centered', paddingTopRem: 3, paddingBottomRem: 3, contentMaxWidthPx: 1000, isOverridden: false },
                      }),
                    };
                    const currentRule = updated[activeViewport] || {
                      composition: 'centered',
                      paddingTopRem: 4,
                      paddingBottomRem: 4,
                      contentMaxWidthPx: 1440,
                    };
                    updated[activeViewport] = {
                      ...currentRule,
                      contentMaxWidthPx: val,
                      isOverridden: true,
                    };
                    onUpdateScene(activeScene.id, { layoutRules: updated });
                  }}
                  style={{
                    background: '#1A1D24',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    color: '#FFFFFF',
                    fontSize: '0.74rem',
                    outline: 'none',
                  }}
                >
                  <option value={1440}>1440px (Wide Desktop)</option>
                  <option value={1200}>1200px (Standard SaaS)</option>
                  <option value={1024}>1024px (Narrow Focus)</option>
                  <option value={1920}>Full Bleed (100% Width)</option>
                </select>
              </div>

              {/* Padding Scrubbers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.66rem', color: '#9CA3AF' }}>Padding Top (rem)</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={0.5}
                    value={currentLayout.paddingTopRem ?? 4}
                    onChange={(e) => handleUpdatePadding('top', Number(e.target.value))}
                    style={{
                      background: '#1A1D24',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '5px',
                      padding: '5px 8px',
                      color: '#FFFFFF',
                      fontSize: '0.74rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.66rem', color: '#9CA3AF' }}>Padding Bottom (rem)</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={0.5}
                    value={currentLayout.paddingBottomRem ?? 4}
                    onChange={(e) => handleUpdatePadding('bottom', Number(e.target.value))}
                    style={{
                      background: '#1A1D24',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '5px',
                      padding: '5px 8px',
                      color: '#FFFFFF',
                      fontSize: '0.74rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.07)' }} />

        {/* ── 4. TRANSITIONS & MOTION ── */}
        <div>
          <button
            onClick={() => toggleSection('motion')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'transparent',
              border: 'none',
              padding: '4px 0',
              color: '#D1D5DB',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Wind size={13} style={{ color: '#A855F7' }} />
              <span>Scroll Transition Preset</span>
            </div>
            {openSections.motion ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>

          {openSections.motion && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>Page Transition Effect</label>
                <select
                  value={activeScene.transitionToNext?.type || 'fade'}
                  onChange={(e) =>
                    onUpdateScene(activeScene.id, {
                      transitionToNext: {
                        type: e.target.value as any,
                        durationMs: activeScene.transitionToNext?.durationMs || 800,
                        easing: activeScene.transitionToNext?.easing || 'cubic-bezier(0.16, 1, 0.3, 1)',
                      },
                    })
                  }
                  style={{
                    background: '#1A1D24',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    color: '#FFFFFF',
                    fontSize: '0.74rem',
                    outline: 'none',
                  }}
                >
                  <option value="fade">Instant / Simple Fade</option>
                  <option value="crossfade">Cinematic Crossfade</option>
                  <option value="zoom-depth">Spatial Zoom Depth</option>
                  <option value="parallax-slide">Parallax Push Slide</option>
                  <option value="curtain-reveal">Editorial Curtain Reveal</option>
                </select>
              </div>

              {/* Scroll Mode */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>Section Scroll Behavior</label>
                <select
                  value={activeScene.scrollMode || 'normal'}
                  onChange={(e) =>
                    onUpdateScene(activeScene.id, {
                      scrollMode: e.target.value as any,
                    })
                  }
                  style={{
                    background: '#1A1D24',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    color: '#FFFFFF',
                    fontSize: '0.74rem',
                    outline: 'none',
                  }}
                >
                  <option value="normal">Normal Page Scroll</option>
                  <option value="pinned">Pinned While Content Scrolls</option>
                  <option value="scroll_driven">Scroll-Driven Parallax Depth</option>
                  <option value="horizontal">Horizontal Track Rail</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.07)' }} />

        {/* ── 5. RESPONSIVE BREAKPOINT VISIBILITY ── */}
        <div>
          <button
            onClick={() => toggleSection('visibility')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'transparent',
              border: 'none',
              padding: '4px 0',
              color: '#D1D5DB',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={13} style={{ color: '#F59E0B' }} />
              <span>Breakpoint Visibility</span>
            </div>
            {openSections.visibility ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>

          {openSections.visibility && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
              {[
                { key: 'desktop' as const, label: 'Desktop', icon: Monitor },
                { key: 'tablet' as const, label: 'Tablet', icon: Tablet },
                { key: 'mobile' as const, label: 'Mobile', icon: Smartphone },
              ].map(({ key, label, icon: Icon }) => {
                const isVisible = currentVisibility[key] !== false;
                return (
                  <button
                    key={key}
                    onClick={() => handleToggleVisibility(key)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: '7px 4px',
                      background: isVisible ? 'rgba(59, 130, 246, 0.15)' : '#1A1D24',
                      border: `1px solid ${isVisible ? '#3B82F6' : 'rgba(255, 255, 255, 0.08)'}`,
                      borderRadius: '5px',
                      color: isVisible ? '#60A5FA' : '#6B7280',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    title={`Section visible on ${label}: ${isVisible ? 'Visible' : 'Hidden'}`}
                  >
                    {isVisible ? <Icon size={12} style={{ color: '#3B82F6' }} /> : <EyeOff size={12} style={{ color: '#6B7280' }} />}
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── FOOTER HELPER ── */}
        <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <span style={{ fontSize: '0.68rem', color: '#6B7280', lineHeight: 1.4, display: 'block' }}>
            Tip: Click any child layer (Heading, Card, Button) on the canvas to inspect granular element styles, typography, and box model.
          </span>
        </div>
      </div>
    </aside>
  );
}

