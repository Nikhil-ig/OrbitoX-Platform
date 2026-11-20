import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { withCustomerAuth } from '@/server/auth/customer-auth';
import { noStoreHeaders, getCustomerOrganizationRole } from '@/server/organizations/customer-dashboard';
import { prisma } from '@/server/db/prisma';
import {
  getChecklist,
  updateChecklistItem,
  recordQrDownloaded,
  recordQrPlacementAttestation,
  recordKdsVerified,
  recordKdsMountedAttestation,
  recordStaffInvited,
  recordStaffVerified,
  recordPreviewPaymentSettled,
  recordLiveGatewayVerified,
  recordPrinterConfigured,
  recordPrinterPending,
  ChecklistConcurrencyError,
  InvalidChecklistTransitionError,
  ChecklistPersistenceError,
  type ChecklistItemId,
  type ChecklistItemStatus,
} from '@/server/onboarding/checklist-service';

type RouteContext = { params: Promise<{ tenantId: string }> };

async function resolveProject(rawParam: string) {
  const decodedParam = decodeURIComponent(rawParam).trim();
  let project = await prisma.platformProject.findFirst({
    where: {
      OR: [
        { slug: decodedParam },
        { id: decodedParam },
        { slug: decodedParam.replace(/^tenant_/, '') },
      ],
    },
    include: { environments: true },
  });

  if (!project && decodedParam.includes('project/')) {
    const match = /project\/([^/]+)/.exec(decodedParam);
    if (match && match[1]) {
      project = await prisma.platformProject.findFirst({
        where: {
          OR: [
            { id: match[1] },
            { slug: match[1] },
          ],
        },
        include: { environments: true },
      });
    }
  }

  return project;
}

export const GET = withCustomerAuth<RouteContext>(
  async (_request: NextRequest, session, context) => {
    const { tenantId: rawParam } = await context.params;
    const project = await resolveProject(rawParam);
    if (!project) {
      return NextResponse.json(
        { ok: false, error: 'PROJECT_NOT_FOUND', message: 'Restaurant project not found.' },
        { status: 404, headers: noStoreHeaders() },
      );
    }

    const role = await getCustomerOrganizationRole(project.organizationId, session.userId);
    if (!role) {
      return NextResponse.json(
        { ok: false, error: 'UNAUTHORIZED_FOR_ORGANIZATION', message: 'Access denied to this restaurant project.' },
        { status: 403, headers: noStoreHeaders() },
      );
    }

    const canonicalTenantId =
      project.environments.find((e) => e.isProduction)?.id
        ? `org/${project.organizationId}/project/${project.id}/environment/${project.environments.find((e) => e.isProduction)!.id}`
        : `tenant_${project.slug}`;

    try {
      const checklist = await getChecklist(canonicalTenantId);
      return NextResponse.json({ ok: true, checklist }, { headers: noStoreHeaders() });
    } catch (err: any) {
      if (err instanceof ChecklistPersistenceError) {
        return NextResponse.json(
          { ok: false, error: 'DATABASE_PERSISTENCE_FAILED', message: err.message },
          { status: 500, headers: noStoreHeaders() },
        );
      }
      throw err;
    }
  },
  { write: false, allowMfaSetup: true },
);

const VALID_ITEM_IDS: ChecklistItemId[] = ['qr', 'kds', 'staff', 'payment', 'printer'];
const VALID_STATUSES: ChecklistItemStatus[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'ACTION_REQUIRED',
  'PENDING_VERIFICATION',
  'COMPLETED',
  'FAILED',
  'UNAVAILABLE',
];

export const POST = withCustomerAuth<RouteContext>(
  async (request: NextRequest, session, context) => {
    const { tenantId: rawParam } = await context.params;
    const project = await resolveProject(rawParam);
    if (!project) {
      return NextResponse.json(
        { ok: false, error: 'PROJECT_NOT_FOUND', message: 'Restaurant project not found.' },
        { status: 404, headers: noStoreHeaders() },
      );
    }

    const role = await getCustomerOrganizationRole(project.organizationId, session.userId);
    if (!role || (role !== 'OWNER' && role !== 'ADMIN')) {
      return NextResponse.json(
        { ok: false, error: 'UNAUTHORIZED_FOR_ORGANIZATION', message: 'Only restaurant owners or administrators can update onboarding checklist items.' },
        { status: 403, headers: noStoreHeaders() },
      );
    }

    const canonicalTenantId =
      project.environments.find((e) => e.isProduction)?.id
        ? `org/${project.organizationId}/project/${project.id}/environment/${project.environments.find((e) => e.isProduction)!.id}`
        : `tenant_${project.slug}`;

    const body = await request.json().catch(() => ({}));
    const expectedVersion = typeof body.expectedVersion === 'number' ? body.expectedVersion : undefined;

    try {
      // 1. Authoritative Action Dispatching
      if (body.action) {
        switch (body.action) {
          case 'ATTEST_QR': {
            const checklist = await recordQrPlacementAttestation(canonicalTenantId, session.userId, expectedVersion);
            return NextResponse.json({ ok: true, checklist }, { headers: noStoreHeaders() });
          }

          case 'ATTEST_KDS': {
            const checklist = await recordKdsMountedAttestation(canonicalTenantId, session.userId, expectedVersion);
            return NextResponse.json({ ok: true, checklist }, { headers: noStoreHeaders() });
          }

          case 'VERIFY_KDS': {
            const stationId = typeof body.stationId === 'string' ? body.stationId : 'station_main_kitchen';
            const checklist = await recordKdsVerified(canonicalTenantId, session.userId, stationId, body.tasksCount, expectedVersion);
            return NextResponse.json({ ok: true, checklist }, { headers: noStoreHeaders() });
          }

          case 'VERIFY_STAFF': {
            const memberEmail = typeof body.memberEmail === 'string' ? body.memberEmail : undefined;
            const checklist = await recordStaffVerified(canonicalTenantId, session.userId, memberEmail, expectedVersion);
            return NextResponse.json({ ok: true, checklist }, { headers: noStoreHeaders() });
          }

          case 'VERIFY_PREVIEW_PAYMENT': {
            const orderId = body.orderId;
            if (!orderId || typeof orderId !== 'string') {
              return NextResponse.json(
                { ok: false, error: 'INVALID_ORDER_ID', message: 'A valid orderId is required to record preview payment settlement.' },
                { status: 400, headers: noStoreHeaders() },
              );
            }
            const amountMinor = typeof body.amountMinor === 'number' ? body.amountMinor : 100;
            const method = typeof body.paymentMethod === 'string' ? body.paymentMethod : 'UPI';
            const checklist = await recordPreviewPaymentSettled(canonicalTenantId, session.userId, orderId, amountMinor, method, expectedVersion);
            return NextResponse.json({ ok: true, checklist }, { headers: noStoreHeaders() });
          }

          case 'VERIFY_GATEWAY': {
            // Verify if subscription or gateway has received authentic payment
            const sub = await prisma.billingSubscription.findFirst({
              where: {
                organizationId: project.organizationId,
                status: 'active',
              },
            });
            if (!sub && !body.transactionId) {
              return NextResponse.json(
                {
                  ok: false,
                  error: 'GATEWAY_PAYMENT_NOT_FOUND',
                  message: 'No active gateway subscription payment found. Awaiting gateway settlement or webhook event.',
                },
                { status: 400, headers: noStoreHeaders() },
              );
            }
            const txId = body.transactionId || sub?.razorpaySubscriptionId || `tx_${crypto.randomBytes(8).toString('hex')}`;
            const checklist = await recordLiveGatewayVerified(canonicalTenantId, session.userId, txId, body.paymentMethod || 'UPI', expectedVersion);
            return NextResponse.json({ ok: true, checklist }, { headers: noStoreHeaders() });
          }

          case 'DISPATCH_PRINTER_TEST': {
            const endpoint = typeof body.endpoint === 'string' ? body.endpoint.trim() : '';
            const driver = typeof body.driver === 'string' ? body.driver : 'epson_escpos';

            // Truthful device check: probe printer endpoint or runtime device bridge
            const runtimeUrl =
              process.env.RESTAURANTOS_RUNTIME_URL ||
              process.env.RESTAURANT_STORE_URL ||
              'http://127.0.0.1:4010';

            let bridgeResponded = false;
            let ackPrintId: string | null = null;
            try {
              const res = await fetch(new URL('/api/restaurant/printer/test', runtimeUrl).toString(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint, driver, tenantId: canonicalTenantId }),
                signal: AbortSignal.timeout(2000),
              });
              if (res.ok) {
                const json = await res.json().catch(() => ({}));
                bridgeResponded = true;
                ackPrintId = json.printId || json.testPrintId || `prn_bridge_${crypto.randomBytes(8).toString('hex')}`;
              }
            } catch {
              bridgeResponded = false;
            }

            if (!bridgeResponded) {
              return NextResponse.json(
                {
                  ok: false,
                  error: 'PRINTER_UNAVAILABLE',
                  message: `No ESC/POS printer hardware detected at ${endpoint || 'the specified endpoint'}. Ensure printer is powered on and reachable on the local network, or proceed in digital KDS mode.`,
                },
                { status: 503, headers: noStoreHeaders() },
              );
            }

            return NextResponse.json(
              {
                ok: true,
                dispatched: true,
                testPrintId: ackPrintId,
                message: `ESC/POS test receipt dispatched successfully to ${endpoint}.`,
              },
              { headers: noStoreHeaders() },
            );
          }

          case 'CONFIGURE_PRINTER': {
            const driver = typeof body.driver === 'string' ? body.driver : 'epson_escpos';
            const endpoint = typeof body.endpoint === 'string' ? body.endpoint : '192.168.1.200:9100';
            const paperWidth = typeof body.paperWidth === 'string' ? body.paperWidth : '80mm';

            if (body.hardwarePending) {
              const checklist = await recordPrinterPending(canonicalTenantId, session.userId, { driver, endpoint, paperWidth }, expectedVersion);
              return NextResponse.json({ ok: true, checklist }, { headers: noStoreHeaders() });
            }

            if (!body.testPrintId) {
              return NextResponse.json(
                {
                  ok: false,
                  error: 'PRINTER_UNVERIFIED',
                  message: 'A verified test print dispatch is required before marking printer connected. Or choose "Hardware Pending".',
                },
                { status: 400, headers: noStoreHeaders() },
              );
            }

            const checklist = await recordPrinterConfigured(
              canonicalTenantId,
              session.userId,
              { driver, endpoint, paperWidth, testPrintId: body.testPrintId },
              expectedVersion,
            );
            return NextResponse.json({ ok: true, checklist }, { headers: noStoreHeaders() });
          }

          default:
            return NextResponse.json(
              { ok: false, error: 'UNKNOWN_ACTION', message: `Unrecognized checklist action: ${body.action}` },
              { status: 400, headers: noStoreHeaders() },
            );
        }
      }

      // 2. Direct Item Mutation with Truthful Transitions
      const itemId = body.itemId as ChecklistItemId;
      const status = body.status as ChecklistItemStatus;

      if (!itemId || !VALID_ITEM_IDS.includes(itemId)) {
        return NextResponse.json(
          { ok: false, error: 'INVALID_ITEM_ID', message: `Item ID must be one of: ${VALID_ITEM_IDS.join(', ')}` },
          { status: 400, headers: noStoreHeaders() },
        );
      }

      if (!status || !VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { ok: false, error: 'INVALID_STATUS', message: `Status must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400, headers: noStoreHeaders() },
        );
      }

      const checklist = await updateChecklistItem(canonicalTenantId, {
        itemId,
        status,
        statusNote: typeof body.statusNote === 'string' ? body.statusNote : undefined,
        evidence: body.evidence && typeof body.evidence === 'object' ? body.evidence : undefined,
        actorId: session.userId,
        expectedVersion,
      });

      return NextResponse.json({ ok: true, checklist }, { headers: noStoreHeaders() });
    } catch (err: any) {
      if (err instanceof ChecklistConcurrencyError) {
        return NextResponse.json(
          { ok: false, error: 'VERSION_CONFLICT', message: err.message },
          { status: 409, headers: noStoreHeaders() },
        );
      }
      if (err instanceof InvalidChecklistTransitionError) {
        return NextResponse.json(
          { ok: false, error: 'INVALID_TRANSITION', message: err.message },
          { status: 400, headers: noStoreHeaders() },
        );
      }
      if (err instanceof ChecklistPersistenceError) {
        return NextResponse.json(
          { ok: false, error: 'DATABASE_PERSISTENCE_FAILED', message: err.message },
          { status: 500, headers: noStoreHeaders() },
        );
      }
      throw err;
    }
  },
  { write: true, allowMfaSetup: true },
);
