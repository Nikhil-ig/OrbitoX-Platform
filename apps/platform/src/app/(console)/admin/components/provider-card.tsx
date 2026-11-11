'use client';

import React from 'react';
import Link from 'next/link';
import { BusinessProvider } from '../data/mock-data';
import { QuotaBar } from './quota-bar';
import { useAdmin } from '../data/admin-context';
import { DynamicIcon } from './dynamic-icon';
import {
  MapPinIcon,
  GlobeIcon,
  KeyIcon,
  CheckIcon,
  BanIcon,
  ArrowRightIcon,
  ExternalLinkIcon,
  RocketIcon,
} from './icons';

interface ProviderCardProps {
  provider: BusinessProvider;
  categorySlug: string;
}

export function ProviderCard({ provider, categorySlug }: ProviderCardProps) {
  const { toggleProviderStatus } = useAdmin();

  const isBlocked = provider.status === 'blocked';

  return (
    <div
      className="squircle-card"
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
      <div>
        {/* Header: Avatar, Name, Location & Status Pill */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(88, 101, 242, 0.16) 0%, rgba(88, 101, 242, 0.05) 100%)',
                border: '1px solid rgba(88, 101, 242, 0.28)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818CF8',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
              }}
            >
              <DynamicIcon name={provider.avatar || categorySlug} size={26} color="#818CF8" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
                {provider.name}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#A3AED0' }}>
                  <MapPinIcon size={13} color="#7B87A8" />
                  <span>{provider.city}, {provider.country}</span>
                </span>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#818CF8',
                    background: 'rgba(88, 101, 242, 0.15)',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    border: '1px solid rgba(88, 101, 242, 0.25)',
                  }}
                >
                  {provider.plan}
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
              padding: '5px 12px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              background:
                provider.status === 'active'
                  ? 'rgba(16, 185, 129, 0.15)'
                  : provider.status === 'blocked'
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(245, 158, 11, 0.15)',
              color:
                provider.status === 'active'
                  ? '#10B981'
                  : provider.status === 'blocked'
                  ? '#EF4444'
                  : '#F59E0B',
              border: `1px solid ${
                provider.status === 'active'
                  ? 'rgba(16, 185, 129, 0.25)'
                  : provider.status === 'blocked'
                  ? 'rgba(239, 68, 68, 0.25)'
                  : 'rgba(245, 158, 11, 0.25)'
              }`,
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background:
                  provider.status === 'active'
                    ? '#10B981'
                    : provider.status === 'blocked'
                    ? '#EF4444'
                    : '#F59E0B',
                boxShadow: `0 0 8px ${provider.status === 'active' ? '#10B981' : '#EF4444'}`,
              }}
            />
            <span>{provider.status}</span>
          </div>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: '13px',
            color: '#A3AED0',
            margin: '0 0 16px 0',
            lineHeight: 1.5,
            fontStyle: 'italic',
          }}
        >
          &ldquo;{provider.tagline}&rdquo;
        </p>

        {/* Custom Domain Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#171D36',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            padding: '10px 14px',
            borderRadius: '14px',
            marginBottom: '16px',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'monospace', color: '#38BDF8', fontWeight: 600 }}>
            <GlobeIcon size={14} color="#38BDF8" />
            <span>https://{provider.customDomain}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                color: '#10B981',
                background: 'rgba(16, 185, 129, 0.15)',
                padding: '3px 8px',
                borderRadius: '999px',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
            >
              SSL OK
            </span>
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                color: '#818CF8',
                background: 'rgba(88, 101, 242, 0.15)',
                padding: '3px 8px',
                borderRadius: '999px',
                border: '1px solid rgba(88, 101, 242, 0.25)',
              }}
            >
              CNAME
            </span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px',
            marginBottom: '16px',
          }}
        >
          {provider.metrics.map((metric, idx) => (
            <div
              key={idx}
              style={{
                background: '#171D36',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '14px',
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: '10.5px', color: '#7B87A8', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                {metric.label}
              </div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', marginTop: '4px', letterSpacing: '-0.3px' }}>
                {metric.value}
              </div>
              <div style={{ fontSize: '11px', color: '#A3AED0', marginTop: '2px' }}>{metric.subtext}</div>
            </div>
          ))}
        </div>

        {/* Quota Progress */}
        <div style={{ marginBottom: '16px' }}>
          <QuotaBar
            used={provider.monthlyApiCalls}
            limit={provider.apiCallQuota}
            unit="calls"
            label="Monthly Volume Quota"
            height={6}
          />
        </div>

        {/* Active Engines Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10.5px', color: '#7B87A8', fontWeight: 700, letterSpacing: '0.5px' }}>ENGINES:</span>
          {provider.enabledServices.map((svc) => (
            <Link
              key={svc}
              href={`/admin/services/${svc}`}
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                textTransform: 'uppercase',
                background: 'rgba(255, 255, 255, 0.06)',
                color: '#CBD5E1',
                padding: '3px 8px',
                borderRadius: '999px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {svc}
            </Link>
          ))}
          <Link
            href="/admin/api-keys"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#FF7A1A',
              marginLeft: 'auto',
              textDecoration: 'none',
            }}
          >
            <KeyIcon size={12} color="#FF7A1A" />
            <span>{provider.apiKeysCount} Keys</span>
          </Link>
        </div>
      </div>

      {/* Footer Actions */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <button
          type="button"
          onClick={() => toggleProviderStatus(categorySlug, provider.id)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px 14px',
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

        {categorySlug === 'ecommerce' && (
          <Link
            href={`/store/${provider.id}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '10px 14px',
              borderRadius: '999px',
              fontSize: '11.5px',
              fontWeight: 700,
              textDecoration: 'none',
              background: 'rgba(255, 122, 26, 0.15)',
              border: '1px solid rgba(255, 122, 26, 0.3)',
              color: '#FF7A1A',
            }}
          >
            <RocketIcon size={12} color="#FF7A1A" />
            <span>Store</span>
          </Link>
        )}

        {categorySlug === 'hospitals' && (
          <Link
            href="/hms"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '10px 14px',
              borderRadius: '999px',
              fontSize: '11.5px',
              fontWeight: 700,
              textDecoration: 'none',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38BDF8',
            }}
          >
            <RocketIcon size={12} color="#38BDF8" />
            <span>HMS</span>
          </Link>
        )}

        <Link
          href={`/admin/business/${categorySlug}/${provider.id}`}
          className="pill-interactive pill-interactive-primary"
          style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px 16px',
            fontSize: '12.5px',
            textDecoration: 'none',
          }}
        >
          <span>Cockpit</span>
          <ArrowRightIcon size={14} />
        </Link>
      </div>
    </div>
  );
}
