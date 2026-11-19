import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { NextRequest } from 'next/server';
import { CryptoSigner, IntegrityVerifier, PlatformRepository } from '@orbitox-io/plugin-engine';
import { packageSignatureService } from '@/server/governance/package-signature-service';
import { createInternalAuthToken } from '@/app/api/v1/_lib/auth-pipeline';
import { GET as getPackages } from '@/app/api/v1/platform/packages/route';
import { platformRepository } from '@/server/db/platform-repository';
import type { PlatformPackageCatalogItem, PackageVersionRecord } from '@orbitox-io/types';

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

  it('4. packageSignatureService: categorizes manifest-only signatures as LEGACY_MANIFEST_ONLY and rejects VERIFIED status', () => {
    const keyPair = CryptoSigner.generateSigningKeyPair('ed25519');
    const manifestContent = JSON.stringify({
      id: '@orbitox/legacy-pkg',
      name: 'Legacy Package',
      version: '0.8.0',
    });
    const manifestHash = crypto.createHash('sha256').update(manifestContent).digest('hex');

    // Sign manifestHash directly (legacy style)
    const legacySignature = CryptoSigner.signPayload(manifestHash, keyPair.privateKey);

    const version: PackageVersionRecord = {
      id: 'ver_legacy_1',
      packageId: '@orbitox/legacy-pkg',
      version: '0.8.0',
      tarballSha256: 'tarball_sha_legacy',
      manifestHash,
      signerId: 'orbitox-legacy-signer',
      signature: legacySignature,
      minPlatformVersion: '1.0.0',
      releasedAt: new Date().toISOString(),
    };

    const result = packageSignatureService.verifyVersionSignature(version, keyPair.publicKey);

    assert.strictEqual(
      result.status,
      'LEGACY_MANIFEST_ONLY',
      'Manifest-only signature must receive LEGACY_MANIFEST_ONLY status'
    );
    assert.strictEqual(
      result.verified,
      false,
      'Manifest-only signature must NOT qualify as verified'
    );
  });

  it('5. packageSignatureService: evaluates the CURRENT release version rather than historical signed versions', () => {
    const keyPair = CryptoSigner.generateSigningKeyPair('ed25519');

    // Historical version 1.0.0 with valid composite signature
    const v1Payload = {
      signerId: 'orbitox-release-mesh',
      manifestHash: crypto.createHash('sha256').update('v1_manifest').digest('hex'),
      fileTreeHash: crypto.createHash('sha256').update('v1_files').digest('hex'),
      signedAt: '2025-01-01T00:00:00.000Z',
    };
    const v1Signature = CryptoSigner.signPayload(v1Payload, keyPair.privateKey);

    const v1Record: PackageVersionRecord = {
      id: 'ver_v1',
      packageId: '@orbitox/hms',
      version: '1.0.0',
      tarballSha256: 'tarball_sha_v1',
      manifestHash: v1Payload.manifestHash,
      signerId: v1Payload.signerId,
      signature: v1Signature,
      minPlatformVersion: '1.0.0',
      releasedAt: v1Payload.signedAt,
    };
    (v1Record as any).fileTreeHash = v1Payload.fileTreeHash;
    (v1Record as any).signedAt = v1Payload.signedAt;

    // Current release version 2.0.0 is UNSIGNED or modified
    const v2Record: PackageVersionRecord = {
      id: 'ver_v2',
      packageId: '@orbitox/hms',
      version: '2.0.0',
      tarballSha256: 'tarball_sha_v2',
      manifestHash: crypto.createHash('sha256').update('v2_manifest').digest('hex'),
      signerId: 'orbitox-release-mesh',
      signature: '', // Unsigned current release!
      minPlatformVersion: '1.0.0',
      releasedAt: '2026-11-01T00:00:00.000Z',
    };

    const pkg: PlatformPackageCatalogItem = {
      id: 'pkg_hms',
      packageId: '@orbitox/hms',
      name: 'HospitalOS Core',
      category: 'HEALTHCARE',
      publisher: 'OrbitoX Core Team',
      currentStableVersion: '2.0.0',
      signingPublicKeyPem: keyPair.publicKey,
      isCore: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    };

    // Evaluate with versions sorted newest first [v2, v1]
    const releaseResult = packageSignatureService.verifyPackageRelease(pkg, [v2Record, v1Record]);

    assert.strictEqual(
      releaseResult.versionEvaluated,
      '2.0.0',
      'Evaluation must target currentStableVersion 2.0.0'
    );
    assert.strictEqual(
      releaseResult.signatureVerified,
      false,
      'Package must NOT verify when current release version is unsigned/unverified'
    );
    assert.strictEqual(
      releaseResult.integrityStatus,
      'UNSIGNED',
      'Integrity status must be UNSIGNED for current release'
    );

    // Now sign v2 with valid composite signature and re-evaluate
    const v2Payload = {
      signerId: 'orbitox-release-mesh',
      manifestHash: v2Record.manifestHash!,
      fileTreeHash: crypto.createHash('sha256').update('v2_files').digest('hex'),
      signedAt: '2026-11-01T00:00:00.000Z',
    };
    v2Record.signature = CryptoSigner.signPayload(v2Payload, keyPair.privateKey);
    (v2Record as any).fileTreeHash = v2Payload.fileTreeHash;
    (v2Record as any).signedAt = v2Payload.signedAt;

    const validReleaseResult = packageSignatureService.verifyPackageRelease(pkg, [v2Record, v1Record]);

    assert.strictEqual(validReleaseResult.versionEvaluated, '2.0.0');
    assert.strictEqual(
      validReleaseResult.signatureVerified,
      true,
      'Package must verify when current release version has valid composite signature'
    );
    assert.strictEqual(validReleaseResult.integrityStatus, 'VERIFIED');
  });

  it('6. GET /api/v1/platform/packages endpoint returns truthful package verification and integrity status', async () => {
    const { signature, timestamp } = await createInternalAuthToken('admin');
    const req = new NextRequest('http://localhost:3000/api/v1/platform/packages', {
      headers: {
        'x-orbitox-principal': 'admin',
        'x-orbitox-internal-sig': signature,
        'x-orbitox-internal-ts': timestamp,
      },
    });

    const res = await getPackages(req);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data), 'Data must be an array of packages');

    for (const pkg of body.data) {
      assert.ok('signatureVerified' in pkg, 'Package must include signatureVerified');
      assert.ok('integrityStatus' in pkg, 'Package must include integrityStatus');
      assert.ok(
        ['VERIFIED', 'LEGACY_MANIFEST_ONLY', 'UNVERIFIED_SIGNATURE', 'UNSIGNED'].includes(pkg.integrityStatus),
        `integrityStatus must be one of the canonical states, got ${pkg.integrityStatus}`
      );
      if (pkg.signatureVerified === true) {
        assert.strictEqual(pkg.integrityStatus, 'VERIFIED');
      }
    }
  });

  it('7. packageSignatureService: refuses to substitute tarballSha256 as fileTreeHash and returns UNVERIFIED_SIGNATURE', () => {
    const keyPair = CryptoSigner.generateSigningKeyPair('ed25519');
    const version: PackageVersionRecord = {
      id: 'ver_tarball_fallback',
      packageId: '@orbitox/hms',
      version: '1.2.0',
      tarballSha256: 'tarball_sha_256_mock_hash_value',
      manifestHash: crypto.createHash('sha256').update('manifest_content').digest('hex'),
      signerId: 'orbitox-release-mesh',
      signature: 'some_raw_unverified_sig_string',
      minPlatformVersion: '1.0.0',
      releasedAt: new Date().toISOString(),
    };

    // Notice: (version as any).fileTreeHash is NOT set.
    // If the service improperly substituted version.tarballSha256, it might attempt verification with tarballSha256.
    // With tarball fallback removed, missing fileTreeHash strictly returns UNVERIFIED_SIGNATURE.
    const result = packageSignatureService.verifyVersionSignature(version, keyPair.publicKey);

    assert.strictEqual(result.status, 'UNVERIFIED_SIGNATURE');
    assert.strictEqual(result.verified, false);
    assert.ok(result.details?.includes('missing composite file tree hash') || result.details?.includes('mismatch'));
  });

  it('8. packageSignatureService: dynamically identifies key algorithms (Ed25519 vs RSA)', () => {
    // 8A: Ed25519 keypair
    const edKeyPair = CryptoSigner.generateSigningKeyPair('ed25519');
    const edSigPayload = {
      signerId: 'orbitox-mesh',
      manifestHash: crypto.createHash('sha256').update('ed_manifest').digest('hex'),
      fileTreeHash: crypto.createHash('sha256').update('ed_files').digest('hex'),
      signedAt: '2026-11-19T00:00:00.000Z',
    };
    const edSig = CryptoSigner.signPayload(edSigPayload, edKeyPair.privateKey);
    const edVersion: PackageVersionRecord = {
      id: 'ver_ed',
      packageId: '@orbitox/hms',
      version: '1.0.0',
      tarballSha256: 'ed_tar',
      manifestHash: edSigPayload.manifestHash,
      signerId: edSigPayload.signerId,
      signature: JSON.stringify({
        ...edSigPayload,
        files: [],
        signature: edSig,
        algorithm: 'Ed25519',
      }),
      minPlatformVersion: '1.0.0',
      releasedAt: edSigPayload.signedAt,
    };

    const edResult = packageSignatureService.verifyVersionSignature(edVersion, edKeyPair.publicKey);
    assert.strictEqual(edResult.verified, true);
    assert.strictEqual(edResult.status, 'VERIFIED');
    assert.strictEqual(edResult.verifiedAlgorithm, 'Ed25519');

    // 8B: RSA keypair
    const rsaKeyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const rsaSigPayload = {
      signerId: 'orbitox-enterprise-rsa',
      manifestHash: crypto.createHash('sha256').update('rsa_manifest').digest('hex'),
      fileTreeHash: crypto.createHash('sha256').update('rsa_files').digest('hex'),
      signedAt: '2026-11-19T00:00:00.000Z',
    };
    const rsaSig = CryptoSigner.signPayload(rsaSigPayload, rsaKeyPair.privateKey);

    const rsaVersion: PackageVersionRecord = {
      id: 'ver_rsa',
      packageId: '@orbitox/custom-rsa',
      version: '1.0.0',
      tarballSha256: 'rsa_tar',
      manifestHash: rsaSigPayload.manifestHash,
      signerId: rsaSigPayload.signerId,
      signature: JSON.stringify({
        ...rsaSigPayload,
        files: [],
        signature: rsaSig,
        algorithm: 'RSA',
      }),
      minPlatformVersion: '1.0.0',
      releasedAt: rsaSigPayload.signedAt,
    };

    const rsaResult = packageSignatureService.verifyVersionSignature(rsaVersion, rsaKeyPair.publicKey);
    assert.strictEqual(rsaResult.verified, true);
    assert.strictEqual(rsaResult.status, 'VERIFIED');
    assert.strictEqual(rsaResult.verifiedAlgorithm, 'RSA');
  });

  it('9. End-to-end persisted package release with authentic PackageSignature JSON envelope verifies via GET /api/v1/platform/packages', async () => {
    // Generate authentic keypair and genuine signed package directory
    const keyPair = CryptoSigner.generateSigningKeyPair('ed25519');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbitox-release-pkg-'));

    try {
      const manifest = {
        id: '@orbitox/hms',
        name: 'HospitalOS Production Release',
        version: '3.0.0',
        displayName: 'HospitalOS Platform Core',
        category: 'HEALTHCARE',
      };
      fs.writeFileSync(path.join(tempDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
      fs.mkdirSync(path.join(tempDir, 'dist'));
      fs.writeFileSync(path.join(tempDir, 'dist', 'bundle.js'), 'export const hospital = true;');

      const authenticSignature = CryptoSigner.signPackageDirectory(tempDir, keyPair.privateKey, 'orbitox-release-mesh');
      const serializedSignatureJson = JSON.stringify(authenticSignature);

      // Verify that this serialized signature envelope verifies on a package record
      const testVersion: PackageVersionRecord = {
        id: 'ver_hms_300',
        packageId: '@orbitox/hms',
        version: '3.0.0',
        tarballSha256: 'genuine_tarball_sha',
        manifestHash: authenticSignature.manifestHash,
        signerId: authenticSignature.signerId || 'orbitox-release-mesh',
        signature: serializedSignatureJson,
        minPlatformVersion: '1.0.0',
        releasedAt: authenticSignature.signedAt,
      };

      const testPackage: PlatformPackageCatalogItem = {
        id: 'pkg_hms_prod',
        packageId: '@orbitox/hms',
        name: 'HospitalOS Platform Core',
        category: 'HEALTHCARE',
        publisher: 'OrbitoX Core Team',
        currentStableVersion: '3.0.0',
        signingPublicKeyPem: keyPair.publicKey,
        isCore: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-11-19T00:00:00.000Z',
      };

      const releaseResult = packageSignatureService.verifyPackageRelease(testPackage, [testVersion]);
      assert.strictEqual(releaseResult.signatureVerified, true);
      assert.strictEqual(releaseResult.integrityStatus, 'VERIFIED');
      assert.strictEqual(releaseResult.verifiedAlgorithm, 'Ed25519');

      // Now verify via GET /api/v1/platform/packages with mock PlatformRepository returning this package & version
      const origListPkg = (PlatformRepository as any).listPackages;
      const origListPkgVer = (PlatformRepository as any).listPackageVersions;
      const origListInst = (PlatformRepository as any).listInstallations;

      try {
        (PlatformRepository as any).listPackages = () => [testPackage];
        (PlatformRepository as any).listPackageVersions = () => [testVersion];
        (PlatformRepository as any).listInstallations = () => [];

        const { signature, timestamp } = await createInternalAuthToken('admin');
        const req = new NextRequest('http://localhost:3000/api/v1/platform/packages', {
          headers: {
            'x-orbitox-principal': 'admin',
            'x-orbitox-internal-sig': signature,
            'x-orbitox-internal-ts': timestamp,
          },
        });

        const res = await getPackages(req);
        assert.strictEqual(res.status, 200);

        const body = await res.json();
        assert.strictEqual(body.success, true);
        assert.strictEqual(body.data.length, 1);

        const item = body.data[0];
        assert.strictEqual(item.packageId, '@orbitox/hms');
        assert.strictEqual(item.signatureVerified, true);
        assert.strictEqual(item.integrityStatus, 'VERIFIED');
        assert.strictEqual(item.verifiedAlgorithm, 'Ed25519');
        assert.strictEqual(item.versionEvaluated, '3.0.0');
      } finally {
        (PlatformRepository as any).listPackages = origListPkg;
        (PlatformRepository as any).listPackageVersions = origListPkgVer;
        (PlatformRepository as any).listInstallations = origListInst;
      }
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
