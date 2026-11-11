import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Require run-staging-migration helper exports
const {
  computeScramSha256Verifier,
  buildAlterRolePasswordStatement,
  getPasswordFromUrl,
} = require('../../scripts/ops/run-staging-migration.js');

describe('Phase 6F B0-6: Database Role SCRAM-SHA-256 Verifier & Log Sanitization', () => {
  it('computes standard RFC 5802 / PostgreSQL SCRAM-SHA-256 verifier client-side', () => {
    const rawPassword = 'SuperSecretStagingRolePassword_2026!#$';
    const verifier = computeScramSha256Verifier(rawPassword);

    // Assert format: SCRAM-SHA-256$4096:<salt_base64>$<StoredKey_base64>:<ServerKey_base64>
    assert.match(
      verifier,
      /^SCRAM-SHA-256\$4096:[A-Za-z0-9+/=]{24}\$[A-Za-z0-9+/=]{44}:[A-Za-z0-9+/=]{44}$/,
      'Verifier must strictly match standard PostgreSQL SCRAM-SHA-256 format with 4096 iterations'
    );

    // Pass-through if already a SCRAM verifier
    const passthrough = computeScramSha256Verifier(verifier);
    assert.equal(passthrough, verifier);
  });

  it('guarantees ALTER ROLE statement text contains the SCRAM verifier and NEVER the plaintext password', () => {
    const role = 'orbitox_runtime';
    const rawPassword = 'HighlyConfidentialPasswordNeverLeakInLogs999';
    const statement = buildAlterRolePasswordStatement(role, rawPassword);

    // Assert the statement sets the password using the SCRAM-SHA-256 verifier
    assert.match(
      statement,
      new RegExp(`^ALTER ROLE ${role} WITH LOGIN PASSWORD 'SCRAM-SHA-256\\$4096:[^']+'$`),
      'ALTER ROLE query must set password as a SCRAM-SHA-256 verifier string'
    );

    // Assert the raw plaintext password is NOT contained anywhere in the SQL text
    assert.equal(
      statement.includes(rawPassword),
      false,
      'SQL query text must never contain the raw plaintext password'
    );
  });

  it('correctly decodes URL-encoded passwords from connection strings', () => {
    const url = 'postgresql://orbitox_runtime:P%40ssw0rd%21%23%24@pg.internal:5432/orbitox';
    const extracted = getPasswordFromUrl(url);
    assert.equal(extracted, 'P@ssw0rd!#$');
  });

  it('verifies RDS parameter group in database/main.tf configures log_statement = "none" and rds.force_ssl = "1"', () => {
    const tfPath = path.resolve(__dirname, '../../../../infra/terraform/aws/modules/database/main.tf');
    assert.ok(fs.existsSync(tfPath), `Could not find ${tfPath}`);
    const content = fs.readFileSync(tfPath, 'utf8');

    // Extract aws_db_parameter_group block
    const paramGroupMatch = content.match(/resource\s+"aws_db_parameter_group"\s+"pg16"\s+\{[\s\S]*?\n\}/);
    assert.ok(paramGroupMatch, 'aws_db_parameter_group "pg16" must exist in infra/modules/database/main.tf');

    const block = paramGroupMatch[0];

    // Assert rds.force_ssl = 1
    assert.match(
      block,
      /name\s*=\s*"rds\.force_ssl"[\s\S]*?value\s*=\s*"1"/,
      'Parameter rds.force_ssl must be set to "1"'
    );

    // Assert log_statement = "none" (B0-6)
    assert.match(
      block,
      /name\s*=\s*"log_statement"[\s\S]*?value\s*=\s*"none"/,
      'Parameter log_statement must be set to "none" to protect role DDL in logs'
    );
  });
});
