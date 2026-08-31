import { ThemeConfig, ThemePreset, SectionStyleOverrides, ResolvedSectionStyle, ColorHarmonyPalette } from '../../types/theme.types';
import { COMMERCE_THEME_PRESETS } from './theme.presets';

const THEME_STORAGE_KEY = 'orbitox_commerce_themes';

export class ThemeEngine {
  private customThemes: Map<string, ThemeConfig> = new Map();

  constructor() {
    this.hydrateFromStorage();
  }

  private hydrateFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(THEME_STORAGE_KEY);
      if (raw) {
        const obj = JSON.parse(raw);
        for (const [k, v] of Object.entries(obj)) {
          this.customThemes.set(k, v as ThemeConfig);
        }
      }
    } catch (e) {
      console.warn('[ThemeEngine] Failed to hydrate themes from localStorage', e);
    }
  }

  private persistToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const obj = Object.fromEntries(this.customThemes.entries());
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(obj));
      window.dispatchEvent(new CustomEvent('orbitox:theme_updated', { detail: obj }));
    } catch (e) {
      console.warn('[ThemeEngine] Failed to persist themes to localStorage', e);
    }
  }

  getPresets(): ThemePreset[] {
    return COMMERCE_THEME_PRESETS;
  }

  getPresetById(presetId: string): ThemePreset | undefined {
    this.hydrateFromStorage();
    const custom = this.customThemes.get(presetId);
    if (custom) {
      const base = COMMERCE_THEME_PRESETS.find((p) => p.id === presetId);
      return {
        id: presetId,
        name: base?.name || custom.name || 'Custom Theme',
        category: base?.category || 'luxury',
        description: base?.description || 'Customized Design Tokens',
        config: custom,
      };
    }
    return COMMERCE_THEME_PRESETS.find((p) => p.id === presetId);
  }

  saveCustomTheme(presetId: string, config: ThemeConfig): void {
    this.customThemes.set(presetId, config);
    this.persistToStorage();
  }

  resetCustomTheme(presetId: string): ThemeConfig | undefined {
    this.customThemes.delete(presetId);
    this.persistToStorage();
    const base = COMMERCE_THEME_PRESETS.find((p) => p.id === presetId);
    return base?.config;
  }

  getDefaultTheme(): ThemeConfig {
    const defaultPreset = COMMERCE_THEME_PRESETS[0];
    if (!defaultPreset) {
      throw new Error('No default theme preset found');
    }
    return defaultPreset.config;
  }

  compileThemeToCssVariables(theme: ThemeConfig): Record<string, string> {
    const { colors, typography, layout, buttons } = theme;

    return {
      '--orb-primary': colors.primary,
      '--orb-primary-hover': colors.primaryHover,
      '--orb-secondary': colors.secondary,
      '--orb-accent': colors.accent,
      '--orb-bg': colors.background,
      '--orb-surface': colors.surface,
      '--orb-surface-subtle': colors.surfaceSubtle,
      '--orb-text': colors.text,
      '--orb-text-muted': colors.textMuted,
      '--orb-border': colors.border,
      '--orb-border-subtle': colors.borderSubtle,
      '--orb-success': colors.success,
      '--orb-warning': colors.warning,
      '--orb-error': colors.error,

      '--orb-font-heading': `'${typography.headingFont}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
      '--orb-font-body': `'${typography.bodyFont}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
      '--orb-font-size-base': `${typography.baseFontSizePx}px`,
      '--orb-font-weight-heading': typography.headingWeight,
      '--orb-font-weight-body': typography.bodyWeight,
      '--orb-line-height-heading': `${typography.headingLineHeight}`,
      '--orb-line-height-body': `${typography.bodyLineHeight}`,
      '--orb-letter-spacing': typography.letterSpacing,

      '--orb-container-max-width': `${layout.containerMaxWidth}px`,
      '--orb-radius': layout.borderRadius,
      '--orb-radius-card': layout.cardBorderRadius,
      '--orb-radius-btn': layout.buttonBorderRadius,
      '--orb-radius-input': layout.inputBorderRadius,

      '--orb-btn-px': `${buttons.paddingX}px`,
      '--orb-btn-py': `${buttons.paddingY}px`,
      '--orb-btn-transform': buttons.textTransform,
      '--orb-btn-weight': buttons.fontWeight,
    };
  }

  generateCssStyleString(theme: ThemeConfig): string {
    const vars = this.compileThemeToCssVariables(theme);
    const varDeclarations = Object.entries(vars)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n');

    let css = `:root {\n${varDeclarations}\n}\n`;

    if (theme.customCss) {
      css += `\n/* Store Custom CSS */\n${theme.customCss}\n`;
    }

    return css;
  }

  mergeTheme(base: ThemeConfig, overrides: Partial<ThemeConfig>): ThemeConfig {
    return {
      ...base,
      ...overrides,
      colors: { ...base.colors, ...(overrides.colors || {}) },
      typography: { ...base.typography, ...(overrides.typography || {}) },
      layout: { ...base.layout, ...(overrides.layout || {}) },
      buttons: { ...base.buttons, ...(overrides.buttons || {}) },
    };
  }

  resolveSectionStyle(
    theme: ThemeConfig,
    overrides?: Partial<SectionStyleOverrides>
  ): ResolvedSectionStyle {
    const isOverridden = Boolean(
      overrides?.accentTone ||
      overrides?.backgroundColor ||
      overrides?.textColor ||
      overrides?.fontFamily ||
      overrides?.borderRadius ||
      overrides?.verticalPadding ||
      overrides?.bgStyle
    );

    const accentTone = overrides?.accentTone || theme.colors.primary || '#E5A93C';
    const backgroundColor = overrides?.backgroundColor || (theme.isDark ? theme.colors.surface || '#121420' : theme.colors.background || '#FFFFFF');
    const textColor = overrides?.textColor || theme.colors.text || (theme.isDark ? '#FFFFFF' : '#111827');

    // Typography
    const headingFont = theme.typography.headingFont || 'Playfair Display';
    const bodyFont = theme.typography.bodyFont || 'Plus Jakarta Sans';
    let fontFamily = `'${bodyFont}', sans-serif`;

    if (overrides?.fontFamily) {
      if (overrides.fontFamily === 'serif') {
        fontFamily = `var(--font-playfair, 'Playfair Display', serif)`;
      } else if (overrides.fontFamily === 'heritage') {
        fontFamily = `var(--font-cinzel, 'Cinzel', serif)`;
      } else if (overrides.fontFamily === 'inter') {
        fontFamily = `Inter, sans-serif`;
      } else if (overrides.fontFamily === 'sans') {
        fontFamily = `var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)`;
      } else {
        fontFamily = overrides.fontFamily;
      }
    } else {
      fontFamily = `'${bodyFont}', sans-serif`;
    }

    const borderRadius = overrides?.borderRadius || theme.layout.borderRadius || '8px';
    const containerWidth = overrides?.containerWidth || 'responsive';

    const vPadding = overrides?.verticalPadding || 'standard';
    const verticalPadding =
      vPadding === 'compact'
        ? '20px 20px'
        : vPadding === 'spacious'
        ? '64px 28px'
        : '36px 24px';

    const bgStyle = overrides?.bgStyle || 'solid';
    let computedBackground = backgroundColor;
    if (bgStyle === 'gradient') {
      computedBackground = `linear-gradient(135deg, ${accentTone}18 0%, ${backgroundColor} 85%)`;
    } else if (bgStyle === 'frost') {
      computedBackground = theme.isDark ? 'rgba(20, 24, 38, 0.75)' : 'rgba(255, 255, 255, 0.85)';
    }

    return {
      accentTone,
      backgroundColor,
      textColor,
      fontFamily,
      headingFont,
      bodyFont,
      verticalPadding,
      containerWidth,
      borderRadius,
      bgStyle,
      computedBackground,
      isOverridden,
    };
  }

  deriveHarmonyPalettes(theme: ThemeConfig): ColorHarmonyPalette[] {
    const p = theme.colors.primary;
    const a = theme.colors.accent;
    const sec = theme.colors.secondary;
    const isDark = theme.isDark;

    return [
      {
        id: 'theme_active',
        name: `${theme.name} (Active Theme)`,
        primary: p,
        secondary: sec,
        accent: a,
        background: theme.colors.background,
        surface: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
      },
      {
        id: 'harmony_royal_gold',
        name: 'Maharaja Imperial Gold',
        primary: '#E5A93C',
        secondary: '#7A1113',
        accent: '#F9E4B7',
        background: isDark ? '#0B0709' : '#FAF7F2',
        surface: isDark ? '#170E12' : '#FFFFFF',
        text: isDark ? '#FFFDF9' : '#1C1917',
        border: 'rgba(229, 169, 60, 0.25)',
      },
      {
        id: 'harmony_crimson_ruby',
        name: 'Patiala Shahi Crimson',
        primary: '#EF4444',
        secondary: '#991B1B',
        accent: '#FCA5A5',
        background: isDark ? '#14080B' : '#FFF5F5',
        surface: isDark ? '#200D12' : '#FFFFFF',
        text: isDark ? '#FFF0F2' : '#1F1416',
        border: 'rgba(239, 68, 68, 0.25)',
      },
      {
        id: 'harmony_emerald_noor',
        name: 'Amritsari Emerald Noor',
        primary: '#10B981',
        secondary: '#064E3B',
        accent: '#6EE7B7',
        background: isDark ? '#04130C' : '#F0FDF4',
        surface: isDark ? '#092117' : '#FFFFFF',
        text: isDark ? '#F2FDF8' : '#062817',
        border: 'rgba(16, 185, 129, 0.25)',
      },
      {
        id: 'harmony_cobalt_nocturne',
        name: 'Nocturne Sapphire Cobalt',
        primary: '#38BDF8',
        secondary: '#0369A1',
        accent: '#7DD3FC',
        background: isDark ? '#080E1A' : '#F0F9FF',
        surface: isDark ? '#0F1B2E' : '#FFFFFF',
        text: isDark ? '#F0F9FF' : '#0C2033',
        border: 'rgba(56, 189, 248, 0.25)',
      },
      {
        id: 'harmony_rose_trousseau',
        name: 'Bridal Silk Rose & Zari',
        primary: '#EC4899',
        secondary: '#9D174D',
        accent: '#F472B6',
        background: isDark ? '#170A13' : '#FDF2F8',
        surface: isDark ? '#24101E' : '#FFFFFF',
        text: isDark ? '#FDF2F8' : '#260B1C',
        border: 'rgba(236, 72, 153, 0.25)',
      },
    ];
  }
}

