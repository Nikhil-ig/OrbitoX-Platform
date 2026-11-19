import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../../_lib/api-guard';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const { serviceId } = await params;
  const s = PlatformApiState.getService(serviceId);
  if (!s) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: `Service ${serviceId} not found.` } },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, data: s });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const { serviceId } = await params;
  try {
    const body = await req.json();
    let s = PlatformApiState.getService(serviceId);
    if (!s) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: `Service ${serviceId} not found.` } },
        { status: 404 }
      );
    }

    if (body.status && (body.status === 'active' || body.status === 'blocked')) {
      s.status = body.status;
    }
    if (typeof body.apiCallLimit === 'number') {
      s.apiCallLimit = body.apiCallLimit;
    }
    if (typeof body.storageLimitMb === 'number') {
      s.storageLimitMb = body.storageLimitMb;
    }

    PlatformApiState.recordTelemetry({
      facade: 'SecurityFacade',
      level: 'INFO',
      message: `Admin modified service [${s.name}]: status=${s.status}, quota=${s.apiCallLimit}`,
    });

    return NextResponse.json({ success: true, data: s });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: err.message } },
      { status: 400 }
    );
  }
}
