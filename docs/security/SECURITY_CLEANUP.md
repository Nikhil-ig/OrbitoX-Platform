# Security cleanup: what only you can do

The cleanup branch removes committed secrets from the **working tree** and stops new ones
from being committed. It cannot undo the past: anything that was ever pushed is still in
git **history** and must be treated as compromised. Do these two things.

## 1. Rotate every secret that was ever committed

Assume each of these is public. Replace them, do not just delete them.

| What | Where it was | What to do |
|---|---|---|
| Staff-token signing secret (RestaurantOS) | `data/.staff_signing_secret`, `projects/external-os/restaurant-os/data/.staff_signing_secret` | Delete the files on every server. A new random one is generated on next start. All issued staff tokens stop working (intended). |
| Revoked-token list | `projects/external-os/restaurant-os/data/.revoked_staff_tokens.json` | Delete. Not needed once the signing secret changes. |
| Control-plane signing key | hardcoded in `runtime-controller.service.ts` | Now read from `ORBITOX_CONTROL_SECRET`. Set a new random value. |
| Guest / QR token secret | hardcoded fallback in `qr-trust.ts` | Now read from `ORBITOX_GUEST_SECRET`. Set a new random value. |
| JWT fallback `default_secret` | `auth.module.ts` | Removed. Set `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` (RS256 pair) in production. |
| Seeded sample API keys | `apps/web/app/admin/data/mock-data.ts` | Sample data only. Never use these values anywhere real. |
| Database password `password123` | old `docker-compose*.yml` | Now `POSTGRES_PASSWORD` from `.env`. Change it on any database that ever used the old value. |
| Kitchen station secrets (`stn_sec_*`) | `REGISTERED_STATION_SECRETS` in RestaurantOS `security.ts` | Hardcoded secrets removed. Dynamically loaded from `RESTAURANT_STATION_SECRETS` or generated to `.station_secrets.json` (mode 0600). |

Generate fresh values with `node scripts/init-env.mjs` (or `openssl rand -hex 32`).

## 2. Purge the secrets from git history

This **rewrites history** and needs a force-push, so it is deliberately not automated.
Do it on a fresh mirror clone, tell collaborators first, and make a backup.

```bash
pip install git-filter-repo

git clone --mirror https://github.com/Nikhil-ig/OrbitoX-Platform.git
cd OrbitoX-Platform.git

git filter-repo --invert-paths \
  --path data/.staff_signing_secret \
  --path projects/external-os/restaurant-os/data/.staff_signing_secret \
  --path projects/external-os/restaurant-os/data/.revoked_staff_tokens.json \
  --path orbitox/apps/web/orbitox/data/platform-control-store.json \
  --path projects/.gemini \
  --path-glob '*.zip' \
  --path-glob '*.bak*' \
  --path-glob '**/data/*runtime-store*.json' \
  --path-glob '**/data/test-*.json'

git remote add origin https://github.com/Nikhil-ig/OrbitoX-Platform.git
git push origin --force --all
git push origin --force --tags
```

Afterwards:

- Everyone with a clone must **re-clone** (old clones still contain the secrets).
- GitHub keeps old commits reachable by SHA and in forks for a while. Ask GitHub Support
  to run garbage collection on the repository, or treat the secrets as permanently public
  (which is why step 1 comes first).
- In `.github/workflows/ci.yml`, remove `continue-on-error: true` from the `secret-scan`
  job and switch it to a full-history scan.

## 3. Open items (not fixed by this cleanup)

These are known and need their own work. They are listed so nothing is assumed safe:

- [x] **Remaining demo surfaces locked down (RESOLVED)**: All demo and plugin surfaces
  (`/hms`, `/hrms`, `/crm`, `/finance`, `/commerce`, `/store`, and their `/api/v1/*` endpoints)
  are now protected at the edge by `middleware.ts`, requiring the admin token like `/admin`
  and `/platform`. Anonymous callers receive 401; authenticated admin callers receive 200.
- [x] **Per-project runtime keys (RESOLVED)**: On initial `REGISTER` with the shared bootstrap
  `ORBITOX_RUNTIME_TOKEN`, the control plane generates and returns a scoped `orb_proj_*` key,
  persisting only its SHA-256 hash. Registered projects must present their own scoped key for
  subsequent bridge, heartbeat, configuration, and command operations; cross-project key usage
  and shared token reuse are rejected with 401.
- [x] **Safe expression evaluator and SSRF protection (RESOLVED)**:
  Replaced all usage of `new Function` in the commerce plugin (`section-logic.engine.ts`, `flow.engine.ts`)
  with `evaluateSafeExpression` and `validateSafeExpression`, powered by an AST recursive-descent parser
  and tree-walk evaluator (`safe-expression.ts`). It enforces strict operator whitelisting, explicit
  rejection of dangerous identifiers/properties (`process`, `require`, `eval`, `Function`, `constructor`,
  `__proto__`, etc.), recursion depth limits (30), and step count limits (1000). URL fetchers are
  guarded with `safeFetch` (`safe-fetch.ts`) featuring SSRF protection: protocol whitelist (`http:`, `https:`),
  strict IP address blocking (private IPv4 `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, loopback
  `127.0.0.0/8`, link-local/cloud metadata `169.254.0.0/16`, multicast/reserved, and IPv6 loopback/ULA/link-local/mapped),
  pre-flight DNS lookup, and manual redirect hop tracking with cap (max 3). Verified by 11 unit tests in
  `safe-logic.test.ts`.
- [x] **Secure ID and key generation (RESOLVED)**:
  Replaced all insecure `Math.random()` invocations across API route handlers (`apps/web/app/api`),
  core packages (`@orbitox/core`, `@orbitox-io/plugin-engine`, `@orbitox/runtime`), plugins
  (`commerce`, `pos`, `crm`, `hrms`, `hms`, `finance`, `school`, `inventory`), and external runtimes
  (`restaurant-os`). Rotated API keys, tokens, sessions, and credentials now use cryptographically secure
  `crypto.randomBytes()`; unique identifiers utilize standard UUIDv4 via `crypto.randomUUID()`;
  and integer codes/numbers use `crypto.randomInt()`.
- [x] **Harden RestaurantOS (RESOLVED)**:
  - **CORS allowlist**: Replaced `Access-Control-Allow-Origin: *` with `resolveAllowedOrigin(req)`
    which checks `process.env.RESTAURANTOS_ALLOWED_ORIGINS` (comma-separated list) and defaults safely
    to localhost and loopback interfaces. Unmatched origins receive no CORS header, blocking unauthorized cross-origin requests.
  - **Removed `?token=` query strings**: Eliminated accepting sensitive authentication tokens via
    URL query parameters (`?token=`), strictly enforcing the standard `Authorization: Bearer <token>`
    header across API endpoints and event streaming gateways.
  - **Dynamic station secrets**: Removed static `stn_sec_*` literals from `REGISTERED_STATION_SECRETS`
    and source code. Station credentials are dynamically loaded from `RESTAURANT_STATION_SECRETS`
    or automatically generated to `.station_secrets.json` with restricted `0600` file permissions.
  - **Gated test endpoints**: Test and debug endpoints (`/api/test/*`, `/debug/*`, `/api/restaurant/test/*`,
    `/api/restaurant/reseed`) are strictly gated behind `process.env.RESTAURANTOS_ENABLE_TEST_ROUTES === 'true'`.
    When unset or false, all test endpoints return HTTP 404.
  - Verified by 12 automated acceptance tests in `projects/external-os/restaurant-os/scripts/test-hardened-security.js`.

