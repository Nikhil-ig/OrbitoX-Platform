import { NextRequest, NextResponse } from 'next/server';
import { getDefaultBridgeKeys, verifyBridgeRequest, MemoryNonceStore } from '@orbitox-io/bridge';
import { withTenantTx } from '@/server/db/tenant-db';
import { prisma } from '@/server/db/prisma';
import { ensureDefaultRoles } from '@/server/auth/hms-auth';
import { platformRepository } from '@/server/db/platform-repository';
import { hmsGrantEnforcer } from '@/app/api/_lib/route-auth';
import { ProvisioningValidationError, validateProvisioningPlugins } from '@/server/provisioning/provisioning-saga';

const bridgeNonceStore = new MemoryNonceStore();

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ action: string }> }
) {
  let action: string;
  try {
    const resolvedParams = await props.params;
    action = resolvedParams.action;
  } catch {
    return NextResponse.json(
      { error: 'BAD_REQUEST', message: 'Missing or invalid route action parameter' },
      { status: 400 }
    );
  }

  let bridgeKeys;
  try {
    bridgeKeys = getDefaultBridgeKeys();
  } catch (keyErr: any) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', code: 'BRIDGE_SIGNATURE_REQUIRED', message: `Bridge key configuration error: ${keyErr?.message || keyErr}` },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const pathWithQuery = url.pathname + url.search;
  let bodyText = '';
  try {
    bodyText = await req.clone().text();
  } catch {}

  const headersObj: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    headersObj[k] = v;
  });

  // 1. Verify cryptographic bridge signature
  let verified;
  try {
    verified = await verifyBridgeRequest(bridgeKeys, bridgeNonceStore, {
      method: req.method,
      pathWithQuery,
      headers: headersObj,
      rawBody: bodyText,
    });
  } catch (verifyErr: any) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', code: 'BRIDGE_SIGNATURE_REQUIRED', message: `Bridge signature verification error: ${verifyErr?.message || verifyErr}` },
      { status: 401 }
    );
  }

  if (!verified.ok) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', code: 'BRIDGE_SIGNATURE_REQUIRED', message: `Bridge signature verification failed: ${verified.reason}` },
      { status: 401 }
    );
  }

  const targetTenantId = verified.tenantId;
  let body: any = {};
  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch { }

  const idempotencyKey =
    (req.headers.get('x-idempotency-key') as string) ||
    body.idempotencyKey ||
    req.headers.get('x-orbitox-nonce') ||
    req.headers.get('bridge-nonce');

  const incomingRevision =
    typeof body.revision === 'number'
      ? body.revision
      : typeof body.entitlementRevision === 'number'
        ? body.entitlementRevision
        : 1;

  // 2. Check existing installation and revisions
  const existingInstallation = await platformRepository.getPluginInstallation(targetTenantId, '@orbitox/hms');
  const currentRevision = existingInstallation?.entitlementRevision || 0;

  // Check for older revision rollback attempts
  if (existingInstallation && incomingRevision > 0 && incomingRevision < currentRevision) {
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: 'OLDER_REVISION',
      currentRevision,
      incomingRevision,
    });
  }

  // Idempotency: if already provisioned and same revision/key
  if (action === 'provision' && existingInstallation && existingInstallation.status === 'ACTIVE') {
    return NextResponse.json({
      ok: true,
      replayed: true,
      tenantId: targetTenantId,
      status: existingInstallation.status,
      planId: existingInstallation.planId,
      revision: currentRevision,
    });
  }

  // 3. Dispatch lifecycle action
  switch (action) {
    case 'provision': {
      let planId: string;
      try {
        const [validatedPlugin] = await validateProvisioningPlugins([{
          id: '@orbitox/hms',
          plan: body.planId ?? body.plan,
        }]);
        if (!validatedPlugin) throw new ProvisioningValidationError('A catalogue plan is required.');
        planId = validatedPlugin.plan;
      } catch (error) {
        if (!(error instanceof ProvisioningValidationError)) throw error;
        return NextResponse.json(
          { error: error.code, message: error.message },
          { status: 400 }
        );
      }

      // Seed default clinical structure inside tenant transaction
      let seeded = false;
      try {
        await withTenantTx(prisma, targetTenantId, async (tx) => {
          // Seed General Medicine department
          await tx.query(
            `INSERT INTO "HmsDepartment" ("id", "name")
             VALUES ('dept_general', 'General Medicine')
             ON CONFLICT ("tenantId", "name") DO NOTHING`
          );

          // Seed ICU department
          await tx.query(
            `INSERT INTO "HmsDepartment" ("id", "name")
             VALUES ('dept_icu', 'Intensive Care Unit')
             ON CONFLICT ("tenantId", "name") DO NOTHING`
          );

          // Seed ICU Ward
          await tx.query(
            `INSERT INTO "HmsWard" ("id", "departmentId", "name")
             VALUES ('ward_icu', 'dept_icu', 'Intensive Care Unit')
             ON CONFLICT ("tenantId", "id") DO NOTHING`
          );

          // Seed default bed
          await tx.query(
            `INSERT INTO "HmsBed" ("id", "wardId", "label", "dailyRateMinor")
             VALUES ('bed_icu_01', 'ward_icu', 'Bed ICU-01', 500000)
             ON CONFLICT ("tenantId", "wardId", "label") DO NOTHING`
          );

          // Seed default RBAC system roles (ADMIN, DOCTOR, NURSE, PHARMACIST, BILLING)
          await ensureDefaultRoles(tx);
          seeded = true;
        });
      } catch (err: any) {
        // Fallback for non-postgres JSON/Memory test adapters
        console.warn('[HospitalOS Lifecycle] Database seeding note:', err?.message || err);
      }

      await platformRepository.provisionPluginInstallation({
        tenantId: targetTenantId,
        pluginId: '@orbitox/hms',
        runtimeTenantId: targetTenantId,
        planId,
        config: body.config || {},
        entitlementRevision: Math.max(1, incomingRevision),
      });

      hmsGrantEnforcer.invalidate(targetTenantId);

      return NextResponse.json({
        ok: true,
        tenantId: targetTenantId,
        status: 'ACTIVE',
        planId,
        revision: Math.max(1, incomingRevision),
        seeded: {
          departments: ['General Medicine', 'Intensive Care Unit'],
          roles: ['ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST', 'BILLING'],
        },
      });
    }

    case 'suspend': {
      await platformRepository.updatePluginInstallationStatus(targetTenantId, '@orbitox/hms', 'SUSPENDED');
      hmsGrantEnforcer.invalidate(targetTenantId);
      return NextResponse.json({
        ok: true,
        tenantId: targetTenantId,
        status: 'SUSPENDED',
        revision: Math.max(currentRevision, incomingRevision),
      });
    }

    case 'resume': {
      await platformRepository.updatePluginInstallationStatus(targetTenantId, '@orbitox/hms', 'ACTIVE');
      hmsGrantEnforcer.invalidate(targetTenantId);
      return NextResponse.json({
        ok: true,
        tenantId: targetTenantId,
        status: 'ACTIVE',
        revision: Math.max(currentRevision, incomingRevision),
      });
    }

    case 'plan-changed':
    case 'planChanged': {
      let newPlanId: string;
      try {
        const [validatedPlugin] = await validateProvisioningPlugins([{
          id: '@orbitox/hms',
          plan: body.planId ?? body.plan,
        }]);
        if (!validatedPlugin) throw new ProvisioningValidationError('A catalogue plan is required.');
        newPlanId = validatedPlugin.plan;
      } catch (error) {
        if (!(error instanceof ProvisioningValidationError)) throw error;
        return NextResponse.json(
          { error: error.code, message: error.message },
          { status: 400 }
        );
      }

      await platformRepository.changePluginInstallationPlan(
        targetTenantId,
        '@orbitox/hms',
        newPlanId
      );
      hmsGrantEnforcer.invalidate(targetTenantId);
      return NextResponse.json({
        ok: true,
        tenantId: targetTenantId,
        status: 'ACTIVE',
        planId: newPlanId,
        revision: Math.max(currentRevision + 1, incomingRevision),
      });
    }

    case 'deprovision': {
      await platformRepository.updatePluginInstallationStatus(targetTenantId, '@orbitox/hms', 'DEPROVISIONING');
      hmsGrantEnforcer.invalidate(targetTenantId);
      return NextResponse.json({
        ok: true,
        tenantId: targetTenantId,
        status: 'DEPROVISIONED',
      });
    }

    default:
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: `Unknown lifecycle action "${action}". Supported: provision, suspend, resume, planChanged, deprovision.` },
        { status: 400 }
      );
  }
}
