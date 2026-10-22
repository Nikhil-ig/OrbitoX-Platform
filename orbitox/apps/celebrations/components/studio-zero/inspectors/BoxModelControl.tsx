'use client';

import React, { useState, useRef } from 'react';
import { Sliders, Link, Unlink } from 'lucide-react';

export type BoxModelMode = 'all' | 'axis' | 'independent';
export type BoxModelUnit = 'px' | '%' | 'rem' | 'auto';

interface BoxModelControlProps {
  paddingTop?: string | number;
  paddingRight?: string | number;
  paddingBottom?: string | number;
  paddingLeft?: string | number;
  marginTop?: string | number;
  marginRight?: string | number;
  marginBottom?: string | number;
  marginLeft?: string | number;
  width?: string | number;
  height?: string | number;
  onChangePadding: (side: 'top' | 'right' | 'bottom' | 'left' | 'all' | 'x' | 'y', val: string) => void;
  onChangeMargin: (side: 'top' | 'right' | 'bottom' | 'left' | 'all' | 'x' | 'y', val: string) => void;
}

export const BoxModelControl: React.FC<BoxModelControlProps> = ({
  paddingTop = '0px',
  paddingRight = '0px',
  paddingBottom = '0px',
  paddingLeft = '0px',
  marginTop = '0px',
  marginRight = '0px',
  marginBottom = '0px',
  marginLeft = '0px',
  width = 'auto',
  height = 'auto',
  onChangePadding,
  onChangeMargin,
}) => {
  const [paddingMode, setPaddingMode] = useState<BoxModelMode>('independent');
  const [marginMode, setMarginMode] = useState<BoxModelMode>('independent');
  const [activeUnit, setActiveUnit] = useState<BoxModelUnit>('px');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Scrubbing state
  const scrubRef = useRef<{
    kind: 'margin' | 'padding';
    side: 'top' | 'right' | 'bottom' | 'left';
    startX: number;
    initialValue: number;
    hasMoved: boolean;
  } | null>(null);

  const parseNum = (val: string | number | undefined): number => {
    if (val === undefined || val === null || val === 'auto') return 0;
    const n = parseFloat(String(val));
    return isNaN(n) ? 0 : n;
  };

  const formatVal = (num: number, unit: BoxModelUnit = activeUnit): string => {
    if (unit === 'auto') return 'auto';
    return `${Math.round(num)}${unit}`;
  };

  const commitValue = (kind: 'margin' | 'padding', side: 'top' | 'right' | 'bottom' | 'left', rawVal: string) => {
    const trimmed = rawVal.trim();
    if (trimmed.toLowerCase() === 'auto') {
      const formatted = 'auto';
      if (kind === 'margin') onChangeMargin(side, formatted);
      else onChangePadding(side, formatted);
      setEditingField(null);
      return;
    }

    const match = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*(px|rem|%|vw|vh|em)?$/i);
    let formatted: string;
    if (match && match[1]) {
      const num = parseFloat(match[1]);
      const unit = (match[2] as BoxModelUnit) || activeUnit;
      formatted = `${num}${unit}`;
    } else {
      const num = parseFloat(trimmed);
      formatted = isNaN(num) ? '0px' : `${num}${activeUnit}`;
    }

    if (kind === 'margin') {
      if (marginMode === 'all') {
        onChangeMargin('all', formatted);
      } else if (marginMode === 'axis') {
        if (side === 'top' || side === 'bottom') {
          onChangeMargin('y', formatted);
        } else {
          onChangeMargin('x', formatted);
        }
      } else {
        onChangeMargin(side, formatted);
      }
    } else {
      if (paddingMode === 'all') {
        onChangePadding('all', formatted);
      } else if (paddingMode === 'axis') {
        if (side === 'top' || side === 'bottom') {
          onChangePadding('y', formatted);
        } else {
          onChangePadding('x', formatted);
        }
      } else {
        onChangePadding(side, formatted);
      }
    }
    setEditingField(null);
  };

  const handlePointerDown = (
    e: React.PointerEvent,
    kind: 'margin' | 'padding',
    side: 'top' | 'right' | 'bottom' | 'left'
  ) => {
    if (editingField) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const initialRaw =
      kind === 'margin'
        ? side === 'top'
          ? marginTop
          : side === 'right'
          ? marginRight
          : side === 'bottom'
          ? marginBottom
          : marginLeft
        : side === 'top'
        ? paddingTop
        : side === 'right'
        ? paddingRight
        : side === 'bottom'
        ? paddingBottom
        : paddingLeft;

    scrubRef.current = {
      kind,
      side,
      startX: e.clientX,
      initialValue: parseNum(initialRaw),
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
    const newVal = Math.max(0, scrubRef.current.initialValue + Math.round(delta / 2) * step);
    const formatted = formatVal(newVal);

    if (scrubRef.current.kind === 'margin') {
      if (marginMode === 'all') {
        onChangeMargin('all', formatted);
      } else if (marginMode === 'axis') {
        if (scrubRef.current.side === 'top' || scrubRef.current.side === 'bottom') {
          onChangeMargin('y', formatted);
        } else {
          onChangeMargin('x', formatted);
        }
      } else {
        onChangeMargin(scrubRef.current.side, formatted);
      }
    } else {
      if (paddingMode === 'all') {
        onChangePadding('all', formatted);
      } else if (paddingMode === 'axis') {
        if (scrubRef.current.side === 'top' || scrubRef.current.side === 'bottom') {
          onChangePadding('y', formatted);
        } else {
          onChangePadding('x', formatted);
        }
      } else {
        onChangePadding(scrubRef.current.side, formatted);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (scrubRef.current) {
      const { kind, side, initialValue, hasMoved } = scrubRef.current;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
      scrubRef.current = null;

      // If user clicked without dragging, immediately activate text input for typing!
      if (!hasMoved) {
        setEditingField(`${kind}-${side}`);
        setEditValue(String(initialValue));
      }
    }
  };

  const renderScrubPill = (
    kind: 'margin' | 'padding',
    side: 'top' | 'right' | 'bottom' | 'left',
    value: string | number | undefined,
    colorStyle: React.CSSProperties
  ) => {
    const num = parseNum(value);
    const fieldKey = `${kind}-${side}`;
    const isEditing = editingField === fieldKey;

    if (isEditing) {
      return (
        <input
          data-testid={`boxmodel-input-${kind}-${side}`}
          autoFocus
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitValue(kind, side, editValue);
            if (e.key === 'Escape') setEditingField(null);
          }}
          onBlur={() => commitValue(kind, side, editValue)}
          style={{
            width: '44px',
            height: '20px',
            fontSize: '10px',
            textAlign: 'center',
            background: '#0E1015',
            color: '#FFFFFF',
            border: '1px solid #3B82F6',
            borderRadius: '4px',
            outline: 'none',
            padding: '0 2px',
            fontFamily: 'monospace',
          }}
        />
      );
    }

    return (
      <div
        data-testid={`boxmodel-pill-${kind}-${side}`}
        onPointerDown={(e) => handlePointerDown(e, kind, side)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={() => {
          setEditingField(fieldKey);
          setEditValue(String(num));
        }}
        style={{
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          fontFamily: 'monospace',
          fontWeight: 600,
          cursor: 'ew-resize',
          userSelect: 'none',
          transition: 'all 0.15s ease',
          ...colorStyle,
        }}
        title={`Click to type, or drag to scrub ${kind} ${side} (Shift for ±10)`}
      >
        {num}
      </div>
    );
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
        alignItems: 'center',
        userSelect: 'none',
        width: '100%',
      }}
    >
      {/* Header with Modes & Unit Selector */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '8px',
          marginBottom: '8px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '11px',
          color: '#9CA3AF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sliders size={13} style={{ color: '#60A5FA' }} />
          <span style={{ fontWeight: 600, color: '#E5E7EB' }}>Box Model</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Unit selector */}
          <div
            style={{
              display: 'flex',
              background: '#0E1015',
              padding: '2px',
              borderRadius: '5px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {(['px', '%', 'rem', 'auto'] as BoxModelUnit[]).map((unit) => (
              <button
                key={unit}
                data-testid={`boxmodel-unit-${unit}`}
                onClick={() => setActiveUnit(unit)}
                style={{
                  padding: '2px 5px',
                  borderRadius: '3px',
                  fontSize: '9px',
                  fontFamily: 'monospace',
                  background: activeUnit === unit ? '#3B82F6' : 'transparent',
                  color: activeUnit === unit ? '#FFFFFF' : '#9CA3AF',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: activeUnit === unit ? 700 : 400,
                }}
              >
                {unit}
              </button>
            ))}
          </div>

          {/* Mode toggle */}
          <button
            data-testid="boxmodel-mode-toggle"
            onClick={() => {
              const nextMode = paddingMode === 'independent' ? 'axis' : paddingMode === 'axis' ? 'all' : 'independent';
              setPaddingMode(nextMode);
              setMarginMode(nextMode);
            }}
            style={{
              padding: '4px',
              borderRadius: '4px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: paddingMode === 'all' ? '#60A5FA' : '#9CA3AF',
            }}
            title={`Mode: ${paddingMode} (Click to toggle)`}
          >
            {paddingMode === 'all' ? <Link size={12} style={{ color: '#60A5FA' }} /> : <Unlink size={12} style={{ color: '#9CA3AF' }} />}
          </button>
        </div>
      </div>

      {/* SVG Concentric Diagram */}
      <div style={{ width: '100%', maxWidth: '270px', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* ── MARGIN (Amber) ── */}
        <div
          style={{
            width: '100%',
            border: '1px dashed rgba(245, 158, 11, 0.45)',
            background: 'rgba(245, 158, 11, 0.05)',
            borderRadius: '8px',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          <span style={{ position: 'absolute', top: '4px', left: '8px', fontSize: '9px', fontWeight: 700, color: 'rgba(245, 158, 11, 0.8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            margin
          </span>

          {/* Margin Top */}
          <div style={{ marginBottom: '4px' }}>
            {renderScrubPill('margin', 'top', marginTop, { background: 'rgba(245, 158, 11, 0.2)', color: '#FCD34D' })}
          </div>

          <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Margin Left */}
            <div>
              {renderScrubPill('margin', 'left', marginLeft, { background: 'rgba(245, 158, 11, 0.2)', color: '#FCD34D' })}
            </div>

            {/* ── PADDING (Cyan) ── */}
            <div
              style={{
                flex: 1,
                margin: '0 6px',
                border: '1px dashed rgba(14, 165, 233, 0.5)',
                background: 'rgba(14, 165, 233, 0.06)',
                borderRadius: '6px',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              <span style={{ position: 'absolute', top: '3px', left: '6px', fontSize: '8px', fontWeight: 700, color: 'rgba(56, 189, 248, 0.8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                padding
              </span>

              {/* Padding Top */}
              <div style={{ marginBottom: '4px' }}>
                {renderScrubPill('padding', 'top', paddingTop, { background: 'rgba(14, 165, 233, 0.2)', color: '#7DD3FC' })}
              </div>

              <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Padding Left */}
                <div>
                  {renderScrubPill('padding', 'left', paddingLeft, { background: 'rgba(14, 165, 233, 0.2)', color: '#7DD3FC' })}
                </div>

                {/* ── CONTENT BOX ── */}
                <div
                  style={{
                    margin: '0 6px',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    background: '#0E1015',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '60px',
                  }}
                >
                  <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#E5E7EB' }}>
                    {parseNum(width) || 'auto'} × {parseNum(height) || 'auto'}
                  </span>
                </div>

                {/* Padding Right */}
                <div>
                  {renderScrubPill('padding', 'right', paddingRight, { background: 'rgba(14, 165, 233, 0.2)', color: '#7DD3FC' })}
                </div>
              </div>

              {/* Padding Bottom */}
              <div style={{ marginTop: '4px' }}>
                {renderScrubPill('padding', 'bottom', paddingBottom, { background: 'rgba(14, 165, 233, 0.2)', color: '#7DD3FC' })}
              </div>
            </div>

            {/* Margin Right */}
            <div>
              {renderScrubPill('margin', 'right', marginRight, { background: 'rgba(245, 158, 11, 0.2)', color: '#FCD34D' })}
            </div>
          </div>

          {/* Margin Bottom */}
          <div style={{ marginTop: '4px' }}>
            {renderScrubPill('margin', 'bottom', marginBottom, { background: 'rgba(245, 158, 11, 0.2)', color: '#FCD34D' })}
          </div>
        </div>
      </div>
    </div>
  );
};
