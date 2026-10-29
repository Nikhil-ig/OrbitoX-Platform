#!/bin/bash
# Fresh database, apply migration twice-safe check, run adversarial tests.
P="/usr/lib/postgresql/16/bin/psql -h 127.0.0.1 -p 55432 -X -q -v ON_ERROR_STOP=1 -U postgres"
D=/var/tmp/hmsref
$P -c 'DROP DATABASE IF EXISTS hms_ref' -c 'CREATE DATABASE hms_ref' >/dev/null
$P -d hms_ref -1 -f $D/001_hms_plugin_schema.sql >/dev/null && echo "migration applied"
bash $D/test_hms_schema.sh hms_ref
