import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * `orbitox keygen [options]` — Generates an Ed25519 or RSA-2048 cryptographic signing keypair.
 *
 * Options:
 *   --type=ed25519|rsa  Key algorithm (default: ed25519)
 *   --out=<directory>   Output directory (default: ./keys)
 */
export function commandKeygen(args: string[]): void {
  let keyType: 'ed25519' | 'rsa' = 'ed25519';
  let outDir = path.join(process.cwd(), 'keys');

  for (const arg of args) {
    if (arg.startsWith('--type=')) {
      const val = arg.split('=')[1]?.toLowerCase();
      if (val === 'rsa' || val === 'ed25519') {
        keyType = val;
      }
    } else if (arg.startsWith('--out=')) {
      outDir = path.resolve(process.cwd(), arg.split('=')[1] || 'keys');
    }
  }

  console.log(`\n🔐 Generating ${keyType.toUpperCase()} cryptographic signing keypair...\n`);

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  let publicKey: string;
  let privateKey: string;

  if (keyType === 'ed25519') {
    const pair = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    publicKey = pair.publicKey;
    privateKey = pair.privateKey;
  } else {
    const pair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    publicKey = pair.publicKey;
    privateKey = pair.privateKey;
  }

  const pubPath = path.join(outDir, 'public.pem');
  const privPath = path.join(outDir, 'private.pem');

  fs.writeFileSync(pubPath, publicKey, 'utf-8');
  fs.writeFileSync(privPath, privateKey, { encoding: 'utf-8', mode: 0o600 }); // Restrict private key permissions

  console.log(`   ✅ Public Key:  ${path.relative(process.cwd(), pubPath)}`);
  console.log(`   🔒 Private Key: ${path.relative(process.cwd(), privPath)} (Strict 0600 permissions)`);
  console.log(`\n   ⚠️  CRITICAL SECURITY RULE:`);
  console.log(`   Never commit "private.pem" to Git! Add it to CI/CD repository secrets.\n`);
}
