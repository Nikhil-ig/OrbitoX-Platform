// 🪐 OrbitoX Platform Design Tokens (v3.2)
// "Quietly Powerful" - Charcoal / Graphite Layers, Refined Typography & Restrained Indigo Accent

export const tokens = {
  colors: {
    bg: {
      canvas: '#0A0C10',        // Deepest charcoal base
      sidebar: '#08090C',       // Sovereign navigation rail
      surface: '#111318',       // Elevated workspace surface
      surfaceRaised: '#161920', // Interactive hover, modals, inspector
      surfaceHover: '#1B1E27',  // High-contrast row hover
      surfaceSubtle: 'rgba(255, 255, 255, 0.02)', // Striped rows, subtle sections
      input: '#0F1116',         // Search and text inputs
    },
    border: {
      subtle: 'rgba(255, 255, 255, 0.05)',
      default: 'rgba(255, 255, 255, 0.08)',
      strong: 'rgba(255, 255, 255, 0.13)',
      focus: '#6366F1',
    },
    text: {
      primary: '#F3F4F6',       // High-clarity primary text
      secondary: '#9CA3AF',     // Subtitles, descriptive labels
      muted: '#606775',         // Micro metadata, column headers, timestamps
      inverted: '#0A0C10',      // High-contrast inverted text
    },
    accent: {
      primary: '#6366F1',       // Refined Electric Indigo
      primaryHover: '#4F46E5',
      primarySubtle: 'rgba(99, 102, 241, 0.08)',
      primaryBorder: 'rgba(99, 102, 241, 0.28)',
      brand: '#818CF8',         // Subtle violet-indigo accent
    },
    status: {
      healthy: '#10B981',       // Emerald
      healthySubtle: 'rgba(16, 185, 129, 0.08)',
      warning: '#F59E0B',       // Amber
      warningSubtle: 'rgba(245, 158, 11, 0.08)',
      danger: '#EF4444',        // Red
      dangerSubtle: 'rgba(239, 68, 68, 0.08)',
      info: '#3B82F6',          // Sky / Blue
      infoSubtle: 'rgba(59, 130, 246, 0.08)',
    },
  },
  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: '"SF Mono", Menlo, Monaco, "Cascadia Code", Consolas, monospace',
    },
    size: {
      micro: '10px',
      xs: '11px',
      sm: '12px',
      base: '13px',
      md: '14px',
      lg: '15px',
      xl: '18px',
      xxl: '22px',
      title: '28px',
    },
    weight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  radius: {
    none: '0px',
    xs: '3px',
    sm: '4px',
    md: '6px',
    lg: '8px',
    full: '9999px',
  },
  shadow: {
    none: 'none',
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    card: '0 4px 12px rgba(0, 0, 0, 0.4)',
    modal: '0 20px 40px -8px rgba(0, 0, 0, 0.75)',
    drawer: '-8px 0 28px rgba(0, 0, 0, 0.65)',
  },
};
