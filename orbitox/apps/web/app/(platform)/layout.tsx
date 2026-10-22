'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { DynamicSidebar, MenuItem, ThemeProvider, useTheme, Button, DynamicCopilot } from '@orbitox/ui';
import { PlatformGovernanceDock } from '../components/platform-governance-dock';

const sampleMenuItems: MenuItem[] = [
  {
    id: 'commerce-root',
    label: 'Commerce Studio',
    children: [
      { id: 'commerce-overview', label: '📊 Dashboard', path: '/commerce' },
      { id: 'commerce-builder', label: '🎨 Store Builder (Wix/Shopify)', path: '/commerce/store/builder' },
      { id: 'commerce-theme', label: '✨ Theme Studio', path: '/commerce/store/theme' },
      { id: 'commerce-products', label: '🛍️ Products & Variants', path: '/commerce/products' },
      { id: 'commerce-orders', label: '📦 Orders & Fulfillment', path: '/commerce/orders' },
      { id: 'commerce-storefront', label: '🌐 Live Storefront (Aura)', path: '/store/aura-luxury' },
    ],
  },
  {
    id: 'hms-root',
    label: 'Hospital OS (HMS)',
    children: [
      { id: 'hms-dashboard', label: 'Command Center', path: '/hms' },
      { id: 'hms-hierarchy', label: 'Hierarchy & Tree', path: '/hms/hierarchy' },
      { id: 'hms-beds', label: 'Bed & Ward Matrix', path: '/hms/beds' },
      { id: 'hms-patients', label: 'Inpatient Registry', path: '/hms/patients' },
      { id: 'hms-telemetry', label: 'IoT Vitals Monitor', path: '/hms/telemetry' },
      { id: 'hms-pharmacy', label: 'Pharmacy Queue', path: '/hms/pharmacy' },
    ],
  },
  {
    id: 'admin-root',
    label: '🪐 Admin Console (God-Mode)',
    children: [
      { id: 'admin-overview', label: '📊 Control Dashboard', path: '/admin' },
      { id: 'admin-services', label: '🔌 All 9 Services', path: '/admin/services' },
      { id: 'admin-business', label: '🌐 Business Verticals', path: '/admin/business' },
      { id: 'admin-hospitals', label: '🏥 Hospital Network', path: '/admin/business/hospitals' },
      { id: 'admin-ecommerce', label: '🛍️ E-Commerce Stores', path: '/admin/business/ecommerce' },
      { id: 'admin-keys', label: '🔑 API Key Generator', path: '/admin/api-keys' },
      { id: 'admin-quotas', label: '📈 Platform Quotas', path: '/admin/quotas' },
      { id: 'admin-system', label: '🛡️ System & Crypto', path: '/admin/system' },
    ],
  },
  { id: 'automations', label: 'Automations (n8n)', path: '/automations' },
  { id: 'marketplace', label: 'App Marketplace', path: '/admin/marketplace' },
];


function TopUtilityBar() {
  const { currentTheme, allThemes, setThemeById } = useTheme();

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        borderRadius: '14px',
        background: 'var(--ui-bg-card, rgba(13, 15, 24, 0.75))',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--ui-border-default, rgba(255, 255, 255, 0.08))',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px',
      }}
    >
      {/* Left: Storage Quota Pill (Reference 1) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            padding: '6px 14px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#38BDF8',
          }}
        >
          <span>☁️</span>
          <span>Basic Storage</span>
          <span style={{ color: '#FFF' }}>50GB / 100GB</span>
          <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: '50%', height: '100%', background: '#38BDF8' }} />
          </div>
        </div>

        {/* Realtime Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94A3B8' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '999px', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
          <span>Realtime Sync Active</span>
        </div>
      </div>

      {/* Right: Theme Switcher & Collaborators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Collaborators Avatar Stack */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {['JD', 'NK', 'SK'].map((init, i) => (
            <div
              key={init}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: i === 0 ? '#A855F7' : i === 1 ? '#FF6B4A' : '#3B82F6',
                border: '2px solid #0D0F18',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 800,
                color: '#FFF',
                marginLeft: i > 0 ? '-8px' : '0',
                zIndex: 3 - i,
              }}
            >
              {init}
            </div>
          ))}
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '2px solid #0D0F18',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 700,
              color: '#94A3B8',
              marginLeft: '-8px',
            }}
          >
            +12
          </div>
        </div>

        {/* Theme Pills */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.4)', padding: '3px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
          {allThemes.map((theme) => {
            const isActive = currentTheme.id === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => setThemeById(theme.id)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '7px',
                  fontSize: '11px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: isActive ? 'var(--ui-accent-gradient, linear-gradient(135deg, #A855F7, #6366F1))' : 'transparent',
                  color: isActive ? '#FFF' : '#94A3B8',
                  boxShadow: isActive ? `0 0 10px ${theme.colors.accentGlow}` : 'none',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>{theme.icon}</span>
                <span>{theme.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PlatformLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  let activeServiceId: string | undefined;
  if (pathname?.includes('/crm')) activeServiceId = 'crm';
  else if (pathname?.includes('/inventory')) activeServiceId = 'inventory';
  else if (pathname?.includes('/finance')) activeServiceId = 'finance';
  else if (pathname?.includes('/hrms')) activeServiceId = 'hrms';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <DynamicSidebar
        logoText="OrbitoX OS"
        tenantName="Universal Platform"
        userInitials="JD"
        items={sampleMenuItems}
      />
      <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <TopUtilityBar />
        {activeServiceId && (
          <PlatformGovernanceDock serviceId={activeServiceId} />
        )}
        <div style={{ flex: 1 }}>
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
