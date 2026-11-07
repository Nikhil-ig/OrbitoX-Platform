import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  decideBillingEvent,
  verifyWebhookSignature,
  type BillingSubscriptionSnapshot,
  type RazorpayWebhookEvent,
} from '@/lib/phase6-razorpay-billing';
import { queueAccountEmail } from '@/lib/account-email-queue';

type LockedSubscription = {
  razorpaySubscriptionId: string;
  status: string;
  razorpayPlanId: string;
  currentStart: Date | null;
  currentEnd: Date | null;
  graceStartedAt: Date | null;
  lastEventAt: bigint;
  organizationId: string;
  tenantId: string;
  pluginId: string;
  cancelAtPeriodEnd: boolean;
};

export async function POST(request: NextRequest): Promise<Response> {
  const rawBody = Buffer.from(await request.arrayBuffer());
  const signature = request.headers.get('x-razorpay-signature');
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json({ success: false, error: 'WEBHOOK_SECRET_NOT_CONFIGURED' }, { status: 500 });
  }
  if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
    try {
      await prisma.$executeRaw`
        INSERT INTO public."BillingWebhookAlertMetric" ("name", "count", "lastAt")
        VALUES ('invalid_signature', 1, NOW())
        ON CONFLICT ("name") DO UPDATE
          SET "count" = public."BillingWebhookAlertMetric"."count" + 1,
              "lastAt" = NOW()
      `;
    } catch (error) {
      console.error('Unable to increment the invalid Razorpay signature alert metric.', error);
    }
    return NextResponse.json({ success: false, error: 'INVALID_SIGNATURE' }, { status: 401 });
  }

  let event: RazorpayWebhookEvent;
  try {
    const parsed: unknown = JSON.parse(rawBody.toString('utf8'));
    if (!isRecord(parsed)) throw new Error('Webhook body must be an object.');
    event = parsed as RazorpayWebhookEvent;
  } catch {
    return NextResponse.json({ success: false, error: 'INVALID_PAYLOAD' }, { status: 400 });
  }
  if (!isNonEmptyString(event.id) || !isNonEmptyString(event.event)) {
    return NextResponse.json({ success: false, error: 'MISSING_EVENT_ID_OR_TYPE' }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const payload = event as Prisma.InputJsonObject;
      const inserted = await tx.$queryRaw<Array<{ eventId: string }>>`
        INSERT INTO public."BillingWebhookEvent" ("eventId", "provider", "receivedAt", "payload")
        VALUES (${event.id}, 'razorpay', NOW(), ${JSON.stringify(payload)}::jsonb)
        ON CONFLICT ("eventId") DO NOTHING
        RETURNING "eventId"
      `;
      if (inserted.length === 0) return { duplicate: true as const };

      const subscriptionEntity = event.payload?.subscription?.entity;
      const subscriptionId = event.event === 'payment.failed'
        ? event.payload?.payment?.entity?.subscription_id
        : subscriptionEntity?.id;
      if (!isNonEmptyString(subscriptionId)) {
        await markWebhookProcessed(tx, event.id!, { applied: false, reason: 'NO_SUBSCRIPTION_ENTITY' });
        return { duplicate: false as const, applied: false, reason: 'NO_SUBSCRIPTION_ENTITY' };
      }

      const rows = await tx.$queryRaw<LockedSubscription[]>`
        SELECT "razorpaySubscriptionId", "organizationId", "tenantId", "pluginId",
               "razorpayPlanId", "status", "currentStart", "currentEnd", "graceStartedAt",
               "lastEventAt", "cancelAtPeriodEnd"
        FROM public."BillingSubscription"
        WHERE "razorpaySubscriptionId" = ${subscriptionId}
        FOR UPDATE
      `;
      const subscription = rows[0];
      if (!subscription) {
        await tx.billingUnknownEvent.create({
          data: {
            eventId: event.id!,
            subscriptionId,
            eventType: event.event!,
            reason: 'UNKNOWN_SUBSCRIPTION',
            payload,
          },
        });
        await markWebhookProcessed(tx, event.id!, { applied: false, reason: 'UNKNOWN_SUBSCRIPTION' });
        return { duplicate: false as const, applied: false, reason: 'UNKNOWN_SUBSCRIPTION' };
      }
      const tenantScope = parseTenantScope(subscription.tenantId);
      if (!tenantScope || tenantScope.organizationId !== subscription.organizationId) {
        await recordUnknownPlan(tx, event, subscriptionId, 'TENANT_SCOPE_MISMATCH', payload);
        await markWebhookProcessed(tx, event.id!, { applied: false, reason: 'TENANT_SCOPE_MISMATCH' });
        return { duplicate: false as const, applied: false, reason: 'TENANT_SCOPE_MISMATCH' };
      }
      const projectEnvironment = await tx.platformProject.findFirst({
        where: {
          id: tenantScope.projectId,
          organizationId: tenantScope.organizationId,
          environments: { some: { id: tenantScope.environmentId } },
        },
        select: { id: true },
      });
      if (!projectEnvironment) {
        await recordUnknownPlan(tx, event, subscriptionId, 'TENANT_SCOPE_NOT_FOUND', payload);
        await markWebhookProcessed(tx, event.id!, { applied: false, reason: 'TENANT_SCOPE_NOT_FOUND' });
        return { duplicate: false as const, applied: false, reason: 'TENANT_SCOPE_NOT_FOUND' };
      }
      if (event.event === 'payment.failed') {
        const eventAt = Number(event.created_at);
        if (!Number.isSafeInteger(eventAt) || BigInt(eventAt) <= subscription.lastEventAt) {
          await markWebhookProcessed(tx, event.id!, { applied: false, reason: 'STALE_PAYMENT_FAILURE' });
          return { duplicate: false as const, applied: false, reason: 'STALE_PAYMENT_FAILURE' };
        }
        const organization = await tx.platformOrganization.findUnique({
          where: { id: subscription.organizationId },
          select: { billingEmail: true },
        });
        if (organization?.billingEmail) {
          await queueAccountEmail(tx, {
            recipient: organization.billingEmail,
            template: 'PAYMENT_FAILED',
            data: {},
          });
        }
        await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${subscription.tenantId}, true)`;
        await tx.platformAuditEvent.create({
          data: {
            actorId: null,
            action: 'billing.subscription.payment_failed',
            entityType: 'BillingSubscription',
            entityId: subscriptionId,
            organizationId: tenantScope.organizationId,
            projectId: tenantScope.projectId,
            environmentId: tenantScope.environmentId,
            occurredAt: new Date(eventAt * 1000),
            metadata: { eventId: event.id!, eventType: event.event! },
          },
        });
        await markWebhookProcessed(tx, event.id!, {
          applied: false,
          reason: 'PAYMENT_FAILED_NOTICE_QUEUED',
        });
        return {
          duplicate: false as const,
          applied: false,
          reason: 'PAYMENT_FAILED_NOTICE_QUEUED',
        };
      }

      const snapshot: BillingSubscriptionSnapshot = {
        razorpaySubscriptionId: subscription.razorpaySubscriptionId,
        status: subscription.status,
        razorpayPlanId: subscription.razorpayPlanId,
        currentStart: epochSeconds(subscription.currentStart),
        currentEnd: epochSeconds(subscription.currentEnd),
        graceStartedAt: epochSeconds(subscription.graceStartedAt),
        lastEventAt: subscription.lastEventAt,
      };
      const planMap = await tx.billingPlanMap.findUnique({
        where: { razorpayPlanId: subscription.razorpayPlanId },
        select: { pluginId: true, internalPlanId: true },
      });
      if (!planMap || planMap.pluginId !== subscription.pluginId) {
        await recordUnknownPlan(tx, event, subscriptionId, 'CURRENT_PLAN_MAPPING_MISSING', payload);
        await markWebhookProcessed(tx, event.id!, { applied: false, reason: 'CURRENT_PLAN_MAPPING_MISSING' });
        return { duplicate: false as const, applied: false, reason: 'CURRENT_PLAN_MAPPING_MISSING' };
      }

      let effectivePlanMap = planMap;
      const entityPlanId = subscriptionEntity?.plan_id;
      if (entityPlanId && entityPlanId !== subscription.razorpayPlanId) {
        const mappedChange = await tx.billingPlanMap.findUnique({
          where: { razorpayPlanId: entityPlanId },
          select: { pluginId: true, internalPlanId: true, active: true },
        });
        if (!mappedChange || !mappedChange.active || mappedChange.pluginId !== subscription.pluginId) {
          await recordUnknownPlan(tx, event, subscriptionId, 'UNMAPPED_PLAN_CHANGE', payload);
          await markWebhookProcessed(tx, event.id!, { applied: false, reason: 'UNMAPPED_PLAN_CHANGE' });
          return { duplicate: false as const, applied: false, reason: 'UNMAPPED_PLAN_CHANGE' };
        }
        effectivePlanMap = mappedChange;
      }

      const plan = await tx.plan.findUnique({
        where: { planId: effectivePlanMap.internalPlanId },
        select: { gracePeriodDays: true, suspensionGraceDays: true },
      });
      if (!plan) {
        await recordUnknownPlan(tx, event, subscriptionId, 'BILLING_POLICY_NOT_FOUND', payload);
        await markWebhookProcessed(tx, event.id!, { applied: false, reason: 'BILLING_POLICY_NOT_FOUND' });
        return { duplicate: false as const, applied: false, reason: 'BILLING_POLICY_NOT_FOUND' };
      }

      const decision = decideBillingEvent(event, snapshot, {
        readOnlyAfterDays: plan.gracePeriodDays,
        suspendAfterDays: plan.suspensionGraceDays,
      });
      if (!decision.apply) {
        await markWebhookProcessed(tx, event.id!, { applied: false, reason: decision.reason });
        return { duplicate: false as const, applied: false, reason: decision.reason };
      }

      const installation = await tx.pluginInstallation.findFirst({
        where: { tenantId: subscription.tenantId, pluginId: subscription.pluginId },
      });
      if (!installation) {
        await recordUnknownPlan(tx, event, subscriptionId, 'INSTALLATION_NOT_FOUND', payload);
        await markWebhookProcessed(tx, event.id!, { applied: false, reason: 'INSTALLATION_NOT_FOUND' });
        return { duplicate: false as const, applied: false, reason: 'INSTALLATION_NOT_FOUND' };
      }

      const now = new Date();
      await tx.billingSubscription.update({
        where: { razorpaySubscriptionId: subscriptionId },
        data: {
          status: decision.subscriptionStatus,
          razorpayPlanId: entityPlanId && decision.planChangeTo ? entityPlanId : undefined,
          currentStart: toDate(decision.currentStart),
          currentEnd: toDate(decision.currentEnd),
          graceStartedAt: decision.graceStartedAt === undefined
            ? undefined
            : toDate(decision.graceStartedAt),
          lastEventAt: BigInt(event.created_at!),
          cancelAtPeriodEnd: event.event === 'subscription.cancelled' ||
              event.event === 'subscription.completed'
            ? true
            : ['subscription.charged', 'subscription.activated', 'subscription.resumed'].includes(event.event!)
              ? false
              : subscription.cancelAtPeriodEnd,
          updatedAt: now,
        },
      });

      const nextState = typeof decision.installation === 'string'
        ? decision.installation
        : undefined;
      const planChanged = Boolean(decision.planChangeTo);
      const stateChanged = Boolean(nextState && nextState !== installation.status);
      let updatedInstallation = installation;
      if (stateChanged || planChanged) {
        updatedInstallation = await tx.pluginInstallation.update({
          where: { id: installation.id },
          data: {
            status: nextState || installation.status,
            statusReason: nextState === 'SUSPENDED'
              ? 'Billing subscription suspended after its grace period or paid term.'
              : nextState === 'READ_ONLY'
                ? 'Billing payment is overdue; write access is restricted.'
                : nextState === 'ACTIVE'
                  ? null
                  : undefined,
            planId: planChanged ? effectivePlanMap.internalPlanId : installation.planId,
            entitlementRevision: { increment: 1 },
          },
        });
      }

      await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${subscription.tenantId}, true)`;
      if (stateChanged || planChanged) {
        await tx.platformOutboxMessage.create({
          data: {
            id: `outbox_${crypto.randomUUID()}`,
            tenantId: subscription.tenantId,
            eventType: 'entitlement.updated',
            aggregateType: 'PluginInstallation',
            aggregateId: updatedInstallation.id,
            payload: {
              tenantId: subscription.tenantId,
              pluginId: subscription.pluginId,
              runtimeTenantId: updatedInstallation.runtimeTenantId,
              status: updatedInstallation.status,
              planId: updatedInstallation.planId,
              entitlementRevision: updatedInstallation.entitlementRevision,
              updatedAt: now.toISOString(),
            },
            status: 'PENDING',
            retryCount: 0,
          },
        });
      }

      await tx.platformAuditEvent.create({
        data: {
          actorId: null,
          action: 'billing.subscription.webhook_applied',
          entityType: 'BillingSubscription',
          entityId: subscriptionId,
          organizationId: tenantScope.organizationId,
          projectId: tenantScope.projectId,
          environmentId: tenantScope.environmentId,
          occurredAt: now,
          metadata: {
            eventId: event.id!,
            eventType: event.event!,
            previousStatus: installation.status,
            currentStatus: updatedInstallation.status,
            planId: effectivePlanMap.internalPlanId,
          },
        },
      });
      const emailTemplate = billingEmailTemplate({
        eventType: event.event!,
        previousState: installation.status,
        nextState: updatedInstallation.status,
        previousGraceStartedAt: subscription.graceStartedAt,
        nextGraceStartedAt: toDate(decision.graceStartedAt),
        planChanged,
      });
      if (emailTemplate) {
        const organization = await tx.platformOrganization.findUnique({
          where: { id: subscription.organizationId },
          select: { billingEmail: true },
        });
        if (organization?.billingEmail) {
          await queueAccountEmail(tx, {
            recipient: organization.billingEmail,
            template: emailTemplate,
            data: {},
          });
        }
      }
      await markWebhookProcessed(tx, event.id!, {
        applied: true,
        reason: decision.reason,
        tenantId: subscription.tenantId,
        pluginId: subscription.pluginId,
        installationStatus: updatedInstallation.status,
      });
      return {
        duplicate: false as const,
        applied: true,
        tenantId: subscription.tenantId,
        pluginId: subscription.pluginId,
        currentStatus: updatedInstallation.status,
      };
    });

    return NextResponse.json({ success: true, eventId: event.id, ...result }, { status: 200 });
  } catch (error) {
    console.error('Razorpay webhook transaction failed.', error);
    return NextResponse.json({ success: false, error: 'WEBHOOK_PROCESSING_FAILED' }, { status: 500 });
  }
}

function billingEmailTemplate(input: {
  eventType: string;
  previousState: string;
  nextState: string;
  previousGraceStartedAt: Date | null;
  nextGraceStartedAt: Date | null | undefined;
  planChanged: boolean;
}): string | null {
  if (input.nextState === 'ACTIVE' && input.previousState !== 'ACTIVE') return 'REACTIVATED';
  if (input.nextState === 'SUSPENDED' && input.previousState !== 'SUSPENDED') return 'SUSPENDED';
  if (input.nextState === 'READ_ONLY' && input.previousState !== 'READ_ONLY') return 'READ_ONLY';
  if (!input.previousGraceStartedAt && input.nextGraceStartedAt) return 'GRACE_STARTED';
  if (input.planChanged) return 'PLAN_CHANGED';
  if (input.eventType === 'subscription.cancelled') return 'CANCELLED';
  return null;
}

async function markWebhookProcessed(
  tx: Prisma.TransactionClient,
  eventId: string,
  result: Prisma.InputJsonObject,
): Promise<void> {
  await tx.billingWebhookEvent.update({
    where: { eventId },
    data: { processedAt: new Date(), result },
  });
}

async function recordUnknownPlan(
  tx: Prisma.TransactionClient,
  event: RazorpayWebhookEvent,
  subscriptionId: string,
  reason: string,
  payload: Prisma.InputJsonObject,
): Promise<void> {
  await tx.billingUnknownEvent.create({
    data: {
      eventId: event.id!,
      subscriptionId,
      eventType: event.event!,
      reason,
      payload,
    },
  });
  console.error('Razorpay webhook requires billing configuration review.', {
    eventId: event.id,
    subscriptionId,
    reason,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function epochSeconds(value: Date | null): number | null {
  return value ? Math.floor(value.getTime() / 1000) : null;
}

function toDate(value: number | null | undefined): Date | null | undefined {
  return value === undefined ? undefined : value === null ? null : new Date(value * 1000);
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
