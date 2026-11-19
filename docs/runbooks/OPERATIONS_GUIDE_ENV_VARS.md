# ⚙️ OrbitoX Platform Operations & Environment Variables Guide

This operational manual documents all configuration parameters, environment variables, security constraints, and operational runbooks for production deployments of OrbitoX Platform.

---

## 1. Quick Verification

Before starting or deploying in production, run the automated environment validator:

```bash
node scripts/check-production-env.mjs
```

In production (`NODE_ENV=production` or unset), the control plane executes strict **fail-closed initialization** via `instrumentation.node.ts`. If any required secret is missing or under 32 characters, the process exits immediately at boot.

---

## 2. Environment Variables Reference

### A. Database Connectivity

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | **Yes** | Connection string for PostgreSQL (supports pooled connections e.g. PgBouncer) | `postgresql://user:pass@db.example.com:5432/orbitox?sslmode=require` |
| `DIRECT_URL` | Optional | Direct connection string bypassing pooler for Prisma migrations | `postgresql://user:pass@db.example.com:5432/orbitox` |

---

### B. Core Security & Authentication (Entropy Requirement: ≥ 32 chars)

| Variable | Required | Minimum Length | Description |
|----------|----------|----------------|-------------|
| `ORBITOX_ADMIN_TOKEN` | **Yes** | 32 chars | Automation-only service credential; never used for a person's browser session |
| `ORBITOX_ADMIN_TOKEN_SCOPES` | **Yes** | `METHOD:/path` | Comma-separated explicit method/path allowlist. No scopes means deny all; global `/*` is rejected. |
| `ORBITOX_RUNTIME_TOKEN` | **Yes** | 32 chars | Inter-service internal runtime communication and mesh synchronization token |
| `ORBITOX_CONTROL_SECRET` | **Yes** | 32 chars | HMAC signing secret for trusted internal principal token propagation |
| `ORBITOX_GUEST_SECRET` | **Yes** | 32 chars | Signing secret for ephemeral diner and guest session tokens |
| `ORBITOX_SERVER_PEPPERS` | **Yes** | Valid JSON | JSON map of `{id: secret}` for SHA-256 API key verifier hashing (min 32 chars per secret) |
| `ORBITOX_SERVER_PEPPER` | Legacy | 32 chars | Fallback single pepper if `ORBITOX_SERVER_PEPPERS` is not set |
| `ORBITOX_MFA_ENCRYPTION_KEY` | **Yes** | Base64, 32 bytes | AES-256-GCM key for operator and customer TOTP secrets |
| `ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY` | **Yes** | Base64, 32 bytes | AES-256-GCM key for single-use account links queued for email |
| `ORBITOX_PUBLIC_BASE_URL` | **Yes** | HTTPS URL | Canonical origin for verification, reset, and invite links |
| `ORBITOX_BREACHED_PASSWORD_API` | No | `on` or `off` | Defaults to `on`; uses the HIBP k-anonymity range API when reachable and falls back to the bundled SHA-1 hash list on outages. `off` enforces the bundled list only. Configure the log pipeline to page on JSON events with `event=account_security.breached_password_api_fallback` and `severity=HIGH`; the event is written to stderr whenever local-only enforcement is used. |
| `RAZORPAY_KEY_ID` | **Yes in production** | `rzp_test_*` or `rzp_live_*` | Public key id used by the subscription API and checkout client |
| `RAZORPAY_KEY_SECRET` | **Yes in production** | 32 chars | Secret key for authenticated Razorpay subscription API requests |
| `RAZORPAY_WEBHOOK_SECRET` | **Yes** | 32 chars | HMAC SHA-256 secret for authenticating incoming billing webhooks from Razorpay |
| `ORBITOX_EMAIL_PROVIDER` | **Yes in production** | `resend` | Development defaults to LogOnly; production currently requires Resend for delivery and webhook support |
| `ORBITOX_EMAIL_FROM` | **Yes in production** | Email address | Verified sending address for the configured provider |
| `ORBITOX_EMAIL_WEBHOOK_SECRET` | **Yes** | Resend `whsec_` signing secret | Resend/Svix key for authenticating raw bounce/complaint webhook requests |
| `RESEND_API_KEY` | **Yes in production** | Secret | Resend API key |
| `POSTMARK_SERVER_TOKEN` | Development/testing only | Secret | Postmark adapter token; production currently requires Resend |
| `OUTBOX_RELAY_DATABASE_URL` | **Yes in production** | `orbitox_outbox_relay` role | Dedicated process connection for the transactional email worker and platform outbox relay |

*Generate strong 32-character secrets using:*
```bash
openssl rand -hex 32
```
For AES keys, use `openssl rand -base64 32`.

### B.1 Operator and customer accounts

- People sign in at `/platform/login` with an operator account and TOTP or a single-use backup code. Sessions use `HttpOnly`, `Secure` in production, `SameSite=Lax` cookies with a 12-hour absolute lifetime and 30-minute idle lifetime.
- After applying the account migration, provision the first `PLATFORM_OWNER` from a secure shell with `MAINTENANCE_DATABASE_URL`, `ORBITOX_OPERATOR_INITIAL_EMAIL`, `ORBITOX_OPERATOR_INITIAL_PASSWORD`, and `ORBITOX_MFA_ENCRYPTION_KEY` set in the environment, then run `pnpm --filter web operator:bootstrap`. The command refuses runtime-role connections, prints the TOTP enrollment secret and backup codes once; transfer them to the operator securely and remove the bootstrap password from the shell environment.
- Operator roles are `PLATFORM_OWNER`, `OPERATOR`, `SUPPORT_READONLY`, and `BILLING`. Mutating admin APIs are role-gated; sensitive actions additionally require re-authentication within five minutes.
- Customer sessions use `HttpOnly`, `Secure` in production, `SameSite=Strict` cookies and require Origin validation plus a double-submit CSRF token for writes. Passwords require 12 characters and a breach check; MFA enrollment is mandatory for organization owners and admins.
- Customer verification/reset/invite tokens are 256-bit, hash-only in `AccountToken`, purpose-bound, single-use, and expire after 24 hours, 30 minutes, and 7 days respectively. Email payloads hold encrypted links until the transactional email worker is configured.
- The email worker runs separately from web requests: `pnpm --filter web email:worker`. Schedule it continuously or at short intervals using `OUTBOX_RELAY_DATABASE_URL`; it claims with `SKIP LOCKED`, retries at most five attempts with exponential backoff, and never logs message content.
- Schedule `pnpm --filter web billing:grace-sweep` daily with both `APP_DATABASE_URL` and `MAINTENANCE_DATABASE_URL`. The maintenance role owns a singleton lease; state transitions are applied by the runtime role so audit and entitlement outbox writes remain tenant-scoped.
- Direct payment-method updates are not available in the customer billing API. Razorpay's documented subscription API does not provide a direct payment-method update operation; do not present this as supported or substitute a plan change until a provider-supported customer authorization flow is approved.
- Configure Resend's bounce/complaint webhook to `/api/v1/customer/email/webhooks/resend` and copy its signing secret to `ORBITOX_EMAIL_WEBHOOK_SECRET`. The endpoint verifies the raw body with the `svix-id`, `svix-timestamp`, and `svix-signature` headers, including a five-minute timestamp window and durable event deduplication. Verify SPF, DKIM, and DMARC for the configured sending domain before enabling delivery.

---

### C. Cryptographic Grant & Manifest Signing (Ed25519)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `ORBITOX_GRANT_SIGNING_KEYS` | **Yes** | JSON map of `{kid: privateKeyPem}` for signing tenant grant tokens | `{"k1":"-----BEGIN PRIVATE KEY...-----"}` |
| `ORBITOX_GRANT_PRIVATE_KEY` | Legacy | Single Ed25519 PEM private key string | `-----BEGIN PRIVATE KEY...` |

---

### D. Healthcare PHI Field Encryption & Blind Indexing (AES-256-GCM)

| Variable | Required in Prod | Description |
|----------|------------------|-------------|
| `ORBITOX_PHI_KEYS` | **Yes** | JSON object mapping Key IDs to 32-byte Base64-encoded AES keys |
| `ORBITOX_PHI_ACTIVE_KID` | **Yes** | Active Key ID used for encrypting newly inserted PHI records |
| `ORBITOX_PHI_INDEX_KEY` | **Yes** | 32-byte Base64-encoded HMAC key for blind index derivation (searchable encryption) |

---

### E. Distributed Operation Leases & Crash Recovery

| Variable | Default (Prod) | Default (Test) | Description |
|----------|----------------|----------------|-------------|
| `OPERATION_LEASE_TTL_SECONDS` | `30` | `2` | Duration in seconds an active worker server holds a lease on a `PlatformOperation`. |
| `OPERATION_LEASE_HEARTBEAT_SECONDS` | `10` | `1` | Interval at which an active worker renews its lease during long-running workflows. |

**Concurrency Guarantee**:
- Exactly one worker can hold an active lease on a tenant provisioning workflow.
- If a server crashes or suffers hard shutdown (`SIGKILL`), its lease expires naturally within `OPERATION_LEASE_TTL_SECONDS`.
- Another booting worker or an explicit `POST /api/v1/operations/:id?action=retry` can then claim the lease without forced overrides.
- Explicit lease force (`$4 = true`) is strictly restricted to platform admins via `POST /api/v1/operations/:id?action=admin-force-lease`.

---

### F. Local Test-Harness Flags

> [!CAUTION]
> These flags are intended only for local standalone test harnesses. They never disable startup role checks; production database-role validation remains mandatory.

| Variable | Permitted Environments | Purpose |
|----------|------------------------|---------|
| `TEST_STEP5_DELAY_MS` | Loopback standalone test harness only | Injects artificial latency into step 5 of tenant provisioning to test concurrency / kill-and-resume. |
| `ORBITOX_TEST_STANDALONE` | Local standalone test harness only | Enables standalone test harness execution. |

---

### G. Ports & Networking

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3005` | Control plane HTTP port |
| `ORBITOX_CONTROL_PLANE_URL` | `http://127.0.0.1:3005` | Upstream control plane gateway URL used by plugins and worker bridges |
| `ORBITOX_RESTAURANT_URL` | `http://127.0.0.1:3940` | Hospitality runtime server URL |

---

## 3. Secret Scrubbing & Masking Rules

OrbitoX enforces zero-trust credential hygiene across all runtime components:

1. **API Keys**: Returned raw exactly once in the synchronous `202 Accepted` response. Never logged in terminal or stored in plaintext in the database.
2. **Log Masking**: Any API key printed in CLI or server logs is masked as:
   `orb_live_••••••••••••••••••••••••••••••••`
3. **Audit Trails**: Every platform mutation captures the authenticated `operatorId` (e.g. `key_live_...` or user email) without exposing raw tokens or secrets.
