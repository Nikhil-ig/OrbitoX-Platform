const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

function generateSyntheticTestStore() {
  const branches = [
    {
      id: 'branch_ldh',
      name: 'Orbito Bistro & Bar — Ludhiana Main',
      slug: 'ludhiana-main',
      city: 'Ludhiana',
      state: 'Punjab',
      address: 'Ferozepur Road, Ludhiana, Punjab 141001',
      phone: '+91 161 500 1234',
      isActive: true,
      serviceModel: 'FINE_DINE',
      settings: {
        currency: 'INR',
        currencySymbol: '₹',
        taxRatePercent: 5,
        serviceChargePercent: 0,
        enableKdsAudio: true,
        enforceKdsReadinessGating: true,
      },
    },
    {
      id: 'branch_chd',
      name: 'Orbito Bistro & Social — Chandigarh Sector 26',
      slug: 'chandigarh-sector-26',
      city: 'Chandigarh',
      state: 'Chandigarh UT',
      address: 'Sector 26, Madhya Marg, Chandigarh 160019',
      phone: '+91 172 500 5678',
      isActive: true,
      serviceModel: 'HYBRID',
      settings: {
        currency: 'INR',
        currencySymbol: '₹',
        taxRatePercent: 5,
        serviceChargePercent: 0,
        enableKdsAudio: true,
        enforceKdsReadinessGating: true,
      },
    },
    {
      id: 'branch_del',
      name: 'Orbito Express & Lounge — Delhi Aerocity',
      slug: 'delhi-aerocity',
      city: 'New Delhi',
      state: 'Delhi NCR',
      address: 'Worldmark 2, Aerocity, New Delhi 110037',
      phone: '+91 11 4000 9876',
      isActive: true,
      serviceModel: 'QSR',
      settings: {
        currency: 'INR',
        currencySymbol: '₹',
        taxRatePercent: 5,
        serviceChargePercent: 0,
        enableKdsAudio: true,
        enforceKdsReadinessGating: true,
      },
    },
  ];

  const floors = [
    { id: 'floor_ground_ldh', name: 'Ground Floor Dining Room', branchId: 'branch_ldh', level: 0 },
    { id: 'floor_first_ldh', name: 'First Floor Lounge & Terrace', branchId: 'branch_ldh', level: 1 },
    { id: 'floor_ground_chd', name: 'Main Dining Hall', branchId: 'branch_chd', level: 0 },
  ];

  const tables = [];
  // 14 tables for branch_ldh (IDs 1 through 14)
  for (let i = 1; i <= 14; i++) {
    const num = i < 10 ? `T-0${i}` : `T-${i}`;
    tables.push({
      id: i,
      number: num,
      floorId: i <= 8 ? 'floor_ground_ldh' : 'floor_first_ldh',
      branchId: 'branch_ldh',
      capacity: i % 2 === 0 ? 4 : 2,
      status: i === 14 ? 'OCCUPIED' : (i === 6 ? 'OCCUPIED' : (i === 8 ? 'OCCUPIED' : 'AVAILABLE')),
      x: i === 1 ? 60 : 40 + ((i - 1) % 5) * 120,
      y: i === 1 ? 48 : 40 + Math.floor((i - 1) / 5) * 100,
      width: 72,
      height: 72,
      shape: i === 1 ? 'circle' : 'rectangle',
      section: i <= 8 ? 'Main Dining Room' : 'Terrace Lounge',
      locator: i === 1 ? '7Kp9xQ8m2L' : `loc_test_${i}`,
      seats: [
        { id: `s_${i}_1`, label: 'Seat 1', isOccupied: false },
        { id: `s_${i}_2`, label: 'Seat 2', isOccupied: false },
      ],
      qrLocator: i === 1 ? '7Kp9xQ8m2L' : `qr_loc_test_${i}`,
      activeBillMinor: i === 14 ? 76650 : (i === 8 ? 47250 : 0),
      activeSessionId: i === 14 ? 'sess_test_14' : (i === 8 ? 'sess_test_8' : undefined),
    });
  }
  // Table 20 in Chandigarh
  tables.push({
    id: 20,
    number: 'T-20',
    floorId: 'floor_ground_chd',
    branchId: 'branch_chd',
    capacity: 4,
    status: 'AVAILABLE',
    x: 100,
    y: 100,
    width: 72,
    height: 72,
    shape: 'rectangle',
    section: 'Main Dining Hall',
    locator: 'loc_test_20',
    seats: [{ id: 's_20_1', label: 'Seat 1', isOccupied: false }],
    qrLocator: 'qr_loc_test_20',
    activeBillMinor: 0,
  });

  const menuItems = [
    {
      id: 'item_dal_makhani',
      name: 'Dal Makhani Bukhara Style',
      description: 'Slow-simmered black lentils with churned white butter',
      category: 'MAINS_VEG',
      priceMinor: 45000,
      station: 'CURRY_LINE',
      isAvailable: true,
      tags: ['Vegetarian', 'Signature'],
    },
    {
      id: 'item_butter_chicken',
      name: 'Old Delhi Butter Chicken',
      description: 'Clay-oven charred chicken in velvety tomato makhani gravy',
      category: 'MAINS_NON_VEG',
      priceMinor: 52000,
      station: 'CURRY_LINE',
      isAvailable: true,
      tags: ['Non-Vegetarian', 'Popular'],
    },
    {
      id: 'item_paneer_tikka',
      name: 'Amritsari Paneer Tikka',
      description: 'Cottage cheese cubes marinated in mustard and carom seeds',
      category: 'APPETIZERS',
      priceMinor: 38000,
      station: 'TANDOOR',
      isAvailable: true,
      tags: ['Vegetarian', 'Tandoor'],
    },
    {
      id: 'item_tandoori_roti',
      name: 'Whole Wheat Tandoori Roti',
      description: 'Traditional crisp unleavened bread baked on charcoal flame',
      category: 'BREADS',
      priceMinor: 4500,
      station: 'TANDOOR',
      isAvailable: true,
      tags: ['Vegetarian', 'Vegan'],
    },
  ];

  // Deterministic synthetic orders including ord_mkt_cf9eecc8
  const orders = [
    {
      orderId: 'ord_mkt_cf9eecc8',
      displayId: '#ord_mkt_cf9eecc8',
      tableNumber: 'T-04',
      sessionId: 'sess_test_m2',
      branchId: 'branch_ldh',
      status: 'SERVED',
      customerName: 'Test Diner Alpha',
      customerPhone: '+91 99999 00001',
      items: [
        { id: 'item_dal_makhani', name: 'Dal Makhani Bukhara Style', quantity: 1, unitPriceMinor: 45000, station: 'CURRY_LINE' },
        { id: 'item_tandoori_roti', name: 'Whole Wheat Tandoori Roti', quantity: 2, unitPriceMinor: 4500, station: 'TANDOOR' },
      ],
      subtotalMinor: 54000,
      taxMinor: 1450,
      totalMinor: 55450,
      placedAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  // 170 deterministic synthetic historical orders for order ledger pagination & display tests
  for (let i = 1; i <= 170; i++) {
    const oId = `ord_synth_${i.toString().padStart(4, '0')}`;
    orders.push({
      orderId: oId,
      displayId: `#${oId}`,
      tableNumber: `T-0${(i % 14) + 1}`,
      sessionId: `sess_synth_${i}`,
      branchId: 'branch_ldh',
      status: i % 5 === 0 ? 'PAID' : (i % 7 === 0 ? 'CANCELLED' : 'SERVED'),
      customerName: `Synthetic Customer ${i}`,
      customerPhone: `+91 99999 ${i.toString().padStart(5, '0')}`,
      items: [
        { id: 'item_dal_makhani', name: 'Dal Makhani', quantity: 1, unitPriceMinor: 45000, station: 'CURRY_LINE' }
      ],
      subtotalMinor: 45000,
      taxMinor: 2250,
      totalMinor: 47250,
      placedAt: new Date(Date.now() - i * 60000).toISOString(),
    });
  }

  const kitchenTasks = [
    {
      id: 'task_tandoor_01',
      orderId: 'ord_mkt_cf9eecc8',
      tableNumber: 'T-04',
      branchId: 'branch_ldh',
      station: 'TANDOOR',
      status: 'READY',
      items: [{ id: 'item_tandoori_roti', name: 'Whole Wheat Tandoori Roti', quantity: 2, fulfilled: true }],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task_curry_01',
      orderId: 'ord_mkt_cf9eecc8',
      tableNumber: 'T-04',
      branchId: 'branch_ldh',
      station: 'CURRY_LINE',
      status: 'READY',
      items: [{ id: 'item_dal_makhani', name: 'Dal Makhani Bukhara Style', quantity: 1, fulfilled: true }],
      createdAt: new Date().toISOString(),
    },
  ];

  return {
    version: 1,
    revisions: 1,
    lastUpdated: new Date().toISOString(),
    branches,
    floors,
    tables,
    orders,
    kitchenTasks,
    serviceRequests: [],
    menuItems,
    categories: [
      { id: 'MAINS_VEG', name: 'Vegetarian Mains', displayOrder: 1 },
      { id: 'MAINS_NON_VEG', name: 'Non-Vegetarian Mains', displayOrder: 2 },
      { id: 'APPETIZERS', name: 'Appetizers & Starters', displayOrder: 3 },
      { id: 'BREADS', name: 'Artisanal Breads', displayOrder: 4 },
    ],
    guests: [],
    sessions: [
      {
        sessionId: 'sess_test_14',
        tableNumber: 'T-14',
        branchId: 'branch_ldh',
        status: 'ACTIVE',
        openedAt: new Date().toISOString(),
        guestCapabilityTokens: ['cap_test_14_token'],
      },
      {
        sessionId: 'sess_test_8',
        tableNumber: 'T-08',
        branchId: 'branch_ldh',
        status: 'ACTIVE',
        openedAt: new Date().toISOString(),
        guestCapabilityTokens: ['cap_test_8_token'],
      },
    ],
    events: [],
    invalidatedCapabilityTokens: [],
    revokedStaffTokens: [],
    revokedStaffTokenJtis: [],
    staffMembers: [
      {
        id: 'staff_mgr_ldh',
        name: 'Elena Rostova',
        role: 'MANAGER',
        branchId: 'branch_ldh',
        station: 'MANAGEMENT',
        salt: 'test_salt_123',
        pinHash: 'scrypt:69d3b32d8ae12c33eba477a53bd50cb9dbab605820cdfc66fd8e3bb860eec01c',
        status: 'ACTIVE',
        permissions: ['*'],
      },
    ],
    templates: [],
    tenantBrand: {
      restaurantName: 'OrbitoX Bistro & Bar',
      tagline: 'Modern Hospitality & Charcoal Embers',
      logoUrl: 'https://assets.orbitox.io/logos/orbitox-bistro-gold.svg',
      faviconUrl: '/favicon.ico',
      appIconUrl: 'https://assets.orbitox.io/icons/app-icon-192.png',
      primaryColor: '#C86B3C',
      secondaryColor: '#D99A45',
      accentColor: '#5D9A7A',
      surfaceColor: '#121519',
      textColor: '#F3EEE5',
      fontFamilyHeading: '"Playfair Display", Georgia, serif',
      fontFamilyBody: 'system-ui, -apple-system, sans-serif',
      activeTemplateId: 'tmpl_haute_gastronomy',
      subdomain: 'bistro.orbitox.live',
      customDomain: 'dine.orbitoxbistro.com',
      domainStatus: 'ACTIVE',
      sslStatus: 'ACTIVE',
      customCss: '',
      socialLinks: {},
      branchOverrides: {},
    },
    templateDraft: {
      templateId: 'tmpl_haute_gastronomy',
      version: 1,
      draftSections: [],
      draftTokens: {},
      publishedSections: [],
      publishedTokens: {},
      lastSavedAt: new Date().toISOString(),
      lastPublishedAt: new Date().toISOString(),
      revisions: [],
    },
    supportTickets: [],
    branchMenuOverrides: [],
    lastEventSequence: 10,
    grocerySkus: [],
    idempotencyRecords: {},
    restaurantPartners: [],
  };
}

/**
 * 🪐 RestaurantOS Test Harness: Ephemeral Server & Store Sandbox
 * ─────────────────────────────────────────────────────────────────────────────
 * Spawns an isolated ephemeral RestaurantOS server with its own temporary store and directory.
 * Guarantees zero pollution of data/restaurant-runtime-store.json or development runtime (port 4010).
 * Uses a 100% synthetic, sanitized test fixture with ZERO copied live user data or customer PII.
 */
async function startIsolatedServer(options = {}) {
  const prefix = options.prefix || 'test';
  const port = options.port || (4080 + Math.floor(Math.random() * 100));
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `restaurant-${prefix}-${Date.now()}-`));
  const storePath = path.join(tmpDir, 'restaurant-runtime-store.json');

  // Seed with 100% synthetic sanitized test fixture
  const syntheticStore = generateSyntheticTestStore();
  fs.writeFileSync(storePath, JSON.stringify(syntheticStore, null, 2), { mode: 0o600, encoding: 'utf8' });

  const url = `http://127.0.0.1:${port}`;

  const localTsx = path.join(__dirname, '..', 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');
  const tsxCmd = fs.existsSync(localTsx) ? localTsx : 'tsx';

  let serverStderr = '';
  const serverProcess = spawn(tsxCmd, ['src/server.ts'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      RESTAURANT_STORE_PATH: storePath,
      STORAGE_DRIVER: 'json',
      NODE_ENV: 'test',
      RESTAURANTOS_AUTOLISTEN: 'true',
      RESTAURANTOS_ENABLE_TEST_ROUTES: 'true',
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  });

  serverProcess.stderr?.on('data', (d) => {
    serverStderr += d.toString();
  });

  serverProcess.on('exit', (code, signal) => {
    if (code !== null && code !== 0) {
      console.error(`[ServerProcess Crashed] exit code: ${code}, signal: ${signal}\nStderr: ${serverStderr}`);
    }
  });

  // Wait for server readiness (up to 20s for TypeScript compilation cold start)
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`${url}/healthz/live`);
      if (res.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }

  if (!ready) {
    try { serverProcess.kill('SIGKILL'); } catch {}
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    throw new Error(`Isolated test server failed to start on ${url} within 20000ms. Stderr: ${serverStderr.slice(-1000)}`);
  }

  const activeHarnesses = new Set();

  const stop = async () => {
    activeHarnesses.delete(stop);
    try {
      serverProcess.kill('SIGKILL');
    } catch (e) {
      console.error('Failed to kill test server process:', e);
    }
    // Allow process to terminate and release file handles
    await new Promise((r) => setTimeout(r, 150));

    if (fs.existsSync(tmpDir)) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (rmErr) {
        console.error(`Cleanup error removing ${tmpDir}:`, rmErr);
      }
    }
    assert.strictEqual(fs.existsSync(tmpDir), false, `Isolated tmpDir ${tmpDir} must be cleanly removed`);
  };

  activeHarnesses.add(stop);

  // Global exit fallback in case test terminates abruptly
  process.once('exit', () => {
    try { serverProcess.kill('SIGKILL'); } catch {}
    try { if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  return {
    url,
    port,
    storePath,
    tmpDir,
    serverProcess,
    stop,
    getStderr: () => serverStderr,
  };
}

module.exports = {
  startIsolatedServer,
};
