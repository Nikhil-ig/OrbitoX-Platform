'use client';

import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface StudioShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StudioShortcutsModal({ isOpen, onClose }: StudioShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '⌘ / Ctrl + K', desc: 'Open Command Palette' },
    { key: 'Space + Drag', desc: 'Pan infinite canvas' },
    { key: 'F', desc: 'Toggle Fullscreen Canvas' },
    { key: '⌘ / Ctrl + Z', desc: 'Undo' },
    { key: '⇧ + ⌘ / Ctrl + Z', desc: 'Redo' },
    { key: '⌘ / Ctrl + D', desc: 'Duplicate selected layer' },
    { key: 'Backspace / Delete', desc: 'Delete selected layer' },
    { key: 'Arrow Keys', desc: 'Nudge element by 1px (10px with Shift)' },
    { key: 'Escape', desc: 'Deselect element or close active modal' },
    { key: 'Double Click', desc: 'Rename layer inline in Layers tree' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(12px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '460px',
          background: '#16181D',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.8)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Keyboard size={18} style={{ color: '#3B82F6' }} />
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#FFFFFF' }}>
              Keyboard Shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#6B7280',
              cursor: 'pointer',
              padding: '2px',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {shortcuts.map((sc) => (
            <div
              key={sc.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: '6px',
                background: '#1F2229',
              }}
            >
              <span style={{ fontSize: '0.74rem', color: '#D1D5DB' }}>{sc.desc}</span>
              <kbd
                style={{
                  background: '#121317',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '0.68rem',
                  fontFamily: 'monospace',
                  color: '#60A5FA',
                }}
              >
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
