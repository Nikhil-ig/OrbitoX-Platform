UPDATE "Tenant"
SET
    "planId" = CASE "planId"
        WHEN 'starter' THEN 'restaurant-starter'
        WHEN 'pro' THEN 'restaurant-pro'
    END,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "planId" IN ('starter', 'pro');

ALTER TABLE "Tenant" ALTER COLUMN "planId" DROP DEFAULT;
