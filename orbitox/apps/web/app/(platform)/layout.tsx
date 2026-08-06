'use client';

import React from 'react';
import { DynamicSidebar, MenuItem, ThemeProvider, useTheme, ThemeConfig, Button, DynamicCopilot } from '@orbitox/ui';

const sampleMenuItems: MenuItem[] = [
  { id: 'hms', label: 'HMS', path: '/hms' },
  { id: 'automations', label: 'Automations', path: '/automations' },
  { id: 'marketplace', label: 'App Marketplace', path: '/admin/marketplace' },
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

// Define some universal themes for various business models
const THEMES: Record<string, ThemeConfig> = {
  default: {
    id: 'orbitox-dark',
    name: 'Universal Dark (Default)',
    colors: {
      bgPrimary: '#0b0f19',
      bgSecondary: '#111827',
      bgGlass: 'rgba(17, 24, 39, 0.75)',
      borderGlass: 'rgba(255, 255, 255, 0.08)',
      textPrimary: '#f9fafb',
      textSecondary: '#9ca3af',
      accentPrimary: '#6366f1',
      accentPrimaryHover: '#4f46e5',
    },
    radii: {
      sm: '6px',
      md: '10px',
      lg: '16px',
    },
  },
  o2o2b2b: {
    id: 'o2o2b2b-logistics',
    name: 'B2B/Logistics (High Contrast)',
    colors: {
      bgPrimary: '#1a1a1a',
      bgSecondary: '#242424',
      bgGlass: 'rgba(36, 36, 36, 0.85)',
      borderGlass: 'rgba(255, 215, 0, 0.3)',
      textPrimary: '#ffffff',
      textSecondary: '#b3b3b3',
      accentPrimary: '#ffc107',
      accentPrimaryHover: '#e0a800',
    },
    radii: {
      sm: '2px',
      md: '4px',
      lg: '8px',
    },
  },
  b2c: {
    id: 'b2c-retail',
    name: 'B2C/Retail (Soft & Friendly)',
    colors: {
      bgPrimary: '#f8fafc',
      bgSecondary: '#ffffff',
      bgGlass: 'rgba(255, 255, 255, 0.85)',
      borderGlass: 'rgba(0, 0, 0, 0.05)',
      textPrimary: '#0f172a',
      textSecondary: '#64748b',
      accentPrimary: '#ec4899',
      accentPrimaryHover: '#db2777',
    },
    radii: {
      sm: '12px',
      md: '20px',
      lg: '32px',
    },
  },
};

function ThemeSwitcher() {
  const { currentTheme, setTheme } = useTheme();

  return (
    <div style={{ position: 'absolute', top: '16px', right: '40px', display: 'flex', gap: '8px', zIndex: 50 }}>
      {Object.entries(THEMES).map(([key, theme]) => (
        <Button
          key={key}
          variant={currentTheme.id === theme.id ? 'primary' : 'outline'}
          onClick={() => setTheme(theme)}
        >
          {theme.name}
        </Button>
      ))}
    </div>
  );
}

function PlatformLayoutInner({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <DynamicSidebar
        logoText="OrbitoX OS"
        tenantName="Universal Platform"
        userInitials="JD"
        items={sampleMenuItems}
      />
      <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', position: 'relative' }}>
        <ThemeSwitcher />
        <div style={{ marginTop: '48px' }}>
          {children}
        </div>
        <DynamicCopilot />
      </main>
    </div>
  );
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <PlatformLayoutInner>{children}</PlatformLayoutInner>
    </ThemeProvider>
  );
}
