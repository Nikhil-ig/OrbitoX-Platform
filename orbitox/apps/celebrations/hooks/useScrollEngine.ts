'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export interface ScrollEngineState {
  scrollProgress: number;
  activeScene: number;
  prefersReducedMotion: boolean;
  isReady: boolean;
  scrollToScene: (sceneNumber: number) => void;
  scrollToProgress: (progress: number) => void;
}

export const TOTAL_SCENES = 8;

export function useScrollEngine(): ScrollEngineState {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeScene, setActiveScene] = useState(1);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Check reduced motion preference
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Initialize global scroll trigger listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Small delay to ensure all DOM elements are mounted and measured
    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
      setIsReady(true);
    }, 150);

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1
      );
      const progress = Math.min(Math.max(scrollY / maxScroll, 0), 1);
      setScrollProgress(progress);

      // Determine active scene based on progress across 8 scenes
      const sceneIndex = Math.min(Math.floor(progress * TOTAL_SCENES) + 1, TOTAL_SCENES);
      setActiveScene(sceneIndex);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToScene = useCallback((sceneNumber: number) => {
    if (typeof window === 'undefined') return;

    const targetElement = document.getElementById(`scene-${sceneNumber}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    } else {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const targetScroll = ((sceneNumber - 1) / (TOTAL_SCENES - 1)) * maxScroll;
      window.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
  }, []);

  const scrollToProgress = useCallback((progress: number) => {
    if (typeof window === 'undefined') return;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: progress * maxScroll, behavior: 'smooth' });
  }, []);

  return {
    scrollProgress,
    activeScene,
    prefersReducedMotion,
    isReady,
    scrollToScene,
    scrollToProgress,
  };
}
