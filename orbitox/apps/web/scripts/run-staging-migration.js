#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────
 * OrbitoX ECS One-Off Task: Staging Database Migration & Role Enablement (Phase 6F)
 * ─────────────────────────────────────────────────────────────
 * Executed as an isolated ECS Fargate task within the private VPC subnets.
 * Connects exclusively via `MIGRATOR_DATABASE_URL` (orbitox_migrator).
 * 1. Applies all Prisma migrations via `prisma migrate deploy`.
 * 2. Executes post-migration role enablement (ALTER ROLE ... WITH LOGIN).
 * ─────────────────────────────────────────────────────────────
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

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

let schemaPath = candidateSchemaPaths.find(p => fs.existsSync(p));
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

let prismaCli = candidatePrismaCli.find(p => fs.existsSync(p));

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

// Run post-migration role enablement as orbitox_migrator
async function enableRoles() {
  console.log('🔐 Enabling application roles (orbitox_runtime, maintenance, outbox_relay)...');
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

    for (const role of rolesToEnable) {
      const res = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [role]);
      if (res.rowCount > 0) {
        await client.query(`ALTER ROLE ${role} WITH LOGIN`);
        console.log(`  ✓ Enabled LOGIN for ${role}`);
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

enableRoles().catch(err => {
  console.error('❌ Failed to enable application roles:', err);
  process.exit(1);
});

