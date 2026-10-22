'use client';

import React, { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';

export const CursorFollower: React.FC = () => {
  const [isHovering, setIsHovering] = useState(false);
  const [cursorLabel, setCursorLabel] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  const ringRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Disable for touch devices or reduced motion
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isTouch || prefersReducedMotion) return;

    setIsVisible(true);

    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!ring || !dot) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      // The small dot follows instantly
      gsap.to(dot, {
        x: mouseX,
        y: mouseY,
        duration: 0.05,
        ease: 'none',
      });

      // The outer ring follows with smooth spring
      gsap.to(ring, {
        x: mouseX,
        y: mouseY,
        duration: 0.35,
        ease: 'power2.out',
      });
    };

    // Check for interactive element hovering
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactive = target.closest('button, a, input, textarea, [data-cursor]');
      if (interactive) {
        setIsHovering(true);
        const customLabel = interactive.getAttribute('data-cursor');
        if (customLabel) {
          setCursorLabel(customLabel);
        } else if (interactive.tagName === 'BUTTON' || interactive.tagName === 'A') {
          setCursorLabel('CLICK');
        } else if (interactive.tagName === 'INPUT' || interactive.tagName === 'TEXTAREA') {
          setCursorLabel('TYPE');
        } else {
          setCursorLabel('');
        }
      } else {
        setIsHovering(false);
        setCursorLabel('');
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <>
      <div
        ref={ringRef}
        className={`cinematic-cursor ${isHovering ? 'hovering' : ''}`}
        aria-hidden="true"
      >
        <span className="cinematic-cursor-label">{cursorLabel}</span>
      </div>
      <div ref={dotRef} className="cinematic-cursor-dot" aria-hidden="true" />
    </>
  );
};
