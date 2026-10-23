# OrbitoX Platform Public Routes Allowlist

As part of the **Phase 2 Security Hardening** initiative, OrbitoX operates under a strict **Default-Deny** security posture. Every HTTP endpoint across the platform requires cryptographic authentication unless explicitly defined in this authoritative document.

---

## Zero-Trust Public Access Invariants

1. **Empty Effective Scopes:** Any request routed to a public endpoint receives `scopes: []`. Public callers are **NEVER** granted platform capabilities or wildcard scopes (`['*']`).
2. **Anonymous Rate Limiting:** All public endpoints are rate-limited strictly by client IP address (`ip:<clientIp>`) with sliding-window protection.
3. **No Credential Acceptance via URL:** Public routes do not accept or evaluate credentials passed via URL query parameters (`?apiKey=...`).
4. **Header Sanitization:** Baseline security headers (`X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`) are attached to every public response.

---

## Authoritative Public Endpoints

| HTTP Method | Route Path | Service ID | Security Justification |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/openapi.json` | `openapi` | Public API contract and OpenAPI 3.1 specification for external developer documentation and client SDK generation. Contains no private endpoints, keys, or internal cluster secrets. |
| `GET` | `/api/v1/health` | `health` | Liveness and readiness health probe utilized by load balancers, Kubernetes ingress controllers, and uptime monitors. Returns only service operational state and uptime; leaks no internal configuration. |
| `GET` | `/api/v1/projects/[projectId]/health` | `project-health` | Subsystem health probe used by external customer monitoring systems to verify runtime connection, sync status, and latency. |

---

## Formally Revoked Public Routes (F11 Remediation)

The following routes previously declared `allowPublic: true` in legacy code, allowing unauthenticated anonymous access to confidential infrastructure data. They have been hardened to require explicit cryptographic credentials and mandatory scoped permissions:

| Former Route | Required Scope | Enforcement |
| :--- | :--- | :--- |
| `GET /api/v1/platform/credentials` | `platform.credentials.read` | 401 if unauthenticated; 403 if missing scope |
| `GET /api/v1/platform/entitlements` | `platform.entitlements.read` | 401 if unauthenticated; 403 if missing scope |
| `GET /api/v1/platform/ai` | `platform.ai.read` | 401 if unauthenticated; 403 if missing scope |
| `GET /api/v1/platform/audit` | `platform.audit.read` | 401 if unauthenticated; 403 if missing scope |
| `GET /api/v1/platform/changesets` | `platform.changesets.read` | 401 if unauthenticated; 403 if missing scope |
| `GET /api/v1/platform/packages` | `platform.packages.read` | 401 if unauthenticated; 403 if missing scope |
| `GET /api/v1/platform/approvals` | `platform.approvals.read` | 401 if unauthenticated; 403 if missing scope |
| `GET /api/v1/platform/api-keys` | `platform.keys.read` | 401 if unauthenticated; 403 if missing scope |
| `GET /api/v1/platform/api-keys/[id]` | `platform.keys.read` | 401 if unauthenticated; 403 if missing scope |
| `GET /api/v1/platform/projects` | `platform.projects.read` | 401 if unauthenticated; 403 if missing scope |
| `GET /api/v1/platform/projects/[id]` | `platform.projects.read` | 401 if unauthenticated; 403 if missing scope |
| `GET /api/v1/platform/projects/[id]/effective-plan` | `platform.projects.read` | 401 if unauthenticated; 403 if missing scope |
| `GET /api/v1/platform/plugins` | `platform.plugins.read` | 401 if unauthenticated; 403 if missing scope |
| `GET /api/v1/platform/blueprints` | `platform.blueprints.read` | 401 if unauthenticated; 403 if missing scope |
| `GET /api/v1/platform/security` | `platform.security.read` | 401 if unauthenticated; 403 if missing scope |

---

## Proposing New Public Endpoints

To add any new route to this public allowlist:
1. Submit an architectural RFC proving that anonymous unauthenticated access is strictly required for core business functionality (e.g. public storefront catalog or webhook receiver).
2. The endpoint must declare `public: true` in its guard options.
3. The endpoint must be documented in this table with an explicit security justification and risk assessment.
