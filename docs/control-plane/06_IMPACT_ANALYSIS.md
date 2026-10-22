# 🪐 Impact Analysis Engine Specification (CP-06)
**Classification: Platform Intelligence & Pre-Execution Safety**

---

## 1. Executive Purpose

The **`ImpactAnalysisEngine`** eliminates accidental platform outages by answering the fundamental engineering question:

> **"What breaks if I execute this action?"**

Before any high-blast mutation (disabling a package, draining a server node, modifying a rate limit policy, revoking an API key, or downgrading a plan tier), the engine traverses the in-memory `ResourceGraph` DAG and calculates:
1. All directly affected nodes.
2. All transitively affected downstream consumers (projects, environments, tenants, APIs, keys).
3. The composite risk score ($0 - 100$).
4. Whether the action is permitted, requires Four-Eyes Quorum, or is **hard-blocked**.

---

## 2. Impact Calculation Matrix

```typescript
export interface ImpactAssessment {
  readonly action: string;
  readonly targetResourceId: string;
  readonly targetResourceType: string;
  readonly riskScore: number;           // 0 to 100
  readonly riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly verdict: 'PERMITTED' | 'REQUIRES_APPROVAL' | 'BLOCKED';
  readonly blockerReason?: string;
  
  // Affected Counts
  readonly affectedProjectsCount: number;
  readonly affectedEnvironmentsCount: number;
  readonly affectedTenantsCount: number;
  readonly affectedApisCount: number;
  readonly affectedKeysCount: number;
  readonly affectedNodesCount: number;
  
  // Granular Entity Lists
  readonly directImpacts: ResourceSummary[];
  readonly transitiveImpacts: ResourceSummary[];
  readonly suggestedMitigations: string[];
}
```

---

## 3. Concrete Impact Examples

### Example A: Disabling Package `@orbitox/restaurant`
- **Graph Traversal**: `Package` ➔ `Versions` ➔ `Installations` ➔ `Environments` ➔ `Projects` ➔ `Services` ➔ `APIs` ➔ `API Keys`.
- **Calculated Blast Radius**:
  - 12 Projects
  - 38 Environments (3 Production)
  - 94 Tenants
  - 17 APIs
  - 31 Active API Keys
- **Verdict**: `REQUIRES_APPROVAL` (Risk Score: 92, Production affected).
- **Control Center Display**: Operator is presented with the detailed impact modal requiring typed confirmation and secondary peer sign-off.

### Example B: Downgrading Plan from `Pro` to `Starter`
- **Graph Traversal**: `Plan` ➔ `Project` ➔ `Environments` ➔ `Storage Quota` & `Active Packages`.
- **Calculated Check**:
  - Current storage: 42 GB. Target Starter limit: 10 GB.
  - Active packages: 5. Target Starter limit: 2 packages.
- **Verdict**: **`BLOCKED`** (Risk Score: 100).
- **Reason**: `Downgrade would cause immediate data loss or service disruption. Customer currently utilizes 5 packages and 42 GB storage. Archive 3 packages and reduce storage below 10 GB before downgrade can proceed.`
