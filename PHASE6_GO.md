# Phase 6 GO: Launch readiness and paid pilot (HospitalOS + RestaurantOS)

From the technical lead. Base: PR #9 head **51c4f44** (Phases 1–5 accepted).

**Goal:** a hospital or restaurant owner can sign up, verify email, choose a plan, pay through Razorpay, create their business in under 2 minutes, invite staff, see usage and invoices, export or delete their data, and the system runs safely in production with backups, monitoring and runbooks.

Tested reference code is in `orbitox-phase6-reference-pack.zip`. Port the behaviour, keep the tests, and adapt names to the repo.

| Reference | What it proves | Result |
|---|---|---|
| `sql/001_accounts_billing.sql` + `test_accounts_billing.sh` | case-insensitive unique email; an organisation always keeps an OWNER, even under a concurrent demote race; tokens are single-use, purpose-bound and expiring (10 parallel consumers → 1 wins); invites cannot grant OWNER; one live subscription per tenant and plugin; Razorpay plan ids must be mapped; out-of-order webhook events are ignored | 24/24 on PostgreSQL 16 |
| `ts/src/razorpay-billing.ts` + `test/billing.test.ts` | checkout signature over **our stored** subscription id; webhook signature over the raw body; decisions never read tenant or plan from `notes`; unknown subscriptions are never acted on; stale events ignored; grace start is fixed (retries cannot extend it); halted is at least READ_ONLY; a cancel keeps access until the period ends; a daily sweep advances grace | 15/15 (with token tests), strict tsc clean |
| `ts/src/account-tokens.ts` | 256-bit tokens, hash-only storage, per-purpose lifetimes, https links with the token in the URL fragment, a uniform "if an account exists" response | included in the 15 |
| `ops/verify-restore.sh` | dump → restore into a scratch database → compare row counts, RLS flags, policies, triggers and migration history; refuses to report OK on empty data | OK on the 14-table HMS database (21 policies, 14 forced-RLS tables); **negative control:** losing FORCE RLS in the restored copy → MISMATCH, exit 1 |

---

## Findings in the current code (fix inside this phase)

- **F6-1 HIGH: the Razorpay webhook trusts `notes`.**
  - `app/api/v1/billing/webhook/razorpay/route.ts` reads `tenantId` and `planId` from `entity.notes` (`notes.planId` even overrides the entity's real `plan_id`), guesses the plugin from the plan-name prefix, and falls back to `'@orbitox/hms'`.
  - Anyone who can get a cheap subscription created with notes naming another tenant or a pro plan would change that tenant's entitlements.
  - **Fix:** tenant, plugin and plan come only from our `BillingSubscription` row (written when **our** server creates the subscription) and from `BillingPlanMap` (Razorpay plan id → internal plan). No prefix guessing, no plugin default. Unknown subscription ids are stored, alerted on, and never acted on.
- **F6-2 HIGH: wrong failure events.**
  - Grace is driven by `payment.failed`. For subscriptions, Razorpay signals failed renewals with **`subscription.pending`** (a charge failed and Razorpay retries) and **`subscription.halted`** (all retries failed).
  - Also handle `authenticated`, `activated`, `charged`, `resumed`, `paused`, `cancelled`, `completed` and `updated` as in `decide()`.
  - Grace must advance through a daily sweep even if no further events arrive.
- **F6-3 MEDIUM:** `webhookLedger` (an in-memory Map) is still written next to the durable ledger. Remove it.
- **F6-4 HIGH: the control plane has no operator accounts.** It is protected by one shared `ORBITOX_ADMIN_TOKEN`. That means no per-person accountability, no MFA, and no way to remove one person's access without rotating the token for everyone. Real operator accounts are required before launch (6A).

---

## 6A Operator accounts (replace the shared admin token for people)
- Operator users with **TOTP MFA required**, plus single-use backup codes (stored hashed).
- Sessions: httpOnly, Secure, SameSite=Lax cookies; 12-hour absolute and 30-minute idle lifetime; revocable; re-authentication for dangerous actions (suspend a tenant, change plans or prices, rotate keys, force a lease).
- Roles: `PLATFORM_OWNER`, `OPERATOR`, `SUPPORT_READONLY`, `BILLING`. Every admin route declares its required role, and a structure test fails if one does not.
- Every audit event records the operator's user id (Phase 4 item 7 already stores actors).
- `ORBITOX_ADMIN_TOKEN` stays only for automation, as a scoped service credential that can be rotated. Document which routes accept it.
- Reuse the lockout rules from HospitalOS staff login (24-hour decay, record only real wrong passwords, uniform 401).

## 6B Customer accounts
- **Data model:** reuse the platform organisation as the customer organisation. Add `CustomerUser`, `CustomerMembership` and `AccountToken` as in the reference SQL (A1–A3).
- **Signup:** email + password → verification email (24-hour token) → the email must be verified before creating tenants or paying.
- **Passwords:** scrypt or argon2id; minimum 12 characters; check against a breached-password list (k-anonymity range query, or a local top-100k list); never logged.
- **Login:** the same lockout logic as staff. Optional TOTP for every user. **TOTP is required for OWNER and ADMIN of HospitalOS organisations**, because they can reach patient data.
- **Password reset:** a 30-minute token. Successful use revokes all sessions.
- **Invites:**
  - 7-day token, role ADMIN, MEMBER or BILLING, never OWNER.
  - Ownership transfer is a separate action, confirmed by the current owner with re-authentication.
  - If the invited email already has an account, accepting the invite adds a membership; it never creates a second user.
- **Sessions:** cookie-based for the web dashboard, with CSRF protection on every state-changing request (double-submit token or SameSite=strict plus Origin check). API keys stay the machine path.
- **Rate limits** (Step 4 buckets) on signup, login, reset and invite, per IP and per email.
- **Responses** never reveal whether an email exists (uniform 202).

## 6C Billing with Razorpay subscriptions
1. **Plan mapping:** `BillingPlanMap` holds each internal plan with its Razorpay `plan_id`, amount and period. A price change means a new Razorpay plan id; rows are never edited in place.
2. **Checkout:**
   - Our server creates the Razorpay subscription through the API (owner's live and test keys from the secret store) and writes the `BillingSubscription` row **before** returning the `subscription_id` to the browser.
   - The browser opens Razorpay Checkout with that `subscription_id`.
   - On success, our server verifies `HMAC(razorpay_payment_id + "|" + stored subscription_id, key_secret)` with `verifyCheckoutSignature`, then waits for the webhook (the source of truth) before activating.
3. **Webhook:** raw-body signature check, durable ledger (Phase 3), `decide()` mapping, apply only if `event.created_at > lastEventAt`, all in one transaction with the entitlement change and an outbox row.
4. **Daily grace sweep** (maintenance job): `sweepGrace()` moves installations to READ_ONLY or SUSPENDED per the plan's grace policy. Every transition emails the owner and billing contacts.
5. **Cancel and change plan** from the dashboard go through the Razorpay API. A cancel takes effect at the period end; an upgrade is immediate, through a new subscription or Razorpay's update API, the owner's choice.
6. **Invoices:** show Razorpay's invoices and payment history in the dashboard. GST invoicing is an owner and legal decision (see Decisions).
7. **Tests:** Razorpay test mode in a manual staging check. CI uses recorded payloads signed with a random secret. Cover each event type, out-of-order delivery, duplicates, an unknown subscription, forged notes, a forged signature, and a grace timeline with a test clock.

## 6D Customer dashboard (Next.js, behind customer sessions)
- **Organisation:** members and roles, invites, ownership transfer.
- **Tenants:** create (reuse the Phase 4 wizard), list, status, per-plugin plan and state, suspend reason, retry for failed provisioning.
- **Usage vs quota** per tenant and plugin (from the plan and grants), with a warning at 80%.
- **API keys:** create (shown once), list with masked display, rotate with a grace period, revoke.
- **Billing:** current plan, next charge, invoices, update the payment method (Razorpay), cancel.
- **Audit log:** filtered to the customer's own organisation. No platform-internal events.
- **Data:** request an export, request deletion (6F).
- **Every page and API** is tenant-scoped through the customer session plus membership role; the cross-tenant generator is extended to dashboard routes.

## 6E Transactional email
- A provider adapter interface (owner chooses the provider). Messages are queued through the outbox and sent by a worker with retries; never sent inside a request transaction.
- **Templates:** verify email, reset password, invite, new-login alert, payment failed (grace started), READ_ONLY notice, SUSPENDED notice, plan changed, export ready, deletion scheduled and completed, tenant ready.
- **No PHI** in any email.
- Sending domain with SPF, DKIM and DMARC (owner sets up DNS). Record bounces and complaints, and stop sending to bounced addresses.

## 6F Data rights and DPDP readiness (engineering side)
Context: the DPDP Rules were notified on 13 Nov 2025. Most obligations apply from 13 May 2027. They require a detailed breach report to the Board within 72 hours, notice to affected people without delay, reasonable security safeguards (encryption, access control, monitoring, logs), and at least 1 year of log retention. For HospitalOS, the hospital is usually the data fiduciary and OrbitoX the processor, so build the tools a hospital needs to meet its own duties. Legal confirms the roles (Decisions).
- **Export:** an async job per tenant (all plugin data plus the audit trail) to an encrypted archive, behind a single-use signed download link valid for 24 hours. Owner role only, re-authentication required, audited.
- **Deletion:**
  - **Request:** owner role, re-authentication, a 30-day cooling-off period during which it can be cancelled.
  - **Execution:** then the plugin `deprovision` hooks run, data rows are deleted, installations are ARCHIVED, and keys and sessions are revoked. Platform audit and billing records required by law are kept.
  - **Proof:** a deletion certificate (what was deleted and when).
  - **Backups:** document how long data stays in backups (it ages out with retention).
- **Logs:** security and audit logs kept for at least 1 year, without PHI. Keep a test that scans logs for seeded patient names.
- **Breach runbook** (6H) with the 72-hour report template and the customer-notice template.

## 6G Production operations
1. **Environments:** staging and production as separate cloud accounts or projects, separate databases, separate secrets. Region: India, owner decision.
2. **Deploy:**
   - Build the Docker images in CI and sign them. Deploy with the platform the owner chooses.
   - Migrations run as a **separate job** with the owner role (`prisma migrate deploy` for the platform and for RestaurantOS) **before** the new app version starts. The app always runs as the restricted runtime roles.
   - Zero-downtime rolling deploy, with readiness gates on `/api/health` and `/healthz/ready`.
3. **Secrets:** all keys in a secret manager (no `.env` files on servers): peppers, bridge keys, grant private keys, PHI keys, webhook and Razorpay keys, database passwords. Startup refuses missing ones; this already exists, keep it.
4. **Backups:**
   - Managed PostgreSQL with point-in-time recovery (targets: **RPO ≤ 5 min, RTO ≤ 1 h**), plus a nightly logical dump to separate encrypted storage in another account.
   - **Weekly automated restore check** using `verify-restore.sh` against the latest backup, with an alert on failure.
   - Quarterly full restore drill, timed and written down.
   - This applies to the platform database and the RestaurantOS database.
5. **Monitoring and alerts:**
   - **Logs and request data:** structured JSON logs without PHI; per-request metrics (rate, errors, latency) per route.
   - **Alert on:**
     - health and readiness failures;
     - 5xx rate;
     - outbox lag (oldest pending message older than 60 s);
     - provisioning operations FAILED or PARTIAL;
     - grant fetch failures;
     - webhook signature failures and unknown subscriptions;
     - lockout spikes;
     - database connections and replication lag;
     - backup or restore-check failure;
     - certificate expiry under 14 days.
   - **Paging** to the owner's on-call channel, plus a public status page.
6. **Edge:** HTTPS only (HSTS), a WAF and rate limits in front of the platform and RestaurantOS, request size limits, and no direct database exposure.

## 6H Runbooks (written, then each one rehearsed on staging once)
- **Deploy and rollback,** including rolling back an app version without rolling back migrations (expand/contract rule).
- **Key rotation, one procedure per key:**
  - API pepper ring, with the per-pepper key count report;
  - bridge keys;
  - grant signing keys (JWKS overlap);
  - PHI keys (new active kid, then the reseal job);
  - Razorpay webhook secret;
  - database role passwords.
- **Restore from backup:** point-in-time and full restore.
- **Incident response and data breach:** containment, evidence, the 72-hour report, customer notice, post-mortem.
- **Tenant support actions:** suspend, resume, unlock a staff account, re-run failed provisioning.

## 6I Pre-launch security
- An independent penetration test on staging, the owner arranges it. Fix all high and critical findings before the pilot.
- Dependency audit in CI (`pnpm audit` or OSV) that fails on high or critical issues, an SBOM per image, and a container image scan.
- Confirm that all the "fail closed in production" checks hold in the real staging deployment, by starting it with each required secret removed, one at a time.

---

## Acceptance tests (CI on fresh PostgreSQL 16, unless marked staging)
1. End to end through the real server:
   - sign up, verify the email, log in;
   - create the organisation, then start checkout;
   - deliver a simulated signed `subscription.activated`, then create a HospitalOS tenant;
   - invite a member, who accepts and logs in;
   - get a 403 when the member tries an owner-only action.
2. **Billing:** forged notes change nothing; a forged signature → 401; an unknown subscription is not acted on; out-of-order and duplicate events; `pending` → day 7 READ_ONLY → day 30 SUSPENDED (test clock and sweep); `charged` restores access; `cancel` keeps access until the period ends.
3. **Account security:**
   - tokens are single-use under 10 parallel requests;
   - an expired or wrong-purpose token is refused;
   - an invite cannot grant OWNER;
   - the last owner cannot leave;
   - a password reset revokes sessions;
   - every responds-if-exists endpoint gives the same response;
   - CSRF is rejected without a token;
   - lockout uses the 24-hour decay.
4. **Operator MFA:** login without TOTP fails, a used backup code cannot be reused, and a dangerous action without re-authentication is refused.
5. **Dashboard:** the cross-tenant generator covers every dashboard API route (N of N).
6. **Data rights:** the export link is single use and expires; deletion can be cancelled during the cooling-off period; after execution no tenant rows remain, and the deletion certificate exists.
7. **Restore (staging):** `verify-restore.sh` passes on the latest backup, and the timed result is reported.
8. **Fail closed (staging):** removing each required secret one at a time causes a startup refusal. Report it as a table.

## Stop points and reporting
- **Stop for review after:**
  1. 6A–6B;
  2. 6C–6E;
  3. 6F–6I and the staging checks.
- **Every report:** every commit with its title, every security setting and its default when unconfigured, every migration added (never edit a pushed one), and the real CI run URL for the final commit.
- **Never** turn off a security control to make a test pass. Report the failure.

## Decisions for the owner (needed before or during 6G)
1. **Hosting and region:** India region recommended for health data; provider choice.
2. **Email provider and sending domain.**
3. **Razorpay:** live account activation, and whether upgrades replace the subscription or update it.
4. **GST:** whether OrbitoX issues its own GST invoices or relies on Razorpay's; your accountant decides.
5. **Legal:** controller or processor roles for HospitalOS and RestaurantOS customers, a data processing agreement template, privacy policy, terms, and the retention periods for deleted accounts. A DPDP review by counsel before real patient data.
6. **Penetration test vendor and date.**
7. **On-call:** who gets paged, and the status page provider.
