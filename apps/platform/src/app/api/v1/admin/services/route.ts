import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../_lib/api-guard';

export const GET = withApiGuard(
  {
    serviceId: 'admin',
    serviceName: 'Platform Administration OS',
  },
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    let services = PlatformApiState.getServices();

    if (category && category !== 'all') {
      services = services.filter((s) => s.category === category);
    }
    if (status && status !== 'all') {
      services = services.filter((s) => s.status === status);
    }

    return NextResponse.json({
      success: true,
      data: services,
      meta: {
        total: services.length,
        timestamp: new Date().toISOString(),
      },
    });
  }
);

export const POST = withApiGuard(
  {
    serviceId: 'admin',
    serviceName: 'Platform Administration OS',
    requiredScopes: ['admin', 'write'],
  },
  async (req: NextRequest) => {
    try {
      const body = await req.json();
      const { serviceId, action, callLimit } = body;

      if (!serviceId) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_INPUT', message: 'serviceId is required.' } },
          { status: 400 }
        );
      }

      if (action === 'toggle') {
        const updated = PlatformApiState.toggleService(serviceId);
        if (!updated) {
          return NextResponse.json(
            { success: false, error: { code: 'NOT_FOUND', message: `Service ${serviceId} not found.` } },
            { status: 404 }
          );
        }

        PlatformApiState.recordTelemetry({
          facade: 'ContextFacade',
          level: updated.status === 'active' ? 'INFO' : 'WARN',
          message: `Service [${updated.name}] transitioned to ${updated.status.toUpperCase()} via REST API.`,
        });

        return NextResponse.json({
          success: true,
          data: updated,
          message: `Microservice ${updated.name} is now ${updated.status}.`,
        });
      }

      if (action === 'quota' && typeof callLimit === 'number') {
        const updated = PlatformApiState.updateServiceQuota(serviceId, callLimit);
        return NextResponse.json({
          success: true,
          data: updated,
          message: `Quota for ${updated?.name} updated to ${callLimit.toLocaleString()} calls/mo.`,
        });
      }

      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ACTION', message: 'Supported actions: "toggle", "quota".' } },
        { status: 400 }
      );
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: err.message } },
        { status: 400 }
      );
    }
  }
);
