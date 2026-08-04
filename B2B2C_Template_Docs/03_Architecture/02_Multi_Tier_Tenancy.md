# 02 — Multi-Tier Tenancy Architecture

> **Data isolation is the most critical platform concern.** This document explains exactly how data from one tier never leaks to another, at every layer.

---

## The 5-Tier Data Isolation Model

```mermaid
flowchart TB
    subgraph DB ["🗄️ Single Shared PostgreSQL Database"]
        subgraph ORG_A ["org_id = ORG-A"]
            subgraph TEN_1 ["tenant_id = TEN-1"]
                COMP_X["company_id = COMP-X\nOrders, Customers, Products"]
                COMP_Y["company_id = COMP-Y\nOrders, Customers, Products"]
            end
            subgraph TEN_2 ["tenant_id = TEN-2"]
                COMP_Z["company_id = COMP-Z\nOrders, Customers, Products"]
            end
        end
        subgraph ORG_B ["org_id = ORG-B"]
            subgraph TEN_3 ["tenant_id = TEN-3"]
                COMP_W["company_id = COMP-W\nSeparate Isolated Data"]
            end
        end
    end

    COMP_X -.->|❌ BLOCKED by RLS| COMP_Y
    COMP_X -.->|❌ BLOCKED by RLS| COMP_Z
    COMP_X -.->|❌ BLOCKED by RLS| COMP_W
```

---

## ORM Middleware Filtering Pipeline

Every database query is automatically intercepted and filtered. Developers cannot accidentally bypass tenant scope.

```mermaid
sequenceDiagram
    autonumber
    participant Dev as Developer Code
    participant MW as Prisma Middleware
    participant ALS as AsyncLocalStorage\n(Request Context)
    participant DB as PostgreSQL

    Dev->>MW: prisma.orders.findMany({ where: { status: 'PAID' } })
    MW->>ALS: Read current requestContext
    ALS-->>MW: { tier: 'COMPANY', companyId: 'comp-123', tenantId: 'ten-456' }
    MW->>MW: Inject { company_id: 'comp-123', tenant_id: 'ten-456' } into WHERE clause
    MW->>DB: SELECT * FROM orders\nWHERE status='PAID'\nAND company_id='comp-123'\nAND tenant_id='ten-456'
    DB-->>Dev: Only Company 123's paid orders returned
    Note over Dev, DB: Developer wrote 0 tenant-filter code. It's automatic.
```

---

## IDOR Attack Prevention — Example

Indirect Object Reference (IDOR) is automatically neutralized by the middleware approach.

```mermaid
sequenceDiagram
    participant Attacker as 😈 Attacker\n(Company 1 User)
    participant API as API
    participant MW as RLS Middleware
    participant DB as Database

    Attacker->>API: GET /orders/ORDER-ID-FROM-COMPANY-2\nJWT: { company_id: "COMP-1" }
    API->>MW: Forward Request
    MW->>MW: Inject filter:\n{ company_id: "COMP-1" }
    MW->>DB: SELECT * FROM orders\nWHERE id='ORDER-ID-FROM-COMPANY-2'\nAND company_id='COMP-1'
    DB-->>API: NULL (0 rows)
    API-->>Attacker: 404 Not Found\n(Not 403 — Prevents probing)
```

---

## Immutable Hierarchy ID Write Rules

Once a record is created with `org_id`, `tenant_id`, `company_id` — these values **cannot be updated**. The middleware strips any attempt.

```mermaid
flowchart TD
    Write([UPDATE Request]) --> MW[ORM Middleware Intercepts]
    MW --> Strip["Strip Hierarchy ID Mutations:\ndelete data.org_id\ndelete data.tenant_id\ndelete data.company_id"]
    Strip --> Scope[Inject WHERE filter\n= Current Context IDs]
    Scope --> DB[(Execute Safe Scoped UPDATE)]
```

---

## Multi-Tier Cache Namespace Isolation

```mermaid
flowchart LR
    subgraph Redis ["⚡ Redis Key Namespace Convention"]
        K1["org:{orgId}:config:billing_rules"]
        K2["tenant:{tenantId}:branding:theme"]
        K3["company:{companyId}:users:count"]
        K4["consumer:{consumerId}:session"]
    end

    K2 -.->|❌ Cannot be read by| K3
    K3 -.->|❌ Cannot be read by| K2
```

**Key Rules:**
- Cache operations always read the `requestContext` from `AsyncLocalStorage` to determine the correct key prefix.
- A Company-tier service can ONLY create / read / delete keys prefixed with `company:{its_own_companyId}`.
