import { RouteDefinition } from '../../http/routes';
import {
  sendJson,
  customDomainService,
  provisioningService,
  eventBus,
  extractImageBuffer,
  ownerSelfService,
} from '../../http/context';
import {
  verifyPlatformAuth,
  validateAndSanitizeCustomCss,
} from '../../shared';
import { handleVerifyDomain } from '../owners/routes';

export const tenancyRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/internal/tls/ask',
    handler: async (req, res, context) => {
      const askDomain = (context.parsedUrl.query.domain as string) || '';
      const allowed = await customDomainService.isDomainAllowedForTls(askDomain);
      if (allowed) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
      } else {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('FORBIDDEN: Domain not permitted for TLS');
      }
    },
  },
  {
    method: 'GET',
    path: '/internal/tenants',
    handler: async (req, res, context) => {
      if (!verifyPlatformAuth(req)) {
        sendJson(res, 401, {
          error: 'UNAUTHORIZED',
          message: 'Platform service credentials required (RESTAURANTOS_PLATFORM_TOKEN >= 32 chars).',
        });
        return;
      }
      try {
        const page = context.parsedUrl.query.page ? parseInt(context.parsedUrl.query.page as string, 10) : 1;
        const limit = context.parsedUrl.query.limit ? parseInt(context.parsedUrl.query.limit as string, 10) : 20;
        const search = (context.parsedUrl.query.search as string) || undefined;
        const status = (context.parsedUrl.query.status as string) || undefined;
        const list = await provisioningService.listTenants({ page, limit, search, status });
        sendJson(res, 200, list);
      } catch (err: any) {
        sendJson(res, 500, { error: 'INTERNAL_ERROR', message: err.message });
      }
    },
  },
  {
    method: 'POST',
    path: '/internal/tenants',
    handler: async (req, res) => {
      if (!verifyPlatformAuth(req)) {
        sendJson(res, 401, {
          error: 'UNAUTHORIZED',
          message: 'Platform service credentials required (RESTAURANTOS_PLATFORM_TOKEN >= 32 chars).',
        });
        return;
      }
      sendJson(res, 410, {
        error: 'ROUTE_DEPRECATED',
        message: 'Tenant provisioning via /internal/tenants has been deleted. Tenant creation must go through the signed /orbitox/lifecycle/provision hook.',
      });
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/branches',
    handler: async (_req, res, context) => {
      const branches = await context.repo.getBranches();
      sendJson(res, 200, branches);
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/branches/:id',
    handler: async (_req, res, context) => {
      const branch = await context.repo.getBranch(context.params.id);
      if (!branch) {
        sendJson(res, 404, { error: 'BRANCH_NOT_FOUND', message: `Branch ${context.params.id} not found` });
        return;
      }
      sendJson(res, 200, branch);
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/floors',
    handler: async (_req, res, context) => {
      const floors = await context.repo.getFloors();
      sendJson(res, 200, floors);
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/floors/:id',
    handler: async (_req, res, context) => {
      const floor = await context.repo.getFloor(context.params.id);
      if (!floor) {
        sendJson(res, 404, { error: 'FLOOR_NOT_FOUND', message: `Floor ${context.params.id} not found` });
        return;
      }
      sendJson(res, 200, floor);
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/branding',
    handler: async (_req, res, context) => {
      const brand = await context.repo.getTenantBrand();
      sendJson(res, 200, { success: true, data: brand });
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/branding/css',
    handler: async (_req, res, context) => {
      const brand = await context.repo.getTenantBrand();
      const css = brand?.customCss || '';
      res.writeHead(200, {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      });
      res.end(css);
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/branding/branch-overrides/:id',
    handler: async (_req, res, context) => {
      const branchId = context.params.id;
      const branch = await context.repo.getBranch(branchId);
      if (!branch) {
        sendJson(res, 404, { success: false, error: 'BRANCH_NOT_FOUND', message: `Branch ${branchId} does not exist.` });
        return;
      }
      const baseBrand = await context.repo.getTenantBrand();
      const branchOverride = await context.repo.getBranchBrandOverride(branchId);
      const effectiveBrand = await context.repo.getTenantBrand(branchId);
      sendJson(res, 200, {
        success: true,
        branchId,
        base: baseBrand,
        override: branchOverride,
        effective: effectiveBrand,
        isOverridden: !!branchOverride,
      });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/branding/branch-overrides',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Branch override updates require authenticated manager credentials.' });
        return;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Branch override updates require Manager or Admin privileges.' });
        return;
      }
      const body = await context.parseBody();
      const targetBranchId = body.branchId;
      if (!targetBranchId) {
        sendJson(res, 400, { success: false, error: 'BRANCH_REQUIRED', message: 'Target branchId is required.' });
        return;
      }
      // Scope check: branch-scoped credentials cannot modify another branch's overrides!
      if (identity.branchId && identity.branchId !== '*' && identity.branchId !== targetBranchId) {
        sendJson(res, 403, {
          success: false,
          error: 'BRANCH_MISMATCH',
          code: 'BRANCH_MISMATCH',
          message: `Staff credential for branch ${identity.branchId} cannot configure overrides for branch ${targetBranchId}.`,
        });
        return;
      }
      const branch = await context.repo.getBranch(targetBranchId);
      if (!branch) {
        sendJson(res, 404, { success: false, error: 'BRANCH_NOT_FOUND', message: `Branch ${targetBranchId} does not exist.` });
        return;
      }
      const effective = await context.repo.updateBranchBrandOverride(targetBranchId, body, identity.id || 'Manager');
      sendJson(res, 200, {
        success: true,
        branchId: targetBranchId,
        override: await context.repo.getBranchBrandOverride(targetBranchId),
        effective,
      });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/branding/upload-image',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return;
      }
      if (identity.type === 'ANONYMOUS' || identity.type === 'DINER' || !identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', message: 'Manager or Admin privileges required to upload branding assets.' });
        return;
      }
      try {
        const { buffer } = await extractImageBuffer(req);
        const saved = await ownerSelfService.saveTenantImage(context.tenantContext.tenantId, buffer, 'logo');
        await context.repo.updateTenantBrand({ logoUrl: saved.url });
        sendJson(res, 200, { success: true, url: saved.url, data: saved });
      } catch (err: any) {
        const isSecurity = err.message?.includes('SECURITY_VIOLATION');
        const isFormat = err.message?.includes('UNSUPPORTED_IMAGE_FORMAT');
        const isLarge = err.message?.includes('IMAGE_TOO_LARGE');
        const statusCode = (isSecurity || isFormat || isLarge) ? 400 : 500;
        sendJson(res, statusCode, {
          success: false,
          error: isSecurity ? 'SECURITY_VIOLATION' : (isFormat ? 'UNSUPPORTED_IMAGE_FORMAT' : (isLarge ? 'IMAGE_TOO_LARGE' : 'UPLOAD_FAILED')),
          code: isSecurity ? 'SECURITY_VIOLATION' : (isFormat ? 'UNSUPPORTED_IMAGE_FORMAT' : (isLarge ? 'IMAGE_TOO_LARGE' : 'UPLOAD_FAILED')),
          message: err.message,
        });
      }
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/branding/verify-domain',
    handler: handleVerifyDomain,
  },
  {
    method: 'GET',
    path: '/api/restaurant/events',
    handler: (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'REVOKED_CAPABILITY' || identity.type === 'INVALID_CREDENTIAL') {
        sendJson(res, 401, {
          error: 'REVOKED_CAPABILITY',
          code: identity.type,
          message: 'Guest capability token has expired or credential is invalid. SSE subscription rejected.',
        });
        return;
      }
      if (process.env.NODE_ENV === 'production' && identity.type === 'ANONYMOUS') {
        sendJson(res, 401, {
          error: 'AUTHENTICATION_REQUIRED',
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Realtime SSE subscription requires a valid guest or staff credential in production mode.',
        });
        return;
      }
      eventBus.registerClient(req, res, context.repo, identity);
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/events/cursor',
    handler: async (_req, res, context) => {
      const events = await context.repo.getEvents();
      const lastSeq = events.length > 0 ? (events[events.length - 1].sequence || events.length) : 0;
      const oldestSeq = events.length > 0 ? (events[0].sequence || 1) : 0;
      sendJson(res, 200, {
        currentSequence: lastSeq,
        oldestSequence: oldestSeq,
        retainedEventsCount: events.length,
        branchId: context.currentBranch?.id,
        timestamp: new Date().toISOString(),
      });
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/state',
    handler: async (_req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, {
          error: identity.type === 'REVOKED_CAPABILITY' ? 'REVOKED_CAPABILITY' : (identity.error || 'INVALID_CREDENTIAL'),
          code: identity.type,
          message: 'Invalid or revoked credential. Access denied.',
        });
        return;
      }
      if (identity.type === 'DINER' || (process.env.NODE_ENV === 'production' && identity.type === 'ANONYMOUS')) {
        sendJson(res, identity.type === 'ANONYMOUS' ? 401 : 403, {
          error: 'FORBIDDEN',
          code: 'FORBIDDEN',
          message: 'Full state inspection requires staff or manager credentials.',
        });
        return;
      }
      const [tables, menu, orders, tasks, sreqs, brand] = await Promise.all([
        context.repo.getTables(),
        context.repo.getMenuItems(true),
        context.repo.getOrders(),
        context.repo.getKitchenTasks(),
        context.repo.getServiceRequests(),
        context.repo.getTenantBrand(),
      ]);
      sendJson(res, 200, { tables, menu, orders, tasks, sreqs, brand });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/reseed',
    handler: async (_req, res, context) => {
      if (process.env.NODE_ENV === 'production') {
        sendJson(res, 403, { error: 'FORBIDDEN_IN_PRODUCTION', message: 'Reseed forbidden in production.' });
        return;
      }
      await context.repo.reseed();
      sendJson(res, 200, { success: true, message: 'Runtime store reseeded successfully' });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/test/reset',
    handler: async (_req, res, context) => {
      if (process.env.NODE_ENV === 'production') {
        sendJson(res, 403, { error: 'FORBIDDEN_IN_PRODUCTION' });
        return;
      }
      await context.repo.resetToArchetypes();
      sendJson(res, 200, { success: true, message: 'Test state reset' });
    },
  },
];

export async function handleDeleteBranchOverrides(_req: any, res: any, context: any): Promise<void> {
  const identity = context.requestIdentity;
  if (identity.type === 'ANONYMOUS') {
    sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Resetting branch overrides requires authenticated manager credentials.' });
    return;
  }
  if (!identity.isPrivileged) {
    sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Resetting branch overrides requires Manager or Admin privileges.' });
    return;
  }
  const targetBranchId = context.params?.id || context.pathname.replace('/api/restaurant/branding/branch-overrides/', '');
  if (identity.branchId && identity.branchId !== '*' && identity.branchId !== targetBranchId) {
    sendJson(res, 403, {
      success: false,
      error: 'BRANCH_MISMATCH',
      code: 'BRANCH_MISMATCH',
      message: `Staff credential for branch ${identity.branchId} cannot reset overrides for branch ${targetBranchId}.`,
    });
    return;
  }
  const branch = await context.repo.getBranch(targetBranchId);
  if (!branch) {
    sendJson(res, 404, { success: false, error: 'BRANCH_NOT_FOUND', message: `Branch ${targetBranchId} does not exist.` });
    return;
  }
  const effective = await context.repo.updateBranchBrandOverride(targetBranchId, null, identity.id || 'Manager');
  sendJson(res, 200, {
    success: true,
    branchId: targetBranchId,
    message: `Branch brand overrides for ${targetBranchId} cleared successfully.`,
    effective,
  });
}
