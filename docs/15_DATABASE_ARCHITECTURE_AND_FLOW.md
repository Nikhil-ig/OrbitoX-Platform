# 🗄️ OrbitoX Database Architecture & Data Flow Guide

> **The Definitive Deep-Dive on Database Mechanics, Multi-Tenant Storage Strategies, and the End-to-End Query Lifecycle in OrbitoX.**

---

## 📑 Table of Contents
1. [Executive Overview: The Zero-Complexity Data Engine](#1-executive-overview-the-zero-complexity-data-engine)
2. [Multi-Tenant Database Storage Strategies](#2-multi-tenant-database-storage-strategies)
3. [Universal Database Schema & Relational Topology](#3-universal-database-schema--relational-topology)
4. [The Complete Database Read Flow (Step-by-Step)](#4-the-complete-database-read-flow-step-by-step)
5. [The Complete Database Write Flow (Step-by-Step)](#5-the-complete-database-write-flow-step-by-step)
6. [Query Translation Matrix (Developer Code vs. Actual SQL)](#6-query-translation-matrix-developer-code-vs-actual-sql)
7. [Immutable Write Protection & IDOR Defense](#7-immutable-write-protection--idor-defense)
8. [Multi-Tier Cache Architecture (Redis Key Namespaces)](#8-multi-tier-cache-architecture-redis-key-namespaces)
9. [Database Sharding & Connection Pool Routing](#9-database-sharding--connection-pool-routing)
10. [Developer Best Practices & Freshers' Summary](#10-developer-best-practices--freshers-summary)

---

## 1. Executive Overview: The Zero-Complexity Data Engine

In traditional multi-tenant SaaS applications, developers struggle with two major database challenges:
1. **Data Leakage (Security Catastrophe):** A missing `WHERE tenant_id = ?` clause leaks one customer's private data to another customer.
2. **Monolithic Query Complexity:** Building deep hierarchies (e.g., Hospital → Dept → Ward → Bed, or Brand HQ → Franchise → Store → Register) requires fragile 10-table SQL `JOIN`s and nested subqueries.

### 💡 The OrbitoX Solution
OrbitoX solves this by decoupling **Physical Database Storage** from **Logical Tenant Isolation**:
- **Automatic ORM Middleware:** Every query is intercepted at the kernel level. Tenant discriminator filters are automatically injected into `WHERE` clauses before the SQL hits the database engine.
- **Hierarchical Path Indexing:** Data records are indexed by context paths (e.g., `root_1.org_2.dept_3`), allowing instant recursive sub-tree retrieval using fast B-Tree index scans.
- **Zero-SQL Security:** Developers write clean, standard queries (`db.patients.find()`), and OrbitoX guarantees 100% tenant isolation under the hood.

---

## 2. Multi-Tenant Database Storage Strategies

OrbitoX natively supports **3 distinct database isolation models** to meet varying security, scalability, and compliance requirements:

```mermaid
graph TD
    subgraph S1 ["Strategy 1: Shared DB + Shared Schema (Discriminator Column) [Recommended Default]"]
        DB1[(Single Shared PostgreSQL DB)]
        T1[All Tenants Table: patients]
        DB1 --- T1
        T1 --> R1["Row 1: { contextId: 'cardio-icu', name: 'Tony Stark' }"]
        T1 --> R2["Row 2: { contextId: 'neuro-ward', name: 'Bruce Banner' }"]
    end

    subgraph S2 ["Strategy 2: Shared DB + Separate PostgreSQL Schemas"]
        DB2[(Single PostgreSQL DB)]
        SCH1[Schema: tenant_apollo_ny]
        SCH2[Schema: tenant_st_jude_sf]
        DB2 --- SCH1
        DB2 --- SCH2
        SCH1 --- T2[Table: patients]
        SCH2 --- T3[Table: patients]
    end

    subgraph S3 ["Strategy 3: Isolated Database per Enterprise Tenant (Full Sharding)"]
        RT[OrbitoX Tenant Connection Router]
        DB_A[(Dedicated DB: Apollo NY)]
        DB_B[(Dedicated DB: St Jude SF)]
        RT -->|Tenant: apollo-ny| DB_A
        RT -->|Tenant: st-jude-sf| DB_B
    end
```

### 2.1 Storage Strategies Comparison Table

| Feature / Criteria | Strategy 1: Shared DB, Shared Schema (Default) | Strategy 2: Shared DB, Separate Schema | Strategy 3: Isolated DB per Tenant |
| :--- | :--- | :--- | :--- |
| **Isolation Mechanism** | Column-level Discriminator (`contextId`, `rootId`, `path`) + Middleware | PostgreSQL `search_path` schema separation | Separate Database Host / Connection String |
| **Cost Efficiency** | ⭐⭐⭐⭐⭐ Highest (Shared compute, shared pool) | ⭐⭐⭐⭐ High (Shared memory and CPU) | ⭐⭐ Lowest (Dedicated compute costs per tenant) |
| **Maximum Tenant Density** | Millions of tenants in a single cluster | ~10,000 schemas per PostgreSQL database | Limited by database server infrastructure |
| **Schema Migrations** | Instant (Single migration run across tables) | Loop required over all tenant schemas | Parallel migration orchestrator required |
| **Cross-Tenant Analytics** | Ultra-Fast (Single indexed query across tree) | Moderate (Requires cross-schema queries) | Complex (Requires ETL / Data Lake aggregation) |
| **Best For** | **95% of SaaS Apps**, Startups, SMBs, Scaleups | Mid-market clients requiring schema separation | Enterprise Banks, Government, Strict HIPAA Vaults |

---

## 3. Universal Database Schema & Relational Topology

In Strategy 1 (Shared Schema), OrbitoX organizes data using a standardized **Discriminator Topology**.

### 3.1 Universal Base Table Columns

Every entity table managed by OrbitoX includes the following immutable system discriminator columns:

```sql
CREATE TABLE patients (
    -- 1. Primary Record Identifier
    id VARCHAR(64) PRIMARY KEY,
    
    -- 2. OrbitoX N-Tier Context Discriminators
    context_id VARCHAR(64) NOT NULL,    -- Direct parent context (e.g. 'ctx_bed_101_a')
    root_id VARCHAR(64) NOT NULL,       -- Top-level Enterprise ID (e.g. 'ctx_apollo_global')
    path VARCHAR(512) NOT NULL,         -- Materialized Path (e.g. 'root.org_1.branch_2.dept_3.bed_4')
    depth INT NOT NULL DEFAULT 1,       -- Depth level in context tree (1 to N)
    
    -- 3. Ownership & Multi-User Scoping
    owner_id VARCHAR(64),               -- User who owns/created the record
    assigned_to VARCHAR(64),            -- Staff/Doctor currently assigned
    
    -- 4. Entity Specific Payload Fields
    name VARCHAR(255) NOT NULL,
    age INT NOT NULL,
    status VARCHAR(32) NOT NULL,
    
    -- 5. Audit & Concurrency Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INT NOT NULL DEFAULT 1
);

-- Essential Performance Indexes
CREATE INDEX idx_patients_context_id ON patients(context_id);
CREATE INDEX idx_patients_root_id ON patients(root_id);
CREATE INDEX idx_patients_path_prefix ON patients(path text_pattern_ops);
CREATE INDEX idx_patients_composite ON patients(context_id, status);
```

---

## 4. The Complete Database Read Flow (Step-by-Step)

When a client (e.g., a Doctor or Front Desk Nurse) issues a `GET` request to retrieve data, OrbitoX intercepts, enriches, scopes, and sanitizes the database read operation.

### 4.1 End-to-End Read Flow Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Client as 👨‍⚕️ Clinician / Client
    participant MW as 🛡️ OrbitoX Middleware
    participant Sec as 🔒 Security Facade
    participant Tree as 🌳 Context Engine
    participant ORM as ⚙️ ORM / DB Driver
    participant DB as 🗄️ PostgreSQL Database
    participant Audit as ⛓️ Audit Vault

    Client->>MW: GET /api/patients?status=admitted<br><i>Headers: [Authorization: Bearer doc_token, X-Context-Id: ctx_cardiology]</i>
    
    MW->>Tree: Resolve Context ('ctx_cardiology')
    Tree-->>MW: Context Node { id: 'ctx_cardiology', depth: 2, path: 'apollo.ny.cardio' }
    
    MW->>Sec: getVisibilityClause(contextId='ctx_cardiology', userId='doc_123', resource='patient')
    Sec->>Tree: getDescendants('ctx_cardiology')
    Tree-->>Sec: ['ctx_cardio_icu', 'ctx_bed_101_a', 'ctx_bed_101_b']
    Sec-->>MW: Filter: { contextId: { $in: ['ctx_cardiology', 'ctx_cardio_icu', 'ctx_bed_101_a', 'ctx_bed_101_b'] } }

    MW->>ORM: Execute findMany(query + injected scope filter)
    ORM->>DB: SELECT * FROM patients<br>WHERE status = 'admitted'<br>AND context_id IN ('ctx_cardiology', 'ctx_cardio_icu', 'ctx_bed_101_a', 'ctx_bed_101_b')
    DB-->>ORM: [ { id: 'pat_01', name: 'Tony Stark', context_id: 'ctx_bed_101_a' } ]
    
    ORM->>Sec: Sanitize PII (Field-level masking)
    Sec-->>MW: Masked & Sanitized Records
    MW->>Audit: Cryptographic Read Hash Logging (HIPAA Compliant)
    MW-->>Client: ✅ 200 OK: Returns Cardiology Patients Only
```

### 4.2 Step-by-Step Read Breakdown

1. **Context Extraction:** The middleware reads the `X-Context-Id` or subdomain (e.g. `cardiology.hospital.com`) and resolves the caller's context node.
2. **Recursive Descent Filter:** The `ContextService` computes all child IDs under Cardiology (`Cardio ICU`, `Bed 101-A`, `Bed 101-B`).
3. **Filter Injection:** The ORM middleware combines the developer's query (`status = 'admitted'`) with the context isolation clause (`context_id IN (...)`).
4. **Database Execution:** The database runs an indexed query scan. Rows from Neurology or Pediatrics are **physically excluded by the database engine**, preventing cross-tenant data leaks.
5. **PII Sanitization & Audit:** If configured, sensitive fields (SSN, credit cards) are masked, and the read is hashed into the immutable audit ledger.

---

## 5. The Complete Database Write Flow (Step-by-Step)

When a client creates, updates, or deletes data (e.g. `POST /api/patients`), OrbitoX ensures strict validation, license verification, context tagging, and audit immutability.

### 5.1 End-to-End Write Flow Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Client as 🏥 Admission Desk
    participant MW as 🛡️ OrbitoX Middleware
    participant Scaffolder as ⚡ Runtime API Engine
    participant Hooks as 🪝 Entity Lifecycle Hooks
    participant Billing as 💳 Billing Quota Engine
    participant DB as 🗄️ Database Transaction
    participant Bus as ⚡ Distributed Event Bus
    participant Audit as ⛓️ SHA-256 Audit Vault

    Client->>MW: POST /api/patients<br><i>Body: { name: 'Tony Stark', bedId: 'bed_101_a' }</i>
    
    MW->>MW: Sanitize Write Payload (Strip injected root_id/context_id mutations)
    MW->>Scaffolder: Process Entity Creation
    
    Scaffolder->>Hooks: Execute beforeCreate(payload, context)
    Hooks->>Billing: checkQuota(rootId, metric='maxBeds')
    Billing-->>Hooks: { allowed: true, remaining: 14 }
    Hooks->>Hooks: Verify Target Bed is Available in DB
    Hooks-->>Scaffolder: Validated Payload
    
    Scaffolder->>DB: BEGIN TRANSACTION
    Scaffolder->>DB: INSERT INTO patients (id, context_id, root_id, path, name, bed_id)<br>VALUES ('pat_99', 'bed_101_a', 'root_apollo', 'apollo.cardio.icu.101a', 'Tony Stark', 'bed_101_a')
    Scaffolder->>DB: UPDATE beds SET status = 'occupied' WHERE id = 'bed_101_a'
    Scaffolder->>DB: COMMIT TRANSACTION
    
    Scaffolder->>Hooks: Execute afterCreate(newRecord, context)
    Scaffolder->>Bus: emit('patient.admitted', { patientId: 'pat_99' })
    Scaffolder->>Audit: SHA-256 Hash Chain Record [Action: CREATE | Entity: Patient | ID: pat_99]
    
    Scaffolder-->>Client: ✅ 201 Created: { id: 'pat_99', name: 'Tony Stark', status: 'admitted' }
```

---

## 6. Query Translation Matrix (Developer Code vs. Actual SQL)

This table illustrates what developer code looks like versus the exact SQL executed by OrbitoX under the hood:

| Developer Query (Clean API) | Active User Context | Actual Raw SQL Generated by OrbitoX |
| :--- | :--- | :--- |
| `db.patients.findMany()` | **Cardiology Doctor** (`ctx_cardio`) | `SELECT * FROM patients WHERE context_id IN ('ctx_cardio', 'ctx_icu_a', 'ctx_bed_1', 'ctx_bed_2');` |
| `db.patients.findMany()` | **ICU Ward Nurse** (`ctx_icu_a`) | `SELECT * FROM patients WHERE context_id IN ('ctx_icu_a', 'ctx_bed_1', 'ctx_bed_2');` |
| `db.patients.findMany()` | **Hospital Super Admin** (`ctx_root`) | `SELECT * FROM patients WHERE root_id = 'ctx_root';` |
| `db.patients.findUnique({ id: 'pat_99' })` | **Neurology Doctor** (`ctx_neuro`) | `SELECT * FROM patients WHERE id = 'pat_99' AND context_id IN ('ctx_neuro', 'ctx_neuro_ward');`<br>*(Returns `NULL` $\rightarrow$ Triggers **Silent 404**)* |
| `db.inventory.findMany()` | **Peer Mesh Linked Depts** | `SELECT * FROM inventory WHERE context_id IN ('ctx_cardio', 'ctx_neuro_shared_vault');` |

---

## 7. Immutable Write Protection & IDOR Defense

OrbitoX protects databases from the two most dangerous multi-tenant vulnerabilities:

### 7.1 Indirect Object Reference (IDOR) Protection (Silent 404)
If an attacker from **Neurology** guesses a patient ID `pat_tony_stark` from **Cardiology** and tries:
```http
GET /api/patients/pat_tony_stark
```
OrbitoX injects the Neurology context scope into the query:
```sql
SELECT * FROM patients 
WHERE id = 'pat_tony_stark' 
AND context_id IN ('ctx_neurology', 'ctx_neuro_ward');
```
The database returns `0 rows` (`NULL`). OrbitoX returns a **`404 Not Found`** instead of a `403 Forbidden`.  
> [!IMPORTANT]
> Returning `404 Not Found` prevents attackers from probing the system to confirm if a record exists in another tenant.

### 7.2 Immutable Hierarchy Write Stripping
If a malicious user attempts to reassign a record to another tenant by injecting a payload:
```json
{
  "name": "Updated Patient Name",
  "contextId": "ctx_target_victim_tenant",
  "rootId": "ctx_target_victim_root"
}
```
The `securityFacade.sanitizeWritePayload()` engine intercepts the body and strips all hierarchy fields (`contextId`, `rootId`, `tenantId`, `orgId`, `path`) before the update SQL is generated, making tenant-hijacking impossible.

---

## 8. Multi-Tier Cache Architecture (Redis Key Namespaces)

To maintain blazing sub-millisecond read latency without breaking data isolation, OrbitoX isolates cache keys using a **Hierarchical Namespace Convention**:

```mermaid
graph LR
    subgraph Redis ["⚡ Multi-Tenant Redis Cache Cluster"]
        K1["orbitox : org_apollo : config : billing_limits"]
        K2["orbitox : org_apollo : tenant_ny : branding : theme"]
        K3["orbitox : org_apollo : dept_cardio : staff : on_duty"]
        K4["orbitox : org_apollo : bed_101_a : patient : active_vitals"]
    end

    K1 -. Invalidation Cascades Down .-> K2
    K2 -. Invalidation Cascades Down .-> K3
    K3 -. Invalidation Cascades Down .-> K4
```

### 8.1 Cache Key Standards

| Scope Level | Redis Key Template Pattern | Example Key |
| :--- | :--- | :--- |
| **Enterprise Root** | `orbitox:{rootId}:global:{key}` | `orbitox:root_apollo:global:billing_status` |
| **Hospital Facility**| `orbitox:{rootId}:{tenantId}:{entity}:{id}` | `orbitox:root_apollo:tenant_ny:census:total` |
| **Clinical Dept** | `orbitox:{rootId}:{deptId}:{entity}:{id}` | `orbitox:root_apollo:dept_cardio:roster:today` |
| **Point-of-Care Bed**| `orbitox:{rootId}:{bedId}:{entity}:{id}` | `orbitox:root_apollo:bed_101a:vitals:telemetry` |

---

## 9. Database Sharding & Connection Pool Routing

For massive Tier-1 enterprise clients requiring **isolated physical databases** (Strategy 3), OrbitoX includes a dynamic **Connection Pool Router**:

```typescript
import { orbitox } from '@orbitox/runtime';

// Define Multi-Database Connection Registry
const connectionMap = new Map<string, string>([
  ['apollo-ny', 'postgresql://user:pass@ny-db-cluster.internal:5432/hospital_ny'],
  ['st-jude-sf', 'postgresql://user:pass@sf-db-cluster.internal:5432/hospital_sf'],
]);

// Dynamic Tenant Connection Resolver
export function getTenantDatabaseConnection(tenantSlug: string) {
  const connectionString = connectionMap.get(tenantSlug) || process.env.DEFAULT_DATABASE_URL;
  return createDatabasePool(connectionString);
}
```

---

## 10. Developer Best Practices & Freshers' Summary

### 🎓 5 Golden Rules for Database Developers on OrbitoX:

1. **Never write manual `WHERE tenant_id = ?` queries:** Let OrbitoX's middleware inject `req.orbitoxScopeFilter` automatically.
2. **Always use Entity Hooks for capacity and business rules:** Put quota, inventory, and duplicate checks in `beforeCreate` hooks so they are atomic.
3. **Rely on Materialized Paths for sub-tree operations:** To fetch an entire department, ward, or hospital census, use the path prefix index for instant queries.
4. **Treat Hierarchy IDs as Immutable:** Never allow clients to update `context_id` or `root_id` on existing rows.
5. **Use Inter-Branch Mesh for cross-department lookups:** Use `orbitox.context.linkPeers()` instead of building fragile custom joins.

---

## 🎉 Related Documentation
- 📘 [**Hospital SaaS Architecture Blueprint (Doc 13)**](./13_USECASE_HOSPITAL_SAAS.md)
- 🧑‍💻 [**Hospital SaaS Developer Guide & TypeScript Types (Doc 14)**](./14_HOSPITAL_SAAS_DEVELOPER_GUIDE.md)
- 🛡️ [**Zero-Trust Security & Policy Engine (Doc 04)**](./04_ZERO_TRUST_SECURITY.md)
- 🧭 [**Master Documentation Index (README)**](./README.md)
