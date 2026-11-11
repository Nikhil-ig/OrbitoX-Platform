import { NextResponse } from 'next/server';
import { withCustomerAuth } from '@/lib/customer-auth';
import {
  canCustomerDashboardAction,
  getCustomerOrganizationRole,
  noStoreHeaders,
} from '@/lib/customer-dashboard';
import { prisma } from '@/lib/prisma';
import { operationStore } from '@/lib/tenant-provisioning/operation-store';
import { provisioningSaga } from '@/lib/tenant-provisioning/provisioning-saga';
import { tenantBelongsToOrganization } from '@/lib/billing-tenant';

type RouteContext = { params: Promise<{ organizationId: string; operationId: string }> };

export const POST = withCustomerAuth<RouteContext>(async (_request, session, context) => {
  const { organizationId, operationId } = await context.params;
  const role = await getCustomerOrganizationRole(organizationId, session.userId);
  if (!role) return NextResponse.json({ ok: false, error: 'ORGANIZATION_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  if (!canCustomerDashboardAction(role, 'retryProvisioning')) {
    return NextResponse.json({ ok: false, error: 'PROVISIONING_RETRY_FORBIDDEN' }, { status: 403, headers: noStoreHeaders() });
  }
  const operation = await operationStore.getOperation(operationId);
  if (!operation || operation.organizationId !== organizationId) {
    return NextResponse.json({ ok: false, error: 'OPERATION_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  }
  const inOrganization = await prisma.$transaction(async (tx) => {
    const scope = await tenantBelongsToOrganization(tx, operation.tenantId, organizationId);
    if (!scope) return false;
    await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${operation.tenantId}, true)`;
    return true;
  });
  if (!inOrganization) return NextResponse.json({ ok: false, error: 'OPERATION_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  const retried = await provisioningSaga.retryOperation(operationId);
  if (!retried) return NextResponse.json({ ok: false, error: 'OPERATION_NOT_RETRYABLE' }, { status: 409, headers: noStoreHeaders() });
  return NextResponse.json({
    ok: true,
    operation: {
      id: retried.id,
      tenantId: retried.tenantId,
      status: retried.status,
      steps: retried.steps,
    },
  }, { status: 202, headers: noStoreHeaders() });
}, { write: true });
