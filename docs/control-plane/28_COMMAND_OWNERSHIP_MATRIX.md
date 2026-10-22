# 🪐 ORBITOX COMMAND OWNERSHIP MATRIX
## Operational Dispatch, Authorization, Quorum & Rollback Specification (v4.2)

Every platform operation dispatched through `PlatformCommandBus` is bound to a registered handler, authoritative writer, security policy, approval safety classification, and rollback hook.

---

### Master Command Ownership Table

| Command Operation | Registered Handler | Authoritative Writer | Required Permission | Risk Level / Safety Class | Four-Eyes Approval Gate | Canonical Event Emitted | Rollback Strategy | Reconciliation Behavior |
|---|---|---|---|---|---|---|---|---|
| `tenant.create` | `TenantHandler` | `TenantEngine` | `PLATFORM_SUPERADMIN` | `LOW` / `SAFE` | Auto-approved | `tenant.provisioned` | Purge tenant context | Ingest tenant into DAG |
| `tenant.suspend` | `TenantHandler` | `TenantEngine` | `PLATFORM_SUPERADMIN` | `HIGH` / `APPROVAL_REQUIRED` | Four-Eyes Quorum Required | `tenant.suspended` | Unfreeze tenant traffic | Cordon tenant routes |
| `project.assign_plan` | `PlanAssignHandler` | `PlatformRepository` | `BILLING_ADMIN` | `MEDIUM` / `CONTROLLED` | Quorum if Downgrade | `project.plan_changed` | Revert to previous plan tier | Recalculate entitlements |
| `plan.publish` | `PlanHandler` | `PlanService` | `BILLING_ADMIN` | `MEDIUM` / `CONTROLLED` | Auto-approved | `plan.published` | Mark as DRAFT | Distribute to project caches |
| `plan.downgrade` | `PlanHandler` | `PlanService` | `BILLING_ADMIN` | `HIGH` / `APPROVAL_REQUIRED` | Preflight Verification Gate | `plan.downgraded` | Restore prior tier | Validate resource limits |
| `subscription.cancel`| `SubscriptionHandler`| `SubscriptionService`| `BILLING_ADMIN` | `HIGH` / `APPROVAL_REQUIRED` | Four-Eyes Quorum Required | `subscription.cancelled`| Reactivate subscription | Deprecate project entitlements |
| `feature_flag.toggle`| `FeatureFlagHandler`| `FeatureFlagService`| `RELEASE_MANAGER` | `LOW` / `SAFE` | Auto-approved | `feature_flag.toggled` | Revert toggle state | Flush context feature cache |
| `feature_flag.set` | `FeatureFlagHandler`| `FeatureFlagService`| `RELEASE_MANAGER` | `MEDIUM` / `SAFE` | Auto-approved | `feature_flag.override_set`| Remove override rule | Propagate to active sessions |
| `package.install` | `PackageInstallHandler`| `PlatformRepository`| `RELEASE_MANAGER` | `MEDIUM` / `CONTROLLED` | Auto-approved | `package.installed` | Remove package installation | Run package health checks |
| `package.upgrade` | `PackageUpgradeHandler`| `PlatformRepository`| `RELEASE_MANAGER` | `HIGH` / `APPROVAL_REQUIRED` | Four-Eyes if Production | `package.upgraded` | Revert to previous tarball version | Verify Ed25519 signature & canary |
| `package.rollback` | `PackageUpgradeHandler`| `PlatformRepository`| `RELEASE_MANAGER` | `HIGH` / `APPROVAL_REQUIRED` | Four-Eyes Quorum Required | `package.rolled_back` | Re-apply target version | Re-verify APIs & capabilities |
| `service.deploy` | `ServiceDeployHandler`| Mesh Deployment Fabric| `SRE` | `MEDIUM` / `CONTROLLED` | Auto-approved in Non-Prod | `service.deployed` | Trigger previous deployment image| Monitor replica health probes |
| `service.scale` | `ServiceScaleHandler` | Container Orchestrator| `SRE` | `MEDIUM` / `SAFE` | Auto-approved | `service.scaled` | Restore prior replica count | Self-heal observed vs desired |
| `service.drain` | `ServiceDrainHandler` | Service Mesh Proxy | `SRE` | `HIGH` / `CONTROLLED` | Quorum if Production | `service.drained` | Uncordon service traffic | Route traffic to standby replicas |
| `deployment.rollback`| `DeploymentHandler` | Container Orchestrator| `SRE` | `HIGH` / `APPROVAL_REQUIRED` | Four-Eyes Quorum Required | `deployment.rolled_back`| Forward-fix deployment | Reconcile container pods |
| `api.publish` | `ApiPublishHandler` | `CapabilityEngine` | `RELEASE_MANAGER` | `LOW` / `SAFE` | Auto-approved | `api.published` | Mark API as DRAFT | Expose gateway route |
| `api.deprecate` | `ApiPublishHandler` | `CapabilityEngine` | `RELEASE_MANAGER` | `HIGH` / `APPROVAL_REQUIRED` | Check consumer count (>0 needs approval)| `api.deprecated` | Un-deprecate API contract | Alert consumer API keys |
| `key.create` | `KeyEngineHandler` | `PlatformKeyEngine` | `SECURITY_ADMIN` | `LOW` / `SAFE` | Auto-approved | `key.issued` | Revoke key immediately | Bind capability scopes in DAG |
| `key.rotate` | `KeyEngineHandler` | `PlatformKeyEngine` | `SECURITY_ADMIN` | `MEDIUM` / `CONTROLLED` | Dual-key overlap period | `key.rotated` | Terminate pending key | Keep old key active until grace ends |
| `key.revoke` | `KeyEngineHandler` | `PlatformKeyEngine` | `SECURITY_ADMIN` | `CRITICAL` / `APPROVAL_REQUIRED`| Four-Eyes Quorum Required | `key.revoked` | Emergency Reissue | Invalidate gateway token cache |
| `credential.rotate` | `CredentialHandler` | `CredentialVault` | `SECURITY_ADMIN` | `HIGH` / `CONTROLLED` | Staged zero-downtime rotation | `credential.rotated` | Rollback to secret version N-1 | Probe connected services health |
| `credential.revoke` | `CredentialHandler` | `CredentialVault` | `SECURITY_ADMIN` | `CRITICAL` / `MANUAL_ONLY` | Four-Eyes Quorum Required | `credential.purged` | Manual Vault Restore Only | Flag orphan consumer services |
| `domain.verify_dns` | `DomainHandler` | Edge DNS Gateway | `PLATFORM_ADMIN` | `LOW` / `SAFE` | Auto-approved | `domain.verified` | Retain pending state | Probe CNAME record propagation |
| `node.cordon` | `NodeHandler` | Node Agent Fabric | `SRE` | `MEDIUM` / `SAFE` | Auto-approved | `node.cordoned` | Uncordon node | Stop scheduling pods on node |
| `node.drain` | `NodeHandler` | Node Agent Fabric | `SRE` | `HIGH` / `CONTROLLED` | Quorum if Capacity < 40% | `node.drained` | Unseal node | Evacuate workloads to spare nodes |
| `mcp_tool.invoke` | `McpToolHandler` | `ActionRegistry` | `AI_AGENT` | `MEDIUM` / `CONTROLLED` | Policy Guardrail Check | `mcp_tool.invoked` | Compensating action if defined | Record input/output tokens & telemetry |
| `approval.approve` | `ApprovalHandler` | `ApprovalEngine` | `SECURITY_ADMIN` | `HIGH` / `CONTROLLED` | Secondary Peer Authorization | `approval.granted` | Revoke approval before execution | Dispatch queued command |
| `approval.reject` | `ApprovalHandler` | `ApprovalEngine` | `SECURITY_ADMIN` | `HIGH` / `CONTROLLED` | Auto-approved | `approval.rejected` | Re-open approval request | Abort pending command |
| `workflow.trigger` | `WorkflowHandler` | `WorkflowRunner` | `PLATFORM_ADMIN` | `MEDIUM` / `CONTROLLED` | Auto-approved | `workflow.started` | Abort workflow steps | Track step status in graph |

---

### Command Lifecycle Guarantees
1. **Idempotency Guarantee**: Every command requires an `idempotencyKey`. A repeated submission returns the previously executed result without re-executing mutations.
2. **Optimistic Concurrency**: The command must supply `expectedVersion`. If the resource version in the graph has drifted, the bus throws a `ConflictException` (HTTP 409).
3. **Discrete 7-Step Plan**: Every execution produces a deterministic 7-step plan including actor verification, snapshotting, blast radius calculation, quorum evaluation, handler mutation, reconciliation trigger, and cryptographic Merkle audit append.
