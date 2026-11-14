/**
 * ⚡ OrbitoX RestaurantOS - Realtime Gateway Scoped Room & Security Test
 * ─────────────────────────────────────────────────────────────
 * Validates:
 * 1. Strict room isolation (Session A cannot receive Session B events)
 * 2. Station-specific KDS filtering
 * 3. Guest capability verification before room subscription
 * 4. Monotonic ordering and reconnect replay buffer
 */

import { RealtimeEventGateway } from '../../services/realtime-event-gateway.service';
import { QRTrustEngine, DiningSession } from '../qr-trust';

function assert(condition: boolean, title: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${title}`);
    throw new Error(`Assertion failed: ${title}`);
  }
  console.log(`  ✓ ${title}`);
}

async function runRealtimeGatewayTest() {
  console.log('⚡ ========================================================');
  console.log('⚡ ORBITOX RESTAURANTOS: REALTIME GATEWAY TEST SUITE');
  console.log('⚡ ========================================================\n');

  const gw = new RealtimeEventGateway();

  // Setup: Table 14 Session (Session 1001)
  const session1001: DiningSession = {
    id: 'sess_1001',
    tenantId: 'tenant_orbitox',
    companyId: 'company_bistro',
    locationId: 'loc_ludhiana',
    tableId: 'tbl_14',
    sessionCode: 'S-1048',
    status: 'ACTIVE',
    joinPolicy: 'OPEN_JOIN',
    accessEpoch: 1,
    version: 1,
    openedAt: new Date().toISOString(),
  };

  // Setup: Table 20 Session (Session 2002)
  const session2002: DiningSession = {
    id: 'sess_2002',
    tenantId: 'tenant_orbitox',
    companyId: 'company_bistro',
    locationId: 'loc_ludhiana',
    tableId: 'tbl_20',
    sessionCode: 'S-2050',
    status: 'ACTIVE',
    joinPolicy: 'OPEN_JOIN',
    accessEpoch: 1,
    version: 1,
    openedAt: new Date().toISOString(),
  };

  // Issue tokens
  const tokenGuestA = QRTrustEngine.issueCapabilityToken({
    tenantId: 'tenant_orbitox',
    companyId: 'company_bistro',
    locationId: 'loc_ludhiana',
    tableId: 'tbl_14',
    diningSessionId: 'sess_1001',
    participantId: 'part_nikhil',
    role: 'GUEST',
    accessEpoch: 1,
  });

  const tokenGuestB = QRTrustEngine.issueCapabilityToken({
    tenantId: 'tenant_orbitox',
    companyId: 'company_bistro',
    locationId: 'loc_ludhiana',
    tableId: 'tbl_20',
    diningSessionId: 'sess_2002',
    participantId: 'part_stranger',
    role: 'GUEST',
    accessEpoch: 1,
  });

  // Register clients
  gw.registerClient('client_nikhil_phone', 'GUEST');
  gw.registerClient('client_stranger_phone', 'GUEST');
  gw.registerClient('client_tandoor_screen', 'STAFF');
  gw.registerClient('client_bar_screen', 'STAFF');

  // Subscriptions
  const subA = gw.subscribeGuestToSession('client_nikhil_phone', tokenGuestA, session1001);
  const subB = gw.subscribeGuestToSession('client_stranger_phone', tokenGuestB, session2002);
  const subTandoor = gw.subscribeStaffToStation('client_tandoor_screen', { tenantId: 'tenant_orbitox', locationId: 'loc_ludhiana', role: 'STAFF' }, 'st_tandoor');
  const subBar = gw.subscribeStaffToStation('client_bar_screen', { tenantId: 'tenant_orbitox', locationId: 'loc_ludhiana', role: 'STAFF' }, 'st_bar');

  assert(subA.success === true, 'Guest A successfully subscribed to Table 14 session room');
  assert(subB.success === true, 'Guest B successfully subscribed to Table 20 session room');

  // 1. Unauthorized KDS Subscription Check
  let unauthorizedKdsCaught = false;
  try {
    gw.subscribeStaffToStation('client_nikhil_phone', { tenantId: 'tenant_orbitox', locationId: 'loc_ludhiana', role: 'GUEST' as any }, 'st_tandoor');
  } catch {
    unauthorizedKdsCaught = true;
  }
  assert(unauthorizedKdsCaught, 'Guest phone rejected from subscribing to kitchen station KDS room');

  // 2. Table 14 Emits Order Updated Event
  const evtOrder = gw.emitToRoom({
    room: subA.room,
    eventType: 'order.status_updated',
    tenantId: 'tenant_orbitox',
    locationId: 'loc_ludhiana',
    sessionId: 'sess_1001',
    payload: { orderId: 'ord_1001', stage: 'COOKING', progressPercent: 65 },
  });

  assert(gw.isClientReceivingEvent('client_nikhil_phone', evtOrder) === true, 'Guest A receives Table 14 order update');
  assert(gw.isClientReceivingEvent('client_stranger_phone', evtOrder) === false, 'Guest B on Table 20 DOES NOT receive Table 14 event (Zero cross-table leakage)');
  assert(gw.isClientReceivingEvent('client_tandoor_screen', evtOrder) === false, 'Tandoor KDS does not receive raw customer session event');

  // 3. Station Specific KDS Event
  const evtTandoorTask = gw.emitToRoom({
    room: subTandoor.room,
    eventType: 'kitchen.task_scheduled',
    tenantId: 'tenant_orbitox',
    locationId: 'loc_ludhiana',
    payload: { taskId: 'task_t1', itemName: 'Paneer Tikka', fireAt: '19:10:00' },
  });

  assert(gw.isClientReceivingEvent('client_tandoor_screen', evtTandoorTask) === true, 'Tandoor KDS receives Tandoor task');
  assert(gw.isClientReceivingEvent('client_bar_screen', evtTandoorTask) === false, 'Bar KDS DOES NOT receive Tandoor task');
  assert(gw.isClientReceivingEvent('client_nikhil_phone', evtTandoorTask) === false, 'Guest phone DOES NOT receive internal kitchen station dispatch');

  // 4. Reconnect Replay Buffer
  gw.emitToRoom({ room: subA.room, eventType: 'order.item_ready', tenantId: 'tenant_orbitox', locationId: 'loc_ludhiana', payload: { itemName: 'Naan' } });
  gw.emitToRoom({ room: subA.room, eventType: 'order.ready_to_serve', tenantId: 'tenant_orbitox', locationId: 'loc_ludhiana', payload: { stage: 'READY' } });

  // Guest A missed events after sequence 1
  const missedEvents = gw.getMissedEventsForClient('client_nikhil_phone', 1);
  assert(missedEvents.length === 2, 'Reconnect replay returns exactly 2 missed events');
  assert(missedEvents[0]?.sequenceNumber === 2, 'Replay preserves strict monotonic sequence order');
  assert(missedEvents[1]?.sequenceNumber === 3, 'Replay second event is sequence 3');

  console.log('\n🎉 ========================================================');
  console.log('🎉 SCOPED REALTIME GATEWAY VERIFIED SUCCESSFULLY!');
  console.log('🎉 ========================================================\n');
}

runRealtimeGatewayTest().catch(err => {
  console.error('Fatal Realtime Test Error:', err);
  process.exit(1);
});
