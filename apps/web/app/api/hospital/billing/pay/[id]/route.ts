import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { mapDbError, errorBody, HttpError } from '@/lib/db-errors';
import { recordPayment } from '@/lib/hms-repository';

export const POST = withHospitalGuard(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  authContext
) => {
  try {
    const { id } = await params;
    const body = await req.json();

    const idempotencyKey =
      req.headers.get('idempotency-key') || body.idempotencyKey || `paykey_${Date.now()}_${Math.random()}`;
    const amountMinor = BigInt(body.amountMinor || body.amount || 0);
    const method = body.method || 'CASH';
    const receivedById = body.receivedById || authContext.sub || 'staff_billing';

    if (amountMinor <= 0n) {
      throw new HttpError(422, 'INVALID_AMOUNT', 'amountMinor must be positive');
    }

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      return await recordPayment(tx, {
        invoiceId: id,
        amountMinor,
        method,
        idempotencyKey,
        receivedById,
      });
    });

    return NextResponse.json({ success: true, data }, { status: data.replayed ? 200 : 201 });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
});
