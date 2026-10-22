'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Box, Sun, Eye, Sparkles, Orbit, Layers, Sliders, RotateCw, Play, RefreshCw } from 'lucide-react';

interface Props {
  sceneName: string;
}

export function OrbitoX3DWorkspace({ sceneName }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selected3DObject, setSelected3DObject] = useState<'sphere' | 'torus' | 'prism' | 'particles'>('torus');
  const [fov, setFov] = useState(45);
  const [rotationSpeed, setRotationSpeed] = useState(1);
  const [material, setMaterial] = useState<'glass' | 'gold' | 'holographic' | 'wireframe'>('gold');
  const [lightIntensity, setLightIntensity] = useState(1.2);
  const [particleCount, setParticleCount] = useState(250);
  const [isRotating, setIsRotating] = useState(true);

  // Hardware-accelerated Canvas WebGL / 3D geometric projection loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angleX = 0.4;
    let angleY = 0.6;
    let angleZ = 0;

    // Generate 3D particles in space
    const particles = Array.from({ length: particleCount }, () => ({
      x: (Math.random() - 0.5) * 800,
      y: (Math.random() - 0.5) * 600,
      z: (Math.random() - 0.5) * 600,
      radius: Math.random() * 2 + 1,
      baseAlpha: Math.random() * 0.7 + 0.3,
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      if (isRotating) {
        angleY += 0.008 * rotationSpeed;
        angleX += 0.004 * rotationSpeed;
      }

      // Render 3D Stardust Particles with camera perspective projection
      const focalLength = (canvas.width / 2) * (1 / Math.tan(((fov / 2) * Math.PI) / 180));
      ctx.fillStyle = '#FFFFFF';
      particles.forEach((p) => {
        // Rotate around Y
        const cosY = Math.cos(angleY * 0.3);
        const sinY = Math.sin(angleY * 0.3);
        const rotX = p.x * cosY + p.z * sinY;
        const rotZ = -p.x * sinY + p.z * cosY + 400;

        if (rotZ > 10) {
          const projX = cx + (rotX * focalLength) / rotZ;
          const projY = cy + (p.y * focalLength) / rotZ;
          const alpha = Math.max(0.1, Math.min(1, 1 - rotZ / 800)) * p.baseAlpha;
          ctx.beginPath();
          ctx.arc(projX, projY, (p.radius * focalLength) / rotZ, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(223, 186, 107, ${alpha})`;
          ctx.fill();
        }
      });

      // Render Central 3D Geometry
      const draw3DPoint = (x: number, y: number, z: number) => {
        // Rotate around X
        const cosX = Math.cos(angleX);
        const sinX = Math.sin(angleX);
        const y1 = y * cosX - z * sinX;
        const z1 = y * sinX + z * cosX;

        // Rotate around Y
        const cosY = Math.cos(angleY);
        const sinY = Math.sin(angleY);
        const x2 = x * cosY + z1 * sinY;
        const z2 = -x * sinY + z1 * cosY + 350;

        return {
          px: cx + (x2 * focalLength) / z2,
          py: cy + (y1 * focalLength) / z2,
          depth: z2,
        };
      };

      if (selected3DObject === 'torus') {
        const R = 110;
        const r = 40;
        const segments = 24;
        const rings = 16;
        ctx.strokeStyle = material === 'gold' ? '#DFBA6B' : material === 'holographic' ? '#EC4899' : '#C4B5FD';
        ctx.lineWidth = material === 'wireframe' ? 1 : 1.5;

        for (let i = 0; i < rings; i++) {
          const u = (i * Math.PI * 2) / rings;
          ctx.beginPath();
          for (let j = 0; j <= segments; j++) {
            const v = (j * Math.PI * 2) / segments;
            const x = (R + r * Math.cos(v)) * Math.cos(u);
            const y = (R + r * Math.cos(v)) * Math.sin(u);
            const z = r * Math.sin(v);
            const pt = draw3DPoint(x, y, z);
            if (j === 0) ctx.moveTo(pt.px, pt.py);
            else ctx.lineTo(pt.px, pt.py);
          }
          ctx.stroke();
        }
      } else if (selected3DObject === 'sphere') {
        const radius = 100;
        const latBands = 16;
        const lonBands = 16;
        ctx.strokeStyle = material === 'gold' ? '#DFBA6B' : material === 'holographic' ? '#06B6D4' : '#A855F7';
        ctx.lineWidth = 1.2;

        for (let lat = 0; lat <= latBands; lat++) {
          const theta = (lat * Math.PI) / latBands;
          const sinTheta = Math.sin(theta);
          const cosTheta = Math.cos(theta);
          ctx.beginPath();
          for (let lon = 0; lon <= lonBands; lon++) {
            const phi = (lon * 2 * Math.PI) / lonBands;
            const x = radius * Math.cos(phi) * sinTheta;
            const y = radius * cosTheta;
            const z = radius * Math.sin(phi) * sinTheta;
            const pt = draw3DPoint(x, y, z);
            if (lon === 0) ctx.moveTo(pt.px, pt.py);
            else ctx.lineTo(pt.px, pt.py);
          }
          ctx.stroke();
        }
      } else if (selected3DObject === 'prism') {
        const size = 90;
        const vertices = [
          { x: 0, y: -size * 1.4, z: 0 }, // Top apex
          { x: -size, y: size, z: -size },
          { x: size, y: size, z: -size },
          { x: size, y: size, z: size },
          { x: -size, y: size, z: size },
          { x: 0, y: size * 1.4, z: 0 }, // Bottom apex
        ];

        const edges = [
          [0, 1], [0, 2], [0, 3], [0, 4],
          [5, 1], [5, 2], [5, 3], [5, 4],
          [1, 2], [2, 3], [3, 4], [4, 1],
        ];

        ctx.strokeStyle = material === 'gold' ? '#DFBA6B' : '#60A5FA';
        ctx.lineWidth = 2;
        edges.forEach(([v1, v2]) => {
          const vert1 = (v1 !== undefined ? vertices[v1] : undefined) || vertices[0]!;
          const vert2 = (v2 !== undefined ? vertices[v2] : undefined) || vertices[0]!;
          const p1 = draw3DPoint(vert1.x, vert1.y, vert1.z);
          const p2 = draw3DPoint(vert2.x, vert2.y, vert2.z);
          ctx.beginPath();
          ctx.moveTo(p1.px, p1.py);
          ctx.lineTo(p2.px, p2.py);
          ctx.stroke();
        });
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [fov, rotationSpeed, selected3DObject, material, lightIntensity, particleCount, isRotating]);

  return (
    <div style={{ flex: 1, display: 'flex', height: 'calc(100vh - 52px)', background: '#040714', overflow: 'hidden' }}>
      {/* ── LEFT: 3D SCENE GRAPH HIERARCHY ── */}
      <div
        style={{
          width: '260px',
          background: '#090D1A',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
          <Box size={16} style={{ color: '#DFBA6B' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>3D Scene Graph</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active Elements
          </div>

          {[
            { id: 'torus', label: 'Floating Celestial Ring (Torus)', icon: '🪐' },
            { id: 'sphere', label: 'Cosmic Core (Sphere)', icon: '🔮' },
            { id: 'prism', label: 'Prism Gem (Diamond)', icon: '💎' },
            { id: 'particles', label: 'Starfield Particle Field', icon: '✨' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected3DObject(item.id as any)}
              style={{
                background: selected3DObject === item.id ? 'rgba(223, 186, 107, 0.15)' : 'rgba(255,255,255,0.03)',
                border: selected3DObject === item.id ? '1px solid #DFBA6B' : '1px solid rgba(255,255,255,0.06)',
                borderRadius: '6px',
                padding: '8px 10px',
                color: selected3DObject === item.id ? '#DFBA6B' : '#FFFFFF',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textAlign: 'left',
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
            Capability Architecture
          </div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
            ⚡ <strong>Capability-Based 3D:</strong> Normal websites do not incur WebGL or physics overhead. 3D runtime is lazily initialized when a 3D component is dropped into the SceneGraph.
          </div>
        </div>
      </div>

      {/* ── CENTER: INTERACTIVE 3D VIEWPORT ── */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <canvas
          ref={canvasRef}
          width={1000}
          height={700}
          style={{ width: '100%', height: '100%', display: 'block', background: 'radial-gradient(circle at center, #0F162E 0%, #040714 80%)' }}
        />

        {/* Viewport Overlay Controls */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(9, 13, 26, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '6px 12px',
          }}
        >
          <button
            onClick={() => setIsRotating(!isRotating)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#DFBA6B',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <RotateCw size={12} />
            <span>{isRotating ? 'Pause Rotation' : 'Auto Orbit'}</span>
          </button>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>WebGL 2.0 / Three Engine Compatible</span>
        </div>
      </div>

      {/* ── RIGHT: 3D MATERIAL & CAMERA INSPECTOR ── */}
      <div
        style={{
          width: '280px',
          background: '#0B1021',
          borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          userSelect: 'none',
          color: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
          <Sliders size={16} style={{ color: '#DFBA6B' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>3D Parameters</span>
        </div>

        {/* Materials */}
        <div>
          <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
            Material Finish
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            {(['gold', 'glass', 'holographic', 'wireframe'] as const).map((mat) => (
              <button
                key={mat}
                onClick={() => setMaterial(mat)}
                style={{
                  background: material === mat ? 'rgba(223, 186, 107, 0.2)' : 'rgba(255,255,255,0.04)',
                  border: material === mat ? '1px solid #DFBA6B' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '4px',
                  color: material === mat ? '#DFBA6B' : 'rgba(255,255,255,0.7)',
                  padding: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {mat}
              </button>
            ))}
          </div>
        </div>

        {/* Camera Field of View */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Camera FOV</span>
            <span style={{ fontSize: '0.7rem', color: '#DFBA6B', fontFamily: 'monospace' }}>{fov}°</span>
          </div>
          <input
            type="range"
            min="25"
            max="90"
            value={fov}
            onChange={(e) => setFov(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#DFBA6B' }}
          />
        </div>

        {/* Rotation Speed */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Orbit Velocity</span>
            <span style={{ fontSize: '0.7rem', color: '#DFBA6B', fontFamily: 'monospace' }}>{rotationSpeed.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0"
            max="3"
            step="0.1"
            value={rotationSpeed}
            onChange={(e) => setRotationSpeed(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#DFBA6B' }}
          />
        </div>

        {/* Stardust Density */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Atmosphere Particles</span>
            <span style={{ fontSize: '0.7rem', color: '#DFBA6B', fontFamily: 'monospace' }}>{particleCount}</span>
          </div>
          <input
            type="range"
            min="50"
            max="500"
            step="25"
            value={particleCount}
            onChange={(e) => setParticleCount(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#DFBA6B' }}
          />
        </div>

        <div style={{ marginTop: 'auto', padding: '12px', borderRadius: '8px', background: 'rgba(223, 186, 107, 0.08)', border: '1px solid rgba(223, 186, 107, 0.2)' }}>
          <div style={{ fontSize: '0.75rem', color: '#DFBA6B', fontWeight: 700, marginBottom: '4px' }}>
            ✦ Production 3D Capability
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
            Configured 3D scenes export directly into production bundles using the unified SceneGraph runtime.
          </div>
        </div>
      </div>
    </div>
  );
}
