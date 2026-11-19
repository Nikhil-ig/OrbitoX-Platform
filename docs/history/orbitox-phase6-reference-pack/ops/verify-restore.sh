#!/usr/bin/env bash
# verify-restore.sh: prove a backup can be restored, and that security survived the restore.
#
# Usage: verify-restore.sh <source_db_url> <scratch_db_url_without_dbname> <scratch_db_name>
#   source_db_url    : the database to back up (or point at a backup source)
#   scratch base url : a server where we may create/drop <scratch_db_name>
# Exit 0 only if: restore succeeds, every table's row count matches, every table that had
# FORCE RLS still has it, policy count matches, and migration history matches.
#
# NOTE: pg_dump does not include roles. On a fresh server, run the role setup script
# (configure-step1-runtime-role.sql) BEFORE restoring, or policies/grants will fail.
set -euo pipefail
SRC="$1"; BASE="$2"; NAME="$3"
[[ "$NAME" =~ ^restore_check_[a-z0-9_]+$ ]] || { echo "scratch db name must start with restore_check_"; exit 2; }
WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT
t0=$(date +%s)

pg_dump --format=custom --no-password --file="$WORK/db.dump" "$SRC"
t1=$(date +%s)
psql "$BASE/postgres" -X -q -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $NAME" -c "CREATE DATABASE $NAME"
pg_restore --exit-on-error --no-password --dbname="$BASE/$NAME" "$WORK/db.dump"
t2=$(date +%s)

snapshot() {  # one line per fact, sorted, so two databases can be diffed. Any SQL error aborts (fail closed).
  psql "$1" -X -At -v ON_ERROR_STOP=1 <<'SQL'
SELECT 'rows|' || c.relname || '|' ||
       (xpath('/row/n/text()', query_to_xml(format('SELECT count(*) AS n FROM %I.%I', n.nspname, c.relname), false, true, '')))[1]::text
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE c.relkind = 'r' AND n.nspname NOT IN ('pg_catalog','information_schema')
UNION ALL
SELECT 'rls|' || c.relname || '|' || c.relrowsecurity || '/' || c.relforcerowsecurity
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE c.relkind = 'r' AND n.nspname NOT IN ('pg_catalog','information_schema')
UNION ALL
SELECT 'policy|' || tablename || '|' || policyname || '|' || array_to_string(roles, ',') FROM pg_policies
UNION ALL
SELECT DISTINCT 'trigger|' || event_object_table || '|' || trigger_name FROM information_schema.triggers
ORDER BY 1;
SQL
  # Migration history only if the table exists (checked first, so no error path to swallow).
  if [ "$(psql "$1" -X -At -c "SELECT to_regclass('public._prisma_migrations') IS NOT NULL")" = "t" ]; then
    psql "$1" -X -At -v ON_ERROR_STOP=1 -c "SELECT 'migration|' || migration_name || '|' || (finished_at IS NOT NULL) FROM _prisma_migrations ORDER BY 1"
  fi
}

snapshot "$SRC" > "$WORK/src.txt"
snapshot "$BASE/$NAME" > "$WORK/dst.txt"
TABLES=$(grep -c '^rows|' "$WORK/src.txt" || true)
[ "$TABLES" -gt 0 ] || { echo "RESTORE CHECK FAILED: source snapshot has no tables (refusing to report OK on empty data)"; exit 1; }
if diff -u "$WORK/src.txt" "$WORK/dst.txt" > "$WORK/diff.txt"; then
  echo "RESTORE OK: $(grep -c '^rows|' "$WORK/src.txt") tables, $(grep -c '^policy|' "$WORK/src.txt") policies, $(grep -c '|true/true' "$WORK/src.txt") tables with forced RLS"
  echo "timing: dump $((t1-t0))s, restore $((t2-t1))s, dump size $(du -h "$WORK/db.dump" | cut -f1)"
  psql "$BASE/postgres" -X -q -c "DROP DATABASE $NAME"
else
  echo "RESTORE MISMATCH:"; head -40 "$WORK/diff.txt"; exit 1
fi
