# 01 — High-Level Architecture

> **System topology reference** – shows every layer from edge security to data store, with caching strategy and disaster recovery posture.

---

## System Topology — Full Layer Diagram

```mermaid
flowchart TD
    subgraph EDGE ["☁️ Edge & Security Layer"]
        WAF["🛡️ Web Application Firewall\nCloudflare / AWS WAF\n• OWASP Top 10 Protection\n• DDoS Mitigation\n• Bot Detection"]
        CDN["📦 CDN\nStatic Assets\nEdge Caching"]
        LB["⚖️ Load Balancer\nAWS ALB / GCP LB\nHealth Checks + SSL Termination"]
    end

    subgraph GATEWAY ["🚪 API Gateway Layer"]
        GW["🔀 API Gateway\nKong / Nginx\n• Rate Limit (Global)\n• JWT Verify\n• Request Logging\n• Payload Size Guard (5MB max)"]
    end

    subgraph RESOLUTION ["🧩 Context Resolution Layer"]
        RESOLVER["🔍 Multi‑Tier Context Resolver\nResolves: OrgID + TenantID + CompanyID\nSources: Domain · Subdomain · JWT · Header"]
        RL["⚡ Tiered Rate Limiter\nRedis Sliding Window\nPer: IP / Company / Tenant / Org"]
    end

    subgraph APP ["🏗️ Application Layer — NestJS Micro‑Monolith"]
        IAM["🔐 Identity & IAM\nJWT RS256 · MFA · SSO"]
        CORE["⚙️ Core B2B2C Engine\nDomain Services · Plugin Orchestrator"]
        BILLING["💰 Billing Engine\nStripe Connect · Rev‑Share Splitter"]
        NOTIFY["📣 Notification Engine\nEmail · SMS · Push · WhatsApp"]
        AI["🤖 AI Orchestrator\nCopilots · RAG Router · PII Guard"]
    end

    subgraph DATA ["🗄️ Data Layer"]
        PG_PRIMARY["🐘 PostgreSQL Primary\nWrite Node · RLS Enforced"]
        PG_REPLICA["🐘 PostgreSQL Replicas\nRead Nodes (x2)"]
        REDIS["⚡ Redis Cluster\nSessions · Cache · Rate Limits · Queues"]
        VECTOR["🧠 pgvector / Qdrant\nIsolated AI Embeddings per Tenant"]
        S3["🪣 S3 / Object Storage\nFiles · Exports · Backups"]
        ELASTIC["🔎 ElasticSearch\nAudit Logs · Full‑Text Search"]
    end

    WAF --> CDN & LB
    LB --> GW
    GW --> RESOLVER --> RL --> IAM & CORE & BILLING & NOTIFY & AI
    CORE --> PG_PRIMARY --> PG_REPLICA
    CORE --> REDIS
    AI --> VECTOR
    CORE --> S3
    CORE --> ELASTIC
```

---

## Theme & Branding Configuration Table

| Config File | Scope | Description |
|-------------|-------|-------------|
| `config/theme.json` | Global | Default color palette, typography, logo URLs (overridable per tier) |
| `config/uiOverrides.yaml` | Per‑Tier | Allows tenants or companies to replace component UI schemas |
| `config/featureFlags.yaml` | Global/Tier | Feature flag toggles controlling module activation |

All UI theming is consumed at runtime by a **Theme Service** that merges the hierarchy (SuperAdmin → Organisation → Tenant → Company). No hard‑coded colors remain in the codebase.

---

## Multi‑Region Deployment Topology

```mermaid
flowchart LR
    subgraph Primary ["🌍 Primary Region — ap‑south‑1"]
        PG_PRI["PostgreSQL Primary\n(Write Node)"]
        APP1["App Cluster\n(Active)"]
        REDIS1["Redis Primary"]
    end

    subgraph Secondary ["🌏 Secondary Region — ap‑southeast‑1"]
        PG_SEC["PostgreSQL Replica\n(Promoted on Failover)"]
        APP2["App Cluster\n(Warm Standby)"]
        REDIS2["Redis Replica"]
    end

    subgraph DR ["🚨 Disaster Recovery"]
        S3_WAL["S3 WAL Archive\nRPO: 5 minutes"]
        TF["Terraform Auto‑Spin\nRTO: 60 minutes"]
    end

    APP1 --> PG_PRI --> PG_SEC
    PG_PRI --> S3_WAL --> TF --> PG_SEC
    REDIS1 --> REDIS2
    APP1 -.->|Failover| APP2
```

---

## Request Context Resolution — Decision Tree

```mermaid
flowchart TD
    Req([Incoming Request]) --> HasDomain{Custom Domain\nIn Host Header?}
    HasDomain -->|Yes| DBLookup[Lookup Domain in Redis Cache]
    DBLookup --> CacheHit{Cache Hit?}
    CacheHit -->|Yes| Inject[Inject OrgID + TenantID]
    CacheHit -->|No| DBFetch[Fetch from PostgreSQL\nCache for 5 min TTL]
    DBFetch --> Inject

    HasDomain -->|No| HasSubdomain{Subdomain Pattern?\ne.g. companyX.app.com}
    HasSubdomain -->|Yes| SubLookup[Resolve Subdomain → CompanyID]
    SubLookup --> Inject

    HasSubdomain -->|No| HasJWT{Valid JWT\nBearer Token?}
    HasJWT -->|Yes| JWTExtract[Extract org_id + tenant_id +\ncompany_id from JWT claims]
    JWTExtract --> Inject

    HasJWT -->|No| HasHeader{X‑Org‑ID &\nX‑Tenant‑ID Headers?}
    HasHeader -->|Yes| ValidateHMAC[Validate HMAC‑SHA256\nHeader Signature]
    ValidateHMAC --> Inject

    HasHeader -->|No| Reject([❌ 400 Bad Request\nCannot Resolve Tenant Context])
    Inject --> Next([✅ Proceed to Rate Limiter])
```

---

## Multi‑Tier Caching Architecture

```mermaid
flowchart LR
    App[Application Service] --> L1{L1: In‑Memory\nProcess Cache}
    L1 -->|Miss| L2{L2: Redis\nShared Cache}
    L2 -->|Miss| L3{L3: PostgreSQL\n Read Replica}
    L3 -->|Fetch| L2
    L2 -->|Populate| L1
    L1 -->|Return| App

    subgraph Keys ["Cache Key Convention"]
        K1["tenant:{id}:config:{key}"]
        K2["company:{id}:users:list"]
        K3["org:{id}:dashboard:stats"]
    end

    subgraph Invalidation ["Cache Invalidation"]
        M[Config Mutation] --> Pub[Redis Pub/Sub INVALIDATE message]
        Pub --> L1I[Flush L1 across all pods]
        Pub --> L2I[Delete L2 key pattern]
    end
```

---

## Non‑Functional Requirements Summary

| Category | Requirement |
|----------|-------------|
| Availability | 99.99 % SLA (≤ 52 min downtime/year) |
| Throughput | 50 k req/s peak |
| Latency (P99) | < 200 ms for authenticated requests |
| DB Scale | 100 M+ rows/tenant with partitioning |
| Recovery | RPO 5 min · RTO 1 hr |

All knobs are exposed via `config/performance.yaml` for easy tuning.
