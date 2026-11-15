-- Migration: 20261115200000_orbitox_phase7d_customer_onboarding
-- Purpose: Add Customer User profile fields and Organization business metadata (Additive)

ALTER TABLE "CustomerUser" 
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "phone" TEXT;

ALTER TABLE "PlatformOrganization"
  ADD COLUMN IF NOT EXISTS "businessCategory" TEXT DEFAULT 'RESTAURANTS_CAFES',
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "gstin" TEXT;

CREATE INDEX IF NOT EXISTS "idx_customer_user_email_status" ON "CustomerUser"("email", "status");
CREATE INDEX IF NOT EXISTS "idx_platform_org_slug_status" ON "PlatformOrganization"("slug", "status");

