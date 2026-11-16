import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as http from 'node:http';
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { prisma } from '@/server/db/prisma';
import { GET } from '@/app/api/v1/customer/tenants/[tenantId]/preview-summary/route';
import {
  createCustomerSessionForUser,
  CUSTOMER_SESSION_COOKIE,
} from '@/server/accounts/account-service';

process.env.DATABASE_URL ||= process.env.TEST_DATABASE_URL || 'postgresql://apple@127.0.0.1:5432/orbitox_phase2';
process.env.ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY ||= crypto.randomBytes(32).toString('base64');

const maintenanceUrl =
  process.env.MAINTENANCE_DATABASE_URL ||
  'postgresql://orbitox_maintenance:test_maint_pass@127.0.0.1:5432/orbitox_phase2';
const maintenancePrisma = new PrismaClient({
  datasources: { db: { url: maintenanceUrl } },
});

describe('Stage 4 & 5: Customer Tenant Preview Summary & Access Control', () => {
  let verifiedOwner: any;
  let unverifiedUser: any;
  let foreignUser: any;
  let ownerSession: { sessionToken: string; csrfToken: string };
  let unverifiedSession: { sessionToken: string; csrfToken: string };
  let foreignSession: { sessionToken: string; csrfToken: string };
  let testOrg: any;
  let testProject: any;
  let mockRuntimeServer: http.Server;

  before(async () => {
    const salt = crypto.randomBytes(3).toString('hex');
    verifiedOwner = await prisma.customerUser.create({
      data: {
        email: `preview.owner.${salt}@orbitox.test`,
        passwordHash: 'argon2id$v=19$m=65536,t=3,p=4$fakehash',
        name: 'Owner Tester',
        emailVerifiedAt: new Date(),
      },
    });
    ownerSession = await createCustomerSessionForUser(verifiedOwner.id, { ipAddress: '127.0.0.1' });

    unverifiedUser = await prisma.customerUser.create({
      data: {
        email: `preview.unverified.${salt}@orbitox.test`,
        passwordHash: 'argon2id$v=19$m=65536,t=3,p=4$fakehash',
        name: 'Unverified User',
        emailVerifiedAt: null,
      },
    });
    unverifiedSession = await createCustomerSessionForUser(unverifiedUser.id, { ipAddress: '127.0.0.1' });

    foreignUser = await prisma.customerUser.create({
      data: {
        email: `preview.foreign.${salt}@orbitox.test`,
        passwordHash: 'argon2id$v=19$m=65536,t=3,p=4$fakehash',
        name: 'Foreign User',
        emailVerifiedAt: new Date(),
      },
    });
    foreignSession = await createCustomerSessionForUser(foreignUser.id, { ipAddress: '127.0.0.1' });

    testOrg = await prisma.platformOrganization.create({
      data: {
        name: `Preview Test Org ${salt}`,
        slug: `preview-org-${salt}`,
        billingEmail: verifiedOwner.email,
        businessCategory: 'RESTAURANTS_CAFES',
        city: 'Bengaluru',
      },
    });

    await prisma.customerMembership.create({
      data: {
        organizationId: testOrg.id,
        userId: verifiedOwner.id,
        role: 'OWNER',
      },
    });

    testProject = await prisma.platformProject.create({
      data: {
        slug: `masala-preview-${salt}`,
        name: 'Masala House Preview',
        organizationId: testOrg.id,
        businessModel: 'O2O2B2B2C',
        planTier: 'starter',
        plan: 'restaurant-starter',
        technicalLead: 'Owner Tester',
        contactEmail: verifiedOwner.email,
        status: 'ACTIVE',
      },
    });

    await prisma.projectEnvironment.create({
      data: {
        projectId: testProject.id,
        name: 'Production',
        slug: 'production',
        isProduction: true,
      },
    });

    // Spin up mock runtime server to supply genuine restaurant preview tenant details
    mockRuntimeServer = http.createServer((req, res) => {
      const url = new URL(req.url || '', 'http://127.0.0.1');
      const slug = decodeURIComponent(url.pathname.replace('/internal/tenants/', ''));
      if (slug.startsWith('expired-')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true,
          tenant: {
            id: `ten_${slug}`,
            name: 'Expired Lounge',
            slug,
            status: 'preview',
            previewExpiresAt: new Date(Date.now() - 3600000).toISOString(),
            tableCount: 10,
          },
        }));
        return;
      }
      if (slug.startsWith('active-')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true,
          tenant: {
            id: `ten_${slug}`,
            name: 'Active Bistro',
            slug,
            status: 'active',
            tableCount: 12,
          },
        }));
        return;
      }
      if (slug === testProject.slug) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true,
          tenant: {
            id: `ten_${slug}`,
            name: testProject.name,
            slug: testProject.slug,
            status: 'preview',
            tableCount: 14,
            sampleTableLocator: {
              tableNumber: 'T-01',
              locator: 'T-01',
              dinerUrl: `http://${slug}.orbitox.io/dine/T-01`,
            },
            categoriesCount: 6,
            categories: ['Starters', 'Mains', 'Breads', 'Desserts', 'Beverages', 'Chef Specials'],
            menuItemsCount: 24,
            menuItems: [
              { id: 'item_1', name: 'Paneer Tikka', categoryName: 'Starters', basePriceMinor: 28000, station: 'TANDOOR', isVegetarian: true, isSample: true }
            ],
            sampleItemsCount: 14,
            hasSampleMenu: true,
            brandConfig: { activeTemplateId: 'saffron', primaryColor: '#FB923C', accentColor: '#FB923C' },
          },
        }));
        return;
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'NOT_FOUND' }));
    });

    await new Promise<void>((resolve) => {
      mockRuntimeServer.listen(0, '127.0.0.1', () => {
        const port = (mockRuntimeServer.address() as any).port;
        process.env.RESTAURANTOS_RUNTIME_URL = `http://127.0.0.1:${port}`;
        process.env.RESTAURANTOS_PLATFORM_TOKEN = 'test_token_32chars_long_platform_auth';
        resolve();
      });
    });
  });

  after(async () => {
    if (mockRuntimeServer) {
      await new Promise<void>((resolve) => mockRuntimeServer.close(() => resolve()));
    }
    if (testProject?.id) {
      await prisma.projectEnvironment.deleteMany({ where: { projectId: testProject.id } });
      await prisma.platformProject.deleteMany({ where: { id: testProject.id } });
    }
    if (testOrg?.id) {
      try {
        await maintenancePrisma.$queryRaw`SELECT public.close_customer_organization(${testOrg.id})`;
      } catch (err) {
        console.error('Failed to close org in preview test:', err);
      }
    }
    const userIds = [verifiedOwner?.id, unverifiedUser?.id, foreignUser?.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.customerSession.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.customerUser.deleteMany({ where: { id: { in: userIds } } });
    }
    await Promise.all([prisma.$disconnect(), maintenancePrisma.$disconnect()]);
  });

  function makeGetRequest(param: string, session?: { sessionToken: string }) {
    const headers: Record<string, string> = {};
    if (session) {
      headers.Cookie = `${CUSTOMER_SESSION_COOKIE}=${session.sessionToken}`;
    }
    return new NextRequest(
      `http://localhost:3005/api/v1/customer/tenants/${encodeURIComponent(param)}/preview-summary`,
      { method: 'GET', headers },
    );
  }

  it('rejects unauthenticated requests with 401', async () => {
    const req = makeGetRequest(testProject.slug);
    const res = await GET(req, { params: Promise.resolve({ tenantId: testProject.slug }) });
    assert.equal(res.status, 401);
  });

  it('rejects access from unauthorized foreign customer with 403', async () => {
    const req = makeGetRequest(testProject.slug, foreignSession);
    const res = await GET(req, { params: Promise.resolve({ tenantId: testProject.slug }) });
    assert.equal(res.status, 403);
    const json = await res.json();
    assert.equal(json.error, 'UNAUTHORIZED_FOR_ORGANIZATION');
  });

  it('returns 404 for non-existent project', async () => {
    const req = makeGetRequest('non-existent-restaurant', ownerSession);
    const res = await GET(req, { params: Promise.resolve({ tenantId: 'non-existent-restaurant' }) });
    assert.equal(res.status, 404);
  });

  it('returns comprehensive preview summary for authorized owner by slug', async () => {
    const req = makeGetRequest(testProject.slug, ownerSession);
    const res = await GET(req, { params: Promise.resolve({ tenantId: testProject.slug }) });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.ok, true);
    assert.ok(json.preview);
    assert.equal(json.preview.restaurant.name, 'Masala House Preview');
    assert.equal(json.preview.restaurant.slug, testProject.slug);
    assert.equal(json.preview.restaurant.city, 'Bengaluru');
    assert.ok(json.preview.tables.totalCount > 0);
    assert.ok(json.preview.tables.sampleTable);
    assert.ok(json.preview.menu);
    assert.ok(json.preview.checklist.accountVerified);
    assert.ok(json.preview.checklist.organizationCreated);
    assert.ok(json.preview.checklist.restaurantProvisioned);
    assert.ok(json.preview.checklist.previewActive);
    assert.equal(json.preview.checklist.paymentGatewayConnected, false);
    assert.ok(json.preview.actions.dinerPreviewUrl);
    assert.ok(json.preview.actions.kdsUrl);
  });

  it('returns genuine zero counts and null sampleTable without synthetic fallbacks when runtime is unreachable', async () => {
    // Create an unprovisioned project that does not exist in runtime
    const unprovProject = await prisma.platformProject.create({
      data: {
        slug: `unprov-cafe-${crypto.randomBytes(3).toString('hex')}`,
        name: 'Unprovisioned Cafe',
        organizationId: testOrg.id,
        businessModel: 'O2O2B2B2C',
        planTier: 'starter',
        plan: 'restaurant-starter',
        technicalLead: 'Owner Tester',
        contactEmail: verifiedOwner.email,
        status: 'ACTIVE',
      },
    });

    try {
      const req = makeGetRequest(unprovProject.slug, ownerSession);
      const res = await GET(req, { params: Promise.resolve({ tenantId: unprovProject.slug }) });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.ok, true);
      // Must NOT return hardcoded 12 tables or synthetic sample locator!
      assert.equal(json.preview.tables.totalCount, 0, 'Must report actual 0 tables, not synthetic 12');
      assert.equal(json.preview.tables.sampleTable, null, 'Must report null sampleTable, not synthetic sample locator');
      assert.equal(json.preview.menu.categoriesCount, 0);
      assert.equal(json.preview.menu.itemsCount, 0);
    } finally {
      await prisma.platformProject.deleteMany({ where: { id: unprovProject.id } });
    }
  });

  it('reports EXPIRED status and previewActive: false when preview period has passed', async () => {
    const expiredProject = await prisma.platformProject.create({
      data: {
        slug: `expired-resto-${crypto.randomBytes(3).toString('hex')}`,
        name: 'Expired Test Restaurant',
        organizationId: testOrg.id,
        businessModel: 'O2O2B2B2C',
        planTier: 'starter',
        plan: 'restaurant-starter',
        technicalLead: 'Owner Tester',
        contactEmail: verifiedOwner.email,
        status: 'ACTIVE',
      },
    });

    try {
      const req = makeGetRequest(expiredProject.slug, ownerSession);
      const res = await GET(req, { params: Promise.resolve({ tenantId: expiredProject.slug }) });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.ok, true);
      assert.equal(json.preview.restaurant.status, 'EXPIRED');
      assert.equal(json.preview.checklist.previewActive, false);
    } finally {
      await prisma.platformProject.deleteMany({ where: { id: expiredProject.id } });
    }
  });

  it('reports ACTIVE status and previewActive: false for live commercial tenant', async () => {
    const activeProject = await prisma.platformProject.create({
      data: {
        slug: `active-resto-${crypto.randomBytes(3).toString('hex')}`,
        name: 'Active Commercial Restaurant',
        organizationId: testOrg.id,
        businessModel: 'O2O2B2B2C',
        planTier: 'starter',
        plan: 'restaurant-starter',
        technicalLead: 'Owner Tester',
        contactEmail: verifiedOwner.email,
        status: 'ACTIVE',
      },
    });

    try {
      const req = makeGetRequest(activeProject.slug, ownerSession);
      const res = await GET(req, { params: Promise.resolve({ tenantId: activeProject.slug }) });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.ok, true);
      assert.equal(json.preview.restaurant.status, 'ACTIVE');
      assert.equal(json.preview.checklist.previewActive, false);
    } finally {
      await prisma.platformProject.deleteMany({ where: { id: activeProject.id } });
    }
  });

  it('reports PROVISIONING status when provisioning saga is actively in progress', async () => {
    const provSlug = `prov-resto-${crypto.randomBytes(3).toString('hex')}`;
    const provProject = await prisma.platformProject.create({
      data: {
        slug: provSlug,
        name: 'Provisioning Restaurant',
        organizationId: testOrg.id,
        businessModel: 'O2O2B2B2C',
        planTier: 'starter',
        plan: 'restaurant-starter',
        technicalLead: 'Owner Tester',
        contactEmail: verifiedOwner.email,
        status: 'PROVISIONING',
      },
    });

    const opId = `op_test_prov_${crypto.randomBytes(4).toString('hex')}`;
    await (prisma as any).platformOperation.create({
      data: {
        id: opId,
        type: 'TENANT_PROVISION',
        tenantId: `tenant_${provSlug}`,
        organizationId: testOrg.id,
        status: 'PROVISIONING',
        steps: [],
        request: { slug: provSlug },
      },
    });

    try {
      const req = makeGetRequest(provProject.slug, ownerSession);
      const res = await GET(req, { params: Promise.resolve({ tenantId: provProject.slug }) });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.ok, true);
      assert.equal(json.status, 'PROVISIONING');
      assert.equal(json.restaurantProvisioned, false);
      assert.equal(json.preview.restaurant.status, 'PROVISIONING');
    } finally {
      await (prisma as any).platformOperation.deleteMany({ where: { id: opId } });
      await prisma.platformProject.deleteMany({ where: { id: provProject.id } });
    }
  });
});
