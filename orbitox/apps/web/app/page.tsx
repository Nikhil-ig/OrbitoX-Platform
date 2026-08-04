'use client';

import React from 'react';
import PlatformLayout from './(platform)/layout';
import { DynamicDashboard, Card, Badge, WidgetData } from '@orbitox/ui';

export default function HomePage() {
  const sampleWidgets: WidgetData[] = [
    { id: '1', title: 'Active Tenant Users', value: '4,850', change: '+12%', size: '1x1' },
    { id: '2', title: 'Monthly Revenue', value: '$124,500', change: '+8.4%', size: '1x1' },
    { id: '3', title: 'Active Plugins', value: '12 Installed', change: 'Healthy', size: '1x1' },
    { id: '4', title: 'System Uptime', value: '99.99%', change: 'P99: 45ms', size: '1x1' },
  ];

  return (
    <PlatformLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 6px 0' }}>Executive Operating Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>OrbitoX OS v2.0 • Multitenancy Engine Active</p>
        </div>

        <DynamicDashboard widgets={sampleWidgets} />

        <Card title="Active System Plugins" subtitle="Managed dynamically by @orbitox/plugin-engine">
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
            <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700 }}>@orbitox/crm</span>
                <Badge variant="success">Active v1.0.0</Badge>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '8px 0 0 0' }}>
                Leads, Customers, Pipeline Management
              </p>
            </div>
            <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700 }}>@orbitox/inventory</span>
                <Badge variant="info">Ready to Install</Badge>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '8px 0 0 0' }}>
                Stock Tracking, Multi-Warehouse Logistics
              </p>
            </div>
          </div>
        </Card>
      </div>
    </PlatformLayout>
  );
}
