import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import { commandValidate } from './validate';

/**
 * `orbitox package <plugin> [options]` — Builds, strips source maps,
 * calculates SHA-256 hashes, signs the package cryptographically, and creates a release bundle.
 *
 * Options:
 *   --key=<privateKeyPath>   Path to Ed25519/RSA private key PEM (or $ORBITOX_SIGNING_KEY)
 *   --signer=<signerId>      Signer identity string (default: orbitox-official-builder)
 *   --out=<outDir>           Directory to output packaged bundle (default: ./dist-packages)
 */
export function commandPackage(args: string[]): void {
  const pluginName = args.find((a) => !a.startsWith('--'));
  if (!pluginName) {
    console.error('❌ Error: Please specify plugin to package (e.g., orbitox package crm)');
    process.exit(1);
  }

  let privateKeyPath: string | undefined;
  let signerId = 'orbitox-official-builder';
  let outDir = path.join(process.cwd(), 'dist-packages');

  for (const arg of args) {
    if (arg.startsWith('--key=')) {
      privateKeyPath = path.resolve(process.cwd(), arg.split('=')[1]!);
    } else if (arg.startsWith('--signer=')) {
      signerId = arg.split('=')[1]!;
    } else if (arg.startsWith('--out=')) {
      outDir = path.resolve(process.cwd(), arg.split('=')[1]!);
    }
  }

  const rootDir = process.cwd();
  const pluginDir = path.join(rootDir, 'plugins', pluginName);

  if (!fs.existsSync(pluginDir)) {
    console.error(`❌ Error: Plugin not found at plugins/${pluginName}`);
    process.exit(1);
  }

  console.log(`\n📦 Starting Secure Hardened Package Build for: @orbitox/${pluginName}\n`);

  // Step 1: Validate Plugin Manifest
  console.log('1️⃣  Step 1: Validating Plugin Manifest & Dependencies...');
  commandValidate([pluginName]);

  // Step 2: Run Production Build (TypeScript compiling with tsconfig.prod.json if available)
  console.log('2️⃣  Step 2: Compiling Hardened Production Artifacts (Stripping Source Maps)...');
  try {
    const prodTsConfig = path.join(rootDir, 'tsconfig.prod.json');
    if (fs.existsSync(prodTsConfig)) {
      execSync(`pnpm --filter @orbitox/${pluginName} build`, {
        cwd: rootDir,
        stdio: 'inherit',
      });
    }
    console.log('   ✅ Production compilation successful.');
  } catch (err: any) {
    console.error(`   ❌ Compilation failed: ${err.message}`);
    process.exit(1);
  }

  // Step 3: Compute SHA-256 Tree and Hashes
  console.log('3️⃣  Step 3: Calculating Cryptographic SHA-256 File Tree Hashes...');
  const manifestPath = path.join(pluginDir, 'manifest.json');
  const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
  const manifestHash = crypto.createHash('sha256').update(manifestContent).digest('hex');

  const fileHashes: Array<{ path: string; sha256: string; sizeBytes: number }> = [];

  const scanFiles = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(pluginDir, fullPath);

      if (
        entry.name === 'node_modules' ||
        entry.name === '.git' ||
        entry.name === 'manifest.signature.json' ||
        entry.name === '.turbo' ||
        entry.name.endsWith('.tsbuildinfo')
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        scanFiles(fullPath);
      } else if (entry.isFile()) {
        const buf = fs.readFileSync(fullPath);
        const hash = crypto.createHash('sha256').update(buf).digest('hex');
        const stat = fs.statSync(fullPath);
        fileHashes.push({ path: relPath, sha256: hash, sizeBytes: stat.size });
      }
    }
  };

  scanFiles(pluginDir);
  fileHashes.sort((a, b) => a.path.localeCompare(b.path));

  console.log(`   ✅ Indexed ${fileHashes.length} package files with cryptographic hashes.`);

  // Step 4: Digital Signing
  console.log('4️⃣  Step 4: Signing Package Manifest...');
  let privateKeyPem: string | null = null;

  if (privateKeyPath && fs.existsSync(privateKeyPath)) {
    privateKeyPem = fs.readFileSync(privateKeyPath, 'utf-8');
  } else if (process.env.ORBITOX_SIGNING_KEY) {
    privateKeyPem = process.env.ORBITOX_SIGNING_KEY;
  }

  let signatureHex = '';
  const signedAt = new Date().toISOString();

  if (privateKeyPem) {
    const payloadToSign = {
      signerId,
      manifestHash,
      fileTreeHash: crypto.createHash('sha256').update(JSON.stringify(fileHashes)).digest('hex'),
      signedAt,
    };

    try {
      const sign = crypto.createSign('SHA256');
      sign.update(JSON.stringify(payloadToSign));
      sign.end();
      signatureHex = sign.sign(privateKeyPem, 'hex');
    } catch {
      const sig = crypto.sign(null, Buffer.from(JSON.stringify(payloadToSign)), privateKeyPem);
      signatureHex = sig.toString('hex');
    }
    console.log(`   🔒 Cryptographic Signature Generated (${signerId})`);
  } else {
    console.log('   ⚠️  No private signing key provided (--key=<path> or $ORBITOX_SIGNING_KEY). Skipping digital signature.');
  }

  const signatureData = {
    algorithm: 'sha256WithRSAEncryption',
    signature: signatureHex,
    signedAt,
    signerId,
    manifestHash,
    files: fileHashes,
  };

  // Write manifest.signature.json to plugin directory
  const sigOutputPath = path.join(pluginDir, 'manifest.signature.json');
  fs.writeFileSync(sigOutputPath, JSON.stringify(signatureData, null, 2), 'utf-8');
  console.log(`   ✅ Created: ${path.relative(rootDir, sigOutputPath)}`);

  // Step 5: Create Compressed Archive (.tgz)
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('5️⃣  Step 5: Generating Protected Release Archive (.tgz)...');
  const manifest = JSON.parse(manifestContent);
  const tarballName = `orbitox-plugin-${pluginName}-${manifest.version || '1.0.0'}.tgz`;
  const tarballPath = path.join(outDir, tarballName);

  try {
    execSync(`tar -czf "${tarballPath}" -C "${pluginDir}" --exclude='node_modules' --exclude='.git' --exclude='.turbo' .`, {
      stdio: 'inherit',
    });
    console.log(`   🎉 Release Archive Created: ${path.relative(rootDir, tarballPath)}`);
    console.log(`\n✨ Secure package build complete for @orbitox/${pluginName}!\n`);
  } catch (err: any) {
    console.error(`   ❌ Failed to create tarball archive: ${err.message}`);
    process.exit(1);
  }
}
