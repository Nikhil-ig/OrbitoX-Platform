'use client';

import React, { useState } from 'react';
import { tokens } from '../components/tokens';

interface Endpoint {
  id: string;
  group: string;
  method: 'GET' | 'POST';
  path: string;
  description: string;
  defaultBody?: string;
}

const endpoints: Endpoint[] = [
  { id: 'ep-projects', group: 'Platform', method: 'GET', path: '/api/v1/platform/projects', description: 'List all multi-tenant projects and environments.' },
  { id: 'ep-keys', group: 'Access', method: 'GET', path: '/api/v1/platform/api-keys', description: 'List managed machine credentials and HMAC verifiers.' },
  { id: 'ep-creds', group: 'Access', method: 'GET', path: '/api/v1/platform/credentials', description: 'List external credentials stored in envelope vault.' },
  { id: 'ep-packages', group: 'Supply Chain', method: 'GET', path: '/api/v1/platform/packages', description: 'List package registry and Ed25519 signature statuses.' },
  { id: 'ep-audit', group: 'Governance', method: 'GET', path: '/api/v1/platform/audit', description: 'Query hash-chained audit events.' },
  { id: 'ep-security', group: 'Security', method: 'GET', path: '/api/v1/platform/security', description: 'Query platform defense posture and threat metrics.' },
  { id: 'ep-ai', group: 'AI & MCP', method: 'GET', path: '/api/v1/platform/ai', description: 'List MCP tool registries and guardrail configuration.' },
  {
    id: 'ep-ai-sim',
    group: 'AI & MCP',
    method: 'POST',
    path: '/api/v1/platform/ai',
    description: 'Simulate an MCP tool call through the guardrail pipeline.',
    defaultBody: JSON.stringify({ toolName: 'kernel_inspect_environment', parameters: { environmentId: 'env-prod-omni' } }, null, 2),
  },
];

export default function PlatformExplorerPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint>(endpoints[0]!);
  const [requestBody, setRequestBody] = useState(selectedEndpoint.defaultBody || '');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);

  const handleSelect = (ep: Endpoint) => {
    setSelectedEndpoint(ep);
    setRequestBody(ep.defaultBody || '');
    setResponse(null);
    setLatency(null);
  };

  const handleExecute = async () => {
    setLoading(true);
    setResponse(null);
    const start = performance.now();
    try {
      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (selectedEndpoint.method === 'POST' && requestBody) {
        options.body = requestBody;
      }
      const res = await fetch(selectedEndpoint.path, options);
      const json = await res.json();
      setLatency(Math.round(performance.now() - start));
      setResponse({ status: res.status, data: json });
    } catch (err: any) {
      setLatency(Math.round(performance.now() - start));
      setResponse({ status: 500, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: tokens.typography.size.xxl, fontWeight: tokens.typography.weight.bold, color: tokens.colors.text.primary, margin: 0, letterSpacing: '-0.02em' }}>
          API Explorer
        </h1>
        <p style={{ fontSize: tokens.typography.size.base, color: tokens.colors.text.secondary, margin: '4px 0 0 0' }}>
          Interactive developer console to test, inspect, and verify platform endpoints.
        </p>
      </div>

      {/* Main Console Workspace */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '260px 1fr',
          backgroundColor: tokens.colors.bg.surface,
          border: `1px solid ${tokens.colors.border.subtle}`,
          borderRadius: tokens.radius.md,
          overflow: 'hidden',
        }}
      >
        {/* Left: Endpoint List */}
        <div style={{ borderRight: `1px solid ${tokens.colors.border.subtle}`, overflowY: 'auto', padding: '10px' }}>
          <div style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.muted, textTransform: 'uppercase', padding: '6px 8px', fontWeight: tokens.typography.weight.semibold }}>
            Endpoints
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
            {endpoints.map((ep) => {
              const isSelected = selectedEndpoint.id === ep.id;
              return (
                <div
                  key={ep.id}
                  onClick={() => handleSelect(ep)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: tokens.radius.sm,
                    backgroundColor: isSelected ? tokens.colors.bg.surfaceRaised : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '10px',
                      fontFamily: tokens.typography.fontFamily.mono,
                      fontWeight: tokens.typography.weight.bold,
                      color: ep.method === 'GET' ? tokens.colors.accent.brand : tokens.colors.status.warning,
                      width: '34px',
                    }}
                  >
                    {ep.method}
                  </span>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.primary, fontWeight: tokens.typography.weight.medium }}>
                      {ep.path.replace('/api/v1/platform/', '')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Request & Response Area */}
        <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {/* Request Header Bar */}
          <div
            style={{
              padding: '14px 20px',
              borderBottom: `1px solid ${tokens.colors.border.subtle}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
              <span
                style={{
                  fontSize: tokens.typography.size.xs,
                  fontFamily: tokens.typography.fontFamily.mono,
                  fontWeight: tokens.typography.weight.bold,
                  padding: '3px 8px',
                  borderRadius: tokens.radius.xs,
                  backgroundColor: selectedEndpoint.method === 'GET' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                  color: selectedEndpoint.method === 'GET' ? tokens.colors.accent.brand : tokens.colors.status.warning,
                }}
              >
                {selectedEndpoint.method}
              </span>
              <span style={{ fontSize: tokens.typography.size.base, fontFamily: tokens.typography.fontFamily.mono, color: tokens.colors.text.primary }}>
                {selectedEndpoint.path}
              </span>
            </div>

            <button
              onClick={handleExecute}
              disabled={loading}
              style={{
                padding: '6px 16px',
                borderRadius: tokens.radius.sm,
                backgroundColor: tokens.colors.text.primary,
                color: tokens.colors.text.inverted,
                fontWeight: tokens.typography.weight.semibold,
                fontSize: tokens.typography.size.xs,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {loading ? 'Sending...' : 'Send Request'}
            </button>
          </div>

          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
            <div style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.secondary }}>
              {selectedEndpoint.description}
            </div>

            {selectedEndpoint.method === 'POST' && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.muted, marginBottom: '6px' }}>
                  Request Payload (JSON)
                </div>
                <textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: tokens.colors.bg.input,
                    border: `1px solid ${tokens.colors.border.default}`,
                    borderRadius: tokens.radius.sm,
                    color: tokens.colors.text.primary,
                    fontFamily: tokens.typography.fontFamily.mono,
                    fontSize: tokens.typography.size.xs,
                    outline: 'none',
                  }}
                />
              </div>
            )}
          </div>

          {/* Response Viewer */}
          <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Response
              </div>
              {latency !== null && (
                <div style={{ fontSize: tokens.typography.size.xs, fontFamily: tokens.typography.fontFamily.mono, color: tokens.colors.status.healthy }}>
                  {response?.status} OK · {latency}ms
                </div>
              )}
            </div>

            <div
              style={{
                flex: 1,
                minHeight: '200px',
                backgroundColor: tokens.colors.bg.input,
                border: `1px solid ${tokens.colors.border.subtle}`,
                borderRadius: tokens.radius.sm,
                padding: '12px 14px',
                overflowX: 'auto',
                fontFamily: tokens.typography.fontFamily.mono,
                fontSize: tokens.typography.size.xs,
                color: response?.status === 200 ? tokens.colors.text.primary : tokens.colors.text.secondary,
              }}
            >
              {response ? (
                <pre style={{ margin: 0 }}>{JSON.stringify(response.data || response, null, 2)}</pre>
              ) : (
                <span style={{ color: tokens.colors.text.muted }}>Click "Send Request" to execute query.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
