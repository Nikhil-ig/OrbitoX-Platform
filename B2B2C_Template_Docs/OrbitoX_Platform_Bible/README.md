# 📖 OrbitoX Platform Bible
### *The Complete Engineering Handbook for Building a SaaS Operating System*

> **Version:** 1.0.0 — Foundation Release
> **Classification:** Internal · Engineering Leadership · Confidential
> **Repository Structure:** TurboRepo Monorepo
> **Audience:** Platform Architects · Senior Engineers · Tech Leads · Engineering Managers

---

## What Is This Document?

The OrbitoX Platform Bible is not a README.
It is not a microservice guide.
It is not a deployment checklist.

It is the **single source of truth** for how OrbitoX thinks, how it is designed, and how every engineer must build on it.

Every engineer reads this before writing a single line of production code.

---

## The Governing Idea

> **"I never want to build CRM twice."**

OrbitoX is not a CRM.
OrbitoX is not an ERP.
OrbitoX is not an HMS.

OrbitoX is the **Operating System** on which all of those are assembled — from reusable, independently deployable, event-driven building blocks called **plugins**.

---

## Four-Layer Platform Model

```
Layer 1 — Platform Core (Kernel)
  Authentication · Tenant · Billing · RBAC · Storage · Events · Workflow

        ↓

Layer 2 — Platform Services
  AI · Notifications · Search · Reports · Files · Integrations

        ↓

Layer 3 — Plugin Engine
  Plugin SDK · Marketplace · Theme Engine · Dynamic UI · Dynamic Forms · Event Bus

        ↓

Layer 4 — Business Modules (Plugins)
  CRM · ERP · HMS · HRMS · Inventory · MLM · School · Restaurant · Construction
```

---

## TurboRepo Monorepo Overview

```
orbitox/
├── apps/
│   ├── web/                    # Next.js super-admin & tenant portal
│   ├── api-gateway/            # Kong / custom gateway
│   └── docs/                   # Internal documentation site
│
├── packages/
│   ├── core/                   # Platform Kernel (auth, tenant, billing, rbac)
│   ├── services/               # Platform Services (AI, notifications, search)
│   ├── plugin-engine/          # Plugin SDK, loader, registry
│   ├── ui/                     # Shared design system components
│   ├── config/                 # Shared configs (eslint, tsconfig, jest)
│   ├── types/                  # Shared TypeScript types
│   └── utils/                  # Shared utilities
│
├── plugins/
│   ├── crm/                    # CRM business plugin
│   ├── inventory/              # Inventory business plugin
│   ├── hms/                    # Hospital Management plugin
│   ├── hrms/                   # HR Management plugin
│   ├── payroll/                # Payroll plugin
│   ├── school/                 # School Management plugin
│   ├── restaurant/             # Restaurant plugin
│   ├── mlm/                    # MLM/Network Marketing plugin
│   └── pos/                    # Point of Sale plugin
│
├── infra/
│   ├── k8s/                    # Kubernetes manifests
│   ├── terraform/              # Infrastructure as Code
│   ├── docker/                 # Docker configurations
│   └── observability/          # Prometheus, Grafana, Loki configs
│
├── tools/
│   ├── cli/                    # orbitox CLI
│   └── codegen/                # Code generators
│
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

---

## Table of Contents — All 22 Parts

| Part | Title | File |
|------|-------|------|
| 01 | Vision & Philosophy | 01_Vision_and_Philosophy.md |
| 02 | Platform OS Model | 02_Platform_OS_Model.md |
| 03 | Core Engineering Principles | 03_Core_Engineering_Principles.md |
| 04 | Universal Context Engine | 04_Universal_Context_Engine.md |
| 05 | Metadata Engine | 05_Metadata_Engine.md |
| 06 | Dynamic UI Engine | 06_Dynamic_UI_Engine.md |
| 07 | Plugin Engine | 07_Plugin_Engine.md |
| 08 | Capability Engine | 08_Capability_Engine.md |
| 09 | Data Philosophy | 09_Data_Philosophy.md |
| 10 | Event Bus | 10_Event_Bus.md |
| 11 | Workflow Engine | 11_Workflow_Engine.md |
| 12 | Policy Engine | 12_Policy_Engine.md |
| 13 | Feature Flag Engine | 13_Feature_Flag_Engine.md |
| 14 | Observability | 14_Observability.md |
| 15 | AI Architecture | 15_AI_Architecture.md |
| 16 | Security | 16_Security.md |
| 17 | Plugin Marketplace | 17_Plugin_Marketplace.md |
| 18 | Build Philosophy | 18_Build_Philosophy.md |
| 19 | SDK Reference | 19_SDK_Reference.md |
| 20 | CLI Reference | 20_CLI_Reference.md |
| 21 | Roadmap | 21_Roadmap.md |
| 22 | Engineering Rules | 22_Engineering_Rules.md |
| A | TurboRepo Monorepo Structure | APPENDIX_A_TurboRepo_Structure.md |
| B | Anti-Patterns & What Never to Do | APPENDIX_B_Anti_Patterns.md |

---

## The 10 Commandments of OrbitoX

1. **Everything is a Context** — not a tenant, not a user, not a branch. A Context.
2. **Everything is a Plugin** — no business logic lives in the platform core.
3. **Everything communicates through Events** — no direct database cross-writes.
4. **Configuration over Code** — if it can be a config, it must be a config.
5. **Never Hardcode** — IDs, menus, forms, roles, workflows, themes. Never.
6. **Data has an Owner** — each service/plugin owns its database. Nobody else writes to it.
7. **API is the only interface** — `GET /users/{id}`, never `SELECT * FROM auth.users`.
8. **Everything is Versioned** — APIs, plugins, schemas, migrations. Always.
9. **Everything is Observable** — system logs, app logs, audit logs, business events, security events.
10. **Every plugin is a complete product** — API + Events + DB + Permissions + UI + Docs + Tests.

---

*Last Updated: 2026 · OrbitoX Engineering · Platform Team*
