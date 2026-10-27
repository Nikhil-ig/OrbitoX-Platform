import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../../_lib/api-guard';
import { PLAN_TIER_PRESETS } from '@/app/admin/data/mock-data';
import { platformRepository } from '@/lib/platform-repository';

export const GET = withApiGuard(
  {
    serviceId: 'admin',
    serviceName: 'Platform Administration OS',
    requiredScopes: ['admin'],
  },
  async (req: NextRequest, ctx) => {
    const pathname = req.nextUrl.pathname;
    const parts = pathname.split('/');
    const projectId = parts[parts.length - 1];

    const project = await platformRepository.getProject(projectId!);
    if (!project) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: `Project ${projectId} not found.` } },
        { status: 404 }
      );
    }

    // Also fetch associated API keys
    const keys = await platformRepository.listApiKeys({ projectId: project.id });

    return NextResponse.json({
      success: true,
      data: {
        ...project,
        keys,
      },
    });
  }
);

export const PATCH = withApiGuard(
  {
    serviceId: 'admin',
    serviceName: 'Platform Administration OS',
    requiredScopes: ['admin'],
  },
  async (req: NextRequest) => {
    try {
      const pathname = req.nextUrl.pathname;
      const parts = pathname.split('/');
      const projectId = parts[parts.length - 1];

      const project = await platformRepository.getProject(projectId!);
      if (!project) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: `Project ${projectId} not found.` } },
          { status: 404 }
        );
      }

      const body = await req.json();
      const editableFields = new Set([
        'plan',
        'apiCallQuota',
        'rateLimitPerMin',
        'storageQuotaGb',
        'enabledServices',
        'status',
        'customDomain',
      ]);
      const unsupportedFields = Object.keys(body).filter((field) => !editableFields.has(field));
      if (unsupportedFields.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'UNSUPPORTED_FIELDS',
              message: `Project fields cannot be updated here: ${unsupportedFields.join(', ')}. Use the dedicated usage action to change monthly usage.`,
              details: { fields: unsupportedFields },
            },
          },
          { status: 400 }
        );
      }

      const updates: any = {};

      if (body.plan && !PLAN_TIER_PRESETS[body.plan]) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_PLAN', message: `Unknown plan: ${body.plan}.` } },
          { status: 400 }
        );
      }
      if (body.plan && PLAN_TIER_PRESETS[body.plan]) {
        updates.plan = body.plan;
        updates.planLabel = PLAN_TIER_PRESETS[body.plan]!.name;
      }
      if (typeof body.apiCallQuota === 'number') updates.apiCallQuota = body.apiCallQuota;
      if (typeof body.rateLimitPerMin === 'number') updates.rateLimitPerMin = body.rateLimitPerMin;
      if (typeof body.storageQuotaGb === 'number') updates.storageQuotaGb = body.storageQuotaGb;
      if (Array.isArray(body.enabledServices)) updates.enabledServices = body.enabledServices;
      if (body.status && ['active', 'throttled', 'suspended'].includes(body.status)) {
        updates.status = body.status;
      }
      if (body.customDomain !== undefined) updates.customDomain = body.customDomain;

      if (Object.keys(updates).length === 0) {
        return NextResponse.json(
          { success: false, error: { code: 'EMPTY_UPDATE', message: 'At least one supported project field is required.' } },
          { status: 400 }
        );
      }

      const updated = await platformRepository.updateProject(project.id, updates);
      await platformRepository.recordPlatformAdminAudit({
        action: 'PROJECT_UPDATED',
        entityType: 'PLATFORM_PROJECT',
        entityId: project.id,
        organizationId: project.organizationId,
        projectId: project.id,
        actorId: 'platform-admin',
        reason: `Updated project configuration: ${Object.keys(updates).join(', ')}`,
        metadata: updates,
      });

      PlatformApiState.recordTelemetry({
        tenantId: project.slug,
        facade: 'AuditFacade',
        level: 'AUDIT',
        message: `Updated project [${project.name}] configuration: ${Object.keys(updates).join(', ')}`,
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: `Project [${project.name}] updated successfully.`,
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: err.message } },
        { status: 400 }
      );
    }
  }
);

export const DELETE = withApiGuard(
  {
    serviceId: 'admin',
    serviceName: 'Platform Administration OS',
    requiredScopes: ['admin'],
  },
  async (req: NextRequest) => {
    const pathname = req.nextUrl.pathname;
    const parts = pathname.split('/');
    const projectId = parts[parts.length - 1];

    const project = await platformRepository.getProject(projectId!);
    if (!project) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: `Project ${projectId} not found.` } },
        { status: 404 }
      );
    }

    await platformRepository.deleteProject(project.id);
    await platformRepository.recordPlatformAdminAudit({
      action: 'PROJECT_DELETED',
      entityType: 'PLATFORM_PROJECT',
      entityId: project.id,
      organizationId: project.organizationId,
      projectId: project.id,
      actorId: 'platform-admin',
      reason: `Deprovisioned project ${project.name}`,
    });

    PlatformApiState.recordTelemetry({
      tenantId: project.slug,
      facade: 'AuditFacade',
      level: 'SECURITY',
      message: `Deprovisioned project [${project.name}] and revoked gateway routing.`,
    });

    return NextResponse.json({
      success: true,
      message: `Project [${project.name}] has been successfully deprovisioned.`,
    });
  }
);
