# 🪐 Resource Graph & Relationship Engine (CP-02)
**Classification: Platform Core Data Contracts & Graph Topology**

---

## 1. Graph Model Definition

The OrbitoX **`ResourceGraph`** is an in-memory directed acyclic graph (DAG) backed by PostgreSQL and Redis. Every managed resource is a node, and every dependency, entitlement, or ownership relation is a typed, directed edge.

```
                    ┌─────────────────────────┐
                    │  PlatformOrganization   │
                    └───────────┬─────────────┘
                                │ OWNS
                                ▼
                    ┌─────────────────────────┐
                    │     PlatformProject     │
                    └───────────┬─────────────┘
                                │ CONTAINS
                                ▼
                    ┌─────────────────────────┐
                    │   ProjectEnvironment    │
                    └───────────┬─────────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         │ INSTALLED_IN         │ ROUTES_TO            │ AUTHORIZES
         ▼                      ▼                      ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│PackageInstallat. │   │  ProjectDomain   │   │  PlatformApiKey  │
└────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘
         │ DEPENDS_ON           │ SECURED_BY           │ BOUND_TO
         ▼                      ▼                      ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ PlatformPackage  │   │ TLS Certificate  │   │ Capability Set   │
└────────┬─────────┘   └──────────────────┘   └────────┬─────────┘
         │ EXPOSES                                     │ EXPOSES
         ▼                                             ▼
┌──────────────────┐                          ┌──────────────────┐
│ PlatformService  │                          │   API Endpoint   │
└────────┬─────────┘                          └──────────────────┘
         │ RUNS_ON
         ▼
┌──────────────────┐
│   Server Node    │
└──────────────────┘
```

---

## 2. Graph Edges & Traversal Semantics

| Edge Type | Source Node | Target Node | Blast Radius & Traversal Semantics |
| :--- | :--- | :--- | :--- |
| **`OWNS`** | Organization | Project | Deleting/suspending an Org cascades suspension to all owned projects. |
| **`CONTAINS`** | Project | Environment | Freezing a project freezes all child environments. |
| **`INSTALLED_IN`** | Package | Environment | Disabling a package impacts all environments hosting the installation. |
| **`DEPENDS_ON`** | Package A | Package B | Package A cannot be installed unless Package B is satisfied in the environment. |
| **`RUNS_ON`** | Service | Node | Draining a node triggers graceful migration for all hosted services. |
| **`EXPOSES`** | Service | API | Taking a service offline degrades all exposed APIs. |
| **`ROUTES_TO`** | Domain | Environment | Domain DNS drift or TLS failure halts edge traffic to the environment. |
| **`AUTHORIZES`** | Key | Capability | Revoking a key instantly denies requests for authorized capabilities. |
| **`BOUND_TO`** | Credential | Service | Rotating a secret notifies the consuming service to reload its DEK envelope. |
| **`ENTITLED_BY`**| Feature | Plan | Downgrading a plan checks whether any active project uses newly unentitled features. |
| **`LIMITED_BY`** | Environment | Policy | Effective rate limits are calculated by intersecting parent and environment policies. |

---

## 3. Core Graph Query Interfaces

```typescript
export interface IResourceGraphService {
  // 1. Dependency Resolution
  getDependencies(resourceId: string): Promise<GraphNode[]>;
  getDependents(resourceId: string): Promise<GraphNode[]>;

  // 2. Impact Analysis
  calculateImpact(action: string, resourceId: string): Promise<ImpactAssessment>;

  // 3. Topology & Trace
  tracePath(fromResourceId: string, toResourceId: string): Promise<GraphEdge[]>;
  getEnvironmentTopology(environmentId: string): Promise<EnvironmentTopology>;
}
```
