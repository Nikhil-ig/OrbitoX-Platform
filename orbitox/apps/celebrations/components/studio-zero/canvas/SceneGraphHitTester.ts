/**
 * 🪐 OrbitoX SceneGraph Mathematical Hit Tester
 * Pure bounding-box intersection engine.
 * Eliminates DOM-dependent elementsFromPoint lookups and handles 2D rotations,
 * z-index render order, and nested containers.
 */

import { SceneGraph, SceneGraphNode } from '@/components/template-studio/engine/SceneGraphTypes';
import { ScenePoint, SceneRect } from '@/components/template-studio/engine/CanvasCoordinates';

export interface HitTestOptions {
  excludeNodeIds?: string[];
  includeLocked?: boolean;
  includeHidden?: boolean;
  preferLeaves?: boolean;
}

export class SceneGraphHitTester {
  /**
   * Retrieves the authoritative geometric bounds for a node, preferring
   * live DOM measurements (measuredRects) while falling back to SceneGraph geometry.
   */
  static getNodeBounds(
    node: SceneGraphNode,
    measuredRects?: Record<string, SceneRect>
  ): SceneRect | null {
    if (measuredRects && measuredRects[node.id]) {
      return measuredRects[node.id] || null;
    }

    if (!node.geometry) return null;

    const x = typeof node.geometry.x === 'number' ? node.geometry.x : parseFloat(String(node.geometry.x || 0));
    const y = typeof node.geometry.y === 'number' ? node.geometry.y : parseFloat(String(node.geometry.y || 0));
    const width = typeof node.geometry.width === 'number' ? node.geometry.width : parseFloat(String(node.geometry.width || 0));
    const height = typeof node.geometry.height === 'number' ? node.geometry.height : parseFloat(String(node.geometry.height || 0));

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      return null;
    }

    return {
      x: isNaN(x) ? 0 : x,
      y: isNaN(y) ? 0 : y,
      width,
      height,
    };
  }

  /**
   * Check if a point (sceneX, sceneY) lies inside a rectangle with optional rotation.
   */
  static isPointInRect(
    sceneX: number,
    sceneY: number,
    rect: SceneRect,
    rotation: number = 0
  ): boolean {
    if (rotation === 0) {
      return (
        sceneX >= rect.x &&
        sceneX <= rect.x + rect.width &&
        sceneY >= rect.y &&
        sceneY <= rect.y + rect.height
      );
    }

    // Node is rotated around its center
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const rad = (-rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const dx = sceneX - cx;
    const dy = sceneY - cy;

    const rotatedX = dx * cos - dy * sin + cx;
    const rotatedY = dx * sin + dy * cos + cy;

    return (
      rotatedX >= rect.x &&
      rotatedX <= rect.x + rect.width &&
      rotatedY >= rect.y &&
      rotatedY <= rect.y + rect.height
    );
  }

  /**
   * Authoritative Hit Test.
   * Tests pointer coordinates in SceneGraph coordinate space and returns the ID of the
   * topmost node under the pointer.
   */
  static hitTest(
    sceneX: number,
    sceneY: number,
    sceneGraph: SceneGraph,
    measuredRects?: Record<string, SceneRect>,
    options: HitTestOptions = {}
  ): string | null {
    const hits = this.hitTestAll(sceneX, sceneY, sceneGraph, measuredRects, options);
    if (hits.length === 0) return null;

    if (options.preferLeaves !== false) {
      // Prioritize leaf nodes (nodes with 0 children) or deeply nested nodes
      // so clicking inside a button or text inside a container selects the leaf
      const leafHit = hits.find((id) => {
        const node = sceneGraph.nodes[id];
        return !node || !node.children || node.children.length === 0;
      });
      if (leafHit) return leafHit;
    }

    return hits[0] || null;
  }

  /**
   * Returns all node IDs intersecting with the given scene point, ordered from
   * topmost (highest z-index / latest render order) to bottommost.
   */
  static hitTestAll(
    sceneX: number,
    sceneY: number,
    sceneGraph: SceneGraph,
    measuredRects?: Record<string, SceneRect>,
    options: HitTestOptions = {}
  ): string[] {
    const {
      excludeNodeIds = [],
      includeLocked = false,
      includeHidden = false,
    } = options;

    const candidates: string[] = [];

    // Determine testing order: reverse renderOrder is topmost first
    let testOrder: string[] = [];
    if (sceneGraph.renderOrder && sceneGraph.renderOrder.length > 0) {
      testOrder = [...sceneGraph.renderOrder].reverse();
    } else {
      // Fallback: reverse keys
      testOrder = Object.keys(sceneGraph.nodes).reverse();
    }

    for (const nodeId of testOrder) {
      if (excludeNodeIds.includes(nodeId)) continue;

      const node = sceneGraph.nodes[nodeId];
      if (!node) continue;

      // Filter locked/hidden unless explicitly included
      if (!includeHidden && node.hidden) continue;
      if (!includeLocked && node.locked) continue;

      const bounds = this.getNodeBounds(node, measuredRects);
      if (!bounds) continue;

      const rotation = node.geometry?.rotation || 0;
      if (this.isPointInRect(sceneX, sceneY, bounds, rotation)) {
        candidates.push(nodeId);
      }
    }

    return candidates;
  }

  /**
   * Marquee selection: returns all nodes intersecting an axis-aligned marquee rectangle.
   */
  static getMarqueeIntersectedNodes(
    marqueeRect: { x1: number; y1: number; x2: number; y2: number },
    sceneGraph: SceneGraph,
    measuredRects?: Record<string, SceneRect>
  ): string[] {
    const minX = Math.min(marqueeRect.x1, marqueeRect.x2);
    const maxX = Math.max(marqueeRect.x1, marqueeRect.x2);
    const minY = Math.min(marqueeRect.y1, marqueeRect.y2);
    const maxY = Math.max(marqueeRect.y1, marqueeRect.y2);

    const intersectedIds: string[] = [];

    for (const [id, node] of Object.entries(sceneGraph.nodes)) {
      if (node.hidden || node.locked) continue;

      const bounds = this.getNodeBounds(node, measuredRects);
      if (!bounds) continue;

      // Axis-aligned bounding box intersection
      const nodeMinX = bounds.x;
      const nodeMaxX = bounds.x + bounds.width;
      const nodeMinY = bounds.y;
      const nodeMaxY = bounds.y + bounds.height;

      const overlaps =
        minX <= nodeMaxX &&
        maxX >= nodeMinX &&
        minY <= nodeMaxY &&
        maxY >= nodeMinY;

      if (overlaps) {
        intersectedIds.push(id);
      }
    }

    return intersectedIds;
  }
}
