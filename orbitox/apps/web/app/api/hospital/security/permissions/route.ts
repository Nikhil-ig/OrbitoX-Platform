import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { DEFAULT_SYSTEM_ROLES } from '@/lib/hms-auth';
import { mapDbError, errorBody } from '@/lib/db-errors';

const ALL_SYSTEM_PERMISSIONS = [
  { key: 'patients:read', description: 'View patient records and search MRN' },
  { key: 'patients:write', description: 'Register or update patient records' },
  { key: 'admissions:read', description: 'View current admissions and bed occupancy' },
  { key: 'admissions:write', description: 'Admit or discharge patients to beds' },
  { key: 'appointments:read', description: 'View scheduled doctor appointments' },
  { key: 'appointments:write', description: 'Schedule or cancel doctor appointments' },
  { key: 'labs:read', description: 'View laboratory orders and results' },
  { key: 'labs:write', description: 'Order tests, enter results, verify results' },
  { key: 'billing:read', description: 'View invoices and ledger' },
  { key: 'billing:write', description: 'Create invoices and accept payments' },
  { key: 'invoices:read', description: 'View invoices' },
  { key: 'invoices:write', description: 'Create and update invoices' },
  { key: 'beds:read', description: 'View bed availability and status' },
  { key: 'treatments:write', description: 'Record patient treatments and consultations' },
  { key: 'break-glass:grant', description: 'Emergency break-glass access to sealed patient records' },
  { key: 'admin:all', description: 'Full administrative access across HospitalOS' },
];

export const GET = withHospitalGuard(async (_req: NextRequest, _routeContext, authContext) => {
  try {
    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      const roles = tx.prisma
        ? await tx.prisma.hmsRole.findMany({
            where: { tenantId: tx.tenantId },
            include: { permissions: true },
          })
        : [];

      return {
        catalog: ALL_SYSTEM_PERMISSIONS,
        defaultRoles: DEFAULT_SYSTEM_ROLES,
        tenantRoles: roles.map((r) => ({
          name: r.name,
          permissions: r.permissions.map((p) => p.permission),
        })),
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
}, { adminOnly: true, sensitive: true });
