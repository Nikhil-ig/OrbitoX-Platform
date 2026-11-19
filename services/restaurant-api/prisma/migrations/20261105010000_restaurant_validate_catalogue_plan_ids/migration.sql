DO $$
DECLARE
    invalid_tenants TEXT;
BEGIN
    SELECT string_agg(
        format(
            'tenantId=%s planId=%s',
            invalid.id,
            coalesce(invalid."planId", '<null>')
        ),
        E'\n'
    )
    INTO invalid_tenants
    FROM (
        SELECT tenant.id, tenant."planId"
        FROM "Tenant" tenant
        WHERE tenant."planId" IS NULL
           OR tenant."planId" NOT IN ('restaurant-starter', 'restaurant-pro')
        ORDER BY tenant.id
        LIMIT 50
    ) invalid;

    IF invalid_tenants IS NOT NULL THEN
        RAISE EXCEPTION
            'Tenant rows contain plan IDs that cannot be mapped to the RestaurantOS catalogue: %',
            invalid_tenants;
    END IF;
END
$$;
