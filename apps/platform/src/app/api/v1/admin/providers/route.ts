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
    const search = searchParams.get('search')?.toLowerCase();

    const all = PlatformApiState.getProviders() as Record<string, any[]>;

    if (category) {
      let list = all[category] || [];
      if (status) list = list.filter((p: any) => p.status === status);
      if (search) list = list.filter((p: any) => p.name.toLowerCase().includes(search) || p.id.toLowerCase().includes(search));
      return NextResponse.json({
        success: true,
        data: list,
        meta: { category, total: list.length },
      });
    }

    let flatList = Object.entries(all).flatMap(([cat, items]: any) =>
      items.map((it: any) => ({ ...it, category: cat }))
    );

    if (status) flatList = flatList.filter((p: any) => p.status === status);
    if (search) flatList = flatList.filter((p: any) => p.name.toLowerCase().includes(search) || p.id.toLowerCase().includes(search));

    return NextResponse.json({
      success: true,
      data: flatList,
      meta: { total: flatList.length },
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
      const { category, name, id, customDomain, tier, monthlyApiCallsLimit, monthlyApiCalls } = body;

      if (!category || !name) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_INPUT', message: 'Both "category" and "name" are required.' } },
          { status: 400 }
        );
      }

      const providerId = id || name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      const newProvider = {
        id: providerId,
        name,
        category,
        customDomain: customDomain || `${providerId}.orbito.io`,
        customDomainStatus: 'verified',
        tier: tier || 'growth',
        status: 'active',
        monthlyApiCalls: monthlyApiCalls || 0,
        monthlyApiCallsLimit: monthlyApiCallsLimit || 5000000,
        storageMb: 12000,
        storageLimitMb: 100000,
        uptimePercent: 99.99,
        lastActive: 'Just now',
        description: body.description || `Provisioned ${name} tenant on OrbitoX.`,
      };

      PlatformApiState.addProvider(category, newProvider);

      PlatformApiState.recordTelemetry({
        tenantId: providerId,
        categorySlug: category,
        facade: 'ContextFacade',
        level: 'AUDIT',
        message: `Tenant [${name}] provisioned under category [${category}] with domain [${newProvider.customDomain}].`,
      });

      return NextResponse.json({
        success: true,
        data: newProvider,
        message: `Tenant ${name} provisioned successfully.`,
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: err.message } },
        { status: 400 }
      );
    }
  }
);
