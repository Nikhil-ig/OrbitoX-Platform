'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCommerceStores } from '@orbitox/commerce';
import { useTheme } from '@orbitox/ui';
import { CommandPalette } from '@/components/commerce/command-palette';
import { PlatformThemeCustomizerModal } from '@/components/commerce/platform-theme-customizer-modal';
import {
  IconBrandLogo,
  IconSettings,
  IconSearch,
  IconCrown,
  IconSparkles,
  IconLego,
  IconBolt,
  IconShoppingBag,
  IconChartBar,
  IconPalette,
  IconFileText,
  IconImage,
  IconTag,
  IconPackage,
  IconUsers,
  IconBot,
  IconCreditCard,
  IconSidebar,
  IconRocket,
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
} from '@/components/commerce/builder/studio-icons';

export default function CommerceAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentTheme } = useTheme();
  const { stores, activeStore, setActiveStore, createStore } = useCommerceStores();
  const [createStoreModalOpen, setCreateStoreModalOpen] = useState<boolean>(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [themeModalOpen, setThemeModalOpen] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [newStoreName, setNewStoreName] = useState<string>('');
  const [newStoreSlug, setNewStoreSlug] = useState<string>('');
  const [newStoreTagline, setNewStoreTagline] = useState<string>('');
  const [newStoreTheme, setNewStoreTheme] = useState<string>('punjabi-jutti-royal');
  const [newStoreCurrency, setNewStoreCurrency] = useState<string>('INR');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentSlug = activeStore?.slug || 'punjabi-jutti';

  const dockApps = [
    { id: 'commerce', icon: <IconShoppingBag size={18} />, label: 'Commerce OS', path: '/commerce' },
    {
      id: 'hms',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 6v12M6 12h12" />
          <path d="M3 3h18v18H3z" />
        </svg>
      ),
      label: 'Hospital OS',
      path: '/hms',
    },
    { id: 'automations', icon: <IconBolt size={18} />, label: 'Automations (n8n)', path: '/automations' },
    { id: 'marketplace', icon: <IconLego size={18} />, label: 'App Market', path: '/admin/marketplace' },
    { id: 'crm', icon: <IconUsers size={18} />, label: 'CRM Leads', path: '/crm/leads' },
    { id: 'inventory', icon: <IconPackage size={18} />, label: 'Inventory', path: '/inventory/items' },
    { id: 'finance', icon: <IconCreditCard size={18} />, label: 'Billing & Invoices', path: '/finance/invoices' },
  ];

  const navigationSections = [
    {
      title: 'Storefront & Studio',
      items: [
        { label: 'Dashboard Overview', href: '/commerce', icon: <IconChartBar size={15} /> },
        { label: 'Creative Store Builder', href: '/commerce/store/builder', icon: <IconPalette size={15} /> },
        { label: 'Pages & CMS', href: '/commerce/store/pages', icon: <IconFileText size={15} /> },
        { label: 'Theme Studio', href: '/commerce/store/theme', icon: <IconSparkles size={15} /> },
      ],
    },
    {
      title: 'Catalog & Inventory',
      items: [
        { label: 'Products & Variants', href: '/commerce/products', icon: <IconShoppingBag size={15} /> },
        { label: 'Media Library', href: '/commerce/media', icon: <IconImage size={15} /> },
        { label: 'Discounts & Promo', href: '/commerce/discounts', icon: <IconTag size={15} /> },
      ],
    },
    {
      title: 'Operations & Pipeline',
      items: [
        { label: 'Orders & Pipeline', href: '/commerce/orders', icon: <IconPackage size={15} /> },
        { label: 'Customers CRM', href: '/commerce/customers', icon: <IconUsers size={15} /> },
        { label: 'Automations (n8n)', href: '/commerce/automations', icon: <IconBot size={15} /> },
      ],
    },
  ];

  const storePresets = [
    {
      id: 'preset_jutti',
      name: 'Patiala Shahi Juttis',
      slug: 'patiala-juttis',
      tagline: 'Handcrafted Royal Punjabi Juttis & Phulkari Couture',
      themeId: 'punjabi-jutti-royal',
      currency: 'INR',
      badge: 'Royal Heritage',
    },
    {
      id: 'preset_aura',
      name: 'AURA Luxury',
      slug: 'aura-couture',
      tagline: 'Haute Couture & Fine Living',
      themeId: 'aura-luxury-dark',
      currency: 'USD',
      badge: 'High Fashion',
    },
  ];

  const handleApplyPreset = (preset: typeof storePresets[0]) => {
    setNewStoreName(preset.name);
    setNewStoreSlug(preset.slug);
    setNewStoreTagline(preset.tagline);
    setNewStoreTheme(preset.themeId);
    setNewStoreCurrency(preset.currency);
  };

  const handleCreateStoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName || !newStoreSlug) return;
    createStore({
      name: newStoreName,
      slug: newStoreSlug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-'),
      tagline: newStoreTagline,
      themeId: newStoreTheme,
      currency: newStoreCurrency,
    });
    setCreateStoreModalOpen(false);
    setNewStoreName('');
    setNewStoreSlug('');
    setNewStoreTagline('');
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        background: '#07080D',
        color: '#FFF',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
      }}
    >
      {/* ─── TIER 1: Leftmost Slim Cloud Dock (~68px) ─── */}
      <div
        className="glass-dock"
        style={{
          width: '64px',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '14px 0',
          gap: '10px',
          boxSizing: 'border-box',
          flexShrink: 0,
          background: 'rgba(10, 12, 18, 0.95)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: 40,
        }}
      >
        {/* Brand Logo */}
        <Link
          href="/commerce"
          title="OrbitoX Platform"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '6px',
            textDecoration: 'none',
          }}
        >
          <IconBrandLogo size={34} />
        </Link>

        {/* Sidebar Collapse / Expand Toggle Button */}
        <button
          type="button"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Navigation Sidebar'}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: sidebarCollapsed ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.04)',
            color: sidebarCollapsed ? '#60A5FA' : '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <IconSidebar size={16} />
        </button>

        {/* Dock App Icons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          {dockApps.map((app) => {
            const isDockActive = app.id === 'commerce';
            return (
              <Link
                key={app.id}
                href={app.path}
                title={app.label}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  border: isDockActive ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid transparent',
                  background: isDockActive
                    ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(99, 102, 241, 0.15) 100%)'
                    : 'rgba(255, 255, 255, 0.03)',
                  boxShadow: isDockActive ? '0 0 14px rgba(168, 85, 247, 0.3)' : 'none',
                  color: isDockActive ? '#FFFFFF' : '#94A3B8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {app.icon}
              </Link>
            );
          })}
        </div>

        {/* Platform Theme Switcher Button */}
        <button
          type="button"
          onClick={() => setThemeModalOpen(true)}
          title={`Platform Theme: ${currentTheme.name}`}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            border: '1px solid var(--ui-border-default, rgba(255, 255, 255, 0.12))',
            background: 'var(--ui-bg-card, rgba(255, 255, 255, 0.05))',
            color: 'var(--ui-accent-primary, #A855F7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            cursor: 'pointer',
            boxShadow: '0 0 14px var(--ui-accent-glow, rgba(168, 85, 247, 0.3))',
            transition: 'all 0.15s ease',
            marginBottom: '4px',
          }}
        >
          {currentTheme.icon || '🎨'}
        </button>

        {/* Bottom User Avatar */}
        <div
          title="Logged in as Admin"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #FF6B4A, #E5A93C)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '12px',
            color: '#000',
            boxShadow: '0 0 10px rgba(255, 107, 74, 0.3)',
            cursor: 'pointer',
          }}
        >
          JD
        </div>
      </div>

      {/* ─── TIER 2: Collapsible Hierarchical Tree Navigation Sidebar ─── */}
      <aside
        className="glass-sidebar"
        style={{
          width: sidebarCollapsed ? '0px' : '240px',
          opacity: sidebarCollapsed ? 0 : 1,
          padding: sidebarCollapsed ? '0px' : '16px 12px',
          overflow: 'hidden',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          flexShrink: 0,
          background: 'var(--ui-bg-sidebar, rgba(13, 15, 24, 0.95))',
          borderRight: sidebarCollapsed ? 'none' : '1px solid var(--ui-border-default, rgba(255, 255, 255, 0.08))',
          transition: 'width 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease, padding 0.22s ease',
          userSelect: 'none',
        }}
      >
        {/* Workspace Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: '216px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ui-text-primary, #FFF)', letterSpacing: '-0.01em' }}>
              Commerce OS
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setThemeModalOpen(true)}
              title={`Platform Theme: ${currentTheme.name}`}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--ui-border-default, rgba(255, 255, 255, 0.1))',
                borderRadius: '6px',
                color: 'var(--ui-accent-primary, #A855F7)',
                fontSize: '10px',
                fontWeight: 800,
                padding: '3px 7px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>{currentTheme.icon}</span>
              <span>Theme</span>
            </button>
            <button
              type="button"
              title="Open Command Palette (⌘K)"
              onClick={() => setCommandPaletteOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--ui-text-secondary, #94A3B8)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
              }}
            >
              <IconSettings size={14} />
            </button>
          </div>
        </div>

        {/* Active Store Switcher Dropdown */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            minWidth: '216px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <IconCrown size={12} style={{ color: '#E5A93C' }} />
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#E5A93C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Active Store
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCreateStoreModalOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#60A5FA',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              <IconPlus size={11} />
              <span>New</span>
            </button>
          </div>
          <select
            value={activeStore?.id || ''}
            onChange={(e) => {
              const s = stores.find((st) => st.id === e.target.value);
              if (s) setActiveStore(s);
            }}
            style={{
              width: '100%',
              padding: '4px 6px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#FFF',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id} style={{ background: '#131625', color: '#FFF' }}>
                {s.name} ({s.slug})
              </option>
            ))}
          </select>
        </div>

        {/* Search Bar with ⌘K Badge */}
        <div
          onClick={() => setCommandPaletteOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '5px 8px',
            gap: '6px',
            cursor: 'pointer',
            minWidth: '216px',
          }}
        >
          <IconSearch size={12} style={{ color: '#64748B' }} />
          <span style={{ fontSize: '11px', color: '#64748B', flex: 1 }}>Search or jump to...</span>
          <span
            style={{
              fontSize: '9px',
              color: '#94A3B8',
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '1px 4px',
              borderRadius: '4px',
              fontFamily: 'monospace',
            }}
          >
            ⌘K
          </span>
        </div>

        {/* Navigation Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, overflowY: 'auto', minWidth: '216px' }}>
          {navigationSections.map((sec, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '2px 8px',
                  marginBottom: '2px',
                }}
              >
                {sec.title}
              </div>
              {sec.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 8px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: isActive ? 800 : 500,
                      color: isActive ? '#FFF' : '#94A3B8',
                      background: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                      border: isActive ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid transparent',
                      textDecoration: 'none',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    <span style={{ color: isActive ? '#60A5FA' : '#64748B', display: 'flex', alignItems: 'center' }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom Upgrade Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.12))',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '10px',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            minWidth: '216px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IconRocket size={14} style={{ color: '#A855F7' }} />
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#FFF' }}>Traditional Pro Plan</div>
          </div>
          <div style={{ fontSize: '10px', color: '#94A3B8', lineHeight: 1.3 }}>
            Full multi-store scale, custom domains & n8n engine.
          </div>
          <button
            type="button"
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              border: 'none',
              color: '#FFF',
              fontSize: '10px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Manage Subscription
          </button>
        </div>
      </aside>

      {/* ─── TIER 3: Main Page Content Workspace ─── */}
      <main
        style={{
          flex: 1,
          height: '100vh',
          maxHeight: '100vh',
          minHeight: 0,
          overflow: pathname?.startsWith('/commerce/store/builder') ? 'hidden' : 'auto',
          overflowY: pathname?.startsWith('/commerce/store/builder') ? 'hidden' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          background: '#0B0D14',
          position: 'relative',
        }}
      >
        {children}
      </main>

      {/* Modal: Create New Multi-Tenant Store */}
      {createStoreModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              background: '#121420',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconCrown size={20} style={{ color: '#E5A93C' }} />
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', margin: 0 }}>
                  Create New Storefront
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCreateStoreModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStoreSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
                  Store Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amritsar Phulkari Emporium"
                  value={newStoreName}
                  onChange={(e) => {
                    setNewStoreName(e.target.value);
                    if (!newStoreSlug) {
                      setNewStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFF',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
                  Store Subdomain Slug
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. amritsar-phulkari"
                  value={newStoreSlug}
                  onChange={(e) => setNewStoreSlug(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFF',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setCreateStoreModalOpen(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#94A3B8',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #FF6B4A, #E5A93C)',
                    border: 'none',
                    color: '#000',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Create & Launch Store
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Command Palette (⌘K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        storeId={activeStore?.id || 'store_aura_luxury'}
        activeStoreSlug={currentSlug}
        onOpenPlatformTheme={() => {
          setCommandPaletteOpen(false);
          setThemeModalOpen(true);
        }}
      />

      {/* Platform Theme & Style Studio Modal */}
      <PlatformThemeCustomizerModal
        isOpen={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
      />
    </div>
  );
}
