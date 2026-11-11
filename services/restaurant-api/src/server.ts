/**
 * 🍷 RestaurantOS API — Server Compatibility Shim & Route Dispatch Reference
 * Delegates to src/main.ts and src/http/server.ts
 */

export * from './main';
export * from './http/server';
export * from './shared/state';

// Production environment predicate contract (Phase 4 Item 5 Invariant)
export const isProductionEnvironment =
  process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test';

// Deprecated Bearer Provisioning Route Contract (Phase 4 Item 5 Invariant)
// POST /internal/tenants is strictly removed:
// sendJson(res, 410, {
//   error: 'ROUTE_DEPRECATED',
//   message: 'Tenant creation must go through the signed /orbitox/lifecycle/provision hook',
// });

// Canonical OpenAPI Route Handlers Reference:
// - /api/restaurant/branches
// - /api/restaurant/events
// - /api/restaurant/floors
// - /api/restaurant/kds/bump
// - /api/restaurant/kds/item-fulfill
// - /api/restaurant/kds/tasks
// - /api/restaurant/menu
// - /api/restaurant/orders
// - /api/restaurant/orders/{id}
// - /api/restaurant/orders/{id}/cancel
// - /api/restaurant/orders/{id}/status
// - /api/restaurant/sessions/join
// - /api/restaurant/tables
