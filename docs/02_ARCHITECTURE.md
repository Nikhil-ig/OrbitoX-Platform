# 🏛️ Step 2: Platform Architecture & Kernel

This guide explains the core engine powering all of OrbitoX: the `orbitox` Singleton, the `ServiceContainer` kernel, and how every facade safely shares a single instance of each service.

---

## 🏛️ Full Architecture Overview

```mermaid
graph TB
    YourCode["📦 Your Application Code"] -->|One Import| Singleton

    subgraph Singleton ["🪐 orbitox Singleton — Developer API"]
        direction LR
        SecF["🛡️ orbitox.security"]
        CtxF["🏢 orbitox.context"]
        AudF["📋 orbitox.audit"]
        EvtF["⚡ orbitox.events"]
        FeaF["🚩 orbitox.features"]
        AIF["🤖 orbitox.ai"]
        WkfF["📦 orbitox.workflows"]
        BilF["💳 orbitox.billing"]
        DbF["🗄️ orbitox.db"]
    end

    subgraph SC ["⚙️ ServiceContainer — Shared Kernel (Singleton Pattern)"]
        direction TB
        RbacSvc["RbacService"]
        PolicyEng["PolicyEngine (ABAC)"]
        CtxSvc["ContextService"]
        AuditSvc["AuditService"]
        EvtBus["EventBusService"]
        FlagSvc["FeatureFlagService"]
        AIGw["AIGateway"]
        PlanSvc["PlanService"]
    end

    subgraph Infra ["🔌 Infrastructure"]
        Redis[("🗄️ Redis / BullMQ")]
        InMem["📍 In-Memory Fallback"]
        OpenAI["🤖 OpenAI API"]
        Gemini["💎 Gemini API"]
        DB[("🗃️ Database")]
    end

    Singleton --> SC
    SC --> Infra
```

---

## 💡 Why a Singleton Kernel Matters

> [!IMPORTANT]
> Without the `ServiceContainer`, calling `orbitox.security` and `orbitox.features` would each create **separate copies** of `ContextService`. A context node created via `orbitox.context` would be **invisible** to `orbitox.features`. The singleton kernel fixes this permanently.

```mermaid
graph LR
    subgraph Wrong ["❌ Old Pattern — Multiple Instances (Causes Bugs)"]
        A1["security.ContextService Instance A"] 
        A2["features.ContextService Instance B"]
        A3["audit.ContextService Instance C"]
    end

    subgraph Right ["✅ OrbitoX Pattern — Single Shared Kernel"]
        B1["security"] --> SC1["ContextService (One Instance)"]
        B2["features"] --> SC1
        B3["audit"] --> SC1
    end
```

---

## 📊 Facade API Quick Reference Matrix

| Facade | Namespace / Helper | Primary Purpose | Key Methods | Return Type |
| :--- | :--- | :--- | :--- | :--- |
| 🛡️ **Security** | `orbitox.security` | Zero-Trust Authorization & Isolation | `authorize()`, `check()`, `policy()`, `getVisibilityClause()`, `sanitizeWritePayload()`, `enforceContextBoundary()` | `Promise<boolean>` / `PolicyBuilder` / `object` |
| 🗄️ **Database** | `orbitox.db` | Universal Database Adapter (Prisma, Drizzle, Mongo) | `useAdapter()`, `getAdapter()`, `findMany()`, `findById()`, `create()`, `update()`, `delete()`, `ping()` | `DatabaseQueryResult` / `Promise<T>` / `this` |
| 🏢 **Context** | `orbitox.context` | Multi-Tenancy & Inter-Branch Mesh | `create()`, `get()`, `ancestors()`, `children()`, `linkPeers()`, `canPeerAccess()`, `getAccessiblePeerContexts()` | `Context` / `Context[]` / `boolean` |
| 🏗️ **Tenant Builder** | `orbitox.tenant()` | Ultra-Easy Fluent Context CRUD | `parent()`, `owner()`, `settings()`, `subscribe()`, `enableFeature()`, `linkPeer()`, `create()`, `get()`, `update()`, `delete()` | `TenantBuilder` / `Promise<Context>` |
| 📋 **Audit** | `orbitox.audit` | Hash-Chained Audit Trail | `created()`, `updated()`, `deleted()`, `log()`, `verifyChain()` | `Promise<AuditEvent>` / `IntegrityResult` |
| ⚡ **Events** | `orbitox.events` | Distributed Event Bus | `emit()`, `on()`, `onAny()` | `Promise<void>` |
| 🚩 **Features** | `orbitox.features` | Contextual Flag Overrides | `define()`, `isEnabled()`, `setOverride()` | `Promise<boolean>` |
| 🤖 **AI Gateway**| `orbitox.ai` | Multi-Provider LLMs | `ask()`, `extract()`, `classify()`, `embed()` | `Promise<string / object>` |
| 📦 **Workflows** | `orbitox.workflows` | Automated Trigger Pipeline | `build()`, `define()`, `trigger()` | `WorkflowBuilder` / `Promise<void>` |
| 💳 **Billing** | `orbitox.billing` | Plans & Subscriptions | `buildPlan()`, `createPlan()`, `listPlans()`, `hasEntitlement()`, `checkQuota()` | `PlanBuilder` / `Promise<Plan[]>` / `boolean` |
| 🔌 **Middleware**| `orbitox.middleware()`| Domain & Header Protection | `middleware({ strictDomainProtection: true })` | `Express/Fastify Handler` |
| 🧩 **Plugins** | `orbitox.use()` | Platform Extension System | `use({ id, name, install })` | `this` (Chainable) |

---

## ⚙️ How `ServiceContainer` Works Under the Hood

```typescript
// service-container.ts (simplified)

export class ServiceContainer {
  private static instance: ServiceContainer;

  // Shared, lazily-initialized services
  readonly rbacService: RbacService;
  readonly policyEngine: PolicyEngine;
  readonly contextService: ContextService;
  readonly auditService: AuditService;
  readonly eventBusService: EventBusService;

  private constructor(config: OrbitoXConfig) {
    // Build services once, shared forever
    this.contextService = new ContextService();
    this.rbacService    = new RbacService(this.contextService);
    this.policyEngine   = new PolicyEngine();
    this.auditService   = new AuditService();
    this.eventBusService = config.redis
      ? new BullMQEventBus(config.redis) // Redis distributed
      : new InMemoryEventBus();           // Fallback
  }

  // Returns existing instance or creates on first call
  static shared(): ServiceContainer { ... }

  // Resets & recreates everything (called by orbitox.configure())
  static reset(config: OrbitoXConfig): ServiceContainer { ... }
}
```

---

## 🔄 Initialization Sequence (What `orbitox.configure()` Does)

```mermaid
sequenceDiagram
    participant App
    participant Singleton as orbitox Singleton
    participant SC as ServiceContainer
    participant Services

    App->>Singleton: orbitox.configure({ mode: 'strict', redis: {...} })
    Singleton->>SC: ServiceContainer.reset(config)
    SC->>Services: new ContextService()
    SC->>Services: new RbacService(contextService)
    SC->>Services: new PolicyEngine()
    SC->>Services: detect Redis → new BullMQEventBus(redis)
    SC-->>Singleton: Shared container ready
    Singleton-->>App: Configured & Ready
```

---

[⬅️ Prev: Getting Started](./01_GETTING_STARTED.md) | [Back to Index](./README.md) | [Next: Multi-Tenancy Graph ➔](./03_MULTI_TENANCY.md)
