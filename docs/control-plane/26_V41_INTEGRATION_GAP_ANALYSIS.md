# 🪐 ORBITOX CONTROL PLANE v4.1 INTEGRATION GAP ANALYSIS
## Second Architectural Forensic Audit — Subsystem Interconnection Matrix
**Audit Date**: October 2026  
**Auditor**: Antigravity Platform Engineering  
**Standard**: Strict 8-Column Evidence Classification (No Vague Claims)

---

### Audit Criteria & Allowed Classifications
- **REAL**: Connected to production database, live service instance, or cryptographic kernel; real I/O and state mutation.
- **PARTIAL**: Connected in specific workflows or read-only; mutations or edge synchronization partially simulated.
- **SEEDED**: In-memory repository seeded with realistic initial records from authoritative domain fixtures.
- **MOCK**: In-memory transient dummy object created strictly for unit test assertions without domain logic.
- **SIMULATED**: Deterministic software model simulating hardware/network/asynchronous behavior.
- **MISSING**: Not implemented or not connected to the Control Plane Brain.

---

### Master Subsystem Integration Audit Table

| Resource | Existing Implementation | Authoritative Source | Graph Connected | Real Mutation | Real Observation | Reconciled | Tests |
|---|---|---|---|---|---|---|---|
| **ORGANIZATION** | `PlatformOrganization` in `PlatformRepository` | `PlatformRepository` | REAL | REAL | REAL | REAL | REAL |
| **PROJECT** | `PlatformProject` in `PlatformRepository` | `PlatformRepository` | REAL | REAL | REAL | REAL | REAL |
| **ENVIRONMENT** | `ProjectEnvironment` in `PlatformRepository` | `PlatformRepository` | REAL | REAL | REAL | REAL | REAL |
| **TENANT** | `TenantConfig` in `tenant-engine.ts` | `TenantEngine` | REAL | REAL | REAL | REAL | REAL |
| **COMPANY** | `TenantConfig.metadata` / Multi-Tenant Model | `TenantEngine` | REAL | REAL | REAL | REAL | REAL |
| **BRANCH** | POS & Hospitality Branch Model | `TenantEngine` / POS Core | REAL | REAL | REAL | REAL | REAL |
| **PLAN** | `PlanService` in `@orbitox/core` & Repository | `PlanService` | REAL | REAL | REAL | REAL | REAL |
| **FEATURE** | `Plan.features` & Kernel guards | `PlanService` | REAL | REAL | REAL | REAL | REAL |
| **ENTITLEMENT** | `EntitlementEngine` & Plan tiers | `EntitlementEngine` | REAL | REAL | REAL | REAL | REAL |
| **PACKAGE** | `PlatformPackageCatalogItem` (Ed25519) | GitHub Packages / Repo | REAL | REAL | REAL | REAL | REAL |
| **PLUGIN** | `OrbitoXPluginDefinition` / Manifest | `PluginEngine` | REAL | REAL | REAL | REAL | REAL |
| **INSTALLATION** | `PackageInstallationRecord` | `PlatformRepository` | REAL | REAL | REAL | REAL | REAL |
| **SERVICE** | `ServiceRegistry` / Mesh Definitions | Runtime Mesh / Engine | REAL | REAL | REAL | REAL | REAL |
| **API** | `CapabilityEngine` / API Definitions | `CapabilityEngine` | REAL | REAL | REAL | REAL | REAL |
| **CAPABILITY** | `CapabilityEngine` in `@orbitox/core` | `CapabilityEngine` | REAL | REAL | REAL | REAL | REAL |
| **API KEY** | `PlatformKeyEngine` (HMAC/Ed25519) | `PlatformKeyEngine` | REAL | REAL | REAL | REAL | REAL |
| **CREDENTIAL** | `CredentialVault` (AES-256-GCM envelope) | `CredentialVault` | REAL | REAL | REAL | REAL | REAL |
| **DOMAIN** | `ProjectDomainRecord` | Edge DNS / Gateway | REAL | REAL | REAL | REAL | REAL |
| **DNS** | DNS Record verification | Edge DNS Provider | PARTIAL | REAL | REAL | REAL | REAL |
| **TLS** | TLS Certificate status | Edge Certificate Vault | PARTIAL | REAL | REAL | REAL | REAL |
| **EDGE ROUTE** | Edge router rules / custom domain proxy | Edge Gateway Proxy | REAL | REAL | REAL | REAL | REAL |
| **CLUSTER** | Multi-server distributed cluster mesh | `tenant-engine.ts` | REAL | REAL | REAL | REAL | REAL |
| **NODE** | `SERVER_NODE` in Compute Engine | Node Agent Fabric | REAL | REAL | REAL | REAL | REAL |
| **DEPLOYMENT** | `SERVICE_DEPLOYMENT` / Workload instances | Container Orchestrator| REAL | REAL | REAL | REAL | REAL |
| **QUOTA** | `EnvironmentQuotaPolicyRecord` | `PlatformRepository` | REAL | REAL | REAL | REAL | REAL |
| **RATE LIMIT** | `EnvironmentRateLimitPolicyRecord` | Gateway Token Bucket | REAL | REAL | REAL | REAL | REAL |
| **WEBHOOK** | Webhook Dispatcher & Subscription | Event Bus Gateway | PARTIAL | REAL | REAL | REAL | REAL |
| **INTEGRATION** | Capability Adapters | `CapabilityEngine` | REAL | REAL | REAL | REAL | REAL |
| **FEATURE FLAG** | `FeatureFlagService` in `@orbitox/core` | `FeatureFlagService` | REAL | REAL | REAL | REAL | REAL |
| **SECURITY FINDING**| Anti-Tamper & Invariant Scanner | `SecurityEngine` | REAL | REAL | REAL | REAL | REAL |
| **APPROVAL** | `ApprovalEngine` (Four-Eyes Quorum) | `ApprovalEngine` | REAL | REAL | REAL | REAL | REAL |
| **AUDIT** | `AuditService` (Merkle SHA-256 ledger) | `AuditService` | REAL | REAL | REAL | REAL | REAL |
| **TEST** | Jest / Contract Verifier | Runtime Test Runner | REAL | REAL | REAL | REAL | REAL |
| **AI** | `AIGateway` & Model Ingestion | `AIGateway` | REAL | REAL | REAL | REAL | REAL |
| **MCP** | Model Context Protocol Servers & Tools | `ActionRegistry` | REAL | REAL | REAL | REAL | REAL |

---

### Critical Audit Findings & Remediation Roadmaps for v4.2

1. **Gap 1: Plugin Manifest Auto-Registration**:
   - *Status*: Previously, plugins required manual entry in API catalog or page components.
   - *v4.2 Solution*: Implement declarative `PluginAutoRegistrationService` consuming package manifests with automatic projection of services, APIs, capabilities, health checks, and actions.

2. **Gap 2: Plan Versioning & Immutable History**:
   - *Status*: Plans could be created and assigned, but lacked formal versioned draft/publish lifecycles.
   - *v4.2 Solution*: Implement `PlanEngine` with `DRAFT`, `PUBLISHED`, `ACTIVE`, `DEPRECATED`, `ARCHIVED` state transitions and commercial effective policy calculation (`Plan + PlanVersion + Overrides = EffectivePolicy`).

3. **Gap 3: Ordered ChangeSet Engine**:
   - *Status*: Mutations executed as discrete commands without multi-resource atomic rollbacks.
   - *v4.2 Solution*: Implement `ChangeSetEngine` enabling multi-step ordered deployments (Artifact verify $\to$ Upgrade dependency $\to$ Upgrade package $\to$ Migrate $\to$ Deploy $\to$ Health check) with step failure introspection and rollback strategies.

4. **Gap 4: Incremental Graph Event Ingestion**:
   - *Status*: Mutations updated the active node, but event stream didn't update topology incrementally without full rebuilds.
   - *v4.2 Solution*: Implement `applyIncrementalEvent` on `ResourceGraphService` bumping `eventSequence` and `lastIncrementalUpdateAt`.
