'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldAlert,
  Building2,
  Palette,
  CreditCard,
  BarChart3,
  RotateCcw,
  Sparkles,
  Server,
  Layers,
  Globe2,
} from 'lucide-react';
import { useEcosystem } from '../../lib/ecosystem-context';

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { resetEcosystemDefaults } = useEcosystem();

  const navItems = [
    { label: 'Platform Executive Hub', href: '/platform', icon: <Layers size={16} />, active: pathname === '/platform' },
    { label: 'Organizations & Tenants', href: '/platform/organizations', icon: <Building2 size={16} />, active: pathname === '/platform/organizations' },
    { label: 'Template Governance', href: '/platform/templates', icon: <Palette size={16} />, active: pathname === '/platform/templates' },
    { label: 'Subscription Plans', href: '/platform/plans', icon: <CreditCard size={16} />, active: pathname === '/platform/plans' },
    { label: 'System Usage & Quotas', href: '/platform/usage', icon: <Server size={16} />, active: pathname === '/platform/usage' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 68px)', background: 'var(--color-bg)' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '250px',
          borderRight: '1px solid var(--color-border)',
          background: 'var(--color-surface-1)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '20px 14px',
          flexShrink: 0,
        }}
        className="desktop-only"
      >
        <div>
          {/* Header pill */}
          <div
            style={{
              padding: '12px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={16} color="#f59e0b" />
              <div style={{ lineHeight: 1.15 }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#ffffff' }}>Platform Governance</div>
                <div style={{ fontSize: '0.68rem', color: '#f59e0b', fontWeight: 600 }}>Zero-Trust Root Admin</div>
              </div>
            </div>
          </div>

          {/* Nav List */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                  fontWeight: item.active ? 700 : 500,
                  background: item.active ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                  color: item.active ? '#f59e0b' : 'var(--color-text-secondary)',
                  border: item.active ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Reset Ecosystem Defaults Button */}
        <div>
          <button
            onClick={() => {
              if (confirm('Reset ecosystem mock state to factory defaults?')) {
                resetEcosystemDefaults();
              }
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-tertiary)',
              fontSize: '0.76rem',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={13} />
            <span>Reset Demo Defaults</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
