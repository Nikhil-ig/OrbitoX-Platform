'use client';

import React from 'react';
import { Image as ImageIcon, FolderOpen } from 'lucide-react';
import { NodeInspectorProps } from './types';
import { VisualBoxModel } from './controls/VisualBoxModel';
import { CornerRadiusControl } from './CornerRadiusControl';

export function ImageInspector({
  selectedNode,
  onUpdateNode,
  onUpdateStyle,
  onOpenAssetPicker,
}: NodeInspectorProps) {
  const style = selectedNode.style || {};
  const currentImageUrl =
    selectedNode.smartProps?.url ||
    (selectedNode.props as any)?.src ||
    style.background?.image ||
    '';

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ── IMAGE PREVIEW & SOURCE ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Image Source</label>
        {currentImageUrl ? (
          <div
            style={{
              width: '100%',
              height: '110px',
              borderRadius: '6px',
              overflow: 'hidden',
              position: 'relative',
              background: '#191C24',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <img
              src={currentImageUrl}
              alt="Preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              height: '70px',
              borderRadius: '6px',
              border: '1px dashed rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              color: '#6B7280',
              fontSize: '0.72rem',
            }}
          >
            <ImageIcon size={15} />
            <span>No Image Selected</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            type="text"
            placeholder="Image URL..."
            value={currentImageUrl}
            onChange={(e) => {
              const url = e.target.value;
              onUpdateNode(selectedNode.id, {
                smartProps: { ...(selectedNode.smartProps || {}), url },
              });
              onUpdateStyle(selectedNode.id, {
                background: { ...(style.background || { type: 'image' as const }), type: 'image', image: url },
              });
            }}
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

          {onOpenAssetPicker && (
            <button
              onClick={onOpenAssetPicker}
              title="Open Assets Library"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                background: '#252932',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '5px',
                color: '#60A5FA',
                fontSize: '0.7rem',
                cursor: 'pointer',
              }}
            >
              <FolderOpen size={13} />
              <span>Library</span>
            </button>
          )}
        </div>
      </div>

      {/* ── IMAGE FITTING ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '0.66rem', color: '#6B7280' }}>Object Fit</label>
        <select
          value={style.objectFit || style.background?.size || 'cover'}
          onChange={(e) => {
            const fit = e.target.value as any;
            onUpdateStyle(selectedNode.id, {
              objectFit: fit,
              background: { ...(style.background || { type: 'image' as const }), type: 'image', size: fit },
            });
          }}
          style={{
            background: '#1F2229',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '5px',
            padding: '5px 8px',
            color: '#FFFFFF',
            fontSize: '0.72rem',
            outline: 'none',
          }}
        >
          <option value="cover">Cover (Fill & Crop)</option>
          <option value="contain">Contain (Full View)</option>
          <option value="fill">Stretch / Fill</option>
          <option value="auto">Auto / Original</option>
        </select>
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
