'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAdmin } from './data/admin-context';
import { BUSINESS_CATEGORIES } from './data/mock-data';
import { ServiceCard } from './components/service-card';
import { ApiKeyModal } from './components/api-key-modal';
import { GlowSplineChart } from './components/glow-spline-chart';
import { NeonBarChart } from './components/neon-bar-chart';
import { DonutGauge } from './components/donut-gauge';
import { ActivityPillRow, ActivityItem } from './components/activity-pill-row';
import { DynamicIcon } from './components/dynamic-icon';
import {
  OrbitoxLogo,
  PlusIcon,
  CpuIcon,
  BuildingIcon,
  ZapIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
} from './components/icons';

export default function AdminOverviewDashboard() {
  const { services, providers, apiKeys, quotas, liveActivities } = useAdmin();
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Month');

  // Total active tenants count
  const totalTenantsCount = Object.values(providers).reduce((acc, list) => acc + list.length, 0);

  // Active services count
  const activeServicesCount = services.filter((s) => s.status === 'active').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* ─── Hero Header & Time Filter Bar (Inspired by Image 3) ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '20px',
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
                boxShadow: '0 8px 24px rgba(88, 101, 242, 0.25)',
              }}
            >
              <OrbitoxLogo size={32} color="#818CF8" />
            </div>
            <div>
              <h1
                style={{
                  fontSize: '28px',
                  fontWeight: 900,
                  margin: 0,
                  letterSpacing: '-0.8px',
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #CBD5E1 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                OrbitoX Autonomous OS
              </h1>
              <p style={{ color: '#A3AED0', fontSize: '14px', margin: '4px 0 0 0' }}>
                Unified multi-tenant orchestration, zero-trust governance, real-time telemetry & vertical providers.
              </p>
            </div>
          </div>
        </div>

        {/* Right Header Controls: Time Filter Pills & Action Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {/* Segmented Time Pill Control (Ref 3: Day | Week | Month | Year) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(18, 24, 38, 0.8)',
              padding: '4px',
              borderRadius: '999px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.06)',
            }}
          >
            {(['Day', 'Week', 'Month', 'Year'] as const).map((period) => {
              const active = timeRange === period;
              return (
                <button
                  key={period}
                  type="button"
                  onClick={() => setTimeRange(period)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '999px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: active ? 800 : 600,
                    cursor: 'pointer',
                    background: active ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'transparent',
                    color: active ? '#FFFFFF' : '#94A3B8',
                    boxShadow: active ? '0 2px 10px rgba(99, 102, 241, 0.4)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {period}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setIsKeyModalOpen(true)}
            className="pill-interactive pill-interactive-orange"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              fontSize: '12.5px',
            }}
          >
            <PlusIcon size={14} color="#FFFFFF" />
            <span>Issue API Key</span>
          </button>
        </div>
      </div>

      {/* ─── Top 4 Squircle KPI Cards (Ref 1, 3, 4) ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '18px',
        }}
      >
        {/* KPI 1 */}
        <div className="squircle-card squircle-card-indigo" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#A3AED0', letterSpacing: '0.8px' }}>
              ACTIVE ENGINES
            </span>
            <span
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818CF8',
              }}
            >
              <CpuIcon size={18} color="#818CF8" />
            </span>
          </div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: '#FFFFFF', margin: '10px 0 4px 0', letterSpacing: '-0.5px' }}>
            {activeServicesCount} / {services.length}
          </div>
          <div style={{ fontSize: '12px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
            <span>100% Operational Microservices</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="squircle-card squircle-card-orange" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#A3AED0', letterSpacing: '0.8px' }}>
              TOTAL PROVIDERS
            </span>
            <span
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'rgba(255, 122, 26, 0.15)',
                border: '1px solid rgba(255, 122, 26, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FF7A1A',
              }}
            >
              <BuildingIcon size={18} color="#FF7A1A" />
            </span>
          </div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: '#FFFFFF', margin: '10px 0 4px 0', letterSpacing: '-0.5px' }}>
            {totalTenantsCount} Tenants
          </div>
          <div style={{ fontSize: '12px', color: '#FF7A1A', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
            <span>Across 5 Business Verticals</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="squircle-card squircle-card-indigo" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#A3AED0', letterSpacing: '0.8px' }}>
              PLATFORM TRAFFIC
            </span>
            <span
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38BDF8',
              }}
            >
              <ZapIcon size={18} color="#38BDF8" />
            </span>
          </div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: '#FFFFFF', margin: '10px 0 4px 0', letterSpacing: '-0.5px' }}>
            18.45M Calls
          </div>
          <div style={{ fontSize: '12px', color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
            <span>↑ 14.2%</span>
            <span style={{ color: '#7B87A8' }}>vs previous month</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="squircle-card squircle-card-indigo" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#A3AED0', letterSpacing: '0.8px' }}>
              SECURITY & CRYPTO
            </span>
            <span
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'rgba(168, 85, 247, 0.15)',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#A855F7',
              }}
            >
              <ShieldCheckIcon size={18} color="#A855F7" />
            </span>
          </div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: '#818CF8', margin: '10px 0 4px 0', letterSpacing: '-0.5px' }}>
            Ed25519 OK
          </div>
          <div style={{ fontSize: '12px', color: '#A855F7', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
            <span>Anti-Tamper Deep Frozen</span>
          </div>
        </div>
      </div>

      {/* ─── Visual Data Analytics Grid (Directly matching Reference Images 1, 3, 4) ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: '24px',
        }}
      >
        {/* Left Column: Glowing Spline Curve + Neon Equalizer Bar Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Card 1: Glowing Spline Curve (Ref 1: Market popularity & Ref 3/4 Performance) */}
          <div className="squircle-card squircle-card-indigo" style={{ padding: '24px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#818CF8', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  Live Telemetry Waveform
                </span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: 900, color: '#FFFFFF' }}>
                  Platform API Throughput & Concurrency
                </h3>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#818CF8',
                }}
              >
                <span>Live Stream</span>
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#6366F1',
                    boxShadow: '0 0 8px #6366F1',
                  }}
                />
              </div>
            </div>

            {/* Glowing SVG Bezier Spline with Nodes & Callout Tags */}
            <GlowSplineChart
              data={[42, 65, 50, 95, 78, 120, 98, 142]}
              labels={['12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '00:00', 'Now']}
              variant="indigo"
              callouts={[
                { index: 3, label: '+3.2%' },
                { index: 5, label: '9.6%' },
              ]}
              height={160}
            />
          </div>

          {/* Card 2: Dual-Color Neon Equalizer Bar Chart (Ref 1: Statistics) */}
          <div className="squircle-card squircle-card-orange" style={{ padding: '24px' }}>
            <NeonBarChart
              title="Platform Resource Quota Equalizer"
              legendA="Compute Load (vCPU)"
              legendB="Bandwidth (GB/s)"
              height={170}
            />
          </div>
        </div>

        {/* Right Column: Concentric Donut Gauge + Live Activity Pill Stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Card 3: Donut Gauge (Ref 1: Market comparison & Ref 4) */}
          <div className="squircle-card squircle-card-indigo" style={{ padding: '24px' }}>
            <DonutGauge
              title="Vertical Market Distribution"
              totalValue="$35,903"
              subLabel="Total Platform Volume"
              segments={[
                { label: 'Hospitals', value: 75, color: '#5865F2' },
                { label: 'Commerce', value: 50, color: '#FF7A1A' },
                { label: 'Restaurants', value: 35, color: '#10B981' },
              ]}
              size={135}
            />
          </div>

          {/* Card 4: Transaction & Event History (Ref 1: Transaction history) */}
          <div className="squircle-card" style={{ padding: '24px', flex: 1 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  Real-Time Activity
                </span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: 900, color: '#FFFFFF' }}>
                  Transaction History
                </h3>
              </div>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>
                Most recent
              </span>
            </div>

            {/* List of Activity Pill Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {liveActivities.slice(0, 6).map((act) => (
                <ActivityPillRow key={act.id} item={act} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Business Service Verticals (5 Categories) ─── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#FF7A1A', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              Domain & Tenant Provisioning
            </span>
            <h2 style={{ fontSize: '20px', fontWeight: 900, margin: '2px 0 0 0', color: '#FFFFFF' }}>
              Business Service Verticals
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '13px', margin: '4px 0 0 0' }}>
              Directly govern vertical business providers with custom domains, isolated databases, and live app launching.
            </p>
          </div>
          <Link
            href="/admin/business"
            className="pill-interactive"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none',
              color: '#FFFFFF',
            }}
          >
            <span>All Verticals</span>
            <ArrowRightIcon size={14} color="#818CF8" />
          </Link>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '18px',
          }}
        >
          {BUSINESS_CATEGORIES.map((cat) => {
            const providerList = providers[cat.slug] || [];
            return (
              <Link
                key={cat.id}
                href={`/admin/business/${cat.slug}`}
                className="squircle-card"
                style={{
                  textDecoration: 'none',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '18px',
                  background: '#13172B',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '24px',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {/* Accent ambient glow corner */}
                <div
                  style={{
                    position: 'absolute',
                    top: -15,
                    right: -15,
                    width: '100px',
                    height: '100px',
                    background: cat.color,
                    opacity: 0.18,
                    filter: 'blur(35px)',
                    pointerEvents: 'none',
                  }}
                />

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '16px',
                        background: `${cat.color}15`,
                        border: `1px solid ${cat.color}30`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: cat.color,
                      }}
                    >
                      <DynamicIcon name={cat.slug || cat.id} size={24} color={cat.color} />
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '999px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: cat.color,
                        border: `1px solid ${cat.color}40`,
                      }}
                    >
                      {providerList.length} Providers
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 800, color: '#FFFFFF' }}>
                    {cat.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: '12.5px', color: '#A3AED0', lineHeight: '1.5' }}>
                    {cat.description}
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: cat.color,
                  }}
                >
                  <span>Open Vertical Roster</span>
                  <ArrowRightIcon size={14} color={cat.color} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ─── Universal Services Directory (9 Engines) ─── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#818CF8', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              Microservice Architecture
            </span>
            <h2 style={{ fontSize: '20px', fontWeight: 900, margin: '2px 0 0 0', color: '#FFFFFF' }}>
              All 9 Services & Plugins
            </h2>
            <p style={{ color: '#A3AED0', fontSize: '13px', margin: '4px 0 0 0' }}>
              Cryptographically signed microservices with live toggles, quotas, and architecture blueprints.
            </p>
          </div>
          <Link
            href="/admin/services"
            className="pill-interactive"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none',
              color: '#FFFFFF',
            }}
          >
            <span>Service Directory</span>
            <ArrowRightIcon size={14} color="#818CF8" />
          </Link>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '18px',
          }}
        >
          {services.map((svc) => (
            <ServiceCard key={svc.id} service={svc} />
          ))}
        </div>
      </div>

      {/* Global API Key Generator Modal */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
      />
    </div>
  );
}
