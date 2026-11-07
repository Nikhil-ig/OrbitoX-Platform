/**
 * 🪐 OrbitoX CLI - operations command
 */

import { resolveApiKey, resolveUrl } from '../lib/config';
import { createOrbitoXClient } from '@orbitox-io/sdk';

export async function commandOperations(subcommand: string, args: string[]): Promise<void> {
  let explicitKey: string | undefined;
  let explicitUrl: string | undefined;

  const filteredArgs: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const item = args[i];
    if (!item) continue;

    if (item === '--key') {
      const next = args[i + 1];
      if (next) {
        explicitKey = next;
        i++;
      }
    } else if (item.startsWith('--key=')) {
      explicitKey = item.slice('--key='.length);
    } else if (item === '--url') {
      const next = args[i + 1];
      if (next) {
        explicitUrl = next;
        i++;
      }
    } else if (item.startsWith('--url=')) {
      explicitUrl = item.slice('--url='.length);
    } else {
      filteredArgs.push(item);
    }
  }

  const apiKey = resolveApiKey(explicitKey);
  const baseUrl = resolveUrl(explicitUrl);

  if (!apiKey) {
    console.error('❌ Error: No API key found. Run `orbitox login --key <key>` or set ORBITOX_API_KEY.');
    process.exit(1);
  }

  const client = createOrbitoXClient({ baseUrl, apiKey });

  if (subcommand === 'get') {
    const opId = filteredArgs[0];
    if (!opId) {
      console.error('❌ Error: Missing operation ID. Usage: orbitox operations get <operation-id>');
      process.exit(1);
    }

    try {
      const op = await client.operations.get(opId);

      console.log('\n🪐 ==============================================================');
      console.log(`       PLATFORM OPERATION: ${op.id}`);
      console.log('==============================================================\n');
      console.log(`• Status:          ${op.status}`);
      console.log(`• Type:            ${op.type}`);
      console.log(`• Tenant ID:       ${op.tenantId}`);
      console.log(`• Created At:      ${op.createdAt}`);
      console.log(`• Completed At:    ${op.completedAt || '(in progress)'}`);
      if (op.error) console.log(`• Error:           \x1b[31m${op.error}\x1b[0m`);

      if (Array.isArray(op.steps) && op.steps.length > 0) {
        console.log('\n📋 Workflow Steps:');
        for (const s of op.steps) {
          const statusIcon =
            s.status === 'COMPLETED'
              ? '\x1b[32m✓\x1b[0m'
              : s.status === 'FAILED'
              ? '\x1b[31m✕\x1b[0m'
              : s.status === 'RUNNING'
              ? '◌'
              : '·';
          const duration = s.durationMs !== undefined ? `(${s.durationMs}ms)` : '';
          console.log(`  ${statusIcon} Step ${s.id}: ${s.name} [${s.status}] ${duration}`);
          if (s.error) console.log(`    \x1b[31mError: ${s.error}\x1b[0m`);
        }
      }
      console.log('');
    } catch (err: any) {
      console.error(`\n❌ Failed to get operation: ${err.message || err}\n`);
      process.exit(1);
    }
    return;
  }

  console.log(`
Usage: orbitox operations <subcommand> [options]

Subcommands:
  get <operation-id>     Fetch status and step execution details for an operation
`);
}
