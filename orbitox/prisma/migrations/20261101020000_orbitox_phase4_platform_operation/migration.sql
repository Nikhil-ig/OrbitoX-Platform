-- Migration 20261101020000_orbitox_phase4_platform_operation
-- Durable operation tracking for Phase 4 2-minute tenant provisioning sagas

CREATE TABLE IF NOT EXISTS "PlatformOperation" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TENANT_PROVISION',
    "tenantId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROVISIONING',
    "steps" JSONB NOT NULL DEFAULT '[]',
    "request" JSONB NOT NULL DEFAULT '{}',
    "result" JSONB,
    "error" TEXT,
    "operatorId" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PlatformOperation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PlatformOperation_organizationId_idx" ON "PlatformOperation"("organizationId");
CREATE INDEX IF NOT EXISTS "PlatformOperation_tenantId_idx" ON "PlatformOperation"("tenantId");
CREATE INDEX IF NOT EXISTS "PlatformOperation_status_idx" ON "PlatformOperation"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "PlatformOperation_org_idempotency_idx" ON "PlatformOperation"("organizationId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;

-- Restricted grants on PlatformOperation for orbitox_runtime and orbitox_maintenance
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_runtime') THEN
        GRANT SELECT, INSERT, UPDATE ON TABLE "PlatformOperation" TO orbitox_runtime;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_maintenance') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "PlatformOperation" TO orbitox_maintenance;
    END IF;
END
$$;
