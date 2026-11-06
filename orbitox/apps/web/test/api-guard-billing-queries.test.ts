import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '../app/api/v1/_lib/api-guard';
import { platformRepository } from '../lib/platform-repository';
import { prisma } from '../lib/prisma';
import { createEntitlementGrantToken } from '@orbitox-io/plugin-engine';

describe('withApiGuard Billing State Enforcement & Query Budget', () => {
  let createdOrgId: string;
  let createdProjectId: string;
  let apiKeySecret: string;
  let tenantId: string;
  const suffix = crypto.randomUUID().slice(0, 8);

  beforeEach(async () => {
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
    tenantId = `org/${org.slug}/project/${proj.project.slug}/environment/${env.slug}`;

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

  it('enforces ACTIVE, READ_ONLY, and SUSPENDED from grant token with zero per-request billing queries', async () => {
    let billingSubscriptionQueries = 0;
    let planQueries = 0;

    // Spy on prisma.billingSubscription.findFirst and prisma.plan.findUnique
    const originalFindFirst = prisma.billingSubscription.findFirst;
    const originalFindUnique = prisma.plan.findUnique;

    (prisma.billingSubscription as any).findFirst = async (...args: any[]) => {
      billingSubscriptionQueries += 1;
      return originalFindFirst.apply(prisma.billingSubscription, args as any);
    };
    (prisma.plan as any).findUnique = async (...args: any[]) => {
      planQueries += 1;
      return originalFindUnique.apply(prisma.plan, args as any);
    };

    try {
      const getHandler = withApiGuard(
        { serviceId: 'crm', serviceName: 'CRM Service', requiredScopes: ['crm:read'] },
        async (_req, ctx) => NextResponse.json({ success: true, method: 'GET', tenantId: ctx.tenantId }),
      );

      const postHandler = withApiGuard(
        { serviceId: 'crm', serviceName: 'CRM Service', requiredScopes: ['crm:write'] },
        async (_req, ctx) => NextResponse.json({ success: true, method: 'POST', tenantId: ctx.tenantId }),
      );

      const activeToken = createEntitlementGrantToken({
        tenantId,
        pluginId: '@orbitox/crm',
        planId: 'crm-starter',
        status: 'ACTIVE',
        features: ['*'],
        quotas: {},
        revision: 1,
      });

      const readOnlyToken = createEntitlementGrantToken({
        tenantId,
        pluginId: '@orbitox/crm',
        planId: 'crm-starter',
        status: 'READ_ONLY',
        features: ['*'],
        quotas: {},
        revision: 1,
      });

      const suspendedToken = createEntitlementGrantToken({
        tenantId,
        pluginId: '@orbitox/crm',
        planId: 'crm-starter',
        status: 'SUSPENDED',
        features: ['*'],
        quotas: {},
        revision: 1,
      });

      // 1. ACTIVE: GET allowed (200), POST allowed (200)
      const activeGetRes = await getHandler(
        new NextRequest('http://localhost/api/v1/crm/leads', {
          method: 'GET',
          headers: { 'x-api-key': apiKeySecret, 'x-orbitox-grant': activeToken },
        }),
      );
      assert.equal(activeGetRes.status, 200);

      const activePostRes = await postHandler(
        new NextRequest('http://localhost/api/v1/crm/leads', {
          method: 'POST',
          headers: { 'x-api-key': apiKeySecret, 'x-orbitox-grant': activeToken },
        }),
      );
      assert.equal(activePostRes.status, 200);

      // 2. READ_ONLY: GET allowed (200), POST blocked (402 PAYMENT_REQUIRED)
      const roGetRes = await getHandler(
        new NextRequest('http://localhost/api/v1/crm/leads', {
          method: 'GET',
          headers: { 'x-api-key': apiKeySecret, 'x-orbitox-grant': readOnlyToken },
        }),
      );
      assert.equal(roGetRes.status, 200);

      const roPostRes = await postHandler(
        new NextRequest('http://localhost/api/v1/crm/leads', {
          method: 'POST',
          headers: { 'x-api-key': apiKeySecret, 'x-orbitox-grant': readOnlyToken },
        }),
      );
      assert.equal(roPostRes.status, 402);
      assert.equal(roPostRes.headers.get('x-orbitox-billing-state'), 'read_only');
      const roBody = await roPostRes.json();
      assert.equal(roBody.error?.code, 'PAYMENT_REQUIRED');

      // 3. SUSPENDED: GET blocked (402 PAYMENT_REQUIRED), POST blocked (402 PAYMENT_REQUIRED)
      const suspGetRes = await getHandler(
        new NextRequest('http://localhost/api/v1/crm/leads', {
          method: 'GET',
          headers: { 'x-api-key': apiKeySecret, 'x-orbitox-grant': suspendedToken },
        }),
      );
      assert.equal(suspGetRes.status, 402);
      assert.equal(suspGetRes.headers.get('x-orbitox-billing-state'), 'suspended');

      const suspPostRes = await postHandler(
        new NextRequest('http://localhost/api/v1/crm/leads', {
          method: 'POST',
          headers: { 'x-api-key': apiKeySecret, 'x-orbitox-grant': suspendedToken },
        }),
      );
      assert.equal(suspPostRes.status, 402);
      assert.equal(suspPostRes.headers.get('x-orbitox-billing-state'), 'suspended');

      // 4. Zero billing queries assertion: no findFirst or findUnique executed per-request
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
    } finally {
      prisma.billingSubscription.findFirst = originalFindFirst;
      prisma.plan.findUnique = originalFindUnique;
    }
  });
});
