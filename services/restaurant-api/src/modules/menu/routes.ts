import { RouteDefinition } from '../../http/routes';
import { sendJson } from '../../http/context';

export const menuRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/api/restaurant/menu',
    handler: async (_req, res, context) => {
      const items = await context.repo.getMenuItems();
      sendJson(res, 200, { success: true, data: items });
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/menu/items',
    handler: async (req, res, context) => {
      const includeArchived = context.parsedUrl.query.includeArchived === 'true';
      const cat = context.parsedUrl.query.category as string | undefined;
      let items = await context.repo.getMenuItems(includeArchived);
      if (cat && cat !== 'ALL') {
        items = items.filter((i) => i.category?.toLowerCase() === cat.toLowerCase() || (i as any).categoryId === cat);
      }
      sendJson(res, 200, { success: true, count: items.length, data: items });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/menu/items',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Menu catalog mutation requires manager credentials.' });
        return;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Menu catalog mutation requires Manager or Admin privileges.' });
        return;
      }
      const body = await context.parseBody();
      try {
        const newItem = await context.repo.createMenuItem(body);
        sendJson(res, 201, { success: true, data: newItem });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/menu/items/:id',
    handler: async (_req, res, context) => {
      const item = await context.repo.getMenuItem(context.params.id);
      if (!item) {
        sendJson(res, 404, { success: false, error: 'NOT_FOUND', message: `Item ${context.params.id} not found` });
        return;
      }
      sendJson(res, 200, { success: true, data: item });
    },
  },
  {
    method: 'PATCH',
    path: '/api/restaurant/menu/items/:id',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Menu catalog modification requires manager credentials.' });
        return;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Menu catalog modification requires Manager or Admin privileges.' });
        return;
      }
      const body = await context.parseBody();
      try {
        const updated = await context.repo.updateMenuItem(context.params.id, body);
        sendJson(res, 200, { success: true, data: updated });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
    },
  },
  {
    method: 'DELETE',
    path: '/api/restaurant/menu/items/:id',
    handler: async (_req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Menu catalog deletion requires manager credentials.' });
        return;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Menu catalog deletion requires Manager or Admin privileges.' });
        return;
      }
      try {
        await context.repo.deleteMenuItem(context.params.id);
        sendJson(res, 200, { success: true, message: `Item ${context.params.id} deleted` });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/menu/categories',
    handler: async (_req, res, context) => {
      const includeArchived = context.parsedUrl.query.includeArchived === 'true';
      const categories = await context.repo.getCategories(includeArchived);
      const allItems = await context.repo.getMenuItems(true);
      const enriched = categories.map((c) => ({
        ...c,
        itemCount: allItems.filter((i) => !i.isArchived && (i.category === c.name || (i as any).categoryId === c.id)).length,
      }));
      sendJson(res, 200, { success: true, count: enriched.length, data: enriched });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/menu/categories',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Category creation requires manager credentials.' });
        return;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Category creation requires Manager or Admin privileges.' });
        return;
      }
      const body = await context.parseBody();
      try {
        const newCat = await context.repo.createCategory(body);
        sendJson(res, 201, { success: true, data: newCat });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/menu/categories/reorder',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Category reordering requires manager credentials.' });
        return;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Category reordering requires Manager or Admin privileges.' });
        return;
      }
      const body = await context.parseBody();
      if (!Array.isArray(body.orderedIds)) {
        sendJson(res, 400, { success: false, error: 'INVALID_ORDERED_IDS', message: 'orderedIds array required' });
        return;
      }
      try {
        const reordered = await context.repo.reorderCategories(body.orderedIds);
        sendJson(res, 200, { success: true, data: reordered });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
    },
  },
  {
    method: 'PATCH',
    path: '/api/restaurant/menu/categories/:id',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Category modification requires manager credentials.' });
        return;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Category modification requires Manager or Admin privileges.' });
        return;
      }
      const body = await context.parseBody();
      try {
        const updated = await context.repo.updateCategory(context.params.id, body);
        if (!updated) {
          sendJson(res, 404, { success: false, error: 'NOT_FOUND', message: `Category ${context.params.id} not found` });
          return;
        }
        sendJson(res, 200, { success: true, data: updated });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
    },
  },
  {
    method: 'DELETE',
    path: '/api/restaurant/menu/categories/:id',
    handler: async (_req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Category deletion requires manager credentials.' });
        return;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Category deletion requires Manager or Admin privileges.' });
        return;
      }
      const reassignTo = (context.parsedUrl.query.reassignTo as string) || undefined;
      try {
        const result = await context.repo.archiveCategory(context.params.id, reassignTo);
        if (!result.success) {
          sendJson(res, 422, { success: false, error: 'CATEGORY_ARCHIVE_FAILED', message: result.error });
          return;
        }
        sendJson(res, 200, { success: true, message: `Category ${context.params.id} archived`, reassignedCount: result.reassignedCount });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/branches/:id/menu',
    handler: async (_req, res, context) => {
      const bId = context.params.id;
      const branch = await context.repo.getBranch(bId);
      if (!branch) {
        sendJson(res, 404, { success: false, error: 'BRANCH_NOT_FOUND', message: `Branch ${bId} not found.` });
        return;
      }
      const resolvedMenu = await context.repo.getResolvedMenuForBranch(bId);
      sendJson(res, 200, { success: true, branchId: bId, branchName: branch.name, count: resolvedMenu.length, data: resolvedMenu });
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/menu/branch-overrides',
    handler: async (_req, res, context) => {
      const bId = context.parsedUrl.query.branchId as string | undefined;
      sendJson(res, 200, { success: true, data: await context.repo.getBranchMenuOverrides(bId) });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/menu/branch-overrides',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Branch menu override requires manager credentials.' });
        return;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Branch menu override requires Manager or Admin privileges.' });
        return;
      }
      const body = await context.parseBody();
      if (!body.itemId || !body.branchId) {
        sendJson(res, 400, { success: false, error: 'MISSING_FIELDS', message: 'itemId and branchId are required.' });
        return;
      }
      if (identity.branchId && identity.branchId !== '*' && identity.branchId !== body.branchId) {
        sendJson(res, 403, {
          error: `Credential for branch ${identity.branchId} cannot modify overrides for branch ${body.branchId}`,
          code: 'BRANCH_MISMATCH',
        });
        return;
      }
      const saved = await context.repo.setBranchMenuOverride(body);
      sendJson(res, 200, { success: true, data: saved });
    },
  },
  {
    method: 'GET',
    path: '/api/commerce/menu',
    handler: async (_req, res, context) => {
      const branchId = (context.parsedUrl.query.branch as string) || context.currentBranch?.id || 'branch_ldh';
      const resolvedMenu = await context.repo.getResolvedMenuForBranch(branchId);
      sendJson(res, 200, { success: true, branchId, count: resolvedMenu.length, data: resolvedMenu });
    },
  },
  {
    method: 'GET',
    path: '/api/commerce/restaurants',
    handler: async (_req, res, context) => {
      res.setHeader('X-API-Deprecation', 'single-brand-migration; use /api/commerce/menu instead');
      const partners = await context.repo.getRestaurantPartners();
      sendJson(res, 200, { success: true, count: partners.length, data: partners });
    },
  },
  {
    method: 'GET',
    path: '/api/commerce/restaurants/:id',
    handler: async (_req, res, context) => {
      const partner = await context.repo.getRestaurantPartnerById(context.params.id);
      if (!partner) {
        sendJson(res, 404, { success: false, error: 'NOT_FOUND', message: `Restaurant partner ${context.params.id} not found.` });
        return;
      }
      sendJson(res, 200, { success: true, data: partner });
    },
  },
  {
    method: 'GET',
    path: '/api/commerce/grocery/catalog',
    handler: async (_req, res, context) => {
      const categoryFilter = context.parsedUrl.query.category as string | undefined;
      const skus = await context.repo.getGrocerySkus(categoryFilter);
      sendJson(res, 200, { success: true, count: skus.length, data: skus });
    },
  },
  {
    method: 'GET',
    path: '/api/commerce/grocery/skus',
    handler: async (_req, res, context) => {
      const categoryFilter = context.parsedUrl.query.category as string | undefined;
      const skus = await context.repo.getGrocerySkus(categoryFilter);
      sendJson(res, 200, { success: true, count: skus.length, data: skus });
    },
  },
  {
    method: 'GET',
    path: '/api/commerce/grocery/skus/:id',
    handler: async (_req, res, context) => {
      const sku = await context.repo.getGrocerySkuById(context.params.id);
      if (!sku) {
        sendJson(res, 404, { success: false, error: 'NOT_FOUND', message: `Grocery SKU ${context.params.id} not found.` });
        return;
      }
      sendJson(res, 200, { success: true, data: sku });
    },
  },
];

