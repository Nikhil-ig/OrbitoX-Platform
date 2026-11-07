UPDATE "PluginInstallation"
SET
    "planId" = CASE
        WHEN "pluginId" IN (
            '@orbitox/hms',
            '@orbitox-io/hms',
            'hms',
            'hospital',
            'hospital-os',
            '@orbitox/hospital',
            '@orbitox-io/hospital'
        ) THEN 'hms-' || "planId"
        WHEN "pluginId" IN (
            '@orbitox/restaurant',
            '@orbitox-io/restaurant',
            'restaurant',
            'restaurant-os'
        ) THEN 'restaurant-' || "planId"
        ELSE "planId"
    END,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "planId" IN ('starter', 'pro')
  AND (
      "pluginId" IN (
          '@orbitox/hms',
          '@orbitox-io/hms',
          'hms',
          'hospital',
          'hospital-os',
          '@orbitox/hospital',
          '@orbitox-io/hospital'
      )
      OR "pluginId" IN (
          '@orbitox/restaurant',
          '@orbitox-io/restaurant',
          'restaurant',
          'restaurant-os'
      )
  );

UPDATE "PlatformOperation" operation
SET "request" = jsonb_set(
    operation."request",
    '{plugins}',
    (
        SELECT jsonb_agg(
            CASE
                WHEN jsonb_typeof(plugin) = 'object'
                  AND plugin->>'plan' IN ('starter', 'pro')
                  AND plugin->>'id' IN (
                      '@orbitox/hms',
                      '@orbitox-io/hms',
                      'hms',
                      'hospital',
                      'hospital-os',
                      '@orbitox/hospital',
                      '@orbitox-io/hospital'
                  )
                THEN jsonb_set(plugin, '{plan}', to_jsonb('hms-' || (plugin->>'plan')), false)
                WHEN jsonb_typeof(plugin) = 'object'
                  AND plugin->>'plan' IN ('starter', 'pro')
                  AND plugin->>'id' IN (
                      '@orbitox/restaurant',
                      '@orbitox-io/restaurant',
                      'restaurant',
                      'restaurant-os'
                  )
                THEN jsonb_set(plugin, '{plan}', to_jsonb('restaurant-' || (plugin->>'plan')), false)
                ELSE plugin
            END
            ORDER BY ordinal
        )
        FROM jsonb_array_elements(operation."request"->'plugins')
          WITH ORDINALITY AS requested_plugin(plugin, ordinal)
    ),
    false
)
WHERE operation."type" = 'TENANT_PROVISION'
  AND jsonb_typeof(operation."request"->'plugins') = 'array'
  AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(operation."request"->'plugins') AS requested_plugin(plugin)
      WHERE jsonb_typeof(plugin) = 'object'
        AND plugin->>'plan' IN ('starter', 'pro')
        AND (
            plugin->>'id' IN (
                '@orbitox/hms',
                '@orbitox-io/hms',
                'hms',
                'hospital',
                'hospital-os',
                '@orbitox/hospital',
                '@orbitox-io/hospital'
            )
            OR plugin->>'id' IN (
                '@orbitox/restaurant',
                '@orbitox-io/restaurant',
                'restaurant',
                'restaurant-os'
            )
        )
  );
