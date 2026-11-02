/**
 * 🪐 OrbitoX CLI - tenants command
 */

import { resolveApiKey, resolveUrl, maskApiKey } from '../lib/config';
import { createOrbitoXClient } from '@orbitox-io/sdk';

export async function commandTenants(subcommand: string, args: string[]): Promise<void> {
  let explicitKey: string | undefined;
  let explicitUrl: string | undefined;

  let tenantName = 'Metro Medical Center';
  let tenantSlug = '';
  let pluginId = 'hospital-os';
  let planTier = 'starter';
  let shouldWait = false;

  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a) continue;

    if (a === '--key') {
      const next = args[i + 1];
      if (next) {
        explicitKey = next;
        i++;
      }
    } else if (a.startsWith('--key=')) {
      explicitKey = a.slice('--key='.length);
    } else if (a === '--url') {
      const next = args[i + 1];
      if (next) {
        explicitUrl = next;
        i++;
      }
    } else if (a.startsWith('--url=')) {
      explicitUrl = a.slice('--url='.length);
    } else if (a === '--name') {
      const next = args[i + 1];
      if (next) {
        tenantName = next;
        i++;
      }
    } else if (a.startsWith('--name=')) {
      tenantName = a.slice('--name='.length);
    } else if (a === '--slug') {
      const next = args[i + 1];
      if (next) {
        tenantSlug = next;
        i++;
      }
    } else if (a.startsWith('--slug=')) {
      tenantSlug = a.slice('--slug='.length);
    } else if (a === '--plugin') {
      const next = args[i + 1];
      if (next) {
        pluginId = next;
        i++;
      }
    } else if (a.startsWith('--plugin=')) {
      pluginId = a.slice('--plugin='.length);
    } else if (a === '--plan') {
      const next = args[i + 1];
      if (next) {
        planTier = next;
        i++;
      }
    } else if (a.startsWith('--plan=')) {
      planTier = a.slice('--plan='.length);
    } else if (a === '--wait') {
      shouldWait = true;
    } else {
      positional.push(a);
    }
  }

  const apiKey = resolveApiKey(explicitKey);
  const baseUrl = resolveUrl(explicitUrl);

  if (!apiKey) {
    console.error('❌ Error: No API key found. Run `orbitox login --key <key>` or set ORBITOX_API_KEY.');
    process.exit(1);
  }

  const client = createOrbitoXClient({ baseUrl, apiKey });

  if (subcommand === 'create') {
    // Catalogue-driven installable plugins filter (HospitalOS and RestaurantOS; CRM pending)
    const installablePlugins = ['hospital-os', 'restaurant-os'];
    const canonical = pluginId.replace(/^@orbitox\//, '').toLowerCase();
    const resolvedPlugin = canonical === 'hms' ? 'hospital-os' : canonical === 'restaurant' ? 'restaurant-os' : canonical;

    if (!installablePlugins.includes(resolvedPlugin)) {
      if (resolvedPlugin === 'crm') {
        console.error(`\n❌ Error: Plugin "crm" is not installable while disabled (pending multi-tenant rebuild). Installable plugins: ${installablePlugins.join(', ')}\n`);
      } else {
        console.error(`\n❌ Error: Plugin "${pluginId}" is not installable. Installable plugins: ${installablePlugins.join(', ')}\n`);
      }
      process.exit(1);
    }

    const finalSlug = tenantSlug || `${resolvedPlugin.replace('-os', '')}-${Date.now().toString(36)}`;

    console.log('\n🪐 ==============================================================');
    console.log('       ORBITOX TENANT PROVISIONING CONSOLE');
    console.log('==============================================================\n');
    console.log(`• Target Server:   ${baseUrl}`);
    console.log(`• Tenant Name:     ${tenantName}`);
    console.log(`• Tenant Slug:     ${finalSlug}`);
    console.log(`• Primary Plugin:  ${resolvedPlugin} (plan: ${planTier})`);
    console.log(`• Authentication:  ${maskApiKey(apiKey)}\n`);

    const startTime = Date.now();
    console.log('🚀 Dispatching tenant creation...');

    try {
      const res = await client.tenants.create({
        name: tenantName,
        slug: finalSlug,
        plugins: [{ pluginId: resolvedPlugin, planId: planTier }],
      });

      console.log(`\n✓ Request accepted by platform!`);
      console.log(`• Operation ID: ${res.operationId}`);
      console.log(`• Tenant ID:    ${res.tenantId}`);

      if (res.apiKey) {
        console.log(`\n🔐 Master Tenant API Key Issued:`);
        console.log(`   Prefix: ${res.apiKey.prefix}`);
        console.log(`   Key:    ${maskApiKey(res.apiKey.secret)}`);
        console.log(`   Notice: Key secrets are masked and stored securely.\n`);
      }

      if (shouldWait) {
        console.log('⏳ Streaming live saga progress...');
        let lastLoggedStep = '';

        while (true) {
          const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
          const op = await client.operations.get(res.operationId);

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

          if (op.status === 'COMPLETED' || (op.status as string) === 'ACTIVE') {
            const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`\n✨ ==============================================================`);
            console.log(`✨ TENANT IS READY IN ${totalDuration} SECONDS`);
            console.log(`✨ Tenant ID: ${op.tenantId}`);
            console.log(`✨ ==============================================================\n`);
            break;
          }

          if (op.status === 'FAILED') {
            console.error(`\n❌ Operation failed: ${op.error}`);
            process.exit(1);
          }

          if (Date.now() - startTime > 65000) {
            console.error('\n❌ Timed out waiting for tenant provisioning (> 60s).');
            process.exit(1);
          }

          await new Promise((r) => setTimeout(r, 400));
        }
      }
    } catch (err: any) {
      console.error(`\n❌ Tenant creation failed: ${err.message || err}\n`);
      process.exit(1);
    }
    return;
  }

  if (subcommand === 'suspend') {
    const tenantId = positional[0];
    if (!tenantId) {
      console.error('❌ Error: Missing tenant ID. Usage: orbitox tenants suspend <tenant-id>');
      process.exit(1);
    }

    try {
      console.log(`Suspending tenant ${tenantId}...`);
      const res = await client.tenants.suspend(tenantId);
      console.log(`\n\x1b[32m✓\x1b[0m Tenant ${res.tenantId} is now ${res.status}.`);
      console.log(`• Service writes are now strictly suspended.\n`);
    } catch (err: any) {
      console.error(`\n❌ Failed to suspend tenant: ${err.message || err}\n`);
      process.exit(1);
    }
    return;
  }

  if (subcommand === 'resume') {
    const tenantId = positional[0];
    if (!tenantId) {
      console.error('❌ Error: Missing tenant ID. Usage: orbitox tenants resume <tenant-id>');
      process.exit(1);
    }

    try {
      console.log(`Resuming tenant ${tenantId}...`);
      const res = await client.tenants.resume(tenantId);
      console.log(`\n\x1b[32m✓\x1b[0m Tenant ${res.tenantId} is now ${res.status}.`);
      console.log(`• Service writes and operations are now active.\n`);
    } catch (err: any) {
      console.error(`\n❌ Failed to resume tenant: ${err.message || err}\n`);
      process.exit(1);
    }
    return;
  }

  if (subcommand === 'get') {
    const tenantId = positional[0];
    if (!tenantId) {
      console.error('❌ Error: Missing tenant ID. Usage: orbitox tenants get <tenant-id>');
      process.exit(1);
    }

    try {
      const tenant = await client.tenants.get(tenantId);
      console.log('\n🪐 ==============================================================');
      console.log(`       TENANT: ${tenant.name} (${tenant.slug})`);
      console.log('==============================================================\n');
      console.log(`• ID:              ${tenant.id}`);
      console.log(`• Organization:    ${tenant.organizationId}`);
      console.log(`• Status:          ${tenant.status}`);
      console.log(`• Environment:     ${tenant.environment}`);
      console.log(`• Created At:      ${tenant.createdAt}`);

      if (Array.isArray(tenant.plugins) && tenant.plugins.length > 0) {
        console.log('\n📦 Installed Plugins:');
        for (const p of tenant.plugins) {
          console.log(`  • ${p.pluginId}: status=${p.status}, plan=${p.plan || 'starter'}`);
        }
      }
      console.log('');
    } catch (err: any) {
      console.error(`\n❌ Failed to get tenant: ${err.message || err}\n`);
      process.exit(1);
    }
    return;
  }

  console.log(`
Usage: orbitox tenants <subcommand> [options]

Subcommands:
  create                  Provision a new tenant with live saga tracking
  get <tenant-id>         Fetch tenant configuration and installed plugins
  suspend <tenant-id>     Suspend tenant across all installed plugins
  resume <tenant-id>      Resume tenant access across all installed plugins

Options for create:
  --name <name>           Tenant display name
  --slug <slug>           Tenant unique slug
  --plugin <plugin>       Plugin (hospital-os | restaurant-os)
  --plan <plan>           Plan tier (starter | pro | enterprise)
  --wait                  Wait and stream live progress until completion
  --key <secret>          Customer API key (or set ORBITOX_API_KEY)
  --url <url>             Platform URL (default: http://127.0.0.1:3005)
`);
}
