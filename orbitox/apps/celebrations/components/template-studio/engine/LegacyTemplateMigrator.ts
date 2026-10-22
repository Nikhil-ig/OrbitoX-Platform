import { TemplateSchema, TemplateSceneDefinition, SceneStructureLayer } from './TemplateEditorTypes';
import { SceneGraph, SceneGraphNode, SceneNodeKind } from './SceneGraphTypes';
import { NodeDefaults } from './NodeDefaults';

/**
 * P13: Legacy Template Auto-Migrator
 * 
 * Automatically upgrades v1 legacy templates (React-based, SceneStructureLayer)
 * to v2 Graph-Native templates (SceneGraph), enabling complete structural freedom.
 */
export class LegacyTemplateMigrator {
  /**
   * Migrate an entire template schema from legacy structures to SceneGraphs.
   */
  static migrateTemplate(schema: TemplateSchema): TemplateSchema {
    const migratedScenes = schema.scenes.map(scene => this.migrateScene(scene));
    
    return {
      ...schema,
      scenes: migratedScenes,
    };
  }

  /**
   * Migrate a single legacy scene to a graph-native scene.
   */
  static migrateScene(scene: TemplateSceneDefinition): TemplateSceneDefinition {
    // If it already has a sceneGraph, no migration needed
    if (scene.sceneGraph) {
      return scene;
    }

    // Convert legacy layers to SceneGraph
    const sceneGraph = this.convertLayersToSceneGraph(scene.layers, scene.id, scene.name);

    return {
      ...scene,
      sceneGraph,
      renderMode: 'graph',
      // We keep the old layers array around just in case, or we can drop it.
      // For safety, we keep it but the renderer will now prefer `sceneGraph`.
    };
  }

  /**
   * Deep conversion of legacy SceneStructureLayer array to SceneGraph
   */
  static convertLayersToSceneGraph(layers: SceneStructureLayer[], sceneId: string, sceneName: string): SceneGraph {
    const rootNodeId = `root_${sceneId}`;
    const nodes: Record<string, SceneGraphNode> = {};
    const renderOrder: string[] = [];

    // Create Root Frame
    const rootNode: SceneGraphNode = {
      ...(NodeDefaults.create('frame') as any),
      id: rootNodeId,
      parentId: null,
      name: `${sceneName} Root`,
      layoutMode: 'freeform',
      geometry: {
        position: 'relative',
        x: 0, y: 0,
        width: '100%', height: '100%',
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0,
      },
      children: [],
    };
    nodes[rootNodeId] = rootNode;
    renderOrder.push(rootNodeId);

    const mapLayerTypeToKind = (type: string): SceneNodeKind => {
      switch (type) {
        case 'typography': return 'text';
        case 'media': return 'image';
        case 'portrait_group': return 'couple';
        case 'container': return 'container';
        case 'atmosphere': return 'atmosphere';
        case 'interactive': return 'interactive_object';
        case 'layout': return 'stack';
        default: return 'group';
      }
    };

    let layerCounter = 0;
    const processLayer = (layer: SceneStructureLayer, parentId: string) => {
      // Use existing ID if possible, else generate stable deterministic ID
      layerCounter++;
      const safeName = (layer.name || 'layer').toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const nodeId = layer.id || `node_${sceneId}_${safeName}_${layerCounter}`;
      const kind = mapLayerTypeToKind(layer.layerType);
      
      const baseDef = NodeDefaults.create(kind) as any;
      
      const node: SceneGraphNode = {
        ...baseDef,
        id: nodeId,
        kind,
        name: layer.name || baseDef.name,
        parentId,
        children: [],
        
        // Map geometry & layout
        layoutMode: (layer.layerType as any) === 'layout' ? 'stack' : ((layer.layerType as any) === 'portrait_group' ? 'flex' : baseDef.layoutMode),
        geometry: {
          ...baseDef.geometry,
          position: (layer.defaultStyle as any)?.position || 'flow',
          x: (layer.defaultStyle as any)?.x || baseDef.geometry.x,
          y: (layer.defaultStyle as any)?.y || baseDef.geometry.y,
          width: (layer.defaultStyle as any)?.width || baseDef.geometry.width,
          height: (layer.defaultStyle as any)?.height || baseDef.geometry.height,
          rotation: (layer.defaultStyle as any)?.rotation || 0,
          scaleX: layer.defaultStyle?.scale || 1,
          scaleY: layer.defaultStyle?.scale || 1,
          opacity: layer.defaultStyle?.opacity !== undefined ? layer.defaultStyle.opacity : 1,
          zIndex: layer.defaultStyle?.zIndex || 0,
        },
        
        // Map styles
        style: {
          ...baseDef.style,
          typography: layer.layerType === 'typography' ? {
            ...baseDef.style.typography,
            textAlign: layer.defaultStyle?.alignment,
          } : undefined,
        },
        
        // Map responsive overrides
        responsive: {
          tablet: layer.responsiveOverrides?.tablet ? {
            style: {}, // Need detailed mapping if styles exist
            geometry: {
              scaleX: layer.responsiveOverrides.tablet.scale,
              scaleY: layer.responsiveOverrides.tablet.scale,
              opacity: layer.responsiveOverrides.tablet.opacity,
              zIndex: layer.responsiveOverrides.tablet.zIndex,
            }
          } : undefined,
          mobile: layer.responsiveOverrides?.mobile ? {
            style: {},
            geometry: {
              scaleX: layer.responsiveOverrides.mobile.scale,
              scaleY: layer.responsiveOverrides.mobile.scale,
              opacity: layer.responsiveOverrides.mobile.opacity,
              zIndex: layer.responsiveOverrides.mobile.zIndex,
            }
          } : undefined,
        },
        
        // Map admin flags
        locked: !layer.isCustomerEditable,
        hidden: !layer.isVisible,
        customerEditable: layer.isCustomerEditable,
        customizationLevel: layer.isCustomerEditable ? 'FLEXIBLE' : 'LOCKED',
        
        // Map bindings
        binding: layer.bindingFieldKey ? { fieldKey: layer.bindingFieldKey, bindingType: 'content' } : undefined,
      };

      // Handle text content if it's a typography layer with no binding
      if (kind === 'text' && !node.binding) {
        node.textContent = layer.name || 'Text Content'; // Fallback text
      }

      nodes[nodeId] = node;
      
      if (nodes[parentId]) {
        nodes[parentId].children.push(nodeId);
      }
      renderOrder.push(nodeId);

      // Recursively process children
      if (layer.children && layer.children.length > 0) {
        for (const child of layer.children) {
          processLayer(child, nodeId);
        }
      }
    };

    // Process all top-level layers
    if (layers && layers.length > 0) {
      for (const layer of layers) {
        processLayer(layer, rootNodeId);
      }
    }

    return {
      schemaVersion: 1,
      rootNodeId,
      nodes,
      renderOrder,
    };
  }
}
