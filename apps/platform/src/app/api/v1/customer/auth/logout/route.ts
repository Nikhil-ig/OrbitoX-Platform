import { NextResponse } from 'next/server';
import { clearCustomerSessionCookies, withCustomerAuth } from '@/server/auth/customer-auth';
import { revokeCustomerSession } from '@/server/accounts/account-service';

export const POST = withCustomerAuth(async (_request, session) => {
  await revokeCustomerSession(session.id);
  return clearCustomerSessionCookies(NextResponse.json({ ok: true }, { headers: noStore }));
}, { write: true });

const noStore = { 'Cache-Control': 'no-store' };
