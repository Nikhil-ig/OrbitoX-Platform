import * as crypto from 'crypto';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ESCALATED';

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

export class ApprovalEngine {
  private policies: Record<string, ApprovalPolicy> = {};
  private requests: Record<string, ApprovalRequest> = {};

  registerPolicy(policy: ApprovalPolicy): void {
    if (this.policies[policy.id]) {
      throw new Error(`Policy ${policy.id} is already registered.`);
    }
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

    if (policy.entityType !== entityType) {
      throw new Error(`Policy ${policyId} expects entity type ${policy.entityType} but got ${entityType}`);
    }

    const stages: ApprovalStage[] = policy.stages.map((s, idx) => ({
      stageId: `stage_${idx + 1}`,
      status: 'PENDING',
      requiredRoles: [...s.requiredRoles]
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
      stages
    };

    this.requests[request.id] = request;
    return request;
  }

  approveStage(requestId: string, stageId: string, approvedBy: string, userRoles: string[], comments?: string): ApprovalRequest {
    const request = this.requests[requestId];
    if (!request) {
      throw new Error(`ApprovalRequest ${requestId} not found.`);
    }

    if (request.status !== 'PENDING') {
      throw new Error(`ApprovalRequest ${requestId} is already ${request.status}.`);
    }

    const stageIndex = request.stages.findIndex(s => s.stageId === stageId);
    if (stageIndex === -1) {
      throw new Error(`Stage ${stageId} not found in ApprovalRequest ${requestId}.`);
    }

    const stage = request.stages[stageIndex];
    if (!stage) {
      throw new Error(`Stage is undefined (impossible).`);
    }

    if (stage.status !== 'PENDING') {
      throw new Error(`Stage ${stageId} is already ${stage.status}.`);
    }

    // Ensure previous stages are approved (Sequential Approval)
    for (let i = 0; i < stageIndex; i++) {
      const previousStage = request.stages[i];
      if (previousStage && previousStage.status !== 'APPROVED') {
        throw new Error(`Cannot approve stage ${stageId}. Stage ${previousStage.stageId} is still pending.`);
      }
    }

    // Role check
    const hasRequiredRole = stage.requiredRoles.some(role => userRoles.includes(role));
    if (!hasRequiredRole) {
      throw new Error(`User does not have required roles [${stage.requiredRoles.join(', ')}] to approve stage ${stageId}.`);
    }

    stage.status = 'APPROVED';
    stage.approvedBy = approvedBy;
    stage.comments = comments;
    stage.processedAt = new Date().toISOString();

    // Check if entire request is approved
    const allApproved = request.stages.every(s => s.status === 'APPROVED');
    if (allApproved) {
      request.status = 'APPROVED';
    }

    request.updatedAt = new Date().toISOString();
    return request;
  }

  rejectRequest(requestId: string, rejectedBy: string, comments: string): ApprovalRequest {
    const request = this.requests[requestId];
    if (!request) {
      throw new Error(`ApprovalRequest ${requestId} not found.`);
    }

    if (request.status !== 'PENDING') {
      throw new Error(`ApprovalRequest ${requestId} is already ${request.status}.`);
    }

    request.status = 'REJECTED';
    request.updatedAt = new Date().toISOString();

    // Mark pending stages as rejected
    for (const stage of request.stages) {
      if (stage.status === 'PENDING') {
        stage.status = 'REJECTED';
        stage.approvedBy = rejectedBy; // Not ideal naming, but denotes who processed it
        stage.comments = comments;
        stage.processedAt = new Date().toISOString();
      }
    }

    return request;
  }
}
