import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../_lib/api-guard';
import { PLATFORM_QUOTAS } from '@/app/admin/data/mock-data';
import { INITIAL_ACTIVITIES } from '@/app/admin/data/admin-context';

export const GET = withApiGuard(
  {
    serviceId: 'admin',
    serviceName: 'Platform Administration OS',
    rateLimitPerMin: 2000,
  },
  async (req: NextRequest) => {
    const services = PlatformApiState.getServices();
    const activeServices = services.filter((s) => s.status === 'active').length;
    const providersObj = PlatformApiState.getProviders();
    const allProviders = Object.values(providersObj).flat();
    const activeProviders = allProviders.filter((p) => p.status === 'active').length;
    const apiKeys = await PlatformApiState.getApiKeys();
    const activeApiKeys = apiKeys.filter((k) => k.status === 'active').length;

    const data = {
      kpis: {
        totalEngines: services.length,
        activeEngines: activeServices,
        engineHealthPercent: Math.round((activeServices / services.length) * 100),
        totalProviders: allProviders.length,
        activeProviders,
        totalApiKeys: apiKeys.length,
        activeApiKeys,
        platformUptime: '99.98%',
        averageLatencyMs: 14.2,
        monthlyTotalRequests: '34,850,000',
        cryptographicIntegrity: 'VERIFIED_ED25519',
        sandboxedFacadesFrozen: true,
      },
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        status: s.status,
        version: s.version,
        latencyMs: s.latencyMs,
        uptimePercent: s.uptimePercent,
        activeTenants: s.activeTenants,
        monthlyApiCalls: s.monthlyApiCalls,
        apiCallLimit: s.apiCallLimit,
      })),
      quotas: PLATFORM_QUOTAS,
      recentActivities: INITIAL_ACTIVITIES,
      systemTime: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data,
    });
  }
);
