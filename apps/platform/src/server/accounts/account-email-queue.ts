import type { Prisma } from '@prisma/client';
import { assertValidEmail, encryptAccountEmailPayload } from '@/server/auth/phase6-account-security';

export async function queueAccountEmail(
  transaction: Prisma.TransactionClient,
  input: {
    recipient: string;
    template: string;
    data: Record<string, unknown>;
  },
): Promise<void> {
  const recipient = assertValidEmail(input.recipient);
  const encryptedPayload = encryptAccountEmailPayload(input.data);
  await transaction.accountEmailOutbox.createMany({
    data: [{
      recipient,
      template: input.template,
      encryptedPayload,
    }],
  });
}
