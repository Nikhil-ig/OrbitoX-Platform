import { NextRequest, NextResponse } from 'next/server';
import { platformRepository } from '@/lib/platform-repository';
import { canonicalizePluginId } from '@orbitox-io/plugin-engine';
import { webhookLedger, verifyRazorpaySignature } from '@/lib/razorpay-webhook';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
    if (!webhookSecret) {
      return NextResponse.json(
        { success: false, error: 'WEBHOOK_SECRET_NOT_CONFIGURED', message: 'RAZORPAY_WEBHOOK_SECRET is not configured on this server.' },
        { status: 500 }
      );
    }

    // 1. Verify Razorpay HMAC SHA-256 signature
    const isValid = verifyRazorpaySignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'INVALID_SIGNATURE', message: 'Razorpay webhook signature verification failed.' },
        { status: 401 }
      );
    }

    const event = JSON.parse(rawBody);
    const eventId = event.id || event.event_id;
    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'MISSING_EVENT_ID', message: 'Webhook event ID is required.' },
        { status: 400 }
      );
    }

    // 2. Extract tenantId, pluginId, and planId
    const entity = event.payload?.subscription?.entity || event.payload?.payment?.entity || event.payload || {};
    const notes = entity.notes || event.notes || {};
    const tenantId = notes.tenantId || event.tenantId;
    let pluginId = notes.pluginId || event.pluginId;
    const planId = notes.planId || entity.plan_id || event.planId;

    if (!tenantId) {
      // Record raw event without tenant binding
      const result = await platformRepository.processBillingWebhookEvent({
        eventId,
        provider: 'razorpay',
        rawPayload: event,
        eventType: event.event || '',
      });
      webhookLedger.set(eventId, { eventId, processedAt: new Date().toISOString(), payload: event });
      return NextResponse.json({ success: true, processed: false, reason: 'NO_TENANT_BOUND', duplicate: result.duplicate });
    }

    if (!pluginId && planId) {
      if (planId.startsWith('hms') || planId.includes('hospital')) {
        pluginId = '@orbitox/hms';
      } else if (planId.startsWith('restaurant')) {
        pluginId = '@orbitox/restaurant';
      }
    }
    const canonicalPlugin = canonicalizePluginId(pluginId || '@orbitox/hms');

    // 3. State transition mapping
    const eventType = event.event || '';
    const installation = await platformRepository.getPluginInstallation(tenantId, canonicalPlugin);
    let newStatus: string | undefined;

    if (
      eventType === 'subscription.activated' ||
      eventType === 'subscription.charged' ||
      eventType === 'payment.captured' ||
      eventType === 'invoice.paid'
    ) {
      if (installation && installation.status !== 'ACTIVE') {
        newStatus = 'ACTIVE';
      }
    } else if (eventType === 'payment.failed') {
      // Grace period evaluation
      const plan = await platformRepository.getPlan(planId || installation?.planId || 'hms-starter');
      const gracePeriodDays = plan?.gracePeriodDays ?? 7;
      const suspensionGraceDays = plan?.suspensionGraceDays ?? 30;

      // Check test clock header / query / body
      const testClockHeader = req.headers.get('x-test-clock');
      const now = testClockHeader ? parseInt(testClockHeader, 10) : (event.testClock || Date.now());
      const failedAtSec = entity.created_at || Math.floor(now / 1000);
      const failedAtMs = failedAtSec > 10000000000 ? failedAtSec : failedAtSec * 1000;
      const elapsedDays = Math.max(0, Math.floor((now - failedAtMs) / (24 * 3600 * 1000)));

      if (elapsedDays <= gracePeriodDays) {
        // Within grace period: remains ACTIVE (billing warning)
        newStatus = undefined;
      } else if (elapsedDays > gracePeriodDays && elapsedDays <= suspensionGraceDays) {
        // Exceeded initial grace period: READ_ONLY
        newStatus = 'READ_ONLY';
      } else {
        // Exceeded suspension grace period: SUSPENDED
        newStatus = 'SUSPENDED';
      }
    } else if (eventType === 'subscription.cancelled' || eventType === 'subscription.halted') {
      newStatus = 'SUSPENDED';
    }

    // 4. Atomic transactional execution: INSERT ... ON CONFLICT DO NOTHING + entitlement change
    const result = await platformRepository.processBillingWebhookEvent({
      eventId,
      provider: 'razorpay',
      rawPayload: event,
      tenantId,
      pluginId: canonicalPlugin,
      planId,
      eventType,
      newStatus,
    });

    if (result.duplicate) {
      return NextResponse.json({
        success: true,
        received: true,
        duplicate: true,
        eventId,
        message: 'Event already processed idempotently.',
      });
    }

    // 5. Mirror to in-memory ledger for backward compatibility
    webhookLedger.set(eventId, {
      eventId,
      processedAt: new Date().toISOString(),
      payload: event,
    });

    return NextResponse.json({
      success: true,
      eventId,
      tenantId,
      pluginId: canonicalPlugin,
      previousStatus: result.previousStatus || installation?.status,
      currentStatus: result.currentStatus || installation?.status,
      entitlementRevision: result.entitlementRevision || installation?.entitlementRevision,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
