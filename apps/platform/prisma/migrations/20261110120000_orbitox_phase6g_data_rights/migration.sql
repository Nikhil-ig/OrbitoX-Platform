-- Phase 6G: Data Rights (G2 Export, G3 30-Day Deletion & Certificate, G4 Principal DSR)
-- RDS-compatible (non-superuser orbitox_migrator): no SUPERUSER, BYPASSRLS, or ALTER ROLE statements.

-- 1. HmsPatient legal restriction status (G4 RESTRICT enforcement)
ALTER TABLE public."HmsPatient"
  ADD COLUMN "processingStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "restrictedAt" TIMESTAMPTZ,
  ADD COLUMN "restrictedReason" TEXT,
  ADD COLUMN "restrictedBy" TEXT;

ALTER TABLE public."HmsPatient"
  ADD CONSTRAINT "HmsPatient_processingStatus_check"
  CHECK ("processingStatus" IN ('ACTIVE', 'RESTRICTED'));

CREATE INDEX "HmsPatient_tenantId_processingStatus_idx"
  ON public."HmsPatient" ("tenantId", "processingStatus");

-- 2. Extend HmsPhiAccessLog.purpose CHECK constraint to include 6G DSR purposes
DO $$
DECLARE
  constraint_row RECORD;
BEGIN
  FOR constraint_row IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public."HmsPhiAccessLog"'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%purpose%'
  LOOP
    EXECUTE format('ALTER TABLE public."HmsPhiAccessLog" DROP CONSTRAINT %I', constraint_row.conname);
  END LOOP;
END
$$;

ALTER TABLE public."HmsPhiAccessLog"
  ADD CONSTRAINT "HmsPhiAccessLog_purpose_check"
  CHECK ("purpose" IN (
    'TREATMENT',
    'BILLING',
    'OPERATIONS',
    'BREAK_GLASS',
    'PATIENT_REQUEST',
    'DSR_EXPORT',
    'DSR_CORRECTION',
    'DSR_ERASURE',
    'DSR_RESTRICTION'
  ));

-- 3. Durable leased DataRightsJob queue (G2 Export + Purge, G3 Deletion)
CREATE TABLE public."DataRightsJob" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "organizationId" TEXT,
  "requestedByUserId" TEXT NOT NULL,
  "leaseOwner" TEXT,
  "leaseExpiresAt" TIMESTAMPTZ,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "checkpoint" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "result" JSONB,
  "lastError" TEXT,
  "expiresAt" TIMESTAMPTZ,
  "purgedAt" TIMESTAMPTZ,
  "runAfter" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DataRightsJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DataRightsJob_kind_check"
    CHECK ("kind" IN ('ORG_EXPORT', 'ORG_DELETION', 'EXPORT_PURGE')),
  CONSTRAINT "DataRightsJob_status_check"
    CHECK ("status" IN ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED'))
);

CREATE INDEX "DataRightsJob_organizationId_kind_createdAt_idx"
  ON public."DataRightsJob" ("organizationId", "kind", "createdAt");

CREATE INDEX "DataRightsJob_status_runAfter_idx"
  ON public."DataRightsJob" ("status", "runAfter");

-- 4. Single-use export download tokens (SHA-256 hash stored, consumed atomically)
CREATE TABLE public."DataExportDownloadToken" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "consumedAt" TIMESTAMPTZ,
  "consumedByUserId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DataExportDownloadToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DataExportDownloadToken_tokenHash_key" UNIQUE ("tokenHash"),
  CONSTRAINT "DataExportDownloadToken_tokenHash_check" CHECK (length("tokenHash") = 64),
  CONSTRAINT "DataExportDownloadToken_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES public."DataRightsJob" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "DataExportDownloadToken_organizationId_expiresAt_idx"
  ON public."DataExportDownloadToken" ("organizationId", "expiresAt");

-- 5. Organization deletion requests (30-day cooling-off + signed deletion certificate)
CREATE TABLE public."OrganizationDeletionRequest" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "organizationDigest" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "requestedByUserId" TEXT NOT NULL,
  "authorizedOwnerIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "suspendedKeyIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "reason" TEXT,
  "requestedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "scheduledFor" TIMESTAMPTZ NOT NULL,
  "cancelledAt" TIMESTAMPTZ,
  "cancelledByUserId" TEXT,
  "completedAt" TIMESTAMPTZ,
  "certificate" JSONB,
  "checkpoint" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OrganizationDeletionRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrganizationDeletionRequest_status_check"
    CHECK ("status" IN ('SCHEDULED', 'IN_PROGRESS', 'CANCELLED', 'COMPLETED')),
  CONSTRAINT "OrganizationDeletionRequest_digest_check" CHECK (length("organizationDigest") = 64)
);

CREATE UNIQUE INDEX "OrganizationDeletionRequest_active_org_uidx"
  ON public."OrganizationDeletionRequest" ("organizationId")
  WHERE "organizationId" IS NOT NULL AND "status" IN ('SCHEDULED', 'IN_PROGRESS');

CREATE INDEX "OrganizationDeletionRequest_organizationDigest_status_idx"
  ON public."OrganizationDeletionRequest" ("organizationDigest", "status");

CREATE INDEX "OrganizationDeletionRequest_status_scheduledFor_idx"
  ON public."OrganizationDeletionRequest" ("status", "scheduledFor");

-- 6. Singleton lease coordinating data-rights background workers
CREATE TABLE public."DataRightsSweepLease" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "leaseOwner" TEXT NOT NULL,
  "leaseExpiresAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DataRightsSweepLease_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DataRightsSweepLease_singleton_check" CHECK ("id" = 'global')
);

-- 7. Least-privilege grants & maintenance erasure policies
REVOKE ALL ON TABLE public."DataRightsJob" FROM PUBLIC;
REVOKE ALL ON TABLE public."DataExportDownloadToken" FROM PUBLIC;
REVOKE ALL ON TABLE public."OrganizationDeletionRequest" FROM PUBLIC;
REVOKE ALL ON TABLE public."DataRightsSweepLease" FROM PUBLIC;

DO $$
DECLARE
  hms_table TEXT;
  hms_tables TEXT[] := ARRAY[
    'HmsDepartment',
    'HmsWard',
    'HmsBed',
    'HmsStaff',
    'HmsPatient',
    'HmsAdmission',
    'HmsAppointment',
    'HmsLabOrder',
    'HmsInvoice',
    'HmsPayment',
    'HmsPhiAccessLog',
    'HmsBreakGlassGrant',
    'HmsRole',
    'HmsRolePermission',
    'HmsStaffCredential',
    'HmsStaffSession'
  ];
  rls_cp_table TEXT;
  rls_cp_tables TEXT[] := ARRAY[
    'PlatformAuditEvent',
    'PlatformIdempotencyRecord',
    'PlatformOutboxMessage',
    'PlatformPluginUsage',
    'BillingProviderCache'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_runtime') THEN
    GRANT SELECT, INSERT, UPDATE ON TABLE public."DataRightsJob" TO orbitox_runtime;
    GRANT SELECT, INSERT, UPDATE ON TABLE public."DataExportDownloadToken" TO orbitox_runtime;
    GRANT SELECT, INSERT, UPDATE ON TABLE public."OrganizationDeletionRequest" TO orbitox_runtime;
    GRANT SELECT, INSERT, UPDATE ON TABLE public."DataRightsSweepLease" TO orbitox_runtime;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_maintenance') THEN
    -- Data-rights tables (maintenance processes exports, purges expired export jobs, completes Day-30 deletion)
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."DataRightsJob" TO orbitox_maintenance;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."DataExportDownloadToken" TO orbitox_maintenance;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."OrganizationDeletionRequest" TO orbitox_maintenance;
    GRANT SELECT, INSERT, UPDATE ON TABLE public."DataRightsSweepLease" TO orbitox_maintenance;

    -- Control plane tables needed for Day-30 full org erasure
    GRANT SELECT ON TABLE public."PlatformOrganization" TO orbitox_maintenance;
    GRANT SELECT, DELETE ON TABLE public."PlatformProject" TO orbitox_maintenance;
    GRANT SELECT, DELETE ON TABLE public."ProjectEnvironment" TO orbitox_maintenance;
    GRANT SELECT, UPDATE, DELETE ON TABLE public."PlatformApiKey" TO orbitox_maintenance;
    GRANT SELECT, DELETE ON TABLE public."PlatformCredential" TO orbitox_maintenance;
    GRANT SELECT, DELETE ON TABLE public."PackageInstallation" TO orbitox_maintenance;
    GRANT SELECT, DELETE ON TABLE public."ProjectDomain" TO orbitox_maintenance;
    GRANT SELECT, DELETE ON TABLE public."EnvironmentQuotaPolicy" TO orbitox_maintenance;
    GRANT SELECT, DELETE ON TABLE public."EnvironmentRateLimitPolicy" TO orbitox_maintenance;
    GRANT SELECT, DELETE ON TABLE public."StudioAsset" TO orbitox_maintenance;
    GRANT SELECT, DELETE ON TABLE public."StudioPage" TO orbitox_maintenance;
    GRANT SELECT, DELETE ON TABLE public."StudioSnapshot" TO orbitox_maintenance;

    -- RLS-protected control-plane tables erased during Day-30 deletion
    FOREACH rls_cp_table IN ARRAY rls_cp_tables LOOP
      EXECUTE format('GRANT SELECT, DELETE ON TABLE public.%I TO orbitox_maintenance', rls_cp_table);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', rls_cp_table || '_maintenance_all', rls_cp_table);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO orbitox_maintenance USING (true) WITH CHECK (true)',
        rls_cp_table || '_maintenance_all',
        rls_cp_table
      );
    END LOOP;

    -- HospitalOS & tenant shared tables (maintenance only; runtime retains I7/I8 prohibitions)
    FOREACH hms_table IN ARRAY hms_tables LOOP
      EXECUTE format('GRANT SELECT, DELETE ON TABLE public.%I TO orbitox_maintenance', hms_table);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', hms_table || '_maintenance_all', hms_table);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO orbitox_maintenance USING (true) WITH CHECK (true)',
        hms_table || '_maintenance_all',
        hms_table
      );
    END LOOP;

    -- Replace time-bounded purge policy on TenantIdempotencyKey & TenantOutbox with full Day-30 erasure capability for maintenance
    EXECUTE 'DROP POLICY IF EXISTS "TenantIdempotencyKey_maintenance_all" ON public."TenantIdempotencyKey"';
    EXECUTE 'CREATE POLICY "TenantIdempotencyKey_maintenance_all" ON public."TenantIdempotencyKey" FOR ALL TO orbitox_maintenance USING (true) WITH CHECK (true)';
    EXECUTE 'DROP POLICY IF EXISTS "TenantOutbox_maintenance_all" ON public."TenantOutbox"';
    EXECUTE 'CREATE POLICY "TenantOutbox_maintenance_all" ON public."TenantOutbox" FOR ALL TO orbitox_maintenance USING (true) WITH CHECK (true)';
  END IF;
END
$$;
