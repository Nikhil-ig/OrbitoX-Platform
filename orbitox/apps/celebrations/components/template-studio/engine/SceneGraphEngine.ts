import { SceneGraph, SceneGraphNode, SceneNodeKind, NodeGeometry } from './SceneGraphTypes';
import { AlignmentEngine } from './AlignmentEngine';

export class SceneGraphEngine {
  // ─────────────────────────────────────────────────────────────
  // 1. CRUD
  // ─────────────────────────────────────────────────────────────

  static createNode(
    graph: SceneGraph,
    kind: SceneNodeKind,
    parentId: string | null,
    defaults: Partial<SceneGraphNode> = {},
    insertIndex?: number
  ): { graph: SceneGraph; newNodeId: string } {
    const newNodeId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newNode: SceneGraphNode = {
      id: newNodeId,
      kind,
      name: defaults.name || kind,
      parentId,
      children: [],
      geometry: {
        position: 'flow',
        x: 0,
        y: 0,
        width: 'auto',
        height: 'auto',
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        zIndex: 0,
        ...defaults.geometry,
      },
      style: { ...defaults.style },
      responsive: defaults.responsive || {},
      locked: defaults.locked ?? false,
      hidden: defaults.hidden ?? false,
      customerEditable: defaults.customerEditable ?? false,
      customizationLevel: defaults.customizationLevel ?? 'LOCKED',
      ...defaults,
    };

    const newNodes = { ...graph.nodes, [newNodeId]: newNode };
    let newRenderOrder = [...graph.renderOrder];

    if (parentId && newNodes[parentId]) {
      const parentNode = newNodes[parentId];
      const newChildren = [...parentNode.children];
      
      if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= newChildren.length) {
        newChildren.splice(insertIndex, 0, newNodeId);
      } else {
        newChildren.push(newNodeId);
      }
      
      newNodes[parentId] = {
        ...parentNode,
        children: newChildren,
      };
      
      // Update render order (recompute fully from root for safety, or just insert)
      // For now, simpler to just push to the end, the renderer uses the tree structure primarily
      // and renderOrder is used for flat list iteration in inspector. 
      newRenderOrder.push(newNodeId);
    } else {
      // Add to root
      if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= newRenderOrder.length) {
        newRenderOrder.splice(insertIndex, 0, newNodeId);
      } else {
        newRenderOrder.push(newNodeId);
      }
    }

    return {
      graph: {
        ...graph,
        nodes: newNodes,
        renderOrder: newRenderOrder,
      },
      newNodeId,
    };
  }

  static deleteNode(graph: SceneGraph, nodeId: string): SceneGraph {
    if (nodeId === graph.rootNodeId) return graph; // Cannot delete root
    
    const node = graph.nodes[nodeId];
    if (!node) return graph;

    const newNodes = { ...graph.nodes };
    const newRenderOrder = [...graph.renderOrder];

    // Helper to recursively collect all descendants to delete
    const collectDescendants = (id: string, acc: string[] = []) => {
      acc.push(id);
      const n = newNodes[id];
      if (n && n.children) {
        for (const childId of n.children) {
          collectDescendants(childId, acc);
        }
      }
      return acc;
    };

    const toDelete = collectDescendants(nodeId);

    // Remove from parent
    if (node.parentId && newNodes[node.parentId]) {
      const parentNode = newNodes[node.parentId]!;
      newNodes[node.parentId] = {
        ...parentNode,
        children: parentNode.children.filter(id => id !== nodeId),
      };
    }

    // Delete nodes and update render order
    for (const id of toDelete) {
      delete newNodes[id];
      const idx = newRenderOrder.indexOf(id);
      if (idx !== -1) newRenderOrder.splice(idx, 1);
    }

    return {
      ...graph,
      nodes: newNodes,
      renderOrder: newRenderOrder,
    };
  }

  static moveNode(
    graph: SceneGraph,
    nodeId: string,
    newParentId: string,
    index: number = -1
  ): SceneGraph {
    const node = graph.nodes[nodeId];
    const newParent = graph.nodes[newParentId];
    if (!node || !newParent || nodeId === graph.rootNodeId || nodeId === newParentId) {
      return graph;
    }

    // Prevent cyclic move
    const ancestors = this.getAncestors(graph, newParentId);
    if (ancestors.some(a => a.id === nodeId)) {
      return graph;
    }

    const newNodes = { ...graph.nodes };
    
    // Remove from old parent
    if (node.parentId && newNodes[node.parentId]) {
      const oldParentNode = newNodes[node.parentId]!;
      newNodes[node.parentId] = {
        ...oldParentNode,
        children: oldParentNode.children.filter(id => id !== nodeId),
      };
    }

    // Add to new parent
    let newChildren = [...newParent.children];
    if (index === -1 || index >= newChildren.length) {
      newChildren.push(nodeId);
    } else {
      newChildren.splice(index, 0, nodeId);
    }

    newNodes[newParentId] = {
      ...newParent,
      children: newChildren,
    };

    newNodes[nodeId] = {
      ...node,
      parentId: newParentId,
    };

    // Rebuild render order
    const newRenderOrder = this.buildRenderOrder(newNodes, graph.rootNodeId);

    return {
      ...graph,
      nodes: newNodes,
      renderOrder: newRenderOrder,
    };
  }

  static duplicateNode(graph: SceneGraph, nodeId: string): { graph: SceneGraph; newNodeId: string } {
    const originalNode = graph.nodes[nodeId];
    if (!originalNode || nodeId === graph.rootNodeId) return { graph, newNodeId: '' };

    const newNodes = { ...graph.nodes };
    let newRenderOrder = [...graph.renderOrder];
    
    const cloneMap = new Map<string, string>(); // oldId -> newId

    const recursiveClone = (oldId: string, parentId: string | null): string => {
      const oldNode = newNodes[oldId];
      if (!oldNode) return '';

      const newId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      cloneMap.set(oldId, newId);

      const clone: SceneGraphNode = JSON.parse(JSON.stringify(oldNode));
      clone.id = newId;
      clone.parentId = parentId;
      clone.name = `${clone.name} (Copy)`;
      clone.children = [];
      
      newNodes[newId] = clone;

      for (const oldChildId of oldNode.children) {
        const newChildId = recursiveClone(oldChildId, newId);
        if (newChildId) {
          clone.children.push(newChildId);
        }
      }

      return newId;
    };

    const newRootCloneId = recursiveClone(nodeId, originalNode.parentId);

    if (originalNode.parentId && newNodes[originalNode.parentId]) {
      const parent = newNodes[originalNode.parentId]!;
      const insertIndex = parent.children.indexOf(nodeId) + 1;
      parent.children.splice(insertIndex, 0, newRootCloneId);
    }

    newRenderOrder = this.buildRenderOrder(newNodes, graph.rootNodeId);

    return {
      graph: {
        ...graph,
        nodes: newNodes,
        renderOrder: newRenderOrder,
      },
      newNodeId: newRootCloneId,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 2. HIERARCHY
  // ─────────────────────────────────────────────────────────────

  static getChildren(graph: SceneGraph, nodeId: string): SceneGraphNode[] {
    const node = graph.nodes[nodeId];
    if (!node) return [];
    return node.children.map(id => graph.nodes[id]).filter((n): n is SceneGraphNode => !!n);
  }

  static getAncestors(graph: SceneGraph, nodeId: string): SceneGraphNode[] {
    const ancestors: SceneGraphNode[] = [];
    let current = graph.nodes[nodeId];
    while (current && current.parentId) {
      const parent = graph.nodes[current.parentId];
      if (parent) {
        ancestors.push(parent);
        current = parent;
      } else {
        break;
      }
    }
    return ancestors;
  }

  static reorderChildren(graph: SceneGraph, parentId: string, fromIndex: number, toIndex: number): SceneGraph {
    const parent = graph.nodes[parentId];
    if (!parent) return graph;

    const newNodes = { ...graph.nodes };
    const newChildren = [...parent.children];
    
    const [moved] = newChildren.splice(fromIndex, 1);
    if (moved) {
      newChildren.splice(toIndex, 0, moved);
    }

    newNodes[parentId] = {
      ...parent,
      children: newChildren,
    };

    return {
      ...graph,
      nodes: newNodes,
      renderOrder: this.buildRenderOrder(newNodes, graph.rootNodeId),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 3. GROUPING
  // ─────────────────────────────────────────────────────────────

  static groupNodes(graph: SceneGraph, nodeIds: string[]): { graph: SceneGraph; groupId: string } {
    if (nodeIds.length === 0 || !nodeIds[0]) return { graph, groupId: '' };

    const firstNode = graph.nodes[nodeIds[0]];
    const parentId = firstNode?.parentId;
    if (!parentId) return { graph, groupId: '' };

    // Create group node
    const { graph: g1, newNodeId: groupId } = this.createNode(graph, 'group', parentId, {
      name: 'Group',
    });

    let g2 = g1;
    // Move nodes into group
    for (const id of nodeIds) {
      g2 = this.moveNode(g2, id, groupId);
    }

    return { graph: g2, groupId };
  }

  static ungroupNode(graph: SceneGraph, groupId: string): SceneGraph {
    const groupNode = graph.nodes[groupId];
    if (!groupNode || groupNode.kind !== 'group' || !groupNode.parentId) return graph;

    let g1 = graph;
    const parentId = groupNode.parentId;
    const children = [...groupNode.children]; // copy

    const parentNode = g1.nodes[parentId];
    if (!parentNode) return graph;
    
    const groupIndex = parentNode.children.indexOf(groupId);

    for (let i = 0; i < children.length; i++) {
      const childId = children[i];
      if (childId) {
        g1 = this.moveNode(g1, childId, parentId, groupIndex + i);
      }
    }

    return this.deleteNode(g1, groupId);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. QUERIES
  // ─────────────────────────────────────────────────────────────

  static findByKind(graph: SceneGraph, kind: SceneNodeKind): SceneGraphNode[] {
    return Object.values(graph.nodes).filter(n => n.kind === kind);
  }

  static findByBinding(graph: SceneGraph, fieldKey: string): SceneGraphNode[] {
    return Object.values(graph.nodes).filter(n => n.binding?.fieldKey === fieldKey);
  }

  // ─────────────────────────────────────────────────────────────
  // 5. STRUCTURAL FREEDOM (P13)
  // ─────────────────────────────────────────────────────────────

  /**
   * Wrap selected nodes in a new container/group node.
   * All selected nodes must share the same parent.
   * The wrapper takes their position in the parent's children array.
   */
  static wrapInContainer(
    graph: SceneGraph,
    nodeIds: string[],
    wrapperKind: SceneNodeKind = 'container',
    wrapperDefaults: Partial<SceneGraphNode> = {}
  ): { graph: SceneGraph; wrapperId: string } {
    if (nodeIds.length === 0) return { graph, wrapperId: '' };

    const firstNode = graph.nodes[nodeIds[0]!];
    if (!firstNode) return { graph, wrapperId: '' };
    const parentId = firstNode.parentId;
    if (!parentId) return { graph, wrapperId: '' };

    // Verify all share the same parent
    const allSameParent = nodeIds.every(id => {
      const n = graph.nodes[id];
      return n && n.parentId === parentId;
    });
    if (!allSameParent) return { graph, wrapperId: '' };

    const parent = graph.nodes[parentId];
    if (!parent) return { graph, wrapperId: '' };

    // Find the earliest index of any selected node in parent.children
    const indices = nodeIds.map(id => parent.children.indexOf(id)).filter(i => i !== -1).sort((a, b) => a - b);
    const insertAt = indices[0] ?? parent.children.length;

    // Create wrapper node
    const wrapperId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newNodes = { ...graph.nodes };

    const wrapper: SceneGraphNode = {
      id: wrapperId,
      kind: wrapperKind,
      name: wrapperDefaults.name || 'Wrapper',
      parentId,
      children: [],
      geometry: wrapperDefaults.geometry || {
        position: 'flow',
        x: 0, y: 0,
        width: '100%', height: 'auto',
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0,
      },
      layoutMode: wrapperDefaults.layoutMode || 'flex',
      style: wrapperDefaults.style || {},
      responsive: wrapperDefaults.responsive || {},
      locked: false,
      hidden: false,
      customerEditable: false,
      customizationLevel: 'LOCKED',
      ...wrapperDefaults
    };

    // Remove selected nodes from parent, add wrapper at their position
    const newParentChildren = parent.children.filter(id => !nodeIds.includes(id));
    newParentChildren.splice(insertAt, 0, wrapperId);

    newNodes[parentId] = { ...parent, children: newParentChildren };
    newNodes[wrapperId] = wrapper;

    // Re-parent selected nodes under the wrapper (preserve their relative order)
    const orderedSelected = parent.children.filter(id => nodeIds.includes(id));
    wrapper.children = orderedSelected;
    for (const id of orderedSelected) {
      if (newNodes[id]) {
        newNodes[id] = { ...newNodes[id], parentId: wrapperId };
      }
    }

    return {
      graph: {
        ...graph,
        nodes: newNodes,
        renderOrder: this.buildRenderOrder(newNodes, graph.rootNodeId),
      },
      wrapperId,
    };
  }

  /**
   * Unwrap: remove a container node and promote its children up to its parent.
   * The children take the container's position in the parent's children array.
   */
  static unwrapChildren(graph: SceneGraph, containerId: string): SceneGraph {
    const container = graph.nodes[containerId];
    if (!container || !container.parentId || containerId === graph.rootNodeId) return graph;

    const parentId = container.parentId;
    const parent = graph.nodes[parentId];
    if (!parent) return graph;

    const newNodes = { ...graph.nodes };

    // Find container's index in parent
    const containerIndex = parent.children.indexOf(containerId);
    const childrenToPromote = [...container.children];

    // Replace container in parent's children with its children
    const newParentChildren = [...parent.children];
    newParentChildren.splice(containerIndex, 1, ...childrenToPromote);
    newNodes[parentId] = { ...parent, children: newParentChildren };

    // Re-parent all children
    for (const childId of childrenToPromote) {
      if (newNodes[childId]) {
        newNodes[childId] = { ...newNodes[childId], parentId };
      }
    }

    // Remove the container node itself
    delete newNodes[containerId];

    return {
      ...graph,
      nodes: newNodes,
      renderOrder: this.buildRenderOrder(newNodes, graph.rootNodeId),
    };
  }

  /**
   * Replace the kind of a node (e.g. convert 'container' to 'stack', or 'text' to 'richtext').
   * Preserves all children, geometry, style, and bindings.
   */
  static replaceNodeKind(graph: SceneGraph, nodeId: string, newKind: SceneNodeKind): SceneGraph {
    const node = graph.nodes[nodeId];
    if (!node) return graph;

    return {
      ...graph,
      nodes: {
        ...graph.nodes,
        [nodeId]: { ...node, kind: newKind },
      },
    };
  }

  /**
   * Nest a node inside a target sibling (make it a child of the target).
   * The node is removed from its current parent and appended to target's children.
   */
  static nestNodeInto(graph: SceneGraph, nodeId: string, targetId: string): SceneGraph {
    const node = graph.nodes[nodeId];
    const target = graph.nodes[targetId];
    if (!node || !target || nodeId === targetId || nodeId === graph.rootNodeId) return graph;

    // Prevent cyclic nesting
    const ancestors = this.getAncestors(graph, targetId);
    if (ancestors.some(a => a.id === nodeId)) return graph;

    return this.moveNode(graph, nodeId, targetId);
  }

  /**
   * Flatten: take all grandchildren from a node's children and promote them directly
   * under the node, removing the intermediate container level.
   * Only flattens one level deep.
   */
  static flattenChildren(graph: SceneGraph, nodeId: string): SceneGraph {
    const node = graph.nodes[nodeId];
    if (!node || node.children.length === 0) return graph;

    const newNodes = { ...graph.nodes };
    const newChildOrder: string[] = [];

    for (const childId of node.children) {
      const child = newNodes[childId];
      if (!child) continue;

      if (child.children.length > 0 && ['container', 'group', 'stack', 'frame'].includes(child.kind)) {
        // Promote grandchildren
        for (const grandchildId of child.children) {
          if (newNodes[grandchildId]) {
            newNodes[grandchildId] = { ...newNodes[grandchildId], parentId: nodeId };
            newChildOrder.push(grandchildId);
          }
        }
        // Remove the intermediate container
        delete newNodes[childId];
      } else {
        newChildOrder.push(childId);
      }
    }

    newNodes[nodeId] = { ...node, children: newChildOrder };

    return {
      ...graph,
      nodes: newNodes,
      renderOrder: this.buildRenderOrder(newNodes, graph.rootNodeId),
    };
  }

  /**
   * Swap the positions of two sibling nodes.
   * Both nodes must share the same parent.
   */
  static swapNodes(graph: SceneGraph, nodeIdA: string, nodeIdB: string): SceneGraph {
    const nodeA = graph.nodes[nodeIdA];
    const nodeB = graph.nodes[nodeIdB];
    if (!nodeA || !nodeB) return graph;

    // If same parent, swap indices
    if (nodeA.parentId && nodeA.parentId === nodeB.parentId) {
      const parent = graph.nodes[nodeA.parentId];
      if (!parent) return graph;

      const idxA = parent.children.indexOf(nodeIdA);
      const idxB = parent.children.indexOf(nodeIdB);
      if (idxA === -1 || idxB === -1) return graph;

      const newChildren = [...parent.children];
      newChildren[idxA] = nodeIdB;
      newChildren[idxB] = nodeIdA;

      return {
        ...graph,
        nodes: {
          ...graph.nodes,
          [nodeA.parentId]: { ...parent, children: newChildren },
        },
        renderOrder: this.buildRenderOrder(
          { ...graph.nodes, [nodeA.parentId]: { ...parent, children: newChildren } },
          graph.rootNodeId
        ),
      };
    }

    // If different parents, swap full positions
    if (nodeA.parentId && nodeB.parentId) {
      const parentA = graph.nodes[nodeA.parentId];
      const parentB = graph.nodes[nodeB.parentId];
      if (!parentA || !parentB) return graph;

      const newNodes = { ...graph.nodes };

      // Swap parent references
      newNodes[nodeIdA] = { ...nodeA, parentId: nodeB.parentId };
      newNodes[nodeIdB] = { ...nodeB, parentId: nodeA.parentId };

      // Swap in children arrays
      newNodes[nodeA.parentId] = {
        ...parentA,
        children: parentA.children.map(id => id === nodeIdA ? nodeIdB : id),
      };
      newNodes[nodeB.parentId] = {
        ...parentB,
        children: parentB.children.map(id => id === nodeIdB ? nodeIdA : id),
      };

      return {
        ...graph,
        nodes: newNodes,
        renderOrder: this.buildRenderOrder(newNodes, graph.rootNodeId),
      };
    }

    return graph;
  }

  /**
   * Delete multiple nodes at once, handling dependency order correctly.
   * Skips root node and any node whose ancestor is also being deleted.
   */
  static multiDelete(graph: SceneGraph, nodeIds: string[]): SceneGraph {
    // Filter out root
    const toDelete = nodeIds.filter(id => id !== graph.rootNodeId);
    if (toDelete.length === 0) return graph;

    // Sort topologically: delete children before parents
    // to avoid double-processing
    const rootsToDelete = toDelete.filter(id => {
      const node = graph.nodes[id];
      if (!node) return false;
      let current = node;
      while (current.parentId) {
        if (toDelete.includes(current.parentId)) return false;
        const parent = graph.nodes[current.parentId];
        if (!parent) break;
        current = parent;
      }
      return true;
    });

    let g = graph;
    for (const id of rootsToDelete) {
      g = this.deleteNode(g, id);
    }

    return g;
  }

  /**
   * Insert a pre-built subtree (Record<id, SceneGraphNode>) into the graph
   * under a target parent. Used for paste and template insertion.
   */
  static insertSubtree(
    graph: SceneGraph,
    subtreeNodes: Record<string, SceneGraphNode>,
    subtreeRootIds: string[],
    targetParentId: string,
    insertIndex?: number
  ): SceneGraph {
    const newNodes = { ...graph.nodes };

    // Merge subtree nodes
    for (const [id, node] of Object.entries(subtreeNodes)) {
      newNodes[id] = node;
    }

    // Attach subtree roots to target parent
    if (newNodes[targetParentId]) {
      const parentChildren = [...newNodes[targetParentId].children];
      if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= parentChildren.length) {
        parentChildren.splice(insertIndex, 0, ...subtreeRootIds);
      } else {
        parentChildren.push(...subtreeRootIds);
      }
      newNodes[targetParentId] = { ...newNodes[targetParentId], children: parentChildren };
    }

    // Set parentId on subtree roots
    for (const rootId of subtreeRootIds) {
      if (newNodes[rootId]) {
        newNodes[rootId] = { ...newNodes[rootId], parentId: targetParentId };
      }
    }

    return {
      ...graph,
      nodes: newNodes,
      renderOrder: this.buildRenderOrder(newNodes, graph.rootNodeId),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 6. LAYOUT & POSITIONING ENGINE (P14-B)
  // ─────────────────────────────────────────────────────────────

  /**
   * Toggles layout mode between Auto-Layout (flex/stack) and Freeform (absolute coordinates)
   * preserving visual positions so elements do not jump or collapse.
   */
  static toggleLayoutMode(graph: SceneGraph, nodeId: string): SceneGraph {
    const node = graph.nodes[nodeId];
    if (!node) return graph;

    const currentMode = node.layoutMode || 'freeform';
    const isCurrentlyAuto = currentMode === 'flex' || currentMode === 'stack' || currentMode === 'grid';
    const nextMode = isCurrentlyAuto ? 'freeform' : 'flex';

    const newNodes = { ...graph.nodes };
    const updatedNode = { ...node, layoutMode: nextMode as any };

    if (nextMode === 'freeform') {
      // Switching to Freeform: ensure children have absolute position with preserved X, Y
      let currentYOffset = 0;
      const updatedChildren = [...node.children];
      for (let i = 0; i < updatedChildren.length; i++) {
        const childId = updatedChildren[i];
        if (childId && newNodes[childId]) {
          const child = newNodes[childId]!;
          const childH = typeof child.geometry.height === 'number' ? child.geometry.height : 80;
          newNodes[childId] = {
            ...child,
            geometry: {
              ...child.geometry,
              position: 'absolute',
              x: child.geometry.x !== undefined && child.geometry.x !== 0 ? child.geometry.x : 0,
              y: child.geometry.y !== undefined && child.geometry.y !== 0 ? child.geometry.y : currentYOffset,
            }
          };
          currentYOffset += childH + 20;
        }
      }
    } else {
      // Switching to Auto-Layout: switch children to flow, sorting children by visual Y/X position
      const childObjects = node.children
        .map(cid => newNodes[cid])
        .filter(Boolean) as SceneGraphNode[];

      childObjects.sort((a, b) => {
        const yA = Number(a.geometry.y) || 0;
        const yB = Number(b.geometry.y) || 0;
        if (yA !== yB) return yA - yB;
        return (Number(a.geometry.x) || 0) - (Number(b.geometry.x) || 0);
      });

      updatedNode.children = childObjects.map(c => c.id);
      for (const child of childObjects) {
        newNodes[child.id] = {
          ...child,
          geometry: {
            ...child.geometry,
            position: 'flow',
          }
        };
      }
      if (!updatedNode.layoutConfig) {
        updatedNode.layoutConfig = {
          direction: 'vertical',
          gap: '1.5rem',
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
          alignment: { primary: 'start', cross: 'stretch' },
          wrap: false,
          sizing: { primary: 'hug', cross: 'fill' }
        };
      }
    }

    newNodes[nodeId] = updatedNode;

    return {
      ...graph,
      nodes: newNodes,
      renderOrder: this.buildRenderOrder(newNodes, graph.rootNodeId),
    };
  }

  /**
   * Aligns multiple nodes along specified axis using AlignmentEngine
   */
  static alignNodes(
    graph: SceneGraph,
    nodeIds: string[],
    alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
  ): SceneGraph {
    if (nodeIds.length < 2) return graph;
    const nodes = nodeIds.map(id => graph.nodes[id]).filter(Boolean) as SceneGraphNode[];
    if (nodes.length < 2) return graph;

    const bounds = nodes.map(n => ({
      id: n.id,
      x: Number(n.geometry.x) || 0,
      y: Number(n.geometry.y) || 0,
      width: Number(n.geometry.width) || 100,
      height: Number(n.geometry.height) || 100,
    }));

    let patches: Partial<NodeGeometry>[] = [];
    switch (alignment) {
      case 'left': patches = AlignmentEngine.alignLeft(nodes); break;
      case 'center': patches = AlignmentEngine.alignCenter(nodes, bounds); break;
      case 'right': patches = AlignmentEngine.alignRight(nodes, bounds); break;
      case 'top': patches = AlignmentEngine.alignTop(nodes); break;
      case 'middle': patches = AlignmentEngine.alignMiddle(nodes, bounds); break;
      case 'bottom': patches = AlignmentEngine.alignBottom(nodes, bounds); break;
    }

    const newNodes = { ...graph.nodes };
    nodes.forEach((node, idx) => {
      if (patches[idx]) {
        newNodes[node.id] = {
          ...node,
          geometry: {
            ...node.geometry,
            position: 'absolute',
            ...patches[idx],
          }
        };
      }
    });

    return { ...graph, nodes: newNodes };
  }

  /**
   * Distributes multiple nodes evenly along horizontal or vertical axis
   */
  static distributeNodes(
    graph: SceneGraph,
    nodeIds: string[],
    axis: 'horizontal' | 'vertical'
  ): SceneGraph {
    if (nodeIds.length < 3) return graph;
    const nodes = nodeIds.map(id => graph.nodes[id]).filter(Boolean) as SceneGraphNode[];
    if (nodes.length < 3) return graph;

    const bounds = nodes.map(n => ({
      id: n.id,
      x: Number(n.geometry.x) || 0,
      y: Number(n.geometry.y) || 0,
      width: Number(n.geometry.width) || 100,
      height: Number(n.geometry.height) || 100,
    }));

    const patches = axis === 'horizontal'
      ? AlignmentEngine.distributeHorizontally(nodes, bounds)
      : AlignmentEngine.distributeVertically(nodes, bounds);

    const newNodes = { ...graph.nodes };
    nodes.forEach((node, idx) => {
      if (patches[idx] && (patches[idx].x !== undefined || patches[idx].y !== undefined)) {
        newNodes[node.id] = {
          ...node,
          geometry: {
            ...node.geometry,
            position: 'absolute',
            ...patches[idx],
          }
        };
      }
    });

    return { ...graph, nodes: newNodes };
  }

  // ─────────────────────────────────────────────────────────────
  // 7. COMPONENT ENGINE (P14-C)
  // ─────────────────────────────────────────────────────────────

  static createMasterComponent(graph: SceneGraph, nodeId: string, componentId?: string, name?: string): SceneGraph {
    const node = graph.nodes[nodeId];
    if (!node) return graph;

    const compId = componentId || `comp_${node.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now().toString(36)}`;
    const newNodes = { ...graph.nodes };

    newNodes[nodeId] = {
      ...node,
      name: name || node.name,
      component: {
        isMaster: true,
        masterComponentId: compId,
        exposedProps: {},
      },
    };

    return { ...graph, nodes: newNodes };
  }

  static instantiateComponent(
    graph: SceneGraph,
    masterNodeId: string,
    targetParentId?: string,
    variantId?: string,
    masterNodeBlueprint?: SceneGraphNode
  ): { graph: SceneGraph; instanceId: string } {
    let master: SceneGraphNode | undefined = masterNodeBlueprint || graph.nodes[masterNodeId];

    if (!master) {
      for (const n of Object.values(graph.nodes)) {
        if (n.component?.isMaster && (n.component?.masterComponentId === masterNodeId || n.id === masterNodeId)) {
          master = n;
          break;
        }
      }
    }

    if (!master) return { graph, instanceId: '' };

    const compId = master.component?.masterComponentId || master.id;
    const instanceId = `inst_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
    const effectiveParentId = targetParentId && graph.nodes[targetParentId] ? targetParentId : graph.rootNodeId;

    const idMap: Record<string, string> = { [master.id]: instanceId };
    const clonedSubtree: Record<string, SceneGraphNode> = {};

    const cloneRecursive = (srcNode: SceneGraphNode, destParentId: string, isRoot = false): string => {
      const newId = isRoot ? instanceId : `node_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
      idMap[srcNode.id] = newId;

      const childIds: string[] = [];
      if (srcNode.children && srcNode.children.length > 0) {
        for (const cId of srcNode.children) {
          const cNode = graph.nodes[cId];
          if (cNode) {
            const clonedCId = cloneRecursive(cNode, newId, false);
            if (clonedCId) childIds.push(clonedCId);
          }
        }
      }

      clonedSubtree[newId] = {
        ...JSON.parse(JSON.stringify(srcNode)),
        id: newId,
        name: isRoot ? `${srcNode.name || 'Component'} (Instance)` : srcNode.name,
        parentId: destParentId,
        children: childIds,
        component: isRoot ? {
          isMaster: false,
          masterComponentId: compId,
          variantId,
          instanceOverrides: {},
        } : undefined,
      };

      return newId;
    };

    cloneRecursive(master, effectiveParentId, true);

    // Attach to target parent
    const newNodes = { ...graph.nodes, ...clonedSubtree };
    const parent = newNodes[effectiveParentId];
    if (parent) {
      newNodes[effectiveParentId] = {
        ...parent,
        children: [...(parent.children || []), instanceId],
      };
    }

    return {
      graph: {
        ...graph,
        nodes: newNodes,
        renderOrder: this.buildRenderOrder(newNodes, graph.rootNodeId),
      },
      instanceId,
    };
  }

  static setInstanceOverride(
    graph: SceneGraph,
    instanceNodeId: string,
    overrides: Record<string, any>
  ): SceneGraph {
    const node = graph.nodes[instanceNodeId];
    if (!node) return graph;

    const existingOverrides = node.component?.instanceOverrides || {};
    const mergedOverrides = { ...existingOverrides, ...overrides };

    const newNodes = { ...graph.nodes };
    const updatedNode: SceneGraphNode = {
      ...node,
      component: {
        ...(node.component || {}),
        instanceOverrides: mergedOverrides,
      },
    };

    // Apply flat and nested overrides directly
    for (const [k, v] of Object.entries(overrides)) {
      if (k === 'textContent') {
        updatedNode.textContent = v;
      } else if (k === 'name') {
        updatedNode.name = v;
      } else if (k.startsWith('style.')) {
        const sub = k.replace('style.', '');
        updatedNode.style = { ...updatedNode.style, [sub]: v };
      } else if (k === 'style') {
        updatedNode.style = { ...updatedNode.style, ...v };
      } else if (k.startsWith('geometry.')) {
        const sub = k.replace('geometry.', '');
        updatedNode.geometry = { ...updatedNode.geometry, [sub]: v };
      } else if (k === 'geometry') {
        updatedNode.geometry = { ...updatedNode.geometry, ...v };
      } else if (k.startsWith('smartProps.')) {
        const sub = k.replace('smartProps.', '');
        updatedNode.smartProps = { ...(updatedNode.smartProps || {}), [sub]: v };
      } else if (k === 'imageUrl' || k === 'src') {
        updatedNode.smartProps = { ...(updatedNode.smartProps || {}), url: v, src: v };
      }
    }

    newNodes[instanceNodeId] = updatedNode;
    return { ...graph, nodes: newNodes };
  }

  static resetInstanceOverrides(
    graph: SceneGraph,
    instanceNodeId: string,
    masterComponentsRegistry?: Record<string, SceneGraphNode>,
    propertyKey?: string
  ): SceneGraph {
    const node = graph.nodes[instanceNodeId];
    if (!node || !node.component?.masterComponentId) return graph;

    const masterId = node.component.masterComponentId;
    let masterNode: SceneGraphNode | undefined = masterComponentsRegistry?.[masterId];

    if (!masterNode) {
      for (const n of Object.values(graph.nodes)) {
        if (n.component?.isMaster && (n.component?.masterComponentId === masterId || n.id === masterId)) {
          masterNode = n;
          break;
        }
      }
    }

    if (!masterNode) return graph;

    const newNodes = { ...graph.nodes };
    const overrides = { ...(node.component.instanceOverrides || {}) };

    if (propertyKey) {
      delete overrides[propertyKey];
      const resetNode: any = { ...node };

      if (propertyKey === 'textContent') {
        resetNode.textContent = masterNode.textContent;
      } else if (propertyKey.startsWith('style.')) {
        const sub = propertyKey.replace('style.', '');
        resetNode.style = {
          ...resetNode.style,
          [sub]: (masterNode.style as any)?.[sub],
        };
      } else if (propertyKey === 'style') {
        resetNode.style = JSON.parse(JSON.stringify(masterNode.style || {}));
      } else if (propertyKey === 'geometry') {
        resetNode.geometry = JSON.parse(JSON.stringify(masterNode.geometry || {}));
      } else if (propertyKey === 'name') {
        resetNode.name = `${masterNode.name} (Instance)`;
      } else if (propertyKey.startsWith('smartProps.')) {
        const sub = propertyKey.replace('smartProps.', '');
        resetNode.smartProps = {
          ...resetNode.smartProps,
          [sub]: (masterNode.smartProps as any)?.[sub],
        };
      }

      resetNode.component = {
        ...node.component,
        instanceOverrides: overrides,
      };

      newNodes[instanceNodeId] = resetNode;
    } else {
      newNodes[instanceNodeId] = {
        ...node,
        name: `${masterNode.name} (Instance)`,
        textContent: masterNode.textContent,
        style: JSON.parse(JSON.stringify(masterNode.style || {})),
        geometry: {
          ...node.geometry,
          width: masterNode.geometry?.width ?? node.geometry.width,
          height: masterNode.geometry?.height ?? node.geometry.height,
        },
        smartProps: JSON.parse(JSON.stringify(masterNode.smartProps || {})),
        layoutMode: masterNode.layoutMode,
        layoutConfig: masterNode.layoutConfig ? JSON.parse(JSON.stringify(masterNode.layoutConfig)) : undefined,
        component: {
          ...node.component,
          instanceOverrides: {},
        },
      };
    }

    return { ...graph, nodes: newNodes };
  }

  static pushInstanceToMaster(
    draft: any,
    sceneId: string,
    instanceNodeId: string
  ): any {
    const scene = (draft.scenes || []).find((s: any) => s.id === sceneId);
    if (!scene || !scene.sceneGraph) return draft;

    const instanceNode = scene.sceneGraph.nodes[instanceNodeId];
    if (!instanceNode || !instanceNode.component?.masterComponentId) return draft;

    const masterId = instanceNode.component.masterComponentId;
    const nextMasterComponents = { ...(draft.masterComponents || {}) };

    const canonicalProps: Partial<SceneGraphNode> = {
      name: instanceNode.name.replace(/\s*\(Instance\)$/, ''),
      textContent: instanceNode.textContent,
      style: JSON.parse(JSON.stringify(instanceNode.style || {})),
      geometry: JSON.parse(JSON.stringify(instanceNode.geometry || {})),
      smartProps: JSON.parse(JSON.stringify(instanceNode.smartProps || {})),
      layoutMode: instanceNode.layoutMode,
      layoutConfig: instanceNode.layoutConfig ? JSON.parse(JSON.stringify(instanceNode.layoutConfig)) : undefined,
    };

    if (nextMasterComponents[masterId]) {
      nextMasterComponents[masterId] = {
        ...nextMasterComponents[masterId],
        ...canonicalProps,
        component: {
          ...(nextMasterComponents[masterId].component || {}),
          isMaster: true,
          masterComponentId: masterId,
        },
      };
    } else {
      nextMasterComponents[masterId] = {
        ...JSON.parse(JSON.stringify(instanceNode)),
        id: masterId,
        ...canonicalProps,
        component: {
          isMaster: true,
          masterComponentId: masterId,
        },
      };
    }

    const nextScenes = (draft.scenes || []).map((s: any) => {
      if (!s.sceneGraph || !s.sceneGraph.nodes) return s;
      const nextNodes = { ...s.sceneGraph.nodes };
      let sceneModified = false;

      for (const [nId, n] of Object.entries(nextNodes) as [string, SceneGraphNode][]) {
        if (n.component?.isMaster && (n.component?.masterComponentId === masterId || n.id === masterId)) {
          nextNodes[nId] = {
            ...n,
            ...canonicalProps,
            component: {
              ...(n.component || {}),
              isMaster: true,
              masterComponentId: masterId,
            },
          };
          sceneModified = true;
        } else if (nId === instanceNodeId && s.id === sceneId) {
          nextNodes[nId] = {
            ...n,
            component: {
              ...(n.component || {}),
              instanceOverrides: {},
            },
          };
          sceneModified = true;
        } else if (n.component?.masterComponentId === masterId && !n.component?.isMaster) {
          const overrides = n.component?.instanceOverrides || {};
          const updatedNode: SceneGraphNode = { ...n };

          if (overrides.textContent === undefined && canonicalProps.textContent !== undefined) {
            updatedNode.textContent = canonicalProps.textContent;
          }
          if (canonicalProps.style) {
            const mergedStyle = { ...canonicalProps.style };
            for (const [k, v] of Object.entries(overrides)) {
              if (k.startsWith('style.')) {
                const subKey = k.replace('style.', '');
                (mergedStyle as any)[subKey] = v;
              }
            }
            updatedNode.style = mergedStyle;
          }
          if (canonicalProps.smartProps) {
            const mergedSmartProps = { ...canonicalProps.smartProps };
            for (const [k, v] of Object.entries(overrides)) {
              if (k.startsWith('smartProps.')) {
                const subKey = k.replace('smartProps.', '');
                (mergedSmartProps as any)[subKey] = v;
              }
            }
            updatedNode.smartProps = mergedSmartProps;
          }

          nextNodes[nId] = updatedNode;
          sceneModified = true;
        }
      }

      if (!sceneModified) return s;
      return {
        ...s,
        sceneGraph: {
          ...s.sceneGraph,
          nodes: nextNodes,
        },
      };
    });

    return {
      ...draft,
      masterComponents: nextMasterComponents,
      scenes: nextScenes,
    };
  }

  static detachInstance(graph: SceneGraph, instanceNodeId: string): SceneGraph {
    const node = graph.nodes[instanceNodeId];
    if (!node) return graph;

    const newNodes = { ...graph.nodes };
    newNodes[instanceNodeId] = {
      ...node,
      name: node.name.replace(/\s*\(Instance\)$/, '') + ' (Detached)',
      component: {
        ...(node.component || {}),
        isMaster: false,
        masterComponentId: undefined,
        isDetached: true,
        instanceOverrides: undefined,
      },
    };

    return { ...graph, nodes: newNodes };
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────

  private static buildRenderOrder(nodes: Record<string, SceneGraphNode>, rootId: string): string[] {
    const order: string[] = [];
    const traverse = (id: string) => {
      order.push(id);
      const node = nodes[id];
      if (node && node.children) {
        for (const childId of node.children) {
          traverse(childId);
        }
      }
    };
    traverse(rootId);
    return order;
  }
}
