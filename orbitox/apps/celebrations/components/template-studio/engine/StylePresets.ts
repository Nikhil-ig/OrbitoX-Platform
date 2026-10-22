import { NodeStyle } from './SceneGraphTypes';

export interface TextStylePreset {
  id: string;
  name: string;
  typography: NodeStyle['typography'];
  responsive?: {
    tablet?: Partial<NodeStyle['typography']>;
    mobile?: Partial<NodeStyle['typography']>;
  };
}

export const TEXT_STYLE_PRESETS: Record<string, TextStylePreset> = {
  display: {
    id: 'display',
    name: 'Display',
    typography: {
      fontFamily: 'var(--cel-font-display)',
      fontSize: '4rem',
      fontWeight: 'normal',
      lineHeight: 1.1,
      letterSpacing: 'var(--cel-letter-spacing-display)',
      textAlign: 'center',
      color: { type: 'token', tokenPath: 'colors.textPrimary' },
    },
    responsive: {
      tablet: { fontSize: '3rem' },
      mobile: { fontSize: '2.5rem' },
    }
  },
  heading: {
    id: 'heading',
    name: 'Heading',
    typography: {
      fontFamily: 'var(--cel-font-heading)',
      fontSize: '2.5rem',
      fontWeight: 500,
      lineHeight: 1.2,
      textAlign: 'center',
      color: { type: 'token', tokenPath: 'colors.textPrimary' },
    },
    responsive: {
      tablet: { fontSize: '2rem' },
      mobile: { fontSize: '1.75rem' },
    }
  },
  body: {
    id: 'body',
    name: 'Body',
    typography: {
      fontFamily: 'var(--cel-font-body)',
      fontSize: '1rem',
      fontWeight: 'normal',
      lineHeight: 1.5,
      textAlign: 'left',
      color: { type: 'token', tokenPath: 'colors.textSecondary' },
    },
    responsive: {
      tablet: { fontSize: '0.9375rem' },
      mobile: { fontSize: '0.875rem' },
    }
  },
  caption: {
    id: 'caption',
    name: 'Caption',
    typography: {
      fontFamily: 'var(--cel-font-body)',
      fontSize: '0.75rem',
      fontWeight: 'normal',
      lineHeight: 1.4,
      textAlign: 'left',
      color: { type: 'token', tokenPath: 'colors.textMuted' },
    }
  },
  eyebrow: {
    id: 'eyebrow',
    name: 'Eyebrow',
    typography: {
      fontFamily: 'var(--cel-font-accent)',
      fontSize: '0.875rem',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      textAlign: 'center',
      color: { type: 'token', tokenPath: 'colors.accentPrimary' },
    }
  },
  quote: {
    id: 'quote',
    name: 'Quote',
    typography: {
      fontFamily: 'var(--cel-font-display)',
      fontSize: '1.5rem',
      fontWeight: 'normal',
      lineHeight: 1.4,
      fontStyle: 'italic',
      textAlign: 'center',
      color: { type: 'token', tokenPath: 'colors.textPrimary' },
    },
    responsive: {
      mobile: { fontSize: '1.25rem' }
    }
  }
};
