-- Migration: 20261125120000_mcp_tool_governance
-- Purpose: Persistent server-side one-time MCP tool approvals and append-only MCP execution/guardrail audit logs
-- RDS-compatible (non-superuser orbitox_migrator): no SUPERUSER, BYPASSRLS, or ALTER ROLE statements.

-- CreateTable
CREATE TABLE "McpToolApproval" (
    "id" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "approvalPolicy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "paramsHash" TEXT NOT NULL,
    "sanitizedParams" JSONB NOT NULL,
    "previewSummary" TEXT NOT NULL,
    "editedMessage" TEXT,
    "reason" TEXT,
    "tenantScope" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestedByEmail" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedByEmail" TEXT,
    "invocationId" TEXT,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "consumedAt" TIMESTAMPTZ,
    "rejectedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpToolApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpToolInvocation" (
    "id" TEXT NOT NULL,
    "approvalId" TEXT,
    "toolName" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "approvalPolicy" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "authType" TEXT NOT NULL,
    "callerAgent" TEXT NOT NULL,
    "tenantScope" TEXT NOT NULL,
    "sanitizedParams" JSONB NOT NULL,
    "redactedOutput" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "latencyMs" INTEGER NOT NULL,
    "redactionsApplied" INTEGER NOT NULL DEFAULT 0,
    "injectionBlocked" BOOLEAN NOT NULL DEFAULT false,
    "secretsFiltered" INTEGER NOT NULL DEFAULT 0,
    "auditEventId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpToolInvocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "McpToolApproval_status_expiresAt_idx" ON "McpToolApproval"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "McpToolApproval_requestedById_createdAt_idx" ON "McpToolApproval"("requestedById", "createdAt");

-- CreateIndex
CREATE INDEX "McpToolApproval_toolName_createdAt_idx" ON "McpToolApproval"("toolName", "createdAt");

-- CreateIndex
CREATE INDEX "McpToolInvocation_toolName_createdAt_idx" ON "McpToolInvocation"("toolName", "createdAt");

-- CreateIndex
CREATE INDEX "McpToolInvocation_status_createdAt_idx" ON "McpToolInvocation"("status", "createdAt");

-- CreateIndex
CREATE INDEX "McpToolInvocation_actorId_createdAt_idx" ON "McpToolInvocation"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "McpToolInvocation_approvalId_idx" ON "McpToolInvocation"("approvalId");

-- Explicit runtime & maintenance role grants for RDS / multi-role compatibility
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
