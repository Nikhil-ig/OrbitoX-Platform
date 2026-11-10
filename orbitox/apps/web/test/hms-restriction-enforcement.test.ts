import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { Pool } from 'pg';
import { blindIndex, getPhiKeyRing, seal } from '../lib/phi-crypto';
import { withTenantTx } from '../lib/tenant-db';
import { mapDbError } from '../lib/db-errors';
import { platformRepository } from '../lib/platform-repository';

// Hospital & V1 HMS write endpoints
import { POST as postHospitalAdmission } from '../app/api/hospital/admissions/route';
import { POST as postHospitalAppointment } from '../app/api/hospital/appointments/route';
import {
  DELETE as deleteHospitalAppointmentById,
  PATCH as patchHospitalAppointmentById,
} from '../app/api/hospital/appointments/[id]/route';
import { POST as postHospitalBilling } from '../app/api/hospital/billing/route';
import { POST as payHospitalInvoice } from '../app/api/hospital/billing/pay/[id]/route';
import { POST as postHospitalLab } from '../app/api/hospital/labs/route';
import { POST as postHospitalLabResults } from '../app/api/hospital/labs/[id]/results/route';
import {
  PATCH as patchHospitalPatientById,
  POST as postHospitalPatientAction,
} from '../app/api/hospital/patients/[id]/route';
import { POST as postHospitalBreakGlass } from '../app/api/hospital/security/break-glass/route';
import {
  PATCH as patchHospitalTreatment,
  POST as postHospitalTreatment,
} from '../app/api/hospital/treatments/route';
import { POST as postV1Beds } from '../app/api/v1/hms/beds/route';
import { POST as postV1Labs } from '../app/api/v1/hms/labs/route';
import { POST as postV1TriageAdvance } from '../app/api/v1/hms/triage/advance/route';
import { POST as postV1PrincipalDsr } from '../app/api/v1/hms/data-rights/principal/route';

process.env.APP_DATABASE_URL =
  process.env.APP_DATABASE_URL || 'postgresql://orbitox_runtime:phase2-local-app@127.0.0.1:5432/orbitox_phase2';
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.APP_DATABASE_URL;
}

const ADMIN_TOKEN = 'phase6g_g1_restriction_test_admin_token_32chars';

describe('Phase 6G G-1: HMS Patient Processing Restriction Enforcement (Routes + DB Triggers)', () => {
  const runSuffix = crypto.randomBytes(4).toString('hex');
  const tenantId = `org/g1-restr-${runSuffix}/project/p1/environment/prod`;
  const runtimePool = new Pool({ connectionString: process.env.APP_DATABASE_URL });
  const maintenanceUrl = process.env.MAINTENANCE_DATABASE_URL || process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  const maintenancePool = new Pool({ connectionString: maintenanceUrl });

  let apiKeySecret = '';
  let orgId = '';
  let projId = '';
  let envId = '';

  const ids = {
    deptId: `dep_g1_${runSuffix}`,
    wardId: `ward_g1_${runSuffix}`,
    bed1Id: `bed1_g1_${runSuffix}`,
    bed2Id: `bed2_g1_${runSuffix}`,
    bed3Id: `bed3_g1_${runSuffix}`,
    doctorId: `doc_g1_${runSuffix}`,
    verifierId: `ver_g1_${runSuffix}`,
    sessionId: `sess_g1_${runSuffix}`,
    sessionToken: crypto.randomBytes(32).toString('hex'),
    restrictedPatientId: `pat_r_${runSuffix}`,
    restrictedMrn: `MRN-G1R-${runSuffix.toUpperCase()}`,
    activePatientId: `pat_a_${runSuffix}`,
    activeMrn: `MRN-G1A-${runSuffix.toUpperCase()}`,
    openAdmissionId: `adm_g1_${runSuffix}`,
    appointmentId: `apt_g1_${runSuffix}`,
    processingLabId: `lab_proc_${runSuffix}`,
    resultedLabId: `lab_res_${runSuffix}`,
    invoiceId: `inv_g1_${runSuffix}`,
  };

  function makeReq(
    urlPath: string,
    method: string,
    body?: Record<string, unknown>,
    extraHeaders?: Record<string, string>,
  ): NextRequest {
    const headers = new Headers();
    headers.set('authorization', `Bearer ${ADMIN_TOKEN}`);
    headers.set('x-api-key', apiKeySecret);
    headers.set('x-tenant-id', tenantId);
    headers.set('x-context-id', tenantId);
    headers.set('x-orbitox-principal', 'admin');
    headers.set('x-forwarded-for', '127.0.0.1');
    if (body) headers.set('content-type', 'application/json');
    if (extraHeaders) {
      for (const [k, v] of Object.entries(extraHeaders)) {
        headers.set(k, v);
      }
    }
    return new NextRequest(`http://localhost:3005${urlPath}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  before(async () => {
    process.env.ORBITOX_ADMIN_TOKEN = ADMIN_TOKEN;
    process.env.ORBITOX_SERVER_PEPPER =
      process.env.ORBITOX_SERVER_PEPPER || 'test_pepper_32_characters_minimum_len';
    process.env.ORBITOX_ENABLE_HOSPITAL_ADMIN_ENDPOINTS = 'true';
    process.env.TRUST_PROXY = 'true';

    const ring = getPhiKeyRing();

    const org = await platformRepository.createOrganization({
      name: `G1 Restriction Org ${runSuffix}`,
      slug: `g1-restr-org-${runSuffix}`,
      billingEmail: `g1-${runSuffix}@orbitox.io`,
    });
    orgId = org.id;

    const projRes = await platformRepository.createProject({
      name: `G1 Restriction Project ${runSuffix}`,
      slug: `g1-restr-proj-${runSuffix}`,
      organizationId: orgId,
      businessModel: 'B2B',
      planTier: 'enterprise',
      technicalLead: 'G1 Lead',
      contactEmail: `g1-${runSuffix}@orbitox.io`,
      enabledServices: ['hms', 'platform', 'admin', 'system'],
      apiCallQuota: 1000000,
    });
    projId = projRes.project.id;
    envId = projRes.environments?.[0]?.id || '';

    const keyRes = await platformRepository.createApiKey({
      name: `G1 Restriction Key ${runSuffix}`,
      environmentId: envId || `env_g1_${runSuffix}`,
      projectId: projId,
      capabilities: ['write', 'hms:read', 'hms:write', 'hms.patients.write', 'hms.data_rights', 'admin'],
      tenantScope: [tenantId, '*'],
      createdBy: 'test_g1_suite',
    });
    apiKeySecret = keyRes.rawSecret;

    await platformRepository.provisionPluginInstallation({
      tenantId,
      runtimeTenantId: tenantId,
      pluginId: '@orbitox/hms',
      status: 'ACTIVE',
      planId: 'hms-starter',
    });

    await withTenantTx(runtimePool, tenantId, async (tx) => {
      await tx.query(`INSERT INTO "HmsDepartment"(id, name) VALUES ($1, $2)`, [ids.deptId, `Cardio G1 ${runSuffix}`]);
      await tx.query(`INSERT INTO "HmsWard"(id, "departmentId", name) VALUES ($1, $2, $3)`, [
        ids.wardId,
        ids.deptId,
        `Ward G1 ${runSuffix}`,
      ]);
      for (const [bedId, label] of [
        [ids.bed1Id, `G1-B1-${runSuffix}`],
        [ids.bed2Id, `G1-B2-${runSuffix}`],
        [ids.bed3Id, `G1-B3-${runSuffix}`],
      ] as const) {
        await tx.query(`INSERT INTO "HmsBed"(id, "wardId", label, "dailyRateMinor") VALUES ($1, $2, $3, 150000)`, [
          bedId,
          ids.wardId,
          label,
        ]);
      }

      for (const [staffId, name, email, role] of [
        [ids.doctorId, 'Dr. G1 Alpha', `doc.${runSuffix}@g1.test`, 'DOCTOR'],
        [ids.verifierId, 'Dr. G1 Verifier', `ver.${runSuffix}@g1.test`, 'DOCTOR'],
      ] as const) {
        await tx.query(`INSERT INTO "HmsStaff"(id, "nameSealed", "emailBlind", role) VALUES ($1, $2, $3, $4)`, [
          staffId,
          seal(ring, name, { tenantId, column: 'nameSealed', rowId: staffId }),
          blindIndex(ring, email, 'email', tenantId, 'emailBlind'),
          role,
        ]);
      }

      await tx.query(
        `INSERT INTO "HmsRole"(id, name, "isSystem") VALUES ('role_doctor', 'DOCTOR', true) ON CONFLICT DO NOTHING`,
      );
      const tokenHash = crypto.createHash('sha256').update(ids.sessionToken).digest('hex');
      await tx.query(
        `INSERT INTO "HmsStaffSession"(id, "staffId", "roleId", "tokenHash", "expiresAt", "absoluteExpiresAt")
         VALUES ($1, $2, 'role_doctor', $3, now() + interval '30 minutes', now() + interval '12 hours')`,
        [ids.sessionId, ids.doctorId, tokenHash],
      );

      for (const [patId, mrn, patName] of [
        [ids.restrictedPatientId, ids.restrictedMrn, 'Patient G1 Restricted'],
        [ids.activePatientId, ids.activeMrn, 'Patient G1 Active'],
      ] as const) {
        await tx.query(`INSERT INTO "HmsPatient"(id, mrn, "nameSealed", "nameBlind") VALUES ($1, $2, $3, $4)`, [
          patId,
          mrn,
          seal(ring, patName, { tenantId, column: 'nameSealed', rowId: patId }),
          blindIndex(ring, patName, 'name', tenantId, 'nameBlind'),
        ]);
      }

      // Open inpatient admission on bed1 (to verify discharge exception works while new admits fail)
      await tx.query(
        `INSERT INTO "HmsAdmission"(id, "patientId", "bedId", "attendingStaffId") VALUES ($1, $2, $3, $4)`,
        [ids.openAdmissionId, ids.restrictedPatientId, ids.bed1Id, ids.doctorId],
      );

      // Appointment to test PATCH / DELETE while restricted
      await tx.query(
        `INSERT INTO "HmsAppointment"(id, "patientId", "doctorId", slot)
         VALUES ($1, $2, $3, '[2026-12-01 10:00+00, 2026-12-01 10:30+00)')`,
        [ids.appointmentId, ids.restrictedPatientId, ids.doctorId],
      );

      // Lab orders in PROCESSING and RESULTED state so results/verify/treatment routes hit patient restriction (not state machine)
      await tx.query(
        `INSERT INTO "HmsLabOrder"(id, "patientId", "orderedById", "testType", status)
         VALUES ($1, $2, $3, 'CBC', 'ORDERED')`,
        [ids.processingLabId, ids.restrictedPatientId, ids.doctorId],
      );
      await tx.query(`UPDATE "HmsLabOrder" SET status = 'COLLECTED' WHERE id = $1`, [ids.processingLabId]);
      await tx.query(`UPDATE "HmsLabOrder" SET status = 'PROCESSING' WHERE id = $1`, [ids.processingLabId]);

      const sealedResult = seal(ring, 'Hemoglobin 13.8 g/dL', {
        tenantId,
        column: 'result',
        rowId: ids.resultedLabId,
      });
      await tx.query(
        `INSERT INTO "HmsLabOrder"(id, "patientId", "orderedById", "testType", status, "resultSealed", "resultedById")
         VALUES ($1, $2, $3, 'CMP', 'RESULTED', $4, $3)`,
        [ids.resultedLabId, ids.restrictedPatientId, ids.doctorId, sealedResult],
      );

      // Open invoice (to verify HmsPayment settlement exception works while creating new invoices fails)
      await tx.query(
        `INSERT INTO "HmsInvoice"(id, "patientId", "totalMinor") VALUES ($1, $2, 75000)`,
        [ids.invoiceId, ids.restrictedPatientId],
      );
    });

    // Restrict the target patient via the official DSR principal endpoint
    const res = await postV1PrincipalDsr(
      makeReq('/api/v1/hms/data-rights/principal', 'POST', {
        action: 'erase',
        mode: 'RESTRICT',
        principal: { kind: 'patient', id: ids.restrictedPatientId },
        reason: 'G-1 integration verification legal hold restriction',
      }),
    );
    assert.equal(res.status, 200, `Restrict request failed: ${await res.clone().text()}`);
  });

  after(async () => {
    try {
      const client = await maintenancePool.connect();
      try {
        await client.query('BEGIN');
        await client.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [tenantId]);
        for (const table of [
          'HmsPayment',
          'HmsInvoice',
          'HmsLabOrder',
          'HmsAppointment',
          'HmsAdmission',
          'HmsBreakGlassGrant',
          'HmsPhiAccessLog',
          'HmsPatient',
          'HmsStaffSession',
          'HmsStaff',
          'HmsBed',
          'HmsWard',
          'HmsDepartment',
          'TenantOutbox',
          'TenantIdempotencyKey',
        ]) {
          await client.query(`DELETE FROM public."${table}" WHERE "tenantId" = $1`, [tenantId]);
        }
        await client.query('COMMIT');
        if (orgId) {
          await client.query(`SELECT public.close_customer_organization($1)`, [orgId]).catch(() => {});
        }
      } catch {
        await client.query('ROLLBACK').catch(() => {});
      } finally {
        client.release();
      }
    } catch {
      // Best-effort cleanup in non-maintenance environments
    }
    await runtimePool.end();
    await maintenancePool.end();
  });

  it('refuses unauthenticated /api/v1/hms/labs POST without falling back to staff_doctor or body.orderedById', async () => {
    const noStaffRes = await postV1Labs(
      makeReq('/api/v1/hms/labs', 'POST', {
        patientId: ids.activePatientId,
        orderedById: ids.doctorId,
        testType: 'Lipid Panel',
      }),
    );
    assert.equal(noStaffRes.status, 401);
    const noStaffJson = await noStaffRes.json();
    assert.equal(noStaffJson.error?.code, 'STAFF_IDENTITY_REQUIRED');

    const badSessionRes = await postV1Labs(
      makeReq(
        '/api/v1/hms/labs',
        'POST',
        { patientId: ids.activePatientId, testType: 'Lipid Panel' },
        { 'x-staff-session': 'invalid_session_token' },
      ),
    );
    assert.equal(badSessionRes.status, 401);

    // With valid x-staff-session, body.orderedById must be ignored in favor of authenticated staffId
    const validRes = await postV1Labs(
      makeReq(
        '/api/v1/hms/labs',
        'POST',
        { patientId: ids.activePatientId, orderedById: 'forged_staff_id', testType: 'Lipid Panel' },
        { 'x-staff-session': ids.sessionToken },
      ),
    );
    assert.equal(validRes.status, 201, `Valid v1/hms/labs POST failed: ${await validRes.clone().text()}`);
    const validJson = await validRes.json();
    assert.equal(validJson.data?.orderedById, ids.doctorId);
  });

  it('blocks every /api/hospital/* and /api/v1/hms/* write endpoint with 409 PATIENT_PROCESSING_RESTRICTED', async () => {
    const writeAttempts: Array<{ name: string; run: () => Promise<Response> }> = [
      {
        name: 'POST /api/hospital/admissions (admit)',
        run: () =>
          postHospitalAdmission(
            makeReq('/api/hospital/admissions', 'POST', {
              patientId: ids.restrictedPatientId,
              bedId: ids.bed2Id,
              staffId: ids.doctorId,
            }),
          ),
      },
      {
        name: 'POST /api/hospital/patients/[id]?action=admit',
        run: () =>
          postHospitalPatientAction(
            makeReq(`/api/hospital/patients/${ids.restrictedPatientId}?action=admit`, 'POST', {
              bedId: ids.bed2Id,
              staffId: ids.doctorId,
            }),
            { params: Promise.resolve({ id: ids.restrictedPatientId }) },
          ),
      },
      {
        name: 'PATCH /api/hospital/patients/[id]',
        run: () =>
          patchHospitalPatientById(
            makeReq(`/api/hospital/patients/${ids.restrictedPatientId}`, 'PATCH', { triageLevel: 2 }),
            { params: Promise.resolve({ id: ids.restrictedPatientId }) },
          ),
      },
      {
        name: 'POST /api/hospital/appointments',
        run: () =>
          postHospitalAppointment(
            makeReq('/api/hospital/appointments', 'POST', {
              patientId: ids.restrictedPatientId,
              doctorId: ids.doctorId,
              start: '2026-12-02T10:00:00Z',
              end: '2026-12-02T10:30:00Z',
            }),
          ),
      },
      {
        name: 'PATCH /api/hospital/appointments/[id]',
        run: () =>
          patchHospitalAppointmentById(
            makeReq(`/api/hospital/appointments/${ids.appointmentId}`, 'PATCH', { status: 'CHECKED_IN' }),
            { params: Promise.resolve({ id: ids.appointmentId }) },
          ),
      },
      {
        name: 'DELETE /api/hospital/appointments/[id]',
        run: () =>
          deleteHospitalAppointmentById(
            makeReq(`/api/hospital/appointments/${ids.appointmentId}`, 'DELETE'),
            { params: Promise.resolve({ id: ids.appointmentId }) },
          ),
      },
      {
        name: 'POST /api/hospital/labs',
        run: () =>
          postHospitalLab(
            makeReq('/api/hospital/labs', 'POST', {
              patientId: ids.restrictedPatientId,
              orderedById: ids.doctorId,
              testType: 'X-Ray',
            }),
          ),
      },
      {
        name: 'POST /api/hospital/labs/[id]/results (enter result)',
        run: () =>
          postHospitalLabResults(
            makeReq(`/api/hospital/labs/${ids.processingLabId}/results`, 'POST', {
              result: 'Normal 14.0',
              resultEnteredById: ids.doctorId,
            }),
            { params: Promise.resolve({ id: ids.processingLabId }) },
          ),
      },
      {
        name: 'POST /api/hospital/labs/[id]/results (verify)',
        run: () =>
          postHospitalLabResults(
            makeReq(`/api/hospital/labs/${ids.resultedLabId}/results`, 'POST', {
              action: 'verify',
              verifierId: ids.verifierId,
            }),
            { params: Promise.resolve({ id: ids.resultedLabId }) },
          ),
      },
      {
        name: 'POST /api/hospital/treatments',
        run: () =>
          postHospitalTreatment(
            makeReq('/api/hospital/treatments', 'POST', {
              patientId: ids.restrictedPatientId,
              orderedById: ids.doctorId,
              code: 'IV-ANTIBIOTIC',
            }),
          ),
      },
      {
        name: 'PATCH /api/hospital/treatments',
        run: () =>
          patchHospitalTreatment(
            makeReq('/api/hospital/treatments', 'PATCH', {
              treatmentId: ids.processingLabId,
              action: 'start',
            }),
          ),
      },
      {
        name: 'POST /api/hospital/billing',
        run: () =>
          postHospitalBilling(
            makeReq('/api/hospital/billing', 'POST', {
              patientId: ids.restrictedPatientId,
              totalMinor: 25000,
              currency: 'INR',
            }),
          ),
      },
      {
        name: 'POST /api/hospital/security/break-glass',
        run: () =>
          postHospitalBreakGlass(
            makeReq('/api/hospital/security/break-glass', 'POST', {
              staffId: ids.doctorId,
              patientId: ids.restrictedPatientId,
              reason: 'Checking that restricted patient blocks break-glass grant inserts',
            }),
          ),
      },
      {
        name: 'POST /api/v1/hms/beds (admit)',
        run: () =>
          postV1Beds(
            makeReq('/api/v1/hms/beds', 'POST', {
              bedId: ids.bed2Id,
              patientId: ids.restrictedPatientId,
            }),
          ),
      },
      {
        name: 'POST /api/v1/hms/labs',
        run: () =>
          postV1Labs(
            makeReq(
              '/api/v1/hms/labs',
              'POST',
              { patientId: ids.restrictedPatientId, testType: 'TSH' },
              { 'x-staff-session': ids.sessionToken },
            ),
          ),
      },
      {
        name: 'POST /api/v1/hms/triage/advance',
        run: () =>
          postV1TriageAdvance(
            makeReq('/api/v1/hms/triage/advance', 'POST', {
              patientId: ids.restrictedPatientId,
              newTriageLevel: 1,
            }),
          ),
      },
    ];

    for (const attempt of writeAttempts) {
      const res = await attempt.run();
      const bodyText = await res.text();
      assert.equal(
        res.status,
        409,
        `${attempt.name} must return 409 for restricted patient, got ${res.status}: ${bodyText}`,
      );
      const parsed = JSON.parse(bodyText);
      assert.equal(
        parsed.error?.code,
        'PATIENT_PROCESSING_RESTRICTED',
        `${attempt.name} must return PATIENT_PROCESSING_RESTRICTED, got ${bodyText}`,
      );
    }
  });

  it('rejects direct SQL INSERT/UPDATE on child tables as orbitox_runtime via DB trigger while allowing named billing payment & discharge exceptions', async () => {
    const sqlWriteCases: Array<{ name: string; sql: string; params: unknown[] }> = [
      {
        name: 'Direct SQL INSERT HmsAdmission',
        sql: `INSERT INTO public."HmsAdmission"(id, "patientId", "bedId", "attendingStaffId") VALUES ($1, $2, $3, $4)`,
        params: [`adm_sql_${runSuffix}`, ids.restrictedPatientId, ids.bed2Id, ids.doctorId],
      },
      {
        name: 'Direct SQL UPDATE HmsAdmission non-discharge field (bedId)',
        sql: `UPDATE public."HmsAdmission" SET "bedId" = $1 WHERE id = $2`,
        params: [ids.bed3Id, ids.openAdmissionId],
      },
      {
        name: 'Direct SQL INSERT HmsAppointment',
        sql: `INSERT INTO public."HmsAppointment"(id, "patientId", "doctorId", slot) VALUES ($1, $2, $3, '[2026-12-03 10:00+00, 2026-12-03 10:30+00)')`,
        params: [`apt_sql_${runSuffix}`, ids.restrictedPatientId, ids.doctorId],
      },
      {
        name: 'Direct SQL UPDATE HmsAppointment',
        sql: `UPDATE public."HmsAppointment" SET status = 'CHECKED_IN' WHERE id = $1`,
        params: [ids.appointmentId],
      },
      {
        name: 'Direct SQL INSERT HmsLabOrder',
        sql: `INSERT INTO public."HmsLabOrder"(id, "patientId", "orderedById", "testType", status) VALUES ($1, $2, $3, 'CRP', 'ORDERED')`,
        params: [`lab_sql_${runSuffix}`, ids.restrictedPatientId, ids.doctorId],
      },
      {
        name: 'Direct SQL UPDATE HmsLabOrder',
        sql: `UPDATE public."HmsLabOrder" SET status = 'CANCELLED' WHERE id = $1`,
        params: [ids.processingLabId],
      },
      {
        name: 'Direct SQL INSERT HmsInvoice',
        sql: `INSERT INTO public."HmsInvoice"(id, "patientId", "totalMinor") VALUES ($1, $2, 12000)`,
        params: [`inv_sql_${runSuffix}`, ids.restrictedPatientId],
      },
      {
        name: 'Direct SQL UPDATE HmsInvoice manually',
        sql: `UPDATE public."HmsInvoice" SET status = 'VOID' WHERE id = $1`,
        params: [ids.invoiceId],
      },
      {
        name: 'Direct SQL INSERT HmsBreakGlassGrant',
        sql: `INSERT INTO public."HmsBreakGlassGrant"(id, "staffId", "patientId", reason, "expiresAt") VALUES ($1, $2, $3, $4, now() + interval '1 hour')`,
        params: [
          `bg_sql_${runSuffix}`,
          ids.doctorId,
          ids.restrictedPatientId,
          'Direct SQL bypass attempt that must be rejected by trigger',
        ],
      },
    ];

    for (const testCase of sqlWriteCases) {
      let caught: any = null;
      await withTenantTx(runtimePool, tenantId, async (tx) => {
        try {
          await tx.query(testCase.sql, testCase.params);
        } catch (err) {
          caught = err;
        }
      });
      assert.ok(caught, `${testCase.name} must fail at DB trigger layer as orbitox_runtime`);
      assert.equal(
        caught.constraint,
        'HmsPatient_processingStatus_restricted',
        `${testCase.name} must raise HmsPatient_processingStatus_restricted, got constraint=${caught.constraint} message=${caught.message}`,
      );
      const mapped = mapDbError(caught);
      assert.equal(mapped.status, 409);
      assert.equal(mapped.code, 'PATIENT_PROCESSING_RESTRICTED');
    }

    // Named Exception 1: recording payment against an existing open invoice succeeds cleanly
    const payRes = await payHospitalInvoice(
      makeReq(`/api/hospital/billing/pay/${ids.invoiceId}`, 'POST', {
        amountMinor: 25000,
        method: 'CARD',
        idempotencyKey: `pay_g1_exc_${runSuffix}`,
        receivedById: ids.doctorId,
      }),
      { params: Promise.resolve({ id: ids.invoiceId }) },
    );
    assert.ok(
      payRes.status === 200 || payRes.status === 201,
      `Allowed billing payment exception failed (${payRes.status}): ${await payRes.clone().text()}`,
    );
    const payJson = await payRes.json();
    assert.equal(payJson.data?.invoice?.status, 'PARTIALLY_PAID');
    assert.equal(payJson.data?.invoice?.paidMinor, '25000');

    // Named Exception 2: safe clinical discharge on an open admission succeeds and frees bed1
    const dischargeRes = await postHospitalAdmission(
      makeReq('/api/hospital/admissions', 'POST', {
        action: 'discharge',
        admissionId: ids.openAdmissionId,
      }),
    );
    assert.equal(
      dischargeRes.status,
      201,
      `Allowed admission discharge exception failed: ${await dischargeRes.clone().text()}`,
    );
  });
});
