#!/usr/bin/env bash
# ==============================================================================
# 🪐 OrbitoX RestaurantOS — PostgreSQL First-Boot Role Provisioner
# ==============================================================================
# Executed automatically by postgres docker-entrypoint during initdb.
# Runs under temporary postgres server as superuser ($POSTGRES_USER).
# Provisions `restaurantos_app` with LOGIN and strict least-privilege attributes.
# ==============================================================================
set -euo pipefail

APP_PWD="${APP_DB_PASSWORD:-${ROS_DATABASE_PASSWORD:-}}"
if [[ -z "$APP_PWD" && -f "/run/secrets/ros_db_password" ]]; then
  APP_PWD="$(cat /run/secrets/ros_db_password)"
fi

if [[ -z "$APP_PWD" ]]; then
  echo "❌ FATAL: Cannot provision restaurantos_app — no password supplied in APP_DB_PASSWORD, ROS_DATABASE_PASSWORD, or secret file." >&2
  exit 1
fi

echo "🚀 [init-roles.sh] Provisioning RestaurantOS application role (restaurantos_app)..."

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  -v app_pwd="$APP_PWD" <<-EOSQL
    DO \$\$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'restaurantos_app') THEN
        CREATE ROLE restaurantos_app WITH NOSUPERUSER NOBYPASSRLS;
        RAISE NOTICE 'Role restaurantos_app created with least-privilege attributes.';
      END IF;
    END
    \$\$;

    ALTER ROLE restaurantos_app WITH LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD :'app_pwd';

    GRANT USAGE ON SCHEMA public TO restaurantos_app;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO restaurantos_app;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO restaurantos_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO restaurantos_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO restaurantos_app;
EOSQL

echo "✅ [init-roles.sh] restaurantos_app provisioned and granted schema permissions successfully."
