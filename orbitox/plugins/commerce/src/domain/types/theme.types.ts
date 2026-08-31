export interface ThemeColors {
  primary: string;
  primaryHover: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  surfaceSubtle: string;
  text: string;
  textMuted: string;
  border: string;
  borderSubtle: string;
  success: string;
  warning: string;
  error: string;
}

export interface ThemeTypography {
  headingFont: string; // e.g. "Outfit", "Playfair Display", "Poppins", "Inter"
  bodyFont: string; // e.g. "Inter", "Plus Jakarta Sans", "Roboto"
  baseFontSizePx: number;
  headingWeight: '400' | '500' | '600' | '700' | '800' | '900';
  bodyWeight: '300' | '400' | '500';
  headingLineHeight: number;
  bodyLineHeight: number;
  letterSpacing: string;
}

export interface ThemeLayout {
  containerMaxWidth: number; // in px, e.g. 1280
  borderRadius: string; // "0px" | "4px" | "8px" | "16px" | "24px" | "9999px"
  cardBorderRadius: string;
  buttonBorderRadius: string;
  inputBorderRadius: string;
  headerSticky: boolean;
  headerTransparent: boolean;
}

export interface ThemeButtonStyles {
  paddingX: number;
  paddingY: number;
  textTransform: 'none' | 'uppercase' | 'capitalize';
  fontWeight: string;
  shadow: 'none' | 'sm' | 'md' | 'lg' | 'glow';
}

export interface ThemeConfig {
  id: string;
  presetId: string;
  name: string;
  description?: string;
  isDark: boolean;
  colors: ThemeColors;
  typography: ThemeTypography;
  layout: ThemeLayout;
  buttons: ThemeButtonStyles;
  customCss?: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  category: 'fashion' | 'minimal' | 'luxury' | 'streetwear' | 'organic' | 'tech' | 'athletic-shoes' | 'minimal-organic' | 'ethnic-wear' | 'beauty-wellness';
  previewImageUrl?: string;
  config: ThemeConfig;
}

export interface SectionStyleOverrides {
  accentTone?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  verticalPadding?: 'compact' | 'standard' | 'spacious';
  containerWidth?: 'responsive' | 'full' | 'boxed' | 'narrow';
  borderRadius?: string;
  bgStyle?: 'solid' | 'gradient' | 'frost';
  paletteName?: string;
  customCss?: string;
}

export interface ResolvedSectionStyle {
  accentTone: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  headingFont: string;
  bodyFont: string;
  verticalPadding: string;
  containerWidth: string;
  borderRadius: string;
  bgStyle: 'solid' | 'gradient' | 'frost';
  computedBackground: string;
  isOverridden: boolean;
}

export interface ColorHarmonyPalette {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  border: string;
}

