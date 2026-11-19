-- Migration 20261031040000_orbitox_phase3_force_rls_outbox_relay
-- 1. ENABLE and FORCE Row Level Security on PlatformOutboxMessage
ALTER TABLE "PlatformOutboxMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlatformOutboxMessage" FORCE ROW LEVEL SECURITY;

-- 2. Restore tenant policy for orbitox_runtime
DROP POLICY IF EXISTS orbitox_tenant_isolation ON "PlatformOutboxMessage";
CREATE POLICY orbitox_tenant_isolation ON "PlatformOutboxMessage"
    FOR ALL TO orbitox_runtime
    USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
    WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));

-- 3. Ensure role orbitox_outbox_relay exists and has restricted privileges
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_outbox_relay') THEN
        CREATE ROLE orbitox_outbox_relay NOINHERIT;
    END IF;
END
$$;

REVOKE ALL ON TABLE "PlatformOutboxMessage" FROM orbitox_outbox_relay;
GRANT SELECT ON TABLE "PlatformOutboxMessage" TO orbitox_outbox_relay;
GRANT UPDATE ("status", "retryCount", "lastError", "dispatchedAt") ON TABLE "PlatformOutboxMessage" TO orbitox_outbox_relay;

-- 4. USING (true) SELECT/UPDATE policy for orbitox_outbox_relay only
DROP POLICY IF EXISTS orbitox_outbox_relay_policy ON "PlatformOutboxMessage";
DROP POLICY IF EXISTS orbitox_outbox_relay_select ON "PlatformOutboxMessage";
DROP POLICY IF EXISTS orbitox_outbox_relay_update ON "PlatformOutboxMessage";

CREATE POLICY orbitox_outbox_relay_select ON "PlatformOutboxMessage"
    FOR SELECT TO orbitox_outbox_relay
    USING (true);

CREATE POLICY orbitox_outbox_relay_update ON "PlatformOutboxMessage"
    FOR UPDATE TO orbitox_outbox_relay
    USING (true)
    WITH CHECK (true);
