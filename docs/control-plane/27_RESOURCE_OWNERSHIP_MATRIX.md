# 🪐 ORBITOX RESOURCE OWNERSHIP MATRIX
## Definite Governance and Subsystem Responsibility Matrix (v4.2)

Every platform resource within OrbitoX has an explicit Authoritative Owner, Primary Writer, Read Path, Projection Pattern, and Invalidation Hook.

---

### Master Resource Ownership Table

| Resource Type | Primary Authoritative Owner | Authoritative Storage | Primary Writer | Primary Reader | Control Plane Projection | Cache / TTL | Audit Scope | Event Emitted |
|---|---|---|---|---|---|---|---|---|
| **ORGANIZATION** | Platform Operations | Postgres / `PlatformRepository` | `PlatformRepository.createOrganization` | Platform APIs | Projected as `ORGANIZATION` node | In-Memory (5m) | Merkle Audit | `org.created`, `org.suspended` |
| **PROJECT** | Workspace Service | Postgres / `PlatformRepository` | `PlatformRepository.createProject` | Platform APIs | Projected as `PROJECT` node | In-Memory (5m) | Merkle Audit | `project.created`, `project.assigned_plan` |
| **ENVIRONMENT** | Environment Engine | Postgres / `PlatformRepository` | `PlatformRepository.createEnvironment`| Platform APIs | Projected as `ENVIRONMENT` node | In-Memory (5m) | Merkle Audit | `environment.created`, `environment.frozen` |
| **TENANT** | `TenantEngine` | Postgres / Redis Multi-Tenant Store | `TenantEngine.registerTenant` | `tenantStorage` (ALS) | Projected as `TENANT` node | Redis (5m) | Merkle Audit | `tenant.provisioned`, `tenant.suspended` |
| **COMPANY** | `TenantEngine` | Multi-Tenant Data Store | Company Management API | Company Resolvers | Projected as `COMPANY` node | Redis (5m) | Merkle Audit | `company.updated` |
| **BRANCH** | POS / Hospitality Subsystem | Branch Registry Store | POS Branch Service | POS Terminals | Projected as `BRANCH` node | Local (10m) | Merkle Audit | `branch.updated` |
| **PLAN** | `PlanService` | Postgres / `PlanService` | `PlanService.createPlan` / `updatePlan`| Billing Engine | Projected as `PLAN` node | In-Memory (1h) | Merkle Audit | `plan.created`, `plan.published`, `plan.deprecated` |
| **SUBSCRIPTION** | `SubscriptionService`| Stripe / Payment Provider + DB | `SubscriptionService.createSubscription`| Billing Gateway | Projected as `SUBSCRIPTION` node | Redis (1m) | Merkle Audit | `subscription.activated`, `subscription.cancelled` |
| **FEATURE_FLAG** | `FeatureFlagService` | In-Memory / Context Engine Store | `FeatureFlagService.registerFlag` / `setOverride` | Feature Guards | Projected as `FEATURE_FLAG` node | Real-time | Merkle Audit | `feature_flag.toggled`, `feature_flag.override_set` |
| **PACKAGE** | Platform Package Registry| GitHub Packages / `PlatformRepository`| Package Publisher (`CryptoSigner`) | Package Verifier | Projected as `PACKAGE` node | In-Memory (1h) | Merkle Audit | `package.published`, `package.verified` |
| **PACKAGE_INSTALLATION** | Environment Package Manager | `PlatformRepository` | `PlatformRepository.installPackage` | Runtime Mesh | Projected as `INSTALLED_IN` edge | Real-time | Merkle Audit | `package.installed`, `package.upgraded`, `package.removed`|
| **SERVICE** | Service Mesh Orchestrator | Runtime Container Mesh | Service Mesh Deployment Engine | Mesh Proxy | Projected as `SERVICE` node | Real-time | Merkle Audit | `service.deployed`, `service.scaled`, `service.drained` |
| **SERVICE_DEPLOYMENT** | Container Orchestrator | Kubernetes / Container Runtime | Deployment Scheduler | SRE Probes | Projected as `SERVICE_DEPLOYMENT` node | Real-time | Merkle Audit | `deployment.started`, `deployment.completed`, `deployment.rolled_back` |
| **API** | `CapabilityEngine` | API Definition Registry | Package Manifest Ingestion | API Gateway | Projected as `API` node | In-Memory (1h) | Merkle Audit | `api.published`, `api.deprecated`, `api.sunset` |
| **API_CAPABILITY** | `CapabilityEngine` | Capability Registry | Capability Registration Hook | Gateway Authorizer | Projected as `API_CAPABILITY` node | In-Memory (1h) | Merkle Audit | `capability.registered` |
| **API_KEY** | `PlatformKeyEngine` | Postgres (Masked + SHA-256 Hash) | `PlatformKeyEngine.generateKey` | Gateway Token Validator | Projected as `API_KEY` node | Redis (5m) | Merkle Audit | `key.issued`, `key.rotated`, `key.revoked` |
| **CREDENTIAL** | `CredentialVault` | Encrypted Vault (AES-256-GCM Envelope) | `CredentialVault.storeCredential` | Runtime Decryptor | Projected as `CREDENTIAL` node (Metadata only)| Zero (Real-time)| Merkle Audit | `credential.stored`, `credential.rotated`, `credential.purged` |
| **DOMAIN** | Edge Network Engine | DNS Provider + Route53 / Cloudflare | `PlatformRepository.registerDomain` | Edge Router Proxy | Projected as `DOMAIN` node | DNS TTL (5m) | Merkle Audit | `domain.registered`, `domain.verified`, `domain.drifted` |
| **SERVER_NODE** | Compute Fabric Engine | Node Agent Fabric | Cluster Scheduler | Health Probes | Projected as `SERVER_NODE` node | Real-time | Merkle Audit | `node.cordoned`, `node.drained`, `node.unsealed` |
| **AI_MODEL** | `AIGateway` | Model Provider Registry | AI Gateway Manager | AI Proxy | Projected as `AI_MODEL` node | In-Memory (1h) | Merkle Audit | `ai_model.registered` |
| **MCP_SERVER** | `AIGateway` | Model Context Protocol Daemon | MCP Host Manager | Agent Dispatcher | Projected as `MCP_SERVER` node | Real-time | Merkle Audit | `mcp_server.started`, `mcp_server.restarted` |
| **MCP_TOOL** | `ActionRegistry` | `ActionRegistry` in `@orbitox/core` | Plugin Action Registration | Agent Runtime | Projected as `MCP_TOOL` node | Real-time | Merkle Audit | `mcp_tool.registered`, `mcp_tool.invoked` |
| **APPROVAL** | `ApprovalEngine` | Postgres Approval Ledger | Four-Eyes Quorum Requester | Governance Portal | Projected as `APPROVAL` node | Real-time | Merkle Audit | `approval.requested`, `approval.granted`, `approval.rejected` |
| **INCIDENT** | SRE Observability Mesh | Incident Tracking Outbox | Automated Anomaly Detector | Incident Commander | Projected as `INCIDENT` node | Real-time | Merkle Audit | `incident.triggered`, `incident.mitigated`, `incident.resolved` |
| **WORKFLOW** | `WorkflowRunner` | Workflow Engine DB | Workflow Trigger Engine | Step Handlers | Projected as `WORKFLOW` node | Real-time | Merkle Audit | `workflow.started`, `workflow.step_completed`, `workflow.failed` |

---

### Non-Negotiable Boundaries
1. **Never Expose Plaintext Secrets**: The Control Plane only holds cryptographic fingerprints, rotation deadlines, and consumer references.
2. **Never Duplicate Primary Writes**: The Control Plane dispatches commands to the designated authoritative writer and reconciles the resulting state.
3. **Always Scope Data by Tenant**: Every mutation carries the active tenant context via `AsyncLocalStorage`.
