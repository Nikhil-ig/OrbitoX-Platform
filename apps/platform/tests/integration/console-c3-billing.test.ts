import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import {
  loginOperator,
  OPERATOR_CSRF_COOKIE,
  OPERATOR_SESSION_COOKIE,
} from '@/server/accounts/account-service';
import {
  generateTotpSecret,
  hashAccountPassword,
  sealTotpSecret,
} from '@/server/auth/account-security';
import {
  createTestOperatorSession,
  deleteTestOperatorSession,
  type TestOperatorSession,
} from './test-operator-session';

const BASE_URL = (process.env.ORBITOX_URL || 'http://localhost:3005').replace(/\/$/, '');

function generateTotp(secret: string, now = Date.now()): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of secret.replace(/=+$/, '')) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) throw new Error('Invalid base32 secret');
    bits += digit.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(parseInt(bits.slice(offset, offset + 8), 2));
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30_000)));
  const digest = crypto.createHmac('sha1', Buffer.from(bytes)).update(counter).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 1_000_000).padStart(6, '0');
}

async function createUnreauthenticatedOperatorSession(owner: PrismaClient): Promise<TestOperatorSession> {
  process.env.ORBITOX_MFA_ENCRYPTION_KEY ||= crypto.randomBytes(32).toString('base64');
  const email = `ci-operator-noreauth-${crypto.randomUUID()}@example.invalid`;
  const password = crypto.randomBytes(32).toString('base64url');
  const secret = generateTotpSecret();
  const operator = await owner.platformOperator.create({
    data: {
      email,
      passwordHash: await hashAccountPassword(password),
      role: 'PLATFORM_OWNER',
      mfaTotpSealed: sealTotpSecret(secret),
    },
    select: { id: true },
  });

  const login = await loginOperator({
    email,
    password,
    totpCode: generateTotp(secret),
    ipAddress: '127.0.0.1',
  });
  if (!login.ok) {
    await owner.platformOperator.delete({ where: { id: operator.id } });
    throw new Error('Failed to log in un-reauthenticated test operator.');
  }

  return {
    operatorId: operator.id,
    cookie: `${OPERATOR_SESSION_COOKIE}=${login.sessionToken}; ${OPERATOR_CSRF_COOKIE}=${login.csrfToken}`,
  };
}

async function run() {
  console.log('===============================================================');
  console.log(' 🪐 Stage 7F: C3 Billing & Subscriptions Verification Suite');
  console.log(' Target Base URL:', BASE_URL);
  console.log('===============================================================\n');

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://apple@127.0.0.1:5432/orbitox_phase2',
      },
    },
  });

  const runId = crypto.randomBytes(4).toString('hex');
  const ids = {
    orgId: `org_c3_${runId}`,
    projId: `proj_c3_${runId}`,
    envId: `env_c3_${runId}`,
    pluginId: '@orbitox/restaurant',
    planId: `plan_c3_${runId}`,
    rzpPlanId: `rzp_plan_c3_${runId}`,
    subId: `sub_c3_${runId}`,
    failedInvId: `inv_c3_failed_${runId}`,
    capturedInvId: `inv_c3_captured_${runId}`,
    pendingInvId: `inv_c3_pending_${runId}`,
  };
  const tenantId = `org/${ids.orgId}/project/${ids.projId}/environment/${ids.envId}`;

  let testSession: TestOperatorSession | null = null;
  let noReauthSession: TestOperatorSession | null = null;

  try {
    // Seed isolated billing fixtures in PostgreSQL
    await prisma.platformOrganization.create({
      data: {
        id: ids.orgId,
        slug: `c3-masala-${runId}`,
        name: `Masala House C3 ${runId}`,
        billingEmail: `c3-billing-${runId}@example.invalid`,
      },
    });
    await prisma.platformProject.create({
      data: {
        id: ids.projId,
        slug: `c3-masala-proj-${runId}`,
        name: `Masala House Bistro ${runId}`,
        organizationId: ids.orgId,
        businessModel: 'O2O2B2B2C',
        planTier: 'growth',
        technicalLead: 'C3 Billing Test',
        contactEmail: `c3-lead-${runId}@example.invalid`,
        enabledServices: ['restaurant'],
      },
    });
    await prisma.projectEnvironment.create({
      data: {
        id: ids.envId,
        projectId: ids.projId,
        slug: 'production',
        name: 'Production',
        type: 'PRODUCTION',
        isProduction: true,
      },
    });
    await prisma.plugin.upsert({
      where: { pluginId: ids.pluginId },
      update: {},
      create: { pluginId: ids.pluginId, name: 'RestaurantOS' },
    });
    await prisma.plan.create({
      data: {
        planId: ids.planId,
        pluginId: ids.pluginId,
        name: `C3 Test Growth ${runId}`,
        tier: 'growth',
        priceMinor: 249900,
        gracePeriodDays: 7,
      },
    });
    await prisma.billingPlanMap.create({
      data: {
        razorpayPlanId: ids.rzpPlanId,
        pluginId: ids.pluginId,
        internalPlanId: ids.planId,
        amountMinor: 249900,
        currency: 'INR',
        period: 'monthly',
        interval: 1,
      },
    });
    await prisma.billingSubscription.create({
      data: {
        razorpaySubscriptionId: ids.subId,
        organizationId: ids.orgId,
        tenantId,
        pluginId: ids.pluginId,
        razorpayPlanId: ids.rzpPlanId,
        status: 'active',
        graceStartedAt: new Date(Date.now() - 86400000),
      },
    });

    const expiresAt = new Date(Date.now() + 7 * 86400000);
    await prisma.billingProviderCache.createMany({
      data: [
        {
          tenantId,
          cacheKey: ids.failedInvId,
          subscriptionId: ids.subId,
          expiresAt,
          payload: {
            id: ids.failedInvId,
            paymentId: `pay_fail_${runId}`,
            subscriptionId: ids.subId,
            organizationId: ids.orgId,
            organizationName: `Masala House C3 ${runId}`,
            tenantId,
            tenantName: `Masala House Bistro ${runId}`,
            amountMinor: 249900,
            currency: 'INR',
            paymentMethod: 'UPI AutoPay',
            status: 'FAILED',
            failureReason: 'insufficient funds',
            paidAt: null,
            createdAt: new Date().toISOString(),
          },
        },
        {
          tenantId,
          cacheKey: ids.capturedInvId,
          subscriptionId: ids.subId,
          expiresAt,
          payload: {
            id: ids.capturedInvId,
            paymentId: `pay_cap_${runId}`,
            subscriptionId: ids.subId,
            organizationId: ids.orgId,
            organizationName: `Masala House C3 ${runId}`,
            tenantId,
            tenantName: `Masala House Bistro ${runId}`,
            amountMinor: 499900,
            currency: 'INR',
            paymentMethod: 'Visa Corporate',
            status: 'CAPTURED',
            paidAt: new Date().toISOString(),
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
        },
        {
          tenantId,
          cacheKey: ids.pendingInvId,
          subscriptionId: ids.subId,
          expiresAt,
          payload: {
            id: ids.pendingInvId,
            paymentId: `pay_pend_${runId}`,
            subscriptionId: ids.subId,
            organizationId: ids.orgId,
            organizationName: `Masala House C3 ${runId}`,
            tenantId,
            tenantName: `Masala House Bistro ${runId}`,
            amountMinor: 199900,
            currency: 'INR',
            paymentMethod: 'NetBanking',
            status: 'PENDING',
            paidAt: null,
            createdAt: new Date(Date.now() - 7200000).toISOString(),
          },
        },
      ],
    });

    testSession = await createTestOperatorSession(prisma);
    noReauthSession = await createUnreauthenticatedOperatorSession(prisma);

    const makeHeaders = (session: TestOperatorSession, extra: Record<string, string> = {}) => {
      const csrf = session.cookie.match(/orbitox_operator_csrf=([^;]+)/)?.[1] || '';
      return {
        cookie: session.cookie,
        'x-csrf-token': csrf,
        origin: BASE_URL,
        'Content-Type': 'application/json',
        ...extra,
      };
    };

    const headers = makeHeaders(testSession);
    const noReauthHeaders = makeHeaders(noReauthSession);

    // 1. Anonymous Access Refusal (Zero-Trust Fail-Closed)
    console.log('--- 1. Testing Anonymous Access Rejection ---');
    const anonSummary = await fetch(`${BASE_URL}/api/v1/platform/billing/summary`, { redirect: 'manual' });
    assert.ok(
      anonSummary.status === 401 || anonSummary.status === 307,
      `Expected anonymous GET /billing/summary to return 401 or 307 login redirect, got ${anonSummary.status}`,
    );
    console.log(`PASS  Anonymous access to /billing/summary refused with HTTP ${anonSummary.status}`);

    const anonInvoices = await fetch(`${BASE_URL}/api/v1/platform/billing/invoices`, { redirect: 'manual' });
    assert.ok(
      anonInvoices.status === 401 || anonInvoices.status === 307,
      `Expected anonymous GET /billing/invoices to return 401 or 307, got ${anonInvoices.status}`,
    );
    console.log(`PASS  Anonymous access to /billing/invoices refused with HTTP ${anonInvoices.status}`);

    // 2. Authenticated Billing Summary Retrieval
    console.log('\n--- 2. Testing Authenticated Billing Summary ---');
    const summaryRes = await fetch(`${BASE_URL}/api/v1/platform/billing/summary`, { headers });
    assert.equal(summaryRes.status, 200, `Expected 200 from /billing/summary, got ${summaryRes.status}`);
    const summaryJson = await summaryRes.json();
    assert.equal(summaryJson.success, true);
    assert.ok(summaryJson.data?.activeSubscriptionsCount > 0, 'Must report active subscriptions');
    assert.ok(summaryJson.data?.revenueByProduct?.length >= 4, 'Must report revenue by product breakdown');
    console.log(`PASS  GET /billing/summary returned 200 OK (${summaryJson.data.totalCollectedFormatted} collected, ${summaryJson.data.activeSubscriptionsCount} active subscriptions)`);

    // 3. Authenticated Invoice Listing & Filtering (>= 3 seeded invoices)
    console.log('\n--- 3. Testing Invoice Listing & Filtering ---');
    const invoicesRes = await fetch(`${BASE_URL}/api/v1/platform/billing/invoices?search=${encodeURIComponent(runId)}`, { headers });
    assert.equal(invoicesRes.status, 200);
    const invoicesJson = await invoicesRes.json();
    assert.equal(invoicesJson.success, true);
    assert.ok(Array.isArray(invoicesJson.data?.items));
    assert.ok(invoicesJson.data.items.length >= 3, `Expected at least 3 seeded invoices for ${runId}, got ${invoicesJson.data.items.length}`);
    console.log(`PASS  GET /billing/invoices returned ${invoicesJson.data.items.length} seeded invoices (FAILED, CAPTURED, PENDING)`);

    // 4. Payment Retry Flow (Failed -> 200, Idempotent Replay -> 200, Captured -> 409)
    console.log('\n--- 4. Testing Payment Retry Flow & State Guard ---');
    const idemKey = `c3_retry_${runId}`;
    const retryRes = await fetch(`${BASE_URL}/api/v1/platform/billing/invoices/${ids.failedInvId}/retry`, {
      method: 'POST',
      headers: makeHeaders(testSession, { 'idempotency-key': idemKey }),
    });
    assert.equal(retryRes.status, 200, `Expected 200 retrying FAILED invoice, got ${retryRes.status}`);
    const retryJson = await retryRes.json();
    assert.equal(retryJson.success, true);
    assert.equal(retryJson.data?.retryCount, 1);

    const retryReplay = await fetch(`${BASE_URL}/api/v1/platform/billing/invoices/${ids.failedInvId}/retry`, {
      method: 'POST',
      headers: makeHeaders(testSession, { 'idempotency-key': idemKey }),
    });
    assert.equal(retryReplay.status, 200);
    const retryReplayJson = await retryReplay.json();
    assert.equal(retryReplayJson.data?.replayed, true, 'Repeated retry with same Idempotency-Key must report replayed: true');

    const capturedRetryRes = await fetch(`${BASE_URL}/api/v1/platform/billing/invoices/${ids.capturedInvId}/retry`, {
      method: 'POST',
      headers,
    });
    assert.equal(
      capturedRetryRes.status,
      409,
      `Expected 409 Conflict retrying CAPTURED invoice, got ${capturedRetryRes.status}`,
    );
    console.log('PASS  POST /retry handled FAILED retry (200), idempotent replay (200), and CAPTURED rejection (409)');

    // 5. Negative Guardrails: Step-up Reauth Required & Reason Min Length
    console.log('\n--- 5. Testing Step-Up Reauth & Reason Guardrails ---');
    const noReauthMarkPaid = await fetch(`${BASE_URL}/api/v1/platform/billing/invoices/${ids.failedInvId}/mark-paid`, {
      method: 'POST',
      headers: noReauthHeaders,
      body: JSON.stringify({ reason: 'Wire transfer ref #998811' }),
    });
    assert.equal(noReauthMarkPaid.status, 403, `Expected 403 without fresh step-up reauth, got ${noReauthMarkPaid.status}`);

    const shortReasonRes = await fetch(`${BASE_URL}/api/v1/platform/billing/invoices/${ids.failedInvId}/mark-paid`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: 'paid' }),
    });
    assert.equal(shortReasonRes.status, 400, `Expected 400 for 4-char reason, got ${shortReasonRes.status}`);
    console.log('PASS  Guardrails enforced: 403 without step-up MFA, 400 for short reason');

    // 6. Positive Mark Paid & DB State Check
    console.log('\n--- 6. Testing Mark Paid & DB Verification ---');
    const markPaidRes = await fetch(`${BASE_URL}/api/v1/platform/billing/invoices/${ids.failedInvId}/mark-paid`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: 'Bank wire transfer confirmed via ICICI ref #9812470' }),
    });
    assert.equal(markPaidRes.status, 200);
    const markPaidJson = await markPaidRes.json();
    assert.equal(markPaidJson.data?.status, 'CAPTURED');

    const cachedAfter = await prisma.billingProviderCache.findUnique({
      where: { tenantId_cacheKey: { tenantId, cacheKey: ids.failedInvId } },
    });
    assert.equal((cachedAfter?.payload as any)?.status, 'CAPTURED', 'DB invoice payload must persist CAPTURED');
    console.log('PASS  POST /mark-paid updated PostgreSQL invoice status to CAPTURED');

    // 7. Grace Period Policy Update & DB Check
    console.log('\n--- 7. Testing Grace Period Policy Update ---');
    const graceRes = await fetch(`${BASE_URL}/api/v1/platform/billing/grace-period`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        planId: ids.planId,
        gracePeriodDays: 14,
        reason: 'Diwali promotional extension approved by operations',
      }),
    });
    assert.equal(graceRes.status, 200);
    const graceJson = await graceRes.json();
    assert.equal(graceJson.data?.gracePeriodDays, 14);

    const updatedPlan = await prisma.plan.findUnique({ where: { planId: ids.planId } });
    assert.equal(updatedPlan?.gracePeriodDays, 14, 'Plan gracePeriodDays must persist as 14 in PostgreSQL');
    console.log('PASS  PUT /billing/grace-period updated isolated Plan in PostgreSQL to 14 days');

    // 8. Subscription Cancellation (pending_cancellation + cancelAtPeriodEnd=true) & Replay Refusal
    console.log('\n--- 8. Testing Subscription Cancellation ---');
    const noReauthCancel = await fetch(`${BASE_URL}/api/v1/platform/billing/subscriptions/${ids.subId}/cancel`, {
      method: 'POST',
      headers: noReauthHeaders,
      body: JSON.stringify({ reason: 'Customer requested cancellation due to outlet relocation' }),
    });
    assert.equal(noReauthCancel.status, 403, 'Un-reauthenticated /cancel must return 403');

    const cancelRes = await fetch(`${BASE_URL}/api/v1/platform/billing/subscriptions/${ids.subId}/cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        reason: 'Customer requested cancellation due to outlet relocation',
      }),
    });
    assert.equal(cancelRes.status, 200, `Expected 200 from /cancel, got ${cancelRes.status}`);
    const cancelJson = await cancelRes.json();
    assert.equal(cancelJson.success, true);
    assert.equal(
      cancelJson.data?.status,
      'pending_cancellation',
      'Cancel subscription API must report pending_cancellation (end-of-cycle)',
    );
    assert.equal(cancelJson.data?.cancelAtPeriodEnd, true, 'Cancel API must report cancelAtPeriodEnd=true');

    const subAfter = await prisma.billingSubscription.findUnique({
      where: { razorpaySubscriptionId: ids.subId },
    });
    assert.equal(subAfter?.status, 'active', 'DB status stays active under BillingSubscription_status_check until cycle end webhook');
    assert.equal(subAfter?.cancelAtPeriodEnd, true, 'DB cancelAtPeriodEnd must persist as true');

    const repeatCancel = await fetch(`${BASE_URL}/api/v1/platform/billing/subscriptions/${ids.subId}/cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: 'Duplicate cancel call check' }),
    });
    assert.equal(repeatCancel.status, 409, 'Cancelling already cancelAtPeriodEnd=true sub must return 409');
    console.log('PASS  POST /cancel persisted cancelAtPeriodEnd=true (pending_cancellation) & rejected duplicate 409');

    console.log('\n===============================================================');
    console.log(' SUMMARY: All C3 Billing endpoints and security invariants PASS');
    console.log('===============================================================\n');
  } finally {
    await prisma.billingProviderCache.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.billingSubscription.deleteMany({ where: { razorpaySubscriptionId: ids.subId } }).catch(() => {});
    await prisma.billingPlanMap.deleteMany({ where: { razorpayPlanId: ids.rzpPlanId } }).catch(() => {});
    await prisma.plan.deleteMany({ where: { planId: ids.planId } }).catch(() => {});
    await prisma.platformProject.deleteMany({ where: { id: ids.projId } }).catch(() => {});
    await prisma.platformOrganization.deleteMany({ where: { id: ids.orgId } }).catch(() => {});
    if (testSession) {
      await deleteTestOperatorSession(prisma, testSession.operatorId).catch(() => {});
    }
    if (noReauthSession) {
      await deleteTestOperatorSession(prisma, noReauthSession.operatorId).catch(() => {});
    }
    await prisma.$disconnect().catch(() => {});
  }
}

run().catch((err) => {
  console.error('\nFAIL: C3 Billing test suite failed with error:');
  console.error(err);
  process.exit(1);
});
