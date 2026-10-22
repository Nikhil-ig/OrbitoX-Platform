'use client';

import React, { useEffect, useState } from 'react';
import { usePlatform } from '../components/PlatformContext';
import { tokens } from '../components/tokens';

export default function PlatformApiKeysPage() {
  const { openInspector, refreshTrigger, triggerRefresh } = usePlatform();
  const [keys, setKeys] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [envFilter, setEnvFilter] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [revealedKeySecret, setRevealedKeySecret] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    projectId: '',
    environment: 'production',
    capabilities: ['crm.leads.read', 'crm.leads.write'],
    rateLimitPerMinute: 1000,
    expiresInDays: 90,
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [kRes, pRes] = await Promise.all([
          fetch('/api/v1/platform/api-keys').then((r) => r.json()),
          fetch('/api/v1/platform/projects').then((r) => r.json()),
        ]);
        if (kRes.success) setKeys(kRes.data || []);
        if (pRes.success) {
          setProjects(pRes.data || []);
          if (pRes.data?.length > 0) {
            setFormData((prev) => ({ ...prev, projectId: pRes.data[0].id }));
          }
        }
      } catch (err) {
        console.error('Failed to load keys:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [refreshTrigger]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.projectId) return;
    setCreating(true);
    try {
      const res = await fetch('/api/v1/platform/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (result.success) {
        setRevealedKeySecret(result.data.rawSecret);
        setIsCreateModalOpen(false);
        setFormData({ ...formData, name: '' });
        triggerRefresh();
      } else {
        alert(`Creation failed: ${result.error?.message}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const filteredKeys = keys.filter((k) => {
    if (envFilter !== 'ALL' && k.environment?.toLowerCase() !== envFilter.toLowerCase()) return false;
    if (search && !k.name.toLowerCase().includes(search.toLowerCase()) && !k.keyId.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: tokens.typography.size.xxl, fontWeight: tokens.typography.weight.bold, color: tokens.colors.text.primary, margin: 0, letterSpacing: '-0.02em' }}>
            API Keys
          </h1>
          <p style={{ fontSize: tokens.typography.size.base, color: tokens.colors.text.secondary, margin: '4px 0 0 0' }}>
            Manage machine credentials and access scopes across client environments.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          style={{
            padding: '7px 14px',
            borderRadius: tokens.radius.sm,
            backgroundColor: tokens.colors.text.primary,
            color: tokens.colors.text.inverted,
            fontWeight: tokens.typography.weight.semibold,
            fontSize: tokens.typography.size.base,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          + Create API Key
        </button>
      </div>

      {/* Secret One-Time Reveal Modal */}
      {revealedKeySecret && (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: tokens.radius.md,
            backgroundColor: tokens.colors.bg.surfaceRaised,
            border: `1px solid ${tokens.colors.status.warning}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: tokens.typography.size.base, fontWeight: tokens.typography.weight.bold, color: tokens.colors.status.warning }}>
              Save Your Key Secret (Shown Once)
            </span>
            <button
              onClick={() => setRevealedKeySecret(null)}
              style={{ background: 'transparent', border: 'none', color: tokens.colors.text.muted, cursor: 'pointer' }}
            >
              ✕ Dismiss
            </button>
          </div>
          <p style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.secondary, margin: 0 }}>
            This secret will not be displayed again. OrbitoX only stores constant-time HMAC verifiers.
          </p>
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: tokens.colors.bg.input,
              border: `1px solid ${tokens.colors.border.default}`,
              borderRadius: tokens.radius.sm,
              fontFamily: tokens.typography.fontFamily.mono,
              fontSize: tokens.typography.size.base,
              color: tokens.colors.accent.brand,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{revealedKeySecret}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(revealedKeySecret);
                alert('Copied to clipboard');
              }}
              style={{
                background: tokens.colors.bg.surfaceHover,
                border: `1px solid ${tokens.colors.border.subtle}`,
                borderRadius: tokens.radius.xs,
                padding: '4px 8px',
                color: tokens.colors.text.primary,
                fontSize: tokens.typography.size.xs,
                cursor: 'pointer',
              }}
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or key ID..."
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.muted }}>Environment:</span>
          <select
            value={envFilter}
            onChange={(e) => setEnvFilter(e.target.value)}
            style={{
              padding: '6px 10px',
              backgroundColor: tokens.colors.bg.surfaceRaised,
              border: `1px solid ${tokens.colors.border.default}`,
              borderRadius: tokens.radius.sm,
              color: tokens.colors.text.primary,
              fontSize: tokens.typography.size.xs,
              outline: 'none',
            }}
          >
            <option value="ALL">All</option>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
          </select>
        </div>
      </div>

      {/* High-Density Keys Table */}
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
                Key Name
              </th>
              <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Environment
              </th>
              <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Scopes
              </th>
              <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Last Used
              </th>
              <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Risk
              </th>
              <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredKeys.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: tokens.colors.text.muted }}>
                  No matching API keys found.
                </td>
              </tr>
            ) : (
              filteredKeys.map((k, idx) => (
                <tr
                  key={k.id}
                  onClick={() => openInspector('key', k)}
                  style={{
                    height: '48px',
                    borderBottom: idx < filteredKeys.length - 1 ? `1px solid ${tokens.colors.border.subtle}` : 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.1s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tokens.colors.bg.surfaceHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '0 16px' }}>
                    <div style={{ fontWeight: tokens.typography.weight.medium, color: tokens.colors.text.primary }}>
                      {k.name}
                    </div>
                    <div style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.muted, fontFamily: tokens.typography.fontFamily.mono }}>
                      {k.keyId}
                    </div>
                  </td>
                  <td style={{ padding: '0 16px', color: tokens.colors.text.secondary, textTransform: 'capitalize' }}>
                    {k.environment}
                  </td>
                  <td style={{ padding: '0 16px', color: tokens.colors.text.secondary }}>
                    {(k.capabilities || []).length} scopes
                  </td>
                  <td style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs }}>
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                  </td>
                  <td style={{ padding: '0 16px' }}>
                    <span style={{ fontSize: tokens.typography.size.xs, color: k.riskRating === 'CRITICAL' ? tokens.colors.status.danger : k.riskRating === 'HIGH' ? tokens.colors.status.warning : tokens.colors.status.healthy }}>
                      {k.riskRating || 'LOW'}
                    </span>
                  </td>
                  <td style={{ padding: '0 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: k.status === 'REVOKED' ? tokens.colors.status.danger : tokens.colors.status.healthy,
                        }}
                      />
                      <span style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.primary }}>
                        {k.status === 'REVOKED' ? 'Revoked' : 'Active'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Key Modal */}
      {isCreateModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: tokens.colors.bg.surfaceRaised,
              border: `1px solid ${tokens.colors.border.strong}`,
              borderRadius: tokens.radius.lg,
              boxShadow: tokens.shadow.modal,
              width: '100%',
              maxWidth: '460px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: tokens.typography.size.lg, fontWeight: tokens.typography.weight.bold, color: tokens.colors.text.primary, margin: 0 }}>
                Create API Key
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: tokens.colors.text.muted, fontSize: '16px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateKey} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: tokens.typography.size.xs, color: tokens.colors.text.secondary, marginBottom: '4px' }}>
                  Key Name / Purpose
                </label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Production Ingestion Service"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: tokens.colors.bg.input,
                    border: `1px solid ${tokens.colors.border.default}`,
                    borderRadius: tokens.radius.sm,
                    color: tokens.colors.text.primary,
                    fontSize: tokens.typography.size.base,
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: tokens.typography.size.xs, color: tokens.colors.text.secondary, marginBottom: '4px' }}>
                  Project
                </label>
                <select
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: tokens.colors.bg.input,
                    border: `1px solid ${tokens.colors.border.default}`,
                    borderRadius: tokens.radius.sm,
                    color: tokens.colors.text.primary,
                    fontSize: tokens.typography.size.base,
                    outline: 'none',
                  }}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.slug})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: tokens.typography.size.xs, color: tokens.colors.text.secondary, marginBottom: '4px' }}>
                  Environment
                </label>
                <select
                  value={formData.environment}
                  onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: tokens.colors.bg.input,
                    border: `1px solid ${tokens.colors.border.default}`,
                    borderRadius: tokens.radius.sm,
                    color: tokens.colors.text.primary,
                    fontSize: tokens.typography.size.base,
                    outline: 'none',
                  }}
                >
                  <option value="production">Production</option>
                  <option value="staging">Staging</option>
                  <option value="development">Development</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: tokens.radius.sm,
                    backgroundColor: 'transparent',
                    border: `1px solid ${tokens.colors.border.default}`,
                    color: tokens.colors.text.secondary,
                    fontSize: tokens.typography.size.base,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    padding: '7px 14px',
                    borderRadius: tokens.radius.sm,
                    backgroundColor: tokens.colors.text.primary,
                    color: tokens.colors.text.inverted,
                    fontWeight: tokens.typography.weight.semibold,
                    fontSize: tokens.typography.size.base,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {creating ? 'Generating...' : 'Generate Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
