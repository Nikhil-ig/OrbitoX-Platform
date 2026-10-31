import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { verifyStaffSession, revokeStaffSession } from '@/lib/hms-auth';
import { mapDbError, errorBody, HttpError } from '@/lib/db-errors';

function extractSessionToken(req: NextRequest): string {
  const staffHeader = req.headers.get('x-staff-session') || req.headers.get('x-staff-token');
  if (staffHeader) return staffHeader.trim();

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  const queryToken = req.nextUrl.searchParams.get('token');
  if (queryToken) return queryToken.trim();

  return '';
}

export const GET = withHospitalGuard(async (req: NextRequest, _routeContext, authContext) => {
  try {
    const token = extractSessionToken(req);
    if (!token) {
      throw new HttpError(401, 'SESSION_REQUIRED', 'Staff session token is required');
    }

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      try {
        const { actor, staff } = await verifyStaffSession(tx, token);
        return {
          session: {
            id: actor.sessionId,
            roleId: actor.roleId,
          },
          staff: {
            id: staff.id,
            role: staff.role,
            status: staff.status,
            onDuty: staff.onDuty,
          },
          permissions: actor.permissions,
        };
      } catch (sessErr: any) {
        if (sessErr.message === 'SESSION_NOT_FOUND') {
          throw new HttpError(401, 'SESSION_NOT_FOUND', 'Session does not exist or has expired');
        }
        if (sessErr.message === 'SESSION_REVOKED') {
          throw new HttpError(401, 'SESSION_REVOKED', 'Session has been revoked');
        }
        if (sessErr.message === 'SESSION_IDLE_TIMEOUT') {
          throw new HttpError(401, 'SESSION_IDLE_TIMEOUT', 'Session expired due to inactivity');
        }
        if (sessErr.message === 'SESSION_ABSOLUTE_TIMEOUT') {
          throw new HttpError(401, 'SESSION_ABSOLUTE_TIMEOUT', 'Session exceeded maximum 12-hour duration');
        }
        if (sessErr.message === 'STAFF_SUSPENDED') {
          throw new HttpError(403, 'STAFF_SUSPENDED', 'Staff account has been suspended');
        }
        throw sessErr;
      }
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
}, { adminOnly: true, sensitive: true });

export const DELETE = withHospitalGuard(async (req: NextRequest, _routeContext, authContext) => {
  try {
    const token = extractSessionToken(req);
    const body = await req.json().catch(() => ({}));
    const sessionId = body.sessionId;

    if (!token && !sessionId) {
      throw new HttpError(422, 'INVALID_INPUT', 'Session token or sessionId is required to logout');
    }

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      let targetSessionId = sessionId;
      if (!targetSessionId && token) {
        try {
          const verified = await verifyStaffSession(tx, token);
          targetSessionId = verified.actor.sessionId;
        } catch {
          return { revoked: true };
        }
      }

      if (targetSessionId) {
        await revokeStaffSession(tx, targetSessionId);
      }
      return { revoked: true };
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
}, { adminOnly: true, sensitive: true });
