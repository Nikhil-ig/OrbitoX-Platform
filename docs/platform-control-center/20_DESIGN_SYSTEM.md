# 🪐 OrbitoX Platform Control Center: Design System Specifications (v3.1)
**Document Ref: PCC-20**  
**Classification: Design Tokens, Typography, Surfaces & Interaction Rules**

---

## 1. Design Token Architecture (`PlatformTokens`)

All UI components must strictly consume centralized tokens. No component may hardcode arbitrary HEX colors, margins, or glowing effects.

```ts
export const PlatformTokens = {
  colors: {
    // 70% Neutral Surfaces
    bg: {
      canvas: '#09090B',        // Deepest charcoal base
      sidebar: '#0C0D10',       // Structured sidebar surface
      surface: '#121316',       // Main card/table surface
      surfaceRaised: '#18191E', // Modals, dropdowns, inspector drawer
      surfaceHover: '#1F2026',  // Row and button hover state
      input: '#121316',         // Text input backgrounds
    },
    // Borders
    border: {
      subtle: 'rgba(255, 255, 255, 0.06)',
      default: 'rgba(255, 255, 255, 0.10)',
      strong: 'rgba(255, 255, 255, 0.16)',
      focus: '#6366F1',
    },
    // Typography
    text: {
      primary: '#F4F4F5',       // High contrast readable text
      secondary: '#A1A1AA',     // Descriptive labels and subtitles
      muted: '#71717A',         // Timestamps, table headers, IDs
      inverted: '#09090B',      // Text on light accent buttons
    },
    // 10% Semantic Accents
    accent: {
      primary: '#6366F1',       // Indigo primary interaction
      primaryHover: '#4F46E5',
      primarySubtle: 'rgba(99, 102, 241, 0.12)',
    },
    status: {
      healthy: '#10B981',       // Emerald
      healthySubtle: 'rgba(16, 185, 129, 0.12)',
      warning: '#F59E0B',       // Amber
      warningSubtle: 'rgba(245, 158, 11, 0.12)',
      danger: '#F43F5E',        // Rose
      dangerSubtle: 'rgba(244, 63, 94, 0.12)',
      info: '#38BDF8',          // Sky
      infoSubtle: 'rgba(56, 189, 248, 0.12)',
    },
  },
  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: '"SF Mono", "Fira Code", Menlo, Monaco, Consolas, monospace',
    },
    fontSize: {
      xs: '11px',
      sm: '12px',
      base: '13px',
      md: '14px',
      lg: '16px',
      xl: '20px',
      xxl: '24px',
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.625,
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    xxl: '32px',
    xxxl: '48px',
  },
  radius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    full: '9999px',
  },
  shadow: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.2)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
    drawer: '-8px 0 24px rgba(0, 0, 0, 0.5)',
  },
};
```

---

## 2. Component Composition Guidelines

### 2.1. The Data Table Standard
- Header rows: `height: 36px`, `fontSize: 11px`, `fontWeight: 600`, uppercase tracking (`0.05em`), muted gray (`#71717A`), single hairline bottom border.
- Data rows: `height: 48px`, `fontSize: 13px`, subtle background transition on hover (`#1F2026`), cursor pointer.
- Status cells: 6px circular dot (`#10B981`, `#F59E0B`, `#F43F5E`) followed by plain text label (`Healthy`, `Attention`, `Failed`). No heavy pill background on every cell.

### 2.2. The Resource Inspector Standard
- Fixed right overlay drawer: `width: 440px`, background: `#121316`, border-left: `1px solid rgba(255, 255, 255, 0.10)`.
- Header: Entity type (11px mono), Entity Name (16px bold), close button (Escape key enabled).
- Section tabs: Overview, Configuration, Security, Usage, Activity.
- Code & Cryptographic fields: Monospace block with copy button, never truncated without tooltip.

### 2.3. The Command Palette (⌘K)
- Centered modal: `maxWidth: 580px`, background: `#18191E`, backdrop blur.
- Input: Auto-focused, placeholder: "Type a command or search entities...".
- Grouped results: Actions, Projects, API Keys, Packages, Settings.
- Keyboard navigation: Arrow keys, Enter to execute, Escape to dismiss.
