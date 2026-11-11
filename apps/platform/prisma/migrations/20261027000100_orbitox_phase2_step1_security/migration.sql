-- Step 1 hardening: restricted roles, tenant RLS, immutable audit, and daily rate buckets.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_runtime') THEN
    CREATE ROLE orbitox_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  ELSE
    ALTER ROLE orbitox_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_maintenance') THEN
    CREATE ROLE orbitox_maintenance NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  ELSE
    ALTER ROLE orbitox_maintenance NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END
$$;

DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO orbitox_runtime', current_database());
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO orbitox_maintenance', current_database());
END
$$;

GRANT USAGE ON SCHEMA public TO orbitox_runtime, orbitox_maintenance;

-- The baseline has no application data yet. Replace Prisma's ordinary table with a
-- range-partitioned parent before the runtime role can write any rate buckets.
ALTER TABLE "PlatformRateLimitBucket" RENAME TO "PlatformRateLimitBucket_unpartitioned";
ALTER INDEX "PlatformRateLimitBucket_pkey" RENAME TO "PlatformRateLimitBucket_unpartitioned_pkey";
CREATE TABLE "PlatformRateLimitBucket" (
  "scopeType" TEXT NOT NULL,
  "scopeId" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "requestCount" BIGINT NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformRateLimitBucket_pkey" PRIMARY KEY ("scopeType", "scopeId", "windowStart")
) PARTITION BY RANGE ("windowStart");
DROP TABLE "PlatformRateLimitBucket_unpartitioned";
CREATE INDEX "PlatformRateLimitBucket_expiresAt_idx" ON "PlatformRateLimitBucket" ("expiresAt");

CREATE OR REPLACE FUNCTION public.ensure_platform_rate_limit_partitions(days_ahead INTEGER DEFAULT 14)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  partition_day DATE;
  partition_name TEXT;
BEGIN
  IF days_ahead < 14 OR days_ahead > 31 THEN
    RAISE EXCEPTION 'days_ahead must be between 14 and 31';
  END IF;

  FOR partition_day IN
    SELECT generate_series(current_date - 1, current_date + days_ahead, INTERVAL '1 day')::DATE
  LOOP
    partition_name := 'PlatformRateLimitBucket_' || to_char(partition_day, 'YYYYMMDD');
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public."PlatformRateLimitBucket" FOR VALUES FROM (%L) TO (%L) WITH (fillfactor = 70)',
      partition_name,
      partition_day,
      partition_day + 1
    );
  END LOOP;
END
$$;

REVOKE ALL ON FUNCTION public.ensure_platform_rate_limit_partitions(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_platform_rate_limit_partitions(INTEGER) TO orbitox_maintenance;

CREATE OR REPLACE FUNCTION public.maintain_platform_rate_limit_partitions(
  retention_days INTEGER DEFAULT 3,
  days_ahead INTEGER DEFAULT 14
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  partition_record RECORD;
  partition_day DATE;
BEGIN
  IF retention_days < 2 OR retention_days > 14 THEN
    RAISE EXCEPTION 'retention_days must be between 2 and 14';
  END IF;

  PERFORM public.ensure_platform_rate_limit_partitions(days_ahead);

  FOR partition_record IN
    SELECT child.relname AS partition_name
    FROM pg_inherits inheritance
    JOIN pg_class parent ON parent.oid = inheritance.inhparent
    JOIN pg_class child ON child.oid = inheritance.inhrelid
    JOIN pg_namespace namespace ON namespace.oid = parent.relnamespace
    WHERE namespace.nspname = 'public'
      AND parent.relname = 'PlatformRateLimitBucket'
      AND child.relname ~ '^PlatformRateLimitBucket_[0-9]{8}$'
  LOOP
    partition_day := to_date(right(partition_record.partition_name, 8), 'YYYYMMDD');
    IF partition_day < current_date - retention_days THEN
      EXECUTE format('DROP TABLE public.%I', partition_record.partition_name);
    END IF;
  END LOOP;
END
$$;

REVOKE ALL ON FUNCTION public.maintain_platform_rate_limit_partitions(INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.maintain_platform_rate_limit_partitions(INTEGER, INTEGER) TO orbitox_maintenance;
SELECT public.maintain_platform_rate_limit_partitions(3, 14);

CREATE OR REPLACE FUNCTION public.platform_rate_limit_partitions_ready(days_ahead INTEGER DEFAULT 14)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM generate_series(current_date, current_date + days_ahead, INTERVAL '1 day') AS day_start
    WHERE to_regclass(
      'public."PlatformRateLimitBucket_' || to_char(day_start::DATE, 'YYYYMMDD') || '"'
    ) IS NULL
  )
$$;

REVOKE ALL ON FUNCTION public.platform_rate_limit_partitions_ready(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_rate_limit_partitions_ready(INTEGER) TO orbitox_runtime;

-- Every model with an explicit tenantId/contextId receives deny-by-default RLS.
DO $$
DECLARE
  tenant_table RECORD;
  scope_column TEXT;
  scope_predicate TEXT;
BEGIN
  FOR tenant_table IN
    SELECT table_name,
           bool_or(column_name = 'tenantId') AS has_tenant_id,
           bool_or(column_name = 'contextId') AS has_context_id
    FROM information_schema.columns
    WHERE table_schema = 'public'
    GROUP BY table_name
    HAVING bool_or(column_name IN ('tenantId', 'contextId'))
  LOOP
    scope_column := CASE WHEN tenant_table.has_tenant_id THEN 'tenantId' ELSE 'contextId' END;
    scope_predicate := format(
      '%I = NULLIF(current_setting(''app.current_tenant_id'', true), '''')',
      scope_column
    );

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tenant_table.table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tenant_table.table_name);
    EXECUTE format('DROP POLICY IF EXISTS orbitox_tenant_isolation ON public.%I', tenant_table.table_name);
    EXECUTE format(
      'CREATE POLICY orbitox_tenant_isolation ON public.%I FOR ALL TO orbitox_runtime USING (%s) WITH CHECK (%s)',
      tenant_table.table_name,
      scope_predicate,
      scope_predicate
    );
  END LOOP;
END
$$;

-- Child records without a tenant column are scoped through their owning row.
ALTER TABLE "StoreTheme" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StoreTheme" FORCE ROW LEVEL SECURITY;
CREATE POLICY orbitox_tenant_isolation ON "StoreTheme" FOR ALL TO orbitox_runtime
  USING (EXISTS (SELECT 1 FROM "Store" s WHERE s.id = "StoreTheme"."storeId"))
  WITH CHECK (EXISTS (SELECT 1 FROM "Store" s WHERE s.id = "StoreTheme"."storeId"));

ALTER TABLE "StorePage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StorePage" FORCE ROW LEVEL SECURITY;
CREATE POLICY orbitox_tenant_isolation ON "StorePage" FOR ALL TO orbitox_runtime
  USING (EXISTS (SELECT 1 FROM "Store" s WHERE s.id = "StorePage"."storeId"))
  WITH CHECK (EXISTS (SELECT 1 FROM "Store" s WHERE s.id = "StorePage"."storeId"));

ALTER TABLE "StoreDiscount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StoreDiscount" FORCE ROW LEVEL SECURITY;
CREATE POLICY orbitox_tenant_isolation ON "StoreDiscount" FOR ALL TO orbitox_runtime
  USING (EXISTS (SELECT 1 FROM "Store" s WHERE s.id = "StoreDiscount"."storeId"))
  WITH CHECK (EXISTS (SELECT 1 FROM "Store" s WHERE s.id = "StoreDiscount"."storeId"));

ALTER TABLE "Cart" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Cart" FORCE ROW LEVEL SECURITY;
CREATE POLICY orbitox_tenant_isolation ON "Cart" FOR ALL TO orbitox_runtime
  USING (EXISTS (SELECT 1 FROM "Store" s WHERE s.id = "Cart"."storeId"))
  WITH CHECK (EXISTS (SELECT 1 FROM "Store" s WHERE s.id = "Cart"."storeId"));

ALTER TABLE "PaymentTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentTransaction" FORCE ROW LEVEL SECURITY;
CREATE POLICY orbitox_tenant_isolation ON "PaymentTransaction" FOR ALL TO orbitox_runtime
  USING (EXISTS (SELECT 1 FROM "Store" s WHERE s.id = "PaymentTransaction"."storeId"))
  WITH CHECK (EXISTS (SELECT 1 FROM "Store" s WHERE s.id = "PaymentTransaction"."storeId"));

ALTER TABLE "StoreReview" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StoreReview" FORCE ROW LEVEL SECURITY;
CREATE POLICY orbitox_tenant_isolation ON "StoreReview" FOR ALL TO orbitox_runtime
  USING (EXISTS (SELECT 1 FROM "Store" s WHERE s.id = "StoreReview"."storeId"))
  WITH CHECK (EXISTS (SELECT 1 FROM "Store" s WHERE s.id = "StoreReview"."storeId"));

ALTER TABLE "ProductVariant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductVariant" FORCE ROW LEVEL SECURITY;
CREATE POLICY orbitox_tenant_isolation ON "ProductVariant" FOR ALL TO orbitox_runtime
  USING (EXISTS (SELECT 1 FROM "Product" p WHERE p.id = "ProductVariant"."productId"))
  WITH CHECK (EXISTS (SELECT 1 FROM "Product" p WHERE p.id = "ProductVariant"."productId"));

ALTER TABLE "RestaurantOrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RestaurantOrderItem" FORCE ROW LEVEL SECURITY;
CREATE POLICY orbitox_order_item_consistency ON "RestaurantOrderItem" AS RESTRICTIVE FOR ALL TO orbitox_runtime
  USING (
    "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')
    AND EXISTS (
      SELECT 1 FROM "RestaurantOrder" o
      WHERE o.id = "RestaurantOrderItem"."orderId"
        AND o."tenantId" = "RestaurantOrderItem"."tenantId"
    )
  )
  WITH CHECK (
    "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')
    AND EXISTS (
      SELECT 1 FROM "RestaurantOrder" o
      WHERE o.id = "RestaurantOrderItem"."orderId"
        AND o."tenantId" = "RestaurantOrderItem"."tenantId"
    )
  );

ALTER TABLE "CelebrationExperienceSection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CelebrationExperienceSection" FORCE ROW LEVEL SECURITY;
CREATE POLICY orbitox_tenant_isolation ON "CelebrationExperienceSection" FOR ALL TO orbitox_runtime
  USING (EXISTS (SELECT 1 FROM "CelebrationExperience" e WHERE e.id = "CelebrationExperienceSection"."experienceId"))
  WITH CHECK (EXISTS (SELECT 1 FROM "CelebrationExperience" e WHERE e.id = "CelebrationExperienceSection"."experienceId"));

ALTER TABLE "StudioPage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudioPage" FORCE ROW LEVEL SECURITY;
CREATE POLICY orbitox_tenant_isolation ON "StudioPage" FOR ALL TO orbitox_runtime
  USING (EXISTS (SELECT 1 FROM "StudioProject" p WHERE p.id = "StudioPage"."projectId"))
  WITH CHECK (EXISTS (SELECT 1 FROM "StudioProject" p WHERE p.id = "StudioPage"."projectId"));

ALTER TABLE "StudioSection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudioSection" FORCE ROW LEVEL SECURITY;
CREATE POLICY orbitox_tenant_isolation ON "StudioSection" FOR ALL TO orbitox_runtime
  USING (EXISTS (SELECT 1 FROM "StudioPage" p WHERE p.id = "StudioSection"."pageId"))
  WITH CHECK (EXISTS (SELECT 1 FROM "StudioPage" p WHERE p.id = "StudioSection"."pageId"));

ALTER TABLE "StudioAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudioAsset" FORCE ROW LEVEL SECURITY;
CREATE POLICY orbitox_tenant_isolation ON "StudioAsset" FOR ALL TO orbitox_runtime
  USING (EXISTS (SELECT 1 FROM "StudioProject" p WHERE p.id = "StudioAsset"."projectId"))
  WITH CHECK (EXISTS (SELECT 1 FROM "StudioProject" p WHERE p.id = "StudioAsset"."projectId"));

ALTER TABLE "StudioSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudioSnapshot" FORCE ROW LEVEL SECURITY;
CREATE POLICY orbitox_tenant_isolation ON "StudioSnapshot" FOR ALL TO orbitox_runtime
  USING (EXISTS (SELECT 1 FROM "StudioProject" p WHERE p.id = "StudioSnapshot"."projectId"))
  WITH CHECK (EXISTS (SELECT 1 FROM "StudioProject" p WHERE p.id = "StudioSnapshot"."projectId"));

-- Grant runtime DML, then remove mutation privileges from append-only audit records.
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOR table_name IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  LOOP
    IF table_name = 'PlatformAuditEvent' THEN
      EXECUTE format('GRANT SELECT, INSERT ON TABLE public.%I TO orbitox_runtime', table_name);
    ELSE
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO orbitox_runtime', table_name);
    END IF;
  END LOOP;
END
$$;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO orbitox_runtime;
GRANT SELECT ON TABLE "_prisma_migrations" TO orbitox_runtime;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE "PlatformAuditEvent" FROM orbitox_runtime;