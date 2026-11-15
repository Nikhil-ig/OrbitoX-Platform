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
  console.log(' 🪐 Stage 7F: Audit Log Screen Verification Suite');
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

  try {
    // 1. Anonymous Access Rejection
    console.log('--- 1. Testing Anonymous Access Rejection ---');
    const anonQuery = await fetch(`${BASE_URL}/api/v1/platform/audit-logs`);
    assert.strictEqual(anonQuery.status, 401, 'Anonymous GET /audit-logs must return 401');
    console.log('PASS  Anonymous access to /audit-logs refused with HTTP 401');

    const anonExport = await fetch(`${BASE_URL}/api/v1/platform/audit-logs/export`);
    assert.strictEqual(anonExport.status, 401, 'Anonymous GET /audit-logs/export must return 401');
    console.log('PASS  Anonymous access to /audit-logs/export refused with HTTP 401');

    // 2. Authenticated Query & Summary Invariants
    console.log('\n--- 2. Testing Authenticated Query & Summary Invariants ---');
    const queryRes = await fetch(`${BASE_URL}/api/v1/platform/audit-logs?page=1&pageSize=20`, { headers });
    assert.strictEqual(queryRes.status, 200, 'Authenticated GET /audit-logs must return 200');
    const data = await queryRes.json();

    assert.ok(data.summary, 'Response must include summary');
    assert.ok(data.summary.totalEvents > 0, 'Total recorded events must be greater than zero');
    assert.strictEqual(data.summary.ledgerIntegrity, 'INTACT_IMMUTABLE', 'Ledger integrity must be INTACT_IMMUTABLE');
    assert.ok(Array.isArray(data.items), 'Response must include items array');
    assert.ok(data.items.length > 0, 'Items array must have events');
    console.log(`PASS  GET /audit-logs returned 200 OK (${data.summary.totalEvents} events in PostgreSQL)`);

    const firstItem = data.items[0];
    assert.ok(firstItem.id, 'Item must have id');
    assert.ok(firstItem.action, 'Item must have action');
    assert.ok(firstItem.occurredAt, 'Item must have occurredAt');
    assert.ok(firstItem.actorDisplay, 'Item must have actorDisplay');
    assert.strictEqual(firstItem.status, 'COMMITTED', 'Status must be COMMITTED');
    console.log(`PASS  Audit event structure verified: ${firstItem.id} [${firstItem.action}] by ${firstItem.actorDisplay}`);

    // 3. Category Filtering
    console.log('\n--- 3. Testing Category Filtering ---');
    const secRes = await fetch(`${BASE_URL}/api/v1/platform/audit-logs?category=SECURITY`, { headers });
    assert.strictEqual(secRes.status, 200, 'Category SECURITY query must return 200');
    const secData = await secRes.json();
    assert.ok(secData.items.length > 0, 'Must have security events');
    assert.ok(
      secData.items.every((item: any) => item.category === 'SECURITY'),
      'All returned items must belong to SECURITY category',
    );
    console.log(`PASS  Category SECURITY filtered accurately (${secData.items.length} security events)`);

    const tenantRes = await fetch(`${BASE_URL}/api/v1/platform/audit-logs?category=TENANT`, { headers });
    assert.strictEqual(tenantRes.status, 200, 'Category TENANT query must return 200');
    const tenantData = await tenantRes.json();
    assert.ok(tenantData.items.length > 0, 'Must have tenant events');
    assert.ok(
      tenantData.items.every((item: any) => item.category === 'TENANT'),
      'All returned items must belong to TENANT category',
    );
    console.log(`PASS  Category TENANT filtered accurately (${tenantData.items.length} tenant events)`);

    // 4. Entity Filtering
    console.log('\n--- 4. Testing Entity Filtering ---');
    const entityRes = await fetch(`${BASE_URL}/api/v1/platform/audit-logs?entityId=proj_oasis_blr`, { headers });
    assert.strictEqual(entityRes.status, 200, 'Entity query must return 200');
    const entityData = await entityRes.json();
    assert.ok(entityData.items.length > 0, 'Must have events for proj_oasis_blr');
    assert.ok(
      entityData.items.every((item: any) =>
        (item.entityId && item.entityId.includes('proj_oasis_blr')) ||
        (item.projectId && item.projectId.includes('proj_oasis_blr'))
      ),
      'All items must match target entity',
    );
    console.log(`PASS  Entity filtering verified for proj_oasis_blr (${entityData.items.length} events)`);

    // 5. Search Filtering
    console.log('\n--- 5. Testing Search Filtering ---');
    const searchRes = await fetch(`${BASE_URL}/api/v1/platform/audit-logs?search=SUSPEND`, { headers });
    assert.strictEqual(searchRes.status, 200, 'Search query must return 200');
    const searchData = await searchRes.json();
    assert.ok(searchData.items.length > 0, 'Search for SUSPEND must find events');
    console.log(`PASS  Search query for "SUSPEND" returned ${searchData.items.length} events`);

    // 6. Single Event Detailed Inspection
    console.log('\n--- 6. Testing Single Event Detailed Inspection ---');
    const detailRes = await fetch(`${BASE_URL}/api/v1/platform/audit-logs/${firstItem.id}`, { headers });
    assert.strictEqual(detailRes.status, 200, 'GET /audit-logs/:id must return 200');
    const detailData = await detailRes.json();
    assert.ok(detailData.event, 'Response must include event');
    assert.strictEqual(detailData.event.id, firstItem.id, 'Returned event ID must match');
    assert.ok(typeof detailData.event.metadata === 'object', 'Metadata must be an object');
    console.log(`PASS  GET /audit-logs/${firstItem.id} returned full payload with metadata`);

    // 7. CSV Export
    console.log('\n--- 7. Testing CSV Export ---');
    const exportRes = await fetch(`${BASE_URL}/api/v1/platform/audit-logs/export?category=SECURITY`, { headers });
    assert.strictEqual(exportRes.status, 200, 'GET /audit-logs/export must return 200');
    assert.ok(
      exportRes.headers.get('content-type')?.includes('text/csv'),
      'Content-Type must be text/csv',
    );
    const csvText = await exportRes.text();
    assert.ok(csvText.startsWith('ID,Timestamp (UTC),Action,Category'), 'CSV must contain standard headers');
    const lines = csvText.trim().split('\n');
    assert.ok(lines.length >= 2, 'CSV must contain header row and at least one data row');
    console.log(`PASS  CSV export returned valid CSV stream (${lines.length - 1} records)`);

    console.log('\n===============================================================');
    console.log(' SUMMARY: All Platform Audit Log endpoints and invariants PASS');
    console.log(' Verified zero-trust refusal, paginated query, category filters,');
    console.log(' entity filters, search, single event inspection, and CSV export.');
    console.log('===============================================================\n');
  } finally {
    if (testSession) {
      await deleteTestOperatorSession(prisma, testSession.operatorId);
      console.log('INFO  Cleaned up test operator session from PostgreSQL');
    }
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error('Audit Log Test Failed:', err);
  process.exit(1);
});
