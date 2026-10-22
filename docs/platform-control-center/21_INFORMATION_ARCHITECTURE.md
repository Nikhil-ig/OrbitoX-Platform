# 🪐 OrbitoX Platform Control Center: Information Architecture (v3.1)
**Document Ref: PCC-21**  
**Classification: Site Hierarchy, Role Projections & Navigation Taxonomy**

---

## 1. Unified Navigation Hierarchy

To eliminate the cluttered list of 11 flat sidebar links, navigation is grouped into clean, recognizable functional domains:

```
ORBITOX
Control Center

Overview                       → /platform

WORKSPACE
├── Projects                   → /platform/projects
├── Packages                   → /platform/packages
└── Access
    ├── API Keys               → /platform/api-keys
    └── Credentials            → /platform/credentials

SECURITY
├── Security Posture           → /platform/security
├── Immutable Audit            → /platform/audit
└── Four-Eyes Approvals        → /platform/approvals

OPERATIONS
├── Observability              → /platform/observability
└── Verification Center        → /platform/tests

DEVELOPER
├── API Explorer               → /platform/explorer
└── AI & MCP Gateway           → /platform/ai

SYSTEM
└── Settings                   → /platform/settings
```

---

## 2. Top Bar & Contextual Breadcrumbs

The top bar strictly contains:
- **Left**: Minimal breadcrumbs (`Platform / Overview`, `Platform / Projects / OmniDeliver`).
- **Center**: Global Search (`Search projects, keys, packages… ⌘K`).
- **Right**:
  - Environment Switcher (`Production ▾` with amber warning indicator for production mode).
  - Activity / Notification Bell with unread counter.
  - Operator Profile Avatar & Role pill (`SuperAdmin`).

---

## 3. Role-Based Information Density

The Platform Control Center adapts its priority and landing content based on operator persona:

1. **Platform SuperAdmin**: Focuses on Projects, Access Management, Package Deployments, and Quorum Governance.
2. **Security Admin**: Surfaces Attention findings, Key expirations, Vault health, and Four-Eyes queues.
3. **SRE / DevOps**: Focuses on Service Latency, Gateway error rates, Redis/DB saturation, and Test suites.
4. **Compliance Auditor**: Directly accesses Immutable SHA-256 Ledger, Merkle integrity sweep, and Approval stage logs.
