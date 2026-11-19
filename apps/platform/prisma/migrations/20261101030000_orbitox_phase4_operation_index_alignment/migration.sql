-- Migration 20261101030000_orbitox_phase4_operation_index_alignment
-- Align PlatformOperation idempotency index with Prisma schema datamodel

DROP INDEX IF EXISTS "PlatformOperation_org_idempotency_idx";

CREATE UNIQUE INDEX "PlatformOperation_organizationId_idempotencyKey_key" ON "PlatformOperation"("organizationId", "idempotencyKey");
