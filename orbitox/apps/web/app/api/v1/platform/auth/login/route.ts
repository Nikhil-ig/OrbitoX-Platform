import { NextRequest, NextResponse } from 'next/server';
import { resolveClientIp } from '@/app/api/v1/_lib/ip-guard';
import { setOperatorSessionCookies } from '@/lib/operator-auth';
import { consumeAuthRateLimit, loginOperator } from '@/lib/phase6-account-service';
import { assertValidEmail } from '@/lib/phase6-account-security';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email : '';
  let normalizedEmail: string;
  try {
    normalizedEmail = assertValidEmail(email);
  } catch {
    return loginDenied();
  }
  const ipAddress = resolveClientIp(request.headers);
  const rate = await consumeAuthRateLimit({ ipAddress, email: normalizedEmail, action: 'operator-login' });
  if (!rate.allowed) {
    return NextResponse.json({ success: false, error: 'Too many login attempts. Try again later.' }, {
      status: 429,
      headers: { ...noStore, 'Retry-After': String(rate.retryAfterSeconds) },
    });
  }
  const result = await loginOperator({
    email: normalizedEmail,
    password: typeof body.password === 'string' ? body.password : '',
    totpCode: typeof body.totpCode === 'string' ? body.totpCode : '',
    ipAddress,
    userAgent: request.headers.get('user-agent') || undefined,
  });
  if (!result.ok) return loginDenied();
  const response = NextResponse.json({
    success: true,
    operator: { id: result.operatorId, email: result.email, role: result.role },
  }, { headers: noStore });
  return setOperatorSessionCookies(response, {
    sessionToken: result.sessionToken,
    csrfToken: result.csrfToken,
    expiresAt: result.absoluteExpiresAt,
  });
}

function loginDenied() {
  return NextResponse.json({ success: false, error: 'Invalid credentials or verification code.' }, { status: 401, headers: noStore });
}

const noStore = { 'Cache-Control': 'no-store' };
