'use client';

import React, { useState } from 'react';
import PlatformLayout from '../../(platform)/layout';
import { DynamicTable, Card, Button, Badge } from '@orbitox/ui';
import { useAdmin } from '../../admin/data/admin-context';

interface Lead {
  id: string;
  name: string;
  company: string;
  status: 'new' | 'contacted' | 'qualified' | 'won';
  score: number;
}

const INITIAL_LEADS: Lead[] = [
  { id: '1', name: 'Alice Smith', company: 'Acme Corp', status: 'qualified', score: 92 },
  { id: '2', name: 'Bob Johnson', company: 'Starlight Tech', status: 'new', score: 78 },
  { id: '3', name: 'Carol White', company: 'Global Solutions', status: 'contacted', score: 85 },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const { isServiceActive, consumeQuota, recordTenantAction, showToast } = useAdmin();

  const handleCreateLead = () => {
    if (!isServiceActive('crm')) {
      showToast('Action Denied: CRM Leads Engine is currently BLOCKED in Platform Admin.');
      return;
    }

    const quotaCheck = consumeQuota({ serviceId: 'crm', actionName: 'LEAD_CREATED' });
    if (!quotaCheck.allowed) {
      showToast(`Action Blocked: ${quotaCheck.reason}`);
      return;
    }

    const names = ['David Miller', 'Elena Rostova', 'Kenji Sato', 'Fatima Al-Mansoor', 'Marcus Vance'];
    const companies = ['AeroDynamic Labs', 'HyperScale AI', 'Quantum Edge', 'Blue Horizon Health', 'Vanguard Robotics'];
    const randomName = names[Math.floor(Math.random() * names.length)] || 'David Miller';
    const randomCompany = companies[Math.floor(Math.random() * companies.length)] || 'AeroDynamic Labs';
    const randomScore = Math.floor(70 + Math.random() * 28);

    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      name: randomName,
      company: randomCompany,
      status: 'qualified',
      score: randomScore,
    };

    setLeads((prev) => [newLead, ...prev]);

    // Record live event in Platform Admin
    recordTenantAction({
      serviceId: 'crm',
      serviceName: 'CRM Leads Engine',
      action: 'LEAD_GENERATED',
      details: `${randomName} (${randomCompany}) • Score: ${randomScore}`,
      amount: '$45,000',
      type: 'receive',
    });

    showToast(`Lead Created for ${randomName} • Synced to Platform Admin`);
  };

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
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Plugin: @orbitox/crm v1.0.0 • Connected to Platform OS</p>
          </div>
          <Button variant="primary" onClick={handleCreateLead}>+ Create Lead</Button>
        </div>

        <Card>
          <DynamicTable columns={columns} data={leads} />
        </Card>
      </div>
    </PlatformLayout>
  );
}
