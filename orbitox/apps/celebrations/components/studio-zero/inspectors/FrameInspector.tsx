'use client';

import React, { useState } from 'react';
import { Columns, Rows, Link2, Unlink } from 'lucide-react';
import { NodeInspectorProps } from './types';
import { ResponsivePropertyField } from './controls/ResponsivePropertyField';
import { VisualBoxModel } from './controls/VisualBoxModel';
import { CornerRadiusControl } from './CornerRadiusControl';

export function FrameInspector({
  selectedNode,
  activeViewport,
  onUpdateNode,
  onUpdateStyle,
  onResetResponsiveOverride,
}: NodeInspectorProps) {
  const [isRadiusLinked, setIsRadiusLinked] = useState(true);

  const style = selectedNode.style || {};
  const layout = selectedNode.layoutConfig || {};

  const handlePaddingChange = (side: 'top' | 'right' | 'bottom' | 'left', val: string) => {
    const propMap = { top: 'paddingTop', right: 'paddingRight', bottom: 'paddingBottom', left: 'paddingLeft' };
    onUpdateStyle(selectedNode.id, { [propMap[side]]: val });
  };

  const handleMarginChange = (side: 'top' | 'right' | 'bottom' | 'left', val: string) => {
    const propMap = { top: 'marginTop', right: 'marginRight', bottom: 'marginBottom', left: 'marginLeft' };
    onUpdateStyle(selectedNode.id, { [propMap[side]]: val });
  };

  const currentRadiusAll =
    (style as any).borderRadius?.all ||
    (typeof style.border?.radius === 'object'
      ? (style.border.radius as any)?.all || (style.border.radius as any)?.tl
      : (style.border?.radius as string)) ||
    '0px';

  const autoLayout = layout as Partial<import('../../template-studio/engine/SceneGraphTypes').AutoLayoutConfig>;

  const bgColor = style.background?.color;
  const bgColorHex = typeof bgColor === 'string' ? bgColor : (bgColor as any)?.value || '#16181D';

  const borderColor = style.border?.color;
  const borderColorHex = typeof borderColor === 'string' ? borderColor : (borderColor as any)?.value || '#3B82F6';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ── LAYOUT MODE (FLEX / FLOW) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Container Flow</label>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() =>
              onUpdateNode(selectedNode.id, {
                layoutMode: 'flex',
                layoutConfig: { ...(layout || {}), direction: 'horizontal' } as any,
              })
            }
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '6px',
              borderRadius: '5px',
              background: autoLayout.direction === 'horizontal' ? '#3B82F6' : '#1F2229',
              color: autoLayout.direction === 'horizontal' ? '#FFFFFF' : '#9CA3AF',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.72rem',
              cursor: 'pointer',
            }}
          >
            <Columns size={13} />
            <span>Row</span>
          </button>

          <button
            onClick={() =>
              onUpdateNode(selectedNode.id, {
                layoutMode: 'flex',
                layoutConfig: { ...(layout || {}), direction: 'vertical' } as any,
              })
            }
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '6px',
              borderRadius: '5px',
              background: autoLayout.direction === 'vertical' ? '#3B82F6' : '#1F2229',
              color: autoLayout.direction === 'vertical' ? '#FFFFFF' : '#9CA3AF',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.72rem',
              cursor: 'pointer',
            }}
          >
            <Rows size={13} />
            <span>Column</span>
          </button>
        </div>
      </div>

      {/* ── GAP & WRAP ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.66rem', color: '#6B7280' }}>Gap</label>
          <input
            type="text"
            placeholder="e.g. 16px"
            value={style.gap || autoLayout.gap || ''}
            onChange={(e) => onUpdateStyle(selectedNode.id, { gap: e.target.value })}
            style={{
              background: '#1F2229',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '5px',
              padding: '4px 6px',
              color: '#FFFFFF',
              fontSize: '0.7rem',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.66rem', color: '#6B7280' }}>Overflow</label>
          <select
            value={style.overflow || 'visible'}
            onChange={(e) => onUpdateStyle(selectedNode.id, { overflow: e.target.value as any })}
            style={{
              background: '#1F2229',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '5px',
              padding: '4px 6px',
              color: '#FFFFFF',
              fontSize: '0.7rem',
              outline: 'none',
            }}
          >
            <option value="visible">Visible</option>
            <option value="hidden">Hidden (Clip)</option>
            <option value="auto">Auto Scroll</option>
          </select>
        </div>
      </div>

      {/* ── BACKGROUND ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Background Fill</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="color"
            value={bgColorHex.startsWith('#') ? bgColorHex : '#16181D'}
            onChange={(e) =>
              onUpdateStyle(selectedNode.id, {
                background: { ...(style.background || { type: 'solid' as const }), type: 'solid', color: { type: 'solid', value: e.target.value } },
              })
            }
            style={{ width: '28px', height: '28px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: 'transparent' }}
          />
          <input
            type="text"
            value={bgColorHex}
            placeholder="Transparent or color"
            onChange={(e) =>
              onUpdateStyle(selectedNode.id, {
                background: { ...(style.background || { type: 'solid' as const }), type: 'solid', color: { type: 'solid', value: e.target.value } },
              })
            }
            style={{
              flex: 1,
              background: '#1F2229',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '5px',
              padding: '4px 8px',
              color: '#FFFFFF',
              fontSize: '0.72rem',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* ── CORNER RADIUS ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Corner Radius</label>
          <button
            onClick={() => setIsRadiusLinked(!isRadiusLinked)}
            title={isRadiusLinked ? 'Unlink 4 Corners' : 'Link All Corners'}
            style={{ background: 'transparent', border: 'none', color: isRadiusLinked ? '#3B82F6' : '#9CA3AF', cursor: 'pointer', padding: '2px' }}
          >
            {isRadiusLinked ? <Link2 size={13} /> : <Unlink size={13} />}
          </button>
        </div>

        {isRadiusLinked ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="range"
              min="0"
              max="60"
              value={parseInt(currentRadiusAll) || 0}
              onChange={(e) => {
                const v = `${e.target.value}px`;
                onUpdateStyle(selectedNode.id, {
                  border: { ...(style.border || {}), radius: { tl: v, tr: v, br: v, bl: v } },
                });
              }}
              style={{ flex: 1, accentColor: '#3B82F6' }}
            />
            <span style={{ fontSize: '0.72rem', color: '#FFFFFF', width: '35px', textAlign: 'right' }}>
              {currentRadiusAll}
            </span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
            {(['TL', 'TR', 'BR', 'BL'] as const).map((corner) => {
              const cornerKey = corner.toLowerCase() as 'tl' | 'tr' | 'br' | 'bl';
              const curVal =
                typeof style.border?.radius === 'object'
                  ? (style.border.radius as any)[cornerKey] || ''
                  : (style as any).borderRadius?.[cornerKey] || '';

              return (
                <input
                  key={corner}
                  type="text"
                  placeholder={corner}
                  value={curVal}
                  onChange={(e) => {
                    const v = e.target.value;
                    const existing = typeof style.border?.radius === 'object' ? style.border.radius : {};
                    onUpdateStyle(selectedNode.id, {
                      border: { ...(style.border || {}), radius: { tl: '', tr: '', br: '', bl: '', ...existing, [cornerKey]: v } },
                    });
                  }}
                  style={{
                    background: '#1F2229',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '4px',
                    padding: '4px',
                    color: '#FFFFFF',
                    fontSize: '0.68rem',
                    textAlign: 'center',
                    outline: 'none',
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── BORDER STROKE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.66rem', color: '#6B7280' }}>Width</label>
          <input
            type="text"
            placeholder="0px"
            value={style.border?.width || ''}
            onChange={(e) =>
              onUpdateStyle(selectedNode.id, {
                border: { ...(style.border || {}), width: e.target.value },
              })
            }
            style={{
              background: '#1F2229',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '5px',
              padding: '4px 6px',
              color: '#FFFFFF',
              fontSize: '0.7rem',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.66rem', color: '#6B7280' }}>Style</label>
          <select
            value={style.border?.style || 'solid'}
            onChange={(e) =>
              onUpdateStyle(selectedNode.id, {
                border: { ...(style.border || {}), style: e.target.value as any },
              })
            }
            style={{
              background: '#1F2229',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '5px',
              padding: '4px 6px',
              color: '#FFFFFF',
              fontSize: '0.7rem',
              outline: 'none',
            }}
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.66rem', color: '#6B7280' }}>Color</label>
          <input
            type="color"
            value={borderColorHex.startsWith('#') ? borderColorHex : '#3B82F6'}
            onChange={(e) =>
              onUpdateStyle(selectedNode.id, {
                border: { ...(style.border || {}), color: { type: 'solid', value: e.target.value } },
              })
            }
            style={{ width: '100%', height: '24px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: 'transparent' }}
          />
        </div>
      </div>

      {/* ── CORNER RADIUS ── */}
      <CornerRadiusControl
        radius={
          (typeof style.border?.radius === 'object'
            ? (style.border.radius as any)
            : style.border?.radius) || '0px'
        }
        onChangeRadius={(val) => {
          if (typeof val === 'string') {
            onUpdateStyle(selectedNode.id, {
              border: {
                ...(style.border || {}),
                radius: { tl: val, tr: val, br: val, bl: val } as any,
              },
            });
          } else {
            onUpdateStyle(selectedNode.id, {
              border: {
                ...(style.border || {}),
                radius: val as any,
              },
            });
          }
        }}
      />

      {/* ── SPACING & BOX MODEL ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Box Spacing</label>
        <VisualBoxModel
          paddingTop={style.paddingTop}
          paddingRight={style.paddingRight}
          paddingBottom={style.paddingBottom}
          paddingLeft={style.paddingLeft}
          marginTop={style.marginTop}
          marginRight={style.marginRight}
          marginBottom={style.marginBottom}
          marginLeft={style.marginLeft}
          width={selectedNode.geometry?.width || 'auto'}
          height={selectedNode.geometry?.height || 'auto'}
          onPaddingChange={handlePaddingChange}
          onMarginChange={handleMarginChange}
          onUpdateStyle={(patch) => onUpdateStyle(selectedNode.id, patch)}
        />
      </div>
    </div>
  );
}
