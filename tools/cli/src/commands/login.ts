/**
 * 🪐 OrbitoX CLI - login command
 */

import { saveCredentials, maskApiKey, resolveUrl } from '../lib/config';
import { createOrbitoXClient } from '@orbitox-io/sdk';

export async function commandLogin(args: string[]): Promise<void> {
  let key = '';
  let url = '';

  for (let i = 0; i < args.length; i++) {
    const item = args[i];
    if (!item) continue;

    if (item === '--key') {
      const next = args[i + 1];
      if (next) {
        key = next;
        i++;
      }
    } else if (item.startsWith('--key=')) {
      key = item.slice('--key='.length);
    } else if (item === '--url') {
      const next = args[i + 1];
      if (next) {
        url = next;
        i++;
      }
    } else if (item.startsWith('--url=')) {
      url = item.slice('--url='.length);
    }
  }

  if (!key) {
    console.error('❌ Error: API key required. Use `orbitox login --key <your-key>` or set ORBITOX_API_KEY.');
    process.exit(1);
  }

  const targetUrl = resolveUrl(url);

  console.log(`Connecting to ${targetUrl}...`);
  try {
    const client = createOrbitoXClient({ baseUrl: targetUrl, apiKey: key });
    // Verify key by checking tenants catalogue or operations
    await client.transport.request({ method: 'GET', path: '/api/v1/tenants' });

    saveCredentials({ apiKey: key, url: targetUrl });

    console.log(`\n✓ Authentication successful!`);
    console.log(`• Target Server: ${targetUrl}`);
    console.log(`• Active Key:    ${maskApiKey(key)}`);
    console.log(`• Credentials securely stored.\n`);
  } catch (err: any) {
    console.error(`\n❌ Login failed: ${err.message || err}`);
    process.exit(1);
  }
}
