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

-- Retrieve migrator password from environment variable via psql \getenv (PostgreSQL 16)
\if :{?migrator_password}
\else
    \getenv migrator_password PLATFORM_MIGRATOR_PASSWORD
\endif

-- Ensure a password variable is supplied
\if :{?migrator_password}
\else
    \echo '❌ ERROR: PLATFORM_MIGRATOR_PASSWORD must be provided via environment variable.'
    \q 1
\endif

-- 0. Database Safety Assertion: Ensure this script is NOT run against system database 'postgres'
DO $$
BEGIN
    IF current_database() = 'postgres' THEN
        RAISE EXCEPTION 'Safety check failed: vps-bootstrap-roles.sql must be executed against the application database (e.g., orbitox_staging), never against system database "postgres". Current database: %', current_database();
    END IF;
END
$$;

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

-- 1b. Idempotently pre-create system operational and helper roles with NOLOGIN
-- In clean disaster recovery (from pg_dump archives), restored objects and ACLs reference these roles.
-- Creating them here with NOLOGIN guarantees that pg_dump restore succeeds without missing-role errors,
-- while ensuring no operational role can log in until vps-enable-roles.sql activates it post-restore.
DO $$
DECLARE
    r TEXT;
    roles TEXT[] := ARRAY[
        'orbitox_runtime',
        'orbitox_maintenance',
        'orbitox_platform_admin_audit',
        'hms_audit_reader',
        'orbitox_outbox_relay',
        'orbitox_audit_resolver',
        'orbitox_audit_recovery'
    ];
BEGIN
    FOREACH r IN ARRAY roles LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
            EXECUTE format('CREATE ROLE %I WITH NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT', r);
            RAISE NOTICE 'Role % pre-provisioned with NOLOGIN and strict least-privilege attributes.', r;
        ELSE
            -- Ensure existing role is locked with NOLOGIN and strict least-privilege attributes
            EXECUTE format('ALTER ROLE %I WITH NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT', r);
        END IF;
    END LOOP;
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

-- 5. Assign Database Ownership & Permissions to orbitox_migrator (Top-level \gexec execution)
-- Note: Executed via top-level psql \gexec outside any PL/pgSQL transaction block to ensure standard PostgreSQL compatibility.
SELECT format('ALTER DATABASE %I OWNER TO orbitox_migrator;', current_database()) \gexec
SELECT format('GRANT ALL ON DATABASE %I TO orbitox_migrator;', current_database()) \gexec

-- 5b. Verify Database Ownership
DO $$
DECLARE
    v_owner TEXT;
BEGIN
    SELECT pg_catalog.pg_get_userbyid(datdba) INTO v_owner
    FROM pg_database
    WHERE datname = current_database();

    IF v_owner != 'orbitox_migrator' THEN
        RAISE EXCEPTION 'Database ownership assertion failed: expected orbitox_migrator, found % for database %', v_owner, current_database();
    END IF;
    RAISE NOTICE 'Database % ownership successfully verified as orbitox_migrator.', current_database();
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
