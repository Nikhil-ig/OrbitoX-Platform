-- Phase 6G Review Finding G-1: Defense-in-depth DB triggers for HmsPatient.processingStatus = 'RESTRICTED'
--
-- Every child table with a ("tenantId", "patientId") foreign key to public."HmsPatient" rejects
-- INSERT or UPDATE when the patient's processingStatus <> 'ACTIVE' (e.g. 'RESTRICTED'), raising
-- SQLSTATE 23514 ('check_violation') with CONSTRAINT = 'HmsPatient_processingStatus_restricted'.
--
-- EXPLICIT NAMED EXCEPTIONS (legal & clinical-safety obligations):
--   1. HmsAdmission discharge (UPDATE):
--      Transitioning an open admission from "dischargedAt" IS NULL to NOT NULL while keeping
--      all identity/clinical columns ("patientId", "bedId", "attendingStaffId", "admittedAt",
--      "notesSealed") unchanged remains permitted so restricted patients can be safely discharged
--      and hospital beds freed.
--   2. HmsPayment INSERT & derived HmsInvoice payment roll-up (UPDATE via HmsPayment_apply):
--      Recording a payment against an existing invoice in HmsPayment and the resulting nested
--      trigger roll-up on HmsInvoice (pg_trigger_depth() >= 2, changing only derived payment state
--      while keeping "patientId", "currency", "totalMinor", "createdAt" unchanged) remain permitted
--      for legal/billing settlement obligations. Creating new invoices (INSERT) or manually
--      mutating HmsInvoice (UPDATE at pg_trigger_depth() < 2) remain blocked.
--   3. HmsPhiAccessLog (append-only PHI audit ledger):
--      Excluded from restriction blocking because principal DSR exports (purpose = 'PATIENT_REQUEST')
--      and legal audit inspections must still record mandatory PHI access audit rows.

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

  IF patient_status IS NOT NULL AND patient_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'patient % processingStatus is %; clinical writes are blocked',
      NEW."patientId", patient_status
      USING ERRCODE = 'check_violation',
            CONSTRAINT = 'HmsPatient_processingStatus_restricted';
  END IF;

  -- If an UPDATE tried to re-point a child row away from a restricted patient, block it too
  IF TG_OP = 'UPDATE' AND OLD."patientId" IS DISTINCT FROM NEW."patientId" THEN
    SELECT p."processingStatus"
      INTO patient_status
      FROM public."HmsPatient" p
     WHERE p."tenantId" = OLD."tenantId"
       AND p."id" = OLD."patientId";

    IF patient_status IS NOT NULL AND patient_status <> 'ACTIVE' THEN
      RAISE EXCEPTION 'patient % processingStatus is %; clinical writes are blocked',
        OLD."patientId", patient_status
        USING ERRCODE = 'check_violation',
              CONSTRAINT = 'HmsPatient_processingStatus_restricted';
    END IF;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER "Hms00_PatientRestrictionGuard"
  BEFORE INSERT OR UPDATE ON public."HmsAdmission"
  FOR EACH ROW EXECUTE FUNCTION public.hms_enforce_patient_restriction();

CREATE TRIGGER "Hms00_PatientRestrictionGuard"
  BEFORE INSERT OR UPDATE ON public."HmsAppointment"
  FOR EACH ROW EXECUTE FUNCTION public.hms_enforce_patient_restriction();

CREATE TRIGGER "Hms00_PatientRestrictionGuard"
  BEFORE INSERT OR UPDATE ON public."HmsLabOrder"
  FOR EACH ROW EXECUTE FUNCTION public.hms_enforce_patient_restriction();

CREATE TRIGGER "Hms00_PatientRestrictionGuard"
  BEFORE INSERT OR UPDATE ON public."HmsInvoice"
  FOR EACH ROW EXECUTE FUNCTION public.hms_enforce_patient_restriction();

CREATE TRIGGER "Hms00_PatientRestrictionGuard"
  BEFORE INSERT OR UPDATE ON public."HmsBreakGlassGrant"
  FOR EACH ROW EXECUTE FUNCTION public.hms_enforce_patient_restriction();
