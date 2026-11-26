import 'server-only';
import { prisma } from '@/server/db/prisma';
import { platformRepository } from '@/server/db/platform-repository';
import { operatorRoleAllows } from '@/server/organizations/operator-route-policy';
import {
  findMcpTool,
  getMcpServerDescriptors,
  MCP_TOOLS,
  McpToolError,
  type McpActorContext,
} from './mcp-tools';
import {
  canonicalJsonHash,
  redactSensitiveData,
  scanPromptInjection,
} from './mcp-guardrails';

const APPROVAL_TTL_MS = 15 * 60 * 1000;
const STEP_UP_MAX_AGE_MS = 5 * 60 * 1000;

function hasApiKeyCapability(capabilities: string[], requiredCapability: string): boolean {
  if (capabilities.includes('*') || capabilities.includes('admin')) return true;
  if (capabilities.includes(requiredCapability)) return true;
  const prefix = requiredCapability.split('.').slice(0, 2).join('.');
  return Boolean(prefix && capabilities.includes(`${prefix}.*`));
}

function authorizeToolAccess(actor: McpActorContext, minRole: any, requiredCapability: string): void {
  if (actor.kind === 'operator') {
    if (!operatorRoleAllows(actor.role, minRole)) {
      throw new McpToolError(
        403,
        'FORBIDDEN',
        `Operator role [${actor.role}] lacks privilege for this MCP tool (requires ${minRole}).`,
      );
    }
    return;
  }

  if (!hasApiKeyCapability(actor.capabilities, requiredCapability)) {
    throw new McpToolError(
      403,
      'INSUFFICIENT_SCOPES',
      `API key lacks required capability [${requiredCapability}].`,
    );
  }
}

function buildCallerAgent(actor: McpActorContext, clientLabel?: unknown): string {
  const safeSuffix =
    typeof clientLabel === 'string'
      ? clientLabel.replace(/[^a-zA-Z0-9_.\-]/g, '').slice(0, 32)
      : '';
  const base = actor.kind === 'operator' ? `operator:${actor.actorEmail}` : `api_key:${actor.actorId}`;
  return safeSuffix ? `${base} (${safeSuffix})` : base;
}

async function recordInvocationAndAudit(input: {
  approvalId?: string;
  toolName: string;
  serverId: string;
  approvalPolicy: string;
  status: string;
  actor: McpActorContext;
  callerAgent: string;
  tenantScope: string;
  sanitizedParams: unknown;
  redactedOutput?: unknown;
  errorCode?: string;
  errorMessage?: string;
  latencyMs: number;
  redactionsApplied: number;
  injectionBlocked?: boolean;
  secretsFiltered: number;
  auditAction: string;
  auditReason: string;
}) {
  const auditEventId = await platformRepository
    .recordPlatformAdminAudit({
      action: input.auditAction,
      entityType: 'MCP_TOOL',
      entityId: input.toolName,
      actorId: input.actor.actorId,
      actorEmail: input.actor.actorEmail,
      reason: input.auditReason,
      metadata: {
        approvalId: input.approvalId || null,
        toolName: input.toolName,
        serverId: input.serverId,
        approvalPolicy: input.approvalPolicy,
        status: input.status,
        tenantScope: input.tenantScope,
        latencyMs: input.latencyMs,
        redactionsApplied: input.redactionsApplied,
        secretsFiltered: input.secretsFiltered,
        injectionBlocked: Boolean(input.injectionBlocked),
        ...(input.errorCode ? { errorCode: input.errorCode } : {}),
      } as any,
    })
    .catch(() => null);

  const invocation = await prisma.mcpToolInvocation.create({
    data: {
      approvalId: input.approvalId || null,
      toolName: input.toolName,
      serverId: input.serverId,
      approvalPolicy: input.approvalPolicy,
      status: input.status,
      actorId: input.actor.actorId,
      actorEmail: input.actor.actorEmail,
      authType: input.actor.kind,
      callerAgent: input.callerAgent,
      tenantScope: input.tenantScope,
      sanitizedParams: input.sanitizedParams as any,
      redactedOutput: (input.redactedOutput ?? undefined) as any,
      errorCode: input.errorCode || null,
      errorMessage: input.errorMessage || null,
      latencyMs: input.latencyMs,
      redactionsApplied: input.redactionsApplied,
      injectionBlocked: Boolean(input.injectionBlocked),
      secretsFiltered: input.secretsFiltered,
      auditEventId: auditEventId || null,
    },
  });

  return invocation;
}

export async function getMcpGatewayInventory(operatorId?: string) {
  const now = new Date();
  const [recentExecutions, pendingApprovals, perToolStats, aggTotals, blockedInjectionCount] =
    await Promise.all([
      prisma.mcpToolInvocation.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.mcpToolApproval.findMany({
        where: {
          status: 'PROPOSED',
          expiresAt: { gt: now },
          ...(operatorId ? { requestedById: operatorId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.mcpToolInvocation.groupBy({
        by: ['toolName'],
        _count: { _all: true },
        _avg: { latencyMs: true },
      }),
      prisma.mcpToolInvocation.aggregate({
        _count: { _all: true },
        _sum: { redactionsApplied: true, secretsFiltered: true },
      }),
      prisma.mcpToolInvocation.count({
        where: { injectionBlocked: true },
      }),
    ]);

  const statByTool = new Map(
    perToolStats.map((s) => [
      s.toolName,
      {
        invocationsCount: s._count._all,
        averageLatencyMs: Math.round(s._avg.latencyMs || 0),
      },
    ]),
  );

  const servers = getMcpServerDescriptors().map((srv) => ({
    ...srv,
    tools: srv.tools.map((t) => {
      const stats = statByTool.get(t.toolName);
      return {
        ...t,
        invocationsCount: stats?.invocationsCount ?? 0,
        averageLatencyMs: stats?.averageLatencyMs ?? 0,
      };
    }),
  }));

  return {
    executionEnabled: process.env.ORBITOX_MCP_EXECUTION_ENABLED !== 'false',
    servers,
    guardrails: {
      piiRedaction: {
        enabled: true,
        patterns: ['Email', 'Credit Card (Luhn)', 'Phone Number (E.164)', 'Private Key / Secret Token'],
        totalRedactions: aggTotals._sum.redactionsApplied ?? 0,
      },
      promptInjectionShield: {
        enabled: true,
        mode: 'Zero-Tolerance Heuristic Filter',
        injectionsBlocked: blockedInjectionCount,
      },
      secretLeakageFilter: {
        enabled: true,
        mode: 'CSPRNG Secret & Private Key Redactor',
        secretsFiltered: aggTotals._sum.secretsFiltered ?? 0,
      },
      telemetrySource: 'postgresql_live',
      totalRecordedInvocations: aggTotals._count._all,
    },
    recentExecutions,
    pendingApprovals,
    pendingApprovalsCount: pendingApprovals.length,
    totalToolsRegistered: MCP_TOOLS.length,
    activeGatewaysCount: servers.length,
  };
}

export async function invokeMcpTool(
  input: {
    toolName?: unknown;
    parameters?: unknown;
    promptContext?: unknown;
    agentCaller?: unknown;
  },
  actor: McpActorContext,
) {
  const startedAt = performance.now();

  if (process.env.ORBITOX_MCP_EXECUTION_ENABLED === 'false') {
    throw new McpToolError(
      503,
      'MCP_EXECUTION_DISABLED',
      'MCP tool execution is temporarily disabled by ORBITOX_MCP_EXECUTION_ENABLED=false.',
    );
  }

  const toolName = typeof input.toolName === 'string' ? input.toolName.trim() : '';
  if (!toolName) {
    throw new McpToolError(400, 'INVALID_INPUT', 'toolName is required.');
  }

  const tool = findMcpTool(toolName);
  if (!tool) {
    throw new McpToolError(
      404,
      'TOOL_NOT_FOUND',
      `MCP tool ${toolName} is not registered in server inventory.`,
    );
  }

  if (!tool.available) {
    throw new McpToolError(
      501,
      'TOOL_UNAVAILABLE',
      `MCP tool ${toolName} is currently unavailable in this deployment.`,
    );
  }

  const callerAgent = buildCallerAgent(actor, input.agentCaller);
  const rawParams = input.parameters && typeof input.parameters === 'object' ? input.parameters : {};
  const redactedInput = redactSensitiveData(rawParams, { maskEmails: true });
  const initialTenantScope =
    typeof (rawParams as any).tenantId === 'string'
      ? String((rawParams as any).tenantId).trim() || 'unscoped'
      : typeof (rawParams as any).idOrSlug === 'string'
        ? String((rawParams as any).idOrSlug).trim() || 'unscoped'
        : tool.tenantScopeMode === 'PLATFORM_GLOBAL'
          ? 'platform'
          : 'unscoped';

  // 1. NEVER_AI must fail closed AND persist durable audit trail
  if (tool.approvalPolicy === 'NEVER_AI') {
    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
    const message = `${tool.toolName} is marked NEVER_AI and cannot be invoked by the AI assistant.`;
    await recordInvocationAndAudit({
      toolName: tool.toolName,
      serverId: tool.serverId,
      approvalPolicy: tool.approvalPolicy,
      status: 'BLOCKED_POLICY',
      actor,
      callerAgent,
      tenantScope: initialTenantScope,
      sanitizedParams: redactedInput.value,
      errorCode: 'TOOL_POLICY_BLOCKED',
      errorMessage: message,
      latencyMs,
      redactionsApplied: redactedInput.redactionsApplied,
      secretsFiltered: redactedInput.secretsFiltered,
      auditAction: 'MCP_TOOL_POLICY_BLOCKED',
      auditReason: `Blocked NEVER_AI invocation attempt for ${tool.toolName}`,
    });
    throw new McpToolError(403, 'TOOL_POLICY_BLOCKED', message);
  }

  // 2. Role / Capability authorization
  try {
    authorizeToolAccess(actor, tool.minRole, tool.requiredCapability);
  } catch (err: any) {
    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
    await recordInvocationAndAudit({
      toolName: tool.toolName,
      serverId: tool.serverId,
      approvalPolicy: tool.approvalPolicy,
      status: 'BLOCKED_FORBIDDEN',
      actor,
      callerAgent,
      tenantScope: initialTenantScope,
      sanitizedParams: redactedInput.value,
      errorCode: err?.code || 'FORBIDDEN',
      errorMessage: err?.message || 'Forbidden',
      latencyMs,
      redactionsApplied: redactedInput.redactionsApplied,
      secretsFiltered: redactedInput.secretsFiltered,
      auditAction: 'MCP_TOOL_FORBIDDEN',
      auditReason: `Denied unauthorized invocation of ${tool.toolName}`,
    });
    throw err;
  }

  // 3. Prompt injection shield on parameters + optional prompt context
  const injectionCheck = scanPromptInjection({
    parameters: rawParams,
    promptContext: input.promptContext,
  });
  if (injectionCheck.blocked) {
    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
    const msg = `Prompt injection / unsafe escape pattern detected (${injectionCheck.matches.join(', ')}).`;
    await recordInvocationAndAudit({
      toolName: tool.toolName,
      serverId: tool.serverId,
      approvalPolicy: tool.approvalPolicy,
      status: 'BLOCKED_INJECTION',
      actor,
      callerAgent,
      tenantScope: initialTenantScope,
      sanitizedParams: redactedInput.value,
      errorCode: 'PROMPT_INJECTION_BLOCKED',
      errorMessage: msg,
      latencyMs,
      redactionsApplied: redactedInput.redactionsApplied,
      injectionBlocked: true,
      secretsFiltered: redactedInput.secretsFiltered,
      auditAction: 'MCP_TOOL_INJECTION_BLOCKED',
      auditReason: msg,
    });
    throw new McpToolError(403, 'PROMPT_INJECTION_BLOCKED', msg);
  }

  // 4. Schema & explicit tenant scope validation
  if (tool.tenantScopeMode === 'EXPLICIT_TENANT') {
    const explicitTarget =
      typeof (rawParams as any).tenantId === 'string'
        ? (rawParams as any).tenantId.trim()
        : typeof (rawParams as any).idOrSlug === 'string'
          ? (rawParams as any).idOrSlug.trim()
          : '';
    if (!explicitTarget || explicitTarget === 'global') {
      throw new McpToolError(
        400,
        'TENANT_SCOPE_REQUIRED',
        `Tool ${tool.toolName} requires an explicit tenantId or project slug and cannot run in global scope.`,
      );
    }
  }

  const parsed = tool.schema.safeParse(rawParams);
  if (!parsed.success) {
    throw new McpToolError(400, 'INVALID_INPUT', 'Tool parameters failed schema validation.', {
      issues: parsed.error.issues.map((i) => `${i.path.join('.') || 'root'}: ${i.message}`),
    });
  }

  // 5. Enforce ASK_FIRST and STEP_UP_MFA via persistent server-side proposal
  if (tool.approvalPolicy === 'ASK_FIRST' || tool.approvalPolicy === 'STEP_UP_MFA') {
    if (actor.kind !== 'operator') {
      throw new McpToolError(
        403,
        'OPERATOR_SESSION_REQUIRED',
        `${tool.toolName} (${tool.approvalPolicy}) requires an interactive authenticated operator approval.`,
      );
    }

    const proposalMeta = tool.validateProposal
      ? await tool.validateProposal(parsed.data, actor)
      : {
          previewSummary: `Execute ${tool.toolName} after operator approval.`,
          tenantScope: initialTenantScope,
        };

    const paramsHash = canonicalJsonHash({
      toolName: tool.toolName,
      params: parsed.data,
    });

    const sanitizedProposalParams = redactSensitiveData(parsed.data, { maskEmails: true });
    const approval = await prisma.mcpToolApproval.create({
      data: {
        toolName: tool.toolName,
        serverId: tool.serverId,
        approvalPolicy: tool.approvalPolicy,
        status: 'PROPOSED',
        paramsHash,
        sanitizedParams: parsed.data as any,
        previewSummary: proposalMeta.previewSummary,
        editedMessage:
          typeof (parsed.data as any).customMessage === 'string'
            ? (parsed.data as any).customMessage
            : null,
        reason: typeof (parsed.data as any).reason === 'string' ? (parsed.data as any).reason : null,
        tenantScope: proposalMeta.tenantScope,
        requestedById: actor.actorId,
        requestedByEmail: actor.actorEmail,
        expiresAt: new Date(Date.now() + APPROVAL_TTL_MS),
      },
    });

    await platformRepository
      .recordPlatformAdminAudit({
        action: 'MCP_APPROVAL_PROPOSED',
        entityType: 'MCP_APPROVAL',
        entityId: approval.id,
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        reason: proposalMeta.previewSummary,
        metadata: {
          toolName: tool.toolName,
          approvalPolicy: tool.approvalPolicy,
          tenantScope: proposalMeta.tenantScope,
          sanitizedParams: sanitizedProposalParams.value,
          paramsHash,
        } as any,
      })
      .catch(() => null);

    return {
      kind: 'approval_required' as const,
      status: 202,
      approval: {
        id: approval.id,
        toolName: approval.toolName,
        serverId: approval.serverId,
        approvalPolicy: approval.approvalPolicy,
        status: approval.status,
        previewSummary: approval.previewSummary,
        editedMessage: approval.editedMessage,
        tenantScope: approval.tenantScope,
        expiresAt: approval.expiresAt.toISOString(),
        sanitizedParams: sanitizedProposalParams.value,
      },
    };
  }

  // 6. Execute READ_FREELY tool through real backend service
  try {
    const execResult = await tool.execute(parsed.data, actor, {});
    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
    const responseRedacted = redactSensitiveData(execResult.data, { maskEmails: false });
    const auditRedacted = redactSensitiveData(execResult.data, { maskEmails: true });

    const invocation = await recordInvocationAndAudit({
      toolName: tool.toolName,
      serverId: tool.serverId,
      approvalPolicy: tool.approvalPolicy,
      status: 'AUTHORIZED_EXECUTED',
      actor,
      callerAgent,
      tenantScope: execResult.tenantScope,
      sanitizedParams: redactedInput.value,
      redactedOutput: auditRedacted.value,
      latencyMs,
      redactionsApplied: redactedInput.redactionsApplied + auditRedacted.redactionsApplied,
      secretsFiltered: redactedInput.secretsFiltered + auditRedacted.secretsFiltered,
      auditAction: 'MCP_TOOL_EXECUTED',
      auditReason: `Executed ${tool.toolName} via Ask OrbitoX MCP Gateway`,
    });

    return {
      kind: 'executed' as const,
      status: 200,
      execution: invocation,
      output: responseRedacted.value,
      guardrailAudit: {
        piiShield: 'ACTIVE',
        promptInjection: 'CLEAN',
        secretsFiltered: redactedInput.secretsFiltered + responseRedacted.secretsFiltered,
        redactionsApplied: redactedInput.redactionsApplied + responseRedacted.redactionsApplied,
      },
    };
  } catch (err: any) {
    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
    const status = err instanceof McpToolError ? err.status : 500;
    const code = err instanceof McpToolError ? err.code : 'MCP_EXECUTION_FAILED';
    const message = err?.message || 'MCP execution failed';

    await recordInvocationAndAudit({
      toolName: tool.toolName,
      serverId: tool.serverId,
      approvalPolicy: tool.approvalPolicy,
      status: status === 403 ? 'BLOCKED_TENANT_SCOPE' : 'EXECUTION_FAILED',
      actor,
      callerAgent,
      tenantScope: initialTenantScope,
      sanitizedParams: redactedInput.value,
      errorCode: code,
      errorMessage: message,
      latencyMs,
      redactionsApplied: redactedInput.redactionsApplied,
      secretsFiltered: redactedInput.secretsFiltered,
      auditAction: 'MCP_TOOL_FAILED',
      auditReason: `MCP tool ${tool.toolName} failed: ${code}`,
    });

    if (err instanceof McpToolError) throw err;
    throw new McpToolError(500, 'MCP_EXECUTION_FAILED', message);
  }
}

export async function approveAndExecuteMcpProposal(
  input: {
    approvalId: string;
    editedMessage?: unknown;
    reason?: unknown;
  },
  actor: McpActorContext,
) {
  const startedAt = performance.now();

  if (process.env.ORBITOX_MCP_EXECUTION_ENABLED === 'false') {
    throw new McpToolError(503, 'MCP_EXECUTION_DISABLED', 'MCP tool execution is disabled.');
  }
  if (actor.kind !== 'operator') {
    throw new McpToolError(403, 'OPERATOR_SESSION_REQUIRED', 'Operator session required.');
  }

  const cleanId = input.approvalId.trim();
  const existing = await prisma.mcpToolApproval.findUnique({ where: { id: cleanId } });
  if (!existing) {
    throw new McpToolError(404, 'APPROVAL_NOT_FOUND', `MCP approval ${cleanId} not found.`);
  }

  const tool = findMcpTool(existing.toolName);
  if (!tool) {
    throw new McpToolError(404, 'TOOL_NOT_FOUND', `Tool ${existing.toolName} is no longer registered.`);
  }

  authorizeToolAccess(actor, tool.minRole, tool.requiredCapability);

  const editedMessage =
    typeof input.editedMessage === 'string' && input.editedMessage.trim()
      ? input.editedMessage.trim().slice(0, 1000)
      : existing.editedMessage || undefined;

  if (editedMessage) {
    const scan = scanPromptInjection(editedMessage);
    if (scan.blocked) {
      throw new McpToolError(
        403,
        'PROMPT_INJECTION_BLOCKED',
        `Edited message rejected by prompt-injection shield (${scan.matches.join(', ')}).`,
      );
    }
  }

  const suppliedReason =
    typeof input.reason === 'string' && input.reason.trim()
      ? input.reason.trim().slice(0, 500)
      : existing.reason || undefined;

  if (tool.approvalPolicy === 'STEP_UP_MFA') {
    if (!actor.reauthenticatedAt || Date.now() - actor.reauthenticatedAt.getTime() > STEP_UP_MAX_AGE_MS) {
      throw new McpToolError(
        403,
        'REAUTH_REQUIRED',
        'Step-up re-authentication (password + MFA code within 5 minutes) is required to approve this action.',
      );
    }
    if (!suppliedReason || suppliedReason.length < 5) {
      throw new McpToolError(
        400,
        'INVALID_REASON',
        'A mandatory reason of at least 5 characters is required for step-up actions.',
      );
    }
  }

  // Atomic one-time claim inside serializable DB transaction
  const claimed = await prisma.$transaction(async (tx) => {
    const row = await tx.mcpToolApproval.findUnique({ where: { id: cleanId } });
    if (!row) {
      throw new McpToolError(404, 'APPROVAL_NOT_FOUND', `MCP approval ${cleanId} not found.`);
    }
    if (row.status !== 'PROPOSED' || row.consumedAt !== null) {
      throw new McpToolError(
        409,
        'APPROVAL_ALREADY_CONSUMED',
        `Approval ${cleanId} has already been processed (status=${row.status}).`,
      );
    }
    if (row.expiresAt.getTime() <= Date.now()) {
      await tx.mcpToolApproval.update({
        where: { id: cleanId },
        data: { status: 'EXPIRED' },
      });
      throw new McpToolError(410, 'APPROVAL_EXPIRED', `Approval ${cleanId} has expired.`);
    }

    const res = await tx.mcpToolApproval.updateMany({
      where: {
        id: cleanId,
        status: 'PROPOSED',
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        status: 'EXECUTING',
        consumedAt: new Date(),
        approvedById: actor.actorId,
        approvedByEmail: actor.actorEmail,
        editedMessage: editedMessage || row.editedMessage,
        reason: suppliedReason || row.reason,
      },
    });

    if (res.count !== 1) {
      throw new McpToolError(
        409,
        'APPROVAL_CONFLICT',
        `Approval ${cleanId} was claimed concurrently by another request.`,
      );
    }
    return row;
  });

  const parsed = tool.schema.safeParse(claimed.sanitizedParams);
  if (!parsed.success) {
    await prisma.mcpToolApproval.update({
      where: { id: cleanId },
      data: { status: 'FAILED' },
    });
    throw new McpToolError(400, 'INVALID_INPUT', 'Stored approval parameters failed validation.');
  }

  const computedHash = canonicalJsonHash({ toolName: tool.toolName, params: parsed.data });
  if (computedHash !== claimed.paramsHash) {
    await prisma.mcpToolApproval.update({
      where: { id: cleanId },
      data: { status: 'FAILED' },
    });
    throw new McpToolError(409, 'PARAM_HASH_MISMATCH', 'Approval parameters integrity check failed.');
  }

  const callerAgent = buildCallerAgent(actor, 'AskOrbitoX-Operator-Approval');
  const redactedParams = redactSensitiveData(parsed.data, { maskEmails: true });

  try {
    const execResult = await tool.execute(parsed.data, actor, {
      editedMessage,
      reason: suppliedReason,
    });
    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
    const responseRedacted = redactSensitiveData(execResult.data, { maskEmails: false });
    const auditRedacted = redactSensitiveData(execResult.data, { maskEmails: true });

    const invocation = await recordInvocationAndAudit({
      approvalId: cleanId,
      toolName: tool.toolName,
      serverId: tool.serverId,
      approvalPolicy: tool.approvalPolicy,
      status: 'AUTHORIZED_EXECUTED',
      actor,
      callerAgent,
      tenantScope: execResult.tenantScope,
      sanitizedParams: redactedParams.value,
      redactedOutput: auditRedacted.value,
      latencyMs,
      redactionsApplied: redactedParams.redactionsApplied + auditRedacted.redactionsApplied,
      secretsFiltered: redactedParams.secretsFiltered + auditRedacted.secretsFiltered,
      auditAction: 'MCP_APPROVAL_EXECUTED',
      auditReason: suppliedReason || `Operator approved ${tool.toolName} (${cleanId})`,
    });

    const updatedApproval = await prisma.mcpToolApproval.update({
      where: { id: cleanId },
      data: { status: 'SUCCEEDED', invocationId: invocation.id },
    });

    return {
      approval: updatedApproval,
      execution: invocation,
      output: responseRedacted.value,
      guardrailAudit: {
        piiShield: 'ACTIVE',
        promptInjection: 'CLEAN',
        secretsFiltered: redactedParams.secretsFiltered + responseRedacted.secretsFiltered,
        redactionsApplied: redactedParams.redactionsApplied + responseRedacted.redactionsApplied,
      },
    };
  } catch (err: any) {
    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
    const code = err instanceof McpToolError ? err.code : 'MCP_EXECUTION_FAILED';
    const message = err?.message || 'Approved execution failed.';

    const invocation = await recordInvocationAndAudit({
      approvalId: cleanId,
      toolName: tool.toolName,
      serverId: tool.serverId,
      approvalPolicy: tool.approvalPolicy,
      status: 'EXECUTION_FAILED',
      actor,
      callerAgent,
      tenantScope: claimed.tenantScope,
      sanitizedParams: redactedParams.value,
      errorCode: code,
      errorMessage: message,
      latencyMs,
      redactionsApplied: redactedParams.redactionsApplied,
      secretsFiltered: redactedParams.secretsFiltered,
      auditAction: 'MCP_APPROVAL_FAILED',
      auditReason: `Approved execution for ${tool.toolName} failed: ${code}`,
    });

    await prisma.mcpToolApproval.update({
      where: { id: cleanId },
      data: { status: 'FAILED', invocationId: invocation.id },
    });

    if (err instanceof McpToolError) throw err;
    throw new McpToolError(500, 'MCP_EXECUTION_FAILED', message);
  }
}

export async function rejectMcpProposal(
  input: { approvalId: string; reason?: unknown },
  actor: McpActorContext,
) {
  if (actor.kind !== 'operator') {
    throw new McpToolError(403, 'OPERATOR_SESSION_REQUIRED', 'Operator session required.');
  }

  const cleanId = input.approvalId.trim();
  const reason =
    typeof input.reason === 'string' && input.reason.trim()
      ? input.reason.trim().slice(0, 500)
      : 'Rejected by operator in Ask OrbitoX';

  const updated = await prisma.mcpToolApproval.updateMany({
    where: {
      id: cleanId,
      status: 'PROPOSED',
      consumedAt: null,
    },
    data: {
      status: 'REJECTED',
      rejectedAt: new Date(),
      approvedById: actor.actorId,
      approvedByEmail: actor.actorEmail,
      reason,
    },
  });

  if (updated.count !== 1) {
    const existing = await prisma.mcpToolApproval.findUnique({ where: { id: cleanId } });
    if (!existing) {
      throw new McpToolError(404, 'APPROVAL_NOT_FOUND', `Approval ${cleanId} not found.`);
    }
    throw new McpToolError(
      409,
      'APPROVAL_ALREADY_CONSUMED',
      `Approval ${cleanId} is already in status ${existing.status}.`,
    );
  }

  const approval = await prisma.mcpToolApproval.findUnique({ where: { id: cleanId } });
  await platformRepository
    .recordPlatformAdminAudit({
      action: 'MCP_APPROVAL_REJECTED',
      entityType: 'MCP_APPROVAL',
      entityId: cleanId,
      actorId: actor.actorId,
      actorEmail: actor.actorEmail,
      reason,
      metadata: { toolName: approval?.toolName, tenantScope: approval?.tenantScope } as any,
    })
    .catch(() => null);

  return approval;
}
