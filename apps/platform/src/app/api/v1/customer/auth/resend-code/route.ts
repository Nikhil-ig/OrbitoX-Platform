import { NextRequest, NextResponse } from 'next/server';
import { resolveClientIp } from '@/app/api/v1/_lib/ip-guard';
import {
  accountPublicBaseUrl,
  consumeAuthRateLimit,
  resendCustomerVerificationCode,
} from '@/server/accounts/account-service';
import { assertValidEmail } from '@/server/auth/account-security';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const rawEmail = typeof body.email === 'string' ? body.email : '';

  let normalizedEmail: string;
  try {
    normalizedEmail = assertValidEmail(rawEmail);
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Enter a valid email address.' },
      { status: 400, headers: noStore },
    );
  }

  const rate = await consumeAuthRateLimit({
    ipAddress: resolveClientIp(request.headers),
    email: normalizedEmail,
    action: 'signup',
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many resend attempts. Try again later.' },
      { status: 429, headers: { ...noStore, 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }

  const result = await resendCustomerVerificationCode({
    email: normalizedEmail,
    baseUrl: accountPublicBaseUrl(request.nextUrl.origin),
  });

  return NextResponse.json(result, { status: 200, headers: noStore });
}

const noStore = { 'Cache-Control': 'no-store' };

