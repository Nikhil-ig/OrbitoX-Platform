'use client';

import React, { useState } from 'react';
import {
  ComponentDefinition,
  CustomComponentDefinition,
} from '@orbitox/commerce';
import { useBuilderDnd } from './dnd-context';
import {
  IconSearch,
  IconLego,
  IconClose,
  IconSparkles,
  IconTileHero,
  IconTileGrid,
  IconTileCarousel,
  IconTileShield,
  IconTileStory,
  IconTileWhatsApp,
  IconTileNewsletter,
  IconTileBanner,
  IconTileTabs,
  IconTileContainer,
  IconTileModal,
  IconTileDepartment,
  IconTileNav,
  IconTileMarketplace,
  IconTileForm,
} from './studio-icons';

export interface ComponentPaletteProps {
  availableComponents: ComponentDefinition[];
  customComponents: CustomComponentDefinition[];
  onSelectComponent: (type: string) => void;
  onOpenComposer: () => void;
  onEditCustomComponent?: (comp: CustomComponentDefinition) => void;
}

interface TileItem {
  type: string;
  name: string;
  shortLabel: string;
  category: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  isCustom?: boolean;
  customId?: string;
}

interface CategoryGroup {
  id: string;
  title: string;
  items: TileItem[];
}

export function ComponentPalette({
  availableComponents,
  customComponents,
  onSelectComponent,
  onOpenComposer,
  onEditCustomComponent,
}: ComponentPaletteProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'core' | 'market'>('core');
  const [hoveredTile, setHoveredTile] = useState<string | null>(null);
  const { startDrag } = useBuilderDnd();

  // ─── DEFINITION OF 3-COLUMN ICON TILES (MAPPED 100% TO REGISTRY) ───
  const coreCategoryGroups: CategoryGroup[] = [
    {
      id: 'hero',
      title: 'HERO & BANNERS',
      items: [
        {
          type: 'hero',
          name: 'Hero Showcase Runway',
          shortLabel: 'HERO',
          category: 'hero',
          description: 'Full-width cinematic hero with headline, CTA, and media backdrop',
          icon: <IconTileHero size={22} />,
          color: '#C084FC',
          bg: 'rgba(192, 132, 252, 0.15)',
        },
        {
          type: 'video-hero',
          name: 'Cinematic Video Hero',
          shortLabel: 'VIDEO HERO',
          category: 'hero',
          description: 'Full-width auto-playing background video hero banner',
          icon: <IconTileHero size={22} />,
          color: '#E879F9',
          bg: 'rgba(232, 121, 249, 0.15)',
        },
        {
          type: 'announcement-bar',
          name: 'Announcement Bar',
          shortLabel: 'NOTICE',
          category: 'hero',
          description: 'Top notification bar for free shipping, flash notices & discounts',
          icon: <IconTileBanner size={22} />,
          color: '#FBBF24',
          bg: 'rgba(251, 191, 36, 0.15)',
        },
        {
          type: 'header',
          name: 'Header & Navigation',
          shortLabel: 'NAV BAR',
          category: 'hero',
          description: 'Store logo, menu links, search trigger, and cart counter',
          icon: <IconTileNav size={22} />,
          color: '#60A5FA',
          bg: 'rgba(96, 165, 250, 0.15)',
        },
        {
          type: 'promo-ribbon',
          name: 'Animated Promo Ribbon',
          shortLabel: 'MARQUEE',
          category: 'hero',
          description: 'Infinite marquee ticker for bridal drops and trust claims',
          icon: <IconTileBanner size={22} />,
          color: '#F43F5E',
          bg: 'rgba(244, 63, 94, 0.15)',
        },
        {
          type: 'banner',
          name: 'Campaign Banner',
          shortLabel: 'BANNER',
          category: 'hero',
          description: 'High-contrast promotional campaign banner with CTA button',
          icon: <IconTileBanner size={22} />,
          color: '#FB923C',
          bg: 'rgba(251, 146, 60, 0.15)',
        },
      ],
    },
    {
      id: 'commerce',
      title: 'COMMERCE & CATALOG',
      items: [
        {
          type: 'product-grid',
          name: 'Product Grid (3/4 Col)',
          shortLabel: 'GRID',
          category: 'commerce',
          description: 'Dynamic product cards with quick buy, image hover & price tags',
          icon: <IconTileGrid size={22} />,
          color: '#FB923C',
          bg: 'rgba(251, 146, 60, 0.15)',
        },
        {
          type: 'product-carousel',
          name: 'Product Slider Carousel',
          shortLabel: 'SLIDER',
          category: 'commerce',
          description: 'Touch-friendly swipeable carousel for trending collections',
          icon: <IconTileCarousel size={22} />,
          color: '#F97316',
          bg: 'rgba(249, 115, 22, 0.15)',
        },
        {
          type: 'category-grid',
          name: 'Shop by Department',
          shortLabel: 'DEPARTMENTS',
          category: 'commerce',
          description: 'Visual category cards: Bridal, Daily Wear, Heritage Mojaris',
          icon: <IconTileDepartment size={22} />,
          color: '#E5A93C',
          bg: 'rgba(229, 169, 60, 0.15)',
        },
        {
          type: 'featured-product',
          name: 'Product Spotlight',
          shortLabel: 'SPOTLIGHT',
          category: 'commerce',
          description: 'Deep-dive showcase for a single flagship product with quick add',
          icon: <IconTileGrid size={22} />,
          color: '#FBBF24',
          bg: 'rgba(251, 191, 36, 0.15)',
        },
        {
          type: 'collection-grid',
          name: 'Curated Collections',
          shortLabel: 'COLLECTIONS',
          category: 'commerce',
          description: 'Curated collection tiles with item counts and exploration links',
          icon: <IconTileDepartment size={22} />,
          color: '#A855F7',
          bg: 'rgba(168, 85, 247, 0.15)',
        },
        {
          type: 'lookbook-mosaic',
          name: 'Royal Trousseau Lookbook',
          shortLabel: 'LOOKBOOK',
          category: 'commerce',
          description: 'Asymmetric editorial fashion collage with lookbook styling',
          icon: <IconTileStory size={22} />,
          color: '#EC4899',
          bg: 'rgba(236, 72, 153, 0.15)',
        },
      ],
    },
    {
      id: 'trust',
      title: 'TRUST & BRAND PROOF',
      items: [
        {
          type: 'accordion-features',
          name: '100% Bite-Free Soles Guarantee',
          shortLabel: 'BITE-FREE',
          category: 'trust',
          description: 'Trust badge and memory-foam promise for traditional footwear',
          icon: <IconTileShield size={22} />,
          color: '#34D399',
          bg: 'rgba(52, 211, 153, 0.15)',
        },
        {
          type: 'brand-story-timeline',
          name: 'Artisan Heritage Timeline',
          shortLabel: 'TIMELINE',
          category: 'trust',
          description: 'Multi-node milestone journey highlighting royal lineage',
          icon: <IconTileStory size={22} />,
          color: '#38BDF8',
          bg: 'rgba(56, 189, 248, 0.15)',
        },
        {
          type: 'before-after-slider',
          name: 'Raw to Zardozi Slider',
          shortLabel: 'COMPARE',
          category: 'trust',
          description: 'Interactive comparison slider showing raw velvet vs gold embroidery',
          icon: <IconTileCarousel size={22} />,
          color: '#F59E0B',
          bg: 'rgba(245, 158, 11, 0.15)',
        },
        {
          type: 'testimonials',
          name: 'Customer Reviews & Stars',
          shortLabel: 'REVIEWS',
          category: 'trust',
          description: 'Verified buyer testimonials, photo reviews & star ratings',
          icon: <IconTileForm size={22} />,
          color: '#A78BFA',
          bg: 'rgba(167, 139, 250, 0.15)',
        },
        {
          type: 'trust-badges',
          name: 'Trust Badges Strip',
          shortLabel: 'BADGES',
          category: 'trust',
          description: 'Free Shipping, 100% Bite-Free, 24K Gold Zari & Secure Checkout',
          icon: <IconTileShield size={22} />,
          color: '#10B981',
          bg: 'rgba(16, 185, 129, 0.15)',
        },
        {
          type: 'stats-counter',
          name: 'Metrics & Numbers',
          shortLabel: 'STATS',
          category: 'trust',
          description: 'Highlight 50k+ brides, 48h handcrafting, and 0% shoe bites',
          icon: <IconTileGrid size={22} />,
          color: '#60A5FA',
          bg: 'rgba(96, 165, 250, 0.15)',
        },
      ],
    },
    {
      id: 'conversion',
      title: 'CONVERSION & INTERACTIVE',
      items: [
        {
          type: 'size-guide-table',
          name: 'Size Guide & Matrix',
          shortLabel: 'SIZE GUIDE',
          category: 'conversion',
          description: 'Interactive shoe & apparel sizing chart with EU/US/UK tips',
          icon: <IconTileForm size={22} />,
          color: '#E5A93C',
          bg: 'rgba(229, 169, 60, 0.15)',
        },
        {
          type: 'countdown',
          name: 'Flash Sale Countdown',
          shortLabel: 'COUNTDOWN',
          category: 'conversion',
          description: 'Live countdown timer for limited-time festive product drops',
          icon: <IconTileBanner size={22} />,
          color: '#EF4444',
          bg: 'rgba(239, 68, 68, 0.15)',
        },
        {
          type: 'newsletter',
          name: 'VIP Club Newsletter',
          shortLabel: 'NEWSLETTER',
          category: 'conversion',
          description: 'Lead generation email capture with 15% VIP discount reward',
          icon: <IconTileNewsletter size={22} />,
          color: '#FBBF24',
          bg: 'rgba(251, 191, 36, 0.15)',
        },
        {
          type: 'instagram-feed',
          name: 'Instagram Lookbook',
          shortLabel: 'INSTAGRAM',
          category: 'conversion',
          description: 'Curated social lookbook gallery with @orbitox.store handle',
          icon: <IconTileStory size={22} />,
          color: '#EC4899',
          bg: 'rgba(236, 72, 153, 0.15)',
        },
        {
          type: 'faq',
          name: 'FAQ Accordion',
          shortLabel: 'FAQ',
          category: 'conversion',
          description: 'Expandable frequently asked questions for shipping & fit',
          icon: <IconTileTabs size={22} />,
          color: '#818CF8',
          bg: 'rgba(129, 140, 248, 0.15)',
        },
        {
          type: 'contact-form',
          name: 'Concierge Inquiry Form',
          shortLabel: 'CONTACT',
          category: 'conversion',
          description: 'Interactive booking form for bespoke bridal couture appointments',
          icon: <IconTileForm size={22} />,
          color: '#34D399',
          bg: 'rgba(52, 211, 153, 0.15)',
        },
      ],
    },
    {
      id: 'editorial',
      title: 'EDITORIAL & LAYOUT',
      items: [
        {
          type: 'text-block',
          name: 'Rich Text Section',
          shortLabel: 'TEXT',
          category: 'editorial',
          description: 'Editorial article block for brand storytelling & manifesto',
          icon: <IconTileContainer size={22} />,
          color: '#94A3B8',
          bg: 'rgba(148, 163, 184, 0.15)',
        },
        {
          type: 'image-block',
          name: 'Full Width Image',
          shortLabel: 'IMAGE',
          category: 'editorial',
          description: 'High-res full width photo showcase with caption & CTA',
          icon: <IconTileStory size={22} />,
          color: '#C084FC',
          bg: 'rgba(192, 132, 252, 0.15)',
        },
        {
          type: 'video-block',
          name: 'Video Showcase',
          shortLabel: 'VIDEO',
          category: 'editorial',
          description: 'Cinematic video player with MP4 & streaming embeds',
          icon: <IconTileHero size={22} />,
          color: '#38BDF8',
          bg: 'rgba(56, 189, 248, 0.15)',
        },
        {
          type: 'custom-html',
          name: 'Custom HTML Block',
          shortLabel: 'CODE EMBED',
          category: 'editorial',
          description: 'Raw HTML/CSS embed block for third-party scripts & widgets',
          icon: <IconTileModal size={22} />,
          color: '#F43F5E',
          bg: 'rgba(244, 63, 94, 0.15)',
        },
        {
          type: 'footer',
          name: 'Storefront Footer',
          shortLabel: 'FOOTER',
          category: 'editorial',
          description: 'Multi-column footer with copyright, links, and payment badges',
          icon: <IconTileNav size={22} />,
          color: '#E5A93C',
          bg: 'rgba(229, 169, 60, 0.15)',
        },
      ],
    },
  ];

  // ─── MARKETPLACE / CUSTOM LEGO GROUP ────────────────────────────
  const marketCategoryGroups: CategoryGroup[] = [
    {
      id: 'custom_blocks',
      title: 'CUSTOM MODULAR LEGO BLOCKS',
      items: customComponents.map((c) => ({
        type: c.type,
        name: c.name,
        shortLabel: c.name.slice(0, 8).toUpperCase(),
        category: 'custom',
        description: c.description || 'Custom modular component built with LEGO Composer',
        icon: <IconTileMarketplace size={22} />,
        color: '#F472B6',
        bg: 'rgba(244, 114, 182, 0.15)',
        isCustom: true,
        customId: c.id,
      })),
    },
  ];

  const activeGroups = activeTab === 'core' ? coreCategoryGroups : marketCategoryGroups;

  // Filter items by search query
  const filteredGroups = activeGroups
    .map((group) => {
      const filteredItems = group.items.filter(
        (item) =>
          !searchQuery.trim() ||
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.shortLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return { ...group, items: filteredItems };
    })
    .filter((group) => group.items.length > 0);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        height: '100%',
        minHeight: 0,
        flex: 1,
        userSelect: 'none',
      }}
    >
      {/* ─── 1. SEARCH CAPSULE ──────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '6px 10px',
            gap: '8px',
          }}
        >
          <IconSearch size={13} style={{ color: '#64748B' }} />
          <input
            type="text"
            placeholder="Search widgets & blocks..."
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
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
            >
              <IconClose size={12} />
            </button>
          )}
        </div>

        {/* ─── 2. TAB SWITCHER (CORE BLOCKS vs MARKETPLACE) ─────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: 'rgba(0, 0, 0, 0.35)',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            gap: '3px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('core')}
            style={{
              padding: '5px 0',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'core' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              color: activeTab === 'core' ? '#FFF' : '#94A3B8',
              fontSize: '10px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Core Library ({coreCategoryGroups.reduce((acc, g) => acc + g.items.length, 0)})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('market')}
            style={{
              padding: '5px 0',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'market' ? 'rgba(229, 169, 60, 0.2)' : 'transparent',
              color: activeTab === 'market' ? '#FCD34D' : '#94A3B8',
              fontSize: '10px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
          >
            <IconSparkles size={11} />
            <span>Custom LEGO ({customComponents.length})</span>
          </button>
        </div>

        {/* ─── 3. LEGO BLOCK CREATOR / MARKET BUTTON ────────────────── */}
        <button
          type="button"
          onClick={onOpenComposer}
          style={{
            padding: '7px 10px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, rgba(229, 169, 60, 0.15), rgba(249, 115, 22, 0.15))',
            border: '1px solid rgba(229, 169, 60, 0.4)',
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
          <IconLego size={13} />
          <span>+ Create Custom LEGO Block</span>
        </button>
      </div>

      {/* ─── 4. CATEGORIZED 3-COLUMN ICON TILES SCROLLER ───────────── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          overflowY: 'auto',
          flex: 1,
          minHeight: 0,
          paddingRight: '2px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {filteredGroups.map((group) => (
          <div key={group.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Category Subheader */}
            <div
              style={{
                fontSize: '9px',
                fontWeight: 800,
                color: '#64748B',
                letterSpacing: '0.08em',
                paddingLeft: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{group.title}</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.05)' }} />
            </div>

            {/* 3-Column Tile Matrix */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px',
              }}
            >
              {group.items.map((item) => {
                const isHovered = hoveredTile === item.type;

                return (
                  <div
                    key={item.type}
                    title={`${item.name} — ${item.description}`}
                    onPointerEnter={() => setHoveredTile(item.type)}
                    onPointerLeave={() => setHoveredTile(null)}
                    onPointerDown={(e) => {
                      startDrag(
                        {
                          type: 'new-component',
                          componentType: item.type,
                          name: item.name,
                          icon: 'block',
                        },
                        e
                      );
                    }}
                    onClick={() => onSelectComponent(item.type)}
                    style={{
                      height: '68px',
                      borderRadius: '8px',
                      background: isHovered ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.025)',
                      border: isHovered
                        ? `1px solid ${item.color}`
                        : '1px solid rgba(255, 255, 255, 0.07)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      cursor: 'grab',
                      transition: 'all 0.12s ease',
                      boxShadow: isHovered
                        ? `0 4px 14px rgba(0, 0, 0, 0.6), 0 0 10px ${item.bg}`
                        : 'none',
                      transform: isHovered ? 'translateY(-1px)' : 'none',
                      padding: '4px 2px',
                    }}
                  >
                    {/* Centered Micro-Wireframe SVG Icon */}
                    <div
                      style={{
                        color: isHovered ? item.color : '#94A3B8',
                        transition: 'color 0.12s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {item.icon}
                    </div>

                    {/* Tiny Uppercase Label */}
                    <span
                      style={{
                        fontSize: '7.5px',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        color: isHovered ? '#FFF' : '#64748B',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '92%',
                      }}
                    >
                      {item.shortLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
