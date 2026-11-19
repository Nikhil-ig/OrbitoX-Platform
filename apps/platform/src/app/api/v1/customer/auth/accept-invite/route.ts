import { NextRequest, NextResponse } from 'next/server';
import {
  validCustomerCsrf,
  setCustomerSessionCookies,
} from '@/server/auth/customer-auth';
import {
  acceptCustomerInvite,
  createCustomerSessionForUser,
  CUSTOMER_SESSION_COOKIE,
  getCustomerSession,
} from '@/server/accounts/account-service';
import { resolveClientIp } from '@/app/api/v1/_lib/ip-guard';

export async function POST(request: NextRequest) {
  const currentSession = await getCustomerSession(request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
  if (currentSession && !validCustomerCsrf(request, currentSession.csrfTokenHash)) {
    return NextResponse.json({ ok: false, error: 'CSRF validation failed.' }, { status: 403, headers: noStore });
  }
  const body = await request.json().catch(() => ({}));
  if (typeof body.token !== 'string') {
    return NextResponse.json({ ok: false, error: 'Invalid or expired invitation.' }, { status: 400, headers: noStore });
  }
  const accepted = await acceptCustomerInvite({
    rawToken: body.token,
    actorUserId: currentSession?.userId,
    password: typeof body.password === 'string' ? body.password : undefined,
  });
  if (!accepted) {
    return NextResponse.json({ ok: false, error: 'Invalid or expired invitation.' }, { status: 400, headers: noStore });
  }
  if (currentSession) return NextResponse.json({ ok: true }, { headers: noStore });
  const tokens = await createCustomerSessionForUser(accepted.userId, {
    ipAddress: resolveClientIp(request.headers),
    userAgent: request.headers.get('user-agent') || undefined,
  });
  const response = NextResponse.json({ ok: true }, { headers: noStore });
  return setCustomerSessionCookies(response, {
    sessionToken: tokens.sessionToken,
    csrfToken: tokens.csrfToken,
    expiresAt: tokens.absoluteExpiresAt,
  });
}

const noStore = { 'Cache-Control': 'no-store' };
