import { SceneGraph } from './SceneGraphTypes';

/**
 * Phase 12 Deliverable: Graph-Native Conversion of "The Souls"
 * This provides the initial graph state for the Celestial Souls scene,
 * proving that a complex interactive scene can be modeled purely via the scene graph.
 */
export const CelestialSoulsGraph: SceneGraph = {
  schemaVersion: 1,
  rootNodeId: 'root_souls',
  renderOrder: [
    'root_souls',
    'bg_atmosphere',
    'content_group',
    'eyebrow',
    'name_a',
    'ampersand',
    'name_b',
    'union_dec',
    'portrait_group',
    'smart_portrait_a',
    'smart_portrait_b',
    'vows_group',
    'vow_a',
    'vow_b'
  ],
  nodes: {
    'root_souls': {
      id: 'root_souls',
      kind: 'container',
      name: 'The Souls Root',
      parentId: null,
      children: ['bg_atmosphere', 'content_group', 'portrait_group', 'vows_group'],
      geometry: { position: 'relative', x: 0, y: 0, width: '100%', height: '100%', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
      style: {
        background: { type: 'solid', color: { type: 'solid', value: '#0f172a' } }, // Slate 900
        padding: '4rem 2rem',
      },
      layoutMode: 'stack',
      responsive: {},
      locked: true,
      hidden: false,
      customerEditable: false,
      customizationLevel: 'LOCKED',
    },
    'bg_atmosphere': {
      id: 'bg_atmosphere',
      kind: 'atmosphere',
      name: 'Cosmic Dust',
      parentId: 'root_souls',
      children: [],
      geometry: { position: 'absolute', x: 0, y: 0, width: '100%', height: '100%', rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.6, zIndex: 0 },
      style: {},
      responsive: {},
      locked: true,
      hidden: false,
      customerEditable: false,
      customizationLevel: 'LOCKED',
    },
    'content_group': {
      id: 'content_group',
      kind: 'stack',
      name: 'Title Content',
      parentId: 'root_souls',
      children: ['eyebrow', 'name_a', 'ampersand', 'name_b', 'union_dec'],
      geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
      style: {
        gap: '1rem',
        typography: { textAlign: 'center' }
      },
      layoutMode: 'stack',
      responsive: {},
      locked: false,
      hidden: false,
      customerEditable: false,
      customizationLevel: 'ADVANCED',
    },
    'eyebrow': {
      id: 'eyebrow',
      kind: 'text',
      name: 'Eyebrow',
      parentId: 'content_group',
      children: [],
      geometry: { position: 'flow', x: 0, y: 0, width: 'auto', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
      style: {
        typography: {
          fontFamily: 'var(--cel-font-accent)',
          fontSize: '0.875rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: { type: 'token', tokenPath: 'colors.accentPrimary' },
        }
      },
      binding: { fieldKey: 'celebration.tagline', bindingType: 'content' },
      responsive: {},
      locked: false,
      hidden: false,
      customerEditable: true,
      customizationLevel: 'FLEXIBLE',
    },
    'name_a': {
      id: 'name_a',
      kind: 'text',
      name: 'Partner 1 Name',
      parentId: 'content_group',
      children: [],
      geometry: { position: 'flow', x: 0, y: 0, width: 'auto', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
      style: {
        typography: {
          fontFamily: 'var(--cel-font-display)',
          fontSize: '4rem',
          color: { type: 'token', tokenPath: 'colors.textPrimary' },
        }
      },
      binding: { fieldKey: 'celebrants[0].name', bindingType: 'content' },
      responsive: { mobile: { typography: { fontSize: '3rem' } } },
      locked: true, // Tied directly to primary data
      hidden: false,
      customerEditable: false,
      customizationLevel: 'LOCKED', // Must be edited via primary settings, not directly here
    },
    'ampersand': {
      id: 'ampersand',
      kind: 'text',
      name: 'Ampersand',
      parentId: 'content_group',
      children: [],
      geometry: { position: 'flow', x: 0, y: 0, width: 'auto', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
      style: {
        typography: {
          fontFamily: 'var(--cel-font-display)',
          fontSize: '2rem',
          color: { type: 'token', tokenPath: 'colors.accentPrimary' },
        }
      },
      responsive: {},
      locked: false,
      hidden: false,
      customerEditable: true,
      customizationLevel: 'ADVANCED', // Static text, but customizable for advanced users
    },
    'name_b': {
      id: 'name_b',
      kind: 'text',
      name: 'Partner 2 Name',
      parentId: 'content_group',
      children: [],
      geometry: { position: 'flow', x: 0, y: 0, width: 'auto', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
      style: {
        typography: {
          fontFamily: 'var(--cel-font-display)',
          fontSize: '4rem',
          color: { type: 'token', tokenPath: 'colors.textPrimary' },
        }
      },
      binding: { fieldKey: 'celebrants[1].name', bindingType: 'content' },
      responsive: { mobile: { typography: { fontSize: '3rem' } } },
      locked: true,
      hidden: false,
      customerEditable: false,
      customizationLevel: 'LOCKED',
    },
    'union_dec': {
      id: 'union_dec',
      kind: 'richtext',
      name: 'Union Declaration',
      parentId: 'content_group',
      children: [],
      geometry: { position: 'flow', x: 0, y: 0, width: '100%', maxWidth: '600px', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0, anchor: { horizontal: 'center' } },
      style: {
        typography: {
          fontFamily: 'var(--cel-font-body)',
          fontSize: '1rem',
          lineHeight: 1.5,
          color: { type: 'token', tokenPath: 'colors.textSecondary' },
        },
        margin: '2rem auto 0 auto',
      },
      binding: { fieldKey: 'unionDeclaration', bindingType: 'content' },
      responsive: {},
      locked: false,
      hidden: false,
      customerEditable: true,
      customizationLevel: 'FLEXIBLE',
    },
    'portrait_group': {
      id: 'portrait_group',
      kind: 'container', // freeform positioning inside here
      name: 'Portraits Layer',
      parentId: 'root_souls',
      children: ['smart_portrait_a', 'smart_portrait_b'],
      geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: '600px', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
      style: { margin: '4rem 0' },
      layoutMode: 'freeform',
      responsive: { mobile: { height: 'auto' } }, // layoutMode not yet in responsive schema MVP
      locked: false,
      hidden: false,
      customerEditable: false,
      customizationLevel: 'ADVANCED',
    },
    'smart_portrait_a': {
      id: 'smart_portrait_a',
      kind: 'smart',
      smartComponent: 'CelestialParallaxPortrait',
      name: 'Smart Portrait 1',
      parentId: 'portrait_group',
      children: [],
      geometry: { position: 'absolute', x: '10%', y: '10%', width: '300px', height: '400px', rotation: -4, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 2 },
      style: {},
      binding: { fieldKey: 'celebrants[0].portrait', bindingType: 'media' },
      responsive: { mobile: { position: 'flow', x: 0, y: 0, width: '100%', rotation: 0, margin: '0 0 2rem 0' } },
      locked: false,
      hidden: false,
      customerEditable: true,
      customizationLevel: 'CURATED',
    },
    'smart_portrait_b': {
      id: 'smart_portrait_b',
      kind: 'smart',
      smartComponent: 'CelestialParallaxPortrait',
      name: 'Smart Portrait 2',
      parentId: 'portrait_group',
      children: [],
      geometry: { position: 'absolute', x: '50%', y: '20%', width: '350px', height: '450px', rotation: 3, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 1 },
      style: {},
      binding: { fieldKey: 'celebrants[1].portrait', bindingType: 'media' },
      responsive: { mobile: { position: 'flow', x: 0, y: 0, width: '100%', rotation: 0 } },
      locked: false,
      hidden: false,
      customerEditable: true,
      customizationLevel: 'CURATED',
    },
    'vows_group': {
      id: 'vows_group',
      kind: 'grid',
      name: 'Vows Container',
      parentId: 'root_souls',
      children: ['vow_a', 'vow_b'],
      geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
      style: {
        margin: '2rem 0 0 0'
      },
      layoutConfig: { 
        columns: 2, 
        gap: '2rem', 
        padding: { top: 0, right: 0, bottom: 0, left: 0 }, 
        alignment: { horizontal: 'center', vertical: 'start' } 
      }, // pseudo grid config
      responsive: {}, // layoutConfig not yet in responsive schema MVP
      locked: false,
      hidden: false,
      customerEditable: false,
      customizationLevel: 'ADVANCED',
    },
    'vow_a': {
      id: 'vow_a',
      kind: 'richtext',
      name: 'Partner 1 Vow',
      parentId: 'vows_group',
      children: [],
      geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
      style: {
        typography: {
          fontFamily: 'var(--cel-font-display)',
          fontSize: '1.25rem',
          fontStyle: 'italic',
          color: { type: 'token', tokenPath: 'colors.textPrimary' },
          textAlign: 'center',
        },
        padding: '2rem',
        border: { radius: '8px' },
        background: { type: 'solid', color: { type: 'solid', value: 'rgba(255,255,255,0.03)' } }
      },
      binding: { fieldKey: 'celebrants[0].vow', bindingType: 'content' },
      responsive: {},
      locked: false,
      hidden: false,
      customerEditable: true,
      customizationLevel: 'FLEXIBLE',
    },
    'vow_b': {
      id: 'vow_b',
      kind: 'richtext',
      name: 'Partner 2 Vow',
      parentId: 'vows_group',
      children: [],
      geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
      style: {
        typography: {
          fontFamily: 'var(--cel-font-display)',
          fontSize: '1.25rem',
          fontStyle: 'italic',
          color: { type: 'token', tokenPath: 'colors.textPrimary' },
          textAlign: 'center',
        },
        padding: '2rem',
        border: { radius: '8px' },
        background: { type: 'solid', color: { type: 'solid', value: 'rgba(255,255,255,0.03)' } }
      },
      binding: { fieldKey: 'celebrants[1].vow', bindingType: 'content' },
      responsive: {},
      locked: false,
      hidden: false,
      customerEditable: true,
      customizationLevel: 'FLEXIBLE',
    }
  }
};
