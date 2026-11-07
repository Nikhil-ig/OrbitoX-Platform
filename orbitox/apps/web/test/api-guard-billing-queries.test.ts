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
    tenantId = `org/${org.slug}/project/${proj.project.slug}/environment/${env.slug}`;

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
      const allInst = (PlatformRepository as any).pluginInstallations || [];
      const idx = allInst.findIndex((p: any) => p.tenantId === tenantId && p.pluginId === '@orbitox/crm');
      if (idx !== -1) allInst.splice(idx, 1);
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
});
