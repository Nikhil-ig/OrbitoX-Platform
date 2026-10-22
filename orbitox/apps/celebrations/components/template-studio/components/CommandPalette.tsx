'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Layers,
  Smartphone,
  Tablet,
  Monitor,
  UserCheck,
  Eye,
  Rocket,
  Palette,
  Sparkles,
  FileCode2,
  ShieldCheck,
  History,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { TemplateSchema, DeviceBreakpoint } from '../types/TemplateSchema';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  schema: TemplateSchema;
  onSelectScene: (sceneId: string) => void;
  onSelectTab: (tab: any) => void;
  onViewportChange: (viewport: DeviceBreakpoint) => void;
  onPreviewModeChange: (mode: 'admin' | 'customer' | 'guest') => void;
  onToggleStressTest: () => void;
  onOpenPublish: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  schema,
  onSelectScene,
  onSelectTab,
  onViewportChange,
  onPreviewModeChange,
  onToggleStressTest,
  onOpenPublish,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Build searchable items
  const commands = [
    // Scenes
    ...schema.scenes.map((scene) => ({
      category: 'Scenes',
      label: `Go to ${scene.name}`,
      sub: `${scene.sceneType} • Scene ${scene.order}`,
      icon: Layers,
      action: () => {
        onSelectScene(scene.id);
        onSelectTab('scenes');
        onClose();
      },
    })),
    // Breakpoints
    {
      category: 'Viewport',
      label: 'Preview Mobile (390px)',
      sub: 'Switch canvas to mobile-first smartphone frame',
      icon: Smartphone,
      action: () => {
        onViewportChange('mobile');
        onClose();
      },
    },
    {
      category: 'Viewport',
      label: 'Preview Tablet (768px)',
      sub: 'Switch canvas to iPad portrait frame',
      icon: Tablet,
      action: () => {
        onViewportChange('tablet');
        onClose();
      },
    },
    {
      category: 'Viewport',
      label: 'Preview Desktop (1280px)',
      sub: 'Switch canvas to desktop canonical baseline',
      icon: Monitor,
      action: () => {
        onViewportChange('desktop');
        onClose();
      },
    },
    // Modes
    {
      category: 'Modes',
      label: 'Open Customer Simulator',
      sub: 'Preview Creator Studio personalized by customer',
      icon: UserCheck,
      action: () => {
        onPreviewModeChange('customer');
        onClose();
      },
    },
    {
      category: 'Modes',
      label: 'Open Guest View',
      sub: 'Preview pure distraction-free celebration',
      icon: Eye,
      action: () => {
        onPreviewModeChange('guest');
        onClose();
      },
    },
    // Workflows
    {
      category: 'Workflows',
      label: 'Design Tokens & Appearance',
      sub: 'Edit colors, typography hierarchy, and spacing',
      icon: Palette,
      action: () => {
        onSelectTab('designSystem');
        onClose();
      },
    },
    {
      category: 'Workflows',
      label: 'Motion Studio & Timeline',
      sub: 'Configure animation presets and reduced-motion fallback',
      icon: Sparkles,
      action: () => {
        onSelectTab('motion');
        onClose();
      },
    },
    {
      category: 'Workflows',
      label: 'Content Schema Contract',
      sub: 'Manage fields, character limits, and customer permissions',
      icon: FileCode2,
      action: () => {
        onSelectTab('contentSchema');
        onClose();
      },
    },
    {
      category: 'Workflows',
      label: 'Toggle Stress Test Profile',
      sub: 'Simulate long royal names, 6 events, and extreme content',
      icon: Flame,
      action: () => {
        onToggleStressTest();
        onClose();
      },
    },
    {
      category: 'Workflows',
      label: 'Publish Pre-Flight Checklist',
      sub: 'Run 12-point automated audit and release gate',
      icon: Rocket,
      action: () => {
        onOpenPublish();
        onClose();
      },
    },
  ];

  const filtered = commands.filter(
    (c) =>
      c.label.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase()) ||
      c.sub.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '560px',
          background: '#090D1A',
          border: '1px solid rgba(223, 186, 107, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <Search size={18} color="#DFBA6B" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, scene, or action (e.g. 'Souls', 'Mobile', 'Publish')..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fff',
              fontSize: '0.92rem',
            }}
          />
          <span
            style={{
              fontSize: '0.68rem',
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--cel-text-dim, #64748B)',
              fontFamily: 'monospace',
            }}
          >
            ESC to close
          </span>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '8px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--cel-text-muted, #94A3B8)', fontSize: '0.82rem' }}>
              No matching commands or scenes found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;

              return (
                <div
                  key={idx}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: isSelected ? 'rgba(223, 186, 107, 0.16)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.1s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        background: isSelected ? 'rgba(223, 186, 107, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                        color: isSelected ? '#DFBA6B' : 'var(--cel-text-muted, #94A3B8)',
                      }}
                    >
                      <Icon size={16} />
                    </div>

                    <div>
                      <strong style={{ fontSize: '0.86rem', color: isSelected ? '#DFBA6B' : '#fff', display: 'block' }}>
                        {item.label}
                      </strong>
                      <span style={{ fontSize: '0.72rem', color: 'var(--cel-text-dim, #64748B)' }}>
                        {item.sub}
                      </span>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '0.66rem',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--cel-text-dim, #64748B)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
