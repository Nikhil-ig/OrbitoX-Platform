/**
 * OrbitoX 6G Data-Rights Bridge Handlers for RestaurantOS (G1, G2, G3, G4)
 * Executed strictly behind verifiedBridge (@orbitox-io/bridge HMAC-SHA256 + nonce replay guard).
 */

import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { withTenantRlsTransaction } from '../packages/domain/tenancy';

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

const TENANT_CASCADE_TABLES = [
  'Branch',
  'Floor',
  'TableFloor',
  'MenuCategory',
  'MenuItem',
  'BranchMenuOverride',
  'RestaurantOrder',
  'KitchenTask',
  'ServiceRequest',
  'DiningSession',
  'Guest',
  'StaffMember',
  'StaffTokenRevocation',
  'TenantBrandConfig',
  'SupportTicket',
  'DomainEvent',
  'IdempotencyRecord',
  'Invoice',
  'RazorpayPaymentSession',
  'OwnerInvite',
  'TenantDomain',
  'TenantPaymentConfig',
] as const;

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

function normalizeRows(rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      out[k] = serializeValue(v);
    }
    return out;
  });
}

async function resolveTargetTenantId(prisma: PrismaClient, candidate: string): Promise<string | null> {
  const found = await prisma.tenant.findFirst({
    where: {
      OR: [{ id: candidate }, { slug: candidate }, { orbitoxProjectId: candidate }],
    },
    select: { id: true },
  });
  return found?.id ?? null;
}

async function appendDataRightsDomainEvent(
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

function matchesPrincipalObject(
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

export async function exportRestaurantTenantData(
  prisma: PrismaClient,
  requestedTenantId: string,
): Promise<{
  contractVersion: 'v1';
  pluginId: '@orbitox/restaurant';
  tenantId: string;
  chunks: Array<{ table: string; columns: string[]; rows: Array<Record<string, unknown>> }>;
}> {
  const tenantId = await resolveTargetTenantId(prisma, requestedTenantId);
  if (!tenantId) {
    return {
      contractVersion: 'v1',
      pluginId: '@orbitox/restaurant',
      tenantId: requestedTenantId,
      chunks: [],
    };
  }

  const chunks = await withTenantRlsTransaction(prisma, tenantId, async (tx) => {
    const result: Array<{ table: string; columns: string[]; rows: Array<Record<string, unknown>> }> = [];

    const tenantRow = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        planId: true,
        orbitoxProjectId: true,
        currency: true,
        timezone: true,
        gstin: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (tenantRow) {
      result.push({
        table: 'Tenant',
        columns: Object.keys(tenantRow),
        rows: normalizeRows([tenantRow as unknown as Record<string, unknown>]),
      });
    }

    const pushRows = (table: string, cols: string[], rows: Array<Record<string, unknown>>) => {
      result.push({ table, columns: cols, rows: normalizeRows(rows) });
    };

    const branches = await tx.branch.findMany({ where: { tenantId }, orderBy: { id: 'asc' } });
    pushRows(
      'Branch',
      ['id', 'tenantId', 'name', 'code', 'address', 'city', 'timezone', 'currency', 'status', 'phone', 'email', 'createdAt', 'updatedAt'],
      branches as any,
    );

    const floors = await tx.floor.findMany({ where: { tenantId }, orderBy: { id: 'asc' } });
    pushRows('Floor', ['id', 'tenantId', 'branchId', 'name', 'type', 'capacity', 'status', 'createdAt'], floors as any);

    const tables = await tx.tableFloor.findMany({ where: { tenantId }, orderBy: { id: 'asc' } });
    pushRows('TableFloor', ['id', 'tenantId', 'number', 'capacity', 'status', 'floorId', 'branchId', 'locator', 'createdAt'], tables as any);

    const categories = await tx.menuCategory.findMany({ where: { tenantId }, orderBy: { id: 'asc' } });
    pushRows('MenuCategory', ['id', 'tenantId', 'name', 'description', 'displayOrder', 'isArchived'], categories as any);

    const menuItems = await tx.menuItem.findMany({ where: { tenantId }, orderBy: { id: 'asc' } });
    pushRows('MenuItem', ['id', 'tenantId', 'name', 'description', 'basePriceMinor', 'category', 'station', 'isArchived'], menuItems as any);

    const guests = await tx.guest.findMany({ where: { tenantId }, orderBy: { id: 'asc' } });
    pushRows('Guest', ['id', 'tenantId', 'name', 'tableNumber', 'role', 'joinTime', 'preferences', 'orderIds', 'totalSpendMinor'], guests as any);

    const staff = await tx.staffMember.findMany({
      where: { tenantId },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        tenantId: true,
        name: true,
        role: true,
        branchId: true,
        station: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    pushRows('StaffMember', ['id', 'tenantId', 'name', 'role', 'branchId', 'station', 'status', 'createdAt', 'updatedAt'], staff as any);

    const orders = await tx.restaurantOrder.findMany({ where: { tenantId }, orderBy: { id: 'asc' } });
    pushRows('RestaurantOrder', ['id', 'tenantId', 'tableNumber', 'sessionId', 'branchId', 'guestName', 'status', 'items', 'subtotalMinor', 'taxMinor', 'totalMinor', 'currency', 'customer', 'paymentStatus', 'createdAt'], orders as any);

    const invoices = await tx.invoice.findMany({ where: { tenantId }, orderBy: { id: 'asc' } });
    pushRows('Invoice', ['id', 'tenantId', 'orderId', 'invoiceNumber', 'fiscalYear', 'gstin', 'subtotalMinor', 'taxMinor', 'totalMinor', 'currency', 'customer', 'createdAt'], invoices as any);

    const tickets = await tx.supportTicket.findMany({ where: { tenantId }, orderBy: { id: 'asc' } });
    pushRows('SupportTicket', ['id', 'tenantId', 'branchId', 'title', 'status', 'priority', 'category', 'messages', 'createdAt'], tickets as any);

    const domains = await tx.tenantDomain.findMany({
      where: { tenantId },
      orderBy: { id: 'asc' },
      select: { id: true, tenantId: true, domain: true, verificationStatus: true, sslStatus: true, verifiedAt: true, createdAt: true },
    });
    pushRows('TenantDomain', ['id', 'tenantId', 'domain', 'verificationStatus', 'sslStatus', 'verifiedAt', 'createdAt'], domains as any);

    return result;
  });

  return {
    contractVersion: 'v1',
    pluginId: '@orbitox/restaurant',
    tenantId,
    chunks,
  };
}

export async function eraseRestaurantTenantData(
  prisma: PrismaClient,
  requestedTenantId: string,
  mode: RestaurantErasureMode,
  context: RestaurantDataRightsContext,
): Promise<{
  contractVersion: 'v1';
  pluginId: '@orbitox/restaurant';
  tenantId: string;
  mode: RestaurantErasureMode;
  rowsDeletedByTable: Record<string, number>;
  rowsRestrictedByTable: Record<string, number>;
}> {
  const tenantId = await resolveTargetTenantId(prisma, requestedTenantId);
  if (!tenantId) {
    return {
      contractVersion: 'v1',
      pluginId: '@orbitox/restaurant',
      tenantId: requestedTenantId,
      mode,
      rowsDeletedByTable: {},
      rowsRestrictedByTable: {},
    };
  }

  if (mode === 'RESTRICT') {
    const updated = await withTenantRlsTransaction(prisma, tenantId, async (tx) => {
      const t = await tx.tenant.updateMany({
        where: { id: tenantId },
        data: { status: 'suspended' },
      });
      await tx.staffMember.updateMany({
        where: { tenantId },
        data: { status: 'RESTRICTED' },
      });
      await appendDataRightsDomainEvent(tx, tenantId, 'tenant.data_rights.restricted', {
        actorId: context.actorId,
        reason: context.reason,
        mode: 'RESTRICT',
      });
      return t.count;
    });
    return {
      contractVersion: 'v1',
      pluginId: '@orbitox/restaurant',
      tenantId,
      mode: 'RESTRICT',
      rowsDeletedByTable: {},
      rowsRestrictedByTable: { Tenant: updated },
    };
  }

  const rowsDeletedByTable = await withTenantRlsTransaction(prisma, tenantId, async (tx) => {
    const counts: Record<string, number> = {};
    for (const table of TENANT_CASCADE_TABLES) {
      const res: Array<{ cnt: number }> = await tx.$queryRawUnsafe(
        `SELECT count(*)::int AS cnt FROM public."${table}" WHERE "tenantId" = $1`,
        tenantId,
      );
      counts[table] = Number(res[0]?.cnt ?? 0);
    }
    const grantRevRes: Array<{ cnt: number }> = await tx.$queryRawUnsafe(
      `SELECT count(*)::int AS cnt FROM public."PluginGrantRevision" WHERE "tenantId" = $1`,
      tenantId,
    );
    counts.PluginGrantRevision = Number(grantRevRes[0]?.cnt ?? 0);

    await tx.$executeRawUnsafe(
      `DELETE FROM public."PluginGrantRevision" WHERE "tenantId" = $1`,
      tenantId,
    );
    const tenantDel = await tx.tenant.deleteMany({ where: { id: tenantId } });
    counts.Tenant = tenantDel.count;
    return counts;
  });

  return {
    contractVersion: 'v1',
    pluginId: '@orbitox/restaurant',
    tenantId,
    mode: 'DELETE',
    rowsDeletedByTable,
    rowsRestrictedByTable: {},
  };
}

export async function exportRestaurantPrincipalData(
  prisma: PrismaClient,
  requestedTenantId: string,
  principal: RestaurantPrincipalRef,
  context: RestaurantDataRightsContext,
) {
  const tenantId = await resolveTargetTenantId(prisma, requestedTenantId);
  if (!tenantId) {
    const err = new Error('Tenant not found');
    (err as any).statusCode = 404;
    (err as any).code = 'TENANT_NOT_FOUND';
    throw err;
  }

  return withTenantRlsTransaction(prisma, tenantId, async (tx) => {
    const tables: Record<string, Array<Record<string, unknown>>> = {};

    if (principal.kind === 'staff') {
      const staffRows = await tx.staffMember.findMany({
        where: {
          tenantId,
          ...(principal.id ? { id: principal.id } : {}),
          ...(principal.name ? { name: principal.name } : {}),
        },
        select: {
          id: true,
          tenantId: true,
          name: true,
          role: true,
          branchId: true,
          station: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (staffRows.length === 0) {
        const err = new Error('Staff principal not found');
        (err as any).statusCode = 404;
        (err as any).code = 'PRINCIPAL_NOT_FOUND';
        throw err;
      }
      tables.StaffMember = normalizeRows(staffRows as any);
      const evtId = await appendDataRightsDomainEvent(tx, tenantId, 'data_rights.principal.export', {
        actorId: context.actorId,
        reason: context.reason,
        principalKind: 'staff',
        principalId: staffRows[0]!.id,
      });
      return {
        contractVersion: 'v1' as const,
        pluginId: '@orbitox/restaurant',
        tenantId,
        principal: { kind: 'staff', id: staffRows[0]!.id },
        tables,
        auditEventId: evtId,
      };
    }

    const allGuests = await tx.guest.findMany({ where: { tenantId } });
    const matchedGuests = allGuests.filter((g: any) => matchesPrincipalObject(g, principal));
    const allOrders = await tx.restaurantOrder.findMany({ where: { tenantId } });
    const matchedOrders = allOrders.filter((o: any) => matchesPrincipalObject(o, principal));
    const allInvoices = await tx.invoice.findMany({ where: { tenantId } });
    const matchedInvoices = allInvoices.filter((inv: any) => matchesPrincipalObject(inv, principal));

    if (matchedGuests.length === 0 && matchedOrders.length === 0 && matchedInvoices.length === 0) {
      const err = new Error('Guest/diner principal not found');
      (err as any).statusCode = 404;
      (err as any).code = 'PRINCIPAL_NOT_FOUND';
      throw err;
    }

    tables.Guest = normalizeRows(matchedGuests as any);
    tables.RestaurantOrder = normalizeRows(matchedOrders as any);
    tables.Invoice = normalizeRows(matchedInvoices as any);

    const refId = matchedGuests[0]?.id || principal.id || 'diner_match';
    const evtId = await appendDataRightsDomainEvent(tx, tenantId, 'data_rights.principal.export', {
      actorId: context.actorId,
      reason: context.reason,
      principalKind: principal.kind,
      principalId: refId,
    });

    return {
      contractVersion: 'v1' as const,
      pluginId: '@orbitox/restaurant',
      tenantId,
      principal: { kind: principal.kind || 'diner', id: refId },
      tables,
      auditEventId: evtId,
    };
  });
}

export async function correctRestaurantPrincipalData(
  prisma: PrismaClient,
  requestedTenantId: string,
  principal: RestaurantPrincipalRef,
  patch: { fields: Record<string, unknown> },
  context: RestaurantDataRightsContext,
) {
  const tenantId = await resolveTargetTenantId(prisma, requestedTenantId);
  if (!tenantId) {
    const err = new Error('Tenant not found');
    (err as any).statusCode = 404;
    (err as any).code = 'TENANT_NOT_FOUND';
    throw err;
  }

  return withTenantRlsTransaction(prisma, tenantId, async (tx) => {
    const fields = patch?.fields || {};
    const updatedFields: string[] = [];
    let updatedCount = 0;

    if (principal.kind === 'staff') {
      const existing = await tx.staffMember.findFirst({
        where: {
          tenantId,
          ...(principal.id ? { id: principal.id } : { name: principal.name || '' }),
        },
      });
      if (!existing) {
        const err = new Error('Staff principal not found');
        (err as any).statusCode = 404;
        (err as any).code = 'PRINCIPAL_NOT_FOUND';
        throw err;
      }
      if (existing.status === 'RESTRICTED') {
        const err = new Error('Staff record is legally restricted');
        (err as any).statusCode = 409;
        (err as any).code = 'PRINCIPAL_PROCESSING_RESTRICTED';
        throw err;
      }
      const updateData: Record<string, unknown> = {};
      if (typeof fields.name === 'string' && fields.name.trim()) {
        updateData.name = fields.name.trim();
        updatedFields.push('name');
      }
      if (typeof fields.station === 'string') {
        updateData.station = fields.station;
        updatedFields.push('station');
      }
      if (updatedFields.length === 0) {
        const err = new Error('No editable staff fields provided');
        (err as any).statusCode = 422;
        (err as any).code = 'INVALID_CORRECTION_FIELDS';
        throw err;
      }
      await tx.staffMember.update({ where: { id: existing.id }, data: updateData });
      updatedCount = 1;
      const evtId = await appendDataRightsDomainEvent(tx, tenantId, 'data_rights.principal.correct', {
        actorId: context.actorId,
        reason: context.reason,
        principalKind: 'staff',
        principalId: existing.id,
        updatedFields,
      });
      return {
        contractVersion: 'v1' as const,
        pluginId: '@orbitox/restaurant',
        tenantId,
        principal: { kind: 'staff', id: existing.id },
        updatedFields,
        updatedCount,
        auditEventId: evtId,
      };
    }

    const allGuests = await tx.guest.findMany({ where: { tenantId } });
    const targetGuest = allGuests.find((g: any) => matchesPrincipalObject(g, principal));
    if (!targetGuest) {
      const err = new Error('Guest principal not found');
      (err as any).statusCode = 404;
      (err as any).code = 'PRINCIPAL_NOT_FOUND';
      throw err;
    }
    if (targetGuest.role === 'RESTRICTED') {
      const err = new Error('Guest record is legally restricted');
      (err as any).statusCode = 409;
      (err as any).code = 'PRINCIPAL_PROCESSING_RESTRICTED';
      throw err;
    }
    const updateData: Record<string, unknown> = {};
    if (typeof fields.name === 'string' && fields.name.trim()) {
      updateData.name = fields.name.trim();
      updatedFields.push('name');
    }
    if (fields.preferences !== undefined && typeof fields.preferences === 'object') {
      updateData.preferences = fields.preferences;
      updatedFields.push('preferences');
    }
    if (updatedFields.length === 0) {
      const err = new Error('No editable guest fields provided');
      (err as any).statusCode = 422;
      (err as any).code = 'INVALID_CORRECTION_FIELDS';
      throw err;
    }
    await tx.guest.update({ where: { id: targetGuest.id }, data: updateData });
    updatedCount = 1;
    const evtId = await appendDataRightsDomainEvent(tx, tenantId, 'data_rights.principal.correct', {
      actorId: context.actorId,
      reason: context.reason,
      principalKind: principal.kind,
      principalId: targetGuest.id,
      updatedFields,
    });
    return {
      contractVersion: 'v1' as const,
      pluginId: '@orbitox/restaurant',
      tenantId,
      principal: { kind: principal.kind || 'diner', id: targetGuest.id },
      updatedFields,
      updatedCount,
      auditEventId: evtId,
    };
  });
}

export async function eraseRestaurantPrincipalData(
  prisma: PrismaClient,
  requestedTenantId: string,
  principal: RestaurantPrincipalRef,
  mode: RestaurantErasureMode,
  context: RestaurantDataRightsContext,
) {
  const tenantId = await resolveTargetTenantId(prisma, requestedTenantId);
  if (!tenantId) {
    const err = new Error('Tenant not found');
    (err as any).statusCode = 404;
    (err as any).code = 'TENANT_NOT_FOUND';
    throw err;
  }

  return withTenantRlsTransaction(prisma, tenantId, async (tx) => {
    const rowsDeletedByTable: Record<string, number> = {};
    const rowsRestrictedByTable: Record<string, number> = {};

    if (principal.kind === 'staff') {
      const staff = await tx.staffMember.findFirst({
        where: {
          tenantId,
          ...(principal.id ? { id: principal.id } : { name: principal.name || '' }),
        },
      });
      if (!staff) {
        const err = new Error('Staff principal not found');
        (err as any).statusCode = 404;
        (err as any).code = 'PRINCIPAL_NOT_FOUND';
        throw err;
      }
      if (mode === 'RESTRICT') {
        await tx.staffMember.update({ where: { id: staff.id }, data: { status: 'RESTRICTED' } });
        rowsRestrictedByTable.StaffMember = 1;
      } else {
        const invDel = await tx.ownerInvite.deleteMany({
          where: { tenantId, staffMemberId: staff.id },
        });
        rowsDeletedByTable.OwnerInvite = invDel.count;
        await tx.staffMember.delete({ where: { id: staff.id } });
        rowsDeletedByTable.StaffMember = 1;
      }
      const evtId = await appendDataRightsDomainEvent(tx, tenantId, `data_rights.principal.${mode.toLowerCase()}`, {
        actorId: context.actorId,
        reason: context.reason,
        principalKind: 'staff',
        principalId: staff.id,
        mode,
      });
      return {
        contractVersion: 'v1' as const,
        pluginId: '@orbitox/restaurant',
        tenantId,
        principal: { kind: 'staff', id: staff.id },
        mode,
        rowsDeletedByTable,
        rowsRestrictedByTable,
        auditEventId: evtId,
      };
    }

    const allGuests = await tx.guest.findMany({ where: { tenantId } });
    const matchedGuests = allGuests.filter((g: any) => matchesPrincipalObject(g, principal));
    const allOrders = await tx.restaurantOrder.findMany({ where: { tenantId } });
    const matchedOrders = allOrders.filter((o: any) => matchesPrincipalObject(o, principal));

    if (matchedGuests.length === 0 && matchedOrders.length === 0) {
      const err = new Error('Guest/diner principal not found');
      (err as any).statusCode = 404;
      (err as any).code = 'PRINCIPAL_NOT_FOUND';
      throw err;
    }

    const refId = matchedGuests[0]?.id || matchedOrders[0]?.id || 'diner_match';
    if (mode === 'RESTRICT') {
      if (matchedGuests.length > 0) {
        const upd = await tx.guest.updateMany({
          where: { tenantId, id: { in: matchedGuests.map((g: any) => g.id) } },
          data: { role: 'RESTRICTED' },
        });
        rowsRestrictedByTable.Guest = upd.count;
      }
    } else {
      if (matchedGuests.length > 0) {
        const delG = await tx.guest.deleteMany({
          where: { tenantId, id: { in: matchedGuests.map((g: any) => g.id) } },
        });
        rowsDeletedByTable.Guest = delG.count;
      }
      // Scrub guest PII from RestaurantOrder/Invoice while preserving tax invoice ledgers
      for (const ord of matchedOrders) {
        await tx.restaurantOrder.update({
          where: { id: ord.id },
          data: { guestName: null, customer: null },
        });
      }
      const allInvoices = await tx.invoice.findMany({ where: { tenantId } });
      for (const inv of allInvoices) {
        if (matchesPrincipalObject(inv, principal)) {
          await tx.invoice.update({
            where: { id: inv.id },
            data: { customer: null },
          });
        }
      }
    }

    const evtId = await appendDataRightsDomainEvent(tx, tenantId, `data_rights.principal.${mode.toLowerCase()}`, {
      actorId: context.actorId,
      reason: context.reason,
      principalKind: principal.kind,
      principalId: refId,
      mode,
    });

    return {
      contractVersion: 'v1' as const,
      pluginId: '@orbitox/restaurant',
      tenantId,
      principal: { kind: principal.kind || 'diner', id: refId },
      mode,
      rowsDeletedByTable,
      rowsRestrictedByTable,
      auditEventId: evtId,
    };
  });
}
