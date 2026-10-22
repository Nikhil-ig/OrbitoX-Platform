# 🪐 Reconciliation Engine & Drift Telemetry (CP-15)
**Classification: Autonomous State Convergence & SRE Automation**

---

## 1. Reconciliation Loop Mechanics

The **`ReconciliationEngine`** runs continuous control loops ensuring physical infrastructure converges toward desired state:

```mermaid
sequenceDiagram
    participant DB as Desired State (PostgreSQL)
    participant Reconciler as Reconciliation Worker Loop
    participant Probes as Infrastructure Probes (HTTP/gRPC/Redis)
    participant Infra as Physical Infrastructure (Nodes, Edge, DNS)
    participant Audit as Merkle Audit Ledger

    loop Every 5000ms
        Reconciler->>DB: Fetch Desired State Definitions
        Reconciler->>Probes: Query Observed Telemetry
        Reconciler->>Reconciler: Compute Delta Diff (Desired vs Observed)
        alt Perfect Alignment
            Reconciler->>DB: Mark IN_SYNC
        else Drift Detected (Safe)
            Reconciler->>DB: Mark RECONCILING
            Reconciler->>Infra: Execute Remediation Action (Scale up, re-verify DNS)
            Infra-->>Reconciler: Remediation Succeeded
            Reconciler->>DB: Mark IN_SYNC
            Reconciler->>Audit: Log Automated Convergence Event
        else Drift Detected (Unsafe / Destructive)
            Reconciler->>DB: Mark BLOCKED
            Reconciler->>Audit: Log Alert: Human Quorum Approval Required
        end
    end
```

---

## 2. Supported Autonomous Remediation Tasks

1. **Service Replica Drift**: Desired = 3, Observed = 2 ➔ Worker provisions missing container replica.
2. **Domain DNS Challenge Check**: Desired = `VERIFIED`, Observed = TXT record propagated ➔ Requests ACME certificate and updates status to `ACTIVE`.
3. **Stale Lease Eviction**: Recovers orphaned locks and commands stuck in `IN_PROGRESS` beyond timeout window.
4. **Token Bucket Sliding Window Sync**: Syncs atomic Redis rate-limit counters to PostgreSQL audit metrics.
