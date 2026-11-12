/**
 * OrbitoX Brand Palettes (Proposed to Technical Lead & Product Owner)
 * Option A is the active default across Stage 7B until Owner selection.
 */

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
  id: 'option-a-titanium-slate',
  name: 'Titanium Slate (Option A — Active Default)',
  tagline: 'High-Precision SaaS & Cryptographic Engineering',
  description:
    'Cool zinc neutrals paired with luminous electric indigo and vivid cyan accents. Optimized for high-density operator workflows, developer ergonomics, and crisp contrast in both daylight and darkroom operations.',
  status: 'active-default',
  colors: {
    primaryLight: '#4f46e5', // Indigo-600
    primaryDark: '#6366f1',  // Indigo-500
    accentLight: '#0891b2',  // Cyan-600
    accentDark: '#22d3ee',   // Cyan-400
    surfaceLight: '#fafafa', // Zinc-50
    surfaceDark: '#18181b',  // Zinc-900
    borderLight: '#e4e4e7',  // Zinc-200
    borderDark: '#27272a',   // Zinc-800
  },
};

export const BRAND_OPTION_B: BrandPalette = {
  id: 'option-b-obsidian-amber',
  name: 'Obsidian Amber (Option B — Hospitality & Luxury)',
  tagline: 'Warm Organic Obsidian & Sunlit Radiance',
  description:
    'Deep obsidian warm neutrals paired with regal violet and sunlit amber accents. Ideal for luxury hospitality, restaurant guest ordering, and warm, tactile customer touchpoints.',
  status: 'candidate',
  colors: {
    primaryLight: '#7c3aed', // Violet-600
    primaryDark: '#8b5cf6',  // Violet-500
    accentLight: '#d97706',  // Amber-600
    accentDark: '#fbbf24',   // Amber-400
    surfaceLight: '#fbfaf8', // Warm stone
    surfaceDark: '#171513',  // Obsidian charcoal
    borderLight: '#e8e5e0',  // Warm border
    borderDark: '#292524',   // Dark warm border
  },
};

export const BRAND_OPTIONS: BrandPalette[] = [BRAND_OPTION_A, BRAND_OPTION_B];

export function getActiveBrand(): BrandPalette {
  return BRAND_OPTION_A;
}

