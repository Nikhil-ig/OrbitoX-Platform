# 🪐 Guide 16: Client Projects & O2O2B2B2C Ecosystem Engine

> **The Enterprise Multi-Tenant Platform-as-a-Service (PaaS) Manual for OrbitoX OS.**  
> How to onboard clients, provision API credentials, govern multi-tier business models (O2O2B2B2C, B2B2C, D2C), assemble pre-built microservices without writing code from scratch, and dynamically enforce quotas and rate limits in real time.

---

## 📑 Master Table of Contents
1. [🌟 Identity & Architectural Philosophy](#1--identity--architectural-philosophy)
2. [🏗️ Supported Business Architecture Models (O2O2B2B2C, B2B2C, D2C)](#2-️-supported-business-architecture-models)
3. [📦 Zero-Code Plugin Package Assembly](#3--zero-code-plugin-package-assembly)
4. [🚀 1-Line Client Bootstrapper (`createOrbitoX`)](#4--1-line-client-bootstrapper-createorbitox)
5. [🔑 Cryptographic API Key Issuance & Provisioning](#5--cryptographic-api-key-issuance--provisioning)
6. [🎛️ Dynamic Plan Tiers, Quotas & Resource Tuning](#6-️-dynamic-plan-tiers-quotas--resource-tuning)
7. [🛡️ Zero-Trust Gateway Enforcement (`withApiGuard`)](#7-️-zero-trust-gateway-enforcement-withapiguard)
8. [📡 REST API Catalog & Management Endpoints](#8--rest-api-catalog--management-endpoints)
9. [💻 Multi-Language Integration Examples (Node.js, cURL, Python, React)](#9--multi-language-integration-examples)
10. [🚨 Operational Playbook & Troubleshooting](#10--operational-playbook--troubleshooting)

---

## 1. 🌟 Identity & Architectural Philosophy

Traditionally, when a software company or client wants to build an enterprise platform — such as a food delivery network, hospital chain, e-commerce brand, or retail franchise — they are forced to spend months building backend infrastructure from scratch: authentication, database partitioning, checkout engines, triage state machines, POS drawers, audit logs, and rate limiters.

**OrbitoX OS changes this paradigm entirely.**

OrbitoX is an enterprise **Multi-Tenant SaaS Operating System & Plugin Mesh**. Platform owners can provision external clients, partners, and business networks in seconds:
- **Instant Project Creation**: The admin provisions a tenant project with custom domains and business models.
- **Zero-Code Backend Assembly**: The admin selects which pre-built domain packages are activated for that project.
- **Instant API Credential**: An Ed25519-compatible API key (`orb_live_...`) is generated with 1 click.
- **1-Line Bootstrapping**: Clients initialize their application with a single call to `createOrbitoX({ license, domain, plugins })` or call the REST APIs directly.
- **Dynamic Governance**: The admin tracks live API consumption and adjusts plan tiers, monthly call quotas, and rate limits on the fly with live visual sliders — enforced instantly at the edge API gateway.

---

## 2. 🏗️ Supported Business Architecture Models

OrbitoX provides first-class architectural tags and workflow presets for complex multi-tier ecosystems:

```mermaid
flowchart TD
    subgraph O2O2B2B2C Ecosystem Flow
        direction TB
        C["1. Consumer Mobile App\n(Places Online Order)"]
        COMM["@orbitox/commerce\n(Cart, Catalog & Checkout)"]
        REST["@orbitox/restaurant\n(Kitchen Display Line)"]
        POS["@orbitox/pos\n(Physical Pickup / Cash Drawer)"]
        CRM["@orbitox/crm\n(Merchant Loyalty & Profile)"]
        FIN["@orbitox/finance\n(Vendor Settlement Ledger)"]

        C --> COMM
        COMM --> REST
        REST --> POS
        POS --> CRM
        CRM --> FIN
    end
```

### 1. `O2O2B2B2C` (Online-to-Offline to Merchant-to-Consumer)
- **Use Case**: Cloud kitchens, multi-brand food delivery, pharmacy networks, and grocery fulfillment.
- **Package Stack**: `@orbitox/restaurant` + `@orbitox/pos` + `@orbitox/commerce` + `@orbitox/crm` + `@orbitox/finance` + `@orbitox/inventory`.
- **How It Works**:
  1. **Consumer** browses online catalog via Commerce Storefront.
  2. Order fires into **Merchant Kitchen Display** via Restaurant OS prep lines.
  3. Physical pickup or dispatch reconciled via **In-Store POS Register**.
  4. Customer history captured in **CRM Pipeline**.
  5. Multi-merchant revenue splits calculated in **Finance Ledger**.

### 2. `HEALTHCARE_NETWORK` (Multi-Hospital Clinical Matrix)
- **Use Case**: Hospital groups, acute trauma centers, and diagnostic laboratory chains.
- **Package Stack**: `@orbitox/hms` + `@orbitox/inventory` + `@orbitox/crm` + `@orbitox/hrms` + `@orbitox/finance`.
- **How It Works**: Emergency triage state machine (Level 1-5), ICU bed reservations, prescription dispensing, and doctor on-call scheduling.

### 3. `D2C` (Omnichannel Direct-to-Consumer)
- **Use Case**: Luxury apparel brands, cosmetics, and direct consumer goods.
- **Package Stack**: `@orbitox/commerce` + `@orbitox/inventory` + `@orbitox/pos` + `@orbitox/crm`.
- **How It Works**: High-speed headless storefront, warehouse stock reservations, multi-currency checkout, and in-person boutique POS.

### 4. `B2B_SaaS` (Enterprise Software Workspace)
- **Use Case**: B2B platforms, workflow automation, and client portals.
- **Package Stack**: `@orbitox/crm` + `@orbitox/finance` + `@orbitox/hrms`.

### 5. `B2B2C` (Multi-Campus Academies & Training)
- **Use Case**: Universities, tutoring franchises, and global certification portals.
- **Package Stack**: `@orbitox/school` + `@orbitox/finance` + `@orbitox/hrms` + `@orbitox/crm`.

### 6. `FRANCHISE_RETAIL` (Multi-Store Supermarkets)
- **Use Case**: Retail chains with offline cash drawers, barcode scanning, and central logistics.
- **Package Stack**: `@orbitox/pos` + `@orbitox/inventory` + `@orbitox/finance` + `@orbitox/commerce`.

---

## 3. 📦 Zero-Code Plugin Package Assembly

All OrbitoX domain capabilities are packaged into closed-core, sandboxed, and cryptographically verified modules under the `@orbitox-io` scope:

| Package Scope | Engine Name | Key Capabilities |
| :--- | :--- | :--- |
| `@orbitox-io/restaurant` | **Restaurant & Kitchen OS** | Kitchen Display System (KDS), station routing, table floor matrices, digital QR menus. |
| `@orbitox-io/pos` | **Omnichannel POS** | Multi-lane cash registers, offline sync queue, receipt generation, barcode inventory check. |
| `@orbitox-io/commerce` | **Commerce & Store Engine** | Headless cart, product variants, order lifecycle, live storefront customizer. |
| `@orbitox-io/crm` | **CRM & Sales Pipeline** | Algorithmic lead scoring (100/100), immutable state machine transitions, contact intelligence. |
| `@orbitox-io/finance` | **Finance & Ledgers** | General tax ledgers, multi-vendor payout splits, automated invoicing, Stripe webhooks. |
| `@orbitox-io/inventory` | **Inventory & Logistics** | Multi-warehouse SKU tracking, batch expiry alerts, stock transfer reservations. |
| `@orbitox-io/hms` | **Hospital OS (HMS)** | Emergency triage state machine, bed/ward allocation, EHR/EMR, IoT biometric telemetry. |
| `@orbitox-io/hrms` | **HRMS & Workforce** | Employee directories, departmental hierarchy, shift rosters, payroll generation. |
| `@orbitox-io/school` | **School & Campus OS** | Student registers, academic grading, tuition fee billing, parent alerts. |

---

## 4. 🚀 1-Line Client Bootstrapper (`createOrbitoX`)

Clients who integrate with OrbitoX do not write database models or microservice plumbing. They install the packages and initialize with a single call:

```typescript
import { createOrbitoX } from '@orbitox-io/plugin-engine';
import restaurant from '@orbitox-io/restaurant';
import pos from '@orbitox-io/pos';
import commerce from '@orbitox-io/commerce';
import crm from '@orbitox-io/crm';

// 1-Line Bootstrapper: All engines verified, sandboxed, and mounted automatically
const app = await createOrbitoX({
  license: 'orb_live_omni_7f9c2d1b4e8a', // Ed25519-signed client API token
  domain: 'api.omnideliver.global',     // Custom tenant domain
  plugins: [restaurant, pos, commerce, crm],
});

// Access mounted domain engines immediately:
console.log('Commerce Cart:', app.commerce.createCart());
console.log('Active Kitchen Orders:', app.restaurant.getKitchenTickets());
```

---

## 5. 🔑 Cryptographic API Key Issuance & Provisioning

### How to Provision a Client via the Platform Admin:
1. Navigate to **Client Projects** (`/admin/projects`).
2. Click **+ Provision Client Project**.
3. **Step 1 (Identity)**: Enter Project Name, Organization, Architecture Model (`O2O2B2B2C`, `Healthcare`, etc.), and Custom Domain (`api.partner.com`).
4. **Step 2 (Plan & Quotas)**: Select Plan Tier preset or customize with live sliders for API call limit, rate limit, and storage.
5. **Step 3 (Package Assembly)**: Check the boxes for the microservices required.
6. **Step 4 (Key & Code)**: The system generates the `orb_live_...` credential and formats the 1-line bootstrapper snippet for copy-paste.

### Key Prefix Format:
- Production: `orb_live_<slug_prefix>_<24_hex_chars>`
- Sandbox/Test: `orb_test_<slug_prefix>_<24_hex_chars>`

---

## 6. 🎛️ Dynamic Plan Tiers, Quotas & Resource Tuning

The Platform Administrator has total visibility and real-time control over all client plans and limits.

### Plan Presets Matrix:

| Plan Tier | Monthly API Quota | Sliding Rate Limit | Cloud Storage | Max Plugins | Target Audience |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Developer Sandbox** | 100,000 calls | 120 req / min | 10 GB | 2 | Free trial, local dev |
| **Growth Startup** | 1,000,000 calls | 600 req / min | 100 GB | 4 | Early-stage D2C, single clinic |
| **Pro Scale** | 5,000,000 calls | 1,800 req / min | 500 GB | 7 | Scaling brand, multi-store |
| **Enterprise Dedicated** | 25,000,000 calls | 5,000 req / min | 2,000 GB (2 TB) | 9 | Hospital network, school chain |
| **HyperScale O2O2B2B2C** | 100,000,000 calls | 12,000 req / min | 10,000 GB (10 TB) | 9 | Global delivery, high-frequency POS |

### Live Tuning Controls:
Inside the **Project Cockpit** (`/admin/projects/[projectId]`), the admin can adjust:
- **API Call Limit Slider**: e.g., 100K to 100M calls per cycle.
- **Rate Limit Slider**: e.g., 100 to 15,000 requests per minute.
- **Storage Slider**: e.g., 10 GB to 10 TB.
- **Status Toggle**: `active`, `throttled`, or `suspended`.
- **Package Switches**: 1-click toggles for all 9 packages.

> [!NOTE]
> All changes take effect immediately at the API Gateway without requiring a server reboot or deployment.

---

## 7. 🛡️ Zero-Trust Gateway Enforcement (`withApiGuard`)

Every incoming request to `/api/v1/*` passes through the zero-trust `withApiGuard` middleware:

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client / Partner App
    participant GW as withApiGuard Middleware
    participant State as PlatformApiState (RAM)
    participant Engine as Subscribed Engine (e.g. Commerce)

    Client->>GW: GET /api/v1/commerce/products (x-api-key, x-tenant-id)
    GW->>State: Resolve Project & Key
    alt Project Suspended
        GW-->>Client: HTTP 403 PROJECT_SUSPENDED
    else Package Not Subscribed
        GW-->>Client: HTTP 403 PLUGIN_NOT_ENTITLED
    else Monthly Quota Exceeded
        GW-->>Client: HTTP 429 TENANT_QUOTA_EXCEEDED
    else Rate Limit Exceeded
        GW-->>Client: HTTP 429 RATE_LIMIT_EXCEEDED (Retry-After)
    else Authorized
        GW->>Engine: Forward Request
        Engine-->>GW: Response Payload
        GW->>State: Record Quota Tick (+1)
        GW-->>Client: HTTP 200 OK (x-orbitox-latency-ms, x-orbitox-anti-tamper)
    end
```

### Gateway Error Catalog:

#### 1. `PLUGIN_NOT_ENTITLED` (HTTP 403)
Returned when a client queries an engine their project plan does not include:
```json
{
  "success": false,
  "error": {
    "code": "PLUGIN_NOT_ENTITLED",
    "message": "Your project [Aura Luxury Boutiques Group] is not subscribed to package [@orbitox/hms]. Enable this plugin package in your Project Settings or upgrade your plan.",
    "details": {
      "projectId": "proj-aura-d2c",
      "requestedService": "hms",
      "subscribedPackages": ["commerce", "inventory", "pos", "crm"]
    }
  }
}
```

#### 2. `TENANT_QUOTA_EXCEEDED` (HTTP 429)
Returned when monthly API call consumption hits the allocated quota:
```json
{
  "success": false,
  "error": {
    "code": "TENANT_QUOTA_EXCEEDED",
    "message": "Monthly API call quota of 5,000,000 calls for project [Aura Luxury] has been exceeded. Upgrade plan in Platform Admin.",
    "details": {
      "projectId": "proj-aura-d2c",
      "consumed": 5000001,
      "limit": 5000000
    }
  }
}
```

#### 3. `PROJECT_SUSPENDED` (HTTP 403)
Returned when the administrator suspends a project in the cockpit:
```json
{
  "success": false,
  "error": {
    "code": "PROJECT_SUSPENDED",
    "message": "Client project [OmniDeliver Global] has been suspended by Platform Administration.",
    "details": { "projectId": "proj-omnideliver", "status": "suspended" }
  }
}
```

---

## 8. 📡 REST API Catalog & Management Endpoints

### Project Governance Endpoints:

#### 1. List Projects: `GET /api/v1/admin/projects`
- **Query Params**: `?model=O2O2B2B2C&status=active`
- **Response**: List of projects with aggregated consumption metrics.

#### 2. Provision Project: `POST /api/v1/admin/projects`
- **Request Body**:
  ```json
  {
    "name": "FoodHub Express O2O2B2B2C",
    "organization": "FoodHub Delivery Corp",
    "businessModel": "O2O2B2B2C",
    "plan": "hyperscale",
    "customDomain": "api.foodhub-express.io",
    "enabledServices": ["restaurant", "pos", "commerce", "crm", "finance"],
    "customQuota": 100000000,
    "customRateLimit": 10000
  }
  ```
- **Response**: Created project record, generated API key, and complete onboarding kit.

#### 3. Single Project Operations: `/api/v1/admin/projects/:projectId`
- `GET`: Return single project details and associated API keys.
- `PATCH`: Update plan, call quota, rate limit, storage quota, enabled services, or status.
- `DELETE`: Deprovision project and revoke gateway routing.

---

## 9. 💻 Multi-Language Integration Examples

### Example 1: cURL Direct Call
```bash
curl -X GET "http://localhost:3005/api/v1/commerce/products" \
  -H "x-api-key: orb_live_omni_7f9c2d1b4e8a" \
  -H "x-tenant-id: omnideliver"
```

### Example 2: Node.js / TypeScript Direct SDK
```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: 'https://api.orbitox.io/api/v1',
  headers: {
    'x-api-key': process.env.ORBITOX_API_KEY,
    'x-tenant-id': 'omnideliver',
  },
});

async function placeKitchenOrder(tableNo: number, items: string[]) {
  const response = await client.post('/restaurant/orders', { tableNo, items });
  console.log('Order Fired to KDS:', response.data);
}
```

### Example 3: Python API Client
```python
import requests

ORBITOX_URL = "http://localhost:3005/api/v1"
HEADERS = {
    "x-api-key": "orb_live_omni_7f9c2d1b4e8a",
    "x-tenant-id": "omnideliver"
}

def fetch_menu():
    r = requests.get(f"{ORBITOX_URL}/restaurant/menu", headers=HEADERS)
    r.raise_for_status()
    return r.json()["data"]

print("Active Kitchen Menu:", fetch_menu())
```

### Example 4: React Storefront Hook
```tsx
import { useEffect, useState } from 'react';

export function CatalogGrid() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch('/api/v1/commerce/products', {
      headers: {
        'x-api-key': 'orb_live_aura_384029482',
        'x-tenant-id': 'aura-luxury'
      }
    })
      .then((res) => res.json())
      .then((data) => setProducts(data.data));
  }, []);

  return (
    <div className="grid">
      {products.map((p: any) => (
        <div key={p.id}>{p.name} - ${p.price}</div>
      ))}
    </div>
  );
}
```

---

## 10. 🚨 Operational Playbook & Troubleshooting

| Scenario | Root Cause | Resolution |
| :--- | :--- | :--- |
| **HTTP 403 `PLUGIN_NOT_ENTITLED`** | The project attempted to call an API for a package not included in `enabledServices`. | Open Project Cockpit (`/admin/projects/[id]`), toggle the package switch ON, and save. Takes effect instantly. |
| **HTTP 429 `TENANT_QUOTA_EXCEEDED`** | Project monthly call count reached `apiCallQuota`. | Adjust the **Monthly API Call Quota Slider** higher in the Project Cockpit or upgrade plan tier. |
| **HTTP 429 `RATE_LIMIT_EXCEEDED`** | Short burst of requests exceeded sliding-window limit per minute. | Increase **Rate Limit Slider** in cockpit or implement client-side exponential backoff. |
| **HTTP 403 `PROJECT_SUSPENDED`** | The administrator toggled project status to suspended. | Click **Activate Project** in the project cockpit header. |
| **Hydration & Cross-Tab Sync** | Changes in one admin tab not showing in another. | Automatic `storage` event listeners keep all browser tabs synchronized via `localStorage` keys (`orbitox_admin_projects`, `orbitox_admin_apikeys`). |

---

## 📄 Summary

---

## 12. 🌐 Multi-Server & Distributed Cluster Architecture

When scaling OrbitoX beyond a single instance to **multiple servers** (e.g., multi-core bare metal, multi-server VPS clusters, AWS ECS/EKS, or multi-region Kubernetes pods), OrbitoX utilizes a **Stateless Compute + Distributed State Backplane** architecture.

### Cluster Topology Diagram:

```mermaid
flowchart TD
    subgraph Traffic ["1. Anycast Ingress & SSL Termination"]
        USER["Clients & Consumers\n(Web, Mobile, POS Registers)"]
        LB["Layer 7 Reverse Proxy / Load Balancer\n(Cloudflare CDN / AWS ALB / Nginx Cluster)\nDistributes across servers via Round Robin / Least Connections"]
    end

    subgraph AppServers ["2. Stateless OrbitoX App Tier (Horizontally Scalable)"]
        SRV1["OrbitoX Server 1\n(Port 3001)"]
        SRV2["OrbitoX Server 2\n(Port 3002)"]
        SRV3["OrbitoX Server N\n(Port 300N)"]
    end

    subgraph StateBackplane ["3. Distributed Shared State Backplane"]
        REDIS["Redis / Dragonfly Cluster\n• Distributed Sliding Rate Limiter\n• Pub/Sub Cache Invalidation\n• Asynchronous Event Queues"]
        PGBOUNCE["PgBouncer Connection Multiplexer\n• Multiplexes 10,000 requests into 30 DB pools"]
        POSTGRES["PostgreSQL Primary Database\n+ Optional Read Replicas"]
    end

    USER -->|Custom Domains (*.orbito.com, api.partner.com)| LB
    LB -->|Passes Host & X-Forwarded-*| SRV1
    LB -->|Passes Host & X-Forwarded-*| SRV2
    LB -->|Passes Host & X-Forwarded-*| SRV3

    SRV1 & SRV2 & SRV3 <-->|Sync Cache & Rate Limits| REDIS
    SRV1 & SRV2 & SRV3 -->|Pooled SQL Queries| PGBOUNCE
    PGBOUNCE --> POSTGRES
```

---

### Key Requirements for Multi-Server Deployment:

#### 1. Stateless App Servers (No Sticky Sessions Needed)
The OrbitoX runtime kernel and microservice plugins are 100% stateless. Any server can handle any request for any tenant at any moment:
- **Zero Local Sticky Session**: Session context is reconstructed in `~6 µs` on every request from the incoming token or domain.
- **Pass Ingress Headers**: Ensure your load balancer passes:
  ```nginx
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  ```

#### 2. Distributed Rate Limiting & Quotas (Redis Sliding Window)
In a multi-server setup, rate limiting (e.g. 10,000 req/min for OmniDeliver) is enforced across the entire cluster using Redis:
```typescript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

// Distributed sliding-window check in < 1ms:
async function checkDistributedRateLimit(projectId: string, limitPerMin: number): Promise<boolean> {
  const currentMinute = Math.floor(Date.now() / 60000);
  const key = `ratelimit:${projectId}:${currentMinute}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 120); // 2 minute TTL
  }
  return count <= limitPerMin;
}
```

#### 3. Cross-Server Cache Invalidation (Redis Pub/Sub)
When an administrator edits a project's quotas, adds a microservice package, or suspends a project in the Platform Admin:
1. The originating server writes the change to the database.
2. The server publishes an invalidation event: `redis.publish('orbitox:cache:invalidate', projectId)`.
3. All other app servers listen via Redis subscriber and call `engine.invalidateCache(domain)`, updating in-memory RAM caches in **`~1ms`** with zero downtime.

#### 4. Database Connection Multiplexing (PgBouncer)
If 20 app servers run with 10 Node.js worker processes each, they would open 200+ direct database connections. Placing **PgBouncer** in transaction pooling mode between the app servers and PostgreSQL allows thousands of concurrent queries to share 20–50 physical database connections.

---

### Production Multi-Server Setup Files:

#### A. Nginx Load Balancer (`nginx.conf`)
```nginx
upstream orbitox_cluster {
    least_conn; # Route to server with fewest active connections
    server 10.0.0.1:3005 max_fails=3 fail_timeout=10s;
    server 10.0.0.2:3005 max_fails=3 fail_timeout=10s;
    server 10.0.0.3:3005 max_fails=3 fail_timeout=10s;
    keepalive 64;
}

server {
    listen 80;
    listen 443 ssl http2;
    server_name ~^(?<subdomain>.+)$;

    # Pass SSL wildcard certificates
    ssl_certificate /etc/ssl/orbitox-wildcard.crt;
    ssl_certificate_key /etc/ssl/orbitox-wildcard.key;

    location / {
        proxy_pass http://orbitox_cluster;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $http_host;
        proxy_set_header X-Forwarded-Host $http_host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }
}
```

#### B. Production Docker Compose Cluster (`docker-compose.cluster.yml`)
```yaml
version: '3.8'

services:
  # Layer 7 Reverse Proxy & Load Balancer
  load-balancer:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - app-server-1
      - app-server-2
      - app-server-3

  # OrbitoX App Server Node 1
  app-server-1:
    image: orbitox/platform:latest
    environment:
      - NODE_ENV=production
      - PORT=3005
      - DATABASE_URL=postgresql://orbitox:secret@pgbouncer:6432/orbitox_prod
      - REDIS_URL=redis://redis:6379
    depends_on:
      - pgbouncer
      - redis

  # OrbitoX App Server Node 2
  app-server-2:
    image: orbitox/platform:latest
    environment:
      - NODE_ENV=production
      - PORT=3005
      - DATABASE_URL=postgresql://orbitox:secret@pgbouncer:6432/orbitox_prod
      - REDIS_URL=redis://redis:6379
    depends_on:
      - pgbouncer
      - redis

  # OrbitoX App Server Node 3
  app-server-3:
    image: orbitox/platform:latest
    environment:
      - NODE_ENV=production
      - PORT=3005
      - DATABASE_URL=postgresql://orbitox:secret@pgbouncer:6432/orbitox_prod
      - REDIS_URL=redis://redis:6379
    depends_on:
      - pgbouncer
      - redis

  # Distributed Redis Backplane (Rate Limiting & Pub/Sub)
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data

  # PgBouncer Connection Pooler
  pgbouncer:
    image: edoburu/pgbouncer:latest
    environment:
      - DB_USER=orbitox
      - DB_PASSWORD=secret
      - DB_HOST=postgres
      - POOL_MODE=transaction
      - MAX_CLIENT_CONN=10000
      - DEFAULT_POOL_SIZE=30
    depends_on:
      - postgres

  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=orbitox
      - POSTGRES_PASSWORD=secret
      - POSTGRES_DB=orbitox_prod
    volumes:
      - pg-data:/var/lib/postgresql/data

volumes:
  redis-data:
  pg-data:
```
