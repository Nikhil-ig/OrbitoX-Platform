'use client';

import * as React from 'react';
import Link from 'next/link';
import { ConsoleShell } from '../components/console-shell';
import { Card, Button } from '@orbitox-io/ui';
import {
  Sparkles,
  ShieldCheck,
  Send,
  User,
  CheckCircle2,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { useStepUpAuth } from '../components/step-up-modal';

interface ApprovalProposalView {
  id: string;
  toolName: string;
  approvalPolicy: 'ASK_FIRST' | 'STEP_UP_MFA';
  title: string;
  draftMessage: string;
  reasonInput?: string;
  targets: Array<{
    id: string;
    tenantName: string;
    daysRemaining: number | null;
    amountMinor: number;
  }>;
  status: 'PENDING_APPROVAL' | 'SUCCEEDED' | 'REJECTED' | 'FAILED';
  statusNote?: string;
  expiresAt?: string;
  editing?: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  toolCalls?: string[];
  approvalDraft?: ApprovalProposalView;
  toolCall?: {
    toolName: string;
    parameters: any;
    result?: any;
    status: 'EXECUTED' | 'BLOCKED' | 'PENDING_APPROVAL';
  };
  timestamp: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'assistant',
    text: 'Hello Operator. Connected to the OrbitoX MCP Gateway. All tools run against live PostgreSQL/domain services with server-enforced approvals and real guardrail auditing.',
    timestamp: 'Just now',
  },
];

const SUGGESTED_PROMPTS = [
  'Which restaurants are in their grace period this week? Remind the owners.',
  'Inspect runtime topology and PostgreSQL readiness',
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

function authHeaders(): Record<string, string> {
  const csrf = getCsrfToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (csrf) headers['x-csrf-token'] = csrf;
  return headers;
}

export default function ConsoleAskOrbitoXPage() {
  const { stepUpDialog, requestStepUpAuth } = useStepUpAuth();
  const [messages, setMessages] = React.useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [aiData, setAiData] = React.useState<any>(null);

  const loadAiInventory = React.useCallback(async () => {
    try {
      const res = await fetch('/api/v1/platform/ai');
      if (!res.ok) return;
      const json = await res.json();
      if (json?.success) setAiData(json.data);
    } catch (err) {
      console.error('Failed to load MCP inventory:', err);
    }
  }, []);

  React.useEffect(() => {
    loadAiInventory();
  }, [loadAiInventory]);

  const allTools = (aiData?.servers || []).flatMap((s: any) =>
    (s.tools || []).map((t: any) => ({ ...t, serverName: s.name, serverId: s.serverId })),
  );

  const pendingServerApprovals: any[] = aiData?.pendingApprovals || [];

  const updateDraft = (msgId: string, patch: Partial<ApprovalProposalView>) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.approvalDraft
          ? { ...m, approvalDraft: { ...m.approvalDraft, ...patch } }
          : m,
      ),
    );
  };

  const callMcpInvoke = async (
    toolName: string,
    parameters: Record<string, unknown>,
    promptContext?: string,
  ) => {
    const res = await fetch('/api/v1/platform/ai', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        toolName,
        parameters,
        ...(promptContext ? { promptContext } : {}),
        agentCaller: 'AskOrbitoX-Console-Session',
      }),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, json };
  };

  const executeApproveRequest = async (
    approvalId: string,
    policy: 'ASK_FIRST' | 'STEP_UP_MFA',
    editedMessage?: string,
    reason?: string,
  ): Promise<{ ok: boolean; data?: any; error?: string; needsReauth?: boolean }> => {
    if (policy === 'STEP_UP_MFA' && (!reason || reason.trim().length < 5)) {
      return { ok: false, error: 'A mandatory reason (at least 5 characters) is required for step-up actions.' };
    }

    const sendReq = async () => {
      const res = await fetch(`/api/v1/platform/ai/approvals/${encodeURIComponent(approvalId)}/approve`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          ...(editedMessage ? { editedMessage } : {}),
          ...(reason ? { reason: reason.trim() } : {}),
        }),
      });
      const json = await res.json().catch(() => ({}));
      return { res, json };
    };

    let attempt = await sendReq();
    if (attempt.res.status === 403 && attempt.json?.error?.code === 'REAUTH_REQUIRED') {
      const reauthed = await requestStepUpAuth();
      if (!reauthed) {
        return { ok: false, error: 'Step-up MFA verification cancelled.', needsReauth: true };
      }
      attempt = await sendReq();
    }

    if (!attempt.res.ok || !attempt.json?.success) {
      return {
        ok: false,
        error: attempt.json?.error?.message || `Approval execution failed (HTTP ${attempt.res.status})`,
      };
    }

    return { ok: true, data: attempt.json.data };
  };

  const handleApproveDraft = async (msgId: string) => {
    const targetMsg = messages.find((m) => m.id === msgId);
    const draft = targetMsg?.approvalDraft;
    if (!draft || draft.status !== 'PENDING_APPROVAL') return;

    const outcome = await executeApproveRequest(
      draft.id,
      draft.approvalPolicy,
      draft.draftMessage,
      draft.reasonInput,
    );

    if (!outcome.ok) {
      updateDraft(msgId, {
        status: outcome.needsReauth ? 'PENDING_APPROVAL' : 'FAILED',
        statusNote: outcome.error,
      });
      await loadAiInventory();
      return;
    }

    const queuedCount = outcome.data?.output?.queuedCount;
    updateDraft(msgId, {
      status: 'SUCCEEDED',
      statusNote:
        typeof queuedCount === 'number'
          ? `Server executed approval ${draft.id}: queued ${queuedCount} reminder email(s) into AccountEmailOutbox.`
          : `Server executed approval ${draft.id} cleanly (${outcome.data?.execution?.id || 'audited'}).`,
    });
    await loadAiInventory();
  };

  const handleRejectDraft = async (msgId: string, approvalId: string) => {
    const res = await fetch(`/api/v1/platform/ai/approvals/${encodeURIComponent(approvalId)}/reject`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ reason: 'Cancelled by operator in Ask OrbitoX' }),
    });
    const json = await res.json().catch(() => ({}));
    updateDraft(msgId, {
      status: res.ok && json?.success ? 'REJECTED' : 'FAILED',
      statusNote:
        res.ok && json?.success
          ? 'Proposal rejected and recorded in audit log.'
          : json?.error?.message || 'Rejection failed.',
    });
    await loadAiInventory();
  };

  const handleApprovePendingFromQueue = async (approval: any) => {
    const outcome = await executeApproveRequest(
      approval.id,
      approval.approvalPolicy === 'STEP_UP_MFA' ? 'STEP_UP_MFA' : 'ASK_FIRST',
      approval.editedMessage || undefined,
      approval.reason || 'Approved from pending queue',
    );
    setMessages((prev) => [
      ...prev,
      {
        id: `asst-q-${Date.now()}`,
        sender: 'assistant',
        text: outcome.ok
          ? `Executed queued approval \`${approval.toolName}\` (${approval.id}).`
          : `Could not execute approval \`${approval.id}\`: ${outcome.error}`,
        toolCalls: [approval.toolName],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    await loadAiInventory();
  };

  const handleSendMessage = async (userText: string) => {
    if (!userText.trim() || isProcessing) return;

    const cleanPrompt = userText.trim();
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: cleanPrompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsProcessing(true);

    const lower = cleanPrompt.toLowerCase();
    const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      // 1. Grace Period + Payment Reminder Workflow (Strictly 2-phase server approval)
      if (lower.includes('grace') || lower.includes('remind')) {
        const listRes = await callMcpInvoke(
          'billing.list_subscriptions',
          { status: 'grace' },
          cleanPrompt,
        );
        if (!listRes.ok || !listRes.json?.success) {
          throw new Error(listRes.json?.error?.message || `MCP call refused (HTTP ${listRes.status})`);
        }

        const graceSubs: Array<{
          id: string;
          tenantName: string;
          daysRemaining: number | null;
          amountMinor: number;
        }> = listRes.json?.data?.output?.subscriptions || [];

        if (graceSubs.length === 0) {
          setMessages((prev) => [
            ...prev,
            {
              id: `asst-${Date.now()}`,
              sender: 'assistant',
              toolCalls: ['billing.list_subscriptions'],
              text: 'No subscriptions are currently flagged in grace period in PostgreSQL.',
              toolCall: {
                toolName: 'billing.list_subscriptions',
                parameters: { status: 'grace' },
                result: listRes.json.data.output,
                status: 'EXECUTED',
              },
              timestamp: nowTime(),
            },
          ]);
          await loadAiInventory();
          return;
        }

        const firstName = graceSubs[0]?.tenantName || 'the organization';
        const firstAmt = `₹${((graceSubs[0]?.amountMinor || 0) / 100).toLocaleString('en-IN')}`;
        const defaultDraft = `Your OrbitoX payment of ${firstAmt} for ${firstName} requires an updated payment method within ${graceSubs[0]?.daysRemaining ?? 7} days to keep ordering active.`;

        const proposeRes = await callMcpInvoke(
          'billing.send_payment_reminder',
          {
            subscriptionIds: graceSubs.map((s) => s.id),
            customMessage: defaultDraft,
          },
          cleanPrompt,
        );
        if (!proposeRes.ok || !proposeRes.json?.success) {
          throw new Error(proposeRes.json?.error?.message || `Proposal refused (HTTP ${proposeRes.status})`);
        }

        const serverApproval = proposeRes.json.data.approval;
        setMessages((prev) => [
          ...prev,
          {
            id: `asst-${Date.now()}`,
            sender: 'assistant',
            toolCalls: ['billing.list_subscriptions', 'billing.send_payment_reminder (PROPOSED)'],
            text: `Found ${graceSubs.length} grace-period subscription(s) in PostgreSQL and created durable approval proposal \`${serverApproval.id}\`. Nothing will be queued until you approve below.`,
            approvalDraft: {
              id: serverApproval.id,
              toolName: serverApproval.toolName,
              approvalPolicy: 'ASK_FIRST',
              title: `Email ${graceSubs.length} owner(s) a payment reminder`,
              targets: graceSubs,
              draftMessage: serverApproval.editedMessage || defaultDraft,
              status: 'PENDING_APPROVAL',
              expiresAt: serverApproval.expiresAt,
            },
            timestamp: nowTime(),
          },
        ]);
        await loadAiInventory();
        return;
      }

      // 2. NEVER_AI guard verification
      if (lower.includes('erase') || lower.includes('purge')) {
        const eraseRes = await callMcpInvoke(
          'data_rights.erase',
          { requestId: 'req_ai_check' },
          cleanPrompt,
        );
        setMessages((prev) => [
          ...prev,
          {
            id: `asst-${Date.now()}`,
            sender: 'assistant',
            toolCalls: ['data_rights.erase (BLOCKED)'],
            text:
              eraseRes.json?.error?.message ||
              'Blocked by NEVER_AI policy and persisted to PostgreSQL audit logs.',
            toolCall: {
              toolName: 'data_rights.erase',
              parameters: { requestId: 'req_ai_check' },
              result: eraseRes.json?.error || eraseRes.json,
              status: 'BLOCKED',
            },
            timestamp: nowTime(),
          },
        ]);
        await loadAiInventory();
        return;
      }

      // 3. Tenant Suspension Proposal (STEP_UP_MFA)
      if (lower.includes('suspend')) {
        const words = cleanPrompt.split(/\s+/);
        const targetCandidate = words.find((w) => /^(proj_|tenant_|[a-z0-9-]+-[a-z0-9-]+)$/.test(w)) || words[words.length - 1] || '';
        const proposeRes = await callMcpInvoke(
          'tenants.suspend',
          { idOrSlug: targetCandidate, reason: 'Operator requested suspension via Ask OrbitoX' },
          cleanPrompt,
        );
        if (!proposeRes.ok || !proposeRes.json?.success) {
          throw new Error(proposeRes.json?.error?.message || `Proposal refused (HTTP ${proposeRes.status})`);
        }
        const ap = proposeRes.json.data.approval;
        setMessages((prev) => [
          ...prev,
          {
            id: `asst-${Date.now()}`,
            sender: 'assistant',
            toolCalls: ['tenants.suspend (STEP_UP_MFA PROPOSED)'],
            text: `Created step-up MFA suspension proposal \`${ap.id}\`. Password + 6-digit TOTP verification and a mandatory reason are required to execute.`,
            approvalDraft: {
              id: ap.id,
              toolName: ap.toolName,
              approvalPolicy: 'STEP_UP_MFA',
              title: ap.previewSummary,
              targets: [],
              draftMessage: ap.previewSummary,
              reasonInput: 'Operator requested suspension via Ask OrbitoX',
              status: 'PENDING_APPROVAL',
              expiresAt: ap.expiresAt,
            },
            timestamp: nowTime(),
          },
        ]);
        await loadAiInventory();
        return;
      }

      // 4. Provisioning Retry Proposal (ASK_FIRST)
      if (lower.includes('retry')) {
        const opMatch = cleanPrompt.match(/\b(op_[a-zA-Z0-9_-]+|c[a-z0-9]{20,})\b/);
        const opId = opMatch ? opMatch[1]! : '';
        if (!opId) {
          throw new Error('Specify a provisioning operationId (e.g. "retry op_123...") to propose a retry.');
        }
        const proposeRes = await callMcpInvoke(
          'provisioning.retry',
          { operationId: opId },
          cleanPrompt,
        );
        if (!proposeRes.ok || !proposeRes.json?.success) {
          throw new Error(proposeRes.json?.error?.message || `Proposal refused (HTTP ${proposeRes.status})`);
        }
        const ap = proposeRes.json.data.approval;
        setMessages((prev) => [
          ...prev,
          {
            id: `asst-${Date.now()}`,
            sender: 'assistant',
            toolCalls: ['provisioning.retry (PROPOSED)'],
            text: `Created provisioning retry proposal \`${ap.id}\`. Approve below to re-run the saga idempotently.`,
            approvalDraft: {
              id: ap.id,
              toolName: ap.toolName,
              approvalPolicy: 'ASK_FIRST',
              title: ap.previewSummary,
              targets: [],
              draftMessage: ap.previewSummary,
              status: 'PENDING_APPROVAL',
              expiresAt: ap.expiresAt,
            },
            timestamp: nowTime(),
          },
        ]);
        await loadAiInventory();
        return;
      }

      // 5. READ_FREELY Verified Diagnostic Tools
      let targetTool = 'kernel_inspect_environment';
      let params: Record<string, unknown> = {};

      if (lower.includes('signature') || lower.includes('verify') || lower.includes('package')) {
        targetTool = 'kernel_crypto_verify';
        const pkgMatch = cleanPrompt.match(/@orbitox(?:-io)?\/[a-z0-9-]+/i);
        params = { packageId: pkgMatch ? pkgMatch[0] : '@orbitox/restaurant' };
      } else if (lower.includes('triage') || lower.includes('hospital') || lower.includes('clinical') || lower.includes('bed')) {
        targetTool = lower.includes('bed') ? 'hms_read_beds' : 'hms_triage_score';
        // Resolve an explicit active HMS tenant first via MCP tenants.search / get
        const tenantSearch = await callMcpInvoke('tenants.search / get', { status: 'ACTIVE', limit: 25 });
        const candidates: any[] = tenantSearch.json?.data?.output?.items || [];
        const hmsTenant = candidates.find((c) =>
          [...(c.installedPlugins || []), ...(c.enabledServices || [])].some((s: string) =>
            s.toLowerCase().includes('hms'),
          ),
        );
        if (!hmsTenant) {
          throw new Error('No active HMS-enabled tenant found in PostgreSQL. Provision a HospitalOS tenant first.');
        }
        params = { tenantId: hmsTenant.id };
      } else if (lower.includes('schema') || lower.includes('database') || lower.includes('db')) {
        targetTool = 'db_read_schema';
        params = { modelFilter: 'all_sanitized' };
      } else if (lower.includes('tenant')) {
        targetTool = 'tenants.search / get';
        params = { limit: 10 };
      } else {
        const explicitEnv = cleanPrompt.match(/\b(env[-_][a-z0-9-]+)\b/i);
        if (explicitEnv) params = { environmentId: explicitEnv[1] };
      }

      const res = await callMcpInvoke(targetTool, params, cleanPrompt);
      if (!res.ok || !res.json?.success) {
        throw new Error(res.json?.error?.message || `MCP execution refused (HTTP ${res.status})`);
      }

      const output = res.json.data.output;
      let replyText = '';
      if (targetTool === 'kernel_inspect_environment') {
        replyText = output?.environment
          ? `Environment \`${output.environment.name}\` (${output.environment.status}) inspected. PostgreSQL probe latency: ${output.dbProbeLatencyMs}ms.`
          : `Inspected PostgreSQL fleet topology (${output?.environmentsTotal ?? 0} environments, ${output?.activeProjects ?? 0} active projects, DB probe ${output?.dbProbeLatencyMs ?? 0}ms).`;
      } else if (targetTool === 'kernel_crypto_verify') {
        replyText = `Package \`${output.packageId}\` (${output.versionEvaluated || 'latest'}): ${output.integrityStatus}${output.verifiedAlgorithm ? ` via ${output.verifiedAlgorithm}` : ''}.`;
      } else if (targetTool === 'hms_triage_score') {
        replyText = `HospitalOS triage census for \`${output.projectName}\`: ${output.totalActivePatients} active anonymized patient record(s) across ${output.triageDistribution?.length ?? 0} triage level(s).`;
      } else if (targetTool === 'hms_read_beds') {
        replyText = `HospitalOS bed capacity for \`${output.projectName}\`: ${output.summary?.availableBeds ?? 0}/${output.summary?.totalBeds ?? 0} bed(s) available (${output.summary?.occupiedBeds ?? 0} occupied).`;
      } else if (targetTool === 'db_read_schema') {
        replyText = `Returned ${output.modelsCount} allowlisted schema definitions from compiled Prisma DMMF with sensitive/PHI columns stripped.`;
      } else {
        replyText = `MCP tool \`${targetTool}\` completed against PostgreSQL.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          text: replyText,
          toolCalls: [targetTool],
          toolCall: {
            toolName: targetTool,
            parameters: params,
            result: output,
            status: 'EXECUTED',
          },
          timestamp: nowTime(),
        },
      ]);
      await loadAiInventory();
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `asst-err-${Date.now()}`,
          sender: 'assistant',
          text: `MCP Gateway refused or failed request: ${err?.message || 'Unknown error'}`,
          timestamp: nowTime(),
        },
      ]);
      await loadAiInventory();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ConsoleShell activeId="ai-assistant">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <Link href="/console/overview" className="hover:text-[var(--color-text)] transition-colors">
            Overview
          </Link>
          <span>/</span>
          <span className="font-semibold text-[var(--color-text)]">Ask OrbitoX</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text)]">
                Ask OrbitoX
              </h1>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
                Server-Enforced MCP · PostgreSQL Audited
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                {aiData?.executionEnabled === false ? 'MCP Execution Paused' : 'Guardrails Live'}
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Every diagnostic read, durable two-phase approval, and step-up MFA mutation runs directly through verified OrbitoX services.
            </p>
          </div>
        </div>

        {pendingServerApprovals.length > 0 && (
          <Card className="p-4 border border-purple-500/40 bg-purple-500/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-text)] flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-purple-400" />
                {pendingServerApprovals.length} Pending MCP Approval(s) in PostgreSQL
              </span>
            </div>
            <div className="space-y-2">
              {pendingServerApprovals.map((ap: any) => (
                <div key={ap.id} className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold text-[var(--color-text)]">{ap.previewSummary}</div>
                    <div className="text-[11px] font-mono text-[var(--color-text-muted)]">
                      {ap.toolName} · {ap.approvalPolicy} · requested by {ap.requestedByEmail || ap.requestedById} · expires {new Date(ap.expiresAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="primary"
                      className="rounded-full text-xs"
                      onClick={() => handleApprovePendingFromQueue(ap)}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px] min-w-0">
          <Card className="lg:col-span-7 min-w-0 overflow-hidden flex flex-col justify-between p-5 border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="space-y-4 overflow-y-auto max-h-[540px] pr-2">
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
                        <div className="mt-2.5 pt-2 border-t border-[var(--color-border)] text-[11px] font-mono space-y-1.5">
                          <div className="flex items-center gap-1.5 text-emerald-500 font-semibold">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>
                              {m.toolCall.status === 'BLOCKED' ? 'Blocked' : 'Executed'}: {m.toolCall.toolName}
                            </span>
                          </div>
                          <div className="text-[var(--color-text-muted)] text-[10px] break-all">
                            Params: {JSON.stringify(m.toolCall.parameters)}
                          </div>
                          {m.toolCall.result && (
                            <pre className="p-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[10px] text-[var(--color-text)] overflow-x-auto max-h-44">
                              {JSON.stringify(m.toolCall.result, null, 2)}
                            </pre>
                          )}
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
                          <span className="text-[10px] text-[var(--color-text-muted)]">({m.approvalDraft.id})</span>
                        </div>

                        <div className="font-semibold text-sm text-[var(--color-text)]">
                          {m.approvalDraft.title}
                        </div>

                        {m.approvalDraft.targets.length > 0 && (
                          <div className="space-y-1">
                            {m.approvalDraft.targets.map((sub) => (
                              <div key={sub.id} className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                                <span>{sub.tenantName}</span>
                                <span className="font-mono text-[var(--color-warning)]">
                                  {sub.daysRemaining !== null ? `${sub.daysRemaining}d left · ` : ''}₹{(sub.amountMinor / 100).toLocaleString('en-IN')}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {m.approvalDraft.approvalPolicy === 'STEP_UP_MFA' && (
                          <input
                            type="text"
                            value={m.approvalDraft.reasonInput || ''}
                            onChange={(e) => updateDraft(m.id, { reasonInput: e.target.value })}
                            placeholder="Mandatory audit reason (min 5 characters)"
                            className="w-full px-3 py-1.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-text)]"
                          />
                        )}

                        {m.approvalDraft.editing ? (
                          <textarea
                            rows={2}
                            value={m.approvalDraft.draftMessage}
                            onChange={(e) => updateDraft(m.id, { draftMessage: e.target.value })}
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
                              {m.approvalDraft.approvalPolicy === 'STEP_UP_MFA' ? 'Verify MFA & Execute' : 'Approve and send'}
                            </Button>
                            {m.approvalDraft.approvalPolicy === 'ASK_FIRST' && (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="rounded-full text-xs"
                                onClick={() => updateDraft(m.id, { editing: !m.approvalDraft?.editing })}
                              >
                                {m.approvalDraft.editing ? 'Done editing' : 'Edit message'}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-full text-xs text-[var(--color-text-muted)]"
                              onClick={() => handleRejectDraft(m.id, m.approvalDraft!.id)}
                            >
                              Reject
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
                  <span>Executing MCP request through server guardrails…</span>
                </div>
              )}
            </div>

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
                  placeholder="Ask about tenants, grace billing, verification..."
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

          <div className="lg:col-span-5 min-w-0 space-y-4">
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-[var(--color-text)]">Tools (MCP)</h3>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                    Server-enforced capabilities & PostgreSQL invocation counts.
                  </p>
                </div>
                <span className="text-xs font-mono text-[var(--color-text-muted)] shrink-0">
                  {allTools.length} tools
                </span>
              </div>

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
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
                      <div className="flex items-center justify-between text-[10px] font-mono text-[var(--color-text-muted)]">
                        <span>{t.invocationsCount ?? 0} DB invocation(s)</span>
                        <span>avg {t.averageLatencyMs ?? 0}ms</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-xs text-[var(--color-text)] uppercase tracking-wider">
                  Live Guardrail Pipeline (DB Telemetry)
                </h3>
                <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {aiData?.guardrails?.totalRecordedInvocations ?? 0} total logged
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-[var(--radius-card)] bg-[var(--color-surface-raised)]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    <span>PII Redactor</span>
                  </div>
                  <span className="font-mono text-[11px] text-[var(--color-text-muted)]">
                    {aiData?.guardrails?.piiRedaction?.totalRedactions ?? 0} masked
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-[var(--radius-card)] bg-[var(--color-surface-raised)]">
                  <div className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Prompt Injection Shield</span>
                  </div>
                  <span className="font-mono text-[11px] text-[var(--color-text-muted)]">
                    {aiData?.guardrails?.promptInjectionShield?.injectionsBlocked ?? 0} blocked
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-[var(--radius-card)] bg-[var(--color-surface-raised)]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Secret Leakage Filter</span>
                  </div>
                  <span className="font-mono text-[11px] text-[var(--color-text-muted)]">
                    {aiData?.guardrails?.secretLeakageFilter?.secretsFiltered ?? 0} filtered
                  </span>
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
