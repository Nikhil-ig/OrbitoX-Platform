/**
 * @orbitox-io/importer-core - Tailwind CSS Decompiler
 * Translates Tailwind utility class strings into normalized OrbitoX IR layout, geometry, styles, and typography tokens.
 */

import { ImportedNode } from '../types/ImportIR';

export interface DecompiledTailwindStyles {
  layout: Partial<ImportedNode['layout']>;
  geometry: Partial<ImportedNode['geometry']>;
  style: Partial<ImportedNode['style']>;
  typography: Partial<ImportedNode['typography']>;
  responsive: {
    tablet?: {
      layout?: Partial<ImportedNode['layout']>;
      geometry?: Partial<ImportedNode['geometry']>;
      style?: Partial<ImportedNode['style']>;
      typography?: Partial<ImportedNode['typography']>;
    };
    mobile?: {
      layout?: Partial<ImportedNode['layout']>;
      geometry?: Partial<ImportedNode['geometry']>;
      style?: Partial<ImportedNode['style']>;
      typography?: Partial<ImportedNode['typography']>;
    };
  };
  tokensFound: Array<{ name: string; value: string; type: 'color' | 'font' | 'spacing' }>;
}

const TAILWIND_COLORS: Record<string, Record<string, string>> = {
  slate: {
    '50': '#f8fafc', '100': '#f1f5f9', '200': '#e2e8f0', '300': '#cbd5e1', '400': '#94a3b8',
    '500': '#64748b', '600': '#475569', '700': '#334155', '800': '#1e293b', '900': '#0f172a', '950': '#020617',
  },
  gray: {
    '50': '#f9fafb', '100': '#f3f4f6', '200': '#e5e7eb', '300': '#d1d5db', '400': '#9ca3af',
    '500': '#6b7280', '600': '#4b5563', '700': '#374151', '800': '#1f2937', '900': '#111827', '950': '#030712',
  },
  zinc: {
    '50': '#fafafa', '100': '#f4f4f5', '200': '#e4e4e7', '300': '#d4d4d8', '400': '#a1a1aa',
    '500': '#71717a', '600': '#52525b', '700': '#3f3f46', '800': '#27272a', '900': '#18181b', '950': '#09090b',
  },
  red: {
    '50': '#fef2f2', '100': '#fee2e2', '200': '#fecaca', '300': '#fca5a5', '400': '#f87171',
    '500': '#ef4444', '600': '#dc2626', '700': '#b91c1c', '800': '#991b1b', '900': '#7f1d1d', '950': '#450a0a',
  },
  blue: {
    '50': '#eff6ff', '100': '#dbeafe', '200': '#bfdbfe', '300': '#93c5fd', '400': '#60a5fa',
    '500': '#3b82f6', '600': '#2563eb', '700': '#1d4ed8', '800': '#1e40af', '900': '#1e3a8a', '950': '#172554',
  },
  indigo: {
    '50': '#eef2ff', '100': '#e0e7ff', '200': '#c7d2fe', '300': '#a5b4fc', '400': '#818cf8',
    '500': '#6366f1', '600': '#4f46e5', '700': '#4338ca', '800': '#3730a3', '900': '#312e81', '950': '#1e1b4b',
  },
  emerald: {
    '50': '#ecfdf5', '100': '#d1fae5', '200': '#a7f3d0', '300': '#6ee7b7', '400': '#34d399',
    '500': '#10b981', '600': '#059669', '700': '#047857', '800': '#065f46', '900': '#064e3b', '950': '#022c22',
  },
  amber: {
    '50': '#fffbeb', '100': '#fef3c7', '200': '#fde68a', '300': '#fcd34d', '400': '#fbbf24',
    '500': '#f59e0b', '600': '#d97706', '700': '#b45309', '800': '#92400e', '900': '#78350f', '950': '#451a03',
  },
  purple: {
    '50': '#faf5ff', '100': '#f3e8ff', '200': '#e9d5ff', '300': '#d8b4fe', '400': '#c084fc',
    '500': '#a855f7', '600': '#9333ea', '700': '#7e22ce', '800': '#6b21a8', '900': '#581c87', '950': '#3b0764',
  },
};

const BASE_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  transparent: 'transparent',
  current: 'currentColor',
};

const SPACING_MAP: Record<string, number> = {
  '0': 0, 'px': 1, '0.5': 2, '1': 4, '1.5': 6, '2': 8, '2.5': 10, '3': 12, '3.5': 14,
  '4': 16, '5': 20, '6': 24, '7': 28, '8': 32, '9': 36, '10': 40, '11': 44, '12': 48,
  '14': 56, '16': 64, '20': 80, '24': 96, '28': 112, '32': 128, '36': 144, '40': 160,
  '44': 176, '48': 192, '52': 208, '56': 224, '60': 240, '64': 256, '72': 288, '80': 320, '96': 384,
};

const FONT_SIZE_MAP: Record<string, number> = {
  'xs': 12, 'sm': 14, 'base': 16, 'lg': 18, 'xl': 20, '2xl': 24, '3xl': 30,
  '4xl': 36, '5xl': 48, '6xl': 60, '7xl': 72, '8xl': 96, '9xl': 128,
};

const FONT_WEIGHT_MAP: Record<string, number> = {
  'thin': 100, 'extralight': 200, 'light': 300, 'normal': 400, 'medium': 500,
  'semibold': 600, 'bold': 700, 'extrabold': 800, 'black': 900,
};

const BORDER_RADIUS_MAP: Record<string, number> = {
  'none': 0, 'sm': 2, 'DEFAULT': 4, 'md': 6, 'lg': 8, 'xl': 12, '2xl': 16, '3xl': 24, 'full': 9999,
};

export class TailwindDecompiler {
  /**
   * Decompiles a className string containing space-separated utility classes into IR styles
   */
  public static decompile(classNameString: string): DecompiledTailwindStyles {
    const result: DecompiledTailwindStyles = {
      layout: {},
      geometry: {},
      style: {},
      typography: {},
      responsive: {},
      tokensFound: [],
    };

    if (!classNameString || typeof classNameString !== 'string') return result;

    const classes = classNameString.trim().split(/\s+/).filter(Boolean);

    for (const rawClass of classes) {
      let targetResult: {
        layout: Partial<ImportedNode['layout']>;
        geometry: Partial<ImportedNode['geometry']>;
        style: Partial<ImportedNode['style']>;
        typography: Partial<ImportedNode['typography']>;
      } = result;
      let cls = rawClass;

      // Check responsive variant prefixes
      if (cls.startsWith('md:')) {
        cls = cls.slice(3);
        if (!result.responsive.tablet) result.responsive.tablet = {};
        const tablet = result.responsive.tablet;
        if (!tablet.layout) tablet.layout = { mode: 'flow' };
        if (!tablet.geometry) tablet.geometry = { width: 'full', height: 'auto' };
        if (!tablet.style) tablet.style = {};
        targetResult = {
          layout: tablet.layout,
          geometry: tablet.geometry,
          style: tablet.style,
          typography: tablet.typography || (tablet.typography = { fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 400, lineHeight: 1.4, color: '#FFFFFF' }),
        };
      } else if (cls.startsWith('sm:') || cls.startsWith('max-md:')) {
        cls = cls.replace(/^(sm:|max-md:)/, '');
        if (!result.responsive.mobile) result.responsive.mobile = {};
        const mobile = result.responsive.mobile;
        if (!mobile.layout) mobile.layout = { mode: 'flow' };
        if (!mobile.geometry) mobile.geometry = { width: 'full', height: 'auto' };
        if (!mobile.style) mobile.style = {};
        targetResult = {
          layout: mobile.layout,
          geometry: mobile.geometry,
          style: mobile.style,
          typography: mobile.typography || (mobile.typography = { fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 400, lineHeight: 1.4, color: '#FFFFFF' }),
        };
      } else if (cls.startsWith('lg:') || cls.startsWith('xl:') || cls.startsWith('2xl:')) {
        // Base / desktop override
        cls = cls.replace(/^(lg:|xl:|2xl:)/, '');
      }

      this.processClass(cls, targetResult, result.tokensFound);
    }

    return result;
  }

  private static processClass(
    cls: string,
    target: {
      layout: Partial<ImportedNode['layout']>;
      geometry: Partial<ImportedNode['geometry']>;
      style: Partial<ImportedNode['style']>;
      typography: Partial<ImportedNode['typography']>;
    },
    tokensFound: Array<{ name: string; value: string; type: 'color' | 'font' | 'spacing' }>
  ): void {
    // 1. Flex & Grid Layout
    if (cls === 'flex' || cls === 'inline-flex') {
      target.layout.mode = 'flex';
      if (!target.layout.direction) target.layout.direction = 'horizontal';
    } else if (cls === 'flex-col') {
      target.layout.mode = 'flex';
      target.layout.direction = 'vertical';
    } else if (cls === 'flex-row') {
      target.layout.mode = 'flex';
      target.layout.direction = 'horizontal';
    } else if (cls === 'flex-wrap') {
      target.layout.wrap = true;
    } else if (cls === 'flex-nowrap') {
      target.layout.wrap = false;
    } else if (cls === 'grid') {
      target.layout.mode = 'grid';
    } else if (cls.startsWith('grid-cols-')) {
      target.layout.mode = 'grid';
      const cols = cls.replace('grid-cols-', '');
      target.layout.gridColumns = `repeat(${cols}, minmax(0, 1fr))`;
    }

    // Alignment
    if (cls === 'items-start') target.layout.alignItems = 'start';
    else if (cls === 'items-center') target.layout.alignItems = 'center';
    else if (cls === 'items-end') target.layout.alignItems = 'end';
    else if (cls === 'items-stretch') target.layout.alignItems = 'stretch';

    if (cls === 'justify-start') target.layout.justifyContent = 'start';
    else if (cls === 'justify-center') target.layout.justifyContent = 'center';
    else if (cls === 'justify-end') target.layout.justifyContent = 'end';
    else if (cls === 'justify-between') target.layout.justifyContent = 'space-between';
    else if (cls === 'justify-around') target.layout.justifyContent = 'space-around';

    // 2. Spacing: Gap & Padding
    if (cls.startsWith('gap-')) {
      const val = this.resolveSpacing(cls.replace('gap-', ''));
      if (val !== undefined) target.layout.gap = val;
    } else if (cls.startsWith('p-')) {
      const val = this.resolveSpacing(cls.replace('p-', ''));
      if (val !== undefined) {
        target.layout.padding = { top: val, right: val, bottom: val, left: val };
      }
    } else if (cls.startsWith('px-')) {
      const val = this.resolveSpacing(cls.replace('px-', ''));
      if (val !== undefined) {
        const cur = target.layout.padding || { top: 0, right: 0, bottom: 0, left: 0 };
        target.layout.padding = { ...cur, right: val, left: val };
      }
    } else if (cls.startsWith('py-')) {
      const val = this.resolveSpacing(cls.replace('py-', ''));
      if (val !== undefined) {
        const cur = target.layout.padding || { top: 0, right: 0, bottom: 0, left: 0 };
        target.layout.padding = { ...cur, top: val, bottom: val };
      }
    } else if (cls.startsWith('pt-')) {
      const val = this.resolveSpacing(cls.replace('pt-', ''));
      if (val !== undefined) {
        const cur = target.layout.padding || { top: 0, right: 0, bottom: 0, left: 0 };
        target.layout.padding = { ...cur, top: val };
      }
    } else if (cls.startsWith('pb-')) {
      const val = this.resolveSpacing(cls.replace('pb-', ''));
      if (val !== undefined) {
        const cur = target.layout.padding || { top: 0, right: 0, bottom: 0, left: 0 };
        target.layout.padding = { ...cur, bottom: val };
      }
    }

    // 3. Geometry (Width & Height)
    if (cls === 'w-full') target.geometry.width = 'full';
    else if (cls === 'w-auto') target.geometry.width = 'auto';
    else if (cls.startsWith('w-')) {
      const val = this.resolveSpacing(cls.replace('w-', ''));
      if (val !== undefined) target.geometry.width = val;
    }

    if (cls === 'h-full') target.geometry.height = 'full';
    else if (cls === 'h-auto') target.geometry.height = 'auto';
    else if (cls.startsWith('h-')) {
      const val = this.resolveSpacing(cls.replace('h-', ''));
      if (val !== undefined) target.geometry.height = val;
    }

    if (cls.startsWith('max-w-')) {
      const v = cls.replace('max-w-', '');
      if (v === 'full') target.geometry.maxWidth = 'full';
      else {
        const sp = this.resolveSpacing(v);
        if (sp) target.geometry.maxWidth = sp;
      }
    }

    // 4. Background Colors
    if (cls.startsWith('bg-')) {
      const colorVal = this.resolveColor(cls.replace('bg-', ''));
      if (colorVal) {
        target.style.fills = [{ type: 'solid', color: colorVal }];
        tokensFound.push({ name: cls, value: colorVal, type: 'color' });
      }
    }

    // 5. Text & Typography
    if (cls.startsWith('text-')) {
      const suffix = cls.replace('text-', '');
      if (!target.typography) {
        target.typography = { fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 400, lineHeight: 1.4, color: '#FFFFFF' };
      }
      if (FONT_SIZE_MAP[suffix]) {
        target.typography.fontSize = FONT_SIZE_MAP[suffix];
      } else if (suffix === 'center' || suffix === 'left' || suffix === 'right' || suffix === 'justify') {
        target.typography.textAlign = suffix;
      } else {
        const colorVal = this.resolveColor(suffix);
        if (colorVal) {
          target.typography.color = colorVal;
          tokensFound.push({ name: cls, value: colorVal, type: 'color' });
        }
      }
    }

    if (cls.startsWith('font-')) {
      const suffix = cls.replace('font-', '');
      if (FONT_WEIGHT_MAP[suffix]) {
        if (!target.typography) {
          target.typography = { fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 400, lineHeight: 1.4, color: '#FFFFFF' };
        }
        target.typography.fontWeight = FONT_WEIGHT_MAP[suffix];
      }
    }

    // 6. Border & Radius
    if (cls.startsWith('rounded-')) {
      const suffix = cls.replace('rounded-', '');
      if (BORDER_RADIUS_MAP[suffix] !== undefined) {
        target.style.borderRadius = BORDER_RADIUS_MAP[suffix];
      }
    } else if (cls === 'rounded') {
      target.style.borderRadius = BORDER_RADIUS_MAP.DEFAULT;
    }

    if (cls === 'border') {
      target.style.strokes = [{ color: 'rgba(255, 255, 255, 0.1)', width: 1, style: 'solid' }];
    } else if (cls.startsWith('border-')) {
      const suffix = cls.replace('border-', '');
      if (/^\d+$/.test(suffix)) {
        const w = parseInt(suffix, 10);
        target.style.strokes = [{ color: 'rgba(255, 255, 255, 0.1)', width: w, style: 'solid' }];
      } else {
        const colorVal = this.resolveColor(suffix);
        if (colorVal) {
          const curWidth = target.style.strokes?.[0]?.width || 1;
          target.style.strokes = [{ color: colorVal, width: curWidth, style: 'solid' }];
          tokensFound.push({ name: cls, value: colorVal, type: 'color' });
        }
      }
    }

    // 7. Box Shadow
    if (cls === 'shadow') {
      target.style.boxShadow = [{ x: 0, y: 1, blur: 3, spread: 0, color: 'rgba(0,0,0,0.1)' }];
    } else if (cls === 'shadow-md') {
      target.style.boxShadow = [{ x: 0, y: 4, blur: 6, spread: -1, color: 'rgba(0,0,0,0.1)' }];
    } else if (cls === 'shadow-lg') {
      target.style.boxShadow = [{ x: 0, y: 10, blur: 15, spread: -3, color: 'rgba(0,0,0,0.1)' }];
    } else if (cls === 'shadow-xl') {
      target.style.boxShadow = [{ x: 0, y: 20, blur: 25, spread: -5, color: 'rgba(0,0,0,0.1)' }];
    } else if (cls === 'shadow-2xl') {
      target.style.boxShadow = [{ x: 0, y: 25, blur: 50, spread: -12, color: 'rgba(0,0,0,0.25)' }];
    }
  }

  private static resolveSpacing(value: string): number | undefined {
    // Check arbitrary value e.g. [24px] or [1.5rem]
    if (value.startsWith('[') && value.endsWith(']')) {
      const raw = value.slice(1, -1);
      if (raw.endsWith('px')) return parseFloat(raw);
      if (raw.endsWith('rem')) return parseFloat(raw) * 16;
      const num = parseFloat(raw);
      if (!isNaN(num)) return num;
    }
    return SPACING_MAP[value];
  }

  private static resolveColor(value: string): string | null {
    // Check arbitrary hex e.g. [#1e293b]
    if (value.startsWith('[') && value.endsWith(']')) {
      const raw = value.slice(1, -1);
      return raw;
    }

    if (BASE_COLORS[value]) {
      return BASE_COLORS[value];
    }

    const parts = value.split('-');
    if (parts.length === 2) {
      const palette = parts[0];
      const shade = parts[1];
      if (palette && shade && TAILWIND_COLORS[palette] && TAILWIND_COLORS[palette]![shade]) {
        return TAILWIND_COLORS[palette]![shade] || null;
      }
    }

    return null;
  }
}
