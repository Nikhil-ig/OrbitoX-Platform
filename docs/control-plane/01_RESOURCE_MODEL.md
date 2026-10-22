# 🪐 Universal Resource Model & Identity Specification (CP-01)
**Classification: Platform Core Data Contracts**

---

## 1. Universal Resource Identity

Every managed resource in OrbitoX adheres to a canonical identity structure with immutable correlation prefixes:

```typescript
export interface UniversalResource<TState = unknown, TConfig = unknown> {
  // 1. Identity & Scope
  readonly resourceId: string;       // e.g. proj_01J7X4A8B9, env_01J7X4A8B9, pkg_01J...
  readonly resourceType: ResourceType; // PROJECT, ENVIRONMENT, PACKAGE, SERVICE, API, KEY, CREDENTIAL, etc.
  readonly resourceVersion: number;   // Monotonic integer for optimistic concurrency
  
  // 2. Ownership & Hierarchy
  readonly owner: string;             // User or service actor who provisioned
  readonly organizationId: string;    // Root legal tenant
  readonly projectId?: string;        // Scoped project (if applicable)
  readonly environmentId?: string;    // Scoped environment (if applicable)
  
  // 3. Declarative State Management
  desiredState: TConfig;              // What the administrator configured
  observedState?: TState;             // What the runtime observes in real-world infrastructure
  driftState: DriftState;             // IN_SYNC | DRIFTED | RECONCILING | BLOCKED | FAILED
  
  // 4. Lifecycle & Governance
  lifecycleStatus: LifecycleState;    // PROVISIONING | ACTIVE | SUSPENDED | DEPRECATING | ARCHIVED
  effectivePolicyId?: string;         // Pointer to resolved policy snapshot
  
  // 5. Timestamps
  createdAt: string;
  updatedAt: string;
}
```

### Resource Identifier Prefixes

| Resource Type | ID Prefix | Example Identifier |
| :--- | :--- | :--- |
| Organization | `org_` | `org_01j7x4a8b9c0d1e2` |
| Project | `proj_` | `proj_01j7x4a8b9c0d1e2` |
| Environment | `env_` | `env_01j7x4a8b9c0d1e2` |
| Package Definition | `pkg_` | `pkg_restaurant_core` |
| Package Installation | `pinst_` | `pinst_01j7x4a8b9c0d1e2` |
| Service | `svc_` | `svc_api_gateway_01` |
| API Endpoint | `api_` | `api_rest_orders_create` |
| API Capability | `cap_` | `cap_orders_write` |
| Machine API Key | `key_` | `key_live_01j7x4a8b9` |
| Credential Envelope | `cred_` | `cred_stripe_prod_01` |
| Custom Domain | `dom_` | `dom_dine_aurabistro` |
| Cluster / Server Node | `node_` | `node_mumbai_az1_04` |
| Plan Contract | `plan_` | `plan_growth_v2` |
| Policy Contract | `pol_` | `pol_rate_strict_prod` |
| Execution Plan | `exec_` | `exec_01j7x4a8b9c0d1e2` |
