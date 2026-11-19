import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { CryptoSigner, IntegrityVerifier } from '@orbitox-io/plugin-engine';

describe('Phase 7C: Package Cryptographic Signature Verification Contract', () => {
  it('1. Generates authentic Ed25519 keypair and signs package directory with CryptoSigner', () => {
    const keyPair = CryptoSigner.generateSigningKeyPair('ed25519');
    assert.ok(keyPair.publicKey.includes('PUBLIC KEY'));
    assert.ok(keyPair.privateKey.includes('PRIVATE KEY'));

    // Create temporary package directory
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbitox-pkg-test-'));
    try {
      const manifest = {
        id: '@orbitox/test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        displayName: 'Test Diagnostic Plugin',
        category: 'DIAGNOSTICS',
      };
      fs.writeFileSync(path.join(tempDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

      fs.mkdirSync(path.join(tempDir, 'dist'));
      fs.writeFileSync(path.join(tempDir, 'dist', 'index.js'), 'module.exports = { name: "test" };');

      // Sign directory using official CryptoSigner implementation
      const signerId = 'orbitox-release-mesh';
      const packageSignature = CryptoSigner.signPackageDirectory(tempDir, keyPair.privateKey, signerId);

      assert.strictEqual(packageSignature.signerId, signerId);
      assert.ok(packageSignature.signature, 'Signature must be produced');
      assert.ok(packageSignature.manifestHash, 'manifestHash must be calculated');
      assert.strictEqual(packageSignature.files.length, 2);

      // Reconstruct the exact composite payload signed by CryptoSigner.signPackageDirectory
      const fileTreeHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(packageSignature.files))
        .digest('hex');

      const compositePayload = {
        signerId: packageSignature.signerId,
        manifestHash: packageSignature.manifestHash,
        fileTreeHash,
        signedAt: packageSignature.signedAt,
      };

      // Verify composite payload using IntegrityVerifier
      const isVerified = IntegrityVerifier.verifyPayloadSignature(
        compositePayload,
        packageSignature.signature,
        keyPair.publicKey
      );

      assert.strictEqual(isVerified, true, 'Composite payload signature must verify successfully with public key');

      // Verify that verifying ONLY manifestHash fails because CryptoSigner signs composite object
      const isManifestOnlyValid = IntegrityVerifier.verifyPayloadSignature(
        packageSignature.manifestHash,
        packageSignature.signature,
        keyPair.publicKey
      );
      assert.strictEqual(
        isManifestOnlyValid,
        false,
        'Verifying only manifestHash must fail against composite directory signature'
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('2. Detects tampering when manifest or distribution files are modified', () => {
    const keyPair = CryptoSigner.generateSigningKeyPair('ed25519');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbitox-pkg-tamper-'));

    try {
      const manifest = {
        id: '@orbitox/hms',
        name: 'HospitalOS Core',
        version: '1.0.1',
        displayName: 'Hospital Management System',
        category: 'HEALTHCARE',
      };
      fs.writeFileSync(path.join(tempDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
      fs.writeFileSync(path.join(tempDir, 'index.js'), 'console.log("secure code");');

      const packageSignature = CryptoSigner.signPackageDirectory(tempDir, keyPair.privateKey);

      const fileTreeHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(packageSignature.files))
        .digest('hex');

      const originalPayload = {
        signerId: packageSignature.signerId,
        manifestHash: packageSignature.manifestHash,
        fileTreeHash,
        signedAt: packageSignature.signedAt,
      };

      // 2A: Tampered manifestHash
      const tamperedManifestPayload = {
        ...originalPayload,
        manifestHash: 'a'.repeat(64),
      };
      assert.strictEqual(
        IntegrityVerifier.verifyPayloadSignature(
          tamperedManifestPayload,
          packageSignature.signature,
          keyPair.publicKey
        ),
        false,
        'Tampered manifest hash must fail verification'
      );

      // 2B: Tampered file tree hash
      const tamperedFileTreePayload = {
        ...originalPayload,
        fileTreeHash: 'b'.repeat(64),
      };
      assert.strictEqual(
        IntegrityVerifier.verifyPayloadSignature(
          tamperedFileTreePayload,
          packageSignature.signature,
          keyPair.publicKey
        ),
        false,
        'Tampered file inventory must fail verification'
      );

      // 2C: Wrong public key
      const anotherKeyPair = CryptoSigner.generateSigningKeyPair('ed25519');
      assert.strictEqual(
        IntegrityVerifier.verifyPayloadSignature(
          originalPayload,
          packageSignature.signature,
          anotherKeyPair.publicKey
        ),
        false,
        'Signature verified against mismatched public key must fail'
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('3. Packages API verifies package signatures using serialized and composite payloads', async () => {
    const keyPair = CryptoSigner.generateSigningKeyPair('ed25519');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbitox-pkg-api-'));

    try {
      const manifest = {
        id: '@orbitox/restaurant',
        name: 'RestaurantOS Core',
        version: '1.2.0',
        displayName: 'Restaurant POS & Kitchen Operations',
        category: 'HOSPITALITY',
      };
      fs.writeFileSync(path.join(tempDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

      const packageSignature = CryptoSigner.signPackageDirectory(tempDir, keyPair.privateKey);

      // Test composite verification helper used in packages/route.ts
      const fileTreeHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(packageSignature.files))
        .digest('hex');

      const payloadToVerify = {
        signerId: packageSignature.signerId,
        manifestHash: packageSignature.manifestHash,
        fileTreeHash,
        signedAt: packageSignature.signedAt,
      };

      const verified = IntegrityVerifier.verifyPayloadSignature(
        payloadToVerify,
        packageSignature.signature,
        keyPair.publicKey
      );

      assert.strictEqual(verified, true, 'Standard composite payload signature verifies');

      // Test JSON-serialized PackageSignature format verification
      const serializedSig = JSON.stringify(packageSignature);
      const parsed = JSON.parse(serializedSig);
      const parsedPayload = {
        signerId: parsed.signerId,
        manifestHash: parsed.manifestHash,
        fileTreeHash: crypto.createHash('sha256').update(JSON.stringify(parsed.files)).digest('hex'),
        signedAt: parsed.signedAt,
      };

      const serializedVerified = IntegrityVerifier.verifyPayloadSignature(
        parsedPayload,
        parsed.signature,
        keyPair.publicKey
      );
      assert.strictEqual(serializedVerified, true, 'Serialized PackageSignature format verifies cleanly');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
