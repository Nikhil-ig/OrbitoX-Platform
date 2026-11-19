# ADR 0002: Package Scope Namespace (@orbitox-io) and GitHub Packages Publishing

## Status
Accepted

## Context
Packages across the monorepo need to be published to a private/public package registry for external consumption and internal dependencies. An earlier proposal attempted renaming packages to `@orbitox/*`, but collided with unowned npm namespaces and violated `AGENTS.md` rules.

## Decision
All published packages and internal shared libraries must strictly use the `@orbitox-io` scope on GitHub Packages:
- Target Registry: `https://npm.pkg.github.com`
- Scoped naming pattern: `@orbitox-io/<package-name>`
  - Examples: `@orbitox-io/plugin-engine`, `@orbitox-io/bridge`, `@orbitox-io/core`, `@orbitox-io/pos`.
- Platform Plugin IDs (data identifiers stored in database rows) remain unchanged: `@orbitox/hms`, `@orbitox/restaurant`, `@orbitox/pos`.
- `.npmrc` containing auth tokens must never be committed to git.

## Consequences
- **Positive**: Strict adherence to `AGENTS.md` Rule 1.
- **Positive**: Clean separation between npm package names (`@orbitox-io/*`) and database plugin IDs (`@orbitox/*`).
- **Negative**: Requires configuring `npm.pkg.github.com` registry in CI publishing steps.

