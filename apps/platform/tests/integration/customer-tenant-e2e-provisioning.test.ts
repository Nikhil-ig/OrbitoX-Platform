import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { prisma } from '@/server/db/prisma';
import { POST as createTenantPOST } from '@/app/api/v1/customer/organizations/[organizationId]/tenants/route';
import { GET as getPreviewSummaryGET } from '@/app/api/v1/customer/tenants/[tenantId]/preview-summary/route';
import {
  createCustomerSessionForUser,
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_CSRF_COOKIE,
} from '@/server/accounts/account-service';

process.env.DATABASE_URL ||= process.env.TEST_DATABASE_URL || 'postgresql://apple@127.0.0.1:5432/orbitox_phase2';
process.env.APP_DATABASE_URL ||= 'postgresql://orbitox_runtime:test_runtime_pass@127.0.0.1:5432/orbitox_phase2';
process.env.PLATFORM_ADMIN_AUDIT_DATABASE_URL ||= process.env.DATABASE_URL;
process.env.OUTBOX_RELAY_DATABASE_URL ||= process.env.DATABASE_URL;
process.env.ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY ||= crypto.randomBytes(32).toString('base64');

const maintenanceUrl =
  process.env.MAINTENANCE_DATABASE_URL ||
  'postgresql://orbitox_maintenance:test_maint_pass@127.0.0.1:5432/orbitox_phase2';
const maintenancePrisma = new PrismaClient({
  datasources: { db: { url: maintenanceUrl } },
});

describe('Stage 4: End-to-End Customer Restaurant Provisioning & Working Preview', () => {
  let verifiedOwner: any;
  let ownerSession: { sessionToken: string; csrfToken: string };
  let testOrg: any;
  let createdProjectSlug: string;

  before(async () => {
    const salt = crypto.randomBytes(3).toString('hex');
    verifiedOwner = await prisma.customerUser.create({
      data: {
        email: `e2e.owner.${salt}@orbitox.test`,
        passwordHash: 'argon2id$v=19$m=65536,t=3,p=4$fakehash',
        name: 'Sanjay Shah',
        emailVerifiedAt: new Date(),
      },
    });
    ownerSession = await createCustomerSessionForUser(verifiedOwner.id, { ipAddress: '127.0.0.1' });

    testOrg = await prisma.platformOrganization.create({
      data: {
        name: `Shah Hospitality Group ${salt}`,
        slug: `shah-hosp-${salt}`,
        billingEmail: verifiedOwner.email,
        businessCategory: 'RESTAURANTS_CAFES',
        city: 'Bengaluru',
        gstin: '29ABCDE1234F1Z5',
      },
    });

    await prisma.customerMembership.create({
      data: {
        organizationId: testOrg.id,
        userId: verifiedOwner.id,
        role: 'OWNER',
      },
    });
  });

  after(async () => {
    if (createdProjectSlug) {
      const proj = await prisma.platformProject.findUnique({
        where: { slug: createdProjectSlug },
        select: { id: true },
      });
      if (proj) {
        const envs = await prisma.projectEnvironment.findMany({
          where: { projectId: proj.id },
          select: { id: true },
        });
        const envIds = envs.map((e) => e.id);
        if (envIds.length > 0) {
          await prisma.platformApiKey.deleteMany({
            where: { environmentId: { in: envIds } },
          }).catch(() => { });
        }
        await prisma.pluginInstallation.deleteMany({
          where: { tenantId: { contains: proj.id } },
        }).catch(() => { });
        await prisma.projectEnvironment.deleteMany({
          where: { projectId: proj.id },
        }).catch(() => { });
        await prisma.platformProject.deleteMany({
          where: { id: proj.id },
        }).catch(() => { });
      }
    }
    if (testOrg?.id) {
      try {
        await maintenancePrisma.$queryRaw`SELECT public.close_customer_organization(${testOrg.id})`;
      } catch (err) {
        console.error('Failed to close org in e2e provisioning test:', err);
      }
    }
    if (verifiedOwner?.id) {
      await prisma.customerSession.deleteMany({ where: { userId: verifiedOwner.id } });
      await prisma.customerUser.deleteMany({ where: { id: verifiedOwner.id } });
    }
    await Promise.all([prisma.$disconnect(), maintenancePrisma.$disconnect()]);
  });

  it('provisions a real restaurant tenant through customer API and produces F4 preview', async () => {
    const salt = crypto.randomBytes(3).toString('hex');
    createdProjectSlug = `masala-bay-${salt}`;
    const idempotencyKey = crypto.randomUUID();

    const payload = {
      name: 'Masala Bay Bistro',
      slug: createdProjectSlug,
      plugins: [
        {
          id: 'restaurant-os',
          plan: 'restaurant-starter',
          config: {
            restaurantName: 'Masala Bay Bistro',
            city: 'Bengaluru',
            firstBranchArea: 'Indiranagar 100ft Road',
            restaurantType: 'Casual dining',
            tableCount: 14,
            menuSource: 'sample',
            templateId: 'saffron',
            gstin: '29ABCDE1234F1Z5',
            ownerName: 'Sanjay Shah',
            ownerEmail: verifiedOwner.email,
          },
        },
      ],
    };

    const postReq = new NextRequest(
      `http://localhost:3005/api/v1/customer/organizations/${testOrg.id}/tenants`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: 'http://localhost:3005',
          'x-csrf-token': ownerSession.csrfToken,
          'idempotency-key': idempotencyKey,
          Cookie: `${CUSTOMER_SESSION_COOKIE}=${ownerSession.sessionToken}; ${CUSTOMER_CSRF_COOKIE}=${ownerSession.csrfToken}`,
        },
        body: JSON.stringify(payload),
      },
    );

    const postRes = await createTenantPOST(postReq, {
      params: Promise.resolve({ organizationId: testOrg.id }),
    });

    assert.equal(postRes.status, 202, 'Provisioning should return 202 Accepted');
    const postJson = await postRes.json();
    assert.equal(postJson.ok, true);
    assert.ok(postJson.operation);
    assert.ok(postJson.operation.id);
    assert.ok(postJson.operation.tenantId);

    // Verify Project in Platform DB
    const projectInDb = await prisma.platformProject.findUnique({
      where: { slug: createdProjectSlug },
      include: { environments: true },
    });
    assert.ok(projectInDb, 'Project must be persisted in Platform DB');
    assert.equal(projectInDb.name, 'Masala Bay Bistro');
    assert.equal(projectInDb.organizationId, testOrg.id);
    assert.ok(projectInDb.environments.length > 0, 'Production environment must exist');

    // Verify Preview Summary endpoint
    const previewReq = new NextRequest(
      `http://localhost:3005/api/v1/customer/tenants/${createdProjectSlug}/preview-summary`,
      {
        method: 'GET',
        headers: {
          Cookie: `${CUSTOMER_SESSION_COOKIE}=${ownerSession.sessionToken}`,
        },
      },
    );

    const previewRes = await getPreviewSummaryGET(previewReq, {
      params: Promise.resolve({ tenantId: createdProjectSlug }),
    });

    assert.equal(previewRes.status, 200, 'Preview summary must return 200 OK');
    const previewJson = await previewRes.json();
    assert.equal(previewJson.ok, true);
    assert.equal(previewJson.preview.restaurant.name, 'Masala Bay Bistro');
    assert.equal(previewJson.preview.restaurant.slug, createdProjectSlug);
    assert.equal(previewJson.preview.checklist.accountVerified, true);
    assert.equal(previewJson.preview.checklist.organizationCreated, true);
    assert.equal(previewJson.preview.checklist.restaurantProvisioned, true);
    assert.equal(previewJson.preview.checklist.previewActive, true);
    assert.ok(previewJson.preview.tables.sampleTable);
    assert.ok(previewJson.preview.actions.dinerPreviewUrl);
  });
});
