import { PrismaClient } from '../../generated/prisma';
import { withTenantRlsTransaction } from '../../packages/domain/tenancy';
import { matchesPrincipalObject, appendDataRightsDomainEvent } from './registry';
import { normalizeRows, resolveTargetTenantId, RESTAURANT_MODEL_DATA_RIGHTS } from './registry';
import type { RestaurantDataRightsContext, RestaurantPrincipalRef } from './registry';

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

    for (const spec of RESTAURANT_MODEL_DATA_RIGHTS) {
      if (spec.exportPolicy !== 'INCLUDE') continue;
      if (!spec.delegate || !spec.exportColumns) {
        throw new Error(`RestaurantOS data-rights export spec missing delegate/exportColumns for ${spec.model}`);
      }
      const client = (tx as Record<string, any>)[spec.delegate];
      if (!client?.findMany) {
        throw new Error(`Prisma delegate "${spec.delegate}" missing for model "${spec.model}"`);
      }
      const select = Object.fromEntries(spec.exportColumns.map((col) => [col, true]));
      const rows = await client.findMany({
        where: spec.model === 'Tenant' ? { id: tenantId } : { tenantId },
        orderBy: spec.orderBy ?? { id: 'asc' },
        select,
      });
      result.push({
        table: spec.model,
        columns: [...spec.exportColumns],
        rows: normalizeRows(rows as Array<Record<string, unknown>>),
      });
    }

    return result;
  });

  return {
    contractVersion: 'v1',
    pluginId: '@orbitox/restaurant',
    tenantId,
    chunks,
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

