# 🪐 OrbitoX Platform Console: Legacy-to-Modern Route Map Specification (Stage 7D — Step A)

**Stage**: Phase 7D — Step A (Route Mapping & Permanent 301 Redirects)  
**Governing Specification**: Stage 7D Technical Lead Brief & `docs/console/parity.md` (Step C0 Parity Census)  
**Target Visual & Shell Architecture**: `@orbitox-io/ui` `AppShell` with Unified Operator Navigation  
**Status**: Step A Complete — Ready for Verification & Owner Sign-Off  

---

## 1. Executive Summary

Historically, operator capabilities in OrbitoX were divided across two legacy application surfaces:
1. **Legacy Admin Console (`/admin/*`)**: 16 routes created during early prototyping for mock marketplace plugins, early service health, and experimental quota sliders.
2. **Platform Management Console (`/platform/*`)**: 24 routes created during enterprise multi-tenant rollout for zero-trust provisioning, Ed25519 cryptographic security, and RBAC enforcement.

Together with the modern `/console/settings/appearance` engine (built and accepted in Stage 7B.1), this constitutes exactly **41 surveyed routes**.

In **Stage 7D Step A**, all 41 routes are mapped to their definitive architectural dispositions and destination endpoints. All legacy paths configured for consolidation or deprecation are bound to **HTTP 301 Permanent Redirects** within `apps/platform/next.config.ts` and the application entrypoints, ensuring that:
- **Zero dead links / zero 404s**: Every legacy bookmark, internal link, or automated caller resolves cleanly.
- **Immediate redirection to `@orbitox-io/ui` console**: Legacy callers land directly on modern equivalents (`/console/overview`, `/console/tenants`, `/console/security`, `/console/provisioning`, `/console/billing`, `/console/audit`, `/console/settings/appearance`).
- **Zero regressions on auth & security**: The operator authentication barrier at `/platform/login` is preserved intact (`200 OK`), and held prototypes remain accessible as labelled placeholders.

---

## 2. Complete 41-Route Master Mapping & Redirection Matrix

| # | Legacy URL / Pattern | Surface | Disposition | Target URL / Destination | HTTP Status | Target Capability / Screen |
|---|---|---|---|---|---|---|
| 1 | `/admin` | Legacy Admin | **Merge** | `/console/overview` | 301 Permanent | Fleet telemetry, throughput, alerts (`A1`) |
| 2 | `/admin/api-keys` | Legacy Admin | **Merge** | `/console/security` | 301 Permanent | Ed25519 keys, API tokens, single-reveal (`C6`) |
| 3 | `/admin/audit` | Legacy Admin | **Merge** | `/console/audit` | 301 Permanent | Unified tamper-evident audit trail |
| 4 | `/admin/business` | Legacy Admin | **Merge** | `/console/tenants` | 301 Permanent | Tenant plugin sub-view (`C2`) |
| 5 | `/admin/business/:category` | Legacy Admin | **Merge** | `/console/tenants` | 301 Permanent | Tenant category plugin configuration (`C2`) |
| 6 | `/admin/business/:category/:providerId` | Legacy Admin | **Merge** | `/console/tenants` | 301 Permanent | Tenant provider integration detail (`C2`) |
| 7 | `/admin/developer-apis` | Legacy Admin | **Merge** | `/console/security` | 301 Permanent | OpenAPI spec explorer & developer tools (`C6`) |
| 8 | `/admin/marketplace` | Legacy Admin | **HOLD** | `/admin/marketplace` | 200 (Held Page) | Architectural freeze: replaced in `C2` & `C3` |
| 9 | `/admin/projects` | Legacy Admin | **Merge** | `/console/tenants` | 301 Permanent | Multi-tenant environments directory (`C2`) |
| 10 | `/admin/projects/create` | Legacy Admin | **Merge** | `/console/provisioning` | 301 Permanent | Asynchronous tenant factory saga (`C4`) |
| 11 | `/admin/projects/:projectId` | Legacy Admin | **Merge** | `/console/tenants/:projectId` | 301 Permanent | Deep tenant telemetry & controls (`C2`) |
| 12 | `/admin/quotas` | Legacy Admin | **Merge** | `/console/tenants` | 301 Permanent | Tenant quota & resource limit controls (`C2`) |
| 13 | `/admin/restaurant` | Legacy Admin | **HOLD** | `/admin/restaurant` | 200 (Held Page) | Architectural freeze: replaced in `C2` (`plugin=@orbitox/pos`) |
| 14 | `/admin/services` | Legacy Admin | **Merge** | `/console/overview` | 301 Permanent | Cluster microservice health strip (`A1`) |
| 15 | `/admin/services/:serviceId` | Legacy Admin | **Merge** | `/console/overview` | 301 Permanent | Service telemetry & status drawer (`A1`) |
| 16 | `/admin/system` | Legacy Admin | **Merge** | `/console/settings/appearance` | 301 Permanent | Platform configuration & appearance (`Settings`) |
| 17 | `/platform` | Legacy Platform | **Merge** | `/console/overview` | 301 Permanent | Master operator dashboard (`A1`) |
| 18 | `/platform/ai` | Legacy Platform | **HOLD** | `/platform/ai` | 200 (Held Page) | Architectural freeze: preserved intact until Stage 7G (*Ask OrbitoX*) |
| 19 | `/platform/api-keys` | Legacy Platform | **Migrate** | `/console/security` | 301 Permanent | Cryptographic API keys & signing keypairs (`C6`) |
| 20 | `/platform/approvals` | Legacy Platform | **Merge** | `/console/provisioning` | 301 Permanent | Step-up operator approval queue (`C4`) |
| 21 | `/platform/audit` | Legacy Platform | **Migrate** | `/console/audit` | 301 Permanent | Filterable platform compliance audit feed |
| 22 | `/platform/configuration` | Legacy Platform | **Merge** | `/console/settings/appearance` | 301 Permanent | Runtime JSON parameters & settings (`Settings`) |
| 23 | `/platform/connect` | Legacy Platform | **Merge** | `/console/security` | 301 Permanent | Bridge protocol diagnostic & auth tokens (`C6`) |
| 24 | `/platform/credentials` | Legacy Platform | **Merge** | `/console/security` | 301 Permanent | Vault credentials & secret management (`C6`) |
| 25 | `/platform/explorer` | Legacy Platform | **Drop** | `/console/overview` | 301 Permanent | Dropped (RLS isolation bypass risk) |
| 26 | `/platform/fleet` | Legacy Platform | **Merge** | `/console/overview` | 301 Permanent | Instance telemetry & health monitoring (`A1`) |
| 27 | `/platform/login` | Legacy Platform | **Retain** | `/platform/login` | 200 (Retained) | Operator session auth & TOTP barrier |
| 28 | `/platform/observability` | Legacy Platform | **Merge** | `/console/overview` | 301 Permanent | Lollipop charts, p99 latency, request rates (`A1`) |
| 29 | `/platform/operations` | Legacy Platform | **Migrate** | `/console/provisioning` | 301 Permanent | Operation pipelines, vertical stepper (`C4`) |
| 30 | `/platform/packages` | Legacy Platform | **Drop** | `/console/overview` | 301 Permanent | Dropped (CI/CD concerns, not operator runtime) |
| 31 | `/platform/plans` | Legacy Platform | **Merge** | `/console/billing` | 301 Permanent | Tier catalog & entitlement matrix (`C3`) |
| 32 | `/platform/projects` | Legacy Platform | **Merge** | `/console/tenants` | 301 Permanent | Fleet projects & tenant directory (`C2`) |
| 33 | `/platform/projects/:projectId` | Legacy Platform | **Merge** | `/console/tenants/:projectId` | 301 Permanent | Tenant detail & dangerous action controls (`C2`) |
| 34 | `/platform/restaurants` | Legacy Platform | **Merge** | `/console/tenants` | 301 Permanent | POS tenant instances (`plugin=@orbitox/pos`) (`C2`) |
| 35 | `/platform/restaurants/:id` | Legacy Platform | **Merge** | `/console/tenants/:id` | 301 Permanent | POS tenant detail view (`C2`) |
| 36 | `/platform/security` | Legacy Platform | **Migrate** | `/console/security` | 301 Permanent | Key rotation & session security controls (`C6`) |
| 37 | `/platform/settings` | Legacy Platform | **Migrate** | `/console/settings/appearance` | 301 Permanent | System theme, mode, density, flags (`Settings`) |
| 38 | `/platform/tenants` | Legacy Platform | **Migrate** | `/console/tenants` | 301 Permanent | Multi-tenant cluster manager (`C2`) |
| 39 | `/platform/tenants/new` | Legacy Platform | **Migrate** | `/console/tenants` | 301 Permanent | Tenant bootstrap wizard (`C2`) |
| 40 | `/platform/tests` | Legacy Platform | **Drop** | `/console/overview` | 301 Permanent | Dropped (replaced by CI/CD Vitest & Playwright) |
| 41 | `/console/settings/appearance` | Modern Console | **Live** | `/console/settings/appearance` | 200 (Live) | Interactive appearance controls (Stage 7B.1) |

---

## 3. Disposition Category Breakdown

| Surface / Category | Count | Breakdown & Distribution |
|---|---|---|
| **Legacy Admin (`/admin/*`)** | **16** | • 14 Merge (`/admin`, `api-keys`, `audit`, `business`, `business/:category`, `business/:category/:providerId`, `developer-apis`, `projects`, `projects/create`, `projects/:projectId`, `quotas`, `services`, `services/:serviceId`, `system`)<br>• 2 Hold (`/admin/marketplace`, `/admin/restaurant`) |
| **Legacy Platform (`/platform/*`)** | **24** | • 12 Merge (`/platform`, `approvals`, `configuration`, `connect`, `credentials`, `fleet`, `observability`, `plans`, `projects`, `projects/:projectId`, `restaurants`, `restaurants/:id`)<br>• 7 Migrate (`/platform/api-keys`, `/platform/audit`, `/platform/operations`, `/platform/security`, `/platform/settings`, `/platform/tenants`, `/platform/tenants/new`)<br>• 1 Retain (`/platform/login`)<br>• 1 Hold (`/platform/ai`)<br>• 3 Drop (`/platform/explorer`, `/platform/packages`, `/platform/tests`) |
| **Modern Console (`/console/*`)** | **1** | • 1 Live (`/console/settings/appearance`) |
| **Total Census** | **41** | **Exact match with `docs/console/parity.md` route census** |

---

## 4. Technical Implementation Architecture

### 4.1 Next.js Configuration (`apps/platform/next.config.ts`)
Redirects are declared natively within the Next.js routing pipeline (`async redirects()`). Because Next.js evaluates configuration-level redirects before file-system page matching:
- Incoming HTTP requests to merged, migrated, or dropped legacy paths are immediately redirected with **HTTP 301**.
- The redirect targets point directly to the canonical `/console/*` routes.
- Query parameters (e.g. `?tenant=...`, `?page=...`) are preserved by Next.js path matching.

### 4.2 Entrypoint Alignment (`apps/platform/src/app/(console)/admin/page.tsx`)
In addition to the declarative Next.js redirect in `next.config.ts`, `apps/platform/src/app/(console)/admin/page.tsx` was updated to invoke `redirect('/console/overview')`, replacing the legacy `redirect('/platform')`. This guarantees that in all execution contexts, `/admin` lands on the modern console overview.

### 4.3 Preservation of Retained & Held Surfaces
1. **`/platform/login`**: Retained as the production authentication barrier. Unchanged, returns `200 OK`.
2. **`/admin/marketplace`**: Marked `[HOLD]`. Renders a clear informational notice explaining that tenant plugin management is transitioning to `C2` and `C3`.
3. **`/admin/restaurant`**: Marked `[HOLD]`. Renders the architecture boundary notice directing operators to `projects/external-os/restaurant-os` and `C2` tenant filters.
4. **`/platform/ai`**: Marked `[HOLD]`. Retained functional until Stage 7G introduces the Model Context Protocol (MCP) *Ask OrbitoX* assistant.

---

## 5. Verification & Test Suite

The automated test suite `apps/platform/tests/integration/legacy-routes-redirect.test.ts` exercises all 41 routes against the running platform instance:
1. **Redirect Validation (`redirect: 'manual'`)**: Confirms every redirected legacy route returns HTTP 301 (or 308) with a valid `Location` header pointing to `/console/...`.
2. **End-to-End Resolution (`redirect: 'follow'`)**: Confirms following redirects resolves to HTTP 200 with zero 404s.
3. **Retained & Held Page Resolution**: Confirms `/platform/login`, `/admin/marketplace`, `/admin/restaurant`, and `/platform/ai` resolve directly without 404.

