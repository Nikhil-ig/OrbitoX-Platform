'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './new/wizard.module.css';

export default function TenantsFleetPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/fleet')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.projects) {
          setTenants(data.data.projects);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>🪐 SaaS Tenant Fleet</h1>
          <p className={styles.subtitle}>
            Multi-tenant control plane for HospitalOS, RestaurantOS, and CRM instances. Provision tenants in under 60 seconds with live saga orchestration.
          </p>
        </div>
        <div>
          <Link
            id="launch-wizard-btn"
            href="/platform/tenants/new"
            className={`${styles.btn} ${styles.btnPrimary}`}
          >
            + Launch Provisioning Wizard
          </Link>
        </div>
      </header>

      <div className={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: 600 }}>Active Tenants & Cells</div>
          <span style={{ fontSize: '12px', color: 'var(--ui-text-muted)' }}>
            Total: {tenants.length}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ui-text-muted)' }}>
            Loading tenant fleet telemetry...
          </div>
        ) : tenants.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '32px' }}>🪐</span>
            <div style={{ fontSize: '15px', fontWeight: 600 }}>No tenants provisioned yet</div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--ui-text-secondary)', maxWidth: '400px' }}>
              Launch the tenant provisioning wizard to deploy a new HospitalOS or RestaurantOS tenant with cryptographic isolation in under 60 seconds.
            </p>
            <Link
              href="/platform/tenants/new"
              className={`${styles.btn} ${styles.btnPrimary}`}
              style={{ marginTop: '8px' }}
            >
              Launch Provisioning Wizard
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tenants.map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: 'var(--ui-bg-surface-raised, #161920)',
                  border: '1px solid var(--ui-border-default, rgba(255, 255, 255, 0.08))',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{t.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--ui-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    slug: {t.slug} • id: {t.id}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: t.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: t.status === 'ACTIVE' ? '#10B981' : '#F59E0B',
                      border: `1px solid ${t.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                    }}
                  >
                    {t.status || 'ACTIVE'}
                  </span>
                  <Link
                    href={`/platform/projects/${t.id}`}
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                  >
                    Inspect
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
