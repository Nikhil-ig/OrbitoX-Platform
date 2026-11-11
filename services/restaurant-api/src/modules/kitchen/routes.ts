import { RouteDefinition } from '../../http/routes';
import {
  sendJson,
  runtimeController,
  activeDispatchLocks,
  checkTestKillPoint,
} from '../../http/context';
import {
  authorizeKdsRequest,
  resolveTaskAuthoritativeBranch,
  checkKdsIdempotency,
} from './service';

export const kitchenRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/api/restaurant/kds',
    handler: async (req, res, context) => {
      const branchId = (context.parsedUrl.query.branchId as string) || (context.parsedUrl.query.branch as string) || context.currentBranch?.id;
      const station = (context.parsedUrl.query.station as string) || undefined;
      const tasks = await context.posService.listKitchenTasks({ branchId, station });
      sendJson(res, 200, { success: true, count: tasks.length, data: tasks, tasks });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/kds/bump',
    handler: async (req, res, context) => {
      const body = await context.parseBody();
      const taskId = body.taskId;
      if (!taskId) {
        sendJson(res, 400, { error: 'taskId required', code: 'TASK_ID_REQUIRED' });
        return;
      }
      const task = (await context.repo.getKitchenTasks()).find((t) => t.id === taskId);
      if (!task) {
        sendJson(res, 404, { error: `Task ${taskId} not found`, code: 'TASK_NOT_FOUND' });
        return;
      }
      const taskBranchRes = await resolveTaskAuthoritativeBranch(task, context.repo);
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

      const responsePayload = {
        success: true,
        data: result.task,
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
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/kds/recall',
    handler: async (req, res, context) => {
      const body = await context.parseBody();
      const taskId = body.taskId;
      if (!taskId) {
        sendJson(res, 400, { error: 'taskId required' });
        return;
      }
      const task = (await context.repo.getKitchenTasks()).find((t) => t.id === taskId);
      if (!task) {
        sendJson(res, 404, { error: `Task ${taskId} not found` });
        return;
      }
      const taskBranchRes = await resolveTaskAuthoritativeBranch(task, context.repo);
      const authCheck = authorizeKdsRequest(context.requestIdentity, taskBranchRes.branchId || undefined, task.station);
      if (!authCheck.authorized) {
        sendJson(res, authCheck.statusCode || 403, { error: authCheck.error, code: authCheck.code });
        return;
      }
      const result = await context.repo.recallTask(taskId, body.targetStatus || 'IN_PROGRESS');
      sendJson(res, 200, { success: true, data: result.task });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/kds/expo-dispatch',
    handler: async (req, res, context) => {
      const body = await context.parseBody();
      const tableNumber = body.tableNumber;
      if (!tableNumber) {
        sendJson(res, 400, { error: 'tableNumber is required' });
        return;
      }
      const tasks = (await context.repo.getKitchenTasks()).filter((t) => t.tableNumber === tableNumber);
      if (tasks.length === 0) {
        sendJson(res, 400, { error: `No kitchen tasks found for table ${tableNumber}`, code: 'TASKS_NOT_FOUND' });
        return;
      }
      const authCheck = authorizeKdsRequest(context.requestIdentity, tasks[0].branchId || undefined, undefined, true);
      if (!authCheck.authorized) {
        sendJson(res, authCheck.statusCode || 403, { error: authCheck.error, code: authCheck.code });
        return;
      }
      const unbumped = tasks.filter((t) => t.status !== 'BUMPED');
      if (unbumped.length === 0) {
        sendJson(res, 200, { success: true, message: `All tasks for table ${tableNumber} already dispatched` });
        return;
      }
      const unready = unbumped.filter((t) => t.status !== 'READY');
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
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/kds/expo-recall',
    handler: async (req, res, context) => {
      const body = await context.parseBody();
      const tableNumber = body.tableNumber;
      if (!tableNumber) {
        sendJson(res, 400, { error: 'tableNumber required' });
        return;
      }
      const tasks = (await context.repo.getKitchenTasks()).filter((t) => t.tableNumber === tableNumber && t.status === 'BUMPED');
      for (const t of tasks) {
        await context.repo.recallTask(t.id, 'READY');
      }
      sendJson(res, 200, { success: true, count: tasks.length });
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
    method: 'GET',
    path: '/api/restaurant/kds/tasks',
    handler: async (req, res, context) => {
      const branchId = (context.parsedUrl.query.branchId as string) || context.currentBranch?.id;
      const tasks = await context.repo.getKitchenTasks();
      const filtered = branchId ? tasks.filter((t) => t.branchId === branchId) : tasks;
      sendJson(res, 200, { success: true, count: filtered.length, data: filtered });
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/kds/tasks/:id',
    handler: async (_req, res, context) => {
      const taskId = context.params.id;
      const task = (await context.repo.getKitchenTasks()).find((t) => t.id === taskId);
      if (!task) {
        sendJson(res, 404, { success: false, error: `Task ${taskId} not found` });
        return;
      }
      sendJson(res, 200, { success: true, data: task });
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

async function handleFulfillItem(req: any, res: any, context: any): Promise<void> {
  const body = await context.parseBody();
  const taskId = body.taskId;
  if (!taskId) {
    sendJson(res, 400, { error: 'taskId required' });
    return;
  }
  const task = (await context.repo.getKitchenTasks()).find((t: any) => t.id === taskId);
  if (!task) {
    sendJson(res, 404, { error: `Task ${taskId} not found` });
    return;
  }
  const taskBranchRes = await resolveTaskAuthoritativeBranch(task, context.repo);
  const authCheck = authorizeKdsRequest(context.requestIdentity, taskBranchRes.branchId || undefined, task.station);
  if (!authCheck.authorized) {
    sendJson(res, authCheck.statusCode || 403, { error: authCheck.error, code: authCheck.code });
    return;
  }
  const result = await context.repo.fulfillTaskItem(taskId, body.targetCount);
  sendJson(res, 200, { success: true, data: result.task });
}
