ALTER TYPE "PlatformProjectStatus" ADD VALUE IF NOT EXISTS 'THROTTLED';

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