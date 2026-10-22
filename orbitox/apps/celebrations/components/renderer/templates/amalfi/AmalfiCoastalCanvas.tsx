'use client';

import React, { useEffect, useRef } from 'react';

interface BougainvilleaPetal {
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

interface SunbeamMote {
  x: number;
  y: number;
  radius: number;
  speedX: number;
  speedY: number;
  baseAlpha: number;
  alphaPhase: number;
}

export function AmalfiCoastalCanvas() {
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

    const petalColors = [
      'rgba(255, 112, 150, 0.75)', // Vibrant Magenta Bougainvillea
      'rgba(216, 74, 117, 0.7)',   // Deep Italian Rose
      'rgba(244, 166, 179, 0.65)',  // Soft Peach Rose
      'rgba(255, 183, 107, 0.65)',  // Sunset Amber
    ];

    const petals: BougainvilleaPetal[] = Array.from({ length: 24 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 10 + Math.random() * 14,
      speedY: 0.6 + Math.random() * 1.2,
      speedX: 0.4 + Math.random() * 0.8, // coastal sea breeze drift to right
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.03,
      opacity: 0.35 + Math.random() * 0.45,
      color: petalColors[Math.floor(Math.random() * petalColors.length)] || petalColors[0]!,
    }));

    const motes: SunbeamMote[] = Array.from({ length: 26 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 1.2 + Math.random() * 2.4,
      speedX: 0.2 + Math.random() * 0.4,
      speedY: (Math.random() - 0.5) * 0.3,
      baseAlpha: 0.3 + Math.random() * 0.5,
      alphaPhase: Math.random() * Math.PI * 2,
    }));

    let t = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      t += 0.02;

      // 1. Sunbeam Sea Breeze Motes
      motes.forEach((m) => {
        m.x += m.speedX;
        m.y += m.speedY;
        m.alphaPhase += 0.03;

        if (m.x > width + 10) m.x = -10;
        if (m.y < -10) m.y = height + 10;
        if (m.y > height + 10) m.y = -10;

        const currentAlpha = m.baseAlpha * (0.5 + 0.5 * Math.sin(m.alphaPhase));
        const grad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.radius * 3.5);
        grad.addColorStop(0, `rgba(255, 235, 175, ${currentAlpha})`);
        grad.addColorStop(0.5, `rgba(232, 184, 109, ${currentAlpha * 0.4})`);
        grad.addColorStop(1, 'rgba(232, 184, 109, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius * 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Bougainvillea Petals
      petals.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(t * 1.5 + p.size) * 0.4;
        p.rotation += p.rotSpeed;

        if (p.y > height + 20) {
          p.y = -20;
          p.x = Math.random() * width;
        }
        if (p.x > width + 20) p.x = -20;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.4, p.size * 0.65, Math.PI / 6, 0, Math.PI * 2);
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
