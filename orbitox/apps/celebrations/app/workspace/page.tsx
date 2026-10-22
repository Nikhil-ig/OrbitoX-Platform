'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users,
  Sparkles,
  TrendingUp,
  Calendar,
  Building2,
  ArrowRight,
  ExternalLink,
  QrCode,
  DollarSign,
  CheckCircle2,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { useEcosystem } from '@/lib/ecosystem-context';

export default function WorkspaceOverviewPage() {
  const { agencyProjects } = useEcosystem();

  // Metrics
  const totalClients = agencyProjects.length;
  const totalGuests = agencyProjects.reduce((acc, p) => acc + p.totalGuests, 0);
  const totalCheckedIn = agencyProjects.reduce((acc, p) => acc + p.checkedInGuests, 0);
  const totalRetailRevenue = agencyProjects.reduce((acc, p) => acc + p.clientRetailPriceInr, 0);
  const totalWholesaleCost = agencyProjects.reduce((acc, p) => acc + p.wholesaleCostInr, 0);
  const agencyMargin = totalRetailRevenue - totalWholesaleCost;

  return (
    <WorkspaceShell>
      <div>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Atelier Command Cockpit
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
              Real-time portfolio overview, client approval statuses, and door gate operations across all accounts.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href="/workspace/clients" className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.84rem' }}>
              View All Clients
            </Link>
            <Link href="/create" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.84rem', background: '#3b82f6' }}>
              + Create Client Project
            </Link>
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          <div className="surface-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>
                Active Client Roster
              </span>
              <Users size={16} color="#60a5fa" />
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#ffffff' }}>
              {totalClients} Projects
            </div>
            <div style={{ fontSize: '0.76rem', color: '#10b981', marginTop: '6px' }}>
              4 in active planning • 2 ready for reveal
            </div>
          </div>

          <div className="surface-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>
                Total Guest Headcount
              </span>
              <Sparkles size={16} color="#f59e0b" />
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#ffffff' }}>
              {totalGuests.toLocaleString('en-IN')} Guests
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--color-text-secondary)', marginTop: '6px' }}>
              {totalCheckedIn} checked in via door QR passes
            </div>
          </div>

          <div className="surface-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>
                Gross Client Billing
              </span>
              <TrendingUp size={16} color="#10b981" />
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#ffffff' }}>
              ₹{totalRetailRevenue.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#10b981', marginTop: '6px' }}>
              Agency Gross Margin: ₹{agencyMargin.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="surface-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>
                Wholesale Savings
              </span>
              <DollarSign size={16} color="#a78bfa" />
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#ffffff' }}>
              ₹{(totalRetailRevenue * 0.4).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--color-text-secondary)', marginTop: '6px' }}>
              40% partner tier discount applied
            </div>
          </div>
        </div>

        {/* Client Projects Table Section */}
        <div className="surface-card" style={{ padding: '24px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>Current Client Engagements</h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                All active celebrations managed under your Vivah Atelier license.
              </p>
            </div>
            <Link href="/workspace/clients" className="btn-secondary btn-sm">
              Manage Roster
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)', fontSize: '0.76rem' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>CLIENT / EVENT</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>STATUS</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>EVENT DATE</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>PALACE VENUE</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>GUESTS</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>DOOR PASSCODE</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {agencyProjects.map((proj) => (
                  <tr
                    key={proj.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    }}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#ffffff' }}>{proj.eventTitle}</div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--color-text-secondary)' }}>Client: {proj.clientName}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {proj.status === 'LIVE_READY' ? (
                        <span className="badge badge-success">Live Ready</span>
                      ) : (
                        <span className="badge badge-warning">Planning Review</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--color-text-secondary)' }}>
                      {proj.eventDate}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--color-text-secondary)' }}>
                      {proj.venueName}, {proj.venueCity}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontWeight: 600, color: '#ffffff' }}>{proj.checkedInGuests}</span> / {proj.totalGuests}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <code style={{ background: 'rgba(255, 255, 255, 0.06)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.78rem', color: '#60a5fa' }}>
                        {proj.doorStaffPasscode}
                      </code>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <Link
                        href={proj.clientReviewUrl}
                        target="_blank"
                        className="btn-ghost btn-sm"
                        style={{ padding: '4px 8px', fontSize: '0.78rem', gap: '4px' }}
                      >
                        <ExternalLink size={13} />
                        <span>Preview</span>
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
