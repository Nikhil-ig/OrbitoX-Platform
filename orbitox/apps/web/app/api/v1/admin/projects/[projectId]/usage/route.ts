import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../../../_lib/api-guard';
import { platformRepository } from '@/lib/platform-repository';

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
            const project = projectId ? await platformRepository.getProject(projectId) : undefined;
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
            const updated = await platformRepository.setProjectUsage(project.id, monthlyApiCalls);
            await platformRepository.recordPlatformAdminAudit({
                action: `project.usage.${body.action}`,
                entityType: 'PLATFORM_PROJECT_USAGE',
                entityId: project.id,
                projectId: project.id,
                actorId: 'platform-admin',
                metadata: { previousValue, newValue: monthlyApiCalls },
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