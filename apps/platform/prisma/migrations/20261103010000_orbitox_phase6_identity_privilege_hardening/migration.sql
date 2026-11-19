ALTER TABLE "PlatformOperator"
  ADD COLUMN "lastTotpStep" INTEGER;

ALTER TABLE "CustomerUser"
  ADD COLUMN "lastTotpStep" INTEGER;

DO $$
DECLARE
  identity_tables TEXT[] := ARRAY[
    'PlatformOperator',
    'PlatformOperatorSession',
    'PlatformOperatorBackupCode',
    'CustomerUser',
    'CustomerMembership',
    'AccountToken',
    'CustomerSession',
    'AccountAuthRateLimitBucket',
    'AccountEmailOutbox'
  ];
  identity_table TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_runtime') THEN
    FOREACH identity_table IN ARRAY identity_tables LOOP
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM orbitox_runtime', identity_table);
    END LOOP;

    GRANT SELECT ON TABLE public."PlatformOperator" TO orbitox_runtime;
    GRANT UPDATE (
      "failedLogins",
      "failureWindowStartedAt",
      "lockedUntil",
      "passwordHash",
      "mfaTotpSealed",
      "updatedAt"
    ) ON TABLE public."PlatformOperator" TO orbitox_runtime;
    GRANT SELECT, INSERT, UPDATE ON TABLE public."PlatformOperatorSession" TO orbitox_runtime;
    GRANT SELECT, INSERT, UPDATE ON TABLE public."PlatformOperatorBackupCode" TO orbitox_runtime;
    GRANT SELECT, INSERT, UPDATE ON TABLE public."CustomerUser" TO orbitox_runtime;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."CustomerMembership" TO orbitox_runtime;
    GRANT SELECT, INSERT, UPDATE ON TABLE public."AccountToken" TO orbitox_runtime;
    GRANT SELECT, INSERT, UPDATE ON TABLE public."CustomerSession" TO orbitox_runtime;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."AccountAuthRateLimitBucket" TO orbitox_runtime;
    GRANT SELECT, INSERT, UPDATE ON TABLE public."AccountEmailOutbox" TO orbitox_runtime;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_platform_admin_audit') THEN
    FOREACH identity_table IN ARRAY identity_tables LOOP
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM orbitox_platform_admin_audit', identity_table);
    END LOOP;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_maintenance') THEN
    FOREACH identity_table IN ARRAY identity_tables LOOP
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO orbitox_maintenance', identity_table);
    END LOOP;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.consume_platform_operator_totp_step(
  operator_id TEXT,
  totp_step INTEGER,
  changed_at TIMESTAMPTZ
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE public."PlatformOperator"
  SET "lastTotpStep" = totp_step,
      "updatedAt" = changed_at
  WHERE "id" = operator_id
    AND COALESCE("lastTotpStep", -1) < totp_step;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_platform_operator_totp_step(TEXT, INTEGER, TIMESTAMPTZ) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_runtime') THEN
    GRANT EXECUTE ON FUNCTION public.consume_platform_operator_totp_step(TEXT, INTEGER, TIMESTAMPTZ) TO orbitox_runtime;
  END IF;
END;
$$;
