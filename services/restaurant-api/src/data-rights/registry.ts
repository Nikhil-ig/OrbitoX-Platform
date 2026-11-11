/**
 * OrbitoX 6G Data-Rights Bridge Handlers for RestaurantOS (G1, G2, G3, G4)
 * Executed strictly behind verifiedBridge (@orbitox-io/bridge HMAC-SHA256 + nonce replay guard).
 */

import * as crypto from 'node:crypto';
import { PrismaClient } from '../../generated/prisma';
import { withTenantRlsTransaction } from '../../packages/domain/tenancy';

export type RestaurantErasureMode = 'DELETE' | 'RESTRICT';

export interface RestaurantDataRightsContext {
  actorId: string;
  actorEmail?: string | null;
  reason: string;
  requestId?: string;
}

export interface RestaurantPrincipalRef {
  kind: string;
  id?: string;
  email?: string;
  phone?: string;
  name?: string;
}

export interface RestaurantModelDataRightsSpec {
  model: string;
  delegate?: string;
  tenantScoped: boolean;
  cascadeDeleted: boolean;
  exportPolicy: 'INCLUDE' | 'EXCLUDE';
  exclusionReason?: string;
  exportColumns?: readonly string[];
  omittedColumns?: readonly string[];
  orderBy?: Record<string, 'asc' | 'desc'>;
}

/**
 * Single source of truth for RestaurantOS data-rights export AND erasure.
 * Every model in prisma/schema.prisma MUST appear here; automated tests assert
 * complete schema coverage and non-empty reviewed exclusion reasons.
 */
export const RESTAURANT_MODEL_DATA_RIGHTS: readonly RestaurantModelDataRightsSpec[] = [
  {
    model: 'Tenant',
    delegate: 'tenant',
    tenantScoped: false,
    cascadeDeleted: false,
    exportPolicy: 'INCLUDE',
    exportColumns: [
      'id',
      'name',
      'slug',
      'status',
      'planId',
      'orbitoxProjectId',
      'currency',
      'timezone',
      'gstin',
      'retentionUntil',
      'onboardingState',
      'entitlementRevision',
      'createdAt',
      'updatedAt',
    ],
    omittedColumns: ['lastLifecycleKey'],
    orderBy: { id: 'asc' },
  },
  {
    model: 'Branch',
    delegate: 'branch',
    tenantScoped: true,
    cascadeDeleted: true,
    exportPolicy: 'INCLUDE',
    exportColumns: [
      'id',
      'tenantId',
      'name',
      'code',
      'address',
      'city',
      'timezone',
      'currency',
      'status',
      'serviceAreasCount',
      'activeTablesCount',
      'openingHours',
      'phone',
      'email',
      'createdAt',
      'updatedAt',
    ],
  },
  {
    model: 'Floor',
    delegate: 'floor',
    tenantScoped: true,
    cascadeDeleted: true,
    exportPolicy: 'INCLUDE',
    exportColumns: [
      'id',
      'tenantId',
      'branchId',
      'name',
      'type',
      'capacity',
      'activeLayout',
      'status',
      'tableIds',
      'serviceLayouts',
      'createdAt',
      'updatedAt',
    ],
  },
  {
    model: 'TableFloor',
    delegate: 'tableFloor',
    tenantScoped: true,
    cascadeDeleted: true,
    exportPolicy: 'INCLUDE',
    exportColumns: [
      'id',
      'tenantId',
      'numericId',
      'number',
      'capacity',
      'minimumSeats',
      'status',
      'x',
      'y',
      'width',
      'height',
      'rotation',
      'shape',
      'section',
      'floorId',
      'branchId',
      'locator',
      'seats',
      'activeSessionId',
      'activeBillMinor',
      'serverName',
      'turnTimeMinutes',
      'mergedWithTableIds',
      'mergedPartyLabel',
      'createdAt',
      'updatedAt',
    ],
  },
  {
    model: 'MenuCategory',
    delegate: 'menuCategory',
    tenantScoped: true,
    cascadeDeleted: true,
    exportPolicy: 'INCLUDE',
    exportColumns: [
      'id',
      'tenantId',
      'name',
      'description',
      'displayOrder',
      'isArchived',
      'color',
      'createdAt',
      'updatedAt',
    ],
  },
  {
    model: 'MenuItem',
    delegate: 'menuItem',
    tenantScoped: true,
    cascadeDeleted: true,
    exportPolicy: 'INCLUDE',
    exportColumns: [
      'id',
      'tenantId',
      'name',
      'description',
      'basePriceMinor',
      'formattedPrice',
      'category',
      'categoryId',
      'station',
      'prepDurationMinutes',
      'allergens',
      'dietaryFlags',
      'story',
      'pairingSuggestions',
      'isPopular',
      'isSignature',
      'isArchived',
      'modifierGroups',
      'imageUrl',
      'hsnCode',
      'createdAt',
      'updatedAt',
    ],
  },
  {
    model: 'BranchMenuOverride',
    delegate: 'branchMenuOverride',
    tenantScoped: true,
    cascadeDeleted: true,
    exportPolicy: 'INCLUDE',
    exportColumns: [
      'id',
      'tenantId',
      'itemId',
      'branchId',
      'isAvailable',
      'priceOverrideMinor',
      'formattedPriceOverride',
      'customPrepMinutes',
      'createdAt',
      'updatedAt',
    ],
  },
  {
    model: 'RestaurantOrder',
    delegate: 'restaurantOrder',
    tenantScoped: true,
    cascadeDeleted: true,
    exportPolicy: 'INCLUDE',
    exportColumns: [
      'id',
      'tenantId',
      'tableNumber',
      'sessionId',
      'branchId',
      'guestName',
      'status',
      'items',
      'subtotalMinor',
      'taxMinor',
      'totalMinor',
      'currency',
      'customer',
      'idempotencyKey',
      'paymentStatus',
      'paymentSessionId',
      'version',
      'createdAt',
      'updatedAt',
    ],
    omittedColumns: ['orderToken'],
  },
  {
    model: 'KitchenTask',
    delegate: 'kitchenTask',
    tenantScoped: true,
    cascadeDeleted: true,
    exportPolicy: 'INCLUDE',
    exportColumns: [
      'id',
      'tenantId',
      'orderId',
      'tableNumber',
      'branchId',
      'seatNumber',
      'guestName',
      'itemName',
      'quantity',
      'station',
      'status',
      'fireAt',
      'targetServeAt',
      'elapsedMinutes',
      'slaMinutes',
      'modifiers',
      'course',
      'fulfilledItemCount',
      'version',
      'createdAt',
      'updatedAt',
    ],
  },
  {
    model: 'ServiceRequest',
    delegate: 'serviceRequest',
    tenantScoped: true,
    cascadeDeleted: true,
    exportPolicy: 'INCLUDE',
    exportColumns: ['id', 'tenantId', 'tableNumber', 'branchId', 'floorId', 'type', 'status', 'requestedAt', 'note'],
  },
  {
    model: 'DiningSession',
    delegate: 'diningSession',
    tenantScoped: true,
    cascadeDeleted: true,
    exportPolicy: 'INCLUDE',
    exportColumns: [
      'id',
      'tenantId',
      'tableNumber',
      'branchId',
      'floorId',
      'hostName',
      'status',
      'openedAt',
      'expiresAt',
      'closedAt',
      'settlement',
    ],
    omittedColumns: ['guestCapabilityTokens'],
  },
  {
    model: 'Guest',
    delegate: 'guest',
    tenantScoped: true,
    cascadeDeleted: true,
    exportPolicy: 'INCLUDE',
    exportColumns: [
      'id',
      'tenantId',
      'name',
      'tableNumber',
      'seatId',
      'seatLabel',
      'role',
      'joinTime',
      'preferences',
      'orderIds',
      'totalSpendMinor',
    ],
  },
  {
    model: 'StaffMember',
    delegate: 'staffMember',
    tenantScoped: true,
    cascadeDeleted: true,
    exportPolicy: 'INCLUDE',
    exportColumns: ['id', 'tenantId', 'name', 'role', 'branchId', 'station', 'status', 'permissions', 'createdAt', 'updatedAt'],
    omittedColumns: ['salt', 'pinHash'],
  },
  {
    model: 'StaffTokenRevocation',
    delegate: 'staffTokenRevocation',
    tenantScoped: true,
    cascadeDeleted: true,
    exportPolicy: 'INCLUDE',
    exportColumns: ['id', 'tenantId', 'tokenJti', 'revokedAt', 'reason'],
  },
  {
    model: 'TenantBrandConfig',
    delegate: 'tenantBrandConfig',
    tenantScoped: true,
    cascadeDeleted: true,
    exportPolicy: 'INCLUDE',
    exportColumns: ['id', 'tenantId', 'config', 'createdAt', 'updatedAt'],
  },
  {
    model: 'SupportTicket',
    delegate: 'supportTicket',
    tenantScoped: true,
    cascadeDeleted: true,
    exportPolicy: 'INCLUDE',
    exportColumns: ['id', 'tenantId', 'branchId', 'title', 'status', 'priority', 'category', 'messages', 'createdAt', 'updatedAt'],
  },
  {
    model: 'DomainEvent',
    delegate: 'domainEvent',
    tenantScoped: true,
    cascadeDeleted: true,
    exportPolicy: 'INCLUDE',
    exportColumns: ['id', 'tenantId', 'sequence', 'type', 'timestamp', 'producer', 'branchId', 'floorId', 'tableNumber', 'payload'],
  },
  {
    model: 'IdempotencyRecord',
    delegate: 'idempotencyRecord',
    tenantScoped: true,
    cascadeDeleted: true,
    exportPolicy: 'INCLUDE',
    exportColumns: ['key', 'tenantId', 'result', 'createdAt', 'expiresAt'],
    orderBy: { key: 'asc' },
  },
  {
    model: 'Invoice',
    delegate: 'invoice',
    tenantScoped: true,
    cascadeDeleted: true,
    exportPolicy: 'INCLUDE',
    exportColumns: [
      'id',
      'tenantId',
      'orderId',
      'invoiceNumber',
      'fiscalYear',
      'sequenceNumber',
      'gstin',
      'subtotalMinor',
      'taxMinor',
      'totalMinor',
      'currency',
      'itemBreakdown',
      'taxBreakdown',
      'customer',
      'createdAt',
    ],
  },
  {
    model: 'RazorpayPaymentSession',
    delegate: 'razorpayPaymentSession',
    tenantScoped: true,
    cascadeDeleted: true,
    exportPolicy: 'INCLUDE',
    exportColumns: [
      'id',
      'tenantId',
      'orderId',
      'tableNumber',
      'amountMinor',
      'currency',
      'status',
      'razorpayPaymentId',
      'createdAt',
      'updatedAt',
    ],
    omittedColumns: ['razorpaySignature'],
  },
  {
    model: 'OwnerInvite',
    delegate: 'ownerInvite',
    tenantScoped: true,
    cascadeDeleted: true,
    exportPolicy: 'INCLUDE',
    exportColumns: ['id', 'tenantId', 'staffMemberId', 'expiresAt', 'usedAt', 'createdAt'],
    omittedColumns: ['tokenHash'],
  },
  {
    model: 'TenantDomain',
    delegate: 'tenantDomain',
    tenantScoped: true,
    cascadeDeleted: true,
    exportPolicy: 'INCLUDE',
    exportColumns: [
      'id',
      'tenantId',
      'domain',
      'verificationStatus',
      'verifiedAt',
      'sslStatus',
      'lastCheckedAt',
      'cnameTarget',
      'createdAt',
      'updatedAt',
    ],
    omittedColumns: ['verificationToken'],
  },
  {
    model: 'TenantPaymentConfig',
    tenantScoped: true,
    cascadeDeleted: true,
    exportPolicy: 'EXCLUDE',
    exclusionReason:
      'Contains AES-256-GCM encrypted payment gateway keys and webhook secrets; non-secret tax metadata (gstin) is exported via Tenant and Invoice.',
  },
  {
    model: 'PluginGrantRevision',
    delegate: 'pluginGrantRevision',
    tenantScoped: true,
    cascadeDeleted: false,
    exportPolicy: 'INCLUDE',
    exportColumns: ['tenantId', 'pluginId', 'highestRevision', 'updatedAt'],
    orderBy: { pluginId: 'asc' },
  },
  {
    model: 'BridgeNonce',
    tenantScoped: false,
    cascadeDeleted: false,
    exportPolicy: 'EXCLUDE',
    exclusionReason: 'Ephemeral platform bridge replay-protection nonces without tenantId or personal data.',
  },
] as const;

export const TENANT_CASCADE_TABLES = RESTAURANT_MODEL_DATA_RIGHTS.filter((m) => m.cascadeDeleted).map(
  (m) => m.model,
);

export const RESTAURANT_NON_CASCADE_TENANT_TABLES = RESTAURANT_MODEL_DATA_RIGHTS.filter(
  (m) => m.tenantScoped && !m.cascadeDeleted,
).map((m) => m.model);

export const RESTAURANT_EXPORTED_MODELS = RESTAURANT_MODEL_DATA_RIGHTS.filter(
  (m) => m.exportPolicy === 'INCLUDE',
).map((m) => m.model);

export const RESTAURANT_REVIEWED_MODEL_EXCLUSIONS: Record<string, string> = Object.fromEntries(
  RESTAURANT_MODEL_DATA_RIGHTS.filter((m) => m.exportPolicy === 'EXCLUDE' && m.exclusionReason).map((m) => [
    m.model,
    m.exclusionReason!,
  ]),
);

function resolveAllowedCaller(scopes: string[] | undefined): boolean {
  if (!Array.isArray(scopes)) return false;
  return (
    scopes.includes('platform:superuser') ||
    scopes.includes('data-rights:*') ||
    scopes.includes('tenant:admin')
  );
}

export function assertPlatformBridgeCaller(verifiedBridge: {
  tenantId: string;
  principal?: { sub?: string; scopes?: string[] };
} | null): { tenantId: string; actorSub: string } {
  if (!verifiedBridge) {
    const err = new Error('Signed bridge credentials are required.');
    (err as any).statusCode = 401;
    (err as any).code = 'BRIDGE_SIGNATURE_REQUIRED';
    throw err;
  }
  if (
    !verifiedBridge.principal?.sub ||
    !resolveAllowedCaller(verifiedBridge.principal.scopes)
  ) {
    const err = new Error('Bridge principal lacks data-rights authorization.');
    (err as any).statusCode = 403;
    (err as any).code = 'BRIDGE_CALLER_FORBIDDEN';
    throw err;
  }
  return {
    tenantId: verifiedBridge.tenantId,
    actorSub: verifiedBridge.principal.sub,
  };
}

function serializeValue(val: unknown): unknown {
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'bigint') return val.toString();
  return val;
}

export function normalizeRows(rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      out[k] = serializeValue(v);
    }
    return out;
  });
}

export async function resolveTargetTenantId(prisma: PrismaClient, candidate: string): Promise<string | null> {
  const found = await prisma.tenant.findFirst({
    where: {
      OR: [{ id: candidate }, { slug: candidate }, { orbitoxProjectId: candidate }],
    },
    select: { id: true },
  });
  return found?.id ?? null;
}

export async function appendDataRightsDomainEvent(
  tx: any,
  tenantId: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const agg = await tx.domainEvent.aggregate({
    where: { tenantId },
    _max: { sequence: true },
  });
  const nextSeq = (agg?._max?.sequence ?? 0) + 1;
  const created = await tx.domainEvent.create({
    data: {
      id: `evt_dsr_${crypto.randomUUID().replace(/-/g, '')}`,
      tenantId,
      sequence: nextSeq,
      type,
      producer: 'platform-data-rights',
      branchId: 'main',
      payload,
    },
    select: { id: true },
  });
  return created.id;
}

export function matchesPrincipalObject(
  row: { id: string; guestName?: string | null; customer?: unknown; name?: string | null },
  principal: RestaurantPrincipalRef,
): boolean {
  if (principal.id && row.id === principal.id) return true;
  if (principal.name && (row.name === principal.name || row.guestName === principal.name)) {
    return true;
  }
  const cust =
    row.customer && typeof row.customer === 'object' && !Array.isArray(row.customer)
      ? (row.customer as Record<string, unknown>)
      : null;
  if (!cust) return false;
  if (principal.email && typeof cust.email === 'string' && cust.email.toLowerCase() === principal.email.toLowerCase()) {
    return true;
  }
  if (principal.phone && typeof cust.phone === 'string' && cust.phone === principal.phone) {
    return true;
  }
  if (principal.id && typeof cust.id === 'string' && cust.id === principal.id) {
    return true;
  }
  return false;
}

