# 🪐 ORBITOX CONTROL CENTER v4.2
## Universal Resource Editor Architecture Specification

**Specification Reference**: `docs/control-plane/33_UNIVERSAL_EDITOR_ARCHITECTURE.md`  
**Milestone**: v4.2 — Universal Resource Editor + Full Control  
**Core Principle**:  
- **OBSERVE EVERYTHING**  
- **UNDERSTAND EVERYTHING**  
- **EDIT EVERYTHING THAT IS CONFIGURABLE**  
- **CONTROL EVERYTHING THAT IS OPERABLE**  
- **PROTECT EVERYTHING THAT MUST REMAIN IMMUTABLE**  

---

## 1. Executive Summary & Purpose

The OrbitoX Control Center is not a dashboard, a database viewer, or an observability-only console. It is the **Universal Platform Orchestration and Resource Management Interface** for the entire OrbitoX Operating System.

In v4.1, the backend foundations were established: `ResourceGraph`, `ResourceRegistry`, `ImpactAnalysisEngine`, `PolicyResolutionEngine`, `PlatformCommandBus`, and `ReconciliationEngine`. However, the user experience remained primarily read-only (`Overview → Topology → Desired vs Observed → Blast Radius`).

**v4.2 transforms the Control Center into an active Control Surface**:
Every configurable resource can be inspected, edited, validated, previewed, authorized, approved, applied, reconciled, verified, and audited through one unified, schema-driven editor framework.

---

## 2. Universal Resource Classification Model

The platform strictly partitions all resource properties and capabilities into four discrete categories:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        UNIVERSAL RESOURCE MODEL                        │
├────────────────────┬────────────────────┬─────────────────┬────────────┤
│   CONFIGURABLE     │     OPERABLE       │    OBSERVED     │ IMMUTABLE  │
│  (Operator Edits)  │  (Command Actions) │   (Read-Only)   │ (Protected)│
├────────────────────┼────────────────────┼─────────────────┼────────────┤
│ • Metadata / Name  │ • Deploy / Scale   │ • Current CPU   │ • ID / URN │
│ • Desired Replicas │ • Restart / Drain  │ • Memory usage  │ • Signatures│
│ • Quotas / Limits  │ • Rotate / Revoke  │ • Active traffic│ • Audit log│
│ • Package configs  │ • Suspend / Active │ • Live health   │ • Causation│
│ • Security policy  │ • Publish / Retire │ • DNS response  │ • Invariants│
└────────────────────┴────────────────────┴─────────────────┴────────────┘
```

1. **CONFIGURABLE**: Editable by authorized administrators via schema-driven forms or JSON diffs.
2. **OPERABLE**: Executed via explicit operational commands (`service.scale`, `key.rotate`, `node.drain`, `plan.publish`).
3. **OBSERVED**: Telemetry and actual runtime measurements returned by infrastructure drivers and health probes. Never directly overwritten by the user.
4. **IMMUTABLE**: Core cryptographic hashes, Merkle ledger histories, audit causation IDs, and tenant boundaries. Guarded by the platform kernel.

---

## 3. The Universal Save & Apply Pipeline

Mutating a resource from the Control Center never bypasses platform governance:

```text
       UI / EDITOR
           │ (Changes Drafted)
           ▼
    VALIDATE SCHEMA (Client + Server)
           │
           ▼
    AUTHORIZE (ABAC / RBAC Identity Check)
           │
           ▼
    RESOLVE EFFECTIVE POLICY (Platform ∩ Plan ∩ Project ∩ Key)
           │
           ▼
    IMPACT ANALYSIS (Traverse Dependent Graph Nodes)
           │
           ▼
    FOUR-EYES APPROVAL CHECK (Risk >= 80 or Prod Deprovision)
           ├── [Requires Quorum] ──► APPROVAL_PENDING (Wait for peer review)
           │
           ▼ [Approved or Low-Risk]
    EXECUTE COMMAND VIA PLATFORM COMMAND BUS
           │
           ▼
    PERSIST DESIRED STATE & EMIT CANONICAL EVENT
           │
           ▼
    RECONCILIATION ENGINE (Detect Drift & Issue Driver Actions)
           │
           ▼
    OBSERVE RUNTIME STATE & VERIFY SYNCHRONIZATION
           │
           ▼
    CRYPTOGRAPHIC AUDIT LOG (Merkle Chained Ledger Entry)
```

---

## 4. Universal Editor States

Every resource editor lifecycle adheres to a deterministic state machine:

```text
[VIEW] ──(Click Edit)──► [EDIT] ──(Field Change)──► [DIRTY]
                            │                          │
                            │ (Discard)                │ (Save Draft)
                            ▼                          ▼
                          [VIEW]                    [DRAFT_SAVED]
                                                       │
                                                       │ (Preview Changes)
                                                       ▼
                                                 [PREVIEWING]
                                                 (Diff + Impact)
                                                       │
                                                       │ (Apply)
                                                       ▼
                                                 [VALIDATING]
                                                       │
                                                       ▼
                                                [AUTHORIZING]
                                                       │
                                   ┌───────────────────┴───────────────────┐
                                   ▼                                       ▼
                       [AWAITING_APPROVAL]                             [APPLYING]
                       (Four-Eyes Quorum)                                  │
                                   │                                       ▼
                                   └──────────────(Approved)────────► [RECONCILING]
                                                                           │
                                                                           ▼
                                                                      [VERIFYING]
                                                                           │
                                                           ┌───────────────┴───────────────┐
                                                           ▼                               ▼
                                                        [SAVED]                         [FAILED]
                                                      (In Sync)                            │
                                                                                           ▼
                                                                                     [ROLLED_BACK]
```

---

## 5. Schema Contract & Dynamic Rendering Engine

Instead of hand-crafting individual React pages for each plugin or resource, the Control Center renders a generic `UniversalResourceEditor` powered by `ResourceEditorSchema`:

```typescript
export interface ResourceEditorSchema {
  resourceType: string;
  displayName: string;
  sections: EditorSection[];
  actions: ResourceActionDefinition[];
  validationRules: EditorValidationRule[];
  permissions: EditorPermissionRule[];
}

export interface EditorSection {
  id: string;
  title: string;
  description?: string;
  fields: EditorFieldDefinition[];
}

export interface EditorFieldDefinition {
  key: string;
  label: string;
  description?: string;
  type: 
    | 'text' | 'textarea' | 'number' | 'integer' | 'boolean' 
    | 'enum' | 'multi-select' | 'resource-reference' | 'json' 
    | 'code' | 'cron' | 'duration' | 'secret-reference';
  required?: boolean;
  defaultValue?: any;
  editable: boolean;
  sensitive?: boolean;
  secret?: boolean;
  readonly?: boolean;
  options?: { label: string; value: any }[];
  targetResourceType?: string; // For resource references
  dependencies?: { field: string; equals: any }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    customValidator?: string;
  };
}
```

---

## 6. Self-Describing Discoverability ("What Can I Do?")

The Control Center exposes dynamic introspection APIs:
- `GET /api/v1/platform/resources/:id/schema`: Returns full editor schema, field types, and validation rules.
- `GET /api/v1/platform/resources/:id/configuration`: Returns current desired state, inherited properties, and active overrides.
- `GET /api/v1/platform/resources/:id/actions`: Returns operable commands with permission and approval status.
- `POST /api/v1/platform/resources/:id/preview`: Computes pre-flight diff, affected dependent resources, and risk rating.
- `POST /api/v1/platform/resources/:id/apply`: Executes the universal save pipeline.
- `POST /api/v1/platform/resources/:id/rollback`: Compensates and reverts to a designated configuration version.

---

## 7. Security Invariants & Protected Foundations

1. **Child Narrowing Only**: Child overrides (e.g. key-level or environment-level rate limits) can only narrow parent constraints; they can never expand platform or plan ceilings.
2. **Secrets Never Leaked**: Plaintext passwords, private keys, and tokens are never returned in schema, config, or diff APIs. They are replaced with `[REDACTED]` or cryptographic fingerprints.
3. **No Client Trust**: The browser sends desired changes and expected versions (`optimistic concurrency`). The backend independently re-evaluates all tenant, environment, and RBAC boundaries against authoritative storage.
