/**
 * 🍷 RestaurantOS 2.0 Design Tokens
 * ─────────────────────────────────────────────────────────────────────────────
 * Theme Direction: WARM NOIR / MODERN HOSPITALITY
 * Reference: Apple-level restraint + Linear-level information architecture +
 *            Editorial hospitality aesthetic + Serious operational ergonomics.
 */

export const RestaurantTokens = {
  colors: {
    // Canvas & Layer Hierarchy
    ink: '#0D0F10',          // Deepest canvas base
    charcoal: '#151719',     // Shell sidebar, headers, secondary surfaces
    elevated: '#1C1F21',     // Modals, inspectors, active toolbars, hover rows
    surfaceHover: '#24282B', // Interactive hover state
    surfaceBorder: 'rgba(255, 255, 255, 0.08)',
    borderSubtle: 'rgba(255, 255, 255, 0.05)',
    borderDefault: 'rgba(255, 255, 255, 0.10)',
    borderStrong: 'rgba(255, 255, 255, 0.18)',

    // Warm Hospitality Neutrals
    linen: '#F3EEE5',        // Primary text, guest surfaces, warm white
    stone: '#A8A196',        // Muted secondary text, micro-labels
    muted: '#706B63',        // Timestamps, subtle borders, inactive tabs

    // Restrained Functional Accents (Never oversaturated or sprayed everywhere)
    copper: '#C86B3C',       // Primary action, warmth, focal attention (Ember)
    copperHover: '#D87B4C',  // Hover state
    copperSubtle: 'rgba(200, 107, 60, 0.12)',
    copperBorder: 'rgba(200, 107, 60, 0.35)',
    focusRing: 'rgba(200, 107, 60, 0.55)',

    // Operational Semantic States
    sage: '#5D9A7A',         // Success, Seated, Ready, Cooking on track
    sageSubtle: 'rgba(93, 154, 122, 0.12)',
    amber: '#D99A45',        // Attention required, Delayed, Bill requested
    amberSubtle: 'rgba(217, 154, 69, 0.14)',
    crimson: '#C95757',      // SLA breach, Voided, Danger, Urgent alert
    crimsonSubtle: 'rgba(201, 87, 87, 0.15)',
    sky: '#4A8BB2',          // Info, Drink / Bar station
    skySubtle: 'rgba(74, 139, 178, 0.12)',

    // Inactive & Disabled states
    disabled: '#5A554E',
    disabledBg: 'rgba(255, 255, 255, 0.03)',
  },

  typography: {
    staffFont: 'system-ui, -apple-system, BlinkMacSystemFont, "Geist", "Inter", "Segoe UI", sans-serif',
    guestHeadFont: '"Playfair Display", "Cormorant Garamond", Georgia, "Times New Roman", serif',
    guestBodyFont: 'system-ui, -apple-system, BlinkMacSystemFont, "Inter", sans-serif',
    monoFont: 'ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace',
    sizes: {
      micro: '11px',
      xs: '12px',
      sm: '13px',
      base: '14px',
      md: '15px',
      lg: '17px',
      xl: '20px',
      headline: '24px',
      display: '32px',
    },
    lineHeights: {
      micro: '14px',
      xs: '16px',
      sm: '18px',
      base: '20px',
      md: '22px',
      lg: '24px',
      xl: '28px',
      headline: '32px',
      display: '40px',
    },
    weights: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      black: '800',
    },
  },

  radii: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    pill: '9999px',
  },

  shadows: {
    none: 'none',
    subtle: '0 1px 3px rgba(0, 0, 0, 0.4)',
    panel: '0 4px 16px rgba(0, 0, 0, 0.55)',
    inspector: '-4px 0 24px rgba(0, 0, 0, 0.65)',
    modal: '0 24px 48px -12px rgba(0, 0, 0, 0.85)',
    glowCopper: '0 0 16px rgba(200, 107, 60, 0.35)',
  },

  touch: {
    minTarget: '44px',
    kdsBump: '54px',
    navItem: '40px',
    dinerButton: '48px',
  },

  transitions: {
    instant: '100ms cubic-bezier(0.16, 1, 0.3, 1)',
    fast: '160ms cubic-bezier(0.16, 1, 0.3, 1)',
    smooth: '240ms cubic-bezier(0.16, 1, 0.3, 1)',
  },

  breakpoints: {
    mobile: '640px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1440px',
  },
};
