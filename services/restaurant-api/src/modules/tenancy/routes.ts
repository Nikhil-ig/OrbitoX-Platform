import * as http from 'http';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import {
  MenuItem,
  KitchenTask,
  TableFloorRecord,
  RestaurantOrder,
  BranchRecord,
  FloorRecord,
  ServiceRequest,
  RestaurantContext,
  issueStaffToken,
  verifyStaffToken,
  revokeStaffToken,
  authenticateStaffByPin,
  getPublicStaffList,
  getStaffMember,
  createStaffMember,
  updateStaffMember,
  resetStaffLockout,
  hashStaffSecretSync,
  verifyStaffSecret,
  resolveClientIp,
  checkStaffLockout,
  recordFailedStaffAttempt,
  recordSuccessfulStaffAttempt,
  issueDeviceToken,
  verifyDeviceToken,
  validateAndSanitizeCustomCss,
  tryGetActiveTenant,
  resolveTenantDisplayName,
  invalidateTenantResolutionCache,
  OnboardingStepKey,
  verifyPlatformAuth,
  validateTenantSlug,
  generateSeats,
} from '../../../packages/domain';
import {
  buildGSTInvoice,
  computeFiscalYear,
  SAC_RESTAURANT_SERVICES,
  renderPrintableInvoiceHtml,
} from '../../../packages/domain/invoicing';
import {
  isProductionEnvironment,
  postgresStore,
  eventBus,
  provisioningService,
  customDomainService,
  ownerSelfService,
  razorpayAdapter,
  restaurantGrantEnforcer,
  getPinnedGrantKeys,
  activeSettlementLocks,
  activeDispatchLocks,
  totalRequests,
  statusCounts,
  methodCounts,
  totalDomainEvents,
} from '../../shared/state';
import {
  parseBody,
  parseBuffer,
  extractImageBuffer,
  sendJson,
  sendHtml,
  checkTestKillPoint,
  isActiveRestaurantCataloguePlan,
} from '../../http/middleware';
import {
  assertPlatformBridgeCaller,
  exportRestaurantTenantData,
  eraseRestaurantTenantData,
  exportRestaurantPrincipalData,
  correctRestaurantPrincipalData,
  eraseRestaurantPrincipalData,
} from '../../data-rights';
import { SEED_PLANS } from '@orbitox-io/plugin-engine';
import type { PreTenantRouteContext, TenantRouteContext } from '../../http/types';

export async function handleTenancyRoutes(ctx: TenantRouteContext): Promise<boolean> {
  const {
    req, res, pathname, method, parsedUrl, tenantContext, repo, posService,
    branches, floors, context, currentBranch, currentFloor, serviceShift,
    requestIdentity, activeStaffToken, activeStaffRole,
  } = ctx;
    if (pathname === '/api/restaurant/auth/accept-invite' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const secret = (body.secret || body.password || body.pin || '').toString().trim();
        const acceptRes = await provisioningService.acceptOwnerInvite({
          token: body.token,
          pin: secret,
          secret,
          ownerName: body.name || body.ownerName,
        });
        sendJson(res, 200, acceptRes);
      } catch (err: any) {
        sendJson(res, 400, { error: 'INVITE_ACCEPTANCE_FAILED', message: err.message });
      }
      return true;
    }

    // --- PLATFORM INTERNAL TENANT PROVISIONING & LIFECYCLE ---
    if (pathname.startsWith('/internal/tenants')) {
      if (!verifyPlatformAuth(req)) {
        sendJson(res, 401, {
          error: 'UNAUTHORIZED',
          message: 'Platform service credentials required (RESTAURANTOS_PLATFORM_TOKEN >= 32 chars).',
        });
        return true;
      }

      if (pathname === '/internal/tenants' && method === 'POST') {
        sendJson(res, 410, {
          error: 'ROUTE_DEPRECATED',
          message: 'Tenant provisioning via /internal/tenants has been deleted. Tenant creation must go through the signed /orbitox/lifecycle/provision hook.',
        });
        return true;
      }

      if (pathname === '/internal/tenants' && method === 'GET') {
        try {
          const page = parsedUrl.query.page ? parseInt(parsedUrl.query.page as string, 10) : 1;
          const limit = parsedUrl.query.limit ? parseInt(parsedUrl.query.limit as string, 10) : 20;
          const search = (parsedUrl.query.search as string) || undefined;
          const status = (parsedUrl.query.status as string) || undefined;
          const list = await provisioningService.listTenants({ page, limit, search, status });
          sendJson(res, 200, list);
        } catch (err: any) {
          sendJson(res, 500, { error: 'INTERNAL_ERROR', message: err.message });
        }
        return true;
      }

      const exportMatch = /^\/internal\/tenants\/([^/]+)\/export$/.exec(pathname);
      if (exportMatch && method === 'GET') {
        const tenantId = exportMatch[1];
        try {
          const data = await provisioningService.exportTenantData(tenantId);
          sendJson(res, 200, data);
        } catch (err: any) {
          sendJson(res, 404, { error: 'NOT_FOUND', message: err.message });
        }
        return true;
      }

      const suspendMatch = /^\/internal\/tenants\/([^/]+)\/suspend$/.exec(pathname);
      if (suspendMatch && method === 'POST') {
        const tenantId = suspendMatch[1];
        try {
          const updated = await provisioningService.suspendTenant(tenantId);
          restaurantGrantEnforcer.invalidate(tenantId);
          invalidateTenantResolutionCache(tenantId);
          sendJson(res, 200, { success: true, tenant: updated });
        } catch (err: any) {
          sendJson(res, 400, { error: 'SUSPEND_FAILED', message: err.message });
        }
        return true;
      }

      const resumeMatch = /^\/internal\/tenants\/([^/]+)\/resume$/.exec(pathname);
      if (resumeMatch && method === 'POST') {
        const tenantId = resumeMatch[1];
        try {
          const updated = await provisioningService.resumeTenant(tenantId);
          restaurantGrantEnforcer.invalidate(tenantId);
          invalidateTenantResolutionCache(tenantId);
          sendJson(res, 200, { success: true, tenant: updated });
        } catch (err: any) {
          sendJson(res, 400, { error: 'RESUME_FAILED', message: err.message });
        }
        return true;
      }

      const cancelMatch = /^\/internal\/tenants\/([^/]+)\/cancel$/.exec(pathname);
      if (cancelMatch && method === 'POST') {
        const tenantId = cancelMatch[1];
        try {
          const updated = await provisioningService.cancelTenant(tenantId);
          invalidateTenantResolutionCache(tenantId);
          sendJson(res, 200, { success: true, tenant: updated });
        } catch (err: any) {
          sendJson(res, 400, { error: 'CANCEL_FAILED', message: err.message });
        }
        return true;
      }

      const detailMatch = /^\/internal\/tenants\/([^/]+)$/.exec(pathname);
      if (detailMatch && method === 'GET') {
        const tenantId = detailMatch[1];
        try {
          const tenant = await provisioningService.getTenantDetails(tenantId);
          if (!tenant) {
            sendJson(res, 404, { error: 'TENANT_NOT_FOUND', message: `Tenant ${tenantId} not found` });
            return true;
          }
          sendJson(res, 200, tenant);
        } catch (err: any) {
          sendJson(res, 500, { error: 'INTERNAL_ERROR', message: err.message });
        }
        return true;
      }

      if (detailMatch && method === 'PATCH') {
        const tenantId = detailMatch[1];
        try {
          const body = await parseBody(req);
          const updated = await provisioningService.updateTenant(tenantId, body);
          sendJson(res, 200, { success: true, tenant: updated });
        } catch (err: any) {
          sendJson(res, 400, { error: 'UPDATE_FAILED', message: err.message });
        }
        return true;
      }
    }
  return false;
}
