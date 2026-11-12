import crypto from 'node:crypto';
import { RouteDefinition } from '../../http/routes';
import {
  sendJson,
  eventBus,
  runtimeController,
  activeSettlementLocks,
  ownerSelfService,
} from '../../http/context';
import { generateSeats } from '../../shared';
import { handleTableSettle, handleTableBill, handleRotateLocator } from './service';

export const tablesRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/api/restaurant/tables',
    handler: async (req, res, context) => {
      const bId = (context.parsedUrl.query.branchId as string) || (context.parsedUrl.query.branch as string) || context.currentBranch?.id;
      const fId = (context.parsedUrl.query.floorId as string) || undefined;
      const tables = await context.repo.getTables(bId, fId);
      sendJson(res, 200, {
        success: true,
        tables,
      });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/tables',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Table creation requires Manager or Admin privileges.' });
        return;
      }
      try {
        const quotaCheck = await ownerSelfService.checkPlanLimits(context.tenantContext.tenantId, 'TABLES');
        if (!quotaCheck.allowed) {
          sendJson(res, 403, {
            error: 'PLAN_LIMIT_EXCEEDED',
            code: 'PLAN_LIMIT_EXCEEDED',
            message: quotaCheck.error || 'Table limit exceeded for current plan tier.',
            quota: quotaCheck,
          });
          return;
        }
        if (quotaCheck.warning) {
          res.setHeader('x-quota-warning', `${quotaCheck.percentage}%`);
        }

        const body = await context.parseBody();
        const allTables = await context.repo.getTables();
        const nextId = body.id ? (typeof body.id === 'number' ? body.id : parseInt(body.id, 10)) : Math.max(0, ...allTables.map((t: any) => t.id)) + 1;
        const tableNumber = body.number || `T-${nextId < 10 ? '0' + nextId : nextId}`;
        const capacity = Number(body.capacity) || 4;

        const newTable: any = {
          id: nextId,
          number: tableNumber,
          capacity,
          status: 'AVAILABLE',
          x: body.x || 100,
          y: body.y || 100,
          width: body.width || 90,
          height: body.height || 90,
          shape: body.shape || 'rectangle',
          section: body.section || 'Main',
          floorId: body.floorId || context.currentFloor?.id || 'floor_ground',
          branchId: body.branchId || context.currentBranch?.id || 'branch_ldh',
          locator: crypto.randomBytes(6).toString('base64url'),
          seats: generateSeats(capacity, nextId),
        };

        await context.repo.saveFloorTables([newTable]);
        sendJson(res, 201, { success: true, table: newTable, data: newTable });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/tables/:id',
    handler: async (_req, res, context) => {
      const id = context.params.id;
      const table = /^\d+$/.test(id) ? await context.repo.getTable(parseInt(id, 10)) : await context.repo.getTableByNumber(id);
      if (!table) {
        sendJson(res, 404, { error: 'Table not found' });
        return;
      }
      const bill = await context.repo.getTableBill(table.id);
      sendJson(res, 200, { success: true, table, bill });
    },
  },
  {
    method: 'PATCH',
    path: '/api/restaurant/tables/:id',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL') {
        sendJson(res, 401, { error: 'Invalid credential', code: 'INVALID_CREDENTIAL' });
        return;
      }
      if (identity.type === 'DINER' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 403, { error: 'Diner capability cannot modify table properties', code: 'FORBIDDEN' });
        return;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'Staff credential required', code: 'UNAUTHENTICATED' });
        return;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'Table modification requires Manager or Admin privileges', code: 'FORBIDDEN' });
        return;
      }

      const id = context.params.id;
      const tableId = /^\d+$/.test(id) ? parseInt(id, 10) : id;
      const existingTable = typeof tableId === 'number' ? await context.repo.getTable(tableId) : await context.repo.getTableByNumber(tableId);
      if (!existingTable) {
        sendJson(res, 404, { error: 'Table not found' });
        return;
      }
      if (identity.branchId && identity.branchId !== '*' && existingTable.branchId !== identity.branchId) {
        sendJson(res, 403, {
          error: `Credential for branch ${identity.branchId} cannot modify table in branch ${existingTable.branchId}`,
          code: 'BRANCH_MISMATCH',
        });
        return;
      }
      const body = await context.parseBody();

      let updatedTable: any;
      if (body.capacity && typeof tableId === 'number') {
        updatedTable = await context.repo.updateTableCapacity(tableId, parseInt(body.capacity, 10));
      } else {
        updatedTable = typeof tableId === 'number' ? await context.repo.getTable(tableId) : await context.repo.getTableByNumber(tableId);
        if (updatedTable) {
          if (body.status) updatedTable.status = body.status;
          if (body.serverName) updatedTable.serverName = body.serverName;
          await context.repo.saveFloorTables([updatedTable]);
        }
      }

      if (!updatedTable) {
        sendJson(res, 404, { error: 'Table not found' });
        return;
      }

      eventBus.broadcast({
        id: `evt_${Date.now()}`,
        sequence: (await context.repo.getEvents()).length,
        type: 'table.updated',
        timestamp: new Date().toISOString(),
        producer: 'api:table-patch',
        branchId: context.currentBranch?.id,
        tableNumber: updatedTable.number,
        tenantId: context.tenantContext?.tenantId,
        payload: updatedTable,
      });

      sendJson(res, 200, { success: true, table: updatedTable, data: updatedTable });
    },
  },
  {
    method: 'DELETE',
    path: '/api/restaurant/tables/:id',
    handler: async (_req, res, context) => {
      const identity = context.requestIdentity;
      if (!identity.isPrivileged) {
        sendJson(res, (identity.type === 'ANONYMOUS' || identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') ? 401 : 403, {
          error: 'FORBIDDEN',
          code: 'FORBIDDEN',
          message: 'Deleting tables requires manager privileges.',
        });
        return;
      }
      const tableId = parseInt(context.params.id, 10);
      const table = await context.repo.getTable(tableId);
      if (!table) {
        sendJson(res, 404, { error: 'Table not found', deletedTableId: tableId });
        return;
      }
      if (identity.branchId && identity.branchId !== '*' && table.branchId !== identity.branchId) {
        sendJson(res, 403, {
          error: `Credential for branch ${identity.branchId} cannot delete table in branch ${table.branchId}`,
          code: 'BRANCH_MISMATCH',
        });
        return;
      }
      const ok = await context.repo.deleteTable(tableId as number);
      sendJson(res, ok ? 200 : 404, { success: ok, deletedTableId: tableId });
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/qr/:locator',
    handler: async (_req, res, context) => {
      const locator = context.params.locator;
      const table = await context.repo.getTableByLocator(locator);
      if (!table) {
        sendJson(res, 404, {
          error: 'TABLE_NOT_FOUND',
          code: 'TABLE_NOT_FOUND',
          message: `No active dining table found for QR locator "${locator}".`,
        });
        return;
      }
      sendJson(res, 200, {
        success: true,
        data: {
          tableNumber: table.number,
          tableId: table.id,
          branchId: table.branchId,
          status: table.status,
          seats: table.seats,
          capacity: table.capacity,
          locator: table.locator,
        },
      });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/tables/settle',
    handler: (req, res, context) => handleTableSettle(req, res, context),
  },
  {
    method: 'POST',
    path: '/api/restaurant/tables/merge',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL') {
        sendJson(res, 401, { error: 'Invalid credential', code: 'INVALID_CREDENTIAL' });
        return;
      }
      if (identity.type === 'DINER' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 403, { error: 'Diners cannot merge tables', code: 'FORBIDDEN' });
        return;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'Staff credential required', code: 'UNAUTHENTICATED' });
        return;
      }
      const body = await context.parseBody();
      const ok = await context.repo.mergeTables(body.tableId1, body.tableId2);
      if (!ok) {
        sendJson(res, 404, { error: 'One or both tables not found' });
        return;
      }
      eventBus.broadcast({
        id: `evt_${Date.now()}`,
        sequence: (await context.repo.getEvents()).length,
        type: 'table.merged',
        timestamp: new Date().toISOString(),
        producer: 'api:table-merge',
        branchId: context.currentBranch?.id || '*',
        tenantId: context.tenantContext.tenantId,
        payload: body,
      });
      sendJson(res, 200, { success: true, message: 'Tables merged successfully' });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/tables/unmerge',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL') {
        sendJson(res, 401, { error: 'Invalid credential', code: 'INVALID_CREDENTIAL' });
        return;
      }
      if (identity.type === 'DINER' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 403, { error: 'Diners cannot unmerge tables', code: 'FORBIDDEN' });
        return;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'Staff credential required', code: 'UNAUTHENTICATED' });
        return;
      }
      const body = await context.parseBody();
      const ok = await context.repo.unmergeTables(body.tableId);
      if (!ok) {
        sendJson(res, 404, { error: 'Table not found' });
        return;
      }
      eventBus.broadcast({
        id: `evt_${Date.now()}`,
        sequence: (await context.repo.getEvents()).length,
        type: 'table.unmerged',
        timestamp: new Date().toISOString(),
        producer: 'api:table-unmerge',
        branchId: context.currentBranch?.id || '*',
        tenantId: context.tenantContext.tenantId,
        payload: body,
      });
      sendJson(res, 200, { success: true, message: 'Table unmerged successfully' });
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/floor',
    handler: async (_req, res, context) => {
      const branchId = (context.parsedUrl.query.branchId as string) || context.currentBranch?.id;
      const floorId = (context.parsedUrl.query.floorId as string) || context.currentFloor?.id;
      const tables = await context.repo.getTables(branchId);
      const filtered = floorId ? tables.filter((t) => t.floorId === floorId) : tables;
      sendJson(res, 200, { success: true, tables: filtered });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/floor/save',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: 'Invalid or revoked credential', code: identity.type });
        return;
      }
      if (identity.type === 'DINER') {
        sendJson(res, 403, { error: 'Diner capability cannot modify floor layout', code: 'FORBIDDEN' });
        return;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'Staff credential required', code: 'UNAUTHENTICATED' });
        return;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'Floor layout modification requires Manager or Admin privileges', code: 'FORBIDDEN' });
        return;
      }
      const body = await context.parseBody();
      if (Array.isArray(body.tables)) {
        const saveResult = await context.repo.saveFloorTables(
          body.tables,
          context.currentBranch?.id || 'branch_ldh',
          context.currentFloor?.id || 'floor_ground',
          { expectedRevision: body.expectedRevision }
        );
        if (!saveResult.success) {
          sendJson(res, 409, { error: saveResult.error, code: saveResult.code || 'REVISION_CONFLICT' });
          return;
        }
        eventBus.broadcast({
          id: `evt_${Date.now()}`,
          sequence: (await context.repo.getEvents()).length,
          type: 'table.updated',
          timestamp: new Date().toISOString(),
          producer: 'api:floor-save',
          branchId: context.currentBranch?.id || '*',
          tenantId: context.tenantContext.tenantId,
          payload: { totalTables: body.tables.length },
        });
        await runtimeController.emitAudit('FLOOR_LAYOUT_SAVED', 'admin:operations', { totalTables: body.tables.length });
        sendJson(res, 200, { success: true, message: 'Floor layout saved successfully' });
        return;
      }
      sendJson(res, 400, { error: 'Invalid tables payload' });
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/service-requests',
    handler: async (_req, res, context) => {
      const branchId = context.currentBranch?.id || 'branch_ldh';
      const requests = await context.repo.getServiceRequests(branchId);
      sendJson(res, 200, { success: true, data: requests });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/service-requests',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL') {
        sendJson(res, 401, { error: 'INVALID_CREDENTIAL', code: 'INVALID_CREDENTIAL' });
        return;
      }
      if (identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: 'CAPABILITY_REVOKED', code: 'CAPABILITY_REVOKED' });
        return;
      }
      if (process.env.NODE_ENV === 'production' && identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'CAPABILITY_REQUIRED', code: 'CAPABILITY_REQUIRED' });
        return;
      }
      const body = await context.parseBody();
      const tableNumber = body.tableNumber;
      if (!tableNumber) {
        sendJson(res, 400, { error: 'TABLE_REQUIRED', code: 'TABLE_REQUIRED', message: 'Table number is required.' });
        return;
      }

      if (identity.type === 'DINER' && identity.tableNumber) {
        const normIdTable = (identity.tableNumber || '').replace(/^T-/, '');
        const normReqTable = (tableNumber || '').replace(/^T-/, '');
        if (normIdTable !== normReqTable) {
          sendJson(res, 403, {
            error: 'TABLE_MISMATCH',
            code: 'TABLE_MISMATCH',
            message: `Diner capability for ${identity.tableNumber} cannot create service requests for ${tableNumber}.`,
          });
          return;
        }
      }

      const newReq: any = {
        id: body.id || `sreq_${Date.now()}`,
        tableNumber,
        branchId: body.branchId || context.currentBranch?.id || 'branch_ldh',
        floorId: body.floorId || context.currentFloor?.id || 'floor_ground',
        type: body.type || 'WATER',
        status: 'PENDING',
        requestedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        note: body.note,
      };
      await context.repo.addServiceRequest(newReq);
      sendJson(res, 201, { success: true, data: newReq });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/service-requests/:id/resolve',
    handler: async (_req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'ANONYMOUS') {
        sendJson(res, 401, {
          error: 'UNAUTHENTICATED',
          code: 'UNAUTHENTICATED',
          message: 'Resolving service requests requires authenticated staff or manager credentials.',
        });
        return;
      }
      if (identity.type === 'DINER' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 403, {
          error: 'FORBIDDEN',
          code: 'FORBIDDEN',
          message: 'Diners cannot resolve service requests.',
        });
        return;
      }
      const allowedRoles = ['WAITER', 'SERVER', 'RUNNER', 'HOST', 'CHEF', 'MANAGER', 'ADMIN'];
      const staffRole = identity.role || (identity.type === 'ADMIN' ? 'ADMIN' : '');
      if (!allowedRoles.includes(staffRole)) {
        sendJson(res, 403, {
          error: 'FORBIDDEN',
          code: 'FORBIDDEN',
          message: 'Resolving service requests requires operations staff or manager credentials.',
        });
        return;
      }
      const reqId = context.params.id || context.pathname.split('/')[4];
      const sReqs = await context.repo.getServiceRequests();
      const sReq = sReqs.find((r) => r.id === reqId);
      if (!sReq) {
        sendJson(res, 404, { error: 'Request not found' });
        return;
      }
      const targetTbl = await context.repo.getTableByNumber(sReq.tableNumber);
      if (targetTbl && identity.branchId && identity.branchId !== '*' && targetTbl.branchId !== identity.branchId) {
        sendJson(res, 403, {
          error: `Credential for branch ${identity.branchId} cannot resolve request in branch ${targetTbl.branchId}`,
          code: 'BRANCH_MISMATCH',
        });
        return;
      }
      const resolved = await context.repo.resolveServiceRequest(reqId);
      eventBus.broadcast({
        id: `evt_${Date.now()}`,
        sequence: (await context.repo.getEvents()).length,
        type: 'service_request.resolved',
        timestamp: new Date().toISOString(),
        producer: 'api:service-resolve',
        branchId: context.currentBranch?.id,
        tableNumber: resolved?.tableNumber || sReq.tableNumber,
        tenantId: context.tenantContext?.tenantId,
        payload: resolved,
      });
      sendJson(res, 200, { success: true, data: resolved });
    },
  },
];

export { handleTableBill, handleRotateLocator } from './service';

