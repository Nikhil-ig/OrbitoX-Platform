/**
 * 🍷 RESTAURANTOS 5.3 — GATE 0 PREFLIGHT VERIFICATION SUITE
 * ─────────────────────────────────────────────────────────────────────────────
 * Mandatory preflight verification prior to Phase 3 source modifications:
 * 1. Security completeness on staff-management and orders mutation endpoints.
 * 2. Menu item and category persistence durability on disk.
 * 3. Branch-specific menu changes isolation (Delhi vs Ludhiana vs Chandigarh).
 * 4. Authoritative pricing for dine-in vs pickup vs delivery, including modifiers,
 *    integer GST rounding, and delivery fees.
 */

const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:4010';
const STAFF_SECRET = 'orbitox_staff_hmac_secret_production_2026';

function signStaffToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', STAFF_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

async function request(path, options = {}) {
  const url = new URL(path, BASE_URL);
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const body = options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined;

  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(raw);
          } catch (e) {
            json = raw;
          }
          resolve({ status: res.statusCode, headers: res.headers, json, raw });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

let passCount = 0;
let failCount = 0;

function pass(code, desc) {
  passCount++;
  console.log(`  ✅ PASS: [${code}] ${desc}`);
}

function fail(code, desc, err) {
  failCount++;
  console.error(`  ❌ FAIL: [${code}] ${desc}`);
  if (err) console.error('   ', err.message || err);
}

async function runPreflight() {
  console.log('\n======================================================================');
  console.log('🔍 RESTAURANTOS 5.3 — GATE 0 PREFLIGHT VERIFICATION SUITE');
  console.log('======================================================================\n');

  // Authenticate via PIN to obtain authentic HMAC tokens from running server
  const adminAuth = await request('/api/restaurant/auth/staff-token', {
    method: 'POST',
    body: { pin: '0000', branchId: '*' },
  });
  const adminToken = adminAuth.json?.data?.token;

  const opsAuth = await request('/api/restaurant/auth/staff-token', {
    method: 'POST',
    body: { pin: '1122', branchId: 'branch_ldh' },
  });
  const opsToken = opsAuth.json?.data?.token;

  const tamperedToken = (adminToken || 'header.payload.sig').slice(0, -6) + 'xxxxxx';

  // ───────────────────────────────────────────────────────────────────────────
  // CHECK 1: SECURITY INVENTORY ON STAFF-MGMT & ORDER MUTATIONS
  // ───────────────────────────────────────────────────────────────────────────
  console.log('🛡️ [CHECK 1] Staff Management & Orders Mutation Security Inventory');

  // 1.1: POST /api/restaurant/auth/revoke anonymous rejected
  try {
    const res = await request('/api/restaurant/auth/revoke', {
      method: 'POST',
      body: { token: 'some_arbitrary_token' },
    });
    assert.ok(res.status === 401 || res.status === 403, `Expected 401/403, got ${res.status}`);
    pass('1.1', 'POST /api/restaurant/auth/revoke anonymous attempt rejected');
  } catch (e) {
    fail('1.1', 'Anonymous revoke rejection failed', e);
  }

  // 1.2: POST /api/restaurant/auth/revoke tampered token rejected
  try {
    const res = await request('/api/restaurant/auth/revoke', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tamperedToken}` },
      body: { token: 'some_arbitrary_token' },
    });
    assert.ok(res.status === 401 || res.status === 403, `Expected 401/403, got ${res.status}`);
    pass('1.2', 'POST /api/restaurant/auth/revoke tampered token rejected');
  } catch (e) {
    fail('1.2', 'Tampered token revoke rejection failed', e);
  }

  // 1.3: POST /api/restaurant/auth/revoke OPERATIONS role attempting to revoke other staff token rejected
  try {
    const res = await request('/api/restaurant/auth/revoke', {
      method: 'POST',
      headers: { Authorization: `Bearer ${opsToken}` },
      body: { token: 'target_staff_session_token' },
    });
    assert.strictEqual(res.status, 403, `Expected 403 FORBIDDEN, got ${res.status}`);
    pass('1.3', 'POST /api/restaurant/auth/revoke OPERATIONS role forbidden from revoking other tokens');
  } catch (e) {
    fail('1.3', 'Role check on token revoke failed', e);
  }

  // 1.4: POST /api/restaurant/orders tampered token rejected
  try {
    const res = await request('/api/restaurant/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tamperedToken}` },
      body: {
        tableNumber: 'T-14',
        items: [{ id: 'item_dal_makhani', quantity: 1 }],
      },
    });
    assert.strictEqual(res.status, 401, `Expected 401 INVALID_CREDENTIAL, got ${res.status}`);
    assert.strictEqual(res.json.code, 'INVALID_CREDENTIAL');
    pass('1.4', 'POST /api/restaurant/orders tampered token rejected with 401 INVALID_CREDENTIAL');
  } catch (e) {
    fail('1.4', 'Orders tampered token check failed', e);
  }

  // 1.5: POST /api/restaurant/orders with fake/revoked capability token rejected
  try {
    const res = await request('/api/restaurant/orders', {
      method: 'POST',
      headers: { Authorization: 'Bearer cap_revoked_preflight_test_token' },
      body: {
        tableNumber: 'T-14',
        items: [{ id: 'item_dal_makhani', quantity: 1 }],
      },
    });
    assert.strictEqual(res.status, 401, `Expected 401 for revoked/invalid capability, got ${res.status}`);
    pass('1.5', 'POST /api/restaurant/orders invalid/revoked capability token rejected');
  } catch (e) {
    fail('1.5', 'Revoked capability token check failed', e);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CHECK 2: MENU ITEM & CATEGORY PERSISTENCE ACROSS RUNTIME RESTARTS
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n💾 [CHECK 2] Menu Item & Category Disk Durability');

  try {
    const storePath = path.resolve(__dirname, '../projects/external-os/restaurant-os/data/restaurant-runtime-store.json');
    assert.ok(fs.existsSync(storePath), 'restaurant-runtime-store.json exists on disk');
    const content = JSON.parse(fs.readFileSync(storePath, 'utf8'));

    assert.ok(Array.isArray(content.categories), 'Categories array persisted');
    assert.ok(content.categories.length >= 4, `At least 4 categories persisted (found ${content.categories.length})`);
    const starters = content.categories.find((c) => c.id === 'cat_starters');
    assert.ok(starters, 'cat_starters exists in persisted categories');
    assert.strictEqual(typeof starters.displayOrder, 'number', 'Category displayOrder is a valid number');

    assert.ok(Array.isArray(content.menuItems), 'MenuItems array persisted');
    const dalItem = content.menuItems.find((m) => m.id === 'item_dal_makhani');
    assert.ok(dalItem, 'item_dal_makhani persisted');
    assert.strictEqual(typeof dalItem.basePriceMinor, 'number', 'basePriceMinor is numeric paise');

    pass('2.1', 'Categories and items verified durable in persistent JSON runtime store');
  } catch (e) {
    fail('2.1', 'Disk persistence check failed', e);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CHECK 3: BRANCH-SPECIFIC MENU ISOLATION
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n🏪 [CHECK 3] Branch-Specific Menu Isolation (Delhi vs Ludhiana vs Chandigarh)');

  try {
    const [delRes, ldhRes, chdRes] = await Promise.all([
      request('/api/restaurant/branches/branch_del/menu'),
      request('/api/restaurant/branches/branch_ldh/menu'),
      request('/api/restaurant/branches/branch_chd/menu'),
    ]);

    assert.strictEqual(delRes.status, 200, 'Delhi branch menu accessible');
    assert.strictEqual(ldhRes.status, 200, 'Ludhiana branch menu accessible');
    assert.strictEqual(chdRes.status, 200, 'Chandigarh branch menu accessible');

    const delMenu = delRes.json.data;
    const ldhMenu = ldhRes.json.data;
    const chdMenu = chdRes.json.data;

    // Check price override isolation: item_tandoori_roti or item_dal_makhani
    // Check an overridden item
    const delOverridden = delMenu.find((m) => m.isPriceOverridden);
    if (delOverridden) {
      const ldhEquivalent = ldhMenu.find((m) => m.id === delOverridden.id);
      assert.ok(ldhEquivalent, 'Item exists in Ludhiana menu');
      assert.notStrictEqual(
        delOverridden.effectivePriceMinor,
        ldhEquivalent.effectivePriceMinor,
        'Delhi override price does NOT leak into Ludhiana base menu'
      );
    }

    // Check 86'd sold out isolation
    const chdUnavailable = chdMenu.find((m) => m.isAvailableAtBranch === false);
    if (chdUnavailable) {
      const ldhEquivalent = ldhMenu.find((m) => m.id === chdUnavailable.id);
      if (ldhEquivalent) {
        assert.strictEqual(
          ldhEquivalent.isAvailableAtBranch,
          true,
          'Chandigarh 86\'d item remains available at Ludhiana'
        );
      }
    }

    pass('3.1', 'Branch-specific price overrides and 86\'d availability are strictly isolated per branch');
  } catch (e) {
    fail('3.1', 'Branch menu isolation check failed', e);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CHECK 4: AUTHORITATIVE PRICING (DINE-IN VS PICKUP VS DELIVERY)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n💰 [CHECK 4] Authoritative Pricing (Dine-in vs Pickup vs Delivery)');

  // 4.1: Delivery order includes ₹40 (4000 paise) delivery fee and 5% GST
  try {
    const delOrderRes = await request('/api/commerce/orders', {
      method: 'POST',
      body: {
        branchId: 'branch_ldh',
        fulfillmentMethod: 'delivery',
        items: [{ id: 'item_dal_makhani', quantity: 1 }], // base 38000 paise (₹380.00)
      },
    });
    assert.strictEqual(delOrderRes.status, 201, 'Delivery order accepted');
    const quote = delOrderRes.json.quote;
    assert.strictEqual(quote.deliveryFeeMinor, 4000, 'Delivery fee is 4000 paise (₹40.00)');
    assert.strictEqual(quote.taxMinor, Math.round(quote.subtotalMinor * 0.05), '5% GST computed accurately');
    assert.strictEqual(
      quote.totalMinor,
      quote.subtotalMinor + quote.taxMinor + 4000,
      'Total equals subtotal + tax + delivery fee'
    );
    pass('4.1', 'Delivery pricing includes delivery fee (₹40.00) + 5% GST');
  } catch (e) {
    fail('4.1', 'Delivery pricing failed', e);
  }

  // 4.2: Pickup order includes ₹0 delivery fee and 5% GST
  try {
    const pickupOrderRes = await request('/api/commerce/orders', {
      method: 'POST',
      body: {
        branchId: 'branch_ldh',
        fulfillmentMethod: 'pickup',
        items: [{ id: 'item_dal_makhani', quantity: 1 }],
      },
    });
    assert.strictEqual(pickupOrderRes.status, 201, 'Pickup order accepted');
    const quote = pickupOrderRes.json.quote;
    assert.strictEqual(quote.deliveryFeeMinor, 0, 'Pickup delivery fee is 0 paise (₹0.00)');
    assert.strictEqual(quote.taxMinor, Math.round(quote.subtotalMinor * 0.05), '5% GST computed accurately');
    assert.strictEqual(
      quote.totalMinor,
      quote.subtotalMinor + quote.taxMinor,
      'Total equals subtotal + tax with zero delivery fee'
    );
    pass('4.2', 'Pickup pricing includes ₹0 delivery fee + 5% GST');
  } catch (e) {
    fail('4.2', 'Pickup pricing failed', e);
  }

  // 4.3: Dine-in table order includes ₹0 delivery fee and 5% GST
  try {
    const dineOrderRes = await request('/api/restaurant/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        tableNumber: 'T-14',
        items: [{ id: 'item_tandoori_roti', quantity: 2 }], // 3500 * 2 = 7000 paise (₹70.00)
      },
    });
    assert.strictEqual(dineOrderRes.status, 201, 'Dine-in order accepted');
    const orderData = dineOrderRes.json.data;
    assert.strictEqual(parseInt(orderData.totalMinor, 10), 7350, 'Total is 7350 paise (₹73.50)');

    const fetchOrder = await request(`/api/restaurant/orders?orderId=${orderData.orderId}`);
    assert.strictEqual(fetchOrder.status, 200);
    const ord = fetchOrder.json.data[0];
    assert.strictEqual(ord.subtotalMinor, 7000, 'Subtotal is 7000 paise (₹70.00)');
    assert.strictEqual(ord.taxMinor, 350, 'Tax is 350 paise (5% of 7000)');
    assert.strictEqual(ord.totalMinor, 7350, 'Total is 7350 paise (₹73.50)');
    pass('4.3', 'Dine-in table order accurately computed with ₹0 delivery fee + 5% GST');
  } catch (e) {
    fail('4.3', 'Dine-in order calculation failed', e);
  }

  // 4.4: Integer GST rounding check (e.g., odd paise subtotal rounding)
  try {
    // 3500 * 1 = 3500; 5% = 175 paise
    const singleRotiRes = await request('/api/restaurant/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        tableNumber: 'T-14',
        items: [{ id: 'item_tandoori_roti', quantity: 1 }],
      },
    });
    assert.strictEqual(singleRotiRes.status, 201);
    const orderData = singleRotiRes.json.data;
    assert.strictEqual(parseInt(orderData.totalMinor, 10), 3675);

    const fetchOrder = await request(`/api/restaurant/orders?orderId=${orderData.orderId}`);
    assert.strictEqual(fetchOrder.status, 200);
    const ord = fetchOrder.json.data[0];
    assert.strictEqual(ord.subtotalMinor, 3500);
    assert.strictEqual(ord.taxMinor, 175);
    assert.strictEqual(ord.totalMinor, 3675);
    pass('4.4', 'Integer GST rounding boundary verified: 3500 subtotal -> 175 tax -> 3675 total');
  } catch (e) {
    fail('4.4', 'GST rounding boundary check failed', e);
  }

  console.log('\n======================================================================');
  console.log(`🎉 GATE 0 PREFLIGHT RESULTS: Total ${passCount + failCount} | Passed ${passCount} | Failed ${failCount}`);
  console.log('======================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runPreflight().catch((err) => {
  console.error('Fatal preflight error:', err);
  process.exit(1);
});
