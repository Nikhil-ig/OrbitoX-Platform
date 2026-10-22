'use client';

import React, { useState } from 'react';
import { SceneGraphNode, CSSValue } from '../engine/SceneGraphTypes';
import { TemplateSceneDefinition, TemplateDesignTokens } from '../types/TemplateSchema';
import {
  ChevronDown, ChevronRight, ChevronLeft, Sparkles, Link as LinkIcon, Layers, Trash2,
  Sliders, Play, Move, Type, Image as ImgIcon, Square, Code, Eye, EyeOff, Maximize2,
  Palette, Box, LayoutGrid
} from 'lucide-react';

interface Props {
  selectedNode: SceneGraphNode | null;
  activeScene: TemplateSceneDefinition;
  mode: 'design' | 'motion' | 'prototype' | '3d';
  designTokens?: TemplateDesignTokens;
  onUpdateNode: (nodeId: string, patch: Partial<SceneGraphNode>) => void;
  onUpdateGeometry: (nodeId: string, patch: any) => void;
  onUpdateStyle: (nodeId: string, patch: any) => void;
  onCreateComponent?: (nodeId: string) => void;
  onDetachInstance?: (nodeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  expertMode?: boolean;
}

export function OrbitoXContextualInspector({
  selectedNode,
  activeScene,
  mode,
  designTokens,
  onUpdateNode,
  onUpdateGeometry,
  onUpdateStyle,
  onCreateComponent,
  onDetachInstance,
  onDeleteNode,
  expertMode = false,
}: Props) {
  // Collapsible Inspector state (can minimize to 32px to maximize canvas)
  const [isMinimized, setIsMinimized] = useState(false);

  // Accordion Section states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    layout: true,
    position: true,
    size: true,
    content: true,
    spacing: false,
    appearance: false,
    motion: false,
    effects: false,
    responsive: false,
    advanced: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (isMinimized) {
    return (
      <aside
        style={{
          width: '32px',
          flexShrink: 0,
          background: '#0B1021',
          borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: '12px',
          zIndex: 40,
        }}
      >
        <button
          onClick={() => setIsMinimized(false)}
          title="Expand Properties Inspector"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#DFBA6B',
            cursor: 'pointer',
            padding: '6px',
          }}
        >
          <ChevronLeft size={16} />
        </button>
        <span
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: '0.68rem',
            fontWeight: 700,
            color: 'rgba(255, 255, 255, 0.5)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginTop: '20px',
          }}
        >
          Properties
        </span>
      </aside>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 1. PROTOTYPE MODE: INTERACTION STUDIO
  // ─────────────────────────────────────────────────────────────
  if (mode === 'prototype') {
    const currentInteraction = selectedNode?.interactions?.[0] || {
      trigger: 'onTap',
      action: 'navigate',
      payload: { url: '' },
    };

    return (
      <aside style={inspectorContainerStyle}>
        <div style={inspectorHeaderStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Play size={14} style={{ color: '#8B5CF6' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Interactions</span>
          </div>
          <button
            onClick={() => setIsMinimized(true)}
            title="Collapse Inspector"
            style={headerIconBtnStyle}
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {!selectedNode ? (
          <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '30px', lineHeight: 1.4 }}>
            Select any element on canvas to attach interactions, triggers, and state animations.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '0.72rem', color: '#DFBA6B', fontWeight: 700 }}>
              Target: {selectedNode.name || selectedNode.kind}
            </div>

            <div>
              <label style={labelStyle}>Trigger</label>
              <select
                value={currentInteraction.trigger || 'onTap'}
                onChange={(e) => {
                  const updated = [{ ...currentInteraction, trigger: e.target.value as any }];
                  onUpdateNode(selectedNode.id, { interactions: updated });
                }}
                style={inputStyle}
              >
                <option value="onTap">On Tap / Click</option>
                <option value="onHover">On Hover</option>
                <option value="onScrollProgress">On Scroll Progress</option>
                <option value="onSceneEnter">On Scene Enter</option>
                <option value="onSubmit">On Submit Form</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Action</label>
              <select
                value={currentInteraction.action || 'navigate'}
                onChange={(e) => {
                  const updated = [{ ...currentInteraction, action: e.target.value as any }];
                  onUpdateNode(selectedNode.id, { interactions: updated });
                }}
                style={inputStyle}
              >
                <option value="navigate">Navigate URL / Page</option>
                <option value="openModal">Open Modal Dialog</option>
                <option value="submit">Submit Form</option>
                <option value="reveal">Reveal Element</option>
                <option value="hide">Hide Element</option>
                <option value="animate">Trigger Micro-Animation</option>
              </select>
            </div>

            {currentInteraction.action === 'navigate' && (
              <div>
                <label style={labelStyle}>Destination URL</label>
                <input
                  type="text"
                  placeholder="https://... or #section"
                  value={currentInteraction.payload?.url || ''}
                  onChange={(e) => {
                    const updated = [{ ...currentInteraction, payload: { ...currentInteraction.payload, url: e.target.value } }];
                    onUpdateNode(selectedNode.id, { interactions: updated });
                  }}
                  style={inputStyle}
                />
              </div>
            )}
          </div>
        )}
      </aside>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. DESIGN MODE: NOTHING SELECTED -> SECTION PROPERTIES
  // ─────────────────────────────────────────────────────────────
  if (!selectedNode) {
    return (
      <aside style={inspectorContainerStyle}>
        <div style={inspectorHeaderStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={14} style={{ color: '#DFBA6B' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Section</span>
          </div>
          <button
            onClick={() => setIsMinimized(true)}
            title="Collapse Inspector"
            style={headerIconBtnStyle}
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Current Section</label>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF' }}>{activeScene.name}</div>
          </div>

          <div>
            <label style={labelStyle}>Purpose</label>
            <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
              {activeScene.purpose}
            </div>
          </div>

          <div style={{ padding: '10px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginTop: '10px' }}>
            <div style={{ fontSize: '0.7rem', color: '#DFBA6B', fontWeight: 700, marginBottom: '3px' }}>✦ Design Workspace</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.35 }}>
              Click any element on the canvas to inspect its layout, geometry, typography, and styling.
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. DESIGN MODE: SELECTED ELEMENT INSPECTOR
  // ─────────────────────────────────────────────────────────────
  const isText = selectedNode.kind === 'text' || selectedNode.kind === 'richtext';
  const isImage = selectedNode.kind === 'image';
  const isContainer = !isText && !isImage;

  const geom = selectedNode.geometry || {};
  const style = (selectedNode.style || {}) as any;
  const typo = style.typography || {};

  const posX = typeof geom.x === 'number' ? geom.x : parseFloat(String(geom.x || 0)) || 0;
  const posY = typeof geom.y === 'number' ? geom.y : parseFloat(String(geom.y || 0)) || 0;
  const widthVal = geom.width !== undefined ? String(geom.width) : '100%';
  const heightVal = geom.height !== undefined ? String(geom.height) : 'auto';

  return (
    <aside style={inspectorContainerStyle} id="orbitox-contextual-inspector">
      {/* ── HEADER: Hero / Heading Name + Collapse + Delete ── */}
      <div style={inspectorHeaderStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#DFBA6B',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}
          >
            {selectedNode.name || selectedNode.kind}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {onDeleteNode && (
            <button
              onClick={() => onDeleteNode(selectedNode.id)}
              title="Delete Layer"
              style={headerIconBtnStyle}
            >
              <Trash2 size={13} />
            </button>
          )}
          <button
            onClick={() => setIsMinimized(true)}
            title="Collapse Inspector"
            style={headerIconBtnStyle}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: 1, overflowY: 'auto' }}>
        {/* ── 1. CONTENT (For Text / Image) ── */}
        {isText && (
          <AccordionGroup
            title="Content & Text"
            isOpen={openSections.content}
            onToggle={() => toggleSection('content')}
          >
            <textarea
              rows={2}
              value={selectedNode.textContent || ''}
              onChange={(e) => onUpdateNode(selectedNode.id, { textContent: e.target.value })}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </AccordionGroup>
        )}

        {isImage && (
          <AccordionGroup
            title="Image Asset"
            isOpen={openSections.content}
            onToggle={() => toggleSection('content')}
          >
            <label style={labelStyle}>Image URL</label>
            <input
              type="text"
              value={(style.background as any)?.image || ''}
              placeholder="https://..."
              onChange={(e) =>
                onUpdateStyle(selectedNode.id, {
                  background: { ...(style.background || {}), type: 'image', image: e.target.value },
                })
              }
              style={inputStyle}
            />
          </AccordionGroup>
        )}

        {/* ── 2. LAYOUT: Auto / Freeform ── */}
        <AccordionGroup
          title="Layout"
          isOpen={openSections.layout}
          onToggle={() => toggleSection('layout')}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '8px' }}>
            <button
              onClick={() => onUpdateNode(selectedNode.id, { layoutMode: 'flex' })}
              style={{
                ...toggleBtnStyle,
                background: selectedNode.layoutMode === 'flex' ? 'rgba(223, 186, 107, 0.25)' : 'rgba(255,255,255,0.04)',
                border: selectedNode.layoutMode === 'flex' ? '1px solid #DFBA6B' : '1px solid rgba(255,255,255,0.08)',
                color: selectedNode.layoutMode === 'flex' ? '#DFBA6B' : 'rgba(255,255,255,0.6)',
              }}
            >
              Auto
            </button>
            <button
              onClick={() => onUpdateNode(selectedNode.id, { layoutMode: 'freeform' })}
              style={{
                ...toggleBtnStyle,
                background: selectedNode.layoutMode === 'freeform' ? 'rgba(223, 186, 107, 0.25)' : 'rgba(255,255,255,0.04)',
                border: selectedNode.layoutMode === 'freeform' ? '1px solid #DFBA6B' : '1px solid rgba(255,255,255,0.08)',
                color: selectedNode.layoutMode === 'freeform' ? '#DFBA6B' : 'rgba(255,255,255,0.6)',
              }}
            >
              Freeform
            </button>
          </div>

          {selectedNode.layoutMode === 'flex' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              {(['vertical', 'horizontal'] as const).map((dir) => (
                <button
                  key={dir}
                  onClick={() =>
                    onUpdateNode(selectedNode.id, {
                      layoutConfig: { ...(selectedNode.layoutConfig as any || {}), direction: dir },
                    })
                  }
                  style={{
                    ...toggleBtnStyle,
                    background: (selectedNode.layoutConfig as any)?.direction === dir ? 'rgba(223, 186, 107, 0.2)' : 'rgba(255,255,255,0.04)',
                    border: (selectedNode.layoutConfig as any)?.direction === dir ? '1px solid #DFBA6B' : '1px solid rgba(255,255,255,0.08)',
                    color: (selectedNode.layoutConfig as any)?.direction === dir ? '#DFBA6B' : 'rgba(255,255,255,0.6)',
                    textTransform: 'capitalize',
                  }}
                >
                  {dir}
                </button>
              ))}
            </div>
          )}
        </AccordionGroup>

        {/* ── 3. POSITION: X and Y ── */}
        <AccordionGroup
          title="Position"
          isOpen={openSections.position}
          onToggle={() => toggleSection('position')}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)', padding: '2px 6px' }}>
              <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, width: '14px' }}>X</span>
              <input
                type="number"
                value={Math.round(posX)}
                onChange={(e) => onUpdateGeometry(selectedNode.id, { x: parseFloat(e.target.value) || 0, position: 'absolute' })}
                style={{ ...inlineInputStyle }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)', padding: '2px 6px' }}>
              <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, width: '14px' }}>Y</span>
              <input
                type="number"
                value={Math.round(posY)}
                onChange={(e) => onUpdateGeometry(selectedNode.id, { y: parseFloat(e.target.value) || 0, position: 'absolute' })}
                style={{ ...inlineInputStyle }}
              />
            </div>
          </div>
        </AccordionGroup>

        {/* ── 4. SIZE: W and H ── */}
        <AccordionGroup
          title="Size"
          isOpen={openSections.size}
          onToggle={() => toggleSection('size')}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)', padding: '2px 6px' }}>
              <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, width: '14px' }}>W</span>
              <input
                type="text"
                value={widthVal}
                onChange={(e) => onUpdateGeometry(selectedNode.id, { width: e.target.value })}
                style={{ ...inlineInputStyle }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)', padding: '2px 6px' }}>
              <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, width: '14px' }}>H</span>
              <input
                type="text"
                value={heightVal}
                onChange={(e) => onUpdateGeometry(selectedNode.id, { height: e.target.value })}
                style={{ ...inlineInputStyle }}
              />
            </div>
          </div>
        </AccordionGroup>

        {/* ── 5. SPACING: Padding & Gap ── */}
        <AccordionGroup
          title="Spacing"
          isOpen={openSections.spacing}
          onToggle={() => toggleSection('spacing')}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={labelStyle}>Gap</span>
              <input
                type="text"
                placeholder="16px"
                value={(selectedNode.layoutConfig as any)?.gap || ''}
                onChange={(e) =>
                  onUpdateNode(selectedNode.id, {
                    layoutConfig: { ...(selectedNode.layoutConfig as any || {}), gap: e.target.value },
                  })
                }
                style={{ ...inputStyle, width: '80px', padding: '3px 6px' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={labelStyle}>Padding</span>
              <input
                type="text"
                placeholder="24px"
                value={style.spacing?.padding || ''}
                onChange={(e) =>
                  onUpdateStyle(selectedNode.id, {
                    spacing: { ...(style.spacing || {}), padding: e.target.value },
                  })
                }
                style={{ ...inputStyle, width: '80px', padding: '3px 6px' }}
              />
            </div>
          </div>
        </AccordionGroup>

        {/* ── 6. APPEARANCE: Fill, Border, Radius, Opacity ── */}
        <AccordionGroup
          title="Appearance"
          isOpen={openSections.appearance}
          onToggle={() => toggleSection('appearance')}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label style={labelStyle}>Background Fill</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="color"
                  value={(style.background as any)?.color || '#090D1A'}
                  onChange={(e) =>
                    onUpdateStyle(selectedNode.id, {
                      background: { ...(style.background || {}), type: 'solid', color: e.target.value },
                    })
                  }
                  style={{ width: '28px', height: '24px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  value={(style.background as any)?.color || 'transparent'}
                  onChange={(e) =>
                    onUpdateStyle(selectedNode.id, {
                      background: { ...(style.background || {}), type: 'solid', color: e.target.value },
                    })
                  }
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Corner Radius</label>
              <input
                type="text"
                placeholder="e.g. 16px or 9999px"
                value={typeof style.border?.radius === 'string' ? style.border.radius : ''}
                onChange={(e) =>
                  onUpdateStyle(selectedNode.id, {
                    border: { ...(style.border || {}), radius: e.target.value },
                  })
                }
                style={inputStyle}
              />
            </div>
          </div>
        </AccordionGroup>

        {/* ── 7. MOTION ── */}
        <AccordionGroup
          title="Motion"
          isOpen={openSections.motion}
          onToggle={() => toggleSection('motion')}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>Preset Animation</label>
            <select
              value={selectedNode.motion?.in?.type || 'none'}
              onChange={(e) => {
                onUpdateNode(selectedNode.id, {
                  motion: {
                    ...(selectedNode.motion || {}),
                    in: {
                      type: e.target.value as any,
                      duration: 600,
                      delay: 100,
                      easing: 'ease-out',
                    },
                  },
                });
              }}
              style={inputStyle}
            >
              <option value="none">None</option>
              <option value="fade">Fade In</option>
              <option value="slide-up">Slide Up</option>
              <option value="slide-down">Slide Down</option>
              <option value="zoom-in">Zoom In</option>
            </select>
          </div>
        </AccordionGroup>

        {/* ── 8. EFFECTS: Shadow, Glow ── */}
        <AccordionGroup
          title="Effects"
          isOpen={openSections.effects}
          onToggle={() => toggleSection('effects')}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>Box Shadow / Glow</label>
            <input
              type="text"
              placeholder="e.g. 0 10px 40px rgba(0,0,0,0.5)"
              value={style.boxShadow || ''}
              onChange={(e) => onUpdateStyle(selectedNode.id, { boxShadow: e.target.value })}
              style={inputStyle}
            />
          </div>
        </AccordionGroup>

        {/* ── 9. RESPONSIVE ── */}
        <AccordionGroup
          title="Responsive"
          isOpen={openSections.responsive}
          onToggle={() => toggleSection('responsive')}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={selectedNode.responsive?.mobile?.hidden || false}
              onChange={(e) => {
                const updated = {
                  ...(selectedNode.responsive || {}),
                  mobile: {
                    ...(selectedNode.responsive?.mobile || {}),
                    hidden: e.target.checked,
                  },
                };
                onUpdateNode(selectedNode.id, { responsive: updated });
              }}
            />
            <span>Hide on Mobile Viewport</span>
          </label>
        </AccordionGroup>

        {/* ── 10. ADVANCED / EXPERT ── */}
        <AccordionGroup
          title="Advanced"
          isOpen={openSections.advanced}
          onToggle={() => toggleSection('advanced')}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label style={labelStyle}>Custom CSS Classes</label>
              <input
                type="text"
                placeholder="e.g. tracking-widest uppercase"
                value={selectedNode.className || ''}
                onChange={(e) => onUpdateNode(selectedNode.id, { className: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Custom ID Anchor</label>
              <input
                type="text"
                placeholder="e.g. hero-title"
                value={selectedNode.customId || ''}
                onChange={(e) => onUpdateNode(selectedNode.id, { customId: e.target.value })}
                style={inputStyle}
              />
            </div>

            {onCreateComponent && !selectedNode.component?.isMaster && (
              <button
                onClick={() => onCreateComponent(selectedNode.id)}
                style={{
                  width: '100%',
                  background: 'rgba(223, 186, 107, 0.1)',
                  border: '1px solid #DFBA6B',
                  borderRadius: '4px',
                  color: '#DFBA6B',
                  padding: '5px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginTop: '4px',
                }}
              >
                Save as Master Component
              </button>
            )}
          </div>
        </AccordionGroup>
      </div>
    </aside>
  );
}

function AccordionGroup({
  title,
  isOpen = false,
  onToggle,
  children,
}: {
  title: string;
  isOpen?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: isOpen ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
          fontSize: '0.74rem',
          fontWeight: 600,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span>{title}</span>
        {isOpen ? <ChevronDown size={12} style={{ opacity: 0.6 }} /> : <ChevronRight size={12} style={{ opacity: 0.4 }} />}
      </button>
      {isOpen && (
        <div style={{ padding: '0 12px 10px 12px', animation: 'fadeIn 0.1s ease-out' }}>
          {children}
        </div>
      )}
    </div>
  );
}

const inspectorContainerStyle: React.CSSProperties = {
  width: '240px',
  flexShrink: 0,
  background: '#0B1021',
  borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
  boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.35)',
  zIndex: 40,
  display: 'flex',
  flexDirection: 'column',
  userSelect: 'none',
  color: '#FFFFFF',
  height: '100%',
  fontFamily: 'Inter, system-ui, sans-serif',
};

const inspectorHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 12px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
};

const headerIconBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'rgba(255, 255, 255, 0.4)',
  padding: '3px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  borderRadius: '4px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.66rem',
  color: 'rgba(255, 255, 255, 0.45)',
  display: 'block',
  marginBottom: '3px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '4px',
  color: '#FFFFFF',
  padding: '5px 8px',
  fontSize: '0.74rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const inlineInputStyle: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: 'none',
  color: '#FFFFFF',
  fontSize: '0.74rem',
  outline: 'none',
  padding: '2px 4px',
};

const toggleBtnStyle: React.CSSProperties = {
  borderRadius: '4px',
  padding: '5px',
  fontSize: '0.7rem',
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'all 0.1s ease',
};
