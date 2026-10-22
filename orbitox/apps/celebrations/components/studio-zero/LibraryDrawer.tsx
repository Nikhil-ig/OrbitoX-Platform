'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Type,
  Square,
  Image as ImageIcon,
  Play,
  Layout,
  Grid,
  Columns,
  Sparkles,
  Sliders,
  Box,
  Layers,
  Heart,
  Calendar,
  Compass,
  CreditCard,
  MessageSquare,
  HelpCircle,
  Clock,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { SceneNodeKind } from '@/components/template-studio/engine/SceneGraphTypes';
import { WebSectionLibrary, WebSectionBlock } from '@/components/template-studio/engine/WebSectionLibrary';
import { TemplateSceneDefinition } from '@/components/template-studio/types/TemplateSchema';

interface LibraryDrawerProps {
  onInsertNode: (kind: SceneNodeKind, name: string, defaults?: any) => void;
  onAddSection: (sceneDef: TemplateSceneDefinition, position?: number) => void;
  targetInsertPosition?: number;
  onClose: () => void;
}

type LibraryCategory = 'sections' | 'elements' | 'layout' | 'media' | 'data' | 'motion' | 'effects' | '3d' | 'celebrations';

export function LibraryDrawer({
  onInsertNode,
  onAddSection,
  targetInsertPosition,
  onClose,
}: LibraryDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<LibraryCategory>('sections');

  // Categories definitions
  const categories: { id: LibraryCategory; label: string }[] = [
    { id: 'sections', label: 'Sections' },
    { id: 'elements', label: 'Elements' },
    { id: 'layout', label: 'Layout' },
    { id: 'media', label: 'Media' },
    { id: 'data', label: 'Data' },
    { id: 'motion', label: 'Motion' },
    { id: 'effects', label: 'Effects' },
    { id: '3d', label: '3D' },
    { id: 'celebrations', label: 'Celebrations' },
  ];

  // Core Basic Elements
  const basicElements = [
    {
      id: 'heading',
      kind: 'text' as SceneNodeKind,
      name: 'Heading',
      icon: <Type size={16} />,
      desc: 'Large display or title text',
      defaults: {
        textContent: 'Crafting the Future of Web Experiences',
        style: {
          typography: {
            fontSize: '2.5rem',
            fontWeight: '700',
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            color: { type: 'token', tokenPath: 'colors.textPrimary' },
          },
        },
      },
    },
    {
      id: 'paragraph',
      kind: 'text' as SceneNodeKind,
      name: 'Paragraph',
      icon: <Type size={15} />,
      desc: 'Body copy and narrative text',
      defaults: {
        textContent: 'OrbitoX delivers uncompromised speed, visual elegance, and seamless interactive dynamics across every screen dimension.',
        style: {
          typography: {
            fontSize: '1rem',
            fontWeight: '400',
            lineHeight: 1.6,
            color: { type: 'token', tokenPath: 'colors.textSecondary' },
          },
        },
      },
    },
    {
      id: 'button',
      kind: 'button' as SceneNodeKind,
      name: 'Primary Button',
      icon: <ArrowRight size={15} />,
      desc: 'Interactive call-to-action button',
      defaults: {
        textContent: 'Get Started',
        layoutMode: 'flex',
        geometry: { width: 'auto', height: 'auto', position: 'flow' },
        style: {
          background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.accentPrimary' } },
          border: { radius: '8px' },
          padding: { top: '12px', right: '24px', bottom: '12px', left: '24px' },
          typography: {
            fontSize: '0.9rem',
            fontWeight: '600',
            color: { type: 'solid', value: '#FFFFFF' },
          },
        },
      },
    },
    {
      id: 'container',
      kind: 'frame' as SceneNodeKind,
      name: 'Container Frame',
      icon: <Square size={15} />,
      desc: 'Auto-layout flex container',
      defaults: {
        layoutMode: 'flex',
        layoutConfig: {
          direction: 'vertical',
          gap: '16px',
          alignment: { primary: 'flex-start', cross: 'stretch' },
          padding: { top: '24px', right: '24px', bottom: '24px', left: '24px' },
        },
        geometry: { width: '100%', height: 'auto', position: 'flow' },
        style: {
          background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.surfacePrimary' } },
          border: { width: '1px', style: 'solid', color: { type: 'token', tokenPath: 'colors.borderSubtle' }, radius: '12px' },
        },
      },
    },
    {
      id: 'image',
      kind: 'image' as SceneNodeKind,
      name: 'Image Box',
      icon: <ImageIcon size={15} />,
      desc: 'High-res image with aspect fit',
      defaults: {
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
        geometry: { width: '100%', height: '360px', position: 'flow' },
        style: {
          border: { radius: '12px' },
        },
      },
    },
    {
      id: 'video',
      kind: 'video' as SceneNodeKind,
      name: 'Video Player',
      icon: <Play size={15} />,
      desc: 'Autoplay cinematic video background',
      defaults: {
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-1610-large.mp4',
        geometry: { width: '100%', height: '400px', position: 'flow' },
        style: {
          border: { radius: '12px' },
        },
      },
    },
    {
      id: 'stack',
      kind: 'stack' as SceneNodeKind,
      name: 'H-Stack (Row)',
      icon: <Columns size={15} />,
      desc: 'Horizontal row with auto-layout',
      defaults: {
        layoutMode: 'flex',
        layoutConfig: {
          direction: 'horizontal',
          gap: '16px',
          alignment: { primary: 'space-between', cross: 'center' },
          wrap: false,
        },
        geometry: { width: '100%', height: 'auto', position: 'flow' },
      },
    },
    {
      id: 'grid',
      kind: 'grid' as SceneNodeKind,
      name: 'Responsive Grid',
      icon: <Grid size={15} />,
      desc: 'Multi-column responsive grid',
      defaults: {
        layoutMode: 'grid',
        layoutConfig: {
          columns: 3,
          gap: '24px',
        },
        geometry: { width: '100%', height: 'auto', position: 'flow' },
      },
    },
  ];

  // Pre-built Web Sections from WebSectionLibrary
  const webSections = useMemo(() => {
    return WebSectionLibrary.getAll();
  }, []);

  // Motion & Parallax blocks
  const motionBlocks = [
    {
      id: 'parallax-plane',
      name: 'Parallax Depth Plane',
      desc: 'Multi-layer scroll depth container',
      icon: <Layers size={16} />,
      create: () => {
        onInsertNode('frame', 'Parallax Plane', {
          motion: {
            parallax: { speed: 0.4, direction: 'vertical' },
          },
          style: {
            background: { type: 'solid', color: { type: 'solid', value: 'rgba(255, 255, 255, 0.02)' } },
            border: { width: '1px', style: 'dashed', color: { type: 'solid', value: 'rgba(59, 130, 246, 0.4)' }, radius: '16px' },
            padding: { top: '48px', right: '32px', bottom: '48px', left: '32px' },
          },
        });
      },
    },
    {
      id: 'marquee-scroller',
      name: 'Infinite Marquee',
      desc: 'Continuous smooth logo or text ticker',
      icon: <Sliders size={16} />,
      create: () => {
        onInsertNode('stack', 'Infinite Marquee Ticker', {
          textContent: 'ORBITOX PLATFORM • IMMERSIVE VISUAL COMPUTING • NEXT-GEN CREATIVE ENGINE • ',
          motion: {
            animation: { preset: 'marquee', duration: 15, repeat: -1 },
          },
          style: {
            padding: { top: '16px', bottom: '16px' },
            typography: { fontSize: '1.2rem', fontWeight: '700', letterSpacing: '0.1em' },
          },
        });
      },
    },
    {
      id: 'scroll-reveal',
      name: 'Scroll Reveal Card',
      desc: 'Fade and slide up on viewport enter',
      icon: <Sparkles size={16} />,
      create: () => {
        onInsertNode('frame', 'Scroll Reveal Card', {
          motion: {
            animation: { preset: 'slide-up', trigger: 'scroll', duration: 0.8 },
          },
          style: {
            background: { type: 'token', tokenPath: 'colors.surfacePrimary' },
            border: { radius: '16px', width: '1px', style: 'solid', color: { type: 'token', tokenPath: 'colors.borderSubtle' } },
            padding: { top: '32px', right: '32px', bottom: '32px', left: '32px' },
          },
        });
      },
    },
  ];

  // Effects blocks
  const effectBlocks = [
    {
      id: 'glass-card',
      name: 'Frosted Glassmorphism',
      desc: 'Translucent glass with blur and specular rim',
      icon: <Sparkles size={16} />,
      create: () => {
        onInsertNode('frame', 'Frosted Glass Card', {
          style: {
            background: { type: 'solid', color: { type: 'solid', value: 'rgba(255, 255, 255, 0.05)' } },
            border: { width: '1px', style: 'solid', color: { type: 'solid', value: 'rgba(255, 255, 255, 0.15)' }, radius: '20px' },
            effects: { backdropBlur: '20px', shadow: '0 20px 50px rgba(0,0,0,0.5)' },
            padding: { top: '32px', right: '32px', bottom: '32px', left: '32px' },
          },
        });
      },
    },
    {
      id: 'aurora-glow',
      name: 'Aurora Mesh Glow',
      desc: 'Vibrant chromatic radial gradient sphere',
      icon: <Sparkles size={16} />,
      create: () => {
        onInsertNode('frame', 'Aurora Glow Element', {
          geometry: { width: '300px', height: '300px', position: 'flow' },
          style: {
            background: {
              type: 'gradient',
              gradient: 'radial-gradient(circle, rgba(124, 58, 237, 0.6) 0%, rgba(59, 130, 246, 0.3) 50%, transparent 70%)',
            },
            effects: { blur: '40px' },
          },
        });
      },
    },
  ];

  // 3D Blocks
  const threeDBlocks = [
    {
      id: '3d-canvas-hero',
      name: '3D Spatial Scene Hero',
      desc: 'Interactive 3D geometry with direct orbit controls',
      icon: <Box size={16} />,
      create: () => {
        onInsertNode('frame', '3D Spatial Viewport', {
          geometry: { width: '100%', height: '500px', position: 'flow' },
          style: {
            background: { type: 'solid', color: { type: 'solid', value: '#060B1A' } },
            border: { radius: '16px' },
          },
        });
      },
    },
    {
      id: '3d-tilt-card',
      name: '3D Interactive Tilt Card',
      desc: 'Card responding to cursor pointer physics',
      icon: <Square size={16} />,
      create: () => {
        onInsertNode('frame', '3D Tilt Card', {
          style: {
            background: { type: 'token', tokenPath: 'colors.surfacePrimary' },
            border: { radius: '16px', width: '1px', style: 'solid', color: { type: 'token', tokenPath: 'colors.borderSubtle' } },
            padding: { top: '32px', right: '32px', bottom: '32px', left: '32px' },
            effects: { shadow: '0 25px 50px rgba(0,0,0,0.5)' },
          },
        });
      },
    },
  ];

  // Celebrations & Domain Blocks
  const celebrationsBlocks = [
    {
      id: 'constellation-map',
      name: 'Celestial Constellation Star Map',
      desc: 'Interactive astrological star chart and alignment',
      icon: <Compass size={16} />,
      create: () => {
        onInsertNode('frame', 'Constellation Star Map', {
          geometry: { width: '100%', height: '480px', position: 'flow' },
          style: {
            background: { type: 'solid', color: { type: 'solid', value: '#0B0F19' } },
            border: { radius: '20px', width: '1px', style: 'solid', color: { type: 'solid', value: 'rgba(223, 186, 107, 0.3)' } },
          },
        });
      },
    },
    {
      id: 'countdown-timer',
      name: 'Monumental Event Countdown',
      desc: 'Days, hours, minutes, and seconds live counter',
      icon: <Clock size={16} />,
      create: () => {
        onInsertNode('frame', 'Event Countdown Clock', {
          geometry: { width: '100%', height: 'auto', position: 'flow' },
          style: {
            padding: { top: '32px', right: '32px', bottom: '32px', left: '32px' },
            border: { radius: '16px', width: '1px', style: 'solid', color: { type: 'token', tokenPath: 'colors.borderSubtle' } },
          },
        });
      },
    },
    {
      id: 'guest-rsvp',
      name: 'Guest RSVP & Attendance',
      desc: 'Interactive invitation response form',
      icon: <Heart size={16} />,
      create: () => {
        const contactSec = WebSectionLibrary.get('sec_contact_form');
        if (contactSec) {
          onAddSection(contactSec.createScene('RSVP & Celebrations'));
        }
      },
    },
  ];

  // Filter sections by search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return webSections;
    const q = searchQuery.toLowerCase();
    return webSections.filter(
      (s: WebSectionBlock) => s.title.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
    );
  }, [webSections, searchQuery]);

  // Filter elements by search
  const filteredElements = useMemo(() => {
    if (!searchQuery.trim()) return basicElements;
    const q = searchQuery.toLowerCase();
    return basicElements.filter((e) => e.name.toLowerCase().includes(q) || e.desc.toLowerCase().includes(q));
  }, [basicElements, searchQuery]);

  return (
    <aside
      id="sz-library-drawer"
      style={{
        width: '320px',
        background: '#16181D',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        zIndex: 35,
        userSelect: 'none',
      }}
    >
      {/* ── DRAWER HEADER & SEARCH ── */}
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F3F4F6', letterSpacing: '-0.01em' }}>
            Add to Page
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#6B7280',
              cursor: 'pointer',
              padding: '2px',
              borderRadius: '4px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#F3F4F6')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#6B7280')}
          >
            <X size={15} />
          </button>
        </div>

        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#1F2229',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '6px',
            padding: '6px 10px',
          }}
        >
          <Search size={14} style={{ color: '#6B7280' }} />
          <input
            type="text"
            placeholder="Search sections, elements, 3D..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '0.78rem',
              outline: 'none',
              width: '100%',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'transparent', border: 'none', color: '#6B7280', cursor: 'pointer', padding: 0 }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── CATEGORY PILLS (Horizontal Scroll) ── */}
      <div
        className="sz-custom-scrollbar"
        style={{
          display: 'flex',
          gap: '4px',
          padding: '8px 12px',
          overflowX: 'auto',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          background: '#131418',
        }}
      >
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              id={`sz-library-cat-btn-${cat.id}`}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                background: isActive ? '#2563EB' : 'transparent',
                border: 'none',
                borderRadius: '5px',
                padding: '4px 9px',
                fontSize: '0.72rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#FFFFFF' : '#9CA3AF',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* ── DRAWER CONTENT AREA ── */}
      <div
        className="sz-custom-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {/* SECTIONS TAB */}
        {activeCategory === 'sections' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Full Web Sections ({filteredSections.length})
            </div>
            {filteredSections.map((sec: WebSectionBlock) => (
              <div
                key={sec.id}
                id={`sz-section-card-${sec.id}`}
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData('orbitox_section', JSON.stringify(sec.createScene()));
                }}
                onClick={() => onAddSection(sec.createScene(), targetInsertPosition)}
                style={{
                  background: '#1F2229',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#292D37';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#1F2229';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: 'rgba(59, 130, 246, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                    }}
                  >
                    {sec.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#FFFFFF' }}>{sec.title}</div>
                    <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{sec.category} • {sec.description.slice(0, 38)}...</div>
                  </div>
                </div>
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    borderRadius: '4px',
                    padding: '4px',
                    color: '#9CA3AF',
                  }}
                >
                  <Plus size={13} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ELEMENTS TAB */}
        {activeCategory === 'elements' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Core Building Blocks ({filteredElements.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {filteredElements.map((el) => (
                <div
                  key={el.id}
                  id={`sz-element-item-${el.id}`}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(
                      'orbitox_element',
                      JSON.stringify({ kind: el.kind, name: el.name, defaults: el.defaults })
                    );
                  }}
                  onClick={() => onInsertNode(el.kind, el.name, el.defaults)}
                  style={{
                    background: '#1F2229',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '12px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#292D37';
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#1F2229';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#3B82F6',
                    }}
                  >
                    {el.icon}
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#F3F4F6' }}>{el.name}</div>
                  <div style={{ fontSize: '0.68rem', color: '#9CA3AF', lineHeight: 1.3 }}>{el.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MOTION TAB */}
        {activeCategory === 'motion' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Interactive Motion Components
            </div>
            {motionBlocks.map((mb) => (
              <div
                key={mb.id}
                onClick={mb.create}
                style={{
                  background: '#1F2229',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#292D37';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#1F2229';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '6px',
                      background: 'rgba(59, 130, 246, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#60A5FA',
                    }}
                  >
                    {mb.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#FFFFFF' }}>{mb.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{mb.desc}</div>
                  </div>
                </div>
                <Plus size={13} style={{ color: '#9CA3AF' }} />
              </div>
            ))}
          </div>
        )}

        {/* EFFECTS TAB */}
        {activeCategory === 'effects' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Visual Shader & Surface Effects
            </div>
            {effectBlocks.map((eb) => (
              <div
                key={eb.id}
                onClick={eb.create}
                style={{
                  background: '#1F2229',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#292D37';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#1F2229';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '6px',
                      background: 'rgba(168, 85, 247, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#C084FC',
                    }}
                  >
                    {eb.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#FFFFFF' }}>{eb.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{eb.desc}</div>
                  </div>
                </div>
                <Plus size={13} style={{ color: '#9CA3AF' }} />
              </div>
            ))}
          </div>
        )}

        {/* 3D TAB */}
        {activeCategory === '3d' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              3D Spatial Components
            </div>
            {threeDBlocks.map((td) => (
              <div
                key={td.id}
                onClick={td.create}
                style={{
                  background: '#1F2229',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#292D37';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#1F2229';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '6px',
                      background: 'rgba(34, 197, 94, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#4ADE80',
                    }}
                  >
                    {td.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#FFFFFF' }}>{td.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{td.desc}</div>
                  </div>
                </div>
                <Plus size={13} style={{ color: '#9CA3AF' }} />
              </div>
            ))}
          </div>
        )}

        {/* CELEBRATIONS TAB */}
        {activeCategory === 'celebrations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Celebrations & Experiential Blocks
            </div>
            {celebrationsBlocks.map((cb) => (
              <div
                key={cb.id}
                onClick={cb.create}
                style={{
                  background: '#1F2229',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#292D37';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#1F2229';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '6px',
                      background: 'rgba(245, 158, 11, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FBBF24',
                    }}
                  >
                    {cb.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#FFFFFF' }}>{cb.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{cb.desc}</div>
                  </div>
                </div>
                <Plus size={13} style={{ color: '#9CA3AF' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
