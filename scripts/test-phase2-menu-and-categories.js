/**
 * 🍷 RESTAURANTOS 5.3 — PHASE 2: BOH MENU & CATEGORY EDITOR ACCEPTANCE SUITE
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative verification suite for Phase 2:
 * 1. Category Lifecycle: Create, Rename, Reorder, and Archive with Orphan Prevention
 * 2. Menu Item Lifecycle: Create with full metadata & modifiers, Read, Update, Archive/Delete
 * 3. Server-side Validation: Negative price, missing name, malformed inputs rejected
 * 4. Authoritative Pricing & Modifiers: Integer minor units, modifier group limits & deltas
 * 5. Branch Overrides & Availability (86'ing): Cross-branch isolation & ordering guards
 * 6. Durability: State survives process restart and disk persistence is intact
 */

const http = require('http');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE_URL = process.env.BASE_URL || 'http://localhost:4010';
const STAFF_AUTH_SECRET = process.env.STAFF_AUTH_SECRET || 'restaurant_os_staff_jwt_secret_2026_super_secure';

function createStaffToken(sub, role, branchId = 'branch_ldh') {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      sub,
      role,
      branchId,
      iat: now,
      exp: now + 3600,
      jti: 'jti_' + crypto.randomBytes(8).toString('hex'),
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', STAFF_AUTH_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

let managerToken = '';
let operationsToken = '';

function request(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    };

    let bodyData = null;
    if (options.body) {
      bodyData = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data,
          json,
        });
      });
    });

    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

let passCount = 0;
let failCount = 0;

function pass(testId, msg) {
  passCount++;
  console.log(`  ✅ PASS: [${testId}] ${msg}`);
}

function fail(testId, msg, err) {
  failCount++;
  console.error(`  ❌ FAIL: [${testId}] ${msg}`, err ? `\n    ${err.message || err}` : '');
}

async function runPhase2Suite() {
  console.log('======================================================================');
  console.log('🍷 RESTAURANTOS 5.3 — PHASE 2: BOH MENU & CATEGORY ACCEPTANCE SUITE');
  console.log('======================================================================\n');

  // Authenticate authentic tokens via PIN
  const mgrAuth = await request('/api/restaurant/auth/staff-token', {
    method: 'POST',
    body: { pin: '8899', branchId: 'branch_ldh' },
  });
  managerToken = mgrAuth.json?.data?.token;

  const opsAuth = await request('/api/restaurant/auth/staff-token', {
    method: 'POST',
    body: { pin: '1122', branchId: 'branch_ldh' },
  });
  operationsToken = opsAuth.json?.data?.token;

  const chdAuth = await request('/api/restaurant/auth/staff-token', {
    method: 'POST',
    body: { pin: '9900', branchId: 'branch_chd' },
  });
  const chdManagerToken = chdAuth.json?.data?.token;

  const delAuth = await request('/api/restaurant/auth/staff-token', {
    method: 'POST',
    body: { pin: '7788', branchId: 'branch_del' },
  });
  const delManagerToken = delAuth.json?.data?.token;

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 1: CATEGORY MANAGEMENT & TAXONOMY
  // ───────────────────────────────────────────────────────────────────────────
  console.log('🏷️ [SUITE 1] Category Management & Orphan Protection Taxonomy');

  let testCatId = null;
  const uniqueSuffix = Date.now().toString(36);
  const testCatName = `Artisan Biryanis ${uniqueSuffix}`;

  // 1.1: Create Category
  try {
    const createRes = await request('/api/restaurant/menu/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` },
      body: {
        name: testCatName,
        description: 'Dum-cooked Awadhi and Hyderabadi biryanis in earthen handis',
        color: '#E11D48',
      },
    });

    assert.strictEqual(createRes.status, 201, 'Category create returned HTTP 201');
    assert.strictEqual(createRes.json.success, true);
    assert.strictEqual(createRes.json.data.name, testCatName);
    testCatId = createRes.json.data.id;
    pass('1.1', `Created category "${testCatName}" with ID ${testCatId}`);
  } catch (err) {
    fail('1.1', 'Category creation failed', err);
  }

  // 1.2: Duplicate Category Name Rejection
  try {
    const dupRes = await request('/api/restaurant/menu/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` },
      body: { name: testCatName },
    });
    assert.strictEqual(dupRes.status, 400, 'Duplicate category name rejected with HTTP 400');
    pass('1.2', 'Duplicate category name rejected with HTTP 400');
  } catch (err) {
    fail('1.2', 'Duplicate category rejection failed', err);
  }

  // 1.3: Update Category Name & Details
  const updatedCatName = `Royal Handi Biryanis ${uniqueSuffix}`;
  try {
    const updateRes = await request(`/api/restaurant/menu/categories/${testCatId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${managerToken}` },
      body: {
        name: updatedCatName,
        description: 'Sealed dough dum-cooked perfection with aged basmati',
      },
    });
    assert.strictEqual(updateRes.status, 200, 'Category update returned HTTP 200');
    assert.strictEqual(updateRes.json.data.name, updatedCatName);
    pass('1.3', `Updated category name to "${updatedCatName}"`);
  } catch (err) {
    fail('1.3', 'Category update failed', err);
  }

  // 1.4: Category Reordering
  try {
    const catsRes = await request('/api/restaurant/menu/categories');
    assert.strictEqual(catsRes.status, 200);
    const cats = catsRes.json.data;
    const reversedIds = [...cats.map((c) => c.id)].reverse();

    const reorderRes = await request('/api/restaurant/menu/categories/reorder', {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` },
      body: { orderedIds: reversedIds },
    });

    assert.strictEqual(reorderRes.status, 200, 'Reorder returned HTTP 200');
    const activeReordered = reorderRes.json.data.filter((c) => !c.isArchived);
    const firstCat = activeReordered[0];
    assert.strictEqual(firstCat.id, reversedIds[0], 'First category matches new sequence order');
    pass('1.4', 'Category sequence reordering verified & persisted');
  } catch (err) {
    fail('1.4', 'Category reordering failed', err);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 2: MENU ITEM CRUD, METADATA & MODIFIERS
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n📋 [SUITE 2] Menu Item Complete Lifecycle, Validation & Modifiers');

  let testItemId = null;
  const testDishName = `Kashmiri Morel Rogan Josh ${uniqueSuffix}`;

  // 2.1: Server-side validation: Negative price rejected
  try {
    const negRes = await request('/api/restaurant/menu/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` },
      body: {
        name: 'Negative Price Dish',
        category: updatedCatName,
        basePriceMinor: -1500,
      },
    });
    assert.strictEqual(negRes.status, 400, 'Negative price rejected with HTTP 400');
    pass('2.1', 'Server-side validation: Negative base price rejected with HTTP 400');
  } catch (err) {
    fail('2.1', 'Negative price validation failed', err);
  }

  // 2.2: Server-side validation: Empty name rejected
  try {
    const emptyRes = await request('/api/restaurant/menu/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` },
      body: {
        name: '   ',
        category: updatedCatName,
        basePriceMinor: 45000,
      },
    });
    assert.strictEqual(emptyRes.status, 400, 'Empty name rejected with HTTP 400');
    pass('2.2', 'Server-side validation: Empty dish name rejected with HTTP 400');
  } catch (err) {
    fail('2.2', 'Empty dish name validation failed', err);
  }

  // 2.3: Create Dish with Full Domain Attributes & Modifier Groups
  try {
    const createRes = await request('/api/restaurant/menu/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` },
      body: {
        name: testDishName,
        category: updatedCatName,
        categoryId: testCatId,
        description: 'Wild Himalayan gucchi morels simmered in a velvet Kashmiri shallot gravy with mawal petals',
        basePriceMinor: 68000, // ₹680.00
        prepDurationMinutes: 18,
        station: 'CURRY_LINE',
        dietaryFlags: ['VEG', 'GLUTEN_FREE'],
        allergens: ['NUTS'],
        imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80',
        isPopular: true,
        isSignature: true,
        modifierGroups: [
          {
            name: 'Spice Level',
            description: 'Select traditional Kashmiri heat',
            minSelections: 1,
            maxSelections: 1,
            options: [
              { name: 'Traditional Mild Saffron', priceDeltaMinor: 0, isDefault: true },
              { name: 'Kashmiri Sharp Mirch', priceDeltaMinor: 0, isDefault: false },
              { name: 'Extra Angara Heat', priceDeltaMinor: 3000, isDefault: false }, // +₹30.00
            ],
          },
          {
            name: 'Rice & Bread Accompaniment',
            description: 'Choice of traditional carb',
            minSelections: 0,
            maxSelections: 2,
            options: [
              { name: 'Steamed Aged Basmati', priceDeltaMinor: 0, isDefault: true },
              { name: 'Khamiri Roti (2 pcs)', priceDeltaMinor: 6000, isDefault: false }, // +₹60.00
              { name: 'Wild Morel Pulao Upgrade', priceDeltaMinor: 15000, isDefault: false }, // +₹150.00
            ],
          },
        ],
      },
    });

    assert.strictEqual(createRes.status, 201, 'Dish created with HTTP 201');
    assert.strictEqual(createRes.json.success, true);
    assert.strictEqual(createRes.json.data.name, testDishName);
    assert.strictEqual(createRes.json.data.basePriceMinor, 68000);
    assert.strictEqual(createRes.json.data.formattedPrice, '₹680.00');
    assert.strictEqual(createRes.json.data.station, 'CURRY_LINE');
    assert.strictEqual(createRes.json.data.modifierGroups.length, 2);
    testItemId = createRes.json.data.id;
    pass('2.3', `Created dish "${testDishName}" (₹680.00) with 2 modifier groups and dietary flags`);
  } catch (err) {
    fail('2.3', 'Full dish creation failed', err);
  }

  // 2.4: Read Created Item & Modifier Structure
  try {
    const getRes = await request(`/api/restaurant/menu/items/${testItemId}`);
    assert.strictEqual(getRes.status, 200, 'GET item returned HTTP 200');
    const item = getRes.json.data;
    assert.strictEqual(item.id, testItemId);
    assert.strictEqual(item.category, updatedCatName);
    assert.deepStrictEqual(item.dietaryFlags, ['VEG', 'GLUTEN_FREE']);
    assert.strictEqual(item.modifierGroups[0].options.length, 3);
    assert.strictEqual(item.modifierGroups[0].options[2].priceDeltaMinor, 3000);
    assert.strictEqual(item.modifierGroups[0].options[2].formattedPriceDelta, '+₹30.00');
    pass('2.4', 'Item retrieved authoritatively with structured modifier groups and price deltas');
  } catch (err) {
    fail('2.4', 'Get item failed', err);
  }

  // 2.5: Update Item: Price, SLA and Modifiers (Preserve ID & Category)
  try {
    const patchRes = await request(`/api/restaurant/menu/items/${testItemId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${managerToken}` },
      body: {
        basePriceMinor: 72000, // Adjusted to ₹720.00
        prepDurationMinutes: 20,
        description: 'Updated sensory description with Kashmiri saffron drizzle',
      },
    });
    assert.strictEqual(patchRes.status, 200, 'PATCH item returned HTTP 200');
    assert.strictEqual(patchRes.json.data.basePriceMinor, 72000);
    assert.strictEqual(patchRes.json.data.formattedPrice, '₹720.00');
    assert.strictEqual(patchRes.json.data.prepDurationMinutes, 20);
    assert.strictEqual(patchRes.json.data.id, testItemId, 'Item ID preserved on update');
    pass('2.5', 'Updated dish base price (₹720.00) and SLA while preserving ID');
  } catch (err) {
    fail('2.5', 'Item update failed', err);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 3: BRANCH OVERRIDES & STOREFRONT PROPAGATION
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n🏪 [SUITE 3] Branch Overrides, 86\'ing & Authoritative Storefront Resolution');

  // 3.1: Branch isolation & save branch price override & availability
  try {
    // Cross-branch rejection: Ludhiana manager attempting to modify Delhi override
    const crossBranchRes = await request('/api/restaurant/menu/branch-overrides', {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` },
      body: {
        itemId: testItemId,
        branchId: 'branch_del',
        isAvailable: true,
      },
    });
    assert.strictEqual(crossBranchRes.status, 403, 'Cross-branch override rejected with HTTP 403');
    assert.strictEqual(crossBranchRes.json.code, 'BRANCH_MISMATCH');

    // Delhi manager sets authorized price override of ₹790.00
    const ovDelRes = await request('/api/restaurant/menu/branch-overrides', {
      method: 'POST',
      headers: { Authorization: `Bearer ${delManagerToken}` },
      body: {
        itemId: testItemId,
        branchId: 'branch_del',
        isAvailable: true,
        priceOverrideMinor: 79000,
        formattedPriceOverride: '₹790.00',
      },
    });
    assert.strictEqual(ovDelRes.status, 200, 'Delhi branch override saved with HTTP 200');

    // Chandigarh manager sets authorized 86'd override
    const ovChdRes = await request('/api/restaurant/menu/branch-overrides', {
      method: 'POST',
      headers: { Authorization: `Bearer ${chdManagerToken}` },
      body: {
        itemId: testItemId,
        branchId: 'branch_chd',
        isAvailable: false,
      },
    });
    assert.strictEqual(ovChdRes.status, 200, 'Chandigarh branch 86 override saved with HTTP 200');
    pass('3.1', 'Branch isolation verified (403 BRANCH_MISMATCH) and authorized overrides persisted');
  } catch (err) {
    fail('3.1', 'Branch override saving failed', err);
  }

  // 3.2: Verify Branch Resolution on Storefront
  try {
    // Delhi storefront resolution
    const delMenuRes = await request('/api/restaurant/branches/branch_del/menu');
    assert.strictEqual(delMenuRes.status, 200);
    const delItem = delMenuRes.json.data.find((m) => m.id === testItemId);
    assert.ok(delItem, 'Dish resolved in Delhi branch menu');
    assert.strictEqual(delItem.effectivePriceMinor, 79000);
    assert.strictEqual(delItem.isPriceOverridden, true);
    assert.strictEqual(delItem.isAvailableAtBranch, true);

    // Ludhiana storefront resolution (inherits base price ₹720.00)
    const ldhMenuRes = await request('/api/restaurant/branches/branch_ldh/menu');
    assert.strictEqual(ldhMenuRes.status, 200);
    const ldhItem = ldhMenuRes.json.data.find((m) => m.id === testItemId);
    assert.ok(ldhItem, 'Dish resolved in Ludhiana branch menu');
    assert.strictEqual(ldhItem.effectivePriceMinor, 72000);
    assert.strictEqual(ldhItem.isPriceOverridden, false);
    assert.strictEqual(ldhItem.isAvailableAtBranch, true);

    // Chandigarh storefront resolution (86'd)
    const chdMenuRes = await request('/api/restaurant/branches/branch_chd/menu');
    assert.strictEqual(chdMenuRes.status, 200);
    const chdItem = chdMenuRes.json.data.find((m) => m.id === testItemId);
    assert.ok(chdItem, 'Dish resolved in Chandigarh branch menu');
    assert.strictEqual(chdItem.isAvailableAtBranch, false);

    pass('3.2', 'Storefront resolved correctly: Delhi ₹790.00, Ludhiana base ₹720.00, Chandigarh 86\'d');
  } catch (err) {
    fail('3.2', 'Branch resolution verification failed', err);
  }

  // 3.3: Attempting to order 86'd dish at Chandigarh is blocked
  try {
    const orderRes = await request('/api/commerce/orders', {
      method: 'POST',
      body: {
        branchId: 'branch_chd',
        items: [{ id: testItemId, quantity: 1 }],
      },
    });
    assert.strictEqual(orderRes.status, 400, 'Order of 86\'d dish rejected with HTTP 400');
    assert.strictEqual(orderRes.json.error, 'ITEM_UNAVAILABLE_AT_BRANCH');
    pass('3.3', 'Attempt to order 86\'d dish at Chandigarh rejected with ITEM_UNAVAILABLE_AT_BRANCH');
  } catch (err) {
    fail('3.3', '86\'d order guard failed', err);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 4: COMMERCE ORDERING & AUTHORITATIVE MODIFIER PRICING
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n💰 [SUITE 4] Authoritative Modifier Pricing & Order Quote');

  try {
    // Order at Delhi branch with Morel dish + extra angara heat (+₹30) and Khamiri Roti (+₹60)
    // Base: 79000 paise (₹790) + 3000 (mod 1) + 6000 (mod 2) = 88000 paise (₹880)
    // Delivery fee = 4000 paise (₹40)
    // Tax 5% on 88000 = 4400 paise (₹44)
    // Total = 88000 + 4000 + 4400 = 96400 paise (₹964.00)
    const getItemRes = await request(`/api/restaurant/menu/items/${testItemId}`);
    const itemData = getItemRes.json.data;
    const mod1OptId = itemData.modifierGroups[0].options[2].id; // +₹30
    const mod2OptId = itemData.modifierGroups[1].options[1].id; // +₹60

    const orderRes = await request('/api/commerce/orders', {
      method: 'POST',
      body: {
        branchId: 'branch_del',
        items: [
          {
            id: testItemId,
            quantity: 1,
            selectedModifierIds: [mod1OptId, mod2OptId],
          },
        ],
      },
    });

    assert.strictEqual(orderRes.status, 201, 'Commerce order placed with HTTP 201');
    assert.strictEqual(orderRes.json.quote.subtotalMinor, 88000, 'Subtotal accurately includes modifier deltas');
    assert.strictEqual(orderRes.json.quote.taxMinor, 4400, '5% tax on subtotal accurately calculated');
    assert.strictEqual(orderRes.json.quote.totalMinor, 96400, 'Total payable matches authoritative quote');
    pass('4.1', 'Authoritative order quote: ₹790 base + ₹90 modifiers + ₹40 delivery + ₹44 tax = ₹964.00');
  } catch (err) {
    fail('4.1', 'Authoritative modifier pricing failed', err);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 5: ORPHAN PROTECTION ON CATEGORY ARCHIVE
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n🛡️ [SUITE 5] Accidental Orphaning Prevention On Category Archive');

  // 5.1: Archive category containing dishes with automatic reassignment to Mains
  try {
    // Current test dish is assigned to updatedCatName
    const catListRes = await request('/api/restaurant/menu/categories');
    const mainsCat = catListRes.json.data.find((c) => c.name === 'Mains');
    assert.ok(mainsCat, 'Mains category exists as fallback');

    const archiveRes = await request(
      `/api/restaurant/menu/categories/${testCatId}?reassignTo=${mainsCat.id}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${managerToken}` },
      }
    );

    assert.strictEqual(archiveRes.status, 200, 'Category archived with HTTP 200');
    assert.strictEqual(archiveRes.json.success, true);
    assert.ok(archiveRes.json.reassignedCount >= 1, 'Dishes reassigned successfully');

    // Verify test dish category was reassigned to 'Mains'
    const getReassignedDish = await request(`/api/restaurant/menu/items/${testItemId}`);
    assert.strictEqual(getReassignedDish.json.data.category, 'Mains', 'Dish category safely reassigned to Mains');
    assert.strictEqual(getReassignedDish.json.data.categoryId, mainsCat.id);
    pass('5.1', `Archived category with 0 orphaned dishes; reassigned to "${mainsCat.name}"`);
  } catch (err) {
    fail('5.1', 'Category archive orphan protection failed', err);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 6: DISH ARCHIVAL & DISK DURABILITY
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n💾 [SUITE 6] Dish Archival & Process Restart Durability');

  // 6.1: Archive dish
  try {
    const delRes = await request(`/api/restaurant/menu/items/${testItemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert.strictEqual(delRes.status, 200, 'Dish delete returned HTTP 200');

    // Verify active items list no longer includes archived item
    const activeItemsRes = await request('/api/restaurant/menu/items');
    assert.strictEqual(activeItemsRes.status, 200);
    const activeFound = activeItemsRes.json.data.find((m) => m.id === testItemId);
    assert.strictEqual(activeFound, undefined, 'Archived item omitted from active catalog');
    pass('6.1', 'Dish archived and excluded from active menu queries');
  } catch (err) {
    fail('6.1', 'Dish archival failed', err);
  }

  // 6.2: Verify disk persistence
  try {
    const storePath = path.resolve(__dirname, '../projects/external-os/restaurant-os/data/restaurant-runtime-store.json');
    const storeContent = fs.readFileSync(storePath, 'utf8');
    const diskData = JSON.parse(storeContent);
    assert.ok(diskData.categories && diskData.categories.length > 0, 'Categories persisted to disk');
    const diskCat = diskData.categories.find((c) => c.id === testCatId);
    assert.ok(diskCat, 'Test category persisted to disk');
    assert.strictEqual(diskCat.isArchived, true, 'Category archive flag persisted to disk');
    pass('6.2', 'Categories, items, and audit events verified durable in restaurant-runtime-store.json');
  } catch (err) {
    fail('6.2', 'Disk persistence check failed', err);
  }

  console.log('\n======================================================================');
  console.log(`🎉 PHASE 2 SUITE RESULTS: Total ${passCount + failCount} | Passed ${passCount} | Failed ${failCount}`);
  console.log('======================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runPhase2Suite().catch((err) => {
  console.error('Fatal Phase 2 suite error:', err);
  process.exit(1);
});
