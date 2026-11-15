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
  console.log(' 🪐 Stage 7F: Tenant CRUD & Lifecycle Verification Suite');
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

  const sessionCookie =
    testSession?.cookie ||
    'orbitox_operator_session=session_e2e_operator_token; orbitox_operator_csrf=csrf_e2e_token';
  const csrfToken = sessionCookie.match(/orbitox_operator_csrf=([^;]+)/)?.[1] || '';
  const headers = {
    cookie: sessionCookie,
    'x-csrf-token': csrfToken,
    origin: BASE_URL,
    'Content-Type': 'application/json',
  };

  // Create an ephemeral test project for CRUD testing
  const testOrg = await prisma.platformOrganization.findFirst();
  assert.ok(testOrg, 'Must have at least one test organization');

  const testProjectSlug = `test-tenant-${Date.now()}`;
  const testProject = await prisma.platformProject.create({
    data: {
      slug: testProjectSlug,
      name: 'Temporary E2E Test Tenant',
      organizationId: testOrg.id,
      businessModel: 'HEALTHCARE_NETWORK',
      planTier: 'growth',
      plan: 'growth',
      status: 'ACTIVE',
      technicalLead: 'Lead Dev',
      contactEmail: 'dev@test.invalid',
    },
  });

  console.log(`Created test tenant ${testProject.id} (${testProject.slug})`);

  try {
    // 1. Fetch Tenant Detail
    console.log('--- 1. Testing Get Tenant Detail ---');
    const getRes = await fetch(`${BASE_URL}/api/v1/platform/tenants/${testProject.id}`, { headers });
    assert.strictEqual(getRes.status, 200, 'GET /tenants/:id must return 200');
    const getJson = await getRes.json();
    assert.strictEqual(getJson.success, true);
    assert.strictEqual(getJson.data.id, testProject.id);
    console.log(`PASS  GET /tenants/${testProject.id} returned tenant detail`);

    // 2. Edit Tenant Attributes (PATCH)
    console.log('\n--- 2. Testing Edit Tenant Attributes (PATCH) ---');
    const patchRes = await fetch(`${BASE_URL}/api/v1/platform/tenants/${testProject.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        name: 'Updated E2E Test Tenant Name',
        planTier: 'pro',
        customDomain: 'test.custom.domain.com',
      }),
    });
    assert.strictEqual(patchRes.status, 200, 'PATCH /tenants/:id must return 200');
    const patchJson = await patchRes.json();
    assert.strictEqual(patchJson.success, true);

    const recheckProject = await prisma.platformProject.findUnique({ where: { id: testProject.id } });
    assert.strictEqual(recheckProject?.name, 'Updated E2E Test Tenant Name');
    assert.strictEqual(recheckProject?.planTier, 'pro');
    assert.strictEqual(recheckProject?.customDomain, 'test.custom.domain.com');
    console.log('PASS  PATCH /tenants/:id updated name, planTier, and customDomain');

    // 3. Suspend and Resume Tenant
    console.log('\n--- 3. Testing Suspend and Resume Lifecycle ---');
    const suspendRes = await fetch(`${BASE_URL}/api/v1/platform/tenants/${testProject.id}/suspend`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: 'Commercial testing suspension' }),
    });
    assert.strictEqual(suspendRes.status, 200, 'POST /suspend must return 200');
    const suspendJson = await suspendRes.json();
    assert.strictEqual(suspendJson.data?.status, 'SUSPENDED');
    console.log('PASS  POST /suspend set tenant to SUSPENDED');

    const resumeRes = await fetch(`${BASE_URL}/api/v1/platform/tenants/${testProject.id}/resume`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: 'Manual reactivation' }),
    });
    assert.strictEqual(resumeRes.status, 200, 'POST /resume must return 200');
    const resumeJson = await resumeRes.json();
    assert.strictEqual(resumeJson.data?.status, 'ACTIVE');
    console.log('PASS  POST /resume restored tenant to ACTIVE');

    // 4. Delete / Decommission Tenant
    console.log('\n--- 4. Testing Dangerous Action: Decommission Tenant (DELETE) ---');
    // Short reason rejection
    const shortReasonRes = await fetch(`${BASE_URL}/api/v1/platform/tenants/${testProject.id}`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ reason: 'no' }),
    });
    assert.strictEqual(shortReasonRes.status, 400, 'DELETE with short reason must return 400');
    console.log('PASS  DELETE rejected short reason (<5 chars) with HTTP 400');

    // Successful decommission
    const deleteRes = await fetch(`${BASE_URL}/api/v1/platform/tenants/${testProject.id}`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ reason: 'Decommissioning test tenant environment' }),
    });
    assert.strictEqual(deleteRes.status, 200, 'DELETE /tenants/:id must return 200');
    const deleteJson = await deleteRes.json();
    assert.strictEqual(deleteJson.success, true);

    const deletedProject = await prisma.platformProject.findUnique({ where: { id: testProject.id } });
    assert.strictEqual(deletedProject, null, 'Tenant must be deleted from PostgreSQL');
    console.log('PASS  DELETE /tenants/:id decommissioned tenant and purged record');

    console.log('\n===============================================================');
    console.log(' SUMMARY: All Tenant CRUD & Lifecycle endpoints PASS');
    console.log(' Verified get, patch, suspend, resume, and decommission.');
    console.log('===============================================================\n');
  } finally {
    await prisma.platformProject.deleteMany({ where: { slug: testProjectSlug } }).catch(() => {});
    if (testSession) {
      await deleteTestOperatorSession(prisma, testSession.operatorId);
      console.log('INFO  Cleaned up test operator session from PostgreSQL');
    }
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error('Tenant CRUD Test Failed:', err);
  process.exit(1);
});

