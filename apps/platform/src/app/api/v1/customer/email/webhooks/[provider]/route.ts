import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyResendWebhookSignature } from '@/lib/account-email';

type RouteContext = { params: Promise<{ provider: string }> };

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  const { provider } = await context.params;
  if (provider !== 'resend') {
    return NextResponse.json({ ok: false, error: 'Unsupported provider.' }, { status: 404 });
  }
  const rawBody = Buffer.from(await request.arrayBuffer());
  const secret = process.env.ORBITOX_EMAIL_WEBHOOK_SECRET?.trim();
  const eventId = request.headers.get('svix-id');
  const timestamp = request.headers.get('svix-timestamp');
  const signature = request.headers.get('svix-signature');
  if (!secret || !verifyResendWebhookSignature({
    rawBody,
    id: eventId,
    timestamp,
    signature,
    secret,
  })) {
    return NextResponse.json({ ok: false, error: 'Invalid provider signature.' }, { status: 401 });
  }

  let event: unknown;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid event body.' }, { status: 400 });
  }
  if (!isRecord(event)) return NextResponse.json({ ok: false, error: 'Invalid event body.' }, { status: 400 });
  const eventType = event.type;
  const data = event.data;
  if (
    typeof eventType !== 'string' || !/^[A-Za-z0-9._:-]{1,80}$/.test(eventType) ||
    !eventId || !/^[A-Za-z0-9._:-]{1,200}$/.test(eventId) ||
    !isRecord(data) ||
    !Array.isArray(data.to) ||
    data.to.length === 0 ||
    !data.to.every(isEmailAddress)
  ) {
    return NextResponse.json({ ok: false, error: 'Invalid event fields.' }, { status: 422 });
  }

  const normalizedEmails = data.to.map((email) => email.trim().toLowerCase());
  const shouldSuppress = ['email.bounced', 'email.complained'].includes(eventType.toLowerCase());
  try {
    const result = await prisma.$transaction(async (tx) => {
      const inserted = await tx.$queryRaw<Array<{ eventId: string }>>`
        INSERT INTO public."AccountEmailWebhookEvent" ("eventId", "provider", "eventType")
        VALUES (${eventId}, ${provider}, ${eventType})
        ON CONFLICT ("eventId") DO NOTHING
        RETURNING "eventId"
      `;
      if (inserted.length === 0) return { duplicate: true };
      if (shouldSuppress) {
        for (const email of normalizedEmails) {
          await tx.$executeRaw`
            INSERT INTO public."AccountEmailSuppression" ("email", "reason", "provider")
            VALUES (${email}, ${eventType}, ${provider})
            ON CONFLICT ("email") DO NOTHING
          `;
        }
      }
      return { duplicate: false };
    });
    return NextResponse.json({ ok: true, duplicate: result.duplicate }, { status: 200 });
  } catch (error) {
    console.error('Unable to record email provider webhook event.', error);
    return NextResponse.json({ ok: false, error: 'Unable to record event.' }, { status: 503 });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEmailAddress(value: unknown): value is string {
  return typeof value === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}
