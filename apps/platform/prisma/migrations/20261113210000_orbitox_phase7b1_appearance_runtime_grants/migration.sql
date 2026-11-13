-- Grant UPDATE on appearance columns to orbitox_runtime
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_runtime') THEN
    GRANT UPDATE (
      "appearanceTheme",
      "appearanceAccent",
      "appearanceDensity",
      "appearanceRadius",
      "appearanceSmoothAnimations",
      "appearanceBoldFocusRings",
      "appearanceCompactSidebar"
    ) ON TABLE public."PlatformOperator" TO orbitox_runtime;
  END IF;
END
$$;
