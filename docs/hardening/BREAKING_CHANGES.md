# OrbitoX Platform — Breaking Changes Registry

This document catalogs all backward-incompatible changes, deprecated interfaces, and security policy modifications introduced during the security hardening and platform upgrade.

| Phase | Change | Migration / Remediation | Rationale |
|---|---|---|---|
| Phase 0 | Initialized registry | None | Baseline setup |
| Phase 1 | Mandatory Environment Secrets | Configure `ORBITOX_CONTROL_PLANE_SECRET`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `ORBITOX_GUEST_SECRET`, `AWS_SECRET_ACCESS_KEY`, and `STAFF_SIGNING_SECRET` in environment. For local dev only, set `ALLOW_DEV_SECRETS=1` with `NODE_ENV=development`. | Stop leakage and usage of hardcoded fallback secrets (`default_secret`, `orbitox_*_2026`, `mock`). |
| Phase 1 | Removed `.staff_signing_secret` file persistence | Pass `STAFF_SIGNING_SECRET` as environment variable. | Eliminates committed/tracked machine signing secrets on disk. |
| Phase 1 | Hashed Station Secrets | Configure `RESTAURANT_STATION_SECRETS` in environment; raw station secrets are no longer hardcoded in source. | Protects kitchen hardware credentials. |
| Phase 1 | Git Index Purge of Dumps and Archives | Tracked `.json` databases in `data/`, `*.bak` files, and `.zip` archives untracked from repository. Seed files moved to `**/seed/*.example.json`. | Reduces repository bloat and prevents committing runtime state. |
