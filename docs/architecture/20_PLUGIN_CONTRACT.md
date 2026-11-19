# 🪐 OrbitoX Plugin Contract Specification (`docs/20_PLUGIN_CONTRACT.md`)

> **The definitive architectural standard for modular SaaS plugins in OrbitoX.**  
> Inspired by Medusa's proven architecture: **Modules + Workflows + Providers**.

---

## 1. 🌟 Architectural Scope & Core Philosophy

The primary promise of the OrbitoX SaaS operating system is:
> *"If I want to create a restaurant SaaS, everything (logic, features) is already there. Just use the plugin/package, connect it to my platform, get data, and ship fast. The next SaaS (hospital, school, CRM...) is built the same way."*

To realize this vision without code duplication or vendor lock-in, every business domain plugin (e.g. `@orbitox/pos`, `@orbitox/crm`, `@orbitox/hms`, `@orbitox/commerce`) must strictly adhere to the **OrbitoX Plugin Contract**.

### The 6 Architectural Pillars
```
┌────────────────────────────────────────────────────────────────────────┐
│                          OrbitoXPlugin<TD, TS, TR>                     │
├───────────────────┬────────────────────────────────────────────────────┤
│ 1. Manifest       │ Identity, version, entitlements, quotas, & events  │
│ 2. Domain         │ Pure business logic (zero IO, zero DB, zero HTTP)  │
│ 3. Service        │ Business workflows with injected Repository & Clock│
│ 4. Routes         │ Framework-agnostic HTTP handler map                │
│ 5. Events         │ Reactive event publishers and subscribers          │
│ 6. Migrations     │ Declarative database / state migrations            │
└───────────────────┴────────────────────────────────────────────────────┘
```

---

## 2. 📦 Plugin Manifest Contract

Every plugin defines a strictly validated manifest declaring its metadata, permissions, and entitlements.

```typescript
export interface PluginQuotas {
  key: string;
  defaultLimit?: number;
  window?: 'daily' | 'monthly';
  description?: string;
}

export interface PluginEntitlements {
  features: string[];
  quotas?: PluginQuotas[];
}

export interface PluginManifestContract {
  id: string;               // Unique slug (e.g., 'pos', 'crm')
  name: string;             // Package name (e.g., '@orbitox/pos')
  version: string;          // Semver (e.g., '1.0.0')
  displayName: string;      // Human-readable title
  description?: string;
  author?: string;
  entitlements: PluginEntitlements;
  events?: {
    emits?: string[];
    subscribes?: string[];
  };
  migrations?: PluginMigration[];
}
```

---

## 3. 🧠 Domain Layer: Pure Business Logic

The `domain` layer contains **pure functions only**.
- **No I/O**: No file system access, no database queries, no HTTP requests.
- **Deterministic**: Given identical inputs, always returns identical outputs.
- **Easily Tested**: 100% unit-testable without mocks or external containers.

### Example: POS Domain
```typescript
export interface PosDomain {
  calculateOrderQuote: (items: OrderItem[], taxRate: number) => PricingQuote;
  validateTransition: (current: OrderStatus, next: OrderStatus) => boolean;
  compileKitchenDag: (items: OrderItem[]) => KitchenTaskGraph;
}
```

---

## 4. ⚙️ Service Layer: Injected Repository & Clock

The `service` layer coordinates business workflows by interacting with external state through **Dependency Injection**:
- **`repository`**: The storage interface supplied by the host application (Prisma, PostgreSQL, In-Memory).
- **`clock`**: Provides the current time (`clock.now()`, `clock.iso()`), enabling deterministic testing.
- **`events`**: Event publisher for reactive notifications.

```typescript
export interface PosServiceDependencies {
  repository: PosRepository;
  clock: PluginClock;
  events?: EventBus;
}

export class HeadlessPosService {
  constructor(private readonly deps: PosServiceDependencies) {}

  async submitOrder(tenantId: string, orderData: SubmitOrderInput): Promise<OrderResult> {
    // 1. Calculate pricing quote using pure domain logic
    const quote = posDomain.calculateOrderQuote(orderData.items, 0.05);

    // 2. Persist order using injected tenant-scoped repository
    const order = await this.deps.repository.saveOrder(tenantId, {
      ...orderData,
      quote,
      createdAt: this.deps.clock.iso(),
    });

    // 3. Emit platform event
    await this.deps.events?.emit('order.created', { tenantId, orderId: order.id });

    return order;
  }
}
```

---

## 5. 🌐 Routes: Framework-Agnostic Handler Map

Plugins declare HTTP endpoints using a framework-agnostic definition. The host runtime compiles these routes into Express, Connect, Fastify, or Next.js API routes without modifying plugin code.

### Route Definition Interface
```typescript
export interface PluginRouteDefinition<TServices = any> {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  handler: (ctx: PluginRequestContext<TServices>) => Promise<PluginResponse | any> | any;
  requiresAuth?: boolean;
  scopes?: string[];
  entitlement?: {
    feature?: string;
    quotaKey?: string;
  };
  rateLimitPerMin?: number;
  description?: string;
}
```

### Context Provided to Route Handlers
```typescript
export interface PluginRequestContext<TServices = any> {
  tenantId: string;
  tenant?: TenantConfig;
  params: Record<string, string>;
  query: Record<string, any>;
  body: any;
  headers: Record<string, string | string[] | undefined>;
  services: TServices;
  user?: {
    id: string;
    roles?: string[];
    tenantId?: string;
  };
  entitlements?: {
    hasFeature: (featureName: string) => boolean;
  };
}
```

---

## 6. 🚀 Authoring a Plugin (`defineOrbitoXPlugin`)

```typescript
import { defineOrbitoXPlugin } from '@orbitox-io/plugin-engine';

export const posPlugin = defineOrbitoXPlugin({
  manifest: {
    id: 'pos',
    name: '@orbitox/pos',
    version: '1.0.0',
    displayName: 'Point of Sale Engine',
    entitlements: {
      features: ['pos.quote', 'pos.orders', 'pos.kds', 'dine_qr'],
      quotas: [{ key: 'orders_monthly', defaultLimit: 10000 }],
    },
    events: {
      emits: ['pos.order_placed', 'pos.payment_settled'],
      subscribes: ['billing.invoice_paid'],
    },
  },
  domain: posDomain,
  service: ({ repository, clock, events }) => new HeadlessPosService({ repository, clock, events }),
  routes: [
    {
      path: '/api/restaurant/quote',
      method: 'POST',
      handler: (ctx) => ctx.services.calculateQuote(ctx.body),
    },
    {
      path: '/api/restaurant/orders',
      method: 'POST',
      requiresAuth: true,
      scopes: ['pos.orders.write'],
      entitlement: { feature: 'pos.orders' },
      handler: (ctx) => ctx.services.submitOrder(ctx.tenantId, ctx.body),
    },
  ],
  migrations: [
    {
      id: '20261025_pos_schema_init',
      up: async (ctx) => {
        await ctx.executeMigrationSql('CREATE TABLE IF NOT EXISTS pos_orders (...)');
      },
    },
  ],
});
```

---

## 7. 🔌 Loading & Compiling in Host Applications

The host application uses `PluginContractLoader` to wire storage, resolve tenancy, and attach route handlers:

```typescript
import express from 'express';
import { PluginContractLoader } from '@orbitox-io/plugin-engine';
import { posPlugin } from '@orbitox/pos';
import { PrismaPosRepository } from './repositories/prisma-pos.repository';

const app = express();
app.use(express.json());

// 1. Wire the plugin with host repository and clock
const loadedPos = PluginContractLoader.loadPlugin(posPlugin, {
  repositories: {
    pos: new PrismaPosRepository(prisma),
  },
});

// 2. Compile framework-agnostic routes into Express router
const posRouter = PluginContractLoader.compileExpressRouter(loadedPos);
app.use(posRouter);

app.listen(4010, () => console.log('SaaS running on port 4010'));
```

---

## 8. 🛡️ Automatic Enforcement Matrix

When routes are compiled by `PluginContractLoader`, the runtime automatically enforces:
1. **Tenant Resolution**: Reads `req.tenant` / `req.tenantSession` or extracts `x-tenant-id` header.
2. **Authentication Guard**: Rejects unauthenticated callers with `HTTP 401 UNAUTHORIZED` if `requiresAuth: true`.
3. **RBAC Scope Guard**: Validates caller has required permissions; rejects with `HTTP 403 FORBIDDEN` if scopes are missing.
4. **Entitlement Guard**: Validates tenant is entitled to the requested feature key; rejects with `HTTP 403 FEATURE_NOT_ENTITLED` if the tenant plan does not include the feature.
5. **Format Harmonization**: Handles both raw JSON and structured `{ status, headers, body }` responses.
