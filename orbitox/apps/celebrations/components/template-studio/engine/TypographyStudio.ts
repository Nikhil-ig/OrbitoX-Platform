import { TemplateDesignTokens } from '../types/TemplateSchema';

export interface FontPairing {
  id: string;
  name: string;
  category: 'editorial' | 'modern' | 'classical' | 'brutalist' | 'futuristic' | 'organic';
  displayFont: string;
  headingFont: string;
  bodyFont: string;
  accentFont: string;
  description: string;
  sampleHeadline: string;
}

export const FONT_PAIRINGS: FontPairing[] = [
  {
    id: 'editorial-couture',
    name: 'Editorial Couture',
    category: 'editorial',
    displayFont: "'Cormorant Garamond', serif",
    headingFont: "'Cormorant Garamond', serif",
    bodyFont: "'Inter', sans-serif",
    accentFont: "'Playfair Display', serif",
    description: 'High-fashion editorial elegance. Slender serif headlines with crisp geometric body text.',
    sampleHeadline: 'The Art of Timeless Architectural Harmony',
  },
  {
    id: 'classical-majesty',
    name: 'Classical Majesty',
    category: 'classical',
    displayFont: "'Cinzel', serif",
    headingFont: "'Outfit', sans-serif",
    bodyFont: "'Outfit', sans-serif",
    accentFont: "'Cormorant Garamond', serif",
    description: 'Imperial Roman inscriptions paired with luxurious modern geometric sans.',
    sampleHeadline: 'CELESTIAL REALMS & MONUMENTAL OCCASIONS',
  },
  {
    id: 'modern-saas-clarity',
    name: 'Modern SaaS Clarity',
    category: 'modern',
    displayFont: "'Space Grotesk', sans-serif",
    headingFont: "'Space Grotesk', sans-serif",
    bodyFont: "'Inter', sans-serif",
    accentFont: "'JetBrains Mono', monospace",
    description: 'Ultra-modern tech posture. High legibility, geometric balance, and developer-grade precision.',
    sampleHeadline: 'Next-Generation Autonomous Systems',
  },
  {
    id: 'botanical-editorial',
    name: 'Botanical Warmth',
    category: 'organic',
    displayFont: "'Playfair Display', serif",
    headingFont: "'Playfair Display', serif",
    bodyFont: "'DM Sans', sans-serif",
    accentFont: "'Cormorant Garamond', serif",
    description: 'Organic human warmth. Warm literary serif with friendly, rhythmic sans body text.',
    sampleHeadline: 'Cultivating Moments of Pure Wonder',
  },
  {
    id: 'neo-brutalist-impact',
    name: 'Brutalist Monolith',
    category: 'brutalist',
    displayFont: "'Space Grotesk', sans-serif",
    headingFont: "'Space Grotesk', sans-serif",
    bodyFont: "'Inter', sans-serif",
    accentFont: "'JetBrains Mono', monospace",
    description: 'High-contrast bold statements with sharp industrial monospaced accents.',
    sampleHeadline: 'UNCOMPROMISING DIRECT MANIPULATION',
  },
];

export class TypographyStudioEngine {
  static getAllPairings(): FontPairing[] {
    return FONT_PAIRINGS;
  }

  static getPairingById(id: string): FontPairing {
    const found = FONT_PAIRINGS.find((p) => p.id === id);
    return found || FONT_PAIRINGS[0]!;
  }

  static ensureGoogleFontsLoaded(): void {
    if (typeof document === 'undefined') return;
    if (!document.getElementById('orbitox-google-fonts')) {
      const link = document.createElement('link');
      link.id = 'orbitox-google-fonts';
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;800&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Outfit:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Space+Grotesk:wght@400;500;600;700&display=swap';
      document.head.appendChild(link);
    }
  }

  static applyPairing(pairingId: string, currentTokens: TemplateDesignTokens): TemplateDesignTokens {
    this.ensureGoogleFontsLoaded();
    const pairing = this.getPairingById(pairingId);
    return {
      ...currentTokens,
      typography: {
        ...currentTokens.typography,
        displayFont: pairing.displayFont,
        headingFont: pairing.headingFont,
        bodyFont: pairing.bodyFont,
        accentFont: pairing.accentFont,
      },
    };
  }
}
