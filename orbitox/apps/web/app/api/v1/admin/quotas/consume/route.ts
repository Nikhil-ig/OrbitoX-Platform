import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../../_lib/api-guard';

export const POST = withApiGuard(
  {
    serviceId: 'admin',
    serviceName: 'Platform Administration OS',
  },
  async (req: NextRequest) => {
    try {
      const body = await req.json();
      const { serviceId, providerId, categorySlug, actionName, callsCount = 1 } = body;

      if (!serviceId) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_INPUT', message: 'serviceId is required.' } },
          { status: 400 }
        );
      }

      const srv = PlatformApiState.getService(serviceId);
      if (srv && srv.status === 'blocked') {
        return NextResponse.json(
          {
            success: false,
            allowed: false,
            error: {
              code: 'SERVICE_SUSPENDED',
              message: `Microservice [${srv.name}] is suspended by Platform Admin.`,
            },
          },
          { status: 403 }
        );
      }

      if (providerId && categorySlug) {
        const provider = PlatformApiState.getProvider(categorySlug, providerId);
        if (provider && provider.status === 'blocked') {
          return NextResponse.json(
            {
              success: false,
              allowed: false,
              error: {
                code: 'TENANT_SUSPENDED',
                message: `Tenant [${provider.name}] has been suspended.`,
              },
            },
            { status: 403 }
          );
        }

        if (provider) {
          provider.monthlyApiCalls = (provider.monthlyApiCalls || 0) + callsCount;
        }
      }

      PlatformApiState.recordTelemetry({
        tenantId: providerId,
        categorySlug,
        facade: 'BillingFacade',
        level: 'INFO',
        message: `Quota consumed for [${serviceId}]: ${actionName || 'api_call'} (+${callsCount} units).`,
      });

      return NextResponse.json({
        success: true,
        allowed: true,
        data: {
          serviceId,
          providerId,
          consumed: callsCount,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: err.message } },
        { status: 400 }
      );
    }
  }
);
