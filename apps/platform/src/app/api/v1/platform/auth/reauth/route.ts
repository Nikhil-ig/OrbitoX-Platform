import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { reauthenticateOperator } from '@/server/accounts/account-service';

export const POST = withOperatorAuth(async (request: NextRequest, session) => {
  const body = await request.json().catch(() => ({}));
  if (typeof body.password !== 'string' || typeof body.totpCode !== 'string') {
    return NextResponse.json({ success: false, error: 'Password and TOTP code are required.' }, { status: 422, headers: noStore });
  }
  const authenticated = await reauthenticateOperator(session, body.password, body.totpCode);
  return NextResponse.json(authenticated ? { success: true } : { success: false, error: 'Re-authentication failed.' }, {
    status: authenticated ? 200 : 401,
    headers: noStore,
  });
}, { write: true, requiredRole: 'SUPPORT_READONLY' });

const noStore = { 'Cache-Control': 'no-store' };
