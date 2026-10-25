# OrbitoX

**A control plane for all your software projects.** Connect any app to OrbitoX with a few lines
of code, then see every project in one place: is it online, which revision is it running, what
was last done to it, what needs attention.

OrbitoX also ships the shared building blocks most SaaS products re-build every time
(multi-tenancy, roles and permissions, audit trail, events, feature flags, billing, AI gateway)
as plugins, so a new product starts with them instead of from zero.

---

## Quick start

### Run it with Docker (recommended)

```bash
cd orbitox
node scripts/init-env.mjs          # creates .env with fresh random secrets, prints your admin password
docker compose up -d --build
```

Open **http://localhost:3005/platform/fleet**. Your browser asks for a login: use any username
and the `ORBITOX_ADMIN_TOKEN` from `.env` as the password.

Data lives in the `orbitox_data` Docker volume. Postgres and Redis are optional:
`docker compose --profile db --profile cache up -d`.

### Run it for development

```bash
cd orbitox
pnpm bootstrap    # install + build the workspace packages (first time only)
pnpm dev:web      # http://localhost:3005 (no login needed in development)
```

Requires Node 22+ and pnpm 9.

---

## Connect a project

Any Node app can join the fleet in seconds. You can either scaffold the configuration files automatically with our generator script or set them up manually:

### Option A: 1-Line Scaffold (Recommended)

Run the generator in your application's repository:

```bash
node orbitox/scripts/scaffold-project.mjs --name "My SaaS App" --slug "my-saas-app"
```

This immediately creates `orbitox.manifest.json` and `orbitox-client.ts` wired with registration, feature flags, and live entitlement usage tracking.

### Option B: Manual Setup

Add the SDK, then register on startup:

```ts
import { ControlClient } from '@orbitox/external-runtime-sdk';
import manifest from './orbitox.manifest.json';

const orbitox = new ControlClient({
  manifest,                                          // name, slug, projectId, ...
  controlPlaneUrl: process.env.ORBITOX_CONTROL_PLANE_URL || process.env.ORBITOX_BACKEND_URL,  // e.g. https://control.example.com
  apiKey: process.env.ORBITOX_RUNTIME_TOKEN,         // from the control plane's .env
});

await orbitox.registerRuntime();  // registers the project and starts heartbeats
```

The project appears in **Fleet** (`/platform/fleet`) within seconds, and keeps reporting health, revision,
and live usage. You can send it commands (health check, cache refresh, restart, ...) with
`POST /api/v1/projects/{id}/commands` (admin token); the app receives, runs and acknowledges
them automatically. Plan details, quote computation, and live quotas are available under the **Billing** tab.

## Track your projects

**Fleet** (`/platform/fleet`) shows every project with:

| | |
|---|---|
| Connection | Online (heartbeat within 30 s), Stale (within 5 min), Offline, Never connected |
| Revision | Applied vs. desired configuration revision, with drift highlighted |
| Activity | Last command and last audit event |
| Attention | Anything needing action: offline, out of sync, failed command |

The same data is available as JSON for scripts and dashboards:

```bash
curl -H "Authorization: Bearer $ORBITOX_ADMIN_TOKEN" \
  "https://control.example.com/api/v1/fleet?attention=1"
```

Everything shown is real: connection comes from heartbeat age, drift from revisions, activity
from the command queue and audit trail. Nothing is estimated.

---

## Security model

Two separate credentials, so a leaked app credential can never open the admin side:

| Token | For | Can do |
|---|---|---|
| `ORBITOX_ADMIN_TOKEN` | You and your tools | Admin UI, management APIs, issue commands |
| `ORBITOX_RUNTIME_TOKEN` | Connected apps (SDK `apiKey`) | Register, heartbeat, report command results, read their own config |

In production the server **refuses to start** if these (or `ORBITOX_CONTROL_SECRET` /
`ORBITOX_GUEST_SECRET`) are missing or shorter than 32 characters. Read
[`docs/SECURITY_CLEANUP.md`](docs/SECURITY_CLEANUP.md): secrets that were committed in the past
must be rotated and purged from git history.

## Configuration

Copy `orbitox/.env.example` (or run `node scripts/init-env.mjs`). Required in production:

| Variable | Purpose |
|---|---|
| `ORBITOX_ADMIN_TOKEN` | Admin login password / API bearer token |
| `ORBITOX_RUNTIME_TOKEN` | Shared secret for connected apps |
| `ORBITOX_CONTROL_SECRET` | Signs configuration and commands sent to apps |
| `ORBITOX_GUEST_SECRET` | Signs guest / QR access tokens |
| `ORBITOX_DATA_DIR` | Where state is stored (point at a persistent volume) |

## Verify it works

```bash
# against a running control plane
ORBITOX_URL=http://localhost:3005 \
ORBITOX_ADMIN_TOKEN=... ORBITOX_RUNTIME_TOKEN=... \
pnpm smoke
```

The smoke test checks access control (including privilege-escalation attempts), real SDK
registration, fleet visibility, and the full issue → execute → complete command loop.
Unit tests: `pnpm --filter @orbitox/external-project-engine test`. CI runs all of it on every push.

---

## Repository layout

```
orbitox/                             The monorepo (pnpm + Turborepo)
  apps/web/                          Control plane: admin UI + APIs (Next.js, port 3005)
  apps/celebrations/                 Celebrations Studio, a separate visual-editor product
  packages/                          Kernel and SDKs (core, runtime, plugin-engine, external-runtime-sdk, ui, ...)
  plugins/                           Authoritative Business Plugins (@orbitox/pos, @orbitox/crm, commerce, finance, ...)
  tools/cli/                         OrbitoX CLI (@orbitox/cli): scaffold composed apps and templates
  scripts/                           pack-and-verify, test-scaffold-smoke, init-env, smoke tests
projects/external-os/restaurant-os/  Authoritative RestaurantOS, a multi-tenant app composed with @orbitox/pos
projects/external-os/hospital-os/    HospitalOS reference clinical vertical
projects/examples/test-consumer-app/ Standalone consumer application testing @orbitox-io GitHub packages
docs/                                Architecture and guides (start at docs/README.md)
developer_guide/, B2B2C_Template_Docs/ Deeper domain design documents
```

## Status

Working and tested:
- **Composable SaaS Engine**: Scaffold new vertical products (`orbitox create my-app --template=restaurant|crm`) that compose authoritative business logic plugins (`@orbitox/pos`, `@orbitox/crm`) with zero-trust multi-tenancy and platform connection.
- **Zero-Trust Per-Project Keys**: Cryptographically secure project runtime keys (`orb_proj_...`) with one-time secret display and SHA-256 hash isolation.
- **Unified Publishing**: Single scope `@orbitox/*` at v1.0.0 with backwards-compatibility proxies for `@orbitox-io/*`.
- **Automated Verification**: Monorepo packs and verifies all 12 packages in clean offline temp sandboxes; boots composed apps and runs multi-template E2E smoke tests in CI.

## Documentation

Start with [`docs/README.md`](docs/README.md). Highlights:
- Plugin Contract: [`docs/20_PLUGIN_CONTRACT.md`](docs/20_PLUGIN_CONTRACT.md)
- CLI Scaffolding: [`docs/11_CLI_SCAFFOLDING.md`](docs/11_CLI_SCAFFOLDING.md)
- Getting Started: [`docs/01_GETTING_STARTED.md`](docs/01_GETTING_STARTED.md)
- Production Deployment: [`docs/12_PRODUCTION_DEPLOYMENT.md`](docs/12_PRODUCTION_DEPLOYMENT.md)
- Client Projects & Ecosystem: [`docs/CLIENT_PROJECTS_AND_ECOSYSTEM_GUIDE.md`](docs/CLIENT_PROJECTS_AND_ECOSYSTEM_GUIDE.md)
