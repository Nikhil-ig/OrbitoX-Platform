import { NodeGeometry, SceneGraphNode } from './SceneGraphTypes';

export interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapGuide {
  axis: 'x' | 'y';
  position: number;
  type: 'start' | 'center' | 'end';
}

export interface SpacingBadge {
  x: number;
  y: number;
  distance: number;
  axis: 'x' | 'y';
  label?: string;
}

export interface DistanceIndicator {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  distance: number;
  label: string;
}

export class AlignmentEngine {
  /**
   * Computes snap guides when moving a node relative to siblings and parent.
   */
  static computeSnapGuides(
    moving: BoundingBox,
    siblings: BoundingBox[],
    parent: BoundingBox,
    threshold: number = 6
  ): { guides: SnapGuide[]; spacingBadges: SpacingBadge[]; deltaX: number; deltaY: number } {
    const guides: SnapGuide[] = [];
    const spacingBadges: SpacingBadge[] = [];
    let deltaX = 0;
    let deltaY = 0;
    
    let snappedX = false;
    let snappedY = false;

    // Helper to check and snap
    const trySnapX = (target: number, current: number, type: SnapGuide['type']) => {
      if (!snappedX && Math.abs(target - current) <= threshold) {
        deltaX = target - current;
        guides.push({ axis: 'x', position: target, type });
        snappedX = true;
      }
    };

    const trySnapY = (target: number, current: number, type: SnapGuide['type']) => {
      if (!snappedY && Math.abs(target - current) <= threshold) {
        deltaY = target - current;
        guides.push({ axis: 'y', position: target, type });
        snappedY = true;
      }
    };

    const movingEdges = {
      xStart: moving.x,
      xCenter: moving.x + moving.width / 2,
      xEnd: moving.x + moving.width,
      yStart: moving.y,
      yCenter: moving.y + moving.height / 2,
      yEnd: moving.y + moving.height,
    };

    // Snap to parent
    const parentEdges = {
      xStart: 0,
      xCenter: parent.width / 2,
      xEnd: parent.width,
      yStart: 0,
      yCenter: parent.height / 2,
      yEnd: parent.height,
    };

    trySnapX(parentEdges.xStart, movingEdges.xStart, 'start');
    trySnapX(parentEdges.xCenter, movingEdges.xCenter, 'center');
    trySnapX(parentEdges.xEnd, movingEdges.xEnd, 'end');
    
    trySnapY(parentEdges.yStart, movingEdges.yStart, 'start');
    trySnapY(parentEdges.yCenter, movingEdges.yCenter, 'center');
    trySnapY(parentEdges.yEnd, movingEdges.yEnd, 'end');

    // Snap & Spacing relative to siblings
    for (const sib of siblings) {
      if (sib.id === moving.id) continue;
      
      const sibEdges = {
        xStart: sib.x,
        xCenter: sib.x + sib.width / 2,
        xEnd: sib.x + sib.width,
        yStart: sib.y,
        yCenter: sib.y + sib.height / 2,
        yEnd: sib.y + sib.height,
      };

      trySnapX(sibEdges.xStart, movingEdges.xStart, 'start');
      trySnapX(sibEdges.xCenter, movingEdges.xCenter, 'center');
      trySnapX(sibEdges.xEnd, movingEdges.xEnd, 'end');
      trySnapX(sibEdges.xEnd, movingEdges.xStart, 'start'); // outer edges
      trySnapX(sibEdges.xStart, movingEdges.xEnd, 'end');
      
      trySnapY(sibEdges.yStart, movingEdges.yStart, 'start');
      trySnapY(sibEdges.yCenter, movingEdges.yCenter, 'center');
      trySnapY(sibEdges.yEnd, movingEdges.yEnd, 'end');
      trySnapY(sibEdges.yEnd, movingEdges.yStart, 'start');
      trySnapY(sibEdges.yStart, movingEdges.yEnd, 'end');

      // Compute numerical distance spacing badges
      // Horizontal spacing
      const verticalOverlap =
        Math.max(moving.y, sib.y) < Math.min(moving.y + moving.height, sib.y + sib.height);
      if (verticalOverlap) {
        if (sib.x + sib.width <= moving.x) {
          const gap = moving.x - (sib.x + sib.width);
          if (gap > 0 && gap <= 300) {
            spacingBadges.push({
              x: Math.round(sib.x + sib.width + gap / 2),
              y: Math.round(Math.max(moving.y, sib.y) + 12),
              distance: Math.round(gap),
              axis: 'x',
            });
          }
        } else if (moving.x + moving.width <= sib.x) {
          const gap = sib.x - (moving.x + moving.width);
          if (gap > 0 && gap <= 300) {
            spacingBadges.push({
              x: Math.round(moving.x + moving.width + gap / 2),
              y: Math.round(Math.max(moving.y, sib.y) + 12),
              distance: Math.round(gap),
              axis: 'x',
            });
          }
        }
      }

      // Vertical spacing
      const horizontalOverlap =
        Math.max(moving.x, sib.x) < Math.min(moving.x + moving.width, sib.x + sib.width);
      if (horizontalOverlap) {
        if (sib.y + sib.height <= moving.y) {
          const gap = moving.y - (sib.y + sib.height);
          if (gap > 0 && gap <= 300) {
            spacingBadges.push({
              x: Math.round(Math.max(moving.x, sib.x) + 12),
              y: Math.round(sib.y + sib.height + gap / 2),
              distance: Math.round(gap),
              axis: 'y',
            });
          }
        } else if (moving.y + moving.height <= sib.y) {
          const gap = sib.y - (moving.y + moving.height);
          if (gap > 0 && gap <= 300) {
            spacingBadges.push({
              x: Math.round(Math.max(moving.x, sib.x) + 12),
              y: Math.round(moving.y + moving.height + gap / 2),
              distance: Math.round(gap),
              axis: 'y',
            });
          }
        }
      }
    }

    return { guides, spacingBadges, deltaX, deltaY };
  }

  // Action helpers (Prompt #29: Alignment & Distribution)
  static alignLeft(nodes: SceneGraphNode[]): Partial<NodeGeometry>[] {
    const minX = Math.min(...nodes.map(n => Number(n.geometry.x) || 0));
    return nodes.map(() => ({ x: minX }));
  }

  static alignCenter(nodes: SceneGraphNode[], bounds: BoundingBox[]): Partial<NodeGeometry>[] {
    const minX = Math.min(...bounds.map(b => b.x));
    const maxX = Math.max(...bounds.map(b => b.x + b.width));
    const centerX = minX + (maxX - minX) / 2;
    return nodes.map((_, i) => ({ x: centerX - (bounds[i]?.width || 0) / 2 }));
  }

  static alignRight(nodes: SceneGraphNode[], bounds: BoundingBox[]): Partial<NodeGeometry>[] {
    const maxX = Math.max(...bounds.map(b => b.x + b.width));
    return nodes.map((_, i) => ({ x: maxX - (bounds[i]?.width || 0) }));
  }

  static alignTop(nodes: SceneGraphNode[]): Partial<NodeGeometry>[] {
    const minY = Math.min(...nodes.map(n => Number(n.geometry.y) || 0));
    return nodes.map(() => ({ y: minY }));
  }

  static alignMiddle(nodes: SceneGraphNode[], bounds: BoundingBox[]): Partial<NodeGeometry>[] {
    const minY = Math.min(...bounds.map(b => b.y));
    const maxY = Math.max(...bounds.map(b => b.y + b.height));
    const centerY = minY + (maxY - minY) / 2;
    return nodes.map((_, i) => ({ y: centerY - (bounds[i]?.height || 0) / 2 }));
  }

  static alignBottom(nodes: SceneGraphNode[], bounds: BoundingBox[]): Partial<NodeGeometry>[] {
    const maxY = Math.max(...bounds.map(b => b.y + b.height));
    return nodes.map((_, i) => ({ y: maxY - (bounds[i]?.height || 0) }));
  }

  static distributeHorizontally(nodes: SceneGraphNode[], bounds: BoundingBox[]): Partial<NodeGeometry>[] {
    if (nodes.length <= 2) return nodes.map(() => ({}));
    
    // Sort items by X position
    const sorted = nodes
      .map((node, i) => ({ node, bounds: bounds[i] || { x: 0, width: 0 }, originalIndex: i }))
      .sort((a, b) => (Number(a.node.geometry.x) || 0) - (Number(b.node.geometry.x) || 0));

    const firstX = Number(sorted[0]!.node.geometry.x) || 0;
    const last = sorted[sorted.length - 1]!;
    const lastX = Number(last.node.geometry.x) || 0;
    const totalSpan = lastX - firstX;
    const step = totalSpan / (sorted.length - 1);

    const result: Partial<NodeGeometry>[] = new Array(nodes.length);
    sorted.forEach((item, sortedIdx) => {
      result[item.originalIndex] = { x: Math.round(firstX + sortedIdx * step) };
    });

    return result;
  }

  static distributeVertically(nodes: SceneGraphNode[], bounds: BoundingBox[]): Partial<NodeGeometry>[] {
    if (nodes.length <= 2) return nodes.map(() => ({}));

    // Sort items by Y position
    const sorted = nodes
      .map((node, i) => ({ node, bounds: bounds[i] || { y: 0, height: 0 }, originalIndex: i }))
      .sort((a, b) => (Number(a.node.geometry.y) || 0) - (Number(b.node.geometry.y) || 0));

    const firstY = Number(sorted[0]!.node.geometry.y) || 0;
    const last = sorted[sorted.length - 1]!;
    const lastY = Number(last.node.geometry.y) || 0;
    const totalSpan = lastY - firstY;
    const step = totalSpan / (sorted.length - 1);

    const result: Partial<NodeGeometry>[] = new Array(nodes.length);
    sorted.forEach((item, sortedIdx) => {
      result[item.originalIndex] = { y: Math.round(firstY + sortedIdx * step) };
    });

    return result;
  }
}
