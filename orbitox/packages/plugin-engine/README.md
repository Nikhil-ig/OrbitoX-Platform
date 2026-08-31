# 🛡️ @orbitox-io/plugin-engine

> **1-Line Bootstrapper, Zero-Trust Security, Cryptographic Signer, Anti-Tamper Verifier, Enterprise Licensing & Plugin Registry Engine for the OrbitoX SaaS Operating System.**

[![npm package](https://img.shields.io/badge/npm-@orbitox--io/plugin--engine-blue?style=flat-square&logo=npm)](https://github.com/OrbitoX-io/OrbitoX-Platform/packages)
[![Security: Zero-Trust](https://img.shields.io/badge/Security-Zero--Trust%20Sandboxed-success?style=flat-square)](https://github.com/OrbitoX-io/OrbitoX-Platform)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](https://github.com/OrbitoX-io/OrbitoX-Platform)

---

## 📑 Table of Contents
1. [🌟 1-Line Quick Start (Ultra-Easy DX)](#-1-line-quick-start-ultra-easy-dx)
2. [⚡ 1-Command Developer Setup](#-1-command-developer-setup)
3. [📦 Installation](#-installation)
4. [🔐 Core Security & Enterprise Modules](#-core-security--enterprise-modules)
   - [1. 1-Line Client (`createOrbitoX`)](#1-1-line-client-createorbitox)
   - [2. Cryptographic Signer & Hasher (`CryptoSigner`)](#2-cryptographic-signer--hasher-cryptosigner)
   - [3. Anti-Tamper Verifier (`IntegrityVerifier`)](#3-anti-tamper-verifier-integrityverifier)
   - [4. Enterprise License & Domain Lock (`LicenseEnforcer`)](#4-enterprise-license--domain-lock-licenseenforcer)
   - [5. Zero-Trust Sandbox Guard (`SandboxGuard`)](#5-zero-trust-sandbox-guard-sandboxguard)
5. [🛠️ CLI Reference](#-cli-reference)

---

## 🌟 1-Line Quick Start (Ultra-Easy DX)

Initialize your entire multi-plugin application in a single line with automatic license enforcement and sandboxing:

```javascript
const { createOrbitoX } = require('@orbitox-io/plugin-engine');
const crm = require('@orbitox-io/crm');

async function main() {
  // 🚀 1-Line Fluent Bootstrapper
  const app = await createOrbitoX({
    license: process.env.ORBITOX_LICENSE_KEY, // Auto-verified if provided
    plugins: [crm]                            // Automatically mounted
  });

  // Direct, fluent access: app.crm, app.hms, app.security
  const lead = app.crm.createLead({
    name: 'Dr. Ramesh Sharma',
    email: 'sharma@apollo.com',
    company: 'Apollo Healthcare Network',
    estimatedValue: 4500000
  });

  console.log('Lead Created:', lead);
}
main();
```

---

## ⚡ 1-Command Developer Setup

Never configure `.npmrc` manually again. Use the built-in CLI:

```bash
# 1. Automatic registry auth setup and local key generation
npx @orbitox/cli setup --token=ghp_yourPersonalAccessTokenHere

# 2. Add and wire any plugin in 1 step
npx @orbitox/cli add crm
```

---

## 📦 Installation

```bash
# Using npm
npm install @orbitox-io/plugin-engine

# Using pnpm
pnpm add @orbitox-io/plugin-engine
```

---

## 🔐 Core Security & Enterprise Modules

### 1. 1-Line Client (`createOrbitoX`)

```typescript
import { createOrbitoX } from '@orbitox-io/plugin-engine';
import * as crm from '@orbitox-io/crm';

const app = await createOrbitoX({
  license: process.env.ORBITOX_LICENSE_KEY,
  domain: 'apollo.orbito.com',
  strictSecurity: true,
  plugins: [crm]
});

// Check enterprise entitlements
if (app.hasFeature('ai_diagnostics')) {
  console.log('AI Diagnostics Enabled!');
}
```

---

### 2. Cryptographic Signer & Hasher (`CryptoSigner`)

```typescript
import { CryptoSigner } from '@orbitox-io/plugin-engine';

// Generate signing keypair
const { publicKey, privateKey } = CryptoSigner.generateSigningKeyPair('ed25519');

// Sign payload
const signature = CryptoSigner.signPayload({ pluginId: 'hms', version: '2.0.0' }, privateKey);
```

---

### 3. Anti-Tamper Verifier (`IntegrityVerifier`)

```typescript
import { IntegrityVerifier } from '@orbitox-io/plugin-engine';

const isValid = IntegrityVerifier.verifyPayloadSignature(payload, signatureHex, publicKeyPem);
if (!isValid) {
  throw new Error('SECURITY ALERT: Tampered plugin payload detected!');
}
```

---

### 4. Enterprise License & Domain Lock (`LicenseEnforcer`)

```typescript
import { LicenseEnforcer } from '@orbitox-io/plugin-engine';

// Issue signed enterprise license
const token = LicenseEnforcer.issueLicenseToken({
  licenseId: 'lic_apollo_100',
  issuedTo: 'Apollo Hospitals',
  allowedDomain: 'hospital.apollo.com',
  allowedTenants: 50,
  features: ['ai_diagnostics', 'telehealth'],
  issuedAt: new Date().toISOString(),
  expiresAt: '2027-12-31T23:59:59Z',
  tier: 'enterprise'
}, privateKeyPem);

// Verify license token at boot
const check = LicenseEnforcer.verifyLicenseToken(token, publicKeyPem, {
  currentDomain: 'hospital.apollo.com',
  activeTenantsCount: 30,
  requiredFeature: 'ai_diagnostics'
});
```

---

### 5. Zero-Trust Sandbox Guard (`SandboxGuard`)

```typescript
import { SandboxGuard } from '@orbitox-io/plugin-engine';

const runtime = {
  security: { authorize: () => true },
  database: { query: () => [] },
  _privateMasterKey: 'secret-123'
};

// Deeply freeze runtime facades
SandboxGuard.freezeAllFacades(runtime);

// Safe proxy blocking private symbols
const safeFacade = SandboxGuard.createSandboxedProxy(runtime, ['security', 'database']);
```

---

## 🛠️ CLI Reference

| Command | Description |
| :--- | :--- |
| `orbitox setup --token=<token>` | Auto-configures `.npmrc` authentication and generates local signing keys. |
| `orbitox add <plugin>` | Automatically installs and outputs starter boilerplate for a plugin. |
| `orbitox keygen --type=ed25519` | Generates Ed25519 or RSA-2048 signing keys in `keys/`. |
| `orbitox package <plugin>` | Builds, strips source maps, hashes file tree, and cryptographically signs plugin bundle. |
| `orbitox verify <plugin>` | Validates digital signature and SHA-256 manifest integrity. |
| `orbitox license issue` | Issues an RSA-signed enterprise license token with domain & quota binding. |

---

## 📄 License

Proprietary & Confidential — **OrbitoX Platform**. All rights reserved.
