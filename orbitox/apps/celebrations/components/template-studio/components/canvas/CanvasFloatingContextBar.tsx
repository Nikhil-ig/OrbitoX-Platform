'use client';

import React, { useState } from 'react';
import {
  Type, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Sparkles,
  Maximize2, Crop, Image as ImageIcon, Wand2, Layers, Palette, Sliders,
  ChevronDown, Move, Box, CornerDownRight, RotateCw, RefreshCw, MoreHorizontal,
  Component as ComponentIcon
} from 'lucide-react';
import { SceneGraphNode } from '../../engine/SceneGraphTypes';

interface Props {
  node: SceneGraphNode;
  position: { x: number; y: number; width: number; height: number };
  zoom: number;
  onUpdateStyle: (stylePatch: any) => void;
  onOpenMotion: () => void;
  onOpenAi: (action: string) => void;
  onOpenRemix?: () => void;
  onCreateComponent?: (nodeId: string) => void;
}

export function CanvasFloatingContextBar({
  node,
  position,
  zoom,
  onUpdateStyle,
  onOpenMotion,
  onOpenAi,
  onOpenRemix,
  onCreateComponent,
}: Props) {
  const isText = node.kind === 'text' || node.kind === 'richtext';
  const isImage = node.kind === 'image' || (node.kind as string) === 'media-slot';
  const isContainer = !isText && !isImage;

  // Compute position relative to selected element (floating 12px above the box, or below if too close to top)
  const barTop = position.y > 60 ? position.y - 48 : position.y + position.height + 12;
  const barLeft = Math.max(12, position.x);

  const style = (node.style || {}) as any;
  const typo = style.typography || {};

  // Local dropdown states
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [showWeightMenu, setShowWeightMenu] = useState(false);
  const [showAlignMenu, setShowAlignMenu] = useState(false);

  return (
    <div
      id="orbitox-floating-context-bar"
      style={{
        position: 'absolute',
        top: `${barTop}px`,
        left: `${barLeft}px`,
        zIndex: 70,
        background: 'rgba(9, 13, 26, 0.96)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(223, 186, 107, 0.4)',
        borderRadius: '8px',
        padding: '3px 6px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        userSelect: 'none',
        pointerEvents: 'auto',
        fontFamily: 'Inter, system-ui, sans-serif',
        animation: 'fadeInBar 0.12s ease-out',
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* ─────────────────────────────────────────────────────────────
          1. TEXT NODE TOOLBAR: Playfair ▾  48 ▾  600 ▾  B  I  ↔  ●  ✦
         ───────────────────────────────────────────────────────────── */}
      {isText && (
        <>
          {/* Font Family ▾ */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowFontMenu(!showFontMenu)}
              style={dropdownBtnStyle}
              title="Change Font Family"
            >
              <span>{typo.fontFamily ? typo.fontFamily.split(',')[0].replace(/['"]/g, '') : 'Playfair'}</span>
              <ChevronDown size={11} style={{ opacity: 0.6 }} />
            </button>
            {showFontMenu && (
              <div style={menuDropdownStyle}>
                {['Playfair Display', 'Cinzel', 'Inter', 'Outfit', 'Plus Jakarta Sans', 'Great Vibes'].map((font) => (
                  <div
                    key={font}
                    onClick={() => {
                      onUpdateStyle({ typography: { ...typo, fontFamily: `${font}, sans-serif` } });
                      setShowFontMenu(false);
                    }}
                    style={{ ...menuItemStyle, fontFamily: font }}
                  >
                    {font}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={separatorStyle} />

          {/* Font Size ▾ */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowSizeMenu(!showSizeMenu)}
              style={{ ...dropdownBtnStyle, minWidth: '46px' }}
              title="Change Font Size"
            >
              <span>{parseInt(String(typo.fontSize || '48'), 10) || 48}</span>
              <ChevronDown size={11} style={{ opacity: 0.6 }} />
            </button>
            {showSizeMenu && (
              <div style={{ ...menuDropdownStyle, minWidth: '60px' }}>
                {[14, 16, 20, 24, 32, 40, 48, 64, 80, 96].map((s) => (
                  <div
                    key={s}
                    onClick={() => {
                      onUpdateStyle({ typography: { ...typo, fontSize: `${s}px` } });
                      setShowSizeMenu(false);
                    }}
                    style={menuItemStyle}
                  >
                    {s}px
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={separatorStyle} />

          {/* Font Weight ▾ */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowWeightMenu(!showWeightMenu)}
              style={{ ...dropdownBtnStyle, minWidth: '48px' }}
              title="Change Font Weight"
            >
              <span>{typo.fontWeight || '600'}</span>
              <ChevronDown size={11} style={{ opacity: 0.6 }} />
            </button>
            {showWeightMenu && (
              <div style={{ ...menuDropdownStyle, minWidth: '70px' }}>
                {['300', '400', '500', '600', '700', '800'].map((w) => (
                  <div
                    key={w}
                    onClick={() => {
                      onUpdateStyle({ typography: { ...typo, fontWeight: w } });
                      setShowWeightMenu(false);
                    }}
                    style={menuItemStyle}
                  >
                    {w}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={separatorStyle} />

          {/* Bold */}
          <button
            onClick={() => {
              const isB = typo.fontWeight === '700' || typo.fontWeight === 700 || typo.fontWeight === 'bold';
              onUpdateStyle({ typography: { ...typo, fontWeight: isB ? '400' : '700' } });
            }}
            style={{
              ...iconBtnStyle,
              background: typo.fontWeight === '700' || typo.fontWeight === 700 || typo.fontWeight === 'bold' ? 'rgba(223, 186, 107, 0.25)' : 'transparent',
              color: typo.fontWeight === '700' || typo.fontWeight === 700 || typo.fontWeight === 'bold' ? '#DFBA6B' : '#FFFFFF',
            }}
            title="Bold"
          >
            <Bold size={12} />
          </button>

          {/* Italic */}
          <button
            onClick={() => {
              const isI = typo.fontStyle === 'italic';
              onUpdateStyle({ typography: { ...typo, fontStyle: isI ? 'normal' : 'italic' } });
            }}
            style={{
              ...iconBtnStyle,
              background: typo.fontStyle === 'italic' ? 'rgba(223, 186, 107, 0.25)' : 'transparent',
              color: typo.fontStyle === 'italic' ? '#DFBA6B' : '#FFFFFF',
            }}
            title="Italic"
          >
            <Italic size={12} />
          </button>

          {/* Alignment ↔ */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                const aligns = ['left', 'center', 'right'];
                const cur = typo.textAlign || 'center';
                const next = aligns[(aligns.indexOf(cur) + 1) % aligns.length];
                onUpdateStyle({ typography: { ...typo, textAlign: next } });
              }}
              style={iconBtnStyle}
              title={`Alignment: ${typo.textAlign || 'center'}`}
            >
              {typo.textAlign === 'left' ? <AlignLeft size={12} /> : typo.textAlign === 'right' ? <AlignRight size={12} /> : <AlignCenter size={12} />}
            </button>
          </div>

          <div style={separatorStyle} />

          {/* Text Color Swatch ● */}
          <button
            onClick={() => {
              const colors = ['#FFFFFF', '#DFBA6B', '#38BDF8', '#F43F5E', '#A78BFA'];
              const curColor = typo.color || '#FFFFFF';
              const next = colors[(colors.indexOf(curColor) + 1) % colors.length];
              onUpdateStyle({ typography: { ...typo, color: next } });
            }}
            style={{
              ...iconBtnStyle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Cycle Text Color"
          >
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: typo.color || '#DFBA6B',
                border: '1.5px solid rgba(255,255,255,0.4)',
                display: 'inline-block',
              }}
            />
          </button>

          <div style={separatorStyle} />

          {/* AI Enhance ✦ */}
          <button
            onClick={() => onOpenAi('Enhance this headline with luxury editorial tone')}
            style={{
              ...labelBtnStyle,
              background: 'linear-gradient(135deg, rgba(223, 186, 107, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
              border: '1px solid rgba(223, 186, 107, 0.4)',
              color: '#DFBA6B',
            }}
            title="Ask OrbitoX AI to enhance this text"
          >
            <Sparkles size={11} />
            <span>✦ Enhance</span>
          </button>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. IMAGE NODE TOOLBAR: Replace | Crop | Fit | Radius | FX | Animate
         ───────────────────────────────────────────────────────────── */}
      {isImage && (
        <>
          {/* Replace */}
          <button
            onClick={() => {
              const url = prompt('Enter new image URL:', (style.background as any)?.image || '');
              if (url) {
                onUpdateStyle({
                  background: {
                    ...(style.background || {}),
                    type: 'image',
                    image: url,
                  },
                });
              }
            }}
            style={labelBtnStyle}
            title="Replace Image Asset"
          >
            <RefreshCw size={11} />
            <span>Replace</span>
          </button>

          {/* Crop */}
          <button
            onClick={() => {
              onUpdateStyle({
                background: {
                  ...(style.background || {}),
                  position: 'center center',
                },
              });
            }}
            style={labelBtnStyle}
            title="Center Crop"
          >
            <Crop size={11} />
            <span>Crop</span>
          </button>

          {/* Fit */}
          <button
            onClick={() => {
              const cur = (style.background as any)?.size || 'cover';
              const next = cur === 'cover' ? 'contain' : 'cover';
              onUpdateStyle({
                background: {
                  ...(style.background || {}),
                  size: next,
                },
              });
            }}
            style={labelBtnStyle}
            title="Toggle Image Fit (Cover / Contain)"
          >
            <Maximize2 size={11} />
            <span>Fit: {(style.background as any)?.size || 'cover'}</span>
          </button>

          {/* Radius */}
          <button
            onClick={() => {
              const cur = style.border?.radius || '0px';
              const next = cur === '16px' ? '9999px' : cur === '9999px' ? '0px' : '16px';
              onUpdateStyle({
                border: {
                  ...(style.border || {}),
                  radius: next,
                },
              });
            }}
            style={labelBtnStyle}
            title="Cycle Corner Radius: 0px → 16px → Pill"
          >
            <span>Radius: {style.border?.radius || '0px'}</span>
          </button>

          <div style={separatorStyle} />

          {/* FX */}
          <button
            onClick={() => {
              const hasGlow = !!style.boxShadow && style.boxShadow.includes('rgba(223, 186, 107');
              onUpdateStyle({
                boxShadow: hasGlow ? 'none' : '0 12px 40px rgba(223, 186, 107, 0.35)',
              });
            }}
            style={{
              ...labelBtnStyle,
              color: style.boxShadow?.includes('223, 186, 107') ? '#DFBA6B' : '#FFFFFF',
            }}
            title="Toggle Ambient Glow Effect"
          >
            <Sparkles size={11} />
            <span>FX</span>
          </button>

          {/* Animate */}
          <button
            onClick={onOpenMotion}
            style={{
              ...labelBtnStyle,
              color: '#38BDF8',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
            }}
            title="Open in Motion Timeline"
          >
            <Sliders size={11} />
            <span>Animate</span>
          </button>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. CONTAINER / SECTION TOOLBAR:
          Layout | Align | Space | Fill | Border | Effects | Motion | Remix | ⋯
         ───────────────────────────────────────────────────────────── */}
      {isContainer && (
        <>
          {/* Layout: Auto / Free */}
          <button
            onClick={() => {
              const next = node.layoutMode === 'flex' ? 'freeform' : 'flex';
              onUpdateStyle({ layoutMode: next });
            }}
            style={{
              ...labelBtnStyle,
              background: node.layoutMode === 'flex' ? 'rgba(223, 186, 107, 0.2)' : 'rgba(255,255,255,0.06)',
              color: node.layoutMode === 'flex' ? '#DFBA6B' : '#FFFFFF',
            }}
            title="Toggle Auto-Layout vs Freeform"
          >
            <span>Layout: {node.layoutMode === 'flex' ? 'Auto' : 'Free'}</span>
          </button>

          {/* Align */}
          <button
            onClick={() => {
              const next = (node.layoutConfig as any)?.alignItems === 'center' ? 'flex-start' : 'center';
              onUpdateStyle({ layoutConfig: { ...(node.layoutConfig as any || {}), alignItems: next } });
            }}
            style={labelBtnStyle}
            title="Cycle Alignment (Start / Center)"
          >
            <AlignCenter size={11} />
            <span>Align</span>
          </button>

          {/* Space (Gap) */}
          <button
            onClick={() => {
              const cur = parseInt(String((node.layoutConfig as any)?.gap || '16'), 10) || 16;
              const next = cur === 16 ? 24 : cur === 24 ? 32 : 16;
              onUpdateStyle({ layoutConfig: { ...(node.layoutConfig as any || {}), gap: `${next}px` } });
            }}
            style={labelBtnStyle}
            title="Cycle Gap Spacing: 16px → 24px → 32px"
          >
            <span>Space: {(node.layoutConfig as any)?.gap || '16px'}</span>
          </button>

          <div style={separatorStyle} />

          {/* Fill */}
          <button
            onClick={() => {
              const fills = ['rgba(9, 13, 26, 0.9)', 'rgba(255, 255, 255, 0.05)', 'transparent'];
              const cur = (style.background as any)?.color || 'transparent';
              const next = fills[(fills.indexOf(cur) + 1) % fills.length];
              onUpdateStyle({ background: { ...(style.background || {}), type: 'solid', color: next } });
            }}
            style={labelBtnStyle}
            title="Cycle Container Background Fill"
          >
            <span>Fill</span>
          </button>

          {/* Border */}
          <button
            onClick={() => {
              const hasB = !!style.border?.width;
              onUpdateStyle({
                border: hasB
                  ? { width: '0px', style: 'none', color: 'transparent' }
                  : { width: '1px', style: 'solid', color: 'rgba(223, 186, 107, 0.35)' },
              });
            }}
            style={{
              ...labelBtnStyle,
              color: style.border?.width && style.border?.width !== '0px' ? '#DFBA6B' : '#FFFFFF',
            }}
            title="Toggle Subtle Border"
          >
            <span>Border</span>
          </button>

          {/* Effects */}
          <button
            onClick={() => {
              const hasGlow = !!style.boxShadow && style.boxShadow.includes('rgba(223, 186, 107');
              onUpdateStyle({
                boxShadow: hasGlow ? 'none' : '0 10px 40px rgba(223, 186, 107, 0.25)',
              });
            }}
            style={{
              ...labelBtnStyle,
              color: style.boxShadow?.includes('223, 186, 107') ? '#DFBA6B' : '#FFFFFF',
            }}
            title="Toggle Ambient Glow Effect"
          >
            <Sparkles size={11} />
            <span>Effects</span>
          </button>

          <div style={separatorStyle} />

          {/* Motion */}
          <button
            onClick={onOpenMotion}
            style={{
              ...labelBtnStyle,
              color: '#38BDF8',
              background: 'rgba(56, 189, 248, 0.1)',
            }}
            title="Open in Motion Timeline"
          >
            <Sliders size={11} />
            <span>Motion</span>
          </button>

          {/* Remix */}
          {onOpenRemix && (
            <button
              onClick={onOpenRemix}
              style={{
                ...labelBtnStyle,
                background: 'linear-gradient(135deg, rgba(223, 186, 107, 0.22) 0%, rgba(176, 141, 76, 0.22) 100%)',
                border: '1px solid rgba(223, 186, 107, 0.4)',
                color: '#DFBA6B',
              }}
              title="Remix this section into 7 design universes"
            >
              <Palette size={11} />
              <span>Remix</span>
            </button>
          )}

          {/* Component */}
          {onCreateComponent && (
            <button
              onClick={() => onCreateComponent(node.id)}
              style={labelBtnStyle}
              title="Save as Reusable Component"
            >
              <ComponentIcon size={11} />
              <span>Component</span>
            </button>
          )}
        </>
      )}
    </div>
  );
}

const separatorStyle: React.CSSProperties = {
  width: '1px',
  height: '14px',
  background: 'rgba(255, 255, 255, 0.12)',
  margin: '0 2px',
};

const iconBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  borderRadius: '4px',
  color: 'rgba(255, 255, 255, 0.8)',
  padding: '4px 6px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.74rem',
  transition: 'all 0.12s ease',
};

const labelBtnStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '4px',
  color: '#FFFFFF',
  padding: '3px 8px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '0.72rem',
  fontWeight: 600,
  transition: 'all 0.12s ease',
};

const dropdownBtnStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.06)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '4px',
  color: '#FFFFFF',
  padding: '3px 7px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '0.72rem',
  fontWeight: 600,
  transition: 'all 0.12s ease',
};

const menuDropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 4px)',
  left: 0,
  background: 'rgba(11, 16, 33, 0.98)',
  border: '1px solid rgba(223, 186, 107, 0.35)',
  borderRadius: '6px',
  padding: '4px',
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  boxShadow: '0 12px 30px rgba(0,0,0,0.8)',
  zIndex: 100,
  minWidth: '130px',
  backdropFilter: 'blur(16px)',
};

const menuItemStyle: React.CSSProperties = {
  padding: '5px 8px',
  borderRadius: '4px',
  fontSize: '0.72rem',
  color: '#FFFFFF',
  cursor: 'pointer',
  transition: 'background 0.1s ease',
};
