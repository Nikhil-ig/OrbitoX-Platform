import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth } from '@/server/auth/customer-auth';
import {
  getCustomerOrganizationRole,
  noStoreHeaders,
} from '@/server/organizations/customer-dashboard';
import { operationStore } from '@/server/provisioning/operation-store';

type RouteContext = { params: Promise<{ organizationId: string; operationId: string }> };

export const GET = withCustomerAuth<RouteContext>(
  async (_request: NextRequest, session, context) => {
    const { organizationId, operationId } = await context.params;
    const role = await getCustomerOrganizationRole(organizationId, session.userId);
    if (!role) {
      return NextResponse.json(
        { ok: false, error: 'ORGANIZATION_NOT_FOUND', message: 'Organization not found or access denied.' },
        { status: 404, headers: noStoreHeaders() },
      );
    }

    const operation = await operationStore.getOperation(operationId);
    if (!operation || operation.organizationId !== organizationId) {
      return NextResponse.json(
        { ok: false, error: 'OPERATION_NOT_FOUND', message: 'Provisioning operation not found.' },
        { status: 404, headers: noStoreHeaders() },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        operation: {
          id: operation.id,
          operationId: operation.id,
          tenantId: operation.tenantId,
          type: operation.type,
          status: operation.status,
          steps: operation.steps.map((s) => ({
            id: s.id,
            name: s.name,
            status: s.status,
            startedAt: s.startedAt,
            completedAt: s.completedAt,
            durationMs: s.durationMs,
            error: s.error,
          })),
          error: operation.error,
          createdAt: operation.createdAt,
          updatedAt: operation.updatedAt,
          completedAt: operation.completedAt,
        },
      },
      { status: 200, headers: noStoreHeaders() },
    );
  },
  { write: false, allowMfaSetup: true },
);
