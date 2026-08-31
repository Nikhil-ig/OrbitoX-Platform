# 🚨 OrbitoX Platform Error Catalog & Troubleshooting

> **Complete catalog of error messages, thrown exceptions, HTTP error responses, and mitigation strategies across `@orbitox-io/plugin-engine` and `@orbitox-io/crm`.**

---

## 1. MultiTenantEngine Errors

### 1.1 `MultiTenantEngine: Unauthorized or unmapped custom domain: "<hostname>"`
- **Thrown By**: `engine.runWithTenant(hostname, callback)`
- **HTTP Equivalent in Middleware**: `404 { error: 'Custom domain not recognized or inactive.', domain: hostname }`
- **Cause**: The incoming hostname was not found in the static `domains` mapping and the `resolveTenant` function returned `null` or `undefined`.
- **Resolution**:
  - Add the domain to the `domains` dictionary in `createMultiTenantEngine({ domains: { ... } })`.
  - Or ensure your database `resolveTenant` callback correctly queries and returns the `TenantConfig`.
  - For wildcard subdomains, ensure `wildcardRootDomain` is configured (e.g. `wildcardRootDomain: 'orbito.com'`).

---

### 1.2 `MultiTenantEngine: Tenant account "<tenant>" is currently SUSPENDED.`
- **Thrown By**: `engine.runWithTenant()`
- **HTTP Equivalent in Middleware**: `403 { error: 'Tenant Account Suspended', message: '...' }`
- **Cause**: The tenant's `status` field is set to `'SUSPENDED'`.
- **Resolution**: Update the tenant status back to `'ACTIVE'` in the database or config after billing resolution.

---

### 1.3 `The feature "<featureName>" is not enabled for your current tenant tier.`
- **Returned By**: `engine.requireFeature(featureName)` middleware (HTTP 403)
- **Cause**: The active tenant's `features` array does not include the requested feature, or the license does not grant it.
- **Resolution**:
  - Add the feature to `tenant.features` in the tenant configuration.
  - Or grant `*` (wildcard) for all features on enterprise accounts.

---

### 1.4 `This endpoint requires the "<minimumTier>" tier or higher. Current tier: "<currentTier>".`
- **Returned By**: `engine.requireTier(minimumTier)` middleware (HTTP 403)
- **Cause**: The tenant's tier rank is lower than the required minimum tier (e.g. `starter` accessing a `pro` endpoint).
- **Resolution**: Upgrade tenant tier (`starter` ➔ `growth` ➔ `pro` ➔ `enterprise`).

---

## 2. Cryptographic Security & Anti-Tamper Errors

### 2.1 `Security Alert: Plugin "<pluginId>" failed cryptographic signature verification!`
- **Thrown By**: `app.registerPlugin(plugin, signature, publicKeyPem)` or `PluginLoaderService`
- **Cause**: The plugin manifest or file tree was modified after signing, or verified with the wrong public key.
- **Resolution**: Re-sign the plugin package using `orbitox package <plugin> --key=keys/private.pem`.

---

### 2.2 `Tamper alert: manifest.json SHA-256 hash does not match signature manifestHash`
- **Thrown By**: `IntegrityVerifier.verifyPackageIntegrity()`
- **Cause**: `manifest.json` on disk was edited after the signature was generated.
- **Resolution**: Restore the certified `manifest.json` or regenerate the signature bundle.

---

### 2.3 `Tamper alert: File <path> has been altered (expected SHA-256: <hash>, got: <actual>)`
- **Thrown By**: `IntegrityVerifier.verifyPackageIntegrity()`
- **Cause**: A compiled file in `dist/` or other tracked asset was altered on disk.
- **Resolution**: Re-install the package or re-build with `orbitox package`.

---

## 3. License Enforcer Errors

### 3.1 `Tamper alert: License cryptographic signature is invalid or forged`
- **Returned By**: `LicenseEnforcer.verifyLicenseToken()` in `result.errors`
- **Cause**: The base64 license token was edited or corrupted in transit.
- **Resolution**: Issue a new license token with `LicenseEnforcer.issueLicenseToken()`.

---

### 3.2 `License expired on <date>`
- **Returned By**: `LicenseEnforcer.verifyLicenseToken()` in `result.errors`
- **Cause**: `Date.now() > new Date(payload.expiresAt).getTime()`.
- **Resolution**: Issue a renewed license with an updated `expiresAt` timestamp.

---

### 3.3 `Domain lock violation: License is only valid for "<allowedDomain>", current domain is "<currentDomain>"`
- **Returned By**: `LicenseEnforcer.verifyLicenseToken()` in `result.errors`
- **Cause**: The server's hostname does not match `payload.allowedDomain`.
- **Resolution**: Deploy the application under the designated domain, or issue a wildcard license (`allowedDomain: '*'`).

---

### 3.4 `Tenant quota exceeded: License permits maximum <allowed> tenants (current: <actual>)`
- **Returned By**: `LicenseEnforcer.verifyLicenseToken()` in `result.errors`
- **Cause**: `activeTenantsCount > payload.allowedTenants`.
- **Resolution**: Upgrade license quota limit for multi-tenant deployments.

---

## 4. Sandbox Guard Security Errors

### 4.1 `Sandbox Security Alert: Access to kernel symbols is restricted.`
- **Thrown By**: `SandboxGuard.createSandboxedProxy()`
- **Cause**: An untrusted plugin attempted to read or execute a private Symbol property on the kernel.

---

### 4.2 `Sandbox Security Alert: Access to private property "<prop>" is forbidden.`
- **Thrown By**: `SandboxGuard.createSandboxedProxy()`
- **Cause**: An untrusted plugin attempted to access a property starting with `_` or `#` (e.g. `_privateKey`).

---

### 4.3 `Sandbox Security Alert: Runtime facades are read-only and immutable.`
- **Thrown By**: `SandboxGuard.createSandboxedProxy()`
- **Cause**: A plugin attempted to mutate a facade property (e.g. `runtime.security.authorize = ...`).

---

## 5. CRM Domain Core Errors

### 5.1 `Invalid CRM Lead State Transition: Cannot move lead from <current> to <next>`
- **Thrown By**: `crm.updateLeadStatus(leadId, nextStatus)` and `LeadStateMachine.validateTransition()`
- **Cause**: An illegal transition was attempted (e.g., trying to jump directly from `NEW` to `WON`).
- **Valid Transitions**:
  - `NEW` ➔ `CONTACTED`, `LOST`
  - `CONTACTED` ➔ `QUALIFIED`, `LOST`
  - `QUALIFIED` ➔ `PROPOSAL_SENT`, `LOST`
  - `PROPOSAL_SENT` ➔ `WON`, `LOST`
  - `LOST` ➔ `NEW`
- **Resolution**: Check `LeadStateMachine.canTransition(current, next)` before updating.

---

### 5.2 `CRM Lead Validation Failed: Name is required.`
- **Thrown By**: `crm.createLead(payload)`
- **Cause**: `payload.name` was missing or empty string.

---

### 5.3 `CRM Lead Validation Failed: Valid email is required.`
- **Thrown By**: `crm.createLead(payload)`
- **Cause**: `payload.email` was missing or did not contain `@`.
