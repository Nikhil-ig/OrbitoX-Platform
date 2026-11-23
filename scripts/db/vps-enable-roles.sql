-- ─────────────────────────────────────────────────────────────
-- OrbitoX Self-Managed Ubuntu VPS Post-Migration Role Enablement (Gate C)
-- ─────────────────────────────────────────────────────────────
-- Executed strictly AFTER `prisma migrate deploy` has created the schema and roles.
-- Run as PostgreSQL Cluster Superuser (`postgres`) or `orbitox_migrator`.
--
-- Objective:
-- 1. Enables LOGIN on the 5 operational service roles.
-- 2. Strictly sets passwords for each role from supplied psql variables.
-- 3. Enforces least-privilege attributes: NOSUPERUSER, NOBYPASSRLS, NOCREATEDB, NOCREATEROLE, NOINHERIT.
-- 4. Strictly verifies that helper roles (orbitox_audit_resolver, orbitox_audit_recovery)
--    remain NOLOGIN and never receive login passwords.
-- ─────────────────────────────────────────────────────────────

\set ON_ERROR_STOP on

-- Validate required password variables
\if :{?runtime_password}
\else
    \echo '❌ ERROR: Variable runtime_password must be supplied via -v runtime_password="<secret>"'
    \q 1
\endif

\if :{?maintenance_password}
\else
    \echo '❌ ERROR: Variable maintenance_password must be supplied via -v maintenance_password="<secret>"'
    \q 1
\endif

\if :{?platform_admin_audit_password}
\else
    \echo '❌ ERROR: Variable platform_admin_audit_password must be supplied via -v platform_admin_audit_password="<secret>"'
    \q 1
\endif

\if :{?hms_audit_reader_password}
\else
    \echo '❌ ERROR: Variable hms_audit_reader_password must be supplied via -v hms_audit_reader_password="<secret>"'
    \q 1
\endif

\if :{?outbox_relay_password}
\else
    \echo '❌ ERROR: Variable outbox_relay_password must be supplied via -v outbox_relay_password="<secret>"'
    \q 1
\endif

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

-- 1b. Ensure all database objects created during migrations are owned by orbitox_migrator
DO $$
BEGIN
    IF CURRENT_USER = 'postgres' THEN
        REASSIGN OWNED BY postgres TO orbitox_migrator;
        RAISE NOTICE 'Transferred ownership of newly migrated database objects to orbitox_migrator.';
    END IF;
END
$$;

-- 2. Alter the 5 operational service roles to enable LOGIN with least-privilege attributes
ALTER ROLE orbitox_runtime WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD :'runtime_password';
ALTER ROLE orbitox_maintenance WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD :'maintenance_password';
ALTER ROLE orbitox_platform_admin_audit WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD :'platform_admin_audit_password';
ALTER ROLE hms_audit_reader WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD :'hms_audit_reader_password';
ALTER ROLE orbitox_outbox_relay WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD :'outbox_relay_password';

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
