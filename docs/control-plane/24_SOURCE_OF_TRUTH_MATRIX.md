# 🪐 Source of Truth Matrix (CP-24)
**Classification: Authoritative State Ownership & Data Provenance**
**Version: v4.2 Universal Platform Master Specification**

---

## 1. Matrix Overview

To prevent conflicting state updates and eliminate split-brain conditions across the OrbitoX Platform, every major platform property is assigned an explicit:
1. **Property**: Platform configuration, credential, infrastructure, or operational entity.
2. **Owner**: The responsible platform subsystem or administrative role.
3. **Storage**: The authoritative persistent database or secure cryptographic store.
4. **Writer**: The strictly permitted mutation service (all mutations must pass through CommandBus).
5. **Reader**: The primary query service or repository layer.
6. **Projection**: The materialized operational view in the Control Plane `ResourceGraph`.
7. **Cache**: The high-performance distributed caching layer (Redis / in-memory).
8. **Audit**: The immutable hash-chained audit event generated upon mutation.
9. **Event**: The canonical domain event dispatched across the platform event bus.

---

## 2. Definitive 9-Column Source-of-Truth Table

| Property | Owner | Storage | Writer | Reader | Projection | Cache | Audit | Event |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Organization Identity** | Platform Admin | PostgreSQL (`PlatformOrganization`) | `PlatformRepository` / `CommandBus` | `PlatformRepository` | `ResourceGraph` Node (`ORGANIZATION`) | Redis (TTL 1h) | `AuditService.log('org.created')` | `organization.created` |
| **Project Definition** | Org Technical Lead | PostgreSQL (`PlatformProject`) | `PlatformRepository.createProject` | `PlatformRepository.getProject` | `ResourceGraph` Node (`PROJECT`) | Redis (TTL 15m) | `AuditService.log('project.provisioned')` | `project.provisioned` |
| **Project Plan Tier** | Billing Admin | PostgreSQL (`PlatformProject.planTier`) | `BillingService` / `CommandBus` | `PlanService` | `PROJECT.desiredState.planTier` | In-memory DAG | `AuditService.log('project.plan_changed')` | `plan.assigned` |
| **Environment Lifecycle** | Project DevOps | PostgreSQL (`ProjectEnvironment`) | `PlatformRepository.createProject` | `PlatformRepository.listEnvironments` | `ResourceGraph` Node (`ENVIRONMENT`) | In-memory DAG | `AuditService.log('environment.created')` | `environment.created` |
| **Multi-Tenant Context** | Tenant Admin | PostgreSQL (`TenantRecord`) | `TenantEngine` / `CommandBus` (`tenant.create`) | `TenantEngine.getTenant` | `ResourceGraph` Node (`TENANT`) | Redis (LRU 1h) | `AuditService.log('tenant.provisioned')` | `tenant.created` |
| **Tenant Companies & Branches**| Commercial Operations | PostgreSQL (`CompanyRecord`) | `CompanyService` / `TenantEngine` | `CompanyService.list` | `ResourceGraph` Node (`COMPANY`) | In-memory DAG | `AuditService.log('company.created')` | `company.created` |
| **Plan Definition & Versions** | Billing / Product | Plan Store (`PlanVersionRecord`) | `PlanEntitlementService.createPlanDraft` | `PlanEntitlementService.getActivePlan` | `ResourceGraph` Node (`PLAN`) | Redis (TTL 1h) | `AuditService.log('plan.published')` | `plan.published` |
| **Effective Entitlement** | Entitlement Engine | Dynamic Composition Tree | `PlanEntitlementService.getEffectivePlan` | `PolicyResolutionEngine` | `ENVIRONMENT.effectivePlan` | In-memory DAG | `AuditService.log('entitlement.evaluated')` | `entitlement.evaluated` |
| **Project Blueprint** | Platform Architecture | Blueprint Registry | `BlueprintService.registerBlueprint` | `BlueprintService.getBlueprint` | `ResourceGraph` Meta (`BLUEPRINT`) | In-memory Map | `AuditService.log('blueprint.registered')` | `blueprint.registered` |
| **ChangeSet Plan & Status** | ChangeSet Orchestrator | ChangeSet Memory Store | `ChangeSetService.createChangeSet` | `ChangeSetService.getPlan` | `ResourceGraph` Meta (`CHANGESET`) | In-memory Store | `AuditService.log('changeset.executed')` | `changeset.completed` |
| **Plugin Declarative Manifest**| Plugin Registry Engine | Manifest Registry | `PluginRegistryService.registerPlugin` | `PluginRegistryService.getManifest` | `PACKAGE` + `SERVICE` + `API` | In-memory Registry | `AuditService.log('plugin.registered')` | `plugin.registered` |
| **API Key Plaintext** | Hardware CSPRNG | **None (Ephemeral)** | `PlatformKeyEngine.generateKey` | Displayed Once to Operator | **Never Projected** | None | `AuditService.log('key.issued')` | `key.generated` |
| **API Key Auth Verifier** | Edge Security Gateway | PostgreSQL (`PlatformApiKey.authVerifier`) | `PlatformRepository.createApiKey` | `PlatformRepository.findKeyByRawSecret` | `ResourceGraph` Node (`API_KEY`) | Redis (LRU 5m) | `AuditService.log('key.authenticated')` | `key.authenticated` |
| **Key Effective Capability** | Security Engine | Dynamic Intersection | `PolicyResolutionEngine` | `getEffectiveKeyAuthorization` | `API_KEY.metadata.effectiveCaps` | In-memory DAG | `AuditService.log('key.auth_checked')` | `key.authorized` |
| **External Credentials** | Credential Vault | PostgreSQL (`PlatformCredential.envelope`) | `CredentialVault.encryptSecret` | `CredentialVault.decryptSecret` | `ResourceGraph` Node (`CREDENTIAL`) | KMS Key Cache | `AuditService.log('credential.encrypted')` | `credential.stored` |
| **Credential Rotation** | Security SecOps | PostgreSQL (`PlatformCredential`) | `PlatformRepository.createCredential` | `CredentialVault` | `CREDENTIAL.metadata.stage` | In-memory DAG | `AuditService.log('credential.rotated')` | `credential.rotated` |
| **Package Catalog** | Package Publisher | GitHub Packages + Catalog DB | `PlatformRepository.packages` | `PlatformRepository.listPackages` | `ResourceGraph` Node (`PACKAGE`) | Edge Manifest | `AuditService.log('package.registered')` | `package.registered` |
| **Package Tarball Hash** | Supply Chain Notary | PostgreSQL (`PackageVersion.tarballSha256`) | CI Notary Worker | `IntegrityVerifier` | `PACKAGE.metadata.hash` | In-memory DAG | `AuditService.log('package.notarized')` | `package.signed` |
| **Package Installation** | Environment SRE | PostgreSQL (`PackageInstallation`) | `PlatformRepository.installPackage` | `PlatformRepository.listInstallations` | `GraphEdge` (`INSTALLED_IN`) | In-memory DAG | `AuditService.log('package.installed')` | `package.installed` |
| **Service Desired State** | Platform Orchestrator | PostgreSQL / Spec Manifest | `CommandBusService` (`service.scale`) | Service Registry | `SERVICE.desiredState` | In-memory DAG | `AuditService.log('service.configured')` | `service.configured` |
| **Service Observed State** | Cluster Telemetry | Telemetry Stream / Health Agent | Cluster Daemon | `HealthService` | `SERVICE.observedState` | Redis (TTL 10s) | `AuditService.log('service.health_drift')` | `service.health_changed` |
| **API Endpoint Definition** | Service Engine | Manifest Contract | `PluginRegistryService` | `ServiceRegistry` | `ResourceGraph` Node (`API`) | In-memory DAG | `AuditService.log('api.registered')` | `api.registered` |
| **API Capability Grant** | Capability Engine | PostgreSQL (`CapabilityRecord`) | `CapabilityEngine` | `CapabilityEngine.list` | `ResourceGraph` Node (`API_CAPABILITY`) | In-memory DAG | `AuditService.log('capability.registered')` | `capability.registered` |
| **AI Model Registration** | AI Gateway | AI Model Registry | `AIGateway.registerModel` | `AIGateway.listModels` | `ResourceGraph` Node (`AI_MODEL`) | In-memory Registry | `AuditService.log('ai.model_registered')` | `ai.model_registered` |
| **MCP Server & Tool Registry** | MCP Gateway | MCP Process Daemon | `McpGateway.registerServer` | `McpGateway.listTools` | `ResourceGraph` Node (`MCP_SERVER`/`MCP_TOOL`) | In-memory Registry | `AuditService.log('mcp.tool_invoked')` | `mcp.tool_invoked` |
| **Compute Node Capacity** | Cluster Infrastructure | Cluster DB (`ServerNode`) | Infra Scheduler Daemon | Infrastructure Registry | `ResourceGraph` Node (`SERVER_NODE`) | Node Agent Ping | `AuditService.log('node.capacity_updated')` | `node.telemetry` |
| **Compute Node Drain State**| SRE / Command Bus | Node Status Record | `CommandBusService` (`node.drain`) | Cluster Scheduler | `SERVER_NODE.desiredState.drain` | In-memory DAG | `AuditService.log('node.drain_started')` | `node.draining` |
| **Deployment Lifecycle** | Deployment Pipeline | Deployment Ledger | `CommandBusService` (`service.deploy`) | Deployment Registry | `ResourceGraph` Node (`SERVICE_DEPLOYMENT`) | In-memory DAG | `AuditService.log('deployment.executed')` | `deployment.completed` |
| **Platform Incidents** | Incident Management | Incident Store | `IncidentManager.createIncident` | `IncidentManager.getActive` | `ResourceGraph` Node (`INCIDENT`) | In-memory DAG | `AuditService.log('incident.created')` | `incident.escalated` |
| **Autonomous Workflows** | Workflow Engine | Workflow Store | `WorkflowEngine.register` | `WorkflowEngine.list` | `ResourceGraph` Node (`WORKFLOW`) | In-memory DAG | `AuditService.log('workflow.triggered')` | `workflow.executed` |
| **Custom Domain Record** | Domain Edge Service | PostgreSQL (`ProjectDomain`) | `PlatformRepository.registerDomain` | `PlatformRepository.listDomains` | `ResourceGraph` Node (`DOMAIN`) | DNS Edge Cache | `AuditService.log('domain.registered')` | `domain.registered` |
| **Domain DNS Observed** | DNS Edge Prober | Edge CNAME Prober Worker | DNS Worker Daemon | `DnsResolver` | `DOMAIN.observedState.dns` | In-memory DAG | `AuditService.log('domain.dns_probed')` | `domain.dns_observed` |
| **Domain TLS Certificate** | ACME Edge Worker | Edge Vault (`sslExpiresAt`) | ACME Certbot Daemon | `TlsInspector` | `DOMAIN.observedState.tls` | Edge SSL Term | `AuditService.log('domain.cert_issued')` | `domain.tls_renewed` |
| **Monthly Quota Usage** | Telemetry Metering | Redis Counters ➔ PostgreSQL | `PlatformRepository.recordCall` | `PlatformRepository.getQuotaPolicy` | `ENVIRONMENT.metadata.callsUsed` | Redis Fast Counter | `AuditService.log('quota.incremented')` | `quota.updated` |
| **Four-Eyes Approvals** | Platform Governance | PostgreSQL (`ApprovalRequest`) | `ApprovalEngine.approveStage` | `ApprovalEngine.requests` | `ResourceGraph` Node (`APPROVAL`) | In-memory DAG | `AuditService.log('approval.decided')` | `approval.decided` |
| **Audit Ledger Hash** | System Merkle Chain | PostgreSQL (`AuditRecord`) | `AuditService.log` | `AuditService.verifyChain` | Cryptographic Ledger Projection| None (Append Only)| Immutable Log Entry | `audit.recorded` |

---

## 3. Operational Rules

1. **Single Writer Boundary**: No direct raw SQL/Prisma mutations outside the registered `CommandBus` handlers and `PlatformRepository` service abstractions.
2. **Re-projectable Memory**: The `ResourceGraph` projection must NEVER contain data that cannot be reconstituted from the authoritative storage layer.
3. **Zero Plaintext Secrets**: Plaintext API key secrets and unencrypted credential payloads are forbidden from appearing in the `ResourceGraph`, caches, audit logs, or event streams.
