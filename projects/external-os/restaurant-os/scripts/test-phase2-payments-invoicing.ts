/**
 * 🪐 RESTAURANTOS — PHASE 2 INTEGRATION VERIFICATION SUITE
 * ─────────────────────────────────────────────────────────────────────────────
 * Comprehensive automated verification for Phase 2:
 * 1. Razorpay Payment Gateway Adapter (server-recomputed amounts, REST API / deterministic sandbox)
 * 2. Webhook HMAC-SHA256 signature verification (constant-time, tamper resistance)
 * 3. Idempotent state transitions (UNPAID -> AUTHORIZED -> CAPTURED, duplicate replay deduplication)
 * 4. Level 4 Refund Governance (autonomous refunds blocked, manager PIN authorization)
 * 5. Statutory Indian GST Invoicing (SAC 996331, sequential fiscal year numbering, 5% CGST/SGST)
 * 6. Multi-tenant partitioning of durable invoices and payment sessions in PostgreSQL
 * 7. Live HTTP Server API endpoint integration (create-order, webhook, invoices, refund)
 */

import assert from 'assert';
import * as crypto from 'crypto';
import * as http from 'http';
import { PrismaClient } from '@prisma/client';
import { PostgresRestaurantStore } from '../packages/storage/postgres-store';
import {
  RazorpayPaymentGatewayAdapter,
  MockPaymentGatewayAdapter,
} from '../packages/integrations';
import {
  buildGSTInvoice,
  computeFiscalYear,
  formatInvoiceNumber,
  SAC_RESTAURANT_SERVICES,
  DEFAULT_PILOT_GSTIN,
} from '../packages/domain/invoicing';
import { withTenantContext } from '../packages/domain/tenancy';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://apple@localhost:5432/restaurant_os';
const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
const store = new PostgresRestaurantStore(prisma);

let passed = 0;
let total = 0;

async function test(name: string, fn: () => Promise<void>) {
  total++;
  try {
    await fn();
    passed++;
    console.log(`  ✅ PASS: ${name}`);
  } catch (err: any) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function run() {
  console.log('\n=============================================================');
  console.log('🪐 RESTAURANTOS PHASE 2 — PAYMENTS & INVOICING VERIFICATION');
  console.log('=============================================================\n');

  // STEP 0: Clean up test fixtures from previous runs
  const TEST_TENANT = 'tenant_pilot_bistro';
  const PEER_TENANT = 'tenant_beta_grill';

  await prisma.invoice.deleteMany({
    where: { tenantId: { in: [TEST_TENANT, PEER_TENANT] }, orderId: { startsWith: 'test_ord_' } },
  });
  await prisma.razorpayPaymentSession.deleteMany({
    where: { tenantId: { in: [TEST_TENANT, PEER_TENANT] }, orderId: { startsWith: 'test_ord_' } },
  });

  // Ensure test tenants exist in DB
  await prisma.tenant.upsert({
    where: { id: TEST_TENANT },
    update: {},
    create: { id: TEST_TENANT, name: 'Pilot Bistro', slug: 'bistro-pilot' },
  });
  await prisma.tenant.upsert({
    where: { id: PEER_TENANT },
    update: {},
    create: { id: PEER_TENANT, name: 'Beta Grill', slug: 'beta-grill' },
  });

  // ─────────────────────────────────────────────────────────────
  // SUITE 1: RAZORPAY PAYMENT GATEWAY ADAPTER
  // ─────────────────────────────────────────────────────────────
  console.log('--- Suite 1: Razorpay Payment Gateway Adapter ---');

  const webhookSecret = 'rzp_sec_test_secret_998877';
  const adapter = new RazorpayPaymentGatewayAdapter({
    keyId: 'mock-rzp-key-01',
    keySecret: 'sec_test_abcdef',
    webhookSecret,
  });

  await test('1.1 Razorpay order creation enforces positive integer minor units', async () => {
    await assert.rejects(
      () => adapter.createOrder({ orderId: 'test_ord_err', amountMinor: -500 }),
      /positive integer/
    );
    await assert.rejects(
      () => adapter.createOrder({ orderId: 'test_ord_err', amountMinor: 0 }),
      /positive integer/
    );
  });

  await test('1.2 Deterministic sandbox order generation produces valid order_<hash>', async () => {
    const orderRes = await adapter.createOrder({
      orderId: 'test_ord_101',
      amountMinor: 47250, // ₹472.50
      currency: 'INR',
      tableNumber: 'T-14',
      tenantId: TEST_TENANT,
    });

    assert.ok(orderRes.razorpayOrderId.startsWith('order_'), 'Expected razorpayOrderId starting with order_');
    assert.strictEqual(orderRes.amountMinor, 47250);
    assert.strictEqual(orderRes.currency, 'INR');
    assert.ok(orderRes.paymentUrl.includes(orderRes.razorpayOrderId));
  });

  await test('1.3 HMAC-SHA256 signature verification validates authentic payloads', async () => {
    const payload = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_test_1', amount: 47250 } } },
    });
    const validSignature = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');

    const isValid = adapter.verifyWebhookSignature(payload, validSignature);
    assert.strictEqual(isValid, true, 'Valid webhook signature must return true');
  });

  await test('1.4 HMAC-SHA256 signature verification rejects tampered or forged payloads', async () => {
    const payload = JSON.stringify({ event: 'payment.captured', amount: 47250 });
    const forgedSignature = crypto.createHmac('sha256', 'wrong_secret').update(payload).digest('hex');

    assert.strictEqual(adapter.verifyWebhookSignature(payload, forgedSignature), false);
    assert.strictEqual(adapter.verifyWebhookSignature(payload, 'invalid_hex_string'), false);
    assert.strictEqual(adapter.verifyWebhookSignature(payload, ''), false);
    assert.strictEqual(adapter.verifyWebhookSignature('', forgedSignature), false);
  });

  await test('1.5 Level 4 Refund Governance prevents autonomous refunds', async () => {
    // Unauthenticated diner or system
    const autonomous = adapter.checkRefundGovernance(undefined, false);
    assert.strictEqual(autonomous.allowed, false);
    assert.ok(autonomous.reason?.includes('Refund governance'));

    // Regular waiter / server role
    const serverAttempt = adapter.checkRefundGovernance('WAITER', true);
    assert.strictEqual(serverAttempt.allowed, false);

    // Authorized Manager with PIN verified
    const managerApproval = adapter.checkRefundGovernance('MANAGER', true);
    assert.strictEqual(managerApproval.allowed, true);

    // Authorized Owner with PIN verified
    const ownerApproval = adapter.checkRefundGovernance('OWNER', true);
    assert.strictEqual(ownerApproval.allowed, true);
  });

  // ─────────────────────────────────────────────────────────────
  // SUITE 2: STATUTORY INDIAN GST INVOICING
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Suite 2: Statutory Indian GST Invoicing ---');

  await test('2.1 Fiscal year calculation aligns with Indian April-March tax calendar', async () => {
    // Date in October 2026 (Month 9 in 0-indexed JS Date) -> FY 2026-2027
    const oct2026 = computeFiscalYear(new Date('2026-10-24T12:00:00Z'));
    assert.strictEqual(oct2026.fiscalYear, '2026-2027');
    assert.strictEqual(oct2026.code, '202627');

    // Date in January 2027 (Month 0 in 0-indexed JS Date) -> still FY 2026-2027
    const jan2027 = computeFiscalYear(new Date('2027-01-15T12:00:00Z'));
    assert.strictEqual(jan2027.fiscalYear, '2026-2027');
    assert.strictEqual(jan2027.code, '202627');

    // Date in May 2025 -> FY 2025-2026
    const may2025 = computeFiscalYear(new Date('2025-05-10T12:00:00Z'));
    assert.strictEqual(may2025.fiscalYear, '2025-2026');
    assert.strictEqual(may2025.code, '202526');
  });

  await test('2.2 Format invoice number formats monotonically with 6-digit zero padding', async () => {
    assert.strictEqual(formatInvoiceNumber('202627', 1), 'INV-202627-000001');
    assert.strictEqual(formatInvoiceNumber('202627', 42), 'INV-202627-000042');
    assert.strictEqual(formatInvoiceNumber('202627', 12345), 'INV-202627-012345');
  });

  await test('2.3 GST Invoice builder calculates statutory 5% GST split (2.5% CGST + 2.5% SGST) and SAC 996331', async () => {
    const mockOrder = {
      orderId: 'test_ord_gst_1',
      tableNumber: 'T-05',
      branchId: 'branch_pilot_main',
      guestName: 'Ananya Sharma',
      items: [
        { id: 'item_1', name: 'Paneer Tikka', quantity: 2, unitPriceMinor: 35000 }, // 70000
        { id: 'item_2', name: 'Butter Naan', quantity: 3, unitPriceMinor: 6000 },   // 18000
      ],
      subtotalMinor: 88000, // ₹880.00
      currency: 'INR',
    };

    const invoice = buildGSTInvoice({
      order: mockOrder,
      sequenceNumber: 1,
      tenantId: TEST_TENANT,
      customerPhone: '+919876543210',
      date: new Date('2026-10-24T12:00:00Z'),
    });

    assert.strictEqual(invoice.invoiceNumber, 'INV-202627-000001');
    assert.strictEqual(invoice.tenantId, TEST_TENANT);
    assert.strictEqual(invoice.gstin, DEFAULT_PILOT_GSTIN);
    assert.strictEqual(invoice.subtotalMinor, 88000);

    // 5% of 88000 = 4400 (split: CGST 2200 + SGST 2200)
    assert.strictEqual(invoice.taxBreakdown.sacCode, SAC_RESTAURANT_SERVICES);
    assert.strictEqual(invoice.taxBreakdown.cgstMinor, 2200);
    assert.strictEqual(invoice.taxBreakdown.sgstMinor, 2200);
    assert.strictEqual(invoice.taxMinor, 4400);
    assert.strictEqual(invoice.totalMinor, 92400); // ₹924.00

    // Item breakdown SAC code check
    assert.strictEqual(invoice.itemBreakdown.length, 2);
    for (const item of invoice.itemBreakdown) {
      assert.strictEqual(item.sacCode, SAC_RESTAURANT_SERVICES);
      assert.strictEqual(item.taxRate, '5%');
    }
  });

  // ─────────────────────────────────────────────────────────────
  // SUITE 3: DURABLE POSTGRESQL MULTI-TENANT STORAGE
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Suite 3: Durable PostgreSQL Multi-Tenant Storage ---');

  await test('3.1 Payment session persistence and state updates in PostgreSQL', async () => {
    const sessionRecord = {
      id: 'order_test_rzp_sess_1',
      orderId: 'test_ord_sess_1',
      tableNumber: 'T-01',
      amountMinor: 52500,
      currency: 'INR',
      status: 'created',
    };

    // Save session
    await store.savePaymentSession(sessionRecord, TEST_TENANT);

    // Retrieve by ID
    const retrieved = await store.getPaymentSessionById('order_test_rzp_sess_1', TEST_TENANT);
    assert.ok(retrieved);
    assert.strictEqual(retrieved.status, 'created');
    assert.strictEqual(retrieved.amountMinor, 52500);

    // Update to captured
    await store.savePaymentSession(
      {
        ...sessionRecord,
        status: 'captured',
        razorpayPaymentId: 'pay_test_captured_1',
        razorpaySignature: 'sig_test_captured_1',
      },
      TEST_TENANT
    );

    const updated = await store.getPaymentSessionById('order_test_rzp_sess_1', TEST_TENANT);
    assert.strictEqual(updated.status, 'captured');
    assert.strictEqual(updated.razorpayPaymentId, 'pay_test_captured_1');

    // Tenant isolation: Peer tenant cannot see this session
    const peerLookup = await store.getPaymentSessionById('order_test_rzp_sess_1', PEER_TENANT);
    assert.strictEqual(peerLookup, null, 'Peer tenant must NOT see test tenant session');
  });

  await test('3.2 Sequential invoice numbering produces zero gaps per tenant', async () => {
    const { fiscalYear, code } = computeFiscalYear();

    const seq1 = await store.getNextInvoiceSequence(fiscalYear, TEST_TENANT);
    const inv1 = buildGSTInvoice({
      order: {
        orderId: 'test_ord_seq_1',
        tableNumber: 'T-02',
        items: [{ id: 'i1', name: 'Cold Coffee', unitPriceMinor: 15000, quantity: 1 }],
      },
      sequenceNumber: seq1,
      tenantId: TEST_TENANT,
    });
    await store.saveInvoice(inv1, TEST_TENANT);

    const seq2 = await store.getNextInvoiceSequence(fiscalYear, TEST_TENANT);
    assert.strictEqual(seq2, seq1 + 1, 'Next sequence number must increment monotonically by 1');

    const inv2 = buildGSTInvoice({
      order: {
        orderId: 'test_ord_seq_2',
        tableNumber: 'T-02',
        items: [{ id: 'i2', name: 'Iced Tea', unitPriceMinor: 12000, quantity: 1 }],
      },
      sequenceNumber: seq2,
      tenantId: TEST_TENANT,
    });
    await store.saveInvoice(inv2, TEST_TENANT);

    const retrievedInv1 = await store.getInvoiceByOrderId('test_ord_seq_1', TEST_TENANT);
    assert.ok(retrievedInv1);
    assert.strictEqual(retrievedInv1.sequenceNumber, seq1);

    // Tenant isolation: Peer tenant cannot retrieve this invoice
    const crossTenantLookup = await store.getInvoiceByOrderId('test_ord_seq_1', PEER_TENANT);
    assert.strictEqual(crossTenantLookup, null, 'Cross-tenant invoice lookup must return null');
  });

  // ─────────────────────────────────────────────────────────────
  // SUITE 4: END-TO-END HTTP API WORKFLOWS
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Suite 4: End-to-End HTTP API Workflows ---');

  // Helper for HTTP requests
  function makeRequest(
    port: number,
    method: string,
    path: string,
    headers: Record<string, string>,
    body?: any
  ): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
    return new Promise((resolve, reject) => {
      const dataStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined;
      const reqHeaders: Record<string, string> = { ...headers };
      if (dataStr) {
        reqHeaders['Content-Type'] = 'application/json';
        reqHeaders['Content-Length'] = Buffer.byteLength(dataStr).toString();
      }

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method,
          headers: reqHeaders,
        },
        (res) => {
          let responseData = '';
          res.on('data', (c) => (responseData += c));
          res.on('end', () => {
            let json = null;
            try {
              json = JSON.parse(responseData);
            } catch {
              json = responseData;
            }
            resolve({ status: res.statusCode || 500, headers: res.headers, body: json });
          });
        }
      );
      req.on('error', reject);
      if (dataStr) req.write(dataStr);
      req.end();
    });
  }

  // Check if RestaurantOS is already running on port 4010, or launch test runner
  // Check if live server can be spawned on port 4018
  const serverPort = 4018;
  const { spawn } = await import('child_process');
  const serverProc = spawn('npx', ['tsx', 'src/server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL,
      PORT: String(serverPort),
      RAZORPAY_WEBHOOK_SECRET: webhookSecret,
      NODE_ENV: 'test',
    },
    stdio: 'inherit',
  });

  // Wait for server readiness
  let serverReady = false;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 300));
    try {
      const probe = await makeRequest(serverPort, 'GET', '/health', {});
      if (probe.status === 200) {
        serverReady = true;
        break;
      }
    } catch {}
  }

  assert.ok(serverReady, 'Test server failed to start within 6 seconds on port 4018');
  console.log(`  ℹ️ Live RestaurantOS instance active on port ${serverPort}`);

  try {
    let testOrderId = '';
    let testRazorpayOrderId = '';

    await test('4.1 Server calculates deterministic quote with 5% GST', async () => {
      const quoteRes = await makeRequest(
        serverPort,
        'POST',
        '/api/restaurant/quote',
        { 'x-tenant-id': TEST_TENANT },
        {
          items: [
            { id: 'item_paneer_tikka', quantity: 2 }, // 35000 * 2 = 70000
          ],
        }
      );
      assert.strictEqual(quoteRes.status, 200);
      assert.strictEqual(quoteRes.body.success, true);
      assert.strictEqual(quoteRes.body.data.subtotalMinor, '70000');
      assert.strictEqual(quoteRes.body.data.taxMinor, '3500'); // 5% of 70000
      assert.strictEqual(quoteRes.body.data.totalMinor, '73500');
    });

    await test('4.2 Order placement creates real order with server-calculated total', async () => {
      const orderRes = await makeRequest(
        serverPort,
        'POST',
        '/api/restaurant/orders',
        { 'x-tenant-id': TEST_TENANT },
        {
          tableNumber: 'T-01',
          guestName: 'Rohan Mehta',
          items: [{ id: 'item_paneer_tikka', quantity: 1 }],
        }
      );
      assert.strictEqual(orderRes.status, 201);
      assert.strictEqual(orderRes.body.success, true);
      testOrderId = orderRes.body.data.orderId;
      assert.ok(testOrderId);
    });

    await test('4.3 Payment session creation recomputes server amounts (never trusts client amount)', async () => {
      const paymentOrderRes = await makeRequest(
        serverPort,
        'POST',
        '/api/restaurant/payments/create-order',
        { 'x-tenant-id': TEST_TENANT },
        {
          orderId: testOrderId,
          amountMinor: 10, // Tampered client amount! Should be overridden by server quote!
        }
      );
      assert.strictEqual(paymentOrderRes.status, 201);
      assert.strictEqual(paymentOrderRes.body.success, true);
      assert.strictEqual(paymentOrderRes.body.data.amountMinor, 36750); // 35000 + 5% tax = 36750
      testRazorpayOrderId = paymentOrderRes.body.data.razorpayOrderId;
      assert.ok(testRazorpayOrderId.startsWith('order_'));
    });

    await test('4.4 Webhook rejects invalid / forged signatures with HTTP 401', async () => {
      const webhookPayload = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_test_live_1',
              order_id: testRazorpayOrderId,
              amount: 36750,
              notes: { orderId: testOrderId, tenantId: TEST_TENANT },
            },
          },
        },
      });

      const res = await makeRequest(
        serverPort,
        'POST',
        '/api/restaurant/payments/webhook',
        {
          'x-razorpay-signature': 'forged_invalid_signature',
          'x-tenant-id': TEST_TENANT,
        },
        webhookPayload
      );
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.code, 'INVALID_SIGNATURE');
    });

    await test('4.5 Webhook captures payment, transitions order, and generates GST invoice', async () => {
      const webhookPayload = JSON.stringify({
        event: 'payment.captured',
        event_id: 'evt_test_webhook_live_1',
        payload: {
          payment: {
            entity: {
              id: 'pay_test_live_1',
              order_id: testRazorpayOrderId,
              amount: 36750,
              notes: { orderId: testOrderId, tenantId: TEST_TENANT },
            },
          },
        },
      });

      const validSig = crypto.createHmac('sha256', webhookSecret).update(webhookPayload).digest('hex');

      const res = await makeRequest(
        serverPort,
        'POST',
        '/api/restaurant/payments/webhook',
        {
          'x-razorpay-signature': validSig,
          'x-razorpay-event-id': 'evt_test_webhook_live_1',
          'x-tenant-id': TEST_TENANT,
        },
        webhookPayload
      );
      if (res.status !== 200 || !res.body.invoiceNumber) {
        console.error('Webhook error response:', res.status, res.body);
      }
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.status, 'captured');
      assert.ok(res.body.invoiceNumber?.startsWith('INV-'));

      // Test duplicate webhook replay (Idempotency)
      const duplicateRes = await makeRequest(
        serverPort,
        'POST',
        '/api/restaurant/payments/webhook',
        {
          'x-razorpay-signature': validSig,
          'x-razorpay-event-id': 'evt_test_webhook_live_1',
          'x-tenant-id': TEST_TENANT,
        },
        webhookPayload
      );
      assert.strictEqual(duplicateRes.status, 200);
      assert.strictEqual(duplicateRes.body.status, 'idempotent_duplicate');
    });

    await test('4.6 Invoice retrieval endpoint returns certified GST tax invoice with SAC 996331', async () => {
      const invRes = await makeRequest(
        serverPort,
        'GET',
        `/api/restaurant/invoices/${testOrderId}`,
        { 'x-tenant-id': TEST_TENANT }
      );
      assert.strictEqual(invRes.status, 200);
      assert.strictEqual(invRes.body.success, true);
      assert.strictEqual(invRes.body.data.orderId, testOrderId);
      assert.strictEqual(invRes.body.data.taxBreakdown.sacCode, SAC_RESTAURANT_SERVICES);
      assert.strictEqual(invRes.body.data.taxBreakdown.cgstRate, '2.5%');
      assert.strictEqual(invRes.body.data.taxBreakdown.sgstRate, '2.5%');
    });

    await test('4.7 Refund governance endpoint blocks unauthorized refund attempts', async () => {
      const unauthorizedRes = await makeRequest(
        serverPort,
        'POST',
        '/api/restaurant/payments/refund',
        { 'x-tenant-id': TEST_TENANT },
        {
          paymentId: 'pay_test_live_1',
          orderId: testOrderId,
          staffRole: 'WAITER',
          staffPinVerified: false,
        }
      );
      assert.strictEqual(unauthorizedRes.status, 403);
      assert.strictEqual(unauthorizedRes.body.code, 'REFUND_GOVERNANCE_BLOCKED');

      const authorizedRes = await makeRequest(
        serverPort,
        'POST',
        '/api/restaurant/payments/refund',
        { 'x-tenant-id': TEST_TENANT },
        {
          paymentId: 'pay_test_live_1',
          orderId: testOrderId,
          staffRole: 'MANAGER',
          staffPinVerified: true,
          reason: 'Customer requested cancellation prior to prep',
        }
      );
      assert.strictEqual(authorizedRes.status, 200);
      assert.strictEqual(authorizedRes.body.success, true);
      assert.strictEqual(authorizedRes.body.data.status, 'REFUND_AUTHORIZED');
    });
  } finally {
    serverProc.kill('SIGTERM');
  }

  // ─────────────────────────────────────────────────────────────
  // SUITE 5: COMPLIANCE INTEGRITY ASSERTIONS
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Suite 5: Compliance Integrity Assertions ---');

  await test('5.1 Level 4 Refund Governance status documented and enforced', async () => {
    // In accordance with Level 4 Refund Governance:
    // "External runtimes do not process refunds autonomously; all refunds require human staff PIN approval in staff portal or control plane intervention."
    const waiterCheck = adapter.checkRefundGovernance('WAITER', false);
    assert.strictEqual(waiterCheck.allowed, false);

    const unverifiedManager = adapter.checkRefundGovernance('MANAGER', false);
    assert.strictEqual(unverifiedManager.allowed, false);

    const verifiedManager = adapter.checkRefundGovernance('MANAGER', true);
    assert.strictEqual(verifiedManager.allowed, true);
  });

  await test('5.2 Indian GST statutory SAC Code 996331 is verified', async () => {
    assert.strictEqual(SAC_RESTAURANT_SERVICES, '996331');
    assert.strictEqual(typeof DEFAULT_PILOT_GSTIN, 'string');
    assert.strictEqual(DEFAULT_PILOT_GSTIN.length, 15);
  });

  console.log('\n=============================================================');
  console.log(`📊 PHASE 2 VERIFICATION RESULT: ${passed} / ${total} TESTS PASSED`);
  console.log('=============================================================\n');

  await prisma.$disconnect();
  if (passed < total) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
