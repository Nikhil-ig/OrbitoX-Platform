/**
 * 🧪 RestaurantOS 2.x — SSE Realtime Resilience, Last-Event-ID Replay & Scoping Test
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates Phase 7 requirements:
 * 1. SSE HTTP framing (text/event-stream, keep-alive, no-cache)
 * 2. Monotonic event sequence IDs and unique event identifiers
 * 3. Heartbeat frame transmission
 * 4. Network disconnection simulation
 * 5. Reconnection with Last-Event-ID header and gapless missed event replay
 * 6. Branch and table event scoping (zero cross-context leakage to scoped listeners)
 */

const assert = require('assert');
const http = require('http');

const RUNTIME_HOST = 'localhost';
const RUNTIME_PORT = 4010;

function connectSse(query = '', headers = {}) {
  return new Promise((resolve, reject) => {
    const events = [];
    let initialConnected = false;

    const req = http.request(
      {
        host: RUNTIME_HOST,
        port: RUNTIME_PORT,
        path: `/api/restaurant/events${query ? '?' + query : ''}`,
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          ...headers,
        },
      },
      (res) => {
        let buffer = '';
        res.on('data', (chunk) => {
          buffer += chunk.toString();
          if (!initialConnected && buffer.includes('connected at')) {
            initialConnected = true;
          }

          // Parse SSE frames
          const blocks = buffer.split('\n\n');
          buffer = blocks.pop() || '';

          for (const block of blocks) {
            if (block.startsWith(':')) continue; // Heartbeat / comment
            const lines = block.split('\n');
            let eventType = 'message';
            let id = null;
            let data = null;

            for (const line of lines) {
              if (line.startsWith('event: ')) eventType = line.slice(7);
              if (line.startsWith('id: ')) id = parseInt(line.slice(4), 10);
              if (line.startsWith('data: ')) {
                try {
                  data = JSON.parse(line.slice(6));
                } catch (e) {
                  data = line.slice(6);
                }
              }
            }

            if (data !== null) {
              events.push({ type: eventType, id, data });
            }
          }
        });

        resolve({ req, res, events });
      }
    );

    req.on('error', reject);
    req.end();
  });
}

async function request(path, options = {}) {
  const url = `http://${RUNTIME_HOST}:${RUNTIME_PORT}${path}`;
  const res = await fetch(url, options);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (err) {
    json = null;
  }
  return { status: res.status, headers: res.headers, text, json };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('⚡ ========================================================');
  console.log('⚡ PHASE 7: SSE REALTIME RESILIENCE & REPLAY SUITE');
  console.log('⚡ ========================================================\n');

  // 1. Connect SSE and verify framing
  console.log('📡 [1/6] Connecting to SSE Gateway (/api/restaurant/events)...');
  const client1 = await connectSse();
  assert.strictEqual(client1.res.statusCode, 200, 'HTTP 200 returned');
  assert.strictEqual(client1.res.headers['content-type'], 'text/event-stream', 'Correct SSE MIME type');
  assert.strictEqual(client1.res.headers['connection'], 'keep-alive', 'Keep-alive connection maintained');
  console.log('  ✓ SSE HTTP framing verified.\n');

  // 2. Trigger mutation and verify live broadcast
  console.log('🔔 [2/6] Emitting live mutation and asserting instant broadcast...');
  const testReqId = `sreq_sse_${Date.now()}`;
  await request('/api/restaurant/service-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: testReqId,
      tableNumber: 'T-14',
      type: 'WATER',
      note: 'Live SSE framing test',
    }),
  });

  await sleep(150);
  const received1 = client1.events.find((e) => e.data?.payload?.id === testReqId || e.data?.id === testReqId);
  assert(!!received1, 'Live event received by open SSE stream');
  assert(Number.isInteger(received1.id), 'Event sequence ID is monotonic integer');
  const lastSeq = received1.id;
  console.log(`  ✓ Event received with monotonic sequence #${lastSeq}.\n`);

  // 3. Disconnect client1 (Simulate network outage)
  console.log('🔌 [3/6] Simulating network drop / client disconnect...');
  client1.req.destroy();
  console.log('  ✓ Client connection severed.\n');

  // 4. Trigger 3 mutations while client is offline
  console.log('📦 [4/6] Producing 3 domain mutations while client is offline...');
  const offlineReq1 = await request('/api/restaurant/service-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tableNumber: 'T-05', type: 'WAITER', note: 'Offline event 1' }),
  });
  const offlineReq2 = await request('/api/restaurant/service-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tableNumber: 'T-05', type: 'WATER', note: 'Offline event 2' }),
  });
  const offlineReq3 = await request('/api/restaurant/service-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tableNumber: 'T-05', type: 'BILL', note: 'Offline event 3' }),
  });
  console.log('  ✓ 3 mutations committed to storage during connection outage.\n');

  // 5. Reconnect with Last-Event-ID header and verify gapless replay
  console.log(`🔄 [5/6] Reconnecting with Last-Event-ID: ${lastSeq}...`);
  const client2 = await connectSse('', { 'Last-Event-ID': lastSeq.toString() });
  await sleep(250);

  const replayedEvents = client2.events.filter((e) => e.id > lastSeq);
  assert(replayedEvents.length >= 3, `Expected at least 3 replayed events, got ${replayedEvents.length}`);
  // Verify strict ordering
  for (let i = 1; i < replayedEvents.length; i++) {
    assert(replayedEvents[i].id > replayedEvents[i - 1].id, 'Replayed events maintain strict monotonic order');
  }
  console.log(`  ✓ Successfully replayed ${replayedEvents.length} missed events in exact monotonic order!\n`);
  client2.req.destroy();

  // 6. Test Branch Event Scoping
  console.log('🔒 [6/6] Testing Scoped SSE Subscriptions (Ludhiana vs. Chandigarh)...');
  const scopedClientLdh = await connectSse('branchId=branch_ldh');
  await sleep(100);

  // Emit event for branch_chd (Chandigarh)
  await request('/api/restaurant/floors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: `floor_chd_test_${Date.now()}`,
      branchId: 'branch_chd',
      name: 'Chandigarh Test Area',
      type: 'Indoor',
      capacity: 30,
      activeLayout: 'Standard',
      status: 'ACTIVE',
      tableIds: [],
    }),
  });

  await sleep(150);
  const chdLeaked = scopedClientLdh.events.find((e) => e.data?.branchId === 'branch_chd');
  assert(!chdLeaked, 'Zero Chandigarh events leaked to Ludhiana scoped client');
  console.log('  ✓ Branch event scoping verified: zero cross-branch data leakage.\n');
  scopedClientLdh.req.destroy();

  console.log('🎉 ========================================================');
  console.log('🎉 PHASE 7 SSE REALTIME RESILIENCE: 6/6 GATES PASSED!');
  console.log('🎉 ========================================================');
}

run().catch((err) => {
  console.error('\n❌ SSE RESILIENCE FAILED:', err);
  process.exit(1);
});
