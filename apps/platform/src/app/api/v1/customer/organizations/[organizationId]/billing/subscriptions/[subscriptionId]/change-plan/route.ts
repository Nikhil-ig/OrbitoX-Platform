import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth } from '@/server/auth/customer-auth';
import { prisma } from '@/server/db/prisma';
import { canCustomerDashboardAction } from '@/server/organizations/customer-dashboard';
import { tenantBelongsToOrganization } from '@/server/billing/billing-tenant';
import { changePlan } from '@/server/billing/razorpay-client';

type RouteContext = { params: Promise<{ organizationId: string; subscriptionId: string }> };

export const POST = withCustomerAuth<RouteContext>(async (request, session, context) => {
  const { organizationId, subscriptionId } = await context.params;
  const membership = await prisma.customerMembership.findUnique({
    where: { organizationId_userId: { organizationId, userId: session.userId } },
    select: { role: true },
  });
  if (!membership || !canCustomerDashboardAction(membership.role, 'changeBillingPlan')) {
    return errorResponse(403, 'ORGANIZATION_OWNER_REQUIRED');
  }
  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body) || typeof body.razorpayPlanId !== 'string' || !body.razorpayPlanId) {
    return errorResponse(422, 'RAZORPAY_PLAN_ID_REQUIRED');
  }
  const razorpayPlanId = body.razorpayPlanId;
  const idempotencyKey = request.headers.get('idempotency-key')?.trim() || '';
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
    return errorResponse(422, 'VALID_IDEMPOTENCY_KEY_REQUIRED');
  }

  const subscription = await prisma.billingSubscription.findFirst({
    where: { razorpaySubscriptionId: subscriptionId, organizationId },
    select: { razorpaySubscriptionId: true, tenantId: true, pluginId: true, status: true },
  });
  if (!subscription) return errorResponse(404, 'SUBSCRIPTION_NOT_FOUND');
  if (!['active', 'authenticated', 'pending', 'halted', 'paused'].includes(subscription.status)) {
    return errorResponse(409, 'SUBSCRIPTION_CANNOT_CHANGE_PLAN');
  }

  try {
    const prepared = await prisma.$transaction(async (tx) => {
      const scope = await tenantBelongsToOrganization(tx, subscription.tenantId, organizationId);
      if (!scope) return { kind: 'error' as const, error: 'TENANT_NOT_FOUND' as const };
      await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${subscription.tenantId}, true)`;
      const plan = await tx.billingPlanMap.findFirst({
        where: {
          razorpayPlanId,
          pluginId: subscription.pluginId,
          active: true,
        },
        select: { razorpayPlanId: true, internalPlanId: true },
      });
      if (!plan) {
        return { kind: 'error' as const, error: 'BILLING_PLAN_NOT_FOUND' as const };
      }
      return { kind: 'ready' as const, scope, plan };
    });
    if (prepared.kind === 'error') {
      return errorResponse(prepared.error === 'TENANT_NOT_FOUND' ? 404 : 422, prepared.error);
    }

    const providerResult = await changePlan(
      { id: subscription.razorpaySubscriptionId },
      prepared.plan.razorpayPlanId,
      `change_${cryptoHash(`${subscriptionId}:${idempotencyKey}`)}`,
    );
    if (providerResult.id !== subscriptionId) {
      throw new Error('Razorpay subscription update returned a mismatched subscription id.');
    }
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${subscription.tenantId}, true)`;
      await tx.platformAuditEvent.create({
        data: {
          actorId: session.userId,
          actorEmail: session.email,
          action: 'billing.subscription.plan_change_requested',
          entityType: 'BillingSubscription',
          entityId: subscriptionId,
          organizationId,
          projectId: prepared.scope.projectId,
          environmentId: prepared.scope.environmentId,
          occurredAt: new Date(),
          metadata: {
            requestedPlanId: prepared.plan.internalPlanId,
            appliedOnlyByWebhook: true,
          },
        },
      });
    }, { timeout: 15_000, maxWait: 5_000 });
    return NextResponse.json({
      ok: true,
      subscriptionId: providerResult.id,
      status: providerResult.status,
      requestedPlanId: prepared.plan.internalPlanId,
      applied: false,
      message: 'The plan changes only after the verified Razorpay webhook arrives.',
    }, { headers: noStore });
  } catch (error) {
    console.error('Unable to request Razorpay subscription plan change.', error);
    return errorResponse(502, 'SUBSCRIPTION_PLAN_CHANGE_FAILED');
  }
}, { write: true, reauth: true });

function cryptoHash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function errorResponse(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status, headers: noStore });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const noStore = { 'Cache-Control': 'no-store' };
