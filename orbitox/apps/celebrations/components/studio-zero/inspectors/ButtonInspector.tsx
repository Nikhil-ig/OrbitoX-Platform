'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { NodeInspectorProps } from './types';
import { VisualBoxModel } from './controls/VisualBoxModel';
import { CornerRadiusControl } from './CornerRadiusControl';

export function ButtonInspector({
  selectedNode,
  onUpdateNode,
  onUpdateStyle,
}: NodeInspectorProps) {
  const style = selectedNode.style || {};
  const typo = style.typography || {};

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

  const bgColor = style.background?.color;
  const bgColorHex = typeof bgColor === 'string' ? bgColor : (bgColor as any)?.value || '#3B82F6';

  const typoColor = typo.color;
  const typoColorHex = typeof typoColor === 'string' ? typoColor : (typoColor as any)?.value || '#FFFFFF';

  const targetLink = selectedNode.smartProps?.href || (selectedNode.interactions?.[0]?.onClick as any)?.url || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ── BUTTON LABEL ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Button Label</label>
        <input
          type="text"
          value={selectedNode.textContent || ''}
          placeholder="Button Text"
          onChange={(e) =>
            onUpdateNode(selectedNode.id, {
              textContent: e.target.value,
            })
          }
          style={{
            background: '#1F2229',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '5px',
            padding: '6px 8px',
            color: '#FFFFFF',
            fontSize: '0.74rem',
            outline: 'none',
          }}
        />
      </div>

      {/* ── TARGET LINK URL ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Target Link</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="text"
            placeholder="https://... or #section-id"
            value={targetLink}
            onChange={(e) =>
              onUpdateNode(selectedNode.id, {
                smartProps: { ...(selectedNode.smartProps || {}), href: e.target.value },
              })
            }
            style={{
              flex: 1,
              background: '#1F2229',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '5px',
              padding: '6px 8px',
              color: '#FFFFFF',
              fontSize: '0.72rem',
              outline: 'none',
            }}
          />
          <ExternalLink size={14} style={{ color: '#6B7280' }} />
        </div>
      </div>

      {/* ── BUTTON COLORS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.66rem', color: '#6B7280' }}>Fill Color</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="color"
              value={bgColorHex.startsWith('#') ? bgColorHex : '#3B82F6'}
              onChange={(e) =>
                onUpdateStyle(selectedNode.id, {
                  background: { ...(style.background || { type: 'solid' as const }), type: 'solid', color: { type: 'solid', value: e.target.value } },
                })
              }
              style={{ width: '24px', height: '24px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: 'transparent' }}
            />
            <input
              type="text"
              value={bgColorHex}
              onChange={(e) =>
                onUpdateStyle(selectedNode.id, {
                  background: { ...(style.background || { type: 'solid' as const }), type: 'solid', color: { type: 'solid', value: e.target.value } },
                })
              }
              style={{
                flex: 1,
                background: '#1F2229',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '4px',
                padding: '3px 6px',
                color: '#FFFFFF',
                fontSize: '0.68rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.66rem', color: '#6B7280' }}>Text Color</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="color"
              value={typoColorHex.startsWith('#') ? typoColorHex : '#FFFFFF'}
              onChange={(e) =>
                onUpdateStyle(selectedNode.id, {
                  typography: { ...typo, color: { type: 'solid', value: e.target.value } },
                })
              }
              style={{ width: '24px', height: '24px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: 'transparent' }}
            />
            <input
              type="text"
              value={typoColorHex}
              onChange={(e) =>
                onUpdateStyle(selectedNode.id, {
                  typography: { ...typo, color: { type: 'solid', value: e.target.value } },
                })
              }
              style={{
                flex: 1,
                background: '#1F2229',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '4px',
                padding: '3px 6px',
                color: '#FFFFFF',
                fontSize: '0.68rem',
                outline: 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* ── CORNER RADIUS ── */}
      <CornerRadiusControl
        radius={
          (typeof style.border?.radius === 'object'
            ? (style.border.radius as any)
            : style.border?.radius) || currentRadiusAll
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
