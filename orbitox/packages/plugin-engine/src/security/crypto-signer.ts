import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface KeyPairResult {
  publicKey: string;
  privateKey: string;
}

export interface PackageFileHash {
  path: string;
  sha256: string;
  sizeBytes: number;
}

export interface PackageSignature {
  algorithm: 'sha256WithRSAEncryption' | 'ed25519';
  signature: string;
  signedAt: string;
  signerId?: string;
  manifestHash: string;
  files: PackageFileHash[];
}

export class CryptoSigner {
  /**
   * Generates a cryptographic keypair (Ed25519 or RSA-2048) in PEM format.
   */
  static generateSigningKeyPair(type: 'ed25519' | 'rsa' = 'ed25519'): KeyPairResult {
    if (type === 'ed25519') {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      return { publicKey, privateKey };
    } else {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      return { publicKey, privateKey };
    }
  }

  /**
   * Generates a SHA-256 digital signature of any serializable payload string or object.
   */
  static signPayload(payload: object | string, privateKeyPem: string): string {
    const rawData = typeof payload === 'string' ? payload : JSON.stringify(payload);
    
    // Check if key is ed25519 or rsa
    if (privateKeyPem.includes('ED25519') || privateKeyPem.includes('PUBLIC KEY') || privateKeyPem.includes('PRIVATE KEY')) {
      try {
        const sign = crypto.createSign('SHA256');
        sign.update(rawData);
        sign.end();
        return sign.sign(privateKeyPem, 'hex');
      } catch (err: any) {
        // Fallback for Ed25519 one-shot signature
        const sign = crypto.sign(null, Buffer.from(rawData), privateKeyPem);
        return sign.toString('hex');
      }
    }

    const sign = crypto.createSign('SHA256');
    sign.update(rawData);
    sign.end();
    return sign.sign(privateKeyPem, 'hex');
  }

  /**
   * Computes SHA-256 hash of a file on disk.
   */
  static calculateFileHash(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Scans a package/plugin directory, calculates SHA-256 for all distribution files,
   * and cryptographically signs the manifest and file inventory.
   */
  static signPackageDirectory(
    packageDir: string,
    privateKeyPem: string,
    signerId: string = 'orbitox-release-mesh'
  ): PackageSignature {
    const manifestPath = path.join(packageDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Cannot sign package: manifest.json not found in ${packageDir}`);
    }

    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifestHash = crypto.createHash('sha256').update(manifestContent).digest('hex');

    // Collect all distribution files (dist/, package.json, manifest.json)
    const fileHashes: PackageFileHash[] = [];
    const scanDir = (dir: string, baseDir: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(baseDir, fullPath);

        // Skip git, node_modules, signatures, coverage
        if (
          entry.name === 'node_modules' ||
          entry.name === '.git' ||
          entry.name === 'manifest.signature.json' ||
          entry.name === '.turbo'
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          scanDir(fullPath, baseDir);
        } else if (entry.isFile()) {
          const stats = fs.statSync(fullPath);
          fileHashes.push({
            path: relPath,
            sha256: this.calculateFileHash(fullPath),
            sizeBytes: stats.size,
          });
        }
      }
    };

    scanDir(packageDir, packageDir);
    fileHashes.sort((a, b) => a.path.localeCompare(b.path));

    const payloadToSign = {
      signerId,
      manifestHash,
      fileTreeHash: crypto.createHash('sha256').update(JSON.stringify(fileHashes)).digest('hex'),
      signedAt: new Date().toISOString(),
    };

    const signature = this.signPayload(payloadToSign, privateKeyPem);

    return {
      algorithm: 'sha256WithRSAEncryption',
      signature,
      signedAt: payloadToSign.signedAt,
      signerId,
      manifestHash,
      files: fileHashes,
    };
  }
}
