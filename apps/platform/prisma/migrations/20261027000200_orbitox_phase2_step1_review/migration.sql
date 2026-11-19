-- UTC partition boundaries and a bounded readiness runway.
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'UTC');
END
$$;

ALTER ROLE orbitox_runtime SET timezone TO 'UTC';
ALTER ROLE orbitox_maintenance SET timezone TO 'UTC';
ALTER FUNCTION public.ensure_platform_rate_limit_partitions(INTEGER) SET timezone TO 'UTC';
ALTER FUNCTION public.maintain_platform_rate_limit_partitions(INTEGER, INTEGER) SET timezone TO 'UTC';

CREATE OR REPLACE FUNCTION public.platform_rate_limit_partitions_ready(days_ahead INTEGER DEFAULT 3)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SET timezone = 'UTC'
AS $$
  SELECT days_ahead BETWEEN 0 AND 14
    AND NOT EXISTS (
      SELECT 1
      FROM generate_series(current_date, current_date + days_ahead, INTERVAL '1 day') AS day_start
      WHERE to_regclass(
        'public."PlatformRateLimitBucket_' || to_char(day_start::DATE, 'YYYYMMDD') || '"'
      ) IS NULL
    )
$$;

CREATE OR REPLACE FUNCTION public.platform_rate_limit_partition_runway_days()
RETURNS INTEGER
LANGUAGE SQL
STABLE
SET timezone = 'UTC'
AS $$
  SELECT COALESCE(
    MIN(day_offset) FILTER (
      WHERE to_regclass(
        'public."PlatformRateLimitBucket_' ||
        to_char((current_date + day_offset)::DATE, 'YYYYMMDD') || '"'
      ) IS NULL
    ) - 1,
    31
  )::INTEGER
  FROM generate_series(1, 31) AS day_offset
$$;

REVOKE ALL ON FUNCTION public.platform_rate_limit_partition_runway_days() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_rate_limit_partition_runway_days() TO orbitox_runtime;
GRANT EXECUTE ON FUNCTION public.platform_rate_limit_partitions_ready(INTEGER) TO orbitox_maintenance;
GRANT EXECUTE ON FUNCTION public.platform_rate_limit_partition_runway_days() TO orbitox_maintenance;

ALTER TABLE "PlatformAuditEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlatformAuditEvent" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS orbitox_audit_scope ON "PlatformAuditEvent";
CREATE POLICY orbitox_audit_scope ON "PlatformAuditEvent" FOR ALL TO orbitox_runtime
  USING (
    split_part(NULLIF(current_setting('app.current_tenant_id', true), ''), '/', 1) = 'org'
    AND NULLIF(split_part(current_setting('app.current_tenant_id', true), '/', 2), '') IS NOT NULL
    AND split_part(NULLIF(current_setting('app.current_tenant_id', true), ''), '/', 3) = 'project'
    AND NULLIF(split_part(current_setting('app.current_tenant_id', true), '/', 4), '') IS NOT NULL
    AND split_part(NULLIF(current_setting('app.current_tenant_id', true), ''), '/', 5) = 'environment'
    AND NULLIF(split_part(current_setting('app.current_tenant_id', true), '/', 6), '') IS NOT NULL
    AND "organizationId" = split_part(current_setting('app.current_tenant_id', true), '/', 2)
    AND "projectId" = split_part(current_setting('app.current_tenant_id', true), '/', 4)
    AND "environmentId" = split_part(current_setting('app.current_tenant_id', true), '/', 6)
  )
  WITH CHECK (
    split_part(NULLIF(current_setting('app.current_tenant_id', true), ''), '/', 1) = 'org'
    AND NULLIF(split_part(current_setting('app.current_tenant_id', true), '/', 2), '') IS NOT NULL
    AND split_part(NULLIF(current_setting('app.current_tenant_id', true), ''), '/', 3) = 'project'
    AND NULLIF(split_part(current_setting('app.current_tenant_id', true), '/', 4), '') IS NOT NULL
    AND split_part(NULLIF(current_setting('app.current_tenant_id', true), ''), '/', 5) = 'environment'
    AND NULLIF(split_part(current_setting('app.current_tenant_id', true), '/', 6), '') IS NOT NULL
    AND "organizationId" = split_part(current_setting('app.current_tenant_id', true), '/', 2)
    AND "projectId" = split_part(current_setting('app.current_tenant_id', true), '/', 4)
    AND "environmentId" = split_part(current_setting('app.current_tenant_id', true), '/', 6)
  );