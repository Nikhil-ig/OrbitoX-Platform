-- Phase 2b-3 & R5: Grant Hygiene & HMS Staff Identity Schema

-- R5 Grant Hygiene: Revoke PlatformImporterLease from runtime, Restrict BridgeNonce delete
REVOKE ALL ON "PlatformImporterLease" FROM orbitox_runtime;
REVOKE DELETE ON "BridgeNonce" FROM orbitox_runtime;
GRANT INSERT, SELECT ON "BridgeNonce" TO orbitox_runtime;

-- R3 Audit Role Access on HmsPhiAccessLog
CREATE POLICY "HmsPhiAccessLog_audit_select" ON "HmsPhiAccessLog"
  FOR SELECT TO orbitox_platform_admin_audit
  USING ("tenantId" = app_current_tenant());
GRANT SELECT ON "HmsPhiAccessLog" TO orbitox_platform_admin_audit;

-- 2b-3 HMS Role Table
CREATE TABLE IF NOT EXISTS "HmsRole" (
  "tenantId" TEXT NOT NULL DEFAULT app_current_tenant(),
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "HmsRole_pkey" PRIMARY KEY ("tenantId", "id"),
  CONSTRAINT "HmsRole_tenantId_name_key" UNIQUE ("tenantId", "name")
);

-- 2b-3 HMS Role Permission Table
CREATE TABLE IF NOT EXISTS "HmsRolePermission" (
  "tenantId" TEXT NOT NULL DEFAULT app_current_tenant(),
  "roleId" TEXT NOT NULL,
  "permission" TEXT NOT NULL,
  CONSTRAINT "HmsRolePermission_pkey" PRIMARY KEY ("tenantId", "roleId", "permission"),
  CONSTRAINT "HmsRolePermission_tenantId_roleId_fkey" FOREIGN KEY ("tenantId", "roleId")
    REFERENCES "HmsRole"("tenantId", "id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- 2b-3 HMS Staff Credential Table
CREATE TABLE IF NOT EXISTS "HmsStaffCredential" (
  "tenantId" TEXT NOT NULL DEFAULT app_current_tenant(),
  "staffId" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "salt" TEXT NOT NULL,
  "failedAttempts" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMPTZ,
  "lastLoginAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "HmsStaffCredential_pkey" PRIMARY KEY ("tenantId", "staffId"),
  CONSTRAINT "HmsStaffCredential_tenantId_staffId_fkey" FOREIGN KEY ("tenantId", "staffId")
    REFERENCES "HmsStaff"("tenantId", "id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- 2b-3 HMS Staff Session Table
CREATE TABLE IF NOT EXISTS "HmsStaffSession" (
  "tenantId" TEXT NOT NULL DEFAULT app_current_tenant(),
  "id" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "absoluteExpiresAt" TIMESTAMPTZ NOT NULL,
  "revokedAt" TIMESTAMPTZ,
  "userAgent" TEXT,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "HmsStaffSession_pkey" PRIMARY KEY ("tenantId", "id"),
  CONSTRAINT "HmsStaffSession_tenantId_tokenHash_key" UNIQUE ("tenantId", "tokenHash"),
  CONSTRAINT "HmsStaffSession_tenantId_staffId_fkey" FOREIGN KEY ("tenantId", "staffId")
    REFERENCES "HmsStaff"("tenantId", "id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "HmsStaffSession_tenantId_roleId_fkey" FOREIGN KEY ("tenantId", "roleId")
    REFERENCES "HmsRole"("tenantId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "HmsStaffSession_tenantId_staffId_idx" ON "HmsStaffSession"("tenantId", "staffId");

-- Forced RLS on all 4 new tables
ALTER TABLE "HmsRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HmsRole" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON "HmsRole" FROM PUBLIC;
CREATE POLICY "HmsRole_tenant" ON "HmsRole" FOR ALL TO orbitox_runtime
  USING ("tenantId" = app_current_tenant()) WITH CHECK ("tenantId" = app_current_tenant());
GRANT SELECT, INSERT, UPDATE, DELETE ON "HmsRole" TO orbitox_runtime;

ALTER TABLE "HmsRolePermission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HmsRolePermission" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON "HmsRolePermission" FROM PUBLIC;
CREATE POLICY "HmsRolePermission_tenant" ON "HmsRolePermission" FOR ALL TO orbitox_runtime
  USING ("tenantId" = app_current_tenant()) WITH CHECK ("tenantId" = app_current_tenant());
GRANT SELECT, INSERT, UPDATE, DELETE ON "HmsRolePermission" TO orbitox_runtime;

ALTER TABLE "HmsStaffCredential" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HmsStaffCredential" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON "HmsStaffCredential" FROM PUBLIC;
CREATE POLICY "HmsStaffCredential_tenant" ON "HmsStaffCredential" FOR ALL TO orbitox_runtime
  USING ("tenantId" = app_current_tenant()) WITH CHECK ("tenantId" = app_current_tenant());
GRANT SELECT, INSERT, UPDATE, DELETE ON "HmsStaffCredential" TO orbitox_runtime;

ALTER TABLE "HmsStaffSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HmsStaffSession" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON "HmsStaffSession" FROM PUBLIC;
CREATE POLICY "HmsStaffSession_tenant" ON "HmsStaffSession" FOR ALL TO orbitox_runtime
  USING ("tenantId" = app_current_tenant()) WITH CHECK ("tenantId" = app_current_tenant());
GRANT SELECT, INSERT, UPDATE, DELETE ON "HmsStaffSession" TO orbitox_runtime;
