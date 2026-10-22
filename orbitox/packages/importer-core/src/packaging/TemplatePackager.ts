import * as crypto from 'crypto';
import { ImportedDesignTokens } from '../types/ImportIR';

export interface KeyPairResult {
  publicKey: string;
  privateKey: string;
}

export interface PackageAssetEntry {
  id: string;
  filename: string;
  mimeType: string;
  sha256: string;
  sizeBytes: number;
  originalUrl?: string;
  licenseAttribution?: string;
}

export interface PackageFontEntry {
  family: string;
  source: 'google' | 'custom' | 'system';
  licenseAttribution?: string;
}

export interface TemplatePackageManifest {
  schemaVersion: '1.0';
  id: string;
  name: string;
  version: string;
  author: {
    name: string;
    email?: string;
    url?: string;
  };
  license: string;
  description: string;
  category: 'wedding' | 'corporate' | 'birthday' | 'gala' | 'general' | 'saas' | 'ecommerce';
  targetPlatform: 'orbitox-celebrations';
  designTokens: ImportedDesignTokens;
  assets: PackageAssetEntry[];
  fonts: PackageFontEntry[];
  sceneCount: number;
  nodeCount: number;
  createdAt: string;
  compatibility?: {
    minEngineVersion?: string;
  };
}

export interface PackageSignature {
  algorithm: 'ed25519' | 'sha256WithRSAEncryption';
  signatureHex: string;
  signedAt: string;
  publicKeyPem: string;
  signerId?: string;
}

export interface SignedTemplateBundle {
  manifest: TemplatePackageManifest;
  scenes: Array<{
    id: string;
    name: string;
    sceneGraph: any;
  }>;
  signature: PackageSignature;
  checksum: string;
}

export interface LicenseAuditResult {
  compliant: boolean;
  detectedLicenses: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'prohibited';
  warnings: string[];
  requiredAttributions: string[];
}

/**
 * P26.11: Professional Template & Marketplace Packager.
 * Cryptographic Ed25519/RSA packaging, digital anti-tamper signing,
 * integrity verification, and license compliance auditing.
 */
export class TemplatePackager {
  // Common safe permissive open-source or commercial licenses
  private static readonly PERMISSIVE_LICENSES = new Set([
    'MIT',
    'Apache-2.0',
    'ISC',
    'BSD-2-Clause',
    'BSD-3-Clause',
    'CC0-1.0',
    'CC-BY-4.0',
    'Commercial',
    'OrbitoX-Marketplace',
    'Custom-Proprietary',
  ]);

  // Copyleft licenses that impose strict downstream source obligations
  private static readonly COPYLEFT_LICENSES = new Set([
    'GPL-2.0',
    'GPL-3.0',
    'AGPL-3.0',
    'LGPL-3.0',
  ]);

  // Trusted Google Fonts / Open Source families
  private static readonly POPULAR_OPEN_FONTS = new Set([
    'Inter',
    'Cinzel',
    'Playfair Display',
    'Outfit',
    'Montserrat',
    'Roboto',
    'Open Sans',
    'Lora',
    'Poppins',
    'Great Vibes',
    'Alex Brush',
    'Cormorant Garamond',
  ]);

  /**
   * Generates an Ed25519 (recommended) or RSA-2048 signing keypair in PEM format.
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
   * Deterministically orders and serializes an object to JSON for canonical hashing.
   */
  static canonicalizeJson(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map((item) => this.canonicalizeJson(item)).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    const parts = keys.map((key) => JSON.stringify(key) + ':' + this.canonicalizeJson(obj[key]));
    return '{' + parts.join(',') + '}';
  }

  /**
   * Computes a canonical SHA-256 checksum of any serializable payload.
   */
  static computePayloadChecksum(payload: any): string {
    const canonical = this.canonicalizeJson(payload);
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Signs a canonical string payload using either Ed25519 or RSA private key.
   */
  static signPayload(canonicalData: string, privateKeyPem: string): { algorithm: 'ed25519' | 'sha256WithRSAEncryption'; signatureHex: string } {
    const isEd25519 = privateKeyPem.includes('ED25519') || privateKeyPem.includes('PRIVATE KEY');
    try {
      if (isEd25519) {
        // Attempt native Ed25519 sign
        try {
          const sig = crypto.sign(null, Buffer.from(canonicalData), privateKeyPem);
          return { algorithm: 'ed25519', signatureHex: sig.toString('hex') };
        } catch {
          // If standard sign fails, fallback to sha256 RSA
          const sign = crypto.createSign('SHA256');
          sign.update(canonicalData);
          sign.end();
          return { algorithm: 'sha256WithRSAEncryption', signatureHex: sign.sign(privateKeyPem, 'hex') };
        }
      } else {
        const sign = crypto.createSign('SHA256');
        sign.update(canonicalData);
        sign.end();
        return { algorithm: 'sha256WithRSAEncryption', signatureHex: sign.sign(privateKeyPem, 'hex') };
      }
    } catch (err: any) {
      throw new Error(`Failed to sign payload: ${err.message}`);
    }
  }

  /**
   * Verifies digital signature over canonical string payload.
   */
  static verifySignature(
    canonicalData: string,
    signatureHex: string,
    publicKeyPem: string,
    algorithm: 'ed25519' | 'sha256WithRSAEncryption'
  ): boolean {
    try {
      if (algorithm === 'ed25519') {
        try {
          return crypto.verify(
            null,
            Buffer.from(canonicalData),
            publicKeyPem,
            Buffer.from(signatureHex, 'hex')
          );
        } catch {
          // Fallback to SHA256 verification
          const verifier = crypto.createVerify('SHA256');
          verifier.update(canonicalData);
          verifier.end();
          return verifier.verify(publicKeyPem, signatureHex, 'hex');
        }
      } else {
        const verifier = crypto.createVerify('SHA256');
        verifier.update(canonicalData);
        verifier.end();
        return verifier.verify(publicKeyPem, signatureHex, 'hex');
      }
    } catch {
      return false;
    }
  }

  /**
   * Packages a template schema and metadata into a cryptographically signed bundle.
   */
  static createPackage(params: {
    manifest: Omit<TemplatePackageManifest, 'schemaVersion' | 'createdAt' | 'sceneCount' | 'nodeCount'>;
    scenes: Array<{ id: string; name: string; sceneGraph: any }>;
    privateKeyPem: string;
    publicKeyPem: string;
    signerId?: string;
  }): SignedTemplateBundle {
    let totalNodes = 0;
    for (const scene of params.scenes) {
      if (scene.sceneGraph?.nodes) {
        totalNodes += Object.keys(scene.sceneGraph.nodes).length;
      }
    }

    const fullManifest: TemplatePackageManifest = {
      ...params.manifest,
      schemaVersion: '1.0',
      sceneCount: params.scenes.length,
      nodeCount: totalNodes,
      createdAt: new Date().toISOString(),
    };

    // Construct unsigned payload
    const unsignedContent = {
      manifest: fullManifest,
      scenes: params.scenes,
    };

    const canonicalData = this.canonicalizeJson(unsignedContent);
    const checksum = crypto.createHash('sha256').update(canonicalData).digest('hex');

    const { algorithm, signatureHex } = this.signPayload(canonicalData, params.privateKeyPem);

    const signature: PackageSignature = {
      algorithm,
      signatureHex,
      signedAt: new Date().toISOString(),
      publicKeyPem: params.publicKeyPem,
      signerId: params.signerId || 'orbitox-marketplace-packager',
    };

    return {
      manifest: fullManifest,
      scenes: params.scenes,
      signature,
      checksum,
    };
  }

  /**
   * Verifies an incoming template bundle against its digital signature and checksum.
   */
  static verifyPackage(
    bundle: SignedTemplateBundle,
    trustedPublicKeyPem?: string
  ): { valid: boolean; reason?: string; manifest?: TemplatePackageManifest } {
    if (!bundle || !bundle.manifest || !bundle.scenes || !bundle.signature) {
      return { valid: false, reason: 'Malformed package structure: missing manifest, scenes, or signature.' };
    }

    // 1. Recompute canonical checksum
    const unsignedContent = {
      manifest: bundle.manifest,
      scenes: bundle.scenes,
    };
    const canonicalData = this.canonicalizeJson(unsignedContent);
    const actualChecksum = crypto.createHash('sha256').update(canonicalData).digest('hex');

    if (actualChecksum !== bundle.checksum) {
      return {
        valid: false,
        reason: `Package checksum mismatch. Expected: ${bundle.checksum}, Actual: ${actualChecksum}. Payload may have been tampered with.`,
      };
    }

    // 2. Verify signature
    const keyToUse = trustedPublicKeyPem || bundle.signature.publicKeyPem;
    if (!keyToUse) {
      return { valid: false, reason: 'No public key available for signature verification.' };
    }

    const isValidSig = this.verifySignature(
      canonicalData,
      bundle.signature.signatureHex,
      keyToUse,
      bundle.signature.algorithm
    );

    if (!isValidSig) {
      return { valid: false, reason: 'Cryptographic signature verification failed. Signature is invalid or key does not match.' };
    }

    return { valid: true, manifest: bundle.manifest };
  }

  /**
   * Scans a template manifest and its scenes for license compliance.
   */
  static scanLicenseCompliance(
    manifest: TemplatePackageManifest,
    scenes?: Array<{ sceneGraph: any }>
  ): LicenseAuditResult {
    const warnings: string[] = [];
    const requiredAttributions: string[] = [];
    const detectedLicenses: string[] = [manifest.license];

    let riskLevel: 'low' | 'medium' | 'high' | 'prohibited' = 'low';

    // 1. Audit Primary Template License
    const primaryLicense = manifest.license.trim();
    if (this.COPYLEFT_LICENSES.has(primaryLicense)) {
      riskLevel = 'prohibited';
      warnings.push(`Primary license "${primaryLicense}" is copyleft and prohibited for commercial distribution without full source disclosure.`);
    } else if (!this.PERMISSIVE_LICENSES.has(primaryLicense)) {
      riskLevel = 'medium';
      warnings.push(`Primary license "${primaryLicense}" is unrecognized or non-standard. Commercial redistribution may be restricted.`);
    }

    // 2. Audit Fonts
    for (const font of manifest.fonts || []) {
      if (font.source === 'google' || this.POPULAR_OPEN_FONTS.has(font.family)) {
        // Safe Google / Open Font
        if (!font.licenseAttribution) {
          requiredAttributions.push(`Font: ${font.family} (OFL / Apache-2.0 via Google Fonts)`);
        }
      } else if (font.source === 'custom') {
        if (!font.licenseAttribution) {
          warnings.push(`Custom font "${font.family}" has no license attribution. Commercial rights must be confirmed.`);
          if (riskLevel !== 'prohibited') riskLevel = 'medium';
        } else {
          detectedLicenses.push(`Font-${font.family}: ${font.licenseAttribution}`);
        }
      }
    }

    // 3. Audit Assets
    for (const asset of manifest.assets || []) {
      if (!asset.sha256) {
        warnings.push(`Asset "${asset.filename}" is missing SHA-256 integrity hash.`);
      }
      if (asset.originalUrl && !asset.licenseAttribution) {
        requiredAttributions.push(`Asset: ${asset.filename} (Source: ${asset.originalUrl})`);
      }
    }

    const compliant = riskLevel !== 'prohibited';

    return {
      compliant,
      detectedLicenses,
      riskLevel,
      warnings,
      requiredAttributions,
    };
  }

  /**
   * Serializes a signed bundle to a formatted JSON string (suitable for `.orbitox-template` files).
   */
  static serializeBundle(bundle: SignedTemplateBundle): string {
    return JSON.stringify(bundle, null, 2);
  }

  /**
   * Parses and validates a raw JSON string into a SignedTemplateBundle.
   */
  static parseBundle(rawJson: string): SignedTemplateBundle {
    const parsed = JSON.parse(rawJson);
    if (!parsed.manifest || !parsed.scenes || !parsed.signature || !parsed.checksum) {
      throw new Error('Invalid bundle: missing required top-level fields (manifest, scenes, signature, checksum).');
    }
    return parsed as SignedTemplateBundle;
  }
}
