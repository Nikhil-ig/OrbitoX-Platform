-- Migration: 20261127120000_mcp_rev_1_6_9_integrity
-- Purpose: Atomic audit chain head serialization + RPCs, McpToolInvocation terminal uniqueness,
--          PlatformOperationAttempt history, BillingReminderBatchItem ledger, TenantSuspensionSync,
--          AccountEmailOutbox FORCE RLS, and orbitox_audit_reader read-only verification role.
-- RDS-compatible (non-superuser orbitox_migrator): no SUPERUSER, BYPASSRLS, or ALTER ROLE statements.

-- 1. Create audit chain head and deterministic idempotency index tables
CREATE TABLE IF NOT EXISTS public."PlatformAuditChainHead" (
  "scope" TEXT NOT NULL,
  "lastSequence" BIGINT NOT NULL DEFAULT 0,
  "lastRowHash" TEXT NOT NULL DEFAULT 'GENESIS',
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlatformAuditChainHead_pkey" PRIMARY KEY ("scope")
);

CREATE TABLE IF NOT EXISTS public."PlatformAuditDeterministicKey" (
  "id" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "requestId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlatformAuditDeterministicKey_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PlatformAuditDeterministicKey_scope_createdAt_idx"
  ON public."PlatformAuditDeterministicKey"("scope", "createdAt");

-- Backfill PlatformAuditDeterministicKey & PlatformAuditChainHead idempotently from existing ledger rows
INSERT INTO public."PlatformAuditDeterministicKey" ("id", "scope", "action", "entityType", "entityId", "requestId", "createdAt")
SELECT
  e."id",
  COALESCE(
    NULLIF(e."metadata"->'_chain'->>'scope', ''),
    format(
      'org/%s/project/%s/environment/%s',
      COALESCE(NULLIF(e."organizationId", ''), 'platform'),
      COALESCE(NULLIF(e."projectId", ''), 'operations'),
      COALESCE(NULLIF(e."environmentId", ''), 'platform-admin')
    )
  ),
  e."action",
  e."entityType",
  e."entityId",
  e."requestId",
  COALESCE(e."occurredAt"::timestamptz, CURRENT_TIMESTAMP)
FROM public."PlatformAuditEvent" e
ON CONFLICT ("id") DO NOTHING;

WITH scoped AS (
  SELECT
    COALESCE(
      NULLIF(e."metadata"->'_chain'->>'scope', ''),
      format(
        'org/%s/project/%s/environment/%s',
        COALESCE(NULLIF(e."organizationId", ''), 'platform'),
        COALESCE(NULLIF(e."projectId", ''), 'operations'),
        COALESCE(NULLIF(e."environmentId", ''), 'platform-admin')
      )
    ) AS scope_val,
    COALESCE(
      CASE WHEN (e."metadata"->'_chain'->>'sequence') ~ '^[0-9]+$'
        THEN (e."metadata"->'_chain'->>'sequence')::bigint
        ELSE NULL
      END,
      ROW_NUMBER() OVER (
        PARTITION BY COALESCE(
          NULLIF(e."metadata"->'_chain'->>'scope', ''),
          format(
            'org/%s/project/%s/environment/%s',
            COALESCE(NULLIF(e."organizationId", ''), 'platform'),
            COALESCE(NULLIF(e."projectId", ''), 'operations'),
            COALESCE(NULLIF(e."environmentId", ''), 'platform-admin')
          )
        )
        ORDER BY e."occurredAt" ASC, e."id" ASC
      )
    ) AS seq_val,
    COALESCE(
      NULLIF(e."metadata"->'_chain'->>'rowHash', ''),
      encode(sha256(convert_to(e."id", 'UTF8')), 'hex')
    ) AS hash_val,
    e."occurredAt",
    e."id"
  FROM public."PlatformAuditEvent" e
),
latest_per_scope AS (
  SELECT DISTINCT ON (scope_val)
    scope_val,
    seq_val,
    hash_val
  FROM scoped
  ORDER BY scope_val, seq_val DESC, "occurredAt" DESC, "id" DESC
)
INSERT INTO public."PlatformAuditChainHead" ("scope", "lastSequence", "lastRowHash", "updatedAt")
SELECT scope_val, seq_val, hash_val, CURRENT_TIMESTAMP
FROM latest_per_scope
ON CONFLICT ("scope") DO UPDATE
  SET "lastSequence" = GREATEST(public."PlatformAuditChainHead"."lastSequence", EXCLUDED."lastSequence"),
      "lastRowHash" = CASE
        WHEN EXCLUDED."lastSequence" >= public."PlatformAuditChainHead"."lastSequence"
          THEN EXCLUDED."lastRowHash"
        ELSE public."PlatformAuditChainHead"."lastRowHash"
      END,
      "updatedAt" = CURRENT_TIMESTAMP;

-- 2. SECURITY DEFINER audit chain serialization & deterministic idempotency functions
CREATE OR REPLACE FUNCTION public.claim_platform_audit_chain_slot(
  p_scope TEXT,
  p_deterministic_id TEXT DEFAULT NULL,
  p_expected_action TEXT DEFAULT NULL,
  p_expected_entity_type TEXT DEFAULT NULL,
  p_expected_entity_id TEXT DEFAULT NULL,
  p_expected_request_id TEXT DEFAULT NULL
)
RETURNS TABLE(
  already_exists BOOLEAN,
  conflict BOOLEAN,
  next_sequence BIGINT,
  previous_hash TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_existing RECORD;
  v_head RECORD;
BEGIN
  IF session_user NOT IN ('orbitox_platform_admin_audit', 'orbitox_runtime', 'orbitox_migrator', 'orbitox_maintenance', 'postgres', 'apple') THEN
    RAISE EXCEPTION 'unauthorized audit chain slot caller: %', session_user;
  END IF;

  IF p_scope IS NULL OR length(trim(p_scope)) = 0 THEN
    RAISE EXCEPTION 'audit chain scope is required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('orbitox_audit_chain:' || p_scope));

  IF p_deterministic_id IS NOT NULL AND length(trim(p_deterministic_id)) > 0 THEN
    SELECT "id", "action", "entityType", "entityId", "requestId"
    INTO v_existing
    FROM public."PlatformAuditDeterministicKey"
    WHERE "id" = p_deterministic_id;

    IF FOUND THEN
      IF (p_expected_action IS NOT NULL AND v_existing."action" IS DISTINCT FROM p_expected_action)
         OR (p_expected_entity_type IS NOT NULL AND v_existing."entityType" IS DISTINCT FROM p_expected_entity_type)
         OR (p_expected_entity_id IS NOT NULL AND v_existing."entityId" IS DISTINCT FROM p_expected_entity_id)
         OR (p_expected_request_id IS NOT NULL AND v_existing."requestId" IS DISTINCT FROM p_expected_request_id) THEN
        RETURN QUERY SELECT TRUE, TRUE, 0::BIGINT, ''::TEXT;
        RETURN;
      END IF;
      RETURN QUERY SELECT TRUE, FALSE, 0::BIGINT, ''::TEXT;
      RETURN;
    END IF;
  END IF;

  SELECT "lastSequence", "lastRowHash"
  INTO v_head
  FROM public."PlatformAuditChainHead"
  WHERE "scope" = p_scope
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, FALSE, 1::BIGINT, 'GENESIS'::TEXT;
  ELSE
    RETURN QUERY SELECT FALSE, FALSE, (v_head."lastSequence" + 1)::BIGINT, v_head."lastRowHash"::TEXT;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.advance_platform_audit_chain_head(
  p_scope TEXT,
  p_sequence BIGINT,
  p_row_hash TEXT,
  p_event_id TEXT,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT DEFAULT NULL,
  p_request_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_updated_scope TEXT;
BEGIN
  IF session_user NOT IN ('orbitox_platform_admin_audit', 'orbitox_runtime', 'orbitox_migrator', 'orbitox_maintenance', 'postgres', 'apple') THEN
    RAISE EXCEPTION 'unauthorized audit chain head mutator: %', session_user;
  END IF;

  IF p_sequence < 1 THEN
    RAISE EXCEPTION 'audit sequence must be >= 1';
  END IF;

  INSERT INTO public."PlatformAuditChainHead" ("scope", "lastSequence", "lastRowHash", "updatedAt")
  VALUES (p_scope, p_sequence, p_row_hash, NOW())
  ON CONFLICT ("scope") DO UPDATE
    SET "lastSequence" = EXCLUDED."lastSequence",
        "lastRowHash" = EXCLUDED."lastRowHash",
        "updatedAt" = NOW()
    WHERE public."PlatformAuditChainHead"."lastSequence" + 1 = EXCLUDED."lastSequence"
  RETURNING "scope" INTO v_updated_scope;

  IF v_updated_scope IS NULL THEN
    RAISE EXCEPTION 'AUDIT_CHAIN_SEQUENCE_MISMATCH for scope % at sequence %', p_scope, p_sequence;
  END IF;

  INSERT INTO public."PlatformAuditDeterministicKey" ("id", "scope", "action", "entityType", "entityId", "requestId")
  VALUES (p_event_id, p_scope, p_action, p_entity_type, p_entity_id, p_request_id)
  ON CONFLICT ("id") DO NOTHING;
END
$$;

REVOKE ALL ON FUNCTION public.claim_platform_audit_chain_slot(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.advance_platform_audit_chain_head(TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;

-- 3. Extend McpToolInvocation status constraints for P2-4 early validation audits & terminal uniqueness
ALTER TABLE public."McpToolInvocation"
  DROP CONSTRAINT IF EXISTS "McpToolInvocation_status_check",
  ADD CONSTRAINT "McpToolInvocation_status_check"
  CHECK ("status" IN (
    'EXECUTION_INTENT',
    'AUTHORIZED_EXECUTED',
    'EXECUTION_FAILED',
    'BLOCKED_POLICY',
    'BLOCKED_FORBIDDEN',
    'BLOCKED_INJECTION',
    'BLOCKED_TENANT_SCOPE',
    'BLOCKED_VALIDATION',
    'BLOCKED_UNAVAILABLE',
    'RECOVERY_REQUIRED'
  ));

CREATE INDEX IF NOT EXISTS "McpToolInvocation_executionId_idx"
  ON public."McpToolInvocation"("executionId");

CREATE UNIQUE INDEX IF NOT EXISTS "McpToolInvocation_execution_terminal_uidx"
  ON public."McpToolInvocation"("executionId", "status")
  WHERE "executionId" IS NOT NULL AND "status" IN ('AUTHORIZED_EXECUTED', 'EXECUTION_FAILED');

-- 4. Provisioning Retry Attempt History (Workstream H)
CREATE TABLE IF NOT EXISTS public."PlatformOperationAttempt" (
  "id" TEXT NOT NULL,
  "operationId" TEXT NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "mcpExecutionId" TEXT,
  "leaseOwner" TEXT,
  "triggeredBy" TEXT,
  "status" TEXT NOT NULL DEFAULT 'STARTED',
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ,

  CONSTRAINT "PlatformOperationAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlatformOperationAttempt_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES public."PlatformOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlatformOperationAttempt_status_check" CHECK ("status" IN ('STARTED', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'SUPERSEDED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlatformOperationAttempt_operationId_attemptNumber_key"
  ON public."PlatformOperationAttempt"("operationId", "attemptNumber");

CREATE INDEX IF NOT EXISTS "PlatformOperationAttempt_operationId_startedAt_idx"
  ON public."PlatformOperationAttempt"("operationId", "startedAt");

CREATE INDEX IF NOT EXISTS "PlatformOperationAttempt_mcpExecutionId_idx"
  ON public."PlatformOperationAttempt"("mcpExecutionId");

CREATE UNIQUE INDEX IF NOT EXISTS "PlatformOperationAttempt_mcpExecutionId_uidx"
  ON public."PlatformOperationAttempt"("mcpExecutionId")
  WHERE "mcpExecutionId" IS NOT NULL;

-- 5. Billing Reminder Batch Per-Recipient Ledger (Workstream E)
CREATE TABLE IF NOT EXISTS public."BillingReminderBatchItem" (
  "id" TEXT NOT NULL,
  "executionId" TEXT NOT NULL,
  "approvalId" TEXT,
  "subscriptionId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "emailOutboxId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "errorMessage" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BillingReminderBatchItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BillingReminderBatchItem_idempotencyKey_key" UNIQUE ("idempotencyKey"),
  CONSTRAINT "BillingReminderBatchItem_status_check" CHECK ("status" IN ('QUEUED', 'IDEMPOTENT_REPLAY', 'FAILED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "BillingReminderBatchItem_executionId_subscriptionId_key"
  ON public."BillingReminderBatchItem"("executionId", "subscriptionId");

CREATE INDEX IF NOT EXISTS "BillingReminderBatchItem_executionId_status_idx"
  ON public."BillingReminderBatchItem"("executionId", "status");

CREATE INDEX IF NOT EXISTS "BillingReminderBatchItem_subscriptionId_createdAt_idx"
  ON public."BillingReminderBatchItem"("subscriptionId", "createdAt");

-- 6. External Tenant Suspension Sync Tracking (Workstream I)
CREATE TABLE IF NOT EXISTS public."TenantSuspensionSync" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "pluginId" TEXT NOT NULL,
  "targetTenantId" TEXT NOT NULL,
  "targetRevision" INTEGER NOT NULL,
  "acknowledgedRevision" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "lastError" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TenantSuspensionSync_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TenantSuspensionSync_status_check" CHECK ("status" IN ('PENDING', 'ACKNOWLEDGED', 'DEGRADED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "TenantSuspensionSync_projectId_pluginId_key"
  ON public."TenantSuspensionSync"("projectId", "pluginId");

CREATE INDEX IF NOT EXISTS "TenantSuspensionSync_status_updatedAt_idx"
  ON public."TenantSuspensionSync"("status", "updatedAt");

-- 7. Enforce FORCE RLS on AccountEmailOutbox + PlatformAuditChainHead/DeterministicKey
ALTER TABLE public."AccountEmailOutbox" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AccountEmailOutbox" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orbitox_email_outbox_runtime_insert ON public."AccountEmailOutbox";
DROP POLICY IF EXISTS orbitox_email_outbox_relay_select ON public."AccountEmailOutbox";
DROP POLICY IF EXISTS orbitox_email_outbox_relay_update ON public."AccountEmailOutbox";
DROP POLICY IF EXISTS AccountEmailOutbox_maintenance_all ON public."AccountEmailOutbox";

CREATE POLICY orbitox_email_outbox_runtime_insert ON public."AccountEmailOutbox"
  FOR INSERT TO orbitox_runtime WITH CHECK (true);

CREATE POLICY orbitox_email_outbox_relay_select ON public."AccountEmailOutbox"
  FOR SELECT TO orbitox_outbox_relay USING (true);

CREATE POLICY orbitox_email_outbox_relay_update ON public."AccountEmailOutbox"
  FOR UPDATE TO orbitox_outbox_relay USING (true) WITH CHECK (true);

CREATE POLICY AccountEmailOutbox_maintenance_all ON public."AccountEmailOutbox"
  FOR ALL TO orbitox_maintenance USING (true) WITH CHECK (true);

ALTER TABLE public."PlatformAuditChainHead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PlatformAuditChainHead" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."PlatformAuditDeterministicKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PlatformAuditDeterministicKey" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS PlatformAuditChainHead_maintenance_all ON public."PlatformAuditChainHead";
DROP POLICY IF EXISTS PlatformAuditChainHead_reader_select ON public."PlatformAuditChainHead";
DROP POLICY IF EXISTS PlatformAuditDeterministicKey_maintenance_all ON public."PlatformAuditDeterministicKey";

CREATE POLICY PlatformAuditChainHead_maintenance_all ON public."PlatformAuditChainHead"
  FOR ALL TO orbitox_maintenance USING (true) WITH CHECK (true);

CREATE POLICY PlatformAuditDeterministicKey_maintenance_all ON public."PlatformAuditDeterministicKey"
  FOR ALL TO orbitox_maintenance USING (true) WITH CHECK (true);

-- 8. Dedicated Read-Only Audit Reader Role & Function/Table Grants
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_audit_reader') THEN
    CREATE ROLE orbitox_audit_reader NOINHERIT;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_migrator') AND current_user <> 'orbitox_migrator' THEN
    ALTER TABLE public."PlatformAuditChainHead" OWNER TO orbitox_migrator;
    ALTER TABLE public."PlatformAuditDeterministicKey" OWNER TO orbitox_migrator;
    ALTER TABLE public."PlatformOperationAttempt" OWNER TO orbitox_migrator;
    ALTER TABLE public."BillingReminderBatchItem" OWNER TO orbitox_migrator;
    ALTER TABLE public."TenantSuspensionSync" OWNER TO orbitox_migrator;
    ALTER FUNCTION public.claim_platform_audit_chain_slot(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) OWNER TO orbitox_migrator;
    ALTER FUNCTION public.advance_platform_audit_chain_head(TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) OWNER TO orbitox_migrator;
  END IF;

  GRANT USAGE ON SCHEMA public TO orbitox_audit_reader;
  GRANT SELECT ON TABLE public."PlatformAuditEvent", public."PlatformAuditChainHead" TO orbitox_audit_reader;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_platform_admin_audit') THEN
    GRANT EXECUTE ON FUNCTION public.claim_platform_audit_chain_slot(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO orbitox_platform_admin_audit;
    GRANT EXECUTE ON FUNCTION public.advance_platform_audit_chain_head(TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO orbitox_platform_admin_audit;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_runtime') THEN
    GRANT EXECUTE ON FUNCTION public.claim_platform_audit_chain_slot(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO orbitox_runtime;
    GRANT EXECUTE ON FUNCTION public.advance_platform_audit_chain_head(TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO orbitox_runtime;
    GRANT SELECT, INSERT, UPDATE ON TABLE public."PlatformOperationAttempt", public."BillingReminderBatchItem", public."TenantSuspensionSync" TO orbitox_runtime;
    REVOKE DELETE, TRUNCATE ON TABLE public."PlatformOperationAttempt", public."BillingReminderBatchItem", public."TenantSuspensionSync" FROM orbitox_runtime;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_maintenance') THEN
    GRANT EXECUTE ON FUNCTION public.claim_platform_audit_chain_slot(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO orbitox_maintenance;
    GRANT EXECUTE ON FUNCTION public.advance_platform_audit_chain_head(TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO orbitox_maintenance;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."PlatformAuditChainHead", public."PlatformAuditDeterministicKey", public."PlatformOperationAttempt", public."BillingReminderBatchItem", public."TenantSuspensionSync" TO orbitox_maintenance;
  END IF;
END
$$;

DROP POLICY IF EXISTS orbitox_audit_reader_select ON public."PlatformAuditEvent";
CREATE POLICY orbitox_audit_reader_select ON public."PlatformAuditEvent"
  FOR SELECT TO orbitox_audit_reader USING (true);

CREATE POLICY PlatformAuditChainHead_reader_select ON public."PlatformAuditChainHead"
  FOR SELECT TO orbitox_audit_reader USING (true);
