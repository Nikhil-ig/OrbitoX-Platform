import { TemplateDesignTokens } from '../types/TemplateSchema';

export interface DesignUniverse {
  id: string;
  name: string;
  tagline: string;
  description: string;
  previewGradient: string;
  accentColor: string;
  badge: string;
  tokens: TemplateDesignTokens;
  motionPreset: 'elegant' | 'cinematic' | 'spring' | 'minimal';
  effectsPreset: 'celestial' | 'glass' | 'aurora' | 'noir' | 'chrome' | 'paper';
  atmosphere3D?: {
    starDensity: number;
    fogDensity: number;
    lightWarmth: string;
    particleSpeed: number;
  };
}

function createUniverseTokens(params: {
  colors: {
    backgroundPrimary: string;
    backgroundSecondary: string;
    surfacePrimary: string;
    surfaceElevated: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    accentPrimary: string;
    accentSecondary: string;
    accentGlow: string;
    borderSubtle: string;
    borderAccent: string;
  };
  typography: {
    displayFont: string;
    headingFont: string;
    bodyFont: string;
    accentFont: string;
  };
  radius?: {
    sm?: string;
    md?: string;
    lg?: string;
    pill?: string;
    editorial?: string;
  };
  shadows?: {
    subtle?: string;
    elevated?: string;
    glow?: string;
    cosmic?: string;
  };
  motionIntensity?: 'subtle' | 'standard' | 'expressive';
}): TemplateDesignTokens {
  return {
    colors: {
      ...params.colors,
      statusSuccess: '#10B981',
      statusWarning: '#F59E0B',
      statusError: '#EF4444',
    },
    typography: {
      ...params.typography,
      fontScaleDesktop: 1.0,
      fontScaleTablet: 0.88,
      fontScaleMobile: 0.75,
      lineHeightBase: 1.5,
      letterSpacingDisplay: '0.04em',
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px',
      xxl: '48px',
    },
    radius: {
      sm: params.radius?.sm || '4px',
      md: params.radius?.md || '8px',
      lg: params.radius?.lg || '16px',
      pill: params.radius?.pill || '9999px',
      editorial: params.radius?.editorial || '0px',
    },
    shadows: {
      subtle: params.shadows?.subtle || '0 4px 20px rgba(0, 0, 0, 0.5)',
      elevated: params.shadows?.elevated || '0 12px 36px rgba(0, 0, 0, 0.7)',
      glow: params.shadows?.glow || '0 0 32px rgba(223, 186, 107, 0.25)',
      cosmic: params.shadows?.cosmic || '0 20px 60px rgba(0, 0, 0, 0.85)',
    },
    motion: {
      globalIntensity: params.motionIntensity || 'standard',
      defaultTransitionMs: 400,
      reducedMotionActive: false,
    },
  };
}

export const DESIGN_UNIVERSES: DesignUniverse[] = [
  {
    id: 'celestial',
    name: 'Celestial Odyssey',
    tagline: 'Deep cosmic void with starlight gold & ethereal nebula accents',
    description: 'A monument of timeless grandeur with dark obsidian void, warm royal champagne gold, and delicate stardust atmospheres.',
    previewGradient: 'radial-gradient(circle at 50% 30%, #1E1742 0%, #060814 100%)',
    accentColor: '#DFBA6B',
    badge: 'Signature Luxury',
    motionPreset: 'cinematic',
    effectsPreset: 'celestial',
    atmosphere3D: {
      starDensity: 120,
      fogDensity: 0.4,
      lightWarmth: '#DFBA6B',
      particleSpeed: 0.6,
    },
    tokens: createUniverseTokens({
      colors: {
        backgroundPrimary: '#060814',
        backgroundSecondary: '#0B0F24',
        surfacePrimary: 'rgba(18, 24, 48, 0.65)',
        surfaceElevated: 'rgba(28, 36, 70, 0.75)',
        textPrimary: '#FFFFFF',
        textSecondary: '#C5CDDF',
        textMuted: '#7D88A6',
        accentPrimary: '#DFBA6B',
        accentSecondary: '#B08D4C',
        accentGlow: 'rgba(223, 186, 107, 0.35)',
        borderSubtle: 'rgba(223, 186, 107, 0.18)',
        borderAccent: 'rgba(223, 186, 107, 0.6)',
      },
      typography: {
        displayFont: "'Cinzel', serif",
        headingFont: "'Outfit', sans-serif",
        bodyFont: "'Outfit', sans-serif",
        accentFont: "'Cormorant Garamond', serif",
      },
      radius: { sm: '4px', md: '8px', lg: '16px', pill: '9999px', editorial: '0px' },
      shadows: {
        subtle: '0 4px 20px rgba(0, 0, 0, 0.5)',
        elevated: '0 12px 36px rgba(0, 0, 0, 0.7)',
        glow: '0 0 32px rgba(223, 186, 107, 0.25)',
        cosmic: '0 20px 60px rgba(0, 0, 0, 0.85)',
      },
      motionIntensity: 'expressive',
    }),
  },
  {
    id: 'editorial-luxury',
    name: 'Editorial Luxury',
    tagline: 'High-fashion editorial elegance with warm charcoal & champagne serif',
    description: 'Inspired by Vogue, Kinfolk, and luxury fashion ateliers. Ultra-refined typography, generous negative space, and razor-sharp micro-borders.',
    previewGradient: 'linear-gradient(135deg, #1C1A17 0%, #0A0908 100%)',
    accentColor: '#E6CA9E',
    badge: 'Editorial',
    motionPreset: 'elegant',
    effectsPreset: 'paper',
    atmosphere3D: {
      starDensity: 20,
      fogDensity: 0.2,
      lightWarmth: '#E6CA9E',
      particleSpeed: 0.3,
    },
    tokens: createUniverseTokens({
      colors: {
        backgroundPrimary: '#0C0B0A',
        backgroundSecondary: '#161412',
        surfacePrimary: 'rgba(28, 25, 22, 0.75)',
        surfaceElevated: 'rgba(40, 36, 32, 0.85)',
        textPrimary: '#FDFBF7',
        textSecondary: '#D1C7BA',
        textMuted: '#8C8274',
        accentPrimary: '#E6CA9E',
        accentSecondary: '#C4A97D',
        accentGlow: 'rgba(230, 202, 158, 0.25)',
        borderSubtle: 'rgba(230, 202, 158, 0.15)',
        borderAccent: 'rgba(230, 202, 158, 0.45)',
      },
      typography: {
        displayFont: "'Cormorant Garamond', serif",
        headingFont: "'Cormorant Garamond', serif",
        bodyFont: "'Inter', sans-serif",
        accentFont: "'Playfair Display', serif",
      },
      radius: { sm: '2px', md: '4px', lg: '8px', pill: '9999px', editorial: '2px' },
      shadows: {
        subtle: '0 4px 16px rgba(0, 0, 0, 0.4)',
        elevated: '0 10px 30px rgba(0, 0, 0, 0.6)',
        glow: '0 0 24px rgba(230, 202, 158, 0.18)',
        cosmic: '0 16px 40px rgba(0, 0, 0, 0.7)',
      },
      motionIntensity: 'subtle',
    }),
  },
  {
    id: 'minimal-modern',
    name: 'Minimal Modern',
    tagline: 'Sleek monochromatic precision with electric violet focus accents',
    description: 'Ultra-crisp geometric layout, high information density, and focused neon accents. Ideal for elite SaaS, developer tools, and cutting-edge tech.',
    previewGradient: 'linear-gradient(135deg, #130E26 0%, #060608 100%)',
    accentColor: '#8B5CF6',
    badge: 'Modern SaaS',
    motionPreset: 'spring',
    effectsPreset: 'chrome',
    atmosphere3D: {
      starDensity: 40,
      fogDensity: 0.15,
      lightWarmth: '#8B5CF6',
      particleSpeed: 0.8,
    },
    tokens: createUniverseTokens({
      colors: {
        backgroundPrimary: '#08080C',
        backgroundSecondary: '#101016',
        surfacePrimary: 'rgba(22, 22, 30, 0.8)',
        surfaceElevated: 'rgba(34, 34, 46, 0.9)',
        textPrimary: '#FFFFFF',
        textSecondary: '#A1A1B5',
        textMuted: '#636378',
        accentPrimary: '#8B5CF6',
        accentSecondary: '#6D28D9',
        accentGlow: 'rgba(139, 92, 246, 0.4)',
        borderSubtle: 'rgba(255, 255, 255, 0.08)',
        borderAccent: 'rgba(139, 92, 246, 0.5)',
      },
      typography: {
        displayFont: "'Space Grotesk', sans-serif",
        headingFont: "'Space Grotesk', sans-serif",
        bodyFont: "'Inter', sans-serif",
        accentFont: "'JetBrains Mono', monospace",
      },
      radius: { sm: '6px', md: '10px', lg: '14px', pill: '9999px', editorial: '4px' },
      shadows: {
        subtle: '0 4px 20px rgba(0, 0, 0, 0.5)',
        elevated: '0 12px 32px rgba(0, 0, 0, 0.7)',
        glow: '0 0 28px rgba(139, 92, 246, 0.3)',
        cosmic: '0 20px 50px rgba(0, 0, 0, 0.8)',
      },
      motionIntensity: 'standard',
    }),
  },
  {
    id: 'botanical-organic',
    name: 'Botanical Organic',
    tagline: 'Deep forest moss, radiant emerald sage, and serene earthy warmth',
    description: 'Harmonious natural rhythm, soothing organic hues, and gentle typography. Perfect for wellness, luxury eco-resorts, organic gastronomy, and spring celebrations.',
    previewGradient: 'radial-gradient(circle at 50% 20%, #0F2314 0%, #050B07 100%)',
    accentColor: '#4ADE80',
    badge: 'Organic',
    motionPreset: 'elegant',
    effectsPreset: 'paper',
    atmosphere3D: {
      starDensity: 60,
      fogDensity: 0.5,
      lightWarmth: '#86EFAC',
      particleSpeed: 0.4,
    },
    tokens: createUniverseTokens({
      colors: {
        backgroundPrimary: '#060D08',
        backgroundSecondary: '#0D1A10',
        surfacePrimary: 'rgba(18, 36, 23, 0.65)',
        surfaceElevated: 'rgba(28, 52, 35, 0.75)',
        textPrimary: '#F0FDF4',
        textSecondary: '#BBF7D0',
        textMuted: '#6B9075',
        accentPrimary: '#4ADE80',
        accentSecondary: '#22C55E',
        accentGlow: 'rgba(74, 222, 128, 0.3)',
        borderSubtle: 'rgba(74, 222, 128, 0.15)',
        borderAccent: 'rgba(74, 222, 128, 0.45)',
      },
      typography: {
        displayFont: "'Playfair Display', serif",
        headingFont: "'Playfair Display', serif",
        bodyFont: "'DM Sans', sans-serif",
        accentFont: "'Cormorant Garamond', serif",
      },
      radius: { sm: '8px', md: '14px', lg: '22px', pill: '9999px', editorial: '6px' },
      shadows: {
        subtle: '0 4px 18px rgba(0, 0, 0, 0.4)',
        elevated: '0 12px 30px rgba(0, 0, 0, 0.6)',
        glow: '0 0 24px rgba(74, 222, 128, 0.25)',
        cosmic: '0 16px 45px rgba(0, 0, 0, 0.75)',
      },
      motionIntensity: 'standard',
    }),
  },
  {
    id: 'noir-cyber',
    name: 'Noir Cyber',
    tagline: 'Deep stealth obsidian with luminescent cyan & acid pulse',
    description: 'High-octane cyberpunk aesthetics with terminal-grade typography, glowing laser borders, and visceral neon telemetry.',
    previewGradient: 'linear-gradient(135deg, #05161C 0%, #030406 100%)',
    accentColor: '#06B6D4',
    badge: 'Futuristic',
    motionPreset: 'spring',
    effectsPreset: 'chrome',
    atmosphere3D: {
      starDensity: 150,
      fogDensity: 0.3,
      lightWarmth: '#06B6D4',
      particleSpeed: 1.2,
    },
    tokens: createUniverseTokens({
      colors: {
        backgroundPrimary: '#040507',
        backgroundSecondary: '#080C12',
        surfacePrimary: 'rgba(12, 20, 30, 0.8)',
        surfaceElevated: 'rgba(20, 34, 48, 0.9)',
        textPrimary: '#FFFFFF',
        textSecondary: '#A5F3FC',
        textMuted: '#4F7788',
        accentPrimary: '#06B6D4',
        accentSecondary: '#0891B2',
        accentGlow: 'rgba(6, 182, 212, 0.45)',
        borderSubtle: 'rgba(6, 182, 212, 0.2)',
        borderAccent: '#06B6D4',
      },
      typography: {
        displayFont: "'Space Grotesk', sans-serif",
        headingFont: "'Space Grotesk', sans-serif",
        bodyFont: "'Inter', sans-serif",
        accentFont: "'JetBrains Mono', monospace",
      },
      radius: { sm: '2px', md: '4px', lg: '6px', pill: '9999px', editorial: '0px' },
      shadows: {
        subtle: '0 4px 18px rgba(0, 0, 0, 0.6)',
        elevated: '0 10px 32px rgba(0, 0, 0, 0.8)',
        glow: '0 0 32px rgba(6, 182, 212, 0.4)',
        cosmic: '0 18px 48px rgba(0, 0, 0, 0.9)',
      },
      motionIntensity: 'expressive',
    }),
  },
  {
    id: 'aurora-glass',
    name: 'Aurora Glass',
    tagline: 'Luminescent pink and cyan aurora dancing over frosted crystalline glass',
    description: 'Dreamy multi-spectrum gradients, heavy optical frosted glass, and radiant spectral glow. Inspired by macOS Big Sur and Apple VisionOS interfaces.',
    previewGradient: 'radial-gradient(circle at 30% 20%, #3B1238 0%, #0A071E 100%)',
    accentColor: '#EC4899',
    badge: 'Glassmorphic',
    motionPreset: 'cinematic',
    effectsPreset: 'glass',
    atmosphere3D: {
      starDensity: 90,
      fogDensity: 0.6,
      lightWarmth: '#F472B6',
      particleSpeed: 0.5,
    },
    tokens: createUniverseTokens({
      colors: {
        backgroundPrimary: '#090616',
        backgroundSecondary: '#130D29',
        surfacePrimary: 'rgba(35, 22, 65, 0.55)',
        surfaceElevated: 'rgba(55, 34, 100, 0.65)',
        textPrimary: '#FFFFFF',
        textSecondary: '#FBCFE8',
        textMuted: '#9378B0',
        accentPrimary: '#EC4899',
        accentSecondary: '#A855F7',
        accentGlow: 'rgba(236, 72, 153, 0.4)',
        borderSubtle: 'rgba(255, 255, 255, 0.14)',
        borderAccent: 'rgba(236, 72, 153, 0.5)',
      },
      typography: {
        displayFont: "'Outfit', sans-serif",
        headingFont: "'Outfit', sans-serif",
        bodyFont: "'Inter', sans-serif",
        accentFont: "'Cormorant Garamond', serif",
      },
      radius: { sm: '8px', md: '14px', lg: '24px', pill: '9999px', editorial: '8px' },
      shadows: {
        subtle: '0 8px 24px rgba(0, 0, 0, 0.4)',
        elevated: '0 16px 48px rgba(0, 0, 0, 0.6)',
        glow: '0 0 36px rgba(236, 72, 153, 0.35)',
        cosmic: '0 24px 64px rgba(0, 0, 0, 0.8)',
      },
      motionIntensity: 'standard',
    }),
  },
  {
    id: 'brutalist-raw',
    name: 'Brutalist Raw',
    tagline: 'High-contrast industrial monochrome with warning amber accents',
    description: 'Raw, unapologetic neo-brutalism. Heavy typography, bold contrasting geometric borders, zero blur, and direct visual impact.',
    previewGradient: 'linear-gradient(135deg, #1C1917 0%, #09090B 100%)',
    accentColor: '#F59E0B',
    badge: 'Brutalist',
    motionPreset: 'spring',
    effectsPreset: 'noir',
    atmosphere3D: {
      starDensity: 10,
      fogDensity: 0.1,
      lightWarmth: '#F59E0B',
      particleSpeed: 0.2,
    },
    tokens: createUniverseTokens({
      colors: {
        backgroundPrimary: '#0C0A09',
        backgroundSecondary: '#1C1917',
        surfacePrimary: '#18181B',
        surfaceElevated: '#27272A',
        textPrimary: '#FAFAF9',
        textSecondary: '#D6D3D1',
        textMuted: '#78716C',
        accentPrimary: '#F59E0B',
        accentSecondary: '#D97706',
        accentGlow: 'rgba(245, 158, 11, 0.3)',
        borderSubtle: '#44403C',
        borderAccent: '#F59E0B',
      },
      typography: {
        displayFont: "'Space Grotesk', sans-serif",
        headingFont: "'Space Grotesk', sans-serif",
        bodyFont: "'Inter', sans-serif",
        accentFont: "'JetBrains Mono', monospace",
      },
      radius: { sm: '0px', md: '0px', lg: '0px', pill: '0px', editorial: '0px' },
      shadows: {
        subtle: '4px 4px 0px rgba(0, 0, 0, 1)',
        elevated: '8px 8px 0px rgba(0, 0, 0, 1)',
        glow: '0 0 0 rgba(0, 0, 0, 0)',
        cosmic: '12px 12px 0px rgba(0, 0, 0, 1)',
      },
      motionIntensity: 'subtle',
    }),
  },
  {
    id: 'celebration-gala',
    name: 'Celebration Gala',
    tagline: 'Radiant royal velvet with lustrous rose gold and champagne sparkles',
    description: 'Specially orchestrated for milestone galas, luxury weddings, anniversaries, and grand invitations. Warm, romantic, and breathtaking.',
    previewGradient: 'radial-gradient(circle at 50% 25%, #271224 0%, #0A050B 100%)',
    accentColor: '#F43F5E',
    badge: 'Gala & Romance',
    motionPreset: 'cinematic',
    effectsPreset: 'celestial',
    atmosphere3D: {
      starDensity: 110,
      fogDensity: 0.45,
      lightWarmth: '#FDA4AF',
      particleSpeed: 0.7,
    },
    tokens: createUniverseTokens({
      colors: {
        backgroundPrimary: '#090408',
        backgroundSecondary: '#160B14',
        surfacePrimary: 'rgba(38, 18, 35, 0.65)',
        surfaceElevated: 'rgba(58, 28, 54, 0.75)',
        textPrimary: '#FFF1F2',
        textSecondary: '#FECDD3',
        textMuted: '#9F7582',
        accentPrimary: '#F43F5E',
        accentSecondary: '#FB7185',
        accentGlow: 'rgba(244, 63, 94, 0.35)',
        borderSubtle: 'rgba(244, 63, 94, 0.2)',
        borderAccent: 'rgba(244, 63, 94, 0.6)',
      },
      typography: {
        displayFont: "'Cormorant Garamond', serif",
        headingFont: "'Cormorant Garamond', serif",
        bodyFont: "'Outfit', sans-serif",
        accentFont: "'Cinzel', serif",
      },
      radius: { sm: '6px', md: '12px', lg: '20px', pill: '9999px', editorial: '4px' },
      shadows: {
        subtle: '0 4px 20px rgba(0, 0, 0, 0.5)',
        elevated: '0 12px 36px rgba(0, 0, 0, 0.7)',
        glow: '0 0 32px rgba(244, 63, 94, 0.3)',
        cosmic: '0 20px 60px rgba(0, 0, 0, 0.85)',
      },
      motionIntensity: 'expressive',
    }),
  },
];

export class DesignUniverseEngine {
  static getAll(): DesignUniverse[] {
    return DESIGN_UNIVERSES;
  }

  static getById(id: string): DesignUniverse {
    const found = DESIGN_UNIVERSES.find((u) => u.id === id);
    return found || DESIGN_UNIVERSES[0]!;
  }

  static applyUniverse(universeId: string, currentTokens: TemplateDesignTokens): TemplateDesignTokens {
    const universe = this.getById(universeId);
    return {
      ...currentTokens,
      colors: {
        ...currentTokens.colors,
        ...universe.tokens.colors,
      },
      typography: {
        ...currentTokens.typography,
        ...universe.tokens.typography,
      },
      radius: {
        ...currentTokens.radius,
        ...universe.tokens.radius,
      },
      shadows: {
        ...currentTokens.shadows,
        ...universe.tokens.shadows,
      },
      motion: {
        ...currentTokens.motion,
        ...universe.tokens.motion,
      },
    };
  }
}
