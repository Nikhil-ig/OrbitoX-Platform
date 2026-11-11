ALTER TABLE public."AccountEmailOutbox"
  ADD COLUMN "claimedAt" TIMESTAMPTZ,
  ADD COLUMN "claimToken" TEXT,
  ADD COLUMN "nextAttemptAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE public."AccountEmailOutbox"
  DROP CONSTRAINT "AccountEmailOutbox_status_check",
  ADD CONSTRAINT "AccountEmailOutbox_status_check"
    CHECK ("status" IN ('PENDING', 'SENDING', 'SENT', 'FAILED', 'SUPPRESSED'));
CREATE INDEX "AccountEmailOutbox_nextAttemptAt_idx"
  ON public."AccountEmailOutbox" ("nextAttemptAt")
  WHERE "status" IN ('PENDING', 'SENDING');

CREATE TABLE public."AccountEmailSuppression" (
  "email" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "suppressedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountEmailSuppression_pkey" PRIMARY KEY ("email"),
  CONSTRAINT "AccountEmailSuppression_email_check"
    CHECK ("email" = lower("email") AND "email" ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

CREATE TABLE public."AccountEmailWebhookEvent" (
  "eventId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountEmailWebhookEvent_pkey" PRIMARY KEY ("eventId")
);

CREATE TABLE public."BillingGraceSweepLease" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "leaseOwner" TEXT NOT NULL,
  "leaseExpiresAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingGraceSweepLease_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BillingGraceSweepLease_singleton_check" CHECK ("id" = 'global')
);

ALTER TABLE public."PluginInstallation"
  ADD COLUMN "statusReason" TEXT;

CREATE TABLE public."PlatformPluginUsage" (
  "tenantId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "environmentId" TEXT NOT NULL,
  "pluginId" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "requestCount" BIGINT NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformPluginUsage_pkey" PRIMARY KEY ("tenantId", "pluginId", "period"),
  CONSTRAINT "PlatformPluginUsage_requestCount_check" CHECK ("requestCount" >= 0),
  CONSTRAINT "PlatformPluginUsage_period_check" CHECK ("period" ~ '^\d{4}-\d{2}$')
);
CREATE INDEX "PlatformPluginUsage_projectId_environmentId_period_idx"
  ON public."PlatformPluginUsage" ("projectId", "environmentId", "period");
ALTER TABLE public."PlatformPluginUsage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PlatformPluginUsage" FORCE ROW LEVEL SECURITY;
CREATE POLICY "orbitox_plugin_usage_tenant_scope" ON public."PlatformPluginUsage"
  FOR ALL TO orbitox_runtime
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));

CREATE TABLE public."BillingProviderCache" (
  "cacheKey" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingProviderCache_pkey" PRIMARY KEY ("cacheKey")
);
CREATE INDEX "BillingProviderCache_tenantId_expiresAt_idx"
  ON public."BillingProviderCache" ("tenantId", "expiresAt");
ALTER TABLE public."BillingProviderCache" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."BillingProviderCache" FORCE ROW LEVEL SECURITY;
CREATE POLICY "orbitox_billing_cache_tenant_scope" ON public."BillingProviderCache"
  FOR ALL TO orbitox_runtime
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), ''));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_runtime') THEN
    REVOKE ALL ON TABLE public."AccountEmailOutbox" FROM orbitox_runtime;
    GRANT INSERT ON TABLE public."AccountEmailOutbox" TO orbitox_runtime;

    GRANT SELECT, INSERT ON TABLE public."AccountEmailSuppression" TO orbitox_runtime;
    GRANT SELECT, INSERT ON TABLE public."AccountEmailWebhookEvent" TO orbitox_runtime;
    GRANT SELECT, INSERT, UPDATE ON TABLE public."PlatformPluginUsage" TO orbitox_runtime;
    GRANT SELECT, INSERT, UPDATE ON TABLE public."BillingProviderCache" TO orbitox_runtime;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_outbox_relay') THEN
    GRANT SELECT ON TABLE public."AccountEmailOutbox" TO orbitox_outbox_relay;
    GRANT UPDATE ("status", "retryCount", "lastError", "dispatchedAt", "claimedAt", "claimToken", "nextAttemptAt")
      ON TABLE public."AccountEmailOutbox" TO orbitox_outbox_relay;
    GRANT SELECT ON TABLE public."AccountEmailSuppression" TO orbitox_outbox_relay;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_maintenance') THEN
    GRANT SELECT, INSERT, UPDATE ON TABLE public."BillingGraceSweepLease" TO orbitox_maintenance;
  END IF;
END
$$;
