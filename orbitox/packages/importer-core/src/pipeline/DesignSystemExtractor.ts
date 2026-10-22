import {
  ImportedProject,
  ImportedNode,
  ImportedDesignTokens,
  ClusteredColorToken,
} from '../types/ImportIR';

export interface ExtractedColorItem {
  hex: string;
  normalizedHex: string;
  rgb: { r: number; g: number; b: number };
  lab: { L: number; a: number; b: number };
  chroma: number;
  occurrences: number;
  nodeIds: string[];
  inferredRoles: Set<'primary' | 'secondary' | 'background' | 'surface' | 'accent' | 'text'>;
}

export class DesignSystemExtractor {
  // Just Noticeable Difference (JND) threshold in CIELAB delta-E (perceptually equivalent)
  static readonly JND_THRESHOLD = 3.5;

  // Standard D65 Reference White
  private static readonly Xn = 95.0489;
  private static readonly Yn = 100.0;
  private static readonly Zn = 108.884;

  /**
   * Main pipeline entry point: Extract, cluster, and remap all design tokens
   */
  static extractAndCluster(project: ImportedProject): {
    project: ImportedProject;
    clusteredTokens: ClusteredColorToken[];
  } {
    // 1. Gather all raw color usages across pages and sections
    const rawColorMap = new Map<string, ExtractedColorItem>();

    const registerColor = (
      rawColor: string | undefined,
      nodeId: string,
      roleHint: 'primary' | 'secondary' | 'background' | 'surface' | 'accent' | 'text'
    ) => {
      if (!rawColor) return;
      const rgb = this.parseColorToRgb(rawColor);
      if (!rgb) return;

      const normHex = this.rgbToHex(rgb.r, rgb.g, rgb.b);
      const existing = rawColorMap.get(normHex);

      if (existing) {
        existing.occurrences++;
        existing.nodeIds.push(nodeId);
        existing.inferredRoles.add(roleHint);
      } else {
        const lab = this.rgbToLab(rgb.r, rgb.g, rgb.b);
        const chroma = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
        rawColorMap.set(normHex, {
          hex: rawColor,
          normalizedHex: normHex,
          rgb,
          lab,
          chroma,
          occurrences: 1,
          nodeIds: [nodeId],
          inferredRoles: new Set([roleHint]),
        });
      }
    };

    // Traverse all pages, sections, and nodes
    for (const page of project.pages || []) {
      for (const section of page.sections || []) {
        if (section.style?.backgroundColor) {
          registerColor(section.style.backgroundColor, section.id, 'background');
        }

        for (const [nodeId, node] of Object.entries(section.nodes || {})) {
          if (node.style?.fills) {
            for (const fill of node.style.fills) {
              if (fill.color) {
                const hint = node.kind === 'button' ? 'accent' : 'surface';
                registerColor(fill.color, nodeId, hint);
              }
            }
          }

          if (node.style?.strokes) {
            for (const stroke of node.style.strokes) {
              if (stroke.color) {
                registerColor(stroke.color, nodeId, 'surface');
              }
            }
          }

          if (node.typography?.color) {
            registerColor(node.typography.color, nodeId, 'text');
          }
        }
      }
    }

    // 2. Cluster colors using CIELAB Delta-E <= JND_THRESHOLD (2.3)
    const candidates = Array.from(rawColorMap.values()).sort((a, b) => b.occurrences - a.occurrences);
    const clusters: ClusteredColorToken[] = [];
    const hexToClusterMap = new Map<string, ClusteredColorToken>();

    for (const item of candidates) {
      if (hexToClusterMap.has(item.normalizedHex)) continue;

      // Find if this item belongs to any existing cluster
      let matchedCluster: ClusteredColorToken | null = null;
      let minDistance = Infinity;

      for (const cluster of clusters) {
        const dist = this.cielabDeltaE(item.lab, cluster.cielab);
        if (dist <= this.JND_THRESHOLD && dist < minDistance) {
          minDistance = dist;
          matchedCluster = cluster;
        }
      }

      if (matchedCluster) {
        matchedCluster.occurrences += item.occurrences;
        matchedCluster.clusteredHexVariants.push(item.normalizedHex);
        hexToClusterMap.set(item.normalizedHex, matchedCluster);
      } else {
        // Create new cluster with this item as centroid
        const role = this.inferSemanticRole(item);
        const clusterId = `token_${role}_${clusters.length + 1}`;
        const newCluster: ClusteredColorToken = {
          id: clusterId,
          name: this.formatTokenName(role, clusters.length + 1),
          hex: item.normalizedHex,
          cielab: item.lab,
          role,
          occurrences: item.occurrences,
          clusteredHexVariants: [item.normalizedHex],
        };
        clusters.push(newCluster);
        hexToClusterMap.set(item.normalizedHex, newCluster);
      }
    }

    // 3. Remap all nodes in project to clustered tokens
    const updatedTokens: ImportedDesignTokens = {
      colors: { ...(project.designTokens?.colors || {}) },
      typography: { ...(project.designTokens?.typography || {}) },
      spacing: { ...(project.designTokens?.spacing || {}) },
      shadows: { ...(project.designTokens?.shadows || {}) },
      radii: { ...(project.designTokens?.radii || {}) },
    };

    for (const cluster of clusters) {
      updatedTokens.colors[cluster.id] = {
        value: cluster.hex,
        originalName: cluster.name,
        inferredRole: cluster.role,
      };
    }

    for (const page of project.pages || []) {
      for (const section of page.sections || []) {
        if (section.style?.backgroundColor) {
          const norm = this.normalizeHex(section.style.backgroundColor);
          const cluster = hexToClusterMap.get(norm);
          if (cluster) {
            section.style.backgroundColor = cluster.hex;
          }
        }

        for (const node of Object.values(section.nodes || {})) {
          if (node.style?.fills) {
            for (const fill of node.style.fills) {
              if (fill.color) {
                const norm = this.normalizeHex(fill.color);
                const cluster = hexToClusterMap.get(norm);
                if (cluster) {
                  fill.clusteredTokenRef = cluster.id;
                  fill.tokenRef = fill.tokenRef || cluster.id;
                }
              }
            }
          }

          if (node.style?.strokes) {
            for (const stroke of node.style.strokes) {
              if (stroke.color) {
                const norm = this.normalizeHex(stroke.color);
                const cluster = hexToClusterMap.get(norm);
                if (cluster) {
                  stroke.clusteredTokenRef = cluster.id;
                  stroke.tokenRef = stroke.tokenRef || cluster.id;
                }
              }
            }
          }

          if (node.typography?.color) {
            const norm = this.normalizeHex(node.typography.color);
            const cluster = hexToClusterMap.get(norm);
            if (cluster) {
              node.typography.colorClusteredTokenRef = cluster.id;
              node.typography.colorTokenRef = node.typography.colorTokenRef || cluster.id;
            }
          }
        }
      }
    }

    project.designTokens = updatedTokens;
    return { project, clusteredTokens: clusters };
  }

  // ─────────────────────────────────────────────────────────────
  // CIELAB COLOR CONVERSION & DISTANCE
  // ─────────────────────────────────────────────────────────────

  /**
   * Euclidean CIELAB Delta-E (CIE76)
   * DeltaE = sqrt((dL)^2 + (da)^2 + (db)^2)
   */
  static cielabDeltaE(
    lab1: { L: number; a: number; b: number },
    lab2: { L: number; a: number; b: number }
  ): number {
    const dL = lab1.L - lab2.L;
    const da = lab1.a - lab2.a;
    const db = lab1.b - lab2.b;
    return Math.sqrt(dL * dL + da * da + db * db);
  }

  /**
   * Convert sRGB [0-255] to CIE L*a*b*
   */
  static rgbToLab(r: number, g: number, b: number): { L: number; a: number; b: number } {
    // 1. Inverse sRGB companding to linear RGB
    const rLin = this.inverseSrgbCompand(r / 255);
    const gLin = this.inverseSrgbCompand(g / 255);
    const bLin = this.inverseSrgbCompand(b / 255);

    // 2. Linear RGB to CIE XYZ (D65)
    const x = (rLin * 0.4124564 + gLin * 0.3575761 + bLin * 0.1804375) * 100;
    const y = (rLin * 0.2126729 + gLin * 0.7151522 + bLin * 0.072175) * 100;
    const z = (rLin * 0.0193339 + gLin * 0.119192 + bLin * 0.9503041) * 100;

    // 3. XYZ to CIELAB
    const xr = x / this.Xn;
    const yr = y / this.Yn;
    const zr = z / this.Zn;

    const fx = this.labF(xr);
    const fy = this.labF(yr);
    const fz = this.labF(zr);

    const L = 116 * fy - 16;
    const a = 500 * (fx - fy);
    const bLab = 200 * (fy - fz);

    return { L, a, b: bLab };
  }

  private static inverseSrgbCompand(c: number): number {
    if (c <= 0.04045) {
      return c / 12.92;
    }
    return Math.pow((c + 0.055) / 1.055, 2.4);
  }

  private static labF(t: number): number {
    if (t > 0.00885645167) {
      // (6/29)^3
      return Math.cbrt(t);
    }
    return (1 / 3) * (841 / 36) * t + 4 / 29;
  }

  // ─────────────────────────────────────────────────────────────
  // ROLE INFERENCE HEURISTICS
  // ─────────────────────────────────────────────────────────────

  private static inferSemanticRole(
    item: ExtractedColorItem
  ): 'primary' | 'secondary' | 'background' | 'surface' | 'accent' | 'text' {
    // If text role is heavily hinted
    if (item.inferredRoles.has('text') && !item.inferredRoles.has('background')) {
      return 'text';
    }

    // High lightness or very low lightness with low chroma = background / surface
    if (item.lab.L < 18 && item.chroma < 12) {
      return 'background';
    }
    if (item.lab.L > 92 && item.chroma < 12) {
      return 'background';
    }
    if ((item.lab.L >= 18 && item.lab.L <= 30 && item.chroma < 15) || (item.lab.L >= 80 && item.lab.L <= 92 && item.chroma < 15)) {
      return 'surface';
    }

    // High chroma = accent / primary
    if (item.chroma >= 25) {
      if (item.inferredRoles.has('accent') || item.occurrences > 2) {
        return 'primary';
      }
      return 'accent';
    }

    if (item.inferredRoles.has('primary')) return 'primary';
    if (item.inferredRoles.has('secondary')) return 'secondary';
    return 'surface';
  }

  private static formatTokenName(role: string, index: number): string {
    const titles: Record<string, string> = {
      primary: 'Primary Brand',
      secondary: 'Secondary Brand',
      accent: 'Accent Highlight',
      background: 'Canvas Background',
      surface: 'Surface Card',
      text: 'Text High Contrast',
    };
    return titles[role] ? `${titles[role]} ${index}` : `Token ${role} ${index}`;
  }

  // ─────────────────────────────────────────────────────────────
  // COLOR STRING PARSING UTILITIES
  // ─────────────────────────────────────────────────────────────

  static parseColorToRgb(str: string): { r: number; g: number; b: number } | null {
    if (!str) return null;
    const trimmed = str.trim();

    // 1. Hex format (#RGB, #RRGGBB, #RRGGBBAA)
    if (trimmed.startsWith('#')) {
      const hex = trimmed.substring(1);
      if (hex.length === 3) {
        return {
          r: parseInt(hex[0]! + hex[0]!, 16),
          g: parseInt(hex[1]! + hex[1]!, 16),
          b: parseInt(hex[2]! + hex[2]!, 16),
        };
      }
      if (hex.length >= 6) {
        return {
          r: parseInt(hex.substring(0, 2), 16),
          g: parseInt(hex.substring(2, 4), 16),
          b: parseInt(hex.substring(4, 6), 16),
        };
      }
    }

    // 2. rgb(...) or rgba(...) format
    const rgbMatch = trimmed.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgbMatch) {
      return {
        r: Math.min(255, Math.max(0, parseInt(rgbMatch[1]!, 10))),
        g: Math.min(255, Math.max(0, parseInt(rgbMatch[2]!, 10))),
        b: Math.min(255, Math.max(0, parseInt(rgbMatch[3]!, 10))),
      };
    }

    return null;
  }

  static rgbToHex(r: number, g: number, b: number): string {
    const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
  }

  static normalizeHex(str: string): string {
    const rgb = this.parseColorToRgb(str);
    if (!rgb) return str.toUpperCase();
    return this.rgbToHex(rgb.r, rgb.g, rgb.b);
  }
}
