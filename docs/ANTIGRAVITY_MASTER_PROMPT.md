# ORBITOX — SECURITY HARDENING + PLATFORM UPGRADE (MASTER PROMPT)

> Paste everything below the line into Antigravity (agent mode). You can also save it
> as `docs/ANTIGRAVITY_MASTER_PROMPT.md` in the repo and tell the agent: "Read and execute
> docs/ANTIGRAVITY_MASTER_PROMPT.md, phase by phase."

---

## ROLE

You are a senior security engineer and staff-level platform architect working inside the
OrbitoX monorepo (`Nikhil-ig/OrbitoX-Platform`). You will fix a verified list of security
defects, then upgrade the platform to be robust and production-grade. You work in small,
verified steps. You never guess: you read the code first, change it, then prove the change
with a test or command output.

## NON-NEGOTIABLE OPERATING RULES

1. Work on a new branch: `git switch -c hardening/phase-0`. Never commit to `main`. Never
   `git push --force`. Never rewrite history yourself (Phase 1 gives a script for the owner).
2. **Never print, log, echo or paste a secret value** (keys, tokens, `.staff_signing_secret`,
   `rawKey` values). When you must refer to one, show only the first 4 characters + `…`.
3. One phase at a time. After each phase: run the phase's verification commands, show their
   real output, commit with message `phase-N: <summary>`, then continue. If a verification
   fails, fix it before moving on. If you are blocked after 3 attempts, STOP and report
   exactly what failed — do not skip or fake a pass.
4. Do not delete features. Replace insecure behavior with secure behavior and keep public
   APIs working unless a phase says otherwise. If a change is breaking, list it in
   `docs/hardening/BREAKING_CHANGES.md`.
5. Every fix needs a regression test that FAILS on the old code and PASSES on the new code.
   Put tests next to the code (`*.spec.ts`) or in `scripts/` following the existing
   `scripts/test-*.js` style.
6. Prefer the Node/TypeScript standard library and packages already in the repo. Add a
   dependency only if essential, and say why.
7. Read before editing: open each file listed in a phase and read the whole relevant
   function before changing it. Line numbers below are approximate.
8. At the end of every phase write a 5-line status into `docs/hardening/PROGRESS.md`:
   done / tests run / tests passed / risks left / next.

## REPO MAP (what you are working with)

- `orbitox/` — pnpm + turbo monorepo
  - `orbitox/apps/web` — Next.js app; platform API under `app/api/v1/**/route.ts` (125 routes)
  - `orbitox/packages/{core,runtime,plugin-engine,services,external-runtime-sdk,importer-core,...}`
  - `orbitox/plugins/{commerce,pos,crm,finance,hms,hrms,inventory,school,external-project-engine,...}`
  - `orbitox/tools/cli`
- `projects/external-os/restaurant-os` — standalone TS server (port 4010), `src/server.ts`
  (~5k lines), `packages/{domain,storage,ui,integrations,runtime,config}`, JSON file store
- `scripts/` — 30+ `test-*.js` integration scripts (never verified as passing — run them)
- `external-restaurant-os/`, `hospital-os/`, `test-consumer-app/` — smaller sample projects

## VERIFIED FINDINGS (fix all of these)

| # | Severity | Finding | Where |
|---|----------|---------|-------|
| F1 | CRITICAL | `withApiGuard` never enforces auth. `allowPublic` is declared but never read; `requireAuth` is only ever set to `false`. `requiredScopes` are checked only `if (matchedKey)`, so a request with NO key skips scope checks and gets `scopes: ['*']`. | `orbitox/apps/web/app/api/v1/_lib/api-guard.ts` (~L595–830, ~L1051) |
| F2 | CRITICAL | 75 of 125 routes don't use `withApiGuard` at all (e.g. `platform/commands`, `projects/factory`, `platform/resources/**` incl. apply/rollback/reconcile, `projects/[projectId]/**`). No Next `middleware.ts` exists. | `orbitox/apps/web/app/api/v1/**` |
| F3 | CRITICAL | `POST /api/v1/system/switch/snapshot` (`requireAuth:false`) calls `PlatformApiState.importSnapshot`, which restores `apiKeys`, projects, services from request JSON → anyone can inject a root key. Same family: `system/switch`, `system/cluster`. | `app/api/v1/system/**`, `api-guard.ts` `importSnapshot` |
| F4 | CRITICAL | Legacy key fallback authenticates with `id`, `keyPrefix`, or `maskedKey` instead of the secret, and `rawApiKey.startsWith(k.keyPrefix)`. Root prefix `orb_live_root_` is in source ⇒ any string starting with it can match a `scopes:['*']` key. | `api-guard.ts` `findApiKey` (~L252) and ~L620 |
| F5 | HIGH | Seeded API keys incl. `rawKey` values committed in source. Rotation uses `Math.random()`. API key also accepted via `?apiKey=` query string. Tenant taken from client header/query/hostname. | `orbitox/apps/web/app/admin/data/mock-data.ts` (`INITIAL_API_KEYS`), `api-guard.ts` ~L278, ~L600 |
| F6 | HIGH | Hardcoded control-plane HMAC secret `orbitox_platform_control_secret_2026` (signs runtime config; also embedded in seeded project secrets). | `orbitox/plugins/external-project-engine/src/services/runtime-controller.service.ts` L24, ~L231, ~L240, L666 |
| F7 | HIGH | Insecure secret fallbacks: `JWT_PRIVATE_KEY \|\| 'default_secret'`, `JWT_PUBLIC_KEY \|\| 'default_secret'`; guest QR HMAC fallback `orbitox_default_secure_hmac_secret_key_2026`; S3 secret fallback `'mock'`. | `orbitox/packages/core/src/auth/auth.module.ts` L44–45; `orbitox/plugins/pos/src/domain/qr-trust.ts` L113; `orbitox/packages/core/src/storage/providers/s3.adapter.ts` L16 |
| F8 | HIGH | Committed signing secrets + revocation list + runtime dumps: `data/.staff_signing_secret`, `projects/external-os/restaurant-os/data/.staff_signing_secret`, `.revoked_staff_tokens.json`, `*.bak*`, `test-*store*.json`. | repo root `data/`, `restaurant-os/data/`, `restaurant-os/packages/storage/*.bak` |
| F9 | HIGH | Remote code execution risk: tenant-authored `custom_expression` is executed with `new Function(...)`. | `orbitox/plugins/commerce/src/domain/engines/logic/section-logic.engine.ts` (~L76 validate, ~L216 execute), `.../flow.engine.ts` ~L229 |
| F10 | HIGH | SSRF: server-side `fetch` of user-supplied URLs with no private-IP / metadata blocking, no redirect control, no size cap. | `orbitox/packages/importer-core/src/adapters/UrlCrawlerAdapter.ts` ~L99; `orbitox/packages/services/src/webhook/webhook.service.ts` ~L86; `orbitox/apps/web/app/api/hospital/**` fetches; `orbitox/packages/runtime/src/facades/ai.facade.ts` ~L170 |
| F11 | MEDIUM | Public `GET` lists leak metadata (credential names, owner emails, providers, project mapping, audit log, key records). | `platform/{credentials,api-keys,audit,projects,security,approvals,entitlements,changesets,packages,plugins,blueprints}/route.ts` |
| F12 | MEDIUM | Predictable IDs from `Date.now()+Math.random()` for security-relevant objects (contexts, approvals, changesets, install ids). | `core/src/context/context.service.ts` L58, `core/src/approval/approval-engine.ts` L68, `core/src/control-plane/changeset.service.ts` L46, `plugin-engine/src/platform/platform-repository.ts` ~L525 |
| F13 | MEDIUM | restaurant-os: `Access-Control-Allow-Origin: *` on authenticated API; destructive test routes (`/test/reset`, `/reseed`, `/api/test/inject-task`) gated only by `NODE_ENV==='production'`; hardcoded `REGISTERED_STATION_SECRETS` in source; tokens accepted in `?token=` query string; control-bridge `refresh_cache` returns fake `clearedEntries: 42`, `rotate_qr_locator` is a stub. | `projects/external-os/restaurant-os/src/server.ts`, `packages/domain/security.ts`, `src/bridge/control-bridge.ts` |
| F14 | LOW | ~210 MB of zips and many `.bak` files committed; docs claim "169 passing assertions" but nothing proves it. | `orbitox/apps/celebrations*.zip`, `orbitox/plugins/celebrations.zip`, `.bak*` files |

---

## PHASE 0 — BASELINE (no code changes)

1. `git switch -c hardening/phase-0`
2. `cd orbitox && pnpm install` then `pnpm -r build` (record failures, don't fix yet).
3. Run each `scripts/test-*.js` that doesn't need a browser. Save pass/fail per script into
   `docs/hardening/BASELINE.md`. Start required servers (restaurant-os on 4010) as needed.
4. Write `docs/hardening/THREAT_MODEL.md` (1 page): assets (API keys, tenant data,
   credentials vault, staff tokens), entry points, trust boundaries, and which findings
   F1–F14 apply.
5. Create `docs/hardening/PROGRESS.md` and `docs/hardening/BREAKING_CHANGES.md`.

**Verify:** BASELINE.md exists with real numbers. Commit.

## PHASE 1 — SECRETS: STOP THE BLEEDING (F6, F7, F8, F5-part, F14)

1. Add a central config validator `orbitox/packages/config/src/secrets.ts`:
   `requireSecret(name, {minBytes})` → reads `process.env[name]`, throws at startup if
   missing/too short/equal to a known-bad placeholder list (`default_secret`, `mock`,
   `orbitox_*_2026`, `changeme`). No fallbacks ever. Add `ALLOW_DEV_SECRETS=1` ONLY for
   `NODE_ENV==='development'` and have it generate a random per-process secret (never a
   constant), logging a warning.
2. Replace every insecure fallback in F6/F7 with `requireSecret(...)`:
   `ORBITOX_CONTROL_PLANE_SECRET`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`,
   `ORBITOX_GUEST_SECRET`, `AWS_SECRET_ACCESS_KEY`, `STAFF_SIGNING_SECRET`.
   In `runtime-controller.service.ts` stop embedding the secret in seeded project `secrets`
   (use a per-project random secret generated with `crypto.randomBytes(32)`).
3. restaurant-os: load staff signing secret from env `STAFF_SIGNING_SECRET`; if absent and
   not dev, refuse to start. Do not read/write `data/.staff_signing_secret` anymore.
   Move `REGISTERED_STATION_SECRETS` out of source into env/JSON-config loaded at boot
   (store only SHA-256 hashes; compare with `crypto.timingSafeEqual`).
4. `.gitignore`: add `data/`, `**/data/*.json`, `**/.staff_signing_secret`,
   `**/.revoked_staff_tokens.json`, `*.bak`, `*.bak_*`, `*.zip`, `test-results/`,
   `**/test-*store*.json`. Then `git rm --cached -r` the files already tracked (keep local
   copies). Move any needed seed/demo data to `**/seed/*.example.json` with fake data.
5. Add `.env.example` entries for every new variable (empty values, with generation
   hints like `openssl rand -base64 48`).
6. Add `.github/workflows/security.yml`: gitleaks (full history), `pnpm audit --prod`,
   and a job that fails if any tracked file matches the patterns in step 4.
7. Create `scripts/security/purge-history.sh` for the OWNER to run (do NOT run it):
   uses `git filter-repo --path data/.staff_signing_secret --path
   projects/external-os/restaurant-os/data/.staff_signing_secret --path-glob '*.bak*'
   --path-glob '*.zip' --invert-paths`, with a big warning comment and the
   `git push --force-with-lease` step clearly marked as manual.
8. Write `docs/hardening/ROTATE_NOW.md` — a checklist for the human: rotate staff signing
   secret, control-plane secret, JWT keys, guest HMAC secret, every API key seeded in
   `mock-data.ts`; revoke all staff tokens; re-clone after history purge.

**Verify:** `git grep -nE "orbitox_platform_control_secret|default_secret|orbitox_default_secure"`
returns nothing outside docs. Server fails to boot when secrets are unset (show the error),
boots when set. `git ls-files | grep -E "staff_signing_secret|\.bak|\.zip$"` is empty.
Unit tests for `requireSecret` (missing, short, placeholder, ok). Commit.

## PHASE 2 — REWRITE THE API GUARD: DEFAULT-DENY (F1, F4, F5, F11)

Edit `orbitox/apps/web/app/api/v1/_lib/api-guard.ts` (split it into modules under
`_lib/guard/`: `authenticate.ts`, `authorize.ts`, `tenant.ts`, `rate-limit.ts`, `errors.ts`,
`index.ts` re-exporting `withApiGuard`). Required behavior:

1. **Default deny.** Every route requires a valid credential unless it explicitly declares
   `public: true`. Keep `allowPublic` as a deprecated alias that maps to `public`, but
   it must now actually be honored — and **public routes get `scopes: []`, never `['*']`**.
   Public allowlist (initially ONLY): `GET /api/v1/openapi.json`, health/readiness
   endpoints, and routes the product truly needs anonymous (document each in
   `docs/hardening/PUBLIC_ROUTES.md` with a justification). All `platform/*` GET list
   routes in F11 become authenticated with a scope like `platform.credentials.read`.
2. **Key verification only by secret.** Delete the legacy fallbacks (`findApiKey` by
   id/prefix/maskedKey, and `startsWith(keyPrefix)`). Authenticate with:
   key format `orb_<env>_<keyId>_<secret>`; look up by `keyId`; compare
   `HMAC-SHA256(serverPepper, secret)` to the stored hash using `crypto.timingSafeEqual`.
   Reject on any mismatch with a generic 401 and identical timing. Pepper from
   `requireSecret('ORBITOX_API_KEY_PEPPER')`.
3. **Header-only credentials.** Remove `?apiKey=` support. Accept `Authorization: Bearer`
   and `x-api-key` only. Never log credentials.
4. **Scopes are mandatory when declared.** If `requiredScopes` is set and the caller has
   no credential → 401; credential present but missing scope → 403. Wildcard `*` allowed
   only for keys explicitly flagged `root: true`, and root keys require an IP allowlist
   (support CIDR) and cannot be created through the API.
5. **Tenant is derived from the credential**, never trusted from the client. If a client
   sends `x-tenant-id`/`tenantId`, it is only honored when it is within the key's
   `tenantScope`; otherwise 403 `TENANT_SCOPE_VIOLATION`. Remove hostname-based tenant
   inference for authenticated calls (keep for explicit public storefront routes only).
6. **Key lifecycle:** expiry (`expiresAt`), `status`, `lastUsedAt` update (async),
   rotation with grace window, revocation effective immediately (cache TTL ≤ 30 s).
   Generate secrets with `crypto.randomBytes(32).toString('base64url')` — remove every
   `Math.random()` in key generation.
7. **Remove the seeded keys** from `mock-data.ts` `INITIAL_API_KEYS` (and any
   `rawKey` fields). Provide `scripts/security/bootstrap-root-key.ts` that creates the
   first root key once, prints it a single time to the terminal, and stores only the hash.
8. **Standard error contract** (`{success:false,error:{code,message,requestId}}`), never
   leak stack traces, and add security headers on every response: `Cache-Control: no-store`
   for authenticated JSON, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`.
9. **Rate limiting:** key by credential id (authenticated) or IP (public); add a stricter
   bucket for failed auth attempts (e.g. 10/min/IP) with exponential back-off; Redis when
   `REDIS_URL` is set, in-memory fallback with a warning in production.
10. Add `orbitox/apps/web/middleware.ts` as a second line of defense: for any path under
    `/api/v1/` that is not in the public allowlist and has no `Authorization`/`x-api-key`
    header → return 401 immediately. (Edge-safe code only; the real verification still
    happens in the guard.)

## PHASE 3 — GUARD EVERY ROUTE; CLOSE THE SNAPSHOT HOLE (F2, F3)

1. Write `scripts/security/audit-routes.ts` that statically scans
   `orbitox/apps/web/app/api/**/route.ts` and prints, for each exported HTTP method,
   whether it uses `withApiGuard`, its `public` flag and `requiredScopes`. Make it **exit
   non-zero** if any method is unguarded or lacks scopes (except the allowlist). Wire it into
   CI (`security.yml`) and `pnpm test`.
2. Wrap all 75 unguarded routes with `withApiGuard` and sensible `requiredScopes` following
   `<service>.<resource>.<read|write|admin>` naming. Project-scoped routes
   (`projects/[projectId]/**`) must additionally verify the credential's tenant/project scope
   covers `[projectId]` (write a shared helper `assertProjectAccess(ctx, projectId)`).
3. Dangerous operations get **step-up controls**: `platform/commands`, `resources/*/apply`,
   `rollback`, `reconcile`, `projects/factory`, `system/switch*`, `system/cluster` require
   an `admin` scope AND a write to the hash-chained audit log (who, what, before/after
   hash) BEFORE execution.
4. `system/switch/snapshot` import: require `platform.system.restore` scope + root key;
   **never** import `apiKeys`, `secrets`, or credential material from a snapshot (strip them
   and log). Validate the snapshot with a strict schema (zod) and a size cap (e.g. 5 MB);
   verify an HMAC signature of the snapshot made with `ORBITOX_SNAPSHOT_SECRET` before
   applying. Export must redact key hashes.
5. Validate **every** request body/query with zod; reject unknown fields on write routes
   (`.strict()`). Cap JSON body size at 1 MB unless a route documents otherwise.
6. Add IDOR tests: tenant A's credential cannot read/modify tenant B's project, resource,
   audit entries, credentials.

## PHASE 4 — KILL THE RCE AND SSRF (F9, F10)

1. **Expressions:** remove every `new Function`/`eval`. Implement
   `orbitox/packages/utils/src/safe-expression.ts` using a whitelisted AST evaluator
   (use `json-logic-js` or `expr-eval` if already available, otherwise write a minimal
   tokenizer/parser supporting: literals, `+ - * / %`, comparisons, `&& || !`, ternary,
   `in`, property access on a frozen context object, and a small function whitelist like
   `min`, `max`, `contains`, `startsWith`, `lower`). No access to prototypes, globals,
   `constructor`, `__proto__`, or dynamic property names starting with `_`. Limit expression
   length (500 chars), AST depth (20), and evaluation steps (10k). Use it in
   `section-logic.engine.ts` (validate + execute) and `flow.engine.ts`.
   Add a corpus of attack strings (`constructor.constructor("return process")()`,
   `this.constructor`, `globalThis`, `require('fs')`, infinite loops, huge exponent) —
   all must be rejected without side effects.
2. **SSRF:** create `orbitox/packages/utils/src/safe-fetch.ts`:
   only `http:`/`https:`; resolve DNS first and block loopback, private, link-local
   (`169.254.0.0/16`, cloud metadata), CGNAT, multicast, IPv6 equivalents and IPv4-mapped
   IPv6; pin the resolved IP for the actual connection (prevent DNS rebinding); manual
   redirect handling (max 3, re-validate each hop); response size cap (e.g. 5 MB) and total
   timeout; strip credentials from URLs; optional per-tenant host allowlist. Use it in
   `UrlCrawlerAdapter`, `webhook.service.ts` (also require HTTPS for webhooks in production
   and include a timestamp in the signed payload to prevent replay: sign
   `${timestamp}.${body}`), `ai.facade.ts` where the URL is configurable, and the hospital
   routes. Tests must cover `http://127.0.0.1`, `http://169.254.169.254`,
   `http://[::1]`, a hostname resolving to a private IP, and a redirect to a private IP.

## PHASE 5 — RANDOMNESS & CRYPTO HYGIENE (F12)

1. Add `orbitox/packages/utils/src/ids.ts`: `newId(prefix)` → `${prefix}_${crypto.randomUUID()}`
   (or ULID if sortable IDs are needed) and `newToken(bytes=32)` → base64url of
   `crypto.randomBytes`.
2. Replace `Date.now()+Math.random()` ids in F12 files (and any other security-relevant ID:
   sessions, approvals, contexts, changesets, installations, tokens, locators, nonces).
   Leave UI node IDs in `importer-core` alone unless used for authorization.
3. Make HMAC/hash comparisons use `crypto.timingSafeEqual` everywhere
   (`git grep -nE "signature ===|token ===|secret ===|hash ===|digest\(.*\) ==="`).
4. Encrypt the credentials vault payloads with AES-256-GCM using a data key wrapped by a
   master key from `requireSecret('ENCRYPTION_KEY')` (or the KMS provider if configured);
   include key-version in the ciphertext header so keys can be rotated; add a rotation
   script.

## PHASE 6 — HARDEN RESTAURANT-OS (F13)

Work in `projects/external-os/restaurant-os`.

1. **CORS:** replace `*` with an allowlist from env `CORS_ALLOWED_ORIGINS`; never combine
   credentials with `*`; handle `OPTIONS` preflight correctly; add `Vary: Origin`.
2. **Test/destructive routes** (`/test/reset`, `/reseed`, `/api/test/inject-task`): only
   register them when `ENABLE_TEST_ROUTES==='1'` AND `NODE_ENV==='test'`; otherwise they must
   not exist (404). Add a startup assertion that refuses to boot if `NODE_ENV!=='test'` and
   `ENABLE_TEST_ROUTES==='1'`.
3. **Tokens only in headers or HttpOnly cookies.** Remove `?token=` from API/SSE auth.
   For SSE use `fetch`-based streaming with `Authorization` header, or a short-lived
   (≤60 s), single-use, order-scoped SSE ticket obtained via an authenticated POST.
   Update `crave-atlas.ts` (~L2523) and `swift-bite.ts` (~L1645) clients accordingly.
4. Add security headers to all HTML/API responses: strict `Content-Security-Policy`
   (nonce-based, no `unsafe-inline` for scripts if feasible), `X-Frame-Options: DENY`
   (except the white-label embed route that needs framing, documented),
   `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS in production.
   Audit the string-template UI (`packages/ui/pages/*.ts`): every interpolated value must go
   through a single `escapeHtml`/`escapeAttr`/`escapeJs` helper; add a test that injects
   `"><script>` and `</script>` payloads into guest names, menu item names, table labels and
   checks the rendered HTML is inert.
5. **Rate limiting & lockout:** per-IP and per-table-session limits on order submission and
   PIN endpoints; ensure PIN comparison is constant-time and lockout survives restarts.
6. **Control bridge:** implement `rotate_qr_locator` for real (generate new locator with
   `newToken`, invalidate old capability tokens, audit it) and `refresh_cache` (actually
   clear caches, return true counts). Add HMAC verification + replay protection (timestamp +
   nonce window) for incoming control-plane commands.
7. **Storage safety:** add a file lock around the JSON store write path, fsync before
   rename, a rolling backup (keep last N outside the repo dir), and schema-version
   migrations. This is a stepping stone to Phase 7.
8. Move `src/server.ts` (~5k lines) into route modules (`routes/orders.ts`, `routes/kds.ts`,
   `routes/menu.ts`, `routes/staff.ts`, `routes/commerce.ts`, `routes/dine.ts`,
   `routes/admin.ts`) with a tiny router + middleware chain (`securityHeaders`, `cors`,
   `rateLimit`, `auth`, `validate`). Behavior must stay identical — prove it with the
   existing scripts in `scripts/` all still passing.

## PHASE 7 — MAKE IT ADVANCED, POWERFUL, ROBUST

Do these in order; each is its own commit with tests. Keep feature flags so nothing breaks
existing deployments.

1. **Real database.** Implement a `Store` interface (`get/put/transaction/query`) with two
   backends: existing JSON file (dev) and PostgreSQL via Prisma (prod; extend
   `prisma/schema.prisma` with Tenant, ApiKey(hash only), Project, Credential(encrypted),
   AuditEvent(prevHash,rowHash), Order, OrderItem, KitchenTask, Table, Session, Guest,
   MenuItem, Category, Branch, Outbox). Row-level tenant scoping enforced in ONE place
   (a repository layer that always injects `tenantId`); add a lint/test that fails if a
   repository method lacks a tenant filter. Provide migrations and a JSON→Postgres import
   script with checksum verification.
2. **Transactional outbox + event bus** with Redis/BullMQ (already in the design): events are
   written in the same DB transaction as the state change, then published; consumers are
   idempotent (dedupe by event id); dead-letter queue + retry with backoff; metrics for lag.
3. **Real-time:** replace 4-second polling with SSE (and WebSocket fallback) with
   resume via `Last-Event-ID`, heartbeat, per-tenant channels, and backpressure limits.
4. **Payments:** replace the mock adapter with a provider interface and a Razorpay + Stripe
   implementation: server-side order creation, **webhook signature verification**
   (constant-time, replay window), idempotency keys, refund flow, reconciliation job that
   flags mismatches. Never trust client-reported payment success.
5. **Auth upgrade for humans:** short-lived JWT access tokens (≤15 min) + rotating refresh
   tokens (reuse detection), `HttpOnly; Secure; SameSite=Lax` cookies for browser apps,
   TOTP 2FA for admins, session list/revoke, login throttling, RBAC + ABAC policy checks via
   the existing PolicyEngine, and an immutable audit entry for every privileged action.
6. **Observability:** structured JSON logs (pino) with `requestId`/`tenantId`, redaction of
   secrets/PII, OpenTelemetry traces, Prometheus `/metrics` (protected), `/healthz` and
   `/readyz`, SLO dashboards doc, and alert rules (auth-failure spikes, 5xx, queue lag).
7. **Resilience:** timeouts on all outbound calls, circuit breaker + retry with jitter,
   graceful shutdown (drain connections, flush outbox), idempotency middleware for all
   non-GET public write routes, request-size limits, and chaos tests (kill Redis/DB
   mid-request → system degrades safely, never grants access on failure — **fail closed**).
8. **Multi-tenant isolation tests:** a generated test matrix that, for every route with a
   tenant-scoped resource, tries cross-tenant read/write/delete with tenant B's key and
   expects 403/404. This runs in CI and must be 100% green.
9. **Contract & docs:** generate OpenAPI from the zod schemas (single source of truth),
   publish at `/api/v1/openapi.json`, add typed SDK generation to
   `orbitox/packages/sdk`, and update `ORBITOX_MASTER_DOC.md` + restaurant-os docs so every
   claim ("169 passing assertions", "partially verified") is replaced with real numbers from
   CI.
10. **CI/CD & supply chain:** GitHub Actions matrix (lint, typecheck, unit, integration with
    Postgres+Redis service containers, route audit, gitleaks, `pnpm audit`, CodeQL, SBOM via
    CycloneDX), Dependabot/Renovate, pinned action SHAs, `pnpm install --frozen-lockfile`,
    signed release artifacts (the repo already mentions Ed25519 package signing — enforce
    verification at plugin load; reject unsigned plugins in production).
11. **Containers & deploy:** multi-stage Dockerfiles (non-root user, read-only root FS,
    no dev deps), `docker-compose` with healthchecks, Kubernetes manifests with
    NetworkPolicy, resource limits, secrets from the cluster secret store (never env files
    in the image).
12. **Performance:** add response caching with tenant-aware keys for read-heavy menu/catalog
    endpoints, DB indexes for hot queries, pagination (cursor-based) on all list routes,
    and a k6 load script with baseline thresholds (p95 latency, error rate) committed to
    `scripts/perf/`.

## PHASE 8 — FINAL VERIFICATION & REPORT

1. Run everything: `pnpm -r build`, `pnpm -r test`, all `scripts/test-*.js`, route audit,
   gitleaks on the working tree, `pnpm audit --prod`.
2. Re-attack your own work. Write and run `scripts/security/red-team.ts` that automatically
   attempts each of F1–F13 against a locally running instance (unauthenticated writes, fake
   root prefix, snapshot injection, tenant spoof, SSRF targets, expression escapes, CORS
   from a foreign origin, `?token=`, XSS payloads) and asserts every one is blocked.
3. Produce `docs/hardening/FINAL_REPORT.md`: per finding F1–F14 → status (fixed/mitigated/
   needs-human), the commit, the test proving it; before/after baseline test counts;
   remaining risks; and the ordered list of manual owner actions (history purge, secret
   rotation, infra settings).

## DEFINITION OF DONE

- Unauthenticated requests to any non-allowlisted `/api/v1/**` route return 401 — proven by
  automated route audit + red-team script.
- No hardcoded or fallback secrets; the app refuses to boot with missing/weak secrets.
- No tracked secrets, dumps, zips or `.bak` files; CI blocks regressions.
- No `eval`/`new Function`; all outbound fetches go through `safe-fetch`.
- Cross-tenant matrix test is 100% green; fail-closed behavior proven by chaos tests.
- All previously passing scripts still pass; new tests added for every fix.
- Real numbers in docs; FINAL_REPORT.md delivered.

## HOW TO REPORT PROGRESS

After each phase output exactly:

```
PHASE N DONE
Files changed: <count> (<key files>)
Tests added: <count>   Tests run: <count>   Passed: <count>   Failed: <count>
Proof: <paste the key command + its real output, secrets masked>
Risks / needs human: <list or "none">
Next: PHASE N+1
```

Begin with PHASE 0 now. Do not start Phase 1 until Phase 0 verification is shown.
