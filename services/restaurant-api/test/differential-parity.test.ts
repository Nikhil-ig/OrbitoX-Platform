process.env.NODE_ENV = 'test';
process.env.STORAGE_DRIVER = 'json';
process.env.DISABLE_RATE_LIMITER = 'true';
(globalThis as Record<string, unknown>).__DISABLE_RATE_LIMITER = true;
process.env.RESTAURANTOS_DISABLE_AUTOLISTEN = 'true';

// Externalize rate-limiter bypass by monkey-patching Map prototype for RateLimitBucket
const origMapGet = Map.prototype.get;
Map.prototype.get = function (this: Map<any, any>, key: any) {
  const val = origMapGet.call(this, key);
  if (
    Boolean((globalThis as any).__DISABLE_RATE_LIMITER) &&
    val &&
    typeof val === 'object' &&
    'tokens' in val &&
    'lastRefill' in val
  ) {
    (val as any).tokens = 999999;
    (val as any).lastRefill = Date.now();
  }
  return val;
};

const origMapSet = Map.prototype.set;
Map.prototype.set = function (this: Map<any, any>, key: any, val: any) {
  if (
    Boolean((globalThis as any).__DISABLE_RATE_LIMITER) &&
    val &&
    typeof val === 'object' &&
    'tokens' in val &&
    'lastRefill' in val
  ) {
    (val as any).tokens = 999999;
  }
  return origMapSet.call(this, key, val);
};
process.env.RESTAURANTOS_ENABLE_TEST_ROUTES = 'true';
process.env.STAFF_AUTH_SECRET = 'test_master_secret_key_at_least_32_characters_long_123456';
process.env.RESTAURANTOS_PLATFORM_TOKEN = 'test_platform_token_secret_key_1234567890123456';
process.env.RESTAURANTOS_BASE_DOMAIN = 'restaurantos.local';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import fs from 'fs';
import path from 'path';

const DYNAMIC_KEYS = new Set([
  'id',
  'token',
  'timestamp',
  'createdAt',
  'updatedAt',
  'signature',
  'nonce',
  'requestId',
  'resetSeconds',
  'remaining',
  'expiresAt',
  'time',
  'date',
]);

function extractShape(val: unknown): unknown {
  if (val === null || val === undefined) return typeof val;
  if (Array.isArray(val)) {
    return [val.length > 0 ? extractShape(val[0]) : 'empty-array'];
  }
  if (typeof val === 'object') {
    const shape: Record<string, unknown> = {};
    for (const k of Object.keys(val as Record<string, unknown>).sort()) {
      if (DYNAMIC_KEYS.has(k)) {
        shape[k] = typeof (val as Record<string, unknown>)[k];
      } else {
        shape[k] = extractShape((val as Record<string, unknown>)[k]);
      }
    }
    return shape;
  }
  return typeof val;
}

describe('RestaurantOS Differential Parity Matrix (d7f9de5 Baseline vs Modular Server)', { timeout: 300000 }, () => {
  let routes: any[];
  let serverBaseline: http.Server;
  let serverModular: http.Server;
  let portBaseline: number;
  let portModular: number;
  let shared: any;
  let bridgeMod: any;
  let tokenRevoked: string;
  let tokenStaffA: string;
  let tokenManagerA: string;
  let tokenStaffB: string;
  let tokenAdmin: string;

  const tenantSlug = 'diff-test-bistro';
  const tenantId = `tenant_${tenantSlug}`;
  const host = `${tenantSlug}.restaurantos.local`;
  const branchAlpha = 'branch_alpha';
  const branchBeta = 'branch_beta';

  const identities = [
    'ANONYMOUS',
    'DINER',
    'REVOKED_TOKEN',
    'INVALID_TOKEN',
    'STATION',
    'STAFF_A',
    'MANAGER_A',
    'STAFF_B',
    'TENANT_ADMIN',
    'PLATFORM_BRIDGE',
  ];

  before(async () => {
    const fixturePath = path.resolve(__dirname, 'fixtures/restaurant-routes-d7f9de5.json');
    routes = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    const baseMod = await import('./fixtures/baseline-server');
    const modMod = await import('../src/http/server');
    shared = await import('../src/shared/index');
    const storage = await import('../src/storage/index');
    bridgeMod = await import('../src/shared/bridge-auth');

    const tenantSecret = shared.deriveTenantSigningSecret(tenantId);
    const tenantCtx = { tenantId, tenantSlug, tenantName: 'Diff Bistro', status: 'active' };
    const repo = storage.getTenantRepository(tenantCtx);

    await repo.saveBranch({ id: branchAlpha, name: 'Alpha', slug: 'alpha', status: 'ACTIVE' } as any);
    await repo.saveBranch({ id: branchBeta, name: 'Beta', slug: 'beta', status: 'ACTIVE' } as any);

    tokenStaffA = shared.issueStaffToken({ sub: 'stf_a', role: 'SERVER', tenantId, branchId: branchAlpha }, tenantSecret);
    tokenManagerA = shared.issueStaffToken({ sub: 'mgr_a', role: 'MANAGER', tenantId, branchId: branchAlpha }, tenantSecret);
    tokenStaffB = shared.issueStaffToken({ sub: 'stf_b', role: 'SERVER', tenantId, branchId: branchBeta }, tenantSecret);
    tokenAdmin = shared.issueStaffToken({ sub: 'adm_a', role: 'ADMIN', tenantId, branchId: branchAlpha }, tenantSecret);
    tokenRevoked = shared.issueStaffToken({ sub: 'rev_a', role: 'SERVER', tenantId, branchId: branchAlpha }, tenantSecret);
    await shared.revokeStaffToken(tenantId, tokenRevoked, 'Security test revocation');

    serverBaseline = http.createServer(baseMod.handleRequest);
    await new Promise<void>((r) => serverBaseline.listen(0, '127.0.0.1', () => {
      portBaseline = (serverBaseline.address() as any).port;
      r();
    }));

    serverModular = http.createServer(modMod.handleRequest);
    await new Promise<void>((r) => serverModular.listen(0, '127.0.0.1', () => {
      portModular = (serverModular.address() as any).port;
      r();
    }));
  });

  after(async () => {
    serverBaseline?.close();
    serverModular?.close();
    const contextMod = await import('../src/http/context');
    contextMod.eventLoopMonitor?.stop?.();
    if (contextMod.pgEventListener) {
      await contextMod.pgEventListener.stop?.();
    }
  });

  function buildHeadersForIdentity(identity: string, method: string, reqPath: string): Record<string, string> {
    const h: Record<string, string> = { Host: host };
    switch (identity) {
      case 'ANONYMOUS':
        break;
      case 'DINER':
        h['Authorization'] = 'Bearer cap_diner_token_123';
        break;
      case 'REVOKED_TOKEN':
        h['Authorization'] = `Bearer ${tokenRevoked}`;
        break;
      case 'INVALID_TOKEN':
        h['Authorization'] = 'Bearer invalid.token.value';
        break;
      case 'STATION':
        h['x-station-token'] = 'dev_station_grill_token_test';
        break;
      case 'STAFF_A':
        h['Authorization'] = `Bearer ${tokenStaffA}`;
        break;
      case 'MANAGER_A':
        h['Authorization'] = `Bearer ${tokenManagerA}`;
        break;
      case 'STAFF_B':
        h['Authorization'] = `Bearer ${tokenStaffB}`;
        break;
      case 'TENANT_ADMIN':
        h['Authorization'] = `Bearer ${tokenAdmin}`;
        break;
      case 'PLATFORM_BRIDGE': {
        const bridgeKeys = bridgeMod.getDefaultBridgeKeys();
        const signed = bridgeMod.signBridgeRequest(bridgeKeys, {
          method,
          pathWithQuery: reqPath,
          tenantId: 'org/default/project/restaurant-os-diff/environment/prod',
          principal: { sub: 'platform', scopes: ['platform:fleet', 'bridge:call'] },
        });
        Object.assign(h, signed);
        break;
      }
    }
    return h;
  }

  function doRequest(port: number, method: string, reqPath: string, headers: Record<string, string>, body?: any): Promise<{ status: number; body: any }> {
    return new Promise((resolve, reject) => {
      let payloadBuffer: Buffer | null = null;
      const reqHeaders = { ...headers };
      if (body !== undefined) {
        reqHeaders['Content-Type'] = 'application/json';
        payloadBuffer = Buffer.from(JSON.stringify(body), 'utf8');
        reqHeaders['Content-Length'] = String(payloadBuffer.length);
      }
      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path: reqPath,
        method,
        headers: reqHeaders,
      }, (res) => {
        if (res.headers['content-type']?.includes('text/event-stream') || reqPath.includes('/events')) {
          req.destroy();
          resolve({ status: res.statusCode || 0, body: 'sse-stream' });
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let parsed: any;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode || 0, body: parsed });
        });
      });
      req.setTimeout(2500, () => {
        req.destroy();
        resolve({ status: 504, body: 'timeout' });
      });
      req.on('error', (err) => {
        if (req.destroyed) return;
        reject(err);
      });
      if (payloadBuffer) req.write(payloadBuffer);
      req.end();
    });
  }

  it('executes all 194 registered routes across 10 caller identities (1,940 cells) with 0 differences', { timeout: 300000 }, async () => {
    let totalTested = 0;
    const diffLog: any[] = [];

    for (const r of routes) {
      let resolvedPath = r.path
        .replace(':id', 'test_item_101')
        .replace(':tableNumber', 'T-01');

      if (resolvedPath === '/developer/*') {
        resolvedPath = '/developer/inspector';
      } else if (resolvedPath === '/crave-atlas*') {
        resolvedPath = '/crave-atlas';
      } else if (resolvedPath === '/swift-bite*') {
        resolvedPath = '/swift-bite';
      } else if (resolvedPath === '/pantry-rush*') {
        resolvedPath = '/pantry-rush';
      } else if (resolvedPath === '/locations*') {
        resolvedPath = '/locations';
      } else if (resolvedPath === '/dine/*') {
        resolvedPath = '/dine/7Kp9xQ8m2L';
      } else {
        resolvedPath = resolvedPath.replace('*', 'test_file.txt');
      }

      const results = await Promise.all(
        identities.map(async (id) => {
          const headers = buildHeadersForIdentity(id, r.method, resolvedPath);
          const testBody = ['POST', 'PATCH', 'PUT'].includes(r.method) ? { test: true } : undefined;

          const [resBase, resMod] = await Promise.all([
            doRequest(portBaseline, r.method, resolvedPath, headers, testBody).catch((err: any) => ({ status: 500, body: { error: err.message } })),
            doRequest(portModular, r.method, resolvedPath, headers, testBody).catch((err: any) => ({ status: 500, body: { error: err.message } })),
          ]);

          let isDiff = false;
          let reason = '';

          if (resBase.status !== resMod.status) {
            isDiff = true;
            reason = `Status mismatch: baseline=${resBase.status}, modular=${resMod.status}`;
          } else if (typeof resBase.body === 'object' && typeof resMod.body === 'object' && resBase.body !== null && resMod.body !== null) {
            if (resBase.body.code !== resMod.body.code) {
              isDiff = true;
              reason = `Error code mismatch: baseline=${resBase.body.code}, modular=${resMod.body.code}`;
            } else {
              const shapeBase = JSON.stringify(extractShape(resBase.body));
              const shapeMod = JSON.stringify(extractShape(resMod.body));
              if (shapeBase !== shapeMod) {
                isDiff = true;
                reason = `Response shape mismatch: baseline=${shapeBase}, modular=${shapeMod}`;
              }
            }
          }

          return {
            id,
            isDiff,
            diff: isDiff ? {
              route: `${r.method} ${r.path} -> ${resolvedPath}`,
              identity: id,
              reason,
              baseStatus: resBase.status,
              modStatus: resMod.status,
              baseBody: resBase.body,
              modBody: resMod.body,
            } : null,
          };
        })
      );

      for (const res of results) {
        totalTested++;
        if (res.isDiff && res.diff) {
          diffLog.push(res.diff);
          console.error(`[DIFF] ${res.diff.route} [${res.diff.identity}]: ${res.diff.reason}`);
        }
      }
    }

    assert.equal(
      diffLog.length,
      0,
      `Differential parity failed with ${diffLog.length} differences across ${totalTested} cells:\n${JSON.stringify(diffLog.slice(0, 15), null, 2)}`
    );
    assert.equal(totalTested, routes.length * 10, `Expected exactly ${routes.length * 10} test cells executed`);
  });
});
