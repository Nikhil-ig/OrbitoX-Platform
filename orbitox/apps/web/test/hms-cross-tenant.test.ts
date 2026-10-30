import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { Pool } from 'pg';
import { withTenantTx } from '../lib/tenant-db';
import { PhiKeyRing, seal, blindIndex } from '../lib/phi-crypto';
import { hashPassword, generateSalt } from '../lib/hms-auth';

// Hospital route handlers
import { GET as getDepts } from '../app/api/hospital/departments/route';
import { GET as getHierarchy, POST as postHierarchy } from '../app/api/hospital/hierarchy/route';
import { GET as getBeds, POST as createBed } from '../app/api/hospital/beds/route';
import { POST as postBedAction, PATCH as patchBedById } from '../app/api/hospital/beds/[id]/route';
import { GET as getPatients, POST as createPatient } from '../app/api/hospital/patients/route';
import { GET as getPatientById, POST as postPatientAction, PATCH as patchPatientById } from '../app/api/hospital/patients/[id]/route';
import { GET as getAdmissions, POST as createAdmission } from '../app/api/hospital/admissions/route';
import { GET as getAppointments, POST as createAppointment } from '../app/api/hospital/appointments/route';
import { PATCH as patchAppointmentById, DELETE as deleteAppointmentById } from '../app/api/hospital/appointments/[id]/route';
import { GET as getLabs, POST as createLab } from '../app/api/hospital/labs/route';
import { POST as resultLab } from '../app/api/hospital/labs/[id]/results/route';
import { GET as getBilling, POST as createInvoice } from '../app/api/hospital/billing/route';
import { POST as payInvoice } from '../app/api/hospital/billing/pay/[id]/route';
import { GET as getStats } from '../app/api/hospital/stats/route';
import { POST as postTelemetry } from '../app/api/hospital/telemetry/route';
import { GET as getAudit } from '../app/api/hospital/audit/route';
import { POST as breakGlass } from '../app/api/hospital/security/break-glass/route';
import { GET as getStaff, POST as createStaff } from '../app/api/hospital/security/staff/route';
import { GET as getStaffById, PATCH as patchStaffById } from '../app/api/hospital/security/staff/[id]/route';
import { POST as toggleDuty } from '../app/api/hospital/security/staff/[id]/toggle-duty/route';
import { GET as getRoles, POST as createRole } from '../app/api/hospital/security/roles/route';
import { GET as getPermissions } from '../app/api/hospital/security/permissions/route';
import { GET as getSession, DELETE as deleteSession } from '../app/api/hospital/security/session/route';
import { POST as loginStaff } from '../app/api/hospital/security/login/route';
import { GET as getTreatments, POST as createTreatment, PATCH as patchTreatment } from '../app/api/hospital/treatments/route';
import { POST as resetSeed } from '../app/api/hospital/reset-seed/route';

import { GET as getV1Beds, POST as createV1Bed } from '../app/api/v1/hms/beds/route';
import { GET as getV1Labs, POST as createV1Lab } from '../app/api/v1/hms/labs/route';
import { GET as getV1Patients, POST as createV1Patient } from '../app/api/v1/hms/patients/route';
import { POST as advanceTriage } from '../app/api/v1/hms/triage/advance/route';

process.env.APP_DATABASE_URL = process.env.APP_DATABASE_URL || 'postgresql://orbitox_runtime@127.0.0.1:5432/orbitox_phase2';
process.env.PLATFORM_AUDIT_DATABASE_URL = process.env.PLATFORM_AUDIT_DATABASE_URL || 'postgresql://orbitox_platform_admin_audit@127.0.0.1:5432/orbitox_phase2';
process.env.HMS_AUDIT_DATABASE_URL = process.env.HMS_AUDIT_DATABASE_URL || 'postgresql://hms_audit_reader:test_audit_reader_pass@127.0.0.1:5432/orbitox_phase2';
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
  headers.set('x-forwarded-for', '127.0.0.1');
  if (body) headers.set('content-type', 'application/json');

  return new NextRequest(`http://localhost:3005${urlPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function getRouteFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getRouteFiles(fullPath));
    } else if (entry.name === 'route.ts') {
      files.push(fullPath);
    }
  }
  return files;
}

interface ScenarioContext {
  idsA: any;
  idsB: any;
  TENANT_A: string;
  TENANT_B: string;
}

interface CoverageEntry {
  description: string;
  expectedStatus: number | number[];
  run: (ctx: ScenarioContext) => Promise<Response>;
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

  const COVERAGE_TABLE: Record<string, CoverageEntry> = {
    'GET app/api/hospital/admissions/route.ts': {
      description: 'List admissions: Tenant A sees 0 Tenant B admissions',
      expectedStatus: 200,
      run: () => getAdmissions(makeRequest(TENANT_A, '/api/hospital/admissions')),
    },
    'POST app/api/hospital/admissions/route.ts': {
      description: 'Create admission referencing B patient: rejected',
      expectedStatus: [404, 422],
      run: (ctx) => createAdmission(makeRequest(TENANT_A, '/api/hospital/admissions', 'POST', { patientId: ctx.idsB.patientId, bedId: ctx.idsA.bedId, staffId: ctx.idsA.staffId })),
    },
    'PATCH app/api/hospital/appointments/[id]/route.ts': {
      description: 'Patch appointment on Tenant B appointment: 404',
      expectedStatus: 404,
      run: (ctx) => patchAppointmentById(makeRequest(TENANT_A, `/api/hospital/appointments/${ctx.idsB.appointmentId}`, 'PATCH', { status: 'CANCELLED' }), { params: Promise.resolve({ id: ctx.idsB.appointmentId }) }),
    },
    'DELETE app/api/hospital/appointments/[id]/route.ts': {
      description: 'Delete appointment on Tenant B appointment: 404',
      expectedStatus: 404,
      run: (ctx) => deleteAppointmentById(makeRequest(TENANT_A, `/api/hospital/appointments/${ctx.idsB.appointmentId}`, 'DELETE'), { params: Promise.resolve({ id: ctx.idsB.appointmentId }) }),
    },
    'GET app/api/hospital/appointments/route.ts': {
      description: 'List appointments: Tenant A sees 0 Tenant B appointments',
      expectedStatus: 200,
      run: () => getAppointments(makeRequest(TENANT_A, '/api/hospital/appointments')),
    },
    'POST app/api/hospital/appointments/route.ts': {
      description: 'Create appointment referencing B doctor: rejected',
      expectedStatus: [404, 422],
      run: (ctx) => createAppointment(makeRequest(TENANT_A, '/api/hospital/appointments', 'POST', { patientId: ctx.idsA.patientId, doctorId: ctx.idsB.staffId, start: '2026-11-20T11:00:00Z', end: '2026-11-20T11:30:00Z' })),
    },
    'GET app/api/hospital/audit/route.ts': {
      description: 'List audit PHI access logs: Tenant A sees 0 Tenant B logs',
      expectedStatus: 200,
      run: () => getAudit(makeRequest(TENANT_A, '/api/hospital/audit')),
    },
    'POST app/api/hospital/beds/[id]/route.ts': {
      description: 'Bed action on Tenant B bed: 404',
      expectedStatus: 404,
      run: (ctx) => postBedAction(makeRequest(TENANT_A, `/api/hospital/beds/${ctx.idsB.bedId}?action=turnover`, 'POST'), { params: Promise.resolve({ id: ctx.idsB.bedId }) }),
    },
    'PATCH app/api/hospital/beds/[id]/route.ts': {
      description: 'Patch bed on Tenant B bed: 404',
      expectedStatus: 404,
      run: (ctx) => patchBedById(makeRequest(TENANT_A, `/api/hospital/beds/${ctx.idsB.bedId}`, 'PATCH', { serviceState: 'MAINTENANCE' }), { params: Promise.resolve({ id: ctx.idsB.bedId }) }),
    },
    'GET app/api/hospital/beds/route.ts': {
      description: 'List beds: Tenant A sees 0 Tenant B beds',
      expectedStatus: 200,
      run: () => getBeds(makeRequest(TENANT_A, '/api/hospital/beds')),
    },
    'POST app/api/hospital/beds/route.ts': {
      description: 'Create bed referencing Tenant B ward: rejected',
      expectedStatus: [404, 422],
      run: (ctx) => createBed(makeRequest(TENANT_A, '/api/hospital/beds', 'POST', { id: `bed_a_cross_fail_${Date.now()}`, wardId: ctx.idsB.wardId, label: 'Illegal Bed', dailyRateMinor: 100000 })),
    },
    'POST app/api/hospital/billing/pay/[id]/route.ts': {
      description: 'Pay invoice on Tenant B invoice: 404',
      expectedStatus: 404,
      run: (ctx) => payInvoice(makeRequest(TENANT_A, `/api/hospital/billing/pay/${ctx.idsB.invoiceId}`, 'POST', { amountMinor: 10000, method: 'CASH', idempotencyKey: `idem-cross-fail-${Date.now()}`, receivedById: ctx.idsA.staffId }), { params: Promise.resolve({ id: ctx.idsB.invoiceId }) }),
    },
    'GET app/api/hospital/billing/route.ts': {
      description: 'List billing invoices: Tenant A sees 0 Tenant B invoices',
      expectedStatus: 200,
      run: () => getBilling(makeRequest(TENANT_A, '/api/hospital/billing')),
    },
    'POST app/api/hospital/billing/route.ts': {
      description: 'Create invoice referencing Tenant B patient: rejected',
      expectedStatus: [404, 422],
      run: (ctx) => createInvoice(makeRequest(TENANT_A, '/api/hospital/billing', 'POST', { patientId: ctx.idsB.patientId, totalMinor: 50000 })),
    },
    'GET app/api/hospital/departments/route.ts': {
      description: 'List departments: Tenant A sees 0 Tenant B departments',
      expectedStatus: 200,
      run: () => getDepts(makeRequest(TENANT_A, '/api/hospital/departments')),
    },
    'GET app/api/hospital/hierarchy/route.ts': {
      description: 'Get hierarchy: Tenant A sees 0 Tenant B hierarchy nodes',
      expectedStatus: 200,
      run: () => getHierarchy(makeRequest(TENANT_A, '/api/hospital/hierarchy')),
    },
    'POST app/api/hospital/hierarchy/route.ts': {
      description: 'Create ward referencing Tenant B department: rejected',
      expectedStatus: [404, 422],
      run: (ctx) => postHierarchy(makeRequest(TENANT_A, '/api/hospital/hierarchy', 'POST', { type: 'ward', departmentId: ctx.idsB.deptId, name: 'Cross Ward' })),
    },
    'POST app/api/hospital/labs/[id]/results/route.ts': {
      description: 'Result lab on Tenant B lab order: 404',
      expectedStatus: 404,
      run: (ctx) => resultLab(makeRequest(TENANT_A, `/api/hospital/labs/${ctx.idsB.labOrderId}/results`, 'POST', { result: 'Normal', resultEnteredById: ctx.idsA.staffId }), { params: Promise.resolve({ id: ctx.idsB.labOrderId }) }),
    },
    'GET app/api/hospital/labs/route.ts': {
      description: 'List labs: Tenant A sees 0 Tenant B lab orders',
      expectedStatus: 200,
      run: () => getLabs(makeRequest(TENANT_A, '/api/hospital/labs')),
    },
    'POST app/api/hospital/labs/route.ts': {
      description: 'Create lab order referencing Tenant B patient: rejected',
      expectedStatus: [404, 422],
      run: (ctx) => createLab(makeRequest(TENANT_A, '/api/hospital/labs', 'POST', { patientId: ctx.idsB.patientId, orderedById: ctx.idsA.staffId, testType: 'Lipid Profile' })),
    },
    'GET app/api/hospital/patients/[id]/route.ts': {
      description: 'Get patient on Tenant B patient: 404',
      expectedStatus: 404,
      run: (ctx) => getPatientById(makeRequest(TENANT_A, `/api/hospital/patients/${ctx.idsB.patientId}`), { params: Promise.resolve({ id: ctx.idsB.patientId }) }),
    },
    'POST app/api/hospital/patients/[id]/route.ts': {
      description: 'Patient action on Tenant B patient: 404',
      expectedStatus: 404,
      run: (ctx) => postPatientAction(makeRequest(TENANT_A, `/api/hospital/patients/${ctx.idsB.patientId}?action=discharge`, 'POST', {}), { params: Promise.resolve({ id: ctx.idsB.patientId }) }),
    },
    'PATCH app/api/hospital/patients/[id]/route.ts': {
      description: 'Patch patient on Tenant B patient: 404',
      expectedStatus: 404,
      run: (ctx) => patchPatientById(makeRequest(TENANT_A, `/api/hospital/patients/${ctx.idsB.patientId}`, 'PATCH', { triageLevel: 2 }), { params: Promise.resolve({ id: ctx.idsB.patientId }) }),
    },
    'GET app/api/hospital/patients/route.ts': {
      description: 'List patients: Tenant A sees 0 Tenant B patients',
      expectedStatus: 200,
      run: () => getPatients(makeRequest(TENANT_A, '/api/hospital/patients')),
    },
    'POST app/api/hospital/patients/route.ts': {
      description: 'Create patient in Tenant A: 201 (scoped to Tenant A)',
      expectedStatus: 201,
      run: (ctx) => createPatient(makeRequest(TENANT_A, '/api/hospital/patients', 'POST', { name: 'A Cross Pat', mrn: `${ctx.idsA.mrn}-GEN` })),
    },
    'POST app/api/hospital/reset-seed/route.ts': {
      description: 'Reset seed: scoped to Tenant A only: 200 or 403',
      expectedStatus: [200, 403],
      run: async () => {
        const prev = process.env.ORBITOX_ENABLE_DEMO_SEED;
        const prevEnv = process.env.NODE_ENV;
        try {
          Reflect.set(process.env, 'NODE_ENV', 'development');
          process.env.ORBITOX_ENABLE_DEMO_SEED = 'true';
          return await resetSeed(makeRequest(TENANT_A, '/api/hospital/reset-seed', 'POST', {}));
        } finally {
          if (prev === undefined) delete process.env.ORBITOX_ENABLE_DEMO_SEED;
          else process.env.ORBITOX_ENABLE_DEMO_SEED = prev;
          if (prevEnv === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV');
          else Reflect.set(process.env, 'NODE_ENV', prevEnv);
        }
      },
    },
    'POST app/api/hospital/security/break-glass/route.ts': {
      description: 'Break glass on Tenant B patient: rejected',
      expectedStatus: [404, 422],
      run: (ctx) => breakGlass(makeRequest(TENANT_A, '/api/hospital/security/break-glass', 'POST', { staffId: ctx.idsA.staffId, patientId: ctx.idsB.patientId, reason: 'unauthorized cross access' })),
    },
    'POST app/api/hospital/security/login/route.ts': {
      description: 'Login with Tenant B credentials on Tenant A: 401',
      expectedStatus: 401,
      run: (ctx) => loginStaff(makeRequest(TENANT_A, '/api/hospital/security/login', 'POST', { email: ctx.idsB.staffEmail, password: 'PasswordB!2026' })),
    },
    'GET app/api/hospital/security/permissions/route.ts': {
      description: 'List permissions catalogue: 200',
      expectedStatus: 200,
      run: () => getPermissions(makeRequest(TENANT_A, '/api/hospital/security/permissions')),
    },
    'GET app/api/hospital/security/roles/route.ts': {
      description: 'List roles: Tenant A sees 0 Tenant B custom roles',
      expectedStatus: 200,
      run: () => getRoles(makeRequest(TENANT_A, '/api/hospital/security/roles')),
    },
    'POST app/api/hospital/security/roles/route.ts': {
      description: 'Create role in Tenant A: 201 (scoped to Tenant A)',
      expectedStatus: [200, 201],
      run: () => createRole(makeRequest(TENANT_A, '/api/hospital/security/roles', 'POST', { name: `SURGEON_A_${Date.now()}`, description: 'Surgeon', permissions: ['patients:read'] })),
    },
    'GET app/api/hospital/security/session/route.ts': {
      description: 'Inspect session presenting Tenant B session token: 401',
      expectedStatus: 401,
      run: (ctx) => {
        const req = makeRequest(TENANT_A, '/api/hospital/security/session');
        req.headers.set('x-staff-session', ctx.idsB.sessionToken);
        return getSession(req);
      },
    },
    'DELETE app/api/hospital/security/session/route.ts': {
      description: 'Revoke session for Tenant B session ID from Tenant A: 200 (does not affect Tenant B)',
      expectedStatus: 200,
      run: (ctx) => deleteSession(makeRequest(TENANT_A, '/api/hospital/security/session', 'DELETE', { sessionId: ctx.idsB.sessionId })),
    },
    'GET app/api/hospital/security/staff/[id]/route.ts': {
      description: 'Get staff by ID on Tenant B staff: 404',
      expectedStatus: 404,
      run: (ctx) => getStaffById(makeRequest(TENANT_A, `/api/hospital/security/staff/${ctx.idsB.staffId}`), { params: Promise.resolve({ id: ctx.idsB.staffId }) }),
    },
    'PATCH app/api/hospital/security/staff/[id]/route.ts': {
      description: 'Patch staff by ID on Tenant B staff: 404',
      expectedStatus: 404,
      run: (ctx) => patchStaffById(makeRequest(TENANT_A, `/api/hospital/security/staff/${ctx.idsB.staffId}`, 'PATCH', { status: 'SUSPENDED' }), { params: Promise.resolve({ id: ctx.idsB.staffId }) }),
    },
    'POST app/api/hospital/security/staff/[id]/toggle-duty/route.ts': {
      description: 'Toggle duty on Tenant B staff: 404',
      expectedStatus: 404,
      run: (ctx) => toggleDuty(makeRequest(TENANT_A, `/api/hospital/security/staff/${ctx.idsB.staffId}/toggle-duty`, 'POST'), { params: Promise.resolve({ id: ctx.idsB.staffId }) }),
    },
    'GET app/api/hospital/security/staff/route.ts': {
      description: 'List staff: Tenant A sees 0 Tenant B staff members',
      expectedStatus: 200,
      run: () => getStaff(makeRequest(TENANT_A, '/api/hospital/security/staff')),
    },
    'POST app/api/hospital/security/staff/route.ts': {
      description: 'Create staff referencing Tenant B department: rejected',
      expectedStatus: [404, 422],
      run: (ctx) => createStaff(makeRequest(TENANT_A, '/api/hospital/security/staff', 'POST', { name: 'Dr. Cross Illegal', email: `cross.${Date.now()}@a.org`, role: 'DOCTOR', departmentId: ctx.idsB.deptId })),
    },
    'GET app/api/hospital/stats/route.ts': {
      description: 'Get stats: Tenant A sees only Tenant A statistics',
      expectedStatus: 200,
      run: () => getStats(makeRequest(TENANT_A, '/api/hospital/stats')),
    },
    'POST app/api/hospital/telemetry/route.ts': {
      description: 'Post telemetry: scoped to Tenant A: 200',
      expectedStatus: 200,
      run: () => postTelemetry(makeRequest(TENANT_A, '/api/hospital/telemetry', 'POST', { metric: 'heartbeat', value: 1 })),
    },
    'GET app/api/hospital/treatments/route.ts': {
      description: 'List treatments: Tenant A sees 0 Tenant B treatments',
      expectedStatus: 200,
      run: () => getTreatments(makeRequest(TENANT_A, '/api/hospital/treatments')),
    },
    'POST app/api/hospital/treatments/route.ts': {
      description: 'Create treatment referencing Tenant B patient: rejected',
      expectedStatus: [404, 422],
      run: (ctx) => createTreatment(makeRequest(TENANT_A, '/api/hospital/treatments', 'POST', { patientId: ctx.idsB.patientId, code: 'CROSS_TRT' })),
    },
    'PATCH app/api/hospital/treatments/route.ts': {
      description: 'Patch treatment on non-owned treatment: 404',
      expectedStatus: 404,
      run: () => patchTreatment(makeRequest(TENANT_A, '/api/hospital/treatments', 'PATCH', { treatmentId: 'trt_cross_nonexistent_or_b', action: 'complete' })),
    },
    'GET app/api/v1/hms/beds/route.ts': {
      description: 'V1 List beds: Tenant A sees 0 Tenant B beds',
      expectedStatus: 200,
      run: () => getV1Beds(makeRequest(TENANT_A, '/api/v1/hms/beds')),
    },
    'POST app/api/v1/hms/beds/route.ts': {
      description: 'V1 Bed allocation referencing Tenant B bed: 404',
      expectedStatus: 404,
      run: (ctx) => createV1Bed(makeRequest(TENANT_A, '/api/v1/hms/beds', 'POST', { bedId: ctx.idsB.bedId, patientId: ctx.idsA.patientId })),
    },
    'GET app/api/v1/hms/labs/route.ts': {
      description: 'V1 List labs: Tenant A sees 0 Tenant B labs',
      expectedStatus: 200,
      run: () => getV1Labs(makeRequest(TENANT_A, '/api/v1/hms/labs')),
    },
    'POST app/api/v1/hms/labs/route.ts': {
      description: 'V1 Create lab referencing Tenant B patient: rejected',
      expectedStatus: [404, 422],
      run: (ctx) => createV1Lab(makeRequest(TENANT_A, '/api/v1/hms/labs', 'POST', { patientId: ctx.idsB.patientId, testType: 'CBC' })),
    },
    'GET app/api/v1/hms/patients/route.ts': {
      description: 'V1 List patients: Tenant A sees 0 Tenant B patients',
      expectedStatus: 200,
      run: () => getV1Patients(makeRequest(TENANT_A, '/api/v1/hms/patients')),
    },
    'POST app/api/v1/hms/patients/route.ts': {
      description: 'V1 Create patient in Tenant A: 201 (scoped to Tenant A)',
      expectedStatus: 201,
      run: (ctx) => createV1Patient(makeRequest(TENANT_A, '/api/v1/hms/patients', 'POST', { name: 'V1 Pat A', mrn: `${ctx.idsA.mrn}-V1` })),
    },
    'POST app/api/v1/hms/triage/advance/route.ts': {
      description: 'V1 Advance triage on Tenant B patient: 404',
      expectedStatus: 404,
      run: (ctx) => advanceTriage(makeRequest(TENANT_A, '/api/v1/hms/triage/advance', 'POST', { patientId: ctx.idsB.patientId, newTriageLevel: 3 })),
    },
  };

  before(async () => {
    process.env.ORBITOX_ADMIN_TOKEN = ADMIN_TOKEN;
    process.env.ORBITOX_SERVER_PEPPER = process.env.ORBITOX_SERVER_PEPPER || 'test_pepper_32_characters_minimum_len';
    process.env.ORBITOX_ENABLE_HOSPITAL_ADMIN_ENDPOINTS = 'true';
    process.env.TRUST_PROXY = 'true';

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

      await tx.query(
        `INSERT INTO "HmsRole"(id, name, "isSystem") VALUES ('role_doctor', 'DOCTOR', true) ON CONFLICT DO NOTHING`
      );

      idsB.sessionId = `sess_cross_b_${runSuffix}`;
      idsB.sessionToken = crypto.randomBytes(32).toString('hex');
      const tokenHashB = crypto.createHash('sha256').update(idsB.sessionToken).digest('hex');
      await tx.query(
        `INSERT INTO "HmsStaffSession"("id", "staffId", "roleId", "tokenHash", "expiresAt", "absoluteExpiresAt")
         VALUES ($1, $2, 'role_doctor', $3, now() + interval '30 minutes', now() + interval '12 hours')`,
        [idsB.sessionId, idsB.staffId, tokenHashB]
      );

      // Seed Patient B
      const nameSealedPatB = seal(ring, 'Patient B Patel', { tenantId: TENANT_B, column: 'nameSealed', rowId: idsB.patientId });
      const nameBlindPatB = blindIndex(ring, 'Patient B Patel', 'name', TENANT_B, 'nameBlind');
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

  // 1. Generator Enumeration and Coverage Gate
  it('reads all route files dynamically and fails if any route+method has no entry in the coverage table', async () => {
    const hospitalDir = path.resolve(__dirname, '../app/api/hospital');
    const v1HmsDir = path.resolve(__dirname, '../app/api/v1/hms');
    const allFiles = [...getRouteFiles(hospitalDir), ...getRouteFiles(v1HmsDir)].sort();

    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    const discovered: string[] = [];

    for (const f of allFiles) {
      const rel = path.relative(path.resolve(__dirname, '..'), f).replace(/\\/g, '/');
      const mod = await import(f);
      const target = (mod as any).default && (mod as any).default.GET ? (mod as any).default : mod;
      for (const m of methods) {
        if (typeof target[m] === 'function' || typeof (mod as any)[m] === 'function') {
          discovered.push(`${m} ${rel}`);
        }
      }
    }

    assert.equal(discovered.length, 50, 'Discovered route+methods must be exactly 50 across the 30 route files');

    for (const item of discovered) {
      assert.ok(
        COVERAGE_TABLE[item],
        `Dynamic route enumeration failure: missing coverage table entry for route+method [${item}]`
      );
    }

    const coveredCount = Object.keys(COVERAGE_TABLE).length;
    console.log(`Cross-tenant generator coverage: ${coveredCount} of ${discovered.length} route+methods covered`);
  });

  // 2. Comprehensive Generator Execution Across All 50 Route+Methods
  it('executes cross-tenant scenarios for all 50 route+methods, verifying 404/403/expected isolation and zero data leakage', async () => {
    let executedCount = 0;
    for (const [key, entry] of Object.entries(COVERAGE_TABLE)) {
      const res = await entry.run({ idsA, idsB, TENANT_A, TENANT_B });
      const allowed = Array.isArray(entry.expectedStatus) ? entry.expectedStatus : [entry.expectedStatus];
      if (!allowed.includes(res.status)) {
        const text = await res.text();
        assert.fail(`Route+method [${key}] expected status ${allowed.join('|')}, got ${res.status}: ${text}`);
      }
      const text = await res.text();
      assertNoLeakedIds(text);
      executedCount++;
    }
    console.log(`Successfully verified isolation across all ${executedCount} route+methods`);
  });

  // 3. Final verification: Tenant B row counts are completely unchanged
  it('verifies Tenant B row counts remain completely identical after entire suite', async () => {
    const finalCounts = await getTenantBRowCounts();
    assert.deepEqual(
      finalCounts,
      bInitialRowCounts,
      'Tenant B state was modified during Tenant A operations!'
    );
  });
});
