import { NextRequest, NextResponse } from 'next/server';
import { resolveClientIp } from '@/app/api/v1/_lib/ip-guard';
import { setCustomerSessionCookies } from '@/lib/customer-auth';
import {
  consumeAuthRateLimit,
  loginCustomer,
} from '@/lib/phase6-account-service';
import { assertValidEmail } from '@/lib/phase6-account-security';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email : '';
  let normalizedEmail: string;
  try {
    normalizedEmail = assertValidEmail(email);
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid email, password, or verification code.' }, { status: 401, headers: noStore });
  }
  const rate = await consumeAuthRateLimit({ ipAddress: resolveClientIp(request.headers), email: normalizedEmail, action: 'login' });
  if (!rate.allowed) {
    return NextResponse.json({ ok: false, error: 'Too many login attempts. Try again later.' }, {
      status: 429,
      headers: { ...noStore, 'Retry-After': String(rate.retryAfterSeconds) },
    });
  }
  const result = await loginCustomer({
    email: normalizedEmail,
    password: typeof body.password === 'string' ? body.password : '',
    totpCode: typeof body.totpCode === 'string' ? body.totpCode : undefined,
    ipAddress: resolveClientIp(request.headers),
    userAgent: request.headers.get('user-agent') || undefined,
  });
  if (!result.ok) {
    const emailUnverified = result.reason === 'EMAIL_NOT_VERIFIED';
    return NextResponse.json(
      { ok: false, error: emailUnverified ? 'Verify your email before signing in.' : 'Invalid email, password, or verification code.' },
      { status: emailUnverified ? 403 : 401, headers: noStore },
    );
  }
  const response = NextResponse.json({
    ok: true,
    user: { id: result.userId, email: result.email },
    mfaSetupRequired: result.mfaSetupRequired,
  }, { headers: noStore });
  return setCustomerSessionCookies(response, {
    sessionToken: result.sessionToken,
    csrfToken: result.csrfToken,
    expiresAt: result.absoluteExpiresAt,
  });
}

const noStore = { 'Cache-Control': 'no-store' };
