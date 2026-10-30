-- AlterTable
ALTER TABLE "KitchenTask" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "RestaurantOrder" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "entitlementRevision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastLifecycleKey" TEXT;

-- CreateTable
CREATE TABLE "BridgeNonce" (
    "nonce" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "BridgeNonce_pkey" PRIMARY KEY ("nonce")
);

-- CreateIndex
CREATE INDEX "BridgeNonce_expiresAt_idx" ON "BridgeNonce"("expiresAt");

-- Security Grants for BridgeNonce (no tenant column: runtime role can only INSERT and SELECT; purge by maintenance/superuser only)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'restaurantos_app') THEN
    REVOKE ALL ON TABLE "BridgeNonce" FROM restaurantos_app;
    GRANT SELECT, INSERT ON TABLE "BridgeNonce" TO restaurantos_app;
  END IF;
END
$$;
