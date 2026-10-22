# 🪐 OrbitoX Control Plane Brain v4.1 — Production Gap Analysis (CP-25)
**Classification: Authoritative Reality Check & State Traceability Audit**
**Date: October 2026 | Milestone: v4.0 Audit & v4.1 Integration Scope**

---

## 1. Executive Summary

The v4.0 milestone successfully engineered the **algorithmic brain** of the OrbitoX Control Plane:
- The directed acyclic graph (`ResourceGraphService`) with cycle prevention and bidirectional traversal.
- The risk scoring and blast radius engine (`ImpactAnalysisService`).
- The four-tier policy inheritance resolver (`PolicyResolutionService`).
- The 17-step idempotent mutation lifecycle (`CommandBusService`).
- The continuous drift detection and self-healing loop (`ReconciliationService`).

However, as revealed in the v4.0 architecture audit:
> **The v4.0 graph was populated via an in-memory seed of 22 nodes.**

In v4.0, the graph demonstrated relationships conceptually, but was not yet the **materialized operational projection** of the actual underlying platform systems. Independent admin endpoints existed alongside the brain without unified projection.

**Milestone v4.1 Objective:**
Convert the ResourceGraph from a seeded standalone prototype into a **dynamic, restart-reconstructible, authoritative projection** driven by PostgreSQL / `PlatformRepository`, `PlanService`, package/plugin manifests, encrypted vaults, edge DNS/TLS verifiers, and cluster runtime agents.

---

## 2. Definitive Capability Gap Matrix

Every platform capability is classified into its exact operational reality:
- **REAL**: Fully functional business logic executing actual cryptographic/state operations.
- **PERSISTED**: Saved in durable database / repository storage that survives restarts.
- **CONNECTED**: Integrated directly into the Control Plane ResourceGraph and CommandBus.
- **SEEDED**: Populated with mock/dummy objects for demonstration.
- **MOCKED**: Hardcoded response without backing service execution.
- **IN-MEMORY**: Stores state in ephemeral Node.js memory.
- **SIMULATED**: Calculates theoretical outcomes without touching runtime infrastructure.
- **HARDCODED**: Static values embedded directly in code.
- **PARTIALLY IMPLEMENTED**: Basic interface exists, edge cases or backend integrations pending.

| Capability | Current State | Source of Truth | Persistent? | Real API? | Real Runtime? | Action Required for v4.1 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Project Management** | REAL / PERSISTED | `PlatformRepository` / Prisma `PlatformProject` | Yes (Disk / In-memory Store) | Yes (`/api/v1/platform/projects`) | Real | Project into ResourceGraph; eliminate static seed `proj_omni`. |
| **Environment Lifecycle** | REAL / PERSISTED | `PlatformRepository` / `ProjectEnvironment` | Yes | Yes (Nested under projects) | Real | Project prod/stage/dev into DAG with `CONTAINS` edges. |
| **Plan Definition & Tiers** | REAL / PARTIALLY CONNECTED | `PlanService` (`@orbitox/core/billing`) | Yes (`Plan` records) | Yes | Real | Materialize Starter, Growth, Pro, Enterprise, Hyperscale into DAG. |
| **Plan Entitlement Engine** | SIMULATED in v4.0 | Plan Limits + Project PlanTier | Partial | Yes (`/api/v1/platform/policy`) | Backend Logic | Implement preflight downgrade validator and capability check. |
| **Machine API Keys** | REAL / PERSISTED | `PlatformRepository` + `PlatformKeyEngine` | Yes (HMAC verifier + Salt) | Yes (`/api/v1/platform/api-keys`) | Real Cryptography | Project keys into DAG; connect to environments and capabilities. |
| **API Key "Why?" Explanation** | SIMULATED in v4.0 | Key Capabilities ∩ Plan ∩ Policies | Partial | No (Derived locally in UI) | Backend Logic | Implement backend-authoritative intersection and explanation API. |
| **Credential Vault** | REAL / PERSISTED | `CredentialVault` (AES-256-GCM Envelope) | Yes (Ciphertext + IV + Tag) | Yes (`/api/v1/platform/credentials`) | Real Crypto (KMS/DEK) | Project credentials into DAG; link to consuming services. |
| **Credential Staged Rotation** | PARTIALLY IMPLEMENTED | `PlatformRepository` + Vault | Yes | Partial | Partial | Implement staged lifecycle: replacement -> validation -> retirement. |
| **Package Catalog** | REAL / PERSISTED | `PlatformRepository.packages` + Plugin Manifests | Yes | Yes (`/api/v1/platform/packages`) | Real (Tarball SHA256 + Ed25519) | Ingest package catalog + manifests directly into DAG. |
| **Package Installations** | REAL / PERSISTED | `PlatformRepository.packageInstallations` | Yes | Yes | Real | Project real installations into DAG with `INSTALLED_IN` edges. |
| **Package Upgrade Plan** | IN-MEMORY SIMULATION | Control Plane `ImpactAnalysisService` | No | Yes (`/api/v1/platform/impact`) | Dry Run | Connect package upgrade to version diff, schema migrator, and DAG. |
| **Custom Domains** | REAL / PERSISTED | `PlatformRepository.domains` | Yes | Yes | Real (DNS/TLS probe state) | Project domains into DAG with `ROUTES_TO` to environments. |
| **DNS / TLS Observation** | SIMULATED | `ProjectDomainRecord.verificationStatus` | Yes | Partial | Simulated Prober | Distinguish DESIRED DNS from OBSERVED DNS in graph state. |
| **Compute Nodes / Servers** | SEEDED in v4.0 | Static nodes in `ResourceGraphService` | No | Partial (`/api/v1/platform/resources`) | Seeded | Register real cluster infrastructure nodes in `ResourceRegistry`. |
| **Node Drain Lifecycle** | SIMULATED in v4.0 | In-memory `drainState` | No | Yes (via CommandBus) | Simulated | Implement capacity calculations and drained service migration analysis. |
| **Service Registry** | HARDCODED SEED | `ResourceGraphService.bootstrapPlatformGraph` | No | Yes (`/api/v1/platform/resources`) | Seeded | Connect services to installed packages and cluster nodes dynamically. |
| **Service Desired vs Observed** | MOCKED in v4.0 | Static desired `{ replicas: 3 }` | No | Yes | Mocked | Implement observed state reconciler comparing live runtime to desired. |
| **Resource Graph State** | IN-MEMORY DAG | In-memory maps (`nodes`, `edges`) | No | Yes (`/api/v1/platform/resources`) | In-Memory | Build `ResourceGraphProjector` from authoritative DB; add `rebuild()`. |
| **Graph Lifecycle States** | MISSING in v4.0 | None (Always implicitly ready) | No | No | Missing | Implement `GRAPH_BUILDING`, `GRAPH_READY`, `GRAPH_DEGRADED`, `GRAPH_CORRUPT`. |
| **Graph Consistency Verification** | MISSING in v4.0 | None | No | No | Missing | Implement `verifyGraphIntegrity()`: detect broken edges, orphans, cycles. |
| **Platform Command Bus** | REAL / CONNECTED | `CommandBusService` (17-step pipeline) | No (Execution history ephemeral) | Yes (`/api/v1/platform/commands`) | Real Bus | Add registered extensible command handlers with rollback callbacks. |
| **Four-Eyes Approvals** | REAL / PERSISTED | `ApprovalEngine` (`platform-governance.ts`) | Yes | Yes (`/api/v1/platform/approvals`) | Real Engine | Interconnect CommandBus gating directly to `ApprovalEngine`. |
| **Cryptographic Audit Ledger** | REAL / PERSISTED | `AuditService` (SHA-256 Merkle chain) | Yes | Yes (`/api/v1/platform/audit`) | Real Cryptography | Single authoritative audit ledger wired to all CommandBus steps. |
| **Reconciliation Engine** | REAL / CONNECTED | `ReconciliationService` | No | Yes (`/api/v1/platform/reconcile`) | Real Loop | Classify actions (SAFE, CONTROLLED, APPROVAL_REQUIRED, MANUAL_ONLY). |
| **Cross-Resource Search** | MISSING in v4.0 | None | No | No | Missing | Implement `GET /api/v1/platform/search` across projects, keys, pkgs, doms. |
| **Global Drift Dashboard** | PARTIAL | Calculated per-node in memory | No | No | Partial | Implement `GET /api/v1/platform/drift` grouping IN_SYNC, DRIFTED, BLOCKED. |
| **AI / MCP Gateway** | REAL / CONNECTED | `/api/v1/platform/ai/tools` | No | Yes | Real | AI operations strictly routed through CommandBus preflight and execution. |

---

## 3. Core Architectural Fixes Required for v4.1

### Gap 1: In-Memory Seed Elimination
- **Current**: `ResourceGraphService.constructor()` runs `bootstrapPlatformGraph()` with 22 hardcoded seed nodes (`proj_omni`, `proj_med`, `pkg_restaurant`, etc.).
- **Fix**: Replace seed initialization with `ResourceGraphProjector.projectFromAuthoritativeSources()`, which reads:
  1. `PlatformRepository.listOrganizations()`
  2. `PlatformRepository.listProjects()`
  3. `PlatformRepository.listEnvironments()`
  4. `PlatformRepository.listApiKeys()`
  5. `PlatformRepository.listCredentials()`
  6. `PlatformRepository.listPackages()` & `listPackageVersions()`
  7. `PlatformRepository.listInstallations()`
  8. `PlatformRepository.listDomains()`
  9. `PlanService.listActivePlans()`
  10. Real registered Services and Compute Nodes.

### Gap 2: Reconstruction Upon Application Restart
- **Current**: If the process restarts, any mutated graph nodes or custom registered resources revert to the seed state.
- **Fix**: The graph is a **materialized projection**. On startup (and via `POST /api/v1/platform/resources/rebuild`), the graph wipes its transient DAG and re-projects all nodes and edges from authoritative sources, validating integrity and transitioning from `GRAPH_BUILDING` to `GRAPH_READY`.

### Gap 3: Authoritative Key Authorization ("Why can this key do this?")
- **Current**: The UI shows capabilities based on hardcoded badge lists.
- **Fix**: Implement `getEffectiveKeyAuthorization(keyId, capability)`:
  $$\text{EffectiveAccess} = \text{RequestedCapability} \cap \text{PlatformPolicy} \cap \text{PlanEntitlement} \cap \text{ProjectPolicy} \cap \text{EnvironmentPolicy} \cap \text{KeyPolicy}$$
  Expose explanation endpoint `GET /api/v1/platform/resources/:id/effective-policy`.

### Gap 4: Plan Downgrade Preflight Enforcement
- **Current**: Plans are stored without validating environment or package overflow.
- **Fix**: Implement preflight downgrade check:
  - Enterprise ($10$ envs, $20$ packages) $\to$ Growth ($3$ envs, $5$ packages).
  - If current resources exceed target limits, return `BLOCKED` with specific active environments and required migration actions.

### Gap 5: Extensible Command Handlers
- **Current**: `CommandBusService` executes an internal execution block.
- **Fix**: Support registered command handlers for every major platform mutation (`plan.publish`, `plan.downgrade`, `package.install`, `package.upgrade`, `package.rollback`, `service.scale`, `service.drain`, `key.create`, `key.rotate`, `key.revoke`, `credential.rotate`, `domain.verify`, `domain.activate`, `node.drain`, `environment.freeze`).

---

## 4. Verification Gate

v4.1 will be accepted when:
1. `ResourceGraph` is reconstructed 100% from authoritative sources with 0 seed dependencies.
2. A simulated restart destroys the DAG and reconstructs it identically with complete relationship integrity.
3. Graph integrity check (`POST /api/v1/platform/resources/verify`) passes with 0 orphan edges or cycle violations.
4. Key authorization explanation returns exact derivation trees ("Allowed because: Plan Enterprise ✓, Environment Prod ✓...").
5. Plan downgrade preflight blocks invalid downgrades with detailed blast radius reports.
6. Monorepo builds pass cleanly with `tsconfig.prod.json`.
