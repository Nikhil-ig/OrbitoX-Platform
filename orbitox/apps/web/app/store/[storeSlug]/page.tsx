'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCommerceStorefront } from '@orbitox/commerce';
import { StorefrontRenderer } from '@/components/storefront/storefront-renderer';
import { useAdmin } from '../../admin/data/admin-context';
import { PlatformGovernanceDock } from '../../components/platform-governance-dock';

export default function StorefrontHomePage() {
  const params = useParams();
  const rawSlug = params?.storeSlug;
  const storeSlug: string = (Array.isArray(rawSlug) ? rawSlug[0] : rawSlug) || 'aura-luxury';

  const { data, loading } = useCommerceStorefront(storeSlug);
  const { isServiceActive, isProviderActive, toggleServiceStatus, toggleProviderStatus } = useAdmin();

  const isCommerceActive = isServiceActive('commerce');
  const isTenantActive = isProviderActive('ecommerce', storeSlug);

  if (loading || !data) return null;

  // 1. Service Blocked Screen
  if (!isCommerceActive) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#07080D',
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            maxWidth: '560px',
            background: 'rgba(19, 23, 43, 0.85)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '24px',
            padding: '40px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(239, 68, 68, 0.15)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </div>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '1px',
              color: '#F87171',
              textTransform: 'uppercase',
              background: 'rgba(239, 68, 68, 0.15)',
              padding: '4px 12px',
              borderRadius: '999px',
            }}
          >
            Service Suspended
          </span>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '14px 0 8px 0', color: '#FFFFFF' }}>
            Storefront Offline
          </h1>
          <p style={{ color: '#A3AED0', fontSize: '14px', lineHeight: 1.5, margin: '0 0 24px 0' }}>
            The <strong>Commerce & Store Engine</strong> microservice has been disabled by the OrbitoX Platform Administrator. Storefront checkout, inventory lookups, and customer sessions are paused.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => toggleServiceStatus('commerce')}
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                border: 'none',
                color: '#FFFFFF',
                fontWeight: 700,
                padding: '10px 20px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '13px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
              }}
            >
              Reactivate Commerce Service
            </button>
            <Link
              href="/admin/services/commerce"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                fontWeight: 600,
                padding: '10px 18px',
                borderRadius: '12px',
                textDecoration: 'none',
                fontSize: '13px',
              }}
            >
              Open Service Cockpit ↗
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Tenant Blocked Screen
  if (!isTenantActive) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#07080D',
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            maxWidth: '560px',
            background: 'rgba(19, 23, 43, 0.85)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '24px',
            padding: '40px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(245, 158, 11, 0.15)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(245, 158, 11, 0.2)',
              color: '#F59E0B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '1px',
              color: '#FBBF24',
              textTransform: 'uppercase',
              background: 'rgba(245, 158, 11, 0.15)',
              padding: '4px 12px',
              borderRadius: '999px',
            }}
          >
            Merchant Suspended
          </span>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '14px 0 8px 0', color: '#FFFFFF' }}>
            Store Temporarily Unavailable
          </h1>
          <p style={{ color: '#A3AED0', fontSize: '14px', lineHeight: 1.5, margin: '0 0 24px 0' }}>
            Access to <strong>{data.store.name}</strong> has been suspended by the OrbitoX Platform Administrator.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => toggleProviderStatus('ecommerce', storeSlug)}
              style={{
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                border: 'none',
                color: '#FFFFFF',
                fontWeight: 700,
                padding: '10px 20px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '13px',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
              }}
            >
              Reactivate Merchant Tenant
            </button>
            <Link
              href={`/admin/business/ecommerce/${storeSlug}`}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                fontWeight: 600,
                padding: '10px 18px',
                borderRadius: '12px',
                textDecoration: 'none',
                fontSize: '13px',
              }}
            >
              Open Merchant Cockpit ↗
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Floating Top OrbitoX Governance Interconnection Dock */}
      <div
        style={{
          position: 'sticky',
          top: '12px',
          zIndex: 100,
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px',
        }}
      >
        <PlatformGovernanceDock
          serviceId="commerce"
          serviceName="Commerce & Store Engine"
          tenantId={storeSlug}
          tenantName={data.store.name}
          categorySlug="ecommerce"
        />
      </div>

      <StorefrontRenderer
        storeSlug={storeSlug}
        storeId={data.store.id}
        storeName={data.store.name}
        theme={data.theme}
        sections={data.sections}
      />
    </div>
  );
}

