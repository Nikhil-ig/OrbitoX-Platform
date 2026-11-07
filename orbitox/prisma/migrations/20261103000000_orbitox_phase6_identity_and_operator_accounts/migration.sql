CREATE TYPE "PlatformOperatorRole" AS ENUM ('PLATFORM_OWNER', 'OPERATOR', 'SUPPORT_READONLY', 'BILLING');
CREATE TYPE "CustomerMembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'BILLING');
CREATE TYPE "AccountTokenPurpose" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD', 'INVITE', 'EMAIL_CHANGE');

CREATE TABLE "PlatformOperator" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "PlatformOperatorRole" NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "mfaTotpSealed" TEXT NOT NULL,
  "failedLogins" INTEGER NOT NULL DEFAULT 0,
  "failureWindowStartedAt" TIMESTAMPTZ,
  "lockedUntil" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformOperator_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlatformOperator_status_check" CHECK ("status" IN ('ACTIVE', 'LOCKED', 'DISABLED'))
);
CREATE UNIQUE INDEX "PlatformOperator_email_ci" ON "PlatformOperator" (lower("email"));
CREATE INDEX "PlatformOperator_status_idx" ON "PlatformOperator" ("status");

CREATE TABLE "PlatformOperatorSession" (
  "id" TEXT NOT NULL,
  "operatorId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "csrfTokenHash" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "idleExpiresAt" TIMESTAMPTZ NOT NULL,
  "absoluteExpiresAt" TIMESTAMPTZ NOT NULL,
  "reauthenticatedAt" TIMESTAMPTZ,
  "revokedAt" TIMESTAMPTZ,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  CONSTRAINT "PlatformOperatorSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlatformOperatorSession_operatorId_fkey"
    FOREIGN KEY ("operatorId") REFERENCES "PlatformOperator"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "PlatformOperatorSession_tokenHash_key" ON "PlatformOperatorSession" ("tokenHash");
CREATE INDEX "PlatformOperatorSession_operatorId_revokedAt_idx" ON "PlatformOperatorSession" ("operatorId", "revokedAt");
CREATE INDEX "PlatformOperatorSession_idleExpiresAt_idx" ON "PlatformOperatorSession" ("idleExpiresAt");

CREATE TABLE "PlatformOperatorBackupCode" (
  "operatorId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "usedAt" TIMESTAMPTZ,
  CONSTRAINT "PlatformOperatorBackupCode_pkey" PRIMARY KEY ("operatorId", "codeHash"),
  CONSTRAINT "PlatformOperatorBackupCode_operatorId_fkey"
    FOREIGN KEY ("operatorId") REFERENCES "PlatformOperator"("id") ON DELETE CASCADE
);
CREATE INDEX "PlatformOperatorBackupCode_operatorId_usedAt_idx" ON "PlatformOperatorBackupCode" ("operatorId", "usedAt");

CREATE TABLE "CustomerUser" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "emailVerifiedAt" TIMESTAMPTZ,
  "passwordHash" TEXT,
  "mfaTotpSealed" TEXT,
  "mfaTotpPendingSealed" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "failedLogins" INTEGER NOT NULL DEFAULT 0,
  "failureWindowStartedAt" TIMESTAMPTZ,
  "lockedUntil" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerUser_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomerUser_email_check"
    CHECK ("email" ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' AND length("email") <= 254),
  CONSTRAINT "CustomerUser_status_check" CHECK ("status" IN ('ACTIVE', 'LOCKED', 'DISABLED', 'DELETED'))
);
CREATE UNIQUE INDEX "CustomerUser_email_ci" ON "CustomerUser" (lower("email")) WHERE "status" <> 'DELETED';
CREATE INDEX "CustomerUser_status_idx" ON "CustomerUser" ("status");

CREATE TABLE "CustomerMembership" (
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "CustomerMembershipRole" NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerMembership_pkey" PRIMARY KEY ("organizationId", "userId"),
  CONSTRAINT "CustomerMembership_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE CASCADE,
  CONSTRAINT "CustomerMembership_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "CustomerUser"("id") ON DELETE CASCADE
);
CREATE INDEX "CustomerMembership_userId_role_idx" ON "CustomerMembership" ("userId", "role");

CREATE OR REPLACE FUNCTION "keep_customer_organization_owner"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  old_org TEXT;
  new_org TEXT;
  remaining_owners INTEGER;
  must_keep_owner BOOLEAN := false;
BEGIN
  old_org := OLD."organizationId";
  IF TG_OP = 'UPDATE' THEN
    new_org := NEW."organizationId";
  END IF;

  IF new_org IS NOT NULL AND new_org <> old_org THEN
    IF new_org < old_org THEN
      PERFORM pg_advisory_xact_lock(hashtextextended('customer-owner:' || new_org, 0));
      PERFORM pg_advisory_xact_lock(hashtextextended('customer-owner:' || old_org, 0));
    ELSE
      PERFORM pg_advisory_xact_lock(hashtextextended('customer-owner:' || old_org, 0));
      PERFORM pg_advisory_xact_lock(hashtextextended('customer-owner:' || new_org, 0));
    END IF;
  ELSE
    PERFORM pg_advisory_xact_lock(hashtextextended('customer-owner:' || old_org, 0));
  END IF;

  IF TG_OP = 'DELETE' THEN
    must_keep_owner := OLD."role" = 'OWNER';
  ELSIF OLD."role" = 'OWNER' THEN
    must_keep_owner := NEW."role" <> 'OWNER' OR NEW."organizationId" <> old_org;
  END IF;

  IF must_keep_owner THEN
    SELECT count(*) INTO remaining_owners
      FROM "CustomerMembership"
      WHERE "organizationId" = old_org
        AND "role" = 'OWNER'
        AND "userId" <> OLD."userId";
    IF remaining_owners = 0 THEN
      RAISE EXCEPTION 'organization % must keep at least one OWNER', old_org
        USING ERRCODE = 'check_violation', CONSTRAINT = 'CustomerMembership_last_owner';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER "CustomerMembership_keep_owner"
  BEFORE UPDATE OR DELETE ON "CustomerMembership"
  FOR EACH ROW EXECUTE FUNCTION "keep_customer_organization_owner"();

CREATE TABLE "AccountToken" (
  "tokenHash" TEXT NOT NULL,
  "purpose" "AccountTokenPurpose" NOT NULL,
  "userId" TEXT,
  "organizationId" TEXT,
  "email" TEXT NOT NULL,
  "role" "CustomerMembershipRole",
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "usedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountToken_pkey" PRIMARY KEY ("tokenHash"),
  CONSTRAINT "AccountToken_tokenHash_check" CHECK (length("tokenHash") = 64),
  CONSTRAINT "AccountToken_expiry_check"
    CHECK ("expiresAt" > "createdAt" AND "expiresAt" <= "createdAt" + interval '7 days'),
  CONSTRAINT "AccountToken_invite_check"
    CHECK ("purpose" <> 'INVITE' OR ("organizationId" IS NOT NULL AND "role" IN ('ADMIN', 'MEMBER', 'BILLING'))),
  CONSTRAINT "AccountToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "CustomerUser"("id") ON DELETE CASCADE,
  CONSTRAINT "AccountToken_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE CASCADE
);
CREATE INDEX "AccountToken_user_purpose" ON "AccountToken" ("userId", "purpose") WHERE "usedAt" IS NULL;
CREATE INDEX "AccountToken_expiresAt_idx" ON "AccountToken" ("expiresAt");

CREATE TABLE "CustomerSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "csrfTokenHash" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "idleExpiresAt" TIMESTAMPTZ NOT NULL,
  "absoluteExpiresAt" TIMESTAMPTZ NOT NULL,
  "reauthenticatedAt" TIMESTAMPTZ,
  "revokedAt" TIMESTAMPTZ,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  CONSTRAINT "CustomerSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomerSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "CustomerUser"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "CustomerSession_tokenHash_key" ON "CustomerSession" ("tokenHash");
CREATE INDEX "CustomerSession_userId_revokedAt_idx" ON "CustomerSession" ("userId", "revokedAt");
CREATE INDEX "CustomerSession_idleExpiresAt_idx" ON "CustomerSession" ("idleExpiresAt");

CREATE TABLE "AccountAuthRateLimitBucket" (
  "scopeType" TEXT NOT NULL,
  "scopeId" TEXT NOT NULL,
  "windowStart" TIMESTAMPTZ NOT NULL,
  "requestCount" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "AccountAuthRateLimitBucket_pkey" PRIMARY KEY ("scopeType", "scopeId", "windowStart"),
  CONSTRAINT "AccountAuthRateLimitBucket_scopeType_check" CHECK ("scopeType" IN ('ip', 'email'))
);
CREATE INDEX "AccountAuthRateLimitBucket_expiresAt_idx" ON "AccountAuthRateLimitBucket" ("expiresAt");

CREATE TABLE "AccountEmailOutbox" (
  "id" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "template" TEXT NOT NULL,
  "encryptedPayload" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dispatchedAt" TIMESTAMPTZ,
  CONSTRAINT "AccountEmailOutbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountEmailOutbox_status_check" CHECK ("status" IN ('PENDING', 'SENT', 'FAILED'))
);
CREATE INDEX "AccountEmailOutbox_status_createdAt_idx" ON "AccountEmailOutbox" ("status", "createdAt");

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON
      "PlatformOperator", "PlatformOperatorSession", "PlatformOperatorBackupCode",
      "CustomerUser", "CustomerMembership", "AccountToken", "CustomerSession",
      "AccountAuthRateLimitBucket", "AccountEmailOutbox"
      TO orbitox_runtime;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_platform_admin_audit') THEN
    GRANT SELECT, INSERT, UPDATE ON
      "PlatformOperator", "PlatformOperatorSession", "PlatformOperatorBackupCode",
      "CustomerUser", "CustomerMembership", "AccountToken", "CustomerSession",
      "AccountAuthRateLimitBucket", "AccountEmailOutbox"
      TO orbitox_platform_admin_audit;
  END IF;
END
$$;
