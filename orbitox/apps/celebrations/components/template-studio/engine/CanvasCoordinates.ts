/**
 * Canonical Canvas Coordinate System
 * Maps between screen, viewport, and SceneGraph coordinates.
 * Accounts for canvas zoom, pan, artboard container bounds, scroll, and devicePixelRatio.
 */

export interface ScenePoint {
  x: number;
  y: number;
}

export interface SceneRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class CanvasCoordinates {
  /**
   * Convert browser screen/pointer coordinates (clientX, clientY)
   * to canonical unscaled SceneGraph coordinates.
   */
  static clientToScene(
    clientX: number,
    clientY: number,
    artboardEl: HTMLElement | null,
    zoom: number
  ): ScenePoint {
    const safeZoom = zoom > 0 ? zoom : 1;
    if (!artboardEl) {
      return { x: clientX / safeZoom, y: clientY / safeZoom };
    }
    const rect = artboardEl.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / safeZoom,
      y: (clientY - rect.top) / safeZoom,
    };
  }

  /**
   * Convert canonical SceneGraph coordinates to browser screen coordinates.
   */
  static sceneToClient(
    sceneX: number,
    sceneY: number,
    artboardEl: HTMLElement | null,
    zoom: number
  ): ScenePoint {
    const safeZoom = zoom > 0 ? zoom : 1;
    if (!artboardEl) {
      return { x: sceneX * safeZoom, y: sceneY * safeZoom };
    }
    const rect = artboardEl.getBoundingClientRect();
    return {
      x: rect.left + sceneX * safeZoom,
      y: rect.top + sceneY * safeZoom,
    };
  }

  /**
   * Measure DOM element geometry in canonical SceneGraph units.
   * Eliminates the double-scaling error where getBoundingClientRect() inside
   * an already-scaled artboard is interpreted as unscaled CSS coordinates.
   */
  static measureNode(
    nodeEl: HTMLElement,
    artboardEl: HTMLElement,
    zoom: number
  ): SceneRect {
    const safeZoom = zoom > 0 ? zoom : 1;
    const nodeRect = nodeEl.getBoundingClientRect();
    const artboardRect = artboardEl.getBoundingClientRect();
    return {
      x: (nodeRect.left - artboardRect.left) / safeZoom,
      y: (nodeRect.top - artboardRect.top) / safeZoom,
      width: nodeRect.width / safeZoom,
      height: nodeRect.height / safeZoom,
    };
  }

  /**
   * Calculate angle in degrees from center of node to pointer position.
   * 0° = straight up (12 o'clock).
   * Snaps to 0°, 45°, 90°, 135°, 180°, etc. within threshold unless snapped = false.
   */
  static computeRotationAngle(
    pointerSceneX: number,
    pointerSceneY: number,
    centerSceneX: number,
    centerSceneY: number,
    snap: boolean = true
  ): number {
    const rad = Math.atan2(pointerSceneY - centerSceneY, pointerSceneX - centerSceneX);
    let deg = (rad * 180) / Math.PI + 90; // 0 deg is north/up
    deg = (deg + 360) % 360;

    if (snap) {
      const snapAngles = [0, 45, 90, 135, 180, 225, 270, 315, 360];
      for (const target of snapAngles) {
        if (Math.abs(deg - target) <= 5 || Math.abs(deg - (target - 360)) <= 5) {
          deg = target === 360 ? 0 : target;
          break;
        }
      }
    }
    return Math.round(deg);
  }
}
