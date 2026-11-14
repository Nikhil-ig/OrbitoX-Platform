ALTER TABLE "PlatformProject"
  ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'starter',
  ADD COLUMN "monthlyApiCalls" BIGINT NOT NULL DEFAULT 0;

DROP POLICY IF EXISTS orbitox_audit_scope ON "PlatformAuditEvent";
CREATE POLICY orbitox_audit_scope ON "PlatformAuditEvent" FOR ALL TO orbitox_runtime
  USING (
    current_setting('app.current_tenant_id', true) ~ '^org/[^/]+/project/[^/]+/environment/[^/]+$'
    AND "organizationId" = split_part(current_setting('app.current_tenant_id', true), '/', 2)
    AND "projectId" = split_part(current_setting('app.current_tenant_id', true), '/', 4)
    AND "environmentId" = split_part(current_setting('app.current_tenant_id', true), '/', 6)
  )
  WITH CHECK (
    current_setting('app.current_tenant_id', true) ~ '^org/[^/]+/project/[^/]+/environment/[^/]+$'
    AND "organizationId" = split_part(current_setting('app.current_tenant_id', true), '/', 2)
    AND "projectId" = split_part(current_setting('app.current_tenant_id', true), '/', 4)
    AND "environmentId" = split_part(current_setting('app.current_tenant_id', true), '/', 6)
  );

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_platform_admin_audit') THEN
    CREATE ROLE orbitox_platform_admin_audit NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  ELSE
    ALTER ROLE orbitox_platform_admin_audit NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO orbitox_platform_admin_audit', current_database());
END
$$;

GRANT USAGE ON SCHEMA public TO orbitox_platform_admin_audit;
GRANT INSERT ON TABLE "PlatformAuditEvent" TO orbitox_platform_admin_audit;
CREATE POLICY orbitox_platform_admin_audit_insert ON "PlatformAuditEvent"
  FOR INSERT TO orbitox_platform_admin_audit WITH CHECK (true);