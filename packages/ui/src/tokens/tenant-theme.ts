/**
 * Tenant Theming Engine (White-Label & Custom Branding for RestaurantOS and Platform).
 * Enforces strict color validation, sanitization against injection, and WCAG 2.2 AA contrast rules.
 * Supports whole diner template token-sets with brand overrides (Stage 7B.1 & 7F).
 */

import { validateColor, calculateContrast, ContrastResult } from './color-validator';

export interface DinerTemplateTokenSet {
  id?: string;
  name?: string;
  version?: number | string;
  tokens?: {
    primary?: string;
    accent?: string;
    radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full' | string;
    font?: string;
    bg?: string;
    surface?: string;
  };
  layout?: {
    viewMode?: 'cards' | 'list' | 'photo-grid';
    sectionSwitches?: {
      topDishes?: boolean;
      liveStatusBar?: boolean;
      vegFilter?: boolean;
    };
  };
}

export interface TenantThemeInput {
  tenantId?: string;
  primary?: string; // Hex or OKLCH
  accent?: string;  // Hex or OKLCH
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full' | string;
  font?: string;
  template?: DinerTemplateTokenSet;
  brandOverride?: {
    primary?: string;
    accent?: string;
  };
}

export interface AppliedTenantTheme {
  primary: string;
  primaryFg: string;
  accent: string;
  accentFg: string;
  radius: string;
  font?: string;
  templateId?: string;
}

export interface TenantThemeResult {
  valid: boolean;
  css: string;
  appliedTheme: AppliedTenantTheme;
  errors: string[];
  contrastResults: {
    primaryVsFg: ContrastResult;
    accentVsFg: ContrastResult;
  };
}

export const DEFAULT_TENANT_THEME: AppliedTenantTheme = {
  primary: '#3569F5', // Ocean
  primaryFg: '#ffffff',
  accent: '#3569F5',  // Ocean
  accentFg: '#ffffff',
  radius: '1.75rem',  // 28px
};

const RADIUS_MAP: Record<string, string> = {
  none: '0px',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  card: '1.75rem',
  hero: '2rem',
  full: '9999px',
};

/**
 * Validates and sanitizes a tenant theme configuration.
 * Accepts whole template token sets (Saffron, Noir, Fresh) plus brand overrides.
 * Emits strictly scoped CSS custom property overrides under [data-tenant-theme].
 * If invalid, falls back to safe defaults and returns detailed error diagnostics.
 */
export function applyTenantTheme(input: TenantThemeInput): TenantThemeResult {
  const errors: string[] = [];

  // Resolve base values from template if provided, with brand overrides taking highest precedence
  const rawPrimary =
    input.brandOverride?.primary ??
    input.primary ??
    input.template?.tokens?.primary ??
    DEFAULT_TENANT_THEME.primary;

  const rawAccent =
    input.brandOverride?.accent ??
    input.accent ??
    input.template?.tokens?.accent ??
    DEFAULT_TENANT_THEME.accent;

  const rawRadius =
    input.radius ??
    input.template?.tokens?.radius ??
    DEFAULT_TENANT_THEME.radius;

  const rawFont =
    input.font ??
    input.template?.tokens?.font;

  // 1. Validate Primary Color
  const primaryVal = validateColor(rawPrimary);
  if (!primaryVal.valid || !primaryVal.color) {
    errors.push(`Primary color invalid: ${primaryVal.error || 'unknown error'}`);
  }

  // 2. Validate Accent Color
  const accentVal = validateColor(rawAccent);
  if (!accentVal.valid || !accentVal.color) {
    errors.push(`Accent color invalid: ${accentVal.error || 'unknown error'}`);
  }

  // Determine optimal foreground colors (Light or Dark) to satisfy WCAG AA (>= 4.5:1)
  const candidateFgs = ['#ffffff', '#09090b', '#0D0F12'];

  let bestPrimaryFg = '#ffffff';
  let bestPrimaryContrast: ContrastResult = { ratio: 1, passesAA: false, passesAALarge: false };

  if (primaryVal.valid && primaryVal.color) {
    for (const fg of candidateFgs) {
      const contrast = calculateContrast(primaryVal.color, fg);
      if (contrast.ratio > bestPrimaryContrast.ratio) {
        bestPrimaryContrast = contrast;
        bestPrimaryFg = fg;
      }
    }

    if (!bestPrimaryContrast.passesAA) {
      errors.push(
        `Primary color ${primaryVal.color} fails WCAG 2.2 AA contrast requirement (ratio ${bestPrimaryContrast.ratio}:1, required >= 4.5:1)`
      );
    }
  }

  let bestAccentFg = '#ffffff';
  let bestAccentContrast: ContrastResult = { ratio: 1, passesAA: false, passesAALarge: false };

  if (accentVal.valid && accentVal.color) {
    for (const fg of candidateFgs) {
      const contrast = calculateContrast(accentVal.color, fg);
      if (contrast.ratio > bestAccentContrast.ratio) {
        bestAccentContrast = contrast;
        bestAccentFg = fg;
      }
    }

    if (!bestAccentContrast.passesAA && !bestAccentContrast.passesAALarge) {
      errors.push(
        `Accent color ${accentVal.color} fails contrast requirement (ratio ${bestAccentContrast.ratio}:1, required >= 3.0:1 for graphical UI)`
      );
    }
  }

  // Validate Radius
  let resolvedRadius = DEFAULT_TENANT_THEME.radius;
  if (rawRadius) {
    if (RADIUS_MAP[rawRadius]) {
      resolvedRadius = RADIUS_MAP[rawRadius]!;
    } else if (/^[0-9.]+(?:px|rem|em|%)$/.test(rawRadius)) {
      resolvedRadius = rawRadius;
    } else {
      errors.push(`Invalid radius value: "${rawRadius}". Must be named step or valid CSS length.`);
    }
  }

  const isValid = errors.length === 0;

  const appliedTheme: AppliedTenantTheme = isValid
    ? {
        primary: primaryVal.color!,
        primaryFg: bestPrimaryFg,
        accent: accentVal.color!,
        accentFg: bestAccentFg,
        radius: resolvedRadius,
        font: rawFont,
        templateId: input.template?.id,
      }
    : DEFAULT_TENANT_THEME;

  const scope = input.tenantId ? `[data-tenant-theme="${sanitizeSelector(input.tenantId)}"]` : `[data-tenant-theme]`;

  const fontLine = appliedTheme.font ? `\n  --font-sans: ${appliedTheme.font};` : '';

  const css = `
${scope} {
  --color-primary: ${appliedTheme.primary};
  --color-primary-fg: ${appliedTheme.primaryFg};
  --color-accent: ${appliedTheme.accent};
  --color-accent-fg: ${appliedTheme.accentFg};
  --radius-card: ${appliedTheme.radius};
  --radius-md: ${appliedTheme.radius};${fontLine}
}
`.trim();

  return {
    valid: isValid,
    css,
    appliedTheme,
    errors,
    contrastResults: {
      primaryVsFg: bestPrimaryContrast,
      accentVsFg: bestAccentContrast,
    },
  };
}

function sanitizeSelector(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '');
}
