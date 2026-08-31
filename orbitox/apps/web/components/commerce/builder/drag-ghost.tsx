'use client';

import React from 'react';
import { useBuilderDnd } from './dnd-context';

export function DragGhost() {
  const { isDragging, dragItem, dragPos } = useBuilderDnd();

  if (!isDragging || !dragItem) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: dragPos.x + 16,
        top: dragPos.y + 16,
        zIndex: 999999,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        borderRadius: '10px',
        background: 'rgba(20, 20, 24, 0.92)',
        border: '1.5px solid #D4AF37',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(212, 175, 55, 0.4)',
        backdropFilter: 'blur(12px)',
        transform: 'scale(1.05) rotate(2deg)',
        transition: 'transform 0.1s ease',
        userSelect: 'none',
      }}
    >
      <span style={{ fontSize: '18px' }}>{dragItem.icon || '📦'}</span>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '12px', fontWeight: 800, color: '#FFF' }}>
          {dragItem.name || 'Component'}
        </span>
        <span style={{ fontSize: '10px', color: '#D4AF37', fontWeight: 600 }}>
          {dragItem.type === 'new-component' ? '✨ Drag to insert into canvas' : '↕ Reordering section'}
        </span>
      </div>
    </div>
  );
}
