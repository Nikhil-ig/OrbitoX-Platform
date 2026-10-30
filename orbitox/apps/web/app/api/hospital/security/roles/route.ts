import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { ensureDefaultRoles } from '@/lib/hms-auth';
import { mapDbError, errorBody, HttpError } from '@/lib/db-errors';
import crypto from 'node:crypto';

export const GET = withHospitalGuard(async (_req: NextRequest, _routeContext, authContext) => {
  try {
    const roles = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      if (!tx.prisma) throw new Error('Prisma client required on TenantTx');
      await ensureDefaultRoles(tx);

      const items = await tx.prisma.hmsRole.findMany({
        where: {
          tenantId: tx.tenantId,
        },
        include: {
          permissions: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      return items.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        permissions: r.permissions.map((p) => p.permission),
        createdAt: r.createdAt.toISOString(),
      }));
    });

    return NextResponse.json({ success: true, data: roles });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
}, { adminOnly: true, sensitive: true });

export const POST = withHospitalGuard(async (req: NextRequest, _routeContext, authContext) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, description, permissions } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new HttpError(422, 'INVALID_INPUT', 'Role name is required');
    }

    const perms: string[] = Array.isArray(permissions) ? permissions : [];

    const newRole = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      if (!tx.prisma) throw new Error('Prisma client required on TenantTx');
      const cleanName = name.trim().toUpperCase();

      const existing = await tx.prisma.hmsRole.findUnique({
        where: {
          tenantId_name: {
            tenantId: tx.tenantId,
            name: cleanName,
          },
        },
      });

      if (existing) {
        throw new HttpError(409, 'ROLE_EXISTS', `Role "${cleanName}" already exists`);
      }

      const roleId = `role_${cleanName.toLowerCase()}_${crypto.randomBytes(4).toString('hex')}`;
      const role = await tx.prisma.hmsRole.create({
        data: {
          tenantId: tx.tenantId,
          id: roleId,
          name: cleanName,
          description: description || null,
          isSystem: false,
          permissions: {
            create: perms.map((perm) => ({
              permission: perm,
            })),
          },
        },
        include: {
          permissions: true,
        },
      });

      return {
        id: role.id,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        permissions: role.permissions.map((p) => p.permission),
        createdAt: role.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ success: true, data: newRole }, { status: 201 });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
}, { adminOnly: true, sensitive: true });
