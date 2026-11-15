'use client';

import * as React from 'react';
import { ConsoleShell } from '../../console/components/console-shell';
import { Card, Badge, Button, Input, Textarea } from '@orbitox-io/ui';
import { Sparkles, ShieldCheck, Terminal, Play, CheckCircle2, Lock } from 'lucide-react';

export default function PlatformAiGovernancePage() {
  const [data, setData] = React.useState<any>(null);
  const [activeTab, setActiveTab] = React.useState<'tools' | 'guardrails' | 'executions' | 'simulator'>('tools');

  // Simulator state
  const [simTool, setSimTool] = React.useState('kernel_inspect_environment');
  const [simParams, setSimParams] = React.useState('{\n  "environmentId": "env-prod-omni"\n}');
  const [simulating, setSimulating] = React.useState(false);
  const [simResult, setSimResult] = React.useState<any>(null);

  React.useEffect(() => {
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
  }, []);

  const handleSimulate = async () => {
    setSimulating(true);
    setSimResult(null);
    try {
      let parsed = {};
      try {
        parsed = JSON.parse(simParams);
      } catch {
        alert('Invalid JSON in parameters');
        setSimulating(false);
        return;
      }

      const res = await fetch('/api/v1/platform/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName: simTool, parameters: parsed }),
      });
      const json = await res.json();
      setSimResult(json);
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
    <ConsoleShell activeId="ai-assistant">
      <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[11px] font-mono border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-surface-raised)] px-2 py-0.5 rounded-full">
                Stage 7D · Hold
              </Badge>
              <Badge variant="outline" className="text-[11px] font-medium border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                MCP Assistant
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)] mt-1">
              AI & Model Context Protocol (MCP) Gateway
            </h1>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Model Context Protocol server registry, tool capability scopes, and safety guardrails.
            </p>
          </div>

          <div className="flex rounded-full bg-[var(--color-surface-raised)] p-1 border border-[var(--color-border)]">
            {[
              { id: 'tools', label: 'Tools' },
              { id: 'guardrails', label: 'Guardrails' },
              { id: 'executions', label: 'Executions' },
              { id: 'simulator', label: 'Simulator' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'tools' && (
          <Card className="overflow-hidden border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                    <th className="py-2.5 px-4 font-medium uppercase tracking-wider text-[11px]">Tool Name</th>
                    <th className="py-2.5 px-4 font-medium uppercase tracking-wider text-[11px]">Server</th>
                    <th className="py-2.5 px-4 font-medium uppercase tracking-wider text-[11px]">Capability</th>
                    <th className="py-2.5 px-4 font-medium uppercase tracking-wider text-[11px]">Invocations</th>
                    <th className="py-2.5 px-4 font-medium uppercase tracking-wider text-[11px]">Avg Latency</th>
                    <th className="py-2.5 px-4 font-medium uppercase tracking-wider text-[11px]">Policy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {allTools.length > 0 ? (
                    allTools.map((t: any) => (
                      <tr key={t.toolName} className="hover:bg-[var(--color-surface-raised)]/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-mono font-medium text-[var(--color-text)]">{t.toolName}</div>
                          <div className="text-[11px] text-[var(--color-text-muted)]">{t.description}</div>
                        </td>
                        <td className="py-3 px-4 text-[var(--color-text-muted)]">{t.serverName}</td>
                        <td className="py-3 px-4">
                          <code className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--color-surface-raised)] text-[var(--color-primary)] font-mono">
                            {t.requiredCapability}
                          </code>
                        </td>
                        <td className="py-3 px-4 font-mono text-[var(--color-text-muted)]">{t.invocationsCount?.toLocaleString() || 0}</td>
                        <td className="py-3 px-4 font-mono text-[var(--color-text-muted)]">{t.averageLatencyMs || 0}ms</td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] text-[var(--color-success)] bg-[var(--color-success)]/10 px-2 py-0.5 rounded-full font-medium">
                            Guarded
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                        No active MCP tools registered on the control plane.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === 'guardrails' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Card key={g.title} className="p-5 space-y-3 border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--color-text)]">{g.title}</h3>
                  <span className="text-[10px] text-[var(--color-success)] bg-[var(--color-success)]/10 px-2 py-0.5 rounded-full font-medium">Active</span>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{g.desc}</p>
                <div className="text-xs text-[var(--color-text-muted)] pt-2 border-t border-[var(--color-border)]">
                  Lifetime Interceptions: <strong className="text-[var(--color-text)] font-semibold">{g.stat}</strong>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'executions' && (
          <Card className="overflow-hidden border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                    <th className="py-2.5 px-4 font-medium uppercase tracking-wider text-[11px]">Time</th>
                    <th className="py-2.5 px-4 font-medium uppercase tracking-wider text-[11px]">Caller Agent</th>
                    <th className="py-2.5 px-4 font-medium uppercase tracking-wider text-[11px]">Tool</th>
                    <th className="py-2.5 px-4 font-medium uppercase tracking-wider text-[11px]">Scope</th>
                    <th className="py-2.5 px-4 font-medium uppercase tracking-wider text-[11px]">Latency</th>
                    <th className="py-2.5 px-4 font-medium uppercase tracking-wider text-[11px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                      Recent tool execution history empty or synced to cold storage.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === 'simulator' && (
          <Card className="p-6 space-y-4 border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">MCP Tool Simulator</h3>
              <p className="text-xs text-[var(--color-text-muted)]">Test policy validation and tool execution directly against the live sandbox.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[var(--color-text)] mb-1 block">Tool Name</label>
                <input
                  type="text"
                  value={simTool}
                  onChange={(e) => setSimTool(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-xs font-mono text-[var(--color-text)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-text)] mb-1 block">Parameters (JSON)</label>
                <textarea
                  rows={4}
                  value={simParams}
                  onChange={(e) => setSimParams(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-xs font-mono text-[var(--color-text)] focus:outline-none"
                />
              </div>

              <Button
                variant="primary"
                size="sm"
                className="rounded-full"
                onClick={handleSimulate}
                disabled={simulating}
              >
                {simulating ? 'Executing Tool…' : 'Run Simulation'}
              </Button>

              {simResult && (
                <div className="mt-4 p-4 rounded-[var(--radius-row)] bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                  <div className="text-xs font-mono text-[var(--color-text-muted)] mb-1">Execution Response:</div>
                  <pre className="text-xs font-mono text-[var(--color-text)] overflow-x-auto">{JSON.stringify(simResult, null, 2)}</pre>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </ConsoleShell>
  );
}
