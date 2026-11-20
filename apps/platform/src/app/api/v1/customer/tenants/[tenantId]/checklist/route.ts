import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { withCustomerAuth } from '@/server/auth/customer-auth';
import { noStoreHeaders, getCustomerOrganizationRole } from '@/server/organizations/customer-dashboard';
import { prisma } from '@/server/db/prisma';
import { signBridgeRequest, getDefaultBridgeKeys } from '@orbitox-io/bridge';
import {
  dispatchPrinterTestJob,
  verifyServerPrintJob,
  PrinterSecurityError,
  type PrinterDriver,
} from '@/server/devices/printer-service';
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
const VALID_SAFE_STATUSES: ChecklistItemStatus[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'ACTION_REQUIRED',
  'PENDING_VERIFICATION',
  'UNAVAILABLE',
  'FAILED',
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

    // Concurrency control: expectedVersion is strictly required for all writes
    if (typeof body.expectedVersion !== 'number') {
      return NextResponse.json(
        {
          ok: false,
          error: 'MISSING_EXPECTED_VERSION',
          message: 'expectedVersion is required for all checklist mutations to guarantee optimistic concurrency control.',
        },
        { status: 400, headers: noStoreHeaders() },
      );
    }
    const expectedVersion = body.expectedVersion;

    try {
      // 1. Dedicated Server Verification Actions
      if (body.action) {
        switch (body.action) {
          case 'RECORD_QR_DOWNLOAD': {
            const tablesCount = typeof body.tablesCount === 'number' ? body.tablesCount : 12;
            const checklist = await recordQrDownloaded(canonicalTenantId, session.userId, tablesCount, expectedVersion);
            return NextResponse.json({ ok: true, checklist }, { headers: noStoreHeaders() });
          }

          case 'ATTEST_QR': {
            // Require that placard sheet was actually downloaded
            const current = await getChecklist(canonicalTenantId);
            const qrItem = current.items.find((i) => i.id === 'qr');
            if (!qrItem?.evidence?.artifactDownloaded) {
              return NextResponse.json(
                { ok: false, error: 'QR_SHEET_NOT_DOWNLOADED', message: 'Cannot attest QR placard placement before downloading the placard sheet.' },
                { status: 400, headers: noStoreHeaders() },
              );
            }

            // Require that authentic persisted QR identities exist in the database
            const dbTables = await prisma.restaurantTable.findMany({
              where: {
                OR: [
                  { tenantId: canonicalTenantId },
                  { tenantId: project.id },
                  { tenantId: `tenant_${project.slug}` },
                ],
              },
              include: { qrIdentity: true },
            });
            const activeQRs = dbTables.filter((t) => t.qrIdentity && t.qrIdentity.isActive);
            if (dbTables.length === 0 || activeQRs.length === 0) {
              return NextResponse.json(
                {
                  ok: false,
                  error: 'QR_IDENTITIES_MISSING',
                  message: 'No verified active table QR identities exist. Provision floor tables and generate authentic placards first.',
                },
                { status: 400, headers: noStoreHeaders() },
              );
            }

            const checklist = await recordQrPlacementAttestation(canonicalTenantId, session.userId, expectedVersion);
            return NextResponse.json({ ok: true, checklist }, { headers: noStoreHeaders() });
          }

          case 'VERIFY_KDS': {
            // Server actively queries the KDS station task feed on RestaurantOS runtime via bridge
            const runtimeUrl =
              process.env.RESTAURANTOS_RUNTIME_URL ||
              process.env.RESTAURANT_STORE_URL ||
              'http://127.0.0.1:4010';

            const bridgeKeys = getDefaultBridgeKeys();
            const pathWithQuery = '/api/restaurant/kds/tasks';
            const signedHeaders = signBridgeRequest(bridgeKeys, {
              method: 'GET',
              pathWithQuery,
              tenantId: canonicalTenantId,
              principal: { sub: session.userId, scopes: ['station:kds', 'preview:kds:read'] },
            });

            let stationResponsive = false;
            let actualTasksCount = 0;
            try {
              const res = await fetch(new URL(pathWithQuery, runtimeUrl).toString(), {
                headers: signedHeaders,
                cache: 'no-store',
                signal: AbortSignal.timeout(2500),
              });
              if (res.ok) {
                const json = await res.json().catch(() => ({}));
                stationResponsive = true;
                actualTasksCount = Array.isArray(json.tasks) ? json.tasks.length : (Array.isArray(json.data) ? json.data.length : 0);
              }
            } catch {
              stationResponsive = false;
            }

            if (!stationResponsive) {
              return NextResponse.json(
                {
                  ok: false,
                  error: 'KDS_STATION_UNREACHABLE',
                  message: 'Could not connect to authenticated KDS station task feed on restaurant runtime. Ensure KDS tablet is open and station credentials are valid.',
                },
                { status: 503, headers: noStoreHeaders() },
              );
            }

            const checklist = await recordKdsVerified(
              canonicalTenantId,
              session.userId,
              'station_main_kitchen',
              actualTasksCount,
              expectedVersion,
            );
            return NextResponse.json({ ok: true, checklist, tasksCount: actualTasksCount }, { headers: noStoreHeaders() });
          }

          case 'ATTEST_KDS': {
            // Require station link verification before allowing mounting attestation
            const current = await getChecklist(canonicalTenantId);
            const kdsItem = current.items.find((i) => i.id === 'kds');
            if (!kdsItem?.evidence?.stationLinkVerified) {
              return NextResponse.json(
                {
                  ok: false,
                  error: 'KDS_NOT_VERIFIED',
                  message: 'Cannot attest KDS hardware mounting before station link is verified via task feed.',
                },
                { status: 400, headers: noStoreHeaders() },
              );
            }

            const checklist = await recordKdsMountedAttestation(canonicalTenantId, session.userId, expectedVersion);
            return NextResponse.json({ ok: true, checklist }, { headers: noStoreHeaders() });
          }

          case 'INVITE_STAFF': {
            const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
            const inviteRole = typeof body.role === 'string' ? body.role : 'MEMBER';
            if (!email || !email.includes('@')) {
              return NextResponse.json(
                { ok: false, error: 'INVALID_EMAIL', message: 'A valid email address is required to invite team members.' },
                { status: 400, headers: noStoreHeaders() },
              );
            }

            const checklist = await recordStaffInvited(canonicalTenantId, session.userId, email, inviteRole, expectedVersion);
            return NextResponse.json({ ok: true, checklist }, { headers: noStoreHeaders() });
          }

          case 'VERIFY_STAFF': {
            // Authoritative membership check: query CustomerMembership in the database
            let memberVerified = false;
            let verifiedEmail = typeof body.memberEmail === 'string' ? body.memberEmail.trim().toLowerCase() : undefined;

            if (verifiedEmail) {
              const user = await prisma.customerUser.findFirst({
                where: { email: verifiedEmail, status: { not: 'DELETED' } },
              });
              if (user) {
                const membership = await prisma.customerMembership.findUnique({
                  where: { organizationId_userId: { organizationId: project.organizationId, userId: user.id } },
                });
                if (membership) memberVerified = true;
              }
            } else {
              const otherMemberships = await prisma.customerMembership.findMany({
                where: {
                  organizationId: project.organizationId,
                  userId: { not: session.userId },
                },
                include: { user: true },
              });
              if (otherMemberships.length > 0 && otherMemberships[0]) {
                memberVerified = true;
                verifiedEmail = otherMemberships[0].user?.email;
              }
            }

            if (!memberVerified) {
              // Check if an invitation is pending
              const pendingInvite = await prisma.accountToken.findFirst({
                where: {
                  organizationId: project.organizationId,
                  purpose: 'INVITE',
                  usedAt: null,
                  expiresAt: { gt: new Date() },
                },
              });
              if (pendingInvite) {
                return NextResponse.json(
                  {
                    ok: false,
                    error: 'INVITATION_PENDING',
                    message: `Invitation to ${pendingInvite.email} has been dispatched but not yet accepted. The recipient must accept their invite before staff setup is verified.`,
                  },
                  { status: 400, headers: noStoreHeaders() },
                );
              }
              return NextResponse.json(
                {
                  ok: false,
                  error: 'NO_ACTIVE_MEMBERSHIP',
                  message: 'No accepted team membership found. Invite a team member and ensure they accept the invitation.',
                },
                { status: 400, headers: noStoreHeaders() },
              );
            }

            const checklist = await recordStaffVerified(canonicalTenantId, session.userId, verifiedEmail, expectedVersion);
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
            // Strictly reject arbitrary client transaction IDs; server must verify genuine payment evidence
            let verifiedPaymentId: string | null = null;
            let paymentMethod = 'UPI';

            // 1. Search processed BillingWebhookEvents for active subscription charged events
            const sub = await prisma.billingSubscription.findFirst({
              where: { organizationId: project.organizationId, status: 'active' },
            });
            if (sub) {
              const webhookEvents = await prisma.billingWebhookEvent.findMany({
                where: {
                  provider: 'razorpay',
                  processedAt: { not: null },
                },
                orderBy: { receivedAt: 'desc' },
                take: 20,
              });

              for (const ev of webhookEvents) {
                const payload = ev.payload as any;
                const subId = payload?.subscription?.entity?.id || payload?.payment?.entity?.subscription_id;
                if (subId === sub.razorpaySubscriptionId) {
                  const payment = payload?.payment?.entity;
                  if (payment && payment.status === 'captured') {
                    verifiedPaymentId = payment.id;
                    paymentMethod = payment.method || 'card';
                    break;
                  }
                }
              }
            }

            // 2. Search RestaurantPaymentRecord for SETTLED live payments
            if (!verifiedPaymentId) {
              const paymentRecord = await prisma.restaurantPaymentRecord.findFirst({
                where: {
                  OR: [
                    { tenantId: canonicalTenantId },
                    { companyId: project.organizationId },
                  ],
                  status: 'SETTLED',
                },
                orderBy: { createdAt: 'desc' },
              });
              if (paymentRecord && paymentRecord.gatewayTransactionId) {
                verifiedPaymentId = paymentRecord.gatewayTransactionId;
                paymentMethod = paymentRecord.paymentGateway || 'UPI';
              }
            }

            if (!verifiedPaymentId) {
              return NextResponse.json(
                {
                  ok: false,
                  error: 'PAYMENT_UNVERIFIED',
                  message: 'No reconciled captured payment record found for this tenant or subscription. Complete subscription invoice settlement or restaurant gateway payment via verified webhook first.',
                },
                { status: 400, headers: noStoreHeaders() },
              );
            }

            const checklist = await recordLiveGatewayVerified(canonicalTenantId, session.userId, verifiedPaymentId, paymentMethod, expectedVersion);
            return NextResponse.json({ ok: true, checklist, transactionId: verifiedPaymentId }, { headers: noStoreHeaders() });
          }

          case 'DISPATCH_PRINTER_TEST': {
            const endpoint = typeof body.endpoint === 'string' ? body.endpoint.trim() : '';
            const driver = (typeof body.driver === 'string' ? body.driver : 'epson_escpos') as PrinterDriver;
            const paperWidth = typeof body.paperWidth === 'string' ? body.paperWidth : '80mm';

            try {
              const dispatchResult = await dispatchPrinterTestJob({
                tenantId: canonicalTenantId,
                actorId: session.userId,
                driver,
                endpoint,
                paperWidth,
              });

              if (!dispatchResult.ok) {
                return NextResponse.json(
                  { ok: false, error: 'PRINTER_UNAVAILABLE', message: dispatchResult.message },
                  { status: 503, headers: noStoreHeaders() },
                );
              }

              return NextResponse.json(
                {
                  ok: true,
                  dispatched: true,
                  testPrintId: dispatchResult.jobId,
                  message: dispatchResult.message,
                },
                { headers: noStoreHeaders() },
              );
            } catch (err: any) {
              if (err instanceof PrinterSecurityError) {
                return NextResponse.json(
                  { ok: false, error: 'PRINTER_SECURITY_ERROR', message: err.message },
                  { status: 400, headers: noStoreHeaders() },
                );
              }
              throw err;
            }
          }

          case 'CONFIGURE_PRINTER': {
            const driver = typeof body.driver === 'string' ? body.driver : 'epson_escpos';
            const endpoint = typeof body.endpoint === 'string' ? body.endpoint : '192.168.1.200:9100';
            const paperWidth = typeof body.paperWidth === 'string' ? body.paperWidth : '80mm';

            if (body.hardwarePending) {
              const checklist = await recordPrinterPending(canonicalTenantId, session.userId, { driver, endpoint, paperWidth }, expectedVersion);
              return NextResponse.json({ ok: true, checklist }, { headers: noStoreHeaders() });
            }

            // Must have a verified server-side print job acknowledged by hardware
            const testPrintId = typeof body.testPrintId === 'string' ? body.testPrintId : '';
            if (!testPrintId || !verifyServerPrintJob(canonicalTenantId, testPrintId)) {
              return NextResponse.json(
                {
                  ok: false,
                  error: 'PRINTER_JOB_NOT_ACKNOWLEDGED',
                  message: 'A verified test print dispatch acknowledged by hardware is required before marking printer connected. Or choose "Hardware Pending".',
                },
                { status: 400, headers: noStoreHeaders() },
              );
            }

            const checklist = await recordPrinterConfigured(
              canonicalTenantId,
              session.userId,
              { driver, endpoint, paperWidth, testPrintId },
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

      // 2. Generic Item Mutation: COMPLETED IS STRICTLY FORBIDDEN
      const itemId = body.itemId as ChecklistItemId;
      const status = body.status as ChecklistItemStatus;

      if (!itemId || !VALID_ITEM_IDS.includes(itemId)) {
        return NextResponse.json(
          { ok: false, error: 'INVALID_ITEM_ID', message: `Item ID must be one of: ${VALID_ITEM_IDS.join(', ')}` },
          { status: 400, headers: noStoreHeaders() },
        );
      }

      if (status === 'COMPLETED') {
        return NextResponse.json(
          {
            ok: false,
            error: 'COMPLETION_FABRICATION_FORBIDDEN',
            message: 'Direct transition to COMPLETED via generic mutation is prohibited. Dedicated server verification workflow is required.',
          },
          { status: 400, headers: noStoreHeaders() },
        );
      }

      if (!status || !VALID_SAFE_STATUSES.includes(status)) {
        return NextResponse.json(
          { ok: false, error: 'INVALID_STATUS', message: `Status must be one of: ${VALID_SAFE_STATUSES.join(', ')}` },
          { status: 400, headers: noStoreHeaders() },
        );
      }

      // Strip client-submitted evidence flags to prevent client-side evidence smuggling
      const safeEvidence = body.evidence && typeof body.evidence === 'object'
        ? {
            metadata: body.evidence.metadata,
          }
        : undefined;

      const checklist = await updateChecklistItem(canonicalTenantId, {
        itemId,
        status,
        statusNote: typeof body.statusNote === 'string' ? body.statusNote : undefined,
        evidence: safeEvidence,
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
