'use client';

import React from 'react';
import { DynamicSidebar, MenuItem } from '@orbitox/ui';

const sampleMenuItems: MenuItem[] = [
  { id: 'dash', label: 'Dashboard', path: '/' },
  { id: 'marketplace', label: 'Marketplace', path: '/admin/marketplace' },
  {
    id: 'crm',
    label: 'CRM Plugin',
    children: [
      { id: 'crm-leads', label: 'Leads', path: '/crm/leads' },
      { id: 'crm-cust', label: 'Customers', path: '/crm/customers' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    children: [
      { id: 'inv-items', label: 'Stock Items', path: '/inventory/items' },
    ],
  },
  {
    id: 'hrms',
    label: 'HRMS Plugin',
    children: [
      { id: 'hrms-emp', label: 'Employees', path: '/hrms/employees' },
    ],
  },
  {
    id: 'hms',
    label: 'Healthcare (HMS)',
    children: [
      { id: 'hms-pat', label: 'Patients', path: '/hms/patients' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance & Billing',
    children: [
      { id: 'fin-inv', label: 'Invoices', path: '/finance/invoices' },
    ],
  },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <DynamicSidebar
        logoText="OrbitoX OS"
        tenantName="Acme Enterprise (Org: Main)"
        userInitials="JD"
        items={sampleMenuItems}
      />
      <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
