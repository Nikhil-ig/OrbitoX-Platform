'use client';

import { useEffect } from 'react';

/**
 * useScrollReveal
 * High-performance IntersectionObserver hook that adds 'revealed' class
 * to any elements marked with [data-reveal] or .reveal-on-scroll.
 * Automatically handles staggered delays via [data-reveal-delay].
 */
export function useScrollReveal(options?: IntersectionObserverInit) {
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      // Fallback for environments without IntersectionObserver
      const elements = document.querySelectorAll('[data-reveal], .reveal-on-scroll');
      elements.forEach((el) => el.classList.add('revealed'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            const delay = target.getAttribute('data-reveal-delay');
            if (delay) {
              target.style.transitionDelay = `${delay}ms`;
              target.style.animationDelay = `${delay}ms`;
            }
            target.classList.add('revealed');
            obs.unobserve(target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
        ...options,
      }
    );

    const observeElements = () => {
      const elements = document.querySelectorAll(
        '[data-reveal]:not(.revealed), .reveal-on-scroll:not(.revealed)'
      );
      elements.forEach((el) => observer.observe(el));
    };

    observeElements();

    // Re-check for dynamically added nodes via MutationObserver
    const mutationObserver = new MutationObserver(() => {
      observeElements();
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [options]);
}
