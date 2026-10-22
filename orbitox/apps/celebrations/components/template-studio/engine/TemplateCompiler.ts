import { ReactElement, ReactNode } from 'react';
import React from 'react';
import { SceneGraph, SceneGraphNode, SceneNodeKind } from './SceneGraphTypes';
import { NodeDefaults } from './NodeDefaults';

export interface SemanticSceneBlueprint {
  sceneId: string;
  name: string;
  sceneType: 'hero' | 'portraits' | 'story' | 'countdown' | 'itinerary' | 'rsvp' | 'wishes' | 'custom';
  title?: string;
  subtitle?: string;
  partner1Name?: string;
  partner2Name?: string;
  partner1Image?: string;
  partner2Image?: string;
  eventDate?: string;
  venueName?: string;
  venueAddress?: string;
  unionDeclaration?: string;
  milestones?: Array<{ title: string; date: string; description: string; image?: string }>;
  events?: Array<{ name: string; time: string; venue: string; description: string }>;
}

/**
 * Build-time Template Compiler / Migrator (Prompt #3)
 * Converts static template implementations and semantic structures into initial SceneGraph blueprints.
 * Does NOT parse JSX at runtime. Build/admin tooling only.
 */
export class TemplateCompiler {
  /**
   * Compiles a static React element hierarchy into a SceneGraph blueprint.
   */
  static compile(element: ReactElement, sceneName: string = 'Imported Scene'): SceneGraph {
    const rootId = `node_${Date.now()}_root`;
    const nodes: Record<string, SceneGraphNode> = {};
    const renderOrder: string[] = [];

    const traverse = (node: ReactNode, parentId: string | null): string | null => {
      if (!node) return null;

      // Handle raw text nodes
      if (typeof node === 'string' || typeof node === 'number') {
        const id = `node_text_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const sgNode: SceneGraphNode = {
          ...(NodeDefaults.create('text') as any),
          id,
          parentId,
          name: 'Text Content',
          textContent: String(node),
        };
        nodes[id] = sgNode;
        renderOrder.push(id);
        return id;
      }

      // If it's a valid React element
      if (React.isValidElement(node)) {
        const type = typeof node.type === 'string' ? node.type : (node.type as any).name || 'Component';
        const props = (node.props || {}) as any;

        // Determine node kind based on component or HTML tag
        let kind: SceneNodeKind = 'container';
        if (type === 'img' || type === 'Image') kind = 'image';
        if (type === 'video') kind = 'video';
        if (type === 'h1' || type === 'h2' || type === 'h3' || type === 'h4' || type === 'p' || type === 'span') kind = 'text';
        if (type === 'section') kind = 'frame';

        // Layout heuristics based on props/className
        let layoutMode: 'auto' | 'freeform' | 'flex' | 'grid' | 'stack' = 'auto';
        let direction: 'horizontal' | 'vertical' = 'horizontal';

        if (props.className) {
          if (props.className.includes('flex')) {
            layoutMode = 'flex';
            if (props.className.includes('flex-col')) direction = 'vertical';
          }
          if (props.className.includes('grid')) layoutMode = 'grid';
        }

        const id = props.id || `node_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const baseDef = NodeDefaults.create(kind) as any;

        const sgNode: SceneGraphNode = {
          ...baseDef,
          id,
          parentId,
          name: props['data-node-name'] || type,
          layoutMode,
          layoutConfig:
            layoutMode === 'flex'
              ? {
                  direction,
                  gap: '1rem',
                  padding: { top: 0, right: 0, bottom: 0, left: 0 },
                  alignment: { primary: 'start', cross: 'start' },
                  wrap: false,
                  sizing: { primary: 'hug', cross: 'fill' },
                }
              : undefined,
          children: [],
          smartProps: props.src ? { src: props.src, alt: props.alt || '' } : baseDef.smartProps,
          style: {
            ...baseDef.style,
            ...(props.style || {}),
          },
        };

        if (props['data-binding-key']) {
          sgNode.binding = {
            fieldKey: props['data-binding-key'],
            bindingType: 'content',
          };
        }

        nodes[id] = sgNode;
        renderOrder.push(id);

        // Recursively traverse children
        if (props.children) {
          const childrenArray = React.Children.toArray(props.children);
          for (const child of childrenArray) {
            const childId = traverse(child, id);
            if (childId) {
              sgNode.children.push(childId);
            }
          }
        }

        return id;
      }

      return null;
    };

    const parsedRootId = traverse(element, null);

    if (!parsedRootId) {
      return {
        schemaVersion: 1,
        rootNodeId: rootId,
        nodes: {
          [rootId]: {
            ...(NodeDefaults.create('container') as any),
            id: rootId,
            name: sceneName,
          },
        },
        renderOrder: [rootId],
      };
    }

    return {
      schemaVersion: 1,
      rootNodeId: parsedRootId,
      nodes,
      renderOrder,
    };
  }

  /**
   * Compiles a semantic celebration blueprint into a high-fidelity SceneGraph.
   * Used to generate initial blueprints from static single-file template scenes.
   */
  static compileBlueprint(blueprint: SemanticSceneBlueprint): SceneGraph {
    const rootId = `root_${blueprint.sceneId}`;
    const nodes: Record<string, SceneGraphNode> = {};
    const renderOrder: string[] = [];

    // Root Frame
    const rootNode: SceneGraphNode = {
      ...(NodeDefaults.create('frame') as any),
      id: rootId,
      parentId: null,
      name: `${blueprint.name} Root`,
      layoutMode: 'freeform',
      geometry: {
        position: 'flow',
        x: 0,
        y: 0,
        width: '100%',
        height: '100vh',
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        zIndex: 0,
      },
      children: [],
    };
    nodes[rootId] = rootNode;
    renderOrder.push(rootId);

    // Build scene-type specific visual blueprints
    switch (blueprint.sceneType) {
      case 'portraits': {
        // Dual portraits group
        const coupleGroupId = `couple_${blueprint.sceneId}`;
        const coupleGroup: SceneGraphNode = {
          ...(NodeDefaults.create('couple') as any),
          id: coupleGroupId,
          parentId: rootId,
          name: 'Astral Couple Portraits',
          geometry: {
            position: 'absolute',
            x: 0,
            y: '15vh',
            width: '100%',
            height: 'auto',
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            opacity: 1,
            zIndex: 10,
          },
          children: [],
        };
        nodes[coupleGroupId] = coupleGroup;
        rootNode.children.push(coupleGroupId);
        renderOrder.push(coupleGroupId);

        // Portrait 1
        const p1Id = `portrait_1_${blueprint.sceneId}`;
        const p1Node: SceneGraphNode = {
          ...(NodeDefaults.create('person') as any),
          id: p1Id,
          parentId: coupleGroupId,
          name: blueprint.partner1Name || 'Partner 1',
          binding: { fieldKey: 'celebrants[0].firstName', bindingType: 'content' },
          geometry: {
            position: 'flow',
            x: 0,
            y: 0,
            width: '280px',
            height: '380px',
            rotation: -3,
            scaleX: 1,
            scaleY: 1,
            opacity: 1,
            zIndex: 1,
          },
          smartProps: {
            src: blueprint.partner1Image || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=85',
          },
          children: [],
        };
        nodes[p1Id] = p1Node;
        coupleGroup.children.push(p1Id);
        renderOrder.push(p1Id);

        // Portrait 2
        const p2Id = `portrait_2_${blueprint.sceneId}`;
        const p2Node: SceneGraphNode = {
          ...(NodeDefaults.create('person') as any),
          id: p2Id,
          parentId: coupleGroupId,
          name: blueprint.partner2Name || 'Partner 2',
          binding: { fieldKey: 'celebrants[1].firstName', bindingType: 'content' },
          geometry: {
            position: 'flow',
            x: 0,
            y: 0,
            width: '280px',
            height: '380px',
            rotation: 3,
            scaleX: 1,
            scaleY: 1,
            opacity: 1,
            zIndex: 2,
          },
          smartProps: {
            src: blueprint.partner2Image || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=85',
          },
          children: [],
        };
        nodes[p2Id] = p2Node;
        coupleGroup.children.push(p2Id);
        renderOrder.push(p2Id);

        // Union Quote / Declaration
        const quoteId = `quote_${blueprint.sceneId}`;
        const quoteNode: SceneGraphNode = {
          ...(NodeDefaults.create('text') as any),
          id: quoteId,
          parentId: rootId,
          name: 'Union Declaration',
          textContent: blueprint.unionDeclaration || 'Two Souls Aligned in Infinite Orbit',
          binding: { fieldKey: 'unionDeclaration', bindingType: 'content' },
          geometry: {
            position: 'absolute',
            x: 0,
            y: '78vh',
            width: '100%',
            height: 'auto',
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            opacity: 0.9,
            zIndex: 10,
          },
          style: {
            typography: {
              fontFamily: "var(--orbitox-font-display, 'Cinzel')",
              fontSize: '1.25rem',
              textAlign: 'center',
              letterSpacing: '0.12em',
              color: { type: 'token', tokenPath: 'colors.textPrimary' },
            },
          },
          children: [],
        };
        nodes[quoteId] = quoteNode;
        rootNode.children.push(quoteId);
        renderOrder.push(quoteId);
        break;
      }

      case 'hero':
      default: {
        // Hero Title Text
        const titleId = `hero_title_${blueprint.sceneId}`;
        const titleNode: SceneGraphNode = {
          ...(NodeDefaults.create('text') as any),
          id: titleId,
          parentId: rootId,
          name: 'Hero Title',
          textContent: blueprint.title || 'Celestial Odyssey',
          binding: { fieldKey: 'celebration.title', bindingType: 'content' },
          geometry: {
            position: 'absolute',
            x: 0,
            y: '30vh',
            width: '100%',
            height: 'auto',
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            opacity: 1,
            zIndex: 10,
          },
          style: {
            typography: {
              fontFamily: "var(--orbitox-font-display, 'Cinzel')",
              fontSize: '3.5rem',
              fontWeight: 800,
              textAlign: 'center',
              letterSpacing: '0.18em',
              color: { type: 'token', tokenPath: 'colors.accentPrimary' },
            },
          },
          children: [],
        };
        nodes[titleId] = titleNode;
        rootNode.children.push(titleId);
        renderOrder.push(titleId);

        // Subtitle / Date
        const subId = `hero_sub_${blueprint.sceneId}`;
        const subNode: SceneGraphNode = {
          ...(NodeDefaults.create('text') as any),
          id: subId,
          parentId: rootId,
          name: 'Hero Subtitle',
          textContent: blueprint.subtitle || blueprint.eventDate || 'December 18, 2026',
          binding: { fieldKey: 'celebration.date', bindingType: 'content' },
          geometry: {
            position: 'absolute',
            x: 0,
            y: '45vh',
            width: '100%',
            height: 'auto',
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            opacity: 0.85,
            zIndex: 10,
          },
          style: {
            typography: {
              fontFamily: "var(--orbitox-font-body, 'Outfit')",
              fontSize: '1.15rem',
              textAlign: 'center',
              letterSpacing: '0.08em',
              color: { type: 'token', tokenPath: 'colors.textSecondary' },
            },
          },
          children: [],
        };
        nodes[subId] = subNode;
        rootNode.children.push(subId);
        renderOrder.push(subId);
        break;
      }
    }

    return {
      schemaVersion: 1,
      rootNodeId: rootId,
      nodes,
      renderOrder,
    };
  }
}
