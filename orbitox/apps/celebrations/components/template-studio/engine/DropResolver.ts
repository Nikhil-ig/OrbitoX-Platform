import { SceneGraph, SceneNodeKind } from './SceneGraphTypes';

export class DropResolver {
  /**
   * Given a drop point (x, y) on the canvas, find the best
   * parent node to insert into, and the insertion index.
   */
  static resolveDropTarget(
    sceneGraph: SceneGraph,
    dropX: number, 
    dropY: number,
    nodeKind: SceneNodeKind,
    measuredRects: Record<string, DOMRect>
  ): { parentId: string; insertIndex: number; position: 'flow' | 'absolute'; localX: number; localY: number } {
    
    // Default to rootNodeId or first root node if we can't find anything better
    const rootId = sceneGraph.rootNodeId || sceneGraph.renderOrder[0] || Object.keys(sceneGraph.nodes || {})[0] || 'root';
    let bestParentId: string = rootId;
    
    // Find the deepest container that contains the drop point
    const candidates = sceneGraph.renderOrder.filter(id => {
      const node = sceneGraph.nodes[id];
      if (!node) return false;
      // Containers that can hold children
      const isContainer =
        node.kind === 'container' ||
        node.kind === 'group' ||
        node.kind === 'stack' ||
        node.kind === 'frame' ||
        node.kind === 'grid';
      if (!isContainer) return false;
      
      const rect = measuredRects[id] as any;
      if (!rect) return false;

      const left = rect.left ?? rect.x ?? 0;
      const top = rect.top ?? rect.y ?? 0;
      const right = rect.right ?? (left + (rect.width ?? 0));
      const bottom = rect.bottom ?? (top + (rect.height ?? 0));

      return dropX >= left && dropX <= right && dropY >= top && dropY <= bottom;
    });

    // The last candidate in the render order is the topmost visually
    if (candidates.length > 0) {
      bestParentId = candidates[candidates.length - 1]!;
    }

    const parentNode = sceneGraph.nodes[bestParentId];
    const parentRect = measuredRects[bestParentId];

    // If parent is a flex/stack layout, determine insert index
    if (parentNode && (parentNode.layoutMode === 'flex' || parentNode.layoutMode === 'stack' || parentNode.layoutMode === 'grid')) {
      // Flow positioning
      // To determine index, we look at the children's rects
      let insertIndex = parentNode.children.length;
      
      const isVertical = (parentNode.layoutConfig as any)?.direction === 'vertical' || parentNode.layoutMode === 'stack';
      
      for (let i = 0; i < parentNode.children.length; i++) {
        const childId = parentNode.children[i];
        if (!childId) continue;
        const childRect = measuredRects[childId];
        if (childRect) {
          if (isVertical) {
            // Drop above this child if dropY is in the upper half of the child's rect
            if (dropY < childRect.top + childRect.height / 2) {
              insertIndex = i;
              break;
            }
          } else {
            if (dropX < childRect.left + childRect.width / 2) {
              insertIndex = i;
              break;
            }
          }
        }
      }

      return {
        parentId: bestParentId,
        insertIndex,
        position: 'flow',
        localX: 0,
        localY: 0
      };
    } else {
      // Freeform / Absolute positioning
      let localX = 0;
      let localY = 0;
      if (parentRect) {
        const pLeft = parentRect.left ?? (parentRect as any).x ?? 0;
        const pTop = parentRect.top ?? (parentRect as any).y ?? 0;
        localX = dropX - pLeft;
        localY = dropY - pTop;
      } else {
        localX = dropX;
        localY = dropY;
      }
      
      return {
        parentId: bestParentId,
        insertIndex: parentNode?.children?.length || 0,
        position: 'absolute',
        localX,
        localY
      };
    }
  }
}
