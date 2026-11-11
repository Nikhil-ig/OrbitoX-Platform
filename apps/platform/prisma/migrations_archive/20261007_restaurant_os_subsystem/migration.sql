-- ─────────────────────────────────────────────────────────────
-- OrbitoX RestaurantOS: Initial Subsystem Schema Migration
-- Database: PostgreSQL 16
-- Tenancy Architecture: Composite Tenant/Location RLS
-- ─────────────────────────────────────────────────────────────

-- 1. Create Enums
CREATE TYPE "RestaurantTableStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'OUT_OF_SERVICE');
CREATE TYPE "DiningSessionStatus" AS ENUM ('ACTIVE', 'BILL_REQUESTED', 'SETTLING', 'CLOSED', 'ABANDONED');
CREATE TYPE "DiningJoinPolicy" AS ENUM ('OPEN_JOIN', 'HOST_APPROVAL', 'STAFF_APPROVAL');
CREATE TYPE "ParticipantRole" AS ENUM ('HOST', 'GUEST', 'STAFF');
CREATE TYPE "JoinRequestStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "CommercialState" AS ENUM ('DRAFT', 'SUBMITTED', 'CONFIRMED', 'REJECTED', 'VOIDED');
CREATE TYPE "FulfillmentState" AS ENUM ('UNFULFILLED', 'PREPARING', 'READY_TO_SERVE', 'SERVED', 'CANCELLED');
CREATE TYPE "OrderPaymentState" AS ENUM ('UNPAID', 'AUTHORIZED', 'PARTIALLY_PAID', 'PAID', 'REFUNDED');
CREATE TYPE "KitchenState" AS ENUM ('NOT_SENT', 'QUEUED', 'IN_PROGRESS', 'EXPEDITED', 'COMPLETED');
CREATE TYPE "ItemPrepStatus" AS ENUM ('PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED');
CREATE TYPE "KitchenStationType" AS ENUM ('HOT_LINE', 'COLD_LINE', 'TANDOOR', 'BAR', 'DESSERT', 'EXPO');
CREATE TYPE "PreparationTaskStatus" AS ENUM ('QUEUED', 'IN_PROGRESS', 'READY', 'DELAYED', 'REOPENED', 'BUMPED');
CREATE TYPE "PaymentRecordStatus" AS ENUM ('INITIATED', 'AUTHORIZED', 'SETTLED', 'FAILED', 'REFUNDED');
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'DISPATCHED', 'FAILED');

-- 2. Restaurant Locations
CREATE TABLE "RestaurantLocation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "address" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "operatingHours" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RestaurantLocation_tenant_company_slug_key" UNIQUE ("tenantId", "companyId", "slug")
);
CREATE INDEX "RestaurantLocation_tenant_company_idx" ON "RestaurantLocation"("tenantId", "companyId");

-- 3. Service Areas (Floors / Patios)
CREATE TABLE "RestaurantServiceArea" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL REFERENCES "RestaurantLocation"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "floorNumber" INTEGER DEFAULT 1,
  "capacity" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RestaurantServiceArea_location_code_key" UNIQUE ("locationId", "code")
);
CREATE INDEX "RestaurantServiceArea_tenant_company_idx" ON "RestaurantServiceArea"("tenantId", "companyId");
CREATE INDEX "RestaurantServiceArea_location_idx" ON "RestaurantServiceArea"("locationId");

-- 4. Restaurant Tables
CREATE TABLE "RestaurantTable" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL REFERENCES "RestaurantLocation"("id") ON DELETE CASCADE,
  "serviceAreaId" TEXT NOT NULL REFERENCES "RestaurantServiceArea"("id") ON DELETE CASCADE,
  "tableNumber" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 4,
  "status" "RestaurantTableStatus" NOT NULL DEFAULT 'AVAILABLE',
  "activeSessionId" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RestaurantTable_location_tableNumber_key" UNIQUE ("locationId", "tableNumber")
);
CREATE INDEX "RestaurantTable_tenant_company_idx" ON "RestaurantTable"("tenantId", "companyId");
CREATE INDEX "RestaurantTable_location_area_idx" ON "RestaurantTable"("locationId", "serviceAreaId");
CREATE INDEX "RestaurantTable_status_idx" ON "RestaurantTable"("status");

-- 5. Persistent QR Identity (Table Locator)
CREATE TABLE "RestaurantQRIdentity" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "tableId" TEXT NOT NULL UNIQUE REFERENCES "RestaurantTable"("id") ON DELETE CASCADE,
  "locator" TEXT NOT NULL UNIQUE,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "redirectUrl" TEXT,
  "securityVersion" INTEGER NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "RestaurantQRIdentity_tenant_loc_idx" ON "RestaurantQRIdentity"("tenantId", "locationId");
CREATE INDEX "RestaurantQRIdentity_locator_idx" ON "RestaurantQRIdentity"("locator");

-- 6. Dining Sessions
CREATE TABLE "RestaurantDiningSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL REFERENCES "RestaurantLocation"("id") ON DELETE CASCADE,
  "tableId" TEXT NOT NULL REFERENCES "RestaurantTable"("id") ON DELETE CASCADE,
  "sessionCode" TEXT NOT NULL,
  "status" "DiningSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "joinPolicy" "DiningJoinPolicy" NOT NULL DEFAULT 'OPEN_JOIN',
  "hostParticipantId" TEXT,
  "accessEpoch" INTEGER NOT NULL DEFAULT 1,
  "version" INTEGER NOT NULL DEFAULT 1,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "RestaurantDiningSession_tenant_company_idx" ON "RestaurantDiningSession"("tenantId", "companyId");
CREATE INDEX "RestaurantDiningSession_table_status_idx" ON "RestaurantDiningSession"("tableId", "status");

-- 7. Session Participants
CREATE TABLE "SessionParticipant" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "diningSessionId" TEXT NOT NULL REFERENCES "RestaurantDiningSession"("id") ON DELETE CASCADE,
  "role" "ParticipantRole" NOT NULL DEFAULT 'GUEST',
  "displayName" TEXT NOT NULL,
  "avatarUrl" TEXT,
  "capabilityTokenHash" TEXT NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leftAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "SessionParticipant_session_active_idx" ON "SessionParticipant"("diningSessionId", "isActive");
CREATE INDEX "SessionParticipant_cap_hash_idx" ON "SessionParticipant"("capabilityTokenHash");

-- 8. Session Join Requests
CREATE TABLE "SessionJoinRequest" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "diningSessionId" TEXT NOT NULL REFERENCES "RestaurantDiningSession"("id") ON DELETE CASCADE,
  "displayName" TEXT NOT NULL,
  "status" "JoinRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "requestTokenHash" TEXT NOT NULL UNIQUE,
  "decidedBy" TEXT,
  "decidedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "SessionJoinRequest_session_status_idx" ON "SessionJoinRequest"("diningSessionId", "status");

-- 9. Menus
CREATE TABLE "RestaurantMenu" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL REFERENCES "RestaurantLocation"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "channel" TEXT NOT NULL DEFAULT 'DINE_IN',
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "schedule" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RestaurantMenu_loc_name_ver_key" UNIQUE ("locationId", "name", "version")
);
CREATE INDEX "RestaurantMenu_tenant_loc_pub_idx" ON "RestaurantMenu"("tenantId", "locationId", "isPublished");

-- 10. Catalog Items
CREATE TABLE "RestaurantCatalogItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL REFERENCES "RestaurantLocation"("id") ON DELETE CASCADE,
  "menuId" TEXT REFERENCES "RestaurantMenu"("id") ON DELETE SET NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sku" TEXT,
  "basePriceMinor" BIGINT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "category" TEXT NOT NULL,
  "imageUrl" TEXT,
  "allergens" TEXT[] NOT NULL DEFAULT '{}',
  "dietaryFlags" TEXT[] NOT NULL DEFAULT '{}',
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "maxDailyQuantity" INTEGER,
  "preparationDurationMinutes" INTEGER NOT NULL DEFAULT 10,
  "stationRouting" TEXT NOT NULL DEFAULT 'KITCHEN',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "RestaurantCatalogItem_loc_avail_idx" ON "RestaurantCatalogItem"("locationId", "isAvailable");
CREATE INDEX "RestaurantCatalogItem_category_idx" ON "RestaurantCatalogItem"("tenantId", "locationId", "category");

-- 11. Modifier Groups & Modifiers
CREATE TABLE "RestaurantModifierGroup" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL REFERENCES "RestaurantCatalogItem"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "minSelections" INTEGER NOT NULL DEFAULT 0,
  "maxSelections" INTEGER NOT NULL DEFAULT 1,
  "isRequired" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "RestaurantModifierGroup_item_idx" ON "RestaurantModifierGroup"("itemId");

CREATE TABLE "RestaurantModifier" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL REFERENCES "RestaurantModifierGroup"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "priceDeltaMinor" BIGINT NOT NULL DEFAULT 0,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "RestaurantModifier_group_idx" ON "RestaurantModifier"("groupId");

-- 12. Recipe BOM & Stock
CREATE TABLE "RestaurantRecipeBOM" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "ingredientId" TEXT NOT NULL,
  "quantityRequired" DOUBLE PRECISION NOT NULL,
  "unit" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RestaurantRecipeBOM_item_ingredient_key" UNIQUE ("itemId", "ingredientId")
);

CREATE TABLE "RestaurantInventoryStock" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "ingredientId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "onHandQuantity" DOUBLE PRECISION NOT NULL,
  "reservedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "unit" TEXT NOT NULL,
  "safetyThreshold" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RestaurantInventoryStock_loc_ingredient_key" UNIQUE ("locationId", "ingredientId")
);
CREATE INDEX "RestaurantInventoryStock_tenant_loc_idx" ON "RestaurantInventoryStock"("tenantId", "locationId");

-- 13. Pricing Quotes
CREATE TABLE "RestaurantPricingQuote" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "inputHash" TEXT NOT NULL,
  "resultHash" TEXT NOT NULL,
  "subtotalMinor" BIGINT NOT NULL,
  "taxMinor" BIGINT NOT NULL,
  "serviceFeeMinor" BIGINT NOT NULL DEFAULT 0,
  "discountMinor" BIGINT NOT NULL DEFAULT 0,
  "totalMinor" BIGINT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "breakdown" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "isRedeemed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "RestaurantPricingQuote_hashes_idx" ON "RestaurantPricingQuote"("inputHash", "resultHash");
CREATE INDEX "RestaurantPricingQuote_expiry_idx" ON "RestaurantPricingQuote"("expiresAt", "isRedeemed");

-- 14. Orders & Items
CREATE TABLE "RestaurantOrder" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL REFERENCES "RestaurantLocation"("id") ON DELETE CASCADE,
  "sessionId" TEXT NOT NULL REFERENCES "RestaurantDiningSession"("id") ON DELETE CASCADE,
  "participantId" TEXT NOT NULL REFERENCES "SessionParticipant"("id") ON DELETE CASCADE,
  "orderNumber" TEXT NOT NULL,
  "commercialState" "CommercialState" NOT NULL DEFAULT 'SUBMITTED',
  "fulfillmentState" "FulfillmentState" NOT NULL DEFAULT 'UNFULFILLED',
  "paymentState" "OrderPaymentState" NOT NULL DEFAULT 'UNPAID',
  "kitchenState" "KitchenState" NOT NULL DEFAULT 'QUEUED',
  "quoteId" TEXT,
  "idempotencyKey" TEXT UNIQUE,
  "totalMinor" BIGINT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "specialInstructions" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "RestaurantOrder_session_time_idx" ON "RestaurantOrder"("sessionId", "createdAt");
CREATE INDEX "RestaurantOrder_states_idx" ON "RestaurantOrder"("commercialState", "fulfillmentState");

CREATE TABLE "RestaurantOrderItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL REFERENCES "RestaurantOrder"("id") ON DELETE CASCADE,
  "itemId" TEXT NOT NULL REFERENCES "RestaurantCatalogItem"("id") ON DELETE RESTRICT,
  "name" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPriceMinor" BIGINT NOT NULL,
  "totalMinor" BIGINT NOT NULL,
  "selectedModifiers" JSONB NOT NULL DEFAULT '[]',
  "preparationStatus" "ItemPrepStatus" NOT NULL DEFAULT 'PENDING',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "RestaurantOrderItem_order_status_idx" ON "RestaurantOrderItem"("orderId", "preparationStatus");

-- 15. Kitchen Stations & Tasks
CREATE TABLE "KitchenStation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL REFERENCES "RestaurantLocation"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "stationType" "KitchenStationType" NOT NULL DEFAULT 'HOT_LINE',
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "maxConcurrentCapacity" INTEGER NOT NULL DEFAULT 10,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KitchenStation_loc_name_key" UNIQUE ("locationId", "name")
);
CREATE INDEX "KitchenStation_tenant_loc_active_idx" ON "KitchenStation"("tenantId", "locationId", "isActive");

CREATE TABLE "KitchenPreparationTask" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "stationId" TEXT NOT NULL REFERENCES "KitchenStation"("id") ON DELETE CASCADE,
  "status" "PreparationTaskStatus" NOT NULL DEFAULT 'QUEUED',
  "targetServeAt" TIMESTAMP(3) NOT NULL,
  "fireAt" TIMESTAMP(3) NOT NULL,
  "estimatedDurationMinutes" INTEGER NOT NULL DEFAULT 10,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "bumpedBy" TEXT,
  "dependencies" JSONB,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "KitchenPreparationTask_queue_idx" ON "KitchenPreparationTask"("stationId", "status", "fireAt");

-- 16. Payment Records
CREATE TABLE "RestaurantPaymentRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "orderId" TEXT,
  "participantId" TEXT,
  "paymentGateway" TEXT NOT NULL,
  "gatewayTransactionId" TEXT,
  "amountMinor" BIGINT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "status" "PaymentRecordStatus" NOT NULL DEFAULT 'INITIATED',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "RestaurantPaymentRecord_session_idx" ON "RestaurantPaymentRecord"("sessionId", "status");

-- 17. Durable Idempotency & Transactional Outbox
CREATE TABLE "PlatformIdempotencyRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "responseStatus" INTEGER NOT NULL,
  "responseBody" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformIdempotencyRecord_tenant_key_scope_key" UNIQUE ("tenantId", "key", "scope")
);
CREATE INDEX "PlatformIdempotencyRecord_expiry_idx" ON "PlatformIdempotencyRecord"("expiresAt");

CREATE TABLE "PlatformOutboxMessage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "aggregateType" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dispatchedAt" TIMESTAMP(3)
);
CREATE INDEX "PlatformOutboxMessage_polling_idx" ON "PlatformOutboxMessage"("status", "createdAt");

-- ─────────────────────────────────────────────────────────────
-- 18. POSTGRESQL ROW-LEVEL SECURITY (RLS) POLICIES
-- ─────────────────────────────────────────────────────────────
ALTER TABLE "RestaurantLocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RestaurantServiceArea" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RestaurantTable" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RestaurantDiningSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SessionParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RestaurantOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RestaurantOrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KitchenPreparationTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RestaurantPaymentRecord" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant_tenant_location_isolation" ON "RestaurantOrder"
  FOR ALL
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)
    AND "locationId" = current_setting('app.current_location_id', true)
  );

CREATE POLICY "restaurant_session_isolation" ON "RestaurantDiningSession"
  FOR ALL
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)
    AND "locationId" = current_setting('app.current_location_id', true)
  );
