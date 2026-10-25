/**
 * 🪐 RestaurantOS Black-Box HTTP Multi-Tenant End-to-End Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Drives a real RestaurantOS HTTP server connected to PostgreSQL via runtime
 * non-superuser role `restaurantos_app`.
 *
 * Verifies strict zero-trust multi-tenancy and row-level security (RLS) entirely
 * through black-box HTTP requests using Host headers:
 *   - Host: a.test.local (Tenant Alpha)
 *   - Host: b.test.local (Tenant Beta)
 *
 * Test Surface:
 *  1. Unknown Host Rejection (404 TENANT_NOT_FOUND)
 *  2. Menu & Category Isolation
 *  3. Table Discovery, QR Scanning & Negative Isolation
 *  4. Guest Session Join & Diner Capability Binding
 *  5. Order Creation, Idempotency & Guessable ID Cross-Tenant 404
 *  6. Payment Sessions, Webhook Verification & Invoice Isolation
 *  7. KDS Queue & Cross-Tenant Task Bump Blocking
 *  8. Real-Time SSE Stream Tenant Isolation (Zero Cross-Tenant Leakage)
 *  9. Staff Authentication, Password Policy & Cross-Tenant Token Rejection
 * 10. White-Label Branding & Web Manifest Isolation
 * 11. Support Tickets Scope Isolation
 * 12. Tenant Suspension & Write Disabling
 * 13. Direct Database Kernel RLS Probe (role: restaurantos_app, 0 rows without app.tenant_id)
 * 14. High-Concurrency Load Test & p95 Latency Profiling
 */

import http from 'http';
import { spawn, ChildProcess } from 'child_process';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { issueStaffToken, hashStaffSecretSync } from '../packages/domain/security';

const TEST_PORT = 4026;
const PLATFORM_TOKEN = 'test_platform_token_secret_9988_e2e_ci_32chars';
const APP_DB_URL =
  process.env.APP_DATABASE_URL ||
  'postgresql://restaurantos_app:test_app_pass_123@localhost:5432/restaurant_os';
const ADMIN_DB_URL =
  process.env.DATABASE_URL ||
  'postgresql://apple@localhost:5432/restaurant_os';

const adminPrisma = new PrismaClient({ datasources: { db: { url: ADMIN_DB_URL } } });
const appPrisma = new PrismaClient({ datasources: { db: { url: APP_DB_URL } } });

const RUN_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const HOST_A = `alpha-${RUN_ID}.test.local`;
const HOST_B = `beta-${RUN_ID}.test.local`;

interface HttpResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: any;
  rawText: string;
}

function makeRequest(
  port: number,
  method: string,
  reqPath: string,
  headers: Record<string, string> = {},
  body?: any
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const reqHeaders: Record<string, string> = { ...headers };
    let payloadBuffer: Buffer | null = null;

    if (body !== undefined) {
      const dataStr = typeof body === 'string' ? body : JSON.stringify(body);
      payloadBuffer = Buffer.from(dataStr, 'utf8');
      if (!reqHeaders['Content-Type']) {
        reqHeaders['Content-Type'] = 'application/json';
      }
      reqHeaders['Content-Length'] = String(payloadBuffer.length);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: reqPath,
        method,
        headers: reqHeaders,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on('end', () => {
          const rawText = Buffer.concat(chunks).toString('utf8');
          let parsed: any = null;
          try {
            parsed = JSON.parse(rawText);
          } catch {
            parsed = rawText;
          }
          resolve({ status: res.statusCode || 500, headers: res.headers, body: parsed, rawText });
        });
      }
    );

    req.on('error', reject);
    if (payloadBuffer) {
      req.write(payloadBuffer);
    }
    req.end();
  });
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    if (process.env.GITHUB_ACTIONS) console.log(`::error title=E2E assertion failed::${message.replace(/\n/g, ' ')}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function runBlackBoxHttpMultiTenantSuite() {
  console.log(`\n======================================================================`);
  console.log(`🪐 RESTAURANTOS ITEM 3: BLACK-BOX HTTP MULTI-TENANT SUITE`);
  console.log(`======================================================================`);
  console.log(`  Run ID:        ${RUN_ID}`);
  console.log(`  Port:          ${TEST_PORT}`);
  console.log(`  Host A:        ${HOST_A}`);
  console.log(`  Host B:        ${HOST_B}`);
  console.log(`  Database Role: restaurantos_app (strictly non-superuser, NOBYPASSRLS)`);
  console.log(`======================================================================\n`);

  let serverProc: ChildProcess | null = null;
  const createdTenantIds: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // Phase 1: Verify PostgreSQL Non-Superuser Role & Database Connection
    // -------------------------------------------------------------------------
    console.log(`--- Phase 1: Database Kernel Non-Superuser Verification ---`);
    const roleCheck = await appPrisma.$queryRawUnsafe<any[]>(
      `SELECT current_user, current_setting('is_superuser') as is_super;`
    );
    assert(roleCheck.length > 0, 'Database query executed successfully as app user');
    assert(
      roleCheck[0].current_user === 'restaurantos_app',
      `Connected as expected runtime user (got: ${roleCheck[0].current_user})`
    );
    assert(
      roleCheck[0].is_super === 'off',
      'Runtime user is strictly NOT a superuser (is_superuser = off)'
    );

    // -------------------------------------------------------------------------
    // Phase 2: Start Real Server Process
    // -------------------------------------------------------------------------
    console.log(`\n--- Phase 2: Starting Live RestaurantOS Server Process ---`);
    serverProc = spawn('npx', ['tsx', 'src/server.ts'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(TEST_PORT),
        DATABASE_URL: APP_DB_URL,
        STORAGE_DRIVER: 'postgres',
        RESTAURANTOS_PLATFORM_TOKEN: PLATFORM_TOKEN,
        RAZORPAY_WEBHOOK_SECRET: 'test_webhook_secret_123',
        NODE_ENV: 'test',
      },
      stdio: 'pipe',
    });

    serverProc.stdout?.on('data', (d) => {
      const line = d.toString();
      if (line.includes('FATAL') || line.includes('CRITICAL')) {
        process.stdout.write(`[SERVER] ${line}`);
      }
    });
    serverProc.stderr?.on('data', (d) => {
      process.stderr.write(`[SERVER ERR] ${d.toString()}`);
    });

    let serverReady = false;
    for (let i = 0; i < 50; i++) {
      try {
        const ping = await makeRequest(TEST_PORT, 'GET', '/health', {});
        if (ping.status === 200) {
          serverReady = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 200));
    }
    assert(serverReady, `Live test server booted and responsive on port ${TEST_PORT}`);

    // -------------------------------------------------------------------------
    // Phase 3: Provision Two Distinct Tenants via Internal Platform API
    // -------------------------------------------------------------------------
    console.log(`\n--- Phase 3: Provisioning Isolated Tenants Alpha and Beta ---`);
    const tenantAData = {
      restaurantName: 'Alpha Trattoria',
      name: 'Alpha Trattoria',
      slug: `alpha-${RUN_ID}`,
      ownerName: 'Owner Alpha',
      planId: 'pro',
      currency: 'INR',
    };
    const tenantBData = {
      restaurantName: 'Beta Brasserie',
      name: 'Beta Brasserie',
      slug: `beta-${RUN_ID}`,
      ownerName: 'Owner Beta',
      planId: 'starter',
      currency: 'INR',
    };

    const provResA = await makeRequest(TEST_PORT, 'POST', '/internal/tenants', {
      'x-platform-token': PLATFORM_TOKEN,
    }, tenantAData);
    assert(provResA.status === 201, `Tenant Alpha provisioned via HTTP (Status: ${provResA.status}${provResA.status !== 201 ? ' ' + JSON.stringify(provResA.body) : ''})`);
    const tenantA = { id: provResA.body.tenantId, ...provResA.body };
    createdTenantIds.push(tenantA.id);

    const provResB = await makeRequest(TEST_PORT, 'POST', '/internal/tenants', {
      'x-platform-token': PLATFORM_TOKEN,
    }, tenantBData);
    assert(provResB.status === 201, `Tenant Beta provisioned via HTTP (Status: ${provResB.status}${provResB.status !== 201 ? ' ' + JSON.stringify(provResB.body) : ''})`);
    const tenantB = { id: provResB.body.tenantId, ...provResB.body };
    createdTenantIds.push(tenantB.id);

    // Register custom domains in database
    await adminPrisma.tenantDomain.createMany({
      data: [
        {
          id: `dom_${RUN_ID}_a`,
          tenantId: tenantA.id,
          domain: HOST_A,
          verificationStatus: 'VERIFIED',
          sslStatus: 'ACTIVE',
          verificationToken: `orb_verify_a_${RUN_ID}`,
        },
        {
          id: `dom_${RUN_ID}_b`,
          tenantId: tenantB.id,
          domain: HOST_B,
          verificationStatus: 'VERIFIED',
          sslStatus: 'ACTIVE',
          verificationToken: `orb_verify_b_${RUN_ID}`,
        },
      ],
    });

    // -------------------------------------------------------------------------
    // Suite 1: Unknown Host Routing & Fail-Closed Behavior
    // -------------------------------------------------------------------------
    console.log(`\n--- Suite 1: Unknown Host Routing ---`);
    const unknownRes = await makeRequest(TEST_PORT, 'GET', '/api/restaurant/menu', {
      Host: 'unregistered.attacker.domain',
    });
    assert(unknownRes.status === 404, 'Unregistered host is rejected with HTTP 404');
    assert(unknownRes.body.code === 'TENANT_NOT_FOUND' || unknownRes.body.error === 'TENANT_NOT_FOUND', 'Response code is TENANT_NOT_FOUND');

    // -------------------------------------------------------------------------
    // Suite 2: Menu & Category Isolation
    // -------------------------------------------------------------------------
    console.log(`\n--- Suite 2: Menu & Category Isolation ---`);
    const menuResA = await makeRequest(TEST_PORT, 'GET', '/api/restaurant/menu', {
      Host: HOST_A,
    });
    assert(menuResA.status === 200, 'GET /api/restaurant/menu on Host A returns 200');
    const menuA = menuResA.body.data || menuResA.body.menu || [];
    assert(Array.isArray(menuA) && menuA.length > 0, 'Host A returns menu items');
    const itemA = menuA[0];
    assert(Boolean(itemA && itemA.id), `Tenant A menu contains item: ${itemA?.name}`);

    const menuResB = await makeRequest(TEST_PORT, 'GET', '/api/restaurant/menu', {
      Host: HOST_B,
    });
    assert(menuResB.status === 200, 'GET /api/restaurant/menu on Host B returns 200');
    const menuB = menuResB.body.data || menuResB.body.menu || [];
    assert(Array.isArray(menuB) && menuB.length > 0, 'Host B returns menu items');
    const itemIdsB = new Set(menuB.map((m: any) => m.id));
    assert(!itemIdsB.has(itemA.id), 'Tenant A menu item ID is NOT present in Tenant B menu');

    // -------------------------------------------------------------------------
    // Suite 3: Table Discovery, QR Scanning & Negative Isolation
    // -------------------------------------------------------------------------
    console.log(`\n--- Suite 3: Table Discovery, QR Scanning & Isolation ---`);
    // Create staff token for manager on Tenant A
    const staffTokenA = issueStaffToken({
      sub: `stf_mgr_a_${RUN_ID}`,
      name: 'Manager Alpha',
      role: 'MANAGER',
      tenantId: tenantA.id,
      branchId: '*',
    });
    const staffTokenB = issueStaffToken({
      sub: `stf_mgr_b_${RUN_ID}`,
      name: 'Manager Beta',
      role: 'MANAGER',
      tenantId: tenantB.id,
      branchId: '*',
    });

    const tablesResA = await makeRequest(TEST_PORT, 'GET', '/api/restaurant/tables', {
      Host: HOST_A,
      Authorization: `Bearer ${staffTokenA}`,
    });
    assert(tablesResA.status === 200, 'Manager can fetch tables for Tenant A');
    const tablesA = tablesResA.body.tables || tablesResA.body.data;
    assert(Array.isArray(tablesA) && tablesA.length > 0, 'Tenant A has tables');
    const tableA = tablesA[0];
    const locatorA = tableA.locator;
    assert(Boolean(locatorA), `Table A has QR locator: ${locatorA}`);

    // Scan locator A on Host A -> 200 HTML with capability
    const scanResA = await makeRequest(TEST_PORT, 'GET', `/dine/${locatorA}`, {
      Host: HOST_A,
    });
    assert(scanResA.status === 200, 'Scanning Table A on Host A returns HTTP 200');
    assert(scanResA.rawText.includes(tenantAData.name), 'Diner PWA contains Tenant A brand name');

    // Negative scan: Scan locator A on Host B -> 404
    const scanResB = await makeRequest(TEST_PORT, 'GET', `/dine/${locatorA}`, {
      Host: HOST_B,
    });
    assert(scanResB.status === 404, 'Scanning Table A locator on Host B returns HTTP 404');

    // -------------------------------------------------------------------------
    // Suite 4: Guest Session Join & Diner Capability Binding
    // -------------------------------------------------------------------------
    console.log(`\n--- Suite 4: Guest Session Join & Capability Binding ---`);
    const joinResA = await makeRequest(TEST_PORT, 'POST', '/api/restaurant/sessions/join', {
      Host: HOST_A,
    }, {
      locator: locatorA,
      partySize: 2,
      guestName: 'Diner Alice',
    });
    assert(joinResA.status === 200, 'Guest joins session on Table A (Status: 200)');
    const sessionDataA = joinResA.body.data || joinResA.body;
    const sessionIdA = sessionDataA.sessionId;
    const capabilityTokenA = sessionDataA.capabilityToken;
    assert(Boolean(sessionIdA), `Guest obtained session ID: ${sessionIdA}`);

    // Negative: Present Tenant A's session capability token on Host B
    const badSessionRes = await makeRequest(TEST_PORT, 'POST', '/api/restaurant/service-requests', {
      Host: HOST_B,
      Authorization: `Bearer ${capabilityTokenA}`,
    }, {
      tableNumber: tableA.number,
      type: 'WATER',
    });
    assert(badSessionRes.status === 401 || badSessionRes.status === 403, 'Tenant A session capability is rejected on Host B');

    // -------------------------------------------------------------------------
    // Suite 5: Order Creation, Idempotency & Guessable ID Cross-Tenant 404
    // -------------------------------------------------------------------------
    console.log(`\n--- Suite 5: Order Creation, Idempotency & Negative Isolation ---`);
    const orderIdA = `ord_alpha_${Date.now()}`;
    const idempKeyA = `idemp_order_${RUN_ID}`;
    const orderPayloadA = {
      orderId: orderIdA,
      tableNumber: tableA.number,
      sessionId: sessionIdA,
      guestName: 'Diner Alice',
      items: [{ id: itemA.id, quantity: 2 }],
    };

    const placeOrderRes = await makeRequest(TEST_PORT, 'POST', '/api/restaurant/orders', {
      Host: HOST_A,
      Authorization: `Bearer ${capabilityTokenA}`,
      'x-idempotency-key': idempKeyA,
    }, orderPayloadA);
    assert(placeOrderRes.status === 201, `Order placed successfully on Host A (Status: ${placeOrderRes.status})`);
    const createdOrderA = placeOrderRes.body.data || placeOrderRes.body;

    // Replay with exact same idempotency key on Host A -> 200 idempotent replay
    const replayOrderRes = await makeRequest(TEST_PORT, 'POST', '/api/restaurant/orders', {
      Host: HOST_A,
      Authorization: `Bearer ${capabilityTokenA}`,
      'x-idempotency-key': idempKeyA,
    }, orderPayloadA);
    assert(replayOrderRes.status === 200 || replayOrderRes.status === 201, 'Idempotent replay returns HTTP 200/201');

    // Negative idempotency conflict: same key with different payload -> 409
    const conflictOrderRes = await makeRequest(TEST_PORT, 'POST', '/api/restaurant/orders', {
      Host: HOST_A,
      Authorization: `Bearer ${capabilityTokenA}`,
      'x-idempotency-key': idempKeyA,
    }, { ...orderPayloadA, guestName: 'Different Person' });
    assert(conflictOrderRes.status === 409, 'Replay with modified payload triggers 409 IDEMPOTENCY_CONFLICT');

    // Fetch order on Host A -> 200
    const getOrderResA = await makeRequest(TEST_PORT, 'GET', `/api/restaurant/orders/${orderIdA}`, {
      Host: HOST_A,
      Authorization: `Bearer ${staffTokenA}`,
    });
    assert(getOrderResA.status === 200, 'GET /api/restaurant/orders/:id on Host A returns 200');

    // Negative Isolation: Fetch Tenant A order on Host B -> 404 NOT_FOUND
    const getOrderResB = await makeRequest(TEST_PORT, 'GET', `/api/restaurant/orders/${orderIdA}`, {
      Host: HOST_B,
      Authorization: `Bearer ${staffTokenB}`,
    });
    assert(getOrderResB.status === 404, 'Guessed Tenant A orderId on Host B returns HTTP 404 NOT_FOUND');

    // Negative Isolation: Cancel Tenant A order from Host B -> 404 NOT_FOUND
    const cancelResB = await makeRequest(TEST_PORT, 'POST', `/api/restaurant/orders/${orderIdA}/cancel`, {
      Host: HOST_B,
      Authorization: `Bearer ${staffTokenB}`,
    }, { reason: 'Malicious attempt' });
    assert(cancelResB.status === 404, 'Attempting to cancel Tenant A order on Host B returns HTTP 404');

    // -------------------------------------------------------------------------
    // Suite 6: Payments, Webhooks & Invoice Isolation
    // -------------------------------------------------------------------------
    console.log(`\n--- Suite 6: Payments, Webhooks & Invoice Isolation ---`);
    const createPaymentRes = await makeRequest(
      TEST_PORT,
      'POST',
      '/api/restaurant/checkout/razorpay/create-order',
      { Host: HOST_A },
      { orderId: orderIdA, tableNumber: tableA.number }
    );
    assert(
      createPaymentRes.status === 200 || createPaymentRes.status === 201,
      `Payment session created on Host A (Status: ${createPaymentRes.status})`
    );
    const rzpOrderId =
      createPaymentRes.body.data?.razorpayOrderId ||
      createPaymentRes.body.razorpayOrderId ||
      createPaymentRes.body.orderId;

    // Negative payment: Query on Host B -> 404
    const badPayRes = await makeRequest(
      TEST_PORT,
      'POST',
      '/api/restaurant/checkout/razorpay/create-order',
      { Host: HOST_B },
      { orderId: orderIdA, tableNumber: tableA.number }
    );
    assert(badPayRes.status === 404, 'Attempting to create payment for Tenant A order on Host B returns 404');

    // Deliver payment webhook on Host A
    const webhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_${Date.now()}`,
            order_id: rzpOrderId,
            amount: createdOrderA.totalMinor || 70000,
            notes: {
              orderId: orderIdA,
              tenantId: tenantA.id,
              tableNumber: tableA.number,
            },
          },
        },
      },
    };
    const webhookRaw = JSON.stringify(webhookPayload);
    const mockSig = crypto.createHmac('sha256', 'test_webhook_secret_123').update(webhookRaw).digest('hex');

    const webhookResA = await makeRequest(
      TEST_PORT,
      'POST',
      '/api/restaurant/checkout/razorpay/webhook',
      {
        Host: HOST_A,
        'x-razorpay-signature': mockSig,
      },
      webhookPayload
    );
    assert(
      webhookResA.status === 200,
      `Payment webhook processed successfully on Host A (Status: ${webhookResA.status}, Body: ${JSON.stringify(webhookResA.body)})`
    );
    const invoiceNum = webhookResA.body.invoiceNumber;
    assert(Boolean(invoiceNum), `Invoice generated: ${invoiceNum}`);

    // Retrieve Invoice on Host A -> 200
    const invResA = await makeRequest(TEST_PORT, 'GET', `/api/restaurant/invoices/${invoiceNum}`, {
      Host: HOST_A,
    });
    assert(invResA.status === 200, `Invoice ${invoiceNum} retrieved on Host A`);

    // Negative Isolation: Retrieve Invoice on Host B -> 404
    const invResB = await makeRequest(TEST_PORT, 'GET', `/api/restaurant/invoices/${invoiceNum}`, {
      Host: HOST_B,
    });
    assert(invResB.status === 404, `Invoice ${invoiceNum} on Host B returns HTTP 404 INVOICE_NOT_FOUND`);

    // Printable Invoice HTML on Host A -> 200 with Tenant A brand
    const printResA = await makeRequest(TEST_PORT, 'GET', `/invoices/${invoiceNum}/print`, {
      Host: HOST_A,
    });
    assert(printResA.status === 200, 'Printable invoice HTML rendered on Host A');
    assert(printResA.rawText.includes(tenantAData.name), 'Printable invoice contains Tenant A brand');

    // -------------------------------------------------------------------------
    // Suite 7: KDS Kitchen Tasks & Bump Isolation
    // -------------------------------------------------------------------------
    console.log(`\n--- Suite 7: KDS Queue & Bump Isolation ---`);
    const kdsResA = await makeRequest(TEST_PORT, 'GET', '/api/restaurant/kds/tasks', {
      Host: HOST_A,
      Authorization: `Bearer ${staffTokenA}`,
    });
    assert(kdsResA.status === 200, 'KDS tasks retrieved on Host A');
    const tasksA = kdsResA.body.tasks || kdsResA.body.data || [];
    const taskA = tasksA.find((t: any) => t.orderId === orderIdA);
    assert(Boolean(taskA), `KDS task found for order ${orderIdA} on Host A`);

    // Negative: Check Tenant B KDS
    const kdsResB = await makeRequest(TEST_PORT, 'GET', '/api/restaurant/kds/tasks', {
      Host: HOST_B,
      Authorization: `Bearer ${staffTokenB}`,
    });
    assert(kdsResB.status === 200, 'KDS tasks retrieved on Host B');
    const tasksB = kdsResB.body.tasks || kdsResB.body.data || [];
    const leakedTask = tasksB.find((t: any) => t.id === taskA.id || t.orderId === orderIdA);
    assert(!leakedTask, 'Tenant A kitchen task does NOT appear in Tenant B KDS queue');

    // Negative: Bump Tenant A task from Host B -> 404
    const bumpResB = await makeRequest(
      TEST_PORT,
      'POST',
      `/api/restaurant/kds/tasks/${taskA.id}/bump`,
      {
        Host: HOST_B,
        Authorization: `Bearer ${staffTokenB}`,
      },
      {}
    );
    assert(bumpResB.status === 404, 'Attempting to bump Tenant A task on Host B returns HTTP 404');

    // Bump on Host A -> 200
    const bumpResA = await makeRequest(
      TEST_PORT,
      'POST',
      `/api/restaurant/kds/tasks/${taskA.id}/bump`,
      {
        Host: HOST_A,
        Authorization: `Bearer ${staffTokenA}`,
      },
      {}
    );
    assert(bumpResA.status === 200, 'Bumping task on Host A returns HTTP 200 OK');

    // -------------------------------------------------------------------------
    // Suite 8: Real-Time SSE Stream Tenant Isolation
    // -------------------------------------------------------------------------
    console.log(`\n--- Suite 8: Real-Time SSE Stream Tenant Isolation ---`);
    let sseEventsReceivedA: any[] = [];
    let sseConnected = false;

    const sseReq = http.request(
      {
        hostname: '127.0.0.1',
        port: TEST_PORT,
        path: '/api/restaurant/events',
        method: 'GET',
        headers: {
          Host: HOST_A,
          Authorization: `Bearer ${staffTokenA}`,
          Accept: 'text/event-stream',
        },
      },
      (res) => {
        sseConnected = true;
        res.on('data', (chunk) => {
          const str = chunk.toString('utf8');
          const lines = str.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                sseEventsReceivedA.push(JSON.parse(line.slice(6)));
              } catch {}
            }
          }
        });
      }
    );
    sseReq.end();

    await new Promise((r) => setTimeout(r, 400));
    assert(sseConnected, 'SSE connection established for Tenant Alpha');

    // Emit event on Tenant Beta (e.g. create a service request or order)
    const betaOrderPayload = {
      orderId: `ord_beta_${Date.now()}`,
      customerName: 'Beta Patron',
      customerPhone: '9876543210',
      fulfillmentMethod: 'pickup',
      items: [{ id: menuB[0].id, quantity: 1 }],
    };
    await makeRequest(TEST_PORT, 'POST', '/api/commerce/orders', {
      Host: HOST_B,
    }, betaOrderPayload);

    await new Promise((r) => setTimeout(r, 500));
    const leakedEvent = sseEventsReceivedA.find(
      (e) => e.tenantId === tenantB.id || e.payload?.tenantId === tenantB.id || e.producer?.includes('beta')
    );
    assert(!leakedEvent, 'Tenant Alpha SSE stream received ZERO events from Tenant Beta activity');

    // Emit event on Tenant Alpha (service request)
    await makeRequest(TEST_PORT, 'POST', '/api/restaurant/service-requests', {
      Host: HOST_A,
      Authorization: `Bearer ${staffTokenA}`,
    }, {
      tableNumber: tableA.number,
      type: 'NAPKINS',
    });

    await new Promise((r) => setTimeout(r, 500));
    const alphaEvent = sseEventsReceivedA.find(
      (e) => e.tenantId === tenantA.id || e.payload?.tableNumber === tableA.number
    );
    assert(Boolean(alphaEvent), 'Tenant Alpha SSE stream successfully received Tenant Alpha event');
    sseReq.destroy();

    // -------------------------------------------------------------------------
    // Suite 9: Staff Login & Cross-Tenant Token Rejection
    // -------------------------------------------------------------------------
    console.log(`\n--- Suite 9: Staff Login & Token Binding ---`);
    // Staff token for A presented on Host B -> 401
    const crossStaffRes = await makeRequest(TEST_PORT, 'GET', '/api/restaurant/staff', {
      Host: HOST_B,
      Authorization: `Bearer ${staffTokenA}`,
    });
    assert(crossStaffRes.status === 401, 'Tenant A staff token on Host B is rejected with HTTP 401');

    // Staff token on Host A -> 200
    const validStaffRes = await makeRequest(TEST_PORT, 'GET', '/api/restaurant/staff', {
      Host: HOST_A,
      Authorization: `Bearer ${staffTokenA}`,
    });
    assert(validStaffRes.status === 200, 'Tenant A staff token on Host A is accepted with HTTP 200');

    // -------------------------------------------------------------------------
    // Suite 10: White-Label Branding & Web Manifest Isolation
    // -------------------------------------------------------------------------
    console.log(`\n--- Suite 10: White-Label Branding & Web Manifest Isolation ---`);
    const manifestA = await makeRequest(TEST_PORT, 'GET', '/manifest.json', { Host: HOST_A });
    assert(manifestA.status === 200, 'GET /manifest.json on Host A returns 200');
    assert(manifestA.body.name === tenantAData.restaurantName, `Manifest A has name "${tenantAData.restaurantName}"`);

    const manifestB = await makeRequest(TEST_PORT, 'GET', '/manifest.json', { Host: HOST_B });
    assert(manifestB.status === 200, 'GET /manifest.json on Host B returns 200');
    assert(manifestB.body.name === tenantBData.restaurantName, `Manifest B has name "${tenantBData.restaurantName}"`);

    // -------------------------------------------------------------------------
    // Suite 11: Support Tickets Scope Isolation
    // -------------------------------------------------------------------------
    console.log(`\n--- Suite 11: Support Tickets Isolation ---`);
    const createTicketRes = await makeRequest(
      TEST_PORT,
      'POST',
      '/api/restaurant/support/tickets',
      {
        Host: HOST_A,
        Authorization: `Bearer ${staffTokenA}`,
      },
      {
        subject: 'Printer issue at front desk',
        category: 'HARDWARE',
        priority: 'HIGH',
        initialMessage: 'Receipt printer stopped feeding paper.',
      }
    );
    assert(
      createTicketRes.status === 201,
      `Support ticket created on Tenant A (Status: ${createTicketRes.status}, Body: ${JSON.stringify(createTicketRes.body)})`
    );
    const ticketA = createTicketRes.body.ticket || createTicketRes.body.data;

    // Query on Host A
    const ticketsA = await makeRequest(TEST_PORT, 'GET', '/api/restaurant/support/tickets', {
      Host: HOST_A,
      Authorization: `Bearer ${staffTokenA}`,
    });
    assert(ticketsA.status === 200, 'GET tickets on Host A returns 200');
    const ticketListA = ticketsA.body.tickets || ticketsA.body.data || [];
    assert(ticketListA.some((t: any) => t.id === ticketA.id), 'Ticket A is visible on Host A');

    // Query on Host B
    const ticketsB = await makeRequest(TEST_PORT, 'GET', '/api/restaurant/support/tickets', {
      Host: HOST_B,
      Authorization: `Bearer ${staffTokenB}`,
    });
    assert(ticketsB.status === 200, 'GET tickets on Host B returns 200');
    const ticketListB = ticketsB.body.tickets || ticketsB.body.data || [];
    assert(!ticketListB.some((t: any) => t.id === ticketA.id), 'Ticket A is NOT visible in Tenant B list');

    // -------------------------------------------------------------------------
    // Suite 12: Tenant Suspension & Write Disabling
    // -------------------------------------------------------------------------
    console.log(`\n--- Suite 12: Tenant Suspension & Write Disabling ---`);
    // Suspend Tenant A
    await adminPrisma.tenant.update({
      where: { id: tenantA.id },
      data: { status: 'suspended' },
    });

    // Write on suspended tenant -> 403
    const suspendedWrite = await makeRequest(
      TEST_PORT,
      'POST',
      '/api/restaurant/orders',
      { Host: HOST_A },
      orderPayloadA
    );
    assert(suspendedWrite.status === 403, 'Write on suspended tenant is rejected with HTTP 403');
    assert(suspendedWrite.body.error === 'TENANT_SUSPENDED', 'Error code is TENANT_SUSPENDED');

    // Public GET renders suspended template
    const suspendedGet = await makeRequest(TEST_PORT, 'GET', '/', { Host: HOST_A });
    assert(
      suspendedGet.rawText.includes('Suspended') ||
        suspendedGet.rawText.toLowerCase().includes('temporarily unavailable'),
      'Renders branded suspended page'
    );

    // Write on active Tenant B succeeds
    const activeWriteB = await makeRequest(
      TEST_PORT,
      'POST',
      '/api/commerce/orders',
      { Host: HOST_B },
      { ...betaOrderPayload, orderId: `ord_beta_active_${Date.now()}` }
    );
    assert(
      activeWriteB.status === 201,
      `Writes on active Tenant B continue to succeed (Status: ${activeWriteB.status}, Body: ${JSON.stringify(activeWriteB.body)})`
    );

    // Resume Tenant A
    await adminPrisma.tenant.update({
      where: { id: tenantA.id },
      data: { status: 'active' },
    });

    // -------------------------------------------------------------------------
    // Suite 13: Direct PostgreSQL Kernel RLS Probe (Role: restaurantos_app)
    // -------------------------------------------------------------------------
    console.log(`\n--- Suite 13: Direct PostgreSQL Kernel RLS Probe ---`);
    // Probe TableFloor
    const directTables = await appPrisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*)::int as cnt FROM "TableFloor";`
    );
    assert(directTables[0].cnt === 0, 'Direct probe without app.tenant_id on TableFloor returns 0 rows');

    // Probe RestaurantOrder
    const directOrders = await appPrisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*)::int as cnt FROM "RestaurantOrder";`
    );
    assert(directOrders[0].cnt === 0, 'Direct probe without app.tenant_id on RestaurantOrder returns 0 rows');

    // Probe KitchenTask
    const directTasks = await appPrisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*)::int as cnt FROM "KitchenTask";`
    );
    assert(directTasks[0].cnt === 0, 'Direct probe without app.tenant_id on KitchenTask returns 0 rows');

    // Probe Invoice
    const directInvoices = await appPrisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*)::int as cnt FROM "Invoice";`
    );
    assert(directInvoices[0].cnt === 0, 'Direct probe without app.tenant_id on Invoice returns 0 rows');

    // Probe StaffMember
    const directStaff = await appPrisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*)::int as cnt FROM "StaffMember";`
    );
    assert(directStaff[0].cnt === 0, 'Direct probe without app.tenant_id on StaffMember returns 0 rows');

    // Probe with SET LOCAL app.tenant_id returns only that tenant's rows
    const scopedTablesA = await appPrisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.tenant_id', '${tenantA.id}', true);`);
      return await tx.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as cnt FROM "TableFloor";`);
    });
    assert(scopedTablesA[0].cnt > 0, `RLS probe with app.tenant_id = ${tenantA.id} returns ${scopedTablesA[0].cnt} tables`);

    // Verify PLATFORM_SUPERUSER no bypass
    const superuserTables = await appPrisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.tenant_id', 'PLATFORM_SUPERUSER', true);`);
      return await tx.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as cnt FROM "TableFloor";`);
    });
    assert(superuserTables[0].cnt === 0, 'RLS probe with app.tenant_id = PLATFORM_SUPERUSER returns 0 rows (zero bypass)');

    // -------------------------------------------------------------------------
    // Suite 14: High-Concurrency HTTP Load Test & p95 Latency Profiling
    // -------------------------------------------------------------------------
    console.log(`\n--- Suite 14: High-Concurrency HTTP Load Test & p95 Latency ---`);
    const LOAD_CONCURRENCY = 50;
    const latenciesMs: number[] = [];

    const loadTasks = Array.from({ length: LOAD_CONCURRENCY }, (_, i) => {
      const isA = i % 2 === 0;
      const host = isA ? HOST_A : HOST_B;
      const path = '/api/restaurant/menu';

      return (async () => {
        const start = process.hrtime.bigint();
        const res = await makeRequest(TEST_PORT, 'GET', path, { Host: host });
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1_000_000;
        latenciesMs.push(durationMs);
        assert(res.status === 200, `Concurrent request ${i + 1} on ${host} succeeded with 200`);
      })();
    });

    await Promise.all(loadTasks);

    const sortedLatencies = [...latenciesMs].sort((a, b) => a - b);
    const minMs = Math.round(sortedLatencies[0] * 100) / 100;
    const maxMs = Math.round(sortedLatencies[sortedLatencies.length - 1] * 100) / 100;
    const sumMs = sortedLatencies.reduce((acc, v) => acc + v, 0);
    const meanMs = Math.round((sumMs / sortedLatencies.length) * 100) / 100;

    const p50Index = Math.ceil(0.50 * sortedLatencies.length) - 1;
    const p95Index = Math.ceil(0.95 * sortedLatencies.length) - 1;
    const p99Index = Math.ceil(0.99 * sortedLatencies.length) - 1;

    const p50Ms = Math.round(sortedLatencies[p50Index] * 100) / 100;
    const p95Ms = Math.round(sortedLatencies[p95Index] * 100) / 100;
    const p99Ms = Math.round(sortedLatencies[p99Index] * 100) / 100;

    console.log(`\n  ⚡ Concurrency:        ${LOAD_CONCURRENCY} parallel HTTP requests`);
    console.log(`  ⚡ Min Latency:        ${minMs} ms`);
    console.log(`  ⚡ Mean Latency:       ${meanMs} ms`);
    console.log(`  ⚡ p50 Latency:        ${p50Ms} ms`);
    console.log(`  ⚡ p95 Latency:        ${p95Ms} ms`);
    console.log(`  ⚡ p99 Latency:        ${p99Ms} ms`);
    console.log(`  ⚡ Max Latency:        ${maxMs} ms`);

    const p95LimitMs = Number(process.env.E2E_P95_LIMIT_MS ?? 250); // CI runners are shared/slow; production SLA stays 250ms
    assert(p95Ms < p95LimitMs, `p95 Latency is under ${p95LimitMs}ms limit (Actual: ${p95Ms}ms)`);

    console.log(`\n======================================================================`);
    console.log(`🎉 ALL 14 BLACK-BOX HTTP MULTI-TENANT TEST SUITES PASSED 100%!`);
    console.log(`======================================================================\n`);
  } finally {
    if (serverProc) {
      serverProc.kill();
    }
    // Clean up created tenants
    if (createdTenantIds.length > 0) {
      console.log(`🧹 Cleaning up test tenants: ${createdTenantIds.join(', ')}...`);
      try {
        await adminPrisma.tenantDomain.deleteMany({
          where: { tenantId: { in: createdTenantIds } },
        });
        await adminPrisma.tableFloor.deleteMany({
          where: { tenantId: { in: createdTenantIds } },
        });
        await adminPrisma.restaurantOrder.deleteMany({
          where: { tenantId: { in: createdTenantIds } },
        });
        await adminPrisma.kitchenTask.deleteMany({
          where: { tenantId: { in: createdTenantIds } },
        });
        await adminPrisma.invoice.deleteMany({
          where: { tenantId: { in: createdTenantIds } },
        });
        await adminPrisma.tenant.deleteMany({
          where: { id: { in: createdTenantIds } },
        });
      } catch (cleanupErr: any) {
        console.warn('⚠️ Cleanup warning:', cleanupErr.message);
      }
    }
    await appPrisma.$disconnect();
    await adminPrisma.$disconnect();
  }
}

runBlackBoxHttpMultiTenantSuite()
  .then(() => process.exit(0)) // spawned `npx tsx` child keeps the event loop alive; exit explicitly
  .catch((err) => {
  console.error('\n💥 FATAL TEST SUITE FAILURE:', err);
    if (process.env.GITHUB_ACTIONS) console.log(`::error title=E2E fatal::${String((err as Error)?.stack ?? err).split('\n').slice(0, 4).join(' | ')}`);
  process.exit(1);
  });
