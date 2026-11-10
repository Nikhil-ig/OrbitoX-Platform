#!/bin/bash
# Adversarial checks for 001_accounts_billing.sql (fresh database each run).
P="/usr/lib/postgresql/16/bin/psql -h 127.0.0.1 -p 55432 -X -q -At -U postgres"
D=/var/tmp/ref6
$P -c 'DROP DATABASE IF EXISTS acct_ref' -c 'CREATE DATABASE acct_ref' >/dev/null
$P -d acct_ref -v ON_ERROR_STOP=1 -1 -f $D/001_accounts_billing.sql >/dev/null && echo "migration applied"
Q="$P -d acct_ref"
pass=0; fail=0
ok()   { out=$($Q -c "$2" 2>&1); if echo "$out" | grep -qiE "error|refused"; then echo "FAIL  $1 -> $out"; fail=$((fail+1)); else echo "PASS  $1"; pass=$((pass+1)); fi; }
deny() { out=$($Q -c "$3" 2>&1); if echo "$out" | grep -qE "$2"; then echo "PASS  $1"; pass=$((pass+1)); else echo "FAIL  $1 -> expected /$2/ got: $out"; fail=$((fail+1)); fi; }
eq()   { out=$($Q -c "$3" 2>&1 | tail -1); if [ "$out" = "$2" ]; then echo "PASS  $1"; pass=$((pass+1)); else echo "FAIL  $1 -> expected '$2' got '$out'"; fail=$((fail+1)); fi; }
H() { printf '%064d' "$1"; }   # fake 64-char token hash

ok   "create users and org" "INSERT INTO \"CustomerUser\"(id,email) VALUES ('u1','Owner@Clinic.in'),('u2','admin@clinic.in'); INSERT INTO \"CustomerOrganization\"(id,name) VALUES ('o1','City Care'); INSERT INTO \"CustomerMembership\" VALUES ('o1','u1','OWNER',now()),('o1','u2','ADMIN',now())"
deny "A1 email unique ignoring case" "CustomerUser_email_ci" "INSERT INTO \"CustomerUser\"(id,email) VALUES ('u3','owner@CLINIC.in')"
deny "A1 malformed email refused" "check constraint" "INSERT INTO \"CustomerUser\"(id,email) VALUES ('u4','not-an-email')"
deny "A3 last owner cannot be demoted" "must keep at least one OWNER" "UPDATE \"CustomerMembership\" SET role='ADMIN' WHERE \"userId\"='u1'"
deny "A3 last owner cannot be removed" "must keep at least one OWNER" "DELETE FROM \"CustomerMembership\" WHERE \"userId\"='u1'"
ok   "A3 promote second owner" "UPDATE \"CustomerMembership\" SET role='OWNER' WHERE \"userId\"='u2'"
ok   "A3 now first owner may step down" "UPDATE \"CustomerMembership\" SET role='ADMIN' WHERE \"userId\"='u1'"

echo "== A3 under concurrency: both owners demote each other at once"
ok "make both owners" "UPDATE \"CustomerMembership\" SET role='OWNER'"
( $Q -c "BEGIN; UPDATE \"CustomerMembership\" SET role='ADMIN' WHERE \"userId\"='u1'; SELECT pg_sleep(1); COMMIT;" > $D/c1.out 2>&1 ) &
sleep 0.2
( $Q -c "UPDATE \"CustomerMembership\" SET role='ADMIN' WHERE \"userId\"='u2'" > $D/c2.out 2>&1 ) &
wait
eq   "A3 race leaves exactly one owner" "1" "SELECT count(*) FROM \"CustomerMembership\" WHERE role='OWNER'"

echo "== A2 tokens"
deny "invite cannot grant OWNER" "check constraint" "INSERT INTO \"AccountToken\" VALUES ('$(H 1)','INVITE',NULL,'o1','x@y.in','OWNER',now()+interval '1 day',NULL,now())"
deny "token lifetime capped at 7 days" "check constraint" "INSERT INTO \"AccountToken\" VALUES ('$(H 2)','VERIFY_EMAIL','u1',NULL,'owner@clinic.in',NULL,now()+interval '8 days',NULL,now())"
ok   "issue verify token" "INSERT INTO \"AccountToken\" VALUES ('$(H 3)','VERIFY_EMAIL','u1',NULL,'owner@clinic.in',NULL,now()+interval '1 day',NULL,now())"
CONSUME="UPDATE \"AccountToken\" SET \"usedAt\"=now() WHERE \"tokenHash\"='$(H 3)' AND purpose='VERIFY_EMAIL' AND \"usedAt\" IS NULL AND \"expiresAt\">now() RETURNING \"userId\""
eq   "wrong purpose consumes nothing" "" "UPDATE \"AccountToken\" SET \"usedAt\"=now() WHERE \"tokenHash\"='$(H 3)' AND purpose='RESET_PASSWORD' AND \"usedAt\" IS NULL AND \"expiresAt\">now() RETURNING \"userId\""
for i in $(seq 1 10); do ( $Q -c "$CONSUME" > $D/t$i.out 2>&1 ) & done; wait
eq   "A2 10 concurrent consumers -> exactly 1 wins" "1" "SELECT $(cat $D/t*.out | grep -c u1)"
ok   "issue expired token" "INSERT INTO \"AccountToken\" VALUES ('$(H 4)','RESET_PASSWORD','u1',NULL,'owner@clinic.in',NULL,now()+interval '1 second',NULL,now()-interval '1 minute')"
sleep 1.2
eq   "A2 expired token consumes nothing" "" "UPDATE \"AccountToken\" SET \"usedAt\"=now() WHERE \"tokenHash\"='$(H 4)' AND \"usedAt\" IS NULL AND \"expiresAt\">now() RETURNING \"userId\""

echo "== B billing binding"
ok   "map Razorpay plan" "INSERT INTO \"BillingPlanMap\" VALUES ('plan_HmsPro01','hms-pro','@orbitox/hms',499900,'INR','monthly',true),('plan_HmsStart1','hms-starter','@orbitox/hms',99900,'INR','monthly',true)"
ok   "record subscription we created" "INSERT INTO \"BillingSubscription\"(\"razorpaySubscriptionId\",\"organizationId\",\"tenantId\",\"pluginId\",\"razorpayPlanId\",\"createdBy\") VALUES ('sub_A1','o1','org/o1/project/p1/environment/e1','@orbitox/hms','plan_HmsStart1','u1')"
deny "B1 second live subscription for same tenant+plugin refused" "BillingSubscription_one_live" "INSERT INTO \"BillingSubscription\"(\"razorpaySubscriptionId\",\"organizationId\",\"tenantId\",\"pluginId\",\"razorpayPlanId\",\"createdBy\") VALUES ('sub_A2','o1','org/o1/project/p1/environment/e1','@orbitox/hms','plan_HmsPro01','u1')"
deny "B2 unknown Razorpay plan refused" "foreign key" "INSERT INTO \"BillingSubscription\"(\"razorpaySubscriptionId\",\"organizationId\",\"tenantId\",\"pluginId\",\"razorpayPlanId\",\"createdBy\") VALUES ('sub_A3','o1','org/o1/project/p2/environment/e1','@orbitox/hms','plan_Fake','u1')"
APPLY="UPDATE \"BillingSubscription\" SET status=\$s\$%s\$s\$, \"lastEventAt\"=%s WHERE \"razorpaySubscriptionId\"='sub_A1' AND \"lastEventAt\" < %s RETURNING status"
eq   "B3 newer event applies" "active" "$(printf "$APPLY" active 1000 1000)"
eq   "B3 older event (delivered late) ignored" "" "$(printf "$APPLY" pending 900 900)"
eq   "B3 status unchanged by late event" "active" "SELECT status FROM \"BillingSubscription\" WHERE \"razorpaySubscriptionId\"='sub_A1'"
ok   "after cancel, a new live subscription is allowed" "UPDATE \"BillingSubscription\" SET status='cancelled' WHERE \"razorpaySubscriptionId\"='sub_A1'; INSERT INTO \"BillingSubscription\"(\"razorpaySubscriptionId\",\"organizationId\",\"tenantId\",\"pluginId\",\"razorpayPlanId\",\"createdBy\") VALUES ('sub_A4','o1','org/o1/project/p1/environment/e1','@orbitox/hms','plan_HmsPro01','u1')"

echo; echo "RESULT: $pass passed, $fail failed"; [ $fail -eq 0 ]
