-- Migration 20261101040000_orbitox_phase4_operation_updated_at_alignment
-- Align PlatformOperation.updatedAt default with Prisma schema @updatedAt datamodel

ALTER TABLE "PlatformOperation" ALTER COLUMN "updatedAt" DROP DEFAULT;
