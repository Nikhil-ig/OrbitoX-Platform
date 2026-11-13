import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import {
  getOperatorAppearance,
  updateOperatorAppearance,
  setAppearanceCookie,
} from '@/server/appearance/appearance-service';

const noStore = { 'Cache-Control': 'no-store' };

export const GET = withOperatorAuth(async (_request, session) => {
  const appearance = await getOperatorAppearance(session.operatorId);
  const response = NextResponse.json({ success: true, appearance }, { headers: noStore });
  setAppearanceCookie(response, appearance);
  return response;
});

export const PUT = withOperatorAuth(async (request: NextRequest, session) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { message: 'Invalid JSON body' } },
      { status: 400, headers: noStore }
    );
  }

  const result = await updateOperatorAppearance(session.operatorId, body);
  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Invalid appearance preferences',
          issues: result.error.issues,
        },
      },
      { status: 400, headers: noStore }
    );
  }

  const response = NextResponse.json(
    { success: true, appearance: result.appearance },
    { headers: noStore }
  );
  setAppearanceCookie(response, result.appearance);
  return response;
});

