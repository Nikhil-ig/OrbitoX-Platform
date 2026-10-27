import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '@/app/api/v1/_lib/api-guard';
import { ApiResponse, ApiRequestContext } from '@/app/api/v1/_lib/api-types';
import { auditService } from '@/app/api/v1/_lib/platform-governance';
import { platformRepository } from '@/lib/platform-repository';

export const GET = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Platform Packages Service',
    routeClass: 'platform-admin',
    allowPublic: false,
    requiredScopes: ['admin', 'platform.packages'],
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
    const url = new URL(req.url);
    const category = url.searchParams.get('category') || undefined;

    let packages = await platformRepository.listPackages();
    if (category) {
      packages = packages.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }

    const enriched = await Promise.all(packages.map(async (pkg) => {
      const [versions, installations] = await Promise.all([
        platformRepository.listPackageVersions(pkg.packageId),
        platformRepository.listInstallations(),
      ]);
      const packageInstallations = installations.filter((i) => i.packageId === pkg.packageId || i.packageId === pkg.id);

      return {
        ...pkg,
        versions,
        installationsCount: packageInstallations.length,
        hasEd25519Signature: Boolean(pkg.signingPublicKeyPem),
        integrityStatus: 'VERIFIED',
      };
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: enriched,
      meta: {
        latencyMs: 1,
        timestamp: new Date().toISOString(),
        requestId: ctx.requestId,
      },
    });
  }
);

export const POST = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Platform Packages Service',
    requiredScopes: ['platform.packages.install', 'admin'],
    allowPublic: false,
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
    try {
      const body = await req.json();
      const { environmentId, packageId, versionId, configOverrides } = body;

      if (!environmentId || !packageId || !versionId) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: 'environmentId, packageId, and versionId are required',
            },
            meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
          },
          { status: 400 }
        );
      }

      const installation = await platformRepository.installPackage(
        environmentId,
        packageId,
        versionId,
        configOverrides || {}
      );

      await auditService.log({
        action: 'PACKAGE_INSTALLED',
        entityType: 'PACKAGE_INSTALLATION',
        entityId: installation.id,
        userId: ctx.apiKey || 'platform_admin',
        contextId: ctx.tenantId || 'global',
        reason: `Installed verified package [${packageId}] version [${versionId}] into environment [${environmentId}]`,
        newValue: {
          environmentId,
          packageId,
          versionId,
        },
      });
      await platformRepository.recordPlatformAdminAudit({
        action: 'PACKAGE_INSTALLED',
        entityType: 'PACKAGE_INSTALLATION',
        entityId: installation.id,
        environmentId,
        actorId: ctx.apiKey || 'platform_admin',
        reason: `Installed ${packageId} ${versionId}`,
        metadata: { environmentId, packageId, versionId },
      });

      return NextResponse.json<ApiResponse>({
        success: true,
        data: installation,
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
          error: { code: 'INSTALL_FAILED', message: err.message },
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        },
        { status: 500 }
      );
    }
  }
);
