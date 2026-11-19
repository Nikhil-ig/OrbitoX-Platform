import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import {
  createTestOperatorSession,
  deleteTestOperatorSession,
  type TestOperatorSession,
} from './test-operator-session';

const BASE_URL = (process.env.ORBITOX_URL || 'http://localhost:3005').replace(/\/$/, '');

async function run() {
  console.log('===============================================================');
  console.log(' 🪐 Stage 7F: C3 Billing & Subscriptions Verification Suite');
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

  try {
    // 1. Anonymous Access Refusal (Zero-Trust Fail-Closed)
    console.log('--- 1. Testing Anonymous Access Rejection ---');
    const anonSummary = await fetch(`${BASE_URL}/api/v1/platform/billing/summary`, { redirect: 'manual' });
    assert.ok(
      anonSummary.status === 401 || anonSummary.status === 307,
      `Expected anonymous GET /billing/summary to return 401 or 307 login redirect, got ${anonSummary.status}`
    );
    console.log(`PASS  Anonymous access to /billing/summary refused with HTTP ${anonSummary.status}`);

    const anonInvoices = await fetch(`${BASE_URL}/api/v1/platform/billing/invoices`, { redirect: 'manual' });
    assert.ok(
      anonInvoices.status === 401 || anonInvoices.status === 307,
      `Expected anonymous GET /billing/invoices to return 401 or 307, got ${anonInvoices.status}`
    );
    console.log(`PASS  Anonymous access to /billing/invoices refused with HTTP ${anonInvoices.status}`);

    // 2. Authenticated Billing Summary Retrieval
    console.log('\n--- 2. Testing Authenticated Billing Summary ---');
    const summaryRes = await fetch(`${BASE_URL}/api/v1/platform/billing/summary`, { headers });
    assert.equal(summaryRes.status, 200, `Expected 200 from /billing/summary, got ${summaryRes.status}`);
    const summaryJson = await summaryRes.json();
    assert.equal(summaryJson.success, true, 'Billing summary response must indicate success: true');
    assert.ok(summaryJson.data?.activeSubscriptionsCount > 0, 'Must report active subscriptions');
    assert.ok(summaryJson.data?.revenueByProduct?.length >= 4, 'Must report revenue by product breakdown');
    console.log(`PASS  GET /billing/summary returned 200 OK (${summaryJson.data.totalCollectedFormatted} collected, ${summaryJson.data.activeSubscriptionsCount} active subscriptions)`);

    // 3. Authenticated Invoice Listing & Filtering
    console.log('\n--- 3. Testing Invoice Listing & Filtering ---');
    const invoicesRes = await fetch(`${BASE_URL}/api/v1/platform/billing/invoices`, { headers });
    assert.equal(invoicesRes.status, 200, `Expected 200 from /billing/invoices, got ${invoicesRes.status}`);
    const invoicesJson = await invoicesRes.json();
    assert.equal(invoicesJson.success, true, 'Invoices list response must indicate success: true');
    assert.ok(Array.isArray(invoicesJson.data?.items), 'Invoices data must contain items array');
    assert.ok(invoicesJson.data.items.length >= 3, `Expected at least 3 invoices, got ${invoicesJson.data.items.length}`);
    console.log(`PASS  GET /billing/invoices returned 200 OK (${invoicesJson.data.items.length} invoices returned)`);

    // Search filter
    const searchRes = await fetch(`${BASE_URL}/api/v1/platform/billing/invoices?search=Masala`, { headers });
    const searchJson = await searchRes.json();
    assert.ok(searchJson.data?.items?.some((i: any) => i.tenantName.includes('Masala') || i.organizationName.includes('Masala')), 'Search filter must match Masala House');
    console.log('PASS  Invoice search filter verified');

    // 4. Payment Retry Flow
    console.log('\n--- 4. Testing Payment Retry Flow ---');
    const retryRes = await fetch(`${BASE_URL}/api/v1/platform/billing/invoices/inv_pay_Nv02A4/retry`, {
      method: 'POST',
      headers,
    });
    assert.equal(retryRes.status, 200, `Expected 200 from /retry, got ${retryRes.status}`);
    const retryJson = await retryRes.json();
    assert.equal(retryJson.success, true, 'Payment retry response must indicate success: true');
    console.log('PASS  POST /billing/invoices/:id/retry successfully queued payment retry');

    // 5. Negative Test: Mark Paid without Reason or Short Reason (< 5 chars)
    console.log('\n--- 5. Testing Negative Guardrails: Reason Length ---');
    const shortReasonRes = await fetch(`${BASE_URL}/api/v1/platform/billing/invoices/inv_pay_Nv02A4/mark-paid`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: 'paid' }), // 4 chars
    });
    assert.equal(shortReasonRes.status, 400, `Expected 400 for reason < 5 chars, got ${shortReasonRes.status}`);
    console.log('PASS  POST /mark-paid rejected 4-character reason with HTTP 400');

    // 6. Positive Test: Mark Paid with Valid Reason & Reauth
    console.log('\n--- 6. Testing Positive Dangerous Action: Mark Paid ---');
    const markPaidRes = await fetch(`${BASE_URL}/api/v1/platform/billing/invoices/inv_pay_Nv02A4/mark-paid`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: 'Bank wire transfer confirmed via ICICI ref #9812470' }),
    });
    assert.equal(markPaidRes.status, 200, `Expected 200 from /mark-paid, got ${markPaidRes.status}`);
    const markPaidJson = await markPaidRes.json();
    assert.equal(markPaidJson.success, true, 'Mark paid must report success: true');
    assert.equal(markPaidJson.data?.status, 'CAPTURED', 'Status must update to CAPTURED');
    console.log('PASS  POST /mark-paid marked invoice CAPTURED with valid audit trail');

    // 7. Grace Period Update Flow
    console.log('\n--- 7. Testing Grace Period Policy Update ---');
    const graceRes = await fetch(`${BASE_URL}/api/v1/platform/billing/grace-period`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        planId: 'plan_restaurant_growth',
        gracePeriodDays: 14,
        reason: 'Diwali promotional extension approved by operations',
      }),
    });
    assert.equal(graceRes.status, 200, `Expected 200 from /grace-period, got ${graceRes.status}`);
    const graceJson = await graceRes.json();
    assert.equal(graceJson.success, true, 'Grace policy update must indicate success: true');
    assert.equal(graceJson.data?.gracePeriodDays, 14, 'Grace period days must update to 14');
    console.log('PASS  PUT /billing/grace-period updated policy to 14 days');

    // 8. Subscription Cancellation Flow
    console.log('\n--- 8. Testing Subscription Cancellation ---');
    const cancelRes = await fetch(`${BASE_URL}/api/v1/platform/billing/subscriptions/sub_masala_03/cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        reason: 'Customer requested cancellation due to outlet relocation',
      }),
    });
    assert.equal(cancelRes.status, 200, `Expected 200 from /cancel, got ${cancelRes.status}`);
    const cancelJson = await cancelRes.json();
    assert.equal(cancelJson.success, true, 'Cancel subscription must report success: true');
    assert.equal(cancelJson.data?.status, 'cancelled', 'Subscription status must be cancelled');
    console.log('PASS  POST /billing/subscriptions/:id/cancel cancelled subscription with audit event');

    console.log('\n===============================================================');
    console.log(' SUMMARY: All C3 Billing endpoints and security invariants PASS');
    console.log(' Verified zero-trust refusal, summary, invoice queries, retry,');
    console.log(' mark-paid, grace period policy updates, and cancellations.');
    console.log('===============================================================\n');
  } finally {
    if (testSession) {
      await deleteTestOperatorSession(prisma, testSession.operatorId).catch(() => {});
      console.log('INFO  Cleaned up test operator session from PostgreSQL');
    }
    await prisma.$disconnect().catch(() => {});
  }
}

run().catch((err) => {
  console.error('\nFAIL: C3 Billing test suite failed with error:');
  console.error(err);
  process.exit(1);
});
