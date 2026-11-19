CREATE TABLE public."CustomerOrganizationClosureContext" (
  "transactionId" BIGINT NOT NULL,
  "organizationId" TEXT NOT NULL,
  CONSTRAINT "CustomerOrganizationClosureContext_pkey"
    PRIMARY KEY ("transactionId", "organizationId")
);

REVOKE ALL ON TABLE public."CustomerOrganizationClosureContext" FROM PUBLIC;
REVOKE ALL ON TABLE public."CustomerOrganizationClosureContext" FROM orbitox_runtime;
REVOKE DELETE ON TABLE public."PlatformOrganization" FROM orbitox_runtime;

CREATE OR REPLACE FUNCTION public.keep_customer_organization_owner() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  old_org TEXT;
  new_org TEXT;
  remaining_owners INTEGER;
  closing_organization BOOLEAN := false;
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

  IF TG_OP = 'DELETE' AND OLD."role" = 'OWNER' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public."CustomerOrganizationClosureContext" context
      WHERE context."transactionId" = txid_current()
        AND context."organizationId" = old_org
    ) AND NOT EXISTS (
      SELECT 1 FROM public."PlatformOrganization" organization
      WHERE organization."id" = old_org
    ) AND session_user = 'orbitox_maintenance'
    INTO closing_organization;

    IF closing_organization THEN
      RETURN OLD;
    END IF;
    must_keep_owner := true;
  ELSIF TG_OP = 'UPDATE' AND OLD."role" = 'OWNER' THEN
    must_keep_owner := NEW."role" <> 'OWNER' OR NEW."organizationId" <> old_org;
  END IF;

  IF must_keep_owner THEN
    SELECT count(*) INTO remaining_owners
      FROM public."CustomerMembership"
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

CREATE OR REPLACE FUNCTION public.close_customer_organization(target_organization_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  IF session_user <> 'orbitox_maintenance' THEN
    RAISE EXCEPTION 'only orbitox_maintenance may close a customer organization'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  INSERT INTO public."CustomerOrganizationClosureContext" ("transactionId", "organizationId")
  VALUES (txid_current(), target_organization_id);

  DELETE FROM public."PlatformOrganization"
  WHERE "id" = target_organization_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  DELETE FROM public."CustomerOrganizationClosureContext"
  WHERE "transactionId" = txid_current()
    AND "organizationId" = target_organization_id;

  RETURN deleted_count = 1;
END
$$;

REVOKE ALL ON FUNCTION public.close_customer_organization(TEXT) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_runtime') THEN
    REVOKE ALL ON FUNCTION public.close_customer_organization(TEXT) FROM orbitox_runtime;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_maintenance') THEN
    GRANT EXECUTE ON FUNCTION public.close_customer_organization(TEXT) TO orbitox_maintenance;
  END IF;
END
$$;
