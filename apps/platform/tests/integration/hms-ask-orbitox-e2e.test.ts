import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { chromium, type Browser } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createTestOperatorSession,
  deleteTestOperatorSession,
  type TestOperatorSession,
} from './test-operator-session';
import { withTenantTx } from '@/server/db/tenant-db';
import { createStaffCredential } from '@/server/auth/hms-auth';
import { getPhiKeyRing, seal, blindIndex } from '@/server/hospital/phi-crypto';
import { platformRepository } from '@/server/db/platform-repository';

const BASE_URL = (process.env.ORBITOX_URL || 'http://localhost:3005').replace(/\/$/, '');

async function launchBrowser(): Promise<Browser> {
  const launchArgs = ['--disable-extensions'];
  try {
    return await chromium.launch({ headless: true, args: launchArgs });
  } catch (err) {
    const cacheDir = path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright');
    const linuxCache = path.join(os.homedir(), '.cache', 'ms-playwright');
    for (const root of [cacheDir, linuxCache]) {
      if (!fs.existsSync(root)) continue;
      const dirs = fs
        .readdirSync(root)
        .filter((d) => d.startsWith('chromium_headless_shell-') || d.startsWith('chromium-'))
        .sort()
        .reverse();
      for (const dir of dirs) {
        const candidates = [
          path.join(root, dir, 'chrome-headless-shell-mac-x64', 'chrome-headless-shell'),
          path.join(root, dir, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell'),
          path.join(root, dir, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
        ];
        for (const exe of candidates) {
          if (fs.existsSync(exe)) {
            return await chromium.launch({ headless: true, executablePath: exe, args: launchArgs });
          }
        }
      }
    }
    throw err;
  }
}

function parseCookies(sessionCookie: string): { sessionVal: string; csrfVal: string } {
  const s = sessionCookie.match(/orbitox_operator_session=([^;]+)/)?.[1] || '';
  const c = sessionCookie.match(/orbitox_operator_csrf=([^;]+)/)?.[1] || '';
  return { sessionVal: s, csrfVal: c };
}

async function run() {
  console.log('===============================================================');
  console.log(' 🪐 Revision 1.6.5: HMS Clinical Workflows & Ask OrbitoX E2E');
  console.log(' Target Base URL:', BASE_URL);
  console.log('===============================================================\n');

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://apple@127.0.0.1:5432/orbitox_phase2',
      },
    },
  });

  const suffix = crypto.randomBytes(4).toString('hex');
  let opSession: TestOperatorSession | null = null;
  let orgId: string | null = null;
  let projId: string | null = null;
  let tenantId = '';
  const browser = await launchBrowser();

  try {
    process.env.ORBITOX_ENABLE_HOSPITAL_ADMIN_ENDPOINTS = 'true';
    opSession = await createTestOperatorSession(prisma);
    const { sessionVal, csrfVal } = parseCookies(opSession.cookie);

    // 1. Provision isolated HMS org, project, installation & clinical records
    const org = await platformRepository.createOrganization({
      name: `HMS E2E Org ${suffix}`,
      slug: `hms-e2e-${suffix}`,
      billingEmail: `hms-${suffix}@example.invalid`,
    });
    orgId = org.id;

    const { project, environments } = await platformRepository.createProject({
      name: `HMS E2E Hospital ${suffix}`,
      slug: `hms-hosp-${suffix}`,
      organizationId: org.id,
      businessModel: 'B2B',
      planTier: 'enterprise',
      technicalLead: 'Dr. E2E Lead',
      contactEmail: `hms-${suffix}@example.invalid`,
      plugins: [{ pluginId: '@orbitox/hms', planId: 'hms-pro' }],
    });
    projId = project.id;
    const prodEnv = environments.find((e) => e.slug === 'production') || environments[0]!;
    tenantId = `org/${org.id}/project/${project.id}/environment/${prodEnv.id}`;

    const planMapId = `plan_map_${suffix}`;
    const subId = `sub_${suffix}`;
    await prisma.billingPlanMap.create({
      data: {
        razorpayPlanId: planMapId,
        pluginId: '@orbitox/hms',
        internalPlanId: 'hms-pro',
        amountMinor: 2500000,
        currency: 'INR',
        period: 'monthly',
        interval: 1,
      },
    });
    await prisma.billingSubscription.create({
      data: {
        razorpaySubscriptionId: subId,
        organizationId: org.id,
        tenantId,
        pluginId: '@orbitox/hms',
        razorpayPlanId: planMapId,
        status: 'active',
        graceStartedAt: new Date(Date.now() - 2 * 86400000),
      },
    });

    const deptId = `dept_${suffix}`;
    const wardId = `ward_${suffix}`;
    const bedId = `bed_${suffix}`;
    const docId = `doc_${suffix}`;
    const verifierId = `ver_${suffix}`;
    const patientId = `pat_${suffix}`;
    const docEmail = `doc.${suffix}@hospital.invalid`;
    const verEmail = `ver.${suffix}@hospital.invalid`;
    const staffPassword = 'HmsE2ePassword!99';

    const ring = getPhiKeyRing();
    await withTenantTx(prisma, tenantId, async (tx) => {
      await tx.query(`INSERT INTO "HmsDepartment" ("id", "name") VALUES ($1, $2)`, [deptId, `Cardiology ${suffix}`]);
      await tx.query(`INSERT INTO "HmsWard" ("id", "departmentId", "name") VALUES ($1, $2, $3)`, [wardId, deptId, `ICU ${suffix}`]);
      await tx.query(
        `INSERT INTO "HmsBed" ("id", "wardId", "label", "dailyRateMinor", "serviceState") VALUES ($1, $2, $3, 500000, 'IN_SERVICE')`,
        [bedId, wardId, `Bed-E2E-${suffix}`],
      );

      for (const s of [
        { id: docId, role: 'DOCTOR', email: docEmail, name: 'Dr. E2E' },
        { id: verifierId, role: 'DOCTOR', email: verEmail, name: 'Dr. Verifier' },
      ]) {
        await tx.query(
          `INSERT INTO "HmsStaff" ("id", "departmentId", "role", "nameSealed", "emailBlind", "status", "onDuty")
           VALUES ($1, $2, $3, $4, $5, 'ACTIVE', true)`,
          [
            s.id,
            deptId,
            s.role,
            seal(ring, s.name, { tenantId: tx.tenantId, column: 'nameSealed', rowId: s.id }),
            blindIndex(ring, s.email, 'email', tx.tenantId, 'emailBlind'),
          ],
        );
        await createStaffCredential(tx, s.id, staffPassword);
      }

      await tx.query(
        `INSERT INTO "HmsPatient" ("id", "mrn", "nameSealed", "nameBlind", "triageLevel", "ageBand", "gender", "processingStatus")
         VALUES ($1, $2, $3, $4, 2, '18-39', 'F', 'ACTIVE')`,
        [
          patientId,
          `MRN-${suffix.toUpperCase()}`,
          seal(ring, 'E2E Patient', { tenantId: tx.tenantId, column: 'nameSealed', rowId: patientId }),
          blindIndex(ring, 'E2E Patient', 'name', tx.tenantId, 'nameBlind'),
        ],
      );
    });

    // 2. Verify anonymous requests remain fail-closed 401
    for (const p of ['/api/hospital/beds', '/api/hospital/telemetry', '/api/v1/platform/ai']) {
      const r = await fetch(`${BASE_URL}${p}`);
      assert.equal(r.status, 401, `Anonymous GET ${p} must return 401, got ${r.status}`);
    }
    console.log('PASS  Anonymous access rejected with 401 across HMS and MCP endpoints');

    // Helper for operator+tenant authenticated requests
    let staffCookie = '';
    const opHeaders = (json = false, extra: Record<string, string> = {}): Record<string, string> => ({
      cookie: [opSession!.cookie, `orbitox_hms_tenant=${tenantId}`, staffCookie].filter(Boolean).join('; '),
      'x-tenant-id': tenantId,
      'x-csrf-token': csrfVal,
      origin: BASE_URL,
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...extra,
    });

    // 3. HMS Staff Login with { identifier, pinOrPassword } + HttpOnly cookie bridge
    const loginRes = await fetch(`${BASE_URL}/api/hospital/security/login`, {
      method: 'POST',
      headers: opHeaders(true),
      body: JSON.stringify({ identifier: docEmail, pinOrPassword: staffPassword }),
    });
    if (loginRes.status !== 200) {
      console.error('Login failed body:', await loginRes.text());
    }
    assert.equal(loginRes.status, 200, `HMS login expected 200, got ${loginRes.status}`);
    const setCookieHeader = loginRes.headers.get('set-cookie') || '';
    const staffCookieMatch = setCookieHeader.match(/orbitox_hms_staff_session=([^;]+)/);
    assert.ok(staffCookieMatch?.[1], 'Login response must set HttpOnly orbitox_hms_staff_session cookie');
    staffCookie = `orbitox_hms_staff_session=${staffCookieMatch[1]}`;
    console.log('PASS  HMS login bridged operator session and issued HttpOnly orbitox_hms_staff_session cookie');

    // 4. Beds serviceState & turnover persistence
    const badPatch = await fetch(`${BASE_URL}/api/hospital/beds/${bedId}`, {
      method: 'PATCH',
      headers: opHeaders(true),
      body: JSON.stringify({ serviceState: 'INVALID_STATE' }),
    });
    assert.equal(badPatch.status, 422, 'Invalid bed serviceState must return 422');

    const maintRes = await fetch(`${BASE_URL}/api/hospital/beds/${bedId}`, {
      method: 'PATCH',
      headers: opHeaders(true),
      body: JSON.stringify({ serviceState: 'MAINTENANCE' }),
    });
    assert.equal(maintRes.status, 200);
    const turnoverRes = await fetch(`${BASE_URL}/api/hospital/beds/${bedId}?action=turnover`, {
      method: 'POST',
      headers: opHeaders(true),
      body: '{}',
    });
    assert.equal(turnoverRes.status, 200);

    await withTenantTx(prisma, tenantId, async (tx) => {
      const { rows } = await tx.query<{ serviceState: string }>(`SELECT "serviceState" FROM "HmsBed" WHERE "id" = $1`, [bedId]);
      assert.equal(rows[0]?.serviceState, 'IN_SERVICE');
    });
    console.log('PASS  Bed maintenance PATCH (422 guard + 200) and turnover POST persisted in PostgreSQL');

    // 5. Labs order -> result -> unsealed read -> second-staff verify
    const labOrderRes = await fetch(`${BASE_URL}/api/hospital/labs`, {
      method: 'POST',
      headers: opHeaders(true),
      body: JSON.stringify({ patientId, testType: 'Troponin-I (STAT)' }),
    });
    assert.equal(labOrderRes.status, 201, `Lab order create expected 201, got ${labOrderRes.status}`);
    const labOrderJson = await labOrderRes.json();
    const labId = labOrderJson.data.id;

    const labResultRes = await fetch(`${BASE_URL}/api/hospital/labs/${labId}/results`, {
      method: 'POST',
      headers: opHeaders(true),
      body: JSON.stringify({ resultSummary: '0.02 ng/mL (Normal)' }),
    });
    assert.equal(labResultRes.status, 200, `Lab result entry expected 200, got ${labResultRes.status}`);

    const labListRes = await fetch(`${BASE_URL}/api/hospital/labs?patientId=${patientId}`, {
      headers: opHeaders(false),
    });
    assert.equal(labListRes.status, 200);
    const labListJson = await labListRes.json();
    const matchedLab = labListJson.data.find((l: any) => l.id === labId);
    assert.equal(matchedLab?.result, '0.02 ng/mL (Normal)', 'GET /api/hospital/labs must return unsealed result');

    // Switch to verifier staff session to verify result (two-person clinical verification rule)
    const verLoginRes = await fetch(`${BASE_URL}/api/hospital/security/login`, {
      method: 'POST',
      headers: opHeaders(true),
      body: JSON.stringify({ identifier: verifierId, pinOrPassword: staffPassword }),
    });
    assert.equal(verLoginRes.status, 200);
    const verCookieMatch = (verLoginRes.headers.get('set-cookie') || '').match(/orbitox_hms_staff_session=([^;]+)/);
    assert.ok(verCookieMatch?.[1]);
    staffCookie = `orbitox_hms_staff_session=${verCookieMatch[1]}`;

    const labVerifyRes = await fetch(`${BASE_URL}/api/hospital/labs/${labId}/results`, {
      method: 'POST',
      headers: opHeaders(true),
      body: JSON.stringify({ action: 'verify' }),
    });
    assert.equal(labVerifyRes.status, 200, `Lab verify expected 200, got ${labVerifyRes.status}`);
    await withTenantTx(prisma, tenantId, async (tx) => {
      const { rows } = await tx.query<{ status: string }>(`SELECT "status" FROM "HmsLabOrder" WHERE "id" = $1`, [labId]);
      assert.equal(rows[0]?.status, 'VERIFIED');
    });
    console.log('PASS  Lab order -> PHI-sealed result -> unsealed GET -> two-staff VERIFIED persisted');

    // 6. Billing invoice create -> idempotent settlement
    const invCreateRes = await fetch(`${BASE_URL}/api/hospital/billing`, {
      method: 'POST',
      headers: opHeaders(true),
      body: JSON.stringify({ patientId, totalMinor: 150000 }),
    });
    assert.equal(invCreateRes.status, 201);
    const invId = (await invCreateRes.json()).data.id;
    const payKey = `pay_e2e_${suffix}_key`;

    const payRes1 = await fetch(`${BASE_URL}/api/hospital/billing/pay/${invId}`, {
      method: 'POST',
      headers: opHeaders(true, { 'Idempotency-Key': payKey }),
      body: JSON.stringify({ method: 'CARD', amountMinor: 150000 }),
    });
    assert.equal(payRes1.status, 201);
    const payRes2 = await fetch(`${BASE_URL}/api/hospital/billing/pay/${invId}`, {
      method: 'POST',
      headers: opHeaders(true, { 'Idempotency-Key': payKey }),
      body: JSON.stringify({ method: 'CARD', amountMinor: 150000 }),
    });
    assert.equal(payRes2.status, 200);
    assert.equal((await payRes2.json()).data?.replayed, true);
    await withTenantTx(prisma, tenantId, async (tx) => {
      const { rows } = await tx.query<{ status: string }>(`SELECT "status" FROM "HmsInvoice" WHERE "id" = $1`, [invId]);
      assert.equal(rows[0]?.status, 'PAID');
    });
    console.log('PASS  Billing invoice create + idempotent CARD settlement persisted as PAID');

    // 7. Telemetry alarm & clear persistence
    const alarmRes = await fetch(`${BASE_URL}/api/hospital/telemetry`, {
      method: 'POST',
      headers: opHeaders(true),
      body: JSON.stringify({
        bedId,
        event: 'TELEMETRY_ALARM',
        alarmActive: true,
        vitals: { spo2: 81, heartRate: 155, bpSys: 185, bpDia: 110, temperature: 39.4, respiratoryRate: 34 },
      }),
    });
    assert.equal(alarmRes.status, 200);
    const getTel1 = await (await fetch(`${BASE_URL}/api/hospital/telemetry`, { headers: opHeaders(false) })).json();
    const st1 = getTel1.data.find((s: any) => s.id === bedId);
    assert.equal(st1?.alarmActive, true);
    assert.equal(st1?.vitals?.heartRate, 155);

    const clearRes = await fetch(`${BASE_URL}/api/hospital/telemetry`, {
      method: 'POST',
      headers: opHeaders(true),
      body: JSON.stringify({ bedId, event: 'TELEMETRY_ALARM_CLEARED', alarmActive: false }),
    });
    assert.equal(clearRes.status, 200);
    const getTel2 = await (await fetch(`${BASE_URL}/api/hospital/telemetry`, { headers: opHeaders(false) })).json();
    const st2 = getTel2.data.find((s: any) => s.id === bedId);
    assert.equal(st2?.alarmActive, false);
    console.log('PASS  Telemetry alarm trigger & clear persisted in TenantOutbox');

    // 8. Ask OrbitoX MCP live HTTP flow
    const mcpSchemaRes = await fetch(`${BASE_URL}/api/v1/platform/ai`, {
      method: 'POST',
      headers: opHeaders(true),
      body: JSON.stringify({ toolName: 'db_read_schema', parameters: {} }),
    });
    assert.equal(mcpSchemaRes.status, 200);
    const mcpSchemaJson = await mcpSchemaRes.json();
    assert.equal(mcpSchemaJson.data?.execution?.status, 'AUTHORIZED_EXECUTED');

    const mcpEraseRes = await fetch(`${BASE_URL}/api/v1/platform/ai`, {
      method: 'POST',
      headers: opHeaders(true),
      body: JSON.stringify({ toolName: 'data_rights.erase', parameters: { tenantId } }),
    });
    assert.equal(mcpEraseRes.status, 403);
    assert.equal((await mcpEraseRes.json()).error?.code, 'TOOL_POLICY_BLOCKED');

    const mcpTriageRes = await fetch(`${BASE_URL}/api/v1/platform/ai`, {
      method: 'POST',
      headers: opHeaders(true),
      body: JSON.stringify({ toolName: 'hms_triage_score', parameters: { tenantId } }),
    });
    assert.equal(mcpTriageRes.status, 200);
    const triageJson = await mcpTriageRes.json();
    assert.equal(triageJson.data?.execution?.status, 'AUTHORIZED_EXECUTED');
    assert.equal(triageJson.data?.output?.totalActivePatients, 1);

    const mcpPropRes = await fetch(`${BASE_URL}/api/v1/platform/ai`, {
      method: 'POST',
      headers: opHeaders(true),
      body: JSON.stringify({
        toolName: 'billing.send_payment_reminder',
        parameters: { subscriptionIds: [subId] },
      }),
    });
    assert.equal(mcpPropRes.status, 202);
    const proposalId = (await mcpPropRes.json()).data?.approval?.id;
    assert.ok(proposalId);

    const rejectRes = await fetch(`${BASE_URL}/api/v1/platform/ai/approvals/${proposalId}/reject`, {
      method: 'POST',
      headers: opHeaders(true),
      body: JSON.stringify({ reason: 'E2E cleanup rejection' }),
    });
    assert.equal(rejectRes.status, 200);
    console.log('PASS  Ask OrbitoX MCP schema, NEVER_AI block, tenant-scoped HMS triage & approval lifecycle verified');

    // 9. Playwright UI sanity check across HMS & /console/ai
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addCookies([
      { name: 'orbitox_operator_session', value: sessionVal, domain: 'localhost', path: '/' },
      { name: 'orbitox_operator_csrf', value: csrfVal, domain: 'localhost', path: '/' },
      { name: 'orbitox_hms_tenant', value: tenantId, domain: 'localhost', path: '/' },
    ]);
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(`${page.url()}: ${e.message}`));

    for (const uiPath of ['/hms/beds', '/hms/labs', '/hms/billing', '/hms/telemetry', '/console/ai']) {
      const r = await page.goto(`${BASE_URL}${uiPath}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      assert.equal(r?.status(), 200, `${uiPath} returned HTTP ${r?.status()}`);
      await page.waitForTimeout(500);
    }
    assert.equal(pageErrors.length, 0, `Uncaught page errors detected: ${pageErrors.join('; ')}`);
    console.log('PASS  Playwright rendered /hms/beds, /hms/labs, /hms/billing, /hms/telemetry, and /console/ai with 0 page errors');
  } finally {
    await browser.close().catch(() => {});
    if (tenantId) {
      await prisma.billingSubscription.deleteMany({ where: { tenantId } }).catch(() => {});
      await prisma.billingPlanMap.deleteMany({ where: { razorpayPlanId: `plan_map_${suffix}` } }).catch(() => {});
      await withTenantTx(prisma, tenantId, async (tx) => {
        await tx.query(`DELETE FROM "TenantOutbox"`);
        await tx.query(`DELETE FROM "HmsPayment"`);
        await tx.query(`DELETE FROM "HmsInvoice"`);
        await tx.query(`DELETE FROM "HmsLabOrder"`);
        await tx.query(`DELETE FROM "HmsAdmission"`);
        await tx.query(`DELETE FROM "HmsBed"`);
        await tx.query(`DELETE FROM "HmsWard"`);
        await tx.query(`DELETE FROM "HmsPatient"`);
        await tx.query(`DELETE FROM "HmsStaffSession"`);
        await tx.query(`DELETE FROM "HmsStaffCredential"`);
        await tx.query(`DELETE FROM "HmsStaff"`);
        await tx.query(`DELETE FROM "HmsDepartment"`);
      }).catch(() => {});
      await prisma.pluginInstallation.deleteMany({ where: { tenantId } }).catch(() => {});
    }
    if (projId) await prisma.platformProject.deleteMany({ where: { id: projId } }).catch(() => {});
    if (orgId) await prisma.platformOrganization.deleteMany({ where: { id: orgId } }).catch(() => {});
    if (opSession) {
      await prisma.mcpToolInvocation.deleteMany({ where: { actorId: opSession.operatorId } }).catch(() => {});
      await prisma.mcpToolApproval.deleteMany({ where: { requestedById: opSession.operatorId } }).catch(() => {});
      await deleteTestOperatorSession(prisma, opSession.operatorId).catch(() => {});
    }
    await prisma.$disconnect().catch(() => {});
  }

  console.log('\nSUMMARY: All HMS Clinical Workflows & Ask OrbitoX E2E checks PASSED.');
}

run().catch((err) => {
  console.error('\nFAIL:', err);
  process.exit(1);
});
