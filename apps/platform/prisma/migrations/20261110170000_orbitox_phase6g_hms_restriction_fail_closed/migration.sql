-- Phase 6G Review Finding G-8: Fail closed in hms_enforce_patient_restriction()
-- when the referenced HmsPatient row cannot be read under current tenant RLS context
-- (patient_status IS NULL). Uses IS DISTINCT FROM 'ACTIVE' so missing/cross-tenant
-- patient rows trigger CONSTRAINT 'HmsPatient_processingStatus_restricted' immediately
-- instead of falling through.

CREATE OR REPLACE FUNCTION public.hms_enforce_patient_restriction()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  patient_status text;
BEGIN
  -- Named Exception 1: Safe clinical discharge / bed release on an open HmsAdmission
  IF TG_TABLE_NAME = 'HmsAdmission' AND TG_OP = 'UPDATE' THEN
    IF OLD."dischargedAt" IS NULL
       AND NEW."dischargedAt" IS NOT NULL
       AND NEW."tenantId" IS NOT DISTINCT FROM OLD."tenantId"
       AND NEW."id" IS NOT DISTINCT FROM OLD."id"
       AND NEW."patientId" IS NOT DISTINCT FROM OLD."patientId"
       AND NEW."bedId" IS NOT DISTINCT FROM OLD."bedId"
       AND NEW."attendingStaffId" IS NOT DISTINCT FROM OLD."attendingStaffId"
       AND NEW."admittedAt" IS NOT DISTINCT FROM OLD."admittedAt"
       AND NEW."notesSealed" IS NOT DISTINCT FROM OLD."notesSealed" THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Named Exception 2: Derived payment roll-up from HmsPayment_apply trigger onto HmsInvoice
  IF TG_TABLE_NAME = 'HmsInvoice' AND TG_OP = 'UPDATE' AND pg_trigger_depth() >= 2 THEN
    IF NEW."tenantId" IS NOT DISTINCT FROM OLD."tenantId"
       AND NEW."id" IS NOT DISTINCT FROM OLD."id"
       AND NEW."patientId" IS NOT DISTINCT FROM OLD."patientId"
       AND NEW."currency" IS NOT DISTINCT FROM OLD."currency"
       AND NEW."totalMinor" IS NOT DISTINCT FROM OLD."totalMinor"
       AND NEW."createdAt" IS NOT DISTINCT FROM OLD."createdAt" THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT p."processingStatus"
    INTO patient_status
    FROM public."HmsPatient" p
   WHERE p."tenantId" = NEW."tenantId"
     AND p."id" = NEW."patientId";

  IF patient_status IS DISTINCT FROM 'ACTIVE' THEN
    RAISE EXCEPTION 'patient % processingStatus is %; clinical writes are blocked',
      NEW."patientId", COALESCE(patient_status, 'MISSING')
      USING ERRCODE = 'check_violation',
            CONSTRAINT = 'HmsPatient_processingStatus_restricted';
  END IF;

  -- If an UPDATE tried to re-point a child row away from a restricted/non-active patient, block it too
  IF TG_OP = 'UPDATE' AND OLD."patientId" IS DISTINCT FROM NEW."patientId" THEN
    SELECT p."processingStatus"
      INTO patient_status
      FROM public."HmsPatient" p
     WHERE p."tenantId" = OLD."tenantId"
       AND p."id" = OLD."patientId";

    IF patient_status IS DISTINCT FROM 'ACTIVE' THEN
      RAISE EXCEPTION 'patient % processingStatus is %; clinical writes are blocked',
        OLD."patientId", COALESCE(patient_status, 'MISSING')
        USING ERRCODE = 'check_violation',
              CONSTRAINT = 'HmsPatient_processingStatus_restricted';
    END IF;
  END IF;

  RETURN NEW;
END $$;
