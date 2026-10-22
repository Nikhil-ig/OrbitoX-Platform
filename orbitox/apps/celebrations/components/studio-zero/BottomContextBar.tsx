'use client';

import React from 'react';
import {
  Maximize2,
  Minimize2,
  Keyboard,
  ChevronRight,
  Monitor,
} from 'lucide-react';
import { DeviceBreakpoint } from '@/components/template-studio/types/TemplateSchema';

interface BottomContextBarProps {
  sceneName: string;
  selectedNodeName?: string | null;
  viewport: DeviceBreakpoint;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onResetFit: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenShortcuts: () => void;
  onOpenPerformance?: () => void;
  performanceScore?: number;
}

export function BottomContextBar({
  sceneName,
  selectedNodeName,
  viewport,
  zoom,
  onZoomChange,
  onResetFit,
  isFullscreen,
  onToggleFullscreen,
  onOpenShortcuts,
  onOpenPerformance,
  performanceScore = 98,
}: BottomContextBarProps) {
  const dimensions =
    viewport === 'desktop' ? '1440 × 900' : viewport === 'tablet' ? '768 × 1024' : '390 × 844';

  return (
    <footer
      id="sz-bottom-bar"
      style={{
        height: '32px',
        background: '#121317',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        color: '#9CA3AF',
        fontSize: '0.72rem',
        userSelect: 'none',
        zIndex: 30,
      }}
    >
      {/* ── LEFT: BREADCRUMBS ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ color: '#D1D5DB' }}>Page</span>
        <ChevronRight size={11} style={{ color: '#4B5563' }} />
        <span style={{ color: '#D1D5DB', fontWeight: 500 }}>{sceneName}</span>
        {selectedNodeName && (
          <>
            <ChevronRight size={11} style={{ color: '#4B5563' }} />
            <span style={{ color: '#60A5FA', fontWeight: 600 }}>{selectedNodeName}</span>
          </>
        )}
      </div>

      {/* ── CENTER: VIEWPORT DIMENSIONS & HEALTH STATUS ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'monospace', fontSize: '0.7rem' }}>
        <span>Viewport: {dimensions} px</span>
        <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
        <button
          onClick={onOpenPerformance}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#10B981',
            cursor: 'pointer',
            padding: 0,
            fontSize: '0.68rem',
            fontFamily: 'monospace',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
          title="Click to view Project Performance Audit"
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
          <span>Edge CDN Synced • {performanceScore}% Health</span>
        </button>
      </div>

      {/* ── RIGHT: ZOOM & FULLSCREEN & SHORTCUTS ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => onZoomChange(Math.max(0.25, zoom - 0.1))}
            style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '0 3px' }}
          >
            -
          </button>
          <button
            onClick={onResetFit}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#F3F4F6',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => onZoomChange(Math.min(2.5, zoom + 0.1))}
            style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '0 3px' }}
          >
            +
          </button>
        </div>

        <div style={{ width: '1px', height: '12px', background: 'rgba(255, 255, 255, 0.1)' }} />

        {/* Fullscreen Button */}
        <button
          onClick={onToggleFullscreen}
          title="Fullscreen Canvas (F)"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#9CA3AF',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          <span>{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
        </button>

        {/* Shortcuts */}
        <button
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts (⌘/)"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#9CA3AF',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
          }}
        >
          <Keyboard size={12} />
          <span>Shortcuts</span>
        </button>
      </div>
    </footer>
  );
}
