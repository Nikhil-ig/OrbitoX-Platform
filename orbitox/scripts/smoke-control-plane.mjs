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
for (const path of ['/platform', '/platform/fleet', '/platform/connect', '/platform/settings', '/admin', '/api/v1/fleet', '/api/v1/overview', '/api/v1/system/settings', '/api/v1/system/cluster']) {
  await expectStatus(`GET ${path} -> 401`, 401, path);
}
await expectStatus('POST /api/v1/projects/factory -> 401', 401, '/api/v1/projects/factory', { method: 'POST', headers: json, body: '{}' });

console.log('\nAdmin token works (Bearer and Basic)');
await expectStatus('GET /api/v1/fleet with Bearer', 200, '/api/v1/fleet', { headers: bearer(ADMIN) });
await expectStatus('GET /api/v1/fleet with Basic', 200, '/api/v1/fleet', {
  headers: { Authorization: `Basic ${Buffer.from(`admin:${ADMIN}`).toString('base64')}` },
});
await expectStatus('GET /api/v1/overview with Bearer', 200, '/api/v1/overview', { headers: bearer(ADMIN) });
await expectStatus('GET /api/v1/system/settings with Bearer', 200, '/api/v1/system/settings', { headers: bearer(ADMIN) });
await expectStatus('GET /platform with Bearer', 200, '/platform', { headers: bearer(ADMIN) });
await expectStatus('GET /platform/fleet with Bearer', 200, '/platform/fleet', { headers: bearer(ADMIN) });
await expectStatus('GET /platform/connect with Bearer', 200, '/platform/connect', { headers: bearer(ADMIN) });
await expectStatus('GET /platform/settings with Bearer', 200, '/platform/settings', { headers: bearer(ADMIN) });

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

  await expectStatus("shared runtime token rejected on already-registered project's bridge -> 401", 401, `/api/v1/projects/${projectId}/bridge`, { headers: bearer(RUNTIME) });
  await expectStatus("shared runtime token rejected on already-registered project's commands -> 401", 401, `/api/v1/projects/${projectId}/commands`, { headers: bearer(RUNTIME) });
  await expectStatus("shared runtime token rejected on already-registered project's re-registration -> 401", 401, `/api/v1/projects/${projectId}/bridge`, {
    method: 'POST',
    headers: { ...json, ...bearer(RUNTIME) },
    body: JSON.stringify({ action: 'REGISTER', payload: { slug: manifest.slug } }),
  });

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
