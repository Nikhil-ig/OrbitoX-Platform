import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../_lib/api-guard';
import { ClientProject, PLAN_TIER_PRESETS } from '@/app/admin/data/mock-data';
import { platformRepository } from '@/lib/platform-repository';

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

    let projects = await platformRepository.listProjects();

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
        slug: requestedSlug,
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

      const preset = PLAN_TIER_PRESETS[plan] || PLAN_TIER_PRESETS.growth!;
      const organizationName = organization || name;
      const organizationSlug = organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || `org-${Date.now()}`;
      const existingOrganization = (await platformRepository.listOrganizations()).find(
        (item) => item.name.toLowerCase() === organizationName.toLowerCase()
      );
      const organizationRecord = existingOrganization || await platformRepository.createOrganization({
        name: organizationName,
        slug: `${organizationSlug}-${Date.now().toString(36)}`,
        billingEmail: contactEmail || `dev@${organizationSlug}.com`,
      });
      if (!existingOrganization) {
        await platformRepository.recordPlatformAdminAudit({
          action: 'ORGANIZATION_CREATED',
          entityType: 'PLATFORM_ORGANIZATION',
          entityId: organizationRecord.id,
          organizationId: organizationRecord.id,
          actorId: 'platform-admin',
          reason: `Created organization ${organizationName} during project provisioning`,
          metadata: { slug: organizationRecord.slug },
        });
      }
      const projectResult = await platformRepository.createProject({
        name,
        ...(typeof requestedSlug === 'string' ? { slug: requestedSlug } : {}),
        organizationId: organizationRecord.id,
        businessModel,
        planTier: plan,
        plan,
        technicalLead: technicalLead || 'Lead Systems Architect',
        contactEmail: contactEmail || `dev@${organizationSlug}.com`,
        enabledServices,
        apiCallQuota: customQuota || preset.defaultCallQuota,
        rateLimitPerMin: customRateLimit || preset.defaultRateLimitPerMin,
      });
      const createdProject = projectResult.project;
      const slug = createdProject.slug;
      const projectId = createdProject.id;

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

      const productionEnvironment = projectResult.environments.find((environment) => environment.isProduction)!;
      const { keyRecord, rawSecret: fullKey } = await platformRepository.createApiKey({
        name: `${name} Primary Live Key`,
        environmentId: productionEnvironment.id,
        projectId,
        capabilities: ['*'],
        tenantScope: [slug],
        rateLimitPerMin: customRateLimit || preset.defaultRateLimitPerMin,
        createdBy: 'platform-admin',
      });
      await platformRepository.recordPlatformAdminAudit({
        action: 'PROJECT_CREATED',
        entityType: 'PLATFORM_PROJECT',
        entityId: projectId,
        organizationId: organizationRecord.id,
        projectId,
        environmentId: productionEnvironment.id,
        actorId: 'platform-admin',
        reason: `Provisioned project ${name}`,
        metadata: { enabledServices, plan },
      });
      const keyId = keyRecord.id;
      const keyPrefix = keyRecord.keyPrefix;

      newProject.id = projectId;
      newProject.primaryApiKeyId = keyId;
      newProject.primaryApiKeyPrefix = keyPrefix;

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
              maskedKey: keyRecord.maskedDisplay,
              rateLimitPerMin: keyRecord.rateLimitPerMin,
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
