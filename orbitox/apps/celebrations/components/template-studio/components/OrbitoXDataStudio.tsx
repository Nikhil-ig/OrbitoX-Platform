'use client';

import React, { useState } from 'react';
import { Database, Plus, Trash2, Tag, List, ToggleLeft, ToggleRight, Check } from 'lucide-react';

export interface ProjectVariable {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'color';
  value: any;
  description: string;
}

export interface CMSCollection {
  id: string;
  name: string;
  slug: string;
  count: number;
  schema: string[];
}

export function OrbitoXDataStudio() {
  const [activeTab, setActiveTab] = useState<'variables' | 'cms'>('variables');

  const [variables, setVariables] = useState<ProjectVariable[]>([
    { key: 'themeMode', type: 'string', value: 'dark', description: 'Global design system mode (dark/light)' },
    { key: 'menuOpen', type: 'boolean', value: false, description: 'Mobile navigation drawer state' },
    { key: 'selectedPlan', type: 'string', value: 'pro', description: 'Active selected pricing tier' },
    { key: 'guestCount', type: 'number', value: 180, description: 'Dynamic RSVP attendance count' },
    { key: 'primaryGlow', type: 'color', value: '#DFBA6B', description: 'Dynamic neon glow token' },
  ]);

  const [newVarKey, setNewVarKey] = useState('');
  const [newVarType, setNewVarType] = useState<ProjectVariable['type']>('string');

  const [collections, setCollections] = useState<CMSCollection[]>([
    { id: 'col-1', name: 'Testimonials & Reviews', slug: 'testimonials', count: 12, schema: ['author', 'quote', 'avatar', 'rating'] },
    { id: 'col-2', name: 'Celebration Timeline Events', slug: 'timeline-events', count: 6, schema: ['time', 'title', 'location', 'description'] },
    { id: 'col-3', name: 'Featured Products / Gifts', slug: 'products', count: 8, schema: ['title', 'price', 'image', 'link'] },
    { id: 'col-4', name: 'Speaker & Team Profiles', slug: 'team', count: 5, schema: ['name', 'role', 'bio', 'photo'] },
  ]);

  const handleAddVariable = () => {
    if (!newVarKey.trim()) return;
    const initialVal = newVarType === 'boolean' ? false : newVarType === 'number' ? 0 : '';
    setVariables((prev) => [
      ...prev,
      {
        key: newVarKey.trim().replace(/\s+/g, '_'),
        type: newVarType,
        value: initialVal,
        description: 'Custom user variable',
      },
    ]);
    setNewVarKey('');
  };

  const handleDeleteVariable = (key: string) => {
    setVariables((prev) => prev.filter((v) => v.key !== key));
  };

  return (
    <div style={{ padding: '20px', color: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <Database size={18} style={{ color: '#DFBA6B' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Data & Variables Studio</h3>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.4 }}>
          Connect design to logic. Bind text, visibility, and animations to project variables or dynamic CMS collections.
        </p>
      </div>

      {/* Mode Tabs */}
      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '3px' }}>
        <button
          onClick={() => setActiveTab('variables')}
          style={{
            flex: 1,
            padding: '6px',
            borderRadius: '6px',
            border: 'none',
            background: activeTab === 'variables' ? 'rgba(223, 186, 107, 0.25)' : 'transparent',
            color: activeTab === 'variables' ? '#DFBA6B' : 'rgba(255,255,255,0.6)',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Project Variables
        </button>
        <button
          onClick={() => setActiveTab('cms')}
          style={{
            flex: 1,
            padding: '6px',
            borderRadius: '6px',
            border: 'none',
            background: activeTab === 'cms' ? 'rgba(223, 186, 107, 0.25)' : 'transparent',
            color: activeTab === 'cms' ? '#DFBA6B' : 'rgba(255,255,255,0.6)',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          CMS Collections
        </button>
      </div>

      {/* ── VARIABLES TAB ── */}
      {activeTab === 'variables' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Add Variable input */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Variable name (e.g. promoActive)"
              value={newVarKey}
              onChange={(e) => setNewVarKey(e.target.value)}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                color: '#FFFFFF',
                padding: '6px 10px',
                fontSize: '0.75rem',
                outline: 'none',
              }}
            />
            <select
              value={newVarType}
              onChange={(e) => setNewVarType(e.target.value as any)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                color: '#FFFFFF',
                padding: '6px 8px',
                fontSize: '0.72rem',
                outline: 'none',
              }}
            >
              <option value="string" style={{ background: '#090D1A' }}>string</option>
              <option value="number" style={{ background: '#090D1A' }}>number</option>
              <option value="boolean" style={{ background: '#090D1A' }}>boolean</option>
              <option value="color" style={{ background: '#090D1A' }}>color</option>
            </select>
            <button
              onClick={handleAddVariable}
              style={{
                background: '#DFBA6B',
                color: '#060B1A',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Add
            </button>
          </div>

          {/* Variables List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {variables.map((v) => (
              <div
                key={v.key}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <code style={{ fontSize: '0.78rem', color: '#DFBA6B', fontWeight: 600 }}>{v.key}</code>
                    <span style={{ fontSize: '0.62rem', background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px', color: 'rgba(255,255,255,0.5)' }}>
                      {v.type}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>{v.description}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {v.type === 'boolean' ? (
                    <button
                      onClick={() =>
                        setVariables((prev) =>
                          prev.map((item) => (item.key === v.key ? { ...item, value: !item.value } : item))
                        )
                      }
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: v.value ? '#10B981' : 'rgba(255,255,255,0.3)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      {v.value ? 'true' : 'false'}
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#FFFFFF' }}>
                      {String(v.value)}
                    </span>
                  )}

                  <button
                    onClick={() => handleDeleteVariable(v.key)}
                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CMS COLLECTIONS TAB ── */}
      {activeTab === 'cms' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {collections.map((col) => (
            <div
              key={col.id}
              style={{
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF' }}>{col.name}</span>
                <span style={{ fontSize: '0.7rem', color: '#DFBA6B', background: 'rgba(223, 186, 107, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                  {col.count} items
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {col.schema.map((field) => (
                  <span
                    key={field}
                    style={{
                      fontSize: '0.65rem',
                      background: 'rgba(255,255,255,0.06)',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      color: 'rgba(255,255,255,0.6)',
                    }}
                  >
                    .{field}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
