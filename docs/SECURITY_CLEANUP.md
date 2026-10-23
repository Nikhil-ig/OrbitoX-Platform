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
| Kitchen station secrets (`stn_sec_*`) | `REGISTERED_STATION_SECRETS` in RestaurantOS `security.ts` | Still hardcoded in source. Move to config and rotate (open item). |

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

- The legacy admin API layer (`apps/web/app/api/v1/_lib/api-guard.ts`) still runs on sample
  data and its guard does not enforce authentication. The control plane is now protected at
  the edge by `middleware.ts`, which covers `/admin`, `/platform` and the management APIs.
  Other demo surfaces (`/hms`, `/hrms`, `/crm`, `/finance`, `/commerce`, `/store`) are
  not behind the admin token.
- The runtime token is shared by all projects. A per-project key would stop one compromised
  runtime from acting as another.
- Tenant-authored expressions run through `new Function` in the commerce plugin
  (`section-logic.engine.ts`, `flow.engine.ts`), and URL fetchers have no SSRF protection.
- `Math.random()` is still used for IDs and rotated API keys in several API routes.
- RestaurantOS: `Access-Control-Allow-Origin: *`, `?token=` in query strings, and test
  endpoints gated only by `NODE_ENV`.
