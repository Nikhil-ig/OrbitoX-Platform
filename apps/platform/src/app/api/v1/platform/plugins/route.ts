import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '@/app/api/v1/_lib/api-guard';
import { ApiResponse, ApiRequestContext } from '@/app/api/v1/_lib/api-types';
import { pluginRegistry } from '@/app/api/v1/_lib/control-plane-brain';

export const GET = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Platform Plugin Registry',
    routeClass: 'platform-admin',
    allowPublic: false,
    requiredScopes: ['platform.plugins', 'admin'],
  },
  async (_req: NextRequest, ctx: ApiRequestContext) => {
    const plugins = pluginRegistry.listInstalledPlugins();
    return NextResponse.json<ApiResponse>({
      success: true,
      data: plugins,
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
    serviceName: 'Platform Plugin Registry',
    routeClass: 'platform-admin',
    allowPublic: false,
    requiredScopes: ['platform.plugins.manage', 'admin'],
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
    try {
      const body = await req.json();
      const { action = 'register', manifest, pluginId, force = false } = body;

      if (action === 'register') {
        const registration = pluginRegistry.registerPluginManifest(manifest);
        return NextResponse.json<ApiResponse>({
          success: true,
          data: registration,
          meta: { latencyMs: 3, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        });
      }

      if (action === 'uninstall') {
        const result = pluginRegistry.uninstallPlugin(pluginId, force);
        return NextResponse.json<ApiResponse>({
          success: true,
          data: result,
          meta: { latencyMs: 4, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        });
      }

      if (action === 'detect-orphans') {
        const orphans = pluginRegistry.detectOrphans(pluginId);
        return NextResponse.json<ApiResponse>({
          success: true,
          data: orphans,
          meta: { latencyMs: 2, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        });
      }

      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: { code: 'INVALID_ACTION', message: 'Action must be "register", "uninstall", or "detect-orphans"' },
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        },
        { status: 400 }
      );
    } catch (err: any) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: { code: 'PLUGIN_REGISTRY_ERROR', message: err.message },
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        },
        { status: 400 }
      );
    }
  }
);
