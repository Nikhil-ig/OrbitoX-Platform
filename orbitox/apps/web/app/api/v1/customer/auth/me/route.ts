import { NextResponse } from 'next/server';
import { withCustomerAuth } from '@/lib/customer-auth';

export const GET = withCustomerAuth(async (_request, session) => NextResponse.json({
  ok: true,
  user: {
    id: session.userId,
    email: session.email,
    emailVerified: session.emailVerified,
    mfaEnabled: session.mfaEnabled,
    mfaSetupRequired: session.mfaSetupRequired,
  },
  memberships: session.memberships,
}, { headers: noStore }));

const noStore = { 'Cache-Control': 'no-store' };
