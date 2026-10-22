/**
 * WAAPIMotionDriver
 * High-performance Web Animations API (WAAPI) canvas synchronization engine.
 * Synchronizes keyframes, spring physics, and playhead scrub positions
 * with real DOM canvas elements at 60+ FPS.
 */

export interface MotionKeyframe {
  offset: number; // 0 to 1
  opacity?: number;
  transform?: string;
  filter?: string;
}

export interface WAAPIDriverConfig {
  durationMs: number;
  easing: string;
  iterations?: number;
  fill?: FillMode;
}

class WAAPIMotionDriverImpl {
  private activeAnimations: Map<string, Animation> = new Map();

  /**
   * Apply scrubbed playhead position directly to the DOM element in the canvas.
   * Interpolates opacity and transforms according to keyframe definitions.
   */
  syncPlayhead(
    nodeId: string,
    currentTimeSec: number,
    durationSec: number,
    motionPreset: string = 'fade-up'
  ): void {
    if (typeof document === 'undefined') return;

    // Find the canvas node DOM element (by data-node-id or id)
    const el = document.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;
    if (!el) return;

    const progress = Math.max(0, Math.min(1, currentTimeSec / (durationSec || 1)));

    // Compute keyframe interpolation based on motionPreset
    let opacity = 1;
    let translateY = 0;
    let translateX = 0;
    let scale = 1;
    let rotate = 0;

    switch (motionPreset) {
      case 'slide-up':
      case 'fade-up':
      default:
        opacity = progress;
        translateY = (1 - progress) * 40;
        break;
      case 'slide-down':
      case 'fade-down':
        opacity = progress;
        translateY = -(1 - progress) * 40;
        break;
      case 'slide-left':
        opacity = progress;
        translateX = (1 - progress) * 40;
        break;
      case 'slide-right':
      case 'stagger-slide':
        opacity = progress;
        translateX = -(1 - progress) * 40;
        break;
      case 'fade':
      case 'fade-in':
        opacity = progress;
        break;
      case 'zoom-in':
        opacity = progress;
        scale = 0.8 + progress * 0.2;
        break;
      case 'zoom-out':
        opacity = progress;
        scale = 1.2 - progress * 0.2;
        break;
      case 'cosmic-rotate':
        opacity = progress;
        rotate = (1 - progress) * -15;
        scale = 0.9 + progress * 0.1;
        break;
    }

    // Apply hardware-accelerated transform matrix and opacity
    el.style.opacity = `${opacity}`;
    el.style.transform = `translate3d(${translateX}px, ${translateY}px, 0px) scale(${scale}) rotate(${rotate}deg)`;
    el.style.transition = 'none'; // Instant scrub without delay
  }

  /**
   * Play active animation using native Web Animations API
   */
  playWAAPI(
    nodeId: string,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions
  ): Animation | null {
    if (typeof document === 'undefined') return null;

    const el = document.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;
    if (!el) return null;

    // Cancel existing
    this.cancelAnimation(nodeId);

    try {
      const anim = el.animate(keyframes, {
        duration: options.duration || 1000,
        easing: options.easing || 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: options.fill || 'forwards',
        ...options,
      });

      this.activeAnimations.set(nodeId, anim);
      return anim;
    } catch (e) {
      console.warn('WAAPI execution failed on node:', nodeId, e);
      return null;
    }
  }

  /**
   * Reset element transforms to baseline neutral state
   */
  resetNode(nodeId: string): void {
    if (typeof document === 'undefined') return;

    this.cancelAnimation(nodeId);

    const el = document.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;
    if (!el) return;

    el.style.opacity = '';
    el.style.transform = '';
    el.style.transition = '';
  }

  /**
   * Cancel active WAAPI animation
   */
  cancelAnimation(nodeId: string): void {
    const existing = this.activeAnimations.get(nodeId);
    if (existing) {
      existing.cancel();
      this.activeAnimations.delete(nodeId);
    }
  }
}

export const WAAPIMotionDriver = new WAAPIMotionDriverImpl();
