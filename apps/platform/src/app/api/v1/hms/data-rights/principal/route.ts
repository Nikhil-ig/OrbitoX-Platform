import { NextRequest, NextResponse } from 'next/server';
import type { ErasureMode, PrincipalRef } from '@orbitox-io/plugin-engine';
import { errorBody, HttpError, mapDbError } from '@/server/db/db-errors';
import { executePrincipalDataRightsRequest } from '@/server/data-rights/service';
import { prisma } from '@/server/db/prisma';
import { withTenantTx } from '@/server/db/tenant-db';
import { withApiGuard } from '../../../_lib/api-guard';

export const POST = withApiGuard(
  {
    serviceId: 'hms',
    serviceName: 'Hospital Management System',
    requiredScopes: ['write', 'hms:write', 'hms.patients.write', 'hms.data_rights'],
  },
  async (req: NextRequest, ctx) => {
    try {
      const body: unknown = await req.json().catch(() => null);
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new HttpError(422, 'INVALID_INPUT', 'Request body must be a JSON object.');
      }
      const obj = body as Record<string, unknown>;
      const action = obj.action;
      const reason = typeof obj.reason === 'string' ? obj.reason.trim() : '';
      const principal =
        obj.principal && typeof obj.principal === 'object' && !Array.isArray(obj.principal)
          ? (obj.principal as PrincipalRef)
          : null;

      if (!principal || !reason || (action !== 'export' && action !== 'correct' && action !== 'erase')) {
        throw new HttpError(
          422,
          'INVALID_INPUT',
          'action (export|correct|erase), principal, and reason are required.',
        );
      }

      const mode =
        obj.mode === 'DELETE' || obj.mode === 'RESTRICT'
          ? (obj.mode as ErasureMode)
          : undefined;
      const fields =
        obj.fields && typeof obj.fields === 'object' && !Array.isArray(obj.fields)
          ? (obj.fields as Record<string, unknown>)
          : undefined;

      // Verify tenant context under RLS before dispatching plugin data-rights operation.
      await withTenantTx(prisma, ctx.tenantId, async (tx) => {
        await tx.query('SELECT 1');
      });

      const data = await executePrincipalDataRightsRequest({
        tenantId: ctx.tenantId,
        pluginId: '@orbitox/hms',
        action,
        principal,
        ...(fields ? { patch: { fields } } : {}),
        ...(mode ? { mode } : {}),
        context: {
          actorId: ctx.sub || 'hms_tenant_admin',
          reason,
          requestId: ctx.requestId,
        },
      });

      return NextResponse.json({ success: true, data });
    } catch (err: unknown) {
      const apiErr = mapDbError(err);
      return NextResponse.json(errorBody(apiErr, ctx.requestId), { status: apiErr.status });
    }
  },
);
