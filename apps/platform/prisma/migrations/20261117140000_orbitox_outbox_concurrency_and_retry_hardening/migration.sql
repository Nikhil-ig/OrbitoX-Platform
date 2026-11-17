-- Migration: 20261117140000_orbitox_outbox_concurrency_and_retry_hardening
-- Purpose: Atomic worker claiming, durable retry scheduling, and database-enforced event deduplication

-- 1. Add PROCESSING to OutboxStatus enum safely
ALTER TYPE "OutboxStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';

-- 2. Add lease, retry scheduling, and deduplication columns
ALTER TABLE "PlatformOutboxMessage"
  ADD COLUMN IF NOT EXISTS "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS "claimOwner" TEXT,
  ADD COLUMN IF NOT EXISTS "claimExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "nextAttemptAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deduplicationKey" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 3. Backfill deduplicationKey for existing tenant.ready events (0 duplicates exist)
UPDATE "PlatformOutboxMessage"
SET "deduplicationKey" = 'tenant.ready:' || "aggregateId"
WHERE "eventType" = 'tenant.ready' AND "deduplicationKey" IS NULL;

-- 4. Create partial unique index on (tenantId, deduplicationKey)
CREATE UNIQUE INDEX IF NOT EXISTS "PlatformOutboxMessage_tenant_dedup_idx"
  ON "PlatformOutboxMessage"("tenantId", "deduplicationKey")
  WHERE "deduplicationKey" IS NOT NULL;

-- 5. Performance indexes for worker claiming and lease cleanup
CREATE INDEX IF NOT EXISTS "PlatformOutboxMessage_status_nextAttemptAt_idx"
  ON "PlatformOutboxMessage"("status", "nextAttemptAt");

CREATE INDEX IF NOT EXISTS "PlatformOutboxMessage_claim_idx"
  ON "PlatformOutboxMessage"("claimOwner", "claimExpiresAt");

-- 6. Grant restricted UPDATE permissions to orbitox_outbox_relay
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_outbox_relay') THEN
    GRANT UPDATE ("status", "retryCount", "maxAttempts", "lastError", "claimOwner", "claimExpiresAt", "nextAttemptAt", "deduplicationKey", "updatedAt", "dispatchedAt")
      ON TABLE "PlatformOutboxMessage" TO orbitox_outbox_relay;
  END IF;
END
$$;
