## Summary

<!-- Provide a concise description of the changes introduced in this pull request. -->

## Changes

- 
- 

## Invariant Checklist

- [ ] **One workspace, one lockfile, one root**: Only the root `pnpm-lock.yaml` is modified. Zero nested lockfiles.
- [ ] **Package scope**: All internal and published packages use `@orbitox-io/*`.
- [ ] **Architectural boundaries**:
  - `apps/*` and `services/*` do not import each other (they talk over HTTP via `@orbitox-io/bridge`).
  - `packages/*` do not import `apps/*` or `services/*`.
  - `packages/ui` has zero database/fetch/server imports.
- [ ] **Circular dependencies**: `pnpm run check:circular` reports 0 circular dependencies.
- [ ] **Lint & Knip**: `pnpm run lint` and `pnpm run check:knip` pass cleanly.
- [ ] **Migration immutability**: `bash scripts/ci/verify-migration-immutability.sh` passes.
- [ ] **Tests pass**:
  - `pnpm run test`
  - `pnpm --filter web test`
  - `pnpm --filter restaurant-os test`
