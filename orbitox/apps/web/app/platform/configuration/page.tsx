'use client';

import React, { useState, useEffect } from 'react';
import { usePlatform } from '../components/PlatformContext';
import { tokens } from '../components/tokens';

export default function ConfigurationPage() {
  const { openInspector } = usePlatform();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = ['ALL', 'COMPUTE', 'IDENTITY', 'COMMERCIAL', 'NETWORKING', 'SECURITY', 'GOVERNANCE'];

  const executeSearch = (q: string) => {
    setLoading(true);
    fetch(`/api/v1/platform/configuration?q=${encodeURIComponent(q)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setResults(data.data || []);
        }
      })
      .catch((err) => console.error('Search error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    executeSearch(searchQuery);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(searchQuery);
  };

  const filteredResults = results.filter((item) => {
    if (selectedCategory === 'ALL') return true;
    if (selectedCategory === 'COMPUTE') return ['SERVICE', 'SERVER_NODE', 'SERVICE_DEPLOYMENT', 'REPLICA'].includes(item.resourceType);
    if (selectedCategory === 'IDENTITY') return ['ORGANIZATION', 'PROJECT', 'ENVIRONMENT', 'TENANT'].includes(item.resourceType);
    if (selectedCategory === 'COMMERCIAL') return ['PLAN', 'SUBSCRIPTION', 'QUOTA_POLICY', 'RATE_LIMIT_POLICY'].includes(item.resourceType);
    if (selectedCategory === 'NETWORKING') return ['DOMAIN', 'DNS_RECORD', 'TLS_CERTIFICATE', 'EDGE_ROUTE'].includes(item.resourceType);
    if (selectedCategory === 'SECURITY') return ['API_KEY', 'CREDENTIAL', 'SECURITY_FINDING'].includes(item.resourceType);
    return true;
  });

  return (
    <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div>
        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: tokens.colors.text.muted, letterSpacing: '0.08em', fontWeight: tokens.typography.weight.semibold }}>
          Platform Governance · Universal Editor
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: tokens.typography.weight.bold, color: tokens.colors.text.primary, marginTop: '4px', letterSpacing: '-0.02em' }}>
          Universal Configuration Center
        </h1>
        <p style={{ fontSize: '13px', color: tokens.colors.text.secondary, marginTop: '4px' }}>
          Search, inspect, and modify configuration parameters across all 35 platform subsystems through the unified control model.
        </p>
      </div>

      {/* Quick Overview KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ padding: '16px', borderRadius: tokens.radius.sm, backgroundColor: tokens.colors.bg.surface, border: `1px solid ${tokens.colors.border.subtle}` }}>
          <div style={{ fontSize: '11px', color: tokens.colors.text.muted }}>Searchable Parameters</div>
          <div style={{ fontSize: '22px', fontWeight: tokens.typography.weight.bold, color: tokens.colors.text.primary, marginTop: '4px' }}>
            {results.length}
          </div>
          <div style={{ fontSize: '11px', color: tokens.colors.status.healthy, marginTop: '4px' }}>
            ✓ Real-time indexed from graph
          </div>
        </div>

        <div style={{ padding: '16px', borderRadius: tokens.radius.sm, backgroundColor: tokens.colors.bg.surface, border: `1px solid ${tokens.colors.border.subtle}` }}>
          <div style={{ fontSize: '11px', color: tokens.colors.text.muted }}>Configurable Subsystems</div>
          <div style={{ fontSize: '22px', fontWeight: tokens.typography.weight.bold, color: tokens.colors.accent.primary, marginTop: '4px' }}>
            35 Types
          </div>
          <div style={{ fontSize: '11px', color: tokens.colors.text.secondary, marginTop: '4px' }}>
            Schema-driven editors
          </div>
        </div>

        <div style={{ padding: '16px', borderRadius: tokens.radius.sm, backgroundColor: tokens.colors.bg.surface, border: `1px solid ${tokens.colors.border.subtle}` }}>
          <div style={{ fontSize: '11px', color: tokens.colors.text.muted }}>Control Invariant</div>
          <div style={{ fontSize: '14px', fontWeight: tokens.typography.weight.semibold, color: tokens.colors.text.primary, marginTop: '8px' }}>
            Child Narrowing Policy
          </div>
          <div style={{ fontSize: '11px', color: tokens.colors.text.muted, marginTop: '4px' }}>
            Children cannot expand platform ceilings
          </div>
        </div>

        <div style={{ padding: '16px', borderRadius: tokens.radius.sm, backgroundColor: tokens.colors.bg.surface, border: `1px solid ${tokens.colors.border.subtle}` }}>
          <div style={{ fontSize: '11px', color: tokens.colors.text.muted }}>Protection Model</div>
          <div style={{ fontSize: '14px', fontWeight: tokens.typography.weight.semibold, color: tokens.colors.status.warning, marginTop: '8px' }}>
            Four-Eyes Quorum Guard
          </div>
          <div style={{ fontSize: '11px', color: tokens.colors.text.muted, marginTop: '4px' }}>
            Risk ≥ 80 requires peer approval
          </div>
        </div>
      </div>

      {/* Search Bar & Category Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search parameter, e.g. replicas, rateLimitRpm, mTLS, kds, quota, region..."
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: tokens.radius.sm,
              backgroundColor: tokens.colors.bg.surface,
              border: `1px solid ${tokens.colors.border.default}`,
              color: tokens.colors.text.primary,
              fontSize: '13px',
              fontFamily: tokens.typography.fontFamily.sans,
            }}
          />
          <button
            type="submit"
            style={{
              padding: '10px 20px',
              borderRadius: tokens.radius.sm,
              backgroundColor: tokens.colors.accent.primary,
              color: '#fff',
              border: 'none',
              fontSize: '13px',
              fontWeight: tokens.typography.weight.semibold,
              cursor: 'pointer',
            }}
          >
            Search
          </button>
        </form>

        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '5px 12px',
                borderRadius: tokens.radius.xs,
                backgroundColor: selectedCategory === cat ? tokens.colors.accent.primary : tokens.colors.bg.surface,
                color: selectedCategory === cat ? '#fff' : tokens.colors.text.secondary,
                border: `1px solid ${selectedCategory === cat ? tokens.colors.accent.primary : tokens.colors.border.subtle}`,
                fontSize: '11px',
                fontWeight: tokens.typography.weight.medium,
                cursor: 'pointer',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results Table */}
      <div
        style={{
          borderRadius: tokens.radius.sm,
          backgroundColor: tokens.colors.bg.surface,
          border: `1px solid ${tokens.colors.border.subtle}`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1.5fr 1.5fr 2fr 1fr 100px',
            padding: '12px 16px',
            backgroundColor: tokens.colors.bg.surfaceRaised,
            borderBottom: `1px solid ${tokens.colors.border.subtle}`,
            fontSize: '11px',
            fontWeight: tokens.typography.weight.semibold,
            color: tokens.colors.text.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          <div>Target Resource</div>
          <div>Resource Type</div>
          <div>Configuration Key</div>
          <div>Desired Value</div>
          <div>Editability</div>
          <div style={{ textAlign: 'right' }}>Action</div>
        </div>

        {loading ? (
          <div style={{ padding: '36px', textAlign: 'center', color: tokens.colors.text.muted, fontSize: '13px' }}>
            Querying platform configuration graph...
          </div>
        ) : filteredResults.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: tokens.colors.text.muted, fontSize: '13px', fontStyle: 'italic' }}>
            No configuration parameters matched the query.
          </div>
        ) : (
          filteredResults.map((item, idx) => (
            <div
              key={`${item.resourceId}-${item.key}-${idx}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.5fr 1.5fr 2fr 1fr 100px',
                padding: '12px 16px',
                borderBottom: `1px solid ${tokens.colors.border.subtle}`,
                alignItems: 'center',
                fontSize: '12px',
                backgroundColor: idx % 2 === 0 ? 'transparent' : tokens.colors.bg.surfaceSubtle,
              }}
            >
              <div>
                <div style={{ fontWeight: tokens.typography.weight.semibold, color: tokens.colors.text.primary }}>
                  {item.resourceName}
                </div>
                <div style={{ fontSize: '10px', color: tokens.colors.text.muted, fontFamily: tokens.typography.fontFamily.mono }}>
                  {item.resourceId}
                </div>
              </div>

              <div>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: tokens.radius.xs,
                    backgroundColor: tokens.colors.bg.surfaceHover,
                    color: tokens.colors.text.secondary,
                    fontFamily: tokens.typography.fontFamily.mono,
                  }}
                >
                  {item.resourceType}
                </span>
              </div>

              <div style={{ fontFamily: tokens.typography.fontFamily.mono, color: tokens.colors.accent.primary, fontWeight: tokens.typography.weight.medium }}>
                {item.key}
              </div>

              <div style={{ fontFamily: tokens.typography.fontFamily.mono, color: tokens.colors.text.primary }}>
                {typeof item.currentValue === 'boolean'
                  ? item.currentValue
                    ? 'true'
                    : 'false'
                  : typeof item.currentValue === 'object'
                  ? JSON.stringify(item.currentValue)
                  : String(item.currentValue)}
              </div>

              <div>
                {item.isEditable ? (
                  <span style={{ fontSize: '11px', color: tokens.colors.status.healthy, fontWeight: tokens.typography.weight.medium }}>
                    Configurable
                  </span>
                ) : (
                  <span style={{ fontSize: '11px', color: tokens.colors.text.muted }}>
                    🔒 Protected
                  </span>
                )}
              </div>

              <div style={{ textAlign: 'right' }}>
                <button
                  onClick={() => openInspector(item.resourceType.toLowerCase(), { resourceId: item.resourceId, name: item.resourceName })}
                  style={{
                    padding: '4px 10px',
                    borderRadius: tokens.radius.xs,
                    backgroundColor: tokens.colors.bg.surfaceRaised,
                    border: `1px solid ${tokens.colors.border.default}`,
                    color: tokens.colors.text.primary,
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: tokens.typography.weight.medium,
                  }}
                >
                  Configure →
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
