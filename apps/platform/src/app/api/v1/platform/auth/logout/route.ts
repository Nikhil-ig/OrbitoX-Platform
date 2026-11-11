import { NextResponse } from 'next/server';
import { clearOperatorSessionCookies, withOperatorAuth } from '@/server/auth/operator-auth';
import { revokeOperatorSession } from '@/server/accounts/account-service';

export const POST = withOperatorAuth(async (_request, session) => {
  await revokeOperatorSession(session.id);
  return clearOperatorSessionCookies(NextResponse.json({ success: true }, { headers: noStore }));
}, { write: true, requiredRole: 'SUPPORT_READONLY' });

const noStore = { 'Cache-Control': 'no-store' };
