# Phase 1.6 Security Verification

Status for this workspace revision: implementation, local suites, production build, and production-mode HTTP checks completed. Phase 2 is not declared ready: an independent tester must re-verify items 1–5, and database-backed RLS/full RestaurantOS end-to-end behavior remains outside this verification.

## API Route Inventory

The structural test scans every `orbitox/apps/web/app/api/**/route.ts` file (143 in this revision). A route must use an approved wrapper, fall under an actual middleware matcher, or be on the exact public allowlist. New routes are scanned automatically by `test/api-route-auth-structure.test.ts` and the test runs before the web production build.

| Route pattern | Authorized caller | Enforcement |
|---|---|---|
| `/api/health` | Public health probe | Exact public allowlist; health-only response |
| `/api/v1/openapi.json` | Public documentation reader | Exact public allowlist |
| `/api/restaurant/qr/[locator]` | Public QR discovery | `withPublicGuestBootstrap`; returns sanitized table discovery only |
| `/api/restaurant/sessions/join` | Public diner bootstrap | `withPublicGuestBootstrap`; issues a signed, expiring guest capability |
| `/api/restaurant/menu` | Guest with valid session capability | `withGuestToken`; capability binds tenant, location, session, expiry, and access epoch |
| `/api/restaurant/quote` | Guest with valid session capability | `withGuestToken`; tenant and session values come from the verified token |
| `/api/restaurant/orders` | Guest with valid session capability | `withGuestToken`; order reads are restricted to that participant and session |
| `/api/restaurant/kds` | Platform admin only | `withRestaurantGuard(adminOnly, sensitive)`; hidden in production unless explicitly enabled |
| `/api/hospital/patients/**`, `/appointments/**`, `/beds/**`, `/billing/**`, `/labs/**`, `/admissions`, `/departments`, `/hierarchy`, `/stats`, `/treatments` | Entitled customer key for `hms`; `hms:read` for GET and `hms:write` for mutations | `withHospitalGuard`; backend identity and tenant are derived from the verified principal; fallback data uses tenant-scoped storage |
| `/api/hospital/audit`, `/reset-seed`, `/telemetry`, `/security/**` including staff, roles, permissions, login, session, drill, break-glass, and purge | Platform admin only | `withHospitalGuard(adminOnly, sensitive)`; hidden in production unless explicitly enabled |
| `/api/v1/admin/**` | Platform admin only | Admin control-plane middleware plus `withApiGuard` on guarded handlers; admin Bearer/Basic or approved platform admin key |
| `/api/v1/platform/**` | Platform admin only | Platform middleware and/or `withApiGuard` |
| `/api/v1/projects/**` | Runtime only for the explicit method/endpoint matrix; otherwise platform admin | Runtime/admin middleware with signed internal principal; runtime methods are restricted by endpoint |
| `/api/v1/system/**`, `/api/v1/fleet/**`, `/api/v1/overview/**` | Platform admin only | Admin control-plane middleware |
| `/api/v1/{commerce,crm,finance,hms,hrms,inventory,pos,restaurant,school}/**` | Entitled customer key for the requested service | `withApiGuard`; persistent key status/expiry, tenant, entitlement, and quota checks |

The table groups route files by owning route family. Exact route-file coverage is enforced by the structural test rather than copied into a second manually maintained 143-row list.

## Enforcement Decisions

- Customer API keys are stored and verified only through `PlatformRepository`. Plaintext keys are returned once; repository records retain a verifier, project/environment identity, tenant scope, capabilities, status, and expiry.
- Project slugs are case-insensitive, unique, and immutable during normal updates. Valid explicit slugs are honored; generated names receive numeric suffixes. Startup repairs and logs any legacy duplicate and updates affected key tenant scopes.
- Quota is reserved atomically immediately before handler execution. Only 2xx responses are billable. Non-2xx responses, thrown failures including 5xx, authentication denials, entitlement denials, and quota denials do not consume usage. UTC monthly reset is scheduled for the first day of each month; admin reset/set is available at `POST /api/v1/admin/projects/{projectId}/usage` and is durably audited.
- Production requires `ORBITOX_ADMIN_TOKEN`, `ORBITOX_RUNTIME_TOKEN`, `ORBITOX_CONTROL_SECRET`, `ORBITOX_GUEST_SECRET`, and `ORBITOX_SERVER_PEPPER`, each at least 32 characters. Build-phase environment flags do not disable runtime checks.

## Verification State

| Check | Evidence | Status |
|---|---|---|
| Anonymous, dummy, and forged-principal hospital/restaurant requests | 50 protected route-methods × 3 credential cases; ordinary protected routes denied, production-disabled sensitive routes return 404 | Passed in production HTTP: 150 denials; anonymous patient POST did not change patient count |
| Authenticated hospital read/write, capability checks, and tenant isolation | Licensed hms customer read/write succeeded; read-only key write denied; a second tenant cannot read the first tenant's newly created patient | Passed in production HTTP and handler test |
| Guest session bootstrap, menu, quote, and order | Public QR discovery; signed guest token accepted; missing/forged token denied; guest order read is session/participant scoped | Passed in production HTTP and guest route test |
| Admin Bearer and Basic | Provisioning and management API calls | Both passed in production HTTP |
| Route structural allowlist/wrappers | `test/api-route-auth-structure.test.ts` scans all 143 route files and is included before `next build` | Passed; production build completed |
| Provisioned key restart durability | Provisioned through admin HTTP; same key authenticated after standalone restart | Passed in production HTTP |
| Key rotation/revocation restart durability | Old key disabled, replacement active; replacement and revoked state checked after separate restarts | Passed in production HTTP |
| Sequential quota 10 | Ten successful calls; eleventh denied; usage equals 10 | Passed in production HTTP |
| Quota at 50-way concurrency | Exactly 10 successes and 40 denials; usage equals 10 | Passed in production HTTP |
| Failed-call billing rule | 503 handler response releases project and environment quota reservations; denied calls do not count | Passed in focused handler test; 5xx case not repeated over production HTTP |
| Unique slugs and legacy repair | Duplicate names, case-insensitive collisions, immutability, key-scope repair | Passed in repository tests |
| Pepper bypass | Standalone launch with `NEXT_PHASE=phase-production-build` and missing pepper; same check on `next start` preflight | Standalone exits status 1 with `ORBITOX_SERVER_PEPPER is not set` before listening; `next start` preflight also rejects it |
| Full web verification | `tsx --test test/**/*.test.ts`, `tsc --noEmit`; plugin repository Jest suite | 36 web tests and 11 repository tests passed; type-check passed |
| Database-backed RLS and full restaurant app | Not exercised in this verification | Not verified |
| Cross-process/distributed quota and rate-limit state | Existing phase boundary | Not verified; Phase 2 scope |

## Production HTTP Environment

- `NODE_ENV=production`, `PORT=3105`, `HOSTNAME=127.0.0.1`.
- `ORBITOX_ADMIN_TOKEN`, `ORBITOX_RUNTIME_TOKEN`, `ORBITOX_CONTROL_SECRET`, `ORBITOX_GUEST_SECRET`, and `ORBITOX_SERVER_PEPPER` were generated independently with `openssl rand -hex 32`; values were kept in a mode-600 temporary file and never printed.
- `ORBITOX_DATA_DIR` pointed to a temporary directory; `ORBITOX_ENABLE_HOSPITAL_ADMIN_ENDPOINTS=false`.
- `ORBITOX_BACKEND_URL` and `NEXT_PHASE` were unset during the normal HTTP run. For startup-negative verification, `NEXT_PHASE=phase-production-build` was set and `ORBITOX_SERVER_PEPPER` was omitted while the other four secrets remained valid.
- The final production route smoke completed 238 requests, including two-tenant hospital isolation and sequential/parallel quota checks: sequential 10/10 successes then 429; concurrent 10 successes and 40 denials with usage 10.
- The temporary server, secret file, and data directory were deleted after checks.

Phase 2 remains blocked until the independent tester re-verifies items 1–5 against the built standalone server. This report records local and live evidence; it is not an owner/tester sign-off.
