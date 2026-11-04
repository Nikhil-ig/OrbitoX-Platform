ALTER TABLE public."BillingSubscription"
  ALTER COLUMN "lastEventAt" TYPE BIGINT;

ALTER TABLE public."BillingSubscription"
  ADD CONSTRAINT "BillingSubscription_tenant_organization_check"
  CHECK (
    "tenantId" LIKE 'org/' || "organizationId" || '/project/%/environment/%'
    AND split_part("tenantId", '/', 2) = "organizationId"
    AND "tenantId" ~ '^org/[^/]+/project/[^/]+/environment/[^/]+$'
  );

ALTER TABLE public."BillingProviderCache"
  DROP CONSTRAINT "BillingProviderCache_pkey";

ALTER TABLE public."BillingProviderCache"
  ADD CONSTRAINT "BillingProviderCache_pkey"
  PRIMARY KEY ("tenantId", "cacheKey");
