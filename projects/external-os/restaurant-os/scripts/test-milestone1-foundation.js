/**
 * 🧪 RestaurantOS Milestone 1 — Design Foundation, Typography & Shell Normalization Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Deterministic automated verification of:
 * 1. Tokens and Theme Tokens export contract & backwards-compatibility
 * 2. Stylesheet rules (focus-visible, breadcrumbs, sse-badge, cmdk, buttons)
 * 3. 4 Approved Route Redirects with query parameter preservation & no loops
 * 4. Canonical Route compatibility & existing aliases (/overview, /orders, /whitelabel)
 * 5. Shell normalization (220px rail, breadcrumb trail, context preservation, SSE badge,
 *    external Control Plane link, Command Palette, mobile drawer & bottom nav)
 * 6. Visual independence of standalone surfaces (KDS, CraveAtlas, SwiftBite, PantryRush)
 */

const assert = require('assert');
const http = require('http');

const { RestaurantTokens } = require('../packages/ui/tokens');
const { BASE_STYLE_SHEET } = require('../packages/ui/styles');
const { renderShell } = require('../packages/ui/shell');

const BASE_URL = process.env.RESTAURANTOS_URL || 'http://localhost:4010';

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

function makeRequest(method, urlPath, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const req = http.request(
      url,
      {
        method,
        headers: {
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function runMilestone1Suite() {
  console.log('\n================================================================');
  console.log('🪐 RESTAURANTOS MILESTONE 1: DESIGN FOUNDATION ACCEPTANCE TESTS');
  console.log('================================================================\n');

  // ───────────────────────────────────────────────────────────────────────────
  // PART 1: TOKENS CONTRACT & INTEGRITY
  // ───────────────────────────────────────────────────────────────────────────
  console.log('📦 PART 1: Tokens Contract & Backwards Compatibility');
  try {
    assert(RestaurantTokens.colors, 'RestaurantTokens.colors must exist');
    assert.strictEqual(RestaurantTokens.colors.copper, '#C86B3C', 'Copper terracotta token must match #C86B3C');
    assert.strictEqual(RestaurantTokens.colors.ink, '#0D0F10', 'Deepest canvas ink token must match #0D0F10');
    assert.strictEqual(RestaurantTokens.colors.charcoal, '#151719', 'Operational charcoal token must match #151719');
    assert.strictEqual(RestaurantTokens.colors.focusRing, 'rgba(200, 107, 60, 0.55)', 'Accessible focus ring token must match');
    assert.strictEqual(RestaurantTokens.colors.disabled, '#5A554E', 'Disabled text token must match #5A554E');
    assert.strictEqual(RestaurantTokens.colors.disabledBg, 'rgba(255, 255, 255, 0.03)', 'Disabled bg token must match');

    assert(RestaurantTokens.typography, 'RestaurantTokens.typography must exist');
    assert(RestaurantTokens.typography.staffFont.includes('Inter'), 'Staff font must specify Inter');
    assert(RestaurantTokens.typography.guestBodyFont.includes('Inter'), 'Guest body font must specify Inter');
    assert(RestaurantTokens.typography.lineHeights, 'lineHeights token scale must exist');
    assert.strictEqual(RestaurantTokens.typography.lineHeights.base, '20px', 'lineHeights.base must be 20px');

    assert(RestaurantTokens.breakpoints, 'breakpoints token scale must exist');
    assert.strictEqual(RestaurantTokens.breakpoints.mobile, '640px', 'Mobile breakpoint must be 640px');
    assert.strictEqual(RestaurantTokens.breakpoints.tablet, '768px', 'Tablet breakpoint must be 768px');
    assert.strictEqual(RestaurantTokens.breakpoints.desktop, '1024px', 'Desktop breakpoint must be 1024px');
    assert.strictEqual(RestaurantTokens.breakpoints.wide, '1440px', 'Wide breakpoint must be 1440px');

    assert(RestaurantTokens.touch, 'touch token scale must exist');
    assert.strictEqual(RestaurantTokens.touch.minTarget, '44px', 'Minimum touch target must be 44px for accessibility');

    pass('Token system exports, typography scale, breakpoints, and accessible tokens are verified');
  } catch (err) {
    fail('Part 1 Tokens test failed', err);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PART 2: STYLESHEET RULES & ACCESSIBLE STATES
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n🎨 PART 2: Stylesheet Rules, Focus States, & Utility Classes');
  try {
    assert(BASE_STYLE_SHEET.includes(':focus-visible'), 'BASE_STYLE_SHEET must declare accessible :focus-visible rule');
    assert(BASE_STYLE_SHEET.includes('--focus-ring'), 'BASE_STYLE_SHEET must declare --focus-ring variable');
    assert(BASE_STYLE_SHEET.includes('.breadcrumb-trail'), 'BASE_STYLE_SHEET must define .breadcrumb-trail');
    assert(BASE_STYLE_SHEET.includes('.breadcrumb-item'), 'BASE_STYLE_SHEET must define .breadcrumb-item');
    assert(BASE_STYLE_SHEET.includes('.sse-badge'), 'BASE_STYLE_SHEET must define .sse-badge');
    assert(BASE_STYLE_SHEET.includes('.sse-dot'), 'BASE_STYLE_SHEET must define .sse-dot');
    assert(BASE_STYLE_SHEET.includes('.cmdk-box'), 'BASE_STYLE_SHEET must define .cmdk-box');
    assert(BASE_STYLE_SHEET.includes('.cmdk-backdrop'), 'BASE_STYLE_SHEET must define .cmdk-backdrop');
    assert(BASE_STYLE_SHEET.includes('.btn-danger'), 'BASE_STYLE_SHEET must define .btn-danger');
    assert(BASE_STYLE_SHEET.includes('.btn:disabled'), 'BASE_STYLE_SHEET must define disabled button states');
    pass('BASE_STYLE_SHEET contains all required accessibility, component, and utility rules');
  } catch (err) {
    fail('Part 2 Stylesheet test failed', err);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PART 3: APPROVED ROUTE REDIRECTS (4 EXPRESSLY APPROVED ALIASES)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n🔀 PART 3: Approved Route Redirects with Query Preservation');

  const redirectCases = [
    {
      alias: '/crave-atlas',
      expectedTarget: '/apps/crave-atlas',
      label: 'CraveAtlas alias without query',
    },
    {
      alias: '/crave-atlas?branch=branch_del&mode=preview',
      expectedTarget: '/apps/crave-atlas?branch=branch_del&mode=preview',
      label: 'CraveAtlas alias preserving query params',
    },
    {
      alias: '/swift-bite',
      expectedTarget: '/apps/swift-bite',
      label: 'SwiftBite alias without query',
    },
    {
      alias: '/swift-bite?branch=branch_mum&table=5',
      expectedTarget: '/apps/swift-bite?branch=branch_mum&table=5',
      label: 'SwiftBite alias preserving branch and table query',
    },
    {
      alias: '/pantry-rush',
      expectedTarget: '/apps/pantry-rush',
      label: 'PantryRush alias without query',
    },
    {
      alias: '/pantry-rush?pincode=141001&cat=dairy',
      expectedTarget: '/apps/pantry-rush?pincode=141001&cat=dairy',
      label: 'PantryRush alias preserving pincode query',
    },
    {
      alias: '/locations',
      expectedTarget: '/operations/locations',
      label: 'Locations alias without query',
    },
    {
      alias: '/locations?branch=branch_del',
      expectedTarget: '/operations/locations?branch=branch_del',
      label: 'Locations alias preserving branch query',
    },
  ];

  for (const rc of redirectCases) {
    try {
      const res = await makeRequest('GET', rc.alias);
      assert.strictEqual(res.status, 302, `${rc.alias} must return HTTP 302`);
      assert.strictEqual(
        res.headers.location,
        rc.expectedTarget,
        `${rc.alias} must redirect to ${rc.expectedTarget}, got ${res.headers.location}`
      );
      pass(`Redirect: ${rc.label}`, `${rc.alias} → ${res.headers.location}`);
    } catch (err) {
      fail(`Redirect test failed for ${rc.alias}`, err);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PART 4: CANONICAL ROUTES AND EXISTING ALIASES (NO REDIRECT LOOPS)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n🏛️ PART 4: Canonical Routes & Legacy Aliases Return HTTP 200');

  const canonicalRoutes = [
    { path: '/apps/crave-atlas', label: 'Canonical CraveAtlas storefront' },
    { path: '/apps/swift-bite', label: 'Canonical SwiftBite express storefront' },
    { path: '/apps/pantry-rush', label: 'Canonical PantryRush quick-commerce' },
    { path: '/operations/locations', label: 'Canonical Locations Workspace' },
    { path: '/', label: 'Operations Command (Root)' },
    { path: '/overview', label: 'Legacy alias /overview' },
    { path: '/operations/orders', label: 'Canonical Orders Workspace' },
    { path: '/orders', label: 'Legacy alias /orders' },
    { path: '/white-label', label: 'Canonical White-Label Workspace' },
    { path: '/whitelabel', label: 'Legacy alias /whitelabel' },
    { path: '/operations/floor', label: 'Spatial Floor Studio' },
    { path: '/operations/tables', label: 'Tables Fleet' },
    { path: '/menu', label: 'Menu Workspace' },
    { path: '/kds', label: 'Standalone Kitchen Display System' },
    { path: '/marketplace', label: 'Storefront Marketplace' },
    { path: '/studio', label: 'Visual Brand Studio' },
    { path: '/developer/inspector', label: 'Developer Inspector' },
  ];

  for (const cr of canonicalRoutes) {
    try {
      const res = await makeRequest('GET', cr.path);
      assert.strictEqual(res.status, 200, `${cr.path} must return HTTP 200`);
      assert(res.raw.length > 200, `${cr.path} must return non-empty HTML`);
      pass(`Canonical route OK: ${cr.label} (${cr.path})`, `status: ${res.status}`);
    } catch (err) {
      fail(`Canonical route test failed for ${cr.path}`, err);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PART 5: SHEEL NORMALIZATION & CONTEXT PRESERVATION
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n🐚 PART 5: Shell Normalization, Breadcrumbs, & Context Flow');
  try {
    const testBranch = 'branch_del';
    const testFloor = 'fl_mezzanine';
    const testService = 'LUNCH';

    const testHtml = renderShell('<div>Main Content Area</div>', {
      title: 'Active Floor Canvas',
      activeNav: 'floor',
      restaurantName: 'OrbitoX Prime Bistro',
      currentBranchId: testBranch,
      currentFloorId: testFloor,
      currentServiceShift: testService,
      branches: [
        { id: 'branch_del', name: 'Delhi Aerocity', address: 'Terminal 3', city: 'New Delhi', phone: '+91 11 4567 8901' },
      ],
      floors: [
        { id: 'fl_mezzanine', branchId: 'branch_del', name: 'Mezzanine Deck', level: 1, gridWidth: 20, gridHeight: 20 },
      ],
    });

    // 1. Desktop 220px nav rail
    assert(testHtml.includes('nav-rail'), 'Shell must render .nav-rail');
    assert(testHtml.includes('width: 220px'), 'Shell must specify 220px desktop sidebar rail width');
    assert(testHtml.includes('nav-brand'), 'Shell must render .nav-brand');

    // 2. Breadcrumb trail
    assert(testHtml.includes('breadcrumb-trail'), 'Shell must render .breadcrumb-trail');
    assert(testHtml.includes('RestaurantOS'), 'Breadcrumb must include root RestaurantOS link');
    assert(testHtml.includes('Operations'), 'Breadcrumb must categorize section');
    assert(testHtml.includes('Active Floor Canvas'), 'Breadcrumb must render current page title');

    // 3. Context preservation in navigation links
    assert(
      testHtml.includes('branch=branch_del'),
      'Navigation links must preserve branch query parameter'
    );
    assert(
      testHtml.includes('floor=fl_mezzanine'),
      'Navigation links must preserve floor query parameter'
    );
    assert(
      testHtml.includes('service=LUNCH'),
      'Navigation links must preserve service shift parameter'
    );

    // 4. SSE badge and EventSource listener
    assert(testHtml.includes('sse-badge'), 'Shell must render live .sse-badge');
    assert(testHtml.includes('new EventSource'), 'Shell client script must initialize EventSource');
    assert(testHtml.includes('/api/restaurant/events'), 'EventSource must connect to /api/restaurant/events');

    // 5. External Control Plane link
    assert(testHtml.includes('target="_blank"'), 'Control plane link must open in new tab');
    assert(testHtml.includes('rel="noopener noreferrer"'), 'Control plane link must use safe rel attributes');
    assert(testHtml.includes('Open OrbitoX Control Plane ↗'), 'Control plane link must render approved label');

    // 6. Command Palette modal & keyboard shortcut
    assert(testHtml.includes('cmdk-modal'), 'Shell must include #cmdk-modal markup');
    assert(testHtml.includes('cmdk-input'), 'Shell must include Command Palette input');
    assert(testHtml.includes('cmdk-list'), 'Shell must include Command Palette results list');
    assert(testHtml.includes('keydown'), 'Shell client script must listen for keyboard events');
    assert(testHtml.includes('Meta') || testHtml.includes('ctrlKey') || testHtml.includes('key === "k"'), 'Command Palette must listen for ⌘K');

    // 7. Mobile responsive elements
    assert(testHtml.includes('sidebar-toggle'), 'Shell must render mobile drawer toggle button (.sidebar-toggle)');
    assert(testHtml.includes('toggleMobileSidebar'), 'Shell must bind toggleMobileSidebar handler');
    assert(testHtml.includes('mobile-nav-bar'), 'Shell must render mobile bottom navigation (.mobile-nav-bar)');
    assert(testHtml.includes('mobile-nav-item'), 'Shell must render mobile bottom nav items (.mobile-nav-item)');

    pass('Shell correctly implements desktop rail, breadcrumbs, context flow, SSE gateway, Control Plane, CMD+K, and mobile layouts');
  } catch (err) {
    fail('Part 5 Shell normalization test failed', err);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PART 6: STANDALONE SURFACES ISOLATION CHECK
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n🛡️ PART 6: Standalone Surfaces Independence');
  try {
    // Fetch KDS
    const kdsRes = await makeRequest('GET', '/kds');
    assert.strictEqual(kdsRes.status, 200);
    assert(!kdsRes.raw.includes('nav-rail'), 'KDS must NOT include nav-rail');
    assert(!kdsRes.raw.includes('mobile-nav-bar'), 'KDS must NOT include mobile-nav-bar');
    pass('Standalone KDS is free of operational shell bleed');

    // Fetch CraveAtlas
    const caRes = await makeRequest('GET', '/apps/crave-atlas');
    assert.strictEqual(caRes.status, 200);
    assert(!caRes.raw.includes('nav-rail'), 'CraveAtlas must NOT include operational nav-rail');
    assert(!caRes.raw.includes('breadcrumb-trail'), 'CraveAtlas must NOT include operational breadcrumbs');
    pass('Standalone CraveAtlas is free of operational shell bleed');

    // Fetch SwiftBite
    const sbRes = await makeRequest('GET', '/apps/swift-bite');
    assert.strictEqual(sbRes.status, 200);
    assert(!sbRes.raw.includes('nav-rail'), 'SwiftBite must NOT include operational nav-rail');
    pass('Standalone SwiftBite is free of operational shell bleed');

    // Fetch PantryRush
    const prRes = await makeRequest('GET', '/apps/pantry-rush');
    assert.strictEqual(prRes.status, 200);
    assert(!prRes.raw.includes('nav-rail'), 'PantryRush must NOT include operational nav-rail');
    pass('Standalone PantryRush is free of operational shell bleed');
  } catch (err) {
    fail('Part 6 Standalone isolation test failed', err);
  }

  console.log('\n================================================================');
  console.log(`🎉 ALL TESTS PASSED: ${passedChecks}/${totalChecks} checks successful!`);
  console.log('================================================================\n');
}

runMilestone1Suite().catch((err) => {
  console.error('\n💥 FATAL SUITE EXECUTION ERROR:', err);
  process.exit(1);
});
