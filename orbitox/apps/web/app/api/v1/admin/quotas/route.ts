import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '../../_lib/api-guard';
import { PLATFORM_QUOTAS } from '@/app/admin/data/mock-data';

export const GET = withApiGuard(
  {
    serviceId: 'admin',
    serviceName: 'Platform Administration OS',
  },
  async () => {
    return NextResponse.json({
      success: true,
      data: PLATFORM_QUOTAS,
      meta: {
        timestamp: new Date().toISOString(),
        totalMetrics: PLATFORM_QUOTAS.length,
      },
    });
  }
);
