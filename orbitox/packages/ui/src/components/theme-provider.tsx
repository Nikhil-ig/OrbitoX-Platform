'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';

export interface PlatformThemeColors {
  bgRoot: string;
  bgDock: string;
  bgSidebar: string;
  bgCard: string;
  bgCardHover: string;
  bgElevated: string;
  bgInput: string;
  borderSubtle: string;
  borderDefault: string;
  borderBright: string;
  borderGlow: string;
  borderActive: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textAccent: string;
  accentPrimary: string;
  accentPrimaryHover: string;
  accentSecondary: string;
  accentGlow: string;
  accentGradient: string;
}

export interface PlatformTheme {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  colors: PlatformThemeColors;
  radiusBase: string; // '8px', '12px', '18px'
}

export type ThemeConfig = PlatformTheme;

export const PLATFORM_THEMES: PlatformTheme[] = [
  // ─── 1. Cosmic Obsidian & Violet ─────────────────────────
  {
    id: 'cosmic-obsidian',
    name: 'Cosmic Obsidian',
    tagline: 'High-Tech Studio • Electric Purple & Cyan Glows',
    icon: '🔮',
    radiusBase: '14px',
    colors: {
      bgRoot: '#07080D',
      bgDock: 'rgba(10, 12, 18, 0.95)',
      bgSidebar: 'rgba(13, 15, 24, 0.92)',
      bgCard: 'rgba(20, 24, 38, 0.75)',
      bgCardHover: 'rgba(26, 32, 50, 0.88)',
      bgElevated: 'rgba(24, 28, 46, 0.85)',
      bgInput: 'rgba(0, 0, 0, 0.45)',
      borderSubtle: 'rgba(255, 255, 255, 0.06)',
      borderDefault: 'rgba(255, 255, 255, 0.1)',
      borderBright: 'rgba(255, 255, 255, 0.18)',
      borderGlow: 'rgba(168, 85, 247, 0.35)',
      borderActive: '#A855F7',
      textPrimary: '#FFFFFF',
      textSecondary: '#94A3B8',
      textMuted: '#64748B',
      textAccent: '#C084FC',
      accentPrimary: '#A855F7',
      accentPrimaryHover: '#9333EA',
      accentSecondary: '#38BDF8',
      accentGlow: 'rgba(168, 85, 247, 0.45)',
      accentGradient: 'linear-gradient(135deg, #A855F7 0%, #6366F1 100%)',
    },
  },

  // ─── 2. Maharaja Royal Gold & Velvet ─────────────────────
  {
    id: 'maharaja-royal-gold',
    name: 'Maharaja Royal Gold',
    tagline: 'Imperial Punjabi Zari • Velvet Noir & Amber',
    icon: '👑',
    radiusBase: '14px',
    colors: {
      bgRoot: '#0A0708',
      bgDock: 'rgba(15, 10, 13, 0.96)',
      bgSidebar: 'rgba(20, 13, 17, 0.94)',
      bgCard: 'rgba(30, 20, 26, 0.8)',
      bgCardHover: 'rgba(40, 26, 34, 0.9)',
      bgElevated: 'rgba(35, 22, 30, 0.88)',
      bgInput: 'rgba(0, 0, 0, 0.5)',
      borderSubtle: 'rgba(229, 169, 60, 0.12)',
      borderDefault: 'rgba(229, 169, 60, 0.22)',
      borderBright: 'rgba(229, 169, 60, 0.4)',
      borderGlow: 'rgba(229, 169, 60, 0.45)',
      borderActive: '#E5A93C',
      textPrimary: '#FFFDF7',
      textSecondary: '#D4C4B5',
      textMuted: '#968172',
      textAccent: '#FCD34D',
      accentPrimary: '#E5A93C',
      accentPrimaryHover: '#D97706',
      accentSecondary: '#E11D48',
      accentGlow: 'rgba(229, 169, 60, 0.45)',
      accentGradient: 'linear-gradient(135deg, #E5A93C 0%, #F59E0B 50%, #E11D48 100%)',
    },
  },

  // ─── 3. Cyberpunk Neon Volt ──────────────────────────────
  {
    id: 'cyberpunk-neon-volt',
    name: 'Cyberpunk Neon Volt',
    tagline: 'Drop Culture • Volt Lime & Sharp High-Contrast',
    icon: '⚡',
    radiusBase: '8px',
    colors: {
      bgRoot: '#08090E',
      bgDock: 'rgba(12, 14, 21, 0.96)',
      bgSidebar: 'rgba(16, 19, 29, 0.94)',
      bgCard: 'rgba(22, 26, 40, 0.8)',
      bgCardHover: 'rgba(30, 36, 56, 0.9)',
      bgElevated: 'rgba(26, 32, 48, 0.88)',
      bgInput: 'rgba(0, 0, 0, 0.6)',
      borderSubtle: 'rgba(204, 255, 0, 0.12)',
      borderDefault: 'rgba(204, 255, 0, 0.25)',
      borderBright: 'rgba(204, 255, 0, 0.5)',
      borderGlow: 'rgba(204, 255, 0, 0.4)',
      borderActive: '#CCFF00',
      textPrimary: '#F8FAFC',
      textSecondary: '#CBD5E1',
      textMuted: '#64748B',
      textAccent: '#CCFF00',
      accentPrimary: '#CCFF00',
      accentPrimaryHover: '#B8E600',
      accentSecondary: '#8B5CF6',
      accentGlow: 'rgba(204, 255, 0, 0.4)',
      accentGradient: 'linear-gradient(135deg, #CCFF00 0%, #8B5CF6 100%)',
    },
  },

  // ─── 4. Deep Ocean Titanium ──────────────────────────────
  {
    id: 'deep-ocean-titanium',
    name: 'Deep Ocean Titanium',
    tagline: 'Enterprise Clean • Royal Sapphire & Crisp Navy',
    icon: '🌊',
    radiusBase: '14px',
    colors: {
      bgRoot: '#060B14',
      bgDock: 'rgba(9, 17, 30, 0.96)',
      bgSidebar: 'rgba(11, 22, 40, 0.94)',
      bgCard: 'rgba(16, 30, 54, 0.75)',
      bgCardHover: 'rgba(22, 42, 75, 0.88)',
      bgElevated: 'rgba(19, 36, 65, 0.85)',
      bgInput: 'rgba(0, 0, 0, 0.45)',
      borderSubtle: 'rgba(56, 189, 248, 0.1)',
      borderDefault: 'rgba(56, 189, 248, 0.2)',
      borderBright: 'rgba(56, 189, 248, 0.4)',
      borderGlow: 'rgba(37, 99, 235, 0.4)',
      borderActive: '#2563EB',
      textPrimary: '#FFFFFF',
      textSecondary: '#94A3B8',
      textMuted: '#64748B',
      textAccent: '#38BDF8',
      accentPrimary: '#2563EB',
      accentPrimaryHover: '#1D4ED8',
      accentSecondary: '#38BDF8',
      accentGlow: 'rgba(37, 99, 235, 0.4)',
      accentGradient: 'linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)',
    },
  },

  // ─── 5. Verde Emerald Silk ───────────────────────────────
  {
    id: 'verde-emerald-silk',
    name: 'Verde Emerald Silk',
    tagline: 'Botanical Luxury • Imperial Jade & Mint Radiance',
    icon: '🌿',
    radiusBase: '16px',
    colors: {
      bgRoot: '#050B08',
      bgDock: 'rgba(8, 18, 13, 0.96)',
      bgSidebar: 'rgba(11, 24, 18, 0.94)',
      bgCard: 'rgba(16, 35, 26, 0.78)',
      bgCardHover: 'rgba(22, 48, 36, 0.88)',
      bgElevated: 'rgba(19, 42, 31, 0.85)',
      bgInput: 'rgba(0, 0, 0, 0.45)',
      borderSubtle: 'rgba(16, 185, 129, 0.12)',
      borderDefault: 'rgba(16, 185, 129, 0.22)',
      borderBright: 'rgba(16, 185, 129, 0.45)',
      borderGlow: 'rgba(16, 185, 129, 0.4)',
      borderActive: '#10B981',
      textPrimary: '#F0FDF4',
      textSecondary: '#A7F3D0',
      textMuted: '#4B7B63',
      textAccent: '#34D399',
      accentPrimary: '#10B981',
      accentPrimaryHover: '#059669',
      accentSecondary: '#F59E0B',
      accentGlow: 'rgba(16, 185, 129, 0.4)',
      accentGradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    },
  },

  // ─── 6. Noor Rose Gold & Ivory ───────────────────────────
  {
    id: 'noor-rose-gold',
    name: 'Noor Rose Gold',
    tagline: 'Bridal Glamour • Rose Gold Glow & Champagne Silk',
    icon: '🌸',
    radiusBase: '18px',
    colors: {
      bgRoot: '#0D070A',
      bgDock: 'rgba(18, 10, 14, 0.96)',
      bgSidebar: 'rgba(24, 13, 19, 0.94)',
      bgCard: 'rgba(34, 18, 27, 0.78)',
      bgCardHover: 'rgba(46, 24, 37, 0.88)',
      bgElevated: 'rgba(40, 21, 32, 0.85)',
      bgInput: 'rgba(0, 0, 0, 0.45)',
      borderSubtle: 'rgba(244, 63, 94, 0.12)',
      borderDefault: 'rgba(244, 63, 94, 0.22)',
      borderBright: 'rgba(244, 63, 94, 0.45)',
      borderGlow: 'rgba(244, 63, 94, 0.4)',
      borderActive: '#F43F5E',
      textPrimary: '#FFF1F2',
      textSecondary: '#FECDD3',
      textMuted: '#9F6875',
      textAccent: '#FB7185',
      accentPrimary: '#F43F5E',
      accentPrimaryHover: '#E11D48',
      accentSecondary: '#FCD34D',
      accentGlow: 'rgba(244, 63, 94, 0.4)',
      accentGradient: 'linear-gradient(135deg, #F43F5E 0%, #FB7185 100%)',
    },
  },
];

interface ThemeContextType {
  currentTheme: PlatformTheme;
  allThemes: PlatformTheme[];
  setThemeById: (themeId: string) => void;
  setCustomAccent: (colorHex: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: PLATFORM_THEMES[0]!,
  allThemes: PLATFORM_THEMES,
  setThemeById: () => {},
  setCustomAccent: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const STORAGE_KEY = 'orbitox_platform_theme_id';

export function ThemeProvider({
  children,
  initialThemeId = 'cosmic-obsidian',
}: {
  children: React.ReactNode;
  initialThemeId?: string;
}) {
  const [activeThemeId, setActiveThemeId] = useState<string>(initialThemeId);
  const [customAccent, setCustomAccentState] = useState<string | null>(null);

  // Hydrate from localStorage on client mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && PLATFORM_THEMES.some((t) => t.id === saved)) {
        setActiveThemeId(saved);
      }
    } catch {}

    // Listen for broadcast sync across browser tabs
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('orbitox_theme_sync');
      channel.onmessage = (event) => {
        if (event.data?.themeId) {
          setActiveThemeId(event.data.themeId);
        }
      };
      return () => channel.close();
    }
  }, []);

  const currentTheme = useMemo(() => {
    const found = PLATFORM_THEMES.find((t) => t.id === activeThemeId) || PLATFORM_THEMES[0]!;
    if (!customAccent) return found;

    return {
      ...found,
      colors: {
        ...found.colors,
        accentPrimary: customAccent,
        accentGlow: `${customAccent}66`,
        accentGradient: `linear-gradient(135deg, ${customAccent} 0%, #6366F1 100%)`,
        borderActive: customAccent,
      },
    };
  }, [activeThemeId, customAccent]);

  const setThemeById = useCallback((themeId: string) => {
    setActiveThemeId(themeId);
    setCustomAccentState(null);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, themeId);
        if (typeof BroadcastChannel !== 'undefined') {
          const channel = new BroadcastChannel('orbitox_theme_sync');
          channel.postMessage({ themeId });
          channel.close();
        }
      } catch {}
    }
  }, []);

  const setCustomAccent = useCallback((colorHex: string) => {
    setCustomAccentState(colorHex);
  }, []);

  // Compile CSS variables string
  const cssVariables = useMemo(() => {
    const c = currentTheme.colors;
    return `
      :root {
        --ui-bg-root: ${c.bgRoot};
        --ui-bg-dock: ${c.bgDock};
        --ui-bg-sidebar: ${c.bgSidebar};
        --ui-bg-card: ${c.bgCard};
        --ui-bg-card-hover: ${c.bgCardHover};
        --ui-bg-elevated: ${c.bgElevated};
        --ui-bg-input: ${c.bgInput};
        --ui-border-subtle: ${c.borderSubtle};
        --ui-border-default: ${c.borderDefault};
        --ui-border-bright: ${c.borderBright};
        --ui-border-glow: ${c.borderGlow};
        --ui-border-active: ${c.borderActive};
        --ui-text-primary: ${c.textPrimary};
        --ui-text-secondary: ${c.textSecondary};
        --ui-text-muted: ${c.textMuted};
        --ui-text-accent: ${c.textAccent};
        --ui-accent-primary: ${c.accentPrimary};
        --ui-accent-primary-hover: ${c.accentPrimaryHover};
        --ui-accent-secondary: ${c.accentSecondary};
        --ui-accent-glow: ${c.accentGlow};
        --ui-accent-gradient: ${c.accentGradient};
      }
    `;
  }, [currentTheme]);

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        allThemes: PLATFORM_THEMES,
        setThemeById,
        setCustomAccent,
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: cssVariables }} />
      {children}
    </ThemeContext.Provider>
  );
}
