import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { mapDbError, errorBody } from '@/lib/db-errors';
import { assertDemoSeedAllowed } from '@/lib/seed-gate';

export const POST = withHospitalGuard(async (_req: NextRequest, _routeContext, authContext) => {
  try {
    // A5: Must call assertDemoSeedAllowed() before any seed operation
    assertDemoSeedAllowed();

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      // Seed default department
      await tx.query(
        `INSERT INTO "HmsDepartment" ("id", "name")
         VALUES ('dept_general', 'General Medicine')
         ON CONFLICT ("tenantId", "name") DO NOTHING`
      );

      // Seed default ward
      await tx.query(
        `INSERT INTO "HmsWard" ("id", "departmentId", "name")
         VALUES ('ward_icu', 'dept_general', 'Intensive Care Unit')
         ON CONFLICT ("tenantId", "id") DO NOTHING`
      );

      // Seed default bed
      await tx.query(
        `INSERT INTO "HmsBed" ("id", "wardId", "label", "dailyRateMinor")
         VALUES ('bed_icu_01', 'ward_icu', 'Bed ICU-01', 500000)
         ON CONFLICT ("tenantId", "wardId", "label") DO NOTHING`
      );

      return { seeded: true, departmentId: 'dept_general', wardId: 'ward_icu', bedId: 'bed_icu_01' };
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
}, { adminOnly: true, sensitive: true });
