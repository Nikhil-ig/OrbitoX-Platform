import { NextRequest, NextResponse } from 'next/server';
import { resolveClientIp } from '@/app/api/v1/_lib/ip-guard';
import { setCustomerSessionCookies } from '@/server/auth/customer-auth';
import {
  consumeAuthRateLimit,
  verifyCustomerEmailCode,
} from '@/server/accounts/account-service';
import { assertValidEmail } from '@/server/auth/account-security';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const rawEmail = typeof body.email === 'string' ? body.email : '';
  const rawCode = typeof body.code === 'string' ? body.code : '';

  let normalizedEmail: string;
  try {
    normalizedEmail = assertValidEmail(rawEmail);
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid email or verification code format.' },
      { status: 400, headers: noStore },
    );
  }

  if (!/^\d{6}$/.test(rawCode.trim())) {
    return NextResponse.json(
      { ok: false, error: 'Verification code must be exactly 6 digits.' },
      { status: 400, headers: noStore },
    );
  }

  const rate = await consumeAuthRateLimit({
    ipAddress: resolveClientIp(request.headers),
    email: normalizedEmail,
    action: 'login', // shares auth attempt bucket
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many verification attempts. Try again later.' },
      { status: 429, headers: { ...noStore, 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }

  const result = await verifyCustomerEmailCode({
    email: normalizedEmail,
    code: rawCode.trim(),
    ipAddress: resolveClientIp(request.headers),
    userAgent: request.headers.get('user-agent') || undefined,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error || 'Invalid or expired verification code.' },
      { status: 400, headers: noStore },
    );
  }

  const response = NextResponse.json(
    {
      ok: true,
      user: result.user,
    },
    { headers: noStore },
  );

  return setCustomerSessionCookies(response, {
    sessionToken: result.sessionToken,
    csrfToken: result.csrfToken,
    expiresAt: result.absoluteExpiresAt,
  });
}

const noStore = { 'Cache-Control': 'no-store' };

