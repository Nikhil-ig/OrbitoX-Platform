import * as crypto from 'crypto';

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
  contextId: string;
  entityType: string;
  entityId: string;
  policyId: string;
  status: ApprovalStatus;
  requestedBy: string;
  createdAt: string;
  updatedAt: string;
  stages: ApprovalStage[];
}

export class ApprovalEngine {
  public policies: Record<string, ApprovalPolicy> = {};
  public requests: Record<string, ApprovalRequest> = {};

  registerPolicy(policy: ApprovalPolicy): void {
    this.policies[policy.id] = policy;
  }

  requestApproval(
    contextId: string,
    entityType: string,
    entityId: string,
    policyId: string,
    requestedBy: string
  ): ApprovalRequest {
    const policy = this.policies[policyId];
    if (!policy) {
      throw new Error(`Policy ${policyId} not found.`);
    }

    const stages: ApprovalStage[] = policy.stages.map((s, idx) => ({
      stageId: `stage_${idx + 1}`,
      status: 'PENDING',
      requiredRoles: [...s.requiredRoles],
    }));

    const request: ApprovalRequest = {
      id: `app_req_${crypto.randomUUID()}`,
      contextId,
      entityType,
      entityId,
      policyId,
      status: 'PENDING',
      requestedBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stages,
    };

    this.requests[request.id] = request;
    return request;
  }

  approveStage(requestId: string, stageId: string, approvedBy: string, userRoles: string[], comments?: string): ApprovalRequest {
    const request = this.requests[requestId];
    if (!request) {
      throw new Error(`ApprovalRequest ${requestId} not found.`);
    }

    const stageIndex = request.stages.findIndex((s) => s.stageId === stageId);
    if (stageIndex === -1) {
      throw new Error(`Stage ${stageId} not found in ApprovalRequest ${requestId}.`);
    }

    const stage = request.stages[stageIndex]!;
    stage.status = 'APPROVED';
    stage.approvedBy = approvedBy;
    stage.comments = comments;
    stage.processedAt = new Date().toISOString();

    const allApproved = request.stages.every((s) => s.status === 'APPROVED');
    if (allApproved) {
      request.status = 'APPROVED';
    }

    request.updatedAt = new Date().toISOString();
    return request;
  }

  rejectRequest(requestId: string, rejectedBy: string, comments?: string): ApprovalRequest {
    const request = this.requests[requestId];
    if (!request) {
      throw new Error(`ApprovalRequest ${requestId} not found.`);
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

  // 2. Pre-seed pending four-eyes approval request for demonstration & governance testing
  try {
    approvalEngine.requestApproval(
      'context_global',
      'PLATFORM_KEY',
      'key_omni_live_01',
      'policy_key_revocation',
      'operator@omnideliver.global'
    );
  } catch {
    // Ignore
  }

  // 3. Seed initial cryptographic hash-chained audit log events
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
