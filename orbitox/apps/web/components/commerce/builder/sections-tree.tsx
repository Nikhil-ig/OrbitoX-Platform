'use client';

import React, { useState } from 'react';
import { PageSection, StorePage } from '@orbitox/commerce';
import { useBuilderDnd } from './dnd-context';
import {
  IconSearch,
  IconPlus,
  IconEye,
  IconEyeOff,
  IconCopy,
  IconTrash,
  IconChevronUp,
  IconChevronDown,
  IconDragGrip,
  IconChevronRight,
  IconCrown,
  IconShoppingBag,
  IconShieldCheck,
  IconLayers,
  IconMessageCircle,
  IconBolt,
  IconFileText,
  IconPalette,
  IconSidebar,
  IconGrid,
  IconTag,
} from './studio-icons';

export interface SectionsTreeProps {
  sections: PageSection[];
  selectedSectionId: string | null;
  onSelectSection: (id: string) => void;
  onMoveSection: (id: string, direction: 'up' | 'down') => void;
  onDuplicateSection: (id: string) => void;
  onDeleteSection: (id: string) => void;
  onToggleSection: (id: string) => void;
  onAddSectionClick: () => void;
  allPages?: StorePage[];
  activePageSlug?: string;
  onSelectPage?: (slug: string) => void;
  onOpenNewPageModal?: () => void;
}

// Map each section type to its dedicated vector icon, color tint, and category label
const SECTION_METADATA: Record<
  string,
  { icon: React.ReactNode; color: string; bg: string; border: string; category: string }
> = {
  hero: {
    icon: <IconCrown size={13} />,
    color: '#C084FC',
    bg: 'rgba(192, 132, 252, 0.12)',
    border: 'rgba(192, 132, 252, 0.3)',
    category: 'Hero',
  },
  featured_products: {
    icon: <IconShoppingBag size={13} />,
    color: '#FB923C',
    bg: 'rgba(251, 146, 60, 0.12)',
    border: 'rgba(251, 146, 60, 0.3)',
    category: 'Catalog',
  },
  bite_free_guarantee: {
    icon: <IconShieldCheck size={13} />,
    color: '#34D399',
    bg: 'rgba(52, 211, 153, 0.12)',
    border: 'rgba(52, 211, 153, 0.3)',
    category: 'Trust',
  },
  craft_story: {
    icon: <IconLayers size={13} />,
    color: '#38BDF8',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.3)',
    category: 'Story',
  },
  whatsapp_cta: {
    icon: <IconMessageCircle size={13} />,
    color: '#4ADE80',
    bg: 'rgba(74, 222, 128, 0.12)',
    border: 'rgba(74, 222, 128, 0.3)',
    category: 'Checkout',
  },
  custom_component: {
    icon: <IconPalette size={13} />,
    color: '#F472B6',
    bg: 'rgba(244, 114, 182, 0.12)',
    border: 'rgba(244, 114, 182, 0.3)',
    category: 'LEGO',
  },
  newsletter: {
    icon: <IconFileText size={13} />,
    color: '#FBBF24',
    bg: 'rgba(251, 191, 36, 0.12)',
    border: 'rgba(251, 191, 36, 0.3)',
    category: 'Growth',
  },
  banner: {
    icon: <IconTag size={13} />,
    color: '#818CF8',
    bg: 'rgba(129, 140, 248, 0.12)',
    border: 'rgba(129, 140, 248, 0.3)',
    category: 'Promo',
  },
};

const DEFAULT_META = {
  icon: <IconGrid size={13} />,
  color: '#94A3B8',
  bg: 'rgba(148, 163, 184, 0.1)',
  border: 'rgba(148, 163, 184, 0.2)',
  category: 'Block',
};

const PAGE_DOT_COLORS = ['#A855F7', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#EC4899'];

export function SectionsTree({
  sections,
  selectedSectionId,
  onSelectSection,
  onMoveSection,
  onDuplicateSection,
  onDeleteSection,
  onToggleSection,
  onAddSectionClick,
  allPages = [],
  activePageSlug = '/',
  onSelectPage,
  onOpenNewPageModal,
}: SectionsTreeProps) {
  const { startDrag } = useBuilderDnd();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pageCardCollapsed, setPageCardCollapsed] = useState<boolean>(false);
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);

  const filteredSections = searchQuery.trim()
    ? sections.filter(
        (s) =>
          (s.name || s.type).toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sections;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', userSelect: 'none' }}>
      {/* ─── CARD 1: STOREFRONT PAGES ──────────────────────────────── */}
      <div
        style={{
          background: 'rgba(18, 21, 33, 0.92)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          flexShrink: 0,
        }}
      >
        {/* Card Header */}
        <div
          onClick={() => setPageCardCollapsed(!pageCardCollapsed)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            padding: '2px 4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IconSidebar size={13} style={{ color: '#60A5FA' }} />
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#FFF', letterSpacing: '-0.01em' }}>
              Pages
            </span>
            <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>({allPages.length})</span>
          </div>
          <span style={{ color: '#64748B', display: 'flex', alignItems: 'center' }}>
            {pageCardCollapsed ? <IconChevronRight size={14} /> : <IconChevronDown size={14} />}
          </span>
        </div>

        {!pageCardCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {allPages.map((pg, idx) => {
              const isActive = pg.slug === activePageSlug;
              const dotColor = PAGE_DOT_COLORS[idx % PAGE_DOT_COLORS.length];

              return (
                <div
                  key={pg.id || pg.slug}
                  onClick={() => onSelectPage && onSelectPage(pg.slug)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    border: isActive ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: dotColor,
                        boxShadow: `0 0 6px ${dotColor}`,
                      }}
                    />
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: isActive ? 800 : 500,
                        color: isActive ? '#FFF' : '#94A3B8',
                      }}
                    >
                      {pg.title || (pg.isHome ? 'Home Page' : pg.slug)}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '10px',
                      color: '#64748B',
                      background: 'rgba(255, 255, 255, 0.04)',
                      padding: '2px 5px',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                    }}
                  >
                    ⌘{idx + 1}
                  </span>
                </div>
              );
            })}

            {/* [+ Add New Page] Dashed Button */}
            {onOpenNewPageModal && (
              <button
                type="button"
                onClick={onOpenNewPageModal}
                style={{
                  marginTop: '4px',
                  width: '100%',
                  padding: '6px',
                  borderRadius: '8px',
                  background: 'rgba(59, 130, 246, 0.06)',
                  border: '1px dashed rgba(59, 130, 246, 0.35)',
                  color: '#60A5FA',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease',
                }}
              >
                <IconPlus size={13} />
                <span>Add New Page</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── CARD 2: SECTION LAYERS ─────────────────────────────────── */}
      <div
        style={{
          background: 'rgba(18, 21, 33, 0.92)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Card Header with Quick Add Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IconLayers size={14} style={{ color: '#E5A93C' }} />
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#FFF', letterSpacing: '-0.01em' }}>
              Layers
            </span>
            <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>({sections.length})</span>
          </div>
          <button
            type="button"
            onClick={onAddSectionClick}
            title="Add Component to Page"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, rgba(229, 169, 60, 0.15), rgba(249, 115, 22, 0.15))',
              border: '1px solid rgba(229, 169, 60, 0.4)',
              color: '#FCD34D',
              fontSize: '10px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <IconPlus size={11} />
            <span>Add</span>
          </button>
        </div>

        {/* Search Filter Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '5px 8px',
            gap: '6px',
          }}
        >
          <IconSearch size={12} style={{ color: '#64748B' }} />
          <input
            type="text"
            placeholder="Search layers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFF',
              fontSize: '11px',
              width: '100%',
              outline: 'none',
            }}
          />
        </div>

        {/* Section Layers List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {filteredSections.map((sec, idx) => {
            const isSelected = selectedSectionId === sec.id;
            const isHovered = hoveredSectionId === sec.id;
            const meta = SECTION_METADATA[sec.type] || DEFAULT_META;

            return (
              <div
                key={sec.id}
                onClick={() => onSelectSection(sec.id)}
                onPointerEnter={() => setHoveredSectionId(sec.id)}
                onPointerLeave={() => setHoveredSectionId(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderRadius: '8px',
                  background: isSelected
                    ? 'rgba(229, 169, 60, 0.15)'
                    : isHovered
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'transparent',
                  border: isSelected
                    ? '1px solid rgba(229, 169, 60, 0.4)'
                    : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                  opacity: sec.enabled ? 1 : 0.45,
                }}
              >
                {/* Left: Drag Handle, Category Icon Squircle & Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <span
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      startDrag(
                        {
                          type: 'existing-section',
                          sectionId: sec.id,
                          name: sec.name || sec.type,
                          icon: '↕',
                        },
                        e
                      );
                    }}
                    style={{
                      cursor: 'grab',
                      color: isHovered || isSelected ? '#94A3B8' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <IconDragGrip size={12} />
                  </span>

                  {/* Icon Squircle Badge */}
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '5px',
                      background: meta.bg,
                      border: `1px solid ${meta.border}`,
                      color: meta.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {meta.icon}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: isSelected ? 800 : 500,
                        color: isSelected ? '#FFF' : '#CBD5E1',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {sec.name || sec.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Right Actions: Logic Pill & Hover Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                  {sec.logic?.enabled && (
                    <span
                      title="Logic Trigger Active"
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '4px',
                        background: 'rgba(168, 85, 247, 0.25)',
                        color: '#C084FC',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '2px',
                      }}
                    >
                      <IconBolt size={9} />
                    </span>
                  )}

                  {/* Move Up */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveSection(sec.id, 'up');
                    }}
                    disabled={idx === 0}
                    title="Move Up"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: idx === 0 ? '#333' : '#94A3B8',
                      cursor: idx === 0 ? 'default' : 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <IconChevronUp size={11} />
                  </button>

                  {/* Move Down */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveSection(sec.id, 'down');
                    }}
                    disabled={idx === sections.length - 1}
                    title="Move Down"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: idx === sections.length - 1 ? '#333' : '#94A3B8',
                      cursor: idx === sections.length - 1 ? 'default' : 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <IconChevronDown size={11} />
                  </button>

                  {/* Visibility Toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSection(sec.id);
                    }}
                    title={sec.enabled ? 'Hide' : 'Show'}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: sec.enabled ? '#94A3B8' : '#EF4444',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {sec.enabled ? <IconEye size={12} /> : <IconEyeOff size={12} />}
                  </button>

                  {/* Duplicate */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateSection(sec.id);
                    }}
                    title="Duplicate"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <IconCopy size={12} />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSection(sec.id);
                    }}
                    title="Delete"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#EF4444',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <IconTrash size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Dashed Add Section Button */}
        <button
          type="button"
          onClick={onAddSectionClick}
          style={{
            marginTop: '4px',
            width: '100%',
            padding: '7px',
            borderRadius: '8px',
            background: 'rgba(229, 169, 60, 0.06)',
            border: '1px dashed rgba(229, 169, 60, 0.4)',
            color: '#FCD34D',
            fontSize: '11px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <IconPlus size={13} />
          <span>Add Section to Storefront</span>
        </button>
      </div>
    </div>
  );
}
