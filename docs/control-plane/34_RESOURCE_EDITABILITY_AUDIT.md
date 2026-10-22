# 🪐 ORBITOX CONTROL CENTER v4.2
## Resource Editability & Control Audit

**Specification Reference**: `docs/control-plane/34_RESOURCE_EDITABILITY_AUDIT.md`  
**Milestone**: v4.2 — Universal Resource Editor + Full Control  
**Audit Target**: Evaluation of all platform resource types across Readability, Editability, Operability, and Gaps.

---

## 1. Executive Summary

Prior to v4.2, the Control Center was predominantly a **read-only observability mesh**. While the underlying DAG modeled 71 nodes across 35 types, the UI drawer was limited to static cards.

This audit establishes the baseline status across all primary resources before deploying the Universal Editor engine.

---

## 2. Resource Editability Audit Table

| Resource Type | Currently Readable | Currently Editable | Currently Operable | Missing Editor | Missing Command | Missing Validation | Missing API | Missing Persistence | Missing Reconciliation | Missing Test |
|---|---|---|---|---|---|---|---|---|---|---|
| **PROJECT** | YES (Graph/Repo) | NO (Read-only UI) | PARTIAL (Archive) | YES | NO (project.create exists) | PARTIAL | YES (`/apply`) | NO (PlatformRepo) | NO | YES (Edit test) |
| **ENVIRONMENT** | YES (Graph/Repo) | NO (Read-only UI) | PARTIAL (Drain/Reconcile) | YES | NO (env.deprovision exists) | PARTIAL | YES (`/apply`) | NO (PlatformRepo) | NO | YES (Edit test) |
| **PLAN** | YES (PlanService) | NO (Read-only UI) | PARTIAL (Publish) | YES | NO (plan.publish exists) | PARTIAL (Limit check) | YES (`/apply`) | NO (PlanStore) | NO | YES (Limit test) |
| **PACKAGE** | YES (Registry) | NO (Read-only UI) | PARTIAL (Install) | YES | NO (package.install) | PARTIAL (Semver check) | YES (`/apply`) | NO (PluginRepo) | NO | YES (Pkg config) |
| **INSTALLATION** | YES (Graph) | NO (Read-only UI) | PARTIAL (Upgrade) | YES | NO (package.upgrade) | PARTIAL | YES (`/apply`) | NO (InstStore) | NO | YES (Upgrade) |
| **SERVICE** | YES (Graph) | NO (Read-only UI) | YES (Scale/Deploy) | YES | NO (service.scale) | NO (Node capacity) | YES (`/apply`) | NO (GraphNode) | NO (Replica recon) | YES (Scale test) |
| **NODE** | YES (Graph) | NO (Read-only UI) | YES (Drain) | YES | NO (node.drain) | NO (Spare capacity) | YES (`/apply`) | NO (GraphNode) | NO | YES (Drain test) |
| **API** | YES (Graph) | NO (Read-only UI) | NO (Static) | YES | YES (api.deprecate) | PARTIAL | YES (`/apply`) | NO (GraphNode) | NO | YES (Deprecate) |
| **CAPABILITY** | YES (Graph) | NO (Read-only UI) | NO (Static) | YES | YES (cap.update) | PARTIAL | YES (`/apply`) | NO (GraphNode) | NO | YES (Scope test) |
| **API_KEY** | YES (Graph/Vault) | NO (Read-only UI) | YES (Rotate/Revoke) | YES | NO (key.rotate/revoke) | NO (Format check) | YES (`/apply`) | NO (KeyEngine) | NO | YES (Scope edit) |
| **CREDENTIAL** | YES (Vault Meta) | NO (Read-only UI) | YES (Rotate) | YES | NO (cred.rotate) | NO (Fingerprint) | YES (`/apply`) | NO (Vault) | NO | YES (Rotate test) |
| **DOMAIN** | YES (Graph) | NO (Read-only UI) | YES (Reconcile) | YES | YES (domain.rebind) | NO (FQDN check) | YES (`/apply`) | NO (DomainRepo) | NO (CNAME drift) | YES (Rebind test) |
| **RATE_LIMIT** | YES (PolicyEngine)| NO (Read-only UI) | NO (Static) | YES | YES (rl.override) | NO (Inheritance rule) | YES (`/apply`) | NO (PolicyStore) | NO | YES (Override) |
| **QUOTA** | YES (PlanStore) | NO (Read-only UI) | NO (Static) | YES | YES (quota.update) | NO (Plan ceiling) | YES (`/apply`) | NO (PlanStore) | NO | YES (Quota test) |
| **FEATURE_FLAG** | YES (Graph) | NO (Read-only UI) | NO (Static) | YES | YES (flag.toggle) | NO (Boolean/Rules) | YES (`/apply`) | NO (FlagStore) | NO | YES (Toggle test) |
| **WEBHOOK** | YES (Graph) | NO (Read-only UI) | NO (Static) | YES | YES (webhook.update) | NO (URL validation) | YES (`/apply`) | NO (WebhookStore) | NO | YES (URL test) |
| **AI_AGENT** | YES (Graph) | NO (Read-only UI) | NO (Static) | YES | YES (ai.configure) | NO (Model whitelist) | YES (`/apply`) | NO (GraphNode) | NO | YES (Config test) |
| **MCP_SERVER** | YES (Graph) | NO (Read-only UI) | NO (Static) | YES | YES (mcp.restart) | NO (Transport check) | YES (`/apply`) | NO (GraphNode) | NO | YES (MCP test) |

---

## 3. Critical Gaps Identified

1. **Missing Universal Editor Schema Endpoint**:
   - The UI currently has no mechanism to query: "What fields on this resource are editable? What are their types, validation rules, and default values?"
   - **Remedy**: Implement `GET /api/v1/platform/resources/:id/schema`.
2. **Missing Universal Apply & Preview Endpoints**:
   - The UI has individual ad-hoc command routes (`/commands`, `/reconcile`), but no uniform `POST /resources/:id/preview` and `POST /resources/:id/apply` pipeline.
   - **Remedy**: Create generic `/api/v1/platform/resources/[id]/schema`, `/preview`, and `/apply` routes backed by `ResourceEditorService`.
3. **Inspector Drawer Lacks Configuration Tab**:
   - `ResourceInspectorDrawer.tsx` displays Overview, Topology, Desired vs Observed, and Blast Radius, but completely lacks an interactive `Configuration` editor tab.
   - **Remedy**: Add `Configuration` tab with schema-driven form rendering, section grouping, dirty change detection, diff preview, and live apply status.
4. **Missing Global Configuration and Operations Pages**:
   - No central place to search all configuration keys across the platform or track running asynchronous operations.
   - **Remedy**: Create `/platform/configuration` and `/platform/operations`.
