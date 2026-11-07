/**
 * 🧪 OrbitoX RestaurantOS - Order & Kitchen Lifecycle Integration Test
 * ─────────────────────────────────────────────────────────────
 * Validates the complete business journey:
 * Catalog ➔ Quote ➔ Idempotent Submit ➔ DAG Scheduling ➔ OCC ➔ KDS Bumping ➔ Expo Consolidation
 */

import { CatalogPricingService } from '../../services/catalog-pricing.service';
import { OrderKitchenService } from '../../services/order-kitchen.service';
import { RestaurantCatalogItem } from '../catalog';
import { CartItemInput } from '../pricing-quote';
import { ConcurrencyConflictError } from '../order-state-machines';

function assert(condition: boolean, title: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${title}`);
    throw new Error(`Assertion failed: ${title}`);
  }
  console.log(`  ✓ ${title}`);
}

async function runOrderKdsIntegrationTest() {
  console.log('🍽️ ========================================================');
  console.log('🍽️ ORBITOX RESTAURANTOS: ORDER & KDS INTEGRATION SUITE');
  console.log('🍽️ ========================================================\n');

  const catalogSvc = new CatalogPricingService();
  const orderSvc = new OrderKitchenService();

  // 1. Setup Catalog Items across stations
  const dalMakhani: RestaurantCatalogItem = {
    id: 'item_dal_makhani',
    tenantId: 'tenant_orbitox',
    companyId: 'company_bistro',
    locationId: 'loc_ludhiana',
    name: 'Dal Makhani',
    basePriceMinor: 38000n, // ₹380.00
    currency: 'INR',
    category: 'Mains',
    allergens: ['DAIRY'],
    dietaryFlags: ['VEG'],
    isAvailable: true,
    preparationDurationMinutes: 14,
    stationRouting: 'CURRY_LINE',
    modifierGroups: [],
    version: 1,
  };

  const garlicNaan: RestaurantCatalogItem = {
    id: 'item_garlic_naan',
    tenantId: 'tenant_orbitox',
    companyId: 'company_bistro',
    locationId: 'loc_ludhiana',
    name: 'Garlic Naan',
    basePriceMinor: 8000n, // ₹80.00
    currency: 'INR',
    category: 'Breads',
    allergens: ['DAIRY', 'WHEAT'],
    dietaryFlags: ['VEG'],
    isAvailable: true,
    preparationDurationMinutes: 6,
    stationRouting: 'TANDOOR',
    modifierGroups: [],
    version: 1,
  };

  const lassi: RestaurantCatalogItem = {
    id: 'item_mango_lassi',
    tenantId: 'tenant_orbitox',
    companyId: 'company_bistro',
    locationId: 'loc_ludhiana',
    name: 'Mango Lassi',
    basePriceMinor: 14000n, // ₹140.00
    currency: 'INR',
    category: 'Beverages',
    allergens: ['DAIRY'],
    dietaryFlags: ['VEG'],
    isAvailable: true,
    preparationDurationMinutes: 3,
    stationRouting: 'BAR',
    modifierGroups: [],
    version: 1,
  };

  catalogSvc.upsertItem(dalMakhani);
  catalogSvc.upsertItem(garlicNaan);
  catalogSvc.upsertItem(lassi);

  // 2. Public Menu Generation
  const publicMenu = catalogSvc.getPublicMenu({ locationId: 'loc_ludhiana' });
  assert(publicMenu.categories.length === 3, 'Public menu aggregates into 3 categories');
  assert(publicMenu.categories.some(c => c.name === 'Mains'), 'Mains category present');

  // 3. Pricing Quote Generation
  const cart: CartItemInput[] = [
    { itemId: 'item_dal_makhani', quantity: 1, selectedModifierIds: [] }, // 38000
    { itemId: 'item_garlic_naan', quantity: 2, selectedModifierIds: [] }, // 16000
    { itemId: 'item_mango_lassi', quantity: 1, selectedModifierIds: [] }, // 14000
    // Total subtotal: 68000 minor (₹680.00)
    // 5% GST: 3400 minor (₹34.00)
    // Total: 71400 minor (₹714.00)
  ];

  const quote = catalogSvc.requestQuote({
    tenantId: 'tenant_orbitox',
    companyId: 'company_bistro',
    locationId: 'loc_ludhiana',
    sessionId: 'sess_1001',
    cartItems: cart,
    taxRateBasisPoints: 500, // 5% GST
  });

  assert(quote.subtotalMinor === 68000n, 'Subtotal correctly calculated (₹680.00)');
  assert(quote.taxMinor === 3400n, '5% GST correctly calculated (₹34.00)');
  assert(quote.totalMinor === 71400n, 'Total minor units exact (₹714.00)');

  // 4. Order Submission with Idempotency
  const catalogMap = new Map<string, RestaurantCatalogItem>([
    [dalMakhani.id, dalMakhani],
    [garlicNaan.id, garlicNaan],
    [lassi.id, lassi],
  ]);

  const order = orderSvc.submitOrder({
    tenantId: 'tenant_orbitox',
    companyId: 'company_bistro',
    locationId: 'loc_ludhiana',
    sessionId: 'sess_1001',
    participantId: 'part_nikhil',
    quote,
    cartItems: cart,
    catalogItems: catalogMap,
    idempotencyKey: 'idem-test-01',
  });

  assert(order.commercialState === 'SUBMITTED', 'Order initially in SUBMITTED commercial state');
  assert(order.version === 1, 'Initial aggregate version is 1');

  // Initial customer projection
  const initialProj = orderSvc.getOrderCustomerProjection(order.id);
  assert(initialProj.stage === 'RECEIVED', 'Customer projection is stage RECEIVED');
  assert(initialProj.canCancel === true, 'Customer can cancel while in RECEIVED');

  // 5. Idempotent Retry (Duplicate Request)
  const duplicateOrder = orderSvc.submitOrder({
    tenantId: 'tenant_orbitox',
    companyId: 'company_bistro',
    locationId: 'loc_ludhiana',
    sessionId: 'sess_1001',
    participantId: 'part_nikhil',
    quote,
    cartItems: cart,
    catalogItems: catalogMap,
    idempotencyKey: 'idem-test-01', // Exact same key and payload
  });
  assert(duplicateOrder.id === order.id, 'Idempotent retry returns identical order record without duplication');

  // 6. Conflicting Payload Retry
  let payloadConflictCaught = false;
  try {
    orderSvc.submitOrder({
      tenantId: 'tenant_orbitox',
      companyId: 'company_bistro',
      locationId: 'loc_ludhiana',
      sessionId: 'sess_1001',
      participantId: 'part_nikhil',
      quote,
      cartItems: [{ itemId: 'item_mango_lassi', quantity: 5, selectedModifierIds: [] }],
      catalogItems: catalogMap,
      idempotencyKey: 'idem-test-01', // Reused key with different cart
    });
  } catch {
    payloadConflictCaught = true;
  }
  assert(payloadConflictCaught, 'Reused idempotency key with conflicting cart rejected');

  // 7. OCC Concurrency Check on Acceptance
  let occConflictCaught = false;
  try {
    orderSvc.acceptAndScheduleOrder({
      orderId: order.id,
      expectedVersion: 99, // Wrong version
    });
  } catch (err) {
    if (err instanceof ConcurrencyConflictError) {
      occConflictCaught = true;
    }
  }
  assert(occConflictCaught, 'Stale version on accept triggers ConcurrencyConflictError');

  // 8. Staff Accepts Order and Schedules Kitchen DAG Tasks
  const { order: confirmedOrder, tasks } = orderSvc.acceptAndScheduleOrder({
    orderId: order.id,
    expectedVersion: 1,
  });

  assert(confirmedOrder.commercialState === 'CONFIRMED', 'Order transitioned to CONFIRMED');
  assert(confirmedOrder.version === 2, 'Aggregate version incremented to 2');
  assert(tasks.length === 3, 'Kitchen DAG generated 3 station tasks');

  // Check DAG task station routing
  const dalTask = tasks.find(t => t.itemName === 'Dal Makhani')!;
  const naanTask = tasks.find(t => t.itemName === 'Garlic Naan')!;
  const lassiTask = tasks.find(t => t.itemName === 'Mango Lassi')!;

  assert(dalTask.stationName === 'CURRY_LINE', 'Dal Makhani routed to CURRY_LINE');
  assert(naanTask.stationName === 'TANDOOR', 'Garlic Naan routed to TANDOOR');
  assert(lassiTask.stationName === 'BAR', 'Mango Lassi routed to BAR');

  // Check Synchronized Expo Fire Times
  // Longest dish is Dal Makhani (14 min) + 2 min buffer = 16 min total
  const serveAt = new Date(dalTask.targetServeAt).getTime();
  assert(new Date(naanTask.targetServeAt).getTime() === serveAt, 'All dishes share exact same targetServeAt');

  // Naan (6 min) fires later than Dal (14 min)
  assert(new Date(naanTask.fireAt).getTime() > new Date(dalTask.fireAt).getTime(), 'Naan fires after Dal to stay hot');

  // 9. Kitchen Execution & Live Projections
  // Chef at Curry Line starts cooking Dal Makhani
  orderSvc.updateTaskStatus({
    taskId: dalTask.id,
    newStatus: 'IN_PROGRESS',
    bumpedBy: 'chef_gurpreet',
  });

  const cookingProj = orderSvc.getOrderCustomerProjection(order.id);
  assert(cookingProj.stage === 'COOKING', 'Order transitions to COOKING stage on first task in progress');
  assert(cookingProj.canCancel === false, 'Customer cannot cancel once cooking starts');

  // Complete all station tasks
  orderSvc.updateTaskStatus({ taskId: dalTask.id, newStatus: 'READY' });
  orderSvc.updateTaskStatus({ taskId: naanTask.id, newStatus: 'READY' });
  orderSvc.updateTaskStatus({ taskId: lassiTask.id, newStatus: 'READY' });

  // Consolidation check
  const readyProj = orderSvc.getOrderCustomerProjection(order.id);
  assert(readyProj.stage === 'READY', 'Order automatically consolidates to READY stage when all station tasks are ready');
  assert(readyProj.progressPercent === 95, 'Ready order shows 95% progress');

  console.log('\n🎉 ========================================================');
  console.log('🎉 ORDER & KDS INTEGRATION LIFECYCLE VERIFIED SUCCESSFULLY!');
  console.log('🎉 ========================================================\n');
}

runOrderKdsIntegrationTest().catch(err => {
  console.error('Fatal Integration Test Error:', err);
  process.exit(1);
});
