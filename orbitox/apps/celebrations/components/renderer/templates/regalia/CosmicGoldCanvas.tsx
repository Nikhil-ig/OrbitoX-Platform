'use client';

import React, { useEffect, useRef } from 'react';

interface StardustParticle {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  alpha: number;
  speedY: number;
  speedX: number;
  pulseSpeed: number;
  pulseOffset: number;
  color: string;
}

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  alpha: number;
  decay: number;
}

export function CosmicGoldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Particle Palette
    const goldPalette = [
      '#D4AF37', // 24K Imperial Gold
      '#FFDF73', // Pale Shimmer Gold
      '#F59E0B', // Rich Amber Gold
      '#FFF3C4', // Radiant Starlight White-Gold
      '#B38728', // Deep Antique Bronze Gold
    ];

    // Responsive particle count (fewer on mobile for 120fps buttery efficiency)
    const count = width < 768 ? 45 : 90;
    const particles: StardustParticle[] = [];

    for (let i = 0; i < count; i++) {
      const color = goldPalette[Math.floor(Math.random() * goldPalette.length)] || '#D4AF37';
      const baseAlpha = 0.2 + Math.random() * 0.6;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 0.8 + Math.random() * 2.2,
        baseAlpha,
        alpha: baseAlpha,
        speedY: -(0.15 + Math.random() * 0.4),
        speedX: (Math.random() - 0.5) * 0.25,
        pulseSpeed: 0.015 + Math.random() * 0.03,
        pulseOffset: Math.random() * Math.PI * 2,
        color,
      });
    }

    // Shooting Stars
    const shootingStars: ShootingStar[] = [];
    let lastStarTime = Date.now();

    let frame = 0;
    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      // Render Floating Stardust Particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!p) continue;

        p.y += p.speedY;
        p.x += p.speedX;

        // Wrap around viewport edges
        if (p.y < -10) p.y = height + 10;
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        // Breathing twinkle
        p.alpha = p.baseAlpha + Math.sin(frame * p.pulseSpeed + p.pulseOffset) * 0.25;
        p.alpha = Math.max(0.05, Math.min(0.95, p.alpha));

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = p.size * 3.5;
        ctx.shadowColor = p.color;

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Randomly spawn shooting star every 4 to 8 seconds
      const now = Date.now();
      if (now - lastStarTime > 4500 && Math.random() < 0.02) {
        lastStarTime = now;
        shootingStars.push({
          x: Math.random() * width * 0.8,
          y: Math.random() * height * 0.3,
          length: 60 + Math.random() * 80,
          speed: 9 + Math.random() * 6,
          angle: Math.PI / 4 + (Math.random() - 0.5) * 0.2,
          alpha: 0.9,
          decay: 0.02 + Math.random() * 0.015,
        });
      }

      // Render Shooting Stars
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const star = shootingStars[i];
        if (!star) continue;

        star.x += Math.cos(star.angle) * star.speed;
        star.y += Math.sin(star.angle) * star.speed;
        star.alpha -= star.decay;

        if (star.alpha <= 0 || star.x > width || star.y > height) {
          shootingStars.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = star.alpha;
        ctx.strokeStyle = '#FFDF73';
        ctx.lineWidth = 1.6;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#D4AF37';

        ctx.beginPath();
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(
          star.x - Math.cos(star.angle) * star.length,
          star.y - Math.sin(star.angle) * star.length
        );
        ctx.stroke();
        ctx.restore();
      }

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}
