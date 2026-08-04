'use client';

import React from 'react';
import PlatformLayout from '../../(platform)/layout';
import { DynamicTable, Card, Button, Badge } from '@orbitox/ui';

interface Lead {
  id: string;
  name: string;
  company: string;
  status: 'new' | 'contacted' | 'qualified' | 'won';
  score: number;
}

const sampleLeads: Lead[] = [
  { id: '1', name: 'Alice Smith', company: 'Acme Corp', status: 'qualified', score: 92 },
  { id: '2', name: 'Bob Johnson', company: 'Starlight Tech', status: 'new', score: 78 },
  { id: '3', name: 'Carol White', company: 'Global Solutions', status: 'contacted', score: 85 },
];

export default function LeadsPage() {
  const columns = [
    { key: 'name', header: 'Lead Name' },
    { key: 'company', header: 'Company' },
    {
      key: 'status',
      header: 'Status',
      render: (item: Lead) => (
        <Badge variant={item.status === 'qualified' ? 'success' : item.status === 'new' ? 'info' : 'warning'}>
          {item.status.toUpperCase()}
        </Badge>
      ),
    },
    { key: 'score', header: 'Lead Score' },
  ];

  return (
    <PlatformLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 4px 0' }}>CRM Leads</h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Plugin: @orbitox/crm v1.0.0</p>
          </div>
          <Button variant="primary">+ Create Lead</Button>
        </div>

        <Card>
          <DynamicTable columns={columns} data={sampleLeads} />
        </Card>
      </div>
    </PlatformLayout>
  );
}
