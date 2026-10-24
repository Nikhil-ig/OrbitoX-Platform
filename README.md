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
orbitox/                 The monorepo (pnpm + Turborepo)
  apps/web/              Control plane: admin UI + APIs (Next.js, port 3005)
  apps/celebrations/     Celebrations Studio, a separate visual-editor product
  packages/              Kernel and SDKs (core, runtime, plugin-engine, external-runtime-sdk, ui, ...)
  plugins/               Business modules (commerce, pos, crm, finance, inventory, hms, hrms, school, ...)
  scripts/               init-env, smoke test, cluster switch tools
projects/external-os/restaurant-os/   RestaurantOS, an independent app that connects to the control plane
hospital-os/, external-restaurant-os/, test-consumer-app/   Example and reference apps
docs/                    Architecture and guides (start at docs/README.md)
developer_guide/, B2B2C_Template_Docs/   Deeper design documents
```

## Status

Working and tested: deployment (Docker, health checks, fail-fast config), access control,
runtime registration, heartbeats, command loop, Fleet view, CI.

In progress or known limitations (details in [`docs/SECURITY_CLEANUP.md`](docs/SECURITY_CLEANUP.md)):

- The older `/admin` screens still run on sample data (they say so in a banner). They are being
  replaced by live screens under `/platform`, starting with Fleet.
- State is stored in a JSON file. A Postgres-backed store (the Prisma schema exists) is planned.
- The runtime token is shared across projects; per-project keys are planned.

## Documentation

Start with [`docs/README.md`](docs/README.md). Highlights: architecture
([`docs/02_ARCHITECTURE.md`](docs/02_ARCHITECTURE.md)), deployment
([`docs/12_PRODUCTION_DEPLOYMENT.md`](docs/12_PRODUCTION_DEPLOYMENT.md)), client projects
([`docs/CLIENT_PROJECTS_AND_ECOSYSTEM_GUIDE.md`](docs/CLIENT_PROJECTS_AND_ECOSYSTEM_GUIDE.md)).
Historical design and acceptance reports are kept in [`docs/archive/`](docs/archive/).
