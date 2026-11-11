import { NextRequest, NextResponse } from 'next/server';
import { resetCustomerPassword } from '@/server/accounts/account-service';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (typeof body.token !== 'string' || typeof body.password !== 'string') {
    return NextResponse.json({ ok: false, error: 'Invalid or expired reset link.' }, { status: 400, headers: noStore });
  }
  try {
    const reset = await resetCustomerPassword(body.token, body.password);
    return NextResponse.json(reset ? { ok: true } : { ok: false, error: 'Invalid or expired reset link.' }, {
      status: reset ? 200 : 400,
      headers: noStore,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Password reset failed.';
    const expectedFailure =
      message.startsWith('Password must') ||
      message.includes('appeared in a data breach') ||
      message.includes('breach check is unavailable') ||
      message.includes('breach check failed');
    if (!expectedFailure) throw error;
    const status = message.includes('breach check is unavailable') || message.includes('breach check failed') ? 503 : 422;
    return NextResponse.json({ ok: false, error: message }, { status, headers: noStore });
  }
}

const noStore = { 'Cache-Control': 'no-store' };
