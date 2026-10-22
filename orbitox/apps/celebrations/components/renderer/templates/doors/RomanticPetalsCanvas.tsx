'use client';

import React, { useEffect, useRef } from 'react';

interface Petal {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  rotation: number;
  rotSpeed: number;
  opacity: number;
  color: string;
  swayAmp: number;
  swayFreq: number;
  swayOffset: number;
}

interface Firefly {
  x: number;
  y: number;
  radius: number;
  speedX: number;
  speedY: number;
  baseAlpha: number;
  alphaPhase: number;
  color: string;
}

export function RomanticPetalsCanvas() {
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
      'rgba(244, 166, 179, 0.75)', // Soft Rose
      'rgba(255, 192, 203, 0.65)', // Blush Pink
      'rgba(235, 180, 190, 0.7)',  // Dusty Rose
      'rgba(253, 237, 236, 0.8)',  // Champagne Cream
      'rgba(226, 149, 168, 0.6)',  // Deep Rose
    ];

    const numPetals = Math.min(32, Math.max(16, Math.floor(width / 45)));
    const petals: Petal[] = Array.from({ length: numPetals }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 10 + Math.random() * 16,
      speedY: 0.6 + Math.random() * 1.4,
      speedX: (Math.random() - 0.5) * 0.8,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.025,
      opacity: 0.35 + Math.random() * 0.45,
      color: petalColors[Math.floor(Math.random() * petalColors.length)] || petalColors[0]!,
      swayAmp: 1.2 + Math.random() * 2.2,
      swayFreq: 0.01 + Math.random() * 0.02,
      swayOffset: Math.random() * Math.PI * 2,
    }));

    const fireflies: Firefly[] = Array.from({ length: 24 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 1.2 + Math.random() * 2.4,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: (Math.random() - 0.5) * 0.3 - 0.1,
      baseAlpha: 0.4 + Math.random() * 0.5,
      alphaPhase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.4 ? 'rgba(255, 220, 160,' : 'rgba(255, 195, 190,',
    }));

    let t = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      t += 0.02;

      // 1. Draw glowing warm candle fireflies / embers
      fireflies.forEach((f) => {
        f.x += f.speedX;
        f.y += f.speedY;
        f.alphaPhase += 0.03;

        if (f.x < -10) f.x = width + 10;
        if (f.x > width + 10) f.x = -10;
        if (f.y < -10) f.y = height + 10;
        if (f.y > height + 10) f.y = -10;

        const currentAlpha = f.baseAlpha * (0.5 + 0.5 * Math.sin(f.alphaPhase));
        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius * 3.5);
        grad.addColorStop(0, `${f.color} ${currentAlpha})`);
        grad.addColorStop(0.5, `${f.color} ${currentAlpha * 0.4})`);
        grad.addColorStop(1, `${f.color} 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius * 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Draw organic falling petals
      petals.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(t * p.swayFreq * 50 + p.swayOffset) * (p.swayAmp * 0.4);
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

        // Draw curved rose petal geometry
        ctx.beginPath();
        ctx.moveTo(0, -p.size * 0.5);
        ctx.bezierCurveTo(
          p.size * 0.6,
          -p.size * 0.4,
          p.size * 0.7,
          p.size * 0.3,
          0,
          p.size * 0.6
        );
        ctx.bezierCurveTo(
          -p.size * 0.7,
          p.size * 0.3,
          -p.size * 0.6,
          -p.size * 0.4,
          0,
          -p.size * 0.5
        );
        ctx.closePath();
        ctx.fill();

        // Subtle petal inner vein highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -p.size * 0.3);
        ctx.quadraticCurveTo(p.size * 0.1, 0, 0, p.size * 0.4);
        ctx.stroke();

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
