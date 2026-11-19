import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.ORBITOX_MFA_ENCRYPTION_KEY ||= crypto.randomBytes(32).toString('base64');

import { PrismaClient } from '@prisma/client';
import {
  createTestOperatorSession,
  deleteTestOperatorSession,
  type TestOperatorSession,
} from './test-operator-session';

const BASE_URL = (process.env.ORBITOX_URL || 'http://localhost:3005').replace(/\/$/, '');

async function run() {
  console.log('===============================================================');
  console.log(' 🪐 Stage 7F: C4 Provisioning Operations Verification Suite');
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
  let testOperationId = '';
  let cancellableOpId = '';
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

  try {
    // 1. Anonymous Access Rejection
    console.log('--- 1. Testing Anonymous Access Rejection ---');
    const anonSummary = await fetch(`${BASE_URL}/api/v1/platform/operations`);
    assert.strictEqual(anonSummary.status, 401, 'Anonymous GET /operations must return 401');
    console.log('PASS  Anonymous access to /operations refused with HTTP 401');

    const anonDetail = await fetch(`${BASE_URL}/api/v1/platform/operations/op_unknown`);
    assert.strictEqual(anonDetail.status, 401, 'Anonymous GET /operations/:id must return 401');
    console.log('PASS  Anonymous access to /operations/:id refused with HTTP 401\n');

    // 2. Fetch Organizations & Initiate New Tenant Saga
    console.log('--- 2. Testing Wizard: New Tenant Provisioning Saga ---');
    const org = await prisma.platformOrganization.findFirst({
      select: { id: true, name: true },
    });
    assert.ok(org, 'Database must have at least one organization');
    const testOrgId = org.id;

    const testSlug = `wiz-clinic-${Date.now()}`;
    const wizardRes = await fetch(`${BASE_URL}/api/v1/platform/operations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        organizationId: testOrgId,
        name: `Wizard Test Clinic ${Date.now()}`,
        slug: testSlug,
        region: 'ap-south-1',
        environment: 'production',
        plugins: [{ id: 'hospital-os', plan: 'hms-starter' }],
      }),
    });
    assert.strictEqual(wizardRes.status, 202, `Expected 202 Accepted, got ${wizardRes.status}`);
    const wizardData = await wizardRes.json();
    assert.strictEqual(wizardData.success, true);
    assert.ok(wizardData.data.id.startsWith('op_'), 'Expected op_ prefix');
    assert.strictEqual(wizardData.data.totalSteps, 7, 'Expected 7 saga steps');
    testOperationId = wizardData.data.id;
    console.log(`PASS  POST /operations initiated new tenant saga (ID: ${testOperationId})\n`);

    // 3. Authenticated Summary & Listing
    console.log('--- 3. Testing Authenticated Summary & Listing ---');
    const listRes = await fetch(`${BASE_URL}/api/v1/platform/operations`, { headers });
    assert.strictEqual(listRes.status, 200, `Expected 200, got ${listRes.status}`);
    const listData = await listRes.json();
    assert.strictEqual(listData.success, true);
    assert.ok(listData.data.summary, 'Expected summary object');
    assert.ok(Array.isArray(listData.data.operations), 'Expected operations array');
    assert.ok(listData.data.operations.length > 0, 'Expected non-empty operations array');
    console.log(`PASS  GET /operations returned 200 OK (${listData.data.operations.length} operations, ${listData.data.summary.activeCount} active sagas)`);

    // Filter by query (slug)
    const searchRes = await fetch(`${BASE_URL}/api/v1/platform/operations?query=${testSlug}`, { headers });
    assert.strictEqual(searchRes.status, 200);
    const searchData = await searchRes.json();
    assert.strictEqual(searchData.success, true);
    assert.ok(searchData.data.operations.some((o: any) => o.id === testOperationId), 'Search by slug must include created test operation');
    console.log('PASS  Operations search filter verified\n');

    // 4. Operation Detail & 7 Steps
    console.log('--- 4. Testing Operation Detail Inspection ---');
    const detailRes = await fetch(`${BASE_URL}/api/v1/platform/operations/${testOperationId}`, { headers });
    assert.strictEqual(detailRes.status, 200, `Expected 200, got ${detailRes.status}`);
    const detailData = await detailRes.json();
    assert.strictEqual(detailData.success, true);
    assert.strictEqual(detailData.data.id, testOperationId);
    assert.strictEqual(detailData.data.steps.length, 7, 'Expected 7 saga steps');
    console.log(`PASS  GET /operations/${testOperationId} returned full 7-step diagnostics\n`);

    // Create an in-flight operation explicitly in PROVISIONING state to verify Cancel & Retry lifecycles
    const cancelSlug = `cancel-slug-${Date.now()}`;
    cancellableOpId = `op_cancel_test_${Date.now()}`;
    await prisma.platformOperation.create({
      data: {
        id: cancellableOpId,
        type: 'TENANT_PROVISION',
        tenantId: `org/${testOrgId}/project/test_proj/environment/test_env`,
        organizationId: testOrgId,
        status: 'PROVISIONING',
        steps: [
          { id: '1', name: 'Create DNS Record', status: 'COMPLETED', durationMs: 120 },
          { id: '2', name: 'Initialize Tenant Schema', status: 'PENDING' },
          { id: '3', name: 'Seed Base Configuration', status: 'PENDING' },
          { id: '4', name: 'Issue Tenant API Keys', status: 'PENDING' },
          { id: '5', name: 'Provision TLS Certificate', status: 'PENDING' },
          { id: '6', name: 'Register Health Checks', status: 'PENDING' },
          { id: '7', name: 'Activate Routing Table', status: 'PENDING' },
        ],
        request: {
          name: 'Cancellable Test Clinic',
          slug: cancelSlug,
          environment: 'production',
          plugins: [{ id: 'hospital-os', plan: 'hms-starter', planTier: 'STARTER' }],
        },
      },
    });

    // 5. Negative Control: Reason Length
    console.log('--- 5. Testing Negative Guardrails: Reason Length ---');
    const rejectShortReason = await fetch(`${BASE_URL}/api/v1/platform/operations/${cancellableOpId}/cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: 'no' }), // only 2 chars
    });
    assert.strictEqual(rejectShortReason.status, 400, 'Expected 400 for short reason');
    const shortReasonBody = await rejectShortReason.json();
    assert.strictEqual(shortReasonBody.success, false);
    assert.ok(shortReasonBody.error.message.includes('REASON_TOO_SHORT'));
    console.log('PASS  POST /cancel rejected 2-character reason with HTTP 400\n');

    // 6. Positive Dangerous Action: Cancel Operation
    console.log('--- 6. Testing Positive Dangerous Action: Cancel Operation ---');
    const cancelRes = await fetch(`${BASE_URL}/api/v1/platform/operations/${cancellableOpId}/cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: 'Operator test cancellation with compensation' }),
    });
    assert.strictEqual(cancelRes.status, 200, `Expected 200, got ${cancelRes.status}`);
    const cancelData = await cancelRes.json();
    assert.strictEqual(cancelData.success, true);
    assert.strictEqual(cancelData.data.status, 'CANCELLED');
    console.log('PASS  POST /cancel marked operation CANCELLED and executed compensation\n');

    // 7. Retry Operation
    console.log('--- 7. Testing Operation Retry ---');
    const retryRes = await fetch(`${BASE_URL}/api/v1/platform/operations/${cancellableOpId}/retry`, {
      method: 'POST',
      headers,
    });
    const retryData = await retryRes.json();
    assert.strictEqual(retryRes.status, 200, `Expected 200, got ${retryRes.status}`);
    assert.strictEqual(retryData.success, true);
    console.log('PASS  POST /retry re-enqueued cancelled operation successfully\n');

    console.log('===============================================================');
    console.log(' SUMMARY: All C4 Provisioning endpoints and invariants PASS');
    console.log(' Verified zero-trust refusal, summary, 7-step diagnostics,');
    console.log(' cancel dangerous action, retry, and wizard provisioning.');
    console.log('===============================================================\n');
  } finally {
    try {
      const idsToDelete = [testOperationId, cancellableOpId].filter(Boolean);
      if (idsToDelete.length > 0) {
        await prisma.platformOperation.deleteMany({ where: { id: { in: idsToDelete } } });
      }
    } catch {}
    if (testSession) {
      await deleteTestOperatorSession(prisma, testSession.operatorId);
      console.log('INFO  Cleaned up test operator session from PostgreSQL');
    }
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error('\nFAIL C4 Provisioning Suite encountered an unhandled error:', err);
  process.exit(1);
});
