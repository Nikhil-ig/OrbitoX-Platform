'use client';

import React from 'react';

interface CanvasOverlayProps {
  showGuides?: boolean;
  guides?: Array<{ type: 'horizontal' | 'vertical'; position: number }>;
}

export function CanvasOverlay({
  showGuides = false,
  guides = [],
}: CanvasOverlayProps) {
  if (!showGuides || guides.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 25,
      }}
    >
      {guides.map((guide, idx) => (
        <div
          key={idx}
          style={{
            position: 'absolute',
            background: '#3B82F6',
            boxShadow: '0 0 4px rgba(59, 130, 246, 0.8)',
            ...(guide.type === 'horizontal'
              ? { left: 0, right: 0, top: `${guide.position}px`, height: '1px' }
              : { top: 0, bottom: 0, left: `${guide.position}px`, width: '1px' }),
          }}
        />
      ))}
    </div>
  );
}
