import * as crypto from 'crypto';
import { RouteDefinition } from '../../http/routes';
import { sendJson, eventBus, runtimeController } from '../../http/context';
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
      if (!targetTbl && body.tableId) {
        targetTbl = await context.repo.getTable(body.tableId);
      }

      if (!targetTbl) {
        sendJson(res, 404, {
          error: 'TABLE_NOT_FOUND',
          code: 'TABLE_NOT_FOUND',
          message: `Table not found for session closure: ${body.tableNumber || body.tableId || 'unspecified'}`,
        });
        return;
      }

      const tableNum = targetTbl.number;

      if (identity.type === 'DINER' && identity.tableNumber && identity.tableNumber !== tableNum) {
        sendJson(res, 403, {
          error: 'FORBIDDEN',
          code: 'FORBIDDEN',
          message: 'Diner cannot close session for a different table.',
        });
        return;
      }

      const settlement =
        body.settlement ||
        (body.settlementMethod
          ? {
            method: body.settlementMethod,
            status: body.settlementStatus || 'PAID',
            amountMinor: body.amountMinor,
            reference: body.settlementRef,
            authorizedBy: body.authorizedBy || identity.id,
            reason: body.reason,
          }
          : undefined);

      const force = body.force === true;

      // Emergency force close or COMP/VOID settlements require verified privileged credentials!
      if (force || (settlement && (settlement.status === 'COMPED' || settlement.status === 'VOIDED' || settlement.method === 'EMERGENCY_OVERRIDE'))) {
        if (!identity.isPrivileged) {
          sendJson(res, (identity.type === 'ANONYMOUS' || identity.type === 'INVALID_CREDENTIAL') ? 401 : 403, {
            error: 'UNAUTHORIZED_OVERRIDE',
            code: 'UNAUTHORIZED_OVERRIDE',
            message: 'Emergency force closure or complimentary/void settlements require verified manager or privileged staff credentials.',
          });
          return;
        }
      }

      // Authorizer is strictly the authenticated identity, never an unverified string from request body!
      const authorizer = identity.isPrivileged ? identity.id : (identity.type === 'STAFF' ? identity.id : 'staff:pos');

      if (identity.branchId && identity.branchId !== '*' && targetTbl.branchId !== identity.branchId) {
        sendJson(res, 403, {
          error: `Credential for branch ${identity.branchId} cannot close session for table in branch ${targetTbl.branchId}`,
          code: 'BRANCH_MISMATCH',
        });
        return;
      }

      const result = await context.repo.closeSession(tableNum, settlement, force, {
        expectedRevision: body.expectedRevision,
        authorizedBy: authorizer,
        reason: body.reason,
      });

      if (!result.success) {
        const statusCode =
          result.code === 'TABLE_NOT_FOUND' ? 404 : result.code === 'REVISION_CONFLICT' ? 409 : 422;
        sendJson(res, statusCode, {
          code: result.code,
          error: result.code,
          message: result.error,
        });
        return;
      }

      if (result.session?.sessionId) {
        eventBus.disconnectClientsForSession(result.session.sessionId);
      }

      await runtimeController.emitAudit('SESSION_CLOSED', authorizer || 'staff:pos', {
        tableNumber: tableNum,
        settlement: result.session?.settlement,
        isEmergency: result.session?.settlement?.method === 'EMERGENCY_OVERRIDE',
      });

      sendJson(res, 200, {
        success: true,
        message: `Session closed for ${tableNum}`,
        table: result.table,
        session: result.session,
        isIdempotent: result.isIdempotent,
      });
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
