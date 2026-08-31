# ⚡ Request Lifecycle & Security Flow Guide

> **The Complete Visual Lifecycle of an Inbound Request across Header Extraction, Zero-Trust Authorization, Dynamic Filtering, and Cryptographic Auditing.**

---

## 1. Complete Request Lifecycle Flowchart

```mermaid
flowchart TD
    REQ(["🌐 Inbound HTTP / gRPC Request"]) --> S1["1. Domain & Header Resolution<br><i>Extract Host, Subdomain, X-Context-Id, JWT</i>"]
    
    S1 --> AUTH_CHECK{"Valid Bearer Token?"}
    AUTH_CHECK -- No & enforceAuth=true --> E401["🛑 401 Unauthorized"]
    AUTH_CHECK -- Yes --> S2["2. Context Hierarchy Resolution<br><i>Fetch node from memory tree & check active status</i>"]
    
    S2 --> STATUS_CHECK{"Tenant Active?"}
    STATUS_CHECK -- Suspended/Archived --> E403["🛑 403 Forbidden: Inactive Tenant"]
    STATUS_CHECK -- Active --> S3["3. 3-Layer Zero-Trust Authorization Gate"]
    
    subgraph ZeroTrust ["🔒 3-Layer Authorization Pipeline"]
        S3 --> L1["Layer 1: RBAC Role Check<br><i>e.g. medical_record.write</i>"]
        L1 --> L2["Layer 2: Dynamic ABAC JSON-Logic<br><i>e.g. on_duty == true</i>"]
        L2 --> L3["Layer 3: Context Boundary / Peer Mesh<br><i>Is target node in user's tree or active peer link?</i>"]
    end
    
    L3 --> ZT_CHECK{"All Layers Passed?"}
    ZT_CHECK -- Denied --> E403
    ZT_CHECK -- Allowed --> S4["4. Dynamic ORM Scope Filter Injection<br><i>req.orbitoxScopeFilter = { contextId: { $in: [...] } }</i>"]
    
    S4 --> S5["5. Entity Lifecycle Hooks Execution<br><i>beforeCreate / beforeUpdate / Quota Verification</i>"]
    S5 --> S6["6. Database Transaction Execution<br><i>ORM executes scoped SQL on DB</i>"]
    
    S6 --> S7["7. Distributed Event Emission<br><i>BullMQ / Redis Event Bus</i>"]
    S7 --> S8["8. SHA-256 Audit Vault Chaining<br><i>Cryptographic hash linked to previous block</i>"]
    
    S8 --> RES(["✅ 200/201 Success Response to Client"])
```

---

## 2. 6-Stage Processing Pipeline Table

| Stage | Component | Action Performed | Security Guarantee |
| :--- | :--- | :--- | :--- |
| **Stage 1** | `orbitox.middleware()` | Extracts Host header, subdomains, and JWT | Prevents unauthenticated access |
| **Stage 2** | `ContextService` | Resolves tenant hierarchy node and status | Blocks suspended or archived accounts |
| **Stage 3** | `PolicyEngine` & `RbacService` | Evaluates RBAC + ABAC + Context Boundary | Enforces zero-trust mathematical isolation |
| **Stage 4** | `SecurityFacade` | Injects `$in` scope filter for database query | Completely eliminates IDOR vulnerabilities |
| **Stage 5** | `EntityHooks` | Executes business validations and quota checks | Enforces atomic SaaS licenses & capacity |
| **Stage 6** | `AuditService` | Computes SHA-256 hash linked to previous log | Guarantees immutable compliance ledger |
