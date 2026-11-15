import assert from 'node:assert/strict';

process.env.ORBITOX_MFA_ENCRYPTION_KEY ||= 'PLUh1i+W9CGug8MjeHHa5HHYjJtz7OI56fRktDhDcbM=';

import { PrismaClient } from '@prisma/client';
import {
  createTestOperatorSession,
  deleteTestOperatorSession,
  type TestOperatorSession,
} from './test-operator-session';

const BASE_URL = (process.env.ORBITOX_URL || 'http://localhost:3005').replace(/\/$/, '');

async function run() {
  console.log('===============================================================');
  console.log(' 🪐 Stage 7F: C1 Organizations Verification Suite');
  console.log(' Target Base URL:', BASE_URL);
  console.log('===============================================================\n');

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://apple@127.0.0.1:5432/orbitox_phase2',
      },
    },
  });

  let testSession: TestOperatorSession | null = null;
  try {
    testSession = await createTestOperatorSession(prisma);
  } catch (err: any) {
    console.warn('WARN: Could not create DB operator session, using simulated cookie:', err.message);
  }

  const sessionCookie = testSession?.cookie || 'orbitox_operator_session=session_e2e_operator_token; orbitox_operator_csrf=csrf_e2e_token';
  const csrfToken = sessionCookie.match(/orbitox_operator_csrf=([^;]+)/)?.[1] || '';
  const headers = {
    cookie: sessionCookie,
    'x-csrf-token': csrfToken,
    origin: BASE_URL,
    'Content-Type': 'application/json',
  };

  let createdOrgId = '';

  try {
    // 1. Anonymous Access Rejection
    console.log('--- 1. Testing Anonymous Access Rejection ---');
    const anonList = await fetch(`${BASE_URL}/api/v1/platform/organizations`);
    assert.strictEqual(anonList.status, 401, 'Anonymous GET /organizations must return 401');
    console.log('PASS  Anonymous access to /organizations refused with HTTP 401');

    const anonDetail = await fetch(`${BASE_URL}/api/v1/platform/organizations/org_unknown`);
    assert.strictEqual(anonDetail.status, 401, 'Anonymous GET /organizations/:id must return 401');
    console.log('PASS  Anonymous access to /organizations/:id refused with HTTP 401');

    const anonCreate = await fetch(`${BASE_URL}/api/v1/platform/organizations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacked', slug: 'hacked', billingEmail: 'a@b.com' }),
    });
    assert.strictEqual(anonCreate.status, 401, 'Anonymous POST /organizations must return 401');
    console.log('PASS  Anonymous access to POST /organizations refused with HTTP 401\n');

    // 2. Authenticated Summary & Listing
    console.log('--- 2. Testing Authenticated Summary & Listing ---');
    const listRes = await fetch(`${BASE_URL}/api/v1/platform/organizations`, { headers });
    assert.strictEqual(listRes.status, 200, `Expected 200, got ${listRes.status}`);
    const listData = await listRes.json();
    assert.strictEqual(listData.success, true);
    assert.ok(listData.data.summary, 'Expected summary object');
    assert.ok(typeof listData.data.summary.totalCount === 'number', 'Expected totalCount');
    assert.ok(Array.isArray(listData.data.organizations), 'Expected organizations array');
    assert.ok(listData.data.organizations.length > 0, 'Expected non-empty organizations');
    console.log(
      `PASS  GET /organizations returned 200 OK (${listData.data.organizations.length} orgs, ${listData.data.summary.enterpriseCount} enterprise, ${listData.data.summary.totalTenantsCount} tenants)`
    );

    // 3. Search & Filter
    console.log('--- 3. Testing Search & Filtering ---');
    const searchRes = await fetch(`${BASE_URL}/api/v1/platform/organizations?query=oasis`, { headers });
    assert.strictEqual(searchRes.status, 200);
    const searchData = await searchRes.json();
    assert.strictEqual(searchData.success, true);
    assert.ok(
      searchData.data.organizations.some((o: any) => o.slug.includes('oasis') || o.name.toLowerCase().includes('oasis')),
      'Search query "oasis" must match Oasis Healthcare Network'
    );
    console.log('PASS  Organization search by query verified\n');

    // 4. Detail View (C1 Specification)
    console.log('--- 4. Testing Organization Detail (C1 Specification) ---');
    const detailRes = await fetch(`${BASE_URL}/api/v1/platform/organizations/org_oasis_health`, { headers });
    assert.strictEqual(detailRes.status, 200, `Expected 200, got ${detailRes.status}`);
    const detailData = await detailRes.json();
    assert.strictEqual(detailData.success, true);
    assert.strictEqual(detailData.data.id, 'org_oasis_health');
    assert.ok(Array.isArray(detailData.data.tenants), 'Expected tenants array');
    assert.ok(detailData.data.tenants.length > 0, 'Expected at least 1 tenant in Oasis Healthcare Network');
    assert.ok(Array.isArray(detailData.data.members), 'Expected members array');
    assert.ok(detailData.data.monthlyRevenueEstimate > 0, 'Expected monthly revenue estimate');
    console.log(
      `PASS  GET /organizations/org_oasis_health returned full C1 detail (${detailData.data.tenants.length} tenants, ${detailData.data.members.length} members, ₹${detailData.data.monthlyRevenueEstimate}/mo)\n`
    );

    // 5. Create Organization
    console.log('--- 5. Testing Create Organization ---');
    const testSlug = `test-health-${Date.now()}`;
    const createRes = await fetch(`${BASE_URL}/api/v1/platform/organizations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: `Test Health Corp ${Date.now()}`,
        slug: testSlug,
        billingEmail: `billing-${Date.now()}@testhealth.in`,
        complianceTier: 'HIPAA',
      }),
    });
    assert.strictEqual(createRes.status, 201, `Expected 201, got ${createRes.status}`);
    const createData = await createRes.json();
    assert.strictEqual(createData.success, true);
    assert.strictEqual(createData.data.slug, testSlug);
    assert.strictEqual(createData.data.complianceTier, 'HIPAA');
    createdOrgId = createData.data.id;
    console.log(`PASS  POST /organizations created new organization (ID: ${createdOrgId})\n`);

    // Conflict control: duplicate slug
    const conflictRes = await fetch(`${BASE_URL}/api/v1/platform/organizations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Duplicate',
        slug: testSlug,
        billingEmail: 'dup@test.in',
      }),
    });
    assert.strictEqual(conflictRes.status, 409, 'Duplicate slug must return 409 Conflict');
    console.log('PASS  Duplicate slug rejected with HTTP 409 Conflict\n');

    // 6. Change Plan Tier
    console.log('--- 6. Testing Change Plan Tier ---');
    const planRes = await fetch(`${BASE_URL}/api/v1/platform/organizations/${createdOrgId}/plan`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ planTier: 'Enterprise' }),
    });
    assert.strictEqual(planRes.status, 200, `Expected 200, got ${planRes.status}`);
    const planData = await planRes.json();
    assert.strictEqual(planData.success, true);
    console.log('PASS  PUT /organizations/:id/plan updated organization plan tier to Enterprise\n');

    // 7. Dangerous Action: Suspend / Archive Organization
    console.log('--- 7. Testing Dangerous Action: Suspend Organization ---');
    // Negative: short reason
    const shortReasonRes = await fetch(`${BASE_URL}/api/v1/platform/organizations/${createdOrgId}/archive`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: 'bad' }), // < 5 chars
    });
    assert.strictEqual(shortReasonRes.status, 400, 'Expected 400 for short reason');
    console.log('PASS  POST /archive rejected 3-character reason with HTTP 400');

    // Positive: valid suspension
    const archiveRes = await fetch(`${BASE_URL}/api/v1/platform/organizations/${createdOrgId}/archive`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: 'Corporate compliance audit freeze' }),
    });
    assert.strictEqual(archiveRes.status, 200, `Expected 200, got ${archiveRes.status}`);
    const archiveData = await archiveRes.json();
    assert.strictEqual(archiveData.success, true);
    assert.strictEqual(archiveData.data.status, 'SUSPENDED');
    console.log('PASS  POST /archive suspended organization with audit trail\n');

    console.log('===============================================================');
    console.log(' SUMMARY: All C1 Organizations endpoints and invariants PASS');
    console.log(' Verified zero-trust refusal, summary, C1 detail specification,');
    console.log(' creation, duplicate conflict, plan change, and dangerous suspend.');
    console.log('===============================================================\n');
  } finally {
    // Cleanup created test org
    if (createdOrgId) {
      try {
        await prisma.platformProject.deleteMany({ where: { organizationId: createdOrgId } });
        await prisma.platformOrganization.delete({ where: { id: createdOrgId } });
        console.log(`INFO  Cleaned up test organization ${createdOrgId}`);
      } catch {}
    }

    if (testSession) {
      await deleteTestOperatorSession(prisma, testSession.operatorId);
      console.log('INFO  Cleaned up test operator session from PostgreSQL');
    }
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error('\nFAIL C1 Organizations Suite encountered an unhandled error:', err);
  process.exit(1);
});
