import 'server-only';
import type { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';
import {
  createEmailProvider,
  EmailProviderError,
  type EmailProvider,
} from '@/server/accounts/account-email';
import { decryptAccountEmailPayload } from '@/server/accounts/account-email-payload';

const maximumAttempts = 5;
const claimLeaseMs = 15 * 60 * 1000;

interface ClaimedEmail {
  id: string;
  recipient: string;
  template: string;
  encryptedPayload: string;
  retryCount: number;
  claimedAt: Date;
  claimToken: string;
}

export async function processAccountEmailBatch(
  database: PrismaClient,
  provider: EmailProvider = createEmailProvider(),
  batchSize = 25,
): Promise<{ sent: number; retried: number; failed: number; suppressed: number }> {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) {
    throw new Error('Email batch size must be an integer from 1 to 100.');
  }
  const claimed = await database.$queryRaw<ClaimedEmail[]>`
    WITH candidates AS (
      SELECT "id"
      FROM public."AccountEmailOutbox"
      WHERE (
        "status" = 'PENDING' AND "nextAttemptAt" <= NOW()
      ) OR (
        "status" = 'SENDING' AND "claimedAt" < NOW() - (${claimLeaseMs} * interval '1 millisecond')
      )
      ORDER BY "createdAt", "id"
      FOR UPDATE SKIP LOCKED
      LIMIT ${batchSize}
    )
    UPDATE public."AccountEmailOutbox" AS outbox
    SET "status" = 'SENDING', "claimedAt" = NOW(), "claimToken" = ${crypto.randomUUID()}
    FROM candidates
    WHERE outbox."id" = candidates."id"
    RETURNING outbox."id", outbox."recipient", outbox."template",
      outbox."encryptedPayload", outbox."retryCount", outbox."claimedAt", outbox."claimToken"
  `;
  const result = { sent: 0, retried: 0, failed: 0, suppressed: 0 };
  for (const row of claimed) {
    const suppression = await database.accountEmailSuppression.findUnique({
      where: { email: row.recipient.toLowerCase() },
      select: { email: true },
    });
    if (suppression) {
      await updateClaim(database, row, {
        status: 'SUPPRESSED',
        dispatchedAt: new Date(),
        claimedAt: null,
        claimToken: null,
        lastError: 'RECIPIENT_SUPPRESSED',
      });
      result.suppressed += 1;
      continue;
    }

    try {
      const data = decryptAccountEmailPayload<Record<string, unknown>>(row.encryptedPayload);
      if (!isRecord(data)) throw new Error('INVALID_EMAIL_PAYLOAD');
      await provider.send({
        to: row.recipient,
        template: row.template,
        data,
        idempotencyKey: row.id,
      });
      await updateClaim(database, row, {
        status: 'SENT',
        dispatchedAt: new Date(),
        claimedAt: null,
        claimToken: null,
        lastError: null,
      });
      result.sent += 1;
    } catch (error) {
      const retryCount = row.retryCount + 1;
      const failed = retryCount >= maximumAttempts;
      const retryDelayMs = Math.min(30_000 * 2 ** Math.max(0, retryCount - 1), 60 * 60 * 1000);
      const errorCode = error instanceof EmailProviderError
        ? error.code
        : error instanceof Error && /^[A-Z0-9_]{1,80}$/.test(error.message)
          ? error.message
          : 'EMAIL_DELIVERY_ERROR';
      await updateClaim(database, row, {
        status: failed ? 'FAILED' : 'PENDING',
        retryCount,
        nextAttemptAt: new Date(Date.now() + retryDelayMs),
        claimedAt: null,
        claimToken: null,
        lastError: errorCode,
      });
      if (failed) {
        result.failed += 1;
        console.error(JSON.stringify({
          event: 'account_email.delivery_failed',
          severity: 'HIGH',
          outboxId: row.id,
          errorCode,
        }));
      } else {
        result.retried += 1;
      }
    }
  }
  return result;
}

async function updateClaim(
  database: PrismaClient,
  row: ClaimedEmail,
  data: {
    status: string;
    retryCount?: number;
    nextAttemptAt?: Date;
    dispatchedAt?: Date;
    claimedAt: Date | null;
    claimToken: string | null;
    lastError: string | null;
  },
): Promise<void> {
  const updated = await database.accountEmailOutbox.updateMany({
    where: {
      id: row.id,
      status: 'SENDING',
      claimToken: row.claimToken,
    },
    data,
  });
  if (updated.count !== 1) {
    throw new Error(`Account email claim was lost before update: ${row.id}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
