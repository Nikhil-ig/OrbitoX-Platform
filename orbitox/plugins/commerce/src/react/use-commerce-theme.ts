'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ThemeConfig,
  ThemePreset,
  ThemeColors,
  ThemeTypography,
  ThemeLayout,
  ThemeButtonStyles,
} from '../domain/types/theme.types';
import { commerceEngine } from '../domain/commerce.engine';

export function useCommerceTheme(activePresetId: string = 'punjabi-jutti-royal') {
  const [presets, setPresets] = useState<ThemePreset[]>(() => commerceEngine.themes.getPresets());
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(() => {
    const list = commerceEngine.themes.getPresets();
    const matched = list.find((p) => p.id === activePresetId) || list[0]!;
    const custom = commerceEngine.themes.getPresetById(activePresetId);
    return custom ? { ...custom.config } : { ...matched.config };
  });
  const [cssStyleString, setCssStyleString] = useState<string>(() =>
    commerceEngine.themes.generateCssStyleString(currentTheme)
  );

  const refreshTheme = useCallback(() => {
    const list = commerceEngine.themes.getPresets();
    setPresets(list);
    const custom = commerceEngine.themes.getPresetById(activePresetId);
    const matched = custom || list.find((p) => p.id === activePresetId) || list[0]!;
    setCurrentTheme({ ...matched.config });
    setCssStyleString(commerceEngine.themes.generateCssStyleString(matched.config));
  }, [activePresetId]);

  useEffect(() => {
    refreshTheme();

    if (typeof window === 'undefined') return;
    const handleThemeUpdated = () => {
      refreshTheme();
    };

    window.addEventListener('orbitox:theme_updated', handleThemeUpdated);
    return () => {
      window.removeEventListener('orbitox:theme_updated', handleThemeUpdated);
    };
  }, [refreshTheme]);

  const selectPreset = (presetId: string) => {
    const custom = commerceEngine.themes.getPresetById(presetId);
    const preset = custom || presets.find((p) => p.id === presetId);
    if (preset) {
      setCurrentTheme({ ...preset.config });
      setCssStyleString(commerceEngine.themes.generateCssStyleString(preset.config));
      commerceEngine.themes.saveCustomTheme(presetId, preset.config);
    }
  };

  const updateThemeConfig = (updates: Partial<ThemeConfig>) => {
    const merged = commerceEngine.themes.mergeTheme(currentTheme, updates);
    setCurrentTheme(merged);
    setCssStyleString(commerceEngine.themes.generateCssStyleString(merged));
    commerceEngine.themes.saveCustomTheme(merged.presetId || currentTheme.presetId, merged);
    return merged;
  };

  const updateThemeColors = (colors: Partial<ThemeColors>) => {
    return updateThemeConfig({
      colors: { ...currentTheme.colors, ...colors },
    });
  };

  const updateThemeTypography = (typography: Partial<ThemeTypography>) => {
    return updateThemeConfig({
      typography: { ...currentTheme.typography, ...typography },
    });
  };

  const updateThemeLayout = (layout: Partial<ThemeLayout>) => {
    return updateThemeConfig({
      layout: { ...currentTheme.layout, ...layout },
    });
  };

  const updateThemeButtons = (buttons: Partial<ThemeButtonStyles>) => {
    return updateThemeConfig({
      buttons: { ...currentTheme.buttons, ...buttons },
    });
  };

  const resetToPreset = (presetId?: string) => {
    const targetId = presetId || currentTheme.presetId;
    const baseConfig = commerceEngine.themes.resetCustomTheme(targetId);
    if (baseConfig) {
      setCurrentTheme({ ...baseConfig });
      setCssStyleString(commerceEngine.themes.generateCssStyleString(baseConfig));
    }
  };

  const harmonyPalettes = commerceEngine.themes.deriveHarmonyPalettes(currentTheme);

  return {
    presets,
    currentTheme,
    cssStyleString,
    harmonyPalettes,
    selectPreset,
    updateThemeConfig,
    updateThemeColors,
    updateThemeTypography,
    updateThemeLayout,
    updateThemeButtons,
    resetToPreset,
    refreshTheme,
  };
}

