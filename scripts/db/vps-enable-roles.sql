-- ─────────────────────────────────────────────────────────────
-- OrbitoX Self-Managed Ubuntu VPS Post-Migration Role Enablement (Gate C)
-- ─────────────────────────────────────────────────────────────
-- Executed strictly AFTER `prisma migrate deploy` has created the schema and roles.
-- Run as PostgreSQL Cluster Superuser (`postgres`) or `orbitox_migrator`.
--
-- Objective:
-- 1. Enables LOGIN on the 5 operational service roles.
-- 2. Strictly sets passwords for each role from environment variables using psql \getenv.
-- 3. Enforces least-privilege attributes: NOSUPERUSER, NOBYPASSRLS, NOCREATEDB, NOCREATEROLE, NOINHERIT.
-- 4. Strictly verifies that helper roles (orbitox_audit_resolver, orbitox_audit_recovery)
--    remain NOLOGIN and never receive login passwords.
-- ─────────────────────────────────────────────────────────────

\set ON_ERROR_STOP on

-- Retrieve role passwords from environment variables via psql \getenv (PostgreSQL 16)
\if :{?runtime_password}
\else
    \getenv runtime_password ORBITOX_RUNTIME_PASSWORD
\endif

\if :{?maintenance_password}
\else
    \getenv maintenance_password ORBITOX_MAINTENANCE_PASSWORD
\endif

\if :{?platform_admin_audit_password}
\else
    \getenv platform_admin_audit_password ORBITOX_PLATFORM_ADMIN_AUDIT_PASSWORD
\endif

\if :{?hms_audit_reader_password}
\else
    \getenv hms_audit_reader_password HMS_AUDIT_READER_PASSWORD
\endif

\if :{?outbox_relay_password}
\else
    \getenv outbox_relay_password ORBITOX_OUTBOX_RELAY_PASSWORD
\endif

-- Validate required password variables
\if :{?runtime_password}
\else
    \echo '❌ ERROR: ORBITOX_RUNTIME_PASSWORD must be provided via environment variable.'
    \q 1
\endif

\if :{?maintenance_password}
\else
    \echo '❌ ERROR: ORBITOX_MAINTENANCE_PASSWORD must be provided via environment variable.'
    \q 1
\endif

\if :{?platform_admin_audit_password}
\else
    \echo '❌ ERROR: ORBITOX_PLATFORM_ADMIN_AUDIT_PASSWORD must be provided via environment variable.'
    \q 1
\endif

\if :{?hms_audit_reader_password}
\else
    \echo '❌ ERROR: HMS_AUDIT_READER_PASSWORD must be provided via environment variable.'
    \q 1
\endif

\if :{?outbox_relay_password}
\else
    \echo '❌ ERROR: ORBITOX_OUTBOX_RELAY_PASSWORD must be provided via environment variable.'
    \q 1
\endif

-- 0. Database Safety Assertion: Ensure this script is NOT run against system database 'postgres'
DO $$
BEGIN
    IF current_database() = 'postgres' THEN
        RAISE EXCEPTION 'Safety check failed: vps-enable-roles.sql must be executed against the application database (e.g., orbitox_staging), never against system database "postgres". Current database: %', current_database();
    END IF;
END
$$;

-- 1. Verify that all 8 system roles exist before attempting alteration
DO $$
DECLARE
    v_missing_roles TEXT[];
BEGIN
    SELECT array_agg(expected.name)
    INTO v_missing_roles
    FROM (
        VALUES
            ('orbitox_migrator'),
            ('orbitox_runtime'),
            ('orbitox_maintenance'),
            ('orbitox_platform_admin_audit'),
            ('hms_audit_reader'),
            ('orbitox_outbox_relay'),
            ('orbitox_audit_resolver'),
            ('orbitox_audit_recovery')
    ) AS expected(name)
    WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = expected.name);

    IF v_missing_roles IS NOT NULL AND array_length(v_missing_roles, 1) > 0 THEN
        RAISE EXCEPTION 'Prerequisites not met: Missing expected roles from migrations: %', array_to_string(v_missing_roles, ', ');
    END IF;
END
$$;

-- 2. Alter the 5 operational service roles to enable LOGIN with least-privilege attributes
ALTER ROLE orbitox_runtime WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD :'runtime_password';
ALTER ROLE orbitox_maintenance WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD :'maintenance_password';
ALTER ROLE orbitox_platform_admin_audit WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD :'platform_admin_audit_password';
ALTER ROLE hms_audit_reader WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD :'hms_audit_reader_password';
ALTER ROLE orbitox_outbox_relay WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD :'outbox_relay_password';

-- 2b. Least-privilege table privilege enforcement (Q-09)
-- Runtime role only reads and records rate limit buckets; drop/truncate is handled by partition maintenance
REVOKE DELETE, TRUNCATE ON TABLE public."PlatformRateLimitBucket" FROM orbitox_runtime;

-- 2c. Security-definer routine least-privilege privilege enforcement (Q-08)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'resolve_platform_audit_intent') THEN
        REVOKE ALL ON FUNCTION public.resolve_platform_audit_intent(TEXT, TEXT, TEXT, BIGINT) FROM PUBLIC;
        REVOKE EXECUTE ON FUNCTION public.resolve_platform_audit_intent(TEXT, TEXT, TEXT, BIGINT) FROM orbitox_maintenance;
        GRANT EXECUTE ON FUNCTION public.resolve_platform_audit_intent(TEXT, TEXT, TEXT, BIGINT) TO orbitox_runtime;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'recover_stale_platform_audit_intents') THEN
        REVOKE ALL ON FUNCTION public.recover_stale_platform_audit_intents(TIMESTAMPTZ, INTEGER) FROM PUBLIC;
        REVOKE EXECUTE ON FUNCTION public.recover_stale_platform_audit_intents(TIMESTAMPTZ, INTEGER) FROM orbitox_runtime;
        GRANT EXECUTE ON FUNCTION public.recover_stale_platform_audit_intents(TIMESTAMPTZ, INTEGER) TO orbitox_maintenance;
    END IF;
END
$$;

-- 3. Sanitize helper roles and strictly verify they remain NOLOGIN with NOBYPASSRLS
ALTER ROLE orbitox_audit_resolver WITH NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT;
ALTER ROLE orbitox_audit_recovery WITH NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT;

DO $$
DECLARE
    v_resolver_login BOOLEAN;
    v_recovery_login BOOLEAN;
    v_resolver_bypass BOOLEAN;
    v_recovery_bypass BOOLEAN;
BEGIN
    SELECT rolcanlogin, rolbypassrls INTO v_resolver_login, v_resolver_bypass FROM pg_roles WHERE rolname = 'orbitox_audit_resolver';
    SELECT rolcanlogin, rolbypassrls INTO v_recovery_login, v_recovery_bypass FROM pg_roles WHERE rolname = 'orbitox_audit_recovery';

    IF v_resolver_login THEN
        RAISE EXCEPTION 'Security invariant violation: orbitox_audit_resolver must have rolcanlogin=false!';
    END IF;

    IF v_recovery_login THEN
        RAISE EXCEPTION 'Security invariant violation: orbitox_audit_recovery must have rolcanlogin=false!';
    END IF;

    IF v_resolver_bypass THEN
        RAISE EXCEPTION 'Security invariant violation: orbitox_audit_resolver must have rolbypassrls=false!';
    END IF;

    IF v_recovery_bypass THEN
        RAISE EXCEPTION 'Security invariant violation: orbitox_audit_recovery must have rolbypassrls=false!';
    END IF;

    RAISE NOTICE '✓ Verified orbitox_audit_resolver and orbitox_audit_recovery remain NOLOGIN with NOBYPASSRLS.';
END
$$;

DO $$
BEGIN
    RAISE NOTICE '✓ All 5 operational service roles successfully enabled WITH LOGIN and assigned secure passwords.';
END
$$;
