'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import styles from '../restaurants.module.css';

interface TenantDetail {
  id: string;
  slug: string;
  name: string;
  planId: string;
  status: 'active' | 'trial' | 'suspended' | 'cancelled';
  subdomainUrl?: string;
  customDomain?: string;
  createdAt: string;
  branches?: any[];
  tableCount?: number;
  brandConfig?: any;
}

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');

  const fetchTenant = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/platform/restaurants/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load restaurant details');
      }
      setTenant(data.tenant);
      setSelectedPlan(data.tenant.planId || 'plan_starter');
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  const handleSuspendResume = async (action: 'suspend' | 'resume') => {
    if (!confirm(`Are you sure you want to ${action} this restaurant tenant?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/platform/restaurants/${encodeURIComponent(id)}/${action}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Failed to ${action} tenant.`);
      }
      fetchTenant();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePlanChange = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/platform/restaurants/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlan }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update plan.');
      }
      alert('Subscription plan updated successfully!');
      fetchTenant();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/v1/platform/restaurants/${encodeURIComponent(id)}/export`);
      if (!res.ok) throw new Error('Failed to download compliance export.');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tenant-export-${tenant?.slug || id}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--ui-text-muted)' }}>
          Loading restaurant tenant console...
        </div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className={styles.container}>
        <Link href="/platform/restaurants" className={styles.btn} style={{ alignSelf: 'start' }}>
          ← Back to Fleet
        </Link>
        <div style={{ padding: '36px', background: 'var(--ui-bg-card)', borderRadius: '12px', border: '1px solid var(--ui-border-default)' }}>
          <h2 style={{ color: 'var(--ui-danger, #EF4444)', margin: '0 0 8px' }}>Tenant Not Found</h2>
          <p style={{ color: 'var(--ui-text-secondary)', margin: 0 }}>{error || 'No restaurant found with the provided identifier.'}</p>
        </div>
      </div>
    );
  }

  const isSuspended = tenant.status === 'suspended';
  const subdomain = `${tenant.slug}.orbitox.live`;

  return (
    <div className={styles.container}>
      {/* Back and Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Link href="/platform/restaurants" className={styles.btn}>
          ← Fleet
        </Link>
        <span style={{ color: 'var(--ui-text-dim)' }}>/</span>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ui-text-secondary)' }}>
          {tenant.name}
        </span>
      </div>

      {/* Header */}
      <header className={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className={styles.title}>{tenant.name}</h1>
            <span
              className={`${styles.pill} ${
                tenant.status === 'active'
                  ? styles.pillActive
                  : tenant.status === 'trial'
                  ? styles.pillTrial
                  : styles.pillSuspended
              }`}
            >
              ● {tenant.status}
            </span>
          </div>
          <p className={styles.subtitle} style={{ fontFamily: 'monospace' }}>
            ID: {tenant.id} | Slug: {tenant.slug}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className={styles.btn} onClick={handleExport}>
            📥 Compliance Export
          </button>
          {isSuspended ? (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSuccess}`}
              disabled={actionLoading}
              onClick={() => handleSuspendResume('resume')}
            >
              Resume Tenant
            </button>
          ) : (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnDanger}`}
              disabled={actionLoading}
              onClick={() => handleSuspendResume('suspend')}
            >
              Suspend Tenant
            </button>
          )}
        </div>
      </header>

      {/* KPI Overview */}
      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Subdomain Endpoint</div>
          <div style={{ marginTop: '8px' }}>
            <a href={`http://${subdomain}`} target="_blank" rel="noreferrer" className={styles.domainLink} style={{ fontSize: '14px', fontWeight: 600 }}>
              {subdomain} ↗
            </a>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardLabel}>Custom Domain</div>
          <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--ui-text-primary)' }}>
            {tenant.customDomain ? (
              <a href={`https://${tenant.customDomain}`} target="_blank" rel="noreferrer" className={styles.domainLink}>
                {tenant.customDomain} ↗
              </a>
            ) : (
              <span style={{ color: 'var(--ui-text-muted)' }}>Not configured</span>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardLabel}>Active Plan Tier</div>
          <div className={styles.cardValue} style={{ fontSize: '20px', textTransform: 'capitalize' }}>
            {tenant.planId?.replace(/^plan_/, '')}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardLabel}>Tables Provisioned</div>
          <div className={styles.cardValue}>{tenant.tableCount || tenant.branches?.[0]?.tables?.length || 6}</div>
        </div>
      </div>

      {/* Operational Surfaces & Plan Management */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Card: Plan Tier Management */}
        <div style={{ background: 'var(--ui-bg-card)', border: '1px solid var(--ui-border-default)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: 'var(--ui-text-primary)' }}>
            Subscription & Entitlements Tier
          </h3>
          <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
            <label className={styles.label}>Selected Plan</label>
            <select
              className={styles.select}
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="plan_starter">Starter Bistro (10 tables, 500 orders/mo)</option>
              <option value="plan_growth">Culinary Growth (30 tables, 2,500 orders/mo, custom domain)</option>
              <option value="plan_enterprise">Enterprise Fleet (Unlimited volume, SLA)</option>
            </select>
          </div>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={actionLoading || selectedPlan === tenant.planId}
            onClick={handlePlanChange}
          >
            Update Subscription Tier
          </button>
        </div>

        {/* Card: Live Operational Links */}
        <div style={{ background: 'var(--ui-bg-card)', border: '1px solid var(--ui-border-default)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: 'var(--ui-text-primary)' }}>
            Direct Runtime Launchpad
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--ui-text-secondary)', marginBottom: '16px' }}>
            Launch sovereign edge surfaces directly using verified host headers:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <a
              href={`http://${subdomain}/dine`}
              target="_blank"
              rel="noreferrer"
              className={styles.btn}
              style={{ justifyContent: 'space-between' }}
            >
              <span>📱 Customer Mobile Ordering PWA</span>
              <span>↗</span>
            </a>
            <a
              href={`http://${subdomain}/kds`}
              target="_blank"
              rel="noreferrer"
              className={styles.btn}
              style={{ justifyContent: 'space-between' }}
            >
              <span>🍳 Kitchen Display System (KDS)</span>
              <span>↗</span>
            </a>
            <a
              href={`http://${subdomain}/operations/floor`}
              target="_blank"
              rel="noreferrer"
              className={styles.btn}
              style={{ justifyContent: 'space-between' }}
            >
              <span>🗺️ Spatial Floor & Table Studio</span>
              <span>↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
