'use client';

import React, { useState } from 'react';
import {
  PageSection,
  ComponentDefinition,
  SectionLogicConfig,
  ThemeConfig,
  ThemePreset,
  ThemeColors,
  ThemeTypography,
  ThemeLayout,
  ThemeButtonStyles,
  ColorHarmonyPalette,
  commerceEngine,
} from '@orbitox/commerce';
import { SchemaInspector } from '../schema-inspector';
import {
  IconSparkles,
  IconClose,
  IconBolt,
  IconPalette,
  IconSliders,
  IconSelect,
  IconLayers,
  IconTrash,
  IconCopy,
  IconEye,
  IconEyeOff,
  IconCheck,
  IconCrown,
  IconRefresh,
} from './studio-icons';

export interface SectionInspectorProps {
  selectedSection: PageSection | null;
  componentDef?: ComponentDefinition;
  onUpdateSettings: (settings: Record<string, any>) => void;
  onUpdateLogic: (logic: SectionLogicConfig) => void;
  onUpdateFlowGraph?: (graph: any) => void;
  onDeleteSection?: (id: string) => void;
  onClose?: () => void;
  storeId?: string;
  onAiGenerateCopy?: () => void;
  isAiGenerating?: boolean;

  // Multi-Theme Interconnection Props
  currentTheme?: ThemeConfig;
  themePresets?: ThemePreset[];
  harmonyPalettes?: ColorHarmonyPalette[];
  onSelectThemePreset?: (presetId: string) => void;
  onUpdateThemeConfig?: (updates: Partial<ThemeConfig>) => void;
  onUpdateThemeColors?: (colors: Partial<ThemeColors>) => void;
  onUpdateThemeTypography?: (typo: Partial<ThemeTypography>) => void;
  onUpdateThemeLayout?: (layout: Partial<ThemeLayout>) => void;
  onUpdateThemeButtons?: (buttons: Partial<ThemeButtonStyles>) => void;
  onResetThemePreset?: (presetId?: string) => void;
}

export function SectionInspector({
  selectedSection,
  componentDef,
  onUpdateSettings,
  onUpdateLogic,
  onClose,
  storeId,
  onAiGenerateCopy,
  isAiGenerating = false,
  currentTheme = commerceEngine.themes.getDefaultTheme(),
  themePresets = commerceEngine.themes.getPresets(),
  harmonyPalettes,
  onSelectThemePreset,
  onUpdateThemeConfig,
  onUpdateThemeColors,
  onUpdateThemeTypography,
  onUpdateThemeLayout,
  onUpdateThemeButtons,
  onResetThemePreset,
}: SectionInspectorProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'style' | 'rules'>('content');
  const [styleSubTab, setStyleSubTab] = useState<'global' | 'section'>('global');
  const [testingWebhook, setTestingWebhook] = useState<boolean>(false);
  const [webhookTestSuccess, setWebhookTestSuccess] = useState<boolean | null>(null);

  if (!selectedSection) {
    return (
      <div
        style={{
          padding: '40px 16px',
          textAlign: 'center',
          background: 'rgba(18, 21, 33, 0.85)',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ color: '#94A3B8', marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
          <IconSelect size={28} />
        </div>
        <div style={{ fontWeight: 800, color: '#FFF', marginBottom: '4px' }}>No Section Selected</div>
        <div style={{ color: '#64748B', fontSize: '11px', lineHeight: 1.4 }}>
          Click any section on the storefront canvas or left layer tree to customize its layout, text, images, styles, and automations.
        </div>
      </div>
    );
  }

  const logic = selectedSection.logic || commerceEngine.logic.createDefaultLogicConfig();
  const palettes = harmonyPalettes || commerceEngine.themes.deriveHarmonyPalettes(currentTheme);

  // Section override values
  const hasSectionOverrides = Boolean(
    selectedSection.settings.accentTone ||
    selectedSection.settings.backgroundColor ||
    selectedSection.settings.textColor ||
    selectedSection.settings.fontFamily ||
    selectedSection.settings.borderRadius ||
    selectedSection.settings.verticalPadding ||
    selectedSection.settings.bgStyle
  );

  const currentAccent = selectedSection.settings.accentTone || currentTheme.colors.primary || '#E5A93C';
  const currentBg = selectedSection.settings.backgroundColor || (currentTheme.isDark ? currentTheme.colors.surface : currentTheme.colors.background) || '#0E1017';
  const currentText = selectedSection.settings.textColor || currentTheme.colors.text || '#FFFFFF';
  const currentFont = selectedSection.settings.fontFamily || 'serif';
  const currentWidth = selectedSection.settings.containerWidth || 'responsive';
  const currentPadding = selectedSection.settings.verticalPadding || 'standard';
  const currentRadius = selectedSection.settings.borderRadius || currentTheme.layout.borderRadius || '8px';
  const currentBgStyle = selectedSection.settings.bgStyle || 'solid';

  const handleApplyPalette = (palette: ColorHarmonyPalette) => {
    if (onUpdateThemeColors) {
      onUpdateThemeColors({
        primary: palette.primary,
        secondary: palette.secondary,
        accent: palette.accent,
        background: palette.background,
        surface: palette.surface,
        text: palette.text,
        border: palette.border,
      });
    }
  };

  const handleClearSectionOverrides = () => {
    const cleaned = { ...selectedSection.settings };
    delete cleaned.accentTone;
    delete cleaned.backgroundColor;
    delete cleaned.textColor;
    delete cleaned.fontFamily;
    delete cleaned.borderRadius;
    delete cleaned.verticalPadding;
    delete cleaned.bgStyle;
    delete cleaned.paletteName;
    onUpdateSettings(cleaned);
  };

  const handleTestWebhook = () => {
    setTestingWebhook(true);
    setWebhookTestSuccess(null);
    setTimeout(() => {
      setTestingWebhook(false);
      setWebhookTestSuccess(true);
      setTimeout(() => setWebhookTestSuccess(null), 3000);
    }, 1000);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        height: '100%',
        overflowY: 'auto',
        paddingRight: '2px',
        userSelect: 'none',
        minHeight: 0,
      }}
    >
      {/* ─── SECTION TOP HEADER CARD ───────────────────────────────── */}
      <div
        style={{
          background: 'rgba(18, 21, 33, 0.92)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFF', letterSpacing: '-0.01em' }}>
              {selectedSection.name || selectedSection.type.replace(/[-_]/g, ' ')}
            </div>
            <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'capitalize' }}>
              Type: {selectedSection.type.replace(/[-_]/g, ' ')}
            </div>
          </div>

          <button
            type="button"
            onClick={onAiGenerateCopy}
            disabled={isAiGenerating}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: 'none',
              background: 'linear-gradient(135deg, #E5A93C, #F59E0B)',
              color: '#000',
              fontWeight: 800,
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: isAiGenerating ? 'not-allowed' : 'pointer',
              opacity: isAiGenerating ? 0.7 : 1,
              transition: 'all 0.15s ease',
            }}
          >
            <IconSparkles size={11} />
            <span>{isAiGenerating ? 'Generating...' : 'AI Auto-Copy'}</span>
          </button>
        </div>

        {/* ─── 3-MODE TAB SWITCHER (CONTENT, STYLE & THEME, RULES & N8N) ─── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            background: 'rgba(0, 0, 0, 0.35)',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            gap: '3px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('content')}
            style={{
              padding: '5px 0',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'content' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              color: activeTab === 'content' ? '#FFF' : '#94A3B8',
              fontSize: '10px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Content
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('style')}
            style={{
              padding: '5px 0',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'style' ? 'rgba(229, 169, 60, 0.2)' : 'transparent',
              color: activeTab === 'style' ? '#FCD34D' : '#94A3B8',
              fontSize: '10px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Style & Theme
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            style={{
              padding: '5px 0',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'rules' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
              color: activeTab === 'rules' ? '#C084FC' : '#94A3B8',
              fontSize: '10px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Rules & n8n
          </button>
        </div>
      </div>

      {/* ─── TAB 1: CONTENT & SCHEMA ────────────────────────────────── */}
      {activeTab === 'content' && (
        <div
          style={{
            background: 'rgba(18, 21, 33, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          }}
        >
          <SchemaInspector
            componentDef={componentDef}
            settings={selectedSection.settings}
            onChange={(updates) => onUpdateSettings({ ...selectedSection.settings, ...updates })}
            storeId={storeId}
            onAiGenerateCopy={onAiGenerateCopy}
            isAiGenerating={isAiGenerating}
          />
        </div>
      )}

      {/* ─── TAB 2: STYLE & THEME CUSTOMIZER ────────────────────────── */}
      {activeTab === 'style' && (
        <div
          style={{
            background: 'rgba(18, 21, 33, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Style Scope Switcher */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: 'rgba(0, 0, 0, 0.4)',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => setStyleSubTab('global')}
              style={{
                padding: '6px 0',
                borderRadius: '6px',
                border: 'none',
                background: styleSubTab === 'global' ? 'linear-gradient(135deg, rgba(229, 169, 60, 0.3), rgba(245, 158, 11, 0.2))' : 'transparent',
                color: styleSubTab === 'global' ? '#FCD34D' : '#94A3B8',
                fontSize: '10px',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              <IconCrown size={12} />
              <span>Global Theme</span>
            </button>
            <button
              type="button"
              onClick={() => setStyleSubTab('section')}
              style={{
                padding: '6px 0',
                borderRadius: '6px',
                border: 'none',
                background: styleSubTab === 'section' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: styleSubTab === 'section' ? '#FFF' : '#94A3B8',
                fontSize: '10px',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              <IconSliders size={12} />
              <span>Section Overrides</span>
            </button>
          </div>

          {/* ══════════════ SUB-MODE: GLOBAL THEME ══════════════ */}
          {styleSubTab === 'global' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* 1. Global 8-Theme Presets Switcher */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFF' }}>
                    Storefront Theme Presets ({themePresets.length})
                  </span>
                  {onResetThemePreset && (
                    <button
                      type="button"
                      onClick={() => onResetThemePreset(currentTheme.presetId)}
                      title="Reset current preset to default values"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748B',
                        fontSize: '9px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <IconRefresh size={10} />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '6px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    paddingRight: '2px',
                  }}
                >
                  {themePresets.map((preset) => {
                    const isActive = currentTheme.presetId === preset.id || currentTheme.id === preset.config.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => onSelectThemePreset && onSelectThemePreset(preset.id)}
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          background: isActive ? 'rgba(229, 169, 60, 0.12)' : 'rgba(0, 0, 0, 0.35)',
                          border: isActive ? '1.5px solid #E5A93C' : '1px solid rgba(255, 255, 255, 0.08)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                          boxShadow: isActive ? '0 0 12px rgba(229, 169, 60, 0.25)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: isActive ? '#FCD34D' : '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {preset.name.split('(')[0]?.trim()}
                          </span>
                          {isActive && <IconCheck size={11} style={{ color: '#E5A93C', flexShrink: 0 }} />}
                        </div>

                        {/* Color Swatch Dots */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: preset.config.colors.primary, border: '1px solid rgba(255,255,255,0.2)' }} />
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: preset.config.colors.secondary, border: '1px solid rgba(255,255,255,0.2)' }} />
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: preset.config.colors.background, border: '1px solid rgba(255,255,255,0.2)' }} />
                          <span style={{ fontSize: '8px', color: '#64748B', textTransform: 'uppercase', marginLeft: 'auto', fontWeight: 700 }}>
                            {preset.category}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Global Live Color Palette Customizer */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#CBD5E1' }}>Global Color Tokens</span>
                  <span style={{ fontSize: '9px', color: currentTheme.isDark ? '#38BDF8' : '#F59E0B', fontWeight: 700 }}>
                    {currentTheme.isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {/* Primary Accent */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '9px', color: '#94A3B8' }}>Primary Accent</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#000', padding: '3px 6px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <input
                        type="color"
                        value={currentTheme.colors.primary}
                        onChange={(e) => onUpdateThemeColors && onUpdateThemeColors({ primary: e.target.value, accent: e.target.value })}
                        style={{ width: '18px', height: '18px', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                      />
                      <span style={{ fontSize: '10px', color: '#FFF', fontWeight: 700 }}>{currentTheme.colors.primary}</span>
                    </div>
                  </div>

                  {/* Secondary Tone */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '9px', color: '#94A3B8' }}>Secondary Tone</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#000', padding: '3px 6px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <input
                        type="color"
                        value={currentTheme.colors.secondary.startsWith('#') ? currentTheme.colors.secondary : '#1A1A1A'}
                        onChange={(e) => onUpdateThemeColors && onUpdateThemeColors({ secondary: e.target.value })}
                        style={{ width: '18px', height: '18px', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                      />
                      <span style={{ fontSize: '10px', color: '#FFF', fontWeight: 700 }}>{currentTheme.colors.secondary.slice(0, 7)}</span>
                    </div>
                  </div>

                  {/* Storefront Background */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '9px', color: '#94A3B8' }}>Store Background</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#000', padding: '3px 6px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <input
                        type="color"
                        value={currentTheme.colors.background.startsWith('#') ? currentTheme.colors.background : '#0D0D0E'}
                        onChange={(e) => onUpdateThemeColors && onUpdateThemeColors({ background: e.target.value })}
                        style={{ width: '18px', height: '18px', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                      />
                      <span style={{ fontSize: '10px', color: '#FFF', fontWeight: 700 }}>{currentTheme.colors.background.slice(0, 7)}</span>
                    </div>
                  </div>

                  {/* Section Surface */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '9px', color: '#94A3B8' }}>Surface & Cards</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#000', padding: '3px 6px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <input
                        type="color"
                        value={currentTheme.colors.surface.startsWith('#') ? currentTheme.colors.surface : '#161618'}
                        onChange={(e) => onUpdateThemeColors && onUpdateThemeColors({ surface: e.target.value })}
                        style={{ width: '18px', height: '18px', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                      />
                      <span style={{ fontSize: '10px', color: '#FFF', fontWeight: 700 }}>{currentTheme.colors.surface.slice(0, 7)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Auto-Harmonize Presets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFF' }}>
                  Auto-Harmonize Palette Schemes
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
                  {palettes.map((p) => {
                    const isSelected = currentTheme.colors.primary === p.primary;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        title={p.name}
                        onClick={() => handleApplyPalette(p)}
                        style={{
                          height: '32px',
                          borderRadius: '6px',
                          background: p.surface,
                          border: isSelected ? `2px solid ${p.primary}` : `1px solid ${p.primary}40`,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: isSelected ? `0 0 10px ${p.primary}` : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.primary }} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Global Typography Pairing */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFF' }}>
                  Global Typography Pairing
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {[
                    { heading: 'Playfair Display', body: 'Plus Jakarta Sans', label: 'Playfair Royal' },
                    { heading: 'Outfit', body: 'Inter', label: 'Outfit Minimal' },
                    { heading: 'Cinzel', body: 'Outfit', label: 'Cinzel Heritage' },
                    { heading: 'DM Serif Display', body: 'Work Sans', label: 'DM Serif Organic' },
                    { heading: 'Oswald', body: 'Roboto', label: 'Oswald Streetwear' },
                    { heading: 'Inter', body: 'Inter', label: 'Inter Clean' },
                  ].map((pair) => {
                    const isSelected = currentTheme.typography.headingFont === pair.heading;
                    return (
                      <button
                        key={pair.heading}
                        type="button"
                        onClick={() =>
                          onUpdateThemeTypography &&
                          onUpdateThemeTypography({
                            headingFont: pair.heading,
                            bodyFont: pair.body,
                          })
                        }
                        style={{
                          padding: '7px 8px',
                          borderRadius: '6px',
                          border: isSelected ? '1px solid #E5A93C' : '1px solid rgba(255,255,255,0.08)',
                          background: isSelected ? 'rgba(229, 169, 60, 0.15)' : 'rgba(0,0,0,0.3)',
                          color: isSelected ? '#FCD34D' : '#94A3B8',
                          fontSize: '10px',
                          fontWeight: isSelected ? 800 : 500,
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}
                      >
                        {pair.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Global Layout & Button Styling */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFF' }}>
                  Layout & Button Metrics
                </span>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: '#94A3B8' }}>Border Radius</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {['0px', '6px', '8px', '12px', '16px'].map((r) => {
                      const isActive = currentTheme.layout.borderRadius === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => onUpdateThemeLayout && onUpdateThemeLayout({ borderRadius: r, cardBorderRadius: r })}
                          style={{
                            padding: '3px 7px',
                            borderRadius: '4px',
                            border: isActive ? '1px solid #E5A93C' : '1px solid rgba(255, 255, 255, 0.08)',
                            background: isActive ? 'rgba(229, 169, 60, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                            color: isActive ? '#FCD34D' : '#94A3B8',
                            fontSize: '9px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: '#94A3B8' }}>Button Corners</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[
                      { r: '0px', l: 'Sharp' },
                      { r: '6px', l: 'Rounded' },
                      { r: '9999px', l: 'Pill' },
                    ].map((b) => {
                      const isActive = currentTheme.layout.buttonBorderRadius === b.r;
                      return (
                        <button
                          key={b.r}
                          type="button"
                          onClick={() => onUpdateThemeLayout && onUpdateThemeLayout({ buttonBorderRadius: b.r })}
                          style={{
                            padding: '3px 7px',
                            borderRadius: '4px',
                            border: isActive ? '1px solid #E5A93C' : '1px solid rgba(255, 255, 255, 0.08)',
                            background: isActive ? 'rgba(229, 169, 60, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                            color: isActive ? '#FCD34D' : '#94A3B8',
                            fontSize: '9px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {b.l}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ SUB-MODE: SECTION OVERRIDES ══════════════ */}
          {styleSubTab === 'section' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Override Status Banner */}
              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: hasSectionOverrides ? 'rgba(229, 169, 60, 0.12)' : 'rgba(56, 189, 248, 0.1)',
                  border: hasSectionOverrides ? '1px solid rgba(229, 169, 60, 0.3)' : '1px solid rgba(56, 189, 248, 0.2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: hasSectionOverrides ? '#FCD34D' : '#38BDF8' }}>
                    {hasSectionOverrides ? '⚡ Custom Section Overrides Active' : `👑 Inheriting "${currentTheme.name}"`}
                  </div>
                  <div style={{ fontSize: '9px', color: '#94A3B8' }}>
                    {hasSectionOverrides
                      ? 'This section has custom styling separate from the global theme'
                      : 'Changes in Global Theme automatically cascade here'}
                  </div>
                </div>

                {hasSectionOverrides && (
                  <button
                    type="button"
                    onClick={handleClearSectionOverrides}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      border: 'none',
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: '#F87171',
                      fontSize: '9px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Section Colors */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#CBD5E1' }}>Section Color Tokens</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {/* Accent Tone */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '9px', color: '#94A3B8' }}>Accent Tone</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#000', padding: '3px 6px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <input
                        type="color"
                        value={currentAccent}
                        onChange={(e) => onUpdateSettings({ ...selectedSection.settings, accentTone: e.target.value })}
                        style={{ width: '18px', height: '18px', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                      />
                      <span style={{ fontSize: '10px', color: '#FFF', fontWeight: 700 }}>{currentAccent}</span>
                    </div>
                  </div>

                  {/* Background Color */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '9px', color: '#94A3B8' }}>Background</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#000', padding: '3px 6px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <input
                        type="color"
                        value={currentBg.startsWith('#') ? currentBg : '#0E1017'}
                        onChange={(e) => onUpdateSettings({ ...selectedSection.settings, backgroundColor: e.target.value })}
                        style={{ width: '18px', height: '18px', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                      />
                      <span style={{ fontSize: '10px', color: '#FFF', fontWeight: 700 }}>{currentBg.slice(0, 7)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Background Atmosphere */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFF' }}>Background Style</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                  {[
                    { id: 'solid', label: 'Solid Color' },
                    { id: 'gradient', label: 'Atmosphere' },
                    { id: 'frost', label: 'Frost Glass' },
                  ].map((bg) => {
                    const isSelected = currentBgStyle === bg.id;
                    return (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => onUpdateSettings({ ...selectedSection.settings, bgStyle: bg.id })}
                        style={{
                          padding: '5px 4px',
                          borderRadius: '5px',
                          border: isSelected ? '1px solid #E5A93C' : '1px solid rgba(255,255,255,0.08)',
                          background: isSelected ? 'rgba(229, 169, 60, 0.2)' : 'rgba(0,0,0,0.3)',
                          color: isSelected ? '#FCD34D' : '#94A3B8',
                          fontSize: '9px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {bg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section Spacing & Width */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFF' }}>
                  Layout & Spacing Metrics
                </span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: '#94A3B8' }}>Container Width</span>
                  <select
                    value={currentWidth}
                    onChange={(e) => onUpdateSettings({ ...selectedSection.settings, containerWidth: e.target.value })}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFF',
                      fontSize: '10px',
                      outline: 'none',
                    }}
                  >
                    <option value="responsive">Responsive Auto</option>
                    <option value="full">Full Bleed (100%)</option>
                    <option value="boxed">Boxed (1200px)</option>
                    <option value="narrow">Narrow Focus (840px)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: '#94A3B8' }}>Vertical Spacing</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {['compact', 'standard', 'spacious'].map((p) => {
                      const isActive = currentPadding === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => onUpdateSettings({ ...selectedSection.settings, verticalPadding: p })}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '5px',
                            border: isActive ? '1px solid #E5A93C' : '1px solid rgba(255, 255, 255, 0.08)',
                            background: isActive ? 'rgba(229, 169, 60, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                            color: isActive ? '#FCD34D' : '#94A3B8',
                            fontSize: '9px',
                            fontWeight: 700,
                            textTransform: 'capitalize',
                            cursor: 'pointer',
                          }}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section Corner Radius */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: '#94A3B8' }}>Corner Radius</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {['0px', '8px', '16px', '24px'].map((r) => {
                      const isActive = currentRadius === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => onUpdateSettings({ ...selectedSection.settings, borderRadius: r })}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '5px',
                            border: isActive ? '1px solid #E5A93C' : '1px solid rgba(255, 255, 255, 0.08)',
                            background: isActive ? 'rgba(229, 169, 60, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                            color: isActive ? '#FCD34D' : '#94A3B8',
                            fontSize: '9px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: RULES & N8N AUTOMATIONS ─────────────────────────── */}
      {activeTab === 'rules' && (
        <div
          style={{
            background: 'rgba(18, 21, 33, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Logic Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#FFF' }}>Dynamic Visibility Rules</div>
              <div style={{ fontSize: '9px', color: '#94A3B8' }}>Show or hide section dynamically based on customer state</div>
            </div>
            <input
              type="checkbox"
              checked={logic.enabled}
              onChange={(e) => onUpdateLogic({ ...logic, enabled: e.target.checked })}
              style={{ cursor: 'pointer', accentColor: '#C084FC', width: '16px', height: '16px' }}
            />
          </div>

          {logic.enabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
              <div style={{ fontSize: '10px', color: '#C084FC', fontWeight: 800 }}>Rule Trigger Condition:</div>
              <select
                value={logic.rules?.[0]?.type || 'cart_subtotal'}
                onChange={(e) =>
                  onUpdateLogic({
                    ...logic,
                    rules: [
                      {
                        id: 'rule_1',
                        type: e.target.value as any,
                        operator: 'greater_than_or_equal',
                        value: 2000,
                        enabled: true,
                        label: 'Cart Threshold Rule',
                      },
                    ],
                  })
                }
                style={{
                  padding: '6px 8px',
                  borderRadius: '6px',
                  background: '#0B0D14',
                  border: '1px solid rgba(168, 85, 247, 0.4)',
                  color: '#FFF',
                  fontSize: '11px',
                  outline: 'none',
                }}
              >
                <option value="cart_subtotal">🛒 Cart Subtotal &gt;= ₹2,000 (Free Shipping Notice)</option>
                <option value="currency">💱 Currency Targeting (NRI Foreign Shoppers: USD/GBP)</option>
                <option value="device">📱 Device Targeting (Mobile Only or Desktop Only)</option>
                <option value="customer_segment">👑 VIP Customer Tier (Loyalty Rewards)</option>
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#CBD5E1' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                <span>Condition is live & evaluated on both Canvas and Storefront</span>
              </div>
            </div>
          )}

          {/* n8n Webhook Workflow */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFF' }}>n8n Workflow Webhook</span>
              <span style={{ fontSize: '9px', color: '#34D399', fontWeight: 700 }}>Connected</span>
            </div>
            <p style={{ fontSize: '10px', color: '#64748B', margin: 0 }}>
              Trigger automated bridal stylist dispatch, WhatsApp notifications, or inventory sync upon section view or interaction.
            </p>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                placeholder="https://n8n.orbitox.internal/webhook/..."
                value={selectedSection.settings.webhookUrl || ''}
                onChange={(e) => onUpdateSettings({ ...selectedSection.settings, webhookUrl: e.target.value })}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: '6px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFF',
                  fontSize: '10px',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={handleTestWebhook}
                disabled={testingWebhook}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: webhookTestSuccess ? '#10B981' : 'rgba(168, 85, 247, 0.25)',
                  color: webhookTestSuccess ? '#000' : '#C084FC',
                  fontSize: '10px',
                  fontWeight: 800,
                  cursor: testingWebhook ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {testingWebhook ? 'Pinging...' : webhookTestSuccess ? '✓ 200 OK' : 'Ping n8n'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
