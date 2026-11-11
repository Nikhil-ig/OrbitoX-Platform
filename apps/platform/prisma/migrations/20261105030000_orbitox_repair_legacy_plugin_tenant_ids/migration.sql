-- Repair legacy slug-based tenant IDs in PluginInstallation to canonical IDs: org/<organizationId>/project/<projectId>/environment/<environmentId>
DO $$
DECLARE
    unmapped_installations TEXT;
BEGIN
    -- 1. Deduplicate: if a canonical row already exists alongside a legacy slug-based duplicate,
    -- ensure canonical row retains the most restrictive status, then delete the duplicate.
    WITH legacy_matches AS (
        SELECT
            pi.id AS legacy_id,
            'org/' || o."id" || '/project/' || p."id" || '/environment/' || e."id" AS canonical_id,
            pi."pluginId" AS plugin_id,
            pi."status" AS legacy_status
        FROM "PluginInstallation" pi
        JOIN "PlatformOrganization" o
          ON o."id" = split_part(pi."tenantId", '/', 2) OR o."slug" = split_part(pi."tenantId", '/', 2)
        JOIN "PlatformProject" p
          ON (p."id" = split_part(pi."tenantId", '/', 4) OR p."slug" = split_part(pi."tenantId", '/', 4))
         AND p."organizationId" = o."id"
        JOIN "ProjectEnvironment" e
          ON (e."id" = split_part(pi."tenantId", '/', 6) OR e."slug" = split_part(pi."tenantId", '/', 6))
         AND e."projectId" = p."id"
        WHERE pi."tenantId" != ('org/' || o."id" || '/project/' || p."id" || '/environment/' || e."id")
    )
    UPDATE "PluginInstallation" target
    SET "status" = CASE
            WHEN m.legacy_status = 'SUSPENDED' OR target."status" = 'SUSPENDED' THEN 'SUSPENDED'
            WHEN m.legacy_status = 'READ_ONLY' OR target."status" = 'READ_ONLY' THEN 'READ_ONLY'
            ELSE 'ACTIVE'
        END,
        "updatedAt" = CURRENT_TIMESTAMP
    FROM legacy_matches m
    WHERE target."tenantId" = m.canonical_id
      AND target."pluginId" = m.plugin_id;

    WITH legacy_matches AS (
        SELECT
            pi.id AS legacy_id,
            'org/' || o."id" || '/project/' || p."id" || '/environment/' || e."id" AS canonical_id,
            pi."pluginId" AS plugin_id
        FROM "PluginInstallation" pi
        JOIN "PlatformOrganization" o
          ON o."id" = split_part(pi."tenantId", '/', 2) OR o."slug" = split_part(pi."tenantId", '/', 2)
        JOIN "PlatformProject" p
          ON (p."id" = split_part(pi."tenantId", '/', 4) OR p."slug" = split_part(pi."tenantId", '/', 4))
         AND p."organizationId" = o."id"
        JOIN "ProjectEnvironment" e
          ON (e."id" = split_part(pi."tenantId", '/', 6) OR e."slug" = split_part(pi."tenantId", '/', 6))
         AND e."projectId" = p."id"
        WHERE pi."tenantId" != ('org/' || o."id" || '/project/' || p."id" || '/environment/' || e."id")
    )
    DELETE FROM "PluginInstallation" pi
    USING legacy_matches m, "PluginInstallation" target
    WHERE pi.id = m.legacy_id
      AND target."tenantId" = m.canonical_id
      AND target."pluginId" = m.plugin_id;

    -- 2. Update remaining slug-based installations to canonical IDs
    UPDATE "PluginInstallation" pi
    SET
        "tenantId" = 'org/' || o."id" || '/project/' || p."id" || '/environment/' || e."id",
        "runtimeTenantId" = 'org/' || o."id" || '/project/' || p."id" || '/environment/' || e."id",
        "updatedAt" = CURRENT_TIMESTAMP
    FROM "PlatformOrganization" o
    JOIN "PlatformProject" p ON p."organizationId" = o."id"
    JOIN "ProjectEnvironment" e ON e."projectId" = p."id"
    WHERE (
        (
            (o."id" = split_part(pi."tenantId", '/', 2) OR o."slug" = split_part(pi."tenantId", '/', 2))
            AND (p."id" = split_part(pi."tenantId", '/', 4) OR p."slug" = split_part(pi."tenantId", '/', 4))
            AND (e."id" = split_part(pi."tenantId", '/', 6) OR e."slug" = split_part(pi."tenantId", '/', 6))
        )
        OR (
            (pi."tenantId" = p."id" OR pi."tenantId" = p."slug")
            AND e."slug" = 'production'
        )
    )
    AND pi."tenantId" != ('org/' || o."id" || '/project/' || p."id" || '/environment/' || e."id");

    -- 3. Verify no unmapped slug-like org/... rows remain
    SELECT string_agg(
        format('id=%s tenantId=%s pluginId=%s', pi.id, pi."tenantId", pi."pluginId"),
        E'\n'
    )
    INTO unmapped_installations
    FROM "PluginInstallation" pi
    WHERE pi."tenantId" LIKE 'org/%'
      AND pi."tenantId" NOT IN (
          SELECT 'org/' || p."organizationId" || '/project/' || p."id" || '/environment/' || e."id"
          FROM "PlatformProject" p
          JOIN "ProjectEnvironment" e ON e."projectId" = p."id"
      )
    LIMIT 50;

    IF unmapped_installations IS NOT NULL THEN
        RAISE EXCEPTION 'Unmapped legacy tenant IDs remain after repair: %', unmapped_installations;
    END IF;
END
$$;
