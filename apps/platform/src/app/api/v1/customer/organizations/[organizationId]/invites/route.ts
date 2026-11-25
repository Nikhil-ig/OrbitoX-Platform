import { NextRequest, NextResponse } from 'next/server';
import { resolveClientIp } from '@/app/api/v1/_lib/ip-guard';
import { withCustomerAuth } from '@/server/auth/customer-auth';
import { getCustomerOrganizationRole, noStoreHeaders } from '@/server/organizations/customer-dashboard';
import { accountPublicBaseUrl, consumeAuthRateLimit, inviteCustomerMember } from '@/server/accounts/account-service';
import { prisma } from '@/server/db/prisma';

type RouteContext = { params: Promise<{ organizationId: string }> };

export const GET = withCustomerAuth<RouteContext>(async (_request, session, context) => {
  const { organizationId } = await context.params;
  if (!await getCustomerOrganizationRole(organizationId, session.userId)) {
    return NextResponse.json({ ok: false, error: 'ORGANIZATION_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  }
  const now = new Date();
  const tokens = await prisma.accountToken.findMany({
    where: {
      organizationId,
      purpose: 'INVITE',
      usedAt: null,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      tokenHash: true,
      email: true,
      role: true,
      expiresAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({
    ok: true,
    invites: tokens.map((t) => ({
      id: t.tokenHash.slice(0, 16),
      email: t.email,
      role: t.role || 'MEMBER',
      status: t.expiresAt > now ? 'PENDING_ACCEPTANCE' : 'EXPIRED',
      expiresAt: t.expiresAt,
      createdAt: t.createdAt,
    })),
  }, { headers: noStoreHeaders() });
}, { write: false });

export const POST = withCustomerAuth<RouteContext>(async (request: NextRequest, session, context) => {
  const { organizationId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email : '';
  const rate = await consumeAuthRateLimit({ ipAddress: resolveClientIp(request.headers), email, action: 'invite' });
  if (!rate.allowed) {
    return NextResponse.json({ ok: false, error: 'Too many requests. Try again later.' }, {
      status: 429,
      headers: { ...noStore, 'Retry-After': String(rate.retryAfterSeconds) },
    });
  }
  let inviteResult;
  try {
    inviteResult = await inviteCustomerMember({
      organizationId,
      actorUserId: session.userId,
      email,
      role: typeof body.role === 'string' ? body.role : '',
      baseUrl: accountPublicBaseUrl(request.nextUrl.origin),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const knownError = [
      'Enter a valid email address.',
      'Invites may grant ADMIN, MEMBER, or BILLING only.',
      'Organization not found.',
      'Only organization owners and admins can invite members.',
      'This user is already a member of the organization.',
      'ORBITOX_PUBLIC_BASE_URL is required in production.',
    ].includes(message);
    if (!knownError) throw error;
    const status = message === 'Organization not found.' ? 404 : message.startsWith('Only organization') ? 403 : message.includes('already a member') ? 409 : 422;
    return NextResponse.json({ ok: false, error: message }, { status, headers: noStore });
  }
  return NextResponse.json({
    ok: true,
    invitationReference: inviteResult.invitationReference,
    email: inviteResult.email,
    role: inviteResult.role,
  }, { status: 202, headers: noStore });
}, { write: true, allowMfaSetup: true });

const noStore = { 'Cache-Control': 'no-store' };
