-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "planId" TEXT NOT NULL DEFAULT 'starter',
    "orbitoxProjectId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "gstin" TEXT,
    "retentionUntil" TIMESTAMP(3),
    "onboardingState" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'OPERATIONAL',
    "serviceAreasCount" INTEGER NOT NULL DEFAULT 0,
    "activeTablesCount" INTEGER NOT NULL DEFAULT 0,
    "openingHours" JSONB,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Floor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Dining',
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "activeLayout" TEXT NOT NULL DEFAULT 'default',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "tableIds" JSONB,
    "serviceLayouts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Floor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableFloor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "numericId" INTEGER,
    "number" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "minimumSeats" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "x" INTEGER NOT NULL DEFAULT 0,
    "y" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER NOT NULL DEFAULT 80,
    "height" INTEGER NOT NULL DEFAULT 80,
    "rotation" INTEGER NOT NULL DEFAULT 0,
    "shape" TEXT NOT NULL DEFAULT 'rectangle',
    "section" TEXT NOT NULL DEFAULT 'Main Courtyard',
    "floorId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "locator" TEXT NOT NULL,
    "seats" JSONB,
    "activeSessionId" TEXT,
    "activeBillMinor" INTEGER,
    "serverName" TEXT,
    "turnTimeMinutes" INTEGER,
    "mergedWithTableIds" JSONB,
    "mergedPartyLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableFloor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "basePriceMinor" INTEGER NOT NULL,
    "formattedPrice" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "categoryId" TEXT,
    "station" TEXT NOT NULL,
    "prepDurationMinutes" INTEGER NOT NULL DEFAULT 10,
    "allergens" JSONB,
    "dietaryFlags" JSONB,
    "story" TEXT,
    "pairingSuggestions" JSONB,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "isSignature" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "modifierGroups" JSONB,
    "imageUrl" TEXT,
    "hsnCode" TEXT DEFAULT '996331',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchMenuOverride" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "priceOverrideMinor" INTEGER,
    "formattedPriceOverride" TEXT,
    "customPrepMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchMenuOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tableNumber" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "branchId" TEXT,
    "guestName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "items" JSONB NOT NULL,
    "subtotalMinor" INTEGER NOT NULL,
    "taxMinor" INTEGER NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "customer" JSONB,
    "orderToken" TEXT,
    "idempotencyKey" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "paymentSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KitchenTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "tableNumber" TEXT NOT NULL,
    "branchId" TEXT,
    "seatNumber" TEXT,
    "guestName" TEXT,
    "itemName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "station" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "fireAt" TEXT,
    "targetServeAt" TEXT,
    "elapsedMinutes" INTEGER NOT NULL DEFAULT 0,
    "slaMinutes" INTEGER NOT NULL DEFAULT 0,
    "modifiers" JSONB,
    "course" TEXT,
    "fulfilledItemCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KitchenTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tableNumber" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiningSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tableNumber" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "hostName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "guestCapabilityTokens" JSONB,
    "settlement" JSONB,

    CONSTRAINT "DiningSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tableNumber" TEXT NOT NULL,
    "seatId" TEXT,
    "seatLabel" TEXT,
    "role" TEXT NOT NULL DEFAULT 'WALK_IN',
    "joinTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "preferences" JSONB,
    "orderIds" JSONB,
    "totalSpendMinor" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffMember" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "station" TEXT,
    "salt" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "permissions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffTokenRevocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tokenJti" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "StaffTokenRevocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantBrandConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantBrandConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "producer" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "floorId" TEXT,
    "tableNumber" TEXT,
    "payload" JSONB NOT NULL,

    CONSTRAINT "DomainEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "key" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("tenantId","key")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "gstin" TEXT NOT NULL,
    "subtotalMinor" INTEGER NOT NULL,
    "taxMinor" INTEGER NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "itemBreakdown" JSONB NOT NULL,
    "taxBreakdown" JSONB NOT NULL,
    "customer" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RazorpayPaymentSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "tableNumber" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'created',
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RazorpayPaymentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerInvite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantDomain" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "verificationToken" TEXT NOT NULL,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "sslStatus" TEXT NOT NULL DEFAULT 'NOT_PROVISIONED',
    "lastCheckedAt" TIMESTAMP(3),
    "cnameTarget" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantPaymentConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "encryptedKeyId" TEXT,
    "encryptedKeySecret" TEXT,
    "encryptedWebhookSecret" TEXT,
    "gstin" TEXT,
    "legalEntityName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantPaymentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Branch_tenantId_idx" ON "Branch"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_tenantId_code_key" ON "Branch"("tenantId", "code");

-- CreateIndex
CREATE INDEX "Floor_tenantId_idx" ON "Floor"("tenantId");

-- CreateIndex
CREATE INDEX "Floor_tenantId_branchId_idx" ON "Floor"("tenantId", "branchId");

-- CreateIndex
CREATE INDEX "TableFloor_tenantId_idx" ON "TableFloor"("tenantId");

-- CreateIndex
CREATE INDEX "TableFloor_tenantId_floorId_idx" ON "TableFloor"("tenantId", "floorId");

-- CreateIndex
CREATE UNIQUE INDEX "TableFloor_tenantId_locator_key" ON "TableFloor"("tenantId", "locator");

-- CreateIndex
CREATE UNIQUE INDEX "TableFloor_tenantId_branchId_number_key" ON "TableFloor"("tenantId", "branchId", "number");

-- CreateIndex
CREATE INDEX "MenuCategory_tenantId_idx" ON "MenuCategory"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuCategory_tenantId_name_key" ON "MenuCategory"("tenantId", "name");

-- CreateIndex
CREATE INDEX "MenuItem_tenantId_idx" ON "MenuItem"("tenantId");

-- CreateIndex
CREATE INDEX "MenuItem_tenantId_category_idx" ON "MenuItem"("tenantId", "category");

-- CreateIndex
CREATE INDEX "BranchMenuOverride_tenantId_idx" ON "BranchMenuOverride"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "BranchMenuOverride_tenantId_branchId_itemId_key" ON "BranchMenuOverride"("tenantId", "branchId", "itemId");

-- CreateIndex
CREATE INDEX "RestaurantOrder_tenantId_idx" ON "RestaurantOrder"("tenantId");

-- CreateIndex
CREATE INDEX "RestaurantOrder_tenantId_sessionId_idx" ON "RestaurantOrder"("tenantId", "sessionId");

-- CreateIndex
CREATE INDEX "RestaurantOrder_tenantId_status_idx" ON "RestaurantOrder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "KitchenTask_tenantId_idx" ON "KitchenTask"("tenantId");

-- CreateIndex
CREATE INDEX "KitchenTask_tenantId_orderId_idx" ON "KitchenTask"("tenantId", "orderId");

-- CreateIndex
CREATE INDEX "KitchenTask_tenantId_status_idx" ON "KitchenTask"("tenantId", "status");

-- CreateIndex
CREATE INDEX "KitchenTask_tenantId_station_idx" ON "KitchenTask"("tenantId", "station");

-- CreateIndex
CREATE INDEX "ServiceRequest_tenantId_idx" ON "ServiceRequest"("tenantId");

-- CreateIndex
CREATE INDEX "ServiceRequest_tenantId_status_idx" ON "ServiceRequest"("tenantId", "status");

-- CreateIndex
CREATE INDEX "DiningSession_tenantId_idx" ON "DiningSession"("tenantId");

-- CreateIndex
CREATE INDEX "DiningSession_tenantId_tableNumber_idx" ON "DiningSession"("tenantId", "tableNumber");

-- CreateIndex
CREATE INDEX "DiningSession_tenantId_status_idx" ON "DiningSession"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Guest_tenantId_idx" ON "Guest"("tenantId");

-- CreateIndex
CREATE INDEX "Guest_tenantId_tableNumber_idx" ON "Guest"("tenantId", "tableNumber");

-- CreateIndex
CREATE INDEX "StaffMember_tenantId_idx" ON "StaffMember"("tenantId");

-- CreateIndex
CREATE INDEX "StaffMember_tenantId_branchId_idx" ON "StaffMember"("tenantId", "branchId");

-- CreateIndex
CREATE INDEX "StaffTokenRevocation_tenantId_idx" ON "StaffTokenRevocation"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffTokenRevocation_tenantId_tokenJti_key" ON "StaffTokenRevocation"("tenantId", "tokenJti");

-- CreateIndex
CREATE UNIQUE INDEX "TenantBrandConfig_tenantId_key" ON "TenantBrandConfig"("tenantId");

-- CreateIndex
CREATE INDEX "SupportTicket_tenantId_idx" ON "SupportTicket"("tenantId");

-- CreateIndex
CREATE INDEX "DomainEvent_tenantId_idx" ON "DomainEvent"("tenantId");

-- CreateIndex
CREATE INDEX "DomainEvent_tenantId_sequence_idx" ON "DomainEvent"("tenantId", "sequence");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_tenantId_idx" ON "IdempotencyRecord"("tenantId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_idx" ON "Invoice"("tenantId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_fiscalYear_idx" ON "Invoice"("tenantId", "fiscalYear");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_tenantId_invoiceNumber_key" ON "Invoice"("tenantId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_tenantId_orderId_key" ON "Invoice"("tenantId", "orderId");

-- CreateIndex
CREATE INDEX "RazorpayPaymentSession_tenantId_idx" ON "RazorpayPaymentSession"("tenantId");

-- CreateIndex
CREATE INDEX "RazorpayPaymentSession_tenantId_id_idx" ON "RazorpayPaymentSession"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "RazorpayPaymentSession_tenantId_orderId_key" ON "RazorpayPaymentSession"("tenantId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerInvite_tokenHash_key" ON "OwnerInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "OwnerInvite_tenantId_idx" ON "OwnerInvite"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantDomain_domain_key" ON "TenantDomain"("domain");

-- CreateIndex
CREATE INDEX "TenantDomain_tenantId_idx" ON "TenantDomain"("tenantId");

-- CreateIndex
CREATE INDEX "TenantDomain_domain_idx" ON "TenantDomain"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "TenantPaymentConfig_tenantId_key" ON "TenantPaymentConfig"("tenantId");

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Floor" ADD CONSTRAINT "Floor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableFloor" ADD CONSTRAINT "TableFloor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuCategory" ADD CONSTRAINT "MenuCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchMenuOverride" ADD CONSTRAINT "BranchMenuOverride_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrder" ADD CONSTRAINT "RestaurantOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenTask" ADD CONSTRAINT "KitchenTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiningSession" ADD CONSTRAINT "DiningSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTokenRevocation" ADD CONSTRAINT "StaffTokenRevocation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantBrandConfig" ADD CONSTRAINT "TenantBrandConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainEvent" ADD CONSTRAINT "DomainEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyRecord" ADD CONSTRAINT "IdempotencyRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RazorpayPaymentSession" ADD CONSTRAINT "RazorpayPaymentSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerInvite" ADD CONSTRAINT "OwnerInvite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantDomain" ADD CONSTRAINT "TenantDomain_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantPaymentConfig" ADD CONSTRAINT "TenantPaymentConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ─────────────────────────────────────────────────────────────
-- APPLICATION ROLES & ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────

-- 1. Create runtime application role with NOSUPERUSER NOBYPASSRLS
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'restaurantos_app') THEN
    CREATE ROLE restaurantos_app WITH NOSUPERUSER NOBYPASSRLS;
  END IF;
END
$$;

-- 2. Grants for restaurantos_app on public schema
GRANT USAGE ON SCHEMA public TO restaurantos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO restaurantos_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO restaurantos_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO restaurantos_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO restaurantos_app;

-- 3. Enable & FORCE Row Level Security on all 22 tenant tables with strict isolation policy
DO $$
DECLARE
  tbl text;
  tenant_tables text[] := ARRAY[
    'Branch',
    'Floor',
    'TableFloor',
    'MenuCategory',
    'MenuItem',
    'BranchMenuOverride',
    'RestaurantOrder',
    'KitchenTask',
    'ServiceRequest',
    'DiningSession',
    'Guest',
    'StaffMember',
    'StaffTokenRevocation',
    'TenantBrandConfig',
    'SupportTicket',
    'DomainEvent',
    'IdempotencyRecord',
    'Invoice',
    'RazorpayPaymentSession',
    'OwnerInvite',
    'TenantDomain',
    'TenantPaymentConfig'
  ];
BEGIN
  FOREACH tbl IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', tbl);
    EXECUTE format('CREATE POLICY tenant_isolation_policy ON %I FOR ALL TO restaurantos_app USING ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')) WITH CHECK ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), ''''));', tbl);
  END LOOP;
END
$$;
