-- Migration: 20261126193000_mcp_governance_rev_1_6_8
-- Purpose: Allow NULL email attribution for API-key MCP actors and add deterministic correlation column on PlatformOperation.
-- RDS-compatible (non-superuser orbitox_migrator): no SUPERUSER, BYPASSRLS, or ALTER ROLE statements.

-- 1. Allow NULL emails for non-human API-key MCP actors (key ID recorded in actorId/requestedById & callerAgent)
ALTER TABLE public."McpToolApproval"
  ALTER COLUMN "requestedByEmail" DROP NOT NULL;

ALTER TABLE public."McpToolInvocation"
  ALTER COLUMN "actorEmail" DROP NOT NULL;

-- 2. Add explicit MCP execution correlation column on PlatformOperation for deterministic provisioning.retry reconciliation
ALTER TABLE public."PlatformOperation"
  ADD COLUMN IF NOT EXISTS "lastMcpExecutionId" TEXT;

CREATE INDEX IF NOT EXISTS "PlatformOperation_lastMcpExecutionId_idx"
  ON public."PlatformOperation"("lastMcpExecutionId");
