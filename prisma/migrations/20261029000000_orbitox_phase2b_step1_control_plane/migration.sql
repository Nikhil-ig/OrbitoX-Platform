-- AlterTable
ALTER TABLE "PlatformApiKey" ADD COLUMN IF NOT EXISTS "verifierPepperId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PlatformImporterLease" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "holder" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "PlatformImporterLease_pkey" PRIMARY KEY ("id")
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON "PlatformImporterLease" TO orbitox_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON "PlatformImporterLease" TO orbitox_maintenance;

-- CreateTable
CREATE TABLE IF NOT EXISTS "BridgeNonce" (
    "nonce" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "BridgeNonce_pkey" PRIMARY KEY ("nonce")
);

GRANT SELECT, INSERT, DELETE ON "BridgeNonce" TO orbitox_runtime;
GRANT SELECT, INSERT, DELETE ON "BridgeNonce" TO orbitox_maintenance;
