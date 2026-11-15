import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { prisma } from '@/server/db/prisma';
import { GET, POST } from '@/app/api/v1/customer/organizations/route';
import {
  createCustomerSessionForUser,
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_CSRF_COOKIE,
} from '@/server/accounts/account-service';

const maintenanceUrl =
  process.env.MAINTENANCE_DATABASE_URL ||
  'postgresql://orbitox_maintenance:test_maint_pass@127.0.0.1:5432/orbitox_phase2';
const maintenancePrisma = new PrismaClient({
  datasources: { db: { url: maintenanceUrl } },
});

describe('Stage 2: Customer Organization Creation & Ownership', () => {
  process.env.DATABASE_URL ||= process.env.TEST_DATABASE_URL || 'postgresql://apple@127.0.0.1:5432/orbitox_phase2';
  process.env.ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY ||= crypto.randomBytes(32).toString('base64');

  let verifiedUser: { id: string; email: string };
  let unverifiedUser: { id: string; email: string };
  let verifiedSession: { sessionToken: string; csrfToken: string };
  let unverifiedSession: { sessionToken: string; csrfToken: string };

  before(async () => {
    const suffix = crypto.randomBytes(4).toString('hex');

    // 1. Create verified customer user
    verifiedUser = await prisma.customerUser.create({
      data: {
        name: 'Priya Org Owner',
        email: `priya_org_${suffix}@shahgroup.in`,
        phone: '+91 98450 11111',
        passwordHash: 'dummy_hash',
        emailVerifiedAt: new Date(),
        status: 'ACTIVE',
      },
      select: { id: true, email: true },
    });
    verifiedSession = await createCustomerSessionForUser(verifiedUser.id, { ipAddress: '127.0.0.1' });

    // 2. Create unverified customer user
    unverifiedUser = await prisma.customerUser.create({
      data: {
        name: 'Unverified User',
        email: `unverified_${suffix}@example.com`,
        passwordHash: 'dummy_hash',
        emailVerifiedAt: null,
        status: 'ACTIVE',
      },
      select: { id: true, email: true },
    });
    unverifiedSession = await createCustomerSessionForUser(unverifiedUser.id, { ipAddress: '127.0.0.1' });
  });

  after(async () => {
    // Clean up
    if (verifiedUser?.id) {
      const memberships = await prisma.customerMembership.findMany({
        where: { userId: verifiedUser.id },
        select: { organizationId: true },
      });
      for (const m of memberships) {
        try {
          await maintenancePrisma.$queryRaw`SELECT public.close_customer_organization(${m.organizationId})`;
        } catch (err) {
          console.error('Failed to close org:', err);
        }
      }
      await prisma.customerSession.deleteMany({ where: { userId: verifiedUser.id } });
      await prisma.customerUser.deleteMany({ where: { id: verifiedUser.id } });
    }
    if (unverifiedUser?.id) {
      await prisma.customerSession.deleteMany({ where: { userId: unverifiedUser.id } });
      await prisma.customerUser.deleteMany({ where: { id: unverifiedUser.id } });
    }
    await Promise.all([prisma.$disconnect(), maintenancePrisma.$disconnect()]);
  });

  function makePostRequest(
    body: any,
    session: { sessionToken: string; csrfToken: string },
    headers: Record<string, string> = {},
  ) {
    return new NextRequest('http://localhost:3005/api/v1/customer/organizations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin: 'http://localhost:3005',
        'x-csrf-token': session.csrfToken,
        Cookie: `${CUSTOMER_SESSION_COOKIE}=${session.sessionToken}; ${CUSTOMER_CSRF_COOKIE}=${session.csrfToken}`,
        ...headers,
      },
      body: JSON.stringify(body),
    });
  }

  function makeGetRequest(session: { sessionToken: string; csrfToken: string }) {
    return new NextRequest('http://localhost:3005/api/v1/customer/organizations', {
      method: 'GET',
      headers: {
        Cookie: `${CUSTOMER_SESSION_COOKIE}=${session.sessionToken}`,
      },
    });
  }

  it('refuses unverified customers from creating an organization', async () => {
    const req = makePostRequest({ name: 'Shah Hospitality Group' }, unverifiedSession);
    const res = await POST(req);
    assert.equal(res.status, 403);
    const json = await res.json();
    assert.equal(json.error, 'VERIFIED_EMAIL_REQUIRED');
  });

  it('validates organization name constraints (length between 2 and 120)', async () => {
    const reqTooShort = makePostRequest({ name: 'A' }, verifiedSession);
    const resTooShort = await POST(reqTooShort);
    assert.equal(resTooShort.status, 422);

    const reqEmpty = makePostRequest({ name: '   ' }, verifiedSession);
    const resEmpty = await POST(reqEmpty);
    assert.equal(resEmpty.status, 422);
  });

  it('validates Indian GSTIN format if provided', async () => {
    const reqBadGstin = makePostRequest(
      { name: 'Shah Hospitality', gstin: 'INVALID_GSTIN_123' },
      verifiedSession,
    );
    const resBadGstin = await POST(reqBadGstin);
    assert.equal(resBadGstin.status, 422);
    const json = await resBadGstin.json();
    assert.equal(json.error, 'INVALID_GSTIN');
  });

  it('creates an organization, assigns OWNER membership, and persists metadata', async () => {
    const orgName = `Shah Hospitality Group ${crypto.randomBytes(3).toString('hex')}`;
    const req = makePostRequest(
      {
        name: orgName,
        businessCategory: 'RESTAURANTS_CAFES',
        city: 'Bengaluru',
        gstin: '29ABCDE1234F1Z5',
      },
      verifiedSession,
    );

    const res = await POST(req);
    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.ok, true);
    assert.equal(json.organization.name, orgName);
    assert.equal(json.organization.businessCategory, 'RESTAURANTS_CAFES');
    assert.equal(json.organization.city, 'Bengaluru');
    assert.equal(json.organization.gstin, '29ABCDE1234F1Z5');
    assert.equal(json.organization.role, 'OWNER');
    assert.ok(json.organization.id);
    assert.ok(json.organization.slug);

    // Verify database records
    const orgInDb = await prisma.platformOrganization.findUnique({
      where: { id: json.organization.id },
    });
    assert.ok(orgInDb, 'Organization must exist in DB');
    assert.equal(orgInDb.city, 'Bengaluru');
    assert.equal(orgInDb.gstin, '29ABCDE1234F1Z5');
    assert.equal(orgInDb.businessCategory, 'RESTAURANTS_CAFES');

    // Verify membership record
    const membership = await prisma.customerMembership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: json.organization.id,
          userId: verifiedUser.id,
        },
      },
    });
    assert.ok(membership, 'Customer membership must exist in DB');
    assert.equal(membership.role, 'OWNER');

    // Verify GET /api/v1/customer/organizations lists this organization
    const getReq = makeGetRequest(verifiedSession);
    const getRes = await GET(getReq);
    assert.equal(getRes.status, 200);
    const getJson = await getRes.json();
    assert.equal(getJson.ok, true);
    assert.ok(
      getJson.organizations.some((o: any) => o.id === json.organization.id && o.role === 'OWNER'),
      'GET must include newly created organization with OWNER role',
    );
  });

  it('handles idempotent retries without duplicating organizations', async () => {
    const orgName = `Masala Hospitality ${crypto.randomBytes(3).toString('hex')}`;
    const idempotencyKey = crypto.randomUUID();

    const req1 = makePostRequest(
      { name: orgName, city: 'Bengaluru' },
      verifiedSession,
      { 'idempotency-key': idempotencyKey },
    );
    const res1 = await POST(req1);
    assert.equal(res1.status, 201);
    const json1 = await res1.json();

    const req2 = makePostRequest(
      { name: orgName, city: 'Bengaluru' },
      verifiedSession,
      { 'idempotency-key': idempotencyKey },
    );
    const res2 = await POST(req2);
    assert.equal(res2.status, 200);
    const json2 = await res2.json();
    assert.equal(json2.replayed, true);
    assert.equal(json2.organization.id, json1.organization.id);
  });
});
