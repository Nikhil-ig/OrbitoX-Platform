-- ════════════════════════════════════════════════════════════════════════════
-- OrbitoX Phase 6 reference schema: customer accounts, single-use tokens, billing
-- binding. Tested on PostgreSQL 16 (see test_accounts_billing.sh).
--
-- Invariants enforced by the database:
--  A1  Email is unique case-insensitively (citext-free: unique index on lower(email)).
--  A2  An account token is consumed at most once, only before expiry, only for its
--      purpose (atomic conditional UPDATE; concurrent consumers -> exactly one wins).
--  A3  A membership role is one of OWNER/ADMIN/MEMBER/BILLING; every organisation keeps
--      at least one OWNER (trigger blocks removing/demoting the last owner).
--  B1  A Razorpay subscription id maps to exactly one (organisation, tenant, plugin, plan);
--      the mapping is written by OUR server when it creates the subscription. Webhooks
--      never decide tenant or plan from event notes.
--  B2  A Razorpay plan id maps to exactly one internal plan (price changes = new plan id).
--  B3  Webhook state changes apply in event order per subscription (older events ignored).
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE "CustomerUser" (
  "id"              text PRIMARY KEY,
  "email"           text NOT NULL CHECK ("email" ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length("email") <= 254),
  "emailVerifiedAt" timestamptz,
  "passwordHash"    text,                       -- null until set (invite-only users)
  "mfaTotpSealed"   text,                       -- encrypted TOTP secret, null if MFA off
  "status"          text NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE','LOCKED','DISABLED','DELETED')),
  "failedLogins"    integer NOT NULL DEFAULT 0,
  "lockedUntil"     timestamptz,
  "createdAt"       timestamptz NOT NULL DEFAULT now(),
  "updatedAt"       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "CustomerUser_email_ci" ON "CustomerUser" (lower("email")) WHERE "status" <> 'DELETED';

CREATE TABLE "CustomerOrganization" (
  "id"        text PRIMARY KEY,
  "name"      text NOT NULL CHECK (length("name") BETWEEN 2 AND 120),
  "status"    text NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE','SUSPENDED','DELETION_PENDING','DELETED')),
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "CustomerMembership" (
  "organizationId" text NOT NULL REFERENCES "CustomerOrganization"("id"),
  "userId"         text NOT NULL REFERENCES "CustomerUser"("id"),
  "role"           text NOT NULL CHECK ("role" IN ('OWNER','ADMIN','MEMBER','BILLING')),
  "createdAt"      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("organizationId", "userId")
);

-- A3: never leave an organisation without an OWNER.
CREATE OR REPLACE FUNCTION keep_one_owner() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE org text; remaining int;
BEGIN
  org := COALESCE(OLD."organizationId", NEW."organizationId");
  -- Serialise owner changes per organisation so two concurrent demotions cannot both pass.
  PERFORM pg_advisory_xact_lock(hashtext('owner:' || org));
  IF (TG_OP = 'DELETE' AND OLD."role" = 'OWNER') OR (TG_OP = 'UPDATE' AND OLD."role" = 'OWNER' AND NEW."role" <> 'OWNER') THEN
    SELECT count(*) INTO remaining FROM "CustomerMembership"
     WHERE "organizationId" = org AND "role" = 'OWNER' AND "userId" <> OLD."userId";
    IF remaining = 0 THEN
      RAISE EXCEPTION 'organisation % must keep at least one OWNER', org
        USING ERRCODE = 'check_violation', CONSTRAINT = 'CustomerMembership_last_owner';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER "CustomerMembership_keep_owner" BEFORE UPDATE OR DELETE ON "CustomerMembership"
  FOR EACH ROW EXECUTE FUNCTION keep_one_owner();

-- A2: single-use, purpose-bound, expiring tokens. Only the SHA-256 of the token is stored.
CREATE TABLE "AccountToken" (
  "tokenHash"      text PRIMARY KEY CHECK (length("tokenHash") = 64),
  "purpose"        text NOT NULL CHECK ("purpose" IN ('VERIFY_EMAIL','RESET_PASSWORD','INVITE','EMAIL_CHANGE')),
  "userId"         text REFERENCES "CustomerUser"("id"),
  "organizationId" text REFERENCES "CustomerOrganization"("id"),
  "email"          text NOT NULL,
  "role"           text CHECK ("role" IS NULL OR "role" IN ('ADMIN','MEMBER','BILLING')),   -- invites never grant OWNER
  "expiresAt"      timestamptz NOT NULL,
  "usedAt"         timestamptz,
  "createdAt"      timestamptz NOT NULL DEFAULT now(),
  CHECK ("expiresAt" > "createdAt" AND "expiresAt" <= "createdAt" + interval '7 days'),
  CHECK ("purpose" <> 'INVITE' OR ("organizationId" IS NOT NULL AND "role" IS NOT NULL))
);
CREATE INDEX "AccountToken_user_purpose" ON "AccountToken" ("userId", "purpose") WHERE "usedAt" IS NULL;

-- B2: Razorpay plan ids -> internal plans (one-to-one).
CREATE TABLE "BillingPlanMap" (
  "razorpayPlanId" text PRIMARY KEY CHECK ("razorpayPlanId" ~ '^plan_[A-Za-z0-9]+$'),
  "planId"         text NOT NULL,                 -- internal plan, e.g. hms-pro
  "pluginId"       text NOT NULL,                 -- e.g. @orbitox/hms
  "amountMinor"    bigint NOT NULL CHECK ("amountMinor" > 0),
  "currency"       char(3) NOT NULL DEFAULT 'INR',
  "period"         text NOT NULL CHECK ("period" IN ('monthly','yearly')),
  "active"         boolean NOT NULL DEFAULT true
);

-- B1 + B3: our record of every subscription WE created.
CREATE TABLE "BillingSubscription" (
  "razorpaySubscriptionId" text PRIMARY KEY CHECK ("razorpaySubscriptionId" ~ '^sub_[A-Za-z0-9]+$'),
  "organizationId"  text NOT NULL REFERENCES "CustomerOrganization"("id"),
  "tenantId"        text NOT NULL,
  "pluginId"        text NOT NULL,
  "razorpayPlanId"  text NOT NULL REFERENCES "BillingPlanMap"("razorpayPlanId"),
  "status"          text NOT NULL DEFAULT 'created',   -- mirror of Razorpay status
  "currentEnd"      timestamptz,                      -- end of paid period
  "graceStartedAt"  timestamptz,
  "lastEventAt"     bigint NOT NULL DEFAULT 0,        -- Razorpay event created_at (unix s) last applied
  "createdBy"       text NOT NULL,                    -- user id that started checkout
  "createdAt"       timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("tenantId", "pluginId", "razorpaySubscriptionId")
);
-- At most one live subscription per (tenant, plugin).
CREATE UNIQUE INDEX "BillingSubscription_one_live" ON "BillingSubscription" ("tenantId", "pluginId")
  WHERE "status" IN ('created','authenticated','active','pending','halted','paused');
