/**
 * 🪐 OrbitoX RestaurantOS Modern Design Tokens
 * ─────────────────────────────────────────────────────────────────────────────
 * Theme Direction: CLEAN MODERN HOSPITALITY / LIGHT FIRST (Apple/Linear Level)
 * Based on high-fidelity designs from 'OrbitoX — new look concept-png':
 * - R1 Today, Shared RestaurantOS sidebar, R2 Branches, R3 Floors, R4 Menu, etc.
 */

export const RestaurantTokens = {
  colors: {
    // Light Canvas & Surface Hierarchy
    canvas: '#F4F5F7',         // Main background canvas (cool light grey)
    canvasAlt: '#ECEEF2',      // Subtle canvas gradient
    card: '#FFFFFF',           // Floating card surfaces
    cardHover: '#FAFAFA',      // Card hover state
    cardBorder: 'rgba(0, 0, 0, 0.06)',
    cardBorderHover: 'rgba(0, 0, 0, 0.12)',

    // Primary Text & Content Hierarchy
    heading: '#0F172A',        // Deepest slate / primary titles
    body: '#1E293B',           // High-contrast readable body text
    secondary: '#64748B',      // Metadata, labels, secondary info
    tertiary: '#94A3B8',       // Subdued timestamps & helper text
    border: '#E2E8F0',         // Default UI borders
    borderSubtle: '#F1F5F9',   // Very light separators

    // Action Tokens
    primaryPill: '#000000',    // Solid black primary CTA pill
    primaryPillText: '#FFFFFF',
    primaryPillHover: '#1E293B',
    secondaryPill: '#FFFFFF',
    secondaryPillText: '#0F172A',
    secondaryPillBorder: '#E2E8F0',
    secondaryPillHover: '#F8FAFC',

    // Accents & Semantic Signals
    orange: '#FB923C',         // Saffron / Brand accent (Masala House orange)
    orangeDark: '#EA580C',
    orangeSubtle: '#FFF7ED',
    
    blue: '#2563EB',           // Seated tables / Active / In-progress blue
    blueLight: '#DBEAFE',
    blueSubtle: '#EFF6FF',
    
    green: '#10B981',          // Success / Open now / Paid green
    greenLight: '#D1FAE5',
    greenSubtle: '#ECFDF5',

    amber: '#F59E0B',          // Bill asked / Needs attention amber
    amberLight: '#FEF3C7',
    amberSubtle: '#FFFBEB',

    red: '#EF4444',            // Urgent / Calling / Locked out / Overdue red
    redLight: '#FEE2E2',
    redSubtle: '#FEF2F2',

    // Compatibility Mappings for Existing Views
    ink: '#F4F5F7',            // Light canvas
    charcoal: '#FFFFFF',       // Card surface
    elevated: '#FFFFFF',       // Floating panels
    surfaceHover: '#F1F5F9',   // Hover state
    surfaceBorder: 'rgba(0, 0, 0, 0.06)',
    borderDefault: '#E2E8F0',
    borderStrong: '#CBD5E1',

    linen: '#0F172A',          // Primary text
    stone: '#64748B',          // Secondary text
    muted: '#94A3B8',          // Muted text
    disabled: '#94A3B8',
    disabledBg: '#F1F5F9',

    copper: '#000000',         // Primary action
    copperHover: '#1E293B',
    copperSubtle: 'rgba(0, 0, 0, 0.04)',
    copperBorder: 'rgba(0, 0, 0, 0.12)',
    focusRing: 'rgba(37, 99, 235, 0.35)',

    sage: '#10B981',
    sageSubtle: '#ECFDF5',
    crimson: '#EF4444',
    crimsonSubtle: '#FEF2F2',
    sky: '#2563EB',
    skySubtle: '#EFF6FF',
  },

  typography: {
    staffFont: 'system-ui, -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", "Inter", "Segoe UI", sans-serif',
    guestHeadFont: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
    guestBodyFont: 'system-ui, -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", "Inter", sans-serif',
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
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '28px',
    pill: '9999px',
  },

  shadows: {
    none: 'none',
    subtle: '0 1px 3px rgba(0, 0, 0, 0.05)',
    panel: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
    inspector: '-4px 0 24px rgba(0, 0, 0, 0.08)',
    modal: '0 20px 48px -12px rgba(0, 0, 0, 0.15)',
    glowBlue: '0 0 16px rgba(37, 99, 235, 0.25)',
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
