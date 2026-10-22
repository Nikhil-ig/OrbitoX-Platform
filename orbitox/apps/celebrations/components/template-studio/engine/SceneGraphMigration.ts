import { SceneStructureLayer } from '../types/TemplateSchema';
import { SceneGraph, SceneGraphNode } from './SceneGraphTypes';

/**
 * Phase 1 Deliverable: Migration utility to convert legacy layers into Scene Graph nodes.
 */
export class SceneGraphMigration {
  static convertLayersToSceneGraph(layers: SceneStructureLayer[]): SceneGraph {
    const rootNodeId = 'root_scene';
    const nodes: Record<string, SceneGraphNode> = {};
    const renderOrder: string[] = [];

    // Root node
    nodes[rootNodeId] = {
      id: rootNodeId,
      kind: 'container',
      name: 'Scene Root',
      parentId: null,
      children: [],
      geometry: {
        position: 'relative',
        x: 0,
        y: 0,
        width: '100%',
        height: '100%',
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        zIndex: 0,
      },
      layoutMode: 'stack',
      style: {},
      responsive: {},
      locked: true,
      hidden: false,
      customerEditable: false,
      customizationLevel: 'LOCKED',
    };
    renderOrder.push(rootNodeId);

    const mapLayerKind = (layer: SceneStructureLayer): SceneGraphNode['kind'] => {
      switch (layer.layerType) {
        case 'typography': return 'text';
        case 'media': return 'image';
        case 'portrait_group': return 'group';
        case 'atmosphere': return 'atmosphere';
        case 'interactive': return 'interactive_object';
        default: return 'group';
      }
    };

    const processLayer = (layer: SceneStructureLayer, parentId: string) => {
      const nodeId = layer.id;
      
      const node: SceneGraphNode = {
        id: nodeId,
        kind: mapLayerKind(layer),
        name: layer.name,
        parentId,
        children: [],
        geometry: {
          position: 'flow',
          x: 0,
          y: 0,
          width: 'auto',
          height: 'auto',
          rotation: 0,
          scaleX: layer.defaultStyle?.scale ?? 1,
          scaleY: layer.defaultStyle?.scale ?? 1,
          opacity: layer.defaultStyle?.opacity ?? 1,
          zIndex: layer.defaultStyle?.zIndex ?? 0,
        },
        style: {
          typography: {
            textAlign: layer.defaultStyle?.alignment,
          }
        },
        responsive: {
          tablet: layer.responsiveOverrides?.tablet ? {
            scaleX: layer.responsiveOverrides.tablet.scale,
            scaleY: layer.responsiveOverrides.tablet.scale,
            opacity: layer.responsiveOverrides.tablet.opacity,
            zIndex: layer.responsiveOverrides.tablet.zIndex,
          } : undefined,
          mobile: layer.responsiveOverrides?.mobile ? {
            scaleX: layer.responsiveOverrides.mobile.scale,
            scaleY: layer.responsiveOverrides.mobile.scale,
            opacity: layer.responsiveOverrides.mobile.opacity,
            zIndex: layer.responsiveOverrides.mobile.zIndex,
          } : undefined,
        },
        locked: !layer.isCustomerEditable, // In a real scenario, this would map better
        hidden: !layer.isVisible,
        customerEditable: layer.isCustomerEditable,
        customizationLevel: layer.isCustomerEditable ? 'FLEXIBLE' : 'LOCKED',
        binding: layer.bindingFieldKey ? { fieldKey: layer.bindingFieldKey, bindingType: 'content' } : undefined,
      };

      nodes[nodeId] = node;
      nodes[parentId]!.children.push(nodeId);
      renderOrder.push(nodeId);

      if (layer.children) {
        for (const child of layer.children) {
          processLayer(child, nodeId);
        }
      }
    };

    for (const layer of layers) {
      processLayer(layer, rootNodeId);
    }

    return {
      schemaVersion: 1,
      rootNodeId,
      nodes,
      renderOrder,
    };
  }
}
