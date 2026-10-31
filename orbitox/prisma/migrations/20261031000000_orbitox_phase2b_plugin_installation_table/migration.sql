-- CreateTable
CREATE TABLE IF NOT EXISTS "PluginInstallation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "runtimeTenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "entitlementRevision" INTEGER NOT NULL DEFAULT 1,
    "planId" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PluginInstallation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PluginInstallation_tenantId_pluginId_key" ON "PluginInstallation"("tenantId", "pluginId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PluginInstallation_runtimeTenantId_pluginId_key" ON "PluginInstallation"("runtimeTenantId", "pluginId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PluginInstallation_tenantId_idx" ON "PluginInstallation"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PluginInstallation_runtimeTenantId_idx" ON "PluginInstallation"("runtimeTenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PluginInstallation_pluginId_idx" ON "PluginInstallation"("pluginId");

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "PluginInstallation" TO orbitox_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "PluginInstallation" TO orbitox_maintenance;
