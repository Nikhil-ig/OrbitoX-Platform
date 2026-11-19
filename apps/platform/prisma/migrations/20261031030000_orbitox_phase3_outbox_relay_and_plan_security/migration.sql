-- Migration 20261031030000_orbitox_phase3_outbox_relay_and_plan_security
-- 1. Ensure PlatformOutboxMessage is accessible across tenants without RLS
ALTER TABLE "PlatformOutboxMessage" DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS orbitox_tenant_isolation ON "PlatformOutboxMessage";
DROP POLICY IF EXISTS orbitox_outbox_relay_policy ON "PlatformOutboxMessage";

-- 2. Optional dedicated role for cross-tenant outbox relay dispatching
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_outbox_relay') THEN
        CREATE ROLE orbitox_outbox_relay NOINHERIT;
    END IF;
END
$$;

-- 3. Grant restricted privileges to orbitox_outbox_relay
GRANT SELECT ON TABLE "PlatformOutboxMessage" TO orbitox_outbox_relay;
GRANT UPDATE ("status", "retryCount", "lastError", "dispatchedAt") ON TABLE "PlatformOutboxMessage" TO orbitox_outbox_relay;

-- 4. P3: Plans are commercial terms and immutable for deletion via API.
REVOKE DELETE ON TABLE "Plugin" FROM orbitox_runtime;
REVOKE DELETE ON TABLE "Plan" FROM orbitox_runtime;
REVOKE DELETE ON TABLE "PlanFeature" FROM orbitox_runtime;
REVOKE DELETE ON TABLE "PlanQuota" FROM orbitox_runtime;
