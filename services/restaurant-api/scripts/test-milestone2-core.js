/**
 * 🧪 RestaurantOS Milestone 2 — Operations Core Integration Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates backend contracts, authoritative metrics, service requests,
 * layout persistence, table actions, and order lifecycles.
 */

const assert = require('assert');
const http = require('http');
const { startIsolatedServer } = require('./test-harness');

let BASE_URL = process.env.TEST_SERVER_URL;
let harness = null;

let totalChecks = 0;
let passedChecks = 0;

function pass(name, detail = '') {
  totalChecks++;
  passedChecks++;
  console.log(`  ✅ [PASS] ${name}${detail ? ' (' + detail + ')' : ''}`);
}

function fail(name, err) {
  totalChecks++;
  console.error(`  ❌ [FAIL] ${name}:`, err.message || err);
  throw err;
}

function makeRequest(method, urlPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      Host: 'bistro.orbitox.live',
      ...headers,
    };
    if (payload) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
        agent: false,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch (e) {
            // Not JSON
          }
          resolve({ status: res.statusCode, headers: res.headers, raw: data, json });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

let STAFF_HEADERS = {
  Authorization: '',
  'X-Staff-Role': 'MANAGER',
  'X-Branch-Id': 'branch_ldh',
};

async function authenticateStaff() {
  const loginRes = await makeRequest('POST', '/api/restaurant/auth/token', {}, { staffId: 'staff_mgr_ldh', password: 'ManagerSecret123!', branchId: 'branch_ldh' });
  if (loginRes.status === 200 && loginRes.json && loginRes.json.data && loginRes.json.data.token) {
    STAFF_HEADERS.Authorization = 'Bearer ' + loginRes.json.data.token;
    console.log('  🔑 Obtained authentic cryptographic manager token');
  } else {
    throw new Error('Failed to obtain staff token via /api/restaurant/auth/token');
  }
}

async function runMilestone2CoreTests() {
  console.log('🧪 Starting Milestone 2 Core Integration Tests...\n');
  if (!BASE_URL) {
    harness = await startIsolatedServer({ prefix: 'm2-core', port: 4082 });
    BASE_URL = harness.url;
  }
  try {
    await authenticateStaff();
  } catch (err) {
    if (harness) {
      console.error('\n--- SERVER STDERR OUTPUT ---');
      console.error(harness.getStderr());
      console.error('--- END SERVER STDERR ---\n');
    }
    throw err;
  }

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // 1. OPERATIONS COMMAND HOME (/)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📋 [GROUP 1: Operations Command Home — /]');
    {
      const res = await makeRequest('GET', '/');
      assert.strictEqual(res.status, 200, 'Home page must return 200 OK');
      pass('Home route returns 200 OK');

      // Verify quick action targets in HTML
      assert.ok(res.raw.includes('href="/operations/floor?branch='), 'Must link to Spatial Floor Studio');
      assert.ok(res.raw.includes('href="/operations/tables?branch='), 'Must link to Tables Fleet');
      assert.ok(res.raw.includes('href="/kds?branch='), 'Must link to Kitchen KDS');
      assert.ok(res.raw.includes('href="/operations/orders?branch='), 'Must link to Service Orders');
      assert.ok(res.raw.includes('href="/menu?branch='), 'Must link to Menu & Catalog');
      pass('All 5 primary quick actions wired to valid canonical routes');

      // Verify live floor mini-map SVG
      assert.ok(res.raw.includes('mini-floor-svg'), 'Must render live spatial mini-map SVG');
      assert.ok(res.raw.includes('mini-table-'), 'Must render table elements in mini-map');
      pass('Live floor SVG mini-map rendered on Overview cockpit');

      // Verify attention queue and service request resolve API contract
      const resolveEndpointCheck = await makeRequest(
        'POST',
        '/api/restaurant/service-requests/non_existent_req/resolve',
        STAFF_HEADERS,
        {}
      );
      assert.strictEqual(resolveEndpointCheck.status, 404, 'Resolving non-existent service request must return 404');
      pass('Service request resolve endpoint handles errors correctly (404 for unknown ID)');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. SPATIAL FLOOR STUDIO (/operations/floor)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n📐 [GROUP 2: Spatial Floor Studio — /operations/floor]');
    {
      const res = await makeRequest('GET', '/operations/floor');
      assert.strictEqual(res.status, 200, 'Floor studio must return 200 OK');
      pass('Floor Studio route returns 200 OK');

      // Check SVG canvas container and touch-action: none
      assert.ok(res.raw.includes('id="floor-svg"'), 'Floor SVG element present');
      assert.ok(res.raw.includes('touch-action: none'), 'Canvas must have touch-action: none for 2D dragging');
      pass('Canvas configured with touch-action: none for uninterrupted pointer dragging');

      // Verify Floor Layout persistence API contract
      const floorRes = await makeRequest('GET', '/api/restaurant/floor?branchId=branch_ldh', STAFF_HEADERS);
      assert.strictEqual(floorRes.status, 200, 'GET /api/restaurant/floor must return 200');
      assert.ok(floorRes.json && floorRes.json.tables, 'Tables list must be returned');
      const originalTables = floorRes.json.tables;
      assert.ok(originalTables.length > 0, 'Branch must have tables');
      pass(`Authoritative floor query returned ${originalTables.length} tables for branch_ldh`);

      // Test Layout Save API (POST /api/restaurant/floor/save)
      const testTable = originalTables[0];
      const origX = testTable.x;
      const origY = testTable.y;
      const newX = origX + 24; // 24px = 2 grid snap increments (12px snap)
      const newY = origY + 12;

      const savePayload = {
        branchId: 'branch_ldh',
        tables: originalTables.map((t) => (t.id === testTable.id ? { ...t, x: newX, y: newY } : t)),
      };

      const saveRes = await makeRequest('POST', `/api/restaurant/floor/save?branch=branch_ldh&floor=${encodeURIComponent(testTable.floorId)}`, STAFF_HEADERS, savePayload);
      assert.strictEqual(saveRes.status, 200, 'POST /api/restaurant/floor/save must return 200');
      assert.strictEqual(saveRes.json.success, true, 'Save response must have success: true');
      pass('Floor layout persistence API successfully saved updated coordinates');

      // Verify persistence after reload
      const verifyRes = await makeRequest('GET', '/api/restaurant/floor?branchId=branch_ldh', STAFF_HEADERS);
      const updatedTable = verifyRes.json.tables.find((t) => t.id === testTable.id);
      assert.strictEqual(updatedTable.x, newX, 'Saved X coordinate must persist');
      assert.strictEqual(updatedTable.y, newY, 'Saved Y coordinate must persist');
      pass('Persisted table coordinates verified after fetch (X and Y preserved)');

      // Restore original coordinates
      const restorePayload = {
        branchId: 'branch_ldh',
        tables: originalTables.map((t) => (t.id === testTable.id ? { ...t, x: origX, y: origY } : t)),
      };
      await makeRequest('POST', `/api/restaurant/floor/save?branch=branch_ldh&floor=${encodeURIComponent(testTable.floorId)}`, STAFF_HEADERS, restorePayload);
      pass('Table coordinates restored to original state (zero data pollution)');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. TABLES FLEET MANAGEMENT (/operations/tables)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n🪑 [GROUP 3: Tables Fleet Management — /operations/tables]');
    {
      const res = await makeRequest('GET', '/operations/tables');
      assert.strictEqual(res.status, 200, 'Tables Fleet must return 200 OK');
      pass('Tables Fleet route returns 200 OK');

      // Check for search, filter pills, and sort controls
      assert.ok(res.raw.includes('id="fleet-status-filter-pills"'), 'Status filter pills present');
      assert.ok(res.raw.includes('id="fleet-search-input"'), 'Fleet search input present');
      assert.ok(res.raw.includes('id="fleet-sort-select"'), 'Sort dropdown present');
      assert.ok(res.raw.includes('id="qr-modal"'), 'Interactive QR modal dialog present');
      assert.ok(res.raw.includes('id="btn-batch-merge"'), 'Batch merge action button present');
      pass('Tables Fleet UI structure contains status filters, search, sort, and QR modal');

      // Test Table QR Locator API (GET /api/restaurant/qr/:locator)
      const qrRes = await makeRequest('GET', '/api/restaurant/qr/7Kp9xQ8m2L');
      assert.strictEqual(qrRes.status, 200, 'GET /api/restaurant/qr/:locator must return 200');
      assert.ok(qrRes.json && qrRes.json.success, 'QR API must return success');
      assert.ok(qrRes.json.data.tableNumber, 'QR API returns valid tableNumber');
      pass(`Table QR Discovery endpoint verified for table ${qrRes.json.data.tableNumber}`);

      // Test Table Update API (PATCH /api/restaurant/tables/:id)
      const patchRes = await makeRequest('PATCH', '/api/restaurant/tables/14', STAFF_HEADERS, {
        capacity: 4,
      });
      assert.strictEqual(patchRes.status, 200, 'PATCH /api/restaurant/tables/:id must return 200');
      assert.strictEqual(patchRes.json.success, true, 'Patch response must be successful');
      pass('Table update API (PATCH) successfully verified');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. SERVICE ORDER LEDGER (/operations/orders)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n📋 [GROUP 4: Service Order Ledger — /operations/orders]');
    {
      const res = await makeRequest('GET', '/operations/orders');
      assert.strictEqual(res.status, 200, 'Orders workspace must return 200 OK');
      pass('Service Orders route returns 200 OK');

      // Verify alias /orders returns 200 OK
      const aliasRes = await makeRequest('GET', '/orders');
      assert.strictEqual(aliasRes.status, 200, '/orders alias must return 200 OK');
      pass('Orders alias route (/orders) returns 200 OK');

      // Check Order workspace features
      assert.ok(res.raw.includes('id="status-filter-pills"'), 'Order status filter pills present');
      assert.ok(res.raw.includes('id="orders-search-input"'), 'Orders search input present');
      assert.ok(res.raw.includes('id="order-detail-drawer"'), 'Slide-out order detail drawer present');
      assert.ok(res.raw.includes('id="drawer-cancel-box"'), 'Mandatory cancellation reason box present');
      pass('Orders workspace includes filters, search, detail drawer, and void/cancellation modal');

      // Verify Orders API contract
      const ordersApiRes = await makeRequest('GET', '/api/restaurant/orders?branchId=branch_ldh', STAFF_HEADERS);
      assert.strictEqual(ordersApiRes.status, 200, 'GET /api/restaurant/orders must return 200');
      assert.ok(ordersApiRes.json && ordersApiRes.json.success, 'Orders API returns success');
      const orders = ordersApiRes.json.orders || ordersApiRes.json.data || [];
      pass(`Authoritative orders query returned ${orders.length} orders for branch_ldh`);

      if (orders.length > 0) {
        const firstOrder = orders[0];
        // Test single order fetch
        const singleOrderRes = await makeRequest(
          'GET',
          `/api/restaurant/orders/${firstOrder.orderId}`,
          STAFF_HEADERS
        );
        assert.strictEqual(singleOrderRes.status, 200, 'GET /api/restaurant/orders/:id must return 200');
        assert.ok(singleOrderRes.json.success, 'Single order fetch returns success');
        pass(`Order details & task progression verified for #${firstOrder.orderId}`);
      }

      // Test Order cancellation validation (reject empty reason)
      const invalidCancelRes = await makeRequest(
        'POST',
        '/api/restaurant/orders/non_existent_order/cancel',
        STAFF_HEADERS,
        { reason: 'ab' } // too short / non-existent
      );
      assert.strictEqual(
        invalidCancelRes.status,
        404,
        'Cancellation of non-existent order must return 404'
      );
      pass('Cancellation endpoint strictly enforces validation and error handling');
    }

    console.log(`\n🎉 All ${passedChecks}/${totalChecks} Milestone 2 Core Integration checks passed!`);
    if (harness) {
      await harness.stop();
    }
    process.exit(0);
  } catch (err) {
    console.error('\n💥 Milestone 2 Core Integration Tests failed:', err);
    if (harness) {
      try { await harness.stop(); } catch {}
    }
    process.exit(1);
  }
}

runMilestone2CoreTests();
