'use client';

import * as React from 'react';
import Link from 'next/link';
import { ConsoleShell } from '../../components/console-shell';
import { Card, Button, Badge } from '@orbitox-io/ui';
import { Code2, Play, Terminal, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

interface Endpoint {
  id: string;
  group: string;
  method: 'GET' | 'POST';
  path: string;
  description: string;
  defaultBody?: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    id: 'ep-projects',
    group: 'Platform',
    method: 'GET',
    path: '/api/v1/platform/projects',
    description: 'List all multi-tenant projects and environments.',
  },
  {
    id: 'ep-keys',
    group: 'Access',
    method: 'GET',
    path: '/api/v1/platform/api-keys',
    description: 'List managed machine credentials and HMAC verifiers.',
  },
  {
    id: 'ep-creds',
    group: 'Access',
    method: 'GET',
    path: '/api/v1/platform/credentials',
    description: 'List external credentials stored in envelope vault.',
  },
  {
    id: 'ep-packages',
    group: 'Supply Chain',
    method: 'GET',
    path: '/api/v1/platform/packages',
    description: 'List package registry and Ed25519 signature statuses.',
  },
  {
    id: 'ep-audit',
    group: 'Governance',
    method: 'GET',
    path: '/api/v1/platform/audit',
    description: 'Query hash-chained audit events.',
  },
  {
    id: 'ep-security',
    group: 'Security',
    method: 'GET',
    path: '/api/v1/platform/security',
    description: 'Query platform defense posture and threat metrics.',
  },
  {
    id: 'ep-ai',
    group: 'AI & MCP',
    method: 'GET',
    path: '/api/v1/platform/ai',
    description: 'List MCP tool registries and guardrail configuration.',
  },
  {
    id: 'ep-ai-sim',
    group: 'AI & MCP',
    method: 'POST',
    path: '/api/v1/platform/ai',
    description: 'Simulate an MCP tool call through the guardrail pipeline.',
    defaultBody: JSON.stringify(
      { toolName: 'kernel_inspect_environment', parameters: { environmentId: 'env-prod-omni' } },
      null,
      2,
    ),
  },
];

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    /(?:orbitox_operator_csrf|orbitox_customer_csrf|orbitox_csrf)=([^;]+)/,
  );
  return match && match[1] ? decodeURIComponent(match[1]) : null;
}

export default function ConsoleDeveloperExplorerPage() {
  const [selectedEndpoint, setSelectedEndpoint] = React.useState<Endpoint>(ENDPOINTS[0]!);
  const [requestBody, setRequestBody] = React.useState(selectedEndpoint.defaultBody || '');
  const [response, setResponse] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [latency, setLatency] = React.useState<number | null>(null);

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
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const csrf = getCsrfToken();
      if (csrf) headers['x-csrf-token'] = csrf;

      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers,
      };
      if (selectedEndpoint.method === 'POST' && requestBody) {
        options.body = requestBody;
      }
      const res = await fetch(selectedEndpoint.path, options);
      const json = await res.json();
      setLatency(Math.round(performance.now() - start));
      setResponse({ status: res.status, ok: res.ok, data: json });
    } catch (err: any) {
      setLatency(Math.round(performance.now() - start));
      setResponse({ status: 500, ok: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConsoleShell activeId="overview">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <Link href="/console/overview" className="hover:text-[var(--color-text)] transition-colors">
            Overview
          </Link>
          <span>/</span>
          <span className="font-semibold text-[var(--color-text)]">API Explorer</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text)]">
              API Explorer & OpenAPI Console
            </h1>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Interactive developer console to test, inspect, and verify authoritative control plane endpoints.
            </p>
          </div>
          <Link
            href="/api/v1/openapi.json"
            target="_blank"
            className="text-xs font-semibold px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors inline-flex items-center gap-1.5"
          >
            <Code2 className="h-3.5 w-3.5 text-[var(--color-primary)]" />
            OpenAPI Spec (JSON)
          </Link>
        </div>

        {/* Main Workspace Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[500px]">
          {/* Left Column: Endpoints List (4 cols) */}
          <Card className="md:col-span-4 p-3 space-y-1 overflow-y-auto">
            <div className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider px-2 py-1 mb-1">
              Catalog Endpoints
            </div>
            {ENDPOINTS.map((ep) => (
              <button
                key={ep.id}
                type="button"
                onClick={() => handleSelect(ep)}
                className={`w-full text-left p-2.5 rounded-[var(--radius-card)] transition-colors flex flex-col gap-1 ${
                  selectedEndpoint.id === ep.id
                    ? 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/40 text-[var(--color-text)]'
                    : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      ep.method === 'GET'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="font-mono text-xs font-medium text-[var(--color-text)] truncate">
                    {ep.path}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)] truncate pl-0.5">
                  {ep.description}
                </div>
              </button>
            ))}
          </Card>

          {/* Right Column: Request Runner & Output (8 cols) */}
          <div className="md:col-span-8 space-y-4">
            <Card className="p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                      selectedEndpoint.method === 'GET'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                    }`}
                  >
                    {selectedEndpoint.method}
                  </span>
                  <span className="font-mono text-xs font-semibold text-[var(--color-text)]">
                    {selectedEndpoint.path}
                  </span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  className="rounded-full"
                  disabled={loading}
                  onClick={handleExecute}
                >
                  <Play className="h-3.5 w-3.5 mr-1" />
                  {loading ? 'Executing…' : 'Send Request'}
                </Button>
              </div>

              <p className="text-xs text-[var(--color-text-muted)]">
                {selectedEndpoint.description}
              </p>

              {selectedEndpoint.method === 'POST' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--color-text)]">
                    Request Payload (JSON)
                  </label>
                  <textarea
                    rows={4}
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    className="w-full p-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] font-mono text-xs text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                  />
                </div>
              )}
            </Card>

            {/* Response Viewer */}
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-xs text-[var(--color-text)] uppercase tracking-wider">
                    Server Response
                  </h3>
                  {response && (
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        response.ok
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                      }`}
                    >
                      HTTP {response.status}
                    </span>
                  )}
                </div>
                {latency !== null && (
                  <span className="text-[11px] font-mono text-[var(--color-text-muted)] flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {latency}ms
                  </span>
                )}
              </div>

              {response ? (
                <pre className="p-4 rounded-[var(--radius-card)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] font-mono text-xs text-[var(--color-text)] overflow-x-auto max-h-96">
                  {JSON.stringify(response.data || response.error, null, 2)}
                </pre>
              ) : (
                <div className="p-12 text-center text-xs text-[var(--color-text-muted)] italic border border-dashed border-[var(--color-border)] rounded-[var(--radius-card)]">
                  Click &quot;Send Request&quot; above to execute live query against control plane API.
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </ConsoleShell>
  );
}
