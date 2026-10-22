'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Building2,
  Users,
  CreditCard,
  BarChart3,
  CheckCircle2,
  TrendingUp,
  Server,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { PlatformShell } from '@/components/platform/PlatformShell';
import { useEcosystem } from '@/lib/ecosystem-context';

export default function PlatformOverviewPage() {
  const { templates, subscriptionPlans, agencyProjects } = useEcosystem();

  return (
    <PlatformShell>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff' }}>Platform Executive Cockpit</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
              Multi-tenant root governance: OrbitoX core services, zero-trust tenant boundaries, and global catalog telemetry.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-success" style={{ gap: '6px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              Zero-Trust Mesh Online
            </span>
          </div>
        </div>

        {/* Global Platform KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <div className="surface-card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '8px' }}>
              Provisioned Tenants
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>128 Partners</div>
            <div style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '6px' }}>+12 new this month</div>
          </div>

          <div className="surface-card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '8px' }}>
              Global Celebrations
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>2,480 Live</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '6px' }}>842,000+ guest invitations</div>
          </div>

          <div className="surface-card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '8px' }}>
              Active Template SKUs
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>{templates.length} Active</div>
            <div style={{ fontSize: '0.78rem', color: '#f59e0b', marginTop: '6px' }}>4 Maison-exclusive variants</div>
          </div>

          <div className="surface-card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '8px' }}>
              Platform ARR
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>₹3.84 Cr</div>
            <div style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '6px' }}>+38% YoY expansion</div>
          </div>
        </div>

        {/* Quick Jump Panels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div className="surface-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <Building2 size={20} color="#f59e0b" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>Partner & Agency Tenants</h3>
            </div>
            <p style={{ fontSize: '0.86rem', color: 'var(--color-text-secondary)', lineHeight: 1.55, marginBottom: '20px' }}>
              Inspect isolated tenant workspaces, custom domain routing, SSL issuance status, and wholesale credit limits.
            </p>
            <Link href="/platform/organizations" className="btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.84rem' }}>
              <span>Manage 128 Organizations</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="surface-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <Layers size={20} color="#60a5fa" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>Template SKU Governance</h3>
            </div>
            <p style={{ fontSize: '0.86rem', color: 'var(--color-text-secondary)', lineHeight: 1.55, marginBottom: '20px' }}>
              Govern the global template catalog: set consumer retail pricing, wholesale agency rates, and toggle visibility.
            </p>
            <Link href="/platform/templates" className="btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.84rem' }}>
              <span>Manage Template Catalog</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="surface-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <CreditCard size={20} color="#10b981" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>Subscription & Pricing Tiers</h3>
            </div>
            <p style={{ fontSize: '0.86rem', color: 'var(--color-text-secondary)', lineHeight: 1.55, marginBottom: '20px' }}>
              Configure consumer passes and agency monthly subscription plans, feature gates, and free trial allowances.
            </p>
            <Link href="/platform/plans" className="btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.84rem' }}>
              <span>Configure Subscription Plans</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </PlatformShell>
  );
}
