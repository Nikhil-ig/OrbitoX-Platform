/**
 * 🧪 Multi-Tenant Event Bus & SSE Stream Isolation Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Proves that RealtimeEventBus strictly partitions event broadcasts by tenant:
 * - Client on Tenant A never receives Tenant B's events
 * - Client on Tenant B never receives Tenant A's events
 * - Un-tenanted events are never leaked to tenanted streams
 */

import { RealtimeEventBus } from '../packages/domain/event-bus';
import { DomainEvent } from '../packages/storage';
import { EventEmitter } from 'events';

class MockResponse extends EventEmitter {
  public writtenData: string[] = [];
  public headers: Record<string, string> = {};
  public statusCode: number = 200;
  public ended = false;

  writeHead(statusCode: number, headers: Record<string, string>) {
    this.statusCode = statusCode;
    this.headers = headers;
  }

  write(chunk: string) {
    this.writtenData.push(chunk);
    return true;
  }

  end() {
    this.ended = true;
    this.emit('close');
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function run() {
  console.log('\n===============================================================');
  console.log('⚡ TEST: MULTI-TENANT SSE EVENT BUS PARTITIONING');
  console.log('===============================================================\n');

  const bus = new RealtimeEventBus();

  const mockReqA: any = { url: '/api/restaurant/events', headers: {} };
  const mockResA: any = new MockResponse();

  const mockReqB: any = { url: '/api/restaurant/events', headers: {} };
  const mockResB: any = new MockResponse();

  // 1. Register Client on Tenant Alpha
  bus.registerClient(mockReqA, mockResA, undefined, { type: 'STAFF', role: 'CHEF' }, 'ten_alpha_123');
  assert(bus.getActiveClientCount('ten_alpha_123') === 1, 'Client registered under Tenant Alpha');
  assert(mockResA.headers['x-tenant-id'] === 'ten_alpha_123', 'SSE response headers stamped with x-tenant-id');

  // 2. Register Client on Tenant Beta
  bus.registerClient(mockReqB, mockResB, undefined, { type: 'STAFF', role: 'CHEF' }, 'ten_beta_456');
  assert(bus.getActiveClientCount('ten_beta_456') === 1, 'Client registered under Tenant Beta');
  assert(bus.getActiveClientCount() === 2, 'Total active clients across fleet is 2');

  // 3. Clear initial handshake lines
  mockResA.writtenData = [];
  mockResB.writtenData = [];

  // 4. Broadcast event for Tenant Alpha
  const eventAlpha: DomainEvent = {
    id: 'evt_alpha_1',
    sequence: 1,
    type: 'order.created',
    timestamp: new Date().toISOString(),
    producer: 'pos',
    branchId: 'br_main',
    tenantId: 'ten_alpha_123',
    payload: {
      tenantId: 'ten_alpha_123',
      orderId: 'ord_secret_alpha',
      totalMinor: 50000,
    },
  };

  bus.broadcast(eventAlpha);

  assert(mockResA.writtenData.length === 1, 'Tenant Alpha client received the event');
  assert(mockResA.writtenData[0].includes('ord_secret_alpha'), 'Event data delivered to Tenant Alpha client');
  assert(mockResB.writtenData.length === 0, 'ZERO LEAKAGE: Tenant Beta client received ZERO events from Tenant Alpha');

  // 5. Broadcast event for Tenant Beta
  mockResA.writtenData = [];
  mockResB.writtenData = [];

  const eventBeta: DomainEvent = {
    id: 'evt_beta_1',
    sequence: 2,
    type: 'kds.task.bumped',
    timestamp: new Date().toISOString(),
    producer: 'kds',
    branchId: 'br_main',
    tenantId: 'ten_beta_456',
    payload: {
      tenantId: 'ten_beta_456',
      taskId: 'task_secret_beta',
    },
  };

  bus.broadcast(eventBeta);

  assert(mockResB.writtenData.length === 1, 'Tenant Beta client received the event');
  assert(mockResB.writtenData[0].includes('task_secret_beta'), 'Event data delivered to Tenant Beta client');
  assert(mockResA.writtenData.length === 0, 'ZERO LEAKAGE: Tenant Alpha client received ZERO events from Tenant Beta');

  // 6. Broadcast un-tenanted event -> Must be dropped, not leaked
  mockResA.writtenData = [];
  mockResB.writtenData = [];

  const untennantedEvent: any = {
    id: 'evt_rogue',
    sequence: 3,
    type: 'system.leak',
    timestamp: new Date().toISOString(),
    producer: 'rogue',
    branchId: 'br_main',
    payload: { sensitive: 'should_never_reach_any_tenant' },
  };

  bus.broadcast(untennantedEvent);
  assert(mockResA.writtenData.length === 0, 'Un-tenanted event dropped for Tenant Alpha');
  assert(mockResB.writtenData.length === 0, 'Un-tenanted event dropped for Tenant Beta');

  // 7. Cleanup
  mockResA.end();
  assert(bus.getActiveClientCount('ten_alpha_123') === 0, 'Tenant Alpha client removed on close');
  assert(bus.getActiveClientCount('ten_beta_456') === 1, 'Tenant Beta client still connected');

  mockResB.end();
  assert(bus.getActiveClientCount() === 0, 'All clients disconnected cleanly');
  bus.stop();

  console.log('\n🎉 ALL MULTI-TENANT EVENT BUS ISOLATION TESTS PASSED CLEANLY!\n');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
