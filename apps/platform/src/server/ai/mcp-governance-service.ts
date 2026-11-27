import 'server-only';
import crypto from 'node:crypto';
import { prisma } from '@/server/db/prisma';
import { TENANT_RE } from '@/server/db/tenant-db';
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
import {
  buildCanonicalMcpAuditEvent,
  parseCanonicalAuditScope,
} from './mcp-audit-events';

const APPROVAL_TTL_MS = 15 * 60 * 1000;
const STEP_UP_MAX_AGE_MS = 5 * 60 * 1000;
const EXECUTION_LEASE_MS = 2 * 60 * 1000;
const DEFAULT_KEY_RETENTION_DAYS = 90;
export const PLATFORM_CANONICAL_SCOPE = 'org/platform/project/operations/environment/platform-admin';

export interface McpGovernanceFaultDeps {
  recordAudit?: typeof platformRepository.recordPlatformAdminAudit;
}

export function mcpAuditEventId(scopeId: string, stage: 'proposed' | 'intent' | 'final' | 'recovery'): string {
  const digest = crypto.createHash('sha256').update(`${scopeId}:${stage}`).digest('hex').slice(0, 28);
  return `audit_mcp_${digest}`;
}

export async function resolveCanonicalOutboxTenantScope(scope: string): Promise<string> {
  const trimmed = (scope || '').trim();
  if (TENANT_RE.test(trimmed)) return trimmed;
  if (!trimmed || trimmed === 'platform') return PLATFORM_CANONICAL_SCOPE;

  try {
    const project = await platformRepository.getProject(trimmed);
    if (project) {
      const envs = await platformRepository.listEnvironments(project.id);
      const env = envs.find((e) => e.slug === 'production') || envs[0];
      if (env) {
        return `org/${project.organizationId}/project/${project.id}/environment/${env.id}`;
      }
    }
  } catch {
    // Fall back to canonical platform operations scope when DB lookup fails or target is global
  }
  return PLATFORM_CANONICAL_SCOPE;
}

function mapCryptoError(err: unknown): never {
  if (err instanceof McpToolError) throw err;
  if (err instanceof McpCryptoError) {
    if (err.code === 'MCP_CONFIG_INVALID' || err.code === 'MCP_KEY_UNAVAILABLE') {
      throw new McpToolError(500, err.code, err.message);
    }
    if (err.code === 'MCP_INPUT_INVALID') {
      throw new McpToolError(400, err.code, err.message);
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
  delegationId: null;
  delegatedById: null;
  soleOwnerSelfApproval: false;
}> {
  const isSelf = existing.requestedById === actor.actorId;

  // Decision D-2: No silent sole-owner self-approval for STEP_UP_MFA actions
  if (mode === 'APPROVE' && existing.approvalPolicy === 'STEP_UP_MFA') {
    if (isSelf) {
      throw new McpToolError(
        403,
        'SELF_APPROVAL_PROHIBITED',
        'Separation of duties prohibits self-approving STEP_UP_MFA operations.',
      );
    }
    const activeOwners = await prisma.platformOperator
      .count({ where: { role: 'PLATFORM_OWNER', status: 'ACTIVE' } })
      .catch(() => 0);
    if (activeOwners < 2) {
      throw new McpToolError(
        409,
        'SEPARATION_OF_DUTIES_UNSATISFIED',
        'At least two active PLATFORM_OWNER operators are required to approve STEP_UP_MFA operations.',
      );
    }
  }

  if (isSelf) {
    return { delegationId: null, delegatedById: null, soleOwnerSelfApproval: false };
  }

  // Decision D-1 (Approach B): Delegated approvals are temporarily disabled; only independent PLATFORM_OWNER may approve/reject
  if (actor.role === 'PLATFORM_OWNER') {
    return {
      delegationId: null,
      delegatedById: null,
      soleOwnerSelfApproval: false,
    };
  }

  throw new McpToolError(
    403,
    'APPROVAL_OWNERSHIP_REQUIRED',
    `Delegated approval execution is disabled. Operator ${actor.actorEmail} is neither the requester nor a PLATFORM_OWNER for approval ${existing.id}.`,
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
      actorEmail: input.actor.actorEmail ?? undefined,
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

export function isMcpExecutionEnabled(): boolean {
  const raw = process.env.ORBITOX_MCP_EXECUTION_ENABLED?.trim().toLowerCase();
  if (process.env.NODE_ENV === 'production' || !process.env.NODE_ENV) {
    return raw === 'true';
  }
  if (raw === undefined || raw === '') {
    return process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
  }
  return raw === 'true';
}

function resolveMcpKeyRetentionDays(explicitDays?: number): number {
  if (explicitDays !== undefined) {
    if (!Number.isInteger(explicitDays) || explicitDays < 1) {
      throw new McpToolError(
        400,
        'INVALID_RETENTION_POLICY',
        'retentionDays must be a positive integer >= 1.',
      );
    }
    return explicitDays;
  }

  const rawEnv = process.env.ORBITOX_MCP_KEY_RETENTION_DAYS;
  if (rawEnv !== undefined) {
    const trimmed = rawEnv.trim();
    if (!/^[1-9]\d*$/.test(trimmed)) {
      throw new McpToolError(
        500,
        'INVALID_RETENTION_POLICY',
        `ORBITOX_MCP_KEY_RETENTION_DAYS must be a positive integer >= 1 (received "${rawEnv}").`,
      );
    }
    return Number(trimmed);
  }

  return DEFAULT_KEY_RETENTION_DAYS;
}

export async function getMcpGatewayInventory(
  operatorOrOptions?: string | { operatorId?: string; operatorRole?: string },
  apiKeyActor?: McpActorContext,
) {
  const opts =
    typeof operatorOrOptions === 'string'
      ? { operatorId: operatorOrOptions }
      : (operatorOrOptions || {});
  const operatorId = opts.operatorId;
  let operatorRole = opts.operatorRole;
  if (!operatorRole && operatorId) {
    const opRecord = await prisma.platformOperator
      .findUnique({ where: { id: operatorId }, select: { role: true } })
      .catch(() => null);
    operatorRole = opRecord?.role || undefined;
  }

  const now = new Date();
  let approvalFilter: Record<string, any> | undefined;
  if (operatorId) {
    if (operatorRole === 'PLATFORM_OWNER') {
      approvalFilter = undefined;
    } else if (operatorRole) {
      const roleEligibleTools = MCP_TOOLS
        .filter((t) => operatorRoleAllows(operatorRole as any, t.minRole))
        .map((t) => t.toolName);
      approvalFilter =
        roleEligibleTools.length > 0
          ? { OR: [{ requestedById: operatorId }, { toolName: { in: roleEligibleTools } }] }
          : { requestedById: operatorId };
    } else {
      approvalFilter = { requestedById: operatorId };
    }
  }

  let tenantScopeFilter: Record<string, any> | undefined;
  if (apiKeyActor && apiKeyActor.kind === 'api_key') {
    const isWildcard =
      apiKeyActor.capabilities.includes('*') ||
      apiKeyActor.capabilities.includes('admin') ||
      apiKeyActor.allowedTenants.includes('*');
    if (!isWildcard) {
      const allowed = apiKeyActor.allowedTenants.filter((t) => t && t !== '*');
      if (allowed.length === 0) {
        tenantScopeFilter = { id: '__none__' };
      } else {
        tenantScopeFilter = {
          OR: [
            { tenantScope: { in: allowed } },
            ...allowed.map((t) => ({ tenantScope: { contains: t } })),
          ],
        };
      }
    }
  }

  const [recentExecutions, pendingApprovals, perToolStats, aggTotals, blockedInjectionCount] =
    await Promise.all([
      prisma.mcpToolInvocation.findMany({
        where: tenantScopeFilter,
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.mcpToolApproval.findMany({
        where: {
          status: 'PROPOSED',
          expiresAt: { gt: now },
          ...(approvalFilter || {}),
          ...(tenantScopeFilter || {}),
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
        where: tenantScopeFilter,
        _count: { _all: true },
        _avg: { latencyMs: true },
      }),
      prisma.mcpToolInvocation.aggregate({
        where: tenantScopeFilter,
        _count: { _all: true },
        _sum: { redactionsApplied: true, secretsFiltered: true },
      }),
      prisma.mcpToolInvocation.count({
        where: { injectionBlocked: true, ...(tenantScopeFilter || {}) },
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
    executionEnabled: isMcpExecutionEnabled(),
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
  const callerAgent = buildCallerAgent(actor, input.agentCaller);
  const rawParams = input.parameters && typeof input.parameters === 'object' ? input.parameters : {};
  const redactedInput = redactSensitiveData(rawParams, { maskEmails: true });
  const toolName = typeof input.toolName === 'string' ? input.toolName.trim() : '';
  const boundedToolName = toolName.slice(0, 120) || 'unknown';
  const rawTenantGuess =
    typeof (rawParams as any).tenantId === 'string'
      ? String((rawParams as any).tenantId).trim() || 'unscoped'
      : typeof (rawParams as any).idOrSlug === 'string'
        ? String((rawParams as any).idOrSlug).trim() || 'unscoped'
        : 'platform';

  if (!isMcpExecutionEnabled()) {
    const msg = 'MCP tool execution is disabled (ORBITOX_MCP_EXECUTION_ENABLED must be enabled).';
    await recordInvocationAndAudit({
      toolName: boundedToolName,
      serverId: 'mcp-gateway',
      approvalPolicy: 'READ_FREELY',
      status: 'BLOCKED_UNAVAILABLE',
      actor,
      callerAgent,
      tenantScope: rawTenantGuess,
      sanitizedParams: redactedInput.value,
      errorCode: 'MCP_EXECUTION_DISABLED',
      errorMessage: msg,
      latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
      redactionsApplied: redactedInput.redactionsApplied,
      secretsFiltered: redactedInput.secretsFiltered,
      auditAction: 'MCP_EXECUTION_DISABLED',
      auditReason: msg,
    });
    throw new McpToolError(503, 'MCP_EXECUTION_DISABLED', msg);
  }

  if (!toolName) {
    const msg = 'toolName is required.';
    await recordInvocationAndAudit({
      toolName: 'unknown',
      serverId: 'mcp-gateway',
      approvalPolicy: 'READ_FREELY',
      status: 'BLOCKED_VALIDATION',
      actor,
      callerAgent,
      tenantScope: rawTenantGuess,
      sanitizedParams: redactedInput.value,
      errorCode: 'INVALID_INPUT',
      errorMessage: msg,
      latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
      redactionsApplied: redactedInput.redactionsApplied,
      secretsFiltered: redactedInput.secretsFiltered,
      auditAction: 'MCP_TOOL_VALIDATION_FAILED',
      auditReason: msg,
    });
    throw new McpToolError(400, 'INVALID_INPUT', msg);
  }

  const tool = findMcpTool(toolName);
  if (!tool) {
    const msg = `MCP tool ${toolName} is not registered in server inventory.`;
    await recordInvocationAndAudit({
      toolName: boundedToolName,
      serverId: 'mcp-gateway',
      approvalPolicy: 'READ_FREELY',
      status: 'BLOCKED_VALIDATION',
      actor,
      callerAgent,
      tenantScope: rawTenantGuess,
      sanitizedParams: redactedInput.value,
      errorCode: 'TOOL_NOT_FOUND',
      errorMessage: msg,
      latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
      redactionsApplied: redactedInput.redactionsApplied,
      secretsFiltered: redactedInput.secretsFiltered,
      auditAction: 'MCP_TOOL_NOT_FOUND',
      auditReason: msg,
    });
    throw new McpToolError(404, 'TOOL_NOT_FOUND', msg);
  }

  if (!tool.available) {
    const msg = `MCP tool ${toolName} is currently unavailable in this deployment.`;
    await recordInvocationAndAudit({
      toolName: tool.toolName,
      serverId: tool.serverId,
      approvalPolicy: tool.approvalPolicy,
      status: 'BLOCKED_UNAVAILABLE',
      actor,
      callerAgent,
      tenantScope: tool.tenantScopeMode === 'PLATFORM_GLOBAL' ? 'platform' : rawTenantGuess,
      sanitizedParams: redactedInput.value,
      errorCode: 'TOOL_UNAVAILABLE',
      errorMessage: msg,
      latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
      redactionsApplied: redactedInput.redactionsApplied,
      secretsFiltered: redactedInput.secretsFiltered,
      auditAction: 'MCP_TOOL_UNAVAILABLE',
      auditReason: msg,
    });
    throw new McpToolError(501, 'TOOL_UNAVAILABLE', msg);
  }

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
      const msg = `Tool ${tool.toolName} requires an explicit tenantId or project slug and cannot run in global scope.`;
      await recordInvocationAndAudit({
        toolName: tool.toolName,
        serverId: tool.serverId,
        approvalPolicy: tool.approvalPolicy,
        status: 'BLOCKED_VALIDATION',
        actor,
        callerAgent,
        tenantScope: 'unscoped',
        sanitizedParams: redactedInput.value,
        errorCode: 'TENANT_SCOPE_REQUIRED',
        errorMessage: msg,
        latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
        redactionsApplied: redactedInput.redactionsApplied,
        secretsFiltered: redactedInput.secretsFiltered,
        auditAction: 'MCP_TOOL_VALIDATION_FAILED',
        auditReason: msg,
      });
      throw new McpToolError(400, 'TENANT_SCOPE_REQUIRED', msg);
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
    const issues = parsed.error.issues.map((i) => `${i.path.join('.') || 'root'}: ${i.message}`);
    const msg = 'Tool parameters failed schema validation.';
    await recordInvocationAndAudit({
      toolName: tool.toolName,
      serverId: tool.serverId,
      approvalPolicy: tool.approvalPolicy,
      status: 'BLOCKED_VALIDATION',
      actor,
      callerAgent,
      tenantScope: initialTenantScope,
      sanitizedParams: redactedInput.value,
      errorCode: 'INVALID_INPUT',
      errorMessage: `${msg} (${issues.join('; ')})`.slice(0, 500),
      latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
      redactionsApplied: redactedInput.redactionsApplied,
      secretsFiltered: redactedInput.secretsFiltered,
      auditAction: 'MCP_TOOL_VALIDATION_FAILED',
      auditReason: msg,
    });
    throw new McpToolError(400, 'INVALID_INPUT', msg, { issues });
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
    const outboxTenantId = await resolveCanonicalOutboxTenantScope(proposalMeta.tenantScope);

    const canonicalProposed = buildCanonicalMcpAuditEvent({
      eventType: 'mcp.audit.approval_proposed',
      approvalId,
      toolName: tool.toolName,
      serverId: tool.serverId,
      approvalPolicy: tool.approvalPolicy,
      tenantScope: proposalMeta.tenantScope,
      canonicalTenantId: outboxTenantId,
      actorId: actor.actorId,
      actorEmail: actor.actorEmail,
      paramsHash,
      sanitizedParams: sanitizedProposalParams.value,
      reason: proposalMeta.previewSummary,
    });

    const approval = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${outboxTenantId}, true)`;
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
          tenantId: outboxTenantId,
          eventType: canonicalProposed.outboxEventType,
          aggregateType: canonicalProposed.aggregateType,
          aggregateId: canonicalProposed.aggregateId,
          deduplicationKey: canonicalProposed.deduplicationKey,
          payload: canonicalProposed.outboxPayload as any,
        },
      });

      return created;
    });

    try {
      await platformRepository.recordPlatformAdminAudit(canonicalProposed.auditInput);
      await prisma.$executeRaw`
        UPDATE "PlatformOutboxMessage"
        SET "status" = 'DISPATCHED',
            "dispatchedAt" = NOW(),
            "updatedAt" = NOW()
        WHERE "tenantId" = ${outboxTenantId}
          AND "deduplicationKey" = ${canonicalProposed.deduplicationKey}
          AND "status" = 'PENDING'
      `.catch(() => {});
    } catch (auditErr: any) {
      await prisma.mcpToolApproval
        .updateMany({ where: { id: approval.id, status: 'PROPOSED' }, data: { status: 'FAILED' } })
        .catch(() => { });
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
    emergencySelfApproval?: unknown;
  },
  actor: McpActorContext,
  deps?: McpGovernanceFaultDeps,
) {
  const startedAt = performance.now();
  const recordAudit = deps?.recordAudit ?? platformRepository.recordPlatformAdminAudit;

  if (Boolean(input.emergencySelfApproval)) {
    throw new McpToolError(
      403,
      'EMERGENCY_SELF_APPROVAL_DISABLED',
      'emergencySelfApproval bypass is prohibited in normal MCP approval flows.',
    );
  }

  if (!isMcpExecutionEnabled()) {
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
    if (err instanceof McpCryptoError && err.code !== 'MCP_CONFIG_INVALID' && err.code !== 'MCP_KEY_UNAVAILABLE') {
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
  const outboxTenantId = await resolveCanonicalOutboxTenantScope(existing.tenantScope);
  const deterministicIntentAuditId = mcpAuditEventId(executionId, 'intent');
  const deterministicFinalAuditId = mcpAuditEventId(executionId, 'final');

  const canonicalIntent = buildCanonicalMcpAuditEvent({
    eventType: 'mcp.audit.execution_intent',
    approvalId: cleanId,
    executionId,
    toolName: tool.toolName,
    serverId: tool.serverId,
    approvalPolicy: tool.approvalPolicy,
    tenantScope: existing.tenantScope,
    canonicalTenantId: outboxTenantId,
    actorId: actor.actorId,
    actorEmail: actor.actorEmail,
    idempotencyKey,
    paramsHash: existing.paramsHash,
    sanitizedParams: redactedParams.value,
    reason: suppliedReason || `Execution intent for ${tool.toolName} (${cleanId})`,
  });

  // Correction A & B: Atomic Claim + Execution Intent + Append-only Invocation Intent + RLS-Scoped Internal Outbox Intent
  let claimedTxResult: { approval: typeof existing; intentInvocationId: string };
  try {
    claimedTxResult = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${outboxTenantId}, true)`;
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
          delegationId: null,
          delegatedById: null,
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
          tenantId: outboxTenantId,
          eventType: canonicalIntent.outboxEventType,
          aggregateType: canonicalIntent.aggregateType,
          aggregateId: canonicalIntent.aggregateId,
          deduplicationKey: canonicalIntent.deduplicationKey,
          payload: canonicalIntent.outboxPayload as any,
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

  // Write-ahead immutable audit event (deterministic ID -> safe cross-connection replay) BEFORE business side effect begins
  let intentAuditId: string | null = null;
  try {
    intentAuditId = await recordAudit(canonicalIntent.auditInput);
    await prisma.$executeRaw`
      UPDATE "PlatformOutboxMessage"
      SET "status" = 'DISPATCHED',
          "dispatchedAt" = NOW(),
          "updatedAt" = NOW()
      WHERE "tenantId" = ${outboxTenantId}
        AND "deduplicationKey" = ${canonicalIntent.deduplicationKey}
        AND "status" = 'PENDING'
    `.catch(() => {});
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
    await prisma.$executeRaw`
      UPDATE "PlatformOutboxMessage"
      SET "status" = 'FAILED',
          "lastError" = ${auditErr?.message || 'Pre-execution audit failed'},
          "updatedAt" = NOW()
      WHERE "tenantId" = ${outboxTenantId}
        AND "deduplicationKey" = ${canonicalIntent.deduplicationKey}
        AND "status" = 'PENDING'
    `.catch(() => {});
    await prisma.$transaction([
      prisma.mcpToolExecution.updateMany({
        where: { id: executionId, status: 'EXECUTION_INTENT' },
        data: { status: 'EXECUTION_FAILED', lastErrorCode: 'AUDIT_UNAVAILABLE', lastErrorMessage: 'Pre-execution audit failed.' },
      }),
      prisma.mcpToolApproval.updateMany({
        where: { id: cleanId, status: 'EXECUTING' },
        data: { status: 'FAILED' },
      }),
    ]).catch(() => { });
    throw new McpToolError(
      503,
      'AUDIT_UNAVAILABLE',
      `Audit persistence failed before executing ${tool.toolName}; no business side effect occurred.`,
    );
  }

  // Fenced transition Execution -> EXECUTION_RUNNING immediately before tool.execute
  const fenceCheckTime = new Date();
  const startFence = await prisma.mcpToolExecution.updateMany({
    where: {
      id: executionId,
      status: 'EXECUTION_INTENT',
      leaseOwner,
      leaseExpiresAt: { gt: fenceCheckTime },
    },
    data: {
      status: 'EXECUTION_RUNNING',
      auditIntentEventId: intentAuditId,
      leaseExpiresAt: new Date(fenceCheckTime.getTime() + EXECUTION_LEASE_MS),
    },
  });
  if (startFence.count !== 1) {
    throw new McpToolError(409, 'LEASE_FENCED', `Execution ${executionId} lost its lease or lease expired before starting.`);
  }

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

    const canonicalSuccess = buildCanonicalMcpAuditEvent({
      eventType: 'mcp.audit.execution_succeeded',
      approvalId: cleanId,
      executionId,
      toolName: tool.toolName,
      serverId: tool.serverId,
      approvalPolicy: tool.approvalPolicy,
      tenantScope: execResult.tenantScope,
      canonicalTenantId: outboxTenantId,
      actorId: actor.actorId,
      actorEmail: actor.actorEmail,
      idempotencyKey,
      paramsHash: existing.paramsHash,
      latencyMs,
      reason: suppliedReason || `Operator approved ${tool.toolName} (${cleanId})`,
    });

    let finalAuditId: string | null = null;
    try {
      finalAuditId = await recordAudit(canonicalSuccess.auditInput);
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
      const recoveryMarkAt = new Date();
      await prisma.$transaction(async (tx) => {
        const fencedRecovery = await tx.mcpToolExecution.updateMany({
          where: {
            id: executionId,
            status: 'EXECUTION_RUNNING',
            leaseOwner,
            leaseExpiresAt: { gt: recoveryMarkAt },
          },
          data: {
            status: 'RECOVERY_REQUIRED',
            reconciliationStatus: 'AUDIT_FINALIZATION_FAILED',
            lastErrorCode: 'AUDIT_FINALIZATION_FAILED',
            lastErrorMessage: postAuditErr?.message || 'Post-execution audit write failed.',
          },
        });
        if (fencedRecovery.count !== 1) {
          throw new McpToolError(
            409,
            'LEASE_FENCED',
            `Execution ${executionId} lost its lease while marking RECOVERY_REQUIRED.`,
          );
        }
        await tx.mcpToolApproval.updateMany({
          where: { id: cleanId, status: 'EXECUTING' },
          data: { status: 'RECOVERY_REQUIRED' },
        });
        await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${outboxTenantId}, true)`;
        await tx.platformOutboxMessage.createMany({
          data: [
            {
              tenantId: outboxTenantId,
              eventType: canonicalSuccess.outboxEventType,
              aggregateType: canonicalSuccess.aggregateType,
              aggregateId: canonicalSuccess.aggregateId,
              deduplicationKey: canonicalSuccess.deduplicationKey,
              payload: canonicalSuccess.outboxPayload as any,
            },
          ],
          skipDuplicates: true,
        });
      });
      throw new McpToolError(
        500,
        'AUDIT_FINALIZATION_FAILED',
        `Execution ${executionId} completed or started, but audit finalization failed; marked RECOVERY_REQUIRED (do not blindly retry).`,
        { executionId, approvalId: cleanId },
      );
    }

    const finalInvocationId = `mcp_inv_${crypto.randomUUID()}`;
    const finalizeTime = new Date();
    const { updatedApproval, finalInvocation } = await prisma.$transaction(async (tx) => {
      const fenced = await tx.mcpToolExecution.updateMany({
        where: {
          id: executionId,
          status: 'EXECUTION_RUNNING',
          leaseOwner,
          leaseExpiresAt: { gt: finalizeTime },
        },
        data: {
          status: 'AUTHORIZED_EXECUTED',
          invocationId: finalInvocationId,
          finalAuditEventId: finalAuditId,
          reconciliationStatus: 'COMPLETED',
        },
      });
      if (fenced.count !== 1) {
        throw new McpToolError(
          409,
          'LEASE_FENCED',
          `Execution ${executionId} lost its lease or was already reconciled before finalization.`,
        );
      }

      const createdInvocation = await tx.mcpToolInvocation.create({
        data: {
          id: finalInvocationId,
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

      const approval = await tx.mcpToolApproval.update({
        where: { id: cleanId },
        data: { status: 'SUCCEEDED', invocationId: createdInvocation.id },
      });

      return { updatedApproval: approval, finalInvocation: createdInvocation };
    });

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
    if (err instanceof McpToolError && (err.code === 'AUDIT_FINALIZATION_FAILED' || err.code === 'LEASE_FENCED')) {
      throw err;
    }
    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
    const code = err instanceof McpToolError ? err.code : 'MCP_EXECUTION_FAILED';
    const message = err?.message || 'Approved execution failed.';

    const canonicalFail = buildCanonicalMcpAuditEvent({
      eventType: 'mcp.audit.execution_failed',
      approvalId: cleanId,
      executionId,
      toolName: tool.toolName,
      serverId: tool.serverId,
      approvalPolicy: tool.approvalPolicy,
      tenantScope: existing.tenantScope,
      canonicalTenantId: outboxTenantId,
      actorId: actor.actorId,
      actorEmail: actor.actorEmail,
      idempotencyKey,
      paramsHash: existing.paramsHash,
      errorCode: code,
      latencyMs,
      reason: `Approved execution for ${tool.toolName} failed: ${code}`,
    });

    let failAuditId: string | null = null;
    try {
      failAuditId = await recordAudit(canonicalFail.auditInput);
    } catch (failAuditErr: any) {
      console.error(
        JSON.stringify({
          event: 'mcp.audit_failure_fallback_outbox',
          executionId,
          approvalId: cleanId,
          error: failAuditErr?.message || String(failAuditErr),
          timestamp: new Date().toISOString(),
        }),
      );
    }

    const failedInvocationId = `mcp_inv_${crypto.randomUUID()}`;
    const failFenceTime = new Date();
    await prisma.$transaction(async (tx) => {
      const fenced = await tx.mcpToolExecution.updateMany({
        where: {
          id: executionId,
          status: { in: ['EXECUTION_INTENT', 'EXECUTION_RUNNING'] },
          leaseOwner,
          leaseExpiresAt: { gt: failFenceTime },
        },
        data: {
          status: 'EXECUTION_FAILED',
          invocationId: failedInvocationId,
          finalAuditEventId: failAuditId,
          reconciliationStatus: failAuditId ? 'COMPLETED' : 'AUDIT_OUTBOX_PENDING',
          lastErrorCode: code,
          lastErrorMessage: message,
        },
      });
      if (fenced.count !== 1) {
        throw new McpToolError(
          409,
          'LEASE_FENCED',
          `Execution ${executionId} lost its lease before recording failure state.`,
        );
      }

      await tx.mcpToolInvocation.create({
        data: {
          id: failedInvocationId,
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

      await tx.mcpToolApproval.updateMany({
        where: { id: cleanId, status: 'EXECUTING' },
        data: { status: 'FAILED', invocationId: failedInvocationId },
      });

      if (!failAuditId) {
        await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${outboxTenantId}, true)`;
        await tx.platformOutboxMessage.createMany({
          data: [
            {
              tenantId: outboxTenantId,
              eventType: canonicalFail.outboxEventType,
              aggregateType: canonicalFail.aggregateType,
              aggregateId: canonicalFail.aggregateId,
              deduplicationKey: canonicalFail.deduplicationKey,
              payload: canonicalFail.outboxPayload as any,
            },
          ],
          skipDuplicates: true,
        });
      }
    });

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
    const scopeParts = parseCanonicalAuditScope(existing.tenantScope);
    await recordAudit({
      deterministicId: mcpAuditEventId(cleanId, 'recovery'),
      action: 'MCP_APPROVAL_REJECTED',
      entityType: 'MCP_APPROVAL',
      entityId: cleanId,
      actorId: actor.actorId,
      actorEmail: actor.actorEmail ?? undefined,
      organizationId: scopeParts.organizationId,
      projectId: scopeParts.projectId,
      environmentId: scopeParts.environmentId,
      requestId: cleanId,
      reason,
      metadata: {
        approvalId: cleanId,
        toolName: existing.toolName,
        tenantScope: existing.tenantScope,
        requestedById: existing.requestedById,
        delegationId: null,
        delegatedById: null,
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
 * Preflight key retirement check: refuses retirement while any pending, executing, recovery-required,
 * or within-retention record still references the key ID. Zero operator retention bypass allowed.
 */
export async function canRetireMcpKey(
  kid: string,
  kind: 'encryption' | 'hmac',
  options: { retentionDays?: number; now?: Date } = {},
): Promise<{
  canRetire: boolean;
  blockingApprovals: number;
  blockingExecutions: number;
  retainedApprovals: number;
  retentionCutoff: string;
}> {
  const effectiveDays = resolveMcpKeyRetentionDays(options.retentionDays);
  const now = options.now ?? new Date();
  const retentionCutoff = new Date(now.getTime() - effectiveDays * 86_400_000);

  const approvalWhere =
    kind === 'encryption'
      ? { encryptionKid: kid, status: { in: ['PROPOSED', 'EXECUTING', 'RECOVERY_REQUIRED'] } }
      : { hmacKid: kid, status: { in: ['PROPOSED', 'EXECUTING', 'RECOVERY_REQUIRED'] } };
  const execWhere =
    kind === 'encryption'
      ? { encryptionKid: kid, status: { in: ['EXECUTION_INTENT', 'EXECUTION_RUNNING', 'RECOVERY_REQUIRED'] } }
      : { hmacKid: kid, status: { in: ['EXECUTION_INTENT', 'EXECUTION_RUNNING', 'RECOVERY_REQUIRED'] } };
  const retainedWhere =
    kind === 'encryption'
      ? { encryptionKid: kid, createdAt: { gt: retentionCutoff } }
      : { hmacKid: kid, createdAt: { gt: retentionCutoff } };

  const [blockingApprovals, blockingExecutions, retainedApprovals] = await Promise.all([
    prisma.mcpToolApproval.count({ where: approvalWhere }),
    prisma.mcpToolExecution.count({ where: execWhere }),
    prisma.mcpToolApproval.count({ where: retainedWhere }),
  ]);

  return {
    canRetire: blockingApprovals === 0 && blockingExecutions === 0 && retainedApprovals === 0,
    blockingApprovals,
    blockingExecutions,
    retainedApprovals,
    retentionCutoff: retentionCutoff.toISOString(),
  };
}

/**
 * Reconciles stale EXECUTION_INTENT, expired EXECUTION_RUNNING, and RECOVERY_REQUIRED executions
 * without blindly repeating business side effects. Uses deterministic audit IDs and domain correlation.
 */
export async function reconcileStaleMcpExecutions(
  options: {
    now?: Date;
    deps?: McpGovernanceFaultDeps;
    maintenancePrisma?: typeof prisma;
    workerId?: string;
  } = {},
): Promise<{ reconciled: number; ids: string[] }> {
  const now = options.now ?? new Date();
  const db = options.maintenancePrisma ?? prisma;
  const recordAudit = options.deps?.recordAudit ?? platformRepository.recordPlatformAdminAudit;
  const reconcilerLeaseOwner = options.workerId || `reconciler:${crypto.randomUUID()}`;
  const reconcilerLeaseExpiresAt = new Date(now.getTime() + EXECUTION_LEASE_MS);

  const candidates = await db.mcpToolExecution.findMany({
    where: {
      OR: [
        { status: 'RECOVERY_REQUIRED' },
        { status: { in: ['EXECUTION_INTENT', 'EXECUTION_RUNNING'] }, leaseExpiresAt: { lte: now } },
      ],
    },
    include: {
      approval: {
        select: { id: true, sanitizedParams: true, tenantScope: true },
      },
    },
    take: 50,
  });

  const reconciledIds: string[] = [];
  for (const exec of candidates) {
    // Conditional reconciler claim prevents concurrent workers/reconcilers from racing on the same execution.
    const claimed = await db.mcpToolExecution.updateMany({
      where: {
        id: exec.id,
        OR: [
          {
            status: 'RECOVERY_REQUIRED',
            OR: [
              { leaseOwner: null },
              { leaseExpiresAt: null },
              { leaseExpiresAt: { lte: now } },
              { NOT: { leaseOwner: { startsWith: 'reconciler:' } } },
            ],
          },
          {
            status: { in: ['EXECUTION_INTENT', 'EXECUTION_RUNNING'] },
            leaseExpiresAt: { lte: now },
          },
        ],
      },
      data: {
        leaseOwner: reconcilerLeaseOwner,
        leaseExpiresAt: reconcilerLeaseExpiresAt,
      },
    });
    if (claimed.count !== 1) {
      continue;
    }

    let resolvedStatus: 'AUTHORIZED_EXECUTED' | 'EXECUTION_FAILED' | 'RECOVERY_REQUIRED' | 'STILL_RUNNING' =
      'RECOVERY_REQUIRED';
    let reconciliationNote = 'Requires manual verification';
    const sanitizedParams = (exec.approval?.sanitizedParams || {}) as Record<string, any>;

    if (exec.status === 'EXECUTION_INTENT') {
      resolvedStatus = 'EXECUTION_FAILED';
      reconciliationNote = 'RECONCILED_NOT_STARTED';
    } else if (exec.toolName === 'billing.send_payment_reminder') {
      const subIds = Array.isArray(sanitizedParams.subscriptionIds)
        ? sanitizedParams.subscriptionIds.filter((s: unknown): s is string => typeof s === 'string' && s.length > 0)
        : [];
      const expectedKeys = subIds.map((subId) => `${exec.idempotencyKey}:${subId}`);
      const [outboxCount, batchItems] = await Promise.all([
        expectedKeys.length > 0
          ? db.accountEmailOutbox.count({ where: { idempotencyKey: { in: expectedKeys } } })
          : db.accountEmailOutbox.count({ where: { idempotencyKey: { startsWith: `${exec.idempotencyKey}:` } } }),
        db.billingReminderBatchItem.findMany({ where: { executionId: exec.id } }).catch(() => []),
      ]);

      const ledgerSucceededCount = batchItems.filter((item) => item.status !== 'FAILED').length;
      const effectiveSucceeded = Math.max(outboxCount, ledgerSucceededCount);

      if (expectedKeys.length > 0 && effectiveSucceeded >= expectedKeys.length && batchItems.every((i) => i.status !== 'FAILED')) {
        resolvedStatus = 'AUTHORIZED_EXECUTED';
        reconciliationNote = `RECONCILED_OUTBOX_FOUND:${effectiveSucceeded}/${expectedKeys.length}`;
      } else if (expectedKeys.length === 0 && effectiveSucceeded > 0) {
        resolvedStatus = 'AUTHORIZED_EXECUTED';
        reconciliationNote = `RECONCILED_OUTBOX_FOUND:${effectiveSucceeded}`;
      } else if (effectiveSucceeded > 0 || batchItems.some((i) => i.status === 'FAILED')) {
        resolvedStatus = 'RECOVERY_REQUIRED';
        reconciliationNote = `RECONCILED_PARTIAL_OUTBOX:${effectiveSucceeded}/${expectedKeys.length}`;
      } else if (exec.status === 'EXECUTION_RUNNING' && exec.leaseExpiresAt && exec.leaseExpiresAt.getTime() <= now.getTime()) {
        resolvedStatus = 'EXECUTION_FAILED';
        reconciliationNote = 'RECONCILED_NO_OUTBOX_ROWS';
      }
    } else if (exec.toolName === 'tenants.suspend') {
      const proj = await db.platformProject.findFirst({
        where: { OR: [{ id: exec.tenantScope }, { slug: exec.tenantScope }] },
        select: { id: true, organizationId: true, status: true },
      });
      if (proj?.status === 'SUSPENDED') {
        const canonicalPrefix = `org/${proj.organizationId}/project/${proj.id}/`;
        const [nonSuspendedInstalls, syncRecords] = await Promise.all([
          db.pluginInstallation.count({
            where: {
              OR: [{ tenantId: proj.id }, { tenantId: { startsWith: canonicalPrefix } }],
              status: { notIn: ['SUSPENDED', 'ARCHIVED'] },
            },
          }),
          db.tenantSuspensionSync.findMany({ where: { projectId: proj.id } }).catch(() => []),
        ]);
        const degradedSyncCount = syncRecords.filter((s) => s.status !== 'ACKNOWLEDGED').length;
        if (nonSuspendedInstalls === 0 && degradedSyncCount === 0) {
          resolvedStatus = 'AUTHORIZED_EXECUTED';
          reconciliationNote = 'RECONCILED_TENANT_SUSPENDED';
        } else if (nonSuspendedInstalls > 0) {
          resolvedStatus = 'RECOVERY_REQUIRED';
          reconciliationNote = `RECONCILED_INSTALLATIONS_PENDING:${nonSuspendedInstalls}`;
        } else {
          resolvedStatus = 'RECOVERY_REQUIRED';
          reconciliationNote = `RECONCILED_EXTERNAL_SYNC_DEGRADED:${degradedSyncCount}`;
        }
      }
    } else if (exec.toolName === 'provisioning.retry') {
      const operationId = typeof sanitizedParams.operationId === 'string' ? sanitizedParams.operationId : '';
      const attempt = await db.platformOperationAttempt
        .findFirst({ where: { mcpExecutionId: exec.id } })
        .catch(() => null);

      if (attempt) {
        if (attempt.status === 'SUCCEEDED') {
          resolvedStatus = 'AUTHORIZED_EXECUTED';
          reconciliationNote = 'RECONCILED_PROVISIONING_COMPLETED';
        } else if (attempt.status === 'FAILED' || attempt.status === 'CANCELLED') {
          resolvedStatus = 'EXECUTION_FAILED';
          reconciliationNote = `RECONCILED_PROVISIONING_${attempt.status}`;
        } else if (attempt.status === 'SUPERSEDED') {
          resolvedStatus = 'EXECUTION_FAILED';
          reconciliationNote = `RECONCILED_ATTEMPT_SUPERSEDED:${attempt.operationId}`;
        } else {
          const op = operationId
            ? await db.platformOperation.findUnique({ where: { id: operationId } })
            : await db.platformOperation.findUnique({ where: { id: attempt.operationId } });
          if (op && ['ACTIVE', 'COMPLETED'].includes(op.status)) {
            resolvedStatus = 'AUTHORIZED_EXECUTED';
            reconciliationNote = 'RECONCILED_PROVISIONING_COMPLETED';
          } else if (op && ['FAILED', 'CANCELLED'].includes(op.status)) {
            resolvedStatus = 'EXECUTION_FAILED';
            reconciliationNote = `RECONCILED_PROVISIONING_${op.status}`;
          } else if (op?.leaseExpiresAt && op.leaseExpiresAt.getTime() > now.getTime()) {
            resolvedStatus = 'STILL_RUNNING';
          } else {
            resolvedStatus = 'RECOVERY_REQUIRED';
            reconciliationNote = 'RECONCILED_OPERATION_LEASE_EXPIRED';
          }
        }
      } else if (operationId) {
        const op = await db.platformOperation.findUnique({ where: { id: operationId } });
        if (!op) {
          resolvedStatus = 'EXECUTION_FAILED';
          reconciliationNote = 'RECONCILED_OPERATION_NOT_FOUND';
        } else {
          const opMatchesCorrelation =
            op.lastMcpExecutionId === exec.id || op.leaseOwner === `mcp:${exec.id}`;
          if (!opMatchesCorrelation) {
            resolvedStatus = 'RECOVERY_REQUIRED';
            reconciliationNote = 'CORRELATION_MISMATCH_OR_SUPERSEDED';
          } else if (['ACTIVE', 'COMPLETED'].includes(op.status)) {
            resolvedStatus = 'AUTHORIZED_EXECUTED';
            reconciliationNote = 'RECONCILED_PROVISIONING_COMPLETED';
          } else if (['FAILED', 'CANCELLED'].includes(op.status)) {
            resolvedStatus = 'EXECUTION_FAILED';
            reconciliationNote = `RECONCILED_PROVISIONING_${op.status}`;
          } else if (op.leaseExpiresAt && op.leaseExpiresAt.getTime() > now.getTime()) {
            resolvedStatus = 'STILL_RUNNING';
          } else {
            resolvedStatus = 'RECOVERY_REQUIRED';
            reconciliationNote = 'RECONCILED_OPERATION_LEASE_EXPIRED';
          }
        }
      }
    }

    if (resolvedStatus === 'STILL_RUNNING') {
      await db.mcpToolExecution.updateMany({
        where: { id: exec.id, leaseOwner: reconcilerLeaseOwner },
        data: { leaseOwner: null, leaseExpiresAt: null },
      });
      continue;
    }

    if (resolvedStatus === 'RECOVERY_REQUIRED') {
      await db.mcpToolExecution.updateMany({
        where: {
          id: exec.id,
          status: { in: ['EXECUTION_RUNNING', 'RECOVERY_REQUIRED'] },
          leaseOwner: reconcilerLeaseOwner,
        },
        data: {
          status: 'RECOVERY_REQUIRED',
          reconciliationStatus: reconciliationNote,
          leaseOwner: null,
          leaseExpiresAt: null,
        },
      });
      await db.mcpToolApproval.updateMany({
        where: { id: exec.approvalId, status: 'EXECUTING' },
        data: { status: 'RECOVERY_REQUIRED' },
      });
      continue;
    }

    const canonicalRecovery = buildCanonicalMcpAuditEvent({
      eventType: 'mcp.audit.recovery_completed',
      approvalId: exec.approvalId,
      executionId: exec.id,
      toolName: exec.toolName,
      tenantScope: exec.tenantScope,
      canonicalTenantId: exec.tenantScope,
      actorId: 'system:mcp-reconciler',
      resolvedStatus,
      reconciliationNote,
      reason: `Reconciled ${exec.toolName} (${exec.id}) -> ${resolvedStatus} (${reconciliationNote})`,
    });

    let auditId: string | null = null;
    try {
      auditId = await recordAudit(canonicalRecovery.auditInput);
    } catch (recAuditErr: any) {
      console.error(
        JSON.stringify({
          event: 'mcp.reconciler_audit_failure_fallback_outbox',
          executionId: exec.id,
          error: recAuditErr?.message || String(recAuditErr),
          timestamp: new Date().toISOString(),
        }),
      );
    }

    await db.$transaction(async (tx) => {
      const updatedExec = await tx.mcpToolExecution.updateMany({
        where: {
          id: exec.id,
          status: { in: ['EXECUTION_INTENT', 'EXECUTION_RUNNING', 'RECOVERY_REQUIRED'] },
          leaseOwner: reconcilerLeaseOwner,
          leaseExpiresAt: { gt: now },
        },
        data: {
          status: resolvedStatus,
          finalAuditEventId: auditId,
          reconciliationStatus: reconciliationNote,
          leaseOwner: null,
          leaseExpiresAt: null,
        },
      });
      if (updatedExec.count === 1) {
        await tx.mcpToolApproval.updateMany({
          where: { id: exec.approvalId, status: { in: ['EXECUTING', 'RECOVERY_REQUIRED'] } },
          data: { status: resolvedStatus === 'AUTHORIZED_EXECUTED' ? 'SUCCEEDED' : 'FAILED' },
        });
        reconciledIds.push(exec.id);
      }

      if (!auditId) {
        await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${exec.tenantScope}, true)`;
        await tx.platformOutboxMessage.createMany({
          data: [
            {
              tenantId: exec.tenantScope,
              eventType: canonicalRecovery.outboxEventType,
              aggregateType: canonicalRecovery.aggregateType,
              aggregateId: canonicalRecovery.aggregateId,
              deduplicationKey: canonicalRecovery.deduplicationKey,
              payload: canonicalRecovery.outboxPayload as any,
            },
          ],
          skipDuplicates: true,
        });
      }
    });
  }

  return { reconciled: reconciledIds.length, ids: reconciledIds };
}
