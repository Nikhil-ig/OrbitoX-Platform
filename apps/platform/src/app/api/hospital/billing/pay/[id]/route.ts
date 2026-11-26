import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard, HMS_STAFF_SESSION_COOKIE } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/server/db/tenant-db';
import { prisma } from '@/server/db/prisma';
import { mapDbError, errorBody, HttpError } from '@/server/db/db-errors';
import { recordPayment } from '@/server/hospital/hms-repository';
import { verifyStaffSession } from '@/server/auth/hms-auth';

type HmsPaymentMethod = 'CASH' | 'CARD' | 'UPI' | 'INSURANCE' | 'BANK_TRANSFER';

function normalizePaymentMethod(raw: unknown): HmsPaymentMethod {
  const val = String(raw || 'CASH').trim().toUpperCase();
  if (val === 'CARD' || val === 'CREDIT_CARD' || val === 'DEBIT_CARD') return 'CARD';
  if (val === 'BANK_TRANSFER' || val === 'WIRE_TRANSFER' || val === 'ACH' || val === 'NEFT') return 'BANK_TRANSFER';
  if (val === 'CASH' || val === 'UPI' || val === 'INSURANCE') return val;
  throw new HttpError(422, 'INVALID_PAYMENT_METHOD', 'Payment method must be CASH, CARD, UPI, INSURANCE, or BANK_TRANSFER.');
}

export const POST = withHospitalGuard(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  authContext
) => {
  try {
    const { id } = await params;
    const body = await req.json();

    const idempotencyKey =
      req.headers.get('idempotency-key')?.trim() ||
      (typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : '') ||
      `paykey_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    if (idempotencyKey.length < 8) {
      throw new HttpError(422, 'INVALID_INPUT', 'idempotencyKey must be at least 8 characters');
    }
    const amountMinor = BigInt(body.amountMinor || body.amount || 0);
    const method = normalizePaymentMethod(body.method);
    const staffToken =
      req.headers.get('x-staff-session') ||
      req.headers.get('x-staff-token') ||
      req.cookies.get(HMS_STAFF_SESSION_COOKIE)?.value;
    const explicitReceiver = typeof body.receivedById === 'string' && body.receivedById.trim() ? body.receivedById.trim() : null;

    if (amountMinor <= 0n) {
      throw new HttpError(422, 'INVALID_AMOUNT', 'amountMinor must be positive');
    }

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      let receivedById: string | null = null;
      if (staffToken) {
        try {
          const verified = await verifyStaffSession(tx, staffToken);
          receivedById = verified.actor.staffId;
        } catch {
          throw new HttpError(401, 'STAFF_IDENTITY_REQUIRED', 'Valid staff session is required to record payment.');
        }
      } else {
        const candidateId = explicitReceiver || authContext.sub?.trim() || null;
        if (candidateId) {
          const { rows: staffRows } = await tx.query<{ id: string }>(
            `SELECT "id" FROM "HmsStaff" WHERE "id" = $1 LIMIT 1`,
            [candidateId]
          );
          receivedById = staffRows[0]?.id || null;
        }
      }

      if (!receivedById) {
        throw new HttpError(401, 'STAFF_IDENTITY_REQUIRED', 'Authenticated staff identity is required to record payment.');
      }

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
