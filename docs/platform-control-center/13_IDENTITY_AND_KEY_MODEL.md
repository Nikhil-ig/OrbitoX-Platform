# 🪐 OrbitoX Platform Control Center: Identity & API Key Model
**Document Ref: PCC-13**  
**Classification: Machine Identity, Cryptographic Verifiers & Credential Lifecycle**

---

## 1. Cryptographic Division of Labor

The OrbitoX security architecture enforces a strict division between asymmetric digital signatures and symmetric machine credentials:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ORBITOX CRYPTOGRAPHIC FOUNDATION                      │
├──────────────────────────────────────┬──────────────────────────────────────┤
│    ASYMMETRIC SIGNING & INTEGRITY    │     SYMMETRIC MACHINE CREDENTIALS    │
│           (`CryptoSigner`)           │       (Platform API Key Engine)      │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ • Algorithm: Ed25519 & RSA-2048      │ • Entropy: 256-bit CSPRNG bytes      │
│ • Use Case: Package Distribution     │ • Use Case: Machine-to-Machine Auth  │
│ • Use Case: Manifest SHA-256 Hash    │ • Verifier: HMAC-SHA-256 with Pepper │
│ • Use Case: Enterprise License Token │ • Fingerprint: SHA-256 Human Digest  │
│ • Use Case: Code Supply-Chain Audit  │ • Storage: Salted Verifier in DB     │
│ • Storage: PEM Private/Public Keys   │ • Storage: Plaintext NEVER Persisted │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

Generating an Ed25519 keypair for every client API key is mathematically and operationally inappropriate. API keys authenticate high-frequency HTTP requests requiring sub-millisecond verification. Asymmetric signatures are reserved for tamper-evident provenance and software integrity.

---

## 2. API Key Architecture & Representations

Every machine API key possesses four distinct representations:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RAW SECRET GENERATION (CSPRNG)                     │
│               `orb_live_` + Base62(32 bytes crypto.randomBytes)              │
│                 e.g., orb_live_9kF2xL8mP4wQ7vR1tY5uI3oA6sD0zE              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
     ┌─────────────────────────────────┼─────────────────────────────────┐
     ▼                                 ▼                                 ▼
┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐
│      OPERATOR VIEW     │  │   DISPLAY FINGERPRINT  │  │  PERSISTED VERIFIER    │
│ (Shown Exactly Once)   │  │   (Visual Audit Only)  │  │ (Database Authentication│
├────────────────────────┤  ├────────────────────────┤  ├────────────────────────┤
│ orb_live_••••••••0zE   │  │ SHA256: 9F2A...81C7    │  │ HMAC-SHA-256(pepper,   │
│ Masked display in UI   │  │ SHA-256(rawSecret)     │  │          rawSecret)    │
│ Raw secret destroyed   │  │ Safe for logs/audits   │  │ Constant-time match    │
└────────────────────────┘  └────────────────────────┘  └────────────────────────┘
```

### 2.1. Secret Generation (CSPRNG)
- Generated on the server using `crypto.randomBytes(32)` (256 bits of cryptographically strong pseudo-random entropy).
- Encoded in Base62 to avoid URL-encoding bugs while maximizing entropy density.
- Prefixed with environment tagging:
  - Production: `orb_live_{base62}`
  - Staging: `orb_stage_{base62}`
  - Development: `orb_test_{base62}`

### 2.2. Public Key Identifier (`keyId`)
- A deterministic public handle used for lookups and correlation: `key_prod_01j7x4...`.
- Sent by the client in `x-orbitox-key-id` or parsed from the prefix if the key format allows key-id extraction.

### 2.3. Display Fingerprint
- Formula: `SHA256(rawSecret).hex` (truncated to 16 characters for visual inspection).
- Purpose: Enables operators and security teams to verify keys over phone/Slack/incident channels without exposing secret material.

### 2.4. Authentication Verifier
- Formula: `HMAC-SHA-256(ORBITOX_SERVER_PEPPER, rawSecret).hex`.
- The server pepper (`ORBITOX_SERVER_PEPPER`) is loaded from a dedicated secret vault/HSM at boot.
- The verifier is stored in the database.
- Even if the database is compromised, the attacker cannot reverse the verifiers into usable API keys without the external server pepper.

---

## 3. High-Performance Verification Sequence

```
Client Request
      │ (Authorization: Bearer orb_live_...)
      ▼
1. Extract Raw Secret from Header
      │
      ▼
2. Derive Key Prefix & Key ID
      │
      ▼
3. Query DB / RAM Cache for Key Record by `keyId` / `prefix`
      │
      ├── Record Not Found? ──> 401 Unauthorized
      │
      ▼
4. Check Lifecycle State
      │
      ├── Status != 'ACTIVE'? ──> 403 Forbidden (KEY_SUSPENDED / KEY_REVOKED)
      ├── now > expiresAt?   ──> 401 Unauthorized (KEY_EXPIRED)
      │
      ▼
5. Cryptographic Verifier Comparison
      │ Compute: testVerifier = HMAC-SHA-256(pepper, incomingSecret)
      │ Compare: crypto.timingSafeEqual(storedVerifier, testVerifier)
      │
      ├── Mismatch? ──> 401 Unauthorized (INVALID_CREDENTIAL)
      │
      ▼
6. Bind Trusted Context (NO CLIENT SPOOFING)
      │ context.project = key.project
      │ context.environment = key.environment
      │ context.tenantId = key.tenantScope || key.project.slug
      │
      ▼
7. Capability & Rate Limit Evaluation
      │ Validate required capability in key.capabilities
      │ Check sliding window rate limit
      │
      ▼
Execute Controller
```

---

## 4. Key Lifecycle State Machine

```
              ┌────────────┐
              │ PRE_ACTIVE │
              └─────┬──────┘
                    │ Operator Activation / Schedule
                    ▼
              ┌────────────┐
       ┌─────>│   ACTIVE   │<─────┐
       │      └─────┬──────┘      │
Reactivate          │             │ Un-suspend
       │      ┌─────┴──────┐      │
       └──────┤ SUSPENDED  ├──────┘
              └─────┬──────┘
                    │
         ┌──────────┼──────────┬──────────┐
         │          │          │          │
         ▼          ▼          ▼          ▼
    ┌─────────┐┌─────────┐┌──────────┐┌───────────┐
    │ EXPIRED ││COMPROMIS││ REVOKED  ││ DESTROYED │
    └─────────┘└────┬────┘└──────────┘└───────────┘
                    │ Emergency Quarantine
                    ▼
               Auto-Revoke
```

### State Definitions & Audit Rules:
1. `PRE_ACTIVE`: Key generated but queued for future activation (e.g., during scheduled zero-downtime client cutover).
2. `ACTIVE`: Live credential permitted to execute authorized endpoints.
3. `SUSPENDED`: Temporarily disabled by operator or automated quota gate. Verifier retained; incoming calls return `403 KEY_SUSPENDED`.
4. `EXPIRED`: Key past its `expiresAt` timestamp. Rejected with `401 KEY_EXPIRED`.
5. `COMPROMISED`: Flagged due to suspected credential leak or impossible travel. Emits high-priority security finding; all permissions immediately severed.
6. `REVOKED`: Permanently deactivated. Cannot be reactivated. Verifier kept for historical audit correlation.
7. `DESTROYED`: Cryptographic tombstone. Verifier wiped from database; only fingerprint and audit references retained.

Every lifecycle transition automatically dispatches an immutable record to `AuditService.log()`.

---

## 5. Guided Non-Destructive Rotation

Blind rotation causes downtime. The OrbitoX Control Center provides a **Guided 6-Stage Rotation Workflow**:

```
Stage 1: Generate Replacement Key (Key B) in PRE_ACTIVE or ACTIVE state.
Stage 2: Assign Identical Capabilities, Project, Environment & IP Restrictions.
Stage 3: Downstream Deployment (Client deploys Key B into production).
Stage 4: Traffic Observation Window:
         - Real-time telemetry tracks traffic distribution:
           [Key A: 84% traffic] ────> [Key A: 12% traffic] ────> [Key A: 0% traffic]
           [Key B: 16% traffic] ────> [Key B: 88% traffic] ────> [Key B: 100% traffic]
Stage 5: Grace Window Expiration (e.g., 72-hour window or manual confirmation).
Stage 6: Safe Revocation of Key A with automated rollback option.
```

---

## 6. Deterministic Risk Scoring Engine

Risk scoring is decoupled from classification:

### 6.1. Scoring Algorithm (`0` to `100`)
```ts
export interface RiskEvaluation {
  score: number; // 0 - 100
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: StructuredRiskFactor[];
}

export function calculateKeyRisk(key: PlatformApiKeyRecord): RiskEvaluation {
  let score = 0;
  const factors: StructuredRiskFactor[] = [];

  // Factor 1: Environment Weight
  if (key.environment.isProduction) {
    score += 15;
    factors.push({ code: 'PRODUCTION_ACCESS', weight: 15, message: 'Key has direct production environment access' });
  }

  // Factor 2: Wildcard Capabilities
  if (key.capabilities.some(c => c.endsWith('*') || c === '*')) {
    score += 35;
    factors.push({ code: 'WILDCARD_SCOPE', weight: 35, message: 'Key possesses broad wildcard capabilities (*)' });
  }

  // Factor 3: Absence of Expiration
  if (!key.expiresAt) {
    score += 20;
    factors.push({ code: 'NO_EXPIRATION', weight: 20, message: 'Key is non-expiring (infinite lifetime)' });
  }

  // Factor 4: Stale Key / Inactivity
  const daysSinceUse = (Date.now() - new Date(key.lastUsedAt).getTime()) / (1000 * 3600 * 24);
  if (daysSinceUse > 90) {
    score += 20;
    factors.push({ code: 'STALE_KEY', weight: 20, message: `Key unused for ${Math.round(daysSinceUse)} days` });
  }

  // Factor 5: Unconstrained Network Access
  if (!key.ipAllowlist || key.ipAllowlist.length === 0) {
    score += 10;
    factors.push({ code: 'UNCONSTRAINED_CIDR', weight: 10, message: 'Key is not bound to any IP CIDR allowlist' });
  }

  // Factor 6: Age of Key
  const ageDays = (Date.now() - new Date(key.issuedAt).getTime()) / (1000 * 3600 * 24);
  if (ageDays > 180) {
    score += 15;
    factors.push({ code: 'EXCESSIVE_AGE', weight: 15, message: `Key is ${Math.round(ageDays)} days old without rotation` });
  }

  score = Math.min(100, score);

  let level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (score >= 80) level = 'CRITICAL';
  else if (score >= 60) level = 'HIGH';
  else if (score >= 35) level = 'MEDIUM';

  return { score, level, factors };
}
```

---

## 7. Prisma Schema for API Keys

```prisma
enum KeyType {
  PLATFORM_ROOT
  PROJECT_SCOPED
  SERVICE_MACHINE
  INTEGRATION_PARTNER
  CICD_AUTOMATION
  READ_ONLY
  EMERGENCY_ELEVATED
}

enum KeyLifecycleState {
  PRE_ACTIVE
  ACTIVE
  SUSPENDED
  EXPIRED
  COMPROMISED
  REVOKED
  DESTROYED
}

enum RiskLevel {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

model PlatformApiKey {
  id                  String             @id @default(cuid())
  keyId               String             @unique // Public handle: key_live_01j7x4
  name                String
  environmentId       String
  keyType             KeyType            @default(PROJECT_SCOPED)
  keyPrefix           String             // e.g., orb_live_proj_
  secretFingerprint   String             // SHA-256(rawSecret).hex
  authVerifier        String             // HMAC-SHA-256(pepper, rawSecret).hex
  maskedDisplay       String             // orb_live_••••••••0zE
  status              KeyLifecycleState  @default(ACTIVE)
  capabilities        String[]           // Typed: ["restaurant.orders.read", "restaurant.orders.create"]
  ipAllowlist         String[]           @default([])
  rateLimitPerMin     Int                @default(1200)
  
  riskScore           Int                @default(15) // 0 to 100
  riskLevel           RiskLevel          @default(LOW)
  riskFactors         Json               @default("[]") // Array of { code, weight, message }

  issuedAt            DateTime           @default(now())
  activatedAt         DateTime           @default(now())
  expiresAt           DateTime?
  lastUsedAt          DateTime?
  lastUsedIp          String?
  lastUsedRegion      String?
  
  compromisedAt       DateTime?
  revokedAt           DateTime?
  revokeReason        String?
  createdBy           String
  version             Int                @default(1)

  environment         ProjectEnvironment @relation(fields: [environmentId], references: [id], onDelete: Cascade)

  @@index([environmentId])
  @@index([secretFingerprint])
  @@index([authVerifier])
  @@index([status])
  @@index([riskLevel])
}
```
