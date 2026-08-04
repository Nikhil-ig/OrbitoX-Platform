# Part 20 — CLI Reference
### *The `orbitox` Command-Line Interface*

---

## Installation

```bash
# Install globally
npm install -g @orbitox/cli

# Or use via pnpm workspace (recommended in monorepo)
pnpm add -D @orbitox/cli

# Verify installation
orbitox --version
# → OrbitoX CLI v1.0.0
```

---

## Command Overview

```
orbitox <command> [options]

Commands:
  new          Create a new OrbitoX project or monorepo
  create       Scaffold a new plugin inside an existing project
  install      Install a plugin from the marketplace
  uninstall    Remove a plugin from a context
  upgrade      Upgrade a plugin to a newer version
  rollback     Roll back a plugin to the previous version
  publish      Publish a plugin to the marketplace
  migrate      Run pending database migrations
  seed         Apply seed data for a plugin
  doctor       Validate project and plugin structure
  build        Build plugins and packages
  deploy       Deploy to a target environment
  logs         Tail platform or plugin logs
  events       Inspect and replay platform events
  context      Manage contexts (create, list, suspend)
  plugin       Manage plugin registry (list, enable, disable)
  secret       Manage secrets (set, get, rotate)
  version      Show CLI version
  help         Show help for a command
```

---

## `orbitox new`

Scaffold a new OrbitoX TurboRepo monorepo or project.

```bash
# Create a new OrbitoX platform monorepo
orbitox new my-platform

# With specific options
orbitox new my-platform \
  --template=turborepo \
  --package-manager=pnpm \
  --database=postgresql \
  --cache=redis

# Interactive mode
orbitox new
# ✔ Project name: my-platform
# ✔ Template: TurboRepo Monorepo
# ✔ Package manager: pnpm
# ✔ Database: PostgreSQL
# ✔ Include observability stack? Yes
# ✔ Include CI/CD templates? Yes
# → Creating project...
# ✅ Done! cd my-platform && pnpm install && pnpm dev
```

### Generated Structure

```
my-platform/
├── apps/web/
├── apps/api-gateway/
├── packages/core/
├── packages/services/
├── packages/plugin-engine/
├── packages/ui/
├── packages/types/
├── packages/config/
├── plugins/             # empty — add plugins as you build
├── infra/
├── tools/cli/
├── turbo.json
├── pnpm-workspace.yaml
└── .env.example
```

---

## `orbitox create`

Scaffold a new plugin or other component inside an existing project.

```bash
# Create a new plugin
orbitox create plugin restaurant-menu
# Generates: plugins/restaurant-menu/ with full structure

# Create a new platform service
orbitox create service geo-location
# Generates: packages/services/geo-location/

# Create a new entity definition
orbitox create entity Lead --plugin=crm
# Generates: plugins/crm/database/entities/lead.entity.json

# Create a new migration
orbitox create migration add_lead_score --plugin=crm
# Generates: plugins/crm/database/migrations/002_add_lead_score.sql
```

### Generated Plugin Structure

```
plugins/restaurant-menu/
├── manifest.json           # pre-filled template
├── backend/
│   └── src/
│       ├── restaurant-menu.module.ts
│       ├── menu-item/
│       │   ├── menu-item.entity.ts
│       │   ├── menu-item.service.ts
│       │   ├── menu-item.repository.ts
│       │   ├── menu-item.controller.ts
│       │   └── dto/
│       └── index.ts
├── frontend/
│   └── src/
│       ├── pages/
│       ├── components/
│       └── widgets/
├── database/
│   ├── migrations/
│   └── seeds/
├── events/
│   ├── emitted.ts
│   └── subscribed.ts
├── permissions/
│   └── permissions.json
├── translations/
│   ├── en.json
│   └── ar.json
├── tests/
│   ├── unit/
│   └── integration/
└── package.json
```

---

## `orbitox install`

Install a plugin from the marketplace.

```bash
# Install latest version
orbitox install @orbitox/crm

# Install specific version
orbitox install @orbitox/crm@1.2.0

# Install for a specific context
orbitox install @orbitox/crm --context=tenant-123

# Install with plan
orbitox install @orbitox/crm --plan=crm-professional

# Install multiple plugins
orbitox install @orbitox/crm @orbitox/inventory @orbitox/reports

# Output:
# ✔ Downloading @orbitox/crm@1.2.0...
# ✔ Validating manifest...
# ✔ Checking compatibility (Platform v2.1.0 ✅)...
# ✔ Checking dependencies (auth ✅, context ✅, notifications ✅)...
# ✔ Creating DB snapshot (rollback point)...
# ✔ Running migrations (3 migrations)...
# ✔ Registering routes (12 routes)...
# ✔ Registering permissions (14 permissions)...
# ✔ Registering menus (5 items)...
# ✔ Registering widgets (3 widgets)...
# ✅ @orbitox/crm@1.2.0 installed successfully
```

---

## `orbitox upgrade`

Upgrade an installed plugin.

```bash
# Upgrade to latest compatible version
orbitox upgrade @orbitox/crm

# Upgrade to specific version
orbitox upgrade @orbitox/crm@1.3.0

# Show available upgrades
orbitox upgrade --list

# Output:
# Plugin           Current   Available   Breaking?
# @orbitox/crm     1.2.0     1.3.0       No
# @orbitox/inv     2.0.1     2.1.0       No
# @orbitox/hms     1.0.0     2.0.0       YES ⚠️
```

---

## `orbitox rollback`

Roll back a plugin to its previous version.

```bash
# Roll back to previous version
orbitox rollback @orbitox/crm

# Roll back to specific version
orbitox rollback @orbitox/crm@1.1.0

# Output:
# Rolling back @orbitox/crm: 1.2.0 → 1.1.0
# ✔ Restoring DB snapshot...
# ✔ Re-activating v1.1.0 module...
# ✔ Updating plugin registry...
# ✅ Rollback complete. @orbitox/crm is now v1.1.0
```

---

## `orbitox publish`

Publish your plugin to the marketplace.

```bash
# Full publish flow
orbitox publish

# Or specify path
orbitox publish ./plugins/crm

# Steps executed:
# 1. orbitox doctor (validates structure)
# 2. pnpm test (runs test suite)
# 3. pnpm build (compiles TypeScript)
# 4. Signs package with your developer key
# 5. Uploads to marketplace registry
# 6. Creates marketplace listing

# Flags
orbitox publish --dry-run           # validate without publishing
orbitox publish --tag=beta          # publish as beta release
orbitox publish --skip-tests        # skip test run (not recommended)
```

---

## `orbitox migrate`

Run pending database migrations.

```bash
# Run all pending migrations for all plugins
orbitox migrate

# Run migrations for specific plugin
orbitox migrate --plugin=crm

# Run migrations for specific context
orbitox migrate --context=tenant-123

# Dry run — show what would run without executing
orbitox migrate --dry-run

# Show migration status
orbitox migrate --status
# Plugin      Migration                    Status    Applied At
# crm         001_create_leads             ✅ done   2026-01-01
# crm         002_add_lead_score          ✅ done   2026-01-15
# crm         003_add_pipeline_stage      ⏳ pending
```

---

## `orbitox doctor`

Validate your project structure, plugin contracts, and configurations.

```bash
# Run full health check
orbitox doctor

# Validate specific plugin
orbitox doctor --plugin=./plugins/crm

# Output:
# Checking project structure...
#   ✅ turbo.json present
#   ✅ pnpm-workspace.yaml present
#   ✅ packages/core present
#   ✅ packages/plugin-engine present
#
# Checking plugins...
#   ✅ @orbitox/crm manifest valid
#   ✅ @orbitox/crm dependencies satisfied
#   ⚠️  @orbitox/crm missing translations/hi.json
#   ✅ @orbitox/inventory manifest valid
#   ❌ @orbitox/hms manifest missing 'minimumPlatformVersion'
#
# Checking database...
#   ✅ PostgreSQL connection OK
#   ✅ Redis connection OK
#   ⚠️  @orbitox/crm has 1 pending migration
#
# Summary: 1 error, 2 warnings
```

---

## `orbitox events`

Inspect and replay platform events.

```bash
# Tail live events
orbitox events tail

# Tail events for specific context
orbitox events tail --context=tenant-123

# Filter by event name pattern
orbitox events tail --filter="crm.*"

# Replay events
orbitox events replay \
  --context=tenant-123 \
  --from="2026-01-01" \
  --filter="crm.lead.*"

# Inspect a specific event
orbitox events get <event-id>
```

---

## `orbitox deploy`

Deploy to a target environment.

```bash
# Deploy all changed packages to staging
orbitox deploy --env=staging

# Deploy specific plugin
orbitox deploy --plugin=crm --env=staging

# Deploy to production (requires confirmation)
orbitox deploy --env=production
# ⚠️  You are deploying to PRODUCTION
# This will affect 142 active tenants.
# Type 'production' to confirm: production
# ✅ Deploying...

# Options
orbitox deploy --env=staging --skip-migrations   # useful for rollback scenarios
orbitox deploy --env=production --dry-run        # show what would change
```

---

*Next: [Part 21 — Roadmap](./21_Roadmap.md)*
