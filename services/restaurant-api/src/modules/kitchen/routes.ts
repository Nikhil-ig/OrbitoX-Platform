import * as http from 'http';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import {
  MenuItem,
  KitchenTask,
  TableFloorRecord,
  RestaurantOrder,
  BranchRecord,
  FloorRecord,
  ServiceRequest,
  RestaurantContext,
  issueStaffToken,
  verifyStaffToken,
  revokeStaffToken,
  authenticateStaffByPin,
  getPublicStaffList,
  getStaffMember,
  createStaffMember,
  updateStaffMember,
  resetStaffLockout,
  hashStaffSecretSync,
  verifyStaffSecret,
  resolveClientIp,
  checkStaffLockout,
  recordFailedStaffAttempt,
  recordSuccessfulStaffAttempt,
  issueDeviceToken,
  verifyDeviceToken,
  validateAndSanitizeCustomCss,
  tryGetActiveTenant,
  resolveTenantDisplayName,
  invalidateTenantResolutionCache,
  OnboardingStepKey,
  verifyPlatformAuth,
  validateTenantSlug,
  generateSeats,
} from '../../../packages/domain';
import {
  buildGSTInvoice,
  computeFiscalYear,
  SAC_RESTAURANT_SERVICES,
  renderPrintableInvoiceHtml,
} from '../../../packages/domain/invoicing';
import {
  isProductionEnvironment,
  postgresStore,
  eventBus,
  provisioningService,
  customDomainService,
  ownerSelfService,
  razorpayAdapter,
  restaurantGrantEnforcer,
  runtimeController,
  getPinnedGrantKeys,
  activeSettlementLocks,
  activeDispatchLocks,
  totalRequests,
  statusCounts,
  methodCounts,
  totalDomainEvents,
} from '../../shared/state';
import {
  parseBody,
  parseBuffer,
  extractImageBuffer,
  sendJson,
  sendHtml,
  checkTestKillPoint,
  isActiveRestaurantCataloguePlan,
  type RequestIdentity,
} from '../../http/middleware';
import {
  assertPlatformBridgeCaller,
  exportRestaurantTenantData,
  eraseRestaurantTenantData,
  exportRestaurantPrincipalData,
  correctRestaurantPrincipalData,
  eraseRestaurantPrincipalData,
} from '../../data-rights';
import { SEED_PLANS } from '@orbitox-io/plugin-engine';
import type { PreTenantRouteContext, TenantRouteContext } from '../../http/types';

export async function handleKitchenRoutes(ctx: TenantRouteContext): Promise<boolean> {
  const {
    req, res, pathname, method, parsedUrl, tenantContext, repo, posService,
    branches, floors, context, currentBranch, currentFloor, serviceShift,
    requestIdentity, activeStaffToken, activeStaffRole,
  } = ctx;
    // 7. Kitchen Display System Stream / List
    if ((pathname === '/api/restaurant/kds' || pathname === '/api/restaurant/kds/tasks') && method === 'GET') {
      const stationFilter = (parsedUrl.query.station || parsedUrl.query.stationId) as string;
      const branchFilter = (parsedUrl.query.branchId as string) || (requestIdentity.isPrivileged ? undefined : requestIdentity.branchId);
      const tasks = await posService.listKitchenTasks({ station: stationFilter, branchId: branchFilter });
      sendJson(res, 200, {
        success: true,
        data: tasks,
        tasks,
      });
      return true;
    }

    // --- KDS Mutation Authorization Helper ---
    const authorizeKdsRequest = (
      identity: RequestIdentity,
      targetBranchId?: string,
      targetStation?: string,
      isExpoDispatch = false
    ): { authorized: boolean; statusCode?: number; error?: string; code?: string } => {
      // 1. Missing authentication (Fail-closed in both prod & dev)
      if (identity.type === 'ANONYMOUS') {
        return {
          authorized: false,
          statusCode: 401,
          error: 'Staff or kitchen station credentials required.',
          code: 'UNAUTHENTICATED',
        };
      }
      // 2. Malformed / forged credential
      if (identity.type === 'INVALID_CREDENTIAL') {
        const isRevoked = identity.error === 'TOKEN_REVOKED';
        return {
          authorized: false,
          statusCode: 401,
          error: isRevoked ? 'Staff credential has been explicitly revoked.' : (identity.error || 'Supplied authorization token is invalid or tampered.'),
          code: isRevoked ? 'REVOKED_TOKEN' : 'INVALID_CREDENTIAL',
        };
      }
      // 3. Revoked credential
      if (identity.type === 'REVOKED_CAPABILITY') {
        return {
          authorized: false,
          statusCode: 401,
          error: 'Credential or token has been revoked.',
          code: 'REVOKED_TOKEN',
        };
      }
      // 4. Diner capability forbidden from KDS
      if (identity.type === 'DINER') {
        return {
          authorized: false,
          statusCode: 403,
          error: 'Diner capability cannot mutate kitchen display tasks.',
          code: 'FORBIDDEN',
        };
      }

      // 5. Appropriate Role Check
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

      // 6. Branch Scoping Check
      // Wildcard '*' is permitted across branches. Specific branch identities must match target branch.
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

      // 7. Station Scoping Check
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
    };

    // --- Task Branch Resolution & Controlled Migration ---
    interface TaskBranchResolution {
      branchId: string | null;
      quarantined: boolean;
      code?: 'TASK_BRANCH_UNRESOLVED' | 'BRANCH_MISMATCH' | 'MALFORMED_BRANCH_IDENTIFIER';
      error?: string;
    }

    const resolveTaskAuthoritativeBranch = async (task: any): Promise<TaskBranchResolution> => {
      const branches = await repo.getBranches();
      const registeredBranches = branches.map((b) => b.id);

      // 1. Direct task.branchId validation
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

      // 2. Controlled migration from authoritative linked order
      if (task.orderId) {
        const linkedOrder = await repo.getOrder(task.orderId);
        if (linkedOrder && linkedOrder.branchId && registeredBranches.includes(linkedOrder.branchId)) {
          task.branchId = linkedOrder.branchId;
          return { branchId: linkedOrder.branchId, quarantined: false };
        }
      }

      // 3. Controlled migration from authoritative linked table session
      if (task.sessionId) {
        const linkedSession = await repo.getSession(task.sessionId);
        if (linkedSession && linkedSession.branchId && registeredBranches.includes(linkedSession.branchId)) {
          task.branchId = linkedSession.branchId;
          return { branchId: linkedSession.branchId, quarantined: false };
        }
      }

      // 4. Invariant: Never infer task's branch from caller's active branch or global table number!
      return {
        branchId: null,
        quarantined: true,
        code: 'TASK_BRANCH_UNRESOLVED',
        error: `Task ${task.id} has no trusted branch association and cannot be mutated by branch-scoped credentials.`,
      };
    };

    // --- KDS Mutation Idempotency Helper ---
    const checkKdsIdempotency = async (
      idempotencyKey: string | undefined,
      operation: string,
      targetId: string,
      targetBranchId: string | null | undefined,
      payload: any
    ): Promise<{ hasConflict: boolean; isReplay: boolean; cachedResponse?: any; payloadHash: string }> => {
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
    };

    // 8. KDS Task State Transition / Bump
    if (
      ((pathname === '/api/restaurant/kds' || pathname === '/api/restaurant/kds/bump') ||
        (pathname.startsWith('/api/restaurant/kds/tasks/') && pathname.endsWith('/bump'))) &&
      method === 'POST'
    ) {
      const identity = requestIdentity;
      const body = await parseBody(req);
      const taskId = body.taskId || (pathname.startsWith('/api/restaurant/kds/tasks/') ? pathname.split('/')[5] : undefined);
      const nextStatus = body.newStatus || body.status || body.targetStatus;
      const idempotencyKey = (req.headers['x-idempotency-key'] as string) || body.idempotencyKey;

      // 1. Authenticate identity
      const authCheck = authorizeKdsRequest(identity);
      if (!authCheck.authorized) {
        sendJson(res, authCheck.statusCode!, { error: authCheck.error, code: authCheck.code });
        return true;
      }

      if (!taskId) {
        sendJson(res, 400, { error: 'Task ID is required', code: 'TASK_ID_REQUIRED' });
        return true;
      }

      const allTasks = await repo.getKitchenTasks();
      const task = allTasks.find((t) => t.id === taskId);
      if (!task) {
        sendJson(res, 404, { error: `Task ${taskId} not found`, code: 'TASK_NOT_FOUND' });
        return true;
      }

      // Branch Resolution & Quarantine
      const taskBranchRes = await resolveTaskAuthoritativeBranch(task);
      if (taskBranchRes.quarantined && identity.branchId !== '*') {
        sendJson(res, 403, {
          error: taskBranchRes.error,
          code: taskBranchRes.code || 'BRANCH_MISMATCH',
        });
        return true;
      }
      const taskBranch = taskBranchRes.branchId || undefined;

      // 2. Branch & Station Scoping
      const scopeCheck = authorizeKdsRequest(identity, taskBranch, task.station);
      if (!scopeCheck.authorized) {
        sendJson(res, scopeCheck.statusCode!, { error: scopeCheck.error, code: scopeCheck.code });
        return true;
      }

      let requestedStation = (req.headers['x-station'] as string) || body.station;
      if (identity.type === 'STATION' && identity.station) {
        if (requestedStation && requestedStation !== 'ALL' && requestedStation !== identity.station) {
          sendJson(res, 403, {
            error: `Station credential for ${identity.station} cannot mutate station ${requestedStation}`,
            code: 'STATION_MISMATCH',
          });
          return true;
        }
        requestedStation = identity.station;
      }
      if (requestedStation && requestedStation !== 'ALL' && task.station !== requestedStation) {
        sendJson(res, 403, {
          error: `Station ${requestedStation} is not authorized for task assigned to ${task.station}`,
          code: 'STATION_MISMATCH',
        });
        return true;
      }

      // 3. Idempotency Check
      const idempCheck = await checkKdsIdempotency(idempotencyKey, 'kds.bump', taskId, taskBranch, {
        nextStatus,
        station: requestedStation,
      });
      if (idempCheck.hasConflict) {
        sendJson(res, 409, {
          error: 'IDEMPOTENCY_CONFLICT',
          code: 'IDEMPOTENCY_CONFLICT',
          message: `Idempotency key ${idempotencyKey} has already been used with a different operation, target, or payload.`,
        });
        return true;
      }
      if (idempCheck.isReplay) {
        sendJson(res, 200, {
          ...idempCheck.cachedResponse,
          isIdempotent: true,
          idempotentReplay: true,
        });
        return true;
      }

      checkTestKillPoint(req, 'pre-commit');

      const result = await repo.updateKitchenTaskStatus(taskId, nextStatus, {
        station: requestedStation,
        expectedRevision: body.expectedRevision,
      });
      if (!result.success) {
        if (result.code === 'TASK_NOT_FOUND') {
          sendJson(res, 404, { error: result.error, code: result.code });
        } else if (result.code === 'STATION_MISMATCH') {
          sendJson(res, 403, { error: result.error, code: result.code });
        } else if (result.code === 'REVISION_CONFLICT') {
          sendJson(res, 409, { error: result.error, code: result.code });
        } else {
          sendJson(res, 400, { error: result.error, code: result.code });
        }
        return true;
      }

      await runtimeController.emitAudit('KDS_BUMP', `chef:${result.task?.station}`, {
        taskId,
        status: result.task?.status,
      });

      const responsePayload = {
        success: true,
        data: result.task,
        isIdempotent: result.isIdempotent,
      };
      if (idempotencyKey) {
        const record = {
          operation: 'kds.bump',
          targetId: taskId,
          branchId: taskBranch,
          payloadHash: idempCheck.payloadHash,
          response: responsePayload,
        };
        await repo.saveIdempotencyRecord(idempotencyKey, record);
      }

      checkTestKillPoint(req, 'post-commit');

      if (result.task) {
        eventBus.broadcast({
          id: `evt_${Date.now()}`,
          sequence: (await repo.getEvents()).length,
          type: `task.${result.task.status.toLowerCase()}`,
          timestamp: new Date().toISOString(),
          producer: result.task.orderId || result.task.id,
          branchId: taskBranch,
          tableNumber: result.task.tableNumber,
          tenantId: tenantContext.tenantId,
          payload: {
            taskId: result.task.id,
            orderId: result.task.orderId,
            status: result.task.status,
            task: result.task,
          },
        });
      }

      sendJson(res, 200, responsePayload);
      return true;
    }

    // 9. KDS Individual Item Fulfillment
    if (
      (pathname === '/api/restaurant/kds/item-fulfill' ||
        pathname === '/api/restaurant/kds/fulfill-item' ||
        (pathname.startsWith('/api/restaurant/kds/tasks/') && pathname.endsWith('/fulfill-item'))) &&
      method === 'POST'
    ) {
      const identity = requestIdentity;
      const body = await parseBody(req);
      const taskId = body.taskId || (pathname.startsWith('/api/restaurant/kds/tasks/') ? pathname.split('/')[5] : undefined);
      const idempotencyKey = (req.headers['x-idempotency-key'] as string) || body.idempotencyKey;

      // 1. Authenticate identity
      const authCheck = authorizeKdsRequest(identity);
      if (!authCheck.authorized) {
        sendJson(res, authCheck.statusCode!, { error: authCheck.error, code: authCheck.code });
        return true;
      }

      if (!taskId) {
        sendJson(res, 400, { error: 'Task ID is required', code: 'TASK_ID_REQUIRED' });
        return true;
      }

      const allTasks = await repo.getKitchenTasks();
      const task = allTasks.find((t) => t.id === taskId);
      if (!task) {
        sendJson(res, 404, { error: `Task ${taskId} not found`, code: 'TASK_NOT_FOUND' });
        return true;
      }

      // Branch Resolution & Quarantine
      const taskBranchRes = await resolveTaskAuthoritativeBranch(task);
      if (taskBranchRes.quarantined && identity.branchId !== '*') {
        sendJson(res, 403, {
          error: taskBranchRes.error,
          code: taskBranchRes.code || 'BRANCH_MISMATCH',
        });
        return true;
      }
      const taskBranch = taskBranchRes.branchId || undefined;

      // 2. Branch and Station Scoping
      const scopeCheck = authorizeKdsRequest(identity, taskBranch, task.station);
      if (!scopeCheck.authorized) {
        sendJson(res, scopeCheck.statusCode!, { error: scopeCheck.error, code: scopeCheck.code });
        return true;
      }

      // 3. Idempotency Check
      const idempCheck = await checkKdsIdempotency(idempotencyKey, 'kds.fulfill-item', taskId, taskBranch, {
        targetCount: body.targetCount,
      });
      if (idempCheck.hasConflict) {
        sendJson(res, 409, {
          error: 'IDEMPOTENCY_CONFLICT',
          code: 'IDEMPOTENCY_CONFLICT',
          message: `Idempotency key ${idempotencyKey} has already been used with a different operation, target, or payload.`,
        });
        return true;
      }
      if (idempCheck.isReplay) {
        sendJson(res, 200, {
          ...idempCheck.cachedResponse,
          isIdempotent: true,
          idempotentReplay: true,
        });
        return true;
      }

      const result = await repo.fulfillTaskItem(taskId, body.targetCount);
      if (!result.success) {
        const status = result.code === 'TASK_NOT_FOUND' ? 404 : 400;
        sendJson(res, status, { error: result.error, code: result.code });
        return true;
      }

      const responsePayload = { success: true, data: result.task, isIdempotent: result.isIdempotent };
      if (idempotencyKey) {
        const record = {
          operation: 'kds.fulfill-item',
          targetId: taskId,
          branchId: taskBranch,
          payloadHash: idempCheck.payloadHash,
          response: responsePayload,
        };
        await repo.saveIdempotencyRecord(idempotencyKey, record);
      }

      sendJson(res, 200, responsePayload);
      return true;
    }

    // 10. KDS Task Recall
    if (
      (pathname === '/api/restaurant/kds/recall' ||
        (pathname.startsWith('/api/restaurant/kds/tasks/') && pathname.endsWith('/recall'))) &&
      method === 'POST'
    ) {
      const identity = requestIdentity;
      const body = await parseBody(req);
      const taskId = body.taskId || (pathname.startsWith('/api/restaurant/kds/tasks/') ? pathname.split('/')[5] : undefined);
      const idempotencyKey = (req.headers['x-idempotency-key'] as string) || body.idempotencyKey;

      // 1. Authenticate identity
      const authCheck = authorizeKdsRequest(identity);
      if (!authCheck.authorized) {
        sendJson(res, authCheck.statusCode!, { error: authCheck.error, code: authCheck.code });
        return true;
      }

      if (!taskId) {
        sendJson(res, 400, { error: 'Task ID is required', code: 'TASK_ID_REQUIRED' });
        return true;
      }

      const allTasks = await repo.getKitchenTasks();
      const task = allTasks.find((t) => t.id === taskId);
      if (!task) {
        sendJson(res, 404, { error: `Task ${taskId} not found`, code: 'TASK_NOT_FOUND' });
        return true;
      }

      // Branch Resolution & Quarantine
      const taskBranchRes = await resolveTaskAuthoritativeBranch(task);
      if (taskBranchRes.quarantined && identity.branchId !== '*') {
        sendJson(res, 403, {
          error: taskBranchRes.error,
          code: taskBranchRes.code || 'BRANCH_MISMATCH',
        });
        return true;
      }
      const taskBranch = taskBranchRes.branchId || undefined;

      // 2. Branch and Station Scoping
      const scopeCheck = authorizeKdsRequest(identity, taskBranch, task.station);
      if (!scopeCheck.authorized) {
        sendJson(res, scopeCheck.statusCode!, { error: scopeCheck.error, code: scopeCheck.code });
        return true;
      }

      // 3. Idempotency Check
      const idempCheck = await checkKdsIdempotency(idempotencyKey, 'kds.recall', taskId, taskBranch, {
        targetStatus: body.targetStatus,
      });
      if (idempCheck.hasConflict) {
        sendJson(res, 409, {
          error: 'IDEMPOTENCY_CONFLICT',
          code: 'IDEMPOTENCY_CONFLICT',
          message: `Idempotency key ${idempotencyKey} has already been used with a different operation, target, or payload.`,
        });
        return true;
      }
      if (idempCheck.isReplay) {
        sendJson(res, 200, {
          ...idempCheck.cachedResponse,
          isIdempotent: true,
          idempotentReplay: true,
        });
        return true;
      }

      const result = await repo.recallTask(taskId, body.targetStatus);
      if (!result.success) {
        const status = result.code === 'TASK_NOT_FOUND' ? 404 : 400;
        sendJson(res, status, { error: result.error, code: result.code });
        return true;
      }

      const responsePayload = { success: true, data: result.task, isIdempotent: result.isIdempotent };
      if (idempotencyKey) {
        const record = {
          operation: 'kds.recall',
          targetId: taskId,
          branchId: taskBranch,
          payloadHash: idempCheck.payloadHash,
          response: responsePayload,
        };
        await repo.saveIdempotencyRecord(idempotencyKey, record);
      }

      sendJson(res, 200, responsePayload);
      return true;
    }

    // 11. KDS Expo Dispatch (All tasks for table marked BUMPED / Table SERVED)
    if ((pathname === '/api/restaurant/kds/expo-dispatch' || (pathname.startsWith('/api/restaurant/kds/tasks/') && pathname.endsWith('/dispatch'))) && method === 'POST') {
      const identity = requestIdentity;
      const authCheck = authorizeKdsRequest(identity, undefined, undefined, true);
      if (!authCheck.authorized) {
        sendJson(res, authCheck.statusCode!, { error: authCheck.error, code: authCheck.code });
        return true;
      }

      const body = await parseBody(req);
      const tableNumber = body.tableNumber;
      const idempotencyKey = (req.headers['x-idempotency-key'] as string) || body.idempotencyKey;

      if (!tableNumber) {
        sendJson(res, 400, { error: 'Table number is required', code: 'TABLE_NUMBER_REQUIRED' });
        return true;
      }

      const allTasks = await repo.getKitchenTasks();
      const tasks = allTasks.filter((t) => t.tableNumber === tableNumber);
      if (tasks.length === 0) {
        sendJson(res, 400, { error: `No kitchen tasks found for table ${tableNumber}`, code: 'TASKS_NOT_FOUND' });
        return true;
      }

      const tbl = await repo.getTableByNumber(tableNumber);
      let targetBranch: string | null = null;
      for (const t of tasks) {
        const tRes = await resolveTaskAuthoritativeBranch(t);
        if (!tRes.quarantined && tRes.branchId) {
          targetBranch = tRes.branchId;
          break;
        }
      }
      const currentBranches = await repo.getBranches();
      if (!targetBranch && tbl && tbl.branchId && currentBranches.some((b) => b.id === tbl.branchId)) {
        targetBranch = tbl.branchId;
      }
      if (!targetBranch && identity.branchId !== '*') {
        sendJson(res, 403, {
          error: `Tasks for table ${tableNumber} have no trusted branch association and cannot be dispatched by branch-scoped credentials.`,
          code: 'BRANCH_MISMATCH',
        });
        return true;
      }

      const scopeCheck = authorizeKdsRequest(identity, targetBranch || undefined, undefined, true);
      if (!scopeCheck.authorized) {
        sendJson(res, scopeCheck.statusCode!, { error: scopeCheck.error, code: scopeCheck.code });
        return true;
      }

      // Idempotency Check
      const idempCheck = await checkKdsIdempotency(idempotencyKey, 'kds.expo-dispatch', tableNumber, targetBranch, {
        tableNumber,
      });
      if (idempCheck.hasConflict) {
        sendJson(res, 409, {
          error: 'IDEMPOTENCY_CONFLICT',
          code: 'IDEMPOTENCY_CONFLICT',
          message: `Idempotency key ${idempotencyKey} has already been used with a different operation, target, or payload.`,
        });
        return true;
      }
      if (idempCheck.isReplay) {
        sendJson(res, 200, {
          ...idempCheck.cachedResponse,
          isIdempotent: true,
          idempotentReplay: true,
        });
        return true;
      }

      // 3. Mutex Lock Check for Concurrent Dispatches
      const lockKey = `dispatch:${tenantContext.tenantId}:${tableNumber}:${targetBranch || '*'}`;
      if (activeDispatchLocks.has(lockKey)) {
        sendJson(res, 409, {
          error: 'DISPATCH_IN_PROGRESS',
          code: 'DISPATCH_IN_PROGRESS',
          message: `Dispatch is currently in progress for table ${tableNumber}. Concurrent dispatch requests locked.`,
        });
        return true;
      }
      activeDispatchLocks.add(lockKey);

      try {
        const unbumped = tasks.filter((t) => t.status !== 'BUMPED');
        if (unbumped.length === 0) {
          const alreadyPayload = {
            success: true,
            message: `All tasks for table ${tableNumber} already dispatched`,
            isIdempotent: true,
          };
          if (idempotencyKey) {
            const record = {
              operation: 'kds.expo-dispatch',
              targetId: tableNumber,
              branchId: targetBranch,
              payloadHash: idempCheck.payloadHash,
              response: alreadyPayload,
            };
            await repo.saveIdempotencyRecord(idempotencyKey, record);
          }
          sendJson(res, 200, alreadyPayload);
          return true;
        }

        // Readiness Gating: Every cooking task must reach READY before table dispatch
        const unreadyTasks = unbumped.filter((t) => t.status !== 'READY');
        const isForced = Boolean(body.force || body.override);
        if (unreadyTasks.length > 0 && !isForced) {
          sendJson(res, 422, {
            error: 'TASKS_NOT_READY',
            code: 'TASKS_NOT_READY',
            message: `Cannot dispatch table ${tableNumber}: ${unreadyTasks.length} task(s) are not yet marked READY. All station tasks must reach READY before Expo dispatch.`,
            pendingTasks: unreadyTasks.map((t) => ({
              taskId: t.id,
              itemName: t.itemName,
              station: t.station,
              status: t.status,
              fulfilledCount: t.fulfilledItemCount || 0,
              quantity: t.quantity,
            })),
          });
          return true;
        }

        if (unreadyTasks.length > 0 && isForced) {
          if (!identity.isPrivileged) {
            sendJson(res, 403, {
              error: 'FORBIDDEN',
              code: 'FORBIDDEN',
              message: 'Force dispatching unready tasks requires manager or admin credentials.',
            });
            return true;
          }
          await runtimeController.emitAudit('EXPO_FORCE_DISPATCH', identity.id, {
            tableNumber,
            unreadyCount: unreadyTasks.length,
            taskIds: unreadyTasks.map((t) => t.id),
          });
        }

        for (const t of unbumped) {
          await repo.updateKitchenTaskStatus(t.id, 'BUMPED');
        }

        // Advance linked order status to SERVED when all tasks are dispatched
        const orderIds = Array.from(new Set(tasks.map((t) => t.orderId).filter(Boolean)));
        for (const ordId of orderIds) {
          const ord = await repo.getOrder(ordId);
          if (ord && ord.status !== 'CANCELLED') {
            const ordTasks = (await repo.getKitchenTasks()).filter((t) => t.orderId === ordId);
            if (ordTasks.every((t) => t.status === 'BUMPED')) {
              await repo.updateOrderStatus(ordId, 'SERVED');
            }
          }
        }

        await repo.appendEvent(
          'expo.dispatched',
          'api:expo-pass',
          targetBranch || tbl?.branchId || currentBranch.id,
          { tableNumber, taskCount: unbumped.length },
          tbl?.floorId || currentFloor.id,
          tableNumber
        );

        const responsePayload = {
          success: true,
          message: `Order for table ${tableNumber} dispatched to floor (${unbumped.length} tasks bumped)`,
          isIdempotent: false,
        };
        if (idempotencyKey) {
          const record = {
            operation: 'kds.expo-dispatch',
            targetId: tableNumber,
            branchId: targetBranch,
            payloadHash: idempCheck.payloadHash,
            response: responsePayload,
          };
          await repo.saveIdempotencyRecord(idempotencyKey, record);
        }

        sendJson(res, 200, responsePayload);
        return true;
      } finally {
        activeDispatchLocks.delete(lockKey);
      }
    }

    // 11b. KDS Expo Table Recall
    if (pathname === '/api/restaurant/kds/expo-recall' && method === 'POST') {
      const identity = requestIdentity;
      const authCheck = authorizeKdsRequest(identity, undefined, undefined, true);
      if (!authCheck.authorized) {
        sendJson(res, authCheck.statusCode!, { error: authCheck.error, code: authCheck.code });
        return true;
      }

      const body = await parseBody(req);
      const tableNumber = body.tableNumber;
      if (!tableNumber) {
        sendJson(res, 400, { error: 'Table number is required', code: 'TABLE_NUMBER_REQUIRED' });
        return true;
      }

      const allTasks = await repo.getKitchenTasks();
      const tasks = allTasks.filter((t) => t.tableNumber === tableNumber);
      const bumpedTasks = tasks.filter((t) => t.status === 'BUMPED');
      if (bumpedTasks.length === 0) {
        sendJson(res, 400, { error: `No bumped tasks to recall for table ${tableNumber}`, code: 'NO_BUMPED_TASKS' });
        return true;
      }

      for (const t of bumpedTasks) {
        await repo.updateKitchenTaskStatus(t.id, 'READY');
      }

      await runtimeController.emitAudit('EXPO_TABLE_RECALLED', identity.id, {
        tableNumber,
        recalledCount: bumpedTasks.length,
      });

      sendJson(res, 200, {
        success: true,
        message: `Recalled ${bumpedTasks.length} task(s) for table ${tableNumber} back to READY pass.`,
        recalledTasks: bumpedTasks,
      });
      return true;
    }

  return false;
}
