'use client';

import React, { useState, useRef } from 'react';
import { Square, Link, Unlink } from 'lucide-react';

interface CornerRadiusValues {
  tl: number;
  tr: number;
  br: number;
  bl: number;
}

interface CornerRadiusControlProps {
  radius?: string | number | { tl: string | number; tr: string | number; br: string | number; bl: string | number };
  onChangeRadius: (val: string | { tl: string; tr: string; br: string; bl: string }) => void;
}

export const CornerRadiusControl: React.FC<CornerRadiusControlProps> = ({
  radius = '0px',
  onChangeRadius,
}) => {
  const [isLinked, setIsLinked] = useState<boolean>(true);
  const [editingCorner, setEditingCorner] = useState<'tl' | 'tr' | 'br' | 'bl' | 'all' | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Parse radius into 4 corner numbers
  const parseCorners = (): CornerRadiusValues => {
    if (typeof radius === 'object' && radius !== null) {
      return {
        tl: parseFloat(String(radius.tl || 0)) || 0,
        tr: parseFloat(String(radius.tr || 0)) || 0,
        br: parseFloat(String(radius.br || 0)) || 0,
        bl: parseFloat(String(radius.bl || 0)) || 0,
      };
    }
    const val = parseFloat(String(radius || 0)) || 0;
    return { tl: val, tr: val, br: val, bl: val };
  };

  const corners = parseCorners();

  // Scrubbing state
  const scrubRef = useRef<{
    corner: 'tl' | 'tr' | 'br' | 'bl' | 'all';
    startX: number;
    initialVal: number;
    hasMoved: boolean;
  } | null>(null);

  const commitCornerValue = (target: 'tl' | 'tr' | 'br' | 'bl' | 'all', rawVal: string) => {
    const num = Math.max(0, parseFloat(rawVal) || 0);
    if (target === 'all' || isLinked) {
      onChangeRadius(`${num}px`);
    } else {
      onChangeRadius({
        tl: `${target === 'tl' ? num : corners.tl}px`,
        tr: `${target === 'tr' ? num : corners.tr}px`,
        br: `${target === 'br' ? num : corners.br}px`,
        bl: `${target === 'bl' ? num : corners.bl}px`,
      });
    }
    setEditingCorner(null);
  };

  const handlePointerDown = (
    e: React.PointerEvent,
    corner: 'tl' | 'tr' | 'br' | 'bl' | 'all'
  ) => {
    if (editingCorner) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const initialVal = isLinked ? corners.tl : corners[corner === 'all' ? 'tl' : corner];
    scrubRef.current = {
      corner: isLinked ? 'all' : corner,
      startX: e.clientX,
      initialVal,
      hasMoved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!scrubRef.current) return;
    const delta = e.clientX - scrubRef.current.startX;
    if (Math.abs(delta) > 2) {
      scrubRef.current.hasMoved = true;
    }
    const step = e.shiftKey ? 10 : 1;
    const newVal = Math.max(0, scrubRef.current.initialVal + Math.round(delta / 2) * step);

    if (scrubRef.current.corner === 'all' || isLinked) {
      onChangeRadius(`${newVal}px`);
    } else {
      const c = scrubRef.current.corner;
      onChangeRadius({
        tl: `${c === 'tl' ? newVal : corners.tl}px`,
        tr: `${c === 'tr' ? newVal : corners.tr}px`,
        br: `${c === 'br' ? newVal : corners.br}px`,
        bl: `${c === 'bl' ? newVal : corners.bl}px`,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (scrubRef.current) {
      const { corner, initialVal, hasMoved } = scrubRef.current;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
      scrubRef.current = null;

      // Single click without dragging opens direct numeric input
      if (!hasMoved) {
        setEditingCorner(corner);
        setEditValue(String(initialVal));
      }
    }
  };

  const applyPreset = (px: number) => {
    setIsLinked(true);
    onChangeRadius(`${px}px`);
  };

  const applyShapePreset = (tl: number, tr: number, br: number, bl: number) => {
    setIsLinked(false);
    onChangeRadius({
      tl: `${tl}px`,
      tr: `${tr}px`,
      br: `${br}px`,
      bl: `${bl}px`,
    });
  };

  return (
    <div
      style={{
        background: '#16181D',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '10px',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        width: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '8px',
          marginBottom: '8px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '11px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#E5E7EB' }}>
          <Square size={13} style={{ color: '#34D399' }} />
          <span style={{ fontWeight: 600 }}>Corner Radius</span>
        </div>

        <button
          data-testid="radius-link-toggle"
          onClick={() => setIsLinked((prev) => !prev)}
          style={{
            padding: '3px 6px',
            borderRadius: '4px',
            background: isLinked ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            border: `1px solid ${isLinked ? '#3B82F6' : 'rgba(255, 255, 255, 0.1)'}`,
            color: isLinked ? '#60A5FA' : '#9CA3AF',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '10px',
          }}
          title={isLinked ? 'Corners Linked (Uniform)' : 'Independent Corners'}
        >
          {isLinked ? <Link size={11} /> : <Unlink size={11} />}
          <span>{isLinked ? 'Linked' : 'Custom'}</span>
        </button>
      </div>

      {/* Quick Presets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginBottom: '8px' }}>
        {[
          { label: '0', val: 0, title: 'Sharp (0px)' },
          { label: '4', val: 4, title: 'Subtle (4px)' },
          { label: '8', val: 8, title: 'Medium (8px)' },
          { label: '16', val: 16, title: 'Card (16px)' },
          { label: 'Pill', val: 9999, title: 'Full Pill' },
        ].map((preset) => {
          const isSelected = isLinked && corners.tl === preset.val;
          return (
            <button
              key={preset.label}
              data-testid={`radius-preset-${preset.label.toLowerCase()}`}
              onClick={() => applyPreset(preset.val)}
              style={{
                padding: '4px 0',
                fontSize: '10px',
                fontFamily: 'monospace',
                borderRadius: '4px',
                border: isSelected ? '1px solid #10B981' : '1px solid rgba(255, 255, 255, 0.08)',
                background: isSelected ? 'rgba(16, 185, 129, 0.2)' : '#0E1015',
                color: isSelected ? '#34D399' : '#9CA3AF',
                cursor: 'pointer',
                fontWeight: isSelected ? 700 : 400,
              }}
              title={preset.title}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Asymmetric Shape Presets */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
        {[
          { label: 'Top Arch', tl: 24, tr: 24, br: 0, bl: 0 },
          { label: 'Leaf', tl: 24, tr: 0, br: 24, bl: 0 },
          { label: 'Tab', tl: 8, tr: 8, br: 0, bl: 0 },
        ].map((sp) => (
          <button
            key={sp.label}
            onClick={() => applyShapePreset(sp.tl, sp.tr, sp.br, sp.bl)}
            style={{
              flex: 1,
              padding: '3px 0',
              fontSize: '9px',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: '#0E1015',
              color: '#9CA3AF',
              cursor: 'pointer',
            }}
          >
            {sp.label}
          </button>
        ))}
      </div>

      {/* Visual Interactive Rectangle */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '84px',
          background: '#0E1015',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px',
        }}
      >
        {/* Preview shape */}
        <div
          data-testid="radius-preview"
          style={{
            borderTopLeftRadius: `${Math.min(corners.tl, 36)}px`,
            borderTopRightRadius: `${Math.min(corners.tr, 36)}px`,
            borderBottomRightRadius: `${Math.min(corners.br, 36)}px`,
            borderBottomLeftRadius: `${Math.min(corners.bl, 36)}px`,
            width: '100%',
            height: '100%',
            background: 'rgba(52, 211, 153, 0.08)',
            border: '1px solid rgba(52, 211, 153, 0.4)',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgba(52, 211, 153, 0.9)' }}>
            {isLinked ? `${corners.tl}px` : `${corners.tl} · ${corners.tr} · ${corners.br} · ${corners.bl}`}
          </span>
        </div>

        {/* 4 Interactive Corner Scrubbers */}
        {(['tl', 'tr', 'br', 'bl'] as const).map((c) => {
          const isTop = c === 'tl' || c === 'tr';
          const isLeft = c === 'tl' || c === 'bl';
          const isEditing = editingCorner === c;

          if (isEditing) {
            return (
              <input
                key={c}
                data-testid={`radius-input-${c}`}
                autoFocus
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitCornerValue(c, editValue);
                  if (e.key === 'Escape') setEditingCorner(null);
                }}
                onBlur={() => commitCornerValue(c, editValue)}
                style={{
                  position: 'absolute',
                  top: isTop ? '4px' : undefined,
                  bottom: !isTop ? '4px' : undefined,
                  left: isLeft ? '4px' : undefined,
                  right: !isLeft ? '4px' : undefined,
                  width: '36px',
                  height: '18px',
                  fontSize: '9px',
                  textAlign: 'center',
                  background: '#0E1015',
                  color: '#34D399',
                  border: '1px solid #10B981',
                  borderRadius: '3px',
                  outline: 'none',
                  padding: '0',
                  fontFamily: 'monospace',
                  zIndex: 10,
                }}
              />
            );
          }

          return (
            <div
              key={c}
              data-testid={`radius-scrub-${c}`}
              onPointerDown={(e) => handlePointerDown(e, c)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onDoubleClick={() => {
                setEditingCorner(c);
                setEditValue(String(corners[c]));
              }}
              style={{
                position: 'absolute',
                top: isTop ? '4px' : undefined,
                bottom: !isTop ? '4px' : undefined,
                left: isLeft ? '4px' : undefined,
                right: !isLeft ? '4px' : undefined,
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '9px',
                fontFamily: 'monospace',
                fontWeight: 600,
                cursor: 'ew-resize',
                userSelect: 'none',
                background: '#16181D',
                border: '1px solid rgba(52, 211, 153, 0.4)',
                color: '#34D399',
                boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                zIndex: 5,
              }}
              title={`Click to type, or drag to scrub ${c.toUpperCase()} corner radius`}
            >
              {corners[c]}
            </div>
          );
        })}
      </div>
    </div>
  );
};
