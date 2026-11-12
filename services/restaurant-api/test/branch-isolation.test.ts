process.env.NODE_ENV = 'test';
process.env.STORAGE_DRIVER = 'json';
(globalThis as Record<string, unknown>).__DISABLE_RATE_LIMITER = true;
process.env.STAFF_AUTH_SECRET = 'test_master_secret_key_at_least_32_characters_long_123456';
process.env.RESTAURANTOS_PLATFORM_TOKEN = 'test_platform_token_secret_key_1234567890123456';
process.env.RESTAURANTOS_BASE_DOMAIN = 'restaurantos.local';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

describe('RestaurantOS Permanent Cross-Branch Authorization & Isolation (B-6)', () => {
  let server: http.Server;
  let serverPort: number;
  let handleRequest: any;
  let issueStaffToken: any;
  let deriveTenantSigningSecret: any;
  let getTenantRepository: any;

  const tenantSlug = 'branch-isolation-test';
  const tenantId = `tenant_${tenantSlug}`;
  const host = `${tenantSlug}.restaurantos.local`;
  const branchAlpha = 'branch_alpha';
  const branchBeta = 'branch_beta';

  let tokenStaffAlpha: string;
  let tokenManagerAlpha: string;
  let tokenStaffBeta: string;
  let tokenManagerBeta: string;

  let tableBetaId = 202;
  let tableBetaNum = 'B-202';
  let orderBetaId = 'ord_beta_999';
  let staffBetaId = 'stf_beta_101';
  let serviceReqBetaId = 'sreq_beta_301';

  before(async () => {
    // Dynamically load runtime after setting test environment variables
    const serverMod = await import('../src/http/server');
    handleRequest = serverMod.handleRequest;
    const sharedMod = await import('../src/shared');
    issueStaffToken = sharedMod.issueStaffToken;
    deriveTenantSigningSecret = sharedMod.deriveTenantSigningSecret;
    const storageMod = await import('../src/storage');
    getTenantRepository = storageMod.getTenantRepository;

    // 1. Start ephemeral HTTP server
    await new Promise<void>((resolve) => {
      server = http.createServer(handleRequest);
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        serverPort = addr.port;
        resolve();
      });
    });

    // 2. Issue scoped tokens for branch_alpha and branch_beta
    const tenantSecret = deriveTenantSigningSecret(tenantId);
    tokenStaffAlpha = issueStaffToken({
      sub: 'stf_staff_alpha',
      role: 'SERVER',
      tenantId,
      branchId: branchAlpha,
    }, tenantSecret);

    tokenManagerAlpha = issueStaffToken({
      sub: 'stf_mgr_alpha',
      role: 'MANAGER',
      tenantId,
      branchId: branchAlpha,
    }, tenantSecret);

    tokenStaffBeta = issueStaffToken({
      sub: staffBetaId,
      role: 'SERVER',
      tenantId,
      branchId: branchBeta,
    }, tenantSecret);

    tokenManagerBeta = issueStaffToken({
      sub: 'stf_mgr_beta',
      role: 'MANAGER',
      tenantId,
      branchId: branchBeta,
    }, tenantSecret);

    // 3. Populate test resources in memory store
    const dummyTenantContext = {
      tenantId,
      tenantSlug,
      tenantName: 'Branch Isolation Bistro',
      status: 'active',
    };
    const repo = getTenantRepository(dummyTenantContext);

    // Ensure branches exist
    await repo.saveBranch({
      id: branchAlpha,
      name: 'Alpha Branch',
      slug: 'alpha',
      status: 'ACTIVE',
    } as any);
    await repo.saveBranch({
      id: branchBeta,
      name: 'Beta Branch',
      slug: 'beta',
      status: 'ACTIVE',
    } as any);

    await repo.saveFloorTables([
      {
        id: 101,
        number: 'A-101',
        branchId: branchAlpha,
        floorId: 'floor_ground',
        capacity: 4,
        status: 'VACANT',
        seats: [],
      },
      {
        id: tableBetaId,
        number: tableBetaNum,
        branchId: branchBeta,
        floorId: 'floor_ground',
        capacity: 4,
        status: 'OCCUPIED',
        seats: [],
      },
    ]);

    // Ensure staff member in branch_beta
    await repo.saveStaffMember({
      id: staffBetaId,
      name: 'Beta Staff Member',
      role: 'SERVER',
      branchId: branchBeta,
      status: 'ACTIVE',
      salt: 'salt_beta_123',
      pinHash: 'hash_beta_123',
    });

    // Ensure order in branch_beta
    await repo.addOrder({
      orderId: orderBetaId,
      tableNumber: tableBetaNum,
      branchId: branchBeta,
      status: 'COOKING',
      version: 1,
      items: [
        { menuItemId: 'item_pizza', name: 'Pizza', quantity: 1, priceMinor: 1500, station: 'GRILL', status: 'COOKING' },
      ],
      pricing: { subtotalMinor: 1500, taxMinor: 75, totalMinor: 1575 },
    } as any);

    // Ensure service request in branch_beta
    await repo.addServiceRequest({
      id: serviceReqBetaId,
      tableNumber: tableBetaNum,
      branchId: branchBeta,
      type: 'WATER',
      status: 'PENDING',
      requestedAt: '12:00',
    });

    // Add kitchen tasks for alpha and beta
    await repo.addKitchenTask({
      id: 'task_alpha_1',
      orderId: 'ord_alpha_1',
      tableNumber: 'A-101',
      branchId: branchAlpha,
      station: 'GRILL',
      status: 'QUEUED',
      course: 'MAIN',
      title: 'Burger Alpha',
      itemName: 'Burger Alpha',
      items: [{ menuItemId: 'item_burger', name: 'Burger', quantity: 1 }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await repo.addKitchenTask({
      id: 'task_beta_1',
      orderId: orderBetaId,
      tableNumber: tableBetaNum,
      branchId: branchBeta,
      station: 'GRILL',
      status: 'QUEUED',
      course: 'MAIN',
      title: 'Pizza Beta',
      itemName: 'Pizza Beta',
      items: [{ menuItemId: 'item_pizza', name: 'Pizza', quantity: 1 }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    const contextMod = await import('../src/http/context');
    contextMod.eventLoopMonitor?.stop?.();
    if (contextMod.pgEventListener) {
      await contextMod.pgEventListener.stop?.();
    }
  });

  async function api(
    method: string,
    reqPath: string,
    token?: string,
    body?: any
  ): Promise<{ status: number; body: any }> {
    return new Promise((resolve, reject) => {
      const headers: Record<string, string> = {
        Host: host,
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      let payloadBuffer: Buffer | null = null;
      if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        payloadBuffer = Buffer.from(JSON.stringify(body), 'utf8');
        headers['Content-Length'] = String(payloadBuffer.length);
      }
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: serverPort,
          path: reqPath,
          method,
          headers,
        },
        (res) => {
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
        }
      );
      req.on('error', reject);
      if (payloadBuffer) req.write(payloadBuffer);
      req.end();
    });
  }

  it('1. verifies BRANCH_MISMATCH count in services/restaurant-api/src is >= 32', () => {
    const srcDir = path.resolve(__dirname, '../src');
    function scanDir(dir: string): string[] {
      const files: string[] = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...scanDir(full));
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
          files.push(full);
        }
      }
      return files;
    }

    const allFiles = scanDir(srcDir);
    let occurrences = 0;
    for (const f of allFiles) {
      const content = fs.readFileSync(f, 'utf8');
      const matches = content.match(/BRANCH_MISMATCH/g);
      if (matches) occurrences += matches.length;
    }

    assert(occurrences >= 32, `Expected at least 32 occurrences of BRANCH_MISMATCH, found ${occurrences}`);
  });

  it('2. POST /api/restaurant/staff: manager scoped to branch A cannot create staff in branch B', async () => {
    const res = await api('POST', '/api/restaurant/staff', tokenManagerAlpha, {
      name: 'Illicit Beta Staff',
      role: 'SERVER',
      branchId: branchBeta,
      pin: '1234',
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'BRANCH_MISMATCH');
  });

  it('3. PATCH /api/restaurant/staff/:id: manager scoped to branch A cannot modify staff in branch B', async () => {
    const res = await api('PATCH', `/api/restaurant/staff/${staffBetaId}`, tokenManagerAlpha, {
      name: 'Tampered Beta Name',
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'BRANCH_MISMATCH');
  });

  it('4. POST /api/restaurant/staff/:id/revoke: manager scoped to branch A cannot revoke staff in branch B', async () => {
    const res = await api('POST', `/api/restaurant/staff/${staffBetaId}/revoke`, tokenManagerAlpha);
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'BRANCH_MISMATCH');
  });

  it('5. POST /api/restaurant/sessions/close: staff scoped to branch A cannot close session for table in branch B', async () => {
    const res = await api('POST', '/api/restaurant/sessions/close', tokenManagerAlpha, {
      tableNumber: tableBetaNum,
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'BRANCH_MISMATCH');
  });

  it('6. POST /api/restaurant/tables/settle: staff scoped to branch A cannot settle table in branch B', async () => {
    const res = await api('POST', '/api/restaurant/tables/settle', tokenManagerAlpha, {
      tableId: tableBetaId,
      tableNumber: tableBetaNum,
      amountMinor: 1500,
      method: 'CASH',
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'BRANCH_MISMATCH');
  });

  it('7. GET /api/restaurant/orders/:id: staff scoped to branch A cannot read order in branch B', async () => {
    const res = await api('GET', `/api/restaurant/orders/${orderBetaId}`, tokenStaffAlpha);
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'BRANCH_MISMATCH');
  });

  it('8. PATCH /api/restaurant/orders/:id/status: staff scoped to branch A cannot update order in branch B', async () => {
    const res = await api('PATCH', `/api/restaurant/orders/${orderBetaId}/status`, tokenStaffAlpha, {
      status: 'READY',
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'BRANCH_MISMATCH');
  });

  it('9. POST /api/restaurant/orders/:id/cancel: staff scoped to branch A cannot cancel order in branch B', async () => {
    const res = await api('POST', `/api/restaurant/orders/${orderBetaId}/cancel`, tokenManagerAlpha, {
      reason: 'Cross branch cancel attempt',
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'BRANCH_MISMATCH');
  });

  it('10. GET /api/restaurant/kds: non-privileged staff token for branch A NEVER returns branch B tasks even if requested in query', async () => {
    const res = await api('GET', `/api/restaurant/kds?branchId=${branchBeta}`, tokenStaffAlpha);
    assert.equal(res.status, 200);
    const tasks = res.body.tasks || res.body.data;
    assert(Array.isArray(tasks), 'Expected array of tasks');
    // None of the tasks returned must belong to branchBeta
    const betaTasks = tasks.filter((t: any) => t.branchId === branchBeta);
    assert.equal(betaTasks.length, 0, `Non-privileged branch A staff should receive 0 branch B tasks, found ${betaTasks.length}`);
    const alphaTasks = tasks.filter((t: any) => t.branchId === branchAlpha);
    assert(alphaTasks.length >= 1, 'Expected branch A tasks returned');
  });

  it('11. POST /api/restaurant/kds/bump: branch A staff cannot bump task in branch B', async () => {
    const res = await api('POST', '/api/restaurant/kds/bump', tokenManagerAlpha, {
      taskId: 'task_beta_1',
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'BRANCH_MISMATCH');
  });

  it('12. POST /api/restaurant/kds/expo-dispatch: branch A staff cannot dispatch table in branch B', async () => {
    const res = await api('POST', '/api/restaurant/kds/expo-dispatch', tokenManagerAlpha, {
      tableNumber: tableBetaNum,
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'BRANCH_MISMATCH');
  });

  it('13. PATCH /api/restaurant/tables/:id: manager scoped to branch A cannot modify table in branch B', async () => {
    const res = await api('PATCH', `/api/restaurant/tables/${tableBetaId}`, tokenManagerAlpha, {
      capacity: 8,
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'BRANCH_MISMATCH');
  });

  it('14. DELETE /api/restaurant/tables/:id: manager scoped to branch A cannot delete table in branch B', async () => {
    const res = await api('DELETE', `/api/restaurant/tables/${tableBetaId}`, tokenManagerAlpha);
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'BRANCH_MISMATCH');
  });

  it('15. POST /api/restaurant/tables/:id/rotate-locator: staff scoped to branch A cannot rotate table in branch B', async () => {
    const res = await api('POST', `/api/restaurant/tables/${tableBetaId}/rotate-locator`, tokenManagerAlpha, {
      reason: 'Testing cross-branch rotation block',
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'BRANCH_MISMATCH');
  });

  it('16. POST /api/restaurant/service-requests/:id/resolve: staff scoped to branch A cannot resolve request in branch B', async () => {
    const res = await api('POST', `/api/restaurant/service-requests/${serviceReqBetaId}/resolve`, tokenStaffAlpha);
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'BRANCH_MISMATCH');
  });

  it('17. POST /api/restaurant/branding/branch-overrides: staff scoped to branch A cannot set overrides for branch B', async () => {
    const res = await api('POST', '/api/restaurant/branding/branch-overrides', tokenManagerAlpha, {
      branchId: branchBeta,
      restaurantName: 'Malicious Beta Override',
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'BRANCH_MISMATCH');
  });

  it('18. DELETE /api/restaurant/branding/branch-overrides/:id: staff scoped to branch A cannot reset overrides for branch B', async () => {
    const res = await api('DELETE', `/api/restaurant/branding/branch-overrides/${branchBeta}`, tokenManagerAlpha);
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'BRANCH_MISMATCH');
  });

  it('19. POST /api/restaurant/menu/branch-overrides: staff scoped to branch A cannot set menu overrides for branch B', async () => {
    const res = await api('POST', '/api/restaurant/menu/branch-overrides', tokenManagerAlpha, {
      branchId: branchBeta,
      itemId: 'item_pizza',
      available: false,
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'BRANCH_MISMATCH');
  });
});
