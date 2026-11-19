import 'server-only';
import crypto from 'node:crypto';
import { IntegrityVerifier } from '@orbitox-io/plugin-engine';
import type { PlatformPackageCatalogItem, PackageVersionRecord } from '@orbitox-io/types';

export type PackageIntegrityStatus =
  | 'VERIFIED'
  | 'LEGACY_MANIFEST_ONLY'
  | 'UNVERIFIED_SIGNATURE'
  | 'UNSIGNED';

export type SignatureAlgorithm = 'Ed25519' | 'RSA' | 'ECDSA' | 'UNKNOWN';

export function detectKeyAlgorithm(publicKeyPem: string | null | undefined): SignatureAlgorithm {
  if (!publicKeyPem) return 'UNKNOWN';
  try {
    const key = crypto.createPublicKey(publicKeyPem);
    if (key.asymmetricKeyType === 'ed25519') return 'Ed25519';
    if (key.asymmetricKeyType === 'rsa') return 'RSA';
    if (key.asymmetricKeyType === 'ec') return 'ECDSA';
    return 'UNKNOWN';
  } catch {
    if (publicKeyPem.includes('ED25519') || publicKeyPem.includes('Ed25519')) return 'Ed25519';
    if (publicKeyPem.includes('RSA')) return 'RSA';
    return 'UNKNOWN';
  }
}

export interface PackageSignatureVerificationResult {
  signatureVerified: boolean;
  integrityStatus: PackageIntegrityStatus;
  hasEd25519Signature: boolean;
  verifiedAlgorithm?: SignatureAlgorithm;
  versionEvaluated?: string;
  details?: string;
}

export class PackageSignatureService {
  /**
   * Evaluates the cryptographic integrity of a package version using its public key.
   * Full composite payload signatures ({ signerId, manifestHash, fileTreeHash, signedAt }) qualify for 'VERIFIED'.
   * Manifest-only signatures are classified as 'LEGACY_MANIFEST_ONLY'.
   * If composite fileTreeHash is missing, never guess or substitute tarballSha256: status remains 'UNVERIFIED_SIGNATURE'.
   */
  verifyVersionSignature(
    version: PackageVersionRecord,
    signingPublicKeyPem: string | null | undefined
  ): { status: PackageIntegrityStatus; verified: boolean; verifiedAlgorithm?: SignatureAlgorithm; details?: string } {
    if (!signingPublicKeyPem || !version.signature) {
      return { status: 'UNSIGNED', verified: false, details: 'Missing public key or signature' };
    }

    const detectedAlgorithm = detectKeyAlgorithm(signingPublicKeyPem);

    try {
      // 1. Try serialized PackageSignature JSON envelope
      if (typeof version.signature === 'string' && version.signature.trim().startsWith('{')) {
        try {
          const sigObj = JSON.parse(version.signature);
          if (sigObj && sigObj.signature) {
            const fileTreeHash =
              sigObj.fileTreeHash ||
              (Array.isArray(sigObj.files)
                ? crypto.createHash('sha256').update(JSON.stringify(sigObj.files)).digest('hex')
                : (version as any).fileTreeHash || '');

            if (fileTreeHash) {
              const payloadToVerify = {
                signerId: sigObj.signerId || version.signerId || 'orbitox-release-mesh',
                manifestHash: sigObj.manifestHash || version.manifestHash,
                fileTreeHash,
                signedAt: sigObj.signedAt || (version as any).signedAt || version.releasedAt,
              };

              const isValid = IntegrityVerifier.verifyPayloadSignature(
                payloadToVerify,
                sigObj.signature,
                signingPublicKeyPem
              );

              if (isValid) {
                return {
                  status: 'VERIFIED',
                  verified: true,
                  verifiedAlgorithm: detectedAlgorithm !== 'UNKNOWN' ? detectedAlgorithm : (sigObj.algorithm || 'Ed25519'),
                };
              }
            }
          }
        } catch {
          // Fall through to standard verification
        }
      }

      // 2. Standard CryptoSigner composite payload verification with explicit fileTreeHash
      // Do NOT fall back to tarballSha256 or derive fileTreeHash from manifestHash
      const explicitFileTreeHash = (version as any).fileTreeHash;

      if (version.manifestHash && explicitFileTreeHash) {
        const payloadToVerify = {
          signerId: version.signerId || 'orbitox-release-mesh',
          manifestHash: version.manifestHash,
          fileTreeHash: explicitFileTreeHash,
          signedAt: (version as any).signedAt || version.releasedAt,
        };

        const isCompositeValid = IntegrityVerifier.verifyPayloadSignature(
          payloadToVerify,
          version.signature,
          signingPublicKeyPem
        );

        if (isCompositeValid) {
          return {
            status: 'VERIFIED',
            verified: true,
            verifiedAlgorithm: detectedAlgorithm,
          };
        }
      }

      // 3. Manifest-only signature check: if manifest-only matches, return LEGACY_MANIFEST_ONLY, NOT VERIFIED
      if (version.manifestHash) {
        const isManifestOnlyValid = IntegrityVerifier.verifyPayloadSignature(
          version.manifestHash,
          version.signature,
          signingPublicKeyPem
        );

        if (isManifestOnlyValid) {
          return {
            status: 'LEGACY_MANIFEST_ONLY',
            verified: false,
            verifiedAlgorithm: detectedAlgorithm,
            details: 'Signature covers manifest only; composite file tree is unverified',
          };
        }
      }

      return {
        status: 'UNVERIFIED_SIGNATURE',
        verified: false,
        details: 'Cryptographic signature mismatch or missing composite file tree hash',
      };
    } catch (err) {
      return {
        status: 'UNVERIFIED_SIGNATURE',
        verified: false,
        details: err instanceof Error ? err.message : 'Signature verification error',
      };
    }
  }

  /**
   * Evaluates the current release version of a package.
   */
  verifyPackageRelease(
    pkg: PlatformPackageCatalogItem,
    versions: PackageVersionRecord[]
  ): PackageSignatureVerificationResult {
    const hasEd25519Signature = Boolean(pkg.signingPublicKeyPem);
    const keyAlgorithm = detectKeyAlgorithm(pkg.signingPublicKeyPem);

    if (!versions || versions.length === 0) {
      return {
        signatureVerified: false,
        integrityStatus: hasEd25519Signature ? 'UNVERIFIED_SIGNATURE' : 'UNSIGNED',
        hasEd25519Signature,
        verifiedAlgorithm: hasEd25519Signature ? keyAlgorithm : undefined,
      };
    }

    // Select the current release version (currentStableVersion, or latest releasedAt)
    const currentVersion =
      (pkg.currentStableVersion
        ? versions.find((v) => v.version === pkg.currentStableVersion || v.id === pkg.currentStableVersion)
        : null) || versions[0]!;

    const result = this.verifyVersionSignature(currentVersion, pkg.signingPublicKeyPem);

    return {
      signatureVerified: result.verified,
      integrityStatus: result.status,
      hasEd25519Signature,
      verifiedAlgorithm: result.verified ? result.verifiedAlgorithm : undefined,
      versionEvaluated: currentVersion.version,
      details: result.details,
    };
  }
}

export const packageSignatureService = new PackageSignatureService();
