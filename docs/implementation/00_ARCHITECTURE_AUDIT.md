# 🔍 OrbitoX RestaurantOS: Comprehensive Architecture & Repository Audit (00)

> **Document:** `docs/implementation/00_ARCHITECTURE_AUDIT.md`  
> **Classification:** Internal Engineering Audit · Principal Architecture Team  
> **Status:** Completed & Verified  

---

## 1. Repository Topology

```
/Users/apple/Documents/Office/company/Orbito/OrbitoX Platform
├── orbitox/                         ── Monorepo Root (TurboRepo + PNPM Workspaces)
│   ├── apps/
│   │   ├── celebrations/            ── Next.js Celebration/Invitation Platform
│   │   └── web/                     ── Unified Platform Web Hub (Next.js 14 App Router, Tailwind)
│   ├── packages/
│   │   ├── core/                    ── Universal Security, Context, Policy, RBAC, EventBus, AI Gateway
│   │   ├── plugin-engine/           ── Kernel runtime, dynamic manifest loader, license & sandbox enforcer
│   │   ├── plugin-hospital-os/      ── Reference Vertical Package: Hospital OS
│   │   ├── runtime/                 ── createOrbitoXApp runtime orchestrator
│   │   ├── sdk/                     ── Client & developer SDK
│   │   ├── services/                ── Shared backend micro-services
│   │   ├── types/                   ── Canonical platform schema & interface types
│   │   ├── ui/                      ── Central design system tokens & shared React primitives
│   │   └── utils/                   ── Shared crypto, hash, and format utilities
│   ├── plugins/
│   │   ├── commerce/                ── E-Commerce store & catalog plugin
│   │   ├── crm/                     ── Headless CRM lead management plugin
│   │   ├── finance/                 ── Ledger & multi-currency billing plugin
│   │   ├── hms/                     ── Hospital management clinical backend plugin
│   │   ├── hrms/                    ── Human resource management plugin
│   │   ├── inventory/               ── Central inventory management plugin
│   │   └── pos/                     ── Basic Point-of-Sale plugin (domain action skeletons)
│   └── prisma/
│       └── schema.prisma            ── PostgreSQL Prisma schema (Stores, Themes, Products, Orders, Celebrations, Studio)
├── external-restaurant-os/          ── Standalone Portable Integration Test & RestaurantOS Vertical Prototype
│   ├── docs/                        ── Authoritative v2.1 & v2.2 RestaurantOS Specifications (Docs 02–13)
│   ├── src/main.ts                  ── Standalone engine test bypassing DI (Passed successfully)
│   └── manifest.json                ── RestaurantOS prototype manifest
├── hospital-os/                     ── Production-grade reference vertical (16 clinical roles, IoT telemetry, n8n automations)
├── B2B2C_Template_Docs/             ── Enterprise B2B2C Template & Handbook (20 architecture domains)
└── docs/                            ── Platform specifications, guides, and P-series audit history
```

---

## 2. Infrastructure & Shared Services Discovery

| Component | Repository Path | Implementation State | Production Reusability |
|---|---|---|---|
| **Multi-Tenancy (Context Engine)** | `orbitox/packages/core/src/context` | Tree + Mesh context graph with BFS traversal | **100% Reusable** for Brand ➔ Branch ➔ Floor ➔ Table |
| **Zero-Trust RBAC & Policy Engine**| `orbitox/packages/core/src/security`, `rbac`, `approval` | JSONLogic ABAC + Role RBAC interception | **100% Reusable** for capability guards & BOPLA |
| **Plugin Engine Kernel** | `orbitox/packages/plugin-engine` | Manifest validation, sandbox freezing, digital signature | **100% Reusable** for RestaurantOS vertical registration |
| **Database & ORM** | `orbitox/prisma/schema.prisma` | PostgreSQL 16 + Prisma Client | **Shared Foundation**: Needs Restaurant domain models added |
| **Theme & Design Tokens** | `orbitox/packages/ui/src/styles/theme.css` | CSS variable tokens, glassmorphism, dark mode | **100% Reusable** for Guest PWA & KDS high-density modes |
| **Web Realtime Infrastructure** | `orbitox/packages/core/src/events` | In-memory + Redis EventEmitter | **Extendable**: Needs session-scoped WebSocket rooms |
| **POS Plugin Skeleton** | `orbitox/plugins/pos` | Basic state machine & order action handlers | **Refactorable**: Domain baseline for counter POS channel |
| **Existing RestaurantOS Tests**| `external-restaurant-os/src/main.ts` | Context graph & RBAC integration test | **Passed**: Proves standalone kernel portability |

---

## 3. Discovered Gaps & Critical Architecture Findings

1. **Prisma Schema Lacks Restaurant Operational Models:**
   - The primary schema (`orbitox/prisma/schema.prisma`) contains models for `Store`, `Product`, `Order`, `CelebrationExperience`, and `StudioProject`, but does **not yet contain** `RestaurantLocation`, `RestaurantTable`, `QRIdentity`, `DiningSession`, `Participant`, `KitchenStation`, `PreparationTask`, or `PricingQuote`.
2. **QR Trust Invariant Was Unenforced in Prototype Code:**
   - The initial prototype in `external-restaurant-os/manifest.json` treated menu items as simple records without modeling `QRIdentity` or `TableDiscoveryContext`. The v2.2 contract (`13_RestaurantOS_QR_Trust_and_Guest_Privacy.md`) must be strictly implemented.
3. **Double Idempotency & OCC Versions Missing from Schemas:**
   - Existing e-commerce models lack integer `version` columns for optimistic concurrency control and durable PostgreSQL `IdempotencyRecord` tables.
4. **Order Status Was Previously Linear:**
   - The existing e-commerce `OrderStatus` enum is linear (`PENDING` ➔ `CONFIRMED` ➔ `PROCESSING` ➔ `SHIPPED` ➔ `DELIVERED`). RestaurantOS requires four orthogonal domain state machines plus an ephemeral `CustomerVisibility` projection.
