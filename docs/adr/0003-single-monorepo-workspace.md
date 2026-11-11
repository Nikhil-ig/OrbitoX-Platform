# ADR 0003: Single pnpm Workspace and Lockfile Architecture

## Status
Accepted

## Context
Prior to Stage 7A-2, the repository contained nested project directories (`orbitox/`, `projects/external-os/restaurant-os/`) with multiple package managers (`npm`, `pnpm`), nested `package-lock.json`, and duplicate root configurations. This resulted in phantom dependencies, diverging package versions, and fragile CI builds.

## Decision
Adopt a strict single-workspace monorepo architecture:
1. **One workspace, one lockfile, one root**:
   - Monorepo root defines `pnpm-workspace.yaml` containing `apps/*`, `services/*`, `packages/*`, `plugins/*`, `tools/*`.
   - Exactly one root `pnpm-lock.yaml`.
   - Zero nested `package-lock.json` or `pnpm-lock.yaml` files anywhere in the tree.
2. **Top-level directory roles**:
   - `apps/` = User-facing deployables (`apps/platform`, `apps/restaurant`).
   - `services/` = Backend-only deployables (`services/restaurant-api`).
   - `packages/` = Shared libraries (`@orbitox-io/*`).
   - `plugins/` = Platform plugins.
   - `tools/` = Scaffolding CLI tools.
   - `infra/` = Infrastructure definitions.
   - `scripts/` = Domain-grouped maintenance scripts (`scripts/{db,secrets,ci}`).

## Consequences
- **Positive**: Single dependency tree, deterministic installations, fast CI builds via Turborepo caching.
- **Positive**: Zero confusion regarding repository entry points or nested package manager commands.
- **Negative**: Requires careful isolation of generated code (such as Prisma clients) across different projects.
