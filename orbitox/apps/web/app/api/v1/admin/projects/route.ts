import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { withApiGuard, PlatformApiState, PlatformKeyEngine } from '../../_lib/api-guard';
import { ClientProject, PLAN_TIER_PRESETS } from '@/app/admin/data/mock-data';

export const GET = withApiGuard(
  {
    serviceId: 'admin',
    serviceName: 'Platform Administration OS',
    requiredScopes: ['admin'],
  },
  async (req: NextRequest) => {
    const url = req.nextUrl;
    const modelFilter = url.searchParams.get('model');
    const statusFilter = url.searchParams.get('status');

    let projects = PlatformApiState.getProjects();

    if (modelFilter && modelFilter !== 'all') {
      projects = projects.filter((p) => p.businessModel === modelFilter);
    }

    if (statusFilter && statusFilter !== 'all') {
      projects = projects.filter((p) => p.status === statusFilter);
    }

    // Compute aggregated platform stats
    const totalCalls = projects.reduce((sum, p) => sum + (p.monthlyApiCalls || 0), 0);
    const totalQuota = projects.reduce((sum, p) => sum + (p.apiCallQuota || 0), 0);
    const activeProjects = projects.filter((p) => (p.status || '').toLowerCase() === 'active').length;
    const o2oProjects = projects.filter((p) => p.businessModel === 'O2O2B2B2C').length;

    return NextResponse.json({
      success: true,
      data: projects,
      meta: {
        total: projects.length,
        activeProjects,
        o2oProjects,
        totalCallsConsumed: totalCalls,
        totalAllocatedQuota: totalQuota,
        utilizationPercent: totalQuota > 0 ? Math.round((totalCalls / totalQuota) * 100) : 0,
      },
    });
  }
);

export const POST = withApiGuard(
  {
    serviceId: 'admin',
    serviceName: 'Platform Administration OS',
    requiredScopes: ['admin'],
  },
  async (req: NextRequest) => {
    try {
      const body = await req.json();
      const {
        name,
        organization,
        businessModel = 'O2O2B2B2C',
        plan = 'growth',
        customDomain,
        enabledServices = ['commerce', 'crm'],
        contactEmail,
        technicalLead,
        customQuota,
        customRateLimit,
        customStorage,
      } = body;

      if (!name) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_INPUT', message: 'Field "name" is required.' } },
          { status: 400 }
        );
      }

      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      const preset = PLAN_TIER_PRESETS[plan] || PLAN_TIER_PRESETS.growth!;
      const projectId = `proj-${slug || Date.now()}`;

      const modelLabels: Record<string, string> = {
        O2O2B2B2C: 'O2O2B2B2C (Kitchen-to-Merchant-to-Consumer)',
        B2B2C: 'B2B2C Multi-Vendor Platform',
        B2B_SaaS: 'Enterprise B2B SaaS',
        D2C: 'Omnichannel D2C & Luxury Commerce',
        HEALTHCARE_NETWORK: 'B2B Enterprise Healthcare Network',
        FRANCHISE_RETAIL: 'Franchise POS & Retail Matrix',
      };

      const newProject: ClientProject = {
        id: projectId,
        name,
        slug,
        organization: organization || name,
        businessModel: businessModel as any,
        businessModelLabel: modelLabels[businessModel] || businessModel,
        description: body.description || `High-scale multi-tenant enterprise project powered by OrbitoX.`,
        plan,
        planLabel: preset.name,
        status: 'active',
        customDomain: customDomain || `${slug}.orbitox.io`,
        primaryApiKeyId: '',
        primaryApiKeyPrefix: '',
        enabledServices,
        monthlyApiCalls: 0,
        apiCallQuota: customQuota || preset.defaultCallQuota,
        rateLimitPerMin: customRateLimit || preset.defaultRateLimitPerMin,
        storageUsedGb: 0,
        storageQuotaGb: customStorage || preset.defaultStorageQuotaGb,
        features: preset.highlightFeatures,
        contactEmail: contactEmail || `dev@${slug}.com`,
        technicalLead: technicalLead || 'Lead Systems Architect',
        createdAt: new Date().toISOString().slice(0, 10),
        lastActiveAt: 'Just now',
        recentLatencyMs: 12,
      };

      const createdProject = PlatformApiState.addProject(newProject);
      const actualProjectId = createdProject?.id || projectId;

      // Generate initial API key for project
      const randomHex = crypto.randomBytes(12).toString('hex');
      const keyPrefix = `orb_live_${slug.slice(0, 8)}_`;
      const fullKey = `${keyPrefix}${randomHex}`;
      const keyId = `key-${crypto.randomUUID()}`;

      newProject.id = actualProjectId;
      newProject.primaryApiKeyId = keyId;
      newProject.primaryApiKeyPrefix = keyPrefix;

      const newKey: any = {
        id: keyId,
        projectId: actualProjectId,
        name: `${name} Primary Live Key`,
        keyPrefix,
        maskedKey: `${keyPrefix}${randomHex.slice(0, 4)}********************${randomHex.slice(-4)}`,
        rawKey: fullKey,
        authVerifier: PlatformKeyEngine.computeAuthVerifier(fullKey),
        serviceId: 'all',
        serviceName: 'All Subscribed Packages',
        providerId: actualProjectId,
        providerName: name,
        environment: 'production',
        scopes: ['*'],
        tenantScope: [slug],
        createdAt: new Date().toISOString().slice(0, 10),
        lastUsedAt: 'Never',
        status: 'active',
        rateLimitPerMin: customRateLimit || preset.defaultRateLimitPerMin,
        requestsLast30Days: 0,
      };

      PlatformApiState.addApiKey(newKey);

      PlatformApiState.recordTelemetry({
        tenantId: slug,
        facade: 'AuditFacade',
        level: 'AUDIT',
        message: `Provisioned new client project [${name}] (Model: ${businessModel}, Plan: ${preset.name}, Quota: ${(newProject.apiCallQuota / 1000000).toFixed(1)}M calls)`,
      });

      // Assemble 1-line integration bootstrapper code snippet
      const pluginImports = enabledServices
        .map((s: string) => `import ${s} from '@orbitox-io/${s}';`)
        .join('\n');
      const pluginArray = enabledServices.join(', ');

      const quickstartCode = `// 1-Line Client Bootstrapper (No Need to Write Backend Code From Scratch!)
import { createOrbitoX } from '@orbitox-io/plugin-engine';
${pluginImports}

const app = await createOrbitoX({
  license: '${fullKey}',
  domain: '${newProject.customDomain}',
  plugins: [${pluginArray}],
});

// Your ${businessModel} services are immediately mounted & ready:
console.log('OrbitoX OS Active with plugins:', Object.keys(app.plugins));`;

      return NextResponse.json(
        {
          success: true,
          data: {
            project: newProject,
            apiKey: {
              id: keyId,
              rawKey: fullKey,
              maskedKey: newKey.maskedKey,
              rateLimitPerMin: newKey.rateLimitPerMin,
            },
            onboardingKit: {
              bootstrapperCode: quickstartCode,
              curlExample: `curl -H "x-api-key: ${fullKey}" -H "x-tenant-id: ${slug}" "http://localhost:3005/api/v1/${enabledServices[0] || 'commerce'}/products"`,
              restEndpointBase: `http://localhost:3005/api/v1`,
            },
          },
          message: `Project [${name}] successfully provisioned with ${enabledServices.length} pre-built plugin packages.`,
        },
        { status: 201 }
      );
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: err.message } },
        { status: 400 }
      );
    }
  }
);
