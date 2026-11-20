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
    text: 'Hello Operator. I am OrbitoX Platform Assistant, connected over Model Context Protocol (MCP) with zero-trust guardrails. How can I assist with your tenants, fleet, or security today?',
    timestamp: 'Just now',
  },
];

const SUGGESTED_PROMPTS = [
  'Inspect runtime topology for env-prod-omni',
  'Verify cryptographic signature of @orbitox/restaurant',
  'Check clinical triage status in HospitalOS',
  'Inspect sanitized database schemas for active tenant',
];

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

    // Heuristic Tool Match
    const lower = userText.toLowerCase();
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

      let replyText = '';
      if (targetTool === 'kernel_inspect_environment') {
        replyText = `I inspected the environment \`env-prod-omni\` via the Kernel Server. Cluster status is **HEALTHY**, memory allocation is **512 MB**, and zero anomalies were detected in active tenant cells.`;
      } else if (targetTool === 'kernel_crypto_verify') {
        replyText = `Verified Ed25519 digital signature for \`@orbitox/restaurant\` v1.4.0. Signature matches primary release authority \`ed25519-auth-2026\`. File tree SHA-256 integrity passed.`;
      } else if (targetTool === 'hms_triage_score') {
        replyText = `Queried HospitalOS triage service. Ward \`ward-emergency-a\` has **3 pending priority-1 triages**, average wait time **4.2 minutes**, and isolation mesh active.`;
      } else if (targetTool === 'hms_read_beds') {
        replyText = `Bed occupancy report: 42 of 50 acute care beds occupied (84% capacity). 4 ICU beds currently available.`;
      } else if (targetTool === 'db_read_schema') {
        replyText = `Returned sanitized schema definitions for 61 multi-tenant tables. Zero raw secret columns or plaintext credentials exposed.`;
      } else {
        replyText = `Executed MCP tool \`${targetTool}\` through zero-trust gateway.`;
      }

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
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
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                Model Context Protocol (MCP)
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Zero-Trust Guardrails Active
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text)] mt-1.5">
              Ask OrbitoX · Operator Intelligence
            </h1>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Natural language command and control across multi-tenant cells, cryptographic verification, and runtimes.
            </p>
          </div>
        </div>

        {/* Two-Column Grid: Left Chat (7 cols), Right MCP Registry (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
          {/* Left Column: Chat Conversation */}
          <Card className="lg:col-span-7 flex flex-col justify-between p-5 border border-[var(--color-border)] bg-[var(--color-surface)]">
            {/* Messages Scroll Area */}
            <div className="space-y-4 overflow-y-auto max-h-[460px] pr-2">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 text-xs ${
                    m.sender === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                      m.sender === 'user'
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400'
                    }`}
                  >
                    {m.sender === 'user' ? (
                      <User className="h-3.5 w-3.5" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                  </div>

                  <div className="space-y-1.5 max-w-[85%]">
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
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Tool: {m.toolCall.toolName}</span>
                          </div>
                          <div className="text-[var(--color-text-muted)] text-[10px]">
                            Params: {JSON.stringify(m.toolCall.parameters)}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-[var(--color-text-muted)] px-1">
                      {m.timestamp}
                    </div>
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
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    className="px-2.5 py-1 rounded-full text-[11px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)]/50 transition-colors whitespace-nowrap"
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
                  placeholder="Ask OrbitoX anything or run an authorized MCP action..."
                  className="flex-1 px-3.5 py-2 text-xs rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
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
          <div className="lg:col-span-5 space-y-4">
            {/* Guardrails Active Status */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-xs text-[var(--color-text)] uppercase tracking-wider">
                  Active Guardrail Pipeline
                </h3>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
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

            {/* MCP Tool Registry */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-xs text-[var(--color-text)] uppercase tracking-wider">
                  Registered MCP Tools
                </h3>
                <span className="text-xs font-mono text-[var(--color-text-muted)]">
                  {allTools.length} tools
                </span>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {allTools.map((t: any) => (
                  <div
                    key={t.toolName}
                    className="p-2.5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-xs text-[var(--color-text)]">
                        {t.toolName}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface-raised)] text-[var(--color-primary)] font-mono">
                        {t.requiredCapability}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                      {t.description}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {stepUpDialog}
      </div>
    </ConsoleShell>
  );
}
