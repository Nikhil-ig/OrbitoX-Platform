# 🪐 Command Model & Idempotent Mutation Pipeline (CP-05)
**Classification: Execution Pipeline & Concurrency Control**

---

## 1. Universal Command Structure

All state-altering mutations within the Control Plane enter through an immutable **`PlatformCommand`**:

```typescript
export interface PlatformCommand<TPayload = unknown> {
  // 1. Traceability & Correlation
  readonly commandId: string;           // cmd_01j7...
  readonly correlationId: string;       // Distributed trace ID
  readonly idempotencyKey: string;      // Prevents duplicate operations
  
  // 2. Identity & Context
  readonly actor: {
    readonly userId: string;
    readonly role: string;
    readonly ipAddress: string;
    readonly userAgent?: string;
  };
  
  // 3. Target Resource
  readonly resourceType: ResourceType;
  readonly resourceId: string;
  readonly expectedVersion: number;     // Enforces optimistic concurrency
  
  // 4. Intent & Payload
  readonly operation: string;           // 'package.install', 'key.rotate', 'plan.update'
  readonly desiredPayload: TPayload;
  readonly reason?: string;
  readonly dryRun?: boolean;            // When true: performs pre-flight simulation only
}
```

---

## 2. The 17-Step Execution Pipeline

```
 1. INGEST COMMAND
    │ Verify schema syntax & non-empty idempotencyKey
 2. AUTHENTICATE ACTOR
    │ Verify JWT session or machine token validity
 3. AUTHORIZE RBAC/ABAC
    │ Verify actor holds permission for operation on resource
 4. ACQUIRE LEASE
    │ In-memory Redis lease to prevent concurrent operations on same resource
 5. CHECK OPTIMISTIC CONCURRENCY
    │ Validate expectedVersion == resource.version (prevent lost updates)
 6. LOAD RESOURCE GRAPH
    │ Traverse in-memory DAG for target node
 7. RUN IMPACT ANALYSIS
    │ Calculate direct and indirect affected dependents
 8. CHECK POLICY RESOLUTION
    │ Ensure change adheres to platform, project, and environment policies
 9. VERIFY ENTITLEMENTS
    │ Ensure active plan tier covers requested resources/capabilities
10. SOLVE DEPENDENCIES
    │ Verify upstream prerequisites are active and compatible
11. EVALUATE RISK SCORE (0 - 100)
    │ Calculate composite blast-radius score based on production status and consumers
12. FOUR-EYES QUORUM GATE
    │ If riskScore >= 80 or action is CRITICAL: require dual sign-off
13. BUILD EXECUTION PLAN
    │ Generate discrete ordered steps (e.g. backup, migrate, deploy, verify)
14. EXECUTE MUTATION
    │ Execute atomic database write inside transaction
15. PERSIST OUTBOX MESSAGE
    │ Enqueue event in PostgreSQL Outbox for guaranteed downstream publishing
16. TRIGGER RECONCILIATION
    │ Notify ReconciliationEngine of new desired state
17. RECORD MERKLE AUDIT LEDGER
    │ Write cryptographically chained audit record via AuditService
```
