'use client';

import React, { useState } from 'react';
import { tokens } from '../components/tokens';

interface ServiceTelemetry {
  name: string;
  role: string;
  p50: string;
  p95: string;
  p99: string;
  throughput: string;
  errorRate: string;
  saturation: string;
  status: string;
}

const servicesTelemetry: ServiceTelemetry[] = [
  { name: 'API Gateway', role: 'Edge Routing & Ingestion', p50: '1.2ms', p95: '3.2ms', p99: '6.4ms', throughput: '1,420 req/s', errorRate: '0.01%', saturation: '24%', status: 'Operational' },
  { name: 'PostgreSQL Primary', role: 'Relational Persistent Storage', p50: '0.8ms', p95: '1.4ms', p99: '3.8ms', throughput: '860 qps', errorRate: '0.00%', saturation: '38%', status: 'Operational' },
  { name: 'Redis Cache Mesh', role: 'In-Memory RAM Sub-ms State', p50: '0.2ms', p95: '0.6ms', p99: '1.1ms', throughput: '4,100 ops/s', errorRate: '0.00%', saturation: '18%', status: 'Operational' },
  { name: 'Background Workers', role: 'Async Queue & Event Bus', p50: '4.2ms', p95: '12.0ms', p99: '28.0ms', throughput: '320 jobs/s', errorRate: '0.02%', saturation: '42%', status: 'Operational' },
  { name: 'Plugin Sandbox Runtime', role: 'Isolated V8 Facades', p50: '0.4ms', p95: '0.9ms', p99: '1.8ms', throughput: '950 exec/s', errorRate: '0.00%', saturation: '15%', status: 'Operational' },
];

export default function PlatformObservabilityPage() {
  const [activeTab, setActiveTab] = useState<'services' | 'topology'>('services');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: tokens.typography.size.xxl, fontWeight: tokens.typography.weight.bold, color: tokens.colors.text.primary, margin: 0, letterSpacing: '-0.02em' }}>
            Observability & Telemetry
          </h1>
          <p style={{ fontSize: tokens.typography.size.base, color: tokens.colors.text.secondary, margin: '4px 0 0 0' }}>
            Live latency percentiles, subsystem throughput, and cluster saturation metrics.
          </p>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', backgroundColor: tokens.colors.bg.surfaceRaised, padding: '3px', borderRadius: tokens.radius.sm, border: `1px solid ${tokens.colors.border.default}` }}>
          <button
            onClick={() => setActiveTab('services')}
            style={{
              padding: '5px 12px',
              borderRadius: tokens.radius.xs,
              border: 'none',
              backgroundColor: activeTab === 'services' ? tokens.colors.bg.surfaceHover : 'transparent',
              color: activeTab === 'services' ? tokens.colors.text.primary : tokens.colors.text.muted,
              fontSize: tokens.typography.size.xs,
              fontWeight: tokens.typography.weight.medium,
              cursor: 'pointer',
            }}
          >
            Services Telemetry
          </button>
          <button
            onClick={() => setActiveTab('topology')}
            style={{
              padding: '5px 12px',
              borderRadius: tokens.radius.xs,
              border: 'none',
              backgroundColor: activeTab === 'topology' ? tokens.colors.bg.surfaceHover : 'transparent',
              color: activeTab === 'topology' ? tokens.colors.text.primary : tokens.colors.text.muted,
              fontSize: tokens.typography.size.xs,
              fontWeight: tokens.typography.weight.medium,
              cursor: 'pointer',
            }}
          >
            Cluster Mesh Topology
          </button>
        </div>
      </div>

      {activeTab === 'services' ? (
        <div
          style={{
            backgroundColor: tokens.colors.bg.surface,
            border: `1px solid ${tokens.colors.border.subtle}`,
            borderRadius: tokens.radius.md,
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: tokens.typography.size.base }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tokens.colors.border.subtle}`, height: '36px' }}>
                <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Subsystem
                </th>
                <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Throughput
                </th>
                <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  p50 Latency
                </th>
                <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  p95 Latency
                </th>
                <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  p99 Latency
                </th>
                <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Saturation
                </th>
                <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {servicesTelemetry.map((svc, idx) => (
                <tr
                  key={svc.name}
                  style={{
                    height: '48px',
                    borderBottom: idx < servicesTelemetry.length - 1 ? `1px solid ${tokens.colors.border.subtle}` : 'none',
                  }}
                >
                  <td style={{ padding: '0 16px' }}>
                    <div style={{ fontWeight: tokens.typography.weight.medium, color: tokens.colors.text.primary }}>
                      {svc.name}
                    </div>
                    <div style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.muted }}>
                      {svc.role}
                    </div>
                  </td>
                  <td style={{ padding: '0 16px', color: tokens.colors.text.secondary, fontFamily: tokens.typography.fontFamily.mono }}>
                    {svc.throughput}
                  </td>
                  <td style={{ padding: '0 16px', color: tokens.colors.text.secondary, fontFamily: tokens.typography.fontFamily.mono }}>
                    {svc.p50}
                  </td>
                  <td style={{ padding: '0 16px', color: tokens.colors.text.secondary, fontFamily: tokens.typography.fontFamily.mono }}>
                    {svc.p95}
                  </td>
                  <td style={{ padding: '0 16px', color: tokens.colors.text.secondary, fontFamily: tokens.typography.fontFamily.mono }}>
                    {svc.p99}
                  </td>
                  <td style={{ padding: '0 16px', color: tokens.colors.text.muted, fontFamily: tokens.typography.fontFamily.mono }}>
                    {svc.saturation}
                  </td>
                  <td style={{ padding: '0 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: tokens.colors.status.healthy }} />
                      <span style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.primary }}>{svc.status}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Topology View (Clean node list, not oversized sci-fi canvas) */
        <div
          style={{
            backgroundColor: tokens.colors.bg.surface,
            border: `1px solid ${tokens.colors.border.subtle}`,
            borderRadius: tokens.radius.md,
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ fontSize: tokens.typography.size.sm, fontWeight: tokens.typography.weight.medium, color: tokens.colors.text.primary }}>
            Cluster Node Distribution
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {[
              { id: 'node-mesh-01', region: 'us-east-1 (Primary Gateway)', role: 'Ingress & Rate Limiter', peers: 2, status: 'Active' },
              { id: 'node-mesh-02', region: 'eu-central-1 (Replica)', role: 'Read Quotas & Cache Sync', peers: 2, status: 'Active' },
              { id: 'node-mesh-03', region: 'ap-southeast-1 (Edge Worker)', role: 'Lead & Task Processor', peers: 2, status: 'Active' },
            ].map((node) => (
              <div
                key={node.id}
                style={{
                  backgroundColor: tokens.colors.bg.surfaceRaised,
                  border: `1px solid ${tokens.colors.border.default}`,
                  borderRadius: tokens.radius.sm,
                  padding: '14px 16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: tokens.typography.size.xs, fontFamily: tokens.typography.fontFamily.mono, color: tokens.colors.accent.brand }}>
                    {node.id}
                  </span>
                  <span style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.status.healthy }}>● {node.status}</span>
                </div>
                <div style={{ fontSize: tokens.typography.size.base, color: tokens.colors.text.primary, fontWeight: tokens.typography.weight.medium, marginTop: '6px' }}>
                  {node.region}
                </div>
                <div style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.muted, marginTop: '2px' }}>
                  {node.role} · {node.peers} mesh peers
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
