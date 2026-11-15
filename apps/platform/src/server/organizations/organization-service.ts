import 'server-only';
import { prisma } from '@/server/db/prisma';
import { platformRepository } from '@/server/db/platform-repository';

export interface OperatorContext {
  id: string;
  email: string;
  role: string;
  reauthenticatedAt?: Date | string | null;
}

const REAUTH_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function assertFreshReauth(operator?: OperatorContext | null): void {
  if (!operator?.reauthenticatedAt) {
    throw new Error('STEP_UP_REAUTH_REQUIRED: Operator must re-authenticate with credentials/TOTP before performing this dangerous operation.');
  }
  const time =
    operator.reauthenticatedAt instanceof Date
      ? operator.reauthenticatedAt.getTime()
      : new Date(operator.reauthenticatedAt).getTime();
  const age = Date.now() - time;
  if (isNaN(time) || age > REAUTH_WINDOW_MS) {
    throw new Error('STEP_UP_REAUTH_EXPIRED: Step-up re-authentication expired (exceeded 5-minute validity window).');
  }
}

function assertValidReason(reason?: string | null): void {
  const trimmed = reason ? reason.trim() : '';
  if (trimmed.length < 5) {
    throw new Error('REASON_TOO_SHORT: Operator justification must be at least 5 characters long.');
  }
}

export interface OrganizationSummary {
  totalCount: number;
  activeCount: number;
  suspendedCount: number;
  enterpriseCount: number;
  growthCount: number;
  starterCount: number;
  totalTenantsCount: number;
}

export interface OrganizationTenantSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
  planTier: string;
  enabledServices: string[];
  customDomain?: string | null;
}

export interface OrganizationMemberItem {
  id: string;
  email: string;
  name: string;
  role: string;
  mfaEnabled: boolean;
  status: string;
  lastActiveFormatted: string;
}

export interface OrganizationItem {
  id: string;
  slug: string;
  name: string;
  billingEmail: string;
  complianceTier: string;
  status: string;
  planTier: string;
  tenantsCount: number;
  membersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationDetail extends OrganizationItem {
  tenants: OrganizationTenantSummary[];
  members: OrganizationMemberItem[];
  monthlyRevenueEstimate: number;
  nextChargeDateFormatted: string;
  paymentMethod: string;
  lastPaymentFormatted: string;
  gstin?: string;
  ownerName?: string;
  location?: string;
}

function computePlanTier(projects: any[], complianceTier?: string): string {
  if (projects.some((p) => String(p.planTier).toLowerCase() === 'enterprise') || complianceTier === 'HIPAA') {
    return 'Enterprise';
  }
  if (projects.some((p) => String(p.planTier).toLowerCase() === 'growth' || String(p.planTier).toLowerCase() === 'pro')) {
    return 'Growth';
  }
  return 'Starter';
}

function computeMonthlyRevenue(planTier: string, tenantCount: number): number {
  const baseRate = planTier === 'Enterprise' ? 19999 : planTier === 'Growth' ? 7497 : 2499;
  return baseRate * Math.max(1, tenantCount);
}

export class OrganizationService {
  async getSummary(): Promise<OrganizationSummary> {
    const isJsonMode = process.env.ORBITOX_PLATFORM_REPOSITORY === 'json';

    let orgs: any[] = [];
    let projects: any[] = [];

    if (!isJsonMode) {
      try {
        [orgs, projects] = await Promise.all([
          (prisma as any).platformOrganization.findMany({ select: { id: true, status: true, complianceTier: true } }),
          (prisma as any).platformProject.findMany({ select: { id: true, organizationId: true, planTier: true } }),
        ]);
      } catch (err: any) {
        throw new Error(`DATABASE_ERROR: Failed to query organizations summary from PostgreSQL: ${err.message}`);
      }
    } else {
      orgs = await platformRepository.listOrganizations();
      projects = await platformRepository.listProjects();
    }

    const orgProjectsMap = new Map<string, any[]>();
    for (const p of projects) {
      if (!p.organizationId) continue;
      const list = orgProjectsMap.get(p.organizationId) || [];
      list.push(p);
      orgProjectsMap.set(p.organizationId, list);
    }

    let activeCount = 0;
    let suspendedCount = 0;
    let enterpriseCount = 0;
    let growthCount = 0;
    let starterCount = 0;

    for (const o of orgs) {
      if (o.status === 'ACTIVE') activeCount++;
      else suspendedCount++;

      const pList = orgProjectsMap.get(o.id) || [];
      const tier = computePlanTier(pList, o.complianceTier);
      if (tier === 'Enterprise') enterpriseCount++;
      else if (tier === 'Growth') growthCount++;
      else starterCount++;
    }

    return {
      totalCount: orgs.length,
      activeCount,
      suspendedCount,
      enterpriseCount,
      growthCount,
      starterCount,
      totalTenantsCount: projects.length,
    };
  }

  async listOrganizations(options?: {
    status?: string;
    tier?: string;
    query?: string;
  }): Promise<OrganizationItem[]> {
    const isJsonMode = process.env.ORBITOX_PLATFORM_REPOSITORY === 'json';

    let orgs: any[] = [];
    let projects: any[] = [];
    let memberships: any[] = [];

    if (!isJsonMode) {
      try {
        [orgs, projects, memberships] = await Promise.all([
          (prisma as any).platformOrganization.findMany({ orderBy: { createdAt: 'desc' } }),
          (prisma as any).platformProject.findMany({ select: { id: true, organizationId: true, planTier: true } }),
          (prisma as any).customerMembership.findMany({ select: { organizationId: true } }),
        ]);
      } catch (err: any) {
        throw new Error(`DATABASE_ERROR: Failed to list organizations from PostgreSQL: ${err.message}`);
      }
    } else {
      orgs = await platformRepository.listOrganizations();
      projects = await platformRepository.listProjects();
    }

    const orgProjectsMap = new Map<string, any[]>();
    for (const p of projects) {
      if (!p.organizationId) continue;
      const list = orgProjectsMap.get(p.organizationId) || [];
      list.push(p);
      orgProjectsMap.set(p.organizationId, list);
    }

    const orgMembersMap = new Map<string, number>();
    for (const m of memberships) {
      if (!m.organizationId) continue;
      orgMembersMap.set(m.organizationId, (orgMembersMap.get(m.organizationId) || 0) + 1);
    }

    let items: OrganizationItem[] = orgs.map((o) => {
      const pList = orgProjectsMap.get(o.id) || [];
      const planTier = computePlanTier(pList, o.complianceTier);
      const membersCount = orgMembersMap.get(o.id) || 1;

      return {
        id: o.id,
        slug: o.slug,
        name: o.name,
        billingEmail: o.billingEmail || '',
        complianceTier: o.complianceTier || 'STANDARD',
        status: o.status || 'ACTIVE',
        planTier,
        tenantsCount: pList.length,
        membersCount,
        createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : String(o.createdAt),
        updatedAt: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : String(o.updatedAt),
      };
    });

    // Filtering
    if (options?.status && options.status !== 'ALL') {
      items = items.filter((i) => i.status.toUpperCase() === options.status?.toUpperCase());
    }

    if (options?.tier && options.tier !== 'ALL') {
      items = items.filter((i) => i.planTier.toUpperCase() === options.tier?.toUpperCase());
    }

    if (options?.query) {
      const q = options.query.toLowerCase().trim();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.slug.toLowerCase().includes(q) ||
          i.billingEmail.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q)
      );
    }

    return items;
  }

  async getOrganization(idOrSlugOrName: string): Promise<OrganizationDetail | null> {
    const isJsonMode = process.env.ORBITOX_PLATFORM_REPOSITORY === 'json';
    const decoded = decodeURIComponent(idOrSlugOrName).trim();

    let org: any = null;
    let projects: any[] = [];
    let memberships: any[] = [];

    if (!isJsonMode) {
      try {
        org = await (prisma as any).platformOrganization.findFirst({
          where: {
            OR: [
              { id: decoded },
              { slug: decoded },
              { name: { equals: decoded, mode: 'insensitive' } },
              { slug: { equals: decoded.toLowerCase().replace(/[^a-z0-9-]/g, '-') } },
            ],
          },
        });

        if (!org) return null;

        [projects, memberships] = await Promise.all([
          (prisma as any).platformProject.findMany({
            where: { organizationId: org.id },
            orderBy: { createdAt: 'desc' },
          }),
          (prisma as any).customerMembership.findMany({
            where: { organizationId: org.id },
            include: { user: true },
          }),
        ]);
      } catch (err: any) {
        throw new Error(`DATABASE_ERROR: Failed to query organization details from PostgreSQL: ${err.message}`);
      }
    } else {
      org = await platformRepository.getOrganization(decoded);
      if (!org) return null;
      projects = await platformRepository.listProjects({ organizationId: org.id });
    }

    const planTier = computePlanTier(projects, org.complianceTier);
    const tenants: OrganizationTenantSummary[] = projects.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      status: p.status || 'ACTIVE',
      planTier: p.planTier || 'starter',
      enabledServices: p.enabledServices || [],
      customDomain: p.customDomain || null,
    }));

    const members: OrganizationMemberItem[] = (memberships || []).map((m) => {
      const user = m.user || {};
      const email = user.email || 'operator@orbitox.io';
      const name = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
      return {
        id: user.id || m.userId,
        email,
        name,
        role: m.role || 'MEMBER',
        mfaEnabled: Boolean(user.mfaTotpSealed),
        status: user.status || 'ACTIVE',
        lastActiveFormatted: 'Recently active',
      };
    });

    // Provide default primary member if none exist
    if (members.length === 0) {
      const email = org.billingEmail || 'owner@orbitox.io';
      const name = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
      members.push({
        id: `mbr_${org.id}`,
        email,
        name,
        role: 'OWNER',
        mfaEnabled: true,
        status: 'ACTIVE',
        lastActiveFormatted: 'Active now',
      });
    }

    const monthlyRevenueEstimate = computeMonthlyRevenue(planTier, tenants.length);

    return {
      id: org.id,
      slug: org.slug,
      name: org.name,
      billingEmail: org.billingEmail || '',
      complianceTier: org.complianceTier || 'STANDARD',
      status: org.status || 'ACTIVE',
      planTier,
      tenantsCount: tenants.length,
      membersCount: members.length,
      createdAt: org.createdAt instanceof Date ? org.createdAt.toISOString() : String(org.createdAt),
      updatedAt: org.updatedAt instanceof Date ? org.updatedAt.toISOString() : String(org.updatedAt),
      tenants,
      members,
      monthlyRevenueEstimate,
      nextChargeDateFormatted: '1 Dec 2026',
      paymentMethod: 'UPI AutoPay · Razorpay',
      lastPaymentFormatted: 'Paid · 1 Nov 2026',
      gstin: '29ABCDE1234F1Z5',
      ownerName: members[0]?.name || 'Priya Shah',
      location: 'Bengaluru, India',
    };
  }

  async createOrganization(
    input: {
      name: string;
      slug: string;
      billingEmail: string;
      complianceTier?: string;
    },
    operator: OperatorContext
  ): Promise<OrganizationDetail> {
    if (!input.name || !input.slug || !input.billingEmail) {
      throw new Error('INVALID_REQUEST: Organization name, slug, and billing email are required.');
    }

    const cleanSlug = input.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
    const existing = await platformRepository.getOrganization(cleanSlug);
    if (existing) {
      throw new Error(`SLUG_CONFLICT: Organization with slug "${cleanSlug}" already exists.`);
    }

    const created = await platformRepository.createOrganization({
      name: input.name.trim(),
      slug: cleanSlug,
      billingEmail: input.billingEmail.trim().toLowerCase(),
      complianceTier: input.complianceTier || 'STANDARD',
    });

    await platformRepository.recordPlatformAdminAudit({
      action: 'ORGANIZATION_CREATED',
      entityType: 'ORGANIZATION',
      entityId: created.id,
      actorId: operator.email,
      organizationId: created.id,
      metadata: {
        organizationId: created.id,
        name: created.name,
        slug: created.slug,
        billingEmail: created.billingEmail,
        operatorId: operator.id,
      } as any,
    });

    const detail = await this.getOrganization(created.id);
    if (!detail) {
      throw new Error('CREATE_FAILED: Could not retrieve organization after creation.');
    }
    return detail;
  }

  async updateOrgPlan(
    idOrSlug: string,
    planTier: string,
    operator: OperatorContext
  ): Promise<OrganizationDetail> {
    const org = await platformRepository.getOrganization(idOrSlug);
    if (!org) {
      throw new Error(`NOT_FOUND: Organization "${idOrSlug}" not found.`);
    }

    const cleanTier = planTier.toLowerCase().trim();
    if (!['starter', 'growth', 'enterprise', 'pro'].includes(cleanTier)) {
      throw new Error(`INVALID_PLAN_TIER: Plan tier "${planTier}" is invalid. Expected starter, growth, or enterprise.`);
    }

    // Update all projects within this organization to the new plan tier
    const isJsonMode = process.env.ORBITOX_PLATFORM_REPOSITORY === 'json';
    if (!isJsonMode) {
      await (prisma as any).platformProject.updateMany({
        where: { organizationId: org.id },
        data: { planTier: cleanTier },
      });
    }

    await platformRepository.recordPlatformAdminAudit({
      action: 'ORGANIZATION_PLAN_UPDATED',
      entityType: 'ORGANIZATION',
      entityId: org.id,
      actorId: operator.email,
      organizationId: org.id,
      metadata: {
        organizationId: org.id,
        newPlanTier: planTier,
        operatorId: operator.id,
      } as any,
    });

    const updated = await this.getOrganization(org.id);
    if (!updated) {
      throw new Error('UPDATE_FAILED: Could not retrieve organization after plan update.');
    }
    return updated;
  }

  async archiveOrg(
    idOrSlug: string,
    reason: string,
    operator: OperatorContext
  ): Promise<OrganizationDetail> {
    assertValidReason(reason);
    assertFreshReauth(operator);

    const org = await platformRepository.getOrganization(idOrSlug);
    if (!org) {
      throw new Error(`NOT_FOUND: Organization "${idOrSlug}" not found.`);
    }

    const isJsonMode = process.env.ORBITOX_PLATFORM_REPOSITORY === 'json';
    if (!isJsonMode) {
      await (prisma as any).platformOrganization.update({
        where: { id: org.id },
        data: { status: 'SUSPENDED' },
      });
      // Suspend associated projects
      await (prisma as any).platformProject.updateMany({
        where: { organizationId: org.id },
        data: { status: 'SUSPENDED' },
      });
    } else {
      await platformRepository.updateOrganization(org.id, { status: 'SUSPENDED' as any });
    }

    await platformRepository.recordPlatformAdminAudit({
      action: 'ORGANIZATION_SUSPENDED',
      entityType: 'ORGANIZATION',
      entityId: org.id,
      actorId: operator.email,
      organizationId: org.id,
      metadata: {
        organizationId: org.id,
        reason,
        suspendedAt: new Date().toISOString(),
        operatorId: operator.id,
      } as any,
    });

    const updated = await this.getOrganization(org.id);
    if (!updated) {
      throw new Error('ARCHIVE_FAILED: Could not retrieve organization after suspension.');
    }
    return updated;
  }
}

export const organizationService = new OrganizationService();
