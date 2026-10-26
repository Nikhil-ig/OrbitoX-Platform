import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState, PlatformRepository } from '../../../../_lib/api-guard';

export const POST = withApiGuard(
  {
    serviceId: 'admin',
    serviceName: 'Platform Administration OS',
    routeClass: 'platform-admin',
    requiredScopes: ['admin', 'write'],
  },
  async (req: NextRequest) => {
    try {
      const projectId = req.nextUrl.pathname.split('/').at(-2);
      const project = projectId ? PlatformRepository.getProject(projectId) : undefined;
      if (!project) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Project not found.' } },
          { status: 404 }
        );
      }

      const body = await req.json();
      if (body.action !== 'reset' && body.action !== 'set') {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_ACTION', message: 'action must be "reset" or "set".' } },
          { status: 400 }
        );
      }
      if (body.action === 'set' && !Number.isSafeInteger(body.monthlyApiCalls)) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_USAGE', message: 'monthlyApiCalls must be a non-negative safe integer.' } },
          { status: 400 }
        );
      }

      const monthlyApiCalls = body.action === 'reset' ? 0 : body.monthlyApiCalls;
      const previousValue = project.monthlyApiCalls || 0;
      const updated = PlatformRepository.setProjectUsage(project.id, monthlyApiCalls);
      PlatformRepository.recordAuditEvent({
        action: `project.usage.${body.action}`,
        actor: 'platform-admin',
        projectId: project.id,
        tenantId: project.slug,
        previousValue,
        newValue: monthlyApiCalls,
      });
      PlatformApiState.recordTelemetry({
        tenantId: project.slug,
        facade: 'AuditFacade',
        level: 'AUDIT',
        message: `Admin ${body.action} project monthly API usage from ${project.monthlyApiCalls || 0} to ${monthlyApiCalls}.`,
      });

      return NextResponse.json({ success: true, data: updated });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: error.message } },
        { status: 400 }
      );
    }
  }
);