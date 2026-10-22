'use client';

import React from 'react';
import Link from 'next/link';
import { ServiceItem } from '../data/mock-data';
import { QuotaBar } from './quota-bar';
import { useAdmin } from '../data/admin-context';
import { DynamicIcon } from './dynamic-icon';
import { CheckIcon, BanIcon, ArrowRightIcon } from './icons';

interface ServiceCardProps {
  service: ServiceItem;
  onOpenKeyModal?: (serviceId: string) => void;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const { toggleServiceStatus } = useAdmin();

  const isBlocked = service.status === 'blocked';

  return (
    <div
      className="squircle-card squircle-card-indigo"
      style={{
        background: isBlocked ? 'rgba(239, 68, 68, 0.06)' : '#13172B',
        border: isBlocked ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(255, 255, 255, 0.07)',
        borderRadius: '24px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '20px',
        boxShadow: isBlocked ? '0 12px 30px rgba(239, 68, 68, 0.15)' : '0 18px 45px -10px rgba(0, 0, 0, 0.65)',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Top row: Icon, Name & Status Pill */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(88, 101, 242, 0.18) 0%, rgba(88, 101, 242, 0.05) 100%)',
                border: '1px solid rgba(88, 101, 242, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818CF8',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
              }}
            >
              <DynamicIcon name={service.id || service.icon} size={26} color="#818CF8" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
                {service.name}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#818CF8', fontWeight: 700 }}>
                  {service.packageName}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    background: 'rgba(255, 255, 255, 0.06)',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    color: '#A3AED0',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  v{service.version}
                </span>
              </div>
            </div>
          </div>

          {/* Status Badge Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 14px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              background:
                service.status === 'active'
                  ? 'rgba(16, 185, 129, 0.15)'
                  : service.status === 'blocked'
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(245, 158, 11, 0.15)',
              color:
                service.status === 'active'
                  ? '#10B981'
                  : service.status === 'blocked'
                  ? '#EF4444'
                  : '#F59E0B',
              border: `1px solid ${
                service.status === 'active'
                  ? 'rgba(16, 185, 129, 0.3)'
                  : service.status === 'blocked'
                  ? 'rgba(239, 68, 68, 0.3)'
                  : 'rgba(245, 158, 11, 0.3)'
              }`,
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background:
                  service.status === 'active'
                    ? '#10B981'
                    : service.status === 'blocked'
                    ? '#EF4444'
                    : '#F59E0B',
                boxShadow: `0 0 8px ${
                  service.status === 'active' ? '#10B981' : '#EF4444'
                }`,
              }}
            />
            <span>{service.status}</span>
          </div>
        </div>

        <p
          style={{
            fontSize: '13px',
            color: '#A3AED0',
            margin: '0 0 18px 0',
            lineHeight: 1.55,
            minHeight: '40px',
          }}
        >
          {service.description}
        </p>

        {/* Telemetry Metrics Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            background: '#171D36',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '14px 16px',
            borderRadius: '16px',
            marginBottom: '18px',
          }}
        >
          <div>
            <div style={{ fontSize: '10px', color: '#7B87A8', fontWeight: 700, letterSpacing: '0.4px' }}>LATENCY</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#818CF8', marginTop: '3px' }}>
              {service.latencyMs} ms
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#7B87A8', fontWeight: 700, letterSpacing: '0.4px' }}>UPTIME</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#10B981', marginTop: '3px' }}>
              {service.uptimePercent}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#7B87A8', fontWeight: 700, letterSpacing: '0.4px' }}>TENANTS</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', marginTop: '3px' }}>
              {service.activeTenants}
            </div>
          </div>
        </div>

        {/* Quota Progress Bar */}
        <div>
          <QuotaBar
            used={service.monthlyApiCalls}
            limit={service.apiCallLimit}
            unit="calls"
            label="Monthly Volume Limit"
            height={6}
          />
        </div>
      </div>

      {/* Action Controls */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          paddingTop: '6px',
        }}
      >
        <button
          type="button"
          onClick={() => toggleServiceStatus(service.id)}
          style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px 16px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            border: isBlocked ? '1px solid #10B981' : '1px solid rgba(239, 68, 68, 0.35)',
            background: isBlocked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.08)',
            color: isBlocked ? '#10B981' : '#EF4444',
            transition: 'all 0.15s ease',
          }}
        >
          {isBlocked ? (
            <>
              <CheckIcon size={14} color="#10B981" />
              <span>Activate</span>
            </>
          ) : (
            <>
              <BanIcon size={14} color="#EF4444" />
              <span>Block</span>
            </>
          )}
        </button>

        <Link
          href={`/admin/services/${service.id}`}
          className="pill-interactive pill-interactive-primary"
          style={{
            flex: 1.3,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px 16px',
            fontSize: '12px',
            textDecoration: 'none',
          }}
        >
          <span>Inspect Microservice</span>
          <ArrowRightIcon size={14} />
        </Link>
      </div>
    </div>
  );
}
