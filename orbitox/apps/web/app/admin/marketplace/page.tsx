'use client';

import React, { useState } from 'react';
import { DynamicMarketplace, MarketplaceItemUI } from '@orbitox/ui';
import { PackageIcon, PlusIcon } from '../components/icons';

const initialItems: MarketplaceItemUI[] = [
  {
    id: 'crm',
    packageName: '@orbitox/crm',
    displayName: 'CRM — Leads & Pipeline Automation',
    description: 'Headless sales pipeline, lead scoring, deal conversion, and zero-leak customer intelligence.',
    category: 'sales',
    author: 'OrbitoX Platform Team',
    latestVersion: '1.0.1',
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
    displayName: 'HRMS — Workforce Management Suite',
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
    displayName: 'HMS — Healthcare & Patient Clinical EMR',
    description: 'Patient medical records, MRN generator, triage flow state machines, and ward matrices.',
    category: 'healthcare',
    author: 'OrbitoX Clinical Labs',
    latestVersion: '2.4.0',
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div
        className="squircle-card"
        style={{
          padding: '28px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'rgba(88, 101, 242, 0.18)',
              border: '1px solid rgba(88, 101, 242, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#5865F2',
            }}
          >
            <PackageIcon size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 900, margin: 0, letterSpacing: '-0.5px', color: '#FFFFFF' }}>
              Plugin Marketplace
            </h1>
            <p style={{ color: '#A3AED0', fontSize: '13.5px', margin: '4px 0 0 0' }}>
              Discover, install, upgrade, and cryptographically verify tenant microservice capabilities
            </p>
          </div>
        </div>

        <button
          type="button"
          className="pill-interactive pill-interactive-orange"
          style={{
            padding: '12px 22px',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <PlusIcon size={14} />
          <span>Publish Plugin</span>
        </button>
      </div>

      <div
        className="squircle-card"
        style={{
          padding: '28px',
          background: '#13172B',
          border: '1px solid rgba(255, 255, 255, 0.07)',
        }}
      >
        <DynamicMarketplace items={items} onInstall={handleInstall} />
      </div>
    </div>
  );
}
