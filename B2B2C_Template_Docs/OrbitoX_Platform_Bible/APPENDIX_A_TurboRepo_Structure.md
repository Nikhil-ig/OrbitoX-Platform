# Appendix A — TurboRepo Monorepo Structure
### *The Complete File & Package Map of the OrbitoX Platform*

---

## Root Configuration Files

```
orbitox/
├── turbo.json                      # TurboRepo pipeline definitions
├── package.json                    # Root workspace — scripts only, no dependencies
├── pnpm-workspace.yaml             # pnpm workspace declarations
├── .env.example                    # All environment variable keys (values blank)
├── .env.local                      # Local dev overrides (gitignored)
├── .gitignore
├── .dockerignore
├── tsconfig.base.json              # Base TypeScript config
├── .eslintrc.base.js               # Base ESLint config
└── .prettierrc
```

---

## turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalEnv": ["NODE_ENV", "DATABASE_URL", "REDIS_URL"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", ".next/static/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "env": ["TEST_DATABASE_URL"]
    },
    "test:integration": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "type-check": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "migrate": {
      "dependsOn": ["^build"],
      "outputs": [],
      "cache": false
    },
    "seed": {
      "dependsOn": ["migrate"],
      "outputs": [],
      "cache": false
    },
    "clean": {
      "cache": false
    },
    "doctor": {
      "cache": false
    }
  }
}
```

---

## pnpm-workspace.yaml

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "packages/config/*"
  - "plugins/*"
  - "tools/*"
```

---

## `apps/` — Deployable Applications

### `apps/web/` — Next.js 15 Frontend

```
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── mfa/page.tsx
│   ├── (platform)/
│   │   ├── layout.tsx            # App shell with dynamic sidebar
│   │   ├── dashboard/page.tsx
│   │   └── [plugin]/             # Dynamic plugin pages loaded from registry
│   └── admin/
│       ├── contexts/
│       ├── plugins/
│       ├── billing/
│       └── settings/
├── components/
│   ├── shell/
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx           # Plugin-driven dynamic sidebar
│   │   └── Header.tsx
│   └── providers/
│       ├── ContextProvider.tsx   # Provides current context to all children
│       ├── ThemeProvider.tsx     # Applies resolved theme
│       └── PluginProvider.tsx    # Loads plugin pages and menus
├── lib/
│   ├── api.ts                    # Axios instance with auth headers
│   ├── flags.ts                  # Feature flag client
│   └── context.ts                # Context resolution utilities
├── public/
├── next.config.ts
└── package.json
```

### `apps/api-gateway/` — NestJS API Gateway

```
apps/api-gateway/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── middleware/
│   │   ├── context-resolution.middleware.ts
│   │   ├── rate-limiter.middleware.ts
│   │   ├── auth.middleware.ts
│   │   └── request-id.middleware.ts
│   ├── proxy/
│   │   └── service-proxy.ts      # Routes to internal services
│   └── health/
│       └── health.controller.ts  # GET /health
├── Dockerfile
└── package.json
```

---

## `packages/` — Shared Packages

### `packages/core/` — Platform Kernel

```
packages/core/
├── src/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── jwt.service.ts         # RS256 sign/verify
│   │   ├── jwt.strategy.ts        # Passport JWT strategy
│   │   ├── mfa.service.ts         # TOTP + SMS
│   │   ├── sso/
│   │   │   ├── google.strategy.ts
│   │   │   ├── azure-ad.strategy.ts
│   │   │   └── saml.strategy.ts
│   │   ├── session.service.ts     # Redis session management
│   │   ├── api-key.service.ts     # API key generation/validation
│   │   └── guards/
│   │       ├── jwt-auth.guard.ts
│   │       └── api-key.guard.ts
│   │
│   ├── context/
│   │   ├── context.module.ts
│   │   ├── context.service.ts     # CRUD operations on contexts
│   │   ├── context-resolver.ts    # Domain/subdomain/JWT resolution
│   │   ├── context.repository.ts
│   │   ├── context.interceptor.ts # Injects context into request
│   │   └── context.decorator.ts   # @Context() param decorator
│   │
│   ├── rbac/
│   │   ├── rbac.module.ts
│   │   ├── rbac.service.ts        # Permission checks
│   │   ├── role.service.ts        # Role CRUD
│   │   ├── permission.registry.ts # Central permission registry
│   │   ├── policy.engine.ts       # ABAC + PBAC evaluation
│   │   ├── guards/
│   │   │   └── permission.guard.ts
│   │   └── decorators/
│   │       └── require-permission.decorator.ts
│   │
│   ├── billing/
│   │   ├── billing.module.ts
│   │   ├── subscription.service.ts
│   │   ├── payment.service.ts
│   │   ├── plan.service.ts
│   │   ├── invoice.service.ts
│   │   ├── providers/
│   │   │   ├── stripe.adapter.ts
│   │   │   └── razorpay.adapter.ts
│   │   └── revenue-share.service.ts
│   │
│   ├── storage/
│   │   ├── storage.module.ts
│   │   ├── storage.service.ts
│   │   └── providers/
│   │       ├── s3.adapter.ts
│   │       └── gcs.adapter.ts
│   │
│   ├── events/
│   │   ├── events.module.ts
│   │   ├── event-bus.service.ts   # BullMQ / Redis Streams
│   │   ├── event.decorator.ts     # @EventSubscriber()
│   │   └── event-store.service.ts # Persists events to DB
│   │
│   ├── audit/
│   │   ├── audit.module.ts
│   │   ├── audit.service.ts       # Immutable log writer
│   │   └── audit.decorator.ts     # @Auditable()
│   │
│   ├── scheduler/
│   │   ├── scheduler.module.ts
│   │   └── scheduler.service.ts   # BullMQ scheduled jobs
│   │
│   ├── workflow/
│   │   ├── workflow.module.ts
│   │   ├── workflow.service.ts    # CRUD for workflow definitions
│   │   ├── workflow.runner.ts     # Executes workflow steps
│   │   ├── workflow.actions.ts    # Built-in action registry
│   │   └── step-handlers/
│   │       ├── action.handler.ts
│   │       ├── delay.handler.ts
│   │       └── branch.handler.ts
│   │
│   └── security/
│       ├── secrets.service.ts     # KMS / Vault integration
│       ├── encryption.service.ts  # AES-256 column encryption
│       └── pii.service.ts         # PII detection/masking
│
└── package.json
```

### `packages/services/` — Platform Services

```
packages/services/
├── src/
│   ├── ai/
│   │   ├── ai-gateway.service.ts
│   │   ├── llm-router.service.ts
│   │   ├── rag.service.ts
│   │   ├── memory.service.ts
│   │   ├── prompt-library.service.ts
│   │   ├── agent.service.ts
│   │   └── providers/
│   │       ├── openai.adapter.ts
│   │       ├── anthropic.adapter.ts
│   │       ├── gemini.adapter.ts
│   │       └── ollama.adapter.ts
│   │
│   ├── notifications/
│   │   ├── notification.service.ts
│   │   ├── template.service.ts
│   │   └── providers/
│   │       ├── sendgrid.adapter.ts
│   │       ├── ses.adapter.ts
│   │       ├── twilio-sms.adapter.ts
│   │       ├── twilio-whatsapp.adapter.ts
│   │       ├── firebase-push.adapter.ts
│   │       └── in-app.adapter.ts
│   │
│   ├── search/
│   │   ├── search.service.ts
│   │   └── providers/
│   │       ├── elasticsearch.adapter.ts
│   │       └── typesense.adapter.ts
│   │
│   ├── reports/
│   │   ├── report.service.ts
│   │   ├── report-builder.service.ts
│   │   └── exporters/
│   │       ├── pdf.exporter.ts
│   │       ├── csv.exporter.ts
│   │       └── excel.exporter.ts
│   │
│   └── integrations/
│       ├── webhook.service.ts
│       └── connectors/
│           ├── zapier.connector.ts
│           └── make.connector.ts
│
└── package.json
```

### `packages/plugin-engine/` — Plugin Engine

```
packages/plugin-engine/
├── src/
│   ├── loader/
│   │   ├── plugin-loader.service.ts  # Scans and loads plugins
│   │   └── manifest.validator.ts     # Validates manifest.json
│   ├── registry/
│   │   ├── plugin-registry.service.ts
│   │   └── menu-registry.service.ts
│   ├── sdk/
│   │   ├── plugin.base.ts            # Plugin base class
│   │   ├── metadata-engine.ts        # Entity registration
│   │   ├── ui-registry.ts            # Page/menu registration
│   │   └── capability.injector.ts    # Injects capabilities into plugins
│   ├── theme/
│   │   └── theme-engine.service.ts   # Resolves per-context themes
│   └── dynamic-ui/
│       ├── form-schema.service.ts     # Generates form JSON schema
│       ├── table-schema.service.ts    # Generates table definitions
│       └── dashboard-engine.service.ts
│
└── package.json
```

---

## `plugins/` — Business Plugins

### Standard Plugin Structure (every plugin follows this)

```
plugins/{plugin-name}/
├── manifest.json
├── backend/
│   ├── src/
│   │   ├── {plugin}.module.ts
│   │   ├── {entity}/
│   │   │   ├── {entity}.entity.ts
│   │   │   ├── {entity}.service.ts
│   │   │   ├── {entity}.repository.ts
│   │   │   ├── {entity}.controller.ts
│   │   │   └── dto/
│   │   │       ├── create-{entity}.dto.ts
│   │   │       └── update-{entity}.dto.ts
│   │   └── index.ts
│   ├── tsconfig.json
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── widgets/
│   │   └── hooks/
│   └── package.json
├── database/
│   ├── migrations/
│   │   └── 001_initial.sql
│   ├── schema/
│   │   └── {entity}.schema.json    # Entity metadata definitions
│   └── seeds/
│       └── default.seed.ts
├── events/
│   ├── emitted.ts
│   └── subscribed.ts
├── permissions/
│   └── permissions.json
├── workflows/
│   └── default-workflows.json
├── cron/
│   └── jobs.json
├── policies/
│   └── policies.json
├── translations/
│   ├── en.json
│   └── ar.json
├── docs/
│   └── README.md
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── package.json
```

---

## `infra/` — Infrastructure

```
infra/
├── k8s/
│   ├── base/
│   │   ├── api-gateway/
│   │   ├── core/
│   │   ├── services/
│   │   ├── postgres/
│   │   ├── redis/
│   │   └── ingress/
│   ├── overlays/
│   │   ├── development/
│   │   ├── staging/
│   │   └── production/
│   └── helm/
│       └── orbitox/
│           ├── Chart.yaml
│           ├── values.yaml
│           └── templates/
│
├── terraform/
│   ├── modules/
│   │   ├── eks/
│   │   ├── rds-postgres/
│   │   ├── elasticache-redis/
│   │   ├── s3/
│   │   ├── cloudfront/
│   │   ├── vpc/
│   │   └── kms/
│   └── environments/
│       ├── dev/main.tf
│       ├── staging/main.tf
│       └── prod/main.tf
│
├── docker/
│   ├── core.Dockerfile
│   ├── services.Dockerfile
│   ├── web.Dockerfile
│   ├── gateway.Dockerfile
│   └── docker-compose.yml
│
└── observability/
    ├── prometheus/
    │   ├── prometheus.yml
    │   └── rules/
    ├── grafana/
    │   ├── dashboards/
    │   └── datasources/
    ├── loki/
    │   └── loki-config.yaml
    ├── tempo/
    │   └── tempo-config.yaml
    └── opentelemetry/
        └── otel-collector.yaml
```

---

## `tools/` — Developer Tools

```
tools/
├── cli/
│   ├── src/
│   │   ├── index.ts               # CLI entry point
│   │   ├── commands/
│   │   │   ├── new.ts
│   │   │   ├── create.ts
│   │   │   ├── install.ts
│   │   │   ├── upgrade.ts
│   │   │   ├── rollback.ts
│   │   │   ├── publish.ts
│   │   │   ├── migrate.ts
│   │   │   ├── seed.ts
│   │   │   ├── doctor.ts
│   │   │   ├── build.ts
│   │   │   ├── deploy.ts
│   │   │   ├── logs.ts
│   │   │   └── events.ts
│   │   └── templates/
│   │       ├── plugin/            # Plugin scaffold template
│   │       └── project/           # Full project scaffold template
│   └── package.json
│
└── codegen/
    ├── entity-generator/          # Generate entity from metadata JSON
    ├── api-generator/             # Generate REST API from entity
    └── migration-generator/       # Generate migration from schema diff
```

---

## Package Dependency Graph

```
@orbitox/types         (no dependencies)
     ↑
@orbitox/utils         (imports: @orbitox/types)
     ↑
@orbitox/core          (imports: @orbitox/types, @orbitox/utils)
     ↑
@orbitox/services      (imports: @orbitox/core, @orbitox/types, @orbitox/utils)
     ↑
@orbitox/plugin-engine (imports: @orbitox/core, @orbitox/services, @orbitox/types, @orbitox/utils)
     ↑
@orbitox/ui            (imports: @orbitox/types)
     ↑
plugins/*              (imports: @orbitox/core, @orbitox/services, @orbitox/plugin-engine, @orbitox/ui, @orbitox/types, @orbitox/utils)
     ↑
apps/*                 (imports: any package)

FORBIDDEN:
plugins/* → other plugins/*
@orbitox/core → @orbitox/services
@orbitox/core → @orbitox/plugin-engine
```

---

*Return to: [README — Master Index](./README.md)*
