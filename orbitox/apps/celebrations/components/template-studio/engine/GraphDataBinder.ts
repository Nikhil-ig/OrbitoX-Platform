import { SceneGraph, SceneGraphNode } from './SceneGraphTypes';
import { CelebrationState } from '@/components/studio/StudioData';

/**
 * Extracts a value from a nested object using dot notation.
 */
export function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

/**
 * Sets a value on a nested object using dot notation.
 */
export function setNodeBoundValue(node: SceneGraphNode, path: string, value: any): void {
  const parts = path.split('.');
  const lastPart = parts.pop();
  if (!lastPart) return;

  let current: any = node;
  for (const part of parts) {
    if (!current[part]) {
      current[part] = {};
    }
    current = current[part];
  }

  current[lastPart] = value;
}

/**
 * Resolves a bound field key against CelebrationState or raw record.
 * Handles canonical dot notation and maps to CelebrationState fields.
 */
export function resolveBoundValue(fieldKey: string, state: any, fallback?: any): any {
  if (!state || !fieldKey) return fallback;
  if (state[fieldKey] !== undefined && state[fieldKey] !== null) return state[fieldKey];

  const map: Record<string, string> = {
    'celebrants[0].name': 'protagonist1',
    'celebrants[1].name': 'protagonist2',
    'celebrants[0].portrait': 'protagonist1Image',
    'celebrants[1].portrait': 'protagonist2Image',
    'celebrants[0].role': 'protagonist1Role',
    'celebrants[1].role': 'protagonist2Role',
    'celebrants[0].bio': 'protagonist1Bio',
    'celebrants[1].bio': 'protagonist2Bio',
    'celebrants[0].vow': 'protagonist1Vow',
    'celebrants[1].vow': 'protagonist2Vow',
    'celebration.title': 'title',
    'celebration.tagline': 'tagline',
    'celebration.unionDeclaration': 'unionDeclaration',
    'unionDeclaration': 'unionDeclaration',
    'story.eyebrow': 'storyQuote',
    'story.quote': 'storyQuote',
    'story.body': 'storyBody',
    'countdown.eyebrow': 'tagline',
    'countdown.title': 'title',
    'event.date': 'date',
    'event.time': 'time',
    'event.venueName': 'venueName',
    'event.city': 'city',
    'event.venueAddress': 'venueAddress',
  };

  const mappedKey = map[fieldKey];
  if (mappedKey && state[mappedKey] !== undefined && state[mappedKey] !== null) {
    return state[mappedKey];
  }

  const nested = getNestedValue(state, fieldKey);
  if (nested !== undefined && nested !== null) return nested;

  return fallback;
}

/**
 * Formats a value according to formatting rules.
 */
export function formatValue(value: any, formatting?: { type: string; formatString?: string }): string {
  if (value === undefined || value === null) return '';
  if (!formatting) return String(value);

  switch (formatting.type) {
    case 'uppercase':
      return String(value).toUpperCase();
    case 'lowercase':
      return String(value).toLowerCase();
    case 'currency': {
      const num = Number(value);
      return isNaN(num) ? String(value) : `$${num.toLocaleString()}`;
    }
    case 'date': {
      try {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        }
      } catch {
        // fallback
      }
      return String(value);
    }
    default:
      return String(value);
  }
}

/**
 * Evaluates a declarative conditional against state.
 */
export function evaluateCondition(state: any, conditional: { fieldKey: string; operator: string; operand?: any; action: 'show' | 'hide' }): boolean {
  const value = resolveBoundValue(conditional.fieldKey, state);
  let isMatch = false;

  switch (conditional.operator) {
    case 'equals':
      isMatch = value == conditional.operand;
      break;
    case 'not_equals':
      isMatch = value != conditional.operand;
      break;
    case 'exists':
      isMatch = value !== undefined && value !== null && value !== '';
      break;
    case 'truthy':
      isMatch = Boolean(value);
      break;
    case 'greater_than':
      isMatch = Number(value) > Number(conditional.operand);
      break;
    case 'less_than':
      isMatch = Number(value) < Number(conditional.operand);
      break;
    default:
      isMatch = Boolean(value);
  }

  // If action is 'show', node should be visible when condition is true
  // If action is 'hide', node should be visible when condition is false
  return conditional.action === 'show' ? isMatch : !isMatch;
}

/**
 * Binds data from the CelebrationState into a SceneGraph.
 * Resolves bindings, conditionals, formatters, and collection repeaters.
 */
export function bindDataToGraph(
  graph: SceneGraph,
  state: CelebrationState
): SceneGraph {
  if (!graph || !graph.nodes) return graph;

  // Deep clone to avoid mutating the original graph
  const bound = JSON.parse(JSON.stringify(graph)) as SceneGraph;

  // 1. Process Conditionals
  for (const [id, node] of Object.entries(bound.nodes)) {
    if (node.conditional && node.conditional.fieldKey) {
      const isVisible = evaluateCondition(state, node.conditional);
      node.hidden = !isVisible;
    }
  }

  // 2. Process Repeaters (P14-D)
  for (const [id, node] of Object.entries(bound.nodes)) {
    if (node.repeater && node.repeater.arrayFieldKey && node.repeater.itemTemplateNodeId) {
      const arrayKey = node.repeater.arrayFieldKey.replace('[*]', '');
      let arrayData: any[] = resolveBoundValue(arrayKey, state);

      if (!Array.isArray(arrayData) || arrayData.length === 0) {
        // Fallback demo data for repeaters if state doesn't have the array yet
        if (arrayKey.includes('itinerary') || arrayKey.includes('event')) {
          arrayData = [
            { title: 'The Celestial Ceremony', time: '4:00 PM', venue: 'Cosmic Rotunda' },
            { title: 'Astral Twilight Reception', time: '6:30 PM', venue: 'Solarium Terrace' },
            { title: 'Midnight Starlight Ball', time: '9:00 PM', venue: 'Grand Observatory' },
          ];
        } else if (arrayKey.includes('milestone') || arrayKey.includes('story')) {
          arrayData = [
            { year: '2021', title: 'First Stargaze', description: 'Under the Perseid meteor shower, our paths crossed.' },
            { year: '2023', title: 'The Constellation Promise', description: 'Overlooking Amalfi waters, two souls became one.' },
            { year: '2026', title: 'Eternal Convergence', description: 'Surrounded by our loved ones, celebrating timeless love.' },
          ];
        } else {
          arrayData = [];
        }
      }

      const templateNode = bound.nodes[node.repeater.itemTemplateNodeId];
      if (templateNode) {
        // Hide the master template node from direct render
        templateNode.hidden = true;

        if (arrayData.length === 0 && node.repeater.emptyStateNodeId) {
          const emptyNode = bound.nodes[node.repeater.emptyStateNodeId];
          if (emptyNode) emptyNode.hidden = false;
        } else {
          // Clone template subtree for each item
          const clonedChildrenIds: string[] = [];

          arrayData.forEach((item, index) => {
            const clonedId = `${node.repeater!.itemTemplateNodeId}_item_${index}`;
            const clonedNode: SceneGraphNode = JSON.parse(JSON.stringify(templateNode));
            clonedNode.id = clonedId;
            clonedNode.parentId = node.id;
            clonedNode.hidden = false;

            // Bind item data directly to cloned node
            if (typeof item === 'object') {
              if (item.title && (clonedNode.kind === 'text' || clonedNode.kind === 'event' || clonedNode.kind === 'eventcard')) {
                clonedNode.name = item.title;
                clonedNode.textContent = item.title;
              }
              if (item.year && item.title && (clonedNode.kind === 'milestone' || clonedNode.kind === 'storymilestone')) {
                clonedNode.name = `${item.year}: ${item.title}`;
              }
            }

            bound.nodes[clonedId] = clonedNode;
            clonedChildrenIds.push(clonedId);
          });

          // Prepend or replace children with repeated items
          node.children = [...clonedChildrenIds, ...node.children.filter(cid => cid !== node.repeater!.itemTemplateNodeId)];
        }
      }
    }
  }

  // 3. Process Content and Media Bindings
  for (const [id, node] of Object.entries(bound.nodes)) {
    // 3a. Legacy dataBinding map
    if (node.dataBinding) {
      for (const [propPath, stateKey] of Object.entries(node.dataBinding)) {
        const value = resolveBoundValue(stateKey, state);
        if (value !== undefined) {
          setNodeBoundValue(node, propPath, value);
        }
      }
    }

    // 3b. Canonical node.binding definition with formatting and fallback
    if (node.binding && node.binding.fieldKey) {
      let boundVal = resolveBoundValue(node.binding.fieldKey, state, node.binding.fallback);

      if (boundVal !== undefined && boundVal !== null && boundVal !== '') {
        const formatted = formatValue(boundVal, node.binding.formatting);

        if (node.kind === 'text' || node.kind === 'richtext' || node.kind === 'button') {
          node.textContent = formatted;
          node.name = formatted;
        } else if (node.kind === 'image') {
          if (!node.style) node.style = {};
          node.style.background = {
            type: 'image',
            image: String(boundVal),
          };
        } else if (node.kind === 'smart') {
          node.smartProps = {
            ...node.smartProps,
            [node.binding.fieldKey]: boundVal,
          };
        }
      } else if (node.binding.fallback) {
        if (node.kind === 'text' || node.kind === 'richtext') {
          node.textContent = node.binding.fallback;
        }
      }
    }
  }

  return bound;
}
