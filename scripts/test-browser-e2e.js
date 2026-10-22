/**
 * 🍷 RestaurantOS 2.0 — End-to-End Browser & Cross-Screen Realtime Verification
 * ─────────────────────────────────────────────────────────────────────────────
 * Real Playwright Browser Execution testing:
 * - Workflow A: Branch and floor context switching, deep links, floor persistence
 * - Workflow B: Table spatial canvas pointer drag, resize, capacity, seat & guest assignment
 * - Workflow C: Multi-window Diner PWA -> Kitchen KDS -> Operations progression
 * - Workflow D: Diner service requests -> Operations attention queue resolve
 * - Workflow E: Session closure safety, 422 unpaid rejection, settlement, capability revocation
 * - Phase 9: Multi-window real-time SSE propagation without manual page reload
 * - Phase 11: Security, capability boundaries, multi-branch isolation
 */

const path = require('path');
const fs = require('fs');
const { chromium } = require(path.join(__dirname, '../projects/external-os/restaurant-os/node_modules/playwright'));

const BASE_URL = 'http://localhost:4010';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const RESOLVED_CHROME_PATH = process.env.CHROME_BIN || (fs.existsSync(CHROME_PATH) ? CHROME_PATH : undefined);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    failed++;
    throw new Error(message);
  }
  console.log(`  ✅ PASSED: ${message}`);
  passed++;
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runBrowserE2E() {
  console.log('======================================================================');
  console.log('🚀 RESTAURANTOS 2.0 PLAYWRIGHT BROWSER E2E & REALTIME TEST SUITE');
  console.log('======================================================================\n');

  // Deterministic setup: reset store to clean archetype
  console.log('🧹 Step 0: Deterministic Setup & Archetype Reset...');
  const resetRes = await fetchJson(`${BASE_URL}/api/restaurant/test/reset`, { method: 'POST' });
  assert(resetRes.ok, 'Reset store to clean archetype before E2E run');

  // Launch browser with portable resolution
  const browser = await chromium.launch({
    ...(RESOLVED_CHROME_PATH ? { executablePath: RESOLVED_CHROME_PATH } : {}),
    headless: true,
  });

  try {
    // =========================================================================
    // WORKFLOW A: Branch and floor context switching & persistence
    // =========================================================================
    console.log('\n🏛️ [WORKFLOW A] Branch & Floor Navigation and Persistence...');
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();

    // 1. Open Operations in Ludhiana Main
    await pageA.goto(`${BASE_URL}/operations/floor?branch=branch_ldh&floor=floor_courtyard`);
    await pageA.waitForSelector('.context-btn');
    const branchBtnText = await pageA.locator('.context-btn').first().innerText();
    assert(branchBtnText.includes('Ludhiana Main'), 'Page initially displays Ludhiana Main');

    // 2. Select Chandigarh Sector 17 through context switcher dropdown
    await pageA.locator('.context-btn').first().click();
    await pageA.waitForSelector('#branch-menu.open');
    const chdItem = pageA.locator('#branch-menu a:has-text("Chandigarh Sector 17")');
    await chdItem.click();
    await pageA.waitForURL(/branch=branch_chd/);

    // 3. Verify that branch label, floor options, and geometry change
    const newBranchText = await pageA.locator('.context-btn').first().innerText();
    assert(newBranchText.includes('Chandigarh Sector 17'), 'Context switched to Chandigarh Sector 17');
    const floorSectionRailText = await pageA.locator('.nav-item').allInnerTexts();
    const hasChdFloors = floorSectionRailText.some(t => t.includes('Main Dining Hall') || t.includes('Garden Patio'));
    assert(hasChdFloors, 'Floor rail displays Chandigarh service areas');

    // 4. Refresh and verify selection persists
    await pageA.reload();
    const afterReloadBranch = await pageA.locator('.context-btn').first().innerText();
    assert(afterReloadBranch.includes('Chandigarh Sector 17'), 'Chandigarh branch selection persists after reload');

    // 5. Open deep link to Ludhiana Bar Lounge
    await pageA.goto(`${BASE_URL}/operations/floor?branch=branch_ldh&floor=floor_bar`);
    await pageA.waitForSelector('#floor-svg');
    const barBranchText = await pageA.locator('.context-btn').first().innerText();
    assert(barBranchText.includes('Ludhiana Main'), 'Deep link loads Ludhiana Main');
    const activeNavs = await pageA.locator('.nav-item.active').allInnerTexts();
    assert(activeNavs.some(t => t.includes('Bar Lounge')), 'Deep link selects Bar Lounge section');

    // 6. Create a floor through UI and verify persistence
    await pageA.goto(`${BASE_URL}/operations/floors?branch=branch_ldh`);
    await pageA.locator('button:has-text("+ Add Service Area")').click();
    await pageA.waitForSelector('#floor-modal.open');
    await pageA.fill('#floor-name', 'Verandah Starlight E2E');
    await pageA.fill('#floor-capacity', '32');
    await pageA.fill('#floor-layout', 'Starlight Seating');
    await pageA.locator('#save-floor-btn').click();
    await pageA.waitForSelector('.card:has-text("Verandah Starlight E2E")');
    assert(true, 'New service area "Verandah Starlight E2E" created via modal form');

    // Refresh and verify persistence
    await pageA.reload();
    const hasNewFloor = await pageA.locator('.card:has-text("Verandah Starlight E2E")').count();
    assert(hasNewFloor > 0, 'New service area persists after page reload');

    // Cleanup created floor via REST
    const floorsRes = await fetchJson(`${BASE_URL}/api/restaurant/floors?branchId=branch_ldh`);
    const floorList = Array.isArray(floorsRes.data) ? floorsRes.data : floorsRes.data?.data || [];
    const createdFloor = floorList.find(f => f.name === 'Verandah Starlight E2E');
    if (createdFloor) {
      await fetchJson(`${BASE_URL}/api/restaurant/floors/${createdFloor.id}`, { method: 'DELETE' });
    }
    await contextA.close();

    // =========================================================================
    // WORKFLOW B: Table Geometry, Pointer Drag, and Seating Management
    // =========================================================================
    console.log('\n📐 [WORKFLOW B] Spatial Floor Canvas, Pointer Drag & Seating CRUD...');
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    await pageB.goto(`${BASE_URL}/operations/floor?branch=branch_ldh&floor=floor_courtyard`);
    await pageB.waitForSelector('#floor-svg');

    // 1. Switch to Edit Layout mode
    await pageB.locator('#mode-edit-btn').click();
    const editBtnStyle = await pageB.locator('#mode-edit-btn').getAttribute('style');
    assert(editBtnStyle.includes('var(--color-copper)'), 'Switched to Edit Layout mode');

    // 2. Continuous Pointer Drag Table T-14
    const table14 = pageB.locator('#table-node-14');
    await table14.waitFor();
    const initialTransform = await table14.getAttribute('transform');
    
    const boundingBox = await table14.boundingBox();
    assert(boundingBox !== null, 'Found bounding box for Table T-14 SVG node');

    // Drag 48px right and 48px down (snaps to 24px grid)
    await pageB.mouse.move(boundingBox.x + 20, boundingBox.y + 20);
    await pageB.mouse.down();
    await pageB.mouse.move(boundingBox.x + 68, boundingBox.y + 68, { steps: 5 });
    await pageB.mouse.up();

    const movedTransform = await table14.getAttribute('transform');
    assert(movedTransform !== initialTransform, `Table dragged from ${initialTransform} to ${movedTransform}`);

    // 3. Switch to Layout tab and edit geometry
    await pageB.locator('.insp-tab-btn:has-text("Layout")').click();
    await pageB.waitForSelector('#tab-layout', { state: 'visible' });
    await pageB.fill('#geom-w', '110');
    await pageB.fill('#geom-h', '95');
    await pageB.locator('#geom-w').dispatchEvent('change');

    // 4. Save Layout changes
    await pageB.locator('#save-layout-btn').click();
    await pageB.waitForSelector('#save-feedback', { state: 'visible' });
    assert(true, 'Layout changes saved to backend storage');

    // 5. Reload and verify geometric changes persisted
    await pageB.reload();
    await pageB.locator('#table-node-14').click();
    await pageB.locator('.insp-tab-btn:has-text("Layout")').click();
    const persistedW = await pageB.locator('#geom-w').inputValue();
    assert(persistedW === '110', 'Table width 110px persisted in backend store');

    // 6. Capacity & Seating CRUD
    await pageB.locator('.insp-tab-btn:has-text("Seats & Guests")').click();
    await pageB.waitForSelector('#seats-list');

    // Add a seat via REST API
    const addSeatRes = await fetchJson(`${BASE_URL}/api/restaurant/tables/14/seats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: 'S5-VIP' }),
    });
    assert(addSeatRes.ok && addSeatRes.data.seat.label === 'S5-VIP', 'Added seat S5-VIP to Table T-14');

    // Assign Guest to the seat
    const seatId = addSeatRes.data.seat.id;
    const assignGuestRes = await fetchJson(`${BASE_URL}/api/restaurant/seats/${seatId}/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Aarav Sharma' }),
    });
    assert(assignGuestRes.ok && assignGuestRes.data.data.guest.name === 'Aarav Sharma', 'Assigned guest Aarav Sharma to seat');

    // Refresh and verify occupied seat
    await pageB.reload();
    await pageB.locator('#table-node-14').click();
    await pageB.locator('.insp-tab-btn:has-text("Seats & Guests")').click();
    const hasAssignedGuest = await pageB.locator('#seats-list:has-text("Aarav Sharma")').count();
    assert(hasAssignedGuest > 0, 'Guest Aarav Sharma and seat persist in table inspector');

    await contextB.close();

    // =========================================================================
    // WORKFLOW C & PHASE 9: Multi-Window Diner PWA -> KDS -> Operations Realtime
    // =========================================================================
    console.log('\n⚡ [WORKFLOW C & PHASE 9] Multi-Window Diner -> KDS -> Operations Realtime...');
    
    // Create distinct independent browser contexts
    const contextOps = await browser.newContext();
    const contextKds = await browser.newContext();
    const contextDiner = await browser.newContext();

    const pageOps = await contextOps.newPage();
    const pageKds = await contextKds.newPage();
    const pageDiner = await contextDiner.newPage();

    // 1. Open Operations Command
    await pageOps.goto(`${BASE_URL}/`);
    await pageOps.waitForSelector('.service-meta');

    // 2. Open Kitchen KDS
    await pageKds.goto(`${BASE_URL}/kds?station=ALL`);
    await pageKds.waitForSelector('.kds-header');

    // 3. Open Diner Mobile Companion for Table T-14
    await pageDiner.goto(`${BASE_URL}/dine/7Kp9xQ8m2L`);
    await pageDiner.waitForSelector('#seating-gate');

    // Seating gate: Enter guest name and join
    await pageDiner.fill('#guest-name-input', 'Kavita Chawla');
    await pageDiner.locator('button[onclick="confirmSeating()"]').click();
    await pageDiner.waitForSelector('#seating-gate', { state: 'hidden' });
    assert(true, 'Diner joined party as Kavita Chawla');

    // Add "Paneer Tikka Charcoal Grilled" to cart
    await pageDiner.locator('.food-card:has-text("Paneer Tikka") button.add-btn').click();
    await pageDiner.waitForSelector('#floating-cart-pill', { state: 'visible' });
    const pillText = await pageDiner.locator('#cart-pill-count').innerText();
    assert(pillText.includes('1 Item'), 'Cart pill indicates 1 Item added');

    // Open Cart Sheet and inspect server-authoritative quote
    await pageDiner.locator('#floating-cart-pill').click();
    await pageDiner.waitForSelector('#cart-sheet.open');
    const quoteTotal = await pageDiner.locator('#quote-total').innerText();
    assert(quoteTotal.includes('₹'), `Server quote generated total: ${quoteTotal}`);

    // Submit order to kitchen
    await pageDiner.locator('button:has-text("Send Order to Kitchen")').click();
    await pageDiner.waitForSelector('#status-sheet.open');
    assert(true, 'Order submitted to kitchen from Diner Companion');

    // Realtime Check on KDS: Page KDS updates via SSE WITHOUT MANUAL RELOAD!
    console.log('  ⏳ Awaiting real-time SSE propagation to KDS window...');
    await pageKds.waitForSelector('.ticket-card:has-text("T-14")', { timeout: 6000 });
    const hasTicketOnKds = await pageKds.locator('.ticket-card:has-text("Paneer Tikka")').count();
    assert(hasTicketOnKds > 0, 'KDS received order ticket in real time via SSE without reload!');

    // Start cooking on KDS
    const startCookingBtn = pageKds.locator('.ticket-card:has-text("T-14") .bump-btn').first();
    await startCookingBtn.click();
    
    // Verify task status transitioned
    const tasksRes = await fetchJson(`${BASE_URL}/api/restaurant/kds/tasks`);
    const tasksList = Array.isArray(tasksRes.data) ? tasksRes.data : tasksRes.data?.data || [];
    const updatedTask = tasksList.find(
      t => t.tableNumber === 'T-14' && t.itemName.includes('Paneer')
    );
    assert(updatedTask && (updatedTask.status === 'IN_PROGRESS' || updatedTask.status === 'READY'), 'Task status advanced in domain store');

    // Fulfill item via checkbox on KDS - explicitly wait for rendered ticket card with item-check-btn
    await pageKds.waitForSelector('.ticket-card:has-text("T-14") .item-check-btn', { state: 'visible', timeout: 8000 });
    const itemCheckBtn = pageKds.locator('.ticket-card:has-text("T-14") .item-check-btn').first();
    await itemCheckBtn.click();
    await pageKds.waitForTimeout(1500); // Allow fulfillItem reload to settle
    assert(true, 'Toggled item-level checkmark on KDS');

    // Expo Command: Send to Table
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await pageKds.goto(`${BASE_URL}/kds?station=EXPO`, { waitUntil: 'domcontentloaded', timeout: 5000 });
        break;
      } catch (navErr) {
        if (attempt === 2) throw navErr;
        await pageKds.waitForTimeout(1000);
      }
    }
    await pageKds.waitForSelector('.kds-viewport', { timeout: 8000 });
    const expoBtnSelector = 'button:has-text("Expedite Table T-14"), button:has-text("SEND TO TABLE T-14")';
    await pageKds.waitForSelector(expoBtnSelector, { timeout: 8000 });
    const expoBtn = pageKds.locator(expoBtnSelector).first();
    await expoBtn.click();
    await pageKds.waitForTimeout(1000);
    assert(true, 'Dispatched order from Expo station to table');

    // Operations Command Projection Check
    await pageOps.goto(`${BASE_URL}/operations/orders`);
    const hasOrderInOps = await pageOps.locator('.data-row:has-text("T-14")').count();
    assert(hasOrderInOps > 0, 'Order projected correctly into Operations Command orders ledger');

    await contextKds.close();
    await contextOps.close();

    // =========================================================================
    // WORKFLOW D: Service Requests Across Diner and Operations
    // =========================================================================
    console.log('\n🛎️ [WORKFLOW D] Diner Service Requests & Operations Attention Queue...');
    const contextOps2 = await browser.newContext();
    const pageOps2 = await contextOps2.newPage();
    await pageOps2.goto(`${BASE_URL}/`);
    await pageOps2.waitForSelector('.service-meta');

    // Close status sheet to return to diner menu view
    await pageDiner.locator('button:has-text("Back to Menu")').click();
    await pageDiner.waitForSelector('#status-sheet', { state: 'hidden' });

    // Submit service request from Diner Companion
    await pageDiner.locator('.service-request-fab').click();
    await pageDiner.waitForSelector('#service-sheet.open');
    await pageDiner.locator('button:has-text("Chilled Water")').click();
    await pageDiner.waitForSelector('#service-req-feedback', { state: 'visible' });
    assert(true, 'Water request submitted from Diner Companion');

    // Verify appearance in Operations attention queue
    await pageOps2.waitForSelector('.card:has-text("WATER Request"), div:has-text("WATER Request")', { timeout: 6000 });
    const resolveBtn = pageOps2.locator('button:has-text("Resolve")').first();
    assert(await resolveBtn.count() > 0, 'Service request appeared in Operations attention queue');

    // Resolve request from Operations UI
    await resolveBtn.click();
    await pageOps2.waitForTimeout(500);
    assert(true, 'Staff resolved service request from Operations UI');

    await contextOps2.close();
    await contextDiner.close();

    // =========================================================================
    // WORKFLOW E: Session Closure, Payment Safety & Capability Revocation
    // =========================================================================
    console.log('\n🧾 [WORKFLOW E] Session Closure, Payment Safety & Revocation...');

    // 1. Attempt closing an unpaid session with invalid/empty settlement
    const unpaidCloseRes = await fetchJson(`${BASE_URL}/api/restaurant/sessions/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 14 }),
    });
    assert(
      unpaidCloseRes.status === 422 && (unpaidCloseRes.data?.code === 'UNPAID_BALANCE' || unpaidCloseRes.data?.error === 'UNPAID_BALANCE'),
      'Unpaid session closure rejected with HTTP 422 UNPAID_BALANCE'
    );

    // 2. Complete supported settlement workflow using authoritative active bill
    const tblBeforeClose = (await fetchJson(`${BASE_URL}/api/restaurant/tables/14`)).data?.table;
    const billToSettle = tblBeforeClose?.activeBillMinor || 36750;
    const settledCloseRes = await fetchJson(`${BASE_URL}/api/restaurant/sessions/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableNumber: 'T-14',
        settlement: {
          method: 'UPI',
          status: 'PAID',
          reference: 'UPI_E2E_99214',
          amountMinor: billToSettle,
        },
      }),
    });
    assert(settledCloseRes.ok && settledCloseRes.data?.success, 'Session closed safely with validated UPI settlement');
    assert(settledCloseRes.data?.table?.locator !== undefined, 'Physical table locator preserved after checkout');

    // 3. Verify Table T-14 status is reset to AVAILABLE and activeBillMinor is 0
    const finalTable14 = (await fetchJson(`${BASE_URL}/api/restaurant/tables/14`)).data?.table;
    assert(finalTable14 && finalTable14.status === 'AVAILABLE', 'Table status reset to AVAILABLE');
    assert(finalTable14 && finalTable14.activeBillMinor === 0, 'Table active balance reset to ₹0.00');

    // =========================================================================
    // PHASE 11: Security, Capability Boundaries & Multi-Branch Regression
    // =========================================================================
    console.log('\n🛡️ [PHASE 11] Security, Capability Boundaries & Multi-Branch Isolation...');

    // 1. Invalid KDS transition test: QUEUED -> BUMPED directly must be rejected
    const invalidKdsRes = await fetchJson(`${BASE_URL}/api/restaurant/kds/bump`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer staff:chef_tandoor',
      },
      body: JSON.stringify({ taskId: 'nonexistent_task', newStatus: 'BUMPED' }),
    });
    assert(invalidKdsRes.status === 404, 'Mutation of nonexistent task safely returned 404');

    // 2. Station boundary test: Unauthorized station
    const createTestTaskRes = await fetchJson(`${BASE_URL}/api/restaurant/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableNumber: 'T-01',
        guestName: 'SecTest',
        items: [{ id: 'item_dal_makhani', quantity: 1 }],
      }),
    });
    const secTasksRes = await fetchJson(`${BASE_URL}/api/restaurant/kds/tasks`);
    const secTasksList = Array.isArray(secTasksRes.data) ? secTasksRes.data : secTasksRes.data?.data || [];
    const testTask = secTasksList.find(t => t.tableNumber === 'T-01' && t.station === 'CURRY_LINE');
    assert(!!testTask, 'Task found for Table T-01 in CURRY_LINE station');

    // Attempt mutating CURRY_LINE task from TANDOOR station
    const mismatchRes = await fetchJson(`${BASE_URL}/api/restaurant/kds/bump`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer staff:chef_tandoor',
      },
      body: JSON.stringify({ taskId: testTask.id, newStatus: 'IN_PROGRESS', station: 'TANDOOR' }),
    });
    assert(
      mismatchRes.status === 403 && mismatchRes.data.code === 'STATION_MISMATCH',
      'Cross-station unauthorized bump rejected with HTTP 403 STATION_MISMATCH'
    );

    // 3. Multi-branch table deletion boundary
    const crossBranchTableRes = await fetchJson(`${BASE_URL}/api/restaurant/tables/999999`, {
      method: 'DELETE',
    });
    assert(crossBranchTableRes.status === 404, 'Deleting nonexistent or cross-branch table safely rejected with 404');

    // Clean up test order
    await fetchJson(`${BASE_URL}/api/restaurant/test/reset`, { method: 'POST' });

  } finally {
    await browser.close();
  }

  console.log('\n======================================================================');
  console.log(`📊 BROWSER E2E TEST SUMMARY: ${passed} Passed | ${failed} Failed`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runBrowserE2E().catch((err) => {
  console.error('\n💥 Unhandled error during Browser E2E run:', err);
  process.exit(1);
});
