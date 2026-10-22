'use client';

import React, { useState } from 'react';
import {
  Box,
  Layers,
  Sparkles,
  Sun,
  Eye,
  Sliders,
  RotateCw,
  Maximize2,
  Check,
  Plus,
} from 'lucide-react';
import { ThreeDWorkspaceWebGL } from './workspaces/ThreeDWorkspaceWebGL';

interface ThreeDWorkspaceProps {
  sceneName: string;
  onInsertToCanvas?: () => void;
}

export function ThreeDWorkspace({
  sceneName,
  onInsertToCanvas,
}: ThreeDWorkspaceProps) {
  const [objectType, setObjectType] = useState<'torus' | 'cube' | 'sphere' | 'particles'>('torus');
  const [environment, setEnvironment] = useState<'studio' | 'nebula' | 'sunset' | 'cyber'>('studio');
  const [roughness, setRoughness] = useState(0.2);
  const [metalness, setMetalness] = useState(0.85);
  const [rotationSpeed, setRotationSpeed] = useState(0.015);
  const [isRotating, setIsRotating] = useState(true);

  return (
    <div
      id="sz-3d-workspace"
      style={{
        flex: 1,
        display: 'flex',
        background: '#0C0D10',
        color: '#F3F4F6',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* ── 3D VIEWPORT CANVAS (Three.js WebGL) ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: '24px',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            maxWidth: '860px',
            maxHeight: '620px',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 25px 70px rgba(0, 0, 0, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background:
              environment === 'nebula'
                ? 'radial-gradient(circle at center, rgba(76, 29, 149, 0.35) 0%, #060B1A 100%)'
                : environment === 'cyber'
                ? 'radial-gradient(circle at center, rgba(14, 165, 233, 0.25) 0%, #080C14 100%)'
                : environment === 'sunset'
                ? 'radial-gradient(circle at center, rgba(245, 158, 11, 0.2) 0%, #110D0A 100%)'
                : 'radial-gradient(circle at center, rgba(59, 130, 246, 0.15) 0%, #0A0D14 100%)',
          }}
        >
          <ThreeDWorkspaceWebGL
            objectType={objectType}
            environment={environment}
            roughness={roughness}
            metalness={metalness}
            rotationSpeed={rotationSpeed}
            isRotating={isRotating}
          />
        </div>

        {/* Floating Viewport Status Pill */}
        <div
          style={{
            position: 'absolute',
            bottom: '36px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(22, 24, 29, 0.88)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '9999px',
            padding: '8px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            fontSize: '0.75rem',
            color: '#9CA3AF',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
            <span>WebGL 2.0 (Three.js)</span>
          </span>
          <span>•</span>
          <span>Object: <strong style={{ color: '#FFFFFF' }}>{objectType.toUpperCase()}</strong></span>
          <span>•</span>
          <span>Env: <strong style={{ color: '#60A5FA' }}>{environment.toUpperCase()}</strong></span>
          {onInsertToCanvas && (
            <button
              onClick={onInsertToCanvas}
              style={{
                background: '#2563EB',
                border: 'none',
                borderRadius: '9999px',
                padding: '4px 14px',
                color: '#FFFFFF',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Plus size={12} />
              <span>Send to Canvas Hero</span>
            </button>
          )}
        </div>
      </div>

      {/* ── RIGHT 3D PROPERTIES PANEL ── */}
      <div
        style={{
          width: '280px',
          background: '#16181D',
          borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Box size={16} style={{ color: '#3B82F6' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF' }}>3D Scene Studio</span>
        </div>

        {/* Geometry Primitive */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>3D Object Mesh</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
            {(['torus', 'cube', 'sphere', 'particles'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setObjectType(type)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: objectType === type ? '1px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: objectType === type ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: objectType === type ? '#60A5FA' : '#9CA3AF',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  textAlign: 'center',
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Lighting Environment */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>HDRI Environment</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
            {(['studio', 'nebula', 'sunset', 'cyber'] as const).map((env) => (
              <button
                key={env}
                onClick={() => setEnvironment(env)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: environment === env ? '1px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: environment === env ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: environment === env ? '#60A5FA' : '#9CA3AF',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  textAlign: 'center',
                }}
              >
                {env}
              </button>
            ))}
          </div>
        </div>

        {/* Sliders: Roughness & Metalness */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#9CA3AF' }}>
              <span>Roughness</span>
              <span style={{ color: '#FFFFFF' }}>{Math.round(roughness * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={roughness}
              onChange={(e) => setRoughness(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#3B82F6', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#9CA3AF' }}>
              <span>Metalness</span>
              <span style={{ color: '#FFFFFF' }}>{Math.round(metalness * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={metalness}
              onChange={(e) => setMetalness(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#3B82F6', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#9CA3AF' }}>
              <span>Rotation Speed</span>
              <span style={{ color: '#FFFFFF' }}>{(rotationSpeed * 100).toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={0.05}
              step={0.005}
              value={rotationSpeed}
              onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#3B82F6', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Toggle Auto Rotation */}
        <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <button
            onClick={() => setIsRotating(!isRotating)}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: isRotating ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              color: isRotating ? '#60A5FA' : '#9CA3AF',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <RotateCw size={14} style={{ animation: isRotating ? 'spin 4s linear infinite' : 'none' }} />
            <span>{isRotating ? 'Pause Auto-Spin' : 'Resume Auto-Spin'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
