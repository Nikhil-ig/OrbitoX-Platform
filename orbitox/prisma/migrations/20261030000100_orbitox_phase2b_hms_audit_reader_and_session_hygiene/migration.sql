-- Phase 2b-3 Remediation: Dedicated Read-Only HMS Audit Role & Session Table Grant Hygiene (Findings L2 & L5)

-- L2: Create dedicated read-only role for HMS PHI access log
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hms_audit_reader') THEN
    CREATE ROLE hms_audit_reader NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END $$;

-- L2: Revoke HmsPhiAccessLog access from platform admin audit role and grant to dedicated hms_audit_reader under RLS
REVOKE ALL ON "HmsPhiAccessLog" FROM orbitox_platform_admin_audit;
DROP POLICY IF EXISTS "HmsPhiAccessLog_audit_select" ON "HmsPhiAccessLog";
DROP POLICY IF EXISTS "HmsPhiAccessLog_audit_reader_select" ON "HmsPhiAccessLog";
CREATE POLICY "HmsPhiAccessLog_audit_reader_select" ON "HmsPhiAccessLog"
  FOR SELECT TO hms_audit_reader
  USING ("tenantId" = app_current_tenant());
GRANT SELECT ON "HmsPhiAccessLog" TO hms_audit_reader;

-- L5: Revoke DELETE on HmsStaffSession from runtime (sessions are invalidated via revokedAt timestamp)
REVOKE DELETE ON "HmsStaffSession" FROM orbitox_runtime;
