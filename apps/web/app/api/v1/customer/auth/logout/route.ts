import { NextResponse } from 'next/server';
import { clearCustomerSessionCookies, withCustomerAuth } from '@/lib/customer-auth';
import { revokeCustomerSession } from '@/lib/phase6-account-service';

export const POST = withCustomerAuth(async (_request, session) => {
  await revokeCustomerSession(session.id);
  return clearCustomerSessionCookies(NextResponse.json({ ok: true }, { headers: noStore }));
}, { write: true });

const noStore = { 'Cache-Control': 'no-store' };
