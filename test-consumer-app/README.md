# 🧪 OrbitoX Package Consumer Test Application

> **Standalone external test consumer verifying packages deployed to GitHub Packages (`@orbitox-io/plugin-engine` & `@orbitox-io/crm`).**

---

## 🚀 How to Run the Tests

### 1. Authenticate with GitHub Packages
Ensure your `.npmrc` contains your token:

```ini
# .npmrc
@orbitox-io:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
always-auth=true
```

### 2. Install Packages via NPM
```bash
npm install
```

### 3. Run the Comprehensive Multi-Tier Test Suite
```bash
node src/test-suite.js
```

### 4. Run the Quick Consumer Demo
```bash
npm start
```

---

## 📊 Modules Verified in Test Suite

| Test Module | Components Tested | Status |
| :--- | :--- | :--- |
| **1. Security & Cryptography** | Ed25519/RSA Keygen, SHA-256 Signatures, Tamper Detection, Sandbox Guard | ✅ 100% Passed |
| **2. Tier & Licensing** | RSA Signed Token, Domain Binding, Tenant Quota Enforcer, Expiration Rejection | ✅ 100% Passed |
| **3. Roles & RBAC Matrix** | Zero-Trust Least Privilege Access, Wildcard Permissions, Cross-Domain Isolation | ✅ 100% Passed |
| **4. Domain Models & CRM** | Headless Lead Service, State Machine Pipeline (`NEW` ➔ `WON`), AI Summaries | ✅ 100% Passed |
