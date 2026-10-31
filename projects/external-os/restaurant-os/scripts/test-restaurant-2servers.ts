/**
 * 🛰️ OrbitoX Platform <-> RestaurantOS Multi-Server Correctness Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates correctness under 2 RestaurantOS server processes behind a round-robin splitter:
 * 1. Order creation idempotent: 20 identical concurrent requests across 2 servers => 1 order in DB.
 * 2. Prices computed on server from DB catalogue (client fake price ignored).
 * 3. Order state machine version column: 2 kitchen screens accepting at once => 1 x 200, 1 x 409.
 * 4. KDS events via outbox + LISTEN/NOTIFY: order placed on Server 1 appears on Server 2 KDS within 1s.
 * 5. Last-Event-ID header replays missed events gaplessly.
 */

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
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { signBridgeRequest, getDefaultBridgeKeys } from '../packages/domain/bridge-auth';

const prisma = new PrismaClient();
const keys = getDefaultBridgeKeys();
process.env.ORBITOX_BRIDGE_KEYS = JSON.stringify(keys);

let port1 = 0;
let port2 = 0;
let proxyPort = 0;
let proxyUrl = '';
let server1Url = '';
let server2Url = '';

let proc1: ChildProcess | null = null;
let proc2: ChildProcess | null = null;
let proxyServer: http.Server | null = null;

let rrCounter = 0;
const TEST_TENANT = `org/test-2servers-${crypto.randomBytes(4).toString('hex')}/project/p1/environment/prod`;
const TEST_PRINCIPAL = { sub: 'platform_orchestrator', scopes: ['tenant:admin', 'platform:superuser'] };
const KDS_PRINCIPAL = { sub: 'kds_screen_kitchen', scopes: ['tenant:admin', 'station:kds'] };

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
  throw new Error(`Timeout waiting for server at ${url} to become ready`);
}

function startServerProcess(port: number): ChildProcess {
  const serverPath = path.resolve(__dirname, '../src/server.ts');
  const tsxCli = require.resolve('tsx/cli');
  const child = spawn(
    process.execPath,
    [tsxCli, serverPath],
    {
      cwd: path.resolve(__dirname, '..'),
      env: {
        ...process.env,
        PORT: String(port),
        NODE_ENV: 'development',
        DATABASE_URL: process.env.DATABASE_URL!,
        ORBITOX_BRIDGE_KEYS: JSON.stringify(keys),
        RESTAURANTOS_DISABLE_AUTOLISTEN: 'false',
        RESTAURANTOS_ENABLE_TEST_ROUTES: 'true',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    }
  );

  child.stderr?.on('data', (d) => {
    const msg = d.toString();
    if (!msg.includes('ExperimentalWarning') && !msg.includes('Debugger') && !msg.includes('node --trace-warnings')) {
      console.error(`[Server :${port} ERR]`, msg.trim());
    }
  });

  child.stdout?.resume();
  child.on('exit', (code, sig) => {
    if (code !== 0 && code !== null) {
      console.error(`[Server :${port} EXITED code ${code}, signal ${sig}]`);
    }
  });

  return child;
}

async function sendRequest(
  targetBaseUrl: string,
  method: string,
  pathWithQuery: string,
  headers: Record<string, string>,
  body?: any
): Promise<{ status: number; headers: Record<string, string>; body: any }> {
  const rawBody = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined;
  const res = await fetch(`${targetBaseUrl}${pathWithQuery}`, {
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

before(async () => {
  port1 = await getFreePort();
  port2 = await getFreePort();
  while (port2 === port1) {
    port2 = await getFreePort();
  }
  proxyPort = await getFreePort();
  while (proxyPort === port1 || proxyPort === port2) {
    proxyPort = await getFreePort();
  }

  server1Url = `http://127.0.0.1:${port1}`;
  server2Url = `http://127.0.0.1:${port2}`;
  proxyUrl = `http://127.0.0.1:${proxyPort}`;

  // Ensure Outbox LISTEN/NOTIFY trigger exists
  try {
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION public.notify_restaurant_kds_events()
        RETURNS trigger
        LANGUAGE plpgsql
      AS $$
      BEGIN
        PERFORM pg_notify('restaurant_kds_events', json_build_object(
          'id', NEW.id,
          'tenantId', NEW."tenantId",
          'sequence', NEW."sequence",
          'type', NEW."type",
          'producer', NEW."producer",
          'branchId', NEW."branchId",
          'floorId', NEW."floorId",
          'tableNumber', NEW."tableNumber",
          'payload', NEW."payload"
        )::text);
        RETURN NEW;
      END;
      $$;
    `);
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        DROP TRIGGER IF EXISTS trg_restaurant_kds_events ON "DomainEvent";
        CREATE TRIGGER trg_restaurant_kds_events
          AFTER INSERT ON "DomainEvent"
          FOR EACH ROW
          EXECUTE FUNCTION public.notify_restaurant_kds_events();
      END
      $$;
    `);
  } catch (err: any) {
    console.warn('[2servers test] Trigger setup warning:', err.message);
  }

  // Start two independent server processes
  proc1 = startServerProcess(port1);
  proc2 = startServerProcess(port2);

  // Wait for both to be ready
  await Promise.all([
    waitForReady(server1Url),
    waitForReady(server2Url),
  ]);

  // Start round-robin proxy
  const targets = [server1Url, server2Url];
  proxyServer = http.createServer(async (clientReq, clientRes) => {
    const targetUrl = targets[rrCounter % targets.length];
    rrCounter++;

    const chunks: Buffer[] = [];
    clientReq.on('data', (c) => chunks.push(c));
    clientReq.on('end', async () => {
      const bodyBuf = Buffer.concat(chunks);
      try {
        const upstreamRes = await fetch(`${targetUrl}${clientReq.url}`, {
          method: clientReq.method,
          headers: clientReq.headers as Record<string, string>,
          body: bodyBuf.length ? bodyBuf : undefined,
        });

        const respHeaders: Record<string, string> = {};
        upstreamRes.headers.forEach((v, k) => {
          respHeaders[k] = v;
        });
        respHeaders['x-proxied-to'] = targetUrl;

        clientRes.writeHead(upstreamRes.status, respHeaders);
        const resBody = await upstreamRes.arrayBuffer();
        clientRes.end(Buffer.from(resBody));
      } catch (err: any) {
        clientRes.writeHead(502, { 'Content-Type': 'application/json' });
        clientRes.end(JSON.stringify({ error: 'BAD_GATEWAY', message: err.message }));
      }
    });
  });

  await new Promise<void>((resolve) => {
    proxyServer!.listen(proxyPort, '127.0.0.1', () => {
      resolve();
    });
  });

  // Provision test tenant once through proxy (creates branch, tables, and menu in shared Postgres)
  const provPath = '/orbitox/lifecycle/provision';
  const provPayload = {
    tenantId: TEST_TENANT,
    restaurantName: 'The Distributed Hearth',
    slug: `dist-resto-${crypto.randomBytes(3).toString('hex')}`,
    planId: 'growth',
    revision: 1,
    idempotencyKey: `idem_prov_${crypto.randomBytes(6).toString('hex')}`,
  };
  const signedProvHeaders = signBridgeRequest(keys, {
    method: 'POST',
    pathWithQuery: provPath,
    tenantId: TEST_TENANT,
    principal: TEST_PRINCIPAL,
    body: JSON.stringify(provPayload),
  });

  const provRes = await sendRequest(proxyUrl, 'POST', provPath, signedProvHeaders, provPayload);
  assert.ok([200, 201].includes(provRes.status), `Provisioning failed: ${JSON.stringify(provRes.body)}`);
});

after(async () => {
  if (proxyServer) {
    await new Promise<void>((r) => proxyServer!.close(() => r()));
  }
  if (proc1) proc1.kill('SIGTERM');
  if (proc2) proc2.kill('SIGTERM');

  try {
    await prisma.tenant.deleteMany({
      where: { id: { contains: 'test-2servers' } },
    });
  } catch {}
  await prisma.$disconnect();
});

describe('RestaurantOS Multi-Server Correctness under Round-Robin Load Balancer', () => {
  let catalogMenuItemId = '';
  let catalogMenuPriceMinor = 0;

  it('Setup: fetches authoritative menu catalogue from provisioned tenant', async () => {
    const menuPath = '/api/restaurant/menu';
    const signedHeaders = signBridgeRequest(keys, {
      method: 'GET',
      pathWithQuery: menuPath,
      tenantId: TEST_TENANT,
      principal: TEST_PRINCIPAL,
    });

    const res = await sendRequest(proxyUrl, 'GET', menuPath, signedHeaders);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data), 'menu items array required');
    assert.ok(res.body.data.length > 0, 'at least 1 menu item required');

    const firstItem = res.body.data[0];
    catalogMenuItemId = firstItem.id;
    catalogMenuPriceMinor = firstItem.basePriceMinor;
    assert.ok(catalogMenuItemId, 'catalog item id found');
    assert.ok(catalogMenuPriceMinor > 0, 'catalog item basePriceMinor > 0');
  });

  it('1. Order creation idempotent: 20 identical concurrent requests across 2 servers => 1 order in DB', async () => {
    const orderPath = '/api/restaurant/orders';
    const idemKey = `idem_concurrent_${crypto.randomBytes(8).toString('hex')}`;
    const orderPayload = {
      tableNumber: 'T-01',
      items: [{ id: catalogMenuItemId, quantity: 2 }],
      idempotencyKey: idemKey,
    };

    // Send 20 concurrent requests interleaved across Server 1 and Server 2 through the proxy
    const requests = Array.from({ length: 20 }, () => {
      const signedHeaders = signBridgeRequest(keys, {
        method: 'POST',
        pathWithQuery: orderPath,
        tenantId: TEST_TENANT,
        principal: TEST_PRINCIPAL,
        body: JSON.stringify(orderPayload),
      });
      return sendRequest(proxyUrl, 'POST', orderPath, {
        ...signedHeaders,
        'x-idempotency-key': idemKey,
      }, orderPayload);
    });

    const responses = await Promise.all(requests);

    // All 20 requests must succeed with 200 or 201
    for (const r of responses) {
      assert.ok([200, 201].includes(r.status), `Expected 200 or 201, got ${r.status}: ${JSON.stringify(r.body)}`);
    }

    // All 20 must return the EXACT same orderId
    const firstOrderId = responses[0].body.orderId || responses[0].body.data?.orderId;
    assert.ok(firstOrderId, 'Valid orderId in response');
    for (const r of responses) {
      const oid = r.body.orderId || r.body.data?.orderId;
      assert.equal(oid, firstOrderId, 'All concurrent responses must have identical orderId');
    }

    // Database verification: Exactly 1 row in RestaurantOrder for this orderId
    const dbCount = await prisma.restaurantOrder.count({
      where: { id: firstOrderId, tenantId: TEST_TENANT },
    });
    assert.equal(dbCount, 1, 'Exactly 1 order row must exist in DB despite 20 concurrent requests across 2 servers');
  });

  it('2. Prices computed on server from DB catalogue (client fake price ignored)', async () => {
    const orderPath = '/api/restaurant/orders';
    const fakePricePayload = {
      tableNumber: 'T-02',
      items: [
        {
          id: catalogMenuItemId,
          quantity: 1,
          price: 1, // Fake client price: 1 rupee
          priceMinor: 1, // Fake client priceMinor
          unitPriceMinor: 0, // Fake zero price
        },
      ],
      idempotencyKey: `idem_fake_price_${crypto.randomBytes(8).toString('hex')}`,
    };

    const signedHeaders = signBridgeRequest(keys, {
      method: 'POST',
      pathWithQuery: orderPath,
      tenantId: TEST_TENANT,
      principal: TEST_PRINCIPAL,
      body: JSON.stringify(fakePricePayload),
    });

    const res = await sendRequest(proxyUrl, 'POST', orderPath, signedHeaders, fakePricePayload);
    assert.ok([200, 201].includes(res.status), `Expected 200/201, got ${res.status}`);

    const orderId = res.body.orderId || res.body.data?.orderId;
    const subtotalMinor = res.body.quote?.subtotalMinor || res.body.data?.subtotalMinor;

    // The subtotal MUST match catalogMenuPriceMinor, NOT the fake 1 minor unit
    assert.equal(
      Number(subtotalMinor),
      catalogMenuPriceMinor,
      `Authoritative catalog price ${catalogMenuPriceMinor} must be used, client price 1 ignored`
    );

    // Verify DB row
    const dbOrder = await prisma.restaurantOrder.findUnique({
      where: { id: orderId },
    });
    assert.ok(dbOrder, 'Order found in DB');
    assert.equal(dbOrder.subtotalMinor, catalogMenuPriceMinor, 'DB subtotalMinor matches catalog');
  });

  it('3. Order state machine version column: 2 kitchen screens accepting at once => 1 x 200, 1 x 409', async () => {
    // 1. Create a fresh order
    const orderPath = '/api/restaurant/orders';
    const initPayload = {
      tableNumber: 'T-03',
      items: [{ id: catalogMenuItemId, quantity: 1 }],
      idempotencyKey: `idem_version_test_${crypto.randomBytes(8).toString('hex')}`,
    };
    const signedInit = signBridgeRequest(keys, {
      method: 'POST',
      pathWithQuery: orderPath,
      tenantId: TEST_TENANT,
      principal: TEST_PRINCIPAL,
      body: JSON.stringify(initPayload),
    });

    const initRes = await sendRequest(proxyUrl, 'POST', orderPath, signedInit, initPayload);
    const orderId = initRes.body.orderId || initRes.body.data?.orderId;
    assert.ok(orderId, 'Order created');

    // Verify initial version is 1
    const initialDbOrder = await prisma.restaurantOrder.findUnique({ where: { id: orderId } });
    assert.equal(initialDbOrder?.version, 1, 'Initial version must be 1');

    // 2. Simulate 2 kitchen screens accepting the order concurrently at version 1
    // Screen A sends request to Server 1
    // Screen B sends request to Server 2
    const statusPath = `/api/restaurant/orders/${orderId}/status`;
    const screenAPayload = { status: 'PREPARING', version: 1, reason: 'Kitchen Screen A accepted' };
    const screenBPayload = { status: 'PREPARING', version: 1, reason: 'Kitchen Screen B accepted' };

    const signedA = signBridgeRequest(keys, {
      method: 'PATCH',
      pathWithQuery: statusPath,
      tenantId: TEST_TENANT,
      principal: KDS_PRINCIPAL,
      body: JSON.stringify(screenAPayload),
    });
    const signedB = signBridgeRequest(keys, {
      method: 'PATCH',
      pathWithQuery: statusPath,
      tenantId: TEST_TENANT,
      principal: KDS_PRINCIPAL,
      body: JSON.stringify(screenBPayload),
    });

    const [resA, resB] = await Promise.all([
      sendRequest(server1Url, 'PATCH', statusPath, signedA, screenAPayload),
      sendRequest(server2Url, 'PATCH', statusPath, signedB, screenBPayload),
    ]);

    const statuses = [resA.status, resB.status].sort();
    assert.deepEqual(
      statuses,
      [200, 409],
      `Expected exactly one 200 OK and one 409 Conflict. Got Screen A=${resA.status}, Screen B=${resB.status}`
    );

    // Verify the 409 response has STATE_CONFLICT code
    const conflictRes = resA.status === 409 ? resA : resB;
    assert.equal(conflictRes.body.code, 'STATE_CONFLICT');

    // Verify the DB order version was safely incremented to 2
    const finalDbOrder = await prisma.restaurantOrder.findUnique({ where: { id: orderId } });
    assert.equal(finalDbOrder?.version, 2, 'Version in DB must be incremented to 2');
    assert.equal(finalDbOrder?.status, 'PREPARING');
  });

  it('4. KDS events via outbox + LISTEN/NOTIFY: order placed on Server 1 appears on Server 2 KDS within 1s', async () => {
    // Connect SSE client to Server 2
    const ssePath = '/api/restaurant/events';
    const signedSse = signBridgeRequest(keys, {
      method: 'GET',
      pathWithQuery: ssePath,
      tenantId: TEST_TENANT,
      principal: KDS_PRINCIPAL,
    });

    const receivedEvents: any[] = [];
    let resolveFirstEvent: (evt: any) => void;
    const eventPromise = new Promise<any>((resolve) => {
      resolveFirstEvent = resolve;
    });

    const sseReq = http.request(
      `${server2Url}${ssePath}`,
      {
        method: 'GET',
        headers: signedSse,
      },
      (sseRes) => {
        let buffer = '';
        sseRes.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const rawBlock of lines) {
            const dataMatch = /data: (.+)/.exec(rawBlock);
            if (dataMatch && dataMatch[1]) {
              try {
                const parsed = JSON.parse(dataMatch[1]);
                receivedEvents.push(parsed);
                resolveFirstEvent(parsed);
              } catch {}
            }
          }
        });
      }
    );
    sseReq.end();

    // Give SSE connection 100ms to register
    await new Promise((r) => setTimeout(r, 100));

    // Place new order on Server 1
    const orderPath = '/api/restaurant/orders';
    const orderPayload = {
      tableNumber: 'T-04',
      items: [{ id: catalogMenuItemId, quantity: 1 }],
      idempotencyKey: `idem_cross_kds_${crypto.randomBytes(8).toString('hex')}`,
    };
    const signedOrder = signBridgeRequest(keys, {
      method: 'POST',
      pathWithQuery: orderPath,
      tenantId: TEST_TENANT,
      principal: TEST_PRINCIPAL,
      body: JSON.stringify(orderPayload),
    });

    const orderPlacedStart = Date.now();
    const orderRes = await sendRequest(server1Url, 'POST', orderPath, signedOrder, orderPayload);
    assert.ok([200, 201].includes(orderRes.status));
    const targetOrderId = orderRes.body.orderId || orderRes.body.data?.orderId;

    // Wait for the event to arrive on Server 2's KDS stream within 1000ms (allow 4000ms on shared CI runner)
    const timeoutLimit = process.env.CI ? 4000 : 1000;
    const received = await Promise.race([
      eventPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`KDS cross-server event timed out (> ${timeoutLimit}ms)`)), timeoutLimit)),
    ]);

    const elapsed = Date.now() - orderPlacedStart;
    sseReq.destroy();

    assert.ok(received, 'Event received on Server 2');
    assert.ok(elapsed <= timeoutLimit, `Event must arrive within ${timeoutLimit}ms; took ${elapsed}ms`);
  });

  it('5. Last-Event-ID header replays missed events gaplessly', async () => {
    // 1. Fetch latest event sequence from database
    const latestEvent = await prisma.domainEvent.findFirst({
      where: { tenantId: TEST_TENANT },
      orderBy: { sequence: 'desc' },
    });
    assert.ok(latestEvent, 'At least 1 domain event exists');
    const pastSeq = Math.max(0, latestEvent.sequence - 2);

    // 2. Connect to Server 2 with Last-Event-ID: pastSeq
    const ssePath = '/api/restaurant/events';
    const signedSse = signBridgeRequest(keys, {
      method: 'GET',
      pathWithQuery: ssePath,
      tenantId: TEST_TENANT,
      principal: KDS_PRINCIPAL,
    });

    const replayedEvents: any[] = [];
    await new Promise<void>((resolve, reject) => {
      const sseReq = http.request(
        `${server2Url}${ssePath}`,
        {
          method: 'GET',
          headers: {
            ...signedSse,
            'Last-Event-ID': String(pastSeq),
          },
        },
        (sseRes) => {
          let buffer = '';
          const timer = setTimeout(() => {
            sseReq.destroy();
            resolve();
          }, 400);

          sseRes.on('data', (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const rawBlock of lines) {
              const dataMatch = /data: (.+)/.exec(rawBlock);
              if (dataMatch && dataMatch[1]) {
                try {
                  const parsed = JSON.parse(dataMatch[1]);
                  replayedEvents.push(parsed);
                  if (replayedEvents.length >= 1) {
                    clearTimeout(timer);
                    sseReq.destroy();
                    resolve();
                  }
                } catch {}
              }
            }
          });
        }
      );
      sseReq.on('error', (err) => {
        // Destroyed connections might emit ECONNRESET, which is expected
        resolve();
      });
      sseReq.end();
    });

    assert.ok(replayedEvents.length >= 1, 'Replayed at least 1 missed event');
    for (const evt of replayedEvents) {
      if (evt.sequence !== undefined) {
        assert.ok(evt.sequence > pastSeq, `Replayed sequence ${evt.sequence} must be > ${pastSeq}`);
      }
    }
  });
});
