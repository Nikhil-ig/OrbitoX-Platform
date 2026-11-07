import { NextResponse } from 'next/server';
import { withCustomerAuth } from '@/lib/customer-auth';
import { setupCustomerMfa } from '@/lib/phase6-account-service';

export const POST = withCustomerAuth(async (_request, session) => {
  const enrollment = await setupCustomerMfa(session.userId);
  return NextResponse.json(enrollment, { headers: noStore });
}, { write: true, allowMfaSetup: true });

const noStore = { 'Cache-Control': 'no-store' };
