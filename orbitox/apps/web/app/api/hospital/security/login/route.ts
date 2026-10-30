import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { checkPassword, recordFailure, createSession } from '@/lib/hms-auth';
import { getPhiKeyRing, blindIndex } from '@/lib/phi-crypto';
import { mapDbError, errorBody, HttpError } from '@/lib/db-errors';
import { resolveClientIp } from '@/app/api/v1/_lib/ip-guard';
import { platformRepository } from '@/lib/platform-repository';

export const POST = withHospitalGuard(async (req: NextRequest, _routeContext, authContext) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, staffId, password } = body;

    if ((!email && !staffId) || !password) {
      throw new HttpError(422, 'INVALID_INPUT', 'email or staffId and password are required');
    }

    const clientIp = resolveClientIp(req.headers);
    const userAgent = req.headers.get('user-agent') || undefined;

    // Rate limiting: per-IP (30/min) and per-account (10/min) using Step 4 rate limiter
    const accountIdentifier = staffId || (email ? email.toLowerCase() : 'unknown');
    const rateLimitResult = await platformRepository.checkRateLimits(
      [
        { scopeType: 'ip', scopeId: clientIp, limit: 30 },
        { scopeType: 'key', scopeId: `hms:acc:${authContext.tenantId}:${accountIdentifier}`, limit: 10 },
      ],
      60,
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        errorBody(
          new HttpError(429, 'RATE_LIMIT_EXCEEDED', 'Too many login attempts. Please wait before retrying.'),
          authContext.requestId,
        ),
        { status: 429, headers: { 'retry-after': String(rateLimitResult.resetSeconds) } },
      );
    }

    let emailBlind: string | undefined;
    if (email) {
      const ring = getPhiKeyRing();
      emailBlind = blindIndex(ring, email, 'email', authContext.tenantId, 'emailBlind');
    }

    // 1) Verify inside a read transaction; returns a result instead of throwing
    const outcome = await withTenantTx(prisma, authContext.tenantId, (tx) =>
      checkPassword(tx, { staffId, emailBlind }, password),
    );

    // 2) Failure path: separate transaction that commits, using atomic increment
    if (!outcome.ok) {
      if (outcome.reason === 'INVALID_PASSWORD' && outcome.staffId) {
        const failure = await withTenantTx(prisma, authContext.tenantId, (tx) =>
          recordFailure(tx, outcome.staffId!),
        );

        if (failure.failedAttempts >= 5) {
          console.warn(
            `[HMS Security ALERT] Staff account locked for tenant=${authContext.tenantId} staffId=${outcome.staffId} failedAttempts=${failure.failedAttempts} lockedUntil=${failure.lockedUntil?.toISOString()}`,
          );
          try {
            await platformRepository.recordPlatformAdminAudit({
              action: 'hms.security.account_locked',
              entityType: 'HmsStaff',
              entityId: outcome.staffId,
              organizationId: authContext.tenantId,
              ipAddress: clientIp,
              requestId: authContext.requestId,
              reason: `Staff account locked after ${failure.failedAttempts} failed attempts`,
              metadata: {
                tenantId: authContext.tenantId,
                staffId: outcome.staffId,
                failedAttempts: failure.failedAttempts,
                lockedUntil: failure.lockedUntil?.toISOString(),
              },
            });
          } catch (auditErr) {
            console.error('[HMS Security] Failed to record lockout audit alert:', auditErr);
          }
        }
      }

      console.warn(
        `[HMS Security] Failed login for tenant=${authContext.tenantId} staffId=${outcome.staffId || 'UNKNOWN'} reason=${outcome.reason} ip=${clientIp}`,
      );

      // Uniform generic response to prevent account enumeration
      return NextResponse.json(
        errorBody(new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid staff ID or password'), authContext.requestId),
        { status: 401 },
      );
    }

    // 3) Success path: create session in committed transaction (also resets failure counters)
    const sessionResult = await withTenantTx(prisma, authContext.tenantId, (tx) =>
      createSession(tx, outcome, { clientIp, userAgent }),
    );

    return NextResponse.json({
      success: true,
      data: {
        token: sessionResult.rawToken,
        staff: sessionResult.staff,
        session: sessionResult.session,
        permissions: sessionResult.permissions,
      },
    });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
}, { adminOnly: true, sensitive: true });
