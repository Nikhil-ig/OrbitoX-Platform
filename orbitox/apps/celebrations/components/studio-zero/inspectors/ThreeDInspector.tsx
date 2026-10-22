'use client';

import React from 'react';
import { Box, RotateCw, Lightbulb, Camera } from 'lucide-react';
import { NodeInspectorProps } from './types';

export function ThreeDInspector({
  selectedNode,
  onUpdateNode,
  onUpdateStyle,
}: NodeInspectorProps) {
  const smartProps = selectedNode.smartProps || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ── 3D MODEL ASSET ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>3D Model Asset (GLB / GLTF)</label>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            type="text"
            placeholder="https://.../model.glb"
            value={smartProps.url || (selectedNode.props as any)?.src || ''}
            onChange={(e) =>
              onUpdateNode(selectedNode.id, {
                smartProps: { ...smartProps, url: e.target.value },
              })
            }
            style={{
              flex: 1,
              background: '#1F2229',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '5px',
              padding: '6px 8px',
              color: '#FFFFFF',
              fontSize: '0.72rem',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* ── 3D CAMERA SETTINGS ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Camera size={13} style={{ color: '#3B82F6' }} />
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Camera FOV</label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="range"
            min="25"
            max="90"
            value={smartProps.fov || 45}
            onChange={(e) =>
              onUpdateNode(selectedNode.id, {
                smartProps: { ...smartProps, fov: parseInt(e.target.value) },
              })
            }
            style={{ flex: 1, accentColor: '#3B82F6' }}
          />
          <span style={{ fontSize: '0.72rem', color: '#FFFFFF', width: '30px', textAlign: 'right' }}>
            {smartProps.fov || 45}°
          </span>
        </div>
      </div>

      {/* ── AUTO-ROTATION ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RotateCw size={13} style={{ color: '#10B981' }} />
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Auto-Rotation Speed</label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="range"
            min="0"
            max="10"
            step="0.5"
            value={smartProps.autoRotateSpeed || 1}
            onChange={(e) =>
              onUpdateNode(selectedNode.id, {
                smartProps: { ...smartProps, autoRotateSpeed: parseFloat(e.target.value) },
              })
            }
            style={{ flex: 1, accentColor: '#10B981' }}
          />
          <span style={{ fontSize: '0.72rem', color: '#FFFFFF', width: '30px', textAlign: 'right' }}>
            {smartProps.autoRotateSpeed || 1}x
          </span>
        </div>
      </div>

      {/* ── LIGHTING ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Lightbulb size={13} style={{ color: '#F59E0B' }} />
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Light Intensity</label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="range"
            min="0.2"
            max="3"
            step="0.1"
            value={smartProps.lightIntensity || 1.2}
            onChange={(e) =>
              onUpdateNode(selectedNode.id, {
                smartProps: { ...smartProps, lightIntensity: parseFloat(e.target.value) },
              })
            }
            style={{ flex: 1, accentColor: '#F59E0B' }}
          />
          <span style={{ fontSize: '0.72rem', color: '#FFFFFF', width: '30px', textAlign: 'right' }}>
            {smartProps.lightIntensity || 1.2}
          </span>
        </div>
      </div>
    </div>
  );
}
