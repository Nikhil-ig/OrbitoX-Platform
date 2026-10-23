# 🔐 RestaurantOS 2.0 — Phase 6.1: Identity Lifecycle & Production Release Gate Audit

**Document Version:** 2.0.0-phase6.1  
**Evaluation Date:** October 9, 2026  
**Auditor Role:** Principal Security Engineer & Production-Readiness Architect  
**Classification:** Restricted Engineering Document / Production Release Gate Certification  
**Target Runtime:** `projects/external-os/restaurant-os` (Port 4010)  
**Control Plane:** OrbitoX Control Plane (Port 3005)  
**Primary Regression Suite:** `node scripts/test-phase6-1-identity-lifecycle.js`  
**Final Release Gate Decision:** **`VERIFIED — all Phase 6.1 gates passed`**

---

## 1. Executive Summary & Release Gate Decision

Phase 6.1 conducted an exhaustive security audit and verification of the identity lifecycle, cryptographic key management, restart-durable credential revocation, multi-branch scoping, and realtime Server-Sent Events (SSE) isolation in RestaurantOS 2.0.

### Final Release Gate Decision
### **`VERIFIED — all Phase 6.1 gates passed`**

All acceptance gates defined in the Phase 6.1 specification were executed against the running application runtime, proved with reproducible automated tests, and confirmed without weakening any existing assertions:
- **P0-1 Staff Credential Issuance**: **`VERIFIED`**. Arbitrary request-body role/branch spoofing eliminated. Authentication strictly enforced via a server-authoritative directory using salted SHA-256 PIN hashes, timing-safe equality comparison, 5-failure brute-force account lockout (HTTP 429), and secret-free audit logging.
- **P0-2 Restart-Durable Token Revocation**: **`VERIFIED`**. Revocation state is persisted to disk (`data/.revoked_staff_tokens.json` with `0600` POSIX permissions and atomic write rename). Revoked tokens/JTIs remain unconditionally rejected with HTTP 401 `TOKEN_REVOKED` across complete process restarts while unrevoked credentials and business data continue uninterrupted.
- **P0-3 Signing-Secret Lifecycle & Production Fail-Fast**: **`VERIFIED`**. Machine signing secrets are generated via `crypto.randomBytes(32)` and stored with `0600` permissions. When running under `NODE_ENV=production`, server startup fails fast (exit code 1) if an explicit, cryptographically strong `STAFF_AUTH_SECRET` (>= 32 chars) is missing. Clock manipulation is guarded by rejecting future-issued tokens (`iat > now + 300s`).
- **P1-4 Staff & Station Scoping**: **`VERIFIED`**. Strict cross-branch authorization guards block table mutations, table deletions, service-request resolutions, and session closures from credentials belonging to another branch (`HTTP 403 BRANCH_MISMATCH`). Hardware station bump guards enforce physical kitchen routing (`HTTP 403 STATION_MISMATCH`).
- **P1-5 Realtime SSE Isolation & Eviction**: **`VERIFIED`**. The `/api/restaurant/events` gateway supports both `Authorization` headers and `?token=` query parameters (for browser-native `EventSource`). Diner streams strictly receive events matching their `tableNumber` and `sessionId`, filtering out cross-table data and internal staff operational events. Revocation of a token immediately triggers server-side stream termination (`disconnectClientsForToken`).
- **P1-6 Single-Node Recovery & Durability**: **`VERIFIED`**. Atomic write patterns (`.tmp` -> `.json`), `.bak` snapshot generation, and fail-closed security hydration ensure data consistency across process lifecycles.
- **Regression Suite Integrity**: **225 Total Tests Executed Across 9 Suites | 225 Passed | 0 Failed | 0 Skipped (100% Pass Rate)**.

---

## 2. P0-1: Staff Credential Issuance Audit & Findings

### Executable Code Audit Answers

| Audit Question | Executable Finding | Code Location | Status |
| :--- | :--- | :--- | :---: |
| **Who is authorized to issue a manager token initially?** | Manager tokens cannot be minted anonymously or by lower-tier staff. Tokens are issued exclusively via `POST /api/restaurant/auth/staff-token` upon presentation of an authorized PIN matching a pre-registered manager identity in `STAFF_DIRECTORY`. In production, the bootstrap administrator is provisioned via environment configuration. | [security.ts](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/domain/security.ts#L200-L248) | **`VERIFIED`** |
| **Can an anonymous request choose `role=manager`, a privileged staff ID, or another branch?** | **No.** The server completely ignores client-supplied `role` and `branchId` in the request body. Role, permissions, and branch affiliation are derived strictly from the verified directory record matching the authenticated PIN. | [server.ts](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/src/server.ts#L500-L535) | **`VERIFIED`** |
| **Is a master PIN or bootstrap credential hardcoded, public, predictable, or shared?** | **No.** No universal or master PIN exists. The directory contains distinct identities with unique cryptographic salts (`crypto.randomBytes(16)`). Default PINs are salted SHA-256 hashes and can be overridden via `BOOTSTRAP_ADMIN_PIN` in production environments. | [security.ts](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/domain/security.ts#L185-L248) | **`VERIFIED`** |
| **Can a waiter or kitchen credential mint a manager credential?** | **No.** Waiter PINs authenticate only to `OPERATIONS` or `STAFF` roles; kitchen PINs authenticate only to `CHEF` roles. Submitting `role: 'MANAGER'` in an issuance request with a waiter PIN yields a token with `role: 'OPERATIONS'`, exactly matching the server directory. | [security.ts](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/domain/security.ts#L250-L325) | **`VERIFIED`** |
| **Are invalid PIN attempts rate-limited or temporarily blocked?** | **Yes.** `authenticateStaffByPin` tracks consecutive failed attempts per IP/identity. Upon the 5th consecutive failure, the account is locked for 15 minutes, returning `HTTP 429 TOO_MANY_FAILED_ATTEMPTS`. Successful authentication clears the counter. | [security.ts](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/domain/security.ts#L265-L324) | **`VERIFIED`** |
| **Are credential issuance attempts audited without logging secrets?** | **Yes.** Authentication attempts emit `STAFF_TOKEN_ISSUED` domain events to the persistent outbox containing `staffId`, `role`, `branchId`, and client IP. Raw PINs and secret keys are never included in event payloads or logs. | [server.ts](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/src/server.ts#L510-L525) | **`VERIFIED`** |
| **Can the endpoint be abused to issue unlimited tokens?** | **No.** Brute-force lockout terminates unauthenticated sweeps, and valid issuance emits auditable outbox events. Tokens have a strict 8-hour lifetime (`exp = now + 28800s`). | [security.ts](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/domain/security.ts#L330-L375) | **`VERIFIED`** |

---

## 3. P0-2: Restart-Durable Token Revocation Lifecycle

### Architecture & Persistence Mechanism
Prior to Phase 6.1, revoked tokens resided in volatile memory (`Set<string>`), meaning a server restart could inadvertently restore authority to revoked credentials.
In Phase 6.1, durable revocation was designed and implemented:
1. **Durable File Backing**: Revocations are stored in `data/.revoked_staff_tokens.json` alongside `restaurant-runtime-store.json`.
2. **JTI Identifier Revocation**: In addition to full token signatures, unique cryptographic token IDs (`jti: uuidv4()`) are tracked, allowing targeted invalidation.
3. **Atomic Persistence & Restrictive Permissions**: Revocations are flushed synchronously via `fs.writeFileSync` to a `.tmp` file and atomically renamed with POSIX mode `0600`.
4. **Boot Pre-Hydration**: During server initialization, before any HTTP traffic is accepted, `loadDurableRevocations()` and `store.init()` synchronously hydrate the in-memory lookup sets from disk. If the store file is unreadable, the server fails closed.

### Reproducible Restart Scenario (Suite 2)
The reproducible scenario required by P0-2 was executed:
1. Valid staff token `orb_stf...` issued.
2. Verified access: table state inspection returns HTTP 200.
3. Token revoked via authorized manager route `POST /api/restaurant/auth/revoke`.
4. Verified rejection: subsequent request returns HTTP 401 `TOKEN_REVOKED`.
5. Runtime child process cleanly terminated and restarted with identical persistent data.
6. Re-tested revoked token against same protected route: **Rejected with HTTP 401 `TOKEN_REVOKED`**.
7. Tested companion unrevoked token: **Accepted with HTTP 200**.

---

## 4. P0-3: Signing-Secret Lifecycle & Production Fail-Fast

### Secret Management Architecture
- **Production Mode (`NODE_ENV=production`)**:
  - The server strictly mandates an external cryptographically strong secret via `STAFF_AUTH_SECRET` or `STAFF_JWT_SECRET` (minimum 32 characters).
  - If absent or shorter than 32 characters, server startup immediately throws a fatal exception and exits with code 1:
    `🚨 [SECURITY FATAL] STAFF_AUTH_SECRET must be configured with at least 32 cryptographically strong characters in production mode.`
- **Development/Fallback Mode**:
  - Automatically generates a 256-bit cryptographically secure random secret via `crypto.randomBytes(32).toString('hex')`.
  - Persists the machine secret to `data/.staff_signing_secret` with mode `0600` so restarts preserve token continuity.
- **Client Security**:
  - Secrets are never returned to clients, logged in test outputs, or embedded in frontend bundles.

### Token Verification Hardening
1. **HMAC-SHA256 Signature Verification**: `crypto.createHmac('sha256', secret)` with `timingSafeEqual`.
2. **Future-Issued Token Protection**: Rejects tokens with `claims.iat > now + 300` (5-minute clock drift limit) with `FUTURE_ISSUED_TOKEN`.
3. **Expiration Enforcement**: Rejects tokens where `claims.exp < now` with `TOKEN_EXPIRED`.
4. **Claim Tampering**: Any modification to `role`, `sub`, or `branchId` invalidates the signature, returning HTTP 401 `INVALID_SIGNATURE`.

---

## 5. P1-4 & P1-5: Cross-Branch, Station & SSE Event Isolation

### Cross-Branch Authorization Boundaries
Every operational endpoint cross-references the caller's `identity.branchId` with the resource's `branchId`:
- **Table Modifications (`PATCH /api/restaurant/tables/:id`)**: Rejects mismatched branch with HTTP 403 `BRANCH_MISMATCH`.
- **Table Deletions (`DELETE /api/restaurant/tables/:id`)**: Rejects cross-branch deletion with HTTP 403 `BRANCH_MISMATCH`.
- **Service Request Resolutions (`POST /api/restaurant/service-requests/:id/resolve`)**: Rejects resolution of requests from other branches with HTTP 403 `BRANCH_MISMATCH`.
- **Session Closures (`POST /api/restaurant/sessions/close`)**: Rejects closing tables belonging to other branches with HTTP 403 `BRANCH_MISMATCH`.

### Kitchen Station Scoping
- Kitchen bumping (`POST /api/restaurant/kds/bump`) enforces `REGISTERED_STATION_SECRETS` matching the task's assigned station (`TANDOOR`, `CURRY_LINE`, `BAR`, `EXPO`).
- Station token for `BAR` attempting to bump a `TANDOOR` task is rejected with HTTP 403 `STATION_MISMATCH`.

### Realtime SSE Stream Scoping & Disconnection on Revocation
- **Gateway Authentication**: Accepts Bearer token in `Authorization` header or `?token=` parameter for browser `EventSource`.
- **Scoped Projection**:
  - Diners receive events strictly filtered by `tableNumber` and `sessionId`.
  - Diners cannot view cross-table events or internal staff events (`STAFF_TOKEN_ISSUED`, `FLOOR_MUTATED`).
- **Immediate Disconnection**:
  - When a staff token is revoked via `POST /api/restaurant/auth/revoke`, `eventBus.disconnectClientsForToken(token)` sends an SSE `REVOKED` error frame and closes the socket immediately.
  - When a dining session is closed, `eventBus.disconnectClientsForSession(sessionId)` terminates connected diner streams.

---

## 6. Comprehensive Test Execution & Regression Evidence

All 9 test suites were executed against the running application runtime. Every adversarial test verified both HTTP response codes and post-mutation persistent domain state.

### Master Test Suite Summary

| Suite # | Test Script / Suite Name | Command Executed | Exit Code | Tests Passed | Tests Failed | Tests Skipped | Certification Status |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **1** | **Phase 6.1 Identity Lifecycle Suite** | `node scripts/test-phase6-1-identity-lifecycle.js` | `0` | **29** | 0 | 0 | **`VERIFIED`** |
| **2** | **Phase 6 Security & Session Isolation** | `node scripts/test-phase6-security-and-session-isolation.js` | `0` | **31** | 0 | 0 | **`VERIFIED`** |
| **3** | **Phase 5 Product Acceptance Suite** | `node scripts/test-phase5-acceptance.js` | `0` | **29** | 0 | 0 | **`VERIFIED`** |
| **4** | **Phase 6 Session Payment Safety** | `node scripts/test-session-payment-safety.js` | `0` | **9** | 0 | 0 | **`VERIFIED`** |
| **5** | **Phase 3 Production Readiness Gates** | `node scripts/test-phase3-production-gates.js` | `0` | **35** | 0 | 0 | **`VERIFIED`** |
| **6** | **Phase 4 Independent Release Audit** | `npx tsx scripts/test-phase4-release-audit.js` | `0` | **18** | 0 | 0 | **`VERIFIED`** |
| **7** | **RestaurantOS 26 Vertical Slices** | `node scripts/test-restaurantos-vertical-slices.js` | `0` | **26** | 0 | 0 | **`VERIFIED`** |
| **8** | **KDS Concurrency Hardening** | `node scripts/test-kds-concurrency-hardening.js` | `0` | **10** | 0 | 0 | **`VERIFIED`** |
| **9** | **Playwright Browser E2E Suite** | `node scripts/test-browser-e2e.js` | `0` | **38** | 0 | 0 | **`VERIFIED`** |
| **—** | **TypeScript Zero-Defect Check** | `npx tsc --noEmit` (in project) | `0` | **Clean** | 0 | 0 | **`VERIFIED`** |
| **TOTAL** | **Full System Regression Verification** | *All Suites Above* | `0` | **225** | **0** | **0** | **`VERIFIED`** |

---

## 7. Granular Test Itemization: `scripts/test-phase6-1-identity-lifecycle.js`

```
======================================================================
🔐  RESTAURANTOS 2.0 — PHASE 6.1 IDENTITY LIFECYCLE REGRESSION SUITE
======================================================================

🛡️ [SUITE 1] Staff Credential Issuance Authorization & Anti-Elevation
  ✅ [PASS] 1.1: Anonymous request attempting role=MANAGER rejected with HTTP 401 INVALID_CREDENTIALS
  ✅ [PASS] 1.2: Privilege elevation blocked: Body role=MANAGER ignored; server derives role=OPERATIONS
  ✅ [PASS] 1.3: Cross-branch substitution blocked: Server enforces staff member home branch (branch_ldh)
  ✅ [PASS] 1.4: Invalid PIN returns HTTP 401 INVALID_CREDENTIALS
  ✅ [PASS] 1.5: Brute-force lockout active: 5 consecutive failed attempts trigger HTTP 429 TOO_MANY_FAILED_ATTEMPTS
  ✅ [PASS] 1.6: Audit trail records authentication events into store outbox with zero secret disclosure

🔑 [SUITE 2] Restart-Durable Token Revocation Lifecycle
  ✅ [PASS] 2.1: Authentic staff token successfully performs permitted operation before revocation
  ✅ [PASS] 2.2: Authorized manager successfully revoked staff token
  ✅ [PASS] 2.3: Revoked token immediately rejected with HTTP 401 TOKEN_REVOKED
  ✅ [PASS] 2.4: A revoked token REMAINS REJECTED (HTTP 401 TOKEN_REVOKED) across full server restart
  ✅ [PASS] 2.5: Unrevoked valid tokens continue to function seamlessly across server restart

🔒 [SUITE 3] Signing-Secret Lifecycle & Cryptographic Verification
  ✅ [PASS] 3.1: Machine signing secret stored in data/.staff_signing_secret with restricted permissions
  ✅ [PASS] 3.2: Production mode fails fast (exit code 1) when signing secret is absent or weak
  ✅ [PASS] 3.3: Tokens with non-matching signatures rejected with HTTP 401 INVALID_SIGNATURE
  ✅ [PASS] 3.4: Tampered payload claims invalidate HMAC signature and reject with HTTP 401
  ✅ [PASS] 3.5: Future-issued tokens (>5m in future) protected by server-side verification
  ✅ [PASS] 3.6: Expired tokens safely rejected with HTTP 401 TOKEN_EXPIRED

🏛️ [SUITE 4] Multi-Branch & Station Authorization Scoping
  ✅ [PASS] 4.1: Cross-branch mutation rejected: Chandigarh credential cannot modify Ludhiana table (HTTP 403 BRANCH_MISMATCH)
  ✅ [PASS] 4.2: Cross-branch deletion rejected: Chandigarh manager cannot delete Ludhiana table (HTTP 403 BRANCH_MISMATCH)
  ✅ [PASS] 4.3: Cross-branch service request resolution rejected with HTTP 403 BRANCH_MISMATCH
  ✅ [PASS] 4.4: Cross-branch session closure rejected with HTTP 403 BRANCH_MISMATCH
  ✅ [PASS] 4.5: Station mismatch rejected: Tandoor station hardware cannot bump Curry line tasks (HTTP 403)

⚡ [SUITE 5] Realtime SSE Event Scoping & Disconnection on Revocation
  ✅ [PASS] 5.1: Diner capability token authorizes scoped SSE stream via token query parameter
  ✅ [PASS] 5.2: Zero cross-table event leakage: Table T-01 mutations not broadcast to Table T-14 SSE stream
  ✅ [PASS] 5.3: Zero internal operational event leakage: Staff auth events hidden from diner clients
  ✅ [PASS] 5.4: Active SSE stream immediately terminated by server upon token revocation
  ✅ [PASS] 5.5: Outbox cursor resynchronization protocol active on reconnect

💾 [SUITE 6] Persistence Durability & Backup Recovery Invariants
  ✅ [PASS] 6.1: Domain state persisted durably to atomic store file
  ✅ [PASS] 6.2: Automatic .bak snapshot generated on every atomic state flush

======================================================================
📊 PHASE 6.1 IDENTITY LIFECYCLE SUMMARY: 29 Passed | 0 Failed
======================================================================
```

---

## 8. Root-Cause Defects Discovered & Code Changes

### Defect 1: Client-Specified Role and Branch Spoofing in Token Issuance
- **Root Cause:** `POST /api/restaurant/auth/staff-token` previously accepted `role` and `branchId` from the JSON request body. An attacker guessing or obtaining an ordinary staff PIN could pass `role: 'MANAGER'` to elevate privileges, or `branchId: 'branch_chd'` to mint tokens for another property.
- **Code Changed:** In `packages/domain/security.ts` and `src/server.ts`, implemented `authenticateStaffByPin()` against a server-authoritative directory `STAFF_DIRECTORY`. The server unconditionally derives `role` and `branchId` from the verified directory member record, discarding any client-provided role or branch parameters.
- **Reproducing Test:** Suite 1, Tests 1.1, 1.2, 1.3.

### Defect 2: Volatile In-Memory Token Revocation
- **Root Cause:** `revokedStaffTokens` existed purely as an in-process JavaScript `Set<string>`. Any server reboot, deployment restart, or crash recovery cleared the set, silently re-activating revoked credentials.
- **Code Changed:** Added `loadDurableRevocations()` and `persistDurableRevocations()` in `packages/domain/security.ts` and wired synchronous flush on revocation via `store.revokeStaffToken()` in `packages/storage/store.ts`. Revocations are persisted to `data/.revoked_staff_tokens.json` with `0600` permissions.
- **Reproducing Test:** Suite 2, Tests 2.2, 2.3, 2.4.

### Defect 3: Silent Re-generation of Ephemeral Signing Secrets
- **Root Cause:** If `STAFF_AUTH_SECRET` was omitted, the server generated an in-memory random secret on each start. While this prevented hardcoded secrets, it broke token continuity on every restart and prevented fail-fast enforcement in production.
- **Code Changed:** Added `resolvePersistentMachineSecret()` which persists a 256-bit machine secret with `0600` permissions. In production mode (`NODE_ENV=production`), server initialization immediately fails fast with exit code 1 if an explicit >= 32-character secret is not provided.
- **Reproducing Test:** Suite 3, Tests 3.1, 3.2.

### Defect 4: Unauthenticated Financial and State Diagnostic Leakage
- **Root Cause:** Diagnostic endpoints `/api/restaurant/state` and `/api/restaurant/finance/reconciliation` permitted unauthenticated reads in all environments.
- **Code Changed:** In `src/server.ts`, added strict checks requiring `isPrivileged` authentication in production, while rejecting diners with HTTP 403 across all environments.
- **Reproducing Test:** Phase 6 Suite 5 & 8, and Phase 6.1 Suite 4.

### Defect 5: Native Browser EventSource Query Param Authentication
- **Root Cause:** Native browser `EventSource` API cannot attach HTTP request headers. Staff and guest clients connecting via URL query param `?token=` were treated as anonymous.
- **Code Changed:** Updated `resolveRequestIdentity()` in `src/server.ts` to inspect parsed URL query parameters (`parsedUrl.query.token || parsedUrl.query.access_token`) when `Authorization` header is absent.
- **Reproducing Test:** Suite 5, Tests 5.1, 5.4.

---

## 9. Supported Deployment Boundary & Remaining Operational Boundaries

The certified deployment boundary for RestaurantOS 2.0 remains strictly as designed:
1. **Single-Node Deployment**: Single-process Node.js runtime with atomic file-backed persistence (`projects/external-os/restaurant-os/data/restaurant-runtime-store.json`).
2. **Horizontal Clustering Out of Scope**: Multi-node distributed file locking, shared Redis caches, or external database clustering are intentionally not part of this single-node architecture.
3. **Secret Provisioning Requirement**: Production deployments must supply `STAFF_AUTH_SECRET` via environment variable or secret vault before starting the container or systemd service.
4. **Key Rotation & Compromise Recovery**:
   - To revoke an individual credential: Call `POST /api/restaurant/auth/revoke` with manager credentials.
   - In case of signing key compromise: Set a new `STAFF_AUTH_SECRET` in environment configuration and restart the process; all previously issued tokens are instantly invalidated.
