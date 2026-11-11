'use client';

import React from 'react';
import Link from 'next/link';
import { useAdmin } from '../admin/data/admin-context';
import { OrbitoxLogo } from '../admin/components/icons';

interface PlatformGovernanceDockProps {
  serviceId?: string;
  serviceName?: string;
  tenantId?: string;
  tenantName?: string;
  categorySlug?: string;
  showPill?: boolean;
}

export function PlatformGovernanceDock({
  serviceId,
  serviceName,
  tenantId,
  tenantName,
  categorySlug,
  showPill = true,
}: PlatformGovernanceDockProps) {
  const {
    services,
    toggleServiceStatus,
    isServiceActive,
    getService,
    isProviderActive,
    findProviderById,
    toggleProviderStatus,
  } = useAdmin();

  const service = serviceId ? getService(serviceId) : undefined;
  const isServiceBlocked = serviceId ? !isServiceActive(serviceId) : false;

  const tenantInfo = tenantId ? findProviderById(tenantId) : undefined;
  const resolvedCategory = categorySlug || tenantInfo?.categorySlug || 'hospitals';
  const resolvedProvider = tenantInfo?.provider;
  const isTenantBlocked = tenantId && resolvedCategory ? !isProviderActive(resolvedCategory, tenantId) : false;

  const currentServiceName = serviceName || service?.name || serviceId?.toUpperCase() || 'Platform Service';
  const currentTenantName = tenantName || resolvedProvider?.name || tenantId;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginBottom: isServiceBlocked || isTenantBlocked ? '20px' : '8px' }}>
      {/* ─── 1. CRITICAL SERVICE LOCKOUT BANNER (WHEN BLOCKED IN ADMIN) ─── */}
      {isServiceBlocked && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(185, 28, 28, 0.08) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.45)',
            borderRadius: '16px',
            padding: '16px 24px',
            boxShadow: '0 8px 32px rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            animation: 'fadeIn 0.3s ease-in-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EF4444',
                flexShrink: 0,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#F87171', letterSpacing: '0.3px' }}>
                  MICROSERVICE SUSPENDED BY PLATFORM ADMIN
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'rgba(239, 68, 68, 0.3)',
                    color: '#FFA8A8',
                  }}
                >
                  STATUS: BLOCKED
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#E2E8F0', maxWidth: '680px', lineHeight: 1.4 }}>
                The Universal Platform Administrator has set <strong>{currentServiceName}</strong> to blocked in the Platform Services Cockpit. Clinical telemetry, storefront checkouts, and entity mutations are temporarily halted.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {serviceId && (
              <button
                type="button"
                onClick={() => toggleServiceStatus(serviceId)}
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#FFFFFF',
                  padding: '9px 18px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>✓ Reactivate Service</span>
              </button>
            )}
            <Link
              href={serviceId ? `/admin/services/${serviceId}` : '/admin/services'}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                color: '#A3AED0',
                padding: '9px 16px',
                fontSize: '12.5px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Open Admin Console ↗
            </Link>
          </div>
        </div>
      )}

      {/* ─── 2. TENANT SUSPENSION BANNER (WHEN TENANT BLOCKED IN ADMIN) ─── */}
      {!isServiceBlocked && isTenantBlocked && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.08) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.45)',
            borderRadius: '16px',
            padding: '16px 24px',
            boxShadow: '0 8px 32px rgba(245, 158, 11, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F59E0B',
                flexShrink: 0,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#FBBF24', letterSpacing: '0.3px' }}>
                  TENANT ACCESS SUSPENDED BY PLATFORM GOVERNANCE
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'rgba(245, 158, 11, 0.3)',
                    color: '#FDE68A',
                  }}
                >
                  STATUS: BLOCKED
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#E2E8F0', maxWidth: '680px', lineHeight: 1.4 }}>
                Tenant <strong>{currentTenantName}</strong> has been toggled to BLOCKED in Platform Admin. Access to dedicated endpoints and custom domain routing is disabled.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {tenantId && resolvedCategory && (
              <button
                type="button"
                onClick={() => toggleProviderStatus(resolvedCategory, tenantId)}
                style={{
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#FFFFFF',
                  padding: '9px 18px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
                }}
              >
                Reactivate Tenant
              </button>
            )}
            <Link
              href={tenantId && resolvedCategory ? `/admin/business/${resolvedCategory}/${tenantId}` : '/admin/business'}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                color: '#A3AED0',
                padding: '9px 16px',
                fontSize: '12.5px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Open Tenant Cockpit ↗
            </Link>
          </div>
        </div>
      )}

      {/* ─── 3. LIVE INTERCONNECTION PILL BAR ─── */}
      {showPill && !isServiceBlocked && !isTenantBlocked && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 18px',
            borderRadius: '999px',
            background: 'rgba(19, 23, 43, 0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)',
            fontSize: '11.5px',
            color: '#A3AED0',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#10B981',
                  boxShadow: '0 0 10px #10B981',
                }}
              />
              <span style={{ fontWeight: 700, color: '#10B981' }}>OrbitoX OS Live Sync</span>
            </div>

            <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>

            <div>
              <span>Engine: </span>
              <span style={{ fontWeight: 700, color: '#FFFFFF' }}>{currentServiceName}</span>
              <span style={{ marginLeft: '4px', color: '#10B981', fontWeight: 600 }}>[ACTIVE]</span>
            </div>

            {resolvedProvider && (
              <>
                <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
                <div>
                  <span>Tenant: </span>
                  <span style={{ fontWeight: 700, color: '#FFFFFF' }}>{resolvedProvider.name}</span>
                  <span style={{ marginLeft: '6px', color: '#5865F2', fontFamily: 'monospace' }}>
                    {(resolvedProvider.monthlyApiCalls || 0).toLocaleString()} calls
                  </span>
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link
              href="/admin"
              style={{
                color: '#FF7A1A',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>Platform Admin OS</span>
              <span>↗</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
