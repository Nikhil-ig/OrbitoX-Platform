import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/system/runtime-token
 * Returns the configured client runtime token and backend URL to authenticated administrators,
 * strictly for onboarding / connect wizard snippets.
 */
export async function GET(req: NextRequest) {
  try {
    const principal = req.headers.get('x-orbitox-principal');
    if (principal !== 'admin') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin authentication required.' } },
        { status: 403 }
      );
    }

    const runtimeToken = process.env.ORBITOX_RUNTIME_TOKEN?.trim() || '';
    const host = req.headers.get('host') || 'localhost:3005';
    const proto = req.headers.get('x-forwarded-proto') || 'http';
    const backendUrl = process.env.ORBITOX_BACKEND_URL?.trim() || `${proto}://${host}`;

    return NextResponse.json(
      {
        success: true,
        data: {
          runtimeToken,
          backendUrl,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: { code: 'INTERNAL', message } }, { status: 500 });
  }
}
