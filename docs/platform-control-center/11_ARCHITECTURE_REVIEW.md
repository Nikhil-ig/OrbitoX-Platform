# 🪐 OrbitoX Platform Control Center: Architecture Review & Corrections
**Document Ref: PCC-11**  
**Classification: Platform Engineering Master Review**

---

## 1. Executive Summary

Following the initial audit pass of the OrbitoX repository and its existing administration interfaces, this document establishes the authoritative architectural corrections required before any implementation begins. The objective is to construct a **Universal OrbitoX Control Plane (v3.0)** that governs the entire ecosystem—multi-tenancy, cryptographic supply chains, machine credentials, external secrets, and runtime extensions—without conflating platform governance with vertical application domains (e.g., RestaurantOS) and without introducing redundant or insecure platform primitives.

---

## 2. Response to the 15 Audit Review Gate Directives

### 2.1. Cryptographic Separation: Package Signing vs. API Key Authentication
- **Correction**: `CryptoSigner` (Ed25519 and RSA-2048) in `@orbitox-io/plugin-engine` is strictly reserved for **asymmetric trust chains**:
  1. Package & Plugin distribution signatures (`manifest.json` + distribution archive).
  2. Cryptographically signed enterprise license tokens (`LicenseEnforcer`).
  3. Release provenance and SBOM certification.
- Machine client API keys **must not** generate per-key Ed25519 pairs. They require **high-entropy symmetric secrets generated via CSPRNG**, combined with secure server-side verifiers (HMAC-SHA-256 with server pepper) and strict project/environment bindings.

### 2.2. CSPRNG-Generated API Key Secret Architecture
- **Correction**: Insecure pseudo-random generation (`Math.random()`) in `api-keys/route.ts` is eliminated.
- All secrets are derived using cryptographically secure random bytes (`crypto.randomBytes(32)`), formatted as `orb_{env}_{base62(32 bytes)}`.
- Secret entropy: 256 bits of raw cryptographic entropy, providing 10^77 collision resistance.

### 2.3. Key Identity, Fingerprint, Verifier, and Lifecycle Semantics
- **Correction**: Every key has three distinct cryptographic representations:
  1. **Raw Secret**: Displayed exactly once to the operator upon generation; **never** persisted in plaintext in any database, cache, or log.
  2. **Display Fingerprint**: `SHA-256(rawSecret).hex` truncated to 16 characters for visual operator recognition (`SHA256: 9F2A...81C7`).
  3. **Authentication Verifier**: `HMAC-SHA-256(server_pepper, rawSecret).hex` persisted in the database for constant-time cryptographic verification.
- **Key Prefix & Masking**: `orb_{env}_{keyId_short}••••••••{suffix_4}` for safe display.
- **Explicit Lifecycle States**: `PRE_ACTIVE` → `ACTIVE` → `SUSPENDED` → `EXPIRED` → `COMPROMISED` → `REVOKED` → `DESTROYED`.
- **Guided Rotation**: Non-destructive grace windows permitting dual-key validation until downstream client migration is verified.

### 2.4. Environment Placement Below Project
- **Correction**: `Environment` is removed from the root `PlatformProject` record. A project is not an environment.
- The authoritative hierarchy is:
  ```text
  PlatformProject
     └── ProjectEnvironment (Development, Staging, Production)
           ├── API Keys
           ├── Credentials
           ├── Package Installations
           ├── Custom Domains
           ├── Quotas
           └── Rate Policies
  ```
- This prevents environment cross-talk and ensures production keys cannot mutate development or staging resources.

### 2.5. Normalization of Domain Relationships
- **Correction**: Denormalized arrays (`customDomains String[]`, `enabledPackages String[]`, `scopes String[]`, `ipAllowlist String[]`) are replaced by structured entities and relational tables with foreign key constraints, indexes, and audit lifecycles.

### 2.6. Elimination of Duplicate Audit Systems
- **Correction**: The proposed `PlatformAuditEvent` model is dropped as an independent ledger.
- The platform reuses the existing `@orbitox/core` [`AuditService`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/packages/core/src/audit/audit.service.ts).
- All administrative mutations pipe into `AuditService.log()`, maintaining the SHA-256 cryptographic hash-chain (`previousHash` -> `rowHash`).
- The Control Center exposes a **read/projection interface** and live chain verification tool (`verifyChain()`) over the existing authoritative ledger.

### 2.7. Elimination of Duplicate Approval Engines
- **Correction**: The Control Center does not implement an ad-hoc approval database.
- It builds an API and UI façade directly over the existing `@orbitox/core` [`ApprovalEngine`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/packages/core/src/approval/approval-engine.ts), enforcing multi-stage four-eyes authorization for high-risk operations.

### 2.8. Remediation of Tenant ID Client-Spoofing Vulnerability
- **Correction**: Client-provided query parameters (`?tenantId=`) or unverified headers (`x-tenant-id`) are **strictly prohibited** from determining security context.
- The trusted execution context is derived entirely from the server-validated machine token:
  `Validated API Key` → `Bound Project` → `Bound Environment` → `Permitted Tenant Scope`.

### 2.9. Envelope Encryption for External Credentials
- **Correction**: Replace simple string encryption with a formal **Envelope Encryption Architecture**:
  - Algorithm: AES-256-GCM with 96-bit unique IV and 128-bit authentication tag.
  - Key Hierarchy: Master Key Encryption Key (KEK) managed via KMS/HSM → unique Data Encryption Key (DEK) generated per secret.
  - Ciphertext envelope encapsulates: ciphertext version, encrypted DEK, IV/nonce, auth tag, and payload ciphertext.

### 2.10. Separation of Risk Score from Risk Level
- **Correction**: Separate numerical calculation from risk category:
  - `riskScore`: Integer between `0` and `100`.
  - `riskLevel`: Derived enum (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
  - `riskFactors`: Structured list of deterministic triggers (e.g., `WILDCARD_SCOPE`, `NO_EXPIRATION`, `PRODUCTION_ACCESS`, `ANOMALOUS_GEOLOCATION`).

### 2.11. Typed Capability & Scope Model
- **Correction**: Arbitrary scope strings are replaced with a typed capability grammar:
  `<package>.<resource>.<action>` (e.g., `restaurant.orders.read`, `crm.deals.write`).
- Supported by reusable policy presets: `Read-Only`, `Operator`, `Integration`, and `SuperAdmin`.

### 2.12. API Explorer Security Boundaries
- **Correction**: Prevent browser leak of production secrets.
- Introduce three distinct operational boundaries:
  1. **Observe Mode**: Read-only (`GET`, `HEAD`) requests with zero side effects.
  2. **Sandbox Mode**: Mutations directed exclusively to isolated test/staging fixtures.
  3. **Production Mode**: Privileged live execution requiring short-lived elevated admin tokens, target resource verification, and explicit typed confirmation.

### 2.13. Comprehensive Test Lab Execution Lifecycle
- **Correction**: `/platform/tests` is modeled with a full lifecycle:
  - `TestRun` → `TestSuite` → `TestCase` → `Evidence` (Request, Response, Security Decision, Latency, Trace ID).
  - Verdicts: `PASS`, `FAIL`, `BLOCKED`, `SKIPPED`, `NOT_RUN`.
  - `SKIPPED` tests are explicitly prevented from counting toward pass percentages.

### 2.14. Telemetry Ground Truth
- **Correction**: Zero fabricated or simulated metrics in production mode.
- Dashboard cards and topology nodes bind to real telemetry agents or Redis/DB metrics. If a metric feed is unavailable, the UI explicitly renders `Telemetry Unavailable (Service Disconnected)`.

### 2.15. Production-Ready Domain Model Sequence
- **Correction**: Final Prisma schema definitions are generated only after authoritative domain boundaries, cryptographic models, and environment hierarchies are finalized.

---

## 3. Component Reusability & Implementation Classification

| Component / Subsystem | Source Location | Classification | Action & Governance Strategy |
| :--- | :--- | :--- | :--- |
| `CryptoSigner` | `@orbitox-io/plugin-engine` | `REUSE` | Retain for Ed25519/RSA package, manifest, and license signing. |
| `IntegrityVerifier` | `@orbitox-io/plugin-engine` | `REUSE` | Retain for SHA-256 package directory and manifest tamper audits. |
| `LicenseEnforcer` | `@orbitox-io/plugin-engine` | `REUSE` | Retain for cryptographically signed tenant domain license checks. |
| `SandboxGuard` | `@orbitox-io/plugin-engine` | `REUSE` | Retain for runtime facade freezing and plugin proxy isolation. |
| `MultiTenantEngine` | `@orbitox-io/plugin-engine` | `REUSE` | Retain for domain resolution and `AsyncLocalStorage` context propagation. |
| `AuditService` | `@orbitox/core` | `REUSE` | Authoritative immutable ledger; build read/projection APIs for Control Center. |
| `ApprovalEngine` | `@orbitox/core` | `REUSE` | Authoritative four-eyes quorum engine; build UI approval modal façade. |
| `AiGateway` & `ActionRegistry` | `@orbitox/core` | `REUSE` | Wire into `/platform/ai` for MCP server and tool governance. |
| `PolicyEngine` & `AbacEvaluator` | `@orbitox/core` | `REUSE` | Evaluate tri-factor authorization (Object, Function, Property). |
| `PlatformApiState` | `orbitox/apps/web/.../api-guard.ts` | `REFACTOR` | Migrate from volatile in-memory arrays to persistent DB repository pattern. |
| `ApiKeys` Controller | `app/api/v1/admin/api-keys` | `REFACTOR` | Replace pseudo-random keys with CSPRNG + HMAC verifiers and scoped presets. |
| `Projects` Controller | `app/api/v1/admin/projects` | `EXTEND` | Add project environment hierarchy, credentials count, and domain relations. |
| `Cluster` Controller | `app/api/v1/system/cluster` | `REUSE` | Retain dual-engine mesh health and zero-loss state transfer endpoints. |
| `Platform Control Center Shell` | `app/(platform)` / `app/platform` | `NEW` | Build sovereign `/platform` layout, context bar, and universal inspector. |
| `Credential Vault Service` | Platform Core | `NEW` | Envelope encryption engine for external partner secrets. |
| `Platform Verification Center` | `app/platform/tests` | `NEW` | Interactive test runner for contract, security, and tenant isolation suites. |
