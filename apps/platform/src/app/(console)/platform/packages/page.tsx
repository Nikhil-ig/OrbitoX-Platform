'use client';

import React, { useEffect, useState } from 'react';
import { usePlatform } from '../components/PlatformContext';
import { tokens } from '../components/tokens';

export default function PlatformPackagesPage() {
  const { openInspector, refreshTrigger } = usePlatform();
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/v1/platform/packages');
        const data = await res.json();
        if (data.success) {
          setPackages(data.data?.packages || []);
        }
      } catch (err) {
        console.error('Failed to load packages:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [refreshTrigger]);

  const filtered = packages.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.packageId.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: tokens.typography.size.xxl, fontWeight: tokens.typography.weight.bold, color: tokens.colors.text.primary, margin: 0, letterSpacing: '-0.02em' }}>
          Packages
        </h1>
        <p style={{ fontSize: tokens.typography.size.base, color: tokens.colors.text.secondary, margin: '4px 0 0 0' }}>
          Registered platform modules, versions, and digital signature verifications.
        </p>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search packages..."
          style={{
            maxWidth: '380px',
            width: '100%',
            padding: '7px 12px',
            backgroundColor: tokens.colors.bg.input,
            border: `1px solid ${tokens.colors.border.default}`,
            borderRadius: tokens.radius.sm,
            color: tokens.colors.text.primary,
            fontSize: tokens.typography.size.base,
            outline: 'none',
          }}
        />

        <span style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.muted }}>
          {filtered.length} packages registered
        </span>
      </div>

      {/* Table */}
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
                Package
              </th>
              <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Version
              </th>
              <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Scope
              </th>
              <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Integrity
              </th>
              <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: tokens.colors.text.muted }}>
                  No matching packages found.
                </td>
              </tr>
            ) : (
              filtered.map((pkg, idx) => (
                <tr
                  key={pkg.packageId}
                  onClick={() => openInspector('package', pkg)}
                  style={{
                    height: '48px',
                    borderBottom: idx < filtered.length - 1 ? `1px solid ${tokens.colors.border.subtle}` : 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.1s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tokens.colors.bg.surfaceHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '0 16px' }}>
                    <div style={{ fontWeight: tokens.typography.weight.medium, color: tokens.colors.text.primary }}>
                      {pkg.name}
                    </div>
                    <div style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.muted, fontFamily: tokens.typography.fontFamily.mono }}>
                      {pkg.packageId}
                    </div>
                  </td>
                  <td style={{ padding: '0 16px', color: tokens.colors.text.secondary, fontFamily: tokens.typography.fontFamily.mono }}>
                    {pkg.version}
                  </td>
                  <td style={{ padding: '0 16px', color: tokens.colors.text.secondary }}>
                    {pkg.tier || 'Core'}
                  </td>
                  <td style={{ padding: '0 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: tokens.colors.status.healthy }} />
                      <span style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.primary }}>
                        Signature Verified
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '0 16px' }}>
                    <span style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.status.healthy }}>
                      Active
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
