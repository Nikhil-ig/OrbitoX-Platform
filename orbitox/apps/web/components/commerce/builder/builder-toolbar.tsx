'use client';

import React from 'react';
import { StorePage } from '@orbitox/commerce';
import {
  IconBrandLogo,
  IconSettings,
  IconUndo,
  IconRedo,
  IconDesktop,
  IconTablet,
  IconMobile,
  IconGrid,
  IconPlay,
  IconSidebar,
  IconChevronLeft,
  IconChevronRight,
} from './studio-icons';

export interface BuilderToolbarProps {
  storeSlug: string;
  storeName: string;
  allPages: StorePage[];
  activePageSlug: string;
  onSelectPage: (slug: string) => void;
  onOpenNewPageModal: () => void;
  onOpenPageSettingsModal: () => void;
  previewDevice: 'desktop' | 'tablet' | 'mobile';
  onChangePreviewDevice: (device: 'desktop' | 'tablet' | 'mobile') => void;
  isDirty: boolean;
  onDiscardDraft: () => void;
  onPublishPage: () => void;
  onOpenAutopilot: () => void;
  onOpenComposer: () => void;
  onOpenLaunchpad?: () => void;
  onOpenTemplatesModal?: () => void;
  onOpenPlatformTheme?: () => void;
  publishSuccessMessage?: string | null;

  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;

  leftSidebarOpen?: boolean;
  onToggleLeftSidebar?: () => void;
  rightSidebarOpen?: boolean;
  onToggleRightSidebar?: () => void;
}

export function BuilderToolbar({
  storeSlug,
  storeName,
  allPages,
  activePageSlug,
  onSelectPage,
  onOpenNewPageModal,
  onOpenPageSettingsModal,
  previewDevice,
  onChangePreviewDevice,
  isDirty,
  onDiscardDraft,
  onPublishPage,
  onOpenAutopilot,
  onOpenComposer,
  onOpenLaunchpad,
  onOpenTemplatesModal,
  onOpenPlatformTheme,
  publishSuccessMessage,
  onUndo,
  onRedo,
  canUndo = true,
  canRedo = false,
  leftSidebarOpen = true,
  onToggleLeftSidebar,
  rightSidebarOpen = true,
  onToggleRightSidebar,
}: BuilderToolbarProps) {
  const currentPage = allPages.find((p) => p.slug === activePageSlug);

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 16px',
        borderRadius: '14px',
        background: 'rgba(15, 17, 26, 0.92)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        flexShrink: 0,
        gap: '12px',
        userSelect: 'none',
      }}
    >
      {/* Left: Left Sidebar Toggle, Brand Identity & Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Toggle Left Sidebar (Layers & Pages) */}
        {onToggleLeftSidebar && (
          <button
            type="button"
            onClick={onToggleLeftSidebar}
            title={leftSidebarOpen ? 'Collapse Left Layers Panel' : 'Expand Left Layers Panel'}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: leftSidebarOpen ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: leftSidebarOpen ? '#60A5FA' : '#94A3B8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <IconSidebar size={14} />
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <IconBrandLogo size={28} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFF', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              {storeName || 'Patiala Shahi Jutti House'}
            </div>
            <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 500 }}>
              Visual Storefront Builder &bull; Live Editor
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenPageSettingsModal}
            title="Page & SEO Settings"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94A3B8',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <IconSettings size={14} />
          </button>
        </div>

        {/* Undo / Redo */}
        {onUndo && (
          <div
            style={{
              display: 'flex',
              gap: '2px',
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '2px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (⌘Z)"
              style={{
                background: 'transparent',
                border: 'none',
                color: canUndo ? '#CBD5E1' : '#475569',
                cursor: canUndo ? 'pointer' : 'default',
                padding: '4px 6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
              }}
            >
              <IconUndo size={13} />
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (⌘⇧Z)"
              style={{
                background: 'transparent',
                border: 'none',
                color: canRedo ? '#CBD5E1' : '#475569',
                cursor: canRedo ? 'pointer' : 'default',
                padding: '4px 6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
              }}
            >
              <IconRedo size={13} />
            </button>
          </div>
        )}

        {/* Theme Kits Market Library (Canva / Figma Style) */}
        {onOpenTemplatesModal && (
          <button
            type="button"
            onClick={onOpenTemplatesModal}
            title="Browse & Apply Turnkey Pre-Built Storefront Theme Kits"
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              border: '1px solid rgba(229, 169, 60, 0.6)',
              background: 'linear-gradient(135deg, rgba(229, 169, 60, 0.3), rgba(245, 158, 11, 0.18))',
              color: '#FDE047',
              fontSize: '11px',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(229, 169, 60, 0.35)',
              transition: 'all 0.15s ease',
              letterSpacing: '0.02em',
            }}
          >
            <span>👑</span>
            <span>Theme Kits Library</span>
          </button>
        )}

        {/* Platform Theme Studio */}
        {onOpenPlatformTheme && (
          <button
            type="button"
            onClick={onOpenPlatformTheme}
            title="Open Platform Workspace Theme & Style Studio"
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              border: '1px solid var(--ui-border-default, rgba(168, 85, 247, 0.4))',
              background: 'var(--ui-bg-card, rgba(168, 85, 247, 0.15))',
              color: 'var(--ui-text-accent, #C084FC)',
              fontSize: '11px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 0 14px var(--ui-accent-glow, rgba(168, 85, 247, 0.25))',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🎨</span>
            <span>Platform Theme</span>
          </button>
        )}
      </div>

      {/* Right Controls: Device Viewport, Right Sidebar Toggle, Live Store Preview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Collaborators Avatar Stack */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {[
            { label: 'JD', bg: '#A855F7' },
            { label: 'NK', bg: '#3B82F6' },
            { label: 'SK', bg: '#10B981' },
          ].map((u, i) => (
            <div
              key={i}
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: u.bg,
                border: '2px solid #0D0F18',
                marginLeft: i > 0 ? '-6px' : '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                fontWeight: 800,
                color: '#FFF',
              }}
            >
              {u.label}
            </div>
          ))}
        </div>

        {/* Segmented Device Viewport Switcher */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '8px',
            padding: '2px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {[
            { id: 'desktop', icon: <IconDesktop size={13} />, label: 'Desktop' },
            { id: 'tablet', icon: <IconTablet size={13} />, label: 'Tablet' },
            { id: 'mobile', icon: <IconMobile size={13} />, label: 'Mobile' },
          ].map((dev) => {
            const isActive = previewDevice === dev.id;
            return (
              <button
                key={dev.id}
                type="button"
                onClick={() => onChangePreviewDevice(dev.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: isActive ? 'linear-gradient(135deg, #6366F1, #4F46E5)' : 'transparent',
                  color: isActive ? '#FFF' : '#94A3B8',
                  fontSize: '11px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {dev.icon}
                <span>{dev.label}</span>
              </button>
            );
          })}
        </div>

        {/* Toggle Right Inspector Panel */}
        {onToggleRightSidebar && (
          <button
            type="button"
            onClick={onToggleRightSidebar}
            title={rightSidebarOpen ? 'Collapse Property Inspector' : 'Expand Property Inspector'}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: rightSidebarOpen ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: rightSidebarOpen ? '#60A5FA' : '#94A3B8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <IconSidebar size={14} />
          </button>
        )}

        {/* Live Customer Storefront Preview Link */}
        <a
          href={`/store/${storeSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Open Live Customer Storefront"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: '#2563EB',
            border: 'none',
            color: '#FFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 0 12px rgba(37, 99, 235, 0.5)',
            textDecoration: 'none',
          }}
        >
          <IconPlay size={11} />
        </a>
      </div>
    </header>
  );
}
