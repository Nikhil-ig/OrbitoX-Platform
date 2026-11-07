import { NextRequest, NextResponse } from 'next/server';
import { accountPublicBaseUrl, consumeAuthRateLimit, registerCustomer } from '@/lib/phase6-account-service';
import { resolveClientIp } from '@/app/api/v1/_lib/ip-guard';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email : '';
  const rate = await consumeAuthRateLimit({ ipAddress: resolveClientIp(request.headers), email, action: 'signup' });
  if (!rate.allowed) return rateLimited(rate.retryAfterSeconds);
  try {
    const result = await registerCustomer({
      email,
      password: typeof body.password === 'string' ? body.password : '',
      organizationName: typeof body.organizationName === 'string' ? body.organizationName : '',
      baseUrl: accountPublicBaseUrl(request.nextUrl.origin),
    });
    return NextResponse.json(result.body, { status: result.status, headers: noStore });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Account signup failed.';
    const expectedFailure =
      message === 'Enter a valid email address.' ||
      message.startsWith('Password must') ||
      message.startsWith('Organization name must') ||
      message.includes('appeared in a data breach') ||
      message.includes('breach check is unavailable') ||
      message.includes('breach check failed') ||
      message.includes('ORBITOX_PUBLIC_BASE_URL is required');
    if (!expectedFailure) throw error;
    const status = message.includes('breach check is unavailable') || message.includes('breach check failed') ? 503 : 422;
    return NextResponse.json({ ok: false, error: message }, { status, headers: noStore });
  }
}

function rateLimited(retryAfter: number) {
  return NextResponse.json({ ok: false, error: 'Too many requests. Try again later.' }, {
    status: 429,
    headers: { ...noStore, 'Retry-After': String(retryAfter) },
  });
}

const noStore = { 'Cache-Control': 'no-store' };
