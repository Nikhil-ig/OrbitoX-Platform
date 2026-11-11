'use client';

import React, { useEffect, useState } from 'react';
import { usePlatform } from '../components/PlatformContext';
import { tokens } from '../components/tokens';

export default function PlatformAiGovernancePage() {
  const { refreshTrigger, triggerRefresh } = usePlatform();
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'tools' | 'guardrails' | 'executions' | 'simulator'>('tools');

  // Simulator
  const [simTool, setSimTool] = useState('kernel_inspect_environment');
  const [simParams, setSimParams] = useState('{\n  "environmentId": "env-prod-omni"\n}');
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/v1/platform/ai');
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (err) {
        console.error('Failed to load AI governance:', err);
      }
    }
    loadData();
  }, [refreshTrigger]);

  const handleSimulate = async () => {
    setSimulating(true);
    setSimResult(null);
    try {
      let parsed = {};
      try { parsed = JSON.parse(simParams); } catch { alert('Invalid JSON in parameters'); setSimulating(false); return; }

      const res = await fetch('/api/v1/platform/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName: simTool, parameters: parsed }),
      });
      const json = await res.json();
      setSimResult(json);
      triggerRefresh();
    } catch (err: any) {
      setSimResult({ success: false, error: err.message });
    } finally {
      setSimulating(false);
    }
  };

  const allTools = (data?.servers || []).flatMap((s: any) =>
    (s.tools || []).map((t: any) => ({ ...t, serverName: s.name }))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: tokens.typography.size.xxl, fontWeight: tokens.typography.weight.bold, color: tokens.colors.text.primary, margin: 0, letterSpacing: '-0.02em' }}>
            AI & MCP Gateway
          </h1>
          <p style={{ fontSize: tokens.typography.size.base, color: tokens.colors.text.secondary, margin: '4px 0 0 0' }}>
            Model Context Protocol server registry, tool capability scopes, and safety guardrails.
          </p>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', backgroundColor: tokens.colors.bg.surfaceRaised, padding: '3px', borderRadius: tokens.radius.sm, border: `1px solid ${tokens.colors.border.default}` }}>
          {[
            { id: 'tools', label: 'Tools' },
            { id: 'guardrails', label: 'Guardrails' },
            { id: 'executions', label: 'Execution Log' },
            { id: 'simulator', label: 'Simulator' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '5px 12px',
                borderRadius: tokens.radius.xs,
                border: 'none',
                backgroundColor: activeTab === tab.id ? tokens.colors.bg.surfaceHover : 'transparent',
                color: activeTab === tab.id ? tokens.colors.text.primary : tokens.colors.text.muted,
                fontSize: tokens.typography.size.xs,
                fontWeight: tokens.typography.weight.medium,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'tools' && (
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
                  Tool Name
                </th>
                <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Server
                </th>
                <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Required Capability
                </th>
                <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Invocations
                </th>
                <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Avg Latency
                </th>
                <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Policy
                </th>
              </tr>
            </thead>
            <tbody>
              {allTools.map((t: any, idx: number) => (
                <tr
                  key={t.toolName}
                  style={{
                    height: '48px',
                    borderBottom: idx < allTools.length - 1 ? `1px solid ${tokens.colors.border.subtle}` : 'none',
                  }}
                >
                  <td style={{ padding: '0 16px' }}>
                    <div style={{ fontFamily: tokens.typography.fontFamily.mono, color: tokens.colors.text.primary, fontWeight: tokens.typography.weight.medium }}>
                      {t.toolName}
                    </div>
                    <div style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.muted }}>
                      {t.description}
                    </div>
                  </td>
                  <td style={{ padding: '0 16px', color: tokens.colors.text.secondary }}>
                    {t.serverName}
                  </td>
                  <td style={{ padding: '0 16px' }}>
                    <code style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.accent.brand }}>
                      {t.requiredCapability}
                    </code>
                  </td>
                  <td style={{ padding: '0 16px', color: tokens.colors.text.secondary, fontFamily: tokens.typography.fontFamily.mono }}>
                    {t.invocationsCount?.toLocaleString()}
                  </td>
                  <td style={{ padding: '0 16px', color: tokens.colors.text.muted, fontFamily: tokens.typography.fontFamily.mono }}>
                    {t.averageLatencyMs}ms
                  </td>
                  <td style={{ padding: '0 16px' }}>
                    <span style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.status.healthy }}>
                      Guarded
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'guardrails' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {[
            {
              title: 'PII Redaction Engine',
              desc: 'Strips email addresses, credit cards, and customer identifiers from model prompts.',
              stat: `${data?.guardrails?.piiRedaction?.totalRedactions || 384} masked`,
            },
            {
              title: 'Prompt Injection Shield',
              desc: 'Blocks adversarial system prompt overrides and roleplay exfiltration attempts.',
              stat: `${data?.guardrails?.promptInjectionShield?.injectionsBlocked || 19} blocked`,
            },
            {
              title: 'Secret Leakage Filter',
              desc: 'Deep entropy scanner preventing machine credentials from escaping to LLMs.',
              stat: `${data?.guardrails?.secretLeakageFilter?.secretsFiltered || 43} filtered`,
            },
          ].map((g) => (
            <div
              key={g.title}
              style={{
                backgroundColor: tokens.colors.bg.surface,
                border: `1px solid ${tokens.colors.border.subtle}`,
                borderRadius: tokens.radius.md,
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: tokens.typography.size.base, fontWeight: tokens.typography.weight.medium, color: tokens.colors.text.primary }}>
                  {g.title}
                </span>
                <span style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.status.healthy }}>Active</span>
              </div>
              <p style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.secondary, margin: '8px 0 0 0' }}>
                {g.desc}
              </p>
              <div style={{ marginTop: '16px', fontSize: tokens.typography.size.xs, color: tokens.colors.text.muted }}>
                Lifetime Interceptions: <span style={{ color: tokens.colors.text.primary, fontWeight: tokens.typography.weight.semibold }}>{g.stat}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'executions' && (
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
                  Time
                </th>
                <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Caller Agent
                </th>
                <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Tool
                </th>
                <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Tenant Scope
                </th>
                <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Latency
                </th>
                <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentExecutions || []).map((e: any, idx: number) => (
                <tr
                  key={e.id}
                  style={{
                    height: '48px',
                    borderBottom: idx < (data?.recentExecutions?.length || 0) - 1 ? `1px solid ${tokens.colors.border.subtle}` : 'none',
                  }}
                >
                  <td style={{ padding: '0 16px', color: tokens.colors.text.muted, fontFamily: tokens.typography.fontFamily.mono, fontSize: tokens.typography.size.xs }}>
                    {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '0 16px', color: tokens.colors.text.primary, fontWeight: tokens.typography.weight.medium }}>
                    {e.callerAgent}
                  </td>
                  <td style={{ padding: '0 16px', color: tokens.colors.accent.brand, fontFamily: tokens.typography.fontFamily.mono, fontSize: tokens.typography.size.xs }}>
                    {e.toolName}
                  </td>
                  <td style={{ padding: '0 16px', color: tokens.colors.text.secondary, fontSize: tokens.typography.size.xs }}>
                    {e.tenantScope}
                  </td>
                  <td style={{ padding: '0 16px', color: tokens.colors.text.muted, fontFamily: tokens.typography.fontFamily.mono, fontSize: tokens.typography.size.xs }}>
                    {e.latencyMs}ms
                  </td>
                  <td style={{ padding: '0 16px' }}>
                    <span style={{ fontSize: tokens.typography.size.xs, color: e.status === 'AUTHORIZED_EXECUTED' ? tokens.colors.status.healthy : tokens.colors.status.danger }}>
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'simulator' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
              Simulate MCP Tool Execution
            </div>

            <div>
              <label style={{ display: 'block', fontSize: tokens.typography.size.xs, color: tokens.colors.text.secondary, marginBottom: '4px' }}>
                Tool
              </label>
              <select
                value={simTool}
                onChange={(e) => setSimTool(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  backgroundColor: tokens.colors.bg.input,
                  border: `1px solid ${tokens.colors.border.default}`,
                  borderRadius: tokens.radius.sm,
                  color: tokens.colors.text.primary,
                  fontSize: tokens.typography.size.base,
                  outline: 'none',
                }}
              >
                {allTools.map((t: any) => (
                  <option key={t.toolName} value={t.toolName}>{t.toolName}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: tokens.typography.size.xs, color: tokens.colors.text.secondary, marginBottom: '4px' }}>
                Parameters (JSON)
              </label>
              <textarea
                value={simParams}
                onChange={(e) => setSimParams(e.target.value)}
                rows={5}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: tokens.colors.bg.input,
                  border: `1px solid ${tokens.colors.border.default}`,
                  borderRadius: tokens.radius.sm,
                  color: tokens.colors.text.primary,
                  fontSize: tokens.typography.size.xs,
                  fontFamily: tokens.typography.fontFamily.mono,
                  outline: 'none',
                }}
              />
            </div>

            <button
              onClick={handleSimulate}
              disabled={simulating}
              style={{
                padding: '8px 14px',
                borderRadius: tokens.radius.sm,
                backgroundColor: tokens.colors.text.primary,
                color: tokens.colors.text.inverted,
                fontWeight: tokens.typography.weight.semibold,
                fontSize: tokens.typography.size.base,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {simulating ? 'Executing...' : 'Run Simulation'}
            </button>
          </div>

          <div
            style={{
              backgroundColor: tokens.colors.bg.surface,
              border: `1px solid ${tokens.colors.border.subtle}`,
              borderRadius: tokens.radius.md,
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: tokens.typography.size.sm, fontWeight: tokens.typography.weight.medium, color: tokens.colors.text.primary }}>
              Execution Telemetry
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
                color: tokens.colors.text.primary,
              }}
            >
              {simResult ? (
                <pre style={{ margin: 0 }}>{JSON.stringify(simResult, null, 2)}</pre>
              ) : (
                <span style={{ color: tokens.colors.text.muted }}>Results will appear here.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
