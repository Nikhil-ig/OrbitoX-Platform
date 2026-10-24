#!/usr/bin/env node
/**
 * End-to-end smoke test for a RUNNING OrbitoX control plane.
 *
 *   ORBITOX_URL=http://localhost:3005 \
 *   ORBITOX_ADMIN_TOKEN=... ORBITOX_RUNTIME_TOKEN=... \
 *   node scripts/smoke-control-plane.mjs
 *
 * Verifies: public vs. protected surfaces, admin/runtime role separation (including
 * privilege-escalation attempts), real SDK registration + heartbeat, fleet visibility,
 * and the issue -> poll -> complete command loop. Exit code 1 if anything fails.
 * Requires the SDK to be built (`pnpm turbo run build --filter=@orbitox/external-runtime-sdk`).
 */
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';

const BASE = (process.env.ORBITOX_URL || 'http://localhost:3005').replace(/\/$/, '');
const ADMIN = process.env.ORBITOX_ADMIN_TOKEN;
const RUNTIME = process.env.ORBITOX_RUNTIME_TOKEN;
if (!ADMIN || !RUNTIME) {
  console.error('Set ORBITOX_ADMIN_TOKEN and ORBITOX_RUNTIME_TOKEN to run the smoke test.');
  process.exit(2);
}

const require = createRequire(import.meta.url);
const { ControlClient } = require('../packages/external-runtime-sdk/dist/index.js');

const bearer = (t) => ({ Authorization: `Bearer ${t}` });
const json = { 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const status = async (path, init) => (await fetch(BASE + path, init)).status;

let passed = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) { passed++; console.log(`  PASS  ${name}`); }
  else { failures.push(name); console.log(`  FAIL  ${name}${detail ? `  (${detail})` : ''}`); }
}
async function expectStatus(name, want, path, init) {
  const got = await status(path, init);
  check(name, got === want, `want ${want}, got ${got}`);
}

const suffix = randomBytes(3).toString('hex');
const projectId = `smoke_${suffix}`;

console.log(`\nOrbitoX smoke test against ${BASE}\n`);

console.log('Public surface');
await expectStatus('GET /api/health is public', 200, '/api/health');

console.log('\nAdmin surface rejects anonymous callers');
for (const path of [
  '/platform', '/platform/restaurants', '/platform/fleet', '/platform/plans', '/platform/connect', '/platform/settings', '/admin',
  '/api/v1/platform/restaurants', '/api/v1/fleet', '/api/v1/overview', '/api/v1/system/settings', '/api/v1/system/cluster',
  '/hms', '/hrms', '/crm', '/finance', '/commerce', '/store'
]) {
  await expectStatus(`GET ${path} -> 401`, 401, path);
}
await expectStatus('GET /api/v1/projects/anon/plans -> 401', 401, `/api/v1/projects/${projectId}/plans`);
await expectStatus('POST /api/v1/projects/factory -> 401', 401, '/api/v1/projects/factory', { method: 'POST', headers: json, body: '{}' });

console.log('\nAdmin token works (Bearer and Basic)');
await expectStatus('GET /api/v1/fleet with Bearer', 200, '/api/v1/fleet', { headers: bearer(ADMIN) });
await expectStatus('GET /api/v1/fleet with Basic', 200, '/api/v1/fleet', {
  headers: { Authorization: `Basic ${Buffer.from(`admin:${ADMIN}`).toString('base64')}` },
});
await expectStatus('GET /api/v1/overview with Bearer', 200, '/api/v1/overview', { headers: bearer(ADMIN) });
await expectStatus('GET /api/v1/system/settings with Bearer', 200, '/api/v1/system/settings', { headers: bearer(ADMIN) });
await expectStatus('GET /platform with Bearer', 200, '/platform', { headers: bearer(ADMIN) });
await expectStatus('GET /platform/restaurants with Bearer', 200, '/platform/restaurants', { headers: bearer(ADMIN) });
await expectStatus('GET /platform/fleet with Bearer', 200, '/platform/fleet', { headers: bearer(ADMIN) });
await expectStatus('GET /platform/plans with Bearer', 200, '/platform/plans', { headers: bearer(ADMIN) });
await expectStatus('GET /platform/connect with Bearer', 200, '/platform/connect', { headers: bearer(ADMIN) });
await expectStatus('GET /platform/settings with Bearer', 200, '/platform/settings', { headers: bearer(ADMIN) });
await expectStatus('GET /api/v1/platform/restaurants/check-slug with Bearer', 200, '/api/v1/platform/restaurants/check-slug?slug=smoke-test-bistro', { headers: bearer(ADMIN) });

console.log('\nProtected demo surfaces work with admin Bearer');
for (const path of ['/hms', '/hrms', '/crm', '/finance', '/commerce', '/store']) {
  await expectStatus(`GET ${path} with Bearer -> 200`, 200, path, { headers: bearer(ADMIN) });
}

console.log('\nRuntime token cannot escalate to admin');
await expectStatus('runtime token on /api/v1/fleet -> 401', 401, '/api/v1/fleet', { headers: bearer(RUNTIME) });
await expectStatus('runtime token on /platform/fleet -> 401', 401, '/platform/fleet', { headers: bearer(RUNTIME) });
await expectStatus('runtime token on non-runtime project route -> 401', 401, `/api/v1/projects/${projectId}/environments`, { headers: bearer(RUNTIME) });
await expectStatus('runtime token DELETE on a runtime route -> 403', 403, `/api/v1/projects/${projectId}/bridge`, { method: 'DELETE', headers: bearer(RUNTIME) });
await expectStatus('runtime ISSUE command -> 403', 403, `/api/v1/projects/${projectId}/commands`, {
  method: 'POST', headers: { ...json, ...bearer(RUNTIME) }, body: JSON.stringify({ action: 'ISSUE', commandAction: 'restart_runtime' }),
});
await expectStatus('spoofed x-orbitox-principal header is ignored -> 403', 403, `/api/v1/projects/${projectId}/commands`, {
  method: 'POST', headers: { ...json, ...bearer(RUNTIME), 'x-orbitox-principal': 'admin' }, body: JSON.stringify({ action: 'ISSUE', commandAction: 'restart_runtime' }),
});

console.log('\nRegistration rules');
await expectStatus('anonymous REGISTER -> 401', 401, `/api/v1/projects/${projectId}/bridge`, {
  method: 'POST', headers: json, body: JSON.stringify({ action: 'REGISTER', payload: { slug: projectId } }),
});
await expectStatus('invalid projectId rejected -> 400', 400, '/api/v1/projects/x/bridge', {
  method: 'POST', headers: { ...json, ...bearer(RUNTIME) },
  body: JSON.stringify({ action: 'REGISTER', payload: { slug: 'valid-slug', runtimeUrl: 'http://x', runtimePort: 1, version: '1', declaredApis: [], capabilities: [] } }),
});

console.log('\nReal SDK runtime: register, heartbeat, command loop');
const manifest = {
  projectId, slug: `smoke-${suffix}`, name: `Smoke Test ${suffix}`, type: 'custom-os', version: '1.0.0',
  runtime: { type: 'standalone', entrypoint: 'n/a', defaultPort: 4999, healthEndpoint: '/health' },
  enabledPlugins: [], enabledFeatures: [], apis: [], planReferences: [],
  environmentMetadata: { defaultEnvironment: 'local', supportedEnvironments: ['local'] },
  platformController: { controlPlaneUrl: BASE, syncIntervalSeconds: 5, requireSignedConfig: false },
  capabilities: [],
};
const handled = [];
const client = new ControlClient({
  manifest, controlPlaneUrl: BASE, apiKey: RUNTIME, runtimePort: 4999,
  onCommandReceived: async (cmd) => { handled.push(cmd.action); return { success: true, result: { ok: true } }; },
});

const fleetEntry = async () => {
  const res = await fetch(`${BASE}/api/v1/fleet?q=${manifest.slug}`, { headers: bearer(ADMIN) });
  const body = await res.json();
  return body.data?.projects?.find((p) => p.id === projectId);
};

try {
  const reg = await client.registerRuntime();
  check('runtime registers with runtime token', reg.success === true);
  check('registration returns a project-scoped key', typeof reg.projectKey === 'string' && reg.projectKey.startsWith('orb_proj_'));
  const projectKeyA = reg.projectKey;

  console.log('\nPer-project runtime keys');
  await expectStatus("project A's own key works on its bridge route -> 200", 200, `/api/v1/projects/${projectId}/bridge`, { headers: bearer(projectKeyA) });
  await expectStatus("project A's own key works on its commands route -> 200", 200, `/api/v1/projects/${projectId}/commands`, { headers: bearer(projectKeyA) });
  await expectStatus("project A's own key works on its plans route -> 200", 200, `/api/v1/projects/${projectId}/plans`, { headers: bearer(projectKeyA) });
  await expectStatus("runtime key PUT on plans route -> 403", 403, `/api/v1/projects/${projectId}/plans`, {
    method: 'PUT',
    headers: { ...json, ...bearer(projectKeyA) },
    body: JSON.stringify({ planReferences: ['plan_restaurant_growth'] }),
  });
  await expectStatus("admin PUT on plans route -> 200", 200, `/api/v1/projects/${projectId}/plans`, {
    method: 'PUT',
    headers: { ...json, ...bearer(ADMIN) },
    body: JSON.stringify({ planReferences: ['plan_restaurant_growth'] }),
  });

  const suffixB = randomBytes(3).toString('hex');
  const projectIdB = `smoke_b_${suffixB}`;
  const regBRes = await fetch(`${BASE}/api/v1/projects/${projectIdB}/bridge`, {
    method: 'POST',
    headers: { ...json, ...bearer(RUNTIME) },
    body: JSON.stringify({
      action: 'REGISTER',
      payload: {
        slug: `smoke-b-${suffixB}`,
        name: `Smoke Project B ${suffixB}`,
        type: 'custom-os',
        version: '1.0.0',
        runtimeUrl: 'http://localhost:4998',
        runtimePort: 4998,
        declaredApis: [],
        capabilities: [],
      },
    }),
  });
  const regB = await regBRes.json();
  const projectKeyB = regB.projectKey;
  check('second project registers and receives distinct project key', typeof projectKeyB === 'string' && projectKeyB !== projectKeyA);

  await expectStatus("project B key rejected on project A's bridge -> 401", 401, `/api/v1/projects/${projectId}/bridge`, { headers: bearer(projectKeyB) });
  await expectStatus("project B key rejected on project A's commands -> 401", 401, `/api/v1/projects/${projectId}/commands`, { headers: bearer(projectKeyB) });
  await expectStatus("project B key rejected on project A's plans -> 401", 401, `/api/v1/projects/${projectId}/plans`, { headers: bearer(projectKeyB) });

  await expectStatus("shared runtime token rejected on already-registered project's bridge -> 401", 401, `/api/v1/projects/${projectId}/bridge`, { headers: bearer(RUNTIME) });
  await expectStatus("shared runtime token rejected on already-registered project's commands -> 401", 401, `/api/v1/projects/${projectId}/commands`, { headers: bearer(RUNTIME) });
  await expectStatus("shared runtime token rejected on already-registered project's re-registration -> 401", 401, `/api/v1/projects/${projectId}/bridge`, {
    method: 'POST',
    headers: { ...json, ...bearer(RUNTIME) },
    body: JSON.stringify({ action: 'REGISTER', payload: { slug: manifest.slug } }),
  });

  console.log('\nMilestone C: Entitlements, Plans & Live Usage Tracking');
  // 1. Entitlements route security
  await expectStatus('anonymous GET entitlements -> 401', 401, `/api/v1/projects/${projectId}/entitlements`);
  await expectStatus("project B key on project A's entitlements -> 401", 401, `/api/v1/projects/${projectId}/entitlements`, { headers: bearer(projectKeyB) });
  await expectStatus("project A's own key on its entitlements -> 200", 200, `/api/v1/projects/${projectId}/entitlements`, { headers: bearer(projectKeyA) });
  await expectStatus("admin on project A's entitlements -> 200", 200, `/api/v1/projects/${projectId}/entitlements`, { headers: bearer(ADMIN) });

  const entResA = await fetch(`${BASE}/api/v1/projects/${projectId}/entitlements`, { headers: bearer(projectKeyA) });
  const entDataA = await entResA.json();
  check('entitlements endpoint returns expected shape', entDataA.success && typeof entDataA.entitlements === 'object' && entDataA.entitlements.api_calls !== undefined);

  // 2. Usage reporting security & increments
  await expectStatus('anonymous POST usage -> 401', 401, `/api/v1/projects/${projectId}/usage`, {
    method: 'POST', headers: json, body: JSON.stringify({ key: 'api_calls', amount: 1 }),
  });
  await expectStatus("project B key on project A's usage -> 401", 401, `/api/v1/projects/${projectId}/usage`, {
    method: 'POST', headers: { ...json, ...bearer(projectKeyB) }, body: JSON.stringify({ key: 'api_calls', amount: 1 }),
  });
  await expectStatus("admin POST on project A's usage -> 403", 403, `/api/v1/projects/${projectId}/usage`, {
    method: 'POST', headers: { ...json, ...bearer(ADMIN) }, body: JSON.stringify({ key: 'api_calls', amount: 1 }),
  });

  const usageRes1 = await fetch(`${BASE}/api/v1/projects/${projectId}/usage`, {
    method: 'POST', headers: { ...json, ...bearer(projectKeyA) }, body: JSON.stringify({ key: 'api_calls', amount: 5 }),
  });
  const usageData1 = await usageRes1.json();
  check('project A increments usage by 5', usageRes1.status === 200 && usageData1.used === 5 && usageData1.allowed === true);

  // 3. Project isolation: project B's usage is unaffected
  const entResB = await fetch(`${BASE}/api/v1/projects/${projectIdB}/entitlements`, { headers: bearer(projectKeyB) });
  const entDataB = await entResB.json();
  check("project B's usage is unaffected by project A's calls", entDataB.entitlements?.api_calls?.used === 0);

  // 4. Exceeding enforced limit flips allowed: false and surfaces USAGE_LIMIT_EXCEEDED in fleet attention
  const usageExceedRes = await fetch(`${BASE}/api/v1/projects/${projectId}/usage`, {
    method: 'POST', headers: { ...json, ...bearer(projectKeyA) }, body: JSON.stringify({ key: 'api_calls', amount: 100000 }),
  });
  const usageExceedData = await usageExceedRes.json();
  check('exceeding enforced limit flips allowed: false', usageExceedData.allowed === false && usageExceedData.used >= usageExceedData.limit);

  const fleetExceed = await fleetEntry();
  check('USAGE_LIMIT_EXCEEDED surfaces in fleet attention', Array.isArray(fleetExceed?.attention) && fleetExceed.attention.includes('USAGE_LIMIT_EXCEEDED'));

  // 5. Admin reset of counter
  await expectStatus('runtime key DELETE on usage -> 403', 403, `/api/v1/projects/${projectId}/usage?key=api_calls`, {
    method: 'DELETE', headers: bearer(projectKeyA),
  });
  await expectStatus('admin DELETE on usage -> 200', 200, `/api/v1/projects/${projectId}/usage?key=api_calls`, {
    method: 'DELETE', headers: bearer(ADMIN),
  });
  const entResAfterReset = await fetch(`${BASE}/api/v1/projects/${projectId}/entitlements`, { headers: bearer(projectKeyA) });
  const entDataAfterReset = await entResAfterReset.json();
  check('admin reset zeroes counter', entDataAfterReset.entitlements?.api_calls?.used === 0);

  // 6. SDK BillingClient & EntitlementClient methods
  const sdkPlans = await client.billing.getPlan();
  check('SDK client.billing.getPlan() returns plans catalog', Array.isArray(sdkPlans.availablePlans) && sdkPlans.availablePlans.length > 0);

  const sdkQuote = await client.billing.computeQuote({
    planId: 'plan_restaurant_growth',
    addons: ['addon_sommelier_ai'],
    customDiscountPercent: 15,
  });
  check('SDK client.billing.computeQuote() computes live quote', !!sdkQuote && typeof sdkQuote.totalMinor === 'string');

  const sdkEntitlements = await client.entitlements.fetchEntitlements();
  check('SDK client.entitlements.fetchEntitlements() populates client cache', typeof sdkEntitlements === 'object' && sdkEntitlements.api_calls !== undefined);

  const sdkUsageReport = await client.entitlements.reportUsage('api_calls', 10);
  check('SDK client.entitlements.reportUsage() increments and returns allowed/remaining', sdkUsageReport.allowed === true && sdkUsageReport.remaining > 0);

  let entry = await fleetEntry();
  check('new project appears in the fleet', !!entry);
  check('fleet shows it ONLINE', entry?.connection === 'ONLINE', `got ${entry?.connection}`);
  check('fleet shows its real name', entry?.name === manifest.name, `got ${entry?.name}`);

  const issued = await fetch(`${BASE}/api/v1/projects/${projectId}/commands`, {
    method: 'POST', headers: { ...json, ...bearer(ADMIN) }, body: JSON.stringify({ action: 'ISSUE', commandAction: 'run_health_check' }),
  });
  const issuedBody = await issued.json();
  check('admin can issue a command', issued.status === 200 && issuedBody.success === true, `status ${issued.status}`);

  // The SDK polls every 5s; allow up to ~12s for the full round trip.
  let cmd;
  for (let i = 0; i < 12 && cmd?.status !== 'COMPLETED'; i++) {
    await sleep(1000);
    const res = await fetch(`${BASE}/api/v1/projects/${projectId}/commands`, { headers: bearer(ADMIN) });
    cmd = (await res.json()).commands?.find((c) => c.commandId === issuedBody.command?.commandId);
  }
  check('runtime received and executed the command', handled.includes('run_health_check'), `handled: ${handled.join(',') || 'none'}`);
  check('command reported COMPLETED to the control plane', cmd?.status === 'COMPLETED', `status ${cmd?.status}`);

  entry = await fleetEntry();
  check('last command is visible in the fleet', entry?.commands?.last?.action === 'run_health_check');
  check('activity is recorded in the audit trail', !!entry?.lastActivity, 'no lastActivity');

  await expectStatus('GET /api/v1/projects/{id} -> 200', 200, `/api/v1/projects/${projectId}`, { headers: bearer(ADMIN) });
  await expectStatus('GET /api/v1/projects/{id}/activity -> 200', 200, `/api/v1/projects/${projectId}/activity`, { headers: bearer(ADMIN) });
  await expectStatus('GET /platform/projects/{id} with Bearer -> 200', 200, `/platform/projects/${projectId}`, { headers: bearer(ADMIN) });

  console.log('\nRestaurantOS Pilot Registration & Fleet Smoke Check');
  const restaurantManifest = {
    projectId: 'restaurant-os-pilot',
    slug: 'restaurant-os-pilot',
    name: 'RestaurantOS Pilot (Bistro & Bar)',
    type: 'restaurant-os',
    version: '1.0.0',
    runtime: { type: 'standalone', entrypoint: 'src/server.ts', defaultPort: 4010, healthEndpoint: '/health' },
    enabledPlugins: ['@orbitox/pos'],
    enabledFeatures: ['dine_qr', 'dag_prep_scheduler', 'companion_join', 'realtime_kds', 'mcp_copilot', 'gst_invoicing', 'razorpay_gateway'],
    planReferences: ['plan_restaurant_growth'],
    environmentMetadata: { defaultEnvironment: 'production', supportedEnvironments: ['development', 'staging', 'production'] },
    platformController: { controlPlaneUrl: BASE, syncIntervalSeconds: 10, requireSignedConfig: false },
    capabilities: ['REALTIME_TELEMETRY_V1', 'REMOTE_COMMANDS_V1'],
  };

  const restaurantClient = new ControlClient({
    manifest: restaurantManifest,
    controlPlaneUrl: BASE,
    apiKey: RUNTIME,
    runtimePort: 4010,
    onCommandReceived: async (cmd) => ({ success: true, result: { executed: cmd.action } }),
  });

  try {
    const rReg = await restaurantClient.registerRuntime();
    check('RestaurantOS registers with OrbitoX control plane', rReg.success === true);
    await restaurantClient.sendHeartbeat();

    // Query fleet for restaurant-os-pilot
    const rFleetRes = await fetch(`${BASE}/api/v1/fleet?q=restaurant-os-pilot`, { headers: bearer(ADMIN) });
    const rFleetBody = await rFleetRes.json();
    const rEntry = rFleetBody.data?.projects?.find((p) => p.id === 'restaurant-os-pilot');
    check('RestaurantOS pilot appears in fleet', !!rEntry);
    check('RestaurantOS pilot shows ONLINE in fleet', rEntry?.connection === 'ONLINE', `got ${rEntry?.connection}`);
  } finally {
    restaurantClient.stop();
  }
} catch (err) {
  check('SDK lifecycle ran without errors', false, err instanceof Error ? err.message : String(err));
} finally {
  client.stop();
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log('Failed:\n  - ' + failures.join('\n  - '));
  process.exit(1);
}
process.exit(0);
