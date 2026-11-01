-- Migration 20261101020000_orbitox_phase4_platform_operation
-- Durable operation tracking for Phase 4 2-minute tenant provisioning sagas

-- CreateTable
CREATE TABLE "PlatformOperation" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PlatformOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformOperation_organizationId_idx" ON "PlatformOperation"("organizationId");

-- CreateIndex
CREATE INDEX "PlatformOperation_tenantId_idx" ON "PlatformOperation"("tenantId");

-- CreateIndex
CREATE INDEX "PlatformOperation_status_idx" ON "PlatformOperation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformOperation_organizationId_idempotencyKey_key" ON "PlatformOperation"("organizationId", "idempotencyKey");

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
