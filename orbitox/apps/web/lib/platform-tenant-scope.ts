export interface PlatformTenantScope {
    organizationId: string;
    projectId: string;
    environmentId: string;
}

export function buildPlatformTenantScope(scope: PlatformTenantScope): string {
    const { organizationId, projectId, environmentId } = scope;
    if (!organizationId || !projectId || !environmentId) {
        throw new Error('Organization, project, and environment IDs are required for tenant scope.');
    }

    return `org/${encodeURIComponent(organizationId)}/project/${encodeURIComponent(projectId)}/environment/${encodeURIComponent(environmentId)}`;
}
