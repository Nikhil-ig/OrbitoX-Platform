import { RouteDefinition } from '../../http/routes';
import {
  sendJson,
  postgresStore,
  restaurantGrantEnforcer,
} from '../../http/context';
import {
  assertPlatformBridgeCaller,
  exportRestaurantTenantData,
  eraseRestaurantTenantData,
  exportRestaurantPrincipalData,
  correctRestaurantPrincipalData,
  eraseRestaurantPrincipalData,
} from './service';
import { invalidateTenantResolutionCache } from '../../shared';

export const dataRightsRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    path: '/orbitox/data-rights/export',
    handler: async (_req, res, context) => {
      if (!postgresStore?.prisma) {
        sendJson(res, 503, { error: 'STORE_UNAVAILABLE', message: 'PostgreSQL store is required for data-rights endpoints.' });
        return;
      }
      try {
        const caller = assertPlatformBridgeCaller(context.verifiedBridge);
        const result = await exportRestaurantTenantData(postgresStore.prisma, caller.tenantId);
        sendJson(res, 200, result);
      } catch (err: any) {
        handleDataRightsError(res, err);
      }
    },
  },
  {
    method: 'POST',
    path: '/orbitox/data-rights/erase',
    handler: async (req, res, context) => {
      if (!postgresStore?.prisma) {
        sendJson(res, 503, { error: 'STORE_UNAVAILABLE', message: 'PostgreSQL store is required for data-rights endpoints.' });
        return;
      }
      try {
        const caller = assertPlatformBridgeCaller(context.verifiedBridge);
        const body = await context.parseBody();
        const mode = body.mode === 'RESTRICT' ? 'RESTRICT' : 'DELETE';
        const result = await eraseRestaurantTenantData(
          postgresStore.prisma,
          caller.tenantId,
          mode,
          body.context || { actorId: caller.actorSub, reason: 'Organization erasure' },
        );
        restaurantGrantEnforcer.invalidate(caller.tenantId);
        invalidateTenantResolutionCache(caller.tenantId);
        sendJson(res, 200, result);
      } catch (err: any) {
        handleDataRightsError(res, err);
      }
    },
  },
  {
    method: 'POST',
    path: '/orbitox/data-rights/principal/export',
    handler: async (req, res, context) => {
      if (!postgresStore?.prisma) {
        sendJson(res, 503, { error: 'STORE_UNAVAILABLE', message: 'PostgreSQL store is required for data-rights endpoints.' });
        return;
      }
      try {
        const caller = assertPlatformBridgeCaller(context.verifiedBridge);
        const body = await context.parseBody();
        const result = await exportRestaurantPrincipalData(
          postgresStore.prisma,
          caller.tenantId,
          body.principal || {},
          body.context || { actorId: caller.actorSub, reason: 'DSR principal export' },
        );
        sendJson(res, 200, result);
      } catch (err: any) {
        handleDataRightsError(res, err);
      }
    },
  },
  {
    method: 'POST',
    path: '/orbitox/data-rights/principal/correct',
    handler: async (req, res, context) => {
      if (!postgresStore?.prisma) {
        sendJson(res, 503, { error: 'STORE_UNAVAILABLE', message: 'PostgreSQL store is required for data-rights endpoints.' });
        return;
      }
      try {
        const caller = assertPlatformBridgeCaller(context.verifiedBridge);
        const body = await context.parseBody();
        const result = await correctRestaurantPrincipalData(
          postgresStore.prisma,
          caller.tenantId,
          body.principal || {},
          body.patch || { fields: {} },
          body.context || { actorId: caller.actorSub, reason: 'DSR principal correction' },
        );
        sendJson(res, 200, result);
      } catch (err: any) {
        handleDataRightsError(res, err);
      }
    },
  },
  {
    method: 'POST',
    path: '/orbitox/data-rights/principal/erase',
    handler: async (req, res, context) => {
      if (!postgresStore?.prisma) {
        sendJson(res, 503, { error: 'STORE_UNAVAILABLE', message: 'PostgreSQL store is required for data-rights endpoints.' });
        return;
      }
      try {
        const caller = assertPlatformBridgeCaller(context.verifiedBridge);
        const body = await context.parseBody();
        const mode = body.mode === 'RESTRICT' ? 'RESTRICT' : 'DELETE';
        const result = await eraseRestaurantPrincipalData(
          postgresStore.prisma,
          caller.tenantId,
          body.principal || {},
          mode,
          body.context || { actorId: caller.actorSub, reason: 'DSR principal erasure' },
        );
        sendJson(res, 200, result);
      } catch (err: any) {
        handleDataRightsError(res, err);
      }
    },
  },
];

function handleDataRightsError(res: any, err: any): void {
  const status = typeof err?.statusCode === 'number' ? err.statusCode : 500;
  sendJson(res, status, {
    error: err?.code || 'DATA_RIGHTS_ERROR',
    code: err?.code || 'DATA_RIGHTS_ERROR',
    message: err?.message || 'Data-rights bridge execution failed.',
  });
}

