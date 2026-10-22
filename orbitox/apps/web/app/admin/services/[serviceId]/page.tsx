'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useAdmin } from '../../data/admin-context';
import { QuotaBar } from '../../components/quota-bar';
import { ApiKeyModal } from '../../components/api-key-modal';
import { DynamicIcon } from '../../components/dynamic-icon';
import {
  CpuIcon,
  HardDriveIcon,
  ActivityIcon,
  KeyIcon,
  ShieldCheckIcon,
  ZapIcon,
  BuildingIcon,
  CheckIcon,
  BanIcon,
  ExternalLinkIcon,
  PlusIcon,
  ChevronRightIcon,
  SlidersIcon,
} from '../../components/icons';

interface PageProps {
  params: Promise<{ serviceId: string }>;
}

const serviceAppRouteMap: Record<string, { label: string; path: string; icon: string }> = {
  hms: { label: 'Open Hospital OS Command Center', path: '/hms', icon: 'hospital' },
  commerce: { label: 'Open Commerce Studio', path: '/commerce', icon: 'ecommerce' },
  crm: { label: 'Open CRM Leads Pipeline', path: '/crm/leads', icon: 'sales' },
  inventory: { label: 'Open Inventory Stock', path: '/inventory/items', icon: 'logistics' },
  finance: { label: 'Open Finance Invoices', path: '/finance/invoices', icon: 'finance' },
  hrms: { label: 'Open HRMS Employees', path: '/hrms/employees', icon: 'hr' },
  restaurant: { label: 'Open Kitchen Orders', path: '/commerce/orders', icon: 'restaurant' },
  school: { label: 'Open Student Admissions', path: '/crm/leads', icon: 'education' },
  pos: { label: 'Open POS Register', path: '/commerce/orders', icon: 'pos' },
};

export default function ServiceDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const serviceId = resolvedParams.serviceId;

  const { services, toggleServiceStatus, updateServiceQuota, apiKeys, providers, toggleApiKeyStatus, revokeApiKey } = useAdmin();
  const [activeTab, setActiveTab] = useState<'overview' | 'keys' | 'permissions' | 'endpoints' | 'providers' | 'architecture'>('overview');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [customQuotaInput, setCustomQuotaInput] = useState<number>(0);
  const [editingQuota, setEditingQuota] = useState(false);

  const service = services.find((s) => s.id === serviceId);

  if (!service) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Service Not Found</h2>
        <p style={{ color: '#A3AED0' }}>The requested service identifier does not exist.</p>
        <Link
          href="/admin/services"
          style={{
            display: 'inline-block',
            marginTop: '16px',
            padding: '10px 20px',
            borderRadius: '999px',
            background: '#5865F2',
            color: '#FFF',
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          Back to All Services
        </Link>
      </div>
    );
  }

  const isBlocked = service.status === 'blocked';

  // Find all API keys bound to this service or platform root
  const relevantKeys = apiKeys.filter((k) => k.serviceId === service.id || k.serviceId === 'all');

  // Find all business providers utilizing this service
  const matchingProviders: Array<{ categorySlug: string; provider: typeof providers[string][0] }> = [];
  Object.entries(providers).forEach(([catSlug, pList]) => {
    pList.forEach((prov) => {
      if (prov.enabledServices.includes(service.id)) {
        matchingProviders.push({ categorySlug: catSlug, provider: prov });
      }
    });
  });

  const handleSaveQuota = () => {
    if (customQuotaInput > 0) {
      updateServiceQuota(service.id, customQuotaInput);
      setEditingQuota(false);
    }
  };

  const directAppRoute = serviceAppRouteMap[service.id];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#A3AED0' }}>
        <Link href="/admin" style={{ color: '#A3AED0', textDecoration: 'none' }}>
          Admin
        </Link>
        <ChevronRightIcon size={12} color="#7B87A8" />
        <Link href="/admin/services" style={{ color: '#A3AED0', textDecoration: 'none' }}>
          Services
        </Link>
        <ChevronRightIcon size={12} color="#7B87A8" />
        <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{service.name}</span>
      </div>

      {/* Main Header Banner (Squircle 24px) */}
      <div
        className="squircle-card"
        style={{
          padding: '30px 34px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px',
          borderRadius: '24px',
          background: '#13172B',
          border: '1px solid rgba(255, 255, 255, 0.07)',
        }}
      >
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(88, 101, 242, 0.2) 0%, rgba(88, 101, 242, 0.05) 100%)',
              border: '1px solid rgba(88, 101, 242, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818CF8',
              boxShadow: '0 8px 24px rgba(88, 101, 242, 0.25)',
            }}
          >
            <DynamicIcon name={service.id || service.icon} size={32} color="#818CF8" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: 900, margin: 0, letterSpacing: '-0.5px', color: '#FFFFFF' }}>{service.name}</h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  background: isBlocked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: isBlocked ? '#EF4444' : '#10B981',
                  border: isBlocked ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                {service.status}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
              <span style={{ fontSize: '13px', fontFamily: 'monospace', color: '#818CF8', fontWeight: 700 }}>
                {service.packageName}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
              <span style={{ fontSize: '12px', color: '#A3AED0', fontWeight: 600 }}>v{service.version}</span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
              <span style={{ fontSize: '12px', color: '#A3AED0', fontWeight: 600 }}>Authored by {service.author}</span>
            </div>
            <p style={{ color: '#A3AED0', fontSize: '13.5px', margin: '8px 0 0 0', maxWidth: '650px', lineHeight: 1.55 }}>
              {service.description}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {directAppRoute && (
            <Link
              href={directAppRoute.path}
              className="pill-interactive pill-interactive-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                fontSize: '13px',
                textDecoration: 'none',
              }}
            >
              <DynamicIcon name={directAppRoute.icon} size={15} color="#FFFFFF" />
              <span>{directAppRoute.label}</span>
              <ExternalLinkIcon size={14} color="#CBD5E1" />
            </Link>
          )}
          <button
            type="button"
            onClick={() => toggleServiceStatus(service.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              borderRadius: '999px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              border: isBlocked ? '1px solid #10B981' : '1px solid rgba(239, 68, 68, 0.35)',
              background: isBlocked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.08)',
              color: isBlocked ? '#10B981' : '#EF4444',
            }}
          >
            {isBlocked ? (
              <>
                <CheckIcon size={14} color="#10B981" />
                <span>Activate Service</span>
              </>
            ) : (
              <>
                <BanIcon size={14} color="#EF4444" />
                <span>Block Service</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsKeyModalOpen(true)}
            className="pill-interactive pill-interactive-orange"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 20px',
              fontSize: '13px',
            }}
          >
            <PlusIcon size={14} color="#FFFFFF" />
            <span>Generate Scoped Key</span>
          </button>
        </div>
      </div>

      {/* Modern Navigation Tabs (Sleek Pills) */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          background: '#13172B',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          padding: '6px',
          borderRadius: '999px',
          width: 'fit-content',
          flexWrap: 'wrap',
          boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.4)',
        }}
      >
        {[
          { id: 'overview', label: 'Quotas & Telemetry', icon: <SlidersIcon size={14} /> },
          { id: 'architecture', label: 'Kernel Architecture', icon: <CpuIcon size={14} /> },
          { id: 'keys', label: `Scoped Keys (${relevantKeys.length})`, icon: <KeyIcon size={14} /> },
          { id: 'permissions', label: `Permissions (${service.permissions.length})`, icon: <ShieldCheckIcon size={14} /> },
          { id: 'endpoints', label: `API Endpoints (${service.endpoints.length})`, icon: <ZapIcon size={14} /> },
          { id: 'providers', label: `Active Tenants (${matchingProviders.length})`, icon: <BuildingIcon size={14} /> },
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: isSelected ? 700 : 600,
                border: 'none',
                cursor: 'pointer',
                background: isSelected ? '#5865F2' : 'transparent',
                color: isSelected ? '#FFFFFF' : '#A3AED0',
                boxShadow: isSelected ? '0 4px 14px rgba(88, 101, 242, 0.4)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview & Quotas */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          {/* Monthly Calls Quota Card */}
          <div
            className="squircle-card squircle-card-indigo"
            style={{
              padding: '24px',
              background: '#13172B',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ZapIcon size={18} color="#818CF8" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>Monthly API Calls Quota</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCustomQuotaInput(service.apiCallLimit);
                  setEditingQuota(!editingQuota);
                }}
                style={{
                  background: 'rgba(88, 101, 242, 0.15)',
                  border: '1px solid rgba(88, 101, 242, 0.3)',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  color: '#818CF8',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {editingQuota ? 'Cancel' : 'Modify Limit'}
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <QuotaBar
                used={service.monthlyApiCalls}
                limit={service.apiCallLimit}
                unit="calls"
                height={8}
              />
            </div>

            {editingQuota && (
              <div
                style={{
                  background: '#171D36',
                  padding: '14px',
                  borderRadius: '14px',
                  border: '1px solid rgba(88, 101, 242, 0.3)',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center',
                }}
              >
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#7B87A8', marginBottom: '4px', fontWeight: 700 }}>
                    NEW CALLS LIMIT (RAW COUNT)
                  </label>
                  <input
                    type="number"
                    step={1000000}
                    value={customQuotaInput}
                    onChange={(e) => setCustomQuotaInput(Number(e.target.value))}
                    style={{
                      width: '100%',
                      background: '#0A0D18',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      color: '#FFF',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveQuota}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#10B981',
                    border: 'none',
                    color: '#FFF',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    alignSelf: 'flex-end',
                  }}
                >
                  Save Quota
                </button>
              </div>
            )}
          </div>

          {/* Storage Quota Card */}
          <div
            className="squircle-card squircle-card-orange"
            style={{
              padding: '24px',
              background: '#13172B',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <HardDriveIcon size={18} color="#FF7A1A" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>Encrypted Storage Quota</h3>
            </div>
            <QuotaBar
              used={service.storageMb / 1000}
              limit={service.storageLimitMb / 1000}
              unit="GB"
              height={8}
            />
            <div style={{ marginTop: '16px', fontSize: '12.5px', color: '#A3AED0', lineHeight: 1.5 }}>
              Row-level tenant encryption with automated compression and continuous backups.
            </div>
          </div>

          {/* Telemetry Metrics Card */}
          <div
            className="squircle-card"
            style={{
              padding: '24px',
              background: '#13172B',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
              <ActivityIcon size={18} color="#10B981" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>Real-time Telemetry</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: '#171D36', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '14px', borderRadius: '16px' }}>
                <div style={{ fontSize: '10.5px', color: '#7B87A8', fontWeight: 700, letterSpacing: '0.4px' }}>AVG LATENCY</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#818CF8', marginTop: '4px' }}>
                  {service.latencyMs} ms
                </div>
              </div>
              <div style={{ background: '#171D36', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '14px', borderRadius: '16px' }}>
                <div style={{ fontSize: '10.5px', color: '#7B87A8', fontWeight: 700, letterSpacing: '0.4px' }}>UPTIME (30D)</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>
                  {service.uptimePercent}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Kernel Architecture & Dependencies */}
      {activeTab === 'architecture' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div
            className="squircle-card"
            style={{
              padding: '28px',
              background: '#13172B',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <CpuIcon size={18} color="#818CF8" />
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#FFFFFF' }}>
                Upstream Kernel Facades & Security Boundaries
              </h3>
            </div>
            <p style={{ color: '#A3AED0', fontSize: '13px', margin: '0 0 20px 0' }}>
              Microservice operates inside an isolated sandbox bounded by the OrbitoX kernel. All calls pass through deep-frozen facades.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>EVENT BUS FACADE</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#38BDF8', marginTop: '4px' }}>
                  EventsFacade.emit()
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>
                  Reactive channel: &quot;{service.id}.*&quot;
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>SECURITY SANDBOX</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#10B981', marginTop: '4px' }}>
                  SandboxGuard.freezeAll()
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>
                  Anti-tamper immutable prototype
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>MULTI-TENANT RESOLVER</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#A855F7', marginTop: '4px' }}>
                  ContextFacade.getActiveTenant()
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>
                  Zero-parameter drilling isolation
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>AUDIT INTEGRITY</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF', marginTop: '4px' }}>
                  AuditFacade.logMutation()
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>
                  Append-only cryptographic ledger
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Scoped Keys */}
      {activeTab === 'keys' && (
        <div
          style={{
            background: 'var(--ui-bg-card, rgba(20, 24, 38, 0.75))',
            border: '1px solid var(--ui-border-default, rgba(255, 255, 255, 0.08))',
            borderRadius: '16px',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
              Keys Authorized for {service.name}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Link
                href="/admin/api-keys"
                style={{
                  fontSize: '12px',
                  color: '#A3AED0',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>View All Platform Keys →</span>
              </Link>
              <button
                type="button"
                onClick={() => setIsKeyModalOpen(true)}
                className="pill-interactive pill-interactive-orange"
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                }}
              >
                + Issue Key
              </button>
            </div>
          </div>

          {relevantKeys.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94A3B8' }}>
              No active API keys found for this service.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {relevantKeys.map((k) => (
                <div
                  key={k.id}
                  style={{
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>{k.name}</div>
                    <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#38BDF8', marginTop: '4px' }}>
                      {k.maskedKey}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '11px', color: '#94A3B8', flexWrap: 'wrap' }}>
                      <span>Env: {k.environment}</span>
                      <span>•</span>
                      <span>Rate Limit: {k.rateLimitPerMin} req/min</span>
                      <span>•</span>
                      <span>Last Used: {k.lastUsedAt}</span>
                      {k.providerName && (
                        <>
                          <span>•</span>
                          <span style={{ color: '#C084FC', fontWeight: 600 }}>Tenant: {k.providerName}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => toggleApiKeyStatus(k.id)}
                      disabled={k.status === 'revoked'}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: k.status === 'revoked' ? 'not-allowed' : 'pointer',
                        border: k.status === 'active' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #10B981',
                        background: k.status === 'active' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: k.status === 'active' ? '#EF4444' : '#10B981',
                      }}
                    >
                      {k.status === 'active' ? 'Block Key' : k.status === 'blocked' ? 'Activate Key' : 'Revoked'}
                    </button>
                    {k.status !== 'revoked' && (
                      <button
                        type="button"
                        onClick={() => revokeApiKey(k.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: '#94A3B8',
                        }}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Permissions */}
      {activeTab === 'permissions' && (
        <div
          style={{
            background: 'var(--ui-bg-card, rgba(20, 24, 38, 0.75))',
            border: '1px solid var(--ui-border-default, rgba(255, 255, 255, 0.08))',
            borderRadius: '16px',
            padding: '24px',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 800 }}>
            Granular Permission Scopes
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {service.permissions.map((p) => (
              <div
                key={p.code}
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, color: '#A855F7' }}>
                    {p.code}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '3px' }}>{p.description}</div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background:
                      p.riskLevel === 'critical'
                        ? 'rgba(239, 68, 68, 0.15)'
                        : p.riskLevel === 'high'
                        ? 'rgba(245, 158, 11, 0.15)'
                        : 'rgba(56, 189, 248, 0.15)',
                    color:
                      p.riskLevel === 'critical'
                        ? '#EF4444'
                        : p.riskLevel === 'high'
                        ? '#F59E0B'
                        : '#38BDF8',
                  }}
                >
                  {p.riskLevel} risk
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Endpoints */}
      {activeTab === 'endpoints' && (
        <div
          style={{
            background: 'var(--ui-bg-card, rgba(20, 24, 38, 0.75))',
            border: '1px solid var(--ui-border-default, rgba(255, 255, 255, 0.08))',
            borderRadius: '16px',
            padding: '24px',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 800 }}>Exposed REST & WebSocket Contracts</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {service.endpoints.map((ep, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    padding: '3px 8px',
                    borderRadius: '5px',
                    background:
                      ep.method === 'GET'
                        ? 'rgba(16, 185, 129, 0.2)'
                        : ep.method === 'POST'
                        ? 'rgba(56, 189, 248, 0.2)'
                        : 'rgba(168, 85, 247, 0.2)',
                    color:
                      ep.method === 'GET' ? '#10B981' : ep.method === 'POST' ? '#38BDF8' : '#A855F7',
                  }}
                >
                  {ep.method}
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#FFF' }}>{ep.path}</span>
                <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#94A3B8' }}>{ep.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Active Providers */}
      {activeTab === 'providers' && (
        <div
          style={{
            background: '#13172B',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '24px',
            padding: '28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            <BuildingIcon size={18} color="#FF7A1A" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>
              Provisioned Tenants Utilizing {service.name}
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {matchingProviders.map(({ categorySlug, provider }) => (
              <Link
                key={provider.id}
                href={`/admin/business/${categorySlug}/${provider.id}`}
                style={{
                  textDecoration: 'none',
                  background: '#171D36',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'rgba(88, 101, 242, 0.15)',
                    border: '1px solid rgba(88, 101, 242, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#818CF8',
                  }}
                >
                  <DynamicIcon name={provider.avatar || categorySlug} size={20} color="#818CF8" />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>{provider.name}</div>
                  <div style={{ fontSize: '11px', color: '#A3AED0', marginTop: '3px' }}>
                    {provider.city}, {provider.country} • {provider.plan}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Key Modal */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        defaultServiceId={service.id}
      />
    </div>
  );
}
