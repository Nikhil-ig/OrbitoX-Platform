'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  Users,
  Sparkles,
  Palette,
  BarChart3,
  CreditCard,
  Settings,
  Plus,
  Search,
  QrCode,
  ArrowUpRight,
  ExternalLink,
  ShieldCheck,
  Briefcase,
  Layers,
} from 'lucide-react';
import { useEcosystem } from '../../lib/ecosystem-context';

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { agencyProjects } = useEcosystem();

  const navItems = [
    { label: 'Overview', href: '/workspace', icon: <Briefcase size={16} />, active: pathname === '/workspace' },
    { label: 'Clients', href: '/workspace/clients', icon: <Users size={16} />, active: pathname === '/workspace/clients', badge: agencyProjects.length },
    { label: 'Celebrations', href: '/workspace/celebrations', icon: <Sparkles size={16} />, active: pathname === '/workspace/celebrations' },
    { label: 'Template Catalog', href: '/workspace/templates', icon: <Palette size={16} />, active: pathname === '/workspace/templates' },
    { label: 'Analytics', href: '/workspace/analytics', icon: <BarChart3 size={16} />, active: pathname === '/workspace/analytics' },
    { label: 'Billing & Invoices', href: '/workspace/billing', icon: <CreditCard size={16} />, active: pathname === '/workspace/billing' },
    { label: 'Atelier Settings', href: '/workspace/settings', icon: <Settings size={16} />, active: pathname === '/workspace/settings' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 68px)', background: 'var(--color-bg)' }}>
      {/* Sidebar Navigation */}
      <aside
        style={{
          width: '240px',
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
          {/* Atelier Profile Card */}
          <div
            style={{
              padding: '12px',
              borderRadius: '12px',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                }}
              >
                V
              </div>
              <div style={{ lineHeight: 1.15 }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#ffffff' }}>Vivah Luxury Ateliers</div>
                <div style={{ fontSize: '0.68rem', color: '#60a5fa', fontWeight: 600 }}>Sovereign Tier Partner</div>
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
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                  fontWeight: item.active ? 700 : 500,
                  background: item.active ? 'rgba(96, 165, 250, 0.12)' : 'transparent',
                  color: item.active ? '#60a5fa' : 'var(--color-text-secondary)',
                  border: item.active ? '1px solid rgba(96, 165, 250, 0.25)' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      padding: '1px 6px',
                      borderRadius: '999px',
                      background: item.active ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)',
                      color: '#ffffff',
                      fontWeight: 700,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>

        {/* Quick Door Scanner Card */}
        <div
          style={{
            padding: '14px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <QrCode size={16} color="#10b981" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>Door Staff Scanner</span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', lineHeight: 1.4, marginBottom: '10px' }}>
            Equip venue entrance security with offline QR check-in capabilities.
          </p>
          <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
            Passcode: <code>PALACE-782</code>
          </div>
        </div>
      </aside>

      {/* Main Workspace Body */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Workspace Subheader */}
        <div
          style={{
            height: '56px',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-surface-1)',
            padding: '0 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '360px' }}>
            <Search size={15} color="var(--color-text-tertiary)" />
            <input
              type="text"
              placeholder="Quick jump to client, wedding, or venue..."
              className="input"
              style={{ height: '34px', fontSize: '0.82rem', background: 'transparent', border: 'none', padding: 0 }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="badge badge-accent desktop-only" style={{ fontSize: '0.7rem' }}>
              Wholesale Rate: 40% Off Retail
            </span>
            <Link
              href="/create"
              className="btn-primary"
              style={{
                padding: '7px 14px',
                fontSize: '0.82rem',
                gap: '6px',
                background: '#3b82f6',
              }}
            >
              <Plus size={14} />
              <span>New Client Celebration</span>
            </Link>
          </div>
        </div>

        {/* Content View */}
        <div style={{ padding: '28px' }}>{children}</div>
      </main>
    </div>
  );
}
