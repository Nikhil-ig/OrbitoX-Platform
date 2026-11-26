-- Migration: 20261126150000_mcp_audit_durability
-- Purpose: Durable MCP execution intent & recovery tracking, server-side approval delegation, key-ID tracking, append-only invocation states, and AccountEmailOutbox idempotency.
-- RDS-compatible (non-superuser orbitox_migrator): no SUPERUSER, BYPASSRLS, or ALTER ROLE statements.

-- 1. Extend McpToolApproval with key IDs, delegation attribution, and RECOVERY_REQUIRED status
ALTER TABLE public."McpToolApproval"
  ADD COLUMN IF NOT EXISTS "encryptionKid" TEXT,
  ADD COLUMN IF NOT EXISTS "hmacKid" TEXT,
  ADD COLUMN IF NOT EXISTS "delegationId" TEXT,
  ADD COLUMN IF NOT EXISTS "delegatedById" TEXT;

ALTER TABLE public."McpToolApproval"
  DROP CONSTRAINT IF EXISTS "McpToolApproval_status_check",
  ADD CONSTRAINT "McpToolApproval_status_check"
  CHECK ("status" IN ('PROPOSED', 'EXECUTING', 'SUCCEEDED', 'FAILED', 'REJECTED', 'EXPIRED', 'RECOVERY_REQUIRED'));

CREATE INDEX IF NOT EXISTS "McpToolApproval_encryptionKid_status_idx"
  ON public."McpToolApproval"("encryptionKid", "status")
  WHERE "encryptionKid" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "McpToolApproval_hmacKid_status_idx"
  ON public."McpToolApproval"("hmacKid", "status")
  WHERE "hmacKid" IS NOT NULL;

-- 2. Extend McpToolInvocation with executionId, idempotencyKey, EXECUTION_INTENT & RECOVERY_REQUIRED
ALTER TABLE public."McpToolInvocation"
  ADD COLUMN IF NOT EXISTS "executionId" TEXT,
  ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

ALTER TABLE public."McpToolInvocation"
  DROP CONSTRAINT IF EXISTS "McpToolInvocation_status_check",
  ADD CONSTRAINT "McpToolInvocation_status_check"
  CHECK ("status" IN ('EXECUTION_INTENT', 'AUTHORIZED_EXECUTED', 'EXECUTION_FAILED', 'BLOCKED_POLICY', 'BLOCKED_FORBIDDEN', 'BLOCKED_INJECTION', 'BLOCKED_TENANT_SCOPE', 'RECOVERY_REQUIRED'));

CREATE INDEX IF NOT EXISTS "McpToolInvocation_executionId_idx"
  ON public."McpToolInvocation"("executionId")
  WHERE "executionId" IS NOT NULL;

-- 3. Create McpToolExecution table for durable intent, lease, and recovery reconciliation
CREATE TABLE IF NOT EXISTS public."McpToolExecution" (
  "id" TEXT NOT NULL,
  "approvalId" TEXT NOT NULL,
  "invocationId" TEXT,
  "toolName" TEXT NOT NULL,
  "tenantScope" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'EXECUTION_INTENT',
  "encryptionKid" TEXT,
  "hmacKid" TEXT,
  "startedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseOwner" TEXT,
  "leaseExpiresAt" TIMESTAMPTZ,
  "attemptNumber" INTEGER NOT NULL DEFAULT 1,
  "reconciliationStatus" TEXT,
  "auditIntentEventId" TEXT,
  "finalAuditEventId" TEXT,
  "lastErrorCode" TEXT,
  "lastErrorMessage" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "McpToolExecution_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "McpToolExecution_approvalId_key" UNIQUE ("approvalId"),
  CONSTRAINT "McpToolExecution_idempotencyKey_key" UNIQUE ("idempotencyKey"),
  CONSTRAINT "McpToolExecution_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES public."McpToolApproval"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "McpToolExecution_status_check" CHECK ("status" IN ('EXECUTION_INTENT', 'EXECUTION_RUNNING', 'AUTHORIZED_EXECUTED', 'EXECUTION_FAILED', 'RECOVERY_REQUIRED'))
);

CREATE INDEX IF NOT EXISTS "McpToolExecution_status_leaseExpiresAt_idx"
  ON public."McpToolExecution"("status", "leaseExpiresAt");

CREATE INDEX IF NOT EXISTS "McpToolExecution_tenantScope_createdAt_idx"
  ON public."McpToolExecution"("tenantScope", "createdAt");

-- 4. Create McpApprovalDelegation table for server-authorized delegation
CREATE TABLE IF NOT EXISTS public."McpApprovalDelegation" (
  "id" TEXT NOT NULL,
  "delegatorId" TEXT NOT NULL,
  "delegatorEmail" TEXT NOT NULL,
  "delegateId" TEXT NOT NULL,
  "delegateEmail" TEXT NOT NULL,
  "allowedRiskTier" TEXT NOT NULL,
  "tenantScope" TEXT NOT NULL DEFAULT '*',
  "reason" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "revokedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "McpApprovalDelegation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "McpApprovalDelegation_allowedRiskTier_check" CHECK ("allowedRiskTier" IN ('ASK_FIRST', 'STEP_UP_MFA', 'ALL'))
);

CREATE INDEX IF NOT EXISTS "McpApprovalDelegation_delegateId_active_idx"
  ON public."McpApprovalDelegation"("delegateId", "revokedAt", "expiresAt");

-- 5. Add idempotencyKey to AccountEmailOutbox for duplicate reminder prevention
ALTER TABLE public."AccountEmailOutbox"
  ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "AccountEmailOutbox_idempotencyKey_idx"
  ON public."AccountEmailOutbox"("idempotencyKey")
  WHERE "idempotencyKey" IS NOT NULL;

-- 6. Role grants for orbitox_runtime and orbitox_maintenance
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_runtime') THEN
    GRANT SELECT, INSERT, UPDATE ON TABLE public."McpToolExecution" TO orbitox_runtime;
    GRANT SELECT, INSERT, UPDATE ON TABLE public."McpApprovalDelegation" TO orbitox_runtime;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_maintenance') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."McpToolExecution" TO orbitox_maintenance;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."McpApprovalDelegation" TO orbitox_maintenance;
  END IF;
END
$$;
