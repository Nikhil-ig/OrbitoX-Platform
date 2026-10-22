'use client';

import React, { useState } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  X,
  ExternalLink,
} from 'lucide-react';
import { TemplateSceneDefinition, TemplateDesignTokens, DeviceBreakpoint } from '@/components/template-studio/types/TemplateSchema';
import { SceneGraphRenderer } from '@/components/renderer/SceneGraphRenderer';
import { bindDataToGraph } from '@/components/template-studio/engine/GraphDataBinder';

interface StudioPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: TemplateSceneDefinition[];
  designTokens: TemplateDesignTokens;
  projectName: string;
  resolvedState?: any;
  schema?: any;
}

export function StudioPreviewModal({
  isOpen,
  onClose,
  scenes,
  designTokens,
  projectName,
  resolvedState,
  schema,
}: StudioPreviewModalProps) {
  const [device, setDevice] = useState<DeviceBreakpoint>('desktop');

  if (!isOpen) return null;

  const deviceWidths: Record<DeviceBreakpoint, { width: number; height: string }> = {
    desktop: { width: 1200, height: '90vh' },
    tablet: { width: 768, height: '90vh' },
    mobile: { width: 390, height: '844px' },
  };

  const currentDev = deviceWidths[device] || deviceWidths.desktop;

  return (
    <div
      id="sz-preview-modal"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 7, 10, 0.92)',
        backdropFilter: 'blur(16px)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
      }}
    >
      {/* ── PREVIEW HEADER BAR ── */}
      <div
        style={{
          height: '48px',
          background: '#121317',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF' }}>{projectName}</span>
          <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>• Live Preview Mode</span>
        </div>

        {/* Device Switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#1A1C22',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '6px',
            padding: '2px',
          }}
        >
          <button
            onClick={() => setDevice('desktop')}
            style={{
              background: device === 'desktop' ? '#2563EB' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem',
            }}
          >
            <Monitor size={13} />
            <span>Desktop</span>
          </button>
          <button
            onClick={() => setDevice('tablet')}
            style={{
              background: device === 'tablet' ? '#2563EB' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem',
            }}
          >
            <Tablet size={13} />
            <span>Tablet</span>
          </button>
          <button
            onClick={() => setDevice('mobile')}
            style={{
              background: device === 'mobile' ? '#2563EB' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem',
            }}
          >
            <Smartphone size={13} />
            <span>Mobile</span>
          </button>
        </div>

        {/* Close Button */}
        <button
          id="sz-preview-close-btn"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#9CA3AF',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* ── PREVIEW CANVAS AREA ── */}
      <div
        className="sz-custom-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '24px 0',
          background: '#0B0C0E',
        }}
      >
        <div
          style={{
            width: `${currentDev.width}px`,
            minHeight: '800px',
            background: designTokens.colors?.backgroundPrimary || '#0B0F19',
            boxShadow: '0 25px 80px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            borderRadius: device === 'mobile' ? '36px' : device === 'tablet' ? '20px' : '8px',
            overflow: 'hidden',
          }}
        >
          {scenes.map((scene) => (
            <div key={scene.id} style={{ position: 'relative' }}>
              {scene.sceneGraph && (
                <SceneGraphRenderer
                  sceneGraph={resolvedState ? bindDataToGraph(scene.sceneGraph, resolvedState) : scene.sceneGraph}
                  device={device}
                  tokens={designTokens}
                  isEditorMode={false}
                  resolvedState={resolvedState}
                  schema={schema}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
