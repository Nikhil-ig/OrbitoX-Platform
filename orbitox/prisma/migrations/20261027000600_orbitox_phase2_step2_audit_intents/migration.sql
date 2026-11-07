ALTER TABLE public."PlatformAuditEvent"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'COMMITTED',
  ADD COLUMN "failureReason" TEXT,
  ADD CONSTRAINT "PlatformAuditEvent_status_check" CHECK ("status" IN ('PENDING', 'COMMITTED', 'FAILED'));

CREATE INDEX "PlatformAuditEvent_status_occurredAt_idx"
  ON public."PlatformAuditEvent" ("status", "occurredAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_audit_resolver') THEN
    CREATE ROLE orbitox_audit_resolver NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT BYPASSRLS;
  ELSE
    ALTER ROLE orbitox_audit_resolver NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_audit_recovery') THEN
    CREATE ROLE orbitox_audit_recovery NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT BYPASSRLS;
  ELSE
    ALTER ROLE orbitox_audit_recovery NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT BYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO orbitox_audit_resolver;
GRANT CREATE ON SCHEMA public TO orbitox_audit_resolver, orbitox_audit_recovery;
GRANT SELECT ("id", "organizationId", "projectId", "status", "occurredAt") ON public."PlatformAuditEvent" TO orbitox_audit_resolver;
GRANT UPDATE ("status", "failureReason") ON public."PlatformAuditEvent" TO orbitox_audit_resolver;
GRANT USAGE ON SCHEMA public TO orbitox_audit_recovery;
GRANT SELECT ("id", "status", "occurredAt") ON public."PlatformAuditEvent" TO orbitox_audit_recovery;
GRANT UPDATE ("status", "failureReason") ON public."PlatformAuditEvent" TO orbitox_audit_recovery;

CREATE OR REPLACE FUNCTION public.resolve_platform_audit_intent(
  p_intent_id TEXT,
  p_status TEXT,
  p_failure_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  intent_record RECORD;
  tenant_scope TEXT;
BEGIN
  IF session_user <> 'orbitox_runtime' THEN
    RAISE EXCEPTION 'only orbitox_runtime may resolve an audit intent';
  END IF;
  IF p_status NOT IN ('COMMITTED', 'FAILED') THEN
    RAISE EXCEPTION 'audit intent status must be COMMITTED or FAILED';
  END IF;

  SELECT "organizationId", "projectId"
  INTO intent_record
  FROM public."PlatformAuditEvent"
  WHERE "id" = p_intent_id AND "status" = 'PENDING'
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  tenant_scope := current_setting('app.current_tenant_id', true);
  IF tenant_scope !~ '^org/[^/]+/project/[^/]+/environment/[^/]+$'
     OR split_part(tenant_scope, '/', 2) <> intent_record."organizationId"
     OR split_part(tenant_scope, '/', 4) <> intent_record."projectId" THEN
    RAISE EXCEPTION 'audit intent is outside the active project scope';
  END IF;

  UPDATE public."PlatformAuditEvent"
  SET "status" = p_status,
      "failureReason" = CASE WHEN p_status = 'FAILED' THEN left(COALESCE(p_failure_reason, 'Project usage change failed.'), 1000) ELSE NULL END
  WHERE "id" = p_intent_id;
  RETURN TRUE;
END
$$;

ALTER FUNCTION public.resolve_platform_audit_intent(TEXT, TEXT, TEXT) OWNER TO orbitox_audit_resolver;
REVOKE ALL ON FUNCTION public.resolve_platform_audit_intent(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_platform_audit_intent(TEXT, TEXT, TEXT) TO orbitox_runtime;

CREATE OR REPLACE FUNCTION public.recover_stale_platform_audit_intents(
  p_stale_before TIMESTAMPTZ,
  p_limit INTEGER DEFAULT 100
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  recovered_count INTEGER;
BEGIN
  IF session_user <> 'orbitox_maintenance' THEN
    RAISE EXCEPTION 'only orbitox_maintenance may recover stale audit intents';
  END IF;
  IF p_limit < 1 OR p_limit > 1000 THEN
    RAISE EXCEPTION 'p_limit must be between 1 and 1000';
  END IF;

  WITH stale AS (
    SELECT "id"
    FROM public."PlatformAuditEvent"
    WHERE "status" = 'PENDING' AND "occurredAt" <= p_stale_before
    ORDER BY "occurredAt"
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  )
  UPDATE public."PlatformAuditEvent" AS event
  SET "status" = 'FAILED',
      "failureReason" = 'Recovered as interrupted before the usage transaction committed.'
  FROM stale
  WHERE event."id" = stale."id";
  GET DIAGNOSTICS recovered_count = ROW_COUNT;
  RETURN recovered_count;
END
$$;

ALTER FUNCTION public.recover_stale_platform_audit_intents(TIMESTAMPTZ, INTEGER) OWNER TO orbitox_audit_recovery;
REVOKE CREATE ON SCHEMA public FROM orbitox_audit_resolver, orbitox_audit_recovery;
REVOKE ALL ON FUNCTION public.recover_stale_platform_audit_intents(TIMESTAMPTZ, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recover_stale_platform_audit_intents(TIMESTAMPTZ, INTEGER) TO orbitox_maintenance;
