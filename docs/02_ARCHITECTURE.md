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

| Facade | Namespace | Primary Purpose | Key Methods | Return Type |
| :--- | :--- | :--- | :--- | :--- |
| 🛡️ **Security** | `orbitox.security` | Zero-Trust Authorization | `authorize()`, `check()`, `checkMany()`, `addAbacPolicy()`, `addPolicy()`, `getVisibilityClause()` | `boolean` / throws |
| 🏢 **Context** | `orbitox.context` | Multi-Tenancy Graph | `create()`, `get()`, `ancestors()`, `children()` | `Context` / `Context[]` |
| 📋 **Audit** | `orbitox.audit` | Hash-Chained Audit Trail | `created()`, `updated()`, `deleted()`, `log()` | `Promise<AuditEvent>` |
| ⚡ **Events** | `orbitox.events` | Distributed Event Bus | `emit()`, `on()`, `onAny()` | `Promise<void>` |
| 🚩 **Features** | `orbitox.features` | Contextual Flag Overrides | `define()`, `isEnabled()`, `setOverride()` | `Promise<boolean>` |
| 🤖 **AI Gateway**| `orbitox.ai` | Multi-Provider LLMs | `ask()`, `extract()`, `classify()`, `embed()` | `Promise<string / object>` |
| 📦 **Workflows** | `orbitox.workflows` | Automated Trigger Pipeline | `define()`, `trigger()` | `Promise<void>` |
| 💳 **Billing** | `orbitox.billing` | Plans & Subscriptions | `createPlan()`, `listPlans()`, `subscribeContext()`, `hasEntitlement()`, `checkQuota()` | `Promise<Plan[]>` / `boolean` / `Quota` |
| 🔌 **Plugins** | `orbitox.use()` | Platform Extension System | `use({ id, name, install })` | `this` (Chainable) |

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
