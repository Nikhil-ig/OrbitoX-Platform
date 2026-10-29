-- ════════════════════════════════════════════════════════════════════════════
-- OrbitoX HospitalOS plugin schema (reference migration, tested on PostgreSQL 16)
--
-- Invariants enforced BY THE DATABASE (not by application code):
--   I1  Tenant isolation: forced RLS on every table; no tenant set  => 0 rows, inserts fail.
--   I2  No cross-tenant references: every FK is composite (tenantId, id).
--   I3  A patient has at most one open admission; a bed holds at most one open admission.
--   I4  A doctor cannot be double-booked; a patient cannot have overlapping appointments.
--   I5  Lab results are immutable once VERIFIED; status moves only along allowed edges;
--       the verifier must differ from the person who entered the result.
--   I6  Payments are an append-only ledger; sum(payments) can never exceed invoice total,
--       even under concurrent payments or ON CONFLICT retries; invoice status is derived in the same tx.
--   Trigger errors carry a stable CONSTRAINT name so the app maps them to API codes without parsing text.
--   I7  PHI access log and break-glass grants are append-only for the runtime role.
--   I8  The runtime role can never DELETE clinical or financial rows.
--   PHI columns hold ciphertext ("v1.<kid>.<iv>.<tag>.<ct>") produced by the app;
--   *_blind columns hold tenant-salted HMAC blind indexes for exact-match search.
-- ════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- One place that defines "current tenant". STABLE so it is evaluated once per statement.
CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')
$$;

-- Ciphertext shape guard (defence in depth: plaintext PHI can never be stored by mistake).
CREATE OR REPLACE FUNCTION hms_is_sealed(v text) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT v IS NULL OR v ~ '^v1\.[A-Za-z0-9_-]{1,32}\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]+$'
$$;

-- ── Reference data ──────────────────────────────────────────────────────────
CREATE TABLE "HmsDepartment" (
  "tenantId"  text NOT NULL DEFAULT app_current_tenant(),
  "id"        text NOT NULL,
  "name"      text NOT NULL CHECK (length("name") BETWEEN 1 AND 120),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("tenantId", "id"),
  UNIQUE ("tenantId", "name")
);

CREATE TABLE "HmsWard" (
  "tenantId"     text NOT NULL DEFAULT app_current_tenant(),
  "id"           text NOT NULL,
  "departmentId" text NOT NULL,
  "name"         text NOT NULL CHECK (length("name") BETWEEN 1 AND 120),
  PRIMARY KEY ("tenantId", "id"),
  FOREIGN KEY ("tenantId", "departmentId") REFERENCES "HmsDepartment" ("tenantId", "id")
);

CREATE TABLE "HmsBed" (
  "tenantId"       text   NOT NULL DEFAULT app_current_tenant(),
  "id"             text   NOT NULL,
  "wardId"         text   NOT NULL,
  "label"          text   NOT NULL CHECK (length("label") BETWEEN 1 AND 40),
  "dailyRateMinor" bigint NOT NULL CHECK ("dailyRateMinor" >= 0),
  -- occupancy is NOT stored here; it is derived from open admissions (single source of truth)
  "serviceState"   text   NOT NULL DEFAULT 'IN_SERVICE' CHECK ("serviceState" IN ('IN_SERVICE','MAINTENANCE')),
  PRIMARY KEY ("tenantId", "id"),
  UNIQUE ("tenantId", "wardId", "label"),
  FOREIGN KEY ("tenantId", "wardId") REFERENCES "HmsWard" ("tenantId", "id")
);

CREATE TABLE "HmsStaff" (
  "tenantId"     text NOT NULL DEFAULT app_current_tenant(),
  "id"           text NOT NULL,
  "nameSealed"   text NOT NULL CHECK (hms_is_sealed("nameSealed")),
  "emailBlind"   text NOT NULL CHECK (length("emailBlind") = 32),
  "role"         text NOT NULL CHECK ("role" IN ('DOCTOR','NURSE','LAB_TECH','PHARMACIST','BILLING','ADMIN','RECEPTION')),
  "departmentId" text,
  "status"       text NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE','SUSPENDED')),
  "onDuty"       boolean NOT NULL DEFAULT false,
  PRIMARY KEY ("tenantId", "id"),
  UNIQUE ("tenantId", "emailBlind"),
  FOREIGN KEY ("tenantId", "departmentId") REFERENCES "HmsDepartment" ("tenantId", "id")
);

-- ── Patients (PHI) ──────────────────────────────────────────────────────────
CREATE TABLE "HmsPatient" (
  "tenantId"               text NOT NULL DEFAULT app_current_tenant(),
  "id"                     text NOT NULL,
  "mrn"                    text NOT NULL CHECK ("mrn" ~ '^[A-Z0-9-]{4,32}$'),  -- medical record no., not PHI by itself
  "nameSealed"             text NOT NULL CHECK (hms_is_sealed("nameSealed")),
  "nameBlind"              text NOT NULL CHECK (length("nameBlind") = 32),
  "phoneSealed"            text          CHECK (hms_is_sealed("phoneSealed")),
  "phoneBlind"             text          CHECK ("phoneBlind" IS NULL OR length("phoneBlind") = 32),
  "dateOfBirthSealed"      text          CHECK (hms_is_sealed("dateOfBirthSealed")),
  "ageBand"                text          CHECK ("ageBand" IN ('0-1','1-5','6-12','13-17','18-39','40-59','60-79','80+')),
  "gender"                 text          CHECK ("gender" IN ('M','F','OTHER','UNDISCLOSED')),
  "bloodGroup"             text          CHECK ("bloodGroup" IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  "allergiesSealed"        text          CHECK (hms_is_sealed("allergiesSealed")),
  "emergencyContactSealed" text          CHECK (hms_is_sealed("emergencyContactSealed")),
  "triageLevel"            smallint      CHECK ("triageLevel" BETWEEN 1 AND 5),
  "createdAt"              timestamptz NOT NULL DEFAULT now(),
  "updatedAt"              timestamptz NOT NULL DEFAULT now(),
  "version"                integer NOT NULL DEFAULT 1,
  PRIMARY KEY ("tenantId", "id"),
  UNIQUE ("tenantId", "mrn")
);
CREATE INDEX "HmsPatient_phoneBlind" ON "HmsPatient" ("tenantId", "phoneBlind") WHERE "phoneBlind" IS NOT NULL;
CREATE INDEX "HmsPatient_nameBlind"  ON "HmsPatient" ("tenantId", "nameBlind");

-- ── Admissions: I3 via partial unique indexes (race-proof, no app locking needed) ──
CREATE TABLE "HmsAdmission" (
  "tenantId"         text NOT NULL DEFAULT app_current_tenant(),
  "id"               text NOT NULL,
  "patientId"        text NOT NULL,
  "bedId"            text NOT NULL,
  "attendingStaffId" text NOT NULL,
  "admittedAt"       timestamptz NOT NULL DEFAULT now(),
  "dischargedAt"     timestamptz,
  "notesSealed"      text CHECK (hms_is_sealed("notesSealed")),
  PRIMARY KEY ("tenantId", "id"),
  CHECK ("dischargedAt" IS NULL OR "dischargedAt" >= "admittedAt"),
  FOREIGN KEY ("tenantId", "patientId")        REFERENCES "HmsPatient" ("tenantId", "id"),
  FOREIGN KEY ("tenantId", "bedId")            REFERENCES "HmsBed"     ("tenantId", "id"),
  FOREIGN KEY ("tenantId", "attendingStaffId") REFERENCES "HmsStaff"   ("tenantId", "id")
);
CREATE UNIQUE INDEX "HmsAdmission_one_open_per_patient" ON "HmsAdmission" ("tenantId", "patientId") WHERE "dischargedAt" IS NULL;
CREATE UNIQUE INDEX "HmsAdmission_one_open_per_bed"     ON "HmsAdmission" ("tenantId", "bedId")     WHERE "dischargedAt" IS NULL;

-- A bed in MAINTENANCE cannot receive an admission; discharge is one-way.
CREATE OR REPLACE FUNCTION hms_admission_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF EXISTS (SELECT 1 FROM "HmsBed" b WHERE b."tenantId" = NEW."tenantId" AND b."id" = NEW."bedId"
               AND b."serviceState" <> 'IN_SERVICE') THEN
      RAISE EXCEPTION 'bed % is not in service', NEW."bedId" USING ERRCODE = 'check_violation', CONSTRAINT = 'HmsAdmission_bed_not_in_service';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD."dischargedAt" IS NOT NULL THEN
      RAISE EXCEPTION 'admission % is closed and immutable', OLD."id" USING ERRCODE = 'check_violation', CONSTRAINT = 'HmsAdmission_closed_immutable';
    END IF;
    IF NEW."patientId" <> OLD."patientId" OR NEW."admittedAt" <> OLD."admittedAt" THEN
      RAISE EXCEPTION 'patient and admission time are immutable' USING ERRCODE = 'check_violation', CONSTRAINT = 'HmsAdmission_identity_immutable';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "HmsAdmission_guard" BEFORE INSERT OR UPDATE ON "HmsAdmission"
  FOR EACH ROW EXECUTE FUNCTION hms_admission_guard();

-- ── Appointments: I4 via exclusion constraints ────────────────────────────────
CREATE TABLE "HmsAppointment" (
  "tenantId"     text NOT NULL DEFAULT app_current_tenant(),
  "id"           text NOT NULL,
  "patientId"    text NOT NULL,
  "doctorId"     text NOT NULL,
  "slot"         tstzrange NOT NULL CHECK (NOT isempty("slot") AND upper("slot") - lower("slot") <= interval '8 hours'),
  "status"       text NOT NULL DEFAULT 'SCHEDULED' CHECK ("status" IN ('SCHEDULED','CHECKED_IN','COMPLETED','CANCELLED','NO_SHOW')),
  "reasonSealed" text CHECK (hms_is_sealed("reasonSealed")),
  PRIMARY KEY ("tenantId", "id"),
  FOREIGN KEY ("tenantId", "patientId") REFERENCES "HmsPatient" ("tenantId", "id"),
  FOREIGN KEY ("tenantId", "doctorId")  REFERENCES "HmsStaff"   ("tenantId", "id"),
  CONSTRAINT "HmsAppointment_no_doctor_overlap" EXCLUDE USING gist
    ("tenantId" WITH =, "doctorId" WITH =, "slot" WITH &&) WHERE ("status" IN ('SCHEDULED','CHECKED_IN')),
  CONSTRAINT "HmsAppointment_no_patient_overlap" EXCLUDE USING gist
    ("tenantId" WITH =, "patientId" WITH =, "slot" WITH &&) WHERE ("status" IN ('SCHEDULED','CHECKED_IN'))
);

-- ── Lab orders: I5 state machine + four-eyes verification ────────────────────
CREATE TABLE "HmsLabOrder" (
  "tenantId"      text NOT NULL DEFAULT app_current_tenant(),
  "id"            text NOT NULL,
  "patientId"     text NOT NULL,
  "orderedById"   text NOT NULL,
  "testType"      text NOT NULL CHECK (length("testType") BETWEEN 2 AND 80),
  "status"        text NOT NULL DEFAULT 'ORDERED' CHECK ("status" IN ('ORDERED','COLLECTED','PROCESSING','RESULTED','VERIFIED','CANCELLED')),
  "resultSealed"  text CHECK (hms_is_sealed("resultSealed")),
  "resultedById"  text,
  "verifiedById"  text,
  "verifiedAt"    timestamptz,
  "version"       integer NOT NULL DEFAULT 1,
  "updatedAt"     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("tenantId", "id"),
  FOREIGN KEY ("tenantId", "patientId")    REFERENCES "HmsPatient" ("tenantId", "id"),
  FOREIGN KEY ("tenantId", "orderedById")  REFERENCES "HmsStaff"   ("tenantId", "id"),
  FOREIGN KEY ("tenantId", "resultedById") REFERENCES "HmsStaff"   ("tenantId", "id"),
  FOREIGN KEY ("tenantId", "verifiedById") REFERENCES "HmsStaff"   ("tenantId", "id"),
  CHECK ("status" NOT IN ('RESULTED','VERIFIED') OR ("resultSealed" IS NOT NULL AND "resultedById" IS NOT NULL)),
  CHECK ("status" <> 'VERIFIED' OR ("verifiedById" IS NOT NULL AND "verifiedAt" IS NOT NULL AND "verifiedById" <> "resultedById"))
);

CREATE OR REPLACE FUNCTION hms_lab_transition() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE allowed text[];
BEGIN
  IF OLD."status" IN ('VERIFIED','CANCELLED') THEN
    RAISE EXCEPTION 'lab order % is final (%); create an amendment order instead', OLD."id", OLD."status"
      USING ERRCODE = 'check_violation', CONSTRAINT = 'HmsLabOrder_final';
  END IF;
  allowed := CASE OLD."status"
    WHEN 'ORDERED'    THEN ARRAY['ORDERED','COLLECTED','CANCELLED']
    WHEN 'COLLECTED'  THEN ARRAY['COLLECTED','PROCESSING','CANCELLED']
    WHEN 'PROCESSING' THEN ARRAY['PROCESSING','RESULTED','CANCELLED']
    WHEN 'RESULTED'   THEN ARRAY['RESULTED','VERIFIED']
  END;
  IF NOT (NEW."status" = ANY (allowed)) THEN
    RAISE EXCEPTION 'illegal lab transition % -> %', OLD."status", NEW."status" USING ERRCODE = 'check_violation', CONSTRAINT = 'HmsLabOrder_illegal_transition';
  END IF;
  IF NEW."patientId" <> OLD."patientId" OR NEW."orderedById" <> OLD."orderedById" OR NEW."testType" <> OLD."testType" THEN
    RAISE EXCEPTION 'lab order identity fields are immutable' USING ERRCODE = 'check_violation', CONSTRAINT = 'HmsLabOrder_identity_immutable';
  END IF;
  NEW."version"   := OLD."version" + 1;
  NEW."updatedAt" := now();
  RETURN NEW;
END $$;
CREATE TRIGGER "HmsLabOrder_transition" BEFORE UPDATE ON "HmsLabOrder"
  FOR EACH ROW EXECUTE FUNCTION hms_lab_transition();

-- ── Billing: I6 append-only payment ledger with concurrency-safe overpay guard ──
CREATE TABLE "HmsInvoice" (
  "tenantId"   text   NOT NULL DEFAULT app_current_tenant(),
  "id"         text   NOT NULL,
  "patientId"  text   NOT NULL,
  "currency"   char(3) NOT NULL DEFAULT 'INR',
  "totalMinor" bigint NOT NULL CHECK ("totalMinor" > 0),
  "paidMinor"  bigint NOT NULL DEFAULT 0 CHECK ("paidMinor" >= 0),
  "status"     text   NOT NULL DEFAULT 'OPEN' CHECK ("status" IN ('OPEN','PARTIALLY_PAID','PAID','VOID')),
  "createdAt"  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("tenantId", "id"),
  CHECK ("paidMinor" <= "totalMinor"),
  CHECK (("status" = 'PAID') = ("paidMinor" = "totalMinor") OR "status" = 'VOID'),
  FOREIGN KEY ("tenantId", "patientId") REFERENCES "HmsPatient" ("tenantId", "id")
);

CREATE TABLE "HmsPayment" (
  "tenantId"       text   NOT NULL DEFAULT app_current_tenant(),
  "id"             text   NOT NULL,
  "invoiceId"      text   NOT NULL,
  "amountMinor"    bigint NOT NULL CHECK ("amountMinor" > 0),
  "method"         text   NOT NULL CHECK ("method" IN ('CASH','CARD','UPI','INSURANCE','BANK_TRANSFER')),
  "idempotencyKey" text   NOT NULL CHECK (length("idempotencyKey") BETWEEN 8 AND 128),
  "receivedById"   text   NOT NULL,
  "receivedAt"     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("tenantId", "id"),
  UNIQUE ("tenantId", "idempotencyKey"),          -- a retried payment can never be recorded twice
  FOREIGN KEY ("tenantId", "invoiceId")    REFERENCES "HmsInvoice" ("tenantId", "id"),
  FOREIGN KEY ("tenantId", "receivedById") REFERENCES "HmsStaff"   ("tenantId", "id")
);

-- Two triggers, deliberately split:
--  BEFORE INSERT validates under a FOR UPDATE lock (serialises concurrent cashiers).
--  AFTER  INSERT applies the amount. AFTER row triggers fire ONLY for rows actually
--  inserted, so INSERT ... ON CONFLICT DO NOTHING on a retried idempotency key can
--  never bump paidMinor. (BEFORE triggers fire even for rows ON CONFLICT then skips.)
CREATE OR REPLACE FUNCTION hms_validate_payment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE inv "HmsInvoice"%ROWTYPE;
BEGIN
  SELECT * INTO inv FROM "HmsInvoice"
   WHERE "tenantId" = NEW."tenantId" AND "id" = NEW."invoiceId" FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invoice not found' USING ERRCODE = 'foreign_key_violation', CONSTRAINT = 'HmsPayment_invoice_missing';
  END IF;
  -- Retry of an already-recorded payment (sequential, or a concurrent duplicate that committed
  -- while we waited for the lock): skip the row silently so the caller can replay the original.
  -- Volatile plpgsql takes a fresh snapshot per statement, so the committed duplicate is visible.
  IF EXISTS (SELECT 1 FROM "HmsPayment" p WHERE p."tenantId" = NEW."tenantId" AND p."idempotencyKey" = NEW."idempotencyKey") THEN
    RETURN NULL;
  END IF;
  IF inv."status" IN ('PAID','VOID') THEN
    RAISE EXCEPTION 'invoice % is %', inv."id", inv."status" USING ERRCODE = 'check_violation', CONSTRAINT = 'HmsPayment_invoice_closed';
  END IF;
  IF inv."paidMinor" + NEW."amountMinor" > inv."totalMinor" THEN
    RAISE EXCEPTION 'payment exceeds outstanding balance (% > %)', NEW."amountMinor", inv."totalMinor" - inv."paidMinor"
      USING ERRCODE = 'check_violation', CONSTRAINT = 'HmsPayment_exceeds_balance';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "HmsPayment_validate" BEFORE INSERT ON "HmsPayment"
  FOR EACH ROW EXECUTE FUNCTION hms_validate_payment();

CREATE OR REPLACE FUNCTION hms_apply_payment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "HmsInvoice"
     SET "paidMinor" = "paidMinor" + NEW."amountMinor",
         "status" = CASE WHEN "paidMinor" + NEW."amountMinor" = "totalMinor" THEN 'PAID' ELSE 'PARTIALLY_PAID' END
   WHERE "tenantId" = NEW."tenantId" AND "id" = NEW."invoiceId";
  RETURN NULL;
END $$;
CREATE TRIGGER "HmsPayment_apply" AFTER INSERT ON "HmsPayment"
  FOR EACH ROW EXECUTE FUNCTION hms_apply_payment();

-- paidMinor may only change through the payment trigger (pg_trigger_depth() > 1 there).
CREATE OR REPLACE FUNCTION hms_invoice_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."paidMinor" <> OLD."paidMinor" AND pg_trigger_depth() < 2 THEN
    RAISE EXCEPTION 'paidMinor is derived from the payment ledger' USING ERRCODE = 'check_violation', CONSTRAINT = 'HmsInvoice_paid_is_derived';
  END IF;
  IF NEW."totalMinor" <> OLD."totalMinor" AND OLD."paidMinor" > 0 THEN
    RAISE EXCEPTION 'cannot change total of an invoice with payments' USING ERRCODE = 'check_violation', CONSTRAINT = 'HmsInvoice_total_locked';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "HmsInvoice_guard" BEFORE UPDATE ON "HmsInvoice"
  FOR EACH ROW EXECUTE FUNCTION hms_invoice_guard();

-- ── PHI access log & break-glass: I7 append-only ─────────────────────────────
CREATE TABLE "HmsPhiAccessLog" (
  "tenantId"   text NOT NULL DEFAULT app_current_tenant(),
  "seq"        bigint GENERATED ALWAYS AS IDENTITY,
  "actorId"    text NOT NULL,
  "patientId"  text NOT NULL,
  "columns"    text[] NOT NULL CHECK (cardinality("columns") > 0),
  "purpose"    text NOT NULL CHECK ("purpose" IN ('TREATMENT','BILLING','OPERATIONS','BREAK_GLASS','PATIENT_REQUEST')),
  "requestId"  text NOT NULL,
  "at"         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("tenantId", "seq")
);

CREATE TABLE "HmsBreakGlassGrant" (
  "tenantId"  text NOT NULL DEFAULT app_current_tenant(),
  "id"        text NOT NULL,
  "staffId"   text NOT NULL,
  "patientId" text NOT NULL,
  "reason"    text NOT NULL CHECK (length(btrim("reason")) >= 20),
  "grantedAt" timestamptz NOT NULL DEFAULT now(),
  "expiresAt" timestamptz NOT NULL,
  PRIMARY KEY ("tenantId", "id"),
  CHECK ("expiresAt" > "grantedAt" AND "expiresAt" <= "grantedAt" + interval '4 hours'),
  FOREIGN KEY ("tenantId", "staffId")   REFERENCES "HmsStaff"   ("tenantId", "id"),
  FOREIGN KEY ("tenantId", "patientId") REFERENCES "HmsPatient" ("tenantId", "id")
);

-- ── Shared plugin infrastructure: idempotency + transactional outbox ──────────
CREATE TABLE "TenantIdempotencyKey" (
  "tenantId"       text NOT NULL DEFAULT app_current_tenant(),
  "scope"          text NOT NULL,
  "key"            text NOT NULL CHECK (length("key") BETWEEN 8 AND 128),
  "requestHash"    text NOT NULL CHECK (length("requestHash") = 64),
  "responseStatus" integer,
  "responseBody"   jsonb,
  "createdAt"      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("tenantId", "scope", "key")
);

CREATE TABLE "TenantOutbox" (
  "tenantId"  text NOT NULL DEFAULT app_current_tenant(),
  "seq"       bigint GENERATED ALWAYS AS IDENTITY,
  "topic"     text NOT NULL CHECK ("topic" ~ '^[a-z]+(\.[a-z_]+)+$'),
  "payload"   jsonb NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("tenantId", "seq")
);

-- ── RLS + grants (I1, I7, I8) ─────────────────────────────────────────────────
DO $$
DECLARE t text;
  rw text[] := ARRAY['HmsDepartment','HmsWard','HmsBed','HmsStaff','HmsPatient','HmsAdmission',
                     'HmsAppointment','HmsLabOrder','HmsInvoice','TenantIdempotencyKey'];
  append_only text[] := ARRAY['HmsPayment','HmsPhiAccessLog','HmsBreakGlassGrant','TenantOutbox'];
BEGIN
  FOREACH t IN ARRAY rw || append_only LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON %I FROM PUBLIC', t);
  END LOOP;

  FOREACH t IN ARRAY rw LOOP
    EXECUTE format($p$CREATE POLICY %I ON %I FOR ALL TO orbitox_runtime
                     USING ("tenantId" = app_current_tenant())
                     WITH CHECK ("tenantId" = app_current_tenant())$p$, t || '_tenant', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON %I TO orbitox_runtime', t);   -- never DELETE
  END LOOP;

  FOREACH t IN ARRAY append_only LOOP
    EXECUTE format($p$CREATE POLICY %I ON %I FOR INSERT TO orbitox_runtime
                     WITH CHECK ("tenantId" = app_current_tenant())$p$, t || '_insert', t);
    EXECUTE format('GRANT INSERT ON %I TO orbitox_runtime', t);
  END LOOP;

  -- Payments and outbox must be readable by the app (receipts, SSE replay); logs are not.
  FOREACH t IN ARRAY ARRAY['HmsPayment','TenantOutbox','HmsBreakGlassGrant'] LOOP
    EXECUTE format($p$CREATE POLICY %I ON %I FOR SELECT TO orbitox_runtime
                     USING ("tenantId" = app_current_tenant())$p$, t || '_select', t);
    EXECUTE format('GRANT SELECT ON %I TO orbitox_runtime', t);
  END LOOP;
END $$;

-- Idempotency rows are purged by maintenance only.
CREATE POLICY "TenantIdempotencyKey_purge" ON "TenantIdempotencyKey" FOR DELETE TO orbitox_maintenance
  USING ("createdAt" < now() - interval '7 days');
GRANT SELECT, DELETE ON "TenantIdempotencyKey" TO orbitox_maintenance;
CREATE POLICY "TenantOutbox_purge" ON "TenantOutbox" FOR DELETE TO orbitox_maintenance
  USING ("createdAt" < now() - interval '24 hours');
GRANT SELECT, DELETE ON "TenantOutbox" TO orbitox_maintenance;
CREATE POLICY "TenantOutbox_purge_select" ON "TenantOutbox" FOR SELECT TO orbitox_maintenance USING (true);
CREATE POLICY "TenantIdempotencyKey_purge_select" ON "TenantIdempotencyKey" FOR SELECT TO orbitox_maintenance USING (true);
