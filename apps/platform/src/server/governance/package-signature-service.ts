import 'server-only';
import crypto from 'node:crypto';
import { IntegrityVerifier } from '@orbitox-io/plugin-engine';
import type { PlatformPackageCatalogItem, PackageVersionRecord } from '@/server/db/platform-repository';

export type PackageIntegrityStatus =
  | 'VERIFIED'
  | 'LEGACY_MANIFEST_ONLY'
  | 'UNVERIFIED_SIGNATURE'
  | 'UNSIGNED';

export interface PackageSignatureVerificationResult {
  signatureVerified: boolean;
  integrityStatus: PackageIntegrityStatus;
  hasEd25519Signature: boolean;
  versionEvaluated?: string;
  details?: string;
}

export class PackageSignatureService {
  /**
   * Evaluates the cryptographic integrity of a package version using its public key.
   * Full composite payload signatures ({ signerId, manifestHash, fileTreeHash, signedAt }) qualify for 'VERIFIED'.
   * Manifest-only signatures are classified as 'LEGACY_MANIFEST_ONLY'.
   */
  verifyVersionSignature(
    version: PackageVersionRecord,
    signingPublicKeyPem: string | null | undefined
  ): { status: PackageIntegrityStatus; verified: boolean; details?: string } {
    if (!signingPublicKeyPem || !version.signature) {
      return { status: 'UNSIGNED', verified: false, details: 'Missing public key or signature' };
    }

    try {
      // 1. Try serialized PackageSignature JSON
      if (typeof version.signature === 'string' && version.signature.trim().startsWith('{')) {
        try {
          const sigObj = JSON.parse(version.signature);
          if (sigObj && sigObj.signature) {
            const fileTreeHash =
              sigObj.fileTreeHash ||
              (Array.isArray(sigObj.files)
                ? crypto.createHash('sha256').update(JSON.stringify(sigObj.files)).digest('hex')
                : (version as any).fileTreeHash || version.tarballSha256 || '');

            const payloadToVerify = {
              signerId: sigObj.signerId || version.signerId || 'orbitox-release-mesh',
              manifestHash: sigObj.manifestHash || version.manifestHash,
              fileTreeHash,
              signedAt: sigObj.signedAt || version.releasedAt,
            };

            const isValid = IntegrityVerifier.verifyPayloadSignature(
              payloadToVerify,
              sigObj.signature,
              signingPublicKeyPem
            );

            if (isValid) {
              return { status: 'VERIFIED', verified: true };
            }
          }
        } catch {
          // Fall through to standard verification
        }
      }

      // 2. Standard CryptoSigner composite payload verification
      const fileTreeHash =
        (version as any).fileTreeHash ||
        version.tarballSha256 ||
        (version.manifestHash
          ? crypto.createHash('sha256').update(version.manifestHash).digest('hex')
          : '');

      if (version.manifestHash && fileTreeHash) {
        const payloadToVerify = {
          signerId: version.signerId || 'orbitox-release-mesh',
          manifestHash: version.manifestHash,
          fileTreeHash,
          signedAt: (version as any).signedAt || version.releasedAt,
        };

        const isCompositeValid = IntegrityVerifier.verifyPayloadSignature(
          payloadToVerify,
          version.signature,
          signingPublicKeyPem
        );

        if (isCompositeValid) {
          return { status: 'VERIFIED', verified: true };
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
            details: 'Signature covers manifest only; composite file tree is unverified',
          };
        }
      }

      return {
        status: 'UNVERIFIED_SIGNATURE',
        verified: false,
        details: 'Cryptographic signature mismatch',
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

    if (!versions || versions.length === 0) {
      return {
        signatureVerified: false,
        integrityStatus: hasEd25519Signature ? 'UNVERIFIED_SIGNATURE' : 'UNSIGNED',
        hasEd25519Signature,
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
      versionEvaluated: currentVersion.version,
      details: result.details,
    };
  }
}

export const packageSignatureService = new PackageSignatureService();
