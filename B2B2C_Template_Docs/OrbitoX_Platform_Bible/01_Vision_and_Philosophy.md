# Part 01 — Vision & Philosophy
### *Why OrbitoX Exists and How Engineers Must Think*

---

## The Problem We Are Solving

Every software company that builds enterprise SaaS eventually reaches the same painful realization:

> **They have built the same Auth system five times.**
> **They have built the same notification engine eight times.**
> **They have built the same dashboard twelve times.**
> **They have re-solved multi-tenancy with every new product.**

This is not engineering. This is repetition.

The cost of this repetition is measured not only in developer-hours, but in:

- **Inconsistency** — five Auth systems with five different security postures
- **Maintenance debt** — a bug in Auth must be fixed five times
- **Slow velocity** — every new SaaS starts from zero
- **Fragility** — each system is its own island, impossible to combine
- **Inability to sell** — when a customer asks "can your hospital system integrate with your HR system?", the answer is "we'll need 6 months"

OrbitoX was created to eliminate this permanently.

---

## The Vision

**OrbitoX is a Platform Operating System.**

Just as Windows is not a word processor — it is the OS that runs Microsoft Word — OrbitoX is not a CRM. It is the OS that runs CRM, ERP, HMS, HRMS, Restaurant POS, School Management, and any future SaaS without re-solving the foundational problems each time.

```
Operating System Analogy

Windows (OS)           →   OrbitoX (Platform OS)
Microsoft Word         →   CRM Plugin
Microsoft Excel        →   Inventory Plugin
Microsoft Teams        →   Communication Plugin
Microsoft Outlook      →   Notification Plugin
Windows Store          →   OrbitoX Marketplace
```

The OS handles:
- Memory management (multi-tenancy / context isolation)
- Security (authentication, RBAC, encryption)
- Filesystem (storage, files, exports)
- Networking (API gateway, event bus)
- Display (theme engine, dynamic UI)
- Process management (plugin lifecycle)

The applications (plugins) only worry about their domain logic.

---

## Philosophy: The Five Big Ideas

### 1. Configuration Over Code

Before writing a single line of code, always ask:

> "Can this be a configuration instead of code?"

If the answer is **yes**, store it as configuration.

| Usually Coded | Must Be Configuration |
|---------------|----------------------|
| Menu items | ✅ Plugin registers menus |
| Form fields | ✅ Metadata-driven forms |
| Table columns | ✅ Dynamic table definitions |
| Role names | ✅ Stored in database |
| Workflows | ✅ JSON workflow definitions |
| Themes/colors | ✅ Per-context theme tokens |
| Reports | ✅ Report builder metadata |
| Permissions | ✅ Permission registry |
| Feature toggles | ✅ Feature flag engine |
| Dashboard widgets | ✅ Widget registry |

The moment you hardcode any of the above, you have created a wall that blocks a future customer from customizing it without a code deployment.

---

### 2. Everything Is a Context

The traditional SaaS model thinks in tiers:

```
Platform → Organization → Tenant → Branch → User
```

This breaks when you encounter:

- A marketplace (vendors selling to customers)
- A franchise (master → regional → local)
- A hospital with multiple departments, each with sub-units
- A government hierarchy (federal → state → district → citizen)
- A university (university → faculty → department → student)

OrbitoX thinks in **Contexts**:

```
Every node in the hierarchy is a Context.

A Context has:
  - An ID
  - A Type (Organization, Tenant, Branch, Vendor, Hospital, School...)
  - A Parent Context
  - Plugins (which capabilities are active)
  - Configuration (theme, locale, settings)
  - Permissions
  - Billing
  - Data Scope

The hierarchy is a graph, not a fixed 5-tier ladder.
```

This single abstraction supports every business model — B2B, B2C, C2C, marketplace, franchise, government — without changing the platform architecture.

---

### 3. Everything Is a Plugin

The platform core is **domain-agnostic**.

The platform core does not know what a "Lead" is.
The platform core does not know what an "Invoice" looks like.
The platform core does not know what a "Prescription" means.

All domain knowledge lives in **plugins**.

```
Platform Core — knows nothing about business domains
  ↓
Plugin: CRM — knows about Leads, Customers, Pipelines
Plugin: Inventory — knows about Products, Stock, Warehouses
Plugin: HMS — knows about Patients, Doctors, Appointments
Plugin: School — knows about Students, Attendance, Grades
```

If you find yourself writing CRM logic in the platform core, you are doing it wrong.

---

### 4. Everything Communicates Through Events

Services never call each other's databases.
Services communicate via events or APIs.

```
CRM Plugin needs to know a user's profile:
  WRONG:  SELECT * FROM auth.users WHERE id = ?
  RIGHT:  GET /api/users/{id}
  ALSO:   UserUpdated Event → CRM updates its local read model
```

This is not bureaucracy. This is the line between a **platform** and a **monolith with extra steps**.

When you query another service's database directly:
- You create hidden coupling
- A schema change in User service breaks CRM silently
- You cannot independently scale or deploy the services
- You cannot enforce data ownership boundaries

The event bus is the nervous system of OrbitoX. Every significant action emits an event. Every subscriber reacts. No service waits for another to finish.

---

### 5. Every Plugin Is a Complete Product

A plugin is not just business logic.

A plugin that only contains:

```typescript
// crm/src/lead.service.ts
createLead(dto: CreateLeadDto) { ... }
```

...is incomplete.

A complete plugin declares **everything** it needs to exist in the platform:

```
@orbitox/crm/
├── manifest.json          # Plugin contract with the platform
├── backend/               # API routes, services, repositories
├── frontend/              # Pages, forms, widgets, menus
├── database/              # Migrations, schemas, seeds
├── events/                # Emitted events + subscribed events
├── permissions/           # Permission definitions
├── policies/              # Business rules
├── workflows/             # Default workflow templates
├── cron/                  # Scheduled jobs
├── translations/          # i18n strings
├── docs/                  # Plugin documentation
└── tests/                 # Unit + integration tests
```

When a plugin is installed, the platform automatically:
1. Runs database migrations
2. Registers API routes
3. Registers permissions
4. Registers menu items
5. Registers dashboard widgets
6. Registers event subscriptions
7. Registers cron jobs
8. Seeds default data

When a plugin is uninstalled, none of the above bleeds into the rest of the platform.

---

## What OrbitoX Is Not

| Not This | But This |
|----------|----------|
| A CRM | The platform that runs CRM as a plugin |
| A monolith | A plugin-assembled platform |
| A fixed-tier SaaS | A context-graph SaaS OS |
| A collection of microservices | An event-driven platform with owned services |
| Yet another boilerplate | A reusable platform OS |

---

## The North Star Metric

> **Time-to-new-SaaS should be days, not months.**

When any engineer on the OrbitoX team says:

```
orbitox create restaurant
```

They should have a running restaurant management system in **minutes**, assembled from existing platform capabilities, with only the restaurant-specific logic left to write.

That is the vision. Every architectural decision in this document serves that vision.

---

*Next: [Part 02 — Platform OS Model](./02_Platform_OS_Model.md)*
