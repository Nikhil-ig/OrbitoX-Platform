import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../_lib/api-guard';

export const GET = withApiGuard(
  {
    serviceId: 'admin',
    serviceName: 'Platform Administration OS',
  },
  async () => {
    const logs = PlatformApiState.getTelemetry();
    return NextResponse.json({
      success: true,
      data: logs,
      meta: { total: logs.length },
    });
  }
);

export const POST = withApiGuard(
  {
    serviceId: 'admin',
    serviceName: 'Platform Administration OS',
  },
  async (req: NextRequest) => {
    try {
      const body = await req.json();
      const log = PlatformApiState.recordTelemetry(body);
      return NextResponse.json({
        success: true,
        data: log,
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: err.message } },
        { status: 400 }
      );
    }
  }
);
