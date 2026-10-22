import React, { useState, useMemo } from 'react';
import {
  Plus, Layers, FileText, Image as ImageIcon, Box, Search, Eye, EyeOff, Lock, Unlock,
  Trash2, ChevronRight, ChevronDown, Copy, MoreHorizontal, Sparkles, Palette, Activity,
  Database, Type, Box as Box3D, Check
} from 'lucide-react';
import { WebSectionLibrary, WebSectionBlock } from '../engine/WebSectionLibrary';
import { DomainExtensionRegistry, DomainNodeDefinition, DomainSectionBlock } from '../engine/DomainExtensions';
import { SceneNodeKind } from '../engine/SceneGraphTypes';
import { TemplateSceneDefinition } from '../types/TemplateSchema';
import { TemplateEditorCommand } from '../engine/TemplateEditorCommands';
import { DESIGN_UNIVERSES, DesignUniverseEngine, DesignUniverse } from '../engine/DesignUniverses';
import { FONT_PAIRINGS, TypographyStudioEngine, FontPairing } from '../engine/TypographyStudio';
import { OrbitoXEffectsStudio } from './OrbitoXEffectsStudio';
import { OrbitoXParallaxStudio } from './OrbitoXParallaxStudio';
import { OrbitoXDataStudio } from './OrbitoXDataStudio';

export type LeftRailTab = 'add' | 'layers' | 'pages' | 'assets' | 'components' | 'styles' | 'motion' | 'effects' | '3d' | 'data';

interface Props {
  activeTab: LeftRailTab | null;
  onTabChange: (tab: LeftRailTab | null) => void;
  // Pages & Scenes
  scenes: TemplateSceneDefinition[];
  activeSceneId: string;
  onSelectScene: (sceneId: string) => void;
  onAddScene: (sceneDef: TemplateSceneDefinition) => void;
  onDeleteScene: (sceneId: string) => void;
  // Node Selection & Actions
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onInsertNode: (kind: SceneNodeKind, name: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onToggleNodeLock?: (nodeId: string) => void;
  onToggleNodeVisibility?: (nodeId: string) => void;
  // Dispatch commands for structural mutations (reorder, reparent)
  dispatch?: (command: TemplateEditorCommand) => void;
  // Master Components
  masterComponents?: Array<{ id: string; name: string; variantCount: number }>;
  onCreateComponentInstance?: (masterId: string) => void;
  // Design Universes & Mode triggers
  onApplyUniverse?: (universeId: string) => void;
  onApplyFontPairing?: (pairingId: string) => void;
  onSwitchMode?: (mode: 'design' | 'motion' | 'prototype' | '3d') => void;
  activeUniverseId?: string;
}

function SectionPreviewThumbnail({ category }: { category: string }) {
  switch (category) {
    case 'Navbar':
      return (
        <div style={{ width: '100%', height: '52px', background: 'rgba(9, 13, 26, 0.85)', borderRadius: '5px', padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: '28px', height: '6px', background: '#DFBA6B', borderRadius: '2px' }} />
          <div style={{ display: 'flex', gap: '4px' }}>
            <div style={{ width: '14px', height: '4px', background: 'rgba(255,255,255,0.4)', borderRadius: '1px' }} />
            <div style={{ width: '14px', height: '4px', background: 'rgba(255,255,255,0.4)', borderRadius: '1px' }} />
            <div style={{ width: '14px', height: '4px', background: 'rgba(255,255,255,0.4)', borderRadius: '1px' }} />
          </div>
          <div style={{ width: '22px', height: '8px', background: '#DFBA6B', borderRadius: '2px' }} />
        </div>
      );
    case 'Hero':
      return (
        <div style={{ width: '100%', height: '52px', background: 'rgba(9, 13, 26, 0.85)', borderRadius: '5px', padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ width: '80%', height: '5px', background: '#DFBA6B', borderRadius: '2px' }} />
            <div style={{ width: '60%', height: '3px', background: 'rgba(255,255,255,0.4)', borderRadius: '2px' }} />
            <div style={{ width: '32px', height: '8px', background: '#DFBA6B', borderRadius: '3px', marginTop: '2px' }} />
          </div>
          <div style={{ width: '38px', height: '38px', borderRadius: '4px', background: 'linear-gradient(135deg, rgba(223, 186, 107, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)', border: '1px solid rgba(223, 186, 107, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#DFBA6B' }}>
            ✦
          </div>
        </div>
      );
    case 'Bento':
      return (
        <div style={{ width: '100%', height: '52px', background: 'rgba(9, 13, 26, 0.85)', borderRadius: '5px', padding: '5px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ background: 'rgba(223, 186, 107, 0.1)', border: '1px solid rgba(223, 186, 107, 0.25)', borderRadius: '3px', padding: '3px' }}>
            <div style={{ width: '12px', height: '3px', background: '#DFBA6B', borderRadius: '1px' }} />
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '3px', padding: '3px' }}>
            <div style={{ width: '12px', height: '3px', background: '#C4B5FD', borderRadius: '1px' }} />
          </div>
          <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '3px', padding: '3px' }}>
            <div style={{ width: '12px', height: '3px', background: '#38BDF8', borderRadius: '1px' }} />
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '3px', padding: '3px' }}>
            <div style={{ width: '12px', height: '3px', background: '#FFFFFF', borderRadius: '1px' }} />
          </div>
        </div>
      );
    case 'Features':
      return (
        <div style={{ width: '100%', height: '52px', background: 'rgba(9, 13, 26, 0.85)', borderRadius: '5px', padding: '5px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.05)', padding: '3px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '2px', background: '#DFBA6B' }} />
              <div style={{ width: '90%', height: '3px', background: 'rgba(255,255,255,0.5)', borderRadius: '1px' }} />
              <div style={{ width: '60%', height: '2px', background: 'rgba(255,255,255,0.3)', borderRadius: '1px' }} />
            </div>
          ))}
        </div>
      );
    case 'Pricing':
      return (
        <div style={{ width: '100%', height: '52px', background: 'rgba(9, 13, 26, 0.85)', borderRadius: '5px', padding: '5px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ background: i === 2 ? 'rgba(223,186,107,0.15)' : 'rgba(255,255,255,0.04)', borderRadius: '3px', border: i === 2 ? '1px solid #DFBA6B' : '1px solid rgba(255,255,255,0.06)', padding: '3px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
              <div style={{ width: '12px', height: '3px', background: '#DFBA6B', borderRadius: '1px' }} />
              <div style={{ width: '16px', height: '5px', background: '#FFFFFF', borderRadius: '1px' }} />
            </div>
          ))}
        </div>
      );
    case 'Testimonials':
      return (
        <div style={{ width: '100%', height: '52px', background: 'rgba(9, 13, 26, 0.85)', borderRadius: '5px', padding: '5px 8px', display: 'flex', flexDirection: 'column', gap: '3px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '9px', color: '#DFBA6B', lineHeight: 1 }}>“</div>
          <div style={{ width: '85%', height: '3px', background: 'rgba(255,255,255,0.6)', borderRadius: '1px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#DFBA6B' }} />
            <div style={{ width: '28px', height: '3px', background: 'rgba(255,255,255,0.4)', borderRadius: '1px' }} />
          </div>
        </div>
      );
    case 'FAQ':
      return (
        <div style={{ width: '100%', height: '52px', background: 'rgba(9, 13, 26, 0.85)', borderRadius: '5px', padding: '5px 8px', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
          {[1, 2].map((i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '3px', padding: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '70%', height: '3px', background: '#FFFFFF', borderRadius: '1px' }} />
              <div style={{ fontSize: '8px', color: '#DFBA6B' }}>+</div>
            </div>
          ))}
        </div>
      );
    case 'Timeline':
      return (
        <div style={{ width: '100%', height: '52px', background: 'rgba(9, 13, 26, 0.85)', borderRadius: '5px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.06)' }}>
          {['1', '2', '3', '4'].map((num) => (
            <div key={num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#DFBA6B', color: '#090D1A', fontSize: '7px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{num}</div>
              <div style={{ width: '12px', height: '2px', background: 'rgba(255,255,255,0.4)', borderRadius: '1px' }} />
            </div>
          ))}
        </div>
      );
    case 'CTA':
      return (
        <div style={{ width: '100%', height: '52px', background: 'linear-gradient(135deg, rgba(223, 186, 107, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)', borderRadius: '5px', padding: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', border: '1px solid rgba(223,186,107,0.3)' }}>
          <div style={{ width: '60%', height: '4px', background: '#FFFFFF', borderRadius: '1px' }} />
          <div style={{ width: '38px', height: '8px', background: '#DFBA6B', borderRadius: '3px' }} />
        </div>
      );
    case 'Contact':
      return (
        <div style={{ width: '100%', height: '52px', background: 'rgba(9, 13, 26, 0.85)', borderRadius: '5px', padding: '6px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: '50%', height: '4px', background: '#DFBA6B', borderRadius: '1px' }} />
          <div style={{ width: '80%', height: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2px' }} />
          <div style={{ width: '32px', height: '6px', background: '#DFBA6B', borderRadius: '2px' }} />
        </div>
      );
    default:
      return (
        <div style={{ width: '100%', height: '52px', background: 'rgba(9, 13, 26, 0.85)', borderRadius: '5px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: '60%', height: '4px', background: 'rgba(255,255,255,0.4)', borderRadius: '1px' }} />
        </div>
      );
  }
}

export function OrbitoXVisualLeftRail({
  activeTab,
  onTabChange,
  scenes,
  activeSceneId,
  onSelectScene,
  onAddScene,
  onDeleteScene,
  selectedNodeId,
  onSelectNode,
  onInsertNode,
  onDeleteNode,
  onToggleNodeLock,
  onToggleNodeVisibility,
  dispatch,
  masterComponents = [],
  onCreateComponentInstance,
  onApplyUniverse,
  onApplyFontPairing,
  onSwitchMode,
  activeUniverseId = 'celestial',
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [addCategory, setAddCategory] = useState<'all' | 'sections' | 'elements' | 'layout' | 'media' | 'motion' | 'effects' | '3d' | 'data' | 'domain'>('sections');
  const [activeStyleSubtab, setActiveStyleSubtab] = useState<'universes' | 'fonts'>('universes');
  const [collapsedScenes, setCollapsedScenes] = useState<Record<string, boolean>>({});
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dropTargetLayer, setDropTargetLayer] = useState<{ id: string; pos: 'before' | 'after' | 'inside' } | null>(null);
  const [draggedSceneIndex, setDraggedSceneIndex] = useState<number | null>(null);
  const [dropSceneIndex, setDropSceneIndex] = useState<number | null>(null);

  const activeScene = scenes.find((s) => s.id === activeSceneId) || scenes[0];

  // Web section library items
  const webBlocks = useMemo(() => WebSectionLibrary.getAll(), []);
  const domainNodes = useMemo(() => DomainExtensionRegistry.getAllNodes(), []);
  const domainSections = useMemo(() => DomainExtensionRegistry.getAllSections(), []);

  // Filtered Add Items
  const filteredBlocks = useMemo(() => {
    if (!searchQuery.trim()) return webBlocks;
    const q = searchQuery.toLowerCase();
    return webBlocks.filter((b) => b.title.toLowerCase().includes(q) || b.category.toLowerCase().includes(q) || b.description.toLowerCase().includes(q));
  }, [webBlocks, searchQuery]);

  const filteredDomainNodes = useMemo(() => {
    if (!searchQuery.trim()) return domainNodes;
    const q = searchQuery.toLowerCase();
    return domainNodes.filter((n) => n.label.toLowerCase().includes(q) || n.description.toLowerCase().includes(q));
  }, [domainNodes, searchQuery]);

  const toggleSceneCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedScenes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <aside style={{ display: 'flex', height: 'calc(100vh - 52px)', zIndex: 40, flexShrink: 0 }}>
      {/* ── 1. NARROW ICON DOCK (5 Items Only) ── */}
      <nav
        style={{
          width: '50px',
          background: '#090D1A',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '12px 0',
          gap: '8px',
          userSelect: 'none',
        }}
      >
        {[
          { id: 'add' as LeftRailTab, icon: Plus, label: 'Add' },
          { id: 'layers' as LeftRailTab, icon: Layers, label: 'Layers' },
          { id: 'pages' as LeftRailTab, icon: FileText, label: 'Pages' },
          { id: 'assets' as LeftRailTab, icon: ImageIcon, label: 'Assets' },
          { id: 'components' as LeftRailTab, icon: Box, label: 'Components' },
          { id: 'styles' as LeftRailTab, icon: Palette, label: 'Styles' },
          { id: 'motion' as LeftRailTab, icon: Activity, label: 'Motion' },
          { id: 'effects' as LeftRailTab, icon: Sparkles, label: 'Effects' },
          { id: 'data' as LeftRailTab, icon: Database, label: 'Data' },
          { id: '3d' as LeftRailTab, icon: Box3D, label: '3D' },
        ].map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              id={`orbitox-left-tab-${item.id}`}
              onClick={() => onTabChange(isActive ? null : item.id)}
              title={`${item.label}`}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: isActive ? 'rgba(223, 186, 107, 0.15)' : 'transparent',
                border: isActive ? '1px solid rgba(223, 186, 107, 0.4)' : '1px solid transparent',
                color: isActive ? '#DFBA6B' : 'rgba(255, 255, 255, 0.6)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
              }}
            >
              <Icon size={17} />
              <span style={{ fontSize: '0.58rem', fontWeight: 600 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── 2. EXPANDABLE DRAWER PANEL (280px) ── */}
      {activeTab && (
        <div
          style={{
            width: '290px',
            background: '#0B1021',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            userSelect: 'none',
          }}
        >
          {/* TAB 1: ADD (Searchable Palette) */}
          {activeTab === 'add' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ padding: '14px 16px 10px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.04em' }}>Insert Library</span>
                  <button
                    onClick={() => onTabChange(null)}
                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    ✕
                  </button>
                </div>
                {/* Search Input with ⌘K badge */}
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'rgba(255,255,255,0.4)' }} />
                  <input
                    type="text"
                    placeholder="Search sections, elements..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      padding: '7px 32px 7px 30px',
                      color: '#FFFFFF',
                      fontSize: '0.78rem',
                      outline: 'none',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '7px',
                      fontSize: '0.6rem',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '3px',
                      padding: '1px 5px',
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontWeight: 600,
                    }}
                  >
                    ⌘K
                  </span>
                </div>

                {/* Category Filter Chips: [ Sections ] [ Elements ] [ All ] [ Media ] [ 3D ] [ Motion ] [ Domain ] */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '10px', overflowX: 'auto', paddingBottom: '2px' }}>
                  {(['sections', 'elements', 'all', 'media', '3d', 'motion', 'domain'] as const).map((cat) => {
                    const isActive = addCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setAddCategory(cat)}
                        style={{
                          background: isActive ? 'rgba(223, 186, 107, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                          border: isActive ? '1px solid #DFBA6B' : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '9999px',
                          padding: '3px 8px',
                          fontSize: '0.68rem',
                          fontWeight: isActive ? 600 : 500,
                          color: isActive ? '#DFBA6B' : 'rgba(255, 255, 255, 0.6)',
                          cursor: 'pointer',
                          textTransform: 'capitalize',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scrollable Library */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* 1. FEATURED HEROES */}
                {(addCategory === 'all' || addCategory === 'sections') && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#DFBA6B', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                        Featured Heroes
                      </span>
                      <span style={{ fontSize: '0.62rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                        {filteredBlocks.filter((b) => b.category === 'Hero').length} styles
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {filteredBlocks
                        .filter((b) => b.category === 'Hero')
                        .map((block) => (
                          <div
                            key={block.id}
                            data-testid={`section-block-${block.id}`}
                            onClick={() => onAddScene(block.createScene(block.title))}
                            style={{
                              background: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: '8px',
                              padding: '8px',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                              e.currentTarget.style.borderColor = '#DFBA6B';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                            }}
                          >
                            <SectionPreviewThumbnail category={block.category} />
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.9rem' }}>{block.icon}</span>
                                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#FFFFFF' }}>{block.title}</span>
                              </div>
                              <span style={{ fontSize: '0.62rem', color: '#DFBA6B', background: 'rgba(223, 186, 107, 0.12)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                {block.category}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.5)', lineHeight: 1.3 }}>
                              {block.description}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* 2. POPULAR WEBSITE SECTIONS */}
                {(addCategory === 'all' || addCategory === 'sections') && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#DFBA6B', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                        Popular Sections
                      </span>
                      <span style={{ fontSize: '0.62rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                        {filteredBlocks.filter((b) => b.category !== 'Hero').length} sections
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {filteredBlocks
                        .filter((b) => b.category !== 'Hero')
                        .map((block) => (
                          <div
                            key={block.id}
                            data-testid={`section-block-${block.id}`}
                            onClick={() => onAddScene(block.createScene(block.title))}
                            style={{
                              background: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: '8px',
                              padding: '8px',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                              e.currentTarget.style.borderColor = '#DFBA6B';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                            }}
                          >
                            <SectionPreviewThumbnail category={block.category} />
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.9rem' }}>{block.icon}</span>
                                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#FFFFFF' }}>{block.title}</span>
                              </div>
                              <span style={{ fontSize: '0.62rem', color: '#DFBA6B', background: 'rgba(223, 186, 107, 0.12)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                {block.category}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.5)', lineHeight: 1.3 }}>
                              {block.description}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* 3. ELEMENTS & PRIMITIVES */}
                {(addCategory === 'all' || addCategory === 'elements') && (
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#DFBA6B', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Elements & Primitives
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                      {[
                        { kind: 'text', label: 'Text / Heading', icon: 'T' },
                        { kind: 'button', label: 'Button', icon: '🔘' },
                        { kind: 'icon', label: 'Icon', icon: '✦' },
                        { kind: 'divider', label: 'Divider', icon: '―' },
                        { kind: 'frame', label: 'Frame', icon: '◻️' },
                        { kind: 'stack', label: 'Stack (Flex)', icon: '☰' },
                        { kind: 'grid', label: 'Grid', icon: '⊞' },
                        { kind: 'container', label: 'Container', icon: '▢' },
                      ].map((p) => (
                        <button
                          key={p.kind}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/orbitox-node-kind', p.kind);
                            e.dataTransfer.setData('text/plain', p.kind);
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                          onClick={() => onInsertNode(p.kind as SceneNodeKind, p.label)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '6px',
                            padding: '8px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: '#FFFFFF',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            cursor: 'grab',
                            textAlign: 'left',
                          }}
                        >
                          <span style={{ fontWeight: 700, color: '#DFBA6B' }}>{p.icon}</span>
                          <span>{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. MEDIA ELEMENTS */}
                {(addCategory === 'all' || addCategory === 'media') && (
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#DFBA6B', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Media & Assets
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                      {[
                        { kind: 'image', label: 'Image', icon: '🖼️' },
                        { kind: 'video', label: 'Video', icon: '🎬' },
                        { kind: 'media-slot', label: 'Media Slot', icon: '📷' },
                        { kind: 'canvas-3d', label: '3D Canvas', icon: '🔮' },
                      ].map((p) => (
                        <button
                          key={p.kind}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/orbitox-node-kind', p.kind);
                            e.dataTransfer.setData('text/plain', p.kind);
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                          onClick={() => onInsertNode(p.kind as SceneNodeKind, p.label)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '6px',
                            padding: '8px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: '#FFFFFF',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            cursor: 'grab',
                            textAlign: 'left',
                          }}
                        >
                          <span style={{ fontWeight: 700, color: '#DFBA6B' }}>{p.icon}</span>
                          <span>{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* D. DOMAIN EXTENSIONS (Celebrations) */}
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#DFBA6B', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Celebrations Plugin
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                    {filteredDomainNodes.map((n) => (
                      <button
                        key={n.kind}
                        onClick={() => onInsertNode(n.kind as SceneNodeKind, n.label)}
                        style={{
                          background: 'rgba(223, 186, 107, 0.05)',
                          border: '1px solid rgba(223, 186, 107, 0.2)',
                          borderRadius: '6px',
                          padding: '8px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#FFFFFF',
                          fontSize: '0.72rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span>{n.icon}</span>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LAYERS TREE */}
          {activeTab === 'layers' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ padding: '14px 16px 10px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.04em' }}>Layer Hierarchy</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
                {scenes.map((scene, sceneIdx) => {
                  const isSceneActive = scene.id === activeSceneId;
                  const isCollapsed = collapsedScenes[scene.id];
                  const nodes = scene.sceneGraph?.nodes || {};
                  const rootNodeId = scene.sceneGraph?.rootNodeId;
                  const rootNode = rootNodeId ? nodes[rootNodeId] : null;

                  return (
                    <div key={scene.id} style={{ marginBottom: '6px' }}>
                      {/* Section Row */}
                      <div
                        draggable={true}
                        onDragStart={(e) => {
                          setDraggedSceneIndex(sceneIdx);
                          e.dataTransfer.setData('text/plain', String(sceneIdx));
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDropSceneIndex(sceneIdx);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedSceneIndex !== null && draggedSceneIndex !== sceneIdx && dispatch) {
                            dispatch({
                              type: 'REORDER_SCENES',
                              sourceIndex: draggedSceneIndex,
                              targetIndex: sceneIdx,
                            });
                          }
                          setDraggedSceneIndex(null);
                          setDropSceneIndex(null);
                        }}
                        onClick={() => onSelectScene(scene.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          background: isSceneActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                          borderTop: dropSceneIndex === sceneIdx && draggedSceneIndex !== null ? '2px solid #DFBA6B' : undefined,
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span onClick={(e) => toggleSceneCollapse(scene.id, e)} style={{ color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                            {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                          </span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: isSceneActive ? '#DFBA6B' : '#FFFFFF' }}>
                            {scene.name}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteScene(scene.id);
                          }}
                          title="Delete Section"
                          style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {/* Recursive Child Nodes Tree */}
                      {!isCollapsed && rootNode && rootNode.children && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '2px' }}>
                          {rootNode.children.map((childId) => {
                            const renderNode = (nId: string, depth: number): React.ReactNode => {
                              const n = nodes[nId];
                              if (!n) return null;
                              const isNodeSelected = selectedNodeId === n.id;
                              const isTarget = dropTargetLayer?.id === n.id;
                              const isDraggingThis = draggedLayerId === n.id;
                              const isContainer = ['frame', 'stack', 'grid', 'container', 'group'].includes(n.kind);
                              const hasChildren = n.children && n.children.length > 0;
                              const isNodeCollapsed = collapsedScenes[n.id];

                              return (
                                <div key={n.id} style={{ display: 'flex', flexDirection: 'column' }}>
                                  <div
                                    draggable={true}
                                    onDragStart={(e) => {
                                      e.stopPropagation();
                                      setDraggedLayerId(n.id);
                                      e.dataTransfer.setData('application/orbitox-layer-id', n.id);
                                      e.dataTransfer.setData('text/plain', n.id);
                                      e.dataTransfer.effectAllowed = 'move';
                                    }}
                                    onDragEnd={() => {
                                      setDraggedLayerId(null);
                                      setDropTargetLayer(null);
                                    }}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      e.dataTransfer.dropEffect = 'move';
                                      const targetEl = e.currentTarget as HTMLElement;
                                      const rect = targetEl.getBoundingClientRect();
                                      const relY = (e.clientY - rect.top) / rect.height;

                                      if (isContainer && relY > 0.25 && relY < 0.75) {
                                        setDropTargetLayer({ id: n.id, pos: 'inside' });
                                      } else if (relY <= 0.5) {
                                        setDropTargetLayer({ id: n.id, pos: 'before' });
                                      } else {
                                        setDropTargetLayer({ id: n.id, pos: 'after' });
                                      }
                                    }}
                                    onDragLeave={() => {
                                      setDropTargetLayer((prev) => (prev?.id === n.id ? null : prev));
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const draggedId =
                                        e.dataTransfer.getData('application/orbitox-layer-id') ||
                                        e.dataTransfer.getData('text/plain');
                                      if (!draggedId || draggedId === n.id) {
                                        setDropTargetLayer(null);
                                        setDraggedLayerId(null);
                                        return;
                                      }

                                      if (dispatch) {
                                        if (dropTargetLayer?.pos === 'inside' && isContainer) {
                                          dispatch({
                                            type: 'SG_MOVE_NODE',
                                            sceneId: scene.id,
                                            nodeId: draggedId,
                                            newParentId: n.id,
                                          });
                                        } else {
                                          const parentId = n.parentId || rootNode.id;
                                          const parent = nodes[parentId];
                                          if (parent && parent.children) {
                                            const fromIndex = parent.children.indexOf(draggedId);
                                            const targetIndex = parent.children.indexOf(n.id);
                                            if (targetIndex !== -1) {
                                              const toIndex = dropTargetLayer?.pos === 'before' ? targetIndex : targetIndex + 1;
                                              dispatch({
                                                type: 'SG_REORDER',
                                                sceneId: scene.id,
                                                parentId,
                                                fromIndex: fromIndex !== -1 ? fromIndex : 0,
                                                toIndex,
                                              });
                                            }
                                          }
                                        }
                                      }
                                      setDropTargetLayer(null);
                                      setDraggedLayerId(null);
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSelectNode(n.id);
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '5px 8px',
                                      paddingLeft: `${8 + depth * 14}px`,
                                      borderRadius: '5px',
                                      background: isNodeSelected
                                        ? 'rgba(223, 186, 107, 0.2)'
                                        : isTarget && dropTargetLayer?.pos === 'inside'
                                        ? 'rgba(223, 186, 107, 0.15)'
                                        : 'transparent',
                                      border: isNodeSelected
                                        ? '1px solid rgba(223, 186, 107, 0.4)'
                                        : '1px solid transparent',
                                      borderTop:
                                        isTarget && dropTargetLayer?.pos === 'before'
                                          ? '2px solid #DFBA6B'
                                          : undefined,
                                      borderBottom:
                                        isTarget && dropTargetLayer?.pos === 'after'
                                          ? '2px solid #DFBA6B'
                                          : undefined,
                                      opacity: isDraggingThis ? 0.4 : 1,
                                      cursor: 'grab',
                                      transition: 'all 0.1s ease',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                      {hasChildren ? (
                                        <span
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setCollapsedScenes((prev) => ({ ...prev, [n.id]: !prev[n.id] }));
                                          }}
                                          style={{ color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                                        >
                                          {isNodeCollapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                                        </span>
                                      ) : (
                                        <span style={{ width: '11px' }} />
                                      )}
                                      <span
                                        style={{
                                          fontSize: '0.72rem',
                                          color: isNodeSelected ? '#DFBA6B' : 'rgba(255,255,255,0.8)',
                                          fontWeight: isNodeSelected ? 600 : 400,
                                        }}
                                      >
                                        {n.name || n.kind}
                                      </span>
                                      <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>
                                        ({n.kind})
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      {onToggleNodeVisibility && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleNodeVisibility(n.id);
                                          }}
                                          style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: n.hidden ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)',
                                            cursor: 'pointer',
                                          }}
                                        >
                                          {n.hidden ? <EyeOff size={11} /> : <Eye size={11} />}
                                        </button>
                                      )}
                                      {onToggleNodeLock && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleNodeLock(n.id);
                                          }}
                                          style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: n.locked ? '#DFBA6B' : 'rgba(255,255,255,0.5)',
                                            cursor: 'pointer',
                                          }}
                                        >
                                          {n.locked ? <Lock size={11} /> : <Unlock size={11} />}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  {/* Recursive Children */}
                                  {!isNodeCollapsed &&
                                    hasChildren &&
                                    n.children.map((cId) => renderNode(cId, depth + 1))}
                                </div>
                              );
                            };
                            return renderNode(childId, 1);
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: PAGES */}
          {activeTab === 'pages' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF' }}>Website Pages</span>
                <button
                  onClick={() => {
                    const newPageName = `Page ${scenes.length + 1}`;
                    const templateSec = WebSectionLibrary.get('sec_hero_split');
                    if (templateSec) {
                      onAddScene(templateSec.createScene(newPageName));
                    }
                  }}
                  style={{
                    background: 'rgba(223, 186, 107, 0.15)',
                    border: '1px solid #DFBA6B',
                    borderRadius: '4px',
                    color: '#DFBA6B',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '3px 8px',
                    cursor: 'pointer',
                  }}
                >
                  + Add Page
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {scenes.map((scene, idx) => {
                  const isActive = scene.id === activeSceneId;
                  return (
                    <div
                      key={scene.id}
                      onClick={() => onSelectScene(scene.id)}
                      style={{
                        background: isActive ? 'rgba(223, 186, 107, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                        border: isActive ? '1.5px solid #DFBA6B' : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: isActive ? '#DFBA6B' : '#FFFFFF' }}>
                          {scene.name}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>
                          /{scene.slug || `page-${idx + 1}`} • {scene.sceneType || 'custom'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {idx === 0 && (
                          <span style={{ fontSize: '0.6rem', background: '#DFBA6B', color: '#060B1A', fontWeight: 800, padding: '1px 5px', borderRadius: '3px' }}>
                            HOME
                          </span>
                        )}
                        {isActive && idx !== 0 && (
                          <span style={{ fontSize: '0.6rem', background: 'rgba(223, 186, 107, 0.25)', color: '#DFBA6B', fontWeight: 700, padding: '1px 5px', borderRadius: '3px' }}>
                            ACTIVE
                          </span>
                        )}
                        {scenes.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteScene(scene.id);
                            }}
                            title="Delete Page"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'rgba(255, 255, 255, 0.3)',
                              cursor: 'pointer',
                              padding: '2px',
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: ASSETS */}
          {activeTab === 'assets' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF' }}>Media Assets</span>
                <button
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '4px',
                    color: '#FFFFFF',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '3px 8px',
                    cursor: 'pointer',
                  }}
                >
                  Upload Asset
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {[
                  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=300&q=80',
                  'https://images.unsplash.com/photo-1519741497674-611481863552?w=300&q=80',
                  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=300&q=80',
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80',
                ].map((url, idx) => (
                  <div
                    key={idx}
                    style={{
                      height: '80px',
                      borderRadius: '6px',
                      background: `url("${url}") center/cover no-repeat`,
                      border: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: COMPONENTS */}
          {activeTab === 'components' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF' }}>Master Components</span>
              </div>

              {masterComponents.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '40px', lineHeight: 1.5 }}>
                  No master components created yet.<br />
                  Select any layer and click <b>Create Component</b>.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {masterComponents.map((comp) => (
                    <div
                      key={comp.id}
                      onClick={() => onCreateComponentInstance?.(comp.id)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '6px',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#DFBA6B' }}>{comp.name}</div>
                        <div style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.4)' }}>{comp.variantCount} variant(s)</div>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>+ Insert</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: STYLES & THEMES (DESIGN UNIVERSES) */}
          {activeTab === 'styles' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px 10px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF' }}>Design Universes & Fonts</span>
                  <button onClick={() => onTabChange(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>✕</button>
                </div>
                {/* Subtab Toggle */}
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '2px' }}>
                  <button
                    onClick={() => setActiveStyleSubtab('universes')}
                    style={{
                      flex: 1,
                      border: 'none',
                      background: activeStyleSubtab === 'universes' ? 'rgba(223, 186, 107, 0.25)' : 'transparent',
                      color: activeStyleSubtab === 'universes' ? '#DFBA6B' : 'rgba(255,255,255,0.5)',
                      padding: '4px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    12 Universes
                  </button>
                  <button
                    onClick={() => setActiveStyleSubtab('fonts')}
                    style={{
                      flex: 1,
                      border: 'none',
                      background: activeStyleSubtab === 'fonts' ? 'rgba(223, 186, 107, 0.25)' : 'transparent',
                      color: activeStyleSubtab === 'fonts' ? '#DFBA6B' : 'rgba(255,255,255,0.5)',
                      padding: '4px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Typography Studio
                  </button>
                </div>
              </div>

              {/* Scrollable Universes or Typography */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activeStyleSubtab === 'universes' ? (
                  DESIGN_UNIVERSES.map((universe) => {
                    const isCurrent = activeUniverseId === universe.id;
                    return (
                      <div
                        key={universe.id}
                        style={{
                          borderRadius: '10px',
                          border: isCurrent ? '1.5px solid #DFBA6B' : '1px solid rgba(255, 255, 255, 0.08)',
                          background: universe.previewGradient,
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          boxShadow: isCurrent ? '0 0 20px rgba(223, 186, 107, 0.2)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FFFFFF' }}>{universe.name}</span>
                          <span style={{ fontSize: '0.62rem', background: 'rgba(255,255,255,0.15)', color: universe.accentColor, fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                            {universe.badge}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.3 }}>
                          {universe.tagline}
                        </span>

                        {/* Miniature Website Mockup Preview */}
                        <div
                          style={{
                            width: '100%',
                            height: '52px',
                            borderRadius: '5px',
                            background: universe.tokens.colors.backgroundPrimary,
                            border: `1px solid ${universe.tokens.colors.borderSubtle || 'rgba(255,255,255,0.1)'}`,
                            padding: '5px 8px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            overflow: 'hidden',
                            position: 'relative',
                            boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.5)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ width: '22px', height: '4px', background: universe.accentColor, borderRadius: '2px' }} />
                            <div style={{ display: 'flex', gap: '3px' }}>
                              <div style={{ width: '8px', height: '3px', background: 'rgba(255,255,255,0.4)', borderRadius: '1px' }} />
                              <div style={{ width: '8px', height: '3px', background: 'rgba(255,255,255,0.4)', borderRadius: '1px' }} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <div style={{ width: '80%', height: '5px', background: universe.tokens.colors.textPrimary || '#FFFFFF', borderRadius: '1px' }} />
                              <div style={{ width: '55%', height: '3px', background: universe.tokens.colors.textSecondary || 'rgba(255,255,255,0.5)', borderRadius: '1px' }} />
                            </div>
                            <div style={{ width: '18px', height: '18px', borderRadius: '3px', background: universe.tokens.colors.surfacePrimary || 'rgba(255,255,255,0.1)', border: `1px solid ${universe.accentColor}` }} />
                          </div>
                          <div style={{ width: '26px', height: '4px', background: universe.accentColor, borderRadius: '2px' }} />
                        </div>

                        {/* Color swatches */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {[
                            universe.tokens.colors.backgroundPrimary,
                            universe.tokens.colors.surfacePrimary,
                            universe.tokens.colors.accentPrimary,
                            universe.tokens.colors.accentSecondary,
                          ].map((c, i) => (
                            <span key={i} style={{ width: '13px', height: '13px', borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.2)' }} />
                          ))}
                        </div>

                        <button
                          onClick={() => onApplyUniverse?.(universe.id)}
                          style={{
                            background: isCurrent ? '#DFBA6B' : 'rgba(255, 255, 255, 0.1)',
                            border: isCurrent ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
                            color: isCurrent ? '#060B1A' : '#FFFFFF',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            marginTop: '2px',
                          }}
                        >
                          {isCurrent ? <><Check size={12} /> Active Universe</> : 'Apply Universe to Website'}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  FONT_PAIRINGS.map((pairing) => (
                    <div
                      key={pairing.id}
                      style={{
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#DFBA6B' }}>{pairing.name}</span>
                        <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{pairing.category}</span>
                      </div>

                      {/* Live Specimen Preview */}
                      <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                          <span style={{ fontFamily: pairing.displayFont, fontSize: '1.4rem', fontWeight: 700, color: '#DFBA6B', lineHeight: 1 }}>Aa</span>
                          <span style={{ fontFamily: pairing.bodyFont, fontSize: '0.78rem', color: '#FFFFFF', fontWeight: 500 }}>
                            {pairing.sampleHeadline || 'The future of celebration.'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                          {pairing.displayFont} + {pairing.bodyFont}
                        </div>
                      </div>

                      <button
                        onClick={() => onApplyFontPairing?.(pairing.id)}
                        style={{
                          background: 'rgba(223, 186, 107, 0.12)',
                          border: '1px solid #DFBA6B',
                          color: '#DFBA6B',
                          borderRadius: '6px',
                          padding: '6px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Apply Font Pairing Globally
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 7: MOTION */}
          {activeTab === 'motion' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px 10px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF' }}>Motion Studio</span>
                  <button onClick={() => onTabChange(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>✕</button>
                </div>
                <button
                  onClick={() => onSwitchMode?.('motion')}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #DFBA6B 0%, #B08D4C 100%)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px',
                    color: '#060B1A',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    marginTop: '4px',
                  }}
                >
                  <Activity size={13} />
                  <span>Launch Visual Timeline</span>
                </button>
              </div>

              {/* Scrollable Parallax & Presets */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <OrbitoXParallaxStudio />
              </div>
            </div>
          )}

          {/* TAB 8: EFFECTS */}
          {activeTab === 'effects' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
              <OrbitoXEffectsStudio />
            </div>
          )}

          {/* TAB 9: 3D STUDIO */}
          {activeTab === '3d' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF' }}>3D Studio</span>
                <button onClick={() => onTabChange(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                Real WebGL hardware-accelerated 3D scene creation. Add cameras, floating primitives, particles, and shaders.
              </div>

              <button
                onClick={() => onSwitchMode?.('3d')}
                style={{
                  background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#FFFFFF',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 18px rgba(6, 182, 212, 0.3)',
                }}
              >
                <Box3D size={15} />
                <span>Open 3D Workspace</span>
              </button>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Available 3D Presets
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  {[
                    { name: 'Celestial Ring (Torus)', icon: '🪐' },
                    { name: 'Cosmic Core (Sphere)', icon: '🔮' },
                    { name: 'Prism Gem (Diamond)', icon: '💎' },
                    { name: 'Starfield Particles', icon: '✨' },
                  ].map((p, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.75rem',
                      }}
                    >
                      <span>{p.icon}</span>
                      <span>{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: DATA & CMS */}
          {activeTab === 'data' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
              <OrbitoXDataStudio />
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
