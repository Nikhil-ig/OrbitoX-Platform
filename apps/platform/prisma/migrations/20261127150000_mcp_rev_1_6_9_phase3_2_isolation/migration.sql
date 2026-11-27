-- Migration: 20261127150000_mcp_rev_1_6_9_phase3_2_isolation
-- Purpose:
--   1. Correct claim_platform_audit_chain_slot with scope parity validation & add orbitox_mcp_reconciler.
--   2. Add resolve_platform_operation_scope SECURITY DEFINER lookup function.
--   3. Create orbitox_mcp_reconciler role with least-privilege grants & cross-tenant reconciler RLS policies.
--   4. Reduce orbitox_maintenance privileges: revoke access to 6 MCP/sync/batch tables, revoke INSERT/UPDATE
--      on Workstream G tables, replace *_maintenance_all with app.dsr_purge_organization_id-scoped policies.
--   5. Enable and FORCE ROW LEVEL SECURITY on McpToolApproval, McpToolExecution, McpToolInvocation with
--      strict tenant isolation policies for orbitox_runtime and reconciler policies for orbitox_mcp_reconciler.
--   6. Refine PlatformOperation WITH CHECK policy to allow pre-project provisioning sagas.

-- 1. Correct claim_platform_audit_chain_slot and advance_platform_audit_chain_head
CREATE OR REPLACE FUNCTION public.claim_platform_audit_chain_slot(
  p_scope TEXT,
  p_deterministic_id TEXT DEFAULT NULL,
  p_expected_action TEXT DEFAULT NULL,
  p_expected_entity_type TEXT DEFAULT NULL,
  p_expected_entity_id TEXT DEFAULT NULL,
  p_expected_request_id TEXT DEFAULT NULL
)
RETURNS TABLE(
  already_exists BOOLEAN,
  conflict BOOLEAN,
  next_sequence BIGINT,
  previous_hash TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_existing RECORD;
  v_head RECORD;
BEGIN
  IF session_user NOT IN ('orbitox_platform_admin_audit', 'orbitox_runtime', 'orbitox_migrator', 'orbitox_maintenance', 'orbitox_mcp_reconciler', 'postgres', 'apple') THEN
    RAISE EXCEPTION 'unauthorized audit chain slot caller: %', session_user;
  END IF;

  IF p_scope IS NULL OR length(trim(p_scope)) = 0 THEN
    RAISE EXCEPTION 'audit chain scope is required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('orbitox_audit_chain:' || p_scope));

  IF p_deterministic_id IS NOT NULL AND length(trim(p_deterministic_id)) > 0 THEN
    SELECT "id", "scope", "action", "entityType", "entityId", "requestId"
    INTO v_existing
    FROM public."PlatformAuditDeterministicKey"
    WHERE "id" = p_deterministic_id;

    IF FOUND THEN
      IF (p_scope IS NOT NULL AND v_existing."scope" IS DISTINCT FROM p_scope)
         OR (p_expected_action IS NOT NULL AND v_existing."action" IS DISTINCT FROM p_expected_action)
         OR (p_expected_entity_type IS NOT NULL AND v_existing."entityType" IS DISTINCT FROM p_expected_entity_type)
         OR (p_expected_entity_id IS NOT NULL AND v_existing."entityId" IS DISTINCT FROM p_expected_entity_id)
         OR (p_expected_request_id IS NOT NULL AND v_existing."requestId" IS DISTINCT FROM p_expected_request_id) THEN
        RETURN QUERY SELECT TRUE, TRUE, 0::BIGINT, ''::TEXT;
        RETURN;
      END IF;
      RETURN QUERY SELECT TRUE, FALSE, 0::BIGINT, ''::TEXT;
      RETURN;
    END IF;
  END IF;

  SELECT "lastSequence", "lastRowHash"
  INTO v_head
  FROM public."PlatformAuditChainHead"
  WHERE "scope" = p_scope
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, FALSE, 1::BIGINT, 'GENESIS'::TEXT;
  ELSE
    RETURN QUERY SELECT FALSE, FALSE, (v_head."lastSequence" + 1)::BIGINT, v_head."lastRowHash"::TEXT;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.advance_platform_audit_chain_head(
  p_scope TEXT,
  p_sequence BIGINT,
  p_row_hash TEXT,
  p_event_id TEXT,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT DEFAULT NULL,
  p_request_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_updated_scope TEXT;
BEGIN
  IF session_user NOT IN ('orbitox_platform_admin_audit', 'orbitox_runtime', 'orbitox_migrator', 'orbitox_maintenance', 'orbitox_mcp_reconciler', 'postgres', 'apple') THEN
    RAISE EXCEPTION 'unauthorized audit chain head mutator: %', session_user;
  END IF;

  IF p_sequence < 1 THEN
    RAISE EXCEPTION 'audit sequence must be >= 1';
  END IF;

  INSERT INTO public."PlatformAuditChainHead" ("scope", "lastSequence", "lastRowHash", "updatedAt")
  VALUES (p_scope, p_sequence, p_row_hash, NOW())
  ON CONFLICT ("scope") DO UPDATE
    SET "lastSequence" = EXCLUDED."lastSequence",
        "lastRowHash" = EXCLUDED."lastRowHash",
        "updatedAt" = NOW()
    WHERE public."PlatformAuditChainHead"."lastSequence" + 1 = EXCLUDED."lastSequence"
  RETURNING "scope" INTO v_updated_scope;

  IF v_updated_scope IS NULL THEN
    RAISE EXCEPTION 'AUDIT_CHAIN_SEQUENCE_MISMATCH for scope % at sequence %', p_scope, p_sequence;
  END IF;

  INSERT INTO public."PlatformAuditDeterministicKey" ("id", "scope", "action", "entityType", "entityId", "requestId")
  VALUES (p_event_id, p_scope, p_action, p_entity_type, p_entity_id, p_request_id)
  ON CONFLICT ("id") DO NOTHING;
END
$$;

-- 2. Add resolve_platform_operation_scope function
CREATE OR REPLACE FUNCTION public.resolve_platform_operation_scope(p_operation_id TEXT)
RETURNS TABLE(organization_id TEXT, tenant_id TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF session_user NOT IN ('orbitox_runtime', 'orbitox_migrator', 'orbitox_maintenance', 'postgres', 'apple') THEN
    RAISE EXCEPTION 'unauthorized operation scope caller: %', session_user;
  END IF;

  RETURN QUERY
  SELECT o."organizationId", o."tenantId"
  FROM public."PlatformOperation" o
  WHERE o."id" = p_operation_id
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_platform_operation_scope(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_platform_operation_scope(TEXT) TO orbitox_runtime;
GRANT EXECUTE ON FUNCTION public.resolve_platform_operation_scope(TEXT) TO orbitox_maintenance;

-- 3. Create role orbitox_mcp_reconciler
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_mcp_reconciler') THEN
    CREATE ROLE orbitox_mcp_reconciler WITH NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS LOGIN NOINHERIT;
  ELSE
    ALTER ROLE orbitox_mcp_reconciler NOINHERIT;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO orbitox_mcp_reconciler;
GRANT EXECUTE ON FUNCTION public.claim_platform_audit_chain_slot(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO orbitox_mcp_reconciler;
GRANT EXECUTE ON FUNCTION public.advance_platform_audit_chain_head(TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO orbitox_mcp_reconciler;

-- 4. Role orbitox_mcp_reconciler table grants
GRANT SELECT ON TABLE
  public."PlatformOrganization",
  public."PlatformProject",
  public."ProjectEnvironment",
  public."McpToolInvocation",
  public."PlatformOperation",
  public."PlatformOperationAttempt",
  public."PluginInstallation",
  public."TenantSuspensionSync",
  public."BillingReminderBatchItem"
TO orbitox_mcp_reconciler;

GRANT SELECT, INSERT ON TABLE public."PlatformOutboxMessage" TO orbitox_mcp_reconciler;

GRANT SELECT, UPDATE ("status", "invocationId", "finalAuditEventId", "reconciliationStatus", "lastErrorCode", "lastErrorMessage", "leaseOwner", "leaseExpiresAt", "updatedAt")
ON TABLE public."McpToolExecution" TO orbitox_mcp_reconciler;

GRANT SELECT, UPDATE ("status", "invocationId", "updatedAt")
ON TABLE public."McpToolApproval" TO orbitox_mcp_reconciler;

-- 5. Reduce orbitox_maintenance privileges
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_maintenance') THEN
    -- Revoke access to all 6 MCP, reminder, and sync tables
    REVOKE ALL ON TABLE
      public."McpToolApproval",
      public."McpToolExecution",
      public."McpToolInvocation",
      public."McpApprovalDelegation",
      public."BillingReminderBatchItem",
      public."TenantSuspensionSync"
    FROM orbitox_maintenance;

    -- Drop permissive policies on Workstream G tables
    DROP POLICY IF EXISTS PluginInstallation_maintenance_all ON public."PluginInstallation";
    DROP POLICY IF EXISTS PluginGrantRevision_maintenance_all ON public."PluginGrantRevision";
    DROP POLICY IF EXISTS PlatformOperation_maintenance_all ON public."PlatformOperation";
    DROP POLICY IF EXISTS PlatformOperationAttempt_maintenance_all ON public."PlatformOperationAttempt";
    DROP POLICY IF EXISTS TenantSuspensionSync_maintenance_all ON public."TenantSuspensionSync";

    DROP POLICY IF EXISTS PluginInstallation_maintenance_dsr ON public."PluginInstallation";
    DROP POLICY IF EXISTS PluginGrantRevision_maintenance_dsr ON public."PluginGrantRevision";
    DROP POLICY IF EXISTS PlatformOperation_maintenance_dsr ON public."PlatformOperation";
    DROP POLICY IF EXISTS PlatformOperationAttempt_maintenance_dsr ON public."PlatformOperationAttempt";

    -- Revoke INSERT, UPDATE on Workstream G tables
    REVOKE INSERT, UPDATE ON TABLE
      public."PluginInstallation",
      public."PluginGrantRevision",
      public."PlatformOperation",
      public."PlatformOperationAttempt"
    FROM orbitox_maintenance;

    -- Add least-privilege DSR purge policies for Day-30 organization deletion
    CREATE POLICY PluginInstallation_maintenance_dsr ON public."PluginInstallation"
      FOR ALL TO orbitox_maintenance
      USING (
        NULLIF(current_setting('app.dsr_purge_organization_id', true), '') IS NOT NULL
        AND (
          "tenantId" LIKE 'org/' || current_setting('app.dsr_purge_organization_id', true) || '/%'
          OR "runtimeTenantId" LIKE 'org/' || current_setting('app.dsr_purge_organization_id', true) || '/%'
          OR EXISTS (
            SELECT 1 FROM public."PlatformProject" p
            WHERE p."organizationId" = current_setting('app.dsr_purge_organization_id', true)
              AND ("PluginInstallation"."tenantId" IN (p."id", p."slug") OR "PluginInstallation"."runtimeTenantId" IN (p."id", p."slug"))
          )
        )
      )
      WITH CHECK (
        NULLIF(current_setting('app.dsr_purge_organization_id', true), '') IS NOT NULL
        AND (
          "tenantId" LIKE 'org/' || current_setting('app.dsr_purge_organization_id', true) || '/%'
          OR "runtimeTenantId" LIKE 'org/' || current_setting('app.dsr_purge_organization_id', true) || '/%'
          OR EXISTS (
            SELECT 1 FROM public."PlatformProject" p
            WHERE p."organizationId" = current_setting('app.dsr_purge_organization_id', true)
              AND ("PluginInstallation"."tenantId" IN (p."id", p."slug") OR "PluginInstallation"."runtimeTenantId" IN (p."id", p."slug"))
          )
        )
      );

    CREATE POLICY PluginGrantRevision_maintenance_dsr ON public."PluginGrantRevision"
      FOR ALL TO orbitox_maintenance
      USING (
        NULLIF(current_setting('app.dsr_purge_organization_id', true), '') IS NOT NULL
        AND (
          "tenantId" LIKE 'org/' || current_setting('app.dsr_purge_organization_id', true) || '/%'
          OR EXISTS (
            SELECT 1 FROM public."PlatformProject" p
            WHERE p."organizationId" = current_setting('app.dsr_purge_organization_id', true)
              AND "PluginGrantRevision"."tenantId" IN (p."id", p."slug")
          )
        )
      )
      WITH CHECK (
        NULLIF(current_setting('app.dsr_purge_organization_id', true), '') IS NOT NULL
        AND (
          "tenantId" LIKE 'org/' || current_setting('app.dsr_purge_organization_id', true) || '/%'
          OR EXISTS (
            SELECT 1 FROM public."PlatformProject" p
            WHERE p."organizationId" = current_setting('app.dsr_purge_organization_id', true)
              AND "PluginGrantRevision"."tenantId" IN (p."id", p."slug")
          )
        )
      );

    CREATE POLICY PlatformOperation_maintenance_dsr ON public."PlatformOperation"
      FOR ALL TO orbitox_maintenance
      USING (
        NULLIF(current_setting('app.dsr_purge_organization_id', true), '') IS NOT NULL
        AND "organizationId" = current_setting('app.dsr_purge_organization_id', true)
      )
      WITH CHECK (
        NULLIF(current_setting('app.dsr_purge_organization_id', true), '') IS NOT NULL
        AND "organizationId" = current_setting('app.dsr_purge_organization_id', true)
      );

    CREATE POLICY PlatformOperationAttempt_maintenance_dsr ON public."PlatformOperationAttempt"
      FOR ALL TO orbitox_maintenance
      USING (
        NULLIF(current_setting('app.dsr_purge_organization_id', true), '') IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public."PlatformOperation" op
          WHERE op."id" = "PlatformOperationAttempt"."operationId"
            AND op."organizationId" = current_setting('app.dsr_purge_organization_id', true)
        )
      )
      WITH CHECK (
        NULLIF(current_setting('app.dsr_purge_organization_id', true), '') IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public."PlatformOperation" op
          WHERE op."id" = "PlatformOperationAttempt"."operationId"
            AND op."organizationId" = current_setting('app.dsr_purge_organization_id', true)
        )
      );
  END IF;
END
$$;

-- 6. Enable & FORCE ROW LEVEL SECURITY on McpToolApproval, McpToolExecution, McpToolInvocation
ALTER TABLE public."McpToolApproval" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."McpToolApproval" FORCE ROW LEVEL SECURITY;

ALTER TABLE public."McpToolExecution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."McpToolExecution" FORCE ROW LEVEL SECURITY;

ALTER TABLE public."McpToolInvocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."McpToolInvocation" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orbitox_mcp_approval_tenant ON public."McpToolApproval";
DROP POLICY IF EXISTS orbitox_mcp_reconciler_approval ON public."McpToolApproval";

DROP POLICY IF EXISTS orbitox_mcp_execution_tenant ON public."McpToolExecution";
DROP POLICY IF EXISTS orbitox_mcp_reconciler_execution ON public."McpToolExecution";

DROP POLICY IF EXISTS orbitox_mcp_invocation_tenant ON public."McpToolInvocation";
DROP POLICY IF EXISTS orbitox_mcp_reconciler_invocation ON public."McpToolInvocation";

DROP POLICY IF EXISTS orbitox_mcp_reconciler_platform_op ON public."PlatformOperation";
DROP POLICY IF EXISTS orbitox_platform_operation_migrator_resolver ON public."PlatformOperation";
DROP POLICY IF EXISTS orbitox_mcp_reconciler_platform_op_attempt ON public."PlatformOperationAttempt";
DROP POLICY IF EXISTS orbitox_mcp_reconciler_plugin_install ON public."PluginInstallation";
DROP POLICY IF EXISTS orbitox_mcp_reconciler_suspension_sync ON public."TenantSuspensionSync";
DROP POLICY IF EXISTS orbitox_mcp_reconciler_outbox_select ON public."PlatformOutboxMessage";
DROP POLICY IF EXISTS orbitox_mcp_reconciler_outbox_insert ON public."PlatformOutboxMessage";

REVOKE ALL ON TABLE
  public."McpToolApproval",
  public."McpToolExecution",
  public."McpToolInvocation"
FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_runtime') THEN
    REVOKE ALL ON TABLE
      public."McpToolApproval",
      public."McpToolExecution",
      public."McpToolInvocation"
    FROM orbitox_runtime;

    GRANT SELECT, INSERT, UPDATE ON TABLE
      public."McpToolApproval",
      public."McpToolExecution",
      public."McpToolInvocation"
    TO orbitox_runtime;

    CREATE POLICY orbitox_mcp_approval_tenant ON public."McpToolApproval"
      FOR ALL TO orbitox_runtime
      USING (
        NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
        AND (
          "tenantScope" = current_setting('app.current_tenant_id', true)
          OR (
            current_setting('app.current_tenant_id', true) ~ '^org/[^/]+/project/[^/]+/environment/[^/]+$'
            AND (
              "tenantScope" LIKE format('org/%s/%%', split_part(current_setting('app.current_tenant_id', true), '/', 2))
              OR EXISTS (
                SELECT 1 FROM public."PlatformProject" p
                WHERE p."organizationId" = split_part(current_setting('app.current_tenant_id', true), '/', 2)
                  AND (p."id" = split_part(current_setting('app.current_tenant_id', true), '/', 4) OR p."slug" = split_part(current_setting('app.current_tenant_id', true), '/', 4))
                  AND "McpToolApproval"."tenantScope" IN (p."id", p."slug", 'tenant_' || p."slug")
              )
            )
          )
        )
      )
      WITH CHECK (
        NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
        AND (
          "tenantScope" = current_setting('app.current_tenant_id', true)
          OR (
            current_setting('app.current_tenant_id', true) ~ '^org/[^/]+/project/[^/]+/environment/[^/]+$'
            AND (
              "tenantScope" LIKE format('org/%s/%%', split_part(current_setting('app.current_tenant_id', true), '/', 2))
              OR EXISTS (
                SELECT 1 FROM public."PlatformProject" p
                WHERE p."organizationId" = split_part(current_setting('app.current_tenant_id', true), '/', 2)
                  AND (p."id" = split_part(current_setting('app.current_tenant_id', true), '/', 4) OR p."slug" = split_part(current_setting('app.current_tenant_id', true), '/', 4))
                  AND "McpToolApproval"."tenantScope" IN (p."id", p."slug", 'tenant_' || p."slug")
              )
            )
          )
        )
      );

    CREATE POLICY orbitox_mcp_execution_tenant ON public."McpToolExecution"
      FOR ALL TO orbitox_runtime
      USING (
        NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
        AND (
          "tenantScope" = current_setting('app.current_tenant_id', true)
          OR (
            current_setting('app.current_tenant_id', true) ~ '^org/[^/]+/project/[^/]+/environment/[^/]+$'
            AND (
              "tenantScope" LIKE format('org/%s/%%', split_part(current_setting('app.current_tenant_id', true), '/', 2))
              OR EXISTS (
                SELECT 1 FROM public."PlatformProject" p
                WHERE p."organizationId" = split_part(current_setting('app.current_tenant_id', true), '/', 2)
                  AND (p."id" = split_part(current_setting('app.current_tenant_id', true), '/', 4) OR p."slug" = split_part(current_setting('app.current_tenant_id', true), '/', 4))
                  AND "McpToolExecution"."tenantScope" IN (p."id", p."slug", 'tenant_' || p."slug")
              )
            )
          )
        )
      )
      WITH CHECK (
        NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
        AND (
          "tenantScope" = current_setting('app.current_tenant_id', true)
          OR (
            current_setting('app.current_tenant_id', true) ~ '^org/[^/]+/project/[^/]+/environment/[^/]+$'
            AND (
              "tenantScope" LIKE format('org/%s/%%', split_part(current_setting('app.current_tenant_id', true), '/', 2))
              OR EXISTS (
                SELECT 1 FROM public."PlatformProject" p
                WHERE p."organizationId" = split_part(current_setting('app.current_tenant_id', true), '/', 2)
                  AND (p."id" = split_part(current_setting('app.current_tenant_id', true), '/', 4) OR p."slug" = split_part(current_setting('app.current_tenant_id', true), '/', 4))
                  AND "McpToolExecution"."tenantScope" IN (p."id", p."slug", 'tenant_' || p."slug")
              )
            )
          )
        )
      );

    CREATE POLICY orbitox_mcp_invocation_tenant ON public."McpToolInvocation"
      FOR ALL TO orbitox_runtime
      USING (
        NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
        AND (
          "tenantScope" = current_setting('app.current_tenant_id', true)
          OR (
            current_setting('app.current_tenant_id', true) ~ '^org/[^/]+/project/[^/]+/environment/[^/]+$'
            AND (
              "tenantScope" LIKE format('org/%s/%%', split_part(current_setting('app.current_tenant_id', true), '/', 2))
              OR EXISTS (
                SELECT 1 FROM public."PlatformProject" p
                WHERE p."organizationId" = split_part(current_setting('app.current_tenant_id', true), '/', 2)
                  AND (p."id" = split_part(current_setting('app.current_tenant_id', true), '/', 4) OR p."slug" = split_part(current_setting('app.current_tenant_id', true), '/', 4))
                  AND "McpToolInvocation"."tenantScope" IN (p."id", p."slug", 'tenant_' || p."slug")
              )
            )
          )
        )
      )
      WITH CHECK (
        NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
        AND (
          "tenantScope" = current_setting('app.current_tenant_id', true)
          OR (
            current_setting('app.current_tenant_id', true) ~ '^org/[^/]+/project/[^/]+/environment/[^/]+$'
            AND (
              "tenantScope" LIKE format('org/%s/%%', split_part(current_setting('app.current_tenant_id', true), '/', 2))
              OR EXISTS (
                SELECT 1 FROM public."PlatformProject" p
                WHERE p."organizationId" = split_part(current_setting('app.current_tenant_id', true), '/', 2)
                  AND (p."id" = split_part(current_setting('app.current_tenant_id', true), '/', 4) OR p."slug" = split_part(current_setting('app.current_tenant_id', true), '/', 4))
                  AND "McpToolInvocation"."tenantScope" IN (p."id", p."slug", 'tenant_' || p."slug")
              )
            )
          )
        )
      );
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_mcp_reconciler') THEN
    CREATE POLICY orbitox_mcp_reconciler_approval ON public."McpToolApproval"
      FOR ALL TO orbitox_mcp_reconciler USING (true) WITH CHECK (true);

    CREATE POLICY orbitox_mcp_reconciler_execution ON public."McpToolExecution"
      FOR ALL TO orbitox_mcp_reconciler USING (true) WITH CHECK (true);

    CREATE POLICY orbitox_mcp_reconciler_invocation ON public."McpToolInvocation"
      FOR SELECT TO orbitox_mcp_reconciler USING (true);

    CREATE POLICY orbitox_mcp_reconciler_platform_op ON public."PlatformOperation"
      FOR SELECT TO orbitox_mcp_reconciler USING (true);

    CREATE POLICY orbitox_mcp_reconciler_platform_op_attempt ON public."PlatformOperationAttempt"
      FOR SELECT TO orbitox_mcp_reconciler USING (true);

    CREATE POLICY orbitox_mcp_reconciler_plugin_install ON public."PluginInstallation"
      FOR SELECT TO orbitox_mcp_reconciler USING (true);

    CREATE POLICY orbitox_mcp_reconciler_suspension_sync ON public."TenantSuspensionSync"
      FOR SELECT TO orbitox_mcp_reconciler USING (true);

    CREATE POLICY orbitox_mcp_reconciler_outbox_select ON public."PlatformOutboxMessage"
      FOR SELECT TO orbitox_mcp_reconciler USING (true);

    CREATE POLICY orbitox_mcp_reconciler_outbox_insert ON public."PlatformOutboxMessage"
      FOR INSERT TO orbitox_mcp_reconciler WITH CHECK (true);
  END IF;
END
$$;

-- 7. Update PlatformOperation WITH CHECK for pre-project provisioning sagas
DROP POLICY IF EXISTS orbitox_platform_operation_tenant ON public."PlatformOperation";
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
      OR (
        -- Pre-project creation provisioning operations
        EXISTS (
          SELECT 1
          FROM public."PlatformOrganization" org
          WHERE org."id" = split_part(current_setting('app.current_tenant_id', true), '/', 2)
            AND org."id" = "PlatformOperation"."organizationId"
        )
      )
    )
  );

CREATE POLICY orbitox_platform_operation_migrator_resolver ON public."PlatformOperation"
  FOR SELECT TO orbitox_migrator
  USING (true);
