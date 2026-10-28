-- Migration: 20261028000100_orbitox_phase2_step4_period_quota
-- Add currentBillingPeriod to PlatformProject for zero-maintenance period-keyed quota tracking
ALTER TABLE "PlatformProject" ADD COLUMN IF NOT EXISTS "currentBillingPeriod" TEXT;
UPDATE "PlatformProject" 
SET "currentBillingPeriod" = to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM') 
WHERE "currentBillingPeriod" IS NULL;

-- Ensure orbitox_runtime has full DML on PlatformProject
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "PlatformProject" TO orbitox_runtime;
