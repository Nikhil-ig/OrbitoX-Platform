'use client';

import React, { useState } from 'react';
import { Eye, Layers, Move, Sparkles, Check, Sliders } from 'lucide-react';

export interface ParallaxLayer {
  id: string;
  name: string;
  depth: number; // 0.10x to 1.20x
  elementCount: number;
  previewColor: string;
  description: string;
}

interface Props {
  onUpdateDepth?: (layerId: string, depth: number) => void;
}

export function OrbitoXParallaxStudio({ onUpdateDepth }: Props) {
  const [layers, setLayers] = useState<ParallaxLayer[]>([
    { id: 'bg', name: 'Background (Nebula & Deep Void)', depth: 0.1, elementCount: 3, previewColor: '#1E1742', description: 'Slowest drift, cosmic backplane' },
    { id: 'atmosphere', name: 'Atmosphere (Stardust & Floating Shimmer)', depth: 0.25, elementCount: 2, previewColor: '#3B82F6', description: 'Soft particle drift and light rays' },
    { id: 'midground', name: 'Midground (Secondary Cards & Constellations)', depth: 0.5, elementCount: 4, previewColor: '#8B5CF6', description: 'Spatial card planes & decorative motifs' },
    { id: 'subject', name: 'Subject (Hero Typography & Core Media)', depth: 0.75, elementCount: 3, previewColor: '#DFBA6B', description: 'Primary focal elements and imagery' },
    { id: 'foreground', name: 'Foreground (Interactive Glass Badges)', depth: 1.1, elementCount: 2, previewColor: '#EC4899', description: 'Fast responsive floating badges' },
    { id: 'ui', name: 'UI Layer (Pinned Navigation & Sticky Dock)', depth: 1.0, elementCount: 1, previewColor: '#FFFFFF', description: 'Fixed viewport coordinate plane' },
  ]);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isSimulating, setIsSimulating] = useState(true);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSimulating) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  const updateDepth = (id: string, newDepth: number) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, depth: Math.round(newDepth * 100) / 100 } : l))
    );
    onUpdateDepth?.(id, newDepth);
  };

  return (
    <div style={{ padding: '20px', color: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <Layers size={18} style={{ color: '#DFBA6B' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Cinematic Parallax Studio</h3>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.4 }}>
          Orchestrate multi-plane depth coefficients. Elements in each layer drift organically with scroll velocity and mouse inertia.
        </p>
      </div>

      {/* ── INTERACTIVE 3D DEPTH SIMULATOR ── */}
      <div
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setMousePos({ x: 0, y: 0 })}
        style={{
          height: '220px',
          borderRadius: '12px',
          background: 'radial-gradient(circle at center, #11172E 0%, #060814 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: '600px',
          cursor: 'crosshair',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '12px',
            fontSize: '0.68rem',
            color: 'rgba(255,255,255,0.4)',
            zIndex: 10,
          }}
        >
          Interactive Depth Stage (Move pointer to test spatial parallax)
        </div>

        {/* Render simulated floating planes */}
        {layers.map((layer, idx) => {
          const offsetX = mousePos.x * layer.depth * 80;
          const offsetY = mousePos.y * layer.depth * 50;

          return (
            <div
              key={layer.id}
              style={{
                position: 'absolute',
                width: `${160 + idx * 24}px`,
                height: `${70 + idx * 12}px`,
                borderRadius: '8px',
                border: `1px solid ${layer.previewColor}`,
                background: `${layer.previewColor}18`,
                boxShadow: `0 0 20px ${layer.previewColor}22`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: `translate3d(${offsetX}px, ${offsetY}px, ${idx * 20}px)`,
                transition: 'transform 0.1s ease-out',
                pointerEvents: 'none',
              }}
            >
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: layer.previewColor }}>
                {layer.name.split(' ')[0]} ({layer.depth.toFixed(2)}x)
              </span>
            </div>
          );
        })}
      </div>

      {/* ── DEPTH COEFFICIENTS LIST ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Layer Depth Coefficients
        </span>

        {layers.map((layer) => (
          <div
            key={layer.id}
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: layer.previewColor }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#FFFFFF' }}>{layer.name}</span>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#DFBA6B', fontFamily: 'monospace' }}>
                {layer.depth.toFixed(2)}x
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="range"
                min="0.05"
                max="1.5"
                step="0.05"
                value={layer.depth}
                onChange={(e) => updateDepth(layer.id, Number(e.target.value))}
                style={{ flex: 1, accentColor: '#DFBA6B' }}
              />
              <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', width: '60px', textAlign: 'right' }}>
                {layer.elementCount} elements
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
