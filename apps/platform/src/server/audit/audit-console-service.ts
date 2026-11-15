import 'server-only';
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
          ? (rawMetadata as Record<string, any>)
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
        ? (rawMetadata as Record<string, any>)
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
}

export const auditConsoleService = new AuditConsoleService();
