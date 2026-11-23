-- ─────────────────────────────────────────────────────────────
-- OrbitoX Self-Managed Ubuntu VPS PostgreSQL 16 Bootstrap (Gate C)
-- ─────────────────────────────────────────────────────────────
-- Run as PostgreSQL Cluster Superuser (`postgres`).
--
-- Objective:
-- Idempotently provisions `orbitox_migrator` as the database and schema owner
-- with strict least-privilege attributes:
--   - LOGIN
--   - CREATEDB (required to manage shadow database during dev/testing if needed)
--   - CREATEROLE (required to provision locked application roles in migrations)
--   - NOINHERIT
--   - NOSUPERUSER (strictly non-superuser)
--   - NOBYPASSRLS (subject to Row-Level Security policies)
--
-- Note on PostgreSQL 16 Role Lifecycle:
-- In standard PostgreSQL 16 on self-managed VPS, application service roles
-- (orbitox_runtime, orbitox_maintenance, etc.) are NOT pre-created here.
-- They are created in migrations under orbitox_migrator with NOLOGIN.
-- Post-migration, `vps-enable-roles.sql` alters them WITH LOGIN and assigns passwords.
-- ─────────────────────────────────────────────────────────────

\set ON_ERROR_STOP on

-- Ensure a password variable is supplied
\if :{?migrator_password}
\else
    \echo '❌ ERROR: Variable migrator_password must be supplied via -v migrator_password="<secret>"'
    \q 1
\endif

-- 1. Create or update orbitox_migrator with strict least-privilege attributes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_migrator') THEN
        CREATE ROLE orbitox_migrator WITH LOGIN CREATEDB CREATEROLE NOINHERIT NOSUPERUSER NOBYPASSRLS;
        RAISE NOTICE 'Role orbitox_migrator created with strict least-privilege attributes.';
    ELSE
        -- Explicitly sanitize existing role: strip SUPERUSER and BYPASSRLS if previously granted
        ALTER ROLE orbitox_migrator WITH LOGIN CREATEDB CREATEROLE NOINHERIT NOSUPERUSER NOBYPASSRLS;
        RAISE NOTICE 'Role orbitox_migrator sanitized with strict least-privilege attributes.';
    END IF;
END
$$;

-- 2. Securely set migrator password
ALTER ROLE orbitox_migrator PASSWORD :'migrator_password';

-- 3. Configure PostgreSQL 16 CREATEROLE self-grant behavior
-- Setting createrole_self_grant to 'set' ensures orbitox_migrator can switch into (SET ROLE)
-- the security-definer roles it creates during migrations (e.g., orbitox_audit_resolver)
DO $$
BEGIN
    IF current_setting('server_version_num')::int >= 160000 THEN
        ALTER ROLE orbitox_migrator SET createrole_self_grant = 'set';
    END IF;
END
$$;

-- 4. Grant orbitox_migrator to the current superuser for administrative inspection
DO $$
BEGIN
    IF current_setting('server_version_num')::int >= 160000 THEN
        EXECUTE format('GRANT orbitox_migrator TO %I WITH SET TRUE', CURRENT_USER);
    ELSE
        EXECUTE format('GRANT orbitox_migrator TO %I WITH ADMIN OPTION', CURRENT_USER);
    END IF;
END
$$;

-- 5. Assign Database Ownership & Permissions to orbitox_migrator
DO $$
BEGIN
    EXECUTE format('ALTER DATABASE %I OWNER TO orbitox_migrator', current_database());
    EXECUTE format('GRANT ALL ON DATABASE %I TO orbitox_migrator', current_database());
    RAISE NOTICE 'Database % ownership transferred to orbitox_migrator.', current_database();
END
$$;

-- 6. Transfer public schema ownership directly as postgres superuser
-- Note: Unlike AWS RDS, on vanilla PostgreSQL 16 we do NOT execute SET ROLE orbitox_migrator
-- prior to ALTER SCHEMA public OWNER, as the current superuser is the rightful owner of public.
ALTER SCHEMA public OWNER TO orbitox_migrator;
GRANT ALL ON SCHEMA public TO orbitox_migrator;

-- Revoke default PUBLIC schema creation rights (PostgreSQL 15+ default hardening)
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

DO $$
BEGIN
    RAISE NOTICE '✓ OrbitoX VPS PostgreSQL 16 bootstrap completed successfully for database %', current_database();
END
$$;
