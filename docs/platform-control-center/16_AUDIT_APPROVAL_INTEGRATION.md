# 🪐 OrbitoX Platform Control Center: Audit & Approval Engine Integration
**Document Ref: PCC-16**  
**Classification: Governance Subsystems & Core Integration Specification**

---

## 1. Single Source of Truth: Core Governance Integration

A primary failure identified in the initial review was the proposal of duplicate governance tables (`PlatformAuditEvent` and `PlatformApprovalRequest`) running parallel to the existing enterprise primitives in `@orbitox/core`.

Creating parallel audit and approval engines introduces:
1. Split-brain audit ledgers where mutations recorded in the Control Center do not match the platform kernel.
2. Divergent cryptographic hash chains.
3. Inconsistent authorization workflows.

**The authoritative architectural mandate**:
> The Universal Platform Control Center **must not** create a second audit database or approval engine. It operates as a high-performance **API & UI façade** over the existing, battle-tested `@orbitox/core` [`AuditService`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/packages/core/src/audit/audit.service.ts) and [`ApprovalEngine`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/packages/core/src/approval/approval-engine.ts).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       GOVERNANCE INTEGRATION MAPPING                        │
└─────────────────────────────────────────────────────────────────────────────┘

       Control Center Admin UI                 External API Clients
                 │                                      │
                 └──────────────────┬───────────────────┘
                                    │
                                    ▼
                     Platform API Gateway & Controllers
                    (/api/v1/platform/*, /api/v1/admin/*)
                                    │
        ┌───────────────────────────┴───────────────────────────┐
        │                                                       │
        ▼                                                       ▼
 ┌──────────────┐                                        ┌──────────────┐
 │ApprovalEngine│                                        │ AuditService │
 │(@orbitox/core│                                        │(@orbitox/core│
 └──────┬───────┘                                        └──────┬───────┘
        │                                                       │
        ├── registerPolicy()                                    ├── log({ action, entity... })
        ├── requestApproval()                                   ├── computeChangedFields()
        ├── approveStage()                                      ├── SHA-256 Hash Chaining
        └── rejectRequest()                                     └── verifyChain() (Tamper Audit)
```

---

## 2. Immutable Hash-Chained Audit Ledger (`AuditService`)

The core [`AuditService`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/packages/core/src/audit/audit.service.ts) provides cryptographically linked record entries. Every row hashes its own content combined with the hash of the preceding row:

$$\text{rowHash}_n = \text{SHA-256}\left(\text{content}_n + \text{rowHash}_{n-1}\right)$$

### 2.1. Audit Pipeline for Platform Mutations:
```
1. Operator or Machine triggers privileged mutation (e.g. `key.rotate`, `service.block`).
2. Gateway verifies RBAC/ABAC authorization.
3. Domain action executes successfully.
4. Controller invokes `AuditService.log()`:
   {
     action: 'key.rotated',
     entityType: 'PlatformApiKey',
     entityId: keyId,
     userId: operatorId,
     userEmail: operatorEmail,
     contextId: environmentId,
     ipAddress: requestIp,
     requestId: traceRequestId,
     oldValue: sanitize(previousKeyRecord),
     newValue: sanitize(replacementKeyRecord),
     reason: operatorReason
   }
5. AuditService updates internal `lastHash` and persists hash-chained entry.
```

### 2.2. Zero Plaintext Secret Leakage Filter:
Before serialization to the audit ledger, all payloads pass through the universal `SecretRedactor`:
- Automatically redacts: `rawKey`, `secret`, `encryptedCiphertext`, `authVerifier`, `password`, `privateKey`, `authorization` headers.
- Replaces sensitive fields with `[REDACTED_SECRET_FINGERPRINT: 9F2A...81C7]`.

### 2.3. Control Center Audit Projection & Chain Verifier UI:
The Control Center surfaces two primary audit features:
1. **Interactive Event Stream (`/platform/audit`)**:
   - Filterable by Actor, Project, Environment, Event Type, and Date Range.
   - Expandable side-by-side JSON diffs of `oldValue` vs `newValue`.
2. **One-Click Cryptographic Ledger Audit**:
   - Executes `AuditService.verifyChain()`.
   - Traverses the entire cryptographic ledger from Genesis to Head.
   - If `previousHash` matches across all rows: Displays `100% Cryptographically Intact (Zero Tampering Detected)`.
   - If any database record was manually edited out-of-band: Immediately raises `CRITICAL: AUDIT_LEDGER_TAMPER_DETECTED` with the exact broken index.

---

## 3. Four-Eyes Quorum Governance (`ApprovalEngine`)

High-impact platform actions require two-person authorization (four-eyes principle) before execution. The Control Center leverages `@orbitox/core` [`ApprovalEngine`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/packages/core/src/approval/approval-engine.ts).

### 3.1. Standard Platform Approval Policies:
```ts
// Registered at platform bootstrap via ApprovalEngine.registerPolicy()
const POLICIES: ApprovalPolicy[] = [
  {
    id: 'policy_root_key_rotation',
    name: 'Platform Root Key Rotation / Revocation',
    entityType: 'PlatformApiKey',
    stages: [
      { requiredRoles: ['SecurityAdmin'] },
      { requiredRoles: ['RootSuperAdmin'] }
    ]
  },
  {
    id: 'policy_global_package_suspension',
    name: 'Global Microservice Emergency Suspension',
    entityType: 'PlatformPackage',
    stages: [
      { requiredRoles: ['SRE', 'SecurityAdmin'] },
      { requiredRoles: ['PlatformAdmin'] }
    ]
  },
  {
    id: 'policy_project_purge',
    name: 'Permanent Project Data Deprovisioning',
    entityType: 'PlatformProject',
    stages: [
      { requiredRoles: ['PlatformAdmin'] },
      { requiredRoles: ['RootSuperAdmin'] }
    ]
  }
];
```

### 3.2. Execution Flow for Guarded Operations:

```
Step 1: REQUEST
  Operator initiates critical action in Control Center.
  System detects action matches an active ApprovalPolicy.
  Engine creates `ApprovalRequest` with status `PENDING`.
  Action is held in staging; NO domain mutation occurs yet.

Step 2: NOTIFICATION & REVIEW
  Incident/Approval alert appears in Context Bar and `/platform/approvals`.
  Authorized peer (possessing required stage role) reviews preview, diff, and blast radius.

Step 3: APPROVAL OR REJECTION
  Peer authorizes stage: `ApprovalEngine.approveStage(requestId, stageId, approverId, roles, comment)`.
  If all stages pass: Status transitions to `APPROVED`.
  If peer rejects: Status transitions to `REJECTED`; action is aborted.

Step 4: AUTOMATED EXECUTION
  Once status === 'APPROVED', the orchestrator executes the staged mutation.
  Emits full audit entry linked to `approvalRequestId`.
```

---

## 4. Control Plane API Contracts for Governance

```ts
// GET /api/v1/platform/audit
// Query hash-chained audit events
export interface AuditQueryRequest {
  projectId?: string;
  environmentId?: string;
  actorId?: string;
  action?: string;
  limit?: number;
  cursor?: string;
}

// POST /api/v1/platform/audit/verify
// Execute ledger integrity audit
export interface AuditVerifyResponse {
  valid: boolean;
  totalEntries: number;
  brokenAtIndex?: number;
  genesisHash: string;
  headHash: string;
  verifiedAt: string;
}

// POST /api/v1/platform/approvals
// Request four-eyes authorization
export interface ApprovalCreationRequest {
  policyId: string;
  entityType: string;
  entityId: string;
  proposedAction: string;
  stagedPayload: Record<string, any>;
  justification: string;
}
```
