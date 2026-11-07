import { NextRequest, NextResponse } from 'next/server';
import { resolveClientIp } from '@/app/api/v1/_lib/ip-guard';
import { withCustomerAuth } from '@/lib/customer-auth';
import { accountPublicBaseUrl, consumeAuthRateLimit, inviteCustomerMember } from '@/lib/phase6-account-service';

type RouteContext = { params: Promise<{ organizationId: string }> };

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
  try {
    await inviteCustomerMember({
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
  return NextResponse.json({ ok: true }, { status: 202, headers: noStore });
}, { write: true });

const noStore = { 'Cache-Control': 'no-store' };
