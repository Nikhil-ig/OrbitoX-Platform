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
    path: '/internal/tenants/:slug',
    handler: async (req, res, context) => {
      if (!verifyPlatformAuth(req)) {
        sendJson(res, 401, {
          error: 'UNAUTHORIZED',
          message: 'Platform service credentials required (RESTAURANTOS_PLATFORM_TOKEN >= 32 chars).',
        });
        return;
      }
      const targetSlug = context.params.slug;
      if (!targetSlug) {
        sendJson(res, 400, { error: 'BAD_REQUEST', message: 'Tenant slug parameter required.' });
        return;
      }
      try {
        const tenant = await (provisioningService as any).prisma.tenant.findFirst({
          where: {
            OR: [
              { slug: targetSlug },
              { id: targetSlug },
              { orbitoxProjectId: targetSlug },
            ],
          },
          include: {
            branches: true,
            tables: { orderBy: { numericId: 'asc' }, take: 5 },
            brandConfig: true,
            categories: { where: { isArchived: false } },
            menuItems: { where: { isArchived: false } },
          },
        });
        if (!tenant) {
          sendJson(res, 404, { ok: false, error: 'TENANT_NOT_FOUND', slug: targetSlug });
          return;
        }
        const totalTables = await (provisioningService as any).prisma.tableFloor.count({
          where: { tenantId: tenant.id },
        });
        const firstTable = tenant.tables[0];
        const reqHost = req.headers.host || '';
        const isLocalHost = reqHost.includes('localhost') || reqHost.includes('127.0.0.1') || process.env.NODE_ENV !== 'production';
        const baseDomain = process.env.RESTAURANTOS_BASE_DOMAIN || (isLocalHost ? 'localhost:4010' : 'orbitox.live');
        sendJson(res, 200, {
          ok: true,
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            status: tenant.status,
            previewExpiresAt: (tenant as any).previewExpiresAt || null,
            planId: tenant.planId,
            gstin: tenant.gstin,
            subdomainUrl: `http://${tenant.slug}.${baseDomain}`,
            branches: tenant.branches,
            tableCount: totalTables,
            sampleTableLocator: firstTable
              ? {
                  tableNumber: firstTable.number,
                  locator: firstTable.locator,
                  dinerUrl: `http://${tenant.slug}.${baseDomain}/dine/${firstTable.locator}`,
                }
              : null,
            categoriesCount: tenant.categories.length,
            categories: tenant.categories.map((c: any) => c.name),
            menuItemsCount: tenant.menuItems.length,
            menuItems: tenant.menuItems.map((i: any) => ({
              id: i.id,
              name: i.name,
              categoryName: i.categoryName,
              basePriceMinor: i.basePriceMinor,
              station: i.station,
              description: i.description,
              isVegetarian: i.isVegetarian,
              isSample: i.isSample,
            })),
            sampleItemsCount: tenant.menuItems.filter((i: any) => i.isSample).length,
            hasSampleMenu: tenant.menuItems.some((i: any) => i.isSample),
            brandConfig: (tenant.brandConfig?.config as any) || null,
          },
        });
      } catch (err: any) {
        sendJson(res, 500, { error: 'INTERNAL_ERROR', message: err.message });
      }
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/branches',
    handler: async (_req, res, context) => {
      const branches = await context.repo.getBranches();
      sendJson(res, 200, { success: true, data: branches });
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/branches/:id',
    handler: async (_req, res, context) => {
      const branch = await context.repo.getBranch(context.params.id);
      if (!branch) {
        sendJson(res, 404, { success: false, error: 'BRANCH_NOT_FOUND', message: `Branch ${context.params.id} not found.` });
        return;
      }
      sendJson(res, 200, { success: true, data: branch });
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/floors',
    handler: async (_req, res, context) => {
      const branchId = (context.parsedUrl.query.branchId as string) || undefined;
      const floors = await context.repo.getFloors(branchId);
      sendJson(res, 200, { success: true, data: floors });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/floors',
    handler: async (_req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return;
      }
      if (identity.type === 'DINER') {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Diner credentials cannot create floors.' });
        return;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Floor creation requires authenticated manager credentials.' });
        return;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Creating floor areas requires Manager or Admin privileges.' });
        return;
      }

      const body = await context.parseBody();
      const targetBranchId = String(body.branchId || context.currentBranch?.id || '').trim();
      if (!targetBranchId) {
        sendJson(res, 400, { success: false, error: 'BRANCH_REQUIRED', message: 'Target branchId is required.' });
        return;
      }
      if (identity.branchId && identity.branchId !== '*' && identity.branchId !== targetBranchId) {
        sendJson(res, 403, {
          success: false,
          error: 'BRANCH_MISMATCH',
          code: 'BRANCH_MISMATCH',
          message: `Staff credential for branch ${identity.branchId} cannot create floors for branch ${targetBranchId}.`,
        });
        return;
      }

      const branches = await context.repo.getBranches();
      if (!branches.some((b) => b.id === targetBranchId)) {
        sendJson(res, 404, { success: false, error: 'BRANCH_NOT_FOUND', message: `Branch ${targetBranchId} does not belong to this tenant.` });
        return;
      }

      const name = String(body.name || '').trim();
      if (name.length < 2 || name.length > 60) {
        sendJson(res, 400, { success: false, error: 'INVALID_FLOOR_NAME', message: 'Floor area name must be between 2 and 60 characters.' });
        return;
      }

      const allowedTypes = ['Dining', 'Bar', 'Outdoor', 'Private', 'Custom'] as const;
      const requestedType = String(body.type || 'Dining').trim();
      const type = (allowedTypes as readonly string[]).includes(requestedType)
        ? (requestedType as (typeof allowedTypes)[number])
        : 'Dining';

      const parsedCap = Number(body.capacity ?? 24);
      if (!Number.isFinite(parsedCap) || parsedCap < 1 || parsedCap > 500) {
        sendJson(res, 400, { success: false, error: 'INVALID_CAPACITY', message: 'Floor capacity must be between 1 and 500 covers.' });
        return;
      }

      const existingFloors = await context.repo.getFloors(targetBranchId);
      if (existingFloors.some((f) => f.name.trim().toLowerCase() === name.toLowerCase())) {
        sendJson(res, 409, { success: false, error: 'FLOOR_EXISTS', message: `Floor area "${name}" already exists on this branch.` });
        return;
      }

      const slugPart = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24) || 'area';
      const newFloor = await context.repo.saveFloor({
        id: `floor_${slugPart}_${Date.now().toString(36)}`,
        branchId: targetBranchId,
        name,
        type,
        capacity: Math.round(parsedCap),
        activeLayout: 'default',
        status: 'ACTIVE',
        tableIds: [],
        serviceLayouts: [],
      });

      eventBus.broadcast({
        id: `evt_${Date.now()}`,
        sequence: (await context.repo.getEvents()).length,
        type: 'floor.created',
        timestamp: new Date().toISOString(),
        producer: 'api:floors-create',
        branchId: targetBranchId,
        tenantId: context.tenantContext.tenantId,
        payload: { floorId: newFloor.id, name: newFloor.name },
      });

      sendJson(res, 201, { success: true, data: newFloor, floor: newFloor });
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/floors/:id',
    handler: (_req, res, context) => {
      sendJson(res, 404, { error: `Route not found: ${context.pathname}` });
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
    path: '/api/restaurant/branding/branch-overrides/:id',
    handler: (_req, res, context) => {
      sendJson(res, 404, { error: `Route not found: ${context.pathname}` });
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
    method: 'POST',
    path: '/api/restaurant/settings/domains/verify',
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
