'use client';

import React from 'react';
import {
  Type,
  Square,
  Image as ImageIcon,
  Copy,
  Trash2,
  Lock,
  Unlock,
  Wand2,
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Columns,
  Grid,
} from 'lucide-react';
import { SceneGraphNode } from '@/components/template-studio/engine/SceneGraphTypes';

interface SelectionToolbarProps {
  selectedNode: SceneGraphNode | null;
  onUpdateStyle: (patch: any) => void;
  onUpdateGeometry: (patch: any) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onOpenRemix?: () => void;
  onOpenAi?: () => void;
}

export function SelectionToolbar({
  selectedNode,
  onUpdateStyle,
  onUpdateGeometry,
  onDuplicate,
  onDelete,
  onOpenRemix,
  onOpenAi,
}: SelectionToolbarProps) {
  if (!selectedNode) return null;

  const isText = selectedNode.kind === 'text';
  const isImage = selectedNode.kind === 'image';
  const isFrame = selectedNode.kind === 'frame' || selectedNode.kind === 'stack';

  const typo = (selectedNode.style?.typography || {}) as any;

  return (
    <div
      id="sz-floating-selection-toolbar"
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 45,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        background: 'rgba(22, 24, 29, 0.95)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '9999px',
        padding: '5px 10px',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.05)',
        userSelect: 'none',
        color: '#F3F4F6',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      {/* Node Kind Badge */}
      <span
        style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          color: '#60A5FA',
          background: 'rgba(59, 130, 246, 0.15)',
          padding: '2px 8px',
          borderRadius: '9999px',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {selectedNode.kind}
      </span>

      <div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.1)' }} />

      {/* TEXT SPECIFIC CONTROLS */}
      {isText && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            onClick={() =>
              onUpdateStyle({
                typography: { ...typo, fontWeight: typo.fontWeight === '700' ? '400' : '700' },
              })
            }
            title="Bold"
            style={{
              background: typo.fontWeight === '700' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              padding: '4px',
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <Bold size={13} />
          </button>
          <button
            onClick={() =>
              onUpdateStyle({
                typography: { ...typo, textAlign: 'left' },
              })
            }
            title="Align Left"
            style={{
              background: typo.textAlign === 'left' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              padding: '4px',
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <AlignLeft size={13} />
          </button>
          <button
            onClick={() =>
              onUpdateStyle({
                typography: { ...typo, textAlign: 'center' },
              })
            }
            title="Align Center"
            style={{
              background: typo.textAlign === 'center' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              padding: '4px',
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <AlignCenter size={13} />
          </button>
        </div>
      )}

      {/* FRAME SPECIFIC CONTROLS */}
      {isFrame && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            onClick={() =>
              onUpdateGeometry({
                padding: '24px',
              })
            }
            title="Standard Padding"
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 6px',
              fontSize: '0.68rem',
              color: '#D1D5DB',
              cursor: 'pointer',
            }}
          >
            Pad 24
          </button>
        </div>
      )}

      {/* QUICK ACTIONS */}
      <button
        onClick={() => {
          if (isText) {
            onUpdateStyle({
              typography: {
                ...typo,
                letterSpacing: '0.04em',
                lineHeight: '1.25',
              },
              color: { type: 'token', tokenPath: 'colors.textPrimary' },
            });
          } else {
            onUpdateStyle({
              borderRadius: { all: '12px' },
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 0 15px rgba(59, 130, 246, 0.2)',
              border: { width: '1px', style: 'solid', color: { type: 'token', tokenPath: 'colors.borderSubtle' } },
            });
          }
        }}
        id="sz-quick-beautiful-btn"
        title="Apply instant visual polish & tokens"
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '4px',
          padding: '3px 8px',
          color: '#93C5FD',
          fontSize: '0.68rem',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <Sparkles size={11} />
        <span>Make Beautiful</span>
      </button>

      {/* QUICK REMIX BUTTON */}
      {onOpenRemix && (
        <button
          onClick={onOpenRemix}
          title="Remix Style"
          style={{
            background: 'rgba(59, 130, 246, 0.12)',
            border: 'none',
            borderRadius: '4px',
            padding: '3px 8px',
            color: '#60A5FA',
            fontSize: '0.68rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Wand2 size={11} />
          <span>Remix</span>
        </button>
      )}

      {/* QUICK ASK AI BUTTON */}
      {onOpenAi && (
        <button
          onClick={onOpenAi}
          title="Ask AI"
          style={{
            background: 'rgba(168, 85, 247, 0.15)',
            border: 'none',
            borderRadius: '4px',
            padding: '3px 8px',
            color: '#C084FC',
            fontSize: '0.68rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Sparkles size={11} />
          <span>AI</span>
        </button>
      )}

      <div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.1)' }} />

      {/* DUPLICATE & DELETE */}
      <button
        onClick={onDuplicate}
        title="Duplicate (⌘D)"
        style={{
          background: 'transparent',
          border: 'none',
          borderRadius: '4px',
          padding: '4px',
          color: '#9CA3AF',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#9CA3AF')}
      >
        <Copy size={13} />
      </button>

      <button
        onClick={onDelete}
        title="Delete (Del)"
        style={{
          background: 'transparent',
          border: 'none',
          borderRadius: '4px',
          padding: '4px',
          color: '#EF4444',
          cursor: 'pointer',
        }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
