import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '@/app/api/v1/_lib/api-guard';
import { AsyncPlatformRepository, platformRepository } from '@/lib/platform-repository';

type UsageRepository = Pick<AsyncPlatformRepository, 'getProject' | 'setProjectUsage' | 'recordPlatformAdminAudit'>;

export function createProjectUsageHandler(repository: UsageRepository = platformRepository) {
    return withApiGuard(
        {
            serviceId: 'admin',
            serviceName: 'Platform Administration OS',
            routeClass: 'platform-admin',
            requiredScopes: ['admin', 'write'],
        },
        async (req: NextRequest) => {
            let auditWriteInProgress = false;
            let usageWriteInProgress = false;
            try {
                const projectId = req.nextUrl.pathname.split('/').at(-2);
                const project = projectId ? await repository.getProject(projectId) : undefined;
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
                if (body.action === 'set' && (!Number.isSafeInteger(body.monthlyApiCalls) || body.monthlyApiCalls < 0)) {
                    return NextResponse.json(
                        { success: false, error: { code: 'INVALID_USAGE', message: 'monthlyApiCalls must be a non-negative safe integer.' } },
                        { status: 400 }
                    );
                }

                const monthlyApiCalls = body.action === 'reset' ? 0 : body.monthlyApiCalls;
                const previousValue = project.monthlyApiCalls || 0;
                auditWriteInProgress = true;
                await repository.recordPlatformAdminAudit({
                    action: `project.usage.${body.action}.requested`,
                    entityType: 'PLATFORM_PROJECT_USAGE',
                    entityId: project.id,
                    projectId: project.id,
                    actorId: 'platform-admin',
                    metadata: { previousValue, newValue: monthlyApiCalls, phase: 'requested' },
                });
                auditWriteInProgress = false;
                usageWriteInProgress = true;
                const updated = await repository.setProjectUsage(project.id, monthlyApiCalls);
                usageWriteInProgress = false;
                auditWriteInProgress = true;
                await repository.recordPlatformAdminAudit({
                    action: `project.usage.${body.action}`,
                    entityType: 'PLATFORM_PROJECT_USAGE',
                    entityId: project.id,
                    projectId: project.id,
                    actorId: 'platform-admin',
                    metadata: { previousValue, newValue: monthlyApiCalls },
                });
                auditWriteInProgress = false;
                PlatformApiState.recordTelemetry({
                    tenantId: project.slug,
                    facade: 'AuditFacade',
                    level: 'AUDIT',
                    message: `Admin ${body.action} project monthly API usage from ${project.monthlyApiCalls || 0} to ${monthlyApiCalls}.`,
                });

                return NextResponse.json({ success: true, data: updated });
            } catch (error: any) {
                if (auditWriteInProgress) {
                    console.error('Platform admin audit write failed for project usage change.', error);
                    return NextResponse.json(
                        { success: false, error: { code: 'AUDIT_UNAVAILABLE', message: 'The usage change could not be safely audited.' } },
                        { status: 503, headers: { 'Retry-After': '1' } }
                    );
                }
                if (usageWriteInProgress) {
                    console.error('Project usage write failed after recording audit intent.', error);
                    return NextResponse.json(
                        { success: false, error: { code: 'USAGE_UPDATE_UNAVAILABLE', message: 'The usage change could not be completed.' } },
                        { status: 503, headers: { 'Retry-After': '1' } }
                    );
                }
                return NextResponse.json(
                    { success: false, error: { code: 'BAD_REQUEST', message: error.message } },
                    { status: 400 }
                );
            }
        }
    );
}
