import type { CustomerMembershipRole } from '@prisma/client';
import { prisma } from './prisma';

export const CUSTOMER_ROLE_ACTIONS = {
  inviteMember: ['OWNER', 'ADMIN'],
  removeMember: ['OWNER', 'ADMIN'],
  changeMemberRole: ['OWNER', 'ADMIN'],
  transferOwnership: ['OWNER'],
  createTenant: ['OWNER', 'ADMIN'],
  retryProvisioning: ['OWNER', 'ADMIN'],
  readBilling: ['OWNER', 'BILLING'],
  createCheckout: ['OWNER', 'BILLING'],
  confirmCheckout: ['OWNER', 'BILLING'],
  cancelBilling: ['OWNER'],
  changeBillingPlan: ['OWNER'],
  createApiKey: ['OWNER', 'ADMIN'],
  rotateApiKey: ['OWNER', 'ADMIN'],
  revokeApiKey: ['OWNER'],
  requestExport: ['OWNER'],
  downloadExport: ['OWNER'],
  requestDeletion: ['OWNER'],
  cancelDeletion: ['OWNER'],
  readDeletionCertificate: ['OWNER'],
  principalDataRights: ['OWNER', 'ADMIN'],
} as const satisfies Record<string, readonly CustomerMembershipRole[]>;

export type CustomerDashboardAction = keyof typeof CUSTOMER_ROLE_ACTIONS;

export function canCustomerDashboardAction(
  role: CustomerMembershipRole,
  action: CustomerDashboardAction,
): boolean {
  return (CUSTOMER_ROLE_ACTIONS[action] as readonly CustomerMembershipRole[]).includes(role);
}

export async function getCustomerOrganizationRole(
  organizationId: string,
  userId: string,
): Promise<CustomerMembershipRole | null> {
  const membership = await prisma.customerMembership.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    select: { role: true },
  });
  if (!membership) return null;
  if (membership.role !== 'OWNER') {
    const pendingDeletion = await prisma.organizationDeletionRequest.findFirst({
      where: {
        organizationId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
      select: { id: true },
    });
    if (pendingDeletion) return null;
  }
  return membership.role;
}

export function noStoreHeaders(): Record<string, string> {
  return { 'Cache-Control': 'no-store' };
}
