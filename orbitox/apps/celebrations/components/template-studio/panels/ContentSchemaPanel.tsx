'use client';

import React, { useState, useEffect } from 'react';
import {
  TemplateSchema,
  ContentFieldDefinition,
  FieldDataType,
  CustomizationLevel,
  MediaSlotDefinition,
  MediaShapeVariant,
} from '../types/TemplateSchema';
import {
  FileCode2,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Check,
  Search,
  Filter,
  Type,
  Image,
  Calendar,
  Clock,
  Palette,
  Layers,
  Crop,
  Sparkles,
  Smartphone,
  Tablet,
  Monitor,
  AlertCircle,
} from 'lucide-react';
import { MediaSlotEditor } from '../components/MediaSlotEditor';

interface ContentSchemaPanelProps {
  schema: TemplateSchema;
  initialTab?: 'fields' | 'media';
  onUpdateField: (fieldId: string, patch: Partial<ContentFieldDefinition>) => void;
  onAddField: (field: ContentFieldDefinition) => void;
  onDeleteField: (fieldId: string) => void;
  onSelectField?: (fieldKey: string) => void;
  onUpdateMediaSlot?: (slotId: string, patch: Partial<MediaSlotDefinition>) => void;
}

export function ContentSchemaPanel({
  schema,
  initialTab = 'fields',
  onUpdateField,
  onAddField,
  onDeleteField,
  onSelectField,
  onUpdateMediaSlot,
}: ContentSchemaPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'fields' | 'media'>(initialTab);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isNewFieldModalOpen, setIsNewFieldModalOpen] = useState(false);

  useEffect(() => {
    if (initialTab) setActiveSubTab(initialTab);
  }, [initialTab]);

  // New field state with smart defaults
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<FieldDataType>('text');
  const [newRequired, setNewRequired] = useState(true);
  const [newEditable, setNewEditable] = useState(true);
  const [newLevel, setNewLevel] = useState<CustomizationLevel>('FLEXIBLE');
  const [smartSuggestion, setSmartSuggestion] = useState<string | null>(null);

  // Smart defaults evaluator when user types label
  const handleLabelChange = (label: string) => {
    setNewLabel(label);
    const lower = label.toLowerCase();

    // Auto-generate key
    const generatedKey = 'celebration.' + lower.replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    setNewKey(generatedKey);

    // Smart inference
    if (lower.includes('date') || lower.includes('day') || lower.includes('anniversary')) {
      setNewType('date');
      setNewRequired(true);
      setNewEditable(true);
      setNewLevel('FLEXIBLE');
      setSmartSuggestion('Date field inferred: localized date display and calendar sync');
    } else if (lower.includes('photo') || lower.includes('image') || lower.includes('portrait') || lower.includes('picture')) {
      setNewType('image');
      setNewRequired(true);
      setNewEditable(true);
      setNewLevel('FLEXIBLE');
      setSmartSuggestion('Image slot inferred: auto-connects to visual media cropping engine');
    } else if (lower.includes('story') || lower.includes('bio') || lower.includes('vow') || lower.includes('description') || lower.includes('blessing')) {
      setNewType('longtext');
      setNewRequired(false);
      setNewEditable(true);
      setNewLevel('FLEXIBLE');
      setSmartSuggestion('Longtext inferred: multi-line rich text supported');
    } else if (lower.includes('time') || lower.includes('hour') || lower.includes('muhurat')) {
      setNewType('time');
      setNewRequired(true);
      setNewEditable(true);
      setSmartSuggestion('Time field inferred: localized 12h/24h ceremonial clock');
    } else if (lower.includes('font') || lower.includes('typography')) {
      setNewType('font');
      setNewEditable(true);
      setNewLevel('CURATED');
      setSmartSuggestion('Curated typography inferred: customer chooses from luxury font pairings');
    } else {
      setSmartSuggestion(null);
    }
  };

  const filteredFields = schema.contentSchema.filter((fld) => {
    const matchesSearch =
      fld.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fld.key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || fld.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleCreateField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newLabel.trim()) return;

    const created: ContentFieldDefinition = {
      id: `fld_${Date.now()}`,
      key: newKey.trim(),
      label: newLabel.trim(),
      type: newType,
      required: newRequired,
      defaultValue: '',
      customerEditable: newEditable,
      customizationLevel: newLevel,
    };

    onAddField(created);
    setIsNewFieldModalOpen(false);
    setNewKey('');
    setNewLabel('');
    setSmartSuggestion(null);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', color: '#fff' }}>
      {/* Top Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 4px 0' }}>
            Content Contract & Media Slots
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--cel-text-muted, #94A3B8)' }}>
            Define what data this template requires and what customers are safely permitted to customize.
          </span>
        </div>

        {activeSubTab === 'fields' && (
          <button
            onClick={() => setIsNewFieldModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #DFBA6B, #C29B47)',
              border: 'none',
              color: '#050B14',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            <Plus size={14} />
            <span>Add Schema Field</span>
          </button>
        )}
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '8px',
        }}
      >
        <button
          onClick={() => setActiveSubTab('fields')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: activeSubTab === 'fields' ? 'rgba(223, 186, 107, 0.18)' : 'transparent',
            color: activeSubTab === 'fields' ? '#DFBA6B' : 'var(--cel-text-muted, #94A3B8)',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <FileCode2 size={15} />
          <span>Content Fields ({schema.contentSchema.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('media')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: activeSubTab === 'media' ? 'rgba(223, 186, 107, 0.18)' : 'transparent',
            color: activeSubTab === 'media' ? '#DFBA6B' : 'var(--cel-text-muted, #94A3B8)',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Crop size={15} />
          <span>Media Slots & Crops ({schema.mediaSlots.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. CONTENT FIELDS TAB                                                     */}
      {/* ========================================================================= */}
      {activeSubTab === 'fields' && (
        <>
          {/* Filter and Search Bar */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '16px',
              background: 'rgba(255, 255, 255, 0.02)',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <Search size={14} color="var(--cel-text-dim, #64748B)" />
              <input
                type="text"
                placeholder="Search fields by label or key..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: '0.8rem',
                  width: '100%',
                }}
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                background: '#070B16',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#CBD5E1',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.78rem',
              }}
            >
              <option value="all">All Types ({schema.contentSchema.length})</option>
              <option value="text">Text</option>
              <option value="longtext">Long Text</option>
              <option value="image">Image</option>
              <option value="date">Date</option>
              <option value="time">Time</option>
              <option value="font">Font</option>
            </select>
          </div>

          {/* Fields Table / Card Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredFields.map((field) => (
              <div
                key={field.id}
                onClick={() => onSelectField && onSelectField(field.key)}
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: 'rgba(13, 20, 41, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Field Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(223, 186, 107, 0.1)',
                      border: '1px solid rgba(223, 186, 107, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#DFBA6B',
                    }}
                  >
                    {field.type === 'text' && <Type size={15} />}
                    {field.type === 'longtext' && <FileCode2 size={15} />}
                    {field.type === 'image' && <Image size={15} />}
                    {field.type === 'date' && <Calendar size={15} />}
                    {field.type === 'time' && <Clock size={15} />}
                    {field.type === 'font' && <Palette size={15} />}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '0.88rem', color: '#fff' }}>{field.label}</strong>
                      <code style={{ fontSize: '0.7rem', color: '#38BDF8', background: 'rgba(56, 189, 248, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                        {field.key}
                      </code>
                      {field.required && (
                        <span style={{ fontSize: '0.64rem', color: '#EF4444', fontWeight: 700 }}>*Required</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--cel-text-muted, #94A3B8)', marginTop: '2px' }}>
                      Default: <span style={{ color: '#E2E8F0' }}>{field.defaultValue || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Right Side Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
                  {/* Customization Badge */}
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background:
                        field.customizationLevel === 'LOCKED'
                          ? 'rgba(148, 163, 184, 0.15)'
                          : field.customizationLevel === 'CURATED'
                          ? 'rgba(56, 189, 248, 0.15)'
                          : 'rgba(16, 185, 129, 0.15)',
                      color:
                        field.customizationLevel === 'LOCKED'
                          ? '#94A3B8'
                          : field.customizationLevel === 'CURATED'
                          ? '#38BDF8'
                          : '#10B981',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    {field.customizationLevel === 'LOCKED' ? '🔒 Locked' : field.customizationLevel === 'CURATED' ? '◈ Curated' : '✎ Customer Editable'}
                  </span>

                  <button
                    onClick={() => onDeleteField(field.id)}
                    title="Delete Field"
                    style={{
                      padding: '6px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#EF4444',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 2. MEDIA SLOTS & CROPS TAB                                                */}
      {/* ========================================================================= */}
      {activeSubTab === 'media' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              padding: '14px',
              borderRadius: '10px',
              background: 'rgba(223, 186, 107, 0.06)',
              border: '1px solid rgba(223, 186, 107, 0.2)',
              fontSize: '0.78rem',
              color: '#DFBA6B',
              lineHeight: 1.5,
            }}
          >
            <strong>Visual Media Slot Architecture:</strong> Each media slot specifies visual cropping rules, focal point defaults, allowed file formats, and responsive overrides. Customers upload once; the engine crops appropriately for Desktop, Tablet, and Mobile.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
            {schema.mediaSlots.map((slot) => (
              <MediaSlotEditor
                key={slot.id}
                slot={slot}
                contentField={schema.contentSchema.find((f) => f.key === slot.slotKey)}
                onUpdateSlot={onUpdateMediaSlot || (() => {})}
                onUpdateField={onUpdateField}
              />
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NEW FIELD MODAL (WITH SMART DEFAULTS)                                     */}
      {/* ========================================================================= */}
      {isNewFieldModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: '460px',
              background: '#0D1429',
              border: '1px solid rgba(223, 186, 107, 0.3)',
              borderRadius: '14px',
              padding: '24px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="#DFBA6B" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                  Add Content Schema Field
                </h3>
              </div>
              <button
                onClick={() => setIsNewFieldModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateField} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--cel-text-muted, #94A3B8)', marginBottom: '4px' }}>
                  Field Label (What should the customer or admin see?)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Celebration Date, Couple Bio, Audio Title..."
                  value={newLabel}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: '#070B16',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    fontSize: '0.82rem',
                  }}
                />
              </div>

              {/* Smart Suggestion Pill */}
              {smartSuggestion && (
                <div
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'rgba(223, 186, 107, 0.1)',
                    border: '1px solid rgba(223, 186, 107, 0.3)',
                    fontSize: '0.72rem',
                    color: '#DFBA6B',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Sparkles size={13} />
                  <span>{smartSuggestion}</span>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--cel-text-muted, #94A3B8)', marginBottom: '4px' }}>
                  Canonical JSON Key
                </label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: '#070B16',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#38BDF8',
                    fontFamily: 'monospace',
                    fontSize: '0.78rem',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--cel-text-muted, #94A3B8)', marginBottom: '4px' }}>
                    Data Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as FieldDataType)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      background: '#070B16',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff',
                      fontSize: '0.8rem',
                    }}
                  >
                    <option value="text">Text</option>
                    <option value="longtext">Long Text</option>
                    <option value="richtext">Rich Text</option>
                    <option value="image">Image</option>
                    <option value="date">Date</option>
                    <option value="time">Time</option>
                    <option value="font">Font</option>
                    <option value="boolean">Boolean (Toggle)</option>
                    <option value="select">Curated Select</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--cel-text-muted, #94A3B8)', marginBottom: '4px' }}>
                    Customization Level
                  </label>
                  <select
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value as CustomizationLevel)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      background: '#070B16',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#DFBA6B',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                    }}
                  >
                    <option value="FLEXIBLE">FLEXIBLE (Customer edits freely)</option>
                    <option value="CURATED">CURATED (Customer chooses from presets)</option>
                    <option value="LOCKED">LOCKED (Template locked)</option>
                    <option value="ADVANCED">ADVANCED (VIP / Enterprise only)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px', padding: '6px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#CBD5E1', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newRequired}
                    onChange={(e) => setNewRequired(e.target.checked)}
                    style={{ accentColor: '#DFBA6B' }}
                  />
                  <span>Required Field</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#CBD5E1', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newEditable}
                    onChange={(e) => setNewEditable(e.target.checked)}
                    style={{ accentColor: '#DFBA6B' }}
                  />
                  <span>Customer Editable</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsNewFieldModalOpen(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#CBD5E1',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, #DFBA6B, #C29B47)',
                    border: 'none',
                    color: '#050B14',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Create Field
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
