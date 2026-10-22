'use client';

import { useEffect, RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface ParallaxOptions {
  speed?: number; // y travel in pixels (+ moves down slower, - moves up faster)
  rotate?: number; // deg rotation over scroll
  scale?: number; // scale multiplier target
  triggerRef?: RefObject<HTMLElement | null>;
  start?: string;
  end?: string;
  scrub?: boolean | number;
}

export function useParallax(
  targetRef: RefObject<HTMLElement | null>,
  options: ParallaxOptions = {}
) {
  const {
    speed = 50,
    rotate = 0,
    scale,
    triggerRef,
    start = 'top bottom',
    end = 'bottom top',
    scrub = 1,
  } = options;

  useEffect(() => {
    const el = targetRef.current;
    if (!el || typeof window === 'undefined') return;

    // Skip if user prefers reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const trigger = triggerRef?.current || el;

    const ctx = gsap.context(() => {
      const vars: gsap.TweenVars = {
        y: speed,
        ease: 'none',
        scrollTrigger: {
          trigger,
          start,
          end,
          scrub,
        },
      };

      if (rotate !== 0) {
        vars.rotate = rotate;
      }

      if (scale !== undefined) {
        vars.scale = scale;
      }

      gsap.to(el, vars);
    });

    return () => ctx.revert();
  }, [targetRef, triggerRef, speed, rotate, scale, start, end, scrub]);
}
