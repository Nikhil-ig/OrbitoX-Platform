DO $$
DECLARE
    invalid_installations TEXT;
    invalid_operations TEXT;
BEGIN
    SELECT string_agg(
        format(
            'installationId=%s tenantId=%s pluginId=%s planId=%s',
            invalid.id,
            invalid."tenantId",
            invalid."pluginId",
            coalesce(invalid."planId", '<null>')
        ),
        E'\n'
    )
    INTO invalid_installations
    FROM (
        SELECT installation.id, installation."tenantId", installation."pluginId", installation."planId"
        FROM "PluginInstallation" installation
        LEFT JOIN "Plan" plan
          ON plan."planId" = installation."planId"
         AND plan."pluginId" = CASE
             WHEN installation."pluginId" IN (
                 '@orbitox/hms',
                 '@orbitox-io/hms',
                 'hms',
                 'hospital',
                 'hospital-os',
                 '@orbitox/hospital',
                 '@orbitox-io/hospital'
             ) THEN '@orbitox/hms'
             WHEN installation."pluginId" IN (
                 '@orbitox/restaurant',
                 '@orbitox-io/restaurant',
                 'restaurant',
                 'restaurant-os'
             ) THEN '@orbitox/restaurant'
         END
        WHERE installation."pluginId" IN (
            '@orbitox/hms',
            '@orbitox-io/hms',
            'hms',
            'hospital',
            'hospital-os',
            '@orbitox/hospital',
            '@orbitox-io/hospital',
            '@orbitox/restaurant',
            '@orbitox-io/restaurant',
            'restaurant',
            'restaurant-os'
        )
          AND plan.id IS NULL
        ORDER BY installation.id
        LIMIT 50
    ) invalid;

    SELECT string_agg(
        format(
            'operationId=%s pluginId=%s planId=%s',
            invalid.id,
            coalesce(invalid.plugin_id, '<null>'),
            coalesce(invalid.plan_id, '<null>')
        ),
        E'\n'
    )
    INTO invalid_operations
    FROM (
        SELECT operation.id, plugin->>'id' AS plugin_id, plugin->>'plan' AS plan_id
        FROM "PlatformOperation" operation
        CROSS JOIN LATERAL jsonb_array_elements(
            CASE
                WHEN jsonb_typeof(operation."request"->'plugins') = 'array'
                    THEN operation."request"->'plugins'
                ELSE '[]'::jsonb
            END
        ) AS requested(plugin)
        LEFT JOIN "Plan" plan
          ON plan."planId" = plugin->>'plan'
         AND plan."pluginId" = CASE
             WHEN plugin->>'id' IN (
                 '@orbitox/hms',
                 '@orbitox-io/hms',
                 'hms',
                 'hospital',
                 'hospital-os',
                 '@orbitox/hospital',
                 '@orbitox-io/hospital'
             ) THEN '@orbitox/hms'
             WHEN plugin->>'id' IN (
                 '@orbitox/restaurant',
                 '@orbitox-io/restaurant',
                 'restaurant',
                 'restaurant-os'
             ) THEN '@orbitox/restaurant'
         END
        WHERE operation."type" = 'TENANT_PROVISION'
          AND jsonb_typeof(plugin) = 'object'
          AND plugin->>'id' IN (
              '@orbitox/hms',
              '@orbitox-io/hms',
              'hms',
              'hospital',
              'hospital-os',
              '@orbitox/hospital',
              '@orbitox-io/hospital',
              '@orbitox/restaurant',
              '@orbitox-io/restaurant',
              'restaurant',
              'restaurant-os'
          )
          AND plan.id IS NULL
        ORDER BY operation.id
        LIMIT 50
    ) invalid;

    IF invalid_installations IS NOT NULL OR invalid_operations IS NOT NULL THEN
        RAISE EXCEPTION
            'Unmapped or unknown catalogue plan IDs remain after legacy repair. PluginInstallation rows: %; PlatformOperation rows: %',
            coalesce(invalid_installations, '<none>'),
            coalesce(invalid_operations, '<none>');
    END IF;
END
$$;
