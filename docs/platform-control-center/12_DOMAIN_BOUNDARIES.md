# 🪐 OrbitoX Platform Control Center: Authoritative Domain Boundaries
**Document Ref: PCC-12**  
**Classification: Relational Domain Architecture & Schema Specification**

---

## 1. Domain Boundary Architecture

The platform architecture previously suffered from denormalized string arrays (e.g., `customDomains String[]`, `enabledPackages String[]`, `scopes String[]`). In an enterprise multi-tenant operating system, these represent independent operational lifecycles, security policies, and cryptographic verification states.

This document establishes the normalized relational graph separating **Platform Control Entities** from **Vertical Business Subsystems**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PLATFORM DOMAIN ENTITY GRAPH                          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                         ┌─────────────▼─────────────┐
                         │   PlatformOrganization    │
                         └─────────────┬─────────────┘
                                       │ 1:N
                         ┌─────────────▼─────────────┐
                         │      PlatformProject      │
                         └─────────────┬─────────────┘
                                       │ 1:N
                         ┌─────────────▼─────────────┐
                         │    ProjectEnvironment     │
                         │ (Dev / Staging / Prod)    │
                         └─────────────┬─────────────┘
                                       │
     ┌─────────────────┬───────────────┼───────────────┬─────────────────┐
     │ 1:N             │ 1:N           │ 1:N           │ 1:N             │ 1:N
     ▼                 ▼               ▼               ▼                 ▼
┌──────────┐     ┌───────────┐   ┌───────────┐   ┌───────────┐     ┌───────────┐
│Platform  │     │ Platform  │   │  Package  │   │  Custom   │     │   Quota   │
│ ApiKey   │     │Credential │   │Installat. │   │  Domain   │     │Allocation │
└──────────┘     └───────────┘   └─────┬─────┘   └───────────┘     └───────────┘
                                       │ N:1
                                 ┌─────▼─────┐
                                 │ Platform  │
                                 │  Package  │
                                 └─────┬─────┘
                                       │ 1:N
                                 ┌─────▼─────┐
                                 │  Package  │
                                 │  Version  │
                                 └───────────┘
```

---

## 2. Platform Entity Definitions

### 2.1. PlatformOrganization
The root enterprise account holding billing relationships, legal compliance, and overarching administrative policies.
- Attributes: `id`, `slug`, `name`, `billingEmail`, `complianceTier` (`STANDARD`, `HIPAA`, `SOC2`, `PCI_DSS`), `status`, `createdAt`, `updatedAt`.
- Relations: `projects: PlatformProject[]`.

### 2.2. PlatformProject
First-class client application or operational system (e.g., `OmniDeliver Global Network`, `MedNet Healthcare Alliance`).
- Attributes: `id`, `slug`, `name`, `organizationId`, `businessModel` (`O2O2B2B2C`, `HEALTHCARE_NETWORK`, `D2C`, `B2B_SAAS`, `FRANCHISE_RETAIL`), `planTier` (`starter`, `growth`, `pro`, `enterprise`, `hyperscale`), `status` (`PROVISIONING`, `ACTIVE`, `DEGRADED`, `SUSPENDED`, `ARCHIVED`), `technicalLead`, `contactEmail`, `createdAt`, `updatedAt`.
- Relations: `organization: PlatformOrganization`, `environments: ProjectEnvironment[]`.

### 2.3. ProjectEnvironment
The operational stage of a project. Critical invariant: **Keys, credentials, domains, and quotas are scoped to environments, not naked projects**.
- Attributes: `id`, `projectId`, `slug` (`development`, `staging`, `production`, `sandbox`), `name`, `isProduction: Boolean`, `status` (`ACTIVE`, `FROZEN`, `MAINTENANCE`), `createdAt`, `updatedAt`.
- Relations:
  - `project: PlatformProject`
  - `apiKeys: PlatformApiKey[]`
  - `credentials: PlatformCredential[]`
  - `packageInstallations: PackageInstallation[]`
  - `domains: ProjectDomain[]`
  - `quotaPolicy: EnvironmentQuotaPolicy?`
  - `rateLimitPolicy: EnvironmentRateLimitPolicy?`

### 2.4. PackageInstallation & PlatformPackage
Replaces `enabledPackages String[]` with explicit version pinning, configuration overrides, and supply-chain integrity bindings.
- **PlatformPackage**:
  - Catalog of certified OrbitoX plugins (`@orbitox/hms`, `@orbitox/commerce`, `@orbitox/restaurant`, etc.).
  - Attributes: `id`, `packageId` (e.g., `@orbitox/restaurant`), `name`, `category`, `publisher`, `currentStableVersion`, `signingPublicKeyPem`, `isCore`.
  - Relations: `versions: PackageVersion[]`, `installations: PackageInstallation[]`.
- **PackageVersion**:
  - Immutable historical releases.
  - Attributes: `id`, `packageId`, `version` (semver), `tarballSha256`, `manifestHash`, `signerId`, `signature`, `minPlatformVersion`, `releaseNotes`, `releasedAt`.
- **PackageInstallation**:
  - Live deployment of a package inside a project environment.
  - Attributes: `id`, `environmentId`, `packageId`, `installedVersionId`, `status` (`ACTIVE`, `UPGRADING`, `SUSPENDED`, `SECURITY_BLOCKED`), `configOverrides: Json`, `installedAt`, `updatedAt`.

### 2.5. ProjectDomain
Replaces `customDomains String[]`. Handles the full lifecycle of custom subdomains, apex domains, TLS provisioning, and CNAME verification.
- Attributes: `id`, `environmentId`, `domainName` (e.g., `api.omnideliver.global`), `isApex: Boolean`, `verificationStatus` (`PENDING_DNS`, `VERIFIED`, `FAILED`), `cnameTarget`, `tlsCertificateStatus` (`ISSUED`, `RENEWING`, `FAILED`), `sslExpiresAt`, `strictLicenseToken: String?`, `edgeLatencyMs`, `createdAt`, `verifiedAt`.

### 2.6. EnvironmentQuotaPolicy & EnvironmentRateLimitPolicy
Predictive utilization and resource throttling.
- **EnvironmentQuotaPolicy**:
  - Attributes: `id`, `environmentId`, `monthlyCallLimit: BigInt`, `monthlyCallsUsed: BigInt`, `storageQuotaGb: Float`, `storageUsedGb: Float`, `warningThresholdPercent: Int` (default: 80), `projectedExhaustionDays: Float?`.
- **EnvironmentRateLimitPolicy**:
  - Attributes: `id`, `environmentId`, `requestsPerMinute: Int` (default: 1200), `requestsPerSecondBurst: Int` (default: 100), `slidingWindowAlgorithm: String` (`ATOMIC_REDIS_OR_MEMORY_FALLBACK`).

---

## 3. Strict Boundary Isolation: Platform vs. Verticals

To prevent vertical application leakage into the Platform Control Plane:

| Domain Layer | Namespace / Path | Permitted Concepts | Strictly Prohibited Concepts |
| :--- | :--- | :--- | :--- |
| **Platform Control Plane** | `/platform/*`<br>`api/v1/platform/*` | Project hierarchy, environment boundaries, API credentials, external secret envelopes, supply-chain signatures, cluster topologies, immutable audit ledgers, test runners. | Tables, floor plans, kitchen displays (KDS), dine-in sessions, menu modifiers, retail cash drawers, patient bed allocations, medical vitals. |
| **RestaurantOS Vertical** | `/admin/restaurant/*`<br>`api/v1/restaurant/*` | Tables (`T-01`), floor layouts, dining tabs, kitchen tasks, recipe BOMs, bill splits, QR locators. | Global cluster switches, master API key issuance, cross-tenant project provisioning, KMS master key operations. |
| **Healthcare (HMS) Vertical** | `/admin/hms/*`<br>`api/v1/hms/*` | Clinical triage, ICU wards, inpatient admissions, electronic health records, pharmacy queues. | Global platform quotas, package signing, tenant key rotations. |
| **Commerce Vertical** | `/admin/commerce/*`<br>`api/v1/commerce/*` | Storefront themes, product variants, cart checkouts, shipping discounts, order fulfillment. | Root certificate revocation, cross-project rate limit overrides. |

---

## 4. Prisma Schema Representation for Platform Control

```prisma
// ─────────────────────────────────────────────────────────────
// NORMALIZED PLATFORM CONTROL PLANE SCHEMA
// ─────────────────────────────────────────────────────────────

model PlatformOrganization {
  id              String            @id @default(cuid())
  slug            String            @unique
  name            String
  billingEmail    String
  complianceTier  String            @default("STANDARD")
  status          String            @default("ACTIVE")
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  projects        PlatformProject[]

  @@index([slug])
}

model PlatformProject {
  id              String               @id @default(cuid())
  slug            String               @unique
  name            String
  organizationId  String
  businessModel   String               // O2O2B2B2C, HEALTHCARE_NETWORK, D2C, B2B_SAAS
  planTier        String               // starter, growth, pro, enterprise, hyperscale
  status          String               @default("ACTIVE")
  technicalLead   String
  contactEmail    String
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt

  organization    PlatformOrganization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  environments    ProjectEnvironment[]

  @@index([organizationId])
  @@index([slug])
  @@index([status])
}

model ProjectEnvironment {
  id                    String                      @id @default(cuid())
  projectId             String
  slug                  String                      // development, staging, production
  name                  String
  isProduction          Boolean                     @default(false)
  status                String                      @default("ACTIVE")
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
}

model PlatformPackage {
  id                    String                @id @default(cuid())
  packageId             String                @unique // @orbitox/restaurant
  name                  String
  category              String
  publisher             String
  currentStableVersion  String
  signingPublicKeyPem   String
  isCore                Boolean               @default(false)
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt

  versions              PackageVersion[]
  installations         PackageInstallation[]

  @@index([packageId])
}

model PackageVersion {
  id                    String                @id @default(cuid())
  packageId             String
  version               String
  tarballSha256         String
  manifestHash          String
  signerId              String
  signature             String
  minPlatformVersion    String
  releaseNotes          String?
  releasedAt            DateTime              @default(now())

  package               PlatformPackage       @relation(fields: [packageId], references: [id], onDelete: Cascade)
  installations         PackageInstallation[]

  @@unique([packageId, version])
  @@index([packageId])
}

model PackageInstallation {
  id                    String                @id @default(cuid())
  environmentId         String
  packageId             String
  installedVersionId    String
  status                String                @default("ACTIVE") // ACTIVE, SUSPENDED, SECURITY_BLOCKED
  configOverrides       Json                  @default("{}")
  installedAt           DateTime              @default(now())
  updatedAt             DateTime              @updatedAt

  environment           ProjectEnvironment    @relation(fields: [environmentId], references: [id], onDelete: Cascade)
  package               PlatformPackage       @relation(fields: [packageId], references: [id], onDelete: Cascade)
  version               PackageVersion        @relation(fields: [installedVersionId], references: [id])

  @@unique([environmentId, packageId])
  @@index([environmentId])
  @@index([packageId])
}

model ProjectDomain {
  id                    String                @id @default(cuid())
  environmentId         String
  domainName            String                @unique
  isApex                Boolean               @default(false)
  verificationStatus    String                @default("PENDING_DNS") // PENDING_DNS, VERIFIED, FAILED
  cnameTarget           String
  tlsCertificateStatus  String                @default("PENDING")     // ISSUED, RENEWING, FAILED
  sslExpiresAt          DateTime?
  strictLicenseToken    String?
  edgeLatencyMs         Int                   @default(0)
  createdAt             DateTime              @default(now())
  verifiedAt            DateTime?

  environment           ProjectEnvironment    @relation(fields: [environmentId], references: [id], onDelete: Cascade)

  @@index([environmentId])
  @@index([domainName])
}

model EnvironmentQuotaPolicy {
  id                    String                @id @default(cuid())
  environmentId         String                @unique
  monthlyCallLimit      BigInt                @default(1000000)
  monthlyCallsUsed      BigInt                @default(0)
  storageQuotaGb        Float                 @default(50.0)
  storageUsedGb         Float                 @default(0.0)
  warningThreshold      Int                   @default(80)
  updatedAt             DateTime              @updatedAt

  environment           ProjectEnvironment    @relation(fields: [environmentId], references: [id], onDelete: Cascade)
}

model EnvironmentRateLimitPolicy {
  id                    String                @id @default(cuid())
  environmentId         String                @unique
  requestsPerMinute     Int                   @default(1200)
  requestsPerSecondBurst Int                  @default(100)
  slidingWindowType     String                @default("HYBRID_REDIS_RAM")
  updatedAt             DateTime              @updatedAt

  environment           ProjectEnvironment    @relation(fields: [environmentId], references: [id], onDelete: Cascade)
}
```
