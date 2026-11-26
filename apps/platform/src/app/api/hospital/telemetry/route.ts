import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/server/db/tenant-db';
import { prisma } from '@/server/db/prisma';
import { mapDbError, errorBody } from '@/server/db/db-errors';

export const GET = withHospitalGuard(async (_req: NextRequest, _routeContext, authContext) => {
  try {
    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      const { rows: bedRows } = await tx.query<{
        id: string;
        label: string;
        wardId: string;
        wardName: string | null;
        serviceState: string;
        patientId: string | null;
        mrn: string | null;
        triageLevel: number | null;
        ageBand: string | null;
        admittedAt: Date | null;
      }>(
        `SELECT b."id", b."label", b."wardId", w."name" AS "wardName", b."serviceState",
                a."patientId", p."mrn", p."triageLevel", p."ageBand", a."admittedAt"
         FROM "HmsBed" b
         LEFT JOIN "HmsWard" w ON w."tenantId" = b."tenantId" AND w."id" = b."wardId"
         LEFT JOIN "HmsAdmission" a ON a."tenantId" = b."tenantId" AND a."bedId" = b."id" AND a."dischargedAt" IS NULL
         LEFT JOIN "HmsPatient" p ON p."tenantId" = a."tenantId" AND p."id" = a."patientId"
         WHERE b."tenantId" = $1
         ORDER BY b."label" ASC`,
        [tx.tenantId]
      );

      const { rows: events } = await tx.query<{
        seq: bigint;
        payload: any;
        createdAt: Date;
      }>(
        `SELECT "seq", "payload", "createdAt"
         FROM "TenantOutbox"
         WHERE "topic" = 'hms.telemetry' AND "tenantId" = $1
         ORDER BY "seq" DESC
         LIMIT 200`,
        [tx.tenantId]
      );

      const latestByTarget = new Map<string, { payload: any; createdAt: Date }>();
      for (const ev of events) {
        const p = typeof ev.payload === 'string' ? JSON.parse(ev.payload) : ev.payload || {};
        const key = String(p.bedId || p.stationId || '');
        if (key && !latestByTarget.has(key)) {
          latestByTarget.set(key, { payload: p, createdAt: ev.createdAt });
        }
      }

      return bedRows.map((b) => {
        const bedEv = latestByTarget.get(b.id) || (b.patientId ? latestByTarget.get(b.patientId) : undefined);
        const payload = bedEv?.payload || {};
        const eventName = String(payload.event || '');
        const alarmCleared =
          eventName === 'TELEMETRY_ALARM_CLEARED' || payload.alarmActive === false;
        const alarmActive =
          eventName === 'TELEMETRY_ALARM' || payload.alarmActive === true
            ? !alarmCleared
            : false;

        return {
          id: b.id,
          label: b.label,
          wardId: b.wardId,
          wardName: b.wardName,
          serviceState: b.serviceState,
          status: alarmActive
            ? 'alarm'
            : b.patientId
              ? 'occupied'
              : b.serviceState === 'MAINTENANCE'
                ? 'sanitizing'
                : 'available',
          alarmActive,
          alarmMessage: alarmActive ? payload.message || payload.alarmMessage || 'Telemetry alarm active' : null,
          patient: b.patientId
            ? {
                id: b.patientId,
                mrn: b.mrn,
                triageLevel: b.triageLevel,
                ageBand: b.ageBand,
                admittedAt: b.admittedAt,
              }
            : null,
          vitals: payload.vitals || null,
          lastTelemetryAt: bedEv?.createdAt ? new Date(bedEv.createdAt).toISOString() : null,
        };
      });
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
});

export const POST = withHospitalGuard(async (req: NextRequest, _routeContext, authContext) => {
  try {
    const body = await req.json();

    const bedId = typeof body.bedId === 'string' ? body.bedId.trim() : typeof body.stationId === 'string' ? body.stationId.trim() : undefined;
    const event = typeof body.event === 'string' ? body.event.trim() : 'TELEMETRY_UPDATE';
    const alarmActive =
      body.alarmActive !== undefined
        ? Boolean(body.alarmActive)
        : event === 'TELEMETRY_ALARM'
          ? true
          : event === 'TELEMETRY_ALARM_CLEARED'
            ? false
            : undefined;

    const payload = {
      ...body,
      bedId,
      event,
      ...(alarmActive !== undefined ? { alarmActive } : {}),
      receivedAt: new Date().toISOString(),
    };

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      await tx.query(
        `INSERT INTO "TenantOutbox" ("topic", "payload") VALUES ($1, $2::jsonb)`,
        ['hms.telemetry', JSON.stringify(payload)]
      );
      return { success: true, recorded: true, bedId: bedId || null, event, alarmActive: alarmActive ?? null };
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
});
