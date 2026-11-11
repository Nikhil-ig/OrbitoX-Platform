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
      sendJson(res, 200, { success: true, data: await context.repo.getSupportTickets() });
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
      const initialMessage = body.initialMessage || body.description || body.message || body.subject;
      if (!body.subject || !initialMessage) {
        sendJson(res, 400, { success: false, error: 'Missing subject or initialMessage' });
        return;
      }
      try {
        const ticket = await context.repo.createSupportTicket({
          branchId: body.branchId || context.currentBranch?.id || 'branch_ldh',
          branchName: body.branchName || context.currentBranch?.name || 'Main Branch',
          staffId: body.staffId || 'staff_mgr_ldh',
          staffName: body.staffName || body.senderName || 'Restaurant Operator',
          category: body.category || 'URGENT_INCIDENT',
          severity: body.severity || 'MEDIUM',
          subject: body.subject,
          description: body.description || initialMessage || body.subject,
          initialMessage,
        });
        sendJson(res, 201, { success: true, data: ticket });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/support/tickets/:id/message',
    handler: async (req, res, context) => {
      const ticketId = context.params.id || context.pathname.replace('/api/restaurant/support/tickets/', '').replace('/message', '');
      const body = await context.parseBody();
      if (!body.body && !body.text) {
        sendJson(res, 400, { success: false, error: 'Missing body for support message' });
        return;
      }
      try {
        const success = await context.repo.addSupportTicketMessage(ticketId, {
          text: body.body || body.text,
          sender: body.senderRole === 'ORBITOX_SUPPORT' ? 'ORBITOX_SUPPORT' : 'RESTAURANT_STAFF',
          authorName: body.senderName || body.authorName || 'Staff Member',
          attachments: body.attachmentUrl ? [body.attachmentUrl] : undefined,
        });
        const ticket = await context.repo.getSupportTicketById(ticketId);
        sendJson(res, 200, { success, data: ticket });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
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
      const ticketId = context.params.id || context.pathname.replace('/api/restaurant/support/tickets/', '').replace('/status', '');
      const body = await context.parseBody();
      try {
        const ok = await context.repo.updateSupportTicketStatus(ticketId, body.status);
        const ticket = await context.repo.getSupportTicketById(ticketId);
        sendJson(res, 200, { success: ok, data: ticket });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
    },
  },
];
