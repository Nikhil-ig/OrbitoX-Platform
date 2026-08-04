import React from 'react';
import { PluginMenuItem } from '@orbitox/sdk';

export interface DynamicSidebarProps {
  menus: PluginMenuItem[];
  activePath?: string;
  onNavigate?: (path: string) => void;
}

export const DynamicSidebar: React.FC<DynamicSidebarProps> = ({ menus, activePath, onNavigate }) => {
  return (
    <aside
      style={{
        width: '260px',
        height: '100vh',
        background: 'var(--bg-secondary, #111827)',
        borderRight: '1px solid var(--border-glass, rgba(255, 255, 255, 0.08))',
        padding: '24px 16px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '0 12px 24px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-primary, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff' }}>
          OX
        </div>
        <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.5px', color: '#fff' }}>OrbitoX OS</span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        {menus.map((menu) => (
          <div key={menu.id} style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted, #6b7280)', fontWeight: 700, padding: '6px 12px', letterSpacing: '0.5px' }}>
              {menu.label}
            </div>
            {menu.children?.map((child) => {
              const isActive = activePath === child.path;
              return (
                <a
                  key={child.id}
                  href={child.path || '#'}
                  onClick={(e) => {
                    if (child.path && onNavigate) {
                      e.preventDefault();
                      onNavigate(child.path);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm, 6px)',
                    fontSize: '14px',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#ffffff' : 'var(--text-secondary, #9ca3af)',
                    backgroundColor: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    textDecoration: 'none',
                    transition: 'var(--transition-fast, all 0.2s ease)',
                  }}
                >
                  <span>{child.label}</span>
                </a>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
};
