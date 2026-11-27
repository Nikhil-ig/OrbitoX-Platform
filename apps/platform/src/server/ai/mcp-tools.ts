import 'server-only';
import { z } from 'zod';
import { Prisma, type PlatformOperatorRole } from '@prisma/client';
import { prisma } from '@/server/db/prisma';
import { withTenantTx, TENANT_RE } from '@/server/db/tenant-db';
import { platformRepository } from '@/server/db/platform-repository';
import { listTenants, getTenantDetail, suspendTenant } from '@/server/tenants/tenants-service';
import { provisioningService } from '@/server/provisioning/provisioning-service';
import { sendGraceReminderBatch } from '@/server/billing/billing-service';
import { packageSignatureService } from '@/server/governance/package-signature-service';
import { calculateNews2Score } from '@/lib/clinical-news2';
import type { OperatorSessionContext } from '@/server/accounts/account-service';

export type ApprovalPolicy = 'READ_FREELY' | 'ASK_FIRST' | 'STEP_UP_MFA' | 'NEVER_AI';
export type TenantScopeMode = 'PLATFORM_GLOBAL' | 'EXPLICIT_TENANT';

export type McpActorContext =
  | {
    kind: 'operator';
    actorId: string;
    actorEmail: string;
    role: PlatformOperatorRole;
    reauthenticatedAt: Date | null;
    allowedTenants: '*';
    session: OperatorSessionContext;
  }
  | {
    kind: 'api_key';
    actorId: string;
    actorEmail: string | null;
    maskedKeyDisplay?: string;
    capabilities: string[];
    allowedTenants: string[];
    projectTenantId?: string;
  };

export class McpToolError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export interface McpToolExecutionResult {
  tenantScope: string;
  data: unknown;
  maskEmailsInAudit?: boolean;
}

export interface McpToolDefinition<TParams = any> {
  serverId: string;
  serverName: string;
  serverVersion: string;
  transport: string;
  toolName: string;
  description: string;
  requiredCapability: string;
  minRole: PlatformOperatorRole;
  approvalPolicy: ApprovalPolicy;
  safetyStatus: 'GUARDED' | 'STEP_UP' | 'BLOCKED';
  tenantScopeMode: TenantScopeMode;
  available: boolean;
  schema: z.ZodType<TParams>;
  extractTargetTenant?: (params: TParams) => string | undefined;
  validateProposal?: (params: TParams, actor: McpActorContext) => Promise<{ previewSummary: string; tenantScope: string }>;
  execute: (
    params: TParams,
    actor: McpActorContext,
    context: { editedMessage?: string | null; reason?: string | null; executionId?: string; idempotencyKey?: string },
  ) => Promise<McpToolExecutionResult>;
}

function asSyntheticOperator(actor: McpActorContext): OperatorSessionContext {
  if (actor.kind === 'operator') return actor.session;
  throw new McpToolError(
    403,
    'OPERATOR_SESSION_REQUIRED',
    'This action requires an authenticated platform operator session.',
  );
}

function assertApiKeyTenantPermitted(actor: McpActorContext, candidates: string[]): void {
  if (actor.kind !== 'api_key') return;
  if (actor.allowedTenants.includes('*')) return;
  const permitted = candidates.some((c) => c && actor.allowedTenants.includes(c));
  if (!permitted) {
    throw new McpToolError(
      403,
      'TENANT_SCOPE_VIOLATION',
      `API key is not authorized for target tenant scope [${candidates[0] || 'unknown'}].`,
    );
  }
}

async function resolveHmsTenant(
  rawTenantId: string,
  actor: McpActorContext,
): Promise<{ canonicalTenantId: string; projectId: string; projectName: string }> {
  const clean = rawTenantId.trim();
  if (!clean || clean === 'global') {
    throw new McpToolError(
      400,
      'TENANT_SCOPE_REQUIRED',
      'Explicit target tenantId or project slug is required for HospitalOS MCP tools.',
    );
  }

  let project: any = null;
  let canonicalTenantId = '';

  if (TENANT_RE.test(clean)) {
    const parts = clean.split('/');
    const orgId = parts[1];
    const projId = parts[3];
    project = await prisma.platformProject.findFirst({
      where: {
        OR: [{ id: projId }, { slug: projId }],
        ...(orgId ? { organizationId: orgId } : {}),
      },
      include: { environments: true },
    });
    if (!project) {
      throw new McpToolError(404, 'TENANT_NOT_FOUND', `HospitalOS tenant [${clean}] could not be found.`);
    }
    canonicalTenantId = clean;
  } else {
    project = await prisma.platformProject.findFirst({
      where: { OR: [{ id: clean }, { slug: clean }] },
      include: { environments: { orderBy: [{ isProduction: 'desc' }, { createdAt: 'asc' }] } },
    });
    if (!project) {
      throw new McpToolError(404, 'TENANT_NOT_FOUND', `HospitalOS project [${clean}] could not be found.`);
    }
    const env = project.environments?.[0];
    if (!env) {
      throw new McpToolError(
        409,
        'ENVIRONMENT_NOT_PROVISIONED',
        `Project [${project.slug}] has no provisioned environment for tenant execution.`,
      );
    }
    canonicalTenantId = `org/${project.organizationId}/project/${project.id}/environment/${env.id}`;
  }

  assertApiKeyTenantPermitted(actor, [clean, canonicalTenantId, project.id, project.slug]);

  if (project.status === 'SUSPENDED' || project.status === 'DEPROVISIONING' || project.status === 'ARCHIVED') {
    throw new McpToolError(403, 'TENANT_SUSPENDED', `Tenant [${project.slug}] is ${project.status}.`);
  }

  const hasHmsService = (project.enabledServices || []).some((s: string) =>
    s.toLowerCase().includes('hms'),
  );
  const hmsInstall = await prisma
    .$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${canonicalTenantId}, true)`;
      return tx.pluginInstallation.findFirst({
        where: {
          tenantId: { in: [canonicalTenantId, project.id, project.slug] },
          pluginId: { contains: 'hms' },
          status: { in: ['ACTIVE', 'READ_ONLY'] },
        },
      });
    })
    .catch(() => null);

  if (!hasHmsService && !hmsInstall && project.businessModel !== 'HEALTHCARE_NETWORK') {
    throw new McpToolError(
      403,
      'HMS_NOT_ENABLED',
      `Tenant [${project.slug}] does not have @orbitox/hms enabled.`,
    );
  }

  return {
    canonicalTenantId,
    projectId: project.id,
    projectName: project.name,
  };
}

const DB_SCHEMA_SAFE_MODEL_ALLOWLIST = new Set([
  'PlatformOrganization',
  'PlatformProject',
  'ProjectEnvironment',
  'ProjectDomain',
  'Plan',
  'PlanFeature',
  'PlanQuota',
  'BillingPlanMap',
  'BillingSubscription',
  'PluginInstallation',
  'PackageInstallation',
  'PlatformOperation',
  'McpToolApproval',
  'McpToolInvocation',
  'HmsDepartment',
  'HmsWard',
  'HmsBed',
  'HmsAdmission',
  'HmsLabOrder',
  'HmsInvoice',
]);

const SENSITIVE_FIELD_FILTER = /password|secret|token|hash|sealed|blind|backup|mfa|privateKey|keyPrefix/i;

export const MCP_TOOLS: McpToolDefinition[] = [
  {
    serverId: 'mcp-server-core',
    serverName: 'OrbitoX Core Kernel Server',
    serverVersion: 'v3.0.4',
    transport: 'Internal Kernel Dispatcher',
    toolName: 'tenants.search / get',
    description: 'Search tenants, view domains, plan tier, and suspension state across the fleet.',
    requiredCapability: 'platform.tenants.read',
    minRole: 'SUPPORT_READONLY',
    approvalPolicy: 'READ_FREELY',
    safetyStatus: 'GUARDED',
    tenantScopeMode: 'PLATFORM_GLOBAL',
    available: true,
    schema: z.object({
      idOrSlug: z.string().trim().min(1).max(120).optional(),
      query: z.string().trim().max(120).optional(),
      status: z.enum(['ALL', 'ACTIVE', 'SUSPENDED', 'PROVISIONING', 'DEGRADED']).optional(),
      limit: z.number().int().min(1).max(50).optional(),
    }),
    execute: async (params, actor) => {
      const op = actor.kind === 'operator' ? actor.session : null;
      if (params.idOrSlug) {
        const detail = await getTenantDetail(params.idOrSlug, op);
        if (!detail) {
          throw new McpToolError(404, 'TENANT_NOT_FOUND', `Tenant [${params.idOrSlug}] was not found.`);
        }
        return {
          tenantScope: detail.id,
          data: {
            mode: 'detail',
            tenant: {
              id: detail.id,
              name: detail.name,
              slug: detail.slug,
              status: detail.status,
              planTier: detail.planTier,
              organizationName: detail.organizationName,
              plugins: detail.plugins,
              domains: detail.domains,
            },
          },
        };
      }

      const list = await listTenants(
        {
          search: params.query,
          status: params.status || 'ALL',
          limit: params.limit || 20,
        },
        op,
      );
      return {
        tenantScope: 'platform',
        data: {
          mode: 'search',
          total: list.total,
          items: list.items.map((t) => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
            status: t.status,
            planTier: t.planTier,
            organizationName: t.organizationName,
            installedPlugins: t.installedPlugins,
          })),
        },
      };
    },
  },
  {
    serverId: 'mcp-server-core',
    serverName: 'OrbitoX Core Kernel Server',
    serverVersion: 'v3.0.4',
    transport: 'Internal Kernel Dispatcher',
    toolName: 'kernel_inspect_environment',
    description: 'Inspect PostgreSQL readiness, provisioned environment state, and recent saga jobs for a tenant environment.',
    requiredCapability: 'platform.environment.inspect',
    minRole: 'SUPPORT_READONLY',
    approvalPolicy: 'READ_FREELY',
    safetyStatus: 'GUARDED',
    tenantScopeMode: 'PLATFORM_GLOBAL',
    available: true,
    schema: z.object({
      environmentId: z.string().trim().min(1).max(160).optional(),
    }),
    execute: async (params) => {
      const dbStart = performance.now();
      await prisma.$queryRaw`SELECT 1`;
      const dbProbeLatencyMs = Math.max(1, Math.round(performance.now() - dbStart));

      if (params.environmentId) {
        const env = await prisma.projectEnvironment.findFirst({
          where: {
            OR: [
              { id: params.environmentId },
              { slug: params.environmentId },
              { project: { slug: params.environmentId } },
              { project: { id: params.environmentId } },
            ],
          },
          include: {
            project: { select: { id: true, name: true, slug: true, status: true, organizationId: true, enabledServices: true } },
            domains: { select: { domainName: true, verificationStatus: true, tlsCertificateStatus: true } },
            packageInstallations: { select: { id: true, status: true, packageId: true } },
          },
        });

        if (!env) {
          const sampleEnvs = await prisma.projectEnvironment.findMany({
            take: 5,
            select: { id: true, slug: true, name: true, project: { select: { slug: true } } },
          });
          throw new McpToolError(
            404,
            'ENVIRONMENT_NOT_FOUND',
            `Environment [${params.environmentId}] does not exist in PostgreSQL.`,
            {
              availableEnvironments: sampleEnvs.map((e) => ({
                id: e.id,
                slug: e.slug,
                projectSlug: e.project.slug,
              })),
            },
          );
        }

        const recentOps = await prisma.platformOperation.findMany({
          where: { tenantId: { in: [env.project.id, env.project.slug] } },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, type: true, status: true, updatedAt: true },
        });

        return {
          tenantScope: `org/${env.project.organizationId}/project/${env.project.id}/environment/${env.id}`,
          data: {
            databaseConnectivity: 'CONNECTED',
            dbProbeLatencyMs,
            environment: {
              id: env.id,
              slug: env.slug,
              name: env.name,
              type: env.type,
              status: env.status,
              isProduction: env.isProduction,
              requireMtls: env.requireMtls,
            },
            project: env.project,
            domainsCount: env.domains.length,
            installationsCount: env.packageInstallations.length,
            recentOperations: recentOps,
          },
        };
      }

      const [envCount, activeProjects, failedOps, latestEnvs] = await Promise.all([
        prisma.projectEnvironment.count(),
        prisma.platformProject.count({ where: { status: 'ACTIVE' } }),
        prisma.platformOperation.count({ where: { status: 'FAILED' } }),
        prisma.projectEnvironment.findMany({
          take: 8,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            slug: true,
            name: true,
            type: true,
            status: true,
            project: { select: { id: true, slug: true, name: true } },
          },
        }),
      ]);

      return {
        tenantScope: 'platform',
        data: {
          databaseConnectivity: 'CONNECTED',
          dbProbeLatencyMs,
          environmentsTotal: envCount,
          activeProjects,
          failedOperationsCount: failedOps,
          environments: latestEnvs,
        },
      };
    },
  },
  {
    serverId: 'mcp-server-core',
    serverName: 'OrbitoX Core Kernel Server',
    serverVersion: 'v3.0.4',
    transport: 'Internal Kernel Dispatcher',
    toolName: 'kernel_crypto_verify',
    description: 'Verify Ed25519/RSA cryptographic signature of a registered package manifest and version.',
    requiredCapability: 'platform.crypto.verify',
    minRole: 'SUPPORT_READONLY',
    approvalPolicy: 'READ_FREELY',
    safetyStatus: 'GUARDED',
    tenantScopeMode: 'PLATFORM_GLOBAL',
    available: true,
    schema: z.object({
      packageId: z.string().trim().min(1).max(120),
      version: z.string().trim().min(1).max(40).optional(),
    }),
    execute: async (params) => {
      const packages = await platformRepository.listPackages();
      const target = params.packageId.trim().toLowerCase();
      const pkg = packages.find(
        (p) =>
          p.packageId.toLowerCase() === target ||
          p.id.toLowerCase() === target ||
          p.packageId.replace('@orbitox-io/', '@orbitox/').toLowerCase() === target,
      );

      if (!pkg) {
        throw new McpToolError(
          404,
          'PACKAGE_NOT_FOUND',
          `Package [${params.packageId}] is not registered in the platform catalogue.`,
        );
      }

      const versions = await platformRepository.listPackageVersions(pkg.packageId);
      if (params.version) {
        const matchedVersion = versions.find(
          (v) => v.version === params.version || v.id === params.version,
        );
        if (!matchedVersion) {
          throw new McpToolError(
            404,
            'PACKAGE_VERSION_NOT_FOUND',
            `Version [${params.version}] not found for package [${pkg.packageId}].`,
          );
        }
        const result = packageSignatureService.verifyVersionSignature(
          matchedVersion,
          pkg.signingPublicKeyPem,
        );
        return {
          tenantScope: 'platform',
          data: {
            packageId: pkg.packageId,
            versionEvaluated: matchedVersion.version,
            signatureVerified: result.verified,
            integrityStatus: result.status,
            verifiedAlgorithm: result.verifiedAlgorithm || null,
            details: result.details || null,
          },
        };
      }

      const releaseResult = packageSignatureService.verifyPackageRelease(pkg, versions);
      return {
        tenantScope: 'platform',
        data: {
          packageId: pkg.packageId,
          ...releaseResult,
        },
      };
    },
  },
  {
    serverId: 'mcp-server-core',
    serverName: 'OrbitoX Core Kernel Server',
    serverVersion: 'v3.0.4',
    transport: 'Internal Kernel Dispatcher',
    toolName: 'provisioning.retry',
    description: 'Retry failed or cancelled tenant provisioning saga steps idempotently after operator approval.',
    requiredCapability: 'platform.provisioning.write',
    minRole: 'OPERATOR',
    approvalPolicy: 'ASK_FIRST',
    safetyStatus: 'GUARDED',
    tenantScopeMode: 'PLATFORM_GLOBAL',
    available: true,
    schema: z.object({
      operationId: z.string().trim().min(1).max(120),
    }),
    validateProposal: async (params) => {
      const op = await provisioningService.getOperation(params.operationId);
      if (!op) {
        throw new McpToolError(
          404,
          'OPERATION_NOT_FOUND',
          `Provisioning operation [${params.operationId}] was not found.`,
        );
      }
      if (!['FAILED', 'PARTIAL', 'CANCELLED'].includes(op.status)) {
        throw new McpToolError(
          409,
          'INVALID_OPERATION_STATE',
          `Provisioning operation [${params.operationId}] has status ${op.status} and cannot be retried.`,
        );
      }
      return {
        previewSummary: `Retry ${op.type} operation ${op.id} for tenant ${op.tenantName || op.tenantId} (current status: ${op.status}).`,
        tenantScope: op.tenantId,
      };
    },
    execute: async (params, actor, context) => {
      const operator = asSyntheticOperator(actor);
      try {
        const updated = await provisioningService.retryOperation(
          params.operationId,
          {
            id: operator.id,
            email: operator.email,
            role: operator.role,
          },
          { mcpExecutionId: context.executionId },
        );
        return {
          tenantScope: updated.tenantId,
          data: {
            operationId: updated.id,
            status: updated.status,
            tenantId: updated.tenantId,
            tenantName: updated.tenantName,
            mcpExecutionId: context.executionId,
          },
        };
      } catch (err: any) {
        const msg = err?.message || 'Retry failed';
        if (msg.includes('NOT_FOUND')) throw new McpToolError(404, 'OPERATION_NOT_FOUND', msg);
        if (msg.includes('INVALID_STATE')) throw new McpToolError(409, 'INVALID_OPERATION_STATE', msg);
        if (msg.includes('RETRY_LOCKED')) throw new McpToolError(409, 'RETRY_LOCKED', msg);
        throw new McpToolError(500, 'PROVISIONING_RETRY_FAILED', msg);
      }
    },
  },
  {
    serverId: 'mcp-server-core',
    serverName: 'OrbitoX Core Kernel Server',
    serverVersion: 'v3.0.4',
    transport: 'Internal Kernel Dispatcher',
    toolName: 'tenants.suspend',
    description: 'Suspend an active tenant workspace immediately with mandatory reason and fresh TOTP step-up MFA.',
    requiredCapability: 'platform.tenants.suspend',
    minRole: 'PLATFORM_OWNER',
    approvalPolicy: 'STEP_UP_MFA',
    safetyStatus: 'STEP_UP',
    tenantScopeMode: 'EXPLICIT_TENANT',
    available: true,
    schema: z.object({
      idOrSlug: z.string().trim().min(1).max(120),
      reason: z.string().trim().min(5).max(500),
    }),
    extractTargetTenant: (params) => params.idOrSlug,
    validateProposal: async (params, actor) => {
      assertApiKeyTenantPermitted(actor, [params.idOrSlug]);
      const op = actor.kind === 'operator' ? actor.session : null;
      const detail = await getTenantDetail(params.idOrSlug, op);
      if (!detail) {
        throw new McpToolError(404, 'TENANT_NOT_FOUND', `Tenant [${params.idOrSlug}] does not exist.`);
      }
      if (detail.status === 'SUSPENDED') {
        throw new McpToolError(409, 'ALREADY_SUSPENDED', `Tenant [${detail.slug}] is already suspended.`);
      }
      return {
        previewSummary: `Suspend tenant workspace "${detail.name}" (${detail.slug}) with step-up MFA verification. Reason: "${params.reason}"`,
        tenantScope: detail.id,
      };
    },
    execute: async (params, actor, context) => {
      const operator = asSyntheticOperator(actor);
      const effectiveReason = (context.reason || params.reason || '').trim();
      if (effectiveReason.length < 5) {
        throw new McpToolError(400, 'INVALID_REASON', 'A mandatory reason of at least 5 characters is required.');
      }
      try {
        const res = await suspendTenant(
          params.idOrSlug,
          {
            reason: effectiveReason,
            operatorEmail: operator.email,
            requestId: context.executionId,
            idempotencyKey: context.idempotencyKey,
          },
          operator,
        );
        return {
          tenantScope: res.tenantId,
          data: res,
        };
      } catch (err: any) {
        const msg = err?.message || 'Suspend failed';
        if (msg.includes('STEP_UP_REAUTH_REQUIRED')) throw new McpToolError(403, 'REAUTH_REQUIRED', msg);
        if (msg.includes('TENANT_NOT_FOUND')) throw new McpToolError(404, 'TENANT_NOT_FOUND', msg);
        if (msg.includes('SUSPEND_REASON_MIN_LENGTH')) throw new McpToolError(400, 'INVALID_REASON', msg);
        throw new McpToolError(500, 'TENANT_SUSPEND_FAILED', msg);
      }
    },
  },
  {
    serverId: 'mcp-server-billing',
    serverName: 'OrbitoX Billing & Subscriptions MCP Server',
    serverVersion: 'v1.8.0',
    transport: 'Internal Billing Service',
    toolName: 'billing.list_subscriptions',
    description: 'List active, grace-period, and pending-cancellation subscriptions from PostgreSQL.',
    requiredCapability: 'platform.billing.read',
    minRole: 'BILLING',
    approvalPolicy: 'READ_FREELY',
    safetyStatus: 'GUARDED',
    tenantScopeMode: 'PLATFORM_GLOBAL',
    available: true,
    schema: z.object({
      status: z.enum(['all', 'grace', 'active', 'pending_cancellation']).optional().default('all'),
      limit: z.number().int().min(1).max(100).optional().default(25),
    }),
    execute: async (params) => {
      const whereClause: Prisma.BillingSubscriptionWhereInput =
        params.status === 'grace'
          ? { graceStartedAt: { not: null } }
          : params.status === 'active'
            ? { status: 'active' }
            : params.status === 'pending_cancellation'
              ? { cancelAtPeriodEnd: true }
              : {};

      const subs = await prisma.billingSubscription.findMany({
        where: whereClause,
        include: { planMap: true },
        orderBy: [{ graceStartedAt: 'desc' }, { updatedAt: 'desc' }],
        take: params.limit,
      });

      const extractProjectKey = (tid: string) => {
        const parts = tid.split('/');
        return parts[0] === 'org' && parts[2] === 'project' && parts[3] ? parts[3] : tid;
      };
      const projectIds = Array.from(new Set(subs.map((s) => extractProjectKey(s.tenantId))));
      const orgIds = Array.from(new Set(subs.map((s) => s.organizationId)));

      const [projects, orgs] = await Promise.all([
        projectIds.length > 0
          ? prisma.platformProject.findMany({
            where: { OR: [{ id: { in: projectIds } }, { slug: { in: projectIds } }] },
            select: { id: true, name: true, slug: true },
          })
          : [],
        orgIds.length > 0
          ? prisma.platformOrganization.findMany({
            where: { id: { in: orgIds } },
            select: { id: true, name: true },
          })
          : [],
      ]);

      const projMap = new Map<string, (typeof projects)[number]>();
      for (const p of projects) {
        projMap.set(p.id, p);
        projMap.set(p.slug, p);
      }
      const orgMap = new Map(orgs.map((o) => [o.id, o]));

      const items = subs.map((s) => {
        const proj = projMap.get(extractProjectKey(s.tenantId));
        const org = orgMap.get(s.organizationId);
        const daysElapsed = s.graceStartedAt
          ? Math.floor((Date.now() - s.graceStartedAt.getTime()) / 86400000)
          : 0;
        const daysRemaining = s.graceStartedAt ? Math.max(0, 7 - daysElapsed) : null;
        return {
          id: s.razorpaySubscriptionId,
          tenantId: s.tenantId,
          tenantName: proj?.name || s.tenantId,
          organizationId: s.organizationId,
          organizationName: org?.name || s.organizationId,
          pluginId: s.pluginId,
          planId: s.planMap?.internalPlanId || s.razorpayPlanId,
          status: s.status,
          inGracePeriod: Boolean(s.graceStartedAt),
          graceStartedAt: s.graceStartedAt?.toISOString() || null,
          daysRemaining,
          amountMinor: s.planMap?.amountMinor || 0,
          currency: s.planMap?.currency || 'INR',
          cancelAtPeriodEnd: s.cancelAtPeriodEnd,
        };
      });

      return {
        tenantScope: 'platform',
        data: {
          filter: params.status,
          count: items.length,
          subscriptions: items,
        },
      };
    },
  },
  {
    serverId: 'mcp-server-billing',
    serverName: 'OrbitoX Billing & Subscriptions MCP Server',
    serverVersion: 'v1.8.0',
    transport: 'Internal Billing Service',
    toolName: 'billing.send_payment_reminder',
    description: 'Queue an operator-approved payment reminder email into AccountEmailOutbox.',
    requiredCapability: 'platform.billing.remind',
    minRole: 'BILLING',
    approvalPolicy: 'ASK_FIRST',
    safetyStatus: 'GUARDED',
    tenantScopeMode: 'PLATFORM_GLOBAL',
    available: true,
    schema: z.object({
      subscriptionIds: z.array(z.string().trim().min(1)).min(1).max(25),
      customMessage: z.string().trim().max(1000).optional(),
    }),
    validateProposal: async (params) => {
      const subs = await prisma.billingSubscription.findMany({
        where: { razorpaySubscriptionId: { in: params.subscriptionIds } },
        select: { razorpaySubscriptionId: true, organizationId: true, tenantId: true },
      });
      if (subs.length === 0) {
        throw new McpToolError(
          404,
          'SUBSCRIPTIONS_NOT_FOUND',
          'None of the target subscriptions exist in PostgreSQL.',
        );
      }
      const missing = params.subscriptionIds.filter(
        (id: string) => !subs.some((s) => s.razorpaySubscriptionId === id),
      );
      if (missing.length > 0) {
        throw new McpToolError(
          404,
          'SUBSCRIPTION_NOT_FOUND',
          `Unknown subscription ID(s): ${missing.join(', ')}`,
        );
      }
      const orgs = await prisma.platformOrganization.findMany({
        where: { id: { in: subs.map((s) => s.organizationId) } },
        select: { id: true, name: true, billingEmail: true },
      });
      const orgMap = new Map(orgs.map((o) => [o.id, o]));
      for (const s of subs) {
        const org = orgMap.get(s.organizationId);
        if (!org?.billingEmail) {
          throw new McpToolError(
            422,
            'BILLING_EMAIL_NOT_CONFIGURED',
            `Organization for subscription ${s.razorpaySubscriptionId} has no configured billing email.`,
          );
        }
      }
      return {
        previewSummary: `Queue grace payment reminder email for ${subs.length} subscription(s): ${subs.map((s) => s.razorpaySubscriptionId).join(', ')}.`,
        tenantScope: subs.length === 1 ? subs[0]!.tenantId : 'platform',
      };
    },
    execute: async (params, actor, context) => {
      const operator = asSyntheticOperator(actor);
      const customMessage = context.editedMessage?.trim() || params.customMessage;
      const executionId = context.executionId || `exec_billing_${Date.now()}`;
      const idempotencyKey = context.idempotencyKey || executionId;
      const batch = await sendGraceReminderBatch(params.subscriptionIds, operator, {
        customMessage,
        source: 'MCP_APPROVED_WORKFLOW',
        executionId,
        idempotencyKey,
      });
      const firstSub = await prisma.billingSubscription
        .findFirst({
          where: { razorpaySubscriptionId: params.subscriptionIds[0] },
          select: { tenantId: true },
        })
        .catch(() => null);
      return {
        tenantScope: params.subscriptionIds.length === 1 ? (firstSub?.tenantId || params.subscriptionIds[0]!) : 'platform',
        maskEmailsInAudit: true,
        data: {
          queuedCount: batch.queuedCount,
          replayedCount: batch.replayedCount,
          failedCount: batch.failedCount,
          results: batch.results.map((r) => ({
            subscriptionId: r.subscriptionId,
            status: r.status === 'IDEMPOTENT_REPLAY' ? 'QUEUED_IDEMPOTENT' : 'QUEUED_IN_OUTBOX',
            emailOutboxId: r.emailOutboxId || undefined,
            message: r.message,
          })),
        },
      };
    },
  },
  {
    serverId: 'mcp-server-hms',
    serverName: '@orbitox/hms Clinical Triage MCP Server',
    serverVersion: 'v2.4.0',
    transport: 'Tenant-Scoped RLS Query',
    toolName: 'hms_triage_score',
    description: 'Compute NEWS2 vitals score and read anonymized triage level census inside an explicit HMS tenant boundary.',
    requiredCapability: 'hms.triage.execute',
    minRole: 'OPERATOR',
    approvalPolicy: 'READ_FREELY',
    safetyStatus: 'GUARDED',
    tenantScopeMode: 'EXPLICIT_TENANT',
    available: true,
    schema: z.object({
      tenantId: z.string().trim().min(1).max(180),
      vitals: z
        .object({
          spo2: z.number().min(40).max(100).optional(),
          heartRate: z.number().min(20).max(260).optional(),
          systolicBp: z.number().min(40).max(300).optional(),
          temperature: z.number().min(30).max(45).optional(),
          respiratoryRate: z.number().min(4).max(60).optional(),
          onOxygen: z.boolean().optional(),
        })
        .optional(),
    }),
    extractTargetTenant: (params) => params.tenantId,
    execute: async (params, actor) => {
      const resolved = await resolveHmsTenant(params.tenantId, actor);
      const triageCounts = await withTenantTx(
        prisma,
        resolved.canonicalTenantId,
        async (tx) => {
          const { rows } = await tx.query<{ triageLevel: number | null; count: number }>(
            `SELECT "triageLevel", COUNT(*)::int AS "count"
             FROM "HmsPatient"
             WHERE "tenantId" = $1 AND "processingStatus" = 'ACTIVE'
             GROUP BY "triageLevel"
             ORDER BY "triageLevel" ASC NULLS LAST`,
            [tx.tenantId],
          );
          return rows;
        },
        { readOnly: true },
      );

      const totalActivePatients = triageCounts.reduce((acc, r) => acc + r.count, 0);
      const news2 = params.vitals ? calculateNews2Score(params.vitals) : null;

      return {
        tenantScope: resolved.canonicalTenantId,
        data: {
          projectId: resolved.projectId,
          projectName: resolved.projectName,
          phiRedacted: true,
          totalActivePatients,
          triageDistribution: triageCounts.map((r) => ({
            triageLevel: r.triageLevel ?? 'UNASSIGNED',
            patientCount: r.count,
          })),
          ...(news2 ? { news2Evaluation: news2 } : {}),
        },
      };
    },
  },
  {
    serverId: 'mcp-server-hms',
    serverName: '@orbitox/hms Clinical Triage MCP Server',
    serverVersion: 'v2.4.0',
    transport: 'Tenant-Scoped RLS Query',
    toolName: 'hms_read_beds',
    description: 'Read anonymized ward & bed capacity summary within an explicit HMS tenant boundary.',
    requiredCapability: 'hms.beds.view',
    minRole: 'OPERATOR',
    approvalPolicy: 'READ_FREELY',
    safetyStatus: 'GUARDED',
    tenantScopeMode: 'EXPLICIT_TENANT',
    available: true,
    schema: z.object({
      tenantId: z.string().trim().min(1).max(180),
      wardId: z.string().trim().min(1).max(120).optional(),
    }),
    extractTargetTenant: (params) => params.tenantId,
    execute: async (params, actor) => {
      const resolved = await resolveHmsTenant(params.tenantId, actor);
      const beds = await withTenantTx(
        prisma,
        resolved.canonicalTenantId,
        async (tx) => {
          let sql = `
            SELECT
              COALESCE(w."name", b."wardId") AS "wardName",
              b."wardId",
              COUNT(*)::int AS "totalBeds",
              COUNT(*) FILTER (WHERE a."id" IS NOT NULL)::int AS "occupiedBeds",
              COUNT(*) FILTER (WHERE a."id" IS NULL AND b."serviceState" = 'IN_SERVICE')::int AS "availableBeds",
              COUNT(*) FILTER (WHERE b."serviceState" <> 'IN_SERVICE')::int AS "outOfServiceBeds"
            FROM "HmsBed" b
            LEFT JOIN "HmsWard" w ON w."tenantId" = b."tenantId" AND w."id" = b."wardId"
            LEFT JOIN "HmsAdmission" a ON a."tenantId" = b."tenantId" AND a."bedId" = b."id" AND a."dischargedAt" IS NULL
            WHERE b."tenantId" = $1
          `;
          const values: unknown[] = [tx.tenantId];
          if (params.wardId) {
            values.push(params.wardId);
            sql += ` AND b."wardId" = $2`;
          }
          sql += ` GROUP BY w."name", b."wardId" ORDER BY "wardName" ASC`;
          const { rows } = await tx.query<{
            wardName: string;
            wardId: string;
            totalBeds: number;
            occupiedBeds: number;
            availableBeds: number;
            outOfServiceBeds: number;
          }>(sql, values);
          return rows;
        },
        { readOnly: true },
      );

      const totals = beds.reduce(
        (acc, w) => ({
          totalBeds: acc.totalBeds + w.totalBeds,
          occupiedBeds: acc.occupiedBeds + w.occupiedBeds,
          availableBeds: acc.availableBeds + w.availableBeds,
          outOfServiceBeds: acc.outOfServiceBeds + w.outOfServiceBeds,
        }),
        { totalBeds: 0, occupiedBeds: 0, availableBeds: 0, outOfServiceBeds: 0 },
      );

      return {
        tenantScope: resolved.canonicalTenantId,
        data: {
          projectId: resolved.projectId,
          projectName: resolved.projectName,
          phiRedacted: true,
          summary: totals,
          wards: beds,
        },
      };
    },
  },
  {
    serverId: 'mcp-server-db',
    serverName: 'OrbitoX Safe Read-Only Database Inspector',
    serverVersion: 'v2.1.0',
    transport: 'Sanitized DMMF Metadata',
    toolName: 'db_read_schema',
    description: 'Inspect allowlisted schema definitions from compiled Prisma DMMF (never executes SQL or exposes secret/PHI columns).',
    requiredCapability: 'platform.db.read',
    minRole: 'PLATFORM_OWNER',
    approvalPolicy: 'READ_FREELY',
    safetyStatus: 'GUARDED',
    tenantScopeMode: 'PLATFORM_GLOBAL',
    available: true,
    schema: z.object({
      modelFilter: z.string().trim().max(64).optional(),
    }),
    execute: async (params) => {
      const filter = params.modelFilter?.trim().toLowerCase();
      const models = Prisma.dmmf.datamodel.models
        .filter((m) => DB_SCHEMA_SAFE_MODEL_ALLOWLIST.has(m.name))
        .filter((m) => !filter || filter === 'all_sanitized' || m.name.toLowerCase().includes(filter))
        .map((m) => {
          const allFields = m.fields.filter((f) => f.kind === 'scalar' || f.kind === 'enum');
          const safeFields = allFields.filter((f) => !SENSITIVE_FIELD_FILTER.test(f.name));
          return {
            model: m.name,
            fields: safeFields.map((f) => ({
              name: f.name,
              type: f.type,
              isRequired: f.isRequired,
              isId: f.isId,
            })),
            hiddenSensitiveFieldCount: allFields.length - safeFields.length,
          };
        });

      return {
        tenantScope: 'platform',
        data: {
          source: 'compiled_prisma_dmmf_allowlist',
          modelsCount: models.length,
          models,
        },
      };
    },
  },
  {
    serverId: 'mcp-server-db',
    serverName: 'OrbitoX Safe Read-Only Database Inspector',
    serverVersion: 'v2.1.0',
    transport: 'Blocked Policy',
    toolName: 'data_rights.erase',
    description: 'Irreversible personal data purge. Disabled for autonomous AI invocation and always audited when blocked.',
    requiredCapability: 'platform.data_rights.purge',
    minRole: 'PLATFORM_OWNER',
    approvalPolicy: 'NEVER_AI',
    safetyStatus: 'BLOCKED',
    tenantScopeMode: 'EXPLICIT_TENANT',
    available: true,
    schema: z.any(),
    execute: async () => {
      throw new McpToolError(
        403,
        'TOOL_POLICY_BLOCKED',
        'data_rights.erase is marked NEVER_AI and cannot be invoked through Ask OrbitoX or MCP.',
      );
    },
  },
];

export function findMcpTool(toolName: string): McpToolDefinition | undefined {
  return MCP_TOOLS.find((t) => t.toolName === toolName);
}

export function getMcpServerDescriptors() {
  const map = new Map<
    string,
    {
      serverId: string;
      name: string;
      version: string;
      status: string;
      transport: string;
      tools: Array<{
        toolName: string;
        description: string;
        requiredCapability: string;
        safetyStatus: string;
        approvalPolicy: ApprovalPolicy;
        available: boolean;
        tenantScopeMode: TenantScopeMode;
        minRole: PlatformOperatorRole;
      }>;
    }
  >();

  for (const tool of MCP_TOOLS) {
    let entry = map.get(tool.serverId);
    if (!entry) {
      entry = {
        serverId: tool.serverId,
        name: tool.serverName,
        version: tool.serverVersion,
        status: 'ONLINE',
        transport: tool.transport,
        tools: [],
      };
      map.set(tool.serverId, entry);
    }
    entry.tools.push({
      toolName: tool.toolName,
      description: tool.description,
      requiredCapability: tool.requiredCapability,
      safetyStatus: tool.safetyStatus,
      approvalPolicy: tool.approvalPolicy,
      available: tool.available,
      tenantScopeMode: tool.tenantScopeMode,
      minRole: tool.minRole,
    });
  }
  return Array.from(map.values());
}
