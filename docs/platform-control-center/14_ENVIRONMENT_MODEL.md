# 🪐 OrbitoX Platform Control Center: Environment Hierarchy & Isolation Model
**Document Ref: PCC-14**  
**Classification: Environment Architecture & Resource Isolation Invariants**

---

## 1. Architectural Motivation

In the previous proposed schema, `PlatformProject.environment` assumed a project was permanently bound to a single environment. This created three severe architectural failures:
1. **Broken Release Lifecycles**: A client project (e.g. `OmniDeliver`) could not test upgrades in `staging` while running `production`.
2. **Credential Bleed**: API keys and external database credentials were bound to the project root, allowing staging configurations to accidentally target production datastores.
3. **Ambiguous Quota Metrics**: Development test scripts consumed production rate-limit allocations.

The corrected architecture enforces `Environment` as a **first-class subordinate entity under Project**:

```
                              PlatformProject (OmniDeliver)
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    ▼                       ▼                       ▼
            ProjectEnvironment      ProjectEnvironment      ProjectEnvironment
              (Development)              (Staging)             (Production)
                    │                       │                       │
           ┌────────┴────────┐     ┌────────┴────────┐     ┌────────┴────────┐
           │ • Test Keys     │     │ • Staging Keys  │     │ • Prod Keys     │
           │ • Dev Stripe    │     │ • Sandbox Stripe│     │ • Live Stripe   │
           │ • dev.omni.io   │     │ • stg.omni.io   │     │ • api.omni.io   │
           │ • 50k calls/mo  │     │ • 500k calls/mo │     │ • 100M calls/mo │
           │ • Package v2.2.0│     │ • Package v2.2.0│     │ • Package v2.1.4│
           └─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 2. Core Environment Isolation Invariants

The runtime gateway enforces five non-negotiable isolation invariants:

### Invariant 1: Cryptographic Key-to-Environment Binding
- Every API key is assigned an `environmentId` at creation.
- A key issued for `staging` (`orb_stage_...`) that attempts to execute an endpoint against a `production` resource is rejected immediately with:
  ```json
  {
    "success": false,
    "error": {
      "code": "ENVIRONMENT_MISMATCH",
      "message": "Key issued for environment [staging] cannot access resources in [production].",
      "details": { "keyEnvironment": "staging", "targetEnvironment": "production" }
    }
  }
  ```

### Invariant 2: External Credential Segregation
- External integration secrets (e.g. Stripe API keys, AWS S3 credentials) belong to a specific `ProjectEnvironment`.
- Code executing in `development` is physically incapable of querying or decrypting production credentials from the Credential Vault.

### Invariant 3: Independent Package Pinning
- An environment can run a canary or beta release of a package without impacting other environments.
- Example: `OmniDeliver (Staging)` installs `@orbitox/restaurant@2.2.0-rc.1` to test digital menu enhancements, while `OmniDeliver (Production)` remains pinned to certified `@orbitox/restaurant@2.1.4`.

### Invariant 4: Distinct Quota & Rate Limit Governors
- Each environment possesses dedicated quota policies. High-concurrency automated load tests in staging do not exhaust the monthly quota of the production client.

### Invariant 5: Strict Network & Domain Boundaries
- Production apex and wildcard custom domains (`api.omnideliver.global`) route solely to the production environment instance. Staging subdomains (`staging-api.omnideliver.global`) terminate in staging runtime containers.

---

## 3. Promotion Workflow (Dev → Staging → Prod)

The Platform Control Center provides a structured **Environment Promotion Pipeline**:

```
┌──────────────┐       Validation Gate 1       ┌──────────────┐       Validation Gate 2       ┌──────────────┐
│ DEVELOPMENT  │ ────────────────────────────> │   STAGING    │ ────────────────────────────> │  PRODUCTION  │
└──────────────┘   • Contract Tests Passed     └──────────────┘   • Security Suite Passed     └──────────────┘
                   • Schema Validated                             • Supply-Chain Verified
                                                                  • Two-Person Approval
```

1. **Package Version Promotion**:
   - Compare package dependencies and configuration diffs between Staging and Production.
   - Run Platform Verification Suite (`/platform/tests`) against Staging.
   - If tests pass, trigger a staged rollout to Production.
2. **Release Gates**:
   - Production promotions require cryptographic verification of package signatures via `IntegrityVerifier`.
   - If signature verification fails or dependency drift is detected, promotion is blocked with `SECURITY BLOCK`.

---

## 4. Resource Model Specification

```prisma
enum EnvironmentType {
  DEVELOPMENT
  STAGING
  PRODUCTION
  SANDBOX
  DISASTER_RECOVERY
}

model ProjectEnvironment {
  id                    String                      @id @default(cuid())
  projectId             String
  slug                  String                      // dev, staging, prod
  name                  String                      // "Production Main", "Staging QA"
  type                  EnvironmentType             @default(DEVELOPMENT)
  isProduction          Boolean                     @default(false)
  status                String                      @default("ACTIVE") // ACTIVE, FROZEN, DECOMMISSIONED
  description           String?
  
  // Security Policies
  requireMtls           Boolean                     @default(false)
  strictIpAllowlist     Boolean                     @default(false)
  enforceFourEyes       Boolean                     @default(false)

  createdAt             DateTime                    @default(now())
  updatedAt             DateTime                    @updatedAt

  project               PlatformProject             @relation(fields: [projectId], references: [id], onDelete: Cascade)
  apiKeys               PlatformApiKey[]
  credentials           PlatformCredential[]
  packageInstallations  PackageInstallation[]
  domains               ProjectDomain[]
  quotaPolicy           EnvironmentQuotaPolicy?
  rateLimitPolicy       EnvironmentRateLimitPolicy?

  @@unique([projectId, slug])
  @@index([projectId])
  @@index([type])
}
```
