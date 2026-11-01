-- Migration 20261101010000_orbitox_phase3_billing_webhook_and_grant_revision
-- Implements Phase 3 Review G2 (BillingWebhookEvent with restricted column grants)
-- and G3 (PluginGrantRevision for durable monotonic revision rollback protection)

-- 1. CreateTable BillingWebhookEvent
CREATE TABLE IF NOT EXISTS "BillingWebhookEvent" (
    "eventId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "result" JSONB,

    CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("eventId")
);

CREATE INDEX IF NOT EXISTS "BillingWebhookEvent_provider_receivedAt_idx" ON "BillingWebhookEvent"("provider", "receivedAt");

-- Restricted grants on BillingWebhookEvent for orbitox_runtime (G2)
-- runtime: INSERT and SELECT, UPDATE ONLY on processedAt and result, NO DELETE
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_runtime') THEN
        REVOKE ALL ON TABLE "BillingWebhookEvent" FROM orbitox_runtime;
        GRANT SELECT, INSERT ON TABLE "BillingWebhookEvent" TO orbitox_runtime;
        GRANT UPDATE ("processedAt", "result") ON TABLE "BillingWebhookEvent" TO orbitox_runtime;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_maintenance') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "BillingWebhookEvent" TO orbitox_maintenance;
    END IF;
END
$$;

-- 2. CreateTable PluginGrantRevision
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
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_runtime') THEN
        GRANT SELECT, INSERT, UPDATE ON TABLE "PluginGrantRevision" TO orbitox_runtime;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_maintenance') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "PluginGrantRevision" TO orbitox_maintenance;
    END IF;
END
$$;
