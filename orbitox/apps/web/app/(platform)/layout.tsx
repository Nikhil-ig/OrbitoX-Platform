'use client';

import React from 'react';
import { DynamicSidebar } from '@orbitox/ui';
import { PluginMenuItem } from '@orbitox/sdk';

const sampleMenus: PluginMenuItem[] = [
  {
    id: 'platform-root',
    label: 'Platform',
    children: [
      { id: 'dashboard', label: 'Dashboard', path: '/' },
    ],
  },
  {
    id: 'crm-root',
    label: 'CRM Plugin',
    children: [
      { id: 'crm-leads', label: 'Leads', path: '/crm/leads' },
      { id: 'crm-customers', label: 'Customers', path: '/crm/customers' },
    ],
  },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <DynamicSidebar menus={sampleMenus} />
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Active Tenant</span>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 700 }}>Acme Enterprise (Org: Main)</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
              JD
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
