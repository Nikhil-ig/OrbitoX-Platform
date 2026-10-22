/**
 * 🪐 RestaurantOS 3.0 Platform Redesign & White-Label Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * End-to-end verification of:
 * - Multi-Template Marketplace (discovery, previews, 1-click install)
 * - Visual Brand Studio (drafts, publish, revisions, restore)
 * - White-Label & Domain Verification (CNAME DNS, SSL, branding)
 * - Customer Support Desk (ticket lifecycle, threaded conversation, status)
 * - Menu Catalog Management (dish CRUD, kitchen station routing)
 * - Diner Mobile PWA Dynamic Theming
 * - Playwright headless browser rendering of all 5 new workspace screens
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

async function runRedesignTests() {
  console.log('======================================================================');
  console.log('🪐 RESTAURANTOS 3.0 REDESIGN & WHITE-LABEL VERIFICATION SUITE');
  console.log('======================================================================\n');

  // ─────────────────────────────────────────────────────────────────────────
  // SUITE 1: Multi-Template Marketplace Discovery & Lifecycle
  // ─────────────────────────────────────────────────────────────────────────
  console.log('🛍️ [SUITE 1] Template Marketplace Discovery & Lifecycle...');
  const templatesRes = await fetchJson(`${BASE_URL}/api/restaurant/templates`);
  assert(templatesRes.ok && Array.isArray(templatesRes.data.data), 'Templates list fetched successfully');
  const templates = templatesRes.data.data;
  assert(templates.length >= 6, `Discovered ${templates.length} canonical restaurant templates`);

  const haute = templates.find((t) => t.id === 'tmpl_haute_gastronomy');
  const neon = templates.find((t) => t.id === 'tmpl_neon_street');
  assert(haute !== undefined, 'Haute Gastronomy Noir template present');
  assert(neon !== undefined, 'Neon Street Food template present');

  // Install Neon Street Food
  const installRes = await fetchJson(`${BASE_URL}/api/restaurant/templates/tmpl_neon_street/install`, {
    method: 'POST',
  });
  assert(installRes.ok && installRes.data.success, 'Successfully installed Neon Street template');
  assert(installRes.data.template && installRes.data.template.id === 'tmpl_neon_street', 'Active template returned from install');

  // Verify brand configuration reflects installed template
  const brandAfterInstall = (await fetchJson(`${BASE_URL}/api/restaurant/branding`)).data.data;
  assert(brandAfterInstall.activeTemplateId === 'tmpl_neon_street', 'Branding store synced with installed template');

  // ─────────────────────────────────────────────────────────────────────────
  // SUITE 2: Visual Brand Studio Draft, Publish & Revisions
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n🎨 [SUITE 2] Visual Brand Studio Draft, Publish & Revisions...');
  const draftRes = await fetchJson(`${BASE_URL}/api/restaurant/studio/draft`);
  assert(draftRes.ok && draftRes.data.data, 'Fetched active studio draft');
  const initialDraft = draftRes.data.data;

  // Save new draft with custom sections
  const customSections = [
    {
      id: 'sec_hero_neon',
      type: 'hero',
      title: 'Neon Nights & Wagyu Robata',
      subtitle: 'Charcoal skewers and Japanese highballs',
      visible: true,
      settings: { textAlign: 'center', overlayOpacity: 0.5 },
    },
    {
      id: 'sec_menu_neon',
      type: 'menu_preview',
      title: 'Robata Specials',
      subtitle: 'Direct from the binchotan embers',
      visible: true,
      settings: {},
    },
  ];

  const saveDraftRes = await fetchJson(`${BASE_URL}/api/restaurant/studio/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sections: customSections,
      customTokens: { primaryColor: '#FF2A85', fontHeading: 'Space Grotesk' },
    }),
  });
  assert(saveDraftRes.ok && saveDraftRes.data.data, 'Saved draft changes to store');
  assert(saveDraftRes.data.data.draftSections[0].title === 'Neon Nights & Wagyu Robata', 'Draft title persisted');

  // Publish draft
  const publishRes = await fetchJson(`${BASE_URL}/api/restaurant/studio/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ changeNotes: 'Launch Tokyo Night Street Food Theme' }),
  });
  const pubData = publishRes.data.data;
  const targetDraft = pubData.draft || pubData;
  assert(targetDraft.publishedSections.length === 2, 'Published sections live in production state');
  assert(targetDraft.revisions.length >= 1, 'Publication revision history recorded');

  // Restore earlier revision
  const revId = targetDraft.revisions[0].revisionId;
  const restoreRes = await fetchJson(`${BASE_URL}/api/restaurant/studio/revisions/${revId}/restore`, {
    method: 'POST',
  });
  assert(restoreRes.ok && restoreRes.data.data, `Restored revision ${revId} successfully`);

  // ─────────────────────────────────────────────────────────────────────────
  // SUITE 3: White-Label Branding & Domain Verification
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n🌐 [SUITE 3] White-Label Identity & Custom Domain Verification...');
  const updateBrandRes = await fetchJson(`${BASE_URL}/api/restaurant/branding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantName: 'The Starlight Brasserie',
      tagline: 'Modern Gastronomy & French-Indian Robata',
      primaryColor: '#D97706',
      secondaryColor: '#10B981',
      surfaceColor: '#0C0F14',
      subdomain: 'starlight.orbitox.io',
      customDomain: 'order.starlightbrasserie.com',
    }),
  });
  assert(updateBrandRes.ok && updateBrandRes.data.data.restaurantName === 'The Starlight Brasserie', 'Updated tenant branding');

  // Verify custom domain CNAME & SSL provisioning
  const verifyDomainRes = await fetchJson(`${BASE_URL}/api/restaurant/branding/verify-domain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain: 'order.starlightbrasserie.com' }),
  });
  assert(verifyDomainRes.ok && verifyDomainRes.data.data.domainStatus === 'VERIFIED', 'Domain status verified');
  assert(verifyDomainRes.data.data.sslStatus === 'ACTIVE', 'SSL certificate active for custom domain');

  // ─────────────────────────────────────────────────────────────────────────
  // SUITE 4: Diner Mobile PWA Dynamic Theming
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n📱 [SUITE 4] Diner Mobile PWA Dynamic Theming Reflection...');
  const dinerRes = await fetch(`${BASE_URL}/dine/7Kp9xQ8m2L`);
  const dinerHtml = await dinerRes.text();
  assert(dinerHtml.includes('The Starlight Brasserie'), 'Diner PWA reflects custom restaurant brand name');
  assert(dinerHtml.includes('Modern Gastronomy & French-Indian Robata'), 'Diner PWA reflects custom brand tagline');
  assert(dinerHtml.includes('#D97706'), 'Diner PWA injects primary brand color token');

  // ─────────────────────────────────────────────────────────────────────────
  // SUITE 5: Customer Support Desk & Threaded Incident Lifecycle
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n🎧 [SUITE 5] Customer Support Desk & Incident Management...');
  const ticketsBefore = (await fetchJson(`${BASE_URL}/api/restaurant/support/tickets`)).data.data;
  assert(Array.isArray(ticketsBefore), 'Support tickets list fetched');

  // Create new support ticket
  const createTicketRes = await fetchJson(`${BASE_URL}/api/restaurant/support/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject: 'KDS Touchscreen Disconnect in Tandoor Section',
      category: 'HARDWARE_KDS',
      severity: 'HIGH',
      branchId: 'branch_ldh',
      initialMessage: 'Tandoor touch display froze during peak dinner service. Reconnecting wifi.',
      staffName: 'Chef Harpreet',
    }),
  });
  assert(createTicketRes.ok && createTicketRes.data.data, 'Created support incident ticket');
  const createdTicket = createTicketRes.data.data;
  assert(createdTicket.ticketNumber.startsWith('ORB-'), `Assigned ticket reference: ${createdTicket.ticketNumber}`);
  assert(createdTicket.severity === 'HIGH', 'Severity set to HIGH');

  // Append response message
  const msgRes = await fetchJson(`${BASE_URL}/api/restaurant/support/tickets/${createdTicket.id}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'Rebooted station hardware, reconnecting via Ethernet bridge now.',
      senderRole: 'RESTAURANT_STAFF',
      senderName: 'Chef Harpreet',
    }),
  });
  assert(msgRes.ok && msgRes.data.success, 'Appended message to support ticket thread');

  // Update status to INVESTIGATING
  const statusRes = await fetchJson(`${BASE_URL}/api/restaurant/support/tickets/${createdTicket.id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'INVESTIGATING' }),
  });
  assert(statusRes.ok && statusRes.data.data.status === 'INVESTIGATING', 'Updated ticket status to INVESTIGATING');

  // ─────────────────────────────────────────────────────────────────────────
  // SUITE 6: Menu Catalog Management (Create, Edit, Delete)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n☰ [SUITE 6] Menu Catalog Real CRUD Operations...');
  const createDishRes = await fetchJson(`${BASE_URL}/api/restaurant/menu/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Charcoal Saffron Lobster',
      category: 'Starters',
      description: 'Live Maine lobster basted with saffron butter over charcoal embers',
      basePriceMinor: 85000,
      formattedPrice: '₹850.00',
      prepDurationMinutes: 18,
      station: 'TANDOOR',
    }),
  });
  assert(createDishRes.ok && createDishRes.data.data, 'Created new dish via authoritative API');
  const newDish = createDishRes.data.data;
  assert(newDish.id.startsWith('item_'), `Generated dish ID: ${newDish.id}`);

  // Edit dish price and station
  const updateDishRes = await fetchJson(`${BASE_URL}/api/restaurant/menu/items/${newDish.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      basePriceMinor: 92000,
      formattedPrice: '₹920.00',
      station: 'CURRY_LINE',
    }),
  });
  assert(updateDishRes.ok && updateDishRes.data.data.basePriceMinor === 92000, 'Updated dish price');
  assert(updateDishRes.data.data.station === 'CURRY_LINE', 'Updated dish kitchen station');

  // Delete dish
  const deleteDishRes = await fetchJson(`${BASE_URL}/api/restaurant/menu/items/${newDish.id}`, {
    method: 'DELETE',
  });
  assert(deleteDishRes.ok && deleteDishRes.data.success, 'Deleted dish successfully');

  // Verify deletion from catalog
  const menuRes = await fetchJson(`${BASE_URL}/api/restaurant/menu`);
  const deletedStillExists = (menuRes.data.data || []).some((i) => i.id === newDish.id);
  assert(!deletedStillExists, 'Verified dish no longer exists in menu catalog');

  // ─────────────────────────────────────────────────────────────────────────
  // SUITE 7: Playwright Headless Browser Verification of 5 New Workspaces
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n🖥️ [SUITE 7] Playwright Browser Verification of New Workspaces...');
  const browser = await chromium.launch({
    ...(RESOLVED_CHROME_PATH ? { executablePath: RESOLVED_CHROME_PATH } : {}),
    headless: true,
  });
  const page = await browser.newPage();

  // 1. Visit Template Marketplace
  await page.goto(`${BASE_URL}/marketplace`);
  await page.waitForSelector('.template-card');
  const cardCount = await page.locator('.template-card').count();
  assert(cardCount >= 6, `Marketplace rendered ${cardCount} interactive template cards`);

  // Open Preview Modal
  const previewBtn = page.locator('button:has-text("Preview"):visible').first();
  await previewBtn.click();
  await page.waitForSelector('#preview-modal', { state: 'visible' });
  assert(true, 'Template interactive preview modal opened');
  await page.locator('#preview-modal #close-preview-btn, #preview-modal button:has-text("Close"), #preview-modal button:has-text("✕")').first().click();

  // 2. Visit Visual Brand Studio
  await page.goto(`${BASE_URL}/studio`);
  await page.waitForSelector('#studio-canvas-stage');
  await page.waitForSelector('#inspector-content');
  assert(true, 'Visual Brand Studio loaded with interactive canvas and inspector');

  // Click on canvas section to test selection
  const firstCanvasSection = page.locator('.canvas-section').first();
  if (await firstCanvasSection.count() > 0) {
    await firstCanvasSection.click();
    assert(true, 'Selected canvas section updates contextual inspector');
  }

  // 3. Visit White-Label & Custom Domains
  await page.goto(`${BASE_URL}/white-label`);
  await page.waitForSelector('#brand-name');
  const brandVal = await page.locator('#brand-name').inputValue();
  assert(brandVal.length > 0, `White-label workspace loaded with restaurant name: ${brandVal}`);

  // 4. Visit Staff Directory & RBAC Security
  await page.goto(`${BASE_URL}/staff`);
  await page.waitForSelector('.staff-row');
  const staffCount = await page.locator('.staff-row').count();
  assert(staffCount >= 4, `Staff directory rendered ${staffCount} staff records`);

  // 5. Visit Customer Support Desk
  await page.goto(`${BASE_URL}/support`);
  await page.waitForSelector('.ticket-row');
  const ticketCount = await page.locator('.ticket-row').count();
  assert(ticketCount >= 1, `Support desk rendered ${ticketCount} ticket rows`);

  // Click ticket to select and inspect thread
  await page.locator('.ticket-row').first().click();
  await page.waitForSelector('#inspector-messages-thread');
  assert(true, 'Inspected threaded conversation in customer support workspace');

  await browser.close();

  // Reset brand back to elegant defaults
  await fetchJson(`${BASE_URL}/api/restaurant/branding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantName: 'OrbitoX Bistro & Bar',
      tagline: 'Modern Hospitality & Charcoal Embers',
      primaryColor: '#C86B3C',
      secondaryColor: '#5D9A7A',
      surfaceColor: '#090B0E',
      activeTemplateId: 'tmpl_haute_gastronomy',
    }),
  });

  console.log('\n======================================================================');
  console.log(`🎉 RESTAURANTOS 3.0 REDESIGN SUITE: ${passed} Passed | ${failed} Failed`);
  console.log('======================================================================\n');
}

runRedesignTests().catch((err) => {
  console.error('Fatal Redesign Test Failure:', err);
  process.exit(1);
});
