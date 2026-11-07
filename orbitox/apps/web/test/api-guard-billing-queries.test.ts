import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '../app/api/v1/_lib/api-guard';
import { platformRepository } from '../lib/platform-repository';
import { prisma } from '../lib/prisma';
import { createEntitlementGrantToken, PlatformRepository } from '@orbitox-io/plugin-engine';

describe('withApiGuard Billing State Enforcement & Query Budget', () => {
  let createdOrgId: string;
  let createdProjectId: string;
  let createdEnvId: string;
  let apiKeySecret: string;
  let tenantId: string;
  let suffix: string;

  beforeEach(async () => {
    suffix = crypto.randomUUID().slice(0, 8);
    process.env.ORBITOX_SERVER_PEPPER = `test-pepper-${suffix}`;
    const org = await platformRepository.createOrganization({
      slug: `billing-test-org-${suffix}`,
      name: `Billing Test Org ${suffix}`,
      billingEmail: `billing-${suffix}@example.test`,
    });
    createdOrgId = org.id;

    const proj = await platformRepository.createProject({
      name: `Billing Test Project ${suffix}`,
      slug: `billing-proj-${suffix}`,
      organizationId: org.id,
      businessModel: 'B2B_SAAS',
      planTier: 'starter',
      plan: 'starter',
      technicalLead: 'Billing Test',
      contactEmail: `billing-${suffix}@example.test`,
      enabledServices: ['crm'],
      apiCallQuota: 1000,
    });
    createdProjectId = proj.project.id;
    const env = proj.environments.find((e) => e.slug === 'production') || proj.environments[0]!;
    createdEnvId = env.id;
    tenantId = `org/${org.id}/project/${proj.project.id}/environment/${env.id}`;

    const existingInst = await platformRepository.getPluginInstallation(tenantId, '@orbitox/crm');
    if (!existingInst) {
      await platformRepository.provisionPluginInstallation({
        tenantId,
        runtimeTenantId: tenantId,
        pluginId: '@orbitox/crm',
        status: 'ACTIVE',
        planId: 'crm-starter',
      });
    }

    const key = await platformRepository.createApiKey({
      name: `Billing Test Key ${suffix}`,
      environmentId: env.id,
      projectId: proj.project.id,
      capabilities: ['crm:read', 'crm:write'],
      tenantScope: [proj.project.slug],
      createdBy: 'test-billing',
    });
    apiKeySecret = key.rawSecret;
  });

  afterEach(async () => {
    // Clean up if needed
  });

  it('enforces ACTIVE, READ_ONLY, and SUSPENDED server-side from installation status with zero billing queries', async () => {
    let billingSubscriptionQueries = 0;
    let planQueries = 0;

    const originalFindFirst = prisma.billingSubscription.findFirst;
    const originalFindUnique = prisma.plan.findUnique;

    try {
      (prisma.billingSubscription as any).findFirst = async (...args: any[]) => {
        billingSubscriptionQueries++;
        return originalFindFirst ? (originalFindFirst as any).apply(prisma.billingSubscription, args) : null;
      };

      (prisma.plan as any).findUnique = async (...args: any[]) => {
        planQueries++;
        return originalFindUnique ? (originalFindUnique as any).apply(prisma.plan, args) : null;
      };

      const getHandler = withApiGuard(
        { serviceId: 'crm', serviceName: 'CRM Service', requiredScopes: ['crm:read'] },
        async (_req, ctx) => NextResponse.json({ success: true, method: 'GET', tenantId: ctx.tenantId }),
      );

      const postHandler = withApiGuard(
        { serviceId: 'crm', serviceName: 'CRM Service', requiredScopes: ['crm:write'] },
        async (_req, ctx) => NextResponse.json({ success: true, method: 'POST', tenantId: ctx.tenantId }),
      );

      // 1. ACTIVE: GET allowed (200), POST allowed (200) without any grant header
      const activeGetRes = await getHandler(
        new NextRequest('http://localhost/api/v1/crm/leads', {
          method: 'GET',
          headers: { 'x-api-key': apiKeySecret },
        }),
      );
      assert.equal(activeGetRes.status, 200);

      const activePostRes = await postHandler(
        new NextRequest('http://localhost/api/v1/crm/leads', {
          method: 'POST',
          headers: { 'x-api-key': apiKeySecret },
        }),
      );
      assert.equal(activePostRes.status, 200);

      // 2. READ_ONLY installation, no grant header: POST -> 402, GET -> 200
      await platformRepository.updatePluginInstallationStatus(tenantId, '@orbitox/crm', 'READ_ONLY');

      const roGetRes = await getHandler(
        new NextRequest('http://localhost/api/v1/crm/leads', {
          method: 'GET',
          headers: { 'x-api-key': apiKeySecret },
        }),
      );
      assert.equal(roGetRes.status, 200);

      const roPostRes = await postHandler(
        new NextRequest('http://localhost/api/v1/crm/leads', {
          method: 'POST',
          headers: { 'x-api-key': apiKeySecret },
        }),
      );
      assert.equal(roPostRes.status, 402);
      assert.equal(roPostRes.headers.get('x-orbitox-billing-state'), 'read_only');
      const roBody = await roPostRes.json();
      assert.equal(roBody.error?.code, 'PAYMENT_REQUIRED');

      // 3. SUSPENDED installation, no grant header: GET -> 402, POST -> 402
      await platformRepository.updatePluginInstallationStatus(tenantId, '@orbitox/crm', 'SUSPENDED');

      const suspGetRes = await getHandler(
        new NextRequest('http://localhost/api/v1/crm/leads', {
          method: 'GET',
          headers: { 'x-api-key': apiKeySecret },
        }),
      );
      assert.equal(suspGetRes.status, 402);
      assert.equal(suspGetRes.headers.get('x-orbitox-billing-state'), 'suspended');
      const suspGetBody = await suspGetRes.json();
      assert.equal(suspGetBody.error?.code, 'PAYMENT_REQUIRED');

      const suspPostRes = await postHandler(
        new NextRequest('http://localhost/api/v1/crm/leads', {
          method: 'POST',
          headers: { 'x-api-key': apiKeySecret },
        }),
      );
      assert.equal(suspPostRes.status, 402);
      assert.equal(suspPostRes.headers.get('x-orbitox-billing-state'), 'suspended');

      // 4. Client sending a forged or ACTIVE grant header for a SUSPENDED installation -> still 402 (headers ignored)
      const forgedActiveToken = createEntitlementGrantToken({
        tenantId,
        pluginId: '@orbitox/crm',
        planId: 'crm-starter',
        status: 'ACTIVE',
        features: ['*'],
        quotas: {},
        revision: 1,
      });

      const forgedRes = await postHandler(
        new NextRequest('http://localhost/api/v1/crm/leads', {
          method: 'POST',
          headers: {
            'x-api-key': apiKeySecret,
            'x-orbitox-grant': forgedActiveToken,
            'x-grant-token': forgedActiveToken,
            'x-orbitox-billing-state': 'ACTIVE',
          },
        }),
      );
      assert.equal(forgedRes.status, 402);
      assert.equal(forgedRes.headers.get('x-orbitox-billing-state'), 'suspended');

      // 5. After subscription.charged -> the write works again (restored to ACTIVE server-side)
      await platformRepository.updatePluginInstallationStatus(tenantId, '@orbitox/crm', 'ACTIVE');

      const restoredPostRes = await postHandler(
        new NextRequest('http://localhost/api/v1/crm/leads', {
          method: 'POST',
          headers: { 'x-api-key': apiKeySecret },
        }),
      );
      assert.equal(restoredPostRes.status, 200);

      // 6. Zero per-request billing queries assertion
      assert.equal(
        billingSubscriptionQueries,
        0,
        `Expected 0 billingSubscription queries in withApiGuard, got ${billingSubscriptionQueries}`,
      );
      assert.equal(
        planQueries,
        0,
        `Expected 0 plan queries in withApiGuard, got ${planQueries}`,
      );

      // 7. A billable request without any header increments PlatformPluginUsage
      if (platformRepository.isPrismaBacked()) {
        const usageTenantId = `org/${createdOrgId}/project/${createdProjectId}/environment/${createdEnvId}`;
        const usageRecords = await prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${usageTenantId}, true)`;
          return tx.platformPluginUsage.findMany({
            where: { pluginId: 'crm', projectId: createdProjectId },
          });
        });
        assert.ok(usageRecords.length > 0, 'Expected PlatformPluginUsage record to be created');
        assert.ok(usageRecords[0]!.requestCount >= 1n, 'Expected PlatformPluginUsage requestCount to be incremented');
      }
    } finally {
      prisma.billingSubscription.findFirst = originalFindFirst;
      prisma.plan.findUnique = originalFindUnique;
    }
  });

  it('refuses request when no installation exists for a plugin service', async () => {
    if (platformRepository.isPrismaBacked()) {
      await prisma.pluginInstallation.updateMany({
        where: { tenantId, pluginId: { in: ['@orbitox/crm', 'crm'] } },
        data: { tenantId: `${tenantId}-uninstalled`, runtimeTenantId: `${tenantId}-uninstalled` },
      });
    } else {
      const allInst: any[] = (PlatformRepository as any).pluginInstallations || [];
      const toRemove = allInst.filter((p: any) =>
        (p.tenantId === tenantId || p.tenantId?.includes(createdProjectId) || p.tenantId?.includes(suffix)) &&
        (p.pluginId === '@orbitox/crm' || p.pluginId === 'crm')
      );
      for (const inst of toRemove) {
        const idx = allInst.indexOf(inst);
        if (idx !== -1) allInst.splice(idx, 1);
      }
    }

    const handler = withApiGuard(
      { serviceId: 'crm', serviceName: 'CRM Service', requiredScopes: ['crm:read'] },
      async (_req, ctx) => NextResponse.json({ success: true, tenantId: ctx.tenantId }),
    );

    const res = await handler(
      new NextRequest('http://localhost/api/v1/crm/leads', {
        method: 'GET',
        headers: { 'x-api-key': apiKeySecret },
      }),
    );
    assert.equal(res.status, 402);
    const body = await res.json();
    assert.equal(body.error?.code, 'PAYMENT_REQUIRED');
  });

  it('enforces environment-specific status: production ACTIVE (200) and staging SUSPENDED (402)', async () => {
    const org = await platformRepository.createOrganization({
      slug: `g4-env-org-${suffix}`,
      name: `G4 Env Org ${suffix}`,
      billingEmail: `g4-env-${suffix}@example.test`,
    });
    const proj = await platformRepository.createProject({
      name: `G4 Env Project ${suffix}`,
      slug: `g4-env-proj-${suffix}`,
      organizationId: org.id,
      businessModel: 'B2B_SAAS',
      planTier: 'starter',
      plan: 'starter',
      technicalLead: 'G4 Test',
      contactEmail: `g4-env-${suffix}@example.test`,
      enabledServices: ['crm'],
      apiCallQuota: 1000,
    });
    const prodEnv = proj.environments.find((e) => e.slug === 'production')!;
    const stageEnv = proj.environments.find((e) => e.slug === 'staging')!;

    const prodTenantId = `org/${org.id}/project/${proj.project.id}/environment/${prodEnv.id}`;
    const stageTenantId = `org/${org.id}/project/${proj.project.id}/environment/${stageEnv.id}`;

    const existingProdInst = await platformRepository.getPluginInstallation(prodTenantId, '@orbitox/crm');
    if (existingProdInst) {
      await platformRepository.updatePluginInstallationStatus(prodTenantId, '@orbitox/crm', 'ACTIVE');
    } else {
      await platformRepository.provisionPluginInstallation({
        tenantId: prodTenantId,
        runtimeTenantId: prodTenantId,
        pluginId: '@orbitox/crm',
        status: 'ACTIVE',
        planId: 'crm-starter',
      });
    }

    await platformRepository.provisionPluginInstallation({
      tenantId: stageTenantId,
      runtimeTenantId: stageTenantId,
      pluginId: '@orbitox/crm',
      status: 'SUSPENDED',
      planId: 'crm-starter',
    });

    const prodKey = await platformRepository.createApiKey({
      name: `Prod Key ${suffix}`,
      environmentId: prodEnv.id,
      projectId: proj.project.id,
      capabilities: ['crm:read'],
      tenantScope: [proj.project.slug],
      createdBy: 'test-g4',
    });

    const stageKey = await platformRepository.createApiKey({
      name: `Stage Key ${suffix}`,
      environmentId: stageEnv.id,
      projectId: proj.project.id,
      capabilities: ['crm:read'],
      tenantScope: [proj.project.slug],
      createdBy: 'test-g4',
    });

    const handler = withApiGuard(
      { serviceId: 'crm', serviceName: 'CRM Service', requiredScopes: ['crm:read'] },
      async (_req, ctx) => NextResponse.json({ success: true, tenantId: ctx.tenantId }),
    );

    const stageRes = await handler(
      new NextRequest('http://localhost/api/v1/crm/leads', {
        method: 'GET',
        headers: { 'x-api-key': stageKey.rawSecret },
      }),
    );
    assert.equal(stageRes.status, 402);
    const stageBody = await stageRes.json();
    assert.equal(stageBody.error?.code, 'PAYMENT_REQUIRED');

    const prodRes = await handler(
      new NextRequest('http://localhost/api/v1/crm/leads', {
        method: 'GET',
        headers: { 'x-api-key': prodKey.rawSecret },
      }),
    );
    assert.equal(prodRes.status, 200);
  });

  it('rejects with 402 when canonical installation is SUSPENDED despite stale ACTIVE slug-based duplicate', async () => {
    const org = await platformRepository.createOrganization({
      slug: `g4-stale-org-${suffix}`,
      name: `G4 Stale Org ${suffix}`,
      billingEmail: `g4-stale-${suffix}@example.test`,
    });
    const proj = await platformRepository.createProject({
      name: `G4 Stale Project ${suffix}`,
      slug: `g4-stale-proj-${suffix}`,
      organizationId: org.id,
      businessModel: 'B2B_SAAS',
      planTier: 'starter',
      plan: 'starter',
      technicalLead: 'G4 Test',
      contactEmail: `g4-stale-${suffix}@example.test`,
      enabledServices: ['crm'],
      apiCallQuota: 1000,
    });
    const prodEnv = proj.environments.find((e) => e.slug === 'production')!;
    const canonicalTenantId = `org/${org.id}/project/${proj.project.id}/environment/${prodEnv.id}`;
    const slugBasedTenantId = `org/${org.slug}/project/${proj.project.slug}/environment/production`;

    const existingCanonical = await platformRepository.getPluginInstallation(canonicalTenantId, '@orbitox/crm');
    if (existingCanonical) {
      await platformRepository.updatePluginInstallationStatus(canonicalTenantId, '@orbitox/crm', 'SUSPENDED');
    } else {
      await platformRepository.provisionPluginInstallation({
        tenantId: canonicalTenantId,
        runtimeTenantId: canonicalTenantId,
        pluginId: '@orbitox/crm',
        status: 'SUSPENDED',
        planId: 'crm-starter',
      });
    }

    // 2. Inject stale duplicate with old slug-based tenant ID as ACTIVE
    if (platformRepository.isPrismaBacked()) {
      await prisma.pluginInstallation.create({
        data: {
          id: `pinst_stale_${suffix}`,
          tenantId: slugBasedTenantId,
          runtimeTenantId: slugBasedTenantId,
          pluginId: '@orbitox/crm',
          status: 'ACTIVE',
          planId: 'crm-starter',
        },
      });
    } else {
      (PlatformRepository as any).pluginInstallations.push({
        id: `pinst_stale_${suffix}`,
        tenantId: slugBasedTenantId,
        runtimeTenantId: slugBasedTenantId,
        pluginId: '@orbitox/crm',
        status: 'ACTIVE',
        planId: 'crm-starter',
        entitlementRevision: 1,
        config: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const key = await platformRepository.createApiKey({
      name: `Stale Test Key ${suffix}`,
      environmentId: prodEnv.id,
      projectId: proj.project.id,
      capabilities: ['crm:read'],
      tenantScope: [proj.project.slug],
      createdBy: 'test-g4',
    });

    const handler = withApiGuard(
      { serviceId: 'crm', serviceName: 'CRM Service', requiredScopes: ['crm:read'] },
      async (_req, ctx) => NextResponse.json({ success: true, tenantId: ctx.tenantId }),
    );

    const res = await handler(
      new NextRequest('http://localhost/api/v1/crm/leads', {
        method: 'GET',
        headers: { 'x-api-key': key.rawSecret },
      }),
    );
    assert.equal(res.status, 402);
    const body = await res.json();
    assert.equal(body.error?.code, 'PAYMENT_REQUIRED');
  });

  it('broad [*] key gets targeted tenant status when x-tenant-id is provided, and own environment status when omitted', async () => {
    const orgA = await platformRepository.createOrganization({
      slug: `g4-star-org-a-${suffix}`,
      name: `G4 Star Org A ${suffix}`,
      billingEmail: `g4-star-a-${suffix}@example.test`,
    });
    const projA = await platformRepository.createProject({
      name: `G4 Star Project A ${suffix}`,
      slug: `g4-star-proj-a-${suffix}`,
      organizationId: orgA.id,
      businessModel: 'B2B_SAAS',
      planTier: 'starter',
      plan: 'starter',
      technicalLead: 'G4 Test',
      contactEmail: `g4-star-a-${suffix}@example.test`,
      enabledServices: ['crm'],
      apiCallQuota: 1000,
    });
    const envA = projA.environments.find((e) => e.slug === 'production')!;
    const tenantA = `org/${orgA.id}/project/${projA.project.id}/environment/${envA.id}`;

    const existingA = await platformRepository.getPluginInstallation(tenantA, '@orbitox/crm');
    if (existingA) {
      await platformRepository.updatePluginInstallationStatus(tenantA, '@orbitox/crm', 'ACTIVE');
    } else {
      await platformRepository.provisionPluginInstallation({
        tenantId: tenantA,
        runtimeTenantId: tenantA,
        pluginId: '@orbitox/crm',
        status: 'ACTIVE',
        planId: 'crm-starter',
      });
    }

    const orgB = await platformRepository.createOrganization({
      slug: `g4-star-org-b-${suffix}`,
      name: `G4 Star Org B ${suffix}`,
      billingEmail: `g4-star-b-${suffix}@example.test`,
    });
    const projB = await platformRepository.createProject({
      name: `G4 Star Project B ${suffix}`,
      slug: `g4-star-proj-b-${suffix}`,
      organizationId: orgB.id,
      businessModel: 'B2B_SAAS',
      planTier: 'starter',
      plan: 'starter',
      technicalLead: 'G4 Test',
      contactEmail: `g4-star-b-${suffix}@example.test`,
      enabledServices: ['crm'],
      apiCallQuota: 1000,
    });
    const envB = projB.environments.find((e) => e.slug === 'production')!;
    const tenantB = `org/${orgB.id}/project/${projB.project.id}/environment/${envB.id}`;

    const existingB = await platformRepository.getPluginInstallation(tenantB, '@orbitox/crm');
    if (existingB) {
      await platformRepository.updatePluginInstallationStatus(tenantB, '@orbitox/crm', 'SUSPENDED');
    } else {
      await platformRepository.provisionPluginInstallation({
        tenantId: tenantB,
        runtimeTenantId: tenantB,
        pluginId: '@orbitox/crm',
        status: 'SUSPENDED',
        planId: 'crm-starter',
      });
    }

    const broadKey = await platformRepository.createApiKey({
      name: `Broad Key ${suffix}`,
      environmentId: envA.id,
      projectId: projA.project.id,
      capabilities: ['crm:read'],
      tenantScope: ['*'],
      createdBy: 'test-g4',
    });

    const handler = withApiGuard(
      { serviceId: 'crm', serviceName: 'CRM Service', requiredScopes: ['crm:read'] },
      async (_req, ctx) => NextResponse.json({ success: true, tenantId: ctx.tenantId }),
    );

    const resB = await handler(
      new NextRequest('http://localhost/api/v1/crm/leads', {
        method: 'GET',
        headers: {
          'x-api-key': broadKey.rawSecret,
          'x-tenant-id': tenantB,
        },
      }),
    );
    assert.equal(resB.status, 402);
    const bodyB = await resB.json();
    assert.equal(bodyB.error?.code, 'PAYMENT_REQUIRED');

    const resA = await handler(
      new NextRequest('http://localhost/api/v1/crm/leads', {
        method: 'GET',
        headers: {
          'x-api-key': broadKey.rawSecret,
        },
      }),
    );
    assert.equal(resA.status, 200);
  });

  it('returns 403 TENANT_SCOPE_VIOLATION before any billing decision when requesting a tenant outside scope', async () => {
    const org = await platformRepository.createOrganization({
      slug: `g4-scope-org-${suffix}`,
      name: `G4 Scope Org ${suffix}`,
      billingEmail: `g4-scope-${suffix}@example.test`,
    });
    const proj = await platformRepository.createProject({
      name: `G4 Scope Project ${suffix}`,
      slug: `g4-scope-proj-${suffix}`,
      organizationId: org.id,
      businessModel: 'B2B_SAAS',
      planTier: 'starter',
      plan: 'starter',
      technicalLead: 'G4 Test',
      contactEmail: `g4-scope-${suffix}@example.test`,
      enabledServices: ['crm'],
      apiCallQuota: 1000,
    });
    const env = proj.environments.find((e) => e.slug === 'production')!;
    const canonicalTenantId = `org/${org.id}/project/${proj.project.id}/environment/${env.id}`;

    const existing = await platformRepository.getPluginInstallation(canonicalTenantId, '@orbitox/crm');
    if (existing) {
      await platformRepository.updatePluginInstallationStatus(canonicalTenantId, '@orbitox/crm', 'ACTIVE');
    } else {
      await platformRepository.provisionPluginInstallation({
        tenantId: canonicalTenantId,
        runtimeTenantId: canonicalTenantId,
        pluginId: '@orbitox/crm',
        status: 'ACTIVE',
        planId: 'crm-starter',
      });
    }

    const key = await platformRepository.createApiKey({
      name: `Scoped Key ${suffix}`,
      environmentId: env.id,
      projectId: proj.project.id,
      capabilities: ['crm:read'],
      tenantScope: [proj.project.slug],
      createdBy: 'test-g4',
    });

    const handler = withApiGuard(
      { serviceId: 'crm', serviceName: 'CRM Service', requiredScopes: ['crm:read'] },
      async (_req, ctx) => NextResponse.json({ success: true, tenantId: ctx.tenantId }),
    );

    const res = await handler(
      new NextRequest('http://localhost/api/v1/crm/leads', {
        method: 'GET',
        headers: {
          'x-api-key': key.rawSecret,
          'x-tenant-id': 'unauthorized-other-tenant',
        },
      }),
    );
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error?.code, 'TENANT_SCOPE_VIOLATION');
  });
});
