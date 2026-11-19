import * as crypto from 'crypto';
import { prisma } from '@/server/db/prisma';

export interface AuditLogOptions {
  action: string;
  entityType: string;
  entityId: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  impersonatedBy?: string;
  contextId: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  reason?: string;
}

export interface AuditRecord {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  contextId: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  reason?: string;
  ipAddress?: string;
  occurredAt: string;
  previousHash: string;
  rowHash: string;
}

export class AuditService {
  private lastHash: string = '';
  private logs: AuditRecord[] = [];

  async log(options: AuditLogOptions): Promise<void> {
    const id = `aud_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const occurredAt = new Date().toISOString();
    const previousHash = this.lastHash;

    const rowContent = JSON.stringify({
      id,
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId,
      userId: options.userId,
      contextId: options.contextId,
      oldValue: options.oldValue,
      newValue: options.newValue,
      reason: options.reason,
      occurredAt,
      previousHash,
    });

    const rowHash = crypto.createHash('sha256').update(rowContent).digest('hex');
    this.lastHash = rowHash;

    this.logs.push({
      id,
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId,
      userId: options.userId,
      userEmail: options.userEmail,
      userName: options.userName,
      contextId: options.contextId,
      oldValue: options.oldValue,
      newValue: options.newValue,
      reason: options.reason,
      ipAddress: options.ipAddress,
      occurredAt,
      previousHash,
      rowHash,
    });
  }

  query(filter: { contextId?: string; entityType?: string; entityId?: string; userId?: string; action?: string }): AuditRecord[] {
    return this.logs.filter((log) => {
      if (filter.contextId && log.contextId !== filter.contextId) return false;
      if (filter.entityType && log.entityType !== filter.entityType) return false;
      if (filter.entityId && log.entityId !== filter.entityId) return false;
      if (filter.userId && log.userId !== filter.userId) return false;
      if (filter.action && log.action !== filter.action) return false;
      return true;
    });
  }

  verifyChain(): { valid: boolean; totalEntries: number; brokenAtIndex?: number } {
    let prevHash = '';
    for (let i = 0; i < this.logs.length; i++) {
      const log = this.logs[i]!;
      if (log.previousHash !== prevHash) {
        return { valid: false, totalEntries: this.logs.length, brokenAtIndex: i };
      }
      const rowContent = JSON.stringify({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        userId: log.userId,
        contextId: log.contextId,
        oldValue: log.oldValue,
        newValue: log.newValue,
        reason: log.reason,
        occurredAt: log.occurredAt,
        previousHash: log.previousHash,
      });
      const expectedHash = crypto.createHash('sha256').update(rowContent).digest('hex');
      if (log.rowHash !== expectedHash) {
        return { valid: false, totalEntries: this.logs.length, brokenAtIndex: i };
      }
      prevHash = log.rowHash;
    }
    return { valid: true, totalEntries: this.logs.length };
  }
}

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ESCALATED';

export interface ApprovalStage {
  stageId: string;
  status: ApprovalStatus;
  requiredRoles: string[];
  approvedBy?: string;
  comments?: string;
  processedAt?: string;
}

export interface ApprovalPolicy {
  id: string;
  name: string;
  entityType: string;
  stages: {
    requiredRoles: string[];
  }[];
}

export interface ApprovalRequest {
  id: string;
  type: string;
  entityType: string;
  targetId: string;
  entityId: string;
  contextId?: string;
  targetName?: string;
  reason?: string;
  policyId: string;
  status: ApprovalStatus;
  requestedBy: string;
  requestedAt: string;
  createdAt: string;
  updatedAt: string;
  stages: ApprovalStage[];
}

function operationRowToApprovalRequest(row: any): ApprovalRequest {
  const reqMeta = typeof row.request === 'object' && row.request !== null ? row.request : {};
  const steps = Array.isArray(row.steps) ? row.steps : [];
  const entityType = reqMeta.entityType || row.type || 'PLATFORM_KEY';
  const entityId = reqMeta.entityId || row.id;
  const createdAt = row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt || new Date().toISOString());
  const updatedAt = row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt || new Date().toISOString());

  return {
    id: row.id,
    type: entityType,
    entityType,
    targetId: entityId,
    entityId,
    contextId: row.tenantId || row.organizationId || reqMeta.contextId,
    targetName: reqMeta.targetName || entityId,
    reason: reqMeta.reason || 'Operational approval request',
    policyId: reqMeta.policyId || 'policy_key_revocation',
    status: (row.status as ApprovalStatus) || 'PENDING',
    requestedBy: row.operatorId || reqMeta.requestedBy || 'operator@orbitox.io',
    requestedAt: createdAt,
    createdAt,
    updatedAt,
    stages: steps,
  };
}

export function isDatabasePersistenceEnabled(): boolean {
  if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'json' && !process.env.FORCE_DB_PERSISTENCE) {
    return false;
  }
  return Boolean(
    (process.env.DATABASE_URL || process.env.APP_DATABASE_URL) &&
    (prisma as any)?.$transaction &&
    (prisma as any)?.platformOperation
  );
}

export class ApprovalEngine {
  public policies: Record<string, ApprovalPolicy> = {};
  public requests: Record<string, ApprovalRequest> = {};

  registerPolicy(policy: ApprovalPolicy): void {
    this.policies[policy.id] = policy;
  }

  async listRequests(): Promise<ApprovalRequest[]> {
    if (isDatabasePersistenceEnabled()) {
      const rows = await (prisma as any).platformOperation.findMany({
        where: { type: 'APPROVAL_REQUEST' },
        orderBy: { createdAt: 'desc' },
      });
      if (Array.isArray(rows)) {
        for (const row of rows) {
          const req = operationRowToApprovalRequest(row);
          this.requests[req.id] = req;
        }
      }
    }
    return Object.values(this.requests);
  }

  async getRequest(id: string): Promise<ApprovalRequest | null> {
    if (isDatabasePersistenceEnabled()) {
      const row = await (prisma as any).platformOperation.findUnique({
        where: { id },
      });
      if (row && row.type === 'APPROVAL_REQUEST') {
        const req = operationRowToApprovalRequest(row);
        this.requests[req.id] = req;
        return req;
      }
    }
    return this.requests[id] || null;
  }

  async requestApproval(
    contextId: string,
    entityType: string,
    entityId: string,
    policyId: string,
    requestedBy: string,
    metadata?: { targetName?: string; reason?: string }
  ): Promise<ApprovalRequest> {
    const policy = this.policies[policyId];
    if (!policy) {
      throw new Error(`Policy ${policyId} not found.`);
    }

    const stages: ApprovalStage[] = policy.stages.map((s, idx) => ({
      stageId: `stage_${idx + 1}`,
      status: 'PENDING',
      requiredRoles: [...s.requiredRoles],
    }));

    const id = `app_req_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const request: ApprovalRequest = {
      id,
      type: entityType,
      entityType,
      targetId: entityId,
      entityId,
      contextId,
      targetName: metadata?.targetName || entityId,
      reason: metadata?.reason || 'Operational approval request',
      policyId,
      status: 'PENDING',
      requestedBy,
      requestedAt: now,
      createdAt: now,
      updatedAt: now,
      stages,
    };

    if (isDatabasePersistenceEnabled()) {
      await (prisma as any).platformOperation.create({
        data: {
          id,
          type: 'APPROVAL_REQUEST',
          tenantId: contextId,
          organizationId: contextId,
          status: 'PENDING',
          operatorId: requestedBy,
          request: {
            entityType,
            entityId,
            policyId,
            requestedBy,
            targetName: metadata?.targetName,
            reason: metadata?.reason,
          },
          steps: stages as any,
          result: null,
        },
      });
    }

    this.requests[request.id] = request;
    return request;
  }

  async approveStage(
    requestId: string,
    stageId: string,
    approvedBy: string,
    userRoles: string[],
    comments?: string
  ): Promise<ApprovalRequest> {
    if (isDatabasePersistenceEnabled()) {
      return await (prisma as any).$transaction(async (tx: any) => {
        const row = await tx.platformOperation.findUnique({
          where: { id: requestId },
        });
        if (!row || row.type !== 'APPROVAL_REQUEST') {
          throw new Error(`ApprovalRequest ${requestId} not found.`);
        }
        if (row.status !== 'PENDING') {
          throw new Error(`ApprovalRequest ${requestId} is already ${row.status}.`);
        }

        const request = operationRowToApprovalRequest(row);

        if (
          request.requestedBy &&
          approvedBy &&
          request.requestedBy.trim().toLowerCase() === approvedBy.trim().toLowerCase()
        ) {
          throw new Error(`SELF_APPROVAL_FORBIDDEN: Requester (${request.requestedBy}) cannot approve their own stage.`);
        }

        const stageIndex = request.stages.findIndex((s) => s.stageId === stageId);
        if (stageIndex === -1) {
          throw new Error(`Stage ${stageId} not found in ApprovalRequest ${requestId}.`);
        }

        const stage = request.stages[stageIndex]!;
        if (stage.status !== 'PENDING') {
          throw new Error(`Stage ${stageId} is already ${stage.status}.`);
        }

        for (let i = 0; i < stageIndex; i++) {
          const prev = request.stages[i];
          if (prev && prev.status !== 'APPROVED') {
            throw new Error(`Cannot approve stage ${stageId}. Prior stage ${prev.stageId} is still pending.`);
          }
        }

        const hasRole = stage.requiredRoles.some((r) => userRoles.includes(r));
        if (!hasRole) {
          throw new Error(
            `INSUFFICIENT_ROLES: Operator roles [${userRoles.join(', ')}] cannot approve stage ${stageId}. Required roles: [${stage.requiredRoles.join(', ')}].`
          );
        }

        const now = new Date();
        stage.status = 'APPROVED';
        stage.approvedBy = approvedBy;
        stage.comments = comments;
        stage.processedAt = now.toISOString();

        const allApproved = request.stages.every((s) => s.status === 'APPROVED');
        const nextStatus: ApprovalStatus = allApproved ? 'APPROVED' : 'PENDING';

        const updateResult = await tx.platformOperation.updateMany({
          where: {
            id: requestId,
            status: 'PENDING',
          },
          data: {
            status: nextStatus,
            steps: request.stages as any,
            result: {
              lastAction: 'APPROVE',
              approvedBy,
              stageId,
              comments,
              updatedAt: now.toISOString(),
            },
            completedAt: allApproved ? now : null,
          },
        });

        if (updateResult.count !== 1) {
          throw new Error(`CONCURRENCY_CONFLICT: ApprovalRequest ${requestId} was modified concurrently.`);
        }

        request.status = nextStatus;
        request.updatedAt = now.toISOString();
        this.requests[requestId] = request;
        return request;
      });
    }

    const request = this.requests[requestId];
    if (!request) throw new Error(`ApprovalRequest ${requestId} not found.`);
    if (request.status !== 'PENDING') throw new Error(`ApprovalRequest ${requestId} is already ${request.status}.`);

    if (request.requestedBy && approvedBy && request.requestedBy.trim().toLowerCase() === approvedBy.trim().toLowerCase()) {
      throw new Error(`SELF_APPROVAL_FORBIDDEN: Requester (${request.requestedBy}) cannot approve their own stage.`);
    }

    const stageIndex = request.stages.findIndex((s) => s.stageId === stageId);
    if (stageIndex === -1) throw new Error(`Stage ${stageId} not found in ApprovalRequest ${requestId}.`);

    const stage = request.stages[stageIndex]!;
    if (stage.status !== 'PENDING') throw new Error(`Stage ${stageId} is already ${stage.status}.`);

    for (let i = 0; i < stageIndex; i++) {
      const prev = request.stages[i];
      if (prev && prev.status !== 'APPROVED') {
        throw new Error(`Cannot approve stage ${stageId}. Prior stage ${prev.stageId} is still pending.`);
      }
    }

    const hasRole = stage.requiredRoles.some((r) => userRoles.includes(r));
    if (!hasRole) {
      throw new Error(`INSUFFICIENT_ROLES: Operator roles [${userRoles.join(', ')}] cannot approve stage ${stageId}. Required roles: [${stage.requiredRoles.join(', ')}].`);
    }

    stage.status = 'APPROVED';
    stage.approvedBy = approvedBy;
    stage.comments = comments;
    stage.processedAt = new Date().toISOString();

    const allApproved = request.stages.every((s) => s.status === 'APPROVED');
    request.status = allApproved ? 'APPROVED' : 'PENDING';
    request.updatedAt = new Date().toISOString();
    return request;
  }

  async rejectRequest(
    requestId: string,
    stageId: string | undefined,
    rejectedBy: string,
    userRoles: string[],
    comments?: string
  ): Promise<ApprovalRequest> {
    if (isDatabasePersistenceEnabled()) {
      return await (prisma as any).$transaction(async (tx: any) => {
        const row = await tx.platformOperation.findUnique({
          where: { id: requestId },
        });
        if (!row || row.type !== 'APPROVAL_REQUEST') {
          throw new Error(`ApprovalRequest ${requestId} not found.`);
        }
        if (row.status !== 'PENDING') {
          throw new Error(`ApprovalRequest ${requestId} is already ${row.status}.`);
        }

        const request = operationRowToApprovalRequest(row);

        const targetStage = stageId
          ? request.stages.find((s) => s.stageId === stageId)
          : request.stages.find((s) => s.status === 'PENDING') || request.stages[0];

        if (!targetStage) {
          throw new Error(`No active stage found in ApprovalRequest ${requestId}.`);
        }

        const hasRole = targetStage.requiredRoles.some((r) => userRoles.includes(r));
        if (!hasRole) {
          throw new Error(
            `INSUFFICIENT_ROLES: Operator roles [${userRoles.join(', ')}] cannot reject stage ${targetStage.stageId}. Required roles: [${targetStage.requiredRoles.join(', ')}].`
          );
        }

        const now = new Date();
        for (const stage of request.stages) {
          if (stage.status === 'PENDING') {
            stage.status = 'REJECTED';
            stage.approvedBy = rejectedBy;
            stage.comments = comments;
            stage.processedAt = now.toISOString();
          }
        }

        const updateResult = await tx.platformOperation.updateMany({
          where: {
            id: requestId,
            status: 'PENDING',
          },
          data: {
            status: 'REJECTED',
            steps: request.stages as any,
            result: {
              lastAction: 'REJECT',
              rejectedBy,
              stageId: targetStage.stageId,
              comments,
              updatedAt: now.toISOString(),
            },
            completedAt: now,
          },
        });

        if (updateResult.count !== 1) {
          throw new Error(`CONCURRENCY_CONFLICT: ApprovalRequest ${requestId} was modified concurrently.`);
        }

        request.status = 'REJECTED';
        request.updatedAt = now.toISOString();
        this.requests[requestId] = request;
        return request;
      });
    }

    const request = this.requests[requestId];
    if (!request) throw new Error(`ApprovalRequest ${requestId} not found.`);
    if (request.status !== 'PENDING') throw new Error(`ApprovalRequest ${requestId} is already ${request.status}.`);

    const targetStage = stageId
      ? request.stages.find((s) => s.stageId === stageId)
      : request.stages.find((s) => s.status === 'PENDING') || request.stages[0];

    if (!targetStage) throw new Error(`No active stage found in ApprovalRequest ${requestId}.`);

    const hasRole = targetStage.requiredRoles.some((r) => userRoles.includes(r));
    if (!hasRole) {
      throw new Error(
        `INSUFFICIENT_ROLES: Operator roles [${userRoles.join(', ')}] cannot reject stage ${targetStage.stageId}. Required roles: [${targetStage.requiredRoles.join(', ')}].`
      );
    }

    request.status = 'REJECTED';
    request.updatedAt = new Date().toISOString();
    for (const stage of request.stages) {
      if (stage.status === 'PENDING') {
        stage.status = 'REJECTED';
        stage.approvedBy = rejectedBy;
        stage.comments = comments;
        stage.processedAt = new Date().toISOString();
      }
    }
    return request;
  }
}

// Global singleton instances for platform governance
export const auditService = new AuditService();
export const approvalEngine = new ApprovalEngine();

let isInitialized = false;

export function initializePlatformGovernance() {
  if (isInitialized) return;
  isInitialized = true;

  // 1. Register Standard Platform Approval Policies
  const keyRevokePolicy: ApprovalPolicy = {
    id: 'policy_key_revocation',
    name: 'Production Key Emergency Revocation & Rotation',
    entityType: 'PLATFORM_KEY',
    stages: [
      { requiredRoles: ['SECURITY_ADMIN', 'PLATFORM_SUPERADMIN'] },
    ],
  };

  const credPurgePolicy: ApprovalPolicy = {
    id: 'policy_credential_purge',
    name: 'Production External Credential Vault Purge',
    entityType: 'PLATFORM_CREDENTIAL',
    stages: [
      { requiredRoles: ['SECURITY_ADMIN'] },
      { requiredRoles: ['PLATFORM_SUPERADMIN'] },
    ],
  };

  const envFreezePolicy: ApprovalPolicy = {
    id: 'policy_env_freeze',
    name: 'Hyperscale Environment Traffic Drain & Freeze',
    entityType: 'PLATFORM_ENVIRONMENT',
    stages: [
      { requiredRoles: ['INFRA_LEAD', 'PLATFORM_SUPERADMIN'] },
    ],
  };

  approvalEngine.registerPolicy(keyRevokePolicy);
  approvalEngine.registerPolicy(credPurgePolicy);
  approvalEngine.registerPolicy(envFreezePolicy);

  // 2. Seed initial cryptographic hash-chained audit log events
  seedInitialAuditLogs();
}

async function seedInitialAuditLogs() {
  await auditService.log({
    action: 'PLATFORM_BOOTSTRAP',
    entityType: 'PLATFORM_CORE',
    entityId: 'cluster-mesh-node-01',
    userId: 'system_root',
    userEmail: 'root@orbitox.io',
    userName: 'OrbitoX Mesh Kernel',
    contextId: 'context_global',
    reason: 'Initial cluster node bootstrap and cryptographic keystore generation',
    newValue: { status: 'ONLINE', clusterMode: 'standalone', nodes: 1 },
  });

  await auditService.log({
    action: 'PROJECT_PROVISIONED',
    entityType: 'PLATFORM_PROJECT',
    entityId: 'proj-omnideliver',
    userId: 'admin_sys',
    userEmail: 'admin@omnideliver.global',
    userName: 'Sophia Martinez',
    contextId: 'context_global',
    reason: 'Provisioned enterprise O2O2B2B2C project with production, staging, development environments',
    newValue: { plan: 'hyperscale', slug: 'omnideliver' },
  });

  await auditService.log({
    action: 'KEY_ISSUED',
    entityType: 'PLATFORM_KEY',
    entityId: 'key-omni-live-01',
    userId: 'admin_sys',
    userEmail: 'admin@omnideliver.global',
    userName: 'Sophia Martinez',
    contextId: 'context_global',
    reason: 'Issued production machine credential with HMAC-SHA256 verifier',
    newValue: { keyPrefix: 'orb_live_omni_', environment: 'production' },
  });

  await auditService.log({
    action: 'CREDENTIAL_ENCRYPTED',
    entityType: 'PLATFORM_CREDENTIAL',
    entityId: 'cred-stripe-01',
    userId: 'finance_sec',
    userEmail: 'finance@omnideliver.global',
    userName: 'Finance SecOps',
    contextId: 'context_global',
    reason: 'Envelope encrypted external Stripe API credential via AES-256-GCM',
    newValue: { provider: 'stripe', status: 'HEALTHY' },
  });
}

// Auto-run initialization
initializePlatformGovernance();
