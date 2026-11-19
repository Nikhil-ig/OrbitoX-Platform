import { NextResponse } from 'next/server';
import { withCustomerAuth } from '@/server/auth/customer-auth';
import { setupCustomerMfa } from '@/server/accounts/account-service';

export const POST = withCustomerAuth(async (_request, session) => {
  const enrollment = await setupCustomerMfa(session.userId);
  return NextResponse.json(enrollment, { headers: noStore });
}, { write: true, allowMfaSetup: true });

const noStore = { 'Cache-Control': 'no-store' };
