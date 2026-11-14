import * as http from 'http';
import { RouteDefinition } from '../../http/routes';
import {
  sendJson,
  postgresStore,
  provisioningService,
  restaurantGrantEnforcer,
  isActiveRestaurantCataloguePlan,
  RequestContext,
} from '../../http/context';
import { invalidateTenantResolutionCache } from '../../shared';

async function handleProvision(req: http.IncomingMessage, res: http.ServerResponse, context: RequestContext): Promise<void> {
  if (!context.verifiedBridge) {
    sendJson(res, 401, {
      error: 'UNAUTHORIZED',
      code: 'BRIDGE_SIGNATURE_REQUIRED',
      message: 'Lifecycle endpoints require a verified bridge signature.',
    });
    return;
  }

  const body = await context.parseBody();
  const targetTenantId = context.verifiedBridge.tenantId;
  if (!targetTenantId) {
    sendJson(res, 400, { error: 'BAD_REQUEST', code: 'TENANT_ID_REQUIRED', message: 'Tenant ID is required for lifecycle operation.' });
    return;
  }

  const idempotencyKey = (req.headers['x-idempotency-key'] as string) || body.idempotencyKey || (context.verifiedBridge ? req.headers['x-orbitox-nonce'] || req.headers['bridge-nonce'] : undefined);
  const incomingRevision = typeof body.revision === 'number' ? body.revision : (typeof body.entitlementRevision === 'number' ? body.entitlementRevision : 0);

  const existingTenant = postgresStore?.prisma ? await postgresStore.prisma.tenant.findFirst({
    where: { OR: [{ id: targetTenantId }, { slug: targetTenantId }, { orbitoxProjectId: targetTenantId }] },
  }).catch(() => null) : null;

  if (existingTenant && idempotencyKey && existingTenant.lastLifecycleKey === idempotencyKey) {
    sendJson(res, 200, {
      ok: true,
      replayed: true,
      tenantId: existingTenant.id,
      status: existingTenant.status,
      planId: existingTenant.planId,
      revision: existingTenant.entitlementRevision,
    });
    return;
  }

  if (existingTenant && incomingRevision > 0 && incomingRevision < existingTenant.entitlementRevision) {
    sendJson(res, 200, {
      ok: true,
      ignored: true,
      reason: 'OLDER_REVISION',
      currentRevision: existingTenant.entitlementRevision,
      incomingRevision,
    });
    return;
  }

  if (existingTenant) {
    sendJson(res, 200, {
      ok: true,
      replayed: true,
      tenantId: existingTenant.id,
      status: existingTenant.status,
      revision: existingTenant.entitlementRevision,
    });
    return;
  }

  const planId = body.planId;
  if (!isActiveRestaurantCataloguePlan(planId)) {
    sendJson(res, 400, {
      error: 'INVALID_PLAN_ID',
      message: 'A valid active RestaurantOS catalogue plan ID is required.',
    });
    return;
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
}

async function handleSuspend(req: http.IncomingMessage, res: http.ServerResponse, context: RequestContext): Promise<void> {
  if (!context.verifiedBridge) {
    sendJson(res, 401, { error: 'UNAUTHORIZED', code: 'BRIDGE_SIGNATURE_REQUIRED', message: 'Lifecycle endpoints require a verified bridge signature.' });
    return;
  }

  const body = await context.parseBody();
  const targetTenantId = context.verifiedBridge.tenantId;
  const idempotencyKey = (req.headers['x-idempotency-key'] as string) || body.idempotencyKey;
  const incomingRevision = typeof body.revision === 'number' ? body.revision : (typeof body.entitlementRevision === 'number' ? body.entitlementRevision : 0);

  const existingTenant = postgresStore?.prisma ? await postgresStore.prisma.tenant.findFirst({
    where: { OR: [{ id: targetTenantId }, { slug: targetTenantId }, { orbitoxProjectId: targetTenantId }] },
  }).catch(() => null) : null;

  if (!existingTenant) {
    sendJson(res, 404, { error: 'TENANT_NOT_FOUND', code: 'TENANT_NOT_FOUND', message: `Tenant ${targetTenantId} not found` });
    return;
  }

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
    return;
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
    return;
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
}

async function handleResume(req: http.IncomingMessage, res: http.ServerResponse, context: RequestContext): Promise<void> {
  if (!context.verifiedBridge) {
    sendJson(res, 401, { error: 'UNAUTHORIZED', code: 'BRIDGE_SIGNATURE_REQUIRED', message: 'Lifecycle endpoints require a verified bridge signature.' });
    return;
  }

  const body = await context.parseBody();
  const targetTenantId = context.verifiedBridge.tenantId;
  const idempotencyKey = (req.headers['x-idempotency-key'] as string) || body.idempotencyKey;
  const incomingRevision = typeof body.revision === 'number' ? body.revision : (typeof body.entitlementRevision === 'number' ? body.entitlementRevision : 0);

  const existingTenant = postgresStore?.prisma ? await postgresStore.prisma.tenant.findFirst({
    where: { OR: [{ id: targetTenantId }, { slug: targetTenantId }, { orbitoxProjectId: targetTenantId }] },
  }).catch(() => null) : null;

  if (!existingTenant) {
    sendJson(res, 404, { error: 'TENANT_NOT_FOUND', code: 'TENANT_NOT_FOUND', message: `Tenant ${targetTenantId} not found` });
    return;
  }

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
    return;
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
    return;
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
}

async function handlePlanChanged(req: http.IncomingMessage, res: http.ServerResponse, context: RequestContext): Promise<void> {
  if (!context.verifiedBridge) {
    sendJson(res, 401, { error: 'UNAUTHORIZED', code: 'BRIDGE_SIGNATURE_REQUIRED', message: 'Lifecycle endpoints require a verified bridge signature.' });
    return;
  }

  const body = await context.parseBody();
  const targetTenantId = context.verifiedBridge.tenantId;
  const idempotencyKey = (req.headers['x-idempotency-key'] as string) || body.idempotencyKey;
  const incomingRevision = typeof body.revision === 'number' ? body.revision : (typeof body.entitlementRevision === 'number' ? body.entitlementRevision : 0);

  const existingTenant = postgresStore?.prisma ? await postgresStore.prisma.tenant.findFirst({
    where: { OR: [{ id: targetTenantId }, { slug: targetTenantId }, { orbitoxProjectId: targetTenantId }] },
  }).catch(() => null) : null;

  if (!existingTenant) {
    sendJson(res, 404, { error: 'TENANT_NOT_FOUND', code: 'TENANT_NOT_FOUND', message: `Tenant ${targetTenantId} not found` });
    return;
  }

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
    return;
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
    return;
  }

  const newPlanId = body.planId ?? body.newPlanId;
  if (!isActiveRestaurantCataloguePlan(newPlanId)) {
    sendJson(res, 400, {
      error: 'INVALID_PLAN_ID',
      message: 'A valid active RestaurantOS catalogue plan ID is required.',
    });
    return;
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
}

async function handleEntitlementUpdated(req: http.IncomingMessage, res: http.ServerResponse, context: RequestContext): Promise<void> {
  if (!context.verifiedBridge) {
    sendJson(res, 401, { error: 'UNAUTHORIZED', code: 'BRIDGE_SIGNATURE_REQUIRED', message: 'Lifecycle endpoints require a verified bridge signature.' });
    return;
  }

  const body = await context.parseBody();
  const targetTenantId = context.verifiedBridge.tenantId;

  const existingTenant = postgresStore?.prisma ? await postgresStore.prisma.tenant.findFirst({
    where: { OR: [{ id: targetTenantId }, { slug: targetTenantId }, { orbitoxProjectId: targetTenantId }] },
  }).catch(() => null) : null;

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
}

async function handleDeprovision(req: http.IncomingMessage, res: http.ServerResponse, context: RequestContext): Promise<void> {
  if (!context.verifiedBridge) {
    sendJson(res, 401, { error: 'UNAUTHORIZED', code: 'BRIDGE_SIGNATURE_REQUIRED', message: 'Lifecycle endpoints require a verified bridge signature.' });
    return;
  }

  const body = await context.parseBody();
  const targetTenantId = context.verifiedBridge.tenantId;
  const idempotencyKey = (req.headers['x-idempotency-key'] as string) || body.idempotencyKey;

  const existingTenant = postgresStore?.prisma ? await postgresStore.prisma.tenant.findFirst({
    where: { OR: [{ id: targetTenantId }, { slug: targetTenantId }, { orbitoxProjectId: targetTenantId }] },
  }).catch(() => null) : null;

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
}

export const provisioningRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/orbitox/lifecycle/provision', handler: handleProvision },
  { method: 'POST', path: '/api/platform/lifecycle/provision', handler: handleProvision },
  { method: 'POST', path: '/internal/lifecycle/provision', handler: handleProvision },

  { method: 'POST', path: '/orbitox/lifecycle/suspend', handler: handleSuspend },
  { method: 'POST', path: '/api/platform/lifecycle/suspend', handler: handleSuspend },
  { method: 'POST', path: '/internal/lifecycle/suspend', handler: handleSuspend },

  { method: 'POST', path: '/orbitox/lifecycle/resume', handler: handleResume },
  { method: 'POST', path: '/api/platform/lifecycle/resume', handler: handleResume },
  { method: 'POST', path: '/internal/lifecycle/resume', handler: handleResume },

  { method: 'POST', path: '/orbitox/lifecycle/plan-changed', handler: handlePlanChanged },
  { method: 'POST', path: '/api/platform/lifecycle/plan-changed', handler: handlePlanChanged },
  { method: 'POST', path: '/internal/lifecycle/plan-changed', handler: handlePlanChanged },

  { method: 'POST', path: '/orbitox/lifecycle/entitlement-updated', handler: handleEntitlementUpdated },
  { method: 'POST', path: '/api/platform/lifecycle/entitlement-updated', handler: handleEntitlementUpdated },
  { method: 'POST', path: '/internal/lifecycle/entitlement-updated', handler: handleEntitlementUpdated },

  { method: 'POST', path: '/orbitox/lifecycle/deprovision', handler: handleDeprovision },
  { method: 'POST', path: '/api/platform/lifecycle/deprovision', handler: handleDeprovision },
  { method: 'POST', path: '/internal/lifecycle/deprovision', handler: handleDeprovision },
];
