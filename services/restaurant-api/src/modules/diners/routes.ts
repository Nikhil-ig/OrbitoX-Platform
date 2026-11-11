import * as crypto from 'crypto';
import { RouteDefinition } from '../../http/routes';
import { sendJson, eventBus } from '../../http/context';
import { TableFloorRecord } from '../../shared';

export const dinersRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    path: '/api/restaurant/sessions/join',
    handler: async (req, res, context) => {
      const body = await context.parseBody();
      let targetTbl: TableFloorRecord | undefined;
      if (body.locator) {
        targetTbl = await context.repo.getTableByLocator(body.locator);
      }
      if (!targetTbl && body.tableNumber) {
        targetTbl = await context.repo.getTableByNumber(body.tableNumber);
      }
      if (!targetTbl && body.tableNumber) {
        targetTbl = await context.repo.getTableByNumber(`T-${body.tableNumber}`);
      }
      if (!targetTbl && body.tableId) {
        targetTbl = await context.repo.getTable(body.tableId);
      }

      if (!targetTbl) {
        sendJson(res, 404, {
          error: 'TABLE_NOT_FOUND',
          code: 'TABLE_NOT_FOUND',
          message: `Table not found for provided locator/number: ${body.locator || body.tableNumber || body.tableId}`,
        });
        return;
      }

      const tableNum = targetTbl.number;
      const capabilityToken = `cap_${crypto.randomBytes(16).toString('hex')}`;
      const hostName = body.guestName || body.name || 'Primary Host';

      const session = await context.posService.createOrJoinSession({
        tableNumber: tableNum,
        hostName,
        branchId: targetTbl.branchId || context.currentBranch?.id || 'branch_ldh',
        floorId: targetTbl.floorId || context.currentFloor?.id || 'floor_ground',
        capabilityToken,
      });

      const s1 = targetTbl.seats?.find((s) => s.seatNumber === 1);
      if (s1 && !s1.guestName) {
        await context.repo.assignGuestToSeat(s1.id, hostName);
      }

      sendJson(res, 200, {
        success: true,
        data: {
          sessionId: session.sessionId,
          capabilityToken,
          tableNumber: tableNum,
          seatingType: body.seatingType || 'PRIMARY_HOST',
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        },
      });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/sessions/close',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, {
          error: 'REVOKED_CAPABILITY',
          code: 'REVOKED_CAPABILITY',
          message: 'Guest capability token has expired or session is closed.',
        });
        return;
      }

      const body = await context.parseBody();
      let targetTbl: TableFloorRecord | undefined;
      if (body.tableNumber) {
        targetTbl = await context.repo.getTableByNumber(body.tableNumber);
      }
      if (!targetTbl && body.sessionId) {
        const sess = await context.repo.getSession(body.sessionId);
        if (sess) {
          targetTbl = await context.repo.getTableByNumber(sess.tableNumber);
        }
      }

      if (!targetTbl) {
        sendJson(res, 404, { error: 'TABLE_NOT_FOUND', message: 'Table or session not found.' });
        return;
      }

      const closed = await context.posService.closeSession({ tableNumber: targetTbl.number });
      sendJson(res, 200, { success: true, data: closed });
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/sessions/:id',
    handler: async (_req, res, context) => {
      const sessionId = context.params.id;
      const session = await context.repo.getSession(sessionId);
      if (!session) {
        sendJson(res, 404, { success: false, error: 'SESSION_NOT_FOUND' });
        return;
      }
      sendJson(res, 200, { success: true, data: session });
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/seats/:id',
    handler: async (_req, res, context) => {
      const seatId = context.params.id;
      const tables = await context.repo.getTables();
      for (const t of tables) {
        const seat = t.seats?.find((s) => s.id === seatId);
        if (seat) {
          sendJson(res, 200, { success: true, tableNumber: t.number, seat });
          return;
        }
      }
      sendJson(res, 404, { success: false, error: 'SEAT_NOT_FOUND' });
    },
  },
];
