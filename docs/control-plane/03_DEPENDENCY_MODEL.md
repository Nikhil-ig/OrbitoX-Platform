# 🪐 Dependency Model & Graph Traversal Specification (CP-03)
**Classification: Platform Core Data Contracts & Graph Topology**

---

## 1. Overview & Directed Acyclic Graph (DAG) Rules

The OrbitoX Control Plane enforces an explicit dependency model across all managed resources. No resource may be instantiated, activated, or mutated if its upstream prerequisites are unsatisfied. Conversely, no resource may be retired or removed without resolving downstream dependents.

```
Infrastructure (Nodes / Clusters)
        │ RUNS_ON
        ▼
   Platform Services
        │ EXPOSES
        ▼
    Service APIs & Packages
        │ EXPOSES / ENTITLES
        ▼
Capabilities & Features
        │ BINDS_TO
        ▼
Machine Keys & Project Environments
```

---

## 2. Dependency Taxonomy

| Dependency Class | Direction | Blocking Behavior | Example |
| :--- | :--- | :--- | :--- |
| **`HARD_RUNTIME`** | Service ➔ Service | Service fails health checks if dependency is down. | `RestaurantService` requires `PostgreSQL` and `Redis`. |
| **`PACKAGE_COMPATIBILITY`** | Package ➔ Package | Package installation fails if peer version is incompatible. | `@orbitox/restaurant` requires `@orbitox/pos >= 3.0.0`. |
| **`ENTITLEMENT`** | Project ➔ Plan | Capability is unentitled if not covered by active plan contract. | `restaurant.kds` requires `growth` plan or higher. |
| **`SECURITY_POLICY`** | Key ➔ Environment | Key generation fails if capability exceeds environment permissions. | Key requested `*.*.*` on a `development` scoped environment. |
| **`NETWORK_ROUTING`** | Domain ➔ DNS / TLS | Edge routing inactive until CNAME verification and TLS issuance succeed. | `dine.client.com` requires `CNAME cname.orbitox.io`. |
| **`SECRET_BINDING`** | Service ➔ Credential | Service starts in degraded mode if envelope secret is missing or expired. | `BillingService` requires `StripeLiveCredential`. |

---

## 3. Dependency Solving Algorithm

Before any package installation, service deployment, or plan downgrade:
1. Construct subgraph of candidate node and its direct/indirect prerequisites.
2. Check for circular dependencies (DAG cycle detection via Kahn's algorithm or DFS).
3. Validate version satisfaction (SemVer constraint resolution).
4. Verify environmental and physical resource capacities.
5. If unsatisfied, return detailed diagnostic stating:
   - Root failed dependency
   - Conflicting versions
   - Actionable resolution paths.
