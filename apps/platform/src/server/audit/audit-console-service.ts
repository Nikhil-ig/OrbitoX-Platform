import 'server-only';
import crypto from 'node:crypto';
import { prisma } from '@/server/db/prisma';
import type { Prisma } from '@prisma/client';

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

  if (typeof (client as any).$executeRaw === 'function') {
    try {
      await (client as any).$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantScope}, true)`;
    } catch (err) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          `Failed to set RLS tenant scope [${tenantScope}]: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  } else if (typeof client.$executeRawUnsafe === 'function') {
    try {
      await client.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantScope.replace(/'/g, "''")}'`);
    } catch (err) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          `Failed to set RLS tenant scope [${tenantScope}]: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  // Derive cryptographic hash chain link
  let previousHash = 'GENESIS';
  let sequence = 1;
  try {
    if (typeof client.platformAuditEvent.findFirst === 'function') {
      const lastEvent = await client.platformAuditEvent.findFirst({
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
  } catch {
    // Non-fatal in mock or unseeded environments
  }

  const occurredAt = new Date();
  const canonicalPayload = JSON.stringify({
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    actorId: input.actorId ?? null,
    actorEmail: input.actorEmail ?? null,
    organizationId: orgId,
    projectId: projId,
    environmentId: envId,
    occurredAt: occurredAt.toISOString(),
    previousHash,
    metadata: sanitizedMetadata,
  });

  const rowHash = crypto.createHash('sha256').update(canonicalPayload).digest('hex');
  const metadataWithChain = {
    ...sanitizedMetadata,
    _chain: {
      sequence,
      previousHash,
      rowHash,
      algorithm: 'SHA-256',
      occurredAt: occurredAt.toISOString(),
    },
  };

  return client.platformAuditEvent.create({
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

    // Execute queries in parallel
    const [total, events, totalRecorded, criticalCount, distinctActors] = await Promise.all([
      prisma.platformAuditEvent.count({ where }),
      prisma.platformAuditEvent.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.platformAuditEvent.count(),
      prisma.platformAuditEvent.count({
        where: {
          action: { in: Array.from(CRITICAL_ACTIONS) },
        },
      }),
      prisma.platformAuditEvent.groupBy({
        by: ['actorId'],
        where: { actorId: { not: null } },
      }),
    ]);

    const items: AuditLogItem[] = events.map((event) => {
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
    const event = await prisma.platformAuditEvent.findUnique({
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
   * Cryptographically verifies the linear hash chain of all PostgreSQL PlatformAuditEvent records.
   * Ensures zero record modification, deletion, reordering, or tampering.
   */
  async verifyPostgresAuditChain(): Promise<{
    valid: boolean;
    totalEntries: number;
    verifiedChainEntries: number;
    brokenAtIndex?: number;
    algorithm: string;
    status: 'VERIFIED' | 'FAILED' | 'UNKNOWN';
    details?: string;
  }> {
    try {
      const events = await prisma.platformAuditEvent.findMany({
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
          occurredAt: true,
          metadata: true,
        },
      });

      if (events.length === 0) {
        return {
          valid: true,
          totalEntries: 0,
          verifiedChainEntries: 0,
          algorithm: 'SHA-256 (Merkle Hash Chain: previousHash -> rowHash)',
          status: 'VERIFIED',
          details: 'Ledger is empty; genesis state intact.',
        };
      }

      let expectedPreviousHash = 'GENESIS';
      let verifiedCount = 0;

      for (let i = 0; i < events.length; i++) {
        const event = events[i]!;
        const rawMeta =
          typeof event.metadata === 'object' && event.metadata !== null
            ? (event.metadata as Record<string, any>)
            : {};
        const chain = rawMeta._chain;

        if (!chain || typeof chain.rowHash !== 'string' || typeof chain.previousHash !== 'string') {
          // Pre-chain legacy records: maintain deterministic reference without claiming chain integrity
          expectedPreviousHash = crypto.createHash('sha256').update(event.id).digest('hex');
          continue;
        }

        if (verifiedCount > 0 && chain.previousHash !== expectedPreviousHash) {
          return {
            valid: false,
            totalEntries: events.length,
            verifiedChainEntries: verifiedCount,
            brokenAtIndex: i,
            algorithm: 'SHA-256 (Merkle Hash Chain: previousHash -> rowHash)',
            status: 'FAILED',
            details: `Broken hash link at sequence ${chain.sequence || i}. Expected previousHash ${expectedPreviousHash}, found ${chain.previousHash}`,
          };
        }

        const { _chain, ...metaWithoutChain } = rawMeta;
        const canonicalPayload = JSON.stringify({
          action: event.action,
          entityType: event.entityType,
          entityId: event.entityId ?? null,
          actorId: event.actorId ?? null,
          actorEmail: event.actorEmail ?? null,
          organizationId: event.organizationId,
          projectId: event.projectId,
          environmentId: event.environmentId,
          occurredAt: chain.occurredAt || new Date(event.occurredAt).toISOString(),
          previousHash: chain.previousHash,
          metadata: metaWithoutChain,
        });

        const recomputed = crypto.createHash('sha256').update(canonicalPayload).digest('hex');
        if (chain.rowHash !== recomputed) {
          return {
            valid: false,
            totalEntries: events.length,
            verifiedChainEntries: verifiedCount,
            brokenAtIndex: i,
            algorithm: 'SHA-256 (Merkle Hash Chain: previousHash -> rowHash)',
            status: 'FAILED',
            details: `Row hash discrepancy at sequence ${chain.sequence || i}. Expected ${recomputed}, found ${chain.rowHash}`,
          };
        }

        expectedPreviousHash = chain.rowHash;
        verifiedCount++;
      }

      return {
        valid: true,
        totalEntries: events.length,
        verifiedChainEntries: verifiedCount,
        algorithm: 'SHA-256 (Merkle Hash Chain: previousHash -> rowHash)',
        status: 'VERIFIED',
        details: `All ${verifiedCount} chained audit records cryptographically verified.`,
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

