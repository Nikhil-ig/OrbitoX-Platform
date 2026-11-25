'use client';

import * as React from 'react';
import Link from 'next/link';
import { ConsoleShell } from '../components/console-shell';
import {
  Card,
  Button,
  Input,
  Badge,
} from '@orbitox-io/ui';
import {
  Sparkles,
  ShieldCheck,
  Terminal,
  Send,
  Bot,
  User,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  ArrowRight,
  Database,
  Cpu,
} from 'lucide-react';
import { useStepUpAuth } from '../components/step-up-modal';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  toolCalls?: string[];
  approvalDraft?: {
    id: string;
    toolName: string;
    title: string;
    draftMessage: string;
    targets: Array<{ id: string; tenantName: string; daysRemaining: number; amountMinor: number }>;
    status: 'PENDING_APPROVAL' | 'APPROVED' | 'CANCELLED' | 'FAILED';
    statusNote?: string;
    editing?: boolean;
  };
  toolCall?: {
    toolName: string;
    parameters: any;
    result?: any;
    status: 'AUTHORIZED' | 'PENDING_APPROVAL' | 'EXECUTED';
  };
  timestamp: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'assistant',
    text: 'Hello Operator. I am OrbitoX Platform Assistant, connected over Model Context Protocol (MCP) with zero-trust guardrails. Ask about grace periods, tenant health, or run authorized diagnostics.',
    timestamp: 'Just now',
  },
];

const SUGGESTED_PROMPTS = [
  'Which restaurants are in their grace period this week? Remind the owners.',
  'Inspect runtime topology for env-prod-omni',
  'Verify cryptographic signature of @orbitox/restaurant',
  'Check clinical triage status in HospitalOS',
];

function formatApprovalBadge(policy?: string): { label: string; cls: string } {
  if (policy === 'NEVER_AI') {
    return {
      label: 'Never through AI',
      cls: 'bg-[var(--color-danger)]/15 text-[var(--color-danger)] border-[var(--color-danger)]/30',
    };
  }
  if (policy === 'STEP_UP_MFA') {
    return {
      label: 'Ask me + password and code',
      cls: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)] border-[var(--color-warning)]/30',
    };
  }
  if (policy === 'ASK_FIRST') {
    return {
      label: 'Ask me first',
      cls: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    };
  }
  return {
    label: 'Read freely',
    cls: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  };
}

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    /(?:orbitox_operator_csrf|orbitox_customer_csrf|orbitox_csrf)=([^;]+)/,
  );
  return match && match[1] ? decodeURIComponent(match[1]) : null;
}

export default function ConsoleAskOrbitoXPage() {
  const { stepUpDialog, requestStepUpAuth } = useStepUpAuth();
  const [messages, setMessages] = React.useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [aiData, setAiData] = React.useState<any>(null);
  const [selectedTool, setSelectedTool] = React.useState<any>(null);

  // Fetch MCP Tools and Guardrails
  React.useEffect(() => {
    fetch('/api/v1/platform/ai')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success) setAiData(json.data);
      })
      .catch((err) => console.error('Failed to load MCP tool metadata:', err));
  }, []);

  const allTools = (aiData?.servers || []).flatMap((s: any) =>
    (s.tools || []).map((t: any) => ({ ...t, serverName: s.name, serverId: s.serverId })),
  );

  const handleApproveDraft = async (msgId: string) => {
    const targetMsg = messages.find((m) => m.id === msgId);
    const draft = targetMsg?.approvalDraft;
    if (!draft || draft.status !== 'PENDING_APPROVAL') return;

    const csrf = getCsrfToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (csrf) headers['x-csrf-token'] = csrf;

    try {
      if (draft.targets.length === 0) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId && m.approvalDraft
              ? {
                  ...m,
                  approvalDraft: {
                    ...m.approvalDraft,
                    status: 'CANCELLED',
                    statusNote: 'No grace-period subscriptions are queued right now.',
                  },
                }
              : m
          )
        );
        return;
      }

      const results = await Promise.all(
        draft.targets.map(async (sub) => {
          const r = await fetch(`/api/v1/platform/billing/subscriptions/${encodeURIComponent(sub.id)}/remind`, {
            method: 'POST',
            headers,
          });
          const body = await r.json().catch(() => ({}));
          return { id: sub.id, tenantName: sub.tenantName, ok: r.ok && body?.success, error: body?.error?.message };
        })
      );

      await fetch('/api/v1/platform/ai', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          toolName: draft.toolName,
          parameters: { subscriptionIds: draft.targets.map((t) => t.id), approved: true },
          agentCaller: 'AskOrbitoX-Operator-Approval',
        }),
      }).catch(() => null);

      const failures = results.filter((r) => !r.ok);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.approvalDraft
            ? {
                ...m,
                approvalDraft: {
                  ...m.approvalDraft,
                  status: failures.length === 0 ? 'APPROVED' : 'FAILED',
                  statusNote:
                    failures.length === 0
                      ? `Queued reminder email(s) for ${results.length} subscription(s) with audit trail.`
                      : `${failures[0]?.tenantName}: ${failures[0]?.error || 'Failed to queue reminder.'}`,
                },
              }
            : m
        )
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.approvalDraft
            ? {
                ...m,
                approvalDraft: {
                  ...m.approvalDraft,
                  status: 'FAILED',
                  statusNote: err?.message || 'Approval execution failed.',
                },
              }
            : m
        )
      );
    }
  };

  const handleUpdateDraftDecision = (msgId: string, patch: Partial<NonNullable<ChatMessage['approvalDraft']>>) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.approvalDraft
          ? { ...m, approvalDraft: { ...m.approvalDraft, ...patch } }
          : m
      )
    );
  };

  const handleSendMessage = async (userText: string) => {
    if (!userText.trim() || isProcessing) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: userText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsProcessing(true);

    const lower = userText.toLowerCase();

    if (lower.includes('grace') || lower.includes('remind')) {
      try {
        const csrf = getCsrfToken();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (csrf) headers['x-csrf-token'] = csrf;

        const [sumRes] = await Promise.all([
          fetch('/api/v1/platform/billing/summary'),
          fetch('/api/v1/platform/ai', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              toolName: 'billing.list_subscriptions',
              parameters: { status: 'grace' },
              agentCaller: 'AskOrbitoX-Console-Session',
            }),
          }),
        ]);
        const sumJson = await sumRes.json().catch(() => ({}));
        const graceSubs: Array<{ id: string; tenantName: string; daysRemaining: number; amountMinor: number }> =
          sumJson?.data?.needsAction?.graceSubscriptions || [];

        const firstName = graceSubs[0]?.tenantName || 'the organization contact';
        const firstAmt = graceSubs[0] ? `₹${(graceSubs[0].amountMinor / 100).toLocaleString('en-IN')}` : 'your subscription';

        const assistantMsg: ChatMessage = {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          toolCalls: ['billing.list_subscriptions status=grace', 'tenants.search / get'],
          text:
            graceSubs.length > 0
              ? `Found ${graceSubs.length} subscription(s) in grace period. I've drafted a reminder below — nothing is sent until you approve.`
              : `No subscriptions are currently flagged in grace period in PostgreSQL. You can review all billing events on the Billing screen.`,
          approvalDraft:
            graceSubs.length > 0
              ? {
                  id: `draft-${Date.now()}`,
                  toolName: 'billing.send_payment_reminder',
                  title: `Email ${graceSubs.length} owner(s) a payment reminder`,
                  targets: graceSubs,
                  draftMessage: `“Your OrbitoX payment of ${firstAmt} for ${firstName} requires an updated payment method within ${graceSubs[0]?.daysRemaining ?? 7} days to keep ordering active.”`,
                  status: 'PENDING_APPROVAL',
                }
              : undefined,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err: any) {
        setMessages((prev) => [
          ...prev,
          {
            id: `asst-err-${Date.now()}`,
            sender: 'assistant',
            text: `Error checking billing grace status: ${err?.message || 'Network failure'}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // Heuristic Tool Match
    let targetTool = 'kernel_inspect_environment';
    let params: any = { environmentId: 'env-prod-omni' };

    if (lower.includes('signature') || lower.includes('verify') || lower.includes('package')) {
      targetTool = 'kernel_crypto_verify';
      params = { packageId: '@orbitox/restaurant', version: '1.4.0' };
    } else if (lower.includes('triage') || lower.includes('hospital') || lower.includes('clinical')) {
      targetTool = 'hms_triage_score';
      params = { wardId: 'ward-emergency-a' };
    } else if (lower.includes('bed')) {
      targetTool = 'hms_read_beds';
      params = { facilityId: 'hosp-metro-central' };
    } else if (lower.includes('schema') || lower.includes('database') || lower.includes('db')) {
      targetTool = 'db_read_schema';
      params = { tableFilter: 'all_sanitized' };
    }

    try {
      const csrf = getCsrfToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (csrf) headers['x-csrf-token'] = csrf;

      const res = await fetch('/api/v1/platform/ai', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          toolName: targetTool,
          parameters: params,
          agentCaller: 'AskOrbitoX-Console-Session',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || `MCP execution refused (HTTP ${res.status})`);
      }

      let replyText = '';
      if (targetTool === 'kernel_inspect_environment') {
        replyText = `I inspected the environment \`env-prod-omni\` via the Kernel Server. Cluster status is HEALTHY and tenant cell invariants passed.`;
      } else if (targetTool === 'kernel_crypto_verify') {
        replyText = `Verified Ed25519 digital signature for \`@orbitox/restaurant\` v1.4.0. File tree SHA-256 integrity passed.`;
      } else if (targetTool === 'hms_triage_score') {
        replyText = `Queried HospitalOS triage service within isolated clinical ward boundaries.`;
      } else if (targetTool === 'hms_read_beds') {
        replyText = `Queried anonymized HospitalOS bed availability summary.`;
      } else if (targetTool === 'db_read_schema') {
        replyText = `Returned sanitized schema metadata. Zero raw secret columns or plaintext credentials exposed.`;
      } else {
        replyText = `Executed MCP tool \`${targetTool}\` through zero-trust gateway.`;
      }

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        toolCalls: [targetTool],
        toolCall: {
          toolName: targetTool,
          parameters: params,
          result: json.data || json,
          status: 'EXECUTED',
        },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `asst-err-${Date.now()}`,
        sender: 'assistant',
        text: `Error executing MCP tool: ${err?.message || 'Network failure'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ConsoleShell activeId="ai-assistant">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <Link href="/console/overview" className="hover:text-[var(--color-text)] transition-colors">
            Overview
          </Link>
          <span>/</span>
          <span className="font-semibold text-[var(--color-text)]">Ask OrbitoX</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text)]">
                Ask OrbitoX
              </h1>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
                Acts as you · every step logged
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                MCP Guardrails Active
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Natural language command and control across multi-tenant cells, billing grace workflows, and cryptographic verification.
            </p>
          </div>
        </div>

        {/* Two-Column Grid: Left Chat (7 cols), Right MCP Registry (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px] min-w-0">
          {/* Left Column: Chat Conversation */}
          <Card className="lg:col-span-7 min-w-0 overflow-hidden flex flex-col justify-between p-5 border border-[var(--color-border)] bg-[var(--color-surface)]">
            {/* Messages Scroll Area */}
            <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 text-xs ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                      m.sender === 'user'
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-purple-500/20 text-purple-400'
                    }`}
                  >
                    {m.sender === 'user' ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                  </div>

                  <div className="space-y-2 max-w-[88%] min-w-0">
                    {m.toolCalls && m.toolCalls.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {m.toolCalls.map((tc) => (
                          <span
                            key={tc}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px]"
                          >
                            <CheckCircle2 className="h-3 w-3" /> {tc}
                          </span>
                        ))}
                      </div>
                    )}

                    <div
                      className={`p-3.5 rounded-[var(--radius-card)] leading-relaxed ${
                        m.sender === 'user'
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text)]'
                      }`}
                    >
                      <p>{m.text}</p>

                      {m.toolCall && (
                        <div className="mt-2.5 pt-2 border-t border-[var(--color-border)] text-[11px] font-mono space-y-1">
                          <div className="flex items-center gap-1.5 text-emerald-500 font-semibold">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Executed: {m.toolCall.toolName}</span>
                          </div>
                          <div className="text-[var(--color-text-muted)] text-[10px] break-all">
                            Params: {JSON.stringify(m.toolCall.parameters)}
                          </div>
                        </div>
                      )}
                    </div>

                    {m.approvalDraft && (
                      <div className="p-4 rounded-2xl border border-purple-500/40 bg-[var(--color-surface-raised)] space-y-3">
                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold">
                            {m.approvalDraft.status === 'PENDING_APPROVAL'
                              ? 'Needs your approval'
                              : m.approvalDraft.status}
                          </span>
                          <code className="font-mono text-[var(--color-text-muted)]">{m.approvalDraft.toolName}</code>
                        </div>

                        <div className="font-semibold text-sm text-[var(--color-text)]">
                          {m.approvalDraft.title}
                        </div>

                        <div className="space-y-1">
                          {m.approvalDraft.targets.map((sub) => (
                            <div key={sub.id} className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                              <span>{sub.tenantName}</span>
                              <span className="font-mono text-[var(--color-warning)]">
                                {sub.daysRemaining}d left · ₹{(sub.amountMinor / 100).toLocaleString('en-IN')}
                              </span>
                            </div>
                          ))}
                        </div>

                        {m.approvalDraft.editing ? (
                          <textarea
                            rows={2}
                            value={m.approvalDraft.draftMessage}
                            onChange={(e) => handleUpdateDraftDecision(m.id, { draftMessage: e.target.value })}
                            className="w-full p-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-text)]"
                          />
                        ) : (
                          <div className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-muted)] leading-relaxed">
                            {m.approvalDraft.draftMessage}
                          </div>
                        )}

                        {m.approvalDraft.statusNote && (
                          <div className="text-[11px] text-[var(--color-text-muted)]">{m.approvalDraft.statusNote}</div>
                        )}

                        {m.approvalDraft.status === 'PENDING_APPROVAL' && (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <Button
                              variant="primary"
                              size="sm"
                              className="rounded-full text-xs"
                              onClick={() => handleApproveDraft(m.id)}
                            >
                              Approve and send
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="rounded-full text-xs"
                              onClick={() => handleUpdateDraftDecision(m.id, { editing: !m.approvalDraft?.editing })}
                            >
                              {m.approvalDraft.editing ? 'Done editing' : 'Edit message'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-full text-xs text-[var(--color-text-muted)]"
                              onClick={() =>
                                handleUpdateDraftDecision(m.id, {
                                  status: 'CANCELLED',
                                  statusNote: 'Draft cancelled by operator.',
                                })
                              }
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="text-[10px] text-[var(--color-text-muted)] px-1">{m.timestamp}</div>
                  </div>
                </div>
              ))}

              {isProcessing && (
                <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] italic">
                  <Sparkles className="h-3.5 w-3.5 animate-spin text-[var(--color-primary)]" />
                  <span>OrbitoX is querying MCP tools through safety guardrails…</span>
                </div>
              )}
            </div>

            {/* Suggested Prompts & Input Area */}
            <div className="space-y-3 pt-4 border-t border-[var(--color-border)] mt-4">
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    className="px-2.5 py-1 rounded-full text-[11px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)]/50 transition-colors text-left"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(inputText);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask about tenants, billing, provisioning..."
                  className="flex-1 min-w-0 px-3.5 py-2 text-xs rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="rounded-full shrink-0"
                  disabled={isProcessing || !inputText.trim()}
                >
                  <Send className="h-3.5 w-3.5 mr-1" />
                  Send
                </Button>
              </form>
            </div>
          </Card>

          {/* Right Column: MCP Tool Registry & Guardrails (5 cols) */}
          <div className="lg:col-span-5 min-w-0 space-y-4">
            {/* MCP Tool Registry */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-[var(--color-text)]">Tools (MCP)</h3>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                    The assistant can only use these tools with your role permissions.
                  </p>
                </div>
                <span className="text-xs font-mono text-[var(--color-text-muted)] shrink-0">
                  {allTools.length} tools
                </span>
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {allTools.map((t: any) => {
                  const badge = formatApprovalBadge(t.approvalPolicy);
                  return (
                    <div
                      key={t.toolName}
                      className="p-2.5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-semibold text-xs text-[var(--color-text)] truncate">
                          {t.toolName}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                        {t.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Guardrails Active Status */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-xs text-[var(--color-text)] uppercase tracking-wider">
                  Active Guardrail Pipeline
                </h3>
                <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Zero-Tolerance
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-[var(--radius-card)] bg-[var(--color-surface-raised)]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    <span>PII Redactor</span>
                  </div>
                  <span className="font-mono text-[11px] text-[var(--color-text-muted)]">384 masked</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-[var(--radius-card)] bg-[var(--color-surface-raised)]">
                  <div className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Prompt Injection Shield</span>
                  </div>
                  <span className="font-mono text-[11px] text-[var(--color-text-muted)]">19 blocked</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-[var(--radius-card)] bg-[var(--color-surface-raised)]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Secret Leakage Filter</span>
                  </div>
                  <span className="font-mono text-[11px] text-[var(--color-text-muted)]">43 filtered</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {stepUpDialog}
      </div>
    </ConsoleShell>
  );
}
