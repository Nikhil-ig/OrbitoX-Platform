import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { Pool } from 'pg';
import { withTenantTx } from '../lib/tenant-db';
import { PhiKeyRing, seal, blindIndex } from '../lib/phi-crypto';
import { hashPassword, generateSalt } from '../lib/hms-auth';

// Hospital route handlers
import { GET as getDepts } from '../app/api/hospital/departments/route';
import { GET as getHierarchy } from '../app/api/hospital/hierarchy/route';
import { GET as getBeds, POST as createBed } from '../app/api/hospital/beds/route';
import { POST as postBedAction, PATCH as patchBedById } from '../app/api/hospital/beds/[id]/route';
import { GET as getPatients, POST as createPatient } from '../app/api/hospital/patients/route';
import { GET as getPatientById, PATCH as patchPatientById } from '../app/api/hospital/patients/[id]/route';
import { GET as getAdmissions, POST as createAdmission } from '../app/api/hospital/admissions/route';
import { GET as getAppointments, POST as createAppointment } from '../app/api/hospital/appointments/route';
import { PATCH as patchAppointmentById, DELETE as deleteAppointmentById } from '../app/api/hospital/appointments/[id]/route';
import { GET as getLabs, POST as createLab } from '../app/api/hospital/labs/route';
import { POST as resultLab } from '../app/api/hospital/labs/[id]/results/route';
import { GET as getBilling } from '../app/api/hospital/billing/route';
import { POST as payInvoice } from '../app/api/hospital/billing/pay/[id]/route';
import { GET as getStats } from '../app/api/hospital/stats/route';
import { POST as postTelemetry } from '../app/api/hospital/telemetry/route';
import { GET as getAudit } from '../app/api/hospital/audit/route';
import { POST as breakGlass } from '../app/api/hospital/security/break-glass/route';
import { GET as getStaff, POST as createStaff } from '../app/api/hospital/security/staff/route';
import { GET as getStaffById } from '../app/api/hospital/security/staff/[id]/route';
import { POST as toggleDuty } from '../app/api/hospital/security/staff/[id]/toggle-duty/route';
import { GET as getRoles, POST as createRole } from '../app/api/hospital/security/roles/route';
import { GET as getPermissions } from '../app/api/hospital/security/permissions/route';
import { GET as getSession, DELETE as deleteSession } from '../app/api/hospital/security/session/route';
import { POST as loginStaff } from '../app/api/hospital/security/login/route';
import { GET as getTreatments, POST as createTreatment } from '../app/api/hospital/treatments/route';
import { POST as resetSeed } from '../app/api/hospital/reset-seed/route';

import { GET as getV1Beds } from '../app/api/v1/hms/beds/route';
import { GET as getV1Labs } from '../app/api/v1/hms/labs/route';
import { GET as getV1Patients, POST as createV1Patient } from '../app/api/v1/hms/patients/route';
import { POST as advanceTriage } from '../app/api/v1/hms/triage/advance/route';

process.env.APP_DATABASE_URL = process.env.APP_DATABASE_URL || 'postgresql://orbitox_runtime@127.0.0.1:5432/orbitox_phase2';
process.env.PLATFORM_AUDIT_DATABASE_URL = process.env.PLATFORM_AUDIT_DATABASE_URL || 'postgresql://orbitox_platform_admin_audit@127.0.0.1:5432/orbitox_phase2';
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.APP_DATABASE_URL;
}

import { platformRepository } from '../lib/platform-repository';

const ADMIN_TOKEN = 'phase2b3_cross_tenant_test_admin_token_32chars';
const TENANT_A = 'org/cross-a/project/p1/environment/prod';
const TENANT_B = 'org/cross-b/project/p1/environment/prod';

let apiKeySecret = '';

const url = process.env.APP_DATABASE_URL;
const pool = new Pool({ connectionString: url });

const ring = new PhiKeyRing({
  keys: { k2026a: crypto.randomBytes(32).toString('base64') },
  activeKid: 'k2026a',
  indexKey: crypto.randomBytes(32).toString('base64'),
});

function makeRequest(tenantId: string, urlPath: string, method = 'GET', body?: any): NextRequest {
  const headers = new Headers();
  headers.set('authorization', `Bearer ${ADMIN_TOKEN}`);
  if (apiKeySecret) {
    headers.set('x-api-key', apiKeySecret);
  }
  headers.set('x-tenant-id', tenantId);
  headers.set('x-context-id', tenantId);
  headers.set('x-orbitox-principal', 'admin');
  if (body) headers.set('content-type', 'application/json');

  return new NextRequest(`http://localhost:3005${urlPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('HospitalOS & HMS Cross-Tenant Generator Suite (Phase 2b-3)', () => {
  const runSuffix = crypto.randomBytes(4).toString('hex');
  const idsB = {
    deptId: `dep_b_${runSuffix}`,
    wardId: `ward_b_${runSuffix}`,
    bedId: `bed_b_${runSuffix}`,
    staffId: `staff_b_${runSuffix}`,
    staffEmail: `dr.b.${runSuffix}@hospital-b.org`,
    patientId: `pat_b_${runSuffix}`,
    mrn: `MRN-B-${runSuffix.toUpperCase()}`,
    admissionId: `adm_b_${runSuffix}`,
    appointmentId: `apt_b_${runSuffix}`,
    labOrderId: `lab_b_${runSuffix}`,
    invoiceId: `inv_b_${runSuffix}`,
    roleId: `role_b_${runSuffix}`,
    sessionToken: '',
    sessionId: '',
  };

  const idsA = {
    deptId: `dep_a_${runSuffix}`,
    wardId: `ward_a_${runSuffix}`,
    bedId: `bed_a_${runSuffix}`,
    staffId: `staff_a_${runSuffix}`,
    patientId: `pat_a_${runSuffix}`,
    mrn: `MRN-A-${runSuffix.toUpperCase()}`,
    invoiceId: `inv_a_${runSuffix}`,
  };

  let bInitialRowCounts: Record<string, number> = {};

  async function getTenantBRowCounts(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    const tables = [
      'HmsDepartment',
      'HmsWard',
      'HmsBed',
      'HmsStaff',
      'HmsPatient',
      'HmsAdmission',
      'HmsAppointment',
      'HmsLabOrder',
      'HmsInvoice',
      'HmsPayment',
      'HmsRole',
      'HmsStaffSession',
    ];

    await withTenantTx(pool, TENANT_B, async (tx) => {
      for (const table of tables) {
        const { rows } = await tx.query(`SELECT count(*)::int c FROM "${table}"`);
        counts[table] = rows[0]?.c ?? 0;
      }
    });

    return counts;
  }

  before(async () => {
    process.env.ORBITOX_ADMIN_TOKEN = ADMIN_TOKEN;
    process.env.ORBITOX_SERVER_PEPPER = process.env.ORBITOX_SERVER_PEPPER || 'test_pepper_32_characters_minimum_len';
    process.env.ORBITOX_ENABLE_HOSPITAL_ADMIN_ENDPOINTS = 'true';

    // 1. Create a platform org & project with HMS enabled
    const crossOrg = await platformRepository.createOrganization({
      name: `Cross Tenant Org ${runSuffix}`,
      slug: `cross-org-${runSuffix}`,
      billingEmail: `cross-${runSuffix}@orbitox.io`,
    });

    const crossProjRes = await platformRepository.createProject({
      name: `Cross Tenant Project ${runSuffix}`,
      slug: `cross-proj-${runSuffix}`,
      organizationId: crossOrg.id,
      businessModel: 'B2B',
      planTier: 'enterprise',
      technicalLead: 'Cross Lead',
      contactEmail: `cross-${runSuffix}@orbitox.io`,
      enabledServices: ['hms', 'platform', 'admin', 'system'],
      apiCallQuota: 10000000,
    });

    const crossKeyRes = await platformRepository.createApiKey({
      name: `Cross Tenant Key ${runSuffix}`,
      environmentId: crossProjRes.environments[0]!.id,
      projectId: crossProjRes.project.id,
      capabilities: ['hms:read', 'hms:write', 'admin', '*'],
      tenantScope: ['*'],
      createdBy: 'test_cross_suite',
    });
    apiKeySecret = crossKeyRes.rawSecret;

    // Seed Tenant B
    await withTenantTx(pool, TENANT_B, async (tx) => {
      // Seed Dept, Ward, Bed
      await tx.query(`INSERT INTO "HmsDepartment"(id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [idsB.deptId, `ICU B ${runSuffix}`]);
      await tx.query(`INSERT INTO "HmsWard"(id, "departmentId", name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [idsB.wardId, idsB.deptId, `Ward B ${runSuffix}`]);
      await tx.query(`INSERT INTO "HmsBed"(id, "wardId", label, "dailyRateMinor") VALUES ($1, $2, $3, 250000) ON CONFLICT DO NOTHING`, [idsB.bedId, idsB.wardId, `Bed B-${runSuffix}`]);

      // Seed Staff B
      const nameSealedStaff = seal(ring, 'Dr. B Sharma', { tenantId: TENANT_B, column: 'nameSealed', rowId: idsB.staffId });
      const emailBlindB = blindIndex(ring, idsB.staffEmail, 'email', TENANT_B, 'emailBlind');
      await tx.query(
        `INSERT INTO "HmsStaff"(id, "nameSealed", "emailBlind", role) VALUES ($1, $2, $3, 'DOCTOR')`,
        [idsB.staffId, nameSealedStaff, emailBlindB]
      );

      // Seed Staff B Credential & Session
      const saltB = generateSalt();
      const pwHashB = await hashPassword('PasswordB!2026', saltB);
      await tx.query(
        `INSERT INTO "HmsStaffCredential"("staffId", "passwordHash", "salt") VALUES ($1, $2, $3)`,
        [idsB.staffId, pwHashB, saltB]
      );

      idsB.sessionId = `sess_cross_b_${runSuffix}`;
      idsB.sessionToken = crypto.randomBytes(32).toString('hex');
      const tokenHashB = crypto.createHash('sha256').update(idsB.sessionToken).digest('hex');
      await tx.query(
        `INSERT INTO "HmsRole"(id, name, "isSystem") VALUES ('role_doctor', 'DOCTOR', true) ON CONFLICT DO NOTHING`
      );
      await tx.query(
        `INSERT INTO "HmsRole"(id, name, "isSystem") VALUES ($1, 'SPECIALIST_B', false) ON CONFLICT DO NOTHING`,
        [idsB.roleId]
      );
      await tx.query(
        `INSERT INTO "HmsStaffSession"(id, "staffId", "roleId", "tokenHash", "expiresAt", "absoluteExpiresAt")
         VALUES ($1, $2, 'role_doctor', $3, now() + interval '30 minutes', now() + interval '12 hours')`,
        [idsB.sessionId, idsB.staffId, tokenHashB]
      );

      // Seed Patient B
      const nameSealedPatB = seal(ring, 'Patient B Verma', { tenantId: TENANT_B, column: 'nameSealed', rowId: idsB.patientId });
      const nameBlindPatB = blindIndex(ring, 'Patient B Verma', 'name', TENANT_B, 'nameBlind');
      await tx.query(
        `INSERT INTO "HmsPatient"(id, mrn, "nameSealed", "nameBlind") VALUES ($1, $2, $3, $4)`,
        [idsB.patientId, idsB.mrn, nameSealedPatB, nameBlindPatB]
      );

      // Seed Admission B
      await tx.query(
        `INSERT INTO "HmsAdmission"(id, "patientId", "bedId", "attendingStaffId") VALUES ($1, $2, $3, $4)`,
        [idsB.admissionId, idsB.patientId, idsB.bedId, idsB.staffId]
      );

      // Seed Appointment B
      await tx.query(
        `INSERT INTO "HmsAppointment"(id, "patientId", "doctorId", slot) VALUES ($1, $2, $3, '[2026-11-20 10:00+05:30,2026-11-20 10:30+05:30)')`,
        [idsB.appointmentId, idsB.patientId, idsB.staffId]
      );

      // Seed Lab Order B
      await tx.query(
        `INSERT INTO "HmsLabOrder"(id, "patientId", "orderedById", "testType") VALUES ($1, $2, $3, 'CBC')`,
        [idsB.labOrderId, idsB.patientId, idsB.staffId]
      );

      // Seed Invoice B
      await tx.query(
        `INSERT INTO "HmsInvoice"(id, "patientId", "totalMinor") VALUES ($1, $2, 50000)`,
        [idsB.invoiceId, idsB.patientId]
      );
    });

    // Seed Tenant A
    await withTenantTx(pool, TENANT_A, async (tx) => {
      await tx.query(`INSERT INTO "HmsDepartment"(id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [idsA.deptId, `General A ${runSuffix}`]);
      await tx.query(`INSERT INTO "HmsWard"(id, "departmentId", name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [idsA.wardId, idsA.deptId, `Ward A ${runSuffix}`]);
      await tx.query(`INSERT INTO "HmsBed"(id, "wardId", label, "dailyRateMinor") VALUES ($1, $2, $3, 150000) ON CONFLICT DO NOTHING`, [idsA.bedId, idsA.wardId, `Bed A-${runSuffix}`]);

      const nameSealedStaffA = seal(ring, 'Dr. A Kumar', { tenantId: TENANT_A, column: 'nameSealed', rowId: idsA.staffId });
      const emailBlindA = blindIndex(ring, 'dr.a@hospital-a.org', 'email', TENANT_A, 'emailBlind');
      await tx.query(
        `INSERT INTO "HmsStaff"(id, "nameSealed", "emailBlind", role) VALUES ($1, $2, $3, 'DOCTOR')`,
        [idsA.staffId, nameSealedStaffA, emailBlindA]
      );

      const nameSealedPatA = seal(ring, 'Patient A Singh', { tenantId: TENANT_A, column: 'nameSealed', rowId: idsA.patientId });
      const nameBlindPatA = blindIndex(ring, 'Patient A Singh', 'name', TENANT_A, 'nameBlind');
      await tx.query(
        `INSERT INTO "HmsPatient"(id, mrn, "nameSealed", "nameBlind") VALUES ($1, $2, $3, $4)`,
        [idsA.patientId, idsA.mrn, nameSealedPatA, nameBlindPatA]
      );

      await tx.query(
        `INSERT INTO "HmsInvoice"(id, "patientId", "totalMinor") VALUES ($1, $2, 60000)`,
        [idsA.invoiceId, idsA.patientId]
      );
    });

    bInitialRowCounts = await getTenantBRowCounts();
  });

  after(async () => {
    await pool.end();
  });

  function assertNoLeakedIds(bodyText: string) {
    for (const [key, val] of Object.entries(idsB)) {
      if (typeof val === 'string' && val.length > 5) {
        assert.equal(
          bodyText.includes(val),
          false,
          `Data leak violation: Tenant B ID "${val}" (${key}) leaked in response: ${bodyText}`
        );
      }
    }
  }

  // 1. Departments & Hierarchy List isolation
  it('GET /api/hospital/departments and /hierarchy: Tenant A sees 0 Tenant B IDs', async () => {
    const res1 = await getDepts(makeRequest(TENANT_A, '/api/hospital/departments'));
    const text1 = await res1.text();
    assert.equal(res1.status, 200);
    assertNoLeakedIds(text1);

    const res2 = await getHierarchy(makeRequest(TENANT_A, '/api/hospital/hierarchy'));
    const text2 = await res2.text();
    assert.equal(res2.status, 200);
    assertNoLeakedIds(text2);
  });

  // 2. Beds isolation
  it('Beds routes: Tenant A gets 404 for bed_b and list contains no bed_b', async () => {
    // List
    const listRes = await getBeds(makeRequest(TENANT_A, '/api/hospital/beds'));
    const listText = await listRes.text();
    assert.equal(listRes.status, 200);
    assertNoLeakedIds(listText);

    // Cross-tenant item action (turnover) -> 404
    const actionRes = await postBedAction(
      makeRequest(TENANT_A, `/api/hospital/beds/${idsB.bedId}?action=turnover`, 'POST'),
      { params: Promise.resolve({ id: idsB.bedId }) }
    );
    const actionText = await actionRes.text();
    assert.equal(actionRes.status, 404);
    assertNoLeakedIds(actionText);

    // Cross-tenant item update -> 404
    const patchRes = await patchBedById(
      makeRequest(TENANT_A, `/api/hospital/beds/${idsB.bedId}`, 'PATCH', { serviceState: 'MAINTENANCE' }),
      { params: Promise.resolve({ id: idsB.bedId }) }
    );
    const patchText = await patchRes.text();
    assert.equal(patchRes.status, 404);
    assertNoLeakedIds(patchText);

    // Cross-tenant create bed referencing B's ward -> 404 / error
    const createRes = await createBed(
      makeRequest(TENANT_A, '/api/hospital/beds', 'POST', {
        id: 'bed_a_cross_fail',
        wardId: idsB.wardId,
        label: 'Illegal Bed',
        dailyRateMinor: 100000,
      })
    );
    const createText = await createRes.text();
    assert.notEqual(createRes.status, 201);
    assertNoLeakedIds(createText);
  });

  // 3. Patients isolation
  it('Patients routes: Tenant A gets 404 for pat_b and list contains no pat_b', async () => {
    const listRes = await getPatients(makeRequest(TENANT_A, '/api/hospital/patients'));
    const listText = await listRes.text();
    assert.equal(listRes.status, 200);
    assertNoLeakedIds(listText);

    // Cross-tenant patient read -> 404
    const getRes = await getPatientById(
      makeRequest(TENANT_A, `/api/hospital/patients/${idsB.patientId}`),
      { params: Promise.resolve({ id: idsB.patientId }) }
    );
    const getText = await getRes.text();
    assert.equal(getRes.status, 404);
    assertNoLeakedIds(getText);

    // Cross-tenant patient update -> 404
    const patchRes = await patchPatientById(
      makeRequest(TENANT_A, `/api/hospital/patients/${idsB.patientId}`, 'PATCH', { triageLevel: 2 }),
      { params: Promise.resolve({ id: idsB.patientId }) }
    );
    const patchText = await patchRes.text();
    assert.equal(patchRes.status, 404);
    assertNoLeakedIds(patchText);
  });

  // 4. Admissions isolation
  it('Admissions routes: Tenant A cannot admit with B patient or B bed; list has 0 B admissions', async () => {
    const listRes = await getAdmissions(makeRequest(TENANT_A, '/api/hospital/admissions'));
    const listText = await listRes.text();
    assert.equal(listRes.status, 200);
    assertNoLeakedIds(listText);

    // Cross-tenant admission referencing B's patient
    const admRes1 = await createAdmission(
      makeRequest(TENANT_A, '/api/hospital/admissions', 'POST', {
        patientId: idsB.patientId,
        bedId: idsA.bedId,
        staffId: idsA.staffId,
      })
    );
    assert.notEqual(admRes1.status, 201);
    assertNoLeakedIds(await admRes1.text());

    // Cross-tenant admission referencing B's bed
    const admRes2 = await createAdmission(
      makeRequest(TENANT_A, '/api/hospital/admissions', 'POST', {
        patientId: idsA.patientId,
        bedId: idsB.bedId,
        staffId: idsA.staffId,
      })
    );
    assert.notEqual(admRes2.status, 201);
    assertNoLeakedIds(await admRes2.text());
  });

  // 5. Appointments isolation
  it('Appointments routes: Tenant A gets 404 for apt_b and cannot book B doctor or B patient', async () => {
    const listRes = await getAppointments(makeRequest(TENANT_A, '/api/hospital/appointments'));
    const listText = await listRes.text();
    assert.equal(listRes.status, 200);
    assertNoLeakedIds(listText);

    // Cancel / Delete -> 404
    const delRes = await deleteAppointmentById(
      makeRequest(TENANT_A, `/api/hospital/appointments/${idsB.appointmentId}`, 'DELETE'),
      { params: Promise.resolve({ id: idsB.appointmentId }) }
    );
    assert.equal(delRes.status, 404);
    assertNoLeakedIds(await delRes.text());

    // Cancel / Patch -> 404
    const patchRes = await patchAppointmentById(
      makeRequest(TENANT_A, `/api/hospital/appointments/${idsB.appointmentId}`, 'PATCH', { status: 'CANCELLED' }),
      { params: Promise.resolve({ id: idsB.appointmentId }) }
    );
    assert.equal(patchRes.status, 404);
    assertNoLeakedIds(await patchRes.text());

    // Create appointment with B's doctor -> 404 / error
    const createRes = await createAppointment(
      makeRequest(TENANT_A, '/api/hospital/appointments', 'POST', {
        patientId: idsA.patientId,
        doctorId: idsB.staffId,
        start: '2026-11-20T11:00:00Z',
        end: '2026-11-20T11:30:00Z',
      })
    );
    assert.notEqual(createRes.status, 201);
    assertNoLeakedIds(await createRes.text());
  });

  // 6. Labs isolation
  it('Labs routes: Tenant A gets 404 for lab_b and cannot verify B lab', async () => {
    const listRes = await getLabs(makeRequest(TENANT_A, '/api/hospital/labs'));
    const listText = await listRes.text();
    assert.equal(listRes.status, 200);
    assertNoLeakedIds(listText);

    // Order lab for B's patient -> 404 / error
    const orderRes = await createLab(
      makeRequest(TENANT_A, '/api/hospital/labs', 'POST', {
        patientId: idsB.patientId,
        orderedById: idsA.staffId,
        testType: 'Lipid Profile',
      })
    );
    assert.notEqual(orderRes.status, 201);
    assertNoLeakedIds(await orderRes.text());

    // Result lab for B's lab order -> 404
    const resultRes = await resultLab(
      makeRequest(TENANT_A, `/api/hospital/labs/${idsB.labOrderId}/results`, 'POST', {
        result: 'Normal values within range',
        resultEnteredById: idsA.staffId,
      }),
      { params: Promise.resolve({ id: idsB.labOrderId }) }
    );
    assert.equal(resultRes.status, 404);
    assertNoLeakedIds(await resultRes.text());
  });

  // 7. Billing & Payments isolation
  it('Billing routes: Tenant A cannot see B invoices or pay B invoice', async () => {
    const listRes = await getBilling(makeRequest(TENANT_A, '/api/hospital/billing'));
    const listText = await listRes.text();
    assert.equal(listRes.status, 200);
    assertNoLeakedIds(listText);

    // Attempt to pay Tenant B's invoice from Tenant A -> 404
    const payRes = await payInvoice(
      makeRequest(TENANT_A, `/api/hospital/billing/pay/${idsB.invoiceId}`, 'POST', {
        amountMinor: 10000,
        method: 'CASH',
        idempotencyKey: `idem-cross-fail-${Date.now()}`,
        receivedById: idsA.staffId,
      }),
      { params: Promise.resolve({ id: idsB.invoiceId }) }
    );
    const payText = await payRes.text();
    assert.equal(payRes.status, 404);
    assertNoLeakedIds(payText);
  });

  // 8. Staff & Security isolation
  it('Security routes: Tenant A cannot see B staff, sessions, or roles', async () => {
    // Staff list
    const staffListRes = await getStaff(makeRequest(TENANT_A, '/api/hospital/security/staff'));
    const staffText = await staffListRes.text();
    assert.equal(staffListRes.status, 200);
    assertNoLeakedIds(staffText);

    // Staff by ID -> 404
    const getStaffRes = await getStaffById(
      makeRequest(TENANT_A, `/api/hospital/security/staff/${idsB.staffId}`),
      { params: Promise.resolve({ id: idsB.staffId }) }
    );
    assert.equal(getStaffRes.status, 404);
    assertNoLeakedIds(await getStaffRes.text());

    // Toggle duty on B staff -> 404
    const toggleRes = await toggleDuty(
      makeRequest(TENANT_A, `/api/hospital/security/staff/${idsB.staffId}/toggle-duty`, 'POST'),
      { params: Promise.resolve({ id: idsB.staffId }) }
    );
    assert.equal(toggleRes.status, 404);
    assertNoLeakedIds(await toggleRes.text());

    // Break glass on B patient -> 404 / 422
    const bgRes = await breakGlass(
      makeRequest(TENANT_A, '/api/hospital/security/break-glass', 'POST', {
        staffId: idsA.staffId,
        patientId: idsB.patientId,
        reason: 'Emergency consultation cross tenant unauthorized',
      })
    );
    assert.notEqual(bgRes.status, 201);
    assertNoLeakedIds(await bgRes.text());

    // Roles list
    const rolesRes = await getRoles(makeRequest(TENANT_A, '/api/hospital/security/roles'));
    const rolesText = await rolesRes.text();
    assert.equal(rolesRes.status, 200);
    assertNoLeakedIds(rolesText);

    // Permissions catalogue
    const permsRes = await getPermissions(makeRequest(TENANT_A, '/api/hospital/security/permissions'));
    const permsText = await permsRes.text();
    assert.equal(permsRes.status, 200);
    assertNoLeakedIds(permsText);

    // Cross-tenant session inspection: Tenant A presents Tenant B's session token -> 401 / 404
    const reqSess = makeRequest(TENANT_A, '/api/hospital/security/session');
    reqSess.headers.set('x-staff-session', idsB.sessionToken);
    const sessRes = await getSession(reqSess);
    assert.notEqual(sessRes.status, 200);
    assertNoLeakedIds(await sessRes.text());

    // Cross-tenant login: Tenant A tries to authenticate with Tenant B's email -> 401
    const loginRes = await loginStaff(
      makeRequest(TENANT_A, '/api/hospital/security/login', 'POST', {
        email: idsB.staffEmail,
        password: 'PasswordB!2026',
      })
    );
    assert.equal(loginRes.status, 401);
    assertNoLeakedIds(await loginRes.text());
  });

  // 9. Stats, Telemetry, and Audit isolation
  it('Stats, Telemetry, and Audit routes return Tenant A data only', async () => {
    const statsRes = await getStats(makeRequest(TENANT_A, '/api/hospital/stats'));
    assert.equal(statsRes.status, 200);
    assertNoLeakedIds(await statsRes.text());

    const telemRes = await postTelemetry(makeRequest(TENANT_A, '/api/hospital/telemetry', 'POST', { metric: 'heartbeat', value: 1 }));
    assert.equal(telemRes.status, 200);
    assertNoLeakedIds(await telemRes.text());

    const auditRes = await getAudit(makeRequest(TENANT_A, '/api/hospital/audit'));
    assert.equal(auditRes.status, 200);
    assertNoLeakedIds(await auditRes.text());
  });

  // 10. HMS V1 routes isolation
  it('HMS V1 routes: Tenant A sees no Tenant B beds, labs, or patients; cannot advance B triage', async () => {
    const bedsRes = await getV1Beds(makeRequest(TENANT_A, '/api/v1/hms/beds'));
    assert.equal(bedsRes.status, 200);
    assertNoLeakedIds(await bedsRes.text());

    const labsRes = await getV1Labs(makeRequest(TENANT_A, '/api/v1/hms/labs'));
    assert.equal(labsRes.status, 200);
    assertNoLeakedIds(await labsRes.text());

    const patRes = await getV1Patients(makeRequest(TENANT_A, '/api/v1/hms/patients'));
    assert.equal(patRes.status, 200);
    assertNoLeakedIds(await patRes.text());

    // Advance triage on Tenant B's patient from Tenant A -> 404
    const triageRes = await advanceTriage(
      makeRequest(TENANT_A, '/api/v1/hms/triage/advance', 'POST', {
        patientId: idsB.patientId,
        newTriageLevel: 3,
      })
    );
    assert.equal(triageRes.status, 404);
    assertNoLeakedIds(await triageRes.text());
  });

  // 11. Final verification: Tenant B row counts are completely unchanged
  it('verifies Tenant B row counts remain completely identical after entire suite', async () => {
    const finalCounts = await getTenantBRowCounts();
    assert.deepEqual(
      finalCounts,
      bInitialRowCounts,
      'Tenant B state was modified during Tenant A operations!'
    );
  });
});
