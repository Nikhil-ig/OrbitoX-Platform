-- ─────────────────────────────────────────────────────────────
-- OrbitoX AWS RDS PostgreSQL 16 Idempotent Role Bootstrap (Phase 6F)
-- ─────────────────────────────────────────────────────────────
-- Run as RDS Master Administrative User (member of rds_superuser)
-- Establishes least-privilege security roles before migration deploy:
-- 1. orbitox_migrator: Schema owner, runs `prisma migrate deploy`
-- 2. orbitox_runtime: App web service, subject to FORCE ROW LEVEL SECURITY
-- 3. orbitox_maintenance: Leased daily billing grace sweep and tenant retention
-- 4. orbitox_outbox_relay: Transactional email queue claim & delivery
-- 5. orbitox_platform_admin_audit: Dedicated platform admin audit event logger
-- 6. hms_audit_reader: Healthcare audit trail reader
-- ─────────────────────────────────────────────────────────────

\set ON_ERROR_STOP on

-- 1. Create orbitox_migrator role (Schema Owner)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_migrator') THEN
        CREATE ROLE orbitox_migrator WITH LOGIN CREATEDB NOBYPASSRLS;
    ELSE
        ALTER ROLE orbitox_migrator WITH LOGIN CREATEDB NOBYPASSRLS;
    END IF;
END
$$;
ALTER ROLE orbitox_migrator PASSWORD :'migrator_password';

-- 2. Create orbitox_runtime role (Compute & API runtime)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_runtime') THEN
        CREATE ROLE orbitox_runtime WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    ELSE
        ALTER ROLE orbitox_runtime WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    END IF;
END
$$;
ALTER ROLE orbitox_runtime PASSWORD :'runtime_password';

-- 3. Create orbitox_maintenance role (Background sweep & retention)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_maintenance') THEN
        CREATE ROLE orbitox_maintenance WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    ELSE
        ALTER ROLE orbitox_maintenance WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    END IF;
END
$$;
ALTER ROLE orbitox_maintenance PASSWORD :'maintenance_password';

-- 4. Create orbitox_outbox_relay role (Transactional email delivery)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_outbox_relay') THEN
        CREATE ROLE orbitox_outbox_relay WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    ELSE
        ALTER ROLE orbitox_outbox_relay WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    END IF;
END
$$;
ALTER ROLE orbitox_outbox_relay PASSWORD :'outbox_relay_password';

-- 5. Create orbitox_platform_admin_audit role
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_platform_admin_audit') THEN
        CREATE ROLE orbitox_platform_admin_audit WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    ELSE
        ALTER ROLE orbitox_platform_admin_audit WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    END IF;
END
$$;
ALTER ROLE orbitox_platform_admin_audit PASSWORD :'platform_admin_audit_password';

-- 6. Create hms_audit_reader role
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hms_audit_reader') THEN
        CREATE ROLE hms_audit_reader WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    ELSE
        ALTER ROLE hms_audit_reader WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    END IF;
END
$$;
ALTER ROLE hms_audit_reader PASSWORD :'hms_audit_reader_password';

-- Grant membership of orbitox_migrator to master admin so master can administer owned objects
DO $$
BEGIN
    EXECUTE format('GRANT orbitox_migrator TO %I', CURRENT_USER);
END
$$;

-- Connect grants on current database
DO $$
DECLARE
    role_name TEXT;
BEGIN
    FOR role_name IN SELECT unnest(ARRAY[
        'orbitox_migrator',
        'orbitox_runtime',
        'orbitox_maintenance',
        'orbitox_outbox_relay',
        'orbitox_platform_admin_audit',
        'hms_audit_reader'
    ]) LOOP
        EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), role_name);
    END LOOP;
END
$$;

-- Schema Ownership & Usage
ALTER SCHEMA public OWNER TO orbitox_migrator;
GRANT ALL ON SCHEMA public TO orbitox_migrator;
GRANT USAGE ON SCHEMA public TO orbitox_runtime, orbitox_maintenance, orbitox_outbox_relay, orbitox_platform_admin_audit, hms_audit_reader;
