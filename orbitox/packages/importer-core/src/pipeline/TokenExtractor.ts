import { ImportedDesignTokens, ImportedNode, ImportedProject } from '../types/ImportIR';
import { TargetDesignTokens } from '../types/TargetSchema';

export class TokenExtractor {
  /**
   * Scan project IR nodes and extract color and typography design tokens
   */
  static extract(project: ImportedProject): ImportedDesignTokens {
    const tokens: ImportedDesignTokens = {
      colors: { ...project.designTokens?.colors },
      typography: { ...project.designTokens?.typography },
      spacing: { ...project.designTokens?.spacing },
      shadows: { ...project.designTokens?.shadows },
      radii: { ...project.designTokens?.radii },
    };

    let colorIdx = 1;
    let typoIdx = 1;

    for (const page of project.pages || []) {
      for (const section of page.sections || []) {
        if (section.style?.backgroundColor) {
          tokens.colors[`bg_${colorIdx++}`] = {
            value: section.style.backgroundColor,
            inferredRole: 'background',
          };
        }

        for (const node of Object.values(section.nodes || {})) {
          if (node.style?.fills) {
            for (const fill of node.style.fills) {
              if (fill.color && !Object.values(tokens.colors).some((c) => c.value === fill.color)) {
                tokens.colors[`color_${colorIdx++}`] = {
                  value: fill.color,
                  inferredRole: node.kind === 'button' ? 'accent' : 'surface',
                };
              }
            }
          }

          if (node.typography) {
            if (
              node.typography.color &&
              !Object.values(tokens.colors).some((c) => c.value === node.typography?.color)
            ) {
              tokens.colors[`text_${colorIdx++}`] = {
                value: node.typography.color,
                inferredRole: 'text',
              };
            }

            if (
              node.typography.fontFamily &&
              !Object.values(tokens.typography).some((t) => t.fontFamily === node.typography?.fontFamily)
            ) {
              const weight = typeof node.typography.fontWeight === 'number' ? node.typography.fontWeight : 400;
              tokens.typography[`font_${typoIdx++}`] = {
                fontFamily: node.typography.fontFamily,
                fallback: 'sans-serif',
                weights: [weight],
              };
            }
          }
        }
      }
    }

    return tokens;
  }

  /**
   * Convert imported design tokens into native OrbitoX TargetDesignTokens
   */
  static compileDesignTokens(
    importedTokens: ImportedDesignTokens,
    nodes: Record<string, ImportedNode> = {}
  ): TargetDesignTokens {
    // 1. Gather color candidates
    const colorMap: Record<string, string> = {};
    for (const [key, colorObj] of Object.entries(importedTokens.colors || {})) {
      colorMap[key] = colorObj.value;
    }

    // Fallbacks if not detected
    const backgroundPrimary =
      colorMap['backgroundPrimary'] ||
      colorMap['background'] ||
      colorMap['bg'] ||
      this.findColorByRole(importedTokens.colors, 'background') ||
      '#0B0F19';

    const textPrimary =
      colorMap['textPrimary'] ||
      colorMap['text'] ||
      colorMap['foreground'] ||
      this.findColorByRole(importedTokens.colors, 'text') ||
      '#FFFFFF';

    const accentPrimary =
      colorMap['accentPrimary'] ||
      colorMap['accent'] ||
      colorMap['primary'] ||
      this.findColorByRole(importedTokens.colors, 'accent') ||
      this.findColorByRole(importedTokens.colors, 'primary') ||
      '#DFBA6B';

    const surfacePrimary =
      colorMap['surfacePrimary'] ||
      colorMap['surface'] ||
      colorMap['card'] ||
      'rgba(255, 255, 255, 0.04)';

    // 2. Resolve typography
    const typographyEntries = Object.values(importedTokens.typography || {});
    let fontDisplay = 'Playfair Display, serif';
    let fontBody = 'Inter, sans-serif';

    if (typographyEntries.length > 0) {
      const firstFont = typographyEntries[0]?.fontFamily;
      if (firstFont) {
        fontDisplay = firstFont;
        fontBody = firstFont;
      }
      if (typographyEntries.length > 1) {
        const secondFont = typographyEntries[1]?.fontFamily;
        if (secondFont) fontBody = secondFont;
      }
    }

    return {
      colors: {
        backgroundPrimary,
        backgroundSecondary: colorMap['backgroundSecondary'] || '#060B1A',
        surfacePrimary,
        surfaceSecondary: colorMap['surfaceSecondary'] || 'rgba(255, 255, 255, 0.08)',
        textPrimary,
        textSecondary: colorMap['textSecondary'] || 'rgba(255, 255, 255, 0.75)',
        textMuted: colorMap['textMuted'] || 'rgba(255, 255, 255, 0.45)',
        accentPrimary,
        accentSecondary: colorMap['accentSecondary'] || '#8B5CF6',
        borderSubtle: colorMap['borderSubtle'] || 'rgba(255, 255, 255, 0.1)',
        borderStrong: colorMap['borderStrong'] || 'rgba(255, 255, 255, 0.25)',
        gold: colorMap['gold'] || '#DFBA6B',
        ...colorMap,
      },
      typography: {
        fontDisplay,
        fontBody,
        fontScript: 'Great Vibes, cursive',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
      },
      radii: {
        sm: '4px',
        md: '8px',
        lg: '16px',
        full: '9999px',
      },
      shadows: {
        subtle: '0 4px 12px rgba(0, 0, 0, 0.25)',
        elevated: '0 12px 32px rgba(0, 0, 0, 0.5)',
      },
    };
  }

  private static findColorByRole(
    colors: ImportedDesignTokens['colors'],
    role: string
  ): string | null {
    if (!colors) return null;
    for (const item of Object.values(colors)) {
      if (item.inferredRole === role) return item.value;
    }
    return null;
  }
}
