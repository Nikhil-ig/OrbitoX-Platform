import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, it } from 'node:test';
import {
  ACCOUNT_EMAIL_TEMPLATE_NAMES,
  assertEmailProviderConfiguration,
  createEmailProvider,
  renderAccountEmail,
  verifyResendWebhookSignature,
} from '@/server/accounts/account-email';
import { buildAccountLink } from '@/server/auth/account-security';

describe('Phase 6 transactional email', () => {
  it('renders every template without including tenant patient names or arbitrary payload fields', () => {
    const patientNames = ['Aarav PatientSeed', 'Mira PatientSeed'];
    const token = crypto.randomBytes(32).toString('base64url');
    const data = {
      link: buildAccountLink('https://console.orbitox.test', '/account/verify-email', token),
      patientName: patientNames[0],
      patientNames,
      notes: `${patientNames[0]} ${patientNames[1]}`,
      planName: patientNames[1],
    };
    assert.ok(ACCOUNT_EMAIL_TEMPLATE_NAMES.length >= 13);
    for (const template of ACCOUNT_EMAIL_TEMPLATE_NAMES) {
      const email = renderAccountEmail(template, data);
      assert.equal(email.subject.includes('PatientSeed'), false, `${template} subject leaked patient data`);
      assert.equal(email.text.includes('PatientSeed'), false, `${template} body leaked patient data`);
    }
    assert.match(renderAccountEmail('VERIFY_EMAIL', data).text, /#token=/);
  });

  it('authenticates timestamped suppression webhooks and rejects replay', () => {
    const rawBody = Buffer.from('{"id":"event-1","type":"email.bounced"}');
    const secret = `whsec_${crypto.randomBytes(32).toString('base64')}`;
    const id = 'msg_event-1';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = crypto.createHmac('sha256', Buffer.from(secret.slice('whsec_'.length), 'base64'))
      .update(`${id}.${timestamp}.`)
      .update(rawBody)
      .digest('base64');
    assert.equal(verifyResendWebhookSignature({
      rawBody, id, timestamp, signature: `v1,${signature}`, secret,
    }), true);
    assert.equal(verifyResendWebhookSignature({
      rawBody, id, timestamp, signature: `v1,${signature}`, secret,
      now: (Number(timestamp) + 301) * 1000,
    }), false);
    assert.equal(verifyResendWebhookSignature({
      rawBody: Buffer.concat([rawBody, Buffer.from(' ')]), id, timestamp,
      signature: `v1,${signature}`, secret,
    }), false);
    assert.equal(verifyResendWebhookSignature({
      rawBody, id: 'msg_different', timestamp, signature: `v1,${signature}`, secret,
    }), false);
  });

  it('uses the configured Resend adapter without sending during tests', async () => {
    const sent: Array<{ url: string; init: RequestInit }> = [];
    const provider = createEmailProvider({
      NODE_ENV: 'test',
      ORBITOX_EMAIL_PROVIDER: 'resend',
      RESEND_API_KEY: 'test-token',
      ORBITOX_EMAIL_FROM: 'no-reply@example.invalid',
    }, async (input, init) => {
      sent.push({ url: String(input), init: init || {} });
      return new Response(null, { status: 200 });
    });
    await provider.send({
      to: 'user@example.invalid',
      template: 'READ_ONLY',
      data: {},
      idempotencyKey: 'outbox-1',
    });
    assert.equal(sent.length, 1);
    assert.equal(sent[0]?.url, 'https://api.resend.com/emails');
    assert.equal(new Headers(sent[0]?.init.headers).get('Idempotency-Key'), 'outbox-1');
  });

  it('requires Resend and its signing secret in production', () => {
    assert.throws(() => assertEmailProviderConfiguration({
      NODE_ENV: 'production',
      ORBITOX_EMAIL_PROVIDER: 'postmark',
      ORBITOX_EMAIL_FROM: 'no-reply@example.invalid',
      POSTMARK_SERVER_TOKEN: 'test-token',
      ORBITOX_EMAIL_WEBHOOK_SECRET: `whsec_${crypto.randomBytes(32).toString('base64')}`,
    }), /ORBITOX_EMAIL_PROVIDER=resend/);
    assert.throws(() => assertEmailProviderConfiguration({
      NODE_ENV: 'production',
      ORBITOX_EMAIL_PROVIDER: 'resend',
      ORBITOX_EMAIL_FROM: 'no-reply@example.invalid',
      RESEND_API_KEY: 'test-token',
      ORBITOX_EMAIL_WEBHOOK_SECRET: crypto.randomBytes(32).toString('hex'),
    }), /whsec_/);
    assert.doesNotThrow(() => assertEmailProviderConfiguration({
      NODE_ENV: 'production',
      ORBITOX_EMAIL_PROVIDER: 'resend',
      ORBITOX_EMAIL_FROM: 'no-reply@example.invalid',
      RESEND_API_KEY: 'test-token',
      ORBITOX_EMAIL_WEBHOOK_SECRET: `whsec_${crypto.randomBytes(32).toString('base64')}`,
    }));
  });
});
