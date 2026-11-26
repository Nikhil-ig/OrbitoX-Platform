import 'server-only';
import crypto from 'node:crypto';
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
  computeCanonicalApprovalHash,
  McpCryptoError,
  McpKeyRing,
  redactSensitiveData,
  sanitizeApprovalReason,
  scanPromptInjection,
  sealExecutionPayload,
  unsealExecutionPayload,
  verifyCanonicalApprovalHash,
} from './mcp-guardrails';

const APPROVAL_TTL_MS = 15 * 60 * 1000;
const STEP_UP_MAX_AGE_MS = 5 * 60 * 1000;
const EXECUTION_LEASE_MS = 2 * 60 * 1000;

export interface McpGovernanceFaultDeps {
  recordAudit?: typeof platformRepository.recordPlatformAdminAudit;
}

function mapCryptoError(err: unknown): never {
  if (err instanceof McpToolError) throw err;
  if (err instanceof McpCryptoError) {
    if (err.code === 'MCP_CONFIG_INVALID') {
      throw new McpToolError(500, err.code, err.message);
    }
    throw new McpToolError(409, 'PARAM_HASH_MISMATCH', err.message);
  }
  throw err;
}

async function authorizeApprovalDecision(
  existing: {
    id: string;
    approvalPolicy: string;
    tenantScope: string;
    requestedById: string;
  },
  actor: Extract<McpActorContext, { kind: 'operator' }>,
  mode: 'APPROVE' | 'REJECT' = 'APPROVE',
): Promise<{
  delegationId: string | null;
  delegatedById: string | null;
  soleOwnerSelfApproval: boolean;
}> {
  const isSelf = existing.requestedById === actor.actorId;

  if (mode === 'APPROVE' && existing.approvalPolicy === 'STEP_UP_MFA' && isSelf) {
    const activeOwners = await prisma.platformOperator
      .count({ where: { role: 'PLATFORM_OWNER', status: 'ACTIVE' } })
      .catch(() => 0);
    if (activeOwners > 1) {
      throw new McpToolError(
        403,
        'SELF_APPROVAL_PROHIBITED',
        'Separation of duties prohibits self-approving STEP_UP_MFA operations when another active PLATFORM_OWNER exists.',
      );
    }
    return { delegationId: null, delegatedById: null, soleOwnerSelfApproval: true };
  }

  if (isSelf) {
    return { delegationId: null, delegatedById: null, soleOwnerSelfApproval: false };
  }

  // Independent approver: check server-authorized McpApprovalDelegation first
  const now = new Date();
  const delegation = await prisma.mcpApprovalDelegation.findFirst({
    where: {
      delegateId: actor.actorId,
      revokedAt: null,
      expiresAt: { gt: now },
      allowedRiskTier: { in: [existing.approvalPolicy, 'ALL'] },
      tenantScope: { in: ['*', existing.tenantScope] },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (delegation) {
    return {
      delegationId: delegation.id,
      delegatedById: delegation.delegatorId,
      soleOwnerSelfApproval: false,
    };
  }

  if (actor.role === 'PLATFORM_OWNER') {
    return {
      delegationId: null,
      delegatedById: actor.actorId,
      soleOwnerSelfApproval: false,
    };
  }

  throw new McpToolError(
    403,
    'APPROVAL_OWNERSHIP_REQUIRED',
    `Operator ${actor.actorEmail} is neither the requester nor an authorized delegate for approval ${existing.id}.`,
  );
}

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
  let auditEventId: string | null = null;
  try {
    auditEventId = await platformRepository.recordPlatformAdminAudit({
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
    });
  } catch (auditErr: any) {
    console.error(
      JSON.stringify({
        event: 'mcp.audit_failure',
        toolName: input.toolName,
        status: input.status,
        error: auditErr?.message || String(auditErr),
        timestamp: new Date().toISOString(),
      }),
    );
    if (input.status === 'AUTHORIZED_EXECUTED' || input.approvalId) {
      throw new McpToolError(
        500,
        'AUDIT_DURABILITY_FAILED',
        `Critical audit write failed for ${input.toolName}; execution aborted to preserve compliance.`,
      );
    }
  }

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
        select: {
          id: true,
          toolName: true,
          serverId: true,
          approvalPolicy: true,
          status: true,
          paramsHash: true,
          sanitizedParams: true,
          previewSummary: true,
          editedMessage: true,
          reason: true,
          tenantScope: true,
          requestedById: true,
          requestedByEmail: true,
          approvedById: true,
          approvedByEmail: true,
          invocationId: true,
          expiresAt: true,
          consumedAt: true,
          rejectedAt: true,
          createdAt: true,
          updatedAt: true,
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

  // 4b. API-key tenant boundary enforcement
  if (actor.kind === 'api_key') {
    if (tool.tenantScopeMode === 'PLATFORM_GLOBAL' && !actor.allowedTenants.includes('*')) {
      const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
      const msg = `Tenant-scoped API key cannot invoke PLATFORM_GLOBAL tool ${tool.toolName}.`;
      await recordInvocationAndAudit({
        toolName: tool.toolName,
        serverId: tool.serverId,
        approvalPolicy: tool.approvalPolicy,
        status: 'BLOCKED_TENANT_SCOPE',
        actor,
        callerAgent,
        tenantScope: initialTenantScope,
        sanitizedParams: redactedInput.value,
        errorCode: 'TENANT_SCOPE_VIOLATION',
        errorMessage: msg,
        latencyMs,
        redactionsApplied: redactedInput.redactionsApplied,
        secretsFiltered: redactedInput.secretsFiltered,
        auditAction: 'MCP_TOOL_TENANT_SCOPE_VIOLATION',
        auditReason: msg,
      });
      throw new McpToolError(403, 'TENANT_SCOPE_VIOLATION', msg);
    }
    if (tool.tenantScopeMode === 'EXPLICIT_TENANT') {
      const explicitTarget =
        typeof (rawParams as any).tenantId === 'string'
          ? (rawParams as any).tenantId.trim()
          : typeof (rawParams as any).idOrSlug === 'string'
            ? (rawParams as any).idOrSlug.trim()
            : '';
      if (explicitTarget && !actor.allowedTenants.includes('*') && !actor.allowedTenants.includes(explicitTarget)) {
        const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
        const msg = `API key is not authorized for target tenant scope [${explicitTarget}].`;
        await recordInvocationAndAudit({
          toolName: tool.toolName,
          serverId: tool.serverId,
          approvalPolicy: tool.approvalPolicy,
          status: 'BLOCKED_TENANT_SCOPE',
          actor,
          callerAgent,
          tenantScope: explicitTarget,
          sanitizedParams: redactedInput.value,
          errorCode: 'TENANT_SCOPE_VIOLATION',
          errorMessage: msg,
          latencyMs,
          redactionsApplied: redactedInput.redactionsApplied,
          secretsFiltered: redactedInput.secretsFiltered,
          auditAction: 'MCP_TOOL_TENANT_SCOPE_VIOLATION',
          auditReason: msg,
        });
        throw new McpToolError(403, 'TENANT_SCOPE_VIOLATION', msg);
      }
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

    const approvalId = `mcp_appr_${crypto.randomUUID()}`;
    const bindingContext = {
      approvalId,
      toolName: tool.toolName,
      serverId: tool.serverId,
      approvalPolicy: tool.approvalPolicy,
      tenantScope: proposalMeta.tenantScope,
      requestedById: actor.actorId,
    };

    let encryptedPayload: string;
    let encryptionKid: string;
    let paramsHash: string;
    let hmacKid: string;
    try {
      const keyRing = McpKeyRing.fromEnv();
      const sealed = sealExecutionPayload(parsed.data, bindingContext, keyRing);
      encryptedPayload = sealed.sealed;
      encryptionKid = sealed.kid;
      const hashed = computeCanonicalApprovalHash({ ...bindingContext, params: parsed.data }, keyRing);
      paramsHash = hashed.hash;
      hmacKid = hashed.hmacKid;
    } catch (err) {
      mapCryptoError(err);
    }

    const sanitizedProposalParams = redactSensitiveData(parsed.data, { maskEmails: true });
    const sanitizedReason = sanitizeApprovalReason((parsed.data as any).reason);

    const approval = await prisma.$transaction(async (tx) => {
      const created = await tx.mcpToolApproval.create({
        data: {
          id: approvalId,
          toolName: tool.toolName,
          serverId: tool.serverId,
          approvalPolicy: tool.approvalPolicy,
          status: 'PROPOSED',
          paramsHash,
          sanitizedParams: sanitizedProposalParams.value as any,
          encryptedPayload,
          encryptionKid,
          hmacKid,
          previewSummary: proposalMeta.previewSummary,
          editedMessage:
            typeof (parsed.data as any).customMessage === 'string'
              ? (parsed.data as any).customMessage
              : null,
          reason: sanitizedReason || null,
          tenantScope: proposalMeta.tenantScope,
          requestedById: actor.actorId,
          requestedByEmail: actor.actorEmail,
          expiresAt: new Date(Date.now() + APPROVAL_TTL_MS),
        },
      });

      await tx.platformOutboxMessage.create({
        data: {
          tenantId: proposalMeta.tenantScope,
          eventType: 'mcp.audit.approval_proposed',
          aggregateType: 'MCP_APPROVAL',
          aggregateId: approvalId,
          deduplicationKey: `mcp_proposed:${approvalId}`,
          payload: {
            approvalId,
            toolName: tool.toolName,
            approvalPolicy: tool.approvalPolicy,
            tenantScope: proposalMeta.tenantScope,
            requestedById: actor.actorId,
            paramsHash,
          } as any,
        },
      });

      return created;
    });

    try {
      await platformRepository.recordPlatformAdminAudit({
        action: 'MCP_APPROVAL_PROPOSED',
        entityType: 'MCP_APPROVAL',
        entityId: approval.id,
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        reason: proposalMeta.previewSummary,
        metadata: {
          approvalId: approval.id,
          toolName: tool.toolName,
          approvalPolicy: tool.approvalPolicy,
          tenantScope: proposalMeta.tenantScope,
          sanitizedParams: sanitizedProposalParams.value,
          paramsHash,
        } as any,
      });
    } catch (auditErr: any) {
      await prisma.mcpToolApproval
        .updateMany({ where: { id: approval.id, status: 'PROPOSED' }, data: { status: 'FAILED' } })
        .catch(() => {});
      console.error(
        JSON.stringify({
          event: 'mcp.approval_proposed_audit_failure',
          approvalId: approval.id,
          error: auditErr?.message || String(auditErr),
          timestamp: new Date().toISOString(),
        }),
      );
      throw new McpToolError(
        503,
        'AUDIT_UNAVAILABLE',
        'Proposal could not be durably audited and was aborted.',
      );
    }

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
  deps?: McpGovernanceFaultDeps,
) {
  const startedAt = performance.now();
  const recordAudit = deps?.recordAudit ?? platformRepository.recordPlatformAdminAudit;

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
  const ownership = await authorizeApprovalDecision(existing, actor, 'APPROVE');

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
    sanitizeApprovalReason(input.reason) ?? sanitizeApprovalReason(existing.reason);

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

  if (existing.expiresAt.getTime() <= Date.now()) {
    await prisma.mcpToolApproval.updateMany({
      where: { id: cleanId, status: 'PROPOSED' },
      data: { status: 'EXPIRED' },
    });
    throw new McpToolError(410, 'APPROVAL_EXPIRED', `Approval ${cleanId} has expired.`);
  }

  if (existing.status !== 'PROPOSED' || existing.consumedAt !== null) {
    throw new McpToolError(
      409,
      'APPROVAL_ALREADY_CONSUMED',
      `Approval ${cleanId} has already been processed (status=${existing.status}).`,
    );
  }

  // F-03: Reject NULL / missing encrypted execution payload before claiming
  if (!existing.encryptedPayload) {
    await prisma.mcpToolApproval.updateMany({
      where: { id: cleanId, status: 'PROPOSED' },
      data: { status: 'FAILED' },
    });
    throw new McpToolError(
      409,
      'MISSING_EXECUTION_PAYLOAD',
      `Approval ${cleanId} lacks an encrypted execution payload and cannot execute.`,
    );
  }

  const bindingContext = {
    approvalId: existing.id,
    toolName: tool.toolName,
    serverId: tool.serverId,
    approvalPolicy: tool.approvalPolicy,
    tenantScope: existing.tenantScope,
    requestedById: existing.requestedById,
  };

  let decryptedParams: unknown;
  let encryptionKid = existing.encryptionKid || '';
  let hmacKid = existing.hmacKid || '';
  try {
    const keyRing = McpKeyRing.fromEnv();
    const unsealed = unsealExecutionPayload(existing.encryptedPayload, bindingContext, keyRing);
    decryptedParams = unsealed.payload;
    encryptionKid = unsealed.kid;

    const parsedPre = tool.schema.safeParse(decryptedParams);
    if (!parsedPre.success) {
      await prisma.mcpToolApproval.updateMany({
        where: { id: cleanId, status: 'PROPOSED' },
        data: { status: 'FAILED' },
      });
      throw new McpToolError(400, 'INVALID_INPUT', 'Stored approval parameters failed validation.');
    }

    const hashCheck = verifyCanonicalApprovalHash(
      existing.paramsHash,
      { ...bindingContext, params: parsedPre.data },
      keyRing,
    );
    if (!hashCheck.valid) {
      await prisma.mcpToolApproval.updateMany({
        where: { id: cleanId, status: 'PROPOSED' },
        data: { status: 'FAILED' },
      });
      throw new McpToolError(409, 'PARAM_HASH_MISMATCH', 'Approval parameters integrity check failed.');
    }
    hmacKid = hashCheck.hmacKid;
  } catch (err) {
    if (err instanceof McpCryptoError && err.code !== 'MCP_CONFIG_INVALID') {
      await prisma.mcpToolApproval.updateMany({
        where: { id: cleanId, status: 'PROPOSED' },
        data: { status: 'FAILED' },
      });
    }
    mapCryptoError(err);
  }

  const parsed = tool.schema.safeParse(decryptedParams);
  if (!parsed.success) {
    throw new McpToolError(400, 'INVALID_INPUT', 'Stored approval parameters failed validation.');
  }

  const callerAgent = buildCallerAgent(actor, 'AskOrbitoX-Operator-Approval');
  const redactedParams = redactSensitiveData(parsed.data, { maskEmails: true });
  const executionId = `exec_${crypto.randomUUID()}`;
  const idempotencyKey = `${cleanId}:${executionId}`;
  const leaseOwner = `platform:${process.pid}`;
  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + EXECUTION_LEASE_MS);

  // Correction A: Atomic Claim + Execution Intent + Append-only Invocation Intent + Outbox Intent
  let claimedTxResult: { approval: typeof existing; intentInvocationId: string };
  try {
    claimedTxResult = await prisma.$transaction(async (tx) => {
      const claimRes = await tx.mcpToolApproval.updateMany({
        where: {
          id: cleanId,
          status: 'PROPOSED',
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          status: 'EXECUTING',
          consumedAt: now,
          approvedById: actor.actorId,
          approvedByEmail: actor.actorEmail,
          delegationId: ownership.delegationId,
          delegatedById: ownership.delegatedById,
          editedMessage: editedMessage || existing.editedMessage,
          reason: suppliedReason || existing.reason,
        },
      });

      if (claimRes.count !== 1) {
        throw new McpToolError(409, 'APPROVAL_CONFLICT', `Approval ${cleanId} was claimed concurrently or expired.`);
      }

      const intentInvocation = await tx.mcpToolInvocation.create({
        data: {
          approvalId: cleanId,
          executionId,
          idempotencyKey,
          toolName: tool.toolName,
          serverId: tool.serverId,
          approvalPolicy: tool.approvalPolicy,
          status: 'EXECUTION_INTENT',
          actorId: actor.actorId,
          actorEmail: actor.actorEmail,
          authType: actor.kind,
          callerAgent,
          tenantScope: existing.tenantScope,
          sanitizedParams: redactedParams.value as any,
          latencyMs: 0,
          redactionsApplied: redactedParams.redactionsApplied,
          secretsFiltered: redactedParams.secretsFiltered,
        },
      });

      await tx.mcpToolExecution.create({
        data: {
          id: executionId,
          approvalId: cleanId,
          invocationId: intentInvocation.id,
          toolName: tool.toolName,
          tenantScope: existing.tenantScope,
          idempotencyKey,
          status: 'EXECUTION_INTENT',
          encryptionKid,
          hmacKid,
          startedAt: now,
          leaseOwner,
          leaseExpiresAt,
          attemptNumber: 1,
        },
      });

      await tx.platformOutboxMessage.create({
        data: {
          tenantId: existing.tenantScope,
          eventType: 'mcp.audit.execution_intent',
          aggregateType: 'MCP_EXECUTION',
          aggregateId: executionId,
          deduplicationKey: `mcp_intent:${executionId}`,
          payload: {
            executionId,
            approvalId: cleanId,
            invocationId: intentInvocation.id,
            idempotencyKey,
            toolName: tool.toolName,
            serverId: tool.serverId,
            approvalPolicy: tool.approvalPolicy,
            tenantScope: existing.tenantScope,
            requestedById: existing.requestedById,
            approvedById: actor.actorId,
            delegationId: ownership.delegationId,
            delegatedById: ownership.delegatedById,
            soleOwnerSelfApproval: ownership.soleOwnerSelfApproval,
            paramsHash: existing.paramsHash,
          } as any,
        },
      });

      const refreshed = await tx.mcpToolApproval.findUnique({ where: { id: cleanId } });
      return { approval: refreshed || existing, intentInvocationId: intentInvocation.id };
    });
  } catch (err: any) {
    if (err instanceof McpToolError && err.code === 'APPROVAL_CONFLICT') {
      const fresh = await prisma.mcpToolApproval.findUnique({ where: { id: cleanId } });
      if (fresh && fresh.expiresAt.getTime() <= Date.now()) {
        await prisma.mcpToolApproval.updateMany({
          where: { id: cleanId, status: 'PROPOSED' },
          data: { status: 'EXPIRED' },
        });
        throw new McpToolError(410, 'APPROVAL_EXPIRED', `Approval ${cleanId} has expired.`);
      }
    }
    throw err;
  }

  // Write-ahead immutable audit event BEFORE business side effect begins
  let intentAuditId: string | null = null;
  try {
    intentAuditId = await recordAudit({
      action: 'MCP_APPROVAL_EXECUTION_INTENT',
      entityType: 'MCP_EXECUTION',
      entityId: executionId,
      actorId: actor.actorId,
      actorEmail: actor.actorEmail,
      reason: suppliedReason || `Execution intent for ${tool.toolName} (${cleanId})`,
      metadata: {
        executionId,
        approvalId: cleanId,
        invocationId: claimedTxResult.intentInvocationId,
        idempotencyKey,
        toolName: tool.toolName,
        tenantScope: existing.tenantScope,
        requestedById: existing.requestedById,
        delegationId: ownership.delegationId,
        delegatedById: ownership.delegatedById,
        soleOwnerSelfApproval: ownership.soleOwnerSelfApproval,
        paramsHash: existing.paramsHash,
      } as any,
    });
  } catch (auditErr: any) {
    console.error(
      JSON.stringify({
        event: 'mcp.audit_intent_failure',
        executionId,
        approvalId: cleanId,
        error: auditErr?.message || String(auditErr),
        timestamp: new Date().toISOString(),
      }),
    );
    await prisma.$transaction([
      prisma.mcpToolExecution.updateMany({
        where: { id: executionId, status: 'EXECUTION_INTENT' },
        data: { status: 'EXECUTION_FAILED', lastErrorCode: 'AUDIT_UNAVAILABLE', lastErrorMessage: 'Pre-execution audit failed.' },
      }),
      prisma.mcpToolApproval.updateMany({
        where: { id: cleanId, status: 'EXECUTING' },
        data: { status: 'FAILED' },
      }),
    ]).catch(() => {});
    throw new McpToolError(
      503,
      'AUDIT_UNAVAILABLE',
      `Audit persistence failed before executing ${tool.toolName}; no business side effect occurred.`,
    );
  }

  // Transition Execution -> EXECUTION_RUNNING immediately before tool.execute
  await prisma.mcpToolExecution.update({
    where: { id: executionId },
    data: {
      status: 'EXECUTION_RUNNING',
      auditIntentEventId: intentAuditId,
      leaseExpiresAt: new Date(Date.now() + EXECUTION_LEASE_MS),
    },
  });

  try {
    const execResult = await tool.execute(parsed.data, actor, {
      editedMessage,
      reason: suppliedReason,
      executionId,
      idempotencyKey,
    });
    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
    const responseRedacted = redactSensitiveData(execResult.data, { maskEmails: false });
    const auditRedacted = redactSensitiveData(execResult.data, { maskEmails: true });

    let finalAuditId: string | null = null;
    try {
      finalAuditId = await recordAudit({
        action: 'MCP_APPROVAL_EXECUTION_SUCCEEDED',
        entityType: 'MCP_EXECUTION',
        entityId: executionId,
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        reason: suppliedReason || `Operator approved ${tool.toolName} (${cleanId})`,
        metadata: {
          executionId,
          approvalId: cleanId,
          idempotencyKey,
          toolName: tool.toolName,
          tenantScope: execResult.tenantScope,
          latencyMs,
          paramsHash: existing.paramsHash,
        } as any,
      });
    } catch (postAuditErr: any) {
      console.error(
        JSON.stringify({
          event: 'mcp.audit_finalization_failure',
          executionId,
          approvalId: cleanId,
          error: postAuditErr?.message || String(postAuditErr),
          timestamp: new Date().toISOString(),
        }),
      );
      await prisma.$transaction([
        prisma.mcpToolExecution.updateMany({
          where: { id: executionId },
          data: {
            status: 'RECOVERY_REQUIRED',
            reconciliationStatus: 'AUDIT_FINALIZATION_FAILED',
            lastErrorCode: 'AUDIT_FINALIZATION_FAILED',
            lastErrorMessage: postAuditErr?.message || 'Post-execution audit write failed.',
          },
        }),
        prisma.mcpToolApproval.updateMany({
          where: { id: cleanId },
          data: { status: 'RECOVERY_REQUIRED' },
        }),
      ]).catch(() => {});
      throw new McpToolError(
        500,
        'AUDIT_FINALIZATION_FAILED',
        `Execution ${executionId} completed or started, but audit finalization failed; marked RECOVERY_REQUIRED (do not blindly retry).`,
        { executionId, approvalId: cleanId },
      );
    }

    const finalInvocation = await prisma.mcpToolInvocation.create({
      data: {
        approvalId: cleanId,
        executionId,
        idempotencyKey,
        toolName: tool.toolName,
        serverId: tool.serverId,
        approvalPolicy: tool.approvalPolicy,
        status: 'AUTHORIZED_EXECUTED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        authType: actor.kind,
        callerAgent,
        tenantScope: execResult.tenantScope,
        sanitizedParams: redactedParams.value as any,
        redactedOutput: auditRedacted.value as any,
        latencyMs,
        redactionsApplied: redactedParams.redactionsApplied + auditRedacted.redactionsApplied,
        secretsFiltered: redactedParams.secretsFiltered + auditRedacted.secretsFiltered,
        auditEventId: finalAuditId,
      },
    });

    const [, updatedApproval] = await prisma.$transaction([
      prisma.mcpToolExecution.update({
        where: { id: executionId },
        data: {
          status: 'AUTHORIZED_EXECUTED',
          invocationId: finalInvocation.id,
          finalAuditEventId: finalAuditId,
          reconciliationStatus: 'COMPLETED',
        },
      }),
      prisma.mcpToolApproval.update({
        where: { id: cleanId },
        data: { status: 'SUCCEEDED', invocationId: finalInvocation.id },
      }),
    ]);

    return {
      approval: updatedApproval,
      execution: finalInvocation,
      executionId,
      output: responseRedacted.value,
      guardrailAudit: {
        piiShield: 'ACTIVE',
        promptInjection: 'CLEAN',
        secretsFiltered: redactedParams.secretsFiltered + responseRedacted.secretsFiltered,
        redactionsApplied: redactedParams.redactionsApplied + responseRedacted.redactionsApplied,
      },
    };
  } catch (err: any) {
    if (err instanceof McpToolError && err.code === 'AUDIT_FINALIZATION_FAILED') {
      throw err;
    }
    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
    const code = err instanceof McpToolError ? err.code : 'MCP_EXECUTION_FAILED';
    const message = err?.message || 'Approved execution failed.';

    let failAuditId: string | null = null;
    try {
      failAuditId = await recordAudit({
        action: 'MCP_APPROVAL_EXECUTION_FAILED',
        entityType: 'MCP_EXECUTION',
        entityId: executionId,
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        reason: `Approved execution for ${tool.toolName} failed: ${code}`,
        metadata: { executionId, approvalId: cleanId, errorCode: code } as any,
      });
    } catch {
      // Best-effort; original EXECUTION_INTENT outbox remains durable
    }

    const failedInvocation = await prisma.mcpToolInvocation.create({
      data: {
        approvalId: cleanId,
        executionId,
        idempotencyKey,
        toolName: tool.toolName,
        serverId: tool.serverId,
        approvalPolicy: tool.approvalPolicy,
        status: 'EXECUTION_FAILED',
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        authType: actor.kind,
        callerAgent,
        tenantScope: existing.tenantScope,
        sanitizedParams: redactedParams.value as any,
        errorCode: code,
        errorMessage: message,
        latencyMs,
        redactionsApplied: redactedParams.redactionsApplied,
        secretsFiltered: redactedParams.secretsFiltered,
        auditEventId: failAuditId,
      },
    });

    await prisma.$transaction([
      prisma.mcpToolExecution.update({
        where: { id: executionId },
        data: {
          status: 'EXECUTION_FAILED',
          invocationId: failedInvocation.id,
          finalAuditEventId: failAuditId,
          lastErrorCode: code,
          lastErrorMessage: message,
        },
      }),
      prisma.mcpToolApproval.update({
        where: { id: cleanId },
        data: { status: 'FAILED', invocationId: failedInvocation.id },
      }),
    ]);

    if (err instanceof McpToolError) throw err;
    throw new McpToolError(500, 'MCP_EXECUTION_FAILED', message);
  }
}

export async function rejectMcpProposal(
  input: { approvalId: string; reason?: unknown },
  actor: McpActorContext,
  deps?: McpGovernanceFaultDeps,
) {
  const recordAudit = deps?.recordAudit ?? platformRepository.recordPlatformAdminAudit;
  if (actor.kind !== 'operator') {
    throw new McpToolError(403, 'OPERATOR_SESSION_REQUIRED', 'Operator session required.');
  }

  const cleanId = input.approvalId.trim();
  const reason = sanitizeApprovalReason(input.reason) || 'Rejected by operator in Ask OrbitoX';

  const existing = await prisma.mcpToolApproval.findUnique({ where: { id: cleanId } });
  if (!existing) {
    throw new McpToolError(404, 'APPROVAL_NOT_FOUND', `Approval ${cleanId} not found.`);
  }

  const ownership = await authorizeApprovalDecision(existing, actor, 'REJECT');

  if (existing.expiresAt.getTime() <= Date.now()) {
    await prisma.mcpToolApproval.updateMany({
      where: { id: cleanId, status: 'PROPOSED' },
      data: { status: 'EXPIRED' },
    });
    throw new McpToolError(410, 'APPROVAL_EXPIRED', `Approval ${cleanId} has expired.`);
  }

  if (existing.status !== 'PROPOSED' || existing.consumedAt !== null) {
    throw new McpToolError(
      409,
      'APPROVAL_ALREADY_CONSUMED',
      `Approval ${cleanId} is already in status ${existing.status}.`,
    );
  }

  try {
    await recordAudit({
      action: 'MCP_APPROVAL_REJECTED',
      entityType: 'MCP_APPROVAL',
      entityId: cleanId,
      actorId: actor.actorId,
      actorEmail: actor.actorEmail,
      reason,
      metadata: {
        approvalId: cleanId,
        toolName: existing.toolName,
        tenantScope: existing.tenantScope,
        requestedById: existing.requestedById,
        delegationId: ownership.delegationId,
        delegatedById: ownership.delegatedById,
      } as any,
    });
  } catch (auditErr: any) {
    console.error(
      JSON.stringify({
        event: 'mcp.approval_rejected_audit_failure',
        approvalId: cleanId,
        error: auditErr?.message || String(auditErr),
        timestamp: new Date().toISOString(),
      }),
    );
    throw new McpToolError(
      503,
      'AUDIT_UNAVAILABLE',
      'Rejection could not be durably audited and was aborted.',
    );
  }

  const updated = await prisma.mcpToolApproval.updateMany({
    where: {
      id: cleanId,
      status: 'PROPOSED',
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: {
      status: 'REJECTED',
      rejectedAt: new Date(),
      approvedById: actor.actorId,
      approvedByEmail: actor.actorEmail,
      delegationId: ownership.delegationId,
      delegatedById: ownership.delegatedById,
      reason,
    },
  });

  if (updated.count !== 1) {
    const fresh = await prisma.mcpToolApproval.findUnique({ where: { id: cleanId } });
    if (fresh && fresh.expiresAt.getTime() <= Date.now()) {
      await prisma.mcpToolApproval.updateMany({
        where: { id: cleanId, status: 'PROPOSED' },
        data: { status: 'EXPIRED' },
      });
      throw new McpToolError(410, 'APPROVAL_EXPIRED', `Approval ${cleanId} has expired.`);
    }
    throw new McpToolError(
      409,
      'APPROVAL_ALREADY_CONSUMED',
      `Approval ${cleanId} was processed concurrently.`,
    );
  }

  return await prisma.mcpToolApproval.findUnique({ where: { id: cleanId } });
}

/**
 * Preflight key retirement check: refuses retirement while any pending, executing, or recovery-required
 * record still references the key ID.
 */
export async function canRetireMcpKey(
  kid: string,
  kind: 'encryption' | 'hmac',
): Promise<{ canRetire: boolean; blockingApprovals: number; blockingExecutions: number }> {
  const approvalWhere =
    kind === 'encryption'
      ? { encryptionKid: kid, status: { in: ['PROPOSED', 'EXECUTING', 'RECOVERY_REQUIRED'] } }
      : { hmacKid: kid, status: { in: ['PROPOSED', 'EXECUTING', 'RECOVERY_REQUIRED'] } };
  const execWhere =
    kind === 'encryption'
      ? { encryptionKid: kid, status: { in: ['EXECUTION_INTENT', 'EXECUTION_RUNNING', 'RECOVERY_REQUIRED'] } }
      : { hmacKid: kid, status: { in: ['EXECUTION_INTENT', 'EXECUTION_RUNNING', 'RECOVERY_REQUIRED'] } };

  const [blockingApprovals, blockingExecutions] = await Promise.all([
    prisma.mcpToolApproval.count({ where: approvalWhere }),
    prisma.mcpToolExecution.count({ where: execWhere }),
  ]);

  return {
    canRetire: blockingApprovals === 0 && blockingExecutions === 0,
    blockingApprovals,
    blockingExecutions,
  };
}

/**
 * Reconciles stale EXECUTION_INTENT, expired EXECUTION_RUNNING, and RECOVERY_REQUIRED executions
 * without blindly repeating business side effects.
 */
export async function reconcileStaleMcpExecutions(
  options: { now?: Date; deps?: McpGovernanceFaultDeps } = {},
): Promise<{ reconciled: number; ids: string[] }> {
  const now = options.now ?? new Date();
  const recordAudit = options.deps?.recordAudit ?? platformRepository.recordPlatformAdminAudit;

  const candidates = await prisma.mcpToolExecution.findMany({
    where: {
      OR: [
        { status: 'RECOVERY_REQUIRED' },
        { status: { in: ['EXECUTION_INTENT', 'EXECUTION_RUNNING'] }, leaseExpiresAt: { lte: now } },
      ],
    },
    take: 50,
  });

  const reconciledIds: string[] = [];
  for (const exec of candidates) {
    let resolvedStatus: 'AUTHORIZED_EXECUTED' | 'EXECUTION_FAILED' | 'RECOVERY_REQUIRED' = 'RECOVERY_REQUIRED';
    let reconciliationNote = 'Requires manual verification';

    if (exec.status === 'EXECUTION_INTENT') {
      resolvedStatus = 'EXECUTION_FAILED';
      reconciliationNote = 'RECONCILED_NOT_STARTED';
    } else if (exec.toolName === 'billing.send_payment_reminder') {
      const outboxCount = await prisma.accountEmailOutbox.count({
        where: { idempotencyKey: { startsWith: `${exec.idempotencyKey}:` } },
      });
      if (outboxCount > 0) {
        resolvedStatus = 'AUTHORIZED_EXECUTED';
        reconciliationNote = `RECONCILED_OUTBOX_FOUND:${outboxCount}`;
      }
    } else if (exec.toolName === 'tenants.suspend') {
      const proj = await prisma.platformProject.findFirst({
        where: { OR: [{ id: exec.tenantScope }, { slug: exec.tenantScope }] },
        select: { status: true },
      });
      if (proj?.status === 'SUSPENDED') {
        resolvedStatus = 'AUTHORIZED_EXECUTED';
        reconciliationNote = 'RECONCILED_TENANT_SUSPENDED';
      }
    }

    if (resolvedStatus === 'RECOVERY_REQUIRED') {
      await prisma.mcpToolExecution.update({
        where: { id: exec.id },
        data: { status: 'RECOVERY_REQUIRED', reconciliationStatus: reconciliationNote },
      });
      continue;
    }

    const auditId = await recordAudit({
      action: 'MCP_APPROVAL_RECOVERY_COMPLETED',
      entityType: 'MCP_EXECUTION',
      entityId: exec.id,
      actorId: 'system:mcp-reconciler',
      reason: `Reconciled ${exec.toolName} (${exec.id}) -> ${resolvedStatus} (${reconciliationNote})`,
      metadata: {
        executionId: exec.id,
        approvalId: exec.approvalId,
        resolvedStatus,
        reconciliationNote,
      } as any,
    });

    await prisma.$transaction([
      prisma.mcpToolExecution.update({
        where: { id: exec.id },
        data: {
          status: resolvedStatus,
          finalAuditEventId: auditId,
          reconciliationStatus: reconciliationNote,
        },
      }),
      prisma.mcpToolApproval.update({
        where: { id: exec.approvalId },
        data: { status: resolvedStatus === 'AUTHORIZED_EXECUTED' ? 'SUCCEEDED' : 'FAILED' },
      }),
    ]);

    reconciledIds.push(exec.id);
  }

  return { reconciled: reconciledIds.length, ids: reconciledIds };
}
