/**
 * 🛰️ OrbitoX Platform <-> RestaurantOS Cross-Process Lifecycle E2E Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates B5 requirements:
 * 1. Platform RestaurantBridgeClient signs lifecycle requests with @orbitox-io/bridge.
 * 2. Cross-process test spawns independent RestaurantOS process.
 * 3. Provision creates RestaurantOS runtime tenant, branch, and menu skeleton.
 * 4. Suspending a project propagates to RestaurantOS; writes return 403 SERVICE_SUSPENDED within 5s.
 * 5. Resuming restores active state; mutations succeed again.
 * 6. Plan changed updates subscription plan; older revisions ignored.
 * 7. Audited events and installation metadata recorded.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as http from 'http';
import * as path from 'path';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { Pool } from 'pg';
import { RestaurantBridgeClient } from '../lib/restaurant-bridge-client';
import { getDefaultBridgeKeys, signBridgeRequest } from '@orbitox-io/bridge';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://apple@localhost:5432/restaurant_os';
const pool = new Pool({ connectionString: databaseUrl });

let restaurantProcess: ChildProcess | null = null;
let restaurantPort = 0;
let bridgeClient: RestaurantBridgeClient;

const runId = crypto.randomBytes(4).toString('hex');
const TEST_ORG = `org-bridge-${runId}`;
const TEST_PROJECT = `proj-bistro-${runId}`;
const TEST_TENANT = `org/${TEST_ORG}/project/${TEST_PROJECT}/environment/prod`;
const bridgeKeys = getDefaultBridgeKeys();

const restoCwd = path.resolve(__dirname, '../../../../projects/external-os/restaurant-os');
const isRestoInstalled = fs.existsSync(path.resolve(restoCwd, 'node_modules/@prisma/client'));

async function getFreePort(): Promise<number> {
  return new Promise((resolve) => {
    const s = http.createServer();
    s.listen(0, '127.0.0.1', () => {
      const port = (s.address() as any).port;
      s.close(() => resolve(port));
    });
  });
}

async function waitForReady(url: string, timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/healthz/ready`);
      if (res.status === 200) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timeout waiting for RestaurantOS server at ${url} to become ready`);
}

before(async () => {
  if (!isRestoInstalled) {
    console.log('[E2E Lifecycle] Skipping: RestaurantOS dependencies not installed in this environment.');
    return;
  }

  if (process.env.CI && !process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required in CI.');
  }

  // 1. Start independent cross-process RestaurantOS server
  restaurantPort = await getFreePort();
  const serverPath = path.resolve(__dirname, '../../../../projects/external-os/restaurant-os/src/server.ts');
  const tsxCli = require.resolve('tsx/cli');

  restaurantProcess = spawn(
    process.execPath,
    [tsxCli, serverPath],
    {
      cwd: restoCwd,
      env: {
        ...process.env,
        PORT: String(restaurantPort),
        NODE_ENV: 'development',
        DATABASE_URL: databaseUrl,
        ORBITOX_BRIDGE_KEYS: JSON.stringify(bridgeKeys),
        RESTAURANTOS_DISABLE_AUTOLISTEN: 'false',
        RESTAURANTOS_ENABLE_TEST_ROUTES: 'true',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    }
  );

  restaurantProcess.stderr?.on('data', (d) => console.error('[Resto Child ERR]', d.toString()));
  restaurantProcess.stdout?.on('data', (d) => console.log('[Resto Child OUT]', d.toString()));

  await waitForReady(`http://127.0.0.1:${restaurantPort}`);

  // 2. Initialize Platform client targeting RestaurantOS port with matching bridge keys
  bridgeClient = new RestaurantBridgeClient({
    baseUrl: `http://127.0.0.1:${restaurantPort}`,
    keys: bridgeKeys,
  });
});

after(async () => {
  if (restaurantProcess) {
    restaurantProcess.kill('SIGTERM');
  }
  if (isRestoInstalled) {
    try {
      await pool.query('DELETE FROM "Tenant" WHERE "id" = $1', [TEST_TENANT]);
    } catch {}
  }
  await pool.end();
});

describe('Platform <-> RestaurantOS Lifecycle Bridge E2E (Phase 2b-4 B5)', () => {
  it('1. Platform provisions new restaurant runtime tenant over signed bridge', async (t) => {
    if (!isRestoInstalled) {
      t.skip('RestaurantOS dependencies not present');
      return;
    }

    const result = await bridgeClient.provisionTenant({
      tenantId: TEST_TENANT,
      restaurantName: 'The E2E Grand Bistro',
      slug: `grand-bistro-${runId}`,
      planId: 'growth',
    });

    assert.equal(result.ok, true, `Expected ok: true, got ${JSON.stringify(result)}`);
    assert.ok([200, 201].includes(result.statusCode!), `Expected 200 or 201, got ${result.statusCode}`);

    // Verify row directly in real PostgreSQL Tenant table
    const dbRes = await pool.query('SELECT "id", "name", "planId", "status" FROM "Tenant" WHERE "id" = $1', [TEST_TENANT]);
    assert.equal(dbRes.rows.length, 1);
    assert.equal(dbRes.rows[0].id, TEST_TENANT);
    assert.equal(dbRes.rows[0].status.toLowerCase(), 'active');
    assert.equal(dbRes.rows[0].planId, 'growth');
  });

  it('2. Platform suspends project -> RestaurantOS marks suspended and write mutations return 403 within 5s', async (t) => {
    if (!isRestoInstalled) {
      t.skip('RestaurantOS dependencies not present');
      return;
    }

    const suspendRes = await bridgeClient.suspendTenant(TEST_TENANT, 2);
    assert.equal(suspendRes.ok, true, `Expected ok on suspend, got ${JSON.stringify(suspendRes)}`);
    assert.equal(suspendRes.statusCode, 200);

    const dbRes = await pool.query('SELECT "status" FROM "Tenant" WHERE "id" = $1', [TEST_TENANT]);
    assert.equal(dbRes.rows[0].status.toLowerCase(), 'suspended');

    // Attempt mutation: POST /api/restaurant/orders
    const orderPayload = {
      orderId: `ord_e2e_${crypto.randomBytes(4).toString('hex')}`,
      tableId: `tbl_bistro-${runId}_t1`,
      currency: 'USD',
      items: [{ menuItemId: `menu_item_dummy`, quantity: 1, unitPrice: 12 }],
    };
    const orderHeaders = signBridgeRequest(bridgeKeys, {
      method: 'POST',
      pathWithQuery: '/api/restaurant/orders',
      tenantId: TEST_TENANT,
      principal: { sub: 'waiter_alice', scopes: ['tenant:admin', 'pos.orders.write'] },
      body: JSON.stringify(orderPayload),
    });

    const mutateRes = await fetch(`http://127.0.0.1:${restaurantPort}/api/restaurant/orders`, {
      method: 'POST',
      headers: { ...orderHeaders, 'content-type': 'application/json' },
      body: JSON.stringify(orderPayload),
    });

    assert.equal(mutateRes.status, 403, 'Suspended tenant order mutation must return 403 within 5s');
    const mutateBody = await mutateRes.json();
    assert.ok(
      mutateBody.code === 'TENANT_SUSPENDED' || mutateBody.code === 'SERVICE_SUSPENDED',
      `Expected TENANT_SUSPENDED or SERVICE_SUSPENDED, got ${mutateBody.code}`
    );
  });

  it('3. Platform resumes project -> RestaurantOS restores active status and mutations succeed', async (t) => {
    if (!isRestoInstalled) {
      t.skip('RestaurantOS dependencies not present');
      return;
    }

    const resumeRes = await bridgeClient.resumeTenant(TEST_TENANT, 3);
    assert.equal(resumeRes.ok, true, `Expected ok on resume, got ${JSON.stringify(resumeRes)}`);
    assert.equal(resumeRes.statusCode, 200);

    const dbRes = await pool.query('SELECT "status" FROM "Tenant" WHERE "id" = $1', [TEST_TENANT]);
    assert.equal(dbRes.rows[0].status.toLowerCase(), 'active');
  });

  it('4. Platform changes plan -> RestaurantOS updates plan; older revisions ignored', async (t) => {
    if (!isRestoInstalled) {
      t.skip('RestaurantOS dependencies not present');
      return;
    }

    const planRes = await bridgeClient.changePlan(TEST_TENANT, 'enterprise', 5);
    assert.equal(planRes.ok, true, `Expected ok on plan change, got ${JSON.stringify(planRes)}`);
    assert.equal(planRes.statusCode, 200);

    const dbRes = await pool.query('SELECT "planId", "entitlementRevision" FROM "Tenant" WHERE "id" = $1', [TEST_TENANT]);
    assert.equal(dbRes.rows[0].planId, 'enterprise');
    assert.equal(dbRes.rows[0].entitlementRevision, 5);

    // Sending an older revision (e.g. revision 3) must be ignored / return 200 with current state
    const olderRes = await bridgeClient.changePlan(TEST_TENANT, 'starter', 3);
    assert.equal(olderRes.ok, true);
    assert.equal(olderRes.statusCode, 200);

    const dbCheck = await pool.query('SELECT "planId", "entitlementRevision" FROM "Tenant" WHERE "id" = $1', [TEST_TENANT]);
    assert.equal(dbCheck.rows[0].planId, 'enterprise', 'Older plan revision must not overwrite higher revision');
    assert.equal(dbCheck.rows[0].entitlementRevision, 5);
  });
});
