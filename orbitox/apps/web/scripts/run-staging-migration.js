#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────
 * OrbitoX ECS One-Off Task: Staging Database Migration & Role Enablement (Phase 6F)
 * ─────────────────────────────────────────────────────────────
 * Executed as an isolated ECS Fargate task within the private VPC subnets.
 * Connects exclusively via `MIGRATOR_DATABASE_URL` (orbitox_migrator).
 * 1. Applies all Prisma migrations via `prisma migrate deploy`.
 * 2. Executes post-migration role enablement (ALTER ROLE ... WITH LOGIN).
 *
 * Security: Client-side SCRAM-SHA-256 verifiers (PBKDF2-SHA256, 4096 iter)
 * ensure raw passwords never appear in PostgreSQL statement logs or CloudWatch (B0-6).
 * ─────────────────────────────────────────────────────────────
 */

const { spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

/**
 * Computes standard PostgreSQL client-side SCRAM-SHA-256 verifier.
 * Format: SCRAM-SHA-256$4096:<salt_base64>$<StoredKey_base64>:<ServerKey_base64>
 */
function computeScramSha256Verifier(password, salt = crypto.randomBytes(16), iterations = 4096) {
  if (typeof password !== 'string' || !password) {
    throw new Error('Password must be a non-empty string to compute SCRAM-SHA-256 verifier.');
  }
  if (password.startsWith('SCRAM-SHA-256$')) {
    return password;
  }
  const saltedPassword = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  const clientKey = crypto.createHmac('sha256', saltedPassword).update('Client Key').digest();
  const storedKey = crypto.createHash('sha256').update(clientKey).digest();
  const serverKey = crypto.createHmac('sha256', saltedPassword).update('Server Key').digest();
  return `SCRAM-SHA-256$${iterations}:${salt.toString('base64')}$${storedKey.toString('base64')}:${serverKey.toString('base64')}`;
}

/**
 * Formulates the ALTER ROLE query with the computed SCRAM-SHA-256 verifier.
 * Guarantees plaintext passwords never reach the database query text.
 */
function buildAlterRolePasswordStatement(role, password) {
  const verifier = computeScramSha256Verifier(password);
  const escapedVerifier = verifier.replace(/'/g, "''");
  return `ALTER ROLE ${role} WITH LOGIN PASSWORD '${escapedVerifier}'`;
}

function getPasswordFromUrl(urlStr) {
  if (!urlStr) return null;
  try {
    const parsed = new URL(urlStr);
    return parsed.password ? decodeURIComponent(parsed.password) : null;
  } catch {
    return null;
  }
}

// Run post-migration role enablement as orbitox_migrator
async function enableRoles(migratorUrl) {
  console.log('🔐 Enabling application roles and synchronizing SCRAM-SHA-256 passwords...');
  const client = new Client({ connectionString: migratorUrl });
  await client.connect();

  try {
    const rolesToEnable = [
      'orbitox_runtime',
      'orbitox_maintenance',
      'orbitox_outbox_relay',
      'orbitox_platform_admin_audit',
      'hms_audit_reader'
    ];

    const rolePasswordMap = {
      orbitox_runtime: getPasswordFromUrl(process.env.APP_DATABASE_URL),
      orbitox_maintenance: getPasswordFromUrl(process.env.MAINTENANCE_DATABASE_URL),
      orbitox_outbox_relay: getPasswordFromUrl(process.env.OUTBOX_RELAY_DATABASE_URL),
      orbitox_platform_admin_audit: getPasswordFromUrl(process.env.PLATFORM_ADMIN_AUDIT_DATABASE_URL || process.env.PLATFORM_AUDIT_DATABASE_URL),
      hms_audit_reader: getPasswordFromUrl(process.env.HMS_AUDIT_DATABASE_URL),
    };

    for (const role of rolesToEnable) {
      const res = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [role]);
      if (res.rowCount > 0) {
        const pwd = rolePasswordMap[role];
        if (pwd) {
          const sql = buildAlterRolePasswordStatement(role, pwd);
          await client.query(sql);
          console.log(`  ✓ Enabled LOGIN and synchronized SCRAM password for ${role}`);
        } else {
          await client.query(`ALTER ROLE ${role} WITH LOGIN`);
          console.log(`  ✓ Enabled LOGIN for ${role}`);
        }
      } else {
        console.log(`  ℹ Role ${role} not found, skipping LOGIN grant.`);
      }
    }

    console.log('========================================================');
    console.log('✅ ALL STAGING DATABASE MIGRATIONS & ROLES READY');
    console.log('========================================================');
  } finally {
    await client.end();
  }
}

async function main() {
  const migratorUrl = process.env.MIGRATOR_DATABASE_URL || process.env.DATABASE_URL;
  if (!migratorUrl) {
    console.error('❌ MIGRATOR_DATABASE_URL (or DATABASE_URL) is required.');
    process.exit(1);
  }

  // Locate schema.prisma
  const candidateSchemaPaths = [
    path.resolve(process.cwd(), 'prisma/schema.prisma'),
    path.resolve(process.cwd(), '../../prisma/schema.prisma'),
    path.resolve(__dirname, '../../../prisma/schema.prisma'),
    path.resolve('/repo/prisma/schema.prisma'),
    path.resolve('/app/prisma/schema.prisma')
  ];

  const schemaPath = candidateSchemaPaths.find(p => fs.existsSync(p));
  if (!schemaPath) {
    console.error('❌ Could not locate prisma/schema.prisma in any known path:', candidateSchemaPaths);
    process.exit(1);
  }

  console.log('========================================================');
  console.log('🚀 RUNNING ORBITOX PRIVATE STAGING MIGRATION TASK (Phase 6F)');
  console.log('========================================================');
  console.log('📍 Schema Path:', schemaPath);

  // Locate prisma CLI binary
  const candidatePrismaCli = [
    path.resolve(process.cwd(), 'node_modules/prisma/build/index.js'),
    path.resolve(process.cwd(), '../../node_modules/prisma/build/index.js'),
    path.resolve(__dirname, '../../../node_modules/prisma/build/index.js'),
    path.resolve('/repo/node_modules/prisma/build/index.js'),
    path.resolve('/app/node_modules/prisma/build/index.js')
  ];

  const prismaCli = candidatePrismaCli.find(p => fs.existsSync(p));

  console.log('📦 Executing prisma migrate deploy...');
  const migrateResult = spawnSync(process.execPath, [
    prismaCli || 'npx prisma',
    'migrate',
    'deploy',
    `--schema=${schemaPath}`
  ], {
    env: {
      ...process.env,
      DATABASE_URL: migratorUrl
    },
    stdio: 'inherit'
  });

  if (migrateResult.status !== 0) {
    console.error('❌ prisma migrate deploy failed with exit code:', migrateResult.status);
    process.exit(migrateResult.status || 1);
  }

  console.log('✓ Prisma migrations deployed successfully.');

  await enableRoles(migratorUrl);
}

if (require.main === module) {
  main().catch(err => {
    console.error('❌ Failed to run migration task:', err);
    process.exit(1);
  });
}

module.exports = {
  computeScramSha256Verifier,
  buildAlterRolePasswordStatement,
  getPasswordFromUrl,
  enableRoles,
  main,
};
