import 'server-only';
import type { Prisma } from '@prisma/client';

export interface BillingTenantScope {
  organizationId: string;
  projectId: string;
  environmentId: string;
  canonicalTenantId: string;
}

export function parseBillingTenantScope(tenantId: string, fallbackOrgId?: string): BillingTenantScope | null {
  const match = /^org\/([^/]+)\/project\/([^/]+)\/environment\/([^/]+)$/.exec(tenantId);
  if (match) {
    return {
      organizationId: match[1]!,
      projectId: match[2]!,
      environmentId: match[3]!,
      canonicalTenantId: tenantId,
    };
  }
  if (fallbackOrgId && tenantId.trim()) {
    const clean = tenantId.replace(/^tenant_/, '').trim();
    return {
      organizationId: fallbackOrgId,
      projectId: clean,
      environmentId: 'production',
      canonicalTenantId: `org/${fallbackOrgId}/project/${clean}/environment/production`,
    };
  }
  return null;
}

export async function tenantBelongsToOrganization(
  tx: Prisma.TransactionClient,
  tenantId: string,
  organizationId: string,
): Promise<BillingTenantScope | null> {
  const scope = parseBillingTenantScope(tenantId, organizationId);
  if (!scope || (scope.organizationId && scope.organizationId !== organizationId)) return null;

  // Resolve project by id, slug, or sanitized slug under this organization
  const project = await tx.platformProject.findFirst({
    where: {
      organizationId,
      OR: [
        { id: scope.projectId },
        { slug: scope.projectId },
        { slug: scope.projectId.replace(/^tenant_/, '') },
      ],
    },
    include: { environments: true },
  });

  if (!project) return null;

  // Resolve environment by id or slug, falling back to production
  const env =
    project.environments.find(
      (e) =>
        e.id === scope.environmentId ||
        e.slug === scope.environmentId ||
        (scope.environmentId === 'production' && e.isProduction),
    ) ||
    project.environments.find((e) => e.isProduction) ||
    project.environments[0];

  if (!env) return null;

  const canonicalTenantId = `org/${organizationId}/project/${project.id}/environment/${env.id}`;

  return {
    organizationId,
    projectId: project.id,
    environmentId: env.id,
    canonicalTenantId,
  };
}
