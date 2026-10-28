-- Step 5: Enforce database grant boundary on platform importer control-plane tables
-- orbitox_runtime and audit roles must NOT have write grants (INSERT, UPDATE, DELETE) on PlatformOrganization and packages
REVOKE INSERT, UPDATE, DELETE ON TABLE "PlatformOrganization" FROM orbitox_runtime;
REVOKE INSERT, UPDATE, DELETE ON TABLE "PlatformPackage" FROM orbitox_runtime;
REVOKE INSERT, UPDATE, DELETE ON TABLE "PackageVersion" FROM orbitox_runtime;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_platform_admin_audit') THEN
    REVOKE INSERT, UPDATE, DELETE ON TABLE "PlatformOrganization" FROM orbitox_platform_admin_audit;
    REVOKE INSERT, UPDATE, DELETE ON TABLE "PlatformPackage" FROM orbitox_platform_admin_audit;
    REVOKE INSERT, UPDATE, DELETE ON TABLE "PackageVersion" FROM orbitox_platform_admin_audit;
  END IF;
END $$;
