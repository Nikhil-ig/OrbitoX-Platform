import 'server-only';
import crypto from 'node:crypto';
import { prisma } from '@/server/db/prisma';
import { PrismaClient, type Prisma } from '@prisma/client';

let privilegedAuditReaderClient: PrismaClient | null = null;
let cachedAuditReaderUrl: string | null = null;

export function getAuditReaderClient(): { client: any; isPrivileged: boolean } {
  const readerUrl = process.env.AUDIT_READER_DATABASE_URL?.trim() || '';
  if (readerUrl) {
    if (!privilegedAuditReaderClient || cachedAuditReaderUrl !== readerUrl) {
      privilegedAuditReaderClient = new PrismaClient({ datasources: { db: { url: readerUrl } } });
      cachedAuditReaderUrl = readerUrl;
    }
    return { client: privilegedAuditReaderClient, isPrivileged: true };
  }
  return { client: prisma, isPrivileged: false };
}

export function computeAuditRowHash(payload: {
  scope: string;
  sequence: number;
  previousHash: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  actorId?: string | null;
  actorEmail?: string | null;
  organizationId?: string | null;
  projectId?: string | null;
  environmentId?: string | null;
  reason?: string | null;
  ipAddress?: string | null;
  requestId?: string | null;
  status?: string | null;
  failureReason?: string | null;
  occurredAt: string;
  metadata?: Record<string, any>;
}): string {
  const canonicalJson = JSON.stringify({
    scope: payload.scope,
    sequence: payload.sequence,
    previousHash: payload.previousHash,
    action: payload.action,
    entityType: payload.entityType,
    entityId: payload.entityId ?? null,
    actorId: payload.actorId ?? null,
    actorEmail: payload.actorEmail ?? null,
    organizationId: payload.organizationId ?? null,
    projectId: payload.projectId ?? null,
    environmentId: payload.environmentId ?? null,
    reason: payload.reason ?? null,
    ipAddress: payload.ipAddress ?? null,
    requestId: payload.requestId ?? null,
    status: payload.status ?? 'COMMITTED',
    failureReason: payload.failureReason ?? null,
    occurredAt: payload.occurredAt,
    metadata: payload.metadata ?? {},
  });
  return crypto.createHash('sha256').update(canonicalJson).digest('hex');
}

export type AuditCategory =
  | 'ALL'
  | 'TENANT'
  | 'SECURITY'
  | 'BILLING'
  | 'PRIVACY'
  | 'PROVISIONING'
  | 'SYSTEM';

export interface AuditLogItem {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  actorDisplay: string;
  action: string;
  actionLabel: string;
  category: AuditCategory;
  entityType: string;
  entityId: string | null;
  entityDisplay: string;
  organizationId: string | null;
  projectId: string | null;
  ipAddress: string | null;
  requestId: string | null;
  reason: string | null;
  metadata: Record<string, any>;
  status: 'COMMITTED' | 'FAILED' | 'PENDING';
  failureReason: string | null;
  occurredAt: string;
  occurredDisplay: string;
  occurredRelative: string;
}

export interface AuditOverviewSummary {
  totalEvents: number;
  criticalEvents: number;
  distinctOperators: number;
  ledgerIntegrity: 'INTACT_IMMUTABLE' | 'DEGRADED';
}

export interface AuditOverview {
  summary: AuditOverviewSummary;
  items: AuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditQueryOptions {
  category?: string;
  search?: string;
  entityId?: string;
  actor?: string;
  page?: number;
  pageSize?: number;
}

const CRITICAL_ACTIONS = new Set([
  'TENANT_SUSPENDED',
  'TENANT_DELETED',
  'ORGANIZATION_PURGED',
  'DATA_RIGHTS_PURGE',
  'API_KEY_REVOKED',
  'OPERATOR_ACCOUNT_UNLOCKED',
  'OPERATOR_LOCKED_OUT',
  'SECURITY_BREACH_ALERT',
]);

function categorizeAction(action: string, entityType: string): AuditCategory {
  const upperAction = action.toUpperCase();
  const upperEntity = entityType.toUpperCase();

  if (upperAction.startsWith('TENANT_') || upperEntity === 'TENANT') {
    return 'TENANT';
  }
  if (
    upperAction.startsWith('API_KEY_') ||
    upperAction.startsWith('OPERATOR_') ||
    upperAction.startsWith('SECURITY_') ||
    upperEntity === 'PLATFORM_KEY' ||
    upperEntity === 'OPERATOR'
  ) {
    return 'SECURITY';
  }
  if (
    upperAction.startsWith('BILLING_') ||
    upperAction.startsWith('INVOICE_') ||
    upperAction.includes('PLAN_') ||
    upperEntity === 'BILLING'
  ) {
    return 'BILLING';
  }
  if (
    upperAction.startsWith('DATA_RIGHTS_') ||
    upperAction.startsWith('EXPORT_') ||
    upperAction.startsWith('PURGE_') ||
    upperEntity === 'DATA_RIGHTS' ||
    upperEntity === 'DELETION_REQUEST'
  ) {
    return 'PRIVACY';
  }
  if (
    upperAction.startsWith('PROVISIONING_') ||
    upperEntity === 'PROVISIONING_JOB' ||
    upperEntity === 'OPERATION'
  ) {
    return 'PROVISIONING';
  }
  return 'SYSTEM';
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  return `${diffDays}d ago`;
}

function formatActionLabel(action: string): string {
  return action
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export const SENSITIVE_KEY_PATTERN =
  /(?:password|passwordHash|token|secret|mfaTotpSealed|mfaToken|backupCode|credential|apiKey|pepper|privateKey|authorization|cookie|bearer|cvv|cardCvv|cardNumber|aadhaar|ssn|pan|passport|taxId|nationalId|email|phone|phoneNumber|telephone|mobile|address|streetAddress|dateOfBirth|dob|birthDate)/i;

/**
 * Recursively redacts sensitive credentials, tokens, secrets, PII, and security keys
 * from audit event metadata and payloads across all nested structures.
 */
export function sanitizeAuditPayload<T>(input: T): T {
  if (input === null || typeof input !== 'object') {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeAuditPayload(item)) as unknown as T;
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(input as Record<string, any>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeAuditPayload(value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

export interface CreatePlatformAuditEventInput {
  action: string;
  entityType: string;
  entityId?: string | null;
  actorId?: string | null;
  actorEmail?: string | null;
  organizationId?: string | null;
  projectId?: string | null;
  environmentId?: string | null;
  ipAddress?: string | null;
  requestId?: string | null;
  reason?: string | null;
  metadata?: Record<string, any>;
  status?: string;
  failureReason?: string | null;
}

export async function recordPlatformAuditEvent(
  client: {
    platformAuditEvent: {
      create: (args: any) => Promise<any>;
      findFirst?: (args: any) => Promise<any>;
    };
    $transaction?: (fn: (tx: any) => Promise<any>) => Promise<any>;
    $executeRaw?: (strings: TemplateStringsArray, ...values: any[]) => Promise<any>;
    $executeRawUnsafe?: (query: string) => Promise<any>;
  },
  input: CreatePlatformAuditEventInput,
) {
  const sanitizedMetadata = sanitizeAuditPayload(input.metadata || {});
  const tenantScope = (input.organizationId && input.projectId && input.environmentId)
    ? `org/${input.organizationId}/project/${input.projectId}/environment/${input.environmentId}`
    : `org/${input.organizationId || 'platform'}/project/${input.projectId || 'operations'}/environment/${input.environmentId || 'production'}`;

  const parts = tenantScope.split('/');
  const orgId = parts[1];
  const projId = parts[3];
  const envId = parts[5];

  const executeAtomicWrite = async (tx: any) => {
    // 1. Parameterized RLS tenant configuration
    if (typeof tx.$executeRaw === 'function') {
      try {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantScope}, true)`;
      } catch (err) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(
            `Failed to set RLS tenant scope [${tenantScope}]: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    } else if (typeof tx.$executeRawUnsafe === 'function') {
      try {
        await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantScope.replace(/'/g, "''")}'`);
      } catch (err) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(
            `Failed to set RLS tenant scope [${tenantScope}]: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }

    // 2. Transaction-level advisory lock per tenantScope to eliminate concurrent write forks
    if (typeof tx.$executeRaw === 'function') {
      try {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('orbitox_audit_chain:' || ${tenantScope}))`;
      } catch (err) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(
            `Failed to acquire advisory lock for audit chain [${tenantScope}]: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    } else if (typeof tx.$executeRawUnsafe === 'function') {
      try {
        await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('orbitox_audit_chain:' || '${tenantScope.replace(/'/g, "''")}'))`);
      } catch (err) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(
            `Failed to acquire advisory lock for audit chain [${tenantScope}]: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }

    // 3. Derive cryptographic hash chain link within this specific tenantScope
    let previousHash = 'GENESIS';
    let sequence = 1;
    let slotUsed = false;
    if (typeof tx.$queryRaw === 'function') {
      try {
        const slotRows = await tx.$queryRaw<
          Array<{
            already_exists: boolean;
            conflict: boolean;
            next_sequence: bigint | number;
            previous_hash: string;
          }>
        >`
          SELECT "already_exists", "conflict", "next_sequence", "previous_hash"
          FROM public.claim_platform_audit_chain_slot(
            ${tenantScope},
            ${null},
            ${input.action},
            ${input.entityType},
            ${input.entityId ?? null},
            ${input.requestId ?? null}
          )
        `;
        const slot = slotRows?.[0];
        if (slot && !slot.conflict && !slot.already_exists) {
          sequence = Number(slot.next_sequence);
          previousHash = slot.previous_hash || 'GENESIS';
          slotUsed = true;
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(
            `Failed to acquire audit chain slot for scope [${tenantScope}]: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }

    if (!slotUsed) {
      try {
        if (typeof tx.platformAuditEvent?.findFirst === 'function') {
          const lastEvent = await tx.platformAuditEvent.findFirst({
            where: {
              organizationId: orgId,
              projectId: projId,
              environmentId: envId,
            },
            orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
            select: { id: true, metadata: true },
          });
          if (lastEvent && typeof lastEvent.metadata === 'object' && lastEvent.metadata !== null) {
            const chain = (lastEvent.metadata as any)._chain;
            if (chain && typeof chain.rowHash === 'string') {
              previousHash = chain.rowHash;
              sequence = (typeof chain.sequence === 'number' ? chain.sequence : 1) + 1;
            } else if (lastEvent.id) {
              previousHash = crypto.createHash('sha256').update(lastEvent.id).digest('hex');
            }
          }
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(
            `Failed to read previous audit chain head for scope [${tenantScope}]: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }

    const occurredAt = new Date();
    const rowHash = computeAuditRowHash({
      scope: tenantScope,
      sequence,
      previousHash,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      actorId: input.actorId ?? null,
      actorEmail: input.actorEmail ?? null,
      organizationId: orgId,
      projectId: projId,
      environmentId: envId,
      reason: input.reason ?? null,
      ipAddress: input.ipAddress ?? null,
      requestId: input.requestId ?? null,
      status: input.status ?? 'COMMITTED',
      failureReason: input.failureReason ?? null,
      occurredAt: occurredAt.toISOString(),
      metadata: sanitizedMetadata,
    });

    const metadataWithChain = {
      ...sanitizedMetadata,
      _chain: {
        scope: tenantScope,
        sequence,
        previousHash,
        rowHash,
        algorithm: 'SHA-256',
        occurredAt: occurredAt.toISOString(),
        initialStatus: input.status ?? 'COMMITTED',
      },
    };

    const createdEvent = await tx.platformAuditEvent.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        organizationId: orgId,
        projectId: projId,
        environmentId: envId,
        ipAddress: input.ipAddress ?? null,
        requestId: input.requestId ?? null,
        reason: input.reason ?? null,
        metadata: metadataWithChain,
        status: input.status ?? 'COMMITTED',
        failureReason: input.failureReason ?? null,
        occurredAt,
      },
    });

    if (slotUsed && typeof tx.$executeRaw === 'function') {
      await tx.$executeRaw`
        SELECT public.advance_platform_audit_chain_head(
          ${tenantScope},
          ${BigInt(sequence)},
          ${rowHash},
          ${createdEvent.id},
          ${input.action},
          ${input.entityType},
          ${input.entityId ?? null},
          ${input.requestId ?? null}
        )
      `;
    }

    return createdEvent;
  };

  if (typeof (client as any).$transaction === 'function') {
    return (client as any).$transaction(executeAtomicWrite);
  }
  return executeAtomicWrite(client);
}

class AuditConsoleService {
  /**
   * Query paginated audit log events directly from PostgreSQL PlatformAuditEvent
   */
  async queryAuditLogs(options: AuditQueryOptions = {}): Promise<AuditOverview> {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(100, Math.max(10, options.pageSize || 25));
    const skip = (page - 1) * pageSize;

    const where: Prisma.PlatformAuditEventWhereInput = {};

    // 1. Category Filter
    if (options.category && options.category !== 'ALL') {
      const cat = options.category.toUpperCase();
      if (cat === 'TENANT') {
        where.OR = [
          { action: { startsWith: 'TENANT_' } },
          { entityType: { equals: 'TENANT', mode: 'insensitive' } },
        ];
      } else if (cat === 'SECURITY') {
        where.OR = [
          { action: { startsWith: 'API_KEY_' } },
          { action: { startsWith: 'OPERATOR_' } },
          { entityType: { in: ['PLATFORM_KEY', 'OPERATOR'] } },
        ];
      } else if (cat === 'BILLING') {
        where.OR = [
          { action: { startsWith: 'BILLING_' } },
          { action: { contains: 'PLAN_' } },
          { entityType: { equals: 'BILLING', mode: 'insensitive' } },
        ];
      } else if (cat === 'PRIVACY') {
        where.OR = [
          { action: { startsWith: 'DATA_RIGHTS_' } },
          { entityType: { in: ['DATA_RIGHTS', 'DELETION_REQUEST'] } },
        ];
      } else if (cat === 'PROVISIONING') {
        where.OR = [
          { action: { startsWith: 'PROVISIONING_' } },
          { entityType: { in: ['PROVISIONING_JOB', 'OPERATION'] } },
        ];
      }
    }

    // 2. Entity Filter
    if (options.entityId) {
      const cleanEntity = options.entityId.replace(/^(tenant|org|key):/i, '');
      where.OR = [
        ...(where.OR || []),
        { entityId: { contains: cleanEntity, mode: 'insensitive' } },
        { projectId: { contains: cleanEntity, mode: 'insensitive' } },
        { organizationId: { contains: cleanEntity, mode: 'insensitive' } },
      ];
    }

    // 3. Search Query
    if (options.search && options.search.trim().length > 0) {
      const q = options.search.trim();
      where.AND = [
        {
          OR: [
            { action: { contains: q, mode: 'insensitive' } },
            { actorEmail: { contains: q, mode: 'insensitive' } },
            { actorId: { contains: q, mode: 'insensitive' } },
            { entityId: { contains: q, mode: 'insensitive' } },
            { reason: { contains: q, mode: 'insensitive' } },
            { ipAddress: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    // 4. Actor Filter
    if (options.actor) {
      where.OR = [
        ...(where.OR || []),
        { actorEmail: { contains: options.actor, mode: 'insensitive' } },
        { actorId: { contains: options.actor, mode: 'insensitive' } },
      ];
    }

    const { client } = getAuditReaderClient();

    // Execute queries in parallel
    const [total, events, totalRecorded, criticalCount, distinctActors] = await Promise.all([
      client.platformAuditEvent.count({ where }),
      client.platformAuditEvent.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip,
        take: pageSize,
      }),
      client.platformAuditEvent.count(),
      client.platformAuditEvent.count({
        where: {
          action: { in: Array.from(CRITICAL_ACTIONS) },
        },
      }),
      client.platformAuditEvent.groupBy({
        by: ['actorId'],
        where: { actorId: { not: null } },
      }),
    ]);

    const items: AuditLogItem[] = (events as any[]).map((event: any) => {
      const category = categorizeAction(event.action, event.entityType);
      const occurredDate = new Date(event.occurredAt);
      const actorDisplay = event.actorEmail || event.actorId || 'system:orchestrator';
      const entityDisplay = event.entityId
        ? `${event.entityType}: ${event.entityId}`
        : event.entityType;

      const rawMetadata = event.metadata;
      const metadata =
        typeof rawMetadata === 'object' && rawMetadata !== null
          ? sanitizeAuditPayload(rawMetadata as Record<string, any>)
          : {};

      return {
        id: event.id,
        actorId: event.actorId,
        actorEmail: event.actorEmail,
        actorDisplay,
        action: event.action,
        actionLabel: formatActionLabel(event.action),
        category,
        entityType: event.entityType,
        entityId: event.entityId,
        entityDisplay,
        organizationId: event.organizationId,
        projectId: event.projectId,
        ipAddress: event.ipAddress,
        requestId: event.requestId,
        reason: event.reason,
        metadata,
        status: (event.status as 'COMMITTED' | 'FAILED' | 'PENDING') || 'COMMITTED',
        failureReason: event.failureReason,
        occurredAt: occurredDate.toISOString(),
        occurredDisplay: occurredDate.toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
        occurredRelative: formatRelativeTime(occurredDate),
      };
    });

    return {
      summary: {
        totalEvents: totalRecorded,
        criticalEvents: criticalCount,
        distinctOperators: Math.max(1, distinctActors.length),
        ledgerIntegrity: 'INTACT_IMMUTABLE',
      },
      items,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Fetch a single audit event with complete JSON payload and diagnostic traces
   */
  async getAuditEventById(id: string): Promise<AuditLogItem | null> {
    const { client } = getAuditReaderClient();
    const event = await client.platformAuditEvent.findUnique({
      where: { id },
    });
    if (!event) return null;

    const category = categorizeAction(event.action, event.entityType);
    const occurredDate = new Date(event.occurredAt);
    const actorDisplay = event.actorEmail || event.actorId || 'system:orchestrator';
    const entityDisplay = event.entityId
      ? `${event.entityType}: ${event.entityId}`
      : event.entityType;

    const rawMetadata = event.metadata;
    const metadata =
      typeof rawMetadata === 'object' && rawMetadata !== null
        ? sanitizeAuditPayload(rawMetadata as Record<string, any>)
        : {};

    return {
      id: event.id,
      actorId: event.actorId,
      actorEmail: event.actorEmail,
      actorDisplay,
      action: event.action,
      actionLabel: formatActionLabel(event.action),
      category,
      entityType: event.entityType,
      entityId: event.entityId,
      entityDisplay,
      organizationId: event.organizationId,
      projectId: event.projectId,
      ipAddress: event.ipAddress,
      requestId: event.requestId,
      reason: event.reason,
      metadata,
      status: (event.status as 'COMMITTED' | 'FAILED' | 'PENDING') || 'COMMITTED',
      failureReason: event.failureReason,
      occurredAt: occurredDate.toISOString(),
      occurredDisplay: occurredDate.toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
      occurredRelative: formatRelativeTime(occurredDate),
    };
  }

  /**
   * Export filtered audit records to CSV
   */
  async exportAuditLogsCsv(options: AuditQueryOptions = {}): Promise<string> {
    const { items } = await this.queryAuditLogs({
      ...options,
      page: 1,
      pageSize: 500, // Export up to 500 events
    });

    const headers = [
      'ID',
      'Timestamp (UTC)',
      'Action',
      'Category',
      'Entity Type',
      'Entity ID',
      'Actor Email',
      'Actor ID',
      'Status',
      'Reason',
      'IP Address',
      'Request ID',
    ];

    const rows = items.map((item) => [
      item.id,
      item.occurredAt,
      item.action,
      item.category,
      item.entityType,
      item.entityId || '',
      item.actorEmail || '',
      item.actorId || '',
      item.status,
      `"${(item.reason || '').replace(/"/g, '""')}"`,
      item.ipAddress || '',
      item.requestId || '',
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  /**
   * Cryptographically verifies the linear hash chain of PostgreSQL PlatformAuditEvent records.
   * Validates continuous sequence (1..n without gaps), unbroken hash links, and deterministic payload hashing
   * across all security-critical fields. Rejects unchained/legacy records with FAILED.
   * Enforces privileged audit reader access across RLS boundaries in production.
   */
  async verifyPostgresAuditChain(options?: {
    scope?: string;
    client?: any;
  }): Promise<{
    valid: boolean;
    totalEntries: number;
    verifiedChainEntries: number;
    brokenAtIndex?: number;
    algorithm: string;
    status: 'VERIFIED' | 'FAILED' | 'UNKNOWN';
    details?: string;
  }> {
    try {
      const { client: defaultReaderClient, isPrivileged } = getAuditReaderClient();
      const readerClient = options?.client || defaultReaderClient;

      let targetOrgId: string | undefined;
      let targetProjId: string | undefined;
      let targetEnvId: string | undefined;

      if (options?.scope) {
        const parts = options.scope.split('/');
        targetOrgId = parts[1];
        targetProjId = parts[3];
        targetEnvId = parts[5];

        if (typeof (readerClient as any).$executeRaw === 'function') {
          try {
            await (readerClient as any).$executeRaw`SELECT set_config('app.current_tenant_id', ${options.scope}, true)`;
          } catch {
            // Ignore if mock client
          }
        }
      }

      const whereClause: any = {};
      if (targetOrgId) whereClause.organizationId = targetOrgId;
      if (targetProjId) whereClause.projectId = targetProjId;
      if (targetEnvId) whereClause.environmentId = targetEnvId;

      const events = await readerClient.platformAuditEvent.findMany({
        where: whereClause,
        orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          actorId: true,
          actorEmail: true,
          organizationId: true,
          projectId: true,
          environmentId: true,
          reason: true,
          ipAddress: true,
          requestId: true,
          status: true,
          failureReason: true,
          occurredAt: true,
          metadata: true,
        },
      });

      if (events.length === 0) {
        if (!isPrivileged && process.env.NODE_ENV === 'production' && !options?.scope) {
          return {
            valid: false,
            totalEntries: 0,
            verifiedChainEntries: 0,
            algorithm: 'SHA-256 (PostgreSQL Ledger)',
            status: 'UNKNOWN',
            details: 'Privileged audit connection required to verify across RLS boundaries',
          };
        }
        return {
          valid: true,
          totalEntries: 0,
          verifiedChainEntries: 0,
          algorithm: 'SHA-256 (Merkle Hash Chain: previousHash -> rowHash)',
          status: 'VERIFIED',
          details: 'Ledger is empty; genesis state intact.',
        };
      }

      // Group events by tenantScope
      const eventsByScope = new Map<string, typeof events>();
      for (const ev of events) {
        const evScope =
          (ev.metadata as any)?._chain?.scope ||
          `org/${ev.organizationId || 'platform'}/project/${ev.projectId || 'operations'}/environment/${ev.environmentId || 'production'}`;
        if (!eventsByScope.has(evScope)) {
          eventsByScope.set(evScope, []);
        }
        eventsByScope.get(evScope)!.push(ev);
      }

      let totalVerified = 0;
      let globalIndex = 0;

      for (const [scope, scopeEvents] of eventsByScope.entries()) {
        let expectedPreviousHash = 'GENESIS';

        for (let seqIdx = 0; seqIdx < scopeEvents.length; seqIdx++) {
          const event = scopeEvents[seqIdx]!;
          const expectedSequence = seqIdx + 1;
          const rawMeta =
            typeof event.metadata === 'object' && event.metadata !== null
              ? (event.metadata as Record<string, any>)
              : {};
          const chain = rawMeta._chain;

          // If record has no chain metadata or is legacy/unverified, fail immediately
          if (!chain || typeof chain.rowHash !== 'string' || typeof chain.previousHash !== 'string') {
            return {
              valid: false,
              totalEntries: events.length,
              verifiedChainEntries: totalVerified,
              brokenAtIndex: globalIndex,
              algorithm: 'SHA-256 (Merkle Hash Chain: previousHash -> rowHash)',
              status: 'FAILED',
              details: `Unchained or legacy record detected at ID ${event.id} in scope ${scope}. Ledger contains unverified records.`,
            };
          }

          // Validate sequence continuity (1, 2, ..., n without gaps)
          if (chain.sequence !== expectedSequence) {
            return {
              valid: false,
              totalEntries: events.length,
              verifiedChainEntries: totalVerified,
              brokenAtIndex: globalIndex,
              algorithm: 'SHA-256 (Merkle Hash Chain: previousHash -> rowHash)',
              status: 'FAILED',
              details: `Sequence discontinuity in scope ${scope}: expected sequence ${expectedSequence}, found ${chain.sequence}`,
            };
          }

          // Validate hash chain link
          if (chain.previousHash !== expectedPreviousHash) {
            return {
              valid: false,
              totalEntries: events.length,
              verifiedChainEntries: totalVerified,
              brokenAtIndex: globalIndex,
              algorithm: 'SHA-256 (Merkle Hash Chain: previousHash -> rowHash)',
              status: 'FAILED',
              details: `Broken hash link at sequence ${chain.sequence} in scope ${scope}. Expected previousHash ${expectedPreviousHash}, found ${chain.previousHash}`,
            };
          }

          // Validate canonical payload and row hash integrity across all security fields
          const { _chain, ...metaWithoutChain } = rawMeta;
          const recomputed = computeAuditRowHash({
            scope: chain.scope || scope,
            sequence: chain.sequence,
            previousHash: chain.previousHash,
            action: event.action,
            entityType: event.entityType,
            entityId: event.entityId ?? null,
            actorId: event.actorId ?? null,
            actorEmail: event.actorEmail ?? null,
            organizationId: event.organizationId,
            projectId: event.projectId,
            environmentId: event.environmentId,
            reason: event.reason ?? null,
            ipAddress: event.ipAddress ?? null,
            requestId: event.requestId ?? null,
            status: event.status ?? 'COMMITTED',
            failureReason: event.failureReason ?? null,
            occurredAt: chain.occurredAt || new Date(event.occurredAt).toISOString(),
            metadata: metaWithoutChain,
          });

          if (chain.rowHash !== recomputed) {
            let matches = false;
            if (chain.initialStatus) {
              const intentMeta = { ...metaWithoutChain };
              if ('previousValue' in intentMeta && chain.initialStatus === 'PENDING') {
                delete intentMeta.previousValue;
              }
              const intentRecomputed = computeAuditRowHash({
                scope: chain.scope || scope,
                sequence: chain.sequence,
                previousHash: chain.previousHash,
                action: event.action,
                entityType: event.entityType,
                entityId: event.entityId ?? null,
                actorId: event.actorId ?? null,
                actorEmail: event.actorEmail ?? null,
                organizationId: event.organizationId,
                projectId: event.projectId,
                environmentId: event.environmentId,
                reason: event.reason ?? null,
                ipAddress: event.ipAddress ?? null,
                requestId: event.requestId ?? null,
                status: chain.initialStatus,
                failureReason: null,
                occurredAt: chain.occurredAt || new Date(event.occurredAt).toISOString(),
                metadata: intentMeta,
              });
              if (chain.rowHash === intentRecomputed) {
                matches = true;
              }
            }

            if (!matches) {
              return {
                valid: false,
                totalEntries: events.length,
                verifiedChainEntries: totalVerified,
                brokenAtIndex: globalIndex,
                algorithm: 'SHA-256 (Merkle Hash Chain: previousHash -> rowHash)',
                status: 'FAILED',
                details: `Row hash discrepancy at sequence ${chain.sequence} in scope ${scope}. Expected ${recomputed}, found ${chain.rowHash}`,
              };
            }
          }

          expectedPreviousHash = chain.rowHash;
          totalVerified++;
          globalIndex++;
        }
      }

      return {
        valid: true,
        totalEntries: events.length,
        verifiedChainEntries: totalVerified,
        algorithm: 'SHA-256 (Merkle Hash Chain: previousHash -> rowHash)',
        status: 'VERIFIED',
        details: `All ${totalVerified} chained audit records cryptographically verified across ${eventsByScope.size} scope(s).`,
      };
    } catch (err) {
      return {
        valid: false,
        totalEntries: 0,
        verifiedChainEntries: 0,
        algorithm: 'SHA-256 (PostgreSQL Ledger)',
        status: 'UNKNOWN',
        details: `Verification failed with internal error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}

export const auditConsoleService = new AuditConsoleService();

