import { NextResponse } from 'next/server';
import { withApiGuard } from '../_lib/guard';

export const GET = withApiGuard(
  {
    public: true,
    serviceId: 'health',
  },
  async () => {
    return NextResponse.json({
      status: 'pass',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      version: '1.4.0',
      securityStatus: 'HARDENED_ZERO_TRUST',
    });
  }
);
