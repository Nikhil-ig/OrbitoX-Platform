DO $$
DECLARE
    unmapped_installations TEXT;
BEGIN
    SELECT string_agg(
        format(
            'installationId=%s tenantId=%s pluginId=%s planId=%s',
            invalid.id,
            invalid."tenantId",
            invalid."pluginId",
            invalid."planId"
        ),
        E'\n'
    )
    INTO unmapped_installations
    FROM (
        SELECT installation.id, installation."tenantId", installation."pluginId", installation."planId"
        FROM "PluginInstallation" installation
        LEFT JOIN "Plan" plan ON plan."planId" = installation."planId"
        WHERE installation."planId" IS NOT NULL
          AND (
              plan.id IS NULL
              OR plan."pluginId" <> CASE
                  WHEN installation."pluginId" IN (
                      '@orbitox/hms', '@orbitox-io/hms', 'hms', 'hospital', 'hospital-os',
                      '@orbitox/hospital', '@orbitox-io/hospital'
                  ) THEN '@orbitox/hms'
                  WHEN installation."pluginId" IN (
                      '@orbitox/restaurant', '@orbitox-io/restaurant', 'restaurant', 'restaurant-os'
                  ) THEN '@orbitox/restaurant'
                  ELSE installation."pluginId"
              END
          )
        ORDER BY installation.id
        LIMIT 50
    ) invalid;

    IF unmapped_installations IS NOT NULL THEN
        RAISE EXCEPTION
            'Plugin installations reference plans absent from the catalogue; repair these rows before adding the plan foreign key: %',
            unmapped_installations;
    END IF;
END
$$;

ALTER TABLE "PluginInstallation"
    ADD CONSTRAINT "PluginInstallation_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "Plan"("planId")
    ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE OR REPLACE FUNCTION public.enforce_plugin_installation_plan_plugin()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
    plan_plugin_id TEXT;
    installation_plugin_id TEXT;
BEGIN
    IF NEW."planId" IS NULL THEN
        RETURN NEW;
    END IF;

    installation_plugin_id := CASE
        WHEN NEW."pluginId" IN (
            '@orbitox/hms', '@orbitox-io/hms', 'hms', 'hospital', 'hospital-os',
            '@orbitox/hospital', '@orbitox-io/hospital'
        ) THEN '@orbitox/hms'
        WHEN NEW."pluginId" IN (
            '@orbitox/restaurant', '@orbitox-io/restaurant', 'restaurant', 'restaurant-os'
        ) THEN '@orbitox/restaurant'
        ELSE NEW."pluginId"
    END;

    SELECT plan."pluginId"
      INTO plan_plugin_id
      FROM public."Plan" plan
     WHERE plan."planId" = NEW."planId";

    IF FOUND AND plan_plugin_id <> installation_plugin_id THEN
        RAISE EXCEPTION
            'Plan % belongs to plugin %, not installation plugin %',
            NEW."planId", plan_plugin_id, NEW."pluginId"
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END
$$;

CREATE TRIGGER "PluginInstallation_plan_plugin_check"
BEFORE INSERT OR UPDATE OF "planId", "pluginId"
ON "PluginInstallation"
FOR EACH ROW
EXECUTE FUNCTION public.enforce_plugin_installation_plan_plugin();
