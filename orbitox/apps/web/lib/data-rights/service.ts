import crypto from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import {
  normalizeDataRightsPluginId,
  resolvePluginErasureMode,
  type DataRightsContext,
  type ErasureMode,
  type PluginDataRightsAdapter,
  type PrincipalCorrectionPatch,
  type PrincipalCorrectionSummary,
  type PrincipalErasureSummary,
  type PrincipalExportSummary,
  type PrincipalRef,
} from '@orbitox-io/plugin-engine';
import { queueAccountEmail } from '../account-email-queue';
import { HttpError } from '../db-errors';
import { buildAccountLink, newAccountToken } from '../phase6-account-security';
import { platformRepository } from '../platform-repository';
import { prisma as defaultRuntimePrisma } from '../prisma';
import { cancelRazorpaySubscription } from '../razorpay-client';
import { buildExportBundle, type DataExportManifest } from './archive';
import {
  buildSignedDeletionCertificate,
  type DeletionCertificatePluginEntry,
  type SignedDeletionCertificate,
} from './deletion-certificate';
import { HospitalOsDataRightsAdapter } from './hms-adapter';
import { createObjectStoreFromEnv, type ObjectStore } from './object-store';
import { RestaurantOsDataRightsAdapter } from './restaurant-adapter';

const LEASE_DURATION_MS = 10 * 60 * 1000;
const EXPORT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const EXPORT_DOWNLOAD_TTL_MS = 24 * 60 * 60 * 1000;
const DELETION_COOLING_OFF_MS = 30 * 24 * 60 * 60 * 1000;

export interface BillingCancellationProvider {
  cancelAtPeriodEnd(subscriptionId: string, idempotencyKey: string): Promise<void>;
}

export const defaultBillingCancellationProvider: BillingCancellationProvider = {
  async cancelAtPeriodEnd(subscriptionId: string, idempotencyKey: string) {
    await cancelRazorpaySubscription(subscriptionId, idempotencyKey);
  },
};

export interface DataRightsAdapters {
  hms: PluginDataRightsAdapter;
  restaurant: PluginDataRightsAdapter;
}

export function createDefaultDataRightsAdapters(options: {
  runtimePrisma?: PrismaClient;
  maintenancePrisma?: PrismaClient;
  restaurantBaseUrl?: string;
} = {}): DataRightsAdapters {
  const runtimePrisma = options.runtimePrisma ?? defaultRuntimePrisma;
  const recordAuditEvent = async (event: {
    action: string;
    entityType: string;
    entityId: string;
    tenantId: string;
    actorId: string;
    actorEmail?: string | null;
    reason: string;
    metadata: Record<string, unknown>;
  }) => {
    const parsed = /^org\/([^/]+)\/project\/([^/]+)\/environment\/([^/]+)$/.exec(event.tenantId);
    return platformRepository.recordPlatformAdminAudit({
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      ...(parsed ? { organizationId: parsed[1], projectId: parsed[2], environmentId: parsed[3] } : {}),
      actorId: event.actorId,
      actorEmail: event.actorEmail ?? undefined,
      reason: event.reason,
      metadata: event.metadata as Prisma.InputJsonValue,
    });
  };

  return {
    hms: new HospitalOsDataRightsAdapter({
      runtimePrisma,
      maintenancePrisma: options.maintenancePrisma,
      recordAuditEvent,
    }),
    restaurant: new RestaurantOsDataRightsAdapter({
      baseUrl: options.restaurantBaseUrl,
    }),
  };
}

export function digestOrganizationId(organizationId: string): string {
  return crypto.createHash('sha256').update(organizationId, 'utf8').digest('hex');
}

function serializePlainRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value instanceof Date) out[key] = value.toISOString();
    else if (typeof value === 'bigint') out[key] = value.toString();
    else out[key] = value;
  }
  return out;
}

export async function resolveTenantPlugins(
  client: PrismaClient,
  organizationId: string,
): Promise<{
  organization: {
    id: string;
    name: string;
    slug: string;
    billingEmail: string;
    status: string;
    complianceTier: string;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  projects: Array<{
    id: string;
    organizationId: string;
    name: string;
    slug: string;
    businessModel: string;
    contactEmail: string;
    enabledServices: string[];
    planTier: string;
    createdAt: Date;
    updatedAt: Date;
    environments: Array<{
      id: string;
      projectId: string;
      name: string;
      slug: string;
      type: string;
      isProduction: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>;
  }>;
  tenants: Array<{
    tenantId: string;
    projectId: string;
    environmentId: string;
    plugins: Array<'@orbitox/hms' | '@orbitox/restaurant'>;
  }>;
}> {
  const organization = await client.platformOrganization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      billingEmail: true,
      status: true,
      complianceTier: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!organization) {
    return { organization: null, projects: [], tenants: [] };
  }

  const projects = await client.platformProject.findMany({
    where: { organizationId },
    include: { environments: true },
    orderBy: { createdAt: 'asc' },
  });

  const tenantDescriptors: Array<{
    tenantId: string;
    projectId: string;
    environmentId: string;
    plugins: Array<'@orbitox/hms' | '@orbitox/restaurant'>;
  }> = [];

  for (const project of projects) {
    for (const env of project.environments) {
      const tenantId = `org/${organizationId}/project/${project.id}/environment/${env.id}`;
      const installations = await client.pluginInstallation.findMany({
        where: { tenantId },
        select: { pluginId: true },
      });

      const pluginSet = new Set<'@orbitox/hms' | '@orbitox/restaurant'>();
      for (const inst of installations) {
        const canonical = normalizeDataRightsPluginId(inst.pluginId);
        if (canonical === '@orbitox/hms' || canonical === '@orbitox/restaurant') {
          pluginSet.add(canonical);
        }
      }
      for (const svc of project.enabledServices || []) {
        const canonical = normalizeDataRightsPluginId(svc);
        if (canonical === '@orbitox/hms' || canonical === '@orbitox/restaurant') {
          pluginSet.add(canonical);
        }
      }

      tenantDescriptors.push({
        tenantId,
        projectId: project.id,
        environmentId: env.id,
        plugins: Array.from(pluginSet).sort() as Array<'@orbitox/hms' | '@orbitox/restaurant'>,
      });
    }
  }

  return { organization, projects, tenants: tenantDescriptors };
}

export async function requestOrganizationExport(input: {
  organizationId: string;
  requestedByUserId: string;
  actorEmail?: string | null;
  now?: Date;
  runtimePrisma?: PrismaClient;
}): Promise<{ jobId: string; status: string; createdAt: string }> {
  const client = input.runtimePrisma ?? defaultRuntimePrisma;
  const now = input.now ?? new Date();
  const org = await client.platformOrganization.findUnique({
    where: { id: input.organizationId },
    select: { id: true },
  });
  if (!org) throw new HttpError(404, 'ORGANIZATION_NOT_FOUND');

  const jobId = `drj_${crypto.randomUUID().replace(/-/g, '')}`;
  await client.dataRightsJob.create({
    data: {
      id: jobId,
      kind: 'ORG_EXPORT',
      status: 'QUEUED',
      organizationId: input.organizationId,
      requestedByUserId: input.requestedByUserId,
      runAfter: now,
      createdAt: now,
      updatedAt: now,
    },
  });

  await platformRepository.recordPlatformAdminAudit({
    action: 'data_rights.org_export.requested',
    entityType: 'DataRightsJob',
    entityId: jobId,
    organizationId: input.organizationId,
    actorId: input.requestedByUserId,
    actorEmail: input.actorEmail ?? undefined,
    metadata: { jobId },
  });

  return { jobId, status: 'QUEUED', createdAt: now.toISOString() };
}

export async function processExportJobs(input: {
  runtimePrisma?: PrismaClient;
  maintenancePrisma?: PrismaClient;
  objectStore?: ObjectStore;
  adapters?: DataRightsAdapters;
  publicBaseUrl?: string;
  now?: Date;
  workerId?: string;
  batchSize?: number;
}): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  jobs: Array<{
    jobId: string;
    organizationId: string;
    objectKey: string;
    rawDownloadToken: string;
    downloadLink: string;
    manifest: DataExportManifest;
  }>;
}> {
  const runtimePrisma = input.runtimePrisma ?? defaultRuntimePrisma;
  const store = input.objectStore ?? createObjectStoreFromEnv();
  const adapters =
    input.adapters ??
    createDefaultDataRightsAdapters({
      runtimePrisma,
      maintenancePrisma: input.maintenancePrisma,
    });
  const now = input.now ?? new Date();
  const workerId = input.workerId ?? `export_worker_${crypto.randomUUID()}`;
  const publicBaseUrl =
    input.publicBaseUrl ||
    process.env.ORBITOX_PUBLIC_BASE_URL ||
    'https://console.orbitox.internal';
  const batchSize = input.batchSize ?? 10;

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  const jobs: Array<{
    jobId: string;
    organizationId: string;
    objectKey: string;
    rawDownloadToken: string;
    downloadLink: string;
    manifest: DataExportManifest;
  }> = [];

  for (let i = 0; i < batchSize; i++) {
    const leaseUntil = new Date(now.getTime() + LEASE_DURATION_MS);
    const claimed = await runtimePrisma.$queryRaw<
      Array<{
        id: string;
        organizationId: string | null;
        requestedByUserId: string;
      }>
    >`
      UPDATE public."DataRightsJob"
      SET "status" = 'RUNNING',
          "leaseOwner" = ${workerId},
          "leaseExpiresAt" = ${leaseUntil},
          "startedAt" = COALESCE("startedAt", ${now}),
          "attempts" = "attempts" + 1,
          "updatedAt" = ${now}
      WHERE "id" = (
        SELECT "id"
        FROM public."DataRightsJob"
        WHERE "kind" = 'ORG_EXPORT'
          AND "status" IN ('QUEUED', 'RUNNING')
          AND "runAfter" <= ${now}
          AND ("leaseExpiresAt" IS NULL OR "leaseExpiresAt" < ${now})
          AND "attempts" < "maxAttempts"
        ORDER BY "createdAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING "id", "organizationId", "requestedByUserId"
    `;

    const job = claimed[0];
    if (!job || !job.organizationId) break;
    processed += 1;
    const organizationId = job.organizationId;

    try {
      const resolved = await resolveTenantPlugins(runtimePrisma, organizationId);
      if (!resolved.organization) {
        throw new Error(`Organization ${organizationId} not found during export.`);
      }

      const tableData: Array<{
        tenantId: string | null;
        pluginId: string;
        table: string;
        columns: readonly string[];
        rows: Array<Record<string, unknown>>;
      }> = [];

      tableData.push({
        tenantId: null,
        pluginId: 'platform',
        table: 'PlatformOrganization',
        columns: ['id', 'name', 'slug', 'billingEmail', 'status', 'complianceTier', 'createdAt', 'updatedAt'],
        rows: [serializePlainRow(resolved.organization as unknown as Record<string, unknown>)],
      });

      const memberships = await runtimePrisma.customerMembership.findMany({
        where: { organizationId },
        include: { user: { select: { id: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      });
      tableData.push({
        tenantId: null,
        pluginId: 'platform',
        table: 'CustomerMembership',
        columns: ['organizationId', 'userId', 'email', 'role', 'createdAt'],
        rows: memberships.map((m) =>
          serializePlainRow({
            organizationId: m.organizationId,
            userId: m.userId,
            email: m.user.email,
            role: m.role,
            createdAt: m.createdAt,
          }),
        ),
      });

      tableData.push({
        tenantId: null,
        pluginId: 'platform',
        table: 'PlatformProject',
        columns: ['id', 'organizationId', 'name', 'slug', 'businessModel', 'contactEmail', 'enabledServices', 'planTier', 'createdAt', 'updatedAt'],
        rows: resolved.projects.map((p) =>
          serializePlainRow({
            id: p.id,
            organizationId: p.organizationId,
            name: p.name,
            slug: p.slug,
            businessModel: p.businessModel,
            contactEmail: p.contactEmail,
            enabledServices: p.enabledServices,
            planTier: p.planTier,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          }),
        ),
      });

      const envs = resolved.projects.flatMap((p) => p.environments);
      tableData.push({
        tenantId: null,
        pluginId: 'platform',
        table: 'ProjectEnvironment',
        columns: ['id', 'projectId', 'name', 'slug', 'type', 'isProduction', 'createdAt', 'updatedAt'],
        rows: envs.map((e) => serializePlainRow(e as unknown as Record<string, unknown>)),
      });

      const exportContext: DataRightsContext = {
        actorId: job.requestedByUserId,
        reason: 'Organization DSR full data export',
        requestId: job.id,
      };

      for (const tenant of resolved.tenants) {
        for (const pluginId of tenant.plugins) {
          const adapter = pluginId === '@orbitox/hms' ? adapters.hms : adapters.restaurant;
          for await (const chunk of adapter.exportTenant(tenant.tenantId, exportContext)) {
            tableData.push({
              tenantId: tenant.tenantId,
              pluginId,
              table: chunk.table,
              columns: chunk.columns,
              rows: chunk.rows.map((r) => serializePlainRow(r)),
            });
          }
        }
      }

      const { zipBuffer, manifest } = buildExportBundle({
        organizationId,
        jobId: job.id,
        generatedAt: now,
        tenants: resolved.tenants,
        tableData,
      });

      const objectKey = `exports/${organizationId}/${job.id}.zip`;
      await store.put(objectKey, zipBuffer, {
        contentType: 'application/zip',
        metadata: { organizationId, jobId: job.id },
      });

      const { token: rawToken, tokenHash } = newAccountToken('VERIFY_EMAIL', now.getTime());
      const downloadExpiresAt = new Date(now.getTime() + EXPORT_DOWNLOAD_TTL_MS);
      const jobExpiresAt = new Date(now.getTime() + EXPORT_RETENTION_MS);
      const downloadLink = buildAccountLink(
        publicBaseUrl,
        '/customer/exports/download',
        rawToken,
      );

      const ownerEmailRow = await runtimePrisma.customerMembership.findFirst({
        where: { organizationId, role: 'OWNER' },
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: 'asc' },
      });
      const requesterRow = await runtimePrisma.customerUser.findUnique({
        where: { id: job.requestedByUserId },
        select: { email: true },
      });
      const recipientEmail = ownerEmailRow?.user?.email || requesterRow?.email;

      await runtimePrisma.$transaction(async (tx) => {
        await tx.dataExportDownloadToken.create({
          data: {
            id: `det_${crypto.randomUUID().replace(/-/g, '')}`,
            jobId: job.id,
            organizationId,
            tokenHash,
            objectKey,
            expiresAt: downloadExpiresAt,
            createdAt: now,
          },
        });

        await tx.dataRightsJob.update({
          where: { id: job.id },
          data: {
            status: 'SUCCEEDED',
            leaseOwner: null,
            leaseExpiresAt: null,
            completedAt: now,
            expiresAt: jobExpiresAt,
            updatedAt: now,
            result: {
              objectKey,
              bytes: zipBuffer.length,
              manifest,
            } as unknown as Prisma.InputJsonValue,
          },
        });

        if (recipientEmail) {
          await queueAccountEmail(tx, {
            recipient: recipientEmail,
            template: 'EXPORT_READY',
            data: { link: downloadLink },
          });
        }
      });

      succeeded += 1;
      jobs.push({
        jobId: job.id,
        organizationId,
        objectKey,
        rawDownloadToken: rawToken,
        downloadLink,
        manifest,
      });
    } catch (err: any) {
      failed += 1;
      await runtimePrisma.dataRightsJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          leaseOwner: null,
          leaseExpiresAt: null,
          lastError: err instanceof Error ? err.message.slice(0, 500) : String(err),
          updatedAt: now,
        },
      });
    }
  }

  return { processed, succeeded, failed, jobs };
}

export async function consumeExportDownloadToken(input: {
  organizationId: string;
  rawToken: string;
  userId: string;
  now?: Date;
  runtimePrisma?: PrismaClient;
  objectStore?: ObjectStore;
}): Promise<
  | { ok: true; jobId: string; objectKey: string; buffer: Buffer }
  | { ok: false; status: number; error: string }
> {
  const client = input.runtimePrisma ?? defaultRuntimePrisma;
  const store = input.objectStore ?? createObjectStoreFromEnv();
  const now = input.now ?? new Date();

  if (!input.rawToken || !/^[A-Za-z0-9_-]{32,128}$/.test(input.rawToken)) {
    return { ok: false, status: 400, error: 'INVALID_EXPORT_TOKEN' };
  }

  const tokenHash = crypto.createHash('sha256').update(input.rawToken, 'utf8').digest('hex');

  // Single atomic conditional UPDATE guarantees single-use even under concurrent requests.
  const updated = await client.$queryRaw<
    Array<{ id: string; jobId: string; objectKey: string }>
  >`
    UPDATE public."DataExportDownloadToken"
    SET "consumedAt" = ${now},
        "consumedByUserId" = ${input.userId}
    WHERE "tokenHash" = ${tokenHash}
      AND "organizationId" = ${input.organizationId}
      AND "consumedAt" IS NULL
      AND "expiresAt" > ${now}
    RETURNING "id", "jobId", "objectKey"
  `;

  const row = updated[0];
  if (!row) {
    return { ok: false, status: 410, error: 'EXPORT_DOWNLOAD_TOKEN_USED_OR_EXPIRED' };
  }

  const buffer = await store.get(row.objectKey);
  if (!buffer) {
    return { ok: false, status: 410, error: 'EXPORT_ARCHIVE_EXPIRED_OR_PURGED' };
  }

  return { ok: true, jobId: row.jobId, objectKey: row.objectKey, buffer };
}

export async function purgeExpiredExports(input: {
  maintenancePrisma: PrismaClient;
  objectStore?: ObjectStore;
  now?: Date;
}): Promise<{ purgedJobs: number; deletedTokens: number }> {
  const store = input.objectStore ?? createObjectStoreFromEnv();
  const now = input.now ?? new Date();

  const expiredJobs = await input.maintenancePrisma.dataRightsJob.findMany({
    where: {
      kind: 'ORG_EXPORT',
      status: 'SUCCEEDED',
      purgedAt: null,
      expiresAt: { lte: now },
    },
    select: { id: true, result: true },
  });

  let purgedJobs = 0;
  for (const job of expiredJobs) {
    const objectKey =
      job.result && typeof job.result === 'object' && !Array.isArray(job.result)
        ? (job.result as Record<string, unknown>).objectKey
        : null;
    if (typeof objectKey === 'string' && objectKey) {
      await store.delete(objectKey);
    }
    await input.maintenancePrisma.dataRightsJob.update({
      where: { id: job.id },
      data: { purgedAt: now, updatedAt: now },
    });
    purgedJobs += 1;
  }

  const deletedTokens = await input.maintenancePrisma.dataExportDownloadToken.deleteMany({
    where: { expiresAt: { lte: now } },
  });

  return { purgedJobs, deletedTokens: deletedTokens.count };
}

export async function scheduleOrganizationDeletion(input: {
  organizationId: string;
  requestedByUserId: string;
  actorEmail?: string | null;
  reason?: string;
  now?: Date;
  runtimePrisma?: PrismaClient;
  billingProvider?: BillingCancellationProvider;
}): Promise<{
  id: string;
  status: string;
  requestedAt: string;
  scheduledFor: string;
  suspendedKeyCount: number;
  cancelledSubscriptionIds: string[];
}> {
  const client = input.runtimePrisma ?? defaultRuntimePrisma;
  const billingProvider = input.billingProvider ?? defaultBillingCancellationProvider;
  const now = input.now ?? new Date();
  const scheduledFor = new Date(now.getTime() + DELETION_COOLING_OFF_MS);
  const digest = digestOrganizationId(input.organizationId);

  const txResult = await client.$transaction(async (tx) => {
    const org = await tx.platformOrganization.findUnique({
      where: { id: input.organizationId },
      select: { id: true },
    });
    if (!org) throw new HttpError(404, 'ORGANIZATION_NOT_FOUND');

    const existing = await tx.organizationDeletionRequest.findFirst({
      where: {
        organizationId: input.organizationId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
    });
    if (existing) {
      throw new HttpError(409, 'DELETION_ALREADY_SCHEDULED', 'Organization deletion is already scheduled.');
    }

    const owners = await tx.customerMembership.findMany({
      where: { organizationId: input.organizationId, role: 'OWNER' },
      include: { user: { select: { id: true, email: true } } },
    });
    const authorizedOwnerIds = Array.from(
      new Set([input.requestedByUserId, ...owners.map((o) => o.userId)]),
    );

    // Revoke existing customer sessions of non-owners who do not own/belong to another active org.
    const nonOwners = await tx.customerMembership.findMany({
      where: { organizationId: input.organizationId, role: { not: 'OWNER' } },
      select: { userId: true },
    });
    for (const member of nonOwners) {
      const otherMemberships = await tx.customerMembership.findMany({
        where: { userId: member.userId, organizationId: { not: input.organizationId } },
        select: { organizationId: true, role: true },
      });
      let keepSession = false;
      if (otherMemberships.length > 0) {
        const pendingOther = await tx.organizationDeletionRequest.findMany({
          where: {
            organizationId: { in: otherMemberships.map((m) => m.organizationId) },
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          },
          select: { organizationId: true },
        });
        const pendingOtherSet = new Set(pendingOther.map((d) => d.organizationId));
        keepSession = otherMemberships.some(
          (m) => m.role === 'OWNER' || !pendingOtherSet.has(m.organizationId),
        );
      }
      if (!keepSession) {
        await tx.customerSession.updateMany({
          where: { userId: member.userId, revokedAt: null },
          data: { revokedAt: now },
        });
      }
    }

    // Suspend all ACTIVE org API keys without deleting them (restored if cancelled).
    const activeKeys = await tx.platformApiKey.findMany({
      where: {
        status: 'ACTIVE',
        environment: { project: { organizationId: input.organizationId } },
      },
      select: { id: true },
    });
    const suspendedKeyIds = activeKeys.map((k) => k.id);
    if (suspendedKeyIds.length > 0) {
      await tx.platformApiKey.updateMany({
        where: { id: { in: suspendedKeyIds }, status: 'ACTIVE' },
        data: {
          status: 'SUSPENDED',
          revokeReason: 'Suspended pending 30-day organization deletion schedule',
        },
      });
    }

    const requestId = `del_${crypto.randomUUID().replace(/-/g, '')}`;
    const created = await tx.organizationDeletionRequest.create({
      data: {
        id: requestId,
        organizationId: input.organizationId,
        organizationDigest: digest,
        status: 'SCHEDULED',
        requestedByUserId: input.requestedByUserId,
        authorizedOwnerIds,
        suspendedKeyIds,
        reason: input.reason ?? 'Owner-requested organization deletion',
        requestedAt: now,
        scheduledFor,
        updatedAt: now,
      },
    });

    const activeSubs = await tx.billingSubscription.findMany({
      where: {
        organizationId: input.organizationId,
        status: { in: ['created', 'authenticated', 'active', 'pending', 'halted', 'paused'] },
        cancelAtPeriodEnd: false,
      },
      select: { razorpaySubscriptionId: true },
    });
    if (activeSubs.length > 0) {
      await tx.billingSubscription.updateMany({
        where: {
          razorpaySubscriptionId: { in: activeSubs.map((s) => s.razorpaySubscriptionId) },
        },
        data: { cancelAtPeriodEnd: true, updatedAt: now },
      });
    }

    for (const owner of owners) {
      if (owner.user?.email) {
        await queueAccountEmail(tx, {
          recipient: owner.user.email,
          template: 'DELETION_SCHEDULED',
          data: {},
        });
      }
    }

    return {
      request: created,
      suspendedKeyIds,
      subscriptionIds: activeSubs.map((s) => s.razorpaySubscriptionId),
    };
  });

  // Notify billing provider cleanly outside DB lock.
  for (const subscriptionId of txResult.subscriptionIds) {
    await billingProvider.cancelAtPeriodEnd(
      subscriptionId,
      `del_${txResult.request.id}_${subscriptionId}`,
    );
  }

  await platformRepository.recordPlatformAdminAudit({
    action: 'data_rights.org_deletion.scheduled',
    entityType: 'OrganizationDeletionRequest',
    entityId: txResult.request.id,
    organizationId: input.organizationId,
    actorId: input.requestedByUserId,
    actorEmail: input.actorEmail ?? undefined,
    metadata: {
      scheduledFor: scheduledFor.toISOString(),
      suspendedKeyCount: txResult.suspendedKeyIds.length,
    },
  });

  return {
    id: txResult.request.id,
    status: txResult.request.status,
    requestedAt: txResult.request.requestedAt.toISOString(),
    scheduledFor: txResult.request.scheduledFor.toISOString(),
    suspendedKeyCount: txResult.suspendedKeyIds.length,
    cancelledSubscriptionIds: txResult.subscriptionIds,
  };
}

export async function cancelOrganizationDeletion(input: {
  organizationId: string;
  actorUserId: string;
  actorEmail?: string | null;
  now?: Date;
  runtimePrisma?: PrismaClient;
}): Promise<{
  id: string;
  status: string;
  cancelledAt: string;
  restoredKeyCount: number;
}> {
  const client = input.runtimePrisma ?? defaultRuntimePrisma;
  const now = input.now ?? new Date();

  const res = await client.$transaction(async (tx) => {
    const req = await tx.organizationDeletionRequest.findFirst({
      where: {
        organizationId: input.organizationId,
        status: 'SCHEDULED',
        cancelledAt: null,
      },
    });
    if (!req) {
      throw new HttpError(404, 'DELETION_REQUEST_NOT_FOUND');
    }
    if (req.scheduledFor <= now) {
      throw new HttpError(409, 'DELETION_WINDOW_ELAPSED', 'The 30-day cooling-off window has elapsed.');
    }

    const updated = await tx.organizationDeletionRequest.update({
      where: { id: req.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: now,
        cancelledByUserId: input.actorUserId,
        updatedAt: now,
      },
    });

    let restoredKeyCount = 0;
    if (req.suspendedKeyIds.length > 0) {
      const restored = await tx.platformApiKey.updateMany({
        where: {
          id: { in: req.suspendedKeyIds },
          status: 'SUSPENDED',
        },
        data: {
          status: 'ACTIVE',
          revokeReason: null,
        },
      });
      restoredKeyCount = restored.count;
    }

    await tx.billingSubscription.updateMany({
      where: {
        organizationId: input.organizationId,
        status: { in: ['created', 'authenticated', 'active', 'pending', 'halted', 'paused'] },
        cancelAtPeriodEnd: true,
      },
      data: { cancelAtPeriodEnd: false, updatedAt: now },
    });

    return { updated, restoredKeyCount };
  });

  await platformRepository.recordPlatformAdminAudit({
    action: 'data_rights.org_deletion.cancelled',
    entityType: 'OrganizationDeletionRequest',
    entityId: res.updated.id,
    organizationId: input.organizationId,
    actorId: input.actorUserId,
    actorEmail: input.actorEmail ?? undefined,
    metadata: { restoredKeyCount: res.restoredKeyCount },
  });

  return {
    id: res.updated.id,
    status: res.updated.status,
    cancelledAt: res.updated.cancelledAt!.toISOString(),
    restoredKeyCount: res.restoredKeyCount,
  };
}

interface DeletionCheckpoint {
  organizationId?: string;
  organizationSlug?: string;
  ownerEmails?: string[];
  projectIds?: string[];
  environmentIds?: string[];
  tenants?: Array<{
    tenantId: string;
    projectId: string;
    environmentId: string;
    plugins: Array<'@orbitox/hms' | '@orbitox/restaurant'>;
  }>;
  completedPlugins?: Record<string, Record<string, number>>;
  objectStorePurged?: boolean;
  objectStoreObjectsDeleted?: number;
  keysRevoked?: boolean;
  revokedApiKeysCount?: number;
  orgClosed?: boolean;
  platformRowsDeletedByTable?: Record<string, number>;
}

export async function processDueOrganizationDeletions(input: {
  maintenancePrisma: PrismaClient;
  objectStore?: ObjectStore;
  adapters?: DataRightsAdapters;
  certEnv?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  now?: Date;
  workerId?: string;
  crashAfterStepForTesting?: 'after_plugin_erase' | 'after_object_store_purge' | 'after_keys_revoked' | 'after_org_closed';
}): Promise<{
  acquired: boolean;
  processed: number;
  completed: number;
  certificates: SignedDeletionCertificate[];
}> {
  const maintenance = input.maintenancePrisma;
  const store = input.objectStore ?? createObjectStoreFromEnv();
  const adapters =
    input.adapters ??
    createDefaultDataRightsAdapters({
      runtimePrisma: maintenance,
      maintenancePrisma: maintenance,
    });
  const now = input.now ?? new Date();
  const leaseOwner = input.workerId ?? `deletion_worker_${crypto.randomUUID()}`;

  const leaseRows = await maintenance.$queryRaw<Array<{ id: string }>>`
    INSERT INTO public."DataRightsSweepLease" ("id", "leaseOwner", "leaseExpiresAt", "updatedAt")
    VALUES ('global', ${leaseOwner}, ${new Date(now.getTime() + LEASE_DURATION_MS)}, ${now})
    ON CONFLICT ("id") DO UPDATE
      SET "leaseOwner" = EXCLUDED."leaseOwner",
          "leaseExpiresAt" = EXCLUDED."leaseExpiresAt",
          "updatedAt" = EXCLUDED."updatedAt"
      WHERE public."DataRightsSweepLease"."leaseExpiresAt" <= ${now}
    RETURNING "id"
  `;
  if (leaseRows.length === 0) {
    return { acquired: false, processed: 0, completed: 0, certificates: [] };
  }

  let processed = 0;
  let completed = 0;
  const certificates: SignedDeletionCertificate[] = [];

  try {
    const dueRequests = await maintenance.organizationDeletionRequest.findMany({
      where: {
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        scheduledFor: { lte: now },
        cancelledAt: null,
      },
      orderBy: { scheduledFor: 'asc' },
    });

    for (const req of dueRequests) {
      processed += 1;
      const checkpoint: DeletionCheckpoint =
        req.checkpoint && typeof req.checkpoint === 'object' && !Array.isArray(req.checkpoint)
          ? { ...(req.checkpoint as Record<string, unknown>) } as DeletionCheckpoint
          : {};

      const organizationId = req.organizationId || checkpoint.organizationId;
      if (!organizationId) {
        throw new Error(`Deletion request ${req.id} missing organizationId and checkpoint.organizationId`);
      }
      checkpoint.organizationId = organizationId;

      if (req.status === 'SCHEDULED') {
        await maintenance.organizationDeletionRequest.update({
          where: { id: req.id },
          data: { status: 'IN_PROGRESS', updatedAt: now },
        });
      }

      // Snapshot topology & owner emails BEFORE any deletions run so crash-resume stays intact.
      if (!checkpoint.tenants) {
        const resolved = await resolveTenantPlugins(maintenance, organizationId);
        const ownerUsers = req.authorizedOwnerIds.length > 0
          ? await maintenance.customerUser.findMany({
              where: { id: { in: req.authorizedOwnerIds } },
              select: { email: true },
            })
          : [];
        checkpoint.organizationSlug = resolved.organization?.slug;
        checkpoint.ownerEmails = ownerUsers.map((u) => u.email);
        checkpoint.projectIds = resolved.projects.map((p) => p.id);
        checkpoint.environmentIds = resolved.projects.flatMap((p) =>
          p.environments.map((e) => e.id),
        );
        checkpoint.tenants = resolved.tenants;
        checkpoint.completedPlugins = checkpoint.completedPlugins || {};
        await maintenance.organizationDeletionRequest.update({
          where: { id: req.id },
          data: {
            checkpoint: checkpoint as unknown as Prisma.InputJsonValue,
            updatedAt: now,
          },
        });
      }

      checkpoint.completedPlugins = checkpoint.completedPlugins || {};
      const ctx: DataRightsContext = {
        actorId: req.requestedByUserId,
        reason: '30-day scheduled organization deletion',
        requestId: req.id,
      };

      // Step 1: Erase each plugin's tenant data idempotently
      for (const tenant of checkpoint.tenants) {
        for (const pluginId of tenant.plugins) {
          const pluginKey = `${tenant.tenantId}:${pluginId}`;
          if (checkpoint.completedPlugins[pluginKey]) continue;

          const adapter = pluginId === '@orbitox/hms' ? adapters.hms : adapters.restaurant;
          const summary = await adapter.eraseTenant(tenant.tenantId, 'DELETE', ctx);
          checkpoint.completedPlugins[pluginKey] = summary.rowsDeletedByTable;

          await maintenance.organizationDeletionRequest.update({
            where: { id: req.id },
            data: {
              checkpoint: checkpoint as unknown as Prisma.InputJsonValue,
              updatedAt: now,
            },
          });
        }
      }

      if (input.crashAfterStepForTesting === 'after_plugin_erase') {
        throw new Error('INJECTED_CRASH_AFTER_PLUGIN_ERASE');
      }

      // Step 2: Purge object-store exports/uploads for the org
      if (!checkpoint.objectStorePurged) {
        const deletedExports = await store.deletePrefix(`exports/${organizationId}`);
        const deletedUploads = await store.deletePrefix(`uploads/${organizationId}`);
        checkpoint.objectStoreObjectsDeleted = deletedExports + deletedUploads;
        checkpoint.objectStorePurged = true;

        await maintenance.organizationDeletionRequest.update({
          where: { id: req.id },
          data: {
            checkpoint: checkpoint as unknown as Prisma.InputJsonValue,
            updatedAt: now,
          },
        });
      }

      if (input.crashAfterStepForTesting === 'after_object_store_purge') {
        throw new Error('INJECTED_CRASH_AFTER_OBJECT_STORE_PURGE');
      }

      // Step 3: Revoke all org API keys
      if (!checkpoint.keysRevoked) {
        const envIds = checkpoint.environmentIds || [];
        let revokedCount = 0;
        if (envIds.length > 0) {
          const updatedKeys = await maintenance.platformApiKey.updateMany({
            where: { environmentId: { in: envIds }, status: { not: 'REVOKED' } },
            data: {
              status: 'REVOKED',
              revokedAt: now,
              revokeReason: 'Organization erased under 6G G3',
            },
          });
          revokedCount = updatedKeys.count;
        }
        checkpoint.revokedApiKeysCount = revokedCount;
        checkpoint.keysRevoked = true;

        await maintenance.organizationDeletionRequest.update({
          where: { id: req.id },
          data: {
            checkpoint: checkpoint as unknown as Prisma.InputJsonValue,
            updatedAt: now,
          },
        });
      }

      if (input.crashAfterStepForTesting === 'after_keys_revoked') {
        throw new Error('INJECTED_CRASH_AFTER_KEYS_REVOKED');
      }

      // Step 4: Purge org-scoped platform rows + invoke close_customer_organization
      if (!checkpoint.orgClosed) {
        const projectIds = checkpoint.projectIds || [];
        const tenantIds = (checkpoint.tenants || []).map((t) => t.tenantId);

        const deletedPlatformCounts = await maintenance.$transaction(async (tx) => {
          const counts: Record<string, number> = {};

          const delTokens = await tx.dataExportDownloadToken.deleteMany({
            where: { organizationId },
          });
          counts.DataExportDownloadToken = delTokens.count;

          const delJobs = await tx.dataRightsJob.deleteMany({
            where: { organizationId },
          });
          counts.DataRightsJob = delJobs.count;

          if (tenantIds.length > 0) {
            counts.BillingProviderCache = (
              await tx.billingProviderCache.deleteMany({ where: { tenantId: { in: tenantIds } } })
            ).count;
            counts.PluginGrantRevision = (
              await tx.pluginGrantRevision.deleteMany({ where: { tenantId: { in: tenantIds } } })
            ).count;
            counts.PluginInstallation = (
              await tx.pluginInstallation.deleteMany({ where: { tenantId: { in: tenantIds } } })
            ).count;
            counts.PlatformOutboxMessage = (
              await tx.platformOutboxMessage.deleteMany({ where: { tenantId: { in: tenantIds } } })
            ).count;
            counts.PlatformIdempotencyRecord = (
              await tx.platformIdempotencyRecord.deleteMany({ where: { tenantId: { in: tenantIds } } })
            ).count;
          }

          counts.BillingSubscription = (
            await tx.billingSubscription.deleteMany({
              where: {
                OR: [
                  { organizationId },
                  ...(tenantIds.length > 0 ? [{ tenantId: { in: tenantIds } }] : []),
                ],
              },
            })
          ).count;

          counts.PlatformPluginUsage = (
            await tx.platformPluginUsage.deleteMany({
              where: {
                OR: [
                  ...(tenantIds.length > 0 ? [{ tenantId: { in: tenantIds } }] : []),
                  ...(projectIds.length > 0 ? [{ projectId: { in: projectIds } }] : []),
                ],
              },
            })
          ).count;

          counts.PlatformOperation = (
            await tx.platformOperation.deleteMany({
              where: {
                OR: [
                  { organizationId },
                  ...(tenantIds.length > 0 ? [{ tenantId: { in: tenantIds } }] : []),
                ],
              },
            })
          ).count;

          if (projectIds.length > 0) {
            counts.StudioAsset = (
              await tx.studioAsset.deleteMany({ where: { projectId: { in: projectIds } } })
            ).count;
            counts.StudioPage = (
              await tx.studioPage.deleteMany({ where: { projectId: { in: projectIds } } })
            ).count;
            counts.StudioSnapshot = (
              await tx.studioSnapshot.deleteMany({ where: { projectId: { in: projectIds } } })
            ).count;
          }

          counts.PlatformAuditEvent = (
            await tx.platformAuditEvent.deleteMany({
              where: {
                OR: [
                  { organizationId },
                  ...(projectIds.length > 0 ? [{ projectId: { in: projectIds } }] : []),
                ],
              },
            })
          ).count;

          // Pre-count cascaded platform rows before close_customer_organization deletes PlatformOrganization
          const orgExists = await tx.platformOrganization.findUnique({
            where: { id: organizationId },
            select: { id: true },
          });
          if (orgExists) {
            counts.AccountToken = await tx.accountToken.count({ where: { organizationId } });
            counts.CustomerMembership = await tx.customerMembership.count({ where: { organizationId } });
            counts.PlatformProject = await tx.platformProject.count({ where: { organizationId } });
            if (projectIds.length > 0) {
              counts.ProjectEnvironment = await tx.projectEnvironment.count({
                where: { projectId: { in: projectIds } },
              });
            }
            if ((checkpoint.environmentIds || []).length > 0) {
              counts.PlatformApiKey = await tx.platformApiKey.count({
                where: { environmentId: { in: checkpoint.environmentIds! } },
              });
              counts.PlatformCredential = await tx.platformCredential.count({
                where: { environmentId: { in: checkpoint.environmentIds! } },
              });
              counts.PackageInstallation = await tx.packageInstallation.count({
                where: { environmentId: { in: checkpoint.environmentIds! } },
              });
              counts.ProjectDomain = await tx.projectDomain.count({
                where: { environmentId: { in: checkpoint.environmentIds! } },
              });
            }

            await tx.$queryRaw`SELECT public.close_customer_organization(${organizationId})`;
            counts.PlatformOrganization = 1;
          }

          return counts;
        });

        checkpoint.platformRowsDeletedByTable = deletedPlatformCounts;
        checkpoint.orgClosed = true;
        await maintenance.organizationDeletionRequest.update({
          where: { id: req.id },
          data: {
            checkpoint: checkpoint as unknown as Prisma.InputJsonValue,
            updatedAt: now,
          },
        });
      }

      if (input.crashAfterStepForTesting === 'after_org_closed') {
        throw new Error('INJECTED_CRASH_AFTER_ORG_CLOSED');
      }

      // Step 5: Issue signed Ed25519 deletion certificate & tombstone request row
      const pluginsEntries: DeletionCertificatePluginEntry[] = [];
      for (const [key, rowsDeletedByTable] of Object.entries(checkpoint.completedPlugins || {})) {
        const lastColon = key.lastIndexOf(':');
        const tenantId = key.slice(0, lastColon);
        const pluginId = key.slice(lastColon + 1);
        pluginsEntries.push({ pluginId, tenantId, rowsDeletedByTable });
      }

      const certificate = buildSignedDeletionCertificate(
        {
          organizationId,
          organizationSlug: checkpoint.organizationSlug,
          requestId: req.id,
          requestedAt: req.requestedAt,
          scheduledFor: req.scheduledFor,
          completedAt: now,
          plugins: pluginsEntries,
          platformRowsDeletedByTable: checkpoint.platformRowsDeletedByTable || {},
          objectStoreObjectsDeleted: checkpoint.objectStoreObjectsDeleted || 0,
        },
        input.certEnv ?? process.env,
      );

      await maintenance.$transaction(async (tx) => {
        await tx.organizationDeletionRequest.update({
          where: { id: req.id },
          data: {
            status: 'COMPLETED',
            completedAt: now,
            certificate: certificate as unknown as Prisma.InputJsonValue,
            // Clear raw organizationId upon completion so information_schema sweeps find 0 org rows;
            // organizationDigest (SHA-256) + authorizedOwnerIds retain owner-only certificate retrieval.
            organizationId: null,
            updatedAt: now,
          },
        });

        for (const ownerEmail of checkpoint.ownerEmails || []) {
          await queueAccountEmail(tx, {
            recipient: ownerEmail,
            template: 'DELETION_COMPLETED',
            data: {},
          });
        }
      });

      completed += 1;
      certificates.push(certificate);
    }
  } finally {
    await maintenance.organizationDeletionRequest.count().catch(() => {});
    await maintenance.dataRightsSweepLease
      .updateMany({
        where: { id: 'global', leaseOwner },
        data: { leaseExpiresAt: new Date(0), updatedAt: new Date() },
      })
      .catch(() => {});
  }

  return { acquired: true, processed, completed, certificates };
}

export async function getOrganizationDeletionStatusForOwner(input: {
  organizationId: string;
  userId: string;
  runtimePrisma?: PrismaClient;
}): Promise<
  | { kind: 'forbidden' }
  | { kind: 'not_found' }
  | {
      kind: 'ok';
      request: {
        id: string;
        status: string;
        requestedAt: string;
        scheduledFor: string;
        cancelledAt: string | null;
        completedAt: string | null;
        certificate: SignedDeletionCertificate | null;
      } | null;
    }
> {
  const client = input.runtimePrisma ?? defaultRuntimePrisma;
  const membership = await client.customerMembership.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.userId,
      },
    },
    select: { role: true },
  });

  if (membership) {
    if (membership.role !== 'OWNER') return { kind: 'forbidden' };
    const latest = await client.organizationDeletionRequest.findFirst({
      where: { organizationId: input.organizationId },
      orderBy: { requestedAt: 'desc' },
    });
    return {
      kind: 'ok',
      request: latest
        ? {
            id: latest.id,
            status: latest.status,
            requestedAt: latest.requestedAt.toISOString(),
            scheduledFor: latest.scheduledFor.toISOString(),
            cancelledAt: latest.cancelledAt ? latest.cancelledAt.toISOString() : null,
            completedAt: latest.completedAt ? latest.completedAt.toISOString() : null,
            certificate: (latest.certificate as unknown as SignedDeletionCertificate | null) ?? null,
          }
        : null,
    };
  }

  // Org may have already completed Day-30 erasure (PlatformOrganization & CustomerMembership removed).
  const digest = digestOrganizationId(input.organizationId);
  const completedReq = await client.organizationDeletionRequest.findFirst({
    where: { organizationDigest: digest, status: 'COMPLETED' },
    orderBy: { completedAt: 'desc' },
  });
  if (!completedReq || !completedReq.authorizedOwnerIds.includes(input.userId)) {
    return { kind: 'not_found' };
  }

  return {
    kind: 'ok',
    request: {
      id: completedReq.id,
      status: completedReq.status,
      requestedAt: completedReq.requestedAt.toISOString(),
      scheduledFor: completedReq.scheduledFor.toISOString(),
      cancelledAt: null,
      completedAt: completedReq.completedAt ? completedReq.completedAt.toISOString() : null,
      certificate: (completedReq.certificate as unknown as SignedDeletionCertificate | null) ?? null,
    },
  };
}

export async function executePrincipalDataRightsRequest(input: {
  tenantId: string;
  pluginId: string;
  action: 'export' | 'correct' | 'erase';
  principal: PrincipalRef;
  patch?: PrincipalCorrectionPatch;
  mode?: ErasureMode;
  context: DataRightsContext;
  adapters?: DataRightsAdapters;
}): Promise<PrincipalExportSummary | PrincipalCorrectionSummary | PrincipalErasureSummary> {
  if (!input.context.reason?.trim()) {
    throw new HttpError(422, 'DSR_REASON_REQUIRED', 'A non-empty reason is required for principal data-rights actions.');
  }
  const adapters = input.adapters ?? createDefaultDataRightsAdapters();
  const canonical = normalizeDataRightsPluginId(input.pluginId);
  const adapter =
    canonical === '@orbitox/hms'
      ? adapters.hms
      : canonical === '@orbitox/restaurant'
        ? adapters.restaurant
        : null;
  if (!adapter) {
    throw new HttpError(422, 'UNSUPPORTED_PLUGIN', `Plugin "${input.pluginId}" does not support 6G data-rights.`);
  }

  if (input.action === 'export') {
    return adapter.principalExport(input.tenantId, input.principal, input.context);
  }
  if (input.action === 'correct') {
    return adapter.principalCorrect(
      input.tenantId,
      input.principal,
      input.patch ?? { fields: {} },
      input.context,
    );
  }
  if (input.action === 'erase') {
    const mode =
      input.mode ??
      resolvePluginErasureMode(canonical, process.env.ORBITOX_PLUGIN_ERASURE_POLICY);
    return adapter.principalErase(input.tenantId, input.principal, mode, input.context);
  }
  throw new HttpError(422, 'INVALID_DSR_ACTION', `Unsupported action "${String(input.action)}"`);
}
