import * as fs from 'fs';
import * as path from 'path';
import { commandKeygen } from './keygen';

/**
 * `orbitox setup [options]` — One-command automated onboarding setup.
 *
 * Configures `.npmrc` with GitHub Packages authentication and generates
 * cryptographic signing keys if missing.
 *
 * Options:
 *   --token=<ghp_...>    GitHub Personal Access Token (with write:packages / read:packages)
 *   --global             Save authentication to ~/.npmrc instead of local project
 */
export function commandSetup(args: string[]): void {
  let token: string | undefined;
  let isGlobal = false;

  for (const arg of args) {
    if (arg.startsWith('--token=')) {
      token = arg.split('=')[1]!;
    } else if (arg === '--global') {
      isGlobal = true;
    }
  }

  if (!token && process.env.NODE_AUTH_TOKEN) {
    token = process.env.NODE_AUTH_TOKEN;
  }

  console.log('\n================================================================');
  console.log('⚡ OrbitoX Platform Developer Setup & Quick Onboarding');
  console.log('================================================================\n');

  if (!token) {
    console.log('⚠️  No GitHub token provided. To authenticate with GitHub Packages:');
    console.log('   Run: orbitox setup --token=ghp_yourPersonalAccessTokenHere\n');
  } else {
    // Write .npmrc
    const targetNpmrc = isGlobal
      ? path.join(process.env.HOME || process.env.USERPROFILE || '.', '.npmrc')
      : path.join(process.cwd(), '.npmrc');

    const npmrcContent = [
      '# OrbitoX Automated Registry Authentication',
      '@orbitox-io:registry=https://npm.pkg.github.com',
      '@orbitox:registry=https://npm.pkg.github.com',
      `//npm.pkg.github.com/:_authToken=${token}`,
      'always-auth=true',
      '',
    ].join('\n');

    fs.writeFileSync(targetNpmrc, npmrcContent, 'utf-8');
    console.log(`✅ Configured registry authentication in: ${targetNpmrc}`);
  }

  // Generate development signing keys if not present
  const keysDir = path.join(process.cwd(), 'keys');
  const privKeyPath = path.join(keysDir, 'private.pem');

  if (!fs.existsSync(privKeyPath)) {
    console.log('\n🔑 Generating local development signing keypair...');
    commandKeygen(['--type=ed25519', `--out=${keysDir}`]);
  } else {
    console.log('🔒 Cryptographic signing keys: ALREADY PRESENT (keys/private.pem)');
  }

  console.log('\n================================================================');
  console.log('🎉 Setup Complete! You are ready to build and run OrbitoX apps.');
  console.log('================================================================');
  console.log('\nQuick Commands:');
  console.log('  • Add a plugin:    orbitox add crm');
  console.log('  • Package plugin:  orbitox package <name> --key=keys/private.pem');
  console.log('  • Verify plugin:   orbitox verify <name> --publicKey=keys/public.pem\n');
}
