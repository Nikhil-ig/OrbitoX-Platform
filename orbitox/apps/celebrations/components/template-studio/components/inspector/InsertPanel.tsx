'use client';

import React from 'react';
import { SceneNodeKind } from '../../engine/SceneGraphTypes';
import { NodeDefaults } from '../../engine/NodeDefaults';
import { TemplateEditorCommand } from '../../engine/TemplateEditorCommands';

interface InsertPanelProps {
  sceneId: string;
  selectedNodeId: string | null;
  dispatch: (command: TemplateEditorCommand) => void;
}

const CATEGORIES: { label: string; items: { kind: SceneNodeKind; label: string; icon: string }[] }[] = [
  {
    label: 'Primitives',
    items: [
      { kind: 'frame', label: 'Frame', icon: '🔲' },
      { kind: 'container', label: 'Container', icon: '📦' },
      { kind: 'stack', label: 'Stack Layout', icon: '▤' },
      { kind: 'grid', label: 'Grid Layout', icon: '▦' },
      { kind: 'text', label: 'Text', icon: 'T' },
      { kind: 'richtext', label: 'Rich Text', icon: '¶' },
      { kind: 'button', label: 'Button', icon: '🔘' },
      { kind: 'divider', label: 'Divider', icon: '―' },
      { kind: 'icon', label: 'Icon Glyph', icon: '✦' },
      { kind: 'image', label: 'Image', icon: '🖼️' },
      { kind: 'video', label: 'Video', icon: '🎥' },
      { kind: 'shape', label: 'Shape', icon: '⬛' },
      { kind: 'line', label: 'Line Divider', icon: '―' },
      { kind: 'group', label: 'Group', icon: '🗂️' },
    ],
  },
  {
    label: 'Celebration Semantic',
    items: [
      { kind: 'portrait', label: 'Portrait Card', icon: '👤' },
      { kind: 'couplecluster', label: 'Couple Cluster', icon: '👥' },
      { kind: 'person', label: 'Person Profile', icon: '👤' },
      { kind: 'couple', label: 'Couple Pair', icon: '👥' },
      { kind: 'story', label: 'Story Timeline', icon: '📖' },
      { kind: 'storymilestone', label: 'Story Milestone', icon: '⭐' },
      { kind: 'milestone', label: 'Milestone', icon: '⭐' },
      { kind: 'eventcard', label: 'Event Card', icon: '📅' },
      { kind: 'event', label: 'Event Schedule', icon: '📅' },
      { kind: 'venue', label: 'Venue & Map', icon: '📍' },
      { kind: 'countdown', label: 'Countdown Dial', icon: '⏱️' },
      { kind: 'rsvpform', label: 'RSVP Gateway', icon: '✉️' },
      { kind: 'rsvp', label: 'RSVP Form', icon: '✉️' },
      { kind: 'gallery', label: 'Photo Gallery', icon: '🏛️' },
      { kind: 'guestbook', label: 'Guestbook Wall', icon: '✍️' },
      { kind: 'blessing', label: 'Blessing Card', icon: '🕊️' },
    ],
  },
  {
    label: 'Visual & Atmosphere',
    items: [
      { kind: 'gradient', label: 'Gradient FX', icon: '🎨' },
      { kind: 'glow', label: 'Radial Glow', icon: '🔆' },
      { kind: 'lightsource', label: 'Light Source', icon: '💡' },
      { kind: 'atmosphere', label: 'Atmosphere Stardust', icon: '✨' },
      { kind: 'particlefield', label: 'Particle Field', icon: '🌌' },
      { kind: 'orbit', label: 'Orbital Ring', icon: '🪐' },
      { kind: 'constellation', label: 'Constellation Map', icon: '🌟' },
      { kind: 'mask', label: 'Shape Mask', icon: '🎭' },
    ],
  },
];

export function InsertPanel({ sceneId, selectedNodeId, dispatch }: InsertPanelProps) {
  const handleInsert = (kind: SceneNodeKind) => {
    const defaults = NodeDefaults.create(kind);
    dispatch({
      type: 'SG_CREATE_NODE',
      sceneId,
      kind,
      parentId: selectedNodeId || undefined,
      defaults,
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#090D1A',
        borderLeft: '1px solid rgba(223, 186, 107, 0.15)',
        overflowY: 'auto',
        width: '100%',
        color: '#fff',
        fontSize: '0.78rem',
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          fontWeight: 700,
          color: '#DFBA6B',
          position: 'sticky',
          top: 0,
          background: '#090D1A',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>Insert Library</span>
        <span style={{ fontSize: '0.66rem', color: '#94A3B8' }}>Click or Drag to Canvas</span>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {CATEGORIES.map((category) => (
          <div key={category.label} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3
              style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                color: '#94A3B8',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                margin: 0,
              }}
            >
              {category.label}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
              {category.items.map((item) => (
                <button
                  key={item.kind}
                  onClick={() => handleInsert(item.kind)}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/orbitox-node-kind', item.kind);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '10px 8px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#E2E8F0',
                    cursor: 'grab',
                    transition: 'all 0.15s ease',
                    textAlign: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(223, 186, 107, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(223, 186, 107, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  }}
                >
                  <span style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{item.icon}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, lineHeight: 1.2 }}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <div
          style={{
            marginTop: '8px',
            padding: '12px',
            borderRadius: '8px',
            background: 'rgba(223, 186, 107, 0.06)',
            border: '1px dashed rgba(223, 186, 107, 0.25)',
            fontSize: '0.7rem',
            color: '#CBD5E1',
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: '#DFBA6B' }}>True Authoring Principle:</strong> Drag elements directly onto the canvas to insert into flex stacks or absolute freeform coordinates.
        </div>
      </div>
    </div>
  );
}
