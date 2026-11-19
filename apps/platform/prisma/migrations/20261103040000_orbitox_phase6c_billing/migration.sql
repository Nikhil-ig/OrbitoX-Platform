CREATE TABLE public."BillingPlanMap" (
  "razorpayPlanId" TEXT NOT NULL,
  "pluginId" TEXT NOT NULL,
  "internalPlanId" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "interval" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingPlanMap_pkey" PRIMARY KEY ("razorpayPlanId"),
  CONSTRAINT "BillingPlanMap_amount_check" CHECK ("amountMinor" >= 0),
  CONSTRAINT "BillingPlanMap_interval_check" CHECK ("interval" > 0),
  CONSTRAINT "BillingPlanMap_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$')
);
CREATE INDEX "BillingPlanMap_pluginId_internalPlanId_idx"
  ON public."BillingPlanMap" ("pluginId", "internalPlanId");

CREATE TABLE public."BillingSubscription" (
  "razorpaySubscriptionId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "pluginId" TEXT NOT NULL,
  "razorpayPlanId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'created',
  "currentStart" TIMESTAMPTZ,
  "currentEnd" TIMESTAMPTZ,
  "graceStartedAt" TIMESTAMPTZ,
  "lastEventAt" INTEGER NOT NULL DEFAULT 0,
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingSubscription_pkey" PRIMARY KEY ("razorpaySubscriptionId"),
  CONSTRAINT "BillingSubscription_razorpayPlanId_fkey"
    FOREIGN KEY ("razorpayPlanId") REFERENCES public."BillingPlanMap" ("razorpayPlanId")
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "BillingSubscription_status_check"
    CHECK ("status" IN ('created', 'authenticated', 'active', 'pending', 'halted', 'paused', 'cancelled', 'completed'))
);
CREATE INDEX "BillingSubscription_organizationId_idx"
  ON public."BillingSubscription" ("organizationId");
CREATE INDEX "BillingSubscription_tenantId_pluginId_idx"
  ON public."BillingSubscription" ("tenantId", "pluginId");
CREATE UNIQUE INDEX "BillingSubscription_one_live_per_tenant_plugin_idx"
  ON public."BillingSubscription" ("tenantId", "pluginId")
  WHERE "status" IN ('created', 'authenticated', 'active', 'pending', 'halted', 'paused');

CREATE TABLE public."BillingUnknownEvent" (
  "eventId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingUnknownEvent_pkey" PRIMARY KEY ("eventId")
);
CREATE INDEX "BillingUnknownEvent_subscriptionId_receivedAt_idx"
  ON public."BillingUnknownEvent" ("subscriptionId", "receivedAt");

CREATE TABLE public."BillingWebhookAlertMetric" (
  "name" TEXT NOT NULL,
  "count" BIGINT NOT NULL DEFAULT 0,
  "lastAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingWebhookAlertMetric_pkey" PRIMARY KEY ("name"),
  CONSTRAINT "BillingWebhookAlertMetric_count_check" CHECK ("count" >= 0)
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_runtime') THEN
    REVOKE ALL ON TABLE public."BillingPlanMap" FROM orbitox_runtime;
    GRANT SELECT ON TABLE public."BillingPlanMap" TO orbitox_runtime;
    GRANT UPDATE ("active") ON TABLE public."BillingPlanMap" TO orbitox_runtime;

    REVOKE ALL ON TABLE public."BillingSubscription" FROM orbitox_runtime;
    GRANT SELECT, INSERT ON TABLE public."BillingSubscription" TO orbitox_runtime;
    GRANT UPDATE (
      "status",
      "currentStart",
      "currentEnd",
      "graceStartedAt",
      "lastEventAt",
      "cancelAtPeriodEnd",
      "razorpayPlanId",
      "updatedAt"
    ) ON TABLE public."BillingSubscription" TO orbitox_runtime;

    REVOKE ALL ON TABLE public."BillingUnknownEvent" FROM orbitox_runtime;
    GRANT SELECT, INSERT ON TABLE public."BillingUnknownEvent" TO orbitox_runtime;

    REVOKE ALL ON TABLE public."BillingWebhookAlertMetric" FROM orbitox_runtime;
    GRANT SELECT, INSERT ON TABLE public."BillingWebhookAlertMetric" TO orbitox_runtime;
    GRANT UPDATE ("count", "lastAt") ON TABLE public."BillingWebhookAlertMetric" TO orbitox_runtime;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbitox_maintenance') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."BillingPlanMap" TO orbitox_maintenance;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."BillingSubscription" TO orbitox_maintenance;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."BillingUnknownEvent" TO orbitox_maintenance;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."BillingWebhookAlertMetric" TO orbitox_maintenance;
  END IF;
END
$$;
