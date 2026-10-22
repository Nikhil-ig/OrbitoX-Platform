# 🪐 OrbitoX Platform Control Center: Credential Vault & Envelope Encryption Model
**Document Ref: PCC-15**  
**Classification: External Secrets Architecture & Envelope Cryptography Specification**

---

## 1. Threat Model & Architectural Problem

External integration secrets (e.g. Stripe private keys, AWS S3 secret access keys, Meta WhatsApp tokens, Twilio Auth Tokens, database passwords) differ fundamentally from OrbitoX API keys:
- **API Keys**: Authenticate machine callers *into* OrbitoX. Secrets are one-way hashed into verifiers (`HMAC-SHA-256`) and never decrypted.
- **External Credentials**: Used by OrbitoX services to call *out* to third-party providers. The system **must be able to decrypt the secret at execution time**, requiring authenticated symmetric encryption at rest.

Storing secrets as naive strings encrypted with a single static environment variable is unacceptable for an enterprise SaaS OS. It creates severe risks:
- Key compromise compromises every tenant across the entire database.
- Zero key rotation capability.
- Inability to verify ciphertext integrity against tampering.

---

## 2. Envelope Encryption Architecture

The OrbitoX Credential Vault implements **Two-Tier Envelope Encryption**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ENVELOPE ENCRYPTION ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────────┘

                  Master Key Encryption Key (KEK)
                  [Stored in AWS KMS / HashiCorp Vault / Cloud KMS / Local HSM]
                                    │
                  ┌─────────────────┴─────────────────┐
                  │ Encrypts DEK                      │ Decrypts DEK
                  ▼                                   ▼
      Data Encryption Key (DEK)           Data Encryption Key (DEK)
      [Generated per Secret via CSPRNG]   [In-Memory RAM Only]
                  │                                   │
                  │ AES-256-GCM                       │ AES-256-GCM
                  ▼                                   ▼
          Encrypted Payload                   Decrypted Secret
      (External Secret Ciphertext)       (Passed to Outbound Service)
```

### 2.1. Cryptographic Primitives:
- **Payload Cipher**: `AES-256-GCM` (Galois/Counter Mode).
- **Nonce / IV**: 96-bit cryptographically random IV generated via `crypto.randomBytes(12)` per encryption. **Never reused across secrets**.
- **Authentication Tag**: 128-bit GCM authentication tag. Guarantees authenticity and detects any database tampering.
- **Data Encryption Key (DEK)**: Unique 256-bit symmetric key generated per secret. Never written to disk unencrypted.
- **Master Key Encryption Key (KEK)**: 256-bit master key stored in a protected Key Management Service (AWS KMS, GCP Cloud KMS, HashiCorp Vault) or hardware security module (HSM).

---

## 3. Ciphertext Envelope Structure

The encrypted record is stored as a structured JSON envelope or serialized string:

```json
{
  "version": 1,
  "kekId": "kms:us-east-1:orbitox-master-kek-v2",
  "encryptedDek": "base64EncodedCiphertextOfDEK",
  "iv": "base64Encoded96BitNonce",
  "authTag": "base64Encoded128BitAuthTag",
  "ciphertext": "base64EncodedSecretPayload",
  "fingerprint": "sha256DigestOfPlaintextSecret"
}
```

---

## 4. Encryption & Decryption Workflows

### 4.1. Storage (Encryption) Workflow:
```
1. Operator inputs external secret (e.g., Stripe `sk_live_...`).
2. Vault Service generates fresh 256-bit DEK: `crypto.randomBytes(32)`.
3. Vault Service generates fresh 96-bit IV: `crypto.randomBytes(12)`.
4. Vault Service encrypts plaintext secret with DEK via AES-256-GCM, producing `ciphertext` and `authTag`.
5. Vault Service calls KMS to encrypt DEK using the active Master KEK, producing `encryptedDek`.
6. Compute public display fingerprint: `SHA-256(plaintext).hex.slice(0, 16)`.
7. Plaintext secret and plaintext DEK are zeroed from memory buffer.
8. Store envelope in `PlatformCredential` record.
9. Dispatch immutable event to `AuditService.log()`.
```

### 4.2. Runtime Decryption Workflow:
```
1. Outbound worker requests credential for `OmniDeliver (Production)`.
2. Vault Service validates actor's execution scope (`requireCapability('credentials.decrypt')`).
3. Vault Service retrieves envelope from database.
4. Vault Service calls KMS to decrypt `encryptedDek` using Master KEK, obtaining plaintext DEK in memory.
5. Vault Service initializes AES-256-GCM decipher with DEK, IV, and authTag.
6. Decipher decrypts payload and validates authentication tag.
   - If tag fails: Throws `CRYPTOGRAPHIC_INTEGRITY_TAMPER_ALERT`.
7. Returns decrypted secret directly to outbound client.
8. Immediately wipes decrypted buffers from memory.
```

---

## 5. Master Key Rotation (Zero-Downtime Re-Encryption)

When the Master KEK is rotated (e.g. annual security compliance or suspected KMS leak):
1. Create new Master KEK (`kek-v3`).
2. Run automated vault migration job:
   ```
   For each PlatformCredential record:
     1. Decrypt `encryptedDek` using old KEK (`kek-v2`).
     2. Re-encrypt `encryptedDek` using new KEK (`kek-v3`).
     3. Update `kekId` and `encryptedDek` in the database.
   ```
3. **Payload Data is Never Re-Encrypted**: The underlying secret payload does not need to be decrypted or touched during KEK rotation, eliminating risk of data corruption or plaintext leakage during maintenance.

---

## 6. Credential Health & Guided Rotation

External credentials have expiration dates and periodic rotation requirements:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CREDENTIAL HEALTH STATUS CODES                        │
├───────────────────┬─────────────────────────────────────────────────────────┤
│ HEALTHY           │ Validated via outbound test, > 30 days to rotation due  │
│ EXPIRING_SOON     │ Less than 30 days until scheduled rotation / expiry     │
│ EXPIRED           │ Rotation past due or provider reported token expiry     │
│ FAILED_VALIDATION │ Outbound non-destructive ping test failed (e.g. 401)    │
│ ROTATION_PENDING  │ Replacement credential deployed, awaiting verification   │
└───────────────────┴─────────────────────────────────────────────────────────┘
```

The Control Center provides an integrated **Live Test Button**:
- Tests external connectivity non-destructively (e.g., calls `GET /v1/balance` on Stripe or `ListBuckets` on S3 with limited scope).
- Confirms credentials work *before* they are swapped into production.

---

## 7. Prisma Schema for Credential Vault

```prisma
enum CredentialHealth {
  HEALTHY
  EXPIRING_SOON
  EXPIRED
  FAILED_VALIDATION
  ROTATION_PENDING
}

model PlatformCredential {
  id                    String              @id @default(cuid())
  name                  String              // "Production Stripe Primary", "AWS S3 Assets"
  provider              String              // stripe, aws_s3, meta, twilio, sendgrid, redis
  environmentId         String
  
  // Envelope Encryption Fields
  envelopeVersion       Int                 @default(1)
  kekIdentifier         String              // kms:us-east-1:orbitox-master-kek-v2
  encryptedDek          String              // Encrypted Data Encryption Key
  initializationVector  String              // 96-bit Base64 IV
  authenticationTag     String              // 128-bit Base64 Auth Tag
  encryptedCiphertext   String              // AES-256-GCM Encrypted Payload
  
  // Non-Sensitive Auditing & Health
  secretFingerprint     String              // SHA-256(plaintext).hex
  maskedDisplay         String              // sk_live_••••••••9F2A
  health                CredentialHealth    @default(HEALTHY)
  lastRotatedAt         DateTime            @default(now())
  nextRotationDueAt     DateTime
  lastValidatedAt       DateTime?
  validationError       String?
  ownerEmail            String
  
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  environment           ProjectEnvironment  @relation(fields: [environmentId], references: [id], onDelete: Cascade)

  @@index([environmentId])
  @@index([provider])
  @@index([health])
}
```
