import { NextRequest, NextResponse } from 'next/server';
import { resolveClientIp } from '@/app/api/v1/_lib/ip-guard';
import { uniformAccountResponse } from '@/lib/phase6-account-security';
import { accountPublicBaseUrl, consumeAuthRateLimit, requestCustomerPasswordReset } from '@/lib/phase6-account-service';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email : '';
  const rate = await consumeAuthRateLimit({ ipAddress: resolveClientIp(request.headers), email, action: 'reset' });
  if (!rate.allowed) {
    return NextResponse.json({ ok: false, error: 'Too many requests. Try again later.' }, {
      status: 429,
      headers: { ...noStore, 'Retry-After': String(rate.retryAfterSeconds) },
    });
  }
  try {
    await requestCustomerPasswordReset(email, accountPublicBaseUrl(request.nextUrl.origin));
  } catch (error) {
    if (!(error instanceof Error) || error.message !== 'Enter a valid email address.') throw error;
  }
  const response = uniformAccountResponse();
  return NextResponse.json(response.body, { status: response.status, headers: noStore });
}

const noStore = { 'Cache-Control': 'no-store' };
