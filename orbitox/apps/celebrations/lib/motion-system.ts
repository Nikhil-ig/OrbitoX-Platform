'use client';

/**
 * ============================================================================
 * CELEBRATIONS — CELESTIAL ODYSSEY
 * Centralized Motion Intensity & Choreography System
 * ============================================================================
 * Defines the 4-level motion hierarchy and reusable motion tokens:
 *   Level 1: Environment (drifting atmosphere, slow nebulae)
 *   Level 2: Depth (multi-plane parallax rates)
 *   Level 3: Content (editorial reveals, mask wipes, digit morphs)
 *   Level 4: Interaction (tactile pointer attraction, touch feedback)
 */

export const MOTION_INTENSITY = {
  QUIET: {
    duration: '2.4s',
    ease: 'cubic-bezier(0.25, 1, 0.5, 1)',
    factor: 0.5,
  },
  SUBTLE: {
    duration: '1.2s',
    ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
    factor: 1.0,
  },
  EXPRESSIVE: {
    duration: '0.6s',
    ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
    factor: 1.4,
  },
  HERO: {
    duration: '1.8s',
    ease: 'cubic-bezier(0.19, 1, 0.22, 1)',
    factor: 2.0,
  },
} as const;

/**
 * Standardized Motion Presets & Curves
 */
export const MOTION_PRESETS = {
  // Level 1: Environmental
  atmosphericDrift: {
    animation: 'celestialDrift 28s ease-in-out infinite alternate',
    timing: '28s',
    ease: 'ease-in-out',
  },
  starPulse: {
    animation: 'celestialStarPulse 4.5s ease-in-out infinite',
    timing: '4.5s',
  },

  // Level 2: Depth & Parallax Rates
  depthRates: {
    background: 0.4,   // 1x slow background
    nebula: 0.8,       // 1.2x atmosphere
    portraits: 1.6,    // 1.5x midground imagery
    foreground: 2.4,   // 2x foreground details
  },

  // Level 3: Content Reveals
  revealSoft: {
    transition: 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  revealEditorial: {
    transition: 'all 0.9s cubic-bezier(0.19, 1, 0.22, 1)',
  },
  imageParallax: {
    transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  constellationDraw: {
    transition: 'stroke-dashoffset 1.4s cubic-bezier(0.25, 1, 0.5, 1), stroke 0.6s ease',
  },
  starActivate: {
    transition: 'all 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  orbitSlow: {
    animation: 'celestialOrbit 120s linear infinite',
  },
  orbitMedium: {
    animation: 'celestialOrbit 45s linear infinite',
  },
  digitMorph: {
    transition: 'color 0.3s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  sceneTransform: {
    transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
  },
} as const;

/**
 * Checks if client prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Calculates clamped normalized pointer coordinates (-1 to 1)
 */
export function calculateNormalizedPointer(
  e: MouseEvent,
  container: HTMLElement
): { x: number; y: number } {
  const rect = container.getBoundingClientRect();
  const rawX = (e.clientX - rect.left) / rect.width;
  const rawY = (e.clientY - rect.top) / rect.height;
  const x = Math.max(-1, Math.min(1, (rawX - 0.5) * 2));
  const y = Math.max(-1, Math.min(1, (rawY - 0.5) * 2));
  return { x, y };
}

/**
 * Gravity convergence vector between two points
 */
export function calculateGravityOffset(
  pointerX: number,
  pointerY: number,
  bias: 'left' | 'right'
): { x: number; y: number; scale: number; opacity: number } {
  // When cursor moves toward left (bias === 'left'), left portrait gently advances and scales up slightly
  const isTarget = (bias === 'left' && pointerX < 0) || (bias === 'right' && pointerX > 0);
  const intensity = Math.abs(pointerX);
  
  const mult = bias === 'left' ? -1 : 1;
  const x = pointerX * 12 * (bias === 'left' ? -0.8 : 0.8);
  const y = pointerY * 8 + (bias === 'left' ? -6 : 6);
  const scale = isTarget ? 1 + intensity * 0.025 : 1 - intensity * 0.012;
  const opacity = isTarget ? 1 : Math.max(0.78, 1 - intensity * 0.12);

  return { x, y, scale, opacity };
}
