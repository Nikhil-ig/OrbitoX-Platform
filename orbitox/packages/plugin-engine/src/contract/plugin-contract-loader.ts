let expressModule: any;
try {
  expressModule = require('express');
} catch {}

import {
  OrbitoXPlugin,
  PluginManifestContract,
  PluginRouteDefinition,
  PluginRequestContext,
  PluginResponse,
  PluginClock,
  DefaultPluginClock,
  PluginMigration,
} from './plugin.contract';


export interface PluginLoaderContext {
  repositories?: Record<string, any>;
  clock?: PluginClock;
  eventBus?: {
    emit?: (eventName: string, payload: any) => Promise<void> | void;
    on?: (eventName: string, handler: (payload: any) => Promise<void> | void) => void;
  };
  platformSdk?: any;
}

export interface LoadedOrbitoXPlugin<TD = any, TS = any> {
  manifest: PluginManifestContract;
  domain: TD;
  service: TS;
  routes: PluginRouteDefinition<TS>[];
  events: Record<string, (event: any, context: any) => Promise<void> | void>;
  migrations: PluginMigration[];
  isLoaded: boolean;
}

export class PluginContractLoader {
  /**
   * Validates a plugin manifest against the OrbitoX Plugin Contract
   */
  public static validateManifest(manifest: PluginManifestContract): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!manifest) {
      return { valid: false, errors: ['Manifest is required'] };
    }

    if (!manifest.id || typeof manifest.id !== 'string' || manifest.id.trim() === '') {
      errors.push('Manifest "id" is required and must be a non-empty string');
    } else if (!/^[a-z0-9-_]+$/.test(manifest.id)) {
      errors.push('Manifest "id" must contain only lowercase alphanumeric characters, dashes, or underscores');
    }

    if (!manifest.name || typeof manifest.name !== 'string' || manifest.name.trim() === '') {
      errors.push('Manifest "name" is required and must be a valid package name (e.g. "@orbitox/pos")');
    }

    if (!manifest.version || typeof manifest.version !== 'string' || manifest.version.trim() === '') {
      errors.push('Manifest "version" is required and must follow semantic versioning (e.g. "1.0.0")');
    } else if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
      errors.push('Manifest "version" is not a valid semantic version');
    }

    if (!manifest.displayName || typeof manifest.displayName !== 'string') {
      errors.push('Manifest "displayName" is required');
    }

    if (!manifest.entitlements || !Array.isArray(manifest.entitlements.features)) {
      errors.push('Manifest "entitlements.features" is required and must be an array of feature strings');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Loads and wires an OrbitoX Plugin with injected dependencies
   */
  public static loadPlugin<TD, TS, TR>(
    plugin: OrbitoXPlugin<TD, TS, TR>,
    ctx?: PluginLoaderContext
  ): LoadedOrbitoXPlugin<TD, TS> {
    const validation = this.validateManifest(plugin.manifest);
    if (!validation.valid) {
      throw new Error(`Invalid plugin manifest for "${plugin.manifest?.id || 'unknown'}": ${validation.errors.join('; ')}`);
    }

    const clock = ctx?.clock || new DefaultPluginClock();
    const repository = ctx?.repositories?.[plugin.manifest.id] || ctx?.repositories?.default || ({} as TR);
    const eventBus = ctx?.eventBus;

    // Instantiate service with dependency injection
    let serviceInstance: TS;
    if (typeof plugin.service === 'function') {
      serviceInstance = (plugin.service as any)({
        repository,
        clock,
        events: eventBus,
      });
    } else {
      serviceInstance = plugin.service;
    }

    // Normalize routes
    const routes: PluginRouteDefinition<TS>[] = [];
    if (Array.isArray(plugin.routes)) {
      routes.push(...plugin.routes);
    } else if (plugin.routes && typeof plugin.routes === 'object') {
      for (const [key, def] of Object.entries(plugin.routes)) {
        routes.push({
          ...def,
          path: def.path || key,
        });
      }
    }

    // Wire events to event bus if present
    const events = plugin.events || {};
    if (eventBus?.on) {
      for (const [eventName, handler] of Object.entries(events)) {
        eventBus.on(eventName, async (payload: any) => {
          await handler(payload, { service: serviceInstance, clock, repository });
        });
      }
    }

    return {
      manifest: plugin.manifest,
      domain: plugin.domain,
      service: serviceInstance,
      routes,
      events,
      migrations: plugin.migrations || plugin.manifest.migrations || [],
      isLoaded: true,
    };
  }

  /**
   * Compiles framework-agnostic plugin routes into an Express Router with full tenant,
   * authentication, and entitlement enforcement.
   */
  public static compileExpressRouter<TD, TS>(
    loaded: LoadedOrbitoXPlugin<TD, TS>,
    options?: {
      router?: any;
      authProvider?: (req: any) => Promise<any> | any;
      tenantResolver?: (req: any) => Promise<any> | any;
    }
  ): any {
    const router = options?.router || (expressModule ? expressModule.Router() : null);
    if (!router) {
      throw new Error(
        'PluginContractLoader.compileExpressRouter requires "express" to be installed or an injected router in options.router'
      );
    }

    for (const route of loaded.routes) {
      const method = (route.method || 'GET').toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head';

      router[method](route.path, async (req: any, res: any, next: any) => {

        try {
          // 1. Resolve Tenant Context
          let tenant: any = (req as any).tenant || (req as any).tenantSession?.tenant;
          let tenantId: string =
            tenant?.tenantId ||
            (req as any).tenantId ||
            (req.headers['x-tenant-id'] as string) ||
            '';

          if (!tenant && options?.tenantResolver) {
            tenant = await options.tenantResolver(req);
            if (tenant?.tenantId) {
              tenantId = tenant.tenantId;
            }
          }

          // 2. Resolve User / Authentication
          let user: any = (req as any).user;
          if (!user && options?.authProvider) {
            user = await options.authProvider(req);
          }

          if (route.requiresAuth && !user) {
            res.status(401).json({
              error: 'UNAUTHORIZED',
              message: `Authentication required for endpoint ${route.method} ${route.path}`,
            });
            return;
          }

          // 3. Check Scopes if required
          if (route.scopes && route.scopes.length > 0 && user) {
            const userScopes: string[] = user.scopes || user.roles || [];
            const hasScope = route.scopes.some((s) => userScopes.includes(s) || userScopes.includes('*') || userScopes.includes('admin'));
            if (!hasScope) {
              res.status(403).json({
                error: 'FORBIDDEN',
                message: `Insufficient permissions. Required scope(s): ${route.scopes.join(', ')}`,
                requiredScopes: route.scopes,
              });
              return;
            }
          }

          // 4. Check Feature Entitlement
          if (route.entitlement?.feature) {
            const requiredFeature = route.entitlement.feature;
            const hasFeature =
              (req as any).tenantSession?.hasFeature?.(requiredFeature) ??
              tenant?.features?.includes(requiredFeature) ??
              tenant?.features?.includes('*') ??
              false;

            if (!hasFeature) {
              res.status(403).json({
                error: 'FEATURE_NOT_ENTITLED',
                message: `Tenant "${tenantId || 'anonymous'}" is not entitled to feature "${requiredFeature}"`,
                feature: requiredFeature,
              });
              return;
            }
          }

          // 5. Construct PluginRequestContext
          const reqContext: PluginRequestContext<TS> = {
            tenantId,
            tenant,
            params: req.params,
            query: req.query,
            body: req.body,
            headers: req.headers,
            services: loaded.service,
            user,
            entitlements: {
              hasFeature: (featureName: string) => {
                return (
                  (req as any).tenantSession?.hasFeature?.(featureName) ??
                  tenant?.features?.includes(featureName) ??
                  tenant?.features?.includes('*') ??
                  false
                );
              },
            },
          };

          // 6. Execute Handler
          const result = await route.handler(reqContext);

          // 7. Format Response
          if (result && typeof result === 'object' && ('status' in result || 'body' in result || 'headers' in result)) {
            const pluginRes = result as PluginResponse;
            if (pluginRes.headers) {
              for (const [k, v] of Object.entries(pluginRes.headers)) {
                res.setHeader(k, v);
              }
            }
            res.status(pluginRes.status || 200).json(pluginRes.body !== undefined ? pluginRes.body : result);
          } else {
            res.status(200).json(result);
          }
        } catch (err: any) {
          const status = err.status || err.statusCode || (err.message?.includes('not found') ? 404 : 500);
          res.status(status).json({
            error: err.name || 'PLUGIN_ROUTE_ERROR',
            message: err.message || 'Internal error in plugin route handler',
          });
        }
      });
    }

    return router;
  }

  /**
   * Runs all pending migrations for the loaded plugin
   */
  public static async runMigrations<TD, TS>(
    loaded: LoadedOrbitoXPlugin<TD, TS>,
    migrationContext: any
  ): Promise<void> {
    for (const migration of loaded.migrations) {
      if (typeof migration.up === 'function') {
        await migration.up(migrationContext);
      }
    }
  }
}
