import { ImportedNode } from '../types/ImportIR';

export interface BoundingBox2D {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface InferredLayoutResult {
  mode: 'flex' | 'grid' | 'absolute' | 'flow';
  direction?: 'horizontal' | 'vertical';
  gap?: number;
  wrap?: boolean;
}

export class LayoutInferrer {
  /**
   * Infer layout from ImportedNode and its children
   */
  static inferNodeLayout(node: ImportedNode, children: ImportedNode[]): ImportedNode['layout'] {
    if (node.layout.mode === 'flex' || node.layout.mode === 'grid') {
      return node.layout;
    }

    if (!children || !Array.isArray(children) || children.length <= 1) {
      return node.layout.mode ? node.layout : { ...node.layout, mode: 'flow' };
    }

    const boxes: BoundingBox2D[] = children
      .map((c) => ({
        id: c.id,
        x: typeof c.geometry.x === 'number' ? c.geometry.x : 0,
        y: typeof c.geometry.y === 'number' ? c.geometry.y : 0,
        width: typeof c.geometry.width === 'number' ? c.geometry.width : 100,
        height: typeof c.geometry.height === 'number' ? c.geometry.height : 50,
      }))
      .filter((b) => b.x !== 0 || b.y !== 0);

    if (boxes.length <= 1) {
      return node.layout.mode ? node.layout : { ...node.layout, mode: 'flow' };
    }

    const inferred = this.inferLayout(boxes);
    return {
      ...node.layout,
      mode: inferred.mode,
      direction: inferred.direction || node.layout.direction,
      gap: inferred.gap || node.layout.gap,
    };
  }

  /**
   * Infer whether a set of child bounding boxes represents a flex row, column, or absolute canvas
   */
  static inferLayout(boxes: BoundingBox2D[]): InferredLayoutResult {
    if (!boxes || !Array.isArray(boxes) || boxes.length <= 1) {
      return { mode: 'flow' };
    }

    // Check for deliberate overlaps
    let overlapCount = 0;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        const hasOverlap =
          a.x < b.x + b.width &&
          a.x + a.width > b.x &&
          a.y < b.y + b.height &&
          a.y + a.height > b.y;
        if (hasOverlap) overlapCount++;
      }
    }

    // If substantial overlaps exist, keep absolute positioning
    if (overlapCount > 0) {
      return { mode: 'absolute' };
    }

    // Sort by vertical position
    const sortedByY = [...boxes].sort((a, b) => a.y - b.y);
    const sortedByX = [...boxes].sort((a, b) => a.x - b.x);

    // Test Vertical Stack hypothesis: each subsequent item is strictly below the previous
    let isVerticalStack = true;
    let totalVerticalGap = 0;
    for (let i = 0; i < sortedByY.length - 1; i++) {
      const curr = sortedByY[i]!;
      const next = sortedByY[i + 1]!;
      if (next.y < curr.y + curr.height * 0.7) {
        isVerticalStack = false;
        break;
      }
      totalVerticalGap += Math.max(0, next.y - (curr.y + curr.height));
    }

    if (isVerticalStack) {
      const avgGap = Math.round(totalVerticalGap / (sortedByY.length - 1));
      return {
        mode: 'flex',
        direction: 'vertical',
        gap: avgGap,
      };
    }

    // Test Horizontal Row hypothesis: each subsequent item is strictly to the right
    let isHorizontalRow = true;
    let totalHorizontalGap = 0;
    for (let i = 0; i < sortedByX.length - 1; i++) {
      const curr = sortedByX[i]!;
      const next = sortedByX[i + 1]!;
      if (next.x < curr.x + curr.width * 0.7) {
        isHorizontalRow = false;
        break;
      }
      totalHorizontalGap += Math.max(0, next.x - (curr.x + curr.width));
    }

    if (isHorizontalRow) {
      const avgGap = Math.round(totalHorizontalGap / (sortedByX.length - 1));
      return {
        mode: 'flex',
        direction: 'horizontal',
        gap: avgGap,
      };
    }

    // Default to flow layout
    return { mode: 'flow' };
  }
}
