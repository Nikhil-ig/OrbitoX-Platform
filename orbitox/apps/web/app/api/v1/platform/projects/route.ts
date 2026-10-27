import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '@/app/api/v1/_lib/api-guard';
import { ApiResponse, ApiRequestContext } from '@/app/api/v1/_lib/api-types';
import { auditService } from '@/app/api/v1/_lib/platform-governance';
import { platformRepository } from '@/lib/platform-repository';

export const GET = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Platform Projects Service',
    routeClass: 'platform-admin',
    requiredScopes: ['platform.projects.read', 'admin'],
  },
  async (req: NextRequest) => {
    const projects = await platformRepository.listProjects();

    const enriched = await Promise.all(projects.map(async (project) => {
      const [environments, keys, credentials] = await Promise.all([
        platformRepository.listEnvironments(project.id),
        platformRepository.listApiKeys({ projectId: project.id }),
        platformRepository.listCredentials({ projectId: project.id }),
      ]);
      
      let domainsCount = 0;
      let totalCallsUsed = 0;
      let totalCallLimit = 0;

      for (const env of environments) {
        const domains = await platformRepository.listDomains(env.id);
        domainsCount += domains.length;

        const quota = await platformRepository.getQuotaPolicy(env.id);
        if (quota) {
          totalCallsUsed += quota.monthlyCallsUsed;
          totalCallLimit += quota.monthlyCallLimit;
        }
      }

      return {
        ...project,
        environments,
        stats: {
          environmentsCount: environments.length,
          activeKeysCount: keys.filter((k) => k.status === 'ACTIVE').length,
          credentialsCount: credentials.length,
          domainsCount,
          monthlyCallsUsed: totalCallsUsed,
          monthlyCallLimit: totalCallLimit || 10000000,
        },
      };
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: enriched,
      meta: {
        latencyMs: 1,
        timestamp: new Date().toISOString(),
        requestId: `req_proj_${Date.now()}`,
      },
    });
  }
);

export const POST = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Platform Projects Service',
    requiredScopes: ['platform.projects.create', 'admin'],
    allowPublic: false,
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
    try {
      const body = await req.json();
      const { name, slug, organizationId, businessModel, planTier, technicalLead, contactEmail } = body;

      if (!name) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: { code: 'INVALID_INPUT', message: 'Project name is required' },
            meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
          },
          { status: 400 }
        );
      }

      const orgs = await platformRepository.listOrganizations();
      const targetOrgId = organizationId || (orgs[0]?.id || 'org_default');

      const result = await platformRepository.createProject({
        name,
        slug,
        organizationId: targetOrgId,
        businessModel: businessModel || 'O2O2B2B2C',
        planTier: planTier || 'growth',
        technicalLead: technicalLead || 'Platform SuperAdmin',
        contactEmail: contactEmail || 'devops@orbitox.io',
      });
      await platformRepository.recordPlatformAdminAudit({
        action: 'PROJECT_CREATED',
        entityType: 'PLATFORM_PROJECT',
        entityId: result.project.id,
        organizationId: targetOrgId,
        projectId: result.project.id,
        actorId: ctx.apiKey || 'platform_admin',
        reason: `Provisioned project ${name}`,
        metadata: { environments: result.environments.map((environment) => environment.slug) },
      });

      // Commit to immutable audit ledger
      await auditService.log({
        action: 'PROJECT_CREATED',
        entityType: 'PLATFORM_PROJECT',
        entityId: result.project.id,
        userId: ctx.apiKey || 'platform_admin',
        userEmail: contactEmail || 'operator@orbitox.io',
        userName: technicalLead || 'SuperAdmin',
        contextId: ctx.tenantId || 'global',
        reason: `Provisioned project [${name}] with 3 standard environments`,
        newValue: {
          project: result.project,
          environments: result.environments.map((e) => e.slug),
        },
      });

      return NextResponse.json<ApiResponse>({
        success: true,
        data: result,
        meta: {
          latencyMs: 1,
          timestamp: new Date().toISOString(),
          requestId: ctx.requestId,
        },
      });
    } catch (err: any) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: { code: 'PROJECT_CREATION_FAILED', message: err.message },
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        },
        { status: 500 }
      );
    }
  }
);
