---
name: orbitox-expert
description: >-
  Definitive master engineering and architectural guide for OrbitoX Platform,
  @orbitox-io/plugin-engine (v1.4.0), and @orbitox-io/crm (v1.0.1). Use whenever
  building, configuring, extending, testing, or troubleshooting multi-tenant SaaS applications,
  custom domains, cryptographic security, license enforcements, lead state machines, and plugins.
---

# 🪐 OrbitoX Platform Master Engineering & API Reference Manual

> **The Single Source of Truth for Humans and AI Agents developing with the OrbitoX SaaS Operating System.**

---

## 📑 Master Table of Contents
1. [🌟 Identity & Architectural Scope](#1--identity--architectural-scope)
2. [📦 Package Ecosystem & Installation](#2--package-ecosystem--installation)
3. [⚡ Quick Start Guide (3 Progressive Patterns)](#3--quick-start-guide-3-progressive-patterns)
4. [🚀 1-Line Client Bootstrapper (`createOrbitoX`)](#4--1-line-client-bootstrapper-createorbitox)
5. [🌐 Smart Multi-Tenancy Engine (`createMultiTenantEngine`)](#5--smart-multi-tenancy-engine-createmultitenantengine)
6. [⚡ 1-Line Express / Connect HTTP Middleware](#6--1-line-express--connect-http-middleware)
7. [🔒 Feature & Tier Guards (`requireFeature`, `requireTier`)](#7--feature--tier-guards-requirefeature-requiretier)
8. [🛡️ Zero-Boilerplate Context Propagation (`getActiveTenant`)](#8-️-zero-boilerplate-context-propagation-asynclocalstorage)
9. [🔐 Cryptographic Signer & Hasher (`CryptoSigner`)](#9--cryptographic-signer--hasher-cryptosigner)
10. [🔍 Anti-Tamper & Integrity Verifier (`IntegrityVerifier`)](#10--anti-tamper--integrity-verifier-integrityverifier)
11. [📜 Enterprise License & Domain Enforcer (`LicenseEnforcer`)](#11--enterprise-license--domain-enforcer-licenseenforcer)
12. [🛡️ Sandbox Guard & Facade Freezing (`SandboxGuard`)](#12-️-sandbox-guard--facade-freezing-sandboxguard)
13. [📊 Entity Metadata & Dynamic Fields Engine](#13--entity-metadata--dynamic-fields-engine)
14. [💼 CRM Domain Core & State Machine (`@orbitox-io/crm`)](#14--crm-domain-core--state-machine-orbitox-iocrm)
15. [🛠️ Platform CLI Complete Reference (`@orbitox/cli`)](#15-️-platform-cli-complete-reference-orbitoxcli)
16. [🚨 Production Checklist & Error Handling Catalog](#16--production-checklist--error-handling-catalog)
17. [🪐 Client Projects & O2O2B2B2C Ecosystem Engine](#17--client-projects--o2o2b2b2c-ecosystem-engine)

---

## 1. 🌟 Identity & Architectural Scope

The **OrbitoX Platform** is an enterprise-grade, zero-trust, multi-tenant SaaS operating system. It provides closed-core cryptographic security, dynamic custom domain routing, sub-millisecond in-memory RAM caching, headless business domain plugins, and strict permission matrices.

### Core Modules:
- **`@orbitox-io/plugin-engine`**: Kernel runtime, `createOrbitoX`, `MultiTenantEngine`, `CryptoSigner`, `IntegrityVerifier`, `LicenseEnforcer`, `SandboxGuard`, `MetadataEngine`.
- **`@orbitox-io/crm`**: Headless CRM sales engine, lead scoring, `LeadStateMachine`, and React hooks (`useLeads`, `useLeadActions`).
- **`@orbitox/cli`**: Developer tooling for scaffolding, key generation, packaging, cryptographic signing, and verification.

---

## 2. 📦 Package Ecosystem & Installation

All OrbitoX packages are published under the GitHub Organization scope **`@orbitox-io`** on GitHub Packages (`https://npm.pkg.github.com`).

### 1-Command Automated Setup:
```bash
npx @orbitox/cli setup --token=ghp_yourPersonalAccessTokenHere
```

### Manual `.npmrc` Configuration:
```ini
# .npmrc in project root
@orbitox-io:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
always-auth=true
```

### Installation via NPM / PNPM / Yarn:
```bash
npm install @orbitox-io/plugin-engine @orbitox-io/crm
# or
pnpm add @orbitox-io/plugin-engine @orbitox-io/crm
```

---

## 3. ⚡ Quick Start Guide (3 Progressive Patterns)

### Pattern 1: Standalone Client (Single-Tenant)
```javascript
const { createOrbitoX } = require('@orbitox-io/plugin-engine');
const crm = require('@orbitox-io/crm');

async function main() {
  const app = await createOrbitoX({
    plugins: [crm],
  });

  const lead = app.crm.createLead({
    name: 'Dr. Sarah Connor',
    email: 'sarah@cyberdyne.io',
    company: 'Cyberdyne Healthcare',
    estimatedValue: 4500000,
  });

  console.log('Created Lead:', lead);
}
main();
```

### Pattern 2: Multi-Tenant Programmatic Execution
```javascript
const { createMultiTenantEngine } = require('@orbitox-io/plugin-engine');
const crm = require('@orbitox-io/crm');

const engine = createMultiTenantEngine({
  wildcardRootDomain: 'orbito.com',
  domains: {
    'portal.apollohospitals.com': {
      tenantId: 'tenant_apollo_01',
      name: 'Apollo Hospital Network',
      tier: 'enterprise',
      features: ['ai_diagnostics', 'telehealth'],
    },
  },
  plugins: [crm],
});

// Run within isolated tenant context
await engine.runWithTenant('portal.apollohospitals.com', async (session) => {
  console.log(`Tenant: ${session.tenant.name} (${session.tenant.tenantId})`);
  
  const safeData = session.scopeData({
    name: 'Dr. Ramesh Sharma',
    email: 'sharma@apollo.com',
  });

  const lead = session.app.crm.createLead(safeData);
  console.log(`Lead created for ${session.tenant.name}:`, lead.id);
});
```

### Pattern 3: Production Multi-Tenant Express Server with Custom Domains
```javascript
const express = require('express');
const { createMultiTenantEngine } = require('@orbitox-io/plugin-engine');
const crm = require('@orbitox-io/crm');

const app = express();
app.use(express.json());

const engine = createMultiTenantEngine({
  cacheTtlMs: 5 * 60 * 1000, // 5m in-memory RAM cache
  wildcardRootDomain: 'orbito.com',
  domains: {
    'portal.apollohospitals.com': {
      tenantId: 'tenant_apollo_01',
      name: 'Apollo Hospital Network',
      tier: 'enterprise',
      features: ['ai_diagnostics'],
    },
  },
  plugins: [crm],
});

// 1-Line Middleware: Populates req.tenant, req.app, req.tenantSession
app.use(engine.middleware());

// Auto-scoped route
app.post('/api/leads', (req, res) => {
  const safeData = req.tenantSession.scopeData(req.body);
  const lead = req.app.crm.createLead(safeData);
  res.json({ tenant: req.tenant.name, lead });
});

// Enterprise-protected route
app.post('/api/ai-diagnostics',
  engine.requireTier('enterprise'),
  engine.requireFeature('ai_diagnostics'),
  (req, res) => {
    res.json({ status: 'AI Diagnostics Active for ' + req.tenant.name });
  }
);

app.listen(3000, () => console.log('Server running on port 3000'));
```

---

## 4. 🚀 1-Line Client Bootstrapper (`createOrbitoX`)

### Interface Definitions:
```typescript
export interface CreateOrbitoXOptions {
  /** RSA/Ed25519-Signed base64 license token */
  license?: string;
  /** Public key PEM used to cryptographically verify license tokens & plugin signatures */
  publicKey?: string;
  /** Current deployment domain or hostname to enforce against license domain lock */
  domain?: string;
  /** Current active tenants count to enforce against license quotas */
  activeTenantsCount?: number;
  /** List of plugins to automatically verify, sandbox, and register into the app */
  plugins?: OrbitoXPluginDefinition[];
  /** Strict security mode: throws errors on missing license or unsigned plugins */
  strictSecurity?: boolean;
  /** Custom context identifier (e.g., 'tenant_123' or 'org_hq') */
  contextId?: string;
}

export interface SecurityContext {
  isVerified: boolean;
  license?: LicensePayload;
  allowedFeatures: string[];
  tenantId?: string;
}
```

### `OrbitoXApp` Class API:
```typescript
class OrbitoXApp {
  public readonly security: SecurityContext; // Deeply frozen
  public readonly plugins: Map<string, any>;
  [key: string]: any; // Dynamic plugin properties (e.g. app.crm, app.hms)

  registerPlugin(plugin: OrbitoXPluginDefinition, signature?: PackageSignature | string, publicKeyPem?: string): this;
  hasFeature(featureName: string): boolean;
}
```

### Plugin Auto-Detection Logic:
When `app.registerPlugin(plugin)` is called, it identifies the plugin by inspecting properties in order:
1. Explicit `plugin.id` or `plugin.name` or `plugin.manifest.id`.
2. Inspects service exports:
   - Contains `HeadlessCrmService` / `crmLeadStateMachine` / `useLeads` ➔ Mounted to `app.crm`.
   - Contains `HeadlessHmsService` / `hmsTriageStateMachine` ➔ Mounted to `app.hms`.
   - Contains `HeadlessCommerceService` / `useCommerceCart` ➔ Mounted to `app.commerce`.
   - Fallback: `app.custom_plugin`.

---

## 5. 🌐 Smart Multi-Tenancy Engine (`createMultiTenantEngine`)

### Interface Definitions:
```typescript
export type DomainStatus = 'ACTIVE' | 'PENDING_DNS' | 'SUSPENDED' | 'EXPIRED';
export type TenantTier = 'starter' | 'growth' | 'pro' | 'enterprise';

export interface TenantConfig {
  tenantId: string;
  name?: string;
  domain?: string;
  subdomain?: string;
  tier?: TenantTier;
  status?: DomainStatus;
  license?: string;
  features?: string[];
  metadata?: Record<string, any>;
  customPlugins?: OrbitoXPluginDefinition[];
}

export interface MultiTenantEngineOptions {
  domains?: Record<string, TenantConfig>;
  wildcardRootDomain?: string;
  resolveTenant?: (host: string) => Promise<TenantConfig | null | undefined> | TenantConfig | null | undefined;
  plugins?: OrbitoXPluginDefinition[];
  publicKey?: string;
  strictSecurity?: boolean;
  cacheTtlMs?: number; // Default: 300,000 ms (5 mins)
  defaultTenant?: TenantConfig;
}

export interface ActiveTenantSession {
  tenant: TenantConfig;
  app: OrbitoXApp;
  domain: string;
  hasFeature: (featureName: string) => boolean;
  isTier: (targetTier: TenantTier) => boolean;
  scopeData: <T extends Record<string, any>>(data: T) => T & { tenantId: string };
}
```

### 5-Step Domain Resolution Cascade:
When resolving an incoming host (e.g. `portal.apollohospitals.com`), `engine.resolve(host)` executes:
1. **In-Memory RAM TTL Cache Check**: If cached and not expired, returns in **`~6 µs`**.
2. **Static Mapping Check**: Checks `options.domains[host]`.
3. **Wildcard Root Domain Check**: If `wildcardRootDomain: 'orbito.com'`, extracts subdomain from `*.orbito.com` and creates config.
4. **Dynamic Async Resolver**: Calls `options.resolveTenant(host)` (e.g. Prisma DB / Redis lookup).
5. **Default Fallback**: Uses `options.defaultTenant` if configured.
6. Stores resolved config in RAM cache for `cacheTtlMs` (default: 5 minutes).

### Cache Invalidation:
```typescript
// Invalidate a specific domain immediately:
engine.invalidateCache('portal.apollohospitals.com');

// Invalidate all cached domains:
engine.invalidateCache();
```

---

## 6. ⚡ 1-Line Express / Connect HTTP Middleware

```typescript
app.use(engine.middleware());
```

### What `engine.middleware()` does:
1. Extracts incoming host from `req.headers['x-forwarded-host'] || req.headers.host || 'localhost'`.
2. Resolves tenant via `engine.resolve(host)`.
3. If unmapped ➔ Returns HTTP `404 { error: 'Custom domain not recognized or inactive.', domain: host }`.
4. If `status === 'SUSPENDED'` ➔ Returns HTTP `403 { error: 'Tenant Account Suspended', message: '...' }`.
5. Retrieves or boots the isolated `OrbitoXApp` for that tenant.
6. Populates:
   - `req.tenant`: The resolved `TenantConfig`.
   - `req.app`: The isolated `OrbitoXApp` instance.
   - `req.tenantSession`: The `ActiveTenantSession`.
7. Wraps downstream execution in `AsyncLocalStorage`.

---

## 7. 🔒 Feature & Tier Guards (`requireFeature`, `requireTier`)

### Tier Ranking System:
- `starter`: Level 1
- `growth`: Level 2
- `pro`: Level 3
- `enterprise`: Level 4

### Feature Guard:
```typescript
app.post('/api/ai-diagnostics',
  engine.requireFeature('ai_diagnostics'),
  (req, res) => { ... }
);
// On failure: HTTP 403 { error: 'Feature Not Entitled', message: 'The feature "ai_diagnostics" is not enabled for your current tenant tier.', feature: 'ai_diagnostics' }
```

### Tier Guard:
```typescript
app.post('/api/surgery-scheduler',
  engine.requireTier('pro'),
  (req, res) => { ... }
);
// On failure: HTTP 403 { error: 'Tier Upgrade Required', message: 'This endpoint requires the "pro" tier or higher. Current tier: "starter".', requiredTier: 'pro' }
```

---

## 8. 🛡️ Zero-Boilerplate Context Propagation (`getActiveTenant`)

OrbitoX uses Node.js `AsyncLocalStorage` to eliminate parameter drilling of `req` or `tenantId`:

```typescript
import { getActiveTenant } from '@orbitox-io/plugin-engine';

export async function processPrescription(patientId: string, medication: string) {
  const session = getActiveTenant();
  if (!session) {
    throw new Error('SECURITY CRITICAL: Attempted database mutation outside of an active tenant context!');
  }

  console.log(`Prescribing for ${patientId} in Tenant ${session.tenant.name} (${session.tenant.tenantId})`);
}
```

---

## 9. 🔐 Cryptographic Signer & Hasher (`CryptoSigner`)

### API Reference:
```typescript
import { CryptoSigner, KeyPairResult, PackageSignature } from '@orbitox-io/plugin-engine';

// 1. Generate Ed25519 or RSA-2048 keypair
const { publicKey, privateKey }: KeyPairResult = CryptoSigner.generateSigningKeyPair('ed25519');

// 2. Sign any payload object or string
const signatureHex: string = CryptoSigner.signPayload({ module: 'hms', version: '2.0.0' }, privateKey);

// 3. Compute file SHA-256
const sha256: string = CryptoSigner.calculateFileHash('./dist/index.js');

// 4. Cryptographically sign an entire package directory with inventory hashing
const packageSignature: PackageSignature = CryptoSigner.signPackageDirectory('./plugins/crm', privateKey, 'release-mesh');
```

---

## 10. 🔍 Anti-Tamper & Integrity Verifier (`IntegrityVerifier`)

### API Reference:
```typescript
import { IntegrityVerifier, IntegrityCheckResult } from '@orbitox-io/plugin-engine';

// 1. Verify digital signature against payload
const isValid: boolean = IntegrityVerifier.verifyPayloadSignature(payload, signatureHex, publicKeyPem);

// 2. Verify complete package directory integrity against PackageSignature
const checkResult: IntegrityCheckResult = IntegrityVerifier.verifyPackageIntegrity(
  './node_modules/@orbitox-io/crm',
  signatureObject,
  publicKeyPem
);

if (!checkResult.valid) {
  console.error('Tampering detected:', checkResult.errors);
}
```

---

## 11. 📜 Enterprise License & Domain Enforcer (`LicenseEnforcer`)

### 5-Check Verification Chain:
1. **Digital Signature Verification**: Cryptographic RSA/Ed25519 verification against public key.
2. **Expiration Check**: Validates `expiresAt` against current time.
3. **Domain Lock Check**: Ensures `currentDomain` matches `allowedDomain` (supports exact match or `*.domain.com` subdomains).
4. **Tenant Quota Check**: Enforces `activeTenantsCount <= allowedTenants`.
5. **Feature Entitlement Check**: Validates `requiredFeature` is included in `features` (or `*`).

### Issuing & Verifying License Tokens:
```typescript
import { LicenseEnforcer, LicensePayload, LicenseValidationResult } from '@orbitox-io/plugin-engine';

// 1. Issue Token (Admin / Licensing Server)
const tokenBase64 = LicenseEnforcer.issueLicenseToken({
  licenseId: 'lic_apollo_100',
  issuedTo: 'Apollo Hospitals',
  allowedDomain: 'hospital.apollo.com',
  allowedTenants: 50,
  features: ['ai_diagnostics', 'telehealth'],
  issuedAt: new Date().toISOString(),
  expiresAt: '2028-12-31T23:59:59Z',
  tier: 'enterprise',
}, privateKeyPem);

// 2. Verify Token (Application Boot)
const result: LicenseValidationResult = LicenseEnforcer.verifyLicenseToken(
  tokenBase64,
  publicKeyPem,
  {
    currentDomain: 'hospital.apollo.com',
    activeTenantsCount: 30,
    requiredFeature: 'ai_diagnostics',
  }
);

if (!result.valid) {
  throw new Error(`License Rejected: ${result.errors.join(', ')}`);
}
```

---

## 12. 🛡️ Sandbox Guard & Facade Freezing (`SandboxGuard`)

```typescript
import { SandboxGuard } from '@orbitox-io/plugin-engine';

// 1. Deep freeze facade objects (prevents monkey patching in strict mode)
SandboxGuard.freezeAllFacades(runtime);

// 2. Create isolated Proxy blocking private fields (_*) and symbol keys
const sandboxedProxy = SandboxGuard.createSandboxedProxy(runtime, ['security', 'database']);
```

---

## 13. 📊 Entity Metadata & Dynamic Fields Engine

OrbitoX includes a dynamic metadata engine that allows defining fields declaratively, adding custom tenant-specific fields at runtime, and generating form/table schemas automatically:

```typescript
import { MetadataEngine, EntityMetadata, FieldMetadata } from '@orbitox-io/plugin-engine';

const engine = new MetadataEngine();

// 1. Register base entity
engine.registerEntity({
  id: 'patient',
  pluginId: 'hms',
  displayName: 'Patient Record',
  displayNamePlural: 'Patient Records',
  fields: [
    { key: 'mrn', label: 'Medical Record Number', type: 'text', required: true, unique: true },
    { key: 'name', label: 'Full Name', type: 'text', required: true, showInList: true },
    { key: 'dob', label: 'Date of Birth', type: 'date', required: true },
  ],
  permissions: { create: 'patient:create', read: 'patient:read', update: 'patient:update', delete: 'patient:delete' },
  ui: { defaultView: 'table' },
});

// 2. Add tenant-specific custom field at runtime:
engine.addCustomField('patient', 'tenant_apollo_01', {
  key: 'apolloVipTier',
  label: 'Apollo VIP Category',
  type: 'select',
  options: [{ value: 'GOLD', label: 'Gold VIP' }, { value: 'PLATINUM', label: 'Platinum VIP' }],
});

// 3. Generate Form Schema for UI
const formSchema = engine.getFormSchema('patient', 'tenant_apollo_01');
```

---

## 14. 💼 CRM Domain Core & State Machine (`@orbitox-io/crm`)

### Types:
```typescript
export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL_SENT' | 'WON' | 'LOST';

export interface Lead {
  id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  status: LeadStatus;
  estimatedValue: number;
  score: number;
  assignedTo?: string;
  customFields?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
```

### State Machine Transition Rules:
```
NEW           ──► CONTACTED, LOST
CONTACTED     ──► QUALIFIED, LOST
QUALIFIED     ──► PROPOSAL_SENT, LOST
PROPOSAL_SENT ──► WON, LOST
WON           ──► (Terminal)
LOST          ──► NEW (Reopen allowed)
```

### Lead Scoring Algorithm:
- Base: `10` points
- Valid Email (`@`): `+20` points
- Company Provided: `+30` points
- Estimated Value > $10,000: `+40` points
- **Total Possible Score: 100/100**

### Headless CRM Service:
```typescript
import { HeadlessCrmService, LeadStateMachine } from '@orbitox-io/crm';

const crm = new HeadlessCrmService();

// Create Lead
const lead = crm.createLead({
  name: 'Acme Corp Lead',
  email: 'lead@acme.com',
  company: 'Acme Corp',
  estimatedValue: 50000,
});

// Update Status with State Machine Validation
crm.updateLeadStatus(lead.id, 'CONTACTED');
crm.updateLeadStatus(lead.id, 'QUALIFIED');

// Generate AI Deal Summary
const summary = crm.generateAiSummary(lead.id);
```

### React Hooks (for Frontend Apps):
```tsx
import { useLeads, useLeadActions } from '@orbitox-io/crm/react';

export function LeadPipelineComponent() {
  const { leads, refreshLeads } = useLeads({ status: 'QUALIFIED' });
  const { createLead, updateLeadStatus, canTransitionStatus } = useLeadActions();

  return (
    <div>
      {leads.map((l) => (
        <div key={l.id}>
          <h4>{l.name} (${l.estimatedValue})</h4>
          <button
            disabled={!canTransitionStatus(l.status, 'PROPOSAL_SENT')}
            onClick={() => {
              updateLeadStatus(l.id, 'PROPOSAL_SENT');
              refreshLeads();
            }}
          >
            Send Proposal
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## 15. 🛠️ Platform CLI Complete Reference (`@orbitox/cli`)

| Command | Arguments / Flags | Description |
| :--- | :--- | :--- |
| `setup` | `--token=<ghp_token>` | Configures `.npmrc` with GitHub Packages token & generates initial signing keypair. |
| `add` | `<plugin>` (e.g. `crm`) | Installs `@orbitox-io/<plugin>` via npm and generates integration code snippet. |
| `keygen` | `--type=<ed25519\|rsa>` | Generates Ed25519 or RSA-2048 keypair in `keys/public.pem` and `keys/private.pem`. |
| `package` | `<plugin> --key=<key_path>` | Strips source maps, computes SHA-256 file inventory, and cryptographically signs bundle. |
| `verify` | `<plugin> --publicKey=<key>`| Verifies manifest SHA-256 and directory signature against public key. |
| `license issue` | `--to=<name> --domain=<host> --key=<key>` | Issues an RSA-signed license token string with domain lock & quotas. |
| `license inspect` | `--token=<base64>` | Decodes and prints the payload of a signed license token. |
| `new` | `<name>` | Scaffolds a new dual-architecture (Headless + React) plugin. |
| `create` | `<app-name>` | Scaffolds a complete standalone multi-tenant SaaS starter app. |
| `doctor` | None | Runs environment diagnostics (Node version, keys, registry auth). |
| `status` | None | Displays platform kernel version, registered plugins, and workspace health. |
| `list` | None | Lists all installed plugins with metadata and status. |

---

## 16. 🚨 Production Checklist & Error Handling Catalog

### Security Rules:
1. **Always Scope Data**: Always wrap user mutations with `session.scopeData(payload)` to ensure `tenantId` is stamped.
2. **Never Commit Keys**: Keep `keys/private.pem` and `.npmrc` auth tokens in CI/CD secrets or environment variables.
3. **Handle Suspended Accounts**: Use `engine.middleware()`, which automatically returns HTTP `403` for suspended accounts.
4. **Use In-Memory TTL Cache**: Do not query PostgreSQL on every request for custom domains; leverage `MultiTenantEngine`'s built-in RAM cache.

### Common Errors & Fixes:
| Error Message | Cause | Solution |
| :--- | :--- | :--- |
| `Unauthorized or unmapped custom domain: "xyz"` | Host not in `domains` and `resolveTenant` returned `null` | Add domain to `domains` dictionary or register in database. |
| `The feature "X" is not enabled for your current tenant tier.` | Tenant lacks entitlement for endpoint guarded by `requireFeature` | Upgrade tenant tier or add feature to `tenant.features`. |
| `Invalid CRM Lead State Transition: Cannot move lead from X to Y` | Illegal state transition attempted (e.g. `NEW` ➔ `WON` directly) | Follow valid lifecycle sequence: `NEW` ➔ `CONTACTED` ➔ `QUALIFIED` ➔ `PROPOSAL_SENT` ➔ `WON`. |
| `License cryptographic signature is invalid or forged` | License token was tampered with or verified with wrong public key | Re-issue license token using matching private key. |
| `Domain lock violation: License is only valid for "X"` | License domain does not match host domain | Deploy on designated domain or issue wildcard license (`allowedDomain: '*'`). |

---

## 17. 🪐 Client Projects & O2O2B2B2C Ecosystem Engine

### Identity & Purpose:
Allows external businesses, partners, and developers to build on top of OrbitoX without writing backend engines from scratch. Supports complex multi-tier business models (`O2O2B2B2C`, `B2B2C`, `D2C`, `HEALTHCARE_NETWORK`, `FRANCHISE_RETAIL`).

### Key Capabilities:
1. **Zero-Code Microservice Packages**:
   - 9 core packages (`@orbitox/restaurant`, `@orbitox/pos`, `@orbitox/commerce`, `@orbitox/crm`, `@orbitox/finance`, `@orbitox/inventory`, `@orbitox/hms`, `@orbitox/hrms`, `@orbitox/school`).
   - Clients assemble packages into their project with checkboxes.

2. **Instant Developer Integration Kit (4 Patterns)**:
   - **Pattern 1: 1-Line Client Bootstrapper (`createOrbitoX`)**:
     ```typescript
     import { createOrbitoX } from '@orbitox-io/plugin-engine';
     import restaurant from '@orbitox-io/restaurant';
     import pos from '@orbitox-io/pos';
     import commerce from '@orbitox-io/commerce';

     const app = await createOrbitoX({
       license: 'orb_live_omni_7f9c2d1b4e8a',
       domain: 'api.clientpartner.com',
       plugins: [restaurant, pos, commerce],
     });
     ```
   - **Pattern 2: Live Edge Gateway cURL**:
     ```bash
     curl -X GET "http://localhost:3005/api/v1/restaurant/orders" \
       -H "x-api-key: orb_live_..." \
       -H "x-tenant-id: omnideliver"
     ```
   - **Pattern 3: Node.js Multi-Tenant Express Middleware**:
     ```javascript
     const engine = createMultiTenantEngine({ ... });
     app.use(engine.middleware()); // 1-line middleware injects req.tenant & req.app
     ```
   - **Pattern 4: Headless React 19 Hooks**:
     ```tsx
     import { useLeads } from '@orbitox-io/crm/react';
     import { useCommerceCart } from '@orbitox-io/commerce/react';
     ```
   - **Live Gateway Test Runner**: Interactive workbench in the Project Cockpit that runs real HTTP requests, returning live `HTTP 200 OK`, latency, `Anti-Tamper: VERIFIED`, and parsed JSON.

3. **Dynamic Plan Tiers & Resource Sliders**:
   - Plan presets: `starter` (100K calls), `growth` (1M calls), `pro` (5M calls), `enterprise` (25M calls), `hyperscale` (100M calls).
   - Live sliders for Monthly API Quotas, Sliding-Window Rate Limits (req/min), and Encrypted Storage (GB/TB).
   - Instant edge gateway updates with zero downtime.

4. **Zero-Trust Gateway Enforcement (`withApiGuard`)**:
   - `HTTP 403 PLUGIN_NOT_ENTITLED`: If project calls an un-subscribed package.
   - `HTTP 429 TENANT_QUOTA_EXCEEDED`: If monthly call count reaches allocated quota.
   - `HTTP 403 PROJECT_SUSPENDED`: If project status is suspended by admin.

5. **REST API Management Endpoints**:
   - `GET /api/v1/admin/projects`: List all client projects with aggregate KPIs.
   - `POST /api/v1/admin/projects`: Provision project, assign plan & quotas, issue initial API key.
   - `GET /api/v1/admin/projects/:id`: Single project details and keys.
   - `PATCH /api/v1/admin/projects/:id`: Update plan, quotas, rate limits, packages, or status.
   - `DELETE /api/v1/admin/projects/:id`: Deprovision project.

---

## 📄 License & Attribution
Proprietary & Confidential — **OrbitoX Platform**. Published under `@orbitox-io` GitHub Packages. All rights reserved.
