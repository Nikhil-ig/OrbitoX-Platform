ALTER ROLE orbitox_runtime LOGIN PASSWORD :'app_role_password';
ALTER ROLE orbitox_maintenance LOGIN PASSWORD :'maintenance_role_password';
ALTER ROLE orbitox_platform_admin_audit LOGIN PASSWORD :'platform_admin_audit_password';
ALTER ROLE hms_audit_reader LOGIN PASSWORD :'hms_audit_reader_password';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_outbox_relay') THEN
        CREATE ROLE orbitox_outbox_relay NOINHERIT;
    END IF;
END
$$;
ALTER ROLE orbitox_outbox_relay LOGIN PASSWORD :'outbox_relay_password';

DO $$
BEGIN
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO orbitox_outbox_relay', current_database());
END
$$;
GRANT USAGE ON SCHEMA public TO orbitox_outbox_relay;