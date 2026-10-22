import { SceneGraph } from './SceneGraphTypes';

/**
 * Graph-Native Scene Definition for "The Astrolabe Countdown"
 * Models the celestial orbital clock dials and temporal countdown.
 */
export const CelestialCountdownGraph: SceneGraph = {
  schemaVersion: 1,
  rootNodeId: 'root_countdown',
  renderOrder: [
    'root_countdown',
    'bg_space_dust',
    'orbit_outer_ring',
    'orbit_inner_ring',
    'countdown_header',
    'cd_eyebrow',
    'cd_title',
    'cd_date_proclamation',
    'astrolabe_smart_clock',
    'calendar_cta_wrap',
  ],
  nodes: {
    'root_countdown': {
      id: 'root_countdown',
      kind: 'container',
      name: 'Countdown Scene Root',
      parentId: null,
      children: ['bg_space_dust', 'countdown_header', 'astrolabe_smart_clock', 'calendar_cta_wrap'],
      geometry: { position: 'relative', x: 0, y: 0, width: '100%', height: '100%', minHeight: '850px', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
      style: {
        background: { type: 'solid', color: { type: 'solid', value: '#05070E' } },
        padding: '5rem 2rem',
      },
      layoutMode: 'stack',
      responsive: {
        mobile: { style: { padding: '3.5rem 1.25rem' } },
      },
      locked: true,
      hidden: false,
      customerEditable: false,
      customizationLevel: 'LOCKED',
    },
    'bg_space_dust': {
      id: 'bg_space_dust',
      kind: 'atmosphere',
      name: 'Cosmic Temporal Void',
      parentId: 'root_countdown',
      children: [],
      geometry: { position: 'absolute', x: 0, y: 0, width: '100%', height: '100%', rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.75, zIndex: 0 },
      style: {},
      responsive: {},
      locked: true,
      hidden: false,
      customerEditable: false,
      customizationLevel: 'LOCKED',
    },

    'countdown_header': {
      id: 'countdown_header',
      kind: 'stack',
      name: 'Astrolabe Header',
      parentId: 'root_countdown',
      children: ['cd_eyebrow', 'cd_title', 'cd_date_proclamation'],
      geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
      style: {
        gap: '0.75rem',
        margin: '0 auto 3rem auto',
        typography: { textAlign: 'center' },
      },
      layoutMode: 'stack',
      responsive: {},
      locked: false,
      hidden: false,
      customerEditable: false,
      customizationLevel: 'FLEXIBLE',
    },
    'cd_eyebrow': {
      id: 'cd_eyebrow',
      kind: 'text',
      name: 'Astrolabe Subtitle Tag',
      parentId: 'countdown_header',
      children: [],
      geometry: { position: 'flow', x: 0, y: 0, width: 'auto', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
      style: {
        typography: {
          fontFamily: 'var(--cel-font-accent)',
          fontSize: '0.75rem',
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: { type: 'token', tokenPath: 'colors.accentPrimary' },
        }
      },
      binding: { fieldKey: 'countdown.tagline', bindingType: 'content' },
      responsive: {},
      locked: false,
      hidden: false,
      customerEditable: true,
      customizationLevel: 'FLEXIBLE',
    },
    'cd_title': {
      id: 'cd_title',
      kind: 'text',
      name: 'Temporal Title Proclamation',
      parentId: 'countdown_header',
      children: [],
      geometry: { position: 'flow', x: 0, y: 0, width: 'auto', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
      style: {
        typography: {
          fontFamily: 'var(--cel-font-display)',
          fontSize: '2.5rem',
          color: { type: 'token', tokenPath: 'colors.textPrimary' },
        }
      },
      binding: { fieldKey: 'countdown.title', bindingType: 'content' },
      responsive: { mobile: { typography: { fontSize: '1.8rem' } } },
      locked: false,
      hidden: false,
      customerEditable: true,
      customizationLevel: 'FLEXIBLE',
    },
    'cd_date_proclamation': {
      id: 'cd_date_proclamation',
      kind: 'text',
      name: 'Auspicious Muhurat Date',
      parentId: 'countdown_header',
      children: [],
      geometry: { position: 'flow', x: 0, y: 0, width: 'auto', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.85, zIndex: 0 },
      style: {
        typography: {
          fontFamily: 'var(--cel-font-body)',
          fontSize: '1rem',
          color: { type: 'token', tokenPath: 'colors.textSecondary' },
        }
      },
      binding: { fieldKey: 'event.date', bindingType: 'content' },
      responsive: {},
      locked: false,
      hidden: false,
      customerEditable: true,
      customizationLevel: 'CURATED',
    },
    'astrolabe_smart_clock': {
      id: 'astrolabe_smart_clock',
      kind: 'smart',
      smartComponent: 'CelestialCountdownClock',
      name: 'Smart Astrolabe Clock',
      parentId: 'root_countdown',
      children: [],
      geometry: { position: 'flow', x: 0, y: 0, width: '100%', maxWidth: '900px', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10, anchor: { horizontal: 'center' } },
      style: {
        margin: '0 auto 3rem auto',
      },
      responsive: {},
      locked: true,
      hidden: false,
      customerEditable: false,
      customizationLevel: 'LOCKED',
    },
    'calendar_cta_wrap': {
      id: 'calendar_cta_wrap',
      kind: 'interactive_object',
      name: 'Calendar Invitation Action',
      parentId: 'root_countdown',
      children: [],
      geometry: { position: 'flow', x: 0, y: 0, width: 'auto', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10, anchor: { horizontal: 'center' } },
      style: {
        margin: '0 auto',
      },
      interactions: [{
        onClick: { action: 'submit' }
      }],
      responsive: {},
      locked: false,
      hidden: false,
      customerEditable: true,
      customizationLevel: 'FLEXIBLE',
    }
  },
};
