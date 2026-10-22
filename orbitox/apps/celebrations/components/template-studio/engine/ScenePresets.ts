import { SceneGraph, SceneGraphNode } from './SceneGraphTypes';
import { NodeDefaults } from './NodeDefaults';

export const ScenePresets = {
  blank: (): SceneGraph => {
    const rootId = `node_${Date.now()}_root`;
    const root: SceneGraphNode = {
      ...NodeDefaults.create('container') as any,
      id: rootId,
      name: 'Root Container',
      geometry: {
        ...NodeDefaults.create('container').geometry!,
        width: '100%',
        height: '100%', // Take full screen
      },
      style: {
        background: { type: 'solid', color: { type: 'solid', value: '#ffffff' } }
      }
    };

    return {
      schemaVersion: 1,
      rootNodeId: rootId,
      nodes: { [rootId]: root },
      renderOrder: [rootId]
    };
  },
  
  hero: (): SceneGraph => {
    const rootId = `node_${Date.now()}_root`;
    const textId = `node_${Date.now()}_text`;
    const imgId = `node_${Date.now()}_img`;
    
    const root: SceneGraphNode = {
      ...NodeDefaults.create('stack') as any,
      id: rootId,
      name: 'Hero Layout',
      children: [imgId, textId],
      layoutConfig: {
        direction: 'vertical',
        alignment: { primary: 'center', cross: 'stretch' },
        gap: '24px'
      }
    };

    const text: SceneGraphNode = {
      ...NodeDefaults.create('text') as any,
      id: textId,
      name: 'Hero Title',
      parentId: rootId,
      textContent: 'Welcome to our Celebration',
      style: {
        typography: {
          fontSize: '3rem',
          textAlign: 'center',
          fontWeight: 700
        }
      }
    };

    const img: SceneGraphNode = {
      ...NodeDefaults.create('image') as any,
      id: imgId,
      name: 'Hero Image',
      parentId: rootId,
      style: {
        background: { 
          type: 'image', 
          image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&q=80',
          size: 'cover'
        }
      },
      geometry: {
        ...NodeDefaults.create('image').geometry!,
        height: '400px'
      }
    };

    return {
      schemaVersion: 1,
      rootNodeId: rootId,
      nodes: {
        [rootId]: root,
        [textId]: text,
        [imgId]: img
      },
      renderOrder: [rootId]
    };
  }
};
