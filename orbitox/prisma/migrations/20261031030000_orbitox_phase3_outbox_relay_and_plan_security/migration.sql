-- Migration 20261031030000_orbitox_phase3_outbox_relay_and_plan_security
-- 1. Restore & force Row Level Security on PlatformOutboxMessage for orbitox_runtime
ALTER TABLE "PlatformOutboxMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlatformOutboxMessage" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orbitox_tenant_isolation ON "PlatformOutboxMessage";
CREATE POLICY orbitox_tenant_isolation ON "PlatformOutboxMessage"
    FOR ALL TO orbitox_runtime
    USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
    WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));

-- 2. Create dedicated role for cross-tenant outbox relay dispatching
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_outbox_relay') THEN
        CREATE ROLE orbitox_outbox_relay NOINHERIT;
    END IF;
END
$$;

-- 3. Grant restricted privileges to orbitox_outbox_relay
-- Role can SELECT rows and UPDATE status, retryCount, lastError, dispatchedAt.
-- It cannot INSERT, DELETE, or modify payload.
GRANT SELECT ON TABLE "PlatformOutboxMessage" TO orbitox_outbox_relay;
GRANT UPDATE ("status", "retryCount", "lastError", "dispatchedAt") ON TABLE "PlatformOutboxMessage" TO orbitox_outbox_relay;

DROP POLICY IF EXISTS orbitox_outbox_relay_policy ON "PlatformOutboxMessage";
CREATE POLICY orbitox_outbox_relay_policy ON "PlatformOutboxMessage"
    FOR ALL TO orbitox_outbox_relay
    USING (true)
    WITH CHECK (true);

-- 4. P3: Plans are commercial terms and immutable for deletion. Revoke DELETE from orbitox_runtime.
REVOKE DELETE ON TABLE "Plugin" FROM orbitox_runtime;
REVOKE DELETE ON TABLE "Plan" FROM orbitox_runtime;
REVOKE DELETE ON TABLE "PlanFeature" FROM orbitox_runtime;
REVOKE DELETE ON TABLE "PlanQuota" FROM orbitox_runtime;
