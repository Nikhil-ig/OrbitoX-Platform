import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { authenticateStaff } from '@/lib/hms-auth';
import { getPhiKeyRing, blindIndex } from '@/lib/phi-crypto';
import { mapDbError, errorBody, HttpError } from '@/lib/db-errors';

export const POST = withHospitalGuard(async (req: NextRequest, _routeContext, authContext) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, staffId, password } = body;

    if ((!email && !staffId) || !password) {
      throw new HttpError(422, 'INVALID_INPUT', 'email or staffId and password are required');
    }

    let emailBlind: string | undefined;
    if (email) {
      const ring = getPhiKeyRing();
      emailBlind = blindIndex(ring, email, 'email', authContext.tenantId, 'emailBlind');
    }

    const userAgent = req.headers.get('user-agent') || undefined;
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;

    const result = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      try {
        return await authenticateStaff(
          tx,
          { staffId, emailBlind },
          password,
          { userAgent, ipAddress }
        );
      } catch (authErr: any) {
        if (authErr.message?.startsWith('ACCOUNT_LOCKED')) {
          const seconds = authErr.message.split(':')[1] || '900';
          throw new HttpError(423, 'ACCOUNT_LOCKED', `Account is temporarily locked. Try again in ${seconds} seconds.`);
        }
        if (authErr.message === 'INVALID_CREDENTIALS') {
          throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email/staff ID or password');
        }
        if (authErr.message === 'STAFF_SUSPENDED') {
          throw new HttpError(403, 'STAFF_SUSPENDED', 'Staff account is suspended');
        }
        throw authErr;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        token: result.rawToken,
        staff: result.staff,
        session: result.session,
        permissions: result.permissions,
      },
    });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
}, { adminOnly: true, sensitive: true });
