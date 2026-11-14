#!/usr/bin/env bash
set -e

APP_PWD="${APP_DB_PASSWORD:-CHANGE_ME_APP_PWD}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'restaurantos_app') THEN
        CREATE ROLE restaurantos_app WITH LOGIN PASSWORD '${APP_PWD}' NOSUPERUSER NOBYPASSRLS;
      ELSE
        ALTER ROLE restaurantos_app WITH LOGIN PASSWORD '${APP_PWD}' NOSUPERUSER NOBYPASSRLS;
      END IF;
    END
    \$\$;

    GRANT USAGE ON SCHEMA public TO restaurantos_app;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO restaurantos_app;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO restaurantos_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO restaurantos_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO restaurantos_app;
EOSQL
