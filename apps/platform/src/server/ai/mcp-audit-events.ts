import 'server-only';
import crypto from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { redactSensitiveData } from './mcp-guardrails';
import type { PlatformAdminAuditInput } from '@/server/db/platform-repository';

export const PLATFORM_CANONICAL_SCOPE = 'org/platform/project/operations/environment/platform-admin';

export interface CanonicalAuditScopeParts {
  organizationId: string | undefined;
  projectId: string | undefined;
  environmentId: string | undefined;
  canonicalScope: string;
}

export function parseCanonicalAuditScope(scope: string): CanonicalAuditScopeParts {
  const clean = (scope || '').trim();
  const match = /^org\/([^/]+)\/project\/([^/]+)\/environment\/([^/]+)$/.exec(clean);
  if (match) {
    const [, orgId, projId, envId] = match;
    if (orgId === 'platform' && projId === 'operations' && envId === 'platform-admin') {
      return {
        organizationId: undefined,
        projectId: undefined,
        environmentId: undefined,
        canonicalScope: clean,
      };
    }
    return {
      organizationId: orgId,
      projectId: projId,
      environmentId: envId,
      canonicalScope: clean,
    };
  }
  return {
    organizationId: undefined,
    projectId: undefined,
    environmentId: undefined,
    canonicalScope: PLATFORM_CANONICAL_SCOPE,
  };
}

export interface CanonicalMcpEnvelopeInput {
  eventType:
    | 'mcp.audit.approval_proposed'
    | 'mcp.audit.execution_intent'
    | 'mcp.audit.execution_succeeded'
    | 'mcp.audit.execution_failed'
    | 'mcp.audit.recovery_completed';
  approvalId?: string;
  executionId?: string;
  toolName: string;
  serverId?: string;
  approvalPolicy?: string;
  tenantScope: string;
  canonicalTenantId: string;
  actorId: string;
  actorEmail?: string | null;
  idempotencyKey?: string;
  paramsHash?: string;
  sanitizedParams?: unknown;
  reason?: string;
  errorCode?: string;
  latencyMs?: number;
  delegationId?: string | null;
  delegatedById?: string | null;
  invocationId?: string;
  reconciliationNote?: string;
  resolvedStatus?: string;
}

export interface CanonicalMcpAuditEnvelope {
  outboxEventType: string;
  aggregateType: 'MCP_APPROVAL' | 'MCP_EXECUTION';
  aggregateId: string;
  deduplicationKey: string;
  canonicalTenantId: string;
  auditInput: PlatformAdminAuditInput;
  outboxPayload: Record<string, any>;
}

export function buildCanonicalMcpAuditEvent(input: CanonicalMcpEnvelopeInput): CanonicalMcpAuditEnvelope {
  const scopeParts = parseCanonicalAuditScope(input.canonicalTenantId);
  const targetId = input.executionId || input.approvalId || 'unknown';

  let action: string;
  let aggregateType: 'MCP_APPROVAL' | 'MCP_EXECUTION';
  let aggregateId: string;
  let deterministicAuditId: string;
  let deduplicationKey: string;
  let defaultReason: string;

  switch (input.eventType) {
    case 'mcp.audit.approval_proposed': {
      if (!input.approvalId) throw new Error('approvalId required for approval_proposed');
      action = 'MCP_APPROVAL_PROPOSED';
      aggregateType = 'MCP_APPROVAL';
      aggregateId = input.approvalId;
      deterministicAuditId = `audit_mcp_${crypto.createHash('sha256').update(`${input.approvalId}:proposed`).digest('hex').slice(0, 28)}`;
      deduplicationKey = `mcp_proposed:${input.approvalId}`;
      defaultReason = `Proposal proposed for ${input.toolName} (${input.approvalId})`;
      break;
    }
    case 'mcp.audit.execution_intent': {
      if (!input.executionId) throw new Error('executionId required for execution_intent');
      action = 'MCP_APPROVAL_EXECUTION_INTENT';
      aggregateType = 'MCP_EXECUTION';
      aggregateId = input.executionId;
      deterministicAuditId = `audit_mcp_${crypto.createHash('sha256').update(`${input.executionId}:intent`).digest('hex').slice(0, 28)}`;
      deduplicationKey = `mcp_intent:${input.executionId}`;
      defaultReason = `Execution intent for ${input.toolName} (${input.executionId})`;
      break;
    }
    case 'mcp.audit.execution_succeeded': {
      if (!input.executionId) throw new Error('executionId required for execution_succeeded');
      action = 'MCP_APPROVAL_EXECUTION_SUCCEEDED';
      aggregateType = 'MCP_EXECUTION';
      aggregateId = input.executionId;
      deterministicAuditId = `audit_mcp_${crypto.createHash('sha256').update(`${input.executionId}:final`).digest('hex').slice(0, 28)}`;
      deduplicationKey = `mcp_final:${input.executionId}`;
      defaultReason = `Approved execution succeeded for ${input.toolName} (${input.executionId})`;
      break;
    }
    case 'mcp.audit.execution_failed': {
      if (!input.executionId) throw new Error('executionId required for execution_failed');
      action = 'MCP_APPROVAL_EXECUTION_FAILED';
      aggregateType = 'MCP_EXECUTION';
      aggregateId = input.executionId;
      deterministicAuditId = `audit_mcp_${crypto.createHash('sha256').update(`${input.executionId}:final`).digest('hex').slice(0, 28)}`;
      deduplicationKey = `mcp_fail:${input.executionId}`;
      defaultReason = `Approved execution failed for ${input.toolName} (${input.executionId}): ${input.errorCode || 'UNKNOWN_ERROR'}`;
      break;
    }
    case 'mcp.audit.recovery_completed': {
      if (!input.executionId) throw new Error('executionId required for recovery_completed');
      action = 'MCP_APPROVAL_RECOVERY_COMPLETED';
      aggregateType = 'MCP_EXECUTION';
      aggregateId = input.executionId;
      deterministicAuditId = `audit_mcp_${crypto.createHash('sha256').update(`${input.executionId}:recovery`).digest('hex').slice(0, 28)}`;
      deduplicationKey = `mcp_recovery:${input.executionId}`;
      defaultReason = `Reconciled ${input.toolName} (${input.executionId}) -> ${input.resolvedStatus || 'RESOLVED'} (${input.reconciliationNote || 'RECOVERY_COMPLETED'})`;
      break;
    }
    default:
      throw new Error(`Unsupported MCP audit event type: ${input.eventType}`);
  }

  const sanitizedParamsRedacted = input.sanitizedParams !== undefined
    ? redactSensitiveData(input.sanitizedParams, { maskEmails: true }).value
    : undefined;

  const metadata: Record<string, any> = {
    approvalId: input.approvalId || null,
    executionId: input.executionId || null,
    toolName: input.toolName,
    tenantScope: input.tenantScope,
    canonicalTenantId: input.canonicalTenantId,
    ...(input.serverId ? { serverId: input.serverId } : {}),
    ...(input.approvalPolicy ? { approvalPolicy: input.approvalPolicy } : {}),
    ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
    ...(input.paramsHash ? { paramsHash: input.paramsHash } : {}),
    ...(sanitizedParamsRedacted !== undefined ? { sanitizedParams: sanitizedParamsRedacted } : {}),
    ...(input.latencyMs !== undefined ? { latencyMs: input.latencyMs } : {}),
    ...(input.delegationId !== undefined ? { delegationId: input.delegationId } : {}),
    ...(input.delegatedById !== undefined ? { delegatedById: input.delegatedById } : {}),
    ...(input.invocationId ? { invocationId: input.invocationId } : {}),
    ...(input.errorCode ? { errorCode: input.errorCode } : {}),
    ...(input.resolvedStatus ? { resolvedStatus: input.resolvedStatus } : {}),
    ...(input.reconciliationNote ? { reconciliationNote: input.reconciliationNote } : {}),
  };

  const auditInput: PlatformAdminAuditInput = {
    deterministicId: deterministicAuditId,
    action,
    entityType: aggregateType,
    entityId: aggregateId,
    actorId: input.actorId,
    actorEmail: input.actorEmail ?? undefined,
    organizationId: scopeParts.organizationId,
    projectId: scopeParts.projectId,
    environmentId: scopeParts.environmentId,
    requestId: aggregateId,
    reason: input.reason || defaultReason,
    metadata: metadata as Prisma.InputJsonValue,
  };

  const outboxPayload: Record<string, any> = {
    deterministicAuditId,
    approvalId: input.approvalId || null,
    executionId: input.executionId || null,
    toolName: input.toolName,
    approvalPolicy: input.approvalPolicy,
    tenantScope: input.tenantScope,
    canonicalTenantId: input.canonicalTenantId,
    requestedById: input.actorId,
    approvedById: input.actorId,
    paramsHash: input.paramsHash,
    canonicalAudit: auditInput,
  };

  return {
    outboxEventType: input.eventType,
    aggregateType,
    aggregateId,
    deduplicationKey,
    canonicalTenantId: input.canonicalTenantId,
    auditInput,
    outboxPayload,
  };
}
