import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import crypto from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  CUSTOMER_CSRF_COOKIE,
  CUSTOMER_SESSION_COOKIE,
} from '../lib/phase6-account-service';
import { newSessionTokens } from '../lib/phase6-account-security';
import {
  canCustomerDashboardAction,
  type CustomerDashboardAction,
} from '../lib/customer-dashboard';

const ownerUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const runtimeUrl = process.env.APP_DATABASE_URL;
const maintenanceUrl = process.env.MAINTENANCE_DATABASE_URL;
const customerRouteRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../app/api/v1/customer',
);
const organizationRouteRoot = resolve(customerRouteRoot, 'organizations');

const routeCases = [
  { file: 'api-keys/[keyId]/rotate/route.ts', methods: ['POST'] },
  { file: 'api-keys/[keyId]/route.ts', methods: ['DELETE'] },
  { file: 'api-keys/route.ts', methods: ['GET', 'POST'] },
  { file: 'audit/route.ts', methods: ['GET'] },
  { file: 'billing/checkout/confirm/route.ts', methods: ['POST'] },
  { file: 'billing/checkout/route.ts', methods: ['POST'] },
  { file: 'billing/subscriptions/[subscriptionId]/cancel/route.ts', methods: ['POST'] },
  { file: 'billing/subscriptions/[subscriptionId]/change-plan/route.ts', methods: ['POST'] },
  { file: 'data/deletion/route.ts', methods: ['POST'] },
  { file: 'data/export/route.ts', methods: ['POST'] },
  { file: 'invites/route.ts', methods: ['POST'] },
  { file: 'members/[userId]/route.ts', methods: ['DELETE'] },
  { file: 'members/route.ts', methods: ['GET', 'PATCH'] },
  { file: 'ownership-transfer/route.ts', methods: ['POST'] },
  { file: 'tenants/[projectId]/environments/[environmentId]/billing/route.ts', methods: ['GET'] },
  { file: 'tenants/[projectId]/environments/[environmentId]/route.ts', methods: ['GET'] },
  { file: 'tenants/[projectId]/environments/[environmentId]/usage/route.ts', methods: ['GET'] },
  { file: 'tenants/operations/[operationId]/retry/route.ts', methods: ['POST'] },
  { file: 'tenants/route.ts', methods: ['GET', 'POST'] },
] as const;

const writeActions: readonly CustomerDashboardAction[] = [
  'inviteMember',
  'removeMember',
  'changeMemberRole',
  'transferOwnership',
  'createTenant',
  'retryProvisioning',
  'createCheckout',
  'confirmCheckout',
  'cancelBilling',
  'changeBillingPlan',
  'createApiKey',
  'rotateApiKey',
  'revokeApiKey',
  'requestExport',
  'requestDeletion',
];

const nonDashboardCustomerRoutes = [
  'auth/accept-invite/route.ts',
  'auth/login/route.ts',
  'auth/logout/route.ts',
  'auth/me/route.ts',
  'auth/mfa/confirm/route.ts',
  'auth/mfa/setup/route.ts',
  'auth/password-reset/consume/route.ts',
  'auth/password-reset/request/route.ts',
  'auth/reauth/route.ts',
  'auth/signup/route.ts',
  'auth/verify-email/route.ts',
  'email/webhooks/[provider]/route.ts',
].sort();

describe('Phase 6 customer dashboard tenant isolation', () => {
  if (!ownerUrl || !runtimeUrl || !maintenanceUrl) {
    throw new Error('TEST_DATABASE_URL/DATABASE_URL, APP_DATABASE_URL, and MAINTENANCE_DATABASE_URL are required.');
  }

  const owner = new PrismaClient({ datasourceUrl: ownerUrl });
  const maintenance = new PrismaClient({ datasourceUrl: maintenanceUrl });
  let userAId: string | undefined;
  let userBId: string | undefined;
  let organizationAId: string | undefined;
  let organizationBId: string | undefined;
  let sessionToken = '';
  let csrfToken = '';
  let userBEmail = '';
  let organizationBSlug = '';
  let projectBId = '';
  let environmentBId = '';
  let projectBSlug = '';
  let tenantBId = '';

  after(async () => {
    if (organizationAId) {
      await maintenance.$queryRaw`SELECT public.close_customer_organization(${organizationAId})`;
    }
    if (organizationBId) {
      await maintenance.$queryRaw`SELECT public.close_customer_organization(${organizationBId})`;
    }
    if (userAId || userBId) {
      await owner.customerSession.deleteMany({
        where: { userId: { in: [userAId, userBId].filter((id): id is string => Boolean(id)) } },
      });
      await owner.customerUser.deleteMany({
        where: { id: { in: [userAId, userBId].filter((id): id is string => Boolean(id)) } },
      });
    }
    await Promise.all([owner.$disconnect(), maintenance.$disconnect()]);
  });

  it('covers every organization dashboard route and refuses every cross-tenant request', async () => {
    const discovered = await discoverRoutes(customerRouteRoot);
    const organizationRoutes = discovered
      .filter((file) => file.startsWith('organizations/'))
      .map((file) => file.slice('organizations/'.length));
    const nonDashboardRoutes = discovered.filter((file) => !file.startsWith('organizations/'));
    assert.deepEqual(organizationRoutes, routeCases.map(({ file }) => file).sort());
    assert.deepEqual(nonDashboardRoutes, nonDashboardCustomerRoutes);

    const suffix = crypto.randomUUID();
    const now = new Date();
    organizationBSlug = `phase6-cross-b-${suffix}`;
    userBEmail = `phase6-cross-b-${suffix}@example.invalid`;
    const organizationA = await owner.platformOrganization.create({
      data: {
        slug: `phase6-cross-a-${suffix}`,
        name: `Private organization A ${suffix}`,
        billingEmail: `phase6-cross-a-${suffix}@example.invalid`,
      },
      select: { id: true },
    });
    const organizationB = await owner.platformOrganization.create({
      data: {
        slug: organizationBSlug,
        name: `Private organization B ${suffix}`,
        billingEmail: userBEmail,
      },
      select: { id: true },
    });
    organizationAId = organizationA.id;
    organizationBId = organizationB.id;

    const userA = await owner.customerUser.create({
      data: { email: `phase6-cross-a-${suffix}@example.invalid`, emailVerifiedAt: now },
      select: { id: true },
    });
    const userB = await owner.customerUser.create({
      data: { email: userBEmail, emailVerifiedAt: now },
      select: { id: true },
    });
    userAId = userA.id;
    userBId = userB.id;
    await owner.customerMembership.create({
      data: { organizationId: organizationA.id, userId: userA.id, role: 'MEMBER' },
    });
    await owner.customerMembership.create({
      data: { organizationId: organizationB.id, userId: userB.id, role: 'OWNER' },
    });

    const tokens = newSessionTokens();
    sessionToken = tokens.sessionToken;
    csrfToken = tokens.csrfToken;
    await owner.customerSession.create({
      data: {
        userId: userA.id,
        tokenHash: tokens.sessionTokenHash,
        csrfTokenHash: tokens.csrfTokenHash,
        createdAt: now,
        lastSeenAt: now,
        idleExpiresAt: new Date(now.getTime() + 60 * 60 * 1000),
        absoluteExpiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        reauthenticatedAt: now,
        ipAddress: '192.0.2.1',
      },
    });

    const project = await owner.platformProject.create({
      data: {
        slug: `phase6-cross-${suffix}`,
        name: `Private project B ${suffix}`,
        organizationId: organizationB.id,
        businessModel: 'B2B_SAAS',
        planTier: 'starter',
        technicalLead: 'Phase 6 Test',
        contactEmail: userBEmail,
      },
      select: { id: true, slug: true },
    });
    const environment = await owner.projectEnvironment.create({
      data: {
        projectId: project.id,
        slug: 'production',
        name: `Private environment B ${suffix}`,
        type: 'PRODUCTION',
        isProduction: true,
      },
      select: { id: true },
    });
    projectBId = project.id;
    projectBSlug = project.slug;
    environmentBId = environment.id;
    tenantBId = `org/${organizationB.id}/project/${project.id}/environment/${environment.id}`;

    let covered = 0;
    for (const routeCase of routeCases) {
      const routeModule = await import(pathToFileURL(resolve(organizationRouteRoot, routeCase.file)).href);
      for (const method of routeCase.methods) {
        const handler = routeModule[method] as unknown;
        assert.equal(typeof handler, 'function', `${routeCase.file} must export ${method}`);
        const response = await (handler as CustomerRouteHandler)(
          makeRequest(method, routeCase.file, {
            organizationId: organizationB.id,
            projectId: project.id,
            environmentId: environment.id,
            keyId: `key-${suffix}`,
            subscriptionId: `sub_${suffix.replaceAll('-', '')}`,
            operationId: `operation-${suffix}`,
            userId: userB.id,
          }),
          { params: Promise.resolve({
            organizationId: organizationB.id,
            projectId: project.id,
            environmentId: environment.id,
            keyId: `key-${suffix}`,
            subscriptionId: `sub_${suffix.replaceAll('-', '')}`,
            operationId: `operation-${suffix}`,
            userId: userB.id,
          }) },
        );
        assert.ok(
          response.status === 403 || response.status === 404,
          `${method} ${routeCase.file} returned ${response.status}, expected 403 or 404`,
        );
        const body = await response.text();
        for (const privateValue of [
          organizationB.id,
          organizationBSlug,
          userBEmail,
          projectBId,
          projectBSlug,
          environmentBId,
          tenantBId,
        ]) {
          assert.equal(body.includes(privateValue), false, `${method} ${routeCase.file} leaked ${privateValue}`);
        }
        covered += 1;
      }
    }
    const expectedHandlers = routeCases.reduce((count, route) => count + route.methods.length, 0);
    assert.equal(covered, expectedHandlers);
    console.info(
      `Cross-tenant customer dashboard coverage: ${covered}/${expectedHandlers} handlers; discovered ${discovered.length} customer routes.`,
    );
  });

  it('enforces the documented role matrix for every write action', () => {
    const expectations: Record<CustomerDashboardAction, readonly string[]> = {
      inviteMember: ['OWNER', 'ADMIN'],
      removeMember: ['OWNER', 'ADMIN'],
      changeMemberRole: ['OWNER', 'ADMIN'],
      transferOwnership: ['OWNER'],
      createTenant: ['OWNER', 'ADMIN'],
      retryProvisioning: ['OWNER', 'ADMIN'],
      readBilling: ['OWNER', 'BILLING'],
      createCheckout: ['OWNER', 'BILLING'],
      confirmCheckout: ['OWNER', 'BILLING'],
      cancelBilling: ['OWNER'],
      changeBillingPlan: ['OWNER'],
      createApiKey: ['OWNER', 'ADMIN'],
      rotateApiKey: ['OWNER', 'ADMIN'],
      revokeApiKey: ['OWNER'],
      requestExport: ['OWNER'],
      requestDeletion: ['OWNER'],
    };
    const roles = ['MEMBER', 'BILLING', 'ADMIN', 'OWNER'] as const;
    for (const action of writeActions) {
      for (const role of roles) {
        assert.equal(
          canCustomerDashboardAction(role, action),
          expectations[action].includes(role),
          `${role} permission for ${action}`,
        );
      }
    }
  });

  function makeRequest(
    method: string,
    file: string,
    params: Record<string, string>,
  ): NextRequest {
    const routePath = `/api/v1/customer/organizations/${params.organizationId}/${file
      .replace(/\/route\.ts$/, '')
      .replace(/\[([^\]]+)\]/g, (_match, name: string) => params[name] || 'missing')}`;
    const body = bodyForRoute(file, params);
    const headers = new Headers({
      cookie: `${CUSTOMER_SESSION_COOKIE}=${sessionToken}; ${CUSTOMER_CSRF_COOKIE}=${csrfToken}`,
      origin: 'https://console.orbitox.test',
    });
    if (method !== 'GET' && method !== 'HEAD') {
      headers.set('content-type', 'application/json');
      headers.set('x-csrf-token', csrfToken);
    }
    return new NextRequest(`https://console.orbitox.test${routePath}`, {
      method,
      headers,
      ...(method !== 'GET' && method !== 'HEAD' ? { body: JSON.stringify(body) } : {}),
    });
  }

  function bodyForRoute(file: string, params: Record<string, string>): unknown {
    if (file === 'members/route.ts') return { userId: params.userId, role: 'ADMIN' };
    if (file === 'invites/route.ts') return { email: userBEmail, role: 'MEMBER' };
    if (file === 'ownership-transfer/route.ts') return { newOwnerUserId: params.userId };
    if (file === 'billing/checkout/route.ts') return { tenantId: tenantBId, razorpayPlanId: 'plan-private' };
    if (file === 'billing/checkout/confirm/route.ts') {
      return { subscriptionId: params.subscriptionId, paymentId: 'pay_private', signature: 'invalid' };
    }
    if (file.endsWith('/change-plan/route.ts')) return { razorpayPlanId: 'plan-private' };
    if (file === 'api-keys/route.ts') {
      return { environmentId: environmentBId, name: 'Private key B', capabilities: ['read'] };
    }
    return {};
  }
});

type CustomerRouteHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response>;

async function discoverRoutes(root: string, prefix = ''): Promise<string[]> {
  const entries = await readdir(resolve(root, prefix), { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return discoverRoutes(root, relativePath);
    return entry.name === 'route.ts' ? [relativePath] : [];
  }));
  return files.flat().sort();
}
