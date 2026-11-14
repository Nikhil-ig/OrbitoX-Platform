#!/bin/bash
# Adversarial tests for 001_hms_plugin_schema.sql. Runs as REAL role logins.
# Usage: test_hms_schema.sh <db>   (expects trust auth on 127.0.0.1:55432 for test only)
DB=${1:-hms_ref}
PSQL_BIN=${PSQL_BIN:-$(which psql 2>/dev/null || echo "/usr/lib/postgresql/16/bin/psql")}
PGPORT=${PGPORT:-5432}
PSQL=${PSQL:-"$PSQL_BIN -h 127.0.0.1 -p $PGPORT -d $DB -X -q -At -v ON_ERROR_STOP=1"}
A='org/a/project/p1/environment/prod'
B='org/b/project/p1/environment/prod'
SEALED="v1.k2026a.AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAA.Y2lwaGVy"
BLIND="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
pass=0; fail=0

# run SQL as runtime inside one tx with tenant set; $1 tenant ("" = none), $2 sql
rt() { local t=$1; shift
  if [ -n "$t" ]; then $PSQL -U orbitox_runtime -c "BEGIN" -c "SELECT set_config('app.current_tenant_id','$t',true)" -c "$*" -c "COMMIT" 2>&1 | grep -v '^$'
  else $PSQL -U orbitox_runtime -c "$*" 2>&1; fi; }
ok()   { local name=$1; shift; out=$(rt "$@"); if echo "$out" | grep -qiE "error"; then echo "FAIL  $name -> $out"; fail=$((fail+1)); else echo "PASS  $name"; pass=$((pass+1)); fi; }
deny() { local name=$1 pat=$2; shift 2; out=$(rt "$@"); if echo "$out" | grep -qiE "$pat"; then echo "PASS  $name"; pass=$((pass+1)); else echo "FAIL  $name -> expected /$pat/ got: $out"; fail=$((fail+1)); fi; }
eq()   { local name=$1 want=$2; shift 2; out=$(rt "$@" | tail -1); if [ "$out" = "$want" ]; then echo "PASS  $name"; pass=$((pass+1)); else echo "FAIL  $name -> expected '$want' got '$out'"; fail=$((fail+1)); fi; }

seed() { local t=$1 p=$2
  local pup=$(echo "$p" | tr '[:lower:]' '[:upper:]')
  ok "seed $p" "$t" "
  INSERT INTO \"HmsDepartment\"(id,name) VALUES ('dep1','General');
  INSERT INTO \"HmsWard\"(id,\"departmentId\",name) VALUES ('w1','dep1','Ward 1');
  INSERT INTO \"HmsBed\"(id,\"wardId\",label,\"dailyRateMinor\") VALUES ('bed1','w1','B-1',250000),('bed2','w1','B-2',250000);
  INSERT INTO \"HmsStaff\"(id,\"nameSealed\",\"emailBlind\",role) VALUES ('doc1','$SEALED','${p}111111111111111111111111111111d','DOCTOR'),('doc2','$SEALED','${p}222222222222222222222222222222d','DOCTOR'),('cash1','$SEALED','${p}333333333333333333333333333333c','BILLING');
  INSERT INTO \"HmsPatient\"(id,mrn,\"nameSealed\",\"nameBlind\") VALUES ('pat1','MRN-${pup}-0001','$SEALED','$BLIND'),('pat2','MRN-${pup}-0002','$SEALED','$BLIND');
  INSERT INTO \"HmsInvoice\"(id,\"patientId\",\"totalMinor\") VALUES ('inv1','pat1',100000);"; }

echo "== I1 tenant isolation"
seed "$A" a
seed "$B" b
eq   "A sees only its patients"              "2"  "$A" "SELECT count(*) FROM \"HmsPatient\""
eq   "no tenant set => 0 rows"               "0"  ""   "SELECT count(*) FROM \"HmsPatient\""
deny "no tenant set => insert refused"       "row-level security|null value" "" "INSERT INTO \"HmsDepartment\"(id,name) VALUES ('x','x')"
deny "A cannot insert row labelled B"        "row-level security" "$A" "INSERT INTO \"HmsDepartment\"(\"tenantId\",id,name) VALUES ('$B','evil','Evil')"
eq   "A update of B row touches 0 rows"      "0" "$A" "WITH u AS (UPDATE \"HmsPatient\" SET \"triageLevel\"=1 WHERE \"tenantId\"='$B' RETURNING 1) SELECT count(*) FROM u"
deny "A cannot move its row to tenant B"     "row-level security" "$A" "UPDATE \"HmsDepartment\" SET \"tenantId\"='$B' WHERE id='dep1'"
eq   "prefix tenant org/a sees nothing"      "0" "org/a" "SELECT count(*) FROM \"HmsPatient\""

echo "== I2 composite FKs block cross-tenant references (even for superuser)"
out=$($PSQL -U postgres -c "INSERT INTO \"HmsAdmission\"(\"tenantId\",id,\"patientId\",\"bedId\",\"attendingStaffId\") VALUES ('$A','x','pat1','bed1','doc1')" 2>&1 >/dev/null; echo rc=$?)
# pat1 exists in both tenants; prove a reference to a B-only id fails from A:
$PSQL -U postgres -c "INSERT INTO \"HmsPatient\"(\"tenantId\",id,mrn,\"nameSealed\",\"nameBlind\") VALUES ('$B','onlyB','MRN-ONLYB','$SEALED','$BLIND')" >/dev/null
out=$($PSQL -U postgres -c "INSERT INTO \"HmsInvoice\"(\"tenantId\",id,\"patientId\",\"totalMinor\") VALUES ('$A','invX','onlyB',100)" 2>&1)
if echo "$out" | grep -q "foreign key"; then echo "PASS  A invoice cannot point at B-only patient"; pass=$((pass+1)); else echo "FAIL  cross-tenant FK -> $out"; fail=$((fail+1)); fi
$PSQL -U postgres -c "DELETE FROM \"HmsAdmission\" WHERE id='x'" >/dev/null

echo "== I8 no deletes for runtime"
deny "runtime cannot DELETE patients"        "permission denied" "$A" "DELETE FROM \"HmsPatient\" WHERE id='pat2'"
deny "runtime cannot TRUNCATE"               "permission denied" "$A" "TRUNCATE \"HmsInvoice\""

echo "== PHI shape guard"
deny "plaintext name rejected"               "nameSealed_check" "$A" "INSERT INTO \"HmsPatient\"(id,mrn,\"nameSealed\",\"nameBlind\") VALUES ('p9','MRN-A-0009','Ravi Kumar','$BLIND')"

echo "== I3 admissions"
ok   "admit pat1 to bed1"                    "$A" "INSERT INTO \"HmsAdmission\"(id,\"patientId\",\"bedId\",\"attendingStaffId\") VALUES ('adm1','pat1','bed1','doc1')"
deny "same patient second open admission"    "duplicate key.*one_open_per_patient" "$A" "INSERT INTO \"HmsAdmission\"(id,\"patientId\",\"bedId\",\"attendingStaffId\") VALUES ('adm2','pat1','bed2','doc1')"
deny "occupied bed refused"                  "duplicate key.*one_open_per_bed" "$A" "INSERT INTO \"HmsAdmission\"(id,\"patientId\",\"bedId\",\"attendingStaffId\") VALUES ('adm3','pat2','bed1','doc1')"
ok   "B can use its own bed1 at same time"   "$B" "INSERT INTO \"HmsAdmission\"(id,\"patientId\",\"bedId\",\"attendingStaffId\") VALUES ('adm1','pat1','bed1','doc1')"
ok   "maintenance on bed2"                   "$A" "UPDATE \"HmsBed\" SET \"serviceState\"='MAINTENANCE' WHERE id='bed2'"
deny "admit into maintenance bed refused"    "not in service" "$A" "INSERT INTO \"HmsAdmission\"(id,\"patientId\",\"bedId\",\"attendingStaffId\") VALUES ('adm4','pat2','bed2','doc1')"
ok   "discharge adm1"                        "$A" "UPDATE \"HmsAdmission\" SET \"dischargedAt\"=now() WHERE id='adm1'"
deny "closed admission immutable"            "closed and immutable" "$A" "UPDATE \"HmsAdmission\" SET \"dischargedAt\"=NULL WHERE id='adm1'"
ok   "bed1 reusable after discharge"         "$A" "INSERT INTO \"HmsAdmission\"(id,\"patientId\",\"bedId\",\"attendingStaffId\") VALUES ('adm5','pat2','bed1','doc1')"

echo "== I3 under concurrency: 2 sessions admit different patients to same bed"
ok "free bed2" "$A" "UPDATE \"HmsBed\" SET \"serviceState\"='IN_SERVICE' WHERE id='bed2'"
ok "new patients" "$A" "INSERT INTO \"HmsPatient\"(id,mrn,\"nameSealed\",\"nameBlind\") VALUES ('pc1','MRN-A-C001','$SEALED','$BLIND'),('pc2','MRN-A-C002','$SEALED','$BLIND')"
( rt "$A" "INSERT INTO \"HmsAdmission\"(id,\"patientId\",\"bedId\",\"attendingStaffId\") VALUES ('c1','pc1','bed2','doc1'); SELECT pg_sleep(1)" > /var/tmp/hmsref/c1.out ) &
sleep 0.2
( rt "$A" "INSERT INTO \"HmsAdmission\"(id,\"patientId\",\"bedId\",\"attendingStaffId\") VALUES ('c2','pc2','bed2','doc1')" > /var/tmp/hmsref/c2.out ) &
wait
eq "exactly one open admission on bed2" "1" "$A" "SELECT count(*) FROM \"HmsAdmission\" WHERE \"bedId\"='bed2' AND \"dischargedAt\" IS NULL"

echo "== I4 appointments"
ok   "book doc1 10:00-10:30"                 "$A" "INSERT INTO \"HmsAppointment\"(id,\"patientId\",\"doctorId\",slot) VALUES ('ap1','pat1','doc1','[2026-11-02 10:00+05:30,2026-11-02 10:30+05:30)')"
deny "doc1 overlap 10:15 refused"            "no_doctor_overlap" "$A" "INSERT INTO \"HmsAppointment\"(id,\"patientId\",\"doctorId\",slot) VALUES ('ap2','pat2','doc1','[2026-11-02 10:15+05:30,2026-11-02 10:45+05:30)')"
ok   "back-to-back 10:30 allowed"            "$A" "INSERT INTO \"HmsAppointment\"(id,\"patientId\",\"doctorId\",slot) VALUES ('ap3','pat2','doc1','[2026-11-02 10:30+05:30,2026-11-02 11:00+05:30)')"
deny "patient overlap with other doctor"     "no_patient_overlap" "$A" "INSERT INTO \"HmsAppointment\"(id,\"patientId\",\"doctorId\",slot) VALUES ('ap4','pat1','doc2','[2026-11-02 10:10+05:30,2026-11-02 10:20+05:30)')"
ok   "cancel ap1 frees slot"                 "$A" "UPDATE \"HmsAppointment\" SET status='CANCELLED' WHERE id='ap1'"
ok   "rebook 10:15 after cancel"             "$A" "INSERT INTO \"HmsAppointment\"(id,\"patientId\",\"doctorId\",slot) VALUES ('ap5','pat1','doc1','[2026-11-02 10:00+05:30,2026-11-02 10:30+05:30)')"
deny "9-hour slot refused"                   "slot_check" "$A" "INSERT INTO \"HmsAppointment\"(id,\"patientId\",\"doctorId\",slot) VALUES ('ap6','pat2','doc2','[2026-11-03 08:00+05:30,2026-11-03 17:00+05:30)')"

echo "== I5 lab state machine + four eyes"
ok   "order lab"                             "$A" "INSERT INTO \"HmsLabOrder\"(id,\"patientId\",\"orderedById\",\"testType\") VALUES ('lab1','pat1','doc1','CBC')"
deny "skip ORDERED->RESULTED refused"        "illegal lab transition" "$A" "UPDATE \"HmsLabOrder\" SET status='RESULTED',\"resultSealed\"='$SEALED',\"resultedById\"='doc1' WHERE id='lab1'"
ok   "ORDERED->COLLECTED->PROCESSING"        "$A" "UPDATE \"HmsLabOrder\" SET status='COLLECTED' WHERE id='lab1'; UPDATE \"HmsLabOrder\" SET status='PROCESSING' WHERE id='lab1'"
ok   "PROCESSING->RESULTED by doc1"          "$A" "UPDATE \"HmsLabOrder\" SET status='RESULTED',\"resultSealed\"='$SEALED',\"resultedById\"='doc1' WHERE id='lab1'"
deny "self-verification refused"            "HmsLabOrder_check" "$A" "UPDATE \"HmsLabOrder\" SET status='VERIFIED',\"verifiedById\"='doc1',\"verifiedAt\"=now() WHERE id='lab1'"
ok   "verify by doc2"                        "$A" "UPDATE \"HmsLabOrder\" SET status='VERIFIED',\"verifiedById\"='doc2',\"verifiedAt\"=now() WHERE id='lab1'"
deny "verified result immutable"             "is final" "$A" "UPDATE \"HmsLabOrder\" SET \"resultSealed\"='$SEALED' WHERE id='lab1'"
eq   "version advanced by trigger"           "5" "$A" "SELECT version FROM \"HmsLabOrder\" WHERE id='lab1'"

echo "== I6 payment ledger"
ok   "pay 40000"                             "$A" "INSERT INTO \"HmsPayment\"(id,\"invoiceId\",\"amountMinor\",method,\"idempotencyKey\",\"receivedById\") VALUES ('pay1','inv1',40000,'UPI','idem-key-0001','cash1')"
eq   "invoice partially paid"                "40000|PARTIALLY_PAID" "$A" "SELECT \"paidMinor\"||'|'||status FROM \"HmsInvoice\" WHERE id='inv1'"
ok   "retry with same key is skipped"         "$A" "INSERT INTO \"HmsPayment\"(id,\"invoiceId\",\"amountMinor\",method,\"idempotencyKey\",\"receivedById\") VALUES ('pay1b','inv1',40000,'UPI','idem-key-0001','cash1')"
eq   "paid unchanged after skipped retry"    "40000|1" "$A" "SELECT \"paidMinor\"||'|'||(SELECT count(*) FROM \"HmsPayment\" WHERE \"idempotencyKey\"='idem-key-0001') FROM \"HmsInvoice\" WHERE id='inv1'"
deny "overpay refused"                       "exceeds outstanding" "$A" "INSERT INTO \"HmsPayment\"(id,\"invoiceId\",\"amountMinor\",method,\"idempotencyKey\",\"receivedById\") VALUES ('pay2','inv1',60001,'CARD','idem-key-0002','cash1')"
deny "direct paidMinor edit refused"         "derived from the payment ledger" "$A" "UPDATE \"HmsInvoice\" SET \"paidMinor\"=100000 WHERE id='inv1'"
deny "cannot change total after payment"     "cannot change total" "$A" "UPDATE \"HmsInvoice\" SET \"totalMinor\"=50000 WHERE id='inv1'"
deny "runtime cannot update a payment"       "permission denied" "$A" "UPDATE \"HmsPayment\" SET \"amountMinor\"=1 WHERE id='pay1'"

ok   "ON CONFLICT retry is a no-op"           "$A" "INSERT INTO \"HmsPayment\"(id,\"invoiceId\",\"amountMinor\",method,\"idempotencyKey\",\"receivedById\") VALUES ('pay1c','inv1',40000,'UPI','idem-key-0001','cash1') ON CONFLICT (\"tenantId\",\"idempotencyKey\") DO NOTHING"
eq   "paid unchanged after ON CONFLICT retry" "40000|1" "$A" "SELECT \"paidMinor\"||'|'||(SELECT count(*) FROM \"HmsPayment\" WHERE \"idempotencyKey\"='idem-key-0001') FROM \"HmsInvoice\" WHERE id='inv1'"
echo "== I6 under concurrency: two cashiers pay 40000 each on 60000 outstanding"
( rt "$A" "INSERT INTO \"HmsPayment\"(id,\"invoiceId\",\"amountMinor\",method,\"idempotencyKey\",\"receivedById\") VALUES ('pc1','inv1',40000,'CASH','idem-key-c001','cash1'); SELECT pg_sleep(1)" > /var/tmp/hmsref/p1.out ) &
sleep 0.2
( rt "$A" "INSERT INTO \"HmsPayment\"(id,\"invoiceId\",\"amountMinor\",method,\"idempotencyKey\",\"receivedById\") VALUES ('pc2','inv1',40000,'CARD','idem-key-c002','cash1')" > /var/tmp/hmsref/p2.out ) &
wait
eq   "ledger never exceeds total"            "80000|80000" "$A" "SELECT (SELECT sum(\"amountMinor\") FROM \"HmsPayment\" WHERE \"invoiceId\"='inv1')||'|'||\"paidMinor\" FROM \"HmsInvoice\" WHERE id='inv1'"
ok   "exact settlement 20000"                "$A" "INSERT INTO \"HmsPayment\"(id,\"invoiceId\",\"amountMinor\",method,\"idempotencyKey\",\"receivedById\") VALUES ('pay3','inv1',20000,'CASH','idem-key-0003','cash1')"
eq   "invoice PAID"                          "PAID" "$A" "SELECT status FROM \"HmsInvoice\" WHERE id='inv1'"
ok   "replay of settling payment on PAID invoice is skipped" "$A" "INSERT INTO \"HmsPayment\"(id,\"invoiceId\",\"amountMinor\",method,\"idempotencyKey\",\"receivedById\") VALUES ('pay3r','inv1',20000,'CASH','idem-key-0003','cash1')"
deny "new payment on PAID invoice refused"   "is PAID" "$A" "INSERT INTO \"HmsPayment\"(id,\"invoiceId\",\"amountMinor\",method,\"idempotencyKey\",\"receivedById\") VALUES ('pay4','inv1',1,'CASH','idem-key-0004','cash1')"

echo "== I7 append-only logs"
ok   "log PHI access"                        "$A" "INSERT INTO \"HmsPhiAccessLog\"(\"actorId\",\"patientId\",columns,purpose,\"requestId\") VALUES ('doc1','pat1','{nameSealed}','TREATMENT','req-1')"
deny "runtime cannot read PHI log"           "permission denied" "$A" "SELECT count(*) FROM \"HmsPhiAccessLog\""
deny "runtime cannot alter PHI log"          "permission denied" "$A" "UPDATE \"HmsPhiAccessLog\" SET purpose='BILLING'"
deny "break-glass needs a real reason"       "reason_check" "$A" "INSERT INTO \"HmsBreakGlassGrant\"(id,\"staffId\",\"patientId\",reason,\"expiresAt\") VALUES ('bg1','doc2','pat1','urgent',now()+interval '1 hour')"
deny "break-glass max 4 hours"               "HmsBreakGlassGrant_check" "$A" "INSERT INTO \"HmsBreakGlassGrant\"(id,\"staffId\",\"patientId\",reason,\"expiresAt\") VALUES ('bg2','doc2','pat1','Unconscious patient in ER, attending unreachable',now()+interval '5 hours')"
ok   "valid break-glass grant"               "$A" "INSERT INTO \"HmsBreakGlassGrant\"(id,\"staffId\",\"patientId\",reason,\"expiresAt\") VALUES ('bg3','doc2','pat1','Unconscious patient in ER, attending unreachable',now()+interval '1 hour')"
deny "break-glass grant cannot be extended"  "permission denied" "$A" "UPDATE \"HmsBreakGlassGrant\" SET \"expiresAt\"=now()+interval '3 days'"

echo "== maintenance purge boundaries"
out=$($PSQL -U orbitox_maintenance -c "DELETE FROM \"TenantOutbox\"" 2>&1 | tail -1); echo "INFO  maintenance outbox purge on fresh rows: $out"

echo
echo "RESULT: $pass passed, $fail failed"
[ $fail -eq 0 ]
