'use client';

import React, { useEffect, useRef } from 'react';
import { Theme, Occasion } from '@orbitox-io/celebrations';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface ParallaxAtmosphereProps {
  activeScene: number;
  selectedTheme?: Theme;
  selectedOccasion?: Occasion;
  isCalmMode?: boolean;
}

export const ParallaxAtmosphere: React.FC<ParallaxAtmosphereProps> = ({
  activeScene,
  selectedTheme,
  selectedOccasion,
  isCalmMode = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mist1Ref = useRef<HTMLDivElement | null>(null);
  const mist2Ref = useRef<HTMLDivElement | null>(null);
  const ringsRef = useRef<HTMLDivElement | null>(null);

  // Stardust Particle Canvas Engine
  useEffect(() => {
    if (isCalmMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    interface Particle {
      x: number;
      y: number;
      radius: number;
      alpha: number;
      baseAlpha: number;
      vx: number;
      vy: number;
      color: string;
    }

    const goldColors = ['#D4AF37', '#F5D061', '#E6C875', '#FFF1CA'];
    const particles: Particle[] = Array.from({ length: 65 }, () => {
      const baseAlpha = Math.random() * 0.7 + 0.2;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.8 + 0.5,
        alpha: baseAlpha,
        baseAlpha,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -Math.random() * 0.45 - 0.15,
        color: goldColors[Math.floor(Math.random() * goldColors.length)] || '#D4AF37',
      };
    });

    let mouseX = width / 2;
    let mouseY = height / 2;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        // Mouse avoidance / gentle swirl
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 120) {
          p.x -= (dx / dist) * 0.8;
          p.y -= (dy / dist) * 0.8;
        }

        if (p.y < 0) p.y = height;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isCalmMode]);

  // Atmosphere Parallax Layers Driven by Scroll
  useEffect(() => {
    if (typeof window === 'undefined' || isCalmMode) return;

    const ctx = gsap.context(() => {
      if (mist1Ref.current) {
        gsap.to(mist1Ref.current, {
          y: -180,
          scale: 1.15,
          ease: 'none',
          scrollTrigger: {
            trigger: document.body,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1.5,
          },
        });
      }

      if (mist2Ref.current) {
        gsap.to(mist2Ref.current, {
          y: 220,
          scale: 1.25,
          ease: 'none',
          scrollTrigger: {
            trigger: document.body,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 2,
          },
        });
      }

      if (ringsRef.current) {
        gsap.to(ringsRef.current, {
          rotate: 180,
          scale: 1.4,
          opacity: 0.25,
          ease: 'none',
          scrollTrigger: {
            trigger: document.body,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1,
          },
        });
      }
    });

    return () => ctx.revert();
  }, [isCalmMode]);

  // Dynamic theme colors
  const themePrimary = selectedTheme?.styleConfig?.primaryColor || '#D4AF37';
  const themeBg = selectedTheme?.styleConfig?.backgroundColor || '#07090D';

  return (
    <div className="cinematic-atmosphere" aria-hidden="true">
      {/* Deep Background Color Wash */}
      <div
        className="atmosphere-layer"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${themePrimary}15 0%, ${themeBg} 75%, #050608 100%)`,
          transition: 'background 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />

      {/* Atmospheric Mist Layer 1 */}
      <div
        ref={mist1Ref}
        className="atmosphere-layer atmosphere-layer-mist"
        style={{
          background: `radial-gradient(ellipse at 75% 25%, ${themePrimary}18 0%, transparent 60%), radial-gradient(ellipse at 20% 70%, #997B2414 0%, transparent 65%)`,
        }}
      />

      {/* Atmospheric Mist Layer 2 */}
      <div
        ref={mist2Ref}
        className="atmosphere-layer"
        style={{
          background: 'radial-gradient(ellipse at 40% 80%, rgba(212, 175, 55, 0.08) 0%, transparent 55%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Concentric Rotating Sacred Geometry Rings */}
      <div
        ref={ringsRef}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 'min(90vw, 850px)',
          height: 'min(90vw, 850px)',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          opacity: 0.15,
        }}
      >
        <div
          className="cinematic-ring"
          style={{ inset: 0, border: '1px solid rgba(212, 175, 55, 0.4)' }}
        />
        <div
          className="cinematic-ring"
          style={{ inset: '15%', border: '1px dashed rgba(212, 175, 55, 0.3)' }}
        />
        <div
          className="cinematic-ring"
          style={{ inset: '32%', border: '1px solid rgba(212, 175, 55, 0.2)' }}
        />
        <div
          className="cinematic-ring"
          style={{ inset: '48%', border: '1px dotted rgba(212, 175, 55, 0.35)' }}
        />
      </div>

      {/* SVG Grain Noise Layer */}
      <div className="atmosphere-layer atmosphere-layer-grain" />

      {/* Stardust Particle Canvas */}
      {!isCalmMode && (
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />
      )}

      {/* Cinematic Vignette */}
      <div className="atmosphere-layer atmosphere-layer-vignette" />
    </div>
  );
};
