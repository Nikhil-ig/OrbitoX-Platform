import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth } from '@/server/auth/customer-auth';
import { prisma } from '@/server/db/prisma';
import { canCustomerDashboardAction } from '@/server/organizations/customer-dashboard';
import { verifyCheckoutSignature } from '@/server/billing/razorpay-client';
import { tenantBelongsToOrganization } from '@/server/billing/billing-tenant';

type RouteContext = { params: Promise<{ organizationId: string }> };

export const POST = withCustomerAuth<RouteContext>(async (request, session, context) => {
  const { organizationId } = await context.params;
  const membership = await prisma.customerMembership.findUnique({
    where: { organizationId_userId: { organizationId, userId: session.userId } },
    select: { role: true },
  });
  if (!membership || !canCustomerDashboardAction(membership.role, 'confirmCheckout')) {
    return errorResponse(403, 'BILLING_ROLE_REQUIRED');
  }

  const body: unknown = await request.json().catch(() => null);
  if (
    !isRecord(body) ||
    !isNonEmptyString(body.subscriptionId) ||
    !isNonEmptyString(body.paymentId) ||
    !isNonEmptyString(body.signature)
  ) {
    return errorResponse(422, 'INVALID_CHECKOUT_CONFIRMATION');
  }

  const subscription = await prisma.billingSubscription.findFirst({
    where: {
      razorpaySubscriptionId: body.subscriptionId,
      organizationId,
    },
    select: { razorpaySubscriptionId: true, tenantId: true, status: true },
  });
  if (!subscription) return errorResponse(404, 'SUBSCRIPTION_NOT_FOUND');
  if (!verifyCheckoutSignature({
    razorpayPaymentId: body.paymentId,
    storedSubscriptionId: subscription.razorpaySubscriptionId,
    razorpaySignature: body.signature,
  })) {
    return errorResponse(401, 'INVALID_CHECKOUT_SIGNATURE');
  }

  const result = await prisma.$transaction(async (tx) => {
    const scope = await tenantBelongsToOrganization(tx, subscription.tenantId, organizationId);
    if (!scope) throw new Error('Subscription tenant is outside this organization.');
    await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${subscription.tenantId}, true)`;
    const updated = await tx.billingSubscription.updateMany({
      where: {
        razorpaySubscriptionId: subscription.razorpaySubscriptionId,
        organizationId,
        status: 'created',
      },
      data: { status: 'authenticated', updatedAt: new Date() },
    });
    const current = await tx.billingSubscription.findUniqueOrThrow({
      where: { razorpaySubscriptionId: subscription.razorpaySubscriptionId },
      select: { status: true },
    });
    if (updated.count) {
      await tx.platformAuditEvent.create({
        data: {
          action: 'billing.checkout.confirmed',
          entityType: 'BillingSubscription',
          entityId: subscription.razorpaySubscriptionId,
          organizationId,
          projectId: scope.projectId,
          environmentId: scope.environmentId,
          occurredAt: new Date(),
          metadata: { accessRemainsPendingWebhook: true },
        },
      });
    }
    return { status: current.status, awaitingWebhook: true };
  });

  return NextResponse.json({ ok: true, ...result }, { headers: noStore });
}, { write: true });

function errorResponse(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status, headers: noStore });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

const noStore = { 'Cache-Control': 'no-store' };
