import 'server-only';
import crypto from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type {
  DataRightsContext,
  ErasureMode,
  PluginDataRightsAdapter,
  PrincipalCorrectionPatch,
  PrincipalCorrectionSummary,
  PrincipalErasureSummary,
  PrincipalExportSummary,
  PrincipalRef,
  TenantErasureSummary,
  TenantExportTableChunk,
} from '@orbitox-io/plugin-engine';
import { PLUGIN_DATA_CONTRACT_VERSION } from '@orbitox-io/plugin-engine';
import { HttpError } from '@/server/db/db-errors';
import { blindIndex, getPhiKeyRing, open, PhiKeyRing, seal } from '@/server/hospital/phi-crypto';
import { withTenantTx, type TenantTx } from '@/server/db/tenant-db';

const SEALED_VALUE_RE =
  /^v1\.[A-Za-z0-9_-]{1,32}\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]+$/;

function tryOpenSealed(
  ring: PhiKeyRing,
  value: string | null | undefined,
  ref: { tenantId: string; column: string; rowId: string },
  fallbackColumns: string[] = [],
): string | null {
  if (value == null) return null;
  if (!SEALED_VALUE_RE.test(value)) return value;
  const cols = [ref.column, ...fallbackColumns];
  let lastErr: unknown;
  for (const col of cols) {
    try {
      return open(ring, value, { tenantId: ref.tenantId, column: col, rowId: ref.rowId });
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

function normalizeRequestId(context: DataRightsContext, suffix: string): string {
  return context.requestId?.trim() || `dsr_${suffix}_${crypto.randomUUID()}`;
}

export interface HospitalOsAdapterOptions {
  runtimePrisma: PrismaClient;
  maintenancePrisma?: PrismaClient;
  phiKeyRing?: PhiKeyRing;
  recordAuditEvent?: (event: {
    action: string;
    entityType: string;
    entityId: string;
    tenantId: string;
    actorId: string;
    actorEmail?: string | null;
    reason: string;
    metadata: Record<string, unknown>;
  }) => Promise<string | undefined>;
}

const HMS_TENANT_DELETE_ORDER = [
  'HmsBreakGlassGrant',
  'HmsStaffSession',
  'HmsStaffCredential',
  'HmsRolePermission',
  'HmsRole',
  'HmsPayment',
  'HmsInvoice',
  'HmsLabOrder',
  'HmsAppointment',
  'HmsAdmission',
  'HmsPhiAccessLog',
  'HmsPatient',
  'HmsStaff',
  'HmsBed',
  'HmsWard',
  'HmsDepartment',
  'TenantIdempotencyKey',
  'TenantOutbox',
] as const;

export class HospitalOsDataRightsAdapter implements PluginDataRightsAdapter {
  readonly contractVersion = PLUGIN_DATA_CONTRACT_VERSION;
  readonly pluginId = '@orbitox/hms';

  private readonly runtimePrisma: PrismaClient;
  private readonly maintenancePrisma?: PrismaClient;
  private readonly ringOverride?: PhiKeyRing;
  private readonly recordAuditEvent?: HospitalOsAdapterOptions['recordAuditEvent'];

  constructor(options: HospitalOsAdapterOptions) {
    this.runtimePrisma = options.runtimePrisma;
    this.maintenancePrisma = options.maintenancePrisma;
    this.ringOverride = options.phiKeyRing;
    this.recordAuditEvent = options.recordAuditEvent;
  }

  private getRing(): PhiKeyRing {
    return this.ringOverride ?? getPhiKeyRing();
  }

  private async resolvePatientInTx(
    tx: TenantTx,
    ring: PhiKeyRing,
    principal: PrincipalRef,
  ): Promise<{ id: string; mrn: string; processingStatus: string }> {
    if (principal.kind && principal.kind !== 'patient') {
      throw new HttpError(422, 'UNSUPPORTED_PRINCIPAL_KIND', `Unsupported HospitalOS principal kind "${principal.kind}"`);
    }

    if (principal.id) {
      const { rows } = await tx.query<{ id: string; mrn: string; processingStatus: string }>(
        `SELECT "id", "mrn", "processingStatus" FROM "HmsPatient" WHERE "id" = $1`,
        [principal.id],
      );
      if (!rows[0]) throw new HttpError(404, 'PATIENT_NOT_FOUND');
      return rows[0];
    }

    if (principal.mrn) {
      const { rows } = await tx.query<{ id: string; mrn: string; processingStatus: string }>(
        `SELECT "id", "mrn", "processingStatus" FROM "HmsPatient" WHERE "mrn" = $1`,
        [principal.mrn],
      );
      if (!rows[0]) throw new HttpError(404, 'PATIENT_NOT_FOUND');
      return rows[0];
    }

    if (principal.phone) {
      const blind = blindIndex(ring, principal.phone, 'phone', tx.tenantId, 'phone');
      const { rows } = await tx.query<{ id: string; mrn: string; processingStatus: string }>(
        `SELECT "id", "mrn", "processingStatus" FROM "HmsPatient" WHERE "phoneBlind" = $1 ORDER BY "createdAt" ASC LIMIT 2`,
        [blind],
      );
      if (rows.length === 0) throw new HttpError(404, 'PATIENT_NOT_FOUND');
      if (rows.length > 1) {
        throw new HttpError(409, 'AMBIGUOUS_PRINCIPAL_REFERENCE', 'Multiple patients match phone; pass patient id or MRN.');
      }
      return rows[0]!;
    }

    throw new HttpError(422, 'INVALID_PRINCIPAL_REF', 'Patient reference requires id, mrn, or phone.');
  }

  async *exportTenant(
    tenantId: string,
    context: DataRightsContext,
  ): AsyncIterable<TenantExportTableChunk> {
    const ring = this.getRing();
    const requestId = normalizeRequestId(context, 'export');

    const chunks = await withTenantTx(this.runtimePrisma, tenantId, async (tx) => {
      const out: TenantExportTableChunk[] = [];

      const { rows: departments } = await tx.query(
        `SELECT "id", "name", "createdAt" FROM "HmsDepartment" ORDER BY "id" ASC`,
      );
      out.push({ table: 'HmsDepartment', columns: ['id', 'name', 'createdAt'], rows: departments });

      const { rows: wards } = await tx.query(
        `SELECT "id", "departmentId", "name" FROM "HmsWard" ORDER BY "id" ASC`,
      );
      out.push({ table: 'HmsWard', columns: ['id', 'departmentId', 'name'], rows: wards });

      const { rows: beds } = await tx.query(
        `SELECT "id", "wardId", "label", "serviceState", "dailyRateMinor"::text AS "dailyRateMinor" FROM "HmsBed" ORDER BY "id" ASC`,
      );
      out.push({
        table: 'HmsBed',
        columns: ['id', 'wardId', 'label', 'serviceState', 'dailyRateMinor'],
        rows: beds,
      });

      const { rows: staffRows } = await tx.query<{
        id: string;
        nameSealed: string;
        role: string;
        departmentId: string | null;
        status: string;
        onDuty: boolean;
      }>(
        `SELECT "id", "nameSealed", "role", "departmentId", "status", "onDuty" FROM "HmsStaff" ORDER BY "id" ASC`,
      );
      out.push({
        table: 'HmsStaff',
        columns: ['id', 'name', 'role', 'departmentId', 'status', 'onDuty'],
        rows: staffRows.map((s) => ({
          id: s.id,
          name: tryOpenSealed(ring, s.nameSealed, { tenantId, column: 'name', rowId: s.id }, ['nameSealed']),
          role: s.role,
          departmentId: s.departmentId,
          status: s.status,
          onDuty: s.onDuty,
        })),
      });

      const { rows: patientRows } = await tx.query<{
        id: string;
        mrn: string;
        nameSealed: string;
        phoneSealed: string | null;
        dateOfBirthSealed: string | null;
        ageBand: string | null;
        gender: string | null;
        bloodGroup: string | null;
        allergiesSealed: string | null;
        emergencyContactSealed: string | null;
        triageLevel: number | null;
        processingStatus: string;
        restrictedAt: string | null;
        restrictedReason: string | null;
        createdAt: string;
        updatedAt: string;
      }>(
        `SELECT "id", "mrn", "nameSealed", "phoneSealed", "dateOfBirthSealed", "ageBand", "gender",
                "bloodGroup", "allergiesSealed", "emergencyContactSealed", "triageLevel",
                "processingStatus", "restrictedAt", "restrictedReason", "createdAt", "updatedAt"
         FROM "HmsPatient"
         ORDER BY "createdAt" ASC, "id" ASC`,
      );

      const decryptedPatients: Array<Record<string, unknown>> = [];
      for (const p of patientRows) {
        // Every PHI read must record an HmsPhiAccessLog row with purpose='DSR_EXPORT'.
        await tx.query(
          `INSERT INTO "HmsPhiAccessLog" ("actorId", "patientId", "columns", "purpose", "requestId")
           VALUES ($1, $2, $3, 'DSR_EXPORT', $4)`,
          [
            context.actorId,
            p.id,
            ['nameSealed', 'phoneSealed', 'dateOfBirthSealed', 'allergiesSealed', 'emergencyContactSealed'],
            requestId,
          ],
        );

        decryptedPatients.push({
          id: p.id,
          mrn: p.mrn,
          name: tryOpenSealed(ring, p.nameSealed, { tenantId, column: 'name', rowId: p.id }),
          phone: tryOpenSealed(ring, p.phoneSealed, { tenantId, column: 'phone', rowId: p.id }),
          dateOfBirth: tryOpenSealed(ring, p.dateOfBirthSealed, {
            tenantId,
            column: 'dateOfBirth',
            rowId: p.id,
          }),
          ageBand: p.ageBand,
          gender: p.gender,
          bloodGroup: p.bloodGroup,
          allergies: tryOpenSealed(ring, p.allergiesSealed, {
            tenantId,
            column: 'allergies',
            rowId: p.id,
          }),
          emergencyContact: tryOpenSealed(ring, p.emergencyContactSealed, {
            tenantId,
            column: 'emergencyContact',
            rowId: p.id,
          }),
          triageLevel: p.triageLevel,
          processingStatus: p.processingStatus,
          restrictedAt: p.restrictedAt,
          restrictedReason: p.restrictedReason,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        });
      }
      out.push({
        table: 'HmsPatient',
        columns: [
          'id',
          'mrn',
          'name',
          'phone',
          'dateOfBirth',
          'ageBand',
          'gender',
          'bloodGroup',
          'allergies',
          'emergencyContact',
          'triageLevel',
          'processingStatus',
          'restrictedAt',
          'restrictedReason',
          'createdAt',
          'updatedAt',
        ],
        rows: decryptedPatients,
      });

      const { rows: admissions } = await tx.query<{
        id: string;
        patientId: string;
        bedId: string;
        attendingStaffId: string;
        admittedAt: string;
        dischargedAt: string | null;
        notesSealed: string | null;
      }>(
        `SELECT "id", "patientId", "bedId", "attendingStaffId", "admittedAt", "dischargedAt", "notesSealed"
         FROM "HmsAdmission" ORDER BY "admittedAt" ASC, "id" ASC`,
      );
      const decryptedAdmissions: Array<Record<string, unknown>> = [];
      for (const adm of admissions) {
        if (adm.notesSealed) {
          await tx.query(
            `INSERT INTO "HmsPhiAccessLog" ("actorId", "patientId", "columns", "purpose", "requestId")
             VALUES ($1, $2, $3, 'DSR_EXPORT', $4)`,
            [context.actorId, adm.patientId, ['admissionNotes'], requestId],
          );
        }
        decryptedAdmissions.push({
          id: adm.id,
          patientId: adm.patientId,
          bedId: adm.bedId,
          attendingStaffId: adm.attendingStaffId,
          admittedAt: adm.admittedAt,
          dischargedAt: adm.dischargedAt,
          notes: tryOpenSealed(ring, adm.notesSealed, {
            tenantId,
            column: 'admissionNotes',
            rowId: adm.id,
          }),
        });
      }
      out.push({
        table: 'HmsAdmission',
        columns: ['id', 'patientId', 'bedId', 'attendingStaffId', 'admittedAt', 'dischargedAt', 'notes'],
        rows: decryptedAdmissions,
      });

      const { rows: appointments } = await tx.query<{
        id: string;
        patientId: string;
        doctorId: string;
        startAt: string;
        endAt: string;
        status: string;
        reasonSealed: string | null;
      }>(
        `SELECT "id", "patientId", "doctorId", lower("slot") AS "startAt", upper("slot") AS "endAt",
                "status", "reasonSealed"
         FROM "HmsAppointment" ORDER BY lower("slot") ASC, "id" ASC`,
      );
      out.push({
        table: 'HmsAppointment',
        columns: ['id', 'patientId', 'doctorId', 'startAt', 'endAt', 'status', 'reason'],
        rows: appointments.map((apt) => ({
          id: apt.id,
          patientId: apt.patientId,
          doctorId: apt.doctorId,
          startAt: apt.startAt,
          endAt: apt.endAt,
          status: apt.status,
          reason: tryOpenSealed(ring, apt.reasonSealed, { tenantId, column: 'reason', rowId: apt.id }, [
            'reasonSealed',
          ]),
        })),
      });

      const { rows: labOrders } = await tx.query<{
        id: string;
        patientId: string;
        orderedById: string;
        testType: string;
        status: string;
        resultSealed: string | null;
        resultedById: string | null;
        verifiedById: string | null;
        verifiedAt: string | null;
        updatedAt: string;
      }>(
        `SELECT "id", "patientId", "orderedById", "testType", "status", "resultSealed",
                "resultedById", "verifiedById", "verifiedAt", "updatedAt"
         FROM "HmsLabOrder" ORDER BY "updatedAt" ASC, "id" ASC`,
      );
      const decryptedLabs: Array<Record<string, unknown>> = [];
      for (const lab of labOrders) {
        if (lab.resultSealed) {
          await tx.query(
            `INSERT INTO "HmsPhiAccessLog" ("actorId", "patientId", "columns", "purpose", "requestId")
             VALUES ($1, $2, $3, 'DSR_EXPORT', $4)`,
            [context.actorId, lab.patientId, ['resultSealed'], requestId],
          );
        }
        decryptedLabs.push({
          id: lab.id,
          patientId: lab.patientId,
          orderedById: lab.orderedById,
          testType: lab.testType,
          status: lab.status,
          result: tryOpenSealed(ring, lab.resultSealed, { tenantId, column: 'result', rowId: lab.id }, [
            'resultSealed',
          ]),
          resultedById: lab.resultedById,
          verifiedById: lab.verifiedById,
          verifiedAt: lab.verifiedAt,
          updatedAt: lab.updatedAt,
        });
      }
      out.push({
        table: 'HmsLabOrder',
        columns: [
          'id',
          'patientId',
          'orderedById',
          'testType',
          'status',
          'result',
          'resultedById',
          'verifiedById',
          'verifiedAt',
          'updatedAt',
        ],
        rows: decryptedLabs,
      });

      const { rows: invoices } = await tx.query(
        `SELECT "id", "patientId", "currency", "totalMinor"::text AS "totalMinor",
                "paidMinor"::text AS "paidMinor", "status", "createdAt"
         FROM "HmsInvoice" ORDER BY "createdAt" ASC, "id" ASC`,
      );
      out.push({
        table: 'HmsInvoice',
        columns: ['id', 'patientId', 'currency', 'totalMinor', 'paidMinor', 'status', 'createdAt'],
        rows: invoices,
      });

      const { rows: payments } = await tx.query(
        `SELECT "id", "invoiceId", "amountMinor"::text AS "amountMinor", "method",
                "idempotencyKey", "receivedById", "receivedAt"
         FROM "HmsPayment" ORDER BY "receivedAt" ASC, "id" ASC`,
      );
      out.push({
        table: 'HmsPayment',
        columns: ['id', 'invoiceId', 'amountMinor', 'method', 'idempotencyKey', 'receivedById', 'receivedAt'],
        rows: payments,
      });

      return out;
    });

    for (const chunk of chunks) {
      yield chunk;
    }
  }

  async eraseTenant(
    tenantId: string,
    mode: ErasureMode,
    context: DataRightsContext,
  ): Promise<TenantErasureSummary> {
    if (mode === 'RESTRICT') {
      const restricted = await withTenantTx(this.runtimePrisma, tenantId, async (tx) => {
        const { rows } = await tx.query<{ id: string }>(
          `UPDATE "HmsPatient"
           SET "processingStatus" = 'RESTRICTED',
               "restrictedAt" = now(),
               "restrictedReason" = $1,
               "restrictedBy" = $2,
               "updatedAt" = now()
           WHERE "processingStatus" <> 'RESTRICTED'
           RETURNING "id"`,
          [context.reason, context.actorId],
        );
        return rows.length;
      });
      return {
        contractVersion: this.contractVersion,
        pluginId: this.pluginId,
        tenantId,
        mode,
        rowsDeletedByTable: {},
        rowsRestrictedByTable: { HmsPatient: restricted },
      };
    }

    if (!this.maintenancePrisma) {
      throw new Error('HospitalOsDataRightsAdapter requires maintenancePrisma for tenant DELETE erasure.');
    }

    const rowsDeletedByTable = await this.maintenancePrisma.$transaction(async (tx) => {
      const counts: Record<string, number> = {};
      for (const tableName of HMS_TENANT_DELETE_ORDER) {
        const deletedCount = await tx.$executeRawUnsafe(
          `DELETE FROM public."${tableName}" WHERE "tenantId" = $1`,
          tenantId,
        );
        counts[tableName] = Number(deletedCount);
      }
      return counts;
    });

    return {
      contractVersion: this.contractVersion,
      pluginId: this.pluginId,
      tenantId,
      mode: 'DELETE',
      rowsDeletedByTable,
      rowsRestrictedByTable: {},
    };
  }

  async principalExport(
    tenantId: string,
    principal: PrincipalRef,
    context: DataRightsContext,
  ): Promise<PrincipalExportSummary> {
    const ring = this.getRing();
    const requestId = normalizeRequestId(context, 'pexp');

    const result = await withTenantTx(this.runtimePrisma, tenantId, async (tx) => {
      const resolved = await this.resolvePatientInTx(tx, ring, principal);
      const { rows: patientRows } = await tx.query<Record<string, any>>(
        `SELECT "id", "mrn", "nameSealed", "phoneSealed", "dateOfBirthSealed", "ageBand", "gender",
                "bloodGroup", "allergiesSealed", "emergencyContactSealed", "triageLevel",
                "processingStatus", "restrictedAt", "restrictedReason", "createdAt", "updatedAt"
         FROM "HmsPatient" WHERE "id" = $1`,
        [resolved.id],
      );
      const p = patientRows[0];
      if (!p) throw new HttpError(404, 'PATIENT_NOT_FOUND');

      await tx.query(
        `INSERT INTO "HmsPhiAccessLog" ("actorId", "patientId", "columns", "purpose", "requestId")
         VALUES ($1, $2, $3, 'DSR_EXPORT', $4)`,
        [
          context.actorId,
          p.id,
          ['nameSealed', 'phoneSealed', 'dateOfBirthSealed', 'allergiesSealed', 'emergencyContactSealed'],
          requestId,
        ],
      );

      const { rows: admissions } = await tx.query<Record<string, any>>(
        `SELECT "id", "patientId", "bedId", "attendingStaffId", "admittedAt", "dischargedAt", "notesSealed"
         FROM "HmsAdmission" WHERE "patientId" = $1 ORDER BY "admittedAt" ASC`,
        [p.id],
      );
      const { rows: appointments } = await tx.query<Record<string, any>>(
        `SELECT "id", "patientId", "doctorId", lower("slot") AS "startAt", upper("slot") AS "endAt",
                "status", "reasonSealed"
         FROM "HmsAppointment" WHERE "patientId" = $1 ORDER BY lower("slot") ASC`,
        [p.id],
      );
      const { rows: labs } = await tx.query<Record<string, any>>(
        `SELECT "id", "patientId", "orderedById", "testType", "status", "resultSealed",
                "verifiedById", "verifiedAt", "updatedAt"
         FROM "HmsLabOrder" WHERE "patientId" = $1 ORDER BY "updatedAt" ASC`,
        [p.id],
      );
      const { rows: invoices } = await tx.query<Record<string, any>>(
        `SELECT "id", "patientId", "currency", "totalMinor"::text AS "totalMinor",
                "paidMinor"::text AS "paidMinor", "status", "createdAt"
         FROM "HmsInvoice" WHERE "patientId" = $1 ORDER BY "createdAt" ASC`,
        [p.id],
      );
      const { rows: payments } = await tx.query<Record<string, any>>(
        `SELECT pay."id", pay."invoiceId", pay."amountMinor"::text AS "amountMinor",
                pay."method", pay."idempotencyKey", pay."receivedById", pay."receivedAt"
         FROM "HmsPayment" pay
         INNER JOIN "HmsInvoice" inv ON inv."tenantId" = pay."tenantId" AND inv."id" = pay."invoiceId"
         WHERE inv."patientId" = $1
         ORDER BY pay."receivedAt" ASC`,
        [p.id],
      );

      return {
        resolvedId: p.id,
        tables: {
          HmsPatient: [
            {
              id: p.id,
              mrn: p.mrn,
              name: tryOpenSealed(ring, p.nameSealed, { tenantId, column: 'name', rowId: p.id }),
              phone: tryOpenSealed(ring, p.phoneSealed, { tenantId, column: 'phone', rowId: p.id }),
              dateOfBirth: tryOpenSealed(ring, p.dateOfBirthSealed, {
                tenantId,
                column: 'dateOfBirth',
                rowId: p.id,
              }),
              ageBand: p.ageBand,
              gender: p.gender,
              bloodGroup: p.bloodGroup,
              allergies: tryOpenSealed(ring, p.allergiesSealed, {
                tenantId,
                column: 'allergies',
                rowId: p.id,
              }),
              emergencyContact: tryOpenSealed(ring, p.emergencyContactSealed, {
                tenantId,
                column: 'emergencyContact',
                rowId: p.id,
              }),
              triageLevel: p.triageLevel,
              processingStatus: p.processingStatus,
              restrictedAt: p.restrictedAt,
              restrictedReason: p.restrictedReason,
              createdAt: p.createdAt,
              updatedAt: p.updatedAt,
            },
          ],
          HmsAdmission: admissions.map((a) => ({
            id: a.id,
            patientId: a.patientId,
            bedId: a.bedId,
            attendingStaffId: a.attendingStaffId,
            admittedAt: a.admittedAt,
            dischargedAt: a.dischargedAt,
            notes: tryOpenSealed(ring, a.notesSealed, { tenantId, column: 'admissionNotes', rowId: a.id }),
          })),
          HmsAppointment: appointments.map((apt) => ({
            id: apt.id,
            patientId: apt.patientId,
            doctorId: apt.doctorId,
            startAt: apt.startAt,
            endAt: apt.endAt,
            status: apt.status,
            reason: tryOpenSealed(ring, apt.reasonSealed, { tenantId, column: 'reason', rowId: apt.id }, [
              'reasonSealed',
            ]),
          })),
          HmsLabOrder: labs.map((lab) => ({
            id: lab.id,
            patientId: lab.patientId,
            orderedById: lab.orderedById,
            testType: lab.testType,
            status: lab.status,
            result: tryOpenSealed(ring, lab.resultSealed, { tenantId, column: 'result', rowId: lab.id }, [
              'resultSealed',
            ]),
            verifiedById: lab.verifiedById,
            verifiedAt: lab.verifiedAt,
            updatedAt: lab.updatedAt,
          })),
          HmsInvoice: invoices,
          HmsPayment: payments,
        },
      };
    });

    const auditEventId = await this.recordAuditEvent?.({
      action: 'data_rights.principal.export',
      entityType: 'HmsPatient',
      entityId: result.resolvedId,
      tenantId,
      actorId: context.actorId,
      actorEmail: context.actorEmail,
      reason: context.reason,
      metadata: {
        pluginId: this.pluginId,
        principalKind: 'patient',
        principalId: result.resolvedId,
      },
    });

    return {
      contractVersion: this.contractVersion,
      pluginId: this.pluginId,
      tenantId,
      principal: { kind: 'patient', id: result.resolvedId },
      tables: result.tables,
      ...(auditEventId ? { auditEventId } : {}),
    };
  }

  async principalCorrect(
    tenantId: string,
    principal: PrincipalRef,
    patch: PrincipalCorrectionPatch,
    context: DataRightsContext,
  ): Promise<PrincipalCorrectionSummary> {
    const ring = this.getRing();
    const requestId = normalizeRequestId(context, 'pcorr');
    const fields = patch.fields || {};

    const allowedKeys = new Set([
      'name',
      'phone',
      'dateOfBirth',
      'allergies',
      'emergencyContact',
      'ageBand',
      'gender',
      'bloodGroup',
    ]);
    const requestedKeys = Object.keys(fields).filter((k) => allowedKeys.has(k));
    if (requestedKeys.length === 0) {
      throw new HttpError(422, 'INVALID_CORRECTION_FIELDS', 'No editable patient fields supplied.');
    }

    const result = await withTenantTx(this.runtimePrisma, tenantId, async (tx) => {
      const resolved = await this.resolvePatientInTx(tx, ring, principal);
      if (resolved.processingStatus === 'RESTRICTED') {
        throw new HttpError(
          409,
          'PATIENT_PROCESSING_RESTRICTED',
          'Patient record is legally restricted and cannot be modified.',
        );
      }

      const sets: string[] = ['"updatedAt" = now()', '"version" = "version" + 1'];
      const params: unknown[] = [resolved.id];
      const auditedPhiCols: string[] = [];

      const sealField = (colName: string, aadCol: string, value: string | null) => {
        if (value == null || value === '') return null;
        return seal(ring, value, { tenantId, column: aadCol, rowId: resolved.id });
      };

      if (fields.name !== undefined) {
        const nameVal = String(fields.name).trim();
        if (!nameVal) throw new HttpError(422, 'INVALID_INPUT', 'name cannot be empty');
        params.push(sealField('nameSealed', 'name', nameVal));
        sets.push(`"nameSealed" = $${params.length}`);
        params.push(blindIndex(ring, nameVal, 'name', tenantId, 'name'));
        sets.push(`"nameBlind" = $${params.length}`);
        auditedPhiCols.push('nameSealed');
      }
      if (fields.phone !== undefined) {
        const phoneVal = fields.phone == null ? null : String(fields.phone).trim();
        params.push(sealField('phoneSealed', 'phone', phoneVal));
        sets.push(`"phoneSealed" = $${params.length}`);
        params.push(phoneVal ? blindIndex(ring, phoneVal, 'phone', tenantId, 'phone') : null);
        sets.push(`"phoneBlind" = $${params.length}`);
        auditedPhiCols.push('phoneSealed');
      }
      if (fields.dateOfBirth !== undefined) {
        const dobVal = fields.dateOfBirth == null ? null : String(fields.dateOfBirth);
        params.push(sealField('dateOfBirthSealed', 'dateOfBirth', dobVal));
        sets.push(`"dateOfBirthSealed" = $${params.length}`);
        auditedPhiCols.push('dateOfBirthSealed');
      }
      if (fields.allergies !== undefined) {
        const val = fields.allergies == null ? null : String(fields.allergies);
        params.push(sealField('allergiesSealed', 'allergies', val));
        sets.push(`"allergiesSealed" = $${params.length}`);
        auditedPhiCols.push('allergiesSealed');
      }
      if (fields.emergencyContact !== undefined) {
        const val = fields.emergencyContact == null ? null : String(fields.emergencyContact);
        params.push(sealField('emergencyContactSealed', 'emergencyContact', val));
        sets.push(`"emergencyContactSealed" = $${params.length}`);
        auditedPhiCols.push('emergencyContactSealed');
      }
      if (fields.ageBand !== undefined) {
        params.push(fields.ageBand == null ? null : String(fields.ageBand));
        sets.push(`"ageBand" = $${params.length}`);
      }
      if (fields.gender !== undefined) {
        params.push(fields.gender == null ? null : String(fields.gender));
        sets.push(`"gender" = $${params.length}`);
      }
      if (fields.bloodGroup !== undefined) {
        params.push(fields.bloodGroup == null ? null : String(fields.bloodGroup));
        sets.push(`"bloodGroup" = $${params.length}`);
      }

      const { rowCount } = await tx.query(
        `UPDATE "HmsPatient" SET ${sets.join(', ')} WHERE "id" = $1`,
        params,
      );

      await tx.query(
        `INSERT INTO "HmsPhiAccessLog" ("actorId", "patientId", "columns", "purpose", "requestId")
         VALUES ($1, $2, $3, 'DSR_CORRECTION', $4)`,
        [
          context.actorId,
          resolved.id,
          auditedPhiCols.length > 0 ? auditedPhiCols : requestedKeys,
          requestId,
        ],
      );

      return { resolvedId: resolved.id, updatedCount: rowCount ?? 0 };
    });

    const auditEventId = await this.recordAuditEvent?.({
      action: 'data_rights.principal.correct',
      entityType: 'HmsPatient',
      entityId: result.resolvedId,
      tenantId,
      actorId: context.actorId,
      actorEmail: context.actorEmail,
      reason: context.reason,
      metadata: {
        pluginId: this.pluginId,
        principalKind: 'patient',
        principalId: result.resolvedId,
        updatedFields: requestedKeys,
      },
    });

    return {
      contractVersion: this.contractVersion,
      pluginId: this.pluginId,
      tenantId,
      principal: { kind: 'patient', id: result.resolvedId },
      updatedFields: requestedKeys,
      updatedCount: result.updatedCount,
      ...(auditEventId ? { auditEventId } : {}),
    };
  }

  async principalErase(
    tenantId: string,
    principal: PrincipalRef,
    mode: ErasureMode,
    context: DataRightsContext,
  ): Promise<PrincipalErasureSummary> {
    const ring = this.getRing();
    const requestId = normalizeRequestId(context, 'perase');

    if (mode === 'RESTRICT') {
      const restricted = await withTenantTx(this.runtimePrisma, tenantId, async (tx) => {
        const resolved = await this.resolvePatientInTx(tx, ring, principal);
        await tx.query(
          `UPDATE "HmsPatient"
           SET "processingStatus" = 'RESTRICTED',
               "restrictedAt" = now(),
               "restrictedReason" = $2,
               "restrictedBy" = $3,
               "updatedAt" = now(),
               "version" = "version" + 1
           WHERE "id" = $1`,
          [resolved.id, context.reason, context.actorId],
        );

        await tx.query(
          `INSERT INTO "HmsPhiAccessLog" ("actorId", "patientId", "columns", "purpose", "requestId")
           VALUES ($1, $2, $3, 'DSR_RESTRICTION', $4)`,
          [context.actorId, resolved.id, ['processingStatus'], requestId],
        );

        return resolved.id;
      });

      const auditEventId = await this.recordAuditEvent?.({
        action: 'data_rights.principal.restrict',
        entityType: 'HmsPatient',
        entityId: restricted,
        tenantId,
        actorId: context.actorId,
        actorEmail: context.actorEmail,
        reason: context.reason,
        metadata: {
          pluginId: this.pluginId,
          mode: 'RESTRICT',
          principalKind: 'patient',
          principalId: restricted,
        },
      });

      return {
        contractVersion: this.contractVersion,
        pluginId: this.pluginId,
        tenantId,
        principal: { kind: 'patient', id: restricted },
        mode: 'RESTRICT',
        rowsDeletedByTable: {},
        rowsRestrictedByTable: { HmsPatient: 1 },
        ...(auditEventId ? { auditEventId } : {}),
      };
    }

    if (!this.maintenancePrisma) {
      throw new Error('HospitalOsDataRightsAdapter requires maintenancePrisma for principal DELETE erasure.');
    }

    const resolvedId = await withTenantTx(this.runtimePrisma, tenantId, async (tx) => {
      const resolved = await this.resolvePatientInTx(tx, ring, principal);
      await tx.query(
        `INSERT INTO "HmsPhiAccessLog" ("actorId", "patientId", "columns", "purpose", "requestId")
         VALUES ($1, $2, $3, 'DSR_ERASURE', $4)`,
        [context.actorId, resolved.id, ['id'], requestId],
      );
      return resolved.id;
    });

    const rowsDeletedByTable = await this.maintenancePrisma.$transaction(async (tx) => {
      const counts: Record<string, number> = {};
      counts.HmsBreakGlassGrant = Number(
        await tx.$executeRawUnsafe(
          `DELETE FROM public."HmsBreakGlassGrant" WHERE "tenantId" = $1 AND "patientId" = $2`,
          tenantId,
          resolvedId,
        ),
      );
      counts.HmsPayment = Number(
        await tx.$executeRawUnsafe(
          `DELETE FROM public."HmsPayment" p USING public."HmsInvoice" i
           WHERE p."tenantId" = $1 AND i."tenantId" = $1 AND p."invoiceId" = i."id" AND i."patientId" = $2`,
          tenantId,
          resolvedId,
        ),
      );
      counts.HmsInvoice = Number(
        await tx.$executeRawUnsafe(
          `DELETE FROM public."HmsInvoice" WHERE "tenantId" = $1 AND "patientId" = $2`,
          tenantId,
          resolvedId,
        ),
      );
      counts.HmsLabOrder = Number(
        await tx.$executeRawUnsafe(
          `DELETE FROM public."HmsLabOrder" WHERE "tenantId" = $1 AND "patientId" = $2`,
          tenantId,
          resolvedId,
        ),
      );
      counts.HmsAppointment = Number(
        await tx.$executeRawUnsafe(
          `DELETE FROM public."HmsAppointment" WHERE "tenantId" = $1 AND "patientId" = $2`,
          tenantId,
          resolvedId,
        ),
      );
      counts.HmsAdmission = Number(
        await tx.$executeRawUnsafe(
          `DELETE FROM public."HmsAdmission" WHERE "tenantId" = $1 AND "patientId" = $2`,
          tenantId,
          resolvedId,
        ),
      );
      counts.HmsPatient = Number(
        await tx.$executeRawUnsafe(
          `DELETE FROM public."HmsPatient" WHERE "tenantId" = $1 AND "id" = $2`,
          tenantId,
          resolvedId,
        ),
      );
      return counts;
    });

    const auditEventId = await this.recordAuditEvent?.({
      action: 'data_rights.principal.erase',
      entityType: 'HmsPatient',
      entityId: resolvedId,
      tenantId,
      actorId: context.actorId,
      actorEmail: context.actorEmail,
      reason: context.reason,
      metadata: {
        pluginId: this.pluginId,
        mode: 'DELETE',
        principalKind: 'patient',
        principalId: resolvedId,
        rowsDeletedByTable,
      },
    });

    return {
      contractVersion: this.contractVersion,
      pluginId: this.pluginId,
      tenantId,
      principal: { kind: 'patient', id: resolvedId },
      mode: 'DELETE',
      rowsDeletedByTable,
      rowsRestrictedByTable: {},
      ...(auditEventId ? { auditEventId } : {}),
    };
  }
}
