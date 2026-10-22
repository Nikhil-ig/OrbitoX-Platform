/**
 * @orbitox-io/importer-core - Font Ingestion Service
 * Resolves imported typography against Google Fonts, universal system fonts, and aesthetic fallbacks.
 */

import { ImportedProject } from '../types/ImportIR';

export interface FontResolutionResult {
  resolved: boolean;
  source: 'google_fonts' | 'system' | 'custom_webfont' | 'fallback';
  family: string;
  originalFamily: string;
  weights: number[];
  googleFontUrl?: string;
  fallbackFamily: string;
  warning?: string;
}

export interface ProjectFontsReport {
  totalFontsChecked: number;
  googleFontsCount: number;
  systemFontsCount: number;
  fallbackCount: number;
  stylesheetUrls: string[];
  resolutions: Record<string, FontResolutionResult>;
}

// Universal system fonts that do not require network fetching
const SYSTEM_FONTS = new Set([
  'system-ui',
  '-apple-system',
  'blinkmacsystemfont',
  'segoe ui',
  'helvetica neue',
  'helvetica',
  'arial',
  'sans-serif',
  'times new roman',
  'times',
  'georgia',
  'serif',
  'courier new',
  'courier',
  'monospace',
  'cursive',
  'fantasy',
]);

// Top curated Google Fonts directory
const GOOGLE_FONTS = new Set([
  'inter',
  'roboto',
  'open sans',
  'montserrat',
  'lato',
  'poppins',
  'source sans pro',
  'source sans 3',
  'raleway',
  'oswald',
  'merriweather',
  'noto sans',
  'playfair display',
  'cinzel',
  'outfit',
  'plus jakarta sans',
  'dm sans',
  'space grotesk',
  'syne',
  'great vibes',
  'dancing script',
  'cormorant garamond',
  'cormorant',
  'bodoni moda',
  'epilogue',
  'manrope',
  'work sans',
  'pt sans',
  'pt serif',
  'lora',
  'nunito',
  'rubik',
  'fira sans',
  'fira code',
  'jetbrains mono',
  'space mono',
  'inconsolata',
  'source code pro',
  'barlow',
  'quicksand',
  'urbanist',
  'sora',
  'lexend',
  'bebas neue',
  'abril fatface',
  'alegreya',
  'alegreya sans',
  'cardo',
  'crimson text',
  'karla',
  'cabin',
  'libre baskerville',
  'marcellus',
  'prata',
  'fraunces',
  'cinzel decorative',
  'alex brush',
  'allura',
  'parisienne',
  'sacramento',
  'satisfy',
]);

export class FontIngestionService {
  /**
   * Resolves an individual font family and returns full metadata & stylesheet URL
   */
  public static resolveFont(
    fontFamily: string,
    weights: number[] = [400, 600, 700]
  ): FontResolutionResult {
    const cleanFamily = this.sanitizeFontFamily(fontFamily);
    const lower = cleanFamily.toLowerCase();
    const sortedWeights = Array.from(new Set(weights)).sort((a, b) => a - b);

    // 1. Check if universal system font
    if (SYSTEM_FONTS.has(lower) || lower.includes('sans-serif') || lower.includes('system-ui')) {
      return {
        resolved: true,
        source: 'system',
        family: cleanFamily,
        originalFamily: fontFamily,
        weights: sortedWeights,
        fallbackFamily: 'sans-serif',
      };
    }

    // 2. Check Google Fonts directory
    if (GOOGLE_FONTS.has(lower)) {
      const googleFontUrl = this.buildGoogleFontUrl(cleanFamily, sortedWeights);
      return {
        resolved: true,
        source: 'google_fonts',
        family: cleanFamily,
        originalFamily: fontFamily,
        weights: sortedWeights,
        googleFontUrl,
        fallbackFamily: this.getAestheticFallback(cleanFamily),
      };
    }

    // 3. Heuristic: Assume modern display font could be Google Fonts or fallback
    const fallback = this.getAestheticFallback(cleanFamily);
    const googleFontUrl = this.buildGoogleFontUrl(cleanFamily, sortedWeights);

    return {
      resolved: false,
      source: 'fallback',
      family: fallback,
      originalFamily: fontFamily,
      weights: sortedWeights,
      googleFontUrl,
      fallbackFamily: fallback,
      warning: `Font '${fontFamily}' is not in local catalog. Substituted with fallback '${fallback}'.`,
    };
  }

  /**
   * Scan entire project and resolve all typography tokens and node fonts
   */
  public static resolveProjectFonts(project: ImportedProject): ProjectFontsReport {
    const report: ProjectFontsReport = {
      totalFontsChecked: 0,
      googleFontsCount: 0,
      systemFontsCount: 0,
      fallbackCount: 0,
      stylesheetUrls: [],
      resolutions: {},
    };

    const discoveredFonts = new Map<string, number[]>(); // cleanFamily -> weights

    // Inspect design tokens
    if (project.designTokens?.typography) {
      for (const token of Object.values(project.designTokens.typography)) {
        if (token.fontFamily) {
          const clean = this.sanitizeFontFamily(token.fontFamily);
          const currentWeights = discoveredFonts.get(clean) || [];
          const tokenWeights = token.weights || [400, 700];
          discoveredFonts.set(clean, Array.from(new Set([...currentWeights, ...tokenWeights])));
        }
      }
    }

    // Inspect nodes across all sections
    for (const page of project.pages || []) {
      for (const section of page.sections || []) {
        for (const node of Object.values(section.nodes || {})) {
          if (node.typography?.fontFamily) {
            const clean = this.sanitizeFontFamily(node.typography.fontFamily);
            const currentWeights = discoveredFonts.get(clean) || [];
            const w = typeof node.typography.fontWeight === 'number' ? node.typography.fontWeight : 400;
            discoveredFonts.set(clean, Array.from(new Set([...currentWeights, w])));
          }
        }
      }
    }

    // Resolve each unique font
    for (const [family, weights] of Array.from(discoveredFonts.entries())) {
      report.totalFontsChecked++;
      const resolution = this.resolveFont(family, weights.length > 0 ? weights : [400, 600, 700]);
      report.resolutions[family] = resolution;

      if (resolution.source === 'google_fonts') {
        report.googleFontsCount++;
        if (resolution.googleFontUrl && !report.stylesheetUrls.includes(resolution.googleFontUrl)) {
          report.stylesheetUrls.push(resolution.googleFontUrl);
        }
      } else if (resolution.source === 'system') {
        report.systemFontsCount++;
      } else {
        report.fallbackCount++;
      }
    }

    // Update typography design tokens with googleFontUrl where applicable
    if (project.designTokens?.typography) {
      for (const token of Object.values(project.designTokens.typography)) {
        const clean = this.sanitizeFontFamily(token.fontFamily);
        const res = report.resolutions[clean];
        if (res?.googleFontUrl) {
          token.googleFontUrl = res.googleFontUrl;
        }
      }
    }

    return report;
  }

  public static sanitizeFontFamily(raw: string): string {
    if (!raw) return 'Inter';
    return raw.replace(/['"]/g, '').split(',')[0]!.trim();
  }

  public static buildGoogleFontUrl(family: string, weights: number[]): string {
    const formattedFamily = family.replace(/\s+/g, '+');
    const weightsStr = weights.join(';');
    return `https://fonts.googleapis.com/css2?family=${formattedFamily}:wght@${weightsStr}&display=swap`;
  }

  public static getAestheticFallback(family: string): string {
    const lower = family.toLowerCase();
    if (lower.includes('serif') || lower.includes('times') || lower.includes('garamond') || lower.includes('playfair') || lower.includes('cinzel')) {
      return 'Playfair Display, Georgia, serif';
    }
    if (lower.includes('mono') || lower.includes('code') || lower.includes('courier')) {
      return 'JetBrains Mono, Courier New, monospace';
    }
    if (lower.includes('script') || lower.includes('cursive') || lower.includes('vibes') || lower.includes('brush') || lower.includes('calligraphy')) {
      return 'Great Vibes, cursive';
    }
    return 'Inter, system-ui, sans-serif';
  }
}
