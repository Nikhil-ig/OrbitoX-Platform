/**
 * 🛡️ CSS Security & Allowlist-Based Sanitizer for White-Label Custom Themes
 * ─────────────────────────────────────────────────────────────────────────────
 * Adheres to OWASP ASVS & OWASP CSS Injection Prevention Guidelines.
 *
 * Requirements:
 * 1. Allowlist-based CSS properties (typography, color, spacing, borders, layout).
 * 2. Strict rejection of dangerous at-rules (@import, @keyframes, @font-face, @media).
 * 3. Strict rejection of external resource loading (url(), image(), data:).
 * 4. Strict rejection of script execution vectors (expression(), javascript:, -moz-binding, behavior).
 * 5. Rejection of UI hijacking/overlaying (position: fixed, extreme z-index, opacity: 0 on sensitive elements).
 * 6. Scoped container enforcement (enforces rules under .brand-custom-theme or .storefront-root).
 * 7. Payload length bound (max 16,384 characters).
 */

export interface CssValidationResult {
  valid: boolean;
  sanitizedCss?: string;
  error?: string;
  rejectedRule?: string;
}

// 1. Allowed CSS Properties
const ALLOWED_CSS_PROPERTIES = new Set([
  // Typography
  'color',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'text-align',
  'text-transform',
  'text-decoration',
  'word-break',
  'overflow-wrap',

  // Spacing & Box Model
  'padding',
  'padding-top',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'margin',
  'margin-top',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'border-radius',
  'border',
  'border-top',
  'border-bottom',
  'border-left',
  'border-right',
  'border-color',
  'border-width',
  'border-style',
  'box-shadow',

  // Background (Color only, NO url)
  'background-color',
  'background',

  // Sizing & Grid/Flex
  'width',
  'min-width',
  'max-width',
  'height',
  'min-height',
  'max-height',
  'gap',
  'row-gap',
  'column-gap',
  'display',
  'flex-direction',
  'flex-wrap',
  'align-items',
  'justify-content',
  'cursor',
  'transition',
  'opacity',
]);

// 2. Dangerous value patterns
const PROHIBITED_VALUE_PATTERNS = [
  /url\s*\(/i,
  /expression\s*\(/i,
  /javascript\s*:/i,
  /data\s*:/i,
  /<script/i,
  /<\/style/i,
  /-moz-binding/i,
  /behavior\s*:/i,
  /binding\s*:/i,
  /@import/i,
  /@font-face/i,
  /@keyframes/i,
  /@media/i,
  /@supports/i,
  /@namespace/i,
  /position\s*:\s*fixed/i,
  /z-index\s*:\s*(?:9{4,}|[1-9]\d{5,})/i, // block extreme z-index overlays
];

// Sensitive selectors that must not be hidden or made transparent
const PROTECTED_SELECTORS = /(?:submit|checkout|total|price|tax|cart-bar|float-bar|modal|alert|error)/i;

/**
 * Validates and sanitizes custom CSS submitted by tenants.
 */
export function validateAndSanitizeCustomCss(rawCss: string, scopeSelector: string = '.brand-custom-theme'): CssValidationResult {
  if (!rawCss || typeof rawCss !== 'string') {
    return { valid: true, sanitizedCss: '' };
  }

  // 1. Payload size constraint (16 KB max)
  if (rawCss.length > 16384) {
    return {
      valid: false,
      error: 'Custom CSS exceeds maximum permitted size of 16KB.',
    };
  }

  // 2. Check for prohibited at-rules or script execution vectors in raw content
  for (const pattern of PROHIBITED_VALUE_PATTERNS) {
    if (pattern.test(rawCss)) {
      return {
        valid: false,
        error: `Prohibited CSS construct detected (${pattern.toString()}). External network requests, script expressions, and screen overlays are blocked.`,
      };
    }
  }

  // 3. Normalize comments and whitespace
  const strippedCss = rawCss.replace(/\/\*[\s\S]*?\*\//g, '').trim();
  if (!strippedCss) {
    return { valid: true, sanitizedCss: '' };
  }

  // 4. Parse individual CSS rules
  const rulePattern = /([^{}]+)\{([^}]+)\}/g;
  let match: RegExpExecArray | null;
  const sanitizedRules: string[] = [];
  let foundAnyRule = false;

  while ((match = rulePattern.exec(strippedCss)) !== null) {
    foundAnyRule = true;
    const rawSelector = match[1].trim();
    const declarations = match[2].trim();

    // Forbid dangerous tags like iframe, script, meta, link, object, embed
    if (/\b(iframe|script|meta|link|object|embed|applet)\b/i.test(rawSelector)) {
      return {
        valid: false,
        error: `Forbidden element styling: "${rawSelector}". Dangerous HTML elements cannot be styled.`,
        rejectedRule: rawSelector,
      };
    }

    // Check if selector attempts to hide or manipulate protected checkout controls
    const isProtectedTarget = PROTECTED_SELECTORS.test(rawSelector);

    // Validate each declaration in the rule block
    const declarationList = declarations.split(';').map((d) => d.trim()).filter(Boolean);
    const validDeclarations: string[] = [];

    for (const decl of declarationList) {
      const colonIdx = decl.indexOf(':');
      if (colonIdx === -1) {
        return {
          valid: false,
          error: `Malformed declaration syntax: "${decl}".`,
        };
      }

      const prop = decl.slice(0, colonIdx).trim().toLowerCase();
      const val = decl.slice(colonIdx + 1).trim();

      // Check property allowlist (permit standard allowlist properties and safe CSS custom properties --*)
      const isCustomProperty = prop.startsWith('--') && /^[a-z0-9-_]+$/i.test(prop);
      if (!ALLOWED_CSS_PROPERTIES.has(prop) && !isCustomProperty) {
        return {
          valid: false,
          error: `Property "${prop}" is not permitted in white-label styling. Permitted properties include colors, fonts, spacing, borders, and CSS theme variables.`,
          rejectedRule: `${prop}: ${val}`,
        };
      }

      // Check prohibited value tokens
      for (const pattern of PROHIBITED_VALUE_PATTERNS) {
        if (pattern.test(val)) {
          return {
            valid: false,
            error: `Prohibited value construct in "${prop}: ${val}".`,
            rejectedRule: `${prop}: ${val}`,
          };
        }
      }

      // Protect against hiding critical buttons/prices
      if (isProtectedTarget) {
        if (/display\s*:\s*none/i.test(decl) || /visibility\s*:\s*hidden/i.test(decl) || /opacity\s*:\s*0(?:\.0+)?/i.test(decl)) {
          return {
            valid: false,
            error: `Cannot hide or obscure critical checkout or pricing controls in selector "${rawSelector}".`,
            rejectedRule: decl,
          };
        }
      }

      // If background, ensure no url( or image( is embedded
      if (prop === 'background' || prop === 'background-color') {
        if (/\b(?:url|image|image-set)\b/i.test(val)) {
          return {
            valid: false,
            error: `External image URLs forbidden in background properties. Use approved brand logo settings.`,
            rejectedRule: decl,
          };
        }
      }

      validDeclarations.push(`${prop}: ${val}`);
    }

    // Prefix selector with scopeSelector (mapping body, html, :root directly to scope container)
    const scopedSelector = rawSelector
      .split(',')
      .map((s) => s.trim())
      .map((s) => {
        if (s === 'body' || s === ':root' || s === 'html') {
          return scopeSelector;
        }
        if (s.startsWith(scopeSelector)) {
          return s;
        }
        return `${scopeSelector} ${s}`;
      })
      .join(', ');

    sanitizedRules.push(`${scopedSelector} {\n  ${validDeclarations.join(';\n  ')};\n}`);
  }

  // If content was provided but no valid { ... } rule block was found
  if (!foundAnyRule && strippedCss.length > 0) {
    return {
      valid: false,
      error: 'Malformed CSS structure: no valid declaration blocks found.',
    };
  }

  return {
    valid: true,
    sanitizedCss: sanitizedRules.join('\n\n'),
  };
}
