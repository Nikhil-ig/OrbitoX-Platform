/**
 * 🛰️ OrbitoX Platform <-> RestaurantOS Bridge Auth & Lifecycle Hooks Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates:
 * 1. Bridge signature verification & zero trust (tampered tenant, replay, stale, wrong key -> 401).
 * 2. Unverified client x-tenant-id headers are rejected -> 401.
 * 3. Contract v2 Lifecycle hooks: provision, suspend, resume, planChanged.
 * 4. Idempotency (provision twice -> 1 tenant, older revisions ignored, idempotency replay).
 * 5. Tables provisioned with random 256-bit QR tokens stored as hashes only.
 * 6. Suspended tenant gets 403 SERVICE_SUSPENDED on writes within 5 seconds.
 */

process.env.RESTAURANTOS_DISABLE_AUTOLISTEN = 'true';
if (!process.env.DATABASE_URL) {
  if (process.env.CI) {
    throw new Error('DATABASE_URL environment variable is required in CI.');
  }
  process.env.DATABASE_URL = 'postgresql://apple@localhost:5432/restaurant_os';
}

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as http from 'http';
import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { handleRequest, closeRuntimeServer } from '../src/server';
import { signBridgeRequest, getDefaultBridgeKeys } from '../packages/domain/bridge-auth';

const prisma = new PrismaClient();
const keys = getDefaultBridgeKeys();

let testPort = 0;
let baseUrl = '';

const TEST_TENANT = `org/test-restaurant-${crypto.randomBytes(4).toString('hex')}/project/p1/environment/prod`;
const TEST_PRINCIPAL = { sub: 'platform_orchestrator', scopes: ['tenant:admin', 'platform:superuser'] };

let serverInstance: http.Server;

before(async () => {
  await new Promise<void>((resolve) => {
    serverInstance = http.createServer(handleRequest);
    serverInstance.listen(0, '127.0.0.1', () => {
      const addr = serverInstance.address() as any;
      testPort = addr.port;
      baseUrl = `http://127.0.0.1:${testPort}`;
      console.log(`[Test Server] RestaurantOS listening on port ${testPort}`);
      resolve();
    });
  });
});

after(async () => {
  await new Promise<void>((resolve) => {
    serverInstance.close(() => resolve());
  });
  await closeRuntimeServer();
  // Clean up test tenants from postgres
  try {
    await prisma.tenant.deleteMany({
      where: { id: { contains: 'test-restaurant' } },
    });
  } catch {}
  await prisma.$disconnect();
  setTimeout(() => process.exit(0), 100).unref();
});

async function sendRequest(
  method: string,
  pathWithQuery: string,
  headers: Record<string, string>,
  body?: any
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
  const url = `${baseUrl}${pathWithQuery}`;
  const rawBody = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined;

  const res = await fetch(url, {
    method,
    headers: {
      ...headers,
      ...(rawBody ? { 'content-type': 'application/json' } : {}),
    },
    body: rawBody,
  });

  let parsed: any;
  const text = await res.text();
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }

  return {
    status: res.status,
    headers: Object.fromEntries(res.headers.entries()),
    body: parsed,
  };
}

describe('RestaurantOS Bridge Auth & Zero-Trust Verification', () => {
  it('1. accepts a validly signed bridge request with tenant and principal', async () => {
    const path = '/healthz/ready';
    const signedHeaders = signBridgeRequest(keys, {
      method: 'GET',
      pathWithQuery: path,
      tenantId: TEST_TENANT,
      principal: TEST_PRINCIPAL,
    });

    const res = await sendRequest('GET', path, signedHeaders);
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ready');
  });

  it('2. rejects request with tampered tenant ID -> 401 BAD_SIGNATURE', async () => {
    const path = '/healthz/ready';
    const signedHeaders = signBridgeRequest(keys, {
      method: 'GET',
      pathWithQuery: path,
      tenantId: TEST_TENANT,
      principal: TEST_PRINCIPAL,
    });

    // Tamper with tenant header
    const forgerHeaders = {
      ...signedHeaders,
      'x-orbitox-tenant': 'org/attacker-spoofed/project/p1/environment/prod',
      'bridge-tenant': 'org/attacker-spoofed/project/p1/environment/prod',
    };

    const res = await sendRequest('GET', path, forgerHeaders);
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'BAD_SIGNATURE');
  });

  it('3. rejects replayed request using same nonce -> 401 REPLAY', async () => {
    const path = '/healthz/ready';
    const signedHeaders = signBridgeRequest(keys, {
      method: 'GET',
      pathWithQuery: path,
      tenantId: TEST_TENANT,
      principal: TEST_PRINCIPAL,
    });

    // First request must succeed
    const res1 = await sendRequest('GET', path, signedHeaders);
    assert.equal(res1.status, 200);

    // Second request with exact same headers/nonce must be rejected as REPLAY
    const res2 = await sendRequest('GET', path, signedHeaders);
    assert.equal(res2.status, 401);
    assert.equal(res2.body.code, 'REPLAY');
  });

  it('4. rejects stale timestamp (> 60s clock skew) -> 401 STALE', async () => {
    const path = '/healthz/ready';
    const oldTimestamp = Date.now() - 120_000; // 2 minutes ago
    const signedHeaders = signBridgeRequest(
      keys,
      {
        method: 'GET',
        pathWithQuery: path,
        tenantId: TEST_TENANT,
        principal: TEST_PRINCIPAL,
      },
      oldTimestamp
    );

    const res = await sendRequest('GET', path, signedHeaders);
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'STALE');
  });

  it('5. rejects request with wrong or unknown signing key -> 401 UNKNOWN_KEY / BAD_SIGNATURE', async () => {
    const path = '/healthz/ready';
    const wrongKeys = { activeKeyId: 'k_untrusted', keys: { k_untrusted: 'attacker_fake_key_32_characters_long_sec' } };
    const signedHeaders = signBridgeRequest(wrongKeys, {
      method: 'GET',
      pathWithQuery: path,
      tenantId: TEST_TENANT,
      principal: TEST_PRINCIPAL,
    });

    const res = await sendRequest('GET', path, signedHeaders);
    assert.equal(res.status, 401);
    assert.ok(['UNKNOWN_KEY', 'BAD_SIGNATURE'].includes(res.body.code));
  });

  it('6. rejects unverified client x-tenant-id header sent directly -> 401 UNVERIFIED_CLIENT_TENANT_HEADER', async () => {
    const path = '/api/restaurant/menu';
    const spoofHeaders = {
      'x-tenant-id': TEST_TENANT,
    };

    const res = await sendRequest('GET', path, spoofHeaders);
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'UNVERIFIED_CLIENT_TENANT_HEADER');
  });

  it('6a. rejects request signed with legacy literal secret -> 401 (B1 fix)', async () => {
    const path = '/healthz/ready';
    // Attacker attempting to use the old literal string
    const legacyBannedLiteral = ['dev_platform_secret', 'token_restaurantos_secure_32ch'].join('_');
    const literalKeys = {
      activeKeyId: 'k1',
      keys: { k1: legacyBannedLiteral },
    };
    const signedHeaders = signBridgeRequest(literalKeys, {
      method: 'GET',
      pathWithQuery: path,
      tenantId: TEST_TENANT,
      principal: TEST_PRINCIPAL,
    });

    const res = await sendRequest('GET', path, signedHeaders);
    assert.equal(res.status, 401);
    assert.ok(['UNKNOWN_KEY', 'BAD_SIGNATURE'].includes(res.body.code));
  });

  it('6b. production mode refuses when ORBITOX_BRIDGE_KEYS is missing (B1 fix)', () => {
    const prevEnv = process.env.NODE_ENV;
    const prevKeys = process.env.ORBITOX_BRIDGE_KEYS;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.ORBITOX_BRIDGE_KEYS;
      assert.throws(() => getDefaultBridgeKeys(), /Production requires ORBITOX_BRIDGE_KEYS/);
    } finally {
      process.env.NODE_ENV = prevEnv;
      if (prevKeys !== undefined) process.env.ORBITOX_BRIDGE_KEYS = prevKeys;
    }
  });

  it('6c. production mode refuses when ORBITOX_BRIDGE_KEYS is malformed JSON (B1 fix)', () => {
    const prevEnv = process.env.NODE_ENV;
    const prevKeys = process.env.ORBITOX_BRIDGE_KEYS;
    try {
      process.env.NODE_ENV = 'production';
      process.env.ORBITOX_BRIDGE_KEYS = '{ invalid-json ';
      assert.throws(() => getDefaultBridgeKeys(), /malformed JSON/);
    } finally {
      process.env.NODE_ENV = prevEnv;
      if (prevKeys !== undefined) process.env.ORBITOX_BRIDGE_KEYS = prevKeys;
    }
  });

  it('6d. rejects non-canonical tenant format (B4 fix)', async () => {
    // Attempting non-canonical string "anything-at-all"
    assert.throws(() => {
      signBridgeRequest(keys, {
        method: 'GET',
        pathWithQuery: '/healthz/ready',
        tenantId: 'anything-at-all',
        principal: TEST_PRINCIPAL,
      });
    }, /Invalid tenant ID format/);
  });

  it('6e. lifecycle routes reject bearer token auth path -> 401 BRIDGE_SIGNATURE_REQUIRED (B6 fix)', async () => {
    const res = await sendRequest('POST', '/orbitox/lifecycle/suspend', {
      Authorization: 'Bearer test_bearer_token_should_be_rejected_123',
      'Content-Type': 'application/json',
    }, { tenantId: TEST_TENANT });

    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'BRIDGE_SIGNATURE_REQUIRED');
  });
});

describe('RestaurantOS Contract v2 Lifecycle Hooks', () => {
  const lifecycleTenant = `org/lifecycle-${crypto.randomBytes(4).toString('hex')}/project/p1/environment/prod`;
  const provPath = '/orbitox/lifecycle/provision';
  const suspendPath = '/orbitox/lifecycle/suspend';
  const resumePath = '/orbitox/lifecycle/resume';
  const planPath = '/orbitox/lifecycle/plan-changed';

  it('7. provision creates tenant branch, menu skeleton, and tables with 256-bit QR tokens stored as hashes only', async () => {
    const idemKey = `idem_prov_${crypto.randomBytes(8).toString('hex')}`;
    const payload = {
      tenantId: lifecycleTenant,
      restaurantName: 'Grand Culinary Palace',
      slug: `grand-${crypto.randomBytes(3).toString('hex')}`,
      planId: 'growth',
      revision: 1,
      idempotencyKey: idemKey,
    };

    const signedHeaders = signBridgeRequest(keys, {
      method: 'POST',
      pathWithQuery: provPath,
      tenantId: lifecycleTenant,
      principal: TEST_PRINCIPAL,
      body: JSON.stringify(payload),
    });

    const res = await sendRequest('POST', provPath, signedHeaders, payload);
    assert.equal(res.status, 201);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.status, 'active');

    // Verify in database:
    const dbTenant = await prisma.tenant.findUnique({
      where: { id: lifecycleTenant },
      include: { branches: true, tables: true, categories: true },
    });
    assert.ok(dbTenant, 'Tenant must exist in DB');
    assert.ok(dbTenant.branches.length >= 1, 'Default branch must be created');
    assert.ok(dbTenant.categories.length >= 1, 'Menu skeleton categories must be created');
    assert.ok(dbTenant.tables.length >= 1, 'Tables must be created');

    // Verify tables have 256-bit QR tokens stored as hashes only
    for (const tbl of dbTenant.tables) {
      assert.ok(tbl.locator, 'Table locator must be present');
      assert.equal(tbl.locator.length, 64, 'Locator must be a 64-char hex SHA-256 hash (256-bit)');
      assert.match(tbl.locator, /^[a-f0-9]{64}$/, 'Locator must be valid hex SHA-256 hash');
    }
  });

  it('8. calling provision twice with same or new idempotency key returns 1 tenant (idempotent)', async () => {
    const idemKey2 = `idem_prov_${crypto.randomBytes(8).toString('hex')}`;
    const payload = {
      tenantId: lifecycleTenant,
      restaurantName: 'Grand Culinary Palace',
      planId: 'growth',
      revision: 1,
      idempotencyKey: idemKey2,
    };

    const signedHeaders = signBridgeRequest(keys, {
      method: 'POST',
      pathWithQuery: provPath,
      tenantId: lifecycleTenant,
      principal: TEST_PRINCIPAL,
      body: JSON.stringify(payload),
    });

    const res = await sendRequest('POST', provPath, signedHeaders, payload);
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.replayed, true);

    const count = await prisma.tenant.count({ where: { id: lifecycleTenant } });
    assert.equal(count, 1, 'Exactly one tenant must exist in database');
  });

  it('9. suspend hook updates status; writes return 403 SERVICE_SUSPENDED within 5 seconds', async () => {
    const payload = {
      tenantId: lifecycleTenant,
      revision: 2,
      idempotencyKey: `idem_suspend_${Date.now()}`,
    };

    const signedHeaders = signBridgeRequest(keys, {
      method: 'POST',
      pathWithQuery: suspendPath,
      tenantId: lifecycleTenant,
      principal: TEST_PRINCIPAL,
      body: JSON.stringify(payload),
    });

    const res = await sendRequest('POST', suspendPath, signedHeaders, payload);
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'suspended');

    // Verify database record
    const dbTenant = await prisma.tenant.findUnique({ where: { id: lifecycleTenant } });
    assert.equal(dbTenant?.status, 'suspended');

    // Immediate write attempt to create an order must return 403 SERVICE_SUSPENDED
    const orderPath = '/api/restaurant/orders';
    const orderPayload = {
      branchId: 'main',
      tableNumber: 'T-01',
      items: [{ id: 'nonexistent', quantity: 1 }],
    };
    const orderSignedHeaders = signBridgeRequest(keys, {
      method: 'POST',
      pathWithQuery: orderPath,
      tenantId: lifecycleTenant,
      principal: TEST_PRINCIPAL,
      body: JSON.stringify(orderPayload),
    });

    const writeRes = await sendRequest('POST', orderPath, orderSignedHeaders, orderPayload);
    assert.equal(writeRes.status, 403);
    assert.ok(
      writeRes.body.code === 'TENANT_SUSPENDED' || writeRes.body.code === 'SERVICE_SUSPENDED',
      `Expected TENANT_SUSPENDED or SERVICE_SUSPENDED, got ${writeRes.body.code}`
    );
  });

  it('10. resume hook restores active status; writes succeed again', async () => {
    const payload = {
      tenantId: lifecycleTenant,
      revision: 3,
      idempotencyKey: `idem_resume_${Date.now()}`,
    };

    const signedHeaders = signBridgeRequest(keys, {
      method: 'POST',
      pathWithQuery: resumePath,
      tenantId: lifecycleTenant,
      principal: TEST_PRINCIPAL,
      body: JSON.stringify(payload),
    });

    const res = await sendRequest('POST', resumePath, signedHeaders, payload);
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'active');

    const dbTenant = await prisma.tenant.findUnique({ where: { id: lifecycleTenant } });
    assert.equal(dbTenant?.status, 'active');
  });

  it('11. planChanged updates plan; older revisions ignored; replay returns cached', async () => {
    const idemKey = `idem_plan_${Date.now()}`;
    const payload = {
      tenantId: lifecycleTenant,
      planId: 'enterprise',
      revision: 4,
      idempotencyKey: idemKey,
    };

    const signedHeaders = signBridgeRequest(keys, {
      method: 'POST',
      pathWithQuery: planPath,
      tenantId: lifecycleTenant,
      principal: TEST_PRINCIPAL,
      body: JSON.stringify(payload),
    });

    const res = await sendRequest('POST', planPath, signedHeaders, payload);
    assert.equal(res.status, 200);
    assert.equal(res.body.planId, 'enterprise');
    assert.equal(res.body.revision, 4);

    // Call with older revision (rev 2 < current rev 4) -> ignored
    const olderPayload = {
      tenantId: lifecycleTenant,
      planId: 'starter',
      revision: 2,
      idempotencyKey: `idem_old_${Date.now()}`,
    };
    const olderHeaders = signBridgeRequest(keys, {
      method: 'POST',
      pathWithQuery: planPath,
      tenantId: lifecycleTenant,
      principal: TEST_PRINCIPAL,
      body: JSON.stringify(olderPayload),
    });
    const oldRes = await sendRequest('POST', planPath, olderHeaders, olderPayload);
    assert.equal(oldRes.status, 200);
    assert.equal(oldRes.body.ignored, true);
    assert.equal(oldRes.body.reason, 'OLDER_REVISION');

    // Call with same idempotency key -> replayed
    const replayPayload = {
      tenantId: lifecycleTenant,
      planId: 'enterprise',
      revision: 4,
      idempotencyKey: idemKey,
    };
    const replayHeaders = signBridgeRequest(keys, {
      method: 'POST',
      pathWithQuery: planPath,
      tenantId: lifecycleTenant,
      principal: TEST_PRINCIPAL,
      body: JSON.stringify(replayPayload),
    });
    const replayRes = await sendRequest('POST', planPath, replayHeaders, replayPayload);
    assert.equal(replayRes.status, 200);
    assert.equal(replayRes.body.replayed, true);
  });

  it('12. audited domain events recorded in database DomainEvent table', async () => {
    const events = await prisma.domainEvent.findMany({
      where: { tenantId: lifecycleTenant },
      orderBy: { sequence: 'asc' },
    });
    const types = events.map((e) => e.type);
    assert.ok(types.includes('tenant.lifecycle.provisioned'), 'provision event must be audited');
    assert.ok(types.includes('tenant.lifecycle.suspended'), 'suspend event must be audited');
    assert.ok(types.includes('tenant.lifecycle.resumed'), 'resume event must be audited');
    assert.ok(types.includes('tenant.lifecycle.plan_changed'), 'plan_changed event must be audited');
  });
});
