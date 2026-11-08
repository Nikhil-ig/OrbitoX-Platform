-- ─────────────────────────────────────────────────────────────
-- OrbitoX AWS RDS PostgreSQL 16 Idempotent Bootstrap (Phase 6F - B1 Fix)
-- ─────────────────────────────────────────────────────────────
-- Run as RDS Master Administrative User (member of rds_superuser).
-- Creates ONLY `orbitox_migrator` with necessary schema/DB ownership.
-- Does NOT pre-create application roles (orbitox_runtime, etc.), allowing
-- Prisma migrations to be the single source of truth for role creation
-- without triggering non-superuser ALTER ROLE NOSUPERUSER restrictions in PG16.
-- ─────────────────────────────────────────────────────────────

\set ON_ERROR_STOP on

-- 1. Create or update orbitox_migrator role
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_migrator') THEN
        CREATE ROLE orbitox_migrator WITH LOGIN CREATEDB CREATEROLE NOINHERIT;
    ELSE
        ALTER ROLE orbitox_migrator WITH LOGIN CREATEDB CREATEROLE NOINHERIT;
    END IF;
END
$$;

ALTER ROLE orbitox_migrator PASSWORD :'migrator_password';
ALTER ROLE orbitox_migrator SET createrole_self_grant = 'set';

-- 2. Grant role membership with SET TRUE so master user can switch context if needed
DO $$
BEGIN
    EXECUTE format('GRANT orbitox_migrator TO %I WITH SET TRUE', CURRENT_USER);
END
$$;

-- 3. Assign Database Ownership & Permissions to orbitox_migrator
DO $$
BEGIN
    EXECUTE format('ALTER DATABASE %I OWNER TO orbitox_migrator', current_database());
    EXECUTE format('GRANT ALL ON DATABASE %I TO orbitox_migrator', current_database());
END
$$;

-- 4. Transfer public schema ownership to orbitox_migrator
SET ROLE orbitox_migrator;
ALTER SCHEMA public OWNER TO orbitox_migrator;
GRANT ALL ON SCHEMA public TO orbitox_migrator;
RESET ROLE;
