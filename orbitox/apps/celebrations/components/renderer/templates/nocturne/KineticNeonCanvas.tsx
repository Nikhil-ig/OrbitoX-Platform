'use client';

import React, { useEffect, useRef } from 'react';

interface NeonNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  glowColor: string;
  alpha: number;
}

export function KineticNeonCanvas() {
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

    const neonColors = [
      { color: '#8B5CF6', glow: 'rgba(139, 92, 246, 0.4)' }, // Electric Violet
      { color: '#06B6D4', glow: 'rgba(6, 182, 212, 0.4)' },  // Cyber Cyan
      { color: '#EC4899', glow: 'rgba(236, 72, 153, 0.4)' }, // Neon Magenta
      { color: '#F59E0B', glow: 'rgba(245, 158, 11, 0.4)' }, // Electric Gold
    ];

    const nodeCount = width < 768 ? 24 : 45;
    const nodes: NeonNode[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const c = neonColors[Math.floor(Math.random() * neonColors.length)] || neonColors[0]!;
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: 1.5 + Math.random() * 3,
        color: c.color,
        glowColor: c.glow,
        alpha: 0.3 + Math.random() * 0.6,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Move & render nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (!n) continue;

        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;

        ctx.save();
        ctx.shadowBlur = 14;
        ctx.shadowColor = n.color;
        ctx.fillStyle = n.color;
        ctx.globalAlpha = n.alpha;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Connect nearby nodes with neon laser lines
      const maxDist = width < 768 ? 90 : 130;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          if (!a || !b) continue;

          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            ctx.save();
            const alpha = (1 - dist / maxDist) * 0.22;
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = a.color;
            ctx.lineWidth = 1;
            ctx.shadowBlur = 6;
            ctx.shadowColor = a.color;

            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            ctx.restore();
          }
        }
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
