import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { dataRightsConsoleService } from '@/server/data-rights/data-rights-console-service';

export const dynamic = 'force-dynamic';

export const POST = withOperatorAuth(async (req: NextRequest) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { certificate } = body;

    if (!certificate) {
      return NextResponse.json(
        { valid: false, reason: 'Missing certificate payload in request body' },
        { status: 400 },
      );
    }

    let parsedCert = certificate;
    if (typeof certificate === 'string') {
      try {
        parsedCert = JSON.parse(certificate);
      } catch {
        return NextResponse.json(
          { valid: false, reason: 'Certificate string is not valid JSON.' },
          { status: 400 },
        );
      }
    }

    const result = dataRightsConsoleService.verifyCertificate(parsedCert);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { valid: false, reason: error?.message || 'Certificate verification error' },
      { status: 500 },
    );
  }
});
