'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

/**
 * Universal Theme Configuration
 * Supports O2O2B2B, O2O2B2C, O2O, O2B, B2O, B2C, C2C, C2B, and universal business models
 * by allowing complete, dynamic white-labeling of the platform UI at runtime.
 */
export interface ThemeConfig {
  id: string;
  name: string;
  colors: {
    bgPrimary: string;
    bgSecondary: string;
    bgGlass: string;
    borderGlass: string;
    textPrimary: string;
    textSecondary: string;
    accentPrimary: string;
    accentPrimaryHover: string;
  };
  radii: {
    sm: string;
    md: string;
    lg: string;
  };
}

interface ThemeContextType {
  currentTheme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
}

const defaultTheme: ThemeConfig = {
  id: 'orbitox-dark',
  name: 'Universal Dark (Default)',
  colors: {
    bgPrimary: '#0b0f19',
    bgSecondary: '#111827',
    bgGlass: 'rgba(17, 24, 39, 0.75)',
    borderGlass: 'rgba(255, 255, 255, 0.08)',
    textPrimary: '#f9fafb',
    textSecondary: '#9ca3af',
    accentPrimary: '#6366f1',
    accentPrimaryHover: '#4f46e5',
  },
  radii: {
    sm: '6px',
    md: '10px',
    lg: '16px',
  },
};

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: defaultTheme,
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: React.ReactNode;
  initialTheme?: ThemeConfig;
}) {
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(initialTheme || defaultTheme);

  // Generate CSS variables dynamically based on the currentTheme
  const themeStyles = useMemo(() => {
    return `
      :root {
        --bg-primary: ${currentTheme.colors.bgPrimary};
        --bg-secondary: ${currentTheme.colors.bgSecondary};
        --bg-glass: ${currentTheme.colors.bgGlass};
        --border-glass: ${currentTheme.colors.borderGlass};
        --text-primary: ${currentTheme.colors.textPrimary};
        --text-secondary: ${currentTheme.colors.textSecondary};
        --accent-primary: ${currentTheme.colors.accentPrimary};
        --accent-primary-hover: ${currentTheme.colors.accentPrimaryHover};
        --radius-sm: ${currentTheme.radii.sm};
        --radius-md: ${currentTheme.radii.md};
        --radius-lg: ${currentTheme.radii.lg};
      }
      body {
        background-color: var(--bg-primary);
        color: var(--text-primary);
      }
    `;
  }, [currentTheme]);

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme: setCurrentTheme }}>
      {/* Inject variables globally into the document */}
      <style dangerouslySetInnerHTML={{ __html: themeStyles }} />
      {children}
    </ThemeContext.Provider>
  );
}
