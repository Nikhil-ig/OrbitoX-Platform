/**
 * 🪐 OrbitoX POS Plugin Specification
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative OrbitoXPlugin implementation for restaurant POS, quoting,
 * order lifecycle, kitchen DAG, and dining sessions.
 */

import {
  defineOrbitoXPlugin,
  OrbitoXPlugin,
  PluginRequestContext,
  PluginClock,
} from '@orbitox-io/plugin-engine';
import { PosRepository } from './domain/pos-repository';
import { PosService } from './services/pos.service';
import { PricingEngine } from './domain/pricing-quote';
import { OrderStateMachine } from './domain/order-state-machines';
import { KitchenDagScheduler } from './domain/kitchen-dag';
import { QRTrustEngine } from './domain/qr-trust';
import { IdempotencyEngine } from './domain/idempotency-outbox';

export interface PosDomain {
  PricingEngine: typeof PricingEngine;
  OrderStateMachine: typeof OrderStateMachine;
  KitchenDagScheduler: typeof KitchenDagScheduler;
  QRTrustEngine: typeof QRTrustEngine;
  IdempotencyEngine: typeof IdempotencyEngine;
}

export const posPlugin: OrbitoXPlugin<PosDomain, PosService, PosRepository> = defineOrbitoXPlugin<
  PosDomain,
  PosService,
  PosRepository
>({
  manifest: {
    id: '@orbitox/pos',
    name: 'pos',
    displayName: 'OrbitoX POS & Kitchen Engine',
    version: '0.1.0',
    description: 'Authoritative Point of Sale, Deterministic Pricing, Kitchen DAG, and Session Engine',
    entitlements: {
      features: ['pos.orders', 'pos.kitchen', 'pos.quotes', 'pos.sessions'],
      quotas: [
        { key: 'pos.monthly_orders', defaultLimit: 10000, window: 'monthly' },
        { key: 'pos.tables_limit', defaultLimit: 100 },
      ],
    },
  },
  domain: {
    PricingEngine,
    OrderStateMachine,
    KitchenDagScheduler,
    QRTrustEngine,
    IdempotencyEngine,
  },
  service: (deps: { repository: PosRepository; clock: PluginClock; events?: any }) =>
    new PosService(deps.repository, deps.clock),
  routes: [
    {
      path: '/api/restaurant/quote',
      method: 'POST',
      entitlement: { feature: 'pos.quotes' },
      handler: async (ctx: PluginRequestContext<PosService>) => {
        const service = ctx.services;
        const result = await service.calculateQuote(ctx.body);
        return { status: 200, body: { success: true, data: result } };
      },
    },
    {
      path: '/api/restaurant/orders',
      method: 'POST',
      entitlement: { feature: 'pos.orders', quotaKey: 'pos.monthly_orders' },
      handler: async (ctx: PluginRequestContext<PosService>) => {
        const service = ctx.services;
        const idempotencyKey = (ctx.headers && ctx.headers['x-idempotency-key']) as string | undefined;
        const result = await service.submitOrder({
          body: ctx.body,
          identity: ctx.user,
          idempotencyKey,
        });
        return result;
      },
    },
    {
      path: '/api/restaurant/orders',
      method: 'GET',
      entitlement: { feature: 'pos.orders' },
      handler: async (ctx: PluginRequestContext<PosService>) => {
        const service = ctx.services;
        const orders = await service.listOrders(ctx.query || {});
        return { status: 200, body: { success: true, orders } };
      },
    },
    {
      path: '/api/restaurant/kds/tasks',
      method: 'GET',
      entitlement: { feature: 'pos.kitchen' },
      handler: async (ctx: PluginRequestContext<PosService>) => {
        const service = ctx.services;
        const tasks = await service.listKitchenTasks(ctx.query || {});
        return { status: 200, body: { success: true, tasks } };
      },
    },
  ],
});

/**
 * 1-Line plugin factory for host app composition
 */
export function pos(_options?: Record<string, any>): OrbitoXPlugin<PosDomain, PosService, PosRepository> {
  return posPlugin;
}
