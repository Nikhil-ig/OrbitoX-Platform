# Contributing to OrbitoX Platform

Thank you for your interest in contributing to OrbitoX! To maintain high engineering velocity and zero-trust security standards, all contributors must follow these guidelines.

---

## 1. Monorepo Principles

1. **One Workspace, One Lockfile, One Root**:
   - Always run `pnpm install` from the root directory.
   - Never commit nested `package-lock.json` or `pnpm-lock.yaml` files.
2. **Folder Purpose**:
   - `apps/` = User-facing deployables (`apps/platform`, `apps/restaurant`).
   - `services/` = Backend-only deployables (`services/restaurant-api`).
   - `packages/` = Shared libraries (`@orbitox-io/*`).
   - `plugins/` = Platform plugins.
   - `tools/` = Developer tools (`tools/cli`).
3. **Domain Grouping**:
   - Organize code by domain, never by historical phase numbers (e.g. `phase6-*`).
4. **Architectural Boundaries**:
   - `apps/*` and `services/*` must never import each other; they communicate over HTTP via `@orbitox-io/bridge`.
   - `packages/*` must never import from `apps/*` or `services/*`.
   - `packages/ui` must have zero database, network, or server imports.

---

## 2. Local Development Workflow

### Prerequisites
- Node.js `22.x` (see `.nvmrc`)
- pnpm `9.15.0+`
- PostgreSQL 16+

### Setup
```bash
# 1. Install dependencies
pnpm install

# 2. Generate Prisma clients
pnpm --filter @orbitox-io/platform run prisma:generate
pnpm --filter @orbitox-io/restaurant-api run prisma:generate

# 3. Build workspace
pnpm run build
```

### Running Locally
```bash
# Platform Control Plane & HospitalOS (Next.js on http://localhost:3000)
pnpm run dev:web

# RestaurantOS API (Fastify/Node on http://localhost:4010)
pnpm --filter @orbitox-io/restaurant-api run dev
```

---

## 3. Verification & Quality Gates

Before opening a pull request, verify all automated checks pass locally:

```bash
# 1. Static validation & architectural boundaries
pnpm run lint
pnpm run check:circular
pnpm run check:knip
pnpm run type-check

# 2. Unit and isolation tests
pnpm run test
pnpm --filter @orbitox-io/platform test
pnpm --filter @orbitox-io/restaurant-api test

# 3. Database migration immutability
bash scripts/ci/verify-migration-immutability.sh
```

---

## 4. Coding Standards

- Scoped packages must be published and imported under the `@orbitox-io` namespace.
- Handlers should be thin; business rules live in `src/server/` or `service.ts` modules.
- Every commit message should follow Conventional Commits (e.g. `feat(billing): ...`, `fix(auth): ...`, `refactor(platform): ...`).

