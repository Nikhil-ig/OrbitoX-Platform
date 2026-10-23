# OrbitoX Platform — Breaking Changes Registry

This document catalogs all backward-incompatible changes, deprecated interfaces, and security policy modifications introduced during the security hardening and platform upgrade.

| Phase | Change | Migration / Remediation | Rationale |
|---|---|---|---|
| Phase 0 | Initialized registry | None | Baseline setup |
| Phase 1 | Mandatory Environment Secrets | Configure `ORBITOX_CONTROL_PLANE_SECRET`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `ORBITOX_GUEST_SECRET`, `AWS_SECRET_ACCESS_KEY`, and `STAFF_SIGNING_SECRET` in environment. For local dev only, set `ALLOW_DEV_SECRETS=1` with `NODE_ENV=development`. | Stop leakage and usage of hardcoded fallback secrets (`default_secret`, `orbitox_*_2026`, `mock`). |
| Phase 1 | Removed `.staff_signing_secret` file persistence | Pass `STAFF_SIGNING_SECRET` as environment variable. | Eliminates committed/tracked machine signing secrets on disk. |
| Phase 1 | Hashed Station Secrets | Configure `RESTAURANT_STATION_SECRETS` in environment; raw station secrets are no longer hardcoded in source. | Protects kitchen hardware credentials. |
| Phase 1 | Git Index Purge of Dumps and Archives | Tracked `.json` databases in `data/`, `*.bak` files, and `.zip` archives untracked from repository. Seed files moved to `**/seed/*.example.json`. | Reduces repository bloat and prevents committing runtime state. |
| Phase 2 | Default-Deny API Guard | All `/api/v1/**` endpoints require authentication by default unless explicitly allowlisted with `public: true`. | Enforces zero-trust access control across all APIs. |
| Phase 2 | Header-Only Credentials | Pass API credentials via `Authorization: Bearer <key>` or `x-api-key: <key>`. Query parameter `?apiKey=` is rejected with 401. | Prevents credential logging in proxies, load balancers, and browser histories. |
| Phase 2 | Purged Seeded Keys & Plaintext Storage | Keystore now stores only HMAC-SHA256 verifiers. Raw keys are never stored on disk. Use `scripts/security/bootstrap-root-key.ts` to initialize root key. | Eliminates exposure of static developer keys in source control. |
| Phase 2 | Multi-Tenant Anti-Spoofing | Client `x-tenant-id` is only honored if within credential's `tenantScope`; otherwise returns 403 `TENANT_SCOPE_VIOLATION`. Hostname inference disabled for authenticated routes. | Stops cross-tenant IDOR and tenant spoofing attacks. |
| Phase 2 | Strict Scope Enforcement & Root IP Lockout | Scopes are mandatory when declared. Wildcard `*` allowed only for `isRoot: true` keys. Root keys require strict IP allowlist and cannot be created via API. | Minimizes blast radius of compromised keys. |
| Phase 2 | Authenticated Platform Routes (F11) | 15 `platform/*` endpoints that previously had `allowPublic: true` now require authentication with scoped read permissions. | Closes unauthenticated access to platform vault, audit logs, and keys. |
| Phase 2 | Edge Gateway Middleware | Edge middleware enforces immediate 401 for non-allowlisted `/api/v1/*` requests lacking credential headers. | Second line of defense reducing compute burden on backend handlers. |
