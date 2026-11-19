'use client';

import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
  icon?: React.ReactNode;
}

export interface ModernTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  size?: 'sm' | 'md';
}

export function ModernTabs({
  tabs,
  activeTab,
  onChange,
  size = 'md',
}: ModernTabsProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.45)',
        border: '1px solid var(--ui-border-default, rgba(255, 255, 255, 0.1))',
        borderRadius: '12px',
        padding: '3px',
        gap: '2px',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              padding: size === 'sm' ? '4px 10px' : '6px 14px',
              borderRadius: '8px',
              border: isActive ? '1px solid var(--ui-border-bright, rgba(255, 255, 255, 0.2))' : '1px solid transparent',
              background: isActive
                ? 'var(--ui-bg-elevated, rgba(30, 35, 55, 0.95))'
                : 'transparent',
              color: isActive ? 'var(--ui-text-primary, #FFFFFF)' : 'var(--ui-text-secondary, #94A3B8)',
              fontSize: size === 'sm' ? '11px' : '12px',
              fontWeight: isActive ? 800 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.5)' : 'none',
              userSelect: 'none',
            }}
          >
            {tab.icon && <span style={{ display: 'flex', alignItems: 'center' }}>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                style={{
                  fontSize: '9px',
                  padding: '1px 5px',
                  borderRadius: '9999px',
                  background: isActive ? 'var(--ui-accent-primary, #A855F7)' : 'rgba(255, 255, 255, 0.08)',
                  color: '#FFF',
                  fontWeight: 800,
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
