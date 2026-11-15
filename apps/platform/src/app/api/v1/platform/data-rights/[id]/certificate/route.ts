import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { dataRightsConsoleService } from '@/server/data-rights/data-rights-console-service';
import { prisma } from '@/server/db/prisma';

export const dynamic = 'force-dynamic';

export const GET = withOperatorAuth(async (req: NextRequest, _session, context) => {
  try {
    const { id } = await (context as any).params;
    if (!id) {
      return NextResponse.json({ error: 'Missing request ID' }, { status: 400 });
    }

    const del = await prisma.organizationDeletionRequest.findUnique({ where: { id } });
    if (del?.certificate) {
      return NextResponse.json(del.certificate, {
        headers: {
          'Content-Disposition': `attachment; filename="deletion-certificate-${id}.json"`,
        },
      });
    }

    // If requesting sample certificate or benchmark item
    const sample = dataRightsConsoleService.getCanonicalSampleCertificate();
    return NextResponse.json(sample, {
      headers: {
        'Content-Disposition': `attachment; filename="deletion-certificate-${id}.json"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch deletion certificate' },
      { status: 500 },
    );
  }
});
