#!/usr/bin/env tsx
/**
 * Offline Ed25519 Verification CLI for OrbitoX 6G Deletion Certificates (G3)
 *
 * Usage:
 *   pnpm exec tsx scripts/verify-deletion-certificate.ts \
 *     --cert /path/to/certificate.json \
 *     --public-key /path/to/public-key.pem   # or JSON keyring / env ORBITOX_DELETION_CERT_KEYS
 */
import fs from 'node:fs';
import {
  extractDeletionCertPublicKeys,
  verifyDeletionCertificate,
} from '../apps/web/lib/data-rights/deletion-certificate';

function parseArgs(argv: string[]): {
  certPath?: string;
  publicKeyArg?: string;
} {
  let certPath: string | undefined;
  let publicKeyArg: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if ((arg === '--cert' || arg === '-c') && argv[i + 1]) {
      certPath = argv[++i];
    } else if (arg?.startsWith('--cert=')) {
      certPath = arg.slice('--cert='.length);
    } else if ((arg === '--public-key' || arg === '-k') && argv[i + 1]) {
      publicKeyArg = argv[++i];
    } else if (arg?.startsWith('--public-key=')) {
      publicKeyArg = arg.slice('--public-key='.length);
    }
  }

  return { certPath, publicKeyArg };
}

function loadTrustedKeys(arg?: string): string | Record<string, { publicKey: string }> {
  if (arg) {
    if (fs.existsSync(arg)) {
      const content = fs.readFileSync(arg, 'utf8').trim();
      return !content.startsWith('{') && content.includes('BEGIN PUBLIC KEY')
        ? content
        : extractDeletionCertPublicKeys(content);
    }
    return !arg.trimStart().startsWith('{') && arg.includes('BEGIN PUBLIC KEY')
      ? arg
      : extractDeletionCertPublicKeys(arg);
  }

  const fromEnv = process.env.ORBITOX_DELETION_CERT_KEYS?.trim();
  if (fromEnv) {
    return extractDeletionCertPublicKeys(fromEnv);
  }

  throw new Error(
    'No public key supplied. Pass --public-key <pem-or-json-path> or set ORBITOX_DELETION_CERT_KEYS.',
  );
}

function main(): void {
  const { certPath, publicKeyArg } = parseArgs(process.argv.slice(2));
  if (!certPath) {
    console.error(
      'Usage: tsx scripts/verify-deletion-certificate.ts --cert <file> --public-key <pem-or-json-file>',
    );
    process.exit(2);
  }

  const rawCert = certPath === '-'
    ? fs.readFileSync(0, 'utf8')
    : fs.readFileSync(certPath, 'utf8');
  const parsedCert = JSON.parse(rawCert) as unknown;
  const trustedKeys = loadTrustedKeys(publicKeyArg);

  const result = verifyDeletionCertificate(parsedCert, trustedKeys);
  if (!result.valid) {
    console.error(`INVALID DELETION CERTIFICATE: ${result.reason}`);
    process.exit(1);
  }

  const { certificate } = result;
  console.log(
    JSON.stringify(
      {
        valid: true,
        organizationId: certificate.payload.organizationId,
        requestId: certificate.payload.requestId,
        keyId: certificate.keyId,
        purpose: certificate.payload.purpose,
        completedAt: certificate.payload.completedAt,
        backupPitrExpiryAt: certificate.payload.backupPitrExpiryAt,
        totalRowsDeleted: certificate.payload.totalRowsDeleted,
      },
      null,
      2,
    ),
  );
}

main();
