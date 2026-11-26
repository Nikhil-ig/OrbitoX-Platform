-- Migration: 20261126140000_mcp_governance_integrity
-- Purpose: Additive column for encrypted execution parameters, CHECK constraints on MCP approval & invocation states/policies, performance indexes, and role grants.
-- RDS-compatible (non-superuser orbitox_migrator): no SUPERUSER, BYPASSRLS, or ALTER ROLE statements.

-- 1. Add encryptedPayload column to McpToolApproval
ALTER TABLE public."McpToolApproval"
  ADD COLUMN IF NOT EXISTS "encryptedPayload" TEXT;

-- 2. Add CHECK constraints for McpToolApproval
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'McpToolApproval_approvalPolicy_check'
  ) THEN
    ALTER TABLE public."McpToolApproval"
      ADD CONSTRAINT "McpToolApproval_approvalPolicy_check"
      CHECK ("approvalPolicy" IN ('READ_FREELY', 'ASK_FIRST', 'STEP_UP_MFA', 'NEVER_AI'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'McpToolApproval_status_check'
  ) THEN
    ALTER TABLE public."McpToolApproval"
      ADD CONSTRAINT "McpToolApproval_status_check"
      CHECK ("status" IN ('PROPOSED', 'EXECUTING', 'SUCCEEDED', 'FAILED', 'REJECTED', 'EXPIRED'));
  END IF;
END
$$;

-- 3. Add CHECK constraints for McpToolInvocation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'McpToolInvocation_approvalPolicy_check'
  ) THEN
    ALTER TABLE public."McpToolInvocation"
      ADD CONSTRAINT "McpToolInvocation_approvalPolicy_check"
      CHECK ("approvalPolicy" IN ('READ_FREELY', 'ASK_FIRST', 'STEP_UP_MFA', 'NEVER_AI'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'McpToolInvocation_status_check'
  ) THEN
    ALTER TABLE public."McpToolInvocation"
      ADD CONSTRAINT "McpToolInvocation_status_check"
      CHECK ("status" IN ('AUTHORIZED_EXECUTED', 'EXECUTION_FAILED', 'BLOCKED_POLICY', 'BLOCKED_FORBIDDEN', 'BLOCKED_INJECTION', 'BLOCKED_TENANT_SCOPE'));
  END IF;
END
$$;

-- 4. Additive indexes for tenant scope querying and hash lookup
CREATE INDEX IF NOT EXISTS "McpToolApproval_tenantScope_createdAt_idx"
  ON public."McpToolApproval"("tenantScope", "createdAt");

CREATE INDEX IF NOT EXISTS "McpToolApproval_paramsHash_idx"
  ON public."McpToolApproval"("paramsHash");

CREATE INDEX IF NOT EXISTS "McpToolInvocation_tenantScope_createdAt_idx"
  ON public."McpToolInvocation"("tenantScope", "createdAt");

-- 5. Role grants for orbitox_runtime and orbitox_maintenance
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_runtime') THEN
    GRANT SELECT, INSERT, UPDATE ON TABLE public."McpToolApproval" TO orbitox_runtime;
    GRANT SELECT, INSERT ON TABLE public."McpToolInvocation" TO orbitox_runtime;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_maintenance') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."McpToolApproval" TO orbitox_maintenance;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."McpToolInvocation" TO orbitox_maintenance;
  END IF;
END
$$;
