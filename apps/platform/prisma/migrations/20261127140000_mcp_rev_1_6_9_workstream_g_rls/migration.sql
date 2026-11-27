-- Migration: 20261127140000_mcp_rev_1_6_9_workstream_g_rls
-- Purpose: Enable and FORCE ROW LEVEL SECURITY on all five Workstream G control-plane and
--          tenant-lifecycle tables (PluginInstallation, PluginGrantRevision, PlatformOperation,
--          PlatformOperationAttempt, TenantSuspensionSync) with fail-closed canonical tenant
--          isolation policies for orbitox_runtime and explicit maintenance policies for
--          orbitox_maintenance.
-- RDS-compatible (non-superuser orbitox_migrator): no SUPERUSER, BYPASSRLS, or SECURITY DEFINER shortcuts.

-- 1. Enable and enforce ROW LEVEL SECURITY on all five Workstream G tables
ALTER TABLE public."PluginInstallation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PluginInstallation" FORCE ROW LEVEL SECURITY;

ALTER TABLE public."PluginGrantRevision" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PluginGrantRevision" FORCE ROW LEVEL SECURITY;

ALTER TABLE public."PlatformOperation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PlatformOperation" FORCE ROW LEVEL SECURITY;

ALTER TABLE public."PlatformOperationAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PlatformOperationAttempt" FORCE ROW LEVEL SECURITY;

ALTER TABLE public."TenantSuspensionSync" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TenantSuspensionSync" FORCE ROW LEVEL SECURITY;

-- 2. Drop any pre-existing policies on the target tables cleanly
DROP POLICY IF EXISTS orbitox_plugin_installation_tenant ON public."PluginInstallation";
DROP POLICY IF EXISTS PluginInstallation_maintenance_all ON public."PluginInstallation";

DROP POLICY IF EXISTS orbitox_plugin_grant_revision_tenant ON public."PluginGrantRevision";
DROP POLICY IF EXISTS PluginGrantRevision_maintenance_all ON public."PluginGrantRevision";

DROP POLICY IF EXISTS orbitox_platform_operation_tenant ON public."PlatformOperation";
DROP POLICY IF EXISTS PlatformOperation_maintenance_all ON public."PlatformOperation";

DROP POLICY IF EXISTS orbitox_platform_operation_attempt_tenant ON public."PlatformOperationAttempt";
DROP POLICY IF EXISTS PlatformOperationAttempt_maintenance_all ON public."PlatformOperationAttempt";

DROP POLICY IF EXISTS orbitox_tenant_suspension_sync_tenant ON public."TenantSuspensionSync";
DROP POLICY IF EXISTS TenantSuspensionSync_maintenance_all ON public."TenantSuspensionSync";

-- 3. Restrict base privileges (no PUBLIC access; no DELETE for runtime)
REVOKE ALL ON TABLE
  public."PluginInstallation",
  public."PluginGrantRevision",
  public."PlatformOperation",
  public."PlatformOperationAttempt",
  public."TenantSuspensionSync"
FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_runtime') THEN
    REVOKE ALL ON TABLE
      public."PluginInstallation",
      public."PluginGrantRevision",
      public."PlatformOperation",
      public."PlatformOperationAttempt",
      public."TenantSuspensionSync"
    FROM orbitox_runtime;

    GRANT SELECT, INSERT, UPDATE ON TABLE
      public."PluginInstallation",
      public."PluginGrantRevision",
      public."PlatformOperation",
      public."PlatformOperationAttempt",
      public."TenantSuspensionSync"
    TO orbitox_runtime;

    CREATE POLICY orbitox_plugin_installation_tenant ON public."PluginInstallation"
      FOR ALL TO orbitox_runtime
      USING (
        NULLIF(current_setting('app.current_tenant_id', true), '') ~ '^org/[^/]+/project/[^/]+/environment/[^/]+$'
        AND (
          "tenantId" = current_setting('app.current_tenant_id', true)
          OR "runtimeTenantId" = current_setting('app.current_tenant_id', true)
          OR EXISTS (
            SELECT 1
            FROM public."PlatformProject" p
            WHERE p."organizationId" = split_part(current_setting('app.current_tenant_id', true), '/', 2)
              AND p."id" = split_part(current_setting('app.current_tenant_id', true), '/', 4)
              AND (
                "PluginInstallation"."tenantId" IN (p."id", p."slug")
                OR "PluginInstallation"."runtimeTenantId" IN (p."id", p."slug")
              )
          )
        )
      )
      WITH CHECK (
        NULLIF(current_setting('app.current_tenant_id', true), '') ~ '^org/[^/]+/project/[^/]+/environment/[^/]+$'
        AND (
          (
            "tenantId" = current_setting('app.current_tenant_id', true)
            AND "runtimeTenantId" = current_setting('app.current_tenant_id', true)
          )
          OR EXISTS (
            SELECT 1
            FROM public."PlatformProject" p
            WHERE p."organizationId" = split_part(current_setting('app.current_tenant_id', true), '/', 2)
              AND p."id" = split_part(current_setting('app.current_tenant_id', true), '/', 4)
              AND (
                "PluginInstallation"."tenantId" = current_setting('app.current_tenant_id', true)
                OR "PluginInstallation"."tenantId" IN (p."id", p."slug")
              )
              AND (
                "PluginInstallation"."runtimeTenantId" = current_setting('app.current_tenant_id', true)
                OR "PluginInstallation"."runtimeTenantId" IN (p."id", p."slug")
              )
          )
        )
      );

    CREATE POLICY orbitox_plugin_grant_revision_tenant ON public."PluginGrantRevision"
      FOR ALL TO orbitox_runtime
      USING (
        NULLIF(current_setting('app.current_tenant_id', true), '') ~ '^org/[^/]+/project/[^/]+/environment/[^/]+$'
        AND (
          "tenantId" = current_setting('app.current_tenant_id', true)
          OR EXISTS (
            SELECT 1
            FROM public."PlatformProject" p
            WHERE p."organizationId" = split_part(current_setting('app.current_tenant_id', true), '/', 2)
              AND p."id" = split_part(current_setting('app.current_tenant_id', true), '/', 4)
              AND "PluginGrantRevision"."tenantId" IN (p."id", p."slug")
          )
        )
      )
      WITH CHECK (
        NULLIF(current_setting('app.current_tenant_id', true), '') ~ '^org/[^/]+/project/[^/]+/environment/[^/]+$'
        AND (
          "tenantId" = current_setting('app.current_tenant_id', true)
          OR EXISTS (
            SELECT 1
            FROM public."PlatformProject" p
            WHERE p."organizationId" = split_part(current_setting('app.current_tenant_id', true), '/', 2)
              AND p."id" = split_part(current_setting('app.current_tenant_id', true), '/', 4)
              AND "PluginGrantRevision"."tenantId" IN (p."id", p."slug")
          )
        )
      );

    CREATE POLICY orbitox_platform_operation_tenant ON public."PlatformOperation"
      FOR ALL TO orbitox_runtime
      USING (
        NULLIF(current_setting('app.current_tenant_id', true), '') ~ '^org/[^/]+/project/[^/]+/environment/[^/]+$'
        AND "organizationId" = split_part(current_setting('app.current_tenant_id', true), '/', 2)
        AND (
          "tenantId" = current_setting('app.current_tenant_id', true)
          OR EXISTS (
            SELECT 1
            FROM public."PlatformProject" p
            WHERE p."organizationId" = split_part(current_setting('app.current_tenant_id', true), '/', 2)
              AND (
                p."id" = split_part(current_setting('app.current_tenant_id', true), '/', 4)
                OR p."slug" = split_part(current_setting('app.current_tenant_id', true), '/', 4)
              )
              AND (
                "PlatformOperation"."tenantId" IN (p."id", p."slug")
                OR "PlatformOperation"."tenantId" LIKE format('org/%s/project/%s/environment/%%', p."organizationId", p."slug")
                OR "PlatformOperation"."tenantId" LIKE format('org/%s/project/%s/environment/%%', p."organizationId", p."id")
              )
          )
        )
      )
      WITH CHECK (
        NULLIF(current_setting('app.current_tenant_id', true), '') ~ '^org/[^/]+/project/[^/]+/environment/[^/]+$'
        AND "organizationId" = split_part(current_setting('app.current_tenant_id', true), '/', 2)
        AND (
          (
            "tenantId" ~ '^org/[^/]+/project/[^/]+/environment/[^/]+$'
            AND split_part("tenantId", '/', 2) = "organizationId"
            AND "tenantId" = current_setting('app.current_tenant_id', true)
          )
          OR EXISTS (
            SELECT 1
            FROM public."PlatformProject" p
            WHERE p."organizationId" = split_part(current_setting('app.current_tenant_id', true), '/', 2)
              AND (
                p."id" = split_part(current_setting('app.current_tenant_id', true), '/', 4)
                OR p."slug" = split_part(current_setting('app.current_tenant_id', true), '/', 4)
              )
              AND (
                "PlatformOperation"."tenantId" IN (p."id", p."slug")
                OR "PlatformOperation"."tenantId" LIKE format('org/%s/project/%s/environment/%%', p."organizationId", p."slug")
                OR "PlatformOperation"."tenantId" LIKE format('org/%s/project/%s/environment/%%', p."organizationId", p."id")
              )
          )
        )
      );

    CREATE POLICY orbitox_platform_operation_attempt_tenant ON public."PlatformOperationAttempt"
      FOR ALL TO orbitox_runtime
      USING (
        NULLIF(current_setting('app.current_tenant_id', true), '') ~ '^org/[^/]+/project/[^/]+/environment/[^/]+$'
        AND EXISTS (
          SELECT 1
          FROM public."PlatformOperation" op
          WHERE op."id" = "PlatformOperationAttempt"."operationId"
        )
      )
      WITH CHECK (
        NULLIF(current_setting('app.current_tenant_id', true), '') ~ '^org/[^/]+/project/[^/]+/environment/[^/]+$'
        AND EXISTS (
          SELECT 1
          FROM public."PlatformOperation" op
          WHERE op."id" = "PlatformOperationAttempt"."operationId"
        )
      );

    CREATE POLICY orbitox_tenant_suspension_sync_tenant ON public."TenantSuspensionSync"
      FOR ALL TO orbitox_runtime
      USING (
        NULLIF(current_setting('app.current_tenant_id', true), '') ~ '^org/[^/]+/project/[^/]+/environment/[^/]+$'
        AND "projectId" = split_part(current_setting('app.current_tenant_id', true), '/', 4)
        AND EXISTS (
          SELECT 1
          FROM public."PlatformProject" p
          WHERE p."id" = "TenantSuspensionSync"."projectId"
            AND p."organizationId" = split_part(current_setting('app.current_tenant_id', true), '/', 2)
            AND (
              "TenantSuspensionSync"."targetTenantId" = current_setting('app.current_tenant_id', true)
              OR "TenantSuspensionSync"."targetTenantId" IN (p."id", p."slug")
            )
        )
      )
      WITH CHECK (
        NULLIF(current_setting('app.current_tenant_id', true), '') ~ '^org/[^/]+/project/[^/]+/environment/[^/]+$'
        AND "projectId" = split_part(current_setting('app.current_tenant_id', true), '/', 4)
        AND EXISTS (
          SELECT 1
          FROM public."PlatformProject" p
          WHERE p."id" = "TenantSuspensionSync"."projectId"
            AND p."organizationId" = split_part(current_setting('app.current_tenant_id', true), '/', 2)
            AND (
              "TenantSuspensionSync"."targetTenantId" = current_setting('app.current_tenant_id', true)
              OR "TenantSuspensionSync"."targetTenantId" IN (p."id", p."slug")
            )
        )
      );
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_maintenance') THEN
    REVOKE ALL ON TABLE
      public."PluginInstallation",
      public."PluginGrantRevision",
      public."PlatformOperation",
      public."PlatformOperationAttempt",
      public."TenantSuspensionSync"
    FROM orbitox_maintenance;

    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      public."PluginInstallation",
      public."PluginGrantRevision",
      public."PlatformOperation",
      public."PlatformOperationAttempt",
      public."TenantSuspensionSync"
    TO orbitox_maintenance;

    CREATE POLICY PluginInstallation_maintenance_all ON public."PluginInstallation"
      FOR ALL TO orbitox_maintenance USING (true) WITH CHECK (true);

    CREATE POLICY PluginGrantRevision_maintenance_all ON public."PluginGrantRevision"
      FOR ALL TO orbitox_maintenance USING (true) WITH CHECK (true);

    CREATE POLICY PlatformOperation_maintenance_all ON public."PlatformOperation"
      FOR ALL TO orbitox_maintenance USING (true) WITH CHECK (true);

    CREATE POLICY PlatformOperationAttempt_maintenance_all ON public."PlatformOperationAttempt"
      FOR ALL TO orbitox_maintenance USING (true) WITH CHECK (true);

    CREATE POLICY TenantSuspensionSync_maintenance_all ON public."TenantSuspensionSync"
      FOR ALL TO orbitox_maintenance USING (true) WITH CHECK (true);
  END IF;
END
$$;
