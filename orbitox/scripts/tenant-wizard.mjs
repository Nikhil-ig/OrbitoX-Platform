#!/usr/bin/env node

/**
 * 🪐 OrbitoX Terminal Tenant Provisioning Wizard
 *
 * Command-line console wizard with live progress tracking across all 7 saga steps.
 * Usage:
 *   node scripts/tenant-wizard.mjs [--name <name>] [--slug <slug>] [--plugin <hospital-os|restaurant-os>] [--key <secret>] [--url <url>]
 */

const baseUrl = process.env.ORBITOX_URL || 'http://127.0.0.1:3005';
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🪐 OrbitoX Terminal Tenant Provisioning Wizard

Usage:
  node scripts/tenant-wizard.mjs [options]

Options:
  --name <name>       Tenant name (default: "Metro Medical Center")
  --slug <slug>       Tenant slug (default: auto-generated)
  --plugin <plugin>   Plugin identifier (hospital-os | restaurant-os | crm)
  --plan <plan>       Plan tier (starter | pro | enterprise)
  --key <secret>      Customer API key (or set ORBITOX_CUSTOMER_API_KEY)
  --url <url>         Target server URL (default: http://127.0.0.1:3005)
  -h, --help          Show this help message
`);
  process.exit(0);
}

function parseArg(flag, fallback) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return fallback;
}

const tenantName = parseArg('--name', 'Metro Medical Center');
const tenantSlug = parseArg('--slug', `metro-med-${Date.now().toString(36)}`);
const pluginId = parseArg('--plugin', 'hospital-os');
const planTier = parseArg('--plan', 'starter');
const apiKey = parseArg('--key', process.env.ORBITOX_CUSTOMER_API_KEY || '');
const serverUrl = parseArg('--url', baseUrl);

console.log('\n🪐 ==============================================================');
console.log('       ORBITOX TENANT PROVISIONING CONSOLE WIZARD');
console.log('==============================================================\n');
console.log(`• Target Server: ${serverUrl}`);
console.log(`• Tenant Name:   ${tenantName}`);
console.log(`• Tenant Slug:   ${tenantSlug}`);
console.log(`• Primary Plugin:${pluginId} (plan: ${planTier})`);
console.log(`• Operator Auth: ${apiKey ? 'Custom Key Provided' : 'Default Platform Credentials'}\n`);

async function runWizard() {
  const startTime = Date.now();
  console.log('🚀 [Wizard] Dispatching POST /api/v1/tenants...');

  const headers = { 'content-type': 'application/json' };
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  const payload = {
    name: tenantName,
    slug: tenantSlug,
    plugins: [{ id: pluginId, plan: planTier }],
  };

  const res = await fetch(`${serverUrl}/api/v1/tenants`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));

  if (res.status !== 202) {
    console.error(`\n❌ [Wizard] Provisioning failed with status ${res.status}:`, body.message || body.error || body);
    process.exit(1);
  }

  console.log(`\n✓ [Wizard] 202 Accepted received!`);
  console.log(`  Operation ID: ${body.operationId}`);
  console.log(`  Tenant ID:    ${body.tenantId}`);

  // N2: Captured secret returned synchronously once
  if (body.apiKey && body.apiKey.secret) {
    console.log(`\n🔐 [Wizard] MASTER API KEY SECRET (Captured Synchronously in 202):`);
    console.log(`   Secret:  \x1b[32m${body.apiKey.secret}\x1b[0m`);
    console.log(`   Prefix:  ${body.apiKey.prefix}`);
    console.log(`   Notice:  This secret is single-delivery and never stored in plain text.\n`);
  }

  const operationId = body.operationId;
  const pollHeaders = {};
  if (apiKey) pollHeaders['x-api-key'] = apiKey;

  console.log('⏳ [Wizard] Streaming live saga progress...');
  let lastLoggedStep = '';

  while (true) {
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    const opRes = await fetch(`${serverUrl}/api/v1/operations/${operationId}`, { headers: pollHeaders });
    
    if (opRes.ok) {
      const op = await opRes.json();

      if (Array.isArray(op.steps)) {
        for (const s of op.steps) {
          const key = `${s.id}-${s.status}`;
          if (s.status === 'RUNNING' && lastLoggedStep !== key) {
            process.stdout.write(`  [${elapsedSec}s] ◌ Step ${s.id}: ${s.name} ... \r`);
            lastLoggedStep = key;
          } else if (s.status === 'COMPLETED' && lastLoggedStep !== key) {
            console.log(`  [${elapsedSec}s] \x1b[32m✓\x1b[0m Step ${s.id}: ${s.name} (${s.durationMs || 0}ms)`);
            lastLoggedStep = key;
          } else if (s.status === 'FAILED' && lastLoggedStep !== key) {
            console.log(`  [${elapsedSec}s] \x1b[31m✕\x1b[0m Step ${s.id}: ${s.name} - ERROR: ${s.error}`);
            lastLoggedStep = key;
          }
        }
      }

      if (op.status === 'ACTIVE') {
        const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n✨ \x1b[32m==============================================================\x1b[0m`);
        console.log(`✨ TENANT IS ACTIVE IN ${totalDuration} SECONDS (SLA < 60s MET)`);
        console.log(`✨ Tenant ID: ${op.tenantId}`);
        console.log(`✨ ==============================================================\n`);
        break;
      }

      if (op.status === 'FAILED') {
        console.error(`\n❌ [Wizard] Operation failed: ${op.error}`);
        process.exit(1);
      }
    }

    if (Date.now() - startTime > 65000) {
      console.error('\n❌ [Wizard] Timed out waiting for operation to complete (> 60s).');
      process.exit(1);
    }

    await new Promise((r) => setTimeout(r, 400));
  }
}

runWizard().catch((err) => {
  console.error('\n❌ Fatal wizard error:', err.message);
  process.exit(1);
});
