import { RouteDefinition } from '../../http/routes';
import { sendJson } from '../../http/context';

export const supportRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/api/restaurant/support/tickets',
    handler: async (_req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return;
      }
      if (identity.type !== 'STAFF' && identity.type !== 'ADMIN') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Staff or manager authentication required to view support tickets.' });
        return;
      }
      const tickets = await context.repo.getSupportTickets();
      sendJson(res, 200, { success: true, count: tickets.length, data: tickets });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/support/tickets',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return;
      }
      if (identity.type !== 'STAFF' && identity.type !== 'ADMIN') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Staff or manager authentication required to create support tickets.' });
        return;
      }
      const body = await context.parseBody();
      const ticket = await context.repo.createSupportTicket({
        ...body,
        createdById: context.requestIdentity.id,
      });
      sendJson(res, 201, { success: true, data: ticket });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/support/tickets/:id/message',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return;
      }
      if (identity.type !== 'STAFF' && identity.type !== 'ADMIN') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Staff authentication required.' });
        return;
      }
      const ticketId = context.params.id;
      const body = await context.parseBody();
      const updated = await context.repo.addSupportTicketMessage(ticketId, {
        authorId: context.requestIdentity.id,
        authorName: (context.requestIdentity as any).name || 'Staff',
        message: body.message,
      });
      if (!updated) {
        sendJson(res, 404, { success: false, error: 'TICKET_NOT_FOUND' });
        return;
      }
      sendJson(res, 200, { success: true, data: updated });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/support/tickets/:id/status',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Updating support ticket status requires authenticated staff credentials.' });
        return;
      }
      const ticketId = context.params.id;
      const body = await context.parseBody();
      const updated = await context.repo.updateSupportTicketStatus(ticketId, body.status);
      if (!updated) {
        sendJson(res, 404, { success: false, error: 'TICKET_NOT_FOUND' });
        return;
      }
      sendJson(res, 200, { success: true, data: updated });
    },
  },
];
