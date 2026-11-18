# 🪐 OrbitoX Platform OS — Phase 7C Stage 0
# Document 03: Navigation & Information Architecture

**Milestone:** Phase 7C Operations Console & System Screens  
**Governing Baseline:** Phase 7B.2 Delivered HEAD `188680c27ce51ebb8ca6e998e504c51a24c34fa0`  
**Date:** November 18, 2026 (Revised)  
**Auditor / Role:** Senior Staff Information Architect & UX Designer

---

## 1. Information Hierarchy & Navigation Structure

The Operations Console navigation is structured into four logical operational categories designed for fast operator triage and task completion, clearly delineating legal customer organizations from active runtime tenants:

```mermaid
graph LR
    subgraph NavigationHierarchy ["Operations Console Navigation (/console/*)"]
        direction TB
        
        subgraph GroupCore ["1. Core Command"]
            NAV_OVERVIEW["Overview (/console/overview)\n[KPIs, Telemetry, Active Incidents]"]
        end

        subgraph GroupFleet ["2. Fleet & Workloads"]
            NAV_ORGS["Organizations (/console/organizations)\n[Legal Entities, Owners, Memberships]"]
            NAV_TENANTS["Tenants (/console/tenants)\n[Runtime Workspaces, Branches, Domains]"]
            NAV_PROJECTS["Projects (/console/projects)\n[Environments, Templates, Runtimes]"]
            NAV_PROVISION["Provisioning (/console/provisioning)\n[Sagas, Jobs, Retries] (Badge: Failed Count)"]
        end

        subgraph GroupEcosystem ["3. Ecosystem & Commercial"]
            NAV_PACKAGES["Packages & Plugins (/console/packages)\n[Registry, Version Matrix, Grants]"]
            NAV_BILLING["Billing & Subscriptions (/console/billing)\n[Plans, Invoices, Razorpay Webhooks]"]
            NAV_APPROVALS["Approvals (/console/approvals)\n[Operational Change Requests]"]
        end

        subgraph GroupGovernance ["4. Security & Governance"]
            NAV_SECURITY["Security Center (/console/security)\n[API Keys, Operators, Sessions, MFA]"]
            NAV_AUDIT["Audit Trail (/console/audit)\n[Immutable Events, Search, Diffs]"]
            NAV_DATA["Data Rights (/console/data-rights)\n[Exports, Erasure Certificates]"]
        end

        subgraph BottomNav ["Utility & System"]
            NAV_SETTINGS["Configuration & Appearance (/console/settings/*)"]
            NAV_STATUS["System Health (/api/health)"]
        end
    end
```

---

## 2. Nav Item Specification & Badge Triggers

| Nav Item Label | Target Route | Icon Symbol | Category Group | Dynamic Badge Condition | Required Role |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Overview** | `/console/overview` | `Activity` | Core Command | Critical operational alert active (`count > 0`, Red). | `SUPPORT_READONLY` |
| **Organizations** | `/console/organizations`| `Building` | Fleet & Workloads | Pending customer onboarding verification (`Amber`). | `OPERATOR` |
| **Tenants** | `/console/tenants` | `Building2` | Fleet & Workloads | Runtime health degraded or suspended (`count > 0`, Amber).| `OPERATOR` |
| **Projects** | `/console/projects` | `Boxes` | Fleet & Workloads | Detected resource configuration drift (`count > 0`, Purple). | `OPERATOR` |
| **Provisioning** | `/console/provisioning` | `Cpu` | Fleet & Workloads | Failed or retrying provisioning jobs (`count > 0`, Red). | `OPERATOR` |
| **Packages & Plugins** | `/console/packages` | `Package` | Ecosystem & Commercial | Available plugin security updates (`count > 0`, Blue). | `OPERATOR` |
| **Billing & Plans** | `/console/billing` | `CreditCard` | Ecosystem & Commercial | Past-due subscriptions in grace period (`count > 0`, Amber). | `BILLING` |
| **Approvals** | `/console/approvals` | `CheckSquare` | Ecosystem & Commercial | Pending operator change requests (`count > 0`, Blue). | `OPERATOR` |
| **Security** | `/console/security` | `ShieldAlert` | Security & Governance | API keys expiring within 7 days (`count > 0`, Amber). | `PLATFORM_OWNER` |
| **Audit Trail** | `/console/audit` | `FileText` | Security & Governance | Real-time stream indicator. | `SUPPORT_READONLY` |
| **Data Rights** | `/console/data-rights` | `Lock` | Security & Governance | Active export jobs ready for download (`count > 0`, Green). | `PLATFORM_OWNER` |
| **Settings** | `/console/settings/appearance` | `Settings` | Utility & System | None. | `SUPPORT_READONLY` |

---

## 3. Global Header & Quick Action Layout

The console header remains sticky across all viewpoints, providing continuous situational awareness:
1. **Global Search Trigger (`Cmd+K` / `Ctrl+K`):**  
   Opens a modal command palette searching organizations, tenants, project IDs, order numbers, and operator accounts across the entire platform.
2. **Environment Pill Indicator:**  
   Displays the current deployment environment (`PRODUCTION`, `STAGING`, `DEVELOPMENT`) with distinctive color coding (Red for Production, Amber for Staging, Gray for Local) preventing accidental operational changes.
3. **Operator Profile & Quick Actions:**  
   Displays operator avatar, email, canonical role badge (`PLATFORM_OWNER`, `OPERATOR`, `BILLING`, `SUPPORT_READONLY`), active session expiry countdown, and one-click "Lock Session" action triggering immediate server-side session lock.
