# 🪐 Security Invariants & Immutable Boundaries (CP-23)
**Classification: Threat Modeling & Zero-Trust Constraints**

---

## 1. The 7 Non-Negotiable Laws of OrbitoX Security

Customizability in OrbitoX is strictly bounded: **"Every legitimate platform policy is configurable, while core security invariants remain impossible to violate."**

No SuperAdmin setting, configuration toggle, or API override can bypass these 7 laws:

### Law 1: Absolute Multi-Tenant Isolation
- Database mutations and reads must be cryptographically partitioned by `tenantId`.
- Client-provided headers (`x-tenant-id`), query parameters (`?tenantId=`), or body fields are untrusted and discarded. The server derives the active tenant context exclusively from the verified token session (`AsyncLocalStorage`).

### Law 2: Zero Plaintext Secret Retention
- Machine API key raw secrets are displayed **exactly once** upon generation and **never persisted in any database, cache, or log**.
- Authentication uses constant-time `HMAC-SHA256` verifiers with server pepper.

### Law 3: Hardware-Grade Envelope Encryption
- Third-party credentials (Stripe, AWS, Twilio) must be encrypted using `AES-256-GCM` with unique DEKs managed by a master KMS KEK.
- Plaintext secrets are strictly prohibited from being returned in list endpoints.

### Law 4: Cryptographic Software Supply Chain
- Packages lacking an Ed25519 digital signature or failing SHA-256 manifest inventory verification are hard-blocked from startup.
- Runtime facades are deeply frozen (`SandboxGuard.freezeAllFacades`) to eliminate prototype pollution.

### Law 5: Immutable Append-Only Merkle Audit Trail
- Every administrative mutation, security finding, and approval decision writes to the SHA-256 hash-chained audit ledger (`previousHash` ➔ `rowHash`).
- Retroactive tampering or deletion of past audit records is cryptographically impossible without invalidating the entire ledger proof.

### Law 6: Non-Self-Approving Four-Eyes Quorum
- High-blast actions (`riskScore >= 80`, project deprovisioning, production key revocation) mandate dual sign-offs.
- The operator who initiates a mutation cannot approve their own action.

### Law 7: Server-Authoritative Policy & Entitlement Enforcement
- The frontend UI merely renders available options based on current capabilities.
- The backend independently evaluates authorization, plan entitlements, and quotas on every single HTTP and gRPC request.
