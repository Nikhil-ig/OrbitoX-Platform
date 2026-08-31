'use client';

import React, { useState } from 'react';

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  path?: string;
  badge?: string;
  children?: MenuItem[];
}

export interface DynamicSidebarProps {
  logoText?: string;
  tenantName?: string;
  userInitials?: string;
  items?: MenuItem[];
  activePath?: string;
  onNavigate?: (path: string) => void;
}

export const DynamicSidebar: React.FC<DynamicSidebarProps> = ({
  logoText = 'OrbitoX OS',
  tenantName = 'Universal Platform',
  userInitials = 'JD',
  items = [],
  activePath,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [activeDockApp, setActiveDockApp] = useState<string>('commerce');

  const toggleSection = (id: string) => {
    setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const dockApps = [
    { id: 'commerce', icon: '🛍️', label: 'Commerce OS', path: '/commerce' },
    { id: 'hms', icon: '🏥', label: 'Hospital OS', path: '/hms' },
    { id: 'automations', icon: '⚡', label: 'Automations (n8n)', path: '/automations' },
    { id: 'marketplace', icon: '🧩', label: 'App Market', path: '/admin/marketplace' },
    { id: 'crm', icon: '👥', label: 'CRM Leads', path: '/crm/leads' },
    { id: 'inventory', icon: '📦', label: 'Inventory', path: '/inventory/items' },
    { id: 'finance', icon: '💳', label: 'Billing & Invoices', path: '/finance/invoices' },
  ];

  return (
    <aside
      style={{
        display: 'flex',
        minHeight: '100vh',
        zIndex: 40,
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
    >
      {/* 1. Leftmost Slim Cloud Dock (~64px) */}
      <div
        className="glass-dock"
        style={{
          width: '68px',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '16px 0',
          gap: '12px',
          boxSizing: 'border-box',
        }}
      >
        {/* Brand Orb Logo */}
        <div
          title="OrbitoX OS"
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #A855F7 0%, #6366F1 50%, #3B82F6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            boxShadow: '0 0 20px rgba(168, 85, 247, 0.45)',
            marginBottom: '8px',
            cursor: 'pointer',
          }}
        >
          🌌
        </div>

        {/* Dock App Icons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {dockApps.map(app => {
            const isDockActive = activeDockApp === app.id || (activePath && activePath.startsWith(`/${app.id}`));
            return (
              <button
                key={app.id}
                type="button"
                title={app.label}
                onClick={() => {
                  setActiveDockApp(app.id);
                  if (onNavigate && app.path) onNavigate(app.path);
                }}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  border: isDockActive ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid transparent',
                  background: isDockActive
                    ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(99, 102, 241, 0.15) 100%)'
                    : 'rgba(255, 255, 255, 0.03)',
                  boxShadow: isDockActive ? '0 0 16px rgba(168, 85, 247, 0.3)' : 'none',
                  color: isDockActive ? '#FFFFFF' : '#94A3B8',
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {app.icon}
              </button>
            );
          })}
        </div>

        {/* Bottom Dock Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
          {/* Notification with Badge */}
          <div
            title="Notifications"
            style={{
              position: 'relative',
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            🔔
            <span
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '8px',
                height: '8px',
                borderRadius: '999px',
                background: '#EF4444',
                boxShadow: '0 0 8px #EF4444',
              }}
            />
          </div>

          {/* User Profile Avatar */}
          <div
            title={`Logged in as ${tenantName}`}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #FF6B4A, #E5A93C)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '13px',
              color: '#000',
              boxShadow: '0 0 12px rgba(255, 107, 74, 0.3)',
              cursor: 'pointer',
            }}
          >
            {userInitials}
          </div>
        </div>
      </div>

      {/* 2. Hierarchical Tree Navigation Sidebar (~240px) */}
      <div
        className="glass-sidebar"
        style={{
          width: '240px',
          minHeight: '100vh',
          padding: '20px 14px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Workspace Breadcrumb & Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', color: '#94A3B8' }}>«</span>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#FFF', letterSpacing: '-0.02em' }}>
              Dashboard
            </span>
          </div>
          <button
            type="button"
            title="Settings"
            style={{
              background: 'none',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '2px',
            }}
          >
            ⚙️
          </button>
        </div>

        {/* Search Bar with ⌘K Badge */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '6px 10px',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '12px', color: '#64748B' }}>🔍</span>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e: any) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFF',
              fontSize: '12px',
              width: '100%',
              outline: 'none',
            }}
          />
          <kbd
            style={{
              fontSize: '10px',
              padding: '2px 5px',
              borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#94A3B8',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            ⌘K
          </kbd>
        </div>

        {/* Tree Menu Sections */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
          {items.map((item) => {
            const isSectionCollapsed = !!collapsedSections[item.id];
            const hasChildren = item.children && item.children.length > 0;

            return (
              <div key={item.id} style={{ display: 'flex', flexDirection: 'column' }}>
                {hasChildren ? (
                  <div>
                    {/* Collapsible Section Header */}
                    <div
                      onClick={() => toggleSection(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: '#A855F7',
                        cursor: 'pointer',
                        background: 'rgba(168, 85, 247, 0.08)',
                        marginBottom: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📁</span>
                        <span>{item.label}</span>
                      </div>
                      <span style={{ fontSize: '10px', color: '#94A3B8', transform: isSectionCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.15s ease' }}>
                        ▼
                      </span>
                    </div>

                    {/* Children Items with Tree Lines */}
                    {!isSectionCollapsed && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '12px', borderLeft: '1px solid rgba(255, 255, 255, 0.08)', marginLeft: '10px' }}>
                        {item.children?.map((child) => {
                          const isActive = activePath === child.path;
                          return (
                            <a
                              key={child.id}
                              href={child.path || '#'}
                              onClick={(e) => {
                                if (onNavigate && child.path) {
                                  e.preventDefault();
                                  onNavigate(child.path);
                                }
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: isActive ? 700 : 500,
                                color: isActive ? '#FFFFFF' : '#94A3B8',
                                background: isActive
                                  ? 'linear-gradient(90deg, rgba(168, 85, 247, 0.28) 0%, rgba(99, 102, 241, 0.15) 100%)'
                                  : 'transparent',
                                border: isActive ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid transparent',
                                boxShadow: isActive ? '0 0 12px rgba(168, 85, 247, 0.2)' : 'none',
                                textDecoration: 'none',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <span>{child.label}</span>
                              {isActive && (
                                <span style={{ width: '5px', height: '5px', borderRadius: '999px', background: '#A855F7', boxShadow: '0 0 6px #A855F7' }} />
                              )}
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <a
                    href={item.path || '#'}
                    onClick={(e) => {
                      if (onNavigate && item.path) {
                        e.preventDefault();
                        onNavigate(item.path);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: activePath === item.path ? 700 : 500,
                      color: activePath === item.path ? '#FFFFFF' : '#94A3B8',
                      background: activePath === item.path
                        ? 'linear-gradient(90deg, rgba(168, 85, 247, 0.28) 0%, rgba(99, 102, 241, 0.15) 100%)'
                        : 'transparent',
                      border: activePath === item.path ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid transparent',
                      textDecoration: 'none',
                    }}
                  >
                    <span>{item.label}</span>
                  </a>
                )}
              </div>
            );
          })}
        </nav>

        {/* 3. 3D Rocket / Status Banner Widget (Reference 1) */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(24, 18, 36, 0.9) 0%, rgba(13, 10, 22, 0.95) 100%)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '14px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.6), 0 0 20px rgba(168, 85, 247, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🚀</span>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#FFF' }}>Trial Ending Soon!</div>
              <div style={{ fontSize: '10px', color: '#94A3B8' }}>Access expires in 6 days.</div>
            </div>
          </div>
          <button
            type="button"
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #A855F7 0%, #6366F1 100%)',
              color: '#FFF',
              border: 'none',
              fontWeight: 800,
              fontSize: '11px',
              cursor: 'pointer',
              boxShadow: '0 0 14px rgba(168, 85, 247, 0.4)',
            }}
          >
            ✨ Upgrade to Pro
          </button>
        </div>
      </div>
    </aside>
  );
};
