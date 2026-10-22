'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  Type,
  Heading,
  Image as ImageIcon,
  Film,
  Square,
  Sparkles,
  Layout,
  Grid,
  Columns,
  Box,
  Compass,
  UploadCloud,
  CreditCard,
  MessageSquare,
  HelpCircle,
  ArrowRight,
  Plus,
  Zap,
} from 'lucide-react';
import { SceneNodeKind } from '@/components/template-studio/engine/SceneGraphTypes';
import { WebSectionLibrary, WebSectionBlock } from '@/components/template-studio/engine/WebSectionLibrary';
import { TemplateSceneDefinition } from '@/components/template-studio/types/TemplateSchema';

interface UniversalAddCommandCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertNode: (kind: SceneNodeKind, name: string, defaults?: any) => void;
  onAddSection: (sceneDef: TemplateSceneDefinition, position?: number) => void;
  onOpenCreativeIntake?: () => void;
  onOpenTemplateMarketplace?: () => void;
  onOpenAiGenerator?: () => void;
}

type AddCategory = 'all' | 'elements' | 'layout' | 'sections' | 'components' | 'intake' | 'ai';

interface AddItem {
  id: string;
  category: AddCategory;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  badge?: string;
}

export function UniversalAddCommandCenter({
  isOpen,
  onClose,
  onInsertNode,
  onAddSection,
  onOpenCreativeIntake,
  onOpenTemplateMarketplace,
  onOpenAiGenerator,
}: UniversalAddCommandCenterProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<AddCategory>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  // Global Escape shortcut
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Build items catalog
  const items: AddItem[] = useMemo(() => {
    const list: AddItem[] = [];

    // 1. Elements
    list.push(
      {
        id: 'el-heading',
        category: 'elements',
        title: 'Heading',
        description: 'Large display title with responsive typography scales',
        icon: <Heading size={18} color="#3B82F6" />,
        action: () => {
          onInsertNode('text', 'Headline Title', {
            typography: { fontSize: 36, fontWeight: 700, fontFamily: 'Outfit' },
          });
          onClose();
        },
      },
      {
        id: 'el-paragraph',
        category: 'elements',
        title: 'Paragraph Text',
        description: 'Multi-line body typography with optimized line height',
        icon: <Type size={18} color="#93C5FD" />,
        action: () => {
          onInsertNode('text', 'Paragraph Block', {
            textContent: 'Elevate your celebration experience with graph-native canvas editing.',
          });
          onClose();
        },
      },
      {
        id: 'el-button',
        category: 'elements',
        title: 'Interactive Button',
        description: 'Call-to-action button with hover states and interaction binds',
        icon: <Square size={18} color="#F59E0B" />,
        action: () => {
          onInsertNode('button', 'Primary CTA Button', {
            content: { text: 'Get Started' },
            style: { fills: [{ type: 'solid', color: '#2563EB' }], borderRadius: 8 },
          });
          onClose();
        },
      },
      {
        id: 'el-image',
        category: 'elements',
        title: 'Image Media',
        description: 'Responsive picture frame with CAS asset storage and crop tools',
        icon: <ImageIcon size={18} color="#10B981" />,
        action: () => {
          onInsertNode('image', 'Featured Image', {
            content: {
              imageRef: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
            },
            geometry: { width: 400, height: 260 },
          });
          onClose();
        },
      },
      {
        id: 'el-video',
        category: 'elements',
        title: 'Video Player',
        description: 'Autoplay background video or cinematic media frame',
        icon: <Film size={18} color="#EC4899" />,
        action: () => {
          onInsertNode('video', 'Video Player', {
            geometry: { width: 640, height: 360 },
          });
          onClose();
        },
      }
    );

    // 2. Layout
    list.push(
      {
        id: 'lay-frame',
        category: 'layout',
        title: 'Auto Layout Frame',
        description: 'Flex container with direction, gap, and padding controls',
        icon: <Layout size={18} color="#8B5CF6" />,
        badge: 'Flexbox',
        action: () => {
          onInsertNode('frame', 'Auto Layout Frame', {
            layout: { mode: 'flex', direction: 'vertical', gap: 16, padding: { top: 24, right: 24, bottom: 24, left: 24 } },
            style: { fills: [{ type: 'solid', color: '#1E222D' }], borderRadius: 12 },
          });
          onClose();
        },
      },
      {
        id: 'lay-grid',
        category: 'layout',
        title: 'Responsive Grid',
        description: 'Multi-column grid container for cards and bento boxes',
        icon: <Grid size={18} color="#A78BFA" />,
        badge: 'CSS Grid',
        action: () => {
          onInsertNode('grid', '3-Column Grid', {
            layout: { mode: 'grid', gridColumns: 'repeat(3, 1fr)', gap: 20 },
          });
          onClose();
        },
      },
      {
        id: 'lay-stack-h',
        category: 'layout',
        title: 'Horizontal Stack',
        description: 'Auto-align elements in a row with responsive wrap',
        icon: <Columns size={18} color="#60A5FA" />,
        action: () => {
          onInsertNode('stack', 'Horizontal Stack', {
            layout: { mode: 'flex', direction: 'horizontal', gap: 12, alignItems: 'center' },
          });
          onClose();
        },
      }
    );

    // 3. Sections from WebSectionLibrary
    const registeredSections = WebSectionLibrary.getAll();
    for (const sec of registeredSections) {
      list.push({
        id: `sec-${sec.id}`,
        category: 'sections',
        title: sec.title,
        description: sec.description || `Pre-designed ${sec.category} section block`,
        icon: <Box size={18} color="#34D399" />,
        badge: sec.category,
        action: () => {
          const sceneDef = sec.createScene();
          onAddSection(sceneDef);
          onClose();
        },
      });
    }

    // 4. Creative Intake & Template Marketplace
    if (onOpenCreativeIntake) {
      list.push({
        id: 'hub-intake',
        category: 'intake',
        title: 'Universal Creative Intake',
        description: 'Drop HTML5, theme ZIP, Figma URL, or media files to ingest',
        icon: <UploadCloud size={18} color="#3B82F6" />,
        badge: '3-Step',
        action: () => {
          onOpenCreativeIntake();
          onClose();
        },
      });
    }

    if (onOpenTemplateMarketplace) {
      list.push({
        id: 'hub-templates',
        category: 'intake',
        title: 'Visual Template Marketplace',
        description: 'Browse complete responsive site templates with live preview',
        icon: <Compass size={18} color="#8B5CF6" />,
        badge: 'Marketplace',
        action: () => {
          onOpenTemplateMarketplace();
          onClose();
        },
      });
    }

    if (onOpenAiGenerator) {
      list.push({
        id: 'hub-ai',
        category: 'ai',
        title: 'AI Section Generator',
        description: 'Generate bespoke page sections from natural language prompts',
        icon: <Sparkles size={18} color="#F59E0B" />,
        badge: 'AI Prompt',
        action: () => {
          onOpenAiGenerator();
          onClose();
        },
      });
    }

    return list;
  }, [onInsertNode, onAddSection, onOpenCreativeIntake, onOpenTemplateMarketplace, onOpenAiGenerator, onClose]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeCategory !== 'all' && item.category !== activeCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [items, activeCategory, search]);

  if (!isOpen) return null;

  return (
    <div
      id="sz-universal-add-command-center"
      role="dialog"
      aria-label="Universal Add Command Center"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(9, 11, 17, 0.82)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: '740px',
          maxHeight: '85vh',
          background: '#151722',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '20px',
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── TOP SEARCH INPUT ── */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: '#13151D',
          }}
        >
          <Search size={18} color="#60A5FA" />
          <input
            id="sz-universal-add-search-input"
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search elements, layout, sections, templates (Press Esc to close)..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              fontSize: '0.94rem',
              color: '#F3F4F6',
              outline: 'none',
            }}
          />
          <kbd
            style={{
              background: '#1E222F',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              padding: '2px 6px',
              fontSize: '0.68rem',
              color: '#9CA3AF',
            }}
          >
            ESC
          </kbd>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9CA3AF',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── CATEGORY PILLS ── */}
        <div
          style={{
            padding: '10px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            gap: '6px',
            background: '#181A26',
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'all' as const, label: 'All' },
            { id: 'elements' as const, label: 'Elements' },
            { id: 'layout' as const, label: 'Layout' },
            { id: 'sections' as const, label: 'Sections' },
            { id: 'intake' as const, label: 'Intake & Templates' },
            { id: 'ai' as const, label: 'AI Generator' },
          ].map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  background: isActive ? '#3B82F6' : 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid',
                  borderColor: isActive ? '#3B82F6' : 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '9999px',
                  padding: '4px 12px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: isActive ? '#FFFFFF' : '#D1D5DB',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* ── HERO CREATIVE INTAKE DROP ZONE ── */}
        {!search && (activeCategory === 'all' || activeCategory === 'intake') && (
          <div
            id="sz-universal-add-hero-dropzone"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onOpenCreativeIntake) onOpenCreativeIntake();
            }}
            onClick={() => {
              if (onOpenCreativeIntake) onOpenCreativeIntake();
            }}
            style={{
              margin: '14px 20px 4px 20px',
              padding: '16px 20px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)',
              border: '1.5px dashed rgba(96, 165, 250, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#60A5FA';
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(37, 99, 235, 0.18) 0%, rgba(139, 92, 246, 0.12) 100%)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.35)';
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(59, 130, 246, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UploadCloud size={20} color="#60A5FA" />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF' }}>
                  Bring anything into OrbitoX
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                  Drop a file here or paste a URL • HTML, ZIP, Figma, SVG, Media, Themes
                </div>
              </div>
            </div>
            <button
              type="button"
              style={{
                background: '#2563EB',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Drop or Browse
            </button>
          </div>
        )}

        {/* ── RESULTS GRID ── */}
        <div
          className="sz-custom-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px',
          }}
        >
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={item.action}
              style={{
                background: '#1B1E2B',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#222638';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#1B1E2B';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>

              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F3F4F6' }}>
                    {item.title}
                  </span>
                  {item.badge && (
                    <span
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: '#9CA3AF',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '0.62rem',
                        fontWeight: 600,
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: '#9CA3AF',
                    display: 'block',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.description}
                </span>
              </div>

              <Plus size={15} color="#6B7280" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
