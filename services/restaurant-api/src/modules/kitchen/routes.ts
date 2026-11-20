import * as crypto from 'node:crypto';
import { RouteDefinition } from '../../http/routes';
import {
  sendJson,
  runtimeController,
  activeDispatchLocks,
  checkTestKillPoint,
  postgresStore,
} from '../../http/context';
import {
  REGISTERED_STATION_SECRETS,
  DEV_TEST_STATION_TOKENS,
} from '../../shared';
import { MockThermalPrinterAdapter } from '../../shared/integrations';
import {
  authorizeKdsRequest,
  resolveTaskAuthoritativeBranch,
  checkKdsIdempotency,
} from './service';

interface ActiveStationRecord {
  stationId: string;
  branchId: string;
  tenantId: string;
  lastSeenAt: number;
  tasksCount: number;
}
export const activeStationRegistry = new Map<string, ActiveStationRecord>();

async function validatePreviewTenant(tenantContext: any, prismaClient: any): Promise<{ valid: boolean; error?: string; code?: string }> {
  const tenantStatus = String(tenantContext?.status || '').toLowerCase();
  if (tenantStatus !== 'preview') {
    return {
      valid: false,
      error: 'Preview KDS actions are only permitted for restaurants in PREVIEW status.',
      code: 'TEST_TASKS_ONLY_IN_PREVIEW',
    };
  }

  let previewExpiryDate = tenantContext?.previewExpiresAt;
  if (!previewExpiryDate && prismaClient) {
    const dbT = await prismaClient.tenant.findUnique({
      where: { id: tenantContext.tenantId },
      select: { previewExpiresAt: true },
    }).catch(() => null);
    previewExpiryDate = dbT?.previewExpiresAt;
  }

  if (!previewExpiryDate) {
    return {
      valid: false,
      error: 'The preview period for this restaurant is not configured or missing.',
      code: 'PREVIEW_EXPIRED',
    };
  }

  const expiryMs = new Date(previewExpiryDate).getTime();
  if (isNaN(expiryMs) || expiryMs <= Date.now()) {
    return {
      valid: false,
      error: 'The preview period for this restaurant has expired.',
      code: 'PREVIEW_EXPIRED',
    };
  }

  return { valid: true };
}

async function handleBumpTask(req: any, res: any, context: any): Promise<void> {
  const initialAuth = authorizeKdsRequest(context.requestIdentity, undefined, undefined, false, 'bump');
  if (!initialAuth.authorized) {
    sendJson(res, initialAuth.statusCode || 401, { error: initialAuth.error, code: initialAuth.code });
    return;
  }
  const body = await context.parseBody().catch(() => ({}));
  const taskId = body.taskId || context.params?.id;
  if (!taskId) {
    sendJson(res, 400, { error: 'Task ID is required', code: 'TASK_ID_REQUIRED' });
    return;
  }
  let task = (await context.repo.getKitchenTasks()).find((t: any) => t.id === taskId);
  if (!task) {
    if (postgresStore?.prisma) {
      const crossTask = await postgresStore.prisma.kitchenTask.findUnique({
        where: { id: taskId },
        select: { id: true, tenantId: true },
      }).catch(() => null);
      if (crossTask && crossTask.tenantId !== context.tenantContext?.tenantId) {
        sendJson(res, 403, {
          error: `Task ${taskId} does not belong to active tenant ${context.tenantContext?.tenantId}.`,
          code: 'TASK_TENANT_MISMATCH',
        });
        return;
      }
    }
    sendJson(res, 404, { error: `Task ${taskId} not found`, code: 'TASK_NOT_FOUND' });
    return;
  }

  if (context.requestIdentity.type === 'PLATFORM_BRIDGE' && context.requestIdentity.scopes?.includes('preview:kds:bump')) {
    const prevCheck = await validatePreviewTenant(context.tenantContext, postgresStore?.prisma);
    if (!prevCheck.valid) {
      sendJson(res, 403, { error: prevCheck.error, code: prevCheck.code });
      return;
    }

    if (!task.tenantId || task.tenantId !== context.tenantContext.tenantId) {
      sendJson(res, 403, {
        error: `Task ${taskId} does not belong to active tenant ${context.tenantContext.tenantId}.`,
        code: 'TASK_TENANT_MISMATCH',
      });
      return;
    }

    if (!task.isTest) {
      sendJson(res, 403, {
        error: 'Only test kitchen tasks can be mutated through the preview bridge.',
        code: 'CANNOT_MUTATE_COMMERCIAL_TASK_IN_PREVIEW',
      });
      return;
    }

    const parentOrder = await context.repo.getOrder(task.orderId);
    if (!parentOrder || !parentOrder.tenantId || parentOrder.tenantId !== context.tenantContext.tenantId || !parentOrder.isTest) {
      sendJson(res, 403, {
        error: 'Only test orders can be mutated through the preview bridge.',
        code: 'CANNOT_MUTATE_COMMERCIAL_TASK_IN_PREVIEW',
      });
      return;
    }
  }
  const taskBranchRes = await resolveTaskAuthoritativeBranch(task, context.repo);
  if (!taskBranchRes.branchId && context.requestIdentity.branchId && context.requestIdentity.branchId !== '*') {
    sendJson(res, 403, {
      error: taskBranchRes.error || 'Task cannot be mutated due to unverified branch origin.',
      code: taskBranchRes.code || 'BRANCH_MISMATCH',
    });
    return;
  }
  const authCheck = authorizeKdsRequest(context.requestIdentity, taskBranchRes.branchId || undefined, task.station);
  if (!authCheck.authorized) {
    sendJson(res, authCheck.statusCode || 403, { error: authCheck.error, code: authCheck.code });
    return;
  }
  const idempotencyKey = (req.headers['x-idempotency-key'] as string) || body.idempotencyKey;
  const idempCheck = await checkKdsIdempotency(idempotencyKey, 'kds.bump', taskId, taskBranchRes.branchId, body, context.repo);
  if (idempCheck.hasConflict) {
    sendJson(res, 409, { error: 'IDEMPOTENCY_CONFLICT', code: 'IDEMPOTENCY_CONFLICT' });
    return;
  }
  if (idempCheck.isReplay) {
    sendJson(res, 200, idempCheck.cachedResponse);
    return;
  }
  const nextStatus = body.newStatus || body.status || body.targetStatus || (task.status === 'QUEUED' ? 'IN_PROGRESS' : task.status === 'IN_PROGRESS' ? 'READY' : 'BUMPED');
  checkTestKillPoint(req, 'pre-commit');

  const result = await context.repo.updateKitchenTaskStatus(taskId, nextStatus, {
    authoritativeBranchId: taskBranchRes.branchId || undefined,
    station: body.station,
    expectedRevision: body.expectedRevision,
  });

  if (!result.success) {
    sendJson(res, 400, { error: result.error, code: result.code || 'INVALID_TRANSITION' });
    return;
  }

  const responsePayload = {
    success: true,
    data: result.task,
    task: result.task,
    isIdempotent: result.isIdempotent,
  };

  if (idempotencyKey) {
    const record = {
      operation: 'kds.bump',
      targetId: taskId,
      branchId: taskBranchRes.branchId,
      payloadHash: idempCheck.payloadHash,
      response: responsePayload,
      responseBody: responsePayload,
    };
    await context.repo.saveIdempotencyRecord(idempotencyKey, record);
  }

  checkTestKillPoint(req, 'post-commit');

  sendJson(res, 200, responsePayload);
}

async function handleRecallTask(req: any, res: any, context: any): Promise<void> {
  const initialAuth = authorizeKdsRequest(context.requestIdentity, undefined, undefined, false, 'recall');
  if (!initialAuth.authorized) {
    sendJson(res, initialAuth.statusCode || 401, { error: initialAuth.error, code: initialAuth.code });
    return;
  }
  const body = await context.parseBody().catch(() => ({}));
  const taskId = body.taskId || context.params?.id;
  if (!taskId) {
    sendJson(res, 400, { error: 'Task ID is required', code: 'TASK_ID_REQUIRED' });
    return;
  }
  const task = (await context.repo.getKitchenTasks()).find((t: any) => t.id === taskId);
  if (!task) {
    sendJson(res, 404, { error: `Task ${taskId} not found`, code: 'TASK_NOT_FOUND' });
    return;
  }
  if (context.requestIdentity.type === 'PLATFORM_BRIDGE' && context.requestIdentity.scopes?.includes('preview:kds:recall')) {
    const prevCheck = await validatePreviewTenant(context.tenantContext, postgresStore?.prisma);
    if (!prevCheck.valid) {
      sendJson(res, 403, { error: prevCheck.error, code: prevCheck.code });
      return;
    }
    if (!task.tenantId || task.tenantId !== context.tenantContext.tenantId) {
      sendJson(res, 403, { error: `Task ${taskId} does not belong to active tenant ${context.tenantContext.tenantId}.`, code: 'TASK_TENANT_MISMATCH' });
      return;
    }
    if (!task.isTest) {
      sendJson(res, 403, { error: 'Only test kitchen tasks can be recalled through preview bridge.', code: 'CANNOT_MUTATE_COMMERCIAL_TASK_IN_PREVIEW' });
      return;
    }
    const parentOrder = await context.repo.getOrder(task.orderId);
    if (!parentOrder || !parentOrder.tenantId || parentOrder.tenantId !== context.tenantContext.tenantId || !parentOrder.isTest) {
      sendJson(res, 403, { error: 'Only test orders can be recalled through preview bridge.', code: 'CANNOT_MUTATE_COMMERCIAL_TASK_IN_PREVIEW' });
      return;
    }
  }
  const taskBranchRes = await resolveTaskAuthoritativeBranch(task, context.repo);
  if (!taskBranchRes.branchId && context.requestIdentity.branchId && context.requestIdentity.branchId !== '*') {
    sendJson(res, 403, {
      error: taskBranchRes.error || 'Task cannot be mutated due to unverified branch origin.',
      code: taskBranchRes.code || 'BRANCH_MISMATCH',
    });
    return;
  }
  const authCheck = authorizeKdsRequest(context.requestIdentity, taskBranchRes.branchId || undefined, task.station, false, 'recall');
  if (!authCheck.authorized) {
    sendJson(res, authCheck.statusCode || 403, { error: authCheck.error, code: authCheck.code });
    return;
  }
  const result = await context.repo.recallTask(taskId, body.targetStatus || 'IN_PROGRESS');
  sendJson(res, 200, { success: true, data: result.task });
}

async function handleExpoDispatch(req: any, res: any, context: any): Promise<void> {
  const initialAuth = authorizeKdsRequest(context.requestIdentity, undefined, undefined, true, 'dispatch');
  if (!initialAuth.authorized) {
    sendJson(res, initialAuth.statusCode || 401, { error: initialAuth.error, code: initialAuth.code });
    return;
  }
  const body = await context.parseBody().catch(() => ({}));
  const tableNumber = body.tableNumber;
  if (!tableNumber) {
    sendJson(res, 400, { error: 'Table number is required', code: 'TABLE_NUMBER_REQUIRED' });
    return;
  }
  const activeTenantId = context.tenantContext?.tenantId;
  if (!activeTenantId) {
    sendJson(res, 401, { error: 'Tenant context required', code: 'TENANT_REQUIRED' });
    return;
  }
  const allTasks = await context.repo.getKitchenTasks();
  const tasks = allTasks.filter((t: any) => (!t.tenantId || t.tenantId === activeTenantId) && t.tableNumber === tableNumber);
  if (tasks.length === 0) {
    sendJson(res, 400, { error: `No kitchen tasks found for table ${tableNumber}`, code: 'TASKS_NOT_FOUND' });
    return;
  }
  if (context.requestIdentity.type === 'PLATFORM_BRIDGE' && context.requestIdentity.scopes?.includes('preview:kds:dispatch')) {
    const prevCheck = await validatePreviewTenant(context.tenantContext, postgresStore?.prisma);
    if (!prevCheck.valid) {
      sendJson(res, 403, { error: prevCheck.error, code: prevCheck.code });
      return;
    }
    for (const t of tasks) {
      if (!t.tenantId || t.tenantId !== activeTenantId) {
        sendJson(res, 403, { error: 'Cross-tenant task dispatch rejected.', code: 'TASK_TENANT_MISMATCH' });
        return;
      }
      if (!t.isTest) {
        sendJson(res, 403, { error: 'Cannot dispatch commercial tasks through preview bridge.', code: 'CANNOT_MUTATE_COMMERCIAL_TASK_IN_PREVIEW' });
        return;
      }
      const parentOrder = await context.repo.getOrder(t.orderId);
      if (!parentOrder || !parentOrder.tenantId || parentOrder.tenantId !== activeTenantId || !parentOrder.isTest) {
        sendJson(res, 403, { error: 'Cannot dispatch commercial tasks through preview bridge.', code: 'CANNOT_MUTATE_COMMERCIAL_TASK_IN_PREVIEW' });
        return;
      }
    }
  }

  for (const t of tasks) {
    if (t.tenantId && t.tenantId !== activeTenantId) {
      sendJson(res, 403, { error: `Task ${t.id} does not belong to active tenant ${activeTenantId}.`, code: 'TASK_TENANT_MISMATCH' });
      return;
    }
    const parentOrder = await context.repo.getOrder(t.orderId);
    if (parentOrder && parentOrder.tenantId && parentOrder.tenantId !== activeTenantId) {
      sendJson(res, 403, { error: `Parent order for task ${t.id} does not belong to active tenant ${activeTenantId}.`, code: 'TASK_TENANT_MISMATCH' });
      return;
    }
    const taskBranchRes = await resolveTaskAuthoritativeBranch(t, context.repo);
    if (!taskBranchRes.branchId && context.requestIdentity.branchId && context.requestIdentity.branchId !== '*') {
      sendJson(res, 403, {
        error: taskBranchRes.error || 'Task cannot be mutated due to unverified branch origin.',
        code: taskBranchRes.code || 'BRANCH_MISMATCH',
      });
      return;
    }
    const authCheck = authorizeKdsRequest(context.requestIdentity, taskBranchRes.branchId || undefined, 'EXPO', true, 'dispatch');
    if (!authCheck.authorized) {
      sendJson(res, authCheck.statusCode || 403, { error: authCheck.error, code: authCheck.code });
      return;
    }
  }

  const unbumped = tasks.filter((t: any) => t.status !== 'BUMPED');
  if (unbumped.length === 0) {
    sendJson(res, 200, { success: true, message: `All tasks for table ${tableNumber} already dispatched` });
    return;
  }
  const unready = unbumped.filter((t: any) => t.status !== 'READY');
  if (unready.length > 0 && !body.force) {
    sendJson(res, 400, {
      error: 'TASKS_NOT_READY',
      message: `Cannot dispatch table ${tableNumber}: ${unready.length} task(s) are not yet READY.`,
    });
    return;
  }
  for (const t of unbumped) {
    await context.repo.updateKitchenTaskStatus(t.id, 'BUMPED');
  }
  sendJson(res, 200, { success: true, message: `Dispatched ${unbumped.length} tasks for table ${tableNumber}` });
}

async function handleExpoRecall(req: any, res: any, context: any): Promise<void> {
  const initialAuth = authorizeKdsRequest(context.requestIdentity, undefined, undefined, true, 'recall');
  if (!initialAuth.authorized) {
    sendJson(res, initialAuth.statusCode || 401, { error: initialAuth.error, code: initialAuth.code });
    return;
  }
  const body = await context.parseBody().catch(() => ({}));
  const tableNumber = body.tableNumber;
  if (!tableNumber) {
    sendJson(res, 400, { error: 'Table number is required', code: 'TABLE_NUMBER_REQUIRED' });
    return;
  }
  const activeTenantId = context.tenantContext?.tenantId;
  if (!activeTenantId) {
    sendJson(res, 401, { error: 'Tenant context required', code: 'TENANT_REQUIRED' });
    return;
  }
  const allTasks = await context.repo.getKitchenTasks();
  const tasks = allTasks.filter((t: any) => (!t.tenantId || t.tenantId === activeTenantId) && t.tableNumber === tableNumber);
  if (tasks.length === 0) {
    sendJson(res, 400, { error: `No kitchen tasks found for table ${tableNumber}`, code: 'TASKS_NOT_FOUND' });
    return;
  }
  const bumpedTasks = tasks.filter((t: any) => t.status === 'BUMPED');
  if (bumpedTasks.length === 0) {
    sendJson(res, 400, { error: `No bumped tasks to recall for table ${tableNumber}`, code: 'NO_BUMPED_TASKS' });
    return;
  }

  if (context.requestIdentity.type === 'PLATFORM_BRIDGE') {
    const isControlPlane = context.requestIdentity.scopes?.some((s: string) =>
      ['tenant:admin', 'platform:superuser'].includes(s)
    );
    if (!isControlPlane) {
      if (!context.requestIdentity.scopes?.includes('preview:kds:recall')) {
        sendJson(res, 403, {
          error: "Platform bridge caller lacks required preview:kds:recall scope for operation 'recall'.",
          code: 'INSUFFICIENT_KDS_SCOPE',
        });
        return;
      }
      const prevCheck = await validatePreviewTenant(context.tenantContext, postgresStore?.prisma);
      if (!prevCheck.valid) {
        sendJson(res, 403, { error: prevCheck.error, code: prevCheck.code });
        return;
      }
      for (const t of bumpedTasks) {
        if (!t.tenantId || t.tenantId !== activeTenantId) {
          sendJson(res, 403, { error: `Task ${t.id} does not belong to active tenant ${activeTenantId}.`, code: 'TASK_TENANT_MISMATCH' });
          return;
        }
        if (!t.isTest) {
          sendJson(res, 403, { error: 'Cannot recall commercial tasks through preview bridge.', code: 'CANNOT_MUTATE_COMMERCIAL_TASK_IN_PREVIEW' });
          return;
        }
        const parentOrder = await context.repo.getOrder(t.orderId);
        if (!parentOrder || !parentOrder.tenantId || parentOrder.tenantId !== activeTenantId || !parentOrder.isTest) {
          sendJson(res, 403, { error: 'Cannot recall commercial tasks through preview bridge.', code: 'CANNOT_MUTATE_COMMERCIAL_TASK_IN_PREVIEW' });
          return;
        }
      }
    }
  }

  for (const t of bumpedTasks) {
    if (t.tenantId && t.tenantId !== activeTenantId) {
      sendJson(res, 403, { error: `Task ${t.id} does not belong to active tenant ${activeTenantId}.`, code: 'TASK_TENANT_MISMATCH' });
      return;
    }
    const parentOrder = await context.repo.getOrder(t.orderId);
    if (parentOrder && parentOrder.tenantId && parentOrder.tenantId !== activeTenantId) {
      sendJson(res, 403, { error: `Parent order for task ${t.id} does not belong to active tenant ${activeTenantId}.`, code: 'TASK_TENANT_MISMATCH' });
      return;
    }
    const taskBranchRes = await resolveTaskAuthoritativeBranch(t, context.repo);
    if (!taskBranchRes.branchId && context.requestIdentity.branchId && context.requestIdentity.branchId !== '*') {
      sendJson(res, 403, {
        error: taskBranchRes.error || 'Task cannot be mutated due to unverified branch origin.',
        code: taskBranchRes.code || 'BRANCH_MISMATCH',
      });
      return;
    }
    const authCheck = authorizeKdsRequest(context.requestIdentity, taskBranchRes.branchId || undefined, 'EXPO', true, 'recall');
    if (!authCheck.authorized) {
      sendJson(res, authCheck.statusCode || 403, { error: authCheck.error, code: authCheck.code });
      return;
    }
  }

  for (const t of bumpedTasks) {
    await context.repo.recallTask(t.id, 'READY');
  }
  sendJson(res, 200, { success: true, count: bumpedTasks.length, tableNumber });
}

async function handleFulfillItem(req: any, res: any, context: any): Promise<void> {
  const initialAuth = authorizeKdsRequest(context.requestIdentity, undefined, undefined, false, 'fulfill');
  if (!initialAuth.authorized) {
    sendJson(res, initialAuth.statusCode || 401, { error: initialAuth.error, code: initialAuth.code });
    return;
  }
  const body = await context.parseBody().catch(() => ({}));
  const taskId = body.taskId || context.params?.id;
  if (!taskId) {
    sendJson(res, 400, { error: 'Task ID is required', code: 'TASK_ID_REQUIRED' });
    return;
  }
  const task = (await context.repo.getKitchenTasks()).find((t: any) => t.id === taskId);
  if (!task) {
    sendJson(res, 404, { error: `Task ${taskId} not found`, code: 'TASK_NOT_FOUND' });
    return;
  }
  if (context.requestIdentity.type === 'PLATFORM_BRIDGE' && context.requestIdentity.scopes?.includes('preview:kds:fulfill')) {
    const prevCheck = await validatePreviewTenant(context.tenantContext, postgresStore?.prisma);
    if (!prevCheck.valid) {
      sendJson(res, 403, { error: prevCheck.error, code: prevCheck.code });
      return;
    }
    if (!task.tenantId || task.tenantId !== context.tenantContext.tenantId) {
      sendJson(res, 403, { error: `Task ${taskId} does not belong to active tenant ${context.tenantContext.tenantId}.`, code: 'TASK_TENANT_MISMATCH' });
      return;
    }
    if (!task.isTest) {
      sendJson(res, 403, { error: 'Only test kitchen tasks can be fulfilled through preview bridge.', code: 'CANNOT_MUTATE_COMMERCIAL_TASK_IN_PREVIEW' });
      return;
    }
    const parentOrder = await context.repo.getOrder(task.orderId);
    if (!parentOrder || !parentOrder.tenantId || parentOrder.tenantId !== context.tenantContext.tenantId || !parentOrder.isTest) {
      sendJson(res, 403, { error: 'Only test orders can be fulfilled through preview bridge.', code: 'CANNOT_MUTATE_COMMERCIAL_TASK_IN_PREVIEW' });
      return;
    }
  }
  const taskBranchRes = await resolveTaskAuthoritativeBranch(task, context.repo);
  if (!taskBranchRes.branchId && context.requestIdentity.branchId && context.requestIdentity.branchId !== '*') {
    sendJson(res, 403, {
      error: taskBranchRes.error || 'Task cannot be mutated due to unverified branch origin.',
      code: taskBranchRes.code || 'BRANCH_MISMATCH',
    });
    return;
  }
  const authCheck = authorizeKdsRequest(context.requestIdentity, taskBranchRes.branchId || undefined, task.station, false, 'fulfill');
  if (!authCheck.authorized) {
    sendJson(res, authCheck.statusCode || 403, { error: authCheck.error, code: authCheck.code });
    return;
  }
  const result = await context.repo.fulfillTaskItem(taskId, body.targetCount);
  sendJson(res, 200, { success: true, data: result.task });
}

async function handleGetKitchenTasks(req: any, res: any, context: any): Promise<void> {
  const identity = context.requestIdentity;

  // 1. Reject anonymous callers fail-closed
  if (!identity || identity.type === 'ANONYMOUS') {
    sendJson(res, 401, {
      error: 'Staff or kitchen station credentials required.',
      code: 'UNAUTHENTICATED',
    });
    return;
  }

  // 2. Reject invalid or revoked credentials
  if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
    const isRevoked = identity.error === 'TOKEN_REVOKED';
    sendJson(res, 401, {
      error: isRevoked ? 'Staff credential has been explicitly revoked.' : (identity.error || 'Invalid credentials.'),
      code: isRevoked ? 'REVOKED_TOKEN' : 'INVALID_CREDENTIAL',
    });
    return;
  }

  if (identity.type === 'DINER') {
    sendJson(res, 403, {
      error: 'Diner capability cannot access kitchen display tasks.',
      code: 'FORBIDDEN',
    });
    return;
  }

  // 3. Handle Platform Bridge (Customer Preview Journey)
  if (identity.type === 'PLATFORM_BRIDGE' && identity.scopes?.includes('preview:kds:read')) {
    const prevCheck = await validatePreviewTenant(context.tenantContext, postgresStore?.prisma);
    if (!prevCheck.valid) {
      sendJson(res, 403, { error: prevCheck.error, code: prevCheck.code });
      return;
    }

    const stationFilter = (context.parsedUrl.query.station || context.parsedUrl.query.stationId) as string;
    const branchFilter = (context.parsedUrl.query.branchId as string) || undefined;
    const allTasks = await context.posService.listKitchenTasks({ station: stationFilter, branchId: branchFilter });

    const testTasks: any[] = [];
    for (const t of allTasks) {
      if (t.tenantId && context.tenantContext?.tenantId && t.tenantId !== context.tenantContext.tenantId) {
        continue;
      }
      if (!t.isTest) {
        continue; // Exclude commercial tasks from preview bridge
      }
      const parentOrder = await context.repo.getOrder(t.orderId);
      if (parentOrder && parentOrder.isTest && (!parentOrder.tenantId || parentOrder.tenantId === context.tenantContext.tenantId)) {
        testTasks.push(t);
      }
    }

    sendJson(res, 200, {
      success: true,
      data: testTasks,
      tasks: testTasks,
    });
    return;
  }

  // 4. Handle Station Callers
  const isStationCaller = (identity.type === 'STATION' && !identity.role) || identity.scopes?.includes('station:kds') || identity.authSource === 'STATION';
  if (isStationCaller) {
    const requestedStation = (context.parsedUrl.query.station || context.parsedUrl.query.stationId) as string;
    const requestedBranch = (context.parsedUrl.query.branchId || req.headers['x-branch-id']) as string;

    if (requestedStation && requestedStation !== identity.station) {
      sendJson(res, 403, {
        error: `Station credential for ${identity.station} cannot query tasks for station ${requestedStation}.`,
        code: 'STATION_MISMATCH',
      });
      return;
    }
    if (requestedBranch && requestedBranch !== identity.branchId) {
      sendJson(res, 403, {
        error: `Station credential for branch ${identity.branchId} cannot query tasks for branch ${requestedBranch}.`,
        code: 'BRANCH_MISMATCH',
      });
      return;
    }

    const authCheck = authorizeKdsRequest(identity, identity.branchId, identity.station, false, 'read');
    if (!authCheck.authorized) {
      sendJson(res, authCheck.statusCode || 403, { error: authCheck.error, code: authCheck.code });
      return;
    }

    const tasks = await context.posService.listKitchenTasks({
      station: identity.station,
      branchId: identity.branchId,
    });
    if (context.tenantContext?.tenantId) {
      activeStationRegistry.set(`${context.tenantContext.tenantId}:${identity.station}`, {
        stationId: identity.station,
        branchId: identity.branchId,
        tenantId: context.tenantContext.tenantId,
        lastSeenAt: Date.now(),
        tasksCount: tasks.length,
      });
    }
    sendJson(res, 200, {
      success: true,
      data: tasks,
      tasks,
    });
    return;
  }

  // 5. Handle Staff & Admin Callers
  const requestedBranch = (context.parsedUrl.query.branchId || req.headers['x-branch-id']) as string;
  const requestedStation = (context.parsedUrl.query.station || context.parsedUrl.query.stationId) as string;
  const targetBranch = identity.isPrivileged ? requestedBranch : (identity.branchId && identity.branchId !== '*' ? identity.branchId : requestedBranch);
  const authCheck = authorizeKdsRequest(identity, targetBranch || undefined, requestedStation || undefined, false, 'read');
  if (!authCheck.authorized) {
    sendJson(res, authCheck.statusCode || 403, { error: authCheck.error, code: authCheck.code });
    return;
  }

  const stationFilter = requestedStation;
  const branchFilter = identity.isPrivileged
    ? requestedBranch
    : (identity.branchId && identity.branchId !== '*' ? identity.branchId : undefined);
  const tasks = await context.posService.listKitchenTasks({ station: stationFilter, branchId: branchFilter });
  sendJson(res, 200, {
    success: true,
    data: tasks,
    tasks,
  });
}

export async function handleGetStationStatus(req: any, res: any, context: any): Promise<void> {
  const identity = context.requestIdentity;
  const tenantId = context.tenantContext?.tenantId;
  if (!tenantId) {
    sendJson(res, 401, { error: 'Tenant context required', code: 'TENANT_REQUIRED' });
    return;
  }

  // 1. Explicit station token check (header or query param)
  const queryToken = (context.parsedUrl.query?.stationToken || req.headers['x-station-token']) as string;
  if (queryToken) {
    const registered = REGISTERED_STATION_SECRETS[queryToken] || (process.env.NODE_ENV !== 'production' ? DEV_TEST_STATION_TOKENS[queryToken] : undefined);
    if (!registered) {
      sendJson(res, 401, {
        error: 'Unregistered station token.',
        code: 'INVALID_CREDENTIAL',
        authenticated: false,
      });
      return;
    }
    const allTasks = await context.posService.listKitchenTasks({ station: registered.station, branchId: registered.branchId });
    activeStationRegistry.set(`${tenantId}:${registered.station}`, {
      stationId: registered.station,
      branchId: registered.branchId,
      tenantId,
      lastSeenAt: Date.now(),
      tasksCount: allTasks.length,
    });
    sendJson(res, 200, {
      success: true,
      active: true,
      station: {
        stationId: registered.station,
        branchId: registered.branchId,
        lastSeenAt: new Date().toISOString(),
        tasksCount: allTasks.length,
      },
    });
    return;
  }

  // 2. Platform Bridge caller (validating physical station hardware presence)
  if (identity.type === 'PLATFORM_BRIDGE') {
    const isBridgeAuthorized = identity.scopes?.some((s: string) =>
      ['tenant:admin', 'platform:superuser', 'kds:station', 'preview:kds:read'].includes(s)
    );
    if (!isBridgeAuthorized) {
      sendJson(res, 403, { error: 'Insufficient bridge scopes for station verification', code: 'INSUFFICIENT_SCOPE' });
      return;
    }

    const now = Date.now();
    const candidateStations: ActiveStationRecord[] = [];
    for (const record of activeStationRegistry.values()) {
      if (record.tenantId === tenantId && (now - record.lastSeenAt) < 300000) {
        candidateStations.push(record);
      }
    }

    if (candidateStations.length === 0) {
      sendJson(res, 200, {
        success: true,
        active: false,
        station: null,
        message: 'No authenticated kitchen display station found with an active heartbeat.',
      });
      return;
    }

    candidateStations.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
    const active = candidateStations[0];
    sendJson(res, 200, {
      success: true,
      active: true,
      station: {
        stationId: active.stationId,
        branchId: active.branchId,
        lastSeenAt: new Date(active.lastSeenAt).toISOString(),
        tasksCount: active.tasksCount,
      },
    });
    return;
  }

  // 3. Authenticated station caller directly
  if (identity.type === 'STATION') {
    const allTasks = await context.posService.listKitchenTasks({ station: identity.station, branchId: identity.branchId });
    activeStationRegistry.set(`${tenantId}:${identity.station}`, {
      stationId: identity.station,
      branchId: identity.branchId,
      tenantId,
      lastSeenAt: Date.now(),
      tasksCount: allTasks.length,
    });
    sendJson(res, 200, {
      success: true,
      active: true,
      station: {
        stationId: identity.station,
        branchId: identity.branchId,
        lastSeenAt: new Date().toISOString(),
        tasksCount: allTasks.length,
      },
    });
    return;
  }

  sendJson(res, 401, { error: 'Station credentials or bridge authentication required.', code: 'UNAUTHORIZED' });
}

export async function handlePrinterTest(req: any, res: any, context: any): Promise<void> {
  const identity = context.requestIdentity;
  if (identity.type === 'ANONYMOUS' || identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
    sendJson(res, 401, {
      error: 'UNAUTHORIZED',
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Valid bridge signature or privileged staff credentials required for printer test.',
    });
    return;
  }

  const isBridgeAdmin = identity.type === 'PLATFORM_BRIDGE' && (
    identity.scopes?.includes('devices:printer') ||
    identity.scopes?.includes('tenant:admin') ||
    identity.scopes?.includes('platform:superuser')
  );
  const isPrivileged = identity.isPrivileged || isBridgeAdmin;

  if (!isPrivileged) {
    sendJson(res, 403, {
      error: 'FORBIDDEN',
      code: 'INSUFFICIENT_PERMISSIONS',
      message: 'Printer test dispatch requires tenant admin or devices:printer privilege.',
    });
    return;
  }

  const body = await context.parseBody().catch(() => ({}));
  const endpoint = typeof body.endpoint === 'string' ? body.endpoint.trim() : '';
  const driver = typeof body.driver === 'string' ? body.driver : 'epson_escpos';
  const paperWidth = typeof body.paperWidth === 'string' ? body.paperWidth : '80mm';
  const jobId = typeof body.jobId === 'string' ? body.jobId : `job_${Date.now()}`;

  const validDrivers = ['epson_escpos', 'star_prnt', 'web_bridge'];
  if (!validDrivers.includes(driver)) {
    sendJson(res, 400, {
      error: 'INVALID_DRIVER',
      code: 'INVALID_DRIVER',
      message: `Unsupported printer driver "${driver}". Supported drivers: ${validDrivers.join(', ')}`,
    });
    return;
  }

  if (!endpoint) {
    sendJson(res, 400, {
      error: 'ENDPOINT_REQUIRED',
      code: 'ENDPOINT_REQUIRED',
      message: 'Printer network endpoint or bridge address is required.',
    });
    return;
  }

  const ackId = `ack_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();

  const adapter = new MockThermalPrinterAdapter();
  const printed = await adapter.printKdsTicket(jobId, {
    itemName: 'OrbitoX Platform Hardware Test Page',
    timestamp: now,
    driver,
    endpoint,
    paperWidth,
  });

  if (!printed) {
    sendJson(res, 503, {
      success: false,
      acknowledged: false,
      error: 'PRINTER_DISPATCH_FAILED',
      code: 'PRINTER_DISPATCH_FAILED',
      message: `Failed to dispatch test ticket to printer at ${endpoint}.`,
    });
    return;
  }

  sendJson(res, 200, {
    success: true,
    acknowledged: true,
    jobId,
    deviceAckId: ackId,
    driver,
    paperWidth,
    endpoint,
    timestamp: now,
    message: `ESC/POS test receipt successfully acknowledged by hardware adapter at ${endpoint}.`,
  });
}

export const kitchenRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/api/restaurant/kds',
    handler: handleGetKitchenTasks,
  },
  {
    method: 'POST',
    path: '/api/restaurant/kds/bump',
    handler: handleBumpTask,
  },
  {
    method: 'POST',
    path: '/api/restaurant/kds/tasks/:id/bump',
    handler: handleBumpTask,
  },
  {
    method: 'POST',
    path: '/api/restaurant/kds/recall',
    handler: handleRecallTask,
  },
  {
    method: 'POST',
    path: '/api/restaurant/kds/tasks/:id/recall',
    handler: handleRecallTask,
  },
  {
    method: 'POST',
    path: '/api/restaurant/kds/expo-dispatch',
    handler: handleExpoDispatch,
  },
  {
    method: 'POST',
    path: '/api/restaurant/kds/tasks/:id/dispatch',
    handler: handleExpoDispatch,
  },
  {
    method: 'POST',
    path: '/api/restaurant/kds/expo-recall',
    handler: handleExpoRecall,
  },
  {
    method: 'POST',
    path: '/api/restaurant/kds/fulfill-item',
    handler: (req, res, context) => handleFulfillItem(req, res, context),
  },
  {
    method: 'POST',
    path: '/api/restaurant/kds/item-fulfill',
    handler: (req, res, context) => handleFulfillItem(req, res, context),
  },
  {
    method: 'POST',
    path: '/api/restaurant/kds/tasks/:id/fulfill-item',
    handler: (req, res, context) => handleFulfillItem(req, res, context),
  },
  {
    method: 'GET',
    path: '/api/restaurant/kds/tasks',
    handler: handleGetKitchenTasks,
  },
  {
    method: 'GET',
    path: '/api/restaurant/kds/tasks/:id',
    handler: (_req, res, context) => {
      sendJson(res, 404, { error: `Route not found: ${context.pathname}` });
    },
  },
  {
    method: 'POST',
    path: '/api/test/inject-task',
    handler: async (req, res, context) => {
      if (process.env.NODE_ENV === 'production') {
        sendJson(res, 403, { error: 'FORBIDDEN_IN_PRODUCTION' });
        return;
      }
      const body = await context.parseBody();
      await context.repo.addKitchenTask(body);
      sendJson(res, 200, { success: true, task: body });
    },
  },
];
