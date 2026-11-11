import * as http from 'http';
import { RequestContext } from './context';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export interface RouteEntry {
  method: HttpMethod;
  path: string;
  module: string;
}

export type RouteHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  context: RequestContext
) => Promise<boolean | void> | boolean | void;

export interface RegisteredRoute extends RouteEntry {
  handler: RouteHandler;
}

export class Router {
  private routes: RegisteredRoute[] = [];

  public register(route: RegisteredRoute): void {
    this.routes.push(route);
  }

  public registerModuleRoutes(
    moduleName: string,
    routes: Array<{ method: HttpMethod; path: string; handler: RouteHandler }>
  ): void {
    for (const r of routes) {
      this.routes.push({
        method: r.method,
        path: r.path,
        module: moduleName,
        handler: r.handler,
      });
    }
  }

  public getAllRegisteredRoutes(): RouteEntry[] {
    return this.routes.map(({ method, path, module }) => ({ method, path, module }));
  }

  public match(pattern: string, pathname: string): { params: Record<string, string> } | null {
    if (pattern === pathname) {
      return { params: {} };
    }
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      if (pathname.startsWith(prefix)) {
        return { params: { wild: pathname.slice(prefix.length) } };
      }
      return null;
    }
    const patternParts = pattern.split('/');
    const pathParts = pathname.split('/');
    if (patternParts.length !== pathParts.length) {
      return null;
    }
    const params: Record<string, string> = {};
    for (let i = 0; i < patternParts.length; i++) {
      const p = patternParts[i];
      const actual = pathParts[i];
      if (p.startsWith(':')) {
        params[p.slice(1)] = actual;
      } else if (p !== actual) {
        return null;
      }
    }
    return { params };
  }

  public async dispatch(
    method: string,
    pathname: string,
    req: http.IncomingMessage,
    res: http.ServerResponse,
    context: RequestContext
  ): Promise<boolean> {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const matched = this.match(route.path, pathname);
      if (matched) {
        context.params = matched.params;
        const result = await route.handler(req, res, context);
        if (result !== false) {
          return true;
        }
      }
    }

    // Direct compatibility dispatch for staff endpoints
    if (method === 'POST' && pathname === '/api/restaurant/staff') {
      const { handleCreateStaff } = require('../modules/owners/routes');
      await handleCreateStaff(req, res, context);
      return true;
    }
    if (method === 'POST' && pathname.startsWith('/api/restaurant/staff/') && pathname.endsWith('/revoke')) {
      const staffId = pathname.split('/')[4];
      context.params = { id: staffId };
      const revokeRoute = this.routes.find((r) => r.method === 'DELETE' && r.path === '/api/restaurant/staff/:id');
      if (revokeRoute) {
        await revokeRoute.handler(req, res, context);
        return true;
      }
    }
    if (method === 'POST' && pathname.startsWith('/api/restaurant/staff/') && !pathname.endsWith('/revoke')) {
      const staffId = pathname.split('/')[4];
      context.params = { id: staffId };
      const patchRoute = this.routes.find((r) => r.method === 'PATCH' && r.path === '/api/restaurant/staff/:id');
      if (patchRoute) {
        await patchRoute.handler(req, res, context);
        return true;
      }
    }

    // Direct compatibility dispatch for table bill and rotate-locator
    if (method === 'GET' && pathname.startsWith('/api/restaurant/tables/') && pathname.endsWith('/bill')) {
      const { handleTableBill } = require('../modules/tables/routes');
      await handleTableBill(req, res, context);
      return true;
    }
    if (method === 'POST' && pathname.startsWith('/api/restaurant/tables/') && pathname.endsWith('/rotate-locator')) {
      const { handleRotateLocator } = require('../modules/tables/routes');
      await handleRotateLocator(req, res, context);
      return true;
    }
    if (method === 'DELETE' && pathname.startsWith('/api/restaurant/branding/branch-overrides/')) {
      const { handleDeleteBranchOverrides } = require('../modules/tenancy/routes');
      await handleDeleteBranchOverrides(req, res, context);
      return true;
    }

    return false;
  }
}

export const router = new Router();

let modulesRegistered = false;

export function ensureModulesRegistered(): void {
  if (modulesRegistered) return;
  modulesRegistered = true;

  // Import and register all route modules
  const { httpRoutes } = require('./routes');
  router.registerModuleRoutes('http', httpRoutes);

  const { provisioningRoutes } = require('../modules/provisioning/routes');
  router.registerModuleRoutes('provisioning', provisioningRoutes);

  const { dataRightsRoutes } = require('../modules/data-rights/routes');
  router.registerModuleRoutes('data-rights', dataRightsRoutes);

  const { authRoutes } = require('../modules/auth/routes');
  router.registerModuleRoutes('auth', authRoutes);

  const { tenancyRoutes } = require('../modules/tenancy/routes');
  router.registerModuleRoutes('tenancy', tenancyRoutes);

  const { menuRoutes } = require('../modules/menu/routes');
  router.registerModuleRoutes('menu', menuRoutes);

  const { ordersRoutes } = require('../modules/orders/routes');
  router.registerModuleRoutes('orders', ordersRoutes);

  const { tablesRoutes } = require('../modules/tables/routes');
  router.registerModuleRoutes('tables', tablesRoutes);

  const { kitchenRoutes } = require('../modules/kitchen/routes');
  router.registerModuleRoutes('kitchen', kitchenRoutes);

  const { dinersRoutes } = require('../modules/diners/routes');
  router.registerModuleRoutes('diners', dinersRoutes);

  const { paymentsRoutes } = require('../modules/payments/routes');
  router.registerModuleRoutes('payments', paymentsRoutes);

  const { invoicingRoutes } = require('../modules/invoicing/routes');
  router.registerModuleRoutes('invoicing', invoicingRoutes);

  const { ownersRoutes } = require('../modules/owners/routes');
  router.registerModuleRoutes('owners', ownersRoutes);

  const { supportRoutes } = require('../modules/support/routes');
  router.registerModuleRoutes('support', supportRoutes);

  const { viewsRoutes } = require('../views/routes');
  router.registerModuleRoutes('views', viewsRoutes);
}

export function getAllRegisteredRoutes(): RouteEntry[] {
  ensureModulesRegistered();
  return router.getAllRegisteredRoutes();
}
