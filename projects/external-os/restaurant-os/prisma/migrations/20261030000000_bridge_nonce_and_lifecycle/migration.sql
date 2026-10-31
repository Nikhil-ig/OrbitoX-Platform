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

-- Outbox DomainEvent LISTEN/NOTIFY Trigger
CREATE OR REPLACE FUNCTION public.notify_restaurant_kds_events()
  RETURNS trigger
  LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM pg_notify('restaurant_kds_events', json_build_object(
    'id', NEW.id,
    'tenantId', NEW."tenantId",
    'sequence', NEW."sequence",
    'type', NEW."type",
    'producer', NEW."producer",
    'branchId', NEW."branchId",
    'floorId', NEW."floorId",
    'tableNumber', NEW."tableNumber",
    'payload', NEW."payload"
  )::text);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_restaurant_kds_events ON "DomainEvent";
CREATE TRIGGER trg_restaurant_kds_events
  AFTER INSERT ON "DomainEvent"
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_restaurant_kds_events();

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'restaurantos_app') THEN
    GRANT EXECUTE ON FUNCTION public.notify_restaurant_kds_events() TO restaurantos_app;
  END IF;
END
$$;

