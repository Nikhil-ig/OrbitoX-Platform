# Phase 6A–6B accepted. Phase 6C–6E GO (billing, customer dashboard, email)

From the technical lead. Base: `feat/compose-saas` at **3d9d6b0**.

## 1. Acceptance of 6A–6B

**CI:** [run #204](https://github.com/Nikhil-ig/OrbitoX-Platform/actions/runs/41678864465) for `3d9d6b0` is green. All 11 jobs ran, none skipped, and Docker image builds ran too (6m53s).

**Verified independently** on my own PostgreSQL 16, from a fresh database with all 26 migrations applied:

| Check | Result |
|---|---|
| Migration immutability (every round since a46bb68) | intact |
| Delete a user who still has memberships | refused (FK `NO ACTION`) |
| Remove or demote an organisation's only owner | refused (trigger) |
| Runtime role: INSERT, DELETE, or change role/status on `PlatformOperator` | permission denied |
| Runtime role: DELETE `CustomerUser` | permission denied |
| Audit role: any identity table | permission denied |
| Operator TOTP step sent as Prisma sends it (`bigint`), without a cast | fails, reproducing the CI error |
| The same step with the `::integer` cast: valid, reuse, older step, newer step | accepted, refused, refused, accepted |

**Confirmed in source review:**
- `ORBITOX_TEST_SKIP_ROLE_CHECK` is gone, and the startup role check fails closed.
- The fixed PHI development key is replaced by random keys, and production still refuses to start without real keys.
- The CI owner is created by the real `operator:bootstrap`, with its output kept out of the log.
- The no-token sweep classifies every customer-auth route explicitly, and unknown routes fail. Login and reset responses are the same for real and unknown accounts.
- The operator same-origin check compares against `ORBITOX_PUBLIC_BASE_URL` and fails closed when the Origin is missing or malformed.
- Admin pages redirect anonymous callers and API-scoped tokens to operator login (asserted as 307 → `/platform/login`, without following the redirect).

**CI evidence:** Phase 6 tests 9/9 (role boundaries 3/3, account auth 6/6, including operator TOTP login and replay through Prisma). Drift: `No difference detected.`

### Process notes (keep doing or start doing)
- Reports said "fixed" several times before CI had run on the commit. Keep reporting only what ran, as the last rounds did.
- **Run database-backed tests locally against PostgreSQL before committing.** Step 3 failed in CI four times running.
- Commit titles must describe the change. `79b776c` ("Implement code changes to enhance functionality and improve performance") does not.
- Pushing as `iiiawsedr` is still refused. The owner will push or grant Write access; don't try other identities.

---

## 2. Carry-overs from 6A–6B (do these first, in their own commit)
1. **Positive operator page check.** The smoke test now proves anonymous callers and tokens can't open operator pages, but nothing proves a real signed-in operator *can*. Add a smoke step that runs `operator:bootstrap`, completes MFA with a test secret, logs in, and gets 200 on `/platform`, `/platform/fleet` and `/platform/projects/{id}`.
2. **Organisation closure path.** The "keep one owner" trigger blocks deleting an organisation, even on purpose (verified: `DELETE FROM "PlatformOrganization"` → "must keep at least one OWNER"). 6F deletion needs this.
   - In a **new** migration, let the trigger permit deletion only when the organisation row itself is being deleted in the same transaction. Use a transaction-local setting such as `orbitox.closing_org = '<id>'` that only a maintenance-role function can set.
   - Never allow it by disabling the trigger, and never let the runtime role call that function.
   - Tests:
     - closing an organisation removes its memberships;
     - removing the last owner without closing is still refused;
     - the runtime role cannot set the setting or call the function.
3. **GitHub Actions on Node 20 are deprecated** (warnings on every job). Bump `actions/checkout`, `actions/setup-node` and `pnpm/action-setup` to versions that run on Node 24, and pin `runs-on` to `ubuntu-24.04`, not `ubuntu-latest` (which is moving to Ubuntu 26). Separate commit.

---

## 3. 6C Billing with Razorpay subscriptions

Reference: `orbitox-phase6-reference-pack.zip` → `ts/src/razorpay-billing.ts`, `ts/test/billing.test.ts` (15/15), `sql/001_accounts_billing.sql` (24/24). Port the behaviour, keep the tests, and adapt names to the repo.

### 3.1 Still open in the code at 3d9d6b0 (verified)
`app/api/v1/billing/webhook/razorpay/route.ts`:
- **F6-1 HIGH:**
  - lines 38–41 read `tenantId`, `pluginId` and `planId` from `notes`, and `notes.planId` overrides the real `plan_id`;
  - lines 57 and 62 fall back to `'@orbitox/hms'`.
- **F6-2 HIGH:** line 78 drives grace from `payment.failed`.
- **F6-3 MEDIUM:** lines 51 and 128 still write `webhookLedger`, an in-memory Map from `lib/razorpay-webhook.ts`.

### 3.2 Data (new migrations only)
- **`BillingPlanMap`:**
  - columns `razorpayPlanId` (PK), `pluginId`, `internalPlanId`, `amountMinor`, `currency`, `period`, `interval`, `active`, `createdAt`;
  - a price change means a new row with a new Razorpay plan id;
  - rows are never updated except `active`, so runtime gets `SELECT` and `UPDATE("active")` only.
- **`BillingSubscription`:**
  - columns `razorpaySubscriptionId` (PK), `organizationId`, `tenantId`, `pluginId`, `razorpayPlanId` (FK to the plan map), `status`, `currentStart`, `currentEnd`, `graceStartedAt`, `lastEventAt`, `cancelAtPeriodEnd`, `createdAt`, `updatedAt`;
  - a partial unique index: one live subscription per `(tenantId, pluginId)` where status is in (`created`, `authenticated`, `active`, `pending`, `halted`, `paused`);
  - the row is written by **our** server *before* the subscription id is returned to the browser.
- **`BillingUnknownEvent`:** events for subscription ids we didn't create. Stored and alerted on, never acted on.
- **Runtime grants:**
  - no `DELETE` on any billing table;
  - `BillingSubscription` UPDATE limited to `status`, `currentStart`, `currentEnd`, `graceStartedAt`, `lastEventAt`, `cancelAtPeriodEnd`, `razorpayPlanId` and `updatedAt`;
  - `tenantId`, `pluginId` and `organizationId` are never updatable.
  - Add these to `phase6-role-privileges.test.ts`.

### 3.3 Checkout
1. `POST /api/v1/customer/billing/checkout`:
   - requires a customer session, OWNER or BILLING role on the organisation, and CSRF;
   - input is `{tenantId, razorpayPlanId}`, validated against `BillingPlanMap` (`active`) and the tenant's organisation.
2. The server creates the subscription through the Razorpay API, using keys from the secret store, with `notes` for display only. In the **same transaction** as recording the result, it inserts `BillingSubscription` (status `created`). It then returns `{subscriptionId, keyId}`.
3. The browser opens Razorpay Checkout with that `subscription_id`.
4. `POST /api/v1/customer/billing/checkout/confirm` checks `verifyCheckoutSignature(paymentId, storedSubscriptionId, signature)`. A valid signature marks the subscription "awaiting webhook". **It does not activate anything.** The webhook is the source of truth.
5. Use one idempotency key per checkout attempt (durable `TenantIdempotencyKey`), so a double click creates one subscription.

### 3.4 Webhook (rewrite the route)
1. Verify the HMAC over the **raw body** before parsing, using `verifyWebhookSignature`. If it fails, return 401 and increment the alert metric.
2. Record the event in the durable ledger, keyed on the event id. A duplicate returns 200 and does nothing else.
3. Look up `BillingSubscription` by `entity.id`. If it is missing, write `BillingUnknownEvent`, return 200, alert, and do nothing else.
4. Run `decide(event, row, policy)`. Apply only if `event.created_at > lastEventAt`. In **one transaction**: the subscription update, the installation status change and entitlement revision bump, the audit row, and the outbox rows (the entitlement grant refresh, and email in 6E).
5. **Plan changes:** take `plan_id` from the subscription entity and map it through `BillingPlanMap`. An unmapped plan is stored, alerted on and not applied.
6. Delete `webhookLedger` and any other in-memory state.

### 3.5 Grace and lifecycle
- **Policy per plan:** READ_ONLY after 7 days, SUSPENDED after 30. The defaults live in config, not code.
- **Event handling:**
  - `pending` starts grace once; retries never extend it;
  - `halted` → at least READ_ONLY;
  - `charged` and `resumed` clear grace → ACTIVE;
  - `cancelled` keeps access until `currentEnd`, then SUSPENDED;
  - `completed` → SUSPENDED at `currentEnd`;
  - `paused` → READ_ONLY.
- **Daily sweep job** (maintenance role, leased so only one runner) calls `sweepGrace()`. Every state transition writes audit plus an outbox email.
- **READ_ONLY has to be enforced.** Plugin write routes must refuse with 402 (`PAYMENT_REQUIRED`, body says read-only) while reads keep working. Put this in the guard (`withApiGuard`/entitlement check), not in each route. Add one test per plugin (HMS and RestaurantOS): a write in READ_ONLY → 402, a read → 200.

### 3.6 Cancel and change plan
- **Cancel:** OWNER, re-authentication, CSRF. Calls the Razorpay cancel-at-cycle-end API and sets `cancelAtPeriodEnd`. Access continues until `currentEnd`.
- **Upgrade or downgrade:** the owner hasn't decided yet between updating the existing subscription and creating a new one. Put both behind one interface (`changePlan(subscription, newPlanId)`). Implement **update** first, through Razorpay's subscription update API. Either way the plan only changes when the webhook arrives, not when the API call returns.

### 3.7 Billing tests (CI uses recorded payloads signed with a random per-run secret)
Cover every event type in `decide()`, then:
- out-of-order delivery;
- a duplicate event id;
- an unknown subscription;
- notes naming another tenant and a pro plan → nothing changes;
- a forged signature → 401;
- one byte changed in the body → 401;
- grace on a test clock: day 6.9 ACTIVE, day 7 READ_ONLY, day 30 SUSPENDED, `charged` → ACTIVE;
- cancel keeps access until period end;
- a double-clicked checkout creates one subscription;
- READ_ONLY writes → 402.

Razorpay test mode is a **manual staging check**, reported with screenshots. CI never calls Razorpay.

---

## 4. 6D Customer dashboard (Next.js, customer session required)

**Pages and APIs** (all under `/api/v1/customer/...`):
- **Organisation:** members and roles, invite (never OWNER), remove a member, transfer ownership (OWNER + re-authentication; the last-owner rule holds).
- **Tenants:** create (reuse the Phase 4 wizard and the provisioning saga), list, status, per-plugin plan and state, suspend reason, retry failed provisioning.
- **Usage vs quota** per tenant and plugin, from the plan and the signed grants, with a warning at 80%.
- **API keys:** create (shown once), masked list, rotate with a grace period, revoke. Use the existing pepper ring.
- **Billing:** current plan, next charge, Razorpay invoices and payments (read through the API, cached), update the payment method, cancel.
- **Audit log:** only the organisation's own events, never platform-internal ones.
- **Data:** buttons for export and deletion requests. These call 6F endpoints that return 501 for now.

**Every route:**
- requires a customer session and checks membership role on the organisation;
- takes `organizationId` and `tenantId` from the path, and **checks that the tenant belongs to that organisation in SQL** (`WHERE id = $tenant AND organizationId = $org`), never by comparing in JavaScript after fetching;
- requires CSRF on writes, and re-authentication on dangerous actions (ownership transfer, cancel, key revoke, deletion request).

**Cross-tenant generator:**
- Extend it to discover every route under `app/api/v1/customer/**`.
- For each route, call it with user A's session against organisation B's ids, and expect 403 or 404 with **no** B data in the body.
- Report **N of N** covered. A new route that isn't covered fails CI.
- Add a role matrix: MEMBER, BILLING, ADMIN, OWNER × each write action.

**Sweep:** the no-token sweep must classify every new customer route as session-protected.

---

## 5. 6E Transactional email (on the existing `AccountEmailOutbox`)
- **Provider adapter interface** `EmailProvider.send({to, template, data, idempotencyKey})`. Implement a `LogOnlyProvider` (test and dev) plus one real provider behind config. The owner will choose the provider (SES, Postmark or Resend). Production refuses to start without a real provider configured.
- **Worker:**
  - runs as its own role/process and claims rows with `FOR UPDATE SKIP LOCKED`;
  - retries with exponential backoff up to N times, then `FAILED` with an alert;
  - **never** sends inside a request transaction;
  - the payload stays encrypted at rest (as now) and is decrypted only in the worker.
- **Templates:**
  - account: verify email, reset password, invite, new-login alert;
  - billing: payment failed / grace started, READ_ONLY notice, SUSPENDED notice, plan changed, cancelled;
  - lifecycle: tenant ready, export ready, deletion scheduled, deletion completed (the last three for 6F).
- **No PHI** in any email. Add a test that renders every template with seeded patient names in the tenant and asserts they never appear.
- **Bounces and complaints:** a signed provider webhook marks the address as suppressed, and the worker skips suppressed addresses.
- **Links** use `buildLink` (https, token in the fragment).
- **Owner sets up DNS:** SPF, DKIM and DMARC for the sending domain. The sending domain is configured, not hardcoded.

---

## 6. Acceptance tests for 6C–6E (CI on fresh PostgreSQL 16)
1. **End to end through the real server:**
   - sign up → verify email (link from the LogOnly outbox) → log in;
   - create an organisation → checkout → simulated signed `subscription.activated` → create a HospitalOS tenant;
   - invite a member, who accepts and logs in;
   - the member gets 403 on an owner-only action.
2. Every billing test in §3.7.
3. Dashboard cross-tenant generator: **N of N**, plus the role matrix.
4. Email:
   - the worker sends each template once under 3 parallel workers (no duplicates);
   - a provider failure retries, then ends FAILED;
   - suppressed addresses are skipped;
   - the PHI scan is clean.
5. The privilege test covers the new tables (runtime has no DELETE, and no updates to immutable billing columns).
6. Drift clean, migration immutability intact, and every job green with none skipped.

## 7. Rules (unchanged)
- Never edit a pushed migration, and never disable RLS, a trigger, a role check or any security control to make a test pass. Report the failure instead.
- No hardcoded secrets, `org_default`-style invented values, plugin defaults or in-memory state for anything durable.
- **Stop for review after 6C–6E.** The report must include:
  - every commit with a descriptive title;
  - every migration added;
  - every new setting and its behaviour when unset;
  - the CI run URL for the final commit;
  - the cross-tenant N of N;
  - the billing test list with pass counts.
