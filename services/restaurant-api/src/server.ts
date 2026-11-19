/**
 * 🍷 RestaurantOS 2.x — Authoritative Runtime Plane
 * ─────────────────────────────────────────────────────────────────────────────
 * Port: 4010
 * Disjoint Domain Route Modules:
 * - /api/restaurant/menu (menu catalog, categories, items)
 * - /api/restaurant/orders (order placement, tracking, cancellation)
 * - /api/restaurant/sessions/join (diner seating session join & close)
 * - /api/restaurant/tables (spatial floor tables, settling, merge/unmerge)
 * - /api/restaurant/branches (multi-unit branch operations)
 * - /api/restaurant/floors (floor layout persistence)
 * - /api/restaurant/kds (kitchen display system, tasks, item fulfillment, bump)
 * - /api/restaurant/kds/tasks (kitchen task queues)
 * - /api/restaurant/kds/item-fulfill (task item completion)
 * - /api/restaurant/kds/bump (task state progression)
 * - /api/restaurant/events (realtime SSE stream & event outbox)
 * - /api/restaurant/payments (gateway checkout & refund governance)
 * - /api/restaurant/invoices (GST compliant invoicing)
 * - /api/restaurant/domains (custom domain TLS gatekeeper)
 * - /orbitox/lifecycle (signed control plane lifecycle hooks)
 * - /orbitox/data-rights (GDPR / DPDP data export & erasure saga)
 */

export * from './http/server';
export * from './main';

export const isProductionEnvironment =
  process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test';

// Legacy deprecated route invariant: POST /internal/tenants returns 410 ROUTE_DEPRECATED
// sendJson(res, 410, {
//   error: 'ROUTE_DEPRECATED',
//   message: 'Tenant provisioning via /internal/tenants has been deleted. Tenant creation must go through the signed /orbitox/lifecycle/provision hook.',
// });

import { startServer } from './main';

if (require.main === module) {
  startServer();
}
