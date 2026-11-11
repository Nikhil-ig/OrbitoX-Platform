-- Migration 20261102000000_orbitox_phase5_operation_lease
-- Add distributed lease acquisition and heartbeat columns to PlatformOperation

ALTER TABLE "PlatformOperation" ADD COLUMN IF NOT EXISTS "leaseOwner" TEXT;
ALTER TABLE "PlatformOperation" ADD COLUMN IF NOT EXISTS "leaseExpiresAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "PlatformOperation_leaseExpiresAt_idx" ON "PlatformOperation"("leaseExpiresAt");
