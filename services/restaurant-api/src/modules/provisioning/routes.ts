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

export async function handleProvisioningRoutes(ctx: PreTenantRouteContext): Promise<boolean> {
  const { req, res, pathname, method, parsedUrl, verifiedBridge, tenantContext } = ctx;
  // --- LIFECYCLE HOOKS (Contract v2 Subset) ---
  const isLifecycleProvision = (pathname === '/orbitox/lifecycle/provision' || pathname === '/api/platform/lifecycle/provision' || pathname === '/internal/lifecycle/provision') && method === 'POST';
  const isLifecycleSuspend = (pathname === '/orbitox/lifecycle/suspend' || pathname === '/api/platform/lifecycle/suspend' || pathname === '/internal/lifecycle/suspend') && method === 'POST';
  const isLifecycleResume = (pathname === '/orbitox/lifecycle/resume' || pathname === '/api/platform/lifecycle/resume' || pathname === '/internal/lifecycle/resume') && method === 'POST';
  const isLifecyclePlanChanged = (pathname === '/orbitox/lifecycle/plan-changed' || pathname === '/api/platform/lifecycle/plan-changed' || pathname === '/internal/lifecycle/plan-changed') && method === 'POST';
  const isLifecycleEntitlementUpdated = (pathname === '/orbitox/lifecycle/entitlement-updated' || pathname === '/api/platform/lifecycle/entitlement-updated' || pathname === '/internal/lifecycle/entitlement-updated') && method === 'POST';
  const isLifecycleDeprovision = (pathname === '/orbitox/lifecycle/deprovision' || pathname === '/api/platform/lifecycle/deprovision' || pathname === '/internal/lifecycle/deprovision') && method === 'POST';

  if (isLifecycleProvision || isLifecycleSuspend || isLifecycleResume || isLifecyclePlanChanged || isLifecycleEntitlementUpdated || isLifecycleDeprovision) {
    if (!verifiedBridge) {
      sendJson(res, 401, {
        error: 'UNAUTHORIZED',
        code: 'BRIDGE_SIGNATURE_REQUIRED',
        message: 'Lifecycle endpoints require a verified bridge signature.',
      });
      return true;
    }

    const body = await parseBody(req);
    const targetTenantId = verifiedBridge.tenantId;
    if (!targetTenantId) {
      sendJson(res, 400, { error: 'BAD_REQUEST', code: 'TENANT_ID_REQUIRED', message: 'Tenant ID is required for lifecycle operation.' });
      return true;
    }

    const idempotencyKey = (req.headers['x-idempotency-key'] as string) || body.idempotencyKey || (verifiedBridge ? req.headers['x-orbitox-nonce'] || req.headers['bridge-nonce'] : undefined);
    const incomingRevision = typeof body.revision === 'number' ? body.revision : (typeof body.entitlementRevision === 'number' ? body.entitlementRevision : 0);

    const existingTenant = postgresStore?.prisma ? await postgresStore.prisma.tenant.findFirst({
      where: { OR: [{ id: targetTenantId }, { slug: targetTenantId }, { orbitoxProjectId: targetTenantId }] },
    }).catch(() => null) : null;

    // Idempotency check: if lastLifecycleKey matches, return cached/idempotent success
    if (existingTenant && idempotencyKey && existingTenant.lastLifecycleKey === idempotencyKey) {
      sendJson(res, 200, {
        ok: true,
        replayed: true,
        tenantId: existingTenant.id,
        status: existingTenant.status,
        planId: existingTenant.planId,
        revision: existingTenant.entitlementRevision,
      });
      return true;
    }

    // Older revision check: if incoming revision is strictly less than current revision, ignore
    if (existingTenant && incomingRevision > 0 && incomingRevision < existingTenant.entitlementRevision) {
      sendJson(res, 200, {
        ok: true,
        ignored: true,
        reason: 'OLDER_REVISION',
        currentRevision: existingTenant.entitlementRevision,
        incomingRevision,
      });
      return true;
    }

    if (isLifecycleProvision) {
      if (existingTenant) {
        // Provision twice gives one tenant (idempotent)
        sendJson(res, 200, {
          ok: true,
          replayed: true,
          tenantId: existingTenant.id,
          status: existingTenant.status,
          revision: existingTenant.entitlementRevision,
        });
        return true;
      }

      const planId = body.planId;
      if (!isActiveRestaurantCataloguePlan(planId)) {
        sendJson(res, 400, {
          error: 'INVALID_PLAN_ID',
          message: 'A valid active RestaurantOS catalogue plan ID is required.',
        });
        return true;
      }

      const cleanSlug = body.slug || targetTenantId.replace(/^org\/[^/]+\/project\/[^/]+\/environment\//, '').replace(/^tenant_/, '').replace(/[^a-z0-9-]/g, '-').slice(0, 30);
      const provResult = await provisioningService.provisionTenant({
        tenantId: targetTenantId,
        restaurantName: body.restaurantName || body.name || `Restaurant ${cleanSlug}`,
        slug: cleanSlug,
        planId,
        gstin: body.gstin,
        address: body.address,
        legalEntityName: body.legalEntityName,
        entitlementRevision: Math.max(1, incomingRevision),
        idempotencyKey,
      });

      // Audit log
      if (postgresStore?.prisma) {
        await (postgresStore.prisma as any).domainEvent.create({
          data: {
            tenantId: targetTenantId,
            sequence: 1,
            type: 'tenant.lifecycle.provisioned',
            producer: 'platform-lifecycle',
            payload: { tenantId: targetTenantId, revision: incomingRevision, idempotencyKey },
            branchId: 'main',
          },
        }).catch(() => { });
      }

      sendJson(res, 201, {
        ok: true,
        tenantId: targetTenantId,
        status: 'active',
        revision: Math.max(1, incomingRevision),
        result: provResult,
      });
      return true;
    }

    if (isLifecycleSuspend) {
      if (!existingTenant) {
        sendJson(res, 404, { error: 'TENANT_NOT_FOUND', code: 'TENANT_NOT_FOUND', message: `Tenant ${targetTenantId} not found` });
        return true;
      }
      await provisioningService.suspendTenant(existingTenant.id);
      if (postgresStore?.prisma) {
        await postgresStore.prisma.tenant.update({
          where: { id: existingTenant.id },
          data: {
            status: 'suspended',
            entitlementRevision: Math.max(existingTenant.entitlementRevision, incomingRevision),
            lastLifecycleKey: idempotencyKey,
          },
        }).catch(() => { });
        await (postgresStore.prisma as any).domainEvent.create({
          data: {
            tenantId: existingTenant.id,
            sequence: 1,
            type: 'tenant.lifecycle.suspended',
            producer: 'platform-lifecycle',
            payload: { tenantId: existingTenant.id, revision: incomingRevision, idempotencyKey },
            branchId: 'main',
          },
        }).catch(() => { });
      }
      restaurantGrantEnforcer.invalidate(existingTenant.id);
      restaurantGrantEnforcer.invalidate(targetTenantId);
      invalidateTenantResolutionCache(existingTenant.id);
      sendJson(res, 200, {
        ok: true,
        tenantId: existingTenant.id,
        status: 'suspended',
        revision: Math.max(existingTenant.entitlementRevision, incomingRevision),
      });
      return true;
    }

    if (isLifecycleResume) {
      if (!existingTenant) {
        sendJson(res, 404, { error: 'TENANT_NOT_FOUND', code: 'TENANT_NOT_FOUND', message: `Tenant ${targetTenantId} not found` });
        return true;
      }
      await provisioningService.resumeTenant(existingTenant.id);
      if (postgresStore?.prisma) {
        await postgresStore.prisma.tenant.update({
          where: { id: existingTenant.id },
          data: {
            status: 'active',
            entitlementRevision: Math.max(existingTenant.entitlementRevision, incomingRevision),
            lastLifecycleKey: idempotencyKey,
          },
        }).catch(() => { });
        await (postgresStore.prisma as any).domainEvent.create({
          data: {
            tenantId: existingTenant.id,
            sequence: 1,
            type: 'tenant.lifecycle.resumed',
            producer: 'platform-lifecycle',
            payload: { tenantId: existingTenant.id, revision: incomingRevision, idempotencyKey },
            branchId: 'main',
          },
        }).catch(() => { });
      }
      restaurantGrantEnforcer.invalidate(existingTenant.id);
      restaurantGrantEnforcer.invalidate(targetTenantId);
      invalidateTenantResolutionCache(existingTenant.id);
      sendJson(res, 200, {
        ok: true,
        tenantId: existingTenant.id,
        status: 'active',
        revision: Math.max(existingTenant.entitlementRevision, incomingRevision),
      });
      return true;
    }

    if (isLifecyclePlanChanged) {
      if (!existingTenant) {
        sendJson(res, 404, { error: 'TENANT_NOT_FOUND', code: 'TENANT_NOT_FOUND', message: `Tenant ${targetTenantId} not found` });
        return true;
      }
      const newPlanId = body.planId ?? body.newPlanId;
      if (!isActiveRestaurantCataloguePlan(newPlanId)) {
        sendJson(res, 400, {
          error: 'INVALID_PLAN_ID',
          message: 'A valid active RestaurantOS catalogue plan ID is required.',
        });
        return true;
      }
      if (postgresStore?.prisma) {
        await postgresStore.prisma.tenant.update({
          where: { id: existingTenant.id },
          data: {
            planId: newPlanId,
            entitlementRevision: Math.max(existingTenant.entitlementRevision, incomingRevision),
            lastLifecycleKey: idempotencyKey,
          },
        }).catch(() => { });
        await (postgresStore.prisma as any).domainEvent.create({
          data: {
            tenantId: existingTenant.id,
            sequence: 1,
            type: 'tenant.lifecycle.plan_changed',
            producer: 'platform-lifecycle',
            payload: { tenantId: existingTenant.id, planId: newPlanId, revision: incomingRevision, idempotencyKey },
            branchId: 'main',
          },
        }).catch(() => { });
      }

      restaurantGrantEnforcer.invalidate(existingTenant.id);
      restaurantGrantEnforcer.invalidate(targetTenantId);
      invalidateTenantResolutionCache(existingTenant.id);
      sendJson(res, 200, {
        ok: true,
        tenantId: existingTenant.id,
        planId: newPlanId,
        revision: Math.max(existingTenant.entitlementRevision, incomingRevision),
      });
      return true;
    }

    if (isLifecycleEntitlementUpdated) {
      restaurantGrantEnforcer.invalidate(targetTenantId);
      if (existingTenant) {
        restaurantGrantEnforcer.invalidate(existingTenant.id);
      }
      if (body.grantToken) {
        try {
          await restaurantGrantEnforcer.enforce({
            tenantId: existingTenant?.id || targetTenantId,
            feature: 'orders',
            write: false,
            token: body.grantToken,
          });
        } catch { }
      }
      invalidateTenantResolutionCache(targetTenantId);
      if (existingTenant) invalidateTenantResolutionCache(existingTenant.id);
      sendJson(res, 200, { ok: true, invalidated: true });
      return true;
    }

    if (isLifecycleDeprovision) {
      if (existingTenant && postgresStore?.prisma) {
        await postgresStore.prisma.tenant.update({
          where: { id: existingTenant.id },
          data: {
            status: 'deprovisioned',
            lastLifecycleKey: idempotencyKey,
          },
        }).catch(() => null);
      }
      restaurantGrantEnforcer.invalidate(targetTenantId);
      if (existingTenant) {
        restaurantGrantEnforcer.invalidate(existingTenant.id);
      }
      invalidateTenantResolutionCache(targetTenantId);
      if (existingTenant) invalidateTenantResolutionCache(existingTenant.id);
      sendJson(res, 200, {
        ok: true,
        tenantId: existingTenant?.id || targetTenantId,
        status: 'DEPROVISIONED',
      });
      return true;
    }
  }

  // --- ORBITOX 6G DATA-RIGHTS BRIDGE ENDPOINTS ---
  if (pathname.startsWith('/orbitox/data-rights')) {
    if (!postgresStore?.prisma) {
      sendJson(res, 503, { error: 'STORE_UNAVAILABLE', message: 'PostgreSQL store is required for data-rights endpoints.' });
      return true;
    }
    try {
      const caller = assertPlatformBridgeCaller(verifiedBridge);
      if (pathname === '/orbitox/data-rights/export' && method === 'POST') {
        const result = await exportRestaurantTenantData(postgresStore.prisma, caller.tenantId);
        sendJson(res, 200, result);
        return true;
      }
      if (pathname === '/orbitox/data-rights/erase' && method === 'POST') {
        const body = await parseBody(req);
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
        return true;
      }
      if (pathname === '/orbitox/data-rights/principal/export' && method === 'POST') {
        const body = await parseBody(req);
        const result = await exportRestaurantPrincipalData(
          postgresStore.prisma,
          caller.tenantId,
          body.principal || {},
          body.context || { actorId: caller.actorSub, reason: 'DSR principal export' },
        );
        sendJson(res, 200, result);
        return true;
      }
      if (pathname === '/orbitox/data-rights/principal/correct' && method === 'POST') {
        const body = await parseBody(req);
        const result = await correctRestaurantPrincipalData(
          postgresStore.prisma,
          caller.tenantId,
          body.principal || {},
          body.patch || { fields: {} },
          body.context || { actorId: caller.actorSub, reason: 'DSR principal correction' },
        );
        sendJson(res, 200, result);
        return true;
      }
      if (pathname === '/orbitox/data-rights/principal/erase' && method === 'POST') {
        const body = await parseBody(req);
        const mode = body.mode === 'RESTRICT' ? 'RESTRICT' : 'DELETE';
        const result = await eraseRestaurantPrincipalData(
          postgresStore.prisma,
          caller.tenantId,
          body.principal || {},
          mode,
          body.context || { actorId: caller.actorSub, reason: 'DSR principal erasure' },
        );
        sendJson(res, 200, result);
        return true;
      }
      sendJson(res, 404, { error: 'NOT_FOUND', message: 'Unknown data-rights bridge endpoint.' });
    } catch (err: any) {
      const status = typeof err?.statusCode === 'number' ? err.statusCode : 500;
      sendJson(res, status, {
        error: err?.code || 'DATA_RIGHTS_ERROR',
        code: err?.code || 'DATA_RIGHTS_ERROR',
        message: err?.message || 'Data-rights bridge execution failed.',
      });
    }
    return true;
  }
  return false;
}
