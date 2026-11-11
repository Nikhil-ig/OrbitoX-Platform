import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth } from '@/server/auth/customer-auth';
import { reauthenticateCustomer } from '@/server/accounts/account-service';

export const POST = withCustomerAuth(async (request: NextRequest, session) => {
  const body = await request.json().catch(() => ({}));
  if (typeof body.password !== 'string') {
    return NextResponse.json({ ok: false, error: 'Password is required.' }, { status: 422, headers: noStore });
  }
  const authenticated = await reauthenticateCustomer(
    session,
    body.password,
    typeof body.totpCode === 'string' ? body.totpCode : undefined,
  );
  return NextResponse.json(authenticated ? { ok: true } : { ok: false, error: 'Re-authentication failed.' }, {
    status: authenticated ? 200 : 401,
    headers: noStore,
  });
}, { write: true, allowMfaSetup: true });

const noStore = { 'Cache-Control': 'no-store' };
