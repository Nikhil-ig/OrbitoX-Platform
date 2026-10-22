'use client';

import React from 'react';
import {
  Plus,
  Layers,
  LayoutGrid,
  Image as ImageIcon,
  Boxes,
  Palette,
  Database,
  Sparkles,
  Keyboard,
  Sliders,
  Compass,
} from 'lucide-react';

export type StudioRailTab = 'templates' | 'add' | 'layers' | 'pages' | 'assets' | 'components' | 'styles' | 'data';

interface StudioRailProps {
  activeTab: StudioRailTab | null;
  onTabChange: (tab: StudioRailTab | null) => void;
  onOpenAi: () => void;
  onOpenShortcuts: () => void;
  onOpenMarketplace?: () => void;
  onOpenCommandCenter?: () => void;
}

export function StudioRail({
  activeTab,
  onTabChange,
  onOpenAi,
  onOpenShortcuts,
  onOpenMarketplace,
  onOpenCommandCenter,
}: StudioRailProps) {
  const tools: { id: StudioRailTab; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'templates', label: 'Site Templates', icon: <Compass size={18} />, shortcut: 'T' },
    { id: 'add', label: 'Add Element', icon: <Plus size={19} />, shortcut: 'A' },
    { id: 'layers', label: 'Layers', icon: <Layers size={18} />, shortcut: 'L' },
    { id: 'pages', label: 'Pages & Sections', icon: <LayoutGrid size={18} />, shortcut: 'P' },
    { id: 'assets', label: 'Assets', icon: <ImageIcon size={18} />, shortcut: 'M' },
    { id: 'components', label: 'Components', icon: <Boxes size={18} />, shortcut: 'C' },
    { id: 'styles', label: 'Design System & Universes', icon: <Palette size={18} />, shortcut: 'S' },
    { id: 'data', label: 'Data & CMS', icon: <Database size={18} />, shortcut: 'D' },
  ];

  const handleToolClick = (id: StudioRailTab) => {
    if (id === 'templates' && onOpenMarketplace) {
      onOpenMarketplace();
      return;
    }
    if (id === 'add' && onOpenCommandCenter) {
      onOpenCommandCenter();
      return;
    }
    // If clicking current open tab, collapse it so canvas expands!
    if (activeTab === id) {
      onTabChange(null);
    } else {
      onTabChange(id);
    }
  };

  return (
    <nav
      id="sz-left-rail"
      style={{
        width: '50px',
        background: '#121317',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 0',
        zIndex: 40,
        userSelect: 'none',
      }}
    >
      {/* ── TOP PRIMARY TOOLS ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', width: '100%' }}>
        {tools.map((tool) => {
          const isActive = activeTab === tool.id;
          return (
            <button
              key={tool.id}
              id={`sz-rail-btn-${tool.id}`}
              onClick={() => handleToolClick(tool.id)}
              title={`${tool.label} (${tool.shortcut})`}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? '#2563EB' : 'transparent',
                color: isActive ? '#FFFFFF' : '#9CA3AF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = '#F3F4F6';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#9CA3AF';
                }
              }}
            >
              {tool.icon}
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '3px',
                    height: '16px',
                    background: '#FFFFFF',
                    borderRadius: '0 2px 2px 0',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── BOTTOM UTILITY TOOLS ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', width: '100%' }}>
        {/* Quick Ask AI */}
        <button
          onClick={onOpenAi}
          id="sz-rail-ai-btn"
          title="Ask OrbitoX AI"
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            border: 'none',
            background: 'rgba(59, 130, 246, 0.1)',
            color: '#60A5FA',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
          }}
        >
          <Sparkles size={18} />
        </button>

        {/* Keyboard Shortcuts */}
        <button
          onClick={onOpenShortcuts}
          id="sz-rail-shortcuts-btn"
          title="Keyboard Shortcuts (⌘/)"
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: '#6B7280',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = '#F3F4F6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#6B7280';
          }}
        >
          <Keyboard size={17} />
        </button>
      </div>
    </nav>
  );
}
