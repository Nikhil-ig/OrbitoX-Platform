import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth } from '@/server/auth/customer-auth';
import { prisma } from '@/server/db/prisma';
import { canCustomerDashboardAction } from '@/server/organizations/customer-dashboard';
import {
  createRazorpaySubscription,
  getRazorpayPublicKeyId,
} from '@/server/billing/razorpay-client';
import { parseBillingTenantScope, tenantBelongsToOrganization } from '@/server/billing/billing-tenant';

type RouteContext = { params: Promise<{ organizationId: string }> };

export const POST = withCustomerAuth<RouteContext>(async (request, session, context) => {
  const { organizationId } = await context.params;
  const membership = await prisma.customerMembership.findUnique({
    where: { organizationId_userId: { organizationId, userId: session.userId } },
    select: { role: true },
  });
  if (!membership || !canCustomerDashboardAction(membership.role, 'createCheckout')) {
    return errorResponse(403, 'BILLING_ROLE_REQUIRED');
  }
  if (!session.emailVerified) return errorResponse(403, 'VERIFIED_EMAIL_REQUIRED');

  const idempotencyKey = request.headers.get('idempotency-key')?.trim() || '';
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
    return errorResponse(422, 'VALID_IDEMPOTENCY_KEY_REQUIRED');
  }

  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body) || !isNonEmptyString(body.tenantId) || !isNonEmptyString(body.razorpayPlanId)) {
    return errorResponse(422, 'INVALID_CHECKOUT_INPUT');
  }
  const tenantId = body.tenantId;
  const razorpayPlanId = body.razorpayPlanId;
  const scope = parseBillingTenantScope(tenantId);
  if (!scope || scope.organizationId !== organizationId) {
    return errorResponse(404, 'TENANT_NOT_FOUND');
  }

  const requestHash = crypto.createHash('sha256')
    .update(JSON.stringify({ organizationId, tenantId, razorpayPlanId: body.razorpayPlanId }))
    .digest('hex');
  try {
    const checkout = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
      const verifiedScope = await tenantBelongsToOrganization(tx, tenantId, organizationId);
      if (!verifiedScope) return { error: 'TENANT_NOT_FOUND' as const };

      const plan = await tx.billingPlanMap.findFirst({
        where: {
          razorpayPlanId,
          active: true,
        },
        select: { razorpayPlanId: true, pluginId: true, internalPlanId: true },
      });
      if (!plan) return { error: 'BILLING_PLAN_NOT_FOUND' as const };
      const installation = await tx.pluginInstallation.findFirst({
        where: { tenantId, pluginId: plan.pluginId },
        select: { id: true },
      });
      if (!installation) return { error: 'PLUGIN_NOT_INSTALLED_FOR_TENANT' as const };

      const created = await tx.$queryRaw<Array<{ key: string }>>`
        INSERT INTO public."TenantIdempotencyKey"
          ("tenantId", "scope", "key", "requestHash", "createdAt")
        VALUES (${tenantId}, 'customer.billing.checkout', ${idempotencyKey}, ${requestHash}, NOW())
        ON CONFLICT ("tenantId", "scope", "key") DO NOTHING
        RETURNING "key"
      `;
      if (created.length === 0) {
        const previous = await tx.tenantIdempotencyKey.findUnique({
          where: {
            tenantId_scope_key: {
              tenantId,
              scope: 'customer.billing.checkout',
              key: idempotencyKey,
            },
          },
          select: { requestHash: true, responseBody: true },
        });
        if (!previous || previous.requestHash !== requestHash) {
          return { error: 'IDEMPOTENCY_KEY_REUSED' as const };
        }
        const previousResponse = parseCheckoutResponse(previous?.responseBody);
        if (!previous || previous.requestHash !== requestHash) {
          return { error: 'IDEMPOTENCY_KEY_REUSED' as const };
        }
        if (!previousResponse) {
          return { error: 'CHECKOUT_REQUEST_IN_PROGRESS' as const };
        }
        return { result: previousResponse, replayed: true };
      }

      const razorpaySubscription = await createRazorpaySubscription({
        razorpayPlanId: plan.razorpayPlanId,
        idempotencyKey: `checkout_${crypto.createHash('sha256').update(`${tenantId}:${idempotencyKey}`).digest('hex')}`,
        notes: { tenantId, pluginId: plan.pluginId, planId: plan.internalPlanId },
      });
      const response: CheckoutResponse = {
        subscriptionId: razorpaySubscription.id,
        keyId: getRazorpayPublicKeyId(),
      };
      await tx.billingSubscription.create({
        data: {
          razorpaySubscriptionId: razorpaySubscription.id,
          organizationId,
          tenantId,
          pluginId: plan.pluginId,
          razorpayPlanId: plan.razorpayPlanId,
          status: 'created',
          currentStart: unixSecondsToDate(razorpaySubscription.current_start),
          currentEnd: unixSecondsToDate(razorpaySubscription.current_end),
          lastEventAt: 0n,
        },
      });
      await tx.tenantIdempotencyKey.update({
        where: {
          tenantId_scope_key: {
            tenantId,
            scope: 'customer.billing.checkout',
            key: idempotencyKey,
          },
        },
        data: {
          responseStatus: 201,
          responseBody: {
            subscriptionId: response.subscriptionId,
            keyId: response.keyId,
          } satisfies Prisma.InputJsonObject,
        },
      });
      return { result: response, replayed: false };
    }, { timeout: 15_000, maxWait: 5_000 });

    if (!('result' in checkout)) {
      const status = checkout.error === 'TENANT_NOT_FOUND' ? 404
        : checkout.error === 'CHECKOUT_REQUEST_IN_PROGRESS' ? 409
          : checkout.error === 'IDEMPOTENCY_KEY_REUSED' ? 409
            : checkout.error === 'BILLING_PLAN_NOT_FOUND' ? 422
              : checkout.error === 'PLUGIN_NOT_INSTALLED_FOR_TENANT' ? 409
                : 500;
      return errorResponse(status, checkout.error);
    }
    return NextResponse.json(
      { ...checkout.result, replayed: checkout.replayed },
      { status: 201, headers: noStore },
    );
  } catch (error) {
    console.error('Unable to create the Razorpay subscription checkout.', error);
    return errorResponse(502, 'BILLING_CHECKOUT_FAILED');
  }
}, { write: true });

interface CheckoutResponse {
  subscriptionId: string;
  keyId: string;
}

function errorResponse(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status, headers: noStore });
}

function unixSecondsToDate(value: number | undefined): Date | null {
  return Number.isSafeInteger(value) ? new Date(value! * 1000) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function parseCheckoutResponse(value: Prisma.JsonValue | null | undefined): CheckoutResponse | null {
  if (!isRecord(value) || typeof value.subscriptionId !== 'string' || typeof value.keyId !== 'string') {
    return null;
  }
  return { subscriptionId: value.subscriptionId, keyId: value.keyId };
}

const noStore = { 'Cache-Control': 'no-store' };
