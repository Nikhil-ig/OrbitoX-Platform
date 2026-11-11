-- Migration: 20261108170000_orbitox_audit_roles_rls_policy
-- Replaces BYPASSRLS on PlatformAuditEvent for audit resolution and recovery roles with narrow RLS policy

CREATE POLICY orbitox_audit_resolution ON public."PlatformAuditEvent"
  FOR ALL
  TO orbitox_audit_resolver, orbitox_audit_recovery
  USING (true)
  WITH CHECK (true);
