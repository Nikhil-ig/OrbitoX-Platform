'use client';

import React, { useEffect, useState } from 'react';
import { usePlatform } from '../components/PlatformContext';
import { tokens } from '../components/tokens';

export default function PlatformCredentialsPage() {
  const { openInspector, refreshTrigger, triggerRefresh } = usePlatform();
  const [credentials, setCredentials] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { status: string; message: string }>>({});

  const [formData, setFormData] = useState({
    name: '',
    provider: 'stripe',
    projectId: '',
    environmentId: '',
    plaintextSecret: '',
    ownerEmail: '',
    rotationIntervalDays: 90,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [cRes, pRes] = await Promise.all([
          fetch('/api/v1/platform/credentials').then((r) => r.json()),
          fetch('/api/v1/platform/projects').then((r) => r.json()),
        ]);
        if (cRes.success) setCredentials(cRes.data || []);
        if (pRes.success) {
          setProjects(pRes.data || []);
          if (pRes.data?.length > 0) {
            setFormData((prev) => ({
              ...prev,
              projectId: pRes.data[0].id,
              environmentId: pRes.data[0].environments?.[0]?.id || '',
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load credentials:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [refreshTrigger]);

  const handleTestPing = async (id: string) => {
    setTestResults((prev) => ({ ...prev, [id]: { status: 'TESTING', message: 'Testing connection...' } }));
    try {
      const res = await fetch(`/api/v1/platform/credentials/${id}/test`, { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        setTestResults((prev) => ({ ...prev, [id]: { status: 'HEALTHY', message: `${result.data.latencyMs}ms TLS ping OK` } }));
      } else {
        setTestResults((prev) => ({ ...prev, [id]: { status: 'FAILED', message: result.error?.message || 'Failed' } }));
      }
    } catch (err: any) {
      setTestResults((prev) => ({ ...prev, [id]: { status: 'FAILED', message: err.message } }));
    }
  };

  const handleStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.plaintextSecret || !formData.projectId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/v1/platform/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (result.success) {
        setIsStoreModalOpen(false);
        setFormData({ ...formData, name: '', plaintextSecret: '' });
        triggerRefresh();
      } else {
        alert(`Failed: ${result.error?.message}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: tokens.typography.size.xxl, fontWeight: tokens.typography.weight.bold, color: tokens.colors.text.primary, margin: 0, letterSpacing: '-0.02em' }}>
            Credentials
          </h1>
          <p style={{ fontSize: tokens.typography.size.base, color: tokens.colors.text.secondary, margin: '4px 0 0 0' }}>
            Secure external integration credentials protected by AES-256-GCM envelope encryption.
          </p>
        </div>
        <button
          onClick={() => setIsStoreModalOpen(true)}
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
          + Store Credential
        </button>
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
                Integration
              </th>
              <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Provider
              </th>
              <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Project
              </th>
              <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Encryption
              </th>
              <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Status
              </th>
              <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {credentials.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: tokens.colors.text.muted }}>
                  No credentials in vault.
                </td>
              </tr>
            ) : (
              credentials.map((c, idx) => (
                <tr
                  key={c.id}
                  onClick={() => openInspector('credential', c)}
                  style={{
                    height: '48px',
                    borderBottom: idx < credentials.length - 1 ? `1px solid ${tokens.colors.border.subtle}` : 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.1s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tokens.colors.bg.surfaceHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '0 16px' }}>
                    <div style={{ fontWeight: tokens.typography.weight.medium, color: tokens.colors.text.primary }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.muted, fontFamily: tokens.typography.fontFamily.mono }}>
                      {c.id}
                    </div>
                  </td>
                  <td style={{ padding: '0 16px', color: tokens.colors.text.secondary, textTransform: 'capitalize' }}>
                    {c.provider}
                  </td>
                  <td style={{ padding: '0 16px', color: tokens.colors.text.secondary }}>
                    {c.projectId}
                  </td>
                  <td style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs }}>
                    AES-256-GCM Envelope
                  </td>
                  <td style={{ padding: '0 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: testResults[c.id]?.status === 'FAILED' ? tokens.colors.status.danger : tokens.colors.status.healthy,
                        }}
                      />
                      <span style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.primary }}>
                        {testResults[c.id]?.message || 'Verified'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '0 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleTestPing(c.id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: tokens.radius.sm,
                        backgroundColor: tokens.colors.bg.surfaceHover,
                        border: `1px solid ${tokens.colors.border.default}`,
                        color: tokens.colors.text.secondary,
                        fontSize: tokens.typography.size.xs,
                        cursor: 'pointer',
                      }}
                    >
                      Test Connection
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Store Credential Modal */}
      {isStoreModalOpen && (
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
                Store External Credential
              </h2>
              <button
                onClick={() => setIsStoreModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: tokens.colors.text.muted, fontSize: '16px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStore} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: tokens.typography.size.xs, color: tokens.colors.text.secondary, marginBottom: '4px' }}>
                  Name / Integration
                </label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Stripe Production Gateway"
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
                  Provider
                </label>
                <select
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
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
                  <option value="stripe">Stripe</option>
                  <option value="aws">AWS SES / S3</option>
                  <option value="twilio">Twilio</option>
                  <option value="sendgrid">SendGrid</option>
                  <option value="custom">Custom Webhook / TLS</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: tokens.typography.size.xs, color: tokens.colors.text.secondary, marginBottom: '4px' }}>
                  Secret Key / Token (Envelope Encrypted)
                </label>
                <input
                  required
                  type="password"
                  value={formData.plaintextSecret}
                  onChange={(e) => setFormData({ ...formData, plaintextSecret: e.target.value })}
                  placeholder="sk_live_..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: tokens.colors.bg.input,
                    border: `1px solid ${tokens.colors.border.default}`,
                    borderRadius: tokens.radius.sm,
                    color: tokens.colors.text.primary,
                    fontSize: tokens.typography.size.base,
                    fontFamily: tokens.typography.fontFamily.mono,
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsStoreModalOpen(false)}
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
                  disabled={saving}
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
                  {saving ? 'Encrypting...' : 'Seal in Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
