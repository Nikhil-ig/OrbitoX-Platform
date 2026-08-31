import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { CryptoSigner, PackageSignature } from './crypto-signer';

export interface IntegrityCheckResult {
  valid: boolean;
  signerId?: string;
  signedAt?: string;
  errors: string[];
  warnings: string[];
  verifiedFilesCount: number;
}

export class IntegrityVerifier {
  /**
   * Verifies a digital signature against a raw payload or object.
   */
  static verifyPayloadSignature(
    payload: object | string,
    signatureHex: string,
    publicKeyPem: string
  ): boolean {
    try {
      const rawData = typeof payload === 'string' ? payload : JSON.stringify(payload);

      try {
        const verify = crypto.createVerify('SHA256');
        verify.update(rawData);
        verify.end();
        return verify.verify(publicKeyPem, signatureHex, 'hex');
      } catch (err) {
        // Fallback for Ed25519 one-shot verification
        return crypto.verify(
          null,
          Buffer.from(rawData),
          publicKeyPem,
          Buffer.from(signatureHex, 'hex')
        );
      }
    } catch {
      return false;
    }
  }

  /**
   * Performs an exhaustive integrity check on an installed or extracted plugin directory.
   * Compares all files against the cryptographic signature inventory and verifies manifest hash.
   */
  static verifyPackageIntegrity(
    packageDir: string,
    signatureData: PackageSignature,
    publicKeyPem: string
  ): IntegrityCheckResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let verifiedCount = 0;

    // 1. Verify Manifest exists
    const manifestPath = path.join(packageDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      return {
        valid: false,
        errors: ['manifest.json is missing from package directory'],
        warnings,
        verifiedFilesCount: 0,
      };
    }

    // 2. Verify Manifest Hash
    const currentManifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const currentManifestHash = crypto.createHash('sha256').update(currentManifestContent).digest('hex');

    if (currentManifestHash !== signatureData.manifestHash) {
      errors.push('Tamper alert: manifest.json SHA-256 hash does not match signature manifestHash');
    }

    // 3. Verify Signature Authenticity
    const payloadToVerify = {
      signerId: signatureData.signerId,
      manifestHash: signatureData.manifestHash,
      fileTreeHash: crypto.createHash('sha256').update(JSON.stringify(signatureData.files)).digest('hex'),
      signedAt: signatureData.signedAt,
    };

    const isSignatureValid = this.verifyPayloadSignature(
      payloadToVerify,
      signatureData.signature,
      publicKeyPem
    );

    if (!isSignatureValid) {
      errors.push('Tamper alert: Package digital signature failed cryptographic verification');
    }

    // 4. Verify Each Individual File Hash
    for (const expectedFile of signatureData.files) {
      const filePath = path.join(packageDir, expectedFile.path);
      if (!fs.existsSync(filePath)) {
        errors.push(`Missing certified file: ${expectedFile.path}`);
        continue;
      }

      const actualHash = CryptoSigner.calculateFileHash(filePath);
      if (actualHash !== expectedFile.sha256) {
        errors.push(
          `Tamper alert: File ${expectedFile.path} has been altered (expected SHA-256: ${expectedFile.sha256}, got: ${actualHash})`
        );
      } else {
        verifiedCount++;
      }
    }

    return {
      valid: errors.length === 0,
      signerId: signatureData.signerId,
      signedAt: signatureData.signedAt,
      errors,
      warnings,
      verifiedFilesCount: verifiedCount,
    };
  }
}
