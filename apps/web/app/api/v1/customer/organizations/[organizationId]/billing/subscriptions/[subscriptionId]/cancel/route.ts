import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth } from '@/lib/customer-auth';
import { prisma } from '@/lib/prisma';
import { canCustomerDashboardAction } from '@/lib/customer-dashboard';
import { tenantBelongsToOrganization } from '@/lib/billing-tenant';
import { cancelRazorpaySubscription } from '@/lib/razorpay-client';

type RouteContext = { params: Promise<{ organizationId: string; subscriptionId: string }> };

export const POST = withCustomerAuth<RouteContext>(async (_request, session, context) => {
  const { organizationId, subscriptionId } = await context.params;
  const membership = await prisma.customerMembership.findUnique({
    where: { organizationId_userId: { organizationId, userId: session.userId } },
    select: { role: true },
  });
  if (!membership || !canCustomerDashboardAction(membership.role, 'cancelBilling')) {
    return errorResponse(403, 'ORGANIZATION_OWNER_REQUIRED');
  }
  const subscription = await prisma.billingSubscription.findFirst({
    where: { razorpaySubscriptionId: subscriptionId, organizationId },
    select: {
      razorpaySubscriptionId: true,
      tenantId: true,
      status: true,
      cancelAtPeriodEnd: true,
      currentEnd: true,
    },
  });
  if (!subscription) return errorResponse(404, 'SUBSCRIPTION_NOT_FOUND');
  if (subscription.cancelAtPeriodEnd) {
    return NextResponse.json({
      ok: true,
      cancelAtPeriodEnd: true,
      currentEnd: subscription.currentEnd,
    }, { headers: noStore });
  }
  if (!['active', 'authenticated', 'pending', 'halted', 'paused'].includes(subscription.status)) {
    return errorResponse(409, 'SUBSCRIPTION_CANNOT_BE_CANCELLED');
  }

  const idempotencyKey = `cancel_${subscription.razorpaySubscriptionId}`;
  try {
    await cancelRazorpaySubscription(subscription.razorpaySubscriptionId, idempotencyKey);
    const updated = await prisma.$transaction(async (tx) => {
      const scope = await tenantBelongsToOrganization(tx, subscription.tenantId, organizationId);
      if (!scope) throw new Error('Subscription tenant is outside this organization.');
      await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${subscription.tenantId}, true)`;
      const row = await tx.billingSubscription.updateMany({
        where: {
          razorpaySubscriptionId: subscription.razorpaySubscriptionId,
          organizationId,
          cancelAtPeriodEnd: false,
        },
        data: { cancelAtPeriodEnd: true, updatedAt: new Date() },
      });
      if (row.count) {
        await tx.platformAuditEvent.create({
          data: {
            actorId: session.userId,
            actorEmail: session.email,
            action: 'billing.subscription.cancel_scheduled',
            entityType: 'BillingSubscription',
            entityId: subscription.razorpaySubscriptionId,
            organizationId,
            projectId: scope.projectId,
            environmentId: scope.environmentId,
            occurredAt: new Date(),
          },
        });
      }
      return tx.billingSubscription.findUniqueOrThrow({
        where: { razorpaySubscriptionId: subscription.razorpaySubscriptionId },
        select: { cancelAtPeriodEnd: true, currentEnd: true },
      });
    });
    return NextResponse.json({ ok: true, ...updated }, { headers: noStore });
  } catch (error) {
    console.error('Unable to schedule Razorpay subscription cancellation.', error);
    return errorResponse(502, 'SUBSCRIPTION_CANCELLATION_FAILED');
  }
}, { write: true, reauth: true });

function errorResponse(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status, headers: noStore });
}

const noStore = { 'Cache-Control': 'no-store' };
