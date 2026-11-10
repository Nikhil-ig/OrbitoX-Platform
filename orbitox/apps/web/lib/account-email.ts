import crypto from 'node:crypto';

export interface EmailMessage {
  to: string;
  template: string;
  data: Record<string, unknown>;
  idempotencyKey: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

interface RenderedEmail {
  subject: string;
  text: string;
}

const templates: Record<string, (data: Record<string, unknown>) => RenderedEmail> = {
  VERIFY_EMAIL: (data) => actionEmail('Verify your OrbitoX account', data),
  RESET_PASSWORD: (data) => actionEmail('Reset your OrbitoX password', data),
  INVITE: (data) => actionEmail('You have an OrbitoX organization invitation', data),
  NEW_LOGIN_ALERT: () => ({
    subject: 'New sign-in to your OrbitoX account',
    text: 'A new sign-in to your OrbitoX account was detected. If this was not you, reset your password.',
  }),
  PAYMENT_FAILED: () => billingEmail('Payment needs attention', 'A subscription payment failed. Review billing settings to restore full access.'),
  GRACE_STARTED: () => billingEmail('Subscription payment needs attention', 'A subscription has entered its payment grace period. Review billing settings.'),
  READ_ONLY: () => billingEmail('Subscription is now read-only', 'A subscription is read-only until billing is updated.'),
  SUSPENDED: () => billingEmail('Subscription access is suspended', 'A subscription has been suspended. Update billing to restore access.'),
  REACTIVATED: () => billingEmail('Subscription access restored', 'Subscription access has been restored.'),
  PLAN_CHANGED: () => billingEmail('Subscription plan changed', 'Your subscription plan has changed.'),
  CANCELLED: () => billingEmail('Subscription cancellation scheduled', 'The subscription remains available until the end of its paid period.'),
  TENANT_READY: () => ({
    subject: 'Your OrbitoX tenant is ready',
    text: 'Your tenant is ready to use. Sign in to your dashboard to continue.',
  }),
  EXPORT_READY: (data) => {
    const link = typeof data.link === 'string' ? data.link : '';
    if (link) {
      if (!isHttpsLink(link)) throw new Error('Account email action link is missing or invalid.');
      return {
        subject: 'Your OrbitoX export is ready',
        text: `Your requested export archive is ready. Download it once within 24 hours:\n${link}`,
      };
    }
    return {
      subject: 'Your OrbitoX export is ready',
      text: 'Your requested export is ready. Sign in to your dashboard to download it.',
    };
  },
  DELETION_SCHEDULED: () => ({
    subject: 'Your OrbitoX deletion request is scheduled',
    text: 'Your data deletion request has been scheduled.',
  }),
  DELETION_COMPLETED: () => ({
    subject: 'Your OrbitoX deletion request is complete',
    text: 'Your data deletion request has been completed.',
  }),
};

export const ACCOUNT_EMAIL_TEMPLATE_NAMES = Object.freeze(Object.keys(templates));

export function renderAccountEmail(template: string, data: Record<string, unknown>): RenderedEmail {
  const renderer = templates[template];
  if (!renderer) throw new Error(`Unsupported account email template: ${template}`);
  return renderer(data);
}

export function createEmailProvider(
  env: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch,
): EmailProvider {
  const provider = (env.ORBITOX_EMAIL_PROVIDER || (env.NODE_ENV === 'production' ? '' : 'log-only'))
    .trim()
    .toLowerCase();
  if (env.NODE_ENV === 'production' && provider !== 'resend') {
    throw new Error('Production email delivery currently requires ORBITOX_EMAIL_PROVIDER=resend.');
  }
  if (provider === 'log-only') {
    if (env.NODE_ENV === 'production') {
      throw new Error('ORBITOX_EMAIL_PROVIDER=log-only is prohibited in production.');
    }
    return { async send(message) {
      renderAccountEmail(message.template, message.data);
      console.info(JSON.stringify({
        event: 'account_email.log_only',
        idempotencyKey: message.idempotencyKey,
        template: message.template,
        recipient: message.to,
      }));
    } };
  }
  if (provider === 'resend' || provider === 'postmark') {
    const token = provider === 'resend' ? env.RESEND_API_KEY : env.POSTMARK_SERVER_TOKEN;
    const from = env.ORBITOX_EMAIL_FROM;
    if (!token || !from) throw new Error(`Email provider ${provider} requires its API token and ORBITOX_EMAIL_FROM.`);
    return {
      send: async (message) => {
        const rendered = renderAccountEmail(message.template, message.data);
        const url = provider === 'resend'
          ? 'https://api.resend.com/emails'
          : 'https://api.postmarkapp.com/email';
        const response = await fetcher(url, {
          method: 'POST',
          headers: provider === 'resend'
            ? {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Idempotency-Key': message.idempotencyKey,
              }
            : {
                'X-Postmark-Server-Token': token,
                'X-Idempotency-Key': message.idempotencyKey,
                'Content-Type': 'application/json',
              },
          body: JSON.stringify(provider === 'resend'
            ? { from, to: message.to, subject: rendered.subject, text: rendered.text }
            : { From: from, To: message.to, Subject: rendered.subject, TextBody: rendered.text }),
          signal: AbortSignal.timeout(10_000),
          cache: 'no-store',
        });
        if (!response.ok) throw new EmailProviderError(`${provider.toUpperCase()}_HTTP_${response.status}`);
      },
    };
  }
  if (provider === 'ses') {
    const from = env.ORBITOX_EMAIL_FROM;
    const region = env.AWS_REGION;
    const accessKey = env.AWS_ACCESS_KEY_ID;
    const secretKey = env.AWS_SECRET_ACCESS_KEY;
    if (!from || !region || !accessKey || !secretKey) {
      throw new Error('SES requires ORBITOX_EMAIL_FROM, AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY.');
    }
    return {
      send: async (message) => {
        const rendered = renderAccountEmail(message.template, message.data);
        const host = `email.${region}.amazonaws.com`;
        const path = '/v2/email/outbound-emails';
        const body = JSON.stringify({
          FromEmailAddress: from,
          Destination: { ToAddresses: [message.to] },
          Content: {
            Simple: {
              Subject: { Data: rendered.subject, Charset: 'UTF-8' },
              Body: { Text: { Data: rendered.text, Charset: 'UTF-8' } },
            },
          },
        });
        const headers = signSesRequest({
          host,
          path,
          body,
          region,
          accessKey,
          secretKey,
          sessionToken: env.AWS_SESSION_TOKEN,
          now: new Date(),
        });
        const response = await fetcher(`https://${host}${path}`, {
          method: 'POST',
          headers,
          body,
          signal: AbortSignal.timeout(10_000),
          cache: 'no-store',
        });
        if (!response.ok) throw new EmailProviderError(`SES_HTTP_${response.status}`);
      },
    };
  }
  throw new Error('ORBITOX_EMAIL_PROVIDER must be set to a supported email provider.');
}

export function assertEmailProviderConfiguration(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV !== 'production' && env.NODE_ENV) return;
  const provider = env.ORBITOX_EMAIL_PROVIDER?.trim().toLowerCase();
  if (provider !== 'resend') {
    throw new Error('Production requires ORBITOX_EMAIL_PROVIDER=resend.');
  }
  if (!isValidResendWebhookSecret(env.ORBITOX_EMAIL_WEBHOOK_SECRET?.trim() || '')) {
    throw new Error('ORBITOX_EMAIL_WEBHOOK_SECRET must be a Resend whsec_ signing secret.');
  }
  createEmailProvider(env);
}

export function isValidResendWebhookSecret(secret: string): boolean {
  if (!/^whsec_[A-Za-z0-9+/]+={0,2}$/.test(secret)) return false;
  const encodedKey = secret.slice('whsec_'.length);
  const key = Buffer.from(encodedKey, 'base64');
  return key.length >= 32 && key.toString('base64') === encodedKey;
}

export function verifyResendWebhookSignature(input: {
  rawBody: Buffer;
  id: string | null;
  timestamp: string | null;
  signature: string | null;
  secret: string;
  now?: number;
}): boolean {
  if (
    !input.id ||
    input.id.length > 200 ||
    /[\r\n]/.test(input.id) ||
    !input.timestamp ||
    !input.signature ||
    !isValidResendWebhookSecret(input.secret) ||
    !/^\d{10,12}$/.test(input.timestamp)
  ) {
    return false;
  }
  const timestamp = Number(input.timestamp);
  const nowSeconds = Math.floor((input.now ?? Date.now()) / 1000);
  if (Math.abs(nowSeconds - timestamp) > 300) {
    return false;
  }
  const key = Buffer.from(input.secret.slice('whsec_'.length), 'base64');
  const expected = crypto.createHmac('sha256', key)
    .update(`${input.id}.${input.timestamp}.`)
    .update(input.rawBody)
    .digest('base64');
  const signatures = input.signature.split(/\s+/);
  return signatures.some((versionedSignature) => {
    const [version, encodedSignature, ...extra] = versionedSignature.split(',');
    if (version !== 'v1' || !encodedSignature || extra.length > 0) return false;
    const actual = Buffer.from(encodedSignature, 'base64');
    const expectedBytes = Buffer.from(expected, 'base64');
    return actual.toString('base64') === encodedSignature &&
      actual.length === expectedBytes.length &&
      crypto.timingSafeEqual(actual, expectedBytes);
  });
}

export class EmailProviderError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function actionEmail(subject: string, data: Record<string, unknown>): RenderedEmail {
  const link = typeof data.link === 'string' ? data.link : '';
  if (!link || !isHttpsLink(link)) throw new Error('Account email action link is missing or invalid.');
  return { subject, text: `Use this secure link to continue:\n${link}\n\nIf you did not request this, you can ignore this email.` };
}

function billingEmail(subject: string, text: string): RenderedEmail {
  return { subject, text };
}

function isHttpsLink(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(parsed.hostname)) &&
      parsed.search === '' &&
      /^#token=[A-Za-z0-9_-]{43}$/.test(parsed.hash)
    );
  } catch {
    return false;
  }
}

function signSesRequest(input: {
  host: string;
  path: string;
  body: string;
  region: string;
  accessKey: string;
  secretKey: string;
  sessionToken?: string;
  now: Date;
}): Record<string, string> {
  const amzDate = input.now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = amzDate.slice(0, 8);
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    host: input.host,
    'x-amz-date': amzDate,
    'x-amz-target': 'SesV2.SendEmail',
  };
  if (input.sessionToken) headers['x-amz-security-token'] = input.sessionToken;
  const signedHeaders = Object.keys(headers).sort().join(';');
  const canonicalHeaders = Object.keys(headers).sort().map((key) => `${key}:${headers[key]!.trim()}\n`).join('');
  const payloadHash = sha256(input.body);
  const canonicalRequest = [
    'POST',
    input.path,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const scope = `${date}/${input.region}/ses/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    sha256(canonicalRequest),
  ].join('\n');
  const dateKey = hmac(Buffer.from(`AWS4${input.secretKey}`), date);
  const regionKey = hmac(dateKey, input.region);
  const serviceKey = hmac(regionKey, 'ses');
  const signingKey = hmac(serviceKey, 'aws4_request');
  const signature = hmac(signingKey, stringToSign).toString('hex');
  return {
    ...headers,
    Authorization: `AWS4-HMAC-SHA256 Credential=${input.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hmac(key: Buffer | string, value: string): Buffer {
  return crypto.createHmac('sha256', key).update(value).digest();
}
