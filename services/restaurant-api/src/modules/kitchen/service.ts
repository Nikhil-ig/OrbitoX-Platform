import * as crypto from 'crypto';
import { RequestIdentity } from '../../http/context';
import { RestaurantRepository } from '../../storage';

export function authorizeKdsRequest(
  identity: RequestIdentity,
  targetBranchId?: string,
  targetStation?: string,
  isExpoDispatch = false
): { authorized: boolean; statusCode?: number; error?: string; code?: string } {
  if (identity.type === 'ANONYMOUS') {
    return {
      authorized: false,
      statusCode: 401,
      error: 'Staff or kitchen station credentials required.',
      code: 'UNAUTHENTICATED',
    };
  }
  if (identity.type === 'INVALID_CREDENTIAL') {
    const isRevoked = identity.error === 'TOKEN_REVOKED';
    return {
      authorized: false,
      statusCode: 401,
      error: isRevoked ? 'Staff credential has been explicitly revoked.' : (identity.error || 'Supplied authorization token is invalid or tampered.'),
      code: isRevoked ? 'REVOKED_TOKEN' : 'INVALID_CREDENTIAL',
    };
  }
  if (identity.type === 'REVOKED_CAPABILITY') {
    return {
      authorized: false,
      statusCode: 401,
      error: 'Credential or token has been revoked.',
      code: 'REVOKED_TOKEN',
    };
  }
  if (identity.type === 'DINER') {
    return {
      authorized: false,
      statusCode: 403,
      error: 'Diner capability cannot mutate kitchen display tasks.',
      code: 'FORBIDDEN',
    };
  }

  const allowedRoles = ['CHEF', 'EXPO', 'OPERATIONS', 'MANAGER', 'ADMIN'];
  const effectiveRole = identity.role || (identity.type === 'ADMIN' ? 'ADMIN' : undefined);
  const isAuthorizedRole =
    (identity.type === 'STATION' && (!identity.role || allowedRoles.includes(identity.role))) ||
    (effectiveRole && allowedRoles.includes(effectiveRole));

  if (!isAuthorizedRole) {
    return {
      authorized: false,
      statusCode: 403,
      error: `Role ${identity.role || identity.type} is not authorized to mutate kitchen display tasks.`,
      code: 'FORBIDDEN',
    };
  }

  if (targetBranchId !== undefined && identity.branchId && identity.branchId !== '*') {
    if (!targetBranchId || targetBranchId === 'unknown') {
      return {
        authorized: false,
        statusCode: 403,
        error: `Task has missing, malformed, or untrusted branch identifier and cannot be mutated by branch-scoped credential (${identity.branchId}).`,
        code: 'BRANCH_MISMATCH',
      };
    }
    if (identity.branchId !== targetBranchId) {
      return {
        authorized: false,
        statusCode: 403,
        error: `Staff credential for branch ${identity.branchId} cannot mutate kitchen resource in branch ${targetBranchId}.`,
        code: 'BRANCH_MISMATCH',
      };
    }
  }

  if (isExpoDispatch) {
    if (
      identity.type === 'STATION' &&
      identity.station &&
      identity.station !== 'ALL' &&
      identity.station !== 'EXPO'
    ) {
      return {
        authorized: false,
        statusCode: 403,
        error: `Station credential for ${identity.station} cannot dispatch tables from Expo pass.`,
        code: 'STATION_MISMATCH',
      };
    }
    if (
      identity.role === 'CHEF' &&
      identity.station &&
      identity.station !== 'ALL' &&
      identity.station !== 'EXPO'
    ) {
      return {
        authorized: false,
        statusCode: 403,
        error: `Chef assigned to ${identity.station} cannot dispatch tables from Expo pass.`,
        code: 'STATION_MISMATCH',
      };
    }
  } else if (targetStation) {
    const assignedStation = identity.station;
    if (assignedStation && assignedStation !== 'ALL' && assignedStation !== targetStation) {
      return {
        authorized: false,
        statusCode: 403,
        error: `Station credential for ${assignedStation} is not authorized for task assigned to ${targetStation}.`,
        code: 'STATION_MISMATCH',
      };
    }
  }

  return { authorized: true };
}

export interface TaskBranchResolution {
  branchId: string | null;
  quarantined: boolean;
  code?: 'TASK_BRANCH_UNRESOLVED' | 'BRANCH_MISMATCH' | 'MALFORMED_BRANCH_IDENTIFIER';
  error?: string;
}

export async function resolveTaskAuthoritativeBranch(task: any, repo: RestaurantRepository): Promise<TaskBranchResolution> {
  const branches = await repo.getBranches();
  const registeredBranches = branches.map((b) => b.id);

  if (task.branchId && typeof task.branchId === 'string' && task.branchId.trim().length > 0) {
    const trimmed = task.branchId.trim();
    if (trimmed === 'unknown' || trimmed === 'null' || trimmed === 'undefined' || !/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      return {
        branchId: null,
        quarantined: true,
        code: 'MALFORMED_BRANCH_IDENTIFIER',
        error: `Task ${task.id} has malformed or untrusted branch identifier: "${task.branchId}".`,
      };
    }
    if (registeredBranches.includes(trimmed)) {
      return { branchId: trimmed, quarantined: false };
    }
    return {
      branchId: null,
      quarantined: true,
      code: 'TASK_BRANCH_UNRESOLVED',
      error: `Task ${task.id} specifies unknown branch "${trimmed}" not registered in system.`,
    };
  }

  if (task.orderId) {
    const linkedOrder = await repo.getOrder(task.orderId);
    if (linkedOrder && linkedOrder.branchId && registeredBranches.includes(linkedOrder.branchId)) {
      task.branchId = linkedOrder.branchId;
      return { branchId: linkedOrder.branchId, quarantined: false };
    }
  }

  if (task.sessionId) {
    const linkedSession = await repo.getSession(task.sessionId);
    if (linkedSession && linkedSession.branchId && registeredBranches.includes(linkedSession.branchId)) {
      task.branchId = linkedSession.branchId;
      return { branchId: linkedSession.branchId, quarantined: false };
    }
  }

  return {
    branchId: null,
    quarantined: true,
    code: 'TASK_BRANCH_UNRESOLVED',
    error: `Task ${task.id} has no trusted branch association and cannot be mutated by branch-scoped credentials.`,
  };
}

export async function checkKdsIdempotency(
  idempotencyKey: string | undefined,
  operation: string,
  targetId: string,
  targetBranchId: string | null | undefined,
  payload: any,
  repo: RestaurantRepository
): Promise<{ hasConflict: boolean; isReplay: boolean; cachedResponse?: any; payloadHash: string }> {
  if (!idempotencyKey) {
    return { hasConflict: false, isReplay: false, payloadHash: '' };
  }

  const canonicalObj = {
    operation,
    targetId,
    branchId: targetBranchId || '',
    payload,
  };
  const payloadHash = crypto.createHash('sha256').update(JSON.stringify(canonicalObj)).digest('hex');

  const existing = await repo.getIdempotencyRecord(idempotencyKey);
  if (existing) {
    if (
      existing.operation !== operation ||
      existing.targetId !== targetId ||
      existing.payloadHash !== payloadHash
    ) {
      return { hasConflict: true, isReplay: false, payloadHash };
    }
    return {
      hasConflict: false,
      isReplay: true,
      cachedResponse: existing.responseBody || existing.response,
      payloadHash,
    };
  }
  return { hasConflict: false, isReplay: false, payloadHash };
}
