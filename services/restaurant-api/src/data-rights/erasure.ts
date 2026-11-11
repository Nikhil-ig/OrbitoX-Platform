import { PrismaClient } from '../../generated/prisma';
import { withTenantRlsTransaction } from '../../packages/domain/tenancy';
import { matchesPrincipalObject, appendDataRightsDomainEvent } from './registry';
import { resolveTargetTenantId, TENANT_CASCADE_TABLES, RESTAURANT_NON_CASCADE_TENANT_TABLES } from './registry';
import type { RestaurantDataRightsContext, RestaurantPrincipalRef, RestaurantErasureMode } from './registry';

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
    for (const table of RESTAURANT_NON_CASCADE_TENANT_TABLES) {
      const nonCascadeRes: Array<{ cnt: number }> = await tx.$queryRawUnsafe(
        `SELECT count(*)::int AS cnt FROM public."${table}" WHERE "tenantId" = $1`,
        tenantId,
      );
      counts[table] = Number(nonCascadeRes[0]?.cnt ?? 0);
      await tx.$executeRawUnsafe(
        `DELETE FROM public."${table}" WHERE "tenantId" = $1`,
        tenantId,
      );
    }
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

