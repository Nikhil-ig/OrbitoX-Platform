# 🪐 OrbitoX Client Projects, Zero-Code Plugins & O2O2B2B2C Ecosystem Manual

> **The Definitive Guide to Onboarding Clients, Issuing API Keys, Assembling Zero-Code Packages, and Governing Multi-Tier Plans & Quotas.**

---

## 📑 Quick Navigation
1. [🌟 What This Engine Solves](#-what-this-engine-solves)
2. [🏗️ Business Architecture Models (O2O2B2B2C, B2B2C, D2C)](#️-business-architecture-models)
3. [📦 The 9 Pre-Built Plug-and-Play Packages](#-the-9-pre-built-plug-and-play-packages)
4. [🚀 1-Line Client Integration (`createOrbitoX`)](#-1-line-client-integration)
5. [🔑 How to Provision a Client & Issue API Keys](#-how-to-provision-a-client--issue-api-keys)
6. [🎛️ How to Set and Tune Plans, Quotas & Limits](#️-how-to-set-and-tune-plans-quotas--limits)
7. [🛡️ Zero-Trust Gateway Enforcement (`withApiGuard`)](#️-zero-trust-gateway-enforcement)
8. [📡 Developer REST API Catalog](#-developer-rest-api-catalog)
9. [💻 Multi-Language Code Examples](#-multi-language-code-examples)

---

## 🌟 What This Engine Solves

Previously, building a platform for multiple businesses, multi-hospital networks, or restaurant delivery ecosystems required developing individual backends, database partitioning, payment gateways, and rate limiters from scratch.

With OrbitoX:
1. **Clients do NOT write code from scratch**: All core engines (HMS, Commerce, Restaurant, POS, CRM, Finance, Inventory, HRMS, School) are pre-packaged and cryptographically signed.
2. **Platform Owner Provisions in Seconds**: Create the project, choose the business architecture model, select which packages they get, and issue an API key.
3. **Clients Consume Instantly**: Using their API key, clients can either use the REST API directly or initialize their application with a single line of code (`createOrbitoX`).
4. **Dynamic Bounds Control**: The administrator controls their plan tier, monthly API call quota, sliding rate limit (req/min), and storage bounds using live sliders in the Admin Console. The edge gateway enforces these limits immediately.

---

## 🏗️ Business Architecture Models

| Model | Target Industry | Example | Subscribed Package Stack |
| :--- | :--- | :--- | :--- |
| **`O2O2B2B2C`** | Food & Grocery Delivery Networks | OmniDeliver, FoodHub Express | Restaurant OS + POS + Commerce + CRM + Finance + Inventory |
| **`HEALTHCARE_NETWORK`** | Multi-Hospital & Clinic Groups | St. Jude, MedNet Health | HMS + Inventory + CRM + HRMS + Finance |
| **`D2C`** | Luxury Brands & Omnichannel Stores | Aura Luxury Boutiques | Commerce + Inventory + POS + CRM |
| **`B2B_SaaS`** | Enterprise Software & Portals | Cyberdyne Technologies | CRM + Finance + HRMS |
| **`B2B2C`** | Multi-Campus Academies & LMS | CampusCloud Global | School OS + Finance + HRMS + CRM |
| **`FRANCHISE_RETAIL`** | Multi-Store Supermarket Chains | Metro Retail Mart | POS + Inventory + Finance + Commerce |

---

## 📦 The 9 Pre-Built Plug-and-Play Packages

No backend code needs to be written from scratch. Each package provides a complete service domain:

1. **`@orbitox/restaurant` (Restaurant & Kitchen OS)**: Kitchen Display System (KDS), station line routing, table floor matrices, QR orders.
2. **`@orbitox/pos` (Omnichannel POS)**: Multi-lane cash drawers, offline sync queue, thermal receipts, barcode checkouts.
3. **`@orbitox/commerce` (Commerce Engine)**: Product catalogs, variants, cart calculations, zero-trust checkout.
4. **`@orbitox/crm` (CRM & Sales Pipeline)**: Algorithmic lead scoring (0-100), deal state machines, contacts directory.
5. **`@orbitox/finance` (Finance & Ledgers)**: Multi-merchant revenue splits, general tax ledgers, invoice generation.
6. **`@orbitox/inventory` (Inventory & Stock Logistics)**: Multi-warehouse SKU balances, batch expirations, stock transfers.
7. **`@orbitox/hms` (Hospital OS)**: Emergency triage (Level 1-5), ICU bed reservations, patient EHR, biometric telemetry.
8. **`@orbitox/hrms` (HRMS & Workforce)**: Employee records, departmental hierarchy, shift rosters, payroll.
9. **`@orbitox/school` (School & Campus OS)**: Student registers, academic grading, tuition fee billing.

---

## 🚀 1-Line Client Integration

When a client receives their API key, they can bootstrap their application in **one line**:

```typescript
import { createOrbitoX } from '@orbitox-io/plugin-engine';
import restaurant from '@orbitox-io/restaurant';
import pos from '@orbitox-io/pos';
import commerce from '@orbitox-io/commerce';
import crm from '@orbitox-io/crm';

const app = await createOrbitoX({
  license: 'orb_live_omni_7f9c2d1b4e8a', // Their generated API key
  domain: 'api.omnideliver.global',     // Their custom domain
  plugins: [restaurant, pos, commerce, crm],
});

// All domain services are immediately available:
console.log('App ready. Subscribed engines:', Object.keys(app.plugins));
```

---

## 🔑 How to Provision a Client & Issue API Keys

1. Open **Client Projects** (`http://localhost:3005/admin/projects`).
2. Click **+ Provision Client Project**.
3. **Step 1 (Identity)**: Enter Project Name, Organization, Architecture Model (`O2O2B2B2C`, `Healthcare`, etc.), and Custom Domain.
4. **Step 2 (Plan & Quotas)**: Select Plan Tier or use sliders to set API Call Limit, Rate Limit, and Storage.
5. **Step 3 (Package Selection)**: Toggle which of the 9 packages this project can access.
6. **Step 4 (Key & Code)**: Click **Provision Project & Generate Key**. Copy the generated API key (`orb_live_...`) and the 1-line integration snippet to send to the client.

---

## 🎛️ How to Set and Tune Plans, Quotas & Limits

Inside the **Project Cockpit** (`/admin/projects/[projectId]`):
- **Change Plan Tier**: Switch between Sandbox, Growth, Pro, Enterprise, and HyperScale O2O2B2B2C.
- **Monthly API Call Quota Slider**: Adjust from 100K calls to 100M calls.
- **Rate Limit Slider**: Set sliding-window burst limits from 100 to 15,000 requests per minute.
- **Storage Quota Slider**: Set encrypted storage from 10 GB to 10 TB.
- **Toggle Packages**: Turn any of the 9 packages on or off with 1 click.
- **Click "Save & Apply Gateway Limits"**: The edge API gateway updates immediately with zero downtime.

---

## 🛡️ Zero-Trust Gateway Enforcement

All requests to `/api/v1/*` pass through `withApiGuard`. The gateway enforces:

1. **Package Entitlement Check**:
   - If a project calls an engine they did NOT subscribe to (e.g. calling `/api/v1/hms/*` without HMS enabled), the gateway rejects with `HTTP 403 PLUGIN_NOT_ENTITLED`.
2. **Monthly Quota Check**:
   - When a project hits its monthly API call limit, requests are rejected with `HTTP 429 TENANT_QUOTA_EXCEEDED`.
3. **Suspension Check**:
   - If a project is suspended by the admin, all gateway traffic is blocked with `HTTP 403 PROJECT_SUSPENDED`.
4. **Sliding-Window Rate Limiting**:
   - Enforces the project's customized rate limit per minute.
5. **Anti-Tamper Latency Headers**:
   - Injects `x-orbitox-latency-ms`, `x-orbitox-anti-tamper: VERIFIED`, `x-orbitox-project-id`, `x-orbitox-plan`.

---

## 📡 Developer REST API Catalog

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/admin/projects` | List all client projects with filter by model & status |
| `POST` | `/api/v1/admin/projects` | Provision new client project & issue initial key |
| `GET` | `/api/v1/admin/projects/:id` | Get single project detail and associated keys |
| `PATCH` | `/api/v1/admin/projects/:id` | Update plan, quotas, rate limits, packages, or status |
| `DELETE`| `/api/v1/admin/projects/:id` | Deprovision project and revoke gateway keys |
| `GET` | `/api/v1/commerce/products` | Query commerce catalog items |
| `POST` | `/api/v1/commerce/checkout/initiate` | Initiate zero-trust payment checkout flow |
| `GET` | `/api/v1/hms/patients` | Fetch patient records (requires HMS package) |
| `POST` | `/api/v1/hms/triage/advance` | Advance emergency triage state machine |
| `GET` | `/api/v1/restaurant/orders` | Active kitchen display orders |
| `GET` | `/api/v1/crm/leads` | CRM sales pipeline leads |
| `GET` | `/api/v1/openapi.json` | OpenAPI 3.1 specification for all endpoints |

---

## 💻 Multi-Language Code Examples

### cURL:
```bash
curl -X GET "http://localhost:3005/api/v1/commerce/products" \
  -H "x-api-key: orb_live_omni_7f9c2d1b4e8a" \
  -H "x-tenant-id: omnideliver"
```

### Node.js / TypeScript:
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3005/api/v1',
  headers: {
    'x-api-key': 'orb_live_omni_7f9c2d1b4e8a',
    'x-tenant-id': 'omnideliver',
  },
});

async function run() {
  const { data } = await api.get('/commerce/products');
  console.log('Products:', data);
}
run();
```

### Python:
```python
import requests

r = requests.get(
    "http://localhost:3005/api/v1/commerce/products",
    headers={
        "x-api-key": "orb_live_omni_7f9c2d1b4e8a",
        "x-tenant-id": "omnideliver"
    }
)
print(r.json())
```
