import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * `orbitox verify <plugin> [options]` — Verifies the cryptographic signature
 * and file integrity of a plugin or package.
 *
 * Options:
 *   --publicKey=<path>  Path to public key PEM file (or $ORBITOX_PUBLIC_KEY)
 */
export function commandVerify(args: string[]): void {
  const pluginName = args.find((a) => !a.startsWith('--'));
  if (!pluginName) {
    console.error('❌ Error: Please specify plugin to verify (e.g., orbitox verify crm)');
    process.exit(1);
  }

  let publicKeyPath: string | undefined;
  for (const arg of args) {
    if (arg.startsWith('--publicKey=')) {
      publicKeyPath = path.resolve(process.cwd(), arg.split('=')[1]!);
    }
  }

  const rootDir = process.cwd();
  const pluginDir = path.join(rootDir, 'plugins', pluginName);

  if (!fs.existsSync(pluginDir)) {
    console.error(`❌ Error: Plugin directory not found at plugins/${pluginName}`);
    process.exit(1);
  }

  console.log(`\n🛡️  Verifying Integrity & Signature for: @orbitox/${pluginName}\n`);

  const sigPath = path.join(pluginDir, 'manifest.signature.json');
  if (!fs.existsSync(sigPath)) {
    console.error(`❌ Error: No signature file (manifest.signature.json) found in plugins/${pluginName}.`);
    console.error(`   Run "orbitox package ${pluginName}" first to generate signature.`);
    process.exit(1);
  }

  let signatureData: any;
  try {
    signatureData = JSON.parse(fs.readFileSync(sigPath, 'utf-8'));
  } catch (err: any) {
    console.error(`❌ Error: Failed to parse manifest.signature.json: ${err.message}`);
    process.exit(1);
  }

  // 1. Verify Manifest Hash
  const manifestPath = path.join(pluginDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ Error: manifest.json is missing.`);
    process.exit(1);
  }

  const currentManifestHash = crypto
    .createHash('sha256')
    .update(fs.readFileSync(manifestPath, 'utf-8'))
    .digest('hex');

  if (currentManifestHash !== signatureData.manifestHash) {
    console.error(`❌ SECURITY ALERT: manifest.json has been modified after signing!`);
    console.error(`   Expected: ${signatureData.manifestHash}`);
    console.error(`   Actual:   ${currentManifestHash}`);
    process.exit(1);
  } else {
    console.log('   ✅ Manifest SHA-256 hash: MATCHED & VERIFIED');
  }

  // 2. Verify Files Integrity
  let alteredFiles = 0;
  let verifiedFiles = 0;

  for (const fileRecord of signatureData.files || []) {
    const fullPath = path.join(pluginDir, fileRecord.path);
    if (!fs.existsSync(fullPath)) {
      console.error(`   ❌ Missing file: ${fileRecord.path}`);
      alteredFiles++;
      continue;
    }

    const currentHash = crypto.createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex');
    if (currentHash !== fileRecord.sha256) {
      console.error(`   ❌ Altered file: ${fileRecord.path} (Hash mismatch!)`);
      alteredFiles++;
    } else {
      verifiedFiles++;
    }
  }

  console.log(`   ✅ File Integrity: ${verifiedFiles} files verified, 0 altered.`);

  // 3. Cryptographic Signature Verification
  let publicKeyPem: string | null = null;
  if (publicKeyPath && fs.existsSync(publicKeyPath)) {
    publicKeyPem = fs.readFileSync(publicKeyPath, 'utf-8');
  } else if (process.env.ORBITOX_PUBLIC_KEY) {
    publicKeyPem = process.env.ORBITOX_PUBLIC_KEY;
  }

  if (publicKeyPem && signatureData.signature) {
    const payloadToVerify = {
      signerId: signatureData.signerId,
      manifestHash: signatureData.manifestHash,
      fileTreeHash: crypto.createHash('sha256').update(JSON.stringify(signatureData.files)).digest('hex'),
      signedAt: signatureData.signedAt,
    };

    let isValid = false;
    try {
      const verify = crypto.createVerify('SHA256');
      verify.update(JSON.stringify(payloadToVerify));
      verify.end();
      isValid = verify.verify(publicKeyPem, signatureData.signature, 'hex');
    } catch {
      isValid = crypto.verify(
        null,
        Buffer.from(JSON.stringify(payloadToVerify)),
        publicKeyPem,
        Buffer.from(signatureData.signature, 'hex')
      );
    }

    if (isValid) {
      console.log(`   🔒 Digital Signature: VALID (Signed by ${signatureData.signerId || 'Author'})`);
    } else {
      console.error(`   ❌ SECURITY ALERT: Digital signature verification FAILED!`);
      process.exit(1);
    }
  } else if (signatureData.signature) {
    console.log(`   ℹ️  Signature present but no --publicKey provided to verify author certificate.`);
  }

  if (alteredFiles === 0) {
    console.log(`\n🎉 Plugin @orbitox/${pluginName} passed all security integrity checks!\n`);
  } else {
    console.error(`\n❌ Integrity verification failed with ${alteredFiles} issue(s).\n`);
    process.exit(1);
  }
}
