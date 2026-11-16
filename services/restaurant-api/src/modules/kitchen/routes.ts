import { RouteDefinition } from '../../http/routes';
import {
  sendJson,
  runtimeController,
  activeDispatchLocks,
  checkTestKillPoint,
  postgresStore,
} from '../../http/context';
import {
  authorizeKdsRequest,
  resolveTaskAuthoritativeBranch,
  checkKdsIdempotency,
} from './service';

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

    if (task.tenantId && context.tenantContext?.tenantId && task.tenantId !== context.tenantContext.tenantId) {
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
    if (!parentOrder || !parentOrder.isTest) {
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
    if (task.tenantId && context.tenantContext?.tenantId && task.tenantId !== context.tenantContext.tenantId) {
      sendJson(res, 403, { error: `Task ${taskId} does not belong to active tenant ${context.tenantContext?.tenantId}.`, code: 'TASK_TENANT_MISMATCH' });
      return;
    }
    if (!task.isTest) {
      sendJson(res, 403, { error: 'Only test kitchen tasks can be recalled through preview bridge.', code: 'CANNOT_MUTATE_COMMERCIAL_TASK_IN_PREVIEW' });
      return;
    }
    const parentOrder = await context.repo.getOrder(task.orderId);
    if (!parentOrder || !parentOrder.isTest) {
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
  const tasks = (await context.repo.getKitchenTasks()).filter((t: any) => t.tableNumber === tableNumber);
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
      if (t.tenantId && context.tenantContext?.tenantId && t.tenantId !== context.tenantContext.tenantId) {
        sendJson(res, 403, { error: 'Cross-tenant task dispatch rejected.', code: 'TASK_TENANT_MISMATCH' });
        return;
      }
      if (!t.isTest) {
        sendJson(res, 403, { error: 'Cannot dispatch commercial tasks through preview bridge.', code: 'CANNOT_MUTATE_COMMERCIAL_TASK_IN_PREVIEW' });
        return;
      }
    }
  }
  const targetBranch = tasks[0].branchId;
  if (context.requestIdentity.branchId && context.requestIdentity.branchId !== '*' && targetBranch && targetBranch !== context.requestIdentity.branchId) {
    sendJson(res, 403, {
      error: `Staff credential for branch ${context.requestIdentity.branchId} cannot dispatch tables in branch ${targetBranch}.`,
      code: 'BRANCH_MISMATCH',
    });
    return;
  }
  const authCheck = authorizeKdsRequest(context.requestIdentity, tasks[0].branchId || undefined, undefined, true, 'dispatch');
  if (!authCheck.authorized) {
    sendJson(res, authCheck.statusCode || 403, { error: authCheck.error, code: authCheck.code });
    return;
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
    if (task.tenantId && context.tenantContext?.tenantId && task.tenantId !== context.tenantContext.tenantId) {
      sendJson(res, 403, { error: `Task ${taskId} does not belong to active tenant ${context.tenantContext?.tenantId}.`, code: 'TASK_TENANT_MISMATCH' });
      return;
    }
    if (!task.isTest) {
      sendJson(res, 403, { error: 'Only test kitchen tasks can be fulfilled through preview bridge.', code: 'CANNOT_MUTATE_COMMERCIAL_TASK_IN_PREVIEW' });
      return;
    }
    const parentOrder = await context.repo.getOrder(task.orderId);
    if (!parentOrder || !parentOrder.isTest) {
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

  // 4. Handle Staff & Station Callers
  const authCheck = authorizeKdsRequest(identity, undefined, undefined, false, 'read');
  if (!authCheck.authorized) {
    sendJson(res, authCheck.statusCode || 403, { error: authCheck.error, code: authCheck.code });
    return;
  }

  const stationFilter = (context.parsedUrl.query.station || context.parsedUrl.query.stationId) as string;
  const branchFilter = identity.isPrivileged
    ? (context.parsedUrl.query.branchId as string)
    : (identity.branchId && identity.branchId !== '*' ? identity.branchId : undefined);
  const tasks = await context.posService.listKitchenTasks({ station: stationFilter, branchId: branchFilter });
  sendJson(res, 200, {
    success: true,
    data: tasks,
    tasks,
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
    handler: async (req, res, context) => {
      const initialAuth = authorizeKdsRequest(context.requestIdentity, undefined, undefined, true);
      if (!initialAuth.authorized) {
        sendJson(res, initialAuth.statusCode || 401, { error: initialAuth.error, code: initialAuth.code });
        return;
      }
      const body = await context.parseBody();
      const tableNumber = body.tableNumber;
      if (!tableNumber) {
        sendJson(res, 400, { error: 'Table number is required', code: 'TABLE_NUMBER_REQUIRED' });
        return;
      }
      const tasks = (await context.repo.getKitchenTasks()).filter((t) => t.tableNumber === tableNumber);
      const bumpedTasks = tasks.filter((t) => t.status === 'BUMPED');
      if (bumpedTasks.length === 0) {
        sendJson(res, 400, { error: `No bumped tasks to recall for table ${tableNumber}`, code: 'NO_BUMPED_TASKS' });
        return;
      }
      for (const t of bumpedTasks) {
        await context.repo.recallTask(t.id, 'READY');
      }
      sendJson(res, 200, { success: true, count: bumpedTasks.length, tableNumber });
    },
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
