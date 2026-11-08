-- ─────────────────────────────────────────────────────────────
-- OrbitoX AWS RDS PostgreSQL 16 Post-Migration Role Enablement (Phase 6F)
-- ─────────────────────────────────────────────────────────────
-- Executed strictly AFTER `prisma migrate deploy` has created the roles.
-- Run as `orbitox_migrator` (which holds CREATEROLE and database ownership).
-- Enables LOGIN on application roles created by migrations without using
-- superuser-only clauses (NOSUPERUSER, NOBYPASSRLS).
-- ─────────────────────────────────────────────────────────────

\set ON_ERROR_STOP on

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_runtime') THEN
        ALTER ROLE orbitox_runtime WITH LOGIN;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_maintenance') THEN
        ALTER ROLE orbitox_maintenance WITH LOGIN;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_outbox_relay') THEN
        ALTER ROLE orbitox_outbox_relay WITH LOGIN;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_platform_admin_audit') THEN
        ALTER ROLE orbitox_platform_admin_audit WITH LOGIN;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hms_audit_reader') THEN
        ALTER ROLE hms_audit_reader WITH LOGIN;
    END IF;
END
$$;

-- Optionally assign role passwords if provided via psql variables
\if :{?runtime_password}
ALTER ROLE orbitox_runtime PASSWORD :'runtime_password';
\elif :{?app_role_password}
ALTER ROLE orbitox_runtime PASSWORD :'app_role_password';
\endif

\if :{?maintenance_password}
ALTER ROLE orbitox_maintenance PASSWORD :'maintenance_password';
\elif :{?maintenance_role_password}
ALTER ROLE orbitox_maintenance PASSWORD :'maintenance_role_password';
\endif

\if :{?outbox_relay_password}
ALTER ROLE orbitox_outbox_relay PASSWORD :'outbox_relay_password';
\endif

\if :{?platform_admin_audit_password}
ALTER ROLE orbitox_platform_admin_audit PASSWORD :'platform_admin_audit_password';
\endif

\if :{?hms_audit_reader_password}
ALTER ROLE hms_audit_reader PASSWORD :'hms_audit_reader_password';
\endif
