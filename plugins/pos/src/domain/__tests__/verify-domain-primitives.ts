/**
 * 🧪 OrbitoX RestaurantOS - Phase 1 Domain Primitives Verification Suite
 * ─────────────────────────────────────────────────────────────
 * Validates financial minor-unit arithmetic, QR trust boundaries,
 * epoch revocation, hash-locked PricingQuotes, 4-state transitions,
 * customer projections, Kitchen DAG fire times, and idempotency logic.
 */

import { MoneyUtil } from '../money';
import { QRTrustEngine, DiningSession, SessionParticipant } from '../qr-trust';
import { RestaurantCatalogItem, AvailabilityEngine } from '../catalog';
import { PricingEngine, CartItemInput, PricingRules } from '../pricing-quote';
import { OrderStateMachine, ConcurrencyConflictError } from '../order-state-machines';
import { KitchenDagScheduler, OrderDishInput } from '../kitchen-dag';
import { IdempotencyEngine, PlatformIdempotencyRecord } from '../idempotency-outbox';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runPhase1Verification() {
  console.log('🍽️ ========================================================');
  console.log('🍽️ ORBITOX RESTAURANTOS - PHASE 1 VERIFICATION SUITE');
  console.log('🍽️ ========================================================\n');

  // ─────────────────────────────────────────────────────────
  // 1. MONEY & MINOR UNITS
  // ─────────────────────────────────────────────────────────
  console.log('📦 TEST SUITE 1: Minor-Unit Money Primitives (Zero Floating Point)');
  
  const m1 = MoneyUtil.fromMinor(45050n, 'INR');
  const m2 = MoneyUtil.fromMajor('450.50', 'INR');
  assert(m1.amountMinor === 45050n, 'fromMinor stores exact 64-bit bigint');
  assert(m2.amountMinor === 45050n, 'fromMajor parses decimal string without floating representation error');

  const sum = MoneyUtil.add(m1, m2);
  assert(sum.amountMinor === 90100n, 'Money addition is exact minor units (45050 + 45050 = 90100)');

  // 5% GST on ₹901.00 (90100 minor) = 4505 minor (₹45.05)
  const gst = MoneyUtil.applyBasisPoints(sum, 500); // 500 bps = 5%
  assert(gst.amountMinor === 4505n, 'Basis-point tax calculation with half-up rounding (5% of 90100 = 4505)');

  let currencyErrorCaught = false;
  try {
    MoneyUtil.add(m1, MoneyUtil.fromMinor(100n, 'USD'));
  } catch (err: any) {
    currencyErrorCaught = true;
  }
  assert(currencyErrorCaught, 'Currency mismatch throws fatal error');
  console.log('  ✅ Money primitives verified.\n');

  // ─────────────────────────────────────────────────────────
  // 2. QR TRUST, DISCOVERY & EPOCH REVOCATION
  // ─────────────────────────────────────────────────────────
  console.log('📦 TEST SUITE 2: QR Trust Model (SCAN ≠ JOIN & Epoch Revocation)');

  const mockActiveSession: DiningSession = {
    id: 'sess_1001',
    tenantId: 'tenant_orbitox',
    companyId: 'company_bistro',
    locationId: 'loc_ludhiana',
    tableId: 'tbl_14',
    sessionCode: 'S-1048',
    status: 'ACTIVE',
    joinPolicy: 'HOST_APPROVAL',
    accessEpoch: 1,
    version: 1,
    openedAt: new Date().toISOString(),
  };

  // Attack Scenario: Attacker scans QR from home or photo
  const discovery = QRTrustEngine.buildDiscoveryContext({
    restaurantName: 'OrbitoX Bistro',
    branchName: 'Ludhiana Main',
    serviceAreaName: 'Main Courtyard',
    tableNumber: 'T-14',
    capacity: 4,
    activeSession: mockActiveSession,
    locator: '7Kp9xQ8m2L',
  });

  // Verify SCAN ≠ JOIN: Zero session ID, zero guest names, zero active order data
  assert(discovery.hasActiveSession === true, 'Discovery reveals active dining session exists');
  assert((discovery as any).id === undefined, 'Discovery context DOES NOT leak sessionId');
  assert((discovery as any).participants === undefined, 'Discovery context DOES NOT leak participants');
  assert((discovery as any).orders === undefined, 'Discovery context DOES NOT leak orders');
  assert(discovery.joinPolicy === 'HOST_APPROVAL', 'Discovery conveys join policy requirement');

  // Issue legitimate capability token for Guest A
  const guestACapabilityToken = QRTrustEngine.issueCapabilityToken({
    tenantId: 'tenant_orbitox',
    companyId: 'company_bistro',
    locationId: 'loc_ludhiana',
    tableId: 'tbl_14',
    diningSessionId: mockActiveSession.id,
    participantId: 'part_nikhil',
    role: 'HOST',
    accessEpoch: mockActiveSession.accessEpoch,
  });

  const verifiedPayload = QRTrustEngine.verifyCapability(guestACapabilityToken, mockActiveSession);
  assert(verifiedPayload.participantId === 'part_nikhil', 'Guest capability signature successfully verified');
  assert(verifiedPayload.accessEpoch === 1, 'Guest capability bound to epoch 1');

  // Attack Scenario: Attacker attempts signature forgery
  let forgeryCaught = false;
  try {
    const forgedToken = guestACapabilityToken.slice(0, -4) + 'abcd';
    QRTrustEngine.verifyCapability(forgedToken, mockActiveSession);
  } catch {
    forgeryCaught = true;
  }
  assert(forgeryCaught, 'Cryptographically forged capability token rejected');

  // Revocation Scenario: Table is cleared / session closed -> accessEpoch increments
  const closedSession: DiningSession = {
    ...mockActiveSession,
    status: 'CLOSED',
    accessEpoch: 2, // Incremented on table turnover
  };

  let epochRevocationCaught = false;
  try {
    // Old diner tries to access closed session with old token
    QRTrustEngine.verifyCapability(guestACapabilityToken, closedSession);
  } catch (err: any) {
    epochRevocationCaught = true;
  }
  assert(epochRevocationCaught, 'Previous guest capability immediately rejected after session epoch increment');

  // Privacy Sanitization: Check participant projection excludes private fields
  const rawParticipants: SessionParticipant[] = [
    {
      id: 'part_nikhil',
      tenantId: 'tenant_orbitox',
      companyId: 'company_bistro',
      locationId: 'loc_ludhiana',
      diningSessionId: 'sess_1001',
      role: 'HOST',
      displayName: 'Nikhil',
      capabilityTokenHash: 'hash_secret_123',
      joinedAt: new Date().toISOString(),
      isActive: true,
    },
    {
      id: 'part_rahul',
      tenantId: 'tenant_orbitox',
      companyId: 'company_bistro',
      locationId: 'loc_ludhiana',
      diningSessionId: 'sess_1001',
      role: 'GUEST',
      displayName: 'Rahul',
      capabilityTokenHash: 'hash_secret_456',
      joinedAt: new Date().toISOString(),
      isActive: true,
    },
  ];

  const sanitized = QRTrustEngine.sanitizeParticipants(rawParticipants, 'part_nikhil');
  assert(sanitized.length === 2, '2 active participants sanitized');
  assert(sanitized[0]?.displayName === 'Nikhil' && sanitized[0]?.isYou === true, 'Identifies current diner');
  assert(sanitized[1]?.displayName === 'Rahul' && sanitized[1]?.isYou === false, 'Identifies companion diner');
  assert((sanitized[0] as any)?.capabilityTokenHash === undefined, 'Sanitized projection excludes capabilityTokenHash');
  console.log('  ✅ QR Trust and Privacy invariants verified.\n');

  // ─────────────────────────────────────────────────────────
  // 3. DETERMINISTIC PRICINGQUOTE ENGINE
  // ─────────────────────────────────────────────────────────
  console.log('📦 TEST SUITE 3: PricingQuote Engine (SHA-256 Hash-Locking)');

  const mockItem1: RestaurantCatalogItem = {
    id: 'item_paneer_tikka',
    tenantId: 'tenant_orbitox',
    companyId: 'company_bistro',
    locationId: 'loc_ludhiana',
    name: 'Paneer Tikka',
    basePriceMinor: 35000n, // ₹350.00
    currency: 'INR',
    category: 'Starters',
    allergens: ['DAIRY'],
    dietaryFlags: ['VEG'],
    isAvailable: true,
    preparationDurationMinutes: 12,
    stationRouting: 'TANDOOR',
    version: 1,
    modifierGroups: [
      {
        id: 'group_spice',
        tenantId: 'tenant_orbitox',
        companyId: 'company_bistro',
        itemId: 'item_paneer_tikka',
        name: 'Spice Level',
        minSelections: 1,
        maxSelections: 1,
        isRequired: true,
        modifiers: [
          {
            id: 'mod_extra_spicy',
            tenantId: 'tenant_orbitox',
            companyId: 'company_bistro',
            groupId: 'group_spice',
            name: 'Extra Spicy',
            priceDeltaMinor: 2000n, // +₹20.00
            isDefault: false,
            isAvailable: true,
          },
        ],
      },
    ],
  };

  const catalogMap = new Map<string, RestaurantCatalogItem>([[mockItem1.id, mockItem1]]);

  const cart: CartItemInput[] = [
    {
      itemId: 'item_paneer_tikka',
      quantity: 2,
      selectedModifierIds: ['mod_extra_spicy'], // 2 * (35000 + 2000) = 74000 minor (₹740.00)
    },
  ];

  const rules: PricingRules = {
    taxRateBasisPoints: 500, // 5% GST = 3700 minor (₹37.00)
    taxLabel: 'GST (5%)',
    serviceFeeBasisPoints: 500, // 5% Service = 3700 minor (₹37.00)
    serviceFeeLabel: 'Service Charge (5%)',
    quoteTtlSeconds: 120,
  };

  const quote = PricingEngine.calculateQuote({
    tenantId: 'tenant_orbitox',
    companyId: 'company_bistro',
    locationId: 'loc_ludhiana',
    sessionId: 'sess_1001',
    cartItems: cart,
    catalogItems: catalogMap,
    rules,
  });

  assert(quote.subtotalMinor === 74000n, 'Subtotal correctly calculated (2 * 37000 = 74000)');
  assert(quote.taxMinor === 3700n, '5% tax correctly calculated (3700 minor)');
  assert(quote.serviceFeeMinor === 3700n, '5% service fee correctly calculated (3700 minor)');
  assert(quote.totalMinor === 81400n, 'Total is exact sum (74000 + 3700 + 3700 = 81400 minor)');

  // Verify Quote against identical cart
  const quoteCheck = PricingEngine.verifyQuote(quote, cart);
  assert(quoteCheck.valid === true, 'Quote verification succeeds for authentic cart');

  // Attack Scenario: Attacker tampers cart items after quote generation
  const tamperedCart: CartItemInput[] = [
    {
      itemId: 'item_paneer_tikka',
      quantity: 3, // Changed from 2 to 3
      selectedModifierIds: ['mod_extra_spicy'],
    },
  ];
  const tamperedCheck = PricingEngine.verifyQuote(quote, tamperedCart);
  assert(tamperedCheck.valid === false, 'Tampered cart quantity triggers input hash mismatch');

  // Attack Scenario: Attacker modifies total amount in quote
  const tamperedQuote = { ...quote, totalMinor: 1000n }; // Tries to pay ₹10 instead of ₹814
  const tamperedTotalCheck = PricingEngine.verifyQuote(tamperedQuote, cart);
  assert(tamperedTotalCheck.valid === false, 'Tampered total triggers result hash mismatch');
  console.log('  ✅ PricingQuote hash-locking verified.\n');

  // ─────────────────────────────────────────────────────────
  // 4. 4-DIMENSION ORDER STATE MACHINES & OCC
  // ─────────────────────────────────────────────────────────
  console.log('📦 TEST SUITE 4: 4-Dimension Order State Machines & OCC');

  // Valid transitions
  OrderStateMachine.validateCommercialTransition('DRAFT', 'SUBMITTED');
  OrderStateMachine.validateCommercialTransition('SUBMITTED', 'CONFIRMED');
  OrderStateMachine.validateCommercialTransition('CONFIRMED', 'VOIDED');

  let invalidTransitionCaught = false;
  try {
    OrderStateMachine.validateCommercialTransition('CONFIRMED', 'DRAFT');
  } catch {
    invalidTransitionCaught = true;
  }
  assert(invalidTransitionCaught, 'Illegal transition CONFIRMED -> DRAFT rejected');

  // Optimistic Concurrency Control (OCC)
  let occConflictCaught = false;
  try {
    OrderStateMachine.assertVersionMatch('ord_1001', 3, 2); // DB is v3, caller expects v2
  } catch (err: any) {
    if (err instanceof ConcurrencyConflictError) {
      occConflictCaught = true;
    }
  }
  assert(occConflictCaught, 'Stale aggregate update correctly throws ConcurrencyConflictError');

  // Customer Visibility Projections
  const projSubmitted = OrderStateMachine.deriveCustomerProjection({
    commercial: 'SUBMITTED',
    fulfillment: 'UNFULFILLED',
    payment: 'UNPAID',
    kitchen: 'QUEUED',
  });
  assert(projSubmitted.stage === 'RECEIVED', 'SUBMITTED projects to RECEIVED stage');
  assert(projSubmitted.canCancel === true, 'Customer can cancel in RECEIVED stage');

  const projCooking = OrderStateMachine.deriveCustomerProjection({
    commercial: 'CONFIRMED',
    fulfillment: 'PREPARING',
    payment: 'UNPAID',
    kitchen: 'IN_PROGRESS',
  });
  assert(projCooking.stage === 'COOKING', 'IN_PROGRESS projects to COOKING stage');
  assert(projCooking.progressPercent === 65, 'Cooking shows 65% progress');
  assert(projCooking.canCancel === false, 'Cannot cancel once kitchen starts cooking');

  const projReady = OrderStateMachine.deriveCustomerProjection({
    commercial: 'CONFIRMED',
    fulfillment: 'READY_TO_SERVE',
    payment: 'UNPAID',
    kitchen: 'COMPLETED',
  });
  assert(projReady.stage === 'READY', 'READY_TO_SERVE projects to READY stage');
  console.log('  ✅ 4-State order transitions, OCC, and projections verified.\n');

  // ─────────────────────────────────────────────────────────
  // 5. KITCHEN PREPARATION DAG SCHEDULER
  // ─────────────────────────────────────────────────────────
  console.log('📦 TEST SUITE 5: Kitchen Preparation DAG Scheduler (Synchronized Expo Arrival)');

  const orderSubmissionTime = new Date('2026-10-07T19:00:00.000Z');
  const dishes: OrderDishInput[] = [
    {
      orderItemId: 'oi_1',
      itemName: 'Tandoori Sizzler',
      quantity: 1,
      stationId: 'st_tandoor',
      stationName: 'Tandoor Station',
      estimatedDurationMinutes: 16, // Longest dish (16 mins)
    },
    {
      orderItemId: 'oi_2',
      itemName: 'Butter Naan',
      quantity: 2,
      stationId: 'st_tandoor',
      stationName: 'Tandoor Station',
      estimatedDurationMinutes: 6, // 6 mins
    },
    {
      orderItemId: 'oi_3',
      itemName: 'Mojito Cocktail',
      quantity: 1,
      stationId: 'st_bar',
      stationName: 'Bar Station',
      estimatedDurationMinutes: 2, // 2 mins
    },
  ];

  const tasks = KitchenDagScheduler.scheduleOrder({
    tenantId: 'tenant_orbitox',
    companyId: 'company_bistro',
    locationId: 'loc_ludhiana',
    orderId: 'ord_1001',
    dishes,
    orderConfirmedAt: orderSubmissionTime,
    expoBufferMinutes: 2, // 2 min plating buffer
  });

  // Max duration is 16 mins + 2 buffer = Target Serve is 19:18:00
  const sizzler = tasks.find(t => t.itemName === 'Tandoori Sizzler')!;
  const naan = tasks.find(t => t.itemName === 'Butter Naan')!;
  const mojito = tasks.find(t => t.itemName === 'Mojito Cocktail')!;

  assert(sizzler.targetServeAt === '2026-10-07T19:18:00.000Z', 'Synchronized target serve at 19:18:00');
  assert(naan.targetServeAt === '2026-10-07T19:18:00.000Z', 'All dishes share exact same targetServeAt');

  // Fire times:
  // Sizzler: 19:18 - 16 min = 19:02:00
  // Naan:    19:18 - 6 min  = 19:12:00
  // Mojito:  19:18 - 2 min  = 19:16:00
  assert(sizzler.fireAt === '2026-10-07T19:02:00.000Z', 'Tandoori Sizzler fires at 19:02');
  assert(naan.fireAt === '2026-10-07T19:12:00.000Z', 'Naan fires at 19:12 (does not get cold)');
  assert(mojito.fireAt === '2026-10-07T19:16:00.000Z', 'Mojito fires at 19:16 (ice does not melt)');

  // Queue sorting test
  const sorted = KitchenDagScheduler.sortKdsQueue(tasks);
  assert(sorted[0]?.itemName === 'Tandoori Sizzler', 'First fired task is prioritized at top of KDS');
  console.log('  ✅ Kitchen DAG Scheduler verified.\n');

  // ─────────────────────────────────────────────────────────
  // 6. DURABLE IDEMPOTENCY ENGINE
  // ─────────────────────────────────────────────────────────
  console.log('📦 TEST SUITE 6: Durable Idempotency Deduplication');

  const payload = { quoteId: quote.quoteId, specialInstructions: 'No onions' };

  // Case 1: First request
  const check1 = IdempotencyEngine.evaluate(null, payload);
  assert(check1.status === 'NEW', 'First request evaluates to NEW');

  // Save record
  const savedRecord = IdempotencyEngine.createRecord({
    tenantId: 'tenant_orbitox',
    key: 'idemp_key_9999',
    scope: 'POST /api/v1/orders',
    payload,
    responseStatus: 201,
    responseBody: { orderId: 'ord_1001', status: 'CONFIRMED' },
  });

  // Case 2: Duplicate request with identical payload (Network retry)
  const check2 = IdempotencyEngine.evaluate(savedRecord, payload);
  assert(check2.status === 'CACHED_HIT', 'Network retry returns CACHED_HIT');
  if (check2.status === 'CACHED_HIT') {
    assert(check2.responseBody.orderId === 'ord_1001', 'Returns original cached response body');
  }

  // Case 3: Replayed key with different payload (Illegal collision)
  const differentPayload = { quoteId: quote.quoteId, specialInstructions: 'Extra cheese' };
  const check3 = IdempotencyEngine.evaluate(savedRecord, differentPayload);
  assert(check3.status === 'CONFLICT_PAYLOAD_MISMATCH', 'Key collision with different body returns CONFLICT_PAYLOAD_MISMATCH');
  console.log('  ✅ Idempotency deduplication verified.\n');

  console.log('🎉 ========================================================');
  console.log('🎉 ALL PHASE 1 DOMAIN PRIMITIVES VERIFIED SUCCESSFULLY!');
  console.log('🎉 ========================================================\n');
}

runPhase1Verification().catch(err => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
