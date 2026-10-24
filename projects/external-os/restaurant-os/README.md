# 🪐 RestaurantOS — Production Hospitality Runtime Engine

RestaurantOS is an enterprise-grade, high-throughput hospitality runtime engine designed for restaurant dining flows, digital ordering, spatial floor management, kitchen display routing (KDS), and financial settlement.

Powered by the **OrbitoX Control Plane**, RestaurantOS runs either as an independent, sovereign edge runtime or containerized alongside a multi-tenant PostgreSQL database.

---

## 🏗️ Architecture & Core Capabilities

### 1. Multi-Tenant PostgreSQL Data Plane
- **20 Domain Models**: Full relational modeling covering Tenants, Branches, Floors, Tables, Categories, Menu Items, Overrides, Orders, Kitchen Tasks, Service Requests, Dining Sessions, Guests, Staff Directory, Token Revocations, Brand Configs, Support Tickets, Domain Events, Idempotency Records, Invoices, and Razorpay Payment Sessions.
- **Strict Tenant Partitioning**: Every domain model is partitioned by `tenantId` with compound uniqueness constraints (e.g. `@@unique([tenantId, tableNumber])`, `@@unique([tenantId, invoiceNumber])`, `@@unique([tenantId, orderId])`).
- **AsyncLocalStorage Context**: Tenant isolation is dynamically resolved from request headers (`x-tenant-id`), custom subdomains, or query parameters, guaranteeing zero cross-tenant data leakage.

### 2. Control Plane Registration & Fleet Telemetry
- **Authoritative Control Bridge**: Powered by `@orbitox/external-runtime-sdk` `ControlClient`.
- **Automatic Heartbeats**: Emits 10-second heartbeats with memory usage, active table occupancy, and version telemetry.
- **Remote Control Commands**: Responds to control plane directives (`run_health_check`, `refresh_cache`, `rotate_qr_locator`, `restart_runtime`).
- **Live Entitlement Quota Reporting**: Automatically reports processed orders and transaction volume Minor units to OrbitoX for tier metering.

### 3. Razorpay Payment Gateway & Level 4 Refund Governance
- **Server-Recomputed Quotes**: Order totals are recalculated server-side from catalog unit prices and modifiers. Client-provided amounts are never trusted.
- **Webhook HMAC-SHA256 Verification**: Verifies `x-razorpay-signature` over the raw payload buffer using constant-time comparison.
- **Idempotent Transitions**: Orders transition safely: `UNPAID` → `AUTHORIZED` → `CAPTURED`. Duplicate webhook deliveries return `{ status: 'idempotent_duplicate' }` without double-crediting.
- **Level 4 Refund Governance**: Autonomous runtime refunds are strictly prohibited. Refunds require authenticated Manager/Admin PIN verification or direct control plane intervention.

### 4. Statutory Indian GST Invoicing (SAC 996331)
- **SAC Code 996331**: Standard Services Code for restaurant, catering, and eating establishments.
- **Sequential Fiscal Year Numbering**: Formatted as `INV-YYYYYY-XXXXXX` (e.g. `INV-202627-000001`), partitioned per tenant and financial year (April 1 – March 31) with guaranteed zero gap tolerance.
- **5% GST Integer Paise Arithmetic**: Exactly divided into 2.5% CGST and 2.5% SGST.

---

## 🚀 Quick Start & Operations Guide

### Prerequisites
- Node.js 22 LTS
- pnpm 9.x
- PostgreSQL 16+ (or Docker)

### 1. Environment Setup
```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials and secrets
```

### 2. Database Migration & Reseeding
Run Prisma migrations and import pilot restaurant historical data:
```bash
# Push Prisma schema to PostgreSQL
pnpm exec prisma db push

# Run one-shot data migration script from legacy JSON store
pnpm exec tsx scripts/migrate-json-to-postgres.ts
```

### 3. Verification Test Suites
Run the automated multi-tenant isolation and payment verification suites:
```bash
# Verify tenant isolation (10 / 10 checks)
pnpm exec tsx scripts/test-tenant-isolation.ts

# Verify Razorpay, Webhooks, GST Invoicing, and HTTP API (19 / 19 checks)
pnpm exec tsx scripts/test-phase2-payments-invoicing.ts
```

### 4. Start the Server
```bash
# Development mode
pnpm dev

# Production mode
pnpm start
```
The server will bind to `http://localhost:4010`.

---

## 🐳 Docker & Docker Compose Deployment

To deploy RestaurantOS and PostgreSQL together:

```bash
# Build and start services
docker compose up -d

# View logs
docker compose logs -f restaurant-os

# Check PostgreSQL health
docker compose ps
```

To build the standalone Docker image from the monorepo root:
```bash
docker build -f projects/external-os/restaurant-os/Dockerfile -t restaurant-os .
```

---

## 📡 API Reference & Integration Endpoints

| Endpoint | Method | Description | Auth Scope |
| :--- | :--- | :--- | :--- |
| `/health` | `GET` | Health check probe | Public |
| `/api/restaurant/quote` | `POST` | Deterministic pricing quote | Diner / Staff |
| `/api/restaurant/orders` | `POST` | Idempotent order placement | Diner / Staff |
| `/api/restaurant/orders` | `GET` | List orders (filtered by table/session) | Diner / Staff |
| `/api/restaurant/payments/create-order` | `POST` | Recompute quote & create Razorpay session | Diner / Staff |
| `/api/restaurant/payments/webhook` | `POST` | Razorpay webhook (HMAC-SHA256 verified) | Razorpay Gateway |
| `/api/restaurant/invoices/:orderId` | `GET` | Retrieve statutory Indian GST invoice | Diner / Staff |
| `/api/restaurant/invoices` | `GET` | Query invoices by number or date | Staff / Admin |
| `/api/restaurant/invoices/generate` | `POST` | Manually generate GST invoice | Staff / Admin |
| `/api/restaurant/payments/refund` | `POST` | Level 4 Refund Request (Manager PIN) | Manager / Admin |

---

## 📋 Pilot Launch Readiness Checklist

- [x] **Relational Schema**: 20 Prisma models deployed to PostgreSQL with compound tenant indexes.
- [x] **Tenant Data Isolation**: 100% verified via automated suite (Zero cross-tenant leakage).
- [x] **Control Plane Connectivity**: Authoritative `RestaurantControlBridge` active with 10s heartbeats.
- [x] **Razorpay Adapter**: Production adapter implemented with HMAC signature verification & idempotent deduplication.
- [x] **Statutory Invoicing**: Indian GST SAC `996331` sequential numbering implemented and verified.
- [x] **Refund Governance**: Level 4 Manager PIN requirement enforced.
- [x] **Packaging**: Multi-stage `Dockerfile` and `docker-compose.yml` validated.
- [ ] **Operator Action**: Set live Razorpay keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) in `.env`.
- [ ] **Operator Action**: Configure webhook URL `https://<domain>/api/restaurant/payments/webhook` with `RAZORPAY_WEBHOOK_SECRET` in Razorpay Dashboard.
- [ ] **Operator Action**: Confirm restaurant legal entity GSTIN matches `RESTAURANT_GSTIN`.
- [ ] **Operator Action**: Configure local ESC/POS network thermal printer IP in integration settings.
- [ ] **Operator Action**: Provision manager and floor staff PIN credentials via staff portal.
