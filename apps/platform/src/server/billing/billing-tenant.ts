import type { Prisma } from '@prisma/client';

export interface BillingTenantScope {
  organizationId: string;
  projectId: string;
  environmentId: string;
}

export function parseBillingTenantScope(tenantId: string): BillingTenantScope | null {
  const match = /^org\/([^/]+)\/project\/([^/]+)\/environment\/([^/]+)$/.exec(tenantId);
  if (!match) return null;
  return {
    organizationId: match[1]!,
    projectId: match[2]!,
    environmentId: match[3]!,
  };
}

export async function tenantBelongsToOrganization(
  tx: Prisma.TransactionClient,
  tenantId: string,
  organizationId: string,
): Promise<BillingTenantScope | null> {
  const scope = parseBillingTenantScope(tenantId);
  if (!scope || scope.organizationId !== organizationId) return null;
  const tenant = await tx.platformProject.findFirst({
    where: {
      id: scope.projectId,
      organizationId,
      environments: { some: { id: scope.environmentId } },
    },
    select: { id: true },
  });
  return tenant ? scope : null;
}
