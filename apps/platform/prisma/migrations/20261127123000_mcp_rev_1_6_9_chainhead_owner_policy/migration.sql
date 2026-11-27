-- Migration: 20261127123000_mcp_rev_1_6_9_chainhead_owner_policy
-- Purpose: Allow table owner (orbitox_migrator, used by SECURITY DEFINER chain-head RPCs)
--          under FORCE ROW LEVEL SECURITY on PlatformAuditChainHead and PlatformAuditDeterministicKey.
-- RDS-compatible (non-superuser orbitox_migrator).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_migrator') THEN
    DROP POLICY IF EXISTS PlatformAuditChainHead_owner_all ON public."PlatformAuditChainHead";
    CREATE POLICY PlatformAuditChainHead_owner_all ON public."PlatformAuditChainHead"
      FOR ALL TO orbitox_migrator USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS PlatformAuditDeterministicKey_owner_all ON public."PlatformAuditDeterministicKey";
    CREATE POLICY PlatformAuditDeterministicKey_owner_all ON public."PlatformAuditDeterministicKey"
      FOR ALL TO orbitox_migrator USING (true) WITH CHECK (true);
  END IF;
END
$$;
