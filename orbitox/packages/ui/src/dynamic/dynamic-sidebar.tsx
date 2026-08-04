import React from 'react';

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  path?: string;
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
  tenantName = 'Default Tenant',
  userInitials = 'OX',
  items = [],
  activePath,
  onNavigate,
}) => {
  return (
    <aside
      style={{
        width: '260px',
        minHeight: '100vh',
        background: 'var(--bg-secondary, #0b0f19)',
        borderRight: '1px solid var(--border-glass, rgba(255, 255, 255, 0.08))',
        padding: '24px 16px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '16px',
            color: '#fff',
          }}
        >
          OX
        </div>
        <span style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '-0.5px' }}>{logoText}</span>
      </div>

      {/* Navigation List */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {items.map((item) => (
          <div key={item.id}>
            {item.children ? (
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--text-muted, #6b7280)',
                    padding: '12px 12px 6px 12px',
                    letterSpacing: '0.5px',
                  }}
                >
                  {item.label}
                </div>
                {item.children.map((child) => (
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
                      display: 'block',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      color: activePath === child.path ? '#fff' : 'var(--text-secondary, #9ca3af)',
                      background: activePath === child.path ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      textDecoration: 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {child.label}
                  </a>
                ))}
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
                  display: 'block',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: activePath === item.path ? '#fff' : 'var(--text-secondary, #9ca3af)',
                  background: activePath === item.path ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  textDecoration: 'none',
                }}
              >
                {item.label}
              </a>
            )}
          </div>
        ))}
      </nav>

      {/* User / Tenant Footer */}
      <div
        style={{
          borderTop: '1px solid var(--border-glass, rgba(255, 255, 255, 0.08))',
          paddingTop: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--bg-glass, rgba(255, 255, 255, 0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          {userInitials}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '13px', fontWeight: 600 }}>{tenantName}</span>
        </div>
      </div>
    </aside>
  );
};
