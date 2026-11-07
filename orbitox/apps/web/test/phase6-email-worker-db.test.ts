import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';
import { POST as postEmailWebhook } from '../app/api/v1/customer/email/webhooks/[provider]/route';
import { processAccountEmailBatch } from '../lib/account-email-worker';
import {
  ACCOUNT_EMAIL_TEMPLATE_NAMES,
  type EmailProvider,
} from '../lib/account-email';
import { encryptAccountEmailPayload } from '../lib/phase6-account-security';
import { registerCustomer } from '../lib/phase6-account-service';

if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'prisma') {
  describe('Phase 6 account email worker database behavior', () => {
    const ownerUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    const relayUrl = process.env.OUTBOX_RELAY_DATABASE_URL;
    const runtimeUrl = process.env.APP_DATABASE_URL;
    const maintenanceUrl = process.env.MAINTENANCE_DATABASE_URL;
    if (!ownerUrl || !relayUrl || !runtimeUrl || !maintenanceUrl) {
      throw new Error('TEST_DATABASE_URL/DATABASE_URL, APP_DATABASE_URL, MAINTENANCE_DATABASE_URL and OUTBOX_RELAY_DATABASE_URL are required.');
    }
    const owner = new PrismaClient({ datasourceUrl: ownerUrl });
    const relay = new PrismaClient({ datasourceUrl: relayUrl });
    const runtime = new PrismaClient({ datasourceUrl: runtimeUrl });
    const maintenance = new PrismaClient({ datasourceUrl: maintenanceUrl });
    const recipients = Array.from(
      { length: ACCOUNT_EMAIL_TEMPLATE_NAMES.length + 3 },
      () => `email-${crypto.randomUUID()}@example.invalid`,
    );
    const signupEmail = `signup-${crypto.randomUUID()}@example.invalid`;
    const ids: string[] = [];
    const webhookEventIds: string[] = [];
    const previousBreachApiMode = process.env.ORBITOX_BREACHED_PASSWORD_API;

    before(async () => {
      process.env.ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
      process.env.ORBITOX_EMAIL_WEBHOOK_SECRET = `whsec_${crypto.randomBytes(32).toString('base64')}`;
      const role = await relay.$queryRaw<Array<{ role: string }>>`SELECT current_user AS role`;
      assert.equal(role[0]?.role, 'orbitox_outbox_relay');
      const runtimeRole = await runtime.$queryRaw<Array<{ role: string }>>`SELECT current_user AS role`;
      assert.equal(runtimeRole[0]?.role, 'orbitox_runtime');
      process.env.ORBITOX_BREACHED_PASSWORD_API = 'off';
    });

    after(async () => {
      const signupUser = await owner.customerUser.findFirst({
        where: { email: signupEmail },
        select: { id: true, memberships: { select: { organizationId: true } } },
      });
      await owner.accountEmailOutbox.deleteMany({ where: { recipient: signupEmail } });
      if (signupUser) {
        for (const membership of signupUser.memberships) {
          await maintenance.$queryRaw`SELECT public.close_customer_organization(${membership.organizationId})`;
        }
        await owner.customerUser.delete({ where: { id: signupUser.id } });
      }
      await owner.accountEmailOutbox.deleteMany({ where: { id: { in: ids } } });
      await owner.accountEmailSuppression.deleteMany({
        where: { email: { in: recipients } },
      });
      await owner.accountEmailWebhookEvent.deleteMany({
        where: { eventId: { in: webhookEventIds } },
      });
      if (previousBreachApiMode === undefined) delete process.env.ORBITOX_BREACHED_PASSWORD_API;
      else process.env.ORBITOX_BREACHED_PASSWORD_API = previousBreachApiMode;
      await Promise.all([
        owner.$disconnect(),
        relay.$disconnect(),
        runtime.$disconnect(),
        maintenance.$disconnect(),
      ]);
    });

    it('registers a customer as orbitox_runtime and queues the verification email without SELECT', async () => {
      const response = await registerCustomer({
        email: signupEmail,
        password: `Account-test-${crypto.randomUUID()}`,
        organizationName: 'Signup Outbox Test',
        baseUrl: 'https://console.orbitox.test',
      }, runtime);

      assert.equal(response.status, 202);
      assert.equal(response.body.ok, true);
      assert.equal(await owner.accountEmailOutbox.count({
        where: { recipient: signupEmail, template: 'VERIFY_EMAIL' },
      }), 1);
      await owner.accountEmailOutbox.deleteMany({ where: { recipient: signupEmail } });
    });

    it('sends each claimed message once across three concurrent workers', async () => {
      for (const [index, template] of ACCOUNT_EMAIL_TEMPLATE_NAMES.entries()) {
        const row = await owner.accountEmailOutbox.create({
          data: {
            recipient: recipients[index]!,
            template,
            encryptedPayload: encryptAccountEmailPayload({}),
            createdAt: new Date(0),
            nextAttemptAt: new Date(0),
          },
          select: { id: true },
        });
        ids.push(row.id);
      }
      const sent = new Set<string>();
      const sentTemplates: string[] = [];
      const provider: EmailProvider = {
        async send(message) {
          await new Promise((resolve) => setTimeout(resolve, 20));
          assert.equal(sent.has(message.idempotencyKey), false);
          sent.add(message.idempotencyKey);
          sentTemplates.push(message.template);
        },
      };
      const worker = async () => {
        let sentCount = 0;
        while (true) {
          const result = await processAccountEmailBatch(relay, provider, 1);
          if (!result.sent && !result.retried && !result.failed && !result.suppressed) return sentCount;
          sentCount += result.sent;
        }
      };
      const workerResults = await Promise.all([worker(), worker(), worker()]);
      assert.equal(workerResults.reduce((sum, count) => sum + count, 0), ACCOUNT_EMAIL_TEMPLATE_NAMES.length);
      assert.equal(sent.size, ACCOUNT_EMAIL_TEMPLATE_NAMES.length);
      assert.deepEqual(sentTemplates.sort(), [...ACCOUNT_EMAIL_TEMPLATE_NAMES].sort());
      assert.equal(await owner.accountEmailOutbox.count({
        where: { id: { in: ids }, status: 'SENT' },
      }), ACCOUNT_EMAIL_TEMPLATE_NAMES.length);
    });

    it('retries provider errors and marks an exhausted message FAILED', async () => {
      const row = await owner.accountEmailOutbox.create({
        data: {
          recipient: recipients[3]!,
          template: 'READ_ONLY',
          encryptedPayload: encryptAccountEmailPayload({}),
        },
        select: { id: true },
      });
      ids.push(row.id);
      let attempts = 0;
      const provider: EmailProvider = {
        async send() {
          attempts += 1;
          throw new Error('PROVIDER_DOWN');
        },
      };
      for (let attempt = 0; attempt < 5; attempt += 1) {
        await owner.accountEmailOutbox.update({
          where: { id: row.id },
          data: { nextAttemptAt: new Date(0) },
        });
        await processAccountEmailBatch(relay, provider, 1);
      }
      const failed = await owner.accountEmailOutbox.findUnique({
        where: { id: row.id },
        select: { status: true, retryCount: true, lastError: true },
      });
      assert.equal(attempts, 5);
      assert.deepEqual(failed, { status: 'FAILED', retryCount: 5, lastError: 'PROVIDER_DOWN' });
    });

    it('skips suppressed addresses', async () => {
      const row = await owner.accountEmailOutbox.create({
        data: {
          recipient: recipients[4]!,
          template: 'READ_ONLY',
          encryptedPayload: encryptAccountEmailPayload({}),
        },
        select: { id: true },
      });
      ids.push(row.id);
      await owner.accountEmailSuppression.create({
        data: { email: recipients[4]!, reason: 'bounce', provider: 'resend' },
      });
      let sends = 0;
      const provider: EmailProvider = { async send() { sends += 1; } };
      const result = await processAccountEmailBatch(relay, provider, 1);
      assert.equal(sends, 0);
      assert.equal(result.suppressed, 1);
      assert.equal(await owner.accountEmailOutbox.count({
        where: { id: row.id, status: 'SUPPRESSED' },
      }), 1);
    });

    it('authenticates and deduplicates signed provider suppression events', async () => {
      const eventId = `msg_email-webhook-${crypto.randomUUID()}`;
      webhookEventIds.push(eventId);
      const timestamp = String(Math.floor(Date.now() / 1000));
      const rawBody = Buffer.from(JSON.stringify({
        type: 'email.bounced',
        data: { to: [recipients[0]] },
      }));
      const signature = crypto.createHmac(
        'sha256',
        Buffer.from(process.env.ORBITOX_EMAIL_WEBHOOK_SECRET!.slice('whsec_'.length), 'base64'),
      )
        .update(`${eventId}.${timestamp}.`)
        .update(rawBody)
        .digest('base64');
      const createRequest = (signedBody = rawBody, signedSignature = signature) =>
        new NextRequest('https://console.orbitox.test/api/v1/customer/email/webhooks/resend', {
          method: 'POST',
          headers: {
            'svix-id': eventId,
            'svix-timestamp': timestamp,
            'svix-signature': `v1,${signedSignature}`,
          },
          body: signedBody,
        });

      const first = await postEmailWebhook(createRequest(), { params: Promise.resolve({ provider: 'resend' }) });
      const duplicate = await postEmailWebhook(createRequest(), { params: Promise.resolve({ provider: 'resend' }) });
      assert.equal(first.status, 200);
      assert.equal(duplicate.status, 200);
      assert.equal((await duplicate.json()).duplicate, true);
      assert.ok(await owner.accountEmailSuppression.findUnique({
        where: { email: recipients[0] },
      }));

      const tampered = await postEmailWebhook(
        createRequest(Buffer.concat([rawBody, Buffer.from(' ')])),
        { params: Promise.resolve({ provider: 'resend' }) },
      );
      assert.equal(tampered.status, 401);
    });
  });
}
