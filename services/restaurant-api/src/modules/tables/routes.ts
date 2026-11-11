import crypto from 'node:crypto';
import { RouteDefinition } from '../../http/routes';
import {
  sendJson,
  eventBus,
  runtimeController,
  activeSettlementLocks,
} from '../../http/context';
import { generateSeats } from '../../shared';

export const tablesRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/api/restaurant/tables',
    handler: async (req, res, context) => {
      const branchId = (context.parsedUrl.query.branchId as string) || (context.parsedUrl.query.branch as string) || context.currentBranch?.id;
      const tables = await context.repo.getTables(branchId);
      sendJson(res, 200, { success: true, count: tables.length, data: tables });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/tables',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Table creation requires Manager or Admin privileges.' });
        return;
      }
      const body = await context.parseBody();
      try {
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
        sendJson(res, 404, { success: false, error: `Table ${id} not found` });
        return;
      }
      sendJson(res, 200, { success: true, data: table });
    },
  },
  {
    method: 'PATCH',
    path: '/api/restaurant/tables/:id',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (!identity.isPrivileged && identity.type !== 'STAFF') {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Staff credentials required to update table.' });
        return;
      }
      const id = context.params.id;
      const body = await context.parseBody();
      try {
        const tableId = /^\d+$/.test(id) ? parseInt(id, 10) : id;
        let updated: any;
        if (body.capacity) {
          updated = await context.repo.updateTableCapacity(tableId as number, parseInt(body.capacity, 10));
        } else {
          updated = typeof tableId === 'number' ? await context.repo.getTable(tableId) : await context.repo.getTableByNumber(tableId);
          if (updated) {
            if (body.status) updated.status = body.status;
            if (body.serverName) updated.serverName = body.serverName;
            await context.repo.saveFloorTables([updated]);
          }
        }
        sendJson(res, 200, { success: true, data: updated, table: updated });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
    },
  },
  {
    method: 'DELETE',
    path: '/api/restaurant/tables/:id',
    handler: async (_req, res, context) => {
      const identity = context.requestIdentity;
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Table deletion requires Manager or Admin privileges.' });
        return;
      }
      const id = context.params.id;
      const tableId = /^\d+$/.test(id) ? parseInt(id, 10) : id;
      const deleted = await context.repo.deleteTable(tableId);
      sendJson(res, deleted ? 200 : 404, { success: deleted, tableId });
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
          success: false,
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
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (!identity.isPrivileged && identity.type !== 'STAFF') {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Staff credentials required to settle table.' });
        return;
      }
      const body = await context.parseBody();
      const tableParam = body.tableId !== undefined ? body.tableId : body.tableNumber;
      const targetTable = typeof tableParam === 'number'
        ? await context.repo.getTable(tableParam)
        : await context.repo.getTableByNumber(String(tableParam));

      if (!targetTable) {
        sendJson(res, 404, { error: 'TABLE_NOT_FOUND', code: 'TABLE_NOT_FOUND', message: `Table ${tableParam} not found.` });
        return;
      }

      const lockKey = `${context.tenantContext.tenantId}:${targetTable.number}`;
      if (activeSettlementLocks.has(lockKey)) {
        sendJson(res, 409, { error: 'SETTLEMENT_IN_PROGRESS', message: 'Settlement already in progress for this table.' });
        return;
      }
      activeSettlementLocks.add(lockKey);
      try {
        const authorizer = identity.id;
        const settlementPayload = {
          method: body.paymentMethod || body.method || 'CASH',
          status: body.paymentStatus || body.status || 'PAID',
          amountMinor: body.amountMinor,
          authorizedBy: authorizer,
          reason: body.reason,
          verification: 'MANUAL_STAFF_RECORDED' as const,
          settledAt: new Date().toISOString(),
        };
        const result = await context.repo.settleTableSession(targetTable.id, settlementPayload, {
          expectedRevision: body.expectedRevision,
          authorizedBy: authorizer,
          reason: body.reason,
        });
        sendJson(res, result.success ? 200 : 400, result);
      } finally {
        activeSettlementLocks.delete(lockKey);
      }
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/tables/merge',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'DINER' || identity.type === 'ANONYMOUS') {
        sendJson(res, 403, { error: 'Diners cannot merge tables', code: 'FORBIDDEN' });
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
      if (identity.type === 'DINER' || identity.type === 'ANONYMOUS') {
        sendJson(res, 403, { error: 'Diners cannot unmerge tables', code: 'FORBIDDEN' });
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
      sendJson(res, 200, { success: true, branchId, floorId, tables: filtered });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/floor/save',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
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
    path: '/api/restaurant/layout',
    handler: async (_req, res, context) => {
      const [branches, floors, tables] = await Promise.all([
        context.repo.getBranches(),
        context.repo.getFloors(),
        context.repo.getTables(),
      ]);
      sendJson(res, 200, { branches, floors, tables });
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
      const body = await context.parseBody();
      const newReq: any = {
        id: body.id || `sreq_${Date.now()}`,
        tableNumber: body.tableNumber,
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
      if (identity.type === 'DINER' || identity.type === 'ANONYMOUS') {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Diners cannot resolve service requests.' });
        return;
      }
      const reqId = context.params.id;
      const resolved = await context.repo.resolveServiceRequest(reqId);
      if (!resolved) {
        sendJson(res, 404, { success: false, error: `Service request ${reqId} not found` });
        return;
      }
      sendJson(res, 200, { success: true, data: resolved });
    },
  },
];
