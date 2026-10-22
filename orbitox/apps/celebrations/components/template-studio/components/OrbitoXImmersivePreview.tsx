'use client';

import React, { useState } from 'react';
import { Monitor, Tablet, Smartphone, X, Activity, ExternalLink, ShieldCheck, Sparkles } from 'lucide-react';
import { TemplateSceneDefinition, TemplateDesignTokens, DeviceBreakpoint } from '../types/TemplateSchema';
import { SceneGraphRenderer } from '../../renderer/SceneGraphRenderer';

interface Props {
  scenes: TemplateSceneDefinition[];
  designTokens: TemplateDesignTokens;
  projectName: string;
  resolvedState?: any;
  schema?: any;
  onClose: () => void;
}

export function OrbitoXImmersivePreview({
  scenes,
  designTokens,
  projectName,
  resolvedState,
  schema,
  onClose,
}: Props) {
  const [viewport, setViewport] = useState<DeviceBreakpoint>('desktop');
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);

  const activeScene = scenes[activeSceneIndex] || scenes[0];

  const viewportWidths: Record<DeviceBreakpoint, { width: string; height: string; label: string }> = {
    desktop: { width: '100%', height: '100%', label: '1440px Desktop' },
    tablet: { width: '768px', height: '1024px', label: '768px iPad' },
    mobile: { width: '390px', height: '844px', label: '390px iPhone 15' },
  };

  const currentFrame = viewportWidths[viewport];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: '#040712',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#FFFFFF',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* ── TOP PREVIEW HEADER ── */}
      <header
        style={{
          height: '52px',
          background: 'rgba(9, 13, 26, 0.95)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          zIndex: 110,
        }}
      >
        {/* Left: Project title & Live Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 10px #10B981' }} />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF' }}>{projectName}</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>
            Live Production Preview
          </span>
        </div>

        {/* Center: Device Switcher */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
          }}
        >
          <button
            onClick={() => setViewport('desktop')}
            style={{
              background: viewport === 'desktop' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              border: 'none',
              color: viewport === 'desktop' ? '#DFBA6B' : 'rgba(255, 255, 255, 0.6)',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
            }}
          >
            <Monitor size={14} />
            <span>Desktop</span>
          </button>

          <button
            onClick={() => setViewport('tablet')}
            style={{
              background: viewport === 'tablet' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              border: 'none',
              color: viewport === 'tablet' ? '#DFBA6B' : 'rgba(255, 255, 255, 0.6)',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
            }}
          >
            <Tablet size={14} />
            <span>Tablet</span>
          </button>

          <button
            onClick={() => setViewport('mobile')}
            style={{
              background: viewport === 'mobile' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              border: 'none',
              color: viewport === 'mobile' ? '#DFBA6B' : 'rgba(255, 255, 255, 0.6)',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
            }}
          >
            <Smartphone size={14} />
            <span>Mobile</span>
          </button>
        </div>

        {/* Right: Metrics & Close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#10B981', fontWeight: 600 }}>
            <Activity size={13} />
            <span>60.0 FPS</span>
          </div>

          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)' }} />

          <button
            onClick={onClose}
            aria-label="Close Preview"
            title="Close Preview"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '6px',
              color: '#FFFFFF',
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <X size={14} />
            <span>Close Preview</span>
          </button>
        </div>
      </header>

      {/* ── PREVIEW CANVAS STAGE ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
          background: '#040712',
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          padding: viewport === 'desktop' ? '0' : '40px',
        }}
      >
        <div
          style={{
            width: currentFrame.width,
            height: currentFrame.height,
            maxHeight: viewport === 'desktop' ? '100%' : '844px',
            background: designTokens.colors.backgroundPrimary || '#060814',
            borderRadius: viewport === 'desktop' ? '0' : '24px',
            border: viewport === 'desktop' ? 'none' : '10px solid #1E293B',
            boxShadow: viewport === 'desktop' ? 'none' : '0 25px 70px rgba(0, 0, 0, 0.8)',
            overflowY: 'auto',
            position: 'relative',
          }}
        >
          {activeScene?.sceneGraph && (
            <SceneGraphRenderer
              sceneGraph={activeScene.sceneGraph}
              device={viewport}
              tokens={designTokens}
              isEditorMode={false}
              resolvedState={resolvedState}
              schema={schema}
            />
          )}
        </div>
      </div>
    </div>
  );
}
