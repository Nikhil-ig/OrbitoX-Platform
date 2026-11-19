import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as http from 'node:http';
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { prisma } from '@/server/db/prisma';
import { GET } from '@/app/api/v1/customer/tenants/check-slug/route';
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

describe('Stage 3: Customer Subdomain Slug Availability Checker', () => {
  let verifiedUser: any;
  let unverifiedUser: any;
  let verifiedSession: { sessionToken: string; csrfToken: string };
  let unverifiedSession: { sessionToken: string; csrfToken: string };
  let testOrgId: string;
  let existingProjectSlug: string;
  let mockRuntimeServer: http.Server;

  before(async () => {
    const salt = crypto.randomBytes(3).toString('hex');
    verifiedUser = await prisma.customerUser.create({
      data: {
        email: `slugtest.verified.${salt}@orbitox.test`,
        passwordHash: 'argon2id$v=19$m=65536,t=3,p=4$fakehash',
        name: 'Slug Tester',
        emailVerifiedAt: new Date(),
      },
    });
    verifiedSession = await createCustomerSessionForUser(verifiedUser.id, { ipAddress: '127.0.0.1' });

    unverifiedUser = await prisma.customerUser.create({
      data: {
        email: `slugtest.unverified.${salt}@orbitox.test`,
        passwordHash: 'argon2id$v=19$m=65536,t=3,p=4$fakehash',
        name: 'Unverified Tester',
        emailVerifiedAt: null,
      },
    });
    unverifiedSession = await createCustomerSessionForUser(unverifiedUser.id, { ipAddress: '127.0.0.1' });

    // Create an organization and an existing project to test conflict & suggestions
    const testOrg = await prisma.platformOrganization.create({
      data: {
        name: `Slug Test Org ${salt}`,
        slug: `slug-test-org-${salt}`,
        billingEmail: verifiedUser.email,
        businessCategory: 'RESTAURANTS_CAFES',
      },
    });
    testOrgId = testOrg.id;
    await prisma.customerMembership.create({
      data: {
        organizationId: testOrg.id,
        userId: verifiedUser.id,
        role: 'OWNER',
      },
    });

    existingProjectSlug = `existing-cafe-${salt}`;
    await prisma.platformProject.create({
      data: {
        slug: existingProjectSlug,
        name: 'Existing Cafe',
        organizationId: testOrg.id,
        businessModel: 'O2O2B2B2C',
        planTier: 'starter',
        technicalLead: 'Tester',
        contactEmail: verifiedUser.email,
      },
    });

    // Spin up mock RestaurantOS runtime server to test live checks and fail-closed availability
    mockRuntimeServer = http.createServer((req, res) => {
      const url = new URL(req.url || '', 'http://127.0.0.1');
      const slug = decodeURIComponent(url.pathname.replace('/internal/tenants/', ''));
      if (slug === 'down-service') {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'INTERNAL_ERROR' }));
        return;
      }
      if (slug === existingProjectSlug || slug === 'taken-tenant') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ tenant: { slug } }));
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
    if (existingProjectSlug) {
      await prisma.platformProject.deleteMany({ where: { slug: existingProjectSlug } });
    }
    if (testOrgId) {
      try {
        await maintenancePrisma.$queryRaw`SELECT public.close_customer_organization(${testOrgId})`;
      } catch (err) {
        console.error('Failed to close org in slug test:', err);
      }
    }
    if (verifiedUser?.id) {
      await prisma.customerSession.deleteMany({ where: { userId: verifiedUser.id } });
      await prisma.customerUser.deleteMany({ where: { id: verifiedUser.id } });
    }
    if (unverifiedUser?.id) {
      await prisma.customerSession.deleteMany({ where: { userId: unverifiedUser.id } });
      await prisma.customerUser.deleteMany({ where: { id: unverifiedUser.id } });
    }
    await Promise.all([prisma.$disconnect(), maintenancePrisma.$disconnect()]);
  });

  function makeGetRequest(slug: string, session?: { sessionToken: string }) {
    const headers: Record<string, string> = {};
    if (session) {
      headers.Cookie = `${CUSTOMER_SESSION_COOKIE}=${session.sessionToken}`;
    }
    return new NextRequest(
      `http://localhost:3005/api/v1/customer/tenants/check-slug?slug=${encodeURIComponent(slug)}`,
      { method: 'GET', headers },
    );
  }

  it('rejects unauthenticated requests with 401', async () => {
    const req = makeGetRequest('test-bistro');
    const res = await GET(req);
    assert.equal(res.status, 401);
  });

  it('rejects unverified customers with 403', async () => {
    const req = makeGetRequest('test-bistro', unverifiedSession);
    const res = await GET(req);
    assert.equal(res.status, 403);
    const json = await res.json();
    assert.equal(json.error, 'VERIFIED_EMAIL_REQUIRED');
  });

  it('rejects reserved keywords with clear reason', async () => {
    for (const reserved of ['admin', 'api', 'platform', 'orbitox', 'billing']) {
      const req = makeGetRequest(reserved, verifiedSession);
      const res = await GET(req);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.ok, true);
      assert.equal(json.available, false);
      assert.match(json.reason, /reserved system keyword/i);
    }
  });

  it('rejects invalid syntax (length, hyphens, special chars)', async () => {
    const invalidCases = [
      { slug: 'a', reason: /at least 3 characters/i },
      { slug: 'a'.repeat(35), reason: /cannot exceed 32 characters/i },
      { slug: 'my--bistro', reason: /consecutive hyphens/i },
    ];

    for (const tc of invalidCases) {
      const req = makeGetRequest(tc.slug, verifiedSession);
      const res = await GET(req);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.ok, true);
      assert.equal(json.available, false);
      assert.match(json.reason, tc.reason);
    }
  });

  it('detects existing project slug collision and returns alternative suggestions', async () => {
    const req = makeGetRequest(existingProjectSlug, verifiedSession);
    const res = await GET(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.ok, true);
    assert.equal(json.available, false);
    assert.match(json.reason, /already taken/i);
    assert.ok(Array.isArray(json.suggestions), 'Suggestions array should be returned');
    assert.ok(json.suggestions.length > 0, 'At least one suggestion returned');
  });

  it('confirms availability for a valid unique slug', async () => {
    const uniqueSlug = `masala-fusion-${crypto.randomBytes(4).toString('hex')}`;
    const req = makeGetRequest(uniqueSlug, verifiedSession);
    const res = await GET(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.ok, true);
    assert.equal(json.available, true);
    assert.equal(json.slug, uniqueSlug);
    assert.equal(json.url, `${uniqueSlug}.orbitox.io`);
  });

  it('fails closed with 503 SERVICE_UNAVAILABLE when runtime returns error or is unreachable', async () => {
    const req = makeGetRequest('down-service', verifiedSession);
    const res = await GET(req);
    assert.equal(res.status, 503);
    const json = await res.json();
    assert.equal(json.ok, false);
    assert.equal(json.error, 'SERVICE_UNAVAILABLE');
    assert.match(json.reason, /Unable to authoritatively verify subdomain availability/i);
  });
});
