-- Migration 20261101010000_orbitox_phase3_restaurant_grant_revision
-- Implements Phase 3 Review G3 and G6: PluginGrantRevision in RestaurantOS PostgreSQL database

CREATE TABLE IF NOT EXISTS "PluginGrantRevision" (
    "tenantId" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "highestRevision" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PluginGrantRevision_pkey" PRIMARY KEY ("tenantId", "pluginId")
);

CREATE INDEX IF NOT EXISTS "PluginGrantRevision_tenantId_idx" ON "PluginGrantRevision"("tenantId");

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'restaurantos_app') THEN
        GRANT SELECT, INSERT, UPDATE ON TABLE "PluginGrantRevision" TO restaurantos_app;
    END IF;
END
$$;
