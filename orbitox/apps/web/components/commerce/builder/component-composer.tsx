'use client';

import React, { useState } from 'react';
import {
  CustomComponentDefinition,
  PrimitiveBlock,
  PrimitiveBlockType,
  ExposedSetting,
  commerceEngine,
} from '@orbitox/commerce';
import { CustomComponentRenderer } from '@/components/storefront/custom-component-renderer';

export interface ComponentComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (savedComponent: CustomComponentDefinition) => void;
  editingComponent?: CustomComponentDefinition | null;
}

export function ComponentComposer({
  isOpen,
  onClose,
  onSave,
  editingComponent,
}: ComponentComposerProps) {
  const [composerTab, setComposerTab] = useState<'primitives' | 'templates'>('primitives');
  const [componentName, setComponentName] = useState<string>(
    editingComponent?.name || 'Custom Atelier Block'
  );
  const [componentIcon, setComponentIcon] = useState<string>(
    editingComponent?.icon || '👑'
  );
  const [componentDesc, setComponentDesc] = useState<string>(
    editingComponent?.description || 'Hand-crafted bespoke component built visually without code.'
  );

  const [blocks, setBlocks] = useState<PrimitiveBlock[]>(() => {
    if (editingComponent?.blocks && editingComponent.blocks.length > 0) {
      return JSON.parse(JSON.stringify(editingComponent.blocks));
    }
    return [
      {
        id: `blk_cont_${Date.now()}`,
        type: 'container',
        label: 'Section Container',
        style: {
          padding: '36px 24px',
          background: 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(122,17,19,0.25))',
          borderRadius: '16px',
          border: '1px solid rgba(212,175,55,0.3)',
          textAlign: 'center',
          alignItems: 'center',
          gap: '14px',
        },
        properties: {},
        children: [
          {
            id: `blk_badge_${Date.now() + 1}`,
            type: 'badge',
            label: 'Badge Chip',
            properties: { text: '✨ HANDCRAFTED EXCLUSIVITY' },
            style: {
              background: 'rgba(212,175,55,0.2)',
              color: '#D4AF37',
              padding: '4px 14px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: '800',
            },
          },
          {
            id: `blk_heading_${Date.now() + 2}`,
            type: 'text',
            label: 'Heading',
            properties: { text: 'Bespoke Bridal Zardozi Atelier', tag: 'h2' },
            style: {
              fontSize: '28px',
              fontWeight: '900',
              color: '#FFFFFF',
            },
          },
          {
            id: `blk_sub_${Date.now() + 3}`,
            type: 'text',
            label: 'Description',
            properties: {
              text: 'Custom crafted with gold wire embroidery and pure velvet cushion soles.',
            },
            style: {
              fontSize: '14px',
              color: 'rgba(255,255,255,0.85)',
              maxWidth: '560px',
            },
          },
          {
            id: `blk_btn_${Date.now() + 4}`,
            type: 'button',
            label: 'CTA Button',
            properties: {
              text: 'Book Private Appointment',
              link: '/shop',
              icon: '👑',
            },
            style: {
              background: '#D4AF37',
              color: '#000000',
              padding: '12px 28px',
              borderRadius: '8px',
              fontWeight: '800',
              fontSize: '13px',
            },
          },
        ],
      },
    ];
  });

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [exposedSettings, setExposedSettings] = useState<ExposedSetting[]>(
    editingComponent?.exposedSettings || []
  );
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [importJsonOpen, setImportJsonOpen] = useState<boolean>(false);
  const [jsonInput, setJsonInput] = useState<string>('');

  if (!isOpen) return null;

  // Available Built-in Presets
  const presetList = commerceEngine.customComponents.listCustomComponents();

  // Find currently selected block
  const findBlockRecursive = (
    list: PrimitiveBlock[],
    id: string
  ): PrimitiveBlock | null => {
    for (const b of list) {
      if (b.id === id) return b;
      if (b.children) {
        const found = findBlockRecursive(b.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedBlock = selectedBlockId ? findBlockRecursive(blocks, selectedBlockId) : null;

  // Add a new primitive block
  const handleAddPrimitive = (type: PrimitiveBlockType) => {
    const newBlockId = `blk_${type}_${Date.now()}`;
    let newBlock: PrimitiveBlock;

    switch (type) {
      case 'text':
        newBlock = {
          id: newBlockId,
          type: 'text',
          label: 'Text Paragraph',
          properties: { text: 'New custom headline or description.', tag: 'p' },
          style: { fontSize: '14px', color: '#FFF' },
        };
        break;
      case 'button':
        newBlock = {
          id: newBlockId,
          type: 'button',
          label: 'Action Button',
          properties: { text: 'Click Here', link: '/shop', icon: '→' },
          style: {
            background: '#D4AF37',
            color: '#000',
            padding: '10px 20px',
            borderRadius: '6px',
            fontWeight: '800',
            fontSize: '12px',
          },
        };
        break;
      case 'badge':
        newBlock = {
          id: newBlockId,
          type: 'badge',
          label: 'Badge Chip',
          properties: { text: '🔥 LIMITED EDITION' },
          style: {
            background: 'rgba(212,175,55,0.2)',
            color: '#D4AF37',
            padding: '3px 10px',
            borderRadius: '999px',
            fontSize: '10px',
            fontWeight: '800',
          },
        };
        break;
      case 'countdown':
        newBlock = {
          id: newBlockId,
          type: 'countdown',
          label: '24H Countdown',
          properties: { targetDate: '2026-12-31T23:59:59', title: 'Limited Drop Offer Ends:' },
          style: { color: '#D4AF37' },
        };
        break;
      case 'star-rating':
        newBlock = {
          id: newBlockId,
          type: 'star-rating',
          label: '5-Star Review',
          properties: { rating: 5, reviewCount: 'Verified Bride' },
          style: {},
        };
        break;
      case 'accordion':
        newBlock = {
          id: newBlockId,
          type: 'accordion',
          label: 'FAQ Accordion',
          properties: {
            question: 'How long does bespoke bridal embroidery take?',
            answer: 'Each bridal pair is handcrafted by master karigars taking 3-4 weeks for complete silver wire embroidery.',
          },
          style: {},
        };
        break;
      case 'card':
      case 'pricing-card':
        newBlock = {
          id: newBlockId,
          type: 'card',
          label: 'Card Block',
          properties: {
            icon: '👑',
            title: 'Feature Title',
            subtitle: 'Detailed benefit description.',
          },
          style: {
            padding: '18px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.1)',
            textAlign: 'center',
            alignItems: 'center',
          },
        };
        break;
      case 'image':
        newBlock = {
          id: newBlockId,
          type: 'image',
          label: 'Image',
          properties: {
            url: 'https://images.unsplash.com/photo-1549439602-43ebca2327af?q=80&w=800&auto=format&fit=crop',
            altText: 'Custom Image',
            height: '220px',
          },
          style: { borderRadius: '10px' },
        };
        break;
      case 'columns':
        newBlock = {
          id: newBlockId,
          type: 'columns',
          label: '2-Column Grid',
          properties: { columnCount: 2 },
          style: { gap: '14px', padding: '10px 0' },
          children: [
            {
              id: `blk_col_a_${Date.now()}`,
              type: 'card',
              label: 'Column 1',
              properties: { icon: '✨', title: 'Pillar 1', subtitle: 'Details on column 1' },
              style: { padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' },
            },
            {
              id: `blk_col_b_${Date.now() + 1}`,
              type: 'card',
              label: 'Column 2',
              properties: { icon: '⚡', title: 'Pillar 2', subtitle: 'Details on column 2' },
              style: { padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' },
            },
          ],
        };
        break;
      case 'spacer':
        newBlock = {
          id: newBlockId,
          type: 'spacer',
          label: 'Spacer',
          properties: { height: '32px' },
          style: {},
        };
        break;
      case 'divider':
        newBlock = {
          id: newBlockId,
          type: 'divider',
          label: 'Divider Line',
          properties: { color: 'rgba(212,175,55,0.3)' },
          style: {},
        };
        break;
      default:
        newBlock = {
          id: newBlockId,
          type,
          label: `${type} Block`,
          properties: {},
          style: {},
        };
    }

    setBlocks((prev) => [...prev, newBlock]);
    setSelectedBlockId(newBlock.id);
  };

  // Load a Pre-composed Template
  const handleLoadTemplate = (templateDef: CustomComponentDefinition) => {
    setBlocks(JSON.parse(JSON.stringify(templateDef.blocks)));
    setComponentName(templateDef.name);
    setComponentIcon(templateDef.icon);
    setComponentDesc(templateDef.description);
    setExposedSettings(templateDef.exposedSettings || []);
  };

  // Update a block's properties or styles
  const updateBlock = (
    blockId: string,
    updates: { properties?: Record<string, any>; style?: Record<string, any> }
  ) => {
    const updateRecursive = (list: PrimitiveBlock[]): PrimitiveBlock[] => {
      return list.map((b) => {
        if (b.id === blockId) {
          return {
            ...b,
            properties: updates.properties ? { ...b.properties, ...updates.properties } : b.properties,
            style: updates.style ? { ...b.style, ...updates.style } : b.style,
          };
        }
        if (b.children) {
          return { ...b, children: updateRecursive(b.children) };
        }
        return b;
      });
    };

    setBlocks(updateRecursive(blocks));
  };

  // Delete a block
  const deleteBlock = (blockId: string) => {
    const deleteRecursive = (list: PrimitiveBlock[]): PrimitiveBlock[] => {
      return list
        .filter((b) => b.id !== blockId)
        .map((b) => (b.children ? { ...b, children: deleteRecursive(b.children) } : b));
    };

    setBlocks(deleteRecursive(blocks));
    if (selectedBlockId === blockId) setSelectedBlockId(null);
  };

  // Duplicate a block
  const duplicateBlock = (blockId: string) => {
    const block = findBlockRecursive(blocks, blockId);
    if (!block) return;
    const clone: PrimitiveBlock = {
      ...JSON.parse(JSON.stringify(block)),
      id: `blk_${block.type}_copy_${Date.now()}`,
      label: `${block.label} (Copy)`,
    };
    setBlocks((prev) => [...prev, clone]);
    setSelectedBlockId(clone.id);
  };

  // Toggle "Expose as Setting" for a block property
  const toggleExposeSetting = (blockId: string, propertyKey: string, label: string) => {
    const exists = exposedSettings.find(
      (e) => e.blockId === blockId && e.propertyKey === propertyKey
    );
    if (exists) {
      setExposedSettings(exposedSettings.filter((e) => e.id !== exists.id));
    } else {
      const block = findBlockRecursive(blocks, blockId);
      const val = block?.properties[propertyKey] || '';
      setExposedSettings([
        ...exposedSettings,
        {
          id: `exp_${blockId}_${propertyKey}`,
          blockId,
          propertyKey,
          label,
          type: typeof val === 'number' ? 'number' : 'text',
          defaultValue: val,
        },
      ]);
    }
  };

  // Save the custom component definition
  const handleSaveComponent = () => {
    const saved = commerceEngine.customComponents.saveCustomComponent({
      id: editingComponent?.id || `comp_${Date.now()}`,
      type: editingComponent?.type || `custom_${Date.now()}`,
      name: componentName.trim() || 'Custom Component',
      icon: componentIcon || '👑',
      description: componentDesc.trim(),
      category: 'custom',
      blocks,
      exposedSettings,
      defaultSettings: {},
      createdAt: editingComponent?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    onSave(saved);
    onClose();
  };

  // Mock live definition for preview
  const livePreviewDef: CustomComponentDefinition = {
    id: 'preview',
    type: 'custom_preview',
    name: componentName,
    icon: componentIcon,
    description: componentDesc,
    category: 'custom',
    blocks,
    exposedSettings,
    defaultSettings: {},
    createdAt: '',
    updatedAt: '',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(5, 5, 8, 0.95)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        color: '#FFF',
        fontFamily: 'var(--orb-font-body, "Plus Jakarta Sans", sans-serif)',
      }}
    >
      {/* ─── TOP BAR ────────────────────────────────────────────── */}
      <div
        style={{
          padding: '12px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(20, 20, 24, 0.9)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>{componentIcon}</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                value={componentName}
                onChange={(e) => setComponentName(e.target.value)}
                placeholder="Component Name..."
                style={{
                  background: 'transparent',
                  border: '1px dashed rgba(212, 175, 55, 0.4)',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  color: '#D4AF37',
                  fontSize: '15px',
                  fontWeight: 900,
                  outline: 'none',
                }}
              />
              <span
                style={{
                  fontSize: '10px',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: 'rgba(212, 175, 55, 0.2)',
                  color: '#D4AF37',
                  fontWeight: 800,
                }}
              >
                NO-CODE LEGO FACTORY
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
              Compose blocks, countdowns, accordions & review cards without coding.
            </span>
          </div>
        </div>

        {/* Device Switcher & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              background: 'rgba(0, 0, 0, 0.6)',
              borderRadius: '6px',
              padding: '2px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <button
              type="button"
              onClick={() => setPreviewDevice('desktop')}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                border: 'none',
                background: previewDevice === 'desktop' ? '#D4AF37' : 'transparent',
                color: previewDevice === 'desktop' ? '#000' : '#FFF',
                fontWeight: 700,
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              🖥️ Desktop
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('mobile')}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                border: 'none',
                background: previewDevice === 'mobile' ? '#D4AF37' : 'transparent',
                color: previewDevice === 'mobile' ? '#000' : '#FFF',
                fontWeight: 700,
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              📱 Mobile
            </button>
          </div>

          {/* Export / Import JSON */}
          <button
            type="button"
            onClick={() => setImportJsonOpen(true)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#FFF',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            📦 JSON
          </button>

          {/* Save Component */}
          <button
            type="button"
            onClick={handleSaveComponent}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #D4AF37, #F59E0B)',
              color: '#000',
              fontWeight: 900,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 0 16px rgba(212, 175, 55, 0.4)',
            }}
          >
            💾 Save to Palette
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#EF4444',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* ─── 3-COLUMN WORKSPACE ──────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* LEFT PANEL: Primitive Block Library & Templates */}
        <div
          style={{
            width: '280px',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            overflowY: 'auto',
            background: 'rgba(15, 15, 18, 0.8)',
            flexShrink: 0,
          }}
        >
          {/* Sub-tabs: Primitives vs Templates */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.5)', padding: '2px', borderRadius: '6px' }}>
            <button
              type="button"
              onClick={() => setComposerTab('primitives')}
              style={{
                flex: 1,
                padding: '6px',
                borderRadius: '5px',
                border: 'none',
                background: composerTab === 'primitives' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                color: composerTab === 'primitives' ? '#FFF' : 'rgba(255, 255, 255, 0.5)',
                fontWeight: 800,
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              🧱 LEGO Primitives
            </button>
            <button
              type="button"
              onClick={() => setComposerTab('templates')}
              style={{
                flex: 1,
                padding: '6px',
                borderRadius: '5px',
                border: 'none',
                background: composerTab === 'templates' ? 'linear-gradient(135deg, #D4AF37, #F59E0B)' : 'transparent',
                color: composerTab === 'templates' ? '#000' : 'rgba(255, 255, 255, 0.5)',
                fontWeight: 900,
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              ✨ Templates ({presetList.length})
            </button>
          </div>

          {composerTab === 'primitives' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { type: 'text', icon: '📝', label: 'Text' },
                { type: 'button', icon: '🔘', label: 'Button' },
                { type: 'badge', icon: '🏷️', label: 'Badge' },
                { type: 'countdown', icon: '⏱️', label: 'Timer' },
                { type: 'star-rating', icon: '⭐', label: 'Reviews' },
                { type: 'accordion', icon: '📋', label: 'Accordion' },
                { type: 'card', icon: '🃏', label: 'Card' },
                { type: 'image', icon: '🖼️', label: 'Image' },
                { type: 'columns', icon: '⫿⫿', label: 'Columns' },
                { type: 'container', icon: '📦', label: 'Container' },
                { type: 'spacer', icon: '↕️', label: 'Spacer' },
                { type: 'divider', icon: '➖', label: 'Divider' },
              ].map((prim) => (
                <button
                  key={prim.type}
                  type="button"
                  onClick={() => handleAddPrimitive(prim.type as any)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '10px 8px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#FFF',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{prim.icon}</span>
                  <span>{prim.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {presetList.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => handleLoadTemplate(preset)}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(212, 175, 55, 0.06)',
                    border: '1px solid rgba(212, 175, 55, 0.25)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{preset.icon}</span>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#FFF' }}>{preset.name}</span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                    {preset.description}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Block Hierarchy List */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '12px', marginTop: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#AAA', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              Blocks Tree ({blocks.length})
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {blocks.map((b, idx) => (
                <div
                  key={b.id}
                  onClick={() => setSelectedBlockId(b.id)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    background: selectedBlockId === b.id ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                    border: selectedBlockId === b.id ? '1px solid #D4AF37' : '1px solid rgba(255, 255, 255, 0.06)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>#{idx + 1} {b.label}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateBlock(b.id);
                      }}
                      title="Duplicate Block"
                      style={{ background: 'none', border: 'none', color: '#AAA', cursor: 'pointer', fontSize: '10px' }}
                    >
                      📋
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteBlock(b.id);
                      }}
                      style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '11px' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER PANEL: Live Interactive Preview Canvas */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: '#09090C',
          }}
        >
          <div
            style={{
              width: previewDevice === 'desktop' ? '100%' : '390px',
              maxWidth: previewDevice === 'desktop' ? '1080px' : '390px',
              minHeight: '400px',
              borderRadius: '16px',
              background: '#000',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
              padding: '24px',
              position: 'relative',
              transition: 'max-width 0.3s ease',
            }}
          >
            <CustomComponentRenderer definition={livePreviewDef} />
          </div>
        </div>

        {/* RIGHT PANEL: Block Inspector & Visual Styler */}
        <div
          style={{
            width: '320px',
            borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overflowY: 'auto',
            background: 'rgba(15, 15, 18, 0.8)',
            flexShrink: 0,
          }}
        >
          {selectedBlock ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#D4AF37' }}>
                  ⚙️ {selectedBlock.label}
                </span>
                <span style={{ fontSize: '10px', color: '#888' }}>ID: {selectedBlock.id.slice(0, 10)}</span>
              </div>

              {/* Property: Text */}
              {selectedBlock.properties.text !== undefined && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '10px', color: '#AAA', fontWeight: 700, textTransform: 'uppercase' }}>
                      Text Content
                    </label>
                    <label style={{ fontSize: '10px', color: '#D4AF37', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="checkbox"
                        checked={exposedSettings.some((e) => e.blockId === selectedBlock.id && e.propertyKey === 'text')}
                        onChange={() => toggleExposeSetting(selectedBlock.id, 'text', 'Custom Text')}
                      />
                      Expose Setting
                    </label>
                  </div>
                  <textarea
                    rows={3}
                    value={selectedBlock.properties.text || ''}
                    onChange={(e) => updateBlock(selectedBlock.id, { properties: { text: e.target.value } })}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFF',
                      fontSize: '12px',
                    }}
                  />
                </div>
              )}

              {/* Property: Button Link */}
              {selectedBlock.properties.link !== undefined && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', color: '#AAA', fontWeight: 700, textTransform: 'uppercase' }}>
                    Button Link / URL
                  </label>
                  <input
                    type="text"
                    value={selectedBlock.properties.link || ''}
                    onChange={(e) => updateBlock(selectedBlock.id, { properties: { link: e.target.value } })}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFF',
                      fontSize: '12px',
                    }}
                  />
                </div>
              )}

              {/* Style Controls: Background & Gradient */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', color: '#AAA', fontWeight: 700, textTransform: 'uppercase' }}>
                  Background / Gradient
                </label>
                <input
                  type="text"
                  placeholder="#000 or linear-gradient(...)"
                  value={selectedBlock.style.background || ''}
                  onChange={(e) => updateBlock(selectedBlock.id, { style: { background: e.target.value } })}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFF',
                    fontSize: '12px',
                  }}
                />
              </div>

              {/* Style Controls: Padding & Radius */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', color: '#AAA', fontWeight: 700, textTransform: 'uppercase' }}>
                    Padding
                  </label>
                  <input
                    type="text"
                    placeholder="24px or 12px 24px"
                    value={selectedBlock.style.padding || ''}
                    onChange={(e) => updateBlock(selectedBlock.id, { style: { padding: e.target.value } })}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFF',
                      fontSize: '11px',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', color: '#AAA', fontWeight: 700, textTransform: 'uppercase' }}>
                    Border Radius
                  </label>
                  <input
                    type="text"
                    placeholder="12px or 999px"
                    value={selectedBlock.style.borderRadius || ''}
                    onChange={(e) => updateBlock(selectedBlock.id, { style: { borderRadius: e.target.value } })}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFF',
                      fontSize: '11px',
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '24px 8px', textAlign: 'center', color: '#666', fontSize: '12px' }}>
              Click any block in the canvas or tree on the left to edit its properties, gradient, padding, and animations.
            </div>
          )}
        </div>
      </div>

      {/* JSON Import/Export Modal */}
      {importJsonOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            style={{
              width: '560px',
              background: '#161619',
              borderRadius: '12px',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#D4AF37' }}>
                📦 Export / Import Component Schema JSON
              </span>
              <button
                type="button"
                onClick={() => setImportJsonOpen(false)}
                style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <textarea
              rows={12}
              value={jsonInput || JSON.stringify(livePreviewDef, null, 2)}
              onChange={(e) => setJsonInput(e.target.value)}
              style={{
                width: '100%',
                background: '#09090C',
                color: '#4ADE80',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '12px',
                fontFamily: 'monospace',
                fontSize: '11px',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  try {
                    const imported = commerceEngine.customComponents.importComponentJson(jsonInput);
                    setBlocks(imported.blocks);
                    setComponentName(imported.name);
                    setImportJsonOpen(false);
                  } catch (e: any) {
                    alert('Invalid JSON: ' + e.message);
                  }
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  background: '#D4AF37',
                  color: '#000',
                  fontWeight: 800,
                  fontSize: '12px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                📥 Load from JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
