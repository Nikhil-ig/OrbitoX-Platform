# 🪐 OrbitoX Platform Control Center: Authorization & Trusted Context Model
**Document Ref: PCC-17**  
**Classification: Identity Verification, Zero-Trust Context & Scope Grammar**

---

## 1. Remediation of the Critical Tenant-Spoofing Vulnerability

During the initial repository audit, a critical flaw was identified in [`api-guard.ts#L553-L562`](../../orbitox/apps/web/app/api/v1/_lib/api-guard.ts#L553-L562):

```ts
// 🚨 VULNERABLE CODE IN CURRENT API-GUARD:
const urlTenant = req.nextUrl.searchParams.get('tenantId');
const headerTenant = req.headers.get('x-tenant-id') || req.headers.get('x-context-id');
const tenantId = urlTenant || headerTenant || ...;
```

**The Exploit**: An attacker possessing a valid API key for `Tenant A` could append `?tenantId=tenant_b` or pass `x-tenant-id: tenant_b` in HTTP headers. If the downstream database query filters by `tenantId`, the attacker bypasses multi-tenant boundaries.

### Corrected Architectural Law:
> **Client input must never dictate security context.**  
> The execution context is derived entirely on the server from the cryptographically verified machine key record.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CORRECTED TRUSTED CONTEXT RESOLUTION                     │
└─────────────────────────────────────────────────────────────────────────────┘

                  Client HTTP Request
                  [Authorization: Bearer orb_live_...]
                  [x-tenant-id: rogue_tenant_b] ──> (DISCARDED / UNTRUSTED)
                           │
                           ▼
            Cryptographic Key Verifier Match
                           │
                           ▼
            Server Retrieves Bound Key Record:
            • key.environmentId: "env_prod_01"
            • key.projectId:     "proj_omnideliver"
            • key.tenantScope:   ["tenant_omni_hq", "branch_delhi"]
                           │
                           ▼
          Does Key Record permit requested Tenant?
          (Default: context.tenantId = key.tenantScope[0])
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
    Client requests             Client omitted param or
    explicit ?tenantId=xyz      requested authorized scope
           │                               │
           ▼                               ▼
    Is 'xyz' in scope?              Bind Trusted Context:
    • NO  ──> 403 FORBIDDEN         session.tenantId = key.tenantId
    • YES ──> session.tenantId=xyz  session.projectId = key.projectId
                                    session.environmentId = key.envId
```

---

## 2. Tri-Factor Authorization Engine

Every incoming request against the Platform Control Center or platform APIs undergoes evaluation across three independent dimensions:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       TRI-FACTOR AUTHORIZATION MATRIX                       │
├─────────────────────┬───────────────────────────────────────────────────────┤
│ 1. OBJECT AUTH      │ Can this actor access this specific Project,          │
│                     │ Environment, or Package?                              │
├─────────────────────┼───────────────────────────────────────────────────────┤
│ 2. FUNCTION AUTH    │ Can this actor perform this specific Action           │
│                     │ (e.g., READ, MUTATE, ROTATE, SUSPEND)?                │
├─────────────────────┼───────────────────────────────────────────────────────┤
│ 3. PROPERTY AUTH    │ Can this actor modify this specific Field or Property │
│                     │ (e.g., Support Admin may view metadata but cannot     │
│                     │ modify IP Allowlist or reveal Verifier)?              │
└─────────────────────┴───────────────────────────────────────────────────────┘
```

The evaluation is executed via `@orbitox/core` [`PolicyEngine`](../../orbitox/packages/core/src/rbac/policy.engine.ts) and [`AbacEvaluator`](../../orbitox/packages/core/src/rbac/abac-evaluator.ts).

---

## 3. Typed Capability / Scope Model

Arbitrary string arrays (`scopes: string[]`) allow spelling bugs and unchecked privilege escalation. OrbitoX adopts a **Typed Capability Grammar**:

$$\text{Capability} := \langle\text{Package}\rangle.\langle\text{Resource}\rangle.\langle\text{Action}\rangle$$

### 3.1. Capability Catalog:
```ts
export type PlatformCapability =
  // Restaurant Engine
  | 'restaurant.orders.read'
  | 'restaurant.orders.create'
  | 'restaurant.orders.update'
  | 'restaurant.orders.cancel'
  | 'restaurant.menu.read'
  | 'restaurant.menu.manage'
  | 'restaurant.tables.view'
  | 'restaurant.tables.reserve'
  
  // Healthcare (HMS)
  | 'hms.patients.read'
  | 'hms.triage.execute'
  | 'hms.beds.allocate'
  | 'hms.pharmacy.dispense'
  
  // Commerce & Storefront
  | 'commerce.catalog.read'
  | 'commerce.catalog.manage'
  | 'commerce.checkout.initiate'
  | 'commerce.orders.fulfill'
  | 'commerce.payments.charge'
  
  // CRM & Sales
  | 'crm.leads.read'
  | 'crm.leads.create'
  | 'crm.deals.manage'
  
  // Inventory & Stock
  | 'inventory.stock.read'
  | 'inventory.stock.adjust'
  | 'inventory.warehouses.manage'
  
  // Platform Administration
  | 'platform.projects.view'
  | 'platform.projects.provision'
  | 'platform.keys.create'
  | 'platform.keys.rotate'
  | 'platform.keys.revoke'
  | 'platform.credentials.view'
  | 'platform.credentials.manage'
  | 'platform.packages.verify'
  | 'platform.audit.query';
```

### 3.2. Standard Capability Presets:
To streamline key creation in the UI wizard, capabilities are grouped into reusable presets:

```ts
export const CAPABILITY_PRESETS: Record<string, { label: string; capabilities: PlatformCapability[] }> = {
  'restaurant_read_only': {
    label: 'Restaurant Read-Only (Auditor / Display)',
    capabilities: ['restaurant.menu.read', 'restaurant.orders.read', 'restaurant.tables.view']
  },
  'restaurant_operator': {
    label: 'Restaurant Floor Operator (POS / KDS)',
    capabilities: [
      'restaurant.menu.read',
      'restaurant.orders.read',
      'restaurant.orders.create',
      'restaurant.orders.update',
      'restaurant.tables.reserve'
    ]
  },
  'ecommerce_integration': {
    label: 'E-Commerce ERP Sync',
    capabilities: [
      'commerce.catalog.read',
      'commerce.orders.fulfill',
      'inventory.stock.read',
      'inventory.stock.adjust'
    ]
  },
  'clinical_staff': {
    label: 'Hospital Clinical Staff',
    capabilities: [
      'hms.patients.read',
      'hms.triage.execute',
      'hms.beds.allocate'
    ]
  }
};
```

---

## 4. Platform Operator Role-Based Access Control (RBAC)

Platform operators accessing `/platform` are authenticated via user identity and assigned strong administrative roles:

| Platform Role | Scope & Permissions | Key Restrictions |
| :--- | :--- | :--- |
| **Root SuperAdmin** | Unrestricted platform access across all organizations, projects, and systems. | Critical mutations still require four-eyes second-operator approval. |
| **SecurityAdmin** | Full access to `/platform/security`, `/platform/api-keys`, `/platform/credentials`, `/platform/audit`. | Cannot provision client projects or alter billing subscriptions. |
| **PlatformAdmin** | Full access to `/platform/projects`, `/platform/packages`, `/platform/domains`, `/platform/quotas`. | Cannot view secret credentials or bypass four-eyes security gates. |
| **ReleaseManager** | Governs `/platform/packages`, release channels, version comparisons, and rollbacks. | Read-only access to customer projects and zero access to keys. |
| **SRE / DevOps** | Governs `/platform/observability`, cluster mesh topology, telemetry, and `/platform/tests`. | Cannot generate production API keys or mutate billing quotas. |
| **Auditor** | Read-only access across `/platform/audit`, security findings, and compliance reports. | Strictly prohibited from any state mutation. |
