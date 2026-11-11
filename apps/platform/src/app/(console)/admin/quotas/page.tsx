'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAdmin } from '../data/admin-context';
import { QuotaBar } from '../components/quota-bar';
import { DynamicIcon } from '../components/dynamic-icon';
import {
  BarChartIcon,
  ZapIcon,
  ArrowRightIcon,
  ExternalLinkIcon,
  RocketIcon,
} from '../components/icons';

export default function QuotasMonitoringPage() {
  const { quotas, services, updateServiceQuota, providers } = useAdmin();
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [tempQuotaValue, setTempQuotaValue] = useState<number>(0);

  const handleStartEdit = (serviceId: string, currentLimit: number) => {
    setEditingServiceId(serviceId);
    setTempQuotaValue(currentLimit);
  };

  const handleSaveServiceQuota = (serviceId: string) => {
    if (tempQuotaValue > 0) {
      updateServiceQuota(serviceId, tempQuotaValue);
      setEditingServiceId(null);
    }
  };

  // Flatten all providers across all verticals to sort by consumption
  const allProviders = Object.entries(providers).flatMap(([catSlug, list]) =>
    list.map((p) => ({ ...p, catSlug }))
  );
  const topTenantsByCalls = [...allProviders].sort((a, b) => b.monthlyApiCalls - a.monthlyApiCalls);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header Banner */}
      <div
        className="squircle-card"
        style={{
          padding: '30px 34px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px',
          background: '#13172B',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: '24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(88, 101, 242, 0.2) 0%, rgba(88, 101, 242, 0.05) 100%)',
                border: '1px solid rgba(88, 101, 242, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818CF8',
                boxShadow: '0 8px 24px rgba(88, 101, 242, 0.25)',
              }}
            >
              <BarChartIcon size={26} color="#818CF8" />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 900, margin: 0, letterSpacing: '-0.5px', color: '#FFFFFF' }}>
              Platform Resource Quotas & Rate Limits
            </h1>
          </div>
          <p style={{ color: '#A3AED0', fontSize: '13.5px', margin: '8px 0 0 0', maxWidth: '750px', lineHeight: 1.6 }}>
            Global capacity monitoring, microservice volume allocations, and tenant consumption bounds.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div
            style={{
              padding: '12px 20px',
              borderRadius: '16px',
              background: '#171D36',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10B981',
              }}
            >
              <ZapIcon size={18} color="#10B981" />
            </div>
            <div>
              <div style={{ fontSize: '10.5px', color: '#7B87A8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                AGGREGATE THROUGHPUT
              </div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
                99.99% Operational
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Resource Gauges */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 18px 0', letterSpacing: '-0.3px' }}>
          Global Infrastructure Capacity
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
          }}
        >
          {quotas.map((q) => (
            <div
              key={q.id}
              className="squircle-card squircle-card-indigo"
              style={{
                padding: '24px',
                background: '#13172B',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: 'rgba(88, 101, 242, 0.15)',
                      border: '1px solid rgba(88, 101, 242, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#818CF8',
                    }}
                  >
                    <DynamicIcon name={q.icon || q.id} size={20} color="#818CF8" />
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>{q.name}</span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#10B981',
                    background: 'rgba(16, 185, 129, 0.15)',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                  }}
                >
                  Healthy
                </span>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <QuotaBar used={q.used} limit={q.limit} unit={q.unit} height={8} />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '11.5px',
                  color: '#7B87A8',
                }}
              >
                <span>{q.trend}</span>
                <span style={{ color: '#10B981', fontWeight: 700 }}>{q.percentage}% capacity</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-Service Quota Allocation & Modification Table */}
      <div
        className="squircle-card"
        style={{
          padding: '28px',
          background: '#13172B',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: '24px',
        }}
      >
        <div style={{ marginBottom: '22px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.3px' }}>
            Microservice Quotas & Thresholds
          </h2>
          <p style={{ color: '#A3AED0', fontSize: '13px', margin: '6px 0 0 0' }}>
            Modify monthly call limits directly to protect microservice runtimes from noisy neighbors.
          </p>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  background: '#171D36',
                  color: '#7B87A8',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                <th style={{ padding: '14px 16px' }}>Service Name</th>
                <th style={{ padding: '14px 16px' }}>Monthly Consumption</th>
                <th style={{ padding: '14px 16px' }}>Limit Threshold</th>
                <th style={{ padding: '14px 16px' }}>Utilization</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Modify Quota</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => {
                const isEditing = editingServiceId === s.id;
                const percentage = Math.round((s.monthlyApiCalls / s.apiCallLimit) * 100);

                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'rgba(88, 101, 242, 0.15)',
                            border: '1px solid rgba(88, 101, 242, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#818CF8',
                          }}
                        >
                          <DynamicIcon name={s.id || s.icon} size={18} color="#818CF8" />
                        </div>
                        <Link
                          href={`/admin/services/${s.id}`}
                          style={{
                            textDecoration: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          <div style={{ fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{s.name}</span>
                            <ExternalLinkIcon size={12} color="#818CF8" />
                          </div>
                          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#818CF8', marginTop: '2px' }}>
                            {s.packageName}
                          </div>
                        </Link>
                      </div>
                    </td>

                    <td style={{ padding: '16px', fontWeight: 800, color: '#FFFFFF' }}>
                      {(s.monthlyApiCalls / 1000000).toFixed(2)}M calls
                    </td>

                    <td style={{ padding: '16px' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="number"
                            step={1000000}
                            value={tempQuotaValue}
                            onChange={(e) => setTempQuotaValue(Number(e.target.value))}
                            style={{
                              width: '120px',
                              background: '#0A0D18',
                              border: '1px solid #818CF8',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              color: '#FFF',
                              fontSize: '12px',
                              outline: 'none',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveServiceQuota(s.id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              background: '#10B981',
                              border: 'none',
                              color: '#FFF',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#E2E8F0', fontWeight: 600 }}>
                          {(s.apiCallLimit / 1000000).toFixed(1)}M calls
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '16px', minWidth: '180px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <QuotaBar used={s.monthlyApiCalls} limit={s.apiCallLimit} showDetails={false} height={6} />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#A3AED0' }}>{percentage}%</span>
                      </div>
                    </td>

                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() =>
                          isEditing
                            ? setEditingServiceId(null)
                            : handleStartEdit(s.id, s.apiCallLimit)
                        }
                        style={{
                          padding: '6px 14px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: 'rgba(88, 101, 242, 0.15)',
                          border: '1px solid rgba(88, 101, 242, 0.3)',
                          color: '#818CF8',
                        }}
                      >
                        {isEditing ? 'Cancel' : 'Edit Limit'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Tenant Consumers Table */}
      <div
        style={{
          background: '#13172B',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: '24px',
          padding: '28px',
        }}
      >
        <div style={{ marginBottom: '18px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
            Highest Consuming Business Tenants
          </h2>
          <p style={{ color: '#A3AED0', fontSize: '13px', margin: '4px 0 0 0' }}>
            Tenants generating the highest platform API volume across healthcare, commerce, retail, and hospitality.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {topTenantsByCalls.slice(0, 5).map((tenant, idx) => (
            <div
              key={tenant.id}
              style={{
                background: '#171D36',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '16px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#7B87A8', width: '20px' }}>
                  #{idx + 1}
                </span>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    background: 'rgba(88, 101, 242, 0.15)',
                    border: '1px solid rgba(88, 101, 242, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#818CF8',
                  }}
                >
                  <DynamicIcon name={tenant.avatar || tenant.catSlug} size={18} color="#818CF8" />
                </div>
                <div>
                  <Link
                    href={`/admin/business/${tenant.catSlug}/${tenant.id}`}
                    style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF', textDecoration: 'none' }}
                  >
                    {tenant.name}
                  </Link>
                  <div style={{ fontSize: '11px', color: '#A3AED0', marginTop: '2px' }}>
                    {tenant.plan} • {tenant.city}, {tenant.country}
                  </div>
                </div>
              </div>

              <div style={{ minWidth: '220px' }}>
                <QuotaBar
                  used={tenant.monthlyApiCalls}
                  limit={tenant.apiCallQuota}
                  unit="calls"
                  height={6}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {tenant.catSlug === 'ecommerce' && (
                  <Link
                    href={`/store/${tenant.id}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      background: 'rgba(255, 122, 26, 0.15)',
                      border: '1px solid rgba(255, 122, 26, 0.3)',
                      color: '#FF7A1A',
                    }}
                  >
                    <RocketIcon size={11} color="#FF7A1A" />
                    <span>Store</span>
                  </Link>
                )}
                {tenant.catSlug === 'hospitals' && (
                  <Link
                    href="/hms"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#38BDF8',
                    }}
                  >
                    <RocketIcon size={11} color="#38BDF8" />
                    <span>HMS</span>
                  </Link>
                )}
                <Link
                  href={`/admin/business/${tenant.catSlug}/${tenant.id}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 14px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    background: 'rgba(88, 101, 242, 0.15)',
                    border: '1px solid rgba(88, 101, 242, 0.3)',
                    color: '#818CF8',
                  }}
                >
                  <span>Cockpit</span>
                  <ArrowRightIcon size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
