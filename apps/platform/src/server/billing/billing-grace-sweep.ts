import 'server-only';
import crypto from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { billingEnforcementState } from '@/server/billing/razorpay-billing';
import { queueAccountEmail } from '@/server/accounts/account-email-queue';

const leaseDurationMs = 10 * 60 * 1000;

interface SweepSubscription {
  razorpaySubscriptionId: string;
  organizationId: string;
  tenantId: string;
  pluginId: string;
  status: string;
  currentEnd: Date | null;
  graceStartedAt: Date | null;
  planMap: { internalPlanId: string };
}

export async function sweepBillingGrace(
  runtime: PrismaClient,
  maintenance: PrismaClient,
  now = new Date(),
): Promise<{ acquired: boolean; scanned: number; transitioned: number }> {
  const leaseOwner = crypto.randomUUID();
  const lease = await maintenance.$queryRaw<Array<{ id: string }>>`
    INSERT INTO public."BillingGraceSweepLease" ("id", "leaseOwner", "leaseExpiresAt", "updatedAt")
    VALUES ('global', ${leaseOwner}, ${new Date(now.getTime() + leaseDurationMs)}, ${now})
    ON CONFLICT ("id") DO UPDATE
      SET "leaseOwner" = EXCLUDED."leaseOwner",
          "leaseExpiresAt" = EXCLUDED."leaseExpiresAt",
          "updatedAt" = EXCLUDED."updatedAt"
      WHERE public."BillingGraceSweepLease"."leaseExpiresAt" <= ${now}
    RETURNING "id"
  `;
  if (lease.length === 0) return { acquired: false, scanned: 0, transitioned: 0 };

  let scanned = 0;
  let transitioned = 0;
  try {
    const subscriptions = await runtime.billingSubscription.findMany({
      where: { status: { in: ['pending', 'halted', 'paused', 'cancelled', 'completed'] } },
      orderBy: { updatedAt: 'asc' },
      select: {
        razorpaySubscriptionId: true,
        organizationId: true,
        tenantId: true,
        pluginId: true,
        status: true,
        currentEnd: true,
        graceStartedAt: true,
        planMap: { select: { internalPlanId: true } },
      },
    });
    for (const subscription of subscriptions as SweepSubscription[]) {
      await renewLease(maintenance, leaseOwner);
      scanned += 1;
      const plan = await runtime.plan.findUnique({
        where: { planId: subscription.planMap.internalPlanId },
        select: { gracePeriodDays: true, suspensionGraceDays: true },
      });
      if (!plan) throw new Error(`Billing plan policy is missing for ${subscription.razorpaySubscriptionId}.`);
      const desiredState = billingEnforcementState({
        status: subscription.status,
        currentEnd: subscription.currentEnd ? Math.floor(subscription.currentEnd.getTime() / 1000) : null,
        graceStartedAt: subscription.graceStartedAt
          ? Math.floor(subscription.graceStartedAt.getTime() / 1000)
          : null,
      }, {
        readOnlyAfterDays: plan.gracePeriodDays,
        suspendAfterDays: plan.suspensionGraceDays,
      }, Math.floor(now.getTime() / 1000));

      const changed = await runtime.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${subscription.tenantId}, true)`;
        const installation = await tx.pluginInstallation.findFirst({
          where: { tenantId: subscription.tenantId, pluginId: subscription.pluginId },
        });
        if (!installation) {
          throw new Error(`Plugin installation is missing for ${subscription.razorpaySubscriptionId}.`);
        }
        if (installation.status === desiredState) return false;

        const updated = await tx.pluginInstallation.update({
          where: { id: installation.id },
          data: {
            status: desiredState,
            statusReason: desiredState === 'SUSPENDED'
              ? 'Billing subscription suspended after its grace period or paid term.'
              : desiredState === 'READ_ONLY'
                ? 'Billing payment is overdue; write access is restricted.'
                : null,
            entitlementRevision: { increment: 1 },
          },
        });
        await tx.platformOutboxMessage.create({
          data: {
            id: `outbox_${crypto.randomUUID()}`,
            tenantId: subscription.tenantId,
            eventType: 'entitlement.updated',
            aggregateType: 'PluginInstallation',
            aggregateId: updated.id,
            payload: {
              tenantId: subscription.tenantId,
              pluginId: subscription.pluginId,
              runtimeTenantId: updated.runtimeTenantId,
              status: updated.status,
              planId: updated.planId,
              entitlementRevision: updated.entitlementRevision,
              updatedAt: now.toISOString(),
            },
            status: 'PENDING',
            retryCount: 0,
          },
        });
        const scope = parseTenantScope(subscription.tenantId);
        if (!scope || scope.organizationId !== subscription.organizationId) {
          throw new Error(`Billing tenant scope is invalid for ${subscription.razorpaySubscriptionId}.`);
        }
        await tx.platformAuditEvent.create({
          data: {
            action: 'billing.subscription.grace_sweep_transition',
            entityType: 'BillingSubscription',
            entityId: subscription.razorpaySubscriptionId,
            organizationId: scope.organizationId,
            projectId: scope.projectId,
            environmentId: scope.environmentId,
            occurredAt: now,
            metadata: {
              previousState: installation.status,
              currentState: updated.status,
            },
          },
        });
        const organization = await tx.platformOrganization.findUnique({
          where: { id: subscription.organizationId },
          select: { billingEmail: true },
        });
        if (organization?.billingEmail) {
          await queueAccountEmail(tx, {
            recipient: organization.billingEmail,
            template: desiredState === 'ACTIVE' ? 'REACTIVATED' : desiredState,
            data: {},
          });
        }
        return true;
      });
      if (changed) transitioned += 1;
    }
    return { acquired: true, scanned, transitioned };
  } finally {
    await maintenance.$executeRaw`
      UPDATE public."BillingGraceSweepLease"
      SET "leaseExpiresAt" = ${now}, "updatedAt" = ${now}
      WHERE "id" = 'global' AND "leaseOwner" = ${leaseOwner}
    `;
  }
}

async function renewLease(maintenance: PrismaClient, leaseOwner: string): Promise<void> {
  const now = new Date();
  const renewed = await maintenance.$queryRaw<Array<{ id: string }>>`
    UPDATE public."BillingGraceSweepLease"
    SET "leaseExpiresAt" = ${new Date(now.getTime() + leaseDurationMs)},
        "updatedAt" = ${now}
    WHERE "id" = 'global'
      AND "leaseOwner" = ${leaseOwner}
      AND "leaseExpiresAt" > ${now}
    RETURNING "id"
  `;
  if (renewed.length !== 1) {
    throw new Error('Billing grace sweep lease was lost before the next tenant transition.');
  }
}

function parseTenantScope(tenantId: string): {
  organizationId: string;
  projectId: string;
  environmentId: string;
} | null {
  const match = /^org\/([^/]+)\/project\/([^/]+)\/environment\/([^/]+)$/.exec(tenantId);
  if (!match) return null;
  return {
    organizationId: match[1]!,
    projectId: match[2]!,
    environmentId: match[3]!,
  };
}
