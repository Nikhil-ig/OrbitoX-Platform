/**
 * Strict Color Parser, Validator, and WCAG Contrast Calculator.
 * Supports Hex and OKLCH; rejects all free-form CSS, injections, and unsanitized values.
 */

export interface RGB {
  r: number; // 0 - 255
  g: number; // 0 - 255
  b: number; // 0 - 255
}

export interface ColorValidationResult {
  valid: boolean;
  color?: string;
  rgb?: RGB;
  error?: string;
}

export interface ContrastResult {
  ratio: number;
  passesAA: boolean; // >= 4.5:1
  passesAALarge: boolean; // >= 3.0:1
  error?: string;
}

// Strict Hex Regex: #RGB, #RGBA, #RRGGBB, #RRGGBBAA with nothing else
const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

// Strict OKLCH Regex: oklch(L C H) or oklch(L C H / A)
const OKLCH_REGEX = /^oklch\(\s*([0-9.]+%?)\s+([0-9.]+)\s+([0-9.]+)(?:\s*\/\s*([0-9.]+%?))?\s*\)$/i;

/**
 * Validates a color string. Strictly rejects CSS injections, named colors, and invalid formats.
 */
export function validateColor(raw: string): ColorValidationResult {
  if (typeof raw !== 'string') {
    return { valid: false, error: 'Color must be a string' };
  }

  const trimmed = raw.trim();

  // Guard against injection attempts
  if (
    trimmed.includes(';') ||
    trimmed.includes(':') ||
    trimmed.includes('url(') ||
    trimmed.includes('/*') ||
    trimmed.includes('*/') ||
    trimmed.includes('\\') ||
    trimmed.includes('<') ||
    trimmed.includes('>') ||
    trimmed.includes('"') ||
    trimmed.includes("'")
  ) {
    return { valid: false, error: 'Color contains prohibited characters or injection sequences' };
  }

  // Check Hex
  if (HEX_REGEX.test(trimmed)) {
    const rgb = hexToRgb(trimmed);
    if (!rgb) {
      return { valid: false, error: 'Failed to parse hex color' };
    }
    return { valid: true, color: trimmed, rgb };
  }

  // Check OKLCH
  const oklchMatch = trimmed.match(OKLCH_REGEX);
  if (oklchMatch) {
    const lRaw = oklchMatch[1] ?? '';
    const cRaw = oklchMatch[2] ?? '';
    const hRaw = oklchMatch[3] ?? '';

    const l = lRaw.endsWith('%') ? parseFloat(lRaw) / 100 : parseFloat(lRaw);
    const c = parseFloat(cRaw);
    const h = parseFloat(hRaw);

    if (isNaN(l) || l < 0 || l > 1) {
      return { valid: false, error: 'OKLCH Lightness must be between 0 and 1 (or 0% to 100%)' };
    }
    if (isNaN(c) || c < 0 || c > 0.5) {
      return { valid: false, error: 'OKLCH Chroma must be between 0 and 0.5' };
    }
    if (isNaN(h) || h < 0 || h > 360) {
      return { valid: false, error: 'OKLCH Hue must be between 0 and 360' };
    }

    const rgb = oklchToRgb(l, c, h);
    return { valid: true, color: trimmed, rgb };
  }

  return { valid: false, error: `Invalid color format: "${trimmed}". Only strict Hex (#RRGGBB) and OKLCH (oklch(L C H)) are permitted.` };
}

/**
 * Converts valid hex string to RGB (0-255).
 */
export function hexToRgb(hex: string): RGB | null {
  const clean = hex.replace('#', '');
  let r = 0;
  let g = 0;
  let b = 0;

  if (clean.length === 3 || clean.length === 4) {
    const c0 = clean.charAt(0);
    const c1 = clean.charAt(1);
    const c2 = clean.charAt(2);
    r = parseInt(c0 + c0, 16);
    g = parseInt(c1 + c1, 16);
    b = parseInt(c2 + c2, 16);
  } else if (clean.length === 6 || clean.length === 8) {
    r = parseInt(clean.substring(0, 2), 16);
    g = parseInt(clean.substring(2, 4), 16);
    b = parseInt(clean.substring(4, 6), 16);
  } else {
    return null;
  }

  return { r, g, b };
}

/**
 * Converts OKLCH to sRGB (0-255).
 * Based on the CSS Color 4 specification matrix transformations.
 */
export function oklchToRgb(l: number, c: number, hDeg: number): RGB {
  const hRad = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  // OKLab to linear LMS
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const l_cube = l_ * l_ * l_;
  const m_cube = m_ * m_ * m_;
  const s_cube = s_ * s_ * s_;

  // Linear LMS to Linear sRGB
  const rLinear = +4.0767416621 * l_cube - 3.3077115913 * m_cube + 0.2309699292 * s_cube;
  const gLinear = -1.2684380046 * l_cube + 2.6097574011 * m_cube - 0.3413193965 * s_cube;
  const bLinear = -0.0041960863 * l_cube - 0.7034186147 * m_cube + 1.707614701 * s_cube;

  // Linear sRGB to standard gamma sRGB
  const gamma = (val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    return clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * Math.pow(clamped, 1.0 / 2.4) - 0.055;
  };

  return {
    r: Math.round(gamma(rLinear) * 255),
    g: Math.round(gamma(gLinear) * 255),
    b: Math.round(gamma(bLinear) * 255),
  };
}

/**
 * Calculates relative luminance of an sRGB color per WCAG 2.1 / 2.2.
 */
export function getRelativeLuminance(rgb: RGB): number {
  const sRGB = [rgb.r / 255, rgb.g / 255, rgb.b / 255];
  const linear = sRGB.map((c) => {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const rLin = linear[0] ?? 0;
  const gLin = linear[1] ?? 0;
  const bLin = linear[2] ?? 0;
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

/**
 * Computes contrast ratio between two colors (hex or OKLCH).
 */
export function calculateContrast(colorA: string, colorB: string): ContrastResult {
  const valA = validateColor(colorA);
  if (!valA.valid || !valA.rgb) {
    return { ratio: 1, passesAA: false, passesAALarge: false, error: `Invalid colorA: ${valA.error}` };
  }

  const valB = validateColor(colorB);
  if (!valB.valid || !valB.rgb) {
    return { ratio: 1, passesAA: false, passesAALarge: false, error: `Invalid colorB: ${valB.error}` };
  }

  const lumA = getRelativeLuminance(valA.rgb);
  const lumB = getRelativeLuminance(valB.rgb);

  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);

  const ratio = (lighter + 0.05) / (darker + 0.05);
  const roundedRatio = Math.round(ratio * 100) / 100;

  return {
    ratio: roundedRatio,
    passesAA: roundedRatio >= 4.5,
    passesAALarge: roundedRatio >= 3.0,
  };
}
