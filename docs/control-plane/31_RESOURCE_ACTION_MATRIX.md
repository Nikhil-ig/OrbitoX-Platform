# 🪐 ORBITOX CONTROL CENTER v4.2
## Resource Action Matrix

**Specification Reference**: `docs/control-plane/31_RESOURCE_ACTION_MATRIX.md`  
**Milestone**: v4.2 — Universal Resource Editor + Full Control  

---

## 1. Universal Action Classification & Pipeline Contract

Every operable action exposed in the Control Center specifies its exact execution and governance contract:

| Action ID | Resource | Permission Required | Safety Class | Pre-flight Validation | Impact Target | Four-Eyes Approval | Command Handler | Emitted Event | Rollback Supported | Reconciliation Triggered |
|---|---|---|---|---|---|---|---|---|---|---|
| `project.update` | `PROJECT` | `project.write` | SAFE | Schema & Slug Check | None | NO | `project.update` | `project.updated` | YES | NO |
| `project.change_plan` | `PROJECT` | `plan.assign` | CONTROLLED | Plan Compatibility | Packages, Quotas | YES (if downgrade) | `project.change_plan` | `plan.assigned` | YES | YES |
| `project.archive` | `PROJECT` | `project.delete` | APPROVAL_REQUIRED | Active Envs Check | All child resources | YES | `project.archive` | `project.archived` | NO | YES |
| `environment.update` | `ENVIRONMENT` | `env.write` | SAFE | Schema Validation | Sub-services | NO | `environment.update` | `env.updated` | YES | YES |
| `environment.freeze` | `ENVIRONMENT` | `env.admin` | CONTROLLED | Lock State Check | Deployments | NO | `environment.freeze` | `env.frozen` | YES | NO |
| `environment.deprovision` | `ENVIRONMENT` | `env.delete` | APPROVAL_REQUIRED | Zero Traffic Check | All env resources | YES (Prod) | `environment.deprovision`| `env.deprovisioned`| NO | YES |
| `environment.reconcile` | `ENVIRONMENT` | `env.operate` | SAFE | Connectivity | Entire Mesh | NO | `environment.reconcile`| `env.reconciled` | NO | YES |
| `plan.publish` | `PLAN` | `plan.admin` | CONTROLLED | Breaking Limits Check| Inheriting Projects | YES (if restrictive) | `plan.publish` | `plan.published` | YES | YES |
| `package.install` | `PACKAGE` | `package.install`| CONTROLLED | Signature & Deps | Target Environment | YES (Prod) | `package.install` | `package.installed` | YES | YES |
| `package.upgrade` | `INSTALLATION` | `package.upgrade`| CONTROLLED | Compatibility Check | Services, APIs | YES (Prod) | `package.upgrade` | `package.upgraded` | YES | YES |
| `package.rollback` | `INSTALLATION` | `package.rollback`| APPROVAL_REQUIRED| DB Migration Check | Services | YES | `package.rollback` | `package.rolled_back`| YES | YES |
| `package.uninstall`| `INSTALLATION` | `package.delete` | APPROVAL_REQUIRED| Orphan Dep Check | Dependents | YES | `package.uninstall` | `package.uninstalled`| NO | YES |
| `service.scale` | `SERVICE` | `service.scale` | SAFE | Node Capacity Check | Cluster Nodes | NO (except prod -50%)| `service.scale` | `service.scaled` | YES | YES |
| `service.deploy` | `SERVICE` | `service.deploy` | CONTROLLED | Artifact Integrity | Active Pods | YES (Prod) | `service.deploy` | `service.deployed` | YES | YES |
| `service.drain` | `SERVICE` | `service.operate` | CONTROLLED | Alternate Replicas | Active Traffic | YES | `service.drain` | `service.drained` | YES | YES |
| `service.restart` | `SERVICE` | `service.operate` | SAFE | Rolling Quorum | Active Traffic | NO | `service.restart` | `service.restarted` | NO | YES |
| `node.drain` | `NODE` | `infra.admin` | APPROVAL_REQUIRED| Spare Capacity Check| Hosted Services | YES | `node.drain` | `node.drained` | YES | YES |
| `node.cordon` | `NODE` | `infra.admin` | SAFE | None | Scheduler | NO | `node.cordon` | `node.cordoned` | YES | NO |
| `api.deprecate` | `API` | `api.admin` | CONTROLLED | Consumer Count Check| Active Clients | NO | `api.deprecate` | `api.deprecated` | YES | NO |
| `api.sunset` | `API` | `api.admin` | APPROVAL_REQUIRED| Zero Consumers Check| Active Clients | YES | `api.sunset` | `api.sunsetted` | NO | YES |
| `key.rotate` | `API_KEY` | `key.admin` | SAFE | Grace Window Check | Consumer Apps | NO | `key.rotate` | `key.rotated` | YES (Grace period)| NO |
| `key.revoke` | `API_KEY` | `key.admin` | CONTROLLED | Consumer Traffic | Consumer Apps | YES (Prod) | `key.revoke` | `key.revoked` | NO | YES |
| `cred.rotate` | `CREDENTIAL` | `sec.admin` | CONTROLLED | Provider Ping Check | Dependent Services | YES | `cred.rotate` | `cred.rotated` | YES | YES |
| `domain.verify_dns`| `DOMAIN` | `domain.write` | SAFE | DNS Query Check | Edge Route | NO | `domain.verify_dns` | `domain.verified` | NO | YES |
| `domain.rebind` | `DOMAIN` | `domain.admin` | APPROVAL_REQUIRED| Target Env Health | Customer Traffic | YES | `domain.rebind` | `domain.rebound` | YES | YES |
| `flag.toggle` | `FEATURE_FLAG`| `flag.write` | SAFE | Scope Evaluation | Target Users | NO | `flag.toggle` | `flag.toggled` | YES | NO |
| `quota.override` | `QUOTA` | `quota.admin` | CONTROLLED | Plan Limit Ceiling | Billing Engine | YES (Prod raise) | `quota.override` | `quota.overridden` | YES | NO |
