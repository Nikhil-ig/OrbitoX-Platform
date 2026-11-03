import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth } from '@/lib/customer-auth';
import { confirmCustomerMfa } from '@/lib/phase6-account-service';

export const POST = withCustomerAuth(async (request: NextRequest, session) => {
  const body = await request.json().catch(() => ({}));
  if (typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) {
    return NextResponse.json({ ok: false, error: 'A valid six-digit TOTP code is required.' }, { status: 422, headers: noStore });
  }
  const confirmed = await confirmCustomerMfa(session.userId, body.code);
  return NextResponse.json(confirmed ? { ok: true } : { ok: false, error: 'TOTP code did not match.' }, {
    status: confirmed ? 200 : 422,
    headers: noStore,
  });
}, { write: true, allowMfaSetup: true });

const noStore = { 'Cache-Control': 'no-store' };
