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
  console.log(' 🪐 Stage 7F: C5 Data Rights Verification Suite');
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

  let createdDeletionId = '';
  let createdExportId = '';

  try {
    // 1. Anonymous Access Rejection
    console.log('--- 1. Testing Anonymous Access Rejection ---');
    const anonSummary = await fetch(`${BASE_URL}/api/v1/platform/data-rights`);
    assert.strictEqual(anonSummary.status, 401, 'Anonymous GET /data-rights must return 401');
    console.log('PASS  Anonymous access to /data-rights refused with HTTP 401');

    const anonCreate = await fetch(`${BASE_URL}/api/v1/platform/data-rights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'ORGANIZATION_DELETION', organizationId: 'org_test', reason: 'Anonymous' }),
    });
    assert.strictEqual(anonCreate.status, 401, 'Anonymous POST /data-rights must return 401');
    console.log('PASS  Anonymous access to POST /data-rights refused with HTTP 401');

    const anonVerify = await fetch(`${BASE_URL}/api/v1/platform/data-rights/verify-cert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ certificate: {} }),
    });
    assert.strictEqual(anonVerify.status, 401, 'Anonymous POST /verify-cert must return 401');
    console.log('PASS  Anonymous access to POST /verify-cert refused with HTTP 401');

    // 2. Authenticated Summary & Requests
    console.log('\n--- 2. Testing Authenticated Summary & Requests ---');
    const summaryRes = await fetch(`${BASE_URL}/api/v1/platform/data-rights`, { headers });
    assert.strictEqual(summaryRes.status, 200, 'Authenticated GET /data-rights must return 200');
    const summaryData = await summaryRes.json();

    assert.ok(summaryData.summary, 'Response must contain summary object');
    assert.ok(summaryData.summary.cards.runningExport, 'Summary must contain runningExport card');
    assert.ok(summaryData.summary.cards.scheduledDeletion, 'Summary must contain scheduledDeletion card');
    assert.ok(summaryData.summary.cards.patientRequest, 'Summary must contain patientRequest card');
    assert.ok(summaryData.summary.sampleCertificate, 'Summary must contain canonical sample certificate');
    assert.ok(Array.isArray(summaryData.requests), 'Response must contain requests array');
    assert.ok(summaryData.requests.length >= 4, 'Must contain at least 4 data rights requests');
    console.log(
      `PASS  GET /data-rights returned 200 OK (${summaryData.requests.length} requests, sample cert algorithm: ${summaryData.summary.sampleCertificate.algorithm})`,
    );

    // 3. Cryptographic Certificate Verification
    console.log('\n--- 3. Testing Ed25519 Certificate Verification ---');
    const verifyValidRes = await fetch(`${BASE_URL}/api/v1/platform/data-rights/verify-cert`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ certificate: summaryData.summary.sampleCertificate }),
    });
    assert.strictEqual(verifyValidRes.status, 200);
    const verifyValidData = await verifyValidRes.json();
    assert.strictEqual(verifyValidData.valid, true, 'Sample certificate signature must be cryptographically valid');
    assert.strictEqual(verifyValidData.algorithm, 'Ed25519');
    console.log('PASS  POST /verify-cert validated authentic Ed25519 signature successfully');

    // Tampered certificate verification
    const tamperedCert = JSON.parse(JSON.stringify(summaryData.summary.sampleCertificate));
    tamperedCert.payload.totalRowsDeleted += 1000; // 1-byte payload modification
    const verifyTamperedRes = await fetch(`${BASE_URL}/api/v1/platform/data-rights/verify-cert`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ certificate: tamperedCert }),
    });
    assert.strictEqual(verifyTamperedRes.status, 200);
    const verifyTamperedData = await verifyTamperedRes.json();
    assert.strictEqual(verifyTamperedData.valid, false, 'Tampered certificate must fail verification');
    console.log('PASS  POST /verify-cert rejected tampered certificate with invalid signature');

    // 4. Create Requests & Guardrail Enforcement
    console.log('\n--- 4. Testing Create Data Rights Requests ---');
    const shortReasonRes = await fetch(`${BASE_URL}/api/v1/platform/data-rights`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: 'ORGANIZATION_DELETION',
        organizationId: 'org_test_suite',
        reason: 'bad', // < 5 chars
      }),
    });
    assert.strictEqual(shortReasonRes.status, 400, 'Reason < 5 chars must return 400');
    console.log('PASS  POST /data-rights rejected short reason (<5 chars) with HTTP 400');

    // Schedule deletion
    const createDelRes = await fetch(`${BASE_URL}/api/v1/platform/data-rights`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: 'ORGANIZATION_DELETION',
        organizationId: 'org_test_suite',
        reason: 'Authorized customer off-boarding under DSR-2026',
      }),
    });
    if (createDelRes.status !== 201) {
      const err = await createDelRes.text();
      console.error('createDelRes failed:', createDelRes.status, err);
    }
    assert.strictEqual(createDelRes.status, 201);
    const createDelData = await createDelRes.json();
    assert.ok(createDelData.id);
    assert.strictEqual(createDelData.status, 'SCHEDULED');
    createdDeletionId = createDelData.id;
    console.log(`PASS  POST /data-rights scheduled organization deletion (ID: ${createdDeletionId})`);

    // Create export
    const createExpRes = await fetch(`${BASE_URL}/api/v1/platform/data-rights`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: 'ORGANIZATION_EXPORT',
        organizationId: 'org_test_suite',
        reason: 'GDPR Article 20 data portability archive export',
      }),
    });
    assert.strictEqual(createExpRes.status, 201);
    const createExpData = await createExpRes.json();
    assert.ok(createExpData.id);
    assert.strictEqual(createExpData.status, 'RUNNING');
    createdExportId = createExpData.id;
    console.log(`PASS  POST /data-rights initiated organization export job (ID: ${createdExportId})`);

    // 5. Cancel Scheduled Request
    console.log('\n--- 5. Testing Cancel Request ---');
    const cancelShortRes = await fetch(`${BASE_URL}/api/v1/platform/data-rights/${createdExportId}/cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: 'no' }),
    });
    assert.strictEqual(cancelShortRes.status, 400, 'Cancel reason < 5 chars must return 400');
    console.log('PASS  POST /cancel rejected short reason with HTTP 400');

    const cancelRes = await fetch(`${BASE_URL}/api/v1/platform/data-rights/${createdExportId}/cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: 'Operator cancelled export job per customer request' }),
    });
    assert.strictEqual(cancelRes.status, 200);
    const cancelData = await cancelRes.json();
    assert.strictEqual(cancelData.status, 'CANCELLED');
    console.log('PASS  POST /cancel transitioned export job to CANCELLED state with audit record');

    // 6. Dangerous Action: Hard Purge & Certificate Generation
    console.log('\n--- 6. Testing Dangerous Action: Hard Purge ---');
    const purgeShortRes = await fetch(`${BASE_URL}/api/v1/platform/data-rights/${createdDeletionId}/purge`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: 'err' }),
    });
    assert.strictEqual(purgeShortRes.status, 400, 'Purge reason < 5 chars must return 400');
    console.log('PASS  POST /purge rejected short reason with HTTP 400');

    const purgeRes = await fetch(`${BASE_URL}/api/v1/platform/data-rights/${createdDeletionId}/purge`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: 'Immediate hard purge executed after customer confirmation' }),
    });
    assert.strictEqual(purgeRes.status, 200);
    const purgeData = await purgeRes.json();
    assert.strictEqual(purgeData.status, 'COMPLETED');
    assert.ok(purgeData.certificate, 'Purge response must contain signed Ed25519 certificate');
    assert.strictEqual(purgeData.certificate.algorithm, 'Ed25519');
    console.log('PASS  POST /purge executed hard purge and generated valid Ed25519 deletion certificate');

    // Verify generated certificate
    const verifyGenRes = await fetch(`${BASE_URL}/api/v1/platform/data-rights/verify-cert`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ certificate: purgeData.certificate }),
    });
    assert.strictEqual(verifyGenRes.status, 200);
    const verifyGenData = await verifyGenRes.json();
    assert.strictEqual(verifyGenData.valid, true, 'Generated certificate must be cryptographically valid');
    console.log('PASS  Cryptographic verification confirmed validity of freshly generated deletion certificate');

    // 7. Certificate Download Endpoint
    console.log('\n--- 7. Testing Certificate Download ---');
    const certDlRes = await fetch(`${BASE_URL}/api/v1/platform/data-rights/${createdDeletionId}/certificate`, {
      headers,
    });
    assert.strictEqual(certDlRes.status, 200);
    assert.ok(
      certDlRes.headers.get('content-disposition')?.includes('attachment'),
      'Content-Disposition must be attachment',
    );
    const certDlJson = await certDlRes.json();
    assert.strictEqual(certDlJson.algorithm, 'Ed25519');
    console.log('PASS  GET /certificate returned downloadable JSON certificate');

    console.log('\n===============================================================');
    console.log(' SUMMARY: All C5 Data Rights endpoints and invariants PASS');
    console.log(' Verified zero-trust refusal, summary, Ed25519 verification,');
    console.log(' create, cancel, dangerous hard purge, and certificate download.');
    console.log('===============================================================\n');
  } finally {
    // Cleanup
    if (createdDeletionId) {
      await prisma.organizationDeletionRequest.deleteMany({ where: { id: createdDeletionId } }).catch(() => {});
      console.log(`INFO  Cleaned up test deletion request ${createdDeletionId}`);
    }
    if (createdExportId) {
      await prisma.dataRightsJob.deleteMany({ where: { id: createdExportId } }).catch(() => {});
      console.log(`INFO  Cleaned up test export job ${createdExportId}`);
    }
    if (testSession?.operatorId) {
      await deleteTestOperatorSession(prisma, testSession.operatorId);
      console.log('INFO  Cleaned up test operator session from PostgreSQL');
    }
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error('\nFAIL C5 Data Rights Suite encountered an unhandled error:', err);
  process.exit(1);
});
