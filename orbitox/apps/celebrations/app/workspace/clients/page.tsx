'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Search,
  ExternalLink,
  QrCode,
  ShieldCheck,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  CheckCircle,
} from 'lucide-react';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { useEcosystem } from '@/lib/ecosystem-context';

export default function WorkspaceClientsPage() {
  const { agencyProjects } = useEcosystem();
  const [search, setSearch] = useState('');

  const filtered = agencyProjects.filter(
    (p) =>
      p.clientName.toLowerCase().includes(search.toLowerCase()) ||
      p.eventTitle.toLowerCase().includes(search.toLowerCase()) ||
      p.venueName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <WorkspaceShell>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>Client Portfolio CRM</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
              Manage client review approvals, wholesale contracts, and door staff permissions.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href="/create" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.84rem', background: '#3b82f6' }}>
              <Plus size={15} />
              <span>Onboard New Client</span>
            </Link>
          </div>
        </div>

        {/* Filter bar */}
        <div
          style={{
            padding: '16px 20px',
            borderRadius: '12px',
            background: 'var(--color-surface-1)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginBottom: '20px',
          }}
        >
          <div style={{ position: 'relative', flex: 1, maxWidth: '380px' }}>
            <Search size={15} color="var(--color-text-tertiary)" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input
              type="text"
              placeholder="Search by client name, event title, or venue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              style={{ paddingLeft: '34px', height: '36px', fontSize: '0.84rem' }}
            />
          </div>
          <span style={{ fontSize: '0.82rem', color: 'var(--color-text-tertiary)' }}>
            Showing {filtered.length} active client accounts
          </span>
        </div>

        {/* Clients Table */}
        <div className="surface-card" style={{ padding: '24px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)', fontSize: '0.76rem' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>CLIENT NAME</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>EVENT TITLE</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>DATE & VENUE</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>HEADCOUNT</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>WHOLESALE / RETAIL</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>DOOR PASSCODE</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => (
                  <tr key={client.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '14px', fontWeight: 700, color: '#ffffff' }}>
                      {client.clientName}
                    </td>
                    <td style={{ padding: '14px', color: 'var(--color-text-secondary)' }}>
                      {client.eventTitle}
                    </td>
                    <td style={{ padding: '14px', color: 'var(--color-text-secondary)' }}>
                      <div>{client.eventDate}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{client.venueName}</div>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <span style={{ fontWeight: 600, color: '#ffffff' }}>{client.totalGuests} Guests</span>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <div style={{ fontWeight: 600, color: '#10b981' }}>₹{client.clientRetailPriceInr.toLocaleString('en-IN')}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--color-text-tertiary)' }}>Cost: ₹{client.wholesaleCostInr.toLocaleString('en-IN')}</div>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <code style={{ background: 'rgba(255, 255, 255, 0.06)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.78rem', color: '#60a5fa' }}>
                        {client.doorStaffPasscode}
                      </code>
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <Link
                        href={client.clientReviewUrl}
                        target="_blank"
                        className="btn-secondary btn-sm"
                        style={{ padding: '4px 10px', fontSize: '0.78rem', gap: '4px' }}
                      >
                        <ExternalLink size={12} />
                        <span>Client Link</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}
