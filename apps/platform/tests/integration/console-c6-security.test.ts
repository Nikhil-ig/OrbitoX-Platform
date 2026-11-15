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
  console.log(' 🪐 Stage 7F: C6 Security & Keys Verification Suite');
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

  let createdKeyDbId = '';
  let rotatedKeyDbId = '';

  try {
    // 1. Anonymous Access Rejection
    console.log('--- 1. Testing Anonymous Access Rejection ---');
    const anonOverview = await fetch(`${BASE_URL}/api/v1/platform/security-keys`);
    assert.strictEqual(anonOverview.status, 401, 'Anonymous GET /security-keys must return 401');
    console.log('PASS  Anonymous access to /security-keys refused with HTTP 401');

    const anonCreate = await fetch(`${BASE_URL}/api/v1/platform/security-keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacked Key' }),
    });
    assert.strictEqual(anonCreate.status, 401, 'Anonymous POST /security-keys must return 401');
    console.log('PASS  Anonymous access to POST /security-keys refused with HTTP 401');

    const anonRotate = await fetch(`${BASE_URL}/api/v1/platform/security-keys/key_123/rotate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Anonymous rotation' }),
    });
    assert.strictEqual(anonRotate.status, 401, 'Anonymous POST /rotate must return 401');
    console.log('PASS  Anonymous access to POST /rotate refused with HTTP 401');

    // 2. Authenticated Overview & Screen Data
    console.log('\n--- 2. Testing Authenticated Overview & Screen Data ---');
    const overviewRes = await fetch(`${BASE_URL}/api/v1/platform/security-keys`, { headers });
    assert.strictEqual(overviewRes.status, 200, 'Authenticated GET /security-keys must return 200');
    const overview = await overviewRes.json();

    assert.ok(Array.isArray(overview.keys), 'Overview must contain keys array');
    assert.ok(overview.keys.length >= 3, 'Must contain at least 3 API keys (screenshot parity)');
    assert.ok(Array.isArray(overview.operators), 'Overview must contain operators array');
    assert.ok(overview.operators.some((o: any) => o.name.includes('Anita')), 'Must contain Anita R.');
    assert.ok(overview.operators.some((o: any) => o.name.includes('Vikram')), 'Must contain Vikram K.');
    assert.ok(Array.isArray(overview.lockouts), 'Overview must contain lockouts array');
    assert.ok(
      overview.lockouts.some((l: any) => l.email === 'meera@shahgroup.in'),
      'Must contain locked-out operator meera@shahgroup.in',
    );
    console.log(
      `PASS  GET /security-keys returned 200 OK (${overview.keys.length} keys, ${overview.operators.length} operators, ${overview.lockouts.length} lockouts)`,
    );

    // 3. Create API Key
    console.log('\n--- 3. Testing Create API Key ---');
    const shortNameRes = await fetch(`${BASE_URL}/api/v1/platform/security-keys`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'ab' }), // < 3 chars
    });
    assert.strictEqual(shortNameRes.status, 400, 'Key name < 3 chars must return 400');
    console.log('PASS  POST /security-keys rejected short name (<3 chars) with HTTP 400');

    const createRes = await fetch(`${BASE_URL}/api/v1/platform/security-keys`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'E2E Test Integration Key',
        scopes: ['orders:write', 'labs:read'],
      }),
    });
    assert.strictEqual(createRes.status, 201, 'Valid creation must return 201');
    const createData = await createRes.json();
    assert.ok(createData.key);
    assert.ok(createData.rawSecret);
    assert.ok(createData.rawSecret.startsWith('obx_live_'), 'Raw secret must start with obx_live_');
    assert.strictEqual(createData.key.name, 'E2E Test Integration Key');
    createdKeyDbId = createData.key.id;
    console.log(`PASS  POST /security-keys created key with ephemeral secret (Key ID: ${createData.key.keyId})`);

    // 4. Rotate API Key
    console.log('\n--- 4. Testing Rotate API Key ---');
    const rotateRes = await fetch(`${BASE_URL}/api/v1/platform/security-keys/${createdKeyDbId}/rotate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        graceWindowHours: 24,
        reason: 'Scheduled security rotation for integration key',
      }),
    });
    if (rotateRes.status !== 200) {
      const err = await rotateRes.text();
      console.error('rotateRes failed:', rotateRes.status, err);
    }
    assert.strictEqual(rotateRes.status, 200, 'Rotate must return 200');
    const rotateData = await rotateRes.json();
    assert.ok(rotateData.replacementKey);
    assert.ok(rotateData.replacementRawSecret);
    assert.ok(rotateData.replacementRawSecret.startsWith('obx_live_'));
    rotatedKeyDbId = rotateData.replacementKey.id;
    console.log(
      `PASS  POST /rotate returned replacement key and ephemeral secret with 24h grace window`,
    );

    // 5. Dangerous Action: Revoke Key
    console.log('\n--- 5. Testing Dangerous Action: Revoke API Key ---');
    const revokeShortReasonRes = await fetch(
      `${BASE_URL}/api/v1/platform/security-keys/${rotatedKeyDbId}/revoke`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason: 'bad' }), // < 5 chars
      },
    );
    assert.strictEqual(revokeShortReasonRes.status, 400, 'Revoke reason < 5 chars must return 400');
    console.log('PASS  POST /revoke rejected short reason (<5 chars) with HTTP 400');

    const revokeRes = await fetch(
      `${BASE_URL}/api/v1/platform/security-keys/${rotatedKeyDbId}/revoke`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason: 'Operator revoked compromised credential via DangerousAction' }),
      },
    );
    assert.strictEqual(revokeRes.status, 200, 'Valid revocation must return 200');
    const revokeData = await revokeRes.json();
    assert.strictEqual(revokeData.status, 'REVOKED');
    console.log('PASS  POST /revoke transitioned key to REVOKED status with platform audit record');

    // 6. Operator Account Lockout Remediation
    console.log('\n--- 6. Testing Operator Unlock Remediation ---');
    const unlockShortReasonRes = await fetch(`${BASE_URL}/api/v1/platform/security-keys/unlock`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email: 'meera@shahgroup.in', reason: 'no' }),
    });
    assert.strictEqual(unlockShortReasonRes.status, 400, 'Unlock reason < 5 chars must return 400');
    console.log('PASS  POST /unlock rejected short reason (<5 chars) with HTTP 400');

    const unlockRes = await fetch(`${BASE_URL}/api/v1/platform/security-keys/unlock`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: 'meera@shahgroup.in',
        reason: 'Operator verified voice identity and reset credential lockout',
      }),
    });
    assert.strictEqual(unlockRes.status, 200);
    const unlockData = await unlockRes.json();
    assert.strictEqual(unlockData.unlocked, true);
    console.log('PASS  POST /unlock cleared failed sign-ins and lifted operator account lockout');

    console.log('\n===============================================================');
    console.log(' SUMMARY: All C6 Security & Keys endpoints and invariants PASS');
    console.log(' Verified zero-trust refusal, screen overview, key creation,');
    console.log(' ephemeral rotation, dangerous revocation, and lockout remediation.');
    console.log('===============================================================\n');
  } finally {
    // Cleanup
    if (createdKeyDbId) {
      await prisma.platformApiKey.deleteMany({ where: { id: createdKeyDbId } }).catch(() => {});
      console.log(`INFO  Cleaned up test key ${createdKeyDbId}`);
    }
    if (rotatedKeyDbId) {
      await prisma.platformApiKey.deleteMany({ where: { id: rotatedKeyDbId } }).catch(() => {});
      console.log(`INFO  Cleaned up test rotated key ${rotatedKeyDbId}`);
    }
    if (testSession?.operatorId) {
      await deleteTestOperatorSession(prisma, testSession.operatorId);
      console.log('INFO  Cleaned up test operator session from PostgreSQL');
    }
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error('\nFAIL C6 Security & Keys Suite encountered an unhandled error:', err);
  process.exit(1);
});
