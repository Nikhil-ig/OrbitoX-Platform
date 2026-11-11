# 🪐 OrbitoX Platform

[![CI Pipeline](https://github.com/Nikhil-ig/OrbitoX-Platform/actions/workflows/ci.yml/badge.svg)](https://github.com/Nikhil-ig/OrbitoX-Platform/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.15.0-orange.svg)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue.svg)](https://www.typescriptlang.org/)
[![Turborepo](https://img.shields.io/badge/monorepo-Turborepo-EF4444.svg)](https://turbo.build/repo)

**OrbitoX** is an enterprise multi-tenant SaaS control plane and vertical application operating system. It provides unified tenancy, cryptographically signed plugin entitlements, fine-grained access control (RBAC/ABAC), and an inter-service communication bridge for vertical SaaS products (hospitality, healthcare, commerce).

> For detailed workspace topology, inter-service bridge protocols, Ed25519 grant tokens, transactional outbox, PostgreSQL Row-Level Security (RLS), and CI guardrails, read [`docs/architecture.md`](docs/architecture.md) and [`docs/README.md`](docs/README.md).

---

## 🏛️ Monorepo Topology & Services

The monorepo operates as a single pnpm + Turborepo workspace (`pnpm-workspace.yaml`) with a single root lockfile (`pnpm-lock.yaml`).

### Deployable Applications & Services

| Deployable | Directory | Role / Ports | Boundaries |
|---|---|---|---|
| **Platform Control Plane & HospitalOS** | [`apps/platform`](apps/platform) | Next.js 15 / `:3000` (`:3005`) | Multi-tenant SaaS control plane, operator console (`(console)`), customer portal (`(dashboard)`), HospitalOS clinical suite (`(hospital)`), and public APIs (`/api/v1/*`). Owns platform PostgreSQL database (`apps/platform/prisma/schema.prisma`). |
| **RestaurantOS API** | [`services/restaurant-api`](services/restaurant-api) | Node HTTP / `:4010` | Independently deployed restaurant engine (menu, orders, KDS, tables, billing, data rights). Owns dedicated PostgreSQL database and isolated Prisma client in `services/restaurant-api/generated/prisma`. |

### Shared Packages & Plugins (`@orbitox-io/*`)

| Component | Directory | Responsibility |
|---|---|---|
| **Kernel Core** | [`packages/core`](packages/core) | RBAC, ABAC JSON-logic evaluation, PII field encryption, hash-chained audit service, and S3 object storage client. |
| **Plugin Engine** | [`packages/plugin-engine`](packages/plugin-engine) | Ed25519 grant signing/verification, credential vault, platform repository, and sandboxed plugin execution. |
| **Bridge Protocol** | [`packages/bridge`](packages/bridge) | Zero-trust HMAC-SHA256 request signing, timestamp skew validation (`60s`), and single-use nonce replay protection. |
| **Runtime Kernel** | [`packages/runtime`](packages/runtime) | Fluent application builders and unified facade runtime. |
| **Design System** | [`packages/ui`](packages/ui) | Pure React UI library with zero backend, data-fetching, or Prisma dependencies. |
| **SDKs & Types** | [`packages/sdk`](packages/sdk), [`packages/external-runtime-sdk`](packages/external-runtime-sdk), [`packages/types`](packages/types), [`packages/utils`](packages/utils) | Public application facades, external bridge clients, shared type contracts, and utility functions. |
| **Shared Configs** | [`packages/eslint-config`](packages/eslint-config), [`packages/jest-config`](packages/jest-config), [`packages/tsconfig`](packages/tsconfig) | Reusable monorepo configs (`@orbitox-io/eslint-config`, `@orbitox-io/jest-config`, `@orbitox-io/tsconfig`). |
| **Platform Plugins** | [`plugins/pos`](plugins/pos), [`plugins/external-project-engine`](plugins/external-project-engine) | Point-of-Sale workflows, order state machines, and external project orchestration engine. |
| **Developer CLI** | [`tools/cli`](tools/cli) | Scaffolding, Ed25519 key generation (`keygen`), and plugin packaging/verification. |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `22.x` (see [`.nvmrc`](.nvmrc))
- **pnpm**: `9.15.0+`
- **PostgreSQL**: `16+` (for control-plane and restaurant databases)

### Setup & Build

```bash
# 1. Install dependencies across the single workspace
pnpm install

# 2. Generate Prisma clients (isolated generation per service)
pnpm --filter web run prisma:generate
pnpm --filter restaurant-os run prisma:generate

# 3. Build workspace packages
pnpm run build
```

### Local Development

```bash
# Platform Control Plane & HospitalOS (http://localhost:3000)
pnpm run dev:web

# RestaurantOS API (http://localhost:4010)
pnpm --filter restaurant-os run dev
```

Background workers can be run independently:
- **Email Outbox Worker**: `pnpm --filter web run email:worker`
- **Billing Grace Sweep**: `pnpm --filter web run billing:grace-sweep`
- **Data Rights Worker**: `pnpm --filter web exec tsx src/workers/data-rights.ts`

---

## 🔒 Automated Verification & CI Guardrails

Every pull request and push to CI runs strict static and architectural checks:

```bash
# TypeScript type checks across all workspaces
pnpm run type-check

# Circular dependency detection (madge --circular = 0)
pnpm run check:circular

# Architectural boundaries & style rules (ESLint 9 flat config)
pnpm run lint

# Dead code and unused dependency detection (Knip)
pnpm run check:knip

# Migration immutability check
bash scripts/ci/verify-migration-immutability.sh
```

### Test Suites

```bash
# Shared package unit tests (Core, Plugin Engine, POS, External Project Engine)
pnpm run test

# Platform Control Plane & HospitalOS unit tests (346 tests)
pnpm --filter web test

# RestaurantOS event bus isolation & core milestone tests
pnpm --filter restaurant-os run test:isolation
pnpm --filter restaurant-os run test:core
```

---

## 📦 Containerization & Deployment

Production container images build cleanly from the repository root:

- **Platform Control Plane**:
  ```bash
  docker build -f apps/platform/Dockerfile -t orbitox/platform .
  ```
- **RestaurantOS API**:
  ```bash
  docker build -f services/restaurant-api/Dockerfile -t orbitox/restaurant-api .
  ```
- **Local Compose Stack**:
  ```bash
  docker compose -f infra/docker/docker-compose.yml up -d
  ```

---

## 📜 Architectural Decisions & Runbooks

- [Architecture Decision Records (ADRs)](docs/adr/README.md)
  - [ADR 0001: Single-VPS Staging Environment](docs/adr/0001-vps-staging.md)
  - [ADR 0002: Package Scope Namespace (@orbitox-io)](docs/adr/0002-package-scope.md)
  - [ADR 0003: Single pnpm Workspace and Lockfile Architecture](docs/adr/0003-single-monorepo-workspace.md)
  - [ADR 0004: Database Isolation per Deployable Service](docs/adr/0004-independent-service-database.md)
- [Operational Runbooks](docs/runbooks/)
- [Security Guidelines & Threat Models](docs/security/)
