-- Migration: 20261027000700_orbitox_phase2_step3_audit_previous_value
-- Grant orbitox_audit_resolver SELECT and UPDATE permissions on "metadata" to record the true atomic previousValue
GRANT SELECT ("metadata") ON public."PlatformAuditEvent" TO orbitox_audit_resolver;
GRANT UPDATE ("status", "failureReason", "metadata") ON public."PlatformAuditEvent" TO orbitox_audit_resolver;

-- Drop previous 3-parameter overload to prevent ambiguity
DROP FUNCTION IF EXISTS public.resolve_platform_audit_intent(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.resolve_platform_audit_intent(
  p_intent_id TEXT,
  p_status TEXT,
  p_failure_reason TEXT DEFAULT NULL,
  p_previous_value BIGINT DEFAULT NULL
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
      "metadata" = CASE
        WHEN p_previous_value IS NOT NULL THEN
          jsonb_set(COALESCE("metadata", '{}'::jsonb), '{previousValue}', to_jsonb(p_previous_value))
        ELSE "metadata"
      END,
      "failureReason" = CASE WHEN p_status = 'FAILED' THEN left(COALESCE(p_failure_reason, 'Project usage change failed.'), 1000) ELSE NULL END
  WHERE "id" = p_intent_id;
  RETURN TRUE;
END
$$;

ALTER FUNCTION public.resolve_platform_audit_intent(TEXT, TEXT, TEXT, BIGINT) OWNER TO orbitox_audit_resolver;
REVOKE ALL ON FUNCTION public.resolve_platform_audit_intent(TEXT, TEXT, TEXT, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_platform_audit_intent(TEXT, TEXT, TEXT, BIGINT) TO orbitox_runtime;
