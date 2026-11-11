import { NextResponse } from 'next/server';
import { withOperatorAuth } from '@/lib/operator-auth';

export const GET = withOperatorAuth(async (_request, session) => NextResponse.json({
  success: true,
  operator: { id: session.operatorId, email: session.email, role: session.role },
}, { headers: noStore }));

const noStore = { 'Cache-Control': 'no-store' };
