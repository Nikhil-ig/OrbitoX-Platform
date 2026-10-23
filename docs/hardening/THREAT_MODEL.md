# OrbitoX Platform Threat Model

**Document Version:** 1.0.0 (Phase 0 Baseline)  
**System Scope:** OrbitoX Monorepo (`orbitox/apps/web`, `packages/*`, `plugins/*`, and `projects/external-os/restaurant-os`)

---

## 1. High-Value Assets

1. **Platform Root & Tenant API Credentials:** Cryptographic API keys (`orb_live_*`, HMAC keys) controlling access to the multi-tenant control plane, administrative commands, and data stores.
2. **Multi-Tenant State & Customer Data:** CRM contacts, financial ledgers, inventory, POS orders, dining tables, guest profiles, payment receipts, and kitchen display streams across distinct enterprise tenants.
3. **Credentials Vault:** Encrypted 3rd-party integration secrets (Stripe, Razorpay, AWS S3, OAuth access tokens, webhook signing secrets) stored within the platform.
4. **Staff & Runtime Signing Tokens:** Ed25519/HMAC tokens verifying staff roles (waiters, kitchen dispatchers, managers) and mutual control-plane runtime heartbeats.
5. **Control-Plane Configuration State:** Project definitions, dynamic templates, blueprints, and active execution manifests.

---

## 2. Entry Points & Attack Surfaces

- **Platform REST API (`orbitox/apps/web/app/api/v1/**`):** 125 endpoints exposing platform commands, project creation, credential management, audit logging, and resource mutations.
- **External Runtime APIs (`restaurant-os` on `:4010`):** Dine-in ordering, KDS dispatch, settlement, table locators, staff login, and station control bridges.
- **Real-Time Streaming Channels:** Server-Sent Events (SSE) for live KDS order tracking, telemetry, and platform event broadcasts.
- **Dynamic Ingestion & Crawlers:** `UrlCrawlerAdapter` and Webhook dispatcher accepting external network URLs for parsing and callback invocation.
- **Tenant Expression Engines:** Section logic and flow execution engines in commerce plugins evaluating business rules from configurations.

---

## 3. Trust Boundaries

```
[ Public Internet / Untrusted Clients ]
          │
  ════════╪══════════════════════════════════════ [ Boundary 1: Perimeter Auth & Rate Limiting ]
          ▼
[ OrbitoX Web / Restaurant-OS Ingress ]
          │
  ════════╪══════════════════════════════════════ [ Boundary 2: Tenant Isolation & Scope Enforcement ]
          ▼
[ Multi-Tenant Core Services (Tenant A vs Tenant B) ]
          │
  ════════╪══════════════════════════════════════ [ Boundary 3: Control Plane vs External Runtime SDK ]
          ▼
[ Database / Vault / Secrets / Execution Engine ]
```

1. **Perimeter Boundary:** Public Internet to Ingress Services. Requires strict authentication, rate limiting, and zero implicit trust.
2. **Tenant Isolation Boundary:** Tenant A cannot read, tamper with, or observe Tenant B resources under any circumstance.
3. **Control Plane to Node Runtime:** Communications between central platform orchestration and edge runtime instances must be mutually authenticated with non-replayable, cryptographically signed tokens.
4. **Sandboxed Code Execution:** User-defined or tenant-authored business expressions must be evaluated strictly inside an AST-evaluated sandbox without prototype, global, or process access.

---

## 4. Threat Matrix & Mapping to Verified Findings (F1–F14)

| Finding | Severity | Category | Asset at Risk | Boundary Breached |
|---|---|---|---|---|
| **F1** | CRITICAL | Broken Auth / Default-Allow | All tenant data & platform APIs | Perimeter (Boundary 1) |
| **F2** | CRITICAL | Missing Route Guards | 75 unprotected endpoints | Perimeter (Boundary 1) |
| **F3** | CRITICAL | Arbitrary State / Snapshot Injection | Root API keys & projects | Perimeter & Core (Boundaries 1 & 3) |
| **F4** | CRITICAL | Key Prefix Authentication Bypass | Root API key privileges | Perimeter (Boundary 1) |
| **F5** | HIGH | Hardcoded Keys & Query Auth | Tenant isolation & credentials | Perimeter & Tenant (Boundaries 1 & 2) |
| **F6** | HIGH | Hardcoded Control-Plane HMAC | Runtime config & command dispatch | Control Plane (Boundary 3) |
| **F7** | HIGH | Insecure Fallback Secrets | JWTs, POS QRs, S3 vault storage | Core & Storage (Boundaries 1 & 3) |
| **F8** | HIGH | Committed Secrets & Git Leaks | Staff signing keys, token revocations | System-wide |
| **F9** | HIGH | Remote Code Execution (`new Function`) | Host OS environment & process | Sandboxed Execution (Boundary 4) |
| **F10** | HIGH | Server-Side Request Forgery (SSRF) | Cloud metadata & internal network | Internal Perimeter |
| **F11** | MEDIUM | Information Disclosure (Public GETs) | Credentials, audit log, blueprints | Perimeter (Boundary 1) |
| **F12** | MEDIUM | Insecure Randomness (`Math.random`) | Session IDs, approvals, changesets | Tenant & Identity (Boundary 2) |
| **F13** | MEDIUM | Restaurant-OS Misconfigurations | Table orders, PINs, test resets | Perimeter & POS Runtime (Boundary 1) |
| **F14** | LOW | Unverified Claims & Bloat Artifacts | Codebase integrity & verification | Supply Chain / Maintenance |
