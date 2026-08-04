'use client';

import React, { useState } from 'react';
import PlatformLayout from '../../(platform)/layout';
import { DynamicMarketplace, MarketplaceItemUI, Button } from '@orbitox/ui';

const initialItems: MarketplaceItemUI[] = [
  {
    id: 'crm',
    packageName: '@orbitox/crm',
    displayName: 'CRM — Leads & Customers',
    description: 'Headless sales pipeline, lead scoring, deal conversion, and customer management.',
    category: 'sales',
    author: 'OrbitoX Platform Team',
    latestVersion: '1.0.0',
    rating: 4.9,
    installs: 1420,
    installed: true,
  },
  {
    id: 'inventory',
    packageName: '@orbitox/inventory',
    displayName: 'Inventory & Stock Logistics',
    description: 'Multi-warehouse stock levels, reorder thresholds, SKU tracking, and inventory adjustments.',
    category: 'logistics',
    author: 'OrbitoX Platform Team',
    latestVersion: '1.0.0',
    rating: 4.8,
    installs: 980,
    installed: true,
  },
  {
    id: 'hrms',
    packageName: '@orbitox/hrms',
    displayName: 'HRMS — Employee Management',
    description: 'Headless employee profiles, onboarding workflows, leave tracking, and department organization.',
    category: 'hr',
    author: 'OrbitoX Platform Team',
    latestVersion: '1.0.0',
    rating: 4.7,
    installs: 620,
    installed: true,
  },
  {
    id: 'hms',
    packageName: '@orbitox/hms',
    displayName: 'HMS — Healthcare & Patient Care',
    description: 'Patient medical records, MRN generator, triage flow state machines, and appointments.',
    category: 'healthcare',
    author: 'OrbitoX Platform Team',
    latestVersion: '1.0.0',
    rating: 4.9,
    installs: 410,
    installed: true,
  },
  {
    id: 'finance',
    packageName: '@orbitox/finance',
    displayName: 'Finance & Invoicing Engine',
    description: 'Headless ledger accounting, tax calculation engine, invoice status machine, and billing logs.',
    category: 'finance',
    author: 'OrbitoX Platform Team',
    latestVersion: '1.0.0',
    rating: 4.95,
    installs: 1150,
    installed: true,
  },
];

export default function MarketplacePage() {
  const [items, setItems] = useState<MarketplaceItemUI[]>(initialItems);

  const handleInstall = (item: MarketplaceItemUI) => {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, installed: !i.installed } : i)),
    );
  };

  return (
    <PlatformLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 4px 0' }}>Plugin Marketplace</h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Discover, install, upgrade, and manage tenant capabilities</p>
          </div>
          <Button variant="outline">+ Publish Plugin</Button>
        </div>

        <DynamicMarketplace items={items} onInstall={handleInstall} />
      </div>
    </PlatformLayout>
  );
}
