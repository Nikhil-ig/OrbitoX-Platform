'use client';

import React, { useEffect, useRef } from 'react';

interface StarlightParticle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  baseAlpha: number;
  alphaPhase: number;
  color: string;
}

interface WisteriaPetal {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  rotation: number;
  rotSpeed: number;
  opacity: number;
  color: string;
}

export function GlasshouseCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
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

    // Glowing starlight and amber fireflies
    const starlights: StarlightParticle[] = Array.from({ length: 30 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 1.2 + Math.random() * 2.8,
      speedX: (Math.random() - 0.5) * 0.35,
      speedY: (Math.random() - 0.5) * 0.25 - 0.05,
      baseAlpha: 0.35 + Math.random() * 0.55,
      alphaPhase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.4 ? 'rgba(255, 238, 185,' : 'rgba(212, 184, 232,',
    }));

    // Floating wisteria blossom petals
    const petals: WisteriaPetal[] = Array.from({ length: 22 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 8 + Math.random() * 12,
      speedY: 0.5 + Math.random() * 1.0,
      speedX: (Math.random() - 0.5) * 0.6,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.02,
      opacity: 0.3 + Math.random() * 0.45,
      color: Math.random() > 0.5 ? 'rgba(255, 250, 245, 0.75)' : 'rgba(234, 216, 247, 0.65)',
    }));

    let t = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      t += 0.02;

      // 1. Starlight fireflies
      starlights.forEach((s) => {
        s.x += s.speedX;
        s.y += s.speedY;
        s.alphaPhase += 0.035;

        if (s.x < -10) s.x = width + 10;
        if (s.x > width + 10) s.x = -10;
        if (s.y < -10) s.y = height + 10;
        if (s.y > height + 10) s.y = -10;

        const currentAlpha = s.baseAlpha * (0.5 + 0.5 * Math.sin(s.alphaPhase));
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 3.5);
        grad.addColorStop(0, `${s.color} ${currentAlpha})`);
        grad.addColorStop(0.5, `${s.color} ${currentAlpha * 0.35})`);
        grad.addColorStop(1, `${s.color} 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Falling Wisteria Petals
      petals.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(t + p.size) * 0.5;
        p.rotation += p.rotSpeed;

        if (p.y > height + 20) {
          p.y = -20;
          p.x = Math.random() * width;
        }
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.35, p.size * 0.6, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}
