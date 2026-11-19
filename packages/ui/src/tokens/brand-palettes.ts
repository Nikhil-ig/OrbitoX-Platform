/**
 * OrbitoX 7B.1 Brand Palettes & Accent Presets
 * 8 Presets: Ocean, Emerald, Sunflower, Saffron, Ruby, Coral, Violet, Teal.
 * Every preset defines its own foreground color ensuring WCAG 2.2 AA (>= 4.5:1).
 */

export interface AccentPreset {
  id: 'ocean' | 'emerald' | 'sunflower' | 'saffron' | 'ruby' | 'coral' | 'violet' | 'teal';
  name: string;
  hex: string;
  hexLight?: string;
  hexDark?: string;
  fg: string;
  hoverHex: string;
  subtleRgba: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: 'ocean', name: 'Ocean', hex: '#3A6BF5', hexLight: '#2F5BD8', hexDark: '#3A6BF5', fg: '#FFFFFF', hoverHex: '#2658E8', subtleRgba: 'rgba(58, 107, 245, 0.16)' },
  { id: 'emerald', name: 'Emerald', hex: '#047857', fg: '#FFFFFF', hoverHex: '#065F46', subtleRgba: 'rgba(4, 120, 87, 0.16)' },
  { id: 'sunflower', name: 'Sunflower', hex: '#F59E0B', fg: '#0D0F12', hoverHex: '#D97706', subtleRgba: 'rgba(245, 158, 11, 0.16)' },
  { id: 'saffron', name: 'Saffron', hex: '#C2410C', fg: '#FFFFFF', hoverHex: '#9A3412', subtleRgba: 'rgba(194, 65, 12, 0.16)' },
  { id: 'ruby', name: 'Ruby', hex: '#E11D48', fg: '#FFFFFF', hoverHex: '#BE123C', subtleRgba: 'rgba(225, 29, 72, 0.16)' },
  { id: 'coral', name: 'Coral', hex: '#D9381E', fg: '#FFFFFF', hoverHex: '#B82C15', subtleRgba: 'rgba(217, 56, 30, 0.16)' },
  { id: 'violet', name: 'Violet', hex: '#7C3AED', fg: '#FFFFFF', hoverHex: '#6D28D9', subtleRgba: 'rgba(124, 58, 237, 0.16)' },
  { id: 'teal', name: 'Teal', hex: '#0F766E', fg: '#FFFFFF', hoverHex: '#115E59', subtleRgba: 'rgba(15, 118, 110, 0.16)' },
];

export interface BrandPalette {
  id: string;
  name: string;
  tagline: string;
  description: string;
  status: 'active-default' | 'candidate';
  colors: {
    primaryLight: string;
    primaryDark: string;
    accentLight: string;
    accentDark: string;
    surfaceLight: string;
    surfaceDark: string;
    borderLight: string;
    borderDark: string;
  };
}

export const BRAND_OPTION_A: BrandPalette = {
  id: 'option-a-ocean-slate',
  name: 'Ocean Dark / Light (Stage 7B.1 Approved Direction)',
  tagline: 'Refined SaaS Operator & Customer Operating System',
  description:
    'Deep ink neutrals paired with luminous Ocean blue accents, 28px pill contours, and high-contrast status pills.',
  status: 'active-default',
  colors: {
    primaryLight: '#3569F5',
    primaryDark: '#3569F5',
    accentLight: '#3569F5',
    accentDark: '#3569F5',
    surfaceLight: '#FFFFFF',
    surfaceDark: '#14171C',
    borderLight: '#E2E8F0',
    borderDark: 'rgba(255, 255, 255, 0.06)',
  },
};

export const BRAND_OPTION_B: BrandPalette = {
  id: 'option-b-obsidian-amber',
  name: 'Obsidian Amber (Option B — Hospitality & Luxury)',
  tagline: 'Warm Organic Obsidian & Sunlit Radiance',
  description:
    'Deep obsidian warm neutrals paired with regal violet and sunlit amber accents.',
  status: 'candidate',
  colors: {
    primaryLight: '#7C3AED',
    primaryDark: '#8B5CF6',
    accentLight: '#D97706',
    accentDark: '#FBBF24',
    surfaceLight: '#FBFAF8',
    surfaceDark: '#171513',
    borderLight: '#E8E5E0',
    borderDark: '#292524',
  },
};

export const BRAND_OPTIONS: BrandPalette[] = [BRAND_OPTION_A, BRAND_OPTION_B];

export function getActiveBrand(): BrandPalette {
  return BRAND_OPTION_A;
}
