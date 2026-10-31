-- CreateTable Plugin
CREATE TABLE IF NOT EXISTS "Plugin" (
    "id" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plugin_pkey" PRIMARY KEY ("id")
);

-- CreateTable Plan
CREATE TABLE IF NOT EXISTS "Plan" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'starter',
    "priceMinor" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "billingInterval" TEXT NOT NULL DEFAULT 'month',
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 7,
    "suspensionGraceDays" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable PlanFeature
CREATE TABLE IF NOT EXISTS "PlanFeature" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable PlanQuota
CREATE TABLE IF NOT EXISTS "PlanQuota" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "quotaKey" TEXT NOT NULL,
    "limit" INTEGER NOT NULL,
    "window" TEXT NOT NULL DEFAULT 'none',
    "unit" TEXT NOT NULL DEFAULT 'records',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanQuota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Plugin_pluginId_key" ON "Plugin"("pluginId");
CREATE INDEX IF NOT EXISTS "Plugin_pluginId_idx" ON "Plugin"("pluginId");

CREATE UNIQUE INDEX IF NOT EXISTS "Plan_planId_key" ON "Plan"("planId");
CREATE INDEX IF NOT EXISTS "Plan_pluginId_idx" ON "Plan"("pluginId");
CREATE INDEX IF NOT EXISTS "Plan_planId_idx" ON "Plan"("planId");

CREATE UNIQUE INDEX IF NOT EXISTS "PlanFeature_planId_featureKey_key" ON "PlanFeature"("planId", "featureKey");
CREATE INDEX IF NOT EXISTS "PlanFeature_planId_idx" ON "PlanFeature"("planId");

CREATE UNIQUE INDEX IF NOT EXISTS "PlanQuota_planId_quotaKey_key" ON "PlanQuota"("planId", "quotaKey");
CREATE INDEX IF NOT EXISTS "PlanQuota_planId_idx" ON "PlanQuota"("planId");

-- AddForeignKey
ALTER TABLE "Plan" DROP CONSTRAINT IF EXISTS "Plan_pluginId_fkey";
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "Plugin"("pluginId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlanFeature" DROP CONSTRAINT IF EXISTS "PlanFeature_planId_fkey";
ALTER TABLE "PlanFeature" ADD CONSTRAINT "PlanFeature_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("planId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlanQuota" DROP CONSTRAINT IF EXISTS "PlanQuota_planId_fkey";
ALTER TABLE "PlanQuota" ADD CONSTRAINT "PlanQuota_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("planId") ON DELETE CASCADE ON UPDATE CASCADE;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Plugin" TO orbitox_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Plugin" TO orbitox_maintenance;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Plan" TO orbitox_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Plan" TO orbitox_maintenance;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "PlanFeature" TO orbitox_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "PlanFeature" TO orbitox_maintenance;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "PlanQuota" TO orbitox_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "PlanQuota" TO orbitox_maintenance;
