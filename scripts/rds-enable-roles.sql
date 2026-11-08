-- ─────────────────────────────────────────────────────────────
-- OrbitoX AWS RDS PostgreSQL 16 Post-Migration Role Enablement (Phase 6F)
-- ─────────────────────────────────────────────────────────────
-- Run as `orbitox_migrator` (schema owner and creator of the roles).
-- Migrations create roles as NOLOGIN to enforce atomic deployment.
-- This script enables LOGIN and sets passwords securely from Secrets Manager.
-- Idempotent on every deployment.
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

ALTER ROLE orbitox_runtime PASSWORD :'runtime_password';
ALTER ROLE orbitox_maintenance PASSWORD :'maintenance_password';
ALTER ROLE orbitox_outbox_relay PASSWORD :'outbox_relay_password';
ALTER ROLE orbitox_platform_admin_audit PASSWORD :'platform_admin_audit_password';
ALTER ROLE hms_audit_reader PASSWORD :'hms_audit_reader_password';

